// Costruisce l'applicazione. Un solo bersaglio: Electron.
//
// In `dist/` finisce quel che l'applicazione carica:
//
//   principale.cjs   il main process — avvio, finestre, ciclo di vita
//   preload.cjs      il ponte che dà `acquireVsCodeApi()` alle pagine
//   pannello.js/.css l'applicazione del registro
//   proiezione.js/.css  lo schermo per la classe
//   dialog, settings, agenda, welcome  .html/.css/.js   le pagine native
//   pdf.worker.mjs   il lettore di pdfjs, che è un file a sé per forza
//
// Il modulo `apparato` non è l'API di un editor: è `src/environment/platform.ts`,
// risolto da un alias. È il meccanismo che regge tutto — i file che scrivono
// `import * as apparato from 'apparato'` sono il registro vero e proprio, e non
// sanno né devono sapere chi li ospita.
//
//   node esbuild.mjs                  costruisce una volta
//   node esbuild.mjs --produzione     minifica e lascia fuori le mappe
//   node esbuild.mjs --watch          resta in ascolto (lo usa tools/dev.mjs)
//   node esbuild.mjs --test           produce i bundle su cui gira `node --test`

import { cpSync, mkdirSync, readFileSync } from 'node:fs'

import * as esbuild from 'esbuild'

/**
 * Che l'identità Windows sia una sola, scritta nei due posti che la vogliono.
 *
 * L'*AppUserModelID* va dichiarato a mano dal main process — serve prima che un
 * pacchetto esista — e va dato a electron-builder, che lo scrive nel
 * collegamento dell'installer. Due file, e nessun modo di ridurli a uno: uno
 * costruisce il pacchetto, l'altro ci gira dentro.
 *
 * Quel che si può togliere è il *silenzio* della divergenza. Se i due valori si
 * separano, il registro appuntato alla barra delle applicazioni non si riapre e
 * le notifiche si sdoppiano nel centro notifiche di Windows — un guasto che
 * salta fuori solo sulla macchina di chi ha installato, settimane dopo. Qui la
 * costruzione si ferma subito e dice quali sono i due valori.
 *
 * `electron-builder.json` è JSON con i commenti — li legge con JSON5 — e i
 * commenti qui sono tutti di riga: toglierli basta per leggerlo con `JSON.parse`.
 * Il `$` in coda all'espressione non c'è apposta: su un file con fine riga alla
 * Windows resterebbe il ritorno a capo dopo il commento, e `.` non lo attraversa.
 */
function verificaIdentita () {
  const senzaCommenti = readFileSync('electron-builder.json', 'utf8')
    .split('\n')
    .map((riga) => riga.replace(/^\s*\/\/.*/, ''))
    .join('\n')
  const { appId } = JSON.parse(senzaCommenti)

  const sorgente = readFileSync('src/environment/notifications.ts', 'utf8')
  const dichiarato = /^const IDENTITA = '([^']+)'$/m.exec(sorgente)?.[1]

  if (!dichiarato) {
    throw new Error('src/environment/notifications.ts: non si trova più la costante IDENTITA')
  }
  if (dichiarato !== appId) {
    throw new Error(
      `l'identità Windows è scritta in due modi: '${dichiarato}' in ` +
      `src/environment/notifications.ts e '${appId}' in electron-builder.json`,
    )
  }
}

/**
 * I caratteri standard del PDF, copiati accanto ai bundle.
 *
 * Sono i quattordici che un PDF può nominare senza portarseli dentro, e pdfjs
 * li legge da una cartella: gli servono per sapere quanto è larga una lettera —
 * cioè, per il registro, dove sta un nome sulla pagina. Vivono dentro il
 * pacchetto di pdfjs, e nell'applicazione installata `node_modules` non c'è:
 * ottocento chilobyte copiati qui una volta per costruzione.
 */
function copiaCaratteriPdf (dove) {
  mkdirSync(dove, { recursive: true })
  cpSync('node_modules/pdfjs-dist/standard_fonts', dove, { recursive: true })
}

