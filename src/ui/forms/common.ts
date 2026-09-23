// Quel che ogni modulo rifà: mandare l'azione, chiedere conferma prima di
// cancellare, riempire le tendine di classi e corsi, riordinare le righe di un
// elenco trascinandole.
//
// Sta qui e non nei singoli moduli perché sono le regole che devono restare le
// stesse dovunque: se «salva» rimettesse gli errori in cima solo in tre finestre
// su venti, le altre diciassette li perderebbero senza che nessuno se ne
// accorga fino al giorno in cui servono.

import { tipiDiAttivita } from '../../domain/activities.js'
import { type VoceLista } from '../../domain/lists.js'
import type {
  AnnoScolastico,
  CategoriaDocumento,
  Consegna,
  Fascicolo,
  Lezione,
  Osservazione,
  Ricorrenza,
} from '../../domain/models.js'
import { GIORNI_LUNGHI } from '../../domain/dates.js'
import {
  CATEGORIE_DOCUMENTO,
  Maiuscola,
  STATI_LEZIONE,
  TIPI_CONSEGNA,
  TIPI_OSSERVAZIONE,
} from '../../domain/lexicon.js'
import { campo, pulsante, type OpzioneSelezione, type OpzioniCampo } from '../components/base.js'
import { conferma, type ContestoModale } from '../components/modal.js'
import { notifica } from '../components/notifications.js'
import { h, rimpiazza } from '../dom.js'
import { invia } from '../bridge.js'
import { annoCorrente, classePerId, corsiDi, iscriviti, stato } from '../state.js'
import { corsiDellAnno } from '../../domain/courses.js'
import { eliminazione, type Bersaglio } from '../../domain/deletions.js'

export const testo = (valore: unknown): string => String(valore ?? '').trim()

/**
 * Un numero da un campo del modulo, con un predefinito per quando non c'è
 * niente da leggere. `Number('')` vale zero, non «niente» — e senza questo
 * controllo svuotare un campo e basta dava un peso di zero, una durata di
 * zero, una scala che parte da zero, invece di lasciare stare il valore di
 * prima.
 */
export const numero = (valore: unknown, predefinito: number): number => {
  if (valore === '' || valore === null || valore === undefined) return predefinito
  // La virgola vale come punto: qui si scrive in italiano, «1,5» è quel che si
  // batte, e leggerlo come «non è un numero» significava rimettere in silenzio
  // il valore di prima — che è il modo peggiore di dire a qualcuno che ha
  // scritto qualcosa che il programma non capisce.
  const scritto = typeof valore === 'string' ? valore.trim().replace(',', '.') : valore
  // Il vuoto non è uno zero: `Number('')` fa zero, e prenderlo per buono
  // metterebbe a zero un campo che qualcuno ha soltanto svuotato.
  if (scritto === '') return predefinito
  const n = Number(scritto)
  return Number.isFinite(n) ? n : predefinito
}

/**
 * La guardia comune a ogni modulo che ha bisogno di un anno scolastico per
 * aprire: senza, quel che si creerebbe non avrebbe a chi appendersi. Era
 * scritta a mano in quattro moduli, con tre testi diversi che dicevano la
 * stessa cosa in tre modi.
 */
export function richiedeAnno (seNonCe: () => void): AnnoScolastico | null {
  const anno = annoCorrente()
  if (anno) return anno
  notifica('Prima l’anno scolastico: l’avvio guidato lo crea con il resto.', 'avviso')
  seNonCe()
  return null
}

