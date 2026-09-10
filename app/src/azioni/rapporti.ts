// I rapporti in PDF: il verbale di un'ora, il piano, le valutazioni, le
// presenze, il fascicolo di classe, la scheda di un allievo.
//
// Un'azione sola per tutti, e non sei: quel che cambia da un rapporto all'altro
// è il modello e i dati, e sono i due pezzi che stanno già altrove — in
// `templates/` il primo, in `dominio/datiRapporti.ts` il secondo. Qui resta il
// giro comune: trova di che cosa si parla, componi, scrivi, apri.

import * as vscode from 'vscode'

import { nomeFileArchivio, percorsoEsportazione } from '../dati/archiviazione.js'
import { scriviGenerato } from '../dati/esportazioni.js'
import { DOCUMENTO_SCHEDE, PIF, frase } from '../dominio/lessico.js'
import { documentoPiano } from '../dati/archiviazione.js'
import { apriConIlSistema } from '../dati/apertura.js'
import {
  assicuraModelli,
  blocchi,
  cartellaModelli,
  immagineModello,
  modello,
  testi,
} from '../dati/modelli.js'
import { componiPdf } from '../dati/rapportiPdf.js'
import { fileAllegato } from '../dati/percorsi.js'
import {
  datiAllievo,
  datiFascicolo,
  datiFotoClasse,
  datiLezione,
  datiMomento,
  datiPiano,
  datiPresenze,
  datiValutazioni,
} from '../dominio/datiRapporti.js'
import { classeDelCorsoId, corsiDellaClasse, materiaDelCorso } from '../dominio/corsi.js'
import { allieviAttivi, nomeCompleto } from '../dominio/calcoli.js'
import { dataNelNome, formattaData, oggi, semestreDi } from '../dominio/date.js'
import type { Corso, Lezione, Registro, Semestre } from '../dominio/modelli.js'
import type { DatiRapporto } from '../dominio/rapporti.js'
import { conMessaggio, rifiuta, type Parte } from './contesto.js'

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
  classe: string
  ambito: string | null
  documento: string
  /** Di chi è il foglio, quando è di qualcuno: finisce nel nome del file. */
  chi?: string | null
  /**
   * La persona di cui parla, quando ne parla di una sola: la sua roba va nella
   * cartella sua.
   *
   * Sta a sé e non si deduce da `chi`, che a volte è il titolo di una prova:
   * una scheda personale e la scheda di una verifica sono tutte e due «di
   * qualcosa», ma solo la prima è di qualcuno.
   */
  allievo?: string | null
  /** Che cosa distingue questo file dagli altri dello stesso documento. */
  dettaglio?: string | null
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
async function immagineDelRapporto (nome: string): Promise<Uint8Array | null> {
  if (!nome.includes('/')) return immagineModello(nome)
  const file = fileAllegato(nome)
  if (!file) return null
  try {
    return await vscode.workspace.fs.readFile(file)
  } catch {
    return null
  }
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
): Promise<{ relativo: string, file: vscode.Uri } | { errore: string }> {
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
  const relativo = percorsoEsportazione(
    preparato.classe,
    preparato.ambito,
    nomeFileArchivio(
      preparato.classe,
      preparato.chi ?? null,
      preparato.documento,
      preparato.dettaglio ?? null,
      'pdf',
    ),
    preparato.allievo ?? null,
  )
  const file = await scriviGenerato(relativo, byte)
  if (!file) return { errore: 'Nessuna cartella di lavoro aperta.' }
  return { relativo, file }
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
  const ambito = materiaDelCorso(registro, corso)?.nome ?? corso.titolo
  const periodo = semestre?.etichetta ?? 'anno intero'

  return [
    // Prima i due del corso intero, poi uno per allievo: è l'ordine in cui si
    // guardano — si legge come è andata la classe, e poi si va a vedere chi.
    {
      modello: 'presenze-classe',
      dati: datiPresenze(registro, corso, semestre),
      classe: classe.nome,
      ambito,
      documento: 'Presenze',
      dettaglio: periodo,
    },
    {
      modello: 'valutazioni-classe',
      dati: datiValutazioni(registro, corso, semestre),
      classe: classe.nome,
      ambito,
      documento: 'Valutazioni',
      dettaglio: periodo,
    },
    ...allieviAttivi(classe).map((allievo) => ({
      modello: 'scheda-allievo',
      dati: datiAllievo(registro, classe, allievo, semestre, corso),
      classe: classe.nome,
      ambito,
      documento: DOCUMENTO_SCHEDE,
      chi: nomeCompleto(allievo),
      allievo: nomeCompleto(allievo),
      dettaglio: periodo,
    })),
    // Una scheda per prova, con la sua distribuzione. Entra nell'esportazione
    // completa e non solo nel pulsante suo: è il foglio che si guarda quando
    // una prova viene contestata, e in quel momento cercarlo e generarlo è
    // esattamente il lavoro che non si ha voglia di fare.
    ...registro.valutazioni
      .filter((momento) => momento.corsoId === corso.id && dentroIlPeriodo(semestre, momento.data))
      .map((momento) => ({
        modello: 'momento-valutazione',
        dati: datiMomento(registro, momento),
        classe: classe.nome,
        ambito,
        documento: 'Prove',
        // Titolo e data insieme: due verifiche possono chiamarsi uguale — «Test
        // 1» a settembre e a gennaio — e senza la data il secondo file
        // coprirebbe il primo.
        chi: momento.titolo,
        dettaglio: dataNelNome(momento.data),
      })),
  ]
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

  return scriviTutti([
    {
      modello: 'verbale-lezione',
      dati: datiLezione(
        registro,
        lezione,
        registro.consegne.filter((c) => c.dataLezioneId === lezione.id),
      ),
      classe: classe.nome,
      ambito: materiaDelCorso(registro, corso)?.nome ?? corso.titolo,
      documento: 'Verbali',
      dettaglio: dataNelNome(lezione.data),
    },
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
let inAttesa = new Set<string>()
let orologio: ReturnType<typeof setTimeout> | null = null

export function aggiornaDopoChiusura (registro: Registro, lezione: Lezione): void {
  // Chi ha spento l'automazione non deve trovarsi dei file riscritti: i
  // pulsanti restano, e sono l'unica strada.
  if (registro.impostazioni.pdfAutomatici === 'mai') return
  const corso = registro.corsi.find((c) => c.id === lezione.corsoId) ?? null
  // In fila con le chiusure di prima: segnando svolte tre ore di fila si
  // riscriverebbero gli stessi file — presenze, voti, schede sono del corso,
  // non dell'ora — e due scritture sovrapposte sullo stesso PDF lo lasciano a
  // metà.
  // Quel che la chiusura sta per rifare non lo rifà anche l'attesa: con
  // l'automazione a «ogni modifica» segnare svolta un'ora è una modifica come
  // le altre, e senza questa riga gli stessi venticinque PDF si scriverebbero
  // due volte a otto secondi di distanza. Se nel frattempo si tocca ancora
  // quel corso, l'attesa se lo riprende da sé.
  inAttesa.delete(lezione.corsoId)

  coda = coda
    .then(() => rapportiDiChiusura(registro, lezione))
    .then((esito) => {
      if (esito.scritti === 0 && esito.errori.length === 0) return
      const dove = corso ? ` di ${corso.titolo}` : ''
      if (esito.errori.length > 0) {
        void vscode.window.showWarningMessage(
          `Registro: ${esito.scritti} documenti${dove} aggiornati, ` +
            `${esito.errori.length} no. ${esito.errori[0]}`,
        )
        return
      }
      void vscode.window.showInformationMessage(
        `Registro: ${esito.scritti} documenti${dove} aggiornati dopo la lezione del ${formattaData(lezione.data)}.`,
      )
    })
    // Una chiusura andata storta non deve bloccare la fila di quelle dopo.
    .catch((errore: unknown) => {
      void vscode.window.showWarningMessage(
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
 * Rifà i documenti dei corsi toccati, quando chi scrive si è fermato.
 *
 * Silenzioso: a differenza della chiusura di un'ora — che è un gesto, e a un
 * gesto si risponde — questa succede da sé mentre si lavora, e un avviso ogni
 * volta che si mette un voto sarebbe rumore. Se qualcosa va storto lo si dice,
 * perché un'automazione che fallisce in silenzio è peggio di nessuna
 * automazione: si continuerebbe a credere che la cartella sia aggiornata.
 */
// Il registro si tiene per riferimento e non se ne copia lo stato: l'archivio
// modifica sempre lo stesso oggetto, quindi allo scadere dell'attesa qui
// dentro c'è quel che il registro sa adesso — comprese le modifiche arrivate
// mentre si aspettava, che sono proprio il motivo per cui si aspetta.
export function programmaRigenerazione (registro: Registro, corsiIds: string[]): void {
  if (registro.impostazioni.pdfAutomatici !== 'sempre' || corsiIds.length === 0) return
  for (const id of corsiIds) inAttesa.add(id)

  if (orologio) clearTimeout(orologio)
  orologio = setTimeout(() => {
    orologio = null
    const daFare = [...inAttesa]
    inAttesa = new Set()

    coda = coda
      .then(async () => {
        const da = daFare.flatMap((id) => {
          const corso = registro.corsi.find((c) => c.id === id)
          if (!corso) return []
          const classe = classeDelCorsoId(registro, corso.id)
          const anno = classe ? registro.anni.find((a) => a.id === classe.annoId) ?? null : null
          // Il semestre di oggi: è il periodo in cui si sta lavorando, ed è
          // quello che si vuole trovare aggiornato aprendo la cartella.
          const semestre = anno ? semestreDi(anno, oggi()) : null
          return documentiDelCorso(registro, corso, semestre)
        })
        const esito = await scriviTutti(da)
        if (esito.errori.length > 0) {
          void vscode.window.showWarningMessage(
            `Registro: ${esito.errori.length} documenti non si sono potuti rifare. ${esito.errori[0]}`,
          )
        }
      })
      .catch((errore: unknown) => {
        void vscode.window.showWarningMessage(
          `Registro: i documenti non si sono potuti rifare: ` +
            `${errore instanceof Error ? errore.message : String(errore)}`,
        )
      })
  }, ATTESA_RIGENERAZIONE)
}

export const rapporti = {
  /**
   * Compone un rapporto e lo apre.
   *
   * Il PDF si apre con il programma del sistema, che è quello che il docente
   * usa già per i PDF: il registro non ha un visualizzatore dentro, e non ha
   * motivo di averne uno.
   */
  'rapporto.genera': async (contesto, azione) => {
    const registro = contesto.registro
    let preparato: Preparato | null = null

    if (azione.genere === 'lezione') {
      const lezione = registro.lezioni.find((l) => l.id === azione.id)
      if (!lezione) return rifiuta('Lezione non trovata.')
      const classe = classeDelCorsoId(registro, lezione.corsoId)
      const corso = registro.corsi.find((c) => c.id === lezione.corsoId) ?? null
      const consegne = registro.consegne.filter((c) => c.dataLezioneId === lezione.id)
      preparato = {
        modello: 'verbale-lezione',
        dati: datiLezione(registro, lezione, consegne),
        classe: classe?.nome ?? 'senza classe',
        ambito: materiaDelCorso(registro, corso)?.nome ?? corso?.titolo ?? null,
        documento: 'Verbali',
        dettaglio: dataNelNome(lezione.data),
      }
    }

    if (azione.genere === 'piano') {
      const piano = registro.piani.find((p) => p.id === azione.id)
      if (!piano) return rifiuta('Piano non trovato.')
      const classe = piano.corsoId ? classeDelCorsoId(registro, piano.corsoId) : null
      const corso = piano.corsoId ? registro.corsi.find((c) => c.id === piano.corsoId) ?? null : null
      preparato = {
        modello: 'piano-lezione',
        dati: datiPiano(registro, piano),
        classe: classe?.nome ?? 'senza classe',
        ambito: materiaDelCorso(registro, corso)?.nome ?? corso?.titolo ?? null,
        documento: 'Piani',
        dettaglio: documentoPiano(registro, piano),
      }
    }

    // Valutazioni e presenze sono di un corso, e per lo stesso motivo: la media
    // in fondo alla griglia è la sua, e le ore che si contano sono le sue. Due
    // materie messe insieme danno una media che non è la media di niente e una
    // percentuale di presenza che non vale per nessuna delle due. Resta della
    // classe il solo fascicolo, che i corsi li attraversa per mestiere.
    if (azione.genere === 'valutazioni') {
      const corso = registro.corsi.find((c) => c.id === azione.id)
      if (!corso) return rifiuta('Corso non trovato.')
      const classe = classeDelCorsoId(registro, corso.id)
      const anno = classe ? registro.anni.find((a) => a.id === classe.annoId) : null
      const semestre = anno?.semestri.find((s) => s.id === azione.semestreId) ?? null
      preparato = {
        modello: 'valutazioni-classe',
        dati: datiValutazioni(registro, corso, semestre),
        classe: classe?.nome ?? 'senza classe',
        ambito: materiaDelCorso(registro, corso)?.nome ?? corso.titolo,
        documento: 'Valutazioni',
        dettaglio: semestre?.etichetta ?? 'anno intero',
      }
    }

    if (azione.genere === 'presenze') {
      const corso = registro.corsi.find((c) => c.id === azione.id)
      if (!corso) return rifiuta('Corso non trovato.')
      const classe = classeDelCorsoId(registro, corso.id)
      const anno = classe ? registro.anni.find((a) => a.id === classe.annoId) : null
      const semestre = anno?.semestri.find((s) => s.id === azione.semestreId) ?? null
      preparato = {
        modello: 'presenze-classe',
        dati: datiPresenze(registro, corso, semestre),
        classe: classe?.nome ?? 'senza classe',
        ambito: materiaDelCorso(registro, corso)?.nome ?? corso.titolo,
        documento: 'Presenze',
        // Il periodo nel nome, come per le valutazioni: sono due documenti
        // diversi — la presenza del primo semestre non è quella del secondo —
        // e chiamandoli uguali il secondo avrebbe coperto il primo alla prima
        // stampa dopo gennaio. La data di composizione, che qui c'era prima,
        // faceva l'errore opposto: un file nuovo a ogni stampa.
        dettaglio: semestre?.etichetta ?? 'anno intero',
      }
    }

    // Una prova sola, per esteso. Il periodo non lo si chiede: una prova ha la
    // sua data, e sta nel semestre in cui è caduta.
    if (azione.genere === 'momento') {
      const momento = registro.valutazioni.find((v) => v.id === azione.id)
      if (!momento) return rifiuta('Momento di valutazione non trovato.')
      const corso = registro.corsi.find((c) => c.id === momento.corsoId) ?? null
      const classe = corso ? classeDelCorsoId(registro, corso.id) : null
      preparato = {
        modello: 'momento-valutazione',
        dati: datiMomento(registro, momento),
        classe: classe?.nome ?? 'senza classe',
        ambito: corso ? materiaDelCorso(registro, corso)?.nome ?? corso.titolo : null,
        documento: 'Prove',
        chi: momento.titolo,
        dettaglio: dataNelNome(momento.data),
      }
    }

    if (azione.genere === 'fascicolo') {
      const classe = registro.classi.find((c) => c.id === azione.id)
      if (!classe) return rifiuta('Classe non trovata.')
      preparato = {
        modello: 'fascicolo-classe',
        dati: datiFascicolo(registro, classe),
        classe: classe.nome,
        // Il fascicolo è l'unico che resta del docente di classe: recapiti,
        // documenti e comunicazioni non appartengono a una materia.
        ambito: null,
        documento: 'Fascicolo',
        dettaglio: dataNelNome(oggi()),
      }
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
      preparato = {
        modello: 'foto-classe',
        dati: datiFotoClasse(registro, classe),
        classe: classe.nome,
        ambito: corso ? materiaDelCorso(registro, corso)?.nome ?? corso.titolo : null,
        documento: 'Foto della classe',
        dettaglio: dataNelNome(oggi()),
      }
    }

    if (azione.genere === 'allievo') {
      const classe = registro.classi.find((c) => c.allievi.some((a) => a.id === azione.id)) ?? null
      const allievo = classe?.allievi.find((a) => a.id === azione.id) ?? null
      if (!classe || !allievo) return rifiuta(frase(PIF, 'trovato', { nega: true }))
      const anno = registro.anni.find((a) => a.id === classe.annoId)
      const semestre = anno?.semestri.find((s) => s.id === azione.semestreId) ?? null
      // Il corso lo dice chi chiede la scheda. Se non lo dice, e la classe ne
      // ha uno solo, è quello: chiederlo sarebbe una domanda con una risposta
      // sola. Con più corsi e nessuno indicato la scheda resta di tutta la
      // classe, e va dove vanno le cose che i corsi li attraversano.
      const suoi = corsiDellaClasse(registro, classe.id)
      const corso =
        suoi.find((c) => c.id === azione.corsoId) ?? (suoi.length === 1 ? suoi[0] : null)
      preparato = {
        modello: 'scheda-allievo',
        dati: datiAllievo(registro, classe, allievo, semestre, corso),
        classe: classe.nome,
        ambito: corso ? materiaDelCorso(registro, corso)?.nome ?? corso.titolo : null,
        documento: DOCUMENTO_SCHEDE,
        chi: nomeCompleto(allievo),
        allievo: nomeCompleto(allievo),
        dettaglio: semestre?.etichetta ?? 'anno intero',
      }
    }

    if (!preparato) return rifiuta('Rapporto sconosciuto.')

    const esito = await scriviRapporto(preparato)
    if ('errore' in esito) return rifiuta(esito.errore)

    const aperto = await apriConIlSistema(esito.file)
    return conMessaggio(
      aperto
        ? `Rapporto scritto in ${esito.relativo}.`
        : `Rapporto scritto in ${esito.relativo}, ma non si è potuto aprire da qui: sta nella cartella dei dati.`,
      'info',
    )
  },

  /**
   * Tutti i documenti di un corso, o di tutti i corsi: il globale e uno per
   * allievo.
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
    const scelti = azione.corsoId
      ? registro.corsi.filter((c) => c.id === azione.corsoId)
      : registro.corsi
    if (scelti.length === 0) {
      return rifiuta(azione.corsoId ? 'Corso non trovato.' : 'Nessun corso da esportare.')
    }

    const da = scelti.flatMap((corso) => {
      const classe = classeDelCorsoId(registro, corso.id)
      const anno = classe ? registro.anni.find((a) => a.id === classe.annoId) ?? null : null
      // Il semestre lo dice chi chiede, e vale per tutti i corsi del giro: un
      // pacchetto di fogli che mescola due periodi non lo consegna nessuno.
      const semestre = anno?.semestri.find((s) => s.id === azione.semestreId) ?? null
      return documentiDelCorso(registro, corso, semestre)
    })

    const esito = await scriviTutti(da)
    const dove = scelti.length === 1 ? ` di ${scelti[0].titolo}` : ` di ${scelti.length} corsi`
    if (esito.errori.length > 0) {
      return conMessaggio(
        `${esito.scritti} documenti${dove} scritti, ${esito.errori.length} no. ${esito.errori[0]}`,
        'avviso',
      )
    }
    return conMessaggio(`${esito.scritti} documenti${dove} scritti nella cartella dei dati.`, 'info')
  },

  /** Apre la cartella dei modelli: si modificano lì, e cambiano tutti i rapporti. */
  'rapporto.modelli': async (_contesto, _azione) => {
    await assicuraModelli()
    const cartella = cartellaModelli()
    if (!cartella) return rifiuta('Nessuna cartella di lavoro aperta.')
    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.joinPath(cartella, '_base.tpl'))
    return conMessaggio(
      'I modelli dei rapporti sono in templates/: intestazione e piè di pagina stanno in _base.tpl.',
      'info',
    )
  },
} satisfies Parte
