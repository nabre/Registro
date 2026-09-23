// Il widget sul desktop: chi lo tiene aggiornato e che cosa ci mette.
//
// Sta in mezzo fra due pezzi che non si conoscono, come `tray.ts` e
// `reminders.ts`: il dominio sa *che cosa* dire e non sa che ore sono né che
// cosa sia una finestra; `environment/agenda.ts` sa fare una striscia agganciata al
// bordo del desktop e non sa niente di lezioni. Qui ci sono il momento,
// l'archivio, e i gesti che la striscia sa fare.
//
// ## Le tre schede
//
// **Calendario** — il mese in testa e la settimana sotto: dove devo essere.
// **Pendenze** — le ore rimaste aperte e il lavoro per classe: sono indietro?
// **Lezione** — l'ora di adesso, con l'appello e l'argomento: che sto facendo.
//
// Ognuna ha il suo file nel dominio (`agenda.ts`, `agendaMonth.ts`,
// `agendaPending.ts`, `agendaLesson.ts`), e nessuno dei quattro sa che esiste
// una finestra. Qui si sceglie quale far vedere e si raccoglie quel che serve:
// **solo della scheda accesa**, perché una striscia che ricalcolasse tutte e tre
// a ogni battito dell'orologio farebbe il triplo del lavoro per mostrarne un
// terzo.
//
// ## Il battito
//
// Un widget acceso tutto il giorno è l'unico pezzo del registro che *deve*
// sapere che ore sono senza che nessuno lo tocchi: alle 08:20 l'ora delle
// 08:20 diventa «in corso», e se nessuno ricalcola resta «in programma» fino a
// sera. Il battito è quello del vassoio, per la stessa ragione e con la stessa
// cautela: si ridisegna solo quando il testo è cambiato davvero.
//
// ## La settimana guardata
//
// Si può scorrere avanti e indietro — è la domanda «la settimana prossima cosa
// ho» — ma il riferimento torna da solo a oggi quando cambia il giorno: un
// widget lasciato acceso su «la settimana prossima» il lunedì dopo mostrerebbe
// una settimana passata, e chi lo guarda con la coda dell'occhio non se ne
// accorgerebbe. Vale anche per l'ora fissata nella scheda «lezione».
//
// ## Le azioni
//
// La scheda «lezione» scrive: l'appello, l'argomento, l'ora segnata svolta.
// Non scrive da sé — chiama le procedure di `src/api/`, le stesse che il
// pannello raggiunge dal suo ponte, con la stessa convalida e lo stesso
// giornale. Il widget è una seconda porta sullo stesso registro, non un
// secondo registro.
//
// Le letture, invece, restano spinte da qui: la striscia non chiede niente,
// riceve. È voluto, ed è la differenza fra questo widget e il pannello — chi
// è mosso da un battito d'orologio non ha nessuno a cui fare una domanda, e
// una scheda ricalcolata ogni trenta secondi si manda, non si aspetta.

import * as apparato from 'apparato'

import { chiama } from './api/core.js'
// Importato per il suo effetto: `src/actions.ts` sparge `gestoriDelleProcedure()`,
// che mette le procedure nell'elenco del nucleo. Questo file chiama il nucleo
// e non più il centralino, ma senza questa riga l'elenco sarebbe vuoto.
import './actions.js'
import {
  agendaAperta,
  agendaDisponibile,
  apriAgenda,
  type ComandoAgenda,
  type FinestraAgenda,
  type SchedaAgenda,
} from './environment/agenda.js'
import type { Archivio } from './data/archive.js'
import { agendaSettimana, settimanaDiPartenza } from './domain/agenda.js'
import { lezioneAgenda } from './domain/agendaLesson.js'
import { meseAgenda } from './domain/agendaMonth.js'
import { agendaPendenze, riepilogoPendenze } from './domain/agendaPending.js'
import { adesso, inizioSettimana, oggi, primoDelMese } from './domain/dates.js'
import type { Iso } from './domain/models.js'
import type { RiepilogoTodo } from './domain/todo.js'
import type { MessaggioNavigazione } from './protocol.js'

