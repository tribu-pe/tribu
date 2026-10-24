# Recovery is conservative: retry only what never reached SUNAT

A lost answer means one of two things. If the failure happened **before** sending (connection refused, DNS down), SUNAT has nothing, and retrying is safe. If it happened **after** sending (the ZIP went out and the `timeout` expired), SUNAT may already have the document, and re-sending can duplicate it.

So Tribu retries on its own only failures that happened before sending. The retry settings are:

- `retry.attempts`: default 3;
- `retry.delay`: a base that doubles each attempt (default 1000 ms), or a function per attempt;
- `timeout`: how long to wait for one answer, default 30 s.

After a post-send failure, the default `Recovery.Confirm` looks the document up where SUNAT allows it. The CDR lookup (`getStatusCdr`) covers only types 01, 07 and 08, and only in production. When the document cannot be confirmed, Tribu throws `TribuError` with `kind: 'unconfirmed'` and never re-sends blindly. `Recovery.Resend` re-sends the same file under the same name and relies on SUNAT's duplicate codes (1033, 2109, 2223). It must be chosen explicitly, for the whole client or per document type (`recovery: { receipt: Recovery.Resend }`).

A submission that has a Ticket is never re-sent; its Ticket is queried. Every attempt reuses the same Record and Number.

## Consequences

- An Unconfirmed Receipt can never be confirmed, because SUNAT offers no lookup for type 03. Under the default it stops with an error offering both exits: re-send with `Recovery.Resend`, or report it in a Daily Summary. Tribu never moves it to the Daily Summary on its own (ADR 0010).
- Milestone 0 measures how SUNAT answers duplicates. If duplicates turn out to be detected reliably, the default may be revisited as a new decision.
