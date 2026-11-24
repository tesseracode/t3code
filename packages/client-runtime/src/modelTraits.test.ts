import type { ProviderOptionDescriptor, SelectProviderOptionDescriptor } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  buildTraitsTriggerDisplay,
  getDescriptorStringValue,
  getPromptControlledTraits,
  getTraitSelectChange,
} from "./modelTraits.ts";

describe("buildTraitsTriggerDisplay", () => {
  it.each([
    { currentValue: undefined, defaultValue: undefined, value: null, label: "Thinking" },
    { currentValue: undefined, defaultValue: "high", value: "high", label: "High" },
    { currentValue: "low", defaultValue: undefined, value: "low", label: "Low" },
    { currentValue: "max", defaultValue: "high", value: "max", label: "Max" },
    { id: "effort", currentValue: undefined, defaultValue: undefined, value: null, label: "" },
  ])("labels Pi thinking without inventing a selection: $label ($value)", (input) => {
    const descriptor: Extract<ProviderOptionDescriptor, { type: "select" }> = {
      id: input.id ?? "thinking",
      label: "Thinking",
      type: "select",
      options: ["low", "high", "max"].map((id) => ({
        id,
        label: id[0]!.toUpperCase() + id.slice(1),
        ...(id === input.defaultValue ? { isDefault: true } : {}),
      })),
      ...(input.currentValue ? { currentValue: input.currentValue } : {}),
    };

    expect(
      buildTraitsTriggerDisplay({
        descriptors: [descriptor],
        primarySelectDescriptorId: descriptor.id,
        ultrathinkPromptControlled: false,
      }).label,
    ).toBe(input.label);
    expect(getDescriptorStringValue(descriptor)).toBe(input.value);
  });
});

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
