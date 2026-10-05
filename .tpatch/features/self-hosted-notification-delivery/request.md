# Feature Request: Evaluate optional, self-hostable notification delivery

**Slug**: `self-hosted-notification-delivery`
**Created**: 2026-10-05T06:37:08Z

## Description

Evaluate how to enable useful notifications across web, desktop, iOS, and
Android without making a hosted notification subscription or cloud control
plane mandatory. Prefer open-source, self-hostable software and reuse existing
hardware where practical. Compare the existing T3 Connect implementation,
external self-hosted services, a small custom delivery integration, and explicitly
leaving mobile background notifications disabled.

## Status, rationale, and related work

Requested only: no delivery architecture is selected and no implementation,
deployment, purchase, signing change, or notification permission change is
authorized. Keep the lifecycle at `requested` until the user approves analysis.

Branch `request/self-hosted-notification-delivery` starts from published fork
source `bc9eeb9a6f5e3fe2e6d58d9c1b14d5ed93d6c2be`.
Tracking issue: #25. Canonical backlog: #1. Related item #15 (MOB-01) already covers mobile attention
semantics and optional relay mapping. This request owns the separate
custom-signed/self-hosted delivery and rollout decision called out by #15;
it must not duplicate its attention projection or taxonomy.

Direct mobile use is working, but working chat connectivity is not proof of
background notification delivery. The user prefers recurring spending to be
limited to unavoidable platform requirements, rather than subscribing to a
notification SaaS. Report hosting, domain, electricity, backup, and maintenance
costs separately; do not promise that self-hosting is cost-free.

## Current fork findings

- Web/desktop delivery is client-local and already implemented. See
  `docs/user/notifications.md`, `apps/web/src/components/ThreadNotificationCoordinator.tsx`,
  and `apps/web/src/components/settings/NotificationSettings.tsx`.
  It requires an open, connected client and system permission. Browser system
  alerts need a secure context; a private HTTP NetBird address does not become
  HTTPS merely because its network transport is encrypted. Client categories,
  mutes, quiet hours, and focused-thread suppression remain in force.
- This fork has no Web Push subscription/sender and service-worker delivery
  pipeline. Installing the T3 website on the Home Screen alone does not add it.
- Existing native background delivery is environment activity publication to
  T3 Connect, followed by direct APNs or FCM sending. It requires device/account
  registration, linked environments, and enabled host activity publication.
  Direct pairing and NetBird alone do not establish that path.
- The stock relay deployment uses Cloudflare Workers/queues, PostgreSQL through
  PlanetScale/Hyperdrive, Clerk, and Axiom. Distinguish protocol necessities from
  the repository's chosen deployment stack. Public upstream app configuration
  does not grant access to upstream administration or signing credentials.
- Current private mobile builds have no cloud public configuration. The iOS
  personal-team build lacks push entitlements and explicitly disables push;
  Android has not been provisioned with the Firebase app configuration.
  See `apps/mobile/src/features/agent-awareness/capabilities.ts`,
  `apps/mobile/src/features/cloud/publicConfig.ts`, and
  `docs/operations/android-notifications.md`.
- The fork's web/desktop alerts use static text. Existing mobile activity
  publication can include project/thread titles. Do not silently inherit that
  disclosure when selecting an external sender.

## Alternatives to compare

| Option                                                          | Value                                                                                         | Questions and constraints                                                                                                                                                                                                                            |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing T3 Connect, including self-operated relay              | Reuses upstream registration, APNs/FCM delivery, deep links, and activity UX                  | Enumerate actual deployment/auth dependencies, costs, custom bundle/Firebase compatibility, and maintenance burden; do not assume the stock deployment is a lightweight standalone service.                                                          |
| Self-hosted ntfy with companion app or PWA                      | Reuses an established open-source notification server and client ecosystem                    | Requires a T3 activity-to-notification integration. Separate the native iOS upstream wake-up dependency from ntfy PWA Web Push. Validate privacy, authenticated subscriptions, tap routing, private-network reachability, and locked-phone delivery. |
| Gotify or another justified Android-oriented self-hosted option | Simple server and Android WebSocket receiver                                                  | Assess battery/lifecycle behavior and network loss. Gotify's documented first-party clients do not provide a native iOS solution; do not present it as complete cross-platform coverage.                                                             |
| Minimal notification-only integration for our native apps       | Can reuse T3's activity projection and APNs/FCM senders while retaining NetBird direct access | Registration, authorization, token rotation, retries, deduplication, and opt-out still need a supported design. Avoid building a new orchestrator or a large parallel framework.                                                                     |
| Native mobile push disabled                                     | Lowest maintenance, no push credentials or extra infrastructure                               | Preserve direct mobile chat and existing web/desktop alerts. Make the lack of background delivery explicit rather than suggesting an ineffective Settings toggle.                                                                                    |

