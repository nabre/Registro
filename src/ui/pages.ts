// Destinazioni per sezione; la destinazione scelta distingue viste condivise.

import { CARTE, Molti, PIF } from '../domain/lexicon.js'
import type { NomeIcona } from './components/icons.js'
import { notifica } from './components/notifications.js'
import { pagineDaSmistareInTutto } from './views/toSort.js'
import {
  classeDelFascicolo,
  corsoDelContesto,
  nomeDelCorso,
  senzaCorso,
} from './context.js'
import {
  aggiorna,
  classiDiCuiSonoDocente,
  lezioneDiRiferimentoDiCorso,
  nomeClasse,
  stato,
  type SchedaDocente,
  type Vista,
} from './state.js'

/**
 * Il gruppo in cui la destinazione compare nel selettore.
 *
 * Tre mestieri e il programma, in quest'ordine:
 *
 *   `gestione` — quel che riguarda tutte le classi insieme, giorno per giorno:
 *   il calendario e le pendenze. Che cosa ho oggi, che cosa ho lasciato in giro.
 *
 *   `registro` — le pagine del corso scelto in cima. Sono il registro vero e
 *   proprio: l'ora, i voti, i piani, i fogli che ne escono.
 *
 *   `classe` — il mestiere del docente di classe, che è un altro lavoro sulle
 *   stesse persone: assenze, archivio documentale, messaggi.
 *
 *   `sistema` — «Il programma»: come è fatto l'anno e come è fatto il registro.
 *   Corsi e classi si dichiarano a settembre e si ritoccano quando cambia
 *   qualcosa, con lo stesso passo con cui si aprono le impostazioni; in
 *   Gestione facevano credere di essere lavoro quotidiano.
 *
 * Prima ce n'erano quattro senza questa divisione: un gruppo «Il registro» che
 * teneva insieme il calendario e gli elenchi, e un gruppo «Corso» con le
 * pagine che invece *sono* il registro. Il nome stava su quello sbagliato.
 */
type GruppoPagina = 'gestione' | 'registro' | 'classe' | 'sistema'

export interface Pagina {
  /** Un nome stabile: lo cerca la palette, lo invoca chi va per nome. */
  id: string
  titolo: string
  simbolo: NomeIcona
  gruppo: GruppoPagina
  /** La riga che si legge fermandosi sopra: che cosa c'è, in quella pagina. */
  aiuto?: string
  /** Perché adesso non ci si può andare, o `null` se si può. */
  impedimento?: () => string | null
  /**
   * Quante cose aspettano dentro quella pagina, se ha senso contarle.
   *
   * La barra laterale lo mostra accanto al titolo. Serve alle pagine che
   * esistono per farsi accorgere di qualcosa che altrimenti non si guarda: «Da
   * smistare» nasce proprio perché dei file restavano invisibili, e una voce di
   * menu muta li lascerebbe invisibili come prima — solo un clic più vicino.
   *
   * Zero non si mostra: una pastiglia con dentro uno zero è rumore che
   * costringe a leggerla per sapere che non c'è niente da fare.
   */
  conto?: () => number
  /** Se è qui che si sta adesso. */
  attiva: () => boolean
  /** Portarcisi, contesto compreso. */
  apri: () => void
}

/**
 * Apre una pagina puntata sul corso del contesto.
 *
 * Si sistemano insieme corso e classe: le pagine filtrano per tutti e due, e
 * cambiarne uno solo porterebbe su una pagina che il corso chiesto non lo
 * contiene.
 */
function vaiAlCorso (vista: Vista): void {
  const corso = corsoDelContesto()
  if (!corso) return
  if (vista === 'lezione') {
    const lezioneId = lezioneDiRiferimentoDiCorso(corso.id)
    if (!lezioneId) {
      notifica('Questo corso non ha ancora nessuna lezione.', 'avviso')
      return
    }
    aggiorna({ vista, corsoId: corso.id, filtroClasseId: corso.classeId, lezioneId })
    return
  }
  aggiorna({ vista, corsoId: corso.id, filtroClasseId: corso.classeId })
}

