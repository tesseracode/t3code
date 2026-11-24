# Implementation boundary

Use the existing packageOverrides/generatedNotice mechanism in
third-party-licenses.config.json. No generator behavior change is needed.
Generated notices do not participate in physical repository-notice fallback,
so each native target needs its own exact override.

Focused proof is scripts/lib/third-party-licenses.test.ts plus the actual mobile
Metro launch. SDK and historical notice roots remain hard dependencies. This
leaf's source baseline is the current branch; earlier provider/SDK overlap
remains an independent native verification limitation.
