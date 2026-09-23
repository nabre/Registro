// I dati che una lettura ha tirato fuori, disegnati dal registro.
//
// Non è una risposta del modello: è la busta della procedura, impaginata dal
// contratto (`api/presentation.ts`) e mandata alla pagina così com'è. Il
// modello non ci ha messo le mani — non ha ricopiato una cifra — e quel che si
// legge qui è **il dato**, non il racconto del dato.
//
// Per questo si vede anche quando la risposta non arriva: se il modello si
// perde per strada o si ferma a metà, l'appello che ha letto resta lì e si può
// leggere lo stesso. È la differenza fra una conversazione che non ha concluso
// e una domanda buttata via.
//
// Le tabelle sono quelle di `answer.ts` nel foglio — `assistente__tabella` —
// perché sono la stessa cosa vista da chi legge: una griglia dentro una bolla
// stretta. Quel che cambia è da dove vengono i valori.

import { h, type Figlio } from '../dom.js'
import type { BloccoRisultato, RisultatoAssistente } from '../../protocol.js'

function valori (blocco: Extract<BloccoRisultato, { tipo: 'valori' }>): Figlio {
  return h(
    'dl',
    { class: 'assistente__valori' },
    ...blocco.voci.flatMap((voce) => [
      h('dt', null, voce.etichetta),
      h('dd', null, voce.valore),
    ]),
  )
}

function tabella (blocco: Extract<BloccoRisultato, { tipo: 'tabella' }>): Figlio {
  const classe = (colonna: number): string | undefined =>
    blocco.colonne[colonna]?.allinea === 'destra' ? 'assistente__cella--destra' : undefined

  return h(
    'div',
    { class: 'assistente__tabella-contenitore' },
    h(
      'table',
      { class: 'assistente__tabella' },
      h(
        'thead',
        null,
        h(
          'tr',
          null,
          ...blocco.colonne.map((colonna, indice) =>
            h('th', { class: classe(indice), attr: { scope: 'col' } }, colonna.testo),
          ),
        ),
      ),
      h(
        'tbody',
        null,
        ...blocco.righe.map((riga) =>
          h(
            'tr',
            null,
            // La prima colonna è quella che si cerca con l'occhio — il cognome,
            // il nome del corso — e sta in `th`: chi legge con lo schermo che
            // parla se la sente ripetere accanto a ogni cifra.
            ...riga.map((cella, indice) =>
              indice === 0
                ? h('th', { class: classe(indice), attr: { scope: 'row' } }, cella)
                : h('td', { class: classe(indice) }, cella),
            ),
          ),
        ),
      ),
    ),
  )
}

/**
 * Quante righe si vedono, e quante ce n'erano.
 *
 * Solo quando è tagliato: un elenco tagliato senza dirlo diventa una risposta
 * sicura su una parte, ed è la stessa regola di `ElencoVisibile` nel contesto —
 * una risposta sicura e parziale è peggio di un «non lo so».
 *
 * Vale per le tabelle **e per gli elenchi**, che fin qui si tagliavano in
 * silenzio: dodici rotture dell'integrità su quarantasei si leggevano come
 * tutte quelle che c'erano. I due campi sull'elenco sono opzionali — chi
 * impagina può non passarli ancora — e allora non si dichiara niente, mai il
 * contrario.
 */
function coda (mostrate: number, quante: number | undefined, troncata?: boolean): Figlio {
  if (!troncata || typeof quante !== 'number') return null
  return h(
    'p',
    { class: 'assistente__coda-tabella' },
    `Se ne vedono ${mostrate} di ${quante}.`,
  )
}

/**
 * Se un blocco ha davvero la forma che dichiara.
 *
 * I blocchi non si convalidano quando la conversazione rientra — lo schema di
 * `assistente.stacca` li passa come `qualunque()`, scelta dichiarata — e una
 * tabella senza `colonne` faceva `TypeError` dentro `tabella()`. L'eccezione
 * risaliva da `metti()` a `ridisegna()` fino a `aggiorna()` e portava giù **il
 * ridisegno dell'intero registro**, non la sola bolla: una conversazione
 * malformata spegneva il programma intorno.
 */
function haForma (voce: BloccoRisultato): boolean {
  if (voce.tipo === 'valori') return Array.isArray(voce.voci)
  if (voce.tipo === 'elenco') return Array.isArray(voce.voci)
  return Array.isArray(voce.colonne) && Array.isArray(voce.righe)
}

function blocco (voce: BloccoRisultato): Figlio {
  // Un blocco che non è un oggetto con un `tipo` non è un blocco: arriva da una
  // busta che nessuno ha convalidato, e trattarlo come una tabella era il modo
  // di far cadere tutto il ridisegno.
  if (!voce || typeof voce !== 'object' || typeof voce.tipo !== 'string') return null

  const titolo = voce.titolo
    ? h('h5', { class: 'assistente__blocco-titolo' }, voce.titolo)
    : null

  // Un genere sconosciuto **non si mostra**, e non si mostra nemmeno storto:
  // la coda `return [titolo, tabella(voce), …]` disegnava come tabella tutto
  // quel che non era valori o elenco, compreso un genere aggiunto da una
  // versione più nuova o un blocco arrivato rotto.
  if (!haForma(voce)) return null
  switch (voce.tipo) {
    case 'valori':
      return [titolo, valori(voce)]
    case 'elenco':
      return [
        titolo,
        h('ul', { class: 'assistente__elenco' }, ...voce.voci.map((riga) => h('li', null, riga))),
        coda(voce.voci.length, voce.quante, voce.troncata),
      ]
    case 'tabella':
      return [titolo, tabella(voce), coda(voce.righe.length, voce.quante, voce.troncata)]
    default:
      return null
  }
}

/**
 * Un risultato letto, con il suo titolo e la procedura che l'ha letto.
 *
 * Il nome della procedura resta scritto, com'è scritto sulla pastiglia
 * dell'attrezzo poco sopra: è la fonte di quel che si sta guardando, e in un
 * registro la fonte di un numero è la cosa che permette di ricontrollarlo.
 */
export function risultatoLetto (risultato: RisultatoAssistente): Figlio {
  // Come per i blocchi: quel che arriva in un rientro non passa da nessuno
  // schema, e un `blocchi` che non è un elenco faceva cadere tutto il
  // ridisegno del registro invece della sola bolla.
  if (!risultato || typeof risultato !== 'object' || !Array.isArray(risultato.blocchi)) return null
  return h(
    'section',
    { class: 'assistente__risultato' },
    h(
      'header',
      { class: 'assistente__risultato-testata' },
      h('h4', null, risultato.titolo),
      h('code', null, risultato.procedura),
    ),
    ...risultato.blocchi.map(blocco),
  )
}