const watch = process.argv.includes('--watch')
const test = process.argv.includes('--test')
const produzione = process.argv.includes('--produzione')

/**
 * L'alias che regge tutta l'applicazione: per il main process il modulo
 * `apparato` è un file nostro. È il motivo per cui i trentun file che lo
 * importano non si toccano.
 */
const aliasApparato = { apparato: './src/environment/platform.ts' }

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
 * `import.meta.url` dentro un bundle CommonJS.
 *
 * pdfjs, quando gira in Node, si procura il proprio `require` con
 * `createRequire(import.meta.url)`: è così che raggiunge i dati dei caratteri
 * standard e le tabelle dei codici che stanno dentro il suo pacchetto. Nel
 * bundle del main process, che è CommonJS, `import.meta` non esiste: la riga
 * falliva con «The argument 'filename' must be a file URL object… Received
 * undefined», e da lì in poi pdfjs lavorava senza poter leggere niente dal
 * disco — lamentandosi a ogni avvio.
 *
 * Qui gli si dà l'indirizzo vero del bundle, che in CommonJS si ricava da
 * `__filename`. Vale per i bundle Node compilati in CJS; quelli ESM ce l'hanno
 * già per conto loro.
 */
const urlDelModulo = {
  banner: {
    js: "const __urlDelModulo = require('node:url').pathToFileURL(__filename).href;",
  },
  define: { 'import.meta.url': '__urlDelModulo' },
}

/** Le pagine native: una cartella ciascuna in `shell/pages/`, con lo stesso nome dei file. */
const PAGINE_NATIVE = ['dialog', 'settings', 'agenda', 'welcome', 'splash']

/** `{ dialog: 'shell/pages/dialog/dialog.ts', … }`: le chiavi sono i nomi in `dist/`. */
function filePagine (estensione) {
  return Object.fromEntries(
    PAGINE_NATIVE.map((pagina) => [pagina, `shell/pages/${pagina}/${pagina}.${estensione}`]),
  )
}

/**
 * I bundle dell'applicazione.
 *
 * Ogni configurazione porta un `ricarica`, che a `tools/dev.mjs` dice
 * che cosa fare quando quel bundle si ricostruisce: `riavvia` vuol dire
 * ammazzare Electron e rilanciarlo — è codice del main process, e un main
 * process non si ricarica; `aggiorna` vuol dire che basta far ricaricare le
 * pagine, che è un decimo del tempo e non riapre le finestre. esbuild ignora la
 * chiave, che non è sua.
 */
