// Il corso, e tutto quello che da lì si ricava.
//
// Il modello scrive su disco il minimo: una lezione conosce il suo corso e
// nient'altro. Classe, materia, anno e semestre non sono scritti da nessuna
// parte perché si leggono passando di qui — ed è il motivo per cui non possono
// andare in disaccordo con niente.
//
// Chiunque debba sapere «di che classe è questa lezione» chiama queste
// funzioni: l'extension host che disegna l'albero, il webview che disegna il
// calendario e i test. Sono l'unico posto in cui la catena
// lezione → corso → classe → anno è scritta.

import { confrontaLezioni, nomePiano } from './calcoli.js'
import { semestreDi } from './date.js'
import { creaCorso } from './fabbriche.js'
import type {
  AnnoScolastico,
  Classe,
  Consegna,
  Corso,
  Fascicolo,
  Iso,
  Lezione,
  Materia,
  MomentoValutazione,
  PianoLezione,
  Registro,
  Semestre,
} from './modelli.js'

// ------------------------------------------------------------------ il corso

export function corsoPerId (registro: Registro, id: string | null): Corso | null {
  return id ? registro.corsi.find((c) => c.id === id) ?? null : null
}

/** Il corso di una coppia classe+materia, se già c'è. Ne esiste al più uno. */
export function corsoDi (registro: Registro, classeId: string, materiaId: string): Corso | null {
  return registro.corsi.find((c) => c.classeId === classeId && c.materiaId === materiaId) ?? null
}

/**
 * Come si chiama un corso quando non gli si dà un titolo: 'Classe — Materia'.
 *
 * La classe davanti perché è quella che si cerca. Gli elenchi di corsi si
 * ordinano per titolo, e con la materia davanti finivano mescolati — le tre
 * classi di Calcolo professionale lontane dalle due di Laboratorio della stessa
 * classe. Con la classe davanti un corso sta accanto agli altri della sua
 * classe, che è come li si tiene in testa: prima si sa dove si entra, poi che
 * cosa ci si fa.
 */
export function titoloCorso (classe: Classe | null, materia: Materia | null): string {
  return `${classe?.nome ?? 'classe'} — ${materia?.nome ?? 'Materia'}`
}

/**
 * Il corso di una coppia, creandolo se manca. Torna anche `creato`, perché chi
 * chiama deve sapere se ha appena aggiunto qualcosa al registro: il corso nuovo
 * va inserito e il file va riscritto.
 */
