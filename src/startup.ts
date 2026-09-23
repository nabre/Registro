// Il registro che si accende: archivio, comandi, smistamento dei PDF, e
// — se il registro è già stato usato in questa cartella — il pannello aperto da
// solo.
//
// È il confine fra il guscio e il registro. Sopra c'è `shell/main.ts`,
// che sa di Electron e non sa niente di lezioni; sotto c'è tutto il resto, che
// sa di lezioni e non sa niente di Electron. Le due funzioni qui esportate sono
// l'unica porta fra i due.
//
// L'apertura automatica ha una regola: si apre solo se la cartella dei dati
// esiste. In un workspace che col registro non c'entra nulla, l'estensione
// resta invisibile; nella cartella del docente si trova il registro già aperto
// senza doverlo chiedere.

import { pathToFileURL } from 'node:url'

import * as apparato from 'apparato'
import { segnaDocumentoAperto } from './environment/documents.js'
import { percorsoPacchetto } from './data/paths.js'

import {
  avviaAgenda,
  agendaVisibile,
  chiudiAgenda,
  mostraAgenda,
  spegniAgenda,
} from './agenda.js'
import { avviaCondotto, condottoDaAprire, type Condotto } from './api/transports/conduit.js'
import { avviatoDalSistema } from './environment/systemStartup.js'
import { vassoioAcceso } from './environment/tray.js'
import { esegui } from './actions.js'
import { fermaRapporti } from './actions/reports.js'
import { registraNavigatore } from './actions/view.js'
import { impacchettaAnni, inglobaCartelle, migraAnni } from './data/years.js'
import { Archivio } from './data/archive.js'
import { registraDeposito } from './data/store.js'
import { migraArchivio } from './data/filing.js'
import { ESTENSIONE, cartellaAnno, cartellaDocumento } from './data/paths.js'
import { impostaCaratteri, impostaWorker } from './data/pdf.js'
import { fermaLetture } from './data/ocr.js'
import { annota, osserva } from './api/core.js'
import { identificatore } from './domain/identifiers.js'
import { registraPortachiaviOauth } from './data/oauth.js'
import {
  azzeraPosta,
  collegaAccount,
  inviaProva,
  provaCollegamento,
  scollegaAccount,
} from './data/mail.js'
import { smistatoreDi, type Smistatore } from './data/sorter.js'
import { isoValida, oggi } from './domain/dates.js'
import { creaAnnoCorrente } from './domain/factories.js'
import { PannelloRegistro } from './panels/panel.js'
import { avviaPromemoria } from './reminders.js'
import { avviaAssistente } from './panels/assistant.js'
import { avviaProiezione, PannelloProiezione } from './panels/projection.js'
import { avviaVassoio } from './tray.js'
import type { MessaggioNavigazione } from './protocol.js'

/** L'archivio della finestra: serve a `spegni` per l'ultimo salvataggio. */
let archivioAttivo: Archivio | null = null

/**
 * Il vassoio, tenuto da parte per lo spegnimento.
 *
 * L'icona va tolta *prima* di uscire e non lasciata al sistema operativo:
 * chiuso il processo senza distruggerla, Windows tiene il posto nel cassetto
 * finché qualcuno non ci passa sopra con il mouse — e per chi guarda è
 * un'applicazione che si è chiusa e non se n'è andata.
 */
let vassoioAttivo: apparato.Smaltitore | null = null

/**
 * Il condotto, tenuto da parte per lo spegnimento.
 *
 * Va chiuso *prima* dell'ultimo salvataggio, e non insieme al resto: finché
 * ascolta, una chiamata può entrare mentre l'archivio si sta consegnando al
 * disco — e quella modifica non finirebbe in nessun file. Vedi `spegni`.
 */
let condottoAttivo: Condotto | null = null

/**
 * Lo smistatore, tenuto da parte per lo spegnimento.
 *
 * La sua coda dell'OCR è l'unica del registro che scriva **minuti** dopo essere
 * stata avviata: una pagina che arriva a `archivio.modifica` dopo
 * `lasciaPacchetto()` è persa in silenzio, con i minuti di lettura che ci erano
 * voluti. Vedi `spegni`.
 */
let smistatoreAttivo: Smistatore | null = null

/**
 * Il contesto dell'applicazione, tenuto da parte per lo spegnimento.
 *
 * `startup.ts` dichiarava in due punti che «`subscriptions` viene svuotato allo
 * spegnimento». Non lo svuotava nessuno: li uccideva `app.exit(0)`, cioè il
 * sistema operativo, e ogni `dispose` scritto là dentro non veniva mai
 * chiamato. Adesso è vero, e `spegni` lo fa per ultimo — vedi lì l'ordine e il
 * perché.
 */
let contestoAttivo: apparato.ContestoApplicazione | null = null

/**
 * Apre il condotto, e se non si apre non ferma il registro.
 *
 * Il nome può essere già preso da una copia rimasta viva, o — fuori da Windows
 * — da un file che un altro utente ha occupato per primo: il registro deve
 * partire lo stesso, e la console dice quale dei due casi è.
 */
async function apriCondotto (archivio: Archivio, cartellaUtente: string): Promise<Condotto | null> {
  return avviaCondotto(archivio, { cartellaUtente }).catch((errore: unknown) => {
    console.error('apertura del condotto', errore)
    return null
  })
}

/**
 * Chiude il condotto aperto, aspettando le chiamate già cominciate.
 *
 * L'attesa non è cortesia: una scrittura già entrata in coda tocca l'archivio
 * comunque, e chiudere senza aspettarla vuol dire che la modifica entra e chi
 * l'ha mandata non riceve niente invece di «fatto».
 */
async function chiudiCondotto (): Promise<void> {
  const condotto = condottoAttivo
  condottoAttivo = null
  condotto?.dispose()
  await condotto?.svuotato()
}

