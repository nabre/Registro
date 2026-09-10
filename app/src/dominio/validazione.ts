// Due mestieri diversi, tenuti insieme perché guardano le stesse regole.
//
// `valida…` risponde a "questo dato sta in piedi?" e produce messaggi da
// mostrare in interfaccia: serve prima di salvare quel che arriva dai moduli.
//
// `normalizza…` risponde a "che cosa ci faccio con questo file?" e produce
// sempre un oggetto valido, tappando i buchi con i valori predefiniti. I file
// del registro stanno in una cartella che si sincronizza e si può aprire a
// mano: un campo mancante o un JSON di una versione precedente non devono far
// morire l'estensione, devono degradare.

import { annoAllineato, intervalloAnno, ordinaSettimane } from './anni.js'
import {
  MINUTI_UD,
  durataMinuti,
  isoValida,
  istanteAdesso,
  minutiInUd,
  oggi,
  oraValida,
  sommaGiorni,
} from './date.js'
import { emailValida, nomeDelFile, normalizzaTesto, percorsoRelativo, plurale } from './testo.js'
import { contaUd, nomePiano, slotInConflitto } from './calcoli.js'
import { QUANDO_RIFARE_PDF } from './automazione.js'
import { COLORI_CLASSE, IMPOSTAZIONI_PREDEFINITE, SCALA_PREDEFINITA } from './fabbriche.js'
import {
  nuovoIdAllievo,
  nuovoIdAnno,
  nuovoIdAttivita,
  nuovoIdClasse,
  nuovoIdLezione,
  nuovoIdCorso,
  nuovoIdFascicolo,
  nuovoIdMateria,
  nuovoIdConsegna,
  nuovoIdOsservazione,
  nuovoIdPiano,
  nuovoIdRisorsa,
  nuovoIdAllegato,
  nuovoIdBloccoAssenze,
  nuovoIdComunicazione,
  nuovoIdDocumento,
  nuovoIdRecapito,
  nuovoIdRicorrenza,
  nuovoIdSemestre,
  nuovoIdSospensione,
  nuovoIdSlot,
  nuovoIdSmistamento,
  nuovoIdBlocco,
  nuovoIdValutazione,
} from './identificatori.js'
import type {
  Allievo,
  AnnoScolastico,
  Attivita,
  Consegna,
  AvanzamentoAttivita,
  Classe,
  Impostazioni,
  Lezione,
  MomentoValutazione,
  Osservazione,
  PianoLezione,
  Presenza,
  RecuperoProva,
  Registro,
  Scala,
  Allegato,
  BloccoAssenze,
  CategoriaDocumento,
  Comunicazione,
  FoglioAssenze,
  InvioAssenze,
  RigaAssenze,
  TipoRapporto,
  Corso,
  Documento,
  Fascicolo,
  Materia,
  Recapito,
  Ricorrenza,
  Risorsa,
  Semestre,
  Sospensione,
  StatoComunicazione,
  ValutazionePrevista,
  Slot,
  Smistamento,
  BloccoDaSmistare,
  SpuntaConsegna,
  StatoLezione,
  StatoPresenza,
  TipoAttivita,
  TipoOsservazione,
  TipoRisorsa,
  TipoValutazione,
  Voto,
  QuandoRifarePdf,
} from './modelli.js'
import { FASCIA, PERSONE, PIF, del, quanti, un } from './lessico.js'
import { CHI_INSEGNA, VERSIONE_DATI } from './modelli.js'

export interface Esito {
  valido: boolean
  errori: string[]
}

const ok: Esito = { valido: true, errori: [] }

function esito (errori: string[]): Esito {
  return errori.length === 0 ? ok : { valido: false, errori }
}

// ------------------------------------------------------------------ validazione

/**
 * L'anno sta in piedi se stanno in piedi i suoi semestri: sono loro il dato, e
 * le date dell'anno se ne ricavano. Si controlla che ci siano, che ciascuno
 * duri, e che fra l'uno e l'altro non resti un giorno di nessuno.
 */
export function validaAnno (anno: Partial<AnnoScolastico>): Esito {
  const errori: string[] = []
  if (!anno.etichetta?.trim()) errori.push('L’anno scolastico deve avere un’etichetta.')

  const semestri = anno.semestri ?? []
  if (semestri.length === 0) {
    errori.push('L’anno è fatto dai suoi semestri: senza, non ha né inizio né fine.')
  }
  for (const semestre of semestri) {
    if (!isoValida(semestre.inizio) || !isoValida(semestre.fine)) {
      errori.push(`Date non valide nel ${semestre.etichetta || 'semestre'}.`)
    } else if (semestre.inizio >= semestre.fine) {
      errori.push(`Il ${semestre.etichetta || 'semestre'} deve finire dopo il suo inizio.`)
    }
  }
  // La contiguità si guarda nell'ordine delle date, non in quello dell'elenco:
  // un file con i semestri scritti al contrario è comunque un anno intero.
  const inFila = [...semestri].sort((a, b) => String(a.inizio).localeCompare(String(b.inizio)))
  for (let i = 1; i < inFila.length; i += 1) {
    if (!isoValida(inFila[i].inizio) || !isoValida(inFila[i - 1].fine)) continue
    if (inFila[i].inizio !== sommaGiorni(inFila[i - 1].fine, 1)) {
      errori.push(
        `Il ${inFila[i].etichetta || 'semestre'} deve cominciare il giorno dopo la fine ` +
          `del ${inFila[i - 1].etichetta || 'precedente'}.`,
      )
    }
  }

  const intervallo = intervalloAnno(semestri.filter((s) => isoValida(s.inizio) && isoValida(s.fine)))
  if (intervallo && (anno.inizio !== intervallo.inizio || anno.fine !== intervallo.fine)) {
    errori.push('Le date dell’anno non sono quelle dei suoi semestri.')
  }

  // Le pause valgono per l'anno in cui stanno scritte: una che cade fuori non
  // spegnerebbe nessun giorno e non verrebbe saltata da nessuna generazione —
  // resterebbe lì a dire il falso.
  for (const pausa of anno.sospensioni ?? []) {
    const suo = validaSospensione(pausa)
    if (!suo.valido) {
      errori.push(...suo.errori)
      continue
    }
    if (intervallo && (pausa.dal < intervallo.inizio || pausa.al > intervallo.fine)) {
      errori.push(`«${pausa.etichetta}» cade fuori dall’anno.`)
    }
  }
  return esito(errori)
}

/** Un periodo di chiusura sta in piedi se le due date ci sono e sono in ordine. */
export function validaSospensione (sospensione: Partial<Sospensione>): Esito {
  const errori: string[] = []
  if (!sospensione.etichetta?.trim()) errori.push('La sospensione deve avere un nome.')
  if (!isoValida(sospensione.dal)) errori.push('Data d’inizio non valida.')
  if (!isoValida(sospensione.al)) errori.push('Data di fine non valida.')
  if (isoValida(sospensione.dal) && isoValida(sospensione.al) && sospensione.dal! > sospensione.al!) {
    errori.push('La sospensione finisce prima di cominciare.')
  }
  return esito(errori)
}

/**
 * Una fascia dell'orario. Due fasce dello stesso corso non possono cominciare
 * lo stesso giorno alla stessa ora: genererebbero due volte la stessa lezione,
 * e la seconda verrebbe scartata in silenzio.
 */
export function validaRicorrenza (
  ricorrenza: Partial<Ricorrenza>,
  altre: Ricorrenza[] = [],
): Esito {
  const errori: string[] = []
  const giorno = Number(ricorrenza.giorno)
  if (!(giorno >= 1 && giorno <= 7)) errori.push('Giorno della settimana non valido.')
  if (!oraValida(ricorrenza.inizio)) errori.push('Ora d’inizio non valida: usare HH:MM.')
  const durata = Number(ricorrenza.durataMin)
  if (!(durata > 0)) {
    errori.push('La durata deve essere maggiore di zero.')
  } else if (durata % MINUTI_UD !== 0) {
    errori.push(`Una fascia dura un numero intero di unità didattiche da ${MINUTI_UD} minuti.`)
  }
  if (ricorrenza.dal && !isoValida(ricorrenza.dal)) errori.push('«Dal» non è una data valida.')
  if (ricorrenza.al && !isoValida(ricorrenza.al)) errori.push('«Al» non è una data valida.')
  if (ricorrenza.dal && ricorrenza.al && ricorrenza.dal > ricorrenza.al) {
    errori.push('Il periodo della fascia finisce prima di cominciare.')
  }
  const gemella = altre.find(
    (r) => r.id !== ricorrenza.id && r.giorno === giorno && r.inizio === ricorrenza.inizio,
  )
  if (gemella) errori.push('C’è già una fascia in questo giorno alla stessa ora.')
  return esito(errori)
}

export function validaClasse (classe: Partial<Classe>, altre: Classe[] = []): Esito {
  const errori: string[] = []
  const nome = classe.nome?.trim() ?? ''
  if (!nome) errori.push('La classe deve avere un nome.')
  const gemella = altre.find(
    (c) => c.id !== classe.id && c.annoId === classe.annoId && c.nome.trim().toLowerCase() === nome.toLowerCase(),
  )
  if (gemella) errori.push(`Esiste già una classe «${gemella.nome}» in questo anno.`)
  return esito(errori)
}

/** Sta in `testo.ts`, dove non importa nulla: da qui si riesporta per chi la cercava qui. */
export { emailValida }

export function validaAllievo (allievo: Partial<Allievo>): Esito {
  const errori: string[] = []
  if (!allievo.cognome?.trim()) errori.push('Il cognome è obbligatorio.')
  if (!allievo.nome?.trim()) errori.push('Il nome è obbligatorio.')
  // Il modulo la chiede con un campo data, ma un file scritto a mano no: una
  // nascita storta finisce stampata su una scheda che va in segreteria.
  if (allievo.dataNascita && !isoValida(allievo.dataNascita)) {
    errori.push('Data di nascita non valida: usare il formato AAAA-MM-GG.')
  }
  if (allievo.email && !emailValida(allievo.email)) {
    errori.push('Indirizzo e-mail non valido.')
  }
  if (allievo.emailTutore && !emailValida(allievo.emailTutore)) {
    errori.push(`Indirizzo e-mail ${del(PERSONE.rappresentante)} non valido.`)
  }
  // È l'indirizzo a cui partono le richieste di firma: un refuso qui si
  // scopre a fine trimestre, quando venticinque mail non arrivano.
  if (allievo.emailDatore && !emailValida(allievo.emailDatore)) {
    errori.push('Indirizzo e-mail del datore di lavoro non valido.')
  }
  return esito(errori)
}

export function validaSlot (slot: Slot[]): Esito {
  const errori: string[] = []
  if (slot.length === 0) errori.push(`La lezione deve avere almeno ${un(FASCIA)}.`)
  for (const s of slot) {
    if (!oraValida(s.inizio) || !oraValida(s.fine)) {
      errori.push('Orari non validi: usare il formato HH:MM.')
    } else if (s.inizio >= s.fine) {
      errori.push(`La fascia ${s.inizio}–${s.fine} finisce prima di cominciare.`)
    } else if (s.tipo === 'lezione' && durataMinuti(s.inizio, s.fine) % MINUTI_UD !== 0) {
      // Le pause durano i minuti che durano; un'ora di lezione no: è fatta di
      // unità didattiche, e una mezza UD non esiste in nessun conteggio.
      errori.push(
        `La fascia ${s.inizio}–${s.fine} non è un multiplo dell’unità didattica (${MINUTI_UD} min).`,
      )
    }
  }
  for (const [a, b] of slotInConflitto(slot)) {
    errori.push(`Le fasce ${a.inizio}–${a.fine} e ${b.inizio}–${b.fine} si sovrappongono.`)
  }
  if (slot.length > 0 && slot.every((s) => s.tipo === 'pausa')) {
    errori.push('Una lezione fatta di sole pause non è una lezione.')
  }
  return esito(errori)
}

