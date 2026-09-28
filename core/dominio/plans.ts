// Logica di dominio per la generazione e la gestione dei piani lezione (`PianoLezione`).
// Struttura le tappe didattiche in modo pedagogicamente coerente e calibra la scaletta
// sulla durata effettiva delle unità didattiche (UD) dell'ora.

import { istanteAdesso } from './dates.js'
import { nuovoIdAttivita, nuovoIdPiano } from './identifiers.js'
import type { Attivita, Corso, Lezione, PianoLezione } from './models.js'
import { contaUd, udDaMinutiAttivita } from './calculations.js'
import { testi } from './plans.testi.js'

/**
 * Genera gli obiettivi pedagogici standard per una lezione, personalizzandoli
 * con la materia o il titolo del corso.
 */
export function generaObiettiviStandard (materiaNome = ''): string[] {
  const t = testi().obiettivi
  const nome = materiaNome.trim()
  return [t.concettuale(nome), t.operativo(), t.sintesi()]
}

/**
 * Genera una sequenza didattica equilibrata di attività (accoglienza, spiegazione,
 * esercitazione/laboratorio, sintesi), con durate calibrate in blocchi da 5 minuti (min 5 min).
 */
export function generaAttivitaStandard (
  udTotali: number,
  materiaONome: string | boolean = '',
  isDocenteDiClasse = false,
  minutiPerUd = 50,
): Attivita[] {
  const t = testi().attivita
  const nome = typeof materiaONome === 'string' ? materiaONome.trim() : ''
  const docenteDiClasse = typeof materiaONome === 'boolean' ? materiaONome : isDocenteDiClasse
  const etichettaMateria = nome || (docenteDiClasse ? t.classe : '')
  const perUd = minutiPerUd > 0 ? minutiPerUd : 50
  const minutiTotali = Math.max(5, Math.round((udTotali * perUd) / 5) * 5)

  if (minutiTotali <= 50) {
    const mIntro = 10
    const mEserc = 15
    const mSpieg = Math.max(5, minutiTotali - mIntro - mEserc)

    return [
      {
        id: nuovoIdAttivita(),
        titolo: t.accoglienzaTitolo,
        tipo: 'introduzione',
        durataUd: udDaMinutiAttivita(mIntro, perUd),
        descrizione: t.accoglienzaDescrizione,
        raggruppamento: 'plenaria',
        materiali: t.materialiBase,
        risorse: [],
      },
      {
        id: nuovoIdAttivita(),
        titolo: t.spiegazioneTitolo(etichettaMateria),
        tipo: 'spiegazione',
        durataUd: udDaMinutiAttivita(mSpieg, perUd),
        descrizione: t.spiegazioneDescrizione,
        raggruppamento: 'plenaria',
        materiali: t.materialiBase,
        risorse: [],
      },
      {
        id: nuovoIdAttivita(),
        titolo: t.esercitazioneTitolo,
        tipo: 'esercizio',
        durataUd: udDaMinutiAttivita(mEserc, perUd),
        descrizione: t.esercitazioneDescrizione,
        raggruppamento: 'individuale',
        materiali: t.materialiBase,
        risorse: [],
      },
    ]
  }

  if (minutiTotali <= 100) {
    const mIntro = 10
    const mSintesi = 10
    const resto = minutiTotali - mIntro - mSintesi
    const mSpieg = Math.max(15, Math.round((resto / 2) / 5) * 5)
    const mEserc = Math.max(10, resto - mSpieg)

    return [
      {
        id: nuovoIdAttivita(),
        titolo: t.accoglienzaTitolo,
        tipo: 'introduzione',
        durataUd: udDaMinutiAttivita(mIntro, perUd),
        descrizione: t.accoglienzaDescrizione,
        raggruppamento: 'plenaria',
        materiali: t.materialiBase,
        risorse: [],
      },
      {
        id: nuovoIdAttivita(),
        titolo: t.spiegazioneTitolo(etichettaMateria),
        tipo: 'spiegazione',
        durataUd: udDaMinutiAttivita(mSpieg, perUd),
        descrizione: t.spiegazioneDescrizione,
        raggruppamento: 'plenaria',
        materiali: t.materialiBase,
        risorse: [],
      },
      {
        id: nuovoIdAttivita(),
        titolo: t.esercitazioneTitolo,
        tipo: 'esercizio',
        durataUd: udDaMinutiAttivita(mEserc, perUd),
        descrizione: t.esercitazioneDescrizione,
        raggruppamento: 'coppie',
        materiali: t.materialiBase,
        risorse: [],
      },
      {
        id: nuovoIdAttivita(),
        titolo: t.sintesiTitolo,
        tipo: 'discussione',
        durataUd: udDaMinutiAttivita(mSintesi, perUd),
        descrizione: t.sintesiDescrizione,
        raggruppamento: 'plenaria',
        materiali: t.materialiBase,
        risorse: [],
      },
    ]
  }

  // U > 2.0 (lezioni lunghe o blocchi orari di 3 o più UD)
  const mIntro = 10
  const mSintesi = 15
  const resto = minutiTotali - mIntro - mSintesi
  const mSpieg = Math.max(20, Math.round(((resto * 0.45) / 5)) * 5)
  const mLab = Math.max(20, resto - mSpieg)

  return [
    {
      id: nuovoIdAttivita(),
      titolo: t.accoglienzaTitolo,
      tipo: 'introduzione',
      durataUd: udDaMinutiAttivita(mIntro, perUd),
      descrizione: t.accoglienzaDescrizione,
      raggruppamento: 'plenaria',
      materiali: t.materialiBase,
      risorse: [],
    },
    {
      id: nuovoIdAttivita(),
      titolo: t.spiegazioneTitolo(etichettaMateria),
      tipo: 'spiegazione',
      durataUd: udDaMinutiAttivita(mSpieg, perUd),
      descrizione: t.spiegazioneDescrizione,
      raggruppamento: 'plenaria',
      materiali: t.materialiBase,
      risorse: [],
    },
    {
      id: nuovoIdAttivita(),
      titolo: t.laboratorioTitolo,
      tipo: 'laboratorio',
      durataUd: udDaMinutiAttivita(mLab, perUd),
      descrizione: t.laboratorioDescrizione,
      raggruppamento: 'gruppi',
      materiali: t.materialiBase,
      risorse: [],
    },
    {
      id: nuovoIdAttivita(),
      titolo: t.sintesiTitolo,
      tipo: 'discussione',
      durataUd: udDaMinutiAttivita(mSintesi, perUd),
      descrizione: t.sintesiDescrizione,
      raggruppamento: 'plenaria',
      materiali: t.materialiBase,
      risorse: [],
    },
  ]
}

/**
 * Genera automaticamente un piano lezione completo e calibrato sulla lezione,
 * con obiettivi formativi e sequenza di attività corrispondente alla durata dell'ora.
 */
export function generaPianoPerLezione (
  lezione: Lezione,
  corso: Corso,
  opzioni: { materiaNome?: string; minutiUd?: number } = {},
): PianoLezione {
  const minutiUd = opzioni.minutiUd ?? 45
  const udTotali = contaUd(lezione, minutiUd)
  const materiaNome = opzioni.materiaNome ?? corso.titolo
  const attivita = generaAttivitaStandard(udTotali, materiaNome, false, minutiUd)
  const obiettivi = generaObiettiviStandard(materiaNome)

  const tag: string[] = []
  if (corso.titolo) tag.push(corso.titolo)
  if (opzioni.materiaNome && opzioni.materiaNome !== corso.titolo) tag.push(opzioni.materiaNome)

  return {
    id: nuovoIdPiano(),
    corsoId: corso.id,
    obiettivi,
    prerequisiti: '',
    attivita,
    risorse: [],
    note: '',
    tag,
    creatoIl: istanteAdesso(),
    aggiornatoIl: istanteAdesso(),
  }
}
