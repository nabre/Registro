// Il calendario ICS letto: dal testo del file agli eventi sull'orologio di chi
// insegna. Prima parte del calendario della scuola (vedi `calendar.ts`): niente
// corsi né lezioni. Scioglie le righe, converte i fusi, apre le ricorrenze con
// date escluse e occorrenze riscritte. Riceve il testo già letto da
// `data/calendar.ts`: niente rete né file.

import { GIORNO_MS, aIso, daIso, giornoSettimana, oraDaMinuti } from './dates.js'
import type { Iso, Ora } from './models.js'

// ------------------------------------------------------------------ lettura

/**
 * Un evento del calendario, all'ora di chi insegna. Gli eventi di un giorno
 * intero o a cavallo della mezzanotte (vacanze, gite) non arrivano qui: si
 * contano a parte.
 */
export interface EventoCalendario {
  /** Distingue le occorrenze di una ricorrenza: UID più il momento. */
  chiave: string
  data: Iso
  inizio: Ora
  fine: Ora
  titolo: string
  luogo: string
  /** `STATUS:CANCELLED`: l'ora c'era, e non si fa più. */
  annullato: boolean
}

export interface CalendarioLetto {
  eventi: EventoCalendario[]
  /** Giornate intere e eventi a cavallo di due giorni: non sono lezioni. */
  scartati: number
}

/** Una riga del file: nome, parametri, valore. */
interface Proprieta {
  nome: string
  parametri: Record<string, string>
  valore: string
}

/** Un evento come sta scritto, prima di aprirne le ricorrenze. */
interface EventoGrezzo {
  uid: string
  inizio: Proprieta | null
  fine: Proprieta | null
  durata: string
  regola: string
  eccezioni: Proprieta[]
  ricorrenzaDi: Proprieta | null
  titolo: string
  luogo: string
  annullato: boolean
}

/**
 * Un momento «da orologio a muro»: `Date.UTC` sui numeri letti, senza fuso.
 * L'aritmetica si fa qui, al riparo dall'ora legale; il fuso si converte una
 * volta sola, alla fine.
 */
type Muro = number

/**
 * Freno ai file malati. Si contano solo le occorrenze dal periodo chiesto in
 * avanti: una serie giornaliera di anni fa ne ha migliaia prima.
 */
const MASSIMO_OCCORRENZE = 3000

