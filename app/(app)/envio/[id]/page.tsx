import { notFound } from "next/navigation";
import { guardarMensagem } from "@/app/actions";
import ApagarEnvio from "@/components/ApagarEnvio";
import EnvioPagina from "@/components/EnvioPagina";
import { PageHeader } from "@/components/ui";
import { store } from "@/lib/store";

export default async function EnvioAvulso({ params }: { params: Promise<{ id: string }> }) {
  const envio = await store.getEnvio((await params).id);
  if (!envio) notFound();
  return (
    <>
      <PageHeader eyebrow="Envio avulso" titulo={envio.titulo} descricao="Largue os documentos (se houver) e acrescente os clientes que devem receber o aviso.">
        <ApagarEnvio id={envio.id} />
      </PageHeader>
      {envio.tipo === "avulso" && (
        <form action={guardarMensagem} className="card mb-6 grid gap-3 p-5 md:grid-cols-[1fr_2fr_auto] md:items-end">
          <input type="hidden" name="id" value={envio.id} />
          <div><label className="label">Título</label><input name="titulo" defaultValue={envio.titulo} className="input" /></div>
          <div><label className="label">Mensagem</label><textarea name="mensagem" rows={3} defaultValue={envio.mensagem ?? ""} className="input" /></div>
          <button className="btn-ghost">Guardar</button>
        </form>
      )}
      <EnvioPagina envio={envio} />
    </>
  );
}