export function validaLezione (lezione: Partial<Lezione>): Esito {
  const errori: string[] = []
  if (!isoValida(lezione.data)) errori.push('Data della lezione non valida.')
  if (!lezione.corsoId) errori.push('Assegnare un corso alla lezione.')
  errori.push(...validaSlot(lezione.slot ?? []).errori)
  return esito(errori)
}

/**
 * Un indirizzo che si può aprire senza sorprese. Solo http e https: un piano è
 * un documento, e da un documento non deve partire niente che non sia una
 * pagina — `javascript:` e `file:` restano fuori.
 */
export function urlValido (valore: unknown): boolean {
  if (typeof valore !== 'string' || !valore.trim()) return false
  try {
    const schema = new URL(valore.trim()).protocol
    return schema === 'http:' || schema === 'https:'
  } catch {
    return false
  }
}

export function validaRisorsa (risorsa: Partial<Risorsa>): Esito {
  const errori: string[] = []
  if (!risorsa.titolo?.trim()) errori.push('La risorsa deve avere un titolo.')
  if (risorsa.tipo === 'collegamento' && !urlValido(risorsa.url)) {
    errori.push('L’indirizzo non è valido: deve cominciare con http:// o https://.')
  }
  return esito(errori)
}

export function validaPiano (piano: Partial<PianoLezione>): Esito {
  const errori: string[] = []
  // Un piano è di un corso, sempre. Senza, finiva in un elenco dove non lo
  // cercava nessuno: non compariva fra i piani di nessuna lezione, e restava
  // a galleggiare fingendosi un piano come gli altri. I piani rimasti senza
  // corso esistono soltanto perché il corso è stato eliminato sotto — le
  // riparazioni li staccano invece di buttarli via — e il pannello li mostra
  // apposta in fondo, da riagganciare.
  if (!piano.corsoId) errori.push('Il piano dev’essere di un corso.')
  for (const attivita of piano.attivita ?? []) {
    if (!attivita.titolo?.trim()) errori.push('Ogni attività deve avere un titolo.')
    if (!(attivita.durataUd > 0)) {
      errori.push(`Durata non valida per l’attività «${attivita.titolo || 'senza titolo'}».`)
    }
  }
  return esito(errori)
}

/**
 * Il nome di una materia ridotto all'osso: minuscole, senza accenti e senza
 * spazi doppi. 'Ed. fisica' e 'ed.  fisica' sono la stessa materia scritta due
 * volte, e due materie uguali fanno due corsi che si dividono le stesse ore.
 */
export function nomeNormalizzato (nome: string): string {
  return normalizzaTesto(nome)
}

/** Quante correzioni separano due parole. Serve solo per accorgersi di un refuso. */
function distanza (a: string, b: string): number {
  if (a === b) return 0
  const riga = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    let angolo = riga[0]
    riga[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const precedente = riga[j]
      riga[j] = Math.min(
        riga[j] + 1,
        riga[j - 1] + 1,
        angolo + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      angolo = precedente
    }
  }
  return riga[b.length]
}

/**
 * Le materie che assomigliano a un nome senza esserlo: quasi sempre è la stessa
 * materia riscritta con un refuso. Non è un errore — 'Storia' e 'Storia
 * dell'arte' sono due materie vere — e per questo si mostra come avvertenza,
 * non come rifiuto: la scelta di andare avanti resta di chi scrive.
 */
export function materieSimili (
  nome: string,
  materie: Materia[],
  escludiId?: string,
): Materia[] {
  const cercato = nomeNormalizzato(nome)
  if (cercato.length < 4) return []
  return materie.filter((m) => {
    if (m.id === escludiId) return false
    const suo = nomeNormalizzato(m.nome)
    if (suo === cercato) return false
    const soglia = Math.min(cercato.length, suo.length) >= 8 ? 2 : 1
    return distanza(cercato, suo) <= soglia
  })
}

export function validaMateria (materia: Partial<Materia>, altre: Materia[] = []): Esito {
  const errori: string[] = []
  const nome = materia.nome?.trim() ?? ''
  if (!nome) errori.push('La materia deve avere un nome.')
  const gemella = altre.find(
    (m) => m.id !== materia.id && nomeNormalizzato(m.nome) === nomeNormalizzato(nome),
  )
  if (gemella) errori.push(`Esiste già una materia «${gemella.nome}».`)
  return esito(errori)
}

/** Un corso per coppia classe+materia: è la regola che lo rende un'identita'. */
export function validaCorso (corso: Partial<Corso>, altri: Corso[] = []): Esito {
  const errori: string[] = []
  if (!corso.classeId) errori.push('Il corso deve avere una classe.')
  if (!corso.materiaId) errori.push('Il corso deve avere una materia.')
  const gemello = altri.find(
    (c) => c.id !== corso.id && c.classeId === corso.classeId && c.materiaId === corso.materiaId,
  )
  if (gemello) errori.push(`Questa materia è già insegnata in questa classe: «${gemello.titolo}».`)
  return esito(errori)
}

export function validaRecapito (recapito: Partial<Recapito>): Esito {
  const errori: string[] = []
  if (!recapito.etichetta?.trim()) errori.push('Il recapito deve avere un’etichetta.')
  if (!emailValida(recapito.email)) errori.push('Indirizzo e-mail non valido.')
  return esito(errori)
}

export function validaComunicazione (comunicazione: Partial<Comunicazione>): Esito {
  const errori: string[] = []
  if (!comunicazione.oggetto?.trim()) errori.push('La comunicazione deve avere un oggetto.')
  if (!comunicazione.corpo?.trim()) errori.push('La comunicazione è vuota.')
  const gruppi =
    Boolean(comunicazione.aAllievi) ||
    Boolean(comunicazione.aTutori) ||
    (comunicazione.recapitiIds ?? []).length > 0
  if (!gruppi) errori.push('Scegliere almeno un gruppo di destinatari.')
  return esito(errori)
}

export function validaScala (scala: Partial<Scala>): Esito {
  const errori: string[] = []
  const { min, max, sufficienza, passo } = { ...SCALA_PREDEFINITA, ...scala }
  if (!(min < max)) errori.push('Il minimo della scala deve essere inferiore al massimo.')
  if (sufficienza < min || sufficienza > max) {
    errori.push('La sufficienza deve cadere dentro la scala.')
  }
  if (!(passo > 0)) errori.push('Il passo dei voti deve essere positivo.')
  return esito(errori)
}

export function validaValutazione (momento: Partial<MomentoValutazione>): Esito {
  const errori: string[] = []
  if (!momento.titolo?.trim()) errori.push('Il momento di valutazione deve avere un titolo.')
  if (!isoValida(momento.data)) errori.push('Data non valida.')
  if (!momento.corsoId) errori.push('Assegnare un corso.')
  // Zero è ammesso: è la prova che si fa e non fa media. Fuori dagli estremi
  // no — un peso da cento non è una ponderazione, e ribalterebbe una media
  // intera senza dirlo.
  const peso = Number(momento.peso)
  if (!Number.isFinite(peso) || peso < 0 || peso > 10) {
    errori.push('Il peso va da 0 a 10, con i decimali; 1 è il valore normale.')
  }
  if (momento.scala) errori.push(...validaScala(momento.scala).errori)
  const scala = { ...SCALA_PREDEFINITA, ...(momento.scala ?? {}) }
  for (const voto of momento.voti ?? []) {
    if (voto.valore === null || voto.assente) continue
    if (voto.valore < scala.min || voto.valore > scala.max) {
      errori.push(`Voto ${voto.valore} fuori dalla scala ${scala.min}–${scala.max}.`)
    }
  }
  return esito(errori)
}

// ------------------------------------------------------------------ normalizzazione

function testo (valore: unknown, predefinito = ''): string {
  return typeof valore === 'string' ? valore : predefinito
}

function numero (valore: unknown, predefinito: number): number {
  // La virgola vale come punto anche qui: i file del registro si correggono a
  // mano, e chi li corregge scrive in italiano. Un «1,5» letto come «non è un
  // numero» diventava silenziosamente il valore di ripiego.
  if (typeof valore === 'number') return Number.isFinite(valore) ? valore : predefinito
  // Il vuoto non è uno zero: `Number('')` fa zero, e leggerlo così metteva a
  // zero ogni campo mancante — la sufficienza di una scala, il peso di una
  // prova — invece di lasciare il valore di ripiego.
  const scritto = String(valore ?? '').trim().replace(',', '.')
  if (scritto === '') return predefinito
  const n = Number(scritto)
  return Number.isFinite(n) ? n : predefinito
}

function booleano (valore: unknown, predefinito: boolean): boolean {
  return typeof valore === 'boolean' ? valore : predefinito
}

function unaData (valore: unknown, predefinito: string): string {
  return isoValida(valore) ? valore : predefinito
}

function unOra (valore: unknown, predefinito: string): string {
  return oraValida(valore) ? valore : predefinito
}

function unaVoce<T extends string> (valore: unknown, ammesse: readonly T[], predefinito: T): T {
  return ammesse.includes(valore as T) ? (valore as T) : predefinito
}

function elenco (valore: unknown): unknown[] {
  return Array.isArray(valore) ? valore : []
}

function oggetto (valore: unknown): Record<string, unknown> {
  return valore && typeof valore === 'object' && !Array.isArray(valore)
    ? (valore as Record<string, unknown>)
    : {}
}

const STATI_PRESENZA: StatoPresenza[] = [
  'non-impostato', 'presente', 'assente', 'ritardo', 'esonerato',
]

/**
 * Gli stati che non esistono più, e in che cosa si leggono oggi.
 *
 * Un registro sta in una cartella sincronizzata e si apre anche da un'altra
 * macchina rimasta indietro: i due stati tolti devono continuare a voler dire
 * qualcosa, non diventare «presente» in silenzio. Una giustificazione resta
 * un'assenza — che sia scusata si scrive nella nota — e un'uscita anticipata
 * resta un'ora rotta, che è quel che il ritardo dice.
 */
const STATI_VECCHI: Record<string, StatoPresenza> = {
  giustificato: 'assente',
  'uscita-anticipata': 'ritardo',
}

/**
 * Uno stato letto da disco. Quel che non si riconosce diventa «non impostato»
 * e non «presente»: di una casella scritta male non si sa niente, e dire che
 * l'allievo c'era sarebbe inventarselo.
 */
function unoStatoPresenza (grezzo: unknown): StatoPresenza {
  const nome = typeof grezzo === 'string' ? grezzo : ''
  return STATI_VECCHI[nome] ?? unaVoce(nome, STATI_PRESENZA, 'non-impostato')
}
const TIPI_OSSERVAZIONE: TipoOsservazione[] = [
  'nota', 'merito', 'disciplina', 'compiti', 'materiale', 'colloquio',
]
const STATI_LEZIONE: StatoLezione[] = ['pianificata', 'svolta', 'annullata']
const TIPI_ATTIVITA: TipoAttivita[] = [
  'docenza-di-classe',
  'introduzione', 'spiegazione', 'esercizio', 'laboratorio', 'discussione',
  'verifica', 'gruppo', 'ripasso', 'compito', 'altro',
]
const TIPI_VALUTAZIONE: TipoValutazione[] = [
  'scritto', 'orale', 'pratico', 'progetto', 'compito', 'osservazione',
]

function normalizzaScala (grezzo: unknown): Scala {
  const dati = oggetto(grezzo)
  const min = numero(dati.min, SCALA_PREDEFINITA.min)
  const max = numero(dati.max, SCALA_PREDEFINITA.max)
  const massimo = max > min ? max : min + 1
  const sufficienza = numero(dati.sufficienza, SCALA_PREDEFINITA.sufficienza)
  const passo = numero(dati.passo, SCALA_PREDEFINITA.passo)
  // Le stesse regole di `validaScala`: quel che un modulo rifiuterebbe, un file
  // scritto a mano non lo deve far passare dalla porta di servizio.
  return {
    min,
    max: massimo,
    sufficienza: Math.min(massimo, Math.max(min, sufficienza)),
    passo: passo > 0 ? passo : SCALA_PREDEFINITA.passo,
  }
}