/** Manda l'azione, e se non passa rimette gli errori in cima al modulo. */
export async function salva (
  contesto: ContestoModale,
  azione: Parameters<typeof invia>[0],
  messaggio: string,
  /**
   * Che cosa fare dopo che è passato, con l'id di quel che è nato se è nato.
   *
   * Può essere asincrona — di solito lo è: aprire il corso di una classe appena
   * creata è un'altra azione mandata al registro. `salva` la aspetta, e quindi
   * chi aspetta `salva` aspetta anche questa: senza, il modulo si chiudeva e il
   * seguito continuava per conto suo, con i suoi errori diretti a nessuno.
   */
  dopo?: (idCreato: string | null) => void | Promise<void>,
): Promise<void> {
  contesto.occupato(true)
  const risposta = await invia(azione)
  contesto.occupato(false)
  if (!risposta.ok) {
    contesto.mostraErrori(risposta.errori ?? ['Salvataggio non riuscito.'])
    return
  }
  contesto.chiudi()
  notifica(messaggio, 'successo')
  await dopo?.(risposta.creato?.id ?? null)
}

/**
 * La domanda prima di eliminare, scritta con quel che l'eliminazione si porta
 * via per davvero.
 *
 * Il registro non rifiuta più di cancellare quel che ha qualcosa dentro: un
 * rifiuto lasciava in giro classi sbagliate che nessuno poteva più togliere, e
 * spingeva ad aprire i file a mano. La sicurezza si è spostata qui, e sta nel
 * dire per intero che cosa sparisce prima di farlo — «12 lezioni con l'appello,
 * 5 momenti con 60 voti» — invece di dire di no.
 *
 * L'elenco lo calcola il dominio, lo stesso che poi esegue: due conteggi scritti
 * in due posti sarebbero due occasioni di dire due cose diverse, e qui la
 * seconda sarebbe una bugia detta appena prima di cancellare.
 */
export async function chiediEliminazione (bersaglio: Bersaglio): Promise<boolean> {
  const piano = eliminazione(stato.registro, bersaglio)
  if (!piano) {
    notifica('Non c’è più niente da eliminare: forse è già sparito.', 'avviso')
    return false
  }

  const elenco = (voci: string[]) => voci.map((v) => `• ${v}`).join('\n')
  const parti = [
    piano.perdite.length > 0
      ? `Se ne va anche:\n${elenco(piano.perdite)}`
      : 'Non si porta via nient’altro.',
    piano.staccati.length > 0 ? `Resta, ma staccato:\n${elenco(piano.staccati)}` : null,
    piano.invece,
  ].filter((riga): riga is string => Boolean(riga))

  return conferma({
    titolo: `Eliminare ${piano.nome}?`,
    testo: parti.join('\n\n'),
    testoConferma: 'Elimina',
    pericolo: true,
  })
}

/**
 * Il tasto «Elimina» in fondo a una modale.
 *
 * Era scritto per esteso in quattordici finestre — la domanda, l'azione, gli
 * errori rimessi in cima, la notifica — e ogni copia poteva perdersi un pezzo
 * per strada: alcune non rimettevano gli errori nel modulo, e chi cancellava
 * vedeva la finestra chiudersi come se fosse andata bene.
 *
 * La domanda si fa in due modi: con un `Bersaglio`, e allora l'elenco di quel
 * che sparisce lo calcola il dominio; oppure con un testo scritto a mano, per
 * le cose che non hanno un seguito da elencare.
 */
export function tastoElimina (opzioni: {
  contesto: ContestoModale
  chiedi: Bersaglio | { titolo: string, testo: string, testoConferma?: string }
  azione: Parameters<typeof invia>[0]
  /** Che cosa si dice dopo: «Lezione eliminata.» */
  fatto: string
  /** L'etichetta, quando «Elimina» non è la parola giusta. */
  etichetta?: string
  /** Da fare dopo, di solito staccare la vista da quel che non c'è più. */
  poi?: () => void
}): HTMLElement {
  return pulsante({
    testo: opzioni.etichetta ?? 'Elimina',
    simbolo: 'cestino',
    variante: 'pericolo',
    al: async () => {
      const sicuro =
        'genere' in opzioni.chiedi
          ? await chiediEliminazione(opzioni.chiedi)
          : await conferma({ ...opzioni.chiedi, pericolo: true })
      if (!sicuro) return
      opzioni.contesto.occupato(true)
      const risposta = await invia(opzioni.azione)
      opzioni.contesto.occupato(false)
      if (!risposta.ok) {
        opzioni.contesto.mostraErrori(risposta.errori ?? ['Non riuscito.'])
        return
      }
      opzioni.contesto.chiudi()
      opzioni.poi?.()
      notifica(opzioni.fatto, 'info')
    },
  })
}

