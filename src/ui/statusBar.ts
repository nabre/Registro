// La barra in fondo: che cosa manca e com'è messa la macchina. A sinistra quel
// che chiede qualcosa (l'ora da compilare, le pendenze), come pulsanti; a destra
// lo stato della macchina con le sole icone (assistente, lettura delle
// scansioni, aggiornamenti, rete, posta, anno), frase intera nel titolo. Una
// voce che non ha niente da dire non compare: una barra sempre uguale smette
// di essere letta.

import { formattaData } from '../domain/dates.js'
import { icona, type NomeIcona } from './components/icons.js'
import { tendinaAperta } from './components/menu.js'
import { nomeDelCorso } from './context.js'
import { statoDegliAggiornamenti } from './views/settings/updates.js'
import { h, type Figlio } from './dom.js'
import { azione } from './bridge.js'
import { FUOCO_ANNO, menuDeiRegistri } from './commandBar.js'
import {
  aggiorna,
  annoCorrente,
  corsiDellAnnoAperto,
  nomeClasseDiLezione,
  oraDaFare,
  pendenzeDellaBarra,
  stato,
} from './state.js'
import { parole } from '../domain/words.testi.js'
import { testi } from './statusBar.testi.js'

/** Il tono di una voce: decide il colore del puntino e nient'altro. */
type Tono = 'quiete' | 'informativo' | 'positivo' | 'attenzione' | 'negativo'

interface Voce {
  simbolo: NomeIcona
  testo: string
  /** Quel che si legge fermandosi sopra: la riga lunga che nella barra non ci sta. */
  titolo: string
  tono?: Tono
  /** Se c'è, la voce è un pulsante. Se non c'è, è una scritta. */
  al?: (evento: MouseEvent) => void
  /** Il nome con cui ritrovarla dopo un ridisegno: serve a chi ci appende un menu. */
  fuoco?: string
  /** Se c'è, la voce è un interruttore: acceso o spento. */
  acceso?: boolean
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
      ...(v.fuoco ? { dataset: { fuoco: v.fuoco } } : {}),
      attr: {
        title: v.titolo,
        ...(v.acceso === undefined ? {} : { 'aria-pressed': String(v.acceso) }),
        // Il menu sopravvive al ridisegno e la voce no: quella nuova nasce aperta se
        // il menu pende ancora da lei (`tendinaAperta`).
        ...(v.fuoco ? { 'aria-haspopup': 'menu', 'aria-expanded': String(tendinaAperta(v.fuoco)) } : {}),
      },
      onclick: v.al,
    },
    dentro,
  )
}

// ---------------------------------------------------------------- i filtri

/**
 * Una tendina nella barra: dice di che cosa parla la voce accanto. Sono le
 * stesse scelte della riga in cima, negli stessi campi, a portata della prima
 * voce («di quale corso?», «e nell'altro semestre?»).
 */
function filtro (opzioni: {
  /** Il nome con cui ritrovare il fuoco dopo il ridisegno: vedi `ricordaFuoco`. */
  nome: string
  simbolo: NomeIcona
  etichetta: string
  titolo: string
  /**
   * Quel che la tendina deve dire adesso: `h` lo applica dopo le option, così un
   * valore che nel documento non esiste lascia la tendina in bianco.
   */
  valore: string
  al: (valore: string) => void
  figli: Figlio[]
}): HTMLElement {
  return h(
    'label',
    { class: 'barra-stato__filtro', attr: { title: opzioni.titolo } },
    icona(opzioni.simbolo, 'icona--minuta'),
    h(
      'select',
      {
        class: 'barra-stato__tendina',
        // Cambiare filtro rifà la finestra, tendina compresa: la chiave di fuoco
        // permette un secondo cambio senza ricliccare.
        // testo-fisso: chiave di fuoco, non si legge
        dataset: { fuoco: `barra-stato-${opzioni.nome}` },
        attr: { 'aria-label': opzioni.etichetta },
        value: opzioni.valore,
        onchange: (evento: Event) => opzioni.al((evento.target as HTMLSelectElement).value),
      },
      ...opzioni.figli,
    ),
    // La freccia è nostra: la tendina di sistema (`appearance: none`) gonfierebbe la riga.
    icona('giu', 'icona--minuta'),
  )
}

