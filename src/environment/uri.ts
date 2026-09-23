// L'`Uri`, e con lui tutta la migrazione.
//
// È la struttura più usata del progetto — quasi cento `joinPath` — e l'unica
// che il registro confronta per stringa invece che per identità: la difesa
// contro l'eco delle proprie scritture in `archive.ts` tiene una mappa
// chiavata su `uri.toString()`, e la mappa delle risorse del webview fa lo
// stesso. Se lo stesso file, raggiunto per vie diverse, desse due stringhe
// diverse, quelle due difese smetterebbero di funzionare in silenzio: il
// registro si ricaricherebbe a ogni salvataggio, e la causa non si vedrebbe.
//
// Perciò la canonicalizzazione si fa una volta sola, nel costruttore, e da lì
// in poi `path` e `toString()` non cambiano più: separatori sempre `/`, `.` e
// `..` risolti, lettera di unità sempre maiuscola, codifica percentuale sempre
// la stessa. I nomi contengono spazi e accenti — sono nomi di classi e di
// allievi — e sono proprio quelli che una codifica ballerina rovina.
//
// `path` resta il percorso decodificato e in forma POSIX, come in VS Code, e
// `fsPath` quello nativo da passare a `node:fs`.

/** Un carattere che dentro un segmento di percorso resta leggibile (RFC 3986, `pchar` meno `%`). */
const LEGGIBILE = /[A-Za-z0-9\-._~!$&'()*+,;=:@]/

/** Un percorso che comincia con una lettera di unità: `C:/x`, e non `/C:/x`. */
const UNITA_IN_TESTA = /^[A-Za-z]:$/

/** Un percorso assoluto che porta una lettera di unità: `/C:/x`. */
const UNITA_DOPO_RADICE = /^\/[A-Za-z]:/

/**
 * Risolve `.` e `..`, toglie i separatori doppi e porta la lettera di unità in
 * maiuscolo. È il cuore della canonicità: due percorsi che indicano lo stesso
 * file devono uscire di qui identici.
 */
function normalizza (grezzo: string): string {
  const assoluto = grezzo.startsWith('/')
  const parti: string[] = []
  for (const pezzo of grezzo.split('/')) {
    if (pezzo === '' || pezzo === '.') continue
    if (pezzo === '..') {
      // Una risalita oltre la radice non porta da nessuna parte: si scarta,
      // invece di lasciare un `..` che finirebbe dentro la stringa canonica e
      // la renderebbe diversa da quella dello stesso file preso per un'altra
      // via.
      if (parti.length > 0 && parti[parti.length - 1] !== '..') parti.pop()
      else if (!assoluto) parti.push('..')
      continue
    }
    parti.push(pezzo)
  }
  if (parti.length > 0 && UNITA_IN_TESTA.test(parti[0])) parti[0] = parti[0].toUpperCase()
  const unito = parti.join('/')
  return assoluto ? `/${unito}` : unito
}

/** Codifica un segmento lasciando in chiaro quel che è già leggibile. */
function codifica (testo: string): string {
  let uscita = ''
  // Per punto di codice e non per unità UTF-16: così le coppie surrogate
  // arrivano intere a `encodeURIComponent`, che le sa scrivere.
  for (const carattere of testo) {
    uscita += LEGGIBILE.test(carattere) ? carattere : encodeURIComponent(carattere)
  }
  return uscita
}

/** Decodifica quel che si può: una stringa mal codificata resta com'è invece di far cadere tutto. */
function decodifica (testo: string): string {
  try {
    return decodeURIComponent(testo)
  } catch {
    return testo
  }
}

/** Le parti di un URI, come le vuole il costruttore. */
interface Componenti {
  scheme: string
  authority: string
  path: string
  query: string
  fragment: string
}

const SCOMPOSIZIONE = /^(?:([^:/?#]+?):)?(?:\/\/([^/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/

export class Uri {
  readonly scheme: string
  readonly authority: string
  readonly path: string
  readonly query: string
  readonly fragment: string

  /** La forma canonica, calcolata una volta sola: è la chiave di mezzo registro. */
  readonly #stringa: string

  private constructor (componenti: Componenti) {
    this.scheme = componenti.scheme.toLowerCase()
    this.authority = componenti.authority
    this.query = componenti.query
    this.fragment = componenti.fragment

    let percorso = normalizza(componenti.path.replace(/\\/g, '/'))
    // Uno schema con autorità ha per forza un percorso assoluto: senza,
    // `file://server` e `file://server/` sarebbero due stringhe per un posto
    // solo.
    if (percorso !== '' && !percorso.startsWith('/')) percorso = `/${percorso}`
    if (percorso === '' && (this.authority !== '' || this.scheme === 'file')) percorso = '/'
    this.path = percorso

    this.#stringa = this.componi()
  }

  /** L'uri di un file sul disco, dato il percorso nativo. */
  static file (percorso: string): Uri {
    let path = percorso.replace(/\\/g, '/')
    let authority = ''
    // Un percorso di rete `\\server\quota` diventa autorità più percorso: è
    // l'unico caso in cui un `file:` ha qualcosa prima delle barre.
    if (path.startsWith('//')) {
      const taglio = path.indexOf('/', 2)
      if (taglio === -1) {
        authority = path.slice(2)
        path = '/'
      } else {
        authority = path.slice(2, taglio)
        path = path.slice(taglio)
      }
    } else if (!path.startsWith('/')) {
      path = `/${path}`
    }
    return new Uri({ scheme: 'file', authority, path, query: '', fragment: '' })
  }

  /** L'uri scritto per esteso: `https://…`, `file:///…`, `registro://…`. */
  static parse (valore: string): Uri {
    const pezzi = SCOMPOSIZIONE.exec(valore)
    if (!pezzi) return Uri.file(valore)
    const [, scheme, authority, path, query, fragment] = pezzi
    return new Uri({
      scheme: scheme ?? 'file',
      authority: decodifica(authority ?? ''),
      // Il percorso si tiene decodificato, come in VS Code: la codifica
      // appartiene alla stringa, non al percorso.
      path: (path ?? '').split('/').map(decodifica).join('/'),
      query: decodifica(query ?? ''),
      fragment: decodifica(fragment ?? ''),
    })
  }

  /**
   * L'uri che si ottiene scendendo di uno o più segmenti. Con `..` si risale,
   * ed è così che `years.ts` e `filing.ts` prendono la cartella che
   * contiene un file. Senza parti restituisce l'uri stesso.
   */
  static joinPath (base: Uri, ...parti: string[]): Uri {
    if (parti.length === 0) return base
    return base.with({ path: `${base.path}/${parti.join('/')}` })
  }

  /** Lo stesso uri con qualche parte cambiata. Il risultato è di nuovo canonico. */
  with (cambiamenti: Partial<Componenti>): Uri {
    return new Uri({
      scheme: cambiamenti.scheme ?? this.scheme,
      authority: cambiamenti.authority ?? this.authority,
      path: cambiamenti.path ?? this.path,
      query: cambiamenti.query ?? this.query,
      fragment: cambiamenti.fragment ?? this.fragment,
    })
  }

  /**
   * Il percorso da dare a `node:fs`, nella forma della macchina.
   *
   * La forma si ricava dal percorso e non da `process.platform`: un percorso
   * con lettera di unità o con autorità è di Windows e vuole le barre
   * rovesciate, gli altri sono POSIX. Così la stessa funzione dà lo stesso
   * risultato ovunque giri, e le prove non dipendono da dove girano.
   */
  get fsPath (): string {
    if (this.authority !== '' && this.scheme === 'file') {
      return `\\\\${this.authority}${this.path.replace(/\//g, '\\')}`
    }
    if (UNITA_DOPO_RADICE.test(this.path)) return this.path.slice(1).replace(/\//g, '\\')
    return this.path
  }

  toString (): string {
    return this.#stringa
  }

  /** Serve a `JSON.stringify`: senza, uscirebbe un oggetto senza `fsPath` e con campi che non servono. */
  toJSON (): Componenti {
    return {
      scheme: this.scheme,
      authority: this.authority,
      path: this.path,
      query: this.query,
      fragment: this.fragment,
    }
  }

  private componi (): string {
    const percorso = this.path.split('/').map(codifica).join('/')
    const testa =
      this.authority !== '' || this.scheme === 'file'
        ? `${this.scheme}://${codifica(this.authority)}`
        : `${this.scheme}:`
    const coda =
      (this.query !== '' ? `?${codifica(this.query)}` : '') +
      (this.fragment !== '' ? `#${codifica(this.fragment)}` : '')
    return `${testa}${percorso}${coda}`
  }
}

/**
 * Un glob relativo a una cartella. Il registro la usa in due punti soli — i
 * JSON dell'anno in `archive.ts`, i PDF in arrivo in `sorter.ts` — e non
 * ne legge mai i campi: li passa a `createFileSystemWatcher` e basta. Qui
 * quindi è una coppia, e a interpretarla penserà l'osservatore (fase 3).
 */
export class ModelloRelativo {
  readonly baseUri: Uri
  /** Il percorso nativo della base, che è la forma in cui il registro la legge. */
  readonly base: string

  constructor (base: Uri | string, readonly pattern: string) {
    this.baseUri = typeof base === 'string' ? Uri.file(base) : base
    this.base = this.baseUri.fsPath
  }
}
