# Specification: copilot-fusion-model-selection

## Goal and prerequisite

Support the maintainer's Fusion-only day-to-day experiment with eligible model
routing selection and truthful durable visibility into which models ran and
when. This is native SDK integration, not a new orchestrator.

Hard prerequisite: `copilot-sdk-runtime-upgrade`, plus the existing provider.
Definition and exploration can proceed alongside the upgrade. Implementation,
live account probes and paid execution remain separate gates; no current
default or vendor-policy setting changes here.

## Acceptance criteria

1. Discover choices from the destination environment/provider instance's
   account-advertised routing catalog. Transmit opaque enabled IDs unchanged;
   honor visibility/disable reasons. No invented Fusion alias, tier translation,
   integrator-only preset or undocumented feature-flag workaround.
2. Use shared model-selection options for the advertised `auto` preference
   contract where applicable. Keep routing preference, reasoning effort and
   context tier distinct. Existing explicit models and defaults are unchanged.
   Unavailable/unsupported runtimes show a reason, not a misleading selectable
   fallback. Switching back to an explicit model is supported.
3. Create, resume, per-turn changes and cold reconnect preserve the requested
   routing choice and confirmed effective state. Setters that acknowledge
   pending changes do not claim those changes committed. Failed activation
   retains the old effective state and reports the failure; reconnect consults
   authoritative current state rather than treating an old transient event as
   current.
4. Persist bounded normalized model-execution facts scoped to environment,
   provider instance, native session, T3 run/turn and available Fusion/phase IDs.
   Store requested routing and confirmed effective preference separately from
   resolved plan, observed execution and final-source attribution.
5. Expose pattern, actual phase model/role/status, source event time, reported
   duration, fallback/degradation and final source when emitted. Repeated models
   retain distinct phase identities; parallel phases remain overlapping.
   Planned or conditional models are not shown as executed without evidence.
6. Display observed starts/ends separately from reconstructed start estimates
   and receipt time. Missing transient starts, incomplete replay and unknown
   contract versions remain visible gaps. Never promise exact per-call timing
   from aggregate durations or infer semantic parentage from chronological IDs.
7. Live observation and durable native replay are idempotent. Reconnect and
   server restart preserve the timeline without duplicate phases or totals.
   A completed/failed phase takes precedence over a delayed start. Associate
   events only when their identity supports it; leave unknown associations
   explicit instead of attaching them to the currently active turn.
8. Only content-safe metadata enters execution history. Draft/critic/reasoning
   text, internal projections, staged terminals, raw tool arguments and binary
   data are excluded. Existing final transcript ownership and tool/input receipts
   remain authoritative. Fusion aggregate/phase completion never substitutes for
   root idle, especially when background work remains.
9. Show actual model history and detail on web/desktop and mobile, including
   touch access without hover. Preserve environment-scoped navigation over local,
   direct, relay and tunnel connections. No high-frequency repaint timers or
   unbounded raw-event transport; persist meaningful transitions, not every
   activity tick.
10. Do not double-count call, phase and aggregate usage or sum parallel phase
     durations as wall time. Report provider-supplied values with provenance;
     do not invent prices, quota balance, routing rationale or a vendor allowlist.
11. Older histories and other providers continue to decode/render without Fusion
     metadata. Unsupported routing leaves explicit-model use functional.
12. Deterministic fixtures cover pending/committed/failed selection, unknown and
     disabled IDs, single/cascade/critique, parallel/repeated-model phases,
     fallback/failure/cancellation, replay gaps/duplicates/reordering, usage
     accounting and background work. Separately approved real Fusion execution
     must prove actual account capability and callbacks. Missing real patterns
     remain unqualified rather than asserted passes.

## Minimal implementation sequence

1. Use the upgraded provider's typed catalog/current-state boundary and extend
   shared selection descriptors without a parallel picker configuration system.
2. Define a typed bounded execution-history representation in the existing V2
   event/turn-item path, with stable IDs and completeness/provenance semantics.
   Avoid a new independent database/event bus unless the existing path cannot
   represent it losslessly.
3. Normalize allowed native routing/phase facts at the adapter, persist through
   ordinary server projection, and prove replay/lifecycle invariants at their
   lowest meaningful test layer.
4. Render summary/detail consistently on web/desktop/mobile. Add shipped-user
   guidance for selection, pending activation and history gaps. Browser/device
   verification requires the maintainer's explicit permission.
5. After the SDK gate and account/vendor-policy approval, collect bounded real
   runtime evidence and client screenshots. Do not roll out based on static
   source inspection or a successful picker render.

## Non-goals and readiness

No custom cross-machine scheduling, manual phase/model orchestration, ACP,
quota UI, general analytics dashboard, private draft viewer, voice, custom
agents or automatic model-default changes.

Experiment readiness requires both a qualified SDK/runtime and useful persisted
model/time history. Selection-only and aggregate-token-only implementations are
not ready. Definition does not establish a schedule estimate, live eligibility,
exact callback completeness or permission to route outside account/admin policy.
