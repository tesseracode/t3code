# Analysis: Copilot SDK notice

The stable web build scans server dependency notices. Copilot SDK 1.0.8 declares
MIT but its npm payload omits a license/notice file, so the existing validator
correctly refuses the build after the provider is added.

The authoritative SDK v1.0.8 tag is commit
`a54b0b5885534ba5ad073cfe99c7f0085b1be11c`. Its LICENSE is MIT with the exact
attribution `Copyright GitHub, Inc.`:
https://github.com/github/copilot-sdk/blob/a54b0b5885534ba5ad073cfe99c7f0085b1be11c/LICENSE

Use the existing version-scoped package override and generated MIT template.
No validator bypass, invented attribution, SDK upgrade or new notice mechanism.
This is a small dependent fix to the Copilot root, not part of session search.
