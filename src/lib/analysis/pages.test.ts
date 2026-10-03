import { describe, expect, it } from "vitest";
import { mergePages, pageKind, type PageKind } from "@/lib/analysis/pages";

const photo = (id: string) => ({ id, kind: "image" as PageKind });
const pdf = (id: string) => ({ id, kind: "pdf" as PageKind });
const ids = (pages: readonly { id: string }[]) => pages.map((page) => page.id);

describe("pageKind", () => {
  it("reconnaît photos et PDF, même sans type annoncé", () => {
    expect(pageKind({ name: "devis.pdf", type: "application/pdf" })).toBe("pdf");
    expect(pageKind({ name: "DEVIS.PDF", type: "" })).toBe("pdf");
    expect(pageKind({ name: "page.jpg", type: "image/jpeg" })).toBe("image");
    expect(pageKind({ name: "IMG_2041.HEIC", type: "" })).toBe("image");
    expect(pageKind({ name: "notes.docx", type: "application/vnd.openxmlformats" })).toBeNull();
  });
});

describe("mergePages", () => {
  it("ajoute des photos jusqu'à la limite", () => {
    const result = mergePages([photo("a")], [photo("b"), photo("c")], 4);
    expect(ids(result.pages)).toEqual(["a", "b", "c"]);
    expect(result.notice).toBeNull();
  });

  it("refuse les photos en trop, et le dit", () => {
    const result = mergePages([photo("a"), photo("b"), photo("c")], [photo("d"), photo("e")], 4);
    expect(ids(result.pages)).toEqual(["a", "b", "c", "d"]);
    expect(result.notice).toContain("4 photos au maximum");
  });

  it("garde un seul PDF, qui remplace tout le reste", () => {
    const result = mergePages([photo("a")], [pdf("p")], 4);
    expect(ids(result.pages)).toEqual(["p"]);
    expect(result.notice).toContain("remplace");
    expect(ids(mergePages([], [pdf("p"), pdf("q")], 4).pages)).toEqual(["p"]);
  });

  it("remplace un PDF par des photos", () => {
    const result = mergePages([pdf("p")], [photo("a")], 4);
    expect(ids(result.pages)).toEqual(["a"]);
    expect(result.notice).toContain("remplacent le PDF");
  });

  it("signale un format non pris en charge sans perdre les pages déjà là", () => {
    const result = mergePages([photo("a")], [null], 4);
    expect(ids(result.pages)).toEqual(["a"]);
    expect(result.notice).toContain("pas pris en charge");
  });
});
