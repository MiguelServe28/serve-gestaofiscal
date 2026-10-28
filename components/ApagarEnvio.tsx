"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { apagarEnvio } from "@/app/actions";

export default function ApagarEnvio({ id }: { id: string }) {
  const [pend, start] = useTransition();
  return <button className="btn-ghost" disabled={pend} onClick={() => { if (window.confirm("Apagar este envio e os seus documentos?")) start(() => apagarEnvio(id)); }}><Trash2 size={15} />Apagar envio</button>;
}
