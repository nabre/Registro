// I numeri di telefono dell'anagrafica.
//
// Un numero è una voce con contatto dichiarato (a chi risponde: evita di
// chiamare l'azienda credendo di chiamare casa), etichetta e numero. Dentro un
// contatto l'ordine è quello in cui si prova: niente campo «principale».
// Niente DOM: allievo e contatto entrano, numeri escono.

import { ETICHETTA_TELEFONO_PREDEFINITA } from './lexicon.js'
import { lessico } from './lexicon.testi.js'
import type { Allievo, ContattoTelefonico, EtichettaTelefono, Telefono } from './models.js'

/** I contatti nell'ordine in cui si leggono su una scheda. */
export const CONTATTI: readonly ContattoTelefonico[] = ['pif', 'rappresentante', 'datore']

/** Le etichette nell'ordine in cui si offrono in un menu. */
export const ETICHETTE: readonly EtichettaTelefono[] = [
  'cellulare',
  'casa',
  'lavoro',
  'centralino',
  'altro',
]

/**
 * Il prefisso del paese della scuola, messo ai numeri che non ne hanno uno.
 * Un numero con un altro prefisso (in Ticino molti `+39`) non si tocca.
 */
const PREFISSO_PAESE = '+41'

/** Un numero è un numero solo se non ci sono parole dentro. */
const SOLO_NUMERO = /^[+0-9\s.\-/()]+$/

/**
 * Lo stesso numero in forma internazionale: componibile ovunque, ordinabile,
 * confrontabile. La spaziatura resta quella scritta (`079 000 00 00` →
 * `+41 79 000 00 00`). Non si tocca quel che non si è sicuri di aver capito:
 * parole dentro (`int. 12`), troppo corto, prefisso già presente.
 */
export function conPrefissoInternazionale (numero: string): string {
  const scritto = numero.trim().replace(/\s+/g, ' ')
  if (scritto === '' || !SOLO_NUMERO.test(scritto)) return scritto
  // Già internazionale: il paese l'ha dichiarato chi ha scritto.
  if (scritto.startsWith('+')) return scritto

  // `0041` e `0039` sono lo stesso `+` scritto come si fa da un telefono fisso.
  if (scritto.startsWith('00')) {
    const resto = scritto.slice(2).trimStart()
    return resto === '' ? scritto : `+${resto}`
  }

  // Lo zero nazionale lascia il posto al prefisso del paese.
  if (scritto.startsWith('0')) {
    const resto = scritto.slice(1).trimStart()
    return /\d/.test(resto) ? `${PREFISSO_PAESE} ${resto}` : scritto
  }

  // Nove cifre senza niente davanti: numero svizzero senza lo zero (`79 000 00 00`).
  return /^\d{9}$/.test(scritto.replace(/\D/g, '')) ? `${PREFISSO_PAESE} ${scritto}` : scritto
}

/**
 * I segni con cui due numeri sono finiti nella stessa casella. Il trattino
 * solo con gli spazi intorno: «079 123 45 67 - 079 765 43 21» sono due
 * numeri, «091-123-45-67» è uno scritto coi trattini.
 */
const FRA_DUE_NUMERI = /[,;/\n]|\s+-\s+/

/**
 * Due numeri scritti in una casella sola tornano due numeri. Si separa solo
 * quando sono davvero due: «091 000 00 00/01» è un numero con l'interno, non
 * due. La soglia è sei cifre: sotto non è un numero a sé.
 */
export function separaNumeri (numero: string): string[] {
  const intero = numero.trim()
  if (intero === '') return []
  const pezzi = intero
    .split(FRA_DUE_NUMERI)
    .map((pezzo) => pezzo.trim())
    .filter((pezzo) => pezzo !== '')
  const tutti = pezzi.length > 1 && pezzi.every((pezzo) => (pezzo.match(/\d/g) ?? []).length >= 6)
  return tutti ? pezzi : [intero]
}

/**
 * Che numero sembra, da com'è fatto: in Svizzera il 7 dopo lo zero è un
 * cellulare, il resto un fisso. Solo un'ipotesi, per dare un nome ai numeri
 * che arrivano senza; un'etichetta scritta a mano non si tocca.
 */
export function etichettaProposta (
  contatto: ContattoTelefonico,
  numero: string,
): EtichettaTelefono {
  const nazionale = numero
    .replace(/\D/g, '')
    .replace(/^41/, '')
    .replace(/^0+/, '')
  if (nazionale.startsWith('7')) return 'cellulare'
  if (nazionale === '') return ETICHETTA_TELEFONO_PREDEFINITA[contatto]
  return contatto === 'datore' ? 'centralino' : 'casa'
}

/** I nomi che dicono «non è un cellulare». */
const NUMERI_FISSI: readonly EtichettaTelefono[] = ['casa', 'lavoro', 'centralino']

/**
 * Vero quando l'etichetta di un numero dice il contrario del numero (un 091
 * «cellulare», un 079 «centralino»): resti dei numeri entrati senza etichetta.
 * Solo per numeri svizzeri, perché altrove i cellulari hanno altre cifre;
 * «altro» non contraddice niente.
 */
export function etichettaInContraddizione (telefono: Telefono): boolean {
  if (!telefono.numero.startsWith(PREFISSO_PAESE)) return false
  const cellulare = telefono.numero.replace(/\D/g, '').replace(/^41/, '').startsWith('7')
  return telefono.etichetta === 'cellulare'
    ? !cellulare
    : cellulare && NUMERI_FISSI.includes(telefono.etichetta)
}

/** I numeri di un contatto, nell'ordine in cui si provano. */
export function telefoniDi (allievo: Allievo, contatto: ContattoTelefonico): Telefono[] {
  return (allievo.telefoni ?? []).filter((t) => t.contatto === contatto && t.numero !== '')
}

/**
 * Il numero da comporre per primo per un contatto, o stringa vuota: per chi ha
 * un campo solo (scheda stampata, colonna).
 */
export function primoTelefono (allievo: Allievo, contatto: ContattoTelefonico): string {
  return telefoniDi(allievo, contatto)[0]?.numero ?? ''
}

/**
 * Tutti i numeri di un contatto in una riga, per i fogli stampati:
 * «079 000 00 00 (cellulare) · 091 000 00 00 (casa)». L'etichetta dopo, perché
 * si cerca il numero.
 */
export function scriviTelefoni (allievo: Allievo, contatto: ContattoTelefonico): string {
  return telefoniDi(allievo, contatto)
    .map((t) => `${t.numero} (${lessico().etichetteTelefono[t.etichetta]})`)
    .join(' · ')
}

/**
 * Il numero ridotto a quel che si compone (cifre e `+` iniziale), in forma
 * internazionale, o `null` se non è un numero da comporre (una parola dentro,
 * troppo corto): meglio nessun pulsante che un numero sbagliato.
 */
export function numeroComponibile (numero: string): string | null {
  const scritto = conPrefissoInternazionale(numero)
  if (!SOLO_NUMERO.test(scritto.trim())) return null
  const cifre = scritto.replace(/\D/g, '')
  if (cifre.length < 5) return null
  return scritto.trimStart().startsWith('+') ? `+${cifre}` : cifre
}
