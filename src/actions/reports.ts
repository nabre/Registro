// I rapporti in PDF: il verbale di un'ora, il piano, le valutazioni, le
// presenze, il fascicolo di classe, la scheda di un allievo.
//
// Un'azione sola per tutti, e non sei: quel che cambia da un rapporto all'altro
// è il modello e i dati, e sono i due pezzi che stanno già altrove — in
// `templates/` il primo, in `domain/reportData.ts` il secondo. Qui resta il
// giro comune: trova di che cosa si parla, componi, scrivi, apri.

import * as apparato from 'apparato'

import { aggiornaComposizioni } from './compositions.js'
import { scriviGenerato } from '../data/exports.js'
import { PIF, frase } from '../domain/lexicon.js'
import {
  collocazioneDi,
  percorsoDi,
  precedentiDi,
  type Collocazione,
  type ContestoRapporto,
  type GenereRapporto,
} from '../domain/locations.js'
import {
  assicuraModelli,
  blocchi,
  cartellaModelli,
  immagineModello,
  modello,
  testi,
} from '../data/templates.js'
import { componiPdf } from '../data/reportsPdf.js'
import { contenutoDi } from '../data/store.js'
import {
  datiAllievo,
  datiFascicolo,
  datiFotoClasse,
  datiLezione,
  datiMomento,
  datiPiano,
  datiPresenze,
  datiValutazioni,
} from '../domain/reportData.js'
import {
  classeDelCorsoId,
  corsiDellaClasse,
  pianiDelCorso,
  registroDelCorso,
} from '../domain/courses.js'
import { ordinaAllievi } from '../domain/calculations.js'
import { formattaData, oggi, semestreDi } from '../domain/dates.js'
import type { Archivio } from '../data/archive.js'
import type { Corso, Lezione, Registro, Semestre } from '../domain/models.js'
import type { DatiRapporto } from '../domain/reports.js'
import { conMessaggio, rifiuta, type Parte } from './context.js'

/**
 * Che cosa serve per scrivere il file: il modello, i dati e dove va a finire.
 *
 * Il posto segue la regola dell'archivio — classe, ambito, documento, file — e
 * non e un vezzo: chi apre la cartella cerca «il verbale della 4a di
 * settembre», e in un elenco piatto di duecento PDF di sei classi diverse non
 * lo trova. `ambito` nullo vuol dire «della classe come gruppo», che è il caso
 * di tutto quel che attraversa i corsi: valutazioni, presenze, fascicolo.
 */
interface Preparato {
  modello: string
  dati: DatiRapporto
  /**
   * Dove va a finire. Non lo decide questo file: lo dice il dominio, che è
   * anche quel che legge la pagina Documenti per sapere se il foglio c'è già.
   */
  dove: Collocazione
}

/**
 * Le immagini di un rapporto, da dove stanno.
 *
 * Due posti e una funzione sola: un nome secco — `logo.jpg` — è impaginazione e
 * sta in `templates/`, accanto al modello che lo nomina; un percorso con delle
 * barre — `documentazione/DIC4a/foto/Rossi Mario.jpg` — è un file dell'anno,
 * ed è così che il ritratto di un allievo arriva su un foglio. Chi compone non
 * deve sapere la differenza: chiede un nome e riceve dei byte, o niente.
 *
 * Niente non è un errore: un logo che manca o una foto mai messa non sono un
 * motivo per non stampare il resto del foglio.
 */
export async function immagineDelRapporto (nome: string): Promise<Uint8Array | null> {
  if (!nome.includes('/')) return immagineModello(nome)
  return contenutoDi(nome)
}

/**
 * Compone un rapporto e lo scrive dove va, senza aprirlo.
 *
 * Sta a sé perché lo usano due strade: il pulsante che ne chiede uno, e la
 * chiusura di un'ora che ne rifà una ventina. Erano lo stesso codice, e
 * copiarlo avrebbe voluto dire due regole diverse su dove finiscono i file
 * appena una delle due fosse cambiata.
 */
async function scriviRapporto (
  preparato: Preparato,
): Promise<{ relativo: string } | { errore: string }> {
  // La cartella dei modelli si riempie al primo rapporto e non all'avvio:
  // chi non stampa mai non deve trovarsi file che non ha chiesto.
  await assicuraModelli()
  const impaginazione = await modello(preparato.modello)
  if (!impaginazione) return { errore: `Manca il modello «${preparato.modello}» in templates/.` }

  // Le parole comuni si aggiungono ai dati, non li sostituiscono: i conti li
  // ha già fatti il dominio, qui arriva soltanto come si chiamano le cose.
  const [parole, pezzi] = await Promise.all([testi(), blocchi()])
  const dati = {
    ...preparato.dati,
    frasi: parole.frasi,
    colonne: parole.colonne,
    blocchi: pezzi,
  }

  let byte: Uint8Array
  try {
    byte = await componiPdf(impaginazione, dati, immagineDelRapporto)
  } catch (errore) {
    return { errore: `Composizione del rapporto non riuscita: ${(errore as Error).message}` }
  }

  // Il nome ripete quel che dicono le cartelle — classe, documento, di chi —
  // apposta: un rapporto esce dalla sua cartella di continuo, lo si allega a
  // una mail o lo si copia sul desktop, e fuori di lì un «Presenze.pdf» non
  // dice più di che classe sia.
  const relativo = percorsoDi(preparato.dove)
  // Il file vero non serve a nessuno dei due chiamanti: il rapporto si guarda
  // nella cornice della pagina Documenti, che di un percorso relativo sa già
  // fare un indirizzo.
  if (!(await scriviGenerato(relativo, byte, precedentiDi(preparato.dove)))) {
    return { errore: 'Nessuna cartella di lavoro aperta.' }
  }
  return { relativo }
}

