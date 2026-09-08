// Costruisce i tre artefatti che VS Code carica da dist/:
//   estensione.js  il codice che gira nell'extension host (CommonJS, `vscode` esterno)
//   webview.js     l'applicazione del pannello (IIFE, gira nella sandbox del webview)
//   webview.css    i fogli di stile del pannello
//   proiezione.js  lo schermo per la classe, con il suo foglio di stile
// Con --watch resta in ascolto e stampa le righe che tasks.json cerca col
// problemMatcher ("[watch] build started/finished").
// Con --test produce invece dist/dominio.mjs, il bundle su cui gira node --test.
import * as esbuild from 'esbuild'

const watch = process.argv.includes('--watch')
const test = process.argv.includes('--test')
const produzione = process.argv.includes('--produzione')

/** Segnala inizio e fine di ogni ciclo: senza, il task in background non sa quando è pronto. */
const registraCicli = {
  name: 'registra-cicli',
  setup (build) {
    build.onStart(() => console.log('[watch] build started'))
    build.onEnd((esito) => {
      for (const errore of esito.errors) console.error(errore.text)
      console.log('[watch] build finished')
    })
  },
}

const comune = {
  bundle: true,
  minify: produzione,
  sourcemap: !produzione,
  logLevel: 'silent',
  plugins: [registraCicli],
}

const configurazioni = test
  ? [
      {
        ...comune,
        entryPoints: ['src/dominio/indice.ts'],
        outfile: 'dist/dominio.mjs',
        format: 'esm',
        platform: 'neutral',
        sourcemap: false,
      },
      // Il lettore di PDF: sta fuori dal dominio perché usa due librerie e
      // node:zlib, ma è codice che si prova senza VS Code — taglia pagine e
      // legge testo — e le prove che lo esercitano valgono più di ogni altra.
      {
        ...comune,
        entryPoints: ['src/dati/pdf.ts'],
        outfile: 'dist/pdf.mjs',
        format: 'esm',
        platform: 'node',
        target: 'node18',
        sourcemap: false,
      },
      {
        ...comune,
        entryPoints: ['node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
        outfile: 'dist/pdf.worker.mjs',
        format: 'esm',
        platform: 'node',
        target: 'node18',
        sourcemap: false,
      },
    ]
  : [
      {
        ...comune,
        entryPoints: ['src/estensione.ts'],
        outfile: 'dist/estensione.js',
        format: 'cjs',
        platform: 'node',
        target: 'node18',
        external: ['vscode'],
      },
      // Il worker di pdfjs, che è un file a sé per forza: pdfjs lo carica per
      // percorso, anche quando gira dentro Node, e non lo si può impacchettare
      // dentro l'estensione. Resta ESM perché è così che pdfjs se lo aspetta.
      {
        ...comune,
        entryPoints: ['node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
        outfile: 'dist/pdf.worker.mjs',
        format: 'esm',
        platform: 'node',
        target: 'node18',
      },
      {
        ...comune,
        entryPoints: ['src/webview/principale.ts'],
        outfile: 'dist/webview.js',
        format: 'iife',
        platform: 'browser',
        target: 'es2020',
        loader: { '.css': 'css' },
      },
      // Lo schermo per la classe: un secondo webview, e quindi un secondo
      // bundle. Separato apposta — non deve portarsi dietro le viste del
      // registro, che sanno modificare i dati e sono il grosso del codice: la
      // pagina che sta davanti alla classe legge e basta.
      {
        ...comune,
        entryPoints: ['src/webview/proiezione.ts'],
        outfile: 'dist/proiezione.js',
        format: 'iife',
        platform: 'browser',
        target: 'es2020',
        loader: { '.css': 'css' },
      },
    ]

if (watch) {
  const contesti = await Promise.all(configurazioni.map((c) => esbuild.context(c)))
  await Promise.all(contesti.map((c) => c.watch()))
} else {
  await Promise.all(configurazioni.map((c) => esbuild.build(c)))
}
