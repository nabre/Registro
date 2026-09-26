// Il corso visto per allievo: ore, assenze, voti, una riga ciascuno. Chi manca
// troppo, chi non ha voti, chi sta sotto, in un colpo d'occhio. Nel dominio
// perché è un conto: schermo e PDF mostrano gli stessi numeri.

import {
  allieviAttivi,
  arrotondaCentesimo,
  contaComeAssenza,
  contaUd,
  deciso,
  mediaAllievo,
  notaFineSemestre,
  ordinaAllievi,
  statoUd,
} from './calculations.js'
import { classeDelCorsoId, registroDelCorso } from './courses.js'
import { nelSemestre } from './dates.js'
import type {
  Allievo,
  Corso,
  Impostazioni,
  Lezione,
  MomentoValutazione,
  Registro,
  Semestre,
} from './models.js'
import { udPrevisteDaOrario } from './timetable.js'

export interface RigaCorso {
  allievo: Allievo
  /** UD del corso su cui l'appello è stato fatto: il denominatore vero. */
  udConAppello: number
  /**
   * Le UD che il corso prevedeva nel periodo, appello o no: uguale per tutti,
   * è il denominatore di `assenza` (la cifra dei rapporti da consegnare).
   */
  udPreviste: number
  udPresenza: number
  udAssenza: number
  /** Le ore in cui è arrivato tardi: si contano per ora, non per UD. */
  ritardi: number
  /**
   * I minuti di ritardo sommati. Le UD perse sono già `assente`; questo dice se
   * si arriva tardi di cinque minuti o di quaranta.
   */
  minutiRitardo: number
  /**
   * Le ore con l'appello fatto: su quante si è detto qualcosa di questa
   * persona, cioè quanto vale il resto della riga.
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
   * La frequenza, da 0 a 1: il complemento esatto di `assenza` sullo stesso
   * denominatore, per chi deve certificarla. Le ore non ancora fatte non pesano.
   */
  presenzaPreviste: number | null
  /**
   * Quota di assenza sulle UD previste, da 0 a 1; null se non ce n'erano.
   * `presenza` misura quel che si è registrato (un appello dimenticato non
   * penalizza); `assenza` quanto si è perso del programma, ed è la cifra dei
   * rapporti da controfirmare.
   */
  assenza: number | null
  /** Quante prove hanno un voto suo. */
  prove: number
  media: number | null
  /** La media portata sul passo della nota di fine semestre. */
  nota: number | null
}

export interface MatriceCorso {
  righe: RigaCorso[]
  /** Quante ore del corso entrano nel conto. */
  lezioni: number
  /** Quante UD in tutto: la lunghezza massima di una colonna di presenze. */
  ud: number
  /**
   * Le UD previste per allievo nel periodo, il cento per cento: dall'orario
   * del corso, non dalle ore già generate.
   */
  udPreviste: number
  momenti: MomentoValutazione[]
  /** Gli stessi conti delle righe, sommati sulla classe. */
  classe: TotaliClasse
}

/**
 * Il corso tutto insieme: le cifre delle righe sommate qui, perché chi disegna
 * non le rifaccia a modo suo.
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
   * La media delle medie: ogni allievo pesa uno, non quanti voti ha. Chi non ha
   * voti resta fuori invece di contare zero.
   */
  media: number | null
  /** Quanti allievi hanno almeno un voto: dice quanto la media sopra vale. */
  conVoto: number
}

/**
 * Quota di assenza e frequenza sulle UD previste, o `null` se non ce n'erano.
 * Il rapporto si taglia fra zero e uno: assenze (appello) e previste (orario)
 * vengono da fonti diverse, e ore fuori orario lo farebbero sfondare. La usa
 * anche `sommaPresenze` sulla scheda della persona.
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
 * La presenza sulle UD con l'appello fatto, esoneri esclusi dal denominatore:
 * l'esonero non è né presenza né assenza, e chi è esonerato non deve vedere
 * scendere la sua presenza.
 */
export function quotaPresenza (presenti: number, contate: number): number | null {
  return contate <= 0 ? null : presenti / contate
}

