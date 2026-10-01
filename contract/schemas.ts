// Le forme che un ingresso deve avere per essere accettato.
//
// Un messaggio arriva da webview, condotto o riga di comando: il tipo
// TypeScript a runtime non c'è. Ogni schema qui convalida a runtime, dà il tipo
// per inferenza e si descrive in JSON Schema per chi chiama da fuori.
//
// La convalida la fa valibot (ADR-50, passo 4); fuori si vede solo
// l'interfaccia «Standard Schema» (`~standard`): `core.ts` conosce quella,
// quindi la libreria si può sostituire senza toccare nucleo o procedure. La
// `forma` e il JSON Schema restano nostri: portano l'aiuto pigro nella lingua
// del momento, `perAssistente`, `aperto` e `severo`, che valibot non racconta.

import * as v from 'valibot'

import { detto, type TestoPigro } from '#core/i18n/index.js'
import { testi } from './schemas.testi.js'

// ------------------------------------------------------------------ contratto

/** Un problema trovato in un valore, con il punto in cui sta. */
export interface Problema {
  readonly message: string
  readonly path?: readonly PropertyKey[]
}

// Esportata perché compare nella firma di `convalida`: `npm run census` la
// segnala come «da rendere interna», ma senza `export` l'emissione dei `.d.ts`
// fallirebbe.
type EsitoConvalida<T> =
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
// Esportata perché compare nella firma di `opzionale`: vedi `EsitoConvalida`.
export interface SchemaOpzionale<T> extends Schema<T | undefined> {
  readonly opzionale: true
}

/** Il tipo che uno schema descrive. */
export type Dentro<S> = S extends Schema<infer T> ? T : never

/**
 * Come è fatto un valore, in una forma che si traduce in JSON Schema. Separata
 * dalla convalida, che è una funzione e non si sa raccontare.
 */
type FormaSemplice =
  | { genere: 'testo'; aiuto?: TestoPigro; minimo?: number; massimo?: number; modello?: string; esempio?: string }
  | { genere: 'numero'; aiuto?: TestoPigro; minimo?: number; massimo?: number; intero?: boolean }
  | { genere: 'booleano'; aiuto?: TestoPigro }
  | { genere: 'scelta'; aiuto?: TestoPigro; valori: readonly string[] }
  | { genere: 'elenco'; aiuto?: TestoPigro; di: Forma; minimo?: number; massimo?: number }
  | {
    genere: 'oggetto'
    aiuto?: TestoPigro
    campi: Record<string, Forma>
    richiesti: readonly string[]
    /**
     * I campi elencati non sono tutti quelli ammessi (es. `entita`, che dichiara
     * solo `id`). `chiaviEstranee` allora tace, e `formaInBreve` scrive `{ id, … }`.
     * `additionalProperties` invece lo decide `severo`.
     */
    aperto?: boolean
    /**
     * Le chiavi non dichiarate fanno fallire invece di sparire: è l'unico caso in
     * cui il JSON Schema pubblica `additionalProperties: false`.
     */
    severo?: boolean
  }
  | { genere: 'nulla'; aiuto?: TestoPigro }
  | { genere: 'qualunque'; aiuto?: TestoPigro }

/**
 * Lo stesso campo, tolto dal catalogo che legge il modello. Resta nel contratto
 * (`$schema`, riga di comando, convalida). Vedi `perAssistente` nella `Forma`.
 */
export function soloDaFuori<S extends { forma: Forma }> (schema: S): S {
  return { ...schema, forma: { ...schema.forma, perAssistente: false } }
}

/**
 * `nullo` sta fuori dall'unione: «numero o null» è un numero con un permesso in
 * più, e `schemaJson` pubblica `type: ["number", "null"]` invece di un'unione.
 */
export type Forma = FormaSemplice & {
  nullo?: boolean
  /**
   * `false` per un campo del contratto che non si offre al modello
   * dell'assistente: non è un permesso ma spazio. Quando il contesto trabocca,
   * `node-llama-cpp` cancella le letture già fatte. Lo dichiara il campo, non un
   * elenco a parte.
   */
  perAssistente?: boolean
}

interface Opzioni {
  /** Una riga per chi legge l'aiuto: che cos'è questo campo. */
  aiuto?: TestoPigro
}

