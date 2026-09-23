// L'anno scolastico: quello aperto, quelli che ci sono, e quel che li descrive.
//
// È la sezione più «da amministrazione» del registro e si tocca due volte
// l'anno: a settembre, quando l'anno nasce, e a gennaio, quando si controlla
// dove cade il confine dei semestri. Per il resto del tempo deve solo dire
// com'è messa, senza chiedere niente.
//
// ## Che cosa è cambiato rispetto a prima
//
// Prima era un riquadro solo: gli anni in elenco, e dentro ogni anno i giorni
// di chiusura e la griglia delle settimane A/B. Leggibile finché gli anni erano
// due; al terzo, per arrivare alle settimane dell'anno in corso bisognava
// scorrere le vacanze di quelli vecchi. Adesso l'anno **aperto** ha le sue tre
// schede — l'anno, le chiusure, le settimane — e gli altri restano in un elenco
// che si legge in due righe e da cui si apre quello che serve.
//
// ## Il gesto che manca apposta
//
// Non si modifica un semestre da qui: si apre il modulo dell'anno, che li
// tratta insieme. Due semestri che si sovrappongono o che lasciano un buco sono
// un anno rotto — le medie di fine periodo cadrebbero in due posti o in nessuno
// — e l'unico modo di non scriverlo è cambiarli insieme, con davanti tutte e
// quattro le date.

import { conLetteraSettimana, letteraSettimana } from '../../../domain/years.js'
import {
  differenzaGiorni,
  formattaData,
  inizioSettimana,
  settimanaIso,
  sommaGiorni,
} from '../../../domain/dates.js'
import type { AnnoScolastico, Iso, LetteraSettimana } from '../../../domain/models.js'
import { sospensioneDi } from '../../../domain/timetable.js'
import {
  avviso,
  conAttesa,
  pastiglia,
  pulsante,
  scheda,
  statoVuoto,
} from '../../components/base.js'
import { eseguiOAvvisa } from '../../components/filters.js'
import { conferma } from '../../components/modal.js'
import { notifica } from '../../components/notifications.js'
import { h } from '../../dom.js'
import { moduloAnno, moduloAvvio, moduloPause } from '../../forms.js'
import { azione } from '../../bridge.js'
import { annoCorrente, stato } from '../../state.js'

/** I lunedì dell'anno, dal primo all'ultimo: è la griglia delle settimane. */
function lunediDellAnno (anno: AnnoScolastico): Iso[] {
  const lunedi: Iso[] = []
  const ultimo = inizioSettimana(anno.fine)
  for (let giorno = inizioSettimana(anno.inizio); giorno <= ultimo; giorno = sommaGiorni(giorno, 7)) {
    lunedi.push(giorno)
  }
  return lunedi
}

/** Salva l'anno intero, per i gesti che toccano più di una cosa insieme. */
async function salvaAnno (anno: AnnoScolastico, detto: string): Promise<void> {
  const risposta = await azione({ tipo: 'anno.salva', anno })
  if (!risposta.ok) {
    notifica(risposta.errori?.[0] ?? 'Non riuscito.', 'errore')
    return
  }
  notifica(detto, 'successo')
}

// ------------------------------------------------------------- l'anno aperto

/**
 * L'anno in uso, con le sue date e i suoi semestri.
 *
 * I conti accanto a ogni semestre valgono solo per l'anno caricato: di un altro
 * si direbbe «0 valutazioni», che è falso e sembra vero.
 */