/** Le righe logiche: una riga che comincia con uno spazio continua la precedente. */
function righe (testo: string): string[] {
  // Il BOM che Blocco note mette in testa ai file UTF-8.
  const senzaSegno = testo.charCodeAt(0) === 0xfeff ? testo.slice(1) : testo
  return senzaSegno
    .replace(/\r\n?/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n')
    .filter((r) => r.trim() !== '')
}

/**
 * `DTSTART;TZID="Europe/Zurich":20250915T082000` in nome, parametri, valore.
 * Il valore comincia al primo «:» fuori dalle virgolette: i TZID di Outlook
 * come «(UTC+01:00) Amsterdam, Berlino» ne contengono altri.
 */
function leggiProprieta (riga: string): Proprieta | null {
  let tra = false
  let fine = -1
  for (let i = 0; i < riga.length; i += 1) {
    const c = riga[i]
    if (c === '"') tra = !tra
    else if (c === ':' && !tra) {
      fine = i
      break
    }
  }
  if (fine < 0) return null
  const [nome, ...pezzi] = riga.slice(0, fine).split(';')
  const parametri: Record<string, string> = {}
  for (const pezzo of pezzi) {
    const uguale = pezzo.indexOf('=')
    if (uguale < 0) continue
    parametri[pezzo.slice(0, uguale).toUpperCase()] = pezzo.slice(uguale + 1).replace(/^"|"$/g, '')
  }
  return { nome: (nome ?? '').toUpperCase(), parametri, valore: riga.slice(fine + 1) }
}

/** Il testo di un campo, con le sequenze di escape sciolte e su una riga. */
function testoIcs (valore: string): string {
  // Una passata sola: in `C:\nuovi` la barra protetta resta barra e la `n` lettera.
  return valore
    .replace(/\\([nN,;\\])/g, (_, c: string) => (c === 'n' || c === 'N' ? ' ' : c))
    .replace(/\s+/g, ' ')
    .trim()
}

function eventiGrezzi (testo: string): EventoGrezzo[] {
  const esito: EventoGrezzo[] = []
  let corrente: EventoGrezzo | null = null
  // I VALARM annidati hanno DESCRIPTION e TRIGGER propri: non sono dell'evento.
  let annidati = 0
  for (const riga of righe(testo)) {
    const p = leggiProprieta(riga)
    if (!p) continue
    const valore = p.valore.trim().toUpperCase()
    if (p.nome === 'BEGIN') {
      if (valore === 'VEVENT') {
        corrente = {
          uid: '', inizio: null, fine: null, durata: '', regola: '', eccezioni: [],
          ricorrenzaDi: null, titolo: '', luogo: '', annullato: false,
        }
        annidati = 0
      } else if (corrente) annidati += 1
      continue
    }
    if (p.nome === 'END') {
      if (valore === 'VEVENT' && corrente) {
        esito.push(corrente)
        corrente = null
      } else if (corrente && annidati > 0) annidati -= 1
      continue
    }
    if (!corrente || annidati > 0) continue
    switch (p.nome) {
      case 'UID': corrente.uid = p.valore.trim(); break
      case 'DTSTART': corrente.inizio = p; break
      case 'DTEND': corrente.fine = p; break
      case 'DURATION': corrente.durata = p.valore.trim(); break
      case 'RRULE': corrente.regola = p.valore.trim(); break
      case 'EXDATE': corrente.eccezioni.push(p); break
      case 'RECURRENCE-ID': corrente.ricorrenzaDi = p; break
      case 'SUMMARY': corrente.titolo = testoIcs(p.valore); break
      case 'LOCATION': corrente.luogo = testoIcs(p.valore); break
      case 'STATUS': corrente.annullato = valore === 'CANCELLED'; break
    }
  }
  return esito
}

// ------------------------------------------------------------------ fusi orari

const formattatori = new Map<string, Intl.DateTimeFormat | null>()

/** Il formattatore di un fuso, o null se il nome non è un fuso IANA. */
function formattatore (fuso: string): Intl.DateTimeFormat | null {
  if (!formattatori.has(fuso)) {
    try {
      formattatori.set(fuso, new Intl.DateTimeFormat('en-US', {
        timeZone: fuso,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }))
    } catch {
      formattatori.set(fuso, null)
    }
  }
  return formattatori.get(fuso) ?? null
}

/** Che ora segna l'orologio di quel fuso in quell'istante. */
function muroDa (istante: number, fuso: string): Muro {
  const f = formattatore(fuso)
  if (!f) return istante
  const parti: Record<string, number> = {}
  for (const parte of f.formatToParts(new Date(istante))) {
    if (parte.type !== 'literal') parti[parte.type] = Number(parte.value)
  }
  return Date.UTC(parti.year, parti.month - 1, parti.day, parti.hour, parti.minute, parti.second)
}

/**
 * L'istante in cui l'orologio di quel fuso segna quell'ora. Due passate: il
 * primo tentativo può cadere dall'altra parte del cambio d'ora.
 */
function istanteDa (muro: Muro, fuso: string): number {
  const primo = muro - (muroDa(muro, fuso) - muro)
  const scarto = muroDa(primo, fuso) - primo
  return muro - scarto
}

/** Il fuso di chi usa il programma, come lo dice il sistema. */
function fusoLocale (): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/** Un valore di data ICS, con il fuso in cui va letto. */
interface Momento {
  muro: Muro
  /** 'UTC', un fuso IANA, o '' quando l'ora è «flottante». */
  fuso: string
  giornata: boolean
}

function leggiMomento (valore: string, parametri: Record<string, string>): Momento | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(valore.trim())
  if (!m) return null
  const [, a, me, g, o, mi, s, z] = m
  const giornata = o === undefined
  const muro = Date.UTC(
    Number(a), Number(me) - 1, Number(g), Number(o ?? 0), Number(mi ?? 0), Number(s ?? 0),
  )
  if (Number.isNaN(muro)) return null
  // Un TZID non IANA (Outlook: «W. Europe Standard Time») si legge come l'ora
  // di chi insegna, che sta quasi sempre nello stesso fuso della scuola.
  const tz = parametri.TZID && formattatore(parametri.TZID) ? parametri.TZID : ''
  return { muro, fuso: z ? 'UTC' : tz, giornata }
}

