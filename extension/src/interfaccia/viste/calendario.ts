// Il calendario: settimana, mese, agenda.
//
// La settimana è la vista di lavoro — ci si vede l'orario com'è davvero, pause
// comprese — il mese serve a orientarsi e a spostarsi, l'agenda a leggere di
// fila quel che viene. Sono tre modi di guardare le stesse lezioni, non tre
// schermate diverse: il giorno di riferimento è uno solo e passa da una vista
// all'altra.

import {
  fineLezione,
  inizioLezione,
  lezioniDelGiorno,
  lezioniSovrapposte,
  minutiEffettivi,
  momentoLezione,
  riepilogaPresenze,
  slotSpostati,
} from '../../dominio/calcoli.js'
import { lezioniDellAnno } from '../../dominio/corsi.js'
import {
  GIORNI_BREVI,
  MESI,
  daIso,
  differenzaGiorni,
  formattaData,
  formattaDurata,
  formattaMese,
  giornoDelMese,
  giornoSettimana,
  inizioSettimana,
  minutiDaOra,
  numeroSemestre,
  oggi,
  oraDaMinuti,
  primoDelMese,
  settimanaDi,
  settimanaIso,
  sommaGiorni,
  sommaMesi,
  ultimoDelMese,
} from '../../dominio/date.js'
import { confineAnno, letteraSettimana } from '../../dominio/anni.js'
import type { Iso, LetteraSettimana, Lezione, Semestre } from '../../dominio/modelli.js'
import {
  datoSintetico,
  pastiglia,
  pulsante,
  puntoColore,
  selettore,
  statoVuoto,
  testataVista,
} from '../componenti/base.js'
import { icona } from '../componenti/icone.js'
import { sospensioneDi } from '../../dominio/orario.js'
import { eseguiOAvvisa, selettoreClassi, statoVuotoAnno } from '../componenti/filtri.js'
import { h, type Figlio } from '../dom.js'
import { chiediEliminazione, moduloAssegnaPiano, moduloAvvio, moduloLezione } from '../moduli.js'
import { conferma } from '../componenti/modale.js'
import { menuContestuale, type ElementoMenu } from '../componenti/menu.js'
import { notifica } from '../componenti/notifiche.js'
import { azione } from '../ponte.js'
import {
  aggiorna,
  annoCorrente,
  classiVisibili,
  lezioniInAgenda,
  nomeClasseDiLezione,
  coloreDiLezione,
  pianoPerId,
  semestrePerData,
  titoloDiLezione,
  stato,
} from '../stato.js'

/** Il semestre in cui cade una data, nell'anno in corso: `semestreDi` col registro sotto mano. */
/**
 * Il nome della sospensione che copre un giorno, o stringa vuota.
 *
 * Nel calendario i giorni di chiusura si spengono: non è un abbellimento — è
 * quel che distingue «quel giorno non ho lezione» da «quel giorno mi sono
 * dimenticato di metterla».
 */
function chiusura (data: string): string {
  return sospensioneDi(annoCorrente(), data)?.etichetta ?? ''
}

/** Altezza minima di un minuto nella griglia settimanale. Sotto 1.1 le ore si schiacciano. */
const PIXEL_PER_MINUTO = 1.15
/** Oltre questo la griglia diventa un francobollo dilatato: le lezioni corte non servono a nulla. */
const PIXEL_PER_MINUTO_MAX = 2.6
/** Altezza a cui mira il corpo della settimana quando le lezioni ne occupano poca. */
const ALTEZZA_IDEALE = 620
/** Sotto tre ore la griglia non si legge più: si tiene comunque questa finestra. */
const FASCIA_MINIMA = 180

/** La fascia oraria da disegnare: quella delle lezioni della settimana, non quella teorica. */
function fasciaSettimana (giorni: Iso[], lezioni: Lezione[]): { primaOra: number, ultimaOra: number, scala: number } {
  const impostazioni = stato.registro.impostazioni
  const confInizio = minutiDaOra(impostazioni.oraInizioGiornata)
  const confFine = minutiDaOra(impostazioni.oraFineGiornata)

  // Le ore configurate restano il riferimento quando non c'e' niente da mostrare;
  // appena ci sono lezioni comandano loro, anche se sforano la giornata teorica.
  let inizio: number | null = null
  let fine: number | null = null
  for (const data of giorni) {
    for (const lezione of lezioniDelGiorno(lezioni, data)) {
      const da = inizioLezione(lezione)
      const a = fineLezione(lezione)
      if (!da || !a) continue
      const minutiDa = minutiDaOra(da)
      const minutiA = minutiDaOra(a)
      inizio = inizio === null ? minutiDa : Math.min(inizio, minutiDa)
      fine = fine === null ? minutiA : Math.max(fine, minutiA)
    }
  }

  let primaOra = inizio === null ? confInizio : Math.floor(inizio / 60) * 60
  let ultimaOra = fine === null ? confFine : Math.ceil(fine / 60) * 60

  // Un'ora d'aria sopra e sotto: serve per aggiungere una lezione prima o dopo
  // quelle che ci sono, senza dover cambiare le impostazioni.
  if (inizio !== null) {
    primaOra = Math.max(0, primaOra - 60)
    ultimaOra = Math.min(24 * 60, ultimaOra + 60)
  }

  if (ultimaOra - primaOra < FASCIA_MINIMA) ultimaOra = Math.min(24 * 60, primaOra + FASCIA_MINIMA)
  if (ultimaOra - primaOra < FASCIA_MINIMA) primaOra = Math.max(0, ultimaOra - FASCIA_MINIMA)

  const durata = Math.max(1, ultimaOra - primaOra)
  const scala = Math.min(PIXEL_PER_MINUTO_MAX, Math.max(PIXEL_PER_MINUTO, ALTEZZA_IDEALE / durata))

  return { primaOra, ultimaOra, scala }
}

function apriLezione (lezione: Lezione): void {
  aggiorna({ vista: 'lezione', lezioneId: lezione.id, data: lezione.data })
}

// ------------------------------------------------------------------ trascinamento

/*
 * Spostare e copiare le lezioni prendendole con il mouse.
 *
 * L'orario vero non è mai quello generato: una lezione salta, una si recupera
 * il giovedì, una si sdoppia perché la classe è divisa. Finora ogni ritocco
 * voleva aprire un modulo e ribattere una data; qui si prende il blocco e lo si
 * porta dove va, che è il gesto che si farebbe su un'agenda di carta.
 *
 * Trascinando si sposta; tenendo premuto Ctrl (o Alt) si copia — la copia porta
 * con sé la scaletta e l'aula, non l'appello né il consuntivo, perché quelli
 * appartengono all'ora che si è svolta e non a quella che si sta preparando.
 *
 * Il quarto d'ora è la griglia su cui tutto si posa: nessuna scuola comincia
 * alle 08:23, e senza aggancio il trascinamento produce orari che poi si
 * correggono a mano.
 */

/** Il minuto su cui si posa quel che si trascina: multipli di cinque. */
const AGGANCIO_MINUTI = 5

/**
 * La lezione che si sta trascinando. Serve perché `dragover` non può leggere il
 * contenuto del trasferimento — il browser lo nasconde finché non si molla — e
 * senza non si saprebbe che cosa disegnare sotto il puntatore.
 */
let trascinata: Lezione | null = null

/** Copia invece di spostare: è il modificatore che tutti provano per primo. */
function vuoleCopiare (evento: DragEvent | MouseEvent): boolean {
  return evento.ctrlKey || evento.altKey || evento.metaKey
}

/** Rende un blocco afferrabile. Il resto — dove si posa — lo sanno le colonne. */
function rendiTrascinabile (elemento: HTMLElement, lezione: Lezione): void {
  elemento.draggable = true
  elemento.addEventListener('dragstart', (evento: DragEvent) => {
    trascinata = lezione
    elemento.classList.add('blocco--in-viaggio')
    if (!evento.dataTransfer) return
    evento.dataTransfer.effectAllowed = 'copyMove'
    // Un contenuto ci vuole comunque, o Firefox non fa partire il trascinamento.
    evento.dataTransfer.setData('text/plain', lezione.id)
  })
  elemento.addEventListener('dragend', () => {
    trascinata = null
    elemento.classList.remove('blocco--in-viaggio')
    for (const guida of document.querySelectorAll('.settimana__guida')) guida.remove()
    for (const zona of document.querySelectorAll('.zona-posa')) {
      zona.classList.remove('zona-posa')
    }
  })
}

