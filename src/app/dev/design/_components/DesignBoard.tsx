"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MotionPreferences } from "@/components/motion/MotionPreferences";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type ThemeChoice = "system" | "light" | "dark";
type MotionChoice = "system" | "reduced";

const THEMES: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "Système" },
  { value: "light", label: "Clair" },
  { value: "dark", label: "Nuit" },
];

const MOTIONS: { value: MotionChoice; label: string }[] = [
  { value: "system", label: "Système" },
  { value: "reduced", label: "Réduit" },
];

/**
 * Cadre de la planche de style : choix du thème et du mouvement, et
 * « Tout rejouer » qui remonte toutes les planches.
 */
export function DesignBoard({ children }: { readonly children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeChoice>("system");
  const [motionChoice, setMotionChoice] = useState<MotionChoice>("system");
  const [run, setRun] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    return () => {
      delete root.dataset.theme;
    };
  }, [theme]);

  return (
    <MotionPreferences forceReduced={motionChoice === "reduced"}>
      <div className="relative z-30 border-b border-rule bg-paper sm:sticky sm:top-0">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-8">
          <Segmented label="Thème" options={THEMES} value={theme} onChange={setTheme} />
          <Segmented
            label="Mouvement"
            options={MOTIONS}
            value={motionChoice}
            onChange={setMotionChoice}
          />
          <Button size="sm" className="ml-auto" onClick={() => setRun((value) => value + 1)}>
            Tout rejouer
          </Button>
        </div>
      </div>
      <div key={`${run}-${motionChoice}`}>{children}</div>
    </MotionPreferences>
  );
}

interface SegmentedProps<T extends string> {
  readonly label: string;
  readonly options: readonly { value: T; label: string }[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <span className="font-mono text-label uppercase text-ink-muted">{label}</span>
      <div className="flex rounded-[6px] border border-rule-strong p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-7 rounded-[4px] px-2.5 text-sm",
              option.value === value ? "bg-ink text-paper-raised" : "text-ink hover:bg-paper-raised",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
