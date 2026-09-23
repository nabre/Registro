// Impostazioni: un posto solo, due mondi tenuti separati.
//
// Fino a ieri erano due pagine in due finestre diverse. Quel che riguardava
// l'anno — la griglia oraria, la scala dei voti, le materie — stava nel
// pannello; quel che riguardava il programma — il tema, l'agenda sul desktop,
// la posta, la lettura delle scansioni — stava in una finestra nativa che si
// apriva dal menu e mostrava le chiavi così com'erano scritte nel file.
// Risultato: per due domande vicinissime («a che ora comincia la mia giornata»
// e «il registro si accende con il computer?») bisognava sapere in anticipo
// quale delle due finestre aprire.
//
// Adesso è una pagina sola, e la prima cosa che si sceglie è **di chi** sono le
// impostazioni che si stanno guardando:
//
//   Programma  →  restano su questa macchina, valgono per tutti i documenti
//   Documento  →  stanno dentro il `.registro`, viaggiano con il file
//
// Non è una divisione estetica: è l'unica cosa che qui si può sbagliare senza
// accorgersene. Cambiare la scala dei voti vuol dire cambiarla per chiunque
// apra quel documento, anche l'anno prossimo; cambiare il tema non esce da
// questo computer. Mescolate in un elenco solo, le due cose si distinguevano
// solo sapendolo già.
//
// Il secondo livello sono gli argomenti, in una colonna di sinistra: dentro
// ogni ambito le sezioni sono cinque o sei, e una fila di schede in orizzontale
// a quel punto va a capo o si stringe fino a non leggersi più.
//
// La finestra nativa resta, e serve ancora: senza documento aperto il pannello
// non c'è, e da qualche parte le impostazioni del programma si devono poter
// cambiare comunque.

import { scheda, statoVuoto, testataVista } from '../components/base.js'
import type { VoceProgramma } from '../../protocol.js'
import { h, type Figlio } from '../dom.js'
import { aggiorna, stato, type SchedaDocumento, type SchedaProgramma } from '../state.js'
import {
  schedaAnnoAperto,
  schedaChiusure,
  schedaElencoAnni,
  schedaSettimane,
} from './settings/year.js'
import {
  schedaCalendario,
  schedaFile,
  schedaMaterie,
  schedaValutazione,
} from './settings/document.js'
import { schedaListe } from './settings/lists.js'
import { schedaPosta } from './settings/mail.js'
import { schedaRegistri } from './settings/registers.js'
import {
  dovVannoLeOpzioni,
  schedaProgramma,
  vociDellaSezione,
  vociProgramma,
} from './settings/program.js'
import {
  SEZIONI_DOCUMENTO,
  SEZIONI_PROGRAMMA,
  nomeVoce,
  vociMostrateDaSezione,
} from './settings/sections.js'

/**
 * Che cosa disegna ciascuna sezione del documento.
 *
 * I nomi non stanno qui: stanno in `settings/sections.ts`, insieme a quelli
 * delle sezioni del programma, perché li legge anche chi non disegna niente —
 * la veduta che dice all'assistente in quale sezione si sta. Qui resta la sola
 * cosa che ha bisogno del DOM: il contenuto.
 */
const CONTENUTO_DOCUMENTO: Record<SchedaDocumento, () => Figlio[]> = {
  anno: () => [schedaAnnoAperto(), schedaChiusure(), schedaSettimane(), schedaElencoAnni()],
  calendario: () => [schedaCalendario()],
  valutazione: () => [schedaValutazione()],
  materie: () => [schedaMaterie()],
  liste: () => [schedaListe()],
  file: () => [schedaFile()],
}

/** Quante impostazioni di una sezione del programma sono state decise a mano. */
function scritteNellaSezione (id: SchedaProgramma): number {
  const sezione = SEZIONI_PROGRAMMA.find((candidata) => candidata.id === id)
  if (!sezione) return 0
  return vociDellaSezione(sezione).filter((voce) => voce.scritta).length
}