/** Porta la lezione dove la si è lasciata: stesso giorno diverso, o copia. */
async function posa (lezione: Lezione, data: Iso, inizio: string | undefined, copia: boolean): Promise<void> {
  // Due lezioni alla stessa ora si possono anche volere — una classe divisa in
  // due gruppi, una compresenza — quindi non si rifiuta: si dice e si va avanti.
  // Ma senza dirlo il blocco finirebbe nascosto sotto un altro, e la
  // sovrapposizione si scoprirebbe il giorno stesso.
  const proposta: Lezione = {
    ...lezione,
    data,
    slot: inizio ? slotSpostati(lezione.slot, inizio) : lezione.slot,
  }
  // Tutte le lezioni dell'anno, non solo quelle visibili: col filtro classe
  // attivo `lezioniInAgenda()` non vede il conflitto con un'altra classe, e lo
  // scontro compare solo togliendo il filtro — quando è troppo tardi.
  const scontri = lezioniSovrapposte(lezioniDellAnno(stato.registro, annoCorrente()?.id ?? null), proposta)

  // Il rifiuto lo dice `azione`: qui basta non raccontare uno spostamento che
  // non c'e' stato.
  const risposta = await azione(
    copia
      ? { tipo: 'lezione.duplica', lezioneId: lezione.id, data, ...(inizio ? { inizio } : {}) }
      : { tipo: 'lezione.sposta', lezioneId: lezione.id, data, ...(inizio ? { inizio } : {}) },
  )
  if (!risposta.ok) return
  const quando = `${formattaData(data, 'giorno')}${inizio ? ` alle ${inizio}` : ''}`
  if (scontri.length > 0) {
    notifica(
      `${copia ? 'Copiata' : 'Spostata'} al ${quando}, sopra ${scontri
        .map((l) => nomeClasseDiLezione(l))
        .join(', ')}.`,
      'avviso',
    )
  } else {
    notifica(copia ? `Copiata al ${quando}.` : `Spostata al ${quando}.`, 'successo')
  }
  // Si resta nel calendario. Chi copia sta riempiendo la settimana e ne copierà
  // un'altra subito dopo: aprire la copia gli toglierebbe di mano la griglia
  // proprio nel gesto in cui la sta usando. La copia è lì, si apre se serve.
}

/**
 * La riga che mostra dove finirà la lezione, dentro la colonna sorvolata.
 * Vive fuori dal ciclo di ridisegno: nasce e muore con il trascinamento.
 */
function guida (colonna: HTMLElement, alto: number, copia: boolean): void {
  let riga = colonna.querySelector<HTMLElement>('.settimana__guida')
  if (!riga) {
    riga = h('span', { class: 'settimana__guida' })
    colonna.appendChild(riga)
  }
  riga.style.top = `${alto}px`
  riga.classList.toggle('settimana__guida--copia', copia)
}

/** Sabato e domenica: giorni veri, ma non giorni di scuola. */
function festivo (data: Iso): boolean {
  return giornoSettimana(data) >= 6
}

/**
 * Il semestre che comincia proprio in questo giorno, se ce n'è uno.
 *
 * Il cambio di semestre non è scritto su nessuna lezione — il semestre di una
 * valutazione è quello in cui cade la sua data, e si ricava ogni volta — ma è
 * la riga più importante dell'anno: di là dal confine le medie ripartono, e una
 * verifica messa il giorno prima o il giorno dopo finisce in due pagelle
 * diverse. Nel calendario deve vedersi, o lo si scopre a gennaio inoltrato.
 */
function apreSemestre (data: Iso): Semestre | null {
  return annoCorrente()?.semestri.find((semestre) => semestre.inizio === data) ?? null
}

/** Il semestre che finisce proprio in questo giorno, se ce n'è uno. */
function chiudeSemestre (data: Iso): Semestre | null {
  return annoCorrente()?.semestri.find((semestre) => semestre.fine === data) ?? null
}

/**
 * Il segno del confine, da mettere accanto al numero del giorno.
 *
 * Sta nella cella e non in una banda sopra la settimana perché è di quel
 * giorno che si parla: guardando il 31 gennaio si deve leggere lì che il primo
 * semestre finisce, senza cercare l'informazione da un'altra parte della
 * schermata. In rosso, come tutto quel che nel registro vuol dire «attenzione
 * alla data»: di là dal confine le medie ripartono, e una verifica messa il
 * giorno prima o il giorno dopo finisce in due pagelle diverse.
 */
function segnoSemestre (data: Iso, classe = 'segno-semestre'): Figlio {
  const apre = apreSemestre(data)
  const chiude = chiudeSemestre(data)
  if (!apre && !chiude) return null

  // Un giorno può essere l'ultimo di un semestre e il primo del successivo solo
  // in dati scritti a mano: si dicono tutte e due, invece di sceglierne una.
  const voci = [
    chiude ? { testo: `fine ${numeroSemestre(chiude)}`, lungo: `finisce il ${chiude.etichetta}` } : null,
    apre ? { testo: `inizio ${numeroSemestre(apre)}`, lungo: `comincia il ${apre.etichetta}` } : null,
  ].filter((v): v is { testo: string, lungo: string } => v !== null)

  return h(
    'span',
    { class: classe, attr: { title: voci.map((v) => v.lungo).join(' · ') } },
    voci.map((v) => v.testo).join(' · '),
  )
}

/** «1°», «2°»: nella cella non c'è spazio per l'etichetta intera. */
function giorniVisibili (): number[] {
  const configurati = stato.registro.impostazioni.giorniVisibili
  return configurati.length > 0 ? [...configurati].sort((a, b) => a - b) : [1, 2, 3, 4, 5]
}

// ------------------------------------------------------------------ menu

/**
 * Quel che si può fare a una lezione senza aprirla.
 *
 * Guardando la settimana si vede che cosa c'è che non va — un'ora da segnare
 * svolta, una saltata da annullare, una da ripetere la settimana dopo, una
 * messa lì per sbaglio — e il gesto giusto è agire lì, non aprire la lezione,
 * fare una cosa e tornare indietro. Le voci sono le stesse della sua scheda,
 * perché due elenchi diversi per le stesse azioni sono due posti in cui
 * dimenticarsene una.
 */
function menuLezione (evento: MouseEvent, lezione: Lezione): void {
  const piano = pianoPerId(lezione.pianoId)

  const cambiaStato = async (nuovo: Lezione['stato'], messaggio: string) => {
    const risposta = await azione({ tipo: 'lezione.stato', lezioneId: lezione.id, stato: nuovo })
    if (!risposta.ok) return
    notifica(messaggio, nuovo === 'annullata' ? 'avviso' : 'successo')
  }

  const voci: ElementoMenu[] = [
    { testo: 'Apri la lezione', simbolo: 'destra', al: () => apriLezione(lezione) },
    { testo: 'Modifica', simbolo: 'matita', al: () => moduloLezione({ lezione }) },
    'separatore',
    lezione.stato === 'svolta'
      ? {
          testo: 'Riporta a pianificata',
          simbolo: 'orologio',
          al: () => void cambiaStato('pianificata', 'Lezione riportata a pianificata.'),
        }
      : {
          testo: 'Segna come svolta',
          simbolo: 'spunta',
          al: () => void cambiaStato('svolta', 'Lezione segnata come svolta.'),
        },
    lezione.stato === 'annullata'
      ? {
          testo: 'Non è più annullata',
          simbolo: 'ricarica',
          al: () => void cambiaStato('pianificata', 'Lezione ripristinata.'),
        }
      : {
          testo: 'Annulla la lezione',
          simbolo: 'chiudi',
          al: async () => {
            // Annullare non è eliminare, e conviene dirlo: la lezione resta nel
            // registro con dentro quel che c'era, segnata come non svolta.
            const sicuro = await conferma({
              titolo: 'Annullare la lezione?',
              testo:
                'Resta nel registro, segnata come non svolta. I dati già inseriti non si perdono.',
              testoConferma: 'Annulla la lezione',
            })
            if (sicuro) await cambiaStato('annullata', 'Lezione annullata.')
          },
        },
    'separatore',
    // Il piano è solidale con la lezione: la segue quando si sposta e quando si
    // copia, e va potuto toccare da dove la si guarda. Vederne il titolo sul
    // blocco e dover aprire la lezione per cambiarlo era mezzo collegamento.
    piano
      ? {
          testo: 'Apri il piano della lezione',
          simbolo: 'piano',
          al: () => aggiorna({ vista: 'piani', pianoId: piano.id }),
        }
      : {
          testo: 'Assegna un piano lezione',
          simbolo: 'piano',
          al: () => moduloAssegnaPiano(lezione),
        },
    piano
      ? {
          testo: 'Cambia piano',
          simbolo: 'ricarica',
          al: () => moduloAssegnaPiano(lezione),
        }
      : 'separatore',
    piano
      ? {
          testo: 'Togli il piano',
          simbolo: 'chiudi',
          al: async () => {
            // Togliere il piano azzera le spunte: si riferivano alle sue
            // attività, e senza di lui sarebbero righe che non esistono più.
            const sicuro =
              lezione.avanzamento.length === 0 ||
              (await conferma({
                titolo: 'Togliere il piano?',
                testo: 'Le spunte già messe sulle attività se ne vanno con lui.',
                testoConferma: 'Togli',
              }))
            if (!sicuro) return
            await eseguiOAvvisa({ tipo: 'piano.assegna', lezioneId: lezione.id, pianoId: null }, 'Piano tolto dalla lezione.')
          },
        }
      : 'separatore',
    'separatore',
    {
      // Una lezione si ripete ogni settimana: è la copia che si fa davvero.
      testo: 'Copia alla settimana prossima',
      simbolo: 'duplica',
      al: () => void posa(lezione, sommaGiorni(lezione.data, 7), undefined, true),
    },
    'separatore',
    {
      testo: 'Elimina',
      simbolo: 'cestino',
      pericolo: true,
      al: async () => {
        if (!(await chiediEliminazione({ genere: 'lezione', id: lezione.id }))) return
        const risposta = await eseguiOAvvisa({ tipo: 'lezione.elimina', lezioneId: lezione.id }, 'Lezione eliminata.')
        // Se si stava guardando proprio quella, si torna al calendario.
        if (risposta.ok && stato.lezioneId === lezione.id) aggiorna({ vista: 'calendario', lezioneId: null })
      },
    },
  ]

  menuContestuale(evento, voci)
}

