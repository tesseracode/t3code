import { describe, expect, it } from "vite-plus/test";
import type { SelectProviderOptionDescriptor } from "@t3tools/contracts";
import { getPromptControlledTraits, getTraitSelectChange } from "./modelTraits.ts";

describe("Fusion effort changes", () => {
  it("dispatches advertised IDs and explicit reset without changing the prompt", () => {
    const descriptor: SelectProviderOptionDescriptor = {
      id: "autoTier",
      label: "Fusion effort",
      type: "select",
      options: [
        { id: "opaque-high", label: "High" },
        { id: "disabled", label: "Max", disabledReason: "Account policy" },
        { id: "reset", label: "Provider default", isReset: true },
      ],
      currentValue: "opaque-high",
    };
    const selected = {
      ...getPromptControlledTraits([descriptor], "A bounded demo"),
      descriptors: [descriptor],
    };
    expect(getTraitSelectChange(selected, descriptor, "A bounded demo", "reset")).toEqual({
      prompt: "A bounded demo",
      modelOptions: [{ id: "autoTier", value: false }],
    });
    expect(getTraitSelectChange(selected, descriptor, "A bounded demo", "opaque-high")).toEqual({
      prompt: "A bounded demo",
      modelOptions: [{ id: "autoTier", value: "opaque-high" }],
    });
    expect(getTraitSelectChange(selected, descriptor, "A bounded demo", "disabled")).toBeNull();
    expect(getTraitSelectChange(selected, descriptor, "A bounded demo", "high")).toBeNull();
  });
});