/** Ogni quanto si guarda l'orologio. Come il vassoio. */
const BATTITO = 30_000

const CHIAVE_ATTIVA = 'registroDocenti.agenda.attiva'
const CHIAVE_SCHEDA = 'registroDocenti.agenda.scheda'

/** Le schede che esistono: quel che arriva dalla pagina si misura su questo. */
const SCHEDE: readonly SchedaAgenda[] = ['calendario', 'pendenze', 'lezione']

/**
 * Quel che la pagina dell'agenda riceve: vedi `contenuto`.
 *
 * Esportato per la pagina (`shell/pages/agenda/agenda.ts`), che lo importa come
 * tipo: la forma è una sola, e se cambia qui la pagina smette di compilare
 * invece di disegnare `undefined`.
 */
export interface ContenutoAgenda {
  tipo: 'agenda'
  scheda: SchedaAgenda
  linguette: {
    pendenze: number
    oreAperte: number
    fase: NonNullable<ReturnType<typeof lezioneAgenda>>['fase'] | null
    senzaAppello: number
  } | null
  settimana: ReturnType<typeof agendaSettimana> | null
  mese?: ReturnType<typeof meseAgenda> | null
  pendenze?: ReturnType<typeof agendaPendenze> | null
  lezione?: ReturnType<typeof lezioneAgenda>
}

interface Ambiente {
  archivio: Archivio
  apri: (navigazione?: MessaggioNavigazione) => void
}

let ambiente: Ambiente | null = null
let striscia: FinestraAgenda | null = null

/**
 * Chi vuole sapere se la striscia è accesa: è il vassoio, che ne disegna la
 * spunta. Si iscrive lui invece di essere chiamato per nome da qui, così questo
 * file non ha bisogno di conoscerlo — è la stessa strada della proiezione.
 */
const ascoltatori = new Set<() => void>()

export function allAgenda (ascoltatore: () => void): apparato.Smaltitore {
  ascoltatori.add(ascoltatore)
  return new apparato.Smaltitore(() => ascoltatori.delete(ascoltatore))
}

function annuncia (): void {
  for (const ascoltatore of ascoltatori) ascoltatore()
}

/** Il lunedì della settimana mostrata. Cambia scorrendo, e torna da sé a oggi. */
let riferimento: Iso = inizioSettimana(oggi())
/**
 * Il mese della griglia in testa al calendario.
 *
 * Segue la settimana quando si scorre, ma ha una vita sua: con le sue frecce si
 * guarda avanti di tre mesi senza spostare la settimana di sotto, che è quel che
 * si sta facendo questa settimana. Si riallinea appena si preme una casella.
 */
let mese: Iso = primoDelMese(oggi())
/** L'ultimo giorno visto dal battito: serve a riportare il riferimento a oggi. */
let giornoVisto: Iso = oggi()
/** La scheda aperta. Si ricorda fra un avvio e l'altro. */
let scheda: SchedaAgenda = 'calendario'
/**
 * L'ora che la scheda «lezione» tiene sotto gli occhi, quando non è quella di
 * adesso: le frecce servono a tornare indietro a chiudere l'ora di ieri.
 * `null` vuol dire «quella che il registro sceglierebbe da sé».
 */
let oraFissata: string | null = null

/**
 * I conti della pagina Todo, tenuti da parte.
 *
 * Costano — si rifanno per ogni classe, corso per corso — e dipendono dal giorno
 * e non dall'ora: rifarli a ogni battito vorrebbe dire trenta volte al minuto lo
 * stesso risultato. Si buttano quando il registro cambia davvero, che è quel che
 * dice la revisione dell'archivio, o quando cambia il giorno.
 */
