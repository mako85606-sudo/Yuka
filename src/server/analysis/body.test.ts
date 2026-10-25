import { describe, expect, it } from "vitest";
import { readBodyCapped } from "@/server/analysis/body";

function chunked(sizes: readonly number[]): Request {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const size of sizes) controller.enqueue(new Uint8Array(size));
      controller.close();
    },
  });
  return new Request("http://localhost/api", { method: "POST", body: stream, duplex: "half" } as RequestInit);
}

describe("readBodyCapped", () => {
  it("lit un corps sous la limite", async () => {
    const result = await readBodyCapped(new Request("http://localhost/api", { method: "POST", body: "bonjour" }), 100);
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(new TextDecoder().decode(result.bytes)).toBe("bonjour");
  });

  it("s'arrête dès que la limite est dépassée, même sans taille annoncée", async () => {
    expect(await readBodyCapped(chunked([60, 60, 60]), 100)).toEqual({ ok: false, reason: "too-large" });
  });

  it("refuse tout de suite une taille annoncée trop grande", async () => {
    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-length": "5000" },
      body: "x",
    });
    expect(await readBodyCapped(request, 100)).toEqual({ ok: false, reason: "too-large" });
  });
});
