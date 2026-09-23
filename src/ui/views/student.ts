// La scheda personale: tutto quel che il registro sa di una persona sola.
//
// È la vista che mancava. I dati c'erano già tutti — presenze nelle lezioni,
// voti nei momenti, osservazioni sparse, documenti nel fascicolo — ma stavano
// in quattro posti diversi, e il momento in cui servono è uno solo: il
// colloquio. «Come va Damiano?» non si risponde aprendo quattro schede.
//
// Non si modifica niente da qui, salvo l'anagrafica: è una vista da leggere ad
// alta voce con un genitore davanti, e ogni comando in più è un comando che si
// preme per sbaglio.

import {
  SIGLE_PRESENZA,
  confrontaLezioni,
  contaUd,
  contaComeAssenza,
  siglaPresenza,
  unitaDidattiche,
  formattaVoto,
  mediaAllievo,
  notaFineSemestre,
  nomeCompleto,
  ordinaAllievi,
  segnato,
  statiAllineati,
  statoDellOra,
} from '../../domain/calculations.js'
import { matriceCorso, quotaAssenza, quotaPresenza, type RigaCorso } from '../../domain/courseMatrix.js'
import { udPrevisteDaOrario } from '../../domain/timetable.js'
import { oltreSoglia } from '../../domain/alerts.js'
import { consegneDocumento, haFatto } from '../../domain/assignments.js'
import {
  faseRiga,
  nomePeriodo,
  rapportiDetti,
  rigaDi,
  vergini,
  type FaseAssenze,
} from '../../domain/absences.js'
import {
  CONTATTI_TELEFONICI,
  ETICHETTE_TELEFONO,
  Maiuscola,
  PERSONE,
  PIF,
  Uno,
  del,
  un,
} from '../../domain/lexicon.js'
import { anniCompiuti } from '../../domain/birthdays.js'
import { bilancioSegni, celleDiAllievo, contiPerAspetto } from '../../domain/observations.js'
import { testoDiVoce, vociDiLista } from '../../domain/lists.js'
import {
  GIORNI_BREVI,
  formattaData,
  giornoSettimana,
  inizioSettimana,
  minutiDaOra,
} from '../../domain/dates.js'
import {
  condivisioni,
  coordinataDi,
  distanzaKm,
  indirizzoDi,
  rubricaDi,
  scriviCoordinate,
  scriviDistanza,
  segniDiAllievo,
  SEDE,
  type SegnoMappa,
} from '../../domain/map.js'
import type {
  Allievo,
  Classe,
  ContattoTelefonico,
  Corso,
  Iso,
  Lezione,
  MomentoValutazione,
  Ora,
  Presenza,
  StatoPresenza,
} from '../../domain/models.js'
import { CONTATTI, telefoniDi } from '../../domain/phones.js'
import { scriviIndirizzo } from '../../domain/addresses.js'
import {
  pastiglia,
  pulsante,
  scheda,
  selettore,
  statoVuoto,
  testataVista,
  titoloGruppo,
  tonoPresenza,
  type TonoPastiglia,
} from '../components/base.js'
import { sintesiIncassata } from '../components/filters.js'
import { recapitoPremibile, type GenereRecapito } from '../components/contacts.js'
import { notifica } from '../components/notifications.js'
import { riquadroMappa } from '../components/map.js'
import { nomeSegno, segnoFermo } from '../components/marks.js'
import { icona, type NomeIcona } from '../components/icons.js'
import { h, type Figlio } from '../dom.js'
import { moduloAllievo } from '../forms.js'
import { porzionePersona, porzioniPersona } from '../tabs.js'
import { mostraSullaMappa } from './map.js'
import { azione } from '../bridge.js'
import {
  aggiorna,
  annoCorrente,
  classeDellAllievo,
  corsiDi,
  fascicoloDi,
  lezioniDi,
  lezioniDiCorso,
  nelSemestreScelto,
  nomeMateria,
  nomeSemestreScelto,
  semestreScelto,
  stato,
  uriDato,
  valutazioniDi,
  type SchedaPersona,
} from '../state.js'

/** Come si chiama uno stato di presenza quando lo si legge in un elenco. */
const PRESENZE: Record<string, { nome: string; tono: 'negativo' | 'attenzione' | 'quiete' }> = {
  assente: { nome: 'assente', tono: 'negativo' },
  ritardo: { nome: 'in ritardo', tono: 'attenzione' },
  esonerato: { nome: 'esonerato', tono: 'quiete' },
}

/**
 * I numeri di presenza di una persona in un corso, fatti dove li fa tutto il
 * resto del registro.
 *
 * `matriceCorso` è la stessa funzione che disegna la matrice del corso, riempie
 * i rapporti da controfirmare e decide chi è oltre la soglia: chiamandola con
 * un allievo solo si ottiene la sua riga, identica a quella che si legge
 * altrove. Prima questa pagina si faceva i conti per conto suo — tutti i corsi
 * della classe in un mucchio, e la percentuale sulle sole UD con l'appello
 * fatto — e mostrava un numero che non si ritrovava in nessun altro punto del
 * programma: la stessa persona era al 12% qui e al 19% sul foglio stampato.
 */
function presenzeDelCorso (allievo: Allievo, corso: Corso): RigaCorso | null {
  const anno = annoCorrente()
  const semestre = semestreScelto()
  // Le annullate restano fuori: un'ora che non si è tenuta non è un'ora in cui
  // qualcuno poteva mancare. È la stessa riga che filtra le segnalazioni.
  const tenute = nelSemestreScelto(lezioniDiCorso(corso.id)).filter((l) => l.stato !== 'annullata')
  const matrice = matriceCorso(
    [allievo],
    tenute,
    [],
    stato.registro.impostazioni,
    // Il cento per cento sono le ore che l'orario prevede nel periodo, non
    // quelle già a calendario: è il riferimento della matrice e del rapporto.
    udPrevisteDaOrario(
      anno,
      corso,
      semestre?.inizio ?? anno?.inizio ?? '',
      semestre?.fine ?? anno?.fine ?? '',
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
    // I ritardi si contano per ora e non per UD: chi arriva tardi arriva tardi
    // una volta, anche se il blocco è di quattro unità.
    ritardi: somma((r) => r.ritardi),
    // Le due quote le calcola `domain/courseMatrix.ts`, che è lo stesso posto
    // da cui escono le righe per corso qui sopra. Erano ricopiate, e la copia
    // dell'assenza aveva perso il taglio fra zero e uno: per chi aveva fatto
    // più ore di quante l'orario ne prevedesse — un recupero, una supplenza —
    // questo riquadro scriveva «131%» mentre il rapporto stampato, che passa
    // di là, scriveva «100%».
    presenza: quotaPresenza(udPresenza, udContate),
    assenza: quotaAssenza(udAssenza, udPreviste, false),
  }
}

/** Una percentuale come si scrive nel registro, o un trattino se non c'è. */
function percento (quota: number | null): string {
  return quota === null ? '—' : `${Math.round(quota * 100)}%`
}

/** Di che materia era un'ora, per la riga del diario. */
function nomeMateriaDi (lezione: Lezione, corsi: Corso[]): string {
  const corso = corsi.find((c) => c.id === lezione.corsoId)
  return corso ? nomeMateria(corso.materiaId) || corso.titolo : 'senza corso'
}

/** A che punto è una pratica di assenze, quando la si legge in un elenco. */
const FASI: Record<FaseAssenze, { nome: string; tono: TonoPastiglia }> = {
  fuori: { nome: 'niente da firmare', tono: 'quiete' },
  'da-spedire': { nome: 'da spedire', tono: 'attenzione' },
  'in-attesa': { nome: 'in attesa di firma', tono: 'informativo' },
  firmato: { nome: 'firmato', tono: 'positivo' },
}

/**
 * Una giornata di scuola vista da una persona sola, UD per UD.
 *
 * Le ore di un giorno sono più d'una e non raccontano la stessa cosa: due UD
 * perse di matematica e un ritardo in italiano sono un giorno solo per chi
 * guarda, e si leggono insieme.
 */
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
   * Le caselle della giornata, per ora d'inizio.
   *
   * Una mappa e non un elenco, ed è quel che tiene in piedi la matrice: le
   * colonne sono ore del giorno — le 08:20, le 09:10 — e non posizioni. Messe
   * in fila, la prima UD di un giorno che comincia alle 10:00 finiva nella
   * stessa colonna della prima UD di un giorno che comincia alle 08:20, e due
   * ore diverse incolonnate raccontano una regolarità che non c'è: la colonna
   * «sempre assente» non era un'ora, era «la prima ora di quel che capitava».
   */
  caselle: Map<Ora, CasellaPresenza>
  /** Le materie della giornata, nell'ordine in cui si sono tenute. */
  materie: string[]
  udPerse: number
}

