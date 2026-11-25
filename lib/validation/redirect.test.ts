import { describe, expect, it } from "vitest";

import { DEFAULT_REDIRECT_PATH, safeRedirectPath } from "@/lib/validation/redirect";

/** Open redirect su /auth/callback (Sprint 8, intervento 4). */

describe("safeRedirectPath: percorsi interni", () => {
  it.each([
    "/",
    "/subscriptions",
    "/shared/abc123",
    "/invite?token=xyz",
    "/settings#profile",
    "/a/b/c?x=1&y=2",
  ])("accetta %s", (path) => {
    expect(safeRedirectPath(path)).toBe(path);
  });

  it("non altera un percorso valido (nessun trim né normalizzazione)", () => {
    expect(safeRedirectPath("/Dashboard/../x")).toBe("/Dashboard/../x");
  });
});

describe("safeRedirectPath: tentativi di open redirect", () => {
  it("rifiuta @evil.com (userinfo dopo la concatenazione con l'origine)", () => {
    expect(safeRedirectPath("@evil.com")).toBe("/");
  });

  it("rifiuta @evil.com con percorso", () => {
    expect(safeRedirectPath("@evil.com/path")).toBe("/");
  });

  it("rifiuta //evil.com (protocol-relative)", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/");
  });

  it("rifiuta /\\evil.com (il browser tratta \\ come /)", () => {
    expect(safeRedirectPath("/\\evil.com")).toBe("/");
  });

  it("rifiuta /// e //\\", () => {
    expect(safeRedirectPath("///evil.com")).toBe("/");
    expect(safeRedirectPath("//\\evil.com")).toBe("/");
  });

  it.each([
    "https://evil.com",
    "http://evil.com/x",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "evil.com",
    "subscriptions",
    "\\evil.com",
  ])("rifiuta %s (non è un percorso con / iniziale)", (value) => {
    expect(safeRedirectPath(value)).toBe("/");
  });

  it("rifiuta i caratteri di controllo che il browser scarta dall'URL", () => {
    expect(safeRedirectPath("/\t/evil.com")).toBe("/");
    expect(safeRedirectPath("/\n/evil.com")).toBe("/");
    expect(safeRedirectPath("/\r/evil.com")).toBe("/");
    expect(safeRedirectPath("/\0/evil.com")).toBe("/");
  });

  it("l'URL risultante resta sempre sull'origine del sito", () => {
    const origin = "https://subsync.example";
    for (const attack of ["@evil.com", "//evil.com", "/\\evil.com", "https://evil.com"]) {
      const url = new URL(`${origin}${safeRedirectPath(attack)}`);
      expect(url.origin).toBe(origin);
    }
  });
});

describe("safeRedirectPath: assenza di valore", () => {
  it("stringa vuota → /", () => {
    expect(safeRedirectPath("")).toBe("/");
  });

  it("null → /", () => {
    expect(safeRedirectPath(null)).toBe("/");
  });

  it("undefined → /", () => {
    expect(safeRedirectPath(undefined)).toBe("/");
  });

  it("la destinazione di ripiego è la root", () => {
    expect(DEFAULT_REDIRECT_PATH).toBe("/");
  });
});
