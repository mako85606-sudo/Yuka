import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { Wordmark } from "@/components/landing/Wordmark";
import { fr } from "@/lib/typography";
import { adminPassword, isAdmin } from "@/server/admin/auth";
import { adminStats } from "@/server/admin/stats";
import { getDb } from "@/server/db/client";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** Tableau de bord interne : analyses, conversion, catégories, coût. Protégé par `ADMIN_PASSWORD`. */
export default async function AdminPage() {
  await connection();
  const password = adminPassword();
  const signedIn = password ? await isAdmin() : false;
  const db = getDb();

  let content;
  if (!password) {
    content = (
      <p className="max-w-prose text-ink-muted">
        {fr(
          "L'administration est fermée : définis ADMIN_PASSWORD (16 caractères au moins) dans les variables d'environnement.",
        )}
      </p>
    );
  } else if (!signedIn) {
    content = (
      <>
        <h1 className="mb-6 font-display text-title text-ink">Administration</h1>
        <AdminLogin />
      </>
    );
  } else if (!db) {
    content = (
      <p className="max-w-prose text-ink-muted">
        {fr("Pas de base configurée (DATABASE_URL) : rien à afficher.")}
      </p>
    );
  } else {
    content = <AdminDashboard stats={await adminStats(db)} />;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-8">
      <div className="mb-8">
        <Wordmark />
      </div>
      {content}
    </main>
  );
}