/**
 * I documenti che si rifanno quando un'ora viene segnata svolta.
 *
 * Sono tutti quelli del corso a cui l'ora appartiene: il verbale di
 * quell'ora, le presenze, la griglia dei voti, e la scheda di ognuno che
 * frequenta. Non è un capriccio di completezza — sono gli stessi documenti
 * che dopo ogni lezione sarebbero da rifare a mano, uno per uno, e nessuno lo
 * fa: la cartella di un corso restava ferma alla settimana in cui qualcuno si
 * era ricordato di stampare, e per sapere com'era andata bisognava riaprire il
 * registro. Rifacendoli qui, chi apre la cartella trova sempre lo stato di
 * ieri sera.
 *
 * Nessuno di questi si apre. Chiudere un'ora non deve far saltare fuori
 * quindici finestre del lettore di PDF: si scrivono, e chi li vuole li trova.
 */
function documentiDelCorso (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): Preparato[] {
  const classe = classeDelCorsoId(registro, corso.id)
  if (!classe) return []
  const dove = { corsoId: corso.id, semestreId: semestre?.id ?? null }

  return [
    // Prima i due del corso intero, poi uno per allievo: è l'ordine in cui si
    // guardano — si legge come è andata la classe, e poi si va a vedere chi.
    conPosto(registro, 'presenze', corso.id, dove, {
      modello: 'presenze-classe',
      dati: datiPresenze(registro, corso, semestre),
    }),
    conPosto(registro, 'valutazioni', corso.id, dove, {
      modello: 'valutazioni-classe',
      dati: datiValutazioni(registro, corso, semestre),
    }),
    // Tutti, anche chi si è ritirato. La sua scheda restava all'ultima volta
    // che era stata scritta: il giorno del ritiro il foglio non cambiava, e
    // continuava a leggersi come quello di chi frequenta — con i conti fermi
    // senza spiegare perché. Sono pochi fogli in più, e sono proprio quelli
    // che qualcuno chiede quando una persona se ne va.
    ...ordinaAllievi(classe.allievi).map((allievo) =>
      conPosto(registro, 'allievo', allievo.id, dove, {
        modello: 'scheda-allievo',
        dati: datiAllievo(registro, classe, allievo, semestre, corso),
      }),
    ),
    // Una scheda per prova, con la sua distribuzione. Entra nell'esportazione
    // completa e non solo nel pulsante suo: è il foglio che si guarda quando
    // una prova viene contestata, e in quel momento cercarlo e generarlo è
    // esattamente il lavoro che non si ha voglia di fare.
    ...registro.valutazioni
      .filter((momento) => momento.corsoId === corso.id && dentroIlPeriodo(semestre, momento.data))
      .map((momento) =>
        conPosto(registro, 'momento', momento.id, dove, {
          modello: 'momento-valutazione',
          dati: datiMomento(registro, momento),
        }),
      ),
  ].filter((preparato): preparato is Preparato => preparato !== null)
}

/**
 * Tutti i PDF che un corso sa produrre, non solo quelli che invecchiano da soli.
 *
 * `documentiDelCorso` è la fila dell'automazione: quel che si rifà a ogni ora
 * chiusa e a ogni modifica, cioè i fogli che cambiano quando cambia un voto o
 * un'assenza. Sono pochi apposta — rifare trenta verbali a ogni casella
 * dell'appello vorrebbe dire un registro che scrive su disco più di quanto
 * risponda.
 *
 * «Aggiorna tutto» è un'altra domanda: è il gesto di chi consegna, e vuole la
 * cartella *completa*. Qui si aggiungono i fogli che l'automazione lascia
 * stare: il verbale di ogni ora svolta, ogni piano lezione del corso, la parete
 * di ritratti, e il fascicolo della classe quando quella classe è una di cui si
 * è docente. Chi premeva «Aggiorna tutto» e poi trovava metà delle righe ancora
 * «da fare» doveva ripassarle a mano una per una, che è esattamente il giro che
 * questo pulsante esiste per togliere.
 *
 * Le ore non concluse restano fuori: il loro verbale uscirebbe senza appello e
 * senza consuntivo, e un foglio vuoto nella cartella si consegna per sbaglio.
 * È la stessa regola che la pagina Documenti scrive sul pulsante spento.
 */
