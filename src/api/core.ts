// Il nucleo: prende un nome, un ingresso e un archivio, e torna una busta.
//
// È l'unico punto in cui una chiamata viene convalidata, eseguita, cronometrata
// e scritta nel giornale — e per questo è l'unico punto che tutti i trasporti
// condividono. Il pannello, il widget, il menu nativo e la riga di comando non
// si assomigliano in niente: uno parla per `postMessage`, uno per un condotto,
// uno chiama una funzione. Da qui in poi diventano la stessa cosa.
//
// Quel che il nucleo *non* fa, ed è voluto: non spinge lo stato al pannello e
// non rigenera PDF. Quelle due cose sono del pannello (`panels/panel.ts`)
// e del centralino (`actions.ts`), perché dipendono da chi ha chiamato — una
// riga di comando che corregge un voto non ha un webview da aggiornare — e
// metterle qui vorrebbe dire far finta che ci sia sempre una finestra aperta.

import type { Archivio } from '../data/archive.js'
import type { Azione } from '../protocol.js'
import { contestoDi, type EsitoAzione, type Gestore } from '../actions/context.js'
import { identificatore } from '../domain/identifiers.js'
import {
  ErroreApi,
  VERSIONE_API,
  type Ambito,
  type Codice,
  type EsitoScrittura,
  type Origine,
  type ProceduraQualunque,
  type Risultato,
  type Spia,
  type VoceGiornale,
} from './contract.js'
import { booleano, convalida, numero, oggetto, opzionale, scelta, testo, type Schema } from './schemas.js'

// ------------------------------------------------------------------ l'elenco

const PROCEDURE = new Map<string, ProceduraQualunque>()

/**
 * Mette delle procedure nell'elenco. **O tutte, o nessuna.**
 *
 * Due procedure con lo stesso nome sono un errore che si vede subito e non a
 * caso: senza questo controllo, un file caricato due volte — cosa che i
 * bundle separati delle prove fanno davvero — sovrascriverebbe la procedura
 * buona con una copia, e nessuno se ne accorgerebbe finché non cambia una
 * delle due. Il confronto è per **identità**, ed è il più onesto che ci sia:
 * rimettere nell'elenco lo stesso oggetto è una ripetizione innocua, mettercene
 * un altro con lo stesso nome è una sostituzione.
 *
 * I controlli si fanno **tutti prima** di inserire, e questa non è eleganza.
 * Il `throw` stava in mezzo al ciclo: le procedure prima del duplicato
 * restavano registrate, quelle dopo no. E `registraTutte()` la chiamano
 * `transports/conduit.ts`, `bridge.ts` quando costruisce i gestori e `bridge.ts`
 * quando elenca le azioni sotto contratto — quindi un'eccezione da lì lasciava
 * la mappa **popolata a metà**: il registro partiva con un sottoinsieme
 * arbitrario di azioni sotto contratto, le altre cadevano sul gestore vecchio,
 * e nessuno lo diceva. Meglio non partire che partire per metà.
 *
 * Il nome che comincia con `$` è vietato qui e non più tardi perché più tardi
 * non se ne accorgerebbe nessuno: `transports/conduit.ts` intercetta ogni
 * metodo `$…` prima di smistare, quindi una procedura chiamata così comparirebbe
 * in `$elenco` e in `resources/tools.json` e risponderebbe **sempre**
 * `procedura-sconosciuta` — cioè sarebbe visibile e irraggiungibile insieme.
 */
