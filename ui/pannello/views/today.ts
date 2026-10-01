// La Dashboard: giornata, priorità e collegamenti operativi in una schermata.
//
// Solo navigazione: ogni tessera, ora o prova porta alla sua pagina, e niente
// qui cambia il registro (quindi nessun comando nella riga delle azioni).
// I numeri vengono dalle stesse funzioni dello stato che usano le pagine di
// destinazione, così la tessera e la pagina dicono sempre lo stesso conto.

import {
  formattaData,
  daIso,
  differenzaGiorni,
  giorniBrevi,
  giornoDelMese,
  giornoSettimana,
} from '#core/dominio/dates.js'
import type { FaseOra } from '#core/dominio/dashboard.js'
import type {
  Corso,
  Lezione,
  MomentoValutazione,
} from '#core/dominio/models.js'
import { istante } from '#core/i18n/index.js'
import { apriMomento, vaiAOggi } from '#ui/pannello/calendarNavigation.js'
import {
  pastiglia,
  scheda,
  statoVuoto,
  type TonoPastiglia,
} from '#ui/pannello/components/base.js'
import { statoVuotoAnno } from '#ui/pannello/components/filters.js'
import { icona, type NomeIcona } from '#ui/pannello/components/icons.js'
import { h, type Figlio } from '#ui/pannello/dom.js'
import { moduloAnno } from '#ui/pannello/forms.js'
import { isola, isolaPresente, ridisegnaIsola } from '#ui/pannello/islands.js'
import { alMinuto } from '#ui/pannello/clock.js'
import { apriLezione, PAGINE, vaiA } from '#ui/pannello/pages.js'
import type { PaginaId } from '#ui/pannello/place.js'
import { testi as testiPagine } from '#ui/pannello/pages.testi.js'
import {
  annoCorrente,
  coloreDiCorso,
  coloreDiLezione,
  compleanniDellaDashboard,
  corsiDellAnnoAperto,
  dataProssimaGiornataDashboard,
  nelSemestreScelto,
  nomeClasseDiLezione,
  nomeMateriaDiLezione,
  oraDaFareDashboard,
  oreDaChiudereDashboard,
  oreDellaProssimaGiornataDashboard,
  oreDiOggiDashboard,
  pendenzeDellaBarra,
  stato,
  titoloDiLezione,
} from '#ui/pannello/state.js'
import { pagineDaSmistareInTutto } from './sorting/toSort.js'
import { testi } from './today.testi.js'

/** Un'ora della giornata mostrata, con la fase calcolata dallo stato. */
type OraDiOggi = ReturnType<typeof oreDiOggiDashboard>[number]

/** Quante prove si annunciano: le prossime cinque bastano a vedere la settimana. */
const QUANTE_VALUTAZIONI = 5

/** Va in una pagina per nome, con i controlli di `vaiA`. */
function vaiAllaPagina (id: PaginaId): void {
  const pagina = PAGINE.find((p) => p.id === id)
  if (pagina) vaiA(pagina)
}

/** Il nome di una pagina come lo scrive la barra laterale. */
function nomeDellaPagina (id: PaginaId): string {
  return PAGINE.find((p) => p.id === id)?.titolo ?? id
}

// ------------------------------------------------------------------ tessere

/**
 * Una tessera: un numero, che cosa conta, e dove porta.
 * Tutta la tessera è un `<button>`, così è un bersaglio grande e Invio funziona da sé.
 */
function tessera (opzioni: {
  chiave: string;
  simbolo: NomeIcona;
  tono: TonoPastiglia;
  valore: number;
  etichetta: string;
  nota: string;
  pagina: PaginaId;
  al: () => void;
}): HTMLElement {
  const t = testi()
  const porta = t.portaA(nomeDellaPagina(opzioni.pagina))
  return h(
    'button',
    {
      class: ['oggi-tessera', `oggi-tessera--${opzioni.tono}`], // testo-fisso: classe CSS
      type: 'button',
      // testo-fisso: chiave di fuoco, non si legge
      dataset: { fuoco: `oggi-${opzioni.chiave}`, pagina: opzioni.pagina },
      attr: {
        title: porta,
        'aria-label': `${opzioni.etichetta}: ${opzioni.valore}. ${opzioni.nota}. ${porta}`,
      },
      onclick: opzioni.al,
    },
    h('span', { class: 'oggi-tessera__tondo' }, icona(opzioni.simbolo)),
    h(
      'span',
      { class: 'oggi-tessera__testo' },
      h('span', { class: 'oggi-tessera__valore' }, String(opzioni.valore)),
      h('span', { class: 'oggi-tessera__etichetta' }, opzioni.etichetta),
      h('span', { class: 'oggi-tessera__nota' }, opzioni.nota),
    ),
    icona('destra', 'oggi-tessera__freccia icona--minuta'),
  )
}