function normalizzaSemestri (grezzo: unknown, inizioAnno: string, fineAnno: string): Semestre[] {
  const voci = elenco(grezzo).map((v, indice): Semestre => {
    const dati = oggetto(v)
    return {
      id: testo(dati.id) || nuovoIdSemestre(),
      numero: indice === 0 ? 1 : 2,
      etichetta: testo(dati.etichetta) || `${indice + 1}° semestre`,
      inizio: unaData(dati.inizio, inizioAnno),
      fine: unaData(dati.fine, fineAnno),
    }
  })
  return voci.slice(0, 2)
}

function normalizzaSospensione (grezzo: unknown, inizioAnno: string): Sospensione {
  const dati = oggetto(grezzo)
  const dal = unaData(dati.dal, inizioAnno)
  const al = unaData(dati.al, dal)
  return {
    id: testo(dati.id) || nuovoIdSospensione(),
    etichetta: testo(dati.etichetta, 'Sospensione'),
    dal,
    // Una sospensione al contrario è un refuso: dura un giorno invece di sparire.
    al: al >= dal ? al : dal,
  }
}

export function normalizzaAnno (grezzo: unknown): AnnoScolastico {
  const dati = oggetto(grezzo)
  const inizio = unaData(dati.inizio, '2024-09-01')
  const fine = unaData(dati.fine, '2025-06-30')
  const semestri = normalizzaSemestri(dati.semestri, inizio, fine)

  // Le date dell'anno scritte nel file valgono solo finché non ci sono
  // semestri: appena ci sono, sono loro a dire da quando a quando va l'anno, e
  // `annoAllineato` le riscrive. Un file di prima, con le quattro date già
  // discordi, si rimette in ordine da solo alla prima apertura.
  return annoAllineato({
    id: testo(dati.id) || nuovoIdAnno(),
    etichetta: testo(dati.etichetta, `${inizio.slice(0, 4)}/${fine.slice(0, 4)}`),
    inizio,
    fine,
    semestri,
    sospensioni: elenco(dati.sospensioni)
      .map((v) => normalizzaSospensione(v, inizio))
      .sort((a, b) => a.dal.localeCompare(b.dal)),
    // Le settimane A e B: chiavi non date e lettere sconosciute si buttano,
    // e una data qualsiasi diventa il lunedì della sua settimana.
    settimane: ordinaSettimane(oggetto(dati.settimane)),
    note: testo(dati.note),
  })
}

function normalizzaAllievo (grezzo: unknown): Allievo {
  const dati = oggetto(grezzo)
  return {
    id: testo(dati.id) || nuovoIdAllievo(),
    cognome: testo(dati.cognome),
    nome: testo(dati.nome),
    // Solo se è una data: un '23.05.2010' arrivato da un incolla resterebbe
    // scritto nell'anagrafica e uscirebbe come un trattino su ogni foglio.
    dataNascita: isoValida(dati.dataNascita) ? dati.dataNascita : '',
    indirizzo: testo(dati.indirizzo),
    email: testo(dati.email),
    emailTutore: testo(dati.emailTutore),
    azienda: testo(dati.azienda),
    indirizzoDatore: testo(dati.indirizzoDatore),
    emailDatore: testo(dati.emailDatore),
    telefonoDatore: testo(dati.telefonoDatore),
    telefono: testo(dati.telefono),
    // Il ritratto è un percorso, non i byte: il file sta nella cartella della
    // classe, e qui si tiene soltanto dove.
    foto: testo(dati.foto),
    // Quel che c'era di più — le note — non si rilegge: il registro tiene chi
    // è l'allievo e come lo si raggiunge, e il resto dell'anagrafica della
    // scuola sta altrove. Nei file vecchi resta scritto e smette di comparire,
    // come ogni altro campo che il registro ha smesso di prevedere.
    attivo: booleano(dati.attivo, true),
  }
}

const CATEGORIE_DOCUMENTO: CategoriaDocumento[] = [
  'certificato',
  'autorizzazione',
  'giustificazione',
  'modulo',
  'altro',
]

const STATI_COMUNICAZIONE: StatoComunicazione[] = ['bozza', 'inviata', 'errore']

function normalizzaRecapito (grezzo: unknown): Recapito {
  const dati = oggetto(grezzo)
  return {
    id: testo(dati.id) || nuovoIdRecapito(),
    etichetta: testo(dati.etichetta, 'Recapito'),
    email: testo(dati.email).trim(),
    predefinito: booleano(dati.predefinito, true),
  }
}

function normalizzaDocumento (grezzo: unknown): Documento {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  const file = percorsoRelativo(dati.file)
  return {
    id: testo(dati.id) || nuovoIdDocumento(),
    allievoId: typeof dati.allievoId === 'string' && dati.allievoId ? dati.allievoId : null,
    titolo: testo(dati.titolo, 'Documento'),
    categoria: unaVoce(dati.categoria, CATEGORIE_DOCUMENTO, 'altro'),
    file,
    nome: testo(dati.nome) || nomeDelFile(file),
    scadenza: isoValida(dati.scadenza) ? (dati.scadenza as string) : undefined,
    note: testo(dati.note),
    aggiuntoIl: testo(dati.aggiuntoIl, ora),
  }
}

function normalizzaComunicazione (grezzo: unknown): Comunicazione {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  return {
    id: testo(dati.id) || nuovoIdComunicazione(),
    oggetto: testo(dati.oggetto, 'Senza oggetto'),
    corpo: testo(dati.corpo),
    aAllievi: booleano(dati.aAllievi, true),
    aTutori: booleano(dati.aTutori, false),
    recapitiIds: elenco(dati.recapitiIds).map((r) => testo(r)).filter(Boolean),
    documentiIds: elenco(dati.documentiIds).map((d) => testo(d)).filter(Boolean),
    stato: unaVoce(dati.stato, STATI_COMUNICAZIONE, 'bozza'),
    destinatari: elenco(dati.destinatari).map((d) => testo(d)).filter(Boolean),
    errore: testo(dati.errore) || undefined,
    creataIl: testo(dati.creataIl, ora),
    inviataIl: testo(dati.inviataIl) || undefined,
    // Assente vuol dire «non si sa», ed è diverso da `false`: si rilegge solo
    // se c'era davvero un booleano scritto.
  }
}

/** I due fogli di un periodo, nell'ordine in cui si guardano. */
export const TIPI_RAPPORTO: readonly TipoRapporto[] = ['assenze', 'ritardi']

function normalizzaFoglioAssenze (grezzo: unknown): FoglioAssenze {
  const dati = oggetto(grezzo)
  const file = percorsoRelativo(dati.file)
  return {
    tipo: unaVoce(dati.tipo, TIPI_RAPPORTO, 'assenze'),
    firmato: booleano(dati.firmato, false),
    file,
    nome: testo(dati.nome) || nomeDelFile(file),
    aggiuntoIl: testo(dati.aggiuntoIl, istanteAdesso()),
  }
}

function normalizzaInvioAssenze (grezzo: unknown): InvioAssenze | null {
  if (grezzo === null || grezzo === undefined) return null
  const dati = oggetto(grezzo)
  return {
    destinatari: elenco(dati.destinatari).map((d) => testo(d)).filter(Boolean),
    inviatoIl: testo(dati.inviatoIl, istanteAdesso()),
    errore: testo(dati.errore) || undefined,
  }
}

function normalizzaRigaAssenze (grezzo: unknown): RigaAssenze {
  const dati = oggetto(grezzo)
  return {
    allievoId: testo(dati.allievoId),
    // Un foglio senza file non esiste: è la riga che qualcuno ha cominciato a
    // scrivere a mano nel JSON e non ha finito, e tenerla vorrebbe dire una
    // casella verde che non apre niente.
    fogli: elenco(dati.fogli).map(normalizzaFoglioAssenze).filter((f) => f.file),
    invio: normalizzaInvioAssenze(dati.invio),
    note: testo(dati.note),
  }
}

/**
 * Un periodo di assenze. Le date sono l'unica cosa che deve stare in piedi: un
 * periodo al contrario — «dal 31 dicembre al 1° settembre» — non dice niente a
 * nessuno, e si raddrizza invece di rifiutare il file.
 */
// La lettera di serie di prima nominava assenze e ritardi sempre, anche a chi
// riceveva un foglio solo: la richiesta parte per allievo, e l'azienda che ne
// riceveva uno rispondeva domandando dov'era l'altro. Adesso lo dicono
// `{tipi}` e `{rapporti}`, che si scrivono secondo quel che è in allegato.
//
// I periodi scritti prima si aggiornano qui, quando il file si legge: aspettare
// che qualcuno riscriva a mano la lettera di un periodo già aperto vuol dire
// mandare per un altro trimestre quella sbagliata. Si tocca solo il testo
// rimasto identico a quello di serie: una lettera riscritta dal docente è come
// lui l'ha voluta, e non si corregge.
const OGGETTO_PRIMA = 'Assenze e ritardi — {allievo}'

const FRASI_PRIMA: Array<[string, string]> = [
  ['il rapporto delle assenze e dei ritardi di {allievo}', '{rapporti} di {allievo}'],
  ['controfirmare i documenti e di rispedirceli', 'controfirmare quanto allegato e di rispedircelo'],
]

function oggettoAggiornato (oggetto: string): string {
  return oggetto.startsWith(OGGETTO_PRIMA)
    ? `{tipi} — {allievo}${oggetto.slice(OGGETTO_PRIMA.length)}`
    : oggetto
}

function corpoAggiornato (corpo: string): string {
  let scritto = corpo
  for (const [prima, adesso] of FRASI_PRIMA) scritto = scritto.replace(prima, adesso)
  return scritto
}

export function normalizzaBloccoAssenze (grezzo: unknown): BloccoAssenze {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  const primo = unaData(dati.dal, oggi())
  const secondo = unaData(dati.al, primo)
  return {
    id: testo(dati.id) || nuovoIdBloccoAssenze(),
    etichetta: testo(dati.etichetta, 'Periodo'),
    dal: primo <= secondo ? primo : secondo,
    al: primo <= secondo ? secondo : primo,
    oggetto: oggettoAggiornato(testo(dati.oggetto)),
    corpo: corpoAggiornato(testo(dati.corpo)),
    aAllievo: booleano(dati.aAllievo, false),
    aTutore: booleano(dati.aTutore, false),
    recapitiIds: elenco(dati.recapitiIds).map((r) => testo(r)).filter(Boolean),
    righe: elenco(dati.righe).map(normalizzaRigaAssenze).filter((r) => r.allievoId),
    note: testo(dati.note),
    creatoIl: testo(dati.creatoIl, ora),
    aggiornatoIl: testo(dati.aggiornatoIl, ora),
  }
}

/**
 * Un periodo sta in piedi se si sa di che periodo parla e che cosa scrive
 * all'azienda. L'oggetto e il testo si controllano qui e non al momento
 * dell'invio: una bozza senza testo si salva volentieri, ma venticinque mail
 * vuote partite in blocco non si richiamano indietro.
 */
export function validaBloccoAssenze (blocco: Partial<BloccoAssenze>): Esito {
  const errori: string[] = []
  if (!blocco.etichetta?.trim()) errori.push('Il periodo deve avere un nome.')
  if (!isoValida(blocco.dal)) errori.push('Data d’inizio non valida.')
  if (!isoValida(blocco.al)) errori.push('Data di fine non valida.')
  if (isoValida(blocco.dal) && isoValida(blocco.al) && blocco.dal > blocco.al) {
    errori.push('Il periodo finisce prima di cominciare.')
  }
  if (!blocco.oggetto?.trim()) errori.push('L’e-mail deve avere un oggetto.')
  if (!blocco.corpo?.trim()) errori.push('L’e-mail è vuota.')
  return esito(errori)
}

export function normalizzaMateria (grezzo: unknown): Materia {
  const dati = oggetto(grezzo)
  return {
    id: testo(dati.id) || nuovoIdMateria(),
    nome: testo(dati.nome, 'Materia'),
    sigla: testo(dati.sigla),
    colore: testo(dati.colore),
    note: testo(dati.note),
  }
}

