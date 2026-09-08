// Lo stato dell'interfaccia: che cosa si sta guardando.
//
// Due strati distinti, e conviene tenerli distinti: `registro` è la copia dei
// dati che arriva dall'host e non si modifica mai da qui — si manda un'azione e
// si aspetta la copia nuova; tutto il resto (vista aperta, giorno mostrato,
// selezioni, filtri) vive solo qui e non finisce su disco.
//
// Quel che vale la pena ritrovare riaprendo il pannello viene però ricordato da
// VS Code: la vista, il giorno, la classe scelta.

import type {
  Corso,
  Fascicolo,
  Iso,
  Lezione,
  Ora,
  MomentoValutazione,
  PianoLezione,
  Registro,
  Semestre,
} from '../dominio/modelli.js'
import {
  classeDelCorso,
  classeDelMomento,
  classeDellaLezione,
  corsiDellAnno,
  corsiDellaClasse,
  corsoDellaLezione,
  corsoPerId as corsoDelRegistro,
  fascicoloDellaClasse,
  registroDelCorso,
  lezioniDellAnno,
  lezioniDellaClasse,
  materiaDelCorso,
  pianiDelCorso,
  semestreDelMomento,
  valutazioniDellAnno,
  valutazioniDellaClasse,
} from '../dominio/corsi.js'
import { nomePiano } from '../dominio/calcoli.js'
import { adesso, oggi, semestreDi } from '../dominio/date.js'
import { registroVuoto } from '../dominio/fabbriche.js'
import {
  PROIEZIONE_PREDEFINITA,
  type ImpostazioniProiezione,
  type MiraProiezione,
} from '../dominio/proiezione.js'
import type { Vista } from '../protocollo.js'
import { leggiStatoPersistito, scriviStatoPersistito } from './ponte.js'

/** L'elenco delle sezioni sta nel protocollo: lo legge anche l'host. */
export type { Vista } from '../protocollo.js'
export type ModoCalendario = 'settimana' | 'mese' | 'anno' | 'agenda'

/** Un blocco in lettura o in attesa di esserlo. */
export interface VoceLavoro {
  smistamentoId: string
  pagina: number
  etichetta: string
}

export interface StatoLavoro {
  corrente: VoceLavoro | null
  /** Quante pagine sono già state lette in questa infornata, e quante erano. */
  fatte: number
  totale: number
  coda: VoceLavoro[]
}

/**
 * Le tre schede di una lezione.
 *
 * Aprendo un'ora si fa quasi sempre una cosa sola, e sono tre mestieri
 * diversi: l'amministrazione — chi c'è, che cosa si è ritirato — si fa mentre
 * la classe entra; la lezione — piano, svolgimento, voti — durante e dopo; le
 * annotazioni quando c'è qualcosa da segnare su qualcuno. Tenerli tutti aperti
 * insieme voleva dire scorrere per arrivare all'appello.
 */
export type SchedaLezione = 'amministrazione' | 'lezione' | 'annotazioni'

/**
 * Le quattro schede del docente di classe.
 *
 * Sono quattro mestieri con quattro ritmi: il todo si guarda ogni mattina, i
 * documenti si riscuotono per settimane, le assenze si chiudono a fine
 * periodo, i messaggi si scrivono quando succede qualcosa. Tenerli impilati
 * sulla stessa pagina voleva dire scorrere tre schede per arrivare alla quarta,
 * e la prima cosa che si vede — il todo — è anche l'unica che si guarda tutti
 * i giorni.
 */
export type SchedaDocente = 'todo' | 'documenti' | 'assenze' | 'messaggistica'