/** Il menu del vuoto: lì non c'è una lezione, ma ci si può metterne una. */
function menuGiorno (evento: MouseEvent, data: Iso, oraProposta?: string): void {
  menuContestuale(evento, [
    {
      testo: oraProposta ? `Nuova lezione alle ${oraProposta}` : 'Nuova lezione in questo giorno',
      simbolo: 'piu',
      al: () =>
        moduloLezione({
          data,
          classeId: stato.filtroClasseAgendaId ?? undefined,
          ...(oraProposta ? { oraProposta } : {}),
          dopo: (lezioneId) => aggiorna({ vista: 'lezione', lezioneId }),
        }),
    },
    {
      testo: 'Vai a questo giorno',
      simbolo: 'calendario',
      al: () => aggiorna({ data, modoCalendario: 'settimana' }),
    },
  ])
}

// ------------------------------------------------------------------ blocchi

/** Il rettangolo di una lezione nella griglia della settimana. */
function bloccoLezione (lezione: Lezione, minutiPrimaOra: number, scala: number): HTMLElement {
  const inizio = inizioLezione(lezione)
  const fine = fineLezione(lezione)
  if (!inizio || !fine) return h('div')

  const alto = (minutiDaOra(inizio) - minutiPrimaOra) * scala
  const altezza = Math.max(22, (minutiDaOra(fine) - minutiDaOra(inizio)) * scala)
  const colore = coloreDiLezione(lezione)
  const riepilogo = riepilogaPresenze(lezione.presenze)
  const momento = momentoLezione(lezione, stato.adessoData, stato.adessoOra)

  const blocco = h(
    'button',
    {
      class: [
        momento === 'in-corso' && 'blocco--adesso',
        momento === 'passata' && 'blocco--passata',
        'blocco',
        `blocco--${lezione.stato}`,
        altezza < 46 && 'blocco--basso',
      ],
      type: 'button',
      style: {
        top: `${alto}px`,
        height: `${altezza}px`,
        borderLeftColor: colore,
        // Tinta appena accennata: la colonna deve restare leggibile.
        backgroundColor: `color-mix(in srgb, ${colore} 14%, transparent)`,
      },
      attr: {
        title: `${nomeClasseDiLezione(lezione)} ${inizio}–${fine}${
          titoloDiLezione(lezione) ? ` · ${titoloDiLezione(lezione)}` : ''
        }`,
      },
      onclick: () => apriLezione(lezione),
      oncontextmenu: (evento: MouseEvent) => menuLezione(evento, lezione),
    },
    // Le pause si vedono come tagli chiari dentro il blocco: la lezione resta
    // una, ma l'orario reale si legge a colpo d'occhio.
    lezione.slot
      .filter((s) => s.tipo === 'pausa')
      .map((pausa) =>
        h('span', {
          class: 'blocco__pausa',
          style: {
            top: `${(minutiDaOra(pausa.inizio) - minutiDaOra(inizio)) * scala}px`,
            height: `${(minutiDaOra(pausa.fine) - minutiDaOra(pausa.inizio)) * scala}px`,
          },
        }),
      ),
    h(
      'span',
      { class: 'blocco__testata' },
      h('span', { class: 'blocco__ora' }, inizio),
      h('span', { class: 'blocco__classe' }, nomeClasseDiLezione(lezione)),
    ),
    altezza >= 46 && titoloDiLezione(lezione)
      ? h('span', { class: 'blocco__titolo' }, titoloDiLezione(lezione))
      : null,
    altezza >= 64
      ? h(
          'span',
          { class: 'blocco__piede' },
          lezione.stato === 'svolta' && riepilogo.udTotali > 0
            ? h('span', { class: 'blocco__presenze' }, `${riepilogo.presenti}/${riepilogo.totale - riepilogo.senzaAppello}`)
            : null,
          lezione.pianoId ? icona('piano', 'icona--minuta') : null,
          lezione.osservazioni.length > 0
            ? h('span', { class: 'blocco__note' }, String(lezione.osservazioni.length))
            : null,
        )
      : null,
  )

  rendiTrascinabile(blocco, lezione)
  return blocco
}

/** La pastiglia di una lezione nelle celle del mese. */
function chipLezione (lezione: Lezione): HTMLElement {
  const inizio = inizioLezione(lezione)
  const chip = h(
    'button',
    {
      class: ['chip', `chip--${lezione.stato}`],
      type: 'button',
      style: { borderLeftColor: coloreDiLezione(lezione) },
      attr: { title: `${inizio ?? ''} ${nomeClasseDiLezione(lezione)} ${titoloDiLezione(lezione)}`.trim() },
      onclick: (evento: MouseEvent) => {
        evento.stopPropagation()
        apriLezione(lezione)
      },
      oncontextmenu: (evento: MouseEvent) => menuLezione(evento, lezione),
    },
    h('span', { class: 'chip__ora' }, inizio ?? ''),
    h('span', { class: 'chip__testo' }, nomeClasseDiLezione(lezione)),
  )

  rendiTrascinabile(chip, lezione)
  return chip
}

// ------------------------------------------------------------------ settimana

/**
 * Tutte le settimane dell'anno scolastico, in fila sopra la settimana aperta.
 *
 * Serve a una domanda che il calendario non sapeva rispondere: «quante
 * settimane ho ancora, e quali sono già piene?». Scorrendo la vista settimana
 * una alla volta la si ricostruiva a memoria, e a memoria non torna mai —
 * soprattutto verso la fine, quando bisogna decidere che cosa ci sta ancora.
 *
 * Ci sono tutte, anche quelle vuote: sono la parte che conta. Una settimana
 * senza lezioni è un buco da riempire o una pausa da ricordare, e una striscia
 * che mostrasse solo quelle piene direbbe che l'anno è pieno.
 *
 * Il confine fra i semestri si vede da qui: è la riga più importante
 * dell'anno, perché di là le medie ripartono.
 */
function strisciaSettimane (): Figlio {
  const anno = annoCorrente()
  if (!anno) return null

  const lezioni = lezioniInAgenda()
  const quante = new Map<Iso, number>()
  for (const lezione of lezioni) {
    const lunedi = inizioSettimana(lezione.data)
    quante.set(lunedi, (quante.get(lunedi) ?? 0) + 1)
  }

  const corrente = inizioSettimana(stato.data)
  const ultima = inizioSettimana(anno.fine)
  const voci: Figlio[] = []

  for (let lunedi = inizioSettimana(anno.inizio); lunedi <= ultima; lunedi = sommaGiorni(lunedi, 7)) {
    const giorni = settimanaDi(lunedi)
    const conta = quante.get(lunedi) ?? 0
    // La settimana in cui un semestre comincia porta il confine: si segna a
    // sinistra del numero, che è il verso in cui la striscia si legge.
    const apre = giorni.map(apreSemestre).find(Boolean) ?? null
    const sospesa = giorni.every((g) => festivo(g) || chiusura(g))
    const lettera = letteraDi(lunedi)

    voci.push(
      h(
        'button',
        {
          class: [
            'striscia-settimane__voce',
            conta > 0 ? 'striscia-settimane__voce--piena' : 'striscia-settimane__voce--vuota',
            lunedi === corrente && 'striscia-settimane__voce--corrente',
            sospesa && 'striscia-settimane__voce--sospesa',
            apre && 'striscia-settimane__voce--apre-semestre',
          ],
          type: 'button',
          attr: {
            title: [
              `Settimana ${settimanaIso(lunedi)} · ${formattaData(lunedi)}–${formattaData(giorni[6])}`,
              conta > 0 ? `${conta} ${conta === 1 ? 'lezione' : 'lezioni'}` : 'nessuna lezione',
              lettera ? `settimana ${lettera}` : null,
              apre ? `comincia il ${apre.etichetta}` : null,
            ]
              .filter(Boolean)
              .join(' · '),
            'aria-current': lunedi === corrente ? 'true' : null,
          },
          onclick: () => aggiorna({ data: lunedi }),
        },
        h('span', { class: 'striscia-settimane__numero' }, String(settimanaIso(lunedi))),
        // La lettera, dove c'è: nella striscia si legge di sola lettura — si
        // mette e si toglie dall'angolo della settimana aperta — ed è quel che
        // serve per vedere in un colpo d'occhio se l'alternanza regge.
        lettera ? h('span', { class: 'striscia-settimane__lettera' }, lettera) : null,
        // Quante lezioni ci cadono: il numero, non un pallino. Tre e undici
        // sono due settimane diverse, e un pallino le direbbe uguali.
        h('span', { class: 'striscia-settimane__conta' }, conta > 0 ? String(conta) : '·'),
      ),
    )
  }

  const piene = [...quante.values()].filter((n) => n > 0).length
  return h(
    'div',
    { class: 'striscia-settimane' },
    h(
      'div',
      { class: 'striscia-settimane__testata' },
      h('span', null, `Settimane dell’anno · ${piene} su ${voci.length} con lezioni`),
    ),
    h('div', { class: 'striscia-settimane__voci' }, ...voci),
  )
}

