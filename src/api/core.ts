// Il nucleo: prende un nome, un ingresso e un archivio, e torna una busta.
//
// Unico punto, condiviso da tutti i trasporti (pannello, condotto, menu
// nativo, riga di comando), in cui una chiamata si convalida, si esegue, si
// cronometra e si scrive nel giornale. Non spinge lo stato al pannello e non
// rigenera PDF: dipende da chi ha chiamato, e lo fanno `panels/panel.ts` e
// `actions.ts`.

import type { Archivio } from '../data/archive.js'
import type { Azione } from '../protocol.js'
import { contestoDi, type EsitoAzione, type Gestore, type Parte } from '../actions/context.js'
import { rigeneraDopoScrittura } from '../actions/reports.js'
import { identificatore } from '../domain/identifiers.js'
import {
  ErroreApi,
  VERSIONE_API,
  definisci,
  type Ambito,
  type Codice,
  type EsitoScrittura,
  type Origine,
  type Procedura,
  type ProceduraQualunque,
  type Risultato,
  type Spia,
  type VoceGiornale,
} from './contract.js'
import { booleano, convalida, numero, oggetto, opzionale, scelta, testo, type Schema } from './schemas.js'
import { detto } from '../i18n/index.js'
import { testi } from './core.testi.js'

// ------------------------------------------------------------------ l'elenco

const PROCEDURE = new Map<string, ProceduraQualunque>()

/**
 * Mette delle procedure nell'elenco: o tutte o nessuna.
 *
 * Stesso nome: confronto per identità. Lo stesso oggetto è una ripetizione
 * innocua; un altro oggetto (modulo caricato due volte, come nei bundle delle
 * prove) è un errore. I controlli precedono ogni inserimento perché
 * `registraTutte()` la chiamano più punti e un'eccezione a metà lascerebbe la
 * mappa popolata a metà.
 *
 * Vietati i nomi con `$`: `transports/conduit.ts` intercetta i metodi `$…`
 * prima di smistare, e la procedura sarebbe visibile ma irraggiungibile.
 */
export function registra (...procedure: Array<ProceduraQualunque>): void {
  const nuove = new Map<string, ProceduraQualunque>()
  for (const p of procedure) {
    if (p.nome.startsWith('$')) {
      // testo-fisso: un errore di programmazione, per chi sviluppa: il registro non parte
      throw new Error(`«${p.nome}» comincia con «$», che il condotto tiene per sé.`)
    }
    // Anche contro quelle di questa stessa chiamata: due omonime nello stesso
    // indice non sono ancora nella mappa.
    const gia = PROCEDURE.get(p.nome) ?? nuove.get(p.nome)
    // testo-fisso: un errore di programmazione, per chi sviluppa: il registro non parte
    if (gia && gia !== p) throw new Error(`Due procedure si chiamano «${p.nome}».`)
    if (!gia) nuove.set(p.nome, p)
  }
  for (const [nome, p] of nuove) PROCEDURE.set(nome, p)
}

export function procedura (nome: string): ProceduraQualunque | undefined {
  return PROCEDURE.get(nome)
}

/** Tutte, in ordine di nome: l'indice che la riga di comando stampa. */
export function procedure (): Array<ProceduraQualunque> {
  return [...PROCEDURE.values()].sort((a, b) => a.nome.localeCompare(b.nome))
}

// ----------------------------------------------------------------- giornale

const SPIE = new Set<Spia>()

/**
 * Sta a guardare ogni chiamata. La spia riceve nome, origine, durata ed esito,
 * mai l'ingresso, che contiene nomi di persone.
 */
export function osserva (spia: Spia): () => void {
  SPIE.add(spia)
  return () => SPIE.delete(spia)
}

function racconta (voce: VoceGiornale): void {
  for (const spia of SPIE) {
    try {
      spia(voce)
    } catch {
      // Una spia rotta non fa fallire la chiamata che stava guardando.
    }
  }
}

/**
 * Racconta al giornale un lavoro che non è passato da `chiama()`.
 *
 * Serve solo al completamento dell'OCR in coda (`data/sorter.ts`): dura minuti
 * e non può tenere la fila, ma scrive nel registro. Non è una porta per
 * scrivere fuori dal contratto.
 */
