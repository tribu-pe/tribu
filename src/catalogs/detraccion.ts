import { Catalog } from './catalog';

const A1 = 'R.S. 183-2004/SUNAT, Annex 1';
const A2 = 'R.S. 183-2004/SUNAT, Annex 2';
const A3 = 'R.S. 183-2004/SUNAT, Annex 3';

/**
 * Catalog 54, the goods and services subject to detracción (SPOT), each with the rate in force
 * (docs/research/detracciones-2026-10.md § 2; ADR 0020). Codes and names come from catalogos.csv;
 * the rate and annex numeral are matched to each code by name, since SUNAT publishes no joint table.
 * Left out on purpose: 004 (4% or 10% depending on a SUNAT list), 027/028/099 (other regimes), and
 * 002, 013, 015, 038, 042, 043, 046, 047 (no norm found that subjects them today).
 * shortcut: one rate per code, the rates in force since 2025-04-01 (R.S. 000086-2025); when SUNAT
 * changes a rate, date them like Igv (ADR 0012).
 */
export const Detraccion = Catalog.define('54', {
  source: 'sources/sunat/reglas-validacion-2026-08-26/catalogos.csv',
  entries: {
    Sugar: { code: '001', name: 'Azúcar y melaza de caña', rate: '10', source: `${A1} n.° 1` },
    EthylAlcohol: { code: '003', name: 'Alcohol etílico', rate: '10', source: `${A1} n.° 2` },
    GoldOre: {
      code: '045',
      name: 'Minerales de oro y sus concentrados gravados con el IGV',
      rate: '10',
      source: `${A1} n.° 3 (R.S. 000086-2025)`,
    },
    NonGoldOre: {
      code: '034',
      name: 'Minerales metálicos no auríferos',
      rate: '10',
      source: `${A1} n.° 4 (R.S. 000086-2025)`,
    },
    YellowCorn: { code: '005', name: 'Maíz amarillo duro', rate: '4', source: `${A2} n.° 2` },
    SugarCane: { code: '007', name: 'Caña de azúcar', rate: '10', source: `${A2} n.° 4` },
    SandAndStone: { code: '009', name: 'Arena y piedra.', rate: '10', source: `${A2} n.° 5` },
    Waste: {
      code: '010',
      name: 'Residuos, subproductos, desechos, recortes y desperdicios',
      rate: '15',
      source: `${A2} n.° 6`,
    },
    TaxedByWaiver: {
      code: '011',
      name: 'Bienes gravados con el IGV, o renuncia a la exoneración',
      rate: '10',
      source: `${A2} n.° 7`,
    },
    Meat: { code: '014', name: 'Carnes y despojos comestibles', rate: '4', source: `${A2} n.° 9` },
    FishOil: { code: '016', name: 'Aceite de pescado', rate: '10', source: `${A2} n.° 11` },
    FishMeal: {
      code: '017',
      name: 'Harina, polvo y “pellets” de pescado, crustáceos, moluscos y demás invertebrados acuáticos',
      rate: '4',
      source: `${A2} n.° 12`,
    },
    Milk: { code: '023', name: 'Leche', rate: '4', source: `${A2} n.° 14` },
    Wood: { code: '008', name: 'Madera', rate: '4', source: `${A2} n.° 15` },
    Gold: { code: '031', name: 'Oro gravado con el IGV', rate: '10', source: `${A2} n.° 16` },
    Paprika: {
      code: '032',
      name: 'Paprika y otros frutos de los generos capsicum o pimienta',
      rate: '10',
      source: `${A2} n.° 17`,
    },
    ExemptGoods: {
      code: '035',
      name: 'Bienes exonerados del IGV',
      rate: '1.5',
      source: `${A2} n.° 20`,
    },
    ExemptGold: {
      code: '036',
      name: 'Oro y demás minerales metálicos exonerados del IGV',
      rate: '1.5',
      source: `${A2} n.° 21`,
    },
    NonMetallicMinerals: {
      code: '039',
      name: 'Minerales no metálicos',
      rate: '10',
      source: `${A2} n.° 22`,
    },
    Lead: { code: '041', name: 'Plomo', rate: '15', source: `${A2} n.° 23` },
    LaborIntermediation: {
      code: '012',
      name: 'Intermediación laboral y tercerización',
      rate: '12',
      source: `${A3} n.° 1`,
    },
    Leasing: {
      code: '019',
      name: 'Arrendamiento de bienes muebles',
      rate: '10',
      source: `${A3} n.° 2`,
    },
    Maintenance: {
      code: '020',
      name: 'Mantenimiento y reparación de bienes muebles',
      rate: '12',
      source: `${A3} n.° 3`,
    },
    CargoHandling: { code: '021', name: 'Movimiento de carga', rate: '10', source: `${A3} n.° 4` },
    BusinessServices: {
      code: '022',
      name: 'Otros servicios empresariales',
      rate: '12',
      source: `${A3} n.° 5`,
    },
    Commission: { code: '024', name: 'Comisión mercantil', rate: '10', source: `${A3} n.° 6` },
    ContractManufacturing: {
      code: '025',
      name: 'Fabricación de bienes por encargo',
      rate: '10',
      source: `${A3} n.° 7`,
    },
    PassengerTransport: {
      code: '026',
      name: 'Servicio de transporte de personas',
      rate: '10',
      source: `${A3} n.° 8`,
    },
    Construction: {
      code: '030',
      name: 'Contratos de construcción',
      rate: '4',
      source: `${A3} n.° 9`,
    },
    OtherServices: {
      code: '037',
      name: 'Demás servicios gravados con el IGV',
      rate: '12',
      source: `${A3} n.° 10`,
    },
    MineralProcessing: {
      code: '044',
      name: 'Servicio de beneficio de minerales metálicos gravado con el IGV',
      rate: '12',
      source: `${A3} n.° 11 (R.S. 000086-2025)`,
    },
    RealEstate: {
      code: '040',
      name: 'Bien inmueble gravado con IGV',
      rate: '4',
      source: 'R.S. 022-2013/SUNAT (real estate, any amount)',
    },
  },
});

/** One constant of catalog 54, as `invoice({ detraccion })` takes it. */
export type DetraccionEntry = ReturnType<typeof Detraccion.all>[number];
