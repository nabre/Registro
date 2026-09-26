// La scheda personale: le presenze.
// I numeri di una persona in un corso (calcolati come nel resto del registro),
// la matrice, il quadro del periodo e le giornate storte.

import {
  SIGLE_PRESENZA,
  confrontaLezioni,
  contaUd,
  contaComeAssenza,
  siglaPresenza,
  unitaDidattiche,
  segnato,
  statiAllineati,
  statoDellOra,
} from '../../../domain/calculations.js'
import {
  matriceCorso,
  quotaAssenza,
  quotaPresenza,
  type RigaCorso,
} from '../../../domain/courseMatrix.js'
import { udPrevisteDaOrario } from '../../../domain/timetable.js'
import { oltreSoglia } from '../../../domain/alerts.js'
import type { FaseAssenze } from '../../../domain/absences.js'
import { percento } from '../../../domain/text.js'
import { bilancioSegni, celleDiAllievo } from '../../../domain/observations.js'
import {
  giorniBrevi,
  formattaData,
  giornoSettimana,
  inizioSettimana,
  minutiDaOra,
  siglaUd,
} from '../../../domain/dates.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import { minuscolo } from '../../../i18n/index.js'
import type {
  Allievo,
  Corso,
  Iso,
  Lezione,
  Ora,
  Presenza,
  StatoPresenza,
} from '../../../domain/models.js'
import {
  collegamento,
  pastiglia,
  quieto,
  scheda,
  titoloGruppo,
  type TonoPastiglia,
  tonoPresenza,
} from '../../components/base.js'
import { sintesiIncassata } from '../../components/filters.js'
import { h, type Figlio } from '../../dom.js'
import {
  aggiorna,
  annoCorrente,
  lezioniDiCorso,
  nelSemestreScelto,
  nomeMateria,
  nomeSemestreScelto,
  semestreScelto,
  stato,
} from '../../state.js'
import { tabella } from '../../components/table.js'
import { riquadroTema, nienteQui } from './common.js'
import { testi } from './attendance.testi.js'

/**
 * Il tono di uno stato di presenza quando lo si legge in un elenco; il nome è
 * quello del lessico, in minuscolo.
 */
const TONI_PRESENZA: Partial<Record<StatoPresenza, 'negativo' | 'attenzione' | 'quiete'>> = {
  assente: 'negativo',
  ritardo: 'attenzione',
  esonerato: 'quiete',
}

/** Come si chiama uno stato di presenza dentro una riga: «assente», «in ritardo». */
function nomePresenza (stato: StatoPresenza): string {
  return minuscolo(lessico().presenze[stato] ?? stato)
}

/**
 * I numeri di presenza di una persona in un corso. Chiama `matriceCorso` con un
 * allievo solo, così la riga è identica a quella della matrice del corso, dei
 * rapporti e delle segnalazioni.
 */
export function presenzeDelCorso (allievo: Allievo, corso: Corso): RigaCorso | null {
  const anno = annoCorrente()
  const semestre = semestreScelto()
  // Le annullate restano fuori, come nelle segnalazioni.
  const tenute = nelSemestreScelto(lezioniDiCorso(corso.id)).filter((l) => l.stato !== 'annullata')
  const matrice = matriceCorso(
    [allievo],
    tenute,
    [],
    stato.registro.impostazioni,
    // Il cento per cento sono le ore previste dall'orario nel periodo, non quelle
    // a calendario: il riferimento della matrice e del rapporto.
    udPrevisteDaOrario(
      anno,
      corso,
      semestre?.inizio ?? anno?.inizio ?? '',
      semestre?.fine ?? anno?.fine ?? '',
      stato.registro.impostazioni.minutiUd,
      stato.registro.lezioni,
    ),
  )
  return matrice.righe[0] ?? null
}

