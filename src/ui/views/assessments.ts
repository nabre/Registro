// I momenti di valutazione e i voti.
//
// La forma è quella del foglio di calcolo perché è quella con cui si mettono i
// voti: righe gli allievi, colonne i momenti, e ci si sposta con le frecce. Le
// medie sono pesate e si aggiornano da sole, l'ultima colonna e l'ultima riga
// sono i due totali che si guardano davvero.
//
// Una casella accetta il voto, oppure «a» per segnare l'assenza: chi
// assente non prende zero, esce dalla media.

import {
  allieviAttivi,
  distribuzione,
  distribuzioneAPunti,
  formattaVoto,
  nomeCompleto,
  ordinaAllievi,
} from '../../domain/calculations.js'
import { corsiDellAnno } from '../../domain/courses.js'
import { PIF } from '../../domain/lexicon.js'
import { formattaData } from '../../domain/dates.js'
import { MOTIVI_ORFANO, motivoOrfano, valutazioniOrfane } from '../../domain/orphans.js'
// L'assenza all'ora sta nel dominio perché non la guarda solo la griglia: da
// lì nascono i recuperi, e due letture della stessa cosa potrebbero divergere.
import type {
  Allievo,
  Corso,
  MomentoValutazione,
} from '../../domain/models.js'
import {
  avviso,
  barra,
  pulsante,
  scheda,
  statoVuoto,
  testataVista,
} from '../components/base.js'
import { postoAllegato } from '../components/attachments.js'
import { eseguiOAvvisa, sintesiIncassata, statoVuotoAnno } from '../components/filters.js'
import { corsoDelContesto } from '../context.js'
import { conferma } from '../components/modal.js'
import { graficoNote } from '../components/notes.js'
import { notifica } from '../components/notifications.js'
import { h, type Figlio } from '../dom.js'
import { chiediEliminazione, moduloAvvio, moduloValutazione } from '../forms.js'
import { grigliaVoti, SIGLA_ASSENTE } from './grades.js'
import { pannelloRecuperi } from './retakes.js'
import { pannelloRiconsegna } from './returns.js'
import { azione } from '../bridge.js'
import {
  aggiorna,
  annoCorrente,
  classeDiMomento,
  classePerId,
  stato,
  valutazionePerId,
  nomeSemestreScelto,
  nelSemestreScelto,
} from '../state.js'

/**
 * I momenti di una classe, già ristretti al semestre scelto.
 *
 * Il semestre non è scritto sul momento: è quello in cui cade la sua data. E
 * non è più una scelta di questa pagina — c'era una tendina qui e una nella
 * barra, e due controlli per la stessa cosa vogliono dire due numeri diversi
 * letti nello stesso pomeriggio. Comanda quello della barra, che vale per tutti
 * i conti del registro.
 */
function momentiDi (corso: Corso): MomentoValutazione[] {
  return nelSemestreScelto(
    stato.registro.valutazioni.filter((v) => v.corsoId === corso.id),
  ).sort((a, b) => a.data.localeCompare(b.data))
}

/**
 * I corsi vivi dell'anno: non più per sceglierli — la tendina è una sola, in
 * cima — ma per contare i momenti sganciati che stanno negli altri corsi.
 */
function corsiDellAnnoVivi (): Corso[] {
  return corsiDellAnno(stato.registro, annoCorrente()?.id ?? null).filter(
    (corso) => !classePerId(corso.classeId)?.archiviata,
  )
}

/**
 * Il corso di cui si guardano le valutazioni.
 *
 * È quello della tendina in cima, lo stesso della vista Corsi e dei Piani: chi
 * arriva qui stava già guardando quel corso. La pagina aveva la sua tendina —
 * la stessa domanda fatta due volte a un centimetro di distanza, con la
 * possibilità che le due risposte non coincidessero.
 */
function corsoScelto (): Corso | null {
  return corsoDelContesto()
}



// ------------------------------------------------------------------ allegati

/** I PDF del momento: il testo, la soluzione, e la prova corretta di ogni allievo. */
function schedaAllegati (momento: MomentoValutazione, allievi: Allievo[]): HTMLElement {
  const prove = momento.allegati.filter((a) => a.ruolo === 'prova').length

  return scheda({
    titolo: 'Documenti',
    sottotitolo: 'i PDF stanno nella cartella del registro, sotto allegati/',
    contenuto: h(
      'div',
      { class: 'allegati' },
      postoAllegato(momento, 'verifica', 'Verifica'),
      postoAllegato(momento, 'soluzione', 'Soluzione'),
      h(
        'div',
        { class: 'allegati__testata-prove' },
        h('h4', null, 'Prove corrette'),
        h('span', { class: 'testo-quieto' }, `${prove}/${allievi.length}`),
      ),
      ...allievi.map((allievo) =>
        postoAllegato(momento, 'prova', nomeCompleto(allievo), { allievoId: allievo.id }),
      ),
      allievi.length === 0
        ? h('p', { class: 'testo-quieto' }, `La classe non ha ${PIF.plurale} attive.`)
        : null,
    ),
  })
}

