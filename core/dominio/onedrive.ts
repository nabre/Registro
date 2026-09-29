// OneDrive visto dal registro: le cartelle e i documenti `.regi`, niente altro.
// Due strade: le cartelle che il client di OneDrive sincronizza sul computer,
// lette dal registro di Windows e senza chiedere niente a nessuno; e Microsoft
// Graph, che vede anche quel che non è sincronizzato ma vuole un consenso che
// molte scuole riservano all'amministratore. Qui le due si traducono nella
// forma che il pannello disegna. Senza rete e senza disco, così si prova.

/**
 * Il drive delle voci lette dal disco: l'id è il percorso, e nessun drive di
 * Graph si chiama così.
 */
export const DRIVE_LOCALE = 'locale'

/** Un account Microsoft come lo vede il pannello: chi, e che cosa ci si fa. */
export interface AccountMicrosoft {
  /** Il nome con cui si entra: `nome.cognome@scuola.ch`. */
  indirizzo: string
  /** Il nome da mostrare, come lo dice Microsoft; vuoto se non si sa. */
  nome: string
  /** Vero se il registro ha un gettone per leggere il suo OneDrive con Graph. */
  onedrive: boolean
  /** Vero se il client di OneDrive lo sincronizza su questo computer: si sfoglia senza accesso. */
  sulComputer: boolean
  /** Vero se è anche la casella della posta scritta nelle impostazioni. */
  posta: boolean
}

/** Una voce di OneDrive che conta per il registro: una cartella o un documento. */
export interface VoceOneDrive {
  /** L'id dell'elemento nel suo drive: con `drive` lo ritrova Graph. */
  id: string
  /** Il drive che lo contiene: il proprio, o quello di chi l'ha condiviso. */
  drive: string
  nome: string
  genere: 'cartella' | 'regi'
  /** In byte; zero per le cartelle. */
  dimensione: number
  /** L'ultima modifica, ISO; vuoto se Graph non la dice. */
  modificato: string
  /** Le cartelle da attraversare dalla radice del drive; vuoto se non si sa. */
  percorso: string[]
  /** Quante voci ha dentro una cartella, se Graph lo dice. */
  figli: number | null
}

/**
 * Un elemento come lo manda Graph (`driveItem`), per i campi che servono. Le
 * voci condivise e le scorciatoie portano il vero elemento in `remoteItem`.
 */
export interface ElementoGraph {
  id?: string
  name?: string
  size?: number
  lastModifiedDateTime?: string
  folder?: { childCount?: number }
  file?: object
  package?: object
  parentReference?: { driveId?: string, id?: string, path?: string }
  remoteItem?: ElementoGraph
}

/** Se un nome è quello di un documento del registro. */
export function èRegi (nome: string): boolean {
  return /\.regi$/i.test(nome.trim())
}

/**
 * Le cartelle di un `parentReference.path` di Graph: `/drive/root:/A%20B/C`
 * dà `['A B', 'C']`, la radice dà `[]`. Un pezzo che non si decodifica resta
 * com'è: meglio un nome strano che una voce persa.
 */
export function percorsoDaGraph (path: string | undefined): string[] {
  if (!path) return []
  const dopo = path.indexOf(':')
  if (dopo < 0) return []
  return path
    .slice(dopo + 1)
    .split('/')
    .filter(Boolean)
    .map((pezzo) => {
      try {
        return decodeURIComponent(pezzo)
      } catch {
        return pezzo
      }
    })
}

/**
 * La voce di un elemento, o `null` se al registro non interessa: un file che
 * non è un `.regi`, o un elemento senza id. Il nome resta quello di chi guarda
 * (una scorciatoia rinominata), l'id e il drive quelli dell'originale.
 */