/** I conti dei corsi sommati: quel che vale per la persona, non per una materia. */
function sommaPresenze (righe: RigaCorso[]) {
  const somma = (quale: (riga: RigaCorso) => number) =>
    righe.reduce((totale, riga) => totale + quale(riga), 0)
  const udPreviste = somma((r) => r.udPreviste)
  const udConAppello = somma((r) => r.udConAppello)
  const udPresenza = somma((r) => r.udPresenza)
  const udAssenza = somma((r) => r.udAssenza)
  const udEsonero = somma((r) => r.udEsonero)
  // L'esonero sta fuori dal rapporto, non solo fuori dal numeratore.
  const udContate = udConAppello - udEsonero

  return {
    udPreviste,
    udConAppello,
    udPresenza,
    udAssenza,
    udEsonero,
    // I ritardi si contano per ora e non per UD.
    ritardi: somma((r) => r.ritardi),
    // Le due quote le calcola `domain/courseMatrix.ts`, come per le righe per
    // corso (assenza tagliata fra zero e uno, come nel rapporto).
    presenza: quotaPresenza(udPresenza, udContate),
    assenza: quotaAssenza(udAssenza, udPreviste, false),
  }
}

/** Di che materia era un'ora, per la riga del diario. */
function nomeMateriaDi (lezione: Lezione, corsi: Corso[]): string {
  const corso = corsi.find((c) => c.id === lezione.corsoId)
  return corso ? nomeMateria(corso.materiaId) || corso.titolo : testi().senzaCorso
}

/** A che punto è una pratica di assenze, quando la si legge in un elenco. */
export const FASI: Record<FaseAssenze, { nome: string; tono: TonoPastiglia }> = {
  fuori: { nome: testi().fasi.fuori, tono: 'quiete' },
  'da-spedire': { nome: testi().fasi['da-spedire'], tono: 'attenzione' },
  'in-attesa': { nome: testi().fasi['in-attesa'], tono: 'informativo' },
  firmato: { nome: testi().fasi.firmato, tono: 'positivo' },
}

/** Una giornata di scuola vista da una persona sola, UD per UD. */
interface CasellaPresenza {
  stato: StatoPresenza
  lezione: Lezione
  inizio: Ora
  fine: Ora
  materia: string
}

interface RigaPresenze {
  data: Iso
  /**
   * Le caselle della giornata per ora d'inizio. Una mappa e non un elenco: le
   * colonne della matrice sono ore del giorno, non posizioni.
   */
  caselle: Map<Ora, CasellaPresenza>
  /** Le materie della giornata, nell'ordine in cui si sono tenute. */
  materie: string[]
  udPerse: number
}

/**
 * Quale stato vince quando due UD cominciano alla stessa ora (corsi
 * sovrapposti): il peggiore.
 */
const GRAVITA: StatoPresenza[] = ['assente', 'ritardo', 'esonerato', 'presente', 'non-impostato']

function peggiore (a: CasellaPresenza, b: CasellaPresenza): CasellaPresenza {
  return GRAVITA.indexOf(a.stato) <= GRAVITA.indexOf(b.stato) ? a : b
}

/** Le giornate del periodo, una riga per data anche con più ore, con le UD in fila. */
function righePresenze (allievo: Allievo, corsi: Corso[], lezioni: Lezione[]): RigaPresenze[] {
  const perGiorno = new Map<Iso, RigaPresenze>()
  const ordinate = [...lezioni]
    // Le annullate restano fuori, come nell'elenco sotto.
    .filter((lezione) => lezione.stato !== 'annullata')
    .map((lezione) => ({
      lezione,
      unita: unitaDidattiche(lezione, stato.registro.impostazioni.minutiUd),
    }))
    // L'ordine del dominio, `id` compreso, così due ore che cominciano insieme
    // non si scambiano fra un ridisegno e l'altro.
    .sort((a, b) => confrontaLezioni(a.lezione, b.lezione))

  for (const { lezione, unita } of ordinate) {
    const presenza = lezione.presenze.find((p) => p.allievoId === allievo.id)
    const stati = statiAllineati(presenza, Math.max(presenza?.stati.length ?? 0, unita.length))
    const riga = perGiorno.get(lezione.data) ?? {
      data: lezione.data,
      caselle: new Map<Ora, CasellaPresenza>(),
      materie: [],
      udPerse: 0,
    }
    const materia = nomeMateriaDi(lezione, corsi)
    if (materia && !riga.materie.includes(materia)) riga.materie.push(materia)
    for (const [indice, ud] of unita.entries()) {
      const casella: CasellaPresenza = {
        stato: stati[indice] ?? 'non-impostato',
        lezione,
        inizio: ud.inizio,
        fine: ud.fine,
        materia,
      }
      const gia = riga.caselle.get(ud.inizio)
      riga.caselle.set(ud.inizio, gia ? peggiore(gia, casella) : casella)
    }
    riga.udPerse += stati.filter(contaComeAssenza).length
    perGiorno.set(lezione.data, riga)
  }

  return [...perGiorno.values()].sort((a, b) => a.data.localeCompare(b.data))
}

