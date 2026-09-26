// I rapporti in PDF (verbale, piano, valutazioni, presenze, fascicolo, scheda).
// Modelli e dati stanno altrove (`data/templates.ts`, `domain/reportData.ts`):
// qui il giro comune — trova, componi, scrivi — e la rigenerazione automatica.

import * as apparato from 'apparato'

import { aggiornaComposizioni } from './compositions.js'
import { scriviGenerato } from '../data/exports.js'
import {
  collocazioneDi,
  percorsoDi,
  precedentiDi,
  type Collocazione,
  type ContestoRapporto,
  type GenereRapporto,
} from '../domain/locations.js'
import { blocchi, modello, paroleDeiModelli } from '../data/templates.js'
import type { CartaIntestata, Intestazione } from '../domain/models.js'
import { CHIAVE_CARTA } from '../domain/reportData.js'
import { NOME_LOGO, conIntestazione } from '../domain/reports.js'
import { componiPdf } from '../data/reportsPdf.js'
import { contenutoDi } from '../data/store.js'
import {
  datiAllievo,
  datiFascicolo,
  datiFotoClasse,
  datiLezione,
  datiMomento,
  datiPiano,
  datiPresenze,
  datiValutazioni,
} from '../domain/reportData.js'
import {
  classeDelCorsoId,
  corsiDellaClasse,
  pianiDelCorso,
  registroDelCorso,
} from '../domain/courses.js'
import { ordinaAllievi } from '../domain/calculations.js'
import { formattaData, nelSemestre, oggi, semestreDi } from '../domain/dates.js'
import type { Archivio } from '../data/archive.js'
import type { Corso, Lezione, Registro, Semestre } from '../domain/models.js'
import type { Blocchi, DatiRapporto, Modello } from '../domain/reports.js'
import { corsiDaRifare, giornoDaRifare, type Riferimenti } from '../domain/automation.js'
import type { Azione } from '../protocol.js'
import { conMessaggio, motivoSicuro, rifiuta, rifiutaCon, type Parte } from './context.js'
import { testi } from './reports.testi.js'

/** Che cosa serve per scrivere il file: il modello, i dati e dove va a finire. */
interface Preparato {
  modello: string
  dati: DatiRapporto
  /** Il posto lo decide il dominio, lo stesso che legge la pagina Documenti. */
  dove: Collocazione
}

/**
 * Le immagini di un rapporto, tutte dentro il documento: `NOME_LOGO` è il logo
 * dell'intestazione, un percorso con barre è un file dell'anno (es. una foto),
 * un nome secco non è niente. Un'immagine che manca non ferma il foglio.
 */
export function immaginiDelDocumento (
  carta: CartaIntestata,
): (nome: string) => Promise<Uint8Array | null> {
  return async (nome) => {
    if (nome === NOME_LOGO) return carta.logo ? contenutoDi(carta.logo) : null
    if (!nome.includes('/')) return null
    return contenutoDi(nome)
  }
}

/** I dati di un rapporto con accanto le parole e i pezzi comuni. */
type DatiComposti = DatiRapporto & {
  frasi: Record<string, string>
  colonne: Record<string, string>
  blocchi: Blocchi
}

/**
 * Un modello pronto per il documento: carta intestata, parole e pezzi comuni.
 * La carta l'hanno già scelta i dati (`CHIAVE_CARTA`): qui la si ritrova.
 */
export function impaginazioneDi (
  nome: string,
  dati: DatiRapporto,
  intestazione: Intestazione,
): { impaginazione: Modello, dati: DatiComposti, carta: CartaIntestata } | null {
  const trovato = modello(nome)
  if (!trovato) return null
  const scelta = dati.valori[CHIAVE_CARTA]
  const carta = intestazione.carte.find((c) => c.id === scelta) ?? intestazione.carte[0]
  // Le parole comuni si aggiungono ai dati, non li sostituiscono.
  const parole = paroleDeiModelli()
  return {
    impaginazione: conIntestazione(trovato, carta),
    dati: { ...dati, frasi: parole.frasi, colonne: parole.colonne, blocchi: blocchi() },
    carta,
  }
}