export function schedaAnnoAperto (): HTMLElement {
  const corrente = annoCorrente()

  if (!corrente) {
    return scheda({
      titolo: 'Anno scolastico',
      sottotitolo: 'la scansione su cui si contano le medie',
      contenuto: statoVuoto({
        simbolo: 'calendario',
        titolo: 'Nessun anno aperto',
        testo: 'Classi, lezioni e valutazioni stanno tutte dentro un anno: è il primo passo.',
        azione: h(
          'div',
          { class: 'stato-vuoto__pulsanti' },
          pulsante({ testo: 'Avvio guidato', variante: 'primario', simbolo: 'piu', al: () => moduloAvvio() }),
          pulsante({ testo: 'Solo l’anno', al: () => moduloAnno() }),
        ),
      }),
    })
  }

  const valutazioniDel = (inizio: Iso, fine: Iso) =>
    stato.registro.valutazioni.filter((v) => v.data >= inizio && v.data <= fine).length

  return scheda({
    titolo: `Anno ${corrente.etichetta}`,
    sottotitolo: `${formattaData(corrente.inizio)} → ${formattaData(corrente.fine)}${
      corrente.cartella ? ` · cartella ${corrente.cartella}/` : ''
    }`,
    azioni: pulsante({
      testo: 'Modifica',
      simbolo: 'matita',
      variante: 'sottile',
      titolo: 'Date dell’anno e dei due semestri, insieme',
      al: () => moduloAnno(corrente),
    }),
    contenuto: h(
      'div',
      { class: 'anno-aperto' },
      h(
        'div',
        { class: 'anno__semestri' },
        ...corrente.semestri.map((semestre) =>
          h(
            'div',
            { class: 'anno__semestre' },
            h('span', { class: 'anno__semestre-nome' }, semestre.etichetta),
            h(
              'span',
              { class: 'anno__semestre-periodo' },
              `${formattaData(semestre.inizio)} → ${formattaData(semestre.fine)}`,
            ),
            h(
              'span',
              { class: 'anno__semestre-conti' },
              `${valutazioniDel(semestre.inizio, semestre.fine)} valutazioni`,
            ),
          ),
        ),
      ),
      corrente.semestri.length === 0
        ? avviso(
            'Quest’anno non ha semestri: le medie di fine periodo non sanno dove cadere. Si ' +
              'mettono dal modulo dell’anno.',
            'attenzione',
          )
        : null,
    ),
  })
}

// ---------------------------------------------------------- gli altri anni

/**
 * L'anno aperto, e come aprirne un altro.
 *
 * Qui c'era l'elenco di tutti gli anni: il registro possedeva una cartella di
 * documenti e sapeva dirne il contenuto. Adesso il documento aperto è uno solo
 * e può stare ovunque, e a elencare gli altri sono i recenti della barra dei
 * comandi e il dialogo di apertura del sistema — che li elenca meglio, e li
 * trova anche dove il registro non avrebbe guardato.
 *
 * Eliminare un anno non si fa più da qui, ed è la conseguenza coerente: un
 * documento che il registro non elenca è un documento che non gli spetta
 * cestinare. Si butta dal gestore di file, come ogni altro documento.
 */
export function schedaElencoAnni (): HTMLElement {
  const corrente = annoCorrente()

  return scheda({
    titolo: 'L’anno aperto',
    sottotitolo: 'ogni anno è un documento a sé: aprirne un altro cambia quel che si vede',
    azioni: h(
      'div',
      { class: 'scheda__azioni' },
      pulsante({
        testo: 'Apri un anno…',
        simbolo: 'cartella',
        variante: 'sottile',
        al: () => void azione({ tipo: 'documento.apri' }),
      }),
      pulsante({ testo: 'Nuovo anno', simbolo: 'piu', variante: 'primario', al: () => moduloAnno() }),
    ),
    contenuto: !corrente
      ? statoVuoto({
          simbolo: 'calendario',
          titolo: 'Nessun anno scolastico',
          testo: 'Si comincia da qui, o dall’avvio guidato che porta fino alla prima lezione.',
          azione: pulsante({
            testo: 'Avvio guidato',
            variante: 'primario',
            simbolo: 'piu',
            al: () => moduloAvvio(),
          }),
        })
      : h(
          'ul',
          { class: 'elenco-anni' },
          h(
            'li',
            { class: 'anno-riga anno-riga--corrente' },
            h(
              'div',
              { class: 'anno-riga__nome' },
              h('strong', null, corrente.etichetta),
              pastiglia('aperto', 'positivo', 'spunta'),
            ),
            h(
              'span',
              { class: 'anno-riga__periodo' },
              `${formattaData(corrente.inizio)} → ${formattaData(corrente.fine)}`,
            ),
            h(
              'span',
              { class: 'anno-riga__misure' },
              `${corrente.semestri.length} semestri · ${corrente.sospensioni.length} chiusure`,
            ),
            h(
              'span',
              { class: 'anno-riga__azioni' },
              pulsante({
                simbolo: 'matita',
                variante: 'fantasma',
                titolo: 'Modifica le date',
                al: () => moduloAnno(corrente),
              }),
            ),
          ),
        ),
  })
}

// ------------------------------------------------------------- le chiusure

/**
 * I giorni senza lezione dell'anno aperto.
 *
 * Non servono a colorare il calendario — quello è il di più. Servono perché la
 * generazione dell'orario li salti: senza, mettere un semestre sul calendario
 * vorrebbe dire cancellare a mano le due settimane di Natale.
 *
 * Ogni riga si toglie da sé. Prima si passava sempre dal modulo delle pause —
 * l'elenco intero in una finestra — anche per togliere una chiusura messa per
 * sbaglio il giorno prima: adesso il modulo resta per metterle e sistemarle
 * tutte insieme, e il cestino della riga fa la cosa piccola.
 */
