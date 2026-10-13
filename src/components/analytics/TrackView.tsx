"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

/** Compte la vue d'une page, une seule fois par montage (même en développement, où React monte deux fois). */
export function TrackView({ event }: { readonly event: "landing_view" | "share_page_view" }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(event);
  }, [event]);
  return null;
}
