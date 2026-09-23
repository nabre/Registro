// Avvio del pannello.
//
// Il giro è corto: si ascolta l'host, si chiede lo stato, e da lì in poi ogni
// messaggio o interazione passa da `disegna`. Il ridisegno rifà l'intera vista
// — è abbastanza veloce da non accorgersene, e toglie di mezzo ogni problema di
// pezzi rimasti indietro — rimettendo il fuoco dov'era.

import './styles.css'

import { installaScorciatoie } from './commands.js'
import { notifica } from './components/notifications.js'
import { apriPalette } from './components/palette.js'
import {
  rimpiazza,
  ricordaFuoco,
  ricordaScorrimenti,
  ripristinaFuoco,
  ripristinaScorrimenti,
} from './dom.js'
import { guscio } from './shell.js'
import { vedutaCambiata } from './viewpoint.js'
import { ascolta, invia, iscrivitiAttesa } from './bridge.js'
import type { Iso } from '../domain/models.js'
import type { MessaggioNavigazione, Vista } from '../protocol.js'
import {
  aggiorna,
  allineaSemestre,
  avviaOrologio,
  avviaRete,
  classeDelCorsoId,
  iscriviti,
  lezionePerId,
  miraProiezione,
  pianoPerId,
  riconvalidaRicordati,
  semestrePerData,
  stato,
} from './state.js'
import { chiudiTutte } from './components/modal.js'
import { scordaEditorDelPiano } from './views/plans.js'
import { scordaDestinatariMandati } from './views/classTeacher.js'
import {
  moduloAvvio,
  moduloClasse,
  moduloCorso,
  moduloLezione,
} from './forms.js'

const radice = document.getElementById('radice')

/** Evita di ridisegnare tre volte quando arrivano tre messaggi di fila. */
let disegnoProgrammato = false

function disegna (): void {
  if (!radice || disegnoProgrammato) return
  disegnoProgrammato = true
  requestAnimationFrame(() => {
    disegnoProgrammato = false
    // Le due cose che un ridisegno rovina e che non stanno nello stato: dov'era
    // il cursore, e dov'era arrivato l'occhio. La barra laterale aveva già il
    // suo salvataggio scritto a mano qui; adesso passa dallo stesso meccanismo
    // di tutte le altre scatole che scorrono — `data-scorrimento` sull'elemento
    // — invece di essere l'unica che qualcuno si era ricordato di salvare.
    const fuoco = ricordaFuoco()
    const scorrimenti = ricordaScorrimenti()
    rimpiazza(radice, guscio())
    ripristinaFuoco(fuoco)
    ripristinaScorrimenti(scorrimenti)
  })
}

/**
 * Tutto quel che va messo a posto per far comparire un elemento sullo schermo.
 *
 * Aprire una vista e scriverci dentro l'id non basta, e il motivo è che le
 * viste filtrano: la griglia dei voti mostra un corso alla volta e un semestre
 * alla volta, il calendario un giorno, gli elenchi una classe. Cliccando una
 * verifica di novembre nell'albero si arrivava alla pagina Valutazioni con il
 * corso sbagliato e il semestre in corso — e di quella verifica non c'era
 * traccia. L'id era giusto, ma nessuno lo poteva vedere.
 *
 * Qui si risale la catena a cui quell'elemento appartiene — la prova sa il
 * corso, il corso sa la classe, la data sa il semestre — e si sistemano tutti i
 * filtri insieme, in un colpo solo. Vale per l'albero della barra laterale, per
 * i comandi della palette e per qualunque altra cosa mandi un `naviga`.
 */
