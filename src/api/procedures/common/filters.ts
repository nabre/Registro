// I filtri che le letture si dividono: il periodo, la ricerca, la pagina.
//
// Ogni lettura nasceva con i suoi. `ore.elenco` aveva `dal` e `al`, `persone.cerca`
// aveva `cerca`, `corso.presenze` aveva un periodo scritto in un altro modo, e
// nessuna aveva una pagina: chi chiedeva un anno intero riceveva le prime
// duecento ore e un `troncato: true` senza nessuna strada per avere le altre.
// Tre difetti diversi con la stessa radice — un filtro scritto ogni volta è un
// filtro che ogni volta si comporta un po' diversamente.
//
// Qui stanno una volta sola: i pezzi di schema che una lettura mette nel
// proprio ingresso, e le funzioni che li applicano. **Modulari**: una lettura
// prende quelli che le servono — `...periodo()`, `...ricerca(…)`, `...pagina()`
// — e nessuna li riscrive. Chi li prende si comporta come le altre, e chi
// legge una busta di questa API trova gli stessi nomi dappertutto.
//
// La regola che tiene insieme le tre: **un filtro si deve poter togliere**, e
// una busta deve sempre dire su che cosa ha risposto. Vedi il § delle letture
// in `docs/API.md`.

import { annoInUso, estremiAnno } from '../../../domain/years.js'
import { limita } from '../../../domain/calculations.js'
import { annoDellaClasse } from '../../../domain/courses.js'
import { SCUOLA } from '../../../domain/lexicon.js'
import { corrispondeAlla, normalizzaTesto, pezziDiRicerca } from '../../../domain/text.js'
import type { Classe, Registro } from '../../../domain/models.js'
import { errore } from '../../contract.js'
import {
  booleano,
  elenco,
  identificatore,
  iso,
  nullabile,
  numero,
  opzionale,
  scelta,
  soloDaFuori,
  testo,
  type SchemaOpzionale,
} from '../../schemas.js'

// ------------------------------------------------------------------ il periodo

/**
 * `dal` e `al`, da mettere nell'ingresso di una lettura che guarda nel tempo.
 *
 * Tutti e due opzionali, sempre: senza, si intende l'anno in uso. Un periodo
 * obbligatorio costringe chi chiede a inventarsi due date per avere «tutto», e
 * due date inventate sono il modo più facile di tagliare fuori proprio quel che
 * si cercava.
 */
export function periodo (cosa = 'le ore'): {
  dal: ReturnType<typeof opzionale<ReturnType<typeof iso>>>
  al: ReturnType<typeof opzionale<ReturnType<typeof iso>>>
} {
  // Il formato **non** sta più nell'aiuto, e per un pezzo c'è stato. La griglia
  // che vincola il modello locale scartava `pattern` ed `esempio`, quindi di là
  // arrivava un campo di testo libero con una frase che non diceva come si
  // scrive una data — e «1 settembre» non filtra niente e non sbaglia nemmeno:
  // torna una busta piena di righe che non c'entrano. Adesso `pattern` si
  // traduce in `format: 'date'`, che la libreria scrive da sé accanto al campo
  // e che rende una data storta **impossibile da generare**: ripeterlo a parole
  // sarebbe una terza copia della stessa regola, pagata in contesto su una
  // finestra che è già stretta.
  return {
    dal: opzionale(iso({
      aiuto: `Primo giorno compreso. Senza, dall’inizio dell’anno in uso. Filtra ${cosa}`,
    })),
    al: opzionale(iso({
      aiuto: `Ultimo giorno compreso. Senza, fino alla fine dell’anno in uso. Filtra ${cosa}`,
    })),
  }
}

