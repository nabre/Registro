// Le forme che un ingresso deve avere per essere accettato.
//
// Il registro ha già `domain/validation.ts`, che sa dire se una Lezione sta
// in piedi. Quel che non aveva è un modo di dire la stessa cosa di un
// *messaggio*: «questa procedura vuole un lezioneId, un allievoId e uno stato
// fra questi cinque». Il tipo TypeScript lo dichiara, ma il tipo sparisce
// quando il programma gira — e un messaggio arriva da un webview, da un widget
// o da una riga di comando, cioè da tre posti che il compilatore non ha
// controllato insieme.
//
// Da qui esce un oggetto che fa tre cose con una dichiarazione sola: convalida
// a runtime, dà il tipo TypeScript per inferenza, e si sa descrivere in JSON
// Schema — che è quel che serve per spiegare una procedura a chi la chiama da
// fuori senza scrivere la stessa cosa due volte.
//
// **Perché fatto in casa e non zod.** Il contratto esposto qui è quello
// «Standard Schema» (`~standard`), lo stesso che zod, valibot e arktype
// implementano: il nucleo (`core.ts`) non conosce questo file, conosce
// quell'interfaccia. Il giorno in cui servisse di più — tipi ricorsivi,
// trasformazioni, unioni discriminate profonde — si sostituisce la libreria
// senza toccare una riga di nucleo o di procedura. Finché quel giorno non
// arriva, il registro non si porta dentro una dipendenza per fare quel che
// queste duecento righe fanno: l'applicazione scrive già da sé lo ZIP e l'SMTP,
// e un validatore di messaggi è meno di tutti e due.

// ------------------------------------------------------------------ contratto

/** Un problema trovato in un valore, con il punto in cui sta. */
export interface Problema {
  readonly message: string
  readonly path?: readonly PropertyKey[]
}

// Esportata anche se nessun altro file la nomina: compare nella firma di
// `convalida`, che e' esportata. `npm run census` la segnala come «da rendere
// interna» perche' guarda chi la cita, non chi la puo' raggiungere per
// inferenza — e toglierle l'`export` diventerebbe un errore il giorno in cui
// `tsconfig.json` accende l'emissione dei `.d.ts`.
export type EsitoConvalida<T> =
  | { readonly value: T; readonly issues?: undefined }
  | { readonly issues: readonly Problema[] }

/** La parte del contratto che ogni libreria di schemi espone allo stesso modo. */
export interface Standard<T> {
  readonly version: 1
  readonly vendor: string
  readonly validate: (valore: unknown) => EsitoConvalida<T>
  readonly types?: { readonly input: T; readonly output: T }
}

/** Uno schema: convalida, tipo, e una descrizione che si sa stampare. */
export interface Schema<T> {
  readonly '~standard': Standard<T>
  readonly forma: Forma
}

/** Uno schema che, dentro un oggetto, non obbliga la chiave a esserci. */
// Esportata anche se nessun altro file la nomina: compare nella firma di
// `opzionale`, che e' esportata. `npm run census` la segnala come «da rendere
// interna» perche' guarda chi la cita, non chi la puo' raggiungere per
// inferenza — e toglierle l'`export` diventerebbe un errore il giorno in cui
// `tsconfig.json` accende l'emissione dei `.d.ts`.
export interface SchemaOpzionale<T> extends Schema<T | undefined> {
  readonly opzionale: true
}

/** Il tipo che uno schema descrive. */
export type Dentro<S> = S extends Schema<infer T> ? T : never

/**
 * Come è fatto un valore, in una forma che si sa tradurre in JSON Schema.
 *
 * Tenuta separata dalla convalida apposta: la convalida è una funzione, e una
 * funzione non si sa raccontare. La pagina di aiuto della riga di comando e la
 * documentazione delle procedure leggono questa, non quella.
 */
type FormaSemplice =
  | { genere: 'testo'; aiuto?: string; minimo?: number; massimo?: number; modello?: string; esempio?: string }
  | { genere: 'numero'; aiuto?: string; minimo?: number; massimo?: number; intero?: boolean }
  | { genere: 'booleano'; aiuto?: string }
  | { genere: 'scelta'; aiuto?: string; valori: readonly string[] }
  | { genere: 'elenco'; aiuto?: string; di: Forma; minimo?: number; massimo?: number }
  | {
    genere: 'oggetto'
    aiuto?: string
    campi: Record<string, Forma>
    richiesti: readonly string[]
    /**
     * I campi elencati non sono tutti quelli ammessi: ce ne sono altri che la
     * forma non sa nominare. È il caso di `entita`, che delega al validatore
     * del dominio e qui dichiara il solo `id`.
     *
     * Non è più la riga che decide `additionalProperties` — quella la decide
     * `severo`, perché è il rifiuto che va pubblicato, non l'elenco. Serve
     * ancora, e per due cose che nessun'altra sa dire: `chiaviEstranee` non
     * segnala niente su una forma aperta, perché lì i campi in più sono il
     * dato, e `formaInBreve` scrive `{ id, … }` invece di `{ id }`, che a chi
     * legge l'aiuto è l'unico modo di sapere che l'elenco non finisce lì.
     */
    aperto?: boolean
    /**
     * Le chiavi non dichiarate non si scartano: fanno fallire. È l'unico caso
     * in cui il JSON Schema pubblica `additionalProperties: false`, perché è
     * l'unico in cui quella riga dice la verità.
     */
    severo?: boolean
  }
  | { genere: 'nulla'; aiuto?: string }
  | { genere: 'qualunque'; aiuto?: string }

