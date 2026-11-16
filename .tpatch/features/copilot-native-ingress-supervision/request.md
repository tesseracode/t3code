# Feature Request: Prevent a failed Copilot native event consumer from leaving an open public event stream and blocked drain receipts. Reproduce the failure during interruption with a rejected routing-state read before native idle, then propagate a typed fatal stream error and the original cause without retry, prompt resend or native replacement. Preserve intentional scope shutdown, native identity, late event ownership, permissions and background-work semantics. This is a causal injected-failure mechanism relevant to #42, not proof of that reported incident.

**Slug**: `copilot-native-ingress-supervision`
**Created**: 2026-11-06T08:41:18Z

## Description

Prevent a failed Copilot native event consumer from leaving an open public event stream and blocked drain receipts. Reproduce the failure during interruption with a rejected routing-state read before native idle, then propagate a typed fatal stream error and the original cause without retry, prompt resend or native replacement. Preserve intentional scope shutdown, native identity, late event ownership, permissions and background-work semantics. This is a causal injected-failure mechanism relevant to #42, not proof of that reported incident.
