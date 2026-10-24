# Milestone 0: prove signing and sending against SUNAT beta

An experiment, not the start of v0.1. It settles the riskiest unknowns before the real code is designed. The code in `poc/` is throwaway and never published. Fixtures and findings are kept.

## Build

1. A script that generates a self-signed test Certificate.
2. A minimal Invoice through the whole path: XML → signature (xml-crypto + node-forge) → ZIP → `sendBill` to beta → CDR parsing.
3. The same for an individually sent Receipt and for a Credit Note.
4. About 15 rounding cases sent to beta and compared with the oracle implementation (ADR 0007):
   - tax-included and tax-excluded prices
   - several lines
   - decimal quantities
   - exempt lines mixed with taxed lines
   - the 10.5% rate
   - half-cent boundaries

## Questions it answers

| Question | How |
|---|---|
| Does beta accept any self-signed Certificate? | Send with the generated one |
| Is an Anonymous Customer coded `-` / `-`? | Send a Receipt without a Customer |
| Does SUNAT round half-up? | Rounding cases at the x.xx5 boundary |
| Which signature algorithms does SUNAT accept? | Try them and record the result in an ADR |
| Is the Payment Terms block enforced in beta? | Send an Invoice without it (the rules say ERR 3244) |
| What does SUNAT answer when the same Invoice or Receipt file is sent twice? | Send one twice and record the answer |
| Can a lost Receipt CDR be recovered? (`getStatusCdr` only lists types 01, 07, 08) | Try it and record the answer; billConsultService has no beta endpoint, so note what can only be tested in production |

## Working hypotheses and fallbacks

Each question starts from what the official sources suggest. The fallback decides what Tribu does if beta proves the hypothesis wrong.

| # | Hypothesis | If it fails |
|---|---|---|
| 1 | A self-signed Certificate works in beta (SUNAT: no registered certificate needed) | Document how to obtain a test certificate. Tests then load it from an environment variable, never from the repository |
| 2 | Anonymous Customer: `schemeID="-"`, ID `"-"` (ERR 2016/2018 accept it) | Try the other codings seen in practice. Users never write it (they omit `customer`), so the fix is internal |
| 3 | Half-up rounding. Low risk anyway: every check tolerates ±1. Also test half-even, since `rounding` offers only verified modes (ADR 0018) | Switch the default inside `Decimal`; all calculations change in one place |
| 4 | The manual's algorithms: inclusive C14N, `rsa-sha1`, `enveloped-signature`, `sha1`. Start exactly with these, then try RSA-SHA256 and RSA-SHA512 | The default is the strongest one accepted; keep SHA-1 if it is the only one (ADR 0018) |
| 5 | Beta enforces ERR 3244 (Payment Terms required) | Nothing changes: Tribu always writes the block. If beta does not enforce it, note that beta is laxer than production |
| 6 | An identical re-send gets a duplicate code (1033/2109/2223), not a second registration | The conservative default (`Recovery.Confirm`) holds either way. If duplicates are not detected reliably, `Recovery.Resend` is documented as unsafe |
| 7 | A Receipt's CDR cannot be looked up (`getStatusCdr` lists 01, 07, 08 only) | The default already stops and offers both exits (ADR 0015). The result decides what the documentation recommends |

## Layout

```
poc/                                   throwaway
fixtures/rounding/                     kept: input JSON + SUNAT's answer
docs/research/milestone-0-results.md   what we learned, with evidence
```

## Done when

- The Invoice, the Receipt and the Credit Note each receive an **accepted** CDR in beta.
- All rounding cases are accepted **without Observations**.
- Every question above has a written answer in `milestone-0-results.md`.
- An ADR records the final signing library.

If signing cannot be made to work in Node after reasonable effort, the milestone still ends, with the result "redesign signing before writing v0.1".
