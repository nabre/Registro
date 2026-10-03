// Avvio del pannello: si ascolta l'host, si chiede lo stato, e ogni messaggio o
// interazione passa da `disegna`, che rifà l'intera vista rimettendo fuoco e
// scorrimento dov'erano.

// Per prima: la lingua della pagina, prima che qualunque altro modulo si carichi.
import '#core/i18n/page.js'
import './styles.css'

import { comandoPerId, eseguiComando } from './commands.js'
import { installaScorciatoie } from './shortcuts.js'
import { azzeraStoria, conGliScorrimentiDelRitorno, installaCammino } from './history.js'
import { vaiAOggi } from './calendarNavigation.js'
import { notifica } from './components/notifications.js'
import { apriPalette } from './components/palette.js'
import {
  aggiornaElemento,
  ricordaFuoco,
  ricordaScorrimenti,
  ripristinaFuoco,
  ripristinaScorrimenti,
} from './dom.js'
import { guscio, mostraFiloDiLavoro } from './shell.js'
import { testi } from './main.testi.js'
import { vedutaCambiata } from './viewpoint.js'
import { ascolta, chiediStatoIntero, invia, iscrivitiAttesa } from './bridge.js'
import { oggi } from '#core/dominio/dates.js'
import type {
  MessaggioDifferenze,
  MessaggioNavigazione,
  MessaggioStato,
  MessaggioVersoWebview,
} from '#contract/protocol.js'
import { SeguitoDelRegistro } from './statePatches.js'
import { isolaPresente, ridisegnaIsola } from './islands.js'
import { chiaveDelPosto, postoDaVista, schedaValida } from './place.js'
import {
  aggiorna,
  allineaSemestre,
  avviaOrologio,
  avviaRete,
  inBlocco,
  iscriviti,
  miraProiezione,
  ridisegna,
  riconvalidaRicordati,
  ritrovaDocumento,
  stato,
  vai,
} from './state.js'
import { chiudiTutte } from './components/modal.js'
import { scordaEditorDelPiano } from './views/plans.js'
import { scordaDestinatariMandati } from './views/classTeacher.js'
import { avviaAggiornamenti } from './views/settings/updates.js'
import { apriInformazioniDocumento } from './forms/documentInfo.js'
import { moduloAnno } from './forms/year.js'
import { moduloProgetto } from './forms/project.js'
import { apriProgetto } from './views/projects/links.js'
import {
  moduloClasse,
  moduloCorso,
  moduloImportaRegistro,
} from './forms.js'

const radice = document.getElementById('radice')

/** Evita di ridisegnare tre volte quando arrivano tre messaggi di fila. */
let disegnoProgrammato = false

/** Quanto dura l'entrata di una pagina: `--durata` in `styles/metrics.css`. */
const DURATA_ENTRATA = 160

/** La pagina del disegno di prima: `null` finché non se n'è disegnata una. */
let paginaDisegnata: string | null = null
/** Quando è entrata la pagina di adesso, in `performance.now()`. */
let entrataDa = -Infinity
/**
 * Il `main.contenuto` a cui si è data l'entrata e il suo ritardo. Il nodo resta
 * fra due disegni della stessa pagina (`aggiornaElemento`): gli si rimette lo
 * stesso ritardo, perché cambiarlo a animazione in corso la farebbe saltare.
 */
let entrataSu: { nodo: HTMLElement, ritardo: string } | null = null

/**
 * Quale pagina si sta guardando, per l'entrata: il posto senza soggetto. Non
 * persona né ora: cambiarle è lavoro dentro la stessa pagina, e farla
 * rientrare sarebbe un lampeggio.
 */
function chiaveDiEntrata (): string {
  return chiaveDelPosto(stato.posto, 'pagina')
}

/**
 * Segna la pagina appena disegnata come «in entrata» (`data-entrata`, animato da
 * `styles/motion.css`). Un'animazione fissa ripartirebbe a ogni ridisegno; un
 * ridisegno a metà entrata riprende col ritardo negativo del tempo già passato.
 * Il primo disegno non entra.
 */