/**
 * Il periodo vero su cui si risponderà: quel che è stato chiesto, o l'anno.
 *
 * Torna sempre due date piene, e chi chiama le rimanda nella busta. È la
 * regola di `corso.presenze`, che rispedisce `dal` e `al` anche quando non
 * gliele hanno passate: senza, chi legge deve fidarsi di aver indovinato quale
 * periodo ha guardato il registro.
 *
 * `classe` serve a chi guarda **una classe per volta**. Senza, l'anno è quello
 * in uso; con, è l'anno di quella classe — che in un registro con più anni
 * aperti non è per forza lo stesso per tutte. Il parametro esiste perché quel
 * conto era scritto a mano dentro tre procedure, sempre nella stessa forma
 * (`ingresso.dal ?? intervallo?.inizio ?? dal`), con due conseguenze che nessuno
 * vedeva: `corso.presenze`, che non aveva il ripiego sull'anno, su una classe
 * senza semestri guardava **tutto il tempo**; e `persone.assenze` dichiarava
 * nella busta il periodo globale mentre contava su quello della classe. Un
 * periodo si risolve in un posto solo, e la busta può rimandare per costruzione
 * quel che il filtro ha usato.
 *
 * Prima i semestri e poi gli estremi dell'anno: in un registro valido dicono la
 * stessa cosa — `validation.ts` impone che `anno.inizio`/`anno.fine` siano
 * quelli di `intervalloAnno(semestri)` — ma quando divergono i semestri sono il
 * calendario su cui l'appello è stato fatto davvero.
 */
export function risolviPeriodo (
  registro: Registro,
  // Un `null` vale come un campo assente, qui e negli altri filtri di questo
  // file: `??` non fa differenza fra i due, e chi chiama non deve ripulire
  // l'ingresso prima di passarlo solo perché uno schema ha scelto in quale dei
  // due modi si dice «niente».
  chiesto: { dal?: string | null, al?: string | null },
  classe?: Classe | null,
): { dal: string, al: string } {
  const anno = classe
    ? annoDellaClasse(registro, classe)
    : registro.anni.find((a) => a.id === registro.annoCorrenteId) ?? null
  const estremi = estremiAnno(anno)
  return {
    dal: chiesto.dal ?? estremi?.inizio ?? '0000-01-01',
    al: chiesto.al ?? estremi?.fine ?? '9999-12-31',
  }
}


// --------------------------------------------------------- i periodi del conto

/**
 * Un pezzo di tempo su cui si conta a parte: un semestre, tagliato su quel che
 * è stato chiesto.
 *
 * `dal` e `al` sono gli estremi **veri** — l'intersezione fra il semestre e
 * l'intervallo domandato — e non quelli del semestre intero. Chiedere «da
 * gennaio a marzo» tocca due semestri, e le cifre del primo devono essere
 * quelle di gennaio, non quelle di tutto il primo semestre: una quota calcolata
 * su un denominatore più largo di quel che si è chiesto è una quota più bassa
 * del vero, e nessuno che la legga se ne accorge.
 */
export interface Periodo {
  semestreId: string
  numero: number
  etichetta: string
  dal: string
  al: string
}

/**
 * `semestreId`, da mettere nell'ingresso di una lettura che conta nel tempo.
 *
 * Senza, si guardano **tutti** i periodi dell'intervallo e ognuno porta le sue
 * cifre: è la forma normale della risposta, perché «quante assenze ha» senza
 * dire quando vuol dire «quante per semestre» — è la scansione su cui il
 * registro raggruppa le valutazioni, quella che finisce sulle pagelle, e un
 * numero solo spalmato sull'anno nasconde esattamente la cosa che si guarda:
 * chi è peggiorato.
 */
export function periodoScelto (cosa = 'il conto'): {
  semestreId: SchemaOpzionale<string>
} {
  return {
    semestreId: opzionale(identificatore({
      aiuto: `Un semestre solo per ${cosa}. Senza, tutti quelli del periodo, a parte`,
    })),
  }
}

/** Com'è fatta una voce di `periodi` nella busta: la si dichiara una volta. */
export const SCHEDA_PERIODO = {
  semestreId: testo({ aiuto: 'Vuoto quando l’anno non ha semestri: allora il periodo è uno solo' }),
  numero: numero({ intero: true, aiuto: 'Primo o secondo semestre. Zero quando non ce ne sono' }),
  etichetta: testo({ aiuto: 'Come si chiama: «1° semestre»' }),
  dal: testo({ aiuto: 'Primo giorno davvero contato, non quello del semestre intero' }),
  al: testo({ aiuto: 'Ultimo giorno davvero contato' }),
}