/** Lo schema valibot che fa il lavoro: entra ma non esce, così la libreria resta sostituibile. */
type Valibot<T> = v.GenericSchema<unknown, T>

// Un simbolo e non una `WeakMap`: `soloDaFuori` ricopia lo schema con lo spread,
// che porta con sé le chiavi simbolo.
const VALIBOT = Symbol('valibot')

interface Interno<T> extends Schema<T> {
  readonly [VALIBOT]: Valibot<T>
}

function valibotDi<T> (s: Schema<T>): Valibot<T> {
  return (s as Interno<T>)[VALIBOT]
}

function schema<T> (forma: Forma, valibot: Valibot<T>): Schema<T> {
  const interno: Interno<T> = {
    '~standard': { version: 1, vendor: 'registro', validate: (valore) => esito(valibot, valore) },
    forma,
    [VALIBOT]: valibot,
  }
  return interno
}

/**
 * La convalida con valibot, tradotta nel nostro esito. `abortPipeEarly`: un
 * campo dice un problema solo, il primo (`'M'` su `testo({minimo: 2, modello})`
 * è corto, non anche fuori forma); un oggetto li raccoglie comunque tutti.
 */
function esito<T> (valibot: Valibot<T>, valore: unknown): EsitoConvalida<T> {
  const r = v.safeParse(valibot, valore, { abortPipeEarly: true })
  if (r.success) return { value: r.output }
  return {
    issues: r.issues.map((p): Problema => p.path
      ? { message: p.message, path: p.path.map((passo) => passo.key as PropertyKey) }
      : { message: p.message }),
  }
}

/**
 * `v.pipe` con i passi facoltativi (`minimo` dato o no). Le sue firme vogliono
 * i passi contati, e qui dipendono dalle opzioni: il tipo lo dà chi chiama.
 */
function catena<I, T> (
  inizio: v.GenericSchema<unknown, I>,
  ...passi: Array<v.PipeItem<I, unknown, v.BaseIssue<unknown>> | false>
): Valibot<T> {
  const pipe = v.pipe as unknown as (...tutti: unknown[]) => Valibot<T>
  return pipe(inizio, ...passi.filter((p) => p !== false))
}

/** Un oggetto semplice: `null` e gli array no, anche se `typeof` dice «object». */
function èOggetto (valore: unknown): valore is Record<string, unknown> {
  return typeof valore === 'object' && valore !== null && !Array.isArray(valore)
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
  // I messaggi sono funzioni: valibot li chiama quando rifiuta, e la lingua è
  // quella del momento, non quella del caricamento.
  const { minimo, massimo, modello } = opzioni
  return schema<string>(forma, catena(
    v.string(() => testi().serveTesto),
    minimo !== undefined && v.minLength(minimo, () => testi().testoAlmeno(minimo)),
    massimo !== undefined && v.maxLength(massimo, () => testi().testoOltre(massimo)),
    modello !== undefined && v.regex(modello, (p) => testi().formaAttesa(String(p.input))),
  ))
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
  const { minimo, massimo } = opzioni
  return schema<number>(forma, catena(
    v.number(() => testi().serveNumero),
    // `v.number` rifiuta NaN ma non l'infinito: `1/0` come voto guasterebbe le medie.
    v.finite(() => testi().serveNumero),
    opzioni.intero === true && v.integer(() => testi().serveIntero),
    minimo !== undefined && v.minValue(minimo, () => testi().numeroAlmeno(minimo)),
    massimo !== undefined && v.maxValue(massimo, () => testi().numeroAlPiu(massimo)),
  ))
}

export function booleano (opzioni: Opzioni = {}): Schema<boolean> {
  return schema<boolean>(
    { genere: 'booleano', aiuto: opzioni.aiuto },
    v.boolean(() => testi().serveBooleano),
  )
}

/**
 * Uno fra questi valori, e nessun altro: il condotto e la riga di comando sono
 * sponde che il compilatore non vede.
 */
export function scelta<const V extends readonly string[]> (
  valori: V,
  opzioni: Opzioni = {},
): Schema<V[number]> {
  return schema<V[number]>(
    { genere: 'scelta', aiuto: opzioni.aiuto, valori },
    v.picklist(valori, () => testi().serveUnoFra(valori.join(', '))),
  )
}

