// I momenti di valutazione e i voti.
//
// La forma è quella del foglio di calcolo perché è quella con cui si mettono i
// voti: righe gli allievi, colonne i momenti, e ci si sposta con le frecce. Le
// medie sono pesate e si aggiornano da sole, l'ultima colonna e l'ultima riga
// sono i due totali che si guardano davvero.
//
// Una casella accetta il voto, oppure «a» per segnare l'assenza: chi
// assente non prende zero, esce dalla media.

import {
  allieviAttivi,
  distribuzione,
  distribuzioneAPunti,
  formattaVoto,
  votiDellaScala,
  mediaAllievo,
  mediaMomento,
  nomeCompleto,
  notaFineSemestre,
  ordinaAllievi,
  siglaPresenza,
} from '../../dominio/calcoli.js'
import { corsiDellAnno } from '../../dominio/corsi.js'
import { PIF, Uno } from '../../dominio/lessico.js'
import { formattaData } from '../../dominio/date.js'
import { MOTIVI_ORFANO, motivoOrfano, valutazioniOrfane } from '../../dominio/orfani.js'
// L'assenza all'ora sta nel dominio perché non la guarda solo la griglia: da
// lì nascono i recuperi, e due letture della stessa cosa potrebbero divergere.
import { assenteAllOra, rigaDelRecupero } from '../../dominio/recuperi.js'
import type {
  Allievo,
  Classe,
  Corso,
  MomentoValutazione,
  Scala,
} from '../../dominio/modelli.js'
import {
  avviso,
  barra,
  campo,
  pastiglia,
  pulsante,
  scheda,
  statoVuoto,
  testataVista,
} from '../componenti/base.js'
import { postoAllegato } from '../componenti/allegati.js'
import { eseguiOAvvisa, sintesiIncassata, statoVuotoAnno } from '../componenti/filtri.js'
import { conferma } from '../componenti/modale.js'
import { graficoNote } from '../componenti/note.js'
import { notifica } from '../componenti/notifiche.js'
import { h, type Figlio } from '../dom.js'
import { chiediEliminazione, moduloAvvio, moduloValutazione } from '../moduli.js'
import { pannelloRecuperi } from './recuperi.js'
import { pannelloRiconsegna } from './riconsegne.js'
import { azione } from '../ponte.js'
import {
  aggiorna,
  annoCorrente,
  classeDiMomento,
  classePerId,
  stato,
  valutazionePerId,
  nomeSemestreScelto,
  nelSemestreScelto,
} from '../stato.js'

/**
 * I momenti di una classe, già ristretti al semestre scelto.
 *
 * Il semestre non è scritto sul momento: è quello in cui cade la sua data. E
 * non è più una scelta di questa pagina — c'era una tendina qui e una nella
 * barra, e due controlli per la stessa cosa vogliono dire due numeri diversi
 * letti nello stesso pomeriggio. Comanda quello della barra, che vale per tutti
 * i conti del registro.
 */
function momentiDi (corso: Corso): MomentoValutazione[] {
  return nelSemestreScelto(
    stato.registro.valutazioni.filter((v) => v.corsoId === corso.id),
  ).sort((a, b) => a.data.localeCompare(b.data))
}

/**
 * I corsi fra cui si sceglie: tutti quelli dell'anno, di ogni classe.
 *
 * Non c'è un filtro per classe, e non serve: il corso è già la coppia classe e
 * materia, e chiedere prima la classe era un passaggio in più per arrivare
 * dove si stava andando comunque. Il nome del corso dice di che classe è, e
 * l'elenco è ordinato in modo che le materie della stessa classe stiano
 * vicine.
 */
function corsiScegliibili (): Corso[] {
  return corsiDellAnno(stato.registro, annoCorrente()?.id ?? null)
    .filter((corso) => !classePerId(corso.classeId)?.archiviata)
    .sort((a, b) => {
      const perClasse = (classePerId(a.classeId)?.nome ?? '').localeCompare(
        classePerId(b.classeId)?.nome ?? '',
        'it',
      )
      return perClasse !== 0 ? perClasse : a.titolo.localeCompare(b.titolo, 'it')
    })
}