/**
 * Apre il pannello del docente di classe su una delle sue schede.
 *
 * Le quattro schede sono destinazioni e non un dettaglio del pannello: chi
 * cerca le assenze cerca «Assenze», non «il pannello, e poi la terza linguetta».
 * Il selettore dentro la pagina resta — si passa da una all'altra senza
 * riaprire il menu — ma non è più l'unica strada per arrivarci.
 */
function vaiAlPannello (scheda: SchedaDocente): void {
  // La classe del fascicolo e non quella del contesto: chi arriva da un corso
  // di una classe di cui non è docente chiedeva una pagina che non si poteva
  // disegnare, e la voce restava spenta. Adesso la sezione compare solo dove il
  // mestiere c'è, e questa funzione una classe buona ce l'ha sempre — quella
  // scelta se ha il fascicolo, la prima che ce l'ha altrimenti.
  const classe = classeDelFascicolo()
  if (!classe) return
  // Anche il filtro per classe, come in `vaiAlCorso`: il pannello legge solo
  // `classeId`, ma uscendone si va in una pagina del corso, e trovarci il
  // filtro della classe di prima è quel che fa sembrare che il registro abbia
  // cambiato corso da solo.
  aggiorna({
    vista: 'docenteClasse',
    classeId: classe.id,
    filtroClasseId: classe.id,
    schedaDocente: scheda,
  })
}

/**
 * Tutte le destinazioni, nell'ordine in cui compaiono nel selettore.
 *
 * L'ordine dentro ogni gruppo è quello di una giornata: si guarda il
 * calendario, si vede che cosa resta da fare, si entra nell'ora, si mettono i
 * voti, e in fondo stanno le pagine che si aprono una volta ogni tanto.
 */