/**
 * Quale dei due stati conta, quando due UD cominciano alla stessa ora.
 *
 * Capita con due corsi sovrapposti in orario — mezza classe in laboratorio —
 * e la casella è una sola: vince il peggio, perché è quel che in una scheda da
 * leggere a un colloquio non si può perdere per strada.
 */
const GRAVITA: StatoPresenza[] = ['assente', 'ritardo', 'esonerato', 'presente', 'non-impostato']

function peggiore (a: CasellaPresenza, b: CasellaPresenza): CasellaPresenza {
  return GRAVITA.indexOf(a.stato) <= GRAVITA.indexOf(b.stato) ? a : b
}

/**
 * Le giornate del periodo, una riga per data, con le UD in fila.
 *
 * Un giorno solo nella mappa anche quando le ore sono tre: chi guarda una
 * scheda personale ragiona per giornate — «il lunedì non c'è mai» — e tre
 * righe per lo stesso lunedì sono tre righe da rimettere insieme a mente.
 */
function righePresenze (allievo: Allievo, corsi: Corso[], lezioni: Lezione[]): RigaPresenze[] {
  const perGiorno = new Map<Iso, RigaPresenze>()
  const ordinate = [...lezioni]
    // Le annullate restano fuori come nell'elenco qui sotto: ore non sono, e
    // una casella in mezzo alla riga si legge come un'ora che c'era.
    .filter((lezione) => lezione.stato !== 'annullata')
    .map((lezione) => ({ lezione, unita: unitaDidattiche(lezione) }))
    // L'ordine è quello del dominio, `id` compreso: la copia scritta qui
    // pareggiava su data e ora, e due ore che cominciano insieme si
    // scambiavano di posto fra un ridisegno e l'altro della scheda.
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
  const nome = SIGLE_PRESENZA.find((v) => v.valore === casella.stato)?.nome ?? casella.stato
  return [
    formattaData(casella.lezione.data, 'giorno'),
    `${casella.inizio}–${casella.fine}`,
    casella.materia,
    nome.toLocaleLowerCase('it-CH'),
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * La matrice delle presenze: una giornata per riga, una UD per casella.
 *
 * I numeri in cima dicono quanto si è perso e l'elenco sotto dice quali
 * giornate sono storte, una per riga scritta a parole. Nessuno dei due fa
 * vedere la *forma* del periodo: dodici UD perse sparse su quattro mesi e
 * dodici perse tutte di lunedì alla prima ora fanno la stessa percentuale e
 * sono due discorsi diversi, e a un colloquio è il secondo quello che conta.
 *
 * Qui ogni riga è un giorno con la sua data, e ogni casella è un'unità
 * didattica con la sua sigla — le stesse dell'appello e del verbale stampato,
 * `P`, `X`, `R`, `E`, `-` — così chi legge questa mappa e chi rilegge un PDF
 * vedono la stessa cosa.
 *
 * Le colonne sono **ore d'inizio**, non posizioni: una per ciascuna ora in cui
 * il periodo ha davvero una UD, in ordine di orologio. È la differenza fra una
 * matrice e un elenco messo in tabella — le 08:20 del lunedì stanno sopra le
 * 08:20 del giovedì, e la colonna che si riempie di rosso è un'ora vera, non
 * «la prima di quel giorno, qualunque fosse». Dove quel giorno a quell'ora non
 * c'era lezione la casella resta vuota, e il vuoto è informazione: l'orario di
 * questa persona non è quello degli altri giorni.
 *
 * Sigla *e* colore, non uno dei due: il colore si vede da lontano e dice la
 * gravità, la sigla si legge da vicino e dice esattamente che cosa — e con il
 * solo colore un esonero e un ritardo diventano due sfumature da indovinare.
 */
function matricePresenze (allievo: Allievo, corsi: Corso[], lezioni: Lezione[]): Figlio {
  const righe = righePresenze(allievo, corsi, lezioni)
  if (righe.length === 0) return null

  // Le ore in cui il periodo ha almeno una UD, in ordine di orologio: sono le
  // colonne, e non si inventano — un'ora che nessuno ha mai fatto sarebbe una
  // colonna vuota da cima a fondo.
  const orari = [...new Set(righe.flatMap((riga) => [...riga.caselle.keys()]))].sort(
    (a, b) => minutiDaOra(a) - minutiDaOra(b),
  )
  // Le materie a destra solo quando la classe ne ha più d'una: in un corso solo
  // sarebbe la stessa parola ripetuta ottanta volte.
  const mostraMaterie = corsi.length > 1

  const casella = (riga: RigaPresenze, ora: Ora): HTMLElement => {
    const voce = riga.caselle.get(ora)
    if (!voce) {
      // A quell'ora, quel giorno, non c'era lezione: non è una casella da
      // riempire, è un'ora che non esiste.
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
    titoloGruppo('Giorno per giorno', righe.length),
    h(
      'div',
      { class: 'matrice-presenze__telaio' },
      h(
        'table',
        { class: 'matrice-presenze__tabella' },
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            h('th', { class: 'matrice-presenze__angolo', attr: { scope: 'col' } }, 'giorno'),
            ...orari.map((ora) =>
              h('th', { class: 'matrice-presenze__ora', attr: { scope: 'col' } }, ora),
            ),
            mostraMaterie
              ? h('th', { class: 'matrice-presenze__materie', attr: { scope: 'col' } }, 'materie')
              : null,
          ),
        ),
        h(
          'tbody',
          null,
          ...righe.map((riga, indice) =>
            h(
              'tr',
              {
                class: [
                  // Una riga nuova di settimana prende un filo sopra: senza,
                  // ottanta righe di date si leggono come un blocco solo e per
                  // trovare «la settimana dopo Natale» si conta con il dito.
                  indice > 0 &&
                    inizioSettimana(riga.data) !== inizioSettimana(righe[indice - 1].data) &&
                    'matrice-presenze__riga--settimana',
                  riga.udPerse > 0 && 'matrice-presenze__riga--storta',
                ],
              },
              h(
                'th',
                { class: 'matrice-presenze__giorno', attr: { scope: 'row' } },
                h('span', { class: 'matrice-presenze__nome-giorno' }, GIORNI_BREVI[giornoSettimana(riga.data) - 1]),
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
        ),
      ),
    ),
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
          voce.nome.toLocaleLowerCase('it-CH'),
        ),
      ),
    ),
  )
}

/**
 * Il quadro del periodo: i numeri di tutte le materie insieme, e la forma che
 * hanno avuto le giornate.
 *
 * È l'unico riquadro della linguetta che non parla di una materia sola, ed è
 * giusto che ci sia: «quanto ha perso in tutto» e «di che forma sono le sue
 * assenze» sono domande sulla persona, e spezzate materia per materia non si
 * rispondono più — dodici UD perse sparse su quattro mesi e dodici perse tutte
 * di lunedì alla prima ora fanno la stessa percentuale e sono due discorsi
 * diversi, e a un colloquio è il secondo quello che conta.
 *
 * Le due percentuali sono due e non una, e la differenza non è un dettaglio:
 * la **presenza** sta sulle UD con l'appello fatto e dice come sta andando —
 * un'ora che nessuno ha spuntato non penalizza nessuno; l'**assenza** sta sulle
 * UD che l'orario prevede nel periodo ed è la cifra che finisce sul foglio da
 * controfirmare e che fa scattare la segnalazione. Scritte senza dirlo si
 * leggono come due numeri in contraddizione, e per questo l'intestazione le
 * dichiara tutte e due.
 */
function quadroDelPeriodo (allievo: Allievo, corsi: Corso[], lezioni: Lezione[]): HTMLElement {
  const perCorso = corsi
    .map((corso) => ({ corso, riga: presenzeDelCorso(allievo, corso) }))
    .filter((voce): voce is { corso: Corso; riga: RigaCorso } => voce.riga !== null)
  const conti = sommaPresenze(perCorso.map((voce) => voce.riga))
  const soglia = stato.registro.impostazioni.sogliaAssenza
  // I segni della matrice di tutte le materie insieme: qui non si dice in che
  // cosa — quello sta nel box della materia — si dice soltanto che ce ne sono,
  // perché è il numero che fa aprire il box giusto.
  const segni = bilancioSegni(celleDiAllievo(lezioni, allievo.id))

  const numeri = sintesiIncassata(
    { etichetta: 'UD previste', valore: String(conti.udPreviste) },
    { etichetta: 'UD con appello', valore: String(conti.udConAppello) },
    {
      // Stesso nome e stesso denominatore del riquadro della pagina Corsi: le
      // ore con l'appello fatto, meno gli esoneri. Detto, perché la colonna
      // «Presenza» delle tabelle sta invece sulle UD previste, e chi confronta
      // le due schermate deve sapere quale sta guardando.
      etichetta: 'presenza (ore con appello)',
      valore: percento(conti.presenza),
      tono: tonoPresenza(conti.presenza),
    },
    {
      // Quanto ha perso di quel che era in programma: è la cifra del rapporto,
      // e vederla qui prima di stamparlo evita la sorpresa.
      etichetta: `UD di assenza su ${conti.udPreviste}`,
      valore: `${conti.udAssenza} · ${percento(conti.assenza)}`,
      tono: oltreSoglia(soglia, conti.assenza) ? 'negativo' : 'neutro',
    },
    // Solo quando ce ne sono: una riga «0 ritardi» è rumore in tutti i casi
    // tranne quelli in cui è successo.
    conti.ritardi > 0 && {
      etichetta: 'ore con ritardo',
      valore: String(conti.ritardi),
      tono: 'attenzione' as const,
    },
    conti.udEsonero > 0 && {
      // L'esonero stava dentro le presenze e non si vedeva: è un'autorizzazione,
      // non un'ora frequentata, e vale la pena saperlo prima di un colloquio.
      etichetta: 'UD di esonero',
      valore: String(conti.udEsonero),
      tono: 'quiete' as const,
    },
    segni.positivi > 0 && {
      etichetta: 'segnato molto bene',
      valore: String(segni.positivi),
      tono: 'positivo' as const,
    },
    segni.negativi > 0 && {
      etichetta: 'segnato da migliorare',
      valore: String(segni.negativi),
      tono: 'negativo' as const,
    },
  )

  return scheda({
    classe: 'scheda--intera',
    titolo: 'Nel complesso',
    sottotitolo:
      `${nomeSemestreScelto()} · la presenza è sulle UD con l’appello fatto, ` +
      'l’assenza su quelle previste dall’orario',
    contenuto:
      conti.udPreviste === 0 && conti.udConAppello === 0
        ? h('p', { class: 'testo-quieto' }, 'Nessuna ora in programma nel periodo scelto.')
        : h('div', null, numeri, matricePresenze(allievo, corsi, lezioni)),
  })
}

/**
 * Una giornata in cui qualcosa è successo: un'assenza, un ritardo, un esonero.
 *
 * Le presenze regolari non si elencano — sono la norma, e un elenco di
 * duecento righe uguali nasconde le tre che contano.
 */
interface GiornataStorta {
  lezione: Lezione
  presenza: Presenza
  stati: StatoPresenza[]
}

function giornateStorte (allievo: Allievo, lezioni: Lezione[]): GiornataStorta[] {
  return (
    lezioni
      // Le ore che contano sono quelle con l'appello fatto, non quelle
      // dichiarate svolte: lo stato è la cosa che si dimentica di aggiornare, e
      // una giornata storta non deve sparire perché a fine ora nessuno ha
      // premuto «svolta». Le annullate restano fuori: ore non sono.
      .filter((lezione) => lezione.stato !== 'annullata')
      .map((lezione) => {
        const presenza = lezione.presenze.find((p) => p.allievoId === allievo.id)
        // Gli stati portati alla lunghezza dell'ora, come li allinea la matrice:
        // leggere il solo `stati` faceva dire «2 UD su 2» di un'ora che ne aveva
        // quattro, mentre i conti del corso ne contavano quattro.
        const stati = statiAllineati(
          presenza,
          Math.max(presenza?.stati.length ?? 0, contaUd(lezione)),
        )
        return { lezione, presenza, stati }
      })
      .filter((voce): voce is GiornataStorta => Boolean(voce.presenza) && voce.stati.some(segnato))
      .sort((a, b) => b.lezione.data.localeCompare(a.lezione.data))
  )
}

/** L'elenco delle giornate storte: una riga per giorno, la data come ancora. */
function elencoGiornate (voci: GiornataStorta[]): Figlio {
  return h(
    'ul',
    { class: 'diario' },
    ...voci.map(({ lezione, presenza, stati }) => {
      // Nel diario l'ora si riassume in uno stato solo: qui non c'è spazio per
      // quattro colonne, e quel che si cerca è la giornata storta — le UD si
      // guardano aprendola.
      const sintesi = statoDellOra(stati)
      // Le ore perse sono le sole «assente»: il ritardo è una presenza e
      // l'esonero pure. Contando anche quelli, la riga diceva «3 UD su 4» di
      // una giornata che nei conti del corso ne aveva perse zero.
      const perse = stati.filter(contaComeAssenza).length
      const voce = PRESENZE[sintesi] ?? { nome: sintesi, tono: 'quiete' as const }
      return h(
        'li',
        { class: 'diario__voce' },
        h(
          'button',
          {
            class: 'collegamento diario__quando',
            type: 'button',
            onclick: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id }),
          },
          formattaData(lezione.data, 'giorno'),
        ),
        pastiglia(voce.nome, voce.tono),
        // La materia non si scrive: è il nome del box in cui questa riga sta.
        // Al suo posto le UD perse, e quando non ce ne sono resta comunque la
        // colonna vuota — è quella che tiene i minuti e la nota incolonnati
        // con quelli delle righe sopra.
        perse > 0
          ? h('span', { class: 'testo-quieto diario__cosa' }, `${perse} UD perse su ${stati.length}`)
          : h('span', { class: 'diario__cosa' }),
        presenza.minuti ? h('span', { class: 'testo-quieto' }, `${presenza.minuti} min`) : null,
        presenza.nota ? h('span', { class: 'diario__nota' }, presenza.nota) : null,
      )
    }),
  )
}

