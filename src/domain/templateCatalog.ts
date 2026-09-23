// Che cos'è ogni file di `templates/`, detto in un posto solo.
//
// La cartella dei modelli è un elenco di nomi di file, e un nome di file non
// dice niente a chi non ha già letto il LEGGIMI: `_stile.tpl` e
// `momento-valutazione.tpl` si somigliano abbastanza da sembrare la stessa
// specie di cosa, e non lo sono — uno vale per tutti i rapporti, l'altro
// disegna un foglio solo. Finché i modelli si aprivano con un editor di testo
// la differenza la spiegava il commento in testa al file; da quando si aprono
// dentro il registro, la deve dire l'elenco.
//
// Sta nel dominio e non nella pagina per due motivi. Il primo è che serve
// anche all'host — l'anteprima di uno strato comune si guarda su un rapporto
// vero, e quale sia lo dice questa tabella. Il secondo è che così si prova:
// che il catalogo e la cartella dicano gli stessi nomi è l'unica cosa qui che
// può rompersi in silenzio — un modello aggiunto a `templates/` e non qui
// resterebbe in fondo all'elenco senza titolo e senza anteprima.

import type { GenereRapporto } from './locations.js'

/**
 * A che cosa serve un file della cartella.
 *
 *   `comune`   sta sotto tutti: cambiando lui cambiano tutti i rapporti
 *   `rapporto` disegna un foglio solo, ed è il foglio che porta il suo nome
 *   `posta`    non è un rapporto: è la firma che va in fondo alle e-mail
 *   `immagine` un file che i modelli mostrano: il logo della sede
 *
 * È la divisione con cui l'elenco si raggruppa, e non è estetica: è la sola
 * cosa che dice in anticipo quanto è grosso l'effetto di una modifica.
 */
export type RuoloModello = 'comune' | 'rapporto' | 'posta' | 'immagine'

interface VoceCatalogo {
  /** Come si chiama il modello: `_base`, `verbale-lezione`, `_firma.html`. */
  nome: string
  /** Come si legge nell'elenco. */
  titolo: string
  ruolo: RuoloModello
  /** La riga sotto il titolo: che cosa cambia toccando questo file. */
  aiuto: string
  /**
   * Il rapporto che questo modello disegna, per chi ne fa l'anteprima.
   *
   * Gli strati comuni non ne hanno uno loro e ne prendono in prestito uno:
   * `_base` cambia l'intestazione di tutti i fogli, e la si guarda su un
   * verbale perché guardarla sul vuoto non vorrebbe dire niente.
   */
  genere: GenereRapporto | null
}

/**
 * I file di `templates/` come li vede chi li apre.
 *
 * L'ordine è quello dell'elenco: prima i quattro strati comuni — si toccano
 * per cambiare tutti i rapporti insieme, ed è la domanda più frequente — poi i
 * rapporti uno per uno, e in fondo la firma delle e-mail, che è di un'altra
 * specie.
 */
export const CATALOGO_MODELLI: readonly VoceCatalogo[] = [
  {
    nome: '_base',
    titolo: 'Intestazione e piede',
    ruolo: 'comune',
    aiuto: 'La testata e il piè di pagina di tutti i rapporti: la sede, il logo, chi firma',
    genere: 'lezione',
  },
  {
    nome: '_stile',
    titolo: 'Misure del foglio',
    ruolo: 'comune',
    aiuto: 'Formato, margini, corpi del testo, altezza delle righe: quanto è grande tutto',
    genere: 'valutazioni',
  },
  {
    nome: '_testi',
    titolo: 'Frasi e nomi delle colonne',
    ruolo: 'comune',
    aiuto: 'Come il registro dice le cose: le frasi con dentro un numero, i titoli delle colonne',
    genere: 'presenze',
  },
  {
    nome: '_blocchi',
    titolo: 'Pezzi riusabili',
    ruolo: 'comune',
    aiuto: 'I pezzi di corpo che più rapporti richiamano con «usa:»: l’apertura, l’appello',
    genere: 'lezione',
  },
  {
    nome: 'verbale-lezione',
    titolo: 'Verbale della lezione',
    ruolo: 'rapporto',
    aiuto: 'Il foglio di un’ora svolta: appello, consuntivo, osservazioni',
    genere: 'lezione',
  },
  {
    nome: 'piano-lezione',
    titolo: 'Piano lezione',
    ruolo: 'rapporto',
    aiuto: 'La scaletta di un’ora, da avere in mano prima di entrare',
    genere: 'piano',
  },
  {
    nome: 'valutazioni-classe',
    titolo: 'Griglia dei voti',
    ruolo: 'rapporto',
    aiuto: 'Una riga per allievo, una colonna per prova, e la media in fondo',
    genere: 'valutazioni',
  },
  {
    nome: 'presenze-classe',
    titolo: 'Presenze della classe',
    ruolo: 'rapporto',
    aiuto: 'Assenze, ritardi e percentuali di un corso nel periodo scelto',
    genere: 'presenze',
  },
  {
    nome: 'scheda-allievo',
    titolo: 'Scheda personale',
    ruolo: 'rapporto',
    aiuto: 'Il foglio di una persona in formazione: voti, presenze, osservazioni',
    genere: 'allievo',
  },
  {
    nome: 'momento-valutazione',
    titolo: 'Scheda di una prova',
    ruolo: 'rapporto',
    aiuto: 'Una prova per esteso, con la distribuzione dei voti',
    genere: 'momento',
  },
  {
    nome: 'fascicolo-classe',
    titolo: 'Fascicolo di classe',
    ruolo: 'rapporto',
    aiuto: 'Il quadro della classe per chi ne è docente: recapiti, documenti, assenze',
    genere: 'fascicolo',
  },
  {
    nome: 'foto-classe',
    titolo: 'Parete di ritratti',
    ruolo: 'rapporto',
    aiuto: 'Le facce della classe su un foglio solo, con i nomi sotto',
    genere: 'foto-classe',
  },
  {
    nome: '_firma.html',
    titolo: 'Firma delle e-mail',
    ruolo: 'posta',
    aiuto: 'Quel che il registro mette in fondo a ogni messaggio che spedisce. È HTML',
    genere: null,
  },
]

