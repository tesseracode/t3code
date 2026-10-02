# Feature Request: Optional NetBird-first private-network connectivity

**Slug**: `netbird-mesh-connectivity`
**Created**: 2026-10-02T05:50:57Z

## Description

The maintainer uses NetBird rather than Tailscale. Make privately reachable T3
environments convenient to connect without requiring Tailscale or a new
cross-machine authority. Evaluate the already-supported manual connection path
before adding any connector abstraction.

**Lifecycle: requested.** This branch records intent and research only. Do not
advance analyze/define/implement/apply, refactor networking, change VPN settings,
or publish a service as part of this request.

## Existing behavior and reusable seams

At product base `982929e9323f00ded5c7ca943f22a0bcef669a6f`:

- Direct authenticated pairing already works with a reachable private-network
  address. A server can bind a chosen address, and clients can add that endpoint
  manually. The mesh transports packets; T3 pairing still grants access.
- `AdvertisedEndpoint` / `AdvertisedEndpointProvider` and the existing environment
  connection registry are the reusable presentation/routing seams. There is no
  need for another connection registry or generic WireGuard tunnel implementation.
- `packages/tailscale/src/tailscale.ts` invokes `tailscale status --json`, reads
  the local node's `Self` DNS/IP fields, manages `tailscale serve --bg --https`,
  removes that mapping on request, and probes `/.well-known/t3/environment`.
  This is own-endpoint advertisement/HTTPS exposure, not enumeration or automatic
  connection to all Tailscale peers.
- Desktop endpoint advertisement reads OS interfaces. It currently classifies
  all `100.64.0.0/10` IPv4 addresses as Tailscale, even without confirmed daemon
  ownership. NetBird can use that range too, so labels and selection must not
  infer the network product from the address alone.
- `vp run dev --share` is a Tailscale-specific convenience, not a NetBird toggle.
  Preserve single-origin development; do not bake host origins into Vite builds.

## Proposed behavior to evaluate

1. Document the manual path first: run the fork on a NetBird-connected host, bind
   its private address or enable explicitly scoped network access, permit the
   required traffic in mesh policy/firewall, then pair each client to that URL.
2. If integration adds value, introduce a narrow capability-based endpoint
   provider: local status/address detection, advertised endpoints, health, and
   explicitly supported exposure lifecycle. NetBird is the first new provider;
   retain existing Tailscale behavior.
3. Keep the integration optional and off by default per environment. Missing
   software, permissions or unsupported capabilities must not block ordinary T3
   use. Do not install, authenticate, restart or reconfigure a VPN implicitly.
4. Distinguish private mesh reachability from TLS and public exposure. Hosted
   HTTPS clients require a compatible HTTPS backend; a reachable private HTTP
   address is not automatically usable from `app.t3.codes`.
5. Headscale is a Tailscale-compatible control server, not automatically a third
   interchangeable client. Verify supported DNS/certificate/Serve capabilities
   before promising parity.
6. Treat peer inventory, T3 service discovery, pairing and connection ownership as
   separate capabilities. Do not scan peers or auto-pair without explicit scope.

## Important NetBird differences

Current official NetBird documentation describes local CLI status and an optional
HTTP/JSON daemon socket (client v0.75+). The JSON socket is disabled by default and
also exposes control methods; no daemon reconfiguration is authorized here.

`netbird expose` uses a reverse proxy to publish services to the **public internet**,
with separate account prerequisites and ephemeral lifetime. It is public without
additional protection by default. It must not silently replace private Tailscale
Serve or be enabled merely because the user selected NetBird.

## Evaluation and acceptance expectations

- Prove manual NetBird access and authenticated reconnect on web, desktop and
  mobile where supported; report TLS/mixed-content constraints explicitly.
- Preserve local-only defaults, environment-scoped identities, revocation and
  multi-environment ownership.
- Correct ambiguous CGNAT address branding, including mixed Tailscale/NetBird
  hosts and unavailable daemons.
- Keep capability errors visible and allow disable/cleanup of only T3-owned
  exposure mappings. No global route/firewall/VPN mutation.
- Separate any optional public-proxy feature into an explicitly approved scope.

## Sources

- `docs/user/remote-access.md`
- `packages/tailscale/src/tailscale.ts`
- `apps/desktop/src/backend/tailscaleEndpointProvider.ts`
- `apps/desktop/src/backend/DesktopServerExposure.ts`
- [NetBird CLI](https://docs.netbird.io/get-started/cli)
- [NetBird local JSON socket](https://docs.netbird.io/client/json-socket)
- [NetBird expose lifecycle and public-access defaults](https://docs.netbird.io/manage/reverse-proxy/expose-from-cli)
- [Headscale's control-server scope](https://headscale.net/stable/about/features/)

No live NetBird reachability test or VPN configuration change has been performed.