/**
 * Il condotto che segue l'interruttore invece di aspettare il prossimo avvio.
 *
 * I permessi si rileggono a ogni chiamata — vedi `permessiOra` in
 * `conduit.ts` — quindi spegnere «registroDocenti.api.scrittura» ha effetto
 * subito senza passare di qui. Quel che *non* si può rileggere è se la pipe
 * esista: spegnere l'interruttore generale lasciava il condotto in ascolto
 * fino al riavvio dell'applicazione, cioè lasciava aperto un nome riservato
 * che l'impostazione prometteva chiuso. Riaperture inutili non se ne fanno:
 * `condottoDaAprire` dice se lo stato *di apertura* è cambiato davvero, e
 * finché è lo stesso le connessioni aperte non si strappano.
 *
 * Le riaperture si accodano una dietro l'altra: due spunte toccate in fretta
 * darebbero due `listen` sullo stesso nome, e il secondo troverebbe il primo.
 */
function osservaCondotto (archivio: Archivio, cartellaUtente: string): apparato.Smaltitore {
  // Lo stato di apertura si tiene qui e non si deduce da `condottoAttivo`: da
  // spento `avviaCondotto` restituisce comunque qualcosa da smaltire — è il
  // suo contratto, così chi lo chiama non deve sapere se è successo qualcosa —
  // e quel qualcosa non è una pipe in ascolto.
  let aperto = condottoDaAprire()
  let inCorso: Promise<void> = Promise.resolve()

  const allImpostazione = apparato.impostazioni.alCambio((evento) => {
    if (!evento.affectsConfiguration('registroDocenti.api')) return
    inCorso = inCorso.then(async () => {
      const vuole = condottoDaAprire()
      if (vuole === aperto) return
      aperto = vuole
      await chiudiCondotto()
      if (vuole) condottoAttivo = await apriCondotto(archivio, cartellaUtente)
    }).catch((errore: unknown) => {
      console.error('riapertura del condotto', errore)
    })
  })

  return new apparato.Smaltitore(() => allImpostazione.dispose())
}

/**
 * Come si apre il pannello, per chi lo deve aprire da fuori.
 *
 * È il guscio: una seconda copia lanciata a finestre chiuse — che con il
 * vassoio è la normalità — deve riportare davanti il registro invece di uscire
 * in silenzio. `null` finché `avvia` non è passato.
 */
let apriPannello: ((navigazione?: MessaggioNavigazione) => void) | null = null

export function apriRegistro (navigazione?: MessaggioNavigazione): void {
  apriPannello?.(navigazione)
}

/**
 * Oltre questa soglia una chiamata si racconta anche se è riuscita.
 *
 * Due secondi: sopra, chi ha premuto ha già avuto il tempo di chiedersi se
 * avesse premuto davvero. Sotto, è il funzionamento normale e non è notizia —
 * una griglia di voti o un giro di PDF ci arrivano vicino per mestiere.
 */
const LENTA_MS = 2000

/**
 * Accende il registro su un documento.
 *
 * Il documento arriva da fuori — un doppio clic, una voce dei recenti, il
 * dialogo di apertura — e può essere `null`: un registro appena installato non
 * ne ha ancora uno, e parte senza anno invece di inventarselo.
 *
 * `annuncia` riceve la fase in corso, con parole da mostrare a chi aspetta: il
 * guscio la scrive nel riquadro d'avvio (`shell/windows/splash.ts`). Le fasi
 * sono quelle che possono durare — i traslochi dei file vecchi, la lettura del
 * documento — e non ogni riga di questa funzione.
 */