/**
 * Un riquadro dentro il box di una materia: le presenze, i voti, le
 * osservazioni.
 *
 * Tutti e tre ci sono sempre, anche vuoti, e dicono in una riga che non c'è
 * niente. Farli sparire quando sono vuoti sembrava più pulito, ma i box delle
 * materie diventavano alti uno diverso dall'altro e la stessa cosa — «i voti»
 * — cadeva ogni volta a un'altezza diversa: per leggerli in fila bisognava
 * ricominciare a cercare a ogni materia. Un riquadro vuoto invece è una
 * risposta: di matematica non è stato annotato niente.
 */
function riquadroTema (titolo: string, quante: number, contenuto: Figlio): Figlio {
  return h('section', { class: 'riquadro-tema' }, titoloGruppo(titolo, quante, 'h5'), contenuto)
}

/** La riga che riempie un riquadro quando non c'è niente da metterci. */
function nienteQui (testo: string): Figlio {
  return h('p', { class: 'testo-quieto riquadro-tema__niente' }, testo)
}

/** Le presenze di una materia: i suoi numeri, e le sue giornate storte. */
function temaPresenze (riga: RigaCorso | null, storte: GiornataStorta[]): Figlio {
  const soglia = stato.registro.impostazioni.sogliaAssenza
  if (!riga) return riquadroTema('Presenze', 0, nienteQui('Nessuna ora in programma nel periodo.'))

  return riquadroTema(
    'Presenze',
    storte.length,
    h(
      'div',
      null,
      sintesiIncassata(
        // La soglia si applica corso per corso — è così che nasce una
        // segnalazione — e il totale della persona può nascondere la materia in
        // cui è già oltre: qui la percentuale è quella di questa materia sola.
        {
          etichetta: soglia > 0 ? `assenza · soglia ${soglia}%` : 'assenza',
          valore: `${riga.udAssenza} UD · ${percento(riga.assenza)}`,
          tono: oltreSoglia(soglia, riga.assenza) ? 'negativo' : 'neutro',
        },
        { etichetta: 'presenza', valore: percento(riga.presenza), tono: tonoPresenza(riga.presenza) },
        { etichetta: 'UD previste', valore: `${riga.udConAppello} su ${riga.udPreviste}` },
        riga.ritardi > 0 && {
          etichetta: 'ore con ritardo',
          valore: String(riga.ritardi),
          tono: 'attenzione' as const,
        },
        riga.udEsonero > 0 && {
          etichetta: 'UD di esonero',
          valore: String(riga.udEsonero),
          tono: 'quiete' as const,
        },
      ),
      storte.length === 0
        ? nienteQui('Sempre presente: niente da segnalare.')
        : elencoGiornate(storte),
    ),
  )
}

/**
 * I voti di una materia: la nota che ne esce, e i momenti da cui viene.
 *
 * La media si calcola dentro il corso e non fra corsi diversi: una media che
 * mescola matematica e italiano non vuol dire niente, e sarebbe l'unico numero
 * sbagliato in tutta la pagina. Da quando il box è la materia, il conto e il
 * suo perimetro coincidono: quel che si legge qui dentro è tutto e solo quel
 * che è entrato nella media scritta in cima.
 */
