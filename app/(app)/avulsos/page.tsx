import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { criarAvulso } from "@/app/actions";
import { PageHeader, Vazio } from "@/components/ui";
import { fmtData } from "@/lib/dates";
import { store } from "@/lib/store";

export default async function Avulsos() {
  const envios = (await store.listEnvios()).filter((e) => e.tipo === "avulso");
  return (
    <>
      <PageHeader eyebrow="Gestão Fiscal" titulo="Envios avulsos" descricao="Avisos e documentos pontuais: por exemplo, o valor trimestral da Segurança Social dos trabalhadores independentes ou um comunicado a vários clientes." />
      <form action={criarAvulso} className="card mb-8 grid gap-3 p-5 md:grid-cols-[1fr_2fr_auto] md:items-end">
        <div><label className="label">Título (assunto do email)</label><input name="titulo" required className="input" placeholder="ex.: Segurança Social · 4.º trimestre 2026" /></div>
        <div><label className="label">Mensagem</label><textarea name="mensagem" rows={2} className="input" placeholder="Texto que vai no corpo do email" /></div>
        <button className="btn-primary"><Plus size={15} />Criar envio</button>
      </form>
      {envios.length ? (
        <div className="card divide-y divide-filete">
          {envios.map((e) => (
            <Link key={e.id} href={`/envio/${e.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-fundo">
              <div className="min-w-0 flex-1"><p className="font-medium text-tinta">{e.titulo}</p><p className="text-xs text-cinza">{fmtData(e.criado_em.slice(0, 10))}</p></div>
              <ArrowRight size={16} className="text-cinza" />
            </Link>
          ))}
        </div>
      ) : <Vazio>Sem envios avulsos.</Vazio>}
    </>
  );
}
