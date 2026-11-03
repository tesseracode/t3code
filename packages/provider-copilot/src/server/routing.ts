import type { CopilotClient } from "@github/copilot-sdk";
import type {
  ModelSelection,
  ProviderOptionChoice,
  SelectProviderOptionDescriptor,
} from "@t3tools/contracts";
import { getProviderOptionStatedValue } from "@t3tools/shared/model";

export type ModelCatalog = Awaited<ReturnType<CopilotClient["rpc"]["models"]["list"]>>;
export type AutoCatalog = NonNullable<ModelCatalog["auto"]>;

export function routingDescriptor(auto: AutoCatalog): SelectProviderOptionDescriptor {
  const seen = new Set<string>();
  const options: Array<ProviderOptionChoice> = auto.tiers.flatMap((tier) => {
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
  let resetId = "provider-default";
  while (seen.has(resetId)) resetId = `_${resetId}`;
  options.push({
    id: resetId,
    label: "Provider default",
    description: "Explicitly clear the saved routing preference.",
    isReset: true,
  });
  return {
    id: "autoTier",
    label: auto.tiers.some((tier) => tier.type === "fusion") ? "Fusion effort" : "Routing",
    type: "select",
    options,
    ...(options.some((option) => option.id === auto.defaultTier && !option.disabledReason)
      ? { currentValue: auto.defaultTier }
      : {}),
  };
}

export function autoTierForSelection(selection: ModelSelection, auto?: AutoCatalog) {
  const requested = getProviderOptionStatedValue("autoTier", selection);
  if (selection.model !== "auto") {
    if (requested !== undefined)
      throw new Error("A Copilot routing preference requires the account-advertised auto model.");
    return undefined;
  }
  if (requested === undefined) return undefined;
  if (requested === false) return null;
  if (typeof requested !== "string")
    throw new Error("A Copilot routing preference must be an advertised tier or provider default.");
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