/**
 * I periodi su cui contare, e gli estremi che ne escono.
 *
 * Sostituisce `risolviPeriodo` in chi conta **per periodo**: risolve
 * l'intervallo allo stesso modo, poi lo spezza sui semestri dell'anno.
 *
 * Tre casi, e il terzo è quello che dà il nome alla funzione:
 *
 * - **`semestreId` chiesto**: un periodo solo, quello. Se l'id non è di un
 *   semestre di quell'anno si solleva, invece di rispondere una busta vuota che
 *   si legge come «non ci sono assenze».
 * - **nessun semestre nell'anno**: un periodo solo, senza id, che copre
 *   l'intervallo intero. Il raggruppamento non sparisce — resta un array di
 *   uno — così chi legge la busta non deve scrivere due strade.
 * - **il caso normale**: i semestri che toccano l'intervallo, ciascuno tagliato
 *   sui suoi estremi veri.
 *
 * `dal` e `al` che tornano sono l'unione di quel che si è davvero guardato, non
 * quel che si è chiesto: con un `dal` prima dell'inizio dell'anno, la busta
 * dichiara l'inizio dell'anno, che è il giorno da cui ci sono le ore.
 */
export function periodiDa (
  registro: Registro,
  chiesto: { dal?: string | null, al?: string | null, semestreId?: string | null },
  classe?: Classe | null,
): { dal: string, al: string, periodi: Periodo[] } {
  const { dal, al } = risolviPeriodo(registro, chiesto, classe)
  const anno = classe ? annoDellaClasse(registro, classe) : annoInUso(registro)
  const semestri = anno?.semestri ?? []

  if (chiesto.semestreId) {
    const suo = semestri.find((s) => s.id === chiesto.semestreId)
    if (!suo) {
      throw errore.nonTrovato(
        SCUOLA.semestre,
        'I semestri dell’anno stanno dentro l’anno, in «anni.elenco».',
      )
    }
    // Chiesto un semestre, i suoi estremi vincono su quelli dell'anno — ma non
    // su un `dal`/`al` scritto a mano, che è più stretto di proposito.
    const inizio = chiesto.dal ? maggiore(chiesto.dal, suo.inizio) : suo.inizio
    const fine = chiesto.al ? minore(chiesto.al, suo.fine) : suo.fine
    return {
      dal: inizio,
      al: fine,
      periodi: [{
        semestreId: suo.id,
        numero: suo.numero,
        etichetta: suo.etichetta,
        dal: inizio,
        al: fine,
      }],
    }
  }

  const dentro = semestri
    .filter((s) => s.inizio <= al && s.fine >= dal)
    .map((s) => ({
      semestreId: s.id,
      numero: s.numero,
      etichetta: s.etichetta,
      dal: maggiore(s.inizio, dal),
      al: minore(s.fine, al),
    }))
    .sort((uno, altro) => uno.dal.localeCompare(altro.dal))

  if (dentro.length === 0) {
    return {
      dal,
      al,
      periodi: [{ semestreId: '', numero: 0, etichetta: anno?.etichetta ?? 'Tutto il periodo', dal, al }],
    }
  }
  return { dal: dentro[0].dal, al: dentro[dentro.length - 1].al, periodi: dentro }
}

/** Il più tardo di due giorni. Stringhe ISO: l'ordine alfabetico è quello vero. */
function maggiore (uno: string, altro: string): string {
  return uno > altro ? uno : altro
}

/** Il più presto di due giorni. */
function minore (uno: string, altro: string): string {
  return uno < altro ? uno : altro
}

/** Se un giorno cade nel periodo. Estremi compresi: «dal 1 al 30» comprende il 30. */
export function nelPeriodo (data: string, dal: string, al: string): boolean {
  return data >= dal && data <= al
}

// ----------------------------------------------------------------- la ricerca

/**
 * `cerca`, da mettere nell'ingresso di una lettura che ha del testo dentro.
 *
 * L'esempio non è un ornamento: è la riga che dice a chi chiama — e al modello
 * — **su che cosa** si cerca, che cambia da una lettura all'altra. Su un'ora
 * si cerca l'argomento, su una persona il cognome, su un piano un obiettivo.
 */