function tuttoDelCorso (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): Preparato[] {
  const classe = classeDelCorsoId(registro, corso.id)
  if (!classe) return []
  const dove = { corsoId: corso.id, semestreId: semestre?.id ?? null }

  const verbali = registroDelCorso(registro, corso.id)
    .filter((l) => l.stato === 'svolta' && dentroIlPeriodo(semestre, l.data))
    .map((lezione) =>
      conPosto(registro, 'lezione', lezione.id, dove, {
        modello: 'verbale-lezione',
        dati: datiLezione(
          registro,
          lezione,
          registro.consegne.filter((c) => c.dataLezioneId === lezione.id),
        ),
      }),
    )

  // I piani non hanno periodo: sono la scaletta di quel corso, e valgono finché
  // il corso c'è.
  const piani = pianiDelCorso(registro, corso.id).map((piano) =>
    conPosto(registro, 'piano', piano.id, dove, {
      modello: 'piano-lezione',
      dati: datiPiano(registro, piano),
    }),
  )

  const facce = conPosto(registro, 'foto-classe', corso.id, dove, {
    modello: 'foto-classe',
    dati: datiFotoClasse(registro, classe),
  })

  // Il fascicolo è della classe e non del corso: lo si fa solo per le classi di
  // cui si è docente, che sono le uniche in cui quei dati esistono.
  const fascicolo = classe.docenteDiClasse
    ? conPosto(registro, 'fascicolo', classe.id, dove, {
        modello: 'fascicolo-classe',
        dati: datiFascicolo(registro, classe),
      })
    : null

  return [
    ...documentiDelCorso(registro, corso, semestre),
    ...verbali,
    ...piani,
    facce,
    fascicolo,
  ].filter((preparato): preparato is Preparato => preparato !== null)
}

/**
 * Il modello e i dati, più il posto che il dominio gli assegna.
 *
 * Niente posto vuol dire che quel che si stampava non c'è più — una prova
 * cancellata mentre l'automazione aspettava — e allora quel foglio salta.
 */
function conPosto (
  registro: Registro,
  genere: GenereRapporto,
  id: string,
  contesto: ContestoRapporto,
  resto: Omit<Preparato, 'dove'>,
): Preparato | null {
  const dove = collocazioneDi(registro, genere, id, contesto)
  return dove ? { ...resto, dove } : null
}

/** Il semestre scelto dentro l'anno di una classe, o l'anno intero. */
function semestreScelto (
  registro: Registro,
  classeId: string,
  semestreId: string | null,
): Semestre | null {
  const classe = registro.classi.find((c) => c.id === classeId) ?? null
  const anno = classe ? registro.anni.find((a) => a.id === classe.annoId) ?? null : null
  return anno?.semestri.find((s) => s.id === semestreId) ?? null
}

/** Se una data cade nel periodo scelto; senza semestre, l'anno intero. */
function dentroIlPeriodo (semestre: Semestre | null, data: string): boolean {
  return !semestre || (data >= semestre.inizio && data <= semestre.fine)
}

/**
 * Scrive una fila di rapporti e dice com'è andata.
 *
 * Uno alla volta e non tutti insieme: sono decine di composizioni di PDF, e
 * lanciarle in parallelo su una cartella sincronizzata è il modo di far
 * litigare OneDrive con se stesso mentre si scrive.
 */
async function scriviTutti (da: Preparato[]): Promise<{ scritti: number, errori: string[] }> {
  let scritti = 0
  const errori: string[] = []
  for (const preparato of da) {
    const esito = await scriviRapporto(preparato)
    if ('errore' in esito) errori.push(esito.errore)
    else scritti += 1
  }
  return { scritti, errori }
}

async function rapportiDiChiusura (
  registro: Registro,
  lezione: Lezione,
): Promise<{ scritti: number, errori: string[] }> {
  const corso = registro.corsi.find((c) => c.id === lezione.corsoId) ?? null
  const classe = classeDelCorsoId(registro, lezione.corsoId)
  if (!corso || !classe) return { scritti: 0, errori: [] }

  const anno = registro.anni.find((a) => a.id === classe.annoId) ?? null
  // Il semestre è quello in cui cade l'ora, non quello di oggi: chiudendo a
  // marzo un'ora di novembre si rifà la pagella del primo semestre, che è
  // quella a cui quell'ora appartiene.
  const semestre = anno ? semestreDi(anno, lezione.data) : null

  const verbale = conPosto(registro, 'lezione', lezione.id, { corsoId: corso.id }, {
    modello: 'verbale-lezione',
    dati: datiLezione(
      registro,
      lezione,
      registro.consegne.filter((c) => c.dataLezioneId === lezione.id),
    ),
  })

  return scriviTutti([
    ...(verbale ? [verbale] : []),
    ...documentiDelCorso(registro, corso, semestre),
  ])
}