export interface StatoUI {
  registro: Registro
  avvisi: string[]
  caricato: boolean
  /**
   * La cartella dei dati come la vede il webview. Dentro la sandbox un percorso
   * di disco non si carica: per mostrare l'immagine di una risorsa ci vuole
   * l'indirizzo che VS Code concede a quella cartella, e lo manda il pannello.
   */
  radiceDati: string | null
  /** Se la lettura automatica delle scansioni è accesa nelle impostazioni. */
  ocrAttivo: boolean
  /**
   * Com'è messa la posta: dove si è, se il registro può spedire da sé, da che
   * indirizzo. Arriva dal pannello — sono impostazioni di VS Code, e il webview
   * non le legge da sé.
   */
  posta: {
    outlook: boolean
    /** Vero quando la casella è collegata: si spedisce dal server. */
    exchange: boolean
    server: string
    /** Come si entra: con l'account Microsoft, o con una password. */
    modo: 'vscode' | 'oauth' | 'password'
    invioDiretto: boolean
    mittente: string
  }
  /**
   * A che punto è la lettura delle scansioni. Non sta nel registro perché non è
   * un dato del registro: è quel che la macchina sta facendo adesso, e sparisce
   * chiudendo la finestra.
   */
  lavoro: StatoLavoro
  vista: Vista
  /** Quale scheda della lezione si sta guardando. */
  schedaLezione: SchedaLezione
  /** Quale scheda del docente di classe si sta guardando. */
  schedaDocente: SchedaDocente
  modoCalendario: ModoCalendario
  /** Giorno di riferimento del calendario: la settimana o il mese che lo contiene. */
  data: Iso
  /**
   * Il momento presente, aggiornato ogni minuto.
   *
   * Sta nello stato e non si legge dall'orologio dentro le viste per un motivo
   * solo: così un ridisegno è quel che fa scattare il passaggio di un'ora da «in
   * corso» a «finita». Leggendo `new Date()` dove serve, la vista resterebbe
   * ferma a com'era quando è stata disegnata, e a mezzogiorno direbbe ancora che
   * la lezione delle otto sta cominciando.
   */
  adessoData: Iso
  adessoOra: Ora
  lezioneId: string | null
  classeId: string | null
  /** L'allievo di cui si guarda la scheda; vive dentro `classeId`. */
  allievoId: string | null
  /**
   * Il corso su cui sono puntate le pagine di corso.
   *
   * Non e' piu' solo la vista Corsi: registro, piani, valutazioni e documenti
   * mostrano un corso alla volta, e la barra laterale li elenca sotto il corso
   * a cui appartengono. Uno solo, perche' passando da una pagina all'altra si
   * sta ancora lavorando sulla stessa materia a quella classe.
   */
  corsoId: string | null
  /**
   * I corsi con le loro pagine aperte nella barra laterale.
   *
   * Piu' d'uno per volta: chi tiene due classi parallele passa dall'una
   * all'altra tutto il giorno, e un accordion che ne chiude una per aprire
   * l'altra costerebbe due clic ogni volta.
   */
  corsiAperti: string[]
  pianoId: string | null
  valutazioneId: string | null
  /** Filtro per classe delle pagine di corso: piani, valutazioni, registro. */
  filtroClasseId: string | null
  /**
   * Il filtro per classe di calendario e todo, tenuto a parte dall'altro.
   *
   * Sono le due pagine che si guardano prima di scegliere una materia — che
   * cosa ho questa settimana, che cosa ho lasciato in giro — e la domanda che
   * ci si fa è di una classe, non di un corso. L'altro filtro invece si sposta
   * da sé: apre una lezione, apre un piano, apre un corso dalla barra, e ogni
   * volta si riscrive con la classe di quel corso. Erano lo stesso campo, e
   * bastava passare da un'ora di un'altra classe per ritrovare il calendario
   * ristretto a quella senza averlo chiesto.
   *
   * Uno solo per tutt'e due le pagine: si passa dal todo al calendario per
   * guardare la stessa classe da due lati, e rimetterlo due volte sarebbe un
   * gesto in più ogni volta.
   */
  filtroClasseAgendaId: string | null
  /**
   * Il semestre di cui si stanno guardando i conti, o `null` per l'anno intero.
   *
   * Non è un filtro come gli altri: è la scansione su cui la scuola ragiona. Una
   * media che mescola i due semestri non è la media di niente — la pagella ne
   * chiede una per semestre — e «dodici assenze» detto senza dire di quale metà
   * è un numero che non si può usare. Il registro parte sul semestre in cui cade
   * oggi, che è quasi sempre quello che si vuole.
   */
  semestreId: string | null
  /** Di chi si guardano le consegne nella pagina Todo. */
  filtroTodo: 'tutte' | 'mie' | 'classi'
  /**
   * Lo stesso filtro nel pannello del docente di classe, e tenuto a parte:
   * là la lista che serve è quasi sempre la propria — quel che tocca a me in
   * questa classe — e non deve cambiare perché nella pagina Todo si stava
   * guardando dell'altro.
   */
  filtroTodoClasse: 'mie' | 'tutte'
  /**
   * Il periodo di assenze aperto nel pannello del docente di classe.
   *
   * Uno per volta: la matrice di un periodo è larga cinque colonne per
   * venticinque nomi, e tenerne aperti due vorrebbe dire una pagina in cui non
   * si trova più niente. Non si ricorda alla riapertura — il periodo su cui si
   * lavora è quello di adesso, e lo si sceglie in un clic.
   */
  bloccoAssenzeId: string | null
  ricerca: string
  /**
   * Com'è messo lo schermo per la classe.
   *
   * Non lo decide il webview: lo racconta l'host, che è l'unico a sapere se
   * quella finestra esiste ancora — la si può chiudere dalla sua scheda, e il
   * pannello se ne accorgerebbe solo provando a spingerci dentro qualcosa.
   */
  proiezione: {
    aperta: boolean
    impostazioni: ImpostazioniProiezione
  }
}

