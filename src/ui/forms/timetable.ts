// L'editor delle fasce fisse di un corso: prende un elenco di ricorrenze e ne
// rende uno modificato, senza dipendere da nessuna finestra.

import { fineNellaGiornata } from '../../domain/breaks.js'
import {
  formattaDurata,
  minutiDaUd,
  minutiInUd,
  siglaUd,
  udDaMinuti,
} from '../../domain/dates.js'
import { creaRicorrenza } from '../../domain/factories.js'
import { Molti } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import type { Giornata, Ricorrenza } from '../../domain/models.js'
import { ricorrenzeIncatenate } from '../../domain/timetable.js'
import { pastiglia, pulsante, tendina } from '../components/base.js'
import { h, rimpiazza } from '../dom.js'
import { stato } from '../state.js'
import { vociGiornoSettimana, fuocoSullaPresa, presaDiRiga, riordinatore, spostaVoce } from './common.js'
import { parole } from '../../domain/words.testi.js'
import { testi } from './timetable.testi.js'

/**
 * La giornata del documento com'è adesso: quanto dura un'UD e dove cadono le
 * pause. Letta a ogni uso e non all'apertura, come il resto del modulo.
 */
function giornata (): Giornata {
  return stato.registro.impostazioni
}

export function editorRicorrenze (
  iniziali: Ricorrenza[],
  allaModifica: (orario: Ricorrenza[]) => void,
): HTMLElement {
  // All'apertura l'ordine viene dagli orari salvati; poi lo tiene chi trascina, e
  // il riordino guarda solo il giorno.
  const t = testi()
  let orario = [...iniziali]
    .sort((a, b) => a.giorno - b.giorno || a.inizio.localeCompare(b.inizio))
    .map((r) => ({ ...r }))

  const contenitore = h('div', { class: 'slot-editor' })

  const notifica_ = () => allaModifica(orario.map((r) => ({ ...r })))

  const righe = h('div', { class: 'slot-editor__righe' })
  const totale = h('span', { class: 'slot-editor__conti' })
  /** Come rimettere nei campi di ogni riga quel che dice il modello. */
  const sincronizzatori: Array<() => void> = []

  /**
   * Rimette le fasce in fila per giorno e riattacca ciascuna alla precedente,
   * sugli stessi oggetti (le righe tengono la loro voce). L'ordinamento è stabile
   * e guarda solo il giorno; le pause della giornata stanno in mezzo.
   */
  const riallinea = () => {
    orario = [...orario].sort((a, b) => a.giorno - b.giorno)
    const attaccate = ricorrenzeIncatenate(orario, giornata())
    orario.forEach((r, i) => {
      r.inizio = attaccate[i].inizio
    })
  }

  const aggiornaTotale = () => {
    const settimanali = orario.reduce((somma, r) => somma + r.durataMin, 0)
    rimpiazza(
      totale,
      orario.length > 0
        ? pastiglia(
            t.udASettimana(
              udDaMinuti(settimanali, giornata().minutiUd),
              siglaUd(),
              formattaDurata(settimanali),
            ),
            'informativo',
            'orologio',
          )
        : h('span', { class: 'testo-quieto' }, t.senzaFasce),
    )
  }

  /** Rifà la catena e rimette nei campi quel che ne è venuto fuori. */
  const incatena = () => {
    riallinea()
    for (const sincronizza of sincronizzatori) sincronizza()
    aggiornaTotale()
    notifica_()
  }

  const riordina = riordinatore(righe, (da, a) => {
    if (a < 0 || a >= orario.length || da === a) return
    // Trascinata fra le fasce di un altro giorno, la fascia passa a quel giorno.
    orario[da].giorno = orario[a].giorno
    orario = spostaVoce(orario, da, a)
    disegna()
    notifica_()
    fuocoSullaPresa(righe, a)
  })

  /** Il primo giorno della settimana senza fasce, a partire da quello dato. */
  const giornoLibero = (da: number): number => {
    for (let passo = 1; passo <= 6; passo += 1) {
      const giorno = ((da - 1 + passo) % 7) + 1
      if (!orario.some((r) => r.giorno === giorno)) return giorno
    }
    return da
  }

  const rigaRicorrenza = (voce: Ricorrenza, indice: number): HTMLElement => {
    // La prima fascia del giorno dice a che ora si entra; le altre vengono dietro.
    const attaccata = indice > 0 && orario[indice - 1].giorno === voce.giorno
    const fine = h('span', { class: 'slot-riga__durata' })

    const inizio = h('input', {
      class: 'campo__controllo campo__controllo--ora',
      type: 'time',
      value: voce.inizio,
      disabled: attaccata,
      attr: {
        'aria-label': attaccata ? t.inizioAttaccato : t.inizioGiornata,
        title: attaccata ? t.aiutoAttaccato : t.aiutoGiornata,
      },
    })

    const durata = h('input', {
      class: 'campo__controllo campo__controllo--numero',
      type: 'number',
      value: String(udDaMinuti(voce.durataMin, giornata().minutiUd)),
      attr: { min: '1', step: '1', 'aria-label': Molti(lessico().unitaDidattica) },
    })

    const sincronizza = () => {
      inizio.value = voce.inizio
      durata.value = String(udDaMinuti(voce.durataMin, giornata().minutiUd))
      // La fine della lezione che ne nascerà: con una pausa in mezzo, dopo.
      rimpiazza(fine, `→ ${fineNellaGiornata(voce.inizio, voce.durataMin, giornata())}`)
    }
    sincronizzatori.push(sincronizza)

    inizio.addEventListener('change', () => {
      if (!inizio.value) return sincronizza()
      voce.inizio = inizio.value
      // Spostare la prima fascia sposta la giornata: le altre sono attaccate.
      incatena()
    })

    durata.addEventListener('change', () => {
      voce.durataMin = minutiDaUd(Number(durata.value) || 1, giornata().minutiUd)
      // Allungare una fascia spinge avanti quelle che le stanno dietro.
      incatena()
    })

    const presa = presaDiRiga()
    const riga = h(
      'div',
      { class: 'slot-riga' },
      presa,
      tendina({
        voci: vociGiornoSettimana(),
        valore: String(voce.giorno),
        etichetta: parole().giorno,
        classe: 'slot-riga__giorno',
        al: (scelto) => {
          voce.giorno = Number(scelto)
          // In coda al nuovo giorno: l'ordinamento stabile la lascia lì.
          orario = [...orario.filter((r) => r !== voce), voce]
          disegna()
          notifica_()
        },
      }),
      inizio,
      durata,
      h('span', { class: 'slot-riga__durata' }, siglaUd()),
      fine,
      h('input', {
        class: 'campo__controllo',
        type: 'text',
        value: voce.aula ?? '',
        attr: { placeholder: t.segnapostoAula, 'aria-label': parole().aula },
        onchange: (evento: Event) => {
          voce.aula = (evento.target as HTMLInputElement).value
          notifica_()
        },
      }),
      pulsante({
        simbolo: 'duplica',
        variante: 'fantasma',
        titolo: t.ripeti,
        al: () => {
          // La copia va sul primo giorno vuoto con la stessa ora e durata: un orario è
          // quasi sempre la stessa ora in giorni diversi.
          const copia = creaRicorrenza(giornoLibero(voce.giorno), voce.inizio, voce.durataMin)
          copia.aula = voce.aula
          orario.push(copia)
          disegna()
          notifica_()
        },
      }),
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: t.togli,
        al: () => {
          orario = orario.filter((r) => r.id !== voce.id)
          disegna()
          notifica_()
        },
      }),
    )
    riordina(riga, presa, indice)
    sincronizza()
    return riga
  }

  function disegna (): void {
    riallinea()
    sincronizzatori.length = 0
    rimpiazza(righe, ...orario.map(rigaRicorrenza))
    aggiornaTotale()
  }

  contenitore.append(
    righe,
    h(
      'div',
      { class: 'slot-editor__coda' },
      pulsante({
        testo: t.aggiungi,
        simbolo: 'piu',
        variante: 'sottile',
        al: () => {
          const ultima = orario.at(-1)
          orario.push(
            creaRicorrenza(
              ultima?.giorno ?? 1,
              ultima?.inizio ?? stato.registro.impostazioni.oraInizioGiornata,
              minutiInUd(
                ultima?.durataMin ?? stato.registro.impostazioni.durataSlotPredefinita,
                giornata().minutiUd,
              ),
            ),
          )
          disegna()
          notifica_()
        },
      }),
      totale,
    ),
  )

  disegna()
  // Come per gli slot: le fasce mostrate sono già attaccate, e si salvano anche
  // senza toccare niente.
  notifica_()
  return contenitore
}
