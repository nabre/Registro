// Costruisce l'applicazione Electron. In `dist/`:
//
//   main.cjs, preload.cjs              main process e ponte delle pagine
//   panel.js, projection.js, assistant.js  il registro, lo schermo per la
//                                      classe, l'assistente staccato
//   dialog, settings, welcome, splash  le pagine native (.html/.css/.js)
//   pdf.worker.mjs                     il worker di pdfjs
//
// Il modulo `apparato` è `src/environment/platform.ts`, risolto da un alias: il
// codice che lo importa non sa chi lo ospita.
//
//   node esbuild.mjs                  costruisce una volta
//   node esbuild.mjs --produzione     minifica e lascia fuori le mappe
//   node esbuild.mjs --test           i bundle di `node --test`
//   node esbuild.mjs --ui             i bundle delle prove Python di `tests/ui/`
//
// Il modo sviluppo, in ascolto, sta in `tools/dev.mjs` e importa `applicazione`.

import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import * as esbuild from 'esbuild'

/**
 * Ferma la costruzione se l'AppUserModelID diverge fra `electron-builder.json`,
 * `src/environment/notifications.ts` e `src/cli/disinstalla.mjs`: diverso,
 * l'icona appuntata non riapre il registro e le notifiche si sdoppiano.
 *
 * `nsis.guid` deve restare l'UUID v5 di `IDENTITA_VECCHIA`
 * (`src/data/formerName.ts`), o l'aggiornamento si installa accanto invece di sostituire.
 *
 * `electron-builder.json` ha solo commenti di riga: toglierli basta per
 * `JSON.parse`. Niente `$` nell'espressione: con CRLF `.` non attraversa il `\r`.
 */
function verificaIdentita () {
  const senzaCommenti = readFileSync('electron-builder.json', 'utf8')
    .split('\n')
    .map((riga) => riga.replace(/^\s*\/\/.*/, ''))
    .join('\n')
  const { appId, nsis } = JSON.parse(senzaCommenti)

  for (const file of ['src/environment/notifications.ts', 'src/cli/disinstalla.mjs']) {
    const sorgente = readFileSync(file, 'utf8')
    const dichiarato = /^const IDENTITA = '([^']+)'/m.exec(sorgente)?.[1]
    if (!dichiarato) {
      throw new Error(`${file}: non si trova più la costante IDENTITA`)
    }
    if (dichiarato !== appId) {
      throw new Error(
        `l'identità Windows è scritta in due modi: '${dichiarato}' in ` +
        `${file} e '${appId}' in electron-builder.json`,
      )
    }
  }

  const vecchia = /^export const IDENTITA_VECCHIA = '([^']+)'/m
    .exec(readFileSync('src/data/formerName.ts', 'utf8'))?.[1]
  if (!vecchia) throw new Error('src/data/formerName.ts: non si trova più la costante IDENTITA_VECCHIA')
  const atteso = uuidDiElectronBuilder(vecchia)
  if (nsis?.guid !== atteso) {
    throw new Error(
      `nsis.guid in electron-builder.json è '${nsis?.guid}', e deve restare '${atteso}': ` +
      `il GUID dell'installazione di prima, ricavato da '${vecchia}'`,
    )
  }
}

/**
 * L'UUID v5 che electron-builder ricava dall'`appId` senza `nsis.guid`: SHA-1
 * dei sedici byte dello spazio dei nomi (i byte, non il testo) e del nome
 * (`NsisTarget.js` di `app-builder-lib`, `uuid.js` di `builder-util-runtime`).
 */
function uuidDiElectronBuilder (nome) {
  const spazio = Buffer.from('50e065bc313411e69bab38c9862bdaf3', 'hex')
  const impronta = createHash('sha1').update(spazio).update(nome, 'ascii').digest()
  impronta[6] = (impronta[6] & 0x0f) | 0x50
  impronta[8] = (impronta[8] & 0x3f) | 0x80
  const esa = impronta.subarray(0, 16).toString('hex')
  return [esa.slice(0, 8), esa.slice(8, 12), esa.slice(12, 16), esa.slice(16, 20), esa.slice(20)].join('-')
}

/**
 * I quattordici caratteri standard del PDF, copiati accanto ai bundle: pdfjs li
 * legge da una cartella per misurare le lettere, e nel pacchetto `node_modules` non c'è.
 */
function copiaCaratteriPdf (dove) {
  mkdirSync(dove, { recursive: true })
  cpSync('node_modules/pdfjs-dist/standard_fonts', dove, { recursive: true })
}

