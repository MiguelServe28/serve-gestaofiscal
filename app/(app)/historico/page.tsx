import { PageHeader, Vazio } from "@/components/ui";
import { store } from "@/lib/store";

const dt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 16)}`;

export default async function Historico({ searchParams }: { searchParams: Promise<{ q?: string; ver?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").toLowerCase();
  const [emails, envios, clientes, antigo] = await Promise.all([store.listEmails(), store.listEnvios(), store.listClientes(), sp.ver === "antigo" ? store.logAntigo() : Promise.resolve([])]);
  const titulo = new Map(envios.map((e) => [e.id, e.titulo]));
  const nome = new Map(clientes.map((c) => [c.nif, c.nome]));
  const lista = emails.filter((e) => !q || e.nif.includes(q) || (nome.get(e.nif) ?? "").toLowerCase().includes(q) || (e.para ?? "").toLowerCase().includes(q));
  return (
    <>
      <PageHeader eyebrow="Registo" titulo="Histórico" descricao="Todos os emails enviados (e os que falharam), com quem enviou e para onde." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form action="/historico"><input name="q" defaultValue={sp.q} className="input w-72" placeholder="Cliente, NIF ou email" /></form>
        <a href={sp.ver === "antigo" ? "/historico" : "/historico?ver=antigo"} className="btn-ghost">{sp.ver === "antigo" ? "Ver envios atuais" : "Ver registo da Gestão Fiscal antiga"}</a>
      </div>
      {sp.ver === "antigo" ? (
        <div className="card overflow-x-auto"><table className="w-full">
          <thead className="border-b border-filete bg-banda/60"><tr><th className="th">Data</th><th className="th">Módulo</th><th className="th">Cliente</th><th className="th">Estado</th><th className="th">Por</th></tr></thead>
          <tbody>{antigo.map((a, i) => <tr key={i} className="border-b border-filete/70"><td className="td whitespace-nowrap text-cinza">{a.data}</td><td className="td">{a.modulo}</td><td className="td">{a.nome}<span className="block text-xs text-cinza">{a.nif}</span></td><td className="td text-sm">{a.estado}</td><td className="td text-xs text-cinza">{a.enviado_por}</td></tr>)}</tbody>
        </table></div>
      ) : lista.length ? (
        <div className="card overflow-x-auto"><table className="w-full">
          <thead className="border-b border-filete bg-banda/60"><tr><th className="th">Data</th><th className="th">Envio</th><th className="th">Cliente</th><th className="th">Para</th><th className="th">Estado</th><th className="th">Por</th></tr></thead>
          <tbody>{lista.map((e) => (
            <tr key={e.id} className="border-b border-filete/70 align-top">
              <td className="td whitespace-nowrap text-cinza">{dt(e.enviado_em)}</td>
              <td className="td text-sm">{titulo.get(e.envio_id) ?? "—"}</td>
              <td className="td">{nome.get(e.nif) ?? e.nif}<span className="block text-xs text-cinza">{e.nif}</span></td>
              <td className="td text-xs text-cinza">{e.para}{e.cc ? <span className="block">CC {e.cc}</span> : null}</td>
              <td className="td text-xs">{e.estado === "enviado" ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">Enviado</span> : <span className="rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-700" title={e.detalhe ?? ""}>Erro: {(e.detalhe ?? "").slice(0, 50)}</span>}</td>
              <td className="td text-xs text-cinza">{e.enviado_por_email}</td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <Vazio>Sem envios registados.</Vazio>}
    </>
  );
}
