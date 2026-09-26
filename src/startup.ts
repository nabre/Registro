// Accensione e spegnimento del registro: archivio, comandi, smistamento dei PDF,
// vassoio, condotto, e il pannello aperto se c'è un documento. È la porta fra il
// guscio (`shell/main.ts`, che sa di Electron) e il resto, che non ne sa niente.

import { pathToFileURL } from 'node:url'

import * as apparato from 'apparato'
import {
  documentiNoti, ricordaEtichetta, segnaDocumentoAperto, verificaDocumenti,
} from './environment/documents.js'

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
import {
  ANNI_NUOVI,
  ESTENSIONE,
  cartellaAnno,
  cartellaDelProvvisorio,
  cartellaDellUltimoDocumento,
  cartellaDocumento,
  impostaCartellaProvvisori,
  nomeDelPacchetto,
  percorsoPacchetto,
  èProvvisorio,
} from './data/paths.js'
import { impostaCaratteri, impostaWorker } from './data/pdf.js'
import { fermaDettature, ritiraCorredoWhisper } from './data/dictation.js'
import { fermaLetture } from './data/ocr.js'
import { ripulisciTemporaneiVecchi } from './data/temporaryFiles.js'
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
import { formattaData, isoValida, oggi } from './domain/dates.js'
import type { Iso, Sospensione } from './domain/models.js'
import {
  anniDaProporre, chiusureUfficiali, type AnnoUfficiale,
} from './domain/schoolCalendar.js'
import { CALENDARIO_TICINO } from './data/schoolCalendarTicino.js'
import { creaAnnoCorrente } from './domain/factories.js'
import { PannelloRegistro } from './panels/panel.js'
import { avviaPromemoria } from './reminders.js'
import { avviaAssistente } from './panels/assistant.js'
import { avviaProiezione, PannelloProiezione } from './panels/projection.js'
import { avviaVassoio } from './tray.js'
import type { MessaggioNavigazione } from './protocol.js'
import { firmaPosta } from './data/templates.js'
import { istante } from './i18n/index.js'
import { parole } from './domain/words.testi.js'
import { testi } from './startup.testi.js'

/** L'archivio della finestra: serve a `spegni` per l'ultimo salvataggio. */
let archivioAttivo: Archivio | null = null

/** Il vassoio: `spegni` toglie l'icona prima di uscire, o Windows la lascia nel cassetto. */
let vassoioAttivo: apparato.Smaltitore | null = null

/** Il condotto: `spegni` lo chiude prima dell'ultimo salvataggio, perché nessuna chiamata entri durante. */
let condottoAttivo: Condotto | null = null

/** Lo smistatore: la sua coda OCR può scrivere minuti dopo, `spegni` la ferma prima di lasciare il pacchetto. */
let smistatoreAttivo: Smistatore | null = null

/** Il contesto dell'applicazione: `spegni` ne smaltisce le `subscriptions` per ultimo. */
let contestoAttivo: apparato.ContestoApplicazione | null = null

/** Apre il condotto; se il nome è già preso il registro parte lo stesso e la console lo dice. */
async function apriCondotto (archivio: Archivio, cartellaUtente: string): Promise<Condotto | null> {
  return avviaCondotto(archivio, { cartellaUtente }).catch((errore: unknown) => {
    console.error('apertura del condotto', errore)
    return null
  })
}

/** Chiude il condotto aspettando le chiamate già cominciate, che toccano l'archivio comunque e meritano risposta. */
async function chiudiCondotto (): Promise<void> {
  const condotto = condottoAttivo
  condottoAttivo = null
  condotto?.dispose()
  await condotto?.svuotato()
}

/**
 * Apre o chiude il condotto quando cambia l'interruttore, senza aspettare il
 * riavvio (i permessi si rileggono già a ogni chiamata, in `conduit.ts`). Si
 * riapre solo se lo stato di apertura cambia, e le riaperture si accodano
 * perché due `listen` sullo stesso nome si scontrerebbero.
 */