/** Quel che la casella dice a voce, per chi ci passa sopra o la legge con lo schermo. */
function raccontoCasella (casella: CasellaPresenza): string {
  return [
    formattaData(casella.lezione.data, 'giorno'),
    `${casella.inizio}–${casella.fine}`,
    casella.materia,
    nomePresenza(casella.stato),
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * La matrice delle presenze: una giornata per riga, una UD per casella, per
 * vedere la forma del periodo (p. es. sempre il lunedì alla prima ora).
 * Caselle con le sigle dell'appello e del verbale (`P`, `X`, `R`, `E`, `-`) e
 * il colore della gravità. Le colonne sono ore d'inizio in ordine di orologio;
 * dove quel giorno a quell'ora non c'era lezione la casella resta vuota.
 */
function matricePresenze (allievo: Allievo, corsi: Corso[], lezioni: Lezione[]): Figlio {
  const righe = righePresenze(allievo, corsi, lezioni)
  if (righe.length === 0) return null
  const t = testi()

  // Le colonne: solo le ore in cui il periodo ha almeno una UD, in ordine di orologio.
  const orari = [...new Set(righe.flatMap((riga) => [...riga.caselle.keys()]))].sort(
    (a, b) => minutiDaOra(a) - minutiDaOra(b),
  )
  // Le materie a destra solo quando i corsi sono più d'uno.
  const mostraMaterie = corsi.length > 1

  const casella = (riga: RigaPresenze, ora: Ora): HTMLElement => {
    const voce = riga.caselle.get(ora)
    if (!voce) {
      // A quell'ora, quel giorno, non c'era lezione.
      return h(
        'td',
        { class: 'matrice-presenze__cella' },
        h('span', { class: 'matrice-presenze__segno matrice-presenze__segno--niente' }),
      )
    }
    const racconto = raccontoCasella(voce)
    return h(
      'td',
      { class: 'matrice-presenze__cella' },
      h(
        'button',
        {
          class: ['matrice-presenze__segno', `matrice-presenze__segno--${voce.stato}`],
          type: 'button',
          attr: { title: racconto, 'aria-label': racconto },
          onclick: () => aggiorna({ vista: 'lezione', lezioneId: voce.lezione.id }),
        },
        siglaPresenza(voce.stato),
      ),
    )
  }

  return h(
    'section',
    { class: 'matrice-presenze' },
    titoloGruppo(t.giornoPerGiorno, righe.length),
    tabella({
      classi: { telaio: 'matrice-presenze__telaio', tabella: 'matrice-presenze__tabella' },
      intestazione: [
        h('th', { class: 'matrice-presenze__angolo', attr: { scope: 'col' } }, t.giorno),
        ...orari.map((ora) =>
          h('th', { class: 'matrice-presenze__ora', attr: { scope: 'col' } }, ora),
        ),
        mostraMaterie
          ? h('th', { class: 'matrice-presenze__materie', attr: { scope: 'col' } }, t.materie)
          : null,
      ],
      righe: [
        ...righe.map((riga, indice) =>
          h(
            'tr',
            {
              class: [
                // Un filo sopra la prima riga di ogni settimana.
                indice > 0 &&
                  inizioSettimana(riga.data) !== inizioSettimana(righe[indice - 1].data) &&
                  'matrice-presenze__riga--settimana',
                riga.udPerse > 0 && 'matrice-presenze__riga--storta',
              ],
            },
            h(
              'th',
              { class: 'matrice-presenze__giorno', attr: { scope: 'row' } },
              h('span', { class: 'matrice-presenze__nome-giorno' }, giorniBrevi()[giornoSettimana(riga.data) - 1]),
              h('span', { class: 'matrice-presenze__data' }, formattaData(riga.data, 'corto')),
            ),
            ...orari.map((ora) => casella(riga, ora)),
            mostraMaterie
              ? h(
                  'td',
                  { class: 'matrice-presenze__materie testo-quieto' },
                  riga.materie.join(' · '),
                )
              : null,
          ),
        ),
      ],
    }),
    h(
      'ul',
      { class: 'legenda-presenze' },
      ...SIGLE_PRESENZA.map((voce) =>
        h(
          'li',
          null,
          h(
            'span',
            { class: ['legenda-presenze__segno', `matrice-presenze__segno--${voce.valore}`] },
            voce.sigla,
          ),
          nomePresenza(voce.valore),
        ),
      ),
    ),
  )
}

/**
 * Il quadro del periodo: i numeri di tutte le materie insieme e la forma delle
 * giornate. Due percentuali: la presenza sta sulle UD con appello; l'assenza
 * sulle UD previste dall'orario (la cifra del rapporto e della segnalazione).
 * L'intestazione dichiara entrambe.
 */
export function quadroDelPeriodo (
  allievo: Allievo,
  corsi: Corso[],
  lezioni: Lezione[],
): HTMLElement {
  const perCorso = corsi
    .map((corso) => ({ corso, riga: presenzeDelCorso(allievo, corso) }))
    .filter((voce): voce is { corso: Corso; riga: RigaCorso } => voce.riga !== null)
  const conti = sommaPresenze(perCorso.map((voce) => voce.riga))
  const soglia = stato.registro.impostazioni.sogliaAssenza
  // I segni della matrice di tutte le materie insieme: qui solo il conto, il
  // dettaglio sta nel box della materia.
  const segni = bilancioSegni(celleDiAllievo(lezioni, allievo.id))
  const t = testi()

  const numeri = sintesiIncassata(
    { etichetta: t.udPreviste, valore: String(conti.udPreviste) },
    { etichetta: t.udConAppello, valore: String(conti.udConAppello) },
    {
      // Stesso nome e denominatore del riquadro della pagina Corsi: ore con appello,
      // meno gli esoneri.
      etichetta: t.presenzaSuAppello,
      valore: percento(conti.presenza),
      tono: tonoPresenza(conti.presenza),
    },
    {
      // Quanto ha perso di quel che era in programma: la cifra del rapporto.
      etichetta: t.udDiAssenzaSu(conti.udPreviste),
      valore: `${conti.udAssenza} · ${percento(conti.assenza)}`,
      tono: oltreSoglia(soglia, conti.assenza) ? 'negativo' : 'neutro',
    },
    // Solo quando ce ne sono.
    conti.ritardi > 0 && {
      etichetta: t.oreConRitardo,
      valore: String(conti.ritardi),
      tono: 'attenzione' as const,
    },
    conti.udEsonero > 0 && {
      // L'esonero a parte: è un'autorizzazione, non un'ora frequentata.
      etichetta: t.udDiEsonero,
      valore: String(conti.udEsonero),
      tono: 'quiete' as const,
    },
    segni.positivi > 0 && {
      etichetta: t.segnatoBene,
      valore: String(segni.positivi),
      tono: 'positivo' as const,
    },
    segni.negativi > 0 && {
      etichetta: t.segnatoMale,
      valore: String(segni.negativi),
      tono: 'negativo' as const,
    },
  )

  return scheda({
    classe: 'scheda--intera',
    titolo: t.nelComplesso,
    sottotitolo: nomeSemestreScelto(),
    aiuto: t.aiutoComplesso,
    contenuto:
      conti.udPreviste === 0 && conti.udConAppello === 0
        ? quieto(t.nienteNelPeriodoScelto)
        : h('div', null, numeri, matricePresenze(allievo, corsi, lezioni)),
  })
}

/** Una giornata in cui è successo qualcosa (assenza, ritardo, esonero); le regolari non si elencano. */
interface GiornataStorta {
  lezione: Lezione
  presenza: Presenza
  stati: StatoPresenza[]
}

export function giornateStorte (allievo: Allievo, lezioni: Lezione[]): GiornataStorta[] {
  return (
    lezioni
      // Contano le ore con l'appello fatto, non quelle segnate svolte (lo stato si
      // dimentica di aggiornarlo). Le annullate restano fuori.
      .filter((lezione) => lezione.stato !== 'annullata')
      .map((lezione) => {
        const presenza = lezione.presenze.find((p) => p.allievoId === allievo.id)
        // Gli stati portati alla lunghezza dell'ora, come nella matrice e nei conti del corso.
        const stati = statiAllineati(
          presenza,
          Math.max(
            presenza?.stati.length ?? 0,
            contaUd(lezione, stato.registro.impostazioni.minutiUd),
          ),
        )
        return { lezione, presenza, stati }
      })
      .filter((voce): voce is GiornataStorta => Boolean(voce.presenza) && voce.stati.some(segnato))
      .sort((a, b) => b.lezione.data.localeCompare(a.lezione.data))
  )
}

/** L'elenco delle giornate storte: una riga per giorno, la data come ancora. */
function elencoGiornate (voci: GiornataStorta[]): Figlio {
  const t = testi()
  return h(
    'ul',
    { class: 'diario' },
    ...voci.map(({ lezione, presenza, stati }) => {
      // Nel diario l'ora si riassume in uno stato solo; le UD si guardano aprendola.
      const sintesi = statoDellOra(stati)
      // Le UD perse sono solo le «assente»: ritardo ed esonero sono presenze.
      const perse = stati.filter(contaComeAssenza).length
      const voce = { nome: nomePresenza(sintesi), tono: TONI_PRESENZA[sintesi] ?? 'quiete' }
      return h(
        'li',
        { class: 'diario__voce' },
        collegamento({
          testo: formattaData(lezione.data, 'giorno'),
          classe: 'diario__quando',
          al: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id }),
        }),
        pastiglia(voce.nome, voce.tono),
        // La materia è il nome del box; al suo posto le UD perse, e la colonna resta
        // anche vuota per tenere incolonnati minuti e nota.
        perse > 0
          ? h('span', { class: 'testo-quieto diario__cosa' }, t.udPerse(perse, stati.length))
          : h('span', { class: 'diario__cosa' }),
        presenza.minuti ? h('span', { class: 'testo-quieto' }, t.minuti(presenza.minuti)) : null,
        presenza.nota ? h('span', { class: 'diario__nota' }, presenza.nota) : null,
      )
    }),
  )
}

