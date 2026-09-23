// Che cosa si dice all'assistente, una parte per volta.
//
// Il contesto era un interruttore solo: o il modello sapeva tutto di dove si
// sta guardando — pagina, tendine, filtri, id, elenco a schermo — o non sapeva
// niente. Le due posizioni non bastano, perché le ragioni per togliere qualcosa
// sono diverse fra loro e non si chiudono nello stesso gesto:
//
//   «come si calcola la quota di assenza»   i filtri della pagina la
//                                           restringono senza che nessuno
//                                           l'abbia chiesto
//   «e negli altri corsi?»                  il corso scelto è proprio quel che
//                                           non si vuole far valere
//   una domanda fatta a scuola, con la
//   classe davanti allo schermo             i nomi delle persone in elenco non
//                                           devono andare da nessuna parte
//
// Qui ogni parte ha il suo interruttore, e questo file è la regola di che cosa
// resta nella busta quando una si spegne.
//
// ------------------------------------------------------------ perché è puro
//
// Non tocca `stato.ts` e non tocca il DOM: prende una veduta e dei
// permessi, e torna la veduta da mandare. Così si prova — e va provato, perché
// è la riga che decide se il nome di una persona in formazione esce o non esce
// dal registro quando chi insegna ha detto di no. Un difetto qui non si vede
// guardando lo schermo: si vede leggendo il prompt di un modello, cioè mai.
//
// Vedi `tests/ui/contextParts.test.mjs`.

import { formattaData } from '../../domain/dates.js'
import type {
  ContestoAssistente,
  RiferimentiContesto,
  VoceContesto,
} from '../../protocol.js'

/** Che cosa il modello può sapere della pagina che si ha davanti. */
export interface PartiContesto {
  /**
   * Dove si sta: la pagina, la scheda, la sezione.
   *
   * **Una parte come le altre, e non più il padrone di tutte.** Prima spegnerla
   * spegneva l'intera busta, e le due cose non si somigliano: «non dirgli su
   * che pagina sono» è una richiesta, «non dirgli niente» è un'altra, e chi
   * voleva la prima — restare sui filtri della barra senza nominare la pagina —
   * si ritrovava la seconda, cioè l'assistente muto. Spenta questa se ne vanno
   * il nome della pagina, la scheda e la sezione; le tendine, i filtri, il
   * periodo e l'elenco restano accesi se li si è lasciati accesi.
   *
   * Il «non dirgli niente» c'è ancora ed è esplicito: si spengono tutte, e la
   * scorciatoia `NIENTE` lo fa in un gesto. Vedi `contestoSpento`.
   */
  pagina: boolean
  /** Le scelte delle tendine in cima: anno, periodo, corso, classe, scheda. */
  scelte: boolean
  /** Che cosa si potrebbe scegliere al posto di quel che è scelto. */
  opzioni: boolean
  /** Quel che la pagina sta restringendo: il modo del calendario, le pendenze. */
  filtri: boolean
  /** Il periodo dei conti in date, quello che gli attrezzi vogliono. */
  periodo: boolean
  /** Gli id già risolti, dentro e fuori le tendine. */
  riferimenti: boolean
  /** La ricerca battuta nella pagina. */
  ricerca: boolean
  /** Gli elementi che la pagina sta mostrando adesso. */
  visibili: boolean
  /**
   * Le tendine spente una per una, per nome del campo: «Corso», «Periodo».
   *
   * `scelte` e `filtri` accendono e spengono un gruppo intero, ed è il gesto
   * rapido — «lascia stare tutta la barra». Ma le tendine non si somigliano:
   * il periodo restringe i conti, il corso dice *su che cosa* si lavora, la
   * scheda aperta non è nessuna delle due, e chi chiede «e negli altri corsi?»
   * vuole togliere il corso **senza** togliere anche il semestre in cui sta
   * guardando. Qui si spengono da sole.
   *
   * Si tengono le spente e non le accese: una tendina nuova nasce accesa, come
   * tutto il resto del contesto, e un elenco di accese l'avrebbe fatta nascere
   * spenta — cioè un pezzo di pagina che smette di arrivare senza che nessuno
   * l'abbia chiesto.
   *
   * L'appiglio è il nome che si legge nella barra, non una chiave del codice:
   * è quel che il menu mostra e quel che il contesto scrive. Cambiando nome a
   * una tendina, quella torna accesa e il menu la mostra spuntata — chi
   * l'aveva spenta la rispegne. È il guasto giusto: l'altro — restare spenta
   * per sempre appesa a un nome che non esiste più — sarebbe un filtro che non
   * si vede da nessuna parte.
   */
  tendineSpente: string[]
}

