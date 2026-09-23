// Dove si sta guardando, detto all'assistente.
//
// È la gemella di `miraProiezione()` in `stato.ts`, per un altro schermo: là si
// dice a un proiettore che cosa mostrare, qui si dice a un modello di che cosa
// si sta parlando. Parte a ogni cambio di vista come `proiezione.mira`, e per
// la stessa ragione — il contesto lo si deduce da dove si guarda, non lo si fa
// battere a chi chiede.
//
// Senza, «quante ore ha perso la 4a» partiva senza la 4a: il modello chiamava
// un elenco di corsi, ne sceglieva uno plausibile e rispondeva su quello. In un
// registro una risposta sicura sul corso sbagliato è indistinguibile da una
// giusta finché non la si controlla — ed è il modo peggiore di sbagliare che ci
// sia, perché si trascrive.
//
// ------------------------------------------------------------ perché sta qui
//
// Non in `contesto.ts`, che è il file da cui `pagine.ts` legge di che corso si
// stia parlando: di qui si chiama `nomeDelPosto()`, che sta proprio in
// `pagine.ts`, e i due file si sarebbero chiusi in un anello. Non in una vista,
// perché il contesto attraversa tutte le pagine e nessuna ne è padrona.
//
// I nomi delle pagine e delle linguette **non si riscrivono**: li danno
// `nomeDelPosto()` e `porzioneAttiva()`, che sono già la risposta alla domanda
// «come si chiama il posto in cui sto». Una seconda tabella qui dentro sarebbe
// quella che resta indietro il giorno in cui una pagina cambia nome, e il
// modello racconterebbe a chi chiede una pagina che non esiste più.

import { estremiAnno } from '../domain/years.js'
import { grigliaMese, oggi, settimanaDi } from '../domain/dates.js'
import { PIF } from '../domain/lexicon.js'
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
  FILTRI_TODO,
  FILTRI_TODO_CLASSE,
  MODI_CALENDARIO,
  porzioneAttiva,
  porzioniDellaVista,
} from './tabs.js'
import {
  annoCorrente,
  classePerId,
  classiDellAnno,
  classiDiCuiSonoDocente,
  classiVisibili,
  corsiDellAnnoAperto,
  corsiNelSemestre,
  corsoPerId,
  fascicoloDi,
  lezioniInAgenda,
  nomeSemestreScelto,
  pianoPerId,
  semestreScelto,
  stato,
  toccaIlSemestreScelto,
  valutazionePerId,
} from './state.js'
import { nonElencate, secondoLeParti } from './assistant/parts.js'
import { SEZIONI_DOCUMENTO, SEZIONI_PROGRAMMA } from './views/settings/sections.js'
// Dall'elenco delle persone si leggono due cose che nello stato non ci sono: la
// ricerca di quella pagina vive in una variabile del suo modulo — la nota in
// testa a `views/people.ts` dice perché — e da fuori non c'è altro modo di
// sapere che l'elenco è ristretto.
import { oreDelCorso } from './views/lesson.js'
import { depositoAperto, ricercaDeiModelli } from './views/languageModels.js'
import { personeInElenco, ricercaDellePersone } from './views/people.js'

