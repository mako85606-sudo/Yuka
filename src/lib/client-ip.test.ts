import { describe, expect, it } from "vitest";
import { clientIp, normalizeIp, proxyHeadersTrusted, trustedProxy, UNKNOWN_CLIENT } from "@/lib/client-ip";

describe("clientIp", () => {
  it("prend l'adresse posée par la plateforme", () => {
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.8, 10.0.0.1" }))).toBe("203.0.113.8");
  });

  it("retombe sur une clé locale sans en-tête", () => {
    expect(clientIp(new Headers())).toBe("local");
  });

  it("ignore des en-têtes qu'aucun relais de confiance n'a posés", () => {
    const spoofed = new Headers({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" });
    expect(clientIp(spoofed, null)).toBe(UNKNOWN_CLIENT);
  });

  it("derrière un relais déclaré, ne croit que l'adresse qu'il a ajoutée", () => {
    // Le visiteur invente « 198.51.100.1 » ; le relais ajoute l'adresse qui l'a vraiment contacté.
    const forged = new Headers({ "x-forwarded-for": "198.51.100.1, 203.0.113.9", "x-real-ip": "198.51.100.1" });
    expect(clientIp(forged, "proxy")).toBe("203.0.113.9");
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.10" }), "proxy")).toBe("203.0.113.10");
  });
});

describe("trustedProxy", () => {
  it("distingue la plateforme d'un relais déclaré", () => {
    expect(trustedProxy({ NODE_ENV: "production", VERCEL: "1" })).toBe("platform");
    expect(trustedProxy({ NODE_ENV: "production", TRUSTED_PROXY: "true" })).toBe("proxy");
    expect(trustedProxy({ NODE_ENV: "production" })).toBeNull();
  });
});

describe("proxyHeadersTrusted", () => {
  it("fait confiance à Vercel, à un relais déclaré et au développement", () => {
    expect(proxyHeadersTrusted({ NODE_ENV: "production", VERCEL: "1" })).toBe(true);
    expect(proxyHeadersTrusted({ NODE_ENV: "production", TRUSTED_PROXY: "true" })).toBe(true);
    expect(proxyHeadersTrusted({ NODE_ENV: "development" })).toBe(true);
  });

  it("se méfie d'un serveur de production quelconque", () => {
    expect(proxyHeadersTrusted({ NODE_ENV: "production" })).toBe(false);
    expect(proxyHeadersTrusted({ NODE_ENV: "production", TRUSTED_PROXY: "false" })).toBe(false);
  });
});

describe("normalizeIp", () => {
  it("garde une IPv4 telle quelle", () => {
    expect(normalizeIp("203.0.113.7")).toBe("203.0.113.7");
  });

  it("ramène une IPv6 à son préfixe /64", () => {
    expect(normalizeIp("2001:db8:85a3:8d3:1319:8a2e:370:7348")).toBe("2001:db8:85a3:8d3::/64");
    expect(normalizeIp("2001:0db8:0000:0042::1")).toBe("2001:db8:0:42::/64");
    expect(normalizeIp("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(normalizeIp("[2001:DB8::1]")).toBe("2001:db8:0:0::/64");
  });

  it("deux adresses du même /64 donnent la même clé", () => {
    expect(normalizeIp("2001:db8:1:2:aaaa::1")).toBe(normalizeIp("2001:db8:1:2:bbbb::2"));
  });

  it("rend une IPv4 encapsulée en IPv4", () => {
    expect(normalizeIp("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });

  it("laisse passer une adresse illisible sans planter", () => {
    expect(normalizeIp("pas:une:ipv6::::")).toBe("pas:une:ipv6::::");
  });
});
