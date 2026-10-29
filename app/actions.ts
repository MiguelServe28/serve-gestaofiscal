"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hojeISO } from "@/lib/dates";
import { enviar } from "@/lib/email";
import { CATEGORIAS, type TipoEnvio } from "@/lib/leitura";
import { emailsDe, montarEmail, nomesAnexos } from "@/lib/modelos";
import { getSessao, podeAceder } from "@/lib/sessao";
import { store } from "@/lib/store";
import { supabaseServer, temSupabase } from "@/lib/supabase/server";
import type { Documento } from "@/lib/types";
import { destino } from "@/lib/types";

const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function exigir() {
  const s = await getSessao();
  if (!podeAceder(s, "fiscal")) throw new Error("Sem acesso à Gestão Fiscal.");
  return s;
}

// ---------- Autenticação
export async function entrar(_: unknown, f: FormData): Promise<{ erro: string } | undefined> {
  if (!temSupabase) redirect("/");
  const { error } = await (await supabaseServer()).auth.signInWithPassword({ email: txt(f, "email"), password: txt(f, "password") });
  if (error) return { erro: "Email ou palavra-passe incorretos." };
  redirect("/");
}
export async function sair() {
  if (temSupabase) await (await supabaseServer()).auth.signOut();
  const plataforma = process.env.NEXT_PUBLIC_URL_PLATAFORMA;
  redirect(plataforma ? `${plataforma}/sair` : "/login");
}
export async function alterarMinhaPalavraPasse(_: unknown, f: FormData): Promise<{ erro?: string; ok?: string }> {
  if (!temSupabase) return { erro: "Indisponível em modo demonstração." };
  const nova = txt(f, "password");
  if (nova.length < 10) return { erro: "A palavra-passe tem de ter pelo menos 10 caracteres." };
  if (nova !== txt(f, "confirmar")) return { erro: "As palavras-passe não coincidem." };
  const { error } = await (await supabaseServer()).auth.updateUser({ password: nova });
  return error ? { erro: error.message } : { ok: "Palavra-passe alterada." };
}

// ---------- Envios
export async function criarAvulso(f: FormData) {
  const s = await exigir();
  const titulo = txt(f, "titulo");
  if (!titulo) return;
  const e = await store.criarAvulso(titulo, txt(f, "mensagem"), s.userId);
  redirect(`/envio/${e.id}`);
}
export async function guardarMensagem(f: FormData) {
  await exigir();
  await store.guardarMensagem(txt(f, "id"), txt(f, "titulo"), txt(f, "mensagem"));
  revalidatePath("/", "layout");
}
export async function apagarEnvio(id: string) {
  await exigir();
  await store.apagarEnvio(id);
  redirect("/avulsos");
}

/** Guarda um documento (um ficheiro por pedido, por causa do limite de tamanho dos pedidos). */
export async function carregarDocumento(f: FormData): Promise<Documento> {
  await exigir();
  const ficheiro = f.get("ficheiro");
  if (!(ficheiro instanceof File)) throw new Error("Ficheiro em falta.");
  const envio = await store.getEnvio(txt(f, "envio_id"));
  if (!envio) throw new Error("Envio não encontrado.");
  const categoria = txt(f, "categoria");
  if (!CATEGORIAS[envio.tipo].includes(categoria)) throw new Error("Tipo de documento inválido.");
  const nif = txt(f, "nif");
  if (!/^\d{9}$/.test(nif)) throw new Error("NIF inválido.");
  const valor = txt(f, "valor") ? Number(txt(f, "valor")) : null;
  return store.adicionarDocumento({
    envio_id: envio.id, nif, categoria, nome: ficheiro.name, valor: Number.isFinite(valor) ? valor : null, origem: txt(f, "origem") || "manual",
  }, new Uint8Array(await ficheiro.arrayBuffer()));
}
export async function apagarDocumento(id: string) {
  await exigir();
  await store.apagarDocumento(id);
}
export async function mudarCategoria(id: string, envioId: string, categoria: string) {
  await exigir();
  const l = await store.lerDocumento(id);
  if (!l) return;
  await store.apagarDocumento(id);
  await store.adicionarDocumento({ envio_id: envioId, nif: l.doc.nif, categoria, nome: l.doc.nome, valor: l.doc.valor, origem: "manual" }, l.bytes);
}

