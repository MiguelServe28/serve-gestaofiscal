import Filtros from "@/components/Filtros";
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
      </PageHeader>
      <Filtros campos={[{ nome: "ano", label: "Ano", valor: ano, largura: "w-32", opcoes: [Number(ano) - 1, Number(ano), Number(ano) + 1].map((a) => ({ value: String(a), label: String(a) })) }]} />
      <EnvioPagina envio={envio} />
    </>
  );
}
