// Quel che serve a ogni azione per fare il suo lavoro, e i tipi che tengono
// insieme il centralino.
//
// Prima era tutto dentro `esegui`: tre chiusure — scrivere, scrivere nel
// fascicolo, eliminare — visibili ai novantanove casi dello switch. Comodo da
// scrivere e impossibile da spezzare: nessun caso poteva andarsene in un file
// suo senza portarsi dietro la funzione che lo conteneva.
//
// Qui quelle tre diventano un valore che si passa. Da lì in poi ogni area del
// registro può stare per conto suo, e questo file è l'unico posto in cui si
// dichiara come si tocca l'archivio.

import * as apparato from 'apparato'

import { apriConIlSistema } from '../data/opening.js'
import type { Archivio } from '../data/archive.js'
import { deposito, percorsoVero } from '../data/store.js'
import { estensioneDi, nomeDelFileUri } from '../data/paths.js'
import { classeDellaConsegna, fascicoloDellaClasse } from '../domain/courses.js'
import { istanteAdesso } from '../domain/dates.js'
import { eliminazione, type Bersaglio, type FileDaTogliere } from '../domain/deletions.js'
import { creaFascicolo } from '../domain/factories.js'
import type { Classe, Collezione, Consegna, Fascicolo, Registro } from '../domain/models.js'
import { plurale } from '../domain/text.js'
import type { Codice, Origine } from '../api/contract.js'
import type { Azione, Messaggio } from '../protocol.js'

/** Com'è andata: al webview torna questo, e nient'altro. */
export interface EsitoAzione {
  ok: boolean
  errori?: string[]
  /**
   * Perche' non e' riuscita, per chi sa distinguere.
   *
   * Un gestore che rifiuta torna delle frasi, e `daEsitoAzione` le appiattiva
   * tutte su `rifiutato`. Ma «la voce non c'e' piu'» e «la voce c'e' e non si
   * puo' fare» sono due cose diverse: la prima si ritenta dopo aver riletto, la
   * seconda no. Per le procedure sincrone la differenza la fanno le guardie
   * `esigi*`, che lanciano prima di arrivare al gestore; per le nove che
   * aspettano una persona davanti a un dialogo, fra la guardia e la scrittura
   * passano minuti, e il rifiuto di `suVoce` arrivava indistinguibile.
   */
  codice?: Codice
  /**
   * Il numero della chiamata nel giornale.
   *
   * Lo mette il nucleo al ritorno, non il gestore: e' quel che si cita quando
   * si chiede «che cosa e' successo alle 10:32», e finora si fermava al
   * confine fra la busta e il protocollo del pannello.
   */
  tracciato?: string
  creato?: { id: string }
  /** Una cosa da dire a chi ha chiesto, mostrata dal pannello come notifica. */
  messaggio?: Messaggio
  /**
   * Il documento che l'azione ha appena scritto, relativo alla cartella dei
   * dati.
   *
   * Serve a chi ha premuto: la pagina Documenti lo apre nella sua cornice
   * invece di mandare il docente a cercarlo. Il percorso lo sa solo chi ha
   * scritto il file — il nome porta dentro il periodo, o il giorno — e
   * ricomporlo dall'altra parte sarebbe la stessa regola scritta due volte.
   */
  documento?: string
  /**
   * L'azione è riuscita ma il registro non è cambiato: il pannello non rispinge
   * lo stato.
   *
   * Serve alle azioni che comandano l'interfaccia invece dei dati — dove
   * guardare, che cosa proiettare — e che arrivano a ogni gesto: senza,
   * spostarsi di un giorno sul calendario farebbe serializzare e rispedire
   * l'intero registro per una cosa che nel registro non c'è.
   */
  invariato?: boolean
}

export const fatto: EsitoAzione = { ok: true }

/** Riuscito, e senza aver toccato niente su disco. */
export const invariato: EsitoAzione = { ok: true, invariato: true }

export function rifiuta (...errori: string[]): EsitoAzione {
  return { ok: false, errori }
}

/** Come `rifiuta`, ma dicendo di che rifiuto si tratta. */
export function rifiutaCon (codice: Codice, ...errori: string[]): EsitoAzione {
  return { ok: false, codice, errori }
}

/**
 * Un esito riuscito con una frase per chi guarda. Era un
 * `showInformationMessage` sparso in dieci gestori: la finestra di sistema
 * compariva lontano dal pannello in cui si era cliccato, e chi lo apriva
 * da un comando non vedeva niente.
 */