function temaVoti (allievo: Allievo, classe: Classe, momenti: MomentoValutazione[]): Figlio {
  const { media, conteggio } = mediaAllievo(momenti, allievo.id)
  const nota = notaFineSemestre(
    media,
    stato.registro.impostazioni.scala,
    stato.registro.impostazioni.passoFineSemestre,
  )

  return riquadroTema(
    'Valutazioni',
    momenti.length,
    h(
      'div',
      null,
      h(
        'p',
        { class: 'riquadro-tema__riga' },
        nota === null
          ? pastiglia('nessun voto', 'quiete')
          : pastiglia(
              // La nota, e fra parentesi la media da cui esce: la prima è quel
              // che si scrive, la seconda è il conto da cui viene, e chi guarda
              // vuole vedere tutte e due.
              `nota ${formattaVoto(nota)} (media ${formattaVoto(media)})`,
              nota >= stato.registro.impostazioni.scala.sufficienza ? 'positivo' : 'negativo',
            ),
        h(
          'span',
          { class: 'testo-quieto' },
          `${conteggio} vot${conteggio === 1 ? 'o' : 'i'} su ${momenti.length}`,
        ),
      ),
      momenti.length === 0
        ? nienteQui('Nessun momento di valutazione nel periodo.')
        : h(
            'ul',
            { class: 'diario' },
            ...momenti.map((momento) => {
              const voto = momento.voti.find((v) => v.allievoId === allievo.id)
              return h(
                'li',
                { class: 'diario__voce' },
                h(
                  'button',
                  {
                    class: 'collegamento diario__quando',
                    type: 'button',
                    onclick: () =>
                      // Anche il corso, e non solo la classe: la pagina dei
                      // voti tiene la prova scelta soltanto se è del corso in
                      // cui si trova, e senza questo ripiegava sull'ultima —
                      // si premeva la data di una prova e se ne apriva
                      // un'altra, di un altro corso.
                      aggiorna({
                        vista: 'valutazioni',
                        valutazioneId: momento.id,
                        corsoId: momento.corsoId,
                        filtroClasseId: classe.id,
                      }),
                  },
                  formattaData(momento.data),
                ),
                h('span', { class: 'diario__cosa' }, momento.titolo),
                momento.peso !== 1
                  ? h('span', { class: 'testo-quieto' }, `peso ${momento.peso}`)
                  : null,
                !voto || (voto.valore === null && !voto.assente)
                  ? pastiglia('—', 'quiete')
                  : voto.assente
                    ? pastiglia('assente', 'attenzione')
                    : pastiglia(
                        formattaVoto(voto.valore),
                        voto.valore! >= momento.scala.sufficienza ? 'positivo' : 'negativo',
                      ),
                voto?.nota ? h('span', { class: 'diario__nota' }, voto.nota) : null,
              )
            }),
          ),
    ),
  )
}

/**
 * Com'è andata, ora per ora: la matrice del comportamento riletta da qui.
 *
 * È la stessa matrice del registro dell'ora, girata: là le righe sono le
 * persone e la colonna è l'aspetto di quell'ora sola, qui la persona è una e
 * le righe sono le ore. Gli aspetti restano in colonna, nell'ordine della
 * lista, e i segni sono gli stessi quadretti — verde «molto bene», rosso «da
 * migliorare», il puntino di chi porta un'annotazione — perché chi li ha
 * segnati mentre la classe lavorava deve ritrovarli qui senza doverli
 * ritradurre.
 *
 * Le date in riga sono il motivo per cui questa matrice esiste. Prima c'erano
 * solo i conti per aspetto — «tre volte da migliorare» — e tre volte in tre
 * mesi o tre volte nella stessa settimana sono due cose diverse: la prima è
 * una giornata storta, la seconda è un discorso da fare. In fondo la riga dei
 * totali, che è quel che si diceva prima, ma sotto le colonne da cui esce.
 *
 * Le colonne sono tutte quelle della lista, anche quelle mai segnate: una
 * colonna vuota dice che di quell'aspetto non si è mai detto niente, e
 * toglierla farebbe sembrare che non lo si guardi. In coda, se capita, gli
 * aspetti tolti dalle impostazioni dopo essere stati usati: quel che è stato
 * segnato resta segnato.
 */
function temaOsservato (allievo: Allievo, lezioni: Lezione[]): Figlio {
  const celle = celleDiAllievo(lezioni, allievo.id)
  const annotate = celle.filter(({ cella }) => (cella.nota ?? '').trim())
  const nomeAspetto = (valore: string) =>
    testoDiVoce(stato.registro.impostazioni, 'aspettoOsservato', valore)

  // Gli aspetti della lista, più quelli che sono stati segnati e dalla lista
  // sono stati tolti: si perdono dalle impostazioni, non dal registro.
  const dellaLista = vociDiLista(stato.registro.impostazioni, 'aspettoOsservato').map(
    (voce) => voce.valore,
  )
  const aspetti = [
    ...dellaLista,
    ...[...new Set(celle.map(({ cella }) => cella.aspetto))].filter(
      (valore) => !dellaLista.includes(valore),
    ),
  ]

  // Una riga per ora in cui qualcosa è stato segnato, dalla prima all'ultima:
  // in ordine di calendario, come la matrice delle presenze, perché è così che
  // si legge un andamento. Le ore senza niente non fanno riga: sono la norma, e
  // ottanta righe vuote nasconderebbero le tre che contano.
  const righe = [...new Map(celle.map(({ lezione }) => [lezione.id, lezione])).values()].sort(
    (a, b) => a.data.localeCompare(b.data),
  )
  const cellaDi = (lezioneId: string, aspetto: string) =>
    celle.find(({ lezione, cella }) => lezione.id === lezioneId && cella.aspetto === aspetto)
      ?.cella ?? null

  const conti = new Map(contiPerAspetto(celle).map((conto) => [conto.aspetto, conto]))

  const casella = (lezione: Lezione, aspetto: string): HTMLElement => {
    const cella = cellaDi(lezione.id, aspetto)
    if (!cella) {
      // Quell'ora, su quell'aspetto, non è stato segnato niente: il quadretto
      // resta vuoto e non sparisce, che è quel che tiene in piedi le colonne.
      return h('span', { class: 'cella-segno cella-segno--ferma' })
    }
    return segnoFermo(cella.segno, {
      conNota: Boolean(cella.nota),
      racconto: [
        `${formattaData(lezione.data, 'giorno')} · ${nomeAspetto(aspetto)}`,
        nomeSegno(cella.segno).toLowerCase(),
        cella.nota,
      ]
        .filter(Boolean)
        .join(' · '),
    })
  }

  return riquadroTema(
    'Com’è andata',
    celle.length,
    celle.length === 0
      ? nienteQui('Niente segnato sulla matrice, in queste ore.')
      : h(
          'div',
          null,
          h(
            'div',
            { class: 'matrice__telaio' },
            h(
              'table',
              { class: 'matrice', attr: { 'aria-label': 'Aspetti osservati, ora per ora' } },
              h(
                'thead',
                null,
                h(
                  'tr',
                  null,
                  h('th', { class: 'matrice__chi', attr: { scope: 'col' } }, 'giorno'),
                  ...aspetti.map((aspetto) =>
                    h(
                      'th',
                      { class: 'matrice__aspetto', attr: { scope: 'col' } },
                      nomeAspetto(aspetto),
                    ),
                  ),
                ),
              ),
              h(
                'tbody',
                null,
                ...righe.map((lezione) =>
                  h(
                    'tr',
                    null,
                    h(
                      'th',
                      { class: 'matrice__chi', attr: { scope: 'row' } },
                      // Il giorno porta all'ora: da qui si va a rileggere che
                      // cosa si stava facendo quando lo si è segnato.
                      h(
                        'button',
                        {
                          class: 'collegamento',
                          type: 'button',
                          onclick: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id }),
                        },
                        formattaData(lezione.data, 'giorno'),
                      ),
                    ),
                    ...aspetti.map((aspetto) => h('td', null, casella(lezione, aspetto))),
                  ),
                ),
              ),
              h(
                'tfoot',
                null,
                h(
                  'tr',
                  null,
                  h('th', { class: 'matrice__chi', attr: { scope: 'row' } }, 'in tutto'),
                  ...aspetti.map((aspetto) => {
                    const conto = conti.get(aspetto)
                    if (!conto) return h('td', { class: 'testo-quieto' }, '—')
                    return h(
                      'td',
                      { class: 'matrice__conto' },
                      conto.positivi > 0
                        ? h('span', { class: 'matrice__conto--positivo' }, `+${conto.positivi}`)
                        : null,
                      conto.negativi > 0
                        ? h('span', { class: 'matrice__conto--negativo' }, `−${conto.negativi}`)
                        : null,
                      // Le annotate senza segno: non sono né un bene né un male,
                      // ma qualcuno ha scritto una riga, e un totale che le
                      // nasconde fa sembrare quella colonna muta.
                      conto.neutre > 0
                        ? h('span', { class: 'testo-quieto' }, String(conto.neutre))
                        : null,
                    )
                  }),
                ),
              ),
            ),
          ),
          // Quel che i quadretti non possono dire: un segno dice come è andata,
          // la riga accanto dice che cosa è successo, e in un colloquio è la
          // seconda quella che si legge a voce.
          annotate.length === 0
            ? null
            : h(
                'ul',
                { class: 'diario' },
                ...annotate.map(({ lezione, cella }) =>
                  h(
                    'li',
                    { class: 'diario__voce' },
                    h(
                      'button',
                      {
                        class: 'collegamento diario__quando',
                        type: 'button',
                        onclick: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id }),
                      },
                      formattaData(lezione.data, 'giorno'),
                    ),
                    segnoFermo(cella.segno),
                    h('span', { class: 'testo-quieto' }, nomeAspetto(cella.aspetto)),
                    h('span', { class: 'diario__cosa' }, cella.nota ?? ''),
                  ),
                ),
              ),
        ),
  )
}

