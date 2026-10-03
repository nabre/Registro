// Il progetto (ADR-54 e la sua estensione del 2026-10-03): una risorsa
// dell'anno che si integra nei corsi. Le letture che servono alle pagine, alla
// scheda della lezione e ai rapporti lavorano sul progetto visto da un corso
// (`nelCorso`); le regole tengono pulite le matrici. Puro: niente disco,
// niente orologio se non come predefinito.

import {
  allieviAttivi,
  confrontaLezioni,
  contaComeAssenza,
  deciso,
  statiAllineati,
  statoDellOra,
} from './calculations.js'
import { oggi } from './dates.js'
import { nuovoIdFaseProgetto } from './identifiers.js'
import { confrontaNomi } from './text.js'
import type {
  Attivita,
  CellaProgetto,
  CompitoProgetto,
  CriterioProgetto,
  FaseProgetto,
  IntegrazioneProgetto,
  Iso,
  Lezione,
  LivelloProgetto,
  MomentoValutazione,
  Progetto,
  ProgettoNelCorso,
  Registro,
  StatoAttivita,
  StatoPresenza,
  StatoProgetto,
} from './models.js'
import { testi } from './projects.testi.js'

export const STATI_PROGETTO: readonly StatoProgetto[] = ['bozza', 'in-corso', 'concluso']

/** I valori della scala di serie, dal basso, con il loro colore. */
const SCALA_DI_SERIE = [
  { valore: 'non-raggiunto', colore: '#ef4444' },
  { valore: 'parziale', colore: '#f59e0b' },
  { valore: 'raggiunto', colore: '#10b981' },
  { valore: 'pienamente', colore: '#3b82f6' },
] as const

/**
 * La scala con cui nasce un progetto: quattro livelli, con i testi nella lingua
 * di quel momento. Da lì sono del documento e si rinominano a mano.
 */
export function livelliPredefiniti (): LivelloProgetto[] {
  const testo = testi().livelli
  return SCALA_DI_SERIE.map(({ valore, colore }) => ({ valore, testo: testo[valore], colore }))
}

/**
 * Una fase con il titolo di serie nella lingua di adesso («Fase 2»): da lì è
 * del documento e si rinomina a mano, come i livelli.
 */
export function fasePredefinita (numero = 1): FaseProgetto {
  return { id: nuovoIdFaseProgetto(), titolo: testi().fase(numero) }
}

/**
 * La fase in cui cade una tappa del progetto: quella che nomina, o la prima se
 * ne nomina una che il progetto non ha (o nessuna). Null se la tappa non
 * lavora per questo progetto.
 */
export function faseDellAttivita (
  progetto: Pick<Progetto, 'id' | 'fasi'>,
  attivita: Pick<Attivita, 'progettoId' | 'faseProgettoId'>,
): FaseProgetto | null {
  if (attivita.progettoId !== progetto.id) return null
  return progetto.fasi.find((f) => f.id === attivita.faseProgettoId) ?? progetto.fasi[0] ?? null
}

/**
 * Ogni tappa di un progetto cade in una fase sua: una fase che il progetto non
 * ha più (tolta a mano, o mai scritta) diventa la sua prima. Le tappe di un
 * progetto che non c'è restano come sono: il rimando rotto lo dicono
 * `riferimentiRotti` e le riparazioni, che lo tolgono con la fase.
 */
export function fasiDelleTappe (registro: Pick<Registro, 'piani' | 'progetti'>): number {
  const progetti = new Map(registro.progetti.map((p) => [p.id, p]))
  let cambiate = 0
  for (const piano of registro.piani) {
    for (const attivita of piano.attivita) {
      if (!attivita.progettoId) {
        if (attivita.faseProgettoId !== undefined) {
          delete attivita.faseProgettoId
          cambiate++
        }
        if (attivita.attivitaProgettoId !== undefined) {
          delete attivita.attivitaProgettoId
          cambiate++
        }
        continue
      }
      const progetto = progetti.get(attivita.progettoId)
      const origine = progetto?.attivita?.find((a) => a.id === attivita.attivitaProgettoId)
      if (attivita.attivitaProgettoId && !origine) {
        attivita.attivitaProgettoId = null
        cambiate++
      }
      const fase = progetto ? (
        progetto.fasi.find((f) => f.id === origine?.faseId) ?? faseDellAttivita(progetto, attivita)
      ) : null
      if (fase && fase.id !== attivita.faseProgettoId) {
        attivita.faseProgettoId = fase.id
        cambiate++
      }
    }
  }
  return cambiate
}