export function ricerca (dove: string, esempio: string): {
  cerca: ReturnType<typeof opzionale<ReturnType<typeof testo>>>
} {
  return {
    cerca: opzionale(testo({
      aiuto: `Pezzi di ${dove}: ogni pezzo deve trovarsi. Senza, non filtra niente`,
      esempio,
    })),
  }
}

/**
 * Un filtro pronto: `corrisponde(paglia)` è vero quando quella riga passa.
 *
 * Passa da `pezziDiRicerca` e `corrispondeAlla`, cioè dalle stesse due funzioni
 * della pagina: maiuscole, accenti e apostrofi non contano, e ogni pezzo deve
 * trovarsi — «rossi dic» è Rossi della DIC4a e non tutti i Rossi più tutta la
 * DIC4a. Senza `cerca` torna sempre vero, e la lettura non deve scriverne il
 * caso a parte.
 */
export function filtroTesto (cerca: string | null | undefined): {
  pezzi: string[]
  corrisponde: (paglia: string) => boolean
  ignorato: boolean
} {
  const pezzi = pezziDiRicerca(cerca ?? '')
  return {
    pezzi,
    corrisponde: (paglia: string) => pezzi.length === 0 || corrispondeAlla(paglia, pezzi),
    // Il filtro che si è spento da solo. `pezziDiRicerca` passa da
    // `normalizzaTesto`, che tiene lettere e cifre e butta via tutto il resto:
    // «@», «…», «—», «李» diventano l'elenco vuoto, e un elenco vuoto vuol
    // dire «passano tutti». Da fuori non si vede: la busta rimandava `cerca:
    // "@"` accanto a trecentottanta righe, e chi legge — modello o persona —
    // capiva «trecentottanta corrispondono a @». Un filtro che non filtra e
    // dichiara di aver filtrato è peggio di un errore, perché nessuno lo
    // ritenta. Chi chiama rimanda questo booleano accanto a `cerca`.
    ignorato: (cerca ?? '').trim() !== '' && pezzi.length === 0,
  }
}

/**
 * I due campi d'uscita della ricerca: quel che si è cercato, e se è servito.
 *
 * Stanno insieme perché il secondo esiste solo per il primo: `cerca` da solo
 * dice «ho filtrato su questo» anche quando non ha filtrato niente.
 */
export const CAMPI_CERCA = {
  cerca: testo({ aiuto: 'Il filtro di testo applicato. Vuoto quando non se n’è chiesto' }),
  cercaIgnorato: booleano({
    aiuto: 'Vero se «cerca» non aveva dentro né lettere né cifre: le righe NON sono filtrate',
  }),
}

// ------------------------------------------------------- quel che resta fuori

/**
 * Quanti ne ha lasciati fuori un interruttore, o `null` se non c'è niente da
 * dire.
 *
 * Nullo e non zero, per due ragioni diverse che portano allo stesso numero:
 * l'interruttore già acceso non esclude nessuno, e uno zero scritto lo stesso
 * manderebbe chi legge a riaccendere un interruttore acceso. Il pannello scrive
 * una riga per ogni valore che c'è, e una riga «0» sotto una risposta buona
 * parla di un problema che non esiste.
 */
export function fuori (quanti: number, acceso: boolean): number | null {
  return acceso || quanti === 0 ? null : quanti
}

/**
 * `esclusiRitirati` e `esclusiArchiviate`, da mettere nell'uscita di una lettura
 * che applica quei due filtri di suo.
 *
 * Sono i campi su cui scatta la regola di recupero scritta nelle istruzioni del
 * modello: «quando la busta dice esclusiRitirati o esclusiArchiviate maggiore di
 * zero e l'elenco è vuoto, richiama lo stesso attrezzo con ritirati e archiviate
 * a vero». Una lettura che quei due filtri li applica e quei due numeri non li
 * emette toglie al modello l'unico appiglio che ha per accorgersi di non aver
 * guardato: risponde «non ne ha» dove doveva rispondere «non ho guardato lì».
 *
 * Piatti e non dentro un `esclusi: {…}`: la presentazione legge una chiave sola
 * — `campo()` non scende nei sottoggetti — e un numero che il pannello non sa
 * mostrare sarebbe visto dal modello e non da chi ha chiesto.
 */
