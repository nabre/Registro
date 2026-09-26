// Come si legge quel che il modello ha scritto: la stringa della risposta si
// divide in blocchi (tabella, elenco, titoletto, paragrafo) e `answer.ts` ne
// costruisce i nodi. Serve perché i dati in colonna si leggono in tabella.
//
// Puro, senza DOM, per poterlo provare: una cella persa non si nota a occhio
// (`tests/ui/answerFormat.test.mjs`). Non si interpreta HTML: si riconoscono
// solo tabelle, elenchi, titoletti, grassetto e codice; il resto è testo.

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
 * I pezzi di una riga: `**grassetto**` e `` `codice` ``, il resto testo. Un
 * marcatore lasciato aperto resta scritto com'è, senza ingoiare la riga.
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
 * La riga di separazione di una tabella markdown (`| --- | ---: |`): distingue
 * una tabella da righe che cominciano per caso con una barra.
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
 * Da che parte sta ogni colonna: prima quel che dice il separatore (`---:` a
 * destra), poi il contenuto (una colonna di soli numeri va a destra).
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
 * La risposta divisa in blocchi, in ordine di lettura. Le righe vuote
 * separano; quel che non si riconosce è un paragrafo.
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

    // Una tabella vuole una riga di celle e il separatore subito sotto, per non
    // scambiare un percorso con delle barre per una griglia.
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
        // Le righe si pareggiano sull'intestazione: né celle mancanti né in più.
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

    // Un paragrafo arriva fino alla riga vuota o al primo blocco; gli a capo
    // dentro restano.
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
