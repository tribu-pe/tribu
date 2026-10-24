# Production is the default Environment

Tribu exists to issue real Documents, so the Environment resolves as: `env` in code, then the `SUNAT_ENV` variable, then `production`. `NODE_ENV` is never read, because staging servers often run with `NODE_ENV=production`. Beta must be chosen explicitly.

## Consequences

- Creating a client with SUNAT's public test SOL Credentials (MODDATOS) in production fails with an error that explains how to switch to beta.
- A developer whose environment holds the company's real credentials will issue legally binding Documents while testing. The README must say so prominently, and the client exposes its resolved Environment.
