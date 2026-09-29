// Il calendario scolastico ufficiale nei moduli dell'anno: che cosa manca, che
// cosa è diverso, che cosa importare. Si confronta con quel che il modulo ha
// davanti (date scritte, pause dell'editor), non con l'anno salvato. Il
// confronto sta in `domain/schoolCalendar.ts`; qui solo il disegno.
//
// Un anno che segue il calendario (ADR-51) non importa voce per voce: si
// riallinea, si stacca, o — scritto a mano — si collega. Sono gesti sull'anno
// salvato (`anno.calendario`), non aspettano «Salva».

import {
  anniDaProporre,
  annoUfficiale,
  applicaVoci,
  bozzaSincronizzata,
  calendarioDi,
  marcatoreDi,
  vociDaImportare,
  vociUfficiali,
  type AnnoUfficiale,
  type BozzaAnno,
  type VoceUfficiale,
} from '../../../core/dominio/schoolCalendar.js'
import type { AnnoScolastico, CalendarioDellAnno } from '../../../core/dominio/models.js'
import { formattaData, oggi } from '../../../core/dominio/dates.js'
import { Uno } from '../../../core/dominio/lexicon.js'
import { lessico } from '../../../core/dominio/lexicon.testi.js'
import { CALENDARIO_TICINO } from '../../../core/dati/schoolCalendarTicino.js'
import { pastiglia, pulsante, quieto, tendina } from '../components/base.js'
import { eseguiOAvvisa } from '../components/filters.js'
import { conferma } from '../components/modal.js'
import { h, rimpiazza } from '../dom.js'

import { testi } from './schoolCalendar.testi.js'

