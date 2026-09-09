// I comandi dello schermo per la classe.
//
// Stanno qui, nel pannello del docente, e non sullo schermo grande: un
// interruttore proiettato è un interruttore che si preme davanti a venti
// persone, e nel mezzo di quel gesto la classe legge quel che stava sotto.
//
// La barra compare solo a proiezione accesa, e dice due cose insieme: che cosa
// sta guardando la classe adesso, e come toglierlo. La prima è quella che conta
// — la proiezione segue l'ora aperta, quindi cambia da sola, e senza un posto
// in cui leggere che cosa è finito sullo schermo si finisce per girare la testa
// verso il proiettore ogni volta.

import {
  BLOCCHI,
  NOMI_BLOCCO,
  NOMI_VISTA_CALENDARIO,
  VISTE_CALENDARIO,
  bloccoAperto,
  bloccoScorrendo,
  riservato,
  type BloccoProiezione,
  type ImpostazioniProiezione,
  type VistaCalendario,
} from '../../dominio/proiezione.js'
import { h, type Figlio } from '../dom.js'
import { azione } from '../ponte.js'
import { stato } from '../stato.js'
import { conAttesa, pulsante, selettore } from './base.js'
import { icona, type NomeIcona } from './icone.js'

function manda (impostazioni: ImpostazioniProiezione): Promise<unknown> {
  return azione({ tipo: 'proiezione.impostazioni', impostazioni })
}

/**
 * Apre una scheda, accendendola se era spenta.
 *
 * Un clic solo per il gesto normale — «adesso mostro le consegne» — e non due,
 * uno per accendere e uno per aprire. Chi vuole solo spegnere una scheda
 * riclicca quella aperta: è l'unico caso in cui spegnere serve davvero, perché
 * è l'unica che si sta vedendo.
 */
function apri (blocco: BloccoProiezione): Promise<unknown> {
  const attuali = stato.proiezione.impostazioni
  const acceso = attuali.blocchi.includes(blocco)
  const corrente = bloccoAperto(attuali) === blocco

  if (acceso && corrente) {
    // Ricliccando quella aperta la si spegne: lo schermo scivola sulla
    // successiva da solo, e con l'ultima resta pulito.
    const restanti = attuali.blocchi.filter((b) => b !== blocco)
    return manda({ ...attuali, blocchi: restanti, aperto: null })
  }

  return manda({
    ...attuali,
    // Nell'ordine dichiarato e non in quello dei clic: è l'ordine in cui le
    // schede scorrono sullo schermo, e cambiarlo a seconda dei clic vorrebbe
    // dire che «la prossima» non è sempre la stessa.
    blocchi: BLOCCHI.filter((b) => attuali.blocchi.includes(b) || b === blocco),
    aperto: blocco,
  })
}

/**
 * Una scheda nella barra del docente.
 *
 * Tre stati e non due: spenta, accesa ma non in vista, in vista. Il terzo è
 * quello che conta — dice che cosa sta guardando la classe in questo momento,
 * ed è l'unica cosa che da qui non si vede girando la testa.
 */
function scheda (blocco: BloccoProiezione): HTMLElement {
  const impostazioni = stato.proiezione.impostazioni
  const acceso = impostazioni.blocchi.includes(blocco)
  const corrente = acceso && bloccoAperto(impostazioni) === blocco
  const delicato = riservato(blocco)

  return h(
    'button',
    {
      class: [
        'blocco-proiettato',
        acceso && 'blocco-proiettato--acceso',
        corrente && 'blocco-proiettato--in-vista',
        delicato && 'blocco-proiettato--riservato',
      ],
      type: 'button',
      attr: {
        'aria-pressed': corrente ? 'true' : 'false',
        title: corrente
          ? `${NOMI_BLOCCO[blocco]}: è quel che la classe sta vedendo. Cliccando lo si toglie.`
          : delicato
            ? `${NOMI_BLOCCO[blocco]}: parla dei singoli allievi. Aprendolo, lo vede tutta la classe.`
            : `Mostra ${NOMI_BLOCCO[blocco].toLowerCase()}`,
      },
      onclick: (evento: MouseEvent) =>
        void conAttesa(evento.currentTarget as HTMLButtonElement, apri(blocco)),
    },
    h('span', null, NOMI_BLOCCO[blocco]),
  )
}

/** L'icona di ogni vista: le stesse del selettore del calendario. */
const ICONE_VISTA: Record<VistaCalendario, NomeIcona> = {
  settimana: 'settimana',
  mese: 'mese',
  anno: 'calendario',
  agenda: 'agenda',
}

/**
 * Come si guarda il calendario proiettato: le stesse quattro viste del registro.
 *
 * Compare solo quando la scheda Calendario è quella aperta — è l'unico momento
 * in cui la scelta cambia qualcosa sullo schermo, e una riga di pulsanti che
 * non fanno niente sarebbe una riga da imparare a ignorare.
 *
 * Il giorno non si sceglie da qui: lo porta il calendario del registro. Si
 * scorre la settimana sul portatile e la classe vede scorrere la sua, che è
 * il gesto che si sta già facendo mentre si parla.
 */
function vistaDelCalendario (impostazioni: ImpostazioniProiezione): Figlio {
  if (bloccoAperto(impostazioni) !== 'calendario') return null
  return h(
    'div',
    { class: 'barra-proiezione__viste' },
    h('span', { class: 'barra-proiezione__etichetta' }, 'Calendario'),
    selettore(
      impostazioni.calendario ?? 'agenda',
      VISTE_CALENDARIO.map((vista) => ({
        valore: vista,
        testo: NOMI_VISTA_CALENDARIO[vista],
        simbolo: ICONE_VISTA[vista],
      })),
      (scelta) => void manda({ ...impostazioni, calendario: scelta }),
    ),
    h(
      'span',
      { class: 'barra-proiezione__nota' },
      'il giorno è quello aperto nel calendario',
    ),
  )
}