function dettaglioMomento (momento: MomentoValutazione): HTMLElement {
  const statistiche = distribuzione(momento)
  const classe = classeDiMomento(momento)
  const attivi = classe ? allieviAttivi(classe) : []
  // «Voti messi» conta chi ha un voto adesso, non chi ce l'aveva quando si è
  // ritirato: `distribuzione` guarda tutti i voti del momento, ritirati
  // compresi, e messo al numeratore gonfiava il conto rispetto al
  // denominatore, che è solo chi frequenta ancora.
  const attiviIds = new Set(attivi.map((a) => a.id))
  const messiAttivi = momento.voti.filter(
    (v) => attiviIds.has(v.allievoId) && !v.assente && typeof v.valore === 'number',
  ).length

  const lezione = momento.lezioneId
    ? stato.registro.lezioni.find((l) => l.id === momento.lezioneId) ?? null
    : null

  // Se non viene da nessuna tappa lo si dice qui, dove lo si guarda: resta
  // nelle medie, e senza un segno sembra un momento come gli altri.
  const motivo = motivoOrfano(stato.registro, momento)

  return scheda({
    titolo: momento.titolo,
    sottotitolo:
      `${formattaData(momento.data, 'lungo')} · ${momento.tipo} · peso ${momento.peso}` +
      (motivo ? ` · sganciato: ${MOTIVI_ORFANO[motivo]}` : ''),
    azioni: [
      lezione
        ? pulsante({
            testo: 'Vai alla lezione',
            simbolo: 'calendario',
            variante: 'fantasma',
            al: () => aggiorna({ vista: 'lezione', lezioneId: lezione.id, data: lezione.data }),
          })
        : null,
      pulsante({ testo: 'Modifica', simbolo: 'matita', variante: 'sottile', al: () => moduloValutazione(momento) }),
      // L'eliminazione stava solo dentro il modulo di modifica: la si trovava
      // per caso. Qui è accanto a quel che elimina.
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: 'Elimina il momento di valutazione',
        al: async () => {
          if (!(await chiediEliminazione({ genere: 'valutazione', id: momento.id }))) return
          const risposta = await azione({
            tipo: 'valutazione.elimina',
            valutazioneId: momento.id,
          })
          if (!risposta.ok) return
          aggiorna({ valutazioneId: null })
          notifica('Momento eliminato.', 'info')
        },
      }),
    ],
    contenuto: h(
      'div',
      null,
      momento.descrizione ? h('p', { class: 'nota-classe' }, momento.descrizione) : null,
      lezione === null && momento.lezioneId === null
        ? null
        : h(
            'p',
            { class: 'testo-quieto' },
            lezione
              ? `Svolto nella lezione del ${formattaData(lezione.data, 'lungo')}: la data segue la lezione.`
              : 'La lezione collegata non c’è più: la data resta quella registrata.',
          ),
      sintesiIncassata(
        { etichetta: 'voti messi', valore: `${messiAttivi}/${attivi.length}` },
        { etichetta: 'media', valore: formattaVoto(statistiche.media) },
        { etichetta: 'minimo', valore: formattaVoto(statistiche.minimo) },
        { etichetta: 'massimo', valore: formattaVoto(statistiche.massimo) },
        {
          etichetta: 'sufficienti',
          valore: statistiche.conteggio === 0 ? '—' : `${Math.round(statistiche.quotaSufficienti * 100)}%`,
          tono: statistiche.quotaSufficienti >= 0.6 ? 'positivo' : 'attenzione',
        },
      ),
      // Lo stesso grafico del PDF e dello schermo per la classe, lo stesso
      // componente: qui c'era un istogramma scritto a mano, e la stessa prova
      // aveva tre forme diverse a seconda di dove la si guardava.
      statistiche.conteggio > 0
        ? graficoNote({
            grafico: distribuzioneAPunti(momento),
            media: formattaVoto(statistiche.media),
            sufficienti: statistiche.sufficienti,
            conteggio: statistiche.conteggio,
            estremi:
              statistiche.minimo !== null && statistiche.massimo !== null
                ? `da ${formattaVoto(statistiche.minimo)} a ${formattaVoto(statistiche.massimo)}`
                : null,
          })
        : h('p', { class: 'testo-quieto' }, 'Nessun voto ancora inserito.'),
      h(
        'div',
        { class: 'avanzamento-inserimento' },
        h('span', null, 'Inserimento'),
        barra(attivi.length === 0 ? 0 : messiAttivi / attivi.length, 'informativo'),
      ),
    ),
  })
}

