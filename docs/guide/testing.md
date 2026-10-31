# Testing your code

## Testing your code

`tribu/testing` provides `fakeSunat()`, an in-memory SUNAT that you pass as the transport. It can accept, reject, observe, fail before or after sending, and answer Tickets:

```ts
import tribu from 'tribu';
import { fakeSunat } from 'tribu/testing';

const fake = fakeSunat({ reject: { 'F001-2': '2800' }, tickets: ['0'] });
const sunat = tribu.create({ env: 'beta', transport: fake, /* ... */ });

fake.submissions; // what was sent
```

---

[← Guide](README.md)