function normalizzaRicorrenza (grezzo: unknown): Ricorrenza {
  const dati = oggetto(grezzo)
  const giorno = Math.round(numero(dati.giorno, 1))
  return {
    id: testo(dati.id) || nuovoIdRicorrenza(),
    giorno: giorno >= 1 && giorno <= 7 ? giorno : 1,
    inizio: unOra(dati.inizio, '08:00'),
    durataMin: minutiInUd(numero(dati.durataMin, MINUTI_UD)),
    aula: testo(dati.aula),
    dal: isoValida(dati.dal) ? (dati.dal as string) : undefined,
    al: isoValida(dati.al) ? (dati.al as string) : undefined,
  }
}

export function normalizzaCorso (grezzo: unknown): Corso {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  return {
    id: testo(dati.id) || nuovoIdCorso(),
    classeId: testo(dati.classeId),
    materiaId: testo(dati.materiaId),
    titolo: testo(dati.titolo, 'Corso'),
    orario: elenco(dati.orario)
      .map(normalizzaRicorrenza)
      .sort((a, b) => a.giorno - b.giorno || a.inizio.localeCompare(b.inizio)),
    note: testo(dati.note),
    creatoIl: testo(dati.creatoIl, ora),
    aggiornatoIl: testo(dati.aggiornatoIl, ora),
  }
}

/** Il fascicolo di una classe. Le tre raccolte dentro sono sue, non della classe. */
export function normalizzaFascicolo (grezzo: unknown): Fascicolo {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  return {
    id: testo(dati.id) || nuovoIdFascicolo(),
    classeId: testo(dati.classeId),
    recapiti: elenco(dati.recapiti).map(normalizzaRecapito),
    documenti: elenco(dati.documenti).map(normalizzaDocumento),
    comunicazioni: elenco(dati.comunicazioni).map(normalizzaComunicazione),
    assenze: elenco(dati.assenze).map(normalizzaBloccoAssenze),
    creatoIl: testo(dati.creatoIl, ora),
    aggiornatoIl: testo(dati.aggiornatoIl, ora),
  }
}

export function normalizzaClasse (grezzo: unknown, indice = 0): Classe {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  return {
    id: testo(dati.id) || nuovoIdClasse(),
    annoId: testo(dati.annoId),
    nome: testo(dati.nome, 'Classe senza nome'),
    sede: testo(dati.sede),
    // Senza un colore buono se ne prende uno dalla tavolozza, a rotazione:
    // due classi rimaste senza non devono uscire tutte e due dello stesso blu.
    colore: /^#[0-9a-fA-F]{6}$/.test(testo(dati.colore))
      ? testo(dati.colore)
      : COLORI_CLASSE[indice % COLORI_CLASSE.length],
    note: testo(dati.note),
    allievi: elenco(dati.allievi).map(normalizzaAllievo),
    archiviata: booleano(dati.archiviata, false),
    docenteDiClasse: booleano(dati.docenteDiClasse, false),
    creataIl: testo(dati.creataIl, ora),
    aggiornataIl: testo(dati.aggiornataIl, ora),
  }
}

function normalizzaSlot (grezzo: unknown): Slot {
  const dati = oggetto(grezzo)
  const inizio = unOra(dati.inizio, '08:00')
  return {
    id: testo(dati.id) || nuovoIdSlot(),
    inizio,
    fine: unOra(dati.fine, '08:45'),
    tipo: unaVoce(dati.tipo, ['lezione', 'pausa'] as const, 'lezione'),
    etichetta: testo(dati.etichetta),
  }
}

/**
 * L'appello di un allievo, portato alla lunghezza dell'ora.
 *
 * `quante` sono le UD che la lezione conta adesso: un'ora allungata da due a
 * quattro UD trova due caselle vuote e le lascia non impostate, un'ora
 * accorciata lascia cadere quel che avanza. Un file di prima ha un solo `stato` per tutta
 * l'ora: vale per ogni UD, che è esattamente quel che voleva dire.
 */
function normalizzaPresenza (grezzo: unknown, quante: number): Presenza {
  const dati = oggetto(grezzo)
  // Un `stati` scritto e uno stato solo per l'ora intera si allungano in modo
  // diverso: il primo lascia vuote le caselle che non nomina — sono UD
  // aggiunte dopo, e nessuno ci ha ancora fatto l'appello — il secondo si
  // ripete su tutte, perché parlava dell'ora e non di una sua parte.
  const perUd = Array.isArray(dati.stati)
  const salvati = perUd
    ? (dati.stati as unknown[]).map(unoStatoPresenza)
    : [unoStatoPresenza(dati.stato)]
  const riempitivo: StatoPresenza = perUd ? 'non-impostato' : salvati[0] ?? 'non-impostato'
  const stati = Array.from(
    { length: Math.max(quante, 1) },
    (_, i) => salvati[i] ?? riempitivo,
  )
  return {
    allievoId: testo(dati.allievoId),
    stati,
    minuti: dati.minuti === undefined ? undefined : numero(dati.minuti, 0),
    nota: testo(dati.nota),
  }
}

function normalizzaOsservazione (grezzo: unknown): Osservazione {
  const dati = oggetto(grezzo)
  return {
    id: testo(dati.id) || nuovoIdOsservazione(),
    allievoId: typeof dati.allievoId === 'string' ? dati.allievoId : null,
    tipo: unaVoce(dati.tipo, TIPI_OSSERVAZIONE, 'nota'),
    testo: testo(dati.testo),
    ora: oraValida(dati.ora) ? (dati.ora as string) : undefined,
    creataIl: testo(dati.creataIl, istanteAdesso()),
  }
}

function normalizzaAvanzamento (grezzo: unknown): AvanzamentoAttivita {
  const dati = oggetto(grezzo)
  return {
    attivitaId: testo(dati.attivitaId),
    titolo: testo(dati.titolo),
    stato: unaVoce(dati.stato, ['da-fare', 'svolta', 'parziale', 'saltata'] as const, 'da-fare'),
    nota: testo(dati.nota),
  }
}

export function normalizzaLezione (grezzo: unknown, corsoId = ''): Lezione {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  const slot = elenco(dati.slot).map(normalizzaSlot)
  const quanteUd = contaUd({ slot: slot.length > 0 ? slot : [normalizzaSlot({})] } as Lezione)
  return {
    id: testo(dati.id) || nuovoIdLezione(),
    corsoId: corsoId || testo(dati.corsoId),
    data: unaData(dati.data, oggi()),
    slot: slot.length > 0 ? slot : [normalizzaSlot({})],
    aula: testo(dati.aula),
    stato: unaVoce(dati.stato, STATI_LEZIONE, 'pianificata'),
    pianoId: typeof dati.pianoId === 'string' ? dati.pianoId : null,
    avanzamento: elenco(dati.avanzamento).map(normalizzaAvanzamento),
    presenze: elenco(dati.presenze).map((p) => normalizzaPresenza(p, quanteUd)),
    osservazioni: elenco(dati.osservazioni).map(normalizzaOsservazione),
    // La lezione aveva anche un titolo, che diceva la stessa cosa di questo
    // campo: quel che c'era scritto passa qui invece di sparire in silenzio.
    argomenti: testo(dati.argomenti) || testo(dati.titolo),
    materiali: testo(dati.materiali),
    consuntivo: testo(dati.consuntivo),
    creataIl: testo(dati.creataIl, ora),
    aggiornataIl: testo(dati.aggiornataIl, ora),
  }
}

const TIPI_RISORSA: TipoRisorsa[] = ['collegamento', 'file', 'immagine']

/**
 * Una risorsa. Il tipo comanda su che cosa si tiene: un collegamento senza
 * indirizzo valido diventa una riga senza link invece di un link rotto, e un
 * file senza percorso resta annunciato ma non ancora arrivato — come un
 * documento atteso dal docente di classe.
 */
export function normalizzaRisorsa (grezzo: unknown): Risorsa {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  const tipo = unaVoce(dati.tipo, TIPI_RISORSA, 'collegamento')
  const file = percorsoRelativo(dati.file)
  const url = testo(dati.url).trim()
  return {
    id: testo(dati.id) || nuovoIdRisorsa(),
    tipo,
    titolo: testo(dati.titolo) || testo(dati.nome) || nomeDelFile(file) || url || 'Risorsa',
    url: tipo === 'collegamento' && urlValido(url) ? url : undefined,
    file: tipo === 'collegamento' ? undefined : file || undefined,
    nome: testo(dati.nome) || nomeDelFile(file) || undefined,
    note: testo(dati.note) || undefined,
    aggiuntaIl: testo(dati.aggiuntaIl, ora),
  }
}

function normalizzaAttivita (grezzo: unknown): Attivita {
  const dati = oggetto(grezzo)
  return {
    id: testo(dati.id) || nuovoIdAttivita(),
    titolo: testo(dati.titolo, 'Attività'),
    tipo: unaVoce(dati.tipo, TIPI_ATTIVITA, 'spiegazione'),
    // I piani scritti in minuti si rileggono in unità didattiche: il numero
    // che c'era diviso la lunghezza di una UD, portato al quarto più vicino.
    // Un piano da «venti minuti» diventa mezza unità, che è quel che voleva
    // dire — e adesso resta mezza unità anche dove le UD sono da cinquanta.
    // Non si arrotonda al quarto: dentro il piano la durata si scrive in
    // minuti, e un'attività da venti minuti riletta come mezza unità tornerebbe
    // a schermo da ventitre. Si tiene il numero che c'è, purché sia positivo.
    durataUd: Math.max(
      0.01,
      dati.durataUd !== undefined
        ? numero(dati.durataUd, 0.5)
        : numero(dati.durataMin, MINUTI_UD / 2) / MINUTI_UD,
    ),
    descrizione: testo(dati.descrizione),
    materiali: testo(dati.materiali),
    raggruppamento: unaVoce(
      dati.raggruppamento,
      ['plenaria', 'individuale', 'coppie', 'gruppi'] as const,
      'plenaria',
    ),
    risorse: elenco(dati.risorse).map(normalizzaRisorsa),
    // I parametri dipendono dal tipo, e si tengono così come sono: una chiave
    // che il registro non prevede più non si butta — chi l'ha scritta non deve
    // perderla perché il programma ha cambiato idea — ma quel che non è un
    // valore semplice sì, perché non saprebbe come mostrarsi.
    parametri: parametriPuliti(dati.parametri),
    valutazione: normalizzaValutazionePrevista(dati.valutazione) ?? undefined,
  }
}

/** Solo valori che un campo sa mostrare: testo, numero, sì/no. */
function parametriPuliti (grezzo: unknown): Record<string, string | number | boolean> | undefined {
  const dati = oggetto(grezzo)
  const puliti: Record<string, string | number | boolean> = {}
  for (const [chiave, valore] of Object.entries(dati)) {
    if (typeof valore === 'string' || typeof valore === 'number' || typeof valore === 'boolean') {
      puliti[chiave] = valore
    }
  }
  return Object.keys(puliti).length > 0 ? puliti : undefined
}

/**
 * La ponderazione, riportata dentro i suoi estremi.
 *
 * Da 0 a 10, uno se non si capisce che numero fosse. Zero è ammesso e vuol dire
 * «non fa media»: prima il minimo era 0,1, e per dire che una prova non contava
 * bisognava non metterci i voti. Sopra dieci non si va perché un peso da cento
 * non è una ponderazione, e un file scritto a mano con un numero fuori scala
 * ribalterebbe una media intera senza che nessuno se ne accorga.
 */
function pesoValido (grezzo: unknown): number {
  return Math.min(10, Math.max(0, numero(grezzo, 1)))
}

/** La valutazione prevista da un piano: assente vuol dire che il piano non ne porta. */
function normalizzaValutazionePrevista (grezzo: unknown): ValutazionePrevista | null {
  if (grezzo === null || grezzo === undefined) return null
  const dati = oggetto(grezzo)
  return {
    titolo: testo(dati.titolo, 'Verifica'),
    tipo: unaVoce(dati.tipo, TIPI_VALUTAZIONE, 'scritto'),
    peso: pesoValido(dati.peso),
  }
}