function segnaEntrata (): void {
  if (!stato.caricato) return
  const contenuto = radice?.querySelector<HTMLElement>('main.contenuto')
  if (!contenuto) return
  const chiave = chiaveDiEntrata()
  const adesso = performance.now()
  const cambiata = paginaDisegnata !== null && chiave !== paginaDisegnata
  if (cambiata) entrataDa = adesso
  paginaDisegnata = chiave
  const passato = adesso - entrataDa
  if (passato >= DURATA_ENTRATA || !cambiata) {
    delete contenuto.dataset.entrata
    return
  }
  contenuto.dataset.entrata = ''
  if (entrataSu?.nodo !== contenuto) {
    // testo-fisso: un valore CSS
    entrataSu = { nodo: contenuto, ritardo: `${-Math.round(passato)}ms` }
  }
  contenuto.style.setProperty('--entrata-passata', entrataSu.ritardo)
}

function disegna (): void {
  if (!radice || disegnoProgrammato) return
  disegnoProgrammato = true
  requestAnimationFrame(() => {
    disegnoProgrammato = false
    // Fuoco e scorrimento non stanno nello stato: si salvano e si rimettono (ogni
    // scatola con `data-scorrimento`). Dopo Alt+← si aggiunge lo scorrimento del
    // posto a cui si torna (`history.ts`). Si fotografano dopo aver costruito la
    // vista, che può durare centinaia di millisecondi: intanto la pagina scorre,
    // e una foto presa prima la riporterebbe indietro.
    const t0 = performance.now()
    const nuovo = guscio()
    const fuoco = ricordaFuoco()
    const scorrimenti = conGliScorrimentiDelRitorno(ricordaScorrimenti())
    aggiornaElemento(radice, nuovo)
    segnaEntrata()
    ripristinaFuoco(fuoco)
    ripristinaScorrimenti(scorrimenti)
    const durata = performance.now() - t0
    const inSviluppo = typeof process === 'undefined' ||
      !process.env.NODE_ENV ||
      process.env.NODE_ENV === 'development'
    if (inSviluppo && durata > 16) {
      // testo-fisso: diagnostica interna di sviluppo per le viste dense
      console.warn(`[ridisegno] vista '${stato.vista}' lenta: ${durata.toFixed(1)} ms (> 16 ms)`)
    }
  })
}

/** La navigazione arrivata prima dei dati: si esegue appena arrivano. */
let navigazioneInAttesa: MessaggioNavigazione | null = null

/**
 * Porta la pagina dove la navigazione chiede e può aprire subito una
 * creazione («nuova lezione» arriva al modulo). I filtri che servono perché
 * l'elemento compaia (corso, classe, semestre, giorno) li mette `completa`,
 * dalla catena dell'elemento: vale per l'albero, la palette e ogni `naviga`.
 */
