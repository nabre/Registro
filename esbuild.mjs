// Costruisce l'applicazione Electron. In `dist/` (`dist-dev/` per `npm run dev`):
//
//   main.cjs, preload.cjs              main process e ponte delle pagine
//   panel.js, projection.js, assistant.js  il registro, lo schermo per la
//                                      classe, l'assistente staccato
//   dialog, settings, welcome,         le pagine native (.html/.css/.js)
//   splash, reader                     (e `dev`, le opzioni di sviluppo, solo in `dist-dev/`)
//   pdf.worker.mjs                     il worker di pdfjs
//
// Il modulo `apparato` è `desktop/apparato/platform.ts`, risolto da un alias: il
// codice che lo importa non sa chi lo ospita.
//
//   node esbuild.mjs                  costruisce una volta
//   node esbuild.mjs --produzione     minifica e lascia fuori le mappe
//   node esbuild.mjs --test           i bundle di `node --test`
//   node esbuild.mjs --test --copertura  gli stessi, con le mappe per `tools/coverage.mjs`
//   node esbuild.mjs --ui             i bundle delle prove Python di `tests/ui/`
//
// Il modo sviluppo, in ascolto, sta in `tools/dev.mjs` e importa `applicazioneIn`.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import * as esbuild from 'esbuild'

/**
 * Ferma la costruzione se l'AppUserModelID diverge fra `electron-builder.json`,
 * `desktop/apparato/notifications.ts` e `cli/uninstall.mjs`: diverso,
 * l'icona appuntata non riapre il registro e le notifiche si sdoppiano.
 *
 * `nsis.guid` deve restare `GUID_INSTALLAZIONE`, o l'aggiornamento si installa
 * accanto invece di sostituire.
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

  for (const file of ['desktop/apparato/notifications.ts', 'cli/uninstall.mjs']) {
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

  if (nsis?.guid !== GUID_INSTALLAZIONE) {
    throw new Error(
      `nsis.guid in electron-builder.json è '${nsis?.guid}', e deve restare ` +
      `'${GUID_INSTALLAZIONE}': è quello delle installazioni già sui computer`,
    )
  }
}

/**
 * Il GUID con cui Windows riconosce l'installazione. Fisso da sempre: un altro
 * farebbe installare l'aggiornamento accanto invece che al posto del vecchio.
 */
const GUID_INSTALLAZIONE = 'd199f7cf-2ae9-5477-aea0-9860e9f60bca'

/**
 * I quattordici caratteri standard del PDF, copiati accanto ai bundle: pdfjs li
 * legge da una cartella per misurare le lettere, e nel pacchetto `node_modules` non c'è.
 */
export function copiaCaratteriPdf (dove) {
  try {
    mkdirSync(dove, { recursive: true })
    cpSync('resources/pdf-fonts', dove, { recursive: true })
  } catch (errore) {
    if (!existsSync(dove)) throw errore
  }
}

const test = process.argv.includes('--test')
const ui = process.argv.includes('--ui')
const produzione = process.argv.includes('--produzione')
// Le mappe inline servono solo a riportare la copertura sui `.ts`: senza, i
// bundle di prova restano leggeri come sempre.
const mappeDiProva = process.argv.includes('--copertura') ? 'inline' : false

/** Il modulo `apparato` risolto nel file nostro. */
const aliasApparato = { apparato: './desktop/apparato/platform.ts' }

/** @type {import('esbuild').BuildOptions} */
const comune = {
  bundle: true,
  minify: produzione,
  sourcemap: !produzione,
  logLevel: 'silent',
  // Le pagine in React (ADR-56): JSX col runtime automatico, come `tsconfig.json`.
  jsx: 'automatic',
}

/**
 * Le pagine del renderer: React legge `process.env.NODE_ENV`, che in una
 * pagina non esiste. In produzione la sua costruzione snella, altrimenti
 * quella con gli avvisi.
 */