/**
 * La valutazione che stava sul piano, rimessa dov'è successa: su una tappa.
 *
 * Il piano aveva una casella «valutazione prevista» accanto a quella delle
 * attività, e le due dicevano la stessa cosa in disaccordo — il piano
 * prometteva una verifica e la scaletta ne aveva due, o nessuna. Adesso la
 * prova è una tappa e basta, e i piani scritti prima vanno riletti così.
 *
 * Se la scaletta dichiara già una prova sua, quella comanda: chi l'ha scritta
 * sapeva quale delle tappe fosse la verifica meglio di quanto lo sappia una
 * casella al livello del piano. Altrimenti la valutazione si posa sulla prima
 * tappa di tipo verifica; e se non ce n'è nemmeno una, la tappa si aggiunge in
 * fondo — perché una prova che si faceva davvero non deve sparire dal piano
 * solo perché nessuno le aveva dato una riga nella scaletta.
 */
function valutazioneSullaScaletta (
  attivita: Attivita[],
  prevista: ValutazionePrevista | null,
): Attivita[] {
  if (!prevista) return attivita
  if (attivita.some((a) => a.valutazione)) return attivita

  const verifica = attivita.find((a) => a.tipo === 'verifica')
  if (verifica) {
    verifica.valutazione = prevista
    return attivita
  }
  return [
    ...attivita,
    {
      id: nuovoIdAttivita(),
      titolo: prevista.titolo,
      tipo: 'verifica',
      durataUd: 0.5,
      descrizione: '',
      materiali: '',
      raggruppamento: 'plenaria',
      risorse: [],
      valutazione: prevista,
    },
  ]
}

/**
 * Il titolo che i piani avevano, rimesso nelle note.
 *
 * «Piano senza titolo» e simili non si conservano: erano il riempitivo che il
 * registro metteva da sé, e ricopiarlo nelle note vorrebbe dire inventarsi un
 * contenuto. Quel che qualcuno ha scritto davvero, invece, resta.
 */
const TITOLI_VUOTI = new Set(['piano senza titolo', 'senza titolo', 'nuovo piano'])

function unisciVecchioTitolo (titolo: string, note: string): string {
  const suo = titolo.trim()
  if (!suo || TITOLI_VUOTI.has(suo.toLowerCase())) return note
  if (note.includes(suo)) return note
  return note ? `${suo}
${note}` : suo
}

export function normalizzaPiano (grezzo: unknown, corsoId: string | null = null): PianoLezione {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  const suo = typeof dati.corsoId === 'string' && dati.corsoId ? dati.corsoId : null
  return {
    id: testo(dati.id) || nuovoIdPiano(),
    corsoId: suo ?? corsoId,
    obiettivi: elenco(dati.obiettivi).map((o) => testo(o)).filter(Boolean),
    prerequisiti: testo(dati.prerequisiti),
    // La valutazione che i piani vecchi tenevano per sé si posa sulla tappa
    // che la faceva: la prova è un'attività, non una proprietà dell'ora.
    attivita: valutazioneSullaScaletta(
      elenco(dati.attivita).map(normalizzaAttivita),
      normalizzaValutazionePrevista(dati.valutazione),
    ),
    risorse: elenco(dati.risorse).map(normalizzaRisorsa),
    // I piani scritti quando esisteva il titolo se lo tengono: finisce in cima
    // alle note, che è il posto in cui le cose scritte a mano si ritrovano.
    // Buttarlo sarebbe stato cancellare quel che qualcuno aveva battuto.
    note: unisciVecchioTitolo(testo(dati.titolo), testo(dati.note)),
    tag: elenco(dati.tag).map((t) => testo(t)).filter(Boolean),
    creatoIl: testo(dati.creatoIl, ora),
    aggiornatoIl: testo(dati.aggiornatoIl, ora),
  }
}

function normalizzaVoto (grezzo: unknown): Voto {
  const dati = oggetto(grezzo)
  // Un valore che non è un numero — «4,5» scritto a mano con la virgola — non
  // è uno zero: è un voto che non si legge, e resta vuoto invece di crollare
  // la media.
  const letto = typeof dati.valore === 'number' ? dati.valore : Number(dati.valore)
  const valore =
    dati.valore === null || dati.valore === undefined || !Number.isFinite(letto) ? null : letto
  return {
    allievoId: testo(dati.allievoId),
    valore,
    assente: booleano(dati.assente, false),
    nota: testo(dati.nota),
    // Solo se è una data vera: un giorno illeggibile vale «non riconsegnata»,
    // che è la verità che si conosce.
    riconsegnataIl: isoValida(dati.riconsegnataIl) ? dati.riconsegnataIl : null,
  }
}

/**
 * Una riga della tabella dei recuperi.
 *
 * Torna `null` quando non c'è niente di deciso: senza data, senza nota e senza
 * rinuncia la riga non dice niente che il registro non sappia già, e tenerla
 * vorrebbe dire un recupero «da fissare» che compare due volte.
 */
function normalizzaRecupero (grezzo: unknown): RecuperoProva | null {
  const dati = oggetto(grezzo)
  const allievoId = testo(dati.allievoId)
  if (!allievoId) return null

  const previstoIl = isoValida(dati.previstoIl) ? dati.previstoIl : null
  const riconsegnataIl = isoValida(dati.riconsegnataIl) ? dati.riconsegnataIl : null
  const nota = testo(dati.nota)
  const dispensato = booleano(dati.dispensato, false)
  if (!previstoIl && !nota && !dispensato && !riconsegnataIl) return null

  return {
    allievoId,
    previstoIl,
    riconsegnataIl,
    nota: nota || undefined,
    dispensato: dispensato || undefined,
    aggiornatoIl: testo(dati.aggiornatoIl, istanteAdesso()),
  }
}

/**
 * La tabella dei recuperi, comprese le righe scritte quando ancora stavano
 * dentro il voto.
 *
 * La forma vecchia è durata poche ore, ma quel che c'era dentro è una decisione
 * presa da chi insegna — un giorno concordato con un allievo — e le decisioni
 * non si buttano perché è cambiato il posto in cui si scrivono.
 */
function recuperiDellaProva (dati: Record<string, unknown>): RecuperoProva[] {
  const righe = elenco(dati.recuperi)
    .map(normalizzaRecupero)
    .filter((r): r is RecuperoProva => r !== null)
  const gia = new Set(righe.map((r) => r.allievoId))

  for (const grezzo of elenco(dati.voti)) {
    const voto = oggetto(grezzo)
    if (!voto.recupero) continue
    const vecchia = normalizzaRecupero({ ...oggetto(voto.recupero), allievoId: voto.allievoId })
    if (vecchia && !gia.has(vecchia.allievoId)) {
      righe.push(vecchia)
      gia.add(vecchia.allievoId)
    }
  }

  return righe
}

const RUOLI_ALLEGATO = [
  'verifica',
  'soluzione',
  'prova',
  'recupero',
  'recupero-soluzione',
] as const

function normalizzaAllegato (grezzo: unknown): Allegato {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  const file = percorsoRelativo(dati.file)
  return {
    id: testo(dati.id) || nuovoIdAllegato(),
    ruolo: unaVoce(dati.ruolo, RUOLI_ALLEGATO, 'verifica'),
    allievoId: typeof dati.allievoId === 'string' && dati.allievoId ? dati.allievoId : null,
    nome: testo(dati.nome) || nomeDelFile(file) || 'allegato.pdf',
    file,
    aggiuntoIl: testo(dati.aggiuntoIl, ora),
  }
}

export function normalizzaValutazione (grezzo: unknown, corsoId = ''): MomentoValutazione {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  return {
    id: testo(dati.id) || nuovoIdValutazione(),
    corsoId: corsoId || testo(dati.corsoId),
    lezioneId: typeof dati.lezioneId === 'string' ? dati.lezioneId : null,
    pianoId: typeof dati.pianoId === 'string' && dati.pianoId ? dati.pianoId : null,
    attivitaId: typeof dati.attivitaId === 'string' && dati.attivitaId ? dati.attivitaId : null,
    titolo: testo(dati.titolo, 'Momento di valutazione'),
    tipo: unaVoce(dati.tipo, TIPI_VALUTAZIONE, 'scritto'),
    data: unaData(dati.data, oggi()),
    peso: pesoValido(dati.peso),
    scala: normalizzaScala(dati.scala),
    descrizione: testo(dati.descrizione),
    // La riconsegna del momento è stata: c'era una data sola per la prova, e
    // diceva «la classe l'ha riavuta» anche di chi quel giorno mancava. I
    // registri scritti prima ce l'hanno ancora, e la si porta giù su ogni voto
    // che non ne abbia una propria: buttarla via vorrebbe dire riaprire nel
    // todo tutte le prove chiuse fino a ieri, e chi riapre il registro non
    // capirebbe perché.
    voti: conRiconsegnaDelMomento(elenco(dati.voti).map(normalizzaVoto), dati.riconsegnataIl),
    recuperi: recuperiDellaProva(dati),
    allegati: elenco(dati.allegati).map(normalizzaAllegato).filter((a) => a.file !== ''),
    creatoIl: testo(dati.creatoIl, ora),
    aggiornatoIl: testo(dati.aggiornatoIl, ora),
  }
}

/**
 * Porta la vecchia data di classe su ogni voto che non ne ha una sua.
 *
 * Vale una volta sola per registro — dal salvataggio successivo il campo non
 * c'è più — e non tocca chi aveva già la sua: quella è più precisa, ed è il
 * motivo per cui la data di gruppo se n'è andata.
 */
function conRiconsegnaDelMomento (voti: Voto[], grezza: unknown): Voto[] {
  if (!isoValida(grezza)) return voti
  return voti.map((voto) => (voto.riconsegnataIl ? voto : { ...voto, riconsegnataIl: grezza }))
}

export function normalizzaImpostazioni (grezzo: unknown): Impostazioni {
  const dati = oggetto(grezzo)
  const giorni = elenco(dati.giorniVisibili)
    .map((g) => numero(g, 0))
    .filter((g) => g >= 1 && g <= 7)
  return {
    scala: normalizzaScala(dati.scala),
    oraInizioGiornata: unOra(dati.oraInizioGiornata, IMPOSTAZIONI_PREDEFINITE.oraInizioGiornata),
    oraFineGiornata: unOra(dati.oraFineGiornata, IMPOSTAZIONI_PREDEFINITE.oraFineGiornata),
    giorniVisibili: giorni.length > 0 ? giorni : [...IMPOSTAZIONI_PREDEFINITE.giorniVisibili],
    // Zero è ammesso e vuol dire «non arrotondare»; sopra il massimo della
    // scala non ha senso, e sarebbe un passo che schiaccia ogni nota su un
    // valore solo.
    passoFineSemestre: Math.min(10, Math.max(0, numero(dati.passoFineSemestre, 0.5))),
    // In percento, e dentro il centinaio: una soglia al 200% non segnala
    // nessuno, una negativa li segnala tutti.
    sogliaAssenza: Math.min(100, Math.max(0, numero(dati.sogliaAssenza, 20))),
    durataSlotPredefinita: minutiInUd(numero(dati.durataSlotPredefinita, MINUTI_UD)),
    // Almeno un minuto, non almeno cinque: il campo accetta i minuti che sono,
    // e il dominio non deve rifiutare quel che il modulo lascia scrivere.
    durataPausaPredefinita: Math.max(1, numero(dati.durataPausaPredefinita, 15)),
    // Un valore che non si riconosce torna al predefinito invece di spegnere
    // l'automazione: un file scritto a mano con un refuso non deve lasciare la
    // cartella ferma senza dirlo a nessuno.
    pdfAutomatici: QUANDO_RIFARE_PDF.includes(dati.pdfAutomatici as QuandoRifarePdf)
      ? (dati.pdfAutomatici as QuandoRifarePdf)
      : IMPOSTAZIONI_PREDEFINITE.pdfAutomatici,
  }
}

// ------------------------------------------------------------------ migrazione 1 → 2

