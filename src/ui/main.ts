// Avvio del pannello: si ascolta l'host, si chiede lo stato, e ogni messaggio o
// interazione passa da `disegna`, che rifà l'intera vista rimettendo fuoco e
// scorrimento dov'erano.

// Per prima: la lingua della pagina, prima che qualunque altro modulo si carichi.
import '../i18n/page.js'
import './styles.css'

import { comandoPerId, eseguiComando } from './commands.js'
import { installaScorciatoie } from './shortcuts.js'
import { conGliScorrimentiDelRitorno, installaCammino } from './history.js'
import { vaiAOggi } from './calendarNavigation.js'
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
import { testi } from './main.testi.js'
import { vedutaCambiata } from './viewpoint.js'
import { ascolta, invia, iscrivitiAttesa } from './bridge.js'
import { oggi } from '../domain/dates.js'
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
 * Quale pagina si sta guardando, per l'entrata: vista, destinazione e scheda
 * del docente di classe. Non persona né ora: cambiarle è lavoro dentro la
 * stessa pagina, e farla rientrare sarebbe un lampeggio.
 */
function chiaveDiEntrata (): string {
  const scheda = stato.vista === 'docenteClasse' ? stato.schedaDocente : ''
  return [stato.vista, stato.paginaId ?? '', scheda].join(':')
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
  if (paginaDisegnata !== null && chiave !== paginaDisegnata) entrataDa = adesso
  paginaDisegnata = chiave
  const passato = adesso - entrataDa
  if (passato >= DURATA_ENTRATA) return
  contenuto.dataset.entrata = ''
  // testo-fisso: un valore CSS
  contenuto.style.setProperty('--entrata-passata', `${-Math.round(passato)}ms`)
}

function disegna (): void {
  if (!radice || disegnoProgrammato) return
  disegnoProgrammato = true
  requestAnimationFrame(() => {
    disegnoProgrammato = false
    // Fuoco e scorrimento non stanno nello stato: si salvano e si rimettono (ogni
    // scatola con `data-scorrimento`). Dopo Alt+← si aggiunge lo scorrimento del
    // posto a cui si torna (`history.ts`).
    const fuoco = ricordaFuoco()
    const scorrimenti = conGliScorrimentiDelRitorno(ricordaScorrimenti())
    rimpiazza(radice, guscio())
    segnaEntrata()
    ripristinaFuoco(fuoco)
    ripristinaScorrimenti(scorrimenti)
  })
}

/**
 * Tutto quel che va messo a posto perché un elemento compaia: le viste
 * filtrano (corso, semestre, giorno, classe), quindi si risale la catena
 * dell'elemento e si sistemano i filtri insieme. Vale per l'albero, la palette
 * e ogni `naviga`.
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
    // `null` è «l'anno intero», una scelta: si tocca solo se la data cade in un semestre.
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
      // Il calendario ha un filtro suo: se è di un altro corso l'ora sarebbe
      // nascosta, quindi si sposta sul suo (non si spegne).
      if (
        lezione &&
        stato.filtroCorsoAgendaId &&
        stato.filtroCorsoAgendaId !== lezione.corsoId
      ) {
        modifiche.filtroCorsoAgendaId = lezione.corsoId
      }
      break
    }
    // Le pendenze sono del corso: l'elemento da aprire è il corso stesso.
    case 'todo': {
      alCorso(elementoId)
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
      // La scheda di un allievo vive dentro la sua classe.
      const classe = stato.registro.classi.find((c) =>
        c.allievi.some((a) => a.id === elementoId),
      )
      if (classe) {
        modifiche.classeId = classe.id
        modifiche.filtroClasseId = classe.id
      }
      break
    }
    // Il check è uno per corso: l'elemento da aprire è il corso stesso.
    case 'corsi':
    case 'check': {
      alCorso(elementoId)
      if (vista === 'check') modifiche.ambitoCheck = 'corso'
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
      // Il semestre, non il giorno: la pagina nasconde le prove degli altri periodi.
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
 * Porta la pagina dove la navigazione chiede, filtri compresi, e può aprire
 * subito una creazione («nuova lezione» arriva al modulo).
 */
