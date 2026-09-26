// Il calendario ICS della scuola messo a confronto con le lezioni del registro.
//
// Il confronto propone, non sincronizza: un evento mancante diventa una lezione
// da creare, uno spostato una lezione da allineare, uno annullato un'ora da
// segnare annullata, e tutto aspetta una spunta. Una lezione assente dal
// calendario non si cancella mai: si segnala.
//
// Eccezione: una lezione collegata con certezza si allinea da sola a inizio,
// fine e aula dell'evento (`allineamentiAutomatici`, spedita da
// `ui/externalCalendar.ts`). Certezza vuol dire evento attribuito da una
// **regola** con un'ora che torna con quella della lezione, o dall'**orario**
// ricorrente con cui coincide per inizio e durata; mai per **nome** o
// **sovrapposizione** («Consiglio di classe 3B» alle 14:30 cade sulla lezione
// del 3B delle 14:00 e non è quella). E solo su lezioni non ancora trattate
// come fatte, con un orario valido che non cambia le UD di un'ora passata, non
// pesta un'altra lezione del corso e non viene da eventi contraddittori.
//
// Niente rete né file: il testo arriva già letto. Quattro file in fila:
// `calendarIcs.ts` (gli eventi), `calendarRules.ts` (di che corso),
// `calendarLinks.ts` (su quale lezione), questo (il confronto).

import {
  contaUd,
  deciso,
  fineLezione,
  inizioLezione,
  slotDelCalendario,
  slotLiberi,
  slotOrdinati,
  slotSpostati,
} from './calculations.js'
import type { CalendarioLetto, EventoCalendario } from './calendarIcs.js'
import { lezioneSotto, lezioniPerCorsoEGiorno, type Collegamenti } from './calendarLinks.js'
import {
  abbinatore,
  corsiConfrontabili,
  dicituraDi,
  ricorrenzaCheCominciaLi,
  sovrappostiMinuti,
  type ViaAbbinamento,
} from './calendarRules.js'
import { minutiDaOra, minutiInUd, oraDaMinuti } from './dates.js'
import { nuovoIdSlot } from './identifiers.js'
import type { Iso, Lezione, Ora, RegolaCalendario, Registro, Slot, StatoLezione } from './models.js'
import { normalizzaTesto } from './text.js'
import { testi } from './calendar.testi.js'
import { validaSlot } from './validation.js'

// ------------------------------------------------------------------ confronto

/**
 * Le fasce di una lezione come le propone il calendario: una per evento, a UD
 * intere, e una pausa nei buchi fra un evento e l'altro.
 */
export interface FasciaProposta {
  inizio: Ora
  fine: Ora
  tipo: Slot['tipo']
  /**
   * Viene dal calendario (`Slot.ics`). Le fasce aggiunte a mano accanto no:
   * l'allineamento le sposta con l'evento senza farle sue.
   */
  ics?: boolean
}

/** Una lezione da creare, come la manda chi ha spuntato la revisione. */
export interface LezioneDaCalendario {
  corsoId: string
  data: Iso
  fasce: FasciaProposta[]
  aula?: string
}

/** Una lezione da allineare: le fasce nuove, l'aula nuova, o tutte e due. */
export interface AllineamentoDaCalendario {
  lezioneId: string
  fasce?: FasciaProposta[]
  aula?: string
}

/** Che cosa fare di un gruppo di eventi dello stesso corso nello stesso giorno. */
export type EsitoConfronto = 'combacia' | 'allineare' | 'annullare' | 'nuova'

