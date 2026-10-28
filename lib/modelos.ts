import type { Cliente, Documento, Envio, Modelo } from "./types";
import { variaveisPeriodo } from "./periodos";

const eur = (v: number) => `${v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")} €`;

/** Monta o assunto e o corpo do email de um cliente, na língua dele. Variáveis entre chavetas. */
export function montarEmail(m: Modelo, envio: Envio, c: Cliente, docs: Documento[]) {
  const en = c.lingua === "EN";
  const lista = docs.map((d) => `• ${d.categoria === "Outros" || d.categoria === "Documento" ? d.nome.replace(/\.pdf$/i, "") : d.categoria}`).join("\n");
  const comValor = docs.filter((d) => d.valor !== null);
  const valores = comValor.length ? `${en ? "Amounts due" : "Valores"}:\n${comValor.map((d) => `${d.categoria} - ${eur(d.valor!)}`).join("\n")}` : "";
  const vars: Record<string, string> = {
    nome: c.nome, nif: c.nif, email: c.email, titulo: envio.titulo, periodo: envio.titulo, mensagem: envio.mensagem ?? "",
    lista_docs: lista || (en ? "• the attached documents" : "• os documentos em anexo"), lista_valores: valores,
    ...variaveisPeriodo(envio.tipo, envio.periodo, en),
  };
  const aplicar = (t: string) => t.replace(/\{(\w+)\}/g, (x, k) => (k in vars ? vars[k] : x)).replace(/\n{3,}/g, "\n\n").trim();
  return { assunto: aplicar(en ? m.assunto_en : m.assunto), corpo: aplicar(en ? m.corpo_en : m.corpo) };
}

/** Nome do anexo que o cliente vê. */
export function nomesAnexos(docs: Documento[]): string[] {
  const conta = new Map<string, number>();
  return docs.map((d) => {
    const base = d.categoria === "Outros" || d.categoria === "Documento" ? d.nome.replace(/\.pdf$/i, "") : d.categoria;
    const n = (conta.get(base) ?? 0) + 1;
    conta.set(base, n);
    return `${n > 1 ? `${base} ${n}` : base}.pdf`;
  });
}

export const emailsDe = (s: string) => s.split(/[;,\s]+/).map((x) => x.trim()).filter((x) => /.+@.+\..+/.test(x));
