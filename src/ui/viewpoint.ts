// Dove si sta guardando, detto all'assistente: gemella di `miraProiezione()` in
// `state.ts`. Parte a ogni cambio di vista, perché senza contesto il modello
// sceglie un corso plausibile e risponde sicuro sul corso sbagliato.
//
// Non sta in `context.ts` perché chiama `nomeDelPosto()` di `pages.ts`, che
// legge `context.ts`: sarebbe un anello. I nomi di pagine e linguette vengono da
// `nomeDelPosto()` e `porzioneAttiva()`, mai riscritti qui.

import { estremiAnno } from '../domain/years.js'
import { grigliaMese, oggi, settimanaDi } from '../domain/dates.js'
import type { Classe, Iso } from '../domain/models.js'
import type {
  ContestoAssistente,
  ElencoVisibile,
  PeriodoContesto,
  VoceContesto,
} from '../protocol.js'
import {
  classeDelContesto,
  classeDelFascicolo,
  corsoDelContesto,
  lezioneDelContesto,
  nomeDelCorso,
  siFiltraLAgenda,
  siLavoraSuUnCorso,
  siLavoraSuUnaClasse,
} from './context.js'
import { nomeDelPosto } from './pages.js'
import {
  MODI_CALENDARIO,
  porzioneAttiva,
  porzioniDellaVista,
} from './tabs.js'
import {
  annoCorrente,
  classiDellAnno,
  classiDiCuiSonoDocente,
  corsiDellAnnoAperto,
  corsiNelSemestre,
  corsoPerId,
  fascicoloDi,
  lezioniInAgenda,
  oreDiOggi,
  nomeSemestreScelto,
  pianoPerId,
  sceltiPresenti,
  semestreScelto,
  stato,
  toccaIlSemestreScelto,
  valutazionePerId,
} from './state.js'
import { nonElencate, secondoLeParti } from './assistant/parts.js'
import { sezioneAperta } from './views/settings/sections.js'
// La ricerca delle persone vive in una variabile di `views/people.ts`: da fuori
// è l'unico modo di sapere che l'elenco è ristretto.
import { oreDelCorso } from './views/lesson.js'
import { depositoAperto, modelliInVista, ricercaDeiModelli } from './views/languageModels.js'
import { personeInElenco, ricercaDellePersone } from './views/people.js'
import { parole } from '../domain/words.testi.js'
import { testi } from './viewpoint.testi.js'
import { testi as testiOggi } from './views/today.testi.js'

/**
 * Quanti id di un elenco si mandano: un elenco di classe ci sta intero, un anno
 * di ore no. Oltre, `troncato` lo dice.
 */
const QUANTI_ID = 30

function elenco (cosa: string, ids: readonly string[]): ElencoVisibile {
  return {
    cosa,
    quanti: ids.length,
    ids: ids.slice(0, QUANTI_ID),
    troncato: ids.length > QUANTI_ID,
  }
}
/**
 * Quante alternative di una tendina si mandano. Le tendine sono cinque o sei e
 * la finestra del modello è già stretta: oltre il tetto, una riga «… e altre N
 * non elencate» (formula in `assistant/parts.ts`), perché un elenco tagliato in
 * silenzio il modello lo crede intero.
 */
const QUANTE_OPZIONI = 12

type Opzione = { valore: string, id: string | null }

/**
 * La finestra di alternative da mandare, centrata sulla scelta: le vicine sono
 * quelle di cui si chiede («quella prima», «la successiva»), e in un corso con
 * quaranta ore la scelta può essere lontana dall'inizio.
 */
function attorno (opzioni: Opzione[], id: string | null): Opzione[] {
  if (opzioni.length <= QUANTE_OPZIONI) return opzioni
  const dove = opzioni.findIndex((o) => o.id !== null && o.id === id)
  if (dove < QUANTE_OPZIONI) return opzioni.slice(0, QUANTE_OPZIONI)
  const mezzo = Math.floor(QUANTE_OPZIONI / 2)
  const inizio = Math.min(dove - mezzo, opzioni.length - QUANTE_OPZIONI)
  return opzioni.slice(inizio, inizio + QUANTE_OPZIONI)
}

function voce (
  campo: string,
  valore: string,
  id: string | null,
  opzioni?: Opzione[],
  /** Il campo da cui questa scelta dipende: «Corso» sta dentro «Classe». */
  dentro?: string,
): VoceContesto {
  const sotto = dentro ? { dentro } : {}
  if (!opzioni || opzioni.length === 0) return { campo, valore, id, ...sotto }
  const dette = attorno(opzioni, id)
  const resto = opzioni.length - dette.length
  return {
    campo,
    valore,
    id,
    ...sotto,
    // Quel che resta fuori si dice con `nonElencate()`, che sta accanto a chi la
    // riconosce (il menu non la conta come un'alternativa).
    opzioni: resto > 0 ? [...dette, nonElencate(resto)] : dette,
  }
}

