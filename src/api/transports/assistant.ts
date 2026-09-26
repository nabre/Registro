// L'assistente: il registro che risponde a una domanda scritta. Un trasporto
// come il condotto, ma dall'altra parte c'è un modello che tira a indovinare.
//
//   pagina (vista «Assistente»)
//      ↓  postMessage, busta `Conversazione` — vedi `protocol.ts`
//   main process (panels/conversation.ts, per il riquadro e per la finestra)
//      ├→ data/llm.ts → llamaCpp.ts: il .gguf caricato nel processo
//      ←  il modello chiama un attrezzo
//      ├→ questo file: whitelist, convalida, `chiama()`
//      └→ il risultato torna al modello → risposta finale
//
// Sicurezza:
// - Solo letture, più le procedure con `assistente: true` (oggi `vista.apri`,
//   che non tocca l'archivio). `usaAttrezzo()` ricontrolla il genere prima di
//   chiamare, e nessuna impostazione allarga il confine.
// - Genere e deroga li dichiara la procedura (assente = `false`).
// - La pagina non sceglie procedure: manda una domanda e riceve testo.
// - Il modello gira in questo processo: nessuna richiesta di rete.
// - `data/llamaCpp.ts` tiene il giro, ma gli attrezzi li esegue `usaAttrezzo`.
//
// Il contesto del pannello va nell'ultimo turno (`componiBattute`); gli
// attrezzi escono dagli `Schema` delle procedure (`schemaJson()`, poi
// `perGriglia`), con i nomi tradotti in `api/tools.ts`.

import { contestoDelRegistro } from '../../actions/assistant.js'
import type { Archivio } from '../../data/archive.js'
import type {
  ContestoAssistente, IdVisto, RisultatoAssistente, VoceContesto,
} from '../../protocol.js'
import {
  chatta,
  collegamento,
  conMotivo,
  type Attrezzo,
  type Battuta,
  type ChiamataAttrezzo,
  type Collegamento,
} from '../../data/llm.js'
import { daNomeFunzione, nomeFunzione, offribile } from '../tools.js'
import { registraTutte } from '../index.js'
import { chiama, procedura, procedure } from '../core.js'
import { impagina } from '../presentation.js'
import { schemaJson, type Forma } from '../schemas.js'
import { detto } from '../../i18n/index.js'
import { testi } from './assistant.testi.js'

/**
 * Quanti caratteri di un risultato si rimandano al modello.
 *
 * Il contesto è di 12288–16384 token, il catalogo ne prende più di metà:
 * seimila caratteri (~2200 token) lasciano tre letture di fila. Oltre,
 * `node-llama-cpp` cancella le chiamate già fatte e i loro risultati. Il
 * taglio è per voci intere (`accorcia`); per farci stare più righe si
 * accorciano le righe nella procedura.
 */
const LIMITE_RISULTATO = 6000

/**
 * Quante voci di un elenco si provano a mandare al massimo. Il taglio vero lo
 * decide `LIMITE_RISULTATO`; al modello basta vedere i casi estremi, la tabella
 * intera va alla pagina per un'altra strada.
 */
const VOCI_MASSIME = 50

// ------------------------------------------------------------ impostazioni

/**
 * Il collegamento al modello che risponde.
 *
 * Le chiavi le legge `data/llm.ts`, che risolve il nome del modello dentro la
 * cartella dei modelli (un percorso scritto a mano non si apre). Modello
 * dell'OCR e dell'assistente sono indipendenti. Il motivo per cui non si può
 * chiedere niente lo compone `prontezza()` in `data/llm.ts`, e `conMotivo` lo
 * tira fuori dopo un guasto.
 */
function collegamentoAssistente (segnale?: AbortSignal): Collegamento {
  return collegamento('assistente', segnale)
}

/**
 * Come l'assistente è collegato, per chi parla al modello da fuori: il condotto
 * lo pubblica sotto `$attrezzi`, perché la riga di comando non legge le
 * impostazioni. Solo questi campi: il motore contiene funzioni.
 */
export function comeCollegato (): {
  attivo: boolean
  motore: string
  modello: string
  attesaMs: number
} {
  const c = collegamentoAssistente()
  // Il nome del file, non il percorso, che direbbe dove abita chi lavora.
  return {
    attivo: c.attivo,
    motore: c.motore.nome,
    modello: c.modelloChiesto,
    attesaMs: c.attesaMs,
  }
}

// ------------------------------------------------------------- gli attrezzi

// Chi si può offrire lo dice `offribile()` in `api/tools.ts`, per finestra e
// riga di comando. Si usa due volte: `attrezzi()` decide che cosa offrire,
// `usaAttrezzo` che cosa eseguire; la whitelist vera è la seconda.

/**
 * Gli attrezzi che il modello vede. Il `titolo` della procedura, già scritto per
 * chi non conosce il codice, diventa la descrizione.
 */
export function attrezzi (): Attrezzo[] {
  registraTutte()
  return procedure()
    .filter((p) => offribile(p))
    .map((p) => ({
      nome: nomeFunzione(p.nome),
      descrizione: detto(p.titolo),
      ingresso: schemaJson(perIlModello(p.ingresso.forma)),
    }))
}

/**
 * La stessa forma, senza i campi marcati `perAssistente: false` (`soloDaFuori`
 * in `api/schemas.ts`): restano nel contratto, ma il catalogo precede ogni
 * domanda e il contesto è poco. Solo il primo livello: basta per gli ingressi
 * di oggi.
 */