/**
 * La conversione da una versione all'altra dei file, tenuta in un oggetto solo
 * perché i passaggi si parlano fra loro: le materie ricavate dalle classi
 * servono ai corsi, i corsi servono alle lezioni, e le lezioni alle valutazioni.
 *
 * La versione 1 scriveva la materia sulla classe, l'anno e la classe su ogni
 * lezione, il semestre su ogni valutazione. La 2 tiene un'entità sola per
 * l'insegnamento — il corso, classe più materia — e ricava il resto.
 *
 * Una regola guida ogni caso dubbio: non perdere niente. Una lezione che non si
 * sa dove agganciare finisce in un corso di ripiego, che si vede e si corregge,
 * invece di sparire.
 */
class Migrazione {
  readonly materie: Materia[]
  readonly corsi: Corso[] = []

  /** Le materie per nome normalizzato: intercetta «Matematica» e «matematica». */
  private readonly materiaPerNome = new Map<string, string>()
  /** I corsi per coppia classe+materia, che è la loro chiave d’identità. */
  private readonly corsoPerCoppia = new Map<string, Corso>()
  /** Dove è finito ogni vecchio programma, per riagganciarci i piani. */
  private readonly corsoPerProgramma = new Map<string, Corso>()
  /** La materia che la versione 1 scriveva sulla classe. */
  private readonly materiaPerClasse = new Map<string, string>()
  /** La materia inventata per ciò che non si sa dove mettere: nasce solo se serve. */
  private materiaDiRipiego: string | null = null

  constructor (materieGrezze: unknown, classiGrezze: unknown[]) {
    this.materie = elenco(materieGrezze).map(normalizzaMateria)
    for (const materia of this.materie) this.registra(materia)

    // Le materie che stavano scritte a mano sulle classi prima che le materie
    // esistessero: il testo libero di ieri diventa una materia vera.
    for (const grezza of classiGrezze) {
      const classe = oggetto(grezza)
      const classeId = testo(classe.id)
      if (!classeId) continue
      if (typeof classe.materiaId === 'string' && classe.materiaId) {
        this.materiaPerClasse.set(classeId, classe.materiaId)
        continue
      }
      const nome = testo(classe.materia).trim()
      if (nome) this.materiaPerClasse.set(classeId, this.materiaDalNome(nome))
    }
  }

  private registra (materia: Materia): void {
    const chiave = materia.nome.trim().toLowerCase()
    if (chiave && !this.materiaPerNome.has(chiave)) this.materiaPerNome.set(chiave, materia.id)
  }

  /** La materia con questo nome, creandola se non c'è. */
  private materiaDalNome (nome: string): string {
    const gia = this.materiaPerNome.get(nome.trim().toLowerCase())
    if (gia) return gia
    const materia = normalizzaMateria({ nome: nome.trim() })
    this.materie.push(materia)
    this.registra(materia)
    return materia.id
  }

  /** La materia buona per ciò che non ne ha: una sola, e il nome dice che è da sistemare. */
  private ripiego (): string {
    if (!this.materiaDiRipiego) this.materiaDiRipiego = this.materiaDalNome('Da assegnare')
    return this.materiaDiRipiego
  }

  private chiave (classeId: string, materiaId: string): string {
    return `${classeId} ${materiaId}`
  }

  /** Il corso di una coppia, creandolo al volo: è l'unico modo in cui ne nascono. */
  corso (classeId: string, materiaId: string): Corso {
    const chiave = this.chiave(classeId, materiaId)
    const gia = this.corsoPerCoppia.get(chiave)
    if (gia) return gia
    const corso = normalizzaCorso({ classeId, materiaId })
    this.corsi.push(corso)
    this.corsoPerCoppia.set(chiave, corso)
    return corso
  }

  /**
   * Accoglie un corso già scritto su disco. Se la coppia c'è già vince chi è
   * arrivato prima: due corsi per la stessa materia nella stessa classe
   * spaccherebbero in due le lezioni senza che niente lo spieghi.
   */
  accogli (corso: Corso, programmaId = ''): void {
    if (!corso.classeId || !corso.materiaId) return
    const chiave = this.chiave(corso.classeId, corso.materiaId)
    const gia = this.corsoPerCoppia.get(chiave)
    const buono = gia ?? corso
    if (!gia) {
      this.corsi.push(corso)
      this.corsoPerCoppia.set(chiave, corso)
    }
    if (programmaId) this.corsoPerProgramma.set(programmaId, buono)
  }

  corsoDelProgramma (programmaId: string): Corso | null {
    return this.corsoPerProgramma.get(programmaId) ?? null
  }

  /** Vero se quell'id è di un corso vero, non di qualcos'altro scambiato per tale. */
  conosce (corsoId: string): boolean {
    return this.corsi.some((c) => c.id === corsoId)
  }

  /** Vero se quell'id è di una classe che ha almeno un corso. */
  eUnaClasse (id: string): boolean {
    return this.corsi.some((c) => c.classeId === id)
  }

  /**
   * Il corso in cui mettere una lezione o una valutazione della versione 1: la
   * materia che portava addosso se esiste ancora, altrimenti quella della sua
   * classe, altrimenti il primo corso della classe, altrimenti il ripiego.
   */
  corsoDiClasse (classeId: string, materiaId: string | null = null): Corso {
    if (materiaId && this.materie.some((m) => m.id === materiaId)) {
      return this.corso(classeId, materiaId)
    }
    const dellaClasse = this.materiaPerClasse.get(classeId)
    if (dellaClasse) return this.corso(classeId, dellaClasse)
    const primo = this.corsi.find((c) => c.classeId === classeId)
    return primo ?? this.corso(classeId, this.ripiego())
  }

  /** I titoli, alla fine: ora che classi e materie hanno un nome da mettere insieme. */
  intitola (classi: Classe[]): void {
    for (const corso of this.corsi) {
      if (corso.titolo && corso.titolo !== 'Corso') continue
      const classe = classi.find((c) => c.id === corso.classeId) ?? null
      const materia = this.materie.find((m) => m.id === corso.materiaId) ?? null
      corso.titolo = `${materia?.nome ?? 'Materia'} — ${classe?.nome ?? 'classe'}`
    }
  }
}

/**
 * Rimette in piedi un registro completo a partire da quel che c'è su disco,
 * qualunque versione sia. Non lancia mai: al peggio restituisce un registro
 * vuoto. `Archivio` si accorge che qualcosa è stato migrato e riscrive i file
 * una volta sola.
 */
export function normalizzaRegistro (grezzo: unknown): Registro {
  const dati = oggetto(grezzo)
  const anni = elenco(dati.anni).map(normalizzaAnno)
  const annoCorrenteId = testo(dati.annoCorrenteId)
  const classiGrezze = elenco(dati.classi)

  const migrazione = new Migrazione(dati.materie, classiGrezze)
  const classi = classiGrezze.map((grezza, indice) => normalizzaClasse(grezza, indice))

  // Prima i corsi già scritti (versione 2), poi i vecchi programmi (versione 1),
  // poi le coppie che stavano implicite nella classe. L'ordine conta: chi arriva
  // per primo tiene il proprio id, e i piani gli restano attaccati.
  for (const grezzo of elenco(dati.corsi)) migrazione.accogli(normalizzaCorso(grezzo))
  for (const grezzo of elenco(dati.programmi)) {
    migrazione.accogli(normalizzaCorso(grezzo), testo(oggetto(grezzo).id))
  }
  for (const classe of classi) {
    if (migrazione.corsi.some((c) => c.classeId === classe.id)) continue
    const grezza = oggetto(classiGrezze.find((c) => testo(oggetto(c).id) === classe.id))
    const suaMateria = typeof grezza.materiaId === 'string' && grezza.materiaId
    if (suaMateria || testo(grezza.materia).trim()) migrazione.corsoDiClasse(classe.id)
  }

  // Le lezioni: quelle nuove hanno già il corso, le vecchie lo trovano dalla
  // coppia classe+materia che si portavano addosso.
  // Un `corsoId` che è in realtà l'id di una classe: succede quando qualcosa
  // passa la classe dove ci vuole il corso. La lezione esiste e i suoi dati
  // sono buoni — si riaggancia invece di lasciarla appesa e invisibile.
  const lezioni = elenco(dati.lezioni).map((grezza) => {
    const dato = oggetto(grezza)
    const suo = testo(dato.corsoId)
    if (suo && migrazione.conosce(suo)) return normalizzaLezione(dato, suo)
    if (suo && migrazione.eUnaClasse(suo)) {
      return normalizzaLezione(dato, migrazione.corsoDiClasse(suo).id)
    }
    if (suo) return normalizzaLezione(dato, suo)
    const classeId = testo(dato.classeId)
    if (!classeId) return normalizzaLezione(dato)
    const materiaId = typeof dato.materiaId === 'string' ? dato.materiaId : null
    return normalizzaLezione(dato, migrazione.corsoDiClasse(classeId, materiaId).id)
  })

  // I piani si liberano dall'anno e dalla classe e si legano alla materia,
  // presa dal programma che li conteneva o dalla classe per cui erano pensati.
  const piani = elenco(dati.piani).map((grezzo) => {
    const dato = oggetto(grezzo)
    if (typeof dato.corsoId === 'string' && dato.corsoId) return normalizzaPiano(dato)
    // I piani scritti quando stavano sulla materia: si agganciano al primo
    // corso che quella materia la porta, e da lì si duplicano per gli altri.
    if (typeof dato.materiaId === 'string' && dato.materiaId) {
      const suo = migrazione.corsi.find((c) => c.materiaId === dato.materiaId)
      return normalizzaPiano(dato, suo?.id ?? null)
    }
    const dalProgramma = migrazione.corsoDelProgramma(testo(dato.programmaId))
    if (dalProgramma) return normalizzaPiano(dato, dalProgramma.id)
    const classeId = testo(dato.classeId)
    if (!classeId) return normalizzaPiano(dato)
    return normalizzaPiano(dato, migrazione.corsoDiClasse(classeId).id)
  })

  // Le valutazioni: il corso si trova dalla lezione se ce n'era una, altrimenti
  // dalla classe. Il semestre salvato si butta — lo dice già la data.
  const lezionePerId = new Map(lezioni.map((l) => [l.id, l]))
  const valutazioni = elenco(dati.valutazioni).map((grezzo) => {
    const dato = oggetto(grezzo)
    const suo = testo(dato.corsoId)
    if (suo && migrazione.conosce(suo)) return normalizzaValutazione(dato, suo)
    if (suo && migrazione.eUnaClasse(suo)) {
      return normalizzaValutazione(dato, migrazione.corsoDiClasse(suo).id)
    }
    if (suo) return normalizzaValutazione(dato, suo)
    const lezione = lezionePerId.get(testo(dato.lezioneId))
    if (lezione?.corsoId) return normalizzaValutazione(dato, lezione.corsoId)
    const classeId = testo(dato.classeId)
    if (!classeId) return normalizzaValutazione(dato)
    return normalizzaValutazione(dato, migrazione.corsoDiClasse(classeId).id)
  })

  // I fascicoli: quelli scritti, più quelli che stavano dentro le classi.
  const fascicoli = elenco(dati.fascicoli).map(normalizzaFascicolo)
  const gia = new Set(fascicoli.map((f) => f.classeId))
  for (const grezza of classiGrezze) {
    const classe = oggetto(grezza)
    const classeId = testo(classe.id)
    if (!classeId || gia.has(classeId)) continue
    const roba =
      elenco(classe.recapiti).length +
      elenco(classe.documenti).length +
      elenco(classe.comunicazioni).length
    if (roba === 0) continue
    fascicoli.push(
      normalizzaFascicolo({
        classeId,
        recapiti: classe.recapiti,
        documenti: classe.documenti,
        comunicazioni: classe.comunicazioni,
      }),
    )
    gia.add(classeId)
  }

  migrazione.intitola(classi)

  // Prima del return: svuota dai fascicoli i documenti che ha convertito.
  const dallaRaccolta = documentiDiventatiConsegne(fascicoli, migrazione.corsi)

  return {
    versione: VERSIONE_DATI,
    anni,
    annoCorrenteId: anni.some((a) => a.id === annoCorrenteId)
      ? annoCorrenteId
      : anni[0]?.id ?? null,
    materie: migrazione.materie,
    classi,
    corsi: migrazione.corsi,
    lezioni,
    piani,
    valutazioni,
    fascicoli,
    consegne: conSpunteDiChiusura(
      [
        ...elenco(dati.consegne).map(normalizzaConsegna),
        ...compitiDiventatiConsegne(elenco(dati.lezioni), lezioni),
        ...dallaRaccolta,
      ],
      // Quelle che erano chiuse a mano, più i compiti migrati: nascevano
      // chiusi anche loro.
      new Set([
        ...elenco(dati.consegne)
          .filter((grezza) => Boolean(oggetto(grezza).chiusa))
          .map((grezza) => testo(oggetto(grezza).id)),
        ...compitiDiventatiConsegne(elenco(dati.lezioni), lezioni).map((c) => c.id),
      ]),
      classi,
      migrazione.corsi,
    ),
    smistamenti: elenco(dati.smistamenti).map(normalizzaSmistamento),
    impostazioni: normalizzaImpostazioni(dati.impostazioni),
  }
}