/** La parte di stato che sopravvive a una chiusura del pannello. */
interface StatoPersistito {
  vista: Vista
  schedaLezione: SchedaLezione
  schedaDocente: SchedaDocente
  modoCalendario: ModoCalendario
  data: Iso
  /** L'ora aperta nel registro: riaprendo il pannello si torna dov'eravamo. */
  lezioneId: string | null
  classeId: string | null
  /** Il corso su cui erano puntate le pagine di corso, e quali erano aperti. */
  corsoId: string | null
  corsiAperti: string[]
  filtroClasseId: string | null
  filtroClasseAgendaId: string | null
  semestreId: string | null
  filtroTodo: 'tutte' | 'mie' | 'classi'
}

const persistito = leggiStatoPersistito<StatoPersistito>()

export const stato: StatoUI = {
  registro: registroVuoto(),
  avvisi: [],
  caricato: false,
  radiceDati: null,
  ocrAttivo: false,
  posta: {
    outlook: false,
    exchange: false,
    server: '',
    modo: 'vscode',
    invioDiretto: false,
    mittente: '',
  },
  lavoro: { corrente: null, fatte: 0, totale: 0, coda: [] },
  vista: persistito?.vista ?? 'calendario',
  schedaLezione: persistito?.schedaLezione ?? 'amministrazione',
  schedaDocente: persistito?.schedaDocente ?? 'todo',
  modoCalendario: persistito?.modoCalendario ?? 'settimana',
  data: persistito?.data ?? oggi(),
  adessoData: oggi(),
  adessoOra: adesso(),
  lezioneId: persistito?.lezioneId ?? null,
  classeId: persistito?.classeId ?? null,
  allievoId: null,
  corsoId: persistito?.corsoId ?? null,
  corsiAperti: persistito?.corsiAperti ?? [],
  pianoId: null,
  valutazioneId: null,
  filtroClasseId: persistito?.filtroClasseId ?? null,
  filtroClasseAgendaId: persistito?.filtroClasseAgendaId ?? null,
  // `undefined` vuol dire «mai scelto»: si parte dal semestre di oggi, ma solo
  // quando il registro sarà arrivato — a questo punto è ancora vuoto, e vale
  // come «anno intero» finché `allineaSemestre` non fa la scelta vera. `null`
  // è invece una scelta fatta, e vuol dire l'anno intero per sempre.
  semestreId: persistito?.semestreId === undefined ? null : persistito.semestreId,
  filtroTodo: persistito?.filtroTodo ?? 'tutte',
  filtroTodoClasse: 'mie',
  bloccoAssenzeId: null,
  ricerca: '',
  proiezione: { aperta: false, impostazioni: { ...PROIEZIONE_PREDEFINITA } },
}

type Ascoltatore = () => void
const ascoltatori = new Set<Ascoltatore>()

export function iscriviti (ascoltatore: Ascoltatore): () => void {
  ascoltatori.add(ascoltatore)
  return () => ascoltatori.delete(ascoltatore)
}

/** Applica una modifica allo stato e ridisegna una volta sola. */
/**
 * Se il semestre va ancora portato su quello di oggi.
 *
 * Sta qui, prima di `aggiorna`, perché è lui a spegnerlo: una scelta esplicita
 * vince sull'allineamento, e una variabile letta prima di essere dichiarata
 * sarebbe un errore in faccia al primo aggiornamento.
 */
let semestreDaAllineare = persistito?.semestreId === undefined