export interface VoceConfronto {
  /** Stabile fra un confronto e il successivo: la lezione, o corso-giorno-ora. */
  id: string
  esito: EsitoConfronto
  corsoId: string
  via: ViaAbbinamento
  data: Iso
  inizio: Ora
  fine: Ora
  /** Le fasce che la lezione avrebbe: da creare, o da mettere al posto delle sue. */
  fasce: FasciaProposta[]
  /** Il luogo dell'evento, quando ne dice uno. */
  aula: string
  titoli: string[]
  lezioneId: string | null
  statoLezione: StatoLezione | null
  /** Quel che cambierebbe, detto a parole: «08:20–09:50 → 08:30–10:00». */
  differenze: string[]
  /** Cambia l'orario, e non solo l'aula. */
  cambiaOrario: boolean
}

/** Gli eventi che nessuna prova ha saputo attribuire, raccolti per titolo. */
interface EventiSenzaCorso {
  titolo: string
  luogo: string
  quanti: number
  primo: Iso
  ultimo: Iso
}

/** Una lezione del registro che il calendario, nel suo periodo, non ha. */
interface LezioneAssente {
  lezioneId: string
  corsoId: string
  data: Iso
  inizio: Ora
  fine: Ora
  stato: StatoLezione
}

export interface Confronto {
  voci: VoceConfronto[]
  senzaCorso: EventiSenzaCorso[]
  assenti: LezioneAssente[]
  /** Quanti eventi una regola ha detto di non guardare. */
  ignorati: number
  /** Giornate intere e eventi a cavallo di due giorni. */
  scartati: number
  /** Gli eventi letti nel periodo, annullati compresi. */
  eventi: number
  /** Il primo e l'ultimo giorno con un evento: il periodo che il calendario copre. */
  copre: { dal: Iso; al: Iso } | null
}

/**
 * Due eventi con la stessa dicitura (vedi `dicituraDi`) separati al più da
 * così sono una lezione sola con la pausa in mezzo: è come i gestionali
 * esportano un blocco di due ore. Il buco diventa una fascia di pausa.
 * Quindici minuti, la ricreazione: oltre sono due ore diverse.
 */
const PAUSA_MASSIMA_MIN = 15

function fasceDaEventi (eventi: readonly EventoCalendario[], minutiUd: number): FasciaProposta[] {
  const ordinati = [...eventi].sort((a, b) => a.inizio.localeCompare(b.inizio))
  const fasce: FasciaProposta[] = []
  let cursore: number | null = null
  for (const e of ordinati) {
    const da = Math.max(minutiDaOra(e.inizio), cursore ?? 0)
    const quanto = minutiDaOra(e.fine) - da
    if (quanto <= 0) continue
    // Una fascia di lezione è di UD intere: un evento da cinquanta minuti è un'UD.
    const a = Math.min(da + minutiInUd(quanto, minutiUd), 24 * 60 - 1)
    if (cursore !== null && da > cursore) {
      fasce.push({ inizio: oraDaMinuti(cursore), fine: oraDaMinuti(da), tipo: 'pausa', ics: true })
    }
    fasce.push({ inizio: oraDaMinuti(da), fine: oraDaMinuti(a), tipo: 'lezione', ics: true })
    cursore = a
  }
  return fasce
}

/**
 * Gli eventi che con quello fanno una lezione sola: stessa dicitura, stesso
 * giorno, separati al più da `PAUSA_MASSIMA_MIN`. `delGiorno` sono gli eventi
 * del giorno; gli annullati restano fuori, tranne quello chiesto. Senza
 * `dicitura` conta il titolo.
 */
export function eventiDellaStessaLezione (
  delGiorno: readonly EventoCalendario[],
  evento: EventoCalendario,
  // testo-fisso: chiave interna di confronto, non si legge
  dicitura: (e: EventoCalendario) => string = (e) => `titolo:${normalizzaTesto(e.titolo)}`,
): EventoCalendario[] {
  const sua = dicitura(evento)
  const simili = delGiorno
    .filter((e) => e.chiave === evento.chiave || (
      !e.annullato && e.data === evento.data && dicitura(e) === sua
    ))
    .sort((a, b) => a.inizio.localeCompare(b.inizio))
  const qui = simili.findIndex((e) => e.chiave === evento.chiave)
  if (qui < 0) return [evento]
  const vicini = (a: EventoCalendario, b: EventoCalendario) =>
    minutiDaOra(b.inizio) - minutiDaOra(a.fine) <= PAUSA_MASSIMA_MIN
  let da = qui
  while (da > 0 && vicini(simili[da - 1], simili[da])) da -= 1
  let a = qui
  while (a < simili.length - 1 && vicini(simili[a], simili[a + 1])) a += 1
  return simili.slice(da, a + 1)
}

