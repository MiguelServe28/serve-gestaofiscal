import Link from "next/link";
import { ArrowRight, Building, FileStack, Landmark, Send } from "lucide-react";
import BotaoTeste from "@/components/BotaoTeste";
import { PageHeader, Vazio } from "@/components/ui";
import { fmtData } from "@/lib/dates";
import { mesGuiasPadrao, nomeMesL } from "@/lib/periodos";
import { getSessao } from "@/lib/sessao";
import { store } from "@/lib/store";

const LINK: Record<string, (p: string, id: string) => string> = {
  guias: (p) => `/guias?mes=${p}`, imi: (p) => `/imi?ano=${p.slice(0, 4)}&p=${p.slice(5)}`, aimi: (p) => `/aimi?ano=${p}`, avulso: (_, id) => `/envio/${id}`,
};

export default async function Painel() {
  const s = await getSessao();
  const [envios, emails, conta] = await Promise.all([store.listEnvios(), store.listEmails(), store.contaEmail(s.userId).catch(() => null)]);
  const porEnvio = (id: string) => {
    const ultimos = new Map<string, string>();
    for (const e of [...emails].reverse()) if (e.envio_id === id) ultimos.set(e.nif, e.estado);
    return { enviados: [...ultimos.values()].filter((x) => x === "enviado").length, erros: [...ultimos.values()].filter((x) => x === "erro").length };
  };
  const mes = mesGuiasPadrao();
  return (
    <>
      <PageHeader eyebrow="Gestão Fiscal" titulo="Painel" descricao="Envio em lote de guias e documentos aos clientes." />
      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Atalho href="/guias" icon={FileStack} titulo="Guias Mensais" texto={`Guias de ${nomeMesL(mes)}`} />
        <Atalho href="/imi" icon={Building} titulo="IMI" texto="Notas de cobrança por prestação" />
        <Atalho href="/aimi" icon={Landmark} titulo="AIMI" texto="Pagamento anual até 30 de setembro" />
        <Atalho href="/avulsos" icon={Send} titulo="Envios avulsos" texto="Avisos e documentos pontuais" />
      </div>

      <section className="card mb-8 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm font-medium text-tinta">A minha conta de envio</p>
          <p className="text-xs text-cinza">{conta ? `Os emails saem de ${conta.email}${conta.assinatura ? " com a sua assinatura" : ""}.` : "Ainda não tem conta de email configurada. A gerência configura-a na Plataforma SERVE › Utilizadores."}</p>
        </div>
        {conta && <BotaoTeste />}
      </section>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-cinza">Envios recentes</h2>
      {envios.length ? (
        <div className="card divide-y divide-filete">
          {envios.slice(0, 15).map((e) => {
            const r = porEnvio(e.id);
            return (
              <Link key={e.id} href={LINK[e.tipo](e.periodo, e.id)} className="flex items-center gap-4 px-5 py-3 hover:bg-fundo">
                <div className="min-w-0 flex-1"><p className="font-medium text-tinta">{e.titulo}</p><p className="text-xs text-cinza">criado a {fmtData(e.criado_em.slice(0, 10))}</p></div>
                <span className="text-sm text-emerald-700">{r.enviados} enviados</span>
                {r.erros > 0 && <span className="text-sm text-rose-700">{r.erros} com erro</span>}
                <ArrowRight size={16} className="text-cinza" />
              </Link>
            );
          })}
        </div>
      ) : <Vazio>Ainda não há envios. Comece pelas Guias Mensais.</Vazio>}
    </>
  );
}

function Atalho({ href, icon: Icon, titulo, texto }: { href: string; icon: React.ComponentType<{ size?: number }>; titulo: string; texto: string }) {
  return (
    <Link href={href} className="card group p-5 transition hover:border-laranja/50 hover:shadow-md">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-laranja-suave text-laranja"><Icon size={19} /></span>
      <p className="mt-4 text-base font-semibold text-tinta">{titulo}</p>
      <p className="mt-1 text-xs text-cinza">{texto}</p>
    </Link>
  );
}
