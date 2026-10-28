import "server-only";
import { desencriptar } from "../cripto";
import { supabaseAdmin } from "../supabase/admin";
import { supabaseServer } from "../supabase/server";
import type { Cliente, Documento, EmailLog, Envio, LogAntigo, Modelo } from "../types";
import type { Store } from "./types";

const BUCKET = "guias";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rows<T>(res: { data: any; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T[];
}
function ok(res: { error: { message: string } | null }) { if (res.error) throw new Error(res.error.message); }
async function todas<T>(q: (a: number, b: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const out: T[] = [];
  for (let a = 0; ; a += 1000) { const p = rows<T>(await q(a, a + 999)); out.push(...p); if (p.length < 1000) break; }
  return out;
}
const hash = async (b: Uint8Array) => (await import("node:crypto")).createHash("sha256").update(b).digest("hex").slice(0, 16);

export const supabaseStore: Store = {
  async listClientes() {
    const sb = await supabaseServer();
    const r = await todas<Cliente>((a, b) => sb.from("clientes").select("nif,nome,email,lingua,gestor_nome,gestor_email").order("nome").range(a, b));
    return r.map((c) => ({ ...c, email: c.email ?? "", lingua: c.lingua === "EN" ? "EN" : "PT", gestor_nome: c.gestor_nome ?? "", gestor_email: c.gestor_email ?? "" }));
  },
  async esperadosGuias() {
    const sb = await supabaseServer();
    const r = rows<{ nif: string; trabalhadores: number; ativo: boolean }>(await sb.from("laboral_clientes").select("nif,trabalhadores,ativo").range(0, 9999));
    return new Set(r.filter((x) => x.ativo && x.trabalhadores > 0).map((x) => x.nif));
  },

  async listEnvios() {
    const sb = await supabaseServer();
    return rows<Envio>(await sb.from("gf_envios").select("id,tipo,periodo,titulo,mensagem,criado_em").order("criado_em", { ascending: false }).limit(200));
  },
  async getEnvio(id) {
    const sb = await supabaseServer();
    const { data } = await sb.from("gf_envios").select("id,tipo,periodo,titulo,mensagem,criado_em").eq("id", id).maybeSingle();
    return (data as Envio) ?? null;
  },
  async obterOuCriarEnvio(tipo, periodo, titulo, por) {
    const sb = await supabaseServer();
    const { data } = await sb.from("gf_envios").select("id,tipo,periodo,titulo,mensagem,criado_em").eq("tipo", tipo).eq("periodo", periodo).maybeSingle();
    if (data) return data as Envio;
    const ins = await sb.from("gf_envios").insert({ tipo, periodo, titulo, criado_por: por }).select("id,tipo,periodo,titulo,mensagem,criado_em").single();
    if (ins.error) {
      const again = await sb.from("gf_envios").select("id,tipo,periodo,titulo,mensagem,criado_em").eq("tipo", tipo).eq("periodo", periodo).single();
      if (again.error) throw new Error(ins.error.message);
      return again.data as Envio;
    }
    return ins.data as Envio;
  },
  async criarAvulso(titulo, mensagem, por) {
    const sb = await supabaseServer();
    const ins = await sb.from("gf_envios").insert({ tipo: "avulso", periodo: new Date().toISOString().slice(0, 10), titulo, mensagem, criado_por: por }).select("id,tipo,periodo,titulo,mensagem,criado_em").single();
    if (ins.error) throw new Error(ins.error.message);
    return ins.data as Envio;
  },
  async guardarMensagem(id, titulo, mensagem) {
    const sb = await supabaseServer();
    ok(await sb.from("gf_envios").update({ titulo, mensagem }).eq("id", id));
  },
  async apagarEnvio(id) {
    const sb = await supabaseServer();
    const docs = rows<{ caminho: string }>(await sb.from("gf_documentos").select("caminho").eq("envio_id", id));
    if (docs.length) await sb.storage.from(BUCKET).remove(docs.map((d) => d.caminho));
    ok(await sb.from("gf_envios").delete().eq("id", id));
  },

  async listDocumentos(envioId) {
    const sb = await supabaseServer();
    return rows<Documento>(await sb.from("gf_documentos").select("*").eq("envio_id", envioId).order("criado_em")).map((d) => ({ ...d, valor: d.valor === null ? null : Number(d.valor) }));
  },
  async adicionarDocumento(d, bytes) {
    const sb = await supabaseServer();
    const caminho = `gf/${d.envio_id}/${d.nif}/${await hash(bytes)}.pdf`;
    // O mesmo ficheiro carregado duas vezes não se duplica
    const { data: existe } = await sb.from("gf_documentos").select("*").eq("caminho", caminho).maybeSingle();
    if (existe) {
      ok(await sb.from("gf_documentos").update({ categoria: d.categoria, valor: d.valor, origem: d.origem }).eq("id", existe.id));
      return { ...(existe as Documento), categoria: d.categoria, valor: d.valor };
    }
    const up = await sb.storage.from(BUCKET).upload(caminho, bytes, { contentType: "application/pdf", upsert: true });
    if (up.error) throw new Error(up.error.message);
    const ins = await sb.from("gf_documentos").insert({ ...d, caminho }).select("*").single();
    if (ins.error) throw new Error(ins.error.message);
    return ins.data as Documento;
  },
  async apagarDocumento(id) {
    const sb = await supabaseServer();
    const { data } = await sb.from("gf_documentos").select("caminho").eq("id", id).maybeSingle();
    if (data?.caminho) await sb.storage.from(BUCKET).remove([data.caminho]);
    ok(await sb.from("gf_documentos").delete().eq("id", id));
  },
  async lerDocumento(id) {
    const sb = await supabaseServer();
    const { data } = await sb.from("gf_documentos").select("*").eq("id", id).maybeSingle();
    if (!data) return null;
    const dl = await sb.storage.from(BUCKET).download((data as Documento).caminho);
    if (dl.error || !dl.data) return null;
    return { doc: data as Documento, bytes: new Uint8Array(await dl.data.arrayBuffer()) };
  },

  async listEmails(envioId) {
    const sb = await supabaseServer();
    let q = sb.from("gf_emails").select("id,envio_id,nif,estado,detalhe,para,cc,assunto,enviado_por_email,enviado_em").order("enviado_em", { ascending: false }).limit(2000);
    if (envioId) q = q.eq("envio_id", envioId);
    return rows<EmailLog>(await q);
  },
  async registarEmail(e) {
    const sb = await supabaseServer();
    ok(await sb.from("gf_emails").insert(e));
  },
  async logAntigo() {
    const sb = await supabaseServer();
    return rows<LogAntigo>(await sb.from("log_envios").select("data,nif,nome,estado,modulo,enviado_por").order("id", { ascending: false }).limit(1000));
  },

  async listModelos() {
    const sb = await supabaseServer();
    return rows<Modelo>(await sb.from("gf_modelos").select("tipo,assunto,corpo,assunto_en,corpo_en"));
  },
  async guardarModelo(m) {
    const sb = await supabaseServer();
    ok(await sb.from("gf_modelos").upsert({ ...m, atualizado_em: new Date().toISOString() }));
  },

  async contaEmail(userId) {
    if (!userId) return null;
    const adm = supabaseAdmin();
    if (!adm) throw new Error("Falta a chave de serviço (SUPABASE_SERVICE_ROLE_KEY) no projeto Vercel da Gestão Fiscal.");
    const { data } = await adm.from("contas_email").select("email,host,porta,tls,utilizador,password_enc,assinatura").eq("user_id", userId).maybeSingle();
    if (!data) return null;
    return { email: data.email, host: data.host, porta: data.porta, tls: data.tls, utilizador: data.utilizador, password: desencriptar(data.password_enc), assinatura: data.assinatura };
  },
  async marcarGuiasLaboral(nif, mes, dia) {
    const sb = await supabaseServer();
    const { data: lab } = await sb.from("laboral_clientes").select("ativo,trabalhadores").eq("nif", nif).maybeSingle();
    if (!lab?.ativo || !lab.trabalhadores) return;
    const { data } = await sb.from("laboral_controlos").select("passos").eq("nif", nif).eq("mes", mes).maybeSingle();
    const passos = { ...((data?.passos as Record<string, unknown>) ?? {}), guias: { feito: true, data: dia } };
    ok(await sb.from("laboral_controlos").upsert({ nif, mes, passos, atualizado_em: new Date().toISOString() }, { onConflict: "nif,mes" }));
  },
};
