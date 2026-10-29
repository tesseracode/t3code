# Exploration: wsl-runtime-fixture-newlines

## Evidence

The fourth Windows run reported:

- installer success;
- all three `test -x` assertions passed;
- all three commands exited successfully;
- stdout was `copilotrgtgrep`;
- expected stdout was `copilot\nrg\ntgrep\n`.

The shell newline after each generated `printf` terminates syntax; it is not an
output argument. Explicit escaped newlines in the format strings make fixture
behavior match the existing assertion.
