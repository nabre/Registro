// Tutto quel che resta da fare, raccolto per classe: assenze da far firmare
// (`absences.ts`), prove da correggere e ridare (`returns.ts`), recuperi
// (`retakes.ts`), consegne (`assignments.ts`). Restano mucchi distinti, ma
// tagliati per classe: la domanda è «per la DIC4a, che cosa manca?».
//
// Sta nel dominio perché è un giudizio sui dati: la pagina Todo e la scheda
// nel registro di una classe leggono gli stessi conti.

import {
  richiesteAperte,
  richiesteFirma,
  type RichiesteFirma,
} from './absences.js'
import { consegneDaFare, raccoglieDocumento, type ConsegneDaFare } from './assignments.js'
import { segnalazioniAssenza, type SegnalazioneAssenza } from './alerts.js'
import {
  recuperiDaFare,
  recuperiUrgenti,
  type RecuperiDaFare,
} from './retakes.js'
import {
  riconsegneAgliAllievi,
  riconsegneAperte,
  riconsegneDaFare,
  riconsegneUrgenti,
  type RiconsegnaAllievo,
  type RiconsegneDaFare,
} from './returns.js'
import { semestreDi } from './dates.js'
import type { Classe, Consegna, Corso, Iso, Registro, Semestre } from './models.js'
import { confrontaNomi } from './text.js'
import { testi } from './todo.testi.js'

/**
 * Le tipologie di lavoro, nell'ordine in cui pesano: chi deve fare che cosa.
 * Due senza un «chi» (assenze: firma l'azienda; valutazioni: chi corregge) e
 * quattro dall'incrocio fra chi tocca (classe, docente) e gesto (consegnare un
 * foglio, svolgere qualcosa).
 *
 * In cima quel che non si recupera da soli (l'azienda che firma, la classe che
 * aspetta il voto, gli allievi che devono portare), in fondo quel che dipende
 * solo da chi tiene il registro.
 */
export type FamigliaTodo =
  | 'assenze'
  | 'segnalazioni'
  | 'valutazioni'
  | 'consegnaClasse'
  | 'svolgeClasse'
  | 'consegnaDocente'
  | 'svolgeDocente'

export const FAMIGLIE_TODO: readonly FamigliaTodo[] = [
  'assenze',
  'segnalazioni',
  'valutazioni',
  'consegnaClasse',
  'svolgeClasse',
  'consegnaDocente',
  'svolgeDocente',
]

/**
 * Le quattro tipologie che nascono da una consegna, letta secondo chi tocca e
 * che gesto è. Assenze e valutazioni non sono consegne.
 */
type FamigliaConsegna = Exclude<FamigliaTodo, 'assenze' | 'segnalazioni' | 'valutazioni'>

export const FAMIGLIE_CONSEGNA: readonly FamigliaConsegna[] = [
  'consegnaClasse',
  'svolgeClasse',
  'consegnaDocente',
  'svolgeDocente',
]

/** Come si chiama una tipologia: chi fa che cosa. */
export function nomeFamiglia (famiglia: FamigliaTodo): string {
  return testi().nomi[famiglia]
}

/** Una riga di spiegazione, per quando la tipologia è vuota o va presentata. */
export function descriviFamiglia (famiglia: FamigliaTodo): string {
  return testi().descrizioni[famiglia]
}

/**
 * In quale tipologia cade una consegna. Passa un foglio? Lo dice la categoria
 * del documento; senza, è qualcosa da fare e spuntare. Da che parte va? Un
 * documento distribuito (`verso: 'consegno'`) è lavoro del docente, uno
 * raccolto è della classe; una consegna indirizzata al docente è sempre sua.
 */
function famigliaDiConsegna (consegna: Consegna): FamigliaConsegna {
  const delDocente = consegna.a === 'docente'
  if (raccoglieDocumento(consegna)) {
    return delDocente || consegna.verso === 'consegno' ? 'consegnaDocente' : 'consegnaClasse'
  }
  return delDocente ? 'svolgeDocente' : 'svolgeClasse'
}

