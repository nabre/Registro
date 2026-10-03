// L'integrazione dei progetti nel corso (estensione di ADR-54 del 2026-10-03):
// un elemento della progettazione. A sinistra i progetti della biblioteca
// integrati nel corso, a destra quello aperto visto dal corso: lo stato con la
// classe, i compiti, e a linguette le fasi nei piani (le attività della
// scaletta già programmate nei piani del corso e quelle ancora da programmare,
// con le lezioni e il loro consuntivo), la matrice a livelli e gli esiti
// (giudizi, valutazioni, presenze). Testata, scaletta, criteri e livelli si
// scrivono nella pagina Progetti, che è la biblioteca dell'anno.

import { confrontaLezioni, minutiDiAttivita, nomeCompleto } from '#core/dominio/calculations.js'
import { formattaData, formattaDurata } from '#core/dominio/dates.js'
import { Molti, Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type {
  Corso,
  Iso,
  Lezione,
  MomentoValutazione,
  ProgettoNelCorso,
  StatoAttivita,
} from '#core/dominio/models.js'
import {
  avanzamentoDelProgetto,
  lezioniDelProgetto,
  momentiDelProgetto,
  progettiDelCorso,
  progettiPerTitolo,
  quadroDelProgetto,
  STATI_PROGETTO,
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
import { conferma } from '#ui/components/modal.js'
import { inTelaio } from '#ui/components/table.js'
import { azione } from '#ui/bridge.js'
import { corsoDelContesto, nomeDelCorso } from '#ui/context.js'
import { gestisci, h, type Figlio } from '#ui/dom.js'
import { moduloAnno } from '#ui/forms.js'
import { moduloPiano } from '#ui/forms/plan.js'
import {
  allieviDelProgetto,
  etichettaOra,
  etichettaOraMostrata,
  moduloGiudizio,
  moduloProgetto,
  nomeStatoProgetto,
  periodoDetto,
} from '#ui/forms/project.js'
import { moduloScalettaProgetto } from '#ui/forms/projectPlan.js'
import { testi as testiScaletta } from '#ui/forms/projectPlan.testi.js'
import { apriLezione } from '#ui/pages.js'
import {
  aggiorna,
  annoCorrente,
  lezioniDiCorso,
  nomeDiPiano,
  progettoNelCorso,
  ridisegna,
  stato,
  vai,
  type LinguettaProgetto,
} from '#ui/state.js'
import { oreDelCorso, pianiSciolti } from './plansNavigator.js'
import { giudiziDelProgetto } from './projects/judgements.js'
import { legendaLivelli, matriceProgetto, progressioneAllievo, type QuandoMatrice } from './projects/matrix.js'
import { compitiDelProgetto } from './projects/tasks.js'
import { apriIntegrazione, apriProgetto } from './projects/links.js'
import { testi as testiProgetti } from './projects.testi.js'
import { testi } from './projectIntegration.testi.js'

/**
 * Il progetto che la pagina ha davanti, visto dal corso: quello scelto se è
 * integrato nel corso, se no il primo. Esportato perché i comandi della barra
 * agiscono su questo.
 */
export function progettoIntegratoMostrato (): ProgettoNelCorso | null {
  const corso = corsoDelContesto()
  if (!corso) return null
  return progettoNelCorso(stato.progettoId, corso.id) ??
    progettiDelCorso(stato.registro, corso.id)[0] ?? null
}

/** Un periodo ricavato dalle ore, in una riga. */
function periodoScritto (periodo: Periodo): string {
  return periodo.inizio === periodo.fine
    ? formattaData(periodo.inizio)
    : `${formattaData(periodo.inizio)}–${formattaData(periodo.fine)}`
}

// ------------------------------------------------------------------ integrare e togliere

/** Integra un progetto della biblioteca nel corso e lo apre. */
async function integra (progettoId: string, corso: Corso): Promise<void> {
  const risposta = await azione({ tipo: 'progetto.integra', progettoId, corsoId: corso.id })
  if (risposta.ok) apriIntegrazione(progettoId, corso.id)
}

/**
 * Le voci del menu «Integra un progetto…»: i progetti dell'anno non ancora
 * nel corso, poi uno nuovo, che nasce nella biblioteca e si integra subito.
 */
function vociIntegra (corso: Corso): ElementoMenu[] {
  const t = testi()
  const fuori = progettiPerTitolo(stato.registro)
    .filter((p) => !p.integrazioni.some((i) => i.corsoId === corso.id))
  return [
    { titolo: t.daBiblioteca },
    ...(fuori.length === 0
      ? [{ titolo: t.tuttiIntegrati }]
      : fuori.map((p) => ({
          testo: p.titolo,
          descrizione: testiProgetti().inCorsi(p.integrazioni.length),
          simbolo: 'progetto' as const,
          al: () => { void integra(p.id, corso) },
        }))),
    'separatore',
    {
      testo: t.nuovoProgetto,
      simbolo: 'piu',
      al: () => moduloProgetto({ corsoId: corso.id, dopo: (id) => apriIntegrazione(id, corso.id) }),
    },
  ]
}

/** Il pulsante che apre il menu per integrare: in testa all'elenco e nello stato vuoto. */
function pulsanteIntegra (corso: Corso, variante: 'fantasma' | 'primario'): HTMLElement {
  const t = testi()
  return pulsante({
    simbolo: 'piu',
    variante,
    ...(variante === 'primario' ? { testo: t.integra } : { titolo: t.integra }),
    al: (evento) => menuSotto(evento.currentTarget as HTMLElement, vociIntegra(corso)),
  })
}

/** Le tappe dei piani del corso che lavorano per il progetto: togliendolo, restano sganciate. */
function tappeNelCorso (progetto: ProgettoNelCorso): number {
  return stato.registro.piani
    .filter((p) => p.corsoId === progetto.corsoId)
    .reduce((n, p) => n + p.attivita.filter((a) => a.progettoId === progetto.id).length, 0)
}

/** Toglie il progetto dal corso, dopo aver detto che cosa se ne va e che cosa resta. */
async function togliDalCorso (progetto: ProgettoNelCorso): Promise<void> {
  const t = testi()
  const sicuro = await conferma({
    titolo: t.togliereDalCorso(progetto.titolo),
    testo: t.togliTesto({
      compiti: progetto.compiti.length,
      giudizi: progetto.giudizi.length,
      caselle: progetto.matrice.length,
      tappe: tappeNelCorso(progetto),
    }),
    testoConferma: t.togliConferma,
    pericolo: true,
  })
  if (!sicuro) return
  const risposta = await azione({
    tipo: 'progetto.integrazione.togli',
    progettoId: progetto.id,
    corsoId: progetto.corsoId,
  })
  if (risposta.ok) {
    vai({ pagina: 'pagina.corso.integrazione', soggetto: { tipo: 'corso', id: progetto.corsoId } },
      { contesto: { progettoId: null } })
  }
}

// ------------------------------------------------------------------ l'elenco

function elencoIntegrati (
  progetti: ProgettoNelCorso[],
  attivo: ProgettoNelCorso | null,
  corso: Corso,
): HTMLElement {
  const t = testi()
  return h(
    'aside',
    { class: 'elenco-laterale', dataset: { telaio: 'integrazione:elenco', scorrimento: `integrazione:${corso.id}` } }, // testo-fisso: chiave di scorrimento
    h(
      'header',
      { class: 'elenco-laterale__testata' },
      h('h3', null, Molti(lessico().progetto)),
      pulsanteIntegra(corso, 'fantasma'),
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
                  dataset: { fuoco: `integrato-${progetto.id}` },
                  onclick: () => apriIntegrazione(progetto.id, corso.id),
                },
                icona('progetto'),
                h(
                  'span',
                  { class: 'voce-laterale__testo' },
                  h('strong', null, progetto.titolo),
                  h('small', null, `${nomeStatoProgetto(progetto.stato)} · ${periodoDetto(progetto)}`),
                  attivita.length === 0
                    ? null
                    : barra(quota, quota >= 1 ? 'positivo' : 'informativo', testiProgetti().avanzamentoDi(progetto.titolo)),
                ),
              ),
            )
          }),
        ),
  )
}