## Preliminary external evidence

Research checked on 2026-10-05 UTC; verify current versions and terms again
before rollout.

- ntfy supports self-hosted SQLite or PostgreSQL storage. Its native iOS instant
  notification path forwards a wake-up request to an APNs/Firebase-connected
  upstream (normally ntfy.sh); without it, notifications can be substantially
  delayed. The documented forwarded payload uses a message ID and hashed topic
  URL, not the original message text, but this is still an external dependency.
  Building an independently signed iOS client changes the provisioning and
  sender requirements; self-hosting the server alone does not.
  [Pinned ntfy configuration](https://github.com/binwiederhier/ntfy/blob/8b95a3bbfd42d40a16293b6e2079b104bf6eb68d/docs/config.md#ios-instant-notifications).
- ntfy also supports Web Push with VAPID keys, subscription storage, and trusted
  HTTPS. Its PWA supports iOS 16.4+ Home Screen installation. This is a credible
  separate notification frontend to evaluate, not evidence that T3 already has
  Web Push or that private-network/background operation has been verified.
  [Pinned ntfy PWA documentation](https://github.com/binwiederhier/ntfy/blob/8b95a3bbfd42d40a16293b6e2079b104bf6eb68d/docs/subscribe/pwa.md).
- Gotify's server exposes REST publishing and WebSocket receiving. Its Android
  client documents battery-optimization restrictions on its long-running
  connection.
  [Server](https://github.com/gotify/server),
  [Android client](https://github.com/gotify/android).
- Native iOS APNs delivery needs a push-capable developer team, app identity,
  provisioning, and sender credentials. Apple Developer Program membership is
  currently US$99/year with regional variation; an App Store release is not
  required just to test push in a properly provisioned development app.
  [Apple enrollment](https://developer.apple.com/help/account/membership/program-enrollment/).
- Android signing keys can be generated locally; there is no Android signing
  subscription. Google Play currently charges a US$25 one-time developer
  registration fee for publication, with verification/testing requirements.
  Play enrollment is not required for our local development APK installation.
  Preserve signing continuity and existing app data.
  [Android signing](https://developer.android.com/studio/publish/app-signing),
  [Play registration](https://support.google.com/googleplay/android-developer/answer/6112435).
- iOS Home Screen Web Push does not require Apple Developer Program membership,
  but still uses Apple's platform push service. It requires HTTPS, permission,
  and a real Web Push implementation. "Self-hosted" must not be described as
  eliminating the platform vendor's final delivery transport.
  [WebKit Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## Evaluation and acceptance boundaries

- Produce a small decision matrix: initial work, recurring costs, licenses,
  required third parties, credential ownership, delivery reliability, battery
  impact, supported clients, and upstream reconciliation burden. Include
  doing nothing as a valid result, not a predetermined failure.
- Preserve independently authoritative environments. Notification delivery is
  an optional sink for bounded activity hints, never a coordinator, conversation
  database, global acknowledgement service, or prerequisite for direct chat.
  Server-only workers may publish hints but must not receive local OS alerts.
- Use generic payloads and opaque scoped destinations by default. Notification
  taps must refresh authoritative environment/thread state before actions.
  Never forward prompts, tool output, credentials, filesystem paths, or raw
  errors merely to make an alert more descriptive.
- Assess whether each environment sends outbound notifications directly or a
  small subscriber aggregates them. Reuse approved attention semantics and
  receipts; no database scraping, log polling, or inferred provider completion.
- Cover multi-environment and multi-client routing without making notifications
  exclusive to one client. State explicitly whether independent opted-in clients
  can alert for the same event. Avoid duplicate delivery within one client.
- Document on/off, device/token revocation, account changes, rotation, expiry,
  stale/replayed events, loss of VPN, backend outage, and notification-service
  outage. None may disable direct chat or resolve attention.
- Compare ordinary alerts first; Live Activities, widgets, badges, and Android
  ongoing cards are separately scoped. Evaluate native app delivery versus a
  companion app/PWA, including whether a tap can reach the correct T3 thread.
- Any later experiment requires explicit approval, isolated state, and actual
  locked/background device evidence. Sender acceptance alone does not prove
  delivery. Do not disable phone security, silently change battery policy,
  replace installed apps, or open public ingress to bypass a constraint.

No service is installed or deployed by this request. No Apple/Google enrollment,
credentials, purchases, public exposure, provider turn, OS alert, or device
interaction is authorized.