/**
 * Lo stesso campo, tolto dal catalogo che legge il modello.
 *
 * Resta nel contratto per intero — `$schema` lo pubblica, la riga di comando lo
 * accetta, il nucleo lo convalida — e sparisce soltanto dall'elenco che precede
 * una domanda in chat. Vedi `perAssistente` nella `Forma`.
 */
export function soloDaFuori<S extends { forma: Forma }> (schema: S): S {
  return { ...schema, forma: { ...schema.forma, perAssistente: false } }
}

/**
 * `nullo` sta fuori dall'unione, e non è un vezzo: «un numero, oppure null» non
 * è un genere a sé — è un numero con un permesso in più. Tenuto come genere
 * separato obbligherebbe chi legge una forma a scartare due strati prima di
 * sapere se è un numero, e `schemaJson` finirebbe per pubblicare un'unione
 * dove basta un `type: ["number", "null"]`.
 *
 * Era un difetto vero finché non c'era: `nullabile(numero())` copiava la forma
 * di dentro senza marcarla, e il JSON Schema dichiarava `"type": "number"` per
 * un campo la cui descrizione diceva di mandare `null`. Chi si fosse generato
 * un client da quello schema avrebbe rifiutato da solo il valore che il
 * contratto gli chiedeva di mandare.
 */
export type Forma = FormaSemplice & {
  nullo?: boolean
  /**
   * `false` per un campo che c'è nel contratto ma non si mette in mano al
   * modello dell'assistente.
   *
   * Non è una questione di permessi — il campo si può passare eccome, da uno
   * script o dalla riga di comando — ma di **posto**. Il catalogo che precede
   * ogni domanda sta in una finestra di contesto che si misura a caratteri, e
   * quando trabocca `node-llama-cpp` non dice «non ci sta»: cancella le
   * letture già fatte. Un campo che serve a chi scrive uno script e che un
   * modello piccolo non userà mai è contesto tolto ai dati.
   *
   * Lo dichiara il campo e non un elenco scritto altrove: un elenco a parte è
   * la cosa che resta indietro quando il campo cambia nome, e allora
   * ricomparirebbe nel catalogo senza che nessuno se ne accorga.
   */
  perAssistente?: boolean
}

interface Opzioni {
  /** Una riga per chi legge l'aiuto: che cos'è questo campo. */
  aiuto?: string
}

function schema<T> (forma: Forma, convalida: (valore: unknown) => EsitoConvalida<T>): Schema<T> {
  return {
    '~standard': { version: 1, vendor: 'registro', validate: convalida },
    forma,
  }
}

function male (message: string, path?: readonly PropertyKey[]): EsitoConvalida<never> {
  return { issues: [path ? { message, path } : { message }] }
}

// ------------------------------------------------------------------- semplici

export function testo (
  opzioni: Opzioni & { minimo?: number; massimo?: number; modello?: RegExp; esempio?: string } = {},
): Schema<string> {
  const forma: Forma = {
    genere: 'testo',
    aiuto: opzioni.aiuto,
    minimo: opzioni.minimo,
    massimo: opzioni.massimo,
    modello: opzioni.modello?.source,
    esempio: opzioni.esempio,
  }
  return schema<string>(forma, (valore) => {
    if (typeof valore !== 'string') return male('Serve del testo.')
    if (opzioni.minimo !== undefined && valore.length < opzioni.minimo) {
      return male(`Serve del testo di almeno ${opzioni.minimo} caratteri.`)
    }
    if (opzioni.massimo !== undefined && valore.length > opzioni.massimo) {
      return male(`Il testo supera i ${opzioni.massimo} caratteri.`)
    }
    if (opzioni.modello && !opzioni.modello.test(valore)) {
      return male(`«${valore}» non è nella forma attesa.`)
    }
    return { value: valore }
  })
}

export function numero (
  opzioni: Opzioni & { minimo?: number; massimo?: number; intero?: boolean } = {},
): Schema<number> {
  const forma: Forma = {
    genere: 'numero',
    aiuto: opzioni.aiuto,
    minimo: opzioni.minimo,
    massimo: opzioni.massimo,
    intero: opzioni.intero,
  }
  return schema<number>(forma, (valore) => {
    if (typeof valore !== 'number' || !Number.isFinite(valore)) return male('Serve un numero.')
    if (opzioni.intero && !Number.isInteger(valore)) return male('Serve un numero intero.')
    if (opzioni.minimo !== undefined && valore < opzioni.minimo) {
      return male(`Il numero deve essere almeno ${opzioni.minimo}.`)
    }
    if (opzioni.massimo !== undefined && valore > opzioni.massimo) {
      return male(`Il numero non può superare ${opzioni.massimo}.`)
    }
    return { value: valore }
  })
}

export function booleano (opzioni: Opzioni = {}): Schema<boolean> {
  return schema<boolean>({ genere: 'booleano', aiuto: opzioni.aiuto }, (valore) => {
    if (typeof valore !== 'boolean') return male('Serve vero o falso.')
    return { value: valore }
  })
}

/**
 * Uno fra questi valori, e nessun altro.
 *
 * È la rete che al registro mancava di più: gli stati dell'appello, i tipi di
 * consegna, i ruoli di un allegato sono unioni di stringhe che il compilatore
 * controlla sulle due sponde del protocollo — ma il widget dell'agenda e la
 * riga di comando sono una terza sponda, e `src/agenda.ts` ricontrollava già
 * gli stati a mano proprio per questo.
 */
