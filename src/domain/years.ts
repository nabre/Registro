// L'anno scolastico e i suoi semestri, e la regola che li tiene insieme.
//
// L'anno non ha date sue: comincia quando comincia il primo semestre e finisce
// quando finisce l'ultimo. E i semestri sono attigui — il secondo parte il
// giorno dopo la fine del primo — così fra i due non c'è un giorno che non
// appartiene a nessuno.
//
// Prima le date erano quattro e indipendenti: inizio e fine dell'anno, più le
// due di ciascun semestre. Bastava spostarne una perché una lezione finisse in
// un giorno dentro l'anno e fuori da entrambi i semestri, e da lì non compariva
// più in nessuna media né in nessun cruscotto — senza che niente lo segnalasse.
// Ora il dato vero sono i semestri, e il resto si ricava.

import { inizioSettimana, isoValida, sommaGiorni } from './dates.js'
import { scriviIndirizzo } from './addresses.js'
import { chiaveIndirizzo } from './map.js'
import type {
  AnnoScolastico,
  Iso,
  LetteraSettimana,
  Registro,
  Semestre,
} from './models.js'
import { nomeSicuro } from './text.js'

/**
 * I semestri rimessi in fila: in ordine di inizio, rinumerati, e attaccati
 * l'uno all'altro.
 *
 * Comanda la data di fine di ciascuno: è quella che si sceglie davvero — «il
 * primo semestre chiude il 31 gennaio» — mentre l'inizio del successivo è una
 * conseguenza. Un semestre che finirebbe prima di cominciare dura un giorno:
 * è un refuso, e sparire sarebbe peggio che restare visibile e sbagliato.
 */
/**
 * L'anno di cui si parla adesso: quello segnato come corrente, e se non lo
 * trova il primo che c'e'.
 *
 * Il ripiego non e' una comodita': `annoCorrenteId` puo' puntare a un anno che
 * non c'e' piu' — una migrazione a meta', un file riparato a mano — e senza di
 * esso il registro risponde «nessun anno» pur avendone uno aperto.
 *
 * Esiste perche' la stessa riga era scritta in cinque posti, e **due di essi il
 * ripiego non lo avevano**: la barra laterale e la pagina Classi elencavano
 * regolarmente le classi di `anni[0]` mentre il widget delle pendenze e quello
 * dell'agenda dicevano «nessun registro», nella stessa finestra e nello stesso
 * momento. Due risposte diverse alla stessa domanda sono una risposta sola
 * sbagliata.
 */
export function annoInUso (registro: Registro): AnnoScolastico | null {
  return registro.anni.find((a) => a.id === registro.annoCorrenteId) ?? registro.anni[0] ?? null
}

export function allineaSemestri (semestri: Semestre[]): Semestre[] {
  const ordinati = [...semestri].sort((a, b) => a.inizio.localeCompare(b.inizio))

  return ordinati.map((semestre, indice) => {
    const inizio = indice === 0 ? semestre.inizio : sommaGiorni(ordinati[indice - 1].fine, 1)
    return {
      ...semestre,
      numero: (indice + 1) as Semestre['numero'],
      inizio,
      fine: semestre.fine >= inizio ? semestre.fine : inizio,
    }
  })
}

/** Da quando a quando va l'anno: gli estremi dei suoi semestri. */
export function intervalloAnno (semestri: Semestre[]): { inizio: Iso, fine: Iso } | null {
  if (semestri.length === 0) return null
  const allineati = allineaSemestri(semestri)
  return { inizio: allineati[0].inizio, fine: allineati[allineati.length - 1].fine }
}

/**
 * Da quando a quando va un anno, comunque sia fatto.
 *
 * I semestri se ci sono, gli estremi dichiarati dell'anno se non ci sono. È la
 * stessa catena di ripiego che stava scritta a mano in tre posti — la
 * risoluzione del periodo delle letture, la riga del periodo nella barra, e
 * dentro due procedure — e scritta a mano sbagliava sempre allo stesso modo:
 * `intervalloAnno` torna `null` anche quando l'anno c'è ma i semestri no, e chi
 * si fermava lì ricadeva su «tutto il tempo» invece che sull'anno. Una scheda
 * che contava ogni ora di ogni anno dentro le colonne di uno solo è nata così.
 *
 * `null` soltanto quando l'anno non c'è: allora non c'è niente su cui ripiegare
 * e la decisione è di chi chiama.
 */
