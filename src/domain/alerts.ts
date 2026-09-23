// Chi è oltre la soglia di assenza, e perché è una pendenza.
//
// `Impostazioni.sogliaAssenza` esisteva già, ed era un numero senza
// conseguenza: compariva su due rapporti stampati — la scheda della persona e
// il foglio delle presenze — e da nessun'altra parte. Chi non stampava quei
// fogli non sapeva di doverli stampare, che è esattamente il caso in cui una
// soglia servirebbe. Una soglia che non produce un gesto è una soglia che si
// guarda una volta.
//
// Qui la soglia diventa una **pendenza**: chi la supera compare fra le cose da
// fare della sua classe, accanto alle assenze da far firmare e alle prove da
// riconsegnare, e ci resta finché la percentuale non scende. Non manda niente a
// nessuno e non scrive niente nel registro: dice che c'è un caso da guardare, e
// dove.
//
// ## Quale delle due percentuali
//
// Il registro ne tiene due, e la differenza qui conta (vedi `matriceCorso`):
//
//   `assenza`   — UD perse su quelle che l'orario **prevedeva** nel periodo.
//                 È la cifra che finisce nei rapporti da controfirmare: dice
//                 quanto si è perso di quel che si doveva fare.
//   `presenza`  — presenze sulle UD con l'**appello fatto**. Dice quanto quel
//                 primo numero è affidabile.
//
// La segnalazione nasce dalla prima, che è quella con cui la scuola ragiona; e
// **preme** solo quando anche la seconda è oltre soglia. Un semestre con metà
// appelli dimenticati fa salire la prima da sola: è un caso da guardare, ma non
// è ancora un caso da segnalare a qualcuno, ed è giusto che si veda la
// differenza invece di trattarli allo stesso modo.
//
// ## Che cosa manca ancora (LACUNE, voce 6)
//
// Il registro di chi è già stato segnalato e quando. Serve perché la seconda
// segnalazione non è come la prima, e perché quel che si è già fatto non si
// rifà: è un oggetto del documento d'anno, e non un conto che si rifà a ogni
// apertura come questo.

import { allieviAttivi, nomeCompleto, ordinaAllievi } from './calculations.js'
import { classeDelCorsoId, materiaDelCorso, registroDelCorso } from './courses.js'
import { matriceCorso } from './courseMatrix.js'
import type {
  Allievo,
  AnnoScolastico,
  Classe,
  Corso,
  Iso,
  Registro,
  Semestre,
} from './models.js'
import { udPrevisteDaOrario } from './timetable.js'

/**
 * Se una quota di assenza supera la soglia.
 *
 * Una funzione sola per tutti: i due rapporti stampati, la pendenza, e quel che
 * verrà. Due conti scritti in due posti sono due occasioni di segnalare persone
 * diverse — e il giorno in cui non tornano, chi legge non sa a quale credere.
 *
 * Soglia a zero vuol dire spenta: c'è chi quel conto lo fa altrove e non vuole
 * né avvisi sui fogli né pendenze in elenco.
 */
export function oltreSoglia (soglia: number, quota: number | null): boolean {
  return soglia > 0 && quota !== null && quota * 100 > soglia
}

/** Una persona oltre la soglia, in un corso e in un periodo. */
export interface SegnalazioneAssenza {
  allievoId: string
  /** 'Rossi Maria': è come si cerca nell'elenco. */
  allievo: string
  classeId: string
  classe: string
  corsoId: string
  /** 'Matematica', o il titolo del corso se la materia non c'è più. */
  corso: string
  /** Il periodo su cui è stato fatto il conto: 'primo semestre', 'anno intero'. */
  periodo: string
  /** Quota di assenza sulle UD previste, 0–1: è quella che fa scattare la soglia. */
  assenza: number
  /** La stessa in punti percentuali, arrotondata: è quel che si legge. */
  percento: number
  /** Di quanto supera la soglia, in punti percentuali. */
  scarto: number
  udAssenza: number
  udPreviste: number
  /**
   * Vero quando anche la percentuale sulle UD con l'appello fatto è oltre
   * soglia: allora il numero non dipende dagli appelli mancanti, e il caso è da
   * segnalare e non solo da guardare.
   */
  confermata: boolean
}

/** Le UD che l'orario del corso prevede nel periodo: il cento per cento. */
function udPreviste (
  corso: Corso,
  anno: AnnoScolastico | null,
  semestre: Semestre | null,
): number {
  const dal = semestre?.inizio ?? anno?.inizio
  const al = semestre?.fine ?? anno?.fine
  if (!dal || !al) return 0
  return udPrevisteDaOrario(anno, corso, dal, al)
}

function dentroIlPeriodo (semestre: Semestre | null, data: Iso): boolean {
  if (!semestre) return true
  return data >= semestre.inizio && data <= semestre.fine
}

/**
 * Chi è oltre la soglia in un corso, nel periodo.
 *
 * Le ore annullate restano fuori: un'ora che non si è tenuta non è un'ora in
 * cui qualcuno poteva mancare.
 */
export function segnalazioniDelCorso (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): SegnalazioneAssenza[] {
  const soglia = registro.impostazioni.sogliaAssenza
  if (soglia <= 0) return []

  const classe: Classe | null = classeDelCorsoId(registro, corso.id)
  if (!classe) return []
  const anno = registro.anni.find((a) => a.id === classe.annoId) ?? null
  const allievi: Allievo[] = ordinaAllievi(allieviAttivi(classe))
  if (allievi.length === 0) return []

  const lezioni = registroDelCorso(registro, corso.id).filter(
    (lezione) => lezione.stato !== 'annullata' && dentroIlPeriodo(semestre, lezione.data),
  )

  const matrice = matriceCorso(
    allievi,
    lezioni,
    [],
    registro.impostazioni,
    udPreviste(corso, anno, semestre),
  )

  const nome = materiaDelCorso(registro, corso)?.nome ?? corso.titolo
  const periodo = semestre?.etichetta ?? 'anno intero'

  return matrice.righe
    .filter((riga) => oltreSoglia(soglia, riga.assenza))
    .map((riga) => ({
      allievoId: riga.allievo.id,
      allievo: nomeCompleto(riga.allievo),
      classeId: classe.id,
      classe: classe.nome,
      corsoId: corso.id,
      corso: nome,
      periodo,
      assenza: riga.assenza ?? 0,
      percento: Math.round((riga.assenza ?? 0) * 100),
      scarto: Math.round((riga.assenza ?? 0) * 100) - soglia,
      udAssenza: riga.udAssenza,
      udPreviste: riga.udPreviste,
      // `presenza` è la quota di *presenza* sulle UD con l'appello: oltre
      // soglia vuol dire che la quota di assenza corrispondente la supera.
      confermata: oltreSoglia(soglia, riga.presenza === null ? null : 1 - riga.presenza),
    }))
    .sort((a, b) => b.assenza - a.assenza || a.allievo.localeCompare(b.allievo, 'it'))
}

/**
 * Chi è oltre la soglia, in tutti i corsi dati.
 *
 * Una riga per persona **e per corso**, non una per persona: le assenze sono di
 * un insegnamento — si perde matematica del lunedì mattina, non «la scuola» — e
 * chi deve occuparsene è chi tiene quel corso. Sommarle darebbe una percentuale
 * che non corrisponde a nessun foglio e a nessuna conversazione.
 */
export function segnalazioniAssenza (
  registro: Registro,
  corsi: Corso[],
  semestre: Semestre | null,
): SegnalazioneAssenza[] {
  return corsi.flatMap((corso) => segnalazioniDelCorso(registro, corso, semestre))
}