export function scelta<const V extends readonly string[]> (
  valori: V,
  opzioni: Opzioni = {},
): Schema<V[number]> {
  return schema<V[number]>({ genere: 'scelta', aiuto: opzioni.aiuto, valori }, (valore) => {
    if (typeof valore !== 'string' || !valori.includes(valore)) {
      return male(`Serve uno fra: ${valori.join(', ')}.`)
    }
    return { value: valore }
  })
}

/**
 * L'elenco dei valori di un'unione, **verificato completo** quando compila.
 *
 * `as const satisfies readonly T[]` non lo fa: verifica che ogni elemento sia
 * valido, non che ci siano tutti. Il commento di `QUANDO_RIFARE_PDF` prometteva
 * da sempre «un modo aggiunto al dominio e dimenticato qui non compila», e non
 * era vero: si poteva aggiungere un quarto modo, vederlo comparire nella
 * tendina delle impostazioni, sceglierlo — e trovarselo rifiutato al
 * salvataggio con «Serve uno fra: mai, chiusura, sempre», perche' `scelta()`
 * produce un'unione piu' stretta che si assegna senza rumore al campo piu'
 * largo del dominio.
 *
 * Qui la promessa e' mantenuta: se manca un valore, il tipo dell'argomento
 * diventa una coppia che nessun array soddisfa, e `tsc` nomina il valore
 * mancante nel messaggio d'errore.
 */
export function esaustivo<T extends string> () {
  return <L extends readonly T[]>(
    valori: L &
      ([T] extends [L[number]] ? unknown : { readonly mancaAllElenco: Exclude<T, L[number]> }),
  ): L => valori
}

// ----------------------------------------------------------- forme del dominio

/**
 * Un id di entità.
 *
 * Il modello è volutamente largo: un id scritto a mano in un JSON corretto
 * dall'esterno resta un id buono se la voce esiste, e rifiutarlo qui vorrebbe
 * dire rendere illeggibile un registro riparato a mano. Si controlla che sia
 * testo plausibile; che *esista* lo dice la procedura, che è l'unica a sapere
 * in quale raccolta cercarlo.
 */
export function identificatore (opzioni: Opzioni & {
  /**
   * Un id vero di *questo* genere di voce: `cls-m3k9x2-a7f1` per una classe,
   * `cor-…` per un corso. Si passa solo quando si sa quale prefisso tocca —
   * vedi il commento qui sotto sul perche' non ce n'e' uno predefinito.
   */
  esempio?: string
} = {}): Schema<string> {
  return schema<string>(
    // `modello` non c'e' piu', e `massimo` si': il contratto pubblicato diceva
    // il falso in tutte e due le direzioni. Dichiarava un `pattern` —
    // `^[a-z]{3}-[0-9a-z]+-[0-9a-z]+$` — che il controllo a tempo di esecuzione
    // qui sotto **non applica mai**, e taceva il limite di 64 caratteri che
    // invece applica. Chi si generasse un client da `$schema` avrebbe rifiutato
    // da solo proprio gli id «riparati a mano» che il commento qui sopra
    // dichiara di voler accettare apposta. E' lo stesso difetto del giro 0 n. 2
    // — uno schema piu' stretto del lavoro che deve difendere — sul costruttore
    // piu' usato del progetto.
    //
    // `minimo: 1` chiude la stessa crepa nell'altra direzione, che era rimasta
    // aperta: lo schema taceva anche il rifiuto della stringa vuota, quindi `""`
    // era valido per il contratto pubblicato e rifiutato dal controllo. Fra i
    // due, quello che si legge prima di comporre e' lo schema.
    //
    // **L'esempio non ha piu' un valore predefinito, ed e' la correzione che
    // conta di piu'.** Ce n'era uno fisso — `lez-m3k9x2-a7f1` — su tutti e 217
    // i campi id del catalogo: `lez-` e' il prefisso delle *lezioni*
    // (`domain/identifiers.ts`), mentre una classe fa `cls-` e un corso
    // `cor-`. Quindi `classeId`, `corsoId`, `allievoId` portavano un esempio
    // sbagliato nella forma, non solo nel contenuto. Nel percorso finestra non
    // si vedeva — la traduzione per la griglia scarta `examples` — ma nel
    // percorso riga di comando arrivava intatto al modello, che non avendo un
    // id sotto mano copia l'unico che ha letto, e chiama `classi.elimina` con
    // l'id di una lezione.
    //
    // Inventare un esempio giusto per ogni campo vorrebbe dire toccare 217
    // chiamate e tenerle allineate a mano ai prefissi del dominio: una seconda
    // verita', e la seconda e' quella che resta indietro. Meglio la verita'
    // breve, che per un id e' sempre la stessa: **non si inventa, si copia da
    // un elenco**. Chi ha un esempio vero e sa quale prefisso tocca lo passa;
    // chi non lo passa non mente.
    {
      genere: 'testo',
      aiuto: opzioni.aiuto ?? 'Identificatore di una voce del registro: si copia da un elenco, non si inventa',
      minimo: 1,
      massimo: 64,
      ...(opzioni.esempio === undefined ? {} : { esempio: opzioni.esempio }),
    },
    (valore) => {
      if (typeof valore !== 'string' || valore.trim() === '') return male('Serve un identificatore.')
      if (valore.length > 64) return male('Identificatore troppo lungo.')
      // Il `trim()` qui sopra decideva e basta: `' cls-1 '` passava e arrivava
      // intero alla procedura, dove `find((c) => c.id === ' cls-1 ')` non
      // trovava niente. Chi chiamava si prendeva un `non-trovato` su un id che
      // **esiste**, con il rimedio che lo mandava a ricercare un id che aveva
      // gia' giusto — un giro a vuoto che non finisce da solo. Ritornare il
      // valore ripulito non allarga niente: quella stringa era gia' accettata,
      // semplicemente non funzionava.
      return { value: valore.trim() }
    },
  )
}

