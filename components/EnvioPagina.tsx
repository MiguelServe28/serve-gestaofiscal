import EnvioPainel from "@/components/EnvioPainel";
import { store } from "@/lib/store";
import type { Envio } from "@/lib/types";

/** Carrega tudo o que o ecrã de um envio precisa. */
export default async function EnvioPagina({ envio }: { envio: Envio }) {
  const [clientes, documentos, emails, esperados, modelos] = await Promise.all([
    store.listClientes(), store.listDocumentos(envio.id), store.listEmails(envio.id),
    envio.tipo === "guias" ? store.esperadosGuias() : Promise.resolve(new Set<string>()), store.listModelos(),
  ]);
  return (
    <EnvioPainel key={envio.id} envio={envio} clientes={clientes} documentos={documentos} emails={emails}
      esperados={[...esperados]} modelo={modelos.find((m) => m.tipo === envio.tipo) ?? null} />
  );
}
