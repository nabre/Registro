// Che cosa manca, ora per ora.
//
// Il registro sa già tutto quel che serve — quanto della lezione la scaletta
// copre, se
// l'appello è stato fatto, se c'è una verifica quel giorno — ma sparso in sei
// viste, una domanda alla volta. Il cruscotto fa l'unica domanda che un docente
// si fa davvero guardando l'anno: dove sono indietro? Qui si risponde una volta
// sola, e le viste si limitano a disegnarla.
//
// Sta nel dominio e non nel pannello perché è un giudizio sui dati, non un modo
// di mostrarli: la regola che dice «un'ora passata senza appello è un buco» va
// scritta dove si può provare senza aprire l'editor, e va detta una volta per
// tutte — altrimenti la matrice e la scheda del corso finiscono a contare cose
// diverse chiamandole con lo stesso nome.
//
// Il conto delle ore riparte a ogni semestre. Non è una scelta di grafica: è la
// scansione su cui il registro raggruppa le valutazioni e calcola le medie, e
// «la dodicesima lezione» detto a maggio vuol dire la dodicesima del secondo
// semestre. Un numero che corresse da settembre a giugno non lo userebbe
// nessuno.

import {
  confrontaLezioni,
  confrontaPianoConLezione,
  momentoLezione,
  riepilogaPresenze,
} from './calculations.js'
import { consegneDaGuardare, consegneDellaLezione } from './assignments.js'
import { recuperiDaFare, recuperiUrgenti } from './retakes.js'
import { riconsegneAgliAllievi, riconsegneAperte, riconsegneDaFare } from './returns.js'
import { nelPeriodo } from './dates.js'
import type { AnnoScolastico, Corso, Iso, Lezione, Ora, Registro, Semestre } from './models.js'

/**
 * Un segno su una lezione. Alcuni sono buchi da chiudere, altri sono fatti che
 * vale la pena vedere senza aprire l'ora: che ci sia una verifica, che ci siano
 * osservazioni da rileggere prima del colloquio.
 */
type Segno =
  | 'svolta'
  | 'da-segnare'
  | 'senza-appello'
  | 'assenze'
  | 'scoperta'
  | 'coperta'
  | 'valutazione'
  | 'osservazioni'
  | 'consuntivo'
  | 'todo'
  | 'in-corso'
  | 'annullata'

/**
 * Quanto un'ora chiede attenzione. Tre livelli e non di più: una scala più fine
 * non cambierebbe quel che si fa dopo averla letta.
 */
type Urgenza = 'apposto' | 'da-preparare' | 'manca'

/**
 * Quanto della lezione la scaletta arriva a coprire, da 0 in su.
 *
 * Un'ora senza piano, o con un piano vuoto, sta a zero. Uno che la riempie
 * sta a uno, e uno che sfora va oltre.
 */
function coperturaDellOra (registro: Registro, lezione: Lezione): number {
  const piano = registro.piani.find((p) => p.id === lezione.pianoId)
  if (!piano) return 0
  const { durataPiano, udLezione } = confrontaPianoConLezione(piano, lezione)
  if (udLezione <= 0) return durataPiano > 0 ? 1 : 0
  return durataPiano / udLezione
}

/**
 * Se la scaletta copre l'ora: è questa la domanda, non se un piano esiste.
 *
 * Un piano assegnato non vuol dire un'ora preparata. Il piano è una libreria:
 * lo si crea, lo si appende all'ora e poi lo si riempie — e fra l'appenderlo e
 * il riempirlo ci stanno i giorni in cui l'ora risultava pronta e non lo era.
 * Peggio ancora la scaletta a metà: tre tappe da dieci minuti su un'ora da
 * cinquanta sono venti minuti d'aula che nessuno ha pensato, e sono proprio
 * quelli che si pagano in classe. Quel che si vuole sapere è se il tempo
 * previsto arriva in fondo all'ora, e la risposta è una somma.
 *
 * Il margine è per la virgola e non per la didattica: le durate si scrivono in
 * minuti e tornano unità dividendo, e venti più venti più cinque su un'ora da
 * quarantacinque non fa esattamente uno in virgola mobile. Sotto il millesimo
 * di UD — tre secondi d'aula — non c'è niente da segnalare a nessuno.
 *
 * Una scaletta più lunga dell'ora la copre: sforare è un altro problema, e lo
 * dice `confrontaPianoConLezione` a chi sta preparando, dove si può rimediare.
 */