/**
 * Le parti come si chiamano nella testata, nell'ordine in cui si leggono.
 *
 * L'elenco sta qui e non nella testata perché lo leggono in due — chi disegna
 * il menu e chi filtra la busta — e una seconda tabella di nomi sarebbe quella
 * che resta indietro il giorno in cui una parte cambia significato.
 */
type ParteAccendibile = Exclude<keyof PartiContesto, 'tendineSpente'>

export const PARTI: ReadonlyArray<{
  chiave: ParteAccendibile
  testo: string
  aiuto: string
}> = [
  {
    chiave: 'pagina',
    testo: 'La pagina che guardo',
    aiuto: 'Solo il nome della pagina, della scheda e della sezione aperte. Le tendine e i filtri qui sotto non dipendono da questa.',
  },
  {
    chiave: 'scelte',
    testo: 'Le tendine della barra',
    aiuto: 'Anno, periodo, corso, classe, scheda insieme. Qui sotto si spengono anche una per una.',
  },
  {
    chiave: 'opzioni',
    testo: 'Le altre voci delle tendine',
    aiuto: 'Che cosa si potrebbe scegliere al posto di quel che è scelto adesso.',
  },
  {
    chiave: 'filtri',
    testo: 'I filtri della pagina',
    aiuto: 'Quel che la pagina sta restringendo, tutto insieme. Qui sotto si spengono anche uno per uno.',
  },
  {
    chiave: 'periodo',
    testo: 'Periodo dei conti',
    aiuto: 'Le due date con cui l’assistente restringe medie, assenze e ore.',
  },
  {
    chiave: 'riferimenti',
    testo: 'Gli identificatori',
    aiuto: 'Gli id già risolti, tendine ed elenco compresi: senza, l’assistente deve cercarli con un elenco.',
  },
  {
    chiave: 'ricerca',
    testo: 'La ricerca battuta',
    aiuto: 'Quel che c’è scritto adesso nella casella di ricerca della pagina.',
  },
  {
    chiave: 'visibili',
    testo: 'L’elenco a schermo',
    aiuto: 'Chi e che cosa la pagina sta mostrando adesso, nell’ordine in cui si vede.',
  },
]

/** Tutte accese: è il contesto intero, ed è come si parte. */
export const PARTI_INTERE: PartiContesto = {
  pagina: true,
  scelte: true,
  opzioni: true,
  filtri: true,
  periodo: true,
  riferimenti: true,
  ricerca: true,
  visibili: true,
  tendineSpente: [],
}

/**
 * Tutte spente: è il «non dirgli niente», e adesso è una cosa che si dice.
 *
 * Finché la pagina faceva da padrone, questo stato non aveva un nome: lo si
 * otteneva spegnendo una voce che parlava d'altro, e chi la spegneva per
 * togliere il nome della pagina si ritrovava senza contesto senza averlo
 * chiesto. Qui è un valore, la scorciatoia `Niente` lo scrive, e
 * `contestoSpento` lo riconosce.
 */
export const PARTI_SPENTE: PartiContesto = {
  pagina: false,
  scelte: false,
  opzioni: false,
  filtri: false,
  periodo: false,
  riferimenti: false,
  ricerca: false,
  visibili: false,
  tendineSpente: [],
}

/**
 * I tre modi che si vogliono davvero, in cima al menu.
 *
 * Otto interruttori sono la precisione, e non sono il gesto di tutti i giorni:
 * quello è «dimmi tutto», «non dirgli niente», «solo dove sono, senza nomi
 * nell'elenco». Farli a mano vuol dire otto clic guardando ogni volta che cosa
 * si è già spento; qui sono una riga, e la riga si vede spuntata quando il
 * contesto è esattamente quello.
 */