/** Lo stesso momento sull'orologio del fuso di chi insegna. */
function sulMuroDi (momento: Momento, fuso: string): Muro {
  if (!momento.fuso || momento.fuso === fuso) return momento.muro
  const istante = momento.fuso === 'UTC' ? momento.muro : istanteDa(momento.muro, momento.fuso)
  return muroDa(istante, fuso)
}

/** `P1DT1H30M`, `PT45M`, `-PT5M` in millisecondi. */
function leggiDurata (valore: string): number {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(valore)
  if (!m) return 0
  const [, segno, w, d, h, mi, s] = m
  const ms = ((Number(w ?? 0) * 7 + Number(d ?? 0)) * 86400 + Number(h ?? 0) * 3600 +
    Number(mi ?? 0) * 60 + Number(s ?? 0)) * 1000
  return segno === '-' ? -ms : ms
}

// ------------------------------------------------------------------ ricorrenze

const GIORNI_ICS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

/**
 * Le occorrenze di una `RRULE`, sull'orologio del fuso dell'evento. Solo
 * `DAILY` e `WEEKLY` con `INTERVAL`, `COUNT`, `UNTIL`, `BYDAY`; di una regola
 * mensile o annuale (non è un orario) si tiene la prima occorrenza.
 */
function occorrenze (
  inizio: Momento,
  regola: string,
  dal: Muro,
  fino: Muro,
  fusoLettura: string,
): Muro[] {
  if (!regola) return [inizio.muro]
  const parti: Record<string, string> = {}
  for (const pezzo of regola.split(';')) {
    const [k, v] = pezzo.split('=')
    if (k && v !== undefined) parti[k.toUpperCase()] = v.toUpperCase()
  }
  const frequenza = parti.FREQ
  if (frequenza !== 'DAILY' && frequenza !== 'WEEKLY') return [inizio.muro]

  const passo = Math.max(1, Number(parti.INTERVAL ?? 1) || 1)
  const conta = parti.COUNT ? Math.max(0, Number(parti.COUNT) || 0) : Infinity
  let limite = fino
  if (parti.UNTIL) {
    const fine = leggiMomento(parti.UNTIL, {})
    if (fine) {
      // UNTIL in UTC si confronta sull'orologio dell'evento; una data sola vale
      // fino a fine giorno. Senza fuso IANA l'evento sta sull'orologio di chi
      // insegna, e lì va portato anche UNTIL.
      const fusoEvento = inizio.fuso || fusoLettura
      const muro = fine.fuso === 'UTC' && fusoEvento !== 'UTC'
        ? muroDa(fine.muro, fusoEvento)
        : fine.muro
      limite = Math.min(limite, fine.giornata ? muro + GIORNO_MS - 1 : muro)
    }
  }
  const giorni = (parti.BYDAY ?? '')
    .split(',')
    .map((g) => GIORNI_ICS.indexOf(g.replace(/^[+-]?\d+/, '')) + 1)
    .filter((g) => g > 0)

  const ora = inizio.muro % GIORNO_MS
  const primoGiorno = inizio.muro - ora
  const esito: Muro[] = []
  // COUNT conta dalla prima occorrenza; il freno solo quelle tenute.
  let contate = 0
  const aggiungi = (giorno: Muro): boolean => {
    const muro = giorno + ora
    if (muro < inizio.muro) return true
    if (muro > limite || contate >= conta || esito.length >= MASSIMO_OCCORRENZE) return false
    contate += 1
    if (muro >= dal) esito.push(muro)
    return true
  }

  if (frequenza === 'DAILY') {
    for (let g = primoGiorno; ; g += passo * GIORNO_MS) {
      if (giorni.length > 0 && !giorni.includes(giornoSettimana(aIso(new Date(g))))) {
        if (g + ora > limite) break
        continue
      }
      if (!aggiungi(g)) break
    }
    return esito
  }

  // Settimanale: dal lunedì della settimana dell'inizio, i giorni chiesti
  // (o quello dell'inizio).
  const scelti = giorni.length > 0
    ? [...new Set(giorni)].sort((a, b) => a - b)
    : [giornoSettimana(aIso(new Date(primoGiorno)))]
  const lunedi = primoGiorno - (giornoSettimana(aIso(new Date(primoGiorno))) - 1) * GIORNO_MS
  for (let settimana = lunedi; settimana + ora <= limite; settimana += passo * 7 * GIORNO_MS) {
    for (const g of scelti) {
      if (!aggiungi(settimana + (g - 1) * GIORNO_MS)) return esito
    }
  }
  return esito
}