export function aggiorna (modifiche: Partial<StatoUI>): void {
  // Un semestre scelto per nome — da chi guarda, o da un elemento aperto
  // dall'albero — spegne l'allineamento automatico: quello mette il semestre
  // di oggi, e sovrascriverebbe la scelta appena fatta la prima volta che i
  // dati arrivano. È il caso di una prova di novembre aperta in gennaio.
  if (modifiche.semestreId !== undefined) semestreDaAllineare = false
  // Scegliere un corso vuol dire anche aprirlo nella barra: le pagine di un
  // corso si elencano sotto il suo titolo, e puntarle su un corso chiuso
  // lascerebbe la barra a raccontare un posto in cui non si è più. Vale anche
  // per chi arriva dall'albero o dalla palette, che il corso lo scelgono senza
  // passare dalla barra. Chi tocca l'elenco per nome — il gesto che apre e
  // chiude — comanda, e non se lo vede riscrivere.
  const apreIlCorso =
    modifiche.corsoId &&
    modifiche.corsiAperti === undefined &&
    !stato.corsiAperti.includes(modifiche.corsoId)
  Object.assign(stato, modifiche)
  if (apreIlCorso && modifiche.corsoId) stato.corsiAperti = [...stato.corsiAperti, modifiche.corsoId]
  scriviStatoPersistito({
    vista: stato.vista,
    schedaLezione: stato.schedaLezione,
    schedaDocente: stato.schedaDocente,
    modoCalendario: stato.modoCalendario,
    data: stato.data,
    lezioneId: stato.lezioneId,
    classeId: stato.classeId,
    corsoId: stato.corsoId,
    corsiAperti: stato.corsiAperti,
    filtroClasseId: stato.filtroClasseId,
    filtroClasseAgendaId: stato.filtroClasseAgendaId,
    semestreId: stato.semestreId,
    filtroTodo: stato.filtroTodo,
  } satisfies StatoPersistito)
  for (const ascoltatore of ascoltatori) ascoltatore()
}

// ------------------------------------------------------------------ selezioni

// Le viste non risalgono le catene a mano: chiedono qui, e qui si passa dal
// corso. Sono involucri sottili sulle funzioni del dominio — l'unica cosa che
// aggiungono è il registro corrente, che nel webview è sempre uno solo.

export function annoCorrente () {
  const { registro } = stato
  return registro.anni.find((a) => a.id === registro.annoCorrenteId) ?? registro.anni[0] ?? null
}

/** Le classi dell'anno in corso, archiviate escluse, in ordine di nome. */
export function classiVisibili () {
  const anno = annoCorrente()
  return stato.registro.classi
    .filter((c) => (!anno || c.annoId === anno.id) && !c.archiviata)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
}

/** Tutte le classi dell'anno, archiviate comprese: serve alla vista Classi. */
export function classiDellAnno () {
  const anno = annoCorrente()
  return stato.registro.classi
    .filter((c) => !anno || c.annoId === anno.id)
    .sort((a, b) => Number(a.archiviata) - Number(b.archiviata) || a.nome.localeCompare(b.nome, 'it'))
}

export function classePerId (id: string | null) {
  return id ? stato.registro.classi.find((c) => c.id === id) ?? null : null
}

export function lezionePerId (id: string | null) {
  return id ? stato.registro.lezioni.find((l) => l.id === id) ?? null : null
}

export function pianoPerId (id: string | null) {
  return id ? stato.registro.piani.find((p) => p.id === id) ?? null : null
}

export function valutazionePerId (id: string | null) {
  return id ? stato.registro.valutazioni.find((v) => v.id === id) ?? null : null
}

export function materiaPerId (id: string | null) {
  return id ? stato.registro.materie.find((m) => m.id === id) ?? null : null
}

/** Il nome della materia, o stringa vuota: serve nei sottotitoli, dove il vuoto sparisce. */
export function nomeMateria (id: string | null): string {
  return materiaPerId(id)?.nome ?? ''
}

// ------------------------------------------------------------------ corsi

export function corsoPerId (id: string | null): Corso | null {
  return corsoDelRegistro(stato.registro, id)
}

/** I corsi dell'anno in corso, con il filtro per classe già applicato. */
export function corsiVisibili (): Corso[] {
  const anno = annoCorrente()
  return corsiDellAnno(stato.registro, anno?.id ?? null)
    .filter((c) => !stato.filtroClasseId || c.classeId === stato.filtroClasseId)
    .sort((a, b) => a.titolo.localeCompare(b.titolo, 'it'))
}

/**
 * I corsi dell'anno in corso come li vedono calendario e todo: con il loro
 * filtro per classe, che è un altro da quello delle pagine di corso.
 */
export function corsiInAgenda (): Corso[] {
  const anno = annoCorrente()
  return corsiDellAnno(stato.registro, anno?.id ?? null)
    .filter((c) => !stato.filtroClasseAgendaId || c.classeId === stato.filtroClasseAgendaId)
    .sort((a, b) => a.titolo.localeCompare(b.titolo, 'it'))
}

