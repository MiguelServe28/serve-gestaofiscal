import { NextResponse } from "next/server";
import { getSessao, podeAceder } from "@/lib/sessao";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Abre um documento carregado (para confirmar antes de enviar). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSessao();
  if (!podeAceder(s, "fiscal")) return new NextResponse("Sem acesso", { status: 403 });
  const l = await store.lerDocumento((await params).id);
  if (!l) return new NextResponse("Não encontrado", { status: 404 });
  return new NextResponse(Buffer.from(l.bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${encodeURIComponent(l.doc.nome)}"` } });
}
