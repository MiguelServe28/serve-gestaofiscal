import Link from "next/link";
import EnvioPagina from "@/components/EnvioPagina";
import { PageHeader } from "@/components/ui";
import { hojeISO } from "@/lib/dates";
import { tituloEnvio } from "@/lib/periodos";
import { getSessao } from "@/lib/sessao";
import { store } from "@/lib/store";

export default async function Aimi({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const sp = await searchParams;
  const ano = /^\d{4}$/.test(sp.ano ?? "") ? sp.ano! : hojeISO().slice(0, 4);
  const envio = await store.obterOuCriarEnvio("aimi", ano, tituloEnvio("aimi", ano), (await getSessao()).userId);
  return (
    <>
      <PageHeader eyebrow="Gestão Fiscal" titulo="AIMI" descricao="Adicional ao IMI: pagamento único, até 30 de setembro.">
        <div className="flex rounded-lg border border-filete bg-white p-0.5 text-sm shadow-card">
          {[Number(ano) - 1, Number(ano), Number(ano) + 1].map((a) => <Link key={a} href={`/aimi?ano=${a}`} className={`rounded-md px-3 py-1.5 ${String(a) === ano ? "bg-navy text-white" : "hover:bg-banda"}`}>{a}</Link>)}
        </div>
      </PageHeader>
      <EnvioPagina envio={envio} />
    </>
  );
}