/**
 * Quanti id di un elenco si mandano.
 *
 * Trenta: un elenco di classe ci sta intero — è il caso che conta, perché «chi
 * ha più assenze» si chiede su una classe — e un anno di ore non ci sta, che è
 * giusto così. Mandarli tutti vorrebbe dire riempire la finestra del modello di
 * identificatori e farne scorrere via le istruzioni; mandarne una manciata
 * senza dirlo sarebbe peggio, ed è per questo che accanto viaggia `troncato`.
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
 * Quante alternative di una tendina si mandano.
 *
 * Dodici, ed erano venti: le classi di chi insegna ci stanno tutte, i corsi di
 * una classe pure, e un elenco più lungo di così in cima a ogni domanda
 * riempirebbe la finestra del modello di voci che nessuno ha chiesto. Il tetto
 * vale per ogni tendina e le tendine sono cinque o sei: venti alternative per
 * sei tendine sono migliaia di caratteri **prima** della domanda, su una
 * finestra che i modelli che girano qui dentro hanno già stretta — il catalogo
 * degli attrezzi e le istruzioni ne occupano da soli la metà buona, e quel che
 * scorre via per primo è proprio l'istruzione che sta più in alto.
 *
 * Quel che resta fuori si dice — «… e altre sette non elencate» — invece di
 * sparire: un elenco tagliato in silenzio è un elenco che il modello crede
 * intero, e «sono tutte» è una risposta sbagliata. La formula della riga sta in
 * `assistant/parts.ts`, che è l'altra metà che la deve riconoscere.
 */
const QUANTE_OPZIONI = 12

type Opzione = { valore: string, id: string | null }

/**
 * La finestra di alternative da mandare, attorno a quella scelta.
 *
 * Tagliare dall'inizio andava bene per le tendine corte — cinque corsi, tre
 * classi — e non per quella delle ore: un corso ne ha quaranta, la
 * trentaduesima è quella aperta, e le prime dodici non la contengono. Il
 * modello riceveva un elenco in cui l'ora di cui si stava parlando non
 * compariva: da lì «quella prima» e «la successiva» sono due domande a cui non
 * poteva rispondere.
 *
 * Attorno, quindi, e non dall'inizio: la scelta sta al centro, con le vicine ai
 * due lati — che sono proprio quelle di cui si chiede.
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
    // Quel che resta fuori si dice: un elenco tagliato in silenzio è un elenco
    // che il modello crede intero, e «sono tutte» è una risposta sbagliata. La
    // riga la scrive `nonElencate()`, che sta accanto a chi la deve
    // riconoscere: il menu della testata la contava come un'alternativa vera e
    // scriveva «Corso (21)» per venti corsi.
    opzioni: resto > 0 ? [...dette, nonElencate(resto)] : dette,
  }
}

/**
 * Il periodo su cui la pagina fa i conti, **in date**.
 *
 * È la scelta «Periodo» della barra tradotta in quel che gli attrezzi
 * chiedono: nessuno di loro accetta un id di semestre — `corso.presenze` vuole
 * `dal` e `al` — e un contesto che dicesse soltanto `semestreId=sem-0002`
 * lascerebbe il modello davanti a due strade sbagliate, chiedere l'anno intero
 * o inventarsi le date del semestre. Le due che escono di qui sono le stesse su
 * cui la pagina conta le medie: `nelSemestreScelto` filtra con questi estremi.
 *
 * Senza semestre scelto è l'anno intero, e sono gli estremi dell'anno e non
 * `null`: «anno intero» detto senza date è di nuovo qualcosa da indovinare.
 */
function periodo (): PeriodoContesto {
  const semestre = semestreScelto()
  if (semestre) {
    return { etichetta: semestre.etichetta, dal: semestre.inizio, al: semestre.fine }
  }
  const anno = annoCorrente()
  const estremi = estremiAnno(anno)
  return {
    etichetta: 'Anno intero',
    dal: estremi?.inizio ?? null,
    al: estremi?.fine ?? null,
  }
}

/**
 * La sezione aperta dentro la scheda, dove la pagina ha due livelli.
 *
 * Oggi sono le impostazioni, e la scheda da sola non bastava: `porzioneAttiva()`
 * dice di quale metà si tratta — «Il programma», «Il documento» — perché in
 * fondo allo schermo il titolo della sezione si sta già leggendo a due
 * centimetri di distanza. Al modello quel titolo non lo legge nessuno, e
 * «Il programma» come risposta a «dove sono» copre otto pagine diverse.
 *
 * I nomi vengono da `settings/sections.ts`, che è dove la pagina li prende:
 * una seconda tabella qui sarebbe quella che resta indietro alla prima sezione
 * rinominata.
 */