export function oraCoperta (registro: Registro, lezione: Lezione): boolean {
  return coperturaDellOra(registro, lezione) >= 1 - 0.001
}

interface DiagnosiLezione {
  lezione: Lezione
  /** Il numero d'ordine dentro il suo semestre, contando solo le ore che valgono. */
  numero: number
  segni: Segno[]
  urgenza: Urgenza
  /** Quanti assenti risultano dall'appello, se è stato fatto. */
  assenti: number
  osservazioni: number
  /**
   * Le cose da fare che aspettano quest'ora, e che non scadono qui: le porta
   * solo la prima ora utile del corso — la prossima volta che si incontra
   * quella classe — perché è lì che si possono fare. Zero su tutte le altre.
   */
  todo: number
}

/**
 * A che punto è un'ora del suo giro, in una parola sola.
 *
 * Si chiama «fase» e non «stato» perché `stato` in questo registro è già preso
 * due volte — `lezione.stato` è quel che il docente ha dichiarato, e
 * `statoDellOra` in `calculations.ts` è la presenza di un allievo. Questa è una terza
 * cosa: dove si trova quest'ora fra «non è ancora successa» e «è a posto».
 *
 * `Segno` e `Urgenza` dicono cose diverse e si sovrappongono: un'ora può avere
 * cinque segni e un'urgenza, ed è quel che serve al cruscotto, che ha una
 * casella per ognuna. Chi deve scrivere *una riga* — una voce di menu, una
 * notifica — ha bisogno invece di una risposta sola, e questa è quella.
 *
 * L'ordine in cui si guarda non è indifferente:
 *
 *   `annullata` prima di tutto, perché un'ora annullata non è né passata né
 *   futura: non c'è stata. Segnarla «da chiudere» perché è priva di appello
 *   sarebbe chiedere di compilare il registro di una lezione che non si è
 *   tenuta.
 *
 *   `in-corso` prima del passato e del futuro, perché è l'unica che risponde a
 *   «dove sono adesso», ed è la riga che si cerca per prima.
 *
 *   `da-chiudere` prima di `svolta`: è la distinzione che conta, ed è la stessa
 *   che fa `urgenza === 'manca'` — un'ora passata senza appello, o non ancora
 *   segnata svolta.
 */
export type FaseOra =
  | 'annullata'
  | 'in-corso'
  | 'da-chiudere'
  | 'svolta'
  | 'da-preparare'
  | 'futura'

export function faseDellOra (
  registro: Registro,
  lezione: Lezione,
  oggi: Iso,
  ora: Ora = '23:59',
): FaseOra {
  if (lezione.stato === 'annullata') return 'annullata'

  const momento = momentoLezione(lezione, oggi, ora)
  if (momento === 'in-corso') return 'in-corso'

  const { urgenza } = diagnosiLezione(registro, lezione, 0, oggi, ora)
  if (momento === 'passata') return urgenza === 'manca' ? 'da-chiudere' : 'svolta'
  return urgenza === 'da-preparare' ? 'da-preparare' : 'futura'
}

/** Le ore di un corso divise per stato, ognuna in ordine di calendario. */
export interface OreRaggruppate {
  inCorso: Lezione[]
  daChiudere: Lezione[]
  /** Le future, con e senza piano: l'ordine è quello del calendario. */
  prossime: Lezione[]
  svolte: Lezione[]
  annullate: Lezione[]
}

/**
 * Divide le ore di un corso nei mucchi che si vogliono vedere separati.
 *
 * Le svolte tornano dalla più recente: sono tante e si guardano all'indietro —
 * «che cosa ho fatto l'altra volta» — mentre le prossime tornano dalla più
 * vicina, che è l'ordine in cui si vive.
 */
export function raggruppaOre (
  registro: Registro,
  lezioni: Lezione[],
  oggi: Iso,
  ora: Ora = '23:59',
): OreRaggruppate {
  const esito: OreRaggruppate = {
    inCorso: [], daChiudere: [], prossime: [], svolte: [], annullate: [],
  }

  for (const lezione of [...lezioni].sort(confrontaLezioni)) {
    switch (faseDellOra(registro, lezione, oggi, ora)) {
      case 'annullata': esito.annullate.push(lezione); break
      case 'in-corso': esito.inCorso.push(lezione); break
      case 'da-chiudere': esito.daChiudere.push(lezione); break
      case 'svolta': esito.svolte.push(lezione); break
      default: esito.prossime.push(lezione)
    }
  }

  esito.svolte.reverse()
  return esito
}