// -------------------------------------------------------------- settimane A e B

/**
 * Che settimana è quella in cui cade un giorno: A, B, o nessuna delle due.
 *
 * Qui la lettera si legge e basta. Si mette dalle **Impostazioni**, dove le
 * settimane dell'anno stanno tutte in fila: si marcano una volta, quando
 * arriva l'orario, e in fila si vede a colpo d'occhio dove l'alternanza salta.
 * Marcarle dal calendario voleva dire aprire quaranta settimane una per una,
 * perdendo ogni volta di vista il disegno d'insieme — che è la sola cosa che
 * di quelle lettere interessa.
 */
function letteraDi (giorno: Iso): LetteraSettimana | null {
  return letteraSettimana(annoCorrente(), giorno)
}

function vistaSettimana (): HTMLElement {
  const giorni = settimanaDi(stato.data).filter((data) =>
    giorniVisibili().includes(giornoSettimana(data)),
  )
  const lezioni = lezioniInAgenda()
  const { primaOra, ultimaOra, scala } = fasciaSettimana(giorni, lezioni)
  const altezza = Math.max(240, (ultimaOra - primaOra) * scala)

  const orePiene: number[] = []
  for (let minuto = Math.ceil(primaOra / 60) * 60; minuto <= ultimaOra; minuto += 60) {
    orePiene.push(minuto)
  }

  return h(
    'div',
    { class: 'settimana' },
    strisciaSettimane(),
    h(
      'div',
      { class: 'settimana__intestazione' },
      h(
        'div',
        { class: 'settimana__angolo' },
        h('span', null, `s. ${settimanaIso(stato.data)}`),
        letteraDi(stato.data)
          ? h(
              'span',
              {
                class: 'settimana__lettera',
                attr: { title: 'Si cambia dalle Impostazioni, con tutte le settimane in fila' },
              },
              letteraDi(stato.data) as string,
            )
          : null,
      ),
      ...giorni.map((data) =>
        h(
          'div',
          {
            class: [
              'settimana__giorno',
              data === oggi() && 'settimana__giorno--oggi',
              festivo(data) && 'giorno--festivo',
              chiusura(data) && 'giorno--chiuso',
              apreSemestre(data) && 'giorno--apre-semestre',
              chiudeSemestre(data) && 'giorno--chiude-semestre',
            ],
            attr: { title: chiusura(data) || null },
            onclick: () => aggiorna({ data }),
          },
          h('span', { class: 'settimana__giorno-nome' }, GIORNI_BREVI[giornoSettimana(data) - 1]),
          h('span', { class: 'settimana__giorno-numero' }, String(giornoDelMese(data))),
          segnoSemestre(data, 'settimana__semestre'),
        ),
      ),
    ),
    h(
      'div',
      { class: 'settimana__corpo', style: { height: `${altezza}px` } },
      h(
        'div',
        { class: 'settimana__ore' },
        ...orePiene.map((minuto) =>
          h(
            'div',
            {
              class: 'settimana__ora',
              style: { top: `${(minuto - primaOra) * scala}px` },
            },
            oraDaMinuti(minuto),
          ),
        ),
      ),
      ...giorni.map((data) => {
        /** L'ora su cui cade il puntatore dentro questa colonna. */
        const oraSotto = (colonna: HTMLElement, clientY: number, passo: number): number => {
          const y = clientY - colonna.getBoundingClientRect().top
          const minuti = primaOra + Math.round(y / scala / passo) * passo
          return Math.max(primaOra, Math.min(minuti, ultimaOra - 5))
        }

        return h(
          'div',
          {
            class: [
              'settimana__colonna',
              data === oggi() && 'settimana__colonna--oggi',
              festivo(data) && 'giorno--festivo',
              apreSemestre(data) && 'giorno--apre-semestre',
              chiudeSemestre(data) && 'giorno--chiude-semestre',
            ],
            // Un clic sul vuoto crea una lezione lì: l'ora si ricava da dove si
            // è cliccato, arrotondata al quarto.
            onclick: (evento: MouseEvent) => {
              const bersaglio = evento.currentTarget as HTMLElement
              if (evento.target !== bersaglio) return
              const minuti = oraSotto(bersaglio, evento.clientY, 15)
              moduloLezione({
                data,
                classeId: stato.filtroClasseAgendaId ?? undefined,
                oraProposta: oraDaMinuti(Math.min(minuti, ultimaOra - 45)),
                dopo: (lezioneId) => aggiorna({ vista: 'lezione', lezioneId }),
              })
            },
            // La colonna è la zona di posa: accetta il blocco e mostra dove
            // finirebbe, minuto per minuto, mentre lo si tiene sospeso.
            ondragover: (evento: DragEvent) => {
              if (!trascinata) return
              evento.preventDefault()
              const colonna = evento.currentTarget as HTMLElement
              const copia = vuoleCopiare(evento)
              if (evento.dataTransfer) evento.dataTransfer.dropEffect = copia ? 'copy' : 'move'
              colonna.classList.add('zona-posa')
              guida(colonna, (oraSotto(colonna, evento.clientY, AGGANCIO_MINUTI) - primaOra) * scala, copia)
            },
            ondragleave: (evento: DragEvent) => {
              const colonna = evento.currentTarget as HTMLElement
              // `dragleave` scatta anche passando sopra un figlio: si sgombra
              // solo quando si è usciti davvero dal rettangolo della colonna.
              if (colonna.contains(evento.relatedTarget as Node | null)) return
              colonna.classList.remove('zona-posa')
              colonna.querySelector('.settimana__guida')?.remove()
            },
            ondrop: (evento: DragEvent) => {
              if (!trascinata) return
              evento.preventDefault()
              const colonna = evento.currentTarget as HTMLElement
              const minuti = oraSotto(colonna, evento.clientY, AGGANCIO_MINUTI)
              void posa(trascinata, data, oraDaMinuti(minuti), vuoleCopiare(evento))
            },
            // Sul vuoto il tasto destro propone l'ora su cui è caduto: è la
            // stessa cosa del clic, detta senza doverla indovinare.
            oncontextmenu: (evento: MouseEvent) => {
              const colonna = evento.currentTarget as HTMLElement
              if (evento.target !== colonna) return
              menuGiorno(evento, data, oraDaMinuti(oraSotto(colonna, evento.clientY, 15)))
            },
          },
          ...orePiene.map((minuto) =>
            h('div', {
              class: 'settimana__riga-ora',
              style: { top: `${(minuto - primaOra) * scala}px` },
            }),
          ),
          // La riga di adesso, solo nella colonna di oggi. Dice a colpo d'occhio
          // se l'ora che si sta guardando è passata, è in corso o deve venire —
          // e si muove da sola, perché lo stato porta l'orologio.
          data === stato.adessoData &&
          minutiDaOra(stato.adessoOra) >= primaOra &&
          minutiDaOra(stato.adessoOra) <= ultimaOra
            ? h('div', {
                class: 'settimana__adesso',
                attr: { title: `adesso, ${stato.adessoOra}` },
                style: { top: `${(minutiDaOra(stato.adessoOra) - primaOra) * scala}px` },
              })
            : null,
          ...lezioniDelGiorno(lezioni, data).map((lezione) => bloccoLezione(lezione, primaOra, scala)),
        )
      }),
    ),
  )
}

// ------------------------------------------------------------------ mese

/*
 * Il mese non finisce: si continua a scorrere.
 *
 * La griglia si fermava al 31 e per vedere il lunedì dopo bisognava premere una
 * freccia — ma un anno scolastico non è fatto di mesi, è fatto di settimane che
 * si susseguono, e il pezzo che serve guardare sta quasi sempre a cavallo di
 * due mesi: l'ultima settimana di ottobre e la prima di novembre sono la stessa
 * cosa per chi programma. Qui le settimane sono una striscia sola, e scorrendo
 * si va avanti e indietro senza confini: quando ci si avvicina a un capo, la
 * striscia si allunga da sé.
 *
 * Il nome del mese resta appiccicato in alto mentre le sue settimane scorrono
 * sotto, così non si perde mai il segno di dove si è.
 */

/** Quante settimane si disegnano di slancio, prima e dopo il giorno scelto. */
const SETTIMANE_ATTORNO = 8
/** Quante se ne aggiungono ogni volta che lo scorrimento arriva a un capo. */
const SETTIMANE_IN_PIU = 8
/** A che distanza da un capo si comincia ad allungare: prima che il vuoto si veda. */
const SOGLIA_ALLUNGA = 400

