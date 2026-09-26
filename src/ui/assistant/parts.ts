// Che cosa si dice all'assistente, una parte per volta: ogni parte del
// contesto ha il suo interruttore, e qui sta la regola di che cosa resta nella
// busta quando una si spegne. Le ragioni per togliere sono diverse: una domanda
// generale («come si calcola la quota di assenza»), il corso da non far valere
// («e negli altri corsi?»), i nomi da non mandare con la classe davanti allo
// schermo.
//
// È puro (niente `state.ts`, niente DOM) perché va provato: decide se il nome
// di una persona esce dal registro, e un difetto si vedrebbe solo nel prompt.
// Vedi `tests/ui/contextParts.test.mjs`.

import { formattaData } from '../../domain/dates.js'
import { parole } from '../../domain/words.testi.js'
import { testi } from './parts.testi.js'
import { testi as testiVeduta } from '../viewpoint.testi.js'
import type {
  ContestoAssistente,
  RiferimentiContesto,
  VoceContesto,
} from '../../protocol.js'

/** Che cosa il modello può sapere della pagina che si ha davanti. */
export interface PartiContesto {
  /**
   * Dove si sta: pagina, scheda, sezione. Una parte come le altre: spenta, il
   * resto resta com'è. Il «non dirgli niente» è spegnerle tutte (`NIENTE`,
   * `contestoSpento`).
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
   * Le tendine spente una per una, per nome del campo («Corso», «Periodo»):
   * `scelte` e `filtri` spengono il gruppo intero, qui si toglie per esempio il
   * corso tenendo il semestre. Si tengono le spente perché una tendina nuova
   * nasca accesa. L'appiglio è il nome letto nella barra: rinominata, una
   * tendina torna accesa e si vede, invece di restare spenta di nascosto.
   */
  tendineSpente: string[]
}

/** Le parti come si chiamano nella testata, in ordine: le leggono il menu e il filtro della busta. */
type ParteAccendibile = Exclude<keyof PartiContesto, 'tendineSpente'>

export const PARTI: ReadonlyArray<{
  chiave: ParteAccendibile
  testo: string
  aiuto: string
}> = ([
  'pagina', 'scelte', 'opzioni', 'filtri', 'periodo', 'riferimenti', 'ricerca', 'visibili',
] as const).map((chiave) => ({
  chiave,
  ...testi().parti[chiave],
}))

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

/** Tutte spente: il «non dirgli niente», scritto dalla scorciatoia `Niente`. */
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
 * I tre modi di tutti i giorni in cima al menu: tutto, niente, solo dove sono.
 * La riga è spuntata quando il contesto è esattamente quello.
 */