export function annota (voce: VoceGiornale): void {
  racconta(voce)
}

// ------------------------------------------------------------------ chiamata

/**
 * Un rifiuto riconosciuto per struttura, non con `instanceof`: con il modulo
 * caricato due volte (bundle delle prove) le classi `ErroreApi` sono due, e il
 * rifiuto diventerebbe `interno` perdendo il rimedio. Nessun errore di libreria
 * ha insieme `codice` stringa e `messaggi` array.
 */
function comeErroreApi (guasto: unknown): ErroreApi | null {
  if (guasto instanceof ErroreApi) return guasto
  if (!(guasto instanceof Error)) return null
  const forse = guasto as Partial<ErroreApi>
  if (typeof forse.codice !== 'string' || !Array.isArray(forse.messaggi)) return null
  return guasto as ErroreApi
}

interface Opzioni {
  origine?: Origine
  /** Per correlare una chiamata a quella che l'ha causata. Se manca, se ne fa uno. */
  tracciato?: string
}

// --------------------------------------------------------------------- la fila

/**
 * Quanto una scrittura aspetta il proprio turno prima di rinunciare.
 *
 * Davanti può esserci una scrittura lunghissima (la geocodifica dura fino a
 * dieci minuti, `documento.apri` aspetta un dialogo modale). Trenta secondi
 * superano qualunque scrittura che finisce da sé e restano sotto il tempo in
 * cui il registro sembra morto. La rinuncia dice perché e va nel giornale.
 */
const ATTESA_TURNO_MS = 30_000

/** L'ultima scrittura messa in fila: chi arriva si accoda a lei. */
let fila: Promise<void> = Promise.resolve()

/** Il segno che il turno non è arrivato in tempo: un simbolo non lo torna nessuno. */
const SCADUTO = Symbol('turno scaduto')

/**
 * Una scrittura alla volta, su tutto il registro.
 *
 * Serve perché i gestori che aspettano fra lettura e scrittura (dialoghi di
 * sistema, posta) lascerebbero passare un'altra scrittura, e l'ultima
 * `modifica()` vincerebbe in silenzio.
 *
 * Non può stallare perché nessun gestore rientra in `chiama()` (nessuna
 * chiamata sotto `src/actions/` o `src/api/procedures/`):
 * `tests/api/queue.test.mjs` lo verifica. Come `Archivio.inFila`, la fila
 * aspetta la fine e non l'esito, quindi un errore non blocca chi segue.
 */
async function inFila<T> (lavoro: () => Promise<T>, rinuncia: () => T): Promise<T> {
  const davanti = fila
  let finito!: () => void
  const mio = new Promise<void>((risolvi) => {
    finito = risolvi
  })
  // Chi arriva dopo aspetta sia la fila di prima sia questa scrittura. La
  // seconda si scioglie anche alla rinuncia; la prima resta, così una rinuncia
  // non fa passare nessuno avanti a chi sta ancora scrivendo.
  fila = davanti.then(() => mio, () => mio)

  let sveglia: ReturnType<typeof setTimeout> | undefined
  const tetto = new Promise<typeof SCADUTO>((risolvi) => {
    sveglia = setTimeout(() => risolvi(SCADUTO), ATTESA_TURNO_MS)
    // Il timer non deve tenere sveglio il processo durante lo spegnimento.
    sveglia.unref?.()
  })

  const turno = await Promise.race([davanti.then(() => undefined, () => undefined), tetto])
  if (sveglia) clearTimeout(sveglia)
  if (turno === SCADUTO) {
    finito()
    return rinuncia()
  }

  try {
    return await lavoro()
  } finally {
    finito()
  }
}

/**
 * Chiama una procedura. Non lancia mai: quel che va storto torna nella busta.
 * Si convalida prima di toccare l'archivio: se non passa, non si scrive niente.
 */
