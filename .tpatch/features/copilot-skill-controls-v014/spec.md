# Skill-control reconciliation

## Required behavior

- Retain `server.setSkillEnabled` with `instanceId`, `skillName`, and `enabled`.
- Permit an optional `providerSessionId` to identify a live session owned by
  that instance. Reject absent, closed, foreign or ambiguous ownership.
- Use typed native skill enable/disable operations, then read fresh skill
  inventory and refresh the affected provider workspace snapshot.
- Propagate native failures and report unsupported or unavailable instances
  explicitly. Do not return success for a mutation that did not happen.
- Require provider-management authority at the destination environment,
  both on the server and through the shared client permission guard.
- Remove session ownership when its runtime scope closes.

## Scope

The registry owns instance routing and snapshot publication. The adapter owns
native session routing. WebSocket handling remains a thin service call.
The shared contract applies to local, remote, desktop, web and mobile clients.
No new picker UI, MCP tool, provider credential write, configuration override,
extension hosting, or paid agent turn is required.

## Evidence

Focused deterministic tests cover native owner isolation, fresh enabled
inventory, ambiguity, native failure and closed scopes. Existing RPC
authorization and shared client permission suites cover the protected method.
Affected-package checks must pass before landing.
