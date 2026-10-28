import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SERVE · Gestão Fiscal",
  description: "Envio em lote de guias e documentos fiscais aos clientes da SERVE.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body className="font-sans">{children}</body>
    </html>
  );
}