export async function chiama<U = unknown> (
  archivio: Archivio,
  nome: string,
  ingresso: unknown,
  opzioni: Opzioni = {},
): Promise<Risultato<U>> {
  const tracciato = opzioni.tracciato ?? identificatore('api')
  const origine = opzioni.origine ?? 'pannello'
  const partenza = Date.now()
  const p = PROCEDURE.get(nome)

  if (!p) {
    // Senza `genere`: un nome inventato non va contato fra le letture.
    const voce: VoceGiornale = {
      tracciato, procedura: nome, origine,
      durataMs: 0, ok: false, codice: 'procedura-sconosciuta', modifiche: 0,
    }
    racconta(voce)
    return {
      ok: false, api: VERSIONE_API, procedura: nome, tracciato,
      codice: 'procedura-sconosciuta',
      messaggi: [testi().nonConosce(nome)],
    }
  }

  // `let`: una scrittura in fila lo rilegge al proprio turno, per non contare le
  // modifiche di chi la precedeva.
  let prima = archivio.revisione
  /**
   * La busta fallita, con quel che si sa già.
   *
   * `modifiche` e `revisione` viaggiano anche sui fallimenti: l'uscita si
   * convalida dopo `esegui`, e una scrittura già avvenuta può tornare `interno`;
   * con `modifiche > 0` chi chiama sa di non dover ritentare. `versione` serve a
   * chi riceve `ingresso-non-valido`.
   */
  const chiudi = (codice: Codice, messaggi: string[], campo?: string): Risultato<U> => {
    // Una lettura non ne fa mai: le modifiche contate nel frattempo sono di altri,
    // e `modifiche > 0` direbbe «non ritentare» a chi può ritentare.
    const modifiche = p.genere === 'scrittura' ? archivio.revisione - prima : 0
    racconta({
      tracciato, procedura: nome, origine, genere: p.genere,
      durataMs: Date.now() - partenza, ok: false, codice,
      modifiche,
    })
    return {
      ok: false, api: VERSIONE_API, procedura: nome, versione: p.versione, tracciato, codice,
      messaggi, modifiche, revisione: archivio.revisione,
      ...(campo ? { campo } : {}),
    }
  }

  const controllo = convalida(p.ingresso, ingresso)
  if (controllo.issues) {
    const campo = controllo.issues[0]?.path?.join('.')
    return chiudi(
      'ingresso-non-valido',
      controllo.issues.map((problema) => {
        const dove = problema.path?.join('.')
        return dove ? `${dove}: ${problema.message}` : problema.message
      }),
      campo || undefined,
    )
  }

  // Documento e anno prima di mettersi in fila: se al turno sono cambiati, la
  // scrittura parlava di un registro non più aperto (come in `actions/reports.ts`:
  // `leggiTutto` sostituisce il registro).
  const documentoAtteso = archivio.documentoAperto?.toString() ?? null
  const annoAtteso = archivio.registro.annoCorrenteId

  const esegui = async (): Promise<Risultato<U>> => {
    // L'origine va anche nel contesto, così `ambito.origine` e
    // `ambito.contesto.origine` coincidono per ogni trasporto.
    const ambito: Ambito = { contesto: contestoDi(archivio, origine), tracciato, origine }

    let dati: unknown
    try {
      dati = await (p.esegui as (a: Ambito, i: unknown) => unknown)(ambito, controllo.value)
    } catch (guasto) {
      const rifiuto = comeErroreApi(guasto)
      if (rifiuto) return chiudi(rifiuto.codice, rifiuto.messaggi, rifiuto.campo)
      // Il guasto imprevisto va per intero in console e in una riga sola a chi ha
      // premuto, legati dal tracciato.
      //
      // Il messaggio dell'eccezione non esce: i percorsi dell'archivio contengono
      // classe e nome dell'allievo. Vale solo per i guasti imprevisti: i rifiuti
      // scritti apposta passano interi, e `tests/api/procedures.test.mjs` controlla
      // che non nominino percorsi.
      console.error(`[api] ${nome} (${tracciato})`, guasto)
      return chiudi('interno', [testi().guastoInterno(tracciato)])
    }

    const uscita = convalida(p.uscita, dati)
    if (uscita.issues) {
      // L'uscita non rispetta il contratto: difetto del registro, si dice.
      console.error(`[api] ${nome} non rispetta la propria uscita`, uscita.issues)
      return chiudi('interno', [testi().uscitaFuoriForma])
    }

    racconta({
      tracciato, procedura: nome, origine, genere: p.genere,
      durataMs: Date.now() - partenza, ok: true,
      modifiche: p.genere === 'scrittura' ? archivio.revisione - prima : 0,
    })
    // I documenti seguono i dati da qualunque trasporto arrivi la scrittura. Si
    // guarda la revisione, non l'esito: senza modifiche nessun foglio è vecchio.
    if (p.genere === 'scrittura' && archivio.revisione !== prima) {
      rigeneraDopoScrittura(archivio, controllo.value as Record<string, unknown>)
    }
    return {
      ok: true, api: VERSIONE_API, procedura: nome, versione: p.versione, tracciato,
      dati: uscita.value as U,
    }
  }

  // Le letture saltano la fila: sono sincrone sul registro in memoria.
  // `tests/api/writes.test.mjs` lo sorveglia sul sorgente del pannello.
  if (p.genere !== 'scrittura') return esegui()

  return inFila<Risultato<U>>(
    async () => {
      // Il conto riparte da qui: le modifiche avvenute durante l'attesa sono di altri.
      prima = archivio.revisione
      // Per ogni scrittura che dipende dal documento, anche con `collezioni: []`
      // (`esportazioni.elimina` cancella un file del documento). Fuori solo chi è il
      // cambio di documento e chi non lo guarda: vedi `documento` in `contract.ts`.
      if (p.documento === undefined) {
        const documentoOra = archivio.documentoAperto?.toString() ?? null
        if (documentoOra !== documentoAtteso || archivio.registro.annoCorrenteId !== annoAtteso) {
          return chiudi('conflitto', [testi().documentoCambiato, testi().rileggi])
        }
      }
      return esegui()
    },
    () => {
      prima = archivio.revisione
      return chiudi('non-disponibile', [
        testi().occupato(Math.round(ATTESA_TURNO_MS / 1000)),
        testi().occupatoPerche,
      ])
    },
  )
}

