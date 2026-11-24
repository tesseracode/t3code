# Integration

`fusion.ts` owns the event whitelist and metadata normalization. `adapter.ts`
already feeds whitelisted events into bounded durable history, leaving events
without semantic owner IDs visibly unassociated. Cold native replay uses the
same whitelist. Shared `work-log/modelExecution.ts` feeds all client details and
summaries. Existing provider tests use receipts/worker drains rather than sleeps.

Correct normalization and shared presentation, adding regression cases to the
existing fusion, adapter and modelExecution tests. No production state writes,
legacy tier forcing, installed application changes or autonomous deployment.
