// La pagina «Oggi»: la giornata in una schermata.
//
// Solo navigazione: ogni tessera, ora o prova porta alla sua pagina, e niente
// qui cambia il registro (quindi nessun comando nella riga delle azioni).
// I numeri vengono dalle stesse funzioni dello stato che usano le pagine di
// destinazione, così la tessera e la pagina dicono sempre lo stesso conto.

import { formattaData, daIso, differenzaGiorni, giorniBrevi, giornoDelMese, giornoSettimana } from '../../domain/dates.js'
import type { FaseOra } from '../../domain/dashboard.js'
import type { Lezione, MomentoValutazione } from '../../domain/models.js'
import { istante } from '../../i18n/index.js'
import { parole } from '../../domain/words.testi.js'
import { apriMomento, vaiAOggi } from '../calendarNavigation.js'
import { pastiglia, scheda, statoVuoto, type TonoPastiglia } from '../components/base.js'
import { statoVuotoAnno } from '../components/filters.js'
import { icona, type NomeIcona } from '../components/icons.js'
import { h, type Figlio } from '../dom.js'
import { moduloAnno } from '../forms.js'
import { PAGINE, vaiA } from '../pages.js'
import { testi as testiPagine } from '../pages.testi.js'
import {
  aggiorna,
  annoCorrente,
  coloreDiCorso,
  coloreDiLezione,
  compleanniDi,
  corsiDellAnnoAperto,
  nomeClasseDiLezione,
  nomeMateriaDiLezione,
  oraDaFare,
  oreDaChiudere,
  oreDiOggi,
  pendenzeDellaBarra,
  stato,
  titoloDiLezione,
} from '../state.js'
import { pagineDaSmistareInTutto } from './toSort.js'
import { testi } from './today.testi.js'

/** Un'ora di oggi con la sua fase, come la dà `oreDiOggi`. */
type OraDiOggi = ReturnType<typeof oreDiOggi>[number]

/** Quante prove si annunciano: le prossime cinque bastano a vedere la settimana. */
const QUANTE_VALUTAZIONI = 5

/** Va in una pagina per nome, con i controlli di `vaiA`. */
function vaiAllaPagina (id: string): void {
  const pagina = PAGINE.find((p) => p.id === id)
  if (pagina) vaiA(pagina)
}

/** Il nome di una pagina come lo scrive la barra laterale. */
function nomeDellaPagina (id: string): string {
  return PAGINE.find((p) => p.id === id)?.titolo ?? id
}

// ------------------------------------------------------------------ tessere

/**
 * Una tessera: un numero, che cosa conta, e dove porta.
 * Tutta la tessera è un `<button>`, così è un bersaglio grande e Invio funziona da sé.
 */
function tessera (opzioni: {
  chiave: string
  simbolo: NomeIcona
  tono: TonoPastiglia
  valore: number
  etichetta: string
  nota: string
  pagina: string
  al: () => void
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
  const prossima = vive.find((o) => o.fase === 'futura' || o.fase === 'da-preparare')
  return prossima ? t.prossimaAlle(inizioDi(prossima.lezione)) : t.tutteFatte
}

function tessere (ore: readonly OraDiOggi[]): HTMLElement {
  const t = testi()
  const tp = testiPagine()
  const vive = ore.filter((o) => o.fase !== 'annullata').length
  const buchi = oreDaChiudere()
  const pendenze = pendenzeDellaBarra()
  const daSmistare = pagineDaSmistareInTutto()

  return h(
    'div',
    { class: 'oggi-tessere', attr: { role: 'group', 'aria-label': t.tessere } },
    tessera({
      chiave: 'ore',
      simbolo: 'calendario',
      tono: 'informativo',
      valore: vive,
      etichetta: t.oreDiOggi,
      nota: notaDelleOre(ore),
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
      nota: buchi.length > 0 ? t.laPiuVecchia(formattaData(buchi[0].data, 'giorno')) : t.inPari,
      pagina: 'pagina.corso.registro',
      // La stessa ora del comando «Ora da compilare»: la più vecchia senza registro,
      // o la prossima; se non c'è nessuna delle due si resta sul calendario.
      al: () => {
        const ora = oraDaFare()
        if (ora) aggiorna({ vista: 'lezione', lezioneId: ora.lezione.id, data: ora.lezione.data })
        else vaiAllaPagina('pagina.calendario')
      },
    }),
    tessera({
      chiave: 'pendenze',
      simbolo: 'spunta',
      tono: pendenze.urgenti > 0 ? 'negativo' : pendenze.aperti > 0 ? 'attenzione' : 'positivo',
      valore: pendenze.aperti,
      etichetta: tp.pendenze,
      nota: t.urgenti(pendenze.urgenti),
      pagina: 'pagina.pendenze',
      al: () => vaiAllaPagina('pagina.pendenze'),
    }),
    tessera({
      chiave: 'da-smistare',
      simbolo: 'documento',
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
  return lezione.slot.find((s) => s.tipo === 'lezione')?.inizio ?? lezione.slot[0]?.inizio ?? ''
}

function fineDi (lezione: Lezione): string {
  const ore = lezione.slot.filter((s) => s.tipo === 'lezione')
  return (ore[ore.length - 1] ?? lezione.slot[lezione.slot.length - 1])?.fine ?? ''
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
  return ore.find((o) => o.fase === 'futura' || o.fase === 'da-preparare')?.lezione.id ?? null
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
        onclick: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id, data: lezione.data }),
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
          ? h('span', { class: 'oggi-ora__segnale' }, fase === 'in-corso' ? t.adesso : t.prossima)
          : null,
        pastiglia(t.fasi[fase], TONO_FASE[fase]),
      ),
    ),
  )
}

