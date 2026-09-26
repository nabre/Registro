// La migrazione dei documenti dalla versione 1 alla 2.
//
// Separata da `normalization.ts`: quella sa com'è un registro buono, questa
// com'era uno della versione 1. `normalizzaRegistro` le passa materie, classi
// grezze e fabbriche invece di farle importare, per evitare un ciclo di import.

import { titoloCorso } from './courses.js'
import { testi } from './migration.testi.js'
import type { Classe, Corso, Materia } from './models.js'
import { nomeNormalizzato } from './validation.js'

/**
 * Le normalizzazioni con cui la migrazione fa nascere quel che manca. Sono
 * quelle di `normalization.ts`: una materia o un corso creati qui devono essere
 * identici a quelli letti da disco.
 */
interface Fabbriche {
  materia: (grezzo: unknown) => Materia
  corso: (grezzo: unknown) => Corso
}

/**
 * Una classe com'era su disco, ridotta a quel che la migrazione ne legge: la
 * materia, per id (versione 2) o scritta a mano (versione 1). Vuoti se mancano.
 */
interface ClasseDaMigrare {
  id: string
  materiaId: string
  materia: string
}

/**
 * La conversione, in un oggetto solo perché i passaggi dipendono l'uno
 * dall'altro: materie dalle classi, poi corsi, lezioni, valutazioni.
 *
 * La versione 1 scrive la materia sulla classe, anno e classe su ogni lezione,
 * il semestre su ogni valutazione; la 2 ha il corso (classe più materia) e
 * ricava il resto. Nei casi dubbi non si perde niente: una lezione senza
 * aggancio va in un corso di ripiego visibile.
 */
export class Migrazione {
  readonly materie: Materia[]
  readonly corsi: Corso[] = []

  /** Le materie per nome normalizzato: intercetta «Matematica» e «matematica». */
  private readonly materiaPerNome = new Map<string, string>()
  /** I corsi per coppia classe+materia, che è la loro chiave d’identità. */
  private readonly corsoPerCoppia = new Map<string, Corso>()
  /** Dove è finito ogni vecchio programma, per riagganciarci i piani. */
  private readonly corsoPerProgramma = new Map<string, Corso>()
  /** La materia che la versione 1 scriveva sulla classe. */
  private readonly materiaPerClasse = new Map<string, string>()
  /** La materia inventata per ciò che non si sa dove mettere: nasce solo se serve. */
  private materiaDiRipiego: string | null = null
  /**
   * I corsi scartati perché doppioni, e chi ne prende il posto: lezioni,
   * valutazioni e piani che li nominano vanno spostati sul vincitore.
   */
  private readonly sostituti = new Map<string, string>()

  constructor (
    materie: Materia[],
    classi: readonly ClasseDaMigrare[],
    private readonly fabbriche: Fabbriche,
  ) {
    this.materie = materie
    for (const materia of this.materie) this.registra(materia)

    // Le materie scritte come testo sulle classi diventano materie vere.
    for (const classe of classi) {
      if (!classe.id) continue
      if (classe.materiaId) {
        this.materiaPerClasse.set(classe.id, classe.materiaId)
        continue
      }
      const nome = classe.materia.trim()
      if (nome) this.materiaPerClasse.set(classe.id, this.materiaDalNome(nome))
    }
  }

  private registra (materia: Materia): void {
    const chiave = nomeNormalizzato(materia.nome)
    if (chiave && !this.materiaPerNome.has(chiave)) this.materiaPerNome.set(chiave, materia.id)
  }

  /** La materia con questo nome, creandola se non c'è. */
  private materiaDalNome (nome: string): string {
    const gia = this.materiaPerNome.get(nomeNormalizzato(nome))
    if (gia) return gia
    const materia = this.fabbriche.materia({ nome: nome.trim() })
    this.materie.push(materia)
    this.registra(materia)
    return materia.id
  }

  /** La materia buona per ciò che non ne ha: una sola, e il nome dice che è da sistemare. */
  private ripiego (): string {
    if (!this.materiaDiRipiego) {
      this.materiaDiRipiego = this.materiaDalNome(testi().materiaDaAssegnare)
    }
    return this.materiaDiRipiego
  }