/** Quanto pesa una famiglia in una classe: quante pendenze, e quante premono. */
interface ContoFamiglia {
  aperti: number
  /** Quelle in ritardo, o che nessun automatismo chiuderà: danno il tono. */
  urgenti: number
}

/** Tutto il lavoro aperto di una classe, diviso per famiglia. */
export interface TodoClasse {
  classeId: string
  classe: string
  /** I rapporti di assenze e ritardi: da spedire, e in attesa della firma. */
  assenze: RichiesteFirma
  /** Chi ha passato la soglia di assenza, corso per corso (vedi `alerts.ts`). */
  segnalazioni: SegnalazioneAssenza[]
  /** Le prove svolte e i recuperi: due elenchi che si leggono insieme. */
  riconsegne: RiconsegneDaFare
  recuperi: RecuperiDaFare
  /** Chi non ha ancora riavuto la sua prova, nome per nome. */
  singoli: RiconsegnaAllievo[]
  /**
   * Le consegne, un mucchio per tipologia: si guardano in momenti diversi, e
   * mescolate confonderebbero una pagella con un esercizio.
   */
  consegne: Record<FamigliaConsegna, ConsegneDaFare>
  conti: Record<FamigliaTodo, ContoFamiglia>
  aperti: number
  urgenti: number
}

/** Il totale di tutte le classi, per la testata della pagina. */
export interface RiepilogoTodo {
  classi: TodoClasse[]
  conti: Record<FamigliaTodo, ContoFamiglia>
  aperti: number
  urgenti: number
}

function contoVuoto (): Record<FamigliaTodo, ContoFamiglia> {
  return {
    assenze: { aperti: 0, urgenti: 0 },
    segnalazioni: { aperti: 0, urgenti: 0 },
    valutazioni: { aperti: 0, urgenti: 0 },
    consegnaClasse: { aperti: 0, urgenti: 0 },
    svolgeClasse: { aperti: 0, urgenti: 0 },
    consegnaDocente: { aperti: 0, urgenti: 0 },
    svolgeDocente: { aperti: 0, urgenti: 0 },
  }
}

/** Quattro mucchi vuoti, uno per tipologia di consegna. */
function consegneVuote (): Record<FamigliaConsegna, ConsegneDaFare> {
  return {
    consegnaClasse: { arretrate: [], oggi: [], presto: [], avanti: [], completate: [] },
    svolgeClasse: { arretrate: [], oggi: [], presto: [], avanti: [], completate: [] },
    consegnaDocente: { arretrate: [], oggi: [], presto: [], avanti: [], completate: [] },
    svolgeDocente: { arretrate: [], oggi: [], presto: [], avanti: [], completate: [] },
  }
}

/** Le consegne aperte di un mucchio: quelle completate non chiedono più niente. */
function aperteDi (gruppi: ConsegneDaFare): number {
  return gruppi.arretrate.length + gruppi.oggi.length + gruppi.presto.length + gruppi.avanti.length
}

/** Ricalcola i conti dai mucchi effettivamente esposti dalla query. */
function normalizzaConti (todo: TodoClasse): TodoClasse {
  const conti = contoVuoto()
  conti.assenze = {
    aperti: richiesteAperte(todo.assenze),
    urgenti: todo.assenze.daSpedire.length,
  }
  conti.segnalazioni = {
    aperti: todo.segnalazioni.length,
    urgenti: todo.segnalazioni.filter((segnalazione) => segnalazione.confermata).length,
  }
  conti.valutazioni = {
    aperti:
      riconsegneAperte(todo.riconsegne) +
      todo.recuperi.daFissare.length + todo.recuperi.scaduti.length +
      todo.recuperi.oggi.length + todo.recuperi.presto.length +
      todo.recuperi.avanti.length + todo.recuperi.daRiconsegnare.length +
      todo.singoli.length,
    urgenti: riconsegneUrgenti(todo.riconsegne) + recuperiUrgenti(todo.recuperi),
  }
  for (const famiglia of FAMIGLIE_CONSEGNA) {
    conti[famiglia] = {
      aperti: aperteDi(todo.consegne[famiglia]),
      urgenti: todo.consegne[famiglia].arretrate.length,
    }
  }
  return {
    ...todo,
    conti,
    aperti: FAMIGLIE_TODO.reduce((somma, famiglia) => somma + conti[famiglia].aperti, 0),
    urgenti: FAMIGLIE_TODO.reduce((somma, famiglia) => somma + conti[famiglia].urgenti, 0),
  }
}

