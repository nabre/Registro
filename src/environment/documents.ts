// I documenti d'anno che si sono aperti: i recenti, e quelli tenuti da parte.
//
// Un anno è un file — `2026-2027.registro` — e i file si riaprono. Fin qui
// l'unico modo di tornare su un anno che sta in un'altra cartella era rifare il
// giro del gestore di file: «Apri un anno…», sfoglia, trova, apri. Un elenco di
// quel che si è aperto costa poche righe e toglie quel giro.
//
// Due cose in un elenco solo, distinte da un interruttore. I *recenti* si
// scrivono da sé e scadono: ne restano dodici, e il tredicesimo spinge fuori il
// più vecchio. I *preferiti* li mette chi lavora, e non scadono mai — è il modo
// di dire «questo mi serve tutto l'anno», e un elenco che se lo dimentica
// perché nel frattempo si sono aperti altri dodici file non serve a niente.
//
// Sta in `userData` e non nella cartella di lavoro, che è l'unica scelta
// possibile: l'elenco parla di documenti che stanno in cartelle diverse — è
// tutto il suo scopo — e scriverlo dentro una di quelle vorrebbe dire un elenco
// per cartella, ognuno che ignora gli altri.
//
// Un percorso che non esiste più non si cancella da solo: chi legge l'elenco
// dice che manca — una chiavetta staccata, una cartella sincronizzata non
// ancora scesa — e chi guarda decide se toglierlo. Cancellarlo di nostra
// iniziativa vorrebbe dire perdere i preferiti di chi apre il registro con il
// disco esterno scollegato.

import { app } from 'electron'
import { existsSync } from 'node:fs'
import { depositoJson } from './jsonStore.js'
import * as percorso from 'node:path'

import { EventEmitter } from './events.js'

const NOME_FILE = 'documenti.json'

/** Quanti recenti si tengono. I preferiti non contano: non scadono. */
const QUANTI_RECENTI = 12

/** Un documento che si è aperto almeno una volta, o che si è messo da parte. */
export interface DocumentoNoto {
  /** Il percorso vero sul disco: è la chiave, e l'unica cosa che si scrive. */
  percorso: string
  /** Il nome dell'anno, senza estensione: `2026-2027`. */
  nome: string
  /** La cartella che lo contiene, per distinguere due anni omonimi. */
  cartella: string
  preferito: boolean
  /** Quando lo si è aperto l'ultima volta, in millisecondi. */
  ultimoUso: number
  /** Vero se in questo momento sul disco non c'è: si dice, non si cancella. */
  mancante: boolean
  /**
   * Vero se e' il documento aperto adesso.
   *
   * Calcolato qui e non nell'interfaccia: il confronto fra due percorsi e' una
   * regola del sistema operativo, e il pannello non ha `path` per farla bene.
   */
  aperto: boolean
}

/** Quel che si scrive nel file: il minimo che non si può ricavare dal percorso. */
interface VoceScritta {
  percorso: string
  preferito?: boolean
  ultimoUso?: number
}

const emettitore = new EventEmitter<DocumentoNoto[]>()

/** Scatta quando l'elenco cambia: il menu si rifà, e il pannello lo rispinge. */
export const alCambioDocumenti = emettitore.event

function file (): string {
  return percorso.join(app.getPath('userData'), NOME_FILE)
}

/** Le voci scritte sul disco, scartando quelle senza percorso. */
function riconosci (letto: unknown): VoceScritta[] {
  const elenco = Array.isArray(letto) ? letto : (letto as { voci?: unknown })?.voci
  if (!Array.isArray(elenco)) return []
  return elenco.filter(
    (v): v is VoceScritta =>
      v !== null && typeof v === 'object' && typeof (v as VoceScritta).percorso === 'string',
  )
}

// Il file dei recenti non vale un avviso in faccia a chi sta aprendo un anno,
// ma non vale nemmeno cancellarlo: `depositoJson` distingue «mai scritto» —
// elenco vuoto, si salva — da «c'è ma non si legge» — elenco vuoto per questa
// sessione, e non si tocca niente sul disco.
const deposito = depositoJson<VoceScritta[]>(file, riconosci, () => [])

function caricate (): VoceScritta[] {
  return deposito.contenuto()
}

function salva (muta: (attuale: VoceScritta[]) => VoceScritta[]): void {
  try {
    deposito.salva(muta)
  } catch {
    // Disco pieno o cartella sparita: l'elenco resta in memoria per questa
    // sessione e si riproverà alla prossima.
  }
  // L'elenco e' appena cambiato: e' il momento in cui i file da guardare sono
  // altri, ed e' l'unico in cui rileggere il disco serve davvero. Si rilegge
  // quel che il deposito ha in memoria adesso, non la fotografia del
  // chiamante: dopo `salva` sono la stessa cosa, e quando la scrittura non è
  // riuscita quella del deposito è l'unica vera.
  rileggiMancanti(caricate())
  emettitore.fire(documentiNoti())
}

/**
 * Due percorsi che indicano lo stesso file: su Windows anche con altre
 * maiuscole.
 *
 * Esce di qui perche' e' la risposta autorevole — lo dice gia'
 * `api/procedure/documenti.ts` — e l'interfaccia se la ricalcolava a modo suo,
 * con un `toLowerCase()` e **senza** `resolve`: con il percorso corrente
 * scritto `C:\\Docenti\\anno.registro` e la voce recente
 * `C:/Docenti/anno.registro`, qui i due sono lo stesso file — e infatti la voce
 * non viene duplicata — mentre di la' no. L'elenco «Registri recenti» mostrava
 * quindi una riga sola, con quel file aperto, e nessuna riga accesa.
 */
