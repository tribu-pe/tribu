# Milestone 0 results (2026-10-30)

What sending Tribu's documents to SUNAT beta (`https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService`, user `MODDATOS`) taught us. The evidence is the test suite in `test/beta/` (`pnpm test:beta`, 31 tests, all passing on 2026-10-30) and the fixtures it keeps. Unlike the plan, the experiment ran Tribu's own v0.1 code instead of a throwaway `poc/`, so every answer below is checked against the code we ship.

Beta is not production. Where beta is laxer or different, it says so.

## Done-when checklist

| Criterion | Result |
|---|---|
| Invoice, Receipt and Credit Note accepted | Yes, plus a Debit Note, a Credit Note on a Receipt, a Daily Summary and Voided Documents. Accepted CDRs, no Observations |
| Rounding cases accepted without Observations | Yes, 18 cases (`fixtures/rounding/`) |
| Every question answered | Below |
| ADR on the signing library | [ADR 0019](../adr/0019-signing-with-xml-crypto-and-node-forge.md) |

## Answers

| # | Question | Answer | Evidence |
|---|---|---|---|
| 1 | Does beta accept any self-signed Certificate? | **Yes.** A certificate generated at test time signs every accepted document | `test/support/certificate.ts`, all of `test/beta/` |
| 2 | Is an Anonymous Customer coded `-` / `-`? | **Partly.** Beta accepts `schemeID="-"` and ID `-`, but rejects `-` as the name: ERR 2022 requires 3 to 1500 characters (`boleta-2.0.csv`). Tribu now names it `CLIENTES VARIOS`, its own choice: SUNAT prescribes no value | `receipt-and-notes.test.ts`, `fixtures/receipt/anonymous/` |
| 3 | Does SUNAT round half-up? | **Undecidable in beta.** At the half-cent boundary beta accepts both half-up and half-even without Observations (±1 tolerance). Both `Rounding` constants are now verified; `HalfUp` stays the default | `rounding.test.ts`, `fixtures/rounding/*-half-even.json` |
| 4 | Which signature algorithms does SUNAT accept? | **RSA-SHA1 and RSA-SHA256**, with inclusive C14N and an enveloped signature. RSA-SHA512 was not tried: Tribu offers no such constant (ADR 0018). Default: `Signature.RsaSha256` | `questions.test.ts` |
| 5 | Is the Payment Terms block enforced in beta? | **Yes.** An Invoice without it gets ERR 3244 | `questions.test.ts` |
| 6 | What does SUNAT answer to an identical re-send? | **In beta, a second acceptance**, with no duplicate code (1033, 2109 or 2223 were expected). Beta cannot show whether production registers it twice, so `Recovery.Confirm` stays the default and `Recovery.Resend` remains unverified | `questions.test.ts` |
| 7 | Can a lost Receipt CDR be recovered? | **Not testable in beta**: `billConsultService` has no beta endpoint (`sunat-facts-2026-10.md`). Unchanged: the default stops and offers both exits (ADR 0015). To verify in production | — |

## Bugs beta found and the fixes

Each fix has a unit test, so `pnpm test` guards it without beta.

| What beta answered | Cause | Fix |
|---|---|---|
| 0306 `cac:Signature` | The block had only the RUC | `cbc:ID`, `PartyName` and `ExternalReference/URI` (`firma.csv`: ERR 2076, 2081, 2083); `ds:Signature/@Id` (ERR 2085) |
| 0306 `cac:TaxCategory` | `Percent` came after `TaxExemptionReasonCode` | UBL 2.1 order |
| 3030 | No establishment code | `RegistrationAddress/AddressTypeCode` `0000`, the main establishment (`factura-2.0.csv`) |
| Accepted, but Tribu re-sent the Invoice 3 times | SUNAT's CDR ZIP lists an empty `dummy/` folder first; reading it failed, and a reading failure counted as "never sent" | Read the `.xml` entry; any failure after the request counts as sent (ADR 0015) |
| 3246 on notes | Notes carried Payment Terms "Contado" | Notes omit Payment Terms (`nota-credito-2.0.csv`: only Reason 13, "Credito"; none in `nota-debito-2.0.csv`) |
| 2022 | Anonymous Customer named `-` | See question 2 |
| 2074 on the Daily Summary | Faults also come with **HTTP 200**, and the code was lost | Faults are detected in the body, whatever the status |
| 2074, schema errors, 2992 on the reports | Wrong `UBLVersionID`, `ext:UBLExtensions` not first, wrong `sac` namespace, the Invoice's issuer format, Daily Summary lines without customer, payments, taxes or rate | Rebuilt from `resumen-diario-1.1.csv` and `comunicacion-de-baja-1.0.csv` |

## Other findings

- **SOAP faults:** `faultcode` is `soap-env:Client.<code>` and `faultstring` holds the message with HTML entities (`&#243;`). Beta answers rejections (2xxx–3xxx) as faults too, not only exceptions. Tribu classifies a fault by its code, as ADR 0014 already says: 2000–3999 is `rejected` (the Record keeps no CDR), 0100–1999 is `exception` and leaves the Record `issued`. Whether a rejection by fault uses the Number is *unconfirmed*; treating it as used costs at most a skipped Number, while the opposite could reuse one. **To verify in production:** after the first rejection by fault, send a correct document with the same Number and record whether SUNAT answers 1033 (beta cannot tell: it does not detect duplicates, question 6).
- **HTTP 401 from beta's nginx** when a request follows another immediately; 1 s apart is enough. The beta tests space their calls. Tribu reports it conservatively (`unconfirmed`). Whether production limits the rate is *unconfirmed*.
- **The rate 10.5% is accepted** for an Issuer declaring `Igv.Hospitality`, without OBS 4439, although the beta RUC is not in the register.

## Not done

- The comparison of the rounding cases with the oracle implementation (ADR 0007): it could not run here. SUNAT's acceptance without Observations is the evidence instead.
- A Daily Summary containing notes, and Receipts in USD.