export function conMessaggio (
  testo: string,
  livello: Messaggio['livello'] = 'info',
  resto: Omit<EsitoAzione, 'ok' | 'messaggio'> = {},
): EsitoAzione {
  return { ok: true, ...resto, messaggio: { livello, testo } }
}

/**
 * Il riepilogo di un giro di invii: quanti partiti, chi è rimasto indietro.
 * Zero partiti è un rifiuto; qualcuno indietro è un avviso; tutti partiti è
 * una buona notizia.
 *
 * `giaScritto` dice che il registro e' gia' cambiato — i motivi dei fallimenti
 * sono stati segnati riga per riga mentre si provava — e allora zero partiti
 * **non** e' un rifiuto: sarebbe una busta di fallimento su una chiamata che ha
 * modificato i dati e incrementato la revisione, e il pannello, che su
 * fallimento non rispinge lo stato, continuerebbe a mostrare righe vecchie
 * mentre il file su disco ha gia' gli errori scritti dentro.
 */
export function riassumiInvii (
  partite: number,
  falliti: string[],
  cosa: [string, string],
  giaScritto = false,
): EsitoAzione {
  if (partite === 0 && giaScritto) {
    return conMessaggio(`Non è partito niente. ${falliti.join(' · ')}`, 'avviso')
  }
  if (partite === 0) return rifiuta(`Non è partito niente. ${falliti.join(' · ')}`)
  const quanti = plurale(partite, ...cosa)
  if (falliti.length > 0) {
    return conMessaggio(`${quanti}. Rimasti indietro: ${falliti.join(' · ')}`, 'avviso')
  }
  return conMessaggio(`${quanti}.`)
}

/**
 * L'upsert per id: al posto suo se c'era già, in fondo se è nuovo, e l'elenco
 * riordinato quando l'ordine conta.
 *
 * Lo facevano quindici salvataggi, ognuno con le sue tre righe uguali e il suo
 * nome di variabile: bastava sbagliarne una perché un salvataggio aggiungesse
 * un doppione invece di sostituire, ed è un errore che si vede solo dopo, nei
 * dati.
 */
export function riponi<T extends { id: string }> (
  elenco: T[],
  voce: T,
  ordina?: (a: T, b: T) => number,
): void {
  const indice = elenco.findIndex((x) => x.id === voce.id)
  if (indice >= 0) elenco[indice] = voce
  else elenco.push(voce)
  if (ordina) elenco.sort(ordina)
}

/**
 * Il fascicolo di una classe dentro una modifica, creandolo se non c'è. Nasce
 * alla prima cosa che ci si mette dentro: una classe di cui non si è docente di
 * classe non deve avere un fascicolo vuoto in giro.
 */
export function fascicoloDi (r: Registro, classeId: string): Fascicolo | null {
  if (!r.classi.some((c) => c.id === classeId)) return null
  const gia = fascicoloDellaClasse(r, classeId)
  if (gia) return gia
  const fascicolo = creaFascicolo(classeId)
  r.fascicoli.push(fascicolo)
  return fascicolo
}

/** Il tipo MIME che si dichiara nell'allegato, indovinato dall'estensione. */
export function tipoMime (nome: string): string {
  const estensione = estensioneDi(nome, '').replace('.', '')
  const tipi: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    txt: 'text/plain',
    csv: 'text/csv',
  }
  return tipi[estensione] ?? 'application/octet-stream'
}

/**
 * Un file — o una cartella — nel cestino del sistema, mai cancellato sul
 * serio: un PDF di una verifica è l'unica copia che ne esiste, e un
 * ripensamento deve poter tornare indietro da qualche parte. Un file già
 * sparito a mano non è un motivo per fermare niente. Accetta un percorso
 * relativo alla cartella dei dati o un Uri già fatto.
 */
export async function cestina (
  bersaglio: string | apparato.Uri | null | undefined,
  cartella = false,
): Promise<void> {
  if (!bersaglio) return
  if (typeof bersaglio === 'string') {
    // Un percorso relativo è una voce del documento dell'anno: togliere una
    // voce non ha bisogno di un cestino, perché la versione di prima resta
    // dentro il documento finché non lo si compatta — e lo storico la ricorda.
    const dove = deposito()
    if (cartella) dove?.eliminaSotto(bersaglio)
    else dove?.elimina(bersaglio)
    return
  }
  try {
    await apparato.file.delete(bersaglio, { recursive: cartella, useTrash: true })
  } catch {
    // Non c'era: il riferimento se ne va lo stesso.
  }
}

