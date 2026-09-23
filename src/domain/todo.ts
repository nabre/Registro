// Tutto quel che resta da fare, raccolto per classe.
//
// Le cose da fare esistevano già, ognuna nel suo posto: le consegne in
// `assignments.ts`, le prove ferme in `returns.ts`, i recuperi in
// `retakes.ts`, le richieste di firma in `assenze.ts`. Ognuna sa rispondere
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
import type { Classe, Consegna, Corso, Iso, Registro, Semestre } from './models.js'

/**
 * Le tipologie di lavoro, nell'ordine in cui pesano.
 *
 * Erano quattro e dicevano *che cosa* è una pendenza: assenze, prove,
 * documenti, attività. Ma la domanda di chi le guarda è un'altra — **chi deve
 * fare che cosa** — e nella vecchia divisione le due risposte stavano
 * mescolate: sotto «Documenti» c'era la pagella che devo dare e il certificato
 * che aspetto, sotto «Attività» gli esercizi della classe e le mie fotocopie.
 * Sono quattro lavori con quattro momenti diversi: quel che aspetto lo
 * sollecito, quel che tocca a me lo faccio.
 *
 * Così le tipologie diventano sei: due che non hanno un «chi» — le assenze
 * dipendono dall'azienda che firma, un momento di valutazione da chi corregge —
 * e quattro che nascono dall'incrocio fra chi tocca (la classe, il docente) e
 * che gesto è (consegnare un foglio, svolgere qualcosa).
 *
 * L'ordine non è alfabetico ed è quello che conta: prima quel che non si può
 * recuperare da soli — l'azienda che deve firmare, la classe che aspetta il
 * voto, gli allievi che devono portare — e in fondo quel che dipende solo da
 * chi tiene il registro. Si legge dall'alto, e in cima c'è quel che va
 * sollecitato oggi perché domani è tardi.
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
 * Le quattro tipologie che nascono da una consegna.
 *
 * Assenze e momenti di valutazione non sono consegne: le prime sono rapporti
 * che vanno e firme che tornano, i secondi prove da correggere. Queste quattro
 * invece sono lo stesso oggetto del registro — una consegna — letto secondo chi
 * tocca e che gesto è.
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
  switch (famiglia) {
    case 'assenze':
      return 'Assenze da far firmare'
    case 'segnalazioni':
      return 'Assenze oltre la soglia'
    case 'valutazioni':
      return 'Momenti di valutazione'
    case 'consegnaClasse':
      return 'Consegna la classe'
    case 'svolgeClasse':
      return 'Svolge la classe'
    case 'consegnaDocente':
      return 'Consegna il docente'
    default:
      return 'Svolge il docente'
  }
}

/** Una riga di spiegazione, per quando la tipologia è vuota o va presentata. */
export function descriviFamiglia (famiglia: FamigliaTodo): string {
  switch (famiglia) {
    case 'assenze':
      return 'i rapporti caricati che devono partire, e le firme che devono tornare'
    case 'segnalazioni':
      return 'chi ha perso più ore di quelle che la soglia ammette: da guardare, e da segnalare'
    case 'valutazioni':
      return 'le prove da correggere e da ridare, e i recuperi da fissare'
    case 'consegnaClasse':
      return 'i fogli che gli allievi devono portare: certificati, moduli, autorizzazioni'
    case 'svolgeClasse':
      return 'quel che è stato assegnato: esercizi, studio, materiale da portare'
    case 'consegnaDocente':
      return 'i fogli che tocca dare: pagelle, convocazioni, moduli da far firmare a casa'
    default:
      return 'quel che tocca fare a chi insegna: fotocopie, preparazioni, amministrazione'
  }
}