function sezione (): string | null {
  if (stato.vista !== 'impostazioni') return null
  const aperta = stato.ambitoImpostazioni === 'programma'
    ? SEZIONI_PROGRAMMA.find((s) => s.id === stato.schedaProgramma)
    : SEZIONI_DOCUMENTO.find((s) => s.id === stato.schedaDocumento)
  return aperta?.titolo ?? null
}

/**
 * Di quale classe la pagina sta parlando, come la nomina la barra.
 *
 * Una funzione sola perché la leggono in tre — la riga «Classe» delle scelte,
 * l'elenco a schermo, il riferimento `classeId` — e le tre devono dire la
 * stessa classe. Dicevano due cose diverse: nel pannello del docente di classe
 * la barra mostra la classe del fascicolo, che ripiega sulla prima di cui si è
 * docente quando `stato.classeId` ne nomina un'altra (`contesto.ts`), mentre
 * `classeDelContesto()` ripiega sulla classe dedotta dal corso. Il modello
 * leggeva «Classe: II MEC B» e riceveva l'id di un'altra — e una risposta
 * sicura sulla classe sbagliata è indistinguibile da una giusta finché non la
 * si controlla.
 *
 * Fuori da quel pannello le due funzioni tornano la stessa cosa: là
 * `siLavoraSuUnaClasse()` è falso e questa è `classeDelContesto()` e basta.
 */
function classeDellaBarra (): Classe | null {
  return siLavoraSuUnaClasse() ? classeDelFascicolo() : classeDelContesto()
}

/**
 * Le scelte fatte nelle tendine in cima, quelle che la pagina mostra davvero.
 *
 * Si guardano gli stessi `siLavoraSu…` che comandano la barra, e non lo stato
 * grezzo: una tendina che nella pagina non c'è è una scelta che lì non vuol
 * dire niente, e raccontarla al modello vorrebbe dire dargli per buono un
 * filtro che chi chiede non sta vedendo.
 */