/** I file che un'eliminazione si porta dietro. */
async function togliFile (file: FileDaTogliere): Promise<void> {
  const dove = deposito()
  // Le due cartelle piatte di prima — `risorse/<piano>`, `allegati/<voto>` —
  // sopravvivono nei riferimenti di chi non è ancora stato migrato: si tolgono
  // per prefisso, che dentro il documento è come si toglie una cartella.
  for (const pianoId of file.risorse) dove?.eliminaSotto(`risorse/${pianoId}`)
  for (const valutazioneId of file.allegati) dove?.eliminaSotto(`allegati/${valutazioneId}`)
  for (const percorso of file.documenti) await cestina(percorso)
  // I fogli stampati dal registro: se ne vanno come gli altri, e la cartella
  // smette di mostrare il verbale di un'ora che non c'è più.
  for (const percorso of file.stampati) await cestina(percorso)
}

/**
 * Apre un file della cartella dei dati con il programma del sistema, dicendo
 * per nome che cosa manca se non c'è più. Era lo stesso terzetto — trova,
 * `stat`, apri — in sette gestori.
 */
export async function apriFile (relativo: string | undefined, etichetta: string): Promise<EsitoAzione> {
  if (!relativo) return rifiutaCon('non-trovato', `«${etichetta}» non ha un file.`)
  // Il file sta dentro il documento dell'anno, e il programma del sistema sa
  // aprire solo i file: se ne materializza una copia, e si apre quella.
  const file = await percorsoVero(relativo)
  if (!file) return rifiutaCon('non-trovato', `Il file di «${etichetta}» non è più dentro l’anno.`)
  if (!(await apriConIlSistema(file))) {
    return rifiuta(`Il file di «${etichetta}» c'è, ma non si è potuto aprire da qui.`)
  }
  return fatto
}

/** Un file scelto dal disco: dov'è, come si chiama, che estensione ha. */
export interface FileScelto {
  uri: apparato.Uri
  nome: string
  /** Punto compreso, in minuscolo; `.pdf` se il nome non ne ha una. */
  estensione: string
}

/**
 * Il dialogo con cui si sceglie un file da portare nel registro. Torna null
 * se lo si chiude senza scegliere — che non è un errore, e non si dice.
 */
export async function scegliFile (opzioni: {
  titolo: string
  tasto?: string
  filtri?: Record<string, string[]>
  molti?: boolean
}): Promise<FileScelto[] | null> {
  const scelti = await apparato.dialoghi.chiediFile({
    canSelectMany: Boolean(opzioni.molti),
    openLabel: opzioni.tasto ?? 'Scegli',
    title: opzioni.titolo,
    filters: opzioni.filtri,
  })
  if (!scelti || scelti.length === 0) return null
  return scelti.map((uri) => {
    const nome = nomeDelFileUri(uri)
    return { uri, nome, estensione: estensioneDi(nome) }
  })
}

/** Come sopra, per un file solo. */
export async function scegliUnFile (opzioni: {
  titolo: string
  tasto?: string
  filtri?: Record<string, string[]>
}): Promise<FileScelto | null> {
  return (await scegliFile(opzioni))?.[0] ?? null
}

/** Una consegna con la sua classe, o il motivo per cui non si va avanti. */
export function consegnaConClasse (
  registro: Registro,
  consegnaId: string,
): { consegna: Consegna; classe: Classe } | { errore: EsitoAzione } {
  const consegna = registro.consegne.find((c) => c.id === consegnaId)
  if (!consegna) return { errore: rifiuta('Consegna non trovata.') }
  const classe = classeDellaConsegna(registro, consegna)
  if (!classe) return { errore: rifiuta('La classe della consegna non esiste.') }
  return { consegna, classe }
}

// ------------------------------------------------------------------ contesto

/**
 * Un cambiamento del registro, che può dire di non aver trovato niente.
 *
 * `modifica` tornava `fatto` sempre, e il callback non aveva modo di dire
 * altro. Per le scritture sincrone non fa differenza — la guardia sta due righe
 * sopra, e fra le due non succede niente — ma i gestori che aspettano una
 * persona davanti a un dialogo di sistema, o un giro di posta, stanno fermi per
 * minuti: in quei minuti un'altra finestra può togliere la voce, o il documento
 * può essere riletto da capo. Il `find` dentro il callback tornava `undefined`,
 * il callback usciva senza toccare niente, e la busta usciva `ok: true`.
 * L'utente aveva archiviato il file, il registro diceva «fatto», e la spunta
 * non c'era.
 *
 * `false` — e solo `false` — vuol dire «non l'ho trovato». Chi non torna niente
 * vale come prima, ed è il caso delle centocinquanta chiamate che non hanno mai
 * avuto questo problema: cambia la *possibilità* di dirlo, non l'obbligo.
 */
