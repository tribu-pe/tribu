# Tribu calculates the amounts; the caller gives quantities and tax-included prices

Similar implementations expect the caller to supply line values, IGV and totals, which leaves IGV rounding (the classic cause of rejections) to every integrator. Tribu takes the quantity and either a Unit Price (`price`, tax included) or a Unit Value (`value`, tax excluded) on each Item, never both and with no global switch, so the field name always says what the number is. It then calculates the rest: the Unit Value is kept unrounded, each line is rounded to 2 decimals at the end of its own calculation, and the header totals are the sum of the lines. The IGV rate is Catalog data with an Effective Date, never a constant in code.

## Consequences

- Rounding behaviour is a public contract: it must be pinned by a table of cases verified against SUNAT beta (and compared with an implementation in the same space) during Milestone 0.
- The exact number of decimals SUNAT accepts for the Unit Value, and its tolerance for header-versus-lines differences, must be confirmed in the official annexes before the calculation is fixed.