/**
 * Tutti i corsi dell'anno aperto, senza il filtro per classe.
 *
 * Serve a chi il corso lo sceglie per nome invece di scorrerne un elenco: il
 * filtro per classe è di un'altra vista — è condiviso, e resta impostato
 * passando di qua — e nascondere metà delle voci di una tendina per via di una
 * scelta fatta altrove, senza mostrarla, vuol dire far cercare un corso che
 * c'è.
 */
export function corsiDellAnnoAperto (): Corso[] {
  const anno = annoCorrente()
  return corsiDellAnno(stato.registro, anno?.id ?? null).sort((a, b) =>
    a.titolo.localeCompare(b.titolo, 'it'),
  )
}

/**
 * I corsi che la barra laterale elenca: quelli dell'anno che vivono nel
 * periodo scelto.
 *
 * Un corso senza nessuna ora nel semestre scelto non ha niente da mostrare —
 * registro vuoto, nessuna prova, nessun documento da stampare — e in una barra
 * che elenca tutti i corsi sarebbe solo una riga da saltare. Quelli senza
 * nemmeno un'ora restano invece in elenco: sono i corsi appena creati, e
 * nasconderli vorrebbe dire non ritrovare quel che si e' appena fatto.
 */
export function corsiNelSemestre (): Corso[] {
  const corsi = corsiDellAnnoAperto()
  const semestre = semestreScelto()
  if (!semestre) return corsi
  return corsi.filter((corso) => {
    const lezioni = lezioniDiCorso(corso.id)
    return (
      lezioni.length === 0 ||
      lezioni.some((l) => l.data >= semestre.inizio && l.data <= semestre.fine)
    )
  })
}

/**
 * Il corso su cui sono puntate le pagine di corso.
 *
 * Le pagine ripiegano sul primo dell'elenco quando quello scelto non c'e' piu'
 * — o e' uscito dal semestre — e la barra laterale deve accendere la stessa
 * riga che la pagina sta mostrando: la regola sta scritta qui una volta sola.
 */
export function corsoAperto (): Corso | null {
  const dellAnno = corsiDellAnnoAperto()
  // Il corso scelto vince anche se le sue ore cadono tutte nell'altro
  // semestre: e' quello che le pagine mostrano, e la barra deve accendere la
  // riga che si sta guardando. Si ripiega sul primo del periodo solo quando
  // quel corso non esiste piu' — o e' di un anno che si e' chiuso.
  return dellAnno.find((c) => c.id === stato.corsoId) ?? corsiNelSemestre()[0] ?? dellAnno[0] ?? null
}

/** I corsi di una classe: le materie che ci si insegnano. */
export function corsiDi (classeId: string): Corso[] {
  return corsiDellaClasse(stato.registro, classeId)
}

/** I nomi delle materie insegnate in una classe, in ordine. */
export function materieDiClasse (classeId: string): string[] {
  return corsiDi(classeId)
    .map((corso) => materiaDelCorso(stato.registro, corso)?.nome ?? '')
    .filter(Boolean)
}

/**
 * Le lezioni di una classe che entrano nei conti: quelle del semestre scelto.
 *
 * Il calendario non passa di qui — lì si naviga per l'anno intero e restringere
 * vorrebbe dire settimane vuote — ma tutto quel che riassume sì: quante ore
 * svolte, quante assenze, che media. Sono i numeri che vanno in pagella, e la
 * pagella è per semestre.
 */
export function lezioniDi (classeId: string) {
  return nelSemestreScelto(lezioniDellaClasse(stato.registro, classeId))
}

/** Le valutazioni di una classe: quelle di tutti i suoi corsi. */
export function valutazioniDi (classeId: string) {
  return nelSemestreScelto(valutazioniDellaClasse(stato.registro, classeId))
}

export function classeDelCorsoId (corsoId: string | null) {
  return classeDelCorso(stato.registro, corsoPerId(corsoId))
}

export function materiaDelCorsoId (corsoId: string | null) {
  return materiaDelCorso(stato.registro, corsoPerId(corsoId))
}

/** Il nome di un corso, o una stringa che dice che manca. */
export function nomeCorso (corsoId: string | null): string {
  return corsoPerId(corsoId)?.titolo ?? 'senza corso'
}

// ------------------------------------------------------------------ dalla lezione