/** Il gemello di `tastoElimina`, per la duplicazione: stessa attesa, stessi errori mostrati. */
export function tastoDuplica (opzioni: {
  contesto: ContestoModale
  azione: Parameters<typeof invia>[0]
  /** Che cosa si dice dopo: «Piano duplicato.» */
  fatto: string
  etichetta?: string
  /** Da fare con l'id del duplicato: di solito aprirsi lì. */
  poi?: (idCreato: string) => void
}): HTMLElement {
  return pulsante({
    testo: opzioni.etichetta ?? 'Duplica',
    simbolo: 'duplica',
    variante: 'sottile',
    al: async () => {
      opzioni.contesto.occupato(true)
      const risposta = await invia(opzioni.azione)
      opzioni.contesto.occupato(false)
      if (!risposta.ok) {
        opzioni.contesto.mostraErrori(risposta.errori ?? ['Non riuscito.'])
        return
      }
      opzioni.contesto.chiudi()
      notifica(opzioni.fatto, 'successo')
      if (risposta.creato) opzioni.poi?.(risposta.creato.id)
    },
  })
}

/**
 * Le voci di una tendina da un elenco del lessico: il valore che si salva e la
 * parola che si legge, nell'ordine in cui il lessico le scrive.
 */
function vociDa<T extends string> (nomi: Readonly<Record<T, string>>): Array<{ valore: T; testo: string }> {
  return (Object.keys(nomi) as T[]).map((valore) => ({ valore, testo: nomi[valore] }))
}

/** I giorni della settimana per le tendine dell'orario: 1 = lunedì, come vuole l'ISO 8601. */
export const VOCI_GIORNO_SETTIMANA: OpzioneSelezione[] = GIORNI_LUNGHI.map((nome, i) => ({
  valore: String(i + 1),
  testo: Maiuscola(nome),
}))

/** I tipi di attività di un piano lezione, nell'ordine scelto dalla scuola. */
export function vociTipoAttivita (): VoceLista[] {
  return tipiDiAttivita(stato.registro.impostazioni)
}

/** I tipi di osservazione sull'andamento di una persona in formazione o della classe. */
export const VOCI_TIPO_OSSERVAZIONE: Array<{ valore: Osservazione['tipo']; testo: string }> =
  vociDa(TIPI_OSSERVAZIONE)

/** Gli stati di un'ora di lezione. */
export const VOCI_STATO_LEZIONE: Array<{ valore: Lezione['stato']; testo: string }> =
  vociDa(STATI_LEZIONE)

/** I tipi di consegna. */
export const VOCI_TIPO_CONSEGNA: Array<{ valore: Consegna['tipo']; testo: string }> =
  vociDa(TIPI_CONSEGNA)

/**
 * Aspetta che l'host abbia rimandato indietro lo stato con dentro quel che si è
 * appena creato.
 *
 * La risposta all'azione e lo stato nuovo sono due messaggi distinti, e il
 * primo arriva prima: una tendina riempita subito dopo il salvataggio
 * cercherebbe la voce appena creata fra quelle vecchie e non la troverebbe.
 */
function alloStatoNuovo (pronto: () => boolean, poi: () => void): void {
  if (pronto()) {
    poi()
    return
  }
  // Un tetto ai tentativi: se la voce non arriva — l'host l'ha rifiutata, il
  // pannello si è ricaricato — l'ascolto non deve restare appeso per sempre.
  let rimasti = 20
  const smetti = iscriviti(() => {
    if (!pronto()) {
      rimasti -= 1
      if (rimasti <= 0) smetti()
      return
    }
    smetti()
    poi()
  })
}