/**
 * Il periodo dei conti, in date: gli attrezzi vogliono `dal` e `al`, non un id
 * di semestre. Sono gli estremi che usa `nelSemestreScelto`; senza semestre,
 * quelli dell'anno.
 */
function periodo (): PeriodoContesto {
  const semestre = semestreScelto()
  if (semestre) {
    return { etichetta: semestre.etichetta, dal: semestre.inizio, al: semestre.fine }
  }
  const anno = annoCorrente()
  const estremi = estremiAnno(anno)
  return {
    etichetta: testi().annoIntero,
    dal: estremi?.inizio ?? null,
    al: estremi?.fine ?? null,
  }
}

/**
 * La sezione aperta dentro la scheda, dove la pagina ha due livelli (le
 * impostazioni). I nomi vengono da `settings/sections.ts`.
 */
function sezione (): string | null {
  if (stato.vista !== 'impostazioni') return null
  const { ambitoImpostazioni, schedaDocumento, schedaProgramma } = stato
  return sezioneAperta(ambitoImpostazioni, schedaDocumento, schedaProgramma).titolo
}

/**
 * Di quale classe la pagina sta parlando, come la nomina la barra: una sola
 * risposta per la scelta «Classe», l'elenco a schermo e `classeId`. Nel
 * pannello del docente di classe è la classe del fascicolo, altrove
 * `classeDelContesto()`.
 */
function classeDellaBarra (): Classe | null {
  return siLavoraSuUnaClasse() ? classeDelFascicolo() : classeDelContesto()
}

/**
 * Le scelte fatte nelle tendine in cima, solo quelle che la pagina mostra
 * (gli stessi `siLavoraSu…` della barra): un filtro invisibile non va detto.
 */
function scelte (): VoceContesto[] {
  const fatte: VoceContesto[] = []
  const t = testi()
  const C = t.campi
  const anno = annoCorrente()
  if (anno) fatte.push(voce(C.annoScolastico, anno.etichetta, anno.id))

  const semestre = semestreScelto()
  fatte.push(voce(
    parole().periodo,
    semestre ? nomeSemestreScelto() : t.annoIntero,
    semestre?.id ?? null,
    // Le stesse voci della tendina, «Anno intero» compreso: è una scelta vera.
    [
      ...(anno?.semestri ?? []).map((s) => ({ valore: s.etichetta, id: s.id })),
      { valore: t.annoIntero, id: null },
    ],
    C.annoScolastico,
  ))

  // Le scelte scendono per gradi (anno › classe › corso › ora, con `dentro`),
  // così il modello sa che restringere la classe restringe i corsi. La classe si
  // dice anche dove la barra non ne mostra la tendina (è dentro il nome del
  // corso), con le alternative che la barra offre davvero.
  const laClasse = classeDellaBarra()
  if (laClasse) {
    const scegliibili = siLavoraSuUnaClasse() ? classiDiCuiSonoDocente() : classiDellAnno()
    fatte.push(voce(
      C.classe,
      laClasse.nome,
      laClasse.id,
      scegliibili.map((c) => ({ valore: c.nome, id: c.id })),
      C.annoScolastico,
    ))
  }
  if (siLavoraSuUnCorso()) {
    const corso = corsoDelContesto()
    if (corso) {
      // I corsi di questa classe, non tutti quelli del semestre.
      const suoi = corsiNelSemestre()
        .filter((c) => !laClasse || c.classeId === laClasse.id)
      fatte.push(voce(
        C.corso,
        nomeDelCorso(corso),
        corso.id,
        (suoi.length > 0 ? suoi : corsiNelSemestre())
          .map((c) => ({ valore: nomeDelCorso(c), id: c.id })),
        laClasse ? C.classe : C.annoScolastico,
      ))
    }
  }
  // L'ora aperta come la scrive la sua tendina («✓ 12. gio 14.11 · 08:20 ·
  // Frazioni»): sono le parole con cui se ne parla.
  const ora = stato.vista === 'lezione' ? lezioneDelContesto() : null
  if (ora) {
    const ore = oreDelCorso(ora)
    fatte.push(voce(
      C.lezioneDelCorso,
      ore.find((o) => o.id === ora.id)?.etichetta ?? ora.data,
      ora.id,
      ore.map((o) => ({ valore: o.etichetta, id: o.id })),
      C.corso,
    ))
  }
  // Le linguette della pagina, da `porzioniDellaVista()`.
  const linguette = porzioniDellaVista()
  if (linguette.length > 0) {
    fatte.push(voce(
      C.schedaAperta,
      porzioneAttiva()?.testo ?? linguette[0].testo,
      null,
      linguette.map((l) => ({ valore: l.testo, id: null })),
    ))
  }
  // Il deposito aperto nei modelli linguistici: è anche il `deposito` che
  // `llm.file` chiede.
  const deposito = modelliInVista() ? depositoAperto() : null
  if (deposito) {
    fatte.push(voce(C.depositoAperto, deposito.deposito, null))
    if (deposito.consigliato) {
      fatte.push(voce(C.fileConsigliato, deposito.consigliato, null))
    }
  }
  return fatte
}

