"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Eye, FileUp, Loader2, Send, Trash2, X } from "lucide-react";
import { apagarDocumento, carregarDocumento, enviarCliente, terminarEnvio } from "@/app/actions";
import SearchSelect from "@/components/SearchSelect";
import { analisar, CATEGORIAS } from "@/lib/leitura";
import { lerTextoPdf } from "@/lib/ler-pdf";
import { emailsDe, montarEmail, nomesAnexos } from "@/lib/modelos";
import type { Cliente, Documento, EmailLog, Envio, Modelo } from "@/lib/types";

type Pendente = { chave: string; ficheiro: File; nif: string; categoria: string; valor: number | null; aviso: string };
type Estado = { ok: boolean; detalhe: string; quando: string; por: string | null };

const eur = (v: number) => `${v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")} €`;
const quando = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)} ${iso.slice(11, 16)}`;

export default function EnvioPainel({ envio, clientes, documentos, emails, esperados, modelo }: {
  envio: Envio; clientes: Cliente[]; documentos: Documento[]; emails: EmailLog[]; esperados: string[]; modelo: Modelo | null;
}) {
  const router = useRouter();
  const [docs, setDocs] = useState(documentos);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [lendo, setLendo] = useState<{ feitos: number; total: number } | null>(null);
  const [extra, setExtra] = useState<string[]>([]); // avulsos: clientes sem documentos a incluir
  const [estados, setEstados] = useState<Record<string, Estado>>(() => {
    const m: Record<string, Estado> = {};
    for (const e of [...emails].reverse()) m[e.nif] = { ok: e.estado === "enviado", detalhe: e.detalhe ?? "", quando: e.enviado_em, por: e.enviado_por_email };
    return m;
  });
  const [sel, setSel] = useState<string[] | null>(null);
  const [envio_, setEnvioEstado] = useState<{ feitos: number; total: number } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [arrastar, setArrastar] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const porNif = useMemo(() => new Map(clientes.map((c) => [c.nif, c])), [clientes]);
  const nifs = useMemo(() => new Set(clientes.map((c) => c.nif)), [clientes]);
  const categorias = CATEGORIAS[envio.tipo];

  // Linhas: quem tem documentos, quem já recebeu email, os esperados (guias) e os acrescentados à mão (avulsos)
  const linhas = useMemo(() => {
    const set = new Set<string>([...docs.map((d) => d.nif), ...Object.keys(estados), ...esperados, ...extra]);
    return [...set].filter((n) => porNif.has(n)).map((nif) => {
      const c = porNif.get(nif)!;
      const meus = docs.filter((d) => d.nif === nif);
      const est = estados[nif];
      const semEmail = !emailsDe(c.email).length;
      const falta = envio.tipo === "guias" && esperados.includes(nif) && !meus.some((d) => d.categoria === "DMR" || d.categoria === "DRI");
      const pronto = !semEmail && (meus.length > 0 || envio.tipo === "avulso") && !est?.ok;
      return { c, meus, est, semEmail, falta, pronto };
    }).sort((a, b) => Number(b.pronto) - Number(a.pronto) || a.c.nome.localeCompare(b.c.nome, "pt"));
  }, [docs, estados, esperados, extra, porNif, envio.tipo]);

  const prontos = linhas.filter((l) => l.pronto).map((l) => l.c.nif);
  const selecionados = sel ?? prontos;

  async function guardar(f: File, nif: string, categoria: string, valor: number | null, origem: string) {
    const fd = new FormData();
    fd.set("ficheiro", f); fd.set("envio_id", envio.id); fd.set("nif", nif); fd.set("categoria", categoria);
    fd.set("origem", origem); if (valor !== null) fd.set("valor", String(valor));
    const d = await carregarDocumento(fd);
    setDocs((x) => [...x.filter((y) => y.id !== d.id), d]);
  }

  async function receber(lista: FileList | File[]) {
    const fs = [...lista].filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!fs.length) return;
    setErro(null);
    setLendo({ feitos: 0, total: fs.length });
    const novos: Pendente[] = [];
    for (let i = 0; i < fs.length; i++) {
      const f = fs[i];
      try {
        const texto = await lerTextoPdf(f);
        const l = analisar(f.name, texto, envio.tipo, nifs);
        const conhecido = l.nif && nifs.has(l.nif);
        const aviso = !l.nif ? "Sem NIF no nome nem no documento" : !conhecido ? `NIF ${l.nif} não está na base de clientes`
          : l.nifTexto && l.nifTexto !== l.nif ? `O NIF do nome (${l.nif}) não é o do documento (${l.nifTexto})` : !l.categoria ? "Não reconheci o tipo de documento" : "";
        if (conhecido && l.categoria && !aviso) await guardar(f, l.nif!, l.categoria, l.valor, l.origem ?? "texto");
        else novos.push({ chave: `${f.name}-${f.size}-${i}`, ficheiro: f, nif: conhecido ? l.nif! : "", categoria: l.categoria ?? "", valor: l.valor, aviso });
      } catch (e) {
        novos.push({ chave: `${f.name}-${i}`, ficheiro: f, nif: "", categoria: "", valor: null, aviso: (e as Error).message });
      }
      setLendo({ feitos: i + 1, total: fs.length });
    }
    setPendentes((p) => [...p, ...novos]);
    setLendo(null);
    setSel(null);
  }

  async function enviarTodos() {
    const lista = selecionados.filter((n) => linhas.find((l) => l.c.nif === n));
    if (!lista.length) return;
    if (!window.confirm(`Enviar ${lista.length} email(s)?`)) return;
    setEnvioEstado({ feitos: 0, total: lista.length });
    for (let i = 0; i < lista.length; i++) {
      const r = await enviarCliente(envio.id, lista[i]).catch((e) => ({ nif: lista[i], ok: false, detalhe: (e as Error).message }));
      setEstados((s) => ({ ...s, [r.nif]: { ok: r.ok, detalhe: r.detalhe, quando: new Date().toISOString(), por: null } }));
      setEnvioEstado({ feitos: i + 1, total: lista.length });
    }
    setEnvioEstado(null);
    setSel(null);
    await terminarEnvio();
    router.refresh();
  }

  const enviados = linhas.filter((l) => l.est?.ok).length;
  const comErro = linhas.filter((l) => l.est && !l.est.ok).length;
  const prev = preview ? linhas.find((l) => l.c.nif === preview) : null;
  const prevEmail = prev && modelo ? montarEmail(modelo, envio, prev.c, prev.meus) : null;

  return (
    <div>
      {/* Zona para largar os PDFs */}
      {envio.tipo !== "avulso" || true ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setArrastar(true); }} onDragLeave={() => setArrastar(false)}
          onDrop={(e) => { e.preventDefault(); setArrastar(false); receber(e.dataTransfer.files); }}
          onClick={() => input.current?.click()}
          className={`mb-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${arrastar ? "border-laranja bg-laranja-suave" : "border-filete bg-white hover:border-laranja/60"}`}>
          <input ref={input} type="file" accept="application/pdf" multiple className="hidden" onChange={(e) => { if (e.target.files) receber(e.target.files); e.target.value = ""; }} />
          {lendo ? (
            <p className="flex items-center gap-2 text-sm text-tinta"><Loader2 size={18} className="animate-spin text-laranja" />A ler e a guardar {lendo.feitos}/{lendo.total}…</p>
          ) : (
            <>
              <FileUp size={26} className="mb-2 text-laranja" />
              <p className="text-sm font-medium text-tinta">Largue aqui todos os PDFs de uma vez (ou clique para escolher)</p>
              <p className="mt-1 text-xs text-cinza">{envio.tipo === "guias" ? "DMR, DRI, retenções, DMIS, IUC… misturados. O cliente vem do NIF no nome do ficheiro e o tipo e o valor do próprio documento." : "O cliente vem do NIF no nome do ficheiro (ou do documento)."}</p>
            </>
          )}
        </div>
      ) : null}
      {erro && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{erro}</p>}

      {/* Ficheiros por identificar */}
      {pendentes.length > 0 && (
        <section className="card mb-6 border-amber-200 p-5">
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold"><AlertTriangle size={17} className="text-amber-600" />Por identificar ({pendentes.length})</h2>
          <p className="mb-3 text-xs text-cinza">Escolha o cliente e o tipo de documento. O ficheiro já está lido: não precisa de o carregar outra vez.</p>
          <div className="space-y-2">
            {pendentes.map((p) => (
              <div key={p.chave} className="grid items-center gap-2 rounded-lg border border-filete p-2 md:grid-cols-[1.4fr_1.6fr_150px_110px_auto]">
                <div className="min-w-0"><p className="truncate text-sm text-tinta" title={p.ficheiro.name}>{p.ficheiro.name}</p>{p.aviso && <p className="text-xs text-amber-700">{p.aviso}</p>}</div>
                <SearchSelect name={`cli-${p.chave}`} defaultValue={p.nif} placeholder="Cliente" opcoes={clientes.map((c) => ({ value: c.nif, label: c.nome, sub: c.nif }))}
                  onChange={(v) => setPendentes((x) => x.map((y) => (y.chave === p.chave ? { ...y, nif: v } : y)))} />
                <select value={p.categoria} onChange={(e) => setPendentes((x) => x.map((y) => (y.chave === p.chave ? { ...y, categoria: e.target.value } : y)))} className="input">
                  <option value="">Tipo…</option>{categorias.map((c) => <option key={c}>{c}</option>)}
                </select>
                <input inputMode="decimal" placeholder="Valor €" defaultValue={p.valor === null ? "" : String(p.valor).replace(".", ",")} className="input"
                  onChange={(e) => { const v = Number(e.target.value.replace(/\./g, "").replace(",", ".")); setPendentes((x) => x.map((y) => (y.chave === p.chave ? { ...y, valor: e.target.value && Number.isFinite(v) ? v : null } : y))); }} />
                <div className="flex gap-1">
                  <button className="btn-primary py-1.5" disabled={!p.nif || !p.categoria}
                    onClick={async () => { try { await guardar(p.ficheiro, p.nif, p.categoria, p.valor, "manual"); setPendentes((x) => x.filter((y) => y.chave !== p.chave)); } catch (e) { setErro((e as Error).message); } }}>Guardar</button>
                  <button title="Descartar" className="rounded p-2 text-cinza hover:text-rose-600" onClick={() => setPendentes((x) => x.filter((y) => y.chave !== p.chave))}><X size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Barra de envio */}
      <div className="sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-filete bg-white p-3 shadow-card">
        <span className="text-sm text-tinta"><strong>{linhas.length}</strong> clientes · <span className="text-emerald-700">{enviados} enviados</span>{comErro ? <> · <span className="text-rose-700">{comErro} com erro</span></> : null} · {prontos.length} prontos</span>
        <button className="btn-ghost py-1.5 text-xs" onClick={() => setSel(prontos)}>Selecionar prontos</button>
        <button className="btn-ghost py-1.5 text-xs" onClick={() => setSel([])}>Limpar</button>
        {envio.tipo === "avulso" && (
          <div className="w-72"><SearchSelect name="add" placeholder="Acrescentar cliente sem documento" opcoes={clientes.filter((c) => !linhas.some((l) => l.c.nif === c.nif)).map((c) => ({ value: c.nif, label: c.nome, sub: c.nif }))} onChange={(v) => v && setExtra((x) => [...x, v])} /></div>
        )}
        <button className="btn-primary ml-auto" disabled={!selecionados.length || !!envio_} onClick={enviarTodos}>
          {envio_ ? <><Loader2 size={15} className="animate-spin" />A enviar {envio_.feitos}/{envio_.total}</> : <><Send size={15} />Enviar ({selecionados.length})</>}
        </button>
      </div>
      {envio_ && <div className="mb-3 h-2 overflow-hidden rounded-full bg-banda"><div className="h-full bg-laranja transition-all" style={{ width: `${(envio_.feitos / envio_.total) * 100}%` }} /></div>}

      {linhas.length ? (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-filete bg-banda/60">
              <tr><th className="th w-8" /><th className="th">Cliente</th><th className="th">Documentos</th><th className="th text-right">Total</th><th className="th">Estado</th><th className="th" /></tr>
            </thead>
            <tbody>
              {linhas.map(({ c, meus, est, semEmail, falta, pronto }) => {
                const total = meus.reduce((s, d) => s + (d.valor ?? 0), 0);
                return (
                  <tr key={c.nif} className={`border-b border-filete/70 align-top hover:bg-fundo ${est?.ok ? "bg-emerald-50/40" : ""}`}>
                    <td className="td"><input type="checkbox" className="accent-laranja" checked={selecionados.includes(c.nif)} disabled={semEmail}
                      onChange={() => setSel(selecionados.includes(c.nif) ? selecionados.filter((n) => n !== c.nif) : [...selecionados, c.nif])} /></td>
                    <td className="td">
                      <p className="font-medium text-tinta">{c.nome}</p>
                      <p className="text-xs text-cinza">{c.nif} · {semEmail ? <span className="text-rose-600">sem email na ficha</span> : c.email}{c.lingua === "EN" ? " · EN" : ""}</p>
                    </td>
                    <td className="td">
                      <div className="flex flex-wrap gap-1">
                        {meus.map((d) => (
                          <span key={d.id} className="group inline-flex items-center gap-1 rounded-md border border-filete bg-white px-2 py-0.5 text-xs">
                            <a href={`/api/doc/${d.id}`} target="_blank" rel="noreferrer" className="font-medium text-tinta hover:text-laranja" title={`${d.nome}${d.origem === "nome" ? " · tipo pelo nome do ficheiro" : ""}`}>{d.categoria === "Outros" || d.categoria === "Documento" ? d.nome.replace(/\.pdf$/i, "") : d.categoria}</a>
                            {d.valor !== null && <span className="text-cinza">{eur(d.valor)}</span>}
                            {!est?.ok && <button title="Retirar" className="text-cinza/60 hover:text-rose-600" onClick={async () => { await apagarDocumento(d.id); setDocs((x) => x.filter((y) => y.id !== d.id)); }}><Trash2 size={12} /></button>}
                          </span>
                        ))}
                        {!meus.length && <span className="text-xs text-cinza">—</span>}
                      </div>
                    </td>
                    <td className="td whitespace-nowrap text-right text-sm tabular-nums">{total ? eur(total) : ""}</td>
                    <td className="td text-xs">
                      {est?.ok ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700"><CheckCircle2 size={12} />Enviado {quando(est.quando)}</span>
                        : est && !est.ok ? <span className="rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-700" title={est.detalhe}>Erro: {est.detalhe.slice(0, 60)}</span>
                        : semEmail ? <span className="rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-700">Sem email</span>
                        : falta ? <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">Falta DMR/DRI</span>
                        : pronto ? <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">Pronto</span>
                        : <span className="text-cinza">—</span>}
                      {est?.ok && <button className="ml-2 text-cinza underline hover:text-tinta" onClick={() => setSel([...(sel ?? []), c.nif])}>reenviar</button>}
                    </td>
                    <td className="td"><button title="Ver o email" className="rounded p-1 text-cinza hover:text-laranja" onClick={() => setPreview(c.nif)}><Eye size={16} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <div className="rounded-xl border border-dashed border-filete bg-white/60 px-6 py-10 text-center text-sm text-cinza">Ainda não há documentos. Largue os PDFs acima.</div>}

      {/* Pré-visualização */}
      {prev && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={() => setPreview(null)}>
          <div className="card max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-4">
              <div><p className="text-xs text-cinza">Para: {emailsDe(prev.c.email).join(", ") || "—"}{prev.c.gestor_email ? ` · CC: ${prev.c.gestor_email}` : ""}</p>
                <h3 className="mt-1 text-base font-semibold text-tinta">{prevEmail?.assunto ?? "Sem modelo de email"}</h3></div>
              <button onClick={() => setPreview(null)} className="text-cinza hover:text-tinta"><X size={18} /></button>
            </div>
            <pre className="whitespace-pre-wrap rounded-lg bg-fundo p-4 font-sans text-sm text-corpo">{prevEmail?.corpo}</pre>
            <p className="mt-3 text-xs text-cinza">Anexos: {nomesAnexos(prev.meus).join(", ") || "nenhum"}. A assinatura da conta de envio é acrescentada no fim.</p>
          </div>
        </div>
      )}
    </div>
  );
}