/**
 * La lezione da creare con quegli eventi, per quel corso: la stessa forma che
 * il confronto propone per un'ora nuova, e che `calendario.applica` scrive.
 */
export function lezioneDaEventi (
  eventi: readonly EventoCalendario[],
  corsoId: string,
  aula: string,
  minutiUd: number,
): LezioneDaCalendario | null {
  const fasce = fasceDaEventi(eventi, minutiUd)
  if (fasce.length === 0 || eventi.length === 0) return null
  const pulita = aula.trim()
  return { corsoId, data: eventi[0].data, fasce, ...(pulita ? { aula: pulita } : {}) }
}

/** Le fasce proposte con gli identificatori che servono a una lezione vera. */
export function slotDaFasce (
  fasce: readonly FasciaProposta[],
  vecchi: readonly Slot[] = [],
): Slot[] {
  // Si riusano gli id di prima, nell'ordine: la lezione allineata resta la stessa.
  return fasce.map((f, i) => ({
    id: vecchi[i]?.id ?? nuovoIdSlot(), inizio: f.inizio, fine: f.fine, tipo: f.tipo,
    ...(f.ics ? { ics: true as const } : {}),
  }))
}

/**
 * Le fasce di una lezione portate a un altro inizio e fine senza perdere le
 * pause: si sposta tutto e si adatta l'ultima fascia di lezione. Null se il
 * conto non torna in UD intere (si prende la forma del calendario).
 */
function fasceAdattate (
  slot: Slot[],
  inizio: Ora,
  fine: Ora,
  minutiUd: number,
): FasciaProposta[] | null {
  const spostati = slotOrdinati(slotSpostati(slot, inizio)).map((s) => ({ ...s }))
  const ultima = [...spostati].reverse().find((s) => s.tipo === 'lezione')
  const coda = spostati[spostati.length - 1]
  if (!ultima || ultima !== coda) return null
  ultima.fine = fine
  if (validaSlot(spostati, minutiUd).errori.length > 0) return null
  return spostati.map((s) => ({ inizio: s.inizio, fine: s.fine, tipo: s.tipo, ics: true }))
}

function fascia (s: Slot): FasciaProposta {
  return { inizio: s.inizio, fine: s.fine, tipo: s.tipo, ...(s.ics ? { ics: true } : {}) }
}

function fasceDi (lezione: Lezione): FasciaProposta[] {
  return slotOrdinati(lezione.slot).map(fascia)
}

/**
 * Le fasce libere di una lezione portate dietro all'evento spostato: quelle
 * prima seguono il suo inizio, quelle dopo la sua fine.
 */
function liberiAlSeguito (
  liberi: readonly Slot[],
  prima: { inizio: Ora; fine: Ora },
  dopo: { inizio: Ora; fine: Ora },
): FasciaProposta[] {
  const dallInizio = minutiDaOra(dopo.inizio) - minutiDaOra(prima.inizio)
  const dallaFine = minutiDaOra(dopo.fine) - minutiDaOra(prima.fine)
  return liberi.map((s) => {
    const scarto = s.inizio < prima.inizio ? dallInizio : dallaFine
    return {
      inizio: oraDaMinuti(minutiDaOra(s.inizio) + scarto),
      fine: oraDaMinuti(minutiDaOra(s.fine) + scarto),
      tipo: s.tipo,
    }
  })
}