/**
 * Dove si era arrivati a scorrere. Il pannello ridisegna la vista intera a ogni
 * modifica dello stato — una lezione trascinata, un appello salvato — e senza
 * questo la striscia tornerebbe ogni volta al punto di partenza, proprio mentre
 * si sta lavorando due mesi più in là.
 */
const finestraMese: { ancora: Iso | null, su: number, giu: number, scorrimento: number } = {
  ancora: null,
  su: SETTIMANE_ATTORNO,
  giu: SETTIMANE_ATTORNO,
  scorrimento: 0,
}

/**
 * Dice alla striscia dei mesi di riportarsi sul giorno scelto al prossimo
 * disegno, invece di riprendere da dove si era arrivati a scorrere.
 *
 * Serve perché lo scorrimento è memoria dell'occhio, non dello stato: si scorre
 * due mesi più in là senza toccare nessuna cella, e il giorno scelto resta
 * quello di prima. «Oggi» in quel momento non cambierebbe niente da ricordare,
 * e il pulsante sembrerebbe rotto.
 */
function ricentraMese (): void {
  finestraMese.scorrimento = -1
}

function vistaMese (): HTMLElement {
  const lezioni = lezioniInAgenda()
  const visibili = giorniVisibili()
  // La prima colonna è il numero della settimana: il piano annuale si conta in
  // settimane, e senza quel numero il mese dice quando ma non «a che punto».
  const colonne = `2.4rem repeat(${visibili.length}, 1fr)`
  // La striscia scorre, ma dentro l'anno scolastico: fuori non ci sono classi,
  // non ci sono lezioni e non ce ne possono essere — scorrere all'infinito
  // dentro il vuoto fa solo credere di essersi persi. Ai due capi la striscia
  // finisce, e lo dice.
  const anno = annoCorrente()
  const primaSettimana = anno ? inizioSettimana(anno.inizio) : null
  const ultimaSettimana = anno ? inizioSettimana(anno.fine) : null
  const dentroLAnno = (lunedi: Iso): boolean =>
    (!primaSettimana || lunedi >= primaSettimana) && (!ultimaSettimana || lunedi <= ultimaSettimana)

  // Un giorno scelto fuori dall'anno — ci si arriva dalle frecce, o da un anno
  // cambiato sotto — si riporta al capo più vicino: meglio la prima settimana
  // di settembre che una striscia di una riga sola in mezzo al nulla.
  const scelta = inizioSettimana(stato.data)
  const ancora =
    primaSettimana && scelta < primaSettimana
      ? primaSettimana
      : ultimaSettimana && scelta > ultimaSettimana
        ? ultimaSettimana
        : scelta

  // Cambiare giorno rimette la striscia attorno a quello: se invece è lo stesso
  // di prima — un salvataggio, un trascinamento — si riprende dove si era.
  if (finestraMese.ancora !== ancora) {
    finestraMese.ancora = ancora
    finestraMese.su = SETTIMANE_ATTORNO
    finestraMese.giu = SETTIMANE_ATTORNO
    finestraMese.scorrimento = -1
  }

  const cella = (data: Iso): HTMLElement => {
    const delGiorno = lezioniDelGiorno(lezioni, data)
    const primoDelSuoMese = giornoDelMese(data) === 1

    return h(
      'div',
      {
        class: [
          'mese__cella',
          // In una striscia continua non esiste un «fuori dal mese»: ogni cella
          // è un giorno vero. Il confine lo segna il primo del mese, che si
          // marca da sé invece di spegnere le settimane accanto.
          primoDelSuoMese && 'mese__cella--apre-mese',
          data === oggi() && 'mese__cella--oggi',
          festivo(data) && 'giorno--festivo',
          apreSemestre(data) && 'giorno--apre-semestre',
          chiudeSemestre(data) && 'giorno--chiude-semestre',
          data === stato.data && 'mese__cella--scelta',
          chiusura(data) && 'giorno--chiuso',
        ],
        attr: { title: chiusura(data) || null },
        ondblclick: () => moduloLezione({ data, dopo: (id) => aggiorna({ vista: 'lezione', lezioneId: id }) }),
        onclick: () => aggiorna({ data }),
        // Nel mese si sposta di giorno, non di ora: la cella non ha
        // un'altezza che voglia dire qualcosa, e l'ora resta quella.
        ondragover: (evento: DragEvent) => {
          if (!trascinata) return
          evento.preventDefault()
          const copia = vuoleCopiare(evento)
          if (evento.dataTransfer) evento.dataTransfer.dropEffect = copia ? 'copy' : 'move'
          ;(evento.currentTarget as HTMLElement).classList.add('zona-posa')
        },
        ondragleave: (evento: DragEvent) => {
          const cellaViva = evento.currentTarget as HTMLElement
          if (cellaViva.contains(evento.relatedTarget as Node | null)) return
          cellaViva.classList.remove('zona-posa')
        },
        ondrop: (evento: DragEvent) => {
          if (!trascinata) return
          evento.preventDefault()
          void posa(trascinata, data, undefined, vuoleCopiare(evento))
        },
        oncontextmenu: (evento: MouseEvent) => menuGiorno(evento, data),
      },
      h(
        'div',
        { class: 'mese__numero' },
        // Il primo del mese si dice per esteso: in una striscia senza fine è
        // l'unico modo di sapere dove comincia quel che si sta guardando.
        primoDelSuoMese ? `1 ${MESI[daIso(data).getUTCMonth()].slice(0, 3)}` : String(giornoDelMese(data)),
        segnoSemestre(data),
        delGiorno.length > 0
          ? h('span', { class: 'mese__conteggio' }, String(delGiorno.length))
          : null,
      ),
      h('div', { class: 'mese__lezioni' }, ...delGiorno.slice(0, 4).map(chipLezione)),
      delGiorno.length > 4 ? h('div', { class: 'mese__altre' }, `+${delGiorno.length - 4}`) : null,
    )
  }

  /** Una settimana intera: la riga di cui è fatta la striscia. */
  const rigaSettimana = (lunedi: Iso): HTMLElement =>
    h(
      'div',
      { class: 'mese__settimana', style: { gridTemplateColumns: colonne } },
      h(
        'button',
        {
          class: [
            'mese__settimana-numero',
            inizioSettimana(stato.data) === lunedi && 'mese__settimana-numero--scelta',
          ],
          type: 'button',
          attr: {
            title: [`Settimana ${settimanaIso(lunedi)}`, letteraDi(lunedi) && `settimana ${letteraDi(lunedi)}`, 'aprila']
              .filter(Boolean)
              .join(' · '),
          },
          onclick: () => aggiorna({ data: lunedi, modoCalendario: 'settimana' }),
        },
        String(settimanaIso(lunedi)),
        // La lettera sotto il numero: chi guarda il mese sta controllando
        // l'alternanza, ed è la colonna in cui si legge di fila.
        letteraDi(lunedi)
          ? h('span', { class: 'mese__settimana-lettera' }, letteraDi(lunedi) as string)
          : null,
      ),
      ...settimanaDi(lunedi)
        .filter((data) => visibili.includes(giornoSettimana(data)))
        .map(cella),
    )

  /**
   * Il nome del mese sopra le sue settimane. Compare quando un mese comincia, e
   * resta appiccicato in alto finché scorre l'ultima delle sue settimane.
   */
  const etichettaMese = (data: Iso): HTMLElement =>
    h('div', { class: 'mese__etichetta' }, formattaMese(data))

  /**
   * I nodi di una settimana: il nome del mese, e la riga.
   *
   * Il cambio di semestre non ha più una banda sua: sta scritto nella cella del
   * giorno in cui cade, accanto al numero, che è dove lo si cerca.
   */
  const pezzi = (lunedi: Iso): HTMLElement[] => {
    const apertura = settimanaDi(lunedi).find((data) => giornoDelMese(data) === 1)
    return [...(apertura ? [etichettaMese(apertura)] : []), rigaSettimana(lunedi)]
  }

  /** Il cartello che dice dove l'anno comincia o finisce: la striscia ha un fondo. */
  const capo = (testo: string): HTMLElement => h('div', { class: 'mese__capo' }, testo)

  const scorrevole = h('div', { class: 'mese__scorrevole' })

  /**
   * L'etichetta messa in cima perché la striscia comincia a metà mese. Non
   * appartiene a nessuna settimana: quando la striscia si allunga verso l'alto
   * va tolta e rimessa davanti alla nuova prima riga.
   */
  let cappello: HTMLElement | null = null
  const rimettiCappello = (lunedi: Iso) => {
    cappello?.remove()
    cappello = null
    // Se la prima settimana apre già un mese, l'etichetta ce l'ha per conto suo.
    if (settimanaDi(lunedi).some((data) => giornoDelMese(data) === 1)) return
    cappello = etichettaMese(lunedi)
    scorrevole.prepend(cappello)
  }

  let allungoInCorso = false
  /** I cartelli di fine: si mettono una volta sola, quando si tocca il capo. */
  let capoSopra: HTMLElement | null = null
  let capoSotto: HTMLElement | null = null

  /** La prima settimana ancora dentro l'anno, salendo dall'alto della striscia. */
  const cimaResa = () => sommaGiorni(ancora, -finestraMese.su * 7)
  const fondoReso = () => sommaGiorni(ancora, finestraMese.giu * 7)

  const allungaGiu = () => {
    if (capoSotto) return
    const nuove: HTMLElement[] = []
    let quante = 0
    for (let i = 1; i <= SETTIMANE_IN_PIU; i += 1) {
      const lunedi = sommaGiorni(ancora, (finestraMese.giu + i) * 7)
      if (!dentroLAnno(lunedi)) break
      nuove.push(...pezzi(lunedi))
      quante += 1
    }
    finestraMese.giu += quante
    scorrevole.append(...nuove)
    if (quante < SETTIMANE_IN_PIU && anno) {
      capoSotto = capo(`Qui finisce l’anno ${anno.etichetta}`)
      scorrevole.append(capoSotto)
    }
  }

  const allungaSu = () => {
    if (capoSopra) return
    const nuove: HTMLElement[] = []
    let quante = 0
    for (let i = finestraMese.su + SETTIMANE_IN_PIU; i > finestraMese.su; i -= 1) {
      const lunedi = sommaGiorni(ancora, -i * 7)
      if (!dentroLAnno(lunedi)) continue
      nuove.push(...pezzi(lunedi))
      quante += 1
    }
    const prima = scorrevole.scrollHeight
    finestraMese.su += quante
    cappello?.remove()
    cappello = null
    if (nuove.length > 0) scorrevole.prepend(...nuove)
    rimettiCappello(cimaResa())
    if (quante < SETTIMANE_IN_PIU && anno) {
      capoSopra = capo(`Qui comincia l’anno ${anno.etichetta}`)
      scorrevole.prepend(capoSopra)
    }
    // Aggiungendo sopra, quel che si stava guardando scivolerebbe giù: si
    // rimette il contenuto dov'era, o scorrere all'indietro sarebbe uno strappo.
    scorrevole.scrollTop += scorrevole.scrollHeight - prima
  }

  // La finestra iniziale si accorcia da sé contro i capi dell'anno: chiedere
  // otto settimane prima di settembre vorrebbe dire otto righe vuote.
  let resteSu = 0
  const dietro: HTMLElement[] = []
  for (let i = finestraMese.su; i >= 1; i -= 1) {
    const lunedi = sommaGiorni(ancora, -i * 7)
    if (!dentroLAnno(lunedi)) continue
    dietro.push(...pezzi(lunedi))
    resteSu += 1
  }
  finestraMese.su = resteSu
  scorrevole.append(...dietro)

  let resteGiu = 0
  for (let i = 0; i <= finestraMese.giu; i += 1) {
    const lunedi = sommaGiorni(ancora, i * 7)
    if (!dentroLAnno(lunedi)) break
    scorrevole.append(...pezzi(lunedi))
    resteGiu = i
  }
  finestraMese.giu = resteGiu

  rimettiCappello(cimaResa())
  if (anno && !dentroLAnno(sommaGiorni(cimaResa(), -7))) {
    capoSopra = capo(`Qui comincia l’anno ${anno.etichetta}`)
    scorrevole.prepend(capoSopra)
  }
  if (anno && !dentroLAnno(sommaGiorni(fondoReso(), 7))) {
    capoSotto = capo(`Qui finisce l’anno ${anno.etichetta}`)
    scorrevole.append(capoSotto)
  }

  scorrevole.addEventListener('scroll', () => {
    finestraMese.scorrimento = scorrevole.scrollTop
    if (allungoInCorso) return
    allungoInCorso = true
    try {
      if (scorrevole.scrollTop < SOGLIA_ALLUNGA) allungaSu()
      else if (
        scorrevole.scrollHeight - scorrevole.scrollTop - scorrevole.clientHeight < SOGLIA_ALLUNGA
      ) {
        allungaGiu()
      }
    } finally {
      allungoInCorso = false
    }
  })

  // La misura si può prendere solo a elemento appeso alla pagina: prima non ha
  // altezza, e portarsi sulla settimana giusta vorrebbe dire scorrere di zero.
  requestAnimationFrame(() => {
    if (finestraMese.scorrimento >= 0) {
      scorrevole.scrollTop = finestraMese.scorrimento
      return
    }
    const scelta = scorrevole.querySelector<HTMLElement>('.mese__cella--scelta')
    if (scelta) {
      // Con i rettangoli e non con `offsetTop`: la cella è annidata dentro la
      // sua settimana, e il suo genitore posizionato potrebbe non essere questo.
      const dove = scelta.getBoundingClientRect().top - scorrevole.getBoundingClientRect().top
      // Il nome del mese sta appiccicato in alto: portare la settimana a filo
      // la ficcherebbe sotto l'etichetta, e il giorno cercato resterebbe
      // coperto proprio dal cartello che dovrebbe aiutare a trovarlo.
      const cartello = scorrevole.querySelector<HTMLElement>('.mese__etichetta')
      const riparo = (cartello?.offsetHeight ?? 0) + 8
      scorrevole.scrollTop = Math.max(0, scorrevole.scrollTop + dove - riparo)
    }
    finestraMese.scorrimento = scorrevole.scrollTop
  })

  return h(
    'div',
    { class: 'mese' },
    h(
      'div',
      { class: 'mese__intestazione', style: { gridTemplateColumns: colonne } },
      h('div', { class: 'mese__giorno-nome mese__giorno-nome--settimana' }, 's.'),
      ...GIORNI_BREVI.filter((_, indice) => visibili.includes(indice + 1)).map((nome) =>
        h('div', { class: 'mese__giorno-nome' }, nome),
      ),
    ),
    scorrevole,
  )
}