const test = process.argv.includes('--test')
const ui = process.argv.includes('--ui')
const produzione = process.argv.includes('--produzione')

/** Il modulo `apparato` risolto nel file nostro. */
const aliasApparato = { apparato: './src/environment/platform.ts' }

const comune = {
  bundle: true,
  minify: produzione,
  sourcemap: !produzione,
  logLevel: 'silent',
}

/** Il worker di pdfjs, che si costruisce per l'applicazione e per le prove. */
const WORKER_PDFJS = 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'

/**
 * `import.meta.url` dentro un bundle CommonJS, ricavato da `__filename`: pdfjs
 * in Node fa `createRequire(import.meta.url)` per leggere i propri dati, e in
 * CJS `import.meta` non esiste.
 */
const urlDelModulo = {
  banner: {
    js: "const __urlDelModulo = require('node:url').pathToFileURL(__filename).href;",
  },
  define: { 'import.meta.url': '__urlDelModulo' },
}

/** Le pagine native: una cartella ciascuna in `shell/pages/`, con lo stesso nome dei file. */
const PAGINE_NATIVE = ['dialog', 'settings', 'welcome', 'splash']

/** `{ dialog: 'shell/pages/dialog/dialog.ts', … }`: le chiavi sono i nomi in `dist/`. */
function filePagine (estensione) {
  return Object.fromEntries(
    PAGINE_NATIVE.map((pagina) => [pagina, `shell/pages/${pagina}/${pagina}.${estensione}`]),
  )
}

/**
 * I bundle dell'applicazione. `ricarica` dice a `tools/dev.mjs` che cosa fare
 * quando il bundle cambia: `riavvia` rilancia Electron (main process),
 * `aggiorna` ricarica solo le pagine. Non è una chiave di esbuild.
 */