/**
 * Se il documento aperto è ancora quello su cui un lavoro è partito. Si
 * ricontrolla a ogni foglio: il cambio di documento può arrivare a metà fila, e
 * `scriviGenerato` scriverebbe nel `.regi` nuovo.
 */
type Ancora = () => boolean

/** L'ancora di un documento e di un anno, presi da chi la chiede. */
function stessoDocumento (
  archivio: Archivio,
  documento: string | null,
  anno: string | null,
): Ancora {
  return () =>
    (archivio.documentoAperto?.toString() ?? null) === documento &&
    archivio.registro.annoCorrenteId === anno
}

/** L'ancora del documento aperto adesso. */
function ancoraAdesso (archivio: Archivio): Ancora {
  return stessoDocumento(
    archivio,
    archivio.documentoAperto?.toString() ?? null,
    archivio.registro.annoCorrenteId,
  )
}

/**
 * Com'è andata la scrittura di un rapporto. `interrotto`: il documento è
 * cambiato a metà, e chi scrive una fila si ferma invece di contarlo come errore.
 */
type Scrittura = { relativo: string } | { errore: string, interrotto?: true }

/** Compone un rapporto e lo scrive dove va, senza aprirlo. Comune al pulsante e all'automazione. */
async function scriviRapporto (
  preparato: Preparato,
  ancora: Ancora,
  intestazione: Intestazione,
): Promise<Scrittura> {
  const t = testi()
  const pronto = impaginazioneDi(preparato.modello, preparato.dati, intestazione)
  if (!pronto) return { errore: t.senzaModello(preparato.modello) }
  const { impaginazione, dati } = pronto

  let byte: Uint8Array
  try {
    byte = await componiPdf(impaginazione, dati, immaginiDelDocumento(pronto.carta))
  } catch (errore) {
    return { errore: t.composizioneFallita(motivoSicuro(errore)) }
  }

  const relativo = percorsoDi(preparato.dove)
  // Dopo la composizione (l'attesa lunga, dove il documento può cambiare):
  // fra questa riga e `scriviGenerato` non ci sono attese.
  if (!ancora()) return { errore: t.giroInterrotto, interrotto: true }
  if (!(await scriviGenerato(relativo, byte, precedentiDi(preparato.dove)))) {
    return { errore: t.senzaCartella }
  }
  return { relativo }
}

/**
 * I fogli di un corso che invecchiano con i dati (presenze, voti, schede di
 * allievi e prove): quelli che l'automazione rifà. Si scrivono, non si aprono.
 */
function documentiDelCorso (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): Preparato[] {
  const classe = classeDelCorsoId(registro, corso.id)
  if (!classe) return []
  const dove = { corsoId: corso.id, semestreId: semestre?.id ?? null }

  return [
    // Prima i fogli del corso intero, poi uno per allievo.
    conPosto(registro, 'presenze', corso.id, dove, {
      modello: 'presenze-classe',
      dati: datiPresenze(registro, corso, semestre),
    }),
    conPosto(registro, 'valutazioni', corso.id, dove, {
      modello: 'valutazioni-classe',
      dati: datiValutazioni(registro, corso, semestre),
    }),
    // Anche chi si è ritirato: la sua scheda deve mostrare il ritiro.
    ...ordinaAllievi(classe.allievi).map((allievo) =>
      conPosto(registro, 'allievo', allievo.id, dove, {
        modello: 'scheda-allievo',
        dati: datiAllievo(registro, classe, allievo, semestre, corso),
      }),
    ),
    // Una scheda per prova, con la sua distribuzione.
    ...registro.valutazioni
      .filter((momento) => momento.corsoId === corso.id && nelSemestre(semestre, momento.data))
      .map((momento) =>
        conPosto(registro, 'momento', momento.id, dove, {
          modello: 'momento-valutazione',
          dati: datiMomento(registro, momento),
        }),
      ),
  ].filter((preparato): preparato is Preparato => preparato !== null)
}

/**
 * Tutti i PDF di un corso, per «Aggiorna tutto»: `documentiDelCorso` più
 * verbali delle ore svolte, piani, ritratti e fascicolo (se docente di classe).
 * Le ore non svolte restano fuori: il verbale uscirebbe vuoto.
 */
