import { afterEach, describe, expect, it, vi } from "vite-plus/test";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("mobile Intl bootstrap", () => {
  it("loads contracts without native Segmenter and preserves grapheme validation", async () => {
    vi.resetModules();
    const runtimeIntl = Object.create(Intl);
    Object.defineProperty(runtimeIntl, "Segmenter", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    vi.stubGlobal("Intl", runtimeIntl);
    await import("./polyfills");
    const [{ ProjectMonogramText }, Schema] = await Promise.all([
      import("@t3tools/contracts"),
      import("effect/Schema"),
    ]);
    const decode = Schema.decodeUnknownSync(ProjectMonogramText);
    expect(decode("a\u0301b")).toBe("a\u0301b");
    expect(decode("AB")).toBe("AB");
    expect(() => decode("ABC")).toThrow();
    expect(() => decode("A B")).toThrow();
  });

  it("preserves a supported native Segmenter", async () => {
    vi.resetModules();
    const native = Intl.Segmenter;
    await import("./polyfills");
    expect(Intl.Segmenter).toBe(native);
  });
});