export async function avvia (
  contesto: apparato.ContestoApplicazione,
  documento: apparato.Uri | null = null,
  annuncia: (fase: string) => void = () => undefined,
): Promise<void> {
  contestoAttivo = contesto

  // Il portachiavi del sistema, che è dove sta il gettone della casella: va
  // consegnato prima di ogni altra cosa, perché il primo stato spinto al
  // pannello deve già sapere se la casella è collegata.
  registraPortachiaviOauth(contesto.secrets)

  // Il giornale delle chiamate, acceso subito: prima ancora che si apra un
  // documento, perché quel che va storto all'avvio è esattamente quel che non
  // si riesce mai a raccontare dopo.
  //
  // Si scrive in console e non in un file, ed è deliberato: un registro di
  // classe che tiene un giornale su disco tiene un elenco di quando un docente
  // ha aperto quale classe, e non è una cosa che questo programma debba avere.
  // La voce non contiene l'ingresso — mai nomi di persone — ma contiene il
  // nome della procedura e l'ora, e quello basta a dire troppo se resta
  // scritto.
  //
  // Non tutto: solo i rifiuti e le chiamate lente. Un giornale che racconta
  // anche le trentamila caselle d'appello di un anno non lo legge nessuno, ed
  // è lo stesso motivo per cui l'indicatore «sto lavorando» del pannello
  // aspetta un quarto di secondo prima di accendersi.
  contesto.subscriptions.push(
    new apparato.Smaltitore(osserva((voce) => {
      if (!voce.ok) {
        console.warn(
          `[api] ${voce.procedura} — ${voce.codice} (${voce.origine}, ${voce.durataMs} ms, ${voce.tracciato})`,
        )
      } else if (voce.durataMs >= LENTA_MS) {
        console.warn(
          `[api] ${voce.procedura} — ${voce.durataMs} ms (${voce.origine}, ${voce.tracciato})`,
        )
      }
    })),
  )

  // La cartella dell'utente è dove il deposito tiene le copie materializzate
  // dei file dell'anno: fuori dalla cartella di lavoro, perché sono copie e non
  // devono farsi sincronizzare.
  const archivio = new Archivio(contesto.globalStorageUri)
  // Da qui in poi chi archivia un documento scrive dentro il documento
  // dell'anno: `filing.ts` e le azioni passano di lì senza saperlo.
  registraDeposito(archivio.deposito)
  archivioAttivo = archivio
  contesto.subscriptions.push(archivio)
  let ultimoDocumento: string | null = null
  contesto.subscriptions.push(archivio.alCambiamento(() => {
    const corrente = percorsoPacchetto()?.fsPath ?? null
    if (corrente && corrente !== ultimoDocumento) segnaDocumentoAperto(corrente)
    ultimoDocumento = corrente
  }))

  // Un anno aperto altrove: si chiede prima di aprirlo qui.
  //
  // La domanda non è burocrazia. I due registri non si accorgerebbero l'uno
  // dell'altro finché non salvano, e a quel punto chi salva per ultimo copre
  // il lavoro del primo — non lo fonde: lo copre. Detto prima, chi apre
  // decide; detto dopo, non c'è più niente da decidere.
  archivio.chiediSeOccupato(async (anno, serratura) => {
    const chi = serratura.utente ? `${serratura.macchina} (${serratura.utente})` : serratura.macchina
    const quando = serratura.aperto ? new Date(serratura.aperto).toLocaleString('it-CH') : null
    const scelta = await apparato.dialoghi.avvisa(
      `L’anno «${anno}» risulta già aperto su ${chi}.`,
      {
        modal: true,
        detail:
          `${quando ? `Aperto il ${quando}. ` : ''}Se lo apri anche qui, chi salva per ultimo ` +
          'copre il lavoro dell’altro. Può anche essere un registro chiuso male: in quel caso ' +
          'aprirlo è la cosa giusta.',
      },
      { title: 'Apri lo stesso' },
    )
    return scelta === 'Apri lo stesso'
  })

  // Prima di leggere: se intorno al documento c'è ancora la disposizione di
  // prima — i nove JSON tutti insieme, con gli anni mescolati dentro — si
  // divide per anno. Va fatto qui e non dopo il caricamento perché `Archivio`
  // sa leggere solo la disposizione nuova: aprirlo prima vorrebbe dire mostrare
  // un registro vuoto per il tempo della migrazione, e spaventare chi guarda.
  //
  // La radice è la cartella del documento che si sta aprendo: chi apre un
  // `.registro` sta indicando quella cartella, ed è lì che può essere rimasto
  // qualcosa da convertire — una cartella sincronizzata può aver ricevuto il
  // documento da una macchina già aggiornata e i file vecchi da un'altra.
  const radice = documento ? apparato.Uri.joinPath(documento, '..') : null
  if (radice) annuncia('Controllo i file dell’anno…')
  const migrati = radice ? await migraAnni(radice) : null
  // E subito dopo il secondo trasloco: i JSON di ogni anno dentro il suo
  // documento, `2026-2027.registro`. Nello stesso punto e per lo stesso motivo,
  // e in quest'ordine, perché il primo trasloco produce proprio le cartelle che
  // il secondo impacchetta.
  const impacchettati = radice ? await impacchettaAnni(radice) : []

  annuncia(documento ? 'Leggo il documento dell’anno…' : 'Preparo il registro…')
  await archivio.apri(documento)

  if (migrati) {
    void apparato.dialoghi.informa(
      migrati.anni.length === 1
        ? `Registro: i dati sono ora nella cartella «${migrati.corrente}», una per anno scolastico.`
        : `Registro: i dati sono stati divisi in ${migrati.anni.length} cartelle, una per anno scolastico. In uso: «${migrati.corrente}».`,
    )
  }

  if (impacchettati.length > 0) {
    void apparato.dialoghi.informa(
      impacchettati.length === 1
        ? `Registro: i dati dell’anno stanno ora nel documento «${impacchettati[0]}${ESTENSIONE}». La cartella «dati» di prima è nel cestino.`
        : `Registro: ${impacchettati.length} anni sono ora altrettanti documenti «${ESTENSIONE}». Le cartelle «dati» di prima sono nel cestino.`,
    )
  }

  // Una volta sola: nel webview se il pannello è aperto, altrimenti con la
  // finestra di sistema. `PannelloRegistro.avvisa` decide da sé — è la stessa
  // regola che vale per gli errori di un'azione, e viverla in due posti
  // diversi è come tenerla scritta in due posti diversi.
  contesto.subscriptions.push(archivio.allErrore((testo) => PannelloRegistro.avvisa(testo)))

  // Lo smistamento dei PDF che arrivano nel pannello. Il worker di pdfjs si
  // dichiara prima di qualunque lettura: sta accanto al codice dell'estensione,
  // e senza il suo percorso la prima pagina letta fallirebbe.
  impostaWorker(
    pathToFileURL(
      apparato.Uri.joinPath(contesto.extensionUri, 'dist', 'pdf.worker.mjs').fsPath,
    ).href,
  )
  // E i caratteri standard, che stanno accanto al worker: senza, pdfjs avverte
  // a ogni documento e calcola le larghezze del testo a occhio.
  impostaCaratteri(apparato.Uri.joinPath(contesto.extensionUri, 'dist', 'caratteri-pdf').fsPath)
  // I file archiviati con la disposizione di prima si spostano nell'archivio
  // nuovo alla prima apertura: una volta sola, e senza chiedere niente a
  // nessuno — un riferimento che punta al posto sbagliato è peggio di
  // un'attesa di due secondi all'avvio.
  void migraArchivio(archivio)
    .then(async (spostati) => {
      if (spostati > 0) {
        // Diceva «sotto «documentazione/»», che è il nome **vecchio**: la
        // migrazione appena finita fa l'opposto — `dividiPerOrigine` smonta
        // quella cartella unica e rimette i file sotto `archivio/` ed
        // `esportazioni/`. L'unico messaggio che dice al docente dove sono
        // finiti i suoi fogli indicava la cartella appena disfatta.
        void apparato.dialoghi.informa(
          `Registro: ${spostati} documenti rimessi in ordine sotto «archivio/» ed ` +
            '«esportazioni/», per classe, corso e documento.',
        )
      }
      // E poi dentro il documento, che è il terzo e ultimo trasloco: prima si
      // rimettono in ordine le cartelle, poi si inglobano. All'incontrario
      // entrerebbero nel documento con la disposizione vecchia, e a rimetterle
      // in ordine dopo non ci penserebbe più nessuno.
      return inglobaCartelle(archivio)
    })
    .then((entrati) => {
      if (entrati > 0) {
        void apparato.dialoghi.informa(
          `Registro: ${entrati} documenti dell’anno sono ora dentro «${archivio.cartellaCorrente}${ESTENSIONE}». ` +
            'Le cartelle di prima sono nel cestino.',
        )
      }
    })
    .catch((errore: unknown) => {
      // Un file bloccato ferma il trasloco a metà. Fin qui la rejection non la
      // gestiva nessuno: il trasloco si interrompeva in silenzio e il processo
      // principale rischiava di cadere all'avvio. Adesso si dice che cos'è
      // successo, e la prossima apertura riprova da dove era arrivato.
      console.error('trasloco dei documenti archiviati', errore)
      void apparato.dialoghi.avvisa(
        'Registro: non ho potuto rimettere in ordine tutti i documenti archiviati. ' +
          'Chiudi i programmi che tengono aperti i file e riapri il registro.',
      )
    })

  const smistatore = smistatoreDi(archivio)
  smistatoreAttivo = smistatore
  contesto.subscriptions.push(smistatore)
  smistatore.alTermine((testo) => void apparato.dialoghi.informa(`Registro: ${testo}`))

  // La lettura di una pagina scrive nel registro e non passa da `chiama()`:
  // dura minuti, e una chiamata che tiene la fila delle scritture per minuti è
  // la fila che non funziona più. Non essendo instradabile, si racconta — è
  // l'unico posto in cui qualcosa cambiava e il giornale non ne sapeva niente.
  // L'iscrizione sta qui e non dentro lo smistatore perché `dati/` è `core` e
  // il giornale sta in `api/`: questo è lo strato da cui si vedono tutti e due.
  contesto.subscriptions.push(
    smistatore.allaPaginaLetta((pagina) => {
      annota({
        tracciato: identificatore('ocr'),
        // Non è una procedura e non finge di esserlo: il nome dice che cos'è,
        // e `$elenco` non lo conosce. Il giorno in cui la lettura di una pagina
        // diventasse instradabile, questo nome sarebbe quello da usare.
        procedura: 'smistamento.lettura.pagina',
        origine: 'programma',
        genere: 'scrittura',
        durataMs: pagina.durataMs,
        ok: pagina.ok,
        ...(pagina.ok ? {} : { codice: 'rifiutato' as const }),
        modifiche: pagina.modifiche,
      })
    }),
  )

  // Lo schermo per la classe: da qui in poi si può aprire. Le sue azioni
  // arrivano dal webview e hanno in mano l'archivio, non il contesto
  // dell'estensione — glielo si mette da parte qui, una volta sola.
  annuncia('Preparo le finestre…')
  avviaProiezione(contesto, archivio)
  avviaAssistente(contesto, archivio)

  const apri = (navigazione?: MessaggioNavigazione) =>
    PannelloRegistro.mostra(contesto, archivio, navigazione)
  apriPannello = apri

  // `vista.apri`: la stessa cosa che fanno il menu e il widget, passata dal
  // contratto perché di lì la può chiedere anche l'assistente. Si iscrive
  // invece di essere chiamato per nome, perché il gestore sta in `core` e di
  // là non si esce verso le finestre — vedi la nota in testa a `actions/view.ts`.
  registraNavigatore(apri)

  // I promemoria: una notifica del sistema poco prima che una lezione cominci,
  // con quel che resta aperto per quel corso. Premendola si apre il registro di
  // quell'ora — ed è il gesto che serve, perché la notifica arriva proprio nel
  // momento in cui si prende il computer in mano.
  contesto.subscriptions.push(
    avviaPromemoria(archivio, (lezioneId) => {
      apri({ tipo: 'naviga', vista: 'lezione', elementoId: lezioneId })
    }),
  )

  // La settimana appesa al bordo destro del desktop: le ore di ogni giorno,
  // viste senza aprire niente. Si accende da sé se la si era lasciata accesa —
  // è un widget, e un widget che va riacceso ogni mattina non è un widget.
  contesto.subscriptions.push(avviaAgenda(archivio, apri))

  // L'icona accanto all'orologio: i corsi dell'anno, e dentro ognuno le sue ore
  // divise fra quel che è fatto, quel che è rimasto aperto e quel che viene.
  // Ci finisce anche l'uscita dall'applicazione, che con il vassoio acceso non
  // è più la X della finestra — vedi `shell/main.ts`.
  vassoioAttivo = avviaVassoio(archivio, apri)
  contesto.subscriptions.push(vassoioAttivo)

  // Il registro che risponde a chi non è una finestra: la riga di comando, uno
  // script. Sta qui e non più in alto perché vuole un archivio già aperto — una
  // chiamata arrivata su un registro non ancora letto lavorerebbe su un anno
  // vuoto e scriverebbe il vuoto sopra i dati veri. È spento di suo: lo accende
  // `registroDocenti.api.condotto`, e il perché di quella cautela sta scritto in
  // testa a `api/transports/conduit.ts`.
  //
  // Un condotto che non si apre non ferma il registro: il nome può essere già
  // preso da una copia rimasta viva, e il registro deve partire lo stesso.
  const cartellaUtente = contesto.globalStorageUri.fsPath
  condottoAttivo = await apriCondotto(archivio, cartellaUtente)
  contesto.subscriptions.push(
    // Quello di adesso, non quello di allora: `osservaCondotto` può averlo
    // sostituito nel frattempo, e smaltire l'oggetto che c'era all'avvio
    // lascerebbe in ascolto quello che c'è davvero.
    new apparato.Smaltitore(() => condottoAttivo?.dispose()),
    osservaCondotto(archivio, cartellaUtente),
  )

  const comando = (nome: string, esecuzione: (...argomenti: never[]) => unknown) =>
    contesto.subscriptions.push(apparato.comandi.registra(nome, esecuzione))

  comando('registroDocenti.apri', () => apri())
  comando('registroDocenti.guida', () => apri({ tipo: 'naviga', vista: 'guida' }))
  // Le impostazioni sono una pagina del registro, non più una finestra a parte:
  // là dentro stanno sia quelle del programma sia quelle del documento aperto.
  // La finestra nativa resta per quando il pannello non c'è — vedi
  // `shell/windows/menu.ts` — ed è di lì che si arriva qui.
  comando('registroDocenti.impostazioni', () => apri({ tipo: 'naviga', vista: 'impostazioni' }))
  comando('registroDocenti.oggi', () => apri({ tipo: 'naviga', vista: 'calendario', data: oggi() }))
  comando('registroDocenti.nuovaLezione', () =>
    apri({ tipo: 'naviga', vista: 'calendario', data: oggi(), nuovo: true }),
  )
  comando('registroDocenti.nuovaClasse', () => apri({ tipo: 'naviga', vista: 'classi', nuovo: true }))
  comando('registroDocenti.nuovoCorso', () => apri({ tipo: 'naviga', vista: 'corsi', nuovo: true }))
  // L'avvio guidato: un comando solo che porta dal registro vuoto alla prima
  // lezione sul calendario, senza dover sapere in che ordine nascono le cose.
  comando('registroDocenti.avvio', () => apri({ tipo: 'naviga', vista: 'corsi', avvio: true }))
  comando('registroDocenti.nuovoPiano', () => apri({ tipo: 'naviga', vista: 'piani', nuovo: true }))
  comando('registroDocenti.nuovaValutazione', () =>
    apri({ tipo: 'naviga', vista: 'valutazioni', nuovo: true }),
  )
  // Il registro prima, la proiezione poi: lo schermo grande segue quel che il
  // pannello sta guardando, e senza pannello aperto non avrebbe niente da
  // seguire.
  comando('registroDocenti.proietta', async () => {
    apri()
    await PannelloProiezione.apri()
  })

  // L'agenda sul desktop, accesa e spenta dallo stesso comando: è un
  // interruttore, e due voci di menu per una striscia che o c'è o non c'è
  // sarebbero due voci di cui una è sempre quella sbagliata.
  comando('registroDocenti.agenda', () => {
    if (agendaVisibile()) spegniAgenda()
    else mostraAgenda()
  })

  comando('registroDocenti.nuovoAnno', async () => {
    // L'anno proposto è quello che comprende oggi: nove volte su dieci è quello.
    const proposto = creaAnnoCorrente()
    const conferma = await apparato.dialoghi.chiediScelta(
      [
        { label: proposto.etichetta, descrizione: `${proposto.inizio} → ${proposto.fine}`, valore: proposto },
        { label: 'Scegli le date…', descrizione: 'imposta inizio e fine a mano', valore: null },
      ].map((v) => ({ label: v.label, description: v.descrizione, valore: v.valore })),
      { title: 'Nuovo anno scolastico' },
    )
    if (!conferma) return

    let inizio = proposto.inizio
    let fine = proposto.fine
    if (!conferma.valore) {
      const chiediData = async (titolo: string, valore: string) =>
        apparato.dialoghi.chiediTesto({
          title: titolo,
          value: valore,
          prompt: 'Formato AAAA-MM-GG',
          // `isoValida` e non la sola forma: `\d{2}` accetta il mese 13 e il
          // 31 febbraio, e una data che non esiste passava il dialogo per
          // fermarsi molto più in là, dove a dirlo non è più questo campo.
          validateInput: (v) => (isoValida(v) ? null : 'Serve una data vera, scritta AAAA-MM-GG'),
        })
      const primo = await chiediData('Inizio dell’anno', inizio)
      if (!primo) return
      const ultimo = await chiediData('Fine dell’anno', fine)
      if (!ultimo) return
      inizio = primo
      fine = ultimo
    }

    // Passa da `esegui`, come farebbe il webview: è lì che l'anno si valida
    // e che i semestri si ricavano dalle date vere, non da quelle dell'anno
    // proposto che si stava per scartare.
    // `'programma'`: parte da un comando del registro, non dal pannello. Era
    // una delle due origini dichiarate in `Origine` che non le scriveva
    // nessuno, e ogni scrittura partita di qui finiva nel giornale marcata
    // «pannello».
    const esito = await esegui(archivio, { tipo: 'anno.crea', inizio, fine }, 'programma')
    if (!esito.ok) {
      void apparato.dialoghi.errore(`Registro: ${(esito.errori ?? []).join(' ')}`)
      return
    }
    await archivio.salva()
    if (esito.creato) apri({ tipo: 'naviga', vista: 'impostazioni', elementoId: esito.creato.id })
  })

  // Il pannello è già iscritto a `alCambiamento`: la ricarica gli fa arrivare
  // lo stato nuovo da sé, senza bisogno di dirglielo qui.
  comando('registroDocenti.ricarica', async () => {
    await archivio.carica()
  })

  // Aprire un altro anno: un altro file, e basta. Prima voleva dire riscrivere
  // un indice e, se il file stava in un'altra cartella, riavviare
  // l'applicazione; adesso l'archivio apre l'Uri che gli si dà, e quel che sta
  // intorno — l'osservatore, la cassetta, le radici del pannello — si rifà da
  // sé sull'evento di cambiamento, qui sotto.
  comando('registroDocenti.usaDocumento', async (percorsoFile: string) => {
    const file = apparato.Uri.file(percorsoFile)
    const radiceSua = apparato.Uri.joinPath(file, '..')
    await migraAnni(radiceSua)
    await impacchettaAnni(radiceSua)
    await archivio.apri(file)
    inglobaCartelle(archivio).catch((errore: unknown) => {
      console.error('inglobamento delle cartelle dell\u2019anno appena aperto', errore)
    })
  })

  // «Collegato a che cosa?»: la domanda che si fa prima di accendere l'invio
  // diretto, e che fin qui si poteva verificare solo mandando una mail vera a
  // qualcuno. Sta anche nella scheda Posta delle impostazioni; qui serve a chi
  // il pannello non ce l'ha aperto.
  comando('registroDocenti.provaPosta', async () => {
    const esito = await provaCollegamento()
    const mostra =
      esito.livello === 'errore'
        ? apparato.dialoghi.errore
        : esito.livello === 'avviso'
          ? apparato.dialoghi.avvisa
          : apparato.dialoghi.informa
    void mostra(`Registro — posta: ${esito.testo}`)
  })

  // E l'altra metà: una mail vera, a un indirizzo che si sceglie. Entrare nella
  // casella e uscirne sono due permessi diversi, e la firma si carica solo
  // quando un messaggio parte davvero.
  comando('registroDocenti.provaInvioPosta', async () => {
    const esito = await inviaProva()
    if (!esito) return
    const mostra =
      esito.livello === 'errore'
        ? apparato.dialoghi.errore
        : esito.livello === 'avviso'
          ? apparato.dialoghi.avvisa
          : apparato.dialoghi.informa
    void mostra(`Registro — posta: ${esito.testo}`)
  })

  // Collegare la casella: l'indirizzo e l'accesso a Microsoft, provati sul
  // server prima di essere salvati. Il gettone va nel portachiavi e non nelle
  // impostazioni, che sono un file in chiaro dentro il workspace.
  comando('registroDocenti.collegaPosta', async () => {
    const stato = await collegaAccount()
    if (!stato) return
    const mostra =
      stato.livello === 'errore'
        ? apparato.dialoghi.errore
        : stato.livello === 'avviso'
          ? apparato.dialoghi.avvisa
          : apparato.dialoghi.informa
    void mostra(`Registro — posta: ${stato.testo}`)
  })

  comando('registroDocenti.scollegaPosta', async () => {
    const stato = await scollegaAccount()
    void apparato.dialoghi.informa(`Registro — posta: ${stato.testo}`)
  })

  // Azzerare tutto: portachiavi, memoria, impostazioni. È la mossa di quando
  // «non funziona» e non si sa più che cosa sia rimasto in giro da un tentativo
  // precedente. Si chiede conferma perché toglie anche l'indirizzo e l'ID
  // applicazione, che poi vanno riscritti.
  comando('registroDocenti.azzeraPosta', async () => {
    const azzera = 'Azzera'
    const scelta = await apparato.dialoghi.avvisa(
      'Azzerare la posta del registro?',
      {
        modal: true,
        detail:
          'Toglie la password e il gettone dal portachiavi, i gettoni in memoria e tutte le ' +
          'impostazioni registroDocenti.posta.* (indirizzo, tenant, ID applicazione, invio ' +
          'diretto). Il collegamento andrà rifatto da capo.',
      },
      azzera,
    )
    if (scelta !== azzera) return
    const stato = await azzeraPosta()
    void apparato.dialoghi.informa(`Registro — posta: ${stato.testo}`)
  })

  // La cartella dell'anno in uso, che è quella in cui si va a cercare: il
  // documento dell'anno e quel che gli sta accanto. Senza un anno si apre la
  // radice, che è l'unica cosa che c'è.
  comando('registroDocenti.apriCartellaDati', async () => {
    const cartella = cartellaAnno() ?? cartellaDocumento()
    if (!cartella) {
      void apparato.dialoghi.avvisa('Registro: nessuna cartella di lavoro aperta.')
      return
    }
    await apparato.file.createDirectory(cartella)
    await apparato.comandi.esegui('apparato.mostraNellaCartella', cartella)
  })

  // L'osservatore guarda il documento aperto, e quindi va rifatto ogni volta
  // che il documento cambia. Quello vecchio va chiuso, non solo sostituito:
  // `subscriptions` viene svuotato allo spegnimento, e accodarcene uno a ogni
  // apertura lo farebbe crescere per tutta la sessione.
  let osservatore = archivio.osserva()
  contesto.subscriptions.push(new apparato.Smaltitore(() => osservatore.dispose()))

  // I PDF in ingresso stanno dentro il documento dell'anno: aprendone un altro
  // cambia anche quel che c'è da smistare, e con esso la vecchia cassetta su
  // disco da svuotare — se quell'anno se ne porta ancora dietro una.
  let documentoCorrente = percorsoPacchetto()?.toString() ?? null
  contesto.subscriptions.push(
    archivio.alCambiamento(() => {
      const adesso = percorsoPacchetto()?.toString() ?? null
      if (adesso === documentoCorrente) return
      documentoCorrente = adesso
      // Un altro file da tenere d'occhio: quello di prima non ci riguarda più.
      osservatore.dispose()
      osservatore = archivio.osserva()
      smistatore.assorbiCassettaVecchia().catch((errore: unknown) => {
        console.error('ripresa della cassetta del documento precedente', errore)
      })
      // I file che il pannello mostra stanno dentro l'anno: aprendone un
      // altro, la sandbox del webview e la radice con cui compone gli
      // indirizzi vanno rifatte, o le immagini della classe appena caricata
      // risulterebbero sparite.
      PannelloRegistro.aggiornaRisorse()
    }),
  )

  // Quel che è rimasto nella cassetta di prima entra all'accensione: un PDF
  // lasciato lì da una versione precedente deve essere smistato adesso, non
  // restare in una cartella che nessuno guarda più.
  if (await archivio.esiste()) void smistatore.assorbiCassettaVecchia()

  const conf = apparato.impostazioni.leggi('registroDocenti')
  const apertura = conf.get<boolean>('aperturaAutomatica', true)
  // Partire senza finestra: l'icona accanto all'orologio e il widget sul
  // desktop, e il registro che si apre quando lo si chiede. È il modo in cui lo
  // vuole chi lo tiene acceso tutto il giorno, ed è anche il modo in cui parte
  // da sé all'accesso — vedi `environment/systemStartup.ts`.
  //
  // Vale però solo se resta qualcosa da premere per riaverlo: senza icona e
  // senza widget, un'applicazione viva e invisibile non si riprende più, e
  // allora la finestra si apre come sempre.
  const silenzioso = conf.get<boolean>('avvio.soloVassoio', false) || avviatoDalSistema()
  const qualcosaResta = vassoioAcceso() || agendaVisibile()
  if (apertura && !(silenzioso && qualcosaResta) && (await archivio.esiste())) {
    annuncia('Apro il registro…')
    apri()
  }
}