/**
 * «Chiusa comunque» diventa una spunta per ciascuno.
 *
 * La chiusura della consegna intera è stata: chiudeva tutto in un colpo e si
 * portava via i nomi di chi non aveva portato niente, che erano l'unica
 * ragione per cui la consegna esisteva. Buttarla via senza convertirla
 * vorrebbe però dire riaprire a gennaio tutto quel che era chiuso fino a ieri,
 * e chi riapre il registro non capirebbe perché. Si scrive quel che la
 * chiusura voleva dire: l'hanno fatta tutti, quel giorno.
 *
 * Vale una volta sola per registro — dal salvataggio successivo il campo non
 * c'è più — e non tocca chi aveva già la sua spunta, che porta la data vera.
 */
function conSpunteDiChiusura (
  consegne: Consegna[],
  chiuse: Set<string>,
  classi: Classe[],
  corsi: Corso[],
): Consegna[] {
  if (chiuse.size === 0) return consegne
  const classePerCorso = new Map(
    corsi.map((corso) => [corso.id, classi.find((c) => c.id === corso.classeId) ?? null]),
  )

  return consegne.map((consegna) => {
    if (!chiuse.has(consegna.id)) return consegna
    const classe = classePerCorso.get(consegna.corsoId) ?? null
    const attivi = new Set((classe?.allievi ?? []).filter((a) => a.attivo).map((a) => a.id))
    const destinatari =
      consegna.a === 'docente'
        ? [CHI_INSEGNA]
        : consegna.a === 'allievi'
          ? consegna.allieviIds.filter((id) => attivi.has(id))
          : [...attivi]

    const gia = new Set(consegna.fatte.map((f) => f.chi))
    return {
      ...consegna,
      fatte: [
        ...consegna.fatte,
        ...destinatari
          .filter((chi) => !gia.has(chi))
          .map((chi) => ({ chi, fattaIl: consegna.aggiornataIl })),
      ],
    }
  })
}

// ------------------------------------------------------------------ consegne

const TIPI_CONSEGNA = [
  'compito',
  'studio',
  'materiale',
  'consegna',
  'preparazione',
  'amministrativo',
  'altro',
] as const

const DESTINATARI_CONSEGNA = ['classe', 'docente', 'allievi'] as const

const VERSI_DOCUMENTO = ['ricevo', 'consegno'] as const

const MODI_CONSEGNA = ['mano', 'email'] as const

function normalizzaSpunta (grezzo: unknown): SpuntaConsegna {
  const dati = oggetto(grezzo)
  const file = percorsoRelativo(dati.file)
  return {
    chi: testo(dati.chi),
    fattaIl: testo(dati.fattaIl, istanteAdesso()),
    nota: testo(dati.nota),
    file: file || undefined,
    nome: file ? testo(dati.nome) || nomeDelFile(file) : undefined,
    modo: dati.modo === undefined || dati.modo === null
      ? undefined
      : unaVoce(dati.modo, MODI_CONSEGNA, 'mano'),
    destinatari: elenco(dati.destinatari).map((x) => testo(x)).filter(Boolean),
  }
}

export function normalizzaConsegna (grezzo: unknown): Consegna {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()
  const a = unaVoce(dati.a, DESTINATARI_CONSEGNA, 'classe')
  const fatte = elenco(dati.fatte).map(normalizzaSpunta).filter((s) => s.chi)

  // I file scritti dentro le spunte, quando la spunta e il documento erano la
  // stessa cosa. Diventano documenti della consegna: la spunta dice che è
  // successo, il documento dice che cosa c'è. Un file già elencato fra i
  // documenti non si duplica.
  const documenti = elenco((dati.documenti ?? dati.daConsegnare) as unknown)
    .map((voce) => {
      const dato = oggetto(voce)
      const percorso = percorsoRelativo(dato.file)
      return {
        allievoId: testo(dato.allievoId),
        file: percorso,
        nome: testo(dato.nome) || nomeDelFile(percorso),
        aggiuntoIl: testo(dato.aggiuntoIl, ora),
      }
    })
    .filter((d) => d.allievoId && d.file)
  for (const spunta of fatte) {
    if (!spunta.file) continue
    if (!documenti.some((d) => d.allievoId === spunta.chi)) {
      documenti.push({
        allievoId: spunta.chi,
        file: spunta.file,
        nome: spunta.nome || nomeDelFile(spunta.file),
        aggiuntoIl: spunta.fattaIl,
      })
      spunta.file = undefined
      spunta.nome = undefined
    }
    // Se fra i documenti ce n'era già uno per quella persona, il file della
    // spunta resta scritto lì: un percorso buttato è un file che nessuno
    // ritrova più.
  }

  return {
    id: testo(dati.id) || nuovoIdConsegna(),
    corsoId: testo(dati.corsoId),
    testo: testo(dati.testo),
    tipo: unaVoce(dati.tipo, TIPI_CONSEGNA, 'compito'),
    // Solo se c'è scritto: l'assenza è quel che distingue una consegna normale
    // — si spunta e basta — da una che si spunta portando un foglio.
    documento:
      dati.documento === undefined || dati.documento === null
        ? undefined
        : unaVoce(dati.documento, CATEGORIE_DOCUMENTO, 'altro'),
    verso: dati.documento === undefined || dati.documento === null
      ? undefined
      : unaVoce(dati.verso, VERSI_DOCUMENTO, 'ricevo'),
    modoConsegna: dati.documento === undefined || dati.documento === null
      ? undefined
      : unaVoce(dati.modoConsegna, MODI_CONSEGNA, 'mano'),
    mailAllievo: booleano(dati.mailAllievo, true),
    mailTutore: booleano(dati.mailTutore, true),
    oggettoMail: testo(dati.oggettoMail) || undefined,
    corpoMail: testo(dati.corpoMail) || undefined,
    documenti,
    fileTutti: percorsoRelativo(dati.fileTutti) || undefined,
    nomeTutti: testo(dati.nomeTutti) || undefined,
    firmeRichieste: dati.documento === undefined || dati.documento === null
      ? undefined
      : booleano(dati.firmeRichieste, false),
    fileFirme: percorsoRelativo(dati.fileFirme) || undefined,
    nomeFirme: testo(dati.nomeFirme) || undefined,
    a,
    // I nomi valgono solo quando la consegna è di qualcuno in particolare:
    // tenerli su una consegna di classe vorrebbe dire un elenco che non si
    // vede da nessuna parte e che al primo ritocco dice il falso.
    allieviIds: a === 'allievi' ? elenco(dati.allieviIds).map((x) => testo(x)).filter(Boolean) : [],
    dataLezioneId: typeof dati.dataLezioneId === 'string' ? dati.dataLezioneId : null,
    data: unaData(dati.data, oggi()),
    scadenzaLezioneId: typeof dati.scadenzaLezioneId === 'string' ? dati.scadenzaLezioneId : null,
    scadenza: isoValida(dati.scadenza) ? String(dati.scadenza) : null,
    note: testo(dati.note),
    fatte,
    creataIl: testo(dati.creataIl, ora),
    aggiornataIl: testo(dati.aggiornataIl, ora),
  }
}

// --------------------------------------------------------------- smistamenti

const MOTIVI_QUARANTENA = [
  'senza-nome',
  'senza-testo',
  'ambiguo',
  'gia-consegnato',
  'fuori-elenco',
  'senza-consegna',
  'da-confermare',
] as const

const LETTURE = ['testo', 'ocr', 'niente'] as const

/**
 * Un blocco in quarantena. Le pagine si rimettono in ordine e nel verso giusto:
 * un intervallo rovesciato — «dalla 7 alla 3» — non descrive niente, e sarebbe
 * un taglio vuoto al momento di ritagliarlo davvero.
 */
function normalizzaBlocco (grezzo: unknown): BloccoDaSmistare {
  const dati = oggetto(grezzo)
  const da = Math.max(1, Math.round(numero(dati.da, 1)))
  const a = Math.max(da, Math.round(numero(dati.a, da)))
  return {
    id: testo(dati.id) || nuovoIdBlocco(),
    da,
    a,
    allievoId: typeof dati.allievoId === 'string' && dati.allievoId ? dati.allievoId : null,
    motivo: unaVoce(dati.motivo, MOTIVI_QUARANTENA, 'senza-nome'),
    estratto: testo(dati.estratto),
    fiducia: Math.min(1, Math.max(0, numero(dati.fiducia, 0))),
    lettura: unaVoce(dati.lettura, LETTURE, 'testo'),
    anteprima: percorsoRelativo(dati.anteprima) || undefined,
  }
}

export function normalizzaSmistamento (grezzo: unknown): Smistamento {
  const dati = oggetto(grezzo)
  const file = percorsoRelativo(dati.file)
  return {
    id: testo(dati.id) || nuovoIdSmistamento(),
    consegnaId: typeof dati.consegnaId === 'string' && dati.consegnaId ? dati.consegnaId : null,
    classeId: typeof dati.classeId === 'string' && dati.classeId ? dati.classeId : null,
    file,
    nome: testo(dati.nome) || nomeDelFile(file),
    pagine: Math.max(0, Math.round(numero(dati.pagine, 0))),
    assegnate: elenco(dati.assegnate).map((voce) => {
      const dato = oggetto(voce)
      const da = Math.max(1, Math.round(numero(dato.da, 1)))
      return {
        allievoId: testo(dato.allievoId),
        da,
        a: Math.max(da, Math.round(numero(dato.a, da))),
      }
    }).filter((v) => v.allievoId),
    letture: elenco(dati.letture)
      .map((voce) => {
        const dato = oggetto(voce)
        return {
          numero: Math.max(1, Math.round(numero(dato.numero, 1))),
          testo: testo(dato.testo),
          lettura: unaVoce(dato.lettura, LETTURE, 'niente'),
          anteprima: percorsoRelativo(dato.anteprima) || undefined,
        }
      })
      .sort((x, y) => x.numero - y.numero),
    blocchi: elenco(dati.blocchi).map(normalizzaBlocco),
    errore: testo(dati.errore) || undefined,
    arrivatoIl: testo(dati.arrivatoIl, istanteAdesso()),
  }
}

export function validaConsegna (consegna: Partial<Consegna>): Esito {
  const errori: string[] = []
  if (!consegna.testo?.trim()) errori.push('La consegna deve dire che cosa fare.')
  if (!consegna.corsoId) errori.push('La consegna appartiene a un corso.')
  if (consegna.a === 'allievi' && (consegna.allieviIds ?? []).length === 0) {
    errori.push(`Scegliere almeno ${un(PIF)}, o darla a tutta la classe.`)
  }
  if (consegna.scadenza && !isoValida(consegna.scadenza)) errori.push('Data di scadenza non valida.')
  if (
    consegna.scadenza &&
    isoValida(consegna.scadenza) &&
    !consegna.scadenzaLezioneId &&
    !consegna.dataLezioneId &&
    isoValida(consegna.data) &&
    consegna.scadenza < consegna.data
  ) {
    errori.push('La scadenza viene prima del giorno in cui la consegna è stata data.')
  }
  if (consegna.a === 'docente' && consegna.verso === 'consegno') {
    errori.push('Un documento che consegno io non può avere me come destinatario.')
  }
  return esito(errori)
}