/**
 * Il filtro del calendario, come nella riga delle scelte: scrive in
 * `filtroCorsoAgendaId`, restringe quel che si guarda senza cambiare corso.
 */
function filtroDelCorso (): Figlio {
  const corsi = corsiDellAnnoAperto()
  if (corsi.length === 0) return null

  const t = testi()
  return filtro({
    nome: 'corso',
    simbolo: 'classi',
    etichetta: t.corso,
    titolo: t.corsoTitolo,
    valore: stato.filtroCorsoAgendaId ?? '',
    al: (valore) => aggiorna({ filtroCorsoAgendaId: valore || null }),
    figli: [
      h('option', { value: '', selected: stato.filtroCorsoAgendaId === null }, t.tuttiICorsi),
      ...corsi.map((corso) =>
        h(
          'option',
          { value: corso.id, selected: corso.id === stato.filtroCorsoAgendaId },
          nomeDelCorso(corso),
        ),
      ),
    ],
  })
}

/**
 * Il periodo dei conti, come nella riga sopra: `oraDaFare` cerca solo nel
 * periodo scelto, così tendina e voce accanto dicono cose compatibili.
 */
function filtroDelPeriodo (): Figlio {
  const anno = annoCorrente()
  if (!anno || anno.semestri.length === 0) return null

  const t = testi()
  return filtro({
    nome: 'periodo',
    simbolo: 'calendario',
    etichetta: parole().periodo,
    titolo: t.periodoTitolo,
    valore: stato.semestreId ?? '',
    al: (valore) => aggiorna({ semestreId: valore || null }),
    figli: [
      ...anno.semestri.map((semestre) =>
        h(
          'option',
          { value: semestre.id, selected: semestre.id === stato.semestreId },
          semestre.etichetta,
        ),
      ),
      h('option', { value: '', selected: stato.semestreId === null }, t.annoIntero),
    ],
  })
}

// --------------------------------------------------------------- il registro

/** «oggi», o il giorno scritto: quel che si direbbe a voce. */
function quando (data: string): string {
  if (data === stato.adessoData) return testi().oggi
  return formattaData(data, 'giorno')
}

function vociDelRegistro (): Figlio[] {
  // Sulle ore in agenda e nel periodo scelto: i due filtri stanno accanto, e la
  // voce deve portare a un'ora che si trova. Il conto è `oraDaFare`, lo stesso
  // del comando «Ora da compilare».
  const trovata = oraDaFare()
  const t = testi()

  if (!trovata) {
    return [
      voce({
        simbolo: 'agenda',
        testo: t.nessunaOra,
        titolo: t.nessunaOraTitolo,
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
        ? t.daCompilare(classe, quando(lezione.data))
        : t.prossima(classe, quando(lezione.data), inizio),
      titolo: manca
        ? t.daCompilareTitolo(formattaData(lezione.data, 'lungo'))
        : t.prossimaTitolo(formattaData(lezione.data, 'lungo'), inizio),
      tono: manca ? 'attenzione' : 'quiete',
      al: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id, data: lezione.data }),
    }),
  ]
}

// ------------------------------------------------------------- quel che resta

