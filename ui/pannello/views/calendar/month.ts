// Il calendario: il mese, come una striscia di settimane senza confini fra un
// mese e l'altro, che si allunga scorrendo e si ferma ai capi dell'anno scolastico.

import { confrontaLezioni } from '#core/dominio/calculations.js'
import {
  giorniBrevi,
  mesi,
  daIso,
  formattaData,
  formattaMese,
  giornoDelMese,
  giornoSettimana,
  inizioSettimana,
  settimanaDi,
  settimanaIso,
  sommaGiorni,
} from '#core/dominio/dates.js'
import type { Iso, Lezione } from '#core/dominio/models.js'
import { gestisci, h } from '#ui/pannello/dom.js'
import {
  SETTIMANE_ATTORNO,
  SETTIMANE_IN_PIU,
  SOGLIA_ALLUNGA,
  finestraMese,
} from '#ui/pannello/calendarNavigation.js'
import { eventiEsterni } from '#ui/pannello/externalCalendar.js'
import { moduloLezione } from '#ui/pannello/forms.js'
import { apriLezione } from '#ui/pannello/pages.js'
import {
  aggiorna,
  annoCorrente,
  compleanniDi,
  iscriviti,
  lezioniInAgenda,
  stato,
} from '#ui/pannello/state.js'
import {
  apreQui,
  chiudeQui,
  chiusura,
  festivo,
  giorniVisibili,
  letteraDi,
  segnoSemestreQui,
} from './common.js'
import { trascinata, vuoleCopiare, posa } from './drag.js'
import { chipEvento } from './ics.js'
import { classiInAula, chipCompleanno } from './birthdays.js'
import { inModifica } from './editor.js'
import { chipLezione } from './lessonBlock.js'
import { menuGiorno } from './menus.js'
import { testi } from './calendar.testi.js'

/*
 * Le settimane sono una striscia sola: scorrendo si va avanti e indietro, e
 * vicino a un capo la striscia si allunga da sé. Il nome del mese resta
 * appiccicato in alto mentre le sue settimane scorrono.
 *
 * La striscia è un nodo di telaio (`dom.ts`): un ridisegno ne rifà i figli ma
 * non la ricrea, e chi scorre non perde il gesto. Il suo ascoltatore è quello
 * del primo disegno; per questo chiama `allungaStriscia`, che ogni disegno
 * rimette con i dati di adesso. Dove portarla lo decide `posaStriscia`, dopo il
 * disegno e mai da lui.
 */

/** Allunga la striscia viva vicino a un capo, con le lezioni dell'ultimo disegno. */
let allungaStriscia: ((viva: HTMLElement) => void) | null = null

/** L'ascoltatore della striscia: non legge niente del disegno che l'ha messo. */
function allaRotella (evento: Event): void {
  const viva = evento.currentTarget as HTMLElement
  finestraMese.scorrimento = viva.scrollTop
  allungaStriscia?.(viva)
}

/**
 * Le strisce già portate al loro posto, con la chiave di scorrimento che avevano:
 * quella tenuta dal telaio resta dov'è. La chiave e non il nodo solo, perché un
 * ridisegno che riusa il nodo (`idiomorph`) può dargli una striscia nuova.
 */
const posate = new WeakMap<HTMLElement, string>()

/**
 * Porta la striscia al suo posto, dopo il disegno. Una striscia nuova (si entra
 * nel mese, o si è cambiato giorno) torna dove si era rimasti; ricentrata
 * (`finestraMese.scorrimento` negativo: «Oggi», le frecce) va sul giorno
 * scelto. Quella tenuta non si tocca: rimetterle lo scorrimento a ogni
 * ridisegno fermava la rotella.
 */
