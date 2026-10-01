// La rigenerazione automatica dei rapporti: i fogli di un'ora appena chiusa e
// quelli che una scrittura ha reso vecchi, rifatti in coda uno alla volta. Il
// giro comune — trova, componi, scrivi — sta in `reports.ts`.

import * as apparato from 'apparato'

import { datiLezione } from '#core/dominio/reportData.js'
import { classeDelCorsoId } from '#core/dominio/courses.js'
import { formattaData, oggi, semestreDi } from '#core/dominio/dates.js'
import type { Archivio } from '#core/dati/archive.js'
import type { Corso, Lezione, Registro, Semestre } from '#core/dominio/models.js'
import {
  corsiDaRifare,
  giornoDaRifare,
  improntaDi,
  riferimentiSpostati,
  type Impronta,
  type Riferimenti,
} from '#core/dominio/automation.js'
import type { Azione } from '#contract/protocol.js'
import { motivoSicuro } from './context.js'
import {
  conPosto,
  documentiDelCorso,
  scriviTutti,
  stessoDocumento,
  togliProgettiOrfani,
  type Ancora,
} from './reports.js'
import { testi as testiRapporti } from './reports.testi.js'
import { testi } from './reportsRefresh.testi.js'

async function rapportiDiChiusura (
  archivio: Archivio,
  registro: Registro,
  lezione: Lezione,
  ancora: Ancora,
): Promise<{ scritti: number, errori: string[], interrotto?: boolean }> {
  const corso = registro.corsi.find((c) => c.id === lezione.corsoId) ?? null
  const classe = classeDelCorsoId(registro, lezione.corsoId)
  if (!corso || !classe) return { scritti: 0, errori: [] }

  const anno = registro.anni.find((a) => a.id === classe.annoId) ?? null
  // Il semestre in cui cade l'ora, non quello di oggi.
  const semestre = anno ? semestreDi(anno, lezione.data) : null

  const verbale = conPosto(registro, 'lezione', lezione.id, { corsoId: corso.id }, {
    modello: 'verbale-lezione',
    dati: datiLezione(
      registro,
      lezione,
      registro.consegne.filter((c) => c.dataLezioneId === lezione.id),
    ),
  })

  const esito = await scriviTutti(archivio, [
    ...(verbale ? [verbale] : []),
    ...documentiDelCorso(registro, corso, semestre),
  ], ancora, registro.impostazioni.intestazione)
  if (!esito.interrotto) await togliProgettiOrfani(registro, [corso.id])
  return esito
}

/** La fila delle scritture di rapporti: una alla volta, mai due sullo stesso PDF. */
let coda: Promise<unknown> = Promise.resolve()

// Le coppie corso+semestre in attesa di essere rifatte, e il loro timer. La
// chiave tiene il periodo perché i fogli di un corso sono divisi per semestre.
let inAttesa = new Map<string, { corsoId: string, semestreId: string | null }>()
let orologio: ReturnType<typeof setTimeout> | null = null
/** Da quando il più vecchio dei corsi in attesa aspetta: vedi `ATTESA_MASSIMA`. */
let attendeDa = 0
/**
 * Le coppie che una chiusura ha messo in coda e non ha ancora cominciato.
 * L'attesa le salta: `esegui` programma la rigenerazione dopo il gestore, e la
 * chiusura rilegge comunque il registro al suo turno.
 */
const appenaAccodate = new Set<string>()

/** La chiave di un corso in un periodo: `corsoId|semestreId`, con l'anno intero vuoto. */
function chiaveAttesa (corsoId: string, semestreId: string | null): string {
  return `${corsoId}|${semestreId ?? ''}`
}

/** Il semestre in cui cade un giorno, per il corso dato; l'anno intero se non ce ne sono. */
function semestreDelCorso (registro: Registro, corso: Corso, giorno: string): Semestre | null {
  const classe = classeDelCorsoId(registro, corso.id)
  const anno = classe ? registro.anni.find((a) => a.id === classe.annoId) ?? null : null
  return anno ? semestreDi(anno, giorno) : null
}

/**
 * Rifà in coda i documenti di un'ora appena chiusa e avvisa a cose fatte.
 * Tiene l'archivio, non il registro: una rilettura sostituisce l'oggetto, e
 * al turno della coda si vuole lo stato di adesso.
 */
