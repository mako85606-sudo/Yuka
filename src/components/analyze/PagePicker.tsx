"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Button } from "@/components/ui/Button";
import { CameraGlyph, CloseGlyph, DocumentGlyph } from "@/components/ui/icons";
import { limits } from "@/config/limits";
import { cn } from "@/lib/cn";
import { fr } from "@/lib/typography";
import type { PageItem } from "./use-pages";

interface PagePickerProps {
  readonly pages: readonly PageItem[];
  readonly notice: string | null;
  readonly onAdd: (files: readonly File[]) => void;
  readonly onRemove: (id: string) => void;
  readonly noticeId: string;
}

const HINT = fr(
  `Une photo par page (${limits.maxPhotos} au maximum), ou le PDF. ${Math.round(limits.maxUploadBytes / (1024 * 1024))} Mo en tout.`,
);

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
}

/**
 * Les pages du devis : prise de photo (le téléphone ouvre directement
 * l'appareil photo arrière), choix d'un fichier, ou glisser-déposer sur
 * ordinateur. Les aperçus restent dans le navigateur.
 */
export function PagePicker({ pages, notice, onAdd, onRemove, noticeId }: PagePickerProps) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    // Permet de rechoisir le même fichier après l'avoir retiré.
    event.target.value = "";
    if (files.length > 0) onAdd(files);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) onAdd(files);
  };

  const photos = pages.filter((page) => page.kind === "image").length;

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-[4px] border border-dashed p-3 sm:p-4",
          dragging ? "border-ink bg-paper-raised" : "border-rule-strong",
        )}
      >
        {pages.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center gap-2 px-4 py-6 text-center">
            <DocumentGlyph className="size-7 text-ink-muted" />
            <p className="text-[0.95rem] text-ink">
              <span className="hidden sm:inline">
                Glisse ton devis ici, ou choisis-le{" "}
                <span className="whitespace-nowrap">ci-dessous</span>.
              </span>
              <span className="sm:hidden">Prends la première page en photo, bien à plat.</span>
            </p>
          </div>
        ) : (
          <ul aria-label="Pages du devis" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pages.map((page, index) => (
              <PageThumb key={page.id} page={page} number={index + 1} onRemove={onRemove} />
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          className="sm:hidden"
          onClick={() => cameraInput.current?.click()}
          disabled={photos >= limits.maxPhotos}
        >
          <CameraGlyph />
          {pages.length === 0 ? "Prendre en photo" : "Ajouter une page"}
        </Button>
        <Button size="lg" variant="secondary" onClick={() => fileInput.current?.click()}>
          <DocumentGlyph />
          Choisir un fichier
        </Button>
      </div>
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleInput}
      />
      <input
        ref={fileInput}
        type="file"
        accept="image/*,application/pdf"
        multiple
        hidden
        onChange={handleInput}
      />
      <p id={noticeId} aria-live="polite" className="mt-3 min-h-5 text-sm text-ink-muted">
        {notice ?? HINT}
      </p>
    </div>
  );
}

function PageThumb({
  page,
  number,
  onRemove,
}: {
  readonly page: PageItem;
  readonly number: number;
  readonly onRemove: (id: string) => void;
}) {
  const label = page.kind === "pdf" ? "le PDF" : `la page ${number}`;
  return (
    <li className="relative aspect-[3/4] overflow-hidden rounded-[3px] border border-rule bg-paper-raised">
      {page.kind === "image" && page.previewUrl ? (
        // Aperçu local (adresse blob:) : next/image n'a rien à optimiser ici.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={page.previewUrl}
          alt={`Page ${number} du devis`}
          className={cn("size-full object-cover", page.status !== "ready" && "opacity-60")}
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 p-3 text-center">
          <DocumentGlyph className="size-8 text-ink-muted" />
          <p className="line-clamp-2 break-all text-xs text-ink">{page.file.name}</p>
          <p className="font-mono text-xs text-ink-muted">{formatSize(page.file.size)}</p>
        </div>
      )}
      <span className="absolute left-1.5 top-1.5 rounded-[2px] bg-paper-raised px-1.5 py-0.5 font-mono text-label uppercase text-ink">
        {page.kind === "pdf" ? "PDF" : `p. ${number}`}
      </span>
      <button
        type="button"
        onClick={() => onRemove(page.id)}
        aria-label={`Retirer ${label}`}
        className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full border border-rule bg-paper-raised text-ink hover:bg-paper"
      >
        <CloseGlyph />
      </button>
      {page.status === "preparing" ? (
        <span className="absolute inset-x-0 bottom-0 bg-paper-raised py-1 text-center text-xs text-ink-muted">
          Préparation…
        </span>
      ) : null}
      {page.status === "error" ? (
        <span className="absolute inset-x-0 bottom-0 bg-paper-raised py-1 text-center text-xs text-pen-red-strong">
          {page.kind === "pdf" ? "Trop lourd" : "Illisible"}
        </span>
      ) : null}
    </li>
  );
}
