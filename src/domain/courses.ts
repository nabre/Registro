// Il corso, e tutto quello che se ne ricava.
//
// Su disco una lezione conosce solo il suo corso: classe, materia, anno e
// semestre si ricavano qui, e così non possono andare in disaccordo. Questo è
// l'unico posto in cui è scritta la catena lezione → corso → classe → anno.

import { confrontaLezioni, lezioneDelPiano, nomePiano } from './calculations.js'
import { nelPeriodo, semestreDi } from './dates.js'
import { coloreValido } from './lists.js'
import { confrontaNomi } from './text.js'
import { Uno } from './lexicon.js'
import { lessico } from './lexicon.testi.js'
import type {
  AnnoScolastico,
  Classe,
  Consegna,
  Corso,
  Fascicolo,
  Lezione,
  Materia,
  MomentoValutazione,
  PianoLezione,
  Registro,
} from './models.js'

// ------------------------------------------------------------------ il corso

export function corsoPerId (registro: Registro, id: string | null): Corso | null {
  return id ? registro.corsi.find((c) => c.id === id) ?? null : null
}

/** Il corso di una coppia classe+materia, se già c'è. Ne esiste al più uno. */
export function corsoDi (registro: Registro, classeId: string, materiaId: string): Corso | null {
  return registro.corsi.find((c) => c.classeId === classeId && c.materiaId === materiaId) ?? null
}

/**
 * Il titolo di serie di un corso: 'Classe — Materia'. La classe davanti,
 * così negli elenchi ordinati per titolo i corsi di una classe stanno vicini.
 */
export function titoloCorso (classe: Classe | null, materia: Materia | null): string {
  const L = lessico()
  return `${classe?.nome ?? L.classe.singolare} — ${materia?.nome ?? Uno(L.materia)}`
}

/**
 * Come si chiama una materia dove non c'è posto per il nome: «MAT», «ITA».
 * La sigla scritta se c'è; se no ricavata (iniziali delle parole, o prime tre
 * lettere), mai vuota: serve a distinguere due materie nella cella di un mese.
 */
