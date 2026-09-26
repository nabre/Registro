// Se un dato sta in piedi: le regole controllate prima di salvare quel che
// arriva da moduli e procedure. `valida…` non tocca il dato: produce messaggi.
//
// Qui anche le regole condivise con la lettura dei file (indirizzo web, materie
// uguali): `normalization.ts` le prende da qui, mai il contrario.

import { intervalloAnno } from './years.js'
import {
  LIMITI_UD,
  durataMinuti,
  formattaData,
  isoValida,
  oraValida,
  sommaGiorni,
} from './dates.js'
import { emailValida, normalizzaTesto } from './text.js'
import { slotInConflitto } from './calculations.js'
import { SCALA_PREDEFINITA } from './factories.js'
import { LIMITI_PAUSE, pauseDentroIlGiorno } from './breaks.js'
import type {
  Allievo,
  AnnoScolastico,
  Consegna,
  Iso,
  Classe,
  Lezione,
  MomentoValutazione,
  PauseGiornata,
  PianoLezione,
  Scala,
  BloccoAssenze,
  Comunicazione,
  Corso,
  Materia,
  Recapito,
  Ricorrenza,
  Risorsa,
  Sospensione,
  Slot,
} from './models.js'
import { testi } from './validation.testi.js'

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
 * L'anno sta in piedi se stanno in piedi i suoi semestri (le date dell'anno se
 * ne ricavano): ci sono, ognuno dura, e sono contigui.
 */
export function validaAnno (anno: Partial<AnnoScolastico>): Esito {
  const t = testi()
  const errori: string[] = []
  if (!anno.etichetta?.trim()) errori.push(t.etichettaAnno)

  const semestri = anno.semestri ?? []
  if (semestri.length === 0) {
    errori.push(t.senzaSemestri)
  }
  for (const semestre of semestri) {
    if (!isoValida(semestre.inizio) || !isoValida(semestre.fine)) {
      errori.push(t.dateSemestre(semestre.etichetta))
    } else if (semestre.inizio >= semestre.fine) {
      errori.push(t.semestreAlRovescio(semestre.etichetta))
    }
  }
  // Contiguità in ordine di data, non di elenco.
  const inFila = [...semestri].sort((a, b) => String(a.inizio).localeCompare(String(b.inizio)))
  for (let i = 1; i < inFila.length; i += 1) {
    if (!isoValida(inFila[i].inizio) || !isoValida(inFila[i - 1].fine)) continue
    if (inFila[i].inizio !== sommaGiorni(inFila[i - 1].fine, 1)) {
      errori.push(t.semestriStaccati(inFila[i].etichetta, inFila[i - 1].etichetta))
    }
  }

  const intervallo = intervalloAnno(
    semestri.filter((s) => isoValida(s.inizio) && isoValida(s.fine)),
  )
  if (intervallo && (anno.inizio !== intervallo.inizio || anno.fine !== intervallo.fine)) {
    errori.push(t.dateAnno)
  }

  // Una pausa fuori dall'anno non spegnerebbe nessun giorno: è un errore.
  for (const pausa of anno.sospensioni ?? []) {
    const suo = validaSospensione(pausa)
    if (!suo.valido) {
      errori.push(...suo.errori)
      continue
    }
    if (intervallo && (pausa.dal < intervallo.inizio || pausa.al > intervallo.fine)) {
      errori.push(t.sospensioneFuori(pausa.etichetta))
    }
  }
  return esito(errori)
}

/** Un periodo di chiusura sta in piedi se le due date ci sono e sono in ordine. */
function validaSospensione (sospensione: Partial<Sospensione>): Esito {
  const t = testi()
  const errori: string[] = []
  if (!sospensione.etichetta?.trim()) errori.push(t.sospensioneSenzaNome)
  if (!isoValida(sospensione.dal)) errori.push(t.inizioNonValido)
  if (!isoValida(sospensione.al)) errori.push(t.fineNonValida)
  if (isoValida(sospensione.dal) && isoValida(sospensione.al) && sospensione.dal > sospensione.al) {
    errori.push(t.sospensioneAlRovescio)
  }
  return esito(errori)
}

/**
 * Una fascia dell'orario. Due fasce dello stesso corso non cominciano lo stesso
 * giorno alla stessa ora: la seconda lezione generata verrebbe scartata.
 */
