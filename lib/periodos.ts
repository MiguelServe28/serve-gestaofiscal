import { hojeISO, somaMes } from "./dates";
import type { TipoEnvio } from "./leitura";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const PRESTACOES: Record<string, { pt: string; en: string; mes: number; dia: number }> = {
  P1: { pt: "1.ª prestação", en: "1st instalment", mes: 5, dia: 31 },
  P2: { pt: "2.ª prestação", en: "2nd instalment", mes: 8, dia: 31 },
  P3: { pt: "3.ª prestação", en: "3rd instalment", mes: 11, dia: 30 },
};

export const nomeMesL = (mes: string, en = false) => `${(en ? MONTHS : MESES)[Number(mes.slice(5, 7)) - 1]} ${mes.slice(0, 4)}`;
const fmt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Guias Mensais: o mês de referência é o mês anterior ao do envio (dia 10). */
/** Até dia 20 ainda se trabalha nas guias do mês anterior; depois disso, já nas do mês corrente. */
export const mesGuiasPadrao = () => { const h = hojeISO(); return Number(h.slice(8, 10)) > 20 ? h.slice(0, 7) : somaMes(h.slice(0, 7), -1); };

export function tituloEnvio(tipo: TipoEnvio, periodo: string): string {
  if (tipo === "guias") return `Guias Mensais · ${nomeMesL(periodo)}`;
  if (tipo === "imi") return `IMI ${periodo.slice(0, 4)} · ${PRESTACOES[periodo.slice(5)]?.pt ?? periodo}`;
  if (tipo === "aimi") return `AIMI ${periodo}`;
  return periodo;
}

/** Variáveis do modelo de email que dependem do período. */
export function variaveisPeriodo(tipo: TipoEnvio, periodo: string, en: boolean): Record<string, string> {
  if (tipo === "guias") {
    const seg = somaMes(periodo, 1);
    return { mes_nome: nomeMesL(periodo, en), data_limite: fmt(`${seg}-20`) };
  }
  if (tipo === "imi") {
    const p = PRESTACOES[periodo.slice(5)];
    const ano = periodo.slice(0, 4);
    return { ano, prestacao: en ? p.en : p.pt, data_limite: fmt(`${ano}-${String(p.mes).padStart(2, "0")}-${p.dia}`) };
  }
  if (tipo === "aimi") return { ano: periodo, data_limite: fmt(`${periodo}-09-30`) };
  return {};
}
