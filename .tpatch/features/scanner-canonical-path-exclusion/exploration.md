# Implementation boundary

`AgentSessionScanner.make` builds the path exclusion roots. Discovery already
checks both lexical candidate paths and resolved symlink targets, but the target
check compares canonical candidates with lexical configuration roots.

Add the two canonical configured roots to the existing ancestor list. Its
separator-aware matching keeps adjacent directory names eligible. Reuse the
scanner's existing realPath fallback when a configured root does not exist.
