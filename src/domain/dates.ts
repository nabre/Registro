// Aritmetica di calendario sulle stringhe 'AAAA-MM-GG'.
//
// Non `Date`: il registro ragiona per giorni, e `new Date('2025-09-15')` è
// mezzanotte UTC, che fa scivolare il giorno a ogni conversione. Le date
// entrano ed escono come stringhe; `Date` serve solo dentro, in UTC, come
// contatore di giorni.

import type { AnnoScolastico, Iso, Istante, Ora, Semestre } from './models.js'
import { testi } from './dates.testi.js'

// Giorni e mesi sono funzioni e non costanti: si leggono nella lingua attuale
// (`dates.testi.ts`), non in quella dell'avvio.

/** I giorni in tre lettere, da lunedì: «lun», «Mo», «Mon». */
export function giorniBrevi (): readonly string[] {
  return testi().giorniBrevi
}

/** I giorni per intero, da lunedì. */
export function giorniLunghi (): readonly string[] {
  return testi().giorniLunghi
}

/** I mesi, da gennaio. */
export function mesi (): readonly string[] {
  return testi().mesi
}

/** La sigla dell'unità didattica dopo un numero: «UD», «Lekt.», «pér.». */
export function siglaUd (): string {
  return testi().ud
}

/** L'iniziale del giorno della settimana, come sui calendari appesi al muro. */
export function inizialiGiorno (): readonly string[] {
  return testi().inizialiGiorno
}

/** Un giorno in millisecondi: il passo del contatore di giorni. */
export const GIORNO_MS = 86_400_000

function due (n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function aIso (data: Date): Iso {
  return `${data.getUTCFullYear()}-${due(data.getUTCMonth() + 1)}-${due(data.getUTCDate())}`
}

export function daIso (iso: Iso): Date {
  return new Date(`${iso}T00:00:00Z`)
}

/** Vero se la stringa ha la forma 'AAAA-MM-GG' ed è un giorno esistente. */
export function isoValida (valore: unknown): valore is Iso {
  if (typeof valore !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valore)) return false
  const data = new Date(`${valore}T00:00:00Z`)
  return !Number.isNaN(data.getTime()) && aIso(data) === valore
}

/** Vero se la stringa ha la forma 'HH:MM' su 24 ore. */
export function oraValida (valore: unknown): valore is Ora {
  return typeof valore === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(valore)
}

/** Oggi secondo l'orologio locale, non secondo UTC: a mezzanotte cambia qui. */
export function oggi (): Iso {
  const ora = new Date()
  return `${ora.getFullYear()}-${due(ora.getMonth() + 1)}-${due(ora.getDate())}`
}

/** L'ora del momento, sull'orologio di chi guarda. */
export function adesso (): Ora {
  const ora = new Date()
  return `${due(ora.getHours())}:${due(ora.getMinutes())}`
}

/** L'istante di adesso, completo: è quel che si scrive nei timbri di creazione e modifica. */
export function istanteAdesso (): Istante {
  return new Date().toISOString()
}

/**
 * Il giorno di un istante completo sull'orologio locale, come `oggi()`, o null
 * se non è un istante. I primi dieci caratteri sarebbero il giorno UTC (un
 * invio alle 00:40 del 15 risulterebbe del 14). Una data senza ora resta com'è.
 */
export function giornoDi (istante: string | null | undefined): Iso | null {
  const testo = istante ?? ''
  const giorno = testo.slice(0, 10)
  if (!isoValida(giorno)) return null
  if (testo.length === 10) return giorno
  const data = new Date(testo)
  if (Number.isNaN(data.getTime())) return giorno
  return `${data.getFullYear()}-${due(data.getMonth() + 1)}-${due(data.getDate())}`
}

export function sommaGiorni (iso: Iso, giorni: number): Iso {
  return aIso(new Date(daIso(iso).getTime() + giorni * GIORNO_MS))
}