/**
 * La matrice di un corso: una riga per allievo. Lezioni e momenti arrivano già
 * filtrati per periodo da chi chiama. Il denominatore delle presenze sono le
 * UD con l'appello fatto: un'ora dimenticata non è un'ora di assenze.
 */
export function matriceCorso (
  allievi: Allievo[],
  lezioni: Lezione[],
  momenti: MomentoValutazione[],
  impostazioni: Impostazioni,
  /**
   * Le UD previste dall'orario nel periodo. Omesse o zero (corso senza orario
   * fisso) si ripiega sulle UD delle ore passate.
   */
  previste?: number,
): MatriceCorso {
  // Presenze per ora e allievo indicizzate una volta. Si tiene la prima riga
  // di ogni id, come faceva `find`: un doppione nel file non cambia il conto.
  const unita = lezioni.map((lezione) => {
    const presenze = new Map<string, (typeof lezione.presenze)[number]>()
    for (const p of lezione.presenze) {
      if (!presenze.has(p.allievoId)) presenze.set(p.allievoId, p)
    }
    return { lezione, quante: contaUd(lezione, impostazioni.minutiUd), presenze }
  })
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

    for (const { quante, presenze } of unita) {
      const presenza = presenze.get(allievo.id)
      let tardi = false
      let decise = 0
      let mancate = 0
      for (let i = 0; i < quante; i += 1) {
        const stato = statoUd(presenza, i)
        if (!deciso(stato)) continue
        udConAppello += 1
        decise += 1
        // Il ritardo sta con le presenze: le UD perse sono già `assente` (la
        // regola è in `contaComeAssenza`).
        if (contaComeAssenza(stato)) {
          udAssenza += 1
          mancate += 1
        } else if (stato === 'esonerato') udEsonero += 1
        else udPresenza += 1
        if (stato === 'ritardo') tardi = true
      }
      // Un'ora senza appello non entra in nessun conto, se no un appello
      // dimenticato sembrerebbe una giornata regolare.
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

/**
 * Le UD che l'orario di un corso prevede nel periodo (senza semestre, l'anno
 * della classe). Zero senza orario fisso o senza anno: `matriceCorso` allora
 * ripiega sulle ore a calendario.
 */
export function udPrevisteDelCorso (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): number {
  const classe = classeDelCorsoId(registro, corso.id)
  const anno = classe ? registro.anni.find((a) => a.id === classe.annoId) ?? null : null
  const dal = semestre?.inizio ?? anno?.inizio
  const al = semestre?.fine ?? anno?.fine
  if (!dal || !al) return 0
  return udPrevisteDaOrario(anno, corso, dal, al, registro.impostazioni.minutiUd, registro.lezioni)
}

/** La matrice delle presenze di un corso in un periodo, con quel che l'ha fatta. */
interface MatriceNelPeriodo {
  /** Le ore del corso nel periodo, senza le annullate. */
  lezioni: Lezione[]
  /** Gli allievi che frequentano, in ordine di elenco: i ritirati no. */
  allievi: Allievo[]
  /** Le UD previste nel periodo; zero senza orario fisso o anno (vedi `matriceCorso`). */
  udPreviste: number
  matrice: MatriceCorso
}

/**
 * Le presenze di un corso nel periodo, contate in un posto solo per rapporto
 * stampato, segnalazioni ed esportazione CSV: solo chi frequenta, senza le ore
 * annullate. Il cento per cento sono le UD previste dall'orario, non quelle già
 * generate.
 */
export function matriceDelCorsoNelPeriodo (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): MatriceNelPeriodo {
  const classe = classeDelCorsoId(registro, corso.id)
  const lezioni = registroDelCorso(registro, corso.id).filter(
    (l) => l.stato !== 'annullata' && nelSemestre(semestre, l.data),
  )
  const allievi = ordinaAllievi(classe ? allieviAttivi(classe) : [])
  const udPreviste = udPrevisteDelCorso(registro, corso, semestre)
  const matrice = matriceCorso(allievi, lezioni, [], registro.impostazioni, udPreviste)
  return { lezioni, allievi, udPreviste, matrice }
}
