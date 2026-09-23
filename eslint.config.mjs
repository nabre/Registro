// Che cosa si può scrivere, e dove. `npm run lint`.
//
// Il controllo dei tipi dice se il codice sta in piedi; questo dice se sta al
// suo posto. Sono due domande diverse, e fino a qui la seconda aveva per
// risposta la memoria di chi scriveva: ottantamila righe di convenzioni tenute
// a mano — nessun punto e virgola, virgolette semplici, lo spazio prima della
// parentesi — e, quel che conta di più, una divisione in strati che nessuno
// verificava.
//
// Il file è diviso in tre parti, e sono tre mestieri diversi:
//
//   1. **la forma** — l'aspetto del codice, che è una convenzione e basta, ma
//      che lasciata alla memoria diventa un diff pieno di righe che nessuno ha
//      voluto cambiare;
//   2. **la sostanza** — le regole di `eslint` e di `typescript-eslint` che
//      trovano guasti veri: una promessa non aspettata, un `any` che si
//      propaga, un `catch` che ingoia;
//   3. **gli strati** — chi può importare che cosa. È la parte che questo
//      progetto aveva già, senza modo di difenderla.
//
// Gli strati, dall'interno in fuori:
//
//   src/domain/      le regole della scuola: anni, lezioni, valutazioni.
//                     Non importa niente. Né Node, né Electron, né
//                     l’`apparato`, né una dipendenza. È quel che rende possibile
//                     provarlo con `node --test` e senza aprire una finestra,
//                     ed è la ragione per cui le prove sono mille e durano due
//                     secondi.
//   src/data/         il disco e la rete: archivio, PDF, posta, ZIP.
//   src/actions/       i comandi del registro, che legano dominio e dati.
//   src/ui/  le pagine. Girano in una webview: hanno il DOM e non
//                     hanno Node. Importare `node:fs` di là non dà errore in
//                     costruzione — esbuild lo impacchetta — e scoppia a
//                     pagina aperta.
//   src/environment/     l’`apparato`: l'unico posto, con `shell/`, in cui
//                     `electron` si nomina. Tutto il resto passa da qui, ed è
//                     il motivo per cui il registro si prova senza Electron.
//   shell/           il main process: system/, protocol/, windows/, pages/.
//
// Le frecce vanno solo verso l'interno. Le regole qui sotto dicono, per ogni
// cartella, che cosa non può entrarci — e dicono *perché*, nel messaggio, così
// chi ci sbatte contro legge la ragione e non un codice di regola.

import js from '@eslint/js'
import stilistica from '@stylistic/eslint-plugin'
import globali from 'globals'
import tseslint from 'typescript-eslint'

/**
 * Quel che non è codice scritto a mano.
 *
 * `dist*` sono i bundle — dentro c'è pdfjs minificato, e passarci il controllo
 * sopra vorrebbe dire aspettare un minuto per sapere niente.
 *
 * `defaultTemplates.ts` lo scrive `npm run templates` dai file di `templates/`,
 * e una prova verifica che i due combacino. Lasciandolo qui dentro il controllo
 * gli ha riscritto le virgolette delle chiavi, la prova se n'è accorta subito, e
 * l'unica correzione vera sarebbe stata rigenerarlo per rifargliele togliere al
 * giro dopo. La forma di un file generato è affare di chi lo genera.
 */
const FUORI = [
  'dist/',
  'dist-tests/',
  'node_modules/',
  'pacchetti/',
  'icons/',
  'src/data/defaultTemplates.ts',
]

/**
 * La forma del codice, misurata su quello che c'è.
 *
 * Non è una scelta di gusto fatta adesso: è la convenzione che le ottantamila
 * righe seguono già — zero punti e virgola in coda, millesettecento firme di
 * funzione con lo spazio prima della parentesi e nessuna senza. Scriverla qui
 * non cambia una riga: impedisce alla prossima di divergere.
 */
