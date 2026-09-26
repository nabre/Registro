// Il contesto che ogni azione riceve (leggere, scrivere, eliminare), gli aiuti
// comuni ai gestori e i tipi della mappa delle azioni. È l'unico posto che
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
import type { Codice, Origine } from '../api/contract.js'
import type { Azione, Messaggio } from '../protocol.js'
import { parole } from '../domain/words.testi.js'
import { testi } from './context.testi.js'

/** Com'è andata: al webview torna questo, e nient'altro. */
export interface EsitoAzione {
  ok: boolean
  errori?: string[]
  /** Il tipo di rifiuto (es. `non-trovato` si ritenta dopo aver riletto, un rifiuto no). */
  codice?: Codice
  /** Il numero della chiamata nel giornale; lo mette il nucleo al ritorno. */
  tracciato?: string
  creato?: { id: string }
  /** Una cosa da dire a chi ha chiesto, mostrata dal pannello come notifica. */
  messaggio?: Messaggio
  /** Il documento appena scritto, relativo alla cartella dei dati: la pagina Documenti lo apre. */
  documento?: string
  /** Riuscita senza cambiare il registro: il pannello non rispinge lo stato. */
  invariato?: boolean
}

export const fatto: EsitoAzione = { ok: true }

/** Riuscito, e senza aver toccato niente su disco. */
export const invariato: EsitoAzione = { ok: true, invariato: true }

/**
 * Il perché di un guasto, da mostrare a chi ha premuto. Gli errori di sistema
 * (`code` + `syscall`) diventano una frase: il loro messaggio porta percorsi
 * con i nomi degli allievi, che restano nella console. Gli altri passano.
 */
export function motivoSicuro (errore: unknown, ripiego = testi().erroreImprevisto): string {
  if (!(errore instanceof Error)) return ripiego
  const { code, syscall } = errore as Error & { code?: unknown, syscall?: unknown }
  if (typeof code === 'string' && typeof syscall === 'string') {
    console.error('[azioni]', errore)
    const t = testi()
    return t.motiviDiSistema[code] ?? t.erroreDiSistema(code)
  }
  return errore.message || ripiego
}

/**
 * Un comando del guscio lanciato senza aspettarlo, per le azioni che chiudono
 * il pannello («Chiudi l'anno», «Esci»): aspettarlo sarebbe uno stallo, perché
 * il guscio aspetta le richieste del pannello (`attendiScritture`).
 */
export function lanciaComando (id: string, ...argomenti: unknown[]): void {
  apparato.comandi.esegui(id, ...argomenti).catch((errore: unknown) => {
    console.error(`${id}: ${motivoSicuro(errore)}`)
  })
}

export function rifiuta (...errori: string[]): EsitoAzione {
  return { ok: false, errori }
}

/** Come `rifiuta`, ma dicendo di che rifiuto si tratta. */
export function rifiutaCon (codice: Codice, ...errori: string[]): EsitoAzione {
  return { ok: false, codice, errori }
}

/** Un esito riuscito con una frase che il pannello mostra come notifica. */
export function conMessaggio (
  testo: string,
  livello: Messaggio['livello'] = 'info',
  resto: Omit<EsitoAzione, 'ok' | 'messaggio'> = {},
): EsitoAzione {
  return { ok: true, ...resto, messaggio: { livello, testo } }
}

/**
 * Il riepilogo di un giro di invii: zero partiti è un rifiuto, qualcuno
 * indietro un avviso. Con `giaScritto` (registro già cambiato) zero partiti è
 * un avviso, perché su un rifiuto il pannello non rispingerebbe lo stato.
 */
export function riassumiInvii (
  partite: number,
  falliti: string[],
  cosa: (quanti: number) => string,
  giaScritto = false,
  inParte: string[] = [],
): EsitoAzione {
  const t = testi()
  if (partite === 0 && giaScritto) return conMessaggio(t.nientePartito(falliti), 'avviso')
  if (partite === 0) return rifiuta(t.nientePartito(falliti))
  const quanti = cosa(partite)
  // Partite ma non a tutti gli indirizzi: contano come spedite, e si dice
  // l'indirizzo rifiutato.
  const nonATutti = inParte.length > 0 ? t.nonATutti(inParte) : ''
  if (falliti.length > 0) {
    return conMessaggio(t.rimastiIndietro(quanti, falliti, nonATutti), 'avviso')
  }
  if (nonATutti) return conMessaggio(`${quanti}.${nonATutti}`, 'avviso')
  return conMessaggio(`${quanti}.`)
}

/** L'upsert per id: sostituisce se c'è, aggiunge in fondo se no, e riordina se serve. */
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

/** Il fascicolo di una classe dentro una modifica, creato alla prima scrittura. */
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
 * Toglie un file o una cartella. Un Uri (fuori dal documento) va nel cestino
 * del sistema; un percorso relativo esce dal documento dell'anno, senza
 * cestino. Un file già sparito non ferma niente.
 */