/**
 * Rifà i documenti di un'ora appena chiusa, e lo dice quando ha finito.
 *
 * Non si aspetta: chi ha appena premuto «Segna come svolta» deve vedere l'ora
 * segnata subito, non venti secondi dopo. L'avviso arriva a cose fatte, ed è
 * l'unico segno che qualcosa è successo — un lavoro che nessuno ha visto
 * partire e di cui nessuno sa l'esito è un lavoro di cui non ci si fida.
 */
let coda: Promise<unknown> = Promise.resolve()

// I corsi che aspettano di essere rifatti, e il timer che li aspetta. Stanno
// accanto alla coda perché sono la stessa faccenda vista da due lati: la coda
// dice «una scrittura alla volta», questi dicono «e non prima che le mani si
// siano fermate».
// Quel che aspetta è una coppia — il corso e il periodo dei suoi fogli — e non
// un corso soltanto: i documenti di un corso sono divisi per semestre, e
// toccare un'ora di novembre mentre si è in aprile lascia da rifare i fogli di
// novembre, non quelli di adesso. La chiave tiene tutti e due, così la stessa
// coppia toccata dieci volte si rifà una volta sola e due periodi diversi non
// si mangiano a vicenda.
let inAttesa = new Map<string, { corsoId: string, semestreId: string | null }>()
let orologio: ReturnType<typeof setTimeout> | null = null
/** Da quando il più vecchio dei corsi in attesa aspetta: vedi `ATTESA_MASSIMA`. */
let attendeDa = 0

/** La chiave di un corso in un periodo: `corsoId|semestreId`, con l'anno intero vuoto. */
function chiaveAttesa (corsoId: string, semestreId: string | null): string {
  return `${corsoId}|${semestreId ?? ''}`
}

/** Il semestre in cui cade un giorno, per il corso dato; l'anno intero se non ce ne sono. */
function semestreDelCorso (registro: Registro, corso: Corso, giorno: string): Semestre | null {
  const classe = classeDelCorsoId(registro, corso.id)
  const anno = classe ? registro.anni.find((a) => a.id === classe.annoId) ?? null : null
  return anno ? semestreDi(anno, giorno) : null
}

// Si tiene l'**archivio**, non il registro — per la stessa ragione scritta in
// testa a `programmaRigenerazione`, e qui era rimasta da portare.
//
// Fra questa chiamata e il momento in cui la coda ci arriva passano decine di
// secondi: davanti ci possono stare le venticinque pagine di un'altra chiusura,
// e `ATTESA_MASSIMA` dice da sola che un minuto è una misura normale. In un
// minuto il documento può essere stato riletto — «Ricarica», «Apri un anno
// recente», OneDrive che sincronizza — e `leggiTutto` non aggiorna l'oggetto:
// lo **sostituisce**. Il riferimento catturato qui restava appeso allo stato di
// prima, e i verbali uscivano con i dati di allora, in silenzio.
export function aggiornaDopoChiusura (archivio: Archivio, lezione: Lezione): void {
  const registro = archivio.registro
  // Chi ha spento l'automazione non deve trovarsi dei file riscritti: i
  // pulsanti restano, e sono l'unica strada.
  if (registro.impostazioni.pdfAutomatici === 'mai') return
  const corso = registro.corsi.find((c) => c.id === lezione.corsoId) ?? null
  // Quale documento e quale anno: se al turno non sono più questi, la chiusura
  // parlava di un registro che adesso non è aperto.
  const documentoAtteso = archivio.documentoAperto?.toString() ?? null
  const annoAtteso = registro.annoCorrenteId
  // In fila con le chiusure di prima: segnando svolte tre ore di fila si
  // riscriverebbero gli stessi file — presenze, voti, schede sono del corso,
  // non dell'ora — e due scritture sovrapposte sullo stesso PDF lo lasciano a
  // metà.
  // Quel che la chiusura sta per rifare non lo rifà anche l'attesa: con
  // l'automazione a «ogni modifica» segnare svolta un'ora è una modifica come
  // le altre, e senza questa riga gli stessi venticinque PDF si scriverebbero
  // due volte a otto secondi di distanza. Si toglie la sola coppia che la
  // chiusura sta per rifare — quel corso, il periodo di quell'ora — e non tutto
  // quel che aspetta per quel corso: i fogli dell'altro semestre restano da
  // rifare. Se nel frattempo si tocca ancora quel corso, l'attesa se lo
  // riprende da sé.
  if (corso) {
    inAttesa.delete(
      chiaveAttesa(corso.id, semestreDelCorso(registro, corso, lezione.data)?.id ?? null),
    )
  }

  coda = coda
    .then(async () => {
      // Adesso, non allora: la stessa guardia di `programmaRigenerazione`, e
      // per lo stesso motivo. Un altro anno aperto vuol dire che questi fogli
      // parlavano di quello di prima, e scriverli adesso li metterebbe nella
      // cartella sbagliata. Si lasciano indietro.
      const ora = archivio.registro
      const documentoOra = archivio.documentoAperto?.toString() ?? null
      if (documentoOra !== documentoAtteso || ora.annoCorrenteId !== annoAtteso) {
        return { scritti: 0, errori: [] }
      }
      // L'ora ripresa dal registro di adesso: quella catturata è una fotografia
      // di allora, e nel frattempo l'appello può essere stato corretto.
      const suo = ora.lezioni.find((l) => l.id === lezione.id)
      if (!suo) return { scritti: 0, errori: [] }
      return rapportiDiChiusura(ora, suo)
    })
    .then((esito) => {
      if (esito.scritti === 0 && esito.errori.length === 0) return
      const dove = corso ? ` di ${corso.titolo}` : ''
      if (esito.errori.length > 0) {
        void apparato.dialoghi.avvisa(
          `Registro: ${esito.scritti} documenti${dove} aggiornati, ` +
            `${esito.errori.length} no. ${esito.errori[0]}`,
        )
        return
      }
      void apparato.dialoghi.informa(
        `Registro: ${esito.scritti} documenti${dove} aggiornati dopo la lezione del ${formattaData(lezione.data)}.`,
      )
    })
    // Una chiusura andata storta non deve bloccare la fila di quelle dopo.
    .catch((errore: unknown) => {
      void apparato.dialoghi.avvisa(
        `Registro: i documenti della lezione del ${formattaData(lezione.data)} non si sono potuti rifare: ` +
          `${errore instanceof Error ? errore.message : String(errore)}`,
      )
    })
}

