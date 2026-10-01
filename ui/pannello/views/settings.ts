// Impostazioni: quattro aree fisse in testata (Calendario, Didattica, Utente,
// Programma), ognuna una pagina sola che scorre, con l'indice delle sezioni a
// sinistra che segue lo scorrimento. Livelli: area › sezione › gruppo.
// Ogni blocco dice dove sta con una pastiglia, «Questo anno» o «Questo
// computer»: è l'unica cosa che qui si può sbagliare senza accorgersene.
// Ogni voce ha un indirizzo, `impostazioni/<area>#<voce>` (`place.ts`): chi ci
// arriva — un rimando, il filtro, Ctrl+K — scorre fin lì e la vede accendersi.
// La finestra nativa resta per quando non c'è un documento aperto.

import { pulsante, scheda, statoVuoto, testataVista } from '#ui/pannello/components/base.js'
import { icona } from '#ui/pannello/components/icons.js'
import { andaturaScorrimento, h, type Figlio } from '#ui/pannello/dom.js'
import { testi } from './settings.testi.js'
import { isola, ridisegnaIsola } from '#ui/pannello/islands.js'
import {
  areaDellaScheda,
  chiaveDelPosto,
  voceDellaScheda,
  type AreaImpostazioni,
  type Scheda,
  type SezioneImpostazioni,
} from '#ui/pannello/place.js'
import { riprendi, seguiScorrimento } from '#ui/pannello/bookmark.js'
import { iscriviti, ricorda, ridisegna, stato, vai } from '#ui/pannello/state.js'
import {
  schedaAnnoAperto,
  schedaChiusure,
  schedaSettimane,
} from './settings/year.js'
import { schedaValutazione } from './settings/document.js'
import { contenutoGiornata } from './settings/schoolDay.js'
import { listaTipiSettimana, schedaListe } from './settings/lists.js'
import { schedaCalendarioIcs } from './settings/icsCalendar.js'
import { schedaFirma, schedaPosta } from './settings/mail.js'
import { schedaAccountMicrosoft } from './settings/microsoft.js'
import { schedaAggiornamenti } from './settings/updates.js'
import { schedeCalendariUfficiali } from './settings/officialCalendars.js'
import { contenutoModelliLinguistici } from './languageModels.js'
import { schedaCarte, schedaChiFirma } from './settings/letterhead.js'
import { ripristinaArea, schedaProgramma, vociProgramma } from './settings/program.js'
import {
  AREE,
  cercaImpostazioni,
  daSistemare,
  nomeAmbito,
  scritteNellArea,
  sezioneDi,
  sezioneProgramma,
  sezioniDellArea,
  titoloArea,
  type AmbitoBlocco,
  type Sezione,
  type Trovata,
} from './settings/sections.js'

// ------------------------------------------------------------------ i blocchi

/**
 * Un blocco di una sezione: il suo ambito, e quel che disegna. `voce` è
 * l'ancora di un blocco che si raggiunge per nome (`calendario#calendari`).
 */
interface Blocco {
  ambito: AmbitoBlocco
  disegna: () => Figlio
  voce?: string
}

/** Le voci di una sezione del programma, se la sezione ne ha. */
function vociDi (id: SezioneImpostazioni): Figlio {
  const sezione = sezioneProgramma(id)
  return sezione ? schedaProgramma(sezione) : null
}

/**
 * Che cosa disegna ciascuna sezione, blocco per blocco, sempre nello stesso
 * ordine: prima lo stato e i gesti, poi le scelte, e in fondo le avanzate,
 * chiuse (`docs/PIANO-IMPOSTAZIONI.md` § 3.1).
 */
