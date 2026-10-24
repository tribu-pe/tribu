# Rounding and signature options accept only constants verified against SUNAT

Developers can choose the rounding mode (`rounding: Rounding.HalfUp`) and the signature algorithm (`signature: Signature.RsaSha256`). Free values (a string, a custom function) are not accepted, because a choice SUNAT does not accept would make every Document fail in a way the developer cannot diagnose. This is the same reasoning as ADR 0012. Each option offers only the constants that Milestone 0 verified in beta.

| Option | Default | Notes |
|---|---|---|
| `rounding` | `Rounding.HalfUp` | |
| `signature` | The strongest algorithm SUNAT accepts, expected to be `Signature.RsaSha256` | `Signature.RsaSha1` is kept for compatibility |

Canonicalization is not configurable: changing it adds no security and can only break the signature.

## Consequences

- If SUNAT accepts only SHA-1, the default is SHA-1, with the reason documented. A stronger signature that SUNAT rejects is useless.
- A new option value is added only together with the beta evidence that SUNAT accepts it.