function scelte (): VoceContesto[] {
  const fatte: VoceContesto[] = []
  const anno = annoCorrente()
  if (anno) fatte.push(voce('Anno scolastico', anno.etichetta, anno.id))

  const semestre = semestreScelto()
  fatte.push(voce(
    'Periodo',
    semestre ? nomeSemestreScelto() : 'Anno intero',
    semestre?.id ?? null,
    // Le stesse voci della tendina della barra, «Anno intero» compreso: è una
    // scelta vera, e senza elencarla il modello crederebbe che il periodo si
    // possa solo stringere.
    [
      ...(anno?.semestri ?? []).map((s) => ({ valore: s.etichetta, id: s.id })),
      { valore: 'Anno intero', id: null },
    ],
    'Anno scolastico',
  ))

  // Le scelte scendono per gradi: l'anno tiene le classi, la classe tiene i
  // corsi, il corso tiene le ore. Prima uscivano piatte — tre tendine che non
  // si parlano — e chi legge non aveva modo di sapere che restringere la
  // classe restringe i corsi: a «e la terza?» il modello sceglieva un corso
  // qualunque dell'anno invece di un altro corso **di quella classe**.
  //
  // La classe si dice anche dove la barra non ne mostra la tendina: nelle
  // pagine del corso è dentro il nome — «DIC4a · Matematica» — e dentro un
  // nome non è un id che si passa a un attrezzo. Le alternative però sono
  // quelle che la barra offre davvero, perché quella resta la scelta che si
  // può fare a schermo.
  const laClasse = classeDellaBarra()
  if (laClasse) {
    const scegliibili = siLavoraSuUnaClasse() ? classiDiCuiSonoDocente() : classiDellAnno()
    fatte.push(voce(
      'Classe',
      laClasse.nome,
      laClasse.id,
      scegliibili.map((c) => ({ valore: c.nome, id: c.id })),
      'Anno scolastico',
    ))
  }
  if (siLavoraSuUnCorso()) {
    const corso = corsoDelContesto()
    if (corso) {
      // I corsi di **questa** classe, non tutti quelli del semestre: è la
      // gerarchia vera della barra, e un elenco che scavalca la classe scelta
      // è un elenco in cui la scelta di sopra non conta niente.
      const suoi = corsiNelSemestre()
        .filter((c) => !laClasse || c.classeId === laClasse.id)
      fatte.push(voce(
        'Corso',
        nomeDelCorso(corso),
        corso.id,
        (suoi.length > 0 ? suoi : corsiNelSemestre())
          .map((c) => ({ valore: nomeDelCorso(c), id: c.id })),
        laClasse ? 'Classe' : 'Anno scolastico',
      ))
    }
  }
  // L'ora aperta nel registro, come la scrive la sua tendina: «✓ 12. gio 14.11
  // · 08:20 · Frazioni». Il contesto la diceva con il solo `lezioneId`, cioè
  // con l'unico modo di nominarla che chi chiede non ha mai visto: la tendina
  // del registro porta il numero d'ordine, il giorno e l'ora, ed è con quelle
  // parole che si parla di un'ora — «la dodicesima», «quella di giovedì».
  const ora = stato.vista === 'lezione' ? lezioneDelContesto() : null
  if (ora) {
    const ore = oreDelCorso(ora)
    fatte.push(voce(
      'Lezione del corso',
      ore.find((o) => o.id === ora.id)?.etichetta ?? ora.data,
      ora.id,
      ore.map((o) => ({ valore: o.etichetta, id: o.id })),
      'Corso',
    ))
  }
  // Le linguette della pagina: quel che si può aprire qui dentro senza
  // cambiare pagina. Le dà `porzioniDellaVista()`, cioè la stessa tabella da
  // cui le prende la vista — una seconda qui sarebbe quella che resta indietro.
  const linguette = porzioniDellaVista()
  if (linguette.length > 0) {
    fatte.push(voce(
      'Scheda aperta nella pagina',
      porzioneAttiva()?.testo ?? linguette[0].testo,
      null,
      linguette.map((l) => ({ valore: l.testo, id: null })),
    ))
  }
  // Il modello di documento aperto è una scelta come le altre, e per una volta
  // è anche l'argomento di un attrezzo: `modelli.leggi` e `modelli.prova`
  // vogliono esattamente questo nome. Senza, «che cosa dice questo modello?»
  // partiva senza sapere quale, e il modello ne apriva uno a caso fra quelli
  // che gli tornavano da un elenco.
  if (stato.vista === 'modelli' && stato.modelloScelto) {
    fatte.push(voce('Modello aperto', stato.modelloScelto, null))
  }
  // Lo stesso per il deposito aperto nella pagina dei modelli del linguaggio:
  // è quel che `llm.file` chiede come `deposito`, e chi guarda ce l'ha già
  // sotto gli occhi con i suoi file elencati.
  const deposito = stato.vista === 'modelliLinguistici' ? depositoAperto() : null
  if (deposito) {
    fatte.push(voce('Deposito aperto', deposito.deposito, null))
    if (deposito.consigliato) {
      fatte.push(voce('File consigliato del deposito', deposito.consigliato, null))
    }
  }
  return fatte
}

/**
 * Quel che la pagina sta restringendo.
 *
 * Diviso dalle scelte apposta: una scelta dice *su che cosa* si lavora, un
 * filtro dice *quanto se ne vede*. Al modello servono tutte e due, e per due
 * cose diverse — la prima per sapere su quale corso rispondere, la seconda per
 * non rispondere sull'anno intero a chi sta guardando un mese.
 */