/**
 * Un piano di un corso che lega una tappa a un progetto lo integra in quel
 * corso: l'integrazione che manca nasce in bozza. Torna quante ne ha aggiunte.
 */
export function integrazioniDeiPiani (registro: Pick<Registro, 'piani' | 'progetti'>): number {
  const progetti = new Map(registro.progetti.map((p) => [p.id, p]))
  let aggiunte = 0
  for (const piano of registro.piani) {
    if (!piano.corsoId) continue
    for (const attivita of piano.attivita) {
      const progetto = attivita.progettoId ? progetti.get(attivita.progettoId) : undefined
      if (!progetto || integrazioneDi(progetto, piano.corsoId)) continue
      progetto.integrazioni.push(integrazioneVuota(piano.corsoId))
      aggiunte++
    }
  }
  return aggiunte
}

/** Un'integrazione appena nata: in bozza, senza lavoro con la classe. */
export function integrazioneVuota (corsoId: string): IntegrazioneProgetto {
  return { corsoId, stato: 'bozza', compiti: [], giudizi: [], matrice: [] }
}

/** Il progetto con quell'id, se c'è. */
export function progettoPerId (registro: Registro, id: string): Progetto | null {
  return registro.progetti.find((p) => p.id === id) ?? null
}

/** L'integrazione del progetto in quel corso, se c'è. */
export function integrazioneDi (
  progetto: Pick<Progetto, 'integrazioni'>,
  corsoId: string | null | undefined,
): IntegrazioneProgetto | null {
  if (!corsoId) return null
  return progetto.integrazioni.find((i) => i.corsoId === corsoId) ?? null
}

/**
 * Il progetto visto da un corso in cui è integrato: la testata del progetto e
 * i campi dell'integrazione. Gli elenchi sono quelli veri, non copie: chi li
 * cambia sul posto cambia l'integrazione; chi li sostituisce li rimette con
 * `riportaNellIntegrazione`. Null se il progetto non è integrato lì.
 */
export function nelCorso (
  progetto: Progetto,
  corsoId: string | null | undefined,
): ProgettoNelCorso | null {
  const integrazione = integrazioneDi(progetto, corsoId)
  if (!integrazione) return null
  const { integrazioni: _tutte, ...testata } = progetto
  return { ...testata, ...integrazione }
}

/** Rimette nell'integrazione quel che una vista ha sostituito invece di cambiare sul posto. */
export function riportaNellIntegrazione (progetto: Progetto, vista: ProgettoNelCorso): void {
  const integrazione = integrazioneDi(progetto, vista.corsoId)
  if (!integrazione) return
  integrazione.stato = vista.stato
  integrazione.compiti = vista.compiti
  integrazione.giudizi = vista.giudizi
  integrazione.matrice = vista.matrice
}

/** Il progetto con quell'id visto dal corso, se c'è ed è integrato lì. */
export function progettoNelCorsoPerId (
  registro: Registro,
  progettoId: string,
  corsoId: string | null | undefined,
): ProgettoNelCorso | null {
  const progetto = progettoPerId(registro, progettoId)
  return progetto ? nelCorso(progetto, corsoId) : null
}

/** I progetti dell'anno, per titolo. */
export function progettiPerTitolo (registro: Pick<Registro, 'progetti'>): Progetto[] {
  return [...registro.progetti].sort((a, b) => confrontaNomi(a.titolo, b.titolo))
}

/**
 * I progetti integrati in un corso, visti da lì, per inizio (quelli senza
 * lezioni ancora in fondo), poi per titolo.
 */