function posaStriscia (): void {
  const viva = document.querySelector<HTMLElement>('.mese__scorrevole')
  if (!viva) return
  if (finestraMese.scorrimento >= 0) {
    // Una striscia nuova già scorsa l'ha rimessa la storia (Alt+freccia): resta lì.
    const giaPosata = posate.get(viva) === viva.dataset.scorrimento
    if (!giaPosata && viva.scrollTop === 0) viva.scrollTop = finestraMese.scorrimento
  } else {
    const scelta = viva.querySelector<HTMLElement>('.mese__cella--scelta')
    if (scelta) {
      // Con i rettangoli e non con `offsetTop`: il genitore posizionato della cella
      // potrebbe non essere questo.
      const dove = scelta.getBoundingClientRect().top - viva.getBoundingClientRect().top
      // Il nome del mese sta appiccicato in alto: si lascia spazio, o coprirebbe il
      // giorno cercato.
      const cartello = viva.querySelector<HTMLElement>('.mese__etichetta')
      const riparo = (cartello?.offsetHeight ?? 0) + 8
      viva.scrollTop = Math.max(0, viva.scrollTop + dove - riparo)
    }
  }
  posate.set(viva, viva.dataset.scorrimento ?? '')
  finestraMese.scorrimento = viva.scrollTop
}

// Dopo ogni modifica, nel mese, la striscia si guarda a disegno fatto. Il
// disegno parte da un iscritto venuto dopo questo: il microtask mette il
// fotogramma di qui in fila dietro al suo.
iscriviti(() => {
  if (stato.vista !== 'calendario' || stato.modoCalendario !== 'mese') return
  queueMicrotask(() => requestAnimationFrame(posaStriscia))
})

