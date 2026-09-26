// Impostazioni: un posto solo, due mondi tenuti separati.
//   Programma  →  restano su questa macchina, valgono per tutti i documenti
//   Documento  →  stanno dentro il `.regi`, viaggiano con il file
// È l'unica cosa che qui si può sbagliare senza accorgersene. Gli argomenti
// sono divisi per tema; gruppi e sezioni stanno in una fascia appiccicata in
// cima (una riga sola se il gruppo ha una sezione sola), e le sezioni salvate
// nel documento portano la pastiglia «file». La finestra nativa resta per
// quando non c'è un documento aperto.

import { scheda, statoVuoto, testataVista } from '../components/base.js'
import { icona } from '../components/icons.js'
import type { VoceProgramma } from '../../protocol.js'
import { h, type Figlio } from '../dom.js'
import { minuscolo } from '../../i18n/index.js'
import { testi } from './settings.testi.js'
import { aggiorna, stato, type SchedaDocumento, type SchedaProgramma } from '../state.js'
import {
  schedaAnnoAperto,
  schedaChiusure,
  schedaElencoAnni,
  schedaSettimane,
} from './settings/year.js'
import { schedaFile, schedaMaterie, schedaValutazione } from './settings/document.js'
import { contenutoGiornata } from './settings/schoolDay.js'
import { schedaListe } from './settings/lists.js'
import { schedaCalendarioIcs } from './settings/icsCalendar.js'
import { schedaFirma, schedaPosta } from './settings/mail.js'
import { schedaAggiornamenti } from './settings/updates.js'
import { contenutoModelliLinguistici } from './languageModels.js'
import { vistaIntestazione } from './settings/letterhead.js'
import {
  dovVannoLeOpzioni,
  schedaProgramma,
  vociDellaSezione,
  vociProgramma,
} from './settings/program.js'
import {
  GRUPPI_SEZIONI,
  SEZIONI_DOCUMENTO,
  SEZIONI_PROGRAMMA,
  nomeVoce,
  sezioneAperta,
  vociMostrateDaSezione,
  type GruppoSezioni,
  type SezioneAperta,
} from './settings/sections.js'

/**
 * Che cosa disegna ciascuna sezione del documento. I nomi stanno in
 * `settings/sections.ts`, che li dà anche alla veduta dell'assistente.
 */
const CONTENUTO_DOCUMENTO: Record<SchedaDocumento, () => Figlio[]> = {
  anno: () => [schedaAnnoAperto(), schedaChiusure(), schedaSettimane(), schedaElencoAnni()],
  // La giornata di scuola in quattro passi numerati: `settings/schoolDay.ts`.
  calendario: contenutoGiornata,
  ics: () => [schedaCalendarioIcs()],
  valutazione: () => [schedaValutazione()],
  materie: () => [schedaMaterie()],
  liste: () => [schedaListe()],
  intestazione: () => vistaIntestazione(),
  file: () => [schedaFile()],
}

/** Quante impostazioni di una sezione del programma sono state decise a mano. */
function scritteNellaSezione (id: SchedaProgramma): number {
  const sezione = SEZIONI_PROGRAMMA.find((candidata) => candidata.id === id)
  if (!sezione) return 0
  return vociDellaSezione(sezione).filter((voce) => voce.scritta).length
}

/** Una voce della colonna: la sezione, con il suo riassunto e il conto di quel che è deciso. */
interface VoceColonna {
  id: string
  titolo: string
  sottotitolo: string
  segno?: string
  ambito: 'documento' | 'programma'
}

function voceColonna (voce: VoceColonna, attiva: boolean, al: () => void): HTMLElement {
  const id = `impostazioni-scheda-${voce.ambito}-${voce.id}` // testo-fisso: id DOM, non si legge
  return h(
    'button',
    {
      class: ['sezione-voce', attiva && 'sezione-voce--attiva'],
      type: 'button',
      // testo-fisso: la chiave di fuoco, non la legge nessuno
      dataset: { fuoco: `sezione-${voce.ambito}-${voce.id}` },
      // Il riassunto sta nel titolo: nella fascia le sezioni sono in fila.
      attr: {
        id,
        role: 'tab',
        'aria-selected': attiva ? 'true' : 'false',
        'aria-controls': 'impostazioni-pannello', // testo-fisso: id DOM, non si legge
        tabindex: attiva ? '0' : '-1',
        title: voce.sottotitolo,
      },
      onclick: al,
      onkeydown: muoviFraSchede,
    },
    h(
      'span',
      { class: 'sezione-voce__titolo' },
      voce.titolo,
      voce.segno ? h('span', { class: 'sezione-voce__segno' }, voce.segno) : null,
      // La pastiglia solo sulle sezioni del documento: cambiarle vale per chiunque
      // apra quel file.
      voce.ambito === 'documento'
        ? h(
            'span',
            {
              class: 'sezione-voce__ambito',
              attr: { title: testi().fileAiuto },
            },
            testi().file,
          )
        : null,
    ),
  )
}