function perIlModello (forma: Forma): Forma {
  if (forma.genere !== 'oggetto') return forma
  const tenuti = Object.entries(forma.campi).filter(([, campo]) => campo.perAssistente !== false)
  return { ...forma, campi: Object.fromEntries(tenuti) }
}

// -------------------------------------------------------------- istruzioni

/**
 * Quel che il modello sa prima di leggere la domanda: la lingua, che cosa è,
 * che non può scrivere, che non deve inventare cifre (una cifra plausibile e
 * sbagliata in un registro si trascrive).
 *
 * La lingua sta in testa e in coda, e `componiBattute` la ricorda davanti
 * all'ultima domanda: i modelli piccoli tornano all'inglese, soprattutto dopo
 * un giro di attrezzi. Le istruzioni sono in `assistant.testi.ts`, una versione
 * per lingua (`lingua()`); cambiarla cambia il prefisso, che `data/llamaCpp.ts`
 * rilegge dal primo token diverso.
 *
 * Esportata per le prove, che non caricano un modello.
 */
export function istruzioni (): string {
  return testi().istruzioni
}

// ------------------------------------------------- gli id già visti

/**
 * Quanti id ci si ricorda di aver visto in una conversazione: la lista precede
 * ogni domanda successiva. Quaranta: una classe con i suoi corsi.
 */
const VISTI_MASSIMI = 40


/**
 * Da quale campo si legge il nome di un id e come si chiama quella cosa
 * (`classeId` accanto a `classe`). Dichiarata, così un campo rinominato fa
 * cadere `tests/api/assistant.test.mjs`. In `nomi` vince il primo che c'è.
 */
const DA_RICORDARE: Record<string, { cosa: string, nomi: readonly string[] }> = {
  allievoId: { cosa: 'allievo', nomi: ['nomeCompleto', 'allievo', 'nome'] },
  classeId: { cosa: 'classe', nomi: ['classe', 'nome'] },
  corsoId: { cosa: 'corso', nomi: ['corso', 'titolo', 'materia'] },
  lezioneId: { cosa: 'ora', nomi: ['titolo', 'argomento', 'data'] },
  materiaId: { cosa: 'materia', nomi: ['materia', 'nome'] },
  pianoId: { cosa: 'piano', nomi: ['piano', 'titolo', 'nome'] },
  // testo-fisso: il valore che la conversazione si porta nei turni; si legge tradotto da `cose`
  valutazioneId: { cosa: 'momento di valutazione', nomi: ['titolo', 'valutazione'] },
}

/**
 * Gli id che una busta porta, con i loro nomi, per ricordarli al turno dopo.
 * Scende in oggetti ed elenchi; un id senza nome leggibile accanto si salta.
 */
export function idVisti (dati: unknown, dentro: IdVisto[] = []): IdVisto[] {
  if (Array.isArray(dati)) {
    for (const voce of dati) idVisti(voce, dentro)
    return dentro
  }
  if (typeof dati !== 'object' || dati === null) return dentro

  const riga = dati as Record<string, unknown>
  for (const [campo, come] of Object.entries(DA_RICORDARE)) {
    const id = riga[campo]
    if (typeof id !== 'string' || id === '') continue
    const nome = come.nomi
      .map((quale) => riga[quale])
      .find((valore): valore is string => typeof valore === 'string' && valore !== '')
    if (nome === undefined) continue
    if (!dentro.some((visto) => visto.id === id)) dentro.push({ id, nome, cosa: come.cosa })
  }
  for (const valore of Object.values(riga)) {
    if (typeof valore === 'object' && valore !== null) idVisti(valore, dentro)
  }
  return dentro
}

/**
 * Gli id già visti, come li legge il modello: servono a non rifare una ricerca
 * per nome, e non sono una risposta. Il testo dice che l'elenco non contiene
 * cifre e non è né completo né aggiornato.
 */
export function ricordaIdVisti (visti: readonly IdVisto[]): string {
  if (visti.length === 0) return ''
  const t = testi()
  const righe = visti.map((v) => `${v.nome} (${t.cose[v.cosa] ?? v.cosa}) = ${v.id}`)
  return [t.ricordaVisti, '', ...righe].join('\n')
}

/**
 * I più recenti, senza doppioni: i nuovi vincono, oltre il tetto si perdono i
 * più lontani.
 */
export function ultimiVisti (prima: readonly IdVisto[], adesso: readonly IdVisto[]): IdVisto[] {
  const tutti = [...adesso, ...prima]
  const tenuti: IdVisto[] = []
  for (const visto of tutti) {
    if (tenuti.length >= VISTI_MASSIMI) break
    if (!tenuti.some((gia) => gia.id === visto.id)) tenuti.push(visto)
  }
  return tenuti
}

// ------------------------------------------------------------- il contesto

/**
 * Le scelte e i filtri, una riga ciascuno, con le alternative:
 * «Corso: DIC4a · Matematica [cor-3] · si può scegliere: …». Così «e la
 * terza?» si risolve senza un'altra lettura.
 *
 * Le alternative hanno un tetto, e il taglio si dice («e altre N»): quando il
 * prompt trabocca, `node-llama-cpp` cancella le chiamate già fatte.
 */
const ALTERNATIVE_MASSIME = 12

