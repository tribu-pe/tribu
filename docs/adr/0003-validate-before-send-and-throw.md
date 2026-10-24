# Validate locally before sending, and throw on failure

An implementation leaves validation as a separate, optional step. Tribu runs its Rules first, before a Number is reserved, so a data error never burns a Number. Failures throw, like Axios, because a rejection returned as a value is easy to ignore and an ignored rejection is an invalid Document nobody noticed. Two error classes keep the cases apart: `SunatValidationError` (nothing left the process, no Number used) and `SunatRejectedError` (SUNAT saw it). `{ throw: false }` returns a result union instead, and an acceptance with Observations counts as success.

## Consequences

- A local Rule that is stricter than SUNAT, or out of date, would block a valid Document. The escape hatch `validate: 'warn' | false` exists for that, per call or in the configuration.
- Calls return Promises; RxJS is not used in the core.