function schedaOre (ore: readonly OraDiOggi[]): HTMLElement {
  const t = testi()
  const vive = ore.filter((o) => o.fase !== 'annullata')
  const evidenza = oraInEvidenza(ore)
  return scheda({
    classe: 'oggi-scheda oggi-scheda--ore',
    titolo: t.leOreDiOggi,
    sottotitolo: vive.length > 0
      ? t.quanteOre(vive.length, inizioDi(vive[0].lezione), fineDi(vive[vive.length - 1].lezione))
      : undefined,
    contenuto: ore.length === 0
      ? statoVuoto({ simbolo: 'sole', titolo: t.nienteOggi, testo: t.nienteOggiTesto })
      : h('ol', { class: 'oggi-ore' }, ...ore.map((voce) => rigaOra(voce, evidenza))),
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
  return stato.registro.valutazioni
    .filter((v) => corsi.has(v.corsoId) && v.data >= stato.adessoData)
    .sort((a, b) => a.data.localeCompare(b.data) || a.titolo.localeCompare(b.titolo))
    .slice(0, QUANTE_VALUTAZIONI)
}

/** Il foglietto del calendario: il giorno della settimana, il numero, il mese. */
function foglietto (data: string): HTMLElement {
  return h(
    'span',
    { class: 'oggi-foglietto', attr: { 'aria-hidden': 'true' } },
    h('span', { class: 'oggi-foglietto__giorno' }, giorniBrevi()[giornoSettimana(data) - 1]),
    h('span', { class: 'oggi-foglietto__numero' }, String(giornoDelMese(data))),
    h('span', { class: 'oggi-foglietto__mese' }, istante(daIso(data), { month: 'short', timeZone: 'UTC' })),
  )
}

function rigaValutazione (momento: MomentoValutazione): HTMLElement {
  const t = testi()
  const corso = corsiDellAnnoAperto().find((c) => c.id === momento.corsoId)
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
          h('span', { class: 'oggi-prova__punto', attr: { 'aria-hidden': 'true' } }),
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
  return scheda({
    classe: 'oggi-scheda oggi-scheda--prove',
    titolo: t.prossimeValutazioni,
    contenuto: prove.length === 0
      ? statoVuoto({ simbolo: 'valutazioni', titolo: t.nessunaValutazione, testo: t.nessunaValutazioneTesto })
      : h('ol', { class: 'oggi-prove' }, ...prove.map(rigaValutazione)),
  })
}

// ---------------------------------------------------------------- compleanni

/** I compleanni di oggi, se ce n'è: altrimenti la scheda non c'è proprio. */
function schedaCompleanni (): HTMLElement | null {
  const festeggiati = compleanniDi(stato.adessoData)
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
        )),
    ),
  })
}

// --------------------------------------------------------------- la pagina

export function vistaOggi (): Figlio {
  const t = testi()
  const titolo = parole().oggi
  const sottotitolo = t.sottotitolo(t.saluto(stato.adessoOra), formattaData(stato.adessoData, 'lungo'))

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
      statoVuotoAnno({ simbolo: 'sole', crea: () => moduloAnno() }),
    )
  }

  const ore = oreDiOggi()
  return h(
    'div',
    { class: 'vista vista--oggi' },
    h(
      'header',
      { class: 'testata oggi-testata' },
      h('h2', { class: 'testata__titolo' }, titolo),
      h('p', { class: 'testata__sottotitolo' }, sottotitolo),
    ),
    tessere(ore),
    h(
      'div',
      { class: 'oggi-griglia' },
      h('div', { class: 'oggi-colonna oggi-colonna--larga' }, schedaOre(ore)),
      h('div', { class: 'oggi-colonna' }, schedaValutazioni(), schedaCompleanni()),
    ),
  )
}