// ------------------------------------------------------------------ agenda

/** Quante voci si mostrano di slancio, e quante se ne aggiungono per volta. */
const AGENDA_INIZIALE = 60
const AGENDA_IN_PIU = 60

/**
 * Quante voci sono mostrate, tenuto da un giorno all'altro.
 *
 * Senza, la lista tornerebbe a troncare a sessanta a ogni ridisegno — un
 * appello salvato, un trascinamento — proprio mentre si sta scorrendo più in
 * là. Si riparte da sessanta solo quando il giorno di riferimento cambia
 * davvero.
 */
const finestraAgenda: { da: Iso | null, quante: number } = { da: null, quante: AGENDA_INIZIALE }

function vistaAgenda (): HTMLElement {
  if (finestraAgenda.da !== stato.data) {
    finestraAgenda.da = stato.data
    finestraAgenda.quante = AGENDA_INIZIALE
  }

  const tutte = lezioniInAgenda()
    .filter((l) => differenzaGiorni(stato.data, l.data) >= 0)
    .sort(
      (a, b) =>
        a.data.localeCompare(b.data) ||
        (inizioLezione(a) ?? '').localeCompare(inizioLezione(b) ?? ''),
    )
  const lezioni = tutte.slice(0, finestraAgenda.quante)

  if (lezioni.length === 0) {
    return statoVuoto({
      simbolo: 'calendario',
      titolo: 'Nessuna lezione da qui in avanti',
      testo: 'Le lezioni si aggiungono una per una: non ci sono ricorrenze da impostare.',
      azione: pulsante({
        testo: 'Nuova lezione',
        variante: 'primario',
        simbolo: 'piu',
        al: () => moduloLezione({ data: stato.data }),
      }),
    })
  }

  const perGiorno = new Map<Iso, Lezione[]>()
  for (const lezione of lezioni) {
    const gruppo = perGiorno.get(lezione.data) ?? []
    gruppo.push(lezione)
    perGiorno.set(lezione.data, gruppo)
  }

  // Nell'agenda il confine non si può appendere a un giorno: il primo giorno
  // del semestre potrebbe non avere lezioni e non comparire affatto. Si guarda
  // invece il salto fra due giorni elencati — è lì che il semestre cambia sotto
  // gli occhi di chi scorre.
  let semestrePrecedente = semestrePerData([...perGiorno.keys()][0] ?? stato.data)

  return h(
    'div',
    { class: 'agenda' },
    ...[...perGiorno.entries()].flatMap(([data, delGiorno]) => {
      const suo = semestrePerData(data)
      const cambio = suo && suo.id !== semestrePrecedente?.id ? suo : null
      semestrePrecedente = suo

      return [
        cambio
          ? h(
              'div',
              { class: 'mese__semestre' },
              h('span', null, `Comincia il ${cambio.etichetta}`),
              h('span', { class: 'mese__semestre-data' }, formattaData(cambio.inizio, 'giorno')),
            )
          : null,
        h(
        'section',
        { class: ['agenda__giorno', data === oggi() && 'agenda__giorno--oggi'] },
        h(
          'header',
          { class: 'agenda__testata' },
          h('span', { class: 'agenda__data' }, formattaData(data, 'lungo')),
          // Il numero della settimana: scorrendo l'agenda è l'unico modo di
          // sapere a che punto dell'anno si è senza contare i lunedì.
          h(
            'span',
            { class: 'agenda__settimana', attr: { title: 'Settimana dell’anno' } },
            `s. ${settimanaIso(data)}`,
          ),
          // E se è una A o una B. Nell'agenda si scorre giorno per giorno, e la
          // lettera non si può ricavare da quel che si ha sotto gli occhi: il
          // lunedì che la porta può essere passato da tre righe o non comparire
          // affatto, se in quel giorno non c'erano lezioni. È lo stesso segno
          // dell'angolo della vista settimana.
          letteraDi(data)
            ? h(
                'span',
                {
                  class: 'settimana__lettera',
                  attr: { title: 'Si cambia dalle Impostazioni, con tutte le settimane in fila' },
                },
                letteraDi(data) as string,
              )
            : null,
          data === oggi() ? pastiglia('oggi', 'informativo') : null,
          chiusura(data) ? pastiglia(chiusura(data), 'quiete') : null,
        ),
        ...delGiorno.map((lezione) => {
          const riepilogo = riepilogaPresenze(lezione.presenze)
          return h(
            'button',
            {
              class: ['agenda__voce', `agenda__voce--${lezione.stato}`],
              type: 'button',
              onclick: () => apriLezione(lezione),
              oncontextmenu: (evento: MouseEvent) => menuLezione(evento, lezione),
            },
            h(
              'span',
              { class: 'agenda__orario' },
              `${inizioLezione(lezione) ?? ''}–${fineLezione(lezione) ?? ''}`,
            ),
            puntoColore(coloreDiLezione(lezione)),
            h(
              'span',
              { class: 'agenda__testo' },
              h('strong', null, nomeClasseDiLezione(lezione)),
              titoloDiLezione(lezione)
                ? h('span', { class: 'agenda__titolo' }, titoloDiLezione(lezione))
                : null,
            ),
            h(
              'span',
              { class: 'agenda__coda' },
              pastiglia(formattaDurata(minutiEffettivi(lezione)), 'quiete'),
              lezione.stato === 'svolta' && riepilogo.udTotali > 0
                ? pastiglia(
                    `${riepilogo.presenti}/${riepilogo.totale - riepilogo.senzaAppello}`,
                    riepilogo.assenti > 0 ? 'attenzione' : 'positivo',
                    'utente',
                  )
                : null,
              lezione.stato === 'annullata' ? pastiglia('annullata', 'negativo') : null,
            ),
          )
        }),
        ),
      ]
    }),
    // Il troncamento a sessanta era silenzioso: chi scorreva fino in fondo non
    // sapeva se l'anno finiva lì o se la lista continuava fuori vista.
    tutte.length > lezioni.length
      ? h(
          'button',
          {
            class: 'agenda__altre',
            type: 'button',
            onclick: () => {
              finestraAgenda.quante += AGENDA_IN_PIU
              aggiorna({})
            },
          },
          `Mostra altre ${Math.min(AGENDA_IN_PIU, tutte.length - lezioni.length)} (di ${tutte.length - lezioni.length} rimaste)`,
        )
      : null,
  )
}