function arco (fasce: readonly FasciaProposta[]): { inizio: Ora; fine: Ora } {
  return { inizio: fasce[0].inizio, fine: fasce[fasce.length - 1].fine }
}

/** Quel che il calendario dice di una lezione sola: il cuore del confronto. */
type ConfrontoLezione = Pick<
  VoceConfronto,
  'esito' | 'inizio' | 'fine' | 'fasce' | 'aula' | 'differenze' | 'cambiaOrario'
>

/**
 * Una lezione messa a fronte degli eventi che le cadono sopra: tutti annullati,
 * va segnata annullata; se no l'orario lo danno gli eventi (uno solo su una
 * lezione con pause le tiene, più eventi danno la forma) e l'aula il primo
 * luogo scritto. È la voce del confronto e di «Sincronizza da ICS».
 */
export function confrontaLezione (
  lezione: Lezione,
  eventi: readonly EventoCalendario[],
  minutiUd: number,
): ConfrontoLezione {
  const vivi = eventi.filter((e) => !e.annullato)
  // Solo le fasce del calendario: quelle aggiunte a mano non sono differenze.
  const suoi = slotDelCalendario(lezione.slot)
  const liberi = slotLiberi(lezione.slot)
  const da = suoi[0]?.inizio ?? '00:00'
  const a = suoi.reduce((fine, s) => (s.fine > fine ? s.fine : fine), da)
  if (vivi.length === 0) {
    return {
      esito: lezione.stato === 'annullata' ? 'combacia' : 'annullare',
      inizio: da,
      fine: a,
      fasce: fasceDi(lezione),
      aula: lezione.aula ?? '',
      differenze: lezione.stato === 'annullata' ? [] : [testi().annullataNelCalendario],
      cambiaOrario: false,
    }
  }
  const dalCalendario = fasceDaEventi(vivi, minutiUd)
  const voluto = arco(dalCalendario)
  const differenze: string[] = []
  let fasce = fasceDi(lezione)
  const cambiaOrario = voluto.inizio !== da || voluto.fine !== a
  if (cambiaOrario) {
    differenze.push(`${da}–${a} → ${voluto.inizio}–${voluto.fine}`)
    // Un evento solo su una lezione con le sue pause: si tengono le pause.
    // Più eventi: la forma la dà il calendario.
    const adattate = vivi.length === 1
      ? fasceAdattate(suoi, voluto.inizio, voluto.fine, minutiUd)
      : null
    // Le fasce libere seguono l'evento. Se poi non stanno nel giorno o si
    // pestano, `validaSlot` lo dice e l'allineamento resta una proposta.
    fasce = [
      ...(adattate ?? dalCalendario),
      ...liberiAlSeguito(liberi, { inizio: da, fine: a }, voluto),
    ].sort((x, y) => x.inizio.localeCompare(y.inizio))
  }
  // L'aula cambia solo se è davvero un'altra, non per maiuscole, spazi o
  // punteggiatura.
  const luogo = vivi.find((e) => e.luogo)?.luogo ?? ''
  const suaAula = lezione.aula ?? ''
  const aula = luogo && normalizzaTesto(luogo) !== normalizzaTesto(suaAula) ? luogo : suaAula
  if (aula !== suaAula) differenze.push(testi().cambioAula(suaAula || '—', aula))
  return {
    esito: differenze.length > 0 ? 'allineare' : 'combacia',
    inizio: cambiaOrario ? voluto.inizio : da,
    fine: cambiaOrario ? voluto.fine : a,
    fasce,
    aula,
    differenze,
    cambiaOrario,
  }
}

/**
 * Il calendario letto, messo a fronte delle lezioni. Ogni evento trova il suo
 * corso (`abbina`) e poi la lezione con cui si sovrappone di più; gli eventi
 * di un corso senza lezione sotto diventano lezioni nuove, uniti se vicini
 * (`PAUSA_MASSIMA_MIN`). Le lezioni «assenti» si cercano solo nei corsi che il
 * calendario conosce e nei giorni che copre.
 */