function filtri (): VoceContesto[] {
  const accesi: VoceContesto[] = []

  if (siFiltraLAgenda()) {
    const corso = corsoPerId(stato.filtroCorsoAgendaId)
    accesi.push(voce(
      'Corso in agenda',
      corso ? nomeDelCorso(corso) : 'Tutti i corsi',
      corso?.id ?? null,
      [
        { valore: 'Tutti i corsi', id: null },
        ...corsiDellAnnoAperto().map((c) => ({ valore: nomeDelCorso(c), id: c.id })),
      ],
    ))
    // «Settimana» e non `settimana`: le parole sono quelle che chi chiede legge
    // sui pulsanti, e una chiave del codice in mezzo a un contesto scritto in
    // italiano è una parola che il modello ripete a chi non l'ha mai vista.
    accesi.push(voce(
      'Modo del calendario',
      MODI_CALENDARIO.find((m) => m.valore === stato.modoCalendario)?.testo ?? stato.modoCalendario,
      null,
      MODI_CALENDARIO.map((m) => ({ valore: m.testo, id: null })),
    ))
  }
  if (stato.vista === 'todo') {
    accesi.push(voce(
      'Pendenze mostrate',
      FILTRI_TODO.find((f) => f.valore === stato.filtroTodo)?.testo ?? stato.filtroTodo,
      null,
      FILTRI_TODO.map((f) => ({ valore: f.testo, id: null })),
    ))
    // La scheda di classe aperta nelle pendenze: è un filtro a tutti gli
    // effetti — si vede quel che deve quella classe e nient'altro — e senza,
    // «che cosa manca?» riceveva la risposta di tutte le classi insieme.
    const classe = classePerId(stato.classeTodoId)
    accesi.push(voce(
      'Classe delle pendenze',
      classe?.nome ?? 'Tutte',
      classe?.id ?? null,
      [
        { valore: 'Tutte', id: null },
        ...classiVisibili().map((c) => ({ valore: c.nome, id: c.id })),
      ],
    ))
  }
  if (stato.vista === 'docenteClasse') {
    if (stato.schedaDocente === 'todo') {
      accesi.push(voce(
        'Consegne mostrate',
        FILTRI_TODO_CLASSE.find((f) => f.valore === stato.filtroTodoClasse)?.testo ?? '',
        null,
        FILTRI_TODO_CLASSE.map((f) => ({ valore: f.testo, id: null })),
      ))
    }
    if (stato.schedaDocente === 'assenze') {
      const blocco = bloccoDelleAssenze()
      if (blocco) {
        accesi.push(voce(
          'Periodo delle assenze',
          `${blocco.etichetta} (${blocco.dal} → ${blocco.al})`,
          blocco.id,
          blocchiDelleAssenze().map((b) => ({ valore: b.etichetta, id: b.id })),
        ))
      }
    }
    // L'interruttore dello sfoglio: sta nell'archivio documentale e nelle
    // assenze — `sfoglioSmistamento` — e non nella pagina delle classi, dove
    // questo file lo raccontava prima. Le classi archiviate nell'elenco ci
    // sono sempre; erano le pagine già archiviate di un PDF.
    if (stato.mostraArchiviate) {
      accesi.push(voce('Pagine già archiviate nello sfoglio', 'mostrate', null))
    }
  }
  if (stato.vista === 'documenti' && stato.documentiScelti.length > 0) {
    // Quanti e per che cosa: «3» da solo non dice che sono spuntati per farne
    // un fascicolo, che è l'unica cosa che si fa a più fogli insieme.
    accesi.push(voce(
      'Documenti spuntati per il fascicolo',
      `${stato.documentiScelti.length}`,
      null,
    ))
  }
  return accesi
}

/**
 * Il periodo di assenze aperto nel pannello del docente di classe.
 *
 * Con lo stesso ripiego della pagina — quello scelto se tocca il semestre, se
 * no il primo — perché è la pagina a decidere quale si sta guardando: leggere
 * il solo `bloccoAssenzeId` direbbe «nessuno» proprio nel caso normale, che è
 * quello in cui non se n'è ancora scelto uno a mano.
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
 * Gli elementi che la pagina sta mostrando adesso, già filtrati come si vedono.
 *
 * Solo dove la pagina ha un elenco e dove quell'elenco si sa ricomporre dalle
 * funzioni che lo compongono per la vista: `null` altrove, e non una mezza
 * verità. Un elenco vicino a quel che si vede è più pericoloso di nessun
 * elenco — si risponde su quello con la stessa sicurezza, e nessuno va a
 * controllare quali righe mancassero.
 */