let conti: { revisione: number, giorno: Iso, riepilogo: RiepilogoTodo } | null = null

function riepilogoDelGiorno (archivio: Archivio, giorno: Iso): RiepilogoTodo {
  if (conti && conti.revisione === archivio.revisione && conti.giorno === giorno) {
    return conti.riepilogo
  }
  const riepilogo = riepilogoPendenze(archivio.registro, giorno)
  conti = { revisione: archivio.revisione, giorno, riepilogo }
  return riepilogo
}

/**
 * Da che settimana si (ri)parte.
 *
 * Non sempre quella di oggi: a luglio o a ferragosto l'anno aperto non contiene
 * il giorno di oggi, e cinque giorni vuoti non direbbero niente — si va invece
 * alla prima settimana dell'anno, o all'ultima. La regola sta nel dominio,
 * dove si prova senza aspettare luglio.
 */
function partenza (): Iso {
  const archivio = ambiente?.archivio
  return archivio ? settimanaDiPartenza(archivio.registro, oggi()) : inizioSettimana(oggi())
}

/** Il riferimento e il mese riportati dove si comincia: dopo «oggi», e a mezzanotte. */
function riparti (): void {
  riferimento = partenza()
  mese = primoDelMese(riferimento)
  oraFissata = null
}

/**
 * Che cosa mandare alla pagina.
 *
 * Le linguette portano i loro numeri sempre, anche quando la scheda è spenta: è
 * il motivo per cui un widget aperto sul calendario fa comunque vedere che ci
 * sono sei ore da chiudere. Il resto — la settimana, il mese, l'appello — si
 * calcola solo per la scheda accesa.
 */
function contenuto (): ContenutoAgenda {
  const archivio = ambiente?.archivio
  if (!archivio) return { tipo: 'agenda', scheda, settimana: null, linguette: null }

  const registro = archivio.registro
  const giorno = oggi()
  const ora = adesso()
  const pendenze = agendaPendenze(registro, giorno, ora, riepilogoDelGiorno(archivio, giorno))
  const lezione = lezioneAgenda(registro, giorno, ora, oraFissata)

  return {
    tipo: 'agenda',
    scheda,
    // I numeri sulle linguette: quante cose aspettano, e come sta l'ora di
    // adesso. Costano poco e si guardano di sfuggita — sono metà del motivo per
    // cui vale la pena tenere la striscia accesa.
    linguette: {
      pendenze: pendenze.aperti,
      oreAperte: pendenze.oreAperte.length + pendenze.altreOre,
      fase: lezione?.fase ?? null,
      senzaAppello: lezione?.senzaAppello ?? 0,
    },
    settimana:
      scheda === 'calendario' ? agendaSettimana(registro, riferimento, giorno, ora) : null,
    mese: scheda === 'calendario' ? meseAgenda(registro, mese, giorno, ora) : null,
    pendenze: scheda === 'pendenze' ? pendenze : null,
    lezione: scheda === 'lezione' ? lezione : null,
  }
}

/**
 * Una scrittura chiesta dal widget.
 *
 * Passa dal nucleo dell'API, e non più dal centralino diretto, per tre cose che
 * qui mancavano tutte e tre.
 *
 * La prima è la convalida. Il widget è un webview a sé: il tipo che tiene
 * insieme pannello e host non arriva fin qui, ed è per questo che sopra c'era
 * un elenco degli stati dell'appello ricontrollato a mano — «un messaggio
 * malformato non deve poter scrivere "pres3nte" dentro l'appello di una
 * classe». Quel controllo adesso lo fa lo schema della procedura, una volta,
 * per tutti quelli che chiamano; l'elenco scritto qui se n'è andato con lui.
 *
 * La seconda è che un rifiuto si vede. Prima l'esito si buttava via — si
 * ridisegnava la striscia e basta — e una scrittura respinta perché l'ora non
 * c'era più lasciava il widget a mostrare quel che credeva, senza dire niente
 * a nessuno.
 *
 * La terza è il giornale: `origine: 'agenda'` distingue quel che ha scritto la
 * striscia da quel che ha scritto il pannello, che è la prima domanda che si
 * fa quando un dato risulta cambiato e nessuno se lo ricorda.
 */