export async function cestina (
  bersaglio: string | apparato.Uri | null | undefined,
  cartella = false,
): Promise<void> {
  if (!bersaglio) return
  if (typeof bersaglio === 'string') {
    // Non recuperabile: `.storico/` copia le collezioni, non i file.
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
  // `risorse/<piano>` e `allegati/<voto>` restano nei riferimenti non migrati:
  // si tolgono per prefisso.
  for (const pianoId of file.risorse) dove?.eliminaSotto(`risorse/${pianoId}`)
  for (const valutazioneId of file.allegati) dove?.eliminaSotto(`allegati/${valutazioneId}`)
  for (const percorso of file.documenti) await cestina(percorso)
  // I fogli stampati dal registro sulla voce.
  for (const percorso of file.stampati) await cestina(percorso)
  // Gli stessi fogli con i nomi di un'altra lingua; quelli assenti si saltano.
  for (const percorso of file.stampatiAltrove) await cestina(percorso)
}

/** Apre un file della cartella dei dati con il programma del sistema, o dice che cosa manca. */
export async function apriFile (
  relativo: string | undefined,
  etichetta: string,
): Promise<EsitoAzione> {
  const t = testi()
  if (!relativo) return rifiutaCon('non-trovato', t.senzaFile(etichetta))
  // Il file sta dentro il documento: se ne apre una copia materializzata.
  const file = await percorsoVero(relativo)
  if (!file) return rifiutaCon('non-trovato', t.fuoriDallAnno(etichetta))
  if (!(await apriConIlSistema(file))) return rifiuta(t.nonApribile(etichetta))
  return fatto
}

/** Un file scelto dal disco: dov'è, come si chiama, che estensione ha. */
export interface FileScelto {
  uri: apparato.Uri
  nome: string
  /** Punto compreso, in minuscolo; `.pdf` se il nome non ne ha una. */
  estensione: string
}

/** Il dialogo per scegliere file da portare nel registro; null se lo si chiude. */
export async function scegliFile (opzioni: {
  titolo: string
  tasto?: string
  filtri?: Record<string, string[]>
  molti?: boolean
}): Promise<FileScelto[] | null> {
  const scelti = await apparato.dialoghi.chiediFile({
    canSelectMany: Boolean(opzioni.molti),
    openLabel: opzioni.tasto ?? parole().scegliConferma,
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
  if (!consegna) return { errore: rifiuta(testi().nonTrovato.consegna) }
  const classe = classeDellaConsegna(registro, consegna)
  if (!classe) return { errore: rifiuta(testi().classeDellaConsegna) }
  return { consegna, classe }
}

// ------------------------------------------------------------------ contesto

/**
 * Un cambiamento del registro. Tornare `false` (solo `false`) vuol dire «non
 * l'ho trovato»: serve ai gestori che aspettano un dialogo, durante il quale
 * la voce può sparire.
 */
type Cambiamento = (r: Registro) => void | boolean

/** Il rifiuto (`conflitto`) di una scrittura arrivata dopo un cambio di documento. */
export function documentoCambiato (): EsitoAzione {
  return rifiutaCon('conflitto', testi().documentoCambiato)
}

/** Quel che un'azione ha sottomano: il registro da leggere e i modi di scriverlo. */
interface Contesto {
  /** Serve a chi deve scrivere più volte, o leggere lo stato dopo aver scritto. */
  archivio: Archivio
  /**
   * Se documento e anno aperti sono ancora quelli di partenza. `modifica` la
   * guarda da sé; a mano serve a chi scrive file nel pacchetto o gira in cicli lunghi.
   */
  ancoraQui (): boolean
  /** Da dove è partita la richiesta, per il giornale; per chiamata, così due richieste non si mescolano. */
  origine?: Origine
  /** Il registro com'è adesso: si legge, non si tocca. */
  registro: Registro
  /**
   * Una scrittura, dichiarando quali collezioni cambia. `mancante` è la frase
   * del rifiuto quando il cambiamento torna `false`.
   */
  modifica (op: Cambiamento, collezioni: Collezione[], mancante?: string): EsitoAzione
  /** Una modifica nel fascicolo di una classe (creato se manca), con il timbro di aggiornamento. */
  nelFascicolo (classeId: string, op: (fascicolo: Fascicolo) => void): EsitoAzione
  /**
   * Una modifica a una voce di una raccolta, trovata per id, con il timbro di
   * aggiornamento. Voce sparita, o `op` che torna `false`: rifiuta senza scrivere.
   */
  suVoce<K extends RaccoltaConId> (
    collezione: K,
    id: string,
    op: (voce: Registro[K][number], r: Registro) => void | boolean,
    altre?: Collezione[],
    mancante?: string,
  ): EsitoAzione
  /**
   * Toglie qualcosa con tutto il suo seguito, senza rifiutare perché «c'è
   * ancora roba dentro»: la conferma la chiede prima il pannello.
   */
  elimina (bersaglio: Bersaglio): Promise<EsitoAzione>
  /** Più eliminazioni in un gesto (un Ctrl+Z); le già sparite si saltano, nessuna rimasta rifiuta. */
  eliminaInsieme (bersagli: readonly Bersaglio[]): Promise<EsitoAzione>
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

export function contestoDi (archivio: Archivio, origine?: Origine): Contesto {
  // Dove si era alla partenza: un gestore che aspetta può vedere cambiare il
  // documento, e `modifica` non deve scrivere in quello nuovo.
  const documento = archivio.documentoAperto?.toString() ?? null
  let anno = archivio.registro.annoCorrenteId
  const ancoraQui = (): boolean =>
    (archivio.documentoAperto?.toString() ?? null) === documento &&
    archivio.registro.annoCorrenteId === anno

  const modifica = (op: Cambiamento, collezioni: Collezione[], mancante?: string): EsitoAzione => {
    if (!ancoraQui()) return documentoCambiato()
    // L'ordine conta. Il divieto dell'anno in chiusura prima di toccare lo
    // stato; la copia per l'annulla prima di `op`, che cambia lo stato vivo;
    // `Archivio.modifica` solo se `op` riesce, perché alza la revisione e non
    // torna indietro (qui rende ufficiale quel che `op` ha già fatto).
    archivio.vietaSeInChiusura()
    archivio.ricordaPrima(collezioni)
    if (op(archivio.registro) === false) {
      return rifiutaCon('non-trovato', mancante ?? testi().nonCePiu)
    }
    archivio.modifica(() => undefined, collezioni)
    // La scrittura stessa può cambiare l'anno corrente: le successive restano buone.
    anno = archivio.registro.annoCorrenteId
    return fatto
  }

  return {
    archivio,
    ancoraQui,
    ...(origine ? { origine } : {}),
    get registro () {
      // Preso ogni volta: una rilettura sostituisce l'oggetto.
      return archivio.registro
    },
    modifica,
    suVoce: (collezione, id, op, altre = [], mancante) => {
      const raccolta = archivio.registro[collezione] as Array<{ id: string }>
      const sparita = testi().vociSparite[collezione]
      if (!raccolta.some((v) => v.id === id)) return rifiutaCon('non-trovato', sparita)
      // Distingue la voce sparita dal `false` di `op`, per scegliere la frase.
      let dentro = false
      const esito = modifica((r) => {
        const voce = (r[collezione] as Array<{ id: string }>).find((v) => v.id === id)
        // Sparita durante l'attesa di un gestore.
        if (!voce) return false
        if (op(voce as Registro[typeof collezione][number], r) === false) {
          dentro = true
          return false
        }
        const timbro = voce as { aggiornataIl?: string; aggiornatoIl?: string }
        if ('aggiornataIl' in timbro) timbro.aggiornataIl = istanteAdesso()
        if ('aggiornatoIl' in timbro) timbro.aggiornatoIl = istanteAdesso()
      },
      [collezione === 'anni' || collezione === 'materie' ? 'registro' : collezione, ...altre],
      sparita)
      return dentro ? rifiutaCon('non-trovato', mancante ?? sparita) : esito
    },
    nelFascicolo: (classeId, op) =>
      modifica((r) => {
        const fascicolo = fascicoloDi(r, classeId)
        // `null` solo se la classe non c'è più.
        if (!fascicolo) return false
        op(fascicolo)
        fascicolo.aggiornatoIl = istanteAdesso()
      }, ['fascicoli'], testi().classeSparita),
    elimina: async (bersaglio) => eliminaInsieme([bersaglio]),
    eliminaInsieme: async (bersagli) => eliminaInsieme(bersagli),
  }

  async function eliminaInsieme (bersagli: readonly Bersaglio[]): Promise<EsitoAzione> {
    {
      const piani = bersagli
        .map((bersaglio) => eliminazione(archivio.registro, bersaglio))
        .filter((piano) => piano !== null)
      if (piani.length === 0) return rifiuta(testi().nienteDaEliminare)
      const piano = {
        file: {
          risorse: piani.flatMap((p) => p.file.risorse),
          allegati: piani.flatMap((p) => p.file.allegati),
          documenti: piani.flatMap((p) => p.file.documenti),
        },
      }
      // Con file portati da qualcuno il gesto non si annulla: la storia tiene
      // le collezioni, non i file. I fogli stampati non contano: si rifanno.
      const { risorse, allegati, documenti } = piano.file
      if (risorse.length + allegati.length + documenti.length > 0) {
        archivio.segnaIrreversibile()
      }
      for (const uno of piani) await togliFile(uno.file)
      const collezioni = [...new Set(piani.flatMap((p) => p.collezioni))]
      return modifica((r) => {
        for (const uno of piani) uno.applica(r)
      }, collezioni)
    }
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

/** Un gestore per ogni azione del protocollo: un'azione non registrata non compila. */
export type Mappa = { [T in Azione['tipo']]: Gestore<T> }

/**
 * Il pezzo di mappa di un file. Si usa con `satisfies`, così le chiavi restano
 * quelle scritte e `azione` arriva ristretta al suo tipo.
 */
export type Parte = Partial<Mappa>
