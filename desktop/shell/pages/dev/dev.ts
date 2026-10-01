// Le opzioni di sviluppo nella finestra nativa: disegna lo stato che il main
// process manda (`statoSviluppo()` in `desktop/shell/windows/devTools.ts`) e
// rimanda ogni gesto come richiesta. Non tiene niente per sé: dopo ogni gesto
// arriva lo stato nuovo, e la pagina si ridisegna da quello.

// Per prima: la lingua della pagina, prima che qualunque altro modulo si carichi.
import '../../../../core/i18n/page.js'
// La barra del titolo, se la finestra ne ha una propria.
import '../shared/titleBar.js'
import type {
  Collegamento,
  FinestraSviluppo,
  RichiestaSviluppo,
  StatoSviluppo,
} from '../../windows/devTools.js'
import type { PosizioneConsole, TipoFinestra } from '../../../apparato/dev.js'
import { ascolta, elemento, manda, perId, riempi } from '../shared/page.js'
import { parole } from '../../../../core/dominio/words.testi.js'
import { testi } from './dev.testi.js'

import './dev.css'

const t = testi()
riempi(t)
document.title = t.titolo

const elencoFinestre = perId<HTMLUListElement>('finestre')
const allAvvio = perId('all-avvio')
const posizione = perId<HTMLSelectElement>('posizione')
const ricaricaAutomatica = perId<HTMLInputElement>('ricarica-automatica')
const collegamenti = perId<HTMLUListElement>('collegamenti')
const ambiente = perId('ambiente')
const rifiuto = perId('rifiuto')

function chiedi (richiesta: RichiestaSviluppo): void {
  manda(richiesta)
}

/** Un `select` delle posizioni della console, con quella scelta. */
function sceltaPosizione (
  posizioni: readonly PosizioneConsole[],
  scelta: PosizioneConsole,
  select = elemento('select'),
): HTMLSelectElement {
  select.replaceChildren(
    ...posizioni.map((voce) => {
      const opzione = elemento('option', null, t.posizioni[voce])
      opzione.value = voce
      opzione.selected = voce === scelta
      return opzione
    }),
  )
  return select
}

function nomeDelTipo (tipo: TipoFinestra | null): string {
  return tipo ? t.tipi[tipo] : t.altraFinestra
}

// ------------------------------------------------------------ le finestre

function rigaFinestra (
  voce: FinestraSviluppo,
  posizioni: readonly PosizioneConsole[],
): HTMLLIElement {
  const riga = elemento('li', 'riga')

  const nome = elemento('span', 'riga__nome')
  nome.append(
    elemento('span', null, nomeDelTipo(voce.tipo)),
    elemento('span', 'riga__sotto', voce.titolo),
  )

  const scelta = sceltaPosizione(posizioni, voce.posizione)
  scelta.setAttribute('aria-label', t.posizione)

  const casella = elemento('label', 'casella')
  const spunta = elemento('input')
  spunta.type = 'checkbox'
  spunta.checked = voce.console
  casella.append(spunta, elemento('span', null, t.console))

  const vuole = (aperta: boolean): void => {
    chiedi({
      sviluppo: 'console',
      id: voce.id,
      aperta,
      posizione: scelta.value as PosizioneConsole,
    })
  }
  spunta.addEventListener('change', () => vuole(spunta.checked))
  // Con la console aperta, cambiare posizione la sposta subito.
  scelta.addEventListener('change', () => {
    if (spunta.checked) vuole(true)
  })

  const ricarica = elemento('button', 'minuto', t.ricaricaFinestra)
  ricarica.type = 'button'
  ricarica.addEventListener('click', () => chiedi({ sviluppo: 'ricarica', id: voce.id }))

  riga.append(nome, casella, scelta, ricarica)
  return riga
}

function disegnaFinestre (stato: StatoSviluppo): void {
  if (stato.finestre.length === 0) {
    elencoFinestre.replaceChildren(elemento('li', 'vuota', t.nessunaFinestra))
    return
  }
  elencoFinestre.replaceChildren(
    ...stato.finestre.map((voce) => rigaFinestra(voce, stato.posizioni)),
  )
}