/**
 * In quale tipologia cade una consegna.
 *
 * Due domande, una dopo l'altra. **Passa un foglio?** Lo dice la categoria del
 * documento: senza, è qualcosa che si fa e si spunta. **Da che parte va?** Un
 * documento che si distribuisce — `verso: 'consegno'` — è lavoro di chi
 * insegna, uno che si raccoglie è lavoro della classe; e una consegna
 * indirizzata al docente è sua in tutti i casi, documento o no.
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
  /**
   * Chi ha passato la soglia di assenza, corso per corso.
   *
   * È la conseguenza di `Impostazioni.sogliaAssenza`, che prima era un numero
   * che compariva su due rapporti stampati e da nessun'altra parte: chi non
   * stampava quei fogli non sapeva di doverlo fare. Vedi `alerts.ts`.
   */
  segnalazioni: SegnalazioneAssenza[]
  /** Le prove svolte e i recuperi: due elenchi che si leggono insieme. */
  riconsegne: RiconsegneDaFare
  recuperi: RecuperiDaFare
  /** Chi non ha ancora riavuto la sua prova, nome per nome. */
  singoli: RiconsegnaAllievo[]
  /**
   * Le consegne, divise per tipologia: chi le deve fare e che gesto sono.
   *
   * Un mucchio per tipologia e non un elenco solo: le quattro si guardano in
   * momenti diversi, e mescolate diventano una lista lunga in cui una pagella
   * non consegnata sta accanto a un esercizio non spuntato.
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

/**
 * Divide le consegne nelle loro quattro tipologie, tenendo i mucchi per
 * scadenza.
 *
 * Sono quattro lavori diversi con lo stesso oggetto dentro il registro.
 * Raccogliere un certificato vuol dire aspettare venticinque allievi e
 * sollecitare chi manca; consegnare una pagella vuol dire un file per ciascuno
 * e una mail; assegnare gli esercizi 4–7 vuol dire una spunta; ricordarsi le
 * fotocopie vuol dire farle. Chi la domenica sera guarda «che cosa tocca a me»
 * non vuole scorrere venti righe che aspettano gli altri.
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
  // Le assenze oltre soglia si contano sul semestre in cui si è: una
  // percentuale sull'anno intero, a novembre, direbbe che nessuno ha perso
  // niente — e a giugno nasconderebbe chi ha cominciato a mancare a gennaio.
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

  const conti = contoVuoto()
  conti.assenze = {
    aperti: richiesteAperte(assenze),
    // Da spedire è la sola metà che dipende da chi guarda: la firma la fa
    // l'azienda, e sollecitarla non è un gesto del registro.
    urgenti: assenze.daSpedire.length,
  }
  conti.segnalazioni = {
    aperti: segnalazioni.length,
    // Preme quando anche la percentuale sulle UD con l'appello fatto è oltre
    // soglia: là il numero non dipende dagli appelli dimenticati, e il caso è da
    // segnalare e non solo da guardare. Vedi `alerts.ts`.
    urgenti: segnalazioni.filter((segnalazione) => segnalazione.confermata).length,
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
  for (const famiglia of FAMIGLIE_CONSEGNA) {
    conti[famiglia] = {
      aperti: aperteDi(consegne[famiglia]),
      // In ritardo è quel che ha una scadenza passata: nelle consegne è il solo
      // giudizio possibile, perché nessun automatismo le chiude.
      urgenti: consegne[famiglia].arretrate.length,
    }
  }

  const aperti = FAMIGLIE_TODO.reduce((somma, f) => somma + conti[f].aperti, 0)
  const urgenti = FAMIGLIE_TODO.reduce((somma, f) => somma + conti[f].urgenti, 0)

  return {
    classeId: classe.id,
    classe: classe.nome,
    assenze,
    segnalazioni,
    riconsegne,
    recuperi,
    singoli,
    consegne,
    conti,
    aperti,
    urgenti,
  }
}

/** Il semestre in cui cade il giorno, dentro l'anno della classe. */
function semestreDelGiorno (registro: Registro, classe: Classe, giorno: Iso): Semestre | null {
  const anno = registro.anni.find((candidato) => candidato.id === classe.annoId)
  return anno?.semestri.find((s) => giorno >= s.inizio && giorno <= s.fine) ?? null
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
