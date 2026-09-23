// Il corso visto per allievo: ore, assenze, voti, in una riga per ciascuno.
//
// È la domanda che ci si fa a metà semestre — «come sta andando questa classe
// in questa materia?» — e finora non aveva un posto: le presenze stavano
// dentro l'ora, i voti dentro la vista Valutazioni, e per rispondere bisognava
// aprire venti lezioni e contare a mente. Sono tre elenchi che parlano degli
// stessi allievi, e messi in colonna si leggono in un colpo d'occhio: chi
// manca troppo, chi non ha ancora nessun voto, chi sta sotto.
//
// Sta nel dominio perché è un conto, non un disegno: chi lo mostra decide se
// farne una tabella a schermo o una tabella in un PDF, e i numeri sono gli
// stessi.

import {
  arrotondaCentesimo,
  contaComeAssenza,
  contaUd,
  deciso,
  mediaAllievo,
  notaFineSemestre,
  statoUd,
} from './calculations.js'
import type {
  Allievo,
  Impostazioni,
  Lezione,
  MomentoValutazione,
} from './models.js'

export interface RigaCorso {
  allievo: Allievo
  /** UD del corso su cui l'appello è stato fatto: il denominatore vero. */
  udConAppello: number
  /**
   * Le UD che il corso prevedeva nel periodo, appello o no.
   *
   * È la stessa cifra per tutti — sono le ore messe a calendario — e serve
   * all'altro conto delle assenze: quello che va nei rapporti da consegnare,
   * dove la domanda non è «quanto è affidabile il dato» ma «quante ore ha
   * perso di quelle che doveva fare».
   */
  udPreviste: number
  udPresenza: number
  udAssenza: number
  /** Le ore in cui è arrivato tardi: si contano per ora, non per UD. */
  ritardi: number
  /**
   * I minuti di ritardo sommati: quanto tempo d'aula si è perso arrivando dopo.
   *
   * Non sono ore da giustificare — le UD perse sono già segnate `assente` — ma
   * sono la differenza fra chi arriva tardi di cinque minuti e chi di
   * quaranta, che in un colloquio è tutta la questione.
   */
  minutiRitardo: number
  /**
   * Le ore in cui c'era da fare l'appello e qualcuno l'ha fatto.
   *
   * Non `lezioni`, che è quante ne prevedeva il calendario: è su quante si è
   * detto qualcosa di questa persona, ed è il numero che dice quanto vale
   * tutto il resto della riga.
   */
  lezioniConAppello: number
  /** Le ore mancate per intero: un giorno perso, non mezz'ora. */
  assenzeIntere: number
  /** Le ore mancate in parte: entrato dopo, uscito prima, o tutti e due. */
  assenzeParziali: number
  /** UD in cui era esonerato: non è un'assenza, e non abbassa la presenza. */
  udEsonero: number
  /** Da 0 a 1 sulle UD con l'appello fatto, esoneri esclusi; null se non ce n'è nessuna. */
  presenza: number | null
  /**
   * La frequenza: cento per cento meno la quota di assenza, da 0 a 1.
   *
   * È il complemento esatto di `assenza`, sullo stesso denominatore, e serve
   * perché la domanda si fa nei due versi: «quanto ha perso» a chi guarda i
   * casi difficili, «quanto ha frequentato» a chi deve certificare una
   * frequenza. Le ore non ancora fatte non pesano: finché non c'è un'assenza
   * segnata la frequenza resta piena, ed è quel che si certifica a metà
   * semestre — non si è persa nessuna ora di quelle già tenute.
   */
  presenzaPreviste: number | null
  /**
   * Quota di assenza sulle UD previste, da 0 a 1; null se non ce n'erano.
   *
   * Due conti e non uno perché rispondono a due domande diverse, e chi legge
   * ha diritto a tutte e due. `presenza` dice come sta andando l'allievo
   * secondo quel che si è davvero registrato: un'ora dimenticata non lo
   * penalizza. `assenza` dice quanto ha perso di quel che era in programma, ed
   * è la cifra che finisce nei rapporti da far controfirmare — lì un'ora
   * senza appello resta un'ora che qualcuno doveva fare.
   */
  assenza: number | null
  /** Quante prove hanno un voto suo. */
  prove: number
  media: number | null
  /** La media portata sul passo della nota di fine semestre. */
  nota: number | null
}