// ------------------------------------------------------- aiuti per scriverne

/** L'uscita canonica di una scrittura. */
export const SCRITTURA = oggetto({
  revisione: numero({ intero: true, aiuto: () => testi().scrittura.revisione }),
  creato: opzionale(oggetto({ id: testo() }, { aiuto: () => testi().scrittura.creato })),
  messaggio: opzionale(oggetto({
    livello: scelta(['info', 'avviso', 'errore']),
    testo: testo(),
  }, { aiuto: () => testi().scrittura.messaggio })),
  documento: opzionale(testo({ aiuto: () => testi().scrittura.documento })),
  invariato: opzionale(booleano({ aiuto: () => testi().scrittura.invariato })),
}) as Schema<EsitoScrittura>

/**
 * Un'azione del protocollo presa in carico da una procedura senza riscriverne
 * il lavoro: la procedura mette davanti il contratto, il gestore fa il resto.
 */
export function daGestore<I, T extends Azione['tipo']> (
  gestore: Gestore<T>,
  componi: (ingresso: I) => Extract<Azione, { tipo: T }>,
): (ambito: Ambito, ingresso: I) => Promise<EsitoScrittura> {
  return async (ambito, ingresso) => {
    const esito = await gestore(ambito.contesto, componi(ingresso))
    return daEsitoAzione(esito, ambito)
  }
}

/**
 * La risposta di un gestore tradotta in busta: le frasi di rifiuto diventano un
 * `ErroreApi`, `rifiutato` se il gestore non porta un `codice` più preciso
 * (per esempio il «non trovato» di `suVoce`, quando la voce sparisce durante
 * un dialogo).
 */
function daEsitoAzione (esito: EsitoAzione, ambito: Ambito): EsitoScrittura {
  if (!esito.ok) {
    throw new ErroreApi(esito.codice ?? 'rifiutato', esito.errori ?? [testi().nonPossibile])
  }
  return {
    revisione: ambito.contesto.archivio.revisione,
    ...(esito.creato ? { creato: esito.creato } : {}),
    ...(esito.messaggio ? { messaggio: esito.messaggio } : {}),
    ...(esito.documento ? { documento: esito.documento } : {}),
    ...(esito.invariato ? { invariato: true } : {}),
  }
}

