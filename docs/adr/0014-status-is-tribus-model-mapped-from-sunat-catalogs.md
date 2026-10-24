# A Record's Status is Tribu's model, mapped only from SUNAT Catalog entries

SUNAT publishes response codes and ticket codes, but no list of document states. Tribu's Status values (Issued, Processing, Accepted, Rejected, Unconfirmed, Voided) are therefore declared as Tribu's own model, not presented as SUNAT's. Each state names the SUNAT Catalog entries that produce it, and never holds a raw code, string or number. SUNAT's codes live as Catalog entries (`Catalog.define`) with their source. If SUNAT changes a code, its Catalog changes. If the translation changes, only the Status file changes. Both are single, auditable points.

## Consequences

- Catalogs are declared with `Catalog.define(name, { source, entries })`. The source is given once per Catalog and must be precise (manual section, workbook sheet, resolution). An entry is a single `code` or a `range`. Each `name` is SUNAT's wording, verbatim.
- `ResponseCode` holds the classes of SUNAT's answer, by range, per *Manual del Programador* §4.1. The 2,077 individual codes are `ReturnCode`, generated from the validation workbook.
- A state no SUNAT answer produces (Issued, Unconfirmed) has `from: []`, and its `why` is required.
- Statuses are declared with `Lifecycle.define`, never `Catalog.define`, which is reserved for data SUNAT publishes.
- Answers in SUNAT's exception ranges (0100–999 and 1000–1999) mean "not informed". They leave the Record Issued and surface as `TribuError` with `kind: 'exception'`, the fifth kind.