export const SCORCIATOIE: ReadonlyArray<{
  chiave: 'tutto' | 'niente' | 'solo-pagina'
  testo: string
  aiuto: string
  parti: PartiContesto
}> = [
  {
    chiave: 'tutto',
    testo: 'Tutto il contesto',
    aiuto: 'L’assistente sa tutto di dove stai guardando: pagina, tendine, filtri, id, elenco a schermo.',
    parti: PARTI_INTERE,
  },
  {
    chiave: 'solo-pagina',
    testo: 'Solo dove sono',
    aiuto: 'Pagina, scheda e periodo dei conti. Niente tendine, niente id, niente elenco: la domanda resta generale.',
    parti: { ...PARTI_SPENTE, pagina: true, periodo: true },
  },
  {
    chiave: 'niente',
    testo: 'Niente del tutto',
    aiuto: 'L’assistente non sa niente della pagina, e l’host butta via quel che teneva.',
    parti: PARTI_SPENTE,
  },
]

/** Se il contesto è spento del tutto: nessuna parte accesa, niente da mandare. */
export function contestoSpento (parti: PartiContesto): boolean {
  return PARTI.every((parte) => !parti[parte.chiave])
}

/** La scorciatoia che descrive questo contesto, se ce n'è una. */
export function scorciatoiaDi (parti: PartiContesto): string | null {
  const uguale = SCORCIATOIE.find((s) =>
    PARTI.every((parte) => parti[parte.chiave] === s.parti[parte.chiave]) &&
    parti.tendineSpente.length === s.parti.tendineSpente.length)
  return uguale?.chiave ?? null
}

/**
 * Le tendine che questa pagina ha, con dentro quel che dicono.
 *
 * Non è un elenco fisso: le tendine sono quelle che la barra sta mostrando
 * adesso — nel calendario c'è il corso dell'agenda e non quello del registro,
 * nelle pendenze c'è la classe e non il semestre — e un elenco scritto a mano
 * mostrerebbe interruttori per tendine che lì non ci sono. Le legge dalla
 * veduta, che è la stessa cosa che il modello riceverebbe.
 */
export function tendineDi (veduta: ContestoAssistente): Array<{
  gruppo: 'scelte' | 'filtri'
  campo: string
  valore: string
}> {
  return [
    ...veduta.scelte.map((v) => ({ gruppo: 'scelte' as const, campo: v.campo, valore: v.valore })),
    ...veduta.filtri.map((v) => ({ gruppo: 'filtri' as const, campo: v.campo, valore: v.valore })),
  ]
}

/** Se quella tendina entra nel contesto: il gruppo è acceso e lei non è spenta. */
export function tendinaAccesa (
  parti: PartiContesto,
  tendina: { gruppo: 'scelte' | 'filtri', campo: string },
): boolean {
  return parti[tendina.gruppo] && !parti.tendineSpente.includes(tendina.campo)
}

/** La stessa scelta, girata: è quel che il menu scrive quando la si preme. */
export function conTendina (parti: PartiContesto, campo: string, accesa: boolean): PartiContesto {
  const spente = parti.tendineSpente.filter((nome) => nome !== campo)
  return { ...parti, tendineSpente: accesa ? spente : [...spente, campo] }
}

/** Come sta un gruppo di tendine: tutte dentro, qualcuna, nessuna. */
type StatoGruppo = 'tutto' | 'parte' | 'niente'

/**
 * Quanto di un gruppo entra davvero nel contesto.
 *
 * Tre stati e non due, perché tre sono quelli veri: il gruppo acceso con una
 * tendina spenta dentro non è «acceso» — sarebbe una spunta piena su un elenco
 * a cui manca una riga — e non è «spento». Il menu ci mette un segno suo, e
 * chi guarda capisce senza aprire il sottoelenco che là dentro qualcosa manca.
 */
export function statoGruppo (
  parti: PartiContesto,
  gruppo: 'scelte' | 'filtri',
  campi: readonly string[],
): StatoGruppo {
  if (!parti[gruppo]) return 'niente'
  if (campi.length === 0) return 'tutto'
  const dentro = campi.filter((campo) => !parti.tendineSpente.includes(campo)).length
  if (dentro === 0) return 'niente'
  return dentro === campi.length ? 'tutto' : 'parte'
}

