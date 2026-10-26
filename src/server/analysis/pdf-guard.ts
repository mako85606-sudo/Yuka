import "server-only";
import zlib from "node:zlib";
import { limits } from "@/config/limits";

/**
 * Garde-fou contre les bombes de décompression PDF, avant que pdf-lib n'ouvre
 * le fichier.
 *
 * En chargeant un PDF, pdf-lib décompresse entièrement, en mémoire, les tables
 * d'objets (`/Type /ObjStm`) et les tables de références (`/Type /XRef`). Un
 * fichier d'1 Mo peut s'y gonfler en plusieurs gigaoctets. On refuse donc le
 * PDF avant pdf-lib si l'un de ces flux dépasse le plafond par flux, ou si leur
 * total dépasse le plafond global.
 *
 * Le contrôle lit les octets bruts, sans rien construire : seuls ces deux
 * types de flux sont décompressés par pdf-lib au chargement, et un objet-flux
 * ne peut jamais vivre dans une table d'objets — le dictionnaire de chaque flux
 * est donc toujours visible en clair. On ne fait confiance ni à `/Length` ni au
 * mot `endstream` (un attaquant peut en glisser dans les données compressées) :
 * on décompresse depuis le début des données jusqu'à la fin du fichier, zlib
 * s'arrêtant de lui-même au bout du flux deflate.
 */

export type PdfGuardResult = { readonly ok: true } | { readonly ok: false; readonly reason: "bomb" | "bad-filter" };

/** Octets « blancs » du PDF (espace, tabulation, saut de ligne, page, nul). */
const WHITESPACE = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
/** Délimiteurs d'un jeton PDF (fin d'un nom). */
const DELIMITERS = new Set([0x28, 0x29, 0x3c, 0x3e, 0x5b, 0x5d, 0x7b, 0x7d, 0x2f, 0x25]);

/** Distance maximale remontée pour retrouver le `<<` d'un dictionnaire de flux. */
const MAX_DICT_BYTES = 128 * 1024;

const STREAM = Buffer.from("stream", "latin1");