export const CAMPI_ESCLUSI = {
  esclusiRitirati: nullabile(numero({
    intero: true,
    aiuto: 'Quante persone restano fuori perché non frequentano più: con «ritirati» a vero rientrano',
  })),
  esclusiArchiviate: nullabile(numero({
    intero: true,
    aiuto: 'Quante restano fuori perché la classe è archiviata: con «archiviate» a vero rientrano',
  })),
}

// ------------------------------------------------------------------ la pagina

/** Quante righe tornano quando non lo si dice. */
export const QUANTE = 50

/** Il tetto: oltre, una busta smette di essere una risposta e diventa un file. */
export const QUANTE_MASSIME = 500

/**
 * `da` e `quanti`, da mettere nell'ingresso di una lettura che elenca.
 *
 * È quel che mancava a tutte. Le letture tagliavano a un numero fisso e
 * dicevano `troncato: true`, che è onesto e non basta: chi ha quattrocento ore
 * nell'anno non aveva **nessuna** strada per vedere la duecentunesima. Con la
 * pagina la strada c'è, e resta una strada che chi chiede deve prendere
 * apposta: la prima risposta non cambia.
 *
 * Un salto e non un cursore: le letture ordinano quel che tornano — per data,
 * per cognome — e su un elenco ordinato e stabile «dalla cinquantunesima» è
 * quel che si vuole dire. Un cursore servirebbe a un registro che cambia
 * mentre lo si sfoglia, e un anno scolastico non è quello.
 */
export function pagina (): {
  da: ReturnType<typeof opzionale<ReturnType<typeof numero>>>
  quanti: ReturnType<typeof opzionale<ReturnType<typeof numero>>>
} {
  // `soloDaFuori`: la pagina resta nel contratto e sparisce dal catalogo che
  // precede una domanda in chat. Due campi su dieci letture sono più di
  // duemila caratteri di contesto, e servono a chi scrive uno script — che la
  // seconda pagina la chiede — non a un modello piccolo, che per rispondere
  // «chi sta peggio» la prima le basta, e che quando la busta è tagliata lo
  // legge nei conti d'insieme, che il taglio non tocca mai.
  return {
    da: soloDaFuori(opzionale(numero({
      intero: true,
      minimo: 0,
      aiuto: 'Da quale riga cominciare, contando da zero. Senza, dalla prima',
    }))),
    quanti: soloDaFuori(opzionale(numero({
      intero: true,
      minimo: 1,
      massimo: QUANTE_MASSIME,
      aiuto: `Quante righe al massimo: da 1 a ${QUANTE_MASSIME}. Senza, ${QUANTE}`,
    }))),
  }
}

/** I campi che una busta paginata riporta accanto alle righe. */
export const CAMPI_PAGINA = {
  quante: numero({ intero: true, aiuto: 'Quante righe corrispondono in tutto, oltre questa pagina' }),
  da: numero({ intero: true, aiuto: 'Da quale riga comincia quel che è qui dentro' }),
  troncato: booleano({ aiuto: 'Vero se ne restano fuori: chiedi la pagina dopo con «da»' }),
  ancora: numero({ intero: true, aiuto: 'Quante ne restano dopo questa pagina. Zero se è l’ultima' }),
}

/**
 * Taglia un elenco come la pagina chiede, e dice tutto quel che serve a chiedere
 * la prossima.
 *
 * Quattro numeri e non uno: `quante` è il totale che corrisponde al filtro,
 * `da` dov'è cominciata questa pagina, `ancora` quante ne restano, `troncato`
 * se ne restano. Ridondanti apposta — `ancora > 0` e `troncato` dicono la
 * stessa cosa — perché sono due domande che si fanno in due momenti diversi:
 * «devo chiedere ancora?» mentre si scorre, «quante ne mancano?» quando si
 * decide se vale la pena.
 */