/**
 * La colonna delle sezioni.
 *
 * Non è un `selettore` come quelli della testata: lì le voci sono tre parole in
 * fila, qui sono sei argomenti con un riassunto sotto — e il riassunto è
 * proprio quel che evita di aprirle tutte per trovare dove sta una cosa.
 */
function colonnaSezioni (
  voci: ReadonlyArray<{ id: string, titolo: string, sottotitolo: string, segno?: string }>,
  attiva: string,
  al: (id: string) => void,
): HTMLElement {
  return h(
    'nav',
    { class: 'impostazioni__sezioni', attr: { role: 'tablist', 'aria-label': 'Sezioni' } },
    ...voci.map((voce) =>
      h(
        'button',
        {
          class: ['sezione-voce', voce.id === attiva && 'sezione-voce--attiva'],
          type: 'button',
          attr: { role: 'tab', 'aria-selected': voce.id === attiva ? 'true' : 'false' },
          onclick: () => al(voce.id),
        },
        h(
          'span',
          { class: 'sezione-voce__titolo' },
          voce.titolo,
          voce.segno ? h('span', { class: 'sezione-voce__segno' }, voce.segno) : null,
        ),
        h('span', { class: 'sezione-voce__sottotitolo' }, voce.sottotitolo),
      ),
    ),
  )
}

/**
 * Che cosa si sta cercando fra le impostazioni del programma.
 *
 * Le sezioni rispondono alla domanda «dove sta il tema?»; non rispondono a
 * «dov'è finita `attesaMassimaSecondi`», che è la domanda di chi arriva da un
 * messaggio d'errore o dalla guida con un nome in mano. La finestra nativa un
 * filtro ce l'aveva da sempre, e la pagina no: la stessa ricerca dava due
 * risultati diversi secondo la finestra da cui la si faceva.
 *
 * Vive qui e non nello stato persistito perché è dove si sta guardando adesso,
 * non una preferenza da ritrovare domani: riaprire le impostazioni con un
 * filtro di sei mesi fa addosso vorrebbe dire una pagina quasi vuota e nessuna
 * spiegazione. Sopravvive al ridisegno perché il modulo non si ricarica, e il
 * cursore ci resta dentro perché il campo porta una chiave di fuoco.
 */
let cercatoNelProgramma = ''

/** Se una voce risponde a quel che si sta cercando: nome, chiave o descrizione. */
function corrisponde (voce: VoceProgramma, parole: readonly string[]): boolean {
  const dove = `${voce.chiave} ${nomeVoce(voce.chiave)} ${voce.descrizione}`.toLowerCase()
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
  return h(
    'div',
    { class: 'opzioni__cerca' },
    h('input', {
      class: 'campo__controllo',
      type: 'search',
      value: cercatoNelProgramma,
      placeholder: 'Filtra le impostazioni per nome, chiave o descrizione…',
      dataset: { fuoco: 'impostazioni-cerca' },
      attr: { 'aria-label': 'Filtra le impostazioni del programma', autocomplete: 'off' },
      // Su `input` e non su `change`: un filtro che risponde quando si esce
      // dal campo non è un filtro, è un modulo da compilare.
      oninput: (evento: Event) => {
        cercatoNelProgramma = (evento.target as HTMLInputElement).value
        aggiorna({})
      },
    }),
  )
}

/**
 * Quel che si trova, sezione per sezione, al posto della sezione aperta.
 *
 * Il nome della sezione resta scritto sopra ogni gruppo: chi cerca una chiave
 * la trova, e insieme impara dove tornare a cercarla la prossima volta senza
 * filtro.
 */