export function estremiAnno (anno: AnnoScolastico | null): { inizio: Iso, fine: Iso } | null {
  if (!anno) return null
  return intervalloAnno(anno.semestri) ?? { inizio: anno.inizio, fine: anno.fine }
}

/**
 * L'anno rimesso in accordo con i suoi semestri.
 *
 * È il punto in cui l'invariante si fa valere, e passa di qui tutto: quel che
 * si legge dai file, quel che arriva dal pannello, quel che nasce da zero. Un
 * anno senza semestri non si tocca — non c'è da dove ricavare le date, e
 * inventarle sarebbe peggio che lasciarlo com'è.
 */
export function annoAllineato (anno: AnnoScolastico): AnnoScolastico {
  const semestri = allineaSemestri(anno.semestri)
  const intervallo = intervalloAnno(semestri)
  if (!intervallo) return anno
  return { ...anno, semestri, inizio: intervallo.inizio, fine: intervallo.fine }
}

/**
 * L'ultimo giorno del primo semestre: il confine.
 *
 * È l'unica data interna che si sceglie, perché spostarla sposta due cose
 * insieme — dove finisce il primo semestre e dove comincia il secondo — e
 * chiederle separate vorrebbe dire poterle contraddire.
 */
export function confineAnno (anno: AnnoScolastico): Iso | null {
  const allineati = allineaSemestri(anno.semestri)
  return allineati.length > 1 ? allineati[0].fine : null
}

/**
 * I due semestri di un anno che va da `inizio` a `fine`, spezzati al confine.
 *
 * Il confine fuori dall'intervallo non si accetta: taglierebbe l'anno in un
 * pezzo vuoto e uno solo: si ricade a metà del periodo, che è sbagliato ma
 * visibile e si corregge con un clic.
 */
export function semestriFra (
  inizio: Iso,
  fine: Iso,
  confine: Iso,
  identificatore: () => string,
  etichette: [string, string] = ['1° semestre', '2° semestre'],
): Semestre[] {
  const dentro = confine > inizio && confine < fine
  // `Date.parse` di una data che ISO non è torna `NaN`, e `toISOString()` su
  // `NaN` solleva `RangeError` invece di dire che il dato era sbagliato. Un
  // anno scolastico letto da un file scritto a mano arrivava fin qui e faceva
  // cadere l'apertura: se le due estremità non si leggono si taglia
  // sull'inizio, che è l'unico confine di cui si è sicuri.
  const mezzo = (Date.parse(inizio) + Date.parse(fine)) / 2
  const meta = dentro
    ? confine
    : Number.isFinite(mezzo)
      ? new Date(mezzo).toISOString().slice(0, 10)
      : inizio

  return [
    { id: identificatore(), numero: 1, etichetta: etichette[0], inizio, fine: meta },
    {
      id: identificatore(),
      numero: 2,
      etichetta: etichette[1],
      inizio: sommaGiorni(meta, 1),
      fine,
    },
  ]
}

// ------------------------------------------------------- l'anno come cartella

/**
 * Il nome di cartella di un anno, senza pestare quelli già presi.
 *
 * Si ricava dall'etichetta — «2026/2027» diventa «2026-2027» — e da lì non si
 * muove più: rinominare l'anno non sposta la cartella. Una cartella che si
 * rinomina da sola è una cartella che smette di essere dove i collegamenti
 * dicono che sia, e in una cartella sincronizzata si porta dietro anche i
 * conflitti di chi la stava aprendo altrove.
 */
export function cartellaDellAnno (anno: AnnoScolastico, prese: Set<string>): string {
  const radice = nomeSicuro(anno.etichetta || anno.inizio.slice(0, 4), 'anno')
  const scegli = (nome: string) => {
    prese.add(nome)
    return nome
  }
  if (!prese.has(radice)) return scegli(radice)
  for (let n = 2; n < 100; n += 1) {
    if (!prese.has(`${radice} (${n})`)) return scegli(`${radice} (${n})`)
  }
  return scegli(`${radice} ${Date.now()}`)
}

