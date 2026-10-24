# Own TypeScript implementation, with a comparable implementation as a test oracle

An implementation in the same space is broader and already verified against SUNAT beta, but it is a low-level, prerelease, single-maintainer project, and a WASM core cannot teach SUNAT to a TypeScript reader. Tribu neither ports it nor wraps it. It implements its own TypeScript core and, in tests, compares its XML and signatures with that implementation's output for the same input. Comparison never replaces testing against SUNAT beta, and any fixtures copied from it keep the original notice.
