# Probar tu código

## Probar tu código

`tribu/testing` trae `fakeSunat()`, una SUNAT en memoria que pasas como transporte. Puede aceptar, rechazar, observar, fallar antes o después del envío y responder tickets:

```ts
import tribu from 'tribu';
import { fakeSunat } from 'tribu/testing';

const fake = fakeSunat({ reject: { 'F001-2': '2800' }, tickets: ['0'] });
const sunat = tribu.create({ env: 'beta', transport: fake, /* ... */ });

fake.submissions; // lo que se envió
```

---

[← Guía](README.md)
