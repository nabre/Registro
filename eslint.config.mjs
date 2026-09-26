// Che cosa si può scrivere, e dove. `npm run lint`.
//
// Tre parti: la forma (l'aspetto del codice), la sostanza (guasti veri:
// promesse non aspettate, `any` che si propagano, `catch` che ingoiano) e gli
// strati (chi può importare che cosa). Gli strati, dall'interno in fuori:
//
//   src/domain/       le regole della scuola. Non importa niente (né Node, né
//                     Electron, né l'`apparato`): si prova con `node --test`.
//   src/data/         il disco e la rete: archivio, PDF, posta, ZIP.
//   src/actions/      i comandi del registro, fra dominio e dati.
//   src/ui/           le pagine, in una webview: DOM senza Node. `node:fs`
//                     passa la costruzione e scoppia a pagina aperta.
//   src/environment/  l'`apparato`: con `shell/`, l'unico posto che nomina `electron`.
//   shell/            il main process: system/, protocol/, windows/, pages/.
//
// Le frecce vanno solo verso l'interno; ogni messaggio dice il perché.

import js from '@eslint/js'
import stilistica from '@stylistic/eslint-plugin'
import globali from 'globals'
import tseslint from 'typescript-eslint'

/**
 * Quel che non è codice scritto a mano: i bundle, e i file generati, la cui
 * forma è affare del generatore (`defaultTemplates.ts` lo scrive `npm run
 * templates`, e una prova lo confronta coi modelli).
 */
const FUORI = [
  'dist/',
  'dist-tests/',
  'node_modules/',
  'pacchetti/',
  'icons/',
  'src/data/defaultTemplates.ts',
  // Lo stesso per il calendario ufficiale: `npm run calendario` lo scrive dal JSON.
  'src/data/schoolCalendarTicino.ts',
]