const MODELLO_ISO = /^\d{4}-\d{2}-\d{2}$/
const MODELLO_ORA = /^([01]\d|2[0-3]):[0-5]\d$/

/** Una data di calendario `AAAA-MM-GG`, controllata anche nel merito (mai il 30 febbraio). */
export function iso (opzioni: Opzioni = {}): Schema<string> {
  return schema<string>(
    { genere: 'testo', aiuto: opzioni.aiuto ?? 'Data di calendario', modello: MODELLO_ISO.source, esempio: '2026-09-21' },
    (valore) => {
      if (typeof valore !== 'string' || !MODELLO_ISO.test(valore)) {
        return male('Serve una data nella forma AAAA-MM-GG.')
      }
      const [anno, mese, giorno] = valore.split('-').map(Number)
      // La data si costruisce **dalla stringa**, e non da `Date.UTC(anno, …)`,
      // per una sola ragione: `Date.UTC` mappa gli anni da 0 a 99 su 1900–1999
      // — e' una compatibilita' di ECMAScript che nessuno puo' togliere — e
      // quindi `0000-01-01` tornava indietro come il 1900, il confronto qui
      // sotto non tornava, e ogni data dei primi cent'anni si prendeva un
      // «non e' un giorno che esiste». Il costruttore da stringa ISO quella
      // mappatura non ce l'ha.
      //
      // Non e' un caso di laboratorio: `risolviPeriodo` in
      // `procedures/common/filters.ts` usa **`'0000-01-01'`** come sentinella
      // quando non c'e' un anno corrente, e le letture la rimandano nella busta.
      // Il modello leggeva `{"dal":"0000-01-01"}`, richiamava con quel valore, e
      // si sentiva rispondere `ingresso-non-valido`: l'API rifiutava in ingresso
      // un valore che aveva emesso lei in uscita, e da li' non si esce
      // ragionando.
      //
      // Il confronto campo per campo resta e serve ancora: V8 accetta
      // `2023-02-29T00:00:00Z` traboccando al primo marzo invece di dare NaN,
      // e il 30 febbraio va rifiutato comunque arrivi.
      const data = new Date(`${valore}T00:00:00Z`)
      const torna =
        !Number.isNaN(data.getTime()) &&
        data.getUTCFullYear() === anno &&
        data.getUTCMonth() === mese - 1 &&
        data.getUTCDate() === giorno
      if (!torna) return male(`«${valore}» non è un giorno che esiste.`)
      return { value: valore }
    },
  )
}

/** Un'ora del giorno `HH:MM`, sulle ventiquattro. */
export function ora (opzioni: Opzioni = {}): Schema<string> {
  return schema<string>(
    { genere: 'testo', aiuto: opzioni.aiuto ?? 'Ora del giorno', modello: MODELLO_ORA.source, esempio: '08:15' },
    (valore) => {
      if (typeof valore !== 'string' || !MODELLO_ORA.test(valore)) {
        return male('Serve un’ora nella forma HH:MM.')
      }
      return { value: valore }
    },
  )
}

// ------------------------------------------------------------------ composti

export function elenco<S extends Schema<unknown>> (
  di: S,
  opzioni: Opzioni & { minimo?: number; massimo?: number } = {},
): Schema<Array<Dentro<S>>> {
  // `minimo` e `massimo` entrano nella **forma** e non restano nella sola
  // convalida: la forma è quel che `schemaJson()` pubblica, ed è l'unica cosa
  // che chi chiama da fuori legge prima di comporre. Senza, un elenco con un
  // minimo dichiarato si annunciava come un elenco qualunque e rifiutava
  // `[]` — il modo più naturale di dire «non filtro» — senza che niente
  // gliel'avesse detto.
  const forma: Forma = {
    genere: 'elenco',
    aiuto: opzioni.aiuto,
    di: di.forma,
    minimo: opzioni.minimo,
    massimo: opzioni.massimo,
  }
  return schema<Array<Dentro<S>>>(forma, (valore) => {
    if (!Array.isArray(valore)) return male('Serve un elenco.')
    if (opzioni.minimo !== undefined && valore.length < opzioni.minimo) {
      return male(`L’elenco deve avere almeno ${opzioni.minimo} voci.`)
    }
    if (opzioni.massimo !== undefined && valore.length > opzioni.massimo) {
      return male(`L’elenco non può avere più di ${opzioni.massimo} voci.`)
    }
    const dentro: unknown[] = []
    const problemi: Problema[] = []
    valore.forEach((voce, indice) => {
      const esito = di['~standard'].validate(voce)
      if (esito.issues) {
        for (const p of esito.issues) {
          problemi.push({ message: p.message, path: [indice, ...(p.path ?? [])] })
        }
      } else dentro.push(esito.value)
    })
    if (problemi.length > 0) return { issues: problemi }
    return { value: dentro as Array<Dentro<S>> }
  })
}

/**
 * Lo stesso schema, ma la chiave può mancare. Non è la stessa cosa di «può
 * essere null» — e `null` vale comunque come «non c'è», vedi sotto.
 */