/**
 * Crea il primo anno di un registro nuovo, e lo apre.
 *
 * Serve al guscio, che al primo avvio chiede dove tenere il documento e poi
 * non ha in mano l'archivio per riempirlo: quello nasce qui dentro e non esce
 * di qui. Passa da `esegui` come farebbe il pannello — è lì che l'anno si
 * valida e che i semestri si ricavano dalle date — e salva subito, perché un
 * documento annunciato e non scritto è peggio di nessun documento.
 *
 * Torna il percorso del documento nato, che al guscio serve: è lui a ricordare
 * l'ultimo documento aperto e a dichiarare la cartella di lavoro, e il file
 * può nascere ovunque — il dialogo «salva con nome» non ha nessun obbligo di
 * restare dov'era quello di prima. Torna `null` se non è nato niente: un anno
 * rifiutato dalla validazione, o il dialogo annullato.
 */
export async function creaPrimoAnno (inizio: string, fine: string): Promise<string | null> {
  const archivio = archivioAttivo
  if (!archivio) return null
  // `'programma'`: parte da un comando del registro, non dal pannello. Era
  // una delle due origini dichiarate in `Origine` che non le scriveva
  // nessuno, e ogni scrittura partita di qui finiva nel giornale marcata
  // «pannello».
  const esito = await esegui(archivio, { tipo: 'anno.crea', inizio, fine }, 'programma')
  if (!esito.ok) {
    void apparato.dialoghi.errore(`Registro: ${(esito.errori ?? []).join(' ')}`)
    return null
  }
  // Il dialogo «salva con nome» annullato: non c'è nessun documento e nessun
  // anno. Aprire il registro su niente mostrerebbe un anno vuoto che non sta
  // in nessun file, e la prima cosa scritta lì dentro non avrebbe dove andare.
  if (!esito.creato) return null
  await archivio.salva()
  // Sull'avvio guidato e non sul calendario vuoto: un registro appena nato non
  // ha classi né corsi, e il calendario non avrebbe niente da mostrare.
  apriRegistro({ tipo: 'naviga', vista: 'corsi', avvio: true })
  return archivio.documentoAperto?.fsPath ?? null
}