/** Quel che si dice sotto il numero delle ore di oggi: la prossima, o che è finita. */
function notaDelleOre (ore: readonly OraDiOggi[]): string {
  const t = testi()
  const vive = ore.filter((o) => o.fase !== 'annullata')
  if (vive.length === 0) return t.nessunaOraOggi
  const inCorso = vive.find((o) => o.fase === 'in-corso')
  if (inCorso) return t.inCorsoFinoAlle(fineDi(inCorso.lezione))
  const prossima = vive.find(
    (o) => o.fase === 'futura' || o.fase === 'da-preparare',
  )
  return prossima ? t.prossimaAlle(inizioDi(prossima.lezione)) : t.tutteFatte
}

function tessere (oreOggi: readonly OraDiOggi[]): HTMLElement {
  const t = testi()
  const tp = testiPagine()
  const vive = oreOggi.filter((o) => o.fase !== 'annullata').length
  const buchi = oreDaChiudereDashboard()
  const pendenze = pendenzeDellaBarra()
  const daSmistare = pagineDaSmistareInTutto()

  return h(
    'div',
    { class: 'oggi-tessere', attr: { role: 'group', 'aria-label': t.tessere } },
    tessera({
      chiave: 'ore',
      simbolo: 'calendario',
      tono: vive > 0 ? 'informativo' : 'quiete',
      valore: vive,
      etichetta: t.oreDiOggi,
      nota: notaDelleOre(oreOggi),
      pagina: 'pagina.calendario',
      // Il calendario su oggi, non dove lo si era lasciato: la tessera parla di oggi.
      al: () => {
        vaiAllaPagina('pagina.calendario')
        vaiAOggi()
      },
    }),
    tessera({
      chiave: 'da-compilare',
      simbolo: 'matita',
      tono: buchi.length > 0 ? 'attenzione' : 'positivo',
      valore: buchi.length,
      etichetta: t.daCompilare,
      nota:
        buchi.length > 0
          ? t.laPiuVecchia(formattaData(buchi[0].data, 'settimana'))
          : t.inPari,
      pagina: 'pagina.corso.registro',
      // La stessa ora del comando «Ora da compilare»: la più vecchia senza registro,
      // o la prossima; se non c'è nessuna delle due si resta sul calendario.
      al: () => {
        const ora = oraDaFareDashboard()
        if (ora) apriLezione(ora.lezione.id)
        else vaiAllaPagina('pagina.calendario')
      },
    }),
    tessera({
      chiave: 'pendenze',
      simbolo: 'spunta',
      tono:
        pendenze.urgenti > 0
          ? 'negativo'
          : pendenze.aperti > 0
            ? 'attenzione'
            : 'positivo',
      valore: pendenze.aperti,
      etichetta: tp.pendenze,
      nota: t.urgenti(pendenze.urgenti),
      pagina: 'pagina.pendenze',
      al: () => vaiAllaPagina('pagina.pendenze'),
    }),
    tessera({
      chiave: 'da-smistare',
      simbolo: 'vassoio',
      tono: daSmistare > 0 ? 'attenzione' : 'quiete',
      valore: daSmistare,
      etichetta: tp.daSmistare,
      nota: t.pagineInAttesa(daSmistare),
      pagina: 'pagina.daSmistare',
      al: () => vaiAllaPagina('pagina.daSmistare'),
    }),
  )
}

// ------------------------------------------------------------ le ore di oggi

function inizioDi (lezione: Lezione): string {
  return (
    lezione.slot.find((s) => s.tipo === 'lezione')?.inizio ??
    lezione.slot[0]?.inizio ??
    ''
  )
}