/**
 * I momenti che nessuna tappa del piano ha fatto nascere.
 *
 * Non si riparano da soli e non si buttano da soli: portano dei voti, e i voti
 * sono l'unica cosa del registro che non si può rifare guardando altrove. Qui
 * si dice quali sono, perché sono sganciati e quanti voti si porterebbero via;
 * la decisione resta a chi guarda.
 *
 * Si vedono solo quando ce ne sono: un riquadro che dice «nessun problema» è un
 * riquadro che si impara a saltare, e il giorno in cui dice qualcosa non lo
 * legge più nessuno.
 */
function riquadroOrfane (corso: Corso | null): Figlio {
  if (!corso) return null
  // Nel semestre scelto come tutto il resto della vista: un elenco che parla
  // di prove di un altro periodo, accanto a una griglia che non le mostra,
  // manda a cercare qualcosa che non si vede.
  const nelPeriodo = (voci: ReturnType<typeof valutazioniOrfane>) =>
    voci.filter((o) => nelSemestreScelto([o.momento]).length > 0)
  const orfane = nelPeriodo(valutazioniOrfane(stato.registro, [corso.id]))
  // Quelli degli altri corsi non spariscono: si dice quanti sono, così
  // cambiando corso si sa che c'è ancora da fare.
  const altrove =
    nelPeriodo(valutazioniOrfane(stato.registro, corsiDellAnnoVivi().map((c) => c.id))).length -
    orfane.length
  if (orfane.length === 0 && altrove === 0) return null
  if (orfane.length === 0) {
    return avviso(
      h(
        'span',
        null,
        `${altrove === 1 ? 'Un momento sganciato' : `${altrove} momenti sganciati`} ` +
          'in altri corsi: si sistemano scegliendo il loro corso dalla tendina in cima.',
      ),
      'informativo',
    )
  }

  const voti = orfane.reduce((somma, o) => somma + o.voti, 0)

  const eliminaTutte = async () => {
    const vaBene = await conferma({
      titolo: `Eliminare ${orfane.length === 1 ? 'il momento sganciato' : `i ${orfane.length} momenti sganciati`}?`,
      testo:
        (voti > 0
          ? `Se ne ${voti === 1 ? 'va anche 1 voto' : `vanno anche ${voti} voti`}, e non si può tornare indietro. `
          : 'Nessuno di loro ha voti dentro. ') +
        'I PDF allegati finiscono nel cestino del sistema.',
      testoConferma: 'Elimina',
      pericolo: true,
    })
    if (!vaBene) return
    await eseguiOAvvisa({ tipo: 'valutazione.eliminaOrfane', ids: orfane.map((o) => o.momento.id) })
  }

  return avviso(
    h(
      'div',
      { class: 'orfane' },
      h(
        'div',
        { class: 'orfane__testata' },
        h(
          'strong',
          null,
          orfane.length === 1
            ? 'Un momento non è agganciato a nessuna tappa del piano'
            : `${orfane.length} momenti non sono agganciati a nessuna tappa del piano`,
        ),
        pulsante({
          testo: 'Elimina tutti',
          simbolo: 'cestino',
          variante: 'sottile',
          titolo: 'Butta via tutti i momenti sganciati elencati qui',
          al: () => void eliminaTutte(),
        }),
      ),
      h(
        'p',
        { class: 'testo-quieto' },
        'Un momento nasce dalla tappa del piano che dichiara di essere una prova. ' +
          'Questi vengono da prima, o hanno perso la tappa per strada: restano nelle ' +
          'medie, ma non si sa più da che cosa siano usciti.' +
          (altrove > 0 ? ` Altri ${altrove} in altri corsi.` : ''),
      ),
      h(
        'ul',
        { class: 'orfane__elenco' },
        ...orfane.map((orfana) =>
          h(
            'li',
            { class: 'orfane__voce' },
            h(
              'button',
              {
                class: 'collegamento',
                type: 'button',
                title: 'Apri questo momento',
                onclick: () => aggiorna({ valutazioneId: orfana.momento.id }),
              },
              `${formattaData(orfana.momento.data)} · ${orfana.momento.titolo}`,
            ),
            h(
              'span',
              { class: 'testo-quieto' },
              `${MOTIVI_ORFANO[orfana.motivo]}${orfana.voti > 0 ? ` · ${orfana.voti} ${orfana.voti === 1 ? 'voto' : 'voti'}` : ' · nessun voto'}`,
            ),
            pulsante({
              simbolo: 'cestino',
              variante: 'fantasma',
              titolo: `Elimina «${orfana.momento.titolo}»`,
              al: async () => {
                const vaBene = await chiediEliminazione({
                  genere: 'valutazione',
                  id: orfana.momento.id,
                })
                if (!vaBene) return
                await eseguiOAvvisa({
                  tipo: 'valutazione.elimina',
                  valutazioneId: orfana.momento.id,
                })
              },
            }),
          ),
        ),
      ),
    ),
    'attenzione',
  )
}