export function voceDaGraph (elemento: ElementoGraph, driveDiRipiego = ''): VoceOneDrive | null {
  const vero = elemento.remoteItem ?? elemento
  const nome = elemento.name ?? vero.name ?? ''
  const id = vero.id ?? elemento.id
  if (!id || !nome) return null

  const cartella = Boolean(vero.folder ?? vero.package)
  if (!cartella && !(vero.file && èRegi(nome))) return null

  return {
    id,
    drive: vero.parentReference?.driveId ?? elemento.parentReference?.driveId ?? driveDiRipiego,
    nome,
    genere: cartella ? 'cartella' : 'regi',
    dimensione: cartella ? 0 : Math.max(0, vero.size ?? 0),
    modificato: vero.lastModifiedDateTime ?? elemento.lastModifiedDateTime ?? '',
    percorso: percorsoDaGraph(vero.parentReference?.path ?? elemento.parentReference?.path),
    figli: cartella ? vero.folder?.childCount ?? null : null,
  }
}

/** Prima le cartelle, poi i documenti; dentro, per nome come li mostra Esplora risorse. */
export function ordinaVoci (voci: readonly VoceOneDrive[]): VoceOneDrive[] {
  return [...voci].sort((a, b) =>
    a.genere !== b.genere
      ? a.genere === 'cartella' ? -1 : 1
      : a.nome.localeCompare(b.nome, undefined, { numeric: true, sensitivity: 'base' }),
  )
}

/** Un account che il client di OneDrive sincronizza su questo computer. */
export interface OneDriveLocale {
  indirizzo: string
  /** Il nome della persona, come lo scrive il client (`UserName`). */
  nome: string
  /** La cartella personale e le librerie condivise (SharePoint, Teams) sincronizzate. */
  cartelle: string[]
}

/**
 * Gli account di `reg query HKCU\Software\Microsoft\OneDrive\Accounts /s`.
 * Ogni account (`Business1`, `Personal`) ha nella sua chiave `UserEmail`,
 * `UserName` e `UserFolder`; sotto `Tenants\<nome>` le librerie sincronizzate
 * sono i nomi dei valori, percorsi interi. I nomi dei valori non sono tradotti;
 * il tipo `REG_…` fa da separatore. Un account senza indirizzo o senza
 * cartelle non si conta.
 */
export function oneDriveSulComputer (uscita: string): OneDriveLocale[] {
  const perChiave = new Map<string, { indirizzo: string, nome: string, cartelle: string[] }>()
  let chiave: string | null = null
  let dove = ''

  for (const riga of uscita.split(/\r?\n/)) {
    const intestazione = /^HKEY_[^\\]+\\Software\\Microsoft\\OneDrive\\Accounts\\([^\\]+)(.*)$/i
      .exec(riga.trim())
    if (/^HKEY_/i.test(riga.trim())) {
      chiave = intestazione?.[1] ?? null
      dove = intestazione?.[2] ?? ''
      if (chiave && !perChiave.has(chiave)) perChiave.set(chiave, { indirizzo: '', nome: '', cartelle: [] })
      continue
    }
    const voce = chiave ? perChiave.get(chiave) : undefined
    const valore = /^\s+(.+?)\s+(REG_[A-Z_]+)(?:\s+(.*?))?\s*$/.exec(riga)
    if (!voce || !valore) continue
    const [, nome, tipo, dato = ''] = valore

    if (dove === '' && tipo === 'REG_SZ') {
      if (nome === 'UserEmail') voce.indirizzo = dato
      else if (nome === 'UserName') voce.nome = dato
      else if (nome === 'UserFolder' && dato) voce.cartelle.unshift(dato)
    } else if (/^\\Tenants\\/i.test(dove) && /^(?:[A-Za-z]:\\|\\\\)/.test(nome)) {
      voce.cartelle.push(nome)
    }
  }

  return [...perChiave.values()]
    .filter((voce) => voce.indirizzo && voce.cartelle.length > 0)
    .map((voce) => ({ ...voce, cartelle: [...new Set(voce.cartelle)] }))
}

/** Le cartelle che OneDrive sincronizza per un account, se ce ne sono. */
export function cartelleSincronizzate (uscita: string, indirizzo: string): string[] {
  const cercato = indirizzo.trim().toLowerCase()
  return oneDriveSulComputer(uscita)
    .filter((voce) => voce.indirizzo.toLowerCase() === cercato)
    .flatMap((voce) => voce.cartelle)
}
