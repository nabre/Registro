// La barra in fondo: che cosa manca, e com'è messa la macchina.
//
// Risponde alla domanda che ci si fa aprendo il registro senza sapere ancora
// perché lo si è aperto — «c'è qualcosa da fare?» — e ci porta dentro con un
// clic. È l'unico posto del registro che si guarda senza cercare niente, quindi
// deve stare in poche parole e non deve mai mentire.
//
// Due gruppi e una regola per stare zitti.
//
//   A sinistra quel che chiede qualcosa a chi insegna: l'ora da compilare, le
//   pendenze. Sono voci che si premono.
//
//   A destra com'è messa la macchina: la rete, la posta, l'anno in uso. Sono
//   voci di stato, e due su tre si premono per andare dove si cambiano.
//
// La regola è che una voce che non ha niente da dire non compare. Una barra che
// dice sempre le stesse otto cose diventa sfondo in tre giorni, e allora il
// giorno in cui dice «senza rete» non la legge più nessuno.

import { CARTE, quanti } from '../dominio/lessico.js'
import { oraDaCompilare } from '../dominio/cruscotto.js'
import { formattaData, oggi } from '../dominio/date.js'
import { riepilogoTodo } from '../dominio/todo.js'
import { icona, type NomeIcona } from './componenti/icone.js'
import { h, type Figlio } from './dom.js'
import {
  aggiorna,
  annoCorrente,
  classiDellAnno,
  corsiDellAnnoAperto,
  lezioniInAgenda,
  nomeClasseDiLezione,
  nomeSemestreScelto,
  stato,
} from './stato.js'

/** Il tono di una voce: decide il colore del puntino e nient'altro. */
type Tono = 'quiete' | 'positivo' | 'attenzione' | 'negativo'

interface Voce {
  simbolo: NomeIcona
  testo: string
  /** Quel che si legge fermandosi sopra: la riga lunga che nella barra non ci sta. */
  titolo: string
  tono?: Tono
  /** Se c'è, la voce è un pulsante. Se non c'è, è una scritta. */
  al?: () => void
}

function voce (v: Voce): HTMLElement {
  const dentro: Figlio[] = [
    icona(v.simbolo, 'icona--minuta'),
    h('span', { class: 'barra-stato__testo' }, v.testo),
  ]
  const classe = ['barra-stato__voce', v.tono && `barra-stato__voce--${v.tono}`]

  if (!v.al) return h('span', { class: classe, attr: { title: v.titolo } }, dentro)

  return h(
    'button',
    {
      class: [...classe, 'barra-stato__voce--premibile'],
      type: 'button',
      attr: { title: v.titolo },
      onclick: v.al,
    },
    dentro,
  )
}

// --------------------------------------------------------------- il registro

/** «oggi», o il giorno scritto: quel che si direbbe a voce. */
function quando (data: string): string {
  if (data === stato.adessoData) return 'oggi'
  return formattaData(data, 'giorno')
}

function vociDelRegistro (): Figlio[] {
  // Sulle ore in agenda e non su tutte: se si sta filtrando per una classe, la
  // barra parla di quella — altrimenti direbbe di un buco che in questo momento
  // non si sta guardando, e non si troverebbe premendola.
  const trovata = oraDaCompilare(
    stato.registro,
    lezioniInAgenda(),
    stato.adessoData,
    stato.adessoOra,
  )

  if (!trovata) {
    return [
      voce({
        simbolo: 'agenda',
        testo: 'nessuna ora in programma',
        titolo: 'Non ci sono lezioni da fare né da compilare in questo anno',
        tono: 'quiete',
      }),
    ]
  }

  const { lezione, manca } = trovata
  const classe = nomeClasseDiLezione(lezione)
  const inizio = lezione.slot[0]?.inizio ?? ''

  return [
    voce({
      simbolo: manca ? 'avviso' : 'agenda',
      testo: manca
        ? `da compilare: ${classe} · ${quando(lezione.data)}`
        : `prossima: ${classe} · ${quando(lezione.data)}${inizio ? ` ${inizio}` : ''}`,
      titolo: manca
        ? `L'ora di ${formattaData(lezione.data, 'lungo')} è passata e il suo registro non è a posto.\nApri il registro dell'ora`
        : `Prossima ora: ${formattaData(lezione.data, 'lungo')}${inizio ? `, alle ${inizio}` : ''}.\nApri il registro dell'ora`,
      tono: manca ? 'attenzione' : 'quiete',
      al: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id, data: lezione.data }),
    }),
  ]
}

// ------------------------------------------------------------- quel che resta