function contestoDellElemento (
  vista: Vista,
  elementoId: string,
): Parameters<typeof aggiorna>[0] {
  const modifiche: Parameters<typeof aggiorna>[0] = {}

  /** Il semestre in cui cade una data, e il giorno stesso. */
  const alGiorno = (data: Iso | undefined) => {
    if (!data) return
    modifiche.data = data
    // `null` è «l'anno intero», che è una scelta legittima: si tocca solo se
    // la data cade davvero in un semestre.
    const semestre = semestrePerData(data)
    if (semestre) modifiche.semestreId = semestre.id
  }

  /** La classe di un corso: è il filtro di quasi tutte le pagine. */
  const alCorso = (corsoId: string | null | undefined) => {
    if (!corsoId) return
    modifiche.corsoId = corsoId
    const classe = classeDelCorsoId(corsoId)
    if (classe) modifiche.filtroClasseId = classe.id
  }

  switch (vista) {
    case 'lezione': {
      modifiche.lezioneId = elementoId
      const lezione = lezionePerId(elementoId)
      alCorso(lezione?.corsoId)
      alGiorno(lezione?.data)
      break
    }
    case 'calendario': {
      modifiche.lezioneId = elementoId
      const lezione = lezionePerId(elementoId)
      alGiorno(lezione?.data)
      // Il calendario ha un filtro suo, e chi arriva da fuori chiede di vedere
      // quell'ora: se il filtro acceso è di un altro corso, l'ora finirebbe
      // nascosta proprio mentre la si apre. Si sposta sul suo, non si spegne:
      // il calendario di un corso solo è quel che si stava guardando.
      if (
        lezione &&
        stato.filtroCorsoAgendaId &&
        stato.filtroCorsoAgendaId !== lezione.corsoId
      ) {
        modifiche.filtroCorsoAgendaId = lezione.corsoId
      }
      break
    }
    // La pagina Todo ha una classe scelta sua: chi arriva dal widget sul
    // desktop chiede quella, e senza si aprirebbe sull'elenco di tutte.
    case 'todo': {
      modifiche.classeTodoId = elementoId
      modifiche.filtroClasseId = elementoId
      break
    }
    case 'classi':
    case 'docenteClasse': {
      modifiche.classeId = elementoId
      modifiche.filtroClasseId = elementoId
      break
    }
    case 'allievo': {
      modifiche.allievoId = elementoId
      // La scheda di un allievo vive dentro la sua classe: senza, si apre su
      // un nome che l'elenco accanto non contiene.
      const classe = stato.registro.classi.find((c) =>
        c.allievi.some((a) => a.id === elementoId),
      )
      if (classe) {
        modifiche.classeId = classe.id
        modifiche.filtroClasseId = classe.id
      }
      break
    }
    case 'corsi': {
      alCorso(elementoId)
      break
    }
    case 'piani': {
      modifiche.pianoId = elementoId
      const piano = pianoPerId(elementoId)
      alCorso(piano?.corsoId)
      break
    }
    case 'valutazioni': {
      modifiche.valutazioneId = elementoId
      const momento = stato.registro.valutazioni.find((v) => v.id === elementoId)
      alCorso(momento?.corsoId)
      // Il semestre, non il giorno: la pagina non ha un calendario, ma
      // nasconde le prove degli altri periodi.
      if (momento) {
        const semestre = semestrePerData(momento.data)
        if (semestre) modifiche.semestreId = semestre.id
      }
      break
    }
    default:
      break
  }

  return modifiche
}

/** La navigazione arrivata prima dei dati: si esegue appena arrivano. */
let navigazioneInAttesa: MessaggioNavigazione | null = null

/**
 * Porta la pagina dove la navigazione chiede, filtri compresi.
 *
 * I comandi della palette possono chiedere di aprire una vista e insieme di
 * cominciare subito una creazione: «nuova lezione» deve arrivare al modulo,
 * non solo al calendario.
 */
function eseguiNavigazione (messaggio: MessaggioNavigazione): void {
  const modifiche: Parameters<typeof aggiorna>[0] = { vista: messaggio.vista }
  // L'elemento porta con sé il suo contesto — corso, classe, semestre,
  // giorno — e i filtri si sistemano prima della data chiesta a parte, che
  // se c'è comanda: «vai a oggi» è una richiesta esplicita.
  if (messaggio.elementoId) {
    Object.assign(modifiche, contestoDellElemento(messaggio.vista, messaggio.elementoId))
  }
  if (messaggio.data) modifiche.data = messaggio.data
  aggiorna(modifiche)

  // L'avvio guidato vince sugli altri: chi lo chiede ha il registro vuoto,
  // e aprirgli il modulo di una lezione non gli servirebbe a niente.
  if (messaggio.avvio) {
    moduloAvvio()
    return
  }
  if (!messaggio.nuovo) return

  if (messaggio.vista === 'calendario') moduloLezione({ data: messaggio.data ?? stato.data })
  if (messaggio.vista === 'classi') moduloClasse()
  if (messaggio.vista === 'corsi') moduloCorso()
  // Un piano è di un corso e di un'ora: uno fatto da qui non saprebbe di
  // quale, e resterebbe sciolto in un elenco dove non lo cerca nessuno.
  if (messaggio.vista === 'piani') {
    notifica(
      'Un piano si prepara dall’ora che lo aspetta: scegline una senza scaletta nell’elenco.',
      'info',
    )
  }
  // Sulla vista Valutazioni non si crea niente: un momento nasce dalla tappa
  // del piano, dentro l'ora in cui la prova si è fatta.
  if (messaggio.vista === 'valutazioni') {
    notifica(
      'Un momento di valutazione nasce dalla tappa del piano, dentro la lezione in cui si fa la prova.',
      'info',
    )
  }
}