export type ResultadoEnvio = { nif: string; ok: boolean; detalhe: string };

/** Envia o email de um cliente (chamado um a um a partir da página, para mostrar o progresso). */
export async function enviarCliente(envioId: string, nif: string): Promise<ResultadoEnvio> {
  const s = await exigir();
  const [envio, clientes, docs, modelos] = await Promise.all([
    store.getEnvio(envioId), store.listClientes(), store.listDocumentos(envioId), store.listModelos(),
  ]);
  const c = clientes.find((x) => x.nif === nif);
  if (!envio || !c) return { nif, ok: false, detalhe: "Cliente ou envio não encontrado." };
  const meus = docs.filter((d) => d.nif === nif);
  const para = emailsDe(destino(c));
  const registar = async (ok: boolean, detalhe: string, assunto: string | null, cc: string[]) => {
    await store.registarEmail({ envio_id: envioId, nif, estado: ok ? "enviado" : "erro", detalhe, para: para.join(", "), cc: cc.join(", "), assunto, enviado_por: s.userId, enviado_por_email: s.email });
    return { nif, ok, detalhe };
  };
  if (!para.length) return registar(false, "Cliente sem email na ficha.", null, []);
  if (!meus.length && envio.tipo !== "avulso") return registar(false, "Sem documentos.", null, []);
  const modelo = modelos.find((m) => m.tipo === envio.tipo);
  if (!modelo) return registar(false, "Modelo de email em falta.", null, []);
  const { assunto, corpo } = montarEmail(modelo, envio, c, meus);
  const cc = emailsDe(c.gestor_email).filter((e) => !para.includes(e));
  try {
    const conta = await store.contaEmail(s.userId);
    if (!conta) return registar(false, "Não tem conta de email configurada (Plataforma SERVE › Utilizadores).", assunto, cc);
    const nomes = nomesAnexos(meus);
    const anexos = [];
    for (let i = 0; i < meus.length; i++) {
      const l = await store.lerDocumento(meus[i].id);
      if (!l) return registar(false, `Não consegui abrir o documento ${meus[i].categoria}.`, assunto, cc);
      anexos.push({ nome: nomes[i], bytes: l.bytes });
    }
    if (temSupabase) await enviar(conta, para, cc, assunto, corpo, anexos);
    if (envio.tipo === "guias") await store.marcarGuiasLaboral(nif, envio.periodo, hojeISO());
    return registar(true, temSupabase ? "Enviado." : "Enviado (demonstração: nada saiu de facto).", assunto, cc);
  } catch (e) {
    return registar(false, (e as Error).message, assunto, cc);
  }
}

export async function terminarEnvio() {
  revalidatePath("/", "layout");
}

/** Email de teste para o próprio, para confirmar a conta de envio. */
export async function emailTeste(): Promise<string> {
  const s = await exigir();
  const conta = await store.contaEmail(s.userId);
  if (!conta) return "Não tem conta de email configurada. Peça à gerência para a configurar na Plataforma SERVE › Utilizadores.";
  try {
    if (temSupabase) await enviar(conta, [conta.email], [], "Teste — Gestão Fiscal SERVE", "Este é um email de teste da Gestão Fiscal. Se o recebeu, a conta está bem configurada.", []);
    return `Email de teste enviado para ${conta.email}.`;
  } catch (e) { return `Falhou: ${(e as Error).message}`; }
}

// ---------- Modelos de email
export async function guardarModelo(f: FormData) {
  await exigir();
  await store.guardarModelo({ tipo: txt(f, "tipo") as TipoEnvio, assunto: txt(f, "assunto"), corpo: String(f.get("corpo") ?? ""), assunto_en: txt(f, "assunto_en"), corpo_en: String(f.get("corpo_en") ?? "") });
  revalidatePath("/modelos");
}