function scrivi (procedura: string, ingresso: Record<string, unknown>): void {
  const archivio = ambiente?.archivio
  if (!archivio) return
  void chiama(archivio, procedura, ingresso, { origine: 'agenda' })
    .then((esito) => {
      striscia?.aggiorna()
      if (esito.ok) return
      // Il widget non ha un posto suo dove mettere un avviso: lo si manda dove
      // vanno gli altri del registro — nel pannello se è aperto, altrimenti in
      // una finestra di sistema. È `environment/dialogs.ts` a decidere quale.
      void apparato.dialoghi.errore(`Agenda: ${esito.messaggi.join(' ')}`)
    })
    // `chiama()` non solleva mai — quel che va storto torna nella busta — ma il
    // corpo qui sopra sì: `striscia.aggiorna()` ridisegna un webview che nel
    // frattempo può essere stato distrutto, e `dialoghi.errore` passa dal
    // pannello. Senza questa riga quel guasto diventa una rejection che nessuno
    // gestisce, cioè il processo principale che cade mentre si scrive nel
    // registro — e il widget è l'unico dei cinque chiamanti che non avesse rete.
    .catch((guasto: unknown) => {
      console.error(`[agenda] ${procedura}`, guasto)
    })
}

function alComando (comando: ComandoAgenda): void {
  switch (comando.tipo) {
    case 'settimana':
      riferimento = inizioSettimana(comando.lunedi)
      // Il mese segue la settimana: scorrendo fino a novembre, la griglia in
      // testa che restasse a ottobre direbbe che si sta guardando ottobre.
      mese = primoDelMese(riferimento)
      striscia?.aggiorna()
      break

    case 'oggi':
      riparti()
      striscia?.aggiorna()
      break

    case 'scheda':
      if (!SCHEDE.includes(comando.scheda)) return
      scheda = comando.scheda
      void apparato.impostazioni
        .leggi()
        .update(CHIAVE_SCHEDA, scheda, apparato.AmbitoImpostazione.Global)
      striscia?.aggiorna()
      break

    case 'mese':
      mese = primoDelMese(comando.primo)
      striscia?.aggiorna()
      break

    case 'giorno':
      // Una casella del mese premuta: la settimana sotto ci si sposta, e la
      // griglia si riallinea al mese di quel giorno — premere il 2 novembre
      // dalla coda di ottobre porta a novembre, che è dove si sta andando.
      riferimento = inizioSettimana(comando.data)
      mese = primoDelMese(comando.data)
      striscia?.aggiorna()
      break

    case 'ora':
      oraFissata = comando.lezioneId
      striscia?.aggiorna()
      break

    case 'apri':
      // Sull'ora, non sul calendario: chi preme una riga del widget vuole
      // quell'ora — l'appello, l'argomento, quel che resta da chiudere.
      ambiente?.apri({ tipo: 'naviga', vista: 'lezione', elementoId: comando.lezioneId })
      break

    case 'apriPendenze':
      ambiente?.apri({ tipo: 'naviga', vista: 'todo', elementoId: comando.classeId })
      break

    case 'registro':
      ambiente?.apri()
      break

    case 'apriDocumento':
      // Il widget acceso senza un anno aperto non è un guasto: è il primo
      // avvio, o un documento spostato. Da qui si apre il dialogo del sistema,
      // che è lo stesso del menu — un registro si sceglie in un posto solo.
      void apparato.comandi.esegui('registroDocenti.apriDocumento')
      break

    // Le quattro scritture. Quel che arriva dalla pagina non si controlla più
    // qui: lo misura lo schema della procedura, che è lo stesso per il
    // pannello, per la riga di comando e per questa striscia.
    case 'presenza':
      scrivi('ore.appello.riga', {
        lezioneId: comando.lezioneId,
        allievoId: comando.allievoId,
        stato: comando.stato,
      })
      break

    case 'presenzeTutti':
      scrivi('ore.appello.tutti', { lezioneId: comando.lezioneId, stato: comando.stato })
      break

    case 'argomenti':
      scrivi('ore.testi', { lezioneId: comando.lezioneId, argomenti: comando.testo })
      break

    case 'chiudiOra':
      scrivi('ore.stato', { lezioneId: comando.lezioneId, stato: 'svolta' })
      break

    case 'chiudi':
      // La X della striscia spegne anche l'impostazione: chiuderla e ritrovarla
      // al prossimo avvio vorrebbe dire che la X non l'ha chiusa davvero.
      spegniAgenda()
      break

    // Le misure non arrivano fin qui: le tratta `environment/agenda.ts`, che è
    // l'unico a sapere quanto è larga una cella di icone.
    case 'larghezza':
    case 'altezza':
    case 'sposta':
      break
  }
}