// ------------------------------------------------------------------ anno

/** L'iniziale del giorno della settimana, come sui calendari appesi al muro. */
const INIZIALI = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

/** I mesi di un semestre, con come si chiama: un gruppo di colonne affiancate. */
interface GruppoAnno {
  titolo: string
  mesi: Iso[]
}

/**
 * L'anno scolastico intero su una pagina: i mesi in colonna, i giorni in riga.
 *
 * È il calendario che la sede stampa e appende, e serve a domande che nessuna
 * delle altre viste sa reggere: quante settimane restano prima di Natale, dove
 * cade il ponte di primavera, se la settimana della verifica è una A o una B,
 * quante ore stanno ancora dentro il primo semestre. Sono domande che si fanno
 * guardando l'anno tutto insieme — scorrendo mese per mese ci si perde il
 * conto, ed è il motivo per cui quel foglio stampato esiste.
 *
 * Tutti i mesi affiancati, in una griglia sola, con i numeri dei giorni
 * ripetuti in tre punti: ai due capi e in mezzo, al passaggio di semestre.
 * Dodici colonne di seguito senza un riferimento in mezzo si leggono male —
 * per sapere in che riga si è bisogna tornare fino al bordo, e a metà strada
 * si sbaglia riga. È lo stesso motivo per cui il foglio stampato ce li ha.
 */
function vistaAnno (): HTMLElement {
  const anno = annoCorrente()
  if (!anno) return h('div', { class: 'anno-griglia' })

  // Le lezioni per giorno, non il loro numero: nella casella si dice quanti
  // corsi ci sono, e due ore dello stesso corso restano un corso solo.
  const perGiorno = new Map<Iso, Lezione[]>()
  for (const lezione of lezioniInAgenda()) {
    const sue = perGiorno.get(lezione.data)
    if (sue) sue.push(lezione)
    else perGiorno.set(lezione.data, [lezione])
  }

  const mesi: Iso[] = []
  for (let mese = primoDelMese(anno.inizio); mese <= anno.fine; mese = sommaMesi(mese, 1)) {
    mesi.push(mese)
  }

  // Un mese appartiene al semestre in cui cade il suo primo giorno — gennaio
  // resta nel primo anche quando il semestre chiude il 22. Il nome del
  // semestre si prende dall'anno e non dalla data del mese: agosto comincia
  // prima che cominci la scuola, e chiedendo «in che semestre siamo il 1°
  // agosto» la risposta è «in nessuno», che sopra la colonna non serve.
  const confine = confineAnno(anno)
  const gruppi: GruppoAnno[] = confine
    ? [
        { titolo: anno.semestri[0]?.etichetta ?? '1° semestre', mesi: mesi.filter((m) => m <= confine) },
        { titolo: anno.semestri[1]?.etichetta ?? '2° semestre', mesi: mesi.filter((m) => m > confine) },
      ].filter((gruppo) => gruppo.mesi.length > 0)
    : [{ titolo: anno.etichetta, mesi }]

  // La griglia: una colonna dei giorni, poi ogni gruppo di mesi seguito dalla
  // sua colonna dei giorni.
  const colonne = ['2rem', ...gruppi.flatMap((g) => [...g.mesi.map(() => 'minmax(4.8rem, 1fr)'), '2rem'])].join(' ')
  const larghezza = { gridTemplateColumns: colonne }

  const numeri = (numero: number | null) =>
    h('span', { class: 'anno-griglia__giorno' }, numero === null ? 'g.' : String(numero))

  const righe: HTMLElement[] = []
  for (let numero = 1; numero <= 31; numero += 1) {
    righe.push(
      h(
        'div',
        { class: 'anno-griglia__riga', style: larghezza },
        numeri(numero),
        ...gruppi.flatMap((gruppo) => [
          ...gruppo.mesi.map((mese) => cellaAnno(mese, numero, perGiorno)),
          numeri(numero),
        ]),
      ),
    )
  }

  return h(
    'div',
    { class: 'anno-griglia' },
    h(
      'div',
      { class: 'anno-griglia__foglio' },
      // Il nome del semestre sopra i suoi mesi, come sul foglio stampato: una
      // scritta sola larga quanto il gruppo, non ripetuta su ogni colonna.
      h(
        'div',
        { class: 'anno-griglia__riga anno-griglia__riga--semestri', style: larghezza },
        h('span', null, ''),
        ...gruppi.flatMap((gruppo) => [
          h(
            'span',
            {
              class: 'anno-griglia__semestre',
              style: { gridColumn: `span ${gruppo.mesi.length}` },
            },
            gruppo.titolo,
          ),
          h('span', null, ''),
        ]),
      ),
      h(
        'div',
        { class: 'anno-griglia__riga anno-griglia__riga--mesi', style: larghezza },
        numeri(null),
        ...gruppi.flatMap((gruppo) => [
          ...gruppo.mesi.map((mese) =>
            h('span', { class: 'anno-griglia__mese' }, formattaMese(mese).split(' ')[0]),
          ),
          numeri(null),
        ]),
      ),
      ...righe,
    ),
    legendaAnno(),
  )
}

/**
 * Un giorno dell'anno, in tre colonnine.
 *
 * A sinistra la lettera della settimana — sul lunedì, dov'è sul foglio
 * stampato: è la settimana a essere A o B, e ripeterla su sette celle la
 * farebbe leggere come una proprietà del giorno. In mezzo quel che succede:
 * il nome della vacanza, o quante ore ci sono. A destra l'iniziale del giorno.
 *
 * Il confine di semestre è una riga orizzontale, e da che parte sta dice
 * quale dei due: sopra il giorno in cui un semestre comincia, sotto quello in
 * cui finisce. Un bordo tutt'attorno diceva «qui succede qualcosa» e lasciava
 * indovinare che cosa.
 *
 * Le celle che non esistono — il 31 di novembre — restano vuote e spente
 * invece di sparire: le righe devono restare allineate fra i mesi, o il
 * calendario smette di leggersi in orizzontale.
 */