function tuttoDelCorso (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): Preparato[] {
  const classe = classeDelCorsoId(registro, corso.id)
  if (!classe) return []
  const dove = { corsoId: corso.id, semestreId: semestre?.id ?? null }

  const verbali = registroDelCorso(registro, corso.id)
    .filter((l) => l.stato === 'svolta' && nelSemestre(semestre, l.data))
    .map((lezione) =>
      conPosto(registro, 'lezione', lezione.id, dove, {
        modello: 'verbale-lezione',
        dati: datiLezione(
          registro,
          lezione,
          registro.consegne.filter((c) => c.dataLezioneId === lezione.id),
        ),
      }),
    )

  // I piani non hanno periodo.
  const piani = pianiDelCorso(registro, corso.id).map((piano) =>
    conPosto(registro, 'piano', piano.id, dove, {
      modello: 'piano-lezione',
      dati: datiPiano(registro, piano),
    }),
  )

  const facce = conPosto(registro, 'foto-classe', corso.id, dove, {
    modello: 'foto-classe',
    dati: datiFotoClasse(registro, classe),
  })

  // Il fascicolo è della classe: solo dove si è docente di classe.
  const fascicolo = classe.docenteDiClasse
    ? conPosto(registro, 'fascicolo', classe.id, dove, {
        modello: 'fascicolo-classe',
        dati: datiFascicolo(registro, classe),
      })
    : null

  return [
    ...documentiDelCorso(registro, corso, semestre),
    ...verbali,
    ...piani,
    facce,
    fascicolo,
  ].filter((preparato): preparato is Preparato => preparato !== null)
}

/** Il modello e i dati più il posto; senza posto (oggetto sparito) il foglio salta. */
function conPosto (
  registro: Registro,
  genere: GenereRapporto,
  id: string,
  contesto: ContestoRapporto,
  resto: Omit<Preparato, 'dove'>,
): Preparato | null {
  const dove = collocazioneDi(registro, genere, id, contesto)
  return dove ? { ...resto, dove } : null
}

/** Il semestre scelto dentro l'anno di una classe, o l'anno intero. */
function semestreScelto (
  registro: Registro,
  classeId: string,
  semestreId: string | null,
): Semestre | null {
  const classe = registro.classi.find((c) => c.id === classeId) ?? null
  const anno = classe ? registro.anni.find((a) => a.id === classe.annoId) ?? null : null
  return anno?.semestri.find((s) => s.id === semestreId) ?? null
}

/** Scrive una fila di rapporti, uno alla volta (la cartella è sincronizzata). */
async function scriviTutti (
  da: Preparato[],
  ancora: Ancora,
  intestazione: Intestazione,
): Promise<{ scritti: number, errori: string[], interrotto: boolean }> {
  let scritti = 0
  const errori: string[] = []
  for (const preparato of da) {
    // Un documento cambiato ferma tutta la fila.
    if (!ancora()) return { scritti, errori: [testi().giroInterrotto, ...errori], interrotto: true }
    const esito = await scriviRapporto(preparato, ancora, intestazione)
    if ('errore' in esito && esito.interrotto) {
      return { scritti, errori: [esito.errore, ...errori], interrotto: true }
    }
    if ('errore' in esito) errori.push(esito.errore)
    else scritti += 1
  }
  return { scritti, errori, interrotto: false }
}

async function rapportiDiChiusura (
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

  return scriviTutti([
    ...(verbale ? [verbale] : []),
    ...documentiDelCorso(registro, corso, semestre),
  ], ancora, registro.impostazioni.intestazione)
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
      return rapportiDiChiusura(ora, suo, stessoDocumento(archivio, documentoAtteso, annoAtteso))
    })
    .then((esito) => {
      if (esito.scritti === 0 && esito.errori.length === 0) return
      // Interrotta dal cambio di documento: niente avviso.
      if (esito.interrotto) return
      const t = testi()
      const dove = corso ? t.diCorso(corso.titolo) : ''
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
          da,
          stessoDocumento(archivio, documentoAtteso, annoAtteso),
          ora.impostazioni.intestazione,
        )
        // Fermato dal cambio di documento: in silenzio.
        if (esito.interrotto) return
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
  const id = (nome: string) => (typeof dati[nome] === 'string' ? (dati[nome]) : null)
  return {
    corsoId: id('corsoId'),
    lezioneId: id('lezioneId'),
    valutazioneId: id('valutazioneId'),
    pianoId: id('pianoId'),
    classeId: id('classeId'),
    allievoId: id('allievoId'),
  }
}

