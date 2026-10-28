import Link from "next/link";
import EnvioPagina from "@/components/EnvioPagina";
import { PageHeader } from "@/components/ui";
import { hojeISO } from "@/lib/dates";
import { PRESTACOES, tituloEnvio } from "@/lib/periodos";
import { getSessao } from "@/lib/sessao";
import { store } from "@/lib/store";

export default async function Imi({ searchParams }: { searchParams: Promise<{ ano?: string; p?: string }> }) {
  const sp = await searchParams;
  const hoje = hojeISO();
  const ano = /^\d{4}$/.test(sp.ano ?? "") ? sp.ano! : hoje.slice(0, 4);
  const mesHoje = Number(hoje.slice(5, 7));
  const p = sp.p && PRESTACOES[sp.p] ? sp.p : mesHoje <= 5 ? "P1" : mesHoje <= 8 ? "P2" : "P3";
  const periodo = `${ano}-${p}`;
  const envio = await store.obterOuCriarEnvio("imi", periodo, tituloEnvio("imi", periodo), (await getSessao()).userId);
  return (
    <>
      <PageHeader eyebrow="Gestão Fiscal" titulo="IMI" descricao="Notas de cobrança do IMI por prestação (31 de maio, 31 de agosto, 30 de novembro).">
        <div className="flex rounded-lg border border-filete bg-white p-0.5 text-sm shadow-card">
          {[Number(ano) - 1, Number(ano), Number(ano) + 1].map((a) => <Link key={a} href={`/imi?ano=${a}&p=${p}`} className={`rounded-md px-3 py-1.5 ${String(a) === ano ? "bg-navy text-white" : "hover:bg-banda"}`}>{a}</Link>)}
        </div>
        <div className="flex rounded-lg border border-filete bg-white p-0.5 text-sm shadow-card">
          {Object.entries(PRESTACOES).map(([k, v]) => <Link key={k} href={`/imi?ano=${ano}&p=${k}`} className={`rounded-md px-3 py-1.5 ${k === p ? "bg-navy text-white" : "hover:bg-banda"}`}>{v.pt}</Link>)}
        </div>
      </PageHeader>
      <EnvioPagina envio={envio} />
    </>
  );
}