export function vistaValutazioni (): Figlio {
  const anno = annoCorrente()
  if (!anno) {
    return statoVuotoAnno({ simbolo: 'valutazioni', avvia: () => moduloAvvio() })
  }

  // Le valutazioni si guardano un corso alla volta: la media in fondo alla
  // griglia è quella del corso, e mescolare due materie darebbe un numero che
  // non è la media di niente. Il corso è già la coppia classe e materia, e un
  // filtro per classe davanti era un passaggio in più per arrivare dove si
  // stava andando comunque.
  const corso = corsoScelto()
  const classe = corso ? classePerId(corso.classeId) : null

  if (!corso || !classe) {
    return statoVuoto({
      simbolo: 'valutazioni',
      titolo: 'Nessun corso',
      testo: 'I voti stanno dentro un corso — una materia a una classe — e prima si crea quello.',
      azione: pulsante({ testo: 'Vai ai corsi', variante: 'primario', al: () => aggiorna({ vista: 'corsi' }) }),
    })
  }

  const momenti = momentiDi(corso)
  const scelto = valutazionePerId(stato.valutazioneId)
  // Anche il dettaglio sta nel semestre scelto: aperto un momento e cambiato
  // periodo, la scheda restava lì a mostrare una prova che la griglia accanto
  // non elencava più.
  const daMostrare =
    scelto && scelto.corsoId === corso.id && momenti.some((m) => m.id === scelto.id)
      ? scelto
      : null
  const momentoMostrato = daMostrare ?? momenti.at(-1) ?? null

  return h(
    'div',
    { class: 'vista vista--valutazioni' },
    testataVista({
      titolo: 'Momenti di valutazione',
      sottotitolo: `${classe.nome} · ${nomeSemestreScelto()}`,
      // Niente esportazioni qui: la griglia in PDF e i voti in CSV stanno in
      // Documenti, con il resto di quel che esce dal registro. Qui si mettono i
      // voti, di là si consegnano — e chi deve consegnare a fine semestre non
      // deve più ricordarsi in quale pagina stava quale pulsante.
      // Il corso non si sceglie qui: è quello della tendina in cima, che vale
      // per tutte le pagine. Resta solo come si scrive nelle caselle, che di
      // questa pagina è l'unica cosa da sapere.
      contorno: h(
        'div',
        { class: 'filtri' },
        h(
          'p',
          { class: 'suggerimento' },
          `Nelle caselle: il voto, oppure «${SIGLA_ASSENTE}» per l’assenza — la stessa ` +
            'sigla dell’appello. Frecce e Invio per spostarsi.',
        ),
      ),
    }),
    // Prima della griglia: è la cosa da sistemare, e sotto la griglia non la
    // vedrebbe nessuno.
    riquadroOrfane(corso),
    momenti.length === 0
      ? statoVuoto({
          simbolo: 'valutazioni',
          titolo: 'Nessun momento di valutazione',
          // Non c'è un pulsante per crearne uno, ed è voluto: un momento nasce
          // dalla tappa del piano che dichiara di essere una prova, dentro
          // l'ora in cui la prova si fa. Qui si guarda l'anno intero.
          testo:
            'Un momento è una verifica, un orale, un progetto. Nasce dalla tappa del piano ' +
            'che dichiara di essere una prova, dentro la lezione in cui la si fa: da lì ' +
            'sa già titolo, tipo, peso e data. In questo corso non ce n’è ancora nessuno.',
        })
      : h(
          'div',
          { class: 'colonne colonne--valutazioni' },
          h(
            'div',
            { class: 'colonna colonna--larga' },
            // Si scrive anche qui, non solo dentro l'ora: è la sola pagina da
            // cui si vede l'anno intero, ed è dove si correggono i voti vecchi
            // e si mettono quelli che a un'ora non appartengono.
            grigliaVoti(classe, momenti),
            // I recuperi sotto la griglia, non nella colonna stretta: è una
            // tabella di sei colonne, e schiacciata di fianco alle statistiche
            // andava a capo su ogni riga. Qui sta sotto le caselle vuote da cui
            // nasce, larga quanto loro, e si legge in orizzontale come deve.
            momentoMostrato ? pannelloRecuperi(momentoMostrato) : null,
          ),
          momentoMostrato
            ? h(
                'div',
                { class: 'colonna' },
                dettaglioMomento(momentoMostrato),
                pannelloRiconsegna(momentoMostrato),
                schedaAllegati(momentoMostrato, ordinaAllievi(allieviAttivi(classe))),
              )
            : null,
        ),
  )
}
