// Il registro che si accende: archivio, comandi, smistamento della cassetta, e
// — se il registro è già stato usato in questa cartella — il pannello aperto da
// solo.
//
// È il confine fra il guscio e il registro. Sopra c'è `guscio/principale.ts`,
// che sa di Electron e non sa niente di lezioni; sotto c'è tutto il resto, che
// sa di lezioni e non sa niente di Electron. Le due funzioni qui esportate sono
// l'unica porta fra i due.
//
// L'apertura automatica ha una regola: si apre solo se la cartella dei dati
// esiste. In un workspace che col registro non c'entra nulla, l'estensione
// resta invisibile; nella cartella del docente si trova il registro già aperto
// senza doverlo chiedere.

import { pathToFileURL } from 'node:url'

import * as vscode from 'vscode'

import { esegui } from './azioni.js'
import { migraAnni } from './dati/anni.js'
import { Archivio } from './dati/archivio.js'
import { migraArchivio } from './dati/archiviazione.js'
import { cartellaAnno, cartellaDati, cartellaInArrivo } from './dati/percorsi.js'
import { impostaWorker } from './dati/pdf.js'
import { registraPortachiavi } from './dati/exchange.js'
import { registraPortachiaviOauth } from './dati/oauth.js'
import { azzeraPosta, collegaAccount, provaCollegamento, scollegaAccount } from './dati/posta.js'
import { smistatoreDi } from './dati/smistatore.js'
import { oggi } from './dominio/date.js'
import { creaAnnoCorrente } from './dominio/fabbriche.js'
import { PannelloRegistro } from './pannelli/pannello.js'
import { avviaPromemoria } from './promemoria.js'
import { avviaProiezione, PannelloProiezione } from './pannelli/proiezione.js'
import { avviaVassoio } from './vassoio.js'
import type { MessaggioNavigazione } from './protocollo.js'

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
let vassoioAttivo: vscode.Disposable | null = null

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

