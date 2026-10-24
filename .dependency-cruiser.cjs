// Enforces the layers in docs/agents/structure.md and ADR 0016.
const domain = '^src/(catalogs|documents|rules|xml|results)/';
const infrastructure = '^src/(signing|transport|testing)/';
const application = '^src/(issue|create)\\.ts$';

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'domain-is-pure',
      comment: 'Domain never touches the Certificate, the network or the orchestration.',
      severity: 'error',
      from: { path: domain },
      to: { path: [infrastructure, application] },
    },
    {
      name: 'domain-uses-no-node-io',
      comment: 'Domain is pure functions: no file system, network or process access.',
      severity: 'error',
      from: { path: domain },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'infrastructure-does-not-orchestrate',
      severity: 'error',
      from: { path: infrastructure },
      to: { path: application },
    },
    {
      name: 'nothing-imports-the-entry-point',
      severity: 'error',
      from: {},
      to: { path: '^src/index\\.ts$' },
    },
    {
      name: 'big-js-only-in-decimal',
      comment: 'Money arithmetic goes through Decimal (ADR 0001).',
      severity: 'error',
      from: { pathNot: '^src/documents/decimal\\.ts$' },
      to: { path: 'node_modules/big\\.js/' },
    },
    {
      name: 'crypto-libraries-only-in-signing',
      comment: 'Tests may use them to inspect what the code produced.',
      severity: 'error',
      from: { pathNot: ['^src/signing/', '\\.test\\.ts$', '^test/'] },
      to: { path: 'node_modules/(xml-crypto|node-forge)/' },
    },
    {
      name: 'zip-only-in-transport',
      severity: 'error',
      from: { pathNot: ['^src/transport/', '\\.test\\.ts$', '^test/'] },
      to: { path: 'node_modules/fflate/' },
    },
    {
      name: 'xml-parser-only-at-the-edges',
      comment:
        'The DOM parser reads signed XML and SUNAT answers; xml/ builds XML with its own typed functions (ADR 0004).',
      severity: 'error',
      from: { pathNot: ['^src/(signing|transport)/', '\\.test\\.ts$', '^test/'] },
      to: { path: 'node_modules/@xmldom/' },
    },
    {
      name: 'src-uses-no-dev-dependencies',
      severity: 'error',
      from: { path: '^src/', pathNot: '\\.test\\.ts$' },
      to: { dependencyTypes: ['npm-dev'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'node', 'default'],
    },
  },
};