export function progettiDelCorso (registro: Registro, corsoId: string): ProgettoNelCorso[] {
  const inizi = new Map<string, string>()
  const suoi = registro.progetti
    .map((p) => nelCorso(p, corsoId))
    .filter((p): p is ProgettoNelCorso => p !== null)
  for (const p of suoi) inizi.set(p.id, periodoDelProgetto(registro, p)?.inizio ?? '￿')
  return suoi.sort((a, b) =>
    (inizi.get(a.id) ?? '').localeCompare(inizi.get(b.id) ?? '') || confrontaNomi(a.titolo, b.titolo))
}

/**
 * Da quando a quando va il progetto: il giorno della prima e dell'ultima ora
 * (non annullata) il cui piano ha fasi del progetto. Null finché nessuna fase
 * abbinata sta in un'ora.
 */
export function periodoDelProgetto (
  registro: Registro,
  progetto: ProgettoNelCorso,
): Periodo | null {
  return periodoDi(lezioniDelProgetto(registro, progetto))
}

/** Da quando a quando va una fase: come per il progetto, sulle ore con tappe sue. */
export function periodoDellaFase (
  registro: Registro,
  progetto: ProgettoNelCorso,
  faseId: string,
): Periodo | null {
  return periodoDi(lezioniDellaFase(registro, progetto, faseId))
}

/** Un periodo ricavato dalle ore: il giorno della prima e dell'ultima. */
export interface Periodo {
  inizio: Iso
  fine: Iso
}

/** Il giorno della prima e dell'ultima ora non annullata, già in ordine. */
function periodoDi (lezioni: readonly LezioneDelProgetto[]): Periodo | null {
  const ore = lezioni.filter((v) => v.lezione.stato !== 'annullata')
  if (ore.length === 0) return null
  return { inizio: ore[0].lezione.data, fine: ore[ore.length - 1].lezione.data }
}

/**
 * Il giorno di una voce che può stare in un'ora: quello attuale della lezione,
 * se c'è ancora; altrimenti quello salvato. Come le spunte del check.
 */
export function giornoDellaVoce (
  registro: Registro,
  voce: { data: Iso, lezioneId: string | null },
): Iso {
  if (voce.lezioneId) {
    const lezione = registro.lezioni.find((l) => l.id === voce.lezioneId)
    if (lezione) return lezione.data
  }
  return voce.data
}

/** Una lezione del progetto, con le tappe del suo piano che lavorano per lui. */
export interface LezioneDelProgetto {
  lezione: Lezione
  attivita: Attivita[]
}

/**
 * Le lezioni del progetto, in ordine: quelle del corso il cui piano ha almeno
 * una tappa con questo `progettoId`. Si ricavano dai piani, non si elencano.
 */
export function lezioniDelProgetto (registro: Registro, progetto: ProgettoNelCorso): LezioneDelProgetto[] {
  const tappe = new Map<string, Attivita[]>()
  for (const piano of registro.piani) {
    const sue = piano.attivita.filter((a) => a.progettoId === progetto.id)
    if (sue.length > 0) tappe.set(piano.id, sue)
  }
  return registro.lezioni
    .filter((l) => l.corsoId === progetto.corsoId && l.pianoId !== null && tappe.has(l.pianoId))
    .sort(confrontaLezioni)
    .map((lezione) => ({ lezione, attivita: tappe.get(lezione.pianoId ?? '') ?? [] }))
}

/**
 * Le lezioni di una fase: quelle del progetto, con le sole tappe che cadono in
 * quella fase (`faseDellAttivita`); un'ora senza tappe sue non c'è.
 */
export function lezioniDellaFase (
  registro: Registro,
  progetto: ProgettoNelCorso,
  faseId: string,
): LezioneDelProgetto[] {
  return lezioniDelProgetto(registro, progetto)
    .map(({ lezione, attivita }) => ({
      lezione,
      attivita: attivita.filter((a) => faseDellAttivita(progetto, a)?.id === faseId),
    }))
    .filter((v) => v.attivita.length > 0)
}

/** Su che cosa si guarda: il progetto intero o una sua fase. */
interface PerFase {
  /** Solo le ore e le tappe di questa fase. */
  faseId?: string
}

