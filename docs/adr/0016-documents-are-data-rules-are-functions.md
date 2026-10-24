# Documents are immutable data, and Rules check them with plain functions

A classic DDD layout would model `Invoice` and `Customer` as entity classes, each Rule as a Specification class, and a `RuleEngine` class. We kept the ideas and dropped the classes:

- **Documents are immutable data** produced by `calculate`. A Record must survive `JSON.stringify` → database → `JSON.parse` and come back in `modifies` or `retry`, and a class instance does not. A Customer has no identity of its own, so it is a value, not an entity.
- **Specifications are predicate functions**, such as `hasRuc(customer)`, shared by Rules that need them. A Spec class plus a Rule for every requirement would double the files a learner must jump between.
- **Rules use `Rule.define`**, mirroring `Catalog.define`. They keep `why`, `fix`, `source`, `effectiveFrom` and `appliesTo`.
- **The rule engine is the `validate()` function.** It filters Rules by document type, by Effective Date on the issue date, and by `rules.disable`, and takes severity from `ReturnCode` (ADR 0011).

Value Objects (`Money`, `Ruc`, `Dni`, `DocumentId`) remain classes: they guard invariants and have no lifecycle.

## Layers

The layers are documented and enforced by dependency-cruiser. The folders keep the names that tell SUNAT's story.

| Layer | Folders | May import |
|---|---|---|
| Domain | `catalogs/`, `documents/`, `rules/`, `xml/`, `results/` | Domain only |
| Application | `issue.ts`, `create.ts` | Domain, Infrastructure |
| Infrastructure | `signing/`, `transport/`, `testing/` | Domain |
