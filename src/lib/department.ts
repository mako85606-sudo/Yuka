import { DEPARTMENTS } from "@/config/departments";

/**
 * Ramène ce que le modèle a lu à un code de département connu : « 69 »,
 * « 2A », « 974 ». Accepte aussi un code postal complet (« 69003 » → « 69 »)
 * ou un chiffre seul (« 1 » → « 01 »). Tout le reste est écarté : mieux vaut
 * pas de département qu'un faux.
 */
export function normalizeDepartment(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const value = raw.trim().toUpperCase().replace(/\s+/g, "");
  let code: string;
  if (/^\d{5}$/.test(value)) {
    code = value.startsWith("97") ? value.slice(0, 3) : value.slice(0, 2);
  } else if (/^\d$/.test(value)) {
    code = `0${value}`;
  } else {
    code = value;
  }
  return code in DEPARTMENTS ? code : undefined;
}

/** « Rhône (69) », pour l'en-tête du devis reconstruit. */
export function departmentLabel(code: string): string {
  const name = DEPARTMENTS[code];
  return name ? `${name} (${code})` : `Département ${code}`;
}
