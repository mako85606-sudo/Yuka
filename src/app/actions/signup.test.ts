import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NamedQuota } from "@/server/rate-limit";

const quota = vi.hoisted(() => ({ state: "allowed" as NamedQuota }));
const saveSignup = vi.hoisted(() => vi.fn(async () => ({ ok: true }) as const));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.8" }) }));
vi.mock("@/server/rate-limit", () => ({ takeNamedQuota: vi.fn(async () => quota.state) }));
vi.mock("@/server/signups", () => ({ saveSignup }));

const { subscribeToNews } = await import("./signup");

function form(email: string): FormData {
  const data = new FormData();
  data.set("email", email);
  data.set("source", "landing");
  return data;
}

describe("subscribeToNews", () => {
  beforeEach(() => {
    quota.state = "allowed";
    saveSignup.mockClear();
  });

  it("enregistre l'adresse", async () => {
    expect((await subscribeToNews({ status: "idle" }, form("camille@exemple.fr"))).status).toBe("success");
    expect(saveSignup).toHaveBeenCalledWith({ email: "camille@exemple.fr", source: "landing" });
  });

  it("au-delà du plafond, même réponse, rien d'enregistré", async () => {
    quota.state = "refused";
    expect((await subscribeToNews({ status: "idle" }, form("camille@exemple.fr"))).status).toBe("success");
    expect(saveSignup).not.toHaveBeenCalled();
  });

  it("ne prétend jamais avoir gardé une adresse sans compteur (pas de base ni de secret)", async () => {
    quota.state = "unavailable";
    expect((await subscribeToNews({ status: "idle" }, form("camille@exemple.fr"))).status).toBe("unavailable");
    expect(saveSignup).not.toHaveBeenCalled();
  });
});