/**
 * Quel che la pagina sta restringendo: una scelta dice su che cosa si lavora,
 * un filtro quanto se ne vede (per non rispondere sull'anno a chi guarda un mese).
 */
function filtri (): VoceContesto[] {
  const accesi: VoceContesto[] = []
  const t = testi()
  const C = t.campi

  if (siFiltraLAgenda()) {
    const corso = corsoPerId(stato.filtroCorsoAgendaId)
    accesi.push(voce(
      C.corsoInAgenda,
      corso ? nomeDelCorso(corso) : t.tuttiICorsi,
      corso?.id ?? null,
      [
        { valore: t.tuttiICorsi, id: null },
        ...corsiDellAnnoAperto().map((c) => ({ valore: nomeDelCorso(c), id: c.id })),
      ],
    ))
    // Le parole dei pulsanti («Settimana»), non le chiavi del codice.
    accesi.push(voce(
      C.modoCalendario,
      MODI_CALENDARIO.find((m) => m.valore === stato.modoCalendario)?.testo ?? stato.modoCalendario,
      null,
      MODI_CALENDARIO.map((m) => ({ valore: m.testo, id: null })),
    ))
  }
  if (stato.vista === 'docenteClasse') {
    if (stato.schedaDocente === 'assenze') {
      const blocco = bloccoDelleAssenze()
      if (blocco) {
        accesi.push(voce(
          C.periodoAssenze,
          `${blocco.etichetta} (${blocco.dal} → ${blocco.al})`,
          blocco.id,
          blocchiDelleAssenze().map((b) => ({ valore: b.etichetta, id: b.id })),
        ))
      }
    }
    // Lo sfoglio con le pagine già archiviate (`sfoglioSmistamento`), nell'archivio
    // documentale e nelle assenze.
    if (stato.mostraArchiviate) {
      accesi.push(voce(C.pagineArchiviate, t.mostrate, null))
    }
  }
  // Solo le spunte che aprono ancora un file (`sceltiPresenti`).
  const scelti = stato.vista === 'documenti' ? sceltiPresenti().length : 0
  if (scelti > 0) {
    accesi.push(voce(C.documentiSpuntati, `${scelti}`, null))
  }
  return accesi
}

/**
 * I periodi di assenze del pannello, e quello aperto con lo stesso ripiego
 * della pagina (lo scelto se tocca il semestre, se no il primo).
 */
function blocchiDelleAssenze () {
  const classe = classeDelFascicolo()
  if (!classe) return []
  return toccaIlSemestreScelto([...fascicoloDi(classe.id).assenze]).sort((a, b) =>
    b.dal.localeCompare(a.dal),
  )
}

function bloccoDelleAssenze () {
  const blocchi = blocchiDelleAssenze()
  return blocchi.find((b) => b.id === stato.bloccoAssenzeId) ?? blocchi[0] ?? null
}

/**
 * Gli elementi che la pagina mostra adesso, filtrati come si vedono. `null`
 * dove l'elenco non si sa ricomporre: un elenco quasi giusto è peggio di nessuno.
 */
function visibili (): ElencoVisibile | null {
  const t = testi()
  switch (stato.vista) {
    // «Oggi»: le ore del giorno, annullate comprese come nella pagina.
    case 'oggi':
      return elenco(testiOggi().oreDiOggiMinuscolo, oreDiOggi().map((o) => o.lezione.id))
    case 'calendario': {
      // Le ore della finestra mostrata, non dell'anno: la decide il modo, come nella vista.
      const { dal, al } = finestraDelCalendario()
      return elenco(
        t.oreInCalendario,
        lezioniInAgenda()
          .filter((l) => (!dal || l.data >= dal) && (!al || l.data <= al))
          .sort((a, b) => a.data.localeCompare(b.data))
          .map((l) => l.id),
      )
    }
    // Tutti i corsi dell'anno come nella pagina (`corsiNelSemestre()` è la tendina).
    case 'corsi':
      return elenco(t.corsi, corsiDellAnnoAperto().map((c) => c.id))
    // Archiviate comprese: la pagina le mostra spente.
    case 'classi':
      return elenco(t.classi, classiDellAnno().map((c) => c.id))
    // Le persone come le restringono la ricerca e le classi aperte della pagina:
    // lo sa solo la vista.
    case 'persone':
      return elenco(t.personeInElenco, personeInElenco())
    // Le pagine puntate su una classe: l'elenco davanti è quello delle persone.
    case 'lezione':
    case 'valutazioni':
    case 'check':
    case 'docenteClasse':
    case 'allievo': {
      // La stessa classe che la barra nomina.
      const classe = classeDellaBarra()
      if (!classe) return null
      return elenco(t.personeDella(classe.nome), classe.allievi.map((a) => a.id))
    }
    default:
      return null
  }
}

