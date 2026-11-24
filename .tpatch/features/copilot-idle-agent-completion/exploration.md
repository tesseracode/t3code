# Scope

`refreshTasks` and `hasPendingBackgroundWork` in the Copilot adapter are the two
producers that require the same task predicate. `derivePendingBackgroundWork`
already excludes idle subagent items and needs no additional provider special
case. Extend the existing adapter background-task lifecycle case, rather than
duplicating the defect in web and mobile tests.
