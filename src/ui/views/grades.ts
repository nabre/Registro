// La griglia dei voti: la casella, quel che ci si può battere dentro, e la
// tabella che le mette in fila. Separata da `views/assessments.ts` perché la
// usano anche i pannelli dei recuperi e delle riconsegne: tenerla là creerebbe
// cicli di import, e `SIGLA_ASSENTE` (calcolata al caricamento) darebbe
// `ReferenceError` a seconda dell'ordine di valutazione di esbuild.

import { allieviAttivi, formattaVoto, mediaAllievo, mediaMomento, nomeCompleto, notaFineSemestre, ordinaAllievi, siglaPresenza, votiDellaScala } from '../../domain/calculations.js'
import { formattaData } from '../../domain/dates.js'
import { Uno, corto } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import type { Classe, MomentoValutazione, Scala } from '../../domain/models.js'
import { assenteAllOra, rigaDelRecupero } from '../../domain/retakes.js'
import { collegamento, pastiglia } from '../components/base.js'
import { } from '../components/modal.js'
import { notifica } from '../components/notifications.js'
import { h } from '../dom.js'
import { azione } from '../bridge.js'
import { aggiorna, stato } from '../state.js'
import { tabella } from '../components/table.js'
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
function spostaFuoco (tabella: HTMLElement, riga: number, colonna: number): boolean {
  const bersaglio = campoVoto(tabella, riga, colonna)
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

  // Con memoria di scorrimento: ogni voto scritto ridisegna la tabella.
  const contenitore = tabella({
    variante: 'voti',
    griglia: true,
    // testo-fisso: chiave della memoria di scorrimento, non si legge
    scorrimento: `voti:${stato.corsoId ?? ''}:${stato.semestreId ?? ''}`,
    intestazione: [
      h('th', { class: 'tabella__nome' }, Uno(L.pif)),
      ...momenti.map((momento) =>
        h(
          'th',
          { class: ['tabella__momento', stato.valutazioneId === momento.id && 'tabella__momento--scelto'] },
          collegamento({
            titolo: t.titoloMomento(momento.titolo, formattaData(momento.data), momento.peso),
            al: () => aggiorna({ valutazioneId: momento.id }),
            testo: [
              h('span', { class: 'tabella__momento-titolo' }, momento.titolo),
              h(
                'small',
                null,
                `${formattaData(momento.data, 'corto')}${momento.peso !== 1 ? ` ×${momento.peso}` : ''}`,
              ),
            ],
          }),
        ),
      ),
      // Due colonne: la media è il conto, la nota è quel che va in pagella.
      medie ? h('th', { class: 'tabella__media' }, Uno(L.media)) : null,
      medie ? h('th', { class: 'tabella__media' }, corto(L.nota)) : null,
    ],
    righe: [
      ...allievi.map((allievo, indiceRiga) => {
        const media = mediaAllievo(momenti, allievo.id).media
        return h(
          'tr',
          null,
          h('td', { class: 'tabella__nome' }, cellaNome(allievo, nomeCompleto(allievo))),
          ...momenti.map((momento, indiceColonna) => {
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
            const lista = elencoVoti(momento.scala, [SIGLA_ASSENTE])

            return h(
              'td',
              // Il posto della «R» resta anche senza lettera, per tenere incolonnate le cifre.
              { class: 'tabella__cella tabella__cella--voto' },
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
                    list: lista.id,
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
                lista.elemento,
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
          }),
          medie
            ? h(
                'td',
                { class: 'tabella__media' },
                media === null
                  ? h('span', { class: 'testo-quieto' }, '—')
                  : h('span', { class: 'testo-quieto' }, formattaVoto(media)),
              )
            : null,
          medie
            ? h(
                'td',
                { class: 'tabella__media' },
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
    ],
    piede: [
      h('td', { class: 'tabella__nome' }, t.mediaDellaClasse),
      ...momenti.map((momento) => {
        const media = mediaMomento(momento)
        return h(
          'td',
          { class: 'tabella__cella tabella__cella--totale' },
          media === null ? '—' : formattaVoto(media),
        )
      }),
      // Due celle vuote in coda (media e nota): il piede ha la media di ogni prova,
      // non di ogni allievo.
      medie ? h('td', { class: 'tabella__media' }, '') : null,
      medie ? h('td', { class: 'tabella__media' }, '') : null,
    ],
  })
  const corpo = contenitore.querySelector('table')!

  // La navigazione da foglio di calcolo.
  corpo.addEventListener('keydown', (evento: KeyboardEvent) => {
    const bersaglio = evento.target as HTMLInputElement
    if (!bersaglio.dataset.riga) return
    const riga = Number(bersaglio.dataset.riga)
    const colonna = Number(bersaglio.dataset.colonna)

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
    if (!spostaFuoco(corpo, riga + passo[0], colonna + passo[1]) && passo[0] > 0) {
      spostaFuoco(corpo, 0, colonna + passo[1] + 1)
    }
    // Il `blur` sempre, anche senza dove andare: `preventDefault` ha tolto a Invio
    // il suo effetto, e senza `change` un ridisegno perderebbe la cifra.
    bersaglio.blur()
  })

  return contenitore
}
