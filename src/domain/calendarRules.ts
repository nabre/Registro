// A quale corso appartiene un evento del calendario (seconda parte, vedi
// `calendar.ts`). Prove in ordine: regole scritte da chi insegna, nome della
// classe nel titolo, orario ricorrente, lezione già a calendario alla stessa
// ora. Due risposte valgono come nessuna.

import { fineLezione, inizioLezione } from './calculations.js'
import type { EventoCalendario } from './calendarIcs.js'
import { classeDelCorso, corsiDellAnno, materiaDelCorso } from './courses.js'
import { giornoSettimana, minutiDaOra } from './dates.js'
import type { Corso, Lezione, Ora, RegolaCalendario, Registro, Ricorrenza } from './models.js'
import { contieneParola, normalizzaTesto } from './text.js'

// ------------------------------------------------------------------ abbinamento

/** Perché un evento è stato attribuito a quel corso. */
export type ViaAbbinamento = 'regola' | 'nome' | 'orario' | 'sovrapposizione'

interface Abbinamento {
  corsoId: string | null
  via: ViaAbbinamento | null
  /** Una regola dice che non è una lezione. */
  ignorato: boolean
  /**
   * La regola che ha deciso, quando `via` è `regola`: confronto e collegamenti
   * la usano per unire eventi vicini senza ricalcolarla.
   */
  regolaId: string | null
}

/**
 * Con che cosa un evento è stato abbinato: la regola, o altrimenti il titolo.
 * Due eventi vicini con la stessa dicitura sono la stessa lezione; con una
 * regola conta la regola, perché il gestionale può scrivere diversi i titoli
 * delle due metà di un blocco.
 */
export function dicituraDi (evento: EventoCalendario, abbinamento: Abbinamento): string {
  return abbinamento.regolaId !== null
    ? `regola:${abbinamento.regolaId}` // testo-fisso: chiave interna di confronto
    : `titolo:${normalizzaTesto(evento.titolo)}` // testo-fisso: chiave interna di confronto
}

/** Il testo dell'evento in cui cercano le regole e i nomi. */
function testoEvento (evento: EventoCalendario): string {
  return normalizzaTesto(`${evento.titolo} ${evento.luogo}`)
}

/*
 * Come si scrive una regola. I gestionali compongono i titoli in ordine
 * variabile, quindi una regola non è una frase da ritrovare tale e quale:
 *
 * - **parole in qualsiasi ordine**: `CAD DIC1b` vale se ci sono tutte e due;
 * - **varianti** separate da `|`: `DIC1a | DIC1b` vale se ne vale una;
 * - **prefisso** con `*` in fondo: `DIC1*` prende DIC1a e DIC1b;
 * - **espressione regolare** fra barre, `/DIC1[ab]/`, su titolo e luogo come
 *   sono scritti.
 *
 * Senza badare a maiuscole; fuori dalle regex anche ad accenti e
 * punteggiatura (`dis_cg1a` = `Dis CG1a`).
 */

/** Una parola di una regola: intera, o l'inizio di una parola dell'evento. */
interface ParolaRegola {
  parola: string
  prefisso: boolean
}

/** Una regola pronta per il confronto: quanto dice, se vale per quell'evento. */
interface Criterio {
  /** Quanto pesa, se vale: vince la regola che dice di più (vedi `PAROLA`). Zero se non vale. */
  peso: (evento: EventoCalendario, parole: ReadonlySet<string>) => number
}

/**
 * Quanto vale una parola nel decidere quale regola è più specifica: contano
 * prima le parole, poi le lettere. Un prefisso vale metà di una parola; una
 * regex quanto una parola più la sua lunghezza.
 */
const PAROLA = 1000

/** Le parole di una variante, pronte: `Dis_CG1a DIC1*` → dis, cg1a, dic1…. */
function paroleDi (variante: string): ParolaRegola[] {
  return variante
    .split(/\s+/)
    .flatMap((pezzo) => {
      const prefisso = pezzo.endsWith('*')
      const parole = normalizzaTesto(pezzo.replace(/\*+$/, '')).split(' ').filter(Boolean)
      // In «Dis_CG1a*» il prefisso è l'ultimo pezzo, non tutti e due.
      return parole.map((parola, i) => ({ parola, prefisso: prefisso && i === parole.length - 1 }))
    })
}

/**
 * Il testo di una regola, letto. `null` se non dice niente — vuoto, o una
 * regex che non si compila: una regola rotta non abbina, e non ferma le altre.
 */
export function criterioRegola (testo: string): Criterio | null {
  const scritto = testo.trim()
  const regex = /^\/(.+)\/$/s.exec(scritto)
  if (regex) {
    let espressione: RegExp
    try {
      espressione = new RegExp(regex[1], 'iu')
    } catch {
      return null
    }
    const peso = PAROLA + regex[1].length
    return { peso: (evento) => (espressione.test(`${evento.titolo} ${evento.luogo}`) ? peso : 0) }
  }
  const varianti = scritto.split('|').map(paroleDi).filter((v) => v.length > 0)
  if (varianti.length === 0) return null
  return {
    peso: (_evento, parole) => {
      let meglio = 0
      for (const variante of varianti) {
        const tutte = variante.every(({ parola, prefisso }) =>
          prefisso ? [...parole].some((p) => p.startsWith(parola)) : parole.has(parola))
        if (!tutte) continue
        const peso = variante.reduce(
          (somma, p) => somma + (p.prefisso ? PAROLA / 2 : PAROLA) + p.parola.length,
          0,
        )
        meglio = Math.max(meglio, peso)
      }
      return meglio
    },
  }
}