/**
 * Chiude il documento aperto e lascia il registro senza anno.
 *
 * È il gesto che mancava: fin qui da un documento si poteva solo passare a un
 * altro: «Apri un anno…». Chiudere e basta serve tutte le volte che il
 * documento deve restare libero — una cartella sincronizzata da far salire, una
 * copia da portare via su una chiavetta, l'anno aperto sul computer di casa che
 * si vuole riprendere da scuola. Finché il registro lo tiene aperto, accanto al
 * file c'è la sua serratura, e l'altra macchina annuncia un anno occupato.
 *
 * Il pannello e la proiezione se ne vanno per primi: mostrano i dati dell'anno
 * che si sta lasciando, e una finestra che continua a mostrare le lezioni di un
 * documento chiuso è peggio di una finestra chiusa. Quel che resta — l'icona
 * accanto all'orologio, il widget sul desktop — sa già stare senza un anno.
 *
 * Poi tocca al guscio: è lui a dimenticare l'ultimo documento e a rimettere
 * davanti il benvenuto. Vedi `registroDocenti.chiudiDocumento`, in
 * `shell/main.ts`.
 */
export async function chiudiDocumentoAperto (): Promise<void> {
  const archivio = archivioAttivo
  if (!archivio) return
  PannelloProiezione.chiudi()
  PannelloRegistro.chiudi()
  // `chiudi` scrive l'ultimo salvataggio e lascia il documento libero; `apri`
  // con niente in mano svuota quel che resta in memoria, o il registro
  // continuerebbe a rispondere con le lezioni di un anno che non ha più.
  await archivio.chiudi()
  await archivio.apri(null)
}