export function vistaMese (): HTMLElement {
  const t = testi()
  // Le lezioni divise per giorno una volta sola, già in ordine d'orario: le
  // celle sono centinaia. Come nell'anno e nell'agenda.
  const perGiorno = new Map<Iso, Lezione[]>()
  for (const lezione of lezioniInAgenda()) {
    const sue = perGiorno.get(lezione.data)
    if (sue) sue.push(lezione)
    else perGiorno.set(lezione.data, [lezione])
  }
  for (const sue of perGiorno.values()) sue.sort(confrontaLezioni)
  const visibili = giorniVisibili()
  // La prima colonna è il numero della settimana, come nel piano annuale.
  const colonne = `2.4rem repeat(${visibili.length}, 1fr)`
  // La striscia scorre solo dentro l'anno scolastico: ai due capi finisce, e lo dice.
  const anno = annoCorrente()
  const primaSettimana = anno ? inizioSettimana(anno.inizio) : null
  const ultimaSettimana = anno ? inizioSettimana(anno.fine) : null
  const dentroLAnno = (lunedi: Iso): boolean =>
    (!primaSettimana || lunedi >= primaSettimana) && (!ultimaSettimana || lunedi <= ultimaSettimana)

  // Un giorno scelto fuori dall'anno si riporta al capo più vicino. Un anno
  // cambiato lo sistema già `riconvalidaRicordati` nello stato; qui resta il
  // caso delle frecce.
  const scelta = inizioSettimana(stato.data)
  const ancora =
    primaSettimana && scelta < primaSettimana
      ? primaSettimana
      : ultimaSettimana && scelta > ultimaSettimana
        ? ultimaSettimana
        : scelta

  // Cambiare giorno rimette la striscia attorno a quello; con lo stesso giorno
  // (un salvataggio, un trascinamento) si riprende dove si era.
  if (finestraMese.ancora !== ancora) {
    finestraMese.ancora = ancora
    finestraMese.su = SETTIMANE_ATTORNO
    finestraMese.giu = SETTIMANE_ATTORNO
    finestraMese.scorrimento = -1
  }

  const cella = (data: Iso): HTMLElement => {
    const delGiorno = perGiorno.get(data) ?? []
    const eventiDelGiorno = eventiEsterni(data)
    const feste = compleanniDi(data)
    const inAula = classiInAula(delGiorno, data)
    const primoDelSuoMese = giornoDelMese(data) === 1

    /** Apre dal giorno vuoto la stessa finestra del doppio clic. */
    const creaLezione = (): void => {
      if (!inModifica()) return
      moduloLezione({
        data,
        corsoId: stato.filtroCorsoAgendaId ?? undefined,
        dopo: (id) => apriLezione(id),
      })
    }

    return h(
      'div',
      {
        class: [
          'mese__cella',
          // Nella striscia ogni cella è un giorno vero: il confine lo segna il primo del mese.
          primoDelSuoMese && 'mese__cella--apre-mese',
          data === stato.adessoData && 'mese__cella--oggi',
          festivo(data) && 'giorno--festivo',
          apreQui(data) && 'giorno--apre-semestre',
          chiudeQui(data) && 'giorno--chiude-semestre',
          data === stato.data && 'mese__cella--scelta',
          chiusura(data) && 'giorno--chiuso',
        ],
        attr: {
          title: chiusura(data) || null,
          role: 'group',
          tabindex: '0',
          'aria-label': formattaData(data, 'lungo'),
          'aria-current': data === stato.adessoData ? 'date' : null,
          'aria-keyshortcuts': 'Enter Space F2', // testo-fisso: nomi dei tasti per i lettori di schermo
        },
        // Il corso filtrato arriva anche da qui, come negli altri punti in cui si
        // crea un'ora. Solo in modifica.
        ondblclick: creaLezione,
        onclick: () => aggiorna({ data }),
        onkeydown: (evento: KeyboardEvent) => {
          if (evento.target !== evento.currentTarget) return
          if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault()
            aggiorna({ data })
          } else if (evento.key === 'F2' && inModifica()) {
            evento.preventDefault()
            creaLezione()
          }
        },
        // Nel mese si sposta di giorno, non di ora: l'ora resta quella.
        ondragover: (evento: DragEvent) => {
          if (!trascinata) return
          evento.preventDefault()
          const copia = vuoleCopiare(evento)
          if (evento.dataTransfer) evento.dataTransfer.dropEffect = copia ? 'copy' : 'move'
          ;(evento.currentTarget as HTMLElement).classList.add('zona-posa')
        },
        ondragleave: (evento: DragEvent) => {
          const cellaViva = evento.currentTarget as HTMLElement
          if (cellaViva.contains(evento.relatedTarget as Node | null)) return
          cellaViva.classList.remove('zona-posa')
        },
        ondrop: (evento: DragEvent) => {
          if (!trascinata) return
          evento.preventDefault()
          void posa(trascinata, data, undefined, vuoleCopiare(evento))
        },
        oncontextmenu: (evento: MouseEvent) => menuGiorno(evento, data),
      },
      h(
        'div',
        { class: 'mese__numero' },
        // Il primo del mese si dice per esteso: segna dove comincia il mese.
        primoDelSuoMese ? `1 ${mesi()[daIso(data).getUTCMonth()].slice(0, 3)}` : String(giornoDelMese(data)),
        segnoSemestreQui(data),
        delGiorno.length > 0
          ? h('span', { class: 'mese__conteggio' }, String(delGiorno.length))
          : null,
      ),
      h(
        'div',
        { class: 'mese__lezioni' },
        // I compleanni sopra le ore, o finirebbero sotto il «+2» che tronca l'elenco.
        ...feste.map((festa) => chipCompleanno(festa, inAula.has(festa.classeId))),
        ...delGiorno.slice(0, 4).map(chipLezione),
        ...eventiDelGiorno.slice(0, 3).map(chipEvento),
      ),
      delGiorno.length > 4 ? h('div', { class: 'mese__altre' }, `+${delGiorno.length - 4}`) : null,
      eventiDelGiorno.length > 3
        // testo-fisso: la sigla ICS, uguale in tutte le lingue
        ? h('div', { class: 'mese__altre' }, `+${eventiDelGiorno.length - 3} ICS`)
        : null,
    )
  }

  /** Una settimana intera: la riga di cui è fatta la striscia. */
  const rigaSettimana = (lunedi: Iso): HTMLElement =>
    h(
      'div',
      { class: 'mese__settimana', style: { gridTemplateColumns: colonne } },
      h(
        'button',
        {
          class: [
            'mese__settimana-numero',
            inizioSettimana(stato.data) === lunedi && 'mese__settimana-numero--scelta',
          ],
          type: 'button',
          attr: {
            title: [
              t.settimana(settimanaIso(lunedi)),
              letteraDi(lunedi) && t.settimanaMinuscola(letteraDi(lunedi) ?? ''),
              t.aprila,
            ]
              .filter(Boolean)
              .join(' · '),
          },
          onclick: () => aggiorna({ data: lunedi, modoCalendario: 'settimana' }),
        },
        String(settimanaIso(lunedi)),
        // La lettera della settimana sotto il numero, per controllare l'alternanza.
        letteraDi(lunedi)
          ? h('span', { class: 'mese__settimana-lettera' }, letteraDi(lunedi) as string)
          : null,
      ),
      ...settimanaDi(lunedi)
        .filter((data) => visibili.includes(giornoSettimana(data)))
        .map(cella),
    )

  /**
   * Il nome del mese sopra le sue settimane. Compare quando un mese comincia, e
   * resta appiccicato in alto finché scorre l'ultima delle sue settimane.
   */
  const etichettaMese = (data: Iso): HTMLElement =>
    h('div', { class: 'mese__etichetta' }, formattaMese(data))

  /**
   * I nodi di una settimana: il nome del mese, e la riga. Il cambio di semestre
   * sta nella cella del giorno in cui cade.
   */
  const pezzi = (lunedi: Iso): HTMLElement[] => {
    const apertura = settimanaDi(lunedi).find((data) => giornoDelMese(data) === 1)
    return [...(apertura ? [etichettaMese(apertura)] : []), rigaSettimana(lunedi)]
  }

  /** Il cartello che dice dove l'anno comincia o finisce: la striscia ha un fondo. */
  const capo = (testo: string): HTMLElement => h('div', { class: 'mese__capo' }, testo)

  const scorrevole = h('div', {
    class: 'mese__scorrevole',
    // Cambiando settimana di partenza la striscia è un'altra: nodo nuovo.
    dataset: { telaio: 'mese-striscia', scorrimento: `calendario:mese:${ancora}` },
  })

  /**
   * L'etichetta del mese in cima quando la striscia comincia a metà mese. Non è
   * di nessuna settimana: allungando verso l'alto va tolta e rimessa davanti
   * alla nuova prima riga.
   */
  /**
   * Si cerca nella striscia per il segno, non si tiene in una variabile: dopo un
   * ridisegno la striscia viva può portare il cappello di un disegno di prima.
   */
  const togliCappello = (striscia: HTMLElement) => {
    striscia.querySelector(':scope > [data-cappello]')?.remove()
  }
  const rimettiCappello = (striscia: HTMLElement, lunedi: Iso) => {
    togliCappello(striscia)
    // Se la prima settimana apre già un mese, l'etichetta ce l'ha per conto suo.
    if (settimanaDi(lunedi).some((data) => giornoDelMese(data) === 1)) return
    const cappello = etichettaMese(lunedi)
    cappello.dataset.cappello = ''
    striscia.prepend(cappello)
  }

  let allungoInCorso = false
  /** I cartelli di fine: si mettono una volta sola, quando si tocca il capo. */
  let capoSopra: HTMLElement | null = null
  let capoSotto: HTMLElement | null = null

  /** La prima settimana ancora dentro l'anno, salendo dall'alto della striscia. */
  const cimaResa = () => sommaGiorni(ancora, -finestraMese.su * 7)
  const fondoReso = () => sommaGiorni(ancora, finestraMese.giu * 7)

  // `viva` è la striscia nel documento: il telaio può aver tenuto quella di un
  // disegno di prima al posto di `scorrevole`.
  const allungaGiu = (viva: HTMLElement) => {
    if (capoSotto) return
    const nuove: HTMLElement[] = []
    let quante = 0
    for (let i = 1; i <= SETTIMANE_IN_PIU; i += 1) {
      const lunedi = sommaGiorni(ancora, (finestraMese.giu + i) * 7)
      if (!dentroLAnno(lunedi)) break
      nuove.push(...pezzi(lunedi))
      quante += 1
    }
    finestraMese.giu += quante
    viva.append(...nuove)
    if (quante < SETTIMANE_IN_PIU && anno) {
      capoSotto = capo(t.finisceAnno(anno.etichetta))
      viva.append(capoSotto)
    }
  }

  const allungaSu = (viva: HTMLElement) => {
    if (capoSopra) return
    const nuove: HTMLElement[] = []
    let quante = 0
    for (let i = finestraMese.su + SETTIMANE_IN_PIU; i > finestraMese.su; i -= 1) {
      const lunedi = sommaGiorni(ancora, -i * 7)
      if (!dentroLAnno(lunedi)) continue
      nuove.push(...pezzi(lunedi))
      quante += 1
    }
    const prima = viva.scrollHeight
    finestraMese.su += quante
    togliCappello(viva)
    if (nuove.length > 0) viva.prepend(...nuove)
    rimettiCappello(viva, cimaResa())
    if (quante < SETTIMANE_IN_PIU && anno) {
      capoSopra = capo(t.cominciaAnno(anno.etichetta))
      viva.prepend(capoSopra)
    }
    // Aggiungendo sopra si rimette il contenuto dov'era, senza strappi.
    viva.scrollTop += viva.scrollHeight - prima
  }

  // La finestra iniziale si accorcia contro i capi dell'anno.
  let resteSu = 0
  const dietro: HTMLElement[] = []
  for (let i = finestraMese.su; i >= 1; i -= 1) {
    const lunedi = sommaGiorni(ancora, -i * 7)
    if (!dentroLAnno(lunedi)) continue
    dietro.push(...pezzi(lunedi))
    resteSu += 1
  }
  finestraMese.su = resteSu
  scorrevole.append(...dietro)

  let resteGiu = 0
  for (let i = 0; i <= finestraMese.giu; i += 1) {
    const lunedi = sommaGiorni(ancora, i * 7)
    if (!dentroLAnno(lunedi)) break
    scorrevole.append(...pezzi(lunedi))
    resteGiu = i
  }
  finestraMese.giu = resteGiu

  rimettiCappello(scorrevole, cimaResa())
  if (anno && !dentroLAnno(sommaGiorni(cimaResa(), -7))) {
    capoSopra = capo(t.cominciaAnno(anno.etichetta))
    scorrevole.prepend(capoSopra)
  }
  if (anno && !dentroLAnno(sommaGiorni(fondoReso(), 7))) {
    capoSotto = capo(t.finisceAnno(anno.etichetta))
    scorrevole.append(capoSotto)
  }

  allungaStriscia = (viva) => {
    if (allungoInCorso) return
    allungoInCorso = true
    try {
      if (viva.scrollTop < SOGLIA_ALLUNGA) allungaSu(viva)
      else if (viva.scrollHeight - viva.scrollTop - viva.clientHeight < SOGLIA_ALLUNGA) {
        allungaGiu(viva)
      }
    } finally {
      allungoInCorso = false
    }
  }
  gestisci(scorrevole, 'scroll', allaRotella)

  return h(
    'div',
    // Anello della catena di telaio fino alla striscia.
    { class: 'mese', dataset: { telaio: 'mese' } },
    h(
      'div',
      { class: 'mese__intestazione', style: { gridTemplateColumns: colonne } },
      h('div', { class: 'mese__giorno-nome mese__giorno-nome--settimana' }, t.sigla),
      ...giorniBrevi().filter((_, indice) => visibili.includes(indice + 1)).map((nome) =>
        h('div', { class: 'mese__giorno-nome' }, nome),
      ),
    ),
    scorrevole,
  )
}
