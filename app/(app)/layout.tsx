import Sidebar from "@/components/Sidebar";
import { Vazio } from "@/components/ui";
import { getSessao, podeAceder } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSessao();
  return (
    <div className="min-h-screen">
      <Sidebar email={s.email} demo={s.demo} plataforma={process.env.NEXT_PUBLIC_URL_PLATAFORMA} />
      <main className="pl-64">
        <div className="mx-auto max-w-[1500px] px-8 py-8">
          {podeAceder(s, "fiscal") ? children : <Vazio>Não tem acesso à Gestão Fiscal. Peça acesso a um administrador na Plataforma SERVE.</Vazio>}
        </div>
      </main>
    </div>
  );
}