function eseguiNavigazione (messaggio: MessaggioNavigazione): void {
  // Gli acceleratori del menu nativo arrivano anche con una modale aperta: come
  // per `installaScorciatoie`, lì il gesto è del modulo.
  if (document.querySelector('.modale')) {
    notifica(testi().finestraAperta, 'avviso')
    return
  }

  // Un dialogo dal menu nativo: la pagina resta quella che si guarda.
  if (messaggio.dialogo === 'informazioniDocumento') {
    apriInformazioniDocumento()
    return
  }
  if (messaggio.dialogo === 'nuovoAnno') {
    moduloAnno()
    return
  }
  // Un indirizzo dentro le impostazioni («Account e posta…»); uno che non porta
  // da nessuna parte lascia la pagina come la vuole `postoDaVista`.
  const scheda = messaggio.vista === 'impostazioni' ? schedaValida(messaggio.impostazioni) : undefined
  if (scheda) {
    vai({ pagina: 'pagina.impostazioni', scheda })
    return
  }

  // «Nuova ora» dal menu fa quel che fa il pulsante: modulo con il corso scelto,
  // sul giorno guardato (la data dell'host si ignora). Il pulsante esiste solo
  // con «Modifica» accesa, quindi prima la si accende.
  if (messaggio.nuovo && !messaggio.importa && messaggio.vista === 'calendario' && !messaggio.elementoId) {
    inBlocco(() => {
      vai({ pagina: 'pagina.calendario' })
      aggiorna({ editorCalendario: true })
    })
    const comando = comandoPerId('registro.nuovaLezione')
    if (comando) void eseguiComando(comando)
    return
  }
  // «Oggi» dal menu: anche la striscia dei mesi va riportata su oggi.
  if (
    messaggio.vista === 'calendario' &&
    messaggio.data === oggi() &&
    !messaggio.elementoId &&
    !messaggio.nuovo &&
    !messaggio.importa
  ) {
    vaiAOggi()
    return
  }

  // La data chiesta a parte comanda su quella dell'elemento.
  vai(
    postoDaVista(messaggio.vista, messaggio.elementoId, stato.registro),
    messaggio.data ? { giorno: messaggio.data } : {},
  )

  // L'importazione vince: la chiede chi ha appena creato un anno vuoto.
  if (messaggio.importa) {
    moduloImportaRegistro()
    return
  }
  if (!messaggio.nuovo) return

  if (messaggio.vista === 'classi') moduloClasse()
  if (messaggio.vista === 'corsi') moduloCorso()
  // Il progetto nasce nella biblioteca dell'anno, di nessun corso.
  if (messaggio.vista === 'progetti') moduloProgetto({ dopo: apriProgetto })
  // Un piano nasce da un'ora: da qui non saprebbe di quale.
  if (messaggio.vista === 'piani') {
    notifica(testi().pianoDallOra, 'info')
  }
  // Un momento di valutazione nasce dalla tappa del piano, nell'ora della prova.
  if (messaggio.vista === 'valutazioni') {
    notifica(testi().momentoDallaTappa, 'info')
  }
}

/**
 * Il registro della pagina, intero o a differenze, e la sua revisione.
 * Esportato per il banco delle prove (`tests/helpers/uiStartup.ts`), che mette
 * i dati senza passare dall'host e poi li fa tornare a differenze.
 */
export const seguito = new SeguitoDelRegistro(chiediStatoIntero)

/**
 * I dati dell'host: il solo punto da cui entrano. Tutto in un blocco, così
 * ascoltatori (la mira dello schermo, il contesto dell'assistente), memoria e
 * storia sentono solo la fine: i dati, il documento con il suo posto, il
 * semestre, il posto riconfermato. Un passo a metà manderebbe all'host gli id
 * dell'anno di prima. Con le differenze il registro è quello di prima con le
 * patch; se non si applicano il messaggio si lascia andare tutto, e lo stato
 * intero chiesto al suo posto porta anche il resto.
 */