/** Quel che di un registro appartiene a un anno: una collezione per chiave. */
interface FetteAnno {
  classi: Registro['classi']
  corsi: Registro['corsi']
  lezioni: Registro['lezioni']
  piani: Registro['piani']
  valutazioni: Registro['valutazioni']
  fascicoli: Registro['fascicoli']
  consegne: Registro['consegne']
  smistamenti: Registro['smistamenti']
  coordinate: Registro['coordinate']
}

/**
 * Che cosa, di un registro tenuto tutto insieme, appartiene a un anno.
 *
 * Si risale la catena da cui tutto pende: la classe dichiara l'anno, il corso
 * la classe, l'ora e il voto il corso. Nessuna collezione dichiara l'anno per
 * conto suo, e va bene così — un dato scritto due volte è un dato che si può
 * contraddire.
 *
 * `ripiego` è l'anno che raccoglie gli sciolti: un corso che cita una classe
 * che non c'è, un piano mai assegnato, un PDF in quarantena che non si sa di
 * chi sia. Uno solo deve averlo, o quei dati finirebbero in ogni anno; e
 * qualcuno deve averlo, o non finirebbero da nessuna parte — che è il solo
 * esito davvero inaccettabile, perché è una perdita silenziosa.
 */
/**
 * Le coordinate che servono a un gruppo di classi: quelle dei loro indirizzi.
 *
 * Non si dividono per anno — un indirizzo non ha un anno — ma per uso: ogni
 * cartella si porta i punti che le servono, così un anno aperto da solo disegna
 * la sua mappa senza andare a cercare altrove. Che la stessa via finisca in due
 * anni non è una duplicazione da evitare: sono due archivi indipendenti, ed è
 * quel che li rende apribili uno senza l'altro.
 */
function coordinateDelleClassi (
  registro: Registro,
  classi: Registro['classi'],
  ripiego: boolean,
): Registro['coordinate'] {
  const chiavi = new Set<string>()
  for (const classe of classi) {
    for (const allievo of classe.allievi) {
      for (const dove of [allievo.indirizzo, allievo.indirizzoDatore]) {
        const scritto = scriviIndirizzo(dove)
        if (scritto) chiavi.add(chiaveIndirizzo(scritto))
      }
    }
  }
  const usate = new Set<string>()
  for (const classe of registro.classi) {
    for (const allievo of classe.allievi) {
      for (const dove of [allievo.indirizzo, allievo.indirizzoDatore]) {
        const scritto = scriviIndirizzo(dove)
        if (scritto) usate.add(chiaveIndirizzo(scritto))
      }
    }
  }
  return registro.coordinate.filter(
    (voce) => chiavi.has(voce.chiave) || (ripiego && !usate.has(voce.chiave)),
  )
}

