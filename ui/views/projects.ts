// La pagina Progetti (estensione di ADR-54 del 2026-10-03): la biblioteca
// dell'anno, di nessun corso. L'elenco a sinistra, il progetto aperto a
// destra: testata con obiettivi e risorse, le fasi con le attività della
// scaletta (quel che si importa nei piani lezione), criteri e livelli, e i
// corsi in cui è integrato, con il rimando alla loro pagina Integrazione
// progetti. Il lavoro con una classe (compiti, matrice, giudizi) sta lì.

import { minutiDiAttivita } from '#core/dominio/calculations.js'
import { formattaDurata } from '#core/dominio/dates.js'
import { Molti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type { Corso, Progetto } from '#core/dominio/models.js'
import { nelCorso, progettiPerTitolo } from '#core/dominio/projects.js'
import { parole } from '#core/dominio/words.testi.js'
import {
  collegamento,
  pastiglia,
  pulsante,
  quieto,
  scheda,
  statoVuoto,
  testataVista,
} from '#ui/components/base.js'
import { statoVuotoAnno } from '#ui/components/filters.js'
import { icona } from '#ui/components/icons.js'
import { menuSotto, type ElementoMenu } from '#ui/components/menu.js'
import { azione } from '#ui/bridge.js'
import { nomeDelCorso } from '#ui/context.js'
import { h, type Figlio } from '#ui/dom.js'
import { moduloAnno } from '#ui/forms.js'
import {
  moduloCriteri,
  moduloFasi,
  moduloLivelli,
  moduloProgetto,
  periodoDetto,
} from '#ui/forms/project.js'
import { moduloScalettaProgetto } from '#ui/forms/projectPlan.js'
import { testi as testiScaletta } from '#ui/forms/projectPlan.testi.js'
import { annoCorrente, corsiDellAnnoAperto, progettoPerId, stato } from '#ui/state.js'
import { apriIntegrazione, apriProgetto, pastigliaStato } from './projects/links.js'
import { legendaLivelli } from './projects/matrix.js'
import { testi } from './projects.testi.js'

/**
 * Il progetto che la pagina ha davanti: quello scelto, se no il primo per
 * titolo. Esportato perché i comandi della barra agiscono su questo.
 */
export function progettoMostrato (): Progetto | null {
  return progettoPerId(stato.progettoId) ?? progettiPerTitolo(stato.registro)[0] ?? null
}

/** Quante attività ha la scaletta del progetto, in tutte le fasi. */
function attivitaDi (progetto: Progetto): number {
  return progetto.attivita?.length ?? 0
}

// ------------------------------------------------------------------ l'elenco

function elencoProgetti (progetti: Progetto[], attivo: Progetto | null): HTMLElement {
  const t = testi()
  return h(
    'aside',
    { class: 'elenco-laterale', dataset: { telaio: 'progetti:elenco', scorrimento: 'progetti:anno' } }, // testo-fisso: chiave di scorrimento
    h(
      'header',
      { class: 'elenco-laterale__testata' },
      h('h3', null, Molti(lessico().progetto)),
      pulsante({
        simbolo: 'piu',
        variante: 'fantasma',
        titolo: t.nuovo,
        al: () => moduloProgetto({ dopo: apriProgetto }),
      }),
    ),
    progetti.length === 0
      ? quieto(t.nessunoNellAnno)
      : h(
          'ul',
          { class: 'elenco-laterale__voci' },
          ...progetti.map((progetto) =>
            h(
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
                  h('small', null, `${t.fasiEAttivita(progetto.fasi.length, attivitaDi(progetto))} · ${t.inCorsi(progetto.integrazioni.length)}`),
                ),
              ),
            )),
        ),
  )
}

// ------------------------------------------------------------------ le schede

/** Una risorsa del progetto: il collegamento si apre, il file si nomina. */
function risorsaDetta (risorsa: Progetto['risorse'][number]): Figlio {
  const titolo = risorsa.titolo || risorsa.nome || risorsa.url || parole().senzaTitolo
  return risorsa.url
    ? h('a', { attr: { href: risorsa.url, target: '_blank', rel: 'noopener' } }, titolo)
    : h('span', null, icona('documento', 'icona--minuta'), ` ${titolo}`)
}

function schedaTestata (progetto: Progetto): HTMLElement {
  const t = testi()
  return scheda({
    titolo: progetto.titolo,
    sottotitolo: t.fasiEAttivita(progetto.fasi.length, attivitaDi(progetto)),
    azioni: pulsante({
      testo: parole().modifica,
      simbolo: 'matita',
      variante: 'sottile',
      al: () => moduloProgetto({ progetto }),
    }),
    contenuto: h(
      'div',
      { class: 'testata-progetto' },
      progetto.descrizione ? h('p', null, progetto.descrizione) : null,
      progetto.obiettivi.length > 0
        ? [h('h4', null, t.obiettivi), h('ul', null, ...progetto.obiettivi.map((o) => h('li', null, o)))]
        : null,
      progetto.risorse.length > 0
        ? [h('h4', null, t.risorse), h('ul', null, ...progetto.risorse.map((r) => h('li', null, risorsaDetta(r))))]
        : null,
      !progetto.descrizione && progetto.obiettivi.length === 0 && progetto.risorse.length === 0
        ? quieto(t.testataVuota)
        : null,
    ),
  })
}

/**
 * Le fasi con le attività della scaletta: quel che si porta nei piani
 * lezione. Si scrive qui, fase per fase; dove sta nei piani lo dice la pagina
 * Integrazione progetti di ogni corso.
 */
