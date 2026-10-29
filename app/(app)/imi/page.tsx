import Filtros from "@/components/Filtros";
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
      </PageHeader>
      <Filtros campos={[
        { nome: "ano", label: "Ano", valor: ano, largura: "w-32", opcoes: [Number(ano) - 1, Number(ano), Number(ano) + 1].map((a) => ({ value: String(a), label: String(a) })) },
        { nome: "p", label: "Prestação", valor: p, largura: "w-56", opcoes: Object.entries(PRESTACOES).map(([k, v]) => ({ value: k, label: v.pt })) },
      ]} />
      <EnvioPagina envio={envio} />
    </>
  );
}
