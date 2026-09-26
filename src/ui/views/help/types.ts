// La forma di una sezione della guida, e le regole per scriverla.
// Il contenuto è una struttura di dati, non un albero di `h()`: aggiungere una
// funzione vuol dire aggiungere una riga nel file della sua parte.
//
// Regole di scrittura per tutti i file di questa cartella:
//   - due soli segni: `**grassetto**` per il nome di un pulsante o di una cosa
//     sullo schermo, `` `codice` `` per quel che si batte;
//   - il nome di un pulsante si scrive com'è scritto sullo schermo;
//   - una voce risponde a una domanda sola;
//   - il meccanismo sta in una `nota` o in una `figura`, non in un inciso;
//   - i nomi di persone e documenti passano dal lessico (`domain/lexicon.ts`).
// Le figure sono schemi (`drawing.ts`) con i colori del tema: dicono dove sta
// una cosa e come scorre un meccanismo.
//
// Traduzione (skill `testi`): ogni pagina — `start.ts` — ha il suo catalogo,
// `start.testi.ts`.
//   - Nel file della pagina resta la struttura, senza parole da leggere: `id`,
//     `parte`, `simbolo`, `vista`, `passi`, `vedi`, le figure (`vista`,
//     `disegno`) e il `tipo` delle note. Ogni sezione è
//     `sezione({ … }, T.nomeSezione)` con `const T = testi()` in cima al file
//     (in una pagina la lingua è già scelta al caricamento).
//   - Nel catalogo sta la prosa, con la forma di `TestiSezione`: `titolo`,
//     `sommario`, le `voci` (`termine`, `testo`, `tasti`), le `note` e le
//     `figure` nell'ordine della struttura, e le `scritte` degli schemi, lette
//     per nome (`T.primiPassi.scritte.benvenuto`).
//   - Le quattro lingue hanno elenchi della stessa lunghezza: lo controlla la
//     prova dei cataloghi, e `sezione()` si ferma se non tornano. Il blocco
//     `it` usa la grammatica di `lexicon.ts`; le altre lingue scrivono frasi
//     intere con i termini di `lessico()`.
//   - Le scritte di una figura stanno nelle misure dell'italiano: si accorcia
//     la parola, non si allarga il disegno.

import type { Vista } from '../../../protocol.js'
import type { NomeIcona } from '../../components/icons.js'

/** Una cosa che si sa fare, e come. */
export interface VoceGuida {
  /** Il gesto, o il concetto: è quel che si cerca scorrendo. */
  termine: string
  testo: string
  /**
   * I tasti, quando la voce è una scorciatoia: `Ctrl+K`, e più combinazioni
   * separate da ` / `. Si disegnano come tasti, sotto il termine.
   */
  tasti?: string
}

/**
 * Uno schema: la pagina vista dall'alto, o un meccanismo in movimento.
 * `disegno` è il contenuto di un `<svg>` come testo (funzioni di `drawing.ts`),
 * `vista` il suo `viewBox`; testo e non elementi, così una prova in Node lo
 * legge senza DOM.
 */
export interface FiguraGuida {
  /** Il `viewBox`: `0 0 640 240`. La larghezza di riferimento è 640. */
  vista: string
  disegno: string
  /** Che cosa si guarda nello schema. Una o due frasi: si legge sotto la figura. */
  didascalia: string
  /**
   * La legenda dei bollini numerati, nell'ordine dei numeri: il bollino `1`
   * è la prima riga. Si disegna accanto alla figura.
   */
  legenda?: string[]
}

/**
 * Un riquadro a margine: `meccanismo` spiega perché, `consiglio` è la via più
 * corta, `attenzione` è quel che non si disfa o sorprende.
 */
export interface NotaGuida {
  tipo: 'meccanismo' | 'consiglio' | 'attenzione'
  testo: string
}

/**
 * I gruppi dell'indice: i cinque della barra laterale nel loro ordine (`ORDINE`
 * in `ui/pages.ts`), più inizio, fuori dalla finestra e dietro le quinte. Sono
 * identificativi: i nomi stanno in `help.testi.ts`.
 */