/** Una regola con il suo testo già letto: si legge una volta, non una per evento. */
interface RegolaLetta {
  regola: RegolaCalendario
  criterio: Criterio | null
}

function leggiRegole (regole: readonly RegolaCalendario[]): RegolaLetta[] {
  return regole.map((regola) => ({ regola, criterio: criterioRegola(regola.testo) }))
}

/**
 * La regola che vale per quell'evento: la più specifica fra quelle che
 * valgono («DIC4a CP» batte «DIC4a»).
 */
function regolaPer (
  evento: EventoCalendario,
  lette: readonly RegolaLetta[],
): RegolaCalendario | null {
  const parole = new Set(testoEvento(evento).split(' ').filter(Boolean))
  let scelta: RegolaCalendario | null = null
  let meglio = 0
  for (const { regola, criterio } of lette) {
    const peso = criterio?.peso(evento, parole) ?? 0
    if (peso > meglio) {
      scelta = regola
      meglio = peso
    }
  }
  return scelta
}

/** Che effetto ha una regola sugli eventi del calendario. */
export interface ConteggioRegola {
  /** Gli eventi che la regola riconosce, anche quelli che un'altra le porta via. */
  abbinabili: number
  /** Gli eventi che decide lei: fra quelle che li riconoscono, è la più specifica. */
  abbinati: number
  /** Falso per una regola che non dice niente, o una regex che non si compila. */
  valida: boolean
}

/**
 * Per ogni regola, quanti eventi riconosce e quanti ne decide. Zero
 * riconosciuti è una regola scritta male; riconosciuti senza decisi è una
 * regola coperta da una più specifica. Ogni occorrenza conta per una.
 */
export function contaRegole (
  eventi: readonly EventoCalendario[],
  regole: readonly RegolaCalendario[],
): Map<string, ConteggioRegola> {
  const criteri = leggiRegole(regole)
  const conti = new Map<string, ConteggioRegola>(criteri.map(({ regola, criterio }) => [
    regola.id,
    { abbinabili: 0, abbinati: 0, valida: criterio !== null },
  ]))
  for (const evento of eventi) {
    const parole = new Set(testoEvento(evento).split(' ').filter(Boolean))
    let vincitrice: string | null = null
    let meglio = 0
    for (const { regola, criterio } of criteri) {
      const peso = criterio?.peso(evento, parole) ?? 0
      if (peso === 0) continue
      const conto = conti.get(regola.id)
      if (conto) conto.abbinabili += 1
      // Lo stesso criterio di `regolaPer`: a pari peso resta la prima.
      if (peso > meglio) {
        vincitrice = regola.id
        meglio = peso
      }
    }
    const conto = vincitrice ? conti.get(vincitrice) : undefined
    if (conto) conto.abbinati += 1
  }
  return conti
}

export function sovrappostiMinuti (aDa: Ora, aA: Ora, bDa: Ora, bA: Ora): number {
  const fine = Math.min(minutiDaOra(aA), minutiDaOra(bA))
  return Math.max(0, fine - Math.max(minutiDaOra(aDa), minutiDaOra(bDa)))
}

/** Chi abbina gli eventi di un registro, con le regole e i corsi già preparati. */
type Abbinatore = (evento: EventoCalendario) => Abbinamento

/**
 * A quale corso appartiene un evento: la prima prova (vedi testa del file)
 * che risponde con un corso solo decide; la materia sceglie fra i corsi della
 * stessa classe. Per molti eventi c'è `abbinatore`.
 */
export function abbina (
  registro: Registro,
  evento: EventoCalendario,
  regole: readonly RegolaCalendario[],
  corsi: readonly Corso[],
): Abbinamento {
  return abbinatore(registro, regole, corsi)(evento)
}

/**
 * `abbina` preparato per molti eventi: regole, nomi e lezioni per corso e
 * giorno si preparano una volta (o si prendono da `perGiorno`, chiave
 * `corsoId|data`). Stessa risposta di `abbina`.
 */