export function classeDiLezione (lezione: Lezione) {
  return classeDellaLezione(stato.registro, lezione)
}

export function corsoDiLezione (lezione: Lezione) {
  return corsoDellaLezione(stato.registro, lezione)
}

export function nomeClasseDiLezione (lezione: Lezione): string {
  return classeDiLezione(lezione)?.nome ?? 'senza classe'
}

/** Come si chiama un piano: il corso e la lezione per cui è fatto. */
export function nomeDiPiano (piano: PianoLezione): string {
  return nomePiano(piano, {
    corso: piano.corsoId ? nomeCorso(piano.corsoId) : null,
    lezioni: stato.registro.lezioni,
  })
}

/**
 * Di che cosa parla una lezione, in due parole.
 *
 * Non è il nome del piano — quello è la lezione stessa, e nel calendario
 * ripetere «Matematica 3A · 15.09» dentro il blocco del 15.09 di Matematica 3A
 * è spazio buttato. Quel che serve a colpo d'occhio è l'argomento: lo dice il
 * primo obiettivo del piano, e se obiettivi non ce ne sono la prima tappa
 * della scaletta. Senza piano non c'è niente da dire, e la riga resta pulita.
 */
export function titoloDiLezione (lezione: Lezione): string {
  const piano = pianoPerId(lezione.pianoId)
  if (!piano) return ''
  return piano.obiettivi[0] ?? piano.attivita.find((a) => a.titolo.trim())?.titolo ?? ''
}

export function coloreDiLezione (lezione: Lezione): string {
  return classeDiLezione(lezione)?.colore ?? '#888888'
}

/**
 * Le lezioni dell'anno in corso, con il filtro delle pagine di corso applicato:
 * quelle della classe su cui si sta lavorando.
 */
export function lezioniVisibili (): Lezione[] {
  const anno = annoCorrente()
  const lezioni = lezioniDellAnno(stato.registro, anno?.id ?? null)
  if (!stato.filtroClasseId) return lezioni
  const corsi = new Set(corsiDi(stato.filtroClasseId).map((c) => c.id))
  return lezioni.filter((l) => corsi.has(l.corsoId))
}

/** Le lezioni dell'anno in corso, con il filtro del calendario già applicato. */
export function lezioniInAgenda (): Lezione[] {
  const anno = annoCorrente()
  const lezioni = lezioniDellAnno(stato.registro, anno?.id ?? null)
  if (!stato.filtroClasseAgendaId) return lezioni
  const corsi = new Set(corsiDi(stato.filtroClasseAgendaId).map((c) => c.id))
  return lezioni.filter((l) => corsi.has(l.corsoId))
}

// ------------------------------------------------------------------ il registro del corso

/** Le lezioni di un corso, dalla prima all'ultima: le pagine del suo registro. */
export function lezioniDiCorso (corsoId: string | null): Lezione[] {
  return registroDelCorso(stato.registro, corsoId)
}

/**
 * Su quale ora si apre il Registro quando lo si chiama dal menu.
 *
 * Nell'ordine: quella che si stava guardando, se c'è ancora; altrimenti
 * l'ultima già passata — è quella di cui si scrive il consuntivo, ed è quasi
 * sempre il motivo per cui si apre il registro; se l'anno deve ancora
 * cominciare, la prima che verrà.
 */
export function lezioneDiRiferimento (): string | null {
  const aperta = lezionePerId(stato.lezioneId)
  if (aperta) return aperta.id

  const lezioni = lezioniVisibili().sort(
    (a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id),
  )
  if (lezioni.length === 0) return null
  const passate = lezioni.filter((l) => l.data <= stato.adessoData)
  return (passate[passate.length - 1] ?? lezioni[0]).id
}

/**
 * Su quale ora si apre il Registro di un corso preciso.
 *
 * La stessa regola di `lezioneDiRiferimento` — l'ultima gia' passata, o la
 * prima se il corso deve ancora cominciare — ristretta alle ore del semestre
 * scelto: chiamando il registro di un corso da sotto il suo titolo, aprirsi su
 * un'ora dell'altro semestre vorrebbe dire una pagina che i conti accanto non
 * contano. Se in quel periodo ore non ce ne sono si guarda tutto il corso,
 * che e' meglio di una pagina vuota.
 */