function risultati (parole: readonly string[]): Figlio {
  const gruppi = trovate(parole)
  const quante = gruppi.reduce((somma, gruppo) => somma + gruppo.voci.length, 0)

  if (quante === 0) {
    return scheda({
      titolo: 'Nessuna corrispondenza',
      classe: 'scheda--opzioni',
      contenuto: statoVuoto({
        simbolo: 'impostazioni',
        titolo: 'Niente che si chiami così',
        testo:
          'Il filtro guarda il nome, la chiave e la descrizione. Le impostazioni dell’anno — '
          + 'la griglia oraria, la scala dei voti — stanno nell’altro ambito, e qui non compaiono.',
      }),
    })
  }

  return scheda({
    titolo: `Trovate (${quante})`,
    sottotitolo: 'le impostazioni del programma che corrispondono, sezione per sezione',
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

function corpoProgramma (): Figlio {
  const scelta = stato.schedaProgramma
  const sezione = SEZIONI_PROGRAMMA.find((candidata) => candidata.id === scelta) ?? SEZIONI_PROGRAMMA[0]
  const parole = cercatoNelProgramma.trim().toLowerCase().split(/\s+/).filter(Boolean)

  return h(
    'div',
    { class: 'impostazioni__corpo' },
    colonnaSezioni(
      SEZIONI_PROGRAMMA.map((voce) => {
        const scritte = scritteNellaSezione(voce.id)
        return {
          id: voce.id,
          titolo: voce.titolo,
          sottotitolo: voce.sottotitolo,
          // Il numero accanto al titolo dice dove si è messo mano: aprendo le
          // impostazioni dopo sei mesi è la sola cosa che si cerca davvero.
          segno: scritte > 0 ? String(scritte) : undefined,
        }
      }),
      // Filtrando non c'è nessuna sezione aperta: l'elenco a destra le
      // attraversa tutte, e tenerne una accesa direbbe il falso.
      parole.length > 0 ? '' : sezione.id,
      (id) => {
        // Scegliere una sezione è il modo naturale di dire «basta cercare»: il
        // filtro resterebbe altrimenti addosso a una sezione che non si vede,
        // e chi ha premuto «Posta» troverebbe due righe e nessuna spiegazione.
        cercatoNelProgramma = ''
        aggiorna({ schedaProgramma: id as SchedaProgramma })
      },
    ),
    h(
      'div',
      { class: 'colonna colonna--impostazioni' },
      campoCerca(),
      dovVannoLeOpzioni(),
      parole.length > 0 ? risultati(parole) : null,
      // I comandi della posta stanno sopra le sue chiavi: collegare una casella
      // non è scrivere un valore, ed è quel che si viene a fare qui.
      parole.length === 0 && sezione.id === 'posta' ? schedaPosta() : null,
      // E l'elenco degli anni sopra la sezione che raccoglie, per la stessa
      // ragione: aprire, chiudere e tenere da parte un documento sono gesti,
      // non valori — e sono quel che si viene a cercare fra i file.
      parole.length === 0 && sezione.id === 'file' ? schedaRegistri() : null,
      parole.length > 0 ? null : schedaProgramma(sezione),
    ),
  )
}

function corpoDocumento (): Figlio {
  const scelta = stato.schedaDocumento
  const sezione = SEZIONI_DOCUMENTO.find((candidata) => candidata.id === scelta) ?? SEZIONI_DOCUMENTO[0]

  return h(
    'div',
    { class: 'impostazioni__corpo' },
    colonnaSezioni(SEZIONI_DOCUMENTO, sezione.id, (id) =>
      aggiorna({ schedaDocumento: id as SchedaDocumento }),
    ),
    h('div', { class: 'colonna colonna--impostazioni' }, ...CONTENUTO_DOCUMENTO[sezione.id]()),
  )
}

export function vistaImpostazioni (): Figlio {
  const ambito = stato.ambitoImpostazioni

  return h(
    'div',
    { class: 'vista vista--impostazioni' },
    // La testata dice solo dove si è: i due ambiti stanno nella riga delle
    // azioni — vedi `commands.ts` — perché sono una scelta della pagina intera, e
    // là si trovano accanto a tutto il resto che si può fare qui. Non c'è un
    // «torna al calendario»: da una pagina si esce dalla barra di sinistra, come
    // da ogni altra.
    testataVista({
      titolo: 'Impostazioni',
      sottotitolo:
        ambito === 'programma'
          ? 'valgono su questo computer, per tutti i documenti'
          : 'stanno dentro il documento d’anno e viaggiano con lui',
    }),
    ambito === 'programma' ? corpoProgramma() : corpoDocumento(),
  )
}