const BLOCCHI: Readonly<Record<SezioneImpostazioni, readonly Blocco[]>> = {
  // «Questo file» è il dialogo «Informazioni documento», aprire e creare un
  // anno stanno nel menu «File»: un file non è un'impostazione.
  anno: [{ ambito: 'anno', disegna: schedaAnnoAperto }],
  chiusure: [
    { ambito: 'anno', disegna: schedaChiusure },
    { ambito: 'computer', disegna: schedeCalendariUfficiali, voce: 'calendari' },
  ],
  settimane: [
    { ambito: 'anno', disegna: schedaSettimane },
    { ambito: 'anno', disegna: listaTipiSettimana, voce: 'tipiSettimana' },
  ],
  // La giornata di scuola in quattro passi numerati: `settings/schoolDay.ts`.
  giornata: [{ ambito: 'anno', disegna: contenutoGiornata }],
  ics: [{ ambito: 'anno', disegna: schedaCalendarioIcs }],
  valutazione: [{ ambito: 'anno', disegna: schedaValutazione }],
  liste: [{ ambito: 'anno', disegna: schedaListe }],
  chiSei: [{ ambito: 'anno', disegna: schedaChiFirma }],
  stampa: [{ ambito: 'anno', disegna: schedaCarte }],
  // Collegare, provare, scollegare e azzerare stanno qui, per account e per
  // capacità: la Posta dice solo com'è, e rimanda.
  account: [{ ambito: 'computer', disegna: schedaAccountMicrosoft }],
  // Com'è la casella e il mittente, poi i recapiti, poi la firma, che è dell'anno.
  posta: [
    { ambito: 'computer', disegna: schedaPosta },
    { ambito: 'computer', disegna: () => vociDi('posta') },
    { ambito: 'anno', disegna: schedaFirma, voce: 'firma' },
  ],
  aspetto: [{ ambito: 'computer', disegna: () => vociDi('aspetto') }],
  avvio: [{ ambito: 'computer', disegna: () => vociDi('avvio') }],
  // Tutte le chiavi dei modelli stanno nelle righe d'uso e in «Sul computer».
  modelli: [{ ambito: 'computer', disegna: contenutoModelliLinguistici }],
  aggiornamenti: [
    { ambito: 'computer', disegna: schedaAggiornamenti },
    { ambito: 'computer', disegna: () => vociDi('aggiornamenti') },
  ],
  condotto: [{ ambito: 'computer', disegna: () => vociDi('condotto') }],
}

/** La pastiglia d'ambito: dove sta quel che le sta accanto. */
function pastigliaAmbito (ambito: AmbitoBlocco): HTMLElement {
  const { nome, aiuto } = nomeAmbito(ambito)
  return h(
    'span',
    {
      class: ['ambito', `ambito--${ambito}`], // testo-fisso: classi CSS
      attr: { title: aiuto },
    },
    icona(ambito === 'anno' ? 'documento' : 'schermo', 'icona--minuta'),
    nome,
  )
}

/** L'id DOM di una sezione: l'indice ci salta, il titolo la nomina. */
function idSezione (id: SezioneImpostazioni): string {
  return `impostazioni-sezione-${id}` // testo-fisso: id DOM, non si legge
}

/**
 * Una sezione: la testata con il nome, il riassunto e la pastiglia se l'ambito
 * è uno solo; poi i blocchi, ognuno con la sua pastiglia se sono di due ambiti.
 */
function disegnaSezione (sezione: Sezione): HTMLElement {
  const blocchi = BLOCCHI[sezione.id]
  const misto = new Set(blocchi.map((blocco) => blocco.ambito)).size > 1
  const idTitolo = `${idSezione(sezione.id)}-titolo` // testo-fisso: id DOM, non si legge
  return h(
    'section',
    {
      class: 'impostazioni__sezione',
      id: idSezione(sezione.id),
      dataset: { sezione: sezione.id, voce: sezione.id },
      attr: { 'aria-labelledby': idTitolo },
    },
    h(
      'header',
      { class: 'impostazioni__sezione-testa' },
      h('h2', { class: 'impostazioni__sezione-titolo', id: idTitolo }, sezione.titolo),
      !misto && blocchi[0] ? pastigliaAmbito(blocchi[0].ambito) : null,
      h('p', { class: 'impostazioni__sezione-sotto' }, sezione.sottotitolo),
    ),
    ...blocchi.map((blocco) =>
      h(
        'div',
        {
          class: 'impostazioni__blocco',
          dataset: { ambito: blocco.ambito, voce: blocco.voce },
        },
        misto ? h('div', { class: 'impostazioni__blocco-ambito' }, pastigliaAmbito(blocco.ambito)) : null,
        blocco.disegna(),
      ),
    ),
  )
}

// ------------------------------------------------------------------ la testata

/** L'area aperta: la dice il posto. */
function areaAperta (): AreaImpostazioni {
  return stato.posto.scheda ? areaDellaScheda(stato.posto.scheda) : stato.areaImpostazioni
}

