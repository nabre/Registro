// La griglia dei voti: la casella, quel che ci si può battere dentro, e la
// tabella che le mette in fila. Separata da `views/assessments.ts` perché la
// usano anche i pannelli dei recuperi e delle riconsegne: tenerla là creerebbe
// cicli di import, e `SIGLA_ASSENTE` (calcolata al caricamento) darebbe
// `ReferenceError` a seconda dell'ordine di valutazione di esbuild.

import { allieviAttivi, formattaVoto, mediaAllievo, mediaMomento, nomeCompleto, notaFineSemestre, ordinaAllievi, siglaPresenza, votiDellaScala } from '../../../core/dominio/calculations.js'
import { formattaData } from '../../../core/dominio/dates.js'
import { Uno, corto } from '../../../core/dominio/lexicon.js'
import { lessico } from '../../../core/dominio/lexicon.testi.js'
import type { Classe, MomentoValutazione, Scala } from '../../../core/dominio/models.js'
import { assenteAllOra, rigaDelRecupero } from '../../../core/dominio/retakes.js'
import { collegamento, pastiglia } from '../components/base.js'
import { } from '../components/modal.js'
import { notifica } from '../components/notifications.js'
import { gestisci, h } from '../dom.js'
import { azione } from '../bridge.js'
import { postoCorrente, stato, vai } from '../state.js'
import { tabella } from '../components/table.js'
import { finestra, stileVuoto, type Finestra } from '../components/virtuale.js'
import { cellaNome } from '../components/avatar.js'
import { testi } from './grades.testi.js'

/**
 * La sigla con cui si segna un assente: la stessa dell'appello (`X`); il
 * trattino vuol dire «nessun voto».
 */
export const SIGLA_ASSENTE = siglaPresenza('assente')

/**
 * Legge quel che è stato digitato in una casella. Vuoto e trattino valgono
 * «nessun voto», `X` assente, come nell'appello; `a`, `ass` e `assente` restano
 * accettate, ma il carattere mostrato è uno solo.
 */
export function leggiCasella (testo: string): { valore: number | null; assente: boolean } | null {
  const pulito = testo.trim().toLowerCase().replace(',', '.')
  if (pulito === '' || pulito === '-') return { valore: null, assente: false }
  if (['x', 'a', 'ass', 'assente'].includes(pulito)) return { valore: null, assente: true }
  const numero = Number(pulito)
  return Number.isFinite(numero) ? { valore: numero, assente: false } : null
}

/** Il lampo rosso di una casella voto rifiutata: dura quanto basta a vederlo. */
export function lampeggiaErrore (elemento: HTMLElement): void {
  elemento.classList.add('cella-voto--errata')
  setTimeout(() => elemento.classList.remove('cella-voto--errata'), 800)
}

/**
 * La larghezza di una colonna di prova disegnata, finché non la si è misurata:
 * quella della `th` (`.tabella__momento`, 5.75rem) con i suoi margini.
 */
const LARGHEZZA_COLONNA = 92

/**
 * Da quante prove in su la griglia si disegna a finestra: con quaranta righe,
 * trenta colonne intere costano già più di un fotogramma lungo
 * (`tests/interfaccia/misure.spec.ts`).
 */
const SOGLIA_COLONNE = 20

/** Un numero diverso per ogni elenco: gli id devono restare unici nella pagina. */
let contatoreElenchi = 0

/**
 * La tendina dei voti da agganciare a una casella: un `datalist` e non un
 * `select`, così la casella resta scrivibile (anche con la sigla dell'assente).
 * Torna l'elemento e il suo id, da mettere sull'`input` accanto.
 */
export function elencoVoti (scala: Scala, sigleInPiu: string[] = []): {
  id: string
  elemento: HTMLElement
} {
  contatoreElenchi += 1
  // testo-fisso: id dell'elenco, non si legge
  const id = `voti-${contatoreElenchi}`
  return {
    id,
    elemento: h(
      'datalist',
      { attr: { id } },
      ...[...votiDellaScala(scala), ...sigleInPiu].map((voto) =>
        h('option', { attr: { value: voto } }),
      ),
    ),
  }
}

