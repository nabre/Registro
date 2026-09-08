// Punto d'ingresso dell'estensione: accende l'archivio, registra le viste e i
// comandi, e — se il registro è già stato usato in questa cartella — apre il
// pannello da solo.
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
import { formattaData, oggi, semestreDi } from './dominio/date.js'
import { creaAnnoCorrente } from './dominio/fabbriche.js'
import { annoDelCorso, corsoDellaLezione, nomeDelPiano } from './dominio/corsi.js'
import { PannelloRegistro } from './pannello.js'
import { avviaProiezione, PannelloProiezione } from './pannelloProiezione.js'
import type { MessaggioNavigazione } from './protocollo.js'
import { AlberoRegistro, type Nodo } from './vista/alberoRegistro.js'
import { BarraStato } from './vista/barraStato.js'

/** L'archivio della finestra: serve a `deactivate` per l'ultimo salvataggio. */
let archivioAttivo: Archivio | null = null

export async function activate (contesto: vscode.ExtensionContext): Promise<void> {
  // Il portachiavi del sistema, che è dove sta la password della casella: va
  // consegnato prima di ogni altra cosa, perché il primo stato spinto al
  // pannello deve già sapere se la casella è collegata.
  registraPortachiavi(contesto.secrets)
  contesto.subscriptions.push(registraPortachiaviOauth(contesto.secrets))

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

  const albero = new AlberoRegistro(archivio)
  contesto.subscriptions.push(
    vscode.window.createTreeView('registroDocenti.albero', { treeDataProvider: albero }),
    new BarraStato(archivio),
  )

  // Una volta sola: nel webview se il pannello è aperto, altrimenti con la
  // finestra di VS Code. `PannelloRegistro.avvisa` decide da sé — è la stessa
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
  comando('registroDocenti.apriElemento', (navigazione: MessaggioNavigazione) => apri(navigazione))
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

  /**
   * Il piano di una lezione, dall'albero. Si sceglie: bozza vuota da riempire,
   * oppure copia di un piano che c'è già — quasi sempre quello dell'anno prima
   * o della classe parallela, che è il modo in cui un piano si riusa davvero.
   */
  comando('registroDocenti.pianoPerLezione', async (nodo?: Nodo) => {
    const registro = archivio.registro
    const lezione =
      nodo && nodo.genere === 'lezione'
        ? registro.lezioni.find((l) => l.id === nodo.lezione.id) ?? null
        : null
    if (!lezione) {
      void vscode.window.showWarningMessage('Registro: selezionare una lezione nell’albero.')
      return
    }
    if (lezione.pianoId) {
      void vscode.window.showInformationMessage('Registro: questa lezione ha già un piano.')
      return
    }

    const corso = corsoDellaLezione(registro, lezione)
    // Prima i piani di questo corso: sono quelli che c'entrano davvero. Gli
    // altri restano in fondo, perché prendere il piano di un altro corso è la
    // via normale del riuso — si duplica e si adatta — e non si filtra per anno:
    // il piano dell'anno scorso è proprio quel che si cerca oggi.
    const candidati = [...registro.piani].sort((a, b) => {
      const suo = (p: typeof a) => (corso && p.corsoId === corso.id ? 0 : 1)
      return suo(a) - suo(b) || b.aggiornatoIl.localeCompare(a.aggiornatoIl)
    })

    const scelta = await vscode.window.showQuickPick(
      [
        { label: '$(add) Piano vuoto da completare', pianoId: null as string | null },
        ...candidati.map((piano) => ({
          label: `$(copy) ${nomeDelPiano(registro, piano)}`,
          description:
            (corso && piano.corsoId === corso.id ? 'di questo corso · ' : 'da duplicare · ') +
            `${piano.attivita.length} attività`,
          pianoId: piano.id as string | null,
        })),
      ],
      { title: 'Piano per la lezione', placeHolder: 'Da zero, oppure copiando un piano esistente' },
    )
    if (!scelta) return

    const esito = await esegui(archivio, {
      tipo: 'piano.perLezione',
      lezioneId: lezione.id,
      daPianoId: scelta.pianoId,
    })
    if (!esito.ok) {
      void vscode.window.showErrorMessage(`Registro: ${(esito.errori ?? []).join(' ')}`)
      return
    }
    await archivio.salva()
    if (esito.creato) apri({ tipo: 'naviga', vista: 'piani', elementoId: esito.creato.id })
  })

  /** Le voci del menu contestuale su una lezione dell'albero: apri, duplica, elimina. */
  comando('registroDocenti.lezioneApri', (nodo?: Nodo) => {
    if (!nodo || nodo.genere !== 'lezione') return
    apri({ tipo: 'naviga', vista: 'lezione', elementoId: nodo.lezione.id })
  })

  comando('registroDocenti.lezioneDuplica', async (nodo?: Nodo) => {
    if (!nodo || nodo.genere !== 'lezione') return
    const data = await vscode.window.showInputBox({
      title: 'Duplica la lezione',
      value: nodo.lezione.data,
      prompt: 'La data della copia, formato AAAA-MM-GG',
      validateInput: (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? null : 'Serve una data AAAA-MM-GG'),
    })
    if (!data) return
    const esito = await esegui(archivio, {
      tipo: 'lezione.duplica',
      lezioneId: nodo.lezione.id,
      data,
    })
    if (!esito.ok) {
      void vscode.window.showErrorMessage(`Registro: ${(esito.errori ?? []).join(' ')}`)
      return
    }
    await archivio.salva()
    if (esito.creato) apri({ tipo: 'naviga', vista: 'lezione', elementoId: esito.creato.id })
  })

  comando('registroDocenti.lezioneElimina', async (nodo?: Nodo) => {
    if (!nodo || nodo.genere !== 'lezione') return
    // La stessa domanda che farebbe il pannello: che cosa sparisce con lei.
    const conferma = await vscode.window.showWarningMessage(
      `Eliminare la lezione del ${formattaData(nodo.lezione.data)}? Appello, osservazioni e consuntivo si perdono.`,
      { modal: true },
      'Elimina',
    )
    if (conferma !== 'Elimina') return
    const esito = await esegui(archivio, { tipo: 'lezione.elimina', lezioneId: nodo.lezione.id })
    if (!esito.ok) {
      void vscode.window.showErrorMessage(`Registro: ${(esito.errori ?? []).join(' ')}`)
      return
    }
    await archivio.salva()
  })

  /** Un momento di valutazione nuovo, aperto già sul corso da cui si è partiti. */
  comando('registroDocenti.valutazioneDelCorso', (nodo?: Nodo) => {
    if (!nodo || nodo.genere !== 'corso') return
    apri({ tipo: 'naviga', vista: 'valutazioni', nuovo: true, elementoId: nodo.corso.id })
  })

  /** Le ore che l'orario del corso prevede, dall'albero invece che dal modulo del corso. */
  comando('registroDocenti.orarioGenera', async (nodo?: Nodo) => {
    if (!nodo || nodo.genere !== 'corso') return
    const corso = nodo.corso
    if (corso.orario.length === 0) {
      void vscode.window.showWarningMessage(
        'Registro: questo corso non ha ancora un orario: prima si dichiarano le ore fisse.',
      )
      return
    }
    const anno = annoDelCorso(archivio.registro, corso)
    const chiediData = async (titolo: string, valore: string) =>
      vscode.window.showInputBox({
        title: titolo,
        value: valore,
        prompt: 'Formato AAAA-MM-GG',
        validateInput: (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? null : 'Serve una data AAAA-MM-GG'),
      })
    const dal = await chiediData('Genera le ore dal', anno?.inizio ?? oggi())
    if (!dal) return
    const al = await chiediData('Fino al', anno?.fine ?? oggi())
    if (!al) return

    const esito = await esegui(archivio, { tipo: 'orario.genera', corsoId: corso.id, dal, al })
    if (!esito.ok) {
      void vscode.window.showErrorMessage(`Registro: ${(esito.errori ?? []).join(' ')}`)
      return
    }
    await archivio.salva()
    if (esito.messaggio) void vscode.window.showInformationMessage(`Registro: ${esito.messaggio.testo}`)
  })

  /**
   * Le presenze di un corso, esportate in CSV dall'albero.
   *
   * Del corso e non della classe: le ore sono di un insegnamento, e le assenze
   * di due materie sommate danno una percentuale che non vale per nessuna
   * delle due.
   */
  comando('registroDocenti.corsoEsportaPresenze', async (nodo?: Nodo) => {
    if (!nodo || nodo.genere !== 'corso') return
    // Dall'albero non c'è un semestre scelto sotto gli occhi: si prende quello
    // in cui cade oggi, che è quello di cui si sta parlando.
    const anno = annoDelCorso(archivio.registro, nodo.corso)
    const esito = await esegui(archivio, {
      tipo: 'esporta.presenze',
      corsoId: nodo.corso.id,
      semestreId: (anno ? semestreDi(anno, oggi()) : null)?.id ?? null,
    })
    if (!esito.ok) void vscode.window.showErrorMessage(`Registro: ${(esito.errori ?? []).join(' ')}`)
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

  // L'albero è già iscritto a `alCambiamento`: la ricarica lo aggiorna da
  // sola, senza bisogno di dirglielo qui.
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
      // L'albero è già iscritto a `alCambiamento`, che `archivio.carica()`
      // ha appena emesso: si aggiorna da solo.
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

export async function deactivate (): Promise<void> {
  // I salvataggi sono ritardati di mezzo secondo: se VS Code si chiude in quel
  // mezzo secondo, l'ultima modifica se ne andrebbe. `Archivio.dispose` la
  // scrittura la lancia, ma non la aspetta — e il processo può morire prima.
  // Qui invece si aspetta: è l'unico punto in cui VS Code ci concede di farlo.
  const archivio = archivioAttivo
  archivioAttivo = null
  await archivio?.salva()
}
