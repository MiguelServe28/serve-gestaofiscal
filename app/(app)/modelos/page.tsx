import { guardarModelo } from "@/app/actions";
import { PageHeader } from "@/components/ui";
import { MODELOS_PADRAO } from "@/lib/store/memory";
import { store } from "@/lib/store";

const INFO: Record<string, { titulo: string; vars: string }> = {
  guias: { titulo: "Guias Mensais", vars: "{nome} {nif} {mes_nome} {data_limite} {lista_docs} {lista_valores}" },
  imi: { titulo: "IMI", vars: "{nome} {nif} {ano} {prestacao} {data_limite} {lista_docs} {lista_valores}" },
  aimi: { titulo: "AIMI", vars: "{nome} {nif} {ano} {data_limite} {lista_docs} {lista_valores}" },
  avulso: { titulo: "Envios avulsos", vars: "{nome} {nif} {titulo} {mensagem} {lista_docs} {lista_valores}" },
};

export default async function Modelos() {
  const atuais = await store.listModelos();
  return (
    <>
      <PageHeader eyebrow="Registo" titulo="Modelos de email" descricao="O texto de cada tipo de envio, em português e em inglês. As palavras entre chavetas são preenchidas automaticamente." />
      <div className="space-y-6">
        {Object.entries(INFO).map(([tipo, info]) => {
          const m = atuais.find((x) => x.tipo === tipo) ?? MODELOS_PADRAO.find((x) => x.tipo === tipo)!;
          return (
            <form key={tipo} action={guardarModelo} className="card grid gap-4 p-6 lg:grid-cols-2">
              <input type="hidden" name="tipo" value={tipo} />
              <div className="lg:col-span-2 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-base font-semibold">{info.titulo}</h2><p className="text-xs text-cinza">Variáveis: {info.vars}</p></div>
              <div><label className="label">Assunto (PT)</label><input name="assunto" defaultValue={m.assunto} className="input" /></div>
              <div><label className="label">Assunto (EN)</label><input name="assunto_en" defaultValue={m.assunto_en} className="input" /></div>
              <div><label className="label">Texto (PT)</label><textarea name="corpo" rows={10} defaultValue={m.corpo} className="input font-mono text-xs" /></div>
              <div><label className="label">Texto (EN)</label><textarea name="corpo_en" rows={10} defaultValue={m.corpo_en} className="input font-mono text-xs" /></div>
              <div className="lg:col-span-2 flex justify-end"><button className="btn-primary">Guardar</button></div>
            </form>
          );
        })}
      </div>
    </>
  );
}