export function schedaChiusure (): HTMLElement {
  const anno = annoCorrente()

  if (!anno) {
    return scheda({
      titolo: 'Giorni senza lezione',
      sottotitolo: 'vacanze e chiusure: la generazione dell’orario le salta',
      contenuto: statoVuoto({
        simbolo: 'calendario',
        titolo: 'Nessun anno aperto',
        testo: 'Le chiusure appartengono a un anno: prima ce ne vuole uno.',
      }),
    })
  }

  const giorniChiusi = anno.sospensioni.reduce(
    (conto, sospensione) => conto + differenzaGiorni(sospensione.dal, sospensione.al) + 1,
    0,
  )

  return scheda({
    titolo: 'Giorni senza lezione',
    sottotitolo:
      anno.sospensioni.length === 0
        ? 'vacanze e chiusure: la generazione dell’orario le salta'
        : `${anno.sospensioni.length} periodi · ${giorniChiusi} giorni in tutto`,
    azioni: pulsante({
      testo: 'Aggiungi',
      simbolo: 'piu',
      variante: 'primario',
      al: () => moduloPause(anno),
    }),
    contenuto:
      anno.sospensioni.length === 0
        ? statoVuoto({
            simbolo: 'calendario',
            titolo: 'Nessuna chiusura dichiarata',
            testo:
              'Dichiarandole qui, le lezioni generate dall’orario saltano quei giorni invece di ' +
              'nascere e dover essere cancellate a mano.',
            azione: pulsante({
              testo: 'Aggiungi le vacanze',
              variante: 'primario',
              simbolo: 'piu',
              al: () => moduloPause(anno),
            }),
          })
        : h(
            'ul',
            { class: 'sospensioni' },
            ...anno.sospensioni.map((sospensione) => {
              const giorni = differenzaGiorni(sospensione.dal, sospensione.al) + 1
              return h(
                'li',
                { class: 'sospensione' },
                h('strong', null, sospensione.etichetta),
                h(
                  'span',
                  { class: 'testo-quieto' },
                  sospensione.dal === sospensione.al
                    ? formattaData(sospensione.dal, 'giorno')
                    : `${formattaData(sospensione.dal)} → ${formattaData(sospensione.al)} · ${giorni} giorni`,
                ),
                h(
                  'span',
                  { class: 'sospensione__azioni' },
                  pulsante({
                    simbolo: 'matita',
                    variante: 'fantasma',
                    titolo: 'Modifica le chiusure dell’anno',
                    al: () => moduloPause(anno),
                  }),
                  pulsante({
                    simbolo: 'cestino',
                    variante: 'fantasma',
                    titolo: 'Togli questa chiusura',
                    al: async () => {
                      const sicuro = await conferma({
                        titolo: `Togliere «${sospensione.etichetta}»?`,
                        testo:
                          'Le lezioni già sul calendario restano dove sono: cambia solo quel che ' +
                          'la generazione dell’orario salterà da qui in avanti.',
                        testoConferma: 'Togli',
                        pericolo: true,
                      })
                      if (!sicuro) return
                      await salvaAnno(
                        {
                          ...anno,
                          sospensioni: anno.sospensioni.filter((altra) => altra.id !== sospensione.id),
                        },
                        `«${sospensione.etichetta}» tolta.`,
                      )
                    },
                  }),
                ),
              )
            }),
          ),
  })
}

// ---------------------------------------------------------- le settimane A/B

/**
 * Le settimane A e B dell'anno aperto, una casella per settimana.
 *
 * Stanno qui e non nel calendario perché si mettono tutte insieme, una volta,
 * quando arriva l'orario: nel calendario bisognava aprire una settimana alla
 * volta per marcarla, quaranta volte, e ogni volta si perdeva di vista il
 * disegno dell'alternanza — che è proprio la cosa da controllare.
 *
 * I due comandi in testa sono il motivo per cui questa griglia adesso si usa
 * davvero. «Alterna» riempie l'anno a partire dalla prima settimana marcata,
 * saltando le chiusure — che è come funziona una quindicina vera: la settimana
 * di vacanza non consuma il turno. «Pulisci» toglie tutto, che è quel che serve
 * quando l'orario cambia a gennaio.
 */