export function confrontaCalendario (
  registro: Registro,
  letto: CalendarioLetto,
  regole: readonly RegolaCalendario[],
): Confronto {
  const corsi = corsiConfrontabili(registro)

  const senzaCorso = new Map<string, EventiSenzaCorso>()
  let ignorati = 0
  // Per lezione: gli eventi che ci cadono sopra. Per corso e giorno: quelli senza lezione.
  type SuLezione = { lezione: Lezione; eventi: EventoCalendario[]; via: ViaAbbinamento }
  // Per corso, giorno e dicitura: due eventi da regole diverse (laboratorio e
  // teoria) non si uniscono nemmeno se si toccano.
  type Liberi = { corsoId: string; data: Iso; eventi: EventoCalendario[]; via: ViaAbbinamento }
  const suLezione = new Map<string, SuLezione>()
  const liberi = new Map<string, Liberi>()
  const corsiVisti = new Set<string>()

  const lezioniDelGiorno = lezioniPerCorsoEGiorno(registro, corsi)
  const abbina = abbinatore(registro, regole, corsi, lezioniDelGiorno)

  for (const evento of letto.eventi) {
    const abbinamento = abbina(evento)
    const { corsoId, via, ignorato } = abbinamento
    if (ignorato) {
      ignorati += 1
      continue
    }
    if (!corsoId || !via) {
      if (evento.annullato) continue
      const chiave = normalizzaTesto(evento.titolo) || normalizzaTesto(evento.luogo)
      const gia = senzaCorso.get(chiave)
      if (gia) {
        gia.quanti += 1
        if (evento.data < gia.primo) gia.primo = evento.data
        if (evento.data > gia.ultimo) gia.ultimo = evento.data
      } else {
        senzaCorso.set(chiave, {
          titolo: evento.titolo,
          luogo: evento.luogo,
          quanti: 1,
          primo: evento.data,
          ultimo: evento.data,
        })
      }
      continue
    }
    corsiVisti.add(corsoId)

    const scelta = lezioneSotto(lezioniDelGiorno.get(`${corsoId}|${evento.data}`) ?? [], evento)
    if (scelta) {
      const voce = suLezione.get(scelta.id) ?? { lezione: scelta, eventi: [], via }
      voce.eventi.push(evento)
      suLezione.set(scelta.id, voce)
    } else if (!evento.annullato) {
      // Un evento annullato senza una lezione sotto non chiede niente.
      const chiave = `${corsoId}|${evento.data}|${dicituraDi(evento, abbinamento)}`
      const voce = liberi.get(chiave) ?? { corsoId, data: evento.data, eventi: [], via }
      voce.eventi.push(evento)
      liberi.set(chiave, voce)
    }
  }

  const voci: VoceConfronto[] = []

  for (const { lezione, eventi, via } of suLezione.values()) {
    voci.push({
      id: lezione.id,
      corsoId: lezione.corsoId,
      via,
      data: lezione.data,
      titoli: [...new Set(eventi.map((e) => e.titolo).filter(Boolean))],
      lezioneId: lezione.id,
      statoLezione: lezione.stato,
      ...confrontaLezione(lezione, eventi, registro.impostazioni.minutiUd),
    })
  }

  for (const { corsoId, data, eventi, via } of liberi.values()) {
    // Gli eventi dello stesso giorno e della stessa dicitura si uniscono
    // finché la pausa non supera `PAUSA_MASSIMA_MIN`.
    const ordinati = [...eventi].sort((x, y) => x.inizio.localeCompare(y.inizio))
    const gruppi: EventoCalendario[][] = []
    for (const e of ordinati) {
      const ultimo = gruppi[gruppi.length - 1]
      const coda = ultimo?.[ultimo.length - 1]
      const pausa = coda ? minutiDaOra(e.inizio) - minutiDaOra(coda.fine) : Infinity
      if (pausa <= PAUSA_MASSIMA_MIN) ultimo.push(e)
      else gruppi.push([e])
    }
    for (const gruppo of gruppi) {
      const fasce = fasceDaEventi(gruppo, registro.impostazioni.minutiUd)
      if (fasce.length === 0) continue
      const { inizio, fine } = arco(fasce)
      voci.push({
        id: `${corsoId}|${data}|${inizio}`,
        esito: 'nuova',
        corsoId,
        via,
        data,
        inizio,
        fine,
        fasce,
        aula: gruppo.find((e) => e.luogo)?.luogo ?? '',
        titoli: [...new Set(gruppo.map((e) => e.titolo).filter(Boolean))],
        lezioneId: null,
        statoLezione: null,
        differenze: [],
        cambiaOrario: false,
      })
    }
  }

  voci.sort((x, y) => x.data.localeCompare(y.data) || x.inizio.localeCompare(y.inizio))

  const date = letto.eventi.map((e) => e.data)
  const copre = date.length > 0 ? { dal: date[0], al: date[date.length - 1] } : null
  const abbinate = new Set(suLezione.keys())
  const assenti: LezioneAssente[] = copre
    ? registro.lezioni
        .filter((l) =>
          corsiVisti.has(l.corsoId) && !abbinate.has(l.id) && l.stato !== 'annullata' &&
        l.data >= copre.dal && l.data <= copre.al)
        .map((l) => ({
          lezioneId: l.id,
          corsoId: l.corsoId,
          data: l.data,
          inizio: inizioLezione(l) ?? '',
          fine: fineLezione(l) ?? '',
          stato: l.stato,
        }))
        .sort((x, y) => x.data.localeCompare(y.data) || x.inizio.localeCompare(y.inizio))
    : []

  return {
    voci,
    senzaCorso: [...senzaCorso.values()]
      .sort((x, y) => y.quanti - x.quanti || x.titolo.localeCompare(y.titolo)),
    assenti,
    ignorati,
    scartati: letto.scartati,
    eventi: letto.eventi.length,
    copre,
  }
}

