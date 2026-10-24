# The Issuer declares an IGV Regime, never a tax rate

The IGV rate depends on the year and on the Issuer's legal status. The general rate is 18%, though its IGV/IPM split moves every year until 2029. Small restaurants and hotels pay 10.5% in 2026 and 15% in 2027 under Ley 31556, and no rate is defined after that. A free-text option or a numeric `igvRate` would let a typo, or a value tampered with in a database or `.env`, change the tax charged. So Tribu has no input for a percentage at all. The Issuer declares a regime with a frozen Catalog constant (`igv: Igv.Hospitality`; `Igv.General` by convention). External values go through `Igv.from(code)`. Rates come only from `igv-regime.yaml` by issue date, and Tribu throws when a regime has no rate for that date instead of guessing.

## Consequences

- When a law changes, the fix is one dated line in the data file. Code that uses Tribu does not change.
- Tribu cannot verify that the Issuer is actually in SUNAT's reduced-rate register. When it is not, SUNAT observes it (OBS 4439), and the documentation must say so.