/**
 * Il corso di cui si guardano le valutazioni.
 *
 * È `stato.corsoId`, lo stesso della vista Corsi e dei Piani: chi arriva qui
 * stava già guardando quel corso. Se quel corso non c'è più — o è di un anno
 * chiuso — si ripiega sul primo.
 */
function corsoScelto (): Corso | null {
  const scegliibili = corsiScegliibili()
  return scegliibili.find((c) => c.id === stato.corsoId) ?? scegliibili[0] ?? null
}

/**
 * La sigla con cui si segna un assente: la stessa dell'appello.
 *
 * Nell'appello un assente è una `X` e un trattino è «non impostato». Qui si
 * scriveva `a`, e il trattino voleva dire assente: due alfabeti per la stessa
 * cosa, nella stessa ora, a due centimetri di distanza — e chi trascriveva una
 * pila di verifiche batteva il trattino intendendo «niente» e si trovava
 * chi è segnato assente alla prova.
 */
const SIGLA_ASSENTE = siglaPresenza('assente')

/**
 * Legge quel che è stato digitato in una casella.
 *
 * Stringa vuota e trattino valgono «nessun voto», come nell'appello; `X` vuol
 * dire assente, come nell'appello. `a`, `ass` e `assente` restano accettate:
 * chi le ha nelle dita continua a scriverle, e non c'è motivo di rifiutarle —
 * quel che conta è che il carattere *mostrato* sia uno solo.
 */
function leggiCasella (testo: string): { valore: number | null; assente: boolean } | null {
  const pulito = testo.trim().toLowerCase().replace(',', '.')
  if (pulito === '' || pulito === '-') return { valore: null, assente: false }
  if (['x', 'a', 'ass', 'assente'].includes(pulito)) return { valore: null, assente: true }
  const numero = Number(pulito)
  return Number.isFinite(numero) ? { valore: numero, assente: false } : null
}

/** Un numero diverso per ogni elenco: gli id devono restare unici nella pagina. */
let contatoreElenchi = 0

/**
 * La tendina dei voti da agganciare a una casella.
 *
 * È un `datalist` e non un `select` perché la casella deve restare scrivibile:
 * chi trascrive venticinque compiti batte le cifre e va avanti, e una tendina
 * che obbliga a scegliere sarebbe più lenta di quel che sostituisce. Con
 * questo invece si può fare tutte e due le cose — scrivere, o aprire l'elenco
 * e prendere il voto — e la stessa casella accetta anche la sigla dell'assente.
 *
 * Torna l'elemento e il suo id: chi la usa mette l'id sull'`input` e il
 * `datalist` accanto, nello stesso pezzo di pagina.
 */