export function assicuraCorso (
  registro: Registro,
  classeId: string,
  materiaId: string,
): { corso: Corso; creato: boolean } {
  const esistente = corsoDi(registro, classeId, materiaId)
  if (esistente) return { corso: esistente, creato: false }

  const classe = registro.classi.find((c) => c.id === classeId) ?? null
  const materia = registro.materie.find((m) => m.id === materiaId) ?? null
  return { corso: creaCorso(classeId, materiaId, titoloCorso(classe, materia)), creato: true }
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

export function annoDelCorso (registro: Registro, corso: Corso | null): AnnoScolastico | null {
  return annoDellaClasse(registro, classeDelCorso(registro, corso))
}

/** I corsi di una classe, in ordine di titolo: quante materie ci si insegna. */
export function corsiDellaClasse (registro: Registro, classeId: string): Corso[] {
  return registro.corsi
    .filter((c) => c.classeId === classeId)
    .sort((a, b) => a.titolo.localeCompare(b.titolo, 'it'))
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

export function annoDellaLezione (registro: Registro, lezione: Lezione): AnnoScolastico | null {
  return annoDelCorso(registro, corsoDellaLezione(registro, lezione))
}

/** Le lezioni di una classe: di tutti i suoi corsi messi insieme. */
export function lezioniDellaClasse (registro: Registro, classeId: string): Lezione[] {
  const corsi = new Set(corsiDellaClasse(registro, classeId).map((c) => c.id))
  return registro.lezioni.filter((l) => corsi.has(l.corsoId))
}

/**
 * Il registro di un corso: tutte le sue lezioni in ordine di calendario.
 *
 * Le annullate ci sono anche: nel registro restano, segnate, e sfogliando le
 * ore si vuole vedere pure quelle. Chi fa i conti — ore svolte, avanzamento —
 * usa invece `lezioniDelCorso`, che le lascia fuori perché ore non sono.
 *
 * L'ordine è quello con cui si sfoglia, non quello con cui stanno nel file. A
 * parità di giorno decide l'ora d'inizio: due lezioni della stessa materia
 * nello stesso giorno sono due ore diverse, e invertirle vorrebbe dire
 * scrivere il consuntivo sulla riga sbagliata.
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

export function corsoDelMomento (registro: Registro, momento: MomentoValutazione): Corso | null {
  return corsoPerId(registro, momento.corsoId)
}

export function classeDelMomento (registro: Registro, momento: MomentoValutazione): Classe | null {
  return classeDelCorso(registro, corsoDelMomento(registro, momento))
}

/**
 * Il semestre di un momento: quello in cui cade la sua data. Non è scritto da
 * nessuna parte, e questo è il punto — una verifica spostata a febbraio passa
 * al secondo semestre da sola, senza che nessuno debba ricordarsene.
 */
export function semestreDelMomento (
  registro: Registro,
  momento: MomentoValutazione,
): Semestre | null {
  const anno = annoDelCorso(registro, corsoDelMomento(registro, momento))
  return anno ? semestreDi(anno, momento.data) : null
}

/** Il semestre in cui cade una data, nell'anno di una classe. */
export function semestreDellaClasse (
  registro: Registro,
  classe: Classe | null,
  data: Iso,
): Semestre | null {
  const anno = annoDellaClasse(registro, classe)
  return anno ? semestreDi(anno, data) : null
}

/** Le valutazioni di una classe, tutti i corsi insieme. */
export function valutazioniDellaClasse (
  registro: Registro,
  classeId: string,
): MomentoValutazione[] {
  const corsi = new Set(corsiDellaClasse(registro, classeId).map((c) => c.id))
  return registro.valutazioni.filter((v) => corsi.has(v.corsoId))
}

/** Le valutazioni di un anno: quelle delle classi di quell'anno. */
export function valutazioniDellAnno (
  registro: Registro,
  annoId: string | null,
): MomentoValutazione[] {
  if (!annoId) return [...registro.valutazioni]
  const corsi = new Set(corsiDellAnno(registro, annoId).map((c) => c.id))
  return registro.valutazioni.filter((v) => corsi.has(v.corsoId))
}

// ------------------------------------------------------------------ piani

/**
 * I piani di un corso, dal più recente. Non c'è filtro per anno di proposito:
 * un piano dell'anno scorso è esattamente quello che si cerca quando si prepara
 * la stessa ora quest'anno — e per usarlo su un altro corso lo si duplica.
 */
export function pianiDelCorso (registro: Registro, corsoId: string | null): PianoLezione[] {
  return registro.piani
    .filter((p) => p.corsoId === corsoId)
    .sort((a, b) => b.aggiornatoIl.localeCompare(a.aggiornatoIl))
}

/** I piani di un corso, dato il corso. */
export function pianiDi (registro: Registro, corso: Corso | null): PianoLezione[] {
  return corso ? pianiDelCorso(registro, corso.id) : []
}

// ------------------------------------------------------------------ fascicoli

export function fascicoloDellaClasse (registro: Registro, classeId: string): Fascicolo | null {
  return registro.fascicoli.find((f) => f.classeId === classeId) ?? null
}

/**
 * Come si chiama un piano, con il registro sotto mano: il corso e la lezione.
 *
 * `nomePiano` è puro e vuole già pronti il nome del corso e le lezioni; qui si
 * pescano dal registro, che è quel che hanno in mano l'albero, la barra di
 * stato e i comandi.
 */
export function nomeDelPiano (registro: Registro, piano: PianoLezione): string {
  return nomePiano(piano, {
    corso: corsoPerId(registro, piano.corsoId)?.titolo ?? null,
    lezioni: registro.lezioni,
  })
}