/** Tiene solo le famiglie pertinenti al ruolo, azzerando anche i relativi dati. */
function limitaFamiglie (todo: TodoClasse, tenute: ReadonlySet<FamigliaTodo>): TodoClasse {
  const vuote = consegneVuote()
  return normalizzaConti({
    ...todo,
    assenze: tenute.has('assenze')
      ? todo.assenze
      : { daSpedire: [], inAttesa: [], firmate: [] },
    segnalazioni: tenute.has('segnalazioni') ? todo.segnalazioni : [],
    riconsegne: tenute.has('valutazioni')
      ? todo.riconsegne
      : { daCorreggere: [], daRiconsegnare: [], fatte: [] },
    recuperi: tenute.has('valutazioni')
      ? todo.recuperi
      : {
          scaduti: [], daFissare: [], oggi: [], presto: [], avanti: [],
          daRiconsegnare: [], chiusi: [],
        },
    singoli: tenute.has('valutazioni') ? todo.singoli : [],
    consegne: Object.fromEntries(
      FAMIGLIE_CONSEGNA.map((famiglia) => [
        famiglia,
        tenute.has(famiglia) ? todo.consegne[famiglia] : vuote[famiglia],
      ]),
    ) as Record<FamigliaConsegna, ConsegneDaFare>,
  })
}

/**
 * Divide le consegne nelle quattro tipologie, tenendo i mucchi per scadenza:
 * raccogliere, distribuire, far svolgere e fare sono lavori diversi.
 */
function dividiConsegne (gruppi: ConsegneDaFare): Record<FamigliaConsegna, ConsegneDaFare> {
  const esito = consegneVuote()
  for (const chiave of Object.keys(gruppi) as Array<keyof ConsegneDaFare>) {
    for (const consegna of gruppi[chiave]) {
      esito[famigliaDiConsegna(consegna)][chiave].push(consegna)
    }
  }
  return esito
}

/**
 * Il lavoro aperto di una classe sola. I corsi li sceglie chi chiama (filtro
 * del pannello); qui si tengono solo quelli di questa classe.
 */
export function todoDellaClasse (
  registro: Registro,
  classe: Classe,
  corsi: Array<{ id: string, classeId: string }>,
  giorno: Iso,
  tieniConsegna: (consegna: Consegna) => boolean = () => true,
): TodoClasse {
  const suoi = corsi.filter((corso) => corso.classeId === classe.id)

  const assenze = richiesteFirma(registro, [classe])
  // Le assenze oltre soglia si contano sul semestre in corso: sull'anno intero
  // a novembre non direbbero niente, e a giugno nasconderebbero chi ha
  // cominciato a mancare a gennaio.
  const segnalazioni = segnalazioniAssenza(
    registro,
    suoi
      .map((corso) => registro.corsi.find((candidato) => candidato.id === corso.id))
      .filter((corso): corso is Corso => corso !== undefined),
    semestreDelGiorno(registro, classe, giorno),
  )
  const riconsegne = riconsegneDaFare(registro, suoi, giorno)
  const recuperi = recuperiDaFare(registro, suoi, giorno)
  const singoli = riconsegneAgliAllievi(registro, suoi, giorno)
  const consegne = dividiConsegne(
    filtraConsegne(consegneDaFare(registro, suoi, giorno), tieniConsegna),
  )

  return normalizzaConti({
    classeId: classe.id,
    classe: classe.nome,
    assenze,
    segnalazioni,
    riconsegne,
    recuperi,
    singoli,
    consegne,
    conti: contoVuoto(),
    aperti: 0,
    urgenti: 0,
  })
}

