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
// **preme** solo quando gli appelli delle ore svolte ci sono tutti. Un
// appello dimenticato è un'UD che non si sa se è persa: il numero è da
// guardare, ma non è ancora un caso da segnalare a qualcuno.
//
// Prima `confermata` guardava la seconda quota, e sbagliava verso: gli appelli
// mancanti **abbassano** la quota sulle previste, non la alzano, e le UD con
// appello non superano quasi mai le previste — quindi la seconda era sempre
// sopra la prima, e ogni segnalazione usciva «confermata» anche con l'appello
// fatto su tre ore di nove. L'unico caso «da completare» era il rovescio:
// tutti gli appelli fatti, più qualche ora fuori orario. Adesso il campo
// misura quel che la pagina ne dice: se mancano appelli, e basta.
//
// ## Che cosa manca ancora (LACUNE, voce 6)
//
// Il registro di chi è già stato segnalato e quando. Serve perché la seconda
// segnalazione non è come la prima, e perché quel che si è già fatto non si
// rifà: è un oggetto del documento d'anno, e non un conto che si rifà a ogni
// apertura come questo.

import { allieviAttivi, contaUd, nomeCompleto, ordinaAllievi } from './calculations.js'
import { classeDelCorsoId, materiaDelCorso, registroDelCorso } from './courses.js'
import { matriceCorso } from './courseMatrix.js'
import type {
  Allievo,
  AnnoScolastico,
  Classe,
  Corso,
  Iso,
  Lezione,
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
  // Non `quota * 100 > soglia`: 7/100 * 100 fa 7.000000000000001, e una
  // persona esattamente alla soglia del 7, del 14 o del 28 risultava oltre.
  return soglia > 0 && quota !== null && quota * 100 - soglia > 1e-9
}

/**
 * La percentuale da leggere: intera, o con un decimale per eccesso quando
 * l'intero la farebbe sembrare dentro la soglia.
 *
 * Chi è al 20,3% con la soglia al 20 è oltre; «20% di assenza» accanto a
 * «oltre il 20%» è una frase che si contraddice. Il decimale per eccesso —
 * 20,1 e non 20,0 — dice che la soglia è passata, anche di poco.
 */
export function percentoDaLeggere (quota: number, soglia: number): number {
  const intero = Math.round(quota * 100)
  if (intero > soglia) return intero
  // Il millesimo si pulisce prima dell'eccesso, o 0,203 * 1000 = 203,00000000000003
  // diventerebbe 20,4; e chi è oltre di un soffio legge comunque un decimo sopra.
  const decimi = Math.ceil(Math.round(quota * 1e7) / 1e4)
  return (decimi > soglia * 10 ? decimi : Math.floor(soglia * 10) + 1) / 10
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
  /**
   * La stessa in punti percentuali, arrotondata: è quel che si legge. Con un
   * decimale per eccesso quando l'intero non supererebbe la soglia (20,1 e non
   * 20 con la soglia al 20): vedi `percentoDaLeggere`.
   */
  percento: number
  /** Di quanto supera la soglia, in punti percentuali. */
  scarto: number
  udAssenza: number
  udPreviste: number
  /**
   * Vero quando l'appello c'è su tutte le UD delle ore segnate come svolte nel
   * periodo: allora il numero non dipende da appelli mancanti, e il caso è da
   * segnalare e non solo da guardare. Senza nessuna ora segnata svolta non c'è
   * niente che manchi, e vale vero.
   */
  confermata: boolean
}

/** Le UD che l'orario del corso prevede nel periodo: il cento per cento. */
function udPreviste (
  corso: Corso,
  anno: AnnoScolastico | null,
  semestre: Semestre | null,
  lezioni: readonly Lezione[],
): number {
  const dal = semestre?.inizio ?? anno?.inizio
  const al = semestre?.fine ?? anno?.fine
  if (!dal || !al) return 0
  return udPrevisteDaOrario(anno, corso, dal, al, lezioni)
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
    udPreviste(corso, anno, semestre, registro.lezioni),
  )
  // Le UD delle ore svolte: quelle su cui l'appello dovrebbe esserci.
  const udSvolte = lezioni
    .filter((lezione) => lezione.stato === 'svolta')
    .reduce((somma, lezione) => somma + contaUd(lezione), 0)

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
      percento: percentoDaLeggere(riga.assenza ?? 0, soglia),
      scarto: Math.round((riga.assenza ?? 0) * 100) - soglia,
      udAssenza: riga.udAssenza,
      udPreviste: riga.udPreviste,
      confermata: riga.udConAppello >= udSvolte,
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