/**
 * Il gruppo acceso o spento in un gesto solo, tendine comprese.
 *
 * Accendere vuol dire **tutte**: il gruppo riacceso che si ritrovasse dentro le
 * tendine spente di mezz'ora prima sarebbe una spunta piena su un contesto
 * bucato, e la riga che nel menu prometteva «tutte le tendine» ne manderebbe
 * tre su cinque. Spegnere lascia invece le singole com'erano — il gruppo se le
 * porta via comunque, e riaccendendolo si torna interi.
 */
export function conGruppo (
  parti: PartiContesto,
  gruppo: 'scelte' | 'filtri',
  campi: readonly string[],
  acceso: boolean,
): PartiContesto {
  if (!acceso) return { ...parti, [gruppo]: false }
  return {
    ...parti,
    [gruppo]: true,
    tendineSpente: parti.tendineSpente.filter((nome) => !campi.includes(nome)),
  }
}

/**
 * Di che mondo sono le parti scritte nelle preferenze.
 *
 * Due: quello in cui la pagina comanda le altre sette, e quello in cui non le
 * comanda più. Il numero si scrive accanto alle parti perché le due forme sono
 * identiche a guardarle — otto booleani e un elenco — e senza un segno non c'è
 * modo di sapere quale delle due regole applicare a un `pagina: false` trovato
 * su disco.
 */
const FORMA = 2

/** Le parti come si scrivono nelle preferenze: con il segno della forma. */
export function daRicordare (parti: PartiContesto): PartiContesto & { v: number } {
  return { ...parti, v: FORMA }
}

/**
 * Le parti ricordate, rimesse in forma.
 *
 * Quel che sta nelle preferenze è stato scritto da una versione di prima, e due
 * volte ha avuto una forma diversa: era un booleano solo — «contesto sì o no» —
 * e prima ancora non c'era. Un `true` ricordato vale «tutto acceso», un `false`
 * vale «tutto spento» — che allora si scriveva spegnendo la sola pagina, perché
 * la pagina comandava le altre, e adesso si scrive per intero. Quel che non si
 * riconosce torna intero: il contesto acceso è il caso normale, e un campo
 * storto non deve zittire l'assistente per sempre.
 */
export function partiValide (ricordate: unknown): PartiContesto {
  const mancante = ricordate === undefined || ricordate === null
  if (ricordate === true || mancante) return { ...PARTI_INTERE }
  if (ricordate === false) return { ...PARTI_SPENTE }
  if (typeof ricordate !== 'object') return { ...PARTI_INTERE }

  const lette = ricordate as Record<string, unknown>
  // Le parti scritte prima che la pagina smettesse di comandare le altre. Là
  // `pagina: false` voleva dire «non dirgli niente», qualunque cosa dicessero
  // le altre sette, e rileggerlo con le regole di adesso vorrebbe dire mandare
  // un contesto quasi intero a chi l'aveva zittito — senza che nessuno se ne
  // accorga, perché il solo posto in cui si vedrebbe è il prompt di un modello.
  if (lette.v !== FORMA && lette.pagina === false) return { ...PARTI_SPENTE }
  const fuori = { ...PARTI_INTERE }
  for (const parte of PARTI) {
    const valore = lette[parte.chiave]
    if (typeof valore === 'boolean') fuori[parte.chiave] = valore
  }
  const spente = lette.tendineSpente
  if (Array.isArray(spente)) {
    fuori.tendineSpente = spente.filter((nome): nome is string => typeof nome === 'string')
  }
  return fuori
}

/**
 * Quante cose sono spente: la testata ci scrive «contesto ridotto (3)».
 *
 * Le tendine spente contano una per una, come si spengono: chi ha tolto il
 * solo corso ha tolto una cosa, e dire «nessuna» perché il gruppo «scelte» è
 * ancora acceso sarebbe la testata che smentisce il menu.
 */
export function parteSpente (parti: PartiContesto): number {
  return PARTI.filter((parte) => !parti[parte.chiave]).length + parti.tendineSpente.length
}