function fineDi (lezione: Lezione): string {
  const ore = lezione.slot.filter((s) => s.tipo === 'lezione')
  return (
    (ore[ore.length - 1] ?? lezione.slot[lezione.slot.length - 1])?.fine ?? ''
  )
}

/** Il tono di ogni fase: lo stesso significato che hanno i colori altrove. */
const TONO_FASE: Readonly<Record<FaseOra, TonoPastiglia>> = {
  'in-corso': 'informativo',
  'da-chiudere': 'attenzione',
  svolta: 'positivo',
  'da-preparare': 'neutro',
  futura: 'quiete',
  // Spenta e non rossa: un'ora annullata non è un guaio da sistemare.
  annullata: 'quiete',
}

/** L'ora da far vedere per prima, accesa: quella in corso, o la prossima. */
function oraInEvidenza (ore: readonly OraDiOggi[]): string | null {
  const inCorso = ore.find((o) => o.fase === 'in-corso')
  if (inCorso) return inCorso.lezione.id
  return (
    ore.find((o) => o.fase === 'futura' || o.fase === 'da-preparare')?.lezione
      .id ?? null
  )
}

function rigaOra (voce: OraDiOggi, evidenza: string | null): HTMLElement {
  const t = testi()
  const { lezione, fase } = voce
  const classe = nomeClasseDiLezione(lezione)
  const materia = nomeMateriaDiLezione(lezione)
  const argomento = titoloDiLezione(lezione)
  const inizio = inizioDi(lezione)
  const accesa = lezione.id === evidenza
  const dettagli = [argomento, lezione.aula].filter(Boolean).join(' · ')

  return h(
    'li',
    null,
    h(
      'button',
      {
        class: [
          'oggi-ora',
          accesa && 'oggi-ora--evidenza',
          fase === 'annullata' && 'oggi-ora--annullata',
        ],
        type: 'button',
        // testo-fisso: chiave di fuoco, non si legge
        dataset: { fuoco: `oggi-ora-${lezione.id}`, lezione: lezione.id },
        style: { '--tinta': coloreDiLezione(lezione) },
        attr: { title: t.apriLOra(classe, inizio) },
        onclick: () => apriLezione(lezione.id),
      },
      h(
        'span',
        { class: 'oggi-ora__quando' },
        h('span', { class: 'oggi-ora__inizio' }, inizio),
        h('span', { class: 'oggi-ora__fine' }, fineDi(lezione)),
      ),
      h('span', { class: 'oggi-ora__filo', attr: { 'aria-hidden': 'true' } }),
      h(
        'span',
        { class: 'oggi-ora__cosa' },
        h(
          'span',
          { class: 'oggi-ora__titolo' },
          h('span', { class: 'oggi-ora__classe' }, classe),
          materia ? h('span', { class: 'oggi-ora__materia' }, materia) : null,
        ),
        dettagli ? h('span', { class: 'oggi-ora__dettagli' }, dettagli) : null,
      ),
      h(
        'span',
        { class: 'oggi-ora__stato' },
        accesa
          ? h(
              'span',
              { class: 'oggi-ora__segnale' },
              fase === 'in-corso' ? t.adesso : t.prossima,
            )
          : null,
        pastiglia(t.fasi[fase], TONO_FASE[fase]),
      ),
    ),
  )
}

function schedaOreOggi (ore: readonly OraDiOggi[]): HTMLElement {
  const t = testi()
  const vive = ore.filter((o) => o.fase !== 'annullata')
  const evidenza = oraInEvidenza(ore)
  return scheda({
    classe: 'oggi-scheda oggi-scheda--ore oggi-scheda--oggi',
    titolo: t.leOreDiOggi,
    sottotitolo:
      vive.length > 0
        ? t.quanteOre(
            vive.length,
            inizioDi(vive[0].lezione),
            fineDi(vive[vive.length - 1].lezione),
          )
        : undefined,
    contenuto:
      ore.length === 0
        ? statoVuoto({
            simbolo: 'sole',
            titolo: t.nienteOggi,
            testo: t.nienteOggiTesto,
          })
        : h(
            'ol',
            { class: 'oggi-ore' },
            ...ore.map((voce) => rigaOra(voce, evidenza)),
          ),
  })
}