function lezioniScelte (
  registro: Registro,
  progetto: ProgettoNelCorso,
  opzioni: PerFase,
): LezioneDelProgetto[] {
  return opzioni.faseId === undefined
    ? lezioniDelProgetto(registro, progetto)
    : lezioniDellaFase(registro, progetto, opzioni.faseId)
}

/**
 * Un'attività del piano che lavora per il progetto, in un'ora: quanto se n'è
 * fatto, dall'avanzamento dell'ora, e in che fase del progetto cade.
 */
export interface AttivitaNellOra {
  lezioneId: string
  data: Iso
  attivitaId: string
  /** La fase del progetto della tappa (`faseDellAttivita`). */
  faseId: string
  titolo: string
  stato: StatoAttivita
  nota?: string
}

/** Svolte intere, parziali a metà; le saltate fuori dal conto. Zero senza tappe. */
function quotaDi (attivita: readonly AttivitaNellOra[]): number {
  const pesi = attivita.filter((a) => a.stato !== 'saltata')
  const fatte = pesi.reduce((n, a) => n + (a.stato === 'svolta' ? 1 : a.stato === 'parziale' ? 0.5 : 0), 0)
  return pesi.length === 0 ? 0 : fatte / pesi.length
}

/**
 * L'avanzamento del progetto (o di una sua fase), tappa per tappa e ora per
 * ora, dal consuntivo delle lezioni (`Lezione.avanzamento`). Le ore annullate
 * non contano; una tappa mai segnata è «da fare». `quota` (0–1): svolte
 * intere, parziali a metà, saltate fuori dal conto.
 */
export function avanzamentoDelProgetto (
  registro: Registro,
  progetto: ProgettoNelCorso,
  opzioni: PerFase = {},
): { attivita: AttivitaNellOra[], quota: number } {
  const voci: AttivitaNellOra[] = []
  for (const { lezione, attivita } of lezioniScelte(registro, progetto, opzioni)) {
    if (lezione.stato === 'annullata') continue
    for (const a of attivita) {
      const fatto = lezione.avanzamento.find((v) => v.attivitaId === a.id)
      voci.push({
        lezioneId: lezione.id,
        data: lezione.data,
        attivitaId: a.id,
        faseId: faseDellAttivita(progetto, a)?.id ?? '',
        titolo: fatto?.titolo || a.titolo,
        stato: fatto?.stato ?? 'da-fare',
        ...(fatto?.nota ? { nota: fatto.nota } : {}),
      })
    }
  }
  return { attivita: voci, quota: quotaDi(voci) }
}

/** Le presenze di una persona nelle ore del progetto. */
export interface PresenzeNelProgetto {
  allievoId: string
  /** Una voce per ora del progetto, nell'ordine delle ore. */
  ore: Array<{ lezioneId: string, data: Iso, stato: StatoPresenza }>
  /** Le UD su cui ci si è pronunciati, e quelle perse. */
  udTotali: number
  udAssenza: number
  ritardi: number
}

/**
 * Le presenze nelle ore del progetto (o di una sua fase), per persona: con le
 * stesse regole dell'appello (`statoDellOra`, `contaComeAssenza`), solo sulle
 * ore con tappe del progetto. Le ore annullate non contano.
 */
export function presenzeNelProgetto (
  registro: Registro,
  progetto: ProgettoNelCorso,
  allieviIds: readonly string[],
  opzioni: PerFase = {},
): PresenzeNelProgetto[] {
  const ore = lezioniScelte(registro, progetto, opzioni)
    .map((v) => v.lezione)
    .filter((l) => l.stato !== 'annullata')
  return allieviIds.map((allievoId) => {
    const riga: PresenzeNelProgetto = { allievoId, ore: [], udTotali: 0, udAssenza: 0, ritardi: 0 }
    for (const lezione of ore) {
      const presenza = lezione.presenze.find((p) => p.allievoId === allievoId)
      const stati = statiAllineati(presenza, lezione.slot.filter((s) => s.tipo === 'lezione').length)
      const decisi = stati.filter(deciso)
      riga.udTotali += decisi.length
      riga.udAssenza += decisi.filter(contaComeAssenza).length
      if (decisi.some((st) => st === 'ritardo')) riga.ritardi += 1
      riga.ore.push({ lezioneId: lezione.id, data: lezione.data, stato: statoDellOra(stati) })
    }
    return riga
  })
}