function osservaCondotto (archivio: Archivio, cartellaUtente: string): apparato.Smaltitore {
  // Tenuto a parte e non dedotto da `condottoAttivo`: da spento `avviaCondotto`
  // torna comunque qualcosa da smaltire, che non è una pipe in ascolto.
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

/** Come il guscio apre il pannello da fuori (es. una seconda copia lanciata); `null` prima di `avvia`. */
let apriPannello: ((navigazione?: MessaggioNavigazione) => void) | null = null

export function apriRegistro (navigazione?: MessaggioNavigazione): void {
  apriPannello?.(navigazione)
}

/** Oltre questa soglia una chiamata finisce nel giornale anche se è riuscita. */
const LENTA_MS = 2000

/**
 * Accende il registro su un documento, o senza anno se è `null`. `annuncia`
 * riceve le fasi lunghe da mostrare nel riquadro d'avvio (`shell/windows/splash.ts`).
 */
export async function avvia (
  contesto: apparato.ContestoApplicazione,
  documento: apparato.Uri | null = null,
  annuncia: (fase: string) => void = () => undefined,
): Promise<void> {
  contestoAttivo = contesto

  // Temporanei lasciati da lavori interrotti: senza attendere, non solleva mai.
  void ripulisciTemporaneiVecchi()
  // Il corredo di whisper.cpp non serve più alla dettatura (voicebox): si toglie.
  void ritiraCorredoWhisper()

  // Prima di tutto: il primo stato spinto al pannello deve già sapere se la
  // casella di posta è collegata.
  registraPortachiaviOauth(contesto.secrets)

  // Il giornale delle chiamate, acceso prima di aprire un documento per vedere
  // anche i guasti d'avvio. Solo rifiuti e chiamate lente, e solo in console:
  // un giornale su disco direbbe quando un docente ha aperto quale classe.
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

  // Il deposito tiene le copie materializzate nella cartella dell'utente, fuori
  // da quella sincronizzata.
  const archivio = new Archivio(contesto.globalStorageUri)
  // Gli anni nuovi nascono qui finché non li si salva con nome: vedi `paths.ts`.
  impostaCartellaProvvisori(apparato.Uri.joinPath(contesto.globalStorageUri, ANNI_NUOVI))
  // Chi archivia un documento (`filing.ts`, le azioni) scrive nel documento dell'anno.
  registraDeposito(archivio.deposito)
  archivioAttivo = archivio
  contesto.subscriptions.push(archivio)
  let ultimoDocumento: string | null = null
  let ultimaEtichetta: string | null = null
  contesto.subscriptions.push(archivio.alCambiamento(() => {
    const corrente = percorsoPacchetto()?.fsPath ?? null
    // Recenti: mai un anno provvisorio (il suo percorso sparisce al salva con
    // nome). L'etichetta dell'anno si riguarda a ogni cambiamento perché si può
    // rinominare; l'ultima si tiene qui per non rileggere l'elenco a ogni voto.
    const etichetta = archivio.annoCorrente?.etichetta
    if (corrente && corrente !== ultimoDocumento && !èProvvisorio()) {
      segnaDocumentoAperto(corrente, etichetta)
      ultimaEtichetta = etichetta ?? null
    } else if (corrente && etichetta && etichetta !== ultimaEtichetta && !èProvvisorio()) {
      ricordaEtichetta(corrente, etichetta)
      ultimaEtichetta = etichetta
    } else if (!corrente && ultimoDocumento) {
      // Anno chiuso o recente che non si apre: si ricontrolla l'elenco prima
      // che il benvenuto lo mostri.
      void verificaDocumenti()
    }
    ultimoDocumento = corrente
  }))
  // I file spariti escono dai recenti prima che qualcuno apra l'elenco.
  void verificaDocumenti()

  // Un anno aperto altrove si apre qui solo se lo si conferma: chi salva per
  // ultimo coprirebbe il lavoro dell'altro, senza fonderlo.
  archivio.chiediSeOccupato(async (anno, serratura) => {
    const chi = serratura.utente ? `${serratura.macchina} (${serratura.utente})` : serratura.macchina
    // Le opzioni sono quelle di `toLocaleString`: giorno, mese, anno e ora con i secondi.
    const quando = serratura.aperto
      ? istante(new Date(serratura.aperto), {
          day: 'numeric',
          month: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
        })
      : ''
    const t = testi()
    const scelta = await apparato.dialoghi.avvisa(
      t.occupato(anno, chi),
      { modal: true, detail: t.occupatoDettaglio(quando) },
      { title: t.apriLoStesso },
    )
    return scelta === t.apriLoStesso
  })

  // Prima di leggere, nella cartella del documento: la disposizione a JSON
  // mescolati si divide per anno, perché `Archivio` legge solo quella per anno.
  // Una cartella sincronizzata può avere file vecchi anche accanto a un `.regi`.
  const radice = documento ? apparato.Uri.joinPath(documento, '..') : null
  if (radice) annuncia(testi().controllo)
  const migrati = radice ? await migraAnni(radice) : null
  // Poi i JSON di ogni anno nel suo `.regi`: in quest'ordine, perché il passo
  // di prima produce le cartelle che questo impacchetta.
  const impacchettati = radice ? await impacchettaAnni(radice) : []

  // Errori dell'archivio: nel pannello se aperto, se no finestra di sistema.
  // Iscritto prima della prima apertura, che è dove gli errori di lettura nascono.
  contesto.subscriptions.push(archivio.allErrore((testo) => PannelloRegistro.avvisa(testo)))
  // Documento portato al formato di oggi: lo si dice una volta, con dove sta la
  // copia com'era. Iscritto prima della prima apertura per la stessa ragione.
  contesto.subscriptions.push(
    // testo-fisso: il marchio non si traduce
    archivio.allAvviso((testo) => void apparato.dialoghi.informa(`Regiclass: ${testo}`)),
  )

  annuncia(documento ? testi().leggo : testi().preparo)
  await archivio.apri(documento)

  if (migrati) {
    void apparato.dialoghi.informa(
      migrati.anni.length === 1
        ? testi().migratoUno(migrati.corrente)
        : testi().migratiMolti(migrati.anni.length, migrati.corrente),
    )
  }

  if (impacchettati.length > 0) {
    void apparato.dialoghi.informa(
      impacchettati.length === 1
        ? testi().impacchettatoUno(`${impacchettati[0]}${ESTENSIONE}`)
        : testi().impacchettatiMolti(impacchettati.length, ESTENSIONE),
    )
  }

  // Il worker di pdfjs va dichiarato prima di qualunque lettura di PDF.
  impostaWorker(
    pathToFileURL(
      apparato.Uri.joinPath(contesto.extensionUri, 'dist', 'pdf.worker.mjs').fsPath,
    ).href,
  )
  // I caratteri standard: senza, pdfjs avverte a ogni documento e stima le larghezze.
  impostaCaratteri(apparato.Uri.joinPath(contesto.extensionUri, 'dist', 'caratteri-pdf').fsPath)
  // I file archiviati nella disposizione vecchia si spostano, senza chiedere.
  void migraArchivio(archivio)
    .then(async (spostati) => {
      if (spostati > 0) {
        void apparato.dialoghi.informa(testi().riordinati(spostati))
      }
      // Poi si inglobano nel documento: dopo il riordino, o entrerebbero con la
      // disposizione vecchia.
      return inglobaCartelle(archivio)
    })
    .then((entrati) => {
      if (entrati > 0) {
        void apparato.dialoghi.informa(
          testi().inglobati(entrati, `${archivio.cartellaCorrente}${ESTENSIONE}`),
        )
      }
    })
    .catch((errore: unknown) => {
      // Un file bloccato ferma il trasloco a metà: lo si dice, e la prossima
      // apertura riprende da lì.
      console.error('trasloco dei documenti archiviati', errore)
      void apparato.dialoghi.avvisa(testi().traslocoFallito)
    })

  const smistatore = smistatoreDi(archivio)
  smistatoreAttivo = smistatore
  contesto.subscriptions.push(smistatore)
  // testo-fisso: il marchio non si traduce
  smistatore.alTermine((testo) => void apparato.dialoghi.informa(`Regiclass: ${testo}`))

  // La lettura OCR di una pagina scrive senza passare da `chiama()` (dura minuti
  // e terrebbe ferma la fila): la si annota a mano nel giornale. Qui perché
  // `data/` non vede `api/`.
  contesto.subscriptions.push(
    smistatore.allaPaginaLetta((pagina) => {
      annota({
        tracciato: identificatore('ocr'),
        // Non è una procedura: `$elenco` non conosce questo nome.
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

  // Proiezione e assistente ricevono qui contesto e archivio, una volta sola.
  annuncia(testi().finestre)
  avviaProiezione(contesto, archivio)
  avviaAssistente(contesto, archivio)

  const apri = (navigazione?: MessaggioNavigazione) =>
    PannelloRegistro.mostra(contesto, archivio, navigazione)
  apriPannello = apri

  // `vista.apri` (anche per l'assistente): iscritto e non importato, perché
  // `core` non vede le finestre (vedi `actions/view.ts`).
  registraNavigatore(apri)

  // Promemoria: premendo la notifica si apre la lezione.
  contesto.subscriptions.push(
    avviaPromemoria(archivio, (lezioneId) => {
      apri({ tipo: 'naviga', vista: 'lezione', elementoId: lezioneId })
    }),
  )

  // Il vassoio; con l'icona accesa l'uscita sta nel suo menu (vedi `shell/main.ts`).
  vassoioAttivo = avviaVassoio(archivio, apri)
  contesto.subscriptions.push(vassoioAttivo)

  // Il condotto per riga di comando e script, spento di suo (vedi
  // `api/transports/conduit.ts`). Solo ad archivio aperto: una chiamata su un
  // registro non letto scriverebbe il vuoto sopra i dati veri.
  const cartellaUtente = contesto.globalStorageUri.fsPath
  condottoAttivo = await apriCondotto(archivio, cartellaUtente)
  contesto.subscriptions.push(
    // Il condotto di adesso: `osservaCondotto` può averlo sostituito.
    new apparato.Smaltitore(() => condottoAttivo?.dispose()),
    osservaCondotto(archivio, cartellaUtente),
  )

  const comando = (nome: string, esecuzione: (...argomenti: never[]) => unknown) =>
    contesto.subscriptions.push(apparato.comandi.registra(nome, esecuzione))

  comando('registroDocenti.apri', () => apri())
  comando('registroDocenti.guida', () => apri({ tipo: 'naviga', vista: 'guida' }))
  // Le impostazioni sono una pagina del pannello (programma e documento); la
  // finestra nativa serve solo senza pannello (`shell/windows/menu.ts`).
  comando('registroDocenti.impostazioni', () => apri({ tipo: 'naviga', vista: 'impostazioni' }))
  comando('registroDocenti.oggi', () => apri({ tipo: 'naviga', vista: 'calendario', data: oggi() }))
  comando('registroDocenti.nuovaLezione', () =>
    apri({ tipo: 'naviga', vista: 'calendario', data: oggi(), nuovo: true }),
  )
  comando('registroDocenti.nuovaClasse', () => apri({ tipo: 'naviga', vista: 'classi', nuovo: true }))
  comando('registroDocenti.nuovoCorso', () => apri({ tipo: 'naviga', vista: 'corsi', nuovo: true }))
  comando('registroDocenti.nuovoPiano', () => apri({ tipo: 'naviga', vista: 'piani', nuovo: true }))
  comando('registroDocenti.nuovaValutazione', () =>
    apri({ tipo: 'naviga', vista: 'valutazioni', nuovo: true }),
  )
  // Prima il pannello: la proiezione segue quel che mostra.
  comando('registroDocenti.proietta', async () => {
    apri()
    await PannelloProiezione.apri()
  })

  comando('registroDocenti.nuovoAnno', async () => {
    const scelto = await chiediAnnoNuovo()
    if (!scelto) return
    // Da `esegui` come il webview, per la convalida e i semestri dalle date
    // scelte; origine `'programma'` perché parte da un comando.
    const { importa, ...date } = scelto
    const esito = await esegui(archivio, { tipo: 'anno.crea', ...date }, 'programma')
    if (!esito.ok) {
      // testo-fisso: il marchio non si traduce
      void apparato.dialoghi.errore(`Regiclass: ${(esito.errori ?? []).join(' ')}`)
      return
    }
    await archivio.salva()
    if (esito.creato) apri(dopoLaNascita(esito.creato.id, importa))
    if (esito.messaggio) void apparato.dialoghi.informa(esito.messaggio.testo)
  })

  // Per un anno appena creato è dove sceglie nome e posto.
  comando('registroDocenti.salvaConNome', () => salvaAnnoConNome())

  // Il pannello riceve lo stato nuovo da `alCambiamento`.
  comando('registroDocenti.ricarica', async () => {
    await archivio.carica()
  })

  // Aprire un altro anno: l'archivio apre l'Uri, e osservatore e cassetta si
  // rifanno sull'evento di cambiamento, qui sotto.
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

  // Prova il collegamento senza mandare una mail (anche nella scheda Posta).
  comando('registroDocenti.provaPosta', async () => {
    const esito = await provaCollegamento()
    const mostra =
      esito.livello === 'errore'
        ? apparato.dialoghi.errore
        : esito.livello === 'avviso'
          ? apparato.dialoghi.avvisa
          : apparato.dialoghi.informa
    void mostra(testi().posta(esito.testo))
  })

  // Una mail vera a un indirizzo scelto: l'invio è un permesso a parte.
  comando('registroDocenti.provaInvioPosta', async () => {
    // Senza documento aperto la prova parte senza firma.
    const carta = archivioAttivo?.registro.impostazioni.intestazione
    const esito = await inviaProva(carta ? firmaPosta(carta) : '')
    if (!esito) return
    const mostra =
      esito.livello === 'errore'
        ? apparato.dialoghi.errore
        : esito.livello === 'avviso'
          ? apparato.dialoghi.avvisa
          : apparato.dialoghi.informa
    void mostra(testi().posta(esito.testo))
  })

  // Collega la casella, provata sul server prima di salvarla; il gettone va nel
  // portachiavi, non nelle impostazioni in chiaro.
  comando('registroDocenti.collegaPosta', async () => {
    const stato = await collegaAccount()
    if (!stato) return
    const mostra =
      stato.livello === 'errore'
        ? apparato.dialoghi.errore
        : stato.livello === 'avviso'
          ? apparato.dialoghi.avvisa
          : apparato.dialoghi.informa
    void mostra(testi().posta(stato.testo))
  })

  comando('registroDocenti.scollegaPosta', async () => {
    const stato = await scollegaAccount()
    void apparato.dialoghi.informa(testi().posta(stato.testo))
  })

  // Azzera portachiavi, memoria e impostazioni della posta; con conferma,
  // perché toglie anche indirizzo e ID applicazione.
  comando('registroDocenti.azzeraPosta', async () => {
    const t = testi()
    const azzera = t.azzera
    const scelta = await apparato.dialoghi.avvisa(
      t.azzeraDomanda,
      { modal: true, detail: t.azzeraDettaglio },
      // Rosso: non si disfa, e il collegamento va rifatto da capo.
      { title: azzera, pericolo: true },
    )
    if (scelta !== azzera) return
    const stato = await azzeraPosta()
    void apparato.dialoghi.informa(testi().posta(stato.testo))
  })

  // La cartella dell'anno in uso, o la radice se non c'è un anno.
  comando('registroDocenti.apriCartellaDati', async () => {
    const cartella = cartellaAnno() ?? cartellaDocumento()
    if (!cartella) {
      void apparato.dialoghi.avvisa(testi().senzaCartella)
      return
    }
    await apparato.file.createDirectory(cartella)
    await apparato.comandi.esegui('apparato.mostraNellaCartella', cartella)
  })

  // L'osservatore segue il documento aperto: si rifà a ogni cambio, chiudendo
  // il vecchio invece di accodarne uno nuovo in `subscriptions`.
  let osservatore = archivio.osserva()
  contesto.subscriptions.push(new apparato.Smaltitore(() => osservatore.dispose()))

  // I PDF in ingresso stanno nel documento dell'anno: cambiandolo cambia anche
  // quel che c'è da smistare, ed eventualmente una vecchia cassetta da svuotare.
  let documentoCorrente = percorsoPacchetto()?.toString() ?? null
  contesto.subscriptions.push(
    archivio.alCambiamento(() => {
      const adesso = percorsoPacchetto()?.toString() ?? null
      if (adesso === documentoCorrente) return
      documentoCorrente = adesso
      osservatore.dispose()
      osservatore = archivio.osserva()
      smistatore.assorbiCassettaVecchia().catch((errore: unknown) => {
        console.error('ripresa della cassetta del documento precedente', errore)
      })
      // I file mostrati stanno nell'anno: sandbox e radice del webview vanno
      // rifatte, o le immagini del nuovo anno non si vedrebbero.
      PannelloRegistro.aggiornaRisorse()
    }),
  )

  // I PDF rimasti in una vecchia cassetta si smistano all'accensione.
  if (await archivio.esiste()) void smistatore.assorbiCassettaVecchia()

  const conf = apparato.impostazioni.leggi('registroDocenti')
  // Partenza senza finestra (su richiesta o all'accesso, vedi
  // `environment/systemStartup.ts`), ma solo se c'è l'icona per riaprirlo.
  const silenzioso = conf.get<boolean>('avvio.soloVassoio', false) || avviatoDalSistema()
  if (!(silenzioso && vassoioAcceso()) && (await archivio.esiste())) {
    annuncia(testi().apro)
    apri()
  }
}

/** Le date e le chiusure di un anno che sta per nascere, e se portarci un altro registro. */
interface AnnoDaCreare {
  inizio: Iso
  fine: Iso
  sospensioni: Sospensione[]
  /** Appena nato, aprire la finestra che porta classi, corsi e impostazioni da un altro anno. */
  importa: boolean
}

/**
 * Chiede quale anno creare: uno del calendario ufficiale (con vacanze e festivi
 * già dentro) o date a mano; poi, se c'è un altro registro, se importarne classi,
 * corsi e impostazioni. `null` se si annulla.
 */
export async function chiediAnnoNuovo (): Promise<AnnoDaCreare | null> {
  const proposto = creaAnnoCorrente()
  const ufficiali = anniDaProporre(CALENDARIO_TICINO, oggi())
  const t = testi()
  const dalCalendario = t.calendarioUfficiale(CALENDARIO_TICINO.cantoneNome)
  const voci: Array<{ label: string, description: string, valore: AnnoUfficiale | 'proposto' | 'date' }> = [
    ...ufficiali.map((anno) => ({
      label: anno.annoScolastico,
      description:
        `${formattaData(anno.inizioAnno ?? '')} → ${formattaData(anno.fineAnno ?? '')} · ` +
        t.vacanzeDel(dalCalendario),
      valore: anno,
    })),
    // L'anno di oggi, se il calendario non lo porta.
    ...(ufficiali.some((anno) => anno.annoScolastico === proposto.etichetta)
      ? []
      : [{
          label: proposto.etichetta,
          description: `${formattaData(proposto.inizio)} → ${formattaData(proposto.fine)}`,
          valore: 'proposto' as const,
        }]),
    { label: t.scegliDate, description: t.scegliDateDescrizione, valore: 'date' as const },
  ]
  const scelta = await apparato.dialoghi.chiediScelta(voci, { title: t.nuovoAnno })
  if (!scelta) return null

  let date: Omit<AnnoDaCreare, 'importa'>
  if (scelta.valore === 'proposto') {
    date = { inizio: proposto.inizio, fine: proposto.fine, sospensioni: [] }
  } else if (scelta.valore === 'date') {
    const chiediData = async (titolo: string, valore: string) =>
      apparato.dialoghi.chiediTesto({
        title: titolo,
        value: valore,
        prompt: t.formato,
        // `isoValida` e non la sola forma, che accetterebbe il 31 febbraio.
        validateInput: (v) => (isoValida(v) ? null : t.dataVera),
      })
    const inizio = await chiediData(t.inizioAnno, proposto.inizio)
    if (!inizio) return null
    const fine = await chiediData(t.fineAnno, proposto.fine)
    if (!fine) return null
    date = { inizio, fine, sospensioni: [] }
  } else {
    const anno = scelta.valore
    date = {
      inizio: anno.inizioAnno ?? proposto.inizio,
      fine: anno.fineAnno ?? proposto.fine,
      sospensioni: chiusureUfficiali(CALENDARIO_TICINO, anno),
    }
  }

  // Registri noti ed esistenti, escluso l'aperto; se non ce n'è, niente domanda.
  const aperto = percorsoPacchetto()?.fsPath ?? null
  const altri = documentiNoti(aperto).filter((d) => !d.mancante && !d.aperto)
  if (altri.length === 0) return { ...date, importa: false }
  const importa = await apparato.dialoghi.chiediScelta(
    [
      { label: t.importaSi, description: t.importaSiDescrizione, valore: true },
      { label: t.importaNo, description: t.importaNoDescrizione, valore: false },
    ],
    { title: t.importaDomanda },
  )
  if (!importa) return null
  return { ...date, importa: importa.valore }
}

/** Dove si apre il pannello su un anno appena nato: l'importazione se chiesta, se no la scheda dell'anno. */
function dopoLaNascita (annoId: string, importa: boolean): MessaggioNavigazione {
  return importa
    ? { tipo: 'naviga', vista: 'impostazioni', elementoId: annoId, importa: true }
    : { tipo: 'naviga', vista: 'impostazioni', elementoId: annoId }
}

/**
 * Crea e apre il primo anno di un registro nuovo, per il guscio al primo avvio.
 * Passa da `esegui` e salva subito. Torna il percorso del documento nato (il
 * guscio lo ricorda), o `null` se l'anno è rifiutato o il dialogo annullato.
 */
export async function creaPrimoAnno (anno: AnnoDaCreare): Promise<string | null> {
  const archivio = archivioAttivo
  if (!archivio) return null
  // Origine `'programma'`: parte da un comando, non dal pannello.
  const { importa, ...date } = anno
  const esito = await esegui(archivio, { tipo: 'anno.crea', ...date }, 'programma')
  if (!esito.ok) {
    // testo-fisso: il marchio non si traduce
    void apparato.dialoghi.errore(`Regiclass: ${(esito.errori ?? []).join(' ')}`)
    return null
  }
  // «Salva con nome» annullato: nessun documento, quindi niente da aprire.
  if (!esito.creato) return null
  await archivio.salva()
  if (esito.messaggio) void apparato.dialoghi.informa(esito.messaggio.testo)
  // Non sul calendario, che per un registro appena nato è vuoto.
  apriRegistro(dopoLaNascita(esito.creato.id, importa))
  return archivio.documentoAperto?.fsPath ?? null
}

/**
 * Chiude il documento aperto (ne libera la serratura) e lascia il registro
 * senza anno. Pannello e proiezione si chiudono prima; il benvenuto lo rimette
 * il guscio (`registroDocenti.chiudiDocumento` in `shell/main.ts`).
 */
export async function chiudiDocumentoAperto (): Promise<boolean> {
  const archivio = archivioAttivo
  if (!archivio) return true
  // Un anno nuovo mai salvato con nome: si chiede se salvarlo o buttarlo.
  const provvisorio = èProvvisorio() ? archivio.documentoAperto : null
  if (provvisorio) {
    const t = testi()
    const nome = nomeDelPacchetto(provvisorio)
    const scelta = await apparato.dialoghi.avvisa(
      t.nonSalvato(nome),
      { modal: true, detail: t.nonSalvatoDettaglio },
      { title: t.salvaConNome },
      // Rosso: un anno provvisorio buttato non torna.
      { title: t.buttaAnno, pericolo: true },
    )
    if (scelta === t.salvaConNome) {
      if (!(await salvaAnnoConNome())) return false
    } else if (scelta !== t.buttaAnno) {
      return false
    }
  }
  PannelloProiezione.chiudi()
  PannelloRegistro.chiudi()
  // Le richieste in volo scrivono ancora (es. il segno «spedito» di una mail):
  // si aspettano prima di chiudere l'anno.
  await PannelloRegistro.attendiScritture()
  // `chiudi` salva e libera il documento, `apri(null)` svuota la memoria. Se il
  // salvataggio fallisce l'anno resta aperto e il pannello torna davanti.
  if (!(await archivio.chiudi())) {
    apriPannello?.()
    return false
  }
  await archivio.apri(null)
  // Se nel frattempo è stato salvato con nome, la cartella è già sparita.
  if (provvisorio) await buttaProvvisorio(provvisorio)
  return true
}

/**
 * Salva con nome l'anno aperto e torna il percorso nuovo, o `null`. Un
 * provvisorio si butta, un anno già salvato resta dov'era (si lavora sulla
 * copia); il guscio lo ricorda con `registroDocenti.ricordaDocumento`.
 */
async function salvaAnnoConNome (): Promise<string | null> {
  const archivio = archivioAttivo
  const vecchio = archivio?.documentoAperto ?? null
  if (!archivio || !vecchio) {
    void apparato.dialoghi.avvisa(testi().nessunAnnoDaSalvare)
    return null
  }
  const nome = `${nomeDelPacchetto(vecchio)}${ESTENSIONE}`
  const cartella = èProvvisorio(vecchio)
    ? cartellaDellUltimoDocumento()
    : apparato.Uri.joinPath(vecchio, '..')
  const dove = await apparato.dialoghi.chiediDoveSalvare({
    title: testi().salvaAnnoConNome(nomeDelPacchetto(vecchio)),
    saveLabel: parole().salva,
    defaultUri: cartella ? apparato.Uri.joinPath(cartella, nome) : undefined,
    filters: { Regiclass: [ESTENSIONE] },
  })
  if (!dove) return null
  if (!(await archivio.salvaCome(dove))) return null
  if (èProvvisorio(vecchio)) await buttaProvvisorio(vecchio)
  await apparato.comandi.esegui('registroDocenti.ricordaDocumento', dove.fsPath)
  void apparato.dialoghi.informa(testi().salvatoIn(dove.fsPath))
  return dove.fsPath
}

/** Cancella la cartella di un anno provvisorio: il documento e la sua gemella. */
async function buttaProvvisorio (file: apparato.Uri): Promise<void> {
  const cartella = cartellaDelProvvisorio(file)
  if (!cartella) return
  try {
    await apparato.file.delete(cartella, { recursive: true })
  } catch (errore) {
    console.error('anno provvisorio non cancellato', errore)
  }
}

/**
 * Chiude il registro. L'ordine conta: prima si chiudono le porte da cui entra
 * lavoro nuovo, poi si aspettano le code che scrivono (pannello, OCR, PDF), per
 * ultimo si consegna l'archivio al disco e si smaltiscono le iscrizioni.
 */
export async function spegni (): Promise<void> {
  // L'archivio sa che si esce: nessun anno si apre più, e la chiusura finale
  // non può rifiutare (se non si scrive, va in una copia d'emergenza).
  archivioAttivo?.spegni()
  // Letture OCR e dettature girano fuori processo e possono durare minuti:
  // si interrompono.
  fermaLetture()
  fermaDettature()

  // L'icona subito: durante l'ultimo salvataggio il suo menu non farebbe più niente.
  apriPannello = null
  vassoioAttivo?.dispose()
  vassoioAttivo = null

  // Il condotto prima dell'ultimo salvataggio, aspettando le chiamate in coda:
  // una modifica entrata durante o dopo la scrittura andrebbe persa o senza risposta.
  await chiudiCondotto()

  // Il pannello: si chiude, poi si aspettano le richieste già partite.
  PannelloRegistro.chiudi()
  await PannelloRegistro.attendiScritture()

  // La coda OCR: si ferma fino al programma esterno e si aspetta il resto del
  // giro, dove una pagina letta arriva ad `archivio.modifica`.
  const smistatore = smistatoreAttivo
  smistatoreAttivo = null
  await smistatore?.fermaEAspetta()

  // La coda dei PDF: quel che aspettava si scarta, quel che scrive si aspetta
  // (un rapporto a metà è un PDF rotto).
  await fermaRapporti()

  // I salvataggi sono ritardati di mezzo secondo e `Archivio.dispose` non li
  // aspetta: qui sì, e il guscio trattiene l'uscita.
  const archivio = archivioAttivo
  archivioAttivo = null
  // Chiudere e non solo salvare: la serratura rimasta farebbe annunciare
  // l'anno come aperto altrove.
  await archivio?.chiudi()

  // Per ultime le iscrizioni: il `dispose` dell'archivio, lì dentro, trova così
  // già tutto chiuso. Un `dispose` che solleva non ferma gli altri.
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