interface MatriceCorso {
  righe: RigaCorso[]
  /** Quante ore del corso entrano nel conto. */
  lezioni: number
  /** Quante UD in tutto: la lunghezza massima di una colonna di presenze. */
  ud: number
  /**
   * Le UD che il corso prevedeva nel periodo, per allievo: il cento per cento.
   *
   * Di norma arriva dall'orario del corso — è il monte ore che quel corso deve
   * fare — e non dalle ore già messe a calendario. A metà ottobre metà del
   * semestre non è ancora stata generata, e una percentuale contata sulle ore
   * esistenti direbbe che tutti hanno seguito tutto.
   */
  udPreviste: number
  momenti: MomentoValutazione[]
  /** Gli stessi conti delle righe, sommati sulla classe. */
  classe: TotaliClasse
}

/**
 * Il corso visto tutto insieme, invece che allievo per allievo.
 *
 * Sono le stesse cifre delle righe, sommate: si calcolano qui e non a occhio
 * sopra la tabella perché una somma fatta da chi disegna è una somma che il
 * giorno dopo qualcuno rifà in un altro modo — e due numeri diversi per la
 * stessa domanda, uno sotto l'altro, sono peggio di nessun numero.
 */
interface TotaliClasse {
  udConAppello: number
  udPresenza: number
  udAssenza: number
  /** UD di esonero sommate: stanno fuori dal rapporto di `presenza`, non al suo denominatore. */
  udEsonero: number
  ritardi: number
  /** Le UD previste sommate su tutti gli allievi: il denominatore di `assenza`. */
  udPreviste: number
  /**
   * Da 0 a 1 sulle UD con l'appello fatto, per tutta la classe; null se
   * l'appello non è mai stato fatto.
   */
  presenza: number | null
  /** La frequenza della classe: cento per cento meno la quota di assenza. */
  presenzaPreviste: number | null
  /** Quota di assenza della classe sulle UD previste; null se non ce n'erano. */
  assenza: number | null
  /**
   * La media delle medie: ogni allievo pesa uno, non quanti voti ha.
   *
   * L'alternativa — la media di tutti i voti in un mucchio — darebbe più peso
   * a chi ha fatto più prove, che è il contrario di quel che si vuole sapere.
   * Chi non ha ancora nessun voto resta fuori invece di contare come zero.
   */
  media: number | null
  /** Quanti allievi hanno almeno un voto: dice quanto la media sopra vale. */
  conVoto: number
}

/**
 * Quota di assenza e frequenza sulle UD previste, o `null` se previste non ce
 * n'erano.
 *
 * Il rapporto si taglia fra zero e uno perché i due termini vengono da due
 * fonti diverse: le assenze dall'appello, le previste dall'orario. Se in un
 * periodo si fanno più ore di quante l'orario ne dichiarasse — un recupero,
 * una supplenza — il quoziente sfonda l'uno, e senza taglio il rapporto
 * stamperebbe «125% di assenza» e «-25% di frequenza».
 *
 * Esce di qui perché la somma su più corsi — `sommaPresenze`, nella scheda
 * della persona — ha bisogno della stessa regola. Ricopiarla è già costato:
 * la copia aveva il denominatore giusto e il taglio no, e la scheda scriveva
 * «131%» dove il rapporto stampato scriveva «100%».
 */
export function quotaAssenza (
  assenza: number,
  previste: number,
  comeFrequenza: boolean,
): number | null {
  if (previste <= 0) return null
  const quota = Math.min(1, Math.max(0, assenza / previste))
  return comeFrequenza ? 1 - quota : quota
}

/**
 * La presenza sulle UD che contano: quelle con l'appello fatto, **meno gli
 * esoneri**.
 *
 * L'esonero non è una presenza e non è un'assenza: è un'ora che per quella
 * persona non c'era. Lasciarlo al denominatore e non al numeratore — che è
 * quel che si faceva — vuol dire far scendere la presenza di chi ha un
 * permesso, e scendere fino a zero per chi è esonerato tutto l'anno da
 * educazione fisica pur non avendo mai mancato un'ora.
 *
 * Che fosse così era scritto in tre posti: nel commento di `udEsonero` qui
 * sopra («non è un'assenza, e non abbassa la presenza»), in `contaComeAssenza`
 * («abbassare la frequenza di chi è esonerato vorrebbe dire penalizzarlo per un
 * permesso che gli è stato dato») e nella guida dentro l'applicazione. Nel
 * codice no: c'era solo fuori dal numeratore.
 */
export function quotaPresenza (presenti: number, contate: number): number | null {
  return contate <= 0 ? null : presenti / contate
}

/**
 * La matrice di un corso: una riga per allievo.
 *
 * Le lezioni e i momenti arrivano già filtrati da chi chiama — di norma sul
 * semestre scelto — perché il periodo è una scelta di chi guarda, non una
 * proprietà del corso: a gennaio si vuole sapere come va il secondo semestre,
 * non da settembre.
 *
 * Il denominatore delle presenze sono le UD con l'appello fatto, non tutte:
 * un'ora di cui nessuno ha ancora segnato niente non è un'ora di assenze, e
 * contarla come tale farebbe crollare la percentuale di tutti a ogni lezione
 * dimenticata.
 */