export function abbinatore (
  registro: Registro,
  regole: readonly RegolaCalendario[],
  corsi: readonly Corso[],
  perGiorno?: ReadonlyMap<string, readonly Lezione[]>,
): Abbinatore {
  const lette = leggiRegole(regole)
  const idCorsi = new Set(corsi.map((c) => c.id))
  const nomi = corsi.map((corso) => {
    const classe = classeDelCorso(registro, corso)
    const materia = materiaDelCorso(registro, corso)
    return {
      corso,
      classe: classe ? normalizzaTesto(classe.nome) : null,
      materia: [materia?.nome ?? '', materia?.sigla ?? ''].map(normalizzaTesto).filter(Boolean),
    }
  })
  // Raccolte solo se qualche evento arriva fino all'ultima prova.
  let lezioni: ReadonlyMap<string, readonly Lezione[]> | null = perGiorno ?? null
  const lezioniDi = (corsoId: string, data: string): readonly Lezione[] => {
    if (!lezioni) {
      const mappa = new Map<string, Lezione[]>()
      for (const l of registro.lezioni) {
        if (!idCorsi.has(l.corsoId)) continue
        const chiave = `${l.corsoId}|${l.data}`
        const gruppo = mappa.get(chiave)
        if (gruppo) gruppo.push(l)
        else mappa.set(chiave, [l])
      }
      lezioni = mappa
    }
    return lezioni.get(`${corsoId}|${data}`) ?? []
  }

  return (evento) => {
    const testo = testoEvento(evento)
    const regola = regolaPer(evento, lette)
    if (regola) {
      const valido = regola.corsoId && idCorsi.has(regola.corsoId)
      if (regola.corsoId === null) return { corsoId: null, via: 'regola', ignorato: true, regolaId: regola.id }
      if (valido) return { corsoId: regola.corsoId, via: 'regola', ignorato: false, regolaId: regola.id }
    }

    const perNome = nomi
      .map(({ corso, classe, materia }) => {
        if (classe === null) return { corso, punti: 0 }
        if (!contieneParola(testo, classe)) return { corso, punti: 0 }
        return { corso, punti: materia.some((n) => contieneParola(testo, n)) ? 2 : 1 }
      })
      .filter((v) => v.punti > 0)
    const migliore = Math.max(0, ...perNome.map((v) => v.punti))
    const primi = perNome.filter((v) => v.punti === migliore)
    if (primi.length === 1) return { corsoId: primi[0].corso.id, via: 'nome', ignorato: false, regolaId: null }

    // Fra i corsi che il nome ha lasciato in gara, se ce n'erano; se no fra tutti.
    const inGara = primi.length > 1 ? primi.map((v) => v.corso) : corsi
    const perOrario = inGara.filter((corso) => ricorrenzaCheCominciaLi(corso, evento) !== null)
    if (perOrario.length === 1) {
      return { corsoId: perOrario[0].id, via: 'orario', ignorato: false, regolaId: null }
    }

    // Le lezioni dei corsi in gara quel giorno, senza rileggere il registro.
    const occupate = new Set<string>()
    for (const corso of inGara) {
      for (const l of lezioniDi(corso.id, evento.data)) {
        const da = inizioLezione(l)
        const a = fineLezione(l)
        if (!da || !a) continue
        if (sovrappostiMinuti(da, a, evento.inizio, evento.fine) > 0) occupate.add(l.corsoId)
      }
    }
    if (occupate.size === 1) {
      return { corsoId: [...occupate][0], via: 'sovrapposizione', ignorato: false, regolaId: null }
    }

    return { corsoId: null, via: null, ignorato: false, regolaId: null }
  }
}

/**
 * La fascia dell'orario ricorrente del corso che comincia all'ora
 * dell'evento, quel giorno della settimana e nel suo periodo; `null` se non
 * ce n'è una. È la prova «orario» di `abbina`.
 */
export function ricorrenzaCheCominciaLi (
  corso: Corso,
  evento: EventoCalendario,
): Ricorrenza | null {
  const giorno = giornoSettimana(evento.data)
  return corso.orario.find((r) =>
    r.giorno === giorno && r.inizio === evento.inizio &&
    (!r.dal || evento.data >= r.dal) && (!r.al || evento.data <= r.al)) ?? null
}

/** Una regola da salvare: senza `id` è nuova, e il gestore gliene dà uno. */
type RegolaDaSalvare = Omit<RegolaCalendario, 'id'> & { id?: string }

/**
 * Le regole con dentro la scelta fatta su un evento, o `null` se una regola
 * già la dice. Nome della classe e orario non bastano: sono indizi che possono
 * cambiare. Una regola con lo stesso testo si sostituisce.
 */
export function regoleConScelta (
  registro: Registro,
  evento: EventoCalendario,
  regole: readonly RegolaCalendario[],
  testo: string,
  corsoId: string | null,
): RegolaDaSalvare[] | null {
  const pulito = testo.trim()
  if (!pulito) return null
  const ora = abbina(registro, evento, regole, corsiConfrontabili(registro))
  if (ora.via === 'regola' && (corsoId === null ? ora.ignorato : ora.corsoId === corsoId)) return null
  const chiave = pulito.toLowerCase()
  return [
    ...regole.filter((r) => r.testo.trim().toLowerCase() !== chiave),
    { testo: pulito, corsoId },
  ]
}

/** I corsi a cui un evento può appartenere: quelli dell'anno in uso, di classi vive. */
export function corsiConfrontabili (registro: Registro): Corso[] {
  return corsiDellAnno(registro, registro.annoCorrenteId).filter((c) => {
    const classe = classeDelCorso(registro, c)
    return classe !== null && !classe.archiviata
  })
}
