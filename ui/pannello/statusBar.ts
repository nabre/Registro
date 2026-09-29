// La barra in fondo: che cosa manca e com'è messa la macchina. A sinistra quel
// che chiede qualcosa (l'ora da compilare, le pendenze), come pulsanti; a destra
// lo stato della macchina con le sole icone (assistente, lettura delle
// scansioni, rete, posta, anno), frase intera nel titolo, e per ultima la
// versione, scritta. Una
// voce che non ha niente da dire non compare: una barra sempre uguale smette
// di essere letta.

import { formattaData } from '../../core/dominio/dates.js'
import { icona, type NomeIcona } from './components/icons.js'
import { tendinaAperta } from './components/menu.js'
import { controllaDallaBarra, statoDegliAggiornamenti } from './views/settings/updates.js'
import { h, type Figlio } from './dom.js'
import { FUOCO_ANNO, menuDeiRegistri } from './commandBar.js'
import { isola } from './isole.js'
import { apriLezione } from './pages.js'
import {
  annoCorrente,
  nomeClasseDiLezione,
  oraDaFare,
  pendenzeDellaBarra,
  stato,
  vai,
} from './state.js'
import { testi } from './statusBar.testi.js'

/** Il tono di una voce: decide il colore del puntino e nient'altro. */
type Tono = 'quiete' | 'informativo' | 'positivo' | 'attenzione' | 'negativo'

interface Voce {
  /** Senza, la voce è solo testo: la versione quando non ha niente da dire. */
  simbolo?: NomeIcona
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
    v.simbolo ? icona(v.simbolo, 'icona--minuta') : null,
    h('span', { class: 'barra-stato__testo' }, v.testo),
    v.fuoco ? icona('giu', 'icona--minuta barra-stato__freccia') : null,
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

// --------------------------------------------------------------- il registro

/** «oggi», o il giorno scritto: quel che si direbbe a voce. */
function quando (data: string): string {
  if (data === stato.adessoData) return testi().oggi
  return formattaData(data, 'giorno')
}

function vociDelRegistro (): Figlio[] {
  // Sulle ore in agenda e nel periodo scelto: il conto è `oraDaFare`, lo stesso
  // del comando «Ora da compilare».
  const trovata = oraDaFare()
  const t = testi()

  if (!trovata) {
    return [
      voce({
        simbolo: 'lezione',
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
      simbolo: manca ? 'avviso' : 'lezione',
      testo: manca
        ? t.daCompilare(classe, quando(lezione.data))
        : t.prossima(classe, quando(lezione.data), inizio),
      titolo: manca
        ? t.daCompilareTitolo(formattaData(lezione.data, 'lungo'))
        : t.prossimaTitolo(formattaData(lezione.data, 'lungo'), inizio),
      tono: manca ? 'attenzione' : 'quiete',
      al: () => apriLezione(lezione.id),
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
        al: () => { vai({ pagina: 'pagina.pendenze' }) },
      }),
    )
  }

  // La lettura delle scansioni, in un'isola sua: avanza a ogni pagina letta e
  // `main.ts` rifà solo lei, non la pagina. `display: contents` perché la voce
  // resti un figlio della riga, come le altre.
  voci.push(isola('barra-stato', voceDellaLettura, { style: 'display: contents' }))

  return voci
}

/** «legge 3/12»: solo mentre la lettura delle scansioni lavora. */
function voceDellaLettura (): Figlio {
  const lavoro = stato.lavoro
  if (lavoro.totale <= 0) return null
  const t = testi()
  return voce({
    simbolo: 'orologio',
    testo: t.legge(lavoro.fatte + 1, lavoro.totale),
    // `.etichetta`: `corrente` è un oggetto (smistamento, numero, etichetta).
    titolo: lavoro.corrente ? t.staLeggendo(lavoro.corrente.etichetta) : t.staLeggendoTutto,
    tono: 'quiete',
  })
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
        al: () => { vai({ pagina: 'pagina.impostazioni' }) },
      }),
    ]
  }

  return [
    voce({
      simbolo: 'posta',
      testo: t.bozzeEml,
      titolo: t.bozzeEmlTitolo,
      tono: 'quiete',
      al: () => { vai({ pagina: 'pagina.impostazioni' }) },
    }),
  ]
}

/**
 * La versione che gira, ultima a destra e sempre scritta. Premuta, controlla
 * se ce n'è una nuova; quando c'è (disponibile, in arrivo, pronta) prende
 * l'icona del tono e porta alla sezione. Le parole sono quelle del racconto
 * (`environment/updates.ts`).
 */