export function matriceCorso (
  allievi: Allievo[],
  lezioni: Lezione[],
  momenti: MomentoValutazione[],
  impostazioni: Impostazioni,
  /**
   * Le UD previste dall'orario nel periodo. Omesse — o zero, che è quel che
   * torna un corso senza orario fisso — si ripiega sulle UD delle ore passate:
   * è l'unico monte ore che in quel caso si conosca.
   */
  previste?: number,
): MatriceCorso {
  const unita = lezioni.map((lezione) => ({
    lezione,
    quante: contaUd(lezione),
  }))
  const ud = unita.reduce((somma, u) => somma + u.quante, 0)

  const udPreviste = previste && previste > 0 ? previste : ud

  const righe = allievi.map((allievo): RigaCorso => {
    let udConAppello = 0
    let udPresenza = 0
    let udAssenza = 0
    let udEsonero = 0
    let ritardi = 0
    let minutiRitardo = 0
    let lezioniConAppello = 0
    let assenzeIntere = 0
    let assenzeParziali = 0

    for (const { lezione, quante } of unita) {
      const presenza = lezione.presenze.find((p) => p.allievoId === allievo.id)
      let tardi = false
      let decise = 0
      let mancate = 0
      for (let i = 0; i < quante; i += 1) {
        const stato = statoUd(presenza, i)
        if (!deciso(stato)) continue
        udConAppello += 1
        decise += 1
        // Il ritardo sta con le presenze, non con le assenze: le UD perse da
        // chi è arrivato tardi sono già segnate `assente`, e contare anche
        // quella in cui è entrato vorrebbe dire toglierla due volte. Vedi
        // `contaComeAssenza`, che è dove la regola è scritta una volta sola.
        if (contaComeAssenza(stato)) {
          udAssenza += 1
          mancate += 1
        } else if (stato === 'esonerato') udEsonero += 1
        else udPresenza += 1
        if (stato === 'ritardo') tardi = true
      }
      // Un'ora di cui nessuno ha detto niente non è né presente né assente: non
      // entra in nessuno dei conti per ora, o un appello dimenticato si
      // leggerebbe come una giornata regolare.
      if (decise === 0) continue
      lezioniConAppello += 1
      if (mancate === decise) assenzeIntere += 1
      else if (mancate > 0) assenzeParziali += 1
      if (tardi) {
        ritardi += 1
        minutiRitardo += presenza?.minuti ?? 0
      }
    }

    const media = mediaAllievo(momenti, allievo.id)
    return {
      allievo,
      udConAppello,
      udPreviste,
      udPresenza,
      udAssenza,
      udEsonero,
      ritardi,
      minutiRitardo,
      lezioniConAppello,
      assenzeIntere,
      assenzeParziali,
      presenza: quotaPresenza(udPresenza, udConAppello - udEsonero),
      presenzaPreviste: quotaAssenza(udAssenza, udPreviste, true),
      assenza: quotaAssenza(udAssenza, udPreviste, false),
      prove: media.conteggio,
      media: media.media,
      nota: notaFineSemestre(media.media, impostazioni.scala, impostazioni.passoFineSemestre),
    }
  })

  const somma = (quale: (riga: RigaCorso) => number) =>
    righe.reduce((totale, riga) => totale + quale(riga), 0)
  const medie = righe.map((r) => r.media).filter((m): m is number => m !== null)
  const udConAppello = somma((r) => r.udConAppello)
  const udEsoneroClasse = somma((r) => r.udEsonero)
  const previsteInTutto = udPreviste * righe.length

  return {
    righe,
    lezioni: lezioni.length,
    ud,
    udPreviste,
    momenti,
    classe: {
      udConAppello,
      udPreviste: previsteInTutto,
      udPresenza: somma((r) => r.udPresenza),
      udAssenza: somma((r) => r.udAssenza),
      udEsonero: udEsoneroClasse,
      ritardi: somma((r) => r.ritardi),
      presenza: quotaPresenza(somma((r) => r.udPresenza), udConAppello - udEsoneroClasse),
      presenzaPreviste: quotaAssenza(somma((r) => r.udAssenza), previsteInTutto, true),
      assenza: quotaAssenza(somma((r) => r.udAssenza), previsteInTutto, false),
      media:
        medie.length === 0
          ? null
          : arrotondaCentesimo(medie.reduce((t, m) => t + m, 0) / medie.length),
      conVoto: medie.length,
    },
  }
}