export type ParteGuida =
  | 'inizio'
  | 'agenda'
  | 'registro'
  | 'docenteClasse'
  | 'anno'
  | 'programma'
  | 'fuori'
  | 'quinte'

export interface SezioneGuida {
  id: string
  parte: ParteGuida
  titolo: string
  simbolo: NomeIcona
  /** A che domanda risponde la pagina. Una riga, non tre. */
  sommario: string
  /** La pagina vera, quando ce n'è una: dalla guida ci si arriva. */
  vista?: Vista
  /** Le voci sono passi da fare in ordine, e si numerano. */
  passi?: boolean
  /** Gli schemi, in cima alla sezione: prima si guarda dove, poi si legge come. */
  figure?: FiguraGuida[]
  voci: VoceGuida[]
  /** In fondo alla sezione, dopo le voci. */
  note?: NotaGuida[]
  /** Gli `id` delle sezioni vicine: si disegnano come «Vedi anche». */
  vedi?: string[]
}

// ------------------------------------------------------- struttura e testi

/** Le parole di una figura: sotto lo schema, e accanto ai bollini. */
interface TestiFigura {
  readonly didascalia: string
  readonly legenda?: readonly string[]
}

/**
 * Le parole di una sezione, come stanno nel catalogo della sua pagina: tutto
 * quel che si legge, niente di quel che si disegna o si collega.
 */
export interface TestiSezione {
  readonly titolo: string
  readonly sommario: string
  readonly voci: readonly VoceGuida[]
  /** Il testo delle note, nell'ordine dei tipi della struttura. */
  readonly note?: readonly string[]
  /** Didascalia e legenda delle figure, nell'ordine delle figure della struttura. */
  readonly figure?: readonly TestiFigura[]
  /** Le parole scritte dentro gli schemi: le legge il disegno, per nome. */
  readonly scritte?: Readonly<Record<string, string>>
}

/** Una sezione senza parole: quel che resta nel file della pagina. */
interface StrutturaSezione {
  id: string
  parte: ParteGuida
  simbolo: NomeIcona
  vista?: Vista
  passi?: boolean
  /** Lo schema di ogni figura; le sue parole stanno nel catalogo. */
  figure?: ReadonlyArray<Pick<FiguraGuida, 'vista' | 'disegno'>>
  /** Il tipo di ogni nota, nell'ordine; il testo sta nel catalogo. */
  note?: ReadonlyArray<NotaGuida['tipo']>
  vedi?: string[]
}

/**
 * Una sezione intera: struttura della pagina più parole del catalogo. Figure e
 * note si appaiano per posizione, e se i conti non tornano si ferma subito.
 */
export function sezione (struttura: StrutturaSezione, testi: TestiSezione): SezioneGuida {
  const { figure, note, ...resto } = struttura
  for (const [cosa, disegnate, scritte] of [
    ['figure', figure?.length ?? 0, testi.figure?.length ?? 0],
    ['note', note?.length ?? 0, testi.note?.length ?? 0],
  ] as const) {
    if (disegnate === scritte) continue
    // testo-fisso: lo legge solo chi scrive la guida, quando la prova si ferma
    throw new Error(`guida, ${struttura.id}: ${cosa} ${disegnate} nella struttura, ${scritte} nel catalogo`)
  }
  return {
    ...resto,
    titolo: testi.titolo,
    sommario: testi.sommario,
    voci: testi.voci.map((voce) => ({ ...voce })),
    ...(figure && {
      figure: figure.map((figura, indice) => {
        const { didascalia, legenda } = testi.figure?.[indice] ?? { didascalia: '' }
        return { ...figura, didascalia, ...(legenda && { legenda: [...legenda] }) }
      }),
    }),
    ...(note && { note: note.map((tipo, indice) => ({ tipo, testo: testi.note?.[indice] ?? '' })) }),
  }
}