/** Le presenze di una materia: i suoi numeri, e le sue giornate storte. */
export function temaPresenze (riga: RigaCorso | null, storte: GiornataStorta[]): Figlio {
  const soglia = stato.registro.impostazioni.sogliaAssenza
  const t = testi()
  if (!riga) return riquadroTema(t.presenze, 0, nienteQui(t.nienteNelPeriodo))

  return riquadroTema(
    t.presenze,
    storte.length,
    h(
      'div',
      null,
      sintesiIncassata(
        // La soglia si applica corso per corso: qui la percentuale di questa materia sola.
        {
          etichetta: soglia > 0 ? t.assenzaSoglia(soglia) : t.assenza,
          valore: `${riga.udAssenza} ${siglaUd()} · ${percento(riga.assenza)}`,
          tono: oltreSoglia(soglia, riga.assenza) ? 'negativo' : 'neutro',
        },
        {
          etichetta: t.presenza,
          valore: percento(riga.presenza),
          tono: tonoPresenza(riga.presenza),
        },
        { etichetta: t.udPreviste, valore: t.suPreviste(riga.udConAppello, riga.udPreviste) },
        riga.ritardi > 0 && {
          etichetta: t.oreConRitardo,
          valore: String(riga.ritardi),
          tono: 'attenzione' as const,
        },
        riga.udEsonero > 0 && {
          etichetta: t.udDiEsonero,
          valore: String(riga.udEsonero),
          tono: 'quiete' as const,
        },
      ),
      storte.length === 0
        ? nienteQui(t.semprePresente)
        : elencoGiornate(storte),
    ),
  )
}
