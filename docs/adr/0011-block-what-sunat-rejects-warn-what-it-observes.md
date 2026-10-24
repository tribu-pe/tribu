# A local Rule blocks only what SUNAT rejects; it warns about what SUNAT only observes

Validating by default (ADR 0003) is safe only if Tribu is never stricter than SUNAT. Each Rule therefore carries the `sunatCode` it mirrors, and its severity follows SUNAT's own: an ERROR in SUNAT's validation rules is an `error` locally, and an OBSERVATION is a `warning` that still sends. Two examples: a late Invoice (ERROR 2108) is blocked, while a late Daily Summary (OBS 4443) only warns. Dates in Rules are always evaluated in Lima time, never server time.

A Rule has no `severity` field of its own. Severity is derived from its mandatory `sunatCode`, through a Catalog of SUNAT's codes that records whether each one is an ERROR or an OBSERVATION and since when. Rules and SUNAT therefore cannot drift apart.

## Consequences

- When SUNAT moves a code from observation to error (it publishes a list of these), one dated entry in the codes Catalog changes, and no Rule does.
- Tribu's own safeguards that mirror no SUNAT code, such as test credentials in production, are configuration checks, not Rules.