export function aggiornaDopoChiusura (archivio: Archivio, lezione: Lezione): void {
  const registro = archivio.registro
  if (registro.impostazioni.pdfAutomatici === 'mai') return
  const corso = registro.corsi.find((c) => c.id === lezione.corsoId) ?? null
  // Se al turno documento o anno sono cambiati, non si scrive niente.
  const documentoAtteso = archivio.documentoAperto?.toString() ?? null
  const annoAtteso = registro.annoCorrenteId
  // La coppia che la chiusura rifà esce dall'attesa, così non si scrive due
  // volte; le altre (es. l'altro semestre) restano.
  const chiave = corso
    ? chiaveAttesa(corso.id, semestreDelCorso(registro, corso, lezione.data)?.id ?? null)
    : null
  if (chiave) {
    inAttesa.delete(chiave)
    appenaAccodate.add(chiave)
  }

  coda = coda
    .then(async () => {
      // Da qui le modifiche nuove le riprende l'attesa.
      if (chiave) appenaAccodate.delete(chiave)
      // Un altro documento o anno aperto: i fogli si lasciano indietro.
      const ora = archivio.registro
      const documentoOra = archivio.documentoAperto?.toString() ?? null
      if (documentoOra !== documentoAtteso || ora.annoCorrenteId !== annoAtteso) {
        return { scritti: 0, errori: [] }
      }
      // L'ora ripresa dal registro di adesso, che può essere stata corretta.
      const suo = ora.lezioni.find((l) => l.id === lezione.id)
      if (!suo) return { scritti: 0, errori: [] }
      const ancora = stessoDocumento(archivio, documentoAtteso, annoAtteso)
      return rapportiDiChiusura(archivio, ora, suo, ancora)
    })
    .then((esito) => {
      if (esito.scritti === 0 && esito.errori.length === 0) return
      // Interrotta dal cambio di documento: niente avviso.
      if (esito.interrotto) return
      const t = testi()
      const dove = corso ? testiRapporti().diCorso(corso.titolo) : ''
      if (esito.errori.length > 0) {
        void apparato.dialoghi.avvisa(
          t.aggiornatiConErrori(esito.scritti, dove, esito.errori.length, esito.errori[0]),
        )
        return
      }
      void apparato.dialoghi.informa(
        t.aggiornatiDopo(esito.scritti, dove, formattaData(lezione.data)),
      )
    })
    // Una chiusura andata storta non deve bloccare la fila di quelle dopo.
    .catch((errore: unknown) => {
      void apparato.dialoghi.avvisa(
        testi().nonRifattiDellaLezione(formattaData(lezione.data), motivoSicuro(errore)),
      )
    })
}

// ------------------------------------------------------- a ogni modifica

/** Quanto si aspetta che le modifiche si fermino prima di rifare i fogli. */
const ATTESA_RIGENERAZIONE = 8000

/** Tetto al rinvio: chi scrive senza pause vede comunque rifare i fogli. */
const ATTESA_MASSIMA = 60000

/**
 * Rifà i documenti dei corsi toccati quando le modifiche si fermano. Tace se
 * va bene, avvisa se fallisce. Tiene l'archivio, non il registro: una
 * rilettura (`leggiTutto`) sostituisce l'oggetto, e allo scadere serve lo
 * stato di adesso; documento e anno catturati impediscono di scrivere nella
 * cartella di un altro anno.
 */
function programmaRigenerazione (
  archivio: Archivio,
  corsiIds: string[],
  giorno: string | null = null,
): void {
  const registro = archivio.registro
  const documentoAtteso = archivio.documentoAperto?.toString() ?? null
  const annoAtteso = registro.annoCorrenteId
  if (registro.impostazioni.pdfAutomatici !== 'sempre' || corsiIds.length === 0) return
  for (const id of corsiIds) {
    const corso = registro.corsi.find((c) => c.id === id)
    if (!corso) continue
    // Il periodo dei dati toccati; senza un giorno, quello di oggi.
    const semestre = semestreDelCorso(registro, corso, giorno ?? oggi())
    const chiave = chiaveAttesa(corso.id, semestre?.id ?? null)
    // La chiusura in coda la rifarà comunque, e con i dati del suo turno.
    if (appenaAccodate.has(chiave)) continue
    inAttesa.set(chiave, {
      corsoId: corso.id,
      semestreId: semestre?.id ?? null,
    })
  }
  if (inAttesa.size === 0) return

  const adesso = Date.now()
  if (attendeDa === 0) attendeDa = adesso
  // Si rimanda al più fino a `ATTESA_MASSIMA` dal più vecchio in attesa.
  const restano = Math.min(ATTESA_RIGENERAZIONE, Math.max(0, attendeDa + ATTESA_MASSIMA - adesso))

  if (orologio) clearTimeout(orologio)
  orologio = setTimeout(() => {
    orologio = null
    attendeDa = 0
    const daFare = [...inAttesa.values()]
    inAttesa = new Map()

    coda = coda
      .then(async () => {
        const ora = archivio.registro
        const documentoOra = archivio.documentoAperto?.toString() ?? null
        if (documentoOra !== documentoAtteso || ora.annoCorrenteId !== annoAtteso) {
          // Un altro documento o anno aperto: si lasciano indietro.
          return
        }
        const da = daFare.flatMap(({ corsoId, semestreId }) => {
          const corso = ora.corsi.find((c) => c.id === corsoId)
          if (!corso) return []
          const classe = classeDelCorsoId(ora, corso.id)
          const anno = classe ? ora.anni.find((a) => a.id === classe.annoId) ?? null : null
          // Il semestre segnato quando la modifica è arrivata.
          const semestre = anno?.semestri.find((s) => s.id === semestreId) ?? null
          return documentiDelCorso(ora, corso, semestre)
        })
        const esito = await scriviTutti(
          archivio,
          da,
          stessoDocumento(archivio, documentoAtteso, annoAtteso),
          ora.impostazioni.intestazione,
        )
        // Fermato dal cambio di documento: in silenzio.
        if (esito.interrotto) return
        await togliProgettiOrfani(ora, daFare.map(({ corsoId }) => corsoId))
        if (esito.errori.length > 0) {
          void apparato.dialoghi.avvisa(testi().nonRifatti(esito.errori.length, esito.errori[0]))
        }
      })
      .catch((errore: unknown) => {
        void apparato.dialoghi.avvisa(testi().nonRifattiPerche(motivoSicuro(errore)))
      })
  }, restano)
}