/** Una fase nel quadro del progetto. */
export interface QuadroDellaFase {
  fase: FaseProgetto
  /** La posizione, da 1. */
  numero: number
  periodo: Periodo | null
  /** Le tappe della fase nelle ore, con il loro stato. */
  attivita: AttivitaNellOra[]
  quota: number
  /** I momenti del progetto nati da una tappa di questa fase (`MomentoValutazione.attivitaId`). */
  momenti: MomentoValutazione[]
}

/** Tutto quel che il progetto sa di sé, fase per fase e per intero. */
export interface QuadroDelProgetto {
  periodo: Periodo | null
  quota: number
  fasi: QuadroDellaFase[]
  /** Chi frequenta la classe del corso, nelle ore del progetto. */
  presenze: PresenzeNelProgetto[]
  /** I momenti promossi dal progetto, per data, con i loro voti. */
  momenti: MomentoValutazione[]
}

/**
 * Il quadro del progetto: per ogni fase periodo, tappe nelle ore, quota e
 * momenti; per l'intero periodo, quota, presenze di chi frequenta e momenti.
 * Una lettura sola, perché pagina, procedura e rapporti dicano lo stesso.
 */
export function quadroDelProgetto (registro: Registro, progetto: ProgettoNelCorso): QuadroDelProgetto {
  const tutto = avanzamentoDelProgetto(registro, progetto)
  const momenti = momentiDelProgetto(registro, progetto)
  const corso = registro.corsi.find((c) => c.id === progetto.corsoId)
  const classe = registro.classi.find((c) => c.id === corso?.classeId)
  const attivi = classe ? allieviAttivi(classe).map((a) => a.id) : []
  return {
    periodo: periodoDelProgetto(registro, progetto),
    quota: tutto.quota,
    fasi: progetto.fasi.map((fase, i) => {
      const attivita = tutto.attivita.filter((a) => a.faseId === fase.id)
      // Le tappe della fase in tutti i piani: il momento la nomina anche se l'ora non c'è più.
      const tappe = new Set(registro.piani.flatMap((piano) => piano.attivita
        .filter((a) => faseDellAttivita(progetto, a)?.id === fase.id)
        .map((a) => a.id)))
      return {
        fase,
        numero: i + 1,
        periodo: periodoDellaFase(registro, progetto, fase.id),
        attivita,
        quota: quotaDi(attivita),
        momenti: momenti.filter((m) => Boolean(m.attivitaId) && tappe.has(m.attivitaId ?? '')),
      }
    }),
    presenze: presenzeNelProgetto(registro, progetto, attivi),
    momenti,
  }
}

/** I momenti di valutazione promossi dal progetto nel corso, per data. */
export function momentiDelProgetto (
  registro: Registro,
  progetto: Pick<ProgettoNelCorso, 'id' | 'corsoId'>,
): MomentoValutazione[] {
  return registro.valutazioni
    .filter((v) => v.progettoId === progetto.id && v.corsoId === progetto.corsoId)
    .sort((a, b) => a.data.localeCompare(b.data))
}

/**
 * La fine comune di un compito: il giorno della sua lezione se c'è ancora
 * (spostare l'ora sposta la fine, come per le consegne), altrimenti la data.
 */
export function fineDelCompito (registro: Registro, compito: CompitoProgetto): Iso | null {
  if (compito.fineLezioneId) {
    const lezione = registro.lezioni.find((l) => l.id === compito.fineLezioneId)
    if (lezione) return lezione.data
  }
  return compito.fine
}

/** La fine che vale per un allievo: la sua proroga, o quella comune. */
export function fineEffettiva (
  registro: Registro,
  compito: CompitoProgetto,
  allievoId: string,
): Iso | null {
  const proroga = compito.proroghe.find((p) => p.allievoId === allievoId)
  return proroga?.fine ?? fineDelCompito(registro, compito)
}