/**
 * Chiude il registro, nell'ordine in cui va chiuso.
 *
 * L'ordine è tutto, ed è questo: **prima si chiudono le porte da cui entra
 * lavoro nuovo, poi si aspetta quel che è già entrato, e per ultimo si consegna
 * l'archivio al disco.** Fino a qui le porte chiuse erano due — il vassoio e il
 * condotto — e il lavoro aspettato era uno solo, quello del condotto. Restavano
 * fuori tre code che scrivono, e tutte e tre più lente di quella:
 *
 *  - la coda del pannello, che continuava a eseguire una richiesta partita un
 *    istante prima di «Esci»;
 *  - la coda dei PDF di `actions/reports.ts`, che può avere un rapporto a metà
 *    — e un PDF troncato nella cartella del docente nessuno lo riconosce come
 *    troncato, domani;
 *  - la coda dell'OCR, che è la peggiore: una pagina letta arriva a
 *    `archivio.modifica` **minuti** dopo essere stata accodata, e se ci arriva
 *    dopo `lasciaPacchetto()` quei minuti di lettura spariscono in silenzio.
 *
 * E per ultimo `contesto.subscriptions`, che due commenti di questo file
 * dichiaravano svuotato allo spegnimento mentre non lo svuotava nessuno: li
 * uccideva `app.exit(0)`. Per ultimo e non per primo perché là dentro c'è
 * l'archivio, e il suo `dispose` lancia una chiusura d'emergenza che non
 * aspetta nessuno — arrivandoci dopo `chiudi()` non trova più niente da fare,
 * che è quel che si vuole.
 */