/**
 * La busta tradotta nell'`EsitoAzione` che il pannello aspetta, con `codice` e
 * `tracciato`.
 */
export function aEsitoAzione (risultato: Risultato<EsitoScrittura>): EsitoAzione {
  if (!risultato.ok) {
    return {
      ok: false,
      errori: risultato.messaggi,
      codice: risultato.codice,
      tracciato: risultato.tracciato,
    }
  }
  const dati = risultato.dati
  return {
    ok: true,
    tracciato: risultato.tracciato,
    ...(dati.creato ? { creato: dati.creato } : {}),
    ...(dati.messaggio ? { messaggio: dati.messaggio } : {}),
    ...(dati.documento ? { documento: dati.documento } : {}),
    ...(dati.invariato ? { invariato: true } : {}),
  }
}

/** Il ritratto di una procedura, per chi la chiama da fuori. */
export function descrivi (p: ProceduraQualunque): Record<string, unknown> {
  return {
    nome: p.nome,
    versione: p.versione,
    genere: p.genere,
    titolo: detto(p.titolo),
    idempotente: p.idempotente,
    ...(p.azione ? { azione: p.azione } : {}),
    ...(p.collezioni && p.collezioni.length > 0 ? { collezioni: [...p.collezioni] } : {}),
  }
}

// ------------------------------------------------ le due forme più comuni

/** L'azione di un certo tipo, estratta dall'unione del protocollo. */
type Di<T extends Azione['tipo']> = Extract<Azione, { tipo: T }>

/**
 * Quel che `inoltra` torna quando l'ingresso non basta a comporre l'azione: non
 * è una busta, quindi non compila, e il nome del campo è il messaggio d'errore.
 */
interface IngressoNonBastaAllAzione<T> { ingressoNonBastaAllAzione: T }

/**
 * Il tipo di `inoltra(gestori, tipo)`.
 *
 * Il controllo sta nel ritorno e non nel parametro: `esegui` è un metodo, e i
 * parametri dei metodi si confrontano in modo bivariante, quindi un vincolo sul
 * parametro lascerebbe passare uno schema a cui manca un campo dell'azione.
 */
type Inoltro<T extends Azione['tipo']> = <I>(ambito: Ambito, ingresso: I) => EsitoDiInoltro<T, I>

/** La busta se l'ingresso basta a comporre l'azione, altrimenti il promemoria. */
type EsitoDiInoltro<T extends Azione['tipo'], I> =
  [{ tipo: T } & I] extends [Di<T>] ? Promise<EsitoScrittura> : IngressoNonBastaAllAzione<T>

/**
 * Il caso comune di `daGestore`: l'ingresso è l'azione senza `tipo`.
 * `inoltra(registro, 'anno.crea')` equivale a
 * `daGestore(registro['anno.crea'], (i) => ({ tipo: 'anno.crea', ...i }))`.
 * Se l'ingresso va travasato, si usa `daGestore`.
 */
export function inoltra<M extends Parte, T extends keyof M & Azione['tipo']> (
  gestori: M,
  tipo: T,
): Inoltro<T> {
  const gestore = gestori[tipo] as unknown as Gestore<T>
  const inoltro = (ambito: Ambito, ingresso: object): Promise<EsitoScrittura> =>
    daGestore(gestore, (i: object) => ({ tipo, ...i }) as Di<T>)(ambito, ingresso)
  return inoltro as Inoltro<T>
}

/**
 * `definisci` per una scrittura con `genere: 'scrittura'`, `uscita: SCRITTURA`
 * e `versione: 1` già messi; `versione` dichiarata vince.
 */
export function scrittura<I> (
  p: Omit<Procedura<I, EsitoScrittura>, 'genere' | 'uscita' | 'versione'> & { versione?: number },
): Procedura<I, EsitoScrittura> {
  return definisci({ versione: 1, genere: 'scrittura', uscita: SCRITTURA, ...p })
}
