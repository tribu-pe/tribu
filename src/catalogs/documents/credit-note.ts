import { Catalog } from '../catalog';

const CATALOGS = 'sources/sunat/reglas-validacion-2026-08-26/catalogos.csv';

/** Catalog 09: why a Credit Note (nota de crédito) modifies an invoice or receipt. */
export const Reason = Catalog.define('09', {
  source: CATALOGS,
  entries: {
    Void: { code: '01', name: 'Anulación de la operación' },
    WrongRuc: { code: '02', name: 'Anulación por error en el RUC' },
    // catalogos.csv lists two wordings for 03; Tribu uses the later one.
    FixDescription: {
      code: '03',
      name: 'Corrección por error en la descripción y/o código de producto SUNAT',
    },
    Global: {
      Discount: { code: '04', name: 'Descuento global' },
    },
    Item: {
      Discount: { code: '05', name: 'Descuento por ítem' },
      Return: { code: '07', name: 'Devolución por ítem' },
    },
    Total: {
      Return: { code: '06', name: 'Devolución total' },
    },
    Bonus: { code: '08', name: 'Bonificación' },
    ValueDecrease: { code: '09', name: 'Disminución en el valor' },
    Other: { code: '10', name: 'Otros Conceptos' },
  },
});