/** Il campo di una casella della griglia, o `null` se fuori dai bordi. */
function campoVoto (tabella: HTMLElement, riga: number, colonna: number): HTMLInputElement | null {
  return tabella.querySelector<HTMLInputElement>(`input[data-riga="${riga}"][data-colonna="${colonna}"]`)
}

/**
 * Frecce e Invio spostano il fuoco come in un foglio di calcolo. Torna vero se
 * il campo c'era: chi chiama deve saperlo prima di togliere il fuoco da quello
 * di partenza.
 */
function spostaFuoco (tabella: HTMLElement, riga: number, colonna: number, vista?: Finestra | null): boolean {
  let bersaglio = campoVoto(tabella, riga, colonna)
  // Una colonna fuori dalla finestra non c'è ancora: la si disegna, poi la si cerca.
  if (!bersaglio && vista?.attiva && tabella.querySelector(`input[data-riga="${riga}"]`) &&
    vista.portaInVista(colonna)) {
    bersaglio = campoVoto(tabella, riga, colonna)
  }
  if (!bersaglio) return false
  bersaglio.focus()
  bersaglio.select()
  return true
}

/**
 * Il foglio dei voti: allievi in riga, momenti in colonna, medie in fondo.
 * Esportata perché si compila sia nella lezione sia in questa vista (recuperi,
 * correzioni, voti in ritardo): una griglia sola, un solo modo di scrivere un voto.
 */
interface OpzioniGriglia {
  /**
   * Solo questi allievi invece della classe (p. es. i due di un recupero). Sono
   * id: ordine e frequenza restano decisi qui.
   */
  soloAllievi?: string[]
  /**
   * Le due colonne in coda, media del semestre e nota. Si tolgono dove la griglia
   * mostra una prova sola, perché lì non sono un bilancio.
   */
  medie?: boolean
}

/**
 * Sceglie un momento, o nessuno, senza lasciare la pagina: in quella delle
 * valutazioni diventa quel che si guarda; altrove (l'ora, i recuperi) resta
 * nel contesto e la griglia lo evidenzia.
 */
export function scegliMomento (valutazioneId: string | null): void {
  const qui = postoCorrente()
  if (qui.pagina !== 'pagina.corso.valutazioni') {
    vai(qui, { contesto: { valutazioneId }, elementoChiesto: false })
    return
  }
  const corsoId = stato.contesto.corsoId
  vai(
    valutazioneId
      ? { pagina: qui.pagina, soggetto: { tipo: 'valutazione', id: valutazioneId } }
      : corsoId
        ? { pagina: qui.pagina, soggetto: { tipo: 'corso', id: corsoId } }
        : { pagina: qui.pagina },
    { contesto: { valutazioneId }, elementoChiesto: valutazioneId !== null },
  )
}