/** Se la striscia è accesa in questo momento. */
export function agendaVisibile (): boolean {
  return agendaAperta()
}

/**
 * Apre la striscia sul desktop. Torna falso se questa macchina non sa farlo —
 * cioè ovunque non sia Windows, e dove le chiamate della shell non rispondono.
 */
export function mostraAgenda (): boolean {
  if (!ambiente) return false
  if (!agendaDisponibile()) {
    void apparato.dialoghi.avvisa(
      'Registro: l’agenda sul desktop si può agganciare solo su Windows. ' +
        'Il calendario resta nel registro, e le prossime ore nel menu dell’icona accanto all’orologio.',
    )
    return false
  }

  riparti()
  striscia = apriAgenda({ contenuto, alComando, allaChiusura: chiusaDaSé })
  if (!striscia) return false

  void apparato.impostazioni.leggi().update(CHIAVE_ATTIVA, true, apparato.AmbitoImpostazione.Global)
  annuncia()
  return true
}

export function chiudiAgenda (): void {
  striscia?.chiudi()
  striscia = null
  annuncia()
}

/**
 * La spegne **e** se lo ricorda: è quel che serve quando a spegnerla è stato
 * un gesto.
 *
 * `chiudiAgenda` da sola non tocca l'impostazione, ed è giusto così: la si
 * chiama anche chiudendo il programma, e scrivere «spenta» uscendo vorrebbe
 * dire non ritrovarla mai più. Ma chi la spegne dal menu o dall'icona accanto
 * all'orologio la sta spegnendo davvero: senza questa riga la trovava
 * «Accesa» nelle impostazioni e se la ritrovava addosso al riavvio.
 */
export function spegniAgenda (): void {
  void apparato.impostazioni
    .leggi()
    .update(CHIAVE_ATTIVA, false, apparato.AmbitoImpostazione.Global)
  chiudiAgenda()
}

/** La striscia se n'è andata per conto suo: la finestra chiusa, o l'uscita. */
function chiusaDaSé (): void {
  striscia = null
  annuncia()
}

/** La scheda con cui riaprire: quella di prima, se è ancora una che esiste. */
function schedaRicordata (): SchedaAgenda {
  const scritta = apparato.impostazioni.leggi().get<string>(CHIAVE_SCHEDA, 'calendario')
  return SCHEDE.includes(scritta as SchedaAgenda) ? (scritta as SchedaAgenda) : 'calendario'
}

/**
 * Prepara il widget e — se lo si era lasciato acceso — lo riapre.
 *
 * Torna il modo di spegnerlo. Come per il vassoio, torna sempre qualcosa da
 * smaltire anche quando non c'è niente di acceso: chi chiama non ha un caso in
 * più da trattare.
 */
