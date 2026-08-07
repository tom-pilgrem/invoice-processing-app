import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: "Ledger",
  description: "Invoice library — upload, extract, browse, and export invoices.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${archivo.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <Nav authenticated={!!user} />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