/**
 * Le osservazioni scritte durante le ore di questa materia, dalla più recente.
 *
 * Stavano in un elenco unico, tutte le materie insieme in ordine di data, e
 * per sapere che cosa era stato annotato in laboratorio bisognava leggerle
 * tutte guardando la riga della materia. Sono di chi insegna e non del docente
 * di classe, ed è qui che si leggono: accanto ai voti di cui parlano.
 */
function temaOsservazioni (allievo: Allievo, lezioni: Lezione[]): Figlio {
  const voci = lezioni
    .flatMap((lezione) =>
      lezione.osservazioni
        .filter((o) => o.allievoId === allievo.id)
        .map((osservazione) => ({ lezione, osservazione })),
    )
    .sort((a, b) => b.lezione.data.localeCompare(a.lezione.data))

  return riquadroTema(
    'Osservazioni',
    voci.length,
    voci.length === 0
      ? nienteQui('Niente di annotato in questa materia.')
      : h(
          'ul',
          { class: 'diario' },
          ...voci.map(({ lezione, osservazione }) =>
            h(
              'li',
              { class: 'diario__voce' },
              h(
                'button',
                {
                  class: 'collegamento diario__quando',
                  type: 'button',
                  onclick: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id }),
                },
                formattaData(lezione.data, 'giorno'),
              ),
              pastiglia(osservazione.tipo, osservazione.tipo === 'merito' ? 'positivo' : 'quiete'),
              h('span', { class: 'diario__cosa' }, osservazione.testo),
            ),
          ),
        ),
  )
}

/**
 * Il box di una materia: quel che il registro sa di questa persona in questa
 * materia, e niente d'altro.
 *
 * È l'impianto della linguetta. Prima i riquadri erano tre — presenze, voti,
 * osservazioni — e ognuno teneva dentro tutte le materie: per rispondere a
 * «come va in matematica», che è la domanda del colloquio, si guardava in tre
 * posti diversi e ogni volta si cercava la riga giusta fra le altre. Adesso il
 * primo taglio è la materia e il secondo è l'argomento: il box porta il nome
 * della materia, e dentro i tre riquadri stanno sempre nello stesso ordine.
 *
 * In cima al box la riga di sintesi: l'assenza e la nota, che sono le due cifre
 * che si dicono a voce, senza aprire niente.
 */
function boxMateria (
  allievo: Allievo,
  classe: Classe,
  corso: Corso,
  lezioni: Lezione[],
  momenti: MomentoValutazione[],
): HTMLElement {
  const riga = presenzeDelCorso(allievo, corso)
  const storte = giornateStorte(allievo, lezioni)
  // Le ore tenute, non quelle a calendario: un'ora annullata non è un'ora, e
  // contarla qui farebbe dire «dodici ore» di una materia che ne ha fatte
  // dieci.
  const tenute = lezioni.filter((lezione) => lezione.stato !== 'annullata').length
  const { media } = mediaAllievo(momenti, allievo.id)
  const nota = notaFineSemestre(
    media,
    stato.registro.impostazioni.scala,
    stato.registro.impostazioni.passoFineSemestre,
  )

  return scheda({
    classe: 'box-materia',
    titolo: nomeMateria(corso.materiaId) || corso.titolo,
    sottotitolo: [
      riga ? `${percento(riga.assenza)} di assenza` : 'nessuna ora nel periodo',
      nota === null ? 'nessun voto' : `nota ${formattaVoto(nota)}`,
      `${tenute} ${tenute === 1 ? 'ora' : 'ore'}`,
    ].join(' · '),
    contenuto: h(
      'div',
      { class: 'box-materia__temi' },
      temaPresenze(riga, storte),
      temaVoti(allievo, classe, momenti),
      temaOsservato(allievo, lezioni),
      temaOsservazioni(allievo, lezioni),
    ),
  })
}

/**
 * I box delle materie, uno per corso della classe.
 *
 * In fondo, quando capita, quello delle ore rimaste senza corso: un corso
 * eliminato stacca le sue ore invece di portarsele via, e le osservazioni
 * scritte dentro sono comunque state scritte. Sparire sarebbe il modo di
 * perderle senza dirlo.
 */
function boxDelleMaterie (
  allievo: Allievo,
  classe: Classe,
  corsi: Corso[],
  lezioni: Lezione[],
): Figlio[] {
  const valutazioni = valutazioniDi(classe.id)
  const box = corsi.map((corso) =>
    boxMateria(
      allievo,
      classe,
      corso,
      lezioni.filter((l) => l.corsoId === corso.id),
      valutazioni
        .filter((v) => v.corsoId === corso.id)
        .sort((a, b) => a.data.localeCompare(b.data)),
    ),
  )

  const sciolte = lezioni.filter((l) => !corsi.some((c) => c.id === l.corsoId))
  const orfane = sciolte.some(
    (lezione) => lezione.osservazioni.some((o) => o.allievoId === allievo.id),
  )
  if (orfane) {
    box.push(
      scheda({
        classe: 'box-materia',
        titolo: 'Ore senza corso',
        sottotitolo: 'il corso è stato eliminato, quel che era stato annotato resta',
        contenuto: h(
          'div',
          { class: 'box-materia__temi' },
          temaOsservazioni(allievo, sciolte),
        ),
      }),
    )
  }

  return box
}

/**
 * I documenti che gli sono stati chiesti: li vede solo il docente di classe.
 *
 * Sono le consegne che si spuntano portando un foglio, lette dalla parte sua —
 * la matrice della classe risponde a «chi non ha portato cosa», questa scheda
 * a «cosa manca a lui», che è la domanda che ci si fa aprendo la sua pagina.
 */
function pannelloDocumenti (allievo: Allievo, classe: Classe): Figlio {
  if (!classe.docenteDiClasse) return null
  const suoi = consegneDocumento(stato.registro, corsiDi(classe.id)).filter(
    (c) => c.a === 'classe' || c.allieviIds.includes(allievo.id),
  )
  if (suoi.length === 0) return null

  return scheda({
    titolo: 'Documenti',
    sottotitolo: 'quelli chiesti a lui',
    contenuto: h(
      'ul',
      { class: 'diario' },
      ...suoi.map((consegna) => {
        // Dalla matrice si spunta anche senza un file: leggere il documento
        // della spunta lasciava «atteso» chi in realtà l'aveva già portato.
        const portato = haFatto(consegna, allievo.id)
        return h(
          'li',
          { class: 'diario__voce' },
          icona('documento'),
          h('span', { class: 'diario__cosa' }, consegna.testo),
          pastiglia(consegna.documento ?? 'documento', 'quiete'),
          portato ? pastiglia('consegnato', 'positivo') : pastiglia('atteso', 'attenzione'),
        )
      }),
    ),
  })
}

/**
 * Sotto un indirizzo: dove cade sulla mappa, e che cosa fare se non ci cade.
 *
 * Le coordinate stanno qui e non solo nella mappa perché è qui che si guarda un
 * indirizzo: chi apre questa scheda per copiare una via vuole anche sapere se
 * il registro sa dov'è — e, quando l'ha appena corretta, poterle ritrovare
 * senza attraversare tutta la classe. La riga dice tre cose e nessuna in più:
 * il punto, come l'ha capito il geocodificatore, e quanto dista dalla sede.
 *
 * Quando il punto non c'è o non vale più, al suo posto c'è il gesto che lo
 * trova: una persona sola, un paio di secondi.
 */
