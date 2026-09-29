// Che cosa guarda `npm run knip`: file, export e dipendenze che nessuno usa.
//
// È TypeScript e non `knip.json` perché gli ingressi veri non si scrivono a
// mano: sono i bundle di `esbuild.mjs` e i sorgenti che le prove compilano al
// volo (`importaSorgente('core/dati/oauth.ts')`, o un `export { x } from
// './core/…'` scritto in un testo). Per knip sono stringhe, non import: senza
// ricavarle qui, metà del registro sembrerebbe morta. Un bundle nuovo o una
// prova nuova entrano da sé.
//
// Fuori da `tsconfig.json` e da ogni blocco di `eslint.config.mjs`: la legge
// solo knip, con jiti.

import { existsSync, readdirSync, readFileSync } from 'node:fs'

/**
 * Le cartelle da cui un bundle o una prova può prendere un sorgente. `tools/` e
 * `cli/` no: i loro ingressi sono già tutti per glob o in `package.json`.
 */
const CARTELLE = 'core|contract|desktop|ui|tests'

/** Un percorso fra apici, dalla radice o con `./` davanti: `'core/dati/zip.ts'`. */
const PERCORSO = new RegExp(`['"\`](?:\\./)?((?:${CARTELLE})/[\\w./-]+\\.(?:ts|mjs|cjs))['"\`]`, 'g')

/** Tutti i file di codice sotto `cartella`, con le barre in avanti. */
function fileSotto (cartella: string, trovati: string[] = []): string[] {
  for (const voce of readdirSync(cartella, { withFileTypes: true })) {
    const percorso = `${cartella}/${voce.name}`
    if (voce.isDirectory()) fileSotto(percorso, trovati)
    else if (/\.(?:mjs|ts)$/.test(voce.name)) trovati.push(percorso)
  }
  return trovati
}

/**
 * Gli `entryPoints: ['…']` scritti per esteso in `esbuild.mjs`: knip li trova da
 * sé, e ripeterli gli fa dire «ingresso ridondante».
 */
const giàVisti = new Set(
  [...readFileSync('esbuild.mjs', 'utf8').matchAll(/entryPoints: \['([^']+)'\]/g)].map(([, file]) => file),
)

/**
 * I percorsi citati come stringa da `esbuild.mjs` (`provaNode`, `provaNeutra`)
 * e dalle prove, che esistono davvero. Le prove stesse sono già ingressi.
 */
function citatiComeStringa (): string[] {
  const dove = ['esbuild.mjs', ...fileSotto('tests')]
  const citati = new Set<string>()
  for (const file of dove) {
    for (const [, percorso] of readFileSync(file, 'utf8').matchAll(PERCORSO)) {
      if (existsSync(percorso) && !percorso.endsWith('.test.mjs') && !percorso.endsWith('.spec.ts')) citati.add(percorso)
    }
  }
  return [...citati].filter((percorso) => !giàVisti.has(percorso)).sort()
}

/** Le pagine native: `PAGINE_NATIVE` di `esbuild.mjs`, una cartella con lo stesso nome dei file. */
function pagineNative (): string[] {
  const elenco = /const PAGINE_NATIVE = \[([^\]]*)\]/.exec(readFileSync('esbuild.mjs', 'utf8'))?.[1] ?? ''
  return [...elenco.matchAll(/'([\w-]+)'/g)]
    .map(([, pagina]) => `desktop/shell/pages/${pagina}/${pagina}.ts`)
    .filter((file) => existsSync(file) && !giàVisti.has(file))
}

export default {
  // `esbuild.mjs`, `cli/registro.mjs` e le prove `node --test` knip li ricava
  // già da `package.json`: qui c'è quel che non vede.
  entry: [
    // Gli attrezzi si lanciano uno per uno (`npm run <nome>`, `tools/ci.mjs`);
    // `common.mjs` no, e resta sotto esame come ogni altro modulo.
    'tools/**/*.{mjs,cjs}',
    '!tools/common.mjs',
    // Lo lancia l'installatore (`electron-builder.json`), non uno script.
    'cli/disinstalla.mjs',
    '.claude/**/*.mjs',
    // Le prove dell'interfaccia (`npm run ui-tests`): le lancia Playwright con
    // la sua configurazione, che sta in `tests/interfaccia/` e non alla radice
    // dove il plugin di knip la cercherebbe.
    'tests/interfaccia/playwright.config.ts',
    'tests/interfaccia/**/*.spec.ts',
    // Non gira: lo legge `tsc`, che fallisce se un suo `@ts-expect-error` smette
    // di trovare l'errore (ADR-47). Nessuno lo importa, ed è giusto così.
    'tests/ui/aggiornaSenzaPosto.ts',
    // `tests/i18n/` legge ogni catalogo intero (`provaDeiCataloghi` di `esbuild.mjs`).
    '**/*.testi.ts',
    // I bundle dell'applicazione e delle prove, e i sorgenti compilati al volo.
    ...pagineNative(),
    ...citatiComeStringa(),
  ],
  project: [
    '{core,contract,desktop,ui,cli,tests,tools}/**/*.{ts,mjs,cjs}',
    '*.mjs',
    '.claude/**/*.mjs',
  ],
  ignoreDependencies: [
    // Arriva con electron-builder: `tools/signing.mjs` ne prende `buildBlockMap`
    // per rifare le mappe dei blocchi dopo la firma. Dichiararla a parte
    // potrebbe portarne una seconda copia, diversa da quella che ha impacchettato.
    'app-builder-lib',
    // Il plugin di knip la deduce da `"testRunner": "command"` di
    // `stryker.config.json`, ma arriva già con `@stryker-mutator/core`.
    '@stryker-mutator/command-runner',
  ],
  ignoreBinaries: [
    // Del sistema, fuori da Windows: `tools/fumo.mjs` cerca il registro rimasto acceso.
    'pgrep',
  ],
}