function righeDi (voci: readonly VoceContesto[]): string[] {
  const t = testi()
  return voci.map((voce) => {
    // «dentro Classe» davanti al valore: le alternative sono ristrette a quella
    // scelta, non tutte quelle che esistono.
    const gerarchia = voce.dentro ? t.dentro(voce.dentro) : ''
    const scelto = `— ${voce.campo}${gerarchia}: ${voce.valore}${voce.id ? ` [${voce.id}]` : ''}`
    // La scelta attuale non si ripete fra le alternative.
    const altre = (voce.opzioni ?? [])
      .filter((o) => o.valore !== voce.valore)
      .map((o) => `${o.valore}${o.id ? ` [${o.id}]` : ''}`)
    if (altre.length === 0) return scelto
    const quali = voce.dentro ? t.siPuoScegliereDentro(voce.dentro) : t.siPuoScegliere
    // Tagliate, con il conto di quante ne restano.
    const mostrate = altre.slice(0, ALTERNATIVE_MASSIME)
    const coda = altre.length > mostrate.length
      ? t.altreNellaTendina(altre.length - mostrate.length)
      : ''
    return `${scelto} · ${quali}: ${mostrate.join(', ')}${coda}`
  })
}

/**
 * Dove si sta guardando, detto al modello prima della domanda: «quante ore ha
 * perso la 4a» dalla pagina di un corso vuol dire quel corso e quel periodo.
 *
 * Va davanti all'ultima domanda, in una nota delimitata (vedi
 * `componiBattute`): il contesto cambia a ogni clic, e prima del catalogo ne
 * impedirebbe il riuso. Accanto ai nomi ci sono gli id: i nomi per capire la
 * domanda, gli id per gli attrezzi.
 *
 * Esportata per le prove, che non caricano un modello.
 */
/**
 * Quanti id dell'elenco a schermo si scrivono prima di dire «e altri»: bastano
 * per «il terzo della lista» e «questi qui», il conto intero resta accanto.
 * Come `ALTERNATIVE_MASSIME`.
 */
const ID_VISIBILI_MASSIMI = 40

/**
 * La classe del corso scelto nella barra, quando il contesto lo dice: si ricava
 * dalla gerarchia delle tendine (la voce «Corso» ha `dentro: 'Classe'`). Non si
 * deduce altro.
 */
function classeDelCorsoScelto (c: ContestoAssistente): string | null {
  const corsoId = c.riferimenti.corsoId
  if (!corsoId) return null
  const voce = c.scelte.find((v) => v.id === corsoId)
  if (!voce?.dentro) return null
  return c.scelte.find((v) => v.campo === voce.dentro)?.id ?? null
}

export function descriviContesto (c: ContestoAssistente): string {
  const r = c.riferimenti
  const periodo = c.periodo
  const t = testi()
  const righe = [
    t.doveSiGuarda,
    // Niente riga della pagina se chi chiede l'ha spenta: «pagina: non detta»
    // inviterebbe a chiederla.
    ...(c.pagina ? [t.pagina(c.pagina, c.vista)] : []),
    ...(c.scheda ? [t.scheda(c.scheda)] : []),
    ...(c.sezione ? [t.sezione(c.sezione)] : []),
    ...righeDi(c.scelte),
    ...(c.filtri.length > 0 ? [t.filtriAccesi, ...righeDi(c.filtri)] : []),
    // Il periodo in date, non solo il nome: `corso.presenze` vuole `dal` e `al`.
    ...(periodo
      ? [
          periodo.dal && periodo.al
            ? t.periodoDate(periodo.etichetta, periodo.dal, periodo.al)
            : t.periodo(periodo.etichetta),
        ]
      // Niente riga se chi chiede ha spento quella parte nella testata.
      : []),
    t.giorno(c.data, c.oggi),
    ...(c.ricerca ? [t.ricerca(c.ricerca)] : []),
  ]

  // Gli id in due gruppi, con due frasi diverse. Passarli tutti restringerebbe
  // in cascata fino a una busta vuota e a una risposta falsa («nessuna assenza»).
  //
  // `annoId` e `classeId` dicono dove si è e restringono sempre. Gli altri dicono
  // che cosa è aperto, e si passano solo se la domanda li nomina. `semestreId`
  // sta nel secondo gruppo: passato di suo darebbe mezzo anno a chi chiede
  // dell'anno, mentre senza le letture tornano ogni periodo a parte.
  const nomi = (coppie: Array<[string, string | null]>): string[] =>
    coppie.filter(([, valore]) => valore !== null).map(([nome, valore]) => `${nome}=${valore}`)

  const suaClasse = classeDelCorsoScelto(c)
  const dove = nomi([['annoId', r.annoId], ['classeId', r.classeId]])
  const seNominata = [
    ...(r.corsoId
      ? [`corsoId=${r.corsoId}${suaClasse ? t.dellaClasse(suaClasse) : ''}`]
      : []),
    ...nomi([
      ['semestreId', r.semestreId], ['lezioneId', r.lezioneId], ['allievoId', r.allievoId],
      ['pianoId', r.pianoId], ['valutazioneId', r.valutazioneId],
    ]),
  ]

  if (dove.length > 0) {
    righe.push(t.idDove(dove.join(', ')))
  }
  if (seNominata.length > 0) {
    righe.push(...t.idSeNominata(seNominata.join(', ')))
  }
  // Se il corso in cima non è di quella classe, i due id insieme non lasciano
  // passare niente: si dice apertamente. Oggi le due metà vengono dalla stessa
  // funzione e non divergono.
  if (suaClasse && r.classeId && suaClasse !== r.classeId) {
    righe.push(...t.altraClasse(suaClasse, r.classeId))
  }

  if (c.visibili) {
    const { cosa, quanti, ids, troncato } = c.visibili
    // Tagliati, con il conto intero accanto: vedi `ID_VISIBILI_MASSIMI`.
    const mostrati = ids.slice(0, ID_VISIBILI_MASSIMI)
    const restano = troncato || mostrati.length < ids.length
    righe.push(t.aSchermo(quanti, cosa, mostrati.join(', '), restano))
  }

  righe.push(
    '',
    t.cheCosaFarne,
    ...(periodo?.dal && periodo.al
      ? t.periodoDaPassare(periodo.dal, periodo.al)
      : periodo
        ? [t.nessunPeriodo]
        : []),
    t.ristretto,
    // L'unica regola che allarga: una domanda che non nomina un corso va risposta
    // sulla classe intera.
    t.inGenerale,
  )
  return righe.join('\n')
}

