import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { SetupChecklist } from "@/components/admin/SetupChecklist";
import { Logo } from "@/components/landing/Logo";
import { cn } from "@/lib/cn";
import { fr } from "@/lib/typography";
import { adminPassword, isAdmin } from "@/server/admin/auth";
import { setupChecklist } from "@/server/admin/setup";
import { adminStats } from "@/server/admin/stats";
import { getDb } from "@/server/db/client";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** Une carte centrée : la connexion, ou la raison pour laquelle il n'y a rien à montrer. */
function AdminCard({ children, wide = false }: { readonly children: ReactNode; readonly wide?: boolean }) {
  return (
    <div
      className={cn(
        "mx-auto mt-6 rounded-lg bg-paper-raised p-7 elevation-1 sm:mt-12 sm:p-9",
        wide ? "max-w-3xl" : "max-w-md",
      )}
    >
      <h1 className="font-display text-title text-ink">Administration</h1>
      {children}
    </div>
  );
}

function Code({ children }: { readonly children: ReactNode }) {
  return <code className="rounded-sm bg-mist px-1.5 py-0.5 font-mono text-[0.875em] text-ink">{children}</code>;
}

/** Tableau de bord interne : analyses, conversion, catégories, coût. Protégé par `ADMIN_PASSWORD`. */
export default async function AdminPage() {
  await connection();
  const password = adminPassword();
  const signedIn = password ? await isAdmin() : false;
  const db = getDb();

  let content;
  if (!password) {
    content = (
      <AdminCard>
        <p className="mt-4 leading-relaxed text-ink-muted">
          {fr("L'administration est fermée : définissez ")}
          <Code>ADMIN_PASSWORD</Code>
          {fr(" (16 caractères au moins) dans les variables d'environnement.")}
        </p>
      </AdminCard>
    );
  } else if (!signedIn) {
    content = (
      <AdminCard>
        <p className="mt-3 leading-relaxed text-ink-muted">{fr("Accès réservé à l'éditeur de Loupe.")}</p>
        <div className="mt-7">
          <AdminLogin />
        </div>
      </AdminCard>
    );
  } else if (!db) {
    content = (
      <AdminCard wide>
        <p className="mt-4 leading-relaxed text-ink-muted">
          {fr("Aucune base de données n'est configurée (")}
          <Code>DATABASE_URL</Code>
          {fr(") : pas encore de statistiques. Voici ce qui est réglé :")}
        </p>
        <div className="mt-4">
          <SetupChecklist items={setupChecklist()} />
        </div>
      </AdminCard>
    );
  } else {
    content = <AdminDashboard stats={await adminStats(db)} setup={setupChecklist()} />;
  }

  return (
    <div className="min-h-dvh bg-mist">
      <header className="border-b border-rule bg-paper">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-8">
          <Logo />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-8 lg:pt-12">{content}</main>
    </div>
  );
}
