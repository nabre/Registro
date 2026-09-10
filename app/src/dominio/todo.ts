// Tutto quel che resta da fare, raccolto per classe.
//
// Le cose da fare esistevano già, ognuna nel suo posto: le consegne in
// `consegne.ts`, le prove ferme in `riconsegne.ts`, i recuperi in
// `recuperi.ts`, le richieste di firma in `assenze.ts`. Ognuna sa rispondere
// alla propria domanda, e nessuna sa rispondere a quella che ci si fa davvero
// aprendo il registro: «per la DIC4a, che cosa mi manca?».
//
// Qui le quattro si mettono insieme e si tagliano per classe. Sono quattro
// mestieri distinti — le assenze da far firmare, le prove da correggere e
// ridare, i documenti che vanno e vengono, le attività assegnate — e restano
// distinti anche qui dentro: mescolarli darebbe un elenco lungo in cui non si
// distingue una pagella non consegnata da un esercizio non spuntato. Ma tutti
// e quattro riguardano la stessa classe, e chi entra in quell'aula li porta
// dentro insieme.
//
// Nel dominio e non nella pagina, perché è un giudizio sui dati: quali cose
// premono, quante sono, quali sono in ritardo. La pagina Todo e la scheda che
// sta dentro il registro di una classe leggono da qui, e leggono lo stesso —
// altrimenti due posti contano cose diverse chiamandole con lo stesso nome.

import {
  richiesteAperte,
  richiesteFirma,
  type RichiesteFirma,
} from './assenze.js'
import { consegneDaFare, raccoglieDocumento, type ConsegneDaFare } from './consegne.js'
import {
  recuperiDaFare,
  recuperiUrgenti,
  type RecuperiDaFare,
} from './recuperi.js'
import {
  riconsegneAgliAllievi,
  riconsegneAperte,
  riconsegneDaFare,
  riconsegneUrgenti,
  type RiconsegnaAllievo,
  type RiconsegneDaFare,
} from './riconsegne.js'
import type { Classe, Consegna, Corso, Iso, Registro } from './modelli.js'

/**
 * Le quattro famiglie di lavoro, nell'ordine in cui pesano.
 *
 * L'ordine non è alfabetico ed è quello che conta: le assenze e le prove hanno
 * un termine che qualcun altro fa scadere — l'azienda che deve firmare, la
 * classe che aspetta il voto — mentre i documenti e le attività dipendono solo
 * da chi tiene il registro. Quel che non si può recuperare da soli sta sopra.
 */
export type FamigliaTodo = 'assenze' | 'valutazioni' | 'documenti' | 'attivita'

export const FAMIGLIE_TODO: readonly FamigliaTodo[] = [
  'assenze',
  'valutazioni',
  'documenti',
  'attivita',
]

/** Come si chiama una famiglia, e che lavoro è. */
export function nomeFamiglia (famiglia: FamigliaTodo): string {
  switch (famiglia) {
    case 'assenze':
      return 'Assenze da far firmare'
    case 'valutazioni':
      return 'Prove e recuperi'
    case 'documenti':
      return 'Documenti'
    default:
      return 'Attività'
  }
}

/** Una riga di spiegazione, per quando la famiglia è vuota o va presentata. */
export function descriviFamiglia (famiglia: FamigliaTodo): string {
  switch (famiglia) {
    case 'assenze':
      return 'i rapporti caricati che devono partire, e le firme che devono tornare'
    case 'valutazioni':
      return 'le prove da correggere e da ridare, e i recuperi da fissare'
    case 'documenti':
      return 'quel che si raccoglie dagli allievi e quel che si consegna loro'
    default:
      return 'quel che si è assegnato: esercizi, materiale, cose da portare'
  }
}

/** Quanto pesa una famiglia in una classe: quante pendenze, e quante premono. */
export interface ContoFamiglia {
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
  /** Le prove svolte e i recuperi: due elenchi che si leggono insieme. */
  riconsegne: RiconsegneDaFare
  recuperi: RecuperiDaFare
  /** Chi non ha ancora riavuto la sua prova, nome per nome. */
  singoli: RiconsegnaAllievo[]
  /** Le consegne che portano un documento: certificati, pagelle, moduli. */
  documenti: ConsegneDaFare
  /** Le altre: esercizi, materiale, cose da fare — assegnate o da fare io. */
  attivita: ConsegneDaFare
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
    valutazioni: { aperti: 0, urgenti: 0 },
    documenti: { aperti: 0, urgenti: 0 },
    attivita: { aperti: 0, urgenti: 0 },
  }
}