export function taglia<T> (
  righe: readonly T[],
  chiesto: { da?: number | null, quanti?: number | null },
): { pagina: T[], quante: number, da: number, troncato: boolean, ancora: number } {
  const da = Math.max(0, Math.trunc(chiesto.da ?? 0))
  const quanti = limita(Math.trunc(chiesto.quanti ?? QUANTE), 1, QUANTE_MASSIME)
  const pagina = righe.slice(da, da + quanti)
  // Quante ne restano **dopo** questa pagina, mai negative: chiedendo `da`
  // oltre la fine si riceve una pagina vuota e uno zero, non un numero
  // all'indietro che chi legge interpreterebbe come righe da qualche parte.
  const ancora = Math.max(0, righe.length - (da + pagina.length))
  return { pagina, quante: righe.length, da, troncato: ancora > 0, ancora }
}

// ------------------------------------------------- la presenza di un valore

/**
 * `ha` e `senza`, da mettere nell'ingresso di una lettura con dei campi che
 * possono essere vuoti.
 *
 * È il filtro che mancava per la domanda più pratica che ci sia: **chi non
 * riceverà**. Prima di mandare una comunicazione alla classe si vuole sapere
 * chi non ha l'indirizzo; prima di stampare i fogli di firma, chi non ha un
 * rappresentante legale; prima di chiudere un semestre, quali ore non dicono
 * che cosa si è fatto. Tutte e tre finivano in «scorri l'elenco e guarda»,
 * che su venticinque righe si fa e su duecento no.
 *
 * Due campi e non uno con un booleano: `ha` e `senza` si compongono — «chi ha
 * l'e-mail del tutore ma non la propria» è una domanda vera, e con un campo
 * solo servirebbero due chiamate e un'intersezione fatta a mano.
 *
 * **Vuoto vuol dire vuoto**, non «non lo so»: una stringa di soli spazi è
 * vuota, un elenco senza voci è vuoto, e uno zero non lo è — zero telefoni è
 * «non ne ha», zero UD è un numero. Chi chiama passa a `passaPresenza` quel
 * che per lui conta come pieno, e la regola sta scritta lì una volta sola.
 */
export function presenzaDi<const C extends readonly string[]> (
  campi: C,
  cosa: string,
): {
  ha: SchemaOpzionale<Array<C[number]>>
  senza: SchemaOpzionale<Array<C[number]>>
} {
  return {
    ha: opzionale(elenco(scelta(campi), {
      minimo: 1,
      aiuto: `Solo ${cosa} che hanno tutti questi campi pieni`,
    })),
    senza: opzionale(elenco(scelta(campi), {
      minimo: 1,
      aiuto: `Solo ${cosa} che hanno tutti questi campi vuoti`,
    })),
  }
}

/** Se un valore conta come pieno: la regola, scritta una volta sola. */
export function pieno (valore: unknown): boolean {
  if (valore === null || valore === undefined) return false
  if (typeof valore === 'string') return valore.trim() !== ''
  if (Array.isArray(valore)) return valore.length > 0
  // Un booleano spento è un campo vuoto, e non è ovvio: senza questa riga
  // `false` finiva nel caso generale qui sotto e contava come pieno, cioè un
  // campo dichiarato con un sì/no avrebbe risposto «ce l'ha» a chi non ce
  // l'ha. Vale per i campi che sono una condizione — «l'appello è stato
  // fatto», «è stata riconsegnata» — dove il no è la ragione per cui si cerca.
  if (typeof valore === 'boolean') return valore
  // Uno zero è un numero e non un vuoto: «zero assenze» è un fatto, e
  // trattarlo come «non lo so» toglierebbe dall'elenco proprio chi sta bene.
  return true
}

/**
 * Se una riga passa i due filtri.
 *
 * `valori` è la riga vista per campo: `{ email: 'a@b.ch', telefoni: [] }`.
 * **Tutti** i campi di `ha` devono essere pieni e **tutti** quelli di `senza`
 * vuoti: è la stessa regola della ricerca a pezzi — ogni parola in più
 * restringe — e con un «almeno uno» le due liste vorrebbero dire due cose
 * diverse a seconda di quanti campi ci si mette.
 *
 * Un campo che la riga non conosce conta come vuoto: è quel che è, e sollevare
 * costringerebbe chi chiama a sapere quali campi esistono su quale riga.
 */