const FORMA = {
  '@stylistic/semi': ['error', 'never'],
  '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
  // `offsetTernaryExpressions` non è un dettaglio: senza, il conto della regola
  // litiga con il modo in cui il progetto scrive i ternari che tornano un
  // oggetto — il corpo rientrato sotto il `?` e il `:` — e da solo faceva
  // tremila errori su codice che nessuno voleva cambiare.
  '@stylistic/indent': ['error', 2, { SwitchCase: 1, offsetTernaryExpressions: true }],
  '@stylistic/space-before-function-paren': ['error', 'always'],
  '@stylistic/arrow-parens': ['error', 'always'],
  // Solo a capo: su una riga sola la virgola in coda non c'è.
  '@stylistic/comma-dangle': ['error', 'always-multiline'],
  '@stylistic/object-curly-spacing': ['error', 'always'],
  '@stylistic/eol-last': ['error', 'always'],
  '@stylistic/no-trailing-spaces': 'error',
  // Cento non è una misura di bellezza: è la larghezza a cui due file stanno
  // affiancati su uno schermo, che è come si legge un diff. I commenti sono
  // esclusi perché qui i commenti sono prosa, e spezzarla a metà parola per
  // rientrare in un conto la rende peggiore.
  //
  // Avviso e non errore, e per una ragione precisa. Il codice rispetta già i
  // cento caratteri quasi ovunque: le righe che sforano sono un debito vecchio,
  // e spezzarle tutte in un colpo vorrebbe dire una modifica per ciascuna a
  // codice che funziona, fatte per far tacere un conto. Quante siano lo dice
  // `npm run lint`, che è il posto giusto: un numero scritto qui
  // invecchia al primo commit. Da errore fermerebbe ogni controllo da oggi in poi, e un controllo
  // che è sempre rosso è un controllo che nessuno guarda più. Da avviso si
  // vedono, si smaltiscono quando quelle righe si toccano per altro, e nel
  // frattempo gli errori veri restano leggibili. Quando saranno zero, questa
  // riga torna `error`.
  '@stylistic/max-len': ['warn', {
    code: 100,
    ignoreComments: true,
    ignoreUrls: true,
    ignoreStrings: true,
    ignoreTemplateLiterals: true,
    ignoreRegExpLiterals: true,
  }],
}

/**
 * I guasti che si vedono senza sapere i tipi. Valgono ovunque, TypeScript e no.
 *
 * Ogni voce spenta qui sotto è spenta con una ragione scritta: una regola
 * disattivata in silenzio è una regola che nessuno saprà più se serviva.
 */
const SOSTANZA = {
  // Un `catch` vuoto qui è spesso voluto e spiegato — «un argomento che non è
  // un file: non è quello che si cercava» — e allora il commento dentro basta.
  'no-empty': ['error', { allowEmptyCatch: true }],

  // Il nome di comodo: `_evento` dice «questo argomento c'è perché la firma lo
  // vuole», e non è una dimenticanza.
  'no-unused-vars': ['error', {
    args: 'after-used',
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
  }],

  // `==` con `null` è l'unico uso che si difende — prende anche `undefined`, ed
  // è quel che si intende — ma qui il codice non lo fa mai, e `===` ovunque
  // toglie la domanda.
  eqeqeq: ['error', 'always'],
  // Un `var` in mezzo a ottantamila righe di `const` sarebbe un incidente.
  'no-var': 'error',
  'prefer-const': 'error',

  // Spenta: qui il registro legge formati binari. Il PDF e i testi che ne
  // escono contengono NUL e altri caratteri di controllo, e le espressioni che
  // li cercano devono poterli nominare — `\x00` in un'espressione che ripulisce
  // il testo estratto da un PDF non è una svista, è il mestiere.
  'no-control-regex': 'off',

  // Spenta: prende per inutile un'abitudine che qui è voluta.
  //
  //   let immagine: Uint8Array | null = null
  //   try { immagine = await immaginePagina(…) } catch { return null }
  //
  // Il `null` iniziale non viene mai letto — di qui l'avviso — ma toglierlo
  // vuol dire affidarsi all'analisi di TypeScript su quale ramo del `try`
  // assegna davvero, che è esattamente la cosa che non si vuole dover
  // ricontrollare a ogni modifica di quel blocco. Un valore iniziale esplicito
  // costa una parola e non si sbaglia.
  'no-useless-assignment': 'off',
}

/**
 * I guasti che si vedono solo sapendo i tipi. Solo sul TypeScript, quindi.
 *
 * È la metà che vale di più, e la ragione per cui il controllo qui è
 * «type-checked» e non quello di base: senza tipi, una promessa lasciata cadere
 * è indistinguibile da una chiamata qualunque.
 */