/** La voce del catalogo con quel nome, o niente se il file non è dei nostri. */
export function voceModello (nome: string): VoceCatalogo | null {
  return CATALOGO_MODELLI.find((voce) => voce.nome === nome) ?? null
}

/**
 * Come si legge un modello nell'elenco: il titolo del catalogo, o il nome del
 * file per quelli che qualcuno ha aggiunto a mano.
 *
 * Un file sconosciuto non sparisce e non è un errore: la cartella è del
 * docente, e chi ci mette dentro un modello suo deve poterlo aprire da qui
 * come gli altri.
 */
export function titoloModello (nome: string): string {
  return voceModello(nome)?.titolo ?? nome
}

/**
 * Su quale rapporto si guarda l'anteprima di un modello.
 *
 * Per un rapporto è il suo; per uno strato comune è quello che il catalogo gli
 * presta. Null vuol dire che non c'è niente da guardare — la firma delle
 * e-mail non è un PDF — e chi chiede l'anteprima lo dice invece di comporre un
 * foglio vuoto.
 */
export function genereDiProva (nome: string): GenereRapporto | null {
  return voceModello(nome)?.genere ?? null
}

/** Il nome del file su disco: `_base` è `_base.tpl`, `_firma.html` è già un file. */
export function fileDelModello (nome: string): string {
  return nome.includes('.') ? nome : `${nome}.tpl`
}

/** Il nome del modello ricavato dal file: l'inverso di `fileDelModello`. */
export function modelloDelFile (file: string): string {
  return file.endsWith('.tpl') ? file.slice(0, -'.tpl'.length) : file
}

/**
 * I file che la cartella può contenere: i modelli, la firma, e le immagini che
 * un modello nomina.
 *
 * Il controllo sta nel dominio perché lo fanno in due — la pagina, che non
 * offre di aprire quel che non sa mostrare, e l'host, che scrive davvero — e
 * due controlli diversi sulla stessa cosa sono un buco che si apre al primo
 * che cambia.
 */
export function nomeFileAmmesso (file: string): boolean {
  return /^[A-Za-z0-9_ -]+\.(tpl|html|png|jpe?g)$/i.test(file)
}

/** Se quel file è un modello da modificare, e non un'immagine. */
export function fileDiTesto (file: string): boolean {
  return /\.(tpl|html)$/i.test(file)
}

/**
 * Che cosa il registro deve fare di un modello che trova su disco.
 *
 * La copia di serie cambia con il programma: una sezione nuova in un verbale,
 * una colonna in una tabella. Finora non arrivava mai a chi il registro lo
 * usava già — la cartella si riempiva al primo avvio e da lì in poi i file non
 * si toccavano più — e un docente che non avesse mai aperto un modello
 * continuava a stampare il verbale di due versioni prima senza saperlo.
 *
 * Il criterio è uno solo, e non si indovina: il registro si ricorda che cosa
 * ha scritto lui — l'impronta `scritto` — e a che cosa quel file assomigliava
 * — l'impronta `base`, la copia di serie del giorno in cui quel file è stato
 * salvato l'ultima volta. Da lì i quattro casi si distinguono senza mai
 * sovrascrivere il lavoro di nessuno.
 */
type SortoModello =
  /** Non c'è: si scrive la copia di serie. */
  | 'manca'
  /** È ancora quel che il registro aveva scritto, e di serie è cambiata: si riscrive. */
  | 'aggiorna'
  /** Su disco c'è esattamente la copia di serie di adesso: niente da fare. */
  | 'uguale'
  /** L'ha cambiato qualcuno, e di serie non è cambiato niente: si lascia stare. */
  | 'tuo'
  /** L'ha cambiato qualcuno, e di serie nel frattempo è cambiata: si lascia, e si dice. */
  | 'arretrato'

export function sorteModello (quadro: {
  /** Il testo su disco, o `null` se il file non c'è. */
  suDisco: string | null
  /** La copia di serie di adesso, o `null` se quel modello non ne ha una. */
  diSerie: string | null
  /** L'impronta di quel che il registro aveva scritto l'ultima volta. */
  scritto?: string
  /** L'impronta della copia di serie di quel giorno. */
  base?: string
  impronta: (testo: string) => string
}): SortoModello {
  const { suDisco, diSerie, scritto, base } = quadro
  if (diSerie === null) return 'tuo'
  if (suDisco === null) return 'manca'
  if (suDisco === diSerie) return 'uguale'
  // Quel che il registro aveva scritto, intatto: aggiornarlo non cancella
  // niente di nessuno, ed è l'unico caso in cui si riscrive da soli.
  if (scritto && quadro.impronta(suDisco) === scritto) return 'aggiorna'
  // Modificato a mano. Si dice soltanto se la copia di serie è cambiata da
  // quando quel file è stato salvato: altrimenti non c'è niente da sapere —
  // è diverso perché qualcuno lo ha voluto diverso.
  if (base && base !== quadro.impronta(diSerie)) return 'arretrato'
  return 'tuo'
}
