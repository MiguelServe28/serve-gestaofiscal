import type { TipoEnvio } from "./leitura";

export type Colaborador = { id: string; nome: string; funcao: string; email: string | null; ativo: boolean };
export type Cliente = { nif: string; nome: string; email: string; email_envio?: string | null; lingua: "PT" | "EN"; gestor_nome: string; gestor_email: string };

export type Envio = { id: string; tipo: TipoEnvio; periodo: string; titulo: string; mensagem: string | null; criado_em: string };
export type Documento = { id: string; envio_id: string; nif: string; categoria: string; nome: string; caminho: string; valor: number | null; origem: string; criado_em: string };
export type EmailLog = { id: number; envio_id: string; nif: string; estado: "enviado" | "erro"; detalhe: string | null; para: string | null; cc: string | null; assunto: string | null; enviado_por_email: string | null; enviado_em: string };
export type Modelo = { tipo: string; assunto: string; corpo: string; assunto_en: string; corpo_en: string };
export type ContaEmail = { email: string; host: string; porta: number; tls: boolean; utilizador: string; password: string; assinatura: string | null };
export type LogAntigo = { data: string; nif: string; nome: string; estado: string; modulo: string; enviado_por: string };

/** Para onde seguem as guias: o email de envio, se preenchido; senão, o email do cliente. */
export const destino = (c: Pick<Cliente, "email" | "email_envio">) => (c.email_envio ?? "").trim() || c.email;
