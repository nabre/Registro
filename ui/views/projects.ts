// I progetti del corso (ADR-54): l'elenco a sinistra, il progetto aperto a
// destra. Testata, criteri e livelli, compiti con inizio e proroga per persona
// restano in vista; sotto, a linguette, le fasi, la matrice a livelli giorno
// per giorno e gli esiti (giudizi, valutazioni, presenze). Le lezioni e le
// valutazioni del progetto si ricavano da piani e momenti.

import { confrontaLezioni, minutiDiAttivita, nomeCompleto } from '#core/dominio/calculations.js'
import { formattaData, formattaDurata } from '#core/dominio/dates.js'
import { Molti, Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type { Iso, Lezione, MomentoValutazione, Progetto, StatoAttivita, StatoProgetto } from '#core/dominio/models.js'
import {
  avanzamentoDelProgetto,
  lezioniDelProgetto,
  momentiDelProgetto,
  progettiDelCorso,
  quadroDelProgetto,
  type AttivitaNellOra,
  type Periodo,
  type QuadroDelProgetto,
  type QuadroDellaFase,
} from '#core/dominio/projects.js'
import { parole } from '#core/dominio/words.testi.js'
import {
  barra,
  collegamento,
  dataInLinea,
  pastiglia,
  pulsante,
  quieto,
  scheda,
  selettore,
  statoVuoto,
  tendina,
  testataVista,
  type TonoPastiglia,
} from '#ui/components/base.js'
import { statoVuotoAnno } from '#ui/components/filters.js'
import { icona } from '#ui/components/icons.js'
import { menuSotto, type ElementoMenu } from '#ui/components/menu.js'
import { inTelaio } from '#ui/components/table.js'
import { azione } from '#ui/bridge.js'
import { corsoDelContesto, nomeDelCorso } from '#ui/context.js'
import { gestisci, h, type Figlio } from '#ui/dom.js'
import { moduloAnno } from '#ui/forms.js'
import {
  allieviDelProgetto,
  etichettaOra,
  etichettaOraMostrata,
  moduloCriteri,
  moduloFasi,
  moduloGiudizio,
  moduloLivelli,
  moduloProgetto,
  nomeStatoProgetto,
  periodoDetto,
} from '#ui/forms/project.js'
import { apriLezione } from '#ui/pages.js'
import { moduloScalettaProgetto } from '#ui/forms/projectPlan.js'
import { testi as testiScaletta } from '#ui/forms/projectPlan.testi.js'
import {
  aggiorna,
  annoCorrente,
  lezioniDiCorso,
  progettoPerId,
  ridisegna,
  stato,
  vai,
  type LinguettaProgetto,
} from '#ui/state.js'
import { giudiziDelProgetto } from './projects/judgements.js'
import { legendaLivelli, matriceProgetto, progressioneAllievo, type QuandoMatrice } from './projects/matrix.js'
import { compitiDelProgetto } from './projects/tasks.js'
import { testi } from './projects.testi.js'

const TONI_STATO: Record<StatoProgetto, TonoPastiglia> = {
  bozza: 'quiete',
  'in-corso': 'informativo',
  concluso: 'positivo',
}

/** La pastiglia dello stato di un progetto: la usa anche la scheda dell'ora. */
export function pastigliaStato (progetto: Progetto): HTMLElement {
  return pastiglia(nomeStatoProgetto(progetto.stato), TONI_STATO[progetto.stato])
}

/** Apre un progetto nella sua pagina. */
export function apriProgetto (progettoId: string): void {
  vai({ pagina: 'pagina.corso.progetti', soggetto: { tipo: 'progetto', id: progettoId } })
}

/**
 * Il progetto che la pagina ha davanti: quello scelto se è del corso, se no
 * il primo. Esportato perché i comandi della barra agiscono su questo.
 */
export function progettoMostrato (): Progetto | null {
  const corso = corsoDelContesto()
  if (!corso) return null
  const scelto = progettoPerId(stato.progettoId)
  if (scelto && scelto.corsoId === corso.id) return scelto
  return progettiDelCorso(stato.registro, corso.id)[0] ?? null
}

/** Un periodo ricavato dalle ore, in una riga. */
function periodoScritto (periodo: Periodo): string {
  return periodo.inizio === periodo.fine
    ? formattaData(periodo.inizio)
    : `${formattaData(periodo.inizio)}–${formattaData(periodo.fine)}`
}

// ------------------------------------------------------------------ l'elenco

function elencoProgetti (
  progetti: Progetto[],
  attivo: Progetto | null,
  corsoId: string,
): HTMLElement {
  const t = testi()
  return h(
    'aside',
    { class: 'elenco-laterale', dataset: { telaio: 'progetti:elenco', scorrimento: `progetti:${corsoId}` } }, // testo-fisso: chiave di scorrimento
    h(
      'header',
      { class: 'elenco-laterale__testata' },
      h('h3', null, Molti(lessico().progetto)),
      pulsante({
        simbolo: 'piu',
        variante: 'fantasma',
        titolo: t.nuovo,
        al: () => moduloProgetto({ corsoId, dopo: apriProgetto }),
      }),
    ),
    progetti.length === 0
      ? quieto(t.nessunoNelCorso)
      : h(
          'ul',
          { class: 'elenco-laterale__voci' },
          ...progetti.map((progetto) => {
            const { attivita, quota } = avanzamentoDelProgetto(stato.registro, progetto)
            return h(
              'li',
              null,
              h(
                'button',
                {
                  class: ['voce-laterale', progetto.id === attivo?.id && 'voce-laterale--attiva'],
                  type: 'button',
                  attr: { 'aria-current': progetto.id === attivo?.id ? 'true' : undefined },
                  // testo-fisso: chiave di fuoco
                  dataset: { fuoco: `progetto-${progetto.id}` },
                  onclick: () => apriProgetto(progetto.id),
                },
                icona('progetto'),
                h(
                  'span',
                  { class: 'voce-laterale__testo' },
                  h('strong', null, progetto.titolo),
                  h('small', null, `${nomeStatoProgetto(progetto.stato)} · ${periodoDetto(progetto)}`),
                  attivita.length === 0 ? null : barra(quota, quota >= 1 ? 'positivo' : 'informativo', t.avanzamentoDi(progetto.titolo)),
                ),
              ),
            )
          }),
        ),
  )
}

// ------------------------------------------------------------------ le schede

function schedaTestata (progetto: Progetto): HTMLElement {
  const t = testi()
  const collegamenti = progetto.risorse.filter((r) => r.url)
  return scheda({
    titolo: progetto.titolo,
    sottotitolo: `${nomeStatoProgetto(progetto.stato)} · ${periodoDetto(progetto)}`,
    azioni: pulsante({
      testo: parole().modifica,
      simbolo: 'matita',
      variante: 'sottile',
      al: () => moduloProgetto({ corsoId: progetto.corsoId, progetto }),
    }),
    contenuto: h(
      'div',
      { class: 'testata-progetto' },
      progetto.descrizione ? h('p', null, progetto.descrizione) : null,
      progetto.obiettivi.length > 0
        ? [h('h4', null, t.obiettivi), h('ul', null, ...progetto.obiettivi.map((o) => h('li', null, o)))]
        : null,
      collegamenti.length > 0
        ? [
            h('h4', null, t.collegamenti),
            h('ul', null, ...collegamenti.map((r) =>
              h('li', null, h('a', { attr: { href: r.url, target: '_blank', rel: 'noopener' } }, r.titolo || r.url)))),
          ]
        : null,
      !progetto.descrizione && progetto.obiettivi.length === 0 && collegamenti.length === 0
        ? quieto(t.testataVuota)
        : null,
      // I PDF del progetto stanno con gli altri fogli del corso, nella pagina Documenti.
      h(
        'p',
        { class: 'testo-quieto' },
        collegamento({
          testo: t.documentiDelProgetto,
          al: () => { vai({ pagina: 'pagina.corso.documenti' }) },
        }),
      ),
    ),
  })
}

function schedaCriteri (progetto: Progetto): HTMLElement {
  const t = testi()
  return scheda({
    titolo: t.criteriELivelli,
    aiuto: t.criteriAiuto,
    azioni: [
      pulsante({
        testo: Molti(lessico().criterioProgetto),
        simbolo: 'presa',
        variante: 'sottile',
        al: () => moduloCriteri(progetto.id),
      }),
      pulsante({
        testo: t.livelli,
        simbolo: 'presa',
        variante: 'sottile',
        al: () => moduloLivelli(progetto.id),
      }),
    ],
    contenuto: h(
      'div',
      { class: 'colonna' },
      progetto.criteri.length === 0
        ? quieto(t.nessunCriterio)
        : h('ol', { class: 'criteri-progetto' }, ...progetto.criteri.map((c) => h('li', null, c.titolo))),
      legendaLivelli(progetto),
    ),
  })
}

function schedaCompiti (progetto: Progetto): HTMLElement {
  const t = testi()
  return inTelaio(scheda({
    titolo: Molti(lessico().compitoProgetto),
    aiuto: t.compitiAiuto,
    contenuto: compitiDelProgetto(progetto, null),
  }), `progetto-compiti:${progetto.id}`) // testo-fisso: una chiave, non un testo
}

/** Il giorno della matrice scelto nella pagina, per progetto: un'ora o una data. */
const giorniScelti = new Map<string, { data: Iso, lezioneId: string | null }>()
/** La persona di cui si guarda la progressione, per progetto; vuoto è la matrice del giorno. */
const progressioni = new Map<string, string>()

/** L'ora di oggi del corso, se c'è: la matrice parte da lì. */
function lezioneDiOggi (corsoId: string): Lezione | null {
  return lezioniDiCorso(corsoId).find((l) => l.data === stato.adessoData) ?? null
}

function quandoDellaMatrice (progetto: Progetto): QuandoMatrice {
  const scelto = giorniScelti.get(progetto.id)
  const lezione = scelto?.lezioneId
    ? stato.registro.lezioni.find((l) => l.id === scelto.lezioneId) ?? null
    : scelto ? null : lezioneDiOggi(progetto.corsoId)
  if (lezione && lezione.corsoId === progetto.corsoId) return { lezione }
  return { data: scelto?.data ?? stato.adessoData }
}

function schedaMatrice (progetto: Progetto): HTMLElement {
  const t = testi()
  const quando = quandoDellaMatrice(progetto)
  const allievi = allieviDelProgetto(progetto)
  const chi = progressioni.get(progetto.id) ?? ''
  const allievo = allievi.find((a) => a.id === chi) ?? null
  // Le ore che si offrono: quelle del progetto, più quella scelta se non lo è.
  const ore = lezioniDelProgetto(stato.registro, progetto).map((x) => x.lezione)
  if ('lezione' in quando && !ore.some((l) => l.id === quando.lezione.id)) ore.push(quando.lezione)
  ore.sort(confrontaLezioni)

  const scelte = h(
    'div',
    { class: 'filtri' },
    selettore(allievo ? 'progressione' : 'giorno', [
      { valore: 'giorno', testo: t.delGiorno, simbolo: 'calendario' },
      { valore: 'progressione', testo: t.progressione, simbolo: 'utente' },
    ], (scelta) => {
      if (scelta === 'giorno') progressioni.delete(progetto.id)
      else progressioni.set(progetto.id, allievo?.id ?? allievi[0]?.id ?? '')
      ridisegna()
    }, t.comeGuardare),
    allievo
      ? tendina({
          voci: allievi.map((a) => ({ valore: a.id, testo: nomeCompleto(a) })),
          valore: allievo.id,
          etichetta: Uno(lessico().pif),
          al: (scelto) => {
            progressioni.set(progetto.id, scelto)
            ridisegna()
          },
        })
      : [
          dataInLinea({
            etichetta: parole().giorno,
            nome: 'giornoMatrice',
            valore: 'lezione' in quando ? quando.lezione.data : quando.data,
            al: (valore) => {
              if (!valore) return
              giorniScelti.set(progetto.id, { data: valore, lezioneId: null })
              ridisegna()
            },
          }),
          tendina({
            voci: [
              { valore: '', testo: t.nessunaOra },
              ...ore.map((l) => ({ valore: l.id, testo: etichettaOra(l) })),
            ],
            valore: 'lezione' in quando ? quando.lezione.id : '',
            etichetta: t.inUnOra,
            al: (scelto) => {
              const lezione = ore.find((l) => l.id === scelto)
              giorniScelti.set(progetto.id, lezione
                ? { data: lezione.data, lezioneId: lezione.id }
                : { data: 'lezione' in quando ? quando.lezione.data : quando.data, lezioneId: null })
              ridisegna()
            },
          }),
        ],
  )

  // Un'ora conclusa si guarda e non si scrive: l'host rifiuterebbe.
  const chiusa = 'lezione' in quando && quando.lezione.stato === 'svolta'
  const matrice = allievo
    ? progressioneAllievo(progetto, allievo)
    : matriceProgetto(progetto, quando)
  return inTelaio(scheda({
    titolo: t.matrice,
    aiuto: t.matriceAiuto,
    contenuto: h(
      'div',
      { class: 'colonna', dataset: { telaio: `progetto-matrice:${progetto.id}` } }, // testo-fisso: una chiave, non un testo
      scelte,
      chiusa ? quieto(t.oraChiusa) : null,
      chiusa
        ? h('fieldset', { class: 'lezione-chiusa', attr: { disabled: true } }, matrice)
        : matrice,
    ),
  }), `progetto-matrice:${progetto.id}`) // testo-fisso: una chiave, non un testo
}

function schedaGiudizi (progetto: Progetto): HTMLElement {
  const t = testi()
  return scheda({
    titolo: Molti(lessico().giudizioProgetto),
    aiuto: t.giudiziAiuto,
    azioni: pulsante({
      testo: parole().aggiungi,
      simbolo: 'piu',
      variante: 'sottile',
      al: () => moduloGiudizio({ progetto }),
    }),
    contenuto: giudiziDelProgetto(progetto, null),
  })
}

const TONI_AVANZAMENTO: Record<StatoAttivita, TonoPastiglia> = {
  'da-fare': 'quiete',
  svolta: 'positivo',
  parziale: 'attenzione',
  saltata: 'negativo',
}

/**
 * Le fasi aperte, per progetto: fuori dallo stato, durano quanto il pannello.
 * Un progetto mai toccato apre la fase in cui cade oggi.
 */
const fasiAperte = new Map<string, Set<string>>()

function faseAperta (progetto: Progetto, voce: QuadroDellaFase): boolean {
  const aperte = fasiAperte.get(progetto.id)
  if (aperte) return aperte.has(voce.fase.id)
  const periodo = voce.periodo
  return periodo !== null && periodo.inizio <= stato.adessoData && stato.adessoData <= periodo.fine
}

function invertiFase (progetto: Progetto, quadro: QuadroDelProgetto, voce: QuadroDellaFase): void {
  const aperte = fasiAperte.get(progetto.id) ??
    new Set(quadro.fasi.filter((v) => faseAperta(progetto, v)).map((v) => v.fase.id))
  if (aperte.has(voce.fase.id)) aperte.delete(voce.fase.id)
  else aperte.add(voce.fase.id)
  fasiAperte.set(progetto.id, aperte)
  ridisegna()
}

/**
 * Le fasi del progetto, una sotto l'altra e ripiegate: chiuse dicono numero,
 * titolo, periodo e quanto se n'è fatto; aperte le attività dei piani nelle
 * ore (col loro stato) e le prove nate lì. Tutto si ricava dal quadro del
 * progetto: niente si scrive qui, tranne le fasi stesse.
 */
function schedaFasi (progetto: Progetto, quadro: QuadroDelProgetto): HTMLElement {
  const t = testi()
  const lezioni = new Map(stato.registro.lezioni.map((l) => [l.id, l]))
  const fase = (voce: QuadroDellaFase): HTMLElement => {
    const ts = testiScaletta()
    const canoniche = (progetto.attivita ?? []).filter((a) => a.faseId === voce.fase.id)
    const aperta = faseAperta(progetto, voce)
    // testo-fisso: id del DOM, non si legge
    const idCorpo = `fase-corpo-${progetto.id}-${voce.fase.id}`
    // Le attività di un'ora insieme: l'ora una volta, con le sue tappe accanto.
    const perOra = new Map<string, AttivitaNellOra[]>()
    for (const a of voce.attivita) perOra.set(a.lezioneId, [...(perOra.get(a.lezioneId) ?? []), a])
    const corpo = voce.attivita.length === 0
      ? quieto(t.faseVuota)
      : h(
          'ul',
          { class: 'lezioni-progetto' },
          ...[...perOra].map(([lezioneId, attivita]) => {
            const lezione = lezioni.get(lezioneId)
            return h(
              'li',
              { class: 'lezioni-progetto__voce' },
              lezione
                ? collegamento({
                    testo: etichettaOraMostrata(lezione),
                    al: () => apriLezione(lezione.id),
                  })
                : h('span', null, formattaData(attivita[0].data)),
              ...attivita.map((a) => pastiglia(
                `${a.titolo || parole().senzaTitolo} · ${t.statiAttivita[a.stato]}`,
                TONI_AVANZAMENTO[a.stato],
                'piano',
              )),
            )
          }),
        )
    return h(
      'section',
      { class: ['fase-progetto', aperta && 'fase-progetto--aperta'] },
      h(
        'h4',
        { class: 'fase-progetto__titolo' },
        h(
          'button',
          {
            class: 'fase-progetto__interruttore',
            type: 'button',
            attr: { 'aria-expanded': String(aperta), 'aria-controls': aperta ? idCorpo : undefined },
            // testo-fisso: chiave di fuoco, non si legge
            dataset: { fuoco: `fase:${progetto.id}:${voce.fase.id}` },
            onclick: () => invertiFase(progetto, quadro, voce),
          },
          icona(aperta ? 'giu' : 'destra', 'fase-progetto__freccia'),
          h('span', { class: 'fase-progetto__nome' }, `${voce.numero}. ${voce.fase.titolo}`),
          h('span', { class: 'testo-quieto' }, voce.periodo ? periodoScritto(voce.periodo) : t.faseSenzaOre),
        ),
      ),
      voce.attivita.length > 0
        ? barra(voce.quota, voce.quota >= 1 ? 'positivo' : 'informativo', t.avanzamentoDi(voce.fase.titolo))
        : null,
      aperta
        ? h(
            'div',
            { class: 'fase-progetto__corpo', id: idCorpo },
            voce.fase.descrizione ? h('p', { class: 'testo-quieto' }, voce.fase.descrizione) : null,
            pulsante({
              testo: ts.modificaScaletta,
              simbolo: 'piano',
              variante: 'sottile',
              al: () => moduloScalettaProgetto(progetto.id, voce.fase.id),
            }),
            canoniche.length > 0 ? h('ol', { class: 'lezioni-progetto' }, ...canoniche.map((a) => {
              const pianificata = stato.registro.piani.some((p) =>
                p.attivita.some((tappa) =>
                  tappa.progettoId === progetto.id && tappa.attivitaProgettoId === a.id,
                ),
              )
              return h('li', {
                class: 'lezioni-progetto__voce', dataset: { attivitaProgettoId: a.id },
              },
              h('span', null, a.titolo || parole().senzaTitolo),
              pastiglia(
                formattaDurata(minutiDiAttivita(a.durataUd, stato.registro.impostazioni.minutiUd)),
                'quiete',
              ),
              pastiglia(
                pianificata ? ts.pianificata : ts.daPianificare,
                pianificata ? 'informativo' : 'quiete',
              ),
              )
            })) : null,
            corpo,
            voce.momenti.length > 0
              ? h(
                  'p',
                  { class: 'testo-quieto' },
                  icona('valutazioni', 'icona--minuta'),
                  ` ${voce.momenti.map((m) => m.titolo).join(', ')}`,
                )
              : null,
          )
        : null,
    )
  }
  return scheda({
    titolo: t.fasi,
    sottotitolo: quadro.periodo
      ? `${periodoScritto(quadro.periodo)} · ${t.svolto(Math.round(quadro.quota * 100))}`
      : t.nessunaLezione,
    aiuto: t.fasiAiuto,
    azioni: pulsante({
      testo: t.fasi,
      simbolo: 'presa',
      variante: 'sottile',
      al: () => moduloFasi(progetto.id),
    }),
    contenuto: h('div', { class: 'fasi-progetto' }, ...quadro.fasi.map(fase)),
  })
}

/** Le presenze di chi frequenta nelle ore del progetto: UD perse e ritardi. */
function schedaPresenze (progetto: Progetto, quadro: QuadroDelProgetto): HTMLElement | null {
  const t = testi()
  if (quadro.presenze.every((r) => r.ore.length === 0)) return null
  const nomi = new Map(allieviDelProgetto(progetto).map((a) => [a.id, nomeCompleto(a)]))
  return scheda({
    titolo: t.presenze,
    aiuto: t.presenzeAiuto,
    contenuto: h(
      'table',
      { class: 'tabella tabella--compatta' },
      h(
        'thead',
        null,
        h(
          'tr',
          null,
          h('th', { attr: { scope: 'col' } }, Uno(lessico().pif)),
          h('th', { attr: { scope: 'col' } }, t.udPerse),
          h('th', { attr: { scope: 'col' } }, t.ritardi),
        ),
      ),
      h(
        'tbody',
        null,
        ...quadro.presenze.map((r) =>
          h(
            'tr',
            null,
            h('th', { attr: { scope: 'row' } }, nomi.get(r.allievoId) ?? '?'),
            h('td', null, `${r.udAssenza}/${r.udTotali}`),
            h('td', null, String(r.ritardi)),
          )),
      ),
    ),
  })
}

/** Lega un momento del corso al progetto, o lo stacca (`null`). */
function legaMomento (momento: MomentoValutazione, progettoId: string | null): void {
  void azione({ tipo: 'valutazione.salva', valutazione: { ...momento, progettoId } })
}

function schedaValutazioni (progetto: Progetto): HTMLElement {
  const t = testi()
  const momenti = momentiDelProgetto(stato.registro, progetto)
  const liberi = stato.registro.valutazioni
    .filter((v) => v.corsoId === progetto.corsoId && !v.progettoId)
    .sort((a, b) => b.data.localeCompare(a.data))
  const voci = (): ElementoMenu[] => liberi.length === 0
    ? [{ titolo: t.nessunMomentoLibero }]
    : liberi.map((m) => ({
        testo: m.titolo,
        descrizione: formattaData(m.data),
        simbolo: 'valutazioni' as const,
        al: () => legaMomento(m, progetto.id),
      }))
  return scheda({
    titolo: t.valutazioniDelProgetto,
    aiuto: t.valutazioniAiuto,
    azioni: pulsante({
      testo: t.collegaValutazione,
      simbolo: 'collegamento',
      variante: 'sottile',
      al: (evento) => menuSotto(evento.currentTarget as HTMLElement, voci()),
    }),
    contenuto: momenti.length === 0
      ? quieto(t.nessunaValutazione)
      : h(
          'ul',
          { class: 'lezioni-progetto' },
          ...momenti.map((m) =>
            h(
              'li',
              { class: 'lezioni-progetto__voce' },
              icona('valutazioni', 'icona--minuta'),
              collegamento({
                testo: m.titolo,
                al: () => { vai({ pagina: 'pagina.corso.valutazioni', soggetto: { tipo: 'valutazione', id: m.id } }) },
              }),
              h('span', { class: 'testo-quieto' }, formattaData(m.data)),
              pulsante({
                simbolo: 'chiudi',
                variante: 'fantasma',
                titolo: t.staccaValutazione(m.titolo),
                al: () => legaMomento(m, null),
              }),
            )),
        ),
  })
}

// testo-fisso: prefisso di id del DOM, non si legge
const idLinguettaProgetto = (linguetta: LinguettaProgetto): string => `progetto-linguetta-${linguetta}`
// testo-fisso: id del DOM, non si legge
const ID_PANNELLO_PROGETTO = 'progetto-pannello'

/** La linguetta ricordata del progetto; mai scelta, le fasi. */
function linguettaAperta (progetto: Progetto): LinguettaProgetto {
  return stato.linguetteProgetti[progetto.id] ?? 'fasi'
}

/** Le scelte con questa in fondo: la memoria tiene le ultime. */
function conLinguetta (
  progettoId: string,
  linguetta: LinguettaProgetto,
): Record<string, LinguettaProgetto> {
  const scelte = { ...stato.linguetteProgetti }
  delete scelte[progettoId]
  scelte[progettoId] = linguetta
  return scelte
}

/**
 * Sotto testata, criteri e compiti, sempre in vista, il resto a linguette:
 * fasi, matrice ed esiti (giudizi, valutazioni, presenze). Come quelle dei
 * compiti: le frecce, Inizio e Fine scelgono e il fuoco segue.
 */
function linguetteDelProgetto (progetto: Progetto, quadro: QuadroDelProgetto): HTMLElement {
  const t = testi()
  const aperta = linguettaAperta(progetto)
  const voci: Array<{ valore: LinguettaProgetto, testo: string, titolo?: string }> = [
    { valore: 'fasi', testo: t.fasi },
    { valore: 'matrice', testo: t.matrice },
    { valore: 'esiti', testo: t.esiti, titolo: t.esitiAiuto },
  ]
  const scegli = (linguetta: LinguettaProgetto): void => {
    if (linguetta !== aperta) aggiorna({ linguetteProgetti: conLinguetta(progetto.id, linguetta) })
  }
  const gruppo = h(
    'div',
    { class: ['selettore', 'progetto-linguette__gruppo'], attr: { role: 'tablist', 'aria-label': t.parti } },
    ...voci.map((voce) => {
      const accesa = voce.valore === aperta
      return h(
        'button',
        {
          class: ['selettore__voce', accesa && 'selettore__voce--attiva'],
          type: 'button',
          id: idLinguettaProgetto(voce.valore),
          attr: {
            role: 'tab',
            'aria-selected': String(accesa),
            'aria-controls': accesa ? ID_PANNELLO_PROGETTO : undefined,
            tabindex: accesa ? 0 : -1,
            title: voce.titolo,
          },
          // testo-fisso: chiave di fuoco, non si legge
          dataset: { fuoco: `progetto-linguetta:${voce.valore}` },
          onclick: () => scegli(voce.valore),
        },
        voce.testo,
      )
    }),
  )
  gestisci(gruppo, 'keydown', (evento) => {
    const dove = voci.findIndex((v) => v.valore === aperta)
    const tasto = evento.key
    const indice = tasto === 'ArrowRight' || tasto === 'ArrowDown'
      ? (dove + 1) % voci.length
      : tasto === 'ArrowLeft' || tasto === 'ArrowUp'
        ? (dove - 1 + voci.length) % voci.length
        : tasto === 'Home' ? 0 : tasto === 'End' ? voci.length - 1 : -1
    if (indice < 0) return
    evento.preventDefault()
    // Il fuoco passa prima alla linguetta nuova, così il ridisegno lo ritrova lì.
    const linguette = (evento.currentTarget as HTMLElement).children
    ;(linguette[indice] as HTMLElement | undefined)?.focus()
    scegli(voci[indice].valore)
  })
  const contenuto: Figlio[] = aperta === 'fasi'
    ? [schedaFasi(progetto, quadro)]
    : aperta === 'matrice'
      ? [schedaMatrice(progetto)]
      : [schedaGiudizi(progetto), schedaValutazioni(progetto), schedaPresenze(progetto, quadro)]
  return h(
    'div',
    { class: 'progetto-linguette' },
    gruppo,
    h(
      'div',
      {
        class: 'colonna',
        id: ID_PANNELLO_PROGETTO,
        attr: { role: 'tabpanel', 'aria-labelledby': idLinguettaProgetto(aperta) },
      },
      ...contenuto,
    ),
  )
}

function dettaglio (progetto: Progetto): HTMLElement {
  const quadro = quadroDelProgetto(stato.registro, progetto)
  return h(
    'div',
    { class: 'colonna', dataset: { telaio: 'progetti:dettaglio' } },
    schedaTestata(progetto),
    schedaCriteri(progetto),
    schedaCompiti(progetto),
    linguetteDelProgetto(progetto, quadro),
  )
}

// ------------------------------------------------------------------ la pagina

export function vistaProgetti (): Figlio {
  if (!annoCorrente()) {
    return statoVuotoAnno({ simbolo: 'progetto', crea: () => moduloAnno() })
  }
  const t = testi()
  const corso = corsoDelContesto()
  if (!corso) {
    return statoVuoto({
      simbolo: 'progetto',
      titolo: t.nessunCorso,
      testo: t.progettiInUnCorso,
      azione: pulsante({
        testo: t.vaiAiCorsi,
        variante: 'primario',
        al: () => { vai({ pagina: 'pagina.corsi' }) },
      }),
    })
  }
  const progetti = progettiDelCorso(stato.registro, corso.id)
  const progetto = progettoMostrato()
  const nuovo = (): void => moduloProgetto({ corsoId: corso.id, dopo: apriProgetto })

  return h(
    'div',
    { class: 'vista vista--progetti', dataset: { telaio: 'progetti' } },
    testataVista({
      titolo: Molti(lessico().progetto),
      sottotitolo: nomeDelCorso(corso),
      aiuto: t.aiuto,
    }),
    h(
      'div',
      { class: 'colonne colonne--elenco', dataset: { telaio: 'progetti:colonne' } },
      elencoProgetti(progetti, progetto, corso.id),
      progetto
        ? dettaglio(progetto)
        : h(
            'div',
            { class: 'colonna' },
            statoVuoto({
              simbolo: 'progetto',
              titolo: t.nessunProgetto,
              testo: t.nessunProgettoTesto,
              azione: pulsante({ testo: t.nuovo, simbolo: 'piu', variante: 'primario', al: nuovo }),
            }),
          ),
    ),
  )
}