function ricevoStato (messaggio: MessaggioStato | MessaggioDifferenze): void {
  const registro = messaggio.tipo === 'stato'
    ? seguito.intero(messaggio.registro, messaggio.revisione)
    : seguito.differenze(stato.registro, messaggio)
  if (!registro) return
  inBlocco(() => {
    // Cambiare documento non ricarica la pagina: modali aperte, editor del piano
    // e destinatari tenuti da parte appartengono all'anno di prima, e salvati
    // scriverebbero nel documento nuovo. Si lasciano andare prima dei dati.
    const altroDocumento =
      stato.caricato && messaggio.documenti.corrente !== stato.documenti.corrente
    if (altroDocumento) {
      chiudiTutte()
      scordaEditorDelPiano()
      scordaDestinatariMandati()
    }
    aggiorna({
      registro,
      avvisi: messaggio.avvisi,
      radiceDati: messaggio.radiceDati,
      // Serve a `impostaCaratteri` per i caratteri delle miniature dei PDF.
      radiceApp: messaggio.radiceApp,
      documenti: messaggio.documenti,
      storia: messaggio.storia,
      esportati: messaggio.esportati,
      archiviati: messaggio.archiviati,
      ocrAttivo: messaggio.ocrAttivo,
      programma: messaggio.programma,
      posta: messaggio.posta,
      // Un host di prima degli account Microsoft non lo manda.
      microsoft: messaggio.microsoft ?? { account: [] },
      caricato: true,
      // Anteprime e pagine scelte puntano a file dell'altro documento.
      ...(altroDocumento
        ? { anteprimaArchivio: null, anteprimaAssenze: null, pagineScelte: null }
        : {}),
    })
    // Il documento nuovo riapre dove lo si era lasciato (o sulla Dashboard), e
    // la fila di Alt+← riparte: i posti di prima sono di un altro anno.
    if (ritrovaDocumento() === 'nuovo') azzeraStoria()
    // I semestri arrivano con i dati: solo adesso si sa in quale cade oggi.
    allineaSemestre()
    // Poi il posto sui dati nuovi (`completa`), e le scelte che non ci sono più.
    riconvalidaRicordati()
    // Poi la navigazione chiesta a pannello chiuso: il semestre di una prova di
    // novembre vince su quello di oggi.
    if (navigazioneInAttesa) {
      const chiesta = navigazioneInAttesa
      navigazioneInAttesa = null
      eseguiNavigazione(chiesta)
    }
  })
}

type MessaggioLavoro = Extract<MessaggioVersoWebview, { tipo: 'lavoro' }>

/**
 * Le isole che mostrano la lettura delle scansioni: la coda nello
 * smistamento e nello sfoglio, e la voce della barra di stato.
 */
// testo-fisso: chiavi di isole, non si leggono
const ISOLE_DEL_LAVORO = ['coda-lettura', 'barra-stato']

/** I PDF che la lettura tocca: quello in corso e quelli in coda. */
function pdfAlLavoro (lavoro: Pick<MessaggioLavoro, 'corrente' | 'coda'>): string {
  const ids = new Set(lavoro.coda.map((voce) => voce.smistamentoId))
  if (lavoro.corrente) ids.add(lavoro.corrente.smistamentoId)
  return [...ids].sort().join('|')
}

/**
 * Una pagina letta cambia solo chi mostra la coda: si scrive nello stato
 * senza avvisare e si rifanno le sue isole, non tutta la pagina a ogni
 * pagina letta (un trascinamento nello sfoglio si interrompeva). Senza isole
 * in pagina, o quando un PDF entra o esce dalla lettura (i suoi comandi
 * cambiano), si ridisegna tutto.
 */
function avanzaLavoro (messaggio: MessaggioLavoro): void {
  const altriPdf = pdfAlLavoro(messaggio) !== pdfAlLavoro(stato.lavoro)
  // Un oggetto nuovo, non ritocchi: chi confronta con `Object.is` vede il cambio.
  stato.lavoro = {
    corrente: messaggio.corrente,
    fatte: messaggio.fatte,
    totale: messaggio.totale,
    coda: messaggio.coda,
  }
  const presenti = ISOLE_DEL_LAVORO.filter(isolaPresente)
  if (altriPdf || presenti.length === 0) {
    ridisegna()
    return
  }
  for (const chiave of presenti) ridisegnaIsola(chiave)
}

iscriviti(disegna)
// La fila dei posti visitati (Alt+←/→), che fornisce anche gli scorrimenti del ritorno.
installaCammino()
// Il filo di lavoro si accende e si spegne da sé, fuori dal disegno (`shell.ts`).
iscrivitiAttesa(mostraFiloDiLavoro)

