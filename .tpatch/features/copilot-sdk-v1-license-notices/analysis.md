# Analysis

SDK 1.0.28 and its native target packages declare MIT but omit a packaged notice.
Metro's existing strict license generator refuses startup. The existing override
is intentionally limited to SDK 1.0.8 and must remain historical evidence.

The authoritative v1.0.28 LICENSE is MIT with "Copyright GitHub, Inc." at upstream
commit fa108e71ee3025663e0dac20f2a071055d3a6b14. Add exact-name, exact-version
overrides for the SDK and its eight optional native target packages. Do not
generalize attribution to unrelated runtime packages or future versions.
