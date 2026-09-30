// Le impostazioni del programma: quelle che restano su questa macchina.
// Le stesse di `contract/manifesto.ts` e della finestra nativa, raggruppate per
// argomento, con il nome a parole e il valore accanto al suo perché. La
// divisione in sezioni sta in `sections.ts`, senza DOM, e si prova.
// «Ripristina» riporta al predefinito le voci di un'area, dagli elenchi soltanto.

import type { VoceProgramma } from '../../../../contract/protocollo.js'
import { controllo, type Esito, type Valore } from '../../../../core/controlli/control.js'
import {
  avviso,
  pastiglia,
  pulsante,
  scheda,
  statoVuoto,
} from '../../components/base.js'
import { suggerimento } from '../../components/hint.js'
import type { NomeIcona } from '../../components/icons.js'
import { conferma } from '../../components/modal.js'
import { notifica } from '../../components/notifications.js'
import { gestisci, h, type Figlio } from '../../dom.js'
import { azione, invia } from '../../bridge.js'
import type { AreaImpostazioni } from '../../posto.js'
import { stato, vai } from '../../state.js'
import {
  avanzateDiSezione,
  daRipristinare,
  gruppiDiSezione,
  nomeVoce,
  titoloArea,
  vociMostrateDaSezione,
  type GruppoVoci,
  type SezioneProgramma,
} from './sections.js'
import { testi } from './program.testi.js'

/**
 * Scrive un valore e dice com'è andata, per la riga sotto il campo: `null`
 * salvato, o il motivo della dogana. Con `invia` e non `azione`: il rifiuto si
 * legge accanto al campo, non in una notifica. Il valore nuovo torna con lo stato.
 */
async function scrivi (chiave: string, valore: Valore): Promise<Esito> {
  const risposta = await invia({ tipo: 'programma.salva', chiave, valore })
  if (risposta.ok) return null
  return risposta.errori?.join(' ') || undefined
}

async function ritira (chiave: string): Promise<void> {
  const risposta = await azione({ tipo: 'programma.azzera', chiave })
  if (!risposta.ok) return
  notifica(testi().tornaAlPredefinito(nomeVoce(chiave)), 'info')
}

/**
 * Il controllo di una voce, lo stesso della finestra nativa (`core/controlli/`).
 * I gestori passano dalla delega del pannello (`gestisci`): un nodo che il
 * ridisegno riusa prende quelli del disegno nuovo.
 */
function campoDi (voce: VoceProgramma, aiModelli: () => void): Figlio {
  return controllo(voce, (valore) => scrivi(voce.chiave, valore), document, {
    ascolta: gestisci,
    sfoglia: () => void sfoglia(voce.chiave),
    svuota: () => void ritira(voce.chiave),
    aiModelli,
  })
}

/** Il rimando di serie alla sezione dei modelli; chi ha un filtro aperto passa il suo. */
function apriModelli (): void {
  vai({ pagina: 'pagina.impostazioni', scheda: 'programma#modelli' })
}

async function sfoglia (chiave: string): Promise<void> {
  await azione({ tipo: 'programma.sfoglia', chiave })
}

/**
 * Una riga di impostazione: che cos'è, com'è adesso, e perché non si tocca
 * quando non si tocca. `aiModelli` porta alla sezione dei modelli: il filtro
 * passa il suo, che si svuota.
 */
export function vociProgramma (
  voce: VoceProgramma,
  aiModelli: () => void = apriModelli,
): HTMLElement {
  // Già decisa da chi ha costruito l'elenco, con la stessa regola della finestra nativa.
  const spenta = voce.sospesa
  // Un interruttore a cui manca quel che richiede arriva spento e non si
  // accende: una casella che torna indietro da sola sembrerebbe un guasto.
  const bloccata = voce.bloccata
  const t = testi()
  return h(
    'div',
    {
      // Una voce decisa a mano non si evidenzia: cambiare un'impostazione è
      // normale, non un avviso. Una figlia (`dipendeDa`) sta rientrata sotto il padre.
      class: ['voce-opzione', spenta && 'voce-opzione--sospesa', voce.dipendeDa && 'voce-opzione--figlia'],
      // L'ancora dell'indirizzo `programma#<chiave>`: il filtro e Ctrl+K arrivano qui.
      dataset: { voce: voce.chiave },
    },
    h(
      'div',
      { class: 'voce-opzione__testata' },
      // La descrizione del manifesto sta dietro la «i» accanto al nome; il filtro
      // la guarda comunque (`corrisponde`).
      h(
        'span',
        { class: 'voce-opzione__nome' },
        nomeVoce(voce.chiave),
        voce.descrizione
          ? suggerimento(voce.descrizione, { etichetta: nomeVoce(voce.chiave) })
          : null,
      ),
      // Perché non si può toccare, detto accanto al campo.
      spenta
        ? pastiglia(t.sospesa(nomeVoce(voce.dipendeDa ?? '')), 'quiete')
        : null,
      bloccata && !spenta ? pastiglia(t.nonSiAccende, 'attenzione') : null,
      // Il registro la legge solo partendo: detto qui, non soltanto nella «i».
      voce.alProssimoAvvio
        ? h(
            'span',
            { class: 'voce-opzione__avvio', attr: { title: t.alProssimoAvvioAiuto } },
            pastiglia(t.alProssimoAvvio, 'quiete', 'ricarica'),
          )
        : null,
    ),
    h('div', { class: 'voce-opzione__campo' }, campoDi(voce, aiModelli)),
    bloccata && !spenta ? h('p', { class: 'voce-opzione__aiuto' }, bloccata) : null,
  )
}

