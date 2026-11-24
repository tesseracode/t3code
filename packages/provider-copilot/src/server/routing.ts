import type { CopilotClient } from "@github/copilot-sdk";
import type { ModelSelection, SelectProviderOptionDescriptor } from "@t3tools/contracts";
import { getModelSelectionStringOptionValue } from "@t3tools/shared/model";

export type ModelCatalog = Awaited<ReturnType<CopilotClient["rpc"]["models"]["list"]>>;
export type AutoCatalog = NonNullable<ModelCatalog["auto"]>;

export function routingDescriptor(auto: AutoCatalog): SelectProviderOptionDescriptor {
  const seen = new Set<string>();
  const options = auto.tiers.flatMap((tier) => {
    if (
      !tier.id ||
      tier.id.length > 512 ||
      tier.id !== tier.id.trim() ||
      seen.has(tier.id) ||
      tier.status.pickerVisible === false
    )
      return [];
    seen.add(tier.id);
    return [
      {
        id: tier.id,
        label: tier.displayName.trim() || tier.id,
        ...(tier.description.trim() ? { description: tier.description.trim() } : {}),
        ...(!tier.status.enabled
          ? {
              disabledReason:
                tier.status.message?.trim() ||
                tier.status.reason?.trim() ||
                "Unavailable for this account.",
            }
          : {}),
        ...(tier.id === auto.defaultTier && tier.status.enabled ? { isDefault: true } : {}),
      },
    ];
  });
  return {
    id: "autoTier",
    label: "Routing",
    type: "select",
    options,
    ...(options.some((option) => option.id === auto.defaultTier && !option.disabledReason)
      ? { currentValue: auto.defaultTier }
      : {}),
  };
}

export function autoTierForSelection(selection: ModelSelection, auto?: AutoCatalog) {
  const requested = getModelSelectionStringOptionValue(selection, "autoTier");
  if (selection.model !== "auto") {
    if (requested)
      throw new Error("A Copilot routing preference requires the account-advertised auto model.");
    return undefined;
  }
  if (requested === undefined) return undefined;
  if (!auto)
    throw new Error("This Copilot runtime/account does not advertise routing preferences.");
  const id = requested;
  const tier = auto.tiers.find((entry) => entry.id === id);
  if (!tier || tier.id.length > 512 || !tier.status.enabled || tier.status.pickerVisible === false)
    throw new Error(
      tier?.status.message ||
        tier?.status.reason ||
        "The requested Copilot routing preference is unavailable for this account.",
    );
  return requested;
}