type StatoCompito = 'non-iniziato' | 'in-corso' | 'fatto' | 'scaduto'

/**
 * A che punto è un allievo con un compito, nel giorno dato. Fatto vince su
 * tutto; poi la scadenza passata, anche per chi non ha cominciato: è quello
 * che chi insegna deve vedere per primo.
 */
export function statoCompitoPerAllievo (
  registro: Registro,
  compito: CompitoProgetto,
  allievoId: string,
  giorno: Iso = oggi(),
): StatoCompito {
  if (compito.fatti.some((f) => f.allievoId === allievoId)) return 'fatto'
  const fine = fineEffettiva(registro, compito, allievoId)
  if (fine && fine < giorno) return 'scaduto'
  return compito.inizi.some((i) => i.allievoId === allievoId) ? 'in-corso' : 'non-iniziato'
}

/** Le celle di un criterio per un allievo, dalla prima alla più recente. */
interface ProgressioneCriterio {
  criterio: CriterioProgetto
  celle: CellaProgetto[]
}

/**
 * La progressione di un allievo: per ogni criterio, nell'ordine del progetto,
 * le sue celle ordinate per giorno (quello attuale della lezione, se c'è).
 */
export function progressione (
  registro: Registro,
  progetto: ProgettoNelCorso,
  allievoId: string,
): ProgressioneCriterio[] {
  return progetto.criteri.map((criterio) => ({
    criterio,
    celle: progetto.matrice
      .filter((c) => c.allievoId === allievoId && c.criterioId === criterio.id)
      .sort((a, b) => giornoDellaVoce(registro, a).localeCompare(giornoDellaVoce(registro, b))),
  }))
}

/**
 * Le celle di quella coppia in quel giorno. Di solito una; più d'una quando un
 * file ne porta una nell'ora e una nel giorno senza ora, o un'ora spostata ne
 * raggiunge un'altra: la lettura del file non sa il giorno delle ore, qui sì.
 */
export function celleDi (
  registro: Registro,
  progetto: ProgettoNelCorso,
  allievoId: string,
  criterioId: string,
  giorno: Iso,
): CellaProgetto[] {
  return progetto.matrice.filter((c) =>
    c.allievoId === allievoId &&
    c.criterioId === criterioId &&
    giornoDellaVoce(registro, c) === giorno,
  )
}

/** Vero se una cella non dice niente: senza livello né nota non si salva. */
export function cellaVuota (cella: Pick<CellaProgetto, 'livello' | 'nota'>): boolean {
  return cella.livello === null && !cella.nota?.trim()
}

/**
 * Tiene le matrici di ogni corso coerenti con criteri e scala del progetto:
 * via le celle di un criterio tolto, un livello che la scala non ha più
 * diventa nullo, e la cella rimasta vuota se ne va. Torna vero se ha cambiato
 * qualcosa.
 */
export function ripulisciMatrice (
  progetto: Pick<Progetto, 'criteri' | 'livelli' | 'integrazioni'>,
): boolean {
  const criteri = new Set(progetto.criteri.map((c) => c.id))
  const livelli = new Set(progetto.livelli.map((l) => l.valore))
  let cambiato = false
  for (const integrazione of progetto.integrazioni) {
    for (const cella of integrazione.matrice) {
      if (cella.livello !== null && !livelli.has(cella.livello)) {
        cella.livello = null
        cambiato = true
      }
    }
    const restano = integrazione.matrice.filter((c) => criteri.has(c.criterioId) && !cellaVuota(c))
    if (restano.length !== integrazione.matrice.length) {
      integrazione.matrice = restano
      cambiato = true
    }
  }
  return cambiato
}

/** Il lavoro con una classe: quel che parla di allievi e di ore. */
type LavoroConLaClasse = Pick<IntegrazioneProgetto, 'compiti' | 'giudizi' | 'matrice'>