/** Le consegne aperte di un mucchio: quelle completate non chiedono più niente. */
function aperteDi (gruppi: ConsegneDaFare): number {
  return gruppi.arretrate.length + gruppi.oggi.length + gruppi.presto.length + gruppi.avanti.length
}

/**
 * Divide le consegne in due famiglie: quelle che portano un documento e le
 * altre.
 *
 * Sono due lavori diversi con lo stesso oggetto dentro il registro. Raccogliere
 * un certificato o consegnare una pagella vuol dire un file per ciascuno, una
 * matrice da guardare e spesso una mail; assegnare gli esercizi 4–7 vuol dire
 * una spunta e basta. Chi la domenica sera guarda «i documenti» non vuole
 * scorrere venti compiti per trovare la pagella che non ha ancora dato.
 */
function dividiConsegne (gruppi: ConsegneDaFare): {
  documenti: ConsegneDaFare
  attivita: ConsegneDaFare
} {
  const documenti: ConsegneDaFare = {
    arretrate: [], oggi: [], presto: [], avanti: [], completate: [],
  }
  const attivita: ConsegneDaFare = {
    arretrate: [], oggi: [], presto: [], avanti: [], completate: [],
  }
  for (const chiave of Object.keys(gruppi) as Array<keyof ConsegneDaFare>) {
    for (const consegna of gruppi[chiave]) {
      if (raccoglieDocumento(consegna)) documenti[chiave].push(consegna)
      else attivita[chiave].push(consegna)
    }
  }
  return { documenti, attivita }
}

/**
 * Il lavoro aperto di una classe sola.
 *
 * I corsi arrivano già scelti da chi chiama — il filtro per semestre e per
 * classe è una cosa del pannello — e qui si tengono solo quelli di questa
 * classe: una prova di matematica non è lavoro della IV C perché la IV C ha
 * anche italiano.
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
  const riconsegne = riconsegneDaFare(registro, suoi, giorno)
  const recuperi = recuperiDaFare(registro, suoi, giorno)
  const singoli = riconsegneAgliAllievi(registro, suoi, giorno)
  const { documenti, attivita } = dividiConsegne(
    filtraConsegne(consegneDaFare(registro, suoi, giorno), tieniConsegna),
  )

  const conti = contoVuoto()
  conti.assenze = {
    aperti: richiesteAperte(assenze),
    // Da spedire è la sola metà che dipende da chi guarda: la firma la fa
    // l'azienda, e sollecitarla non è un gesto del registro.
    urgenti: assenze.daSpedire.length,
  }
  conti.valutazioni = {
    aperti:
      riconsegneAperte(riconsegne) +
      recuperi.daFissare.length +
      recuperi.scaduti.length +
      recuperi.oggi.length +
      recuperi.presto.length +
      recuperi.avanti.length +
      recuperi.daRiconsegnare.length +
      singoli.length,
    urgenti: riconsegneUrgenti(riconsegne) + recuperiUrgenti(recuperi),
  }
  conti.documenti = { aperti: aperteDi(documenti), urgenti: documenti.arretrate.length }
  conti.attivita = { aperti: aperteDi(attivita), urgenti: attivita.arretrate.length }

  const aperti = FAMIGLIE_TODO.reduce((somma, f) => somma + conti[f].aperti, 0)
  const urgenti = FAMIGLIE_TODO.reduce((somma, f) => somma + conti[f].urgenti, 0)

  return {
    classeId: classe.id,
    classe: classe.nome,
    assenze,
    riconsegne,
    recuperi,
    singoli,
    documenti,
    attivita,
    conti,
    aperti,
    urgenti,
  }
}

/**
 * Le consegne che passano il filtro di chi guarda: «le mie», «delle classi».
 *
 * È un filtro della pagina e non del dominio, e per questo arriva da fuori:
 * qui si applica soltanto, prima di dividere le famiglie, così i conti che ne
 * escono sono quelli delle righe che si vedono davvero.
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
 * Il lavoro aperto di tutte le classi date, e il totale.
 *
 * Prima le classi che hanno più cose in ritardo: la pagina si legge dall'alto,
 * e in cima deve esserci quella per cui si è più indietro. A parità, in ordine
 * di nome, che è come le si cerca.
 *
 * Le classi senza niente da fare restano nell'elenco con i conti a zero: chi
 * chiama decide se mostrarle — nella pagina Todo no, nel registro di quella
 * classe sì, perché lì la domanda è «per questa, che cosa manca?» e «niente» è
 * una risposta.
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
      (a, b) => b.urgenti - a.urgenti || b.aperti - a.aperti || a.classe.localeCompare(b.classe, 'it'),
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