export function opzionale<S extends Schema<unknown>> (di: S): SchemaOpzionale<Dentro<S>> {
  // Se il `null` sia di qualcuno si decide **ora**, guardando la forma di
  // dentro, e non a ogni convalida: la forma non cambia più dopo che lo schema
  // è composto.
  const nulloSuo = di.forma.nullo === true
  return {
    opzionale: true,
    forma: di.forma,
    '~standard': {
      version: 1,
      vendor: 'registro',
      validate: (valore) => {
        if (valore === undefined) return { value: undefined }
        // `null` su un campo facoltativo vale quanto una chiave assente, e non
        // è una comodità: era una divergenza fra due trasporti dello stesso
        // contratto. La griglia che obbliga il modello non sa fare un campo
        // facoltativo, e gli fa scrivere `null` su tutti quelli che non vuole
        // usare. La finestra lo sapeva e ripuliva la busta prima di chiamare
        // (`senzaNulliDiTroppo`, in `transports/assistant.ts`); la riga di
        // comando no. Risultato: «chi ha più assenze in IV MEC A?» rispondeva
        // dalla finestra e dal terminale tornava indietro con nove frasi di
        // rifiuto per dei filtri che nessuno aveva chiesto. La difesa sta
        // meglio qui — è un posto solo, ed è il contratto, cioè l'unica cosa
        // che i due trasporti hanno davvero in comune.
        //
        // **La distinzione fra «assente» e «null» resta possibile**, e va detto
        // come, perché l'ordine di composizione non è ovvio: chi la vuole
        // scrive `opzionale(nullabile(x))` — `valutazioni.recupero.imposta` è
        // l'esempio vivo, dove la chiave assente vuol dire «lascia com'era» e
        // `null` vuol dire «toglila». Lì `opzionale` è il guscio **di fuori**,
        // quindi è il primo a vedere il `null`: trattarlo sempre come assente
        // vorrebbe dire mangiarlo prima che `nullabile` lo veda, e trasformare
        // una cancellazione in un silenzio. Per questo non si guarda il valore
        // ma la forma: `nullo` acceso vuol dire che quel `null` è di qualcuno,
        // e gli si lascia la strada.
        if (valore === null && !nulloSuo) return { value: undefined }
        return di['~standard'].validate(valore) as EsitoConvalida<Dentro<S> | undefined>
      },
    },
  }
}

/**
 * Lo stesso schema, o `null`.
 *
 * Distinto da `opzionale` perché nel registro i due significati non
 * coincidono mai per caso: un `valore: null` è «non ancora messo», un campo
 * assente è «non si sta dicendo niente di questo campo». `recupero.imposta`
 * regge su questa differenza.
 *
 * **L'ordine della coppia è uno solo: `opzionale(nullabile(x))`.** L'inverso,
 * `nullabile(opzionale(x))`, oggi non compila più, e prima era una trappola
 * silenziosa: `schema()` non ricopia il marcatore `opzionale`, quindi
 * l'involucro esterno lo perdeva e il campo tornava **obbligatorio** — un
 * `opzionale` scritto apposta che spariva senza un errore, senza un avviso e
 * senza una riga di differenza nel JSON Schema pubblicato. Non era usato da
 * nessuna parte, e niente impediva di scriverlo al primo campo nuovo; adesso
 * `tsc` lo nomina invece di lasciarlo passare.
 */
export function nullabile<S extends Schema<unknown>> (
  di: S & (S extends { opzionale: true }
    ? { readonly vaScrittoOpzionaleDiNullabile: never }
    : unknown),
): Schema<Dentro<S> | null> {
  return schema<Dentro<S> | null>({ ...di.forma, nullo: true }, (valore) => {
    if (valore === null) return { value: null }
    return di['~standard'].validate(valore) as EsitoConvalida<Dentro<S> | null>
  })
}

type Campi = Record<string, Schema<unknown>>
type ChiaviOpzionali<C extends Campi> = {
  [K in keyof C]: C[K] extends { opzionale: true } ? K : never
}[keyof C]
type ChiaviRichieste<C extends Campi> = Exclude<keyof C, ChiaviOpzionali<C>>
type Semplifica<T> = { [K in keyof T]: T[K] } & {}
type DaCampi<C extends Campi> = Semplifica<
  { [K in ChiaviRichieste<C>]: Dentro<C[K]> } & { [K in ChiaviOpzionali<C>]?: Dentro<C[K]> }
>

/**
 * Le chiavi che ci sono nel grezzo e che la forma non dichiara.
 *
 * Esiste perché `oggetto()` le scartava in un silenzio assoluto: nessun issue,
 * nessun campo accanto al valore, niente. `valutazioni.recupero.imposta`
 * chiamata con `riconsegnata` invece di `riconsegnataIl` perdeva la chiave qui,
 * `daGestore` componeva l'azione senza quel campo, il gestore vedeva
 * `undefined` e lasciava com'era — e la busta tornava `ok: true`. La data di
 * riconsegna non era stata scritta e nessuno l'avrebbe mai saputo.
 *
 * Tenuta fuori dall'esito della convalida apposta: l'esito è quello «Standard
 * Schema», due casi e nient'altro, ed è l'interfaccia su cui il nucleo regge
 * per poter cambiare libreria di schemi senza toccare una procedura.
 * Aggiungerci un terzo campo vorrebbe dire romperla per un avviso. Qui invece
 * chi convalida chiede, se gli interessa: il nucleo può dire la sua sulle
 * scritture e tacere sulle letture, e il costo di quella scelta lo paga chi la
 * fa, non ogni chiamata.
 *
 * Su una forma `aperto` non torna mai niente: là i campi in più sono il dato,
 * non un errore di chi ha scritto.
 */