const SOSTANZA_TIPATA = {
  // Una promessa lasciata cadere è il guasto tipico di questo programma: un
  // salvataggio che non si aspetta, e il file scritto a metà mentre si esce.
  // Il codice usa già `void` per dire «so che non la aspetto», e la regola lo
  // riconosce.
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-misused-promises': 'error',
  // Aspettare una cosa che non è una promessa quasi sempre vuol dire che ne
  // manca una da qualche parte più in là.
  '@typescript-eslint/await-thenable': 'error',

  // La versione della regola qui sopra che sa leggere le firme TypeScript: gli
  // argomenti dichiarati e non usati sono legittimi, quella di base non lo sa.
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': ['error', {
    args: 'after-used',
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
  }],

  // Spenta, ma solo dopo aver guardato tutte le sue segnalazioni una per una —
  // ed è stato l'acquisto migliore di tutta la configurazione.
  //
  // La regola dice: «questo finirà scritto come `[object Object]`». Su nove
  // segnalazioni una era un guasto vero e visibile: nella barra di stato, il
  // suggerimento che compare mentre il registro legge le scansioni diceva «Sta
  // leggendo [object Object]» — si interpolava l'oggetto della pagina in corso
  // invece della sua etichetta. Le altre otto erano `unknown` interpolati nei
  // messaggi d'errore, ora passati da `String(errore)` come già si faceva in
  // cinque altri punti.
  //
  // Quel che resta sono sei `String(valore)` dove `valore` è `unknown` per
  // mestiere: quel che arriva da un campo di un modulo, da un attributo del
  // DOM, da `console.log` di una libreria. Lì convertire qualunque cosa in
  // stringa *è* il compito della funzione, e l'`[object Object]` sarebbe un
  // errore di chi chiama. Il caso pericoloso — l'oggetto interpolato in un
  // testo che qualcuno legge — resta preso da `restrict-template-expressions`,
  // che è accesa.
  '@typescript-eslint/no-base-to-string': 'off',

  // Spenta: qui «async senza await» non è una svista, è una firma.
  //
  // `src/environment/` è il guscio che rifà l'API di VS Code. Là `secrets.get`,
  // `configuration.update` e `webview.postMessage` tornano una promessa perché
  // *in VS Code* tornano una promessa, e il registro le aspetta. Che sul desktop
  // l'implementazione sia immediata — un file letto in memoria, un messaggio
  // consegnato a Electron — è un dettaglio dell'implementazione: togliere
  // l'`async` cambierebbe il tipo, e il registro non compilerebbe più contro
  // l'API che dice di rifare.
  //
  // Vale anche fuori dal guscio, dove una funzione è dichiarata `async` perché
  // di quella famiglia — `scriviAnteprima`, `ritrovaInQuarantena` — e cambiarla
  // vorrebbe dire cambiare i venti punti che la chiamano.
  //
  // Spegnerla non lascia scoperto niente che conti: il guasto vero è la promessa
  // che nessuno aspetta, e quella la prende `no-floating-promises`, che resta
  // accesa. Questa dice solo che una promessa è più larga del necessario.
  '@typescript-eslint/require-await': 'off',
}

