import type { Cliente, Documento, EmailLog, Envio, Modelo } from "../types";
import type { Store } from "./types";

// Modo demonstração: tudo em memória e os emails não são enviados de verdade.
type Db = { clientes: Cliente[]; envios: Envio[]; docs: (Documento & { bytes: Uint8Array })[]; emails: EmailLog[]; modelos: Modelo[] };
const uid = () => crypto.randomUUID();

export const MODELOS_PADRAO: Modelo[] = [
  { tipo: "guias", assunto: "Guias Impostos — {mes_nome} — {nome}", corpo: "Caro (a) {nome},\n\nJunto enviamos as guias de pagamento referentes a {mes_nome}:\n\n{lista_docs}\n\n{lista_valores}\n\nO(s) pagamento(s) deverá ser efetuado até {data_limite}.\n\nFicamos ao dispor para qualquer esclarecimento.\n\nCom os melhores cumprimentos,",
    assunto_en: "Tax Documents — {mes_nome} — {nome}", corpo_en: "Dear {nome},\n\nPlease find attached the payment documentation for {mes_nome}:\n\n{lista_docs}\n\n{lista_valores}\n\nPayments should be made by {data_limite}.\n\nWe remain at your disposal for any clarification.\n\nBest regards," },
  { tipo: "imi", assunto: "IMI {ano} — {prestacao} — {nome}", corpo: "Exmo(a). Sr(a).,\n\nJunto enviamos a documentação do IMI de {ano} ({prestacao}).\n\n{lista_valores}\n\nO pagamento deverá ser efetuado até {data_limite}.\n\nCom os melhores cumprimentos,",
    assunto_en: "Council Tax (IMI) {ano} — {prestacao} — {nome}", corpo_en: "Dear {nome},\n\nPlease find attached the Municipal Property Tax (IMI) documentation for {ano} ({prestacao}).\n\n{lista_valores}\n\nPayment should be made by {data_limite}.\n\nBest regards," },
  { tipo: "aimi", assunto: "AIMI {ano} — {nome}", corpo: "Exmo(a). Sr(a).,\n\nJunto enviamos a documentação do AIMI de {ano}: {lista_docs}.\n\nO pagamento deverá ser efetuado até {data_limite}.\n\nCom os melhores cumprimentos,",
    assunto_en: "AIMI {ano} — {nome}", corpo_en: "Dear {nome},\n\nPlease find attached the AIMI documentation for {ano}: {lista_docs}.\n\nPayment should be made by {data_limite}.\n\nBest regards," },
  { tipo: "avulso", assunto: "{titulo}", corpo: "Exmo(a). {nome},\n\n{mensagem}\n\n{lista_docs}\n\nCom os melhores cumprimentos,", assunto_en: "{titulo}", corpo_en: "Dear {nome},\n\n{mensagem}\n\n{lista_docs}\n\nBest regards," },
];

function seed(): Db {
  const c = (nif: string, nome: string, email: string, lingua: "PT" | "EN", g: string): Cliente => ({ nif, nome, email, lingua, gestor_nome: g, gestor_email: `${g.toLowerCase()}@demo.pt` });
  return {
    clientes: [
      c("503231711", "Inspecções Auto Caldense, Lda. (demo)", "geral@iac.demo", "PT", "Adriana"),
      c("502979658", "Serve, Lda. (demo)", "miguel@demo.pt", "PT", "Miguel"),
      c("256425884", "Joanne Cruise (demo)", "joanne@demo.uk", "EN", "Leanik"),
      c("510062555", "Socalmed, Lda. (demo)", "", "PT", "Susana"),
      c("510000001", "Atlântico Construções, Lda. (demo)", "geral@atlantico.demo", "PT", "Adriana"),
    ],
    envios: [], docs: [], emails: [], modelos: structuredClone(MODELOS_PADRAO),
  };
}
const g = globalThis as unknown as { __serveGF?: Db };
const db = () => (g.__serveGF ??= seed());

export const memoryStore: Store = {
  async listClientes() { return [...db().clientes]; },
  async esperadosGuias() { return new Set(["503231711", "502979658", "510000001"]); },
  async listEnvios() { return [...db().envios].sort((a, b) => b.criado_em.localeCompare(a.criado_em)); },
  async getEnvio(id) { return db().envios.find((e) => e.id === id) ?? null; },
  async obterOuCriarEnvio(tipo, periodo, titulo) {
    let e = db().envios.find((x) => x.tipo === tipo && x.periodo === periodo);
    if (!e) { e = { id: uid(), tipo, periodo, titulo, mensagem: null, criado_em: new Date().toISOString() }; db().envios.push(e); }
    return e;
  },
  async criarAvulso(titulo, mensagem) {
    const e: Envio = { id: uid(), tipo: "avulso", periodo: new Date().toISOString().slice(0, 10), titulo, mensagem, criado_em: new Date().toISOString() };
    db().envios.push(e); return e;
  },
  async guardarMensagem(id, titulo, mensagem) { const e = db().envios.find((x) => x.id === id); if (e) { e.titulo = titulo; e.mensagem = mensagem; } },
  async apagarEnvio(id) { db().envios = db().envios.filter((e) => e.id !== id); db().docs = db().docs.filter((d) => d.envio_id !== id); },
  async listDocumentos(envioId) { return db().docs.filter((d) => d.envio_id === envioId).map(({ bytes: _b, ...d }) => d); },
  async adicionarDocumento(d, bytes) {
    const doc = { ...d, id: uid(), caminho: `demo/${uid()}.pdf`, criado_em: new Date().toISOString(), bytes };
    db().docs.push(doc);
    const { bytes: _b, ...sem } = doc; return sem;
  },
  async apagarDocumento(id) { db().docs = db().docs.filter((d) => d.id !== id); },
  async lerDocumento(id) { const d = db().docs.find((x) => x.id === id); if (!d) return null; const { bytes, ...doc } = d; return { doc, bytes }; },
  async listEmails(envioId) { return db().emails.filter((e) => !envioId || e.envio_id === envioId).sort((a, b) => b.enviado_em.localeCompare(a.enviado_em)); },
  async registarEmail(e) { const { enviado_por: _p, ...r } = e; db().emails.push({ ...r, id: db().emails.length + 1, enviado_em: new Date().toISOString() }); },
  async logAntigo() { return [{ data: "2026-10-10 10:02", nif: "503231711", nome: "Inspecções Auto Caldense (demo)", estado: "Enviado (2026-09)", modulo: "SS", enviado_por: "servicos@serve.pt" }]; },
  async listModelos() { return [...db().modelos]; },
  async guardarModelo(m) { const i = db().modelos.findIndex((x) => x.tipo === m.tipo); if (i >= 0) db().modelos[i] = m; else db().modelos.push(m); },
  async contaEmail() { return { email: "demo@serve.pt", host: "demo", porta: 587, tls: true, utilizador: "demo", password: "demo", assinatura: "Equipa SERVE (demo)" }; },
  async marcarGuiasLaboral() {},
};
