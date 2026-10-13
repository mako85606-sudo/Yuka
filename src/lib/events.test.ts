import { describe, expect, it } from "vitest";
import { parseTrackedEvent } from "./events";

const visit = "5f0c2b8e-9a4d-4d2b-8f61-2c3e4a5b6c7d";

describe("parseTrackedEvent", () => {
  it("accepte un événement de la liste, avec ses seules propriétés permises", () => {
    expect(parseTrackedEvent({ name: "landing_view", visit, props: {} })).toEqual({
      name: "landing_view",
      visit,
      props: {},
    });
    expect(parseTrackedEvent({ name: "landing_view", visit })).toMatchObject({ props: {} });
    expect(
      parseTrackedEvent({ name: "analysis_failed", visit, props: { step: "reading", code: "reading-failed" } }),
    ).toMatchObject({ props: { step: "reading", code: "reading-failed" } });
    expect(
      parseTrackedEvent({
        name: "analysis_completed",
        visit,
        props: { category: "auto", verdict: "alert", saved: true },
      }),
    ).not.toBeNull();
  });

  it("refuse un événement inconnu, une propriété en trop ou mal typée", () => {
    expect(parseTrackedEvent({ name: "page_vue", visit, props: {} })).toBeNull();
    expect(parseTrackedEvent({ name: "landing_view", visit, props: { email: "a@b.fr" } })).toBeNull();
    expect(parseTrackedEvent({ name: "upload_started", visit, props: { pages: "deux", kind: "pdf" } })).toBeNull();
    expect(parseTrackedEvent({ name: "negotiation_copied", visit, props: { version: "fax" } })).toBeNull();
  });

  it("n'accepte ni une visite qui n'est pas un identifiant aléatoire, ni un code qui pourrait porter du texte libre", () => {
    expect(parseTrackedEvent({ name: "landing_view", visit: "jean.dupont@exemple.fr", props: {} })).toBeNull();
    expect(
      parseTrackedEvent({ name: "analysis_failed", visit, props: { step: "reading", code: "Jean Dupont 0612345678" } }),
    ).toBeNull();
    expect(parseTrackedEvent("pas un objet")).toBeNull();
  });
});