/**
 * Come si dice quel che di una tendina resta fuori: «… e altre 7 non elencate».
 *
 * Le alternative si mandano fino a un tetto, e quel che avanza si dice invece
 * di sparire — un elenco tagliato in silenzio è un elenco che il modello crede
 * intero. La riga la scrive `ui/viewpoint.ts`, la riconosce il menu qui
 * sotto, e la formula sta in un posto solo apposta: scritta due volte, il
 * giorno in cui cambia il menu smetterebbe di riconoscerla e ricomincerebbe a
 * contarla come un'alternativa vera.
 */
const TESTA_NON_ELENCATE = '… e altre '
const CODA_NON_ELENCATE = ' non elencate'

/** Il segnaposto da mettere in fondo alle alternative che si mandano. */
export function nonElencate (quante: number): { valore: string, id: null } {
  return { valore: `${TESTA_NON_ELENCATE}${quante}${CODA_NON_ELENCATE}`, id: null }
}

/**
 * Se quella voce è il segnaposto e non un'alternativa che si può scegliere.
 *
 * Contato come alternativa vera, si leggeva «Corso (21)» per venti corsi più il
 * segnaposto: è la riga con cui si decide che cosa si sta togliendo, e diceva
 * un numero che nella tendina non esiste. `id: null` non basta a riconoscerlo —
 * «Anno intero», «Tutti i corsi» e i modi del calendario sono scelte vere senza
 * id — e per questo si guarda la formula, che è quella qui sopra.
 */
function eNonElencate (opzione: { valore: string, id: string | null }): boolean {
  return opzione.id === null &&
    opzione.valore.startsWith(TESTA_NON_ELENCATE) &&
    opzione.valore.endsWith(CODA_NON_ELENCATE)
}

/** Le prime voci di un elenco, e quante ne restano: «Corso, Periodo, e altre 2». */
function primeDi (voci: readonly string[], quante = 2): string {
  const dette = voci.slice(0, quante).join(', ')
  const resto = voci.length - Math.min(quante, voci.length)
  return resto > 0 ? `${dette}, e altre ${resto}` : dette
}

/**
 * Che cosa c'è dentro ogni parte, adesso.
 *
 * Lo legge il menu della testata e lo scrive sotto ogni voce: un interruttore
 * che dice soltanto «filtri» obbliga a spegnerlo per scoprire che cosa
 * toglieva, e a riaccenderlo quando si scopre che non era quello. Con il
 * valore accanto — «Corso: I MEC A — Matematica», «25 persone in formazione» —
 * la scelta si fa guardando, che è il punto di avere otto interruttori invece
 * di uno.
 *
 * Una parte che in questa pagina non ha niente da dire lo dice: «niente qui».
 * Non si spegne da sé e non si nasconde — sarebbe un interruttore che compare
 * e sparisce a seconda della pagina, cioè un interruttore che non si trova più
 * il giorno in cui serve.
 */
export function riassunti (veduta: ContestoAssistente): Record<ParteAccendibile, string> {
  const niente = 'niente qui'
  const voci = [...veduta.scelte, ...veduta.filtri]
  // Le alternative si contano senza il segnaposto di quelle non elencate: qui
  // il numero serve a decidere che cosa si sta togliendo, e una voce che nella
  // tendina non si può scegliere non è una cosa che si toglie.
  const quanteAlternative = (v: VoceContesto) =>
    (v.opzioni ?? []).filter((o) => !eNonElencate(o)).length
  const conOpzioni = voci.filter((v) => quanteAlternative(v) > 0)
  // Gli id si contano dove stanno davvero: i riferimenti risolti **più** quelli
  // appesi alle voci delle tendine. Contare solo i primi direbbe «4» a chi ne
  // sta per mandare cinque.
  const riferimenti = veduta.riferimenti
  const chiavi = Object.keys(riferimenti) as Array<keyof RiferimentiContesto>
  const quantiId =
    chiavi.filter((chiave) => riferimenti[chiave] !== null).length +
    voci.filter((v) => v.id !== null).length
  const periodo = veduta.periodo

  return {
    pagina: [veduta.pagina, veduta.scheda, veduta.sezione].filter(Boolean).join(' · ') || niente,
    scelte: veduta.scelte.length === 0
      ? niente
      : primeDi(veduta.scelte.map((v) => `${v.campo}: ${v.valore}`)),
    opzioni: conOpzioni.length === 0
      ? niente
      : primeDi(conOpzioni.map((v) => `${v.campo} (${quanteAlternative(v)})`)),
    filtri: veduta.filtri.length === 0
      ? niente
      : primeDi(veduta.filtri.map((v) => `${v.campo}: ${v.valore}`)),
    periodo: periodo === null
      ? niente
      : periodo.dal && periodo.al
        ? `${periodo.etichetta} · ${formattaData(periodo.dal)} – ${formattaData(periodo.al)}`
        : periodo.etichetta,
    riferimenti: quantiId === 0 ? niente : `${quantiId} da passare agli attrezzi`,
    ricerca: veduta.ricerca ? `«${veduta.ricerca}»` : niente,
    visibili: veduta.visibili ? `${veduta.visibili.quanti} ${veduta.visibili.cosa}` : niente,
  }
}

