# Analysis

The exact same-base replay of all seven maintained roots reproduces every
product, build, documentation and dependency file at `aeb0b4822`. Outside
administrative `.tpatch` records, its only difference is the existing
`.tpatch/local/` line in `.gitignore`. The line was introduced as workspace
bootstrap metadata rather than a recorded root.

Adopt that historical one-line delta without modifying product source or
rewriting its earlier history. Local capture contents remain private.