export function validaRicorrenza (
  ricorrenza: Partial<Ricorrenza>,
  minutiUd: number,
  altre: Ricorrenza[] = [],
): Esito {
  const t = testi()
  const errori: string[] = []
  const giorno = Number(ricorrenza.giorno)
  if (!(giorno >= 1 && giorno <= 7)) errori.push(t.giornoNonValido)
  if (!oraValida(ricorrenza.inizio)) errori.push(t.oraInizio)
  const durata = Number(ricorrenza.durataMin)
  if (!(durata > 0)) {
    errori.push(t.durataZero)
  } else if (durata % minutiUd !== 0) {
    errori.push(t.fasciaInUd(minutiUd))
  }
  if (ricorrenza.dal && !isoValida(ricorrenza.dal)) errori.push(t.dalNonValido)
  if (ricorrenza.al && !isoValida(ricorrenza.al)) errori.push(t.alNonValido)
  if (ricorrenza.dal && ricorrenza.al && ricorrenza.dal > ricorrenza.al) {
    errori.push(t.periodoFascia)
  }
  const gemella = altre.find(
    (r) => r.id !== ricorrenza.id && r.giorno === giorno && r.inizio === ricorrenza.inizio,
  )
  if (gemella) errori.push(t.fasciaGemella)
  return esito(errori)
}

/**
 * La durata di un'unità didattica: minuti interi, dentro `LIMITI_UD`. Sotto
 * il minimo non c'è una lezione; sopra il massimo è un blocco, non un'unità.
 */
export function validaMinutiUd (minutiUd: unknown): Esito {
  const { minimo, massimo } = LIMITI_UD
  const intero = typeof minutiUd === 'number' && Number.isInteger(minutiUd)
  return esito(
    intero && minutiUd >= minimo && minutiUd <= massimo
      ? []
      : [testi().minutiUd(minimo, massimo)],
  )
}

/**
 * Le pause della giornata: la prima ha un orario, durate e distanze (in UD
 * intere) sono intere dentro gli estremi, l'ultima finisce prima di mezzanotte.
 */
export function validaPause (pause: PauseGiornata, minutiUd: number): Esito {
  const t = testi()
  const errori: string[] = []
  const { durata, distanza, quante } = LIMITI_PAUSE
  const intero = (valore: unknown, estremi: { minimo: number, massimo: number }): boolean =>
    typeof valore === 'number' && Number.isInteger(valore) &&
    valore >= estremi.minimo && valore <= estremi.massimo

  if (!oraValida(pause.prima?.inizio)) errori.push(t.primaPausa)
  const seguenti = Array.isArray(pause.seguenti) ? pause.seguenti : []
  const tutte = [pause.prima?.durataMin, ...seguenti.map((s) => s?.durataMin)]
  if (tutte.length > quante) errori.push(t.troppePause(quante))
  tutte.forEach((minuti, i) => {
    if (!intero(minuti, durata)) {
      errori.push(t.durataPausa(i, durata.minimo, durata.massimo))
    }
  })
  seguenti.forEach((seguente, i) => {
    if (!intero(seguente?.dopoUd, distanza)) {
      errori.push(t.distanzaPausa(i + 1, distanza.minimo, distanza.massimo))
    }
  })
  if (errori.length === 0 && pauseDentroIlGiorno(pause, minutiUd) !== pause) {
    errori.push(t.mezzanotte)
  }
  return esito(errori)
}

export function validaClasse (classe: Partial<Classe>, altre: Classe[] = []): Esito {
  const t = testi()
  const errori: string[] = []
  const nome = classe.nome?.trim() ?? ''
  if (!nome) errori.push(t.classeSenzaNome)
  const gemella = altre.find(
    (c) =>
      c.id !== classe.id &&
      c.annoId === classe.annoId &&
      c.nome.trim().toLowerCase() === nome.toLowerCase(),
  )
  if (gemella) errori.push(t.classeGemella(gemella.nome))
  return esito(errori)
}

export function validaAllievo (allievo: Partial<Allievo>): Esito {
  const t = testi()
  const errori: string[] = []
  if (!allievo.cognome?.trim()) errori.push(t.cognome)
  if (!allievo.nome?.trim()) errori.push(t.nome)
  // Un file scritto a mano può avere una data storta, che finirebbe stampata
  // sulla scheda per la segreteria.
  if (allievo.dataNascita && !isoValida(allievo.dataNascita)) {
    errori.push(t.nascita)
  }
  if (allievo.email && !emailValida(allievo.email)) {
    errori.push(t.email)
  }
  if (allievo.emailTutore && !emailValida(allievo.emailTutore)) {
    errori.push(t.emailRappresentante)
  }
  // Indirizzo delle richieste di firma: un refuso si scopre solo a fine periodo.
  if (allievo.emailDatore && !emailValida(allievo.emailDatore)) {
    errori.push(t.emailDatore)
  }
  return esito(errori)
}