export function sommaMesi (iso: Iso, mesi: number): Iso {
  const data = daIso(iso)
  const giorno = data.getUTCDate()
  data.setUTCDate(1)
  data.setUTCMonth(data.getUTCMonth() + mesi)
  // 31 gennaio + 1 mese non esiste: si tiene l'ultimo giorno del mese.
  const ultimo = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0)).getUTCDate()
  data.setUTCDate(Math.min(giorno, ultimo))
  return aIso(data)
}

export function differenzaGiorni (da: Iso, a: Iso): number {
  return Math.round((daIso(a).getTime() - daIso(da).getTime()) / GIORNO_MS)
}

/** Giorno della settimana con 1 = lunedì … 7 = domenica (ISO 8601). */
export function giornoSettimana (iso: Iso): number {
  return daIso(iso).getUTCDay() || 7
}

/** Il lunedì della settimana che contiene la data. */
export function inizioSettimana (iso: Iso): Iso {
  return sommaGiorni(iso, 1 - giornoSettimana(iso))
}

/** I sette giorni della settimana, da lunedì. */
export function settimanaDi (iso: Iso): Iso[] {
  const lunedi = inizioSettimana(iso)
  return Array.from({ length: 7 }, (_, i) => sommaGiorni(lunedi, i))
}

/** Numero di settimana ISO 8601, quello con cui i piani annuali si contano. */
export function settimanaIso (iso: Iso): number {
  const data = daIso(iso)
  // Il giovedì della stessa settimana decide a quale anno appartiene.
  data.setUTCDate(data.getUTCDate() + 4 - (data.getUTCDay() || 7))
  const capodanno = new Date(Date.UTC(data.getUTCFullYear(), 0, 1))
  return Math.ceil(((data.getTime() - capodanno.getTime()) / GIORNO_MS + 1) / 7)
}

export function primoDelMese (iso: Iso): Iso {
  return `${iso.slice(0, 7)}-01`
}

export function ultimoDelMese (iso: Iso): Iso {
  const data = daIso(iso)
  return aIso(new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0)))
}

/**
 * La griglia del mese: sempre settimane intere da lunedì, comprese le code del
 * mese precedente e del successivo, così le celle formano un rettangolo.
 */
export function grigliaMese (iso: Iso): Iso[] {
  const fine = ultimoDelMese(iso)
  const celle: Iso[] = []
  let corrente = inizioSettimana(primoDelMese(iso))
  while (corrente <= fine || celle.length % 7 !== 0) {
    celle.push(corrente)
    corrente = sommaGiorni(corrente, 1)
    if (celle.length >= 42) break
  }
  return celle
}

export function nelPeriodo (iso: Iso, da: Iso, a: Iso): boolean {
  return iso >= da && iso <= a
}

/**
 * Il numero di un semestre come si scrive, «1°», «2°»: dalla cifra
 * nell'etichetta scritta dal docente, altrimenti dal campo `numero`.
 */
export function numeroSemestre (semestre: Semestre): string {
  return `${semestre.etichetta.trim().match(/^(\d)/)?.[1] ?? semestre.numero}°`
}

export function semestreDi (anno: AnnoScolastico, iso: Iso): Semestre | null {
  return anno.semestri.find((s) => nelPeriodo(iso, s.inizio, s.fine)) ?? null
}

/**
 * Vero per un giorno dentro il semestre, o per qualunque giorno se il semestre
 * non c'è: senza semestre il periodo è l'anno intero.
 */
export function nelSemestre (semestre: Semestre | null, iso: Iso): boolean {
  return !semestre || nelPeriodo(iso, semestre.inizio, semestre.fine)
}

/** Come si chiama un periodo nelle testate: il semestre, o l'anno intero. */
export function etichettaSemestre (semestre: Semestre | null | undefined): string {
  return semestre?.etichetta ?? testi().annoIntero
}

// ------------------------------------------------------------------ ore

