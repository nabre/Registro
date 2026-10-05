/**
 * I confini fra i cinque strati di `docs/ARCHITETTURA.md` (`core`, `contract`,
 * `desktop`, `ui`, `cli`), scritti come regole di dependency-cruiser (ADR-50).
 * Li legge `tools/layers.mjs`, che aggiunge le regole che si vedono solo nel
 * testo e stampa il detto; `npm run layers` è la strada.
 *
 * Lo strato di un file è la sua prima cartella. Le frecce vanno in una
 * direzione sola: `core` non conosce nessuno, `contract` conosce `core`,
 * `desktop` tutti e due, `ui` la logica pura e il contratto, `cli` nessuno.
 *
 * Un `import type` sparisce alla compilazione: `tsPreCompilationDeps` lo tiene
 * nel grafo col tipo `type-only`, così le regole che valgono solo per i valori
 * lo lasciano passare.
 */

/** Solo gli import che restano nel JavaScript. */
const VALORE = { dependencyTypesNot: ['type-only'] }

module.exports = {
  forbidden: [
    // ------------------------------------------------------------ le frecce
    {
      name: 'core-verso-fuori',
      comment: 'core non conosce nessuno: né desktop, né ui, né cli.',
      severity: 'error',
      from: { path: '^core/' },
      to: { path: '^(desktop|ui|cli)/' },
    },
    {
      name: 'core-valore-da-contract',
      comment: 'core può importare da contract un tipo, mai un valore: si scrive `import type`.',
      severity: 'error',
      from: { path: '^core/' },
      to: { path: '^contract/', ...VALORE },
    },
    {
      name: 'contract-verso-fuori',
      comment: 'contract conosce core e sé stesso.',
      severity: 'error',
      from: { path: '^contract/' },
      to: { path: '^(desktop|ui|cli)/' },
    },
    {
      name: 'desktop-verso-fuori',
      comment: 'desktop conosce contract e core, mai la webview né la riga di comando.',
      severity: 'error',
      from: { path: '^desktop/' },
      to: { path: '^(ui|cli)/' },
    },
    {
      name: 'ui-verso-fuori',
      comment: 'ui è una webview: conosce contract e la logica pura, mai l’ospite né la riga di comando.',
      severity: 'error',
      from: { path: '^ui/' },
      to: { path: '^(desktop|cli)/' },
    },
    {
      // Anche per i tipi, come prima: la regola delle frecce da sola non lo dice.
      name: 'ui-persistenza-ospite',
      comment: 'Un webview non può toccare la persistenza né l’ospite.',
      severity: 'error',
      from: { path: '^ui/' },
      to: { path: '^core/(dati|azioni|apparato)/' },
    },
    {
      // Così parte anche a costruzione rotta (vedi `cli/main.mjs`).
      name: 'cli-autonoma',
      comment: 'cli non importa niente dal progetto fuori da sé.',
      severity: 'error',
      from: { path: '^cli/' },
      to: { path: '^(core|contract|desktop|ui|tools|tests)/' },
    },

    // ------------------------------------------------------ core/dominio puro
    {
      // Quel che serve dal mondo si riceve come argomento: è quel che fa girare
      // le sue prove con `node --test`, senza Electron e senza un disco.
      name: 'dominio-puro',
      comment: 'core/dominio non importa niente da fuori di sé, tranne core/i18n.',
      severity: 'error',
      from: { path: '^core/dominio/' },
      to: { pathNot: '^core/(dominio|i18n)/' },
    },
    {
      name: 'i18n-sotto-a-tutti',
      comment: 'core/i18n sta sotto a tutti gli strati e non importa niente da fuori di sé.',
      severity: 'error',
      from: { path: '^core/i18n/' },
      to: { pathNot: '^core/i18n/' },
    },

    {
      // Il DOM dei controlli delle impostazioni, per il pannello e per la
      // finestra nativa (ADR-52): sopra il dispositivo multilingua e le parole
      // di tutti, e dal contratto solo i tipi (`core-valore-da-contract`).
      name: 'controlli-leggeri',
      comment: 'core/controlli importa solo core/i18n, le parole di tutti, tipi da contract e React (ADR-56).',
      severity: 'error',
      from: { path: '^core/controlli/' },
      to: { pathNot: String.raw`^(core/(controlli|i18n)/|core/dominio/words\.testi\.ts$|contract/|node_modules/(react|react-dom|scheduler)/)` },
    },

    // ------------------------------------------------------ da guardare a mano
    {
      // Non fa fallire: `tsc` e esbuild lo dicono meglio. Ma un import che non
      // si risolve è un arco che le regole qui sopra non vedono.
      name: 'non-risolto',
      comment: 'Un import relativo che non trova il suo file.',
      severity: 'warn',
      from: {},
      to: { couldNotResolve: true, path: String.raw`^\.` },
    },

    // ----------------------------------------------------------------- cicli
    {
      // Un ciclo non è un guasto finché nessuno dei due file legge a livello di
      // modulo un valore dell’altro, ma è il posto da cui quel guasto nasce.
      name: 'ciclo',
      comment: 'Cicli fra import di valore.',
      severity: 'error',
      from: {},
      to: { circular: true, ...VALORE, viaOnly: VALORE },
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.d\\.ts$' },
    tsPreCompilationDeps: true,
    // `apparato` si risolve come per tsc: nel file di core/apparato/.
    tsConfig: { fileName: 'tsconfig.json' },
    // Il `'./x.js'` di Node16 che sul disco è `x.ts` lo risolve da sé.
    enhancedResolveOptions: { extensions: ['.ts', '.tsx', '.mjs', '.js'] },
    reporterOptions: {
      // Il grafico di `npm run layers -- --grafico`: una casella per cartella.
      archi: { collapsePattern: '^(core|contract|desktop|ui|cli)/[^/]+' },
    },
  },
}