/**
 * Mette in attesa i documenti che una scrittura riuscita ha reso vecchi.
 * Fuori da `esegui` perché valga anche per `chiama()` (assistente, condotto);
 * `dati` è l'azione o l'ingresso di una procedura. Idempotente: le coppie in
 * attesa sono chiavi.
 */
export function rigeneraDopoScrittura (
  archivio: Archivio,
  dati: Azione | Record<string, unknown>,
): void {
  const registro = archivio.registro
  const riferimenti = riferimentiDi(dati)
  // Il giorno della modifica decide il periodo dei fogli da rifare.
  programmaRigenerazione(
    archivio,
    corsiDaRifare(registro, riferimenti),
    giornoDaRifare(registro, riferimenti),
  )
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

export const rapporti = {
  /**
   * Compone un rapporto e torna il percorso, senza aprirlo: lo mostra la
   * cornice della pagina Documenti.
   */
  'rapporto.genera': async (contesto, azione) => {
    const t = testi()
    const registro = contesto.registro
    const ancora = ancoraAdesso(contesto.archivio)
    const dove = collocazioneDi(registro, azione.genere, azione.id, {
      corsoId: azione.corsoId ?? null,
      semestreId: azione.semestreId ?? null,
    })
    let pezzi: Omit<Preparato, 'dove'> | null = null

    if (azione.genere === 'lezione') {
      const lezione = registro.lezioni.find((l) => l.id === azione.id)
      if (!lezione) return rifiuta(t.lezioneNonTrovata)
      const consegne = registro.consegne.filter((c) => c.dataLezioneId === lezione.id)
      pezzi = { modello: 'verbale-lezione', dati: datiLezione(registro, lezione, consegne) }
    }

    if (azione.genere === 'piano') {
      const piano = registro.piani.find((p) => p.id === azione.id)
      if (!piano) return rifiuta(t.pianoNonTrovato)
      pezzi = { modello: 'piano-lezione', dati: datiPiano(registro, piano) }
    }

    // Valutazioni e presenze sono di un corso: medie e ore non si mescolano fra materie.
    if (azione.genere === 'valutazioni' || azione.genere === 'presenze') {
      const corso = registro.corsi.find((c) => c.id === azione.id)
      if (!corso) return rifiuta(t.corsoNonTrovato)
      const semestre = semestreScelto(registro, corso.classeId, azione.semestreId ?? null)
      pezzi =
        azione.genere === 'presenze'
          ? { modello: 'presenze-classe', dati: datiPresenze(registro, corso, semestre) }
          : { modello: 'valutazioni-classe', dati: datiValutazioni(registro, corso, semestre) }
    }

    // Una prova sola: il periodo lo dà la sua data.
    if (azione.genere === 'momento') {
      const momento = registro.valutazioni.find((v) => v.id === azione.id)
      if (!momento) return rifiuta(t.momentoNonTrovato)
      pezzi = { modello: 'momento-valutazione', dati: datiMomento(registro, momento) }
    }

    if (azione.genere === 'fascicolo') {
      const classe = registro.classi.find((c) => c.id === azione.id)
      if (!classe) return rifiuta(t.classeNonTrovata)
      pezzi = { modello: 'fascicolo-classe', dati: datiFascicolo(registro, classe) }
    }

    // I ritratti sono della classe ma si chiedono da un corso, nella cui cartella vanno.
    if (azione.genere === 'foto-classe') {
      const corso = registro.corsi.find((c) => c.id === azione.id)
      const classe = corso
        ? classeDelCorsoId(registro, corso.id)
        : registro.classi.find((c) => c.id === azione.id) ?? null
      if (!classe) return rifiuta(t.classeNonTrovata)
      pezzi = { modello: 'foto-classe', dati: datiFotoClasse(registro, classe) }
    }

    if (azione.genere === 'allievo') {
      const classe = registro.classi.find((c) => c.allievi.some((a) => a.id === azione.id)) ?? null
      const allievo = classe?.allievi.find((a) => a.id === azione.id) ?? null
      if (!classe || !allievo) return rifiuta(t.pifNonTrovato)
      const semestre = semestreScelto(registro, classe.id, azione.semestreId ?? null)
      // Il corso indicato, o l'unico della classe; con più corsi e nessuno
      // indicato la scheda è della classe (come sceglie la collocazione).
      const suoi = corsiDellaClasse(registro, classe.id)
      const corso =
        suoi.find((c) => c.id === azione.corsoId) ?? (suoi.length === 1 ? suoi[0] : null)
      pezzi = {
        modello: 'scheda-allievo',
        dati: datiAllievo(registro, classe, allievo, semestre, corso),
      }
    }

    if (!pezzi || !dove) return rifiuta(t.rapportoSconosciuto)

    const intestazione = registro.impostazioni.intestazione
    const esito = await scriviRapporto({ ...pezzi, dove }, ancora, intestazione)
    if ('errore' in esito && esito.interrotto) return rifiutaCon('conflitto', esito.errore)
    if ('errore' in esito) return rifiuta(esito.errore)

    return conMessaggio(t.scritto(esito.relativo), 'info', {
      documento: esito.relativo,
    })
  },

  /**
   * Tutti i PDF di un corso (`tuttoDelCorso`), o di tutti i corsi dell'anno.
   * Non apre niente; se un foglio fallisce va avanti e conta gli errori.
   */
  'rapporto.completo': async (contesto, azione) => {
    const t = testi()
    const registro = contesto.registro
    // Preso all'ingresso: ogni foglio lo ricontrolla prima di scriversi.
    const ancora = ancoraAdesso(contesto.archivio)
    // Senza un corso indicato: solo quelli dell'anno aperto.
    const dellAnno = (corso: Corso): boolean => {
      const classe = classeDelCorsoId(registro, corso.id)
      return Boolean(classe) && classe?.annoId === registro.annoCorrenteId
    }
    const scelti = azione.corsoId
      ? registro.corsi.filter((c) => c.id === azione.corsoId)
      : registro.corsi.filter(dellAnno)
    if (scelti.length === 0) {
      return rifiuta(azione.corsoId ? t.corsoNonTrovato : t.nessunCorso)
    }

    const da = scelti.flatMap((corso) => {
      const classe = classeDelCorsoId(registro, corso.id)
      const anno = classe ? registro.anni.find((a) => a.id === classe.annoId) ?? null : null
      // Un semestre solo per tutti i corsi.
      const semestre = anno?.semestri.find((s) => s.id === azione.semestreId) ?? null
      return tuttoDelCorso(registro, corso, semestre)
    })

    // Un foglio una volta sola: due corsi della stessa classe chiedono lo stesso fascicolo.
    const unaVolta = new Map<string, Preparato>()
    for (const preparato of da) unaVolta.set(percorsoDi(preparato.dove), preparato)

    const intestazione = registro.impostazioni.intestazione
    const esito = await scriviTutti([...unaVolta.values()], ancora, intestazione)
    // Fermato a metà: niente fascicoli, e si dice quanti fogli erano usciti.
    if (esito.interrotto) {
      return rifiutaCon(
        'conflitto',
        esito.scritti > 0 ? `${t.giroInterrotto} ${t.giaScritti(esito.scritti)}` : t.giroInterrotto,
      )
    }
    // Le composizioni dopo i fogli, così contengono quelli appena scritti.
    const fascicoli = await aggiornaComposizioni()
    const dove = scelti.length === 1 ? t.diCorso(scelti[0].titolo) : t.diCorsi(scelti.length)
    // Zero scritti con errori è un fallimento, non un avviso.
    if (esito.scritti === 0 && esito.errori.length > 0) {
      return rifiuta(t.nessunoScritto(dove, esito.errori[0]))
    }
    if (esito.errori.length > 0) {
      return conMessaggio(
        t.scrittiConErrori(esito.scritti, dove, esito.errori.length, esito.errori[0]),
        'avviso',
      )
    }
    return conMessaggio(t.scrittiTutti(esito.scritti, dove, fascicoli), 'info')
  },
} satisfies Parte