// ------------------------------------------------------------------ le schede

/** Il progetto nel corso: lo stato con la classe, il periodo, e i rimandi. */
function schedaTestata (progetto: ProgettoNelCorso): HTMLElement {
  const t = testi()
  const tp = testiProgetti()
  return scheda({
    titolo: progetto.titolo,
    sottotitolo: periodoDetto(progetto),
    azioni: [
      pulsante({
        testo: t.apriBiblioteca,
        simbolo: 'progetto',
        variante: 'sottile',
        al: () => apriProgetto(progetto.id),
      }),
      pulsante({
        testo: t.togli,
        simbolo: 'cestino',
        variante: 'sottile',
        al: () => { void togliDalCorso(progetto) },
      }),
    ],
    contenuto: h(
      'div',
      { class: 'testata-progetto' },
      h(
        'div',
        { class: 'filtri' },
        selettore(
          progetto.stato,
          STATI_PROGETTO.map((s) => ({ valore: s, testo: nomeStatoProgetto(s) })),
          (scelto) => {
            if (scelto === progetto.stato) return
            void azione({
              tipo: 'progetto.integrazione.stato',
              progettoId: progetto.id,
              corsoId: progetto.corsoId,
              stato: scelto,
            })
          },
          t.statoNelCorso,
        ),
      ),
      progetto.descrizione ? h('p', null, progetto.descrizione) : null,
      progetto.obiettivi.length > 0
        ? [h('h4', null, tp.obiettivi), h('ul', null, ...progetto.obiettivi.map((o) => h('li', null, o)))]
        : null,
      // I PDF del progetto stanno con gli altri fogli del corso, nella pagina Documenti.
      h(
        'p',
        { class: 'testo-quieto' },
        collegamento({
          testo: tp.documentiDelProgetto,
          al: () => { vai({ pagina: 'pagina.corso.documenti' }) },
        }),
      ),
    ),
  })
}

