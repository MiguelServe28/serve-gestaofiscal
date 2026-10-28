import "server-only";
import nodemailer from "nodemailer";
import type { ContaEmail } from "./types";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Envia por SMTP com a conta do utilizador. Texto e HTML; o remetente recebe cópia oculta. */
export async function enviar(conta: ContaEmail, para: string[], cc: string[], assunto: string, corpo: string, anexos: { nome: string; bytes: Uint8Array }[]) {
  const texto = conta.assinatura ? `${corpo}\n\n${conta.assinatura}` : corpo;
  const html = `<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1a1a2e">${esc(texto).replace(/\n/g, "<br>")}</div>`;
  const t = nodemailer.createTransport({
    host: conta.host, port: conta.porta, secure: !conta.tls && conta.porta === 465, requireTLS: conta.tls,
    auth: { user: conta.utilizador, pass: conta.password }, connectionTimeout: 20000, socketTimeout: 30000,
  });
  const ja = new Set([...para, ...cc].map((e) => e.toLowerCase()));
  await t.sendMail({
    from: conta.email, to: para, cc: cc.length ? cc : undefined,
    bcc: ja.has(conta.email.toLowerCase()) ? undefined : conta.email,
    subject: assunto, text: texto, html,
    attachments: anexos.map((a) => ({ filename: a.nome, content: Buffer.from(a.bytes), contentType: "application/pdf" })),
  });
}