export function chiaviEstranee (forma: Forma, grezzo: unknown): readonly string[] {
  if (forma.genere !== 'oggetto' || forma.aperto === true) return []
  if (typeof grezzo !== 'object' || grezzo === null || Array.isArray(grezzo)) return []
  // `hasOwnProperty` e non `in`: `forma.campi` è un oggetto normale, e con `in`
  // una chiave di troppo che si chiamasse `toString` o `constructor` passerebbe
  // per dichiarata.
  return Object.keys(grezzo).filter(
    (chiave) => !Object.prototype.hasOwnProperty.call(forma.campi, chiave),
  )
}

/**
 * Un oggetto con esattamente questi campi.
 *
 * I campi in più si scartano invece di far fallire: un pannello più nuovo che
 * manda un campo che l'host non conosce ancora deve continuare a funzionare
 * per tutto il resto — è la stessa tolleranza che `normalizza*` applica ai
 * file, e vale per lo stesso motivo.
 *
 * Con `severo` la tolleranza si spegne e le chiavi di troppo diventano
 * problemi. Non è il predefinito e non lo diventa qui: se il silenzio vada
 * rotto dipende dal *genere* della procedura — su una scrittura una chiave
 * scartata è un dato perso per sempre, su una lettura è un filtro in meno — e
 * il genere lo sa il nucleo, non questo file. Qui c'è l'interruttore e la sua
 * verità pubblicata (vedi `additionalProperties` in `schemaJsonSemplice`);
 * quale procedura lo accenda si decide altrove.
 */
export function oggetto<const C extends Campi> (
  campi: C,
  opzioni: Opzioni & {
    /** Le chiavi non dichiarate fanno fallire invece di sparire. */
    severo?: boolean
  } = {},
): Schema<DaCampi<C>> {
  const forma: Forma = {
    genere: 'oggetto',
    aiuto: opzioni.aiuto,
    campi: Object.fromEntries(Object.entries(campi).map(([nome, s]) => [nome, s.forma])),
    richiesti: Object.entries(campi)
      .filter(([, s]) => !('opzionale' in s))
      .map(([nome]) => nome),
    ...(opzioni.severo === true ? { severo: true } : {}),
  }
  return schema<DaCampi<C>>(forma, (valore) => {
    if (typeof valore !== 'object' || valore === null || Array.isArray(valore)) {
      return male('Serve un oggetto.')
    }
    const grezzo = valore as Record<string, unknown>
    const dentro: Record<string, unknown> = {}
    const problemi: Problema[] = []
    for (const [nome, s] of Object.entries(campi)) {
      const esito = s['~standard'].validate(grezzo[nome])
      if (esito.issues) {
        for (const p of esito.issues) {
          problemi.push({ message: p.message, path: [nome, ...(p.path ?? [])] })
        }
      } else if (esito.value !== undefined) {
        // `undefined` non si ricopia mai, e la chiave presente nel grezzo non
        // basta più a farlo ricopiare. Serviva a tenere in piedi la differenza
        // fra «chiave assente» e «chiave presente ma vuota», ma da quando
        // `opzionale` legge `null` come assente quella riga lavorava contro:
        // `{nota: null}` usciva come `{nota: undefined}`, cioè una chiave
        // *presente* con dentro il vuoto, e «assente» tornava a distinguersi da
        // «null» un gradino più in là — nel gestore che fa lo spread, o in chi
        // conta le chiavi. Adesso `{nota: null}` e `{}` danno lo stesso
        // oggetto, che è quel che vuol dire trattarli allo stesso modo. Chi ha
        // bisogno della differenza scrive `opzionale(nullabile(...))`, e lì il
        // valore è `null`, non `undefined`: si ricopia.
        dentro[nome] = esito.value
      }
    }
    if (opzioni.severo === true) {
      for (const chiave of chiaviEstranee(forma, grezzo)) {
        problemi.push({ message: `Questa procedura non ha un campo «${chiave}».`, path: [chiave] })
      }
    }
    if (problemi.length > 0) return { issues: problemi }
    return { value: dentro as DaCampi<C> }
  })
}

/** Niente: le procedure che non chiedono nulla. */
export function vuoto (): Schema<Record<string, never>> {
  return oggetto({})
}

/**
 * Qualunque cosa, senza guardarla.
 *
 * Resta per i pochi valori che nessuno sa descrivere in anticipo — i parametri
 * liberi di una tappa del piano, un blob che si rimanda com'è. Per un'entità
 * del registro non si usa: c'è `entita`.
 *
 * «Qualunque cosa» non comprende «nessuna cosa»: il valore ci deve essere.
 * Accettarlo assente rendeva facoltativo un campo che il contratto dichiarava
 * obbligatorio — `programma.salva.valore` è l'unico caso nel catalogo, e
 * `registro chiama programma.salva --chiave X` senza `--valore` passava la
 * convalida con il campo nell'elenco dei `required`. Non finiva male per caso:
 * la dogana vera sta accanto al manifesto delle impostazioni e lo fermava un
 * gradino dopo. Ma un contratto che si salta un livello lo si scopre il giorno
 * in cui quel livello non c'è. Che la chiave possa mancare lo dice
 * `opzionale(qualunque())`, che è il modo di dirlo.
 */