/** La forma del codice: la convenzione che il codice segue già. */
const FORMA = {
  '@stylistic/semi': ['error', 'never'],
  '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
  // `offsetTernaryExpressions`: i ternari che tornano un oggetto hanno il corpo
  // rientrato sotto `?` e `:`, e senza la regola li segnala tutti.
  '@stylistic/indent': ['error', 2, { SwitchCase: 1, offsetTernaryExpressions: true }],
  '@stylistic/space-before-function-paren': ['error', 'always'],
  '@stylistic/arrow-parens': ['error', 'always'],
  // Solo a capo: su una riga sola la virgola in coda non c'è.
  '@stylistic/comma-dangle': ['error', 'always-multiline'],
  '@stylistic/object-curly-spacing': ['error', 'always'],
  '@stylistic/eol-last': ['error', 'always'],
  '@stylistic/no-trailing-spaces': 'error',
  // Cento: due file affiancati su uno schermo, come si legge un diff. I
  // commenti sono esclusi perché sono prosa.
  //
  // Avviso e non errore: restano righe che sforano, e si smaltiscono quando si
  // toccano per altro. Quando saranno zero, questa riga torna `error`.
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
 * I guasti che si vedono senza sapere i tipi, TypeScript e no. Ogni regola
 * spenta dice perché.
 */
const SOSTANZA = {
  // Un `catch` vuoto è spesso voluto: basta il commento dentro.
  'no-empty': ['error', { allowEmptyCatch: true }],

  // `_evento`: l'argomento c'è perché la firma lo vuole.
  'no-unused-vars': ['error', {
    args: 'after-used',
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
  }],

  eqeqeq: ['error', 'always'],
  'no-var': 'error',
  'prefer-const': 'error',

  // Spenta: il testo estratto dai PDF contiene NUL e altri caratteri di
  // controllo, e le espressioni che lo ripuliscono devono nominarli.
  'no-control-regex': 'off',

  // Spenta: un valore iniziale esplicito prima di un `try` è voluto, anche se
  // non viene letto.
  //
  //   let immagine: Uint8Array | null = null
  //   try { immagine = await immaginePagina(…) } catch { return null }
  'no-useless-assignment': 'off',
}

/**
 * I guasti che si vedono solo sapendo i tipi, quindi solo sul TypeScript:
 * senza tipi una promessa lasciata cadere sembra una chiamata qualunque.
 */
const SOSTANZA_TIPATA = {
  // Una promessa lasciata cadere è un salvataggio non aspettato. `void` dice
  // «so che non la aspetto».
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-misused-promises': 'error',
  // Aspettare una non-promessa di solito vuol dire che ne manca una più in là.
  '@typescript-eslint/await-thenable': 'error',

  // La versione che legge le firme TypeScript.
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': ['error', {
    args: 'after-used',
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
  }],

  // Spenta: resta solo su `String(valore)` con `valore` `unknown` per mestiere
  // (campi di modulo, attributi del DOM), dove convertire è il compito. L'oggetto
  // interpolato in un testo lo prende `restrict-template-expressions`.
  '@typescript-eslint/no-base-to-string': 'off',

  // Spenta: «async senza await» è una firma. In `src/environment/` API come
  // `secrets.get` e `configuration.update` tornano una promessa per contratto
  // anche quando l'implementazione è immediata; altrove una funzione è `async`
  // come la sua famiglia. La promessa non aspettata la prende `no-floating-promises`.
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
        // Il progetto ha un `tsconfig` solo.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: { ...FORMA, ...SOSTANZA, ...SOSTANZA_TIPATA },
  },

  // ------------------------------------------------- src/domain: non importa niente
  //
  // Lo strato che sa di scuola e non di computer.
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['node:*', 'electron', 'apparato'],
            message:
              'src/domain/ non importa niente da fuori di sé: né Node, né Electron, né l’apparato.',
          },
          {
            // Fuori dalla cartella, solo src/i18n/: è puro come il dominio.
            regex: String.raw`^\.\./(?!i18n/)`,
            message:
              'src/domain/ non importa niente da fuori di sé, tranne il dispositivo multilingua ' +
              '(src/i18n/), che è puro come lui: è quel che permette di provarlo ' +
              'con `node --test` in due secondi, senza Electron e senza un disco. Quel che ' +
              'serve dal mondo si riceve come argomento — lo passa src/actions/ o src/data/.',
          },
        ],
      }],
    },
  },

  // ------------------------------------- src/i18n: le lingue, sotto a tutti
  //
  // Lo importano tutti, quindi non importa nessuno. I testi stanno accanto al
  // codice, nei file `.testi.ts`.
  {
    files: ['src/i18n/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['node:*', 'electron', 'apparato', '../*'],
            message:
              'src/i18n/ sta sotto a tutti gli strati — dominio, pagine, main process — e per ' +
              'questo non importa niente da fuori di sé. I testi stanno accanto al codice che li ' +
              'usa, nei file `.testi.ts`.',
          },
        ],
      }],
    },
  },

  // ------------------------------------------- src/ui: il DOM, e non Node
  //
  // Una webview senza Node: importarlo passa la costruzione e scoppia a pagina aperta.
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
  // Gli script delle pagine native girano in una finestra come `src/ui/`. Dal
  // main process importano solo tipi, che esbuild cancella: un import di valore
  // trascinerebbe nel bundle Electron e mezzo registro.
  {
    files: ['shell/pages/**/*.ts'],
    languageOptions: { globals: globali.browser },
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['node:*', 'electron'],
            allowTypeImports: true,
            message:
              'Le pagine native girano in una finestra: Node ed Electron non ci sono.',
          },
          {
            // Fuori da shell/pages/ solo src/i18n/ (puro) e le parole di tutti
            // (src/domain/words.testi.ts, che importa solo src/i18n/), perché
            // «Annulla» ed «Esci» dicano lo stesso del pannello.
            regex: String.raw`^\.\./\.\./(?!\.\./src/i18n/|\.\./src/domain/words\.testi\.js$)`,
            allowTypeImports: true,
            message:
              'Le pagine native girano in una finestra: da fuori di shell/pages/ si importano ' +
              'solo tipi (`import type`), il dispositivo multilingua (src/i18n/), che è puro, e ' +
              'le parole di tutti (src/domain/words.testi.ts). ' +
              'Il codice condiviso fra le pagine sta in shell/pages/shared/.',
          },
        ],
      }],
    },
  },

  // -------------------------------- src/data, src/actions, src/panels: via il guscio
  //
  // Electron si nomina solo in `src/environment/` e `shell/`: le prove
  // sostituiscono un finto Electron su quel confine.
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

  // ----------------------------------------------------- gli aiuti delle prove
  //
  // Codice che non si consegna: un `any` di comodo in un dato di prova va bene.
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  // ------------------------------------------------- gli script: JavaScript e Node
  //
  // Costruzione, modo sviluppo, generatori, script delle skill: senza tipi.
  // `src/cli/` è JavaScript apposta: la riga di comando non si compila e non ha
  // dipendenze, così funziona anche quando la costruzione no.
  {
    files: ['*.mjs', 'tools/**/*.mjs', 'tests/**/*.mjs', 'src/cli/**/*.mjs', '.claude/**/*.mjs'],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    plugins: { '@stylistic': stilistica },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globali.node,
    },
    rules: { ...FORMA, ...SOSTANZA },
  },

  // `tools/icons.cjs` è CommonJS apposta: dentro Electron `electron` si prende
  // con `require` (vedi in testa al file).
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