// ------------------------------------------------------------------ allineamento da solo

/** Una lezione collegata che si allinea da sola, e con che cosa. */
interface AllineamentoAutomatico {
  voce: AllineamentoDaCalendario
  /**
   * Da dove a dove: la lezione com'è (inizio, fine, aula) e come la vuole il
   * calendario. Chi spedisce la ricorda per non ritentare lo stesso passo a
   * ogni ridisegno.
   */
  chiave: string
}

interface AllineamentiAutomatici {
  allinea: AllineamentoAutomatico[]
  /** Le lezioni collegate che già combaciano: i passi tentati su di loro si possono scordare. */
  combaciano: string[]
}

/**
 * Se l'ora di un evento torna con quella della lezione: stesso inizio della
 * lezione o di una fascia dell'orario, o sovrapposizione di almeno metà
 * dell'una e dell'altro. L'evento si guarda con le altre metà della stessa
 * lezione (`eventiDellaStessaLezione`).
 */
function coerenteDOra (
  registro: Registro,
  lezione: Lezione,
  evento: EventoCalendario,
  eventi: readonly EventoCalendario[],
): boolean {
  // Contano le fasce del calendario: un'ora aggiunta a mano non cambia il conto.
  const suoi = slotDelCalendario(lezione.slot)
  const suoDa = suoi[0]?.inizio
  const suoA = suoi.reduce<Ora | undefined>(
    (fine, s) => (!fine || s.fine > fine ? s.fine : fine),
    undefined,
  )
  if (!suoDa || !suoA) return false
  const blocco = eventiDellaStessaLezione(eventi, evento)
  const da = blocco[0].inizio
  const a = blocco.reduce((fine, e) => (e.fine > fine ? e.fine : fine), blocco[0].fine)
  if (da === suoDa) return true
  const corso = registro.corsi.find((c) => c.id === lezione.corsoId)
  if (corso && ricorrenzaCheCominciaLi(corso, { ...evento, inizio: da })) return true
  const comune = sovrappostiMinuti(da, a, suoDa, suoA)
  const lunga = (inizio: Ora, fine: Ora) => minutiDaOra(fine) - minutiDaOra(inizio)
  return comune > 0 && comune * 2 >= lunga(suoDa, suoA) && comune * 2 >= lunga(da, a)
}

