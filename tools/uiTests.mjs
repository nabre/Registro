/**
 * Le prove dell'interfaccia su Chromium: `npm run ui-tests`.
 *
 * `tests/ui/navigation.py` e `pageBrowser.py` sono novecento righe di
 * regressioni vere — pagine, comandi, filtri, tendine, tastiera, responsive,
 * registro vuoto, e pdfjs che disegna davvero dentro il pannello. Provano le
 * cose che `node --test` non può vedere, perché vivono in un browser.
 *
 * Fino a ieri stavano fuori da qualunque comando: si lanciavano a mano, quindi
 * non si lanciavano. E una prova che non gira è peggio di una prova che manca,
 * perché dà l'impressione di esserci: `navigation.py` era ferma a prima che
 * nascesse la pagina «Modelli linguistici», e nessuno l'ha saputo finché non è
 * stata eseguita di nuovo.
 *
 * Questo script è il gancio che mancava. Non riscrive niente: trova
 * l'interprete, dice che cosa manca quando manca, e lancia i due file uno dopo
 * l'altro con l'uscita di chi ha fallito.
 *
 * Perché non dentro `npm test`: quelle prove vogliono Python, il pacchetto
 * playwright e un Chromium scaricato — tre cose che chi apre il repository per
 * leggere il dominio non deve installare. Restano un comando a parte, e nella
 * CI un lavoro a parte.
 */

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import * as percorso from 'node:path'

const radice = percorso.resolve(percorso.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Le prove, nell'ordine in cui conviene leggerle: prima il telaio, poi lo
 * scorrimento che ci vive dentro, poi lo sfoglio.
 */
const PROVE = ['tests/ui/navigation.py', 'tests/ui/scroll.py', 'tests/ui/pageBrowser.py', 'tests/ui/staleEdits.py']

/**
 * Esegue una riga di comando intera nella shell.
 *
 * Una riga sola e non comando più argomenti: su Windows `spawnSync` con
 * `shell: true` riconsegna gli argomenti alla shell, che li rispezza sugli
 * spazi — e `-c "import playwright"` tornava due argomenti invece di uno,
 * facendo fallire il controllo su una macchina che playwright ce l'ha.
 */
function esegui (riga, opzioni = {}) {
  return spawnSync(riga, { encoding: 'utf8', shell: true, ...opzioni })
}

/**
 * Come si chiama Python su questa macchina.
 *
 * Su Windows `python` c'è quasi sempre e `python3` quasi mai; altrove è il
 * contrario. Si prova in ordine invece di deciderlo dal sistema operativo,
 * perché una macchina con tutti e due non deve rispondere quella sbagliata.
 */
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

let guasti = 0
for (const prova of PROVE) {
  process.stdout.write(`\n— ${prova}\n`)
  const esito = esegui(`${python} ${prova}`, { cwd: radice, stdio: 'inherit', encoding: undefined })
  if (esito.status !== 0) guasti += 1
}

process.stdout.write(
  guasti === 0
    ? '\nLe prove dell’interfaccia passano.\n'
    : `\n${guasti} prova/e dell’interfaccia non passano.\n`,
)
process.exit(guasti === 0 ? 0 : 1)
