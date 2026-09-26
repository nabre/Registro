/**
 * La verifica della CI, in locale: `npm run ci`.
 *
 * Legge `.github/workflows/verifica.yml`, lo stesso file che GitHub esegue, e
 * ne lancia i passi con il nome che hanno là: nessun secondo elenco.
 *
 * Si saltano:
 *
 * - `uses:` (checkout, setup-node, setup-python): preparano la macchina della CI;
 * - `npm ci`: rifà `node_modules` da zero; si lancia a mano quando il lock cambia;
 * - i passi a più righe (`run: |`): installazioni, non verifiche
 *   (`tools/uiTests.mjs` dice da sé che cosa manca).
 *
 * `--solo <lavoro>` esegue un lavoro solo (`verifica`, `interfaccia`).
 * Si ferma al primo passo rosso, come la CI, e ne mostra l'uscita.
 */

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import * as percorso from 'node:path'

import { RADICE } from './common.mjs'

const WORKFLOW = percorso.join(RADICE, '.github', 'workflows', 'verifica.yml')

/** I comandi che preparano la macchina e non verificano niente. */
const PREPARAZIONE = new Set(['npm ci'])

/**
 * I lavori del workflow e i loro passi `run:` di una riga. Non è un lettore
 * YAML: legge la forma di questo file (`jobs:`, lavori a due spazi, `- name:` e
 * `run:` sotto `steps:`). Quel che non riconosce lo salta dicendolo.
 */
function lavoriDel (testo) {
  const lavori = []
  let dentroJobs = false
  let lavoro = null
  let nome = null
  for (const grezza of testo.split(/\r?\n/)) {
    const riga = grezza.replace(/\s+#.*$/, '')
    if (/^jobs:\s*$/.test(riga)) { dentroJobs = true; continue }
    if (!dentroJobs) continue
    const nuovo = /^ {2}([\w-]+):\s*$/.exec(riga)
    if (nuovo) {
      lavoro = { nome: nuovo[1], passi: [] }
      lavori.push(lavoro)
      continue
    }
    if (!lavoro) continue
    const titolo = /^\s+- name:\s*(.+)$/.exec(riga)
    if (titolo) { nome = titolo[1].replace(/^['"]|['"]$/g, ''); continue }
    const comando = /^\s+(?:- )?run:\s*(.*)$/.exec(riga)
    if (comando) {
      const cosa = comando[1].trim()
      lavoro.passi.push({ nome: nome ?? cosa, comando: cosa === '|' || cosa === '>' ? null : cosa })
      nome = null
      continue
    }
    if (/^\s+- uses:/.test(riga)) nome = null
  }
  return lavori
}

function esegui (comando) {
  const inizio = Date.now()
  const esito = spawnSync(comando, { cwd: RADICE, shell: true, stdio: 'inherit' })
  return { ok: esito.status === 0, secondi: ((Date.now() - inizio) / 1000).toFixed(1) }
}

const chiesto = process.argv.includes('--solo') ? process.argv[process.argv.indexOf('--solo') + 1] : null
const lavori = lavoriDel(readFileSync(WORKFLOW, 'utf8')).filter((l) => !chiesto || l.nome === chiesto)
if (lavori.length === 0) {
  console.error(chiesto ? `Nel workflow non c'è un lavoro «${chiesto}».` : 'Nel workflow non ho trovato lavori.')
  process.exit(1)
}

const riepilogo = []
for (const lavoro of lavori) {
  console.log(`\n=== ${lavoro.nome}`)
  for (const passo of lavoro.passi) {
    if (!passo.comando) {
      console.log(`— salto «${passo.nome}»: è un'installazione a più righe`)
      continue
    }
    if (PREPARAZIONE.has(passo.comando)) {
      console.log(`— salto «${passo.nome}»: prepara la macchina della CI`)
      continue
    }
    console.log(`\n— ${passo.nome}: ${passo.comando}`)
    const { ok, secondi } = esegui(passo.comando)
    riepilogo.push(`${ok ? 'ok ' : 'NO '} ${lavoro.nome} › ${passo.nome} (${secondi} s)`)
    if (!ok) {
      console.log(`\n${riepilogo.join('\n')}\n\nLa CI si fermerebbe qui: «${passo.nome}» non passa.`)
      process.exit(1)
    }
  }
}
console.log(`\n${riepilogo.join('\n')}\n\nTutti i passi del workflow passano.`)
