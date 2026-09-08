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

import * as vscode from 'vscode'

import { apriConIlSistema } from '../dati/apertura.js'
import type { Archivio } from '../dati/archivio.js'
import {
  cartellaAllegati,
  cartellaRisorse,
  estensioneDi,
  fileAllegato,
  nomeDelFileUri,
} from '../dati/percorsi.js'
import { classeDellaConsegna, fascicoloDellaClasse } from '../dominio/corsi.js'
import { istanteAdesso } from '../dominio/date.js'
import { eliminazione, type Bersaglio, type FileDaTogliere } from '../dominio/eliminazioni.js'
import { creaFascicolo } from '../dominio/fabbriche.js'
import type { Classe, Collezione, Consegna, Fascicolo, Registro } from '../dominio/modelli.js'
import { plurale } from '../dominio/testo.js'
import type { Azione, Messaggio } from '../protocollo.js'

/** Com'è andata: al webview torna questo, e nient'altro. */
export interface EsitoAzione {
  ok: boolean
  errori?: string[]
  creato?: { id: string }
  /** Una cosa da dire a chi ha chiesto, mostrata dal pannello come notifica. */
  messaggio?: Messaggio
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

/**
 * Un esito riuscito con una frase per chi guarda. Era un
 * `showInformationMessage` sparso in dieci gestori: la finestra di VS Code
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
 */
export function riassumiInvii (
  partite: number,
  falliti: string[],
  cosa: [string, string],
): EsitoAzione {
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

/** Il tipo MIME che si dichiara a Graph, indovinato dall'estensione. */
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
  bersaglio: string | vscode.Uri | null | undefined,
  cartella = false,
): Promise<void> {
  const uri = typeof bersaglio === 'string' ? fileAllegato(bersaglio) : bersaglio ?? null
  if (!uri) return
  try {
    await vscode.workspace.fs.delete(uri, { recursive: cartella, useTrash: true })
  } catch {
    // Non c'era: il riferimento se ne va lo stesso.
  }
}

/** I file che un'eliminazione si porta dietro, tutti nel cestino. */
export async function togliFile (file: FileDaTogliere): Promise<void> {
  const risorse = cartellaRisorse()
  for (const pianoId of file.risorse) {
    await cestina(risorse ? vscode.Uri.joinPath(risorse, pianoId) : null, true)
  }
  const allegati = cartellaAllegati()
  for (const valutazioneId of file.allegati) {
    await cestina(allegati ? vscode.Uri.joinPath(allegati, valutazioneId) : null, true)
  }
  for (const percorso of file.documenti) await cestina(percorso)
}

/**
 * Apre un file della cartella dei dati con il programma del sistema, dicendo
 * per nome che cosa manca se non c'è più. Era lo stesso terzetto — trova,
 * `stat`, apri — in sette gestori.
 */
export async function apriFile (relativo: string | undefined, etichetta: string): Promise<EsitoAzione> {
  if (!relativo) return rifiuta(`«${etichetta}» non ha un file.`)
  const file = fileAllegato(relativo)
  if (!file) return rifiuta('Nessuna cartella di lavoro aperta.')
  try {
    await vscode.workspace.fs.stat(file)
  } catch {
    return rifiuta(`Il file di «${etichetta}» non è più nella cartella del registro.`)
  }
  if (!(await apriConIlSistema(file))) {
    return rifiuta(`Il file di «${etichetta}» c'è, ma non si è potuto aprire da qui.`)
  }
  return fatto
}

/** Un file scelto dal disco: dov'è, come si chiama, che estensione ha. */
export interface FileScelto {
  uri: vscode.Uri
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
  const scelti = await vscode.window.showOpenDialog({
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

/** Un allegato di posta letto dalla cartella dei dati, o null se non si legge. */
export async function allegatoPosta (
  relativo: string,
  nome: string,
): Promise<{ nome: string; tipo: string; contenuto: string } | null> {
  const file = fileAllegato(relativo)
  if (!file) return null
  try {
    const contenuto = await vscode.workspace.fs.readFile(file)
    return {
      nome: nome || relativo.split('/').pop() || 'documento.pdf',
      tipo: tipoMime(nome || relativo),
      contenuto: Buffer.from(contenuto).toString('base64'),
    }
  } catch {
    return null
  }
}

// ------------------------------------------------------------------ contesto

/** Quel che un'azione ha sottomano: il registro da leggere e i modi di scriverlo. */
export interface Contesto {
  /** Serve a chi deve scrivere più volte, o leggere lo stato dopo aver scritto. */
  archivio: Archivio
  /** Il registro com'è adesso: si legge, non si tocca. */
  registro: Registro
  /** Una scrittura, dichiarando quali file ne escono cambiati. */
  modifica (op: (r: Registro) => void, collezioni: Collezione[]): EsitoAzione
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
export type RaccoltaConId =
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

export function contestoDi (archivio: Archivio): Contesto {
  const modifica = (op: (r: Registro) => void, collezioni: Collezione[]) => {
    archivio.modifica(op, collezioni)
    return fatto
  }

  return {
    archivio,
    get registro () {
      // Preso ogni volta e non copiato all'inizio: chi scrive due volte di
      // seguito deve rileggere quel che ha appena scritto, non la copia di
      // prima.
      return archivio.registro
    },
    modifica,
    suVoce: (collezione, id, op, altre = []) => {
      const raccolta = archivio.registro[collezione] as Array<{ id: string }>
      if (!raccolta.some((v) => v.id === id)) return rifiuta(`${NOMI_VOCE[collezione]} non trovata: forse è già sparita.`)
      return modifica((r) => {
        const voce = (r[collezione] as Array<{ id: string }>).find((v) => v.id === id)
        if (!voce) return
        op(voce as Registro[typeof collezione][number], r)
        const timbro = voce as { aggiornataIl?: string; aggiornatoIl?: string }
        if ('aggiornataIl' in timbro) timbro.aggiornataIl = istanteAdesso()
        if ('aggiornatoIl' in timbro) timbro.aggiornatoIl = istanteAdesso()
      }, [collezione === 'anni' || collezione === 'materie' ? 'registro' : collezione, ...altre])
    },
    nelFascicolo: (classeId, op) =>
      modifica((r) => {
        const fascicolo = fascicoloDi(r, classeId)
        if (!fascicolo) return
        op(fascicolo)
        fascicolo.aggiornatoIl = new Date().toISOString()
      }, ['fascicoli']),
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
