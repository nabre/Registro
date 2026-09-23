// Come si legge quel che il modello ha scritto.
//
// La risposta arriva come una stringa sola, e dentro ci sono quasi sempre dei
// dati: sei persone con le loro assenze, quattro corsi con le loro ore. Messa a
// schermo così com'è, quella stringa è una colonna di righe che si somigliano —
// si trova un nome scorrendola con il dito, e la differenza fra «4» e «14» la
// si vede solo contando le cifre.
//
// Qui la stringa si guarda una volta e si divide in blocchi: una tabella, un
// elenco, un titoletto, un paragrafo. Chi la disegna — `answer.ts` — riceve
// una forma già decisa e costruisce nodi.
//
// ------------------------------------------------------------ perché è pura
//
// Non c'è una riga di DOM in questo file, e non è per eleganza: **è quel che
// permette di provarlo**. Un parser che sbaglia a contare le colonne di una
// tabella non rompe niente di visibile — disegna una cella in meno, e chi
// guarda dà la colpa al modello — ed è esattamente il genere di guasto che una
// prova prende e un'occhiata no. Sta in `tests/ui/answerFormat.test.mjs`.
//
// ------------------------------------------------------- che cosa non si fa
//
// **Non si interpreta HTML.** Quel che torna dal modello non è codice del
// registro: un `<b>` resta scritto `<b>`, e il disegnatore costruisce nodi di
// testo. Si riconoscono quattro segni del markdown — tabelle, elenchi,
// titoletti, grassetto e codice — e tutto il resto è testo.
//
// Non è nemmeno un markdown completo, e non deve diventarlo: link, immagini e
// citazioni annidate sono cose che una risposta sul registro non ha motivo di
// disegnare nella pagina di chi insegna.

/** Un pezzo di riga: testo normale, in grassetto, o scritto a macchina. */
export interface Pezzo {
  testo: string
  forte?: boolean
  codice?: boolean
}

/** Come si allinea una colonna: i numeri a destra, le parole a sinistra. */
type Allineamento = 'sinistra' | 'destra'

export type Blocco =
  | { genere: 'paragrafo', righe: Pezzo[][] }
  | { genere: 'titolo', pezzi: Pezzo[] }
  | { genere: 'elenco', ordinato: boolean, voci: Pezzo[][] }
  | {
    genere: 'tabella'
    intestazione: Pezzo[][]
    righe: Pezzo[][][]
    allineamenti: Allineamento[]
  }

/**
 * I pezzi di una riga: `**grassetto**` e `` `codice` ``, il resto testo.
 *
 * Un marcatore lasciato aperto — «di **quanto» — resta scritto com'è invece di
 * ingoiare il resto della riga: chi scrive un asterisco per sbaglio deve vedere
 * un asterisco, non perdere una frase.
 */
export function pezzi (riga: string): Pezzo[] {
  const fuori: Pezzo[] = []
  let resto = riga
  const marcatori = /(\*\*|`)/

  while (resto !== '') {
    const trovato = marcatori.exec(resto)
    if (!trovato || trovato.index === undefined) break

    const segno = trovato[1]
    const dopo = resto.slice(trovato.index + segno.length)
    const chiusura = dopo.indexOf(segno)
    if (chiusura < 0) break

    if (trovato.index > 0) fuori.push({ testo: resto.slice(0, trovato.index) })
    const dentro = dopo.slice(0, chiusura)
    if (dentro !== '') {
      fuori.push(segno === '`' ? { testo: dentro, codice: true } : { testo: dentro, forte: true })
    }
    resto = dopo.slice(chiusura + segno.length)
  }

  if (resto !== '') fuori.push({ testo: resto })
  return fuori.length > 0 ? fuori : [{ testo: '' }]
}

/** Se la riga è fatta di celle: `| Rossi | 4 |`, con o senza la barra finale. */
function eRigaDiTabella (riga: string): boolean {
  const pulita = riga.trim()
  return pulita.startsWith('|') && pulita.length > 1
}

/** Le celle di una riga, senza le barre di bordo. */
function celle (riga: string): string[] {
  const pulita = riga.trim().replace(/^\|/, '').replace(/\|$/, '')
  return pulita.split('|').map((cella) => cella.trim())
}

/**
 * La riga di separazione di una tabella markdown: `| --- | ---: |`.
 *
 * È quella che distingue una tabella da tre righe che cominciano per caso con
 * una barra. Senza, un elenco di percorsi scritto a mano diventerebbe una
 * griglia storta.
 */
function eSeparatore (riga: string): boolean {
  const c = celle(riga)
  return c.length > 0 && c.every((cella) => /^:?-{1,}:?$/.test(cella))
}