export function lezioneDiRiferimentoDiCorso (corsoId: string): string | null {
  const tutte = lezioniDiCorso(corsoId)
  const nelPeriodo = nelSemestreScelto(tutte)
  const lezioni = nelPeriodo.length > 0 ? nelPeriodo : tutte
  if (lezioni.length === 0) return null
  const passate = lezioni.filter((l) => l.data <= stato.adessoData)
  return (passate[passate.length - 1] ?? lezioni[0]).id
}

// ------------------------------------------------------------------ dal momento

export function classeDiMomento (momento: MomentoValutazione) {
  return classeDelMomento(stato.registro, momento)
}

export function semestreDiMomento (momento: MomentoValutazione) {
  return semestreDelMomento(stato.registro, momento)
}

/** Le valutazioni dell'anno in corso, con il filtro per classe già applicato. */
export function valutazioniVisibili (): MomentoValutazione[] {
  const anno = annoCorrente()
  const momenti = valutazioniDellAnno(stato.registro, anno?.id ?? null)
  if (!stato.filtroClasseId) return momenti
  const corsi = new Set(corsiDi(stato.filtroClasseId).map((c) => c.id))
  return momenti.filter((v) => corsi.has(v.corsoId))
}

// ------------------------------------------------------------------ piani e fascicoli

/** I piani buoni per un corso: quelli della sua materia, di qualunque anno. */
export function pianiPerCorso (corsoId: string | null) {
  const corso = corsoPerId(corsoId)
  return corso ? pianiDelCorso(stato.registro, corso.id) : []
}

/**
 * L'indirizzo con cui il webview può caricare un file della cartella dei dati.
 * Ogni pezzo del percorso va codificato: i nomi dei file scelti da disco hanno
 * spazi, accenti e parentesi, e passati com'è non arriverebbero.
 */
export function uriDato (relativo: string | undefined): string | null {
  if (!relativo || !stato.radiceDati) return null
  const pezzi = relativo.split('/').filter(Boolean).map(encodeURIComponent)
  return pezzi.length > 0 ? `${stato.radiceDati}/${pezzi.join('/')}` : null
}

/**
 * Il fascicolo di una classe, o uno vuoto se non c'è ancora. Le viste non
 * hanno nulla da decidere sulla differenza: un fascicolo che non esiste e uno
 * senza niente dentro si disegnano allo stesso modo, e nasce da solo alla prima
 * cosa che ci si mette.
 */
export function fascicoloDi (classeId: string): Fascicolo {
  return (
    fascicoloDellaClasse(stato.registro, classeId) ?? {
      id: '',
      classeId,
      recapiti: [],
      documenti: [],
      comunicazioni: [],
      assenze: [],
      creatoIl: '',
      aggiornatoIl: '',
    }
  )
}

export function nomeClasse (classeId: string): string {
  return stato.registro.classi.find((c) => c.id === classeId)?.nome ?? 'senza classe'
}

/**
 * Fa battere l'orologio dello stato: ogni minuto, e subito quando il pannello
 * torna in primo piano dopo essere stato nascosto.
 *
 * Un minuto è la grana giusta: le lezioni durano decine di minuti e nessuna
 * decisione cambia per un secondo. Si ridisegna solo se il minuto è davvero
 * cambiato, o si rifarebbe la vista sessanta volte per niente.
 */
/**
 * Vero se il fuoco è dentro un campo di testo libero: mentre si scrive non è
 * il momento di ridisegnare. `ricordaFuoco`/`ripristinaFuoco` rimettono cursore
 * e valore al loro posto, ma per la frazione di secondo fra i due il campo
 * sparisce e ricompare — abbastanza per perdere il tasto premuto in quel
 * momento, se capita in un punto scomodo.
 */
function scrivendoInUnCampo (): boolean {
  const attivo = document.activeElement
  if (attivo instanceof HTMLTextAreaElement) return true
  return (
    attivo instanceof HTMLInputElement &&
    ['text', 'number', 'email', 'tel', 'search', 'url'].includes(attivo.type)
  )
}

export function avviaOrologio (): () => void {
  const batti = () => {
    const data = oggi()
    const ora = adesso()
    if (data === stato.adessoData && ora === stato.adessoOra) return
    // Si riprova al prossimo battito: il minuto cambiato non scappa, e non
    // vale la pena rifare la vista sotto le dita di chi sta scrivendo.
    if (scrivendoInUnCampo()) return
    aggiorna({ adessoData: data, adessoOra: ora })
  }

  const timer = setInterval(batti, 15_000)
  // Tornando su una finestra lasciata aperta dalla mattina, il primo sguardo
  // deve trovare l'ora giusta senza aspettare il prossimo battito.
  document.addEventListener('visibilitychange', batti)
  window.addEventListener('focus', batti)

  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', batti)
    window.removeEventListener('focus', batti)
  }
}