function sulGiorno (muro: Muro): { data: Iso; ora: Ora } {
  const d = new Date(muro)
  return { data: aIso(d), ora: oraDaMinuti(d.getUTCHours() * 60 + d.getUTCMinutes()) }
}

/**
 * Gli eventi di un calendario ICS fra due date, sull'orologio di chi insegna.
 * Le date `EXDATE` si tolgono; un'occorrenza riscritta (stessa UID, con
 * `RECURRENCE-ID`) prende il posto di quella della regola.
 */
export function leggiCalendario (
  testo: string,
  dal: Iso,
  al: Iso,
  fuso: string = fusoLocale(),
): CalendarioLetto {
  const grezzi = eventiGrezzi(testo)
  const inizioPeriodo = daIso(dal).getTime()
  const finePeriodo = daIso(al).getTime() + GIORNO_MS - 1

  // Le occorrenze riscritte, per UID e momento originale sull'orologio locale.
  const riscritte = new Set<string>()
  for (const e of grezzi) {
    if (!e.ricorrenzaDi) continue
    const m = leggiMomento(e.ricorrenzaDi.valore, e.ricorrenzaDi.parametri)
    if (m) riscritte.add(`${e.uid}|${sulMuroDi(m, fuso)}`)
  }

  const eventi: EventoCalendario[] = []
  let scartati = 0
  for (const e of grezzi) {
    if (!e.inizio) continue
    const inizio = leggiMomento(e.inizio.valore, e.inizio.parametri)
    if (!inizio) continue
    if (inizio.giornata) {
      scartati += 1
      continue
    }
    const fineLetta = e.fine ? leggiMomento(e.fine.valore, e.fine.parametri) : null
    const durata = fineLetta
      ? sulMuroDi(fineLetta, inizio.fuso || fuso) - sulMuroDi(inizio, inizio.fuso || fuso)
      : leggiDurata(e.durata)
    if (!(durata > 0)) continue

    // `EXDATE;VALUE=DATE` su una serie con le ore toglie tutto quel giorno,
    // sull'orologio dell'evento.
    const escluse = new Set<Muro>()
    const giorniEsclusi = new Set<Iso>()
    for (const eccezione of e.eccezioni) {
      for (const valore of eccezione.valore.split(',')) {
        const m = leggiMomento(valore, eccezione.parametri)
        if (m?.giornata) giorniEsclusi.add(aIso(new Date(m.muro)))
        else if (m) escluse.add(sulMuroDi(m, fuso))
      }
    }

    // Un giorno di margine sul periodo: l'orologio dell'evento e quello di
    // chi insegna possono non segnare lo stesso giorno.
    const fino = e.ricorrenzaDi ? inizio.muro : finePeriodo + GIORNO_MS
    const muri = e.ricorrenzaDi
      ? [inizio.muro]
      : occorrenze(inizio, e.regola, inizioPeriodo - GIORNO_MS, fino, fuso)
    for (const muro of muri) {
      const locale = sulMuroDi({ ...inizio, muro }, fuso)
      const tolta = escluse.has(locale) || giorniEsclusi.has(aIso(new Date(muro))) ||
        riscritte.has(`${e.uid}|${locale}`)
      if (!e.ricorrenzaDi && tolta) continue
      if (locale < inizioPeriodo || locale > finePeriodo) continue
      const da = sulGiorno(locale)
      const a = sulGiorno(locale + durata)
      // Ventiquattro ore o più sono una giornata scritta con le ore o una gita:
      // non lezioni. Una fine a mezzanotte vale solo se è quella del giorno
      // dopo, e diventa 23:59.
      if (durata >= GIORNO_MS || (a.data !== da.data && a.ora !== '00:00')) {
        scartati += 1
        continue
      }
      eventi.push({
        chiave: `${e.uid || e.titolo}@${da.data}T${da.ora}`,
        data: da.data,
        inizio: da.ora,
        fine: a.data === da.data ? a.ora : '23:59',
        titolo: e.titolo,
        luogo: e.luogo,
        annullato: e.annullato,
      })
    }
  }
  eventi.sort((a, b) => a.data.localeCompare(b.data) || a.inizio.localeCompare(b.inizio))
  return { eventi, scartati }
}
