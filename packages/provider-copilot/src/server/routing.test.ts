import { assert, describe, it } from "@effect/vitest";
import { ProviderInstanceId } from "@t3tools/contracts";
import { autoTierForSelection, routingDescriptor, type AutoCatalog } from "./routing.ts";

const instanceId = ProviderInstanceId.make("account-a");
export const autoCatalog: AutoCatalog = {
  defaultTier: "standard",
  tiers: [
    {
      id: "standard",
      displayName: "Standard",
      description: "",
      type: "auto",
      status: { enabled: true },
    },
    {
      id: "fuse@2026:opaque",
      displayName: "Fusion",
      description: "Account routing",
      type: "fusion",
      fusionTier: "do-not-translate",
      status: { enabled: true },
    },
    {
      id: "blocked",
      displayName: "Unavailable",
      description: "",
      type: "fusion",
      status: { enabled: false, message: "Your account policy disables this." },
    },
    {
      id: "hidden",
      displayName: "Hidden",
      description: "",
      type: "fusion",
      status: { enabled: true, pickerVisible: false },
    },
  ],
};

describe("account-advertised routing", () => {
  it("uses opaque IDs without aliases, honors visibility, and exposes disabled reasons", () => {
    const descriptor = routingDescriptor(autoCatalog);
    assert.deepEqual(
      descriptor.options.map((option) => option.id),
      ["standard", "fuse@2026:opaque", "blocked"],
    );
    assert.equal(descriptor.options[2]?.disabledReason, "Your account policy disables this.");
    assert.equal(descriptor.currentValue, "standard");
    const selection = {
      instanceId,
      model: "auto",
      options: [{ id: "autoTier", value: "fuse@2026:opaque" }],
    };
    assert.equal(autoTierForSelection(selection, autoCatalog), "fuse@2026:opaque");
    assert.isUndefined(autoTierForSelection({ instanceId, model: "auto" }, autoCatalog));
    assert.isUndefined(autoTierForSelection({ instanceId, model: "explicit" }));
  });

  it("refuses unknown, hidden, policy-disabled and unsupported destination choices", () => {
    for (const id of ["blocked", "hidden", "unknown"])
      assert.throws(() =>
        autoTierForSelection(
          {
            instanceId,
            model: "auto",
            options: [{ id: "autoTier", value: id }],
          },
          autoCatalog,
        ),
      );
    assert.throws(() => autoTierForSelection({ instanceId, model: "auto" }), /does not advertise/);
    assert.throws(
      () =>
        autoTierForSelection(
          {
            instanceId,
            model: "explicit",
            options: [{ id: "autoTier", value: "standard" }],
          },
          autoCatalog,
        ),
      /requires/,
    );
  });
});
