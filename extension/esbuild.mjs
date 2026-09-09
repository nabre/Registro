// Costruisce l'applicazione. Un solo bersaglio: Electron.
//
// In `dist/` finiscono i sei artefatti che l'applicazione carica:
//
//   principale.cjs   il main process — avvio, finestre, ciclo di vita
//   preload.cjs      il ponte che dà `acquireVsCodeApi()` alle pagine
//   webview.js/.css  l'applicazione del registro
//   proiezione.js/.css  lo schermo per la classe
//   guscio.css       l'aspetto delle due finestre native
//   dialogo.html, impostazioni.html   le due pagine native
//   pdf.worker.mjs   il lettore di pdfjs, che è un file a sé per forza
//
// Il modulo `vscode` non è l'API di un editor: è `src/ambiente/vscode-desktop.ts`,
// risolto da un alias. È il meccanismo che regge tutto — i ventisei file che
// scrivono `import * as vscode from 'vscode'` sono il registro vero e proprio, e
// non sanno né devono sapere chi li ospita.
//
//   node esbuild.mjs                  costruisce una volta
//   node esbuild.mjs --produzione     minifica e lascia fuori le mappe
//   node esbuild.mjs --watch          resta in ascolto (lo usa strumenti/sviluppo.mjs)
//   node esbuild.mjs --test           produce i bundle su cui gira `node --test`

import * as esbuild from 'esbuild'

const watch = process.argv.includes('--watch')
const test = process.argv.includes('--test')
const produzione = process.argv.includes('--produzione')

/**
 * L'alias che regge tutta l'applicazione: per il main process il modulo
 * `vscode` è un file nostro. È il motivo per cui i ventisei file che lo
 * importano non si toccano.
 */
const aliasShim = { vscode: './src/ambiente/vscode-desktop.ts' }

/** Segnala inizio e fine di ogni ciclo: senza, chi guarda non sa quando è pronto. */
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

/**
 * I bundle dell'applicazione.
 *
 * Ogni configurazione porta un `ricarica`, che a `strumenti/sviluppo.mjs` dice
 * che cosa fare quando quel bundle si ricostruisce: `riavvia` vuol dire
 * ammazzare Electron e rilanciarlo — è codice del main process, e un main
 * process non si ricarica; `aggiorna` vuol dire che basta far ricaricare le
 * pagine, che è un decimo del tempo e non riapre le finestre. esbuild ignora la
 * chiave, che non è sua.
 */