function vociDelLavoro (): Figlio[] {
  const voci: Figlio[] = []
  const t = testi()

  // Le stesse della pagina a cui porta il clic: vedi `pendenzeDellaBarra`.
  const riepilogo = pendenzeDellaBarra()
  if (riepilogo.aperti > 0) {
    voci.push(
      voce({
        simbolo: 'spunta',
        testo: t.pendenze(riepilogo.aperti),
        titolo:
          riepilogo.urgenti > 0
            ? t.pendenzeInRitardo(riepilogo.urgenti, riepilogo.aperti)
            : t.pendenzeTitolo,
        tono: riepilogo.urgenti > 0 ? 'attenzione' : 'quiete',
        al: () => aggiorna({ vista: 'todo' }),
      }),
    )
  }

  // La lettura delle scansioni: solo mentre lavora.
  const lavoro = stato.lavoro
  if (lavoro.totale > 0) {
    voci.push(
      voce({
        simbolo: 'orologio',
        testo: t.legge(lavoro.fatte + 1, lavoro.totale),
        // `.etichetta`: `corrente` è un oggetto (smistamento, numero, etichetta).
        titolo: lavoro.corrente ? t.staLeggendo(lavoro.corrente.etichetta) : t.staLeggendoTutto,
        tono: 'quiete',
      }),
    )
  }

  return voci
}

// ------------------------------------------------------------- la connettività

/**
 * Da dove escono le comunicazioni: casella collegata o bozze `.eml` da aprire
 * a mano. Non è la stessa domanda di «c'è rete».
 */
function vociDellaPosta (): Figlio[] {
  const posta = stato.posta
  const t = testi()

  if (!stato.rete) {
    return [
      voce({
        simbolo: 'avviso',
        testo: t.senzaRete,
        titolo: t.senzaReteTitolo,
        tono: 'negativo',
      }),
    ]
  }

  if (posta.exchange) {
    return [
      voce({
        simbolo: 'posta',
        testo: posta.invioDiretto ? t.spedisceDaSe : t.casellaCollegata,
        titolo:
          t.collegataA(posta.server, posta.mittente) +
          (posta.invioDiretto ? t.invioAcceso : t.invioSpento) +
          t.apriPosta,
        tono: 'positivo',
        al: () => aggiorna({ vista: 'impostazioni' }),
      }),
    ]
  }

  return [
    voce({
      simbolo: 'posta',
      testo: t.bozzeEml,
      titolo: t.bozzeEmlTitolo,
      tono: 'quiete',
      al: () => aggiorna({ vista: 'impostazioni' }),
    }),
  ]
}

/**
 * La versione nuova, quando c'è (disponibile, in arrivo, pronta); negli altri
 * casi tace. Le parole sono quelle del racconto (`environment/updates.ts`).
 */
function vociDellAggiornamento (): Figlio[] {
  const s = statoDegliAggiornamenti()
  if (!s?.racconto.notizia) return []
  const { breve, frase, tono } = s.racconto

  return [
    voce({
      simbolo: 'ricarica',
      testo: breve,
      titolo: testi().versione(frase, s.versione),
      // Il tono è quello del racconto: una versione nuova non è un guasto.
      tono,
      al: () => aggiorna({
        vista: 'impostazioni',
        ambitoImpostazioni: 'programma',
        schedaProgramma: 'aggiornamenti',
      }),
    }),
  ]
}

// -------------------------------------------------------------- i modelli

/** Il nome di un file .gguf senza cartella né estensione: quel che se ne dice. */
function nomeDelModello (percorso: string): string {
  return (percorso.split(/[\\/]/).pop() ?? percorso).replace(/\.gguf$/i, '')
}

async function scriviNelProgramma (chiave: string, valore: boolean): Promise<void> {
  // Un rifiuto lo dice già `azione`.
  await azione({ tipo: 'programma.salva', chiave, valore })
}

/**
 * Un interruttore per un modello locale (assistente o lettura delle
 * scansioni). Il blocco lo decide l'host (`VoceProgramma.bloccata`, da
 * `richiede` nel manifesto):
 *
 *   acceso         — verde; il clic spegne.
 *   spento         — sbiadito; il clic accende.
 *   senza modello  — sbiadito e spento per forza; il clic porta a «Modelli
 *                    linguistici», dove si rimedia.
 */