/**
 * Gli id che un'azione porta con sé (`corsoId`, `lezioneId`…), letti dal
 * messaggio: un'azione nuova entra nell'automazione senza registrarla.
 */
function riferimentiDi (azione: Azione | Record<string, unknown>): Riferimenti {
  const dati = azione as unknown as Record<string, unknown>
  const id = (nome: string, da: Record<string, unknown> = dati) =>
    (typeof da[nome] === 'string' ? (da[nome]) : null)
  // Chi salva un oggetto intero (`ore.salva`, `valutazioni.salva`…) porta l'id
  // dentro l'oggetto, non accanto: senza guardarci, modificare un'ora dal suo
  // modulo non rifarebbe i fogli del corso.
  const dentro = (nome: string, campo = 'id') => {
    const oggetto = dati[nome]
    return oggetto !== null && typeof oggetto === 'object'
      ? id(campo, oggetto as Record<string, unknown>)
      : null
  }
  return {
    corsoId: id('corsoId') ?? dentro('corso') ?? dentro('consegna', 'corsoId') ?? dentro('progetto', 'corsoId'),
    lezioneId: id('lezioneId') ?? dentro('lezione'),
    valutazioneId: id('valutazioneId') ?? dentro('valutazione'),
    pianoId: id('pianoId') ?? dentro('piano'),
    classeId: id('classeId') ?? dentro('classe'),
    allievoId: id('allievoId'),
    progettoId: id('progettoId') ?? dentro('progetto'),
  }
}

/**
 * Dove stava tutto prima di una scrittura, se poi i fogli si rifaranno: si
 * prende subito prima di scrivere e si passa a `rigeneraDopoScrittura`. Con
 * i PDF non automatici non serve, e non si paga.
 */
export function primaDiScrivere (archivio: Archivio): Impronta | null {
  const registro = archivio.registro
  return registro.impostazioni.pdfAutomatici === 'sempre' ? improntaDi(registro) : null
}

/**
 * Mette in attesa i documenti che una scrittura riuscita ha reso vecchi.
 * Fuori da `esegui` perché valga anche per `chiama()` (assistente, condotto);
 * `dati` è l'azione o l'ingresso di una procedura. Con l'impronta di prima
 * (`primaDiScrivere`) anche i due capi di ogni spostamento: un'ora passata a
 * un altro corso o semestre invecchia i fogli di dove stava, non solo di dove
 * sta. Idempotente: le coppie in attesa sono chiavi.
 */
export function rigeneraDopoScrittura (
  archivio: Archivio,
  dati: Azione | Record<string, unknown>,
  prima: Impronta | null = null,
): void {
  const registro = archivio.registro
  const tutti = [riferimentiDi(dati), ...(prima ? riferimentiSpostati(prima, registro) : [])]
  for (const riferimenti of tutti) {
    // Il giorno della modifica decide il periodo dei fogli da rifare.
    programmaRigenerazione(
      archivio,
      corsiDaRifare(registro, riferimenti),
      giornoDaRifare(registro, riferimenti),
    )
  }
}

/** Quante coppie aspettano di avere i fogli rifatti. Per le prove. */
export function rigenerazioniInAttesa (): number {
  return inAttesa.size
}

/**
 * Per `spegni()`: scarta l'attesa (non ancora cominciata) e aspetta la coda,
 * perché un PDF scritto a metà resterebbe rotto. La promessa non rifiuta mai.
 */
export function fermaRapporti (): Promise<void> {
  if (orologio) clearTimeout(orologio)
  orologio = null
  attendeDa = 0
  inAttesa = new Map()
  appenaAccodate.clear()
  return coda.then(() => undefined, () => undefined)
}