interface OpzioniCampoCollegato {
  nome: string
  etichetta: string
  valore: string
  aiuto?: string
  richiesto?: boolean
  larghezza?: OpzioniCampo['larghezza']
  /** La voce di testa, quando la scelta può restare vuota. */
  vuoto?: string
  voci: () => OpzioneSelezione[]
  titoloNuovo: string
  /** Apre il modulo che crea la voce mancante, e richiama con l'id creato. */
  apriNuovo: (fatto: (id: string) => void) => void
  al?: (valore: string) => void
  /** Riceve il modo di rifare l'elenco: serve alle tendine che dipendono da un'altra. */
  riferimento?: (rinfresca: (scelto?: string) => void) => void
}

/**
 * Una tendina con accanto il gesto che crea quel che non c'è ancora.
 *
 * È la mossa che toglie l'ordine obbligato dal registro. Senza, chi apre una
 * classe e non trova la materia deve chiudere il modulo, andare in
 * Impostazioni, crearla e ricominciare da capo — e quel che aveva scritto se ne
 * va. Con il «+» accanto la materia nasce lì, e la scelta si sposta da sola
 * sulla voce nuova.
 */
export function campoCollegato (opzioni: OpzioniCampoCollegato): HTMLElement {
  let selezione: HTMLSelectElement | null = null

  const voci = (): OpzioneSelezione[] => [
    ...(opzioni.vuoto === undefined ? [] : [{ valore: '', testo: opzioni.vuoto }]),
    ...opzioni.voci(),
  ]

  const rinfresca = (scelto?: string) => {
    if (!selezione) return
    const valore = scelto ?? selezione.value
    rimpiazza(selezione, ...voci().map((v) => h('option', { value: v.valore }, v.testo)))
    selezione.value = voci().some((v) => v.valore === valore) ? valore : ''
    // Con `bubbles`, o chi ascolta il cambiamento su un contenitore più in
    // alto — le zone che compaiono e spariscono in `forms/assignment.ts` — non
    // se ne accorgerebbe mai.
    selezione.dispatchEvent(new Event('change', { bubbles: true }))
  }

  const elemento = campo({
    nome: opzioni.nome,
    etichetta: opzioni.etichetta,
    tipo: 'select',
    valore: opzioni.valore,
    opzioni: voci(),
    aiuto: opzioni.aiuto,
    richiesto: opzioni.richiesto,
    larghezza: opzioni.larghezza,
    al: opzioni.al ? (valore) => opzioni.al?.(valore) : undefined,
    azione: pulsante({
      simbolo: 'piu',
      variante: 'sottile',
      titolo: opzioni.titoloNuovo,
      al: () =>
        opzioni.apriNuovo((idCreato) =>
          alloStatoNuovo(
            () => voci().some((v) => v.valore === idCreato),
            () => rinfresca(idCreato),
          ),
        ),
    }),
  })

  selezione = elemento.querySelector('select')
  opzioni.riferimento?.(rinfresca)
  return elemento
}

/** Le materie del registro come opzioni di una tendina. */
export function opzioniMaterie () {
  return [...stato.registro.materie]
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
    .map((m) => ({ valore: m.id, testo: m.sigla ? `${m.nome} (${m.sigla})` : m.nome }))
}

/**
 * I corsi dell'anno come opzioni di una tendina. Una lezione si assegna a un
 * corso e basta: scegliere la classe e poi la materia erano due domande per
 * una risposta sola, e permettevano di dare risposte che non stavano insieme.
 */
/**
 * I corsi che si possono scegliere: esportata perche' `campoCorso` e' andata
 * in `forms/course.ts`, accanto alla finestra che apre.
 */
export function opzioniCorsi () {
  const anno = annoCorrente()
  return corsiDellAnno(stato.registro, anno?.id ?? null)
    .filter((corso) => !classePerId(corso.classeId)?.archiviata)
    .map((corso) => ({ valore: corso.id, testo: corso.titolo }))
    .sort((a, b) => a.testo.localeCompare(b.testo, 'it'))
}

