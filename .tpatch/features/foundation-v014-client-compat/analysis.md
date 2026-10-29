# Analysis: Foundation v014 client compatibility

The integrated `a67761be5` validation in the maintainer's
`v014-check-changed-first.log` found real Foundation-owned source incompatibilities:
the narrow attention test transport predates `RpcSession.inboundFrames` and the
registry's `assertKnownAddress`, and still declares removed `registerPlatform`.
The TWS command-permission test also needs the installed formatter's output.

Knip identifies two unimported mobile app wrappers and three unnecessarily public
implementation values. The decoder constants have real local consumers; keeping
their values private preserves the exact v1.2.14 boundary. The per-environment
attention worker is consumed inside the public workspace factory and needs no
export. Both mobile wrappers have zero consumers: no mounted mobile presentation
or service ever instantiates them. Removing those dead instances must not remove
the public client-runtime factories or claim mobile inbox/push delivery.

This cohesive compatibility root depends on Foundation and preserves the complete
Foundation and attention canonical roots unchanged. It contains the entire
compatibility correction, not a replacement tiny canonical patch. Work is on
the owned branch at `6c925ff7c8ad226f5535ba3464636377a292437e`; the integrated
commit is validation context, not a fabricated local baseline.

The primary owns the unrelated `/var` versus `/private/var` environment test.
No migration, native/provider behavior, packaging, permission, UI or platform
policy changes belong here.