/** L'ora che chiede di essere compilata, o — se non ce n'è — la prossima da fare. */
interface OraDaFare {
  lezione: Lezione
  /**
   * Vero se il registro di quell'ora è rimasto indietro; falso se è
   * semplicemente la prossima in programma. Chi lo mostra dice due cose
   * diverse, e sono due cose diverse: una è un buco, l'altra un appuntamento.
   */
  manca: boolean
}

/**
 * Fra tutte le ore, quella su cui vale la pena andare adesso.
 *
 * Prima i buchi e poi il futuro, ed è l'ordine che conta: un'ora di martedì
 * senza appello resta un buco anche mercoledì, e chi mostrasse subito «prossima:
 * giovedì» farebbe dimenticare quel martedì per sempre. Fra i buchi si prende il
 * più vecchio, perché è quello che si sta dimenticando davvero.
 *
 * Il giudizio è di `diagnosiLezione`, la stessa che disegna il cruscotto: se il
 * cruscotto e chi mostra questa riga contassero i buchi in due modi, uno dei due
 * direbbe una bugia e non si saprebbe quale.
 *
 * `null` quando non c'è né un buco né un'ora futura — un anno finito, o appena
 * cominciato e ancora senza lezioni.
 */
export function oraDaCompilare (
  registro: Registro,
  lezioni: Lezione[],
  oggi: Iso,
  ora: Ora = '23:59',
): OraDaFare | null {
  const inOrdine = [...lezioni].sort(confrontaLezioni)

  const buco = inOrdine.find(
    (lezione) => diagnosiLezione(registro, lezione, 0, oggi, ora).urgenza === 'manca',
  )
  if (buco) return { lezione: buco, manca: true }

  // Nessun buco: si guarda avanti. `momentoLezione` e non un confronto di date,
  // perché l'ora delle otto, guardata a mezzogiorno, è passata — e proporla
  // come «prossima» sarebbe assurdo.
  const prossima = inOrdine.find(
    (lezione) => lezione.stato !== 'annullata' && momentoLezione(lezione, oggi, ora) !== 'passata',
  )
  return prossima ? { lezione: prossima, manca: false } : null
}

/**
 * Le lezioni di un corso che contano, in ordine: le annullate non sono ore.
 * Con un periodo, solo quelle che ci cadono dentro.
 */
export function lezioniDelCorso (
  registro: Registro,
  corsoId: string,
  periodo?: { inizio: Iso, fine: Iso },
): Lezione[] {
  return registro.lezioni
    .filter((l) => l.corsoId === corsoId && l.stato !== 'annullata')
    .filter((l) => !periodo || nelPeriodo(l.data, periodo.inizio, periodo.fine))
    .sort(confrontaLezioni)
}

/**
 * Che cosa dire di un'ora.
 *
 * La regola sul passato è quella che conta: un'ora già trascorsa senza appello
 * è un buco, la stessa ora domani è solo un'ora da fare. Il confronto è sulla
 * data e non sullo stato perché lo stato è proprio la cosa che si dimentica di
 * aggiornare — e un cruscotto che si fida di quel che gli si dichiara non serve
 * a niente.
 */