/** Il corso da proporre quando non ne arriva uno: quello del filtro, o il primo. */
export function corsoProposto (classeId?: string): string {
  const opzioni = opzioniCorsi()
  const preferita = classeId ?? stato.filtroClasseId
  if (preferita) {
    const suo = corsiDi(preferita)[0]
    if (suo && opzioni.some((o) => o.valore === suo.id)) return suo.id
  }
  return opzioni[0]?.valore ?? ''
}

/**
 * Il corso da cui partire, dato quel che ha passato chi chiama.
 *
 * Un id che non è di nessun corso — una classe scambiata per un corso, un corso
 * cancellato nel frattempo — non deve arrivare fino al salvataggio: produrrebbe
 * un momento agganciato al nulla, che non compare in nessuna vista e sembra
 * sparito. Meglio ricadere sulla proposta buona e lasciar scegliere dalla
 * tendina.
 */
export function corsoBuono (suggerito?: string): string {
  if (suggerito && stato.registro.corsi.some((c) => c.id === suggerito)) return suggerito
  return corsoProposto()
}

/**
 * La tendina «Corso» col «+» che ne crea uno al volo: la stessa in tre moduli
 * diversi, che differivano solo nei dettagli — un motivo in più perché
 * bastasse sbagliarne uno per disallinearli tutti.
 */
/** Il campo con questo nome dentro un contenitore: al posto di ripetere il selettore ovunque serva leggerlo o scriverlo a mano. */
export function campoDi<T extends HTMLElement = HTMLInputElement> (
  contenitore: ParentNode,
  nome: string,
): T | null {
  return contenitore.querySelector<T>(`[name="${nome}"]`)
}

/** Le spunte dei recapiti fissi di una classe: le stesse in ogni modulo che manda qualcosa «anche a». */
export function campiRecapiti (
  fascicolo: Fascicolo,
  scelti: string[],
  disabilitato = false,
): HTMLElement[] {
  return fascicolo.recapiti.map((recapito) =>
    campo({
      nome: `recapito-${recapito.id}`,
      tipo: 'checkbox',
      etichetta: recapito.etichetta,
      valore: scelti.includes(recapito.id),
      disabilitato,
      larghezza: 'quarto',
    }),
  )
}

/** Quali recapiti sono spuntati, letti dai valori del modulo. */
export function recapitiScelti (
  fascicolo: Fascicolo,
  valori: Record<string, string | number | boolean>,
): string[] {
  return fascicolo.recapiti.filter((r) => Boolean(valori[`recapito-${r.id}`])).map((r) => r.id)
}

/**
 * Applica un orario a un corso: lo salva e, se richiesto, genera anche le
 * lezioni sul calendario — leggendo per davvero come sono andate le due
 * chiamate. Dire che è fatto quando l'host ha rifiutato è la bugia più facile
 * da scrivere, perché il corso c'è comunque e sembra tutto a posto.
 */
export async function applicaOrario (
  corsoId: string,
  orario: Ricorrenza[],
  genera: boolean,
  dal: string,
  al: string,
): Promise<{ ok: boolean, errori?: string[] }> {
  if (orario.length === 0) return { ok: true }
  const impostato = await invia({ tipo: 'orario.imposta', corsoId, orario })
  if (!impostato.ok) return { ok: false, errori: impostato.errori }
  if (!genera) return { ok: true }
  const generato = await invia({ tipo: 'orario.genera', corsoId, dal, al })
  return { ok: generato.ok, errori: generato.errori }
}


/** Lo stesso elenco con la voce che sta in `da` portata in `a`. */
export function spostaVoce<T> (elenco: T[], da: number, a: number): T[] {
  if (a < 0 || a >= elenco.length || da === a) return elenco
  const copia = [...elenco]
  const [voce] = copia.splice(da, 1)
  copia.splice(a, 0, voce)
  return copia
}