export function elencoVoti (scala: Scala, sigleInPiu: string[] = []): {
  id: string
  elemento: HTMLElement
} {
  contatoreElenchi += 1
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
 * Frecce e Invio spostano il fuoco come in un foglio di calcolo. Torna vero
 * se un campo c'era davvero: chi chiama deve saperlo prima di togliere il
 * fuoco da quello di partenza, o restare fermi vorrebbe dire restare senza.
 */
function spostaFuoco (tabella: HTMLElement, riga: number, colonna: number): boolean {
  const bersaglio = campoVoto(tabella, riga, colonna)
  if (!bersaglio) return false
  bersaglio.focus()
  bersaglio.select()
  return true
}

/**
 * Il foglio dei voti: allievi in riga, momenti in colonna, le medie in fondo.
 *
 * Esportata perché i posti in cui si compila sono due: la lezione, dove si
 * mettono i voti dell'ora appena fatta, e questa vista, dove si guarda l'anno
 * intero — e dove capita di correggere una prova di novembre a gennaio, o di
 * mettere il voto di un recupero fatto un altro giorno. Una griglia sola per
 * tutti e due, così non esistono due modi di scrivere lo stesso voto.
 *
 * Qui era in sola lettura, e sembrava una buona regola: si scrive dove la
 * prova si è fatta. Ma non tutto quel che si scrive appartiene a un'ora — un
 * recupero, una correzione, un voto arrivato in ritardo — e una casella che
 * mostra il numero senza lasciarlo toccare manda a cercare la lezione giusta
 * fra venti, per battere una cifra.
 */
export interface OpzioniGriglia {
  /**
   * Solo questi allievi, invece di tutta la classe.
   *
   * Serve quando la domanda riguarda pochi nomi e non il gruppo: nell'ora di
   * un recupero si mettono due voti, e una griglia di venticinque righe di cui
   * ventitré vuote fa cercare le due che contano. Sono id, non allievi già
   * scelti: l'ordine e chi frequenta ancora restano decisi qui, in un posto
   * solo.
   */
  soloAllievi?: string[]
  /**
   * Le due colonne in coda: la media del semestre e la nota che ne esce.
   *
   * Si tolgono dove la griglia mostra una prova sola. Lì la «media» sarebbe il
   * voto appena battuto ricopiato accanto a sé stesso, e la «nota» una nota di
   * fine semestre calcolata su un voto: due numeri che sembrano un bilancio e
   * non lo sono. Il bilancio si guarda nella vista Valutazioni, dove le
   * colonne ci sono tutte.
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
  const scala = stato.registro.impostazioni.scala
  // Il passo con cui la media diventa la nota che va sulla pagella: è una
  // regola della scuola, e sta nelle impostazioni invece che nella testa di chi
  // compila.
  const passoNota = stato.registro.impostazioni.passoFineSemestre

  const tabella = h('div', { class: 'tabella-contenitore tabella-contenitore--griglia' })

  const corpo = h(
    'table',
    { class: 'tabella tabella--voti' },
    h(
      'thead',
      null,
      h(
        'tr',
        null,
        h('th', { class: 'tabella__nome' }, Uno(PIF)),
        ...momenti.map((momento) =>
          h(
            'th',
            { class: ['tabella__momento', stato.valutazioneId === momento.id && 'tabella__momento--scelto'] },
            h(
              'button',
              {
                class: 'collegamento',
                type: 'button',
                attr: { title: `${momento.titolo} — ${formattaData(momento.data)} · peso ${momento.peso}` },
                onclick: () => aggiorna({ valutazioneId: momento.id }),
              },
              h('span', { class: 'tabella__momento-titolo' }, momento.titolo),
              h(
                'small',
                null,
                `${formattaData(momento.data).slice(0, 5)}${momento.peso !== 1 ? ` ×${momento.peso}` : ''}`,
              ),
            ),
          ),
        ),
        // Due colonne e non una: la media è il conto, la nota è quel che va
        // sulla pagella. Tenerle insieme obbligava ad arrotondare a mente, e
        // due docenti lo facevano in due modi.
        medie ? h('th', { class: 'tabella__media' }, 'Media') : null,
        medie ? h('th', { class: 'tabella__media' }, 'Nota') : null,
      ),
    ),
    h(
      'tbody',
      null,
      ...allievi.map((allievo, indiceRiga) => {
        const media = mediaAllievo(momenti, allievo.id).media
        return h(
          'tr',
          null,
          h('td', { class: 'tabella__nome' }, nomeCompleto(allievo)),
          ...momenti.map((momento, indiceColonna) => {
            const voto = momento.voti.find((v) => v.allievoId === allievo.id)
            const mostrato = voto?.assente
              ? SIGLA_ASSENTE
              : voto?.valore === null || voto?.valore === undefined
                ? ''
                : String(voto.valore)
            // Quel che dice l'appello, quando la casella è ancora vuota: si
            // vede chi non c'era senza doverlo cercare nell'altra scheda.
            const mancava =
              mostrato === '' && assenteAllOra(stato.registro, momento, allievo.id)
            const insufficiente =
              typeof voto?.valore === 'number' && !voto.assente && voto.valore < momento.scala.sufficienza
            // La riga nella tabella dei recuperi: quel voto non è della
            // giornata della prova. Conta perché un 4 rifatto a gennaio e un 4
            // preso con la classe non si commentano allo stesso modo — e a
            // fine semestre, davanti a una colonna di numeri, non c'è più
            // niente che lo ricordi.
            const recupero = rigaDelRecupero(momento, allievo.id)
            const lista = elencoVoti(momento.scala, [SIGLA_ASSENTE])

            return h(
              'td',
              // La colonna è sempre fatta uguale, con o senza la «R»: senza,
              // il posto della lettera resta vuoto invece di sparire, e le
              // cifre di tutta la colonna restano incolonnate. Una casella che
              // si sposta di sei pixel quando la riga accanto ha un recupero
              // rende la colonna illeggibile proprio dove la si scorre.
              { class: 'tabella__cella tabella__cella--voto' },
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
                dataset: { riga: indiceRiga, colonna: indiceColonna, fuoco: `voto-${momento.id}-${allievo.id}` },
                attr: {
                  'aria-label': `${nomeCompleto(allievo)} — ${momento.titolo}`,
                  title: mancava
                    ? 'Assente all’appello di quest’ora: premi X per segnarlo anche qui'
                    : voto?.nota ?? '',
                  inputmode: 'decimal',
                  list: lista.id,
                },
                onchange: async (evento: Event) => {
                  const elemento = evento.target as HTMLInputElement
                  const letto = leggiCasella(elemento.value)
                  if (!letto) {
                    elemento.value = mostrato
                    elemento.classList.add('cella-voto--errata')
                    setTimeout(() => elemento.classList.remove('cella-voto--errata'), 800)
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
                    elemento.classList.add('cella-voto--errata')
                    setTimeout(() => elemento.classList.remove('cella-voto--errata'), 800)
                  }
                },
              }),
              lista.elemento,
              // La «R» accanto alla casella, non dentro: dentro sarebbe un
              // carattere da cancellare per scrivere il voto. Il posto c'è
              // comunque, anche quando la lettera non serve: è quel che tiene
              // dritta la colonna.
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
                        ? 'Non si recupera: dichiarato da chi insegna'
                        : recupero.previstoIl
                          ? `Recupero del ${formattaData(recupero.previstoIl, 'giorno')}` +
                            (recupero.nota ? ` · ${recupero.nota}` : '')
                          : 'Recupero da fissare',
                  },
                },
                'R',
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
                  const nota = notaFineSemestre(media, scala, passoNota)
                  return nota === null
                    ? h('span', { class: 'testo-quieto' }, '—')
                    : pastiglia(formattaVoto(nota), nota >= scala.sufficienza ? 'positivo' : 'negativo')
                })(),
              )
            : null,
        )
      }),
    ),
    h(
      'tfoot',
      null,
      h(
        'tr',
        null,
        h('td', { class: 'tabella__nome' }, 'Media della classe'),
        ...momenti.map((momento) => {
          const media = mediaMomento(momento)
          return h(
            'td',
            { class: 'tabella__cella tabella__cella--totale' },
            media === null ? '—' : formattaVoto(media),
          )
        }),
        // Due celle vuote in coda: le colonne della media e della nota. Il
        // piede conta la media di ogni prova, non quella di ogni allievo.
        medie ? h('td', { class: 'tabella__media' }, '') : null,
        medie ? h('td', { class: 'tabella__media' }, '') : null,
      ),
    ),
  )

  // La navigazione da foglio di calcolo: senza, mettere trenta voti è un
  // esercizio di mouse.
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

    // Il bersaglio si cerca prima di lasciare questo campo: staccando il
    // fuoco subito, Invio sull'ultima riga non trovava nessuno pronto a
    // riprenderlo e lo perdeva del tutto. A fine colonna si passa alla prima
    // riga di quella dopo — è così che si scende scrivendo una colonna alla
    // volta, senza dover tornare su con il mouse.
    const spostato =
      spostaFuoco(corpo, riga + passo[0], colonna + passo[1]) ||
      (passo[0] > 0 && spostaFuoco(corpo, 0, colonna + passo[1] + 1))
    if (spostato) bersaglio.blur()
  })

  tabella.appendChild(corpo)
  return tabella
}

// ------------------------------------------------------------------ allegati

/** I PDF del momento: il testo, la soluzione, e la prova corretta di ogni allievo. */
function schedaAllegati (momento: MomentoValutazione, allievi: Allievo[]): HTMLElement {
  const prove = momento.allegati.filter((a) => a.ruolo === 'prova').length

  return scheda({
    titolo: 'Documenti',
    sottotitolo: 'i PDF stanno nella cartella del registro, sotto allegati/',
    contenuto: h(
      'div',
      { class: 'allegati' },
      postoAllegato(momento, 'verifica', 'Verifica'),
      postoAllegato(momento, 'soluzione', 'Soluzione'),
      h(
        'div',
        { class: 'allegati__testata-prove' },
        h('h4', null, 'Prove corrette'),
        h('span', { class: 'testo-quieto' }, `${prove}/${allievi.length}`),
      ),
      ...allievi.map((allievo) =>
        postoAllegato(momento, 'prova', nomeCompleto(allievo), { allievoId: allievo.id }),
      ),
      allievi.length === 0
        ? h('p', { class: 'testo-quieto' }, `La classe non ha ${PIF.plurale} attive.`)
        : null,
    ),
  })
}

function dettaglioMomento (momento: MomentoValutazione): HTMLElement {
  const statistiche = distribuzione(momento)
  const classe = classeDiMomento(momento)
  const attivi = classe ? allieviAttivi(classe) : []
  // «Voti messi» conta chi ha un voto adesso, non chi ce l'aveva quando si è
  // ritirato: `distribuzione` guarda tutti i voti del momento, ritirati
  // compresi, e messo al numeratore gonfiava il conto rispetto al
  // denominatore, che è solo chi frequenta ancora.
  const attiviIds = new Set(attivi.map((a) => a.id))
  const messiAttivi = momento.voti.filter(
    (v) => attiviIds.has(v.allievoId) && !v.assente && typeof v.valore === 'number',
  ).length

  const lezione = momento.lezioneId
    ? stato.registro.lezioni.find((l) => l.id === momento.lezioneId) ?? null
    : null

  // Se non viene da nessuna tappa lo si dice qui, dove lo si guarda: resta
  // nelle medie, e senza un segno sembra un momento come gli altri.
  const motivo = motivoOrfano(stato.registro, momento)

  return scheda({
    titolo: momento.titolo,
    sottotitolo:
      `${formattaData(momento.data, 'lungo')} · ${momento.tipo} · peso ${momento.peso}` +
      (motivo ? ` · sganciato: ${MOTIVI_ORFANO[motivo]}` : ''),
    azioni: [
      lezione
        ? pulsante({
            testo: 'Vai alla lezione',
            simbolo: 'calendario',
            variante: 'fantasma',
            al: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id, data: lezione.data }),
          })
        : null,
      pulsante({ testo: 'Modifica', simbolo: 'matita', variante: 'sottile', al: () => moduloValutazione(momento) }),
      // L'eliminazione stava solo dentro il modulo di modifica: la si trovava
      // per caso. Qui è accanto a quel che elimina.
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: 'Elimina il momento di valutazione',
        al: async () => {
          if (!(await chiediEliminazione({ genere: 'valutazione', id: momento.id }))) return
          const risposta = await azione({
            tipo: 'valutazione.elimina',
            valutazioneId: momento.id,
          })
          if (!risposta.ok) return
          aggiorna({ valutazioneId: null })
          notifica('Momento eliminato.', 'info')
        },
      }),
    ],
    contenuto: h(
      'div',
      null,
      momento.descrizione ? h('p', { class: 'nota-classe' }, momento.descrizione) : null,
      lezione === null && momento.lezioneId === null
        ? null
        : h(
            'p',
            { class: 'testo-quieto' },
            lezione
              ? `Svolto nella lezione del ${formattaData(lezione.data, 'lungo')}: la data segue la lezione.`
              : 'La lezione collegata non c’è più: la data resta quella registrata.',
          ),
      sintesiIncassata(
        { etichetta: 'voti messi', valore: `${messiAttivi}/${attivi.length}` },
        { etichetta: 'media', valore: formattaVoto(statistiche.media) },
        { etichetta: 'minimo', valore: formattaVoto(statistiche.minimo) },
        { etichetta: 'massimo', valore: formattaVoto(statistiche.massimo) },
        {
          etichetta: 'sufficienti',
          valore: statistiche.conteggio === 0 ? '—' : `${Math.round(statistiche.quotaSufficienti * 100)}%`,
          tono: statistiche.quotaSufficienti >= 0.6 ? 'positivo' : 'attenzione',
        },
      ),
      // Lo stesso grafico del PDF e dello schermo per la classe, lo stesso
      // componente: qui c'era un istogramma scritto a mano, e la stessa prova
      // aveva tre forme diverse a seconda di dove la si guardava.
      statistiche.conteggio > 0
        ? graficoNote({
            grafico: distribuzioneAPunti(momento),
            media: formattaVoto(statistiche.media),
            sufficienti: statistiche.sufficienti,
            conteggio: statistiche.conteggio,
            estremi:
              statistiche.minimo !== null && statistiche.massimo !== null
                ? `da ${formattaVoto(statistiche.minimo)} a ${formattaVoto(statistiche.massimo)}`
                : null,
          })
        : h('p', { class: 'testo-quieto' }, 'Nessun voto ancora inserito.'),
      h(
        'div',
        { class: 'avanzamento-inserimento' },
        h('span', null, 'Inserimento'),
        barra(attivi.length === 0 ? 0 : messiAttivi / attivi.length, 'informativo'),
      ),
    ),
  })
}