export function diagnosiLezione (
  registro: Registro,
  lezione: Lezione,
  numero: number,
  oggi: Iso,
  ora: Ora = '23:59',
): DiagnosiLezione {
  const segni: Segno[] = []
  // L'ora delle otto, guardata a mezzogiorno, è finita: se manca l'appello
  // manca adesso. Il confronto sulla sola data lo avrebbe detto domani.
  const momento = momentoLezione(lezione, oggi, ora)
  const passata = momento === 'passata'
  if (momento === 'in-corso' && lezione.stato !== 'annullata') segni.push('in-corso')
  const presenze = riepilogaPresenze(lezione.presenze)
  const osservazioni = lezione.osservazioni.length

  if (lezione.stato === 'annullata') segni.push('annullata')
  if (lezione.stato === 'svolta') segni.push('svolta')

  // I buchi: cose che a quest'ora dovevano esserci e non ci sono.
  // L'appello non è «ci sono righe»: righe tutte vuote sono un appello non
  // fatto, e prima erano venti presenze che nessuno aveva verificato.
  const senzaAppello = presenze.udTotali === 0
  const annullata = lezione.stato === 'annullata'
  if (passata && senzaAppello && !annullata) segni.push('senza-appello')
  if (passata && lezione.stato !== 'svolta' && !annullata) segni.push('da-segnare')

  // Il piano: un'ora futura che la scaletta non copre è lavoro da fare, non un
  // errore. Un'ora passata scoperta non è più niente — si è svolta lo stesso.
  if (oraCoperta(registro, lezione)) segni.push('coperta')
  else if (!passata && !annullata) segni.push('scoperta')

  // I fatti che si vogliono vedere senza aprire l'ora.
  if (registro.valutazioni.some((v) => v.lezioneId === lezione.id)) segni.push('valutazione')
  if (osservazioni > 0) segni.push('osservazioni')
  if ((lezione.consuntivo ?? '').trim() || (lezione.argomenti ?? '').trim()) {
    segni.push('consuntivo')
  }
  // Chi manca per una parte dell'ora manca: nel cruscotto il segno è lo stesso,
  // perché la domanda a cui risponde è «devo guardare quest'ora?».
  const mancanti = presenze.assenti + presenze.parziali
  if (!senzaAppello && mancanti > 0) segni.push('assenze')

  // Quel che c'è da ritirare non si segna qui: lo porta la prima ora utile del
  // corso, insieme a tutto il resto che aspetta quella classe. Vedi il segno
  // «todo» in `colonnaCruscotto`.

  const urgenza: Urgenza =
    segni.includes('senza-appello') || segni.includes('da-segnare')
      ? 'manca'
      : segni.includes('scoperta')
        ? 'da-preparare'
        : 'apposto'

  return { lezione, numero, segni, urgenza, assenti: mancanti, osservazioni, todo: 0 }
}

/**
 * Perché un'ora è rimasta aperta, a parole.
 *
 * «Senza appello» e «non segnata svolta» sono due buchi diversi: si chiudono in
 * due posti diversi, e dire soltanto «da chiudere» costringe ad aprire l'ora per
 * sapere che cosa manca. Sta qui e non accanto a chi scrive il menu perché lo
 * chiedono in tre — il vassoio, il widget sul desktop, i promemoria — e tre
 * copie della stessa frase sono tre occasioni di dire cose diverse.
 *
 * Vuoto quando non manca niente: l'ora è a posto, oppure non è ancora passata.
 */
export function cosaManca (diagnosi: DiagnosiLezione): string[] {
  const pezzi: string[] = []
  if (diagnosi.segni.includes('senza-appello')) pezzi.push('senza appello')
  if (diagnosi.segni.includes('da-segnare')) pezzi.push('non segnata svolta')
  return pezzi
}

interface ColonnaCruscotto {
  corso: Corso
  ore: DiagnosiLezione[]
  /** Quante ore si sono già fatte: quelle la cui data è passata. */
  passate: number
  /** Quante hanno un buco aperto. */
  buchi: number
  /** Quante ore future la loro scaletta non copre ancora fino in fondo. */
  daPreparare: number
  /** La prossima ora da fare, se ce n'è una. */
  prossima: Lezione | null
}

/**
 * Una colonna: un corso con le sue ore del periodo, già giudicate e numerate.
 *
 * Le cose da fare non hanno una data: si fanno la prossima volta che si
 * entra in quell'aula. Il segno «todo» sta quindi sulla prima ora non ancora
 * passata di tutto il corso — non del periodo: guardando il primo semestre
 * a ottobre, la prossima ora è di ottobre, e la prima del secondo semestre
 * non deve ripetere lo stesso conto — e si sposta da solo quando quell'ora
 * finisce, senza che niente venga riscritto nei dati.
 *
 * Si contano tutte: arretrate, in scadenza lì, e quelle che stanno solo
 * aperte. È l'unico segno che parla di consegne, ed è giusto che sia uno: la
 * domanda che ci si fa guardando il cruscotto è quanto c'è da fare quando si
 * rivede quella classe, e due icone nella stessa cella la spezzavano in due
 * risposte che si leggevano insieme comunque.
 */