export function minutiDaOra (ora: Ora): number {
  const [h, m] = ora.split(':')
  return Number(h) * 60 + Number(m)
}

export function oraDaMinuti (minuti: number): Ora {
  const normalizzati = ((minuti % 1440) + 1440) % 1440
  return `${due(Math.floor(normalizzati / 60))}:${due(normalizzati % 60)}`
}

export function sommaMinuti (ora: Ora, minuti: number): Ora {
  return oraDaMinuti(minutiDaOra(ora) + minuti)
}

/** Durata in minuti; se la fine precede l'inizio la durata è zero, non negativa. */
export function durataMinuti (inizio: Ora, fine: Ora): number {
  return Math.max(0, minutiDaOra(fine) - minutiDaOra(inizio))
}

// ------------------------------------------------------------------ unità didattiche

/**
 * L'unità didattica: quanto dura lo decide la scuola (`Impostazioni.minutiUd`).
 * Un'ora di lezione ne è sempre un multiplo, e l'orario si dichiara in UD; i
 * minuti restano il formato salvato e l'unità delle pause.
 *
 * Le funzioni qui sotto vogliono la durata dell'UD come argomento, senza
 * predefinito: un conto sui 45 minuti di fabbrica in un documento da 50
 * sbaglierebbe, e così il compilatore non la lascia dimenticare.
 */
export const LIMITI_UD = {
  /** Quanto dura un'UD in un documento che non l'ha mai dichiarata. */
  predefinita: 45,
  minimo: 20,
  massimo: 120,
} as const

export function minutiDaUd (ud: number, minutiUd: number): number {
  return Math.max(1, Math.round(ud)) * minutiUd
}

/** I quarti di UD, detti come si dicono a voce. */
const QUARTI = ['', '¼', '½', '¾']

/**
 * Una durata portata al quarto di UD più vicino, mai sotto un quarto: la grana
 * con cui si pianifica davvero.
 */
export function udArrotondate (ud: number): number {
  return Math.max(0.25, Math.round(ud * 4) / 4)
}

/** Una durata in UD scritta come la si dice: «½ UD», «1 UD», «1¼ UD». */
export function formattaUd (ud: number): string {
  const quarti = Math.round(udArrotondate(ud) * 4)
  const intere = Math.floor(quarti / 4)
  const resto = quarti % 4
  const testo = `${intere > 0 ? intere : ''}${QUARTI[resto]}` || '0'
  return `${testo} ${testi().ud}`
}

/** Quante UD sono una durata: almeno una, arrotondata alla più vicina. */
export function udDaMinuti (minuti: number, minutiUd: number): number {
  return Math.max(1, Math.round(minuti / minutiUd))
}

/** La durata portata al multiplo di UD più vicino. */
export function minutiInUd (minuti: number, minutiUd: number): number {
  return minutiDaUd(udDaMinuti(minuti, minutiUd), minutiUd)
}

// ------------------------------------------------------------------ formattazione

/**
 * Una data come la si legge: '15.09.2025' (breve), 'lunedì 15 settembre 2025'
 * (lungo), 'lun 15' (giorno), '15.09' (corto, dove l'anno è già scritto
 * altrove). Una stringa che non è una data esce come un trattino, non come
 * «NaN.NaN.NaN».
 */
export function formattaData (
  iso: Iso,
  stile: 'breve' | 'lungo' | 'giorno' | 'corto' = 'breve',
): string {
  if (!isoValida(iso)) return '—'
  const data = daIso(iso)
  const giorno = data.getUTCDate()
  const mese = data.getUTCMonth()
  const anno = data.getUTCFullYear()
  if (stile === 'lungo') {
    return testi().dataLunga(giorniLunghi()[giornoSettimana(iso) - 1], giorno, mesi()[mese], anno)
  }
  if (stile === 'giorno') return `${giorniBrevi()[giornoSettimana(iso) - 1]} ${giorno}`
  if (stile === 'corto') return `${due(giorno)}.${due(mese + 1)}`
  return `${due(giorno)}.${due(mese + 1)}.${anno}`
}

