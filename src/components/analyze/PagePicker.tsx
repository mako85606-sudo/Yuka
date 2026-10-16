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
  `Jusqu'à ${limits.maxPhotos} pages en photo, ou un PDF de ${Math.round(limits.maxUploadBytes / (1024 * 1024))} Mo maximum.`,
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
  // Un PDF voyage seul ; des photos, jusqu'à la limite.
  const canAddPage = !pages.some((page) => page.kind === "pdf") && photos < limits.maxPhotos;
  const openFiles = () => fileInput.current?.click();

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
          "rounded-lg border-2 border-dashed p-3 motion-safe:transition-colors motion-safe:duration-(--duration-micro) sm:p-4",
          dragging ? "border-brand-strong bg-brand-soft" : "border-rule-strong bg-mist",
        )}
      >
        {pages.length === 0 ? (
          // Toute la zone ouvre le choix du fichier (sur téléphone : appareil photo ou galerie).
          <button
            type="button"
            onClick={openFiles}
            className="group flex min-h-44 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-md px-4 py-8 text-center"
          >
            <span className="grid size-12 place-items-center rounded-lg bg-paper-raised text-brand-strong elevation-1 motion-safe:transition-transform motion-safe:duration-(--duration-micro) group-hover:-translate-y-0.5">
              <DocumentGlyph className="size-6" />
            </span>
            <span className="text-[0.95rem] text-ink">
              <span className="hidden sm:inline">
                Glissez votre devis ici, ou <span className="font-medium underline decoration-rule-strong underline-offset-4 group-hover:decoration-ink">cliquez pour le choisir</span>.
              </span>
              <span className="sm:hidden">Touchez ici pour prendre la photo ou choisir le fichier.</span>
            </span>
          </button>
        ) : (
          <ul aria-label="Pages du devis" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pages.map((page, index) => (
              <PageThumb key={page.id} page={page} number={index + 1} onRemove={onRemove} />
            ))}
            {canAddPage ? (
              <li className="aspect-[3/4]">
                <button
                  type="button"
                  onClick={openFiles}
                  className="flex size-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-rule-strong bg-paper-raised text-sm font-medium text-ink hover:border-ink"
                >
                  <span aria-hidden className="text-2xl leading-none text-brand-strong">
                    +
                  </span>
                  Ajouter une page
                </button>
              </li>
            ) : null}
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
        <Button size="lg" variant="secondary" onClick={openFiles}>
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
    <li className="relative aspect-[3/4] overflow-hidden rounded-md border border-rule bg-paper-raised">
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
      <span className="absolute left-1.5 top-1.5 rounded-sm bg-paper-raised px-1.5 py-0.5 text-xs font-semibold text-ink elevation-1">
        {page.kind === "pdf" ? "PDF" : `p. ${number}`}
      </span>
      <button
        type="button"
        onClick={() => onRemove(page.id)}
        aria-label={`Retirer ${label}`}
        className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-md border border-rule bg-paper-raised text-ink hover:bg-mist"
      >
        <CloseGlyph />
      </button>
      {page.status === "preparing" ? (
        <span className="absolute inset-x-0 bottom-0 bg-paper-raised py-1 text-center text-xs text-ink-muted">
          Préparation…
        </span>
      ) : null}
      {page.status === "ready" && page.blurry ? (
        <span className="absolute inset-x-0 bottom-0 bg-paper-raised py-1 text-center text-xs text-stamp-orange-strong">
          Floue ?<span className="sr-only"> Cette photo semble floue.</span>
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
