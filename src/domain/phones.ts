// I numeri di telefono dell'anagrafica.
//
// Erano due campi: il suo e quello del datore di lavoro. Due campi bastano
// finché nessuno ha due numeri, e non è mai stato vero: chi ne aveva un altro
// lo scriveva di fianco al primo separato da una barra, e quel che finiva sul
// foglio da controfirmare non era un numero componibile. Di un rappresentante
// legale non c'era proprio posto, e il numero della madre stava nella casella
// della persona in formazione.
//
// Qui un numero è una voce con tre cose: a chi risponde, che numero è, e qual
// è. La prima è quella che evita l'errore che si paga — telefonare in azienda
// credendo di telefonare a casa — e per questo non è un'etichetta scritta a
// mano, è un contatto dichiarato.
//
// L'ordine dentro uno stesso contatto è l'ordine in cui si prova: il primo è
// quello che si compone per primo. Non c'è un campo «principale» perché
// sarebbe la stessa informazione detta due volte, e due modi di dire la stessa
// cosa prima o poi si contraddicono.
//
// Qui dentro non c'è il DOM: si passano un allievo e un contatto, e si
// ottengono i suoi numeri.

import { ETICHETTA_TELEFONO_PREDEFINITA, ETICHETTE_TELEFONO } from './lexicon.js'
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
 * Il prefisso del paese in cui sta la scuola.
 *
 * Il registro è di una scuola svizzera e i numeri che ci finiscono dentro sono
 * quasi tutti svizzeri: quando manca il prefisso, questo è quello che manca. I
 * numeri che il prefisso ce l'hanno già — e in Ticino sono tanti, metà delle
 * aziende ha un numero italiano — non vengono toccati: un `+39` riscritto `+41`
 * non è un numero, è un numero di qualcun altro.
 */
const PREFISSO_PAESE = '+41'

/** Un numero è un numero solo se non ci sono parole dentro. */
const SOLO_NUMERO = /^[+0-9\s.\-/()]+$/

/**
 * Lo stesso numero scritto in forma internazionale.
 *
 * Perché internazionale: un numero che si compone da un telefono di scuola
 * funziona anche così, uno che parte da un cellulare in trasferta o da una
 * rubrica sincronizzata soltanto così; e un elenco in cui metà dei numeri ha lo
 * zero davanti e metà no non si ordina, non si confronta e non si incolla da
 * nessuna parte.
 *
 * La spaziatura resta quella che ha scelto chi ha scritto: `079 000 00 00`
 * diventa `+41 79 000 00 00` e non `+41790000000`. Un numero si rilegge a
 * gruppi, e riformattarlo a modo nostro vorrebbe dire imporre la spaziatura
 * svizzera anche a un numero che svizzero non è.
 *
 * Non si tocca quel che non si è sicuri di aver capito: un numero con dentro
 * una parola (`091 000 00 00 int. 12`), uno troppo corto per essere un numero,
 * uno che il prefisso ce l'ha già. Meglio un numero scritto come l'ha scritto
 * una persona che un numero riscritto male da un programma.
 */
export function conPrefissoInternazionale (numero: string): string {
  const scritto = numero.trim().replace(/\s+/g, ' ')
  if (scritto === '' || !SOLO_NUMERO.test(scritto)) return scritto
  // Già internazionale: il paese l'ha dichiarato chi ha scritto, e non siamo
  // noi a doverglielo cambiare.
  if (scritto.startsWith('+')) return scritto

  // `0041` e `0039` sono lo stesso `+` scritto come si fa da un telefono fisso.
  if (scritto.startsWith('00')) {
    const resto = scritto.slice(2).trimStart()
    return resto === '' ? scritto : `+${resto}`
  }

  // Lo zero davanti è il modo di dire «chiamata nazionale»: in forma
  // internazionale quel posto lo prende il prefisso del paese.
  if (scritto.startsWith('0')) {
    const resto = scritto.slice(1).trimStart()
    return /\d/.test(resto) ? `${PREFISSO_PAESE} ${resto}` : scritto
  }

  // Nove cifre senza niente davanti sono un numero svizzero a cui qualcuno ha
  // tolto anche lo zero: `79 000 00 00`.
  return /^\d{9}$/.test(scritto.replace(/\D/g, '')) ? `${PREFISSO_PAESE} ${scritto}` : scritto
}

/** I segni con cui due numeri sono finiti nella stessa casella. */
const FRA_DUE_NUMERI = /[,;/\n]/