/** Il semestre di cui si stanno guardando i conti, o `null` per l'anno intero. */
export function semestreScelto (): Semestre | null {
  const anno = annoCorrente()
  if (!anno || !stato.semestreId) return null
  return anno.semestri.find((s) => s.id === stato.semestreId) ?? null
}

/** Come si chiama il periodo scelto, per dirlo nei sottotitoli. */
export function nomeSemestreScelto (): string {
  return semestreScelto()?.etichetta ?? 'anno intero'
}

/** Tiene solo quel che cade nel semestre scelto. */
export function nelSemestreScelto<T extends { data: Iso }> (voci: T[]): T[] {
  const semestre = semestreScelto()
  if (!semestre) return voci
  return voci.filter((v) => v.data >= semestre.inizio && v.data <= semestre.fine)
}

/**
 * Come sopra, per quel che porta la data dentro un istante — `creataIl` — e non
 * in un campo `data` suo.
 *
 * La parte davanti a `T` di un istante ISO è la sua data, e confrontarla con
 * gli estremi del semestre è la stessa cosa che fa `nelSemestreScelto`.
 */
export function nelSemestreSceltoPer<T> (voci: T[], quando: (voce: T) => string): T[] {
  const semestre = semestreScelto()
  if (!semestre) return voci
  return voci.filter((voce) => {
    const giorno = quando(voce).slice(0, 10)
    return giorno >= semestre.inizio && giorno <= semestre.fine
  })
}

/**
 * I periodi che toccano il semestre scelto.
 *
 * Un blocco di assenze è esso stesso un periodo — «1° semestre»,
 * «settembre–dicembre» — e si tiene se si sovrappone, non se ci sta dentro: un
 * periodo a cavallo di gennaio riguarda tutti e due i semestri, e sparire da
 * tutti e due sarebbe il modo di perderlo.
 */
export function toccaIlSemestreScelto<T extends { dal: Iso, al: Iso }> (voci: T[]): T[] {
  const semestre = semestreScelto()
  if (!semestre) return voci
  return voci.filter((v) => v.dal <= semestre.fine && v.al >= semestre.inizio)
}

/**
 * Alla prima apertura porta il registro sul semestre in cui cade oggi.
 *
 * Si fa qui e non nell'inizializzazione perché all'avvio il registro non è
 * ancora arrivato: la scelta buona si può fare solo quando i semestri ci sono.
 * Vale una volta sola — dopo, quel che il docente ha scelto comanda.
 */
export function allineaSemestre (): void {
  if (!semestreDaAllineare) return
  const anno = annoCorrente()
  if (!anno || anno.semestri.length === 0) return
  semestreDaAllineare = false
  const suo = semestreDi(anno, stato.adessoData)
  // Passa da `aggiorna` e non dallo stato diretto: così la scelta si ricorda, e
  // la vista che sta per disegnarsi la trova già fatta.
  if (suo) aggiorna({ semestreId: suo.id })
}

/** Il semestre in cui cade una data, nell'anno in corso. */
export function semestrePerData (data: Iso): Semestre | null {
  const anno = annoCorrente()
  return anno ? semestreDi(anno, data) : null
}

// ------------------------------------------------------------------ proiezione

/**
 * Dove sta guardando il registro, detto allo schermo per la classe.
 *
 * Sono riferimenti e non dati: la proiezione rilegge tutto dall'archivio, così
 * una correzione fatta mentre lo schermo è acceso arriva anche là. La lezione è
 * quella aperta nel Registro; sulle altre viste si ripiega sul corso o sulla
 * classe, che bastano a mostrare consegne e calendario.
 */
export function miraProiezione (): MiraProiezione {
  // L'ora di riferimento e non «l'ora solo se sono nella vista Registro»: si
  // apre la lezione, poi si passa al piano per cambiare una tappa e al
  // calendario per guardare la settimana, e in tutto questo la classe sta
  // ancora facendo quell'ora. Lo schermo grande non deve svuotarsi perché il
  // docente ha cambiato scheda.
  const lezione = lezionePerId(stato.lezioneId)
  return {
    lezioneId: lezione?.id ?? null,
    corsoId: stato.corsoId ?? lezione?.corsoId ?? null,
    classeId: stato.classeId ?? stato.filtroClasseId,
    semestreId: stato.semestreId,
    data: stato.data,
  }
}