function schedaOreProssima (
  ore: readonly OraDiOggi[],
  data: string | null,
): HTMLElement {
  const t = testi()
  const vive = ore.filter((o) => o.fase !== 'annullata')
  const sottotitolo =
    data && vive.length > 0
      ? t.quanteOreData(
          formattaData(data, 'lungo'),
          vive.length,
          inizioDi(vive[0].lezione),
          fineDi(vive[vive.length - 1].lezione),
        )
      : data
        ? formattaData(data, 'lungo')
        : undefined

  return scheda({
    classe: 'oggi-scheda oggi-scheda--ore oggi-scheda--prossima',
    titolo: t.leOreDellaGiornata,
    sottotitolo,
    contenuto:
      ore.length === 0
        ? statoVuoto({
            simbolo: 'calendario',
            titolo: t.nessunaProssimaGiornata,
            testo: t.nessunaProssimaGiornataTesto,
          })
        : h(
            'ol',
            { class: 'oggi-ore' },
            ...ore.map((voce) => rigaOra(voce, null)),
          ),
  })
}

// ------------------------------------------------------ prossime valutazioni

/**
 * Le prove che vengono, dalla più vicina, da oggi in poi.
 * Corsi dell'anno aperto e non del semestre scelto: a gennaio si vuole vedere
 * arrivare anche la prova di febbraio.
 */
function prossimeValutazioni (): MomentoValutazione[] {
  const corsi = new Set(corsiDellAnnoAperto().map((c) => c.id))
  return nelSemestreScelto(stato.registro.valutazioni)
    .filter((v) => corsi.has(v.corsoId) && v.data >= stato.adessoData)
    .sort(
      (a, b) =>
        a.data.localeCompare(b.data) || a.titolo.localeCompare(b.titolo),
    )
    .slice(0, QUANTE_VALUTAZIONI)
}

/** Il foglietto del calendario: il giorno della settimana, il numero, il mese. */
function foglietto (data: string): HTMLElement {
  return h(
    'span',
    { class: 'oggi-foglietto', attr: { 'aria-hidden': 'true' } },
    h(
      'span',
      { class: 'oggi-foglietto__giorno' },
      giorniBrevi()[giornoSettimana(data) - 1],
    ),
    h('span', { class: 'oggi-foglietto__numero' }, String(giornoDelMese(data))),
    h(
      'span',
      { class: 'oggi-foglietto__mese' },
      istante(daIso(data), { month: 'short', timeZone: 'UTC' }),
    ),
  )
}

function rigaValutazione (
  momento: MomentoValutazione,
  mappaCorsi?: ReadonlyMap<string, Corso>,
): HTMLElement {
  const t = testi()
  const corso = mappaCorsi
    ? mappaCorsi.get(momento.corsoId)
    : corsiDellAnnoAperto().find((c) => c.id === momento.corsoId)
  const giorni = differenzaGiorni(stato.adessoData, momento.data)
  return h(
    'li',
    null,
    h(
      'button',
      {
        class: 'oggi-prova',
        type: 'button',
        // testo-fisso: chiave di fuoco, non si legge
        dataset: { fuoco: `oggi-prova-${momento.id}` },
        style: corso ? { '--tinta': coloreDiCorso(corso) } : undefined,
        attr: { title: t.apriValutazione(momento.titolo) },
        onclick: () => apriMomento(momento),
      },
      foglietto(momento.data),
      h(
        'span',
        { class: 'oggi-prova__cosa' },
        h('span', { class: 'oggi-prova__titolo' }, momento.titolo),
        h(
          'span',
          { class: 'oggi-prova__corso' },
          h('span', {
            class: 'oggi-prova__punto',
            attr: { 'aria-hidden': 'true' },
          }),
          corso?.titolo ?? '',
        ),
      ),
      pastiglia(t.fra(giorni), giorni <= 1 ? 'attenzione' : 'quiete'),
    ),
  )
}