export const PAGINE: readonly Pagina[] = [
  // La gestione: le due pagine con cui si comincia la giornata. Guardano tutte
  // le classi insieme e non dipendono dal corso scelto in cima — che cosa ho
  // oggi, che cosa ho lasciato in giro — e per questo stanno per prime.
  {
    id: 'pagina.calendario',
    titolo: 'Calendario',
    simbolo: 'calendario',
    gruppo: 'gestione',
    aiuto: 'Le ore di tutte le classi insieme, settimana per settimana',
    attiva: () => stato.vista === 'calendario',
    apri: () => aggiorna({ vista: 'calendario' }),
  },
  {
    id: 'pagina.pendenze',
    titolo: Molti(CARTE.pendenza),
    simbolo: 'spunta',
    gruppo: 'gestione',
    aiuto: 'Quel che è stato dato e non è ancora tornato indietro',
    attiva: () => stato.vista === 'todo',
    apri: () => aggiorna({ vista: 'todo' }),
  },
  {
    // Sta in Gestione e non fra le pagine della classe perché guarda tutte le
    // classi insieme — e perché una parte di quel che mostra non ha ancora una
    // classe a cui appartenere, e in una pagina intestata a una classe sola non
    // avrebbe proprio dove stare.
    id: 'pagina.daSmistare',
    titolo: 'Da smistare',
    simbolo: 'documento',
    gruppo: 'gestione',
    aiuto: 'I PDF caricati che aspettano di essere divisi, di tutte le tue classi',
    conto: pagineDaSmistareInTutto,
    attiva: () => stato.vista === 'daSmistare',
    apri: () => aggiorna({ vista: 'daSmistare' }),
  },
  {
    // Le persone stanno in Gestione e non fra le pagine della classe, per lo
    // stesso motivo della mappa: la domanda che le si fa non è «come sta
    // questa classe» ma «chi è questa persona», e al telefono di che classe
    // sia non lo si sa quasi mai. L'elenco attraversa le classi e si
    // restringe scrivendo.
    id: 'pagina.persone',
    titolo: Molti(PIF),
    simbolo: 'utente',
    gruppo: 'gestione',
    aiuto: 'Tutte le persone dell’anno in un elenco solo, con la loro scheda accanto',
    attiva: () => stato.vista === 'persone' || stato.vista === 'allievo',
    apri: () => aggiorna({ vista: 'persone' }),
  },
  {
    // La mappa sta in Gestione e non fra le pagine della classe, e il motivo è
    // la domanda che le si fa: non «come sta questa classe», ma «da dove
    // arriva la gente» — una visita in azienda da mettere in fila con due
    // altre, un ritardo che si spiega da sé, un corso serale che si sceglie di
    // dare a chi abita lontano. Guarda tutte le classi insieme e ha una tendina
    // sua per restringere a una.
    id: 'pagina.mappa',
    titolo: 'Mappa',
    simbolo: 'mappa',
    gruppo: 'gestione',
    aiuto: 'Dove abitano, dove lavorano, e quanto distano dalla sede',
    attiva: () => stato.vista === 'mappa',
    apri: () => aggiorna({ vista: 'mappa' }),
  },
  // Il registro: le quattro facce del corso scelto in cima, sempre alla stessa
  // distanza. Senza un corso restano nell'elenco, spente, e dicono che cosa
  // manca — sparire vorrebbe dire un selettore che cambia altezza mentre lo si
  // guarda.
  {
    id: 'pagina.corso.registro',
    titolo: 'Lezione',
    simbolo: 'agenda',
    gruppo: 'registro',
    aiuto: 'Presenze, argomenti e consegne dell’ora',
    impedimento: senzaCorso,
    attiva: () => stato.vista === 'lezione',
    apri: () => vaiAlCorso('lezione'),
  },
  {
    id: 'pagina.corso.valutazioni',
    titolo: 'Valutazioni',
    simbolo: 'valutazioni',
    gruppo: 'registro',
    aiuto: 'I momenti di valutazione del corso e i loro voti',
    impedimento: senzaCorso,
    attiva: () => stato.vista === 'valutazioni',
    apri: () => vaiAlCorso('valutazioni'),
  },
  {
    id: 'pagina.corso.piani',
    titolo: 'Piani lezione',
    simbolo: 'piano',
    gruppo: 'registro',
    aiuto: 'Come è fatta un’ora prima di farla',
    impedimento: senzaCorso,
    attiva: () => stato.vista === 'piani',
    apri: () => vaiAlCorso('piani'),
  },
  {
    // Una voce sola per i documenti, non più due. Erano «Documenti» e
    // «Documenti del corso» perché la pagina aveva una tendina sua e poteva
    // mostrare un corso diverso da quello in cima; adesso il corso è uno solo
    // per tutto il registro, e le due destinazioni portavano nello stesso
    // posto.
    id: 'pagina.corso.documenti',
    titolo: 'Documenti',
    simbolo: 'documento',
    gruppo: 'registro',
    aiuto: 'Quel che esce dal registro e va in mano ad altri',
    impedimento: senzaCorso,
    attiva: () => stato.vista === 'documenti',
    apri: () => vaiAlCorso('documenti'),
  },

  // Il docente di classe: un mestiere a sé sulle stesse persone. Le quattro
  // schede del pannello sono destinazioni, perché è così che le si cerca —
  // «le assenze», non «il pannello e poi la terza linguetta».
  //
  // Nessuna delle quattro dichiara un impedimento, ed è voluto: la sezione
  // esiste solo dove il mestiere c'è — `sezioneCePer` — e dentro una sezione
  // che c'è, `classeDelFascicolo()` una classe buona la trova sempre. Prima
  // erano spente da `senzaDocenzaDiClasse` anche quando la docenza c'era ma il
  // corso in cima era di un'altra classe: quattro voci grigie che dicevano di
  // cambiare corso per arrivare a un lavoro che col corso non c'entra.
  //
  // L'elenco della classe non è fra queste. C'era, e portava esattamente dove
  // porta «Classi» in Gestione: stessa vista, stessa classe — quella del
  // contesto, che l'elenco seleziona da sé. Due voci in due menu per lo stesso
  // schermo fanno due volte la stessa domanda, e una delle due risposte è
  // sempre quella sbagliata da imparare.
  {
    id: 'pagina.classe.pendenze',
    titolo: `${Molti(CARTE.pendenza)} della classe`,
    simbolo: 'spunta',
    gruppo: 'classe',
    aiuto: 'Quel che questa classe deve ancora portare o rifare',
    attiva: () => stato.vista === 'docenteClasse' && stato.schedaDocente === 'todo',
    apri: () => vaiAlPannello('todo'),
  },
  {
    id: 'pagina.classe.documenti',
    titolo: 'Archivio documentale',
    simbolo: 'documento',
    gruppo: 'classe',
    aiuto: 'Chi ha consegnato e chi no, foglio per foglio',
    attiva: () => stato.vista === 'docenteClasse' && stato.schedaDocente === 'documenti',
    apri: () => vaiAlPannello('documenti'),
  },
  {
    id: 'pagina.classe.assenze',
    titolo: 'Assenze',
    simbolo: 'calendario',
    gruppo: 'classe',
    aiuto: 'Le assenze della classe, da giustificare e da contare',
    attiva: () => stato.vista === 'docenteClasse' && stato.schedaDocente === 'assenze',
    apri: () => vaiAlPannello('assenze'),
  },
  {
    id: 'pagina.classe.messaggistica',
    titolo: 'Messaggistica',
    simbolo: 'posta',
    gruppo: 'classe',
    aiuto: 'Recapiti e comunicazioni alle famiglie',
    attiva: () => stato.vista === 'docenteClasse' && stato.schedaDocente === 'messaggistica',
    apri: () => vaiAlPannello('messaggistica'),
  },

  // Il programma: quel che si apre per mettere a posto il registro, non per
  // usarlo. Corsi e Classi stavano in Gestione, insieme al calendario e alle
  // pendenze, e non erano la stessa cosa: là si guarda che cosa c'è da fare
  // oggi, qui si dichiara com'è fatto l'anno. Ci si entra a settembre e poi
  // quando cambia qualcosa, con lo stesso passo con cui si aprono le
  // impostazioni.
  {
    id: 'pagina.corsi',
    titolo: 'Corsi',
    simbolo: 'libro',
    gruppo: 'sistema',
    aiuto: 'L’elenco dei corsi: dove se ne crea uno o gli si cambia l’orario',
    attiva: () => stato.vista === 'corsi',
    apri: () => aggiorna({ vista: 'corsi' }),
  },
  {
    id: 'pagina.classi',
    titolo: 'Classi',
    simbolo: 'classi',
    gruppo: 'sistema',
    aiuto: 'L’elenco delle classi e dei loro gruppi',
    attiva: () => stato.vista === 'classi',
    apri: () => aggiorna({ vista: 'classi' }),
  },
  {
    id: 'pagina.modelli',
    titolo: 'Modelli',
    simbolo: 'matita',
    gruppo: 'sistema',
    aiuto: 'Com’è fatto ogni foglio che il registro stampa: testata, misure, parole',
    attiva: () => stato.vista === 'modelli',
    apri: () => aggiorna({ vista: 'modelli' }),
  },
  {
    id: 'pagina.modelliLinguistici',
    titolo: 'Modelli linguistici',
    simbolo: 'bot',
    gruppo: 'sistema',
    aiuto: 'I modelli che rispondono sulla tua macchina: scaricarli, sceglierli, toglierli',
    attiva: () => stato.vista === 'modelliLinguistici',
    apri: () => aggiorna({ vista: 'modelliLinguistici' }),
  },
  {
    id: 'pagina.impostazioni',
    titolo: 'Impostazioni',
    simbolo: 'impostazioni',
    gruppo: 'sistema',
    aiuto: 'Materie, scala dei voti, posta, lettura delle scansioni',
    attiva: () => stato.vista === 'impostazioni',
    apri: () => aggiorna({ vista: 'impostazioni' }),
  },
  {
    id: 'pagina.guida',
    titolo: 'Guida',
    simbolo: 'informazione',
    gruppo: 'sistema',
    aiuto: 'Come si usa il registro, in una pagina',
    attiva: () => stato.vista === 'guida',
    apri: () => aggiorna({ vista: 'guida' }),
  },
]