/**
 * L'elenco dei valori di un'unione, verificato completo in compilazione.
 *
 * `as const satisfies readonly T[]` controlla che ogni elemento sia valido, non
 * che ci siano tutti. Qui, se manca un valore, l'argomento diventa una coppia
 * che nessun array soddisfa e `tsc` nomina il valore mancante.
 */
export function esaustivo<T extends string> () {
  return <L extends readonly T[]>(
    valori: L &
      ([T] extends [L[number]] ? unknown : { readonly mancaAllElenco: Exclude<T, L[number]> }),
  ): L => valori
}

// ----------------------------------------------------------- forme del dominio

/**
 * Un id di entità. Largo apposta: un id scritto a mano in un JSON riparato
 * resta buono se la voce esiste. Qui si controlla che sia testo plausibile;
 * l'esistenza la verifica la procedura.
 */
export function identificatore (opzioni: Opzioni & {
  /**
   * Un id vero di questo genere di voce: `cls-m3k9x2-a7f1` per una classe,
   * `cor-…` per un corso. Nessun predefinito: vedi sotto.
   */
  esempio?: string
} = {}): Schema<string> {
  return schema<string>(
    // Il contratto pubblicato dice quel che il controllo fa: niente `pattern`, e
    // `minimo: 1`/`massimo: 64`.
    //
    // Nessun esempio predefinito: ogni genere ha il suo prefisso
    // (`domain/identifiers.ts`), e un esempio sbagliato il modello lo copia. Un id
    // non si inventa, si copia da un elenco; chi ha un esempio vero lo passa.
    {
      genere: 'testo',
      aiuto: opzioni.aiuto ?? (() => testi().aiutoIdentificatore),
      minimo: 1,
      massimo: 64,
      ...(opzioni.esempio === undefined ? {} : { esempio: opzioni.esempio }),
    },
    catena(
      v.string(() => testi().serveIdentificatore),
      v.check((valore: string) => valore.trim() !== '', () => testi().serveIdentificatore),
      v.maxLength(64, () => testi().identificatoreLungo),
      // Si torna il valore ripulito: con gli spazi la procedura non troverebbe la voce.
      v.trim(),
    ),
  )
}

const MODELLO_ISO = /^\d{4}-\d{2}-\d{2}$/
const MODELLO_ORA = /^([01]\d|2[0-3]):[0-5]\d$/

/** Una data di calendario `AAAA-MM-GG`, controllata anche nel merito (mai il 30 febbraio). */
export function iso (opzioni: Opzioni = {}): Schema<string> {
  return schema<string>(
    {
      genere: 'testo',
      aiuto: opzioni.aiuto ?? (() => testi().aiutoData),
      modello: MODELLO_ISO.source,
      esempio: '2026-09-21',
    },
    catena(
      v.string(() => testi().serveData),
      v.regex(MODELLO_ISO, () => testi().serveData),
      v.check(giornoEsiste, (p) => testi().giornoInesistente(String(p.input))),
    ),
  )
}

/**
 * Vero se `AAAA-MM-GG` è un giorno del calendario. Con `Date` e non con
 * `Temporal` come `isoValida` del dominio: il contratto gira anche dove
 * `Temporal` non c'è (gli strumenti in Node che leggono gli schemi).
 */
function giornoEsiste (valore: string): boolean {
  const [anno, mese, giorno] = valore.split('-').map(Number)
  // Dalla stringa e non da `Date.UTC`, che mappa gli anni 0–99 su 1900–1999:
  // `'0000-01-01'` è la sentinella di `risolviPeriodo`
  // (`procedures/common/filters.ts`) che torna nelle buste, e deve rientrare.
  //
  // Il confronto campo per campo serve perché V8 fa traboccare
  // `2023-02-29T00:00:00Z` al primo marzo invece di dare NaN.
  const data = new Date(`${valore}T00:00:00Z`)
  return !Number.isNaN(data.getTime()) &&
    data.getUTCFullYear() === anno &&
    data.getUTCMonth() === mese - 1 &&
    data.getUTCDate() === giorno
}

