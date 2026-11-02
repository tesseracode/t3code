# Exploration

The preserved packaging generation lists the complete 31-path scope. Original
landing a67761be595832d5145b64079eea1dc441f7f4dc and reconstructed old-slug
landing be20fab510c4e3a60b17d85680b2b71c6037f432 both accept the refreshed
patch but describe different changes. No historical attestation is altered.

The reconstructed baseline retains current provider source and dependency order.
The original SDK source is safely shelved at
52149c708b126b0d8623954fe7db594900e884d8 while the pre-SDK root is recorded.
Restore that exact stash after the replacement root is landed.

Use the existing full packaging intent and regression suite; this feature
changes replay ownership only. Record from the explicit baseline, regenerate
the recipe, and attach one new-slug single-parent replay anchor.