/**
 * Il titolo del gruppo, con dentro il nome di quel di cui si sta parlando.
 *
 * «Registro» e basta direbbe metà della cosa: le quattro pagine sotto sono
 * quelle di *quel* corso, e chi apre il selettore mentre lavora su due classi
 * diverse deve leggere su quale delle due sta per andare.
 */
function titoloDelGruppo (gruppo: GruppoPagina): string {
  switch (gruppo) {
    case 'gestione':
      return 'Gestione'
    case 'registro': {
      const corso = corsoDelContesto()
      return corso ? `Registro — ${nomeDelCorso(corso)}` : 'Registro'
    }
    case 'classe': {
      const classe = classeDelFascicolo()
      return classe ? `Docente di classe — ${nomeClasse(classe.id)}` : 'Docente di classe'
    }
    case 'sistema':
      return 'Il programma'
  }
}

/**
 * Il nome corto del gruppo: quello che sta scritto sulla scheda.
 *
 * Sulla scheda ci va il mestiere e basta. Il nome del corso — che pure serve —
 * sta nel titolo dentro la tendina, dove c'è lo spazio per leggerlo: una
 * linguetta larga mezza barra che dice «Registro — DIC4a · Matematica»
 * spingerebbe fuori le altre due.
 */
export function nomeDelGruppo (gruppo: GruppoPagina): string {
  switch (gruppo) {
    case 'gestione':
      return 'Gestione'
    case 'registro':
      return 'Registro'
    case 'classe':
      return 'Docente di classe'
    case 'sistema':
      return 'Il programma'
  }
}