/**
 * I momenti che nessuna tappa del piano ha fatto nascere.
 *
 * Non si riparano da soli e non si buttano da soli: portano dei voti, e i voti
 * sono l'unica cosa del registro che non si può rifare guardando altrove. Qui
 * si dice quali sono, perché sono sganciati e quanti voti si porterebbero via;
 * la decisione resta a chi guarda.
 *
 * Si vedono solo quando ce ne sono: un riquadro che dice «nessun problema» è un
 * riquadro che si impara a saltare, e il giorno in cui dice qualcosa non lo
 * legge più nessuno.
 */
function riquadroOrfane (corso: Corso | null): Figlio {
  if (!corso) return null
  // Nel semestre scelto come tutto il resto della vista: un elenco che parla
  // di prove di un altro periodo, accanto a una griglia che non le mostra,
  // manda a cercare qualcosa che non si vede.
  const nelPeriodo = (voci: ReturnType<typeof valutazioniOrfane>) =>
    voci.filter((o) => nelSemestreScelto([o.momento]).length > 0)
  const orfane = nelPeriodo(valutazioniOrfane(stato.registro, [corso.id]))
  // Quelli degli altri corsi non spariscono: si dice quanti sono, così
  // cambiando corso si sa che c'è ancora da fare.
  const altrove =
    nelPeriodo(valutazioniOrfane(stato.registro, corsiScegliibili().map((c) => c.id))).length -
    orfane.length
  if (orfane.length === 0 && altrove === 0) return null
  if (orfane.length === 0) {
    return avviso(
      h(
        'span',
        null,
        `${altrove === 1 ? 'Un momento sganciato' : `${altrove} momenti sganciati`} ` +
          'in altri corsi: si sistemano scegliendo il loro corso qui sopra.',
      ),
      'informativo',
    )
  }

  const voti = orfane.reduce((somma, o) => somma + o.voti, 0)

  const eliminaTutte = async () => {
    const vaBene = await conferma({
      titolo: `Eliminare ${orfane.length === 1 ? 'il momento sganciato' : `i ${orfane.length} momenti sganciati`}?`,
      testo:
        (voti > 0
          ? `Se ne ${voti === 1 ? 'va anche 1 voto' : `vanno anche ${voti} voti`}, e non si può tornare indietro. `
          : 'Nessuno di loro ha voti dentro. ') +
        'I PDF allegati finiscono nel cestino del sistema.',
      testoConferma: 'Elimina',
      pericolo: true,
    })
    if (!vaBene) return
    await eseguiOAvvisa({ tipo: 'valutazione.eliminaOrfane', ids: orfane.map((o) => o.momento.id) })
  }

  return avviso(
    h(
      'div',
      { class: 'orfane' },
      h(
        'div',
        { class: 'orfane__testata' },
        h(
          'strong',
          null,
          orfane.length === 1
            ? 'Un momento non è agganciato a nessuna tappa del piano'
            : `${orfane.length} momenti non sono agganciati a nessuna tappa del piano`,
        ),
        pulsante({
          testo: 'Elimina tutti',
          simbolo: 'cestino',
          variante: 'sottile',
          titolo: 'Butta via tutti i momenti sganciati elencati qui',
          al: () => void eliminaTutte(),
        }),
      ),
      h(
        'p',
        { class: 'testo-quieto' },
        'Un momento nasce dalla tappa del piano che dichiara di essere una prova. ' +
          'Questi vengono da prima, o hanno perso la tappa per strada: restano nelle ' +
          'medie, ma non si sa più da che cosa siano usciti.' +
          (altrove > 0 ? ` Altri ${altrove} in altri corsi.` : ''),
      ),
      h(
        'ul',
        { class: 'orfane__elenco' },
        ...orfane.map((orfana) =>
          h(
            'li',
            { class: 'orfane__voce' },
            h(
              'button',
              {
                class: 'collegamento',
                type: 'button',
                title: 'Apri questo momento',
                onclick: () => aggiorna({ valutazioneId: orfana.momento.id }),
              },
              `${formattaData(orfana.momento.data)} · ${orfana.momento.titolo}`,
            ),
            h(
              'span',
              { class: 'testo-quieto' },
              `${MOTIVI_ORFANO[orfana.motivo]}${orfana.voti > 0 ? ` · ${orfana.voti} ${orfana.voti === 1 ? 'voto' : 'voti'}` : ' · nessun voto'}`,
            ),
            pulsante({
              simbolo: 'cestino',
              variante: 'fantasma',
              titolo: `Elimina «${orfana.momento.titolo}»`,
              al: async () => {
                const vaBene = await chiediEliminazione({
                  genere: 'valutazione',
                  id: orfana.momento.id,
                })
                if (!vaBene) return
                await eseguiOAvvisa({
                  tipo: 'valutazione.elimina',
                  valutazioneId: orfana.momento.id,
                })
              },
            }),
          ),
        ),
      ),
    ),
    'attenzione',
  )
}