/** Il numero, la percentuale, la quota: quel che va incolonnato a destra. */
function eNumero (testo: string): boolean {
  return testo !== '' && /^[−–—-]?\d+([.,]\d+)?\s*(%|h|min|ud)?$/i.test(testo.trim())
}

/**
 * Da che parte sta ogni colonna.
 *
 * Prima quel che dice il separatore — `---:` vuol dire a destra, e lo scrive
 * chi ha composto la tabella — e poi, dove non dice niente, quel che c'è
 * dentro: una colonna di soli numeri si incolonna a destra da sé. È la
 * differenza fra un elenco di cifre che si confrontano con l'occhio e una
 * colonna in cui «4» e «14» cominciano nello stesso punto.
 */
function allineamenti (separatore: string[], righe: string[][]): Allineamento[] {
  return separatore.map((cella, colonna) => {
    if (cella.endsWith(':') && !cella.startsWith(':')) return 'destra'
    if (cella.startsWith(':')) return 'sinistra'
    const valori = righe.map((riga) => riga[colonna] ?? '').filter((v) => v !== '')
    return valori.length > 0 && valori.every(eNumero) ? 'destra' : 'sinistra'
  })
}

/** Il segno di una voce d'elenco: «- », «— », «* », «• ». */
const PUNTO = /^\s*([-—–*•])\s+(.*)$/
/** Il segno di una voce numerata: «1. », «2) ». */
const NUMERO = /^\s*\d+[.)]\s+(.*)$/
/** Un titoletto: da uno a quattro cancelletti. */
const TITOLO = /^\s*#{1,4}\s+(.*)$/

/**
 * La risposta divisa in blocchi, nell'ordine in cui si legge.
 *
 * Le righe vuote separano; tutto il resto si raccoglie nel blocco che ha
 * cominciato. Una riga che non è niente di riconoscibile è un paragrafo, che è
 * il caso normale: la maggior parte delle risposte sono due frasi.
 */
export function blocchi (testo: string): Blocco[] {
  const righe = testo.replace(/\r\n/g, '\n').split('\n')
  const fuori: Blocco[] = []
  let i = 0

  while (i < righe.length) {
    const riga = righe[i]

    if (riga.trim() === '') {
      i += 1
      continue
    }

    const titolo = TITOLO.exec(riga)
    if (titolo) {
      fuori.push({ genere: 'titolo', pezzi: pezzi(titolo[1]) })
      i += 1
      continue
    }

    // Una tabella comincia dove c'è una riga di celle **e** il separatore
    // subito sotto: è l'unico modo di non scambiare per griglia un paragrafo
    // che cita un percorso con delle barre.
    if (eRigaDiTabella(riga) && i + 1 < righe.length && eSeparatore(righe[i + 1])) {
      const intestazione = celle(riga)
      const separatore = celle(righe[i + 1])
      const corpo: string[][] = []
      i += 2
      while (i < righe.length && eRigaDiTabella(righe[i]) && !eSeparatore(righe[i])) {
        corpo.push(celle(righe[i]))
        i += 1
      }
      fuori.push({
        genere: 'tabella',
        intestazione: intestazione.map(pezzi),
        // Le righe si pareggiano sull'intestazione: una riga corta lascerebbe
        // la tabella sfilacciata, una lunga spingerebbe fuori una cella che
        // nessuna colonna spiega.
        righe: corpo.map((riga) =>
          intestazione.map((_, colonna) => pezzi(riga[colonna] ?? '')),
        ),
        allineamenti: allineamenti(separatore, corpo),
      })
      continue
    }

    if (PUNTO.test(riga) || NUMERO.test(riga)) {
      const ordinato = NUMERO.test(riga)
      const voci: Pezzo[][] = []
      while (i < righe.length) {
        const punto = PUNTO.exec(righe[i])
        const numero = NUMERO.exec(righe[i])
        if (ordinato && numero) voci.push(pezzi(numero[1]))
        else if (!ordinato && punto) voci.push(pezzi(punto[2]))
        else break
        i += 1
      }
      fuori.push({ genere: 'elenco', ordinato, voci })
      continue
    }

    // Un paragrafo arriva fino alla riga vuota o al primo blocco che comincia.
    // Gli a capo dentro restano: il modello li mette dove vanno letti.
    const dentro: Pezzo[][] = []
    while (i < righe.length && righe[i].trim() !== '') {
      const prossima = righe[i]
      if (
        TITOLO.test(prossima) ||
        PUNTO.test(prossima) ||
        NUMERO.test(prossima) ||
        (eRigaDiTabella(prossima) && i + 1 < righe.length && eSeparatore(righe[i + 1]))
      ) {
        break
      }
      dentro.push(pezzi(prossima))
      i += 1
    }
    if (dentro.length > 0) fuori.push({ genere: 'paragrafo', righe: dentro })
  }

  return fuori
}