/**
 * Un gruppo di impostazioni con il suo titolo, scritto solo quando aggiunge
 * qualcosa (non per una voce sola con lo stesso nome).
 */
function disegnaGruppo (gruppo: GruppoVoci): HTMLElement {
  const titoloUtile =
    gruppo.voci.length > 1 || nomeVoce(gruppo.voci[0]?.chiave ?? '') !== gruppo.titolo

  return h(
    'section',
    { class: 'gruppo-opzioni' },
    titoloUtile ? h('h3', { class: 'gruppo-opzioni__titolo' }, gruppo.titolo) : null,
    h('div', { class: 'voci-opzioni' }, ...gruppo.voci.map((voce) => vociProgramma(voce))),
  )
}

/**
 * Quali gruppi avanzati stanno aperti, per sezione. Fuori da stato e DOM: il
 * ridisegno ricreerebbe chiuso il `<details>`, e non è una preferenza da
 * salvare.
 */
const avanzateAperte = new Set<string>()

/**
 * Che cosa si legge quando una sezione non ha niente da mostrare. Tre casi: la
 * sezione che solo raccoglie è vuota per natura; un'altra sezione vuota vuol
 * dire impostazioni non ancora arrivate dall'host; oppure il filtro.
 */
function vuotoDi (
  sezione: SezioneProgramma,
): { simbolo: NomeIcona, titolo: string, testo: string } {
  const t = testi()
  if (sezione.raccoglie && sezione.prefissi.length === 0) {
    return {
      simbolo: 'impostazioni',
      titolo: t.nienteDaRaccogliere,
      testo: t.nienteDaRaccogliereTesto,
    }
  }
  return { simbolo: 'impostazioni', titolo: t.nonArrivate, testo: t.nonArrivateTesto }
}

/** Il gruppo delle voci rare, in fondo: chiuso, si apre a mano. */
export function disegnaAvanzate (sezione: { id: string }, voci: VoceProgramma[]): Figlio {
  if (voci.length === 0) return null
  return h(
    'details',
    {
      class: 'gruppo-opzioni gruppo-opzioni--avanzate',
      open: avanzateAperte.has(sezione.id),
      ontoggle: (evento: Event) => {
        const suo = evento.currentTarget as HTMLDetailsElement
        if (suo.open) avanzateAperte.add(sezione.id)
        else avanzateAperte.delete(sezione.id)
      },
    },
    h(
      'summary',
      { class: 'gruppo-opzioni__titolo' },
      testi().avanzate(voci.length),
    ),
    h('div', { class: 'voci-opzioni' }, ...voci.map((voce) => vociProgramma(voce))),
  )
}

/**
 * Le voci di una sezione: prima l'avvertenza, se concedono qualcosa ad altri,
 * poi i gruppi, poi le avanzate chiuse. Senza titolo: nome e riassunto li dice
 * già la testata della sezione.
 */
export function schedaProgramma (sezione: SezioneProgramma): HTMLElement {
  const voci = vociMostrateDaSezione(stato.programma, sezione)
  return scheda({
    classe: 'scheda--opzioni',
    contenuto: h(
      'div',
      null,
      // L'avvertenza prima delle caselle: qui si concede qualcosa ad altri programmi.
      sezione.avvertenza
        ? avviso(h('div', null, sezione.avvertenza.replace(/\*\*/g, '')), 'attenzione')
        : null,
      voci.length === 0
        ? statoVuoto(vuotoDi(sezione))
        : h(
            'div',
            { class: 'gruppi-opzioni' },
            ...gruppiDiSezione(stato.programma, sezione).map((gruppo) => disegnaGruppo(gruppo)),
            disegnaAvanzate(sezione, avanzateDiSezione(stato.programma, sezione)),
          ),
    ),
  })
}

/**
 * «Ripristina» di un'area: dice quante voci tocca, chiede, e le riporta al
 * predefinito. Solo quelle degli elenchi (`daRipristinare`); niente se non ce
 * n'è nessuna decisa a mano.
 */
export function ripristinaArea (area: AreaImpostazioni): HTMLElement | null {
  const voci = daRipristinare(stato.programma, area)
  if (voci.length === 0) return null
  const t = testi()
  const nome = titoloArea(area)
  return pulsante({
    testo: t.ripristinaQuante(voci.length),
    simbolo: 'ricarica',
    variante: 'sottile',
    titolo: t.ripristinaAiuto,
    al: async () => {
      const sicuro = await conferma({
        titolo: t.ripristinare(nome),
        testo: t.tornano(voci.length),
        testoConferma: t.ripristina,
      })
      if (!sicuro) return
      for (const voce of voci) {
        await azione({ tipo: 'programma.azzera', chiave: voce.chiave })
      }
      notifica(t.ripristinata(nome), 'info')
    },
  })
}
