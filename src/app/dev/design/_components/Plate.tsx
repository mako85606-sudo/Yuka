"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface PlateProps {
  readonly title: string;
  readonly description?: ReactNode;
  /** Boutons propres à la planche, à côté de « Rejouer ». */
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

/** Une planche : un titre, une explication, et un bouton pour rejouer. */
export function Plate({ title, description, actions, children }: PlateProps) {
  const [run, setRun] = useState(0);

  return (
    <section className="border-t border-rule pt-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-prose">
          <h3 className="font-display text-[1.85rem] leading-tight text-ink">{title}</h3>
          {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {actions}
          <Button variant="secondary" size="sm" onClick={() => setRun((value) => value + 1)}>
            Rejouer
          </Button>
        </div>
      </div>
      <div key={run} className="mt-8">
        {children}
      </div>
    </section>
  );
}
