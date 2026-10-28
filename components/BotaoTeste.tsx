"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { emailTeste } from "@/app/actions";

export default function BotaoTeste() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pend, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="btn-ghost" disabled={pend} onClick={() => start(async () => setMsg(await emailTeste()))}><Mail size={15} />{pend ? "A enviar…" : "Enviar email de teste para mim"}</button>
      {msg && <span className="text-sm text-cinza">{msg}</span>}
    </div>
  );
}