function eseguiNavigazione (messaggio: MessaggioNavigazione): void {
  // Gli acceleratori del menu nativo arrivano anche con una modale aperta: come
  // per `installaScorciatoie`, lì il gesto è del modulo.
  if (document.querySelector('.modale')) {
    notifica(testi().finestraAperta, 'avviso')
    return
  }

  // «Nuova ora» dal menu fa quel che fa il pulsante: modulo con il corso scelto,
  // sul giorno guardato (la data dell'host si ignora). Il pulsante esiste solo
  // con «Modifica» accesa, quindi prima la si accende.
  if (messaggio.nuovo && !messaggio.importa && messaggio.vista === 'calendario' && !messaggio.elementoId) {
    aggiorna({ vista: 'calendario', editorCalendario: true })
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

  const modifiche: Parameters<typeof aggiorna>[0] = { vista: messaggio.vista }
  // Prima i filtri dell'elemento, poi la data chiesta a parte, che comanda.
  if (messaggio.elementoId) {
    Object.assign(modifiche, contestoDellElemento(messaggio.vista, messaggio.elementoId))
  }
  if (messaggio.data) modifiche.data = messaggio.data
  aggiorna(modifiche)

  // L'importazione vince: la chiede chi ha appena creato un anno vuoto.
  if (messaggio.importa) {
    moduloImportaRegistro()
    return
  }
  if (!messaggio.nuovo) return

  if (messaggio.vista === 'classi') moduloClasse()
  if (messaggio.vista === 'corsi') moduloCorso()
  // Un piano nasce da un'ora: da qui non saprebbe di quale.
  if (messaggio.vista === 'piani') {
    notifica(testi().pianoDallOra, 'info')
  }
  // Un momento di valutazione nasce dalla tappa del piano, nell'ora della prova.
  if (messaggio.vista === 'valutazioni') {
    notifica(testi().momentoDallaTappa, 'info')
  }
}

iscriviti(disegna)
// La fila dei posti visitati (Alt+←/→), che fornisce anche gli scorrimenti del ritorno.
installaCammino()
// Il canale fa ridisegnare quando il filo di lavoro si accende o si spegne.
iscrivitiAttesa(disegna)

ascolta((messaggio) => {
  switch (messaggio.tipo) {
    case 'stato': {
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
        registro: messaggio.registro,
        avvisi: messaggio.avvisi,
        radiceDati: messaggio.radiceDati,
        // Serve a `impostaCaratteri` per i caratteri delle miniature dei PDF.
        radiceApp: messaggio.radiceApp,
        documenti: messaggio.documenti,
        storia: messaggio.storia,
        esportati: messaggio.esportati,
        archiviati: messaggio.archiviati,
        composizioni: messaggio.composizioni,
        ocrAttivo: messaggio.ocrAttivo,
        programma: messaggio.programma,
        posta: messaggio.posta,
        caricato: true,
        // Anteprime, pagine scelte e spunte puntano a file dell'altro documento.
        ...(altroDocumento
          ? {
              anteprimaArchivio: null,
              anteprimaAssenze: null,
              pagineScelte: null,
              documentiScelti: [],
            }
          : {}),
      })
      // I semestri arrivano con i dati: solo adesso si sa in quale cade oggi.
      allineaSemestre()
      riconvalidaRicordati()
      // Poi la navigazione chiesta a pannello chiuso: il semestre di una prova di
      // novembre vince su quello di oggi.
      if (navigazioneInAttesa) {
        const chiesta = navigazioneInAttesa
        navigazioneInAttesa = null
        eseguiNavigazione(chiesta)
      }
      break
    }

    // L'avanzamento della lettura delle scansioni, a ogni pagina.
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
 * stato, e l'host ricalcola solo se è cambiata.
 */
iscriviti(() => {
  if (!stato.caricato) return
  void invia({ tipo: 'proiezione.mira', mira: miraProiezione() })
})

/**
 * L'assistente segue il registro, come la mira della proiezione: la veduta
 * parte solo quando cambia (`vedutaCambiata`), perché lo stato cambia a ogni
 * tasto e ogni invio è una scrittura in coda.
 */
iscriviti(() => {
  if (!stato.caricato) return
  const cambiata = vedutaCambiata()
  if (cambiata) void invia({ tipo: 'assistente.contesto', contesto: cambiata.contesto })
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

// L'orologio: un'ora che finisce smette da sola di essere «in corso».
avviaOrologio()

// La rete: la barra di stato dice quando manca.
avviaRete()

// La prima richiesta è anche il segnale all'host che il webview è vivo.
void invia({ tipo: 'stato.leggi' })
disegna()