export default tseslint.config(
  { ignores: FUORI },

  // --------------------------------------------------------- tutto il TypeScript
  {
    files: ['src/**/*.ts', 'shell/**/*.ts', 'tests/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    plugins: { '@stylistic': stilistica },
    languageOptions: {
      parserOptions: {
        // `projectService` invece dell'elenco dei `tsconfig`: il progetto ne ha
        // uno solo, e così resta uno solo anche qui.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: { ...FORMA, ...SOSTANZA, ...SOSTANZA_TIPATA },
  },

  // ------------------------------------------------- src/domain: non importa niente
  //
  // Lo strato che sa di scuola e non sa di computer. La regola dice quel che il
  // codice fa già — duecentododici importazioni, tutte interne — e lo tiene.
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['node:*', 'electron', 'apparato', '../*'],
            message:
              'src/domain/ non importa niente da fuori di sé: è quel che permette di provarlo ' +
              'con `node --test` in due secondi, senza Electron e senza un disco. Quel che ' +
              'serve dal mondo si riceve come argomento — lo passa src/actions/ o src/data/.',
          },
        ],
      }],
    },
  },

  // ------------------------------------------- src/ui: il DOM, e non Node
  //
  // Queste righe finiscono dentro una webview. Node di là non c'è: importarlo
  // passa la costruzione — esbuild impacchetta tutto quel che gli si dà — e
  // scoppia a pagina aperta, che è il posto peggiore per accorgersene.
  {
    files: ['src/ui/**/*.ts'],
    languageOptions: { globals: globali.browser },
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['node:*', 'electron'],
            message:
              'src/ui/ gira dentro una webview: Node e Electron non ci sono. ' +
              'Il bundle si costruisce lo stesso e la pagina resta bianca all’apertura. ' +
              'Quel che serve dal main process passa dal ponte — src/ui/bridge.ts.',
          },
        ],
      }],
    },
  },

  // ------------------------------- shell/pages: le pagine native, nel browser
  //
  // Gli script delle pagine native (`shell/pages/<pagina>/<pagina>.ts`) girano
  // in una finestra come `src/ui/`, ma stanno accanto al main process e ne
  // importano i **tipi** dei messaggi. I tipi sì — esbuild li cancella —, il
  // codice no: un `import` di valore da `src/` o da `shell/windows/`
  // trascinerebbe nel bundle della pagina Electron e mezzo registro.
  {
    files: ['shell/pages/**/*.ts'],
    languageOptions: { globals: globali.browser },
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['node:*', 'electron', '../../*'],
            allowTypeImports: true,
            message:
              'Le pagine native girano in una finestra: da fuori di shell/pages/ si importano ' +
              'solo tipi (`import type`). Il codice condiviso fra le pagine sta in shell/pages/shared/.',
          },
        ],
      }],
    },
  },

  // -------------------------------- src/data, src/actions, src/panels: via il guscio
  //
  // Electron si nomina in due posti soli: `src/environment/` e `shell/`. È quel
  // che rende provabile il resto — le prove mettono un finto Electron al posto
  // del vero, e possono farlo perché la sostituzione ha un confine solo.
  {
    files: ['src/data/**/*.ts', 'src/actions/**/*.ts', 'src/panels/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'electron',
            message:
              'Electron si nomina solo in src/environment/ e shell/. Di qui si passa dall’apparato ' +
              '(src/environment/platform.ts): è il confine su cui le prove ' +
              'sostituiscono un finto Electron al vero.',
          },
        ],
      }],
    },
  },

  // ------------------------------------------------- il confine con il codice nativo
  //
  // `src/environment/anchoring.ts` chiama Windows: `SHAppBarMessage`,
  // `SetWindowPos`, `SystemParametersInfoW`. Ci arriva per koffi, che le
  // funzioni le dichiara a *runtime* leggendo una stringa C —
  // `'bool __stdcall SetWindowPos(uint64 hWnd, …)'` — e che quindi non ha e non
  // può avere tipi: `koffi.load(…).func(…)` è `any`, e lo sarà sempre.
  //
  // Le regole spente non stanno coprendo una pigrizia. Il file fa già la cosa
  // giusta, che è **circoscrivere** quell'`any`: lo tiene dentro `carica()`, e
  // di lì esce una sola interfaccia scritta a mano — `Win32` — con le cinque
  // funzioni che servono e i loro tipi veri. Tutto il resto del registro parla
  // con quella e non vede mai koffi. Il confine c'è: qui si dichiara dove sta.
  {
    files: ['src/environment/anchoring.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },

  // ----------------------------------------------------- gli aiuti delle prove
  //
  // Costruiscono i registri finti. Sono TypeScript e vanno controllati come il
  // resto, ma non sono codice che si consegna: un `any` di comodo in un dato di
  // prova non merita di fermare la costruzione.
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  // ------------------------------------------------- gli script: JavaScript e Node
  //
  // La costruzione, il modo sviluppo, i generatori. Non passano da `tsc` e non
  // hanno tipi da cui partire: qui il controllo è quello di `eslint` e basta.
  //
  // `src/cli/` è nominato a parte benché stia sotto `src/`: è l'unico
  // JavaScript del sorgente, e sta lì apposta — la riga di comando non si
  // compila e non ha dipendenze, o servirebbe una costruzione riuscita per
  // poter capire perché la costruzione non riesce.
  {
    files: ['*.mjs', 'tools/**/*.mjs', 'tests/**/*.mjs', 'src/cli/**/*.mjs'],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    plugins: { '@stylistic': stilistica },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globali.node,
    },
    rules: { ...FORMA, ...SOSTANZA },
  },

  // `tools/icons.cjs` è CommonJS apposta: dentro Electron il modulo
  // `electron` si prende con `require`, e da un modulo ECMAScript si otterrebbe
  // il guscio che Node usa fuori da Electron. Il perché sta scritto in testa al
  // file.
  {
    files: ['**/*.cjs'],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    plugins: { '@stylistic': stilistica },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: globali.node,
    },
    rules: { ...FORMA, ...SOSTANZA },
  },
)