// ------------------------------------------------------- a ogni modifica

/**
 * Quanto si aspetta prima di rifare i documenti di un corso appena toccato.
 *
 * Non è una prudenza generica: chi corregge un appello tocca venti caselle in
 * mezzo minuto, e rifare venticinque PDF a ogni casella vorrebbe dire un
 * registro che scrive su disco più di quanto risponda. Si aspetta che le mani
 * si fermino, e poi si fa una volta sola.
 */
const ATTESA_RIGENERAZIONE = 8000

/**
 * Quanto al massimo si rimanda, per quanto si continui a scrivere.
 *
 * L'attesa si azzera a ogni modifica, ed è quel che si vuole per un appello
 * corretto a raffica. Ma un'ora di lavoro senza mai una pausa di otto secondi
 * — una classe intera da valutare, un import — la rimandava all'infinito: la
 * cartella restava ferma per tutto il tempo, e nessuno lo diceva. Passato
 * questo tetto si scrive comunque, e chi continua a lavorare rimette in coda
 * quel che tocca dopo.
 */
const ATTESA_MASSIMA = 60000

/**
 * Rifà i documenti dei corsi toccati, quando chi scrive si è fermato.
 *
 * Silenzioso: a differenza della chiusura di un'ora — che è un gesto, e a un
 * gesto si risponde — questa succede da sé mentre si lavora, e un avviso ogni
 * volta che si mette un voto sarebbe rumore. Se qualcosa va storto lo si dice,
 * perché un'automazione che fallisce in silenzio è peggio di nessuna
 * automazione: si continuerebbe a credere che la cartella sia aggiornata.
 */