export function qualunque (opzioni: Opzioni = {}): Schema<unknown> {
  return schema<unknown>({ genere: 'qualunque', aiuto: opzioni.aiuto }, (valore) => {
    if (valore === undefined) return male('Serve un valore.')
    return { value: valore }
  })
}

/** Com'è andata a una funzione `valida*` del dominio. */
export interface EsitoDominio {
  valido: boolean
  errori: string[]
}

/**
 * Un'entità intera del registro — una `Lezione`, un `PianoLezione`, una
 * `Consegna` — convalidata **dal validatore del dominio**, non da una forma
 * riscritta qui.
 *
 * È la scelta che tiene in piedi tutto il resto. Il registro ha già
 * `domain/validation.ts`: duemilaquattrocento righe che sanno che i semestri
 * devono essere contigui, che uno slot di lezione dura un multiplo esatto di
 * unità didattica, che una consegna senza destinatari non è completa. Ridire
 * qui quelle regole in forma di schema vorrebbe dire due verità da tenere
 * allineate a mano — e la seconda resterebbe indietro al primo campo nuovo.
 *
 * Quindi lo schema fa la sola cosa che il dominio non fa: si accerta che quel
 * che è arrivato sia **un oggetto con un id**, perché un validatore scritto per
 * una `Lezione` non è tenuto a sopravvivere a un numero o a `null`. Poi passa
 * la palla, e se il validatore lancia comunque — su un oggetto storto in un
 * modo che nessuno aveva previsto — quel guasto diventa un ingresso non valido
 * invece di un guasto interno: l'errore è di chi ha chiamato, e va detto così.
 *
 * Senza `valida` resta il solo controllo di forma, per le entità il cui
 * validatore ha bisogno di sapere anche che cosa c'è già nel registro —
 * `validaClasse(classe, altre)`, `validaCorso(corso, altri)` — e che quindi
 * resta dove sa le cose: dentro il gestore.
 */
export function entita<T> (opzioni: Opzioni & {
  /** Come si chiama, per il messaggio: «Lezione», «Piano lezione». */
  cosa: string
  valida?: (valore: T) => EsitoDominio
}): Schema<T> {
  const forma: Forma = {
    genere: 'oggetto',
    aiuto: opzioni.aiuto ?? `${opzioni.cosa} intera, come la compone il dominio`,
    campi: { id: { genere: 'testo' } },
    richiesti: ['id'],
    // Qui si dichiara il solo `id`, ma l'entità ne ha venti: il resto lo
    // guarda il validatore del dominio, che una forma non sa raccontare. Da
    // quando `additionalProperties` segue `severo`, `aperto` non serve più a
    // tenere aperta la porta nel JSON Schema — è aperta per tutti gli oggetti
    // tolleranti. Resta perché dice una cosa che quella riga non dice: che i
    // campi in più qui **non sono un errore di chi chiama**, sono l'entità. Su
    // una forma aperta `chiaviEstranee` tace, e l'aiuto scrive `{ id, … }`.
    aperto: true,
  }
  return schema<T>(forma, (valore) => {
    if (typeof valore !== 'object' || valore === null || Array.isArray(valore)) {
      return male(`Serve ${opzioni.cosa.toLowerCase()}.`)
    }
    const id = (valore as { id?: unknown }).id
    if (typeof id !== 'string' || id.trim() === '') {
      return male(`${opzioni.cosa} senza identificatore.`, ['id'])
    }
    if (!opzioni.valida) return { value: valore as T }
    let esito: EsitoDominio
    try {
      esito = opzioni.valida(valore as T)
    } catch {
      return male(`${opzioni.cosa} non è nella forma attesa.`)
    }
    if (!esito.valido) return { issues: esito.errori.map((message) => ({ message })) }
    return { value: valore as T }
  })
}

// ---------------------------------------------------------------- descrizione

/**
 * La forma tradotta in JSON Schema, per chi chiama da fuori e per l'aiuto.
 *
 * Il `null` ammesso si aggiunge al `type` invece di diventare un `anyOf`: chi
 * genera un client da questo schema deve ritrovarsi `["number", "null"]`, che
 * ogni strumento capisce, non un'unione che metà degli strumenti appiattisce.
 */
export function schemaJson (forma: Forma): Record<string, unknown> {
  const dentro = schemaJsonSemplice(forma)
  if (!forma.nullo) return dentro
  const esito = { ...dentro }
  // **Il permesso va dato in tutte le liste, o non è dato.** In JSON Schema
  // `type` ed `enum` sono congiunti: si soddisfano tutti e due o non si
  // soddisfa lo schema. Un nullabile di `scelta` usciva
  // `{"type":["string","null"],"enum":["A","B"]}` — `null` passava il `type` e
  // falliva l'`enum` — e quindi lo schema pubblicato **vietava esattamente il
  // valore che la sua stessa `description` diceva di mandare.** Quattro campi
  // veri del catalogo: la lettera della settimana, il segno di comportamento,
  // la vista del contesto, l'apertura della proiezione. Da un client generato
  // dal catalogo, «togli la lettera alla settimana» e «cancella il segno» erano
  // irraggiungibili; e la griglia del modello legge l'`enum` prima del `type`,
  // quindi da quella parte `null` non si poteva scrivere nemmeno per sbaglio.
  const valori = esito.enum
  if (Array.isArray(valori)) esito.enum = [...(valori as unknown[]), null]
  // Un `const` è un `enum` di un valore solo, e «questo valore oppure null» con
  // un `const` non si scrive: diventa l'enum dei due. Oggi nessuna forma ne
  // emette uno — questa riga è per il giorno in cui una lo farà, perché il
  // difetto qui sopra è lo stesso e si ripresenterebbe identico.
  if ('const' in esito) {
    esito.enum = [esito.const, null]
    delete esito.const
  }
  const tipo = esito.type
  if (typeof tipo === 'string') esito.type = [tipo, 'null']
  // Un `type` già in elenco — `qualunque` — ha `null` fra i suoi da prima.
  return esito
}