/**
 * Se l'evento è del corso per certo (vedi la testa del file): una regola con
 * un'ora coerente (`coerenteDOra`), o l'orario ricorrente con cui coincide per
 * inizio e durata. La regola da sola non basta: «I MEC A» prende anche
 * «Consiglio di classe I MEC A».
 */
function collegatoPerCerto (
  registro: Registro,
  lezione: Lezione,
  evento: EventoCalendario,
  via: ViaAbbinamento | undefined,
  eventi: readonly EventoCalendario[],
): boolean {
  if (via === 'regola') return coerenteDOra(registro, lezione, evento, eventi)
  if (via !== 'orario') return false
  const corso = registro.corsi.find((c) => c.id === lezione.corsoId)
  const fascia = corso ? ricorrenzaCheCominciaLi(corso, evento) : null
  if (!fascia) return false
  const durata = minutiDaOra(evento.fine) - minutiDaOra(evento.inizio)
  return durata > 0 && minutiInUd(durata, registro.impostazioni.minutiUd) === fascia.durataMin
}

/**
 * Se almeno un evento sulla lezione è un collegamento certo: allora orario,
 * data e corso li detta il calendario e non si toccano a mano (`ancorataAIcs`).
 * Un collegamento per indizio lascia la lezione correggibile.
 */
export function collegataPerCerto (
  registro: Registro,
  lezione: Lezione,
  eventi: readonly EventoCalendario[],
  vie: ReadonlyMap<string, ViaAbbinamento>,
): boolean {
  return eventi.some((e) =>
    !e.annullato && collegatoPerCerto(registro, lezione, e, vie.get(e.chiave), eventi))
}

/**
 * Se sulla lezione c'è già qualcosa di scritto (appello, ritardo, nota,
 * osservazione, comportamento, argomenti, consuntivo): è stata trattata come
 * fatta.
 */
function giaToccata (lezione: Lezione): boolean {
  return lezione.presenze.some((p) =>
    p.stati.some(deciso) || p.minuti !== undefined || Boolean(p.nota?.trim())) ||
    lezione.osservazioni.length > 0 ||
    (lezione.matrice?.length ?? 0) > 0 ||
    Boolean(lezione.argomenti?.trim()) ||
    Boolean(lezione.consuntivo?.trim())
}

/**
 * Due eventi vivi della stessa lezione che si sovrappongono senza essere la
 * stessa ora (due calendari, copia vecchia e nuova): in fila farebbero una
 * lezione troppo lunga.
 */
function eventiInConflitto (vivi: readonly EventoCalendario[]): boolean {
  return vivi.some((x, i) => vivi.slice(i + 1).some((y) =>
    (x.inizio !== y.inizio || x.fine !== y.fine) &&
    sovrappostiMinuti(x.inizio, x.fine, y.inizio, y.fine) > 0))
}

/**
 * Se il calendario può scrivere da solo l'allineamento: lezione pianificata e
 * intatta (`giaToccata`), fasce valide, UD invariate per un'ora passata, nessun
 * accavallamento con un'altra lezione del corso. Lo chiede chi sceglie e lo
 * richiede l'host prima di scrivere, perché il registro può essere cambiato.
 */