/** Movimento APG dentro la fila delle aree, con attivazione automatica. */
function muoviFraAree (evento: KeyboardEvent): void {
  const tasti = [...(evento.currentTarget as HTMLElement)
    .closest('[role="tablist"]')
    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []]
  if (tasti.length === 0) return
  const corrente = tasti.indexOf(evento.currentTarget as HTMLButtonElement)
  let prossimo: number | null = null
  if (evento.key === 'ArrowRight' || evento.key === 'ArrowDown') prossimo = (corrente + 1) % tasti.length
  if (evento.key === 'ArrowLeft' || evento.key === 'ArrowUp') prossimo = (corrente - 1 + tasti.length) % tasti.length
  if (evento.key === 'Home') prossimo = 0
  if (evento.key === 'End') prossimo = tasti.length - 1
  if (prossimo === null) return
  evento.preventDefault()
  const tasto = tasti[prossimo]
  // Il ridisegno ricorda il `data-fuoco` dell'elemento attivo.
  tasto.focus()
  tasto.click()
}

/**
 * Apre un'area dalla testata, in cima, e svuota il filtro, che resterebbe su
 * un elenco non più visibile.
 */
function apriArea (area: AreaImpostazioni): void {
  const svuota = cercato !== ''
  cercato = ''
  vai({ pagina: 'pagina.impostazioni', scheda: area })
  // Sull'area già aperta `vai` non ridisegna: il filtro va svuotato a vista.
  if (svuota) ridisegnaIsola(ISOLA_CORPO)
}

/**
 * Una scheda d'area: icona, nome, quante voci sono decise a mano (tono
 * neutro: cambiare un'impostazione è normale) e un punto se lì qualcosa
 * chiede attenzione.
 */
function schedaArea (area: (typeof AREE)[number], attiva: boolean): HTMLElement {
  const t = testi()
  const scritte = scritteNellArea(stato.programma, area.id)
  const motivi = daSistemare(area.id, stato.programma, stato.posta)
  return h(
    'button',
    {
      class: ['area-voce', attiva && 'area-voce--attiva'],
      type: 'button',
      // testo-fisso: la chiave di fuoco, non la legge nessuno
      dataset: { fuoco: `area-${area.id}` },
      attr: {
        id: `impostazioni-area-${area.id}`, // testo-fisso: id DOM, non si legge
        role: 'tab',
        'aria-selected': attiva ? 'true' : 'false',
        'aria-controls': 'impostazioni-pannello', // testo-fisso: id DOM, non si legge
        tabindex: attiva ? '0' : '-1',
      },
      onclick: () => apriArea(area.id),
      onkeydown: muoviFraAree,
    },
    icona(area.simbolo),
    h('span', null, area.titolo),
    scritte > 0
      ? h(
          'span',
          { class: 'area-voce__segno', attr: { title: t.modificate(scritte), 'aria-label': t.modificate(scritte) } },
          String(scritte),
        )
      : null,
    motivi.length > 0
      ? h('span', {
          class: 'area-voce__punto',
          attr: { role: 'img', title: motivi.join(' · '), 'aria-label': motivi.join(' · ') },
        })
      : null,
  )
}

/**
 * Che cosa si cerca fra le impostazioni. Fuori dallo stato persistito: non va
 * ritrovato alla prossima apertura.
 */
let cercato = ''

/**
 * Quel che sta sotto la testata: a ogni lettera del filtro si rifà lui solo
 * (ADR-48), la casella resta dov'è col suo cursore e le aree non cambiano.
 */
const ISOLA_CORPO = 'impostazioni-corpo'

function campoCerca (): HTMLElement {
  const t = testi()
  return h(
    'div',
    { class: 'opzioni__cerca' },
    h('input', {
      class: 'campo__controllo',
      type: 'search',
      value: cercato,
      placeholder: t.filtraSegnaposto,
      dataset: { fuoco: 'impostazioni-cerca' },
      attr: { 'aria-label': t.filtraEtichetta, autocomplete: 'off' },
      // Su `input` e non su `change`: il filtro risponde mentre si scrive.
      oninput: (evento: Event) => {
        cercato = (evento.target as HTMLInputElement).value
        ridisegnaIsola(ISOLA_CORPO)
        requestAnimationFrame(dopoIlDisegno)
      },
    }),
  )
}

/**
 * La testata appiccicata: le aree, il filtro e «Ripristina» dell'area aperta,
 * che si vede solo se lì qualcosa è stato deciso a mano.
 */