/**
 * Il segno con cui una cosa del registro si presenta, preso da dove è stato
 * deciso: la voce della barra laterale.
 *
 * Serve a chi deve disegnare quella stessa cosa altrove — il percorso in fondo
 * allo schermo, per esempio — senza ricopiarne il nome dell'icona. Un corso
 * porta il segno della pagina Corsi, un'ora quello della pagina Lezione, e il
 * giorno in cui uno dei due cambia cambiano insieme. Scritto a mano nei due
 * posti, il secondo resta indietro e nessuno se ne accorge: due icone diverse
 * per la stessa cosa non sono un errore che salta all'occhio, sono solo un
 * registro che si somiglia un po' meno.
 */
export function simboloDiPagina (id: string): NomeIcona {
  return PAGINE.find((pagina) => pagina.id === id)?.simbolo ?? 'informazione'
}

/** L'icona della scheda: la stessa della pagina aperta, o quella del mestiere. */
export function simboloDelGruppo (gruppo: GruppoPagina): NomeIcona {
  switch (gruppo) {
    case 'gestione':
      return 'calendario'
    case 'registro':
      return 'agenda'
    case 'classe':
      return 'classi'
    case 'sistema':
      return 'impostazioni'
  }
}

const ORDINE: readonly GruppoPagina[] = ['gestione', 'registro', 'classe', 'sistema']

