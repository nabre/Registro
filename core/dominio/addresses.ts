// Gli indirizzi dell'anagrafica, nei pezzi di cui sono fatti (via, NAP,
// località…): servono alla mappa, alle buste e all'ordinamento.
//
// Invariante: `scriviIndirizzo(leggiIndirizzo(riga))` ridà la riga identica,
// perché le coordinate in `registro.coordinate` hanno la riga come chiave. Per
// questo i pezzi sono cinque (anche `presso` e `casella`) e quel che non si
// capisce finisce intero in `via`.

/**
 * Le parole con cui comincia un toponimo: quel che sta davanti è
 * un'intestazione. Condivise con la mappa, che spezza la riga per il
 * geocodificatore con la stessa regola.
 */
const PAROLE_TOPONIMO = [
  'via', 'v.', 'viale', 'v.le', 'strada', 'str.', 'stradina', 'piazza', 'p.za', 'piazzale',
  'vicolo', 'contrada', 'salita', 'corso', 'largo', 'lungolago', 'quartiere', 'zona',
  'stabile', 'residenza', 'rue', 'route', 'chemin', 'strasse', 'gasse', 'weg', 'platz',
]

/** La casella postale in tutte le forme in cui la si scrive, ovunque stia nella riga. */
export const CASELLE_POSTALI = /,?\s*(?:c\.?\s?p\.?|casella\s+postale)\s*\d+/gi

/** La stessa, per chiedere di un pezzo solo: senza `g`, che porterebbe memoria. */
const CASELLA_POSTALE = /^(?:c\.?\s?p\.?|casella\s+postale)\s*\d+$/i

/** Vero se un pezzo d'indirizzo sembra una via e non un'intestazione. */
export function sembraToponimo (pezzo: string): boolean {
  const minuscolo = pezzo.toLocaleLowerCase('it-CH')
  return PAROLE_TOPONIMO.some((parola) => minuscolo.startsWith(`${parola} `)) || /\d/.test(pezzo)
}

/**
 * Un indirizzo nei pezzi con cui si scrive una busta. `paese` solo fuori dalla
 * Svizzera, come si usa sulle buste svizzere.
 */
export interface Indirizzo {
  /** Quel che sta davanti alla via: «Studio d'ingegneria», «c/o Rossi». */
  presso?: string
  /** La via con il suo civico: «Via Campagna 2.1». */
  via: string
  /** La casella postale, quando c'è: «CP 570». Non è dove si sta, è dove si riceve. */
  casella?: string
  /** Il NAP: quattro cifre in Svizzera, cinque in Italia, con la sigla del paese se scritta («I-22100»). */
  cap: string
  /** Il paese o la città: «Giubiasco», «Roveredo GR». */
  localita: string
  /** Lo stato, solo se non è la Svizzera: «Italia». */
  paese?: string
}

/** Un indirizzo appena aperto: tutte le caselle vuote. */
export const INDIRIZZO_VUOTO: Indirizzo = { via: '', cap: '', localita: '' }

/**
 * L'indirizzo in una riga sola, nell'ordine di una busta. È l'inverso esatto
 * di `leggiIndirizzo`, così le coordinate già trovate restano valide.
 */
export function scriviIndirizzo (indirizzo: Indirizzo | undefined): string {
  if (!indirizzo) return ''
  const dove = [indirizzo.cap?.trim(), indirizzo.localita?.trim()].filter(Boolean).join(' ')
  return [
    indirizzo.presso?.trim(),
    indirizzo.via?.trim(),
    indirizzo.casella?.trim(),
    dove,
    indirizzo.paese?.trim(),
  ]
    .filter((pezzo) => Boolean(pezzo))
    .join(', ')
}

/** Il NAP con la località in coda a un indirizzo: «6512 Giubiasco», «I-22100 Como». */
const NAP_E_CITTA = /^((?:[A-Z]{1,3}-)?\d{4,5})\s+(.+)$/

/**
 * Una riga d'indirizzo spezzata nei suoi pezzi (lettura dei documenti che
 * hanno l'indirizzo in una riga). Prudente: il NAP si cerca in coda, e se non
 * c'è la riga resta intera in `via`.
 */
export function leggiIndirizzo (riga: string | undefined): Indirizzo {
  const scritto = (riga ?? '').trim().replace(/\s+/g, ' ')
  if (scritto === '') return { ...INDIRIZZO_VUOTO }

  const pezzi = scritto.split(',').map((pezzo) => pezzo.trim()).filter(Boolean)

  // Senza NAP in coda la riga resta intera nella via, da sistemare a mano.
  const coda = NAP_E_CITTA.exec(pezzi[pezzi.length - 1] ?? '')
  if (!coda) return { ...INDIRIZZO_VUOTO, via: scritto }
  pezzi.pop()

  const cap = coda[1]
  const localita = coda[2].trim()

  // La casella postale esce prima di cercare la via: «CP 570» finirebbe
  // davanti come intestazione.
  const caselle: string[] = []
  const resto = pezzi.filter((pezzo) => {
    if (!CASELLA_POSTALE.test(pezzo)) return true
    caselle.push(pezzo)
    return false
  })

  // La via è il primo pezzo che sembra una via: prima c'è l'intestazione, dopo
  // quel che le si riattacca.
  const dove = resto.findIndex(sembraToponimo)
  const inizioVia = dove === -1 ? 0 : dove

  return {
    presso: resto.slice(0, inizioVia).join(', ') || undefined,
    via: resto.slice(inizioVia).join(', '),
    casella: caselle.join(', ') || undefined,
    cap,
    localita,
  }
}