/** Un `#XX` dans un nom PDF représente l'octet de code hexadécimal XX. */
function decodeNameEscapes(text: string): string {
  return text.replace(/#([0-9A-Fa-f]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

/** Remonte au `<<` qui ouvre le dictionnaire fermé par le `>>` en `closeAt`. */
function dictStart(bytes: Uint8Array, closeAt: number): number | null {
  let depth = 1;
  let k = closeAt - 1;
  const floor = Math.max(0, closeAt - MAX_DICT_BYTES);
  while (k > floor) {
    if (bytes[k] === 0x3e && bytes[k - 1] === 0x3e) {
      depth += 1;
      k -= 2;
    } else if (bytes[k] === 0x3c && bytes[k - 1] === 0x3c) {
      depth -= 1;
      if (depth === 0) return k - 1;
      k -= 2;
    } else {
      k -= 1;
    }
  }
  return null;
}

/** Nom (sans le `/`) qui suit la clé `key` dans un dictionnaire, ou son état. */
type NameValue =
  | { readonly kind: "name"; readonly name: string }
  | { readonly kind: "array"; readonly names: readonly string[]; readonly onlyNames: boolean }
  | { readonly kind: "other" }
  | { readonly kind: "absent" };

/** Lit un jeton nom `/…` à partir de `from`, et l'indice qui suit. */
function readName(dict: string, from: number): { name: string; end: number } | null {
  if (dict[from] !== "/") return null;
  let end = from + 1;
  while (end < dict.length) {
    const code = dict.charCodeAt(end);
    if (WHITESPACE.has(code) || DELIMITERS.has(code)) break;
    end += 1;
  }
  return { name: dict.slice(from + 1, end), end };
}

function skipWhitespace(dict: string, from: number): number {
  let i = from;
  while (i < dict.length && WHITESPACE.has(dict.charCodeAt(i))) i += 1;
  return i;
}

/** Valeur de la clé `/key` au premier niveau du dictionnaire `dict` (déjà déséchappé). */
function dictValue(dict: string, key: string): NameValue {
  const match = new RegExp(`/${key}(?![A-Za-z0-9])`).exec(dict);
  if (!match) return { kind: "absent" };
  const at = skipWhitespace(dict, match.index + key.length + 1);
  if (dict[at] === "/") {
    const name = readName(dict, at);
    return name ? { kind: "name", name: name.name } : { kind: "other" };
  }
  if (dict[at] === "[") {
    const names: string[] = [];
    let onlyNames = true;
    let i = at + 1;
    while (i < dict.length && dict[i] !== "]") {
      i = skipWhitespace(dict, i);
      if (dict[i] === "]") break;
      if (dict[i] === "/") {
        const name = readName(dict, i);
        if (!name) {
          onlyNames = false;
          break;
        }
        names.push(name.name);
        i = name.end;
      } else {
        // Un élément qui n'est pas un nom (référence indirecte, nombre) : chaîne non reconnue.
        onlyNames = false;
        i += 1;
      }
    }
    return { kind: "array", names, onlyNames };
  }
  // Référence indirecte (`4 0 R`) ou autre : pas un nom direct.
  return { kind: "other" };
}

/** Le `/Filter` du flux est-il absent ou exactement un seul `/FlateDecode` (ou `/Fl`) ? */
function isFlateOnly(filter: NameValue): { ok: boolean; flate: boolean } {
  const flate = (name: string) => name === "FlateDecode" || name === "Fl";
  if (filter.kind === "absent") return { ok: true, flate: false };
  if (filter.kind === "name") return { ok: flate(filter.name), flate: true };
  if (filter.kind === "array") {
    if (!filter.onlyNames || filter.names.length !== 1) return { ok: false, flate: false };
    return { ok: flate(filter.names[0] ?? ""), flate: true };
  }
  // Référence indirecte vers le filtre : on ne peut pas garantir FlateDecode seul.
  return { ok: false, flate: false };
}

/**
 * Décompresse le flux deflate qui commence en `dataStart` et renvoie sa taille,
 * ou `"bomb"` si elle dépasse `perStreamCap`, ou `null` si ce n'est pas un flux
 * deflate exploitable (fausse correspondance dans des données binaires : pdf-lib
 * le refusera lui-même plus tard, inutile de rejeter le fichier ici).
 */
function inflatedSize(bytes: Uint8Array, dataStart: number, perStreamCap: number): number | "bomb" | null {
  try {
    const out = zlib.inflateSync(Buffer.from(bytes.subarray(dataStart)), {
      maxOutputLength: perStreamCap,
      finishFlush: zlib.constants.Z_SYNC_FLUSH,
    });
    return out.length;
  } catch (error) {
    if (error instanceof RangeError) return "bomb"; // ERR_BUFFER_TOO_LARGE : plafond dépassé.
    return null;
  }
}

/** Début des données du flux : après `stream` et son saut de ligne (comme pdf-lib). */
function streamDataStart(bytes: Uint8Array, afterKeyword: number): number {
  let j = afterKeyword;
  if (bytes[j] === 0x20) j += 1; // espace facultatif avant le saut de ligne
  if (bytes[j] === 0x0d && bytes[j + 1] === 0x0a) return j + 2;
  if (bytes[j] === 0x0d || bytes[j] === 0x0a) return j + 1;
  return j;
}

/**
 * Parcourt les dictionnaires de flux du PDF et refuse une bombe de
 * décompression (ou un filtre interdit sur un flux décompressé au chargement).
 */
export function scanPdfForBombs(
  bytes: Uint8Array,
  perStreamCap: number = limits.maxPdfInflatedBytesPerStream,
  totalCap: number = limits.maxPdfInflatedBytesTotal,
): PdfGuardResult {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let total = 0;
  let pos = 0;
  for (;;) {
    const at = buffer.indexOf(STREAM, pos);
    if (at === -1) break;
    pos = at + STREAM.length;

    // Le mot-clé `stream` doit suivre un `>>` (sinon c'est `endstream` ou un
    // `stream` enfoui dans des données) et un saut de ligne.
    let w = at - 1;
    while (w >= 0 && WHITESPACE.has(bytes[w] ?? -1)) w -= 1;
    if (w < 1 || bytes[w] !== 0x3e || bytes[w - 1] !== 0x3e) continue;

    const start = dictStart(bytes, w - 1);
    if (start === null) continue;
    const dict = decodeNameEscapes(Buffer.from(bytes.subarray(start, w + 1)).toString("latin1"));

    const type = dictValue(dict, "Type");
    // pdf-lib ne décompresse au chargement que les /ObjStm et /XRef. Un /Type
    // indirect peut en désigner un : on le traite comme tel, par prudence.
    const decodedAtLoad =
      (type.kind === "name" && (type.name === "ObjStm" || type.name === "XRef")) || type.kind === "other";
    if (!decodedAtLoad) continue;

    const filter = isFlateOnly(dictValue(dict, "Filter"));
    if (!filter.ok) return { ok: false, reason: "bad-filter" };
    if (!filter.flate) continue; // non compressé : pas de gonflement possible.

    const size = inflatedSize(bytes, streamDataStart(bytes, at + STREAM.length), perStreamCap);
    if (size === "bomb") return { ok: false, reason: "bomb" };
    if (size === null) continue;
    total += size;
    if (total > totalCap) return { ok: false, reason: "bomb" };
  }
  return { ok: true };
}
