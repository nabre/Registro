// Gli indirizzi dell'anagrafica, nei pezzi di cui sono fatti.
//
// Per anni un indirizzo è stato una riga sola — «Via Campagna 2, 6512
// Giubiasco» — e la ragione era buona: il registro non ordina per NAP e non
// stampa etichette, lo mostra e basta, e quattro caselle da riempire per
// ottenere la stessa riga sono tre caselle di troppo.
//
// Poi la riga ha cominciato a servire per qualcosa. La mappa la manda al
// geocodificatore, che la vuole a pezzi; i fogli che escono dal registro
// intestano buste; e un elenco in cui il NAP sta dentro una frase non si
// ordina, non si raggruppa per località e non si esporta verso niente. Un
// indirizzo tenuto come testo è un indirizzo di cui il registro sa soltanto
// che è scritto.
//
// Qui l'indirizzo ha i suoi pezzi. Chi lo scrive li scrive separati; chi lo
// legge lo rilegge in una riga sola — `scriviIndirizzo` — che è esattamente
// quella di prima: le coordinate già trovate stanno in `registro.coordinate`
// con la riga come chiave, e ricomporla diversa vorrebbe dire una mappa da
// rifare da capo.
//
// **La lettura è lossless, e non per eleganza.** `leggiIndirizzo` spezza una
// riga vecchia e `scriviIndirizzo` la rimette insieme: se le due non tornano
// identiche, quell'indirizzo perde il suo punto sulla mappa. Per questo i
// pezzi sono cinque e non tre — c'è posto per quel che sta davanti alla via e
// per la casella postale — e per questo quel che non si è capito finisce
// dentro `via` per intero invece di essere buttato.

/**
 * Le parole con cui comincia un toponimo: tutto il resto davanti è etichetta.
 *
 * Stanno qui e non nella mappa perché servono a due mestieri: spezzare una riga
 * per mandarla al geocodificatore, e spezzarla per metterla nelle sue caselle.
 * — e sono la stessa domanda, «dove comincia la via?», che scritta due volte
 * darebbe due risposte diverse sullo stesso indirizzo.
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
 * Un indirizzo nei pezzi con cui si scrive una busta.
 *
 * `paese` è lo stato e si scrive solo quando non è la Svizzera: su una busta
 * svizzera spedita in Svizzera il nome del paese non si mette, e una riga
 * «Svizzera» sotto ogni indirizzo sarebbe rumore su ogni foglio.
 */
export interface Indirizzo {
  /** Quel che sta davanti alla via: «Studio d'ingegneria», «c/o Rossi». */
  presso?: string
  /** La via con il suo civico: «Via Campagna 2.1». */
  via: string
  /** La casella postale, quando c'è: «CP 570». Non è dove si sta, è dove si riceve. */
  casella?: string
  /**
   * Il NAP: quattro cifre in Svizzera, cinque in Italia.
   *
   * Con la sigla del paese davanti quando c'era scritta — «I-22100» —: è
   * così che si scrive su una busta diretta all'estero, e toglierla vorrebbe
   * dire riscrivere l'indirizzo di qualcuno a modo nostro.
   */
  cap: string
  /** Il paese o la città: «Giubiasco», «Roveredo GR». */
  localita: string
  /** Lo stato, solo se non è la Svizzera: «Italia». */
  paese?: string
}

/** Un indirizzo appena aperto: tutte le caselle vuote. */
export const INDIRIZZO_VUOTO: Indirizzo = { via: '', cap: '', localita: '' }

/**
 * L'indirizzo in una riga sola, come lo si è sempre scritto.
 *
 * L'ordine è quello di una busta — chi, dove, dove si riceve la posta, in che
 * paese — ed è lo stesso in cui le righe vecchie erano scritte: è quel che
 * permette a `scriviIndirizzo(leggiIndirizzo(riga))` di ridare la riga di
 * partenza, e quindi alle coordinate già trovate di continuare a valere.
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
 * Una riga d'indirizzo spezzata nei suoi pezzi.
 *
 * È la lettura dei file scritti prima, e vale una volta sola per ciascuno:
 * letto e riscritto, l'indirizzo sta nelle sue caselle e nessuno lo rilegge
 * più. Per questo la regola qui è la prudenza e non l'ingegno — quel che non
 * si riconosce resta dov'è invece di essere spostato altrove.
 *
 * Il NAP si riconosce in coda, che è dove sta: quattro cifre e un nome. Se in
 * fondo non c'è, l'indirizzo non si spezza affatto e finisce tutto dentro
 * `via`: meglio una casella con dentro una riga intera che quattro caselle
 * riempite a caso.
 */
export function leggiIndirizzo (riga: string | undefined): Indirizzo {
  const scritto = (riga ?? '').trim().replace(/\s+/g, ' ')
  if (scritto === '') return { ...INDIRIZZO_VUOTO }

  const pezzi = scritto.split(',').map((pezzo) => pezzo.trim()).filter(Boolean)

  // Il NAP sta in coda. Senza, non c'è niente da cui partire: la riga resta
  // intera nella via, e chi la apre la sistema a mano vedendo che cos'era.
  const coda = NAP_E_CITTA.exec(pezzi[pezzi.length - 1] ?? '')
  if (!coda) return { ...INDIRIZZO_VUOTO, via: scritto }
  pezzi.pop()

  const cap = coda[1]
  const localita = coda[2].trim()

  // La casella postale si riconosce da come è scritta, e si toglie dal mucchio
  // prima di cercare la via: «CP 570» comincia con una parola che non è un
  // toponimo e finirebbe davanti come un'intestazione.
  const caselle: string[] = []
  const resto = pezzi.filter((pezzo) => {
    if (!CASELLA_POSTALE.test(pezzo)) return true
    caselle.push(pezzo)
    return false
  })

  // La via è il primo pezzo che sembra una via. Quel che le sta davanti è
  // un'intestazione — il nome di uno studio, di una persona — e quel che le sta
  // dietro si riattacca a lei: spostarlo altrove cambierebbe la riga.
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
