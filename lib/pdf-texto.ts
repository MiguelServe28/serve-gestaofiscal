/** Junta o texto de um PDF (pdf.js) por linhas, pela posição na página, como aparece no papel. */
type Item = { str: string; transform: number[] };

export async function textoPorLinhas(doc: { numPages: number; getPage(n: number): Promise<{ getTextContent(): Promise<{ items: unknown[] }> }> }, maxPaginas = 3) {
  const linhas: string[] = [];
  for (let p = 1; p <= Math.min(doc.numPages, maxPaginas); p++) {
    const conteudo = await (await doc.getPage(p)).getTextContent();
    const itens = (conteudo.items as Item[]).filter((i) => typeof i.str === "string" && i.str.trim());
    const porY = new Map<number, Item[]>();
    for (const i of itens) {
      const y = Math.round(i.transform[5] / 3) * 3; // tolera pequenas diferenças de altura na mesma linha
      porY.set(y, [...(porY.get(y) ?? []), i]);
    }
    for (const y of [...porY.keys()].sort((a, b) => b - a)) {
      linhas.push(porY.get(y)!.sort((a, b) => a.transform[4] - b.transform[4]).map((i) => i.str.trim()).join("  "));
    }
  }
  return linhas.join("\n");
}