export function colonnaCruscotto (
  registro: Registro,
  corso: Corso,
  oggi: Iso,
  periodo?: { inizio: Iso, fine: Iso },
  ora: Ora = '23:59',
): ColonnaCruscotto {
  const ore = lezioniDelCorso(registro, corso.id, periodo).map((lezione, indice) => ({
    ...diagnosiLezione(registro, lezione, indice + 1, oggi, ora),
    momento: momentoLezione(lezione, oggi, ora),
  }))

  const prossimaDelCorso = lezioniDelCorso(registro, corso.id).find(
    (l) => momentoLezione(l, oggi, ora) !== 'passata',
  )
  const prima = prossimaDelCorso ? ore.find((o) => o.lezione.id === prossimaDelCorso.id) : undefined
  if (prima) {
    const classe = registro.classi.find((c) => c.id === corso.classeId) ?? null
    const suoi = consegneDellaLezione(registro, prima.lezione, classe)
    const daFare = suoi.arretrate.length + suoi.scadono.length + suoi.aperte.length
    if (daFare > 0) {
      prima.todo = daFare
      prima.segni.push('todo')
    }
  }

  return {
    corso,
    ore: ore.map(({ momento: _momento, ...diagnosi }) => diagnosi),
    passate: ore.filter((o) => o.momento === 'passata').length,
    buchi: ore.filter((o) => o.urgenza === 'manca').length,
    daPreparare: ore.filter((o) => o.urgenza === 'da-preparare').length,
    prossima: ore.find((o) => o.momento !== 'passata')?.lezione ?? null,
  }
}

/** Una tabella del cruscotto: un semestre, con tutti i corsi in colonna. */
interface SezioneCruscotto {
  /** Il semestre a cui appartiene, o null se l'anno non ne dichiara. */
  semestre: Semestre | null
  colonne: ColonnaCruscotto[]
  /** Quante righe ha la tabella: il corso più lungo del semestre comanda. */
  righe: number
  ore: number
  passate: number
  buchi: number
  daPreparare: number
  /** Vero se il giorno di oggi cade in questo semestre. */
  corrente: boolean
}

interface RiepilogoCruscotto {
  sezioni: SezioneCruscotto[]
  ore: number
  passate: number
  buchi: number
  daPreparare: number
  /** Consegne con il termine passato e qualcuno che manca ancora. */
  arretrate: number
  /** Consegne che scadono oggi: sono quelle da ritirare adesso. */
  daRitirare: number
  /**
   * Prove da rifare che aspettano una decisione: nessuna data, o una data
   * lasciata passare. Non c'è nessun automatismo che le chiuda, e a giugno si
   * pagano sulla media di qualcuno — è il motivo per cui stanno qui davanti.
   */
  recuperi: number
  /**
   * I fogli ancora in mano a chi insegna: prove da correggere o da ridare,
   * recuperi valutati e non restituiti, compiti di chi il giorno della
   * riconsegna non c'era.
   *
   * Uno solo e non tre: la domanda è «quanta carta ho sulla scrivania», e per
   * quella non conta da quale elenco esca. I tre mucchi si aprono nel Todo.
   */
  daRiconsegnare: number
  /** Le ore di oggi, di tutti i corsi, in ordine di inizio. */
  oggi: Lezione[]
  /** L'ora che si sta facendo proprio adesso, se ce n'è una. */
  inCorso: Lezione | null
  /** La prossima di oggi che deve ancora cominciare. */
  prossima: Lezione | null
  /**
   * La prossima ora in assoluto: quella di oggi se ce n'è ancora una, altrimenti
   * la prima del giorno in cui si torna in classe. È la domanda «dove devo
   * essere fra poco?», e a fine giornata la risposta non sta più in `prossima`
   * — che tace, perché di oggi non è rimasto niente.
   */
  successiva: Lezione | null
  /**
   * Le ore che restano da fare, tutte insieme: la giornata in cui si entra la
   * prossima volta, con dentro quel che non è ancora passato.
   *
   * È la giornata della lezione successiva, non «oggi» e non «domani». A metà
   * mattina è il resto di oggi — con l'ora in corso in testa, perché è quella in
   * cui si è dentro; a giornata finita salta al giorno in cui si torna in
   * classe, e fra venerdì e lunedì ci sono due giorni che non contano. Le ore
   * già fatte non ci sono: hanno la matrice, e qui toglierebbero il posto a quel
   * che deve ancora succedere. Null quando non resta più niente.
   */
  prossimeLezioni: { data: Iso, lezioni: Lezione[] } | null
}