function cellaAnno (mese: Iso, numero: number, perGiorno: Map<Iso, Lezione[]>): HTMLElement {
  const ultimo = giornoDelMese(ultimoDelMese(mese))
  if (numero > ultimo) return h('span', { class: 'anno-giorno anno-giorno--nulla' })

  const data: Iso = `${mese.slice(0, 8)}${String(numero).padStart(2, '0')}`
  const pausa = sospensioneDi(annoCorrente(), data)
  const apre = apreSemestre(data)
  const chiude = chiudeSemestre(data)
  const lunedi = giornoSettimana(data) === 1
  const lettera = lunedi ? letteraDi(data) : null

  // Quanti corsi, non quante ore: due ore dello stesso corso di seguito sono
  // un impegno solo, e in una casella larga tre caratteri «4 ore» faceva
  // sembrare pieno un giorno con due materie. Guardando l'anno si conta di
  // quante classi ci si occupa quel giorno, non per quanto tempo.
  const delGiorno = perGiorno.get(data) ?? []
  const corsi = [...new Set(delGiorno.map((l) => l.corsoId))]

  // Il nome della vacanza si scrive il primo giorno e poi ogni lunedì, non su
  // tutte le caselle: due settimane di Natale ripetevano «Vacanze di Natale»
  // quattordici volte, ognuna tagliata a metà dalla colonna stretta, e la
  // ripetizione copriva quel che nelle celle accanto c'era da leggere davvero.
  // Ripeterlo a ogni lunedì e non solo il primo giorno serve a chi guarda una
  // riga qualsiasi: senza, una pausa cominciata in fondo al mese prima
  // sembrerebbe una colonna verde di cui nessuno dice il perché.
  const nomePausa = pausa && (data === pausa.dal || lunedi) ? pausa.etichetta : ''

  return h(
    'button',
    {
      // Gli stessi nomi del mese: sabato e domenica, i giorni di chiusura e il
      // giorno scelto si vedono uguali in tutte le viste, e il giorno in cui
      // qualcuno cambia il tratteggio delle vacanze cambia dappertutto.
      class: [
        'anno-giorno',
        festivo(data) && 'giorno--festivo',
        pausa && 'giorno--chiuso',
        data === oggi() && 'anno-giorno--oggi',
        data === stato.data && 'anno-giorno--scelto',
        apre && 'anno-giorno--apre',
        chiude && 'anno-giorno--chiude',
      ],
      type: 'button',
      attr: {
        title: [
          formattaData(data, 'lungo'),
          `settimana ${settimanaIso(data)}${lettera ? ` · ${lettera}` : ''}`,
          pausa?.etichetta ?? null,
          corsi.length > 0
            ? delGiorno.map((l) => nomeClasseDiLezione(l)).filter((v, i, tutti) => tutti.indexOf(v) === i).join(', ')
            : null,
          chiude ? `finisce il ${chiude.etichetta}` : null,
          apre ? `comincia il ${apre.etichetta}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      },
      onclick: () => aggiorna({ data, modoCalendario: 'settimana' }),
    },
    h('span', { class: 'anno-giorno__settimana' }, lettera ?? ''),
    h(
      'span',
      { class: 'anno-giorno__testo' },
      // Il nome della vacanza per primo: è quel che si cerca guardando il
      // foglio, più del colore. I corsi prendono il posto quando la casella
      // non porta il nome — dentro una pausa non ce ne sono, e negli altri
      // giorni il nome non c'è.
      nomePausa
        ? h('span', { class: 'anno-giorno__nome' }, nomePausa)
        : corsi.length > 0
          ? [
              // Il punto colore della classe, come nel mese e nell'agenda: è
              // quello che fa riconoscere di chi si tratta prima di leggere.
              ...delGiorno
                .filter((l, i, tutte) => tutte.findIndex((x) => x.corsoId === l.corsoId) === i)
                .slice(0, 3)
                .map((l) => puntoColore(coloreDiLezione(l))),
              h(
                'span',
                { class: 'anno-giorno__corsi' },
                `${corsi.length} cors${corsi.length === 1 ? 'o' : 'i'}`,
              ),
            ]
          : '',
    ),
    h('span', { class: 'anno-giorno__iniziale' }, INIZIALI[giornoSettimana(data) - 1]),
  )
}

/** Che cosa vogliono dire i colori: sono quattro, e nessuno li indovina. */
function legendaAnno (): HTMLElement {
  const voce = (classe: string, testo: string) =>
    h(
      'span',
      { class: 'anno-legenda__voce' },
      h('span', { class: ['anno-legenda__segno', classe] }),
      testo,
    )

  return h(
    'div',
    { class: 'anno-legenda' },
    voce('giorno--chiuso', 'vacanze e chiusure'),
    voce('giorno--festivo', 'sabato e domenica'),
    voce('anno-giorno--apre', 'inizio di semestre: riga sopra'),
    voce('anno-giorno--chiude', 'fine di semestre: riga sotto'),
    h('span', { class: 'anno-legenda__voce' }, 'A e B: la lettera della settimana, sul lunedì'),
    h('span', { class: 'anno-legenda__voce' }, 'il numero: quanti corsi in quel giorno'),
  )
}

// ------------------------------------------------------------------ vista

export function vistaCalendario (): Figlio {
  const anno = annoCorrente()
  const modo = stato.modoCalendario

  if (!anno) {
    return statoVuotoAnno({
      testo:
        'Il registro comincia da qui: anno, classe, materia e ore. L’avvio guidato li chiede ' +
        'tutti in una finestra sola e mette le lezioni sul calendario.',
      avvia: () => moduloAvvio(),
    })
  }

  const passo = (verso: number) => {
    if (modo === 'mese') return sommaMesi(primoDelMese(stato.data), verso)
    if (modo === 'settimana') return sommaGiorni(stato.data, verso * 7)
    return sommaGiorni(stato.data, verso * 7)
  }

  const settimana = settimanaDi(stato.data)
  // In che semestre si sta guardando: è la cosa che cambia il significato di
  // quel che si scrive, e non si legge da nessun'altra parte del calendario.
  const semestre = semestrePerData(stato.data)
  const dove =
    modo === 'anno'
      ? `${anno.etichetta} · ${formattaData(anno.inizio)} → ${formattaData(anno.fine)}`
      : modo === 'mese'
        ? formattaMese(stato.data)
        : `${formattaData(settimana[0])} – ${formattaData(settimana[6])} · settimana ${settimanaIso(stato.data)}`
  // Nell'anno il semestre non si aggiunge: ci sono tutti e due sotto gli occhi,
  // ognuno con il suo titolo.
  const sottotitolo = semestre && modo !== 'anno' ? `${dove} · ${semestre.etichetta}` : dove

  const dellaSettimana = lezioniInAgenda().filter(
    (l) => l.data >= settimana[0] && l.data <= settimana[6],
  )
  const oreSettimana = dellaSettimana.reduce((somma, l) => somma + minutiEffettivi(l), 0)

  return h(
    'div',
    // Il modo finisce nella classe perché decide quanto la pagina si allarga:
    // settimana, mese e anno sono griglie e prendono tutto lo schermo che c'è;
    // l'agenda è un elenco, e larga due metri mette mezzo schermo fra il nome
    // del corso e la sua durata. La regola sta in `fondamenta.css`, accanto
    // alle altre misure.
    { class: ['vista', 'vista--calendario', `vista--calendario-${modo}`] },
    testataVista({
      titolo: 'Calendario',
      sottotitolo,
      azioni: [
        pulsante({
          simbolo: 'sinistra',
          titolo: 'Indietro',
          al: () => {
            ricentraMese()
            aggiorna({ data: passo(-1) })
          },
        }),
        pulsante({
          testo: 'Oggi',
          al: () => {
            ricentraMese()
            aggiorna({ data: oggi() })
          },
        }),
        pulsante({
          simbolo: 'destra',
          titolo: 'Avanti',
          al: () => {
            ricentraMese()
            aggiorna({ data: passo(1) })
          },
        }),
        selettore(
          modo,
          [
            { valore: 'settimana', testo: 'Settimana', simbolo: 'settimana' },
            { valore: 'mese', testo: 'Mese', simbolo: 'mese' },
            { valore: 'anno', testo: 'Anno', simbolo: 'calendario' },
            { valore: 'agenda', testo: 'Agenda', simbolo: 'agenda' },
          ],
          (scelto) => {
            if (scelto === 'mese') ricentraMese()
            aggiorna({ modoCalendario: scelto })
          },
        ),
        pulsante({
          testo: 'Nuova lezione',
          variante: 'primario',
          simbolo: 'piu',
          al: () =>
            moduloLezione({
              data: stato.data,
              dopo: (lezioneId) => aggiorna({ vista: 'lezione', lezioneId }),
            }),
        }),
      ],
      contorno: [
        selettoreClassi({
          nome: 'filtroClasseCalendario',
          classi: classiVisibili(),
          valore: stato.filtroClasseAgendaId,
          al: (valore) => aggiorna({ filtroClasseAgendaId: valore }),
        }),
        h(
          'div',
          { class: 'sintesi' },
          datoSintetico('lezioni in settimana', String(dellaSettimana.length)),
          datoSintetico('ore effettive', formattaDurata(oreSettimana)),
          datoSintetico(
            'da svolgere',
            String(dellaSettimana.filter((l) => l.stato === 'pianificata').length),
          ),
        ),
      ],
    }),
    modo === 'settimana'
      ? vistaSettimana()
      : modo === 'mese'
        ? vistaMese()
        : modo === 'anno'
          ? vistaAnno()
          : vistaAgenda(),
  )
}