/** Movimento APG dentro una riga di schede, con attivazione automatica. */
function muoviFraSchede (evento: KeyboardEvent): void {
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

/** La sezione aperta, con il suo gruppo: la stessa che dicono il percorso e la veduta. */
function aperta (): SezioneAperta {
  return sezioneAperta(stato.ambitoImpostazioni, stato.schedaDocumento, stato.schedaProgramma)
}

/**
 * Apre un gruppo dalla fascia, sulla sua prima sezione, e svuota il filtro,
 * che resterebbe su un elenco non più visibile.
 */
function apriGruppo (gruppo: GruppoSezioni): void {
  if (gruppo.id === aperta().gruppo.id) return
  const prima = gruppo.voci[0]
  cercatoNelProgramma = ''
  if (prima.ambito === 'documento') {
    const sezione = SEZIONI_DOCUMENTO.find((candidata) => candidata.id === prima.id)
    if (sezione) aggiorna({ ambitoImpostazioni: 'documento', schedaDocumento: sezione.id })
    return
  }
  const sezione = SEZIONI_PROGRAMMA.find((candidata) => candidata.id === prima.id)
  if (sezione) aggiorna({ ambitoImpostazioni: 'programma', schedaProgramma: sezione.id })
}

/** Un gruppo tematico nella prima riga della fascia: icona e nome. */
function voceGruppo (gruppo: GruppoSezioni, attivo: boolean): HTMLElement {
  return h(
    'button',
    {
      class: ['gruppo-voce', attivo && 'gruppo-voce--attivo'],
      type: 'button',
      // testo-fisso: la chiave di fuoco, non la legge nessuno
      dataset: { fuoco: `gruppo-${gruppo.id}` },
      // Cambia il gruppo di schede, non rappresenta esso stesso un pannello.
      attr: { 'aria-pressed': attivo ? 'true' : 'false' },
      onclick: () => apriGruppo(gruppo),
    },
    icona(gruppo.simbolo),
    h('span', {}, gruppo.titolo),
  )
}

/**
 * La fascia sotto il titolo: i gruppi (`GRUPPI_SEZIONI`) in una riga, le sezioni
 * di quello acceso sotto; resta attaccata in alto scorrendo. Un gruppo di una
 * sezione sola non ha la seconda riga.
 */
function colonnaSezioni (): HTMLElement {
  const qui = aperta()
  const gruppo = qui.gruppo

  const voce = (ambito: 'documento' | 'programma', id: string): HTMLElement | null => {
    if (ambito === 'documento') {
      const sezione = SEZIONI_DOCUMENTO.find((candidata) => candidata.id === id)
      if (!sezione) return null
      return voceColonna(
        { ...sezione, ambito },
        qui.ambito === 'documento' && sezione.id === qui.id,
        () => aggiorna({ ambitoImpostazioni: 'documento', schedaDocumento: sezione.id }),
      )
    }
    const sezione = SEZIONI_PROGRAMMA.find((candidata) => candidata.id === id)
    if (!sezione) return null
    const scritte = scritteNellaSezione(sezione.id)
    return voceColonna(
      {
        ...sezione,
        ambito,
        // Il numero accanto al titolo dice dove si è messo mano.
        segno: scritte > 0 ? String(scritte) : undefined,
      },
      // Anche filtrando una scheda resta selezionata, come richiede il pattern ARIA.
      qui.ambito === 'programma' && sezione.id === qui.id,
      () => {
        // Scegliere una sezione svuota il filtro, che resterebbe su una sezione non visibile.
        cercatoNelProgramma = ''
        aggiorna({ ambitoImpostazioni: 'programma', schedaProgramma: sezione.id })
      },
    )
  }

  return h(
    'div',
    { class: 'impostazioni__fascia' },
    h(
      'nav',
      { class: 'impostazioni__gruppi', attr: { 'aria-label': testi().gruppi } },
      ...GRUPPI_SEZIONI.map((candidato) => voceGruppo(candidato, candidato.id === gruppo.id)),
    ),
    gruppo.voci.length > 1
      ? h(
          'nav',
          { class: 'impostazioni__sezioni', attr: { role: 'tablist', 'aria-label': gruppo.titolo } },
          ...gruppo.voci.map((v) => voce(v.ambito, v.id)),
        )
      : null,
  )
}

/**
 * Che cosa si cerca fra le impostazioni del programma, per chi arriva con il
 * nome di una chiave in mano (come il filtro della finestra nativa). Fuori
 * dallo stato persistito: non va ritrovato alla prossima apertura.
 */
let cercatoNelProgramma = ''

/**
 * La scheda dei risultati in pagina, per rifare solo lei a ogni lettera: il
 * resto della pagina non cambia mentre si cerca.
 */
let risultatiInPagina: Element | null = null

/** Se una voce risponde a quel che si sta cercando: nome, chiave o descrizione. */
function corrisponde (voce: VoceProgramma, parole: readonly string[]): boolean {
  const dove = minuscolo(`${voce.chiave} ${nomeVoce(voce.chiave)} ${voce.descrizione}`)
  return parole.every((parola) => dove.includes(parola))
}

/** Le voci che rispondono, con il nome della sezione in cui stanno di casa. */
function trovate (parole: readonly string[]): Array<{ titolo: string, voci: VoceProgramma[] }> {
  return SEZIONI_PROGRAMMA.map((sezione) => ({
    titolo: sezione.titolo,
    voci: vociMostrateDaSezione(stato.programma, sezione).filter((voce) =>
      corrisponde(voce, parole),
    ),
  })).filter((gruppo) => gruppo.voci.length > 0)
}

function campoCerca (): HTMLElement {
  const t = testi()
  return h(
    'div',
    { class: 'opzioni__cerca' },
    h('input', {
      class: 'campo__controllo',
      type: 'search',
      value: cercatoNelProgramma,
      placeholder: t.filtraSegnaposto,
      dataset: { fuoco: 'impostazioni-cerca' },
      attr: { 'aria-label': t.filtraEtichetta, autocomplete: 'off' },
      // Su `input` e non su `change`: il filtro risponde mentre si scrive.
      oninput: (evento: Event) => {
        const cercavaGia = paroleCercate().length > 0
        cercatoNelProgramma = (evento.target as HTMLInputElement).value
        const parole = paroleCercate()
        // Passando dal cercare al non cercare cambiano colonna e fascia: ridisegno
        // intero. Altrimenti si rifà solo l'elenco dei trovati.
        if (cercavaGia && parole.length > 0 && risultatiInPagina?.isConnected) {
          const nuovi = risultati(parole)
          risultatiInPagina.replaceWith(nuovi)
          risultatiInPagina = nuovi
          return
        }
        aggiorna({})
      },
    }),
  )
}

/**
 * Quel che si trova, sezione per sezione, al posto della sezione aperta; il nome
 * della sezione sopra ogni gruppo insegna dove trovarla senza filtro.
 */
function risultati (parole: readonly string[]): HTMLElement {
  const gruppi = trovate(parole)
  const quante = gruppi.reduce((somma, gruppo) => somma + gruppo.voci.length, 0)
  const t = testi()

  if (quante === 0) {
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
    titolo: t.trovate(quante),
    aiuto: t.trovateAiuto,
    classe: 'scheda--opzioni',
    contenuto: h(
      'div',
      { class: 'gruppi-opzioni' },
      ...gruppi.map((gruppo) =>
        h(
          'section',
          { class: 'gruppo-opzioni' },
          h('h4', { class: 'gruppo-opzioni__titolo' }, gruppo.titolo),
          h('div', { class: 'voci-opzioni' }, ...gruppo.voci.map((voce) => vociProgramma(voce))),
        ),
      ),
    ),
  })
}

