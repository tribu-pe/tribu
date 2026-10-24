# SUNAT answer fixtures

Examples of SUNAT's CDR (`ApplicationResponse`) used to test `read()`. They are not real answers to Tribu's documents.

| File | Based on |
|---|---|
| `cdr-accepted-with-observations.xml` | *Manual del Programador* (May 2021), Annex 1, example C.1 "Estado ACEPTADO": document FA01-981 with notes 4031 and 4001 |
| `cdr-rejected.xml` | Same manual, example C.2 "Estado RECHAZADO": document FT01-982, ResponseCode 2047 |

Changes from the manual:

- SUNAT's `ds:Signature` was removed, because `read()` does not verify SUNAT's signature in v0.1.
- The encoding is UTF-8 instead of ISO-8859-1.
- The C.2 description is paraphrased, because the manual's text could not be extracted reliably.

**Replace these with real CDRs from Milestone 0** once beta answers Tribu's own documents. Keep this table in sync.