export function passaPresenza (
  valori: Record<string, unknown>,
  ha: readonly string[] | null | undefined,
  senza: readonly string[] | null | undefined,
): boolean {
  if (ha && !ha.every((campo) => pieno(valori[campo]))) return false
  if (senza && !senza.every((campo) => !pieno(valori[campo]))) return false
  return true
}

// --------------------------------------------------------------- le soglie

/**
 * Un estremo numerico, con l'aiuto scritto come negli altri.
 *
 * Non c'è un costruttore che ne faccia due — `mediaAlmeno` e `mediaAlPiu` —
 * perché chiavi composte a macchina non le vede il compilatore: una procedura
 * dichiara i suoi due campi per nome, e da qui prende la forma e le parole.
 * Quel che conta che sia condiviso è il **significato**, ed è in `fraSoglie`.
 */
export function estremo (aiuto: string, opzioni: { minimo?: number, massimo?: number } = {}) {
  return opzionale(numero({ ...opzioni, aiuto }))
}

/**
 * Se un valore sta fra i due estremi, **compresi**.
 *
 * Compresi perché è così che si legge una soglia detta a voce: «almeno
 * quattro» comprende il quattro, e chi scrive `mediaAlPiu: 4` cerca chi non
 * arriva alla sufficienza, quattro incluso. Un estremo escluso si scopre solo
 * contando le righe.
 *
 * Un valore `null` — una media che non c'è perché non ci sono voti — non
 * passa nessuna soglia: non è zero, è «non si sa», e metterlo fra chi sta
 * sotto vorrebbe dire segnalare per un dato che manca. Chi vuole quelle righe
 * le chiede con `senza`, che è il filtro fatto apposta.
 */
export function fraSoglie (
  valore: number | null | undefined,
  almeno: number | undefined,
  alPiu: number | undefined,
): boolean {
  if (almeno === undefined && alPiu === undefined) return true
  if (valore === null || valore === undefined) return false
  if (almeno !== undefined && valore < almeno) return false
  if (alPiu !== undefined && valore > alPiu) return false
  return true
}

// ------------------------------------------------------------------ la zona

/**
 * `comune` e `cap`, da mettere nell'ingresso di una lettura che ha degli
 * indirizzi dentro.
 *
 * La zona si chiede in due modi e sono diversi. Il comune si dice per nome —
 * «Lugano», «Massagno» — e va confrontato come si confronta un nome: senza
 * accenti e senza maiuscole, perché chi lo batte non sa come l'ha scritto la
 * segreteria. Il NAP si dice a cifre e si usa **per prefisso**: «69» sono i
 * paesi del Luganese, e chiedere «6900» vuol dire una città sola.
 */
export function zona (): {
  comune: SchemaOpzionale<string>
  cap: SchemaOpzionale<string>
} {
  return {
    comune: opzionale(testo({
      aiuto: 'Il comune, per nome: non guarda accenti né maiuscole',
      esempio: 'Lugano',
    })),
    cap: opzionale(testo({
      aiuto: 'Il NAP, anche a metà: «69» prende tutto il Luganese',
      esempio: '6900',
    })),
  }
}

/**
 * Se un indirizzo è nella zona chiesta.
 *
 * Il comune si confronta normalizzato e **intero**: «Lugano» non deve
 * prendere «Luganello», e un confronto a pezzi su un nome di comune
 * trasformerebbe un filtro in una ricerca. Il NAP invece è per prefisso, che è
 * il modo in cui i NAP dicono «la zona».
 */
export function nellaZona (
  indirizzo: { cap?: string, localita?: string } | null | undefined,
  chiesto: { comune?: string | null, cap?: string | null },
): boolean {
  if (!chiesto.comune && !chiesto.cap) return true
  if (!indirizzo) return false
  if (chiesto.comune) {
    if (normalizzaTesto(indirizzo.localita ?? '') !== normalizzaTesto(chiesto.comune)) return false
  }
  if (chiesto.cap) {
    const suo = (indirizzo.cap ?? '').replace(/\s+/g, '')
    if (!suo.toLowerCase().startsWith(chiesto.cap.replace(/\s+/g, '').toLowerCase())) return false
  }
  return true
}
