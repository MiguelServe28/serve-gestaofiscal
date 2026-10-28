"use client";

import { textoPorLinhas } from "./pdf-texto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjs: any = null;

/** Lê o texto de um PDF no browser (pdf.js). Devolve "" se o PDF não tiver texto (ex.: digitalizado). */
export async function lerTextoPdf(ficheiro: File): Promise<string> {
  if (!pdfjs) {
    pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  }
  try {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await ficheiro.arrayBuffer()) }).promise;
    const t = await textoPorLinhas(doc);
    await doc.destroy();
    return t;
  } catch {
    return "";
  }
}