interface OpzioniCalendarioUfficiale {
  /** L'anno com'è adesso nel modulo. */
  leggi: () => BozzaAnno
  /** L'anno con le voci scelte: il modulo lo riscrive nei suoi campi. */
  applica: (nuovo: BozzaAnno) => void
  /** Solo le chiusure: dove inizio e fine non si toccano (il modulo delle pause). */
  soloPause?: boolean
  /**
   * L'anno salvato, com'è adesso: collegarlo, riallinearlo e staccarlo sono
   * gesti suoi. Assente per un anno che nasce.
   */
  anno?: () => AnnoScolastico | null
  /** Dopo uno di quei gesti: il modulo ha l'anno di prima, e si chiude. */
  fatto?: () => void
  /** Per un anno che nasce: il calendario che seguirà, se ne è stato scelto uno. */
  seguira?: () => CalendarioDellAnno | null
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

/** «Ticino 2026/2027»: il calendario che un anno segue, per le pastiglie. */
function fonteCalendario (marcatore: CalendarioDellAnno): string {
  const nome = calendarioDi(marcatore)?.cantoneNome ?? marcatore.cantone
  return testi().fonte(nome, marcatore.annoScolastico)
}

/** La pastiglia «Dal calendario ufficiale · Ticino 2026/2027», se l'anno lo segue. */
export function pastigliaCalendario (
  anno: Pick<AnnoScolastico, 'calendarioUfficiale'>,
): HTMLElement | null {
  const marcatore = anno.calendarioUfficiale
  if (!marcatore) return null
  return pastiglia(testi().dalCalendarioUfficiale(fonteCalendario(marcatore)), 'informativo', 'calendario')
}

/** La pastiglia di una chiusura che viene dal calendario che l'anno segue. */
export function pastigliaChiusuraUfficiale (): HTMLElement {
  return pastiglia(testi().chiusuraUfficiale, 'informativo', 'calendario')
}

/**
 * Quante voci un anno che segue il calendario ha diverse dal calendario di
 * questa versione del registro: date, chiusure che mancano o sono cambiate,
 * chiusure che il calendario non ha più.
 */
export function vociDaRiallineare (anno: AnnoScolastico): number {
  const marcatore = anno.calendarioUfficiale
  const calendario = marcatore ? calendarioDi(marcatore) : null
  const ufficiale = calendario?.anni.find((a) => a.annoScolastico === marcatore?.annoScolastico)
  if (!calendario || !ufficiale) return 0
  const giusto = bozzaSincronizzata(calendario, ufficiale, anno)
  const chiave = (s: { id: string, etichetta: string, dal: string, al: string }) =>
    `${s.id}|${s.etichetta}|${s.dal}|${s.al}`
  const ora = new Set(anno.sospensioni.map(chiave))
  const dopo = new Set(giusto.sospensioni.map(chiave))
  return (anno.inizio !== giusto.inizio ? 1 : 0) +
    (anno.fine !== giusto.fine ? 1 : 0) +
    [...dopo].filter((c) => !ora.has(c)).length +
    [...ora].filter((c) => !dopo.has(c)).length
}

/**
 * Collega l'anno salvato al calendario ufficiale del suo anno scolastico,
 * dopo averlo chiesto: dice quali chiusure scritte a mano diventano bloccate.
 * Vero se è fatto.
 */
export async function collegaAlCalendario (anno: AnnoScolastico): Promise<boolean> {
  const t = testi()
  const ufficiale = annoUfficiale(CALENDARIO_TICINO, anno.inizio)
  if (!ufficiale) return false
  const confronto = vociUfficiali(CALENDARIO_TICINO, anno)
  // Le chiusure scritte a mano che il calendario riconosce: da qui in poi sue.
  const riconosciute = (confronto?.voci ?? []).filter(
    (voce) => voce.genere === 'pausa' && voce.attuale && voce.stato !== 'allineata',
  ).length
  const sicuro = await conferma({
    titolo: t.collegaTitolo(fonteCalendario(marcatoreDi(CALENDARIO_TICINO, ufficiale))),
    testo: t.collegaTesto(riconosciute),
    testoConferma: t.collega,
  })
  if (!sicuro) return false
  const risposta = await eseguiOAvvisa({ tipo: 'anno.calendario', annoId: anno.id, collega: true })
  return risposta.ok
}

/** Riporta l'anno che segue il calendario ai valori di questa versione. */
export async function riallineaAlCalendario (anno: AnnoScolastico): Promise<boolean> {
  const risposta = await eseguiOAvvisa({ tipo: 'anno.calendario', annoId: anno.id, collega: true })
  return risposta.ok
}

/** Stacca l'anno dal calendario, dopo averlo chiesto: date e chiusure restano. */
async function staccaDalCalendario (anno: AnnoScolastico): Promise<boolean> {
  const t = testi()
  const sicuro = await conferma({
    titolo: t.staccaTitolo,
    testo: t.staccaTesto,
    testoConferma: t.stacca,
    pericolo: true,
  })
  if (!sicuro) return false
  const risposta = await eseguiOAvvisa({ tipo: 'anno.calendario', annoId: anno.id, collega: false })
  return risposta.ok
}

/**
 * La sezione: una casella per voce da importare, tutte accese, e il pulsante.
 * `ridisegna` la rifà quando cambia una data del modulo. Per un anno che segue
 * il calendario, al posto delle caselle lo stato e i due gesti.
 */
export function sezioneCalendarioUfficiale (
  opzioni: OpzioniCalendarioUfficiale,
): { elemento: HTMLElement, ridisegna: () => void } {
  const elemento = h('div', { class: 'calendario-ufficiale' })
  const corpo = h('div', { class: 'calendario-ufficiale__corpo' })

  /** Un gesto sull'anno salvato: se riesce il modulo si chiude. */
  const gesto = (fa: (anno: AnnoScolastico) => Promise<boolean>) => async () => {
    const anno = opzioni.anno?.()
    if (!anno) return
    if (await fa(anno)) opzioni.fatto?.()
  }

  const ridisegna = (): void => {
    const t = testi()
    rimpiazza(elemento, corpo)
    const salvato = opzioni.anno?.() ?? null

    // L'anno segue il calendario: niente da scegliere, solo come sta.
    if (salvato?.calendarioUfficiale) {
      const diverse = vociDaRiallineare(salvato)
      rimpiazza(
        corpo,
        quieto(t.segue(fonteCalendario(salvato.calendarioUfficiale))),
        diverse > 0 ? quieto(t.daRiallineare(diverse)) : null,
        h(
          'div',
          { class: 'calendario-ufficiale__piede' },
          diverse > 0
            ? pulsante({
                testo: t.riallinea,
                simbolo: 'ricarica',
                variante: 'sottile',
                al: gesto(riallineaAlCalendario),
              })
            : null,
          pulsante({
            testo: t.stacca,
            variante: 'fantasma',
            al: gesto(staccaDalCalendario),
          }),
        ),
      )
      return
    }
    const seguira = opzioni.seguira?.() ?? null
    if (seguira) {
      rimpiazza(corpo, quieto(t.seguira(fonteCalendario(seguira))))
      return
    }

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
    // Un anno scritto a mano che il calendario conosce si può collegare.
    const collega = salvato && annoUfficiale(CALENDARIO_TICINO, salvato.inizio)
      ? h(
          'div',
          { class: 'calendario-ufficiale__piede' },
          quieto(t.collegaAiuto),
          pulsante({
            testo: t.collega,
            simbolo: 'collegamento',
            variante: 'sottile',
            al: gesto(collegaAlCalendario),
          }),
        )
      : null

    if (daFare.length === 0) {
      rimpiazza(corpo, quieto(t.allineato(fonte, allineate)), collega)
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
      collega,
    )
  }

  ridisegna()
  return { elemento, ridisegna }
}

/** Gli anni da proporre per un anno nuovo: quello in corso e i successivi. */
export function anniUfficialiDaProporre (): AnnoUfficiale[] {
  return anniDaProporre(CALENDARIO_TICINO, oggi())
}

/**
 * L'anno che nasce da un anno del calendario: date, tutte le chiusure con i
 * nomi ufficiali, e il calendario che seguirà.
 */
export function bozzaUfficiale (
  anno: AnnoUfficiale,
  bozza: BozzaAnno,
): BozzaAnno & { calendarioUfficiale: CalendarioDellAnno } {
  return {
    ...bozzaSincronizzata(CALENDARIO_TICINO, anno, bozza),
    calendarioUfficiale: marcatoreDi(CALENDARIO_TICINO, anno),
  }
}

/**
 * La tendina «Anno scolastico» in cima a un anno nuovo: gli anni del
 * calendario e «date scritte a mano». Sceglierne uno porta date, vacanze e
 * festivi in un gesto, e l'anno nascerà collegato; «date scritte a mano»
 * lascia tutto libero. Il valore è il calendario che l'anno seguirà.
 */
export function sceltaAnnoUfficiale (opzioni: {
  leggi: () => BozzaAnno
  applica: (nuovo: ReturnType<typeof bozzaUfficiale>) => void
  /** L'anno seguirà questo calendario, o `null` se le date sono scritte a mano. */
  seguira: () => CalendarioDellAnno | null
  /** Scelto «date scritte a mano». */
  aMano: () => void
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
    const attuale = opzioni.seguira()?.annoScolastico ?? ''
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
            if (!anno) {
              opzioni.aMano()
              return
            }
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