/** Lavoro legato a un corso: valutazioni e consegne, senza compiti di classe. */
export function todoDelCorso (
  registro: Registro,
  classe: Classe,
  corso: Corso,
  giorno: Iso,
): TodoClasse {
  return limitaFamiglie(
    todoDellaClasse(registro, classe, [corso], giorno),
    new Set(['valutazioni', ...FAMIGLIE_CONSEGNA]),
  )
}

/** Lavoro del docente di classe: pratiche e consegne dovute da classe/allievi. */
export function todoDelDocenteDiClasse (
  registro: Registro,
  classe: Classe,
  corsi: Corso[],
  giorno: Iso,
): TodoClasse {
  const base = todoDellaClasse(
    registro,
    classe,
    corsi,
    giorno,
    (consegna) => consegna.a !== 'docente',
  )
  return limitaFamiglie(
    base,
    classe.docenteDiClasse
      ? new Set(['assenze', 'segnalazioni', 'consegnaClasse', 'svolgeClasse'])
      : new Set(),
  )
}

/** Il semestre in cui cade il giorno, dentro l'anno della classe. */
function semestreDelGiorno (registro: Registro, classe: Classe, giorno: Iso): Semestre | null {
  const anno = registro.anni.find((candidato) => candidato.id === classe.annoId)
  return anno ? semestreDi(anno, giorno) : null
}

/**
 * Le consegne che passano il filtro della pagina («le mie», «delle classi»),
 * applicato prima di dividere, così i conti sono quelli delle righe visibili.
 */
function filtraConsegne (
  gruppi: ConsegneDaFare,
  tieni: (consegna: Consegna) => boolean,
): ConsegneDaFare {
  const esito: ConsegneDaFare = {
    arretrate: [], oggi: [], presto: [], avanti: [], completate: [],
  }
  for (const chiave of Object.keys(gruppi) as Array<keyof ConsegneDaFare>) {
    esito[chiave] = gruppi[chiave].filter(tieni)
  }
  return esito
}

/**
 * Il lavoro aperto di tutte le classi date, e il totale. Prima le classi con
 * più cose in ritardo, poi per nome. Le classi senza niente restano con i
 * conti a zero: chi chiama decide se mostrarle.
 */
export function riepilogoTodo (
  registro: Registro,
  classi: Classe[],
  corsi: Corso[],
  giorno: Iso,
  tieniConsegna: (consegna: Consegna) => boolean = () => true,
): RiepilogoTodo {
  const elenco = classi
    .map((classe) => todoDellaClasse(registro, classe, corsi, giorno, tieniConsegna))
    .sort(
      (a, b) => b.urgenti - a.urgenti || b.aperti - a.aperti || confrontaNomi(a.classe, b.classe),
    )

  const conti = contoVuoto()
  for (const classe of elenco) {
    for (const famiglia of FAMIGLIE_TODO) {
      conti[famiglia].aperti += classe.conti[famiglia].aperti
      conti[famiglia].urgenti += classe.conti[famiglia].urgenti
    }
  }

  return {
    classi: elenco,
    conti,
    aperti: FAMIGLIE_TODO.reduce((somma, f) => somma + conti[f].aperti, 0),
    urgenti: FAMIGLIE_TODO.reduce((somma, f) => somma + conti[f].urgenti, 0),
  }
}

/** Le classi che hanno davvero qualcosa da fare: quelle che la pagina mostra. */
export function classiConLavoro (riepilogo: RiepilogoTodo): TodoClasse[] {
  return riepilogo.classi.filter((classe) => classe.aperti > 0)
}
