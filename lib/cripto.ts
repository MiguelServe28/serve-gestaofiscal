import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** Encripta textos sensíveis (palavras-passe de email) com AES-256-GCM. Chave em EMAIL_ENC_KEY (base64, 32 bytes). */
function chave() {
  const k = process.env.EMAIL_ENC_KEY;
  if (!k) throw new Error("Falta a chave de encriptação (EMAIL_ENC_KEY).");
  const b = Buffer.from(k, "base64");
  if (b.length !== 32) throw new Error("EMAIL_ENC_KEY inválida.");
  return b;
}

export function encriptar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), dados.toString("base64")].join(":");
}

export function desencriptar(guardado: string): string {
  const [v, iv, tag, dados] = guardado.split(":");
  if (v !== "v1") throw new Error("Formato desconhecido.");
  const d = createDecipheriv("aes-256-gcm", chave(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(dados, "base64")), d.final()]).toString("utf8");
}