function visibili (): ElencoVisibile | null {
  switch (stato.vista) {
    case 'calendario': {
      // Le ore della finestra che il calendario sta mostrando, non quelle di
      // tutto l'anno: in «settimana» a schermo ce ne sono dodici, e un elenco
      // di trecento id detto «già filtrato come si vede» è esattamente la
      // mezza verità che questo file non vuole dare. La finestra la decide il
      // modo, come nella vista.
      const { dal, al } = finestraDelCalendario()
      return elenco(
        'ore in calendario',
        lezioniInAgenda()
          .filter((l) => (!dal || l.data >= dal) && (!al || l.data <= al))
          .sort((a, b) => a.data.localeCompare(b.data))
          .map((l) => l.id),
      )
    }
    // Tutti i corsi dell'anno, come li elenca la pagina: `corsiNelSemestre()`
    // è quel che riempie la tendina della barra, e non è la stessa cosa.
    case 'corsi':
      return elenco('corsi', corsiDellAnnoAperto().map((c) => c.id))
    // Con le archiviate, che la pagina mostra spente ma mostra: `classiVisibili()`
    // le toglie, e diceva «quattro classi» a chi ne ha cinque sotto gli occhi.
    case 'classi':
      return elenco('classi', classiDellAnno().map((c) => c.id))
    // L'elenco delle persone attraversa le classi, e lo restringono due cose
    // che nello stato non ci sono: la casella di ricerca di quella pagina e le
    // classi aperte a fantasmino. Le chiede alla vista, che è l'unica a saperle.
    case 'persone':
      return elenco(`${PIF.plurale} in elenco`, personeInElenco())
    // Le pagine puntate su una classe: l'elenco che si ha davanti è quello
    // delle persone, ed è su quello che si chiede «chi ha più assenze».
    case 'lezione':
    case 'valutazioni':
    case 'docenteClasse':
    case 'allievo': {
      // La stessa classe che la barra nomina: nel pannello del docente di
      // classe è quella del fascicolo, e l'elenco a schermo diceva le persone
      // di un'altra mentre la riga «Classe» ne prometteva una.
      const classe = classeDellaBarra()
      if (!classe) return null
      return elenco(
        `${PIF.plurale} della ${classe.nome}`,
        classe.allievi.map((a) => a.id),
      )
    }
    default:
      return null
  }
}

/**
 * Il pezzo di anno che il calendario ha sotto gli occhi.
 *
 * Quattro modi, quattro finestre: la settimana di `data`, la griglia del mese
 * — quella intera, comprese le code degli altri mesi che si vedono — l'anno, e
 * l'agenda, che da `data` scorre in avanti fino alla fine dell'anno.
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
 * Quel che c'è scritto nella casella di ricerca della pagina aperta.
 *
 * Tre caselle in tre posti diversi, e nessuna delle tre vale dappertutto:
 * `stato.ricerca` è quella dei piani — è l'unica vista che la legge — mentre
 * l'elenco delle persone e la pagina dei modelli del linguaggio tengono la
 * propria in una variabile del loro modulo, per non rifare a ogni lettera
 * battuta quel che sta lì accanto. Detta senza guardare la pagina, la ricerca
 * dei piani seguiva chi la lasciava lì e andava altrove: il modello leggeva
 * «Ricerca battuta: geometria» in una pagina dove non si stava cercando
 * niente.
 */