/** Gli allievi che un'integrazione nomina: inizi, proroghe, spunte, giudizi, celle. */
export function allieviNominati (progetto: LavoroConLaClasse): Set<string> {
  const ids = new Set<string>()
  for (const compito of progetto.compiti) {
    for (const voce of [...compito.inizi, ...compito.proroghe, ...compito.fatti]) {
      ids.add(voce.allievoId)
    }
  }
  for (const giudizio of progetto.giudizi) if (giudizio.allievoId) ids.add(giudizio.allievoId)
  for (const cella of progetto.matrice) ids.add(cella.allievoId)
  return ids
}

/** Toglie dall'integrazione tutto quel che parla di un allievo. Vero se ha tolto qualcosa. */
export function togliAllievo (progetto: LavoroConLaClasse, allievoId: string): boolean {
  if (!allieviNominati(progetto).has(allievoId)) return false
  const suo = (voce: { allievoId: string | null }) => voce.allievoId === allievoId
  for (const compito of progetto.compiti) {
    compito.inizi = compito.inizi.filter((v) => !suo(v))
    compito.proroghe = compito.proroghe.filter((v) => !suo(v))
    compito.fatti = compito.fatti.filter((v) => !suo(v))
  }
  progetto.giudizi = progetto.giudizi.filter((g) => !suo(g))
  progetto.matrice = progetto.matrice.filter((c) => !suo(c))
  return true
}

/** Le voci del progetto che stanno in un'ora, in tutti i corsi: inizi, fini dei compiti, giudizi, celle. */
export function rimandiAlleLezioni (progetto: Pick<Progetto, 'integrazioni'>): string[] {
  return progetto.integrazioni.flatMap(rimandiDellIntegrazione)
}

function rimandiDellIntegrazione (progetto: LavoroConLaClasse): string[] {
  return [
    ...progetto.compiti.flatMap((c) => [c.fineLezioneId, ...c.inizi.map((i) => i.lezioneId)]),
    ...progetto.giudizi.map((g) => g.lezioneId),
    ...progetto.matrice.map((c) => c.lezioneId),
  ].filter((id): id is string => Boolean(id))
}

/**
 * Vero se un progetto cita quell'ora. Con `fuoriDalCorso` contano solo le
 * integrazioni in un altro corso: spostata lì, l'ora sarebbe d'altri.
 */
export function lezioneNeiProgetti (
  registro: Registro,
  lezioneId: string,
  fuoriDalCorso?: string,
): boolean {
  return registro.progetti.some((p) => p.integrazioni.some((i) =>
    (fuoriDalCorso === undefined || i.corsoId !== fuoriDalCorso) &&
    rimandiDellIntegrazione(i).includes(lezioneId)))
}

/** Quante voci di un progetto, in tutti i corsi, citano una delle ore date. */
export function rimandiA (
  progetto: Pick<Progetto, 'integrazioni'>,
  lezioni: ReadonlySet<string>,
): number {
  return rimandiAlleLezioni(progetto).filter((id) => lezioni.has(id)).length
}

/**
 * Stacca le voci del progetto dalle ore che se ne vanno: tengono il giorno
 * dell'ora e perdono il rimando. Prima di togliere le lezioni dal registro.
 */
export function staccaDalleLezioni (
  registro: Registro,
  progetto: Pick<Progetto, 'integrazioni'>,
  lezioni: ReadonlySet<string>,
): void {
  const giorno = (id: string) => registro.lezioni.find((l) => l.id === id)?.data
  for (const integrazione of progetto.integrazioni) {
    for (const compito of integrazione.compiti) {
      if (compito.fineLezioneId && lezioni.has(compito.fineLezioneId)) {
        compito.fine = giorno(compito.fineLezioneId) ?? compito.fine
        compito.fineLezioneId = null
      }
      for (const inizio of compito.inizi) stacca(inizio)
    }
    for (const giudizio of integrazione.giudizi) stacca(giudizio)
    for (const cella of integrazione.matrice) stacca(cella)
  }

  function stacca (voce: { data: Iso, lezioneId: string | null }): void {
    if (!voce.lezioneId || !lezioni.has(voce.lezioneId)) return
    voce.data = giorno(voce.lezioneId) ?? voce.data
    voce.lezioneId = null
  }
}