/**
 * I vecchi «compiti assegnati» diventano consegne.
 *
 * Il campo di testo sulla lezione e le consegne dicevano la stessa cosa in due
 * posti; resta il secondo, che è quello che sa ripresentarsi. Quel che era già
 * scritto non si butta: diventa una consegna di quella lezione, data alla
 * classe.
 *
 * Nasce già spuntata per tutti, e non è pigrizia: aprirle tutte vorrebbe dire
 * ritrovarsi a gennaio con quattrocento compiti arretrati che nessuno ha mai
 * spuntato perché finora non c'era niente da spuntare. Un cruscotto pieno di
 * allarmi falsi è un cruscotto che si smette di guardare. Il testo resta
 * leggibile dov'era, e chi vuole riaprirne una toglie le spunte.
 */
function compitiDiventatiConsegne (grezze: unknown[], lezioni: Lezione[]): Consegna[] {
  const esito: Consegna[] = []

  for (const [indice, grezza] of grezze.entries()) {
    const compiti = testo(oggetto(grezza).compiti)
    const lezione = lezioni[indice]
    if (!compiti || !lezione?.corsoId) continue

    esito.push({
      id: `cns-da-${lezione.id}`,
      corsoId: lezione.corsoId,
      testo: compiti,
      tipo: 'compito',
      a: 'classe',
      allieviIds: [],
      dataLezioneId: lezione.id,
      data: lezione.data,
      scadenzaLezioneId: null,
      scadenza: null,
      note: '',
      // Le spunte le mette `conSpunteDiChiusura`, che sa chi c'è in classe:
      // qui la classe non si conosce ancora.
      fatte: [],
      creataIl: lezione.creataIl,
      aggiornataIl: lezione.aggiornataIl,
    })
  }

  return esito
}

/**
 * I documenti del fascicolo diventano consegne.
 *
 * Erano un secondo elenco di cose da fare, con una sua scadenza e un suo posto
 * dove andarle a guardare, per la stessa domanda delle consegne: chi non ha
 * ancora portato quel foglio. Ora sono una consegna sola per documento — quelli
 * con lo stesso titolo erano già una richiesta sola, letta per riga — e i file
 * già raccolti diventano le spunte di chi li aveva portati.
 *
 * Serve un corso a cui agganciarle: una consegna appartiene a un corso, da lì
 * legge classe e anno. Se in quella classe non se ne insegna nessuno i documenti
 * restano nel fascicolo, intatti, e ci riprovano alla prossima apertura — che è
 * meglio che perderli per una classe presa in carico a metà anno.
 */
function documentiDiventatiConsegne (fascicoli: Fascicolo[], corsi: Corso[]): Consegna[] {
  const esito: Consegna[] = []
  const primoCorso = new Map<string, Corso>()
  for (const corso of corsi) {
    if (!primoCorso.has(corso.classeId)) primoCorso.set(corso.classeId, corso)
  }

  for (const fascicolo of fascicoli) {
    if (fascicolo.documenti.length === 0) continue
    const corso = primoCorso.get(fascicolo.classeId)
    if (!corso) continue

    // Stessa regola con cui li si leggeva a matrice: il titolo è il documento.
    const gruppi = new Map<string, Documento[]>()
    for (const documento of fascicolo.documenti) {
      const chiave =
        documento.allievoId === null
          ? `solo:${documento.id}`
          : documento.titolo.trim().toLowerCase().replace(/\s+/g, ' ')
      const gia = gruppi.get(chiave)
      if (gia) gia.push(documento)
      else gruppi.set(chiave, [documento])
    }

    for (const documenti of gruppi.values()) {
      const capo = documenti[0]
      const diClasse = capo.allievoId === null
      // Passa da `normalizzaConsegna` come tutto il resto: così i file
      // raccolti stanno fra i `documenti` e non dentro le spunte, che è la
      // forma che le comunicazioni sanno leggere — anche in questa stessa
      // sessione, senza aspettare una riapertura.
      const conFile = documenti.filter((d) => d.file)
      esito.push(
        normalizzaConsegna({
          // Un documento di classe conserva il suo id: le comunicazioni già
          // scritte lo tengono fra gli allegati, e devono continuare a trovarlo.
          id: diClasse ? capo.id : `cns-da-${capo.id}`,
          corsoId: corso.id,
          testo: capo.titolo,
          tipo: 'consegna',
          documento: capo.categoria,
          a: diClasse ? 'docente' : 'allievi',
          allieviIds: diClasse
            ? []
            : documenti.map((d) => d.allievoId).filter((id): id is string => id !== null),
          data: capo.aggiuntoIl.slice(0, 10),
          scadenza: capo.scadenza ?? null,
          note: capo.note ?? '',
          documenti: conFile.map((d) => ({
            allievoId: d.allievoId ?? CHI_INSEGNA,
            file: d.file,
            nome: d.nome,
            aggiuntoIl: d.aggiuntoIl,
          })),
          fatte: conFile.map((d) => ({ chi: d.allievoId ?? CHI_INSEGNA, fattaIl: d.aggiuntoIl })),
          creataIl: capo.aggiuntoIl,
          aggiornataIl: capo.aggiuntoIl,
        }),
      )
    }

    fascicolo.documenti = []
  }

  return esito
}

// ------------------------------------------------------------------ integrità

/**
 * Riferimenti rimasti appesi dopo una cancellazione fatta a mano nei file, e le
 * regole del modello che nessun tipo sa esprimere: un corso per coppia, i voti
 * degli iscritti, il piano della materia giusta, la data dentro l'anno. Non è
 * un errore bloccante — l'interfaccia lo segnala e va avanti.
 */
export function riferimentiRotti (registro: Registro): string[] {
  const problemi: string[] = []
  const anni = new Map(registro.anni.map((a) => [a.id, a]))
  const classi = new Map(registro.classi.map((c) => [c.id, c]))
  const materie = new Set(registro.materie.map((m) => m.id))
  const corsi = new Map(registro.corsi.map((c) => [c.id, c]))
  const piani = new Map(registro.piani.map((p) => [p.id, p]))
  const lezioni = new Map(registro.lezioni.map((l) => [l.id, l]))

  const annoDi = (corso: Corso | undefined) => {
    const classe = corso ? classi.get(corso.classeId) : undefined
    return classe ? anni.get(classe.annoId) : undefined
  }

  for (const classe of registro.classi) {
    if (!anni.has(classe.annoId)) {
      problemi.push(`La classe «${classe.nome}» punta a un anno inesistente.`)
    }
  }

  const coppie = new Set<string>()
  for (const corso of registro.corsi) {
    if (!classi.has(corso.classeId) || !materie.has(corso.materiaId)) {
      problemi.push(`Il corso «${corso.titolo}» punta a una classe o a una materia che non c'è più.`)
      continue
    }
    const coppia = `${corso.classeId} ${corso.materiaId}`
    if (coppie.has(coppia)) {
      problemi.push(`Due corsi per la stessa materia nella stessa classe: «${corso.titolo}».`)
    }
    coppie.add(coppia)
  }

  const corsiEsistenti = new Set(registro.corsi.map((c) => c.id))
  for (const piano of registro.piani) {
    const suo = nomePiano(piano, {
      corso: corsi.get(piano.corsoId ?? '')?.titolo ?? null,
      lezioni: registro.lezioni,
    })
    if (piano.corsoId && !corsiEsistenti.has(piano.corsoId)) {
      problemi.push(`Il piano «${suo}»: il corso collegato non esiste più.`)
    }
    // Una risorsa senza né indirizzo né file è una riga che non porta da
    // nessuna parte: succede modificando i file a mano, e si dice.
    const vuote = [piano.risorse, ...piano.attivita.map((a) => a.risorse)]
      .flat()
      .filter((r) => !r.url && !r.file)
    if (vuote.length > 0) {
      problemi.push(
        `Il piano «${suo}»: ${plurale(vuote.length, 'risorsa', 'risorse')} senza indirizzo né file.`,
      )
    }
  }

  for (const lezione of registro.lezioni) {
    const corso = corsi.get(lezione.corsoId)
    if (!corso) {
      problemi.push(`Lezione del ${lezione.data} senza corso (${lezione.corsoId}).`)
      continue
    }
    const anno = annoDi(corso)
    if (anno && (lezione.data < anno.inizio || lezione.data > anno.fine)) {
      problemi.push(
        `Lezione del ${lezione.data} fuori dall'anno ${anno.etichetta} («${corso.titolo}»).`,
      )
    }
    if (!lezione.pianoId) continue
    const piano = piani.get(lezione.pianoId)
    if (!piano) {
      problemi.push(`Lezione del ${lezione.data}: il piano assegnato non esiste più.`)
    } else if (piano.corsoId && piano.corsoId !== corso.id) {
      problemi.push(`Lezione del ${lezione.data}: il piano assegnato è di un altro corso.`)
    }
  }

  for (const momento of registro.valutazioni) {
    const corso = corsi.get(momento.corsoId)
    if (!corso) {
      problemi.push(`Valutazione «${momento.titolo}» senza corso.`)
      continue
    }
    const anno = annoDi(corso)
    if (anno && !anno.semestri.some((s) => momento.data >= s.inizio && momento.data <= s.fine)) {
      problemi.push(
        `Valutazione «${momento.titolo}» del ${momento.data}: nessun semestre la contiene.`,
      )
    }
    const classe = classi.get(corso.classeId)
    if (classe) {
      const iscritti = new Set(classe.allievi.map((a) => a.id))
      const estranei = momento.voti.filter((v) => !iscritti.has(v.allievoId)).length
      if (estranei > 0) {
        problemi.push(
          `Valutazione «${momento.titolo}»: ${plurale(estranei, 'voto', 'voti')} di ${PIF.plurale} non iscritte a ${classe.nome}.`,
        )
      }
    }
    if (momento.pianoId && !piani.has(momento.pianoId)) {
      problemi.push(`Valutazione «${momento.titolo}»: il piano collegato non esiste più.`)
    }
    if (!momento.lezioneId) continue
    const lezione = lezioni.get(momento.lezioneId)
    if (!lezione) {
      problemi.push(`Valutazione «${momento.titolo}»: la lezione collegata non esiste più.`)
      continue
    }
    if (lezione.corsoId !== momento.corsoId) {
      problemi.push(`Valutazione «${momento.titolo}»: la lezione collegata è di un altro corso.`)
    }
    // Il triangolo momento–lezione–piano: due lati liberi, il terzo no.
    if (momento.pianoId && lezione.pianoId && momento.pianoId !== lezione.pianoId) {
      problemi.push(
        `Valutazione «${momento.titolo}»: cita un piano diverso da quello della sua lezione.`,
      )
    }
  }

  for (const fascicolo of registro.fascicoli) {
    if (!classi.has(fascicolo.classeId)) {
      problemi.push('Un fascicolo punta a una classe che non esiste più.')
    }
  }

  for (const consegna of registro.consegne) {
    const corso = corsi.get(consegna.corsoId)
    if (!corso) {
      problemi.push(`La consegna «${consegna.testo}» non appartiene più a nessun corso.`)
      continue
    }
    for (const rimando of [consegna.dataLezioneId, consegna.scadenzaLezioneId]) {
      if (rimando && !lezioni.has(rimando)) {
        problemi.push(`La consegna «${consegna.testo}»: la lezione a cui è legata non esiste più.`)
        break
      }
    }
    const classe = classi.get(corso.classeId)
    if (!classe) continue
    const iscritti = new Set(classe.allievi.map((a) => a.id))
    const estranei = [
      ...consegna.allieviIds,
      ...consegna.fatte.map((f) => f.chi).filter((chi) => chi !== CHI_INSEGNA),
    ].filter((id) => !iscritti.has(id))
    if (estranei.length > 0) {
      problemi.push(
        `La consegna «${consegna.testo}» cita ${quanti(estranei.length, PIF)} non iscritte a ${classe.nome}.`,
      )
    }
  }

  return problemi
}