// ------------------------------------------------------------ le scelte

function disegnaScelte (stato: StatoSviluppo): void {
  const { impostazioni } = stato
  allAvvio.replaceChildren(
    ...(Object.keys(impostazioni.allAvvio) as TipoFinestra[]).map((tipo) => {
      const casella = elemento('label', 'casella')
      const spunta = elemento('input')
      spunta.type = 'checkbox'
      spunta.checked = impostazioni.allAvvio[tipo]
      spunta.addEventListener('change', () => {
        chiedi({ sviluppo: 'allAvvio', tipo, valore: spunta.checked })
      })
      casella.append(spunta, elemento('span', null, nomeDelTipo(tipo)))
      return casella
    }),
  )
  sceltaPosizione(stato.posizioni, impostazioni.posizione, posizione)
  ricaricaAutomatica.checked = impostazioni.ricaricaAutomatica
}

posizione.addEventListener('change', () => {
  chiedi({ sviluppo: 'posizione', posizione: posizione.value as PosizioneConsole })
})
ricaricaAutomatica.addEventListener('change', () => {
  chiedi({ sviluppo: 'ricaricaAutomatica', valore: ricaricaAutomatica.checked })
})
perId('ricarica-tutte').addEventListener('click', () => chiedi({ sviluppo: 'ricaricaTutte' }))
perId('riavvia').addEventListener('click', () => chiedi({ sviluppo: 'riavvia' }))

// ------------------------------------------------------------ cartelle e ambiente

function rigaCollegamento (
  cosa: Collegamento,
  etichetta: string,
  percorso: string | null,
  sotto: string,
): HTMLLIElement {
  const riga = elemento('li', 'riga')
  const nome = elemento('span', 'riga__nome')
  nome.append(elemento('span', null, etichetta), elemento('span', 'riga__sotto', sotto))
  nome.title = percorso ?? ''
  const apri = elemento('button', 'minuto', parole().apri)
  apri.type = 'button'
  apri.disabled = percorso === null
  apri.title = etichetta
  apri.addEventListener('click', () => chiedi({ sviluppo: 'apri', cosa }))
  riga.append(nome, apri)
  return riga
}

function disegnaCollegamenti (stato: StatoSviluppo): void {
  const { percorsi } = stato
  collegamenti.replaceChildren(
    rigaCollegamento('dati', t.cartellaDati, percorsi.dati, percorsi.dati),
    rigaCollegamento('documento', t.documento, percorsi.documento, percorsi.documento ?? t.nessunDocumento),
    rigaCollegamento(
      'giornale',
      t.giornale,
      percorsi.giornaleScritto ? percorsi.giornale : null,
      percorsi.giornaleScritto ? percorsi.giornale : t.giornaleAssente,
    ),
    rigaCollegamento('bundle', t.bundle, percorsi.bundle, percorsi.bundle),
  )
}

function disegnaAmbiente (stato: StatoSviluppo): void {
  ambiente.replaceChildren(
    ...stato.ambiente.flatMap(({ nome, valore }) => [
      elemento('dt', null, nome),
      elemento('dd', valore === null ? 'quieto' : null, valore ?? t.variabileAssente),
    ]),
  )
}

// ------------------------------------------------------------ i messaggi

let mostrata = false

ascolta((messaggio) => {
  if (messaggio.sviluppo === 'rifiuto') {
    rifiuto.textContent = typeof messaggio.motivo === 'string' ? messaggio.motivo : ''
    rifiuto.hidden = false
    return
  }
  if (messaggio.sviluppo !== 'stato') return
  const stato = messaggio.stato as StatoSviluppo
  disegnaFinestre(stato)
  disegnaScelte(stato)
  disegnaCollegamenti(stato)
  disegnaAmbiente(stato)
  if (!mostrata) {
    mostrata = true
    chiedi({ sviluppo: 'pronto' })
  }
})