export function grigliaVoti (
  classe: Classe,
  momenti: MomentoValutazione[],
  opzioni: OpzioniGriglia = {},
): HTMLElement {
  const medie = opzioni.medie !== false
  const scelti = opzioni.soloAllievi ? new Set(opzioni.soloAllievi) : null
  const allievi = ordinaAllievi(allieviAttivi(classe)).filter(
    (allievo) => scelti === null || scelti.has(allievo.id),
  )
  /**
   * La scala su cui leggere media e nota. Ogni momento ha la sua scala, copiata
   * alla creazione, e quella del registro può essere cambiata: si usa quella dei
   * momenti se è una sola. Con scale diverse la media resta indicativa e la nota
   * non si scrive.
   */
  const scaleInUso = [...new Map(momenti.map((m) => [
    `${m.scala.min}-${m.scala.max}-${m.scala.sufficienza}-${m.scala.passo}`,
    m.scala,
  ])).values()]
  const scala = scaleInUso.length === 1 ? scaleInUso[0] : stato.registro.impostazioni.scala
  const scaleMescolate = scaleInUso.length > 1
  // Il passo con cui la media diventa nota di pagella: una regola della scuola,
  // nelle impostazioni.
  const passoNota = stato.registro.impostazioni.passoFineSemestre
  const t = testi()
  const L = lessico()
  // testo-fisso: chiave della memoria di scorrimento, non si legge
  const chiaveScorrimento = `voti:${stato.corsoId ?? ''}:${stato.semestreId ?? ''}`
  const medieDi = new Map(allievi.map((allievo) => [allievo.id, mediaAllievo(momenti, allievo.id).media]))
  // Le colonne a finestra (`components/virtuale.ts`): con duecento prove la
  // griglia intera costava secondi a ogni voto scritto.
  const colonneFisse = medie ? 3 : 1
  /** L'ultima finestra disegnata: la tastiera ci porta le colonne non ancora in vista. */
  let vista: Finestra | null = null

  /** Il vuoto al posto delle colonne saltate; il primo dell'intestazione dice dove comincia la finestra. */
  const vuoto = (tag: 'th' | 'td', px: number, segno?: Record<string, string>) =>
    h(tag, { class: 'tabella__vuoto', style: stileVuoto(px, true), dataset: segno, attr: { 'aria-hidden': 'true' } })

  /** Le celle delle prove in una riga, con i vuoti al posto di quelle fuori vista. */
  const colonne = (
    f: Finestra,
    cella: (momento: MomentoValutazione, indice: number) => HTMLElement,
    tag: 'th' | 'td',
    primo = false,
  ): HTMLElement[] =>
    f.pezzi.map((pezzo, n) => pezzo.indice === undefined
      ? vuoto(tag, pezzo.vuoto, primo && n === 0 ? f.inizio : undefined)
      : cella(momenti[pezzo.indice], pezzo.indice))

  /** `aria-colindex` di una colonna di prova, solo se la tabella è a finestra. */
  const posto = (f: Finestra, indice: number) => f.attiva ? indice + 2 : undefined

  const parti = () => {
    const f = finestra({
      chiave: `${chiaveScorrimento}:${medie ? 'medie' : 'prove'}`,
      conto: momenti.length,
      orizzontale: true,
      // La larghezza di una colonna di prova disegnata: una casella e la «R».
      stima: () => LARGHEZZA_COLONNA,
      chiaveDi: (indice) => momenti[indice].id,
      // Una colonna sono quaranta caselle: la finestra conviene presto, e ai
      // lati basta poco.
      soglia: SOGLIA_COLONNE,
      oltre: 2,
    })
    vista = f
    // Un elenco di voti per colonna, non per casella: con quaranta righe
    // sarebbero quaranta copie uguali.
    const liste = new Map(f.pezzi.flatMap((pezzo) => pezzo.indice === undefined
      ? []
      : [[pezzo.indice, elencoVoti(momenti[pezzo.indice].scala, [SIGLA_ASSENTE])] as const]))
    const ultima = { 'aria-colindex': f.attiva ? momenti.length + 2 : undefined }

    return {
      attr: { 'aria-colcount': f.attiva ? momenti.length + colonneFisse : undefined },
      intestazione: [
        h('th', { class: 'tabella__nome', attr: { 'aria-colindex': f.attiva ? 1 : undefined } }, Uno(L.pif)),
        ...colonne(f, (momento, indice) =>
          h(
            'th',
            {
              class: ['tabella__momento', stato.valutazioneId === momento.id && 'tabella__momento--scelto'],
              dataset: f.testata(indice),
              attr: { 'aria-colindex': posto(f, indice) },
            },
            collegamento({
              titolo: t.titoloMomento(momento.titolo, formattaData(momento.data), momento.peso),
              al: () => scegliMomento(momento.id),
              testo: [
                h('span', { class: 'tabella__momento-titolo' }, momento.titolo),
                h(
                  'small',
                  null,
                  `${formattaData(momento.data, 'corto')}${momento.peso !== 1 ? ` ×${momento.peso}` : ''}`,
                ),
              ],
            }),
            liste.get(indice)?.elemento,
          ), 'th', true),
        // Due colonne: la media è il conto, la nota è quel che va in pagella.
        medie ? h('th', { class: 'tabella__media', attr: ultima }, Uno(L.media)) : null,
        medie
          ? h('th', { class: 'tabella__media', attr: { 'aria-colindex': f.attiva ? momenti.length + 3 : undefined } }, corto(L.nota))
          : null,
      ],
      righe: allievi.map((allievo, indiceRiga) => {
        const media = medieDi.get(allievo.id) ?? null
        return h(
          'tr',
          null,
          h('td', { class: 'tabella__nome', attr: { 'aria-colindex': f.attiva ? 1 : undefined } },
            cellaNome(allievo, nomeCompleto(allievo))),
          ...colonne(f, (momento, indiceColonna) => {
            const voto = momento.voti.find((v) => v.allievoId === allievo.id)
            const mostrato = voto?.assente
              ? SIGLA_ASSENTE
              : voto?.valore === null || voto?.valore === undefined
                ? ''
                : String(voto.valore)
            // Casella vuota ma assente all'appello: lo si mostra.
            const mancava =
              mostrato === '' && assenteAllOra(stato.registro, momento, allievo.id)
            const insufficiente =
              typeof voto?.valore === 'number' && !voto.assente && voto.valore < momento.scala.sufficienza
            // La riga nella tabella dei recuperi: il voto non è della giornata della prova.
            const recupero = rigaDelRecupero(momento, allievo.id)

            return h(
              'td',
              // Il posto della «R» resta anche senza lettera, per tenere incolonnate le cifre.
              {
                class: 'tabella__cella tabella__cella--voto',
                dataset: f.voce(indiceColonna),
                attr: { 'aria-colindex': posto(f, indiceColonna) },
              },
              // I tre pezzi in un contenitore e non sulla cella: una `td` in flex smette di
              // essere una cella di tabella.
              h(
                'div',
                { class: 'cella-voto__riga' },
                h('input', {
                  class: [
                    'cella-voto',
                    insufficiente && 'cella-voto--insufficiente',
                    voto?.assente && 'cella-voto--assente',
                    mancava && 'cella-voto--mancava',
                  ],
                  type: 'text',
                  value: mostrato,
                  placeholder: mancava ? SIGLA_ASSENTE : '',
                  dataset: {
                    riga: indiceRiga,
                    colonna: indiceColonna,
                    // testo-fisso: chiave del fuoco, non si legge
                    fuoco: `voto-${momento.id}-${allievo.id}`,
                  },
                  attr: {
                    'aria-label': `${nomeCompleto(allievo)} — ${momento.titolo}`,
                    title: mancava ? t.assenteAllAppello : voto?.nota ?? '',
                    inputmode: 'decimal',
                    list: liste.get(indiceColonna)?.id,
                  },
                  onchange: async (evento: Event) => {
                    const elemento = evento.target as HTMLInputElement
                    const letto = leggiCasella(elemento.value)
                    if (!letto) {
                      // Il valore battuto resta nel campo, invece di tornare al voto di prima: il
                      // fuoco è già sulla riga dopo quando arriva il `change`. Come per le date in
                      // `components/base.ts`.
                      lampeggiaErrore(elemento)
                      notifica(t.nonEUnVoto(elemento.value), 'errore')
                      return
                    }
                    const risposta = await azione({
                      tipo: 'voto.imposta',
                      valutazioneId: momento.id,
                      allievoId: allievo.id,
                      valore: letto.valore,
                      assente: letto.assente,
                    })
                    if (!risposta.ok) {
                      elemento.value = mostrato
                      lampeggiaErrore(elemento)
                    }
                  },
                }),
                // La «R» accanto alla casella e non dentro, dove andrebbe cancellata; il posto
                // resta anche senza lettera.
                h(
                  'span',
                  {
                    class: [
                      'cella-voto__tag',
                      !recupero && 'cella-voto__tag--vuoto',
                      recupero?.dispensato && 'cella-voto__tag--dispensato',
                    ],
                    attr: {
                      'aria-hidden': recupero ? 'false' : 'true',
                      title: !recupero
                        ? ''
                        : recupero.dispensato
                          ? t.nonSiRecupera
                          : recupero.previstoIl
                            ? t.recuperoDel(formattaData(recupero.previstoIl, 'giorno')) +
                              (recupero.nota ? ` · ${recupero.nota}` : '')
                            : t.recuperoDaFissare,
                    },
                  },
                  t.siglaRecupero,
                ),
              ),
            )
          }, 'td'),
          medie
            ? h(
                'td',
                { class: 'tabella__media', attr: ultima },
                media === null
                  ? h('span', { class: 'testo-quieto' }, '—')
                  : h('span', { class: 'testo-quieto' }, formattaVoto(media)),
              )
            : null,
          medie
            ? h(
                'td',
                { class: 'tabella__media', attr: { 'aria-colindex': f.attiva ? momenti.length + 3 : undefined } },
                (() => {
                  if (scaleMescolate) {
                    return h(
                      'span',
                      {
                        class: 'testo-quieto',
                        attr: {
                          title: t.scaleDiverse,
                        },
                      },
                      '≠',
                    )
                  }
                  const nota = notaFineSemestre(media, scala, passoNota)
                  return nota === null
                    ? h('span', { class: 'testo-quieto' }, '—')
                    : pastiglia(formattaVoto(nota), nota >= scala.sufficienza ? 'positivo' : 'negativo')
                })(),
              )
            : null,
        )
      }),
      piede: [
        h('td', { class: 'tabella__nome' }, t.mediaDellaClasse),
        ...colonne(f, (momento, indice) => {
          const media = mediaMomento(momento)
          return h(
            'td',
            { class: 'tabella__cella tabella__cella--totale', dataset: f.voce(indice) },
            media === null ? '—' : formattaVoto(media),
          )
        }, 'td'),
        // Due celle vuote in coda (media e nota): il piede ha la media di ogni prova,
        // non di ogni allievo.
        medie ? h('td', { class: 'tabella__media' }, '') : null,
        medie ? h('td', { class: 'tabella__media' }, '') : null,
      ],
    }
  }

  // Con memoria di scorrimento: ogni voto scritto ridisegna la tabella.
  const contenitore = tabella({
    variante: 'voti',
    griglia: true,
    scorrimento: chiaveScorrimento,
    // Dove la catena di telaio arriva fin qui (la pagina delle valutazioni),
    // un voto scritto non ferma lo scorrimento in corsa.
    telaio: 'voti',
    virtuale: { chiave: `${chiaveScorrimento}:${medie ? 'medie' : 'prove'}`, parti },
  })

  // La navigazione da foglio di calcolo. Sul contenitore e non sulla tabella:
  // la tabella sta nell'isola della finestra, che lo scorrimento rifà.
  gestisci(contenitore, 'keydown', (evento) => {
    // Il contenitore vivo: dopo un ridisegno `contenitore` può essere quello scartato.
    const griglia = evento.currentTarget as HTMLElement
    const bersaglio = evento.target as HTMLInputElement
    if (!bersaglio.dataset.riga) return
    const riga = Number(bersaglio.dataset.riga)
    const colonna = Number(bersaglio.dataset.colonna)

    // Tab e Maiusc+Tab da una casella all'altra, solo con la finestra: le
    // colonne non disegnate il browser non le conosce. A un capo della
    // griglia Tab esce come sempre.
    if (evento.key === 'Tab' && vista?.attiva) {
      const avanti = !evento.shiftKey
      const [dopoRiga, dopoColonna] = avanti
        ? colonna + 1 < momenti.length ? [riga, colonna + 1] : [riga + 1, 0]
        : colonna > 0 ? [riga, colonna - 1] : [riga - 1, momenti.length - 1]
      if (spostaFuoco(griglia, dopoRiga, dopoColonna, vista)) evento.preventDefault()
      return
    }

    const passi: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      Enter: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }
    const passo = passi[evento.key]
    if (!passo) return
    // Frecce orizzontali dentro un campo con testo: si sta muovendo il cursore.
    if ((evento.key === 'ArrowLeft' || evento.key === 'ArrowRight') && bersaglio.value.length > 0) {
      const inizio = bersaglio.selectionStart ?? 0
      if (evento.key === 'ArrowLeft' && inizio > 0) return
      if (evento.key === 'ArrowRight' && inizio < bersaglio.value.length) return
    }
    evento.preventDefault()

    // Il bersaglio si cerca prima di lasciare questo campo, o Invio sull'ultima
    // riga perderebbe il fuoco. A fine colonna si passa in cima a quella dopo.
    if (!spostaFuoco(griglia, riga + passo[0], colonna + passo[1], vista) && passo[0] > 0) {
      spostaFuoco(griglia, 0, colonna + passo[1] + 1, vista)
    }
    // Il `blur` sempre, anche senza dove andare: `preventDefault` ha tolto a Invio
    // il suo effetto, e senza `change` un ridisegno perderebbe la cifra.
    bersaglio.blur()
  })

  return contenitore
}