/** Una voce senza gli id, quando gli id non si danno. */
function senzaId (voce: VoceContesto): VoceContesto {
  return {
    ...voce,
    id: null,
    ...(voce.opzioni ? { opzioni: voce.opzioni.map((o) => ({ ...o, id: null })) } : {}),
  }
}

function senzaOpzioni (voce: VoceContesto): VoceContesto {
  const { opzioni: _tolte, ...resto } = voce
  return resto
}

/**
 * Quale id porta ogni tendina della barra.
 *
 * Spegnere «Corso» toglieva la riga leggibile e lasciava `corsoId` nei
 * riferimenti, che il prompt scrive in chiaro con l'ordine di passarli agli
 * attrezzi: nel menu si leggeva «l'assistente non sa niente di «Corso»» e il
 * modello rispondeva su quel corso lo stesso. Un contesto che mente su quel che
 * ha tolto è peggio di uno che non toglie niente, perché chi chiede smette di
 * controllare quel che gli torna — ed è il modo peggiore di sbagliare che ci
 * sia, perché si trascrive.
 *
 * L'appiglio è il nome che si legge nella barra, come per `tendineSpente`, e
 * per la stessa ragione: è quel che il menu mostra ed è quel che il contesto
 * scrive. Rinominata una tendina, il suo id ricomincia a passare — è il guasto
 * giusto, perché si vede spegnendola e riprovando; l'altro — un id che non se
 * ne va più appeso a un nome che non esiste — non si vedrebbe da nessuna parte.
 *
 * Ci sono solo le tendine: `allievoId`, `pianoId` e `valutazioneId` non hanno
 * una riga da spegnere nel menu, e li comanda l'interruttore degli id.
 */
const ID_DELLA_TENDINA = new Map<string, keyof RiferimentiContesto>([
  ['Anno scolastico', 'annoId'],
  ['Periodo', 'semestreId'],
  ['Classe', 'classeId'],
  ['Corso', 'corsoId'],
  ['Lezione del corso', 'lezioneId'],
])

/**
 * Gli id da mandare, presi **dalle tendine rimaste**.
 *
 * Non si copiano i riferimenti togliendo a mano quelli spenti: l'id di una
 * tendina si prende dalla voce che resta, così la riga leggibile e l'id sono la
 * stessa cosa detta due volte e non due cose che possono divergere. È la
 * differenza che fa il caso del pannello del docente di classe, dove la barra
 * mostra la classe del fascicolo e i riferimenti portavano quella dedotta dal
 * corso: si leggeva «Classe: II MEC B» e arrivava l'id di un'altra.
 *
 * Si guarda tendina per tendina quelle che **questa pagina ha**: una tendina
 * che qui non c'è non ha un interruttore nel menu, e il suo id non lo si può
 * quindi aver spento — se non deve partire, non deve partire da prima (vedi la
 * nota sui riferimenti in `ui/viewpoint.ts`).
 */
function riferimentiDi (
  veduta: ContestoAssistente,
  rimaste: readonly VoceContesto[],
): RiferimentiContesto {
  const fuori = { ...veduta.riferimenti }
  for (const voce of [...veduta.scelte, ...veduta.filtri]) {
    const chiave = ID_DELLA_TENDINA.get(voce.campo)
    if (!chiave) continue
    fuori[chiave] = rimaste.find((viva) => viva.campo === voce.campo)?.id ?? null
  }
  return fuori
}