export function allineamentoDaSoloAmmesso (
  registro: Registro,
  lezione: Lezione,
  voce: AllineamentoDaCalendario,
  oggi: Iso,
): boolean {
  if (lezione.stato !== 'pianificata' || giaToccata(lezione)) return false
  if (!voce.fasce) return true
  if (voce.fasce.length === 0) return false
  const slot = slotDaFasce(voce.fasce, slotOrdinati(lezione.slot))
  const { minutiUd } = registro.impostazioni
  if (!validaSlot(slot, minutiUd).valido) return false
  const udCambiate = contaUd({ ...lezione, slot }, minutiUd) !== contaUd(lezione, minutiUd)
  if (lezione.data < oggi && udCambiate) return false
  const { inizio, fine } = arco(voce.fasce)
  return !registro.lezioni.some((l) => {
    if (l.id === lezione.id || l.stato === 'annullata') return false
    if (l.corsoId !== lezione.corsoId || l.data !== lezione.data) return false
    const da = inizioLezione(l)
    const a = fineLezione(l)
    return da !== null && a !== null && sovrappostiMinuti(inizio, fine, da, a) > 0
  })
}

/**
 * L'allineamento da fare da solo su una lezione collegata, o `null` (combacia,
 * collegamento per indizio, lezione già fatta, cambio non scrivibile, eventi
 * contraddittori). `vie` dice per chiave d'evento come se n'è trovato il corso
 * (`Collegamenti.viaPerEvento`).
 */
export function allineamentoAutomatico (
  registro: Registro,
  lezione: Lezione,
  eventi: readonly EventoCalendario[],
  vie: ReadonlyMap<string, ViaAbbinamento>,
  oggi: Iso,
): AllineamentoAutomatico | null {
  const vivi = eventi.filter((e) => !e.annullato)
  if (vivi.length === 0 || vivi.length < eventi.length) return null
  if (eventiInConflitto(vivi)) return null
  const certo = (e: EventoCalendario) =>
    collegatoPerCerto(registro, lezione, e, vie.get(e.chiave), eventi)
  if (!vivi.every(certo)) return null
  const voce = confrontaLezione(lezione, eventi, registro.impostazioni.minutiUd)
  if (voce.esito !== 'allineare') return null
  const allineamento: AllineamentoDaCalendario = {
    lezioneId: lezione.id,
    ...(voce.cambiaOrario ? { fasce: voce.fasce } : {}),
    aula: voce.aula,
  }
  if (!allineamentoDaSoloAmmesso(registro, lezione, allineamento, oggi)) return null
  const da = `${inizioLezione(lezione) ?? ''}-${fineLezione(lezione) ?? ''}@${lezione.aula ?? ''}`
  const a = `${voce.inizio}-${voce.fine}@${voce.aula}`
  return { voce: allineamento, chiave: `${lezione.id}|${da}→${a}` }
}

/**
 * Le lezioni collegate che il calendario allinea da solo, e con che cosa: la
 * scelta che `ui/externalCalendar.ts` spedisce quando i collegamenti si
 * rifanno. Le altre restano al confronto.
 */
export function allineamentiAutomatici (
  registro: Registro,
  collegamenti: Collegamenti,
  oggi: Iso,
): AllineamentiAutomatici {
  const allinea: AllineamentoAutomatico[] = []
  const combaciano: string[] = []
  const perId = new Map(registro.lezioni.map((l) => [l.id, l]))
  for (const [lezioneId, eventi] of collegamenti.eventiPerLezione) {
    const lezione = perId.get(lezioneId)
    if (!lezione) continue
    if (confrontaLezione(lezione, eventi, registro.impostazioni.minutiUd).esito === 'combacia') {
      combaciano.push(lezioneId)
      continue
    }
    const vie = collegamenti.viaPerEvento
    const scelta = allineamentoAutomatico(registro, lezione, eventi, vie, oggi)
    if (scelta) allinea.push(scelta)
  }
  return { allinea, combaciano }
}
