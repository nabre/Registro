// Aritmetica di calendario sulle stringhe 'AAAA-MM-GG'.
//
// Perché non `Date`: il registro ragiona per giorni, non per istanti. `new
// Date('2025-09-15')` è mezzanotte UTC, che a Zurigo è il 15 alle 02:00 — e a
// ogni conversione di ritorno il giorno può scivolare. Qui le date entrano ed
// escono come stringhe; `Date` compare solo dentro le funzioni, sempre in UTC,
// dove è solo un contatore di giorni.

import type { AnnoScolastico, Iso, Istante, Ora, Semestre } from './models.js'

export const GIORNI_BREVI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']
export const GIORNI_LUNGHI = [
  'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica',
]
export const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]

const GIORNO_MS = 86_400_000

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

/** Il giorno di un istante completo, o null se non è un istante: serve alle etichette. */
export function giornoDi (istante: string | null | undefined): Iso | null {
  const giorno = (istante ?? '').slice(0, 10)
  return isoValida(giorno) ? giorno : null
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
  // Ci si sposta al giovedì della stessa settimana: è il giorno che decide
  // a quale anno la settimana appartiene.
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
 * Il numero di un semestre come si scrive: «1°», «2°».
 *
 * Si legge dall'etichetta invece che dal campo `numero` perché l'etichetta è
 * quel che il docente ha scritto — «1° semestre», «2 sem» — e se lì c'è una
 * cifra è quella che si aspetta di rileggere. Il campo resta il ripiego per
 * un'etichetta che non comincia per numero.
 */
export function numeroSemestre (semestre: Semestre): string {
  return `${semestre.etichetta.trim().match(/^(\d)/)?.[1] ?? semestre.numero}°`
}

export function semestreDi (anno: AnnoScolastico, iso: Iso): Semestre | null {
  return anno.semestri.find((s) => nelPeriodo(iso, s.inizio, s.fine)) ?? null
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
 * L'unità didattica: quarantacinque minuti, sempre. Un'ora di lezione ne è
 * sempre un multiplo — un blocco di due ore sono quattro UD con la pausa in
 * mezzo — e per questo l'orario si dichiara in UD e non in minuti: si sa
 * quante se ne fanno, non si sa a mente che ore sono alla fine. La fine la
 * calcola il registro; i minuti restano il modo in cui il dato è salvato, e
 * restano l'unità delle pause, che multipli non sono.
 */
export const MINUTI_UD = 45

export function minutiDaUd (ud: number): number {
  return Math.max(1, Math.round(ud)) * MINUTI_UD
}

/** I quarti di UD, detti come si dicono a voce. */
const QUARTI = ['', '¼', '½', '¾']

/**
 * Una durata portata al quarto di UD più vicino, e mai sotto un quarto.
 *
 * Il quarto è la grana con cui si pianifica davvero: «un quarto d'ora di
 * ripasso, mezza unità di esercizi». Sotto non si scende — un'attività da due
 * minuti non è un'attività — e in mezzo non si sta: 0,37 UD non vuol dire
 * niente per nessuno, e scriverlo sarebbe una precisione finta.
 */
export function udArrotondate (ud: number): number {
  return Math.max(0.25, Math.round(ud * 4) / 4)
}

/**
 * Una durata in unità didattiche, scritta come la si dice: «½ UD», «1 UD»,
 * «1¼ UD». Il registro conta in UD e non in minuti perché è l'unità con cui si
 * insegna: quanto duri un'unità lo dice l'orario, e cambia da scuola a scuola.
 */
export function formattaUd (ud: number): string {
  const quarti = Math.round(udArrotondate(ud) * 4)
  const intere = Math.floor(quarti / 4)
  const resto = quarti % 4
  const testo = `${intere > 0 ? intere : ''}${QUARTI[resto]}` || '0'
  return `${testo} UD`
}

/** Quante UD sono una durata: almeno una, arrotondata alla più vicina. */
export function udDaMinuti (minuti: number): number {
  return Math.max(1, Math.round(minuti / MINUTI_UD))
}

/** La durata portata al multiplo di UD più vicino. */
export function minutiInUd (minuti: number): number {
  return minutiDaUd(udDaMinuti(minuti))
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
    return `${GIORNI_LUNGHI[giornoSettimana(iso) - 1]} ${giorno} ${MESI[mese]} ${anno}`
  }
  if (stile === 'giorno') return `${GIORNI_BREVI[giornoSettimana(iso) - 1]} ${giorno}`
  if (stile === 'corto') return `${due(giorno)}.${due(mese + 1)}`
  return `${due(giorno)}.${due(mese + 1)}.${anno}`
}

/**
 * Una data come si scrive dentro il nome di un file: '260904'.
 *
 * Anno, mese, giorno in quest'ordine e senza separatori: è l'unica forma che
 * mette i file in ordine di data quando il gestore li ordina per nome, ed è
 * corta abbastanza da stare in un nome che dice già classe, documento e
 * persona. La forma da leggere — '04.09.2026' — resta quella di
 * `formattaData`, e nei nomi non entra: lì i punti separano male e i quattro
 * numeri dell'anno davanti non servono a nessuno.
 *
 * Quel che data non è esce come stringa vuota: chi chiama la lascia fuori dal
 * nome invece di scriverci dentro un trattino appeso al nulla.
 */
export function dataNelNome (iso: Iso): string {
  if (!isoValida(iso)) return ''
  return `${iso.slice(2, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}`
}

/**
 * Un'ora come si scrive dentro il nome di un file: '08.20'.
 *
 * I due punti nei nomi di file non ci stanno — Windows non li accetta, e
 * `nomeSicuro` li trasformerebbe in un trattino, che in mezzo a una data è
 * una cosa che si legge come un intervallo. Il punto li sostituisce e non
 * confonde: `260907 08.20` è un giorno e un'ora, e si legge in un colpo.
 *
 * Serve a distinguere due fogli dello stesso giorno — due ore dello stesso
 * corso il lunedì — senza appiccicare al nome una sigla che non dice niente.
 * Quel che ora non è esce come stringa vuota, come per `dataNelNome`.
 */
export function oraNelNome (ora: Ora | null | undefined): string {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(ora ?? '') ? (ora as Ora).replace(':', '.') : ''
}

/**
 * Giorno e ora di un istante, come entrano in un nome di file: '260914 09.42'.
 *
 * Sull'orologio di chi guarda, non in UTC: è un nome che si legge, e un file
 * arrivato alle 09:42 non deve chiamarsi «07.42» perché il fuso l'ha spostato.
 */
export function istanteNelNome (istante: Date = new Date()): string {
  const giorno = `${due(istante.getFullYear() % 100)}${due(istante.getMonth() + 1)}${due(istante.getDate())}`
  return `${giorno} ${due(istante.getHours())}.${due(istante.getMinutes())}.${due(istante.getSeconds())}`
}

/**
 * La data che un nome di file porta con sé — `..._260912.pdf` — o `null`.
 *
 * È l'inverso di `dataNelNome`, e sta accanto a lei apposta: sono la stessa
 * regola letta nei due versi, e scritte in due file diverse si sarebbero
 * scostate al primo ripensamento sul formato. La legge la pagina Documenti, per
 * dire di che giorno è il fascicolo che sta nella cartella.
 *
 * Il secolo si dà per scontato: un registro di classe non archivia il 1926.
 */
export function dataDalNome (nome: string): Iso | null {
  const trovato = /_(\d{2})(\d{2})(\d{2})(?:\.[a-z0-9]+)?$/.exec(nome)
  if (!trovato) return null
  const iso = `20${trovato[1]}-${trovato[2]}-${trovato[3]}`
  return isoValida(iso) ? iso : null
}

/**
 * Il periodo come si scrive dentro il nome di un file: '260824-260904'.
 *
 * Serve a distinguere nel tempo quel che nel tempo si ripete. La richiesta di
 * firma di settembre e quella di gennaio parlano dello stesso allievo, della
 * stessa classe e della stessa cosa: senza le date si chiamano uguale, e la
 * seconda cancella la prima senza dire niente a nessuno.
 *
 * Un giorno solo si scrive una volta sola — '260903-260903' non dice niente di
 * più — e quel che data non è non entra nel nome: un trattino appeso al nulla
 * è peggio di un nome corto.
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
  return `${MESI[data.getUTCMonth()]} ${data.getUTCFullYear()}`
}

/** '1h 30' oppure '45 min': come lo si direbbe a voce. */
export function formattaDurata (minuti: number): string {
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
  const data = daIso(inizio)
  const anno = data.getUTCFullYear()
  return data.getUTCMonth() >= 7 ? `${anno}/${anno + 1}` : `${anno - 1}/${anno}`
}

// ------------------------------------------------------------------ scrivere una data

/**
 * Una data scritta a mano, letta come la si scrive davvero.
 *
 * Il campo data del pannello non è più quello del browser: quello chiede tre
 * caselle in un ordine che dipende dalla lingua dell'editor, e per scrivere il
 * 7 settembre bisogna azzeccare la casella giusta e battere gli zeri. Qui si
 * scrive come si scriverebbe su un foglio — `7.9`, `07.09.26`, `7/9/2026` — e
 * il registro capisce.
 *
 * Che cosa si accetta:
 *   `2026-09-07`      la forma in cui il registro le tiene
 *   `7.9.2026`  `7/9/2026`  `7-9-2026`  `7 9 2026`
 *   `7.9.26`          due cifre d'anno: sono gli anni Duemila
 *   `7.9`             senza anno: quello del `riferimento`, o di oggi
 *   `7`               solo il giorno: mese e anno del `riferimento`
 *   `07092026`  `070926`   scritte di seguito, come su un modulo
 *
 * `riferimento` è la data che il campo aveva prima: scrivendo `12` dentro un
 * campo che diceva 7 settembre si intende il 12 settembre, non il 12 gennaio.
 *
 * Torna null per quel che non è una data — «domani», `32.13.2026`, un campo
 * vuoto — e chi chiama decide se lamentarsi o lasciar perdere. Un 31 aprile
 * non diventa il 1° maggio: chi l'ha scritto voleva un altro giorno, e farlo
 * scivolare in silenzio è peggio che rifiutarlo.
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
  // Il giro dalla Date e ritorno è il solo modo onesto di sapere se il 30
  // febbraio esiste: se torna un'altra data, quella scritta non c'era.
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
 * La stessa data, spostata di un giorno o di un mese: è quel che fanno le
 * frecce dentro un campo data, e risparmia di riscrivere tutto per correggere
 * di uno.
 */
export function spostaData (iso: Iso, giorni: number, mesi = 0): Iso {
  if (!isoValida(iso)) return iso
  return mesi === 0 ? sommaGiorni(iso, giorni) : sommaMesi(iso, mesi)
}