export function registra (...procedure: Array<ProceduraQualunque>): void {
  const nuove = new Map<string, ProceduraQualunque>()
  for (const p of procedure) {
    if (p.nome.startsWith('$')) {
      throw new Error(`«${p.nome}» comincia con «$», che il condotto tiene per sé.`)
    }
    // Anche contro quel che sta per entrare in questa stessa chiamata: due
    // omonime dentro lo stesso `registraTutte()` sono il caso normale di un
    // indice sbagliato, e guardare solo la mappa non le vedrebbe.
    const gia = PROCEDURE.get(p.nome) ?? nuove.get(p.nome)
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
 * Sta a guardare ogni chiamata.
 *
 * L'osservabilità che mancava: fino a qui gli errori finivano in
 * `console.error` e un toast, e di quel che era andato *bene* non restava
 * niente. Una spia riceve nome, origine, durata ed esito — mai l'ingresso,
 * che contiene nomi di persone.
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
 * Esiste per **una** cosa, e non è una scorciatoia per scriverne altre: il
 * completamento dell'OCR in coda (`data/sorter.ts`). Quel lavoro non può
 * stare dentro una chiamata — dura minuti, e una chiamata che tiene la fila per
 * minuti è la fila che non funziona più — ma scrive davvero nel registro, e
 * finora lo faceva in silenzio: il giornale non ne sapeva niente, e alla domanda
 * «che cosa ha cambiato questa pagina alle 10:32» non c'era risposta. Raccontarlo
 * non lo mette sotto contratto, ma smette di lasciare un buco muto.
 *
 * Non è una porta per scrivere nell'archivio fuori dal contratto: quel che
 * cambia il registro passa da `chiama()`, e quel che non ci può passare almeno
 * si racconta.
 */
export function annota (voce: VoceGiornale): void {
  racconta(voce)
}

// ------------------------------------------------------------------ chiamata

/**
 * Un rifiuto riconosciuto **per struttura**, non per prototipo.
 *
 * `guasto instanceof ErroreApi` era fragile proprio nel caso che `registra()`
 * dichiara ricorrente: «un file caricato due volte — cosa che i bundle separati
 * delle prove fanno davvero». Due istanze del modulo vogliono dire due classi
 * `ErroreApi` diverse, e un `errore.nonTrovato(...)` costruito con l'una e
 * controllato con l'altra non è `instanceof` niente: diventava `codice:
 * 'interno'`, cioè **si perdeva il rimedio** — la frase «le classi dell'anno le
 * elenca …» che `contract.ts` motiva per fermare i giri a vuoto del modello —
 * e al suo posto usciva «guasto interno del registro», che non dice come si fa.
 *
 * Un `Error` con un `codice` stringa e dei `messaggi` in un array è un
 * `ErroreApi` a tutti gli effetti che contino qui, e nessun errore di libreria
 * ha per caso quei due campi insieme.
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
 * Senza un tetto, la prima cosa che il docente nota della fila unica è che
 * l'agenda ha smesso di funzionare. Davanti ci possono stare due scritture che
 * durano quanto vogliono: la geocodifica degli indirizzi tiene una chiamata
 * sola fino a dieci minuti — sessanta indirizzi, una pausa di un secondo per
 * rispetto di Nominatim, dieci secondi d'attesa per ciascuno — e `documento.apri`
 * apre un dialogo di sistema modale, che resta aperto finché qualcuno non
 * risponde, cioè anche per sempre.
 *
 * Trenta secondi perché sono più di qualunque scrittura che finisca da sé — un
 * import, una tornata di PDF, una spedizione di classe — e meno del tempo che
 * serve a credere che il registro sia morto. Chi rinuncia riceve una frase che
 * dice **perché**, e la rinuncia finisce nel giornale come ogni altro rifiuto.
 */
const ATTESA_TURNO_MS = 30_000

/** L'ultima scrittura messa in fila: chi arriva si accoda a lei. */
let fila: Promise<void> = Promise.resolve()

/** Il segno che il turno non è arrivato in tempo: un simbolo non lo torna nessuno. */
const SCADUTO = Symbol('turno scaduto')

/**
 * Una scrittura alla volta, su tutto il registro.
 *
 * Fin qui le code erano sei e non si parlavano — il pannello, una per
 * connessione del condotto, il disco, i PDF, i depositi, l'OCR — e i punti che
 * chiamano `chiama()` erano cinque, di cui uno, il widget dell'agenda, senza
 * nessuna coda. La promessa scritta nel condotto («due scritture avviate insieme
 * sullo stesso archivio si coprirebbero a vicenda») valeva solo dentro una
 * connessione. Il rischio è ristretto ma reale: i gestori che aspettano fra la
 * lettura e la scrittura — `smistamento`, `docenteClasse`, `registro`,
 * `consegne` — lasciano passare l'altra scrittura in mezzo a un dialogo di
 * sistema o a un giro di posta, e l'ultima `modifica()` vince in silenzio.
 *
 * Una fila sola non può stallare perché **nessun gestore rientra in `chiama()`**:
 * non c'è una sola chiamata a `chiama` sotto `src/actions/` o
 * `src/api/procedures/`, e l'unico import verso `pannelli/` —
 * `actions/projection.ts` → `panels/projection.ts` — non porta lì. È il
 * presupposto su cui poggia tutto, e `tests/api/queue.test.mjs` lo prova dal di
 * dentro invece di fidarsi di una lettura.
 *
 * La forma è quella di `Archivio.inFila` e della coda del condotto, copiata e
 * non reinventata: quel che la fila aspetta è la **fine**, non l'esito, e per
 * questo una scrittura che solleva non avvelena quelle dietro.
 */
async function inFila<T> (lavoro: () => Promise<T>, rinuncia: () => T): Promise<T> {
  const davanti = fila
  let finito!: () => void
  const mio = new Promise<void>((risolvi) => {
    finito = risolvi
  })
  // Chi arriva dopo aspetta **due** cose: che la fila di prima sia arrivata in
  // fondo, e che questa scrittura abbia finito. La seconda si scioglie anche
  // quando si rinuncia, e deve — chi rinuncia non esegue, quindi non c'è più
  // niente da aspettare per lui. La prima resta comunque, quindi una rinuncia
  // non fa passare avanti nessuno mentre davanti si sta ancora scrivendo.
  fila = davanti.then(() => mio, () => mio)

  let sveglia: ReturnType<typeof setTimeout> | undefined
  const tetto = new Promise<typeof SCADUTO>((risolvi) => {
    sveglia = setTimeout(() => risolvi(SCADUTO), ATTESA_TURNO_MS)
    // Un timer che tiene sveglio il processo per una scrittura che non è
    // ancora cominciata è esattamente il contrario di quel che serve allo
    // spegnimento.
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
 *
 * L'ordine è quello e conta: si convalida prima di toccare l'archivio, perché
 * la regola del registro — «si valida prima, e se non passa non si scrive
 * niente» — deve valere anche per chi arriva da fuori dal pannello.
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
    // Senza `genere`, e non per pigrizia: qui c'era `'lettura'` messo per
    // comodità, perché il campo era obbligatorio e una lettura pareva il valore
    // più innocuo. Il risultato era che chi contava le chiamate per genere
    // contava i **nomi inventati** fra le letture — e un nome inventato è il
    // primo modo in cui un modello sbaglia, cioè esattamente la riga che si
    // andava a cercare nel giornale. Un campo che manca si vede; un valore di
    // comodo no.
    const voce: VoceGiornale = {
      tracciato, procedura: nome, origine,
      durataMs: 0, ok: false, codice: 'procedura-sconosciuta', modifiche: 0,
    }
    racconta(voce)
    return {
      ok: false, api: VERSIONE_API, procedura: nome, tracciato,
      codice: 'procedura-sconosciuta',
      messaggi: [`Il registro non conosce «${nome}».`],
    }
  }

  // `let` e non `const`: una scrittura che aspetta il proprio turno lo rilegge
  // quando tocca a lei, o conterebbe fra le proprie le modifiche di chi le
  // stava davanti. Vedi il ramo in fondo.
  let prima = archivio.revisione
  /**
   * La busta fallita, con dentro quel che si sa già.
   *
   * `modifiche` e `revisione` viaggiano **anche quando non è andata**, e
   * costano zero: il primo è già calcolato per il giornale, due righe sopra.
   * Servono per il caso che questo file ha lasciato aperto più a lungo di
   * tutti — la convalida dell'uscita gira *dopo* `esegui`, quindi una scrittura
   * che è già avvenuta può tornare indietro come `codice: 'interno'`. `interno`
   * non è un rifiuto, e uno script scritto bene ritenta: con `modifiche > 0`
   * accanto, sa invece che qualcosa è già successo e che non deve ritentare
   * alla cieca — trenta delle scritture non sono idempotenti.
   *
   * `versione` c'è perché chi riceve `ingresso-non-valido` è l'unico che abbia
   * davvero bisogno di sapere con quale versione della procedura sta parlando:
   * prima stava solo sul ramo riuscito, cioè arrivava quando non serviva più.
   */
  const chiudi = (codice: Codice, messaggi: string[], campo?: string): Risultato<U> => {
    const modifiche = archivio.revisione - prima
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

  // Quale documento e quale anno, **prima** di mettersi in fila: se al turno
  // non sono più questi, questa scrittura parlava di un registro che adesso non
  // è aperto. È la stessa guardia di `actions/reports.ts`, e per lo stesso
  // motivo — `leggiTutto` non aggiorna il registro, lo sostituisce.
  const documentoAtteso = archivio.documentoAperto?.toString() ?? null
  const annoAtteso = archivio.registro.annoCorrenteId

  const esegui = async (): Promise<Risultato<U>> => {
    // L'origine va anche nel contesto, non solo nella busta del giornale.
    // Passandola solo di lato, `ambito.origine` e `ambito.contesto.origine`
    // dicevano due cose diverse: la prima la verità, la seconda `undefined` per
    // chiunque non arrivasse dal ponte — cioè il widget dell'agenda, il condotto
    // e la riga di comando, che sono esattamente i chiamanti per cui il campo è
    // stato inventato (vedi `Origine` in `contract.ts`).
    const ambito: Ambito = { contesto: contestoDi(archivio, origine), tracciato, origine }

    let dati: unknown
    try {
      dati = await (p.esegui as (a: Ambito, i: unknown) => unknown)(ambito, controllo.value)
    } catch (guasto) {
      const rifiuto = comeErroreApi(guasto)
      if (rifiuto) return chiudi(rifiuto.codice, rifiuto.messaggi, rifiuto.campo)
      // Il guasto imprevisto si racconta per intero a chi guarda la console, e
      // in una riga sola a chi ha premuto: lo stack non è una cosa da mostrare
      // a un docente in mezzo a un appello.
      //
      // **E il messaggio dell'eccezione non esce di qui.** Usciva, e i percorsi
      // dell'archivio sono costruiti con la classe e il cognome-nome
      // dell'allievo — `archivio/DIC4a/Rossi Mario/…pdf`: una `esportazioni.mostra`
      // fallita mostrava al docente, e scriveva in console, il nome di una
      // persona dentro un percorso. Il condotto questa pulizia la faceva gia' per
      // conto suo, con il motivo scritto accanto; il pannello e l'agenda no, e
      // sono le due strade da cui passa quasi tutto. Adesso si fa una volta
      // sola, per tutti i trasporti, e il tracciato lega la riga mostrata al
      // racconto completo che sta nella console.
      //
      // **La pulizia vale per il guasto imprevisto e basta.** Un rifiuto che una
      // procedura scrive apposta — `errore.rifiuta(`Il file ${percorso} esiste
      // già.`)` — passa di qui intero, e deve: le sue frasi sono state scritte
      // per essere lette. Chi le scrive è il solo a poter decidere che cosa
      // nominare, e `tests/api/procedures.test.mjs` guarda che nessuna nomini un
      // percorso. Il condotto promette in testa al file che «quel che esce di qui
      // non nomina nessuno»: è vero per il trasporto, che questa riga la rifà per
      // conto suo, e non lo è per il livello sopra.
      console.error(`[api] ${nome} (${tracciato})`, guasto)
      return chiudi('interno', [`Guasto interno del registro. Nel giornale: ${tracciato}.`])
    }

    const uscita = convalida(p.uscita, dati)
    if (uscita.issues) {
      // La procedura ha risposto qualcosa di diverso da quel che dichiara. È un
      // difetto del registro, non di chi ha chiamato, e si dice invece di
      // lasciar passare una busta che non rispetta il proprio contratto.
      console.error(`[api] ${nome} non rispetta la propria uscita`, uscita.issues)
      return chiudi('interno', ['La procedura ha risposto in una forma che non è quella dichiarata.'])
    }

    racconta({
      tracciato, procedura: nome, origine, genere: p.genere,
      durataMs: Date.now() - partenza, ok: true,
      modifiche: archivio.revisione - prima,
    })
    return {
      ok: true, api: VERSIONE_API, procedura: nome, versione: p.versione, tracciato,
      dati: uscita.value as U,
    }
  }

  // **Le letture saltano la corsia, e devono.** Una lettura è sincrona sul
  // registro in memoria, e metterla in fila dietro venti PDF vorrebbe dire una
  // pagina ferma per niente. È la stessa proprietà che ADR-29 dichiara per il
  // canale delle domande, e che `tests/api/writes.test.mjs` sorveglia
  // leggendo il sorgente del pannello.
  if (p.genere !== 'scrittura') return esegui()

  return inFila<Risultato<U>>(
    async () => {
      // Il conto delle modifiche riparte da adesso: quel che è successo mentre
      // si aspettava è di altri, e contarlo qui direbbe a chi ritenta che
      // questa chiamata ha già scritto.
      prima = archivio.revisione
      // Solo per chi tocca le collezioni del documento: `documento.apri`,
      // `documento.chiudi` e le altre che dichiarano `collezioni: []` **sono**
      // il cambio di documento, e rifiutarle perché il documento è cambiato
      // vorrebbe dire rifiutare la seconda di due aperture di fila.
      if (p.collezioni && p.collezioni.length > 0) {
        const documentoOra = archivio.documentoAperto?.toString() ?? null
        if (documentoOra !== documentoAtteso || archivio.registro.annoCorrenteId !== annoAtteso) {
          return chiudi('conflitto', [
            'Il documento aperto è cambiato mentre questa scrittura aspettava il proprio turno: non è stata eseguita.',
            'Si rilegge quel che c’è adesso e, se serve ancora, si richiede.',
          ])
        }
      }
      return esegui()
    },
    () => {
      prima = archivio.revisione
      return chiudi('non-disponibile', [
        `Il registro era occupato: questa scrittura ha aspettato il proprio turno ${
          Math.round(ATTESA_TURNO_MS / 1000)} secondi e ha rinunciato, senza scrivere niente.`,
        'Davanti c’è una scrittura lunga — la ricerca degli indirizzi sulla mappa arriva a dieci ' +
          'minuti, e un dialogo di sistema resta aperto finché non gli si risponde. Si riprova ' +
          'quando quella ha finito.',
      ])
    },
  )
}

// ------------------------------------------------------- aiuti per scriverne

/** L'uscita canonica di una scrittura. */
export const SCRITTURA = oggetto({
  revisione: numero({ intero: true, aiuto: 'Il contatore di modifiche dell’archivio dopo la scrittura' }),
  creato: opzionale(oggetto({ id: testo() }, { aiuto: 'Quel che è nato, se è nato qualcosa' })),
  messaggio: opzionale(oggetto({
    livello: scelta(['info', 'avviso', 'errore']),
    testo: testo(),
  }, { aiuto: 'Una frase per chi ha premuto' })),
  documento: opzionale(testo({ aiuto: 'Il documento appena scritto, relativo alla cartella dei dati' })),
  invariato: opzionale(booleano({ aiuto: 'Riuscita senza toccare il registro' })),
}) as Schema<EsitoScrittura>

/**
 * Un'azione del protocollo, presa in carico da una procedura senza riscriverne
 * il lavoro.
 *
 * È il modo in cui tutte le azioni del protocollo sono passate di qui una per
 * volta invece che tutte insieme: la procedura mette davanti il contratto — la
 * forma dell'ingresso, il codice d'errore, il giornale — e il gestore di
 * sempre fa quel che ha sempre fatto. Nessuna logica si sposta, quindi nessuna
 * prova esistente cambia significato.
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
 * La risposta di un gestore tradotta in busta.
 *
 * Un gestore che rifiuta torna delle frasi e basta; qui diventano un
 * `ErroreApi`. Il codice predefinito è `rifiutato`, che è quel che un rifiuto
 * di validazione è: una procedura che sa distinguere meglio — «non c'è più» da
 * «non si può» — lancia il proprio errore *prima* di arrivare qui, ed è
 * quello che fanno le procedure dell'appello.
 *
 * Ma fra la guardia e la scrittura, per le procedure che aspettano una persona
 * davanti a un dialogo di sistema, passano minuti: la voce può sparire in
 * mezzo, e allora il «non trovato» lo scopre `suVoce` e non la guardia. Da
 * quando l'esito porta un `codice`, quel che il gestore sa non si perde più
 * qui in mezzo.
 */
export function daEsitoAzione (esito: EsitoAzione, ambito: Ambito): EsitoScrittura {
  if (!esito.ok) {
    throw new ErroreApi(esito.codice ?? 'rifiutato', esito.errori ?? ['Non è stato possibile.'])
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
 * La busta tradotta indietro in quel che il pannello aspetta già oggi.
 *
 * Il `codice` e il `tracciato` venivano buttati proprio qui, e questa è la
 * strada che fa il 99% del traffico: le 141 scritture chiamate dal pannello
 * ricevevano `errori: string[]` e basta, cioè esattamente quel che ricevevano
 * prima che il contratto esistesse. Il codice serve a chi deve decidere se
 * ritentare; il tracciato è quel che si cita quando si chiede «che cosa è
 * successo alle 10:32».
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
    titolo: p.titolo,
    idempotente: p.idempotente,
    ...(p.azione ? { azione: p.azione } : {}),
    ...(p.collezioni && p.collezioni.length > 0 ? { collezioni: [...p.collezioni] } : {}),
  }
}
