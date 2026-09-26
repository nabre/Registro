// Di che cosa si sta parlando adesso — corso, classe, ora — dedotto dalla
// pagina aperta. File a sé perché lo leggono `pages.ts` (dove si può andare) e
// `commands.ts` (che cosa si può fare) senza legarsi l'uno all'altro.

import type { Classe, Corso, Lezione } from '../domain/models.js'
import {
  aggiorna,
  annoCorrente,
  classePerId,
  classiDellAnno,
  classiDiCuiSonoDocente,
  corsoAperto,
  corsoPerId,
  lezionePerId,
  lezioneDiRiferimentoDiCorso,
  nomeClasse,
  nomeMateria,
  stato,
  type Vista,
} from './state.js'
import { testi } from './context.testi.js'

/**
 * Le pagine in cui il corso è il filtro, e quindi mostrano la tendina dei corsi.
 * Nelle altre una tendina che non cambia niente toglie fiducia anche dove
 * funziona; il docente di classe lavora per classe e ha la tendina delle classi.
 */
const VISTE_DEL_CORSO: readonly Vista[] = [
  'lezione',
  'valutazioni',
  'todo',
  'piani',
  'documenti',
]

/** Se la pagina aperta è puntata su un corso: lo chiede la barra per la tendina. */
export function siLavoraSuUnCorso (): boolean {
  return VISTE_DEL_CORSO.includes(stato.vista) ||
    (stato.vista === 'check' && stato.ambitoCheck === 'corso')
}

/**
 * Se la pagina aperta ha filtri suoi (il calendario): stanno nella riga delle
 * scelte ma non spostano il corso su cui sono puntate le pagine del registro.
 */
export function siFiltraLAgenda (): boolean {
  return stato.vista === 'calendario'
}

/** Se la pagina aperta è puntata su una classe di cui si è docente di classe. */
export function siLavoraSuUnaClasse (): boolean {
  return stato.vista === 'docenteClasse' ||
    (stato.vista === 'check' && stato.ambitoCheck === 'classe')
}

/**
 * La classe del pannello del docente di classe: quella scelta, se lo è ancora,
 * altrimenti la prima. La sezione compare solo con almeno una classe, quindi le
 * sue pagine hanno sempre una risposta.
 */
export function classeDelFascicolo (): Classe | null {
  const docenze = classiDiCuiSonoDocente()
  if (docenze.length === 0) return null
  return docenze.find((classe) => classe.id === stato.classeId) ?? docenze[0] ?? null
}

/**
 * Cambia la classe del pannello del docente di classe. Non tocca il corso (là
 * si lavora per classe), sì il filtro per classe che le pagine del corso leggono.
 */
export function scegliClasseDelFascicolo (id: string): void {
  const classe = classePerId(id)
  if (!classe?.docenteDiClasse) return
  aggiorna({ classeId: classe.id, filtroClasseId: classe.id })
}

/** Cambia il corso e riallinea la lezione e la classe mostrate. */
export function scegliCorso (id: string): void {
  const corso = corsoPerId(id)
  if (!corso) return
  const modifiche: Parameters<typeof aggiorna>[0] = {
    corsoId: corso.id,
    filtroClasseId: corso.classeId,
    classeId: corso.classeId,
  }
  if (stato.vista === 'lezione') {
    modifiche.lezioneId = lezioneDiRiferimentoDiCorso(id)
    if (!modifiche.lezioneId) modifiche.vista = 'piani'
  }
  if (stato.vista === 'allievo') modifiche.vista = 'classi'
  if (stato.vista === 'docenteClasse' && !classePerId(corso.classeId)?.docenteDiClasse) {
    modifiche.vista = 'classi'
  }
  aggiorna(modifiche)
}

/**
 * Di quale corso si sta parlando: nel registro della lezione quello della
 * lezione aperta, altrove quello su cui sono puntate le pagine.
 */
export function corsoDelContesto (): Corso | null {
  if (stato.vista === 'lezione') {
    const lezione = lezionePerId(stato.lezioneId)
    if (lezione) return corsoPerId(lezione.corsoId)
  }
  return corsoAperto()
}

/**
 * Di quale classe si sta parlando: prima quella che la pagina mostra per nome
 * (elenco, allievo, docente di classe), poi quella del corso in vista.
 */
export function classeDelContesto (): Classe | null {
  if (stato.vista === 'classi') return classeDellaPaginaClassi()
  if (
    stato.vista === 'allievo' ||
    stato.vista === 'docenteClasse' ||
    (stato.vista === 'check' && stato.ambitoCheck === 'classe')
  ) {
    const scelta = classePerId(stato.classeId)
    if (scelta) return scelta
  }
  const corso = corsoDelContesto()
  return corso ? classePerId(corso.classeId) : classePerId(stato.classeId)
}

/**
 * La classe che la pagina Classi mostra: quella scelta se è dell'anno,
 * altrimenti la prima. La stessa regola vale per la tendina e per i comandi.
 */
export function classeDellaPaginaClassi (): Classe | null {
  const classi = classiDellAnno()
  return classi.find((c) => c.id === stato.classeId) ?? classi[0] ?? null
}

/** La lezione aperta, se il registro della lezione ne sta mostrando una. */
export function lezioneDelContesto (): Lezione | null {
  return lezionePerId(stato.lezioneId)
}

/** Come si chiama il corso del contesto quando lo si deve dire: «DIC4a · Matematica». */
export function nomeDelCorso (corso: Corso): string {
  const classe = nomeClasse(corso.classeId)
  const materia = nomeMateria(corso.materiaId)
  return [classe, materia].filter(Boolean).join(' · ') || corso.titolo || testi().corso
}

// -------------------------------------------------------- i motivi per il no

export function senzaCorso (): string | null {
  return corsoDelContesto() ? null : testi().senzaCorso
}

export function senzaClasse (): string | null {
  return classeDelContesto() ? null : testi().senzaClasse
}

export function senzaAnno (): string | null {
  return annoCorrente() ? null : testi().senzaAnno
}

export function senzaLezione (): string | null {
  return lezioneDelContesto() ? null : testi().senzaLezione
}

export function senzaPosta (): string | null {
  return stato.posta.exchange ? null : testi().senzaPosta
}