export function avviaAgenda (
  archivio: Archivio,
  apri: (navigazione?: MessaggioNavigazione) => void,
): apparato.Smaltitore {
  ambiente = { archivio, apri }
  scheda = schedaRicordata()
  riparti()

  // Il documento cambia — se ne apre uno, se ne apre un altro — e con lui
  // cambia l'anno: la settimana mostrata torna a quella giusta invece di
  // restare su una che apparteneva al registro di prima. L'ora fissata pure: il
  // suo id non esiste più da nessuna parte.
  let annoVisto = archivio.registro.annoCorrenteId
  const alDocumento = archivio.alCambiamento(() => {
    if (archivio.registro.annoCorrenteId === annoVisto) return
    annoVisto = archivio.registro.annoCorrenteId
    riparti()
  })

  const battito = setInterval(() => {
    if (!agendaAperta()) return
    // Passata la mezzanotte, la settimana guardata torna a essere quella di
    // oggi: vedi la testa del file.
    const adessoGiorno = oggi()
    if (adessoGiorno !== giornoVisto) {
      giornoVisto = adessoGiorno
      riparti()
    }
    striscia?.aggiorna()
  }, BATTITO)

  // Il registro cambia mentre il widget è lì: un'ora spostata, un appello
  // fatto, una lezione annullata. La striscia si aggiorna da sé — è metà del
  // motivo per cui vale la pena tenerla accesa.
  const alCambiamento = archivio.alCambiamento(() => striscia?.aggiorna())

  if (apparato.impostazioni.leggi().get<boolean>(CHIAVE_ATTIVA, false)) {
    // All'avvio non si avvisa nessuno se non si può fare: l'avviso è la
    // risposta a un gesto, e qui nessuno ha chiesto niente.
    if (agendaDisponibile()) {
      striscia = apriAgenda({ contenuto, alComando, allaChiusura: chiusaDaSé })
    }
  }

  // E da qui in avanti l'impostazione comanda davvero. Prima la si leggeva
  // soltanto qui, all'avvio: la spunta nelle impostazioni scriveva il file e
  // non apriva né chiudeva niente, e per vederla fare effetto bisognava
  // riavviare il programma senza che nessuno lo dicesse.
  // Le misure del widget si leggono quando nasce, e basta: cambiarle in pagina
  // non toccava la striscia già aperta, e al primo trascinamento il widget
  // riscriveva l'impostazione con la misura di prima — il valore digitato
  // spariva senza essere mai servito a niente. Si rinasce: è una finestra
  // piccola, e rifarla è l'unico modo di rileggerle tutte.
  const MISURE = [
    'registroDocenti.agenda.ancorata',
    'registroDocenti.agenda.celle',
    'registroDocenti.agenda.celleAltezza',
  ]

  const allImpostazione = apparato.impostazioni.alCambio((evento) => {
    if (MISURE.some((chiave) => evento.affectsConfiguration(chiave)) && striscia) {
      chiudiAgenda()
      if (agendaDisponibile()) {
        striscia = apriAgenda({ contenuto, alComando, allaChiusura: chiusaDaSé })
        annuncia()
      }
      return
    }
    if (!evento.affectsConfiguration(CHIAVE_ATTIVA)) return
    const vuole = apparato.impostazioni.leggi().get<boolean>(CHIAVE_ATTIVA, false)
    if (vuole && !striscia) {
      if (agendaDisponibile()) {
        striscia = apriAgenda({ contenuto, alComando, allaChiusura: chiusaDaSé })
        annuncia()
      }
      return
    }
    if (!vuole && striscia) chiudiAgenda()
  })

  return new apparato.Smaltitore(() => {
    clearInterval(battito)
    alDocumento.dispose()
    alCambiamento.dispose()
    allImpostazione.dispose()
    chiudiAgenda()
    ambiente = null
    conti = null
  })
}