/**
 * Se la sezione ha ragione di esistere in questo registro.
 *
 * «Docente di classe» è un mestiere che non tutti fanno: senza nemmeno una
 * classe con la spunta, la sua scheda apriva quattro voci spente che dicevano
 * tutte la stessa cosa, e la pagina dietro era uno stato vuoto. Sparisce — e
 * ricompare da sé appena la spunta c'è, perché questa domanda si rifà a ogni
 * ridisegno.
 *
 * Le altre tre ci sono sempre: il calendario, il registro e il programma non
 * dipendono da com'è fatto l'anno. Il registro in particolare resta anche senza
 * corsi, con le sue pagine spente che dicono che ne manca uno — là il vuoto è
 * il primo passo da fare, non un mestiere che non si esercita.
 */
function sezioneCePer (gruppo: GruppoPagina): boolean {
  return gruppo !== 'classe' || classiDiCuiSonoDocente().length > 0
}

/** Un gruppo di destinazioni: una scheda della barra, con dentro le sue pagine. */
interface GruppoDiPagine {
  gruppo: GruppoPagina
  /** Il nome lungo, con dentro il corso o la classe: sta in cima alla tendina. */
  titolo: string
  /** Il nome corto, che sta scritto sulla scheda. */
  nome: string
  simbolo: NomeIcona
  /** Se è qui che si sta adesso: la scheda si accende. */
  attivo: boolean
  pagine: Pagina[]
}

/** Le destinazioni raccolte per gruppo, nell'ordine in cui si mostrano. */
export function gruppiDiPagine (): GruppoDiPagine[] {
  return ORDINE.filter(sezioneCePer).map((gruppo) => {
    const pagine = PAGINE.filter((pagina) => pagina.gruppo === gruppo)
    return {
      gruppo,
      titolo: titoloDelGruppo(gruppo),
      nome: nomeDelGruppo(gruppo),
      simbolo: simboloDelGruppo(gruppo),
      attivo: paginaAttiva()?.gruppo === gruppo,
      pagine,
    }
  }).filter((voce) => voce.pagine.length > 0)
}

/** Preferisce la destinazione scelta, se ancora compatibile con la vista. */
export function paginaAttiva (): Pagina | null {
  return PAGINE.find((pagina) => pagina.id === stato.paginaId && pagina.attiva())
    ?? PAGINE.find((pagina) => pagina.attiva()) ?? null
}

/**
 * Come si chiama il posto in cui si sta, anche quando non è una destinazione.
 *
 * Il nome lo dice la destinazione attiva e non un secondo elenco di stringhe:
 * il nome della pagina dell'ora stava scritto qui *e* nel titolo di
 * `pagina.corso.registro`, e le due copie sono già divergite due volte — la
 * pagina si è chiamata «registro dell'ora», poi «registro della lezione», e
 * adesso «Lezione». La sola vista senza destinazione è
 * la scheda di una persona: ci si entra dall'elenco, non dal selettore.
 */
export function nomeDelPosto (): string {
  if (stato.vista === 'allievo') return 'Scheda della persona'
  return paginaAttiva()?.titolo ?? 'Registro'
}

/**
 * Va in una pagina, o dice perché non si può.
 *
 * Il controllo sta qui e non solo nel selettore: la palette arriva alle stesse
 * destinazioni da un'altra strada, e una voce spenta non ferma chi preme
 * Invio.
 */
export function vaiA (pagina: Pagina): void {
  const perche = pagina.impedimento?.() ?? null
  if (perche) {
    notifica(perche, 'avviso')
    return
  }
  pagina.apri()
  // Andare in una pagina riporta la riga delle azioni sui comandi della
  // pagina: se si stava guardando la scheda «Proiezione», quella resta lì
  // accesa — lo schermo non si è spento — ma la riga torna a rispondere alla
  // domanda «che cosa posso fare qui», che è quella che si è appena fatta
  // cambiando pagina.
  aggiorna({
    schedaComandi: 'pagina',
    ...(pagina.attiva() ? { paginaId: pagina.id } : {}),
  })
}