/** Un'ora del giorno `HH:MM`, sulle ventiquattro. */
export function ora (opzioni: Opzioni = {}): Schema<string> {
  return schema<string>(
    {
      genere: 'testo',
      aiuto: opzioni.aiuto ?? (() => testi().aiutoOra),
      modello: MODELLO_ORA.source,
      esempio: '08:15',
    },
    catena(v.string(() => testi().serveOra), v.regex(MODELLO_ORA, () => testi().serveOra)),
  )
}

// ------------------------------------------------------------------ composti

export function elenco<S extends Schema<unknown>> (
  di: S,
  opzioni: Opzioni & { minimo?: number; massimo?: number } = {},
): Schema<Array<Dentro<S>>> {
  // `minimo` e `massimo` entrano nella forma, che è quel che `schemaJson()`
  // pubblica: chi chiama da fuori deve sapere che `[]` è rifiutato.
  const forma: Forma = {
    genere: 'elenco',
    aiuto: opzioni.aiuto,
    di: di.forma,
    minimo: opzioni.minimo,
    massimo: opzioni.massimo,
  }
  const { minimo, massimo } = opzioni
  return schema<Array<Dentro<S>>>(forma, catena(
    v.array(v.unknown(), () => testi().serveElenco),
    minimo !== undefined && v.minLength(minimo, () => testi().elencoAlmeno(minimo)),
    massimo !== undefined && v.maxLength(massimo, () => testi().elencoAlPiu(massimo)),
    // Le voci dopo la lunghezza: un elenco troppo lungo si dice tale, non con
    // cento errori di voce.
    v.array(valibotDi(di)),
  ))
}

/**
 * Lo stesso schema, ma la chiave può mancare. `null` vale comunque come
 * assente, vedi sotto.
 */
export function opzionale<S extends Schema<unknown>> (di: S): SchemaOpzionale<Dentro<S>> {
  // Se il `null` è di qualcuno si decide qui, dalla forma di dentro, che non
  // cambia più.
  const nulloSuo = di.forma.nullo === true
  const dentro = valibotDi(di) as Valibot<Dentro<S>>
  // `null` su un campo facoltativo vale come chiave assente: la griglia che
  // obbliga il modello scrive `null` su tutti i campi che non usa.
  //
  // Per distinguere «assente» da «null» si scrive `opzionale(nullabile(x))`
  // (es. `valutazioni.recupero.imposta`: assente = lascia com'era, `null` =
  // togli). `opzionale` è il guscio esterno e vede il `null` per primo, quindi
  // lo lascia passare quando la forma di dentro ha `nullo`.
  const valibot: Valibot<Dentro<S> | undefined> = nulloSuo
    ? v.optional(dentro)
    : v.pipe(v.nullish(dentro), v.transform((valore) => valore ?? undefined))
  return { ...schema(di.forma, valibot), opzionale: true }
}

/**
 * Lo stesso schema, o `null`. Distinto da `opzionale`: `null` è «non ancora
 * messo», assente è «non se ne parla».
 *
 * L'ordine è uno solo: `opzionale(nullabile(x))`. L'inverso non compila,
 * perché `schema()` non ricopia il marcatore `opzionale` e il campo tornerebbe
 * obbligatorio.
 */
