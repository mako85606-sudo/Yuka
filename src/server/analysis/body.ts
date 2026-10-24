import "server-only";

/**
 * Lit le corps d'une requête sans jamais garder plus de `maxBytes` en mémoire :
 * au-delà, la lecture s'arrête et la requête est refusée. Utile quand la
 * taille annoncée (`Content-Length`) manque ou ment : un envoi « par morceaux »
 * ne peut pas remplir la mémoire du serveur.
 */
export async function readBodyCapped(
  request: Request,
  maxBytes: number,
): Promise<{ readonly ok: true; readonly bytes: Uint8Array<ArrayBuffer> } | { readonly ok: false; readonly reason: "too-large" | "invalid" }> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, reason: "too-large" };
  if (!request.body) return { ok: true, bytes: new Uint8Array(0) };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, reason: "too-large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "invalid" };
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes };
}
