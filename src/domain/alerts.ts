// Chi è oltre la soglia di assenza (`Impostazioni.sogliaAssenza`), come
// pendenza della sua classe: resta fra le cose da fare finché la percentuale
// non scende. Non manda niente e non scrive niente nel registro.
//
// Delle due percentuali (vedi `matriceCorso`) conta `assenza`: UD perse su
// quelle che l'orario prevedeva, la cifra dei rapporti da controfirmare.
// `confermata` dice se gli appelli delle ore svolte ci sono tutti: senza, il
// numero è da guardare ma non ancora da segnalare.

import { contaUd, nomeCompleto } from './calculations.js'
import { classeDelCorsoId, materiaDelCorso } from './courses.js'
import { matriceDelCorsoNelPeriodo } from './courseMatrix.js'
import { etichettaSemestre } from './dates.js'
import type { Classe, Corso, Registro, Semestre } from './models.js'
import { percento } from './text.js'

/**
 * Se una quota di assenza supera la soglia: una funzione sola per rapporti e
 * pendenze. Soglia a zero vuol dire spenta.
 */
export function oltreSoglia (soglia: number, quota: number | null): boolean {
  // Non `quota * 100 > soglia`: 7/100 * 100 fa 7.000000000000001, e chi sta
  // esattamente alla soglia risulterebbe oltre.
  return soglia > 0 && quota !== null && quota * 100 - soglia > 1e-9
}

/**
 * La percentuale da leggere: intera, o con un decimale per eccesso quando
 * l'intero sembrerebbe dentro la soglia (20,3% con soglia 20 si legge 20,1,
 * non «20%» accanto a «oltre il 20%»).
 */
function percentoDaLeggere (quota: number, soglia: number): number {
  const intero = Math.round(quota * 100)
  if (intero > soglia) return intero
  // Il millesimo si pulisce prima dell'eccesso: 0,203 * 1000 fa 203,00000000000003
  // e diventerebbe 20,4.
  const decimi = Math.ceil(Math.round(quota * 1e7) / 1e4)
  return (decimi > soglia * 10 ? decimi : Math.floor(soglia * 10) + 1) / 10
}

/**
 * Una quota di assenza da leggere accanto alla soglia: «18%», o «20,1%» per
 * chi è oltre di un soffio. Ogni posto che stampa un'assenza passa di qui.
 */
export function percentoAssenza (
  quota: number | null | undefined,
  soglia: number,
  vuoto = '—',
): string {
  if (quota === null || quota === undefined) return vuoto
  if (!oltreSoglia(soglia, quota)) return percento(quota, vuoto)
  return `${String(percentoDaLeggere(quota, soglia)).replace('.', ',')}%`
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
  /** La stessa in punti percentuali, come si legge: vedi `percentoDaLeggere`. */
  percento: number
  /** Di quanto supera la soglia, in punti percentuali. */
  scarto: number
  udAssenza: number
  udPreviste: number
  /**
   * Vero quando l'appello c'è su tutte le UD delle ore svolte del periodo (o
   * non c'è nessuna ora svolta): il caso è da segnalare, non solo da guardare.
   */
  confermata: boolean
}

/** Chi è oltre la soglia in un corso, nel periodo. Le ore annullate non contano. */
export function segnalazioniDelCorso (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): SegnalazioneAssenza[] {
  const soglia = registro.impostazioni.sogliaAssenza
  if (soglia <= 0) return []

  const classe: Classe | null = classeDelCorsoId(registro, corso.id)
  if (!classe) return []
  const { allievi, lezioni, matrice } = matriceDelCorsoNelPeriodo(registro, corso, semestre)
  if (allievi.length === 0) return []

  // Le UD delle ore svolte: quelle su cui l'appello dovrebbe esserci.
  const udSvolte = lezioni
    .filter((lezione) => lezione.stato === 'svolta')
    .reduce((somma, lezione) => somma + contaUd(lezione, registro.impostazioni.minutiUd), 0)

  const nome = materiaDelCorso(registro, corso)?.nome ?? corso.titolo
  const periodo = etichettaSemestre(semestre)

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
      // Dallo stesso numero che si legge: 20,09% con soglia 20 è oltre di un decimo.
      scarto: Math.round((percentoDaLeggere(riga.assenza ?? 0, soglia) - soglia) * 10) / 10,
      udAssenza: riga.udAssenza,
      udPreviste: riga.udPreviste,
      confermata: riga.udConAppello >= udSvolte,
    }))
    .sort((a, b) => b.assenza - a.assenza || a.allievo.localeCompare(b.allievo, 'it'))
}

/**
 * Chi è oltre la soglia nei corsi dati: una riga per persona e per corso,
 * perché le assenze sono di un insegnamento e se ne occupa chi lo tiene.
 */
export function segnalazioniAssenza (
  registro: Registro,
  corsi: Corso[],
  semestre: Semestre | null,
): SegnalazioneAssenza[] {
  return corsi.flatMap((corso) => segnalazioniDelCorso(registro, corso, semestre))
}