export function nullabile<S extends Schema<unknown>> (
  di: S & (S extends { opzionale: true }
    ? { readonly vaScrittoOpzionaleDiNullabile: never }
    : unknown),
): Schema<Dentro<S> | null> {
  return schema<Dentro<S> | null>(
    { ...di.forma, nullo: true },
    v.nullable(valibotDi(di) as Valibot<Dentro<S>>),
  )
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
 * Le chiavi presenti nel grezzo che la forma non dichiara: `oggetto()` le
 * scarta, e su una scrittura una chiave sbagliata sarebbe un dato perso con
 * `ok: true`.
 *
 * Fuori dall'esito della convalida, che resta lo «Standard Schema» a due casi:
 * chi convalida chiede, se gli interessa. Su una forma `aperto` torna vuoto.
 */
export function chiaviEstranee (forma: Forma, grezzo: unknown): readonly string[] {
  if (forma.genere !== 'oggetto' || forma.aperto === true) return []
  if (typeof grezzo !== 'object' || grezzo === null || Array.isArray(grezzo)) return []
  // `hasOwnProperty` e non `in`: con `in` una chiave come `toString` o
  // `constructor` passerebbe per dichiarata.
  return Object.keys(grezzo).filter(
    (chiave) => !Object.prototype.hasOwnProperty.call(forma.campi, chiave),
  )
}

/**
 * Un oggetto con esattamente questi campi.
 *
 * I campi in più si scartano, come fa `normalizza*` con i file: un pannello più
 * nuovo deve funzionare con un host più vecchio. Con `severo` diventano
 * problemi; se accenderlo dipende dal genere della procedura, e lo decide il
 * nucleo.
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
  const voci = Object.fromEntries(Object.entries(campi).map(([nome, s]) => [nome, valibotDi(s)]))
  const nomi = Object.keys(campi)
  const severo = opzioni.severo === true
  return schema<DaCampi<C>>(forma, catena(
    v.custom<Record<string, unknown>>(èOggetto, () => testi().serveOggetto),
    // Ogni campo dichiarato entra, anche assente, come `undefined`: così lo
    // guarda il suo schema e il rifiuto è il suo («Serve del testo.»), non la
    // «chiave mancante» di valibot.
    //
    // Con `severo` restano anche le chiavi estranee, e le rifiuta `v.never`, una
    // per una (`strictObject` si ferma alla prima). Al posto del valore c'è la
    // chiave: il messaggio la vuole, e valibot lo compone prima di sapere il percorso.
    v.transform((grezzo: Record<string, unknown>) => ({
      ...(severo ? Object.fromEntries(chiaviEstranee(forma, grezzo).map((c) => [c, c])) : {}),
      ...Object.fromEntries(nomi.map((nome) => [nome, grezzo[nome]])),
    })),
    severo
      ? v.objectWithRest(voci, v.never((p) => testi().campoSconosciuto(String(p.input))))
      : v.object(voci),
    // `undefined` non si ricopia: `{nota: null}` e `{}` danno lo stesso oggetto.
    // Chi vuole la differenza usa `opzionale(nullabile(...))`, che torna `null`.
    v.transform((dentro: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(dentro).filter(([, valore]) => valore !== undefined))),
  ))
}

/** Niente: le procedure che non chiedono nulla. */
export function vuoto (): Schema<Record<string, never>> {
  return oggetto({})
}

/**
 * Qualunque cosa, senza guardarla: per i valori che nessuno sa descrivere in
 * anticipo (parametri liberi di una tappa, un blob rimandato com'è). Per le
 * entità c'è `entita`.
 *
 * Il valore però deve esserci: per un campo facoltativo si scrive
 * `opzionale(qualunque())`.
 */
export function qualunque (opzioni: Opzioni = {}): Schema<unknown> {
  return schema<unknown>(
    { genere: 'qualunque', aiuto: opzioni.aiuto },
    v.custom<unknown>((valore) => valore !== undefined, () => testi().serveValore),
  )
}

/** Com'è andata a una funzione `valida*` del dominio. */
export interface EsitoDominio {
  valido: boolean
  errori: string[]
}

/**
 * Un'entità intera del registro (`Lezione`, `PianoLezione`, `Consegna`)
 * convalidata dal validatore del dominio, non da una forma riscritta qui.
 *
 * Lo schema verifica solo che sia un oggetto con un id, poi passa a `valida`;
 * se il validatore lancia, è un ingresso non valido, non un guasto interno.
 * Senza `valida` resta il solo controllo di forma: serve alle entità il cui
 * validatore deve vedere il registro (`validaClasse(classe, altre)`), che
 * restano nel gestore.
 */
export function entita<T> (opzioni: Opzioni & {
  /**
   * Come si chiama, per il messaggio: «Lezione», «Piano lezione». Pigro
   * (`() => Uno(lessico().lezione)`) perché lo schema si compone al caricamento.
   */
  cosa: TestoPigro
  valida?: (valore: T) => EsitoDominio
}): Schema<T> {
  const forma: Forma = {
    genere: 'oggetto',
    aiuto: opzioni.aiuto ?? (() => testi().aiutoEntita(detto(opzioni.cosa))),
    campi: { id: { genere: 'testo' } },
    richiesti: ['id'],
    // Si dichiara solo `id`; il resto lo guarda il validatore del dominio. `aperto`
    // dice che i campi in più sono l'entità: `chiaviEstranee` tace e l'aiuto
    // scrive `{ id, … }`.
    aperto: true,
  }
  const { valida } = opzioni
  return schema<T>(forma, catena(
    v.custom<Record<string, unknown>>(èOggetto, () => testi().serveEntita(detto(opzioni.cosa))),
    v.forward(
      v.check(
        (valore: Record<string, unknown>) => typeof valore.id === 'string' && valore.id.trim() !== '',
        () => testi().entitaSenzaId(detto(opzioni.cosa)),
      ),
      ['id'],
    ),
    valida !== undefined && v.rawCheck(({ dataset, addIssue }) => {
      if (!dataset.typed) return
      let esito: EsitoDominio
      try {
        esito = valida(dataset.value as T)
      } catch {
        addIssue({ message: testi().entitaFuoriForma(detto(opzioni.cosa)) })
        return
      }
      if (!esito.valido) for (const message of esito.errori) addIssue({ message })
    }),
  ))
}

// ---------------------------------------------------------------- descrizione

/**
 * La forma tradotta in JSON Schema, per chi chiama da fuori e per l'aiuto.
 * Il `null` ammesso si aggiunge al `type` (`["number", "null"]`), non diventa
 * un `anyOf`.
 */
export function schemaJson (forma: Forma): Record<string, unknown> {
  const dentro = schemaJsonSemplice(forma)
  if (!forma.nullo) return dentro
  const esito = { ...dentro }
  // In JSON Schema `type` ed `enum` sono congiunti: il `null` va aggiunto anche
  // all'`enum`, o un nullabile di `scelta` vieterebbe proprio `null`.
  const valori = esito.enum
  if (Array.isArray(valori)) esito.enum = [...(valori as unknown[]), null]
  // Un `const` con `null` diventa l'enum dei due valori (oggi nessuna forma lo emette).
  if ('const' in esito) {
    esito.enum = [esito.const, null]
    delete esito.const
  }
  const tipo = esito.type
  if (typeof tipo === 'string') esito.type = [tipo, 'null']
  // Un `type` già in elenco (`qualunque`) ha già `null`.
  return esito
}

function schemaJsonSemplice (forma: Forma): Record<string, unknown> {
  const nota = forma.aiuto ? { description: detto(forma.aiuto) } : {}
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
        // «Almeno una voce» si pubblica: chi compone deve sapere che `[]` è rifiutato.
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
        // `additionalProperties: false` vuol dire «invalido», non «scartato»: si
        // pubblica solo dove le chiavi in più fanno davvero fallire (`severo`).
        // Altrimenti un pannello più nuovo che convalidasse contro lo schema non
        // manderebbe i campi che l'host ignorerebbe volentieri.
        additionalProperties: forma.severo !== true,
      }
    case 'nulla':
      return { type: 'null', ...nota }
    case 'qualunque':
      // L'unione dei tipi JSON invece di `{}`: la griglia del modello e il
      // tool-calling strict vogliono un `type`. `integer` è già dentro `number`.
      return { type: ['string', 'number', 'boolean', 'object', 'array', 'null'], ...nota }
  }
}

