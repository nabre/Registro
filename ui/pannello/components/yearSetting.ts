// Le righe delle impostazioni dell'anno, con la forma di quelle del programma
// (`settings/program.ts`): nome, «i», e sotto il controllo condiviso di
// `core/controlli/` (`campo()`). Una sezione dell'anno si legge nello stesso
// ordine delle altre: Stato e gesti, Scelte, Avanzate (chiuse).
//
// I controlli passano dalla delega del pannello (`gestisci`): un nodo che il
// ridisegno riusa prende i gestori del disegno nuovo.

import { campo, type SpecCampo, type ValoreCampo } from '../../../core/controlli/field.js'
import type { Esito } from '../../../core/controlli/control.js'
import { gestisci, h, type Figlio } from '../dom.js'
import { suggerimento } from './hint.js'
import { testi } from './yearSetting.testi.js'

/** Il controllo di un campo dell'anno, disegnato come quelli del programma. */
export function campoAnno (
  spec: SpecCampo | (() => SpecCampo),
  quandoCambia: (valore: ValoreCampo) => Promise<Esito> | void,
): HTMLElement {
  return campo(spec, quandoCambia, document, { ascolta: gestisci })
}

interface Voce {
  nome: string
  /** La spiegazione, dietro la «i» accanto al nome. */
  aiuto?: Figlio
  /** L'ancora `data-voce`: il filtro e i rimandi arrivano qui. */
  voce?: string
  controllo: Figlio
  /** Quel che sta accanto al nome: una pastiglia, un pulsante. */
  accanto?: Figlio
  /** Quel che sta sotto il controllo: un conto, un avviso. */
  sotto?: Figlio
}

/** Una riga: il nome con la «i», il controllo, e quel che gli sta sotto. */
export function voceAnno (voce: Voce): HTMLElement {
  return h(
    'div',
    { class: 'voce-opzione', dataset: { voce: voce.voce } },
    h(
      'div',
      { class: 'voce-opzione__testata' },
      h(
        'span',
        { class: 'voce-opzione__nome' },
        voce.nome,
        voce.aiuto ? suggerimento(voce.aiuto, { etichetta: voce.nome }) : null,
      ),
      voce.accanto ?? null,
    ),
    h('div', { class: 'voce-opzione__campo' }, voce.controllo),
    voce.sotto ?? null,
  )
}

/** Un gruppo di righe con il suo titolo. */
export function gruppoAnno (titolo: string | null, ...righe: Figlio[]): HTMLElement {
  return h(
    'section',
    { class: 'gruppo-opzioni' },
    titolo ? h('h3', { class: 'gruppo-opzioni__titolo' }, titolo) : null,
    h('div', { class: 'voci-opzioni' }, ...righe),
  )
}

/**
 * Quali gruppi avanzati stanno aperti. Fuori da stato e DOM: il ridisegno
 * ricreerebbe chiuso il `<details>`, e non è una preferenza da salvare.
 */
const aperte = new Set<string>()

/** Le voci rare di una sezione, in fondo, chiuse finché non le si apre. */
export function avanzateAnno (id: string, righe: HTMLElement[]): Figlio {
  if (righe.length === 0) return null
  return h(
    'details',
    {
      class: 'gruppo-opzioni gruppo-opzioni--avanzate',
      dataset: { avanzate: id },
      open: aperte.has(id),
      ontoggle: (evento: Event) => {
        const suo = evento.currentTarget as HTMLDetailsElement
        if (suo.open) aperte.add(id)
        else aperte.delete(id)
      },
    },
    h('summary', { class: 'gruppo-opzioni__titolo' }, testi().avanzate(righe.length)),
    h('div', { class: 'voci-opzioni' }, ...righe),
  )
}

/** Le parti di una sezione, nell'ordine di tutte: Stato e gesti, Scelte, Avanzate. */
export function sezioneAnno (parti: {
  stato?: Figlio
  scelte?: Figlio
  avanzate?: Figlio
}): HTMLElement {
  return h(
    'div',
    { class: 'gruppi-opzioni' },
    parti.stato ?? null,
    parti.scelte ?? null,
    parti.avanzate ?? null,
  )
}