// ------------------------------------------------- l'ordine delle battute

/**
 * Le battute per il modello: le istruzioni sole, poi la conversazione, con
 * davanti all'ultima domanda la nota del registro (contesto e id visti).
 *
 * Il catalogo (oltre ottomila token) la libreria lo scrive dopo le battute di
 * sistema, che `data/llamaCpp.ts` unisce in un prompt unico: quel che cambia a
 * ogni domanda deve stare dopo, perché il prefisso [istruzioni + catalogo]
 * resti identico e si riusi. `sfoltisci` non tocca né il sistema né i
 * messaggi di chi chiede.
 *
 * La nota è chiusa fra due righe tra parentesi quadre che dicono chi l'ha
 * scritta: un id della nota non deve sembrare nominato dalla domanda. Quadre e
 * non tag, perché `<…>` somiglia ai segni delle chiamate d'attrezzo. La
 * chiusura ricorda la lingua.
 *
 * La storia ricevuta si copia e non si tocca: la nota va solo sull'ultima
 * battuta, mai nella storia salvata. Se l'ultima battuta non è di chi chiede,
 * o non c'è niente da dire, le battute restano come sono.
 *
 * Esportata per le prove, come `descriviContesto`.
 */
export function componiBattute (
  storia: readonly Battuta[],
  veduta: ContestoAssistente | null | undefined,
  visti: readonly IdVisto[],
): Battuta[] {
  const battute: Battuta[] = storia.map((b) => ({ ...b }))
  const ultima = battute.at(-1)
  // Prima dove si sta guardando, poi la rubrica dei nomi, che vale meno.
  const note = [
    ...(veduta ? [descriviContesto(veduta)] : []),
    ...(visti.length > 0 ? [ricordaIdVisti(visti)] : []),
  ]
  if (ultima?.ruolo === 'utente' && note.length > 0) {
    const t = testi()
    ultima.testo = [
      t.notaApertura,
      '',
      note.join('\n\n'),
      t.notaChiusura,
      '',
      t.domanda(ultima.testo),
    ].join('\n')
  }
  return [{ ruolo: 'sistema', testo: istruzioni() }, ...battute]
}

// ------------------------------------------------------------ l'esecuzione

/**
 * Che cosa dire a un modello che ripete lo stesso errore. Si conta per
 * attrezzo e codice, non per argomenti: dieci id diversi sullo stesso attrezzo
 * sono lo stesso errore.
 *
 * Il consiglio dipende dal codice. «Smetti e rispondi» si dice solo dove
 * riprovare non può funzionare (id o attrezzo inventati), mai su un errore di
 * ingresso, dove il tentativo dopo può riuscire.
 */
function insisti (
  ricadute: Map<string, number> | undefined,
  nome: string,
  codice?: string,
): string {
  if (!ricadute) return ''
  const chiave = `${nome}|${codice ?? 'ignoto'}`
  const quante = (ricadute.get(chiave) ?? 0) + 1
  ricadute.set(chiave, quante)
  if (quante < 2) return ''
  const t = testi()
  const volte = t.giaRisposto(nome, quante)

  // Un campo con la forma sbagliata: il messaggio del nucleo dice quale; si
  // chiede di correggere quello, non di cambiare attrezzo.
  if (codice === 'ingresso-non-valido') {
    return t.correggiCampo(volte)
  }

  // Una scrittura: nessun giro la fa passare.
  if (codice === 'non-permesso') {
    return t.soloLettura(volte)
  }

  // Id o attrezzo inventati: riprovare non può riuscire, dopo quattro giri ci si
  // arrende.
  if (codice === 'non-trovato' || codice === 'procedura-sconosciuta') {
    if (quante < 4) {
      return t.prendiId(volte)
    }
    return t.basta(nome, quante)
  }

  // Gli altri codici: si dice il fatto senza consigliare, per non mandare il
  // modello dalla parte sbagliata.
  return t.cambiaArgomenti(volte)
}

/**
 * Dimentica gli errori di un attrezzo appena una sua chiamata riesce: il conto
 * riconosce i tentativi falliti di fila. Si azzerano tutti i codici di
 * quell'attrezzo.
 */
function dimentica (ricadute: Map<string, number> | undefined, nome: string): void {
  if (!ricadute) return
  for (const chiave of [...ricadute.keys()]) {
    if (chiave.startsWith(`${nome}|`)) ricadute.delete(chiave)
  }
}

/**
 * Gli argomenti di una chiamata, districati: oggetto già decodificato (quasi
 * sempre, per via della griglia) o stringa JSON. Quel che non è JSON torna al
 * modello come errore, non come eccezione.
 *
 * Senza griglia (un `Motore.chatta` diverso, punto di estensione di
 * `data/llm.ts`) si districano anche: testo attorno al JSON, recinto
 * ` ```json `, doppia codifica, oggetto dentro un array.
 */
type Argomenti = { ok: true, valore: unknown } | { ok: false, perche: string }

/**
 * Il JSON dentro una stringa che contiene anche altro. Prima la stringa intera
 * (il caso normale), poi fra la prima e l'ultima graffa.
 */