/** La stessa forma in una riga sola, per l'aiuto della riga di comando. */
export function formaInBreve (forma: Forma): string {
  const breve = formaInBreveSemplice(forma)
  return forma.nullo ? testi().breve.oNullo(breve) : breve
}

function formaInBreveSemplice (forma: Forma): string {
  const t = testi().breve
  switch (forma.genere) {
    case 'testo': return forma.esempio ? t.testoAdEsempio(forma.esempio) : t.testo
    case 'numero': return forma.intero ? t.intero : t.numero
    case 'booleano': return t.veroFalso
    case 'scelta': return forma.valori.join('|')
    case 'elenco': return t.elencoDi(formaInBreve(forma.di))
    case 'oggetto': return forma.aperto
      ? `{ ${[...Object.keys(forma.campi), '…'].join(', ')} }`
      : `{ ${Object.keys(forma.campi).join(', ')} }`
    case 'nulla': return t.nullo
    case 'qualunque': return t.qualunque
  }
}

/**
 * Convalida un valore contro uno schema qualunque, purché parli «Standard
 * Schema»: quello di qui, o quello di una libreria messa al suo posto.
 */
export function convalida<T> (s: Schema<T>, valore: unknown): EsitoConvalida<T> {
  return s['~standard'].validate(valore)
}
