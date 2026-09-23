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
import type { Iso, Lezione, Ora, Registro } from './models.js'

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

  // Quel che c'è da ritirare non si segna qui: lo portava la prima ora utile
  // del corso, con il segno «todo», nella colonna del vecchio cruscotto — tolta
  // perché non la chiamava più nessuno. Il segno e il conto restano nel tipo.

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
