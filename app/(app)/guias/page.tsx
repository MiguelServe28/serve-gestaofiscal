import EnvioPagina from "@/components/EnvioPagina";
import { MonthNav, PageHeader } from "@/components/ui";
import { mesGuiasPadrao, nomeMesL, tituloEnvio } from "@/lib/periodos";
import { getSessao } from "@/lib/sessao";
import { store } from "@/lib/store";

export default async function Guias({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes: m } = await searchParams;
  const mes = m && /^\d{4}-\d{2}$/.test(m) ? m : mesGuiasPadrao();
  const s = await getSessao();
  const envio = await store.obterOuCriarEnvio("guias", mes, tituloEnvio("guias", mes), s.userId);
  return (
    <>
      <PageHeader eyebrow="Gestão Fiscal" titulo="Guias Mensais"
        descricao={`Guias de ${nomeMesL(mes)}, a enviar até dia 10 do mês seguinte. Cada cliente recebe um único email com tudo.`}>
        <MonthNav mes={mes} base="/guias" inicio="2026-09" />
      </PageHeader>
      <EnvioPagina envio={envio} />
    </>
  );
}
