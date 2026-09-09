// Avvio del pannello.
//
// Il giro è corto: si ascolta l'host, si chiede lo stato, e da lì in poi ogni
// messaggio o interazione passa da `disegna`. Il ridisegno rifà l'intera vista
// — è abbastanza veloce da non accorgersene, e toglie di mezzo ogni problema di
// pezzi rimasti indietro — rimettendo il fuoco dov'era.

import './stili.css'

import { notifica } from './componenti/notifiche.js'
import { rimpiazza, ricordaFuoco, ripristinaFuoco } from './dom.js'
import { guscio } from './guscio.js'
import { ascolta, invia, iscrivitiAttesa } from './ponte.js'
import type { Iso } from '../dominio/modelli.js'
import type { MessaggioNavigazione, Vista } from '../protocollo.js'
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
  semestrePerData,
  stato,
} from './stato.js'
import {
  moduloAvvio,
  moduloClasse,
  moduloCorso,
  moduloLezione,
} from './moduli.js'

const radice = document.getElementById('radice')

/** Evita di ridisegnare tre volte quando arrivano tre messaggi di fila. */
let disegnoProgrammato = false

function disegna (): void {
  if (!radice || disegnoProgrammato) return
  disegnoProgrammato = true
  requestAnimationFrame(() => {
    disegnoProgrammato = false
    const fuoco = ricordaFuoco()
    rimpiazza(radice, guscio())
    ripristinaFuoco(fuoco)
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
      // quell'ora: se il filtro acceso è di un'altra classe, l'ora finirebbe
      // nascosta proprio mentre la si apre. Si sposta sulla sua, non si spegne:
      // il calendario di una classe sola è quel che si stava guardando.
      const classe = classeDelCorsoId(lezione?.corsoId ?? null)
      if (classe && stato.filtroClasseAgendaId && stato.filtroClasseAgendaId !== classe.id) {
        modifiche.filtroClasseAgendaId = classe.id
      }
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
    case 'stato':
      aggiorna({
        registro: messaggio.registro,
        avvisi: messaggio.avvisi,
        radiceDati: messaggio.radiceDati,
        ocrAttivo: messaggio.ocrAttivo,
        posta: messaggio.posta,
        caricato: true,
      })
      // I semestri arrivano con i dati: solo adesso si può sapere in quale
      // cade oggi, ed è il periodo su cui si vogliono i conti aprendo.
      allineaSemestre()
      // E dopo di lui quel che era stato chiesto a pannello chiuso: il
      // semestre di una prova di novembre deve vincere su quello di oggi.
      if (navigazioneInAttesa) {
        const chiesta = navigazioneInAttesa
        navigazioneInAttesa = null
        eseguiNavigazione(chiesta)
      }
      break

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
    case 'proiezione.stato':
      aggiorna({
        proiezione: { aperta: messaggio.aperta, impostazioni: messaggio.impostazioni },
      })
      break

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

// L'orologio: da qui in poi le viste sanno che ore sono, e un'ora che finisce
// smette da sola di essere «in corso» senza che nessuno tocchi niente.
avviaOrologio()

// La rete: la barra di stato lo dice quando manca, ed è quel che si vuole
// sapere prima di far partire un giro di comunicazioni.
avviaRete()

// La prima richiesta è anche il segnale all'host che il webview è vivo.
void invia({ tipo: 'stato.leggi' })
disegna()