ascolta((messaggio) => {
  switch (messaggio.tipo) {
    case 'stato':
    case 'differenze':
      ricevoStato(messaggio)
      break

    // L'avanzamento della lettura delle scansioni, a ogni pagina.
    case 'lavoro':
      avanzaLavoro(messaggio)
      break

    // Com'è messo lo schermo per la classe: lo sa solo l'host, perché la finestra
    // si può chiudere dalla sua scheda.
    case 'proiezione.stato': {
      // Accendendo lo schermo si apre la scheda dei suoi comandi; spegnendo si torna
      // alla pagina.
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
      // A pannello chiuso la navigazione arriva prima del registro e gli id non si
      // risolvono: si tiene da parte finché arrivano i dati.
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
 * Lo schermo per la classe segue il registro: la mira parte a ogni cambio di
 * stato, e l'host ricalcola solo se è cambiata. Iscritta dopo la fila e il
 * disegno; all'arrivo dei dati parte a blocco finito (`ricevoStato`), con gli
 * id già convalidati sul documento nuovo.
 */
let ultimaMira: string | null = null
iscriviti(() => {
  if (!stato.caricato) return
  const mira = miraProiezione()
  const chiave = `${mira.lezioneId}|${mira.corsoId}|${mira.classeId}|${mira.semestreId}|${mira.data}`
  if (chiave === ultimaMira) return
  ultimaMira = chiave
  void invia({ tipo: 'proiezione.mira', mira })
    .catch((errore: unknown) => console.warn('[proiezione.mira]', errore))
})

/**
 * L'assistente segue il registro, come la mira della proiezione: la veduta
 * parte solo quando cambia (`vedutaCambiata`), perché lo stato cambia a ogni
 * tasto e ogni invio è una scrittura in coda.
 */
iscriviti(() => {
  if (!stato.caricato) return
  const cambiata = vedutaCambiata()
  if (cambiata) {
    void invia({ tipo: 'assistente.contesto', contesto: cambiata.contesto })
      .catch((errore: unknown) => console.warn('[assistente.contesto]', errore))
  }
})

// I tasti della finestra: le scorciatoie dei comandi, Ctrl+B per le azioni
// della barra (non la barra laterale) e Ctrl+K per la palette (`shortcuts.ts`).
installaScorciatoie({
  comandi: () => aggiorna({ azioniNascoste: !stato.azioniNascoste }),
  palette: () => apriPalette(),
})

/**
 * Un file lasciato cadere fuori bersaglio non deve aprirsi al posto del
 * registro, come farebbe un browser. Si ferma sia `dragover` sia `drop`; le
 * zone che accettano file fermano l'evento prima.
 */
for (const nome of ['dragover', 'drop'] as const) {
  window.addEventListener(nome, (evento: DragEvent) => evento.preventDefault())
}

/**
 * Accende il filetto della finestra (`styles/foundations.css`) quando la
 * finestra non riempie lo schermo. Su macOS la cornice la disegna il sistema.
 * Ingrandita o a schermo intero la finestra copre almeno l'area utile, e lì il
 * filetto sarebbe solo una riga attorno al monitor.
 */
function segnaCornice (): void {
  const piena = window.outerWidth >= screen.availWidth && window.outerHeight >= screen.availHeight
  document.documentElement.toggleAttribute('data-cornice', !piena)
}
if (!navigator.userAgent.includes('Mac')) {
  segnaCornice()
  window.addEventListener('resize', segnaCornice)
}

// L'orologio: un'ora che finisce smette da sola di essere «in corso».
avviaOrologio()

// La rete: la barra di stato dice quando manca.
avviaRete()

// La prima richiesta è anche il segnale all'host che il webview è vivo.
void invia({ tipo: 'stato.leggi' })
  .catch((errore: unknown) => console.warn('[stato.leggi]', errore))
// Dopo il segnale di vita: lo stato degli aggiornamenti per la barra in fondo e
// il titolo, chiesto una volta e poi spinto dall'host.
avviaAggiornamenti()
disegna()