/**
 * Il pezzo di anno che il calendario ha davanti: la settimana di `data`, la
 * griglia intera del mese, l'agenda da `data` a fine anno, o l'anno.
 */
function finestraDelCalendario (): { dal: Iso | null, al: Iso | null } {
  const anno = annoCorrente()
  switch (stato.modoCalendario) {
    case 'settimana': {
      const giorni = settimanaDi(stato.data)
      return { dal: giorni[0], al: giorni[giorni.length - 1] }
    }
    case 'mese': {
      const celle = grigliaMese(stato.data)
      return { dal: celle[0], al: celle[celle.length - 1] }
    }
    case 'agenda':
      return { dal: stato.data, al: anno?.fine ?? null }
    default:
      return { dal: anno?.inizio ?? null, al: anno?.fine ?? null }
  }
}

/**
 * Il testo nella casella di ricerca della pagina aperta. Le caselle sono tre:
 * `stato.ricerca` (solo i piani) e le variabili di modulo di persone e modelli
 * linguistici. Fuori da quelle pagine la ricerca non vale.
 */
function ricercaDellaPagina (): string {
  if (stato.vista === 'persone') return ricercaDellePersone()
  if (modelliInVista()) return ricercaDeiModelli()
  return stato.vista === 'piani' ? stato.ricerca.trim() : ''
}

/** Di che cosa si sta parlando: la pagina, la scheda, le tendine, i filtri. */
export function veduta (): ContestoAssistente {
  const corso = corsoDelContesto()
  const classe = classeDellaBarra()
  const lezione = lezioneDelContesto()
  const cercato = ricercaDellaPagina()

  return {
    vista: stato.vista,
    pagina: nomeDelPosto(),
    scheda: porzioneAttiva()?.testo ?? null,
    sezione: sezione(),
    scelte: scelte(),
    filtri: filtri(),
    riferimenti: {
      annoId: annoCorrente()?.id ?? null,
      semestreId: stato.semestreId,
      // Il corso solo dove la barra ne mostra la tendina, con la stessa guardia di
      // `scelte()`: `corsoDelContesto()` ripiega sempre sul primo corso, e un
      // `corsoId` non scelto farebbe filtrare il modello su un corso a caso.
      corsoId: siLavoraSuUnCorso() ? corso?.id ?? null : null,
      classeId: classe?.id ?? null,
      // L'ora aperta anche fuori dalla pagina Lezione (come la mira della
      // proiezione), ma solo nelle pagine del corso: fuori, l'ora ricordata non è
      // quella di cui si parla.
      lezioneId: siLavoraSuUnCorso() ? lezione?.id ?? null : null,
      // Persona, piano e prova solo nella pagina che li mostra e solo se esistono
      // ancora: lo stato li ricorda anche da ieri.
      allievoId:
        (stato.vista === 'allievo' || stato.vista === 'persone') &&
        stato.registro.classi.some((c) => c.allievi.some((a) => a.id === stato.allievoId))
          ? stato.allievoId
          : null,
      pianoId: stato.vista === 'piani' ? pianoPerId(stato.pianoId)?.id ?? null : null,
      valutazioneId:
        stato.vista === 'valutazioni' ? valutazionePerId(stato.valutazioneId)?.id ?? null : null,
    },
    periodo: periodo(),
    data: stato.data,
    oggi: oggi(),
    ricerca: cercato === '' ? null : cercato,
    visibili: visibili(),
  }
}

/**
 * L'ultima veduta mandata, come testo: lo stato cambia a ogni tasto e il
 * contesto no. Si confronta il JSON perché la forma è annidata.
 */
let detta = ''

/**
 * Che cosa mandare all'assistente, o `null` se non è cambiato niente. Da non
 * confondere con `contesto: null`, che vuol dire interruttore spento e va
 * mandato una volta, perché l'host butti la veduta che teneva.
 */
export function vedutaCambiata (): { contesto: ContestoAssistente | null } | null {
  // La veduta si compone intera e si riduce dopo secondo le parti accese (vedi
  // `assistant/parts.ts`): una strada sola in cui un campo non resta indietro.
  const adesso = secondoLeParti(veduta(), stato.contestoAssistente)
  const scritta = adesso === null ? '' : JSON.stringify(adesso)
  if (scritta === detta) return null
  detta = scritta
  return { contesto: adesso }
}
