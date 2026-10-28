/** Leitura dos documentos: tipo, NIF e valor, a partir do texto do PDF e do nome do ficheiro. Corre no browser. */

export type TipoEnvio = "guias" | "imi" | "aimi" | "avulso";

export const CATEGORIAS: Record<TipoEnvio, string[]> = {
  guias: ["DMR", "DRI", "Retenções", "DMIS", "IUC", "Outros"],
  imi: ["IMI", "Outros"],
  aimi: ["AIMI", "Outros"],
  avulso: ["Documento"],
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ");

/** Regras pelo conteúdo, da mais específica para a mais geral. */
const PELO_TEXTO: [string, (t: string) => boolean][] = [
  ["AIMI", (t) => t.includes("ADICIONAL AO IMPOSTO MUNICIPAL")],
  ["IMI", (t) => t.includes("IMPOSTO MUNICIPAL SOBRE IMOVEIS")],
  ["DMR", (t) => t.includes("DECLARACAO MENSAL DE REMUNERACOES")],
  ["DRI", (t) => t.includes("DECLARACAO DE REMUNERACOES") && (t.includes("REGIMES CONTRIBUTIVOS") || t.includes("SEGURANCA SOCIAL") || t.includes("MOD.GR"))],
  ["DMIS", (t) => t.includes("IMPOSTO DO SELO")],
  ["IUC", (t) => t.includes("IMPOSTO UNICO DE CIRCULACAO")],
  ["Retenções", (t) => /RETENC(OES|AO) NA FONTE/.test(t)],
];
/** Regras pelo nome do ficheiro (para PDFs digitalizados, sem texto). */
const PELO_NOME: [string, RegExp][] = [
  ["AIMI", /\bAIMI\b/], ["IMI", /\bIMI\b/], ["DMIS", /\bDMIS\b|\bSELO\b/], ["DMR", /\bDMR\b/], ["DRI", /\bDRI\b/],
  ["IUC", /\bIUC\b/], ["Retenções", /\bRET(ENC(OES|AO))?\b/],
];

export function lerNifDoNome(nome: string): string | null {
  return nome.match(/(?<!\d)(\d{9})(?!\d)/)?.[1] ?? null;
}

function numeroPt(s: string): number | null {
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const normLinhas = (s: string) => s.split("\n").map(norm).join("\n");
const DINHEIRO = /(?:€\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})\s*€|€\s*(\d{1,3}(?:\.\d{3})*,\d{2})/g;

/** Valor a pagar. Primeiro pelos rótulos (importância/total a pagar, total de contribuições da DRI);
 *  se não der, o montante em euros que mais se repete no documento. */
export function lerValor(texto: string): number | null {
  const t = normLinhas(texto);
  const padroes = [
    /TOTAL DE REMUNERACOES\/CONTRIBUICOES[^0-9]{0,40}[\d.]+,\d{2}[^0-9]{0,10}([\d.]+,\d{2})/,
    /(?:IMPORTANCIA|TOTAL|VALOR|MONTANTE) A PAGAR[^\n0-9]{0,20}([\d.]+,\d{2})/,
    /(?:IMPORTANCIA|TOTAL|VALOR|MONTANTE) A PAGAR[^\n]*\n[^\n0-9]{0,30}([\d.]+,\d{2})/,
    /TOTAL DE CONTRIBUICOES[^\n0-9]{0,20}([\d.]+,\d{2})/,
  ];
  for (const p of padroes) {
    const m = t.match(p);
    if (m) { const v = numeroPt(m[1]); if (v !== null) return v; }
  }
  const conta = new Map<string, number>();
  for (const m of t.matchAll(DINHEIRO)) { const v = m[1] ?? m[2]; conta.set(v, (conta.get(v) ?? 0) + 1); }
  const melhor = [...conta.entries()].sort((a, b) => b[1] - a[1] || (numeroPt(b[0]) ?? 0) - (numeroPt(a[0]) ?? 0))[0];
  return melhor ? numeroPt(melhor[0]) : null;
}

export type Leitura = { nif: string | null; nifTexto: string | null; categoria: string | null; origem: "texto" | "nome" | null; valor: number | null; temTexto: boolean };

/** Analisa um documento. `nifsConhecidos` serve para encontrar o NIF dentro do texto quando o nome não o tem. */
export function analisar(nomeFicheiro: string, texto: string, tipo: TipoEnvio, nifsConhecidos: Set<string>): Leitura {
  const t = norm(texto);
  const temTexto = t.replace(/[^A-Z0-9]/g, "").length > 30;
  const permitidas = new Set(CATEGORIAS[tipo]);
  let categoria: string | null = null;
  let origem: Leitura["origem"] = null;
  if (temTexto) for (const [c, f] of PELO_TEXTO) if (permitidas.has(c) && f(t)) { categoria = c; origem = "texto"; break; }
  if (!categoria) {
    const n = norm(nomeFicheiro.replace(/[_\-.]+/g, " "));
    for (const [c, r] of PELO_NOME) if (permitidas.has(c) && r.test(n)) { categoria = c; origem = "nome"; break; }
  }
  if (!categoria && tipo === "avulso") { categoria = "Documento"; origem = "nome"; }
  const nifsTexto = [...t.matchAll(/(?<!\d)(\d{9})(?!\d)/g)].map((m) => m[1]);
  const nifTexto = nifsTexto.find((n) => nifsConhecidos.has(n)) ?? null;
  const nif = lerNifDoNome(nomeFicheiro) ?? nifTexto;
  return { nif, nifTexto, categoria, origem, valor: temTexto ? lerValor(texto) : null, temTexto };
}