type Cambiamento = (r: Registro) => void | boolean

/** Quel che un'azione ha sottomano: il registro da leggere e i modi di scriverlo. */
interface Contesto {
  /** Serve a chi deve scrivere più volte, o leggere lo stato dopo aver scritto. */
  archivio: Archivio
  /**
   * Da dove è partita la richiesta, per il giornale.
   *
   * Viaggia nel contesto e non in una variabile di modulo perché il contesto si
   * costruisce a ogni chiamata: due richieste che si accavallano — il menu
   * nativo mentre il pannello sta scrivendo — non si sovrascrivono l'origine a
   * vicenda. Senza, il ponte cablava `'pannello'` per tutti, e ogni scrittura
   * partita dal menu risultava venuta dal pannello: «la prima domanda che si fa
   * quando un dato risulta cambiato e nessuno se lo ricorda», dice il commento
   * di `src/agenda.ts`, riceveva la risposta sbagliata.
   */
  origine?: Origine
  /** Il registro com'è adesso: si legge, non si tocca. */
  registro: Registro
  /**
   * Una scrittura, dichiarando quali file ne escono cambiati.
   *
   * `mancante` è la frase con cui si rifiuta quando il cambiamento torna
   * `false`: si scrive solo dove quel caso è possibile, cioè dove fra la
   * guardia e la scrittura c'è un `await`.
   */
  modifica (op: Cambiamento, collezioni: Collezione[], mancante?: string): EsitoAzione
  /**
   * Una modifica dentro il fascicolo di una classe: lo si trova (creandolo se
   * ancora non c'è), si fa quel che serve, e l'ora di aggiornamento la timbra
   * lui. Era il preambolo di ogni salvataggio del docente di classe, ripetuto
   * riga per riga — e ogni volta che qualcuno se ne dimenticava una, il
   * fascicolo restava con la data del giorno prima.
   */
  nelFascicolo (classeId: string, op: (fascicolo: Fascicolo) => void): EsitoAzione
  /**
   * Una modifica a una voce sola di una raccolta, trovata per id.
   *
   * Se non c'è più — l'ha tolta un'altra finestra, o un file riletto da fuori
   * — si rifiuta senza scrivere niente: prima si marcava il file come
   * sporco, lo si riscriveva uguale e si rispondeva «fatto» a un clic su
   * qualcosa che non esisteva. Il timbro di aggiornamento lo mette lei.
   */
  suVoce<K extends RaccoltaConId> (
    collezione: K,
    id: string,
    op: (voce: Registro[K][number], r: Registro) => void,
    altre?: Collezione[],
  ): EsitoAzione
  /**
   * Toglie qualcosa dal registro con tutto il suo seguito.
   *
   * Nessuna eliminazione viene più rifiutata perché «c'è ancora roba dentro»:
   * il rifiuto lasciava nel registro classi sbagliate che nessuno poteva più
   * togliere, e spingeva a correggere i file a mano — che è il modo con cui i
   * riferimenti si rompono davvero. La sicurezza sta prima, nel pannello, che
   * mostra per intero che cosa sparisce; qui si esegue, e si esegue completo,
   * così non resta niente a puntare nel vuoto.
   */
  elimina (bersaglio: Bersaglio): Promise<EsitoAzione>
}

/** Le raccolte del registro fatte di voci con un id: quelle su cui `suVoce` lavora. */
type RaccoltaConId =
  | 'lezioni'
  | 'piani'
  | 'valutazioni'
  | 'consegne'
  | 'classi'
  | 'corsi'
  | 'smistamenti'
  | 'anni'
  | 'materie'

/** Come si chiama quel che manca, per dirlo a chi ha cliccato. */
const NOMI_VOCE: Record<RaccoltaConId, string> = {
  lezioni: 'Lezione',
  piani: 'Piano lezione',
  valutazioni: 'Momento di valutazione',
  consegne: 'Consegna',
  classi: 'Classe',
  corsi: 'Corso',
  smistamenti: 'Smistamento',
  anni: 'Anno scolastico',
  materie: 'Materia',
}