/** Le parole del filtro, già divise: vuoto vuol dire che non si cerca. */
function paroleCercate (): string[] {
  return minuscolo(cercatoNelProgramma.trim()).split(/\s+/).filter(Boolean)
}

function contenutoProgramma (): Figlio[] {
  const sezione =
    SEZIONI_PROGRAMMA.find((candidata) => candidata.id === stato.schedaProgramma) ??
    SEZIONI_PROGRAMMA[0]
  const parole = paroleCercate()
  if (parole.length > 0) {
    risultatiInPagina = risultati(parole)
    return [campoCerca(), risultatiInPagina]
  }

  return [
    campoCerca(),
    // I gesti di una sezione (collegare una casella, la firma, scaricare un
    // modello) stanno sopra le sue chiavi.
    sezione.id === 'posta' ? schedaPosta() : null,
    sezione.id === 'posta' ? schedaFirma() : null,
    sezione.id === 'aggiornamenti' ? schedaAggiornamenti() : null,
    ...(sezione.id === 'modelli' ? contenutoModelliLinguistici() : []),
    schedaProgramma(sezione),
  ]
}

function contenutoDocumento (): Figlio[] {
  const sezione =
    SEZIONI_DOCUMENTO.find((candidata) => candidata.id === stato.schedaDocumento) ??
    SEZIONI_DOCUMENTO[0]
  return CONTENUTO_DOCUMENTO[sezione.id]()
}

export function vistaImpostazioni (): Figlio {
  const ambito = stato.ambitoImpostazioni
  const qui = aperta()
  const haSchede = qui.gruppo.voci.length > 1
  const schedaId = `impostazioni-scheda-${qui.ambito}-${qui.id}` // testo-fisso: id DOM, non si legge

  return h(
    'div',
    { class: 'vista vista--impostazioni' },
    // Il titolo prima della fascia; la spiegazione degli ambiti sta dietro la «i».
    testataVista({
      titolo: testi().titolo,
      aiuto: ambito === 'programma' ? dovVannoLeOpzioni() : testi().documentoAiuto,
    }),
    colonnaSezioni(),
    h(
      'div',
      {
        class: 'colonna colonna--impostazioni',
        id: 'impostazioni-pannello', // testo-fisso: id DOM, non si legge
        attr: {
          role: 'tabpanel',
          'aria-labelledby': haSchede ? schedaId : undefined,
          'aria-label': haSchede ? undefined : qui.gruppo.titolo,
        },
      },
      ...(ambito === 'programma' ? contenutoProgramma() : contenutoDocumento()),
    ),
  )
}