function rigaCoordinate (
  classe: Classe,
  allievo: Allievo,
  genere: 'domicilio' | 'lavoro',
): Figlio {
  const indirizzo = indirizzoDi(allievo, genere)
  if (!indirizzo) return null

  const rubrica = rubricaDi(stato.registro)
  const punto = coordinataDi(rubrica, indirizzo)

  if (!punto) {
    return h(
      'span',
      { class: 'coordinate coordinate--assenti' },
      icona('segnaposto'),
      h('span', null, 'Indirizzo non ancora collocato sulla mappa.'),
      pulsante({
        testo: 'Trova',
        variante: 'sottile',
        simbolo: 'segnaposto',
        al: () =>
          azione({ tipo: 'mappa.geocodifica', classeIds: [classe.id], allievoId: allievo.id }),
      }),
    )
  }

  // Chi altro sta a questo stesso indirizzo. È la cosa che la scheda di una
  // persona non poteva dire finché il punto stava dentro l'anagrafica: due
  // fratelli erano due punti identici e nessun legame, e il compagno che fa il
  // tirocinio nella stessa ditta non lo sapeva nessuno.
  const gruppo = condivisioni(stato.registro.classi, rubrica).find((c) => c.chiave === punto.chiave)
  const altri = (gruppo?.usi ?? []).filter((uso) => uso.allievoId !== allievo.id)

  return h(
    'span',
    { class: 'coordinate' },
    icona('segnaposto'),
    h('code', { class: 'coordinate__numeri' }, scriviCoordinate(punto)),
    h(
      'span',
      { class: 'coordinate__nota' },
      `${scriviDistanza(distanzaKm(punto, SEDE))} dalla sede`,
      punto.etichetta ? ` · ${punto.etichetta}` : '',
    ),
    altri.length > 0
      ? pastiglia(
          altri.length === 1
            ? `anche ${altri[0].chi}`
            : `anche altre ${altri.length} persone`,
          'informativo',
          'classi',
        )
      : null,
    pulsante({
      testo: 'Sulla mappa',
      variante: 'fantasma',
      simbolo: 'mappa',
      al: () => mostraSullaMappa(punto.chiave),
    }),
  )
}

/**
 * Dove sta: casa, azienda e scuola in un riquadro solo.
 *
 * Tre righe di indirizzo dicono tre vie; questo riquadro dice la cosa che
 * quelle tre righe non dicono — quanto sono distanti fra loro. Serve al
 * colloquio («perché arriva tardi alla prima ora») e serve prima di una visita
 * in azienda, che si decide guardando dove cade rispetto a tutto il resto.
 *
 * È lo stesso riquadro della pagina Mappa, in piccolo: si trascina e si
 * ingrandisce, i segnaposti hanno la stessa figura, e la riga tratteggiata fra
 * casa e azienda è il tragitto di ogni mattina. Il cartellino qui è corto —
 * che posto è, e quanto dista — perché di chi sia lo si sta già leggendo
 * sopra.
 *
 * Non compare se non c'è niente da mostrare oltre alla scuola: un riquadro con
 * dentro la sola sede sarebbe una mappa del Ticino con un puntino, e nessuna
 * risposta.
 */
function pannelloDoveSta (classe: Classe, allievo: Allievo): Figlio {
  const rubrica = rubricaDi(stato.registro)
  const segni = segniDiAllievo(classe, allievo, rubrica, stato.registro.classi)
  const suoi = segni.filter((segno) => segno.genere !== 'sede')
  if (suoi.length === 0) return null

  const cartellino = (segno: SegnoMappa) =>
    h(
      'div',
      { class: 'mappa__cartellino' },
      h('strong', { class: 'mappa__cartellino-titolo' }, segno.titolo),
      h('span', { class: 'mappa__cartellino-riga' }, segno.indirizzo),
      h(
        'span',
        { class: 'mappa__cartellino-riga' },
        segno.genere === 'sede'
          ? 'La sede: è da qui che si contano le distanze'
          : `${scriviDistanza(segno.distanzaKm)} dalla sede, in linea d’aria`,
      ),
    )

  const vivo = riquadroMappa({
    segni: () => segni,
    cartellino,
    // Un margine piccolo: il riquadro è alto dieci centimetri, e quello della
    // pagina intera lascerebbe i tre punti stretti in mezzo.
    margine: 28,
  })

  const casa = suoi.find((segno) => segno.genere === 'domicilio')
  const lavoro = suoi.find((segno) => segno.genere === 'lavoro')

  return scheda({
    titolo: 'Dove sta',
    sottotitolo: [
      casa ? `casa a ${scriviDistanza(casa.distanzaKm)} dalla sede` : null,
      lavoro ? `${lavoro.titolo} a ${scriviDistanza(lavoro.distanzaKm)}` : null,
      casa && lavoro ? `${scriviDistanza(distanzaKm(casa, lavoro))} fra casa e lavoro` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    classe: 'dove-sta',
    azioni: pulsante({
      testo: 'Apri la mappa',
      variante: 'fantasma',
      simbolo: 'mappa',
      al: () => mostraSullaMappa((casa ?? lavoro ?? segni[0]).chiave),
    }),
    contenuto: h('div', { class: 'dove-sta__tela' }, vivo.elemento),
  })
}

/** Una riga dell'anagrafica: come si chiama, che cosa dice, e che cosa ci si fa. */
interface Riga {
  etichetta: string
  valore: string | undefined
  /** Come si disegna il valore, quando una riga di testo non basta. */
  disegna?: Figlio
  /** Vero per quel che si finisce sempre per ricopiare altrove: mail, telefoni. */
  copiabile?: boolean
  /**
   * Che cosa sa farci il sistema: comporre il numero, aprire una mail nuova.
   *
   * Il tasto che copia resta accanto anche qui. Non sono lo stesso gesto: da
   * una scheda si chiama, ma un numero lo si incolla anche in un modulo della
   * segreteria o in un messaggio, e chi lo faceva prima deve poterlo fare.
   */
  apribile?: GenereRecapito
  /** Quel che sta sotto al valore: le coordinate, una pastiglia. */
  sotto?: Figlio
}

/**
 * Copia un recapito negli appunti.
 *
 * È il gesto che si fa davvero con una mail o un numero di telefono: da qui
 * non si scrive e non si telefona — il registro non è un programma di posta —
 * ma il recapito finisce in Outlook o sul telefono senza ribatterlo, che e'
 * dove sbagliare una cifra costa una firma che non torna.
 */
async function copiaRecapito (valore: string, che: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(valore)
    notifica(`${che} negli appunti.`, 'successo')
  } catch {
    // Gli appunti si possono negare, e allora il valore resta comunque lì da
    // leggere: dirlo è meglio di un pulsante che non fa niente in silenzio.
    notifica('Gli appunti non si sono lasciati scrivere.', 'avviso')
  }
}

/** Una riga scritta, o niente se il dato non c'è. */
function rigaAnagrafica (riga: Riga): Figlio {
  if (!riga.valore) return null
  const valore = riga.valore
  const scritto = riga.disegna
    ?? (riga.apribile
      ? recapitoPremibile(riga.apribile, valore, 'anagrafica__testo')
      : h('span', { class: 'anagrafica__testo' }, valore))

  return h(
    'div',
    { class: 'anagrafica__riga' },
    h('dt', { class: 'anagrafica__etichetta' }, riga.etichetta),
    h(
      'dd',
      { class: 'anagrafica__valore' },
      h(
        'div',
        { class: 'anagrafica__dato' },
        scritto,
        riga.copiabile
          ? pulsante({
              simbolo: 'duplica',
              variante: 'fantasma',
              classe: 'anagrafica__copia',
              titolo: `Copia ${riga.etichetta.toLowerCase()}`,
              al: () => copiaRecapito(valore, riga.etichetta),
            })
          : null,
      ),
      riga.sotto ?? null,
    ),
  )
}

/**
 * Un blocco di righe sotto un titolino, o niente se non ce n'e' nessuna.
 *
 * I recapiti erano un elenco solo di nove righe, e i quattro dell'azienda
 * stavano in mezzo ai suoi senza niente che li separasse: al telefono si
 * finiva per leggere la mail del datore credendola sua. Due blocchi con il
 * loro nome sono la stessa informazione, letta senza sbagliare persona.
 */
function gruppoAnagrafica (titolo: string, simbolo: NomeIcona, righe: Riga[]): Figlio {
  const scritte = righe.map(rigaAnagrafica).filter((riga) => riga !== null)
  if (scritte.length === 0) return null
  return h(
    'section',
    { class: 'anagrafica__gruppo' },
    h('h4', { class: 'anagrafica__titolo' }, icona(simbolo), titolo),
    h('dl', { class: 'anagrafica__elenco' }, ...scritte),
  )
}

/**
 * Un indirizzo in due righe, come su una busta.
 *
 * La via sopra, il NAP e la località sotto: è il modo in cui un indirizzo si
 * legge ad alta voce e si ricopia su un modulo, e in una riga sola il NAP
 * spariva in mezzo alle parole. Quel che non ha una casella sua — chi sta
 * davanti alla via, la casella postale, il paese — resta scritto dov'era: si
 * vede, e chi lo deve cambiare lo trova.
 */
function rigaIndirizzo (
  classe: Classe,
  allievo: Allievo,
  genere: 'domicilio' | 'lavoro',
): Riga {
  const dove = genere === 'domicilio' ? allievo.indirizzo : allievo.indirizzoDatore
  const scritto = scriviIndirizzo(dove)
  if (!scritto) return { etichetta: 'Indirizzo', valore: undefined }

  const citta = [dove?.cap, dove?.localita, dove?.paese].filter(Boolean).join(' ')
  return {
    etichetta: 'Indirizzo',
    // Il tasto che copia copia la riga intera: quel che si incolla in una
    // busta o in un modulo è l'indirizzo, non la sua prima metà.
    valore: scritto,
    disegna: h(
      'div',
      { class: 'indirizzo' },
      h('span', null, [dove?.presso, dove?.via, dove?.casella].filter(Boolean).join(', ')),
      citta ? h('span', { class: 'indirizzo__citta' }, citta) : null,
    ),
    copiabile: true,
    sotto: rigaCoordinate(classe, allievo, genere),
  }
}