/**
 * Una data dentro un nome di file: '260904'. Anno, mese, giorno senza
 * separatori: i file si ordinano per data e il nome resta corto. Quel che non
 * è una data dà stringa vuota.
 */
export function dataNelNome (iso: Iso): string {
  if (!isoValida(iso)) return ''
  return `${iso.slice(2, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}`
}

/**
 * Un'ora dentro un nome di file: '08.20'. I due punti Windows non li accetta,
 * e un trattino sembrerebbe un intervallo. Distingue due fogli dello stesso
 * giorno. Quel che non è un'ora dà stringa vuota.
 */
export function oraNelNome (ora: Ora | null | undefined): string {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(ora ?? '') ? (ora as Ora).replace(':', '.') : ''
}

/**
 * Giorno e ora di un istante dentro un nome di file, '260914 09.42',
 * sull'orologio di chi guarda e non in UTC.
 */
export function istanteNelNome (istante: Date = new Date()): string {
  const giorno = `${due(istante.getFullYear() % 100)}${due(istante.getMonth() + 1)}${due(istante.getDate())}`
  return `${giorno} ${due(istante.getHours())}.${due(istante.getMinutes())}.${due(istante.getSeconds())}`
}

/**
 * La data che un nome di file porta con sé (`..._260912.pdf`), o `null`:
 * l'inverso di `dataNelNome`. Il secolo è sempre il Duemila.
 */
export function dataDalNome (nome: string): Iso | null {
  const trovato = /_(\d{2})(\d{2})(\d{2})(?:\.[a-z0-9]+)?$/.exec(nome)
  if (!trovato) return null
  const iso = `20${trovato[1]}-${trovato[2]}-${trovato[3]}`
  return isoValida(iso) ? iso : null
}

/**
 * Il periodo dentro un nome di file: '260824-260904'. Distingue documenti che
 * si ripetono nel tempo (la richiesta di firma di settembre e di gennaio), che
 * altrimenti si sovrascriverebbero. Un giorno solo si scrive una volta; quel
 * che non è una data resta fuori.
 */
export function periodoNelNome (dal: Iso, al: Iso = dal): string {
  const inizio = dataNelNome(dal)
  const fine = dataNelNome(al)
  if (!inizio || !fine || inizio === fine) return inizio || fine
  return `${inizio}-${fine}`
}

/** Il giorno del mese di una data, come numero: serve alle celle del calendario. */
export function giornoDelMese (iso: Iso): number {
  return Number(iso.slice(8, 10))
}

export function formattaMese (iso: Iso): string {
  const data = daIso(iso)
  return `${mesi()[data.getUTCMonth()]} ${data.getUTCFullYear()}`
}

/** '1h 30' oppure '45 min': come lo si direbbe a voce. */
export function formattaDurata (minuti: number): string {
  // testo-fisso: «min» e «h» sono simboli di misura, uguali in tutte e quattro le lingue
  if (minuti < 60) return `${minuti} min`
  const ore = Math.floor(minuti / 60)
  const resto = minuti % 60
  return resto === 0 ? `${ore}h` : `${ore}h ${due(resto)}`
}

/**
 * L'etichetta di un anno scolastico a partire dalla data d'inizio: da agosto in
 * poi l'anno è quello che comincia, prima è quello che sta finendo.
 */
export function etichettaAnno (inizio: Iso): string {
  const primo = primoAnnoScolastico(inizio)
  return `${primo}/${primo + 1}`
}

/**
 * L'anno solare in cui comincia l'anno scolastico di un giorno: da agosto in
 * poi è quello del giorno, prima è quello precedente.
 */
export function primoAnnoScolastico (iso: Iso): number {
  const data = daIso(iso)
  const anno = data.getUTCFullYear()
  return data.getUTCMonth() >= 7 ? anno : anno - 1
}