export function contestoDi (archivio: Archivio, origine?: Origine): Contesto {
  const modifica = (op: Cambiamento, collezioni: Collezione[], mancante?: string): EsitoAzione => {
    // Si prova prima e si dichiara dopo, e l'ordine non è un vezzo:
    // `Archivio.modifica` alza la revisione e segna i file come sporchi appena
    // la si chiama, e non sa tornare indietro. Un rifiuto passato di lì
    // lascerebbe dietro una revisione mossa e un `modifiche: 1` nella busta
    // fallita — che in `api/core.ts` vuol dire «qualcosa è già successo, non
    // ritentare alla cieca», cioè l'unica cosa che qui non è successa.
    //
    // `archivio.registro` è lo stesso oggetto che `Archivio.modifica` consegna
    // al proprio operando — è la stessa identità su cui poggia il getter
    // `registro` qui sotto — quindi quel che il cambiamento tocca è già dentro
    // lo stato, e la chiamata qui sotto non fa che renderlo ufficiale:
    // revisione, file sporchi, salvataggio programmato, evento a chi guarda.
    if (op(archivio.registro) === false) {
      return rifiutaCon('non-trovato', mancante ?? 'Non c’è più: forse è già sparito.')
    }
    archivio.modifica(() => undefined, collezioni)
    return fatto
  }

  return {
    archivio,
    ...(origine ? { origine } : {}),
    get registro () {
      // Preso ogni volta e non copiato all'inizio: chi scrive due volte di
      // seguito deve rileggere quel che ha appena scritto, non la copia di
      // prima.
      return archivio.registro
    },
    modifica,
    suVoce: (collezione, id, op, altre = []) => {
      const raccolta = archivio.registro[collezione] as Array<{ id: string }>
      if (!raccolta.some((v) => v.id === id)) {
        return rifiutaCon('non-trovato', `${NOMI_VOCE[collezione]} non trovata: forse è già sparita.`)
      }
      return modifica((r) => {
        const voce = (r[collezione] as Array<{ id: string }>).find((v) => v.id === id)
        // Sparita fra la guardia qui sopra e adesso: succede solo ai gestori
        // che aspettano in mezzo, e finora usciva di qui come un «fatto».
        if (!voce) return false
        op(voce as Registro[typeof collezione][number], r)
        const timbro = voce as { aggiornataIl?: string; aggiornatoIl?: string }
        if ('aggiornataIl' in timbro) timbro.aggiornataIl = istanteAdesso()
        if ('aggiornatoIl' in timbro) timbro.aggiornatoIl = istanteAdesso()
      },
      [collezione === 'anni' || collezione === 'materie' ? 'registro' : collezione, ...altre],
      `${NOMI_VOCE[collezione]} non trovata: forse è già sparita.`)
    },
    nelFascicolo: (classeId, op) =>
      modifica((r) => {
        const fascicolo = fascicoloDi(r, classeId)
        // La classe non c'è più — `fascicoloDi` torna `null` solo per quello —
        // e non c'è nessun fascicolo da timbrare: dirlo è meglio che spuntare.
        if (!fascicolo) return false
        op(fascicolo)
        fascicolo.aggiornatoIl = new Date().toISOString()
      }, ['fascicoli'], 'La classe non c’è più: forse è già stata eliminata.'),
    elimina: async (bersaglio) => {
      const piano = eliminazione(archivio.registro, bersaglio)
      if (!piano) return rifiuta('Non c’è più niente da eliminare: forse è già sparito.')
      await togliFile(piano.file)
      return modifica((r) => piano.applica(r), piano.collezioni)
    },
  }
}

// -------------------------------------------------------------------- la mappa

/** L'azione di un certo tipo, estratta dall'unione del protocollo. */
type Di<T extends Azione['tipo']> = Extract<Azione, { tipo: T }>

/** Chi esegue un'azione: riceve il contesto e l'azione già ristretta al suo tipo. */
export type Gestore<T extends Azione['tipo']> = (
  contesto: Contesto,
  azione: Di<T>,
) => EsitoAzione | Promise<EsitoAzione>

/**
 * La mappa intera: un gestore per ogni azione che il protocollo dichiara.
 *
 * È il tipo che tiene il posto dello switch esaustivo di prima: dichiarando la
 * mappa con questo tipo, un'azione aggiunta al protocollo e non registrata da
 * nessuna parte non compila. La rete c'è ancora — solo che ora regge un elenco
 * composto da otto file invece che una funzione da duemila righe.
 */
export type Mappa = { [T in Azione['tipo']]: Gestore<T> }

/**
 * Le azioni di un'area sola: il pezzo di mappa che un file dichiara.
 *
 * Si usa con `satisfies`, non come annotazione: così le chiavi restano quelle
 * scritte davvero — la mappa finale le somma e controlla che non ne manchi
 * nessuna — e dentro ogni gestore `azione` arriva già ristretta al suo tipo.
 */
export type Parte = Partial<Mappa>
