# Server-only, Node 22 or newer

Signing needs the Certificate and its passphrase, and every submission carries the SOL Credentials, so Tribu must never run in a browser. Importing it in one fails with an explicit error. Node 20 left support in April 2026, so the minimum is Node 22, using native `fetch` and `crypto`. Bun and Deno may work but are not guaranteed in v0.1. An earlier draft promised edge and browser compatibility; this decision withdraws it. Because Node 22 can `require()` ES modules, the package is published as ESM only, with no dual CommonJS build.
