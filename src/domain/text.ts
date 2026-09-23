// Le piccole regole sul testo che il registro usa dappertutto: come si
// confronta un nome, come si conta al plurale, come si riempie un modello.
//
// Stanno qui e non sparse perché erano scritte due o tre volte ciascuna, con
// piccole differenze — e la differenza fra «rossi» e «Rossi » è il modo in cui
// due materie uguali finiscono per essere due, o un allievo non si ritrova.
// Il file non importa nulla: lo possono usare tutti senza giri.

/**
 * Due nomi in ordine, come li metterebbe una persona.
 *
 * `'it'` per gli accenti, e `numeric` per i numeri dentro il nome: senza, le
 * classi si elencano «M1, M10, M2, M3» — il confronto è lettera per lettera, e
 * «1» viene prima di «2» anche quando dietro c'è uno zero. Il registro è pieno
 * di nomi che finiscono con un numero: le classi, i corsi che se le portano
 * dietro nel titolo, le materie numerate.
 *
 * Esce di qui perché l'ordine dev'essere lo stesso ovunque: nella barra
 * laterale, nelle tendine, nella pagina delle classi e dentro il documento
 * salvato. Un elenco ordinato in due modi diversi nella stessa applicazione si
 * nota, e si nota come un difetto.
 */
export function confrontaNomi (a: string, b: string): number {
  return a.localeCompare(b, 'it', { numeric: true })
}

/**
 * Un percorso battuto a mano, senza le virgolette che Windows ci mette attorno.
 *
 * «Copia come percorso» nell'Explorer consegna `"C:\Program Files\…"`,
 * virgolette comprese, e chi incolla quel testo in un campo che vuole un
 * percorso incolla anche quelle. Senza toglierle il file «non esiste», e non
 * c'è modo di capire perché guardandolo: le virgolette in un campo di testo si
 * leggono come se fossero lì per dire «questo è un percorso».
 *
 * Stava scritto a mano in sette punti di `dati/` — due per la dettatura, tre
 * per i modelli, uno per i corredi, uno per le scansioni — sempre con lo stesso
 * `.trim()` davanti, perché un percorso incollato porta con sé anche lo spazio
 * di troppo.
 */
export function senzaVirgolette (scritto: string): string {
  return scritto.trim().replace(/^"(.*)"$/, '$1')
}

/**
 * Una quota da 0 a 1 scritta com'è da leggere: «83%».
 *
 * Arrotondata all'intero, perché un decimale su una percentuale di presenza
 * dice una precisione che i dati non hanno: le UD si contano a decine, e
 * l'83.3% è cinque sesti — scriverlo con il decimale fa credere a un conto più
 * fine di quello che è.
 *
 * `vuoto` è quel che si scrive quando la quota non c'è, e non è sempre un
 * trattino: su un rapporto di presenze «appello mai fatto» dice **perché** non
 * c'è il numero, e uno zero al suo posto direbbe una cosa falsa.
 */
export function percento (quota: number | null | undefined, vuoto = '—'): string {
  return quota === null || quota === undefined ? vuoto : `${Math.round(quota * 100)}%`
}

/**
 * Un testo ridotto a quel che serve per confrontarlo: minuscolo, senza
 * accenti, senza punteggiatura, con gli spazi normalizzati.
 *
 * Gli accenti se ne vanno perché la segreteria stampa «Muller» dove il registro
 * scrive «Müller» abbastanza spesso da non poterci contare, e «Ed. fisica» e
 * «ed.  fisica» sono la stessa materia scritta due volte.
 */
