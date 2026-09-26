// Il calendario: il mese, come una striscia di settimane senza confini fra un
// mese e l'altro, che si allunga scorrendo e si ferma ai capi dell'anno scolastico.

import { confrontaLezioni } from '../../../domain/calculations.js'
import {
  giorniBrevi,
  mesi,
  daIso,
  formattaMese,
  giornoDelMese,
  giornoSettimana,
  inizioSettimana,
  oggi,
  settimanaDi,
  settimanaIso,
  sommaGiorni,
} from '../../../domain/dates.js'
import type { Iso, Lezione } from '../../../domain/models.js'
import { h } from '../../dom.js'
import {
  SETTIMANE_ATTORNO,
  SETTIMANE_IN_PIU,
  SOGLIA_ALLUNGA,
  finestraMese,
} from '../../calendarNavigation.js'
import { eventiEsterni } from '../../externalCalendar.js'
import { moduloLezione } from '../../forms.js'
import { aggiorna, annoCorrente, compleanniDi, lezioniInAgenda, stato } from '../../state.js'
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
 */

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

    return h(
      'div',
      {
        class: [
          'mese__cella',
          // Nella striscia ogni cella è un giorno vero: il confine lo segna il primo del mese.
          primoDelSuoMese && 'mese__cella--apre-mese',
          data === oggi() && 'mese__cella--oggi',
          festivo(data) && 'giorno--festivo',
          apreQui(data) && 'giorno--apre-semestre',
          chiudeQui(data) && 'giorno--chiude-semestre',
          data === stato.data && 'mese__cella--scelta',
          chiusura(data) && 'giorno--chiuso',
        ],
        attr: { title: chiusura(data) || null },
        // Il corso filtrato arriva anche da qui, come negli altri punti in cui si
        // crea un'ora. Solo in modifica.
        ondblclick: () => {
          if (!inModifica()) return
          moduloLezione({
            data,
            corsoId: stato.filtroCorsoAgendaId ?? undefined,
            dopo: (id) => aggiorna({ vista: 'lezione', lezioneId: id }),
          })
        },
        onclick: () => aggiorna({ data }),
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

  const scorrevole = h('div', { class: 'mese__scorrevole' })

  /**
   * L'etichetta del mese in cima quando la striscia comincia a metà mese. Non è
   * di nessuna settimana: allungando verso l'alto va tolta e rimessa davanti
   * alla nuova prima riga.
   */
  let cappello: HTMLElement | null = null
  const rimettiCappello = (lunedi: Iso) => {
    cappello?.remove()
    cappello = null
    // Se la prima settimana apre già un mese, l'etichetta ce l'ha per conto suo.
    if (settimanaDi(lunedi).some((data) => giornoDelMese(data) === 1)) return
    cappello = etichettaMese(lunedi)
    scorrevole.prepend(cappello)
  }

  let allungoInCorso = false
  /** I cartelli di fine: si mettono una volta sola, quando si tocca il capo. */
  let capoSopra: HTMLElement | null = null
  let capoSotto: HTMLElement | null = null

  /** La prima settimana ancora dentro l'anno, salendo dall'alto della striscia. */
  const cimaResa = () => sommaGiorni(ancora, -finestraMese.su * 7)
  const fondoReso = () => sommaGiorni(ancora, finestraMese.giu * 7)

  const allungaGiu = () => {
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
    scorrevole.append(...nuove)
    if (quante < SETTIMANE_IN_PIU && anno) {
      capoSotto = capo(t.finisceAnno(anno.etichetta))
      scorrevole.append(capoSotto)
    }
  }

  const allungaSu = () => {
    if (capoSopra) return
    const nuove: HTMLElement[] = []
    let quante = 0
    for (let i = finestraMese.su + SETTIMANE_IN_PIU; i > finestraMese.su; i -= 1) {
      const lunedi = sommaGiorni(ancora, -i * 7)
      if (!dentroLAnno(lunedi)) continue
      nuove.push(...pezzi(lunedi))
      quante += 1
    }
    const prima = scorrevole.scrollHeight
    finestraMese.su += quante
    cappello?.remove()
    cappello = null
    if (nuove.length > 0) scorrevole.prepend(...nuove)
    rimettiCappello(cimaResa())
    if (quante < SETTIMANE_IN_PIU && anno) {
      capoSopra = capo(t.cominciaAnno(anno.etichetta))
      scorrevole.prepend(capoSopra)
    }
    // Aggiungendo sopra si rimette il contenuto dov'era, senza strappi.
    scorrevole.scrollTop += scorrevole.scrollHeight - prima
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

  rimettiCappello(cimaResa())
  if (anno && !dentroLAnno(sommaGiorni(cimaResa(), -7))) {
    capoSopra = capo(t.cominciaAnno(anno.etichetta))
    scorrevole.prepend(capoSopra)
  }
  if (anno && !dentroLAnno(sommaGiorni(fondoReso(), 7))) {
    capoSotto = capo(t.finisceAnno(anno.etichetta))
    scorrevole.append(capoSotto)
  }

  scorrevole.addEventListener('scroll', () => {
    finestraMese.scorrimento = scorrevole.scrollTop
    if (allungoInCorso) return
    allungoInCorso = true
    try {
      if (scorrevole.scrollTop < SOGLIA_ALLUNGA) allungaSu()
      else if (
        scorrevole.scrollHeight - scorrevole.scrollTop - scorrevole.clientHeight < SOGLIA_ALLUNGA
      ) {
        allungaGiu()
      }
    } finally {
      allungoInCorso = false
    }
  })

  // La misura si prende solo a elemento appeso: prima non ha altezza.
  requestAnimationFrame(() => {
    if (finestraMese.scorrimento >= 0) {
      scorrevole.scrollTop = finestraMese.scorrimento
      return
    }
    const scelta = scorrevole.querySelector<HTMLElement>('.mese__cella--scelta')
    if (scelta) {
      // Con i rettangoli e non con `offsetTop`: il genitore posizionato della cella
      // potrebbe non essere questo.
      const dove = scelta.getBoundingClientRect().top - scorrevole.getBoundingClientRect().top
      // Il nome del mese sta appiccicato in alto: si lascia spazio, o coprirebbe il
      // giorno cercato.
      const cartello = scorrevole.querySelector<HTMLElement>('.mese__etichetta')
      const riparo = (cartello?.offsetHeight ?? 0) + 8
      scorrevole.scrollTop = Math.max(0, scorrevole.scrollTop + dove - riparo)
    }
    finestraMese.scorrimento = scorrevole.scrollTop
  })

  return h(
    'div',
    { class: 'mese' },
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