function schedaCompiti (progetto: ProgettoNelCorso): HTMLElement {
  const t = testiProgetti()
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

function quandoDellaMatrice (progetto: ProgettoNelCorso): QuandoMatrice {
  const scelto = giorniScelti.get(progetto.id)
  const lezione = scelto?.lezioneId
    ? stato.registro.lezioni.find((l) => l.id === scelto.lezioneId) ?? null
    : scelto ? null : lezioneDiOggi(progetto.corsoId)
  if (lezione && lezione.corsoId === progetto.corsoId) return { lezione }
  return { data: scelto?.data ?? stato.adessoData }
}

function schedaMatrice (progetto: ProgettoNelCorso): HTMLElement {
  const t = testiProgetti()
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
      // Criteri e scala sono del progetto: qui si leggono, si scrivono nella biblioteca.
      legendaLivelli(progetto),
      progetto.criteri.length === 0
        ? h(
            'p',
            { class: 'testo-quieto' },
            collegamento({ testo: testi().criteriNellaBiblioteca, al: () => apriProgetto(progetto.id) }),
          )
        : null,
      scelte,
      chiusa ? quieto(t.oraChiusa) : null,
      chiusa
        ? h('fieldset', { class: 'lezione-chiusa', attr: { disabled: true } }, matrice)
        : matrice,
    ),
  }), `progetto-matrice:${progetto.id}`) // testo-fisso: una chiave, non un testo
}