export function normalizzaTesto (testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * I pezzi di una ricerca scritta a mano, pronti per il confronto.
 *
 * Passa da `normalizzaTesto`, e è tutto il punto: chi cerca scrive «muller»,
 * «MULLER» o «Müller» a seconda della tastiera che ha sotto le mani e di
 * quanta fretta ha, e sono tre modi di cercare la stessa persona. Cercare è
 * un gesto di fretta per definizione — lo si fa per **non** dover ricordare
 * come si scriveva — quindi la ricerca si adatta a chi scrive, e mai il
 * contrario.
 *
 * Si spezza **dopo** aver normalizzato: così «dell’acqua» diventa due pezzi,
 * «dell» e «acqua», e li trova tutti e due dentro «Dell'Acqua» comunque sia
 * scritto l'apostrofo — dritto, curvo o dimenticato.
 *
 * La paglia in cui si cerca deve passare dalla stessa funzione: due
 * normalizzazioni diverse ai due capi del confronto sono un confronto che
 * funziona finché nessuno ha l'accento nel cognome.
 */
export function pezziDiRicerca (cercato: string): string[] {
  return normalizzaTesto(cercato).split(' ').filter(Boolean)
}

/**
 * Vero se ogni pezzo della ricerca si trova nella paglia.
 *
 * Ogni pezzo, non almeno uno: «rossi dic» è Rossi della DIC4a e non tutti i
 * Rossi più tutta la DIC4a. È il modo in cui una parola in più **restringe**
 * la ricerca, che è quel che chi scrive si aspetta.
 *
 * Senza pezzi è vero: una ricerca vuota non è una ricerca senza risultati.
 */
export function corrispondeAlla (paglia: string, pezzi: readonly string[]): boolean {
  const normale = normalizzaTesto(paglia)
  // Senza spazi è la seconda prova, e serve per una ragione sola:
  // l'apostrofo. «Dell'Acqua» normalizzato è «dell acqua», e chi cerca scrive
  // «dellacqua» tutto attaccato almeno quanto lo scrive staccato — sono due
  // modi di scrivere lo stesso cognome, non due cognomi. Vale per «D'Amico»,
  // «De' Rossi» e per ogni nome composto scritto con o senza il segno.
  //
  // Il prezzo è che un pezzo può trovarsi a cavallo di due parole:
  // «simaria» sta dentro «rossi maria» schiacciato. In una ricerca — dove il
  // risultato si guarda — una riga in più costa un'occhiata; una riga in meno
  // costa la persona che non si trova.
  const schiacciata = normale.replace(/ /g, '')
  return pezzi.every(
    (pezzo) => normale.includes(pezzo) || schiacciata.includes(pezzo.replace(/ /g, '')),
  )
}

/**
 * Vero se `parola` compare intera dentro `testo`, e non come pezzo di un'altra:
 * «conti» non sta dentro «acconti», «rossi» non sta dentro «grossi». Tutti e
 * due devono già essere passati da `normalizzaTesto`.
 */
export function contieneParola (testo: string, parola: string): boolean {
  if (!parola) return false
  return ` ${testo} `.includes(` ${parola} `)
}

/** «1 lezione», «3 lezioni»: il numero con la parola giusta. */
export function plurale (quanti: number, uno: string, molti: string): string {
  return `${quanti} ${quanti === 1 ? uno : molti}`
}

/**
 * Un modello con i segnaposto fra graffe riempiti dai valori dati.
 *
 * Uno sconosciuto resta com'è scritto invece di sparire: un `{azienda}` rimasto
 * in mezzo alla lettera si vede subito, mentre un buco si scopre solo dopo
 * averla spedita a venticinque aziende.
 */
export function compilaModello (modello: string, valori: Record<string, string>): string {
  return modello.replace(/\{(\w+)\}/g, (intero, chiave: string) =>
    chiave in valori ? valori[chiave] : intero,
  )
}

/** Un indirizzo si controlla quel tanto che basta a intercettare un refuso. */
export function emailValida (valore: unknown): boolean {
  return typeof valore === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valore.trim())
}

/**
 * Aggiunge un indirizzo a un elenco senza doppioni, se è un indirizzo. Torna
 * falso quando non lo è: chi chiama deve dire per nome chi resta senza.
 */
export function aggiungiIndirizzo (elenco: Set<string>, valore: string | undefined): boolean {
  const pulito = (valore ?? '').trim()
  if (!emailValida(pulito)) return false
  elenco.add(pulito.toLowerCase())
  return true
}

/**
 * Un percorso letto da un file, con le barre nel verso giusto. I file del
 * registro passano da Windows e da OneDrive, e una backslash scritta a mano
 * non deve diventare un file introvabile.
 */
export function percorsoRelativo (valore: unknown): string {
  return typeof valore === 'string' ? valore.replace(/\\+/g, '/') : ''
}

/** Il nome del file in fondo a un percorso, o stringa vuota. */
export function nomeDelFile (percorso: string): string {
  return percorso.split('/').pop() ?? ''
}

// ------------------------------------------------------------------ file

/** I nomi che Windows non accetta come file o cartella, con o senza estensione. */
const RISERVATI_WINDOWS = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i

/**
 * Un nome che si può scrivere su disco su tutti i sistemi: via i caratteri
 * vietati, i caratteri di controllo, i punti e gli spazi in coda — Windows non
 * li tiene nei nomi di cartella, e lo si scoprirebbe con una cartella che non
 * si crea — e i nomi riservati. Era scritto quattro volte, ognuna con una
 * regola in meno.
 */
export function nomeSicuro (etichetta: string, ripiego = 'senza nome'): string {
  const pulito = etichetta
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/, '')
    .trim()
  if (!pulito) return ripiego
  return RISERVATI_WINDOWS.test(pulito) ? `${pulito}-` : pulito
}

/** L'estensione di un nome di file, punto compreso, o quella di ripiego. */
export function estensioneDi (nome: string, ripiego = '.pdf'): string {
  const solo = nomeDelFile(nome)
  const punto = solo.lastIndexOf('.')
  return punto > 0 ? solo.slice(punto).toLowerCase() : ripiego
}

/**
 * L'impronta di un testo: la stessa stringa dà sempre lo stesso numero.
 *
 * Serve a dire «questo file è ancora quello che avevo scritto io» senza tenere
 * una copia del file: due modelli di quarantamila caratteri per una dozzina di
 * modelli sarebbero mezzo megabyte di doppioni nella cartella del docente.
 * Non è una firma — di sicurezza qui non ce n'è bisogno, nessuno guadagna
 * niente a far collidere l'impronta di un verbale — è il confronto fra due
 * versioni dello stesso file, ed è FNV-1a, che si legge in dieci righe.
 */
export function impronta (testo: string): string {
  let valore = 0x811c9dc5
  for (let i = 0; i < testo.length; i += 1) {
    valore ^= testo.charCodeAt(i)
    // I quattro fattori del primo FNV (16777619), sommati come fa la
    // moltiplicazione a 32 bit: `Math.imul` in un colpo solo.
    valore = Math.imul(valore, 0x01000193)
  }
  // Senza segno e in esadecimale: è un'etichetta, e si scrive dentro un JSON.
  return (valore >>> 0).toString(16).padStart(8, '0')
}
