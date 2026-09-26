// Il calendario scolastico ufficiale nei moduli dell'anno: che cosa manca, che
// cosa è diverso, che cosa importare. Si confronta con quel che il modulo ha
// davanti (date scritte, pause dell'editor), non con l'anno salvato. Il
// confronto sta in `domain/schoolCalendar.ts`; qui solo il disegno.

import {
  anniDaProporre,
  applicaVoci,
  bozzaDaAnnoUfficiale,
  vociDaImportare,
  vociUfficiali,
  type AnnoUfficiale,
  type BozzaAnno,
  type VoceUfficiale,
} from '../../domain/schoolCalendar.js'
import { etichettaAnno, formattaData, oggi } from '../../domain/dates.js'
import { Uno } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { CALENDARIO_TICINO } from '../../data/schoolCalendarTicino.js'
import { pastiglia, pulsante, quieto, tendina } from '../components/base.js'
import { h, rimpiazza } from '../dom.js'

import { testi } from './schoolCalendar.testi.js'

interface OpzioniCalendarioUfficiale {
  /** L'anno com'è adesso nel modulo. */
  leggi: () => BozzaAnno
  /** L'anno con le voci scelte: il modulo lo riscrive nei suoi campi. */
  applica: (nuovo: BozzaAnno) => void
  /** Solo le chiusure: dove inizio e fine non si toccano (il modulo delle pause). */
  soloPause?: boolean
}

/** Le date di una voce, lette. */
function quando (dal: string, al: string): string {
  return dal === al ? formattaData(dal, 'lungo') : `${formattaData(dal)} → ${formattaData(al)}`
}

/** Che cosa succede a una voce se la si importa. */
function stato (voce: VoceUfficiale): HTMLElement {
  const t = testi()
  if (voce.stato === 'mancante') return pastiglia(t.daAggiungere, 'informativo')
  if (voce.stato === 'da-collegare') {
    return pastiglia(t.giaCe(voce.attuale?.etichetta ?? ''), 'neutro')
  }
  const ora = voce.attuale ? quando(voce.attuale.dal, voce.attuale.al) : ''
  return pastiglia(t.ora(ora), 'attenzione')
}

/**
 * La sezione: una casella per voce da importare, tutte accese, e il pulsante.
 * `ridisegna` la rifà quando cambia una data del modulo.
 */
export function sezioneCalendarioUfficiale (
  opzioni: OpzioniCalendarioUfficiale,
): { elemento: HTMLElement, ridisegna: () => void } {
  const elemento = h('div', { class: 'calendario-ufficiale' })
  const corpo = h('div', { class: 'calendario-ufficiale__corpo' })

  const ridisegna = (): void => {
    const t = testi()
    rimpiazza(elemento, corpo)
    const bozza = opzioni.leggi()
    const confronto = vociUfficiali(CALENDARIO_TICINO, bozza)
    const nome = t.nome(CALENDARIO_TICINO.cantoneNome)
    if (!confronto) {
      rimpiazza(corpo, quieto(t.nonCeAncora(nome, formattaData(bozza.inizio))))
      return
    }
    const tutte = confronto.voci.filter((voce) => !opzioni.soloPause || voce.genere === 'pausa')
    const daFare = vociDaImportare(tutte)
    const allineate = tutte.length - daFare.length
    const fonte = `${nome} ${confronto.anno.annoScolastico}`

    if (daFare.length === 0) {
      rimpiazza(corpo, quieto(t.allineato(fonte, allineate)))
      return
    }

    const caselle = new Map<string, HTMLInputElement>()
    const righe = daFare.map((voce) => {
      const casella = h('input', { type: 'checkbox', checked: true })
      caselle.set(voce.chiave, casella)
      return h(
        'li',
        { class: 'calendario-ufficiale__voce' },
        h(
          'label',
          { class: 'calendario-ufficiale__scelta' },
          casella,
          h('strong', null, voce.etichetta),
          h('span', { class: 'testo-quieto' }, quando(voce.dal, voce.al)),
        ),
        stato(voce),
      )
    })

    rimpiazza(
      corpo,
      quieto(t.daFare(fonte, daFare.length, allineate)),
      h('ul', { class: 'calendario-ufficiale__elenco' }, ...righe),
      h(
        'div',
        { class: 'calendario-ufficiale__piede' },
        pulsante({
          testo: t.importa,
          simbolo: 'calendario',
          variante: 'sottile',
          al: () => {
            const scelte = [...caselle].filter(([, c]) => c.checked).map(([chiave]) => chiave)
            if (scelte.length === 0) return
            opzioni.applica(applicaVoci(CALENDARIO_TICINO, bozza, scelte))
            ridisegna()
          },
        }),
      ),
    )
  }

  ridisegna()
  return { elemento, ridisegna }
}

/** Gli anni da proporre per un anno nuovo: quello in corso e i successivi. */
export function anniUfficialiDaProporre (): AnnoUfficiale[] {
  return anniDaProporre(CALENDARIO_TICINO, oggi())
}

/** L'anno che nasce da un anno del calendario: date e tutte le chiusure. */
export function bozzaUfficiale (anno: AnnoUfficiale, bozza: BozzaAnno): BozzaAnno {
  return bozzaDaAnnoUfficiale(CALENDARIO_TICINO, anno, bozza)
}

/**
 * La tendina «Anno scolastico» in cima a un anno nuovo: gli anni del
 * calendario e «date scritte a mano». Sceglierne uno porta date, vacanze e
 * festivi in un gesto. Il valore segue le date del modulo (`ridisegna`), o
 * passa a «date scritte a mano» se quell'anno il calendario non lo porta.
 */
export function sceltaAnnoUfficiale (opzioni: {
  leggi: () => BozzaAnno
  applica: (nuovo: BozzaAnno) => void
}): { elemento: HTMLElement, ridisegna: () => void } {
  const anni = anniUfficialiDaProporre()
  const elemento = h('div', { class: 'calendario-ufficiale__scelta-anno' })
  const ridisegna = (): void => {
    const t = testi()
    const annoScolastico = Uno(lessico().annoScolastico)
    if (anni.length === 0) {
      rimpiazza(elemento)
      return
    }
    const attuale = etichettaAnno(opzioni.leggi().inizio)
    rimpiazza(
      elemento,
      h(
        'label',
        { class: 'calendario-ufficiale__anno' },
        h('strong', null, annoScolastico),
        tendina({
          voci: [
            ...anni.map((anno) => ({ valore: anno.annoScolastico, testo: anno.annoScolastico })),
            { valore: '', testo: t.aMano },
          ],
          valore: anni.some((anno) => anno.annoScolastico === attuale) ? attuale : '',
          etichetta: annoScolastico,
          al: (valore) => {
            const anno = anni.find((a) => a.annoScolastico === valore)
            // «Date scritte a mano» non tocca niente: le date si scrivono sotto.
            if (!anno) return
            opzioni.applica(bozzaUfficiale(anno, opzioni.leggi()))
          },
        }),
      ),
      quieto(t.dalCalendario(CALENDARIO_TICINO.cantoneNome)),
    )
  }
  ridisegna()
  return { elemento, ridisegna }
}

/** Quante voci del calendario l'anno non ha: per un avviso fuori dai moduli. */
export function vociUfficialiDaImportare (bozza: BozzaAnno): number {
  const confronto = vociUfficiali(CALENDARIO_TICINO, bozza)
  return confronto ? vociDaImportare(confronto.voci).length : 0
}