/**
 * La veduta come chi chiede ha deciso di raccontarla.
 *
 * `null` vuol dire «non mandare niente», e lo dicono **tutte le parti spente
 * insieme**: non c'è più una voce che ne comanda altre sette. Prima era la
 * pagina, e la conseguenza si vedeva solo leggendo il prompt — chi la spegneva
 * per non nominare la pagina si portava via anche il corso, il periodo e i
 * filtri che aveva lasciato accesi apposta.
 *
 * Le parti tolgono un pezzo per volta, e quel che resta è **vero** — nessun
 * campo lasciato a metà, nessun id svuotato che sembri assente per caso. È la
 * differenza che conta: una busta ridotta si legge come una busta ridotta, e
 * il modello che non trova il corso chiede di quale corso si parla invece di
 * sceglierne uno.
 *
 * Una tendina spenta se ne porta via **anche l'id**, e non solo la riga che si
 * legge: erano due metà — le voci di qua, i riferimenti di là — e agli
 * interruttori passava solo la prima. Chi spegneva «Corso» toglieva la riga e
 * lasciava `corsoId` fra gli id «da passare agli attrezzi», che è la seconda
 * metà, quella che il modello esegue. Vedi `riferimentiDi`.
 */
export function secondoLeParti (
  veduta: ContestoAssistente,
  parti: PartiContesto,
): ContestoAssistente | null {
  if (contestoSpento(parti)) return null

  const vestite = (voci: VoceContesto[]): VoceContesto[] => {
    const conOpzioni = parti.opzioni ? voci : voci.map(senzaOpzioni)
    return parti.riferimenti ? conOpzioni : conOpzioni.map(senzaId)
  }

  // Prima le tendine spente una per una, poi il gruppo: una tendina spenta non
  // torna accesa perché il suo gruppo lo è, e un gruppo spento se le porta via
  // tutte — comprese quelle che nessuno aveva toccato.
  const accese = (voci: VoceContesto[]) =>
    voci.filter((voce) => !parti.tendineSpente.includes(voce.campo))

  // Le tendine che restano si contano una volta sola, e da lì escono sia le
  // righe leggibili sia gli id: erano due strade — le voci filtrate di qua, i
  // riferimenti copiati di là — e una sola delle due passava dagli
  // interruttori. Chi spegneva «Corso» si teneva `corsoId`.
  const scelteVive = parti.scelte ? accese(veduta.scelte) : []
  const filtriVivi = parti.filtri ? accese(veduta.filtri) : []

  return {
    ...veduta,
    // Spenta la pagina se ne va anche `vista`, che è lo stesso fatto detto con
    // il nome che ha nel codice: lasciarla sarebbe togliere «Valutazioni» dalla
    // busta e mandare `valutazioni` due righe più in là.
    vista: parti.pagina ? veduta.vista : null,
    pagina: parti.pagina ? veduta.pagina : null,
    scheda: parti.pagina ? veduta.scheda : null,
    sezione: parti.pagina ? veduta.sezione : null,
    scelte: vestite(scelteVive),
    filtri: vestite(filtriVivi),
    periodo: parti.periodo ? veduta.periodo : null,
    riferimenti: parti.riferimenti
      ? riferimentiDi(veduta, [...scelteVive, ...filtriVivi])
      : {
          annoId: null,
          semestreId: null,
          corsoId: null,
          classeId: null,
          lezioneId: null,
          allievoId: null,
          pianoId: null,
          valutazioneId: null,
        },
    ricerca: parti.ricerca ? veduta.ricerca : null,
    // Spenti gli id, l'elenco a schermo resta ma **senza i nomi da chiamare**:
    // «ci sono 25 persone in formazione» è un fatto sulla pagina, venticinque
    // identificatori sono la rubrica di una classe. Chi spegne gli id spegne
    // la seconda cosa e tiene la prima.
    visibili: parti.visibili
      ? veduta.visibili && (parti.riferimenti ? veduta.visibili : { ...veduta.visibili, ids: [] })
      : null,
  }
}