export const applicazione = [
  // Il main process.
  {
    ...comune,
    ...urlDelModulo,
    entryPoints: ['shell/main.ts'],
    outfile: 'dist/main.cjs',
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    // node-llama-cpp resta fuori: i suoi `.node` e i binari di llama.cpp si
    // trovano per percorso nella sua struttura di cartelle. Nel pacchetto stanno
    // in `app.asar.unpacked` (vedi `electron-builder.json`).
    external: ['electron', 'node-llama-cpp'],
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
  // Le pagine native (`shell/pages/<pagina>/`) escono piatte in `dist/`, perché
  // `registro://` concede la sola cartella dei bundle. L'HTML si copia; lo
  // script porta con sé il foglio con gli `@import` sciolti. Niente inline, così
  // la CSP può dire `script-src registro:` e basta.
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
  // Il pannello del registro.
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
  // Lo schermo per la classe: bundle separato perché legge e basta, senza le
  // viste del registro che modificano i dati.
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
  // L'assistente staccato, separato per lo stesso motivo: del documento sa solo
  // se l'assistente è acceso e quale modello risponde.
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
  // pdfjs carica il worker per percorso, anche in Node, e lo vuole ESM.
  {
    ...comune,
    entryPoints: [WORKER_PDFJS],
    outfile: 'dist/pdf.worker.mjs',
    format: 'esm',
    platform: 'node',
    target: 'node18',
    ricarica: 'riavvia',
  },
]

/** `electron` sostituito dal finto, per i bundle che toccano l'ambiente. */
const CON_FINTO = { electron: './tests/helpers/fake-electron.mjs' }

/** Il finto e in più `apparato`, per chi passa dallo shim come l'applicazione. */
const CON_FINTO_E_APPARATO = { ...aliasApparato, ...CON_FINTO }

/** Un bundle di prova per Node: ESM, senza mappe, `node18`; `extra` di solito è l'alias del finto. */
function provaNode (entrata, uscita, extra = {}) {
  return {
    ...comune,
    entryPoints: [entrata],
    outfile: uscita,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: false,
    ...extra,
  }
}

/** Un bundle di prova senza Node e senza DOM: la logica pura. */
function provaNeutra (entrata, uscita) {
  return {
    ...comune,
    entryPoints: [entrata],
    outfile: uscita,
    format: 'esm',
    platform: 'neutral',
    sourcemap: false,
  }
}

/**
 * I file `*.testi.ts` sotto `cartella`. `provaDeiCataloghi` li mette in un
 * bundle solo con il dispositivo che li legge, così un catalogo nuovo entra da
 * sé in `tests/i18n/`, che controlla quel che il compilatore non vede (scelte
 * per valore, testi vuoti).
 */
function cataloghi (cartella, trovati = []) {
  for (const voce of readdirSync(cartella, { withFileTypes: true })) {
    const percorso = join(cartella, voce.name)
    if (voce.isDirectory()) cataloghi(percorso, trovati)
    else if (voce.name.endsWith('.testi.ts')) trovati.push(percorso.split(/[\\/]+/).join('/'))
  }
  return trovati
}

function provaDeiCataloghi () {
  const file = [...cataloghi('src'), ...cataloghi('shell')].sort()
  const righe = [
    "export * from './src/i18n/index.ts'",
    ...file.map((f, i) => `import * as c${i} from './${f}'`),
    `export const CATALOGHI = [${file.map((f, i) => `{ file: '${f}', esporta: c${i} }`).join(', ')}]`,
  ]
  return {
    ...comune,
    stdin: { contents: righe.join('\n'), resolveDir: '.', sourcefile: 'cataloghi.ts', loader: 'ts' },
    outfile: 'dist-tests/i18n.mjs',
    format: 'esm',
    platform: 'neutral',
    sourcemap: false,
  }
}

/**
 * I bundle di `node --test`, in `dist-tests/` perché non finiscano nel
 * pacchetto: pezzi dell'applicazione in ESM, con `electron` sostituito da un
 * finto (cartella temporanea come `userData`, cestino che cancella e basta).
 */
const prove = [
  // Il dispositivo multilingua e tutti i cataloghi: vedi `provaDeiCataloghi`.
  provaDeiCataloghi(),
  provaNode('tests/helpers/documents.ts', 'dist-tests/documents.mjs', { alias: CON_FINTO }),
  provaNeutra('src/domain/index.ts', 'dist-tests/domain.mjs'),
  // Il lettore di PDF: fuori dal dominio (librerie e node:zlib), ma si prova senza applicazione.
  provaNode('src/data/pdf.ts', 'dist-tests/pdf.mjs'),
  provaNode(WORKER_PDFJS, 'dist-tests/pdf.worker.mjs'),
  // L'archivio ZIP: byte dentro e fuori, senza alias.
  provaNode('src/data/zip.ts', 'dist-tests/zip.mjs'),
  // Il documento dell'anno, su file veri in una cartella temporanea: passa dallo shim.
  provaNode('src/data/package.ts', 'dist-tests/package.mjs', { alias: CON_FINTO_E_APPARATO }),
  // Il deposito: i file dell'anno nel documento e le loro copie su disco.
  provaNode('src/data/store.ts', 'dist-tests/store.mjs', { alias: CON_FINTO_E_APPARATO }),
  // Lo strato dei dati in un grafo solo: un anno in uso e un deposito solo
  // (vedi `tests/helpers/data.ts`). Lo usa anche `tools/sample.mjs`.
  provaNode('tests/helpers/data.ts', 'dist-tests/data.mjs', {
    external: ['node-llama-cpp'],
    alias: CON_FINTO_E_APPARATO,
  }),
  // Il livello API sull'archivio vero, in un grafo solo con i dati: anno in uso
  // e deposito sono variabili di modulo, e due bundle sarebbero due registri.
  provaNode('tests/helpers/api.ts', 'dist-tests/api.mjs', {
    external: ['node-llama-cpp'],
    alias: CON_FINTO_E_APPARATO,
  }),
  // I traslochi verso i documenti d'anno: girano una volta sola sui dati veri.
  provaNode('src/data/years.ts', 'dist-tests/years.mjs', {
    external: ['node-llama-cpp'],
    alias: CON_FINTO_E_APPARATO,
  }),
  // Il trasloco del nome: cartella dei dati da «Registro docenti» a
  // «Regiclass» e percorsi scritti dentro. Solo `node:`.
  provaNode('src/data/formerName.ts', 'dist-tests/formerName.mjs'),
  // Le sezioni della pagina Impostazioni, senza DOM: un'impostazione che non
  // finisce in nessuna sezione esiste e non si vede.
  provaNeutra('src/ui/views/settings/sections.ts', 'dist-tests/settingsSections.mjs'),
  // Che cosa si dice all'assistente, parte per parte: decide se un nome esce
  // dal registro quando chi insegna ha detto di no.
  provaNeutra('src/ui/assistant/parts.ts', 'dist-tests/contextParts.mjs'),
  // Le carte intestate: raggruppamento per classe, selezione con Ctrl e
  // Maiuscolo, che cosa parte quando si trascina.
  provaNeutra('src/ui/views/settings/letterheadCourses.ts', 'dist-tests/letterheadCourses.mjs'),
  // I contenuti della guida: dati e schemi SVG in testo, senza DOM.
  provaNeutra('src/ui/views/help/index.ts', 'dist-tests/help.mjs'),
  // Il parser delle risposte del modello in tabelle, elenchi e paragrafi.
  provaNeutra('src/ui/assistant/format.ts', 'dist-tests/answerFormat.mjs'),
  // Il livello LLM da solo: le chiavi di ogni uso, il controllo dell'indirizzo,
  // la prontezza. Decide dove finiscono i dati delle persone in formazione.
  provaNode('tests/helpers/llm.ts', 'dist-tests/llm.mjs', {
    external: ['node-llama-cpp'],
    alias: CON_FINTO_E_APPARATO,
  }),
  // La dettatura da sola, con un server finto al posto di voicebox: guardia
  // sull'indirizzo, silenzio, durata, WAV. Decide dove va la voce.
  provaNode('tests/helpers/dictation.ts', 'dist-tests/dictation.mjs', { alias: CON_FINTO_E_APPARATO }),
  // Lo scarico dei corredi: la scadenza, la ripresa, l'estrazione.
  provaNode('tests/helpers/kit.ts', 'dist-tests/kit.mjs', { alias: CON_FINTO_E_APPARATO }),
  // Il manifesto: le prove del menu e delle impostazioni confrontano con lui.
  provaNeutra('src/manifest.ts', 'dist-tests/manifest.mjs'),
  // Dove stanno le finestre, anche con uno schermo staccato fra due sessioni.
  provaNode('src/environment/placement.ts', 'dist-tests/placement.mjs', { alias: CON_FINTO }),
  // Le impostazioni: la dogana (che cosa entra nel file) e l'elenco che le due
  // superfici mostrano.
  provaNode('src/environment/settings.ts', 'dist-tests/settings.mjs', { alias: CON_FINTO }),
  provaNode('src/environment/platform.ts', 'dist-tests/environment.mjs', { alias: CON_FINTO }),
  // L'aggiornamento: il segno lasciato prima di uscire, quel che scrive la
  // finestra, i suoi argomenti. Decidono se il registro riaprendosi parte o aspetta.
  provaNode('src/environment/updateInstaller.ts', 'dist-tests/updateInstaller.mjs', {
    alias: CON_FINTO,
  }),
  // L'icona del vassoio: la traduzione delle voci in menu di Electron. Il
  // contenuto lo decide `src/domain/tray.ts`, provato col dominio.
  provaNode('src/environment/tray.ts', 'dist-tests/tray.mjs', { alias: CON_FINTO }),
  provaNode('shell/windows/menu.ts', 'dist-tests/menu.mjs', { alias: CON_FINTO }),
]

/**
 * I bundle delle prove `tests/ui/*.py`, costruiti da `tools/uiTests.mjs`: IIFE
 * per Chromium, più il manifesto che `themeChoice.py` legge da Node. In CI
 * girano senza `pretest`, quindi qui c'è tutto quel che leggono.
 */
const interfaccia = [
  {
    ...comune,
    sourcemap: false,
    entryPoints: ['tests/helpers/uiStartup.ts'],
    outfile: 'dist-tests/ui.js',
    format: 'iife',
    platform: 'browser',
  },
  {
    ...comune,
    sourcemap: false,
    entryPoints: ['shell/pages/settings/settings.ts'],
    outfile: 'dist-tests/native-settings.js',
    format: 'iife',
    platform: 'browser',
  },
  provaNeutra('src/manifest.ts', 'dist-tests/manifest.mjs'),
]

/** `ricarica` è nostra e non di esbuild: si toglie prima di consegnargliela. */
function senzaEtichette (configurazioni) {
  return configurazioni.map(({ ricarica: _ricarica, ...resto }) => resto)
}

// Costruisce solo lanciato da riga di comando; importato da `tools/dev.mjs` espone `applicazione`.
if (process.argv[1]?.endsWith('esbuild.mjs')) {
  verificaIdentita()
  if (!ui) copiaCaratteriPdf(test ? 'dist-tests/pdf-fonts' : 'dist/pdf-fonts')
  const configurazioni = senzaEtichette(ui ? interfaccia : test ? prove : applicazione)
  // `comune` tace perché `tools/dev.mjs` racconta gli errori a modo suo: qui si stampano a mano.
  const esiti = await Promise.allSettled(configurazioni.map((c) => esbuild.build(c)))
  for (const esito of esiti) {
    if (esito.status === 'fulfilled') continue
    for (const errore of esito.reason?.errors ?? [esito.reason]) {
      const dove = errore.location ? ` (${errore.location.file}:${errore.location.line})` : ''
      console.error(`${errore.text ?? errore}${dove}`)
    }
    process.exitCode = 1
  }
}
