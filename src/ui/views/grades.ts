// La griglia dei voti: la casella, quel che ci si puo' battere dentro, e la
// tabella che le mette in fila.
//
// Sta in un file suo perche' `views/assessments.ts` faceva due mestieri: era
// **la pagina** — che incassa i pannelli dei recuperi e delle riconsegne — e
// insieme **la cassetta degli attrezzi** della griglia, di cui quei due pannelli
// hanno bisogno. I figli prendevano gli attrezzi dal padre e il padre i pannelli
// dai figli: erano i tre cicli di import di `viste/`.
//
// Qui dentro c'e' anche `SIGLA_ASSENTE`, che e' l'unico valore di quei file a
// essere calcolato al caricamento del modulo: finche' stava dentro un ciclo,
// bastava che qualcuno lo leggesse a livello di modulo dall'altro capo per
// prendersi un `ReferenceError` a seconda dell'ordine in cui esbuild valuta i
// due file — a tempo di esecuzione, nel pacchetto di produzione, e senza che
// `tsc` dicesse niente.

import { allieviAttivi, formattaVoto, mediaAllievo, mediaMomento, nomeCompleto, notaFineSemestre, ordinaAllievi, siglaPresenza, votiDellaScala } from '../../domain/calculations.js'
import { formattaData } from '../../domain/dates.js'
import { PIF, Uno } from '../../domain/lexicon.js'
import type { Classe, MomentoValutazione, Scala } from '../../domain/models.js'
import { assenteAllOra, rigaDelRecupero } from '../../domain/retakes.js'
import { pastiglia } from '../components/base.js'
import { } from '../components/modal.js'
import { notifica } from '../components/notifications.js'
import { h } from '../dom.js'
import { azione } from '../bridge.js'
import { aggiorna, stato } from '../state.js'

/**
 * La sigla con cui si segna un assente: la stessa dell'appello.
 *
 * Nell'appello un assente è una `X` e un trattino è «non impostato». Qui si
 * scriveva `a`, e il trattino voleva dire assente: due alfabeti per la stessa
 * cosa, nella stessa ora, a due centimetri di distanza — e chi trascriveva una
 * pila di verifiche batteva il trattino intendendo «niente» e si trovava
 * chi è segnato assente alla prova.
 */
export const SIGLA_ASSENTE = siglaPresenza('assente')

/**
 * Legge quel che è stato digitato in una casella.
 *
 * Stringa vuota e trattino valgono «nessun voto», come nell'appello; `X` vuol
 * dire assente, come nell'appello. `a`, `ass` e `assente` restano accettate:
 * chi le ha nelle dita continua a scriverle, e non c'è motivo di rifiutarle —
 * quel che conta è che il carattere *mostrato* sia uno solo.
 */
export function leggiCasella (testo: string): { valore: number | null; assente: boolean } | null {
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
interface OpzioniGriglia {
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
  /**
   * La scala su cui si leggono media e nota di questa griglia.
   *
   * Ogni momento si porta dietro **la sua** scala, copiata il giorno in cui è
   * stato creato: cambiare quella del registro non riscrive i voti già dati, ed
   * è voluto. Ma allora la media e la nota non si possono leggere sulla scala
   * del registro, che è quella di adesso e non quella dei voti: una griglia di
   * voti da 1 a 6 letta su una scala da 1 a 10 dà una nota che non vuol dire
   * niente, e la colora pure di verde.
   *
   * Finché i momenti mostrati hanno tutti la stessa scala — il caso normale —
   * si usa quella. Quando ce ne sono due, la media resta un'indicazione ma la
   * nota non si scrive: sommare voti di scale diverse non dà un numero che
   * appartenga a una scala, e inventarne una sarebbe peggio che tacere.
   */
  const scaleInUso = [...new Map(momenti.map((m) => [
    `${m.scala.min}-${m.scala.max}-${m.scala.sufficienza}-${m.scala.passo}`,
    m.scala,
  ])).values()]
  const scala = scaleInUso.length === 1 ? scaleInUso[0] : stato.registro.impostazioni.scala
  const scaleMescolate = scaleInUso.length > 1
  // Il passo con cui la media diventa la nota che va sulla pagella: è una
  // regola della scuola, e sta nelle impostazioni invece che nella testa di chi
  // compila.
  const passoNota = stato.registro.impostazioni.passoFineSemestre

  // La griglia dei voti è la tabella su cui si sta più a lungo, e si compila
  // scorsa a metà: senza memoria, ogni voto scritto la rimandava in cima.
  const tabella = h('div', {
    class: 'tabella-contenitore tabella-contenitore--griglia',
    dataset: { scorrimento: `voti:${stato.corsoId ?? ''}:${stato.semestreId ?? ''}` },
  })

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
                    // Il valore battuto **resta nel campo**. Prima si
                    // rimetteva `mostrato`, cioè il voto di prima: chi
                    // trascriveva venticinque compiti a raffica battendo Invio
                    // a ogni riga vedeva la cifra sbagliata sostituita da
                    // quella vecchia, e la colonna mostrava un numero che
                    // credeva di aver appena scritto. Peggio: il fuoco è già
                    // sulla riga dopo quando il lampo rosso arriva, perché la
                    // navigazione a foglio di calcolo lo sposta prima del
                    // `blur` che fa scattare questo `change`. È lo stesso
                    // difetto già corretto sulle date in `components/base.ts`,
                    // qui su un dato che finisce in pagella.
                    elemento.classList.add('cella-voto--errata')
                    setTimeout(() => elemento.classList.remove('cella-voto--errata'), 800)
                    notifica(
                      `«${elemento.value}» non è un voto: si scrive un numero, ` +
                        'oppure «-» per nessun voto e «X» per assente.',
                      'errore',
                    )
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
                  if (scaleMescolate) {
                    return h(
                      'span',
                      {
                        class: 'testo-quieto',
                        attr: {
                          title:
                            'In questo periodo ci sono prove con scale diverse: la media non ' +
                            'sta su nessuna delle due, e una nota di fine semestre da qui ' +
                            'direbbe un numero senza significato.',
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
    if (!spostaFuoco(corpo, riga + passo[0], colonna + passo[1]) && passo[0] > 0) {
      spostaFuoco(corpo, 0, colonna + passo[1] + 1)
    }
    // Il `blur` va fatto in tutti e due i casi. Sull'ultima casella
    // dell'ultima colonna non c'è dove andare, e fermandosi qui senza
    // staccare il fuoco il voto appena battuto restava nel campo e basta:
    // `preventDefault` ha già tolto a Invio il suo effetto, quindi nessun
    // `change` partiva, e un ridisegno qualsiasi — ne basta uno dell'orologio
    // — si portava via la cifra. Adesso Invio conferma sempre.
    bersaglio.blur()
  })

  tabella.appendChild(corpo)
  return tabella
}