function interruttoreDelModello (opzioni: {
  simbolo: NomeIcona
  nome: string
  chiaveAttivo: string
  chiaveModello: string
}): Figlio {
  const interruttore = stato.programma.find((v) => v.chiave === opzioni.chiaveAttivo)
  // Prima che arrivino le impostazioni, niente: uno «spento» non ancora vero no.
  if (!interruttore) return null

  const acceso = interruttore.valore === true
  const bloccata = interruttore.bloccata
  const file = stato.programma.find((v) => v.chiave === opzioni.chiaveModello)?.valore
  const modello = typeof file === 'string' && file.trim() !== '' ? nomeDelModello(file) : null

  const t = testi()
  const titolo = bloccata !== null
    ? t.spentoBloccato(opzioni.nome, bloccata)
    : t.statoModello(opzioni.nome, acceso) +
      (modello ? t.modello(modello) : '') +
      (acceso ? t.premiPerSpegnere : t.premiPerAccendere)

  return voce({
    simbolo: opzioni.simbolo,
    // «Non si accende» e non «senza modello»: alla lettura può mancare solo il
    // proiettore; il perché lo dice il titolo.
    testo: t.voceModello(opzioni.nome, bloccata !== null, acceso),
    titolo,
    tono: acceso ? 'positivo' : 'quiete',
    acceso,
    al: () => {
      if (bloccata !== null) aggiorna({ vista: 'modelliLinguistici' })
      else void scriviNelProgramma(opzioni.chiaveAttivo, !acceso)
    },
  })
}

function vociDeiModelli (): Figlio[] {
  const t = testi()
  return [
    interruttoreDelModello({
      simbolo: 'bot',
      nome: t.assistente,
      chiaveAttivo: 'registroDocenti.assistente.attivo',
      chiaveModello: 'registroDocenti.assistente.modello',
    }),
    interruttoreDelModello({
      simbolo: 'documento',
      nome: t.letturaScansioni,
      chiaveAttivo: 'registroDocenti.ocr.attivo',
      chiaveModello: 'registroDocenti.ocr.modello',
    }),
  ]
}

function vociDellAnno (): Figlio[] {
  const anno = annoCorrente()
  if (!anno) return []
  return [
    voce({
      simbolo: 'libro',
      // Solo l'anno: il periodo lo dice la tendina a sinistra.
      testo: anno.etichetta,
      // Il clic apre i registri preferiti e recenti; il tasto destro mette la stella.
      titolo: testi().annoTitolo(anno.etichetta),
      tono: 'quiete',
      fuoco: FUOCO_ANNO,
      al: (evento) => menuDeiRegistri(evento.currentTarget as HTMLElement),
    }),
  ]
}

// ------------------------------------------------------------------- la barra

export function barraStato (): Figlio {
  return h(
    'footer',
    {
      class: 'barra-stato',
      attr: { role: 'contentinfo', 'aria-label': testi().statoDelRegistro },
    },
    // Quattro blocchi separati da un filo, uno per domanda: che cosa mi tocca, che
    // cosa sto guardando, che cosa è acceso, com'è messa la macchina. Un blocco
    // vuoto sparisce con il suo filo.
    h(
      'div',
      { class: 'barra-stato__gruppo' },
      h('div', { class: 'barra-stato__blocco' }, vociDelRegistro(), vociDelLavoro()),
      h('div', { class: 'barra-stato__blocco' }, filtroDelCorso(), filtroDelPeriodo()),
    ),
    h(
      'div',
      { class: 'barra-stato__gruppo barra-stato__gruppo--coda' },
      h('div', { class: 'barra-stato__blocco' }, vociDeiModelli()),
      h('div', { class: 'barra-stato__blocco' }, vociDellAggiornamento(), vociDellaPosta(), vociDellAnno()),
    ),
  )
}