function fascia (): HTMLElement {
  const t = testi()
  const qui = areaAperta()
  return h(
    'div',
    { class: 'impostazioni__fascia' },
    h(
      'nav',
      { class: 'impostazioni__aree', attr: { role: 'tablist', 'aria-label': t.aree } },
      ...AREE.map((area) => schedaArea(area, area.id === qui)),
    ),
    h('div', { class: 'impostazioni__strumenti' }, campoCerca(), ripristinaArea(qui)),
  )
}

// ------------------------------------------------------------------ l'indice

/** Salta a una sezione senza ridisegnare: scorre, e l'indice la accende. */
function salta (id: SezioneImpostazioni): void {
  const bersaglio = document.getElementById(idSezione(id))
  if (!bersaglio) return
  bersaglio.scrollIntoView({ behavior: andaturaScorrimento(), block: 'start' })
  segna(id)
}

/**
 * L'indice delle sezioni dell'area: una colonna a sinistra, e su schermo
 * stretto una tendina in cima. Un clic scorre, non ridisegna.
 */
function indice (area: AreaImpostazioni): HTMLElement {
  const t = testi()
  const sezioni = sezioniDellArea(area)
  const qui = sezioni.some((sezione) => sezione.id === stato.sezioneImpostazioni)
    ? stato.sezioneImpostazioni
    : sezioni[0]?.id
  return h(
    'nav',
    { class: 'impostazioni__indice', attr: { 'aria-label': t.indice } },
    h(
      'select',
      {
        class: 'campo__controllo impostazioni__indice-tendina',
        value: qui,
        attr: { 'aria-label': t.indiceTendina },
        onchange: (evento: Event) =>
          salta((evento.target as HTMLSelectElement).value as SezioneImpostazioni),
      },
      ...sezioni.map((sezione) => h('option', { value: sezione.id }, sezione.titolo)),
    ),
    h(
      'ul',
      { class: 'impostazioni__indice-voci' },
      ...sezioni.map((sezione) =>
        h(
          'li',
          null,
          h(
            'button',
            {
              class: ['impostazioni__indice-voce', sezione.id === qui && 'impostazioni__indice-voce--qui'],
              type: 'button',
              dataset: { sezione: sezione.id },
              attr: { 'aria-current': sezione.id === qui ? 'location' : null },
              onclick: () => salta(sezione.id),
            },
            sezione.titolo,
          ),
        ),
      ),
    ),
  )
}

/** Accende nell'indice la sezione che si sta guardando, e la ricorda. */
function segna (id: string): void {
  const sezione = sezioneDi(id)
  if (sezione.id !== id) return
  for (const voce of document.querySelectorAll<HTMLElement>('.impostazioni__indice-voce')) {
    const qui = voce.dataset.sezione === id
    voce.classList.toggle('impostazioni__indice-voce--qui', qui)
    if (qui) voce.setAttribute('aria-current', 'location')
    else voce.removeAttribute('aria-current')
  }
  const tendina = document.querySelector<HTMLSelectElement>('.impostazioni__indice-tendina')
  if (tendina && tendina.value !== id) tendina.value = id
  if (stato.sezioneImpostazioni === sezione.id) return
  // Diretto e non da `aggiorna`: segue lo scorrimento, e non si ridisegna. È una
  // preferenza, quindi `ricorda`.
  stato.sezioneImpostazioni = sezione.id
  ricorda()
}

// ------------------------------------------------------------------ il filtro

/** Porta a un'impostazione trovata: svuota il filtro e arriva sulla voce. */
export function vaiAllImpostazione (scheda: Scheda): void {
  cercato = ''
  // Anche sullo stesso posto si arriva di nuovo: la voce si riaccende.
  arrivato = null
  vai({ pagina: 'pagina.impostazioni', scheda })
  ridisegna()
}

/** Dal filtro alla sezione dei modelli, dove un modello si sceglie davvero. */
function aiModelliDalFiltro (): void {
  vaiAllImpostazione('programma#modelli')
}

/** Un risultato che porta altrove: una sezione, o una voce disegnata da una scheda. */
function rigaSezione (trovata: Trovata): HTMLElement {
  const sezione = sezioneDi(trovata.sezione)
  return h(
    'div',
    { class: 'risultato-impostazioni' },
    h(
      'span',
      { class: 'risultato-impostazioni__testo' },
      h('strong', null, trovata.titolo),
      h('small', null, sezione.sottotitolo),
    ),
    trovata.ambito ? pastigliaAmbito(trovata.ambito) : null,
    pulsante({
      testo: testi().vaiAllaSezione,
      simbolo: 'destra',
      variante: 'sottile',
      al: () => vaiAllImpostazione(trovata.scheda),
    }),
  )
}

