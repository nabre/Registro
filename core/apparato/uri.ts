// `Uri` canonico. `archive.ts` (eco delle scritture) e le risorse del webview
// usano `uri.toString()` come chiave, quindi lo stesso file deve dare sempre la
// stessa stringa: il costruttore normalizza separatori, `.`/`..`, lettera di
// unità e codifica percentuale. `path` è decodificato e POSIX, `fsPath` nativo.

/** Un carattere che dentro un segmento di percorso resta leggibile (RFC 3986, `pchar` meno `%`). */
const LEGGIBILE = /[A-Za-z0-9\-._~!$&'()*+,;=:@]/

/** Un percorso che comincia con una lettera di unità: `C:/x`, e non `/C:/x`. */
const UNITA_IN_TESTA = /^[A-Za-z]:$/

/** Un percorso assoluto che porta una lettera di unità: `/C:/x`. */
const UNITA_DOPO_RADICE = /^\/[A-Za-z]:/

/** Risolve `.` e `..`, toglie le barre doppie, mette la lettera di unità in maiuscolo. */
function normalizza (grezzo: string): string {
  const assoluto = grezzo.startsWith('/')
  const parti: string[] = []
  for (const pezzo of grezzo.split('/')) {
    if (pezzo === '' || pezzo === '.') continue
    if (pezzo === '..') {
      // Oltre la radice di un percorso assoluto il `..` si scarta.
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
  // Per punto di codice, così le coppie surrogate arrivano intere a `encodeURIComponent`.
  for (const carattere of testo) {
    uscita += LEGGIBILE.test(carattere) ? carattere : encodeURIComponent(carattere)
  }
  return uscita
}

/** Decodifica; una stringa mal codificata resta com'è. */
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

  /** La forma canonica, calcolata una volta sola. */
  readonly #stringa: string

  private constructor (componenti: Componenti) {
    this.scheme = componenti.scheme.toLowerCase()
    this.authority = componenti.authority
    this.query = componenti.query
    this.fragment = componenti.fragment

    let percorso = normalizza(componenti.path.replace(/\\/g, '/'))
    // Con autorità il percorso è assoluto: `file://server` e `file://server/` coincidono.
    if (percorso !== '' && !percorso.startsWith('/')) percorso = `/${percorso}`
    if (percorso === '' && (this.authority !== '' || this.scheme === 'file')) percorso = '/'
    this.path = percorso

    this.#stringa = this.componi()
  }

  /** L'uri di un file sul disco, dato il percorso nativo. */
  static file (percorso: string): Uri {
    let path = percorso.replace(/\\/g, '/')
    let authority = ''
    // Un percorso di rete `\\server\quota` diventa autorità più percorso.
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
      // Il percorso si tiene decodificato: la codifica è della stringa.
      path: (path ?? '').split('/').map(decodifica).join('/'),
      query: decodifica(query ?? ''),
      fragment: decodifica(fragment ?? ''),
    })
  }

  /** Aggiunge segmenti al percorso (`..` risale); senza parti torna `base`. */
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
   * Il percorso nativo per `node:fs`. La forma dipende dal percorso, non da
   * `process.platform` (unità o autorità → Windows), così le prove non
   * dipendono dalla piattaforma.
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

  /** Le sole componenti, per `JSON.stringify`. */
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

/** Un glob relativo a una cartella, interpretato da `createFileSystemWatcher`. */
export class ModelloRelativo {
  readonly baseUri: Uri
  /** Il percorso nativo della base. */
  readonly base: string

  constructor (base: Uri | string, readonly pattern: string) {
    this.baseUri = typeof base === 'string' ? Uri.file(base) : base
    this.base = this.baseUri.fsPath
  }
}