export function stessoFile (uno: string, altro: string): boolean {
  const normale = (valore: string) => percorso.resolve(valore)
  return process.platform === 'win32'
    ? normale(uno).toLowerCase() === normale(altro).toLowerCase()
    : normale(uno) === normale(altro)
}

/**
 * Quali file dell'elenco adesso non ci sono: una chiavetta staccata, una
 * cartella sincronizzata non ancora scesa.
 *
 * Tenuto da parte invece di richiesto ogni volta. `noto()` faceva `existsSync`
 * riga per riga, e `documentiNoti()` sta dentro la spinta di stato del
 * pannello: dodici-venti chiamate di sistema **per ogni scrittura**, compreso
 * un voto salvato o una casella d'appello. Su disco locale non conta; ma i
 * documenti recenti stanno per definizione dove il docente tiene i suoi anni,
 * cioe' su OneDrive o su una condivisione di rete, e li' uno `stat` su un
 * segnaposto non sincronizzato costa millisecondi. Sull'appello di una classe
 * da venticinque erano fra le seicento e le mille chiamate.
 *
 * Si rinfresca quando l'elenco cambia — che e' l'unico momento in cui puo'
 * cambiare per causa nostra — e a ogni `ricorda`/`dimentica`, cioe' ogni volta
 * che si apre o si chiude un documento.
 */
let mancanti = new Set<string>()
let mancantiLetti = false

function rileggiMancanti (voci: VoceScritta[]): void {
  mancanti = new Set(voci.filter((v) => !existsSync(v.percorso)).map((v) => v.percorso))
  mancantiLetti = true
}

function noto (voce: VoceScritta, corrente: string | null): DocumentoNoto {
  const nome = percorso.basename(voce.percorso).replace(/\.registro$/i, '')
  return {
    percorso: voce.percorso,
    nome,
    cartella: percorso.dirname(voce.percorso),
    preferito: Boolean(voce.preferito),
    ultimoUso: voce.ultimoUso ?? 0,
    mancante: mancanti.has(voce.percorso),
    aperto: corrente !== null && stessoFile(voce.percorso, corrente),
  }
}

/**
 * L'elenco come lo si mostra: i preferiti in cima, e sotto i recenti dal più
 * fresco. È l'ordine in cui li si cerca — quel che si è messo da parte sta
 * dov'è sempre stato, quel che si è aperto ieri è in alto fra gli altri.
 */
export function documentiNoti (corrente: string | null = null): DocumentoNoto[] {
  const voci = caricate()
  // La prima volta si guarda il disco: dopo, solo quando l'elenco cambia.
  if (!mancantiLetti) rileggiMancanti(voci)
  return voci
    .map((voce) => noto(voce, corrente))
    .sort((a, b) => {
      if (a.preferito !== b.preferito) return a.preferito ? -1 : 1
      return b.ultimoUso - a.ultimoUso
    })
}

/** Taglia i recenti di troppo. I preferiti restano comunque. */
function potaRecenti (elenco: VoceScritta[]): VoceScritta[] {
  const recenti = elenco
    .filter((v) => !v.preferito)
    .sort((a, b) => (b.ultimoUso ?? 0) - (a.ultimoUso ?? 0))
  const daTogliere = new Set(recenti.slice(QUANTI_RECENTI))
  return daTogliere.size === 0 ? elenco : elenco.filter((v) => !daTogliere.has(v))
}

/**
 * Segna un documento come appena aperto.
 *
 * Lo dice anche al sistema operativo: la lista dei documenti recenti di
 * Windows e di macOS è il posto in cui si torna su un file senza nemmeno
 * aprire il programma — tasto destro sull'icona nella barra — e riempirla non
 * costa niente perché il gesto è già passato di qui.
 */
export function segnaDocumentoAperto (percorsoFile: string): void {
  salva((attuale) => {
    const gia = attuale.find((v) => stessoFile(v.percorso, percorsoFile))
    // Il percorso si riscrive con quello di adesso: lo stesso file può arrivare
    // con maiuscole diverse o da un collegamento, e mostrarne due righe uguali
    // sarebbe un elenco che si contraddice.
    const elenco = gia
      ? attuale.map((v) =>
          v === gia ? { ...v, percorso: percorsoFile, ultimoUso: Date.now() } : v)
      : [...attuale, { percorso: percorsoFile, ultimoUso: Date.now() }]
    return potaRecenti(elenco)
  })

  // `addRecentDocument` non c'è nel finto Electron delle prove, e non è un
  // motivo per non segnare l'apertura.
  try {
    app.addRecentDocument?.(percorsoFile)
  } catch {
    // Su Linux la lista di sistema può non esserci: non è un guasto.
  }
}

/** Mette da parte un documento, o lo lascia tornare fra i recenti. */
export function impostaPreferito (percorsoFile: string, preferito: boolean): void {
  salva((attuale) => {
    const gia = attuale.find((v) => stessoFile(v.percorso, percorsoFile))
    if (gia) {
      return potaRecenti(attuale.map((v) => (v === gia ? { ...v, preferito } : v)))
    }
    // Togliere il segno a un documento che nell'elenco non c'è non è niente.
    if (!preferito) return attuale
    return potaRecenti(
      [...attuale, { percorso: percorsoFile, preferito: true, ultimoUso: Date.now() }],
    )
  })
}

/** Toglie un documento dall'elenco. Il file sul disco non si tocca. */
export function dimenticaDocumento (percorsoFile: string): void {
  salva((attuale) => {
    const rimasti = attuale.filter((v) => !stessoFile(v.percorso, percorsoFile))
    return rimasti.length === attuale.length ? attuale : rimasti
  })
}

/** Rilegge il file. Serve alle prove, che scrivono in una `userData` loro. */
export function ricaricaDocumenti (): void {
  deposito.dimentica()
}