/** La data di nascita con quel che se ne ricava: gli anni, e se sono diciotto. */
function rigaNascita (allievo: Allievo): Riga {
  const nascita = allievo.dataNascita
  if (!nascita) return { etichetta: 'Data di nascita', valore: undefined }
  const anni = anniCompiuti(nascita, stato.adessoData)

  return {
    etichetta: 'Data di nascita',
    valore: formattaData(nascita),
    sotto:
      anni === null
        ? null
        : h(
            'span',
            { class: 'anagrafica__coda' },
            h('span', { class: 'testo-quieto' }, `${anni} anni`),
            // I diciotto non sono un numero come gli altri: da lì in poi le
            // giustificazioni le firma lei, e chi ha il foglio in mano deve
            // sapere se serve ancora la firma di qualcun altro. Sopra i diciotto
            // non si scrive niente: è il caso normale, e una pastiglia su ogni
            // scheda non si legge più.
            anni < 18 ? pastiglia('minorenne', 'informativo') : null,
          ),
  }
}

/**
 * I periodi di assenze da far firmare, per lei sola.
 *
 * È lavoro del docente di classe, e a schermo stava solo dentro la sua pagina:
 * una tabella con venticinque nomi e tre colonne, che risponde a «a che punto
 * siamo con la classe». La domanda che ci si fa aprendo una scheda è l'altra —
 * «questa persona ha ancora qualcosa da far firmare?» — e per rispondere si
 * apriva l'altra pagina e si cercava il nome.
 *
 * I fogli non si stampano e non si spediscono da qui: quello si fa per tutta
 * la classe in un gesto solo, ed è la pagina delle assenze a saperlo fare. Qui
 * si legge a che punto è, e si va l’ se c'è da fare qualcosa.
 */
function pannelloAssenze (classe: Classe, allievo: Allievo): Figlio {
  if (!classe.docenteDiClasse) return null
  const fascicolo = fascicoloDi(classe.id)
  const periodi = fascicolo.assenze
    .map((blocco) => ({ blocco, riga: rigaDi(blocco, allievo.id) }))
    // Chi in un periodo non ha mancato niente non ha una riga, e non è un
    // buco da riempire: è la risposta migliore possibile.
    .filter((voce) => faseRiga(voce.riga) !== 'fuori')
    .sort((a, b) => b.blocco.dal.localeCompare(a.blocco.dal))

  if (periodi.length === 0) return null

  const aperti = periodi.filter((voce) => faseRiga(voce.riga) !== 'firmato').length

  return scheda({
    titolo: 'Assenze da far firmare',
    sottotitolo:
      aperti === 0
        ? 'tutto tornato indietro firmato'
        : `${aperti} periodo${aperti === 1 ? '' : 'i'} ancora da chiudere`,
    azioni: pulsante({
      testo: 'Apri le assenze',
      simbolo: 'firma',
      variante: 'fantasma',
      al: () =>
        aggiorna({ vista: 'docenteClasse', schedaDocente: 'assenze', classeId: classe.id }),
    }),
    contenuto: h(
      'ul',
      { class: 'diario' },
      ...periodi.map(({ blocco, riga }) => {
        const fase = faseRiga(riga)
        const voce = FASI[fase]
        const fogli = vergini(riga)
        return h(
          'li',
          { class: 'diario__voce' },
          h('span', { class: 'diario__quando' }, nomePeriodo(blocco)),
          pastiglia(voce.nome, voce.tono),
          fogli.length > 0
            ? h('span', { class: 'testo-quieto diario__cosa' }, rapportiDetti(fogli))
            : null,
          riga?.note ? h('span', { class: 'diario__nota' }, riga.note) : null,
        )
      }),
    ),
  })
}

/**
 * Chi è e come lo si raggiunge: la faccia da una parte, i recapiti dall'altra.
 *
 * Una scheda sola e non due — il ritratto sopra, i recapiti sotto — perché e'
 * quel che si guarda insieme: questa vista si apre con la persona davanti o
 * con qualcuno che chiede di lei, e la faccia accanto al nome del rappresentante
 * è la cosa che serve al telefono.
 *
 * I recapiti stanno in due blocchi, la persona e l'azienda, perché sono due
 * interlocutori e confonderli è l'errore che si paga: una mail alla ditta
 * scritta credendola sua non si ritira. Dentro ogni blocco si scrive solo quel
 * che c'è — una riga «Azienda: —» non dice niente più che non scriverla — e
 * in fondo, quieto, quel che manca: è la lista della spesa di chi prepara i
 * colloqui, e prima non si vedeva da nessuna parte.
 *
 * Il ritratto si guarda e basta: metterlo, cambiarlo e toglierlo sono gesti da
 * «Modifica», dov'è tutto il resto dell'anagrafica. Qui la persona è davanti o
 * al telefono, e un «Cambia foto» accanto alla sua faccia è un comando che
 * prima o poi si preme per sbaglio. Senza foto resta il riquadro vuoto: un
 * posto segnato si riempie, e una scheda che non nomina le foto lascia credere
 * che non esistano.
 */
function pannelloAnagrafica (classe: Classe, allievo: Allievo): HTMLElement {
  const indirizzo = uriDato(allievo.foto)

  // Un numero per riga, con il suo nome al posto dell'etichetta «Telefono»:
  // chi ne ha due li legge come due cose diverse — il cellulare risponde, il
  // fisso di casa lo prende chi c'è — e chi ne ha uno non vede nessuna
  // differenza rispetto a prima.
  const numeriDi = (contatto: ContattoTelefonico): Riga[] =>
    telefoniDi(allievo, contatto).map((telefono) => ({
      etichetta: Maiuscola(ETICHETTE_TELEFONO[telefono.etichetta]),
      valore: telefono.numero,
      copiabile: true,
      apribile: 'telefono' as const,
    }))

  const suoi: Riga[] = [
    // Il nome per esteso, diviso come sta nei documenti. Sta scritto anche in
    // testata, ma l’à è un titolo: qui è il dato, e chi ricopia un contratto di
    // tirocinio ha bisogno di sapere quale metà è il cognome — con due nomi
    // che potrebbero essere tutti e due, dalla riga sola non si ricava.
    { etichetta: 'Cognome', valore: allievo.cognome, copiabile: true },
    { etichetta: 'Nome', valore: allievo.nome, copiabile: true },
    // La nascita subito dopo: non è un recapito, è chi è la persona, e in fondo
    // all'elenco delle caselle si leggeva come l'ultimo dei modi di scrivergli.
    rigaNascita(allievo),
    rigaIndirizzo(classe, allievo, 'domicilio'),
    { etichetta: 'E-mail', valore: allievo.email, copiabile: true, apribile: 'email' },
    ...numeriDi('pif'),
  ]

  // Il rappresentante legale ha un blocco suo e non una riga in fondo ai suoi:
  // è un'altra persona, e la sua mail letta in mezzo alle caselle della persona
  // in formazione è la mail che si sbaglia a usare.
  const delRappresentante: Riga[] = [
    { etichetta: 'E-mail', valore: allievo.emailTutore, copiabile: true, apribile: 'email' },
    ...numeriDi('rappresentante'),
  ]

  const dellAzienda: Riga[] = [
    { etichetta: 'Nome', valore: allievo.azienda },
    rigaIndirizzo(classe, allievo, 'lavoro'),
    {
      etichetta: `E-mail ${del(PERSONE.datore)}`,
      valore: allievo.emailDatore,
      copiabile: true,
      apribile: 'email',
    },
    ...numeriDi('datore'),
  ]

  const tutte = [...suoi, ...delRappresentante, ...dellAzienda]
  const scritte = tutte.filter((riga) => Boolean(riga.valore))
  // Quel che manca, detto una volta sola e sottovoce. Non si elencano le
  // caselle vuote una per una — sarebbero sei righe di trattini — ma il nome
  // di quel che non c'è serve a chi deve procurarselo.
  const mancano = [
    ...tutte.filter((riga) => !riga.valore).map((riga) => riga.etichetta.toLowerCase()),
    // I numeri non hanno una casella vuota da segnalare — non ci sono righe
    // finché nessuno le apre — quindi la mancanza si dice qui: «nessun
    // telefono» è quel che manca davvero, non una riga che non si è scritta.
    ...CONTATTI.filter((contatto) => telefoniDi(allievo, contatto).length === 0).map(
      (contatto) => `telefono ${del(CONTATTI_TELEFONICI[contatto])}`,
    ),
  ]

  return scheda({
    titolo: 'Anagrafica',
    // La matita accanto ai dati e non solo in cima alla pagina: chi si accorge
    // che manca un numero se ne accorge guardando la riga, non la testata.
    azioni: pulsante({
      testo: 'Modifica',
      simbolo: 'matita',
      variante: 'sottile',
      al: () => moduloAllievo(classe, allievo),
    }),
    contenuto: h(
      'div',
      { class: 'ritratto' },
      h(
        'div',
        { class: 'ritratto__colonna' },
        indirizzo
          ? h('img', {
              class: 'ritratto__foto',
              attr: { src: indirizzo, alt: nomeCompleto(allievo), loading: 'lazy' },
            })
          : h('div', { class: 'ritratto__vuoto' }, icona('utente', 'ritratto__simbolo')),
      ),
      h(
        'div',
        { class: 'anagrafica' },
        scritte.length === 0
          ? statoVuoto({
              simbolo: 'utente',
              titolo: 'Nessun recapito',
              testo: 'Indirizzo, mail e telefoni si aggiungono da «Modifica».',
              azione: pulsante({
                testo: 'Compila',
                variante: 'primario',
                simbolo: 'matita',
                al: () => moduloAllievo(classe, allievo),
              }),
            })
          : h(
              'div',
              null,
              gruppoAnagrafica(Uno(PERSONE.pif), 'utente', suoi),
              gruppoAnagrafica(Uno(PERSONE.rappresentante), 'classi', delRappresentante),
              gruppoAnagrafica(Uno(PERSONE.azienda), 'azienda', dellAzienda),
              mancano.length > 0
                ? h(
                    'p',
                    { class: 'anagrafica__mancano testo-quieto' },
                    `Manca: ${mancano.join(', ')}.`,
                  )
                : null,
            ),
      ),
    ),
  })
}