function schemaJsonSemplice (forma: Forma): Record<string, unknown> {
  const nota = forma.aiuto ? { description: forma.aiuto } : {}
  switch (forma.genere) {
    case 'testo':
      return {
        type: 'string',
        ...nota,
        ...(forma.minimo === undefined ? {} : { minLength: forma.minimo }),
        ...(forma.massimo === undefined ? {} : { maxLength: forma.massimo }),
        ...(forma.modello === undefined ? {} : { pattern: forma.modello }),
        ...(forma.esempio === undefined ? {} : { examples: [forma.esempio] }),
      }
    case 'numero':
      return {
        type: forma.intero ? 'integer' : 'number',
        ...nota,
        ...(forma.minimo === undefined ? {} : { minimum: forma.minimo }),
        ...(forma.massimo === undefined ? {} : { maximum: forma.massimo }),
      }
    case 'booleano':
      return { type: 'boolean', ...nota }
    case 'scelta':
      return { type: 'string', enum: [...forma.valori], ...nota }
    case 'elenco':
      return {
        type: 'array',
        items: schemaJson(forma.di),
        // «Almeno una voce» si pubblica: un elenco che rifiuta [] senza
        // dichiararlo insegna a chi lo compone che il contratto non si legge.
        ...(forma.minimo !== undefined ? { minItems: forma.minimo } : {}),
        ...(forma.massimo !== undefined ? { maxItems: forma.massimo } : {}),
        ...nota,
      }
    case 'oggetto':
      return {
        type: 'object',
        ...nota,
        properties: Object.fromEntries(
          Object.entries(forma.campi).map(([nome, f]) => [nome, schemaJson(f)]),
        ),
        required: [...forma.richiesti],
        // `additionalProperties: false` non vuol dire «lo scarto»: vuol dire
        // «è invalido». Qui diceva `false` per ogni `oggetto()` normale, e il
        // runtime invece scartava in silenzio — il contratto prometteva un
        // rifiuto e chi chiamava si prendeva un `ok: true` con dentro un campo
        // in meno. Peggio ancora, quel `false` contraddiceva la ragione stessa
        // della tolleranza scritta su `oggetto()`: un pannello più nuovo che
        // convalidasse la propria busta contro lo schema pubblicato si
        // rifiuterebbe **da solo** di mandare il campo che l'host avrebbe
        // volentieri ignorato, cioè proprio il caso per cui la tolleranza
        // esiste.
        //
        // Quindi la riga dice quel che il runtime fa, e niente di più: `false`
        // solo dove le chiavi in più fanno davvero fallire (`severo`). Non è un
        // allentamento del contratto — è il contratto che smette di promettere
        // un controllo che non c'è. Il controllo che manca si aggiunge
        // accendendo `severo`, e allora le due righe cambiano insieme.
        additionalProperties: forma.severo !== true,
      }
    case 'nulla':
      return { type: 'null', ...nota }
    case 'qualunque':
      // L'unione dei tipi JSON invece di `{}`. Uno schema vuoto è vero per
      // qualunque cosa e non dice niente a nessuno: la griglia che obbliga il
      // modello non ci sa leggere un tipo e ripiega sul testo, e una modalità
      // strict di tool-calling uno schema senza `type` non lo prende proprio.
      // Elencare i sei tipi non stringe nulla — sono tutti quelli che JSON ha —
      // e in più rende vero quel che `qualunque` promette: che ci sta dentro
      // tutto, `null` compreso. `integer` resta fuori perché è un
      // sottoinsieme di `number`.
      return { type: ['string', 'number', 'boolean', 'object', 'array', 'null'], ...nota }
  }
}

/** La stessa forma in una riga sola, per l'aiuto della riga di comando. */
export function formaInBreve (forma: Forma): string {
  const breve = formaInBreveSemplice(forma)
  return forma.nullo ? `${breve} o nullo` : breve
}

function formaInBreveSemplice (forma: Forma): string {
  switch (forma.genere) {
    case 'testo': return forma.esempio ? `testo (es. ${forma.esempio})` : 'testo'
    case 'numero': return forma.intero ? 'intero' : 'numero'
    case 'booleano': return 'vero/falso'
    case 'scelta': return forma.valori.join('|')
    case 'elenco': return `elenco di ${formaInBreve(forma.di)}`
    case 'oggetto': return forma.aperto
      ? `{ ${[...Object.keys(forma.campi), '…'].join(', ')} }`
      : `{ ${Object.keys(forma.campi).join(', ')} }`
    case 'nulla': return 'nullo'
    case 'qualunque': return 'qualunque'
  }
}

/**
 * Convalida un valore contro uno schema qualunque, purché parli «Standard
 * Schema»: quello di qui, o quello di una libreria messa al suo posto.
 */
export function convalida<T> (s: Schema<T>, valore: unknown): EsitoConvalida<T> {
  return s['~standard'].validate(valore)
}
