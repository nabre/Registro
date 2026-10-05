// Di che cosa si sta parlando adesso — corso, classe, ora — dedotto dalla
// pagina aperta. File a sé perché lo leggono `pages.ts` (dove si può andare) e
// `commands.ts` (che cosa si può fare) senza legarsi l'uno all'altro.

import type { Classe, Corso, Lezione } from '#core/dominio/models.js'
import type { ContestoCondiviso } from '#contract/protocol.js'
import type { Contesto, Posto } from './place.js'
import type { Condivisi } from './windows.js'
import {
  aggiorna,
  annoCorrente,
  classePerId,
  classiDellAnno,
  classiDiCuiSonoDocente,
  corsoAperto,
  corsoPerId,
  lezionePerId,
  nomeClasse,
  nomeMateria,
  stato,
  vai,
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
  'piani',
  'overview',
  'progetti',
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
 * Cambia la classe del pannello del docente di classe, restando sulla scheda.
 * Non tocca il corso (là si lavora per classe), sì il filtro per classe che le
 * pagine del corso leggono.
 */
export function scegliClasseDelFascicolo (id: string): void {
  const classe = classePerId(id)
  if (!classe?.docenteDiClasse) return
  vai(
    { pagina: stato.posto.pagina, soggetto: { tipo: 'classe', id: classe.id } },
    { contesto: { classeId: classe.id, filtroClasseId: classe.id } },
  )
}

/**
 * Cambia il corso di lavoro. Le pagine del corso si spostano sul corso (il
 * Registro sulla sua ora di riferimento, o sui piani se non ne ha); la scheda
 * di una persona, o un fascicolo di una classe che non ne ha, lasciano il
 * posto all'elenco delle classi; le altre pagine restano dove sono.
 */
export function scegliCorso (id: string): void {
  const corso = corsoPerId(id)
  if (!corso) return
  const { pagina, scheda } = stato.posto
  let posto: Posto = scheda ? { pagina, scheda } : { pagina }
  if (pagina.startsWith('pagina.corso.') || pagina === 'pagina.corsi') {
    posto = { pagina, soggetto: { tipo: 'corso', id: corso.id } }
  } else if (pagina === 'pagina.calendario' && stato.posto.soggetto) {
    // Il calendario ha un filtro suo: l'ora guardata resta.
    posto = stato.posto
  } else if (
    pagina === 'pagina.allievo' ||
    (pagina.startsWith('pagina.classe.') && !classePerId(corso.classeId)?.docenteDiClasse)
  ) {
    posto = { pagina: 'pagina.classi' }
  }
  vai(posto, {
    contesto: { corsoId: corso.id, filtroClasseId: corso.classeId, classeId: corso.classeId },
  })
}

/** Il corso di lavoro, la classe del docente di classe e il periodo, che tutte le finestre hanno uguali. */
export function condivisiDiAdesso (): Condivisi {
  const classe = classePerId(stato.contesto.classeId)
  return {
    corsoId: stato.contesto.corsoId,
    // Solo una classe del fascicolo: l'allievo di un'altra classe sposta la
    // classe di questa finestra, ma non il fascicolo delle altre.
    classeId: classe?.docenteDiClasse ? classe.id : null,
    semestreId: stato.semestreId,
  }
}

/**
 * Prende corso, classe e periodo scelti in un'altra finestra, come se li si
 * scegliesse qui dalle tendine. Il periodo va insieme al posto, perché l'ora
 * di riferimento di un corso è quella del suo periodo. Le pagine del corso
 * vanno sul corso nuovo (il Registro sulla sua ora di riferimento, come fa
 * `scegliCorso`), quelle del docente di classe sulla classe nuova
 * (`scegliClasseDelFascicolo`). Le altre restano
 * dove sono e li tengono per dopo: una persona, il calendario su un'ora o una
 * classe per nome non si spostano per un gesto fatto altrove. Il posto prende
 * il posto di quello di adesso nella fila di Alt+←: tornare indietro qui
 * riporterebbe il corso di prima in tutte.
 */
export function allineaCondivisi (condiviso: ContestoCondiviso): void {
  const corso = condiviso.corsoId && condiviso.corsoId !== stato.contesto.corsoId
    ? corsoPerId(condiviso.corsoId)
    : null
  const scelta = condiviso.classeId && condiviso.classeId !== stato.contesto.classeId
    ? classePerId(condiviso.classeId)
    : null
  const classe = scelta?.docenteDiClasse ? scelta : null
  const semestreId = condiviso.semestreId
  // Un semestre che quest'anno non ha non si prende (`allineaSemestre`).
  const periodo = semestreId !== undefined && semestreId !== stato.semestreId &&
    (semestreId === null || annoCorrente()?.semestri.some((s) => s.id === semestreId) === true)
  if (!corso && !classe) {
    // Il periodo da solo: come la sua tendina, la pagina resta dov'è.
    if (periodo) aggiorna({ semestreId: semestreId ?? null })
    return
  }
  const { pagina } = stato.posto
  let posto: Posto = stato.posto
  const contesto: Partial<Contesto> = {}
  if (corso) {
    contesto.corsoId = corso.id
    contesto.filtroClasseId = corso.classeId
    if (pagina.startsWith('pagina.corso.') || pagina === 'pagina.corsi') {
      posto = { pagina, soggetto: { tipo: 'corso', id: corso.id } }
    }
  }
  if (classe) {
    contesto.classeId = classe.id
    if (pagina.startsWith('pagina.classe.')) {
      posto = { pagina, soggetto: { tipo: 'classe', id: classe.id } }
      contesto.filtroClasseId = classe.id
    }
  }
  vai(posto, {
    contesto,
    storia: 'sostituisci',
    ...(periodo ? { preferenze: { semestreId: semestreId ?? null } } : {}),
  })
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
