import { describe, it, expect } from "vitest";
import {
  revalidateTag,
  isValidWebhookUrl,
  signPayload,
  verifySignature,
} from "./webhook";

describe("revalidateTag", () => {
  it("skládá tag ze slugu a modulu", () => {
    expect(revalidateTag("bistro", "menu")).toBe("gastro:bistro:menu");
  });
});

describe("isValidWebhookUrl", () => {
  it("https je vždy v pořádku", () => {
    expect(isValidWebhookUrl("https://klient.cz/api/revalidate", true)).toBe(
      true
    );
    expect(isValidWebhookUrl("https://klient.cz/api/revalidate", false)).toBe(
      true
    );
  });

  it("http v produkci je zakázané", () => {
    expect(isValidWebhookUrl("http://klient.cz/api/revalidate", true)).toBe(
      false
    );
  });

  it("http na localhost v devu je povolené", () => {
    expect(isValidWebhookUrl("http://localhost:3000/api/revalidate", false)).toBe(
      true
    );
    expect(isValidWebhookUrl("http://127.0.0.1:3000/api/revalidate", false)).toBe(
      true
    );
  });

  it("http na cizí doméně v devu je zakázané", () => {
    expect(isValidWebhookUrl("http://evil.com/api/revalidate", false)).toBe(
      false
    );
  });

  it("nevalidní/nebezpečná schémata jsou zakázaná", () => {
    expect(isValidWebhookUrl("ftp://klient.cz/x", false)).toBe(false);
    expect(isValidWebhookUrl("javascript:alert(1)", false)).toBe(false);
    expect(isValidWebhookUrl("not a url", false)).toBe(false);
  });
});

describe("signPayload / verifySignature", () => {
  const secret = "s3cret";
  const ts = 1_700_000_000;
  const body = JSON.stringify({ site: "bistro", module: "menu" });

  it("round-trip: platný podpis projde", () => {
    const sig = signPayload(secret, ts, body);
    expect(verifySignature(secret, ts, body, sig, ts)).toBe(true);
  });

  it("změněné tělo podpis zneplatní", () => {
    const sig = signPayload(secret, ts, body);
    expect(verifySignature(secret, ts, body + "x", sig, ts)).toBe(false);
  });

  it("jiný secret podpis zneplatní", () => {
    const sig = signPayload(secret, ts, body);
    expect(verifySignature("jiny-secret", ts, body, sig, ts)).toBe(false);
  });

  it("změněný timestamp podpis zneplatní", () => {
    const sig = signPayload(secret, ts, body);
    expect(verifySignature(secret, ts + 1, body, sig, ts + 1)).toBe(false);
  });

  it("starý timestamp (mimo toleranci) je odmítnut i se správným podpisem", () => {
    const sig = signPayload(secret, ts, body);
    expect(verifySignature(secret, ts, body, sig, ts + 301)).toBe(false);
  });

  it("podpis těsně uvnitř tolerance projde", () => {
    const sig = signPayload(secret, ts, body);
    expect(verifySignature(secret, ts, body, sig, ts + 300)).toBe(true);
  });

  it("podpis různé délky je odmítnut (ne crash)", () => {
    const sig = signPayload(secret, ts, body);
    expect(verifySignature(secret, ts, body, sig + "ab", ts)).toBe(false);
    expect(verifySignature(secret, ts, body, "sha256=abcd", ts)).toBe(false);
  });
});
