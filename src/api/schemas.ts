// Le forme che un ingresso deve avere per essere accettato.
//
// Un messaggio arriva da webview, condotto o riga di comando: il tipo
// TypeScript a runtime non c'è. Ogni schema qui convalida a runtime, dà il tipo
// per inferenza e si descrive in JSON Schema per chi chiama da fuori.
//
// Fatto in casa ma con l'interfaccia «Standard Schema» (`~standard`), la
// stessa di zod, valibot e arktype: `core.ts` conosce solo quella, quindi la
// libreria si può sostituire senza toccare nucleo o procedure.

import { detto, type TestoPigro } from '../i18n/index.js'
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
    if (typeof valore !== 'string') return male(testi().serveTesto)
    if (opzioni.minimo !== undefined && valore.length < opzioni.minimo) {
      return male(testi().testoAlmeno(opzioni.minimo))
    }
    if (opzioni.massimo !== undefined && valore.length > opzioni.massimo) {
      return male(testi().testoOltre(opzioni.massimo))
    }
    if (opzioni.modello && !opzioni.modello.test(valore)) {
      return male(testi().formaAttesa(valore))
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
    if (typeof valore !== 'number' || !Number.isFinite(valore)) return male(testi().serveNumero)
    if (opzioni.intero && !Number.isInteger(valore)) return male(testi().serveIntero)
    if (opzioni.minimo !== undefined && valore < opzioni.minimo) {
      return male(testi().numeroAlmeno(opzioni.minimo))
    }
    if (opzioni.massimo !== undefined && valore > opzioni.massimo) {
      return male(testi().numeroAlPiu(opzioni.massimo))
    }
    return { value: valore }
  })
}

export function booleano (opzioni: Opzioni = {}): Schema<boolean> {
  return schema<boolean>({ genere: 'booleano', aiuto: opzioni.aiuto }, (valore) => {
    if (typeof valore !== 'boolean') return male(testi().serveBooleano)
    return { value: valore }
  })
}

/**
 * Uno fra questi valori, e nessun altro: il condotto e la riga di comando sono
 * sponde che il compilatore non vede.
 */