export async function avvia (contesto: vscode.ExtensionContext): Promise<void> {
  // Il portachiavi del sistema, che è dove sta la password della casella: va
  // consegnato prima di ogni altra cosa, perché il primo stato spinto al
  // pannello deve già sapere se la casella è collegata.
  registraPortachiavi(contesto.secrets)
  registraPortachiaviOauth(contesto.secrets)

  const archivio = new Archivio()
  archivioAttivo = archivio
  contesto.subscriptions.push(archivio)

  // Prima di leggere: se questa cartella è ancora quella di prima — i nove
  // JSON tutti insieme, con gli anni mescolati dentro — si divide per anno.
  // Va fatto qui e non dopo il caricamento perché `Archivio` sa leggere solo
  // la disposizione nuova: aprirlo prima vorrebbe dire mostrare un registro
  // vuoto per il tempo della migrazione, e spaventare chi guarda.
  const migrati = await migraAnni()

  await archivio.carica()

  if (migrati) {
    void vscode.window.showInformationMessage(
      migrati.anni.length === 1
        ? `Registro: i dati sono ora nella cartella «${migrati.corrente}», una per anno scolastico.`
        : `Registro: i dati sono stati divisi in ${migrati.anni.length} cartelle, una per anno scolastico. In uso: «${migrati.corrente}».`,
    )
  }

  // Una volta sola: nel webview se il pannello è aperto, altrimenti con la
  // finestra di sistema. `PannelloRegistro.avvisa` decide da sé — è la stessa
  // regola che vale per gli errori di un'azione, e viverla in due posti
  // diversi è come tenerla scritta in due posti diversi.
  contesto.subscriptions.push(archivio.allErrore((testo) => PannelloRegistro.avvisa(testo)))

  // Lo smistamento dei PDF che arrivano nella cassetta. Il worker di pdfjs si
  // dichiara prima di qualunque lettura: sta accanto al codice dell'estensione,
  // e senza il suo percorso la prima pagina letta fallirebbe.
  impostaWorker(
    pathToFileURL(
      vscode.Uri.joinPath(contesto.extensionUri, 'dist', 'pdf.worker.mjs').fsPath,
    ).href,
  )
  // I file archiviati con la disposizione di prima si spostano nell'archivio
  // nuovo alla prima apertura: una volta sola, e senza chiedere niente a
  // nessuno — un riferimento che punta al posto sbagliato è peggio di
  // un'attesa di due secondi all'avvio.
  void migraArchivio(archivio).then((spostati) => {
    if (spostati > 0) {
      void vscode.window.showInformationMessage(
        `Registro: ${spostati} documenti rimessi in ordine sotto «documentazione/», per classe, corso e documento.`,
      )
    }
  })

  const smistatore = smistatoreDi(archivio)
  contesto.subscriptions.push(smistatore)
  smistatore.alTermine((testo) => void vscode.window.showInformationMessage(`Registro: ${testo}`))

  // Lo schermo per la classe: da qui in poi si può aprire. Le sue azioni
  // arrivano dal webview e hanno in mano l'archivio, non il contesto
  // dell'estensione — glielo si mette da parte qui, una volta sola.
  avviaProiezione(contesto, archivio)

  const apri = (navigazione?: MessaggioNavigazione) =>
    PannelloRegistro.mostra(contesto, archivio, navigazione)
  apriPannello = apri

  // I promemoria: una notifica del sistema poco prima che una lezione cominci,
  // con quel che resta aperto per quel corso. Premendola si apre il registro di
  // quell'ora — ed è il gesto che serve, perché la notifica arriva proprio nel
  // momento in cui si prende il computer in mano.
  contesto.subscriptions.push(
    avviaPromemoria(archivio, (lezioneId) => {
      apri({ tipo: 'naviga', vista: 'lezione', elementoId: lezioneId })
    }),
  )

  // L'icona accanto all'orologio: i corsi dell'anno, e dentro ognuno le sue ore
  // divise fra quel che è fatto, quel che è rimasto aperto e quel che viene.
  // Ci finisce anche l'uscita dall'applicazione, che con il vassoio acceso non
  // è più la X della finestra — vedi `guscio/principale.ts`.
  vassoioAttivo = avviaVassoio(archivio, apri)
  contesto.subscriptions.push(vassoioAttivo)

  const comando = (nome: string, esecuzione: (...argomenti: never[]) => unknown) =>
    contesto.subscriptions.push(vscode.commands.registerCommand(nome, esecuzione))

  comando('registroDocenti.apri', () => apri())
  comando('registroDocenti.guida', () => apri({ tipo: 'naviga', vista: 'guida' }))
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

  comando('registroDocenti.nuovoAnno', async () => {
    // L'anno proposto è quello che comprende oggi: nove volte su dieci è quello.
    const proposto = creaAnnoCorrente()
    const conferma = await vscode.window.showQuickPick(
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
        vscode.window.showInputBox({
          title: titolo,
          value: valore,
          prompt: 'Formato AAAA-MM-GG',
          validateInput: (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? null : 'Serve una data AAAA-MM-GG'),
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
    const esito = await esegui(archivio, { tipo: 'anno.crea', inizio, fine })
    if (!esito.ok) {
      void vscode.window.showErrorMessage(`Registro: ${(esito.errori ?? []).join(' ')}`)
      return
    }
    await archivio.salva()
    if (esito.creato) apri({ tipo: 'naviga', vista: 'impostazioni', elementoId: esito.creato.id })
  })

  comando('registroDocenti.apriInArrivo', async () => {
    const cassetta = cartellaInArrivo()
    if (!cassetta) {
      void vscode.window.showWarningMessage('Registro: nessuna cartella di lavoro aperta.')
      return
    }
    await smistatore.preparaCartelle()
    await vscode.commands.executeCommand('revealFileInOS', cassetta)
  })

  // Il pannello è già iscritto a `alCambiamento`: la ricarica gli fa arrivare
  // lo stato nuovo da sé, senza bisogno di dirglielo qui.
  comando('registroDocenti.ricarica', async () => {
    await archivio.carica()
  })

  // «Collegato a che cosa?»: la domanda che si fa prima di accendere l'invio
  // diretto, e che fin qui si poteva verificare solo mandando una mail vera a
  // qualcuno. Sta anche nella scheda Posta delle impostazioni; qui serve a chi
  // il pannello non ce l'ha aperto.
  comando('registroDocenti.provaPosta', async () => {
    const esito = await provaCollegamento()
    const mostra =
      esito.livello === 'errore'
        ? vscode.window.showErrorMessage
        : esito.livello === 'avviso'
          ? vscode.window.showWarningMessage
          : vscode.window.showInformationMessage
    void mostra(`Registro — posta: ${esito.testo}`)
  })

  // Collegare la casella: l'indirizzo e la password, provati sul server prima
  // di essere salvati. La password va nel portachiavi del sistema e non nelle
  // impostazioni, che sono un file in chiaro dentro il workspace.
  comando('registroDocenti.collegaPosta', async () => {
    const stato = await collegaAccount()
    if (!stato) return
    const mostra =
      stato.livello === 'errore'
        ? vscode.window.showErrorMessage
        : stato.livello === 'avviso'
          ? vscode.window.showWarningMessage
          : vscode.window.showInformationMessage
    void mostra(`Registro — posta: ${stato.testo}`)
  })

  comando('registroDocenti.scollegaPosta', async () => {
    const stato = await scollegaAccount()
    void vscode.window.showInformationMessage(`Registro — posta: ${stato.testo}`)
  })

  // Azzerare tutto: portachiavi, memoria, impostazioni. È la mossa di quando
  // «non funziona» e non si sa più che cosa sia rimasto in giro da un tentativo
  // precedente. Si chiede conferma perché toglie anche l'indirizzo e l'ID
  // applicazione, che poi vanno riscritti.
  comando('registroDocenti.azzeraPosta', async () => {
    const azzera = 'Azzera'
    const scelta = await vscode.window.showWarningMessage(
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
    void vscode.window.showInformationMessage(`Registro — posta: ${stato.testo}`)
  })

  // La cartella dell'anno in uso, che è quella in cui si va a cercare: i JSON,
  // la documentazione, la cassetta. Senza un anno si apre la radice, che è
  // l'unica cosa che c'è.
  comando('registroDocenti.apriCartellaDati', async () => {
    const cartella = cartellaAnno() ?? cartellaDati()
    if (!cartella) {
      void vscode.window.showWarningMessage('Registro: nessuna cartella di lavoro aperta.')
      return
    }
    await vscode.workspace.fs.createDirectory(cartella)
    await vscode.commands.executeCommand('revealFileInOS', cartella)
  })

  // Un cambio di cartella dei dati riparte da capo: altro registro, altri file.
  // L'osservatore vecchio va chiuso, non solo sostituito: `subscriptions` viene
  // svuotato allo spegnimento, e accodarci un osservatore a ogni cambio di
  // impostazione lo farebbe crescere per tutta la sessione.
  let osservatore = archivio.osserva()
  let cassetta = smistatore.osserva()
  contesto.subscriptions.push(
    new vscode.Disposable(() => osservatore.dispose()),
    new vscode.Disposable(() => cassetta.dispose()),
    vscode.workspace.onDidChangeConfiguration(async (evento) => {
      if (!evento.affectsConfiguration('registroDocenti.cartellaDati')) return
      await archivio.carica()
      osservatore.dispose()
      osservatore = archivio.osserva()
      cassetta.dispose()
      cassetta = smistatore.osserva()
      await smistatore.preparaCartelle()
      // Il pannello, se aperto, teneva le immagini della cartella vecchia
      // nei `localResourceRoots`: senza aggiornarli, i piani di una classe
      // caricata dalla cartella nuova mostrerebbero le risorse come sparite.
      PannelloRegistro.aggiornaRisorse()
    }),
  )

  // Le cartelle della cassetta seguono le richieste di documenti aperte: se ne
  // apre una nuova, la cartella in cui buttarne i PDF c'è già. Si rifà a ogni
  // cambiamento con un ritardo, perché un consuntivo scritto a tastiera produce
  // una modifica per tasto e non ha senso rileggere l'elenco a ogni lettera.
  let ritardoCartelle: NodeJS.Timeout | null = null
  // Anche la cassetta sta dentro l'anno: aprendone un altro, quella da tenere
  // d'occhio è un'altra cartella. Senza questo, un PDF lasciato cadere dopo un
  // cambio d'anno resterebbe lì finché non si riavvia l'editor.
  let annoOsservato = archivio.cartellaCorrente
  contesto.subscriptions.push(
    archivio.alCambiamento(() => {
      if (archivio.cartellaCorrente !== annoOsservato) {
        annoOsservato = archivio.cartellaCorrente
        cassetta.dispose()
        cassetta = smistatore.osserva()
        void smistatore.preparaCartelle()
        // I file che il pannello mostra stanno dentro l'anno: aprendone un
        // altro, la sandbox del webview e la radice con cui compone gli
        // indirizzi vanno rifatte, o le immagini della classe appena caricata
        // risulterebbero sparite.
        PannelloRegistro.aggiornaRisorse()
      }
      if (ritardoCartelle) clearTimeout(ritardoCartelle)
      ritardoCartelle = setTimeout(() => void smistatore.preparaCartelle(), 2000)
    }),
    new vscode.Disposable(() => {
      if (ritardoCartelle) clearTimeout(ritardoCartelle)
    }),
  )

  // Le cartelle prima, gli arretrati dopo: un PDF lasciato lì a computer spento
  // deve essere smistato all'accensione, non alla prossima volta che si tocca.
  if (await archivio.esiste()) {
    await smistatore.preparaCartelle()
    void smistatore.recuperaArretrati()
  }

  const apertura = vscode.workspace.getConfiguration('registroDocenti').get<boolean>('aperturaAutomatica', true)
  if (apertura && (await archivio.esiste())) apri()
}

export async function spegni (): Promise<void> {
  // L'icona per prima: si toglie subito, prima dell'ultimo salvataggio, perché
  // fra la richiesta di uscire e l'uscita vera passa il tempo di scrivere i
  // file — e in quel tempo l'icona è ancora lì, con un menu che promette cose
  // che non succederanno più.
  apriPannello = null
  vassoioAttivo?.dispose()
  vassoioAttivo = null

  // I salvataggi sono ritardati di mezzo secondo: se l'applicazione si chiude in quel
  // mezzo secondo, l'ultima modifica se ne andrebbe. `Archivio.dispose` la
  // scrittura la lancia, ma non la aspetta — e il processo può morire prima.
  // Qui invece si aspetta, ed è il guscio a fermare l'uscita perché si possa.
  const archivio = archivioAttivo
  archivioAttivo = null
  await archivio?.salva()
}