/**
 * Due numeri scritti in una casella sola tornano due numeri.
 *
 * Finché la casella era una, chi ne aveva due li scriveva di fila separati da
 * una virgola: «### ### ## ##, ### ### ## ##». Sul foglio stampato quella
 * riga non era un numero componibile, e a schermo il tasto che copia copiava
 * tutti e due insieme.
 *
 * Si separa solo quando sono davvero due numeri: uno slash con dietro due
 * cifre — «091 000 00 00/01», l'interno accanto al centralino — non fa due
 * numeri, fa un numero e una coda, e spezzarlo darebbe una riga con dentro
 * «01». La regola è sei cifre: sotto, non è un numero che sta in piedi da
 * solo.
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
 * Che numero sembra, a giudicare da com'è fatto.
 *
 * In Svizzera il primo numero dopo lo zero dice già molto: il 7 è un
 * cellulare, tutto il resto è un numero fisso. Non è una certezza e non
 * pretende di esserlo — serve a dare un nome ai numeri che arrivano da un file
 * vecchio, dove il nome non c'era proprio, invece di chiamarli tutti
 * «cellulare» e lasciare a chi legge il compito di correggerli uno per uno.
 *
 * Quel che l'ha scritto a mano non si tocca mai: questa funzione serve solo
 * dove non c'era niente da leggere.
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
 * Vero quando il nome di un numero dice il contrario del numero.
 *
 * Un 091 chiamato «cellulare» e un 079 chiamato «centralino» sono due righe
 * che si leggono al contrario di come stanno: chi cerca un numero a cui
 * rispondono di sabato prova quello sbagliato. Sono il rimasuglio dei file in
 * cui l'etichetta non c'era e tutti i numeri sono entrati con lo stesso nome.
 *
 * Solo per i numeri svizzeri: in Italia i cellulari cominciano per 3, in
 * Francia per 6 o 7, e una regola svizzera applicata a un numero italiano
 * segnalerebbe come storto un numero giusto. «altro» non contraddice niente —
 * è il nome che si dà a quel che non si sa come chiamare.
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
 * Il numero da comporre per primo per un contatto, o stringa vuota.
 *
 * È quel che serve a chi ha un campo solo da riempire — la scheda stampata,
 * una colonna di tabella — e non deve scegliere: sceglie l'ordine, che l'ha
 * deciso chi ha scritto l'anagrafica.
 */
export function primoTelefono (allievo: Allievo, contatto: ContattoTelefonico): string {
  return telefoniDi(allievo, contatto)[0]?.numero ?? ''
}

/**
 * Tutti i numeri di un contatto in una riga sola: «079 000 00 00 (cellulare) ·
 * 091 000 00 00 (casa)».
 *
 * Serve ai fogli stampati, dove una riga per numero farebbe una scheda di
 * mezze righe vuote. L'etichetta sta fra parentesi e non davanti: quel che si
 * cerca con l'occhio e' il numero.
 */
export function scriviTelefoni (allievo: Allievo, contatto: ContattoTelefonico): string {
  return telefoniDi(allievo, contatto)
    .map((t) => `${t.numero} (${ETICHETTE_TELEFONO[t.etichetta]})`)
    .join(' · ')
}

/**
 * Il numero ridotto a quel che si può comporre, o niente.
 *
 * Chi telefona non compone gli spazi, le barre e le parentesi con cui un
 * numero si legge: `+41 91 000 00 00` e `091/000.00.00` sono lo stesso numero,
 * e al programma che chiama va consegnato in una forma sola — cifre e, se c'è,
 * il `+` davanti.
 *
 * Torna `null` quando quel che c'è scritto non è un numero da comporre: una
 * casella con dentro una parola (`091 000 00 00 int. 12` — l'interno non si
 * compone con il resto), o quattro cifre che non bastano a raggiungere
 * nessuno. Meglio un pulsante che non compare che uno che compone un numero
 * sbagliato.
 *
 * Passa dal prefisso internazionale per lo stesso motivo per cui ci passa
 * quel che si salva: un numero senza paese davanti, chiamato da un cellulare
 * agganciato a una rete straniera, non è il numero di nessuno.
 */
export function numeroComponibile (numero: string): string | null {
  const scritto = conPrefissoInternazionale(numero)
  if (!SOLO_NUMERO.test(scritto.trim())) return null
  const cifre = scritto.replace(/\D/g, '')
  if (cifre.length < 5) return null
  return scritto.trimStart().startsWith('+') ? `+${cifre}` : cifre
}
