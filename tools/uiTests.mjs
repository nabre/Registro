/**
 * Le prove dell'interfaccia su Chromium: `npm run ui-tests`. Provano in un
 * browser quel che `node --test` non vede: pagine, comandi, filtri, tastiera,
 * responsive, pdfjs nel pannello.
 *
 * Trova l'interprete, dice che cosa manca, e lancia i file uno dopo l'altro.
 * Fuori da `npm test` perché vogliono Python, playwright e un Chromium
 * scaricato; in CI sono un lavoro a parte.
 */

import { spawnSync } from 'node:child_process'

import { RADICE } from './common.mjs'

/**
 * Le prove, nell'ordine in cui conviene leggerle: prima il telaio, poi lo
 * scorrimento che ci vive dentro, poi lo sfoglio.
 */
const PROVE = [
  'tests/ui/navigation.py',
  'tests/ui/calendarKeyboard.py',
  'tests/ui/documentsKeyboard.py',
  'tests/ui/settingsKeyboard.py',
  'tests/ui/modalErrors.py',
  'tests/ui/selectorA11y.py',
  'tests/ui/readability.py',
  'tests/ui/sidebarDrawer.py',
  'tests/ui/calendarContrast.py',
  'tests/ui/scroll.py',
  'tests/ui/movimento.py',
  'tests/ui/pageBrowser.py',
  'tests/ui/staleEdits.py',
  'tests/ui/check.py',
  'tests/ui/hint.py',
  'tests/ui/lingue.py',
  'tests/ui/ricerca.py',
  'tests/ui/giro12_corse.py',
  'tests/ui/giro13_comandi.py',
  'tests/ui/settimana.py',
  'tests/ui/themeChoice.py',
  'tests/ui/schoolCalendar.py',
  'tests/ui/giornata.py',
  'tests/ui/oggi.py',
  'tests/ui/accessibility.py',
]

/**
 * Esegue una riga di comando intera nella shell: su Windows `spawnSync` con
 * `shell: true` rispezza gli argomenti sugli spazi (`-c "import playwright"`).
 */
function esegui (riga, opzioni = {}) {
  return spawnSync(riga, { encoding: 'utf8', shell: true, ...opzioni })
}

/** Come si chiama Python su questa macchina: si provano i nomi in ordine, senza guardare il sistema. */
function interprete () {
  for (const nome of ['python', 'python3', 'py']) {
    if (esegui(`${nome} --version`).status === 0) return nome
  }
  return null
}

function manca (messaggio) {
  process.stderr.write(`${messaggio}\n`)
  process.exit(1)
}

const python = interprete()
if (!python) {
  manca(
    'Non trovo Python. Le prove dell’interfaccia girano su Chromium con playwright,\n' +
    'e quel pacchetto è di Python. Installa Python, poi:\n' +
    '  pip install playwright\n' +
    '  python -m playwright install chromium',
  )
}

const haPlaywright = esegui(`${python} -c "import playwright"`).status === 0
if (!haPlaywright) {
  manca(
    `${python} c’è, ma il pacchetto playwright no. Serve quello, più il browser:\n` +
    `  ${python} -m pip install playwright\n` +
    `  ${python} -m playwright install chromium`,
  )
}

// I bundle che le prove leggono, costruiti una volta per tutte.
process.stdout.write('\n— node esbuild.mjs --ui\n')
const costruiti = esegui('node esbuild.mjs --ui', { cwd: RADICE, stdio: 'inherit', encoding: undefined })
if (costruiti.status !== 0) manca('I bundle delle prove dell’interfaccia non si costruiscono.')

let guasti = 0
for (const prova of PROVE) {
  process.stdout.write(`\n— ${prova}\n`)
  const esito = esegui(`${python} ${prova}`, { cwd: RADICE, stdio: 'inherit', encoding: undefined })
  if (esito.status !== 0) guasti += 1
}

process.stdout.write(
  guasti === 0
    ? '\nLe prove dell’interfaccia passano.\n'
    : `\n${guasti} prova/e dell’interfaccia non passano.\n`,
)
process.exit(guasti === 0 ? 0 : 1)