/**
 * Righe che si riordinano trascinandole.
 *
 * Si afferra solo dalla presa: `draggable` sulla riga intera toglie il mouse ai
 * campi che ci stanno dentro — selezionare un’ora diventerebbe un
 * trascinamento — quindi il flag si accende sotto il dito e si spegne
 * appena finito. `dragover` non può leggere quel che viaggia, il browser lo
 * tiene chiuso fino al rilascio, e per questo la riga di partenza sta qui in
 * chiaro.
 *
 * La presa è un pulsante e non un’icona qualsiasi: con le frecce su e
 * giù fa lo stesso lavoro del trascinamento, che altrimenti resterebbe un
 * gesto da solo mouse — e mettere in fila le ore di un corso è una cosa
 * che si fa da tastiera, mentre si scrive il resto.
 *
 * Le classi che segna — `riga-in-viaggio`, `riga-posa-sopra`, `riga-posa-sotto`
 * — non portano il nome di nessun elenco: gli slot di una lezione e le tappe di
 * una scaletta si riordinano con lo stesso gesto, e un gesto solo si disegna
 * una volta sola.
 */
export function riordinatore (
  righe: HTMLElement,
  posa: (da: number, a: number) => void,
): (riga: HTMLElement, presa: HTMLElement, indice: number) => void {
  let partenza: number | null = null

  const pulisci = () => {
    partenza = null
    for (const riga of righe.children) {
      riga.classList.remove('riga-in-viaggio', 'riga-posa-sopra', 'riga-posa-sotto')
    }
  }

  return (riga, presa, indice) => {
    presa.addEventListener('pointerdown', () => {
      riga.draggable = true
    })
    presa.addEventListener('pointerup', () => {
      riga.draggable = false
    })
    presa.addEventListener('keydown', (evento: KeyboardEvent) => {
      const verso = evento.key === 'ArrowUp' ? -1 : evento.key === 'ArrowDown' ? 1 : 0
      if (verso === 0) return
      evento.preventDefault()
      posa(indice, indice + verso)
    })

    riga.addEventListener('dragstart', (evento: DragEvent) => {
      partenza = indice
      riga.classList.add('riga-in-viaggio')
      if (!evento.dataTransfer) return
      evento.dataTransfer.effectAllowed = 'move'
      // Un contenuto ci vuole comunque, o il trascinamento non parte.
      evento.dataTransfer.setData('text/plain', String(indice))
    })

    riga.addEventListener('dragover', (evento: DragEvent) => {
      if (partenza === null || partenza === indice) return
      evento.preventDefault()
      if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'move'
      riga.classList.add(partenza < indice ? 'riga-posa-sotto' : 'riga-posa-sopra')
    })

    riga.addEventListener('dragleave', () => {
      riga.classList.remove('riga-posa-sopra', 'riga-posa-sotto')
    })

    riga.addEventListener('drop', (evento: DragEvent) => {
      evento.preventDefault()
      const da = partenza
      pulisci()
      riga.draggable = false
      if (da !== null) posa(da, indice)
    })

    riga.addEventListener('dragend', () => {
      pulisci()
      riga.draggable = false
    })
  }
}

/** Rimette il fuoco sulla presa della riga appena spostata: il gesto continua. */
export function fuocoSullaPresa (righe: HTMLElement, indice: number): void {
  righe.children[indice]?.querySelector<HTMLElement>('.presa-riga')?.focus()
}

/** La presa a cui si afferra una riga per rimetterla in ordine. */
export function presaDiRiga (): HTMLButtonElement {
  return pulsante({
    simbolo: 'presa',
    variante: 'fantasma',
    classe: 'presa-riga',
    titolo: 'Trascina per cambiare l’ordine, o usa le frecce su e giù',
  })
}

export const VOCI_CATEGORIA_DOCUMENTO: Array<{ valore: CategoriaDocumento; testo: string }> =
  vociDa(CATEGORIE_DOCUMENTO)