  private chiave (classeId: string, materiaId: string): string {
    return `${classeId} ${materiaId}`
  }

  /** Il corso di una coppia, creandolo al volo: è l'unico modo in cui ne nascono. */
  corso (classeId: string, materiaId: string): Corso {
    const chiave = this.chiave(classeId, materiaId)
    const gia = this.corsoPerCoppia.get(chiave)
    if (gia) return gia
    const corso = this.fabbriche.corso({ classeId, materiaId })
    this.corsi.push(corso)
    this.corsoPerCoppia.set(chiave, corso)
    return corso
  }

  /**
   * Accoglie un corso già scritto su disco. Se la coppia c'è già vince il
   * primo: due corsi per la stessa classe e materia spaccherebbero le lezioni.
   */
  accogli (corso: Corso, programmaId = ''): void {
    if (!corso.classeId || !corso.materiaId) return
    const chiave = this.chiave(corso.classeId, corso.materiaId)
    const gia = this.corsoPerCoppia.get(chiave)
    const buono = gia ?? corso
    if (!gia) {
      this.corsi.push(corso)
      this.corsoPerCoppia.set(chiave, corso)
    } else if (corso.id && corso.id !== gia.id) {
      this.sostituti.set(corso.id, gia.id)
    }
    if (programmaId) this.corsoPerProgramma.set(programmaId, buono)
  }

  /**
   * L'id del corso che vale per questo: il vincitore, se era un doppione
   * scartato da `accogli`; altrimenti lo stesso id.
   */
  corsoVero (corsoId: string): string {
    return this.sostituti.get(corsoId) ?? corsoId
  }

  /**
   * Un oggetto letto da disco con il `corsoId` rimesso sul corso che vale.
   * Una copia, e solo se serve: chi non nomina un doppione torna com'è.
   */
  conCorsoVero (grezzo: unknown): unknown {
    if (!grezzo || typeof grezzo !== 'object') return grezzo
    const corsoId = (grezzo as { corsoId?: unknown }).corsoId
    if (typeof corsoId !== 'string' || !this.sostituti.has(corsoId)) return grezzo
    return { ...grezzo, corsoId: this.corsoVero(corsoId) }
  }

  corsoDelProgramma (programmaId: string): Corso | null {
    return this.corsoPerProgramma.get(programmaId) ?? null
  }

  /** Vero se quell'id è di un corso vero, non di qualcos'altro scambiato per tale. */
  conosce (corsoId: string): boolean {
    return this.corsi.some((c) => c.id === corsoId)
  }

  /** Vero se quell'id è di una classe che ha almeno un corso. */
  eUnaClasse (id: string): boolean {
    return this.corsi.some((c) => c.classeId === id)
  }

  /**
   * Il corso in cui mettere una lezione o una valutazione della versione 1: la
   * materia che portava addosso se esiste ancora, altrimenti quella della sua
   * classe, altrimenti il primo corso della classe, altrimenti il ripiego.
   */
  corsoDiClasse (classeId: string, materiaId: string | null = null): Corso {
    if (materiaId && this.materie.some((m) => m.id === materiaId)) {
      return this.corso(classeId, materiaId)
    }
    const dellaClasse = this.materiaPerClasse.get(classeId)
    if (dellaClasse) return this.corso(classeId, dellaClasse)
    const primo = this.corsi.find((c) => c.classeId === classeId)
    return primo ?? this.corso(classeId, this.ripiego())
  }

  /** I titoli, alla fine: ora che classi e materie hanno un nome da mettere insieme. */
  intitola (classi: Classe[]): void {
    for (const corso of this.corsi) {
      if (corso.titolo && corso.titolo !== 'Corso') continue
      const classe = classi.find((c) => c.id === corso.classeId) ?? null
      const materia = this.materie.find((m) => m.id === corso.materiaId) ?? null
      corso.titolo = titoloCorso(classe, materia)
    }
  }
}
