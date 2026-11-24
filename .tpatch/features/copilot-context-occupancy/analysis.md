# Analysis

Copilot reports native occupancy on `session.usage_info`, independently of
cumulative billed tokens on `assistant.usage`. The orchestration handoff merge
currently replaces occupancy with the latter, including persisted historical
turns. With the reported fixture, 120615/200000 permits 16000 handoff tokens;
1169410 cumulative billed tokens instead force zero.

Declare the adapter's turn-usage semantics at the internal runtime boundary,
and exclude cumulative turn usage from occupancy estimation. Keep billing fields
and saved projections intact. A second runtime capability must explicitly
decline forced native replacement, so failed resume/budget admission preserves
the original error instead of invoking a known-unsupported operation.