/**
 * Quel che si trova, area per area, al posto della pagina dell'area: le voci
 * del computer si cambiano lì dove sono, le sezioni portano al loro posto.
 */
function risultati (): HTMLElement {
  const trovate = cercaImpostazioni(stato.programma, cercato)
  const t = testi()

  if (trovate.length === 0) {
    return scheda({
      titolo: t.nessunaCorrispondenza,
      classe: 'scheda--opzioni',
      contenuto: statoVuoto({
        simbolo: 'impostazioni',
        titolo: t.nienteCosi,
        testo: t.nienteCosiTesto,
      }),
    })
  }

  return scheda({
    titolo: t.trovate(trovate.length),
    aiuto: t.trovateAiuto,
    classe: 'scheda--opzioni',
    contenuto: h(
      'div',
      { class: 'gruppi-opzioni' },
      ...AREE.map((area) => {
        const qui = trovate.filter((trovata) => trovata.area === area.id)
        if (qui.length === 0) return null
        return h(
          'section',
          { class: 'gruppo-opzioni' },
          h('h2', { class: 'gruppo-opzioni__titolo' }, titoloArea(area.id)),
          h(
            'div',
            { class: 'voci-opzioni' },
            ...qui.map((trovata) =>
              trovata.voce && voceDellaScheda(trovata.scheda) === trovata.voce.chiave
                ? h(
                    'div',
                    { class: 'risultato-impostazioni__voce' },
                    h('small', { class: 'testo-quieto' }, sezioneDi(trovata.sezione).titolo),
                    vociProgramma(trovata.voce, aiModelliDalFiltro),
                  )
                : rigaSezione(trovata),
            ),
          ),
        )
      }),
    ),
  })
}

// ------------------------------------------------------------------ la pagina

/** La pagina di un'area: l'indice e le sezioni una sotto l'altra. */
function paginaArea (area: AreaImpostazioni): Figlio[] {
  return [
    indice(area),
    h('div', { class: 'impostazioni__pagina' }, ...sezioniDellArea(area).map(disegnaSezione)),
  ]
}

function corpo (): Figlio {
  const area = areaAperta()
  const filtrando = cercato.trim() !== ''
  return h(
    'div',
    {
      class: ['impostazioni__corpo', filtrando && 'impostazioni__corpo--risultati'],
      id: 'impostazioni-pannello', // testo-fisso: id DOM, non si legge
      attr: {
        role: 'tabpanel',
        'aria-labelledby': `impostazioni-area-${area}`, // testo-fisso: id DOM, non si legge
      },
    },
    ...(filtrando ? [risultati()] : paginaArea(area)),
  )
}

export function vistaImpostazioni (): Figlio {
  // Arrivando su un posto nuovo il filtro si svuota: la voce chiesta deve vedersi.
  if (chiaveDelPosto(stato.posto) !== arrivato) cercato = ''
  return h(
    'div',
    { class: ['vista', 'vista--impostazioni'] },
    // Il titolo prima della testata; che cosa dicono le pastiglie sta dietro la «i».
    testataVista({ titolo: testi().titolo, aiuto: testi().aiutoPagina }),
    fascia(),
    isola(ISOLA_CORPO, corpo, { class: 'impostazioni__isola' }),
  )
}

// ------------------------------------------------------------------ dopo il disegno

/** Il posto su cui si è già arrivati: arrivarci di nuovo a ogni ridisegno riporterebbe lì. */
let arrivato: string | null = null

let osservatore: IntersectionObserver | null = null

// Gli effetti dopo il disegno, mai dal disegno. Il microtask mette il
// fotogramma dietro quello del ridisegno, che gli iscritti fanno partire nello
// stesso giro (come la guida).
iscriviti(() => {
  if (stato.vista === 'impostazioni') queueMicrotask(() => requestAnimationFrame(dopoIlDisegno))
  else {
    osservatore?.disconnect()
    osservatore = null
    // Tornando, si arriva di nuovo.
    arrivato = null
  }
})

