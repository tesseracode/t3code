# Analysis

The shared background runner forwards the model and reasoning effort but drops
the selection's `autoTier`. Every operation using that runner is affected.
The preserved prototype uses the chat adapter's account-advertised tier
validation and is suitable to reuse after focused review.

Discover routing metadata only for an explicitly selected string tier. Omitted
routing must remain omitted, including on accounts without tier metadata.
Explicit provider default is a native `autoTier: null` reset, not omission.
Keep validation before ephemeral session creation and reset before inference.
Retain the existing cleanup/cancellation and structured-output protections.