// Si tiene l'**archivio**, non il registro.
//
// Qui c'era scritto che l'archivio modifica sempre lo stesso oggetto, e quindi
// che allo scadere dell'attesa il riferimento catturato avrebbe avuto dentro
// le modifiche arrivate nel frattempo. Per le scritture è vero; per una
// **rilettura** no: `archivio.leggiTutto` fa `this.stato = normalizzaRegistro(…)`
// e *sostituisce* l'oggetto. Il riferimento vecchio resta appeso allo stato di
// prima, e fra gli otto secondi di attesa e i sessanta massimi una rilettura
// ci sta comoda — «Ricarica», «Apri un anno recente», un doppio clic, o
// l'osservatore che vede cambiare il file perché OneDrive l'ha sincronizzato.
// I PDF uscivano con i dati di prima, in silenzio, e in silenzio restavano.
//
// Rileggendo `archivio.registro` allo scadere si prende quel che il registro
// sa adesso — che è quel che si voleva — e le due identità catturate qui sotto
// impediscono la cosa peggiore: rifare i documenti di un anno dentro la
// cartella di un altro.
export function programmaRigenerazione (
  archivio: Archivio,
  corsiIds: string[],
  giorno: string | null = null,
): void {
  const registro = archivio.registro
  // Quale documento e quale anno: se allo scadere non sono più questi, il
  // lavoro programmato parlava di un registro che adesso non è aperto.
  const documentoAtteso = archivio.documentoAperto?.toString() ?? null
  const annoAtteso = registro.annoCorrenteId
  if (registro.impostazioni.pdfAutomatici !== 'sempre' || corsiIds.length === 0) return
  for (const id of corsiIds) {
    const corso = registro.corsi.find((c) => c.id === id)
    if (!corso) continue
    // Il periodo è quello dei dati toccati; quando la modifica non parla di un
    // giorno — un cognome cambiato, un piano — è quello in cui si sta
    // lavorando, che è il solo che si possa indovinare.
    const semestre = semestreDelCorso(registro, corso, giorno ?? oggi())
    inAttesa.set(chiaveAttesa(corso.id, semestre?.id ?? null), {
      corsoId: corso.id,
      semestreId: semestre?.id ?? null,
    })
  }
  if (inAttesa.size === 0) return

  const adesso = Date.now()
  if (attendeDa === 0) attendeDa = adesso
  // Si rimanda ancora solo se il più vecchio in coda non ha già aspettato
  // abbastanza: altrimenti il prossimo tasto premuto rimanderebbe di nuovo, e
  // chi scrive senza pause non vedrebbe mai rifare niente.
  const restano = Math.min(ATTESA_RIGENERAZIONE, Math.max(0, attendeDa + ATTESA_MASSIMA - adesso))

  if (orologio) clearTimeout(orologio)
  orologio = setTimeout(() => {
    orologio = null
    attendeDa = 0
    const daFare = [...inAttesa.values()]
    inAttesa = new Map()

    coda = coda
      .then(async () => {
        // Adesso, non allora: fra il momento in cui si è programmato e questo
        // il documento può essere stato riletto, e con lui sostituito l'oggetto.
        const ora = archivio.registro
        const documentoOra = archivio.documentoAperto?.toString() ?? null
        if (documentoOra !== documentoAtteso || ora.annoCorrenteId !== annoAtteso) {
          // Un altro anno è aperto: questi fogli parlavano di quello di prima,
          // e scriverli adesso vorrebbe dire metterli nella cartella sbagliata.
          // Si lasciano indietro; li rifarà la prima modifica di quell'anno.
          return
        }
        const da = daFare.flatMap(({ corsoId, semestreId }) => {
          const corso = ora.corsi.find((c) => c.id === corsoId)
          if (!corso) return []
          const classe = classeDelCorsoId(ora, corso.id)
          const anno = classe ? ora.anni.find((a) => a.id === classe.annoId) ?? null : null
          // Il semestre segnato quando la modifica è arrivata, ritrovato adesso:
          // è il periodo dei fogli che quella modifica ha reso vecchi.
          const semestre = anno?.semestri.find((s) => s.id === semestreId) ?? null
          return documentiDelCorso(ora, corso, semestre)
        })
        const esito = await scriviTutti(da)
        if (esito.errori.length > 0) {
          void apparato.dialoghi.avvisa(
            `Registro: ${esito.errori.length} documenti non si sono potuti rifare. ${esito.errori[0]}`,
          )
        }
      })
      .catch((errore: unknown) => {
        void apparato.dialoghi.avvisa(
          'Registro: i documenti non si sono potuti rifare: ' +
            `${errore instanceof Error ? errore.message : String(errore)}`,
        )
      })
  }, restano)
}

/**
 * Ferma la rigenerazione e aspetta quel che sta già scrivendo. Per `spegni()`.
 *
 * Due cose diverse, e servono tutte e due. Il **timer** si spegne senza
 * rimpianti: quel che aspettava non era ancora cominciato, e riscrivere dei PDF
 * mentre l'applicazione esce vorrebbe dire allungare l'uscita per dei fogli che
 * la prima modifica del prossimo avvio rifarà comunque. La **coda** invece si
 * aspetta: un rapporto scritto a metà è un PDF rotto dentro la cartella del
 * docente, e `scriviRapporto` non ha nessun modo di accorgersi domani che
 * quello di ieri era troncato.
 *
 * Torna una promessa che non rifiuta mai: la coda ha già i suoi `catch`, e uno
 * spegnimento non è il posto in cui far esplodere qualcosa.
 */
export function fermaRapporti (): Promise<void> {
  if (orologio) clearTimeout(orologio)
  orologio = null
  attendeDa = 0
  inAttesa = new Map()
  return coda.then(() => undefined, () => undefined)
}