/**
 * Il corpo della scheda: tutto quel che il registro sa di una persona.
 *
 * Sta fuori da `vistaAllievo` perché di posti da cui la si guarda ce ne sono
 * due: la pagina della singola persona, che ci arriva dall'elenco di una
 * classe, e la pagina «Persone in formazione», che la mostra accanto
 * all'elenco di tutte. Sono la stessa scheda, e scritta due volte sarebbe
 * diventata due schede diverse al primo pannello aggiunto.
 *
 * Qui non c'è la testata: chi la mostra sa già che cosa scriverci sopra e quali
 * comandi gli servono accanto.
 */
export function schedaAllievo (classe: Classe, allievo: Allievo): Figlio {
  const lezioni = lezioniDi(classe.id)
  const corsi = corsiDi(classe.id)
  // Quale linguetta è aperta davvero, e quali ci sono: di una classe di cui non
  // si è docente di classe, quella del docente di classe non compare — non
  // è una linguetta vuota, è un mestiere che non si fa.
  const quale = porzionePersona(classe.docenteDiClasse)
  const linguette = porzioniPersona(classe.docenteDiClasse)

  return h(
    'div',
    { class: 'scheda-persona' },
    // Le linguette si chiamano come le chiama `tabs.ts`: là le legge anche
    // il percorso in fondo allo schermo, e due elenchi di parole per le stesse
    // linguette sarebbero due parole diverse al primo ripensamento.
    //
    // Con una linguetta sola non si disegna niente: un selettore da cui non si
    // può scegliere altro è un titolo travestito da comando.
    linguette.length > 1
      ? selettore(quale, [...linguette], (scelta: SchedaPersona) =>
          aggiorna({ schedaPersona: scelta }),
        )
      : null,
    quale === 'anagrafica'
      // Chi è, e dove sta. La mappa subito sotto i recapiti: è la stessa
      // domanda — dove sta questa persona — disegnata invece che scritta.
      ? corpoScheda(pannelloAnagrafica(classe, allievo), pannelloDoveSta(classe, allievo))
      : null,
    // Il mestiere del docente di classe: quel che c'è da riscuotere e da far
    // firmare. Non riguarda una materia: riguarda la persona.
    quale === 'docenteClasse'
      ? corpoScheda(pannelloDocumenti(allievo, classe), pannelloAssenze(classe, allievo))
      : null,
    // Come va, materia per materia: un box per ciascuna, e dentro le ore, i
    // voti e quel che è stato annotato in quelle ore. In cima il quadro del
    // periodo, che è la sola cosa che non appartiene a una materia sola.
    quale === 'materie'
      ? corpoScheda(
          quadroDelPeriodo(allievo, corsi, lezioni),
          ...boxDelleMaterie(allievo, classe, corsi, lezioni),
        )
      : null,
  )
}

/**
 * Il corpo di una linguetta: i riquadri che le appartengono.
 *
 * Si affiancano quando c'è spazio — due schede strette una accanto all'altra si
 * leggono insieme — e impilate farebbero una colonna lunga quanto tre schermi.
 *
 * Una linguetta senza niente dentro dice che non c'è niente, e lo dice: sparire
 * lascerebbe un riquadro vuoto sotto una linguetta che si è appena premuta, e
 * chi l'ha premuta penserebbe che la pagina non abbia risposto.
 */
function corpoScheda (...figli: Figlio[]): Figlio {
  const pieni = figli.filter((figlio) => figlio !== null && figlio !== undefined)
  if (pieni.length === 0) {
    return h('p', { class: 'testo-quieto scheda-persona__nota' }, 'Qui non c’è ancora niente.')
  }
  return h('div', { class: 'scheda-persona__corpo' }, ...pieni)
}

export function vistaAllievo (): Figlio {
  const classe = classeDellAllievo(stato.allievoId, stato.classeId)
  const allievo = classe?.allievi.find((a) => a.id === stato.allievoId) ?? null

  if (!classe || !allievo) {
    return h(
      'div',
      { class: 'vista vista--allievo' },
      statoVuoto({
        simbolo: 'utente',
        titolo: `Nessuna ${PIF.singolare} scelta`,
        testo: `La scheda si apre dal nome di ${un(PIF)}, nell’elenco della sua classe.`,
        azione: pulsante({
          testo: `Vai alle ${PIF.plurale}`,
          variante: 'primario',
          al: () => aggiorna({ vista: 'persone' }),
        }),
      }),
    )
  }

  // Gli allievi nell'ordine dell'elenco di classe, da cui si è arrivati qui:
  // scorrendo con le frecce si passa al nome che si aveva sotto, non a uno
  // pescato da un ordine diverso. Ci sono anche i ritirati, come nell'elenco:
  // la scheda di chi se n'è andato si guarda ancora, e saltarlo qui vorrebbe
  // dire un allievo raggiungibile solo tornando indietro.
  const elenco = ordinaAllievi(classe.allievi)
  const dove = elenco.findIndex((a) => a.id === allievo.id)
  const vaiA = (quale: Allievo | undefined) =>
    quale ? () => aggiorna({ vista: 'allievo', classeId: classe.id, allievoId: quale.id }) : undefined
  const precedente = elenco[dove - 1]
  const successivo = elenco[dove + 1]

  return h(
    'div',
    { class: 'vista vista--allievo' },
    testataVista({
      titolo: nomeCompleto(allievo),
      sottotitolo:
        `${classe.nome}${allievo.attivo ? '' : ' · ritirato'} · ${nomeSemestreScelto()}` +
        // A che punto della classe si è: senza, scorrendo venticinque schede
        // non si sa se ne restano due o dodici, e si torna all'elenco per
        // contarle.
        (elenco.length > 1 ? ` · ${dove + 1} di ${elenco.length}` : ''),
      azioni: [
        // Le frecce prima di tutto: da qui si scorre la classe uno per uno —
        // è quel che si fa preparando i colloqui — e tornare all'elenco per
        // aprire il nome successivo erano due gesti per ogni allievo.
        pulsante({
          simbolo: 'su',
          variante: 'sottile',
          titolo: precedente ? `Scheda di ${nomeCompleto(precedente)}` : 'È il primo della classe',
          disabilitato: !precedente,
          al: vaiA(precedente),
        }),
        pulsante({
          simbolo: 'giu',
          variante: 'sottile',
          titolo: successivo ? `Scheda di ${nomeCompleto(successivo)}` : 'È l’ultimo della classe',
          disabilitato: !successivo,
          al: vaiA(successivo),
        }),
        // Il ritorno va all'elenco di tutte, non a quello della sola classe:
        // è la pagina da cui si cerca una persona, ed è quella da cui quasi
        // sempre si è arrivati.
        pulsante({
          testo: 'Torna all’elenco',
          simbolo: 'sinistra',
          variante: 'sottile',
          al: () => aggiorna({ vista: 'persone' }),
        }),
        // La sua scheda in PDF si chiede da Documenti, con quelle di tutti
        // gli altri: stampare per una classe intera qui vorrebbe dire venti
        // pagine aperte una per una.
        pulsante({
          testo: 'Modifica',
          simbolo: 'matita',
          al: () => moduloAllievo(classe, allievo),
        }),
      ],
    }),
    schedaAllievo(classe, allievo),
  )
}
