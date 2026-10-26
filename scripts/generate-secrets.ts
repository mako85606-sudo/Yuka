/**
 * Tire au hasard les secrets à coller dans les variables d'environnement de
 * Vercel (Settings → Environment Variables), pour la mise en ligne :
 *
 *   npm run secrets
 *
 * Rien n'est enregistré : les valeurs s'affichent une fois, à copier tout de
 * suite. Une nouvelle commande donne de nouvelles valeurs.
 */
import { randomBytes } from "node:crypto";

/** Lettres et chiffres sans caractères ambigus (0/O, 1/l/I), faciles à recopier. */
const READABLE = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function readable(length: number): string {
  // Rejet des octets du dernier tour incomplet : chaque caractère est équiprobable.
  const limit = 256 - (256 % READABLE.length);
  let out = "";
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < limit && out.length < length) out += READABLE[byte % READABLE.length];
    }
  }
  return out;
}

const secrets = [
  {
    name: "IP_HASH_SECRET",
    value: randomBytes(32).toString("hex"),
    note: "chiffre les adresses IP des limites quotidiennes",
  },
  {
    name: "CRON_SECRET",
    value: randomBytes(32).toString("hex"),
    note: "protège le nettoyage de nuit ; Vercel l'envoie tout seul",
  },
  {
    name: "ADMIN_PASSWORD",
    value: `${readable(6)}-${readable(6)}-${readable(6)}-${readable(6)}`,
    note: "mot de passe de /admin : gardez-le dans votre gestionnaire de mots de passe",
  },
];

console.log("\nSecrets à coller dans Vercel (Settings → Environment Variables → Production) :\n");
for (const secret of secrets) {
  console.log(`# ${secret.note}`);
  console.log(`${secret.name}=${secret.value}\n`);
}
console.log("Ne les envoyez à personne et ne les collez dans aucun message.\n");