function schedaGiudizi (progetto: ProgettoNelCorso): HTMLElement {
  const t = testiProgetti()
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

function faseAperta (progetto: ProgettoNelCorso, voce: QuadroDellaFase): boolean {
  const aperte = fasiAperte.get(`${progetto.corsoId}:${progetto.id}`)
  if (aperte) return aperte.has(voce.fase.id)
  const periodo = voce.periodo
  return periodo !== null && periodo.inizio <= stato.adessoData && stato.adessoData <= periodo.fine
}

function invertiFase (progetto: ProgettoNelCorso, quadro: QuadroDelProgetto, voce: QuadroDellaFase): void {
  const chiave = `${progetto.corsoId}:${progetto.id}`
  const aperte = fasiAperte.get(chiave) ??
    new Set(quadro.fasi.filter((v) => faseAperta(progetto, v)).map((v) => v.fase.id))
  if (aperte.has(voce.fase.id)) aperte.delete(voce.fase.id)
  else aperte.add(voce.fase.id)
  fasiAperte.set(chiave, aperte)
  ridisegna()
}

/**
 * Dove si può programmare una fase: le prossime ore del corso (col loro piano,
 * o uno nuovo che le si assegna) e i piani del corso non ancora in un'ora. Il
 * piano si apre con l'importazione dalla scaletta già sulla fase.
 */
function vociProgramma (progetto: ProgettoNelCorso, corso: Corso, faseId: string): ElementoMenu[] {
  const t = testi()
  const importa = { progettoId: progetto.id, faseId }
  // Restando qui: senza `dopo`, salvare il piano porterebbe alla pagina dei piani.
  const resta = (): void => {}
  const ore = oreDelCorso(corso)
    .filter((l) => l.data >= stato.adessoData && l.stato !== 'annullata' && l.stato !== 'svolta')
    .slice(0, 8)
  const sciolti = pianiSciolti(corso)
  if (ore.length === 0 && sciolti.length === 0) return [{ titolo: t.nienteDaProgrammare }]
  const voci: ElementoMenu[] = ore.map((lezione) => {
    const piano = stato.registro.piani.find((p) => p.id === lezione.pianoId)
    return {
      testo: etichettaOra(lezione),
      descrizione: piano ? nomeDiPiano(piano) : t.oraSenzaPiano,
      simbolo: 'lezione' as const,
      al: () => piano
        ? moduloPiano(piano, resta, corso.id, lezione, importa)
        : moduloPiano(undefined, async (pianoId) => {
            await azione({ tipo: 'piano.assegna', lezioneId: lezione.id, pianoId })
          }, corso.id, lezione, importa),
    }
  })
  if (sciolti.length > 0 && voci.length > 0) voci.push('separatore')
  for (const piano of sciolti) {
    voci.push({
      testo: nomeDiPiano(piano),
      descrizione: t.pianoSciolto,
      simbolo: 'piano',
      al: () => moduloPiano(piano, resta, corso.id, null, importa),
    })
  }
  return voci
}

/**
 * Le fasi del progetto nei piani del corso, una sotto l'altra e ripiegate:
 * chiuse dicono numero, titolo, periodo e quanto se n'è fatto; aperte le
 * attività della scaletta, con le lezioni del corso in cui sono già
 * programmate o «da programmare», e sotto le attività dei piani nelle ore
 * (col loro stato) e le prove nate lì. Tutto si ricava dal quadro del
 * progetto e dai piani: qui si scrivono solo scaletta e piani.
 */
function schedaFasi (progetto: ProgettoNelCorso, corso: Corso, quadro: QuadroDelProgetto): HTMLElement {
  const t = testiProgetti()
  const ti = testi()
  const ts = testiScaletta()
  const lezioni = new Map(stato.registro.lezioni.map((l) => [l.id, l]))
  const pianiDelCorso = stato.registro.piani.filter((p) => p.corsoId === corso.id)
  /** Le ore del corso in cui un'attività della scaletta è già programmata (o il piano, se non è in un'ora). */
  const dove = (attivitaId: string): string[] => pianiDelCorso
    .filter((p) => p.attivita.some((a) => a.progettoId === progetto.id && a.attivitaProgettoId === attivitaId))
    .flatMap((p) => {
      const ore = stato.registro.lezioni.filter((l) => l.pianoId === p.id).sort(confrontaLezioni)
      return ore.length > 0 ? ore.map((l) => formattaData(l.data)) : [nomeDiPiano(p)]
    })
  const fase = (voce: QuadroDellaFase): HTMLElement => {
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
            h(
              'div',
              { class: 'fase-progetto__azioni' },
              pulsante({
                testo: ti.programma,
                simbolo: 'piano',
                variante: 'sottile',
                al: (evento) => menuSotto(
                  evento.currentTarget as HTMLElement,
                  vociProgramma(progetto, corso, voce.fase.id),
                ),
              }),
              pulsante({
                testo: ts.modificaScaletta,
                simbolo: 'matita',
                variante: 'sottile',
                al: () => moduloScalettaProgetto(progetto.id, voce.fase.id),
              }),
            ),
            canoniche.length > 0 ? h('ol', { class: 'lezioni-progetto' }, ...canoniche.map((a) => {
              const quando = dove(a.id)
              return h('li', {
                class: 'lezioni-progetto__voce', dataset: { attivitaProgettoId: a.id },
              },
              h('span', null, a.titolo || parole().senzaTitolo),
              pastiglia(
                formattaDurata(minutiDiAttivita(a.durataUd, stato.registro.impostazioni.minutiUd)),
                'quiete',
              ),
              pastiglia(
                quando.length > 0 ? [ts.pianificata, ...quando].join(' · ') : ts.daPianificare,
                quando.length > 0 ? 'informativo' : 'quiete',
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
    titolo: ti.neiPiani,
    sottotitolo: quadro.periodo
      ? `${periodoScritto(quadro.periodo)} · ${t.svolto(Math.round(quadro.quota * 100))}`
      : t.nessunaLezione,
    aiuto: ti.neiPianiAiuto,
    contenuto: h('div', { class: 'fasi-progetto' }, ...quadro.fasi.map(fase)),
  })
}

/** Le presenze di chi frequenta nelle ore del progetto: UD perse e ritardi. */
function schedaPresenze (progetto: ProgettoNelCorso, quadro: QuadroDelProgetto): HTMLElement | null {
  const t = testiProgetti()
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

function schedaValutazioni (progetto: ProgettoNelCorso): HTMLElement {
  const t = testiProgetti()
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

/** La linguetta ricordata del progetto; mai scelta, le fasi nei piani. */
function linguettaAperta (progetto: ProgettoNelCorso): LinguettaProgetto {
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
 * Sotto testata e compiti, sempre in vista, il resto a linguette: fasi nei
 * piani, matrice ed esiti (giudizi, valutazioni, presenze). Come quelle dei
 * compiti: le frecce, Inizio e Fine scelgono e il fuoco segue.
 */
function linguetteDelProgetto (progetto: ProgettoNelCorso, corso: Corso, quadro: QuadroDelProgetto): HTMLElement {
  const t = testiProgetti()
  const aperta = linguettaAperta(progetto)
  const voci: Array<{ valore: LinguettaProgetto, testo: string, titolo?: string }> = [
    { valore: 'fasi', testo: testi().neiPiani },
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
    ? [schedaFasi(progetto, corso, quadro)]
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

function dettaglio (progetto: ProgettoNelCorso, corso: Corso): HTMLElement {
  const quadro = quadroDelProgetto(stato.registro, progetto)
  return h(
    'div',
    { class: 'colonna', dataset: { telaio: 'integrazione:dettaglio' } },
    schedaTestata(progetto),
    schedaCompiti(progetto),
    linguetteDelProgetto(progetto, corso, quadro),
  )
}

// ------------------------------------------------------------------ la pagina

export function vistaIntegrazioneProgetti (): Figlio {
  if (!annoCorrente()) {
    return statoVuotoAnno({ simbolo: 'progetto', crea: () => moduloAnno() })
  }
  const t = testi()
  const tp = testiProgetti()
  const corso = corsoDelContesto()
  if (!corso) {
    return statoVuoto({
      simbolo: 'progetto',
      titolo: tp.nessunCorso,
      testo: tp.progettiInUnCorso,
      azione: pulsante({
        testo: tp.vaiAiCorsi,
        variante: 'primario',
        al: () => { vai({ pagina: 'pagina.corsi' }) },
      }),
    })
  }
  const progetti = progettiDelCorso(stato.registro, corso.id)
  const progetto = progettoIntegratoMostrato()

  return h(
    'div',
    { class: 'vista vista--progetti vista--integrazione', dataset: { telaio: 'integrazione' } },
    testataVista({
      titolo: t.titolo,
      sottotitolo: nomeDelCorso(corso),
      aiuto: t.aiuto,
    }),
    h(
      'div',
      { class: 'colonne colonne--elenco', dataset: { telaio: 'integrazione:colonne' } },
      elencoIntegrati(progetti, progetto, corso),
      progetto
        ? dettaglio(progetto, corso)
        : h(
            'div',
            { class: 'colonna' },
            statoVuoto({
              simbolo: 'progetto',
              titolo: t.nessunIntegrato,
              testo: t.nessunIntegratoTesto,
              azione: pulsanteIntegra(corso, 'primario'),
            }),
          ),
    ),
  )
}