export function schedaSettimane (): HTMLElement {
  const anno = annoCorrente()

  if (!anno) {
    return scheda({
      titolo: 'Settimane A e B',
      sottotitolo: 'serve dove l’orario è quindicinale',
      contenuto: statoVuoto({
        simbolo: 'calendario',
        titolo: 'Nessun anno aperto',
        testo: 'Le settimane appartengono a un anno: prima ce ne vuole uno.',
      }),
    })
  }

  const lunedi = lunediDellAnno(anno)
  const messe = lunedi.filter((giorno) => letteraSettimana(anno, giorno)).length

  /** Riempie l'anno alternando dalla prima marcata in poi, saltando le chiusure. */
  const alterna = async () => {
    const prima = lunedi.find((giorno) => letteraSettimana(anno, giorno))
    const partenza = prima ?? lunedi[0]
    if (!partenza) return
    let corrente: LetteraSettimana = letteraSettimana(anno, partenza) ?? 'A'
    let nuovo = anno
    for (const giorno of lunedi) {
      if (giorno < partenza) continue
      // Una settimana interamente chiusa non consuma il turno: è quel che fa la
      // differenza fra un'alternanza che regge fino a giugno e una che salta
      // alla prima vacanza.
      const chiusa = [0, 1, 2, 3, 4].every((scarto) => sospensioneDi(anno, sommaGiorni(giorno, scarto)))
      if (chiusa) {
        nuovo = conLetteraSettimana(nuovo, giorno, null)
        continue
      }
      nuovo = conLetteraSettimana(nuovo, giorno, corrente)
      corrente = corrente === 'A' ? 'B' : 'A'
    }
    await salvaAnno(nuovo, `Alternanza scritta da ${formattaData(partenza)}.`)
  }

  const pulisci = async () => {
    const sicuro = await conferma({
      titolo: 'Togliere tutte le lettere?',
      testo: `${messe} settimane tornano senza lettera. L’orario e le lezioni non si toccano.`,
      testoConferma: 'Togli tutto',
      pericolo: true,
    })
    if (!sicuro) return
    await salvaAnno({ ...anno, settimane: {} }, 'Lettere tolte.')
  }

  return scheda({
    titolo: 'Settimane A e B',
    sottotitolo:
      messe === 0
        ? 'nessuna marcata: serve solo dove l’orario è quindicinale'
        : `${messe} settimane su ${lunedi.length} marcate`,
    azioni: [
      pulsante({
        testo: 'Alterna',
        simbolo: 'ricarica',
        variante: 'sottile',
        titolo: 'Riempie l’anno alternando A e B dalla prima marcata, saltando le chiusure',
        al: (evento) => void conAttesa(evento.currentTarget as HTMLButtonElement, alterna()),
      }),
      ...(messe > 0
        ? [
            pulsante({
              testo: 'Pulisci',
              simbolo: 'cestino',
              variante: 'fantasma',
              titolo: 'Toglie la lettera a tutte le settimane',
              al: () => void pulisci(),
            }),
          ]
        : []),
    ],
    contenuto: h(
      'div',
      { class: 'settimane-ab' },
      ...lunedi.map((giorno) => {
        const lettera = letteraSettimana(anno, giorno)
        const sospesa = sospensioneDi(anno, giorno)
        return h(
          'div',
          {
            class: ['settimana-ab', sospesa && 'settimana-ab--sospesa'],
            attr: {
              title: [
                `Settimana ${settimanaIso(giorno)} · dal ${formattaData(giorno)}`,
                sospesa ? sospesa.etichetta : null,
              ]
                .filter(Boolean)
                .join(' · '),
            },
          },
          h('span', { class: 'settimana-ab__numero' }, String(settimanaIso(giorno))),
          h(
            'div',
            { class: 'settimana-ab__lettere' },
            ...(['A', 'B'] as LetteraSettimana[]).map((quale) =>
              h(
                'button',
                {
                  class: [
                    'settimana-ab__lettera',
                    lettera === quale && 'settimana-ab__lettera--scelta',
                  ],
                  type: 'button',
                  attr: {
                    // Ricliccando quella già messa si toglie: «nessuna delle
                    // due» è il caso normale — vacanze, stage — e non merita un
                    // terzo pulsante acceso in quasi tutte le settimane.
                    title:
                      lettera === quale
                        ? `Settimana ${quale}: cliccando la togli`
                        : `Segna come settimana ${quale}`,
                    'aria-pressed': lettera === quale ? 'true' : 'false',
                  },
                  onclick: (evento: MouseEvent) =>
                    void conAttesa(
                      evento.currentTarget as HTMLButtonElement,
                      eseguiOAvvisa({
                        tipo: 'anno.settimana',
                        annoId: anno.id,
                        giorno,
                        lettera: lettera === quale ? null : quale,
                      }),
                    ),
                },
                quale,
              ),
            ),
          ),
        )
      }),
    ),
  })
}