export const applicazione = [
  // Il main process. Qui `apparato` è il modulo nostro, ed è la riga che fa girare
  // registro fuori dall'editor senza cambiargli una virgola.
  {
    ...comune,
    ...urlDelModulo,
    entryPoints: ['shell/main.ts'],
    outfile: 'dist/main.cjs',
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    // koffi e node-llama-cpp restano fuori dal bundle: sono moduli nativi, e i
    // loro `.node` si caricano per percorso — impacchettarli vorrebbe dire
    // cercarli dove non ci sono. node-llama-cpp porta anche i binari di
    // llama.cpp per ogni piattaforma, e la sua struttura di cartelle è il modo
    // in cui sceglie il proprio: appiattirla li perde tutti.
    // Nell'applicazione installata stanno in `app.asar.unpacked`, vedi
    // `electron-builder.json`.
    external: ['electron', 'koffi', 'node-llama-cpp'],
    alias: aliasApparato,
    ricarica: 'riavvia',
  },
  {
    ...comune,
    entryPoints: ['shell/preload.ts'],
    outfile: 'dist/preload.cjs',
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    external: ['electron'],
    ricarica: 'riavvia',
  },
  // Le pagine native: `shell/pages/<pagina>/`, una cartella per pagina con il
  // suo HTML, il suo foglio e il suo script. In `dist/` escono piatte —
  // `dialog.html`, `dialog.css`, `dialog.js` — perché il protocollo
  // `registro://` concede una cartella sola, quella dei bundle, e servire una
  // pagina da fuori vorrebbe dire allargare il permesso.
  //
  // L'HTML si copia e basta. Lo script è un bundle vero, e porta con sé il
  // foglio della pagina, che a sua volta importa `shared/base.css` e i colori
  // del registro: esbuild scioglie gli `@import`, e ogni pagina ha un foglio
  // solo da caricare. Niente di inline, quindi la Content-Security-Policy delle
  // pagine può dire `script-src registro:` e basta.
  {
    ...comune,
    entryPoints: filePagine('html'),
    outdir: 'dist',
    loader: { '.html': 'copy' },
    ricarica: 'aggiorna',
  },
  {
    ...comune,
    entryPoints: filePagine('ts'),
    outdir: 'dist',
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    loader: { '.css': 'css' },
    ricarica: 'aggiorna',
  },
  // I due webview: girano in una pagina e non sanno niente di chi li ospita.
  {
    ...comune,
    entryPoints: ['src/ui/main.ts'],
    outfile: 'dist/panel.js',
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
    entryPoints: ['src/ui/projection.ts'],
    outfile: 'dist/projection.js',
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    loader: { '.css': 'css' },
    ricarica: 'aggiorna',
  },
  // L'assistente staccato: un terzo bundle, separato per lo stesso motivo del
  // secondo — non deve portarsi dietro le viste del registro, che sanno
  // modificare i dati. Questa finestra scrive una domanda e legge una risposta,
  // e di tutto il documento d'anno sa due fatti: se è acceso e quale modello
  // risponde.
  {
    ...comune,
    entryPoints: ['src/ui/assistantWindow.ts'],
    outfile: 'dist/assistant.js',
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
 * Stanno in `dist-tests/` e non insieme agli altri: non sono l'applicazione,
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
    entryPoints: ['tests/helpers/documents.ts'],
    outfile: 'dist-tests/documents.mjs',
    format: 'esm',
    platform: 'node',
    sourcemap: false,
    alias: { electron: './tests/helpers/fake-electron.mjs' },
  },
  {
    ...comune,
    entryPoints: ['src/domain/index.ts'],
    outfile: 'dist-tests/domain.mjs',
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
    entryPoints: ['src/data/pdf.ts'],
    outfile: 'dist-tests/pdf.mjs',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
  },
  {
    ...comune,
    entryPoints: ['node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
    outfile: 'dist-tests/pdf.worker.mjs',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
  },
  // L'archivio ZIP, che è codice puro come il dominio: byte dentro, byte
  // fuori, e `node:zlib` in mezzo. Non sa niente di apparato e non ha bisogno di
  // alias.
  {
    ...comune,
    entryPoints: ['src/data/zip.ts'],
    outfile: 'dist-tests/zip.mjs',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
  },
  // Il documento dell'anno: qui il file system c'è davvero — si aprono e si
  // scrivono archivi in una cartella temporanea — e quindi passa dallo shim,
  // con `electron` sostituito dal finto come per il resto dell'ambiente.
  {
    ...comune,
    entryPoints: ['src/data/package.ts'],
    outfile: 'dist-tests/package.mjs',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
    alias: { ...aliasApparato, electron: './tests/helpers/fake-electron.mjs' },
  },
  // L'archivio intero, con sotto il documento e lo ZIP: è il pezzo che tocca
  // il disco per conto di tutto il registro, e provarlo vuol dire creare un
  // anno vero in una cartella temporanea e rileggerlo.
  {
    ...comune,
    entryPoints: ['src/data/archive.ts'],
    outfile: 'dist-tests/archive.mjs',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
    alias: { ...aliasApparato, electron: './tests/helpers/fake-electron.mjs' },
  },
  // Il deposito: i file dell'anno dentro il documento, e le copie che se ne
  // materializzano per chi sa aprire solo i file.
  {
    ...comune,
    entryPoints: ['src/data/store.ts'],
    outfile: 'dist-tests/store.mjs',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
    alias: { ...aliasApparato, electron: './tests/helpers/fake-electron.mjs' },
  },
  // Lo strato dei dati tutto insieme, per le prove che lo esercitano come lo
  // esercita l'applicazione: un grafo solo, e quindi un anno in uso solo e un
  // deposito solo. Vedi `tests/helpers/data.ts`, dove c'è il perché.
  {
    ...comune,
    entryPoints: ['tests/helpers/data.ts'],
    outfile: 'dist-tests/data.mjs',
    external: ['node-llama-cpp'],
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
    alias: { ...aliasApparato, electron: './tests/helpers/fake-electron.mjs' },
  },
  // Il livello API con sotto l'archivio vero: le procedure si provano come le
  // esercita l'applicazione — un documento su disco, un registro dentro — e
  // non contro un archivio finto, perché metà di quel che una procedura
  // controlla è «questa voce esiste ancora».
  //
  // Un grafo solo insieme ai dati, per la stessa ragione scritta in
  // `tests/helpers/data.ts`: l'anno in uso e il deposito sono variabili di
  // modulo, e due bundle vorrebbero dire due registri che non si conoscono.
  {
    ...comune,
    entryPoints: ['tests/helpers/api.ts'],
    outfile: 'dist-tests/api.mjs',
    external: ['node-llama-cpp'],
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
    alias: { ...aliasApparato, electron: './tests/helpers/fake-electron.mjs' },
  },
  // I due traslochi: dal mucchio alle cartelle, e dalle cartelle ai documenti.
  // Sono codice che si esegue una volta sola sui dati veri di un docente, ed è
  // esattamente il codice che va provato prima e non dopo.
  {
    ...comune,
    entryPoints: ['src/data/years.ts'],
    outfile: 'dist-tests/years.mjs',
    external: ['node-llama-cpp'],
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
    alias: { ...aliasApparato, electron: './tests/helpers/fake-electron.mjs' },
  },
  // Le sezioni della pagina Impostazioni: quali chiavi del manifesto finiscono
  // sotto quale argomento. È codice dell'interfaccia ma non tocca il DOM —
  // dati e due funzioni pure — ed è l'unica parte di quella pagina che può
  // rompersi in silenzio: un'impostazione nuova che non finisce in nessuna
  // sezione esiste e non si vede.
  {
    ...comune,
    entryPoints: ['src/ui/views/settings/sections.ts'],
    outfile: 'dist-tests/settingsSections.mjs',
    format: 'esm',
    platform: 'neutral',
    sourcemap: false,
  },
  // Che cosa si dice all'assistente, parte per parte: la riga che decide se il
  // nome di una persona in formazione esce dal registro quando chi insegna ha
  // detto di no. Non tocca il DOM, e un difetto qui non si vedrebbe guardando
  // lo schermo — si vedrebbe leggendo il prompt di un modello, cioè mai.
  {
    ...comune,
    entryPoints: ['src/ui/assistant/parts.ts'],
    outfile: 'dist-tests/contextParts.mjs',
    format: 'esm',
    platform: 'neutral',
    sourcemap: false,
  },
  // Come si legge una risposta del modello: il parser che la divide in
  // tabelle, elenchi e paragrafi. È codice dell'interfaccia e non tocca il DOM
  // — una funzione pura e basta — ed è la metà che può sbagliare in silenzio:
  // una colonna contata male disegna una cella in meno, e chi guarda dà la
  // colpa al modello.
  {
    ...comune,
    entryPoints: ['src/ui/assistant/format.ts'],
    outfile: 'dist-tests/answerFormat.mjs',
    format: 'esm',
    platform: 'neutral',
    sourcemap: false,
  },
  // Il livello LLM da solo: le quattro chiavi di ogni uso, il controllo
  // dell'indirizzo e la prontezza. Si prova senza servizio e senza archivio —
  // è la parte che decide **dove finiscono** i dati delle persone in
  // formazione, e non ha bisogno di nessuna delle due cose per sbagliarlo.
  {
    ...comune,
    entryPoints: ['tests/helpers/llm.ts'],
    outfile: 'dist-tests/llm.mjs',
    external: ['node-llama-cpp'],
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
    alias: { ...aliasApparato, electron: './tests/helpers/fake-electron.mjs' },
  },
  // La dettatura da sola: la guardia sul percorso del programma, il taglio
  // della durata, il WAV e gli argomenti di whisper. Si prova senza microfono e
  // senza whisper installato — è la parte che decide **che cosa viene
  // eseguito**, e per sbagliarlo non ha bisogno di nessuno dei due.
  {
    ...comune,
    entryPoints: ['tests/helpers/dictation.ts'],
    outfile: 'dist-tests/dictation.mjs',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
    alias: { ...aliasApparato, electron: './tests/helpers/fake-electron.mjs' },
  },
  // Il manifesto da solo: è l'elenco su cui le prove del menu e delle
  // impostazioni confrontano quel che l'applicazione mostra. Provarle contro una
  // copia scritta a mano vorrebbe dire provare la copia.
  {
    ...comune,
    entryPoints: ['src/manifest.ts'],
    outfile: 'dist-tests/manifest.mjs',
    format: 'esm',
    platform: 'neutral',
    sourcemap: false,
  },
  // Dove stanno le finestre: si prova da solo, perché è l'unico pezzo
  // dell'ambiente che deve reggere uno schermo staccato fra una sessione e
  // l'altra — e quel caso si costruisce cambiando gli schermi del banco.
  {
    ...comune,
    entryPoints: ['src/environment/placement.ts'],
    outfile: 'dist-tests/placement.mjs',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
    alias: { electron: './tests/helpers/fake-electron.mjs' },
  },
  // Le impostazioni da sole: la dogana e l'elenco che le due superfici
  // mostrano. Si prova a parte dall'apparato perché quel che qui si guarda non
  // è la facciata ma le due funzioni che decidono **che cosa entra nel file** e
  // **che cosa si vede** — un `formato` non fatto rispettare e una chiave che
  // sparisce da una superficie sola non si vedono da nessun'altra parte.
  {
    ...comune,
    entryPoints: ['src/environment/settings.ts'],
    outfile: 'dist-tests/settings.mjs',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
    alias: { electron: './tests/helpers/fake-electron.mjs' },
  },
  {
    ...comune,
    entryPoints: ['src/environment/platform.ts'],
    outfile: 'dist-tests/environment.mjs',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
    alias: { electron: './tests/helpers/fake-electron.mjs' },
  },
  // L'icona accanto all'orologio: qui si prova la traduzione da voci nostre a
  // menu di Electron, che è tutto quel che questo file fa. Che cosa ci finisca
  // dentro lo decide `src/domain/tray.ts`, provato con il resto del dominio.
  {
    ...comune,
    entryPoints: ['src/environment/tray.ts'],
    outfile: 'dist-tests/tray.mjs',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
    alias: { electron: './tests/helpers/fake-electron.mjs' },
  },
  {
    ...comune,
    entryPoints: ['shell/windows/menu.ts'],
    outfile: 'dist-tests/menu.mjs',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
    alias: { electron: './tests/helpers/fake-electron.mjs' },
  },
]

/** `ricarica` è nostra e non di esbuild: si toglie prima di consegnargliela. */
function senzaEtichette (configurazioni) {
  return configurazioni.map(({ ricarica: _ricarica, ...resto }) => resto)
}

// Importato da `tools/dev.mjs`, questo file non costruisce niente da
// sé: espone `applicazione` e lascia fare a lui. Lanciato da riga di comando,
// costruisce.
if (process.argv[1]?.endsWith('esbuild.mjs')) {
  verificaIdentita()
  copiaCaratteriPdf(test ? 'dist-tests/pdf-fonts' : 'dist/pdf-fonts')
  const configurazioni = senzaEtichette(test ? prove : applicazione)
  if (watch) {
    const contesti = await Promise.all(configurazioni.map((c) => esbuild.context(c)))
    await Promise.all(contesti.map((c) => c.watch()))
  } else {
    await Promise.all(configurazioni.map((c) => esbuild.build(c)))
  }
}