// ------------------------------------------------------------------ scrivere una data

/**
 * Una data scritta a mano, letta come la si scrive su un foglio.
 *
 * Che cosa si accetta:
 *   `2026-09-07`      la forma in cui il registro le tiene
 *   `7.9.2026`  `7/9/2026`  `7-9-2026`  `7 9 2026`
 *   `7.9.26`          due cifre d'anno: sono gli anni Duemila
 *   `7.9`             senza anno: quello del `riferimento`, o di oggi
 *   `7`               solo il giorno: mese e anno del `riferimento`
 *   `07092026`  `070926`   scritte di seguito, come su un modulo
 *
 * `riferimento` è la data che il campo aveva prima (`12` su un campo al 7
 * settembre è il 12 settembre). Null per quel che non è una data; un 31 aprile
 * non scivola al 1° maggio.
 */
export function dataDaTesto (valore: string, riferimento?: Iso): Iso | null {
  const pulito = valore.trim()
  if (!pulito) return null
  if (isoValida(pulito)) return pulito

  const base = riferimento && isoValida(riferimento) ? riferimento : oggi()
  const pezzi = numeriDi(pulito, base)
  if (!pezzi) return null

  const [giorno, mese, anno] = pezzi
  if (mese < 1 || mese > 12 || giorno < 1 || giorno > 31) return null

  const iso = `${String(anno).padStart(4, '0')}-${due(mese)}-${due(giorno)}`
  // Andata e ritorno da `Date`: se torna un'altra data, quella scritta non esiste.
  return aIso(daIso(iso)) === iso ? iso : null
}

/** Giorno, mese e anno da quel che è stato scritto, completando dal riferimento. */
function numeriDi (pulito: string, base: Iso): [number, number, number] | null {
  const annoBase = Number(base.slice(0, 4))
  const meseBase = Number(base.slice(5, 7))

  // Tutte cifre di fila, come le si batte su un modulo: 7 → il giorno;
  // 0709 → giorno e mese; 070926 e 07092026 → tutto.
  if (/^\d+$/.test(pulito)) {
    const cifre = pulito
    if (cifre.length <= 2) return [Number(cifre), meseBase, annoBase]
    if (cifre.length === 4) return [Number(cifre.slice(0, 2)), Number(cifre.slice(2, 4)), annoBase]
    if (cifre.length === 6) {
      return [
        Number(cifre.slice(0, 2)),
        Number(cifre.slice(2, 4)),
        conSecolo(Number(cifre.slice(4, 6))),
      ]
    }
    if (cifre.length === 8) {
      return [
        Number(cifre.slice(0, 2)),
        Number(cifre.slice(2, 4)),
        Number(cifre.slice(4, 8)),
      ]
    }
    return null
  }

  const parti = pulito.split(/[.,/\-\s]+/).filter(Boolean)
  if (parti.length === 0 || parti.length > 3) return null
  if (parti.some((parte) => !/^\d{1,4}$/.test(parte))) return null

  const numeri = parti.map(Number)
  if (numeri.length === 1) return [numeri[0], meseBase, annoBase]
  if (numeri.length === 2) return [numeri[0], numeri[1], annoBase]
  return [numeri[0], numeri[1], parti[2].length <= 2 ? conSecolo(numeri[2]) : numeri[2]]
}

/** Due cifre d'anno sono gli anni Duemila: un registro scolastico non guarda indietro. */
function conSecolo (anno: number): number {
  return anno < 100 ? 2000 + anno : anno
}

/**
 * La stessa data spostata di un giorno o di un mese: le frecce dentro un
 * campo data.
 */
export function spostaData (iso: Iso, giorni: number, mesi = 0): Iso {
  if (!isoValida(iso)) return iso
  return mesi === 0 ? sommaGiorni(iso, giorni) : sommaMesi(iso, mesi)
}
