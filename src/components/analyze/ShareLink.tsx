"use client";

import { useId, useState, useTransition } from "react";
import { createShareLink } from "@/app/actions/share";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics";
import { formatShortDate } from "@/lib/format";
import { fr } from "@/lib/typography";

interface ShareLinkProps {
  readonly analysisId: string;
  readonly expiresAt: string | null;
}

/**
 * « Partager l'analyse » : un lien public vers une page anonyme (devis
 * vérifié et verdict, sans date, sans département, sans le message). Sur
 * téléphone, la feuille de partage du système ; ailleurs, le lien copié.
 */
export function ShareLink({ analysisId, expiresAt }: ShareLinkProps) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const statusId = useId();
  const fieldId = useId();

  const share = () => {
    startTransition(async () => {
      const result = await createShareLink(analysisId);
      if (!result.ok) {
        setStatus(result.message);
        return;
      }
      const link = new URL(result.path, window.location.origin).toString();
      setUrl(link);
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title: "Mon devis vérifié par Loupe", url: link });
          track("share_clicked", { method: "native" });
          setStatus("");
          return;
        } catch (error) {
          // Partage annulé par le visiteur : on lui laisse le lien, sans insister.
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(link);
        track("share_clicked", { method: "copy" });
        setStatus("Lien copié.");
      } catch {
        setStatus(fr("Copie impossible ici : sélectionnez le lien ci-dessous."));
      }
    });
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button variant="secondary" onClick={share} disabled={pending} aria-describedby={statusId}>
          {pending ? "Création du lien…" : "Partager l'analyse"}
        </Button>
        <p id={statusId} aria-live="polite" className="text-sm text-ink-muted">
          {status}
        </p>
      </div>
      {url ? (
        <div className="mt-3">
          <label htmlFor={fieldId} className="sr-only">
            Lien de partage
          </label>
          <input
            id={fieldId}
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            className="h-10 w-full rounded-md border border-rule-strong bg-paper-raised px-3 font-mono text-sm text-ink"
          />
        </div>
      ) : null}
      <p className="mt-2 text-sm text-ink-muted">
        {fr(
          `Le lien montre le devis vérifié et le verdict. La date, le département et votre message restent privés.${
            expiresAt ? ` Il cessera de fonctionner le ${formatShortDate(new Date(expiresAt))}, en même temps que l'analyse.` : ""
          }`,
        )}
      </p>
    </div>
  );
}