export function validaSlot (slot: Slot[], minutiUd: number): Esito {
  const t = testi()
  const errori: string[] = []
  if (slot.length === 0) errori.push(t.senzaFasce)
  for (const s of slot) {
    if (!oraValida(s.inizio) || !oraValida(s.fine)) {
      errori.push(t.orari)
    } else if (s.inizio >= s.fine) {
      errori.push(t.fasciaAlRovescio(s.inizio, s.fine))
    } else if (s.tipo === 'lezione' && durataMinuti(s.inizio, s.fine) % minutiUd !== 0) {
      // Una lezione è fatta di UD intere; le pause durano quel che durano.
      errori.push(t.fasciaNonMultipla(s.inizio, s.fine, minutiUd))
    }
  }
  for (const [a, b] of slotInConflitto(slot)) {
    errori.push(t.fasceSovrapposte(a.inizio, a.fine, b.inizio, b.fine))
  }
  if (slot.length > 0 && slot.every((s) => s.tipo === 'pausa')) {
    errori.push(t.solePause)
  }
  return esito(errori)
}

export function validaLezione (lezione: Partial<Lezione>, minutiUd: number): Esito {
  const t = testi()
  const errori: string[] = []
  if (!isoValida(lezione.data)) errori.push(t.dataLezione)
  if (!lezione.corsoId) errori.push(t.corsoLezione)
  errori.push(...validaSlot(lezione.slot ?? [], minutiUd).errori)
  return esito(errori)
}

/**
 * Un indirizzo apribile senza sorprese: solo http e https, niente
 * `javascript:` né `file:`.
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
  const t = testi()
  const errori: string[] = []
  if (!risorsa.titolo?.trim()) errori.push(t.risorsaSenzaTitolo)
  if (risorsa.tipo === 'collegamento' && !urlValido(risorsa.url)) {
    errori.push(t.indirizzoWeb)
  }
  return esito(errori)
}

export function validaPiano (piano: Partial<PianoLezione>): Esito {
  const t = testi()
  const errori: string[] = []
  // Un piano è sempre di un corso. Quelli senza corso esistono solo quando il
  // corso è stato eliminato (le riparazioni li staccano) e il pannello li
  // mostra in fondo, da riagganciare.
  if (!piano.corsoId) errori.push(t.pianoSenzaCorso)
  for (const attivita of piano.attivita ?? []) {
    if (!attivita.titolo?.trim()) errori.push(t.attivitaSenzaTitolo)
    if (!(attivita.durataUd > 0)) errori.push(t.durataAttivita(attivita.titolo))
  }
  return esito(errori)
}

/**
 * Il nome di una materia ridotto all'osso (minuscole, senza accenti né spazi
 * doppi): due materie uguali farebbero due corsi che si dividono le ore.
 */
export function nomeNormalizzato (nome: string): string {
  return normalizzaTesto(nome)
}

/** Distanza di edit fra due parole, per accorgersi di un refuso. */
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
 * Le materie che assomigliano a un nome senza esserlo, probabilmente refusi.
 * È un'avvertenza, non un rifiuto: 'Storia' e 'Storia dell'arte' esistono.
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
  const t = testi()
  const errori: string[] = []
  const nome = materia.nome?.trim() ?? ''
  if (!nome) errori.push(t.materiaSenzaNome)
  const gemella = altre.find(
    (m) => m.id !== materia.id && nomeNormalizzato(m.nome) === nomeNormalizzato(nome),
  )
  if (gemella) errori.push(t.materiaGemella(gemella.nome))
  return esito(errori)
}

/** Un corso per coppia classe+materia: è la sua identità. */
export function validaCorso (corso: Partial<Corso>, altri: Corso[] = []): Esito {
  const t = testi()
  const errori: string[] = []
  if (!corso.classeId) errori.push(t.corsoSenzaClasse)
  if (!corso.materiaId) errori.push(t.corsoSenzaMateria)
  const gemello = altri.find(
    (c) => c.id !== corso.id && c.classeId === corso.classeId && c.materiaId === corso.materiaId,
  )
  if (gemello) errori.push(t.corsoGemello(gemello.titolo))
  return esito(errori)
}

export function validaRecapito (recapito: Partial<Recapito>): Esito {
  const t = testi()
  const errori: string[] = []
  if (!recapito.etichetta?.trim()) errori.push(t.recapitoSenzaEtichetta)
  if (!emailValida(recapito.email)) errori.push(t.email)
  return esito(errori)
}