export function scelta<const V extends readonly string[]> (
  valori: V,
  opzioni: Opzioni = {},
): Schema<V[number]> {
  return schema<V[number]>({ genere: 'scelta', aiuto: opzioni.aiuto, valori }, (valore) => {
    if (typeof valore !== 'string' || !valori.includes(valore)) {
      return male(testi().serveUnoFra(valori.join(', ')))
    }
    return { value: valore }
  })
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
    (valore) => {
      if (typeof valore !== 'string' || valore.trim() === '') return male(testi().serveIdentificatore)
      if (valore.length > 64) return male(testi().identificatoreLungo)
      // Si torna il valore ripulito: con gli spazi la procedura non troverebbe la voce.
      return { value: valore.trim() }
    },
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
    (valore) => {
      if (typeof valore !== 'string' || !MODELLO_ISO.test(valore)) {
        return male(testi().serveData)
      }
      const [anno, mese, giorno] = valore.split('-').map(Number)
      // Dalla stringa e non da `Date.UTC`, che mappa gli anni 0–99 su 1900–1999:
      // `'0000-01-01'` è la sentinella di `risolviPeriodo`
      // (`procedures/common/filters.ts`) che torna nelle buste, e deve rientrare.
      //
      // Il confronto campo per campo serve perché V8 fa traboccare
      // `2023-02-29T00:00:00Z` al primo marzo invece di dare NaN.
      const data = new Date(`${valore}T00:00:00Z`)
      const torna =
        !Number.isNaN(data.getTime()) &&
        data.getUTCFullYear() === anno &&
        data.getUTCMonth() === mese - 1 &&
        data.getUTCDate() === giorno
      if (!torna) return male(testi().giornoInesistente(valore))
      return { value: valore }
    },
  )
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
    (valore) => {
      if (typeof valore !== 'string' || !MODELLO_ORA.test(valore)) {
        return male(testi().serveOra)
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
  // `minimo` e `massimo` entrano nella forma, che è quel che `schemaJson()`
  // pubblica: chi chiama da fuori deve sapere che `[]` è rifiutato.
  const forma: Forma = {
    genere: 'elenco',
    aiuto: opzioni.aiuto,
    di: di.forma,
    minimo: opzioni.minimo,
    massimo: opzioni.massimo,
  }
  return schema<Array<Dentro<S>>>(forma, (valore) => {
    if (!Array.isArray(valore)) return male(testi().serveElenco)
    if (opzioni.minimo !== undefined && valore.length < opzioni.minimo) {
      return male(testi().elencoAlmeno(opzioni.minimo))
    }
    if (opzioni.massimo !== undefined && valore.length > opzioni.massimo) {
      return male(testi().elencoAlPiu(opzioni.massimo))
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
 * Lo stesso schema, ma la chiave può mancare. `null` vale comunque come
 * assente, vedi sotto.
 */
export function opzionale<S extends Schema<unknown>> (di: S): SchemaOpzionale<Dentro<S>> {
  // Se il `null` è di qualcuno si decide qui, dalla forma di dentro, che non
  // cambia più.
  const nulloSuo = di.forma.nullo === true
  return {
    opzionale: true,
    forma: di.forma,
    '~standard': {
      version: 1,
      vendor: 'registro',
      validate: (valore) => {
        if (valore === undefined) return { value: undefined }
        // `null` su un campo facoltativo vale come chiave assente: la griglia che
        // obbliga il modello scrive `null` su tutti i campi che non usa.
        //
        // Per distinguere «assente» da «null» si scrive `opzionale(nullabile(x))`
        // (es. `valutazioni.recupero.imposta`: assente = lascia com'era, `null` =
        // togli). `opzionale` è il guscio esterno e vede il `null` per primo, quindi
        // lo lascia passare quando la forma di dentro ha `nullo`.
        if (valore === null && !nulloSuo) return { value: undefined }
        return di['~standard'].validate(valore) as EsitoConvalida<Dentro<S> | undefined>
      },
    },
  }
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
  return schema<DaCampi<C>>(forma, (valore) => {
    if (typeof valore !== 'object' || valore === null || Array.isArray(valore)) {
      return male(testi().serveOggetto)
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
        // `undefined` non si ricopia: `{nota: null}` e `{}` danno lo stesso oggetto.
        // Chi vuole la differenza usa `opzionale(nullabile(...))`, che torna `null`.
        dentro[nome] = esito.value
      }
    }
    if (opzioni.severo === true) {
      for (const chiave of chiaviEstranee(forma, grezzo)) {
        problemi.push({ message: testi().campoSconosciuto(chiave), path: [chiave] })
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
 * Qualunque cosa, senza guardarla: per i valori che nessuno sa descrivere in
 * anticipo (parametri liberi di una tappa, un blob rimandato com'è). Per le
 * entità c'è `entita`.
 *
 * Il valore però deve esserci: per un campo facoltativo si scrive
 * `opzionale(qualunque())`.
 */
export function qualunque (opzioni: Opzioni = {}): Schema<unknown> {
  return schema<unknown>({ genere: 'qualunque', aiuto: opzioni.aiuto }, (valore) => {
    if (valore === undefined) return male(testi().serveValore)
    return { value: valore }
  })
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
  return schema<T>(forma, (valore) => {
    if (typeof valore !== 'object' || valore === null || Array.isArray(valore)) {
      return male(testi().serveEntita(detto(opzioni.cosa)))
    }
    const id = (valore as { id?: unknown }).id
    if (typeof id !== 'string' || id.trim() === '') {
      return male(testi().entitaSenzaId(detto(opzioni.cosa)), ['id'])
    }
    if (!opzioni.valida) return { value: valore as T }
    let esito: EsitoDominio
    try {
      esito = opzioni.valida(valore as T)
    } catch {
      return male(testi().entitaFuoriForma(detto(opzioni.cosa)))
    }
    if (!esito.valido) return { issues: esito.errori.map((message) => ({ message })) }
    return { value: valore as T }
  })
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
