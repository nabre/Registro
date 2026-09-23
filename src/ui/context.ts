// Di che cosa si sta parlando adesso: il corso, la classe, l'ora.
//
// Il contesto non lo passa chi clicca: lo si deduce da dove si sta guardando.
// Il corso è quello della pagina aperta, la classe è quella del corso, e le
// pagine che ne dipendono si accendono soltanto quando ci sono.
//
// Sta in un file suo perché lo leggono in due e per motivi diversi: `pagine.ts`
// per sapere dove si può andare, `commands.ts` per sapere che cosa si può fare.
// Scritto dentro uno dei due, l'altro dovrebbe importarlo di lì — e i due
// elenchi finirebbero legati l'uno all'altro senza averne bisogno.

import type { Classe, Corso, Lezione } from '../domain/models.js'
import {
  aggiorna,
  annoCorrente,
  classePerId,
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

/**
 * Le pagine che guardano un corso alla volta.
 *
 * Sono quelle in cui il corso *è* il filtro: il registro della lezione, le
 * valutazioni, i piani, i documenti.
 *
 * Le altre non lo usano e non devono mostrarne la tendina. Il calendario ha un
 * filtro suo per classe, le pendenze guardano tutto insieme, Corsi *è*
 * l'elenco dei corsi, Classi ha il suo elenco laterale, e Impostazioni e Guida
 * non parlano di didattica. Una tendina che in quelle pagine non cambia niente
 * è peggio di una assente: si prova, non succede nulla, e da lì in poi non la
 * si crede più nemmeno dove funziona.
 *
 * Il pannello del docente di classe non è fra queste: là si lavora su una
 * classe e non su un corso — l'archivio documentale, le famiglie da avvisare,
 * assenze da giustificare valgono per tutte le materie insieme — e la tendina
 * che ci va è quella delle classi.
 */
const VISTE_DEL_CORSO: readonly Vista[] = ['lezione', 'valutazioni', 'piani', 'documenti']

/** Se la pagina aperta è puntata su un corso: lo chiede la barra per la tendina. */
export function siLavoraSuUnCorso (): boolean {
  return VISTE_DEL_CORSO.includes(stato.vista)
}

/**
 * Se la pagina aperta ha filtri suoi, invece di lavorare su una cosa sola.
 *
 * Il calendario guarda tutte le classi insieme — è il suo mestiere — e i suoi
 * due filtri restringono quel che mostra senza dire su che cosa si sta
 * lavorando. Stanno nella stessa riga delle altre scelte, perché è lì che si
 * cerca «che cosa vedo», ma sono campi diversi: cambiarli non sposta il corso
 * su cui sono puntate le pagine del registro.
 */
export function siFiltraLAgenda (): boolean {
  return stato.vista === 'calendario'
}

/** Se la pagina aperta è puntata su una classe di cui si è docente di classe. */
export function siLavoraSuUnaClasse (): boolean {
  return stato.vista === 'docenteClasse'
}

/**
 * La classe del pannello del docente di classe.
 *
 * Quella scelta, se il fascicolo ce l'ha ancora; altrimenti la prima che ce
 * l'ha. La sezione compare solo quando ce n'è almeno una, quindi qui una
 * risposta c'è sempre: è questo che permette alle sue quattro pagine di restare
 * accese invece di spegnersi dicendo che cosa manca.
 */
export function classeDelFascicolo (): Classe | null {
  const docenze = classiDiCuiSonoDocente()
  if (docenze.length === 0) return null
  return docenze.find((classe) => classe.id === stato.classeId) ?? docenze[0] ?? null
}

/**
 * Cambia la classe del pannello del docente di classe.
 *
 * Non tocca il corso: là si lavora per classe e per l'anno intero, e cambiare
 * anche il corso vorrebbe dire tornare nel registro con una materia che non si
 * era chiesta. Il filtro per classe sì, perché è lo stesso che le pagine del
 * corso leggono uscendo di qui.
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
 * Di quale corso si sta parlando.
 *
 * Il registro della lezione fa storia a sé — lì il corso è quello della lezione
 * aperta, che si può raggiungere dal calendario — e fuori di lì vale il corso
 * su cui sono puntate le pagine.
 */
export function corsoDelContesto (): Corso | null {
  if (stato.vista === 'lezione') {
    const lezione = lezionePerId(stato.lezioneId)
    if (lezione) return corsoPerId(lezione.corsoId)
  }
  return corsoAperto()
}

/**
 * Di quale classe si sta parlando: quella aperta, o quella del corso in vista.
 *
 * Nell'ordine: la classe che una pagina sta mostrando per nome — l'elenco, la
 * scheda di un allievo, il pannello del docente di classe — e solo dopo quella
 * del corso, che è una deduzione e non una scelta.
 */
export function classeDelContesto (): Classe | null {
  if (stato.vista === 'classi' || stato.vista === 'allievo' || stato.vista === 'docenteClasse') {
    const scelta = classePerId(stato.classeId)
    if (scelta) return scelta
  }
  const corso = corsoDelContesto()
  return corso ? classePerId(corso.classeId) : classePerId(stato.classeId)
}

/** La lezione aperta, se il registro della lezione ne sta mostrando una. */
export function lezioneDelContesto (): Lezione | null {
  return lezionePerId(stato.lezioneId)
}

/** Come si chiama il corso del contesto quando lo si deve dire: «DIC4a · Matematica». */
export function nomeDelCorso (corso: Corso): string {
  const classe = nomeClasse(corso.classeId)
  const materia = nomeMateria(corso.materiaId)
  return [classe, materia].filter(Boolean).join(' · ') || corso.titolo || 'Corso'
}

// -------------------------------------------------------- i motivi per il no

export function senzaCorso (): string | null {
  return corsoDelContesto() ? null : 'Nessun corso scelto: se ne sceglie uno dalla barra in cima.'
}

export function senzaClasse (): string | null {
  return classeDelContesto()
    ? null
    : 'Nessuna classe aperta: la porta con sé il corso scelto in cima, o la si apre dalla pagina Classi.'
}

export function senzaAnno (): string | null {
  return annoCorrente() ? null : 'Non c’è ancora un anno scolastico.'
}

export function senzaLezione (): string | null {
  return lezioneDelContesto()
    ? null
    : 'Nessun’ora aperta: si apre dal calendario o dalla pagina Lezione.'
}

export function senzaPosta (): string | null {
  return stato.posta.exchange ? null : 'La casella di posta non è collegata.'
}