export function validaComunicazione (comunicazione: Partial<Comunicazione>): Esito {
  const t = testi()
  const errori: string[] = []
  if (!comunicazione.oggetto?.trim()) errori.push(t.comunicazioneSenzaOggetto)
  if (!comunicazione.corpo?.trim()) errori.push(t.comunicazioneVuota)
  const gruppi =
    Boolean(comunicazione.aAllievi) ||
    Boolean(comunicazione.aTutori) ||
    (comunicazione.recapitiIds ?? []).length > 0
  if (!gruppi) errori.push(t.destinatari)
  return esito(errori)
}

export function validaScala (scala: Partial<Scala>): Esito {
  const t = testi()
  const errori: string[] = []
  const { min, max, sufficienza, passo } = { ...SCALA_PREDEFINITA, ...scala }
  if (!(min < max)) errori.push(t.scalaAlRovescio)
  if (sufficienza < min || sufficienza > max) errori.push(t.sufficienza)
  if (!(passo > 0)) errori.push(t.passoVoti)
  return esito(errori)
}

export function validaValutazione (momento: Partial<MomentoValutazione>): Esito {
  const t = testi()
  const errori: string[] = []
  if (!momento.titolo?.trim()) errori.push(t.valutazioneSenzaTitolo)
  if (!isoValida(momento.data)) errori.push(t.dataNonValida)
  if (!momento.corsoId) errori.push(t.corsoValutazione)
  // Zero è ammesso (la prova che non fa media); oltre 10 no, ribalterebbe la
  // media senza dirlo.
  const peso = Number(momento.peso)
  if (!Number.isFinite(peso) || peso < 0 || peso > 10) {
    errori.push(t.peso)
  }
  if (momento.scala) errori.push(...validaScala(momento.scala).errori)
  const scala = { ...SCALA_PREDEFINITA, ...(momento.scala ?? {}) }
  for (const voto of momento.voti ?? []) {
    if (voto.valore === null || voto.assente) continue
    if (voto.valore < scala.min || voto.valore > scala.max) {
      errori.push(t.votoFuori(voto.valore, scala.min, scala.max))
    }
  }
  return esito(errori)
}

/**
 * Un periodo di assenze sta in piedi se ha date valide, oggetto e testo:
 * questi si controllano qui e non all'invio, perché le mail partite in blocco
 * non si richiamano. Con `anno`, il periodo deve starci dentro (un periodo che
 * sborda è quasi sempre un anno sbagliato nella data).
 */
export function validaBloccoAssenze (
  blocco: Partial<BloccoAssenze>,
  anno?: { inizio: Iso, fine: Iso, etichetta: string } | null,
): Esito {
  const t = testi()
  const errori: string[] = []
  // Il nome non si convalida: chi salva lo ricava dal semestre o dalle date.
  if (!isoValida(blocco.dal)) errori.push(t.inizioNonValido)
  if (!isoValida(blocco.al)) errori.push(t.fineNonValida)
  if (isoValida(blocco.dal) && isoValida(blocco.al) && blocco.dal > blocco.al) {
    errori.push(t.periodoAlRovescio)
  }
  if (
    anno &&
    isoValida(blocco.dal) &&
    isoValida(blocco.al) &&
    ((blocco.dal) < anno.inizio || (blocco.al) > anno.fine)
  ) {
    errori.push(t.periodoFuori(anno.etichetta, formattaData(anno.inizio), formattaData(anno.fine)))
  }
  if (!blocco.oggetto?.trim()) errori.push(t.emailSenzaOggetto)
  if (!blocco.corpo?.trim()) errori.push(t.emailVuota)
  return esito(errori)
}

export function validaConsegna (consegna: Partial<Consegna>): Esito {
  const t = testi()
  const errori: string[] = []
  if (!consegna.testo?.trim()) errori.push(t.consegnaSenzaTesto)
  if (!consegna.corsoId) errori.push(t.consegnaSenzaCorso)
  if (consegna.a === 'allievi' && (consegna.allieviIds ?? []).length === 0) {
    errori.push(t.consegnaSenzaPersone)
  }
  if (consegna.scadenza && !isoValida(consegna.scadenza)) errori.push(t.scadenzaNonValida)
  if (
    consegna.scadenza &&
    isoValida(consegna.scadenza) &&
    !consegna.scadenzaLezioneId &&
    !consegna.dataLezioneId &&
    isoValida(consegna.data) &&
    consegna.scadenza < consegna.data
  ) {
    errori.push(t.scadenzaPrima)
  }
  if (consegna.a === 'docente' && consegna.verso === 'consegno') {
    errori.push(t.consegnoIo)
  }
  return esito(errori)
}