function ricercaDellaPagina (): string {
  if (stato.vista === 'persone') return ricercaDellePersone()
  if (stato.vista === 'modelliLinguistici') return ricercaDeiModelli()
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
      // Il corso **solo dove la barra ne mostra la tendina**, che è la stessa
      // guardia con cui `scelte()` scrive la riga «Corso» qui sopra. Le due
      // metà non erano d'accordo, e il guasto si vedeva soltanto leggendo il
      // prompt: `corsoDelContesto()` non torna mai `null` se nell'anno c'è un
      // corso — ripiega sul primo del semestre — e così nelle pagine Persone,
      // Calendario, Pendenze e Classi partiva un `corsoId` che nessuno aveva
      // scelto, senza nessuna riga «Corso» a schermo e senza nessun
      // interruttore nel menu per spegnerlo. A «elenco degli allievi con
      // assenze» il modello filtrava per quel corso e rispondeva «non sono
      // state trovate assenze»: una risposta sbagliata che si legge come una
      // giusta, che è il modo peggiore di sbagliare che ci sia.
      corsoId: siLavoraSuUnCorso() ? corso?.id ?? null : null,
      classeId: classe?.id ?? null,
      // L'ora aperta e non «l'ora solo se sono nella vista Lezione», come per
      // la mira della proiezione: si apre un'ora, si passa al piano per
      // correggere una tappa, e in tutto questo l'ora di cui si parla è ancora
      // quella. Vale però dentro le pagine del corso e non oltre: un'ora è
      // un'ora **di un corso**, e mandarne l'id dove il corso non si manda
      // sarebbe la metà di un contesto — più il difetto di prima, perché nel
      // calendario o nelle pendenze quell'ora è quella che si era aperta
      // un'ora fa e non quella di cui si sta parlando.
      lezioneId: siLavoraSuUnCorso() ? lezione?.id ?? null : null,
      // Gli altri tre con la stessa regola: solo nella pagina che li mostra, e
      // solo se esistono ancora. Partivano sempre, così come li ricordava lo
      // stato — la persona aperta ieri, il piano di un documento chiuso — e
      // il modello li prendeva per quel che si stava guardando.
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
 * Come la si è già detta, per non ridirla uguale.
 *
 * Lo stato cambia a ogni tasto battuto in un campo, e il contesto no: senza
 * questo confronto partirebbe una scrittura in coda — con la sua riga di
 * giornale — per ogni lettera di una nota. Si confronta il testo e non i campi
 * uno per uno perché la forma è annidata, e un confronto scritto a mano
 * resterebbe indietro al primo campo nuovo, dicendo «uguale» a due vedute
 * diverse.
 */
let detta = ''

/**
 * Che cosa mandare all'assistente, o `null` se non è cambiato niente.
 *
 * Due `null` e non uno, ed è la ragione per cui questa funzione torna una
 * busta invece del contesto: `null` **fuori** vuol dire «niente da mandare, è
 * uguale a prima», `contesto: null` vuol dire «chi chiede non lo vuole dire»,
 * cioè l'interruttore spento. Il secondo va mandato, e una volta sola: è quel
 * che fa buttare all'host la veduta che teneva. Senza, spegnere l'interruttore
 * avrebbe lasciato in mano al modello la pagina di un minuto prima — il modo
 * più sicuro di rispondere sulla classe sbagliata proprio dopo aver dichiarato
 * di non voler dire quale.
 */
export function vedutaCambiata (): { contesto: ContestoAssistente | null } | null {
  // La veduta si compone sempre intera e si riduce dopo: le parti spente sono
  // una scelta di chi chiede, non un modo diverso di guardare la pagina, e
  // comporre otto vedute diverse a seconda degli interruttori vorrebbe dire
  // otto strade in cui un campo può restare indietro. Vedi `assistant/parts.ts`.
  const adesso = secondoLeParti(veduta(), stato.contestoAssistente)
  const scritta = adesso === null ? '' : JSON.stringify(adesso)
  if (scritta === detta) return null
  detta = scritta
  return { contesto: adesso }
}