/**
 * L'avviso che compare quando sullo schermo ci sono i nomi.
 *
 * Non è un divieto e non chiede conferme: dice quel che c'è scritto sul
 * proiettore, che è l'unica cosa che da qui non si vede. Chi l'ha acceso lo sa;
 * chi ci ritorna dopo mezz'ora di lezione no.
 */
function avvisoRiservato (impostazioni: ImpostazioniProiezione): Figlio {
  // Solo la scheda aperta: le altre sono accese ma non sullo schermo, e dire
  // «sullo schermo: valutazioni» di un blocco che nessuno vede sarebbe un
  // allarme che si impara a ignorare.
  const aperto = bloccoAperto(impostazioni)
  if (!aperto || !riservato(aperto)) return null
  return h(
    'div',
    { class: 'barra-proiezione__avviso' },
    icona('avviso'),
    h(
      'span',
      null,
      `Sullo schermo: ${NOMI_BLOCCO[aperto].toLowerCase()}`,
      impostazioni.nomi ? ', con i nomi' : '',
      '.',
    ),
  )
}

export function barraProiezione (): Figlio {
  if (!stato.proiezione.aperta) return null
  const impostazioni = stato.proiezione.impostazioni

  return h(
    'div',
    {
      class: ['barra-proiezione', impostazioni.sospesa && 'barra-proiezione--sospesa'],
      attr: { 'aria-label': 'Comandi della proiezione' },
    },
    h(
      'div',
      { class: 'barra-proiezione__riga' },
      h(
        'span',
        { class: 'barra-proiezione__marchio' },
        icona('schermo'),
        h('strong', null, impostazioni.sospesa ? 'In pausa' : 'In proiezione'),
      ),
      // Le frecce accanto alle schede: durante l'ora si passa da una all'altra
      // molte volte, e cercare il nome giusto ogni volta è un gesto in più
      // fatto mentre si parla.
      pulsante({
        simbolo: 'sinistra',
        variante: 'fantasma',
        titolo: 'Scheda precedente',
        disabilitato: impostazioni.blocchi.length < 2,
        al: () => manda({ ...impostazioni, aperto: bloccoScorrendo(impostazioni, -1) }),
      }),
      h('div', { class: 'barra-proiezione__blocchi' }, ...BLOCCHI.map(scheda)),
      pulsante({
        simbolo: 'destra',
        variante: 'fantasma',
        titolo: 'Scheda successiva',
        disabilitato: impostazioni.blocchi.length < 2,
        al: () => manda({ ...impostazioni, aperto: bloccoScorrendo(impostazioni, 1) }),
      }),
      h(
        'div',
        { class: 'barra-proiezione__coda' },
        // I nomi valgono per voti e documenti: l'appello ce li ha per forza —
        // un appello senza nomi non corregge niente — e non li segue.
        pulsante({
          testo: impostazioni.nomi ? 'Nomi visibili' : 'Senza nomi',
          simbolo: 'utente',
          variante: impostazioni.nomi ? 'primario' : 'sottile',
          titolo: 'Se accanto ai voti e ai documenti mancanti compaiono i nomi',
          al: () => manda({ ...impostazioni, nomi: !impostazioni.nomi }),
        }),
        // Stretto di partenza: quel che non sta nella pagina non lo legge
        // nessuno, e davanti a una classe non c'è nessuno che possa scorrere.
        // Si allarga per le aule lunghe, dove le righe da leggere sono poche.
        pulsante({
          testo: impostazioni.compatta ? 'Misure strette' : 'Misure larghe',
          simbolo: impostazioni.compatta ? 'giu' : 'su',
          variante: 'sottile',
          titolo: impostazioni.compatta
            ? 'Caratteri più piccoli: ci sta più roba nella pagina'
            : 'Caratteri più grandi: si legge da più lontano, ma ci sta meno',
          al: () => manda({ ...impostazioni, compatta: !impostazioni.compatta }),
        }),
        // La pausa è il gesto che serve di più: si smette di proiettare senza
        // chiudere niente e senza perdere il posto, e si riprende com'era.
        pulsante({
          testo: impostazioni.sospesa ? 'Riprendi' : 'Pausa',
          simbolo: impostazioni.sospesa ? 'spunta' : 'pausa',
          variante: impostazioni.sospesa ? 'primario' : 'normale',
          titolo: 'Spegne il contenuto lasciando la finestra dov’è',
          al: () => manda({ ...impostazioni, sospesa: !impostazioni.sospesa }),
        }),
        pulsante({
          testo: 'Chiudi',
          simbolo: 'chiudi',
          variante: 'sottile',
          al: () => azione({ tipo: 'proiezione.chiudi' }),
        }),
      ),
    ),
    vistaDelCalendario(impostazioni),
    avvisoRiservato(impostazioni),
  )
}

/** Il pulsante che apre lo schermo: sta in fondo alla barra di navigazione. */
export function pulsanteProiezione (): HTMLElement {
  const aperta = stato.proiezione.aperta
  return pulsante({
    testo: aperta ? 'Schermo acceso' : 'Proietta',
    simbolo: 'schermo',
    variante: aperta ? 'primario' : 'sottile',
    classe: 'pulsante-proiezione',
    titolo: aperta
      ? 'Chiude lo schermo per la classe'
      : 'Apre lo schermo per la classe in una finestra da portare sul proiettore',
    al: () => azione({ tipo: aperta ? 'proiezione.chiudi' : 'proiezione.apri' }),
  })
}