function sezione (
  registro: Registro,
  corsi: Corso[],
  oggi: Iso,
  semestre: Semestre | null,
  ora: Ora,
): SezioneCruscotto {
  const periodo = semestre ? { inizio: semestre.inizio, fine: semestre.fine } : undefined
  const colonne = corsi.map((corso) => colonnaCruscotto(registro, corso, oggi, periodo, ora))
  return {
    semestre,
    colonne,
    righe: colonne.reduce((massimo, c) => Math.max(massimo, c.ore.length), 0),
    ore: colonne.reduce((somma, c) => somma + c.ore.length, 0),
    passate: colonne.reduce((somma, c) => somma + c.passate, 0),
    buchi: colonne.reduce((somma, c) => somma + c.buchi, 0),
    daPreparare: colonne.reduce((somma, c) => somma + c.daPreparare, 0),
    corrente: !semestre || nelPeriodo(oggi, semestre.inizio, semestre.fine),
  }
}

/**
 * Il cruscotto intero, una tabella per semestre.
 *
 * I corsi arrivano già scelti da chi chiama — il filtro per classe è una cosa
 * del pannello, non del dominio. Le ore che cadono fuori da ogni semestre non
 * compaiono in nessuna tabella: sono un errore di date che il registro segnala
 * già per conto suo, e inventargli una casella lo nasconderebbe.
 */
export function riepilogoCruscotto (
  registro: Registro,
  corsi: Corso[],
  anno: AnnoScolastico | null,
  oggi: Iso,
  ora: Ora = '23:59',
): RiepilogoCruscotto {
  const semestri = anno?.semestri ?? []
  const sezioni =
    semestri.length > 0
      ? [...semestri]
          .sort((a, b) => a.inizio.localeCompare(b.inizio))
          .map((semestre) => sezione(registro, corsi, oggi, semestre, ora))
      : [sezione(registro, corsi, oggi, null, ora)]

  const tutte = sezioni.flatMap((s) => s.colonne).flatMap((c) => c.ore)
  const consegne = consegneDaGuardare(registro, corsi, oggi)
  const gruppiRecuperi = recuperiDaFare(registro, corsi, oggi)

  const inOrdine = tutte.map((o) => o.lezione).sort(confrontaLezioni)
  const diOggi = inOrdine.filter((l) => l.data === oggi)

  // La giornata in cui si entra la prossima volta: quella della prima ora non
  // ancora passata. Se un'ora è in corso quella giornata è oggi, e ci finisce
  // dentro anche lei — si sta facendo, quindi è la prima cosa che resta.
  const daFare = inOrdine.filter((l) => momentoLezione(l, oggi, ora) !== 'passata')
  const giornoProssime = daFare[0]?.data ?? null

  return {
    sezioni,
    inCorso: diOggi.find((l) => momentoLezione(l, oggi, ora) === 'in-corso') ?? null,
    prossima: diOggi.find((l) => momentoLezione(l, oggi, ora) === 'futura') ?? null,
    // Un'ora in corso non è la successiva: la successiva è quella dopo.
    successiva: inOrdine.find((l) => momentoLezione(l, oggi, ora) === 'futura') ?? null,
    prossimeLezioni: giornoProssime
      ? { data: giornoProssime, lezioni: daFare.filter((l) => l.data === giornoProssime) }
      : null,
    arretrate: consegne.arretrate.length,
    daRitirare: consegne.scadono.length,
    recuperi: recuperiUrgenti(gruppiRecuperi),
    daRiconsegnare:
      riconsegneAperte(riconsegneDaFare(registro, corsi, oggi)) +
      gruppiRecuperi.daRiconsegnare.length +
      riconsegneAgliAllievi(registro, corsi, oggi).length,
    ore: sezioni.reduce((somma, s) => somma + s.ore, 0),
    passate: sezioni.reduce((somma, s) => somma + s.passate, 0),
    buchi: sezioni.reduce((somma, s) => somma + s.buchi, 0),
    daPreparare: sezioni.reduce((somma, s) => somma + s.daPreparare, 0),
    oggi: diOggi,
  }
}