const renderer = {
  define: { 'process.env.NODE_ENV': produzione ? '"production"' : '"development"' },
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

/** Le pagine native: una cartella ciascuna in `desktop/shell/pages/`, con lo stesso nome dei file. */
const PAGINE_NATIVE = ['dialog', 'settings', 'welcome', 'splash', 'reader']

/**
 * Le pagine che esistono solo con `npm run dev` (`tools/dev.mjs`, in
 * `dist-dev/`): le opzioni di sviluppo. Nel pacchetto non si costruiscono.
 */
const PAGINE_DI_SVILUPPO = ['dev']

/**
 * Il file di una pagina nativa: lo script può essere `.tsx` (React, ADR-56).
 *
 * @param {string} pagina
 * @param {string} estensione
 */
function pagina_ (pagina, estensione) {
  const base = `desktop/shell/pages/${pagina}/${pagina}`
  if (estensione === 'ts' && existsSync(`${base}.tsx`)) return `${base}.tsx`
  return `${base}.${estensione}`
}

/**
 * `{ dialog: 'desktop/shell/pages/dialog/dialog.tsx', … }`: le chiavi sono i nomi
 * in `dist/`. In `dist-dev/` anche quelle di sviluppo.
 *
 * @param {string} estensione
 * @param {string} cartella
 */
function filePagine (estensione, cartella) {
  const pagine = cartella === 'dist-dev' ? [...PAGINE_NATIVE, ...PAGINE_DI_SVILUPPO] : PAGINE_NATIVE
  return Object.fromEntries(
    pagine.map((pagina) => [pagina, pagina_(pagina, estensione)]),
  )
}

/**
 * I bundle dell'applicazione, in `cartella`. `ricarica` dice a `tools/dev.mjs`
 * che cosa fare quando il bundle cambia: `riavvia` rilancia Electron (main
 * process), `aggiorna` ricarica solo le pagine. Non è una chiave di esbuild.
 *
 * @param {string} cartella
 * @returns {(import('esbuild').BuildOptions & { ricarica: 'riavvia' | 'aggiorna' })[]}
 */
export const applicazioneIn = (cartella) => [
  // Il main process.
  {
    ...comune,
    ...urlDelModulo,
    entryPoints: ['desktop/shell/main.ts'],
    outfile: `${cartella}/main.cjs`,
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
    entryPoints: ['desktop/shell/preload.ts'],
    outfile: `${cartella}/preload.cjs`,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    external: ['electron'],
    ricarica: 'riavvia',
  },
  // Le pagine native (`desktop/shell/pages/<pagina>/`) escono piatte in `dist/`, perché
  // `registro://` concede la sola cartella dei bundle. L'HTML si copia; lo
  // script porta con sé il foglio con gli `@import` sciolti. Niente inline, così
  // la CSP può dire `script-src registro:` e basta.
  {
    ...comune,
    entryPoints: filePagine('html', cartella),
    outdir: cartella,
    loader: { '.html': 'copy' },
    ricarica: 'aggiorna',
  },
  {
    ...comune,
    entryPoints: filePagine('ts', cartella),
    outdir: cartella,
    ...renderer,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    loader: { '.css': 'css' },
    ricarica: 'aggiorna',
  },
  // Il pannello del registro.
  {
    ...comune,
    entryPoints: ['ui/main.tsx'],
    outfile: `${cartella}/panel.js`,
    ...renderer,
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
    entryPoints: ['ui/projection.tsx'],
    outfile: `${cartella}/projection.js`,
    ...renderer,
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
    entryPoints: ['ui/assistantWindow.tsx'],
    outfile: `${cartella}/assistant.js`,
    ...renderer,
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
    outfile: `${cartella}/pdf.worker.mjs`,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    ricarica: 'riavvia',
  },
]

/** I bundle di `npm run build` e del pacchetto. */
export const applicazione = applicazioneIn('dist')

/** `electron` sostituito dal finto, per i bundle che toccano l'ambiente. */
const CON_FINTO = { electron: './tests/helpers/fake-electron.mjs' }

/** Il finto e in più `apparato`, per chi passa dallo shim come l'applicazione. */
const CON_FINTO_E_APPARATO = { ...aliasApparato, ...CON_FINTO }

/**
 * `Temporal` nei bundle di prova, che girano in Node o in Chromium senza:
 * vedi `tests/helpers/temporal.mjs`. Solo qui, mai in `applicazione`.
 */
const conTemporal = { inject: ['tests/helpers/temporal.mjs'] }

/** Un bundle di prova per Node: ESM, senza mappe, `node18`; `extra` di solito è l'alias del finto. */
function provaNode (entrata, uscita, extra = {}) {
  return {
    ...comune,
    ...conTemporal,
    entryPoints: [entrata],
    outfile: uscita,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    sourcemap: mappeDiProva,
    ...extra,
  }
}

/** Un bundle di prova senza Node e senza DOM: la logica pura. */
function provaNeutra (entrata, uscita) {
  return {
    ...comune,
    ...conTemporal,
    entryPoints: [entrata],
    outfile: uscita,
    format: 'esm',
    platform: 'neutral',
    sourcemap: mappeDiProva,
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
  const file = [...cataloghi('core'), ...cataloghi('contract'), ...cataloghi('desktop'), ...cataloghi('ui'), ...cataloghi('cli')].sort()
  const righe = [
    "export * from './core/i18n/index.ts'",
    ...file.map((f, i) => `import * as c${i} from './${f}'`),
    `export const CATALOGHI = [${file.map((f, i) => `{ file: '${f}', esporta: c${i} }`).join(', ')}]`,
  ]
  return {
    ...comune,
    ...conTemporal,
    stdin: { contents: righe.join('\n'), resolveDir: '.', sourcefile: 'cataloghi.ts', loader: 'ts' },
    outfile: 'dist-tests/i18n.mjs',
    format: 'esm',
    platform: 'neutral',
    sourcemap: mappeDiProva,
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
  provaNeutra('core/dominio/index.ts', 'dist-tests/domain.mjs'),
  // Il lettore di PDF: fuori dal dominio (librerie e node:zlib), ma si prova senza applicazione.
  provaNode('core/dati/pdf.ts', 'dist-tests/pdf.mjs'),
  provaNode(WORKER_PDFJS, 'dist-tests/pdf.worker.mjs'),
  // L'impaginazione dei rapporti: dove cade un salto pagina si guarda sul PDF vero.
  provaNode('core/dati/reportsPdf.ts', 'dist-tests/reportsPdf.mjs'),
  // L'archivio ZIP: byte dentro e fuori, senza alias.
  provaNode('core/dati/zip.ts', 'dist-tests/zip.mjs'),
  // Il documento dell'anno, su file veri in una cartella temporanea: passa dallo shim.
  provaNode('core/dati/package.ts', 'dist-tests/package.mjs', { alias: CON_FINTO_E_APPARATO }),
  // Il deposito: i file dell'anno nel documento e le loro copie su disco.
  provaNode('core/dati/store.ts', 'dist-tests/store.mjs', { alias: CON_FINTO_E_APPARATO }),
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
  provaNode('core/dati/years.ts', 'dist-tests/years.mjs', {
    external: ['node-llama-cpp'],
    alias: CON_FINTO_E_APPARATO,
  }),
  // Il trasloco del nome: cartella dei dati da «Regiclass» a
  // «Regiklass» e percorsi scritti dentro. Solo `node:`.
  provaNode('core/dati/formerName.ts', 'dist-tests/formerName.mjs'),
  // Le sezioni della pagina Impostazioni, senza DOM: un'impostazione che non
  // finisce in nessuna sezione esiste e non si vede.
  provaNeutra('ui/views/settings/sections.ts', 'dist-tests/settingsSections.mjs'),
  // Che cosa si dice all'assistente, parte per parte: decide se un nome esce
  // dal registro quando chi insegna ha detto di no.
  provaNeutra('ui/assistant/parts.ts', 'dist-tests/contextParts.mjs'),
  // Le carte intestate: raggruppamento per classe, selezione con Ctrl e
  // Maiuscolo, che cosa parte quando si trascina.
  provaNeutra('ui/views/settings/letterheadCourses.ts', 'dist-tests/letterheadCourses.mjs'),
  // I contenuti della guida: dati e schemi SVG in testo, senza DOM.
  provaNeutra('ui/views/help/index.ts', 'dist-tests/help.mjs'),
  // Il parser delle risposte del modello in tabelle, elenchi e paragrafi.
  provaNeutra('ui/assistant/format.ts', 'dist-tests/answerFormat.mjs'),
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
  provaNeutra('contract/manifest.ts', 'dist-tests/manifest.mjs'),
  // Dove stanno le finestre, anche con uno schermo staccato fra due sessioni.
  provaNode('desktop/apparato/placement.ts', 'dist-tests/placement.mjs', { alias: CON_FINTO }),
  // Le impostazioni: la dogana (che cosa entra nel file) e l'elenco che le due
  // superfici mostrano.
  provaNode('desktop/apparato/settings.ts', 'dist-tests/settings.mjs', { alias: CON_FINTO }),
  provaNode('desktop/apparato/platform.ts', 'dist-tests/environment.mjs', { alias: CON_FINTO }),
  // L'aggiornamento: il segno lasciato prima di uscire, quel che scrive la
  // finestra, i suoi argomenti. Decidono se il registro riaprendosi parte o aspetta.
  provaNode('desktop/apparato/updateInstaller.ts', 'dist-tests/updateInstaller.mjs', {
    alias: CON_FINTO,
  }),
  // L'aggiornamento su macOS: quale archivio della release tocca a questa macchina.
  provaNode('desktop/apparato/updateMac.ts', 'dist-tests/updateMac.mjs', { alias: CON_FINTO }),
  // L'icona del vassoio: la traduzione delle voci in menu di Electron. Il
  // contenuto lo decide `src/domain/tray.ts`, provato col dominio.
  provaNode('desktop/apparato/tray.ts', 'dist-tests/tray.mjs', { alias: CON_FINTO }),
  provaNode('desktop/shell/windows/menu.ts', 'dist-tests/menu.mjs', { alias: CON_FINTO }),
  provaNode('desktop/shell/sentinel.ts', 'dist-tests/sentinel.mjs', { alias: CON_FINTO }),
]

/**
 * I bundle delle prove `tests/interfaccia/*.spec.ts`, costruiti da `tools/uiTests.mjs`: IIFE
 * per Chromium, più il manifesto che `themeChoice.spec.ts` legge da Node. In CI
 * girano senza `pretest`, quindi qui c'è tutto quel che leggono.
 */
const interfaccia = [
  {
    ...comune,
    ...conTemporal,
    sourcemap: false,
    entryPoints: ['tests/helpers/uiStartup.ts'],
    outfile: 'dist-tests/ui.js',
    ...renderer,
    format: 'iife',
    platform: 'browser',
  },
  {
    ...comune,
    ...conTemporal,
    sourcemap: false,
    entryPoints: [pagina_('settings', 'ts')],
    outfile: 'dist-tests/native-settings.js',
    ...renderer,
    format: 'iife',
    platform: 'browser',
  },
  provaNeutra('contract/manifest.ts', 'dist-tests/manifest.mjs'),
]

/** `ricarica` è nostra e non di esbuild: si toglie prima di consegnargliela. */
function senzaEtichette (configurazioni) {
  return configurazioni.map(({ ricarica: _ricarica, ...resto }) => resto)
}

// Costruisce solo lanciato da riga di comando; importato da `tools/dev.mjs` espone `applicazioneIn`.
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