export function vistaValutazioni (): Figlio {
  const anno = annoCorrente()
  if (!anno) {
    return statoVuotoAnno({ simbolo: 'valutazioni', avvia: () => moduloAvvio() })
  }

  // Le valutazioni si guardano un corso alla volta: la media in fondo alla
  // griglia è quella del corso, e mescolare due materie darebbe un numero che
  // non è la media di niente. Il corso è già la coppia classe e materia, e un
  // filtro per classe davanti era un passaggio in più per arrivare dove si
  // stava andando comunque.
  const corso = corsoScelto()
  const classe = corso ? classePerId(corso.classeId) : null

  if (!corso || !classe) {
    return statoVuoto({
      simbolo: 'valutazioni',
      titolo: 'Nessun corso',
      testo: 'I voti stanno dentro un corso — una materia a una classe — e prima si crea quello.',
      azione: pulsante({ testo: 'Vai ai corsi', variante: 'primario', al: () => aggiorna({ vista: 'corsi' }) }),
    })
  }

  const momenti = momentiDi(corso)
  const scelto = valutazionePerId(stato.valutazioneId)
  // Anche il dettaglio sta nel semestre scelto: aperto un momento e cambiato
  // periodo, la scheda restava lì a mostrare una prova che la griglia accanto
  // non elencava più.
  const daMostrare =
    scelto && scelto.corsoId === corso.id && momenti.some((m) => m.id === scelto.id)
      ? scelto
      : null
  const momentoMostrato = daMostrare ?? momenti.at(-1) ?? null

  return h(
    'div',
    { class: 'vista vista--valutazioni' },
    testataVista({
      titolo: 'Momenti di valutazione',
      sottotitolo: `${classe.nome} · ${nomeSemestreScelto()}`,
      azioni: [
        // La griglia in PDF sta in Documenti. Il CSV resta qui: non è un
        // documento che si consegna, è il dato che si porta in un foglio di
        // calcolo mentre si sta lavorando ai voti.
        // Il CSV resta per chi deve rifare i conti in un foglio di calcolo: il
        // PDF si consegna, il CSV si lavora.
        pulsante({
          simbolo: 'esporta',
          variante: 'fantasma',
          titolo: 'Le stesse valutazioni in CSV, per il foglio di calcolo',
          al: () =>
            azione({
              tipo: 'esporta.valutazioni',
              corsoId: corso.id,
              semestreId: stato.semestreId,
            }),
        }),
      ],
      contorno: h(
        'div',
        { class: 'filtri' },
        // Il corso è l'unico filtro: è già la coppia classe e materia, e i voti
        // sono suoi. Chiedere prima la classe voleva dire due tendine per una
        // scelta sola.
        campo({
          nome: 'corsoValutazioni',
          etichetta: 'Corso',
          tipo: 'select',
          valore: corso.id,
          opzioni: corsiScegliibili().map((c) => ({ valore: c.id, testo: c.titolo })),
          al: (valore) => aggiorna({ corsoId: valore || null, valutazioneId: null }),
        }),
        h(
          'p',
          { class: 'suggerimento' },
          `Nelle caselle: il voto, oppure «${SIGLA_ASSENTE}» per l’assenza — la stessa ` +
            'sigla dell’appello. Frecce e Invio per spostarsi.',
        ),
      ),
    }),
    // Prima della griglia: è la cosa da sistemare, e sotto la griglia non la
    // vedrebbe nessuno.
    riquadroOrfane(corso),
    momenti.length === 0
      ? statoVuoto({
          simbolo: 'valutazioni',
          titolo: 'Nessun momento di valutazione',
          // Non c'è un pulsante per crearne uno, ed è voluto: un momento nasce
          // dalla tappa del piano che dichiara di essere una prova, dentro
          // l'ora in cui la prova si fa. Qui si guarda l'anno intero.
          testo:
            'Un momento è una verifica, un orale, un progetto. Nasce dalla tappa del piano ' +
            'che dichiara di essere una prova, dentro la lezione in cui la si fa: da lì ' +
            'sa già titolo, tipo, peso e data. In questo corso non ce n’è ancora nessuno.',
        })
      : h(
          'div',
          { class: 'colonne colonne--valutazioni' },
          h(
            'div',
            { class: 'colonna colonna--larga' },
            // Si scrive anche qui, non solo dentro l'ora: è la sola pagina da
            // cui si vede l'anno intero, ed è dove si correggono i voti vecchi
            // e si mettono quelli che a un'ora non appartengono.
            grigliaVoti(classe, momenti),
            // I recuperi sotto la griglia, non nella colonna stretta: è una
            // tabella di sei colonne, e schiacciata di fianco alle statistiche
            // andava a capo su ogni riga. Qui sta sotto le caselle vuote da cui
            // nasce, larga quanto loro, e si legge in orizzontale come deve.
            momentoMostrato ? pannelloRecuperi(momentoMostrato) : null,
          ),
          momentoMostrato
            ? h(
                'div',
                { class: 'colonna' },
                dettaglioMomento(momentoMostrato),
                pannelloRiconsegna(momentoMostrato),
                schedaAllegati(momentoMostrato, ordinaAllievi(allieviAttivi(classe))),
              )
            : null,
        ),
  )
}