function vociDellaVersione (): Figlio[] {
  const s = statoDegliAggiornamenti()
  if (!s) return []
  const t = testi()
  const scritta = t.numeroVersione(s.versione)

  // Senza notizia il clic controlla subito; mentre controlla, l'icona lo dice.
  if (!s.racconto.notizia) {
    const inCorso = s.fase === 'controllo'
    return [
      voce({
        ...(inCorso ? { simbolo: 'ricarica' as const } : {}),
        testo: scritta,
        titolo: inCorso ? s.racconto.frase : t.versioneInUso(s.racconto.frase, s.versione),
        tono: inCorso ? 'informativo' : 'quiete',
        al: () => { void controllaDallaBarra() },
      }),
    ]
  }
  const { frase, tono } = s.racconto

  return [
    voce({
      simbolo: 'ricarica',
      testo: scritta,
      titolo: t.versione(frase, s.versione),
      // Il tono è quello del racconto: una versione nuova non è un guasto.
      tono,
      al: () => { vai({ pagina: 'pagina.impostazioni', scheda: 'programma#aggiornamenti' }) },
    }),
  ]
}

// -------------------------------------------------------------- i modelli

/** Il nome di un file .gguf senza cartella né estensione: quel che se ne dice. */
function nomeDelModello (percorso: string): string {
  return (percorso.split(/[\\/]/).pop() ?? percorso).replace(/\.gguf$/i, '')
}

/**
 * Lo stato di un modello locale (assistente o lettura delle scansioni), da
 * leggere: non è un interruttore, si accende e si spegne nelle impostazioni.
 * Il clic porta sempre a «Assistente e modelli».
 *
 *   acceso         — verde.
 *   spento         — sbiadito.
 *   senza modello  — sbiadito, «non si accende» (`VoceProgramma.bloccata`, da
 *                    `richiede` nel manifesto). Con `soloConModello`
 *                    (l'assistente) la voce invece non c'è.
 *   non pronto     — acceso ma non può lavorare (programma o file che mancano,
 *                    `VoceProgramma.nonPronta`): arancione, il motivo nel titolo.
 */
function statoDelModello (opzioni: {
  simbolo: NomeIcona
  nome: string
  chiaveAttivo: string
  chiaveModello: string
  soloConModello?: boolean
}): Figlio {
  const interruttore = stato.programma.find((v) => v.chiave === opzioni.chiaveAttivo)
  // Prima che arrivino le impostazioni, niente: uno «spento» non ancora vero no.
  if (!interruttore) return null

  const acceso = interruttore.valore === true
  const bloccata = interruttore.bloccata
  const file = stato.programma.find((v) => v.chiave === opzioni.chiaveModello)?.valore
  const modello = typeof file === 'string' && file.trim() !== '' ? nomeDelModello(file) : null
  if (opzioni.soloConModello && !modello) return null

  const t = testi()
  const nonPronta = acceso && bloccata === null ? interruttore.nonPronta : null
  const apri = () => { vai({ pagina: 'pagina.impostazioni', scheda: 'programma#modelli' }) }
  if (nonPronta) {
    return voce({
      simbolo: opzioni.simbolo,
      testo: t.voceNonPronta(opzioni.nome),
      titolo: t.nonPronto(opzioni.nome, nonPronta),
      tono: 'attenzione',
      al: apri,
    })
  }
  const titolo = bloccata !== null
    ? t.spentoBloccato(opzioni.nome, bloccata)
    : t.statoModello(opzioni.nome, acceso) + (modello ? t.modello(modello) : '') + t.apriModelli

  return voce({
    simbolo: opzioni.simbolo,
    // «Non si accende» e non «senza modello»: alla lettura può mancare solo il
    // proiettore; il perché lo dice il titolo.
    testo: t.voceModello(opzioni.nome, bloccata !== null, acceso),
    titolo,
    tono: acceso ? 'positivo' : 'quiete',
    al: apri,
  })
}

function vociDeiModelli (): Figlio[] {
  const t = testi()
  return [
    statoDelModello({
      simbolo: 'bot',
      nome: t.assistente,
      chiaveAttivo: 'registroDocenti.assistente.attivo',
      chiaveModello: 'registroDocenti.assistente.modello',
      soloConModello: true,
    }),
    statoDelModello({
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
      dataset: { telaio: 'barra-stato' },
    },
    // Blocchi separati da un filo, uno per domanda: che cosa mi tocca, che cosa
    // è acceso, com'è messa la macchina, quale versione gira. Un blocco vuoto
    // sparisce con il suo filo.
    h(
      'div',
      { class: 'barra-stato__gruppo' },
      h('div', { class: 'barra-stato__blocco' }, vociDelRegistro(), vociDelLavoro()),
    ),
    h(
      'div',
      { class: 'barra-stato__gruppo barra-stato__gruppo--coda' },
      h('div', { class: 'barra-stato__blocco' }, vociDeiModelli()),
      h('div', { class: 'barra-stato__blocco' }, vociDellaPosta(), vociDellAnno()),
      h('div', { class: 'barra-stato__blocco barra-stato__blocco--versione' }, vociDellaVersione()),
    ),
  )
}