export const rapporti = {
  /**
   * Compone un rapporto e dice dove lo ha messo.
   *
   * Non apre niente. Il PDF appena fatto si guarda nella cornice della pagina
   * Documenti — il lettore dell'applicazione, con pagine, zoom e stampa — e a
   * quella cornice basta il percorso, che torna nell'esito. Prima partiva il
   * programma del sistema: rifare cinque schede voleva dire cinque finestre da
   * ritrovare nella barra delle applicazioni, e la cornice restava ferma sul
   * foglio di prima proprio mentre lo si stava rifacendo.
   */
  'rapporto.genera': async (contesto, azione) => {
    const registro = contesto.registro
    // Dove va a finire lo dice il dominio, per tutti e otto i generi: qui
    // restano la scelta del modello e la raccolta dei dati.
    const dove = collocazioneDi(registro, azione.genere, azione.id, {
      corsoId: azione.corsoId ?? null,
      semestreId: azione.semestreId ?? null,
    })
    let pezzi: Omit<Preparato, 'dove'> | null = null

    if (azione.genere === 'lezione') {
      const lezione = registro.lezioni.find((l) => l.id === azione.id)
      if (!lezione) return rifiuta('Lezione non trovata.')
      const consegne = registro.consegne.filter((c) => c.dataLezioneId === lezione.id)
      pezzi = { modello: 'verbale-lezione', dati: datiLezione(registro, lezione, consegne) }
    }

    if (azione.genere === 'piano') {
      const piano = registro.piani.find((p) => p.id === azione.id)
      if (!piano) return rifiuta('Piano non trovato.')
      pezzi = { modello: 'piano-lezione', dati: datiPiano(registro, piano) }
    }

    // Valutazioni e presenze sono di un corso, e per lo stesso motivo: la media
    // in fondo alla griglia è la sua, e le ore che si contano sono le sue. Due
    // materie messe insieme danno una media che non è la media di niente e una
    // percentuale di presenza che non vale per nessuna delle due. Resta della
    // classe il solo fascicolo, che i corsi li attraversa per mestiere.
    if (azione.genere === 'valutazioni' || azione.genere === 'presenze') {
      const corso = registro.corsi.find((c) => c.id === azione.id)
      if (!corso) return rifiuta('Corso non trovato.')
      const semestre = semestreScelto(registro, corso.classeId, azione.semestreId ?? null)
      pezzi =
        azione.genere === 'presenze'
          ? { modello: 'presenze-classe', dati: datiPresenze(registro, corso, semestre) }
          : { modello: 'valutazioni-classe', dati: datiValutazioni(registro, corso, semestre) }
    }

    // Una prova sola, per esteso. Il periodo non lo si chiede: una prova ha la
    // sua data, e sta nel semestre in cui è caduta.
    if (azione.genere === 'momento') {
      const momento = registro.valutazioni.find((v) => v.id === azione.id)
      if (!momento) return rifiuta('Momento di valutazione non trovato.')
      pezzi = { modello: 'momento-valutazione', dati: datiMomento(registro, momento) }
    }

    if (azione.genere === 'fascicolo') {
      const classe = registro.classi.find((c) => c.id === azione.id)
      if (!classe) return rifiuta('Classe non trovata.')
      pezzi = { modello: 'fascicolo-classe', dati: datiFascicolo(registro, classe) }
    }

    // La parete di ritratti si chiede da un corso: le facce sono della classe,
    // ma il foglio si stampa per l'aula in cui si insegna, e va nella cartella
    // di quella materia con il resto di quel che ci si porta dentro.
    if (azione.genere === 'foto-classe') {
      const corso = registro.corsi.find((c) => c.id === azione.id)
      const classe = corso
        ? classeDelCorsoId(registro, corso.id)
        : registro.classi.find((c) => c.id === azione.id) ?? null
      if (!classe) return rifiuta('Classe non trovata.')
      pezzi = { modello: 'foto-classe', dati: datiFotoClasse(registro, classe) }
    }

    if (azione.genere === 'allievo') {
      const classe = registro.classi.find((c) => c.allievi.some((a) => a.id === azione.id)) ?? null
      const allievo = classe?.allievi.find((a) => a.id === azione.id) ?? null
      if (!classe || !allievo) return rifiuta(frase(PIF, 'trovato', { nega: true }))
      const semestre = semestreScelto(registro, classe.id, azione.semestreId ?? null)
      // Il corso lo dice chi chiede la scheda. Se non lo dice, e la classe ne
      // ha uno solo, è quello: chiederlo sarebbe una domanda con una risposta
      // sola. Con più corsi e nessuno indicato la scheda resta di tutta la
      // classe, e va dove vanno le cose che i corsi li attraversano — la
      // collocazione fa la stessa scelta, e sono l'una il posto dell'altra.
      const suoi = corsiDellaClasse(registro, classe.id)
      const corso =
        suoi.find((c) => c.id === azione.corsoId) ?? (suoi.length === 1 ? suoi[0] : null)
      pezzi = {
        modello: 'scheda-allievo',
        dati: datiAllievo(registro, classe, allievo, semestre, corso),
      }
    }

    if (!pezzi || !dove) return rifiuta('Rapporto sconosciuto.')

    const esito = await scriviRapporto({ ...pezzi, dove })
    if ('errore' in esito) return rifiuta(esito.errore)

    return conMessaggio(`Rapporto scritto in ${esito.relativo}.`, 'info', {
      documento: esito.relativo,
    })
  },

  /**
   * Tutto quel che un corso sa stampare, o tutti i corsi insieme.
   *
   * Tutto vuol dire tutto: presenze, griglia dei voti, una scheda per ogni
   * allievo e per ogni prova, il verbale di ogni ora svolta, ogni piano
   * lezione, la parete di ritratti, e il fascicolo delle classi di cui si è
   * docente. È la cartella che si consegna a fine semestre, e un pulsante che
   * ne riempiva metà lasciava il resto da ripassare riga per riga.
   *
   * Non si apre niente. Sono decine di file, e farne saltare fuori venti
   * finestre del lettore di PDF sarebbe peggio che non averli: il messaggio
   * dice dove sono andati, e chi li vuole li trova nella cartella.
   *
   * Va avanti anche se uno fallisce: con venticinque schede, fermarsi alla
   * prima che va storta vorrebbe dire perdere le ventiquattro che sarebbero
   * uscite bene. Gli errori si contano e si dicono.
   */
  'rapporto.completo': async (contesto, azione) => {
    const registro = contesto.registro
    // Senza un corso indicato: quelli dell'anno aperto, non tutti quelli che il
    // documento contiene. Un documento con dentro tre anni faceva partire le
    // cartelle di tutti e tre — centinaia di fogli, e due terzi di anni chiusi
    // che nessuno stava chiedendo — e il periodo scelto, che è di quest'anno,
    // negli altri non voleva dire niente.
    const dellAnno = (corso: Corso): boolean => {
      const classe = classeDelCorsoId(registro, corso.id)
      return Boolean(classe) && classe?.annoId === registro.annoCorrenteId
    }
    const scelti = azione.corsoId
      ? registro.corsi.filter((c) => c.id === azione.corsoId)
      : registro.corsi.filter(dellAnno)
    if (scelti.length === 0) {
      return rifiuta(
        azione.corsoId ? 'Corso non trovato.' : 'Nessun corso da esportare in quest’anno.',
      )
    }

    const da = scelti.flatMap((corso) => {
      const classe = classeDelCorsoId(registro, corso.id)
      const anno = classe ? registro.anni.find((a) => a.id === classe.annoId) ?? null : null
      // Il semestre lo dice chi chiede, e vale per tutti i corsi del giro: un
      // pacchetto di fogli che mescola due periodi non lo consegna nessuno.
      const semestre = anno?.semestri.find((s) => s.id === azione.semestreId) ?? null
      return tuttoDelCorso(registro, corso, semestre)
    })

    // Lo stesso foglio non si scrive due volte: due corsi della stessa classe
    // chiedono lo stesso fascicolo, e scriverlo due volte vuol dire comporre
    // due PDF identici uno sopra l'altro.
    const unaVolta = new Map<string, Preparato>()
    for (const preparato of da) unaVolta.set(percorsoDi(preparato.dove), preparato)

    const esito = await scriviTutti([...unaVolta.values()])
    // E i fascicoli, che sono fatti con quei fogli: rifarli dopo vuol dire
    // ritrovarli con dentro le schede appena scritte, invece che quelle di
    // stamattina. Chi ne ha uno in mano lo consegna: è la copia che conta.
    const fascicoli = await aggiornaComposizioni()
    const dove = scelti.length === 1 ? ` di ${scelti[0].titolo}` : ` di ${scelti.length} corsi`
    const conFascicoli = fascicoli > 0 ? `, e ${fascicoli} fascicoli rifatti` : ''
    // Zero scritti non e' un avviso, e' un fallimento: con venticinque schede e
    // venticinque errori la busta usciva «riuscita, con un avviso». I due
    // gemelli lo facevano gia' bene — `rapporto.genera` qui sopra e le tre
    // `esporta.*` in `actions/system.ts` rifiutano.
    if (esito.scritti === 0 && esito.errori.length > 0) {
      return rifiuta(`Nessun documento${dove} scritto. ${esito.errori[0]}`)
    }
    if (esito.errori.length > 0) {
      return conMessaggio(
        `${esito.scritti} documenti${dove} scritti, ${esito.errori.length} no. ${esito.errori[0]}`,
        'avviso',
      )
    }
    return conMessaggio(
      `${esito.scritti} documenti${dove} scritti nella cartella dei dati${conFascicoli}.`,
      'info',
    )
  },

  /** Apre la cartella dei modelli: si modificano lì, e cambiano tutti i rapporti. */
  'rapporto.modelli': async (_contesto, _azione) => {
    await assicuraModelli()
    const cartella = cartellaModelli()
    if (!cartella) return rifiuta('Nessuna cartella di lavoro aperta.')
    await apparato.comandi.esegui('apparato.mostraNellaCartella', apparato.Uri.joinPath(cartella, '_base.tpl'))
    return conMessaggio(
      'I modelli dei rapporti sono in templates/: intestazione e piè di pagina stanno in _base.tpl.',
      'info',
    )
  },
} satisfies Parte