/**
 * Dopo ogni disegno: misura la testata appiccicata (le ancore si fermano sotto
 * di lei), rimette in ascolto l'indice sulle sezioni e, se il posto è nuovo,
 * ci arriva.
 */
function dopoIlDisegno (): void {
  const vista = document.querySelector<HTMLElement>('.vista--impostazioni')
  if (!vista) return
  const alto = vista.querySelector<HTMLElement>('.impostazioni__fascia')?.offsetHeight ?? 0
  // testo-fisso: una misura CSS
  vista.style.setProperty('--impostazioni-fascia-alto', `${alto}px`)

  osservatore?.disconnect()
  osservatore = null
  const sezioni = [...vista.querySelectorAll<HTMLElement>('.impostazioni__sezione')]
  if (sezioni.length > 0) {
    // La fascia alta della pagina, sotto la testata: la sezione che ci passa è
    // quella che si sta guardando.
    osservatore = new IntersectionObserver((voci) => {
      const prima = voci
        .filter((voce) => voce.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      const id = (prima?.target as HTMLElement | undefined)?.dataset.sezione
      if (id) segna(id)
    // testo-fisso: una misura CSS
    }, { root: document.querySelector('main.contenuto'), rootMargin: `-${alto}px 0px -60% 0px` })
    for (const sezione of sezioni) osservatore.observe(sezione)
  }

  const chiave = chiaveDelPosto(stato.posto)
  if (chiave === arrivato || !stato.posto.scheda) return
  arrivato = chiave
  const voce = voceDellaScheda(stato.posto.scheda)
  // Riaprendo l'area, o la sezione da cui si era usciti, si riprende dal punto
  // di lettura; un rimando a un'altra voce ci arriva e basta.
  const segno = stato.segnalibri[segnalibroDellArea(areaAperta())]
  const riaperta = voce === undefined || voce === stato.sezioneImpostazioni
  if (riaperta && !cercato && riprendi(sezioni, segno)) {
    if (segno) segna(segno.sezione)
    return
  }
  arriva(voce)
}

/** Sotto che nome si ricorda il punto di lettura di un'area. */
function segnalibroDellArea (area: AreaImpostazioni): string {
  // testo-fisso: una chiave della memoria, non si legge
  return `impostazioni.${area}`
}

// Il punto di lettura segue lo scorrimento dell'area intera, non dei risultati
// del filtro.
seguiScorrimento(
  () => stato.vista === 'impostazioni' && !cercato ? segnalibroDellArea(areaAperta()) : null,
  () => [...document.querySelectorAll<HTMLElement>('.vista--impostazioni .impostazioni__sezione')],
)

/**
 * Porta alla voce dell'indirizzo. Una sezione si mette in cima; un controllo
 * si porta al centro, si accende un attimo e prende il fuoco. Senza voce, o
 * con una voce che non c'è più, l'area si apre dall'inizio.
 */
function arriva (voce: string | undefined): void {
  const contenitore = document.querySelector<HTMLElement>('main.contenuto')
  const bersaglio = voce
    ? document.querySelector<HTMLElement>(`.vista--impostazioni [data-voce="${CSS.escape(voce)}"]`)
    : null
  if (!bersaglio) {
    if (contenitore) contenitore.scrollTop = 0
    const prima = document.querySelector<HTMLElement>('.impostazioni__sezione')?.dataset.sezione
    if (prima) segna(prima)
    return
  }
  const sezione = bersaglio.closest<HTMLElement>('.impostazioni__sezione')?.dataset.sezione
  if (sezione) segna(sezione)
  if (bersaglio.classList.contains('impostazioni__sezione')) {
    // La prima sezione è già in cima: la pagina parte dall'inizio, testata compresa.
    if (!bersaglio.previousElementSibling && contenitore) contenitore.scrollTop = 0
    else bersaglio.scrollIntoView({ block: 'start' })
    return
  }
  bersaglio.scrollIntoView({ block: 'center' })
  bersaglio.classList.remove('impostazioni--lampo')
  // Rileggere la misura fa ripartire l'animazione anche sulla stessa voce.
  void bersaglio.offsetWidth
  bersaglio.classList.add('impostazioni--lampo')
  const controllo = bersaglio.querySelector<HTMLElement>(
    'input:not([type="hidden"]), select, textarea, [role="radio"][tabindex="0"], button',
  )
  controllo?.focus({ preventScroll: true })
}