export async function spegni (): Promise<void> {
  // Le letture delle scansioni per prime: girano in un programma a parte, e una
  // pagina può tenerlo occupato fino a tre minuti. Chi sta uscendo non aspetta.
  fermaLetture()

  // L'icona per prima: si toglie subito, prima dell'ultimo salvataggio, perché
  // fra la richiesta di uscire e l'uscita vera passa il tempo di scrivere i
  // file — e in quel tempo l'icona è ancora lì, con un menu che promette cose
  // che non succederanno più.
  apriPannello = null
  vassoioAttivo?.dispose()
  vassoioAttivo = null

  // E la striscia sul desktop, per una ragione più forte: finché è registrata
  // presso la shell, l'area di lavoro resta più stretta di quanto sia lo
  // schermo. Uscendo senza toglierla, il desktop resterebbe con una colonna
  // vuota a destra e nessuna finestra massimizzata ci arriverebbe più — e non
  // ci sarebbe più niente da chiudere per rimediare. `subscriptions` adesso si
  // svuota davvero, ma **in fondo** a questa funzione: fra qui e là ci sono le
  // code da aspettare, e in quei secondi il desktop sarebbe già stretto. Questa
  // riga resta quel che toglie la striscia subito.
  chiudiAgenda()

  // E il condotto, prima dell'ultimo salvataggio e non dopo. Chiuso dopo, una
  // chiamata arrivata nel frattempo entrerebbe nell'archivio proprio mentre lo
  // si sta scrivendo su disco: la modifica non finirebbe in nessun file, e chi
  // l'ha mandata avrebbe ricevuto un «fatto». Tolto il condotto, da fuori non
  // entra più niente e quel che c'è si può consegnare in pace.
  //
  // E lo si **aspetta**. Per un pezzo qui c'era un `dispose` sincrono che
  // distruggeva le prese: la chiamata già in coda però non si annullava, e
  // proseguiva — toccava l'archivio dopo la chiusura, e poi trovava la presa
  // distrutta e non rispondeva niente. Il difetto che quest'ordine voleva
  // evitare c'era ancora, rovesciato: la modifica entrava *dopo*, e chi
  // l'aveva mandata riceveva il nulla al posto di «fatto».
  await chiudiCondotto()

  // Il pannello: la finestra se ne va, ma quel che la pagina aveva già chiesto
  // sta girando, e `eseguiRichiesta` scrive. Si chiude e si aspetta, in
  // quest'ordine — chiudere dopo vorrebbe dire lasciar partire una richiesta in
  // più mentre si aspettano quelle di prima.
  PannelloRegistro.chiudi()
  await PannelloRegistro.attendiScritture()

  // La coda dell'OCR: si ferma davvero — il segnale arriva fino al programma
  // esterno — e poi si aspetta quel che resta del giro. Fra `leggiImmagine` e
  // `archivio.modifica` ci sono la fotografia da scrivere e la bozza da rifare,
  // ed è lì che una pagina già letta si perdeva.
  const smistatore = smistatoreAttivo
  smistatoreAttivo = null
  await smistatore?.fermaEAspetta()

  // La coda dei PDF: il timer si spegne — quel che aspettava non era ancora
  // cominciato, e lo rifarà la prima modifica del prossimo avvio — e quel che
  // sta già scrivendo si aspetta, perché un rapporto a metà è un PDF rotto
  // nella cartella del docente.
  await fermaRapporti()

  // I salvataggi sono ritardati di mezzo secondo: se l'applicazione si chiude in quel
  // mezzo secondo, l'ultima modifica se ne andrebbe. `Archivio.dispose` la
  // scrittura la lancia, ma non la aspetta — e il processo può morire prima.
  // Qui invece si aspetta, ed è il guscio a fermare l'uscita perché si possa.
  const archivio = archivioAttivo
  archivioAttivo = null
  // Chiudere e non solo salvare: il documento dell’anno va lasciato libero,
  // o la sua serratura resterebbe accanto al file e la prossima apertura
  // annuncerebbe un registro aperto altrove che invece è solo finito male.
  await archivio?.chiudi()

  // E per ultimo le iscrizioni, che due commenti di questo file danno per
  // svuotate allo spegnimento da quando esistono. Adesso è vero.
  //
  // Per ultimo, e non è indifferente: là dentro c'è l'archivio, e il suo
  // `dispose` lancia un `chiudi()` d'emergenza che nessuno aspetta — arrivandoci
  // dopo quello vero non trova più niente da fare. Ci sono anche i comandi, gli
  // osservatori del documento e le iscrizioni al giornale: quel che resta da
  // fare è **smettere di ascoltare**, e da qui in poi non deve più arrivare
  // niente. Un `dispose` che solleva non ferma gli altri: è l'ultima cosa che
  // il registro fa, e farla a metà sarebbe peggio che non farla.
  const contesto = contestoAttivo
  contestoAttivo = null
  while (contesto && contesto.subscriptions.length > 0) {
    try {
      contesto.subscriptions.pop()?.dispose()
    } catch (guasto) {
      console.error('smaltimento di un’iscrizione allo spegnimento', guasto)
    }
  }
}