export function siglaMateria (materia: Materia | null): string {
  const scritta = materia?.sigla?.trim()
  if (scritta) return scritta

  const nome = materia?.nome?.trim() ?? ''
  if (!nome) return ''

  const parole = nome.split(/[\s'’-]+/).filter((pezzo) => pezzo.length > 0)
  if (parole.length > 1) return parole.map((parola) => parola[0]?.toUpperCase() ?? '').join('')
  return nome.slice(0, 3).toUpperCase()
}

/**
 * Il colore di un corso: quello scelto per lui, o la media fra il colore della
 * classe e quello della materia — la classe dice di chi è l'ora, la materia di
 * che cosa, e due materie alla stessa classe restano parenti ma distinte. Una
 * materia senza colore lascia quello della classe.
 */
export function coloreDelCorso (
  corso: Pick<Corso, 'colore'>,
  classe: Pick<Classe, 'colore'> | null,
  materia: Pick<Materia, 'colore'> | null,
): string {
  if (coloreValido(corso.colore)) return corso.colore
  const diClasse = coloreValido(classe?.colore) ? classe.colore : null
  const diMateria = coloreValido(materia?.colore) ? materia.colore : null
  if (diClasse && diMateria) return mescola(diClasse, diMateria)
  return diClasse ?? diMateria ?? '#888888'
}

/** La media di due colori `#rrggbb`, canale per canale. */
function mescola (a: string, b: string): string {
  const canale = (colore: string, i: number) => parseInt(colore.slice(1 + i * 2, 3 + i * 2), 16)
  return `#${[0, 1, 2]
    .map((i) => Math.round((canale(a, i) + canale(b, i)) / 2).toString(16).padStart(2, '0'))
    .join('')}`
}

// ------------------------------------------------------------------ dal corso in su

export function classeDelCorso (registro: Registro, corso: Corso | null): Classe | null {
  return corso ? registro.classi.find((c) => c.id === corso.classeId) ?? null : null
}

/** La classe di un corso, dato l'id del corso: è la catena più corta del registro. */
export function classeDelCorsoId (registro: Registro, corsoId: string | null): Classe | null {
  return classeDelCorso(registro, corsoPerId(registro, corsoId))
}

/** La classe a cui una consegna si riferisce, passando dal corso. */
export function classeDellaConsegna (registro: Registro, consegna: Consegna): Classe | null {
  return classeDelCorsoId(registro, consegna.corsoId)
}

export function materiaDelCorso (registro: Registro, corso: Corso | null): Materia | null {
  return corso ? registro.materie.find((m) => m.id === corso.materiaId) ?? null : null
}

export function annoDellaClasse (registro: Registro, classe: Classe | null): AnnoScolastico | null {
  return classe ? registro.anni.find((a) => a.id === classe.annoId) ?? null : null
}

function annoDelCorso (registro: Registro, corso: Corso | null): AnnoScolastico | null {
  return annoDellaClasse(registro, classeDelCorso(registro, corso))
}

/** I corsi di una classe, in ordine di titolo: quante materie ci si insegna. */
export function corsiDellaClasse (registro: Registro, classeId: string): Corso[] {
  return registro.corsi
    .filter((c) => c.classeId === classeId)
    .sort((a, b) => confrontaNomi(a.titolo, b.titolo))
}

/** I corsi di un anno: quelli delle classi di quell'anno. */
export function corsiDellAnno (registro: Registro, annoId: string | null): Corso[] {
  if (!annoId) return [...registro.corsi]
  const classi = new Set(registro.classi.filter((c) => c.annoId === annoId).map((c) => c.id))
  return registro.corsi.filter((c) => classi.has(c.classeId))
}

/** I corsi che usano una materia: serve prima di cancellarla o di fonderla. */
export function corsiDellaMateria (registro: Registro, materiaId: string): Corso[] {
  return registro.corsi.filter((c) => c.materiaId === materiaId)
}

// ------------------------------------------------------------------ dalla lezione

export function corsoDellaLezione (registro: Registro, lezione: Lezione): Corso | null {
  return corsoPerId(registro, lezione.corsoId)
}

export function classeDellaLezione (registro: Registro, lezione: Lezione): Classe | null {
  return classeDelCorso(registro, corsoDellaLezione(registro, lezione))
}

export function materiaDellaLezione (registro: Registro, lezione: Lezione): Materia | null {
  return materiaDelCorso(registro, corsoDellaLezione(registro, lezione))
}

function annoDellaLezione (registro: Registro, lezione: Lezione): AnnoScolastico | null {
  return annoDelCorso(registro, corsoDellaLezione(registro, lezione))
}

/** Le lezioni di una classe: di tutti i suoi corsi messi insieme. */
export function lezioniDellaClasse (registro: Registro, classeId: string): Lezione[] {
  const corsi = new Set(corsiDellaClasse(registro, classeId).map((c) => c.id))
  return registro.lezioni.filter((l) => corsi.has(l.corsoId))
}

/**
 * Il registro di un corso: tutte le sue lezioni in ordine di calendario,
 * annullate comprese (per i conti c'è `lezioniDelCorso`, che le esclude). A
 * parità di giorno decide l'ora d'inizio.
 */
export function registroDelCorso (registro: Registro, corsoId: string | null): Lezione[] {
  if (!corsoId) return []
  return registro.lezioni.filter((l) => l.corsoId === corsoId).sort(confrontaLezioni)
}

/** Le lezioni di un anno: quelle delle classi di quell'anno. */
export function lezioniDellAnno (registro: Registro, annoId: string | null): Lezione[] {
  if (!annoId) return [...registro.lezioni]
  const corsi = new Set(corsiDellAnno(registro, annoId).map((c) => c.id))
  return registro.lezioni.filter((l) => corsi.has(l.corsoId))
}

// ------------------------------------------------------------------ dal momento

function corsoDelMomento (registro: Registro, momento: MomentoValutazione): Corso | null {
  return corsoPerId(registro, momento.corsoId)
}

export function classeDelMomento (registro: Registro, momento: MomentoValutazione): Classe | null {
  return classeDelCorso(registro, corsoDelMomento(registro, momento))
}

/** Le valutazioni di una classe, tutti i corsi insieme. */
export function valutazioniDellaClasse (
  registro: Registro,
  classeId: string,
): MomentoValutazione[] {
  const corsi = new Set(corsiDellaClasse(registro, classeId).map((c) => c.id))
  return registro.valutazioni.filter((v) => corsi.has(v.corsoId))
}

// ------------------------------------------------------------------ piani

/**
 * I piani di un corso, dal più recente. Nessun filtro per anno: il piano
 * dell'anno scorso è quello che si cerca per rifare la stessa ora.
 */
export function pianiDelCorso (registro: Registro, corsoId: string | null): PianoLezione[] {
  return registro.piani
    .filter((p) => p.corsoId === corsoId)
    .sort((a, b) => b.aggiornatoIl.localeCompare(a.aggiornatoIl))
}

// ------------------------------------------------------------------ fascicoli

export function fascicoloDellaClasse (registro: Registro, classeId: string): Fascicolo | null {
  return registro.fascicoli.find((f) => f.classeId === classeId) ?? null
}

/**
 * Come si chiama un piano, pescando corso e lezioni dal registro (`nomePiano`
 * li vuole già pronti).
 */
export function nomeDelPiano (registro: Registro, piano: PianoLezione): string {
  return nomePiano(piano, contestoDelPiano(registro, piano))
}

/**
 * Di quale lezione è un piano, senza ripetere il corso: «3ª lezione», «bozza
 * del 12.09». Per gli elenchi dentro la pagina di un corso.
 */
export function lezioneDelPianoNelRegistro (registro: Registro, piano: PianoLezione): string {
  return lezioneDelPiano(piano, contestoDelPiano(registro, piano))
}

function contestoDelPiano (registro: Registro, piano: PianoLezione) {
  return {
    corso: corsoPerId(registro, piano.corsoId)?.titolo ?? null,
    lezioni: registro.lezioni,
    numeroDellaLezione: (lezione: Lezione) => numeroDellaLezione(registro, lezione),
  }
}

/**
 * Che numero ha un'ora nel suo corso. Il conto riparte a ogni semestre, come
 * nel cruscotto. Le annullate non hanno numero; `null` anche se la lezione o il
 * corso non ci sono (chi chiama scrive la data).
 */
export function numeroDellaLezione (registro: Registro, lezione: Lezione): number | null {
  if (lezione.stato === 'annullata') return null

  // Un'ora fuori da ogni semestre si conta con le altre fuori semestre, come in
  // `numeriDelleLezioni`.
  const anno = annoDellaLezione(registro, lezione)
  const semestreDella = (l: Lezione) => (anno ? semestreDi(anno, l.data) : null)
  const semestre = semestreDella(lezione)
  const sue = registro.lezioni
    .filter((l) => l.corsoId === lezione.corsoId && l.stato !== 'annullata')
    .filter((l) =>
      semestre ? nelPeriodo(l.data, semestre.inizio, semestre.fine) : !semestreDella(l),
    )
    .sort(confrontaLezioni)

  const dove = sue.findIndex((l) => l.id === lezione.id)
  return dove >= 0 ? dove + 1 : null
}

/**
 * I numeri di tante lezioni in una passata, con le regole di
 * `numeroDellaLezione`. Le lezioni si ordinano qui: l'ordine d'arrivo non conta.
 */
export function numeriDelleLezioni (
  registro: Registro,
  lezioni: readonly Lezione[],
): Map<string, number | null> {
  const numeri = new Map<string, number | null>()
  const contatori = new Map<string, number>()
  for (const lezione of [...lezioni].sort(confrontaLezioni)) {
    if (lezione.stato === 'annullata') {
      numeri.set(lezione.id, null)
      continue
    }
    const anno = annoDellaLezione(registro, lezione)
    const semestre = anno ? semestreDi(anno, lezione.data) : null
    const gruppo = `${lezione.corsoId}|${semestre?.id ?? ''}`
    const numero = (contatori.get(gruppo) ?? 0) + 1
    contatori.set(gruppo, numero)
    numeri.set(lezione.id, numero)
  }
  return numeri
}