export const applicazione = [
  // Il main process. Qui `vscode` è lo shim, ed è la riga che fa girare il
  // registro fuori dall'editor senza cambiargli una virgola.
  {
    ...comune,
    entryPoints: ['desktop/principale.ts'],
    outfile: 'dist/principale.cjs',
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    external: ['electron'],
    alias: aliasShim,
    ricarica: 'riavvia',
  },
  {
    ...comune,
    entryPoints: ['desktop/preload.ts'],
    outfile: 'dist/preload.cjs',
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    external: ['electron'],
    ricarica: 'riavvia',
  },
  // Le due pagine del guscio: si copiano e basta, ma devono stare fra i bundle
  // e non in `desktop/`. Il protocollo `registro://` concede una cartella sola
  // — quella dei bundle — e servire una pagina da fuori vorrebbe dire allargare
  // il permesso per due file che non cambiano mai.
  {
    ...comune,
    entryPoints: ['desktop/dialogo.html', 'desktop/impostazioni.html'],
    outdir: 'dist',
    loader: { '.html': 'copy' },
    ricarica: 'aggiorna',
  },
  // L'aspetto delle due pagine native, che è quello del registro: `guscio.css`
  // importa lo stesso `tema.css` del pannello, ed esbuild scioglie l'`@import`
  // dentro il bundle. Un foglio solo da servire, e una tavolozza sola da
  // cambiare.
  {
    ...comune,
    entryPoints: ['desktop/guscio.css'],
    outfile: 'dist/guscio.css',
    ricarica: 'aggiorna',
  },
  // I due webview: girano in una pagina e non sanno niente di chi li ospita.
  {
    ...comune,
    entryPoints: ['src/webview/principale.ts'],
    outfile: 'dist/webview.js',
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    loader: { '.css': 'css' },
    ricarica: 'aggiorna',
  },
  // Lo schermo per la classe: un secondo bundle, separato apposta — non deve
  // portarsi dietro le viste del registro, che sanno modificare i dati e sono il
  // grosso del codice. La pagina che sta davanti alla classe legge e basta.
  {
    ...comune,
    entryPoints: ['src/webview/proiezione.ts'],
    outfile: 'dist/proiezione.js',
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    loader: { '.css': 'css' },
    ricarica: 'aggiorna',
  },
  // pdfjs carica il proprio worker per percorso, anche dentro Node, e non lo si
  // può impacchettare altrove. Resta ESM perché è così che pdfjs se lo aspetta.
  {
    ...comune,
    entryPoints: ['node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
    outfile: 'dist/pdf.worker.mjs',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    ricarica: 'riavvia',
  },
]

/**
 * I bundle su cui gira `node --test`.
 *
 * Stanno in `dist-prove/` e non insieme agli altri: non sono l'applicazione,
 * sono pezzi dell'applicazione ricompilati in una forma che Node sa importare
 * — ESM, e con `electron` sostituito da un finto. Mescolarli ai bundle veri
 * vorrebbe dire spedire nel pacchetto due copie di mezzo registro.
 *
 * Provano quel che si può provare senza aprire una finestra: la logica pura del
 * dominio, il lettore di PDF, e lo shim — con `electron` sostituito da un finto
 * che dà una cartella temporanea al posto di `userData` e un cestino che
 * cancella e basta.
 */
const prove = [
  {
    ...comune,
    entryPoints: ['src/dominio/indice.ts'],
    outfile: 'dist-prove/dominio.mjs',
    format: 'esm',
    platform: 'neutral',
    sourcemap: false,
  },
  // Il lettore di PDF: sta fuori dal dominio perché usa due librerie e
  // node:zlib, ma è codice che si prova senza un'applicazione intorno — taglia
  // pagine e legge testo — e le prove che lo esercitano valgono più di ogni
  // altra.
  {
    ...comune,
    entryPoints: ['src/dati/pdf.ts'],
    outfile: 'dist-prove/pdf.mjs',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
  },
  {
    ...comune,
    entryPoints: ['node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
    outfile: 'dist-prove/pdf.worker.mjs',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
  },
  // Il manifesto da solo: è l'elenco su cui le prove del menu e delle
  // impostazioni confrontano quel che l'applicazione mostra. Provarle contro una
  // copia scritta a mano vorrebbe dire provare la copia.
  {
    ...comune,
    entryPoints: ['src/manifesto.ts'],
    outfile: 'dist-prove/manifesto.mjs',
    format: 'esm',
    platform: 'neutral',
    sourcemap: false,
  },
  {
    ...comune,
    entryPoints: ['src/ambiente/vscode-desktop.ts'],
    outfile: 'dist-prove/ambiente.mjs',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
    alias: { electron: './test/finto-electron.mjs' },
  },
  {
    ...comune,
    entryPoints: ['desktop/menu.ts'],
    outfile: 'dist-prove/menu.mjs',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
    alias: { electron: './test/finto-electron.mjs' },
  },
]

/** `ricarica` è nostra e non di esbuild: si toglie prima di consegnargliela. */
export function senzaEtichette (configurazioni) {
  return configurazioni.map(({ ricarica: _ricarica, ...resto }) => resto)
}

// Importato da `strumenti/sviluppo.mjs`, questo file non costruisce niente da
// sé: espone `applicazione` e lascia fare a lui. Lanciato da riga di comando,
// costruisce.
if (process.argv[1]?.endsWith('esbuild.mjs')) {
  const configurazioni = senzaEtichette(test ? prove : applicazione)
  if (watch) {
    const contesti = await Promise.all(configurazioni.map((c) => esbuild.context(c)))
    await Promise.all(contesti.map((c) => c.watch()))
  } else {
    await Promise.all(configurazioni.map((c) => esbuild.build(c)))
  }
}
