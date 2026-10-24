import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NamedQuota } from "@/server/rate-limit";

const quota = vi.hoisted(() => ({ state: "allowed" as NamedQuota }));
const removed = vi.hoisted(() => ({ result: { ok: true } as { ok: true } | { ok: false; reason: "error" } }));
const removeSignup = vi.hoisted(() => vi.fn(async () => removed.result));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }) }));
vi.mock("@/server/rate-limit", () => ({ takeNamedQuota: vi.fn(async () => quota.state) }));
vi.mock("@/server/signups", () => ({ removeSignup }));

const { unsubscribeFromNews } = await import("./unsubscribe");

function form(email: string, trap = ""): FormData {
  const data = new FormData();
  data.set("email", email);
  data.set("site_web", trap);
  return data;
}

describe("unsubscribeFromNews", () => {
  beforeEach(() => {
    quota.state = "allowed";
    removed.result = { ok: true };
    removeSignup.mockClear();
  });

  it("retire l'adresse, normalisée, et répond sans dire si elle était inscrite", async () => {
    const state = await unsubscribeFromNews({ status: "idle" }, form("  Camille@Exemple.fr "));
    expect(removeSignup).toHaveBeenCalledWith("camille@exemple.fr");
    expect(state.status).toBe("success");
    expect(state.status === "success" && state.message).toMatch(/si cette adresse était inscrite/);
  });

  it("refuse une adresse invalide sans rien toucher", async () => {
    const state = await unsubscribeFromNews({ status: "idle" }, form("pas-une-adresse"));
    expect(state.status).toBe("invalid");
    expect(removeSignup).not.toHaveBeenCalled();
  });

  it("ne fait rien pour un robot, avec la même réponse", async () => {
    const state = await unsubscribeFromNews({ status: "idle" }, form("camille@exemple.fr", "http://spam"));
    expect(state.status).toBe("success");
    expect(removeSignup).not.toHaveBeenCalled();
  });

  it("retire quand même sans compteur : sans base, il n'y a rien à retirer", async () => {
    quota.state = "unavailable";
    expect((await unsubscribeFromNews({ status: "idle" }, form("camille@exemple.fr"))).status).toBe("success");
    expect(removeSignup).toHaveBeenCalledOnce();
  });

  it("dit honnêtement quand la demande n'a pas pu être traitée", async () => {
    quota.state = "refused";
    expect((await unsubscribeFromNews({ status: "idle" }, form("camille@exemple.fr"))).status).toBe("unavailable");
    expect(removeSignup).not.toHaveBeenCalled();

    quota.state = "allowed";
    removed.result = { ok: false, reason: "error" };
    expect((await unsubscribeFromNews({ status: "idle" }, form("camille@exemple.fr"))).status).toBe("unavailable");
  });
});