iscriviti(disegna)
// Anche il canale fa ridisegnare: la prima richiesta in volo accende il filo
// di lavoro sul telaio, l’ultima che torna lo spegne.
iscrivitiAttesa(disegna)

ascolta((messaggio) => {
  switch (messaggio.tipo) {
    case 'stato': {
      // Cambiare documento non ricarica la pagina: quel che la pagina si tiene
      // in mano per conto suo resterebbe dell'anno di prima. Un modulo aperto,
      // salvato adesso, scriverebbe una classe dell'anno scorso dentro il
      // documento nuovo; l'editor del piano tenuto da parte farebbe lo stesso
      // con una scaletta. Si lascia andare tutto prima che arrivino i dati.
      if (stato.caricato && messaggio.documenti.corrente !== stato.documenti.corrente) {
        chiudiTutte()
        scordaEditorDelPiano()
        scordaDestinatariMandati()
      }
      aggiorna({
        registro: messaggio.registro,
        avvisi: messaggio.avvisi,
        radiceDati: messaggio.radiceDati,
        // Il pannello la manda a ogni stato, e fin qui nessuno la raccoglieva:
        // restava null per sempre, `impostaCaratteri` non partiva mai e le
        // miniature dei PDF uscivano con i caratteri di ripiego.
        radiceApp: messaggio.radiceApp,
        documenti: messaggio.documenti,
        esportati: messaggio.esportati,
        archiviati: messaggio.archiviati,
        composizioni: messaggio.composizioni,
        modelli: messaggio.modelli,
        ocrAttivo: messaggio.ocrAttivo,
        programma: messaggio.programma,
        posta: messaggio.posta,
        caricato: true,
      })
      // I semestri arrivano con i dati: solo adesso si può sapere in quale
      // cade oggi, ed è il periodo su cui si vogliono i conti aprendo.
      allineaSemestre()
      riconvalidaRicordati()
      // E dopo di lui quel che era stato chiesto a pannello chiuso: il
      // semestre di una prova di novembre deve vincere su quello di oggi.
      if (navigazioneInAttesa) {
        const chiesta = navigazioneInAttesa
        navigazioneInAttesa = null
        eseguiNavigazione(chiesta)
      }
      break
    }

    // L'avanzamento della lettura delle scansioni: arriva a ogni pagina, e
    // tocca solo la scheda «Da smistare».
    case 'lavoro':
      aggiorna({
        lavoro: {
          corrente: messaggio.corrente,
          fatte: messaggio.fatte,
          totale: messaggio.totale,
          coda: messaggio.coda,
        },
      })
      break

    // Com'è messo lo schermo per la classe: se è acceso e che cosa mostra. Lo
    // dice l'host perché è l'unico a saperlo — quella finestra si può chiudere
    // dalla sua scheda, e da qui non ce ne accorgeremmo.
    case 'proiezione.stato': {
      // La scheda dei comandi dello schermo si apre da sé quando lo schermo si
      // accende: chi ha appena premuto «Proietta» ha in mano una domanda sola —
      // che cosa faccio vedere — e la risposta è in quella riga. Spegnendo
      // torna alla pagina, che è l'unica cosa rimasta da comandare.
      const cambia = messaggio.aperta !== stato.proiezione.aperta
      aggiorna({
        proiezione: { aperta: messaggio.aperta, impostazioni: messaggio.impostazioni },
        ...(cambia ? { schedaComandi: messaggio.aperta ? 'schermo' : 'pagina' } : {}),
      })
      break
    }

    case 'notifica':
      notifica(
        messaggio.testo,
        messaggio.livello === 'errore' ? 'errore' : messaggio.livello === 'avviso' ? 'avviso' : 'info',
      )
      break

    case 'naviga': {
      // Cliccando nell'albero a pannello chiuso, la richiesta di navigare
      // arriva prima del registro: gli id non si possono ancora risolvere, e
      // il contesto verrebbe fuori vuoto. Si tiene da parte e si esegue appena
      // i dati ci sono — che è il momento in cui la si può eseguire davvero.
      if (!stato.caricato) {
        navigazioneInAttesa = messaggio
        break
      }
      eseguiNavigazione(messaggio)
      break
    }

    default:
      break
  }
})