export function fetteDellAnno (registro: Registro, annoId: string, ripiego: boolean): FetteAnno {
  const tieni = <T>(voci: T[], dentro: (v: T) => boolean, sciolto: (v: T) => boolean) =>
    voci.filter((v) => dentro(v) || (ripiego && sciolto(v)))

  const anni = new Set(registro.anni.map((a) => a.id))
  const classi = tieni(
    registro.classi,
    (c) => c.annoId === annoId,
    (c) => !anni.has(c.annoId),
  )

  const idClassi = new Set(classi.map((c) => c.id))
  const tutteLeClassi = new Set(registro.classi.map((c) => c.id))
  const corsi = tieni(
    registro.corsi,
    (c) => idClassi.has(c.classeId),
    (c) => !tutteLeClassi.has(c.classeId),
  )

  const idCorsi = new Set(corsi.map((c) => c.id))
  const tuttiICorsi = new Set(registro.corsi.map((c) => c.id))
  const delCorso = <T extends { corsoId: string | null }>(voci: T[]) =>
    tieni(
      voci,
      (v) => !!v.corsoId && idCorsi.has(v.corsoId),
      (v) => !v.corsoId || !tuttiICorsi.has(v.corsoId),
    )

  const consegne = delCorso(registro.consegne)
  const idConsegne = new Set(consegne.map((c) => c.id))
  const tutteLeConsegne = new Set(registro.consegne.map((c) => c.id))

  return {
    classi,
    corsi,
    lezioni: delCorso(registro.lezioni),
    piani: delCorso(registro.piani),
    valutazioni: delCorso(registro.valutazioni),
    consegne,
    fascicoli: tieni(
      registro.fascicoli,
      (f) => idClassi.has(f.classeId),
      (f) => !tutteLeClassi.has(f.classeId),
    ),
    // Uno smistamento aspetta una consegna o una classe: segue quella, e solo
    // se non ne ha nessuna riconoscibile finisce fra gli sciolti.
    smistamenti: registro.smistamenti.filter((s) => {
      if (s.consegnaId && tutteLeConsegne.has(s.consegnaId)) return idConsegne.has(s.consegnaId)
      if (s.classeId && tutteLeClassi.has(s.classeId)) return idClassi.has(s.classeId)
      return ripiego
    }),
    // Gli indirizzi collocati seguono le classi dell'anno: la voce è per
    // indirizzo, e un indirizzo che nessuno di quest'anno usa non ha motivo di
    // starci dentro. Quelli che non li usa nessuno — resti di un'anagrafica
    // corretta — vanno con gli sciolti, insieme al resto che non ha padrone.
    coordinate: coordinateDelleClassi(registro, classi, ripiego),
  }
}

// ---------------------------------------------------------------- settimane A e B

/** Vero per una lettera che il registro conosce. */
function letteraValida (valore: unknown): valore is LetteraSettimana {
  return valore === 'A' || valore === 'B'
}

/**
 * La lettera della settimana in cui cade un giorno, o null se non ne ha.
 *
 * Si chiede per giorno e non per lunedì perché chi la chiede ha in mano una
 * data — quella di una lezione, quella aperta nel calendario — e il lunedì lo
 * si ricava sempre allo stesso modo: farlo qui una volta evita che qualcuno,
 * da qualche parte, lo ricavi in un altro modo.
 */
export function letteraSettimana (
  anno: AnnoScolastico | null,
  giorno: Iso,
): LetteraSettimana | null {
  if (!anno?.settimane) return null
  return anno.settimane[inizioSettimana(giorno)] ?? null
}

/**
 * L'anno con la lettera di una settimana messa, cambiata o tolta.
 *
 * Torna un anno nuovo invece di modificare quello che riceve: è quel che
 * permette di validarlo prima di scriverlo, come per ogni altra modifica
 * all'anno. `null` toglie la voce invece di scriverci dentro una stringa
 * vuota — una settimana senza lettera non deve comparire nel file.
 */
export function conLetteraSettimana (
  anno: AnnoScolastico,
  giorno: Iso,
  lettera: LetteraSettimana | null,
): AnnoScolastico {
  const lunedi = inizioSettimana(giorno)
  const settimane = { ...(anno.settimane ?? {}) }
  if (lettera) settimane[lunedi] = lettera
  else delete settimane[lunedi]
  return { ...anno, settimane: ordinaSettimane(settimane) }
}

/**
 * Le settimane rimesse in fila per data, e ripulite.
 *
 * In ordine perché il file lo si legge a mano e un elenco di date sparse non
 * si scorre; ripulite perché la chiave può arrivare da un file scritto a mano,
 * e una data qualsiasi del mercoledì diventa il suo lunedì invece di restare
 * una voce che nessuna ricerca troverà mai.
 */
export function ordinaSettimane (
  grezze: Record<string, unknown>,
): Record<Iso, LetteraSettimana> {
  const messe: Record<Iso, LetteraSettimana> = {}
  for (const chiave of Object.keys(grezze).sort()) {
    const lettera = grezze[chiave]
    if (!isoValida(chiave) || !letteraValida(lettera)) continue
    messe[inizioSettimana(chiave)] = lettera
  }
  return messe
}