function jsonDentro (testo: string): { ok: true, valore: unknown } | { ok: false } {
  try {
    return { ok: true, valore: JSON.parse(testo) as unknown }
  } catch {
    // Non è JSON da sola: forse lo è un pezzo.
  }
  const inizio = testo.search(/[{[]/)
  const fine = Math.max(testo.lastIndexOf('}'), testo.lastIndexOf(']'))
  if (inizio >= 0 && fine > inizio) {
    try {
      return { ok: true, valore: JSON.parse(testo.slice(inizio, fine + 1)) as unknown }
    } catch {
      // Nemmeno quello: è un errore da rimandare al modello, non un'eccezione.
    }
  }
  return { ok: false }
}

function argomenti (grezzi: unknown): Argomenti {
  if (grezzi === undefined || grezzi === null) return { ok: true, valore: {} }
  if (typeof grezzi === 'object' && !Array.isArray(grezzi)) return { ok: true, valore: grezzi }
  // Un array di un oggetto solo: lo scrivono i modelli abituati alle chiamate
  // parallele.
  if (Array.isArray(grezzi) && grezzi.length === 1) return argomenti(grezzi[0])
  if (typeof grezzi === 'string') {
    const testo = grezzi.trim()
    if (testo === '') return { ok: true, valore: {} }
    const letto = jsonDentro(testo)
    if (!letto.ok) return { ok: false, perche: testi().nonJson }
    // Stringa dentro stringa o array attorno all'oggetto: si ripassa. Ogni giro
    // toglie uno strato, quindi si ferma.
    if (typeof letto.valore === 'string' || Array.isArray(letto.valore)) {
      return argomenti(letto.valore)
    }
    if (typeof letto.valore !== 'object' || letto.valore === null) {
      return { ok: false, perche: testi().nonOggetto }
    }
    return { ok: true, valore: letto.valore }
  }
  return { ok: false, perche: testi().nonOggetto }
}

/**
 * I `null` che la griglia costringe il modello a scrivere, tolti di mezzo.
 *
 * La griglia di `node-llama-cpp` esige tutte le proprietà dichiarate, e
 * `perGriglia` offre `oneOf: [null, …]` per i campi facoltativi. Il nucleo
 * rifiuterebbe quei `null`, e il modello poi inventerebbe la risposta. La
 * pulizia sta qui perché decidere che cosa è un argomento accettabile è
 * mestiere di chi esegue.
 *
 * I `null` dei campi `nullabile()` (`type: [..., "null"]`) restano: sono un
 * valore. Si scende anche negli oggetti annidati.
 *
 * Esportata per le prove: nessuna lettura oggi ha un campo `nullabile()`, e la
 * metà che conserva i `null` si prova solo così.
 */
export function senzaNulliDiTroppo (valore: unknown, schema: unknown): unknown {
  if (Array.isArray(valore)) {
    const dentro = (schema as { items?: unknown } | null)?.items
    // Anche i `null` dentro un elenco (`stati: [null]`), salvo che le voci
    // ammettano `null`.
    return valore
      .filter((voce) => voce !== null || ammetteNiente(dentro))
      .map((voce) => senzaNulliDiTroppo(voce, dentro))
  }
  if (typeof valore !== 'object' || valore === null) return valore

  const forme = ((schema as { properties?: Record<string, unknown> } | null)?.properties) ?? {}
  const pulito: Record<string, unknown> = {}
  for (const [chiave, dato] of Object.entries(valore as Record<string, unknown>)) {
    const forma = forme[chiave]
    if (dato === null && !ammetteNiente(forma)) continue
    pulito[chiave] = senzaNulliDiTroppo(dato, forma)
  }
  return pulito
}

/**
 * Se per quel campo `null` è un valore: `type` che contiene `"null"`, oppure
 * nessun `type` (`qualunque()`, che accetta tutto). Una forma assente è un
 * campo di troppo, e resta `false`: ci pensa `chiaviEstranee`.
 */
function ammetteNiente (forma: unknown): boolean {
  if (typeof forma !== 'object' || forma === null) return false
  if (!('type' in forma)) return true
  const tipo = (forma as { type?: unknown }).type
  return Array.isArray(tipo) ? tipo.includes('null') : tipo === 'null'
}

/**
 * I campi che la procedura non dichiara, presi prima che `oggetto()` li
 * scarti. Per l'assistente si è severi: un nome sbagliato (`classe` per
 * `classeId`) toglierebbe il filtro in silenzio e la risposta varrebbe per
 * tutto il registro.
 *
 * Non si guarda `additionalProperties` (vale `true` sugli oggetti tolleranti),
 * ma se il nome c'è fra i campi dichiarati. Solo il primo livello, e solo dove
 * la forma dichiara dei campi.
 */
function chiaviEstranee (valore: unknown, schema: unknown): string[] {
  if (typeof valore !== 'object' || valore === null || Array.isArray(valore)) return []
  const forma = schema as { properties?: Record<string, unknown> } | null
  const ammesse = Object.keys(forma?.properties ?? {})
  if (ammesse.length === 0) return []
  return Object.keys(valore).filter((chiave) => !ammesse.includes(chiave))
}

/**
 * Il campo che il modello voleva dire: maiuscola sbagliata (`corsoID`) o nome
 * senza suffisso (`classe` per `classeId`). Nient'altro: un suggerimento a
 * caso è peggio di nessuno.
 */
function forseVolevi (chiave: string, ammesse: readonly string[]): string | null {
  const bassa = chiave.toLowerCase()
  const uguale = ammesse.find((a) => a.toLowerCase() === bassa)
  if (uguale) return uguale
  if (bassa.length < 3) return null
  return ammesse.find((a) => {
    const sua = a.toLowerCase()
    return sua.startsWith(bassa) || bassa.startsWith(sua)
  }) ?? null
}

/** Il rifiuto che spiega, con dentro il nome giusto quando si sa qual è. */
function spiegaEstranee (
  attrezzo: string,
  estranee: readonly string[],
  schema: unknown,
): string {
  const ammesse = Object.keys((schema as { properties?: Record<string, unknown> }).properties ?? {})
  const t = testi()
  const dette = estranee.map((chiave) =>
    t.campoEstraneo(chiave, attrezzo, forseVolevi(chiave, ammesse)))
  return t.campiDellAttrezzo(dette.join('. '), ammesse.join(', '))
}

/**
 * I filtri facoltativi lasciati vuoti (`cerca: ""`, `stati: []`, `{}`), tolti
 * invece che fatti rifiutare: è il rumore della griglia che obbliga ogni campo.
 *
 * Un campo obbligatorio vuoto resta: è un errore del modello e il nucleo lo
 * rifiuta. `0` resta: è un valore (`da: 0`, `soglia: 0`).
 */
function senzaFiltriVuoti (valore: unknown, schema: unknown): unknown {
  if (typeof valore !== 'object' || valore === null || Array.isArray(valore)) return valore
  const forma = schema as { required?: unknown } | null
  const richiesti = Array.isArray(forma?.required) ? (forma.required as string[]) : []
  const pulito: Record<string, unknown> = {}
  for (const [chiave, dato] of Object.entries(valore as Record<string, unknown>)) {
    if (!richiesti.includes(chiave) && senzaNiente(dato)) continue
    pulito[chiave] = dato
  }
  return pulito
}

/** Un valore che c'è e non dice niente: testo vuoto, elenco vuoto, busta vuota. */
function senzaNiente (dato: unknown): boolean {
  if (typeof dato === 'string') return dato.trim() === ''
  if (Array.isArray(dato)) return dato.length === 0
  if (typeof dato === 'object' && dato !== null) return Object.keys(dato).length === 0
  return false
}

/**
 * Quanto può misurare un testo in una busta prima di essere accorciato (es. il
 * PDF in base64 di `modelli.prova`): quel che arriva al modello resta JSON
 * che si apre.
 */
const TESTO_MASSIMO = 1000

/**
 * La busta rimandata al modello, accorciata per voci intere: un JSON tagliato
 * a metà un modello piccolo non lo apre, e risponde «non ho trovato niente».
 *
 * Restano tutti i campi d'insieme (`quante`, `dal`, `al`, soglie…), che valgono
 * su tutte le righe, più le prime N righe, già ordinate dalla procedura. N è il
 * più grande che ci sta.
 */
function accorcia (dati: unknown): string {
  const intero = JSON.stringify(dati) ?? 'null'
  if (intero.length <= LIMITE_RISULTATO) return intero
  // Una busta non oggetto non ha elenchi da accorciare (non capita: `uscita` è
  // un `oggetto()`); meglio intera che spezzata.
  if (typeof dati !== 'object' || dati === null || Array.isArray(dati)) return intero

  const insieme: Record<string, unknown> = {}
  const elenchi: Array<[string, unknown[]]> = []
  for (const [chiave, dato] of Object.entries(dati as Record<string, unknown>)) {
    if (Array.isArray(dato)) elenchi.push([chiave, dato])
    else insieme[chiave] = senzaCoda(dato)
  }

  let ultima = ''
  for (const quante of [VOCI_MASSIME, 30, 20, 15, 10, 6, 4, 2, 1, 0]) {
    ultima = JSON.stringify(componi(insieme, elenchi, quante))
    if (ultima.length <= LIMITE_RISULTATO) return ultima
  }
  return ultima
}

/** Un testo lunghissimo — un PDF in base64 — accorciato dicendolo. */
function senzaCoda (dato: unknown): unknown {
  if (typeof dato !== 'string' || dato.length <= TESTO_MASSIMO) return dato
  return testi().accorciato(dato.slice(0, TESTO_MASSIMO), dato.length)
}

function componi (
  insieme: Record<string, unknown>,
  elenchi: ReadonlyArray<[string, unknown[]]>,
  quante: number,
): Record<string, unknown> {
  const busta: Record<string, unknown> = { ...insieme }
  const conti: Record<string, { mostrate: number, di: number }> = {}
  for (const [chiave, voci] of elenchi) {
    const prime = voci.slice(0, quante)
    busta[chiave] = prime
    if (prime.length < voci.length) conti[chiave] = { mostrate: prime.length, di: voci.length }
  }
  // Il conto sta dentro la busta, così resta un JSON solo. L'avviso consiglia un
  // filtro, non `da`/`quanti`, che il modello non vede (`perIlModello`).
  if (Object.keys(conti).length > 0) {
    busta.perIlModello = { avviso: testi().avvisoAccorciato, elenchi: conti }
  }
  return busta
}

/** Com'è andato un attrezzo: lo mostra la pagina mentre si aspetta. */
export interface AttrezzoUsato {
  /** Il nome della procedura, con il punto: `corso.presenze`. */
  nome: string
  ok: boolean
  /** Il codice dell'API quando non è andata: `non-trovato`, `rifiutato`… */
  codice?: string
  /**
   * Perché non è andata, con le parole del nucleo e il rimedio dentro: è la parte
   * che serve a chi guarda la pagina.
   */
  messaggio?: string
}

/**
 * Esegue quel che il modello ha chiesto e torna il testo da rimandargli.
 *
 * Non solleva mai: attrezzo inesistente, scrittura, argomenti malformati,
 * rifiuto del nucleo diventano testo, così il modello cambia strada.
 *
 * Esportata per le prove: è la riga che decide se un modello può scrivere nel
 * registro.
 */
export async function usaAttrezzo (
  archivio: Archivio,
  chiamata: ChiamataAttrezzo,
  tracciato = 'chat-prova',
  ricadute?: Map<string, number>,
  segnale?: AbortSignal,
): Promise<{
  testo: string
  usato: AttrezzoUsato
  risultato?: RisultatoAssistente
  /** Gli id che la busta portava, con i loro nomi. Vedi `idVisti`. */
  visti?: IdVisto[]
}> {
  // Il nome può mancare (una busta senza `function.name` arriva davvero), e qui
  // non deve diventare un'eccezione.
  const chiesto = typeof chiamata.nome === 'string' ? chiamata.nome : ''
  const t = testi()
  const rifiuta = (nome: string, perche: string, codice?: string) => ({
    testo: t.errore(perche, insisti(ricadute, nome, codice)),
    // `perche` e non `testo`: `testo` contiene anche l'`insisti(...)`, scritto per
    // il modello.
    usato: { nome, ok: false, ...(codice ? { codice } : {}), messaggio: perche },
  })

  if (chiesto === '') return rifiuta(t.senzaNome, t.nessunAttrezzo)

  const nome = daNomeFunzione(chiesto)
  if (!nome) {
    return rifiuta(
      // Con il punto, come `AttrezzoUsato.nome`: nella pagina `presenze_riga` sembrerebbe
      // un guasto del registro. Nel messaggio resta come è arrivato: è il nome da
      // smettere di usare.
      chiesto.replace(/_/g, '.'),
      t.attrezzoInesistente(chiesto),
      'procedura-sconosciuta',
    )
  }

  // La whitelist vera è questa riga, non l'elenco mandato.
  const p = procedura(nome)
  if (!p || !offribile(p)) {
    // Due rifiuti, due frasi: una lettura esclusa con `perAssistente: false` non
    // va descritta come una che «cambia il registro».
    const lettura = p?.genere === 'lettura'
    return rifiuta(
      nome,
      lettura ? t.nonDellAssistente(nome) : t.cambiaIlRegistro(nome),
      'non-permesso',
    )
  }

  const letti = argomenti(chiamata.argomenti)
  if (!letti.ok) return rifiuta(nome, letti.perche, 'ingresso-non-valido')

  const forma = schemaJson(p.ingresso.forma)

  // Prima i `null` imposti dalla griglia (`senzaNulliDiTroppo`), poi i filtri
  // lasciati vuoti in altro modo (`senzaFiltriVuoti`): altrimenti il nucleo
  // rifiuta per filtri che nessuno ha chiesto.
  const puliti = senzaFiltriVuoti(senzaNulliDiTroppo(letti.valore, forma), forma)

  // Poi i campi mai dichiarati, qui: più in basso `oggetto()` li scarterebbe e
  // la chiamata riuscirebbe senza il filtro creduto. Vedi `chiaviEstranee`.
  const estranee = chiaviEstranee(puliti, forma)
  if (estranee.length > 0) {
    return rifiuta(nome, spiegaEstranee(chiesto, estranee, forma), 'ingresso-non-valido')
  }

  // Chi ha chiuso o annullato non aspetta più: `chiama()` non prende il segnale,
  // quindi ci si ferma qui.
  if (segnale?.aborted) {
    return rifiuta(nome, t.fermata, 'annullato')
  }

  const esito = await chiama(archivio, nome, puliti, {
    origine: 'assistente',
    // Lo stesso tracciato per tutta la conversazione, per ritrovarne le chiamate
    // nel giornale.
    tracciato,
  })

  if (!esito.ok) {
    return rifiuta(nome, esito.messaggi.join(' '), esito.codice)
  }

  // Riuscita: gli errori di prima di questo attrezzo non contano più (`dimentica`).
  dimentica(ricadute, nome)

  // La busta va al modello in JSON, per ragionare, e alla pagina impaginata
  // (`api/presentation.ts`): i numeri non passano dal modello.
  const risultato = impagina(p, esito.dati) ?? undefined

  // Per voci intere: al modello arriva sempre un JSON che si apre (`accorcia`).
  const testo = accorcia(esito.dati)

  // Gli id per il turno dopo, da `esito.dati` e non dal testo accorciato: la
  // memoria non dipende da dove cade il taglio.
  const visti = idVisti(esito.dati)

  return {
    testo,
    usato: { nome, ok: true },
    ...(risultato ? { risultato } : {}),
    ...(visti.length > 0 ? { visti } : {}),
  }
}

// ------------------------------------------------------------ il giro vero

/** Che cosa succede mentre si aspetta: lo riceve la pagina, uno per volta. */
type Evento =
  | { genere: 'attrezzo', attrezzo: AttrezzoUsato }
  /** Quel che quella procedura ha letto, già impaginato: lo disegna la pagina. */
  | { genere: 'risultato', risultato: RisultatoAssistente }
  /**
   * Gli attrezzi sono finiti: la risposta usa quel che si era già letto.
   *
   * Il tetto (dieci chiamate) sta in `data/llamaCpp.ts`, che lo segnala con
   * `Passo.esaurito` a ogni chiamata rifiutata; qui diventa un evento solo, alla
   * prima. `panels/conversation.ts` lo inoltra e la pagina lo scrive sotto la
   * risposta, così chi legge sa che la risposta può essere parziale.
   */
  | { genere: 'limite', chiamate: number }
  | { genere: 'testo', testo: string }

interface OpzioniConversazione {
  /** La conversazione fin qui: alterna utente e assistente, senza le istruzioni. */
  storia: readonly Battuta[]
  /**
   * Gli id già incontrati in questa conversazione, con i loro nomi: li tiene chi
   * chiede e li rimanda a ogni domanda, per non rifare ricerche per nome. Mai
   * cifre: vedi `IdVisto`.
   */
  visti?: readonly IdVisto[]
  /**
   * Dove si sta guardando, passato a mano: serve alle prove. Nel programma si
   * legge l'ultimo contesto mandato dal pannello.
   */
  contesto?: ContestoAssistente | null
  /** Da fuori, per fermare: lo preme chi chiude la pagina o annulla. */
  segnale?: AbortSignal
  /** Che cosa sta succedendo, mentre succede. */
  al?: (evento: Evento) => void
}

/**
 * Una domanda, i suoi giri di attrezzi e la risposta.
 *
 * Il giro lo tiene il motore (`data/llamaCpp.ts`); questo file gli passa gli
 * attrezzi offribili e la funzione che li esegue, `usaAttrezzo`, dove sta il
 * controllo.
 *
 * Solleva solo per problemi del modello (spento, mai scaricato, attesa
 * scaduta); un attrezzo che fallisce è parte della conversazione.
 */
export async function conversa (
  archivio: Archivio,
  opzioni: OpzioniConversazione,
): Promise<{
  testo: string
  attrezzi: AttrezzoUsato[]
  risultati: RisultatoAssistente[]
  /**
   * Vero se il motore ha finito gli attrezzi prima della risposta, che quindi va
   * detta parziale. Vedi l'evento `limite`.
   */
  esaurito: boolean
  /**
   * Gli id incontrati leggendo, uniti a quelli già noti: chi chiede li rimanda
   * con la domanda dopo. Vedi `IdVisto`.
   */
  visti: IdVisto[]
}> {
  const llm = collegamentoAssistente(opzioni.segnale)
  if (!llm.attivo) {
    throw new Error(testi().spento)
  }

  const usati: AttrezzoUsato[] = []
  const letti: RisultatoAssistente[] = []
  // Gli id che si sapevano entrando, più quelli che si imparano leggendo.
  let imparati = ultimiVisti(opzioni.visti ?? [], [])
  let esaurito = false
  // Quante volte lo stesso attrezzo ha fallito allo stesso modo, per
  // conversazione. Vedi `insisti`.
  const ricadute = new Map<string, number>()
  // testo-fisso: il tracciato che ritrova nel giornale le chiamate di un giro
  const tracciato = `chat-${Date.now().toString(36)}`

  // Il contesto dell'ultima battuta, non di quando la conversazione è
  // cominciata: chi chiede può aver cambiato corso nel frattempo.
  // `!== undefined` e non `??`: `null` vuol dire «l'interruttore è spento, non
  // dire niente». `undefined` resta per la finestra staccata, che non compone
  // una veduta.
  const veduta = opzioni.contesto !== undefined ? opzioni.contesto : contestoDelRegistro()

  const testo = await conMotivo(llm, () => chatta(llm, {
    // Istruzioni sole in testa, contesto e id visti davanti all'ultima domanda:
    // vedi `componiBattute`.
    battute: componiBattute(opzioni.storia, veduta, imparati),
    attrezzi: attrezzi(),
    // Del racconto del motore interessa solo il passo `esaurito`. Il motore marca
    // così ogni chiamata rifiutata: l'evento `limite` parte alla prima.
    al: (passo) => {
      if (!('esaurito' in passo) || passo.esaurito !== true) return
      if (esaurito) return
      esaurito = true
      opzioni.al?.({ genere: 'limite', chiamate: usati.length })
    },
    esegui: async (chiamata) => {
      const { testo, usato, risultato, visti } = await usaAttrezzo(
        archivio, chiamata, tracciato, ricadute, opzioni.segnale,
      )
      usati.push(usato)
      if (visti) imparati = ultimiVisti(imparati, visti)
      if (risultato) {
        letti.push(risultato)
        // Appena letto, non con la risposta: la parte lenta è il modello che scrive.
        opzioni.al?.({ genere: 'risultato', risultato })
      }
      // Mentre si aspetta si mostrano le procedure aperte: distingue un'attesa da
      // una macchina ferma.
      opzioni.al?.({ genere: 'attrezzo', attrezzo: usato })
      return testo
    },
  }))

  const risposta = testo.trim()
  opzioni.al?.({ genere: 'testo', testo: risposta })
  return {
    testo: risposta,
    attrezzi: usati,
    risultati: ultimiPerProcedura(letti),
    esaurito,
    visti: imparati,
  }
}

/**
 * Un risultato per procedura, e vince l'ultimo: un modello che richiama la
 * stessa procedura con argomenti corretti non deve lasciare sotto la risposta
 * anche la tabella vuota del primo tentativo.
 *
 * Il prezzo: chi confronta due corsi con due chiamate della stessa procedura
 * vede solo la seconda tabella. Vale su quel che resta nel turno: gli eventi
 * già partiti non si richiamano.
 *
 * Esportata per le prove, ma non è ancora nell'elenco di `tests/helpers/api.ts`.
 */
function ultimiPerProcedura (
  letti: readonly RisultatoAssistente[],
): RisultatoAssistente[] {
  const ultimi = new Map<string, RisultatoAssistente>()
  for (const risultato of letti) ultimi.set(risultato.procedura, risultato)
  return [...ultimi.values()]
}