/**
 * Lo schermo per la classe segue il registro.
 *
 * Si manda dove si sta guardando a ogni cambio di stato, e non a ogni gesto
 * dentro la vista: l'host confronta con la mira di prima e ricalcola solo se è
 * cambiata davvero. Senza questo giro, ogni ora aperta chiederebbe un secondo
 * gesto per portarla sul proiettore — e dopo tre lezioni lo schermo grande
 * mostrerebbe l'ora sbagliata.
 */
iscriviti(() => {
  if (!stato.caricato) return
  void invia({ tipo: 'proiezione.mira', mira: miraProiezione() })
})

/**
 * L'assistente segue il registro.
 *
 * Lo stesso giro della mira della proiezione, per un altro schermo: là si dice
 * a un proiettore che cosa mostrare, qui si dice a un modello di che cosa si
 * sta parlando. Senza, una domanda che dà per scontato il contesto — e sono
 * tutte — partiva senza di quello: il modello sceglieva un corso plausibile fra
 * quelli che gli tornavano da un elenco e rispondeva su quello.
 *
 * Si manda solo quando cambia, e qui la differenza con la mira conta: quella
 * ha cinque riferimenti e la confronta l'host, questa è annidata e cambierebbe
 * a ogni tasto battuto in un campo — una scrittura in coda, con la sua riga di
 * giornale, per ogni lettera di una nota.
 */
iscriviti(() => {
  if (!stato.caricato) return
  const cambiata = vedutaCambiata()
  if (cambiata) void invia({ tipo: 'assistente.contesto', contesto: cambiata.contesto })
})

// I tasti: quel che la barra multifunzione scrive accanto ai suoi comandi da
// qui in poi risponde davvero, e con lui Ctrl+B per mostrare e nascondere le
// azioni della barra — «dammi tutto lo schermo» — e Ctrl+K per la palette. Un
// ascoltatore solo per tutta la finestra, e l'elenco è quello dei comandi: non
// c'è una seconda tabella da tenere allineata.
//
// Ctrl+B non tocca la barra laterale, che si apre dal suo pulsante: dentro un
// campo di testo Ctrl+B è il grassetto di chi scrive, e `commands.ts` lo lascia
// passare proprio per quello.
installaScorciatoie({
  comandi: () => aggiorna({ azioniNascoste: !stato.azioniNascoste }),
  palette: () => apriPalette(),
})

/**
 * Un file lasciato cadere fuori bersaglio non porta via il registro.
 *
 * Senza questo divieto, un PDF lasciato un centimetro sotto il riquadro dello
 * smistamento fa quel che fa un browser con un file: lo apre al posto della
 * pagina. Il registro sparisce, il lettore di PDF prende tutta la finestra, e
 * l'unico modo di tornare indietro è riaprire il pannello — con in mezzo il
 * sospetto che il file trascinato abbia rotto qualcosa.
 *
 * Va fermato su `dragover` e su `drop` tutti e due: il primo è quel che dice al
 * sistema «qui si può lasciare», e senza il secondo la navigazione parte lo
 * stesso. Le zone che i file li accettano davvero fermano l'evento prima che
 * arrivi qui.
 */
for (const nome of ['dragover', 'drop'] as const) {
  window.addEventListener(nome, (evento: DragEvent) => evento.preventDefault())
}

// L'orologio: da qui in poi le viste sanno che ore sono, e un'ora che finisce
// smette da sola di essere «in corso» senza che nessuno tocchi niente.
avviaOrologio()

// La rete: la barra di stato lo dice quando manca, ed è quel che si vuole
// sapere prima di far partire un giro di comunicazioni.
avviaRete()

// La prima richiesta è anche il segnale all'host che il webview è vivo.
void invia({ tipo: 'stato.leggi' })
disegna()