function schedaValutazioni (): HTMLElement {
  const t = testi()
  const prove = prossimeValutazioni()
  const mappaCorsi = new Map(corsiDellAnnoAperto().map((c) => [c.id, c]))
  return scheda({
    classe: 'oggi-scheda oggi-scheda--prove',
    titolo: t.prossimeValutazioni,
    contenuto:
      prove.length === 0
        ? statoVuoto({
            simbolo: 'valutazioni',
            titolo: t.nessunaValutazione,
            testo: t.nessunaValutazioneTesto,
          })
        : h(
            'ol',
            { class: 'oggi-prove' },
            ...prove.map((p) => rigaValutazione(p, mappaCorsi)),
          ),
  })
}

// ---------------------------------------------------------------- compleanni

/** I compleanni di oggi, se ce n'è: altrimenti la scheda non c'è proprio. */
function schedaCompleanni (): HTMLElement | null {
  const data = stato.adessoData
  const festeggiati = compleanniDellaDashboard(data)
  if (festeggiati.length === 0) return null
  return scheda({
    classe: 'oggi-scheda oggi-scheda--compleanni',
    titolo: testi().compleanni,
    contenuto: h(
      'ul',
      { class: 'oggi-compleanni' },
      ...festeggiati.map((c) =>
        h(
          'li',
          { class: 'oggi-compleanno', style: { '--tinta': c.colore } },
          h('span', { class: 'oggi-compleanno__tondo' }, icona('torta')),
          h('span', { class: 'oggi-compleanno__nome' }, c.nome),
          h('span', { class: 'oggi-compleanno__classe' }, c.classe),
        ),
      ),
    ),
  })
}

// --------------------------------------------------------------- la pagina

// Il minuto che passa cambia le fasi delle ore di oggi («in corso», «prossima»)
// e la nota della tessera che le conta: si rifanno solo quei due riquadri, non
// la pagina (`clock.ts`). Le chiavi dicono che cosa segna l'ora.
// testo-fisso: chiave di un'isola, non si legge
const ISOLA_TESSERE = 'oggi-adesso:tessere'
// testo-fisso: chiave di un'isola, non si legge
const ISOLA_ORE = 'oggi-adesso'
/** Il contenitore dell'isola non fa scatola: griglia e colonna restano quelle di prima. */
const IN_LINEA = { style: { display: 'contents' } }

alMinuto(() => {
  for (const chiave of [ISOLA_TESSERE, ISOLA_ORE]) {
    if (isolaPresente(chiave)) ridisegnaIsola(chiave)
  }
})

export function vistaOggi (): Figlio {
  const t = testi()
  const titolo = t.titolo
  const oreOggi = oreDiOggiDashboard()
  const dataProssima = dataProssimaGiornataDashboard()
  const oreProssima = oreDellaProssimaGiornataDashboard()

  const sottotitolo =
    oreOggi.length > 0 || !dataProssima
      ? t.sottotitolo(t.saluto(stato.adessoOra), formattaData(stato.adessoData, 'lungo'))
      : t.prossimaGiornata(formattaData(dataProssima, 'lungo'))

  if (!annoCorrente()) {
    return h(
      'div',
      { class: 'vista vista--oggi' },
      h(
        'header',
        { class: 'testata oggi-testata' },
        h('h2', { class: 'testata__titolo' }, titolo),
        h('p', { class: 'testata__sottotitolo' }, sottotitolo),
      ),
      statoVuotoAnno({ simbolo: 'dashboard', crea: () => moduloAnno() }),
    )
  }

  return h(
    'div',
    { class: 'vista vista--oggi' },
    h(
      'header',
      { class: 'testata oggi-testata' },
      h('h2', { class: 'testata__titolo' }, titolo),
      h('p', { class: 'testata__sottotitolo' }, sottotitolo),
    ),
    isola(ISOLA_TESSERE, () => tessere(oreDiOggiDashboard()), IN_LINEA),
    h(
      'div',
      { class: 'oggi-griglia' },
      h(
        'div',
        { class: 'oggi-colonna oggi-colonna--larga' },
        isola(ISOLA_ORE, () => schedaOreOggi(oreDiOggiDashboard()), IN_LINEA),
        schedaOreProssima(oreProssima, dataProssima),
      ),
      h(
        'div',
        { class: 'oggi-colonna' },
        schedaValutazioni(),
        schedaCompleanni(),
      ),
    ),
  )
}
