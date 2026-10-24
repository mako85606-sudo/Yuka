/**
 * Les pages /dev (planche de style) ne sont visibles qu'en développement,
 * sauf si ENABLE_DEV_PAGES vaut "true" (une préversion qu'on veut montrer).
 * Un site en ligne, sur Vercel ou ailleurs, les masque.
 */
export function devPagesEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ENABLE_DEV_PAGES === "true" || env.NODE_ENV === "development";
}
