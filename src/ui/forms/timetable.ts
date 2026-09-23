// L'editor delle fasce fisse: le righe che dicono quando un corso si tiene.
//
// Sta in un file suo perche' lo usano in due — la finestra del corso e l'avvio
// guidato — e finche' abitava dentro `forms/course.ts` quei due si tiravano a
// vicenda: `classe -> corso -> classe` era l'ultimo dei quattro cicli di
// import di `moduli/`. Non dipende da nessuna delle finestre: prende un elenco
// di ricorrenze e ne rende uno modificato, e basta.

import { formattaDurata, minutiDaUd, minutiInUd, sommaMinuti, udDaMinuti } from '../../domain/dates.js'
import { creaRicorrenza } from '../../domain/factories.js'
import type { Ricorrenza } from '../../domain/models.js'
import { ricorrenzeIncatenate } from '../../domain/timetable.js'
import { pastiglia, pulsante } from '../components/base.js'
import { h, rimpiazza } from '../dom.js'
import { stato } from '../state.js'
import { VOCI_GIORNO_SETTIMANA, fuocoSullaPresa, presaDiRiga, riordinatore, spostaVoce } from './common.js'

export function editorRicorrenze (
  iniziali: Ricorrenza[],
  allaModifica: (orario: Ricorrenza[]) => void,
): HTMLElement {
  // All’apertura l’ordine viene dagli orari salvati; da lì in poi lo tiene chi
  // trascina, e il riordino guarda solo il giorno.
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
   * sugli stessi oggetti: le righe già costruite tengono in mano la loro voce.
   *
   * L’ordinamento è stabile e guarda solo il giorno, così l’ordine deciso
   * trascinando resta quello dentro la giornata.
   */
  const riallinea = () => {
    orario = [...orario].sort((a, b) => a.giorno - b.giorno)
    const attaccate = ricorrenzeIncatenate(orario)
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
            `${udDaMinuti(settimanali)} UD a settimana · ${formattaDurata(settimanali)}`,
            'informativo',
            'orologio',
          )
        : h('span', { class: 'testo-quieto' }, 'Senza fasce non si genera niente.'),
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
    // Trascinata fra le fasce di un altro giorno, la fascia passa a quel
    // giorno: è il gesto che si sta facendo, e chiederlo poi al menu sarebbe
    // farlo due volte.
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
    // La prima fascia del giorno dice a che ora si entra; le altre vengono
    // dietro.
    const attaccata = indice > 0 && orario[indice - 1].giorno === voce.giorno
    const fine = h('span', { class: 'slot-riga__durata' })

    const inizio = h('input', {
      class: 'campo__controllo campo__controllo--ora',
      type: 'time',
      value: voce.inizio,
      disabled: attaccata,
      attr: {
        'aria-label': attaccata ? 'Inizio, dato dalla fascia precedente' : 'Inizio della giornata',
        title: attaccata
          ? 'Comincia dove finisce la fascia sopra: per spostarla, cambia l’ordine o l’ora della prima fascia del giorno.'
          : 'L’ora in cui comincia la giornata: le fasce sotto la seguono.',
      },
    })

    const durata = h('input', {
      class: 'campo__controllo campo__controllo--numero',
      type: 'number',
      value: String(udDaMinuti(voce.durataMin)),
      attr: { min: '1', step: '1', 'aria-label': 'Unità didattiche' },
    })

    const sincronizza = () => {
      inizio.value = voce.inizio
      durata.value = String(udDaMinuti(voce.durataMin))
      rimpiazza(fine, `→ ${sommaMinuti(voce.inizio, voce.durataMin)}`)
    }
    sincronizzatori.push(sincronizza)

    inizio.addEventListener('change', () => {
      if (!inizio.value) return sincronizza()
      voce.inizio = inizio.value
      // Spostare la prima fascia sposta tutta la giornata: le altre sono
      // attaccate.
      incatena()
    })

    durata.addEventListener('change', () => {
      voce.durataMin = minutiDaUd(Number(durata.value) || 1)
      // Allungare una fascia spinge avanti quelle che le stanno dietro.
      incatena()
    })

    const presa = presaDiRiga()
    const riga = h(
      'div',
      { class: 'slot-riga' },
      presa,
      h(
        'select',
        {
          class: 'campo__controllo campo__controllo--selezione slot-riga__giorno',
          attr: { 'aria-label': 'Giorno' },
          onchange: (evento: Event) => {
            voce.giorno = Number((evento.target as HTMLSelectElement).value)
            // In coda al nuovo giorno: l’ordinamento stabile la lascia lì, e
            // si sa dov’è finita senza doverla cercare.
            orario = [...orario.filter((r) => r !== voce), voce]
            disegna()
            notifica_()
          },
        },
        ...VOCI_GIORNO_SETTIMANA.map((g) =>
          h('option', { value: g.valore, selected: String(voce.giorno) === g.valore }, g.testo),
        ),
      ),
      inizio,
      durata,
      h('span', { class: 'slot-riga__durata' }, 'UD'),
      fine,
      h('input', {
        class: 'campo__controllo',
        type: 'text',
        value: voce.aula ?? '',
        attr: { placeholder: 'aula', 'aria-label': 'Aula' },
        onchange: (evento: Event) => {
          voce.aula = (evento.target as HTMLInputElement).value
          notifica_()
        },
      }),
      pulsante({
        simbolo: 'duplica',
        variante: 'fantasma',
        titolo: 'Ripeti questa fascia in un altro giorno',
        al: () => {
          // Un orario è quasi sempre la stessa ora in giorni diversi: la copia
          // va sul primo giorno ancora vuoto e tiene ora e durata, invece di
          // impilarsi sotto l’originale — che è l’unico posto in cui la stessa
          // fascia due volte non serve a niente.
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
        titolo: 'Togli questa fascia',
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
        testo: 'Aggiungi una fascia',
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
  // Come per gli slot: le fasce mostrate sono già attaccate, e sono quelle che
  // si salvano anche senza toccare niente.
  notifica_()
  return contenitore
}