function schedaScaletta (progetto: Progetto): HTMLElement {
  const t = testi()
  const ts = testiScaletta()
  const minuti = stato.registro.impostazioni.minutiUd
  return scheda({
    titolo: t.scaletta,
    aiuto: t.scalettaAiuto,
    azioni: pulsante({
      testo: t.fasi,
      simbolo: 'presa',
      variante: 'sottile',
      al: () => moduloFasi(progetto.id),
    }),
    contenuto: h(
      'div',
      { class: 'fasi-progetto' },
      ...progetto.fasi.map((fase, indice) => {
        const attivita = (progetto.attivita ?? []).filter((a) => a.faseId === fase.id)
        return h(
          'section',
          { class: 'fase-progetto fase-progetto--aperta', dataset: { faseId: fase.id } },
          h(
            'h4',
            { class: 'fase-progetto__titolo' },
            h('span', { class: 'fase-progetto__nome' }, `${indice + 1}. ${fase.titolo}`),
            pulsante({
              testo: ts.modificaScaletta,
              simbolo: 'matita',
              variante: 'fantasma',
              al: () => moduloScalettaProgetto(progetto.id, fase.id),
            }),
          ),
          h(
            'div',
            { class: 'fase-progetto__corpo' },
            fase.descrizione ? h('p', { class: 'testo-quieto' }, fase.descrizione) : null,
            attivita.length === 0
              ? quieto(t.faseSenzaAttivita)
              : h('ol', { class: 'lezioni-progetto' }, ...attivita.map((a) =>
                  h(
                    'li',
                    { class: 'lezioni-progetto__voce', dataset: { attivitaProgettoId: a.id } },
                    h('span', null, a.titolo || parole().senzaTitolo),
                    pastiglia(formattaDurata(minutiDiAttivita(a.durataUd, minuti)), 'quiete'),
                  ))),
          ),
        )
      }),
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

/** Integra il progetto in un corso e porta alla sua pagina di integrazione. */
async function integraIn (progetto: Progetto, corso: Corso): Promise<void> {
  const risposta = await azione({ tipo: 'progetto.integra', progettoId: progetto.id, corsoId: corso.id })
  if (risposta.ok) apriIntegrazione(progetto.id, corso.id)
}

/**
 * I corsi dell'anno in cui il progetto è integrato, ognuno con lo stato, il
 * periodo e il rimando alla sua pagina; e il gesto per integrarlo in un altro.
 */
function schedaIntegrazioni (progetto: Progetto): HTMLElement {
  const t = testi()
  const corsi = corsiDellAnnoAperto()
  const dentro = corsi.filter((c) => progetto.integrazioni.some((i) => i.corsoId === c.id))
  const voci = (): ElementoMenu[] => {
    const fuori = corsi.filter((c) => !dentro.includes(c))
    return fuori.length === 0
      ? [{ titolo: t.giaInTutti }]
      : fuori.map((corso) => ({
          testo: nomeDelCorso(corso),
          simbolo: 'libro' as const,
          al: () => { void integraIn(progetto, corso) },
        }))
  }
  return scheda({
    titolo: t.integratoIn,
    aiuto: t.integratoInAiuto,
    azioni: pulsante({
      testo: t.integraInCorso,
      simbolo: 'piu',
      variante: 'sottile',
      al: (evento) => menuSotto(evento.currentTarget as HTMLElement, voci()),
    }),
    contenuto: dentro.length === 0
      ? quieto(t.nessunaIntegrazione)
      : h(
          'ul',
          { class: 'lezioni-progetto integrazioni-progetto' },
          ...dentro.map((corso) => {
            const visto = nelCorso(progetto, corso.id)
            return h(
              'li',
              { class: 'lezioni-progetto__voce', dataset: { corsoId: corso.id } },
              icona('libro', 'icona--minuta'),
              collegamento({
                testo: nomeDelCorso(corso),
                titolo: t.apriIntegrazione(nomeDelCorso(corso)),
                al: () => apriIntegrazione(progetto.id, corso.id),
              }),
              visto ? pastigliaStato(visto) : null,
              visto ? h('span', { class: 'testo-quieto' }, periodoDetto(visto)) : null,
            )
          }),
        ),
  })
}

function dettaglio (progetto: Progetto): HTMLElement {
  return h(
    'div',
    { class: 'colonna', dataset: { telaio: 'progetti:dettaglio' } },
    schedaTestata(progetto),
    schedaScaletta(progetto),
    schedaCriteri(progetto),
    schedaIntegrazioni(progetto),
  )
}

// ------------------------------------------------------------------ la pagina

export function vistaProgetti (): Figlio {
  if (!annoCorrente()) {
    return statoVuotoAnno({ simbolo: 'progetto', crea: () => moduloAnno() })
  }
  const t = testi()
  const progetti = progettiPerTitolo(stato.registro)
  const progetto = progettoMostrato()
  const nuovo = (): void => moduloProgetto({ dopo: apriProgetto })

  return h(
    'div',
    { class: 'vista vista--progetti', dataset: { telaio: 'progetti' } },
    testataVista({
      titolo: Molti(lessico().progetto),
      sottotitolo: t.biblioteca,
      aiuto: t.aiuto,
    }),
    h(
      'div',
      { class: 'colonne colonne--elenco', dataset: { telaio: 'progetti:colonne' } },
      elencoProgetti(progetti, progetto),
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
