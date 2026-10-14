/**
 * Les pages /dev (planche de style) sont visibles en local et sur les
 * déploiements de prévisualisation Vercel, mais pas en production, sauf si
 * ENABLE_DEV_PAGES vaut "true".
 */
export function devPagesEnabled(): boolean {
  if (process.env.ENABLE_DEV_PAGES === "true") return true;
  return process.env.VERCEL_ENV !== "production";
}