function vociDelLavoro (): Figlio[] {
  const voci: Figlio[] = []

  const classi = classiDellAnno()
  const riepilogo = riepilogoTodo(stato.registro, classi, corsiDellAnnoAperto(), oggi())
  if (riepilogo.aperti > 0) {
    voci.push(
      voce({
        simbolo: 'spunta',
        testo: quanti(riepilogo.aperti, CARTE.pendenza),
        titolo:
          riepilogo.urgenti > 0
            ? `${riepilogo.urgenti} in ritardo su ${riepilogo.aperti}.\nApri le ${CARTE.pendenza.plurale}`
            : `Quel che resta da chiudere.\nApri le ${CARTE.pendenza.plurale}`,
        tono: riepilogo.urgenti > 0 ? 'attenzione' : 'quiete',
        al: () => aggiorna({ vista: 'todo' }),
      }),
    )
  }

  // La lettura delle scansioni: c'è solo mentre macina, e allora è la cosa più
  // interessante della barra — è l'unica che si muove da sola.
  const lavoro = stato.lavoro
  if (lavoro.totale > 0) {
    voci.push(
      voce({
        simbolo: 'orologio',
        testo: `legge ${lavoro.fatte + 1} di ${lavoro.totale}`,
        titolo: lavoro.corrente
          ? `Sta leggendo ${lavoro.corrente}`
          : 'Sta leggendo le scansioni arrivate nella cassetta',
        tono: 'quiete',
      }),
    )
  }

  return voci
}

// ------------------------------------------------------------- la connettività

/**
 * Da dove escono le comunicazioni, detto in tre parole.
 *
 * Non è la stessa domanda di «c'è rete»: si può essere collegatissimi e non
 * avere una casella, e allora le comunicazioni escono come file `.eml` da
 * aprire a mano. Chi guarda la barra prima di mandare venticinque messaggi
 * vuole sapere questo, non se il Wi-Fi è acceso.
 */
function vociDellaPosta (): Figlio[] {
  const posta = stato.posta

  if (!stato.rete) {
    return [
      voce({
        simbolo: 'avviso',
        testo: 'senza rete',
        titolo:
          'Il computer non è in rete: le comunicazioni non partono e le scansioni non si leggono.\n' +
          'Quel che si scrive nel registro si salva lo stesso, sul disco.',
        tono: 'negativo',
      }),
    ]
  }

  if (posta.exchange) {
    return [
      voce({
        simbolo: 'posta',
        testo: posta.invioDiretto ? 'spedisce da sé' : 'casella collegata',
        titolo:
          `Collegata a ${posta.server}${posta.mittente ? ` come ${posta.mittente}` : ''}.\n` +
          (posta.invioDiretto
            ? 'L’invio diretto è acceso: le comunicazioni partono da qui.'
            : 'L’invio diretto è spento: il registro prepara le bozze e le mandi tu.') +
          '\nApri le impostazioni della posta',
        tono: 'positivo',
        al: () => aggiorna({ vista: 'impostazioni' }),
      }),
    ]
  }

  return [
    voce({
      simbolo: 'posta',
      testo: posta.outlook ? 'bozze in Outlook' : 'bozze in file .eml',
      titolo:
        'La casella non è collegata: le comunicazioni non partono da qui.\n' +
        (posta.outlook
          ? 'Le bozze nascono dentro Outlook, e a mandarle sei tu.'
          : 'Le bozze escono come file .eml da aprire con il programma di posta.') +
        '\nApri le impostazioni della posta',
      tono: 'quiete',
      al: () => aggiorna({ vista: 'impostazioni' }),
    }),
  ]
}

function vociDellAnno (): Figlio[] {
  const anno = annoCorrente()
  if (!anno) return []
  return [
    voce({
      simbolo: 'libro',
      testo: `${anno.etichetta} · ${nomeSemestreScelto()}`,
      titolo: 'L’anno in uso e il periodo su cui sono fatti i conti.\nApri le impostazioni',
      tono: 'quiete',
      al: () => aggiorna({ vista: 'impostazioni' }),
    }),
  ]
}

// ------------------------------------------------------------------- la barra

export function barraStato (): Figlio {
  return h(
    'footer',
    {
      class: 'barra-stato',
      attr: { role: 'contentinfo', 'aria-label': 'Stato del registro' },
    },
    h('div', { class: 'barra-stato__gruppo' }, vociDelRegistro(), vociDelLavoro()),
    h(
      'div',
      { class: 'barra-stato__gruppo barra-stato__gruppo--coda' },
      vociDellaPosta(),
      vociDellAnno(),
    ),
  )
}