export const SCORCIATOIE: ReadonlyArray<{
  chiave: 'tutto' | 'niente' | 'solo-pagina'
  testo: string
  aiuto: string
  parti: PartiContesto
}> = [
  { chiave: 'tutto', ...testi().scorciatoie.tutto, parti: PARTI_INTERE },
  {
    chiave: 'solo-pagina',
    ...testi().scorciatoie.soloPagina,
    parti: { ...PARTI_SPENTE, pagina: true, periodo: true },
  },
  { chiave: 'niente', ...testi().scorciatoie.niente, parti: PARTI_SPENTE },
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
 * Le tendine che questa pagina ha, con il loro valore: quelle che la barra
 * mostra adesso, lette dalla veduta.
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
 * Quanto di un gruppo entra davvero nel contesto: tutto, parte (acceso con una
 * tendina spenta dentro) o niente.
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
 * Il gruppo acceso o spento in un gesto. Accendere accende tutte le sue
 * tendine; spegnere lascia le singole com'erano.
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
 * La versione della forma delle parti nelle preferenze: le due forme hanno
 * gli stessi campi ma leggono `pagina: false` in modo diverso.
 */
const FORMA = 2

/** Le parti come si scrivono nelle preferenze: con il segno della forma. */
export function daRicordare (parti: PartiContesto): PartiContesto & { v: number } {
  return { ...parti, v: FORMA }
}

/**
 * Il nome di adesso di una tendina scritta in un'altra lingua: le spente si
 * ricordano per nome, e «Kurs» spento in tedesco deve restare spento in italiano.
 */
const NOME_DI_ADESSO = new Map<string, string>(
  testiVeduta.tutte().flatMap(({ campi }) =>
    Object.entries(campi).map(([chiave, nome]): [string, string] =>
      [nome, testiVeduta().campi[chiave as keyof typeof campi]])),
)

/**
 * Le parti ricordate, rimesse in forma: `true` o assenti valgono «tutto acceso»,
 * `false` «tutto spento». Quel che non si riconosce torna intero, perché un
 * campo storto non deve zittire l'assistente per sempre.
 */
export function partiValide (ricordate: unknown): PartiContesto {
  const mancante = ricordate === undefined || ricordate === null
  if (ricordate === true || mancante) return { ...PARTI_INTERE }
  if (ricordate === false) return { ...PARTI_SPENTE }
  if (typeof ricordate !== 'object') return { ...PARTI_INTERE }

  const lette = ricordate as Record<string, unknown>
  // Nella forma di prima `pagina: false` voleva dire «niente del tutto»: rilette
  // con le regole di adesso, manderebbero quasi tutto a chi aveva zittito.
  if (lette.v !== FORMA && lette.pagina === false) return { ...PARTI_SPENTE }
  const fuori = { ...PARTI_INTERE }
  for (const parte of PARTI) {
    const valore = lette[parte.chiave]
    if (typeof valore === 'boolean') fuori[parte.chiave] = valore
  }
  const spente = lette.tendineSpente
  if (Array.isArray(spente)) {
    fuori.tendineSpente = spente
      .filter((nome): nome is string => typeof nome === 'string')
      .map((nome) => NOME_DI_ADESSO.get(nome) ?? nome)
  }
  return fuori
}

/**
 * Quante cose sono spente, per la testata («contesto ridotto (3)»): le tendine
 * contano una per una.
 */
export function parteSpente (parti: PartiContesto): number {
  return PARTI.filter((parte) => !parti[parte.chiave]).length + parti.tendineSpente.length
}

/**
 * La formula di quel che resta fuori da una tendina («… e altre 7 non
 * elencate»): la scrive `ui/viewpoint.ts` e la riconosce il menu, quindi sta
 * in un posto solo.
 */
const TESTA_NON_ELENCATE = testi().testaNonElencate
const CODA_NON_ELENCATE = testi().codaNonElencate

/** Il segnaposto da mettere in fondo alle alternative che si mandano. */
export function nonElencate (quante: number): { valore: string, id: null } {
  return { valore: `${TESTA_NON_ELENCATE}${quante}${CODA_NON_ELENCATE}`, id: null }
}

/**
 * Se quella voce è il segnaposto e non un'alternativa: `id: null` non basta
 * («Anno intero», «Tutti i corsi» non hanno id), si guarda la formula.
 */
function eNonElencate (opzione: { valore: string, id: string | null }): boolean {
  return opzione.id === null &&
    opzione.valore.startsWith(TESTA_NON_ELENCATE) &&
    opzione.valore.endsWith(CODA_NON_ELENCATE)
}

/** Le prime voci di un elenco, e quante ne restano: «Corso, Periodo, e altre 2». */
function primeDi (voci: readonly string[]): string {
  const quante = 2
  const dette = voci.slice(0, quante).join(', ')
  const resto = voci.length - Math.min(quante, voci.length)
  return resto > 0 ? testi().eAltre(dette, resto) : dette
}

/**
 * Che cosa c'è dentro ogni parte adesso, scritto dal menu sotto ogni voce
 * («Corso: I MEC A — Matematica», «25 persone in formazione»), così si sceglie
 * guardando. Una parte vuota dice «niente qui» invece di sparire.
 */
export function riassunti (veduta: ContestoAssistente): Record<ParteAccendibile, string> {
  const niente = testi().nienteQui
  const voci = [...veduta.scelte, ...veduta.filtri]
  // Le alternative si contano senza il segnaposto, che non è una cosa da togliere.
  const quanteAlternative = (v: VoceContesto) =>
    (v.opzioni ?? []).filter((o) => !eNonElencate(o)).length
  const conOpzioni = voci.filter((v) => quanteAlternative(v) > 0)
  // Gli id sono i riferimenti risolti più quelli appesi alle voci delle tendine.
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
    riferimenti: quantiId === 0 ? niente : testi().daPassare(quantiId),
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
 * Quale id porta ogni tendina, per nome in tutte le lingue
 * (`viewpoint.testi.ts`): spegnere «Corso» deve togliere anche `corsoId`, che
 * il prompt dà agli attrezzi. Rinominata una tendina, il suo id torna a
 * passare, e si vede. `allievoId`, `pianoId` e `valutazioneId` non hanno
 * tendina: li comanda l'interruttore degli id.
 */
const ID_DELLA_TENDINA = new Map<string, keyof RiferimentiContesto>(
  testiVeduta.tutte().flatMap(({ campi }): Array<[string, keyof RiferimentiContesto]> => [
    [campi.annoScolastico, 'annoId'],
    [parole().periodo, 'semestreId'],
    [campi.classe, 'classeId'],
    [campi.corso, 'corsoId'],
    [campi.lezioneDelCorso, 'lezioneId'],
  ]),
)

/**
 * Gli id da mandare, presi dalle tendine rimaste: riga leggibile e id vengono
 * dalla stessa voce e non divergono. Si guardano solo le tendine che la pagina
 * ha; le altre non si possono spegnere, e se non devono partire lo decide
 * `ui/viewpoint.ts`.
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
 * La veduta come chi chiede ha deciso di raccontarla, o `null` se tutte le
 * parti sono spente. Ogni parte toglie un pezzo intero: quel che resta è vero,
 * e il modello che non trova il corso chiede invece di sceglierne uno. Una
 * tendina spenta porta via anche il suo id (`riferimentiDi`).
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

  // Una tendina spenta resta spenta anche a gruppo acceso; un gruppo spento le
  // porta via tutte.
  const accese = (gruppo: 'scelte' | 'filtri', voci: VoceContesto[]) =>
    voci.filter((voce) => tendinaAccesa(parti, { gruppo, campo: voce.campo }))

  // Le tendine rimaste si contano una volta: da lì escono sia le righe sia gli id.
  const scelteVive = accese('scelte', veduta.scelte)
  const filtriVivi = accese('filtri', veduta.filtri)

  return {
    ...veduta,
    // Spenta la pagina se ne va anche `vista`, lo stesso fatto col nome del codice.
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
    // Spenti gli id, l'elenco a schermo resta ma senza id: il numero è un fatto
    // sulla pagina, gli identificatori sarebbero la rubrica della classe.
    visibili: parti.visibili
      ? veduta.visibili && (parti.riferimenti ? veduta.visibili : { ...veduta.visibili, ids: [] })
      : null,
  }
}
