// Costruttori delle entità: un posto solo in cui vive la forma "appena creata".
// Il webview e l'extension host creano le stesse cose, e se i valori predefiniti
// stessero in due punti prima o poi divergerebbero.

import { annoAllineato, semestriFra } from './years.js'
import { ETICHETTA_TELEFONO_PREDEFINITA } from './lexicon.js'
import {
  MINUTI_UD,
  udArrotondate,
  daIso,
  etichettaAnno,
  istanteAdesso,
  minutiInUd,
  oggi,
  sommaMinuti,
} from './dates.js'
import {
  nuovoIdAllievo,
  nuovoIdAnno,
  nuovoIdAttivita,
  nuovoIdClasse,
  nuovoIdLezione,
  nuovoIdConsegna,
  nuovoIdOsservazione,
  nuovoIdPiano,
  nuovoIdRicorrenza,
  nuovoIdRisorsa,
  nuovoIdComunicazione,
  nuovoIdCorso,
  nuovoIdBloccoAssenze,
  nuovoIdFascicolo,
  nuovoIdMateria,
  nuovoIdRecapito,
  nuovoIdSemestre,
  nuovoIdSospensione,
  nuovoIdSlot,
  nuovoIdSmistamento,
  nuovoIdTelefono,
  nuovoIdValutazione,
} from './identifiers.js'
import type {
  Allievo,
  BloccoAssenze,
  Consegna,
  ContattoTelefonico,
  EtichettaTelefono,
  AnnoScolastico,
  Attivita,
  Classe,
  Impostazioni,
  Iso,
  Lezione,
  MomentoValutazione,
  Ora,
  Osservazione,
  PianoLezione,
  Presenza,
  Registro,
  Scala,
  Comunicazione,
  Corso,
  Fascicolo,
  Materia,
  Recapito,
  Ricorrenza,
  Risorsa,
  Sospensione,
  Slot,
  Divisione,
  Smistamento,
  StatoPresenza,
  Telefono,
} from './models.js'
import { VERSIONE_DATI } from './models.js'

const adesso = istanteAdesso

/** Scala ticinese: 1–6, sufficienza a 4, quarti di punto. */
export const SCALA_PREDEFINITA: Scala = { min: 1, max: 6, sufficienza: 4, passo: 0.25 }

/** Tavolozza per le classi: tinte distinguibili anche su tema chiaro e scuro. */
export const COLORI_CLASSE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
]

/** Il colore successivo nella tavolozza, evitando quelli già in uso. */
function coloreLibero (usati: string[]): string {
  return COLORI_CLASSE.find((c) => !usati.includes(c)) ?? COLORI_CLASSE[usati.length % COLORI_CLASSE.length]
}

export const IMPOSTAZIONI_PREDEFINITE: Impostazioni = {
  scala: { ...SCALA_PREDEFINITA },
  oraInizioGiornata: '07:30',
  oraFineGiornata: '18:00',
  giorniVisibili: [1, 2, 3, 4, 5],
  // Mezzi punti: è il passo con cui quasi ovunque si scrive la nota di fine
  // semestre, mentre i voti durante l'anno si danno a quarti.
  passoFineSemestre: 0.5,
  sogliaAssenza: 20,
  durataSlotPredefinita: MINUTI_UD,
  durataPausaPredefinita: 15,
  // I documenti seguono i dati senza che nessuno se ne occupi: è il caso in
  // cui la cartella è sempre giusta, e chi la vuole ferma lo dice.
  pdfAutomatici: 'sempre',
  // Le tendine partono da quelle di fabbrica: qui ci finisce solo quel che
  // qualcuno cambia da Impostazioni.
  liste: {},
}

export function registroVuoto (): Registro {
  return {
    versione: VERSIONE_DATI,
    anni: [],
    annoCorrenteId: null,
    materie: [],
    classi: [],
    corsi: [],
    lezioni: [],
    piani: [],
    valutazioni: [],
    fascicoli: [],
    consegne: [],
    smistamenti: [],
    coordinate: [],
    impostazioni: { ...IMPOSTAZIONI_PREDEFINITE, scala: { ...SCALA_PREDEFINITA } },
  }
}

/**
 * Un anno scolastico con i due semestri già tagliati. Il confine si può dire
 * — è l'ultimo giorno del primo semestre — e se non lo si dice cade a fine
 * gennaio, che è la spartizione usuale. Resta comunque modificabile dopo.
 */
export function creaAnno (
  inizio: Iso,
  fine: Iso,
  etichetta?: string,
  confineScelto?: Iso,
): AnnoScolastico {
  // Il confine si sceglie, ma deve cadere dentro l'anno. Se quello indicato non
  // ci sta si ripiega su fine gennaio — il primo semestre chiude lì in quasi
  // tutte le sedi — e solo per un anno che nemmeno quella data attraversa
  // decide `semestriFra`, tagliando a metà del periodo.
  const gennaio = `${daIso(inizio).getUTCFullYear() + 1}-01-31`
  const dentro = (data: Iso) => data > inizio && data < fine
  const confine = confineScelto && dentro(confineScelto) ? confineScelto : gennaio

  return annoAllineato({
    id: nuovoIdAnno(),
    etichetta: etichetta || etichettaAnno(inizio),
    inizio,
    fine,
    semestri: semestriFra(inizio, fine, confine, nuovoIdSemestre),
    sospensioni: [],
  })
}

export function creaAnnoCorrente (): AnnoScolastico {
  const ora = new Date()
  const primo = ora.getMonth() >= 7 ? ora.getFullYear() : ora.getFullYear() - 1
  return creaAnno(`${primo}-09-01`, `${primo + 1}-06-30`)
}

export function creaClasse (annoId: string, nome: string, coloriUsati: string[] = []): Classe {
  return {
    id: nuovoIdClasse(),
    annoId,
    nome,
    sede: '',
    colore: coloreLibero(coloriUsati),
    note: '',
    allievi: [],
    archiviata: false,
    docenteDiClasse: false,
    creataIl: adesso(),
    aggiornataIl: adesso(),
  }
}

/** Il fascicolo di una classe: nasce vuoto, la prima volta che serve. */
export function creaFascicolo (classeId: string): Fascicolo {
  return {
    id: nuovoIdFascicolo(),
    classeId,
    recapiti: [],
    documenti: [],
    comunicazioni: [],
    assenze: [],
    creatoIl: adesso(),
    aggiornatoIl: adesso(),
  }
}

/**
 * Il modello del testo che accompagna i fogli delle assenze.
 *
 * Sta qui e non nella vista perché è la cosa che si scrive una volta e poi non
 * si tocca più per tre trimestri: se il periodo nasce con la lettera già
 * scritta, chi la vuole diversa la cambia, e chi non ha niente da dire non deve
 * inventarsi la formula giusta ogni volta. I segnaposto li riempie
 * `testoAssenze` allievo per allievo.
 */
const CORPO_ASSENZE = [
  'Gentili signore, egregi signori,',
  '',
  // `{rapporti}` si scrive da sé secondo quel che è allegato: «il rapporto
  // delle assenze», «il rapporto dei ritardi», o tutti e due. Una frase fissa
  // che parlava di assenze e ritardi arrivava anche a chi riceveva un foglio
  // solo, e l'azienda rispondeva domandando dov'era l'altro.
  'in allegato trovate {rapporti} di {allievo} ({classe}) per il periodo {periodo}.',
  '',
  // «quanto allegato… rispedircelo» sta in piedi con un foglio e con due: con
  // «i documenti… rispedirceli» la lettera di chi ne ha uno solo era sgrammaticata.
  'Vi chiediamo cortesemente di controfirmare quanto allegato e di rispedircelo per e-mail.',
  '',
  'Ringraziando per la collaborazione, porgiamo cordiali saluti.',
].join('\n')

/**
 * Un periodo di assenze da far firmare. Nasce senza righe: una riga compare
 * quando arriva il primo foglio di quell'allievo, e chi non ha mancato niente
 * non compare mai.
 */
export function creaBloccoAssenze (
  dal: Iso,
  al: Iso,
  fascicolo?: Fascicolo,
  etichetta = '',
): BloccoAssenze {
  return {
    id: nuovoIdBloccoAssenze(),
    // Il nome non si chiede: è quello del semestre in cui il periodo sta, e chi
    // salva lo ricava dalle date. Vedi `etichettaPeriodo`.
    etichetta: etichetta.trim(),
    dal,
    al,
    // `{tipi}` diventa «Assenze», «Ritardi» o «Assenze e ritardi» secondo quel
    // che si allega a quell'allievo: l'oggetto è la prima cosa che l'azienda
    // legge, e deve dire che cosa c'è dentro davvero. `{periodo}` è il nome se
    // c'è e le due date sempre: l'azienda non ha il registro davanti, e «1°
    // semestre» da solo non le dice di che mesi si parla.
    oggetto: '{tipi} — {allievo} — {periodo}',
    corpo: CORPO_ASSENZE,
    aAllievo: false,
    aTutore: false,
    recapitiIds: (fascicolo?.recapiti ?? []).filter((r) => r.predefinito).map((r) => r.id),
    righe: [],
    note: '',
    creatoIl: adesso(),
    aggiornatoIl: adesso(),
  }
}

/**
 * Il testo con cui un documento parte per mail.
 *
 * Sta qui e non nella vista per la stessa ragione della lettera delle assenze:
 * lo si scrive una volta e non lo si tocca più. I segnaposto li riempie
 * `testoConsegna` allievo per allievo.
 */
export const CORPO_CONSEGNA = [
  'Gentili signore, egregi signori,',
  '',
  'in allegato trovate {documento} di {allievo} ({classe}).',
  '',
  'Restiamo a disposizione per ogni chiarimento e porgiamo cordiali saluti.',
].join('\n')

/**
 * Un PDF appena arrivato, prima di sapere che cosa contiene. Nasce senza
 * blocchi e senza assegnazioni: quel che si è capito lo scrive lo smistatore
 * subito dopo aver letto le pagine.
 */
export function creaSmistamento (
  file: string,
  nome: string,
  pagine: number,
  consegnaId: string | null = null,
  classeId: string | null = null,
  divisione: Divisione = { modo: 'nomi' },
): Smistamento {
  return {
    id: nuovoIdSmistamento(),
    consegnaId,
    classeId,
    file,
    nome,
    pagine,
    letture: [],
    assegnate: [],
    blocchi: [],
    divisione,
    arrivatoIl: adesso(),
  }
}

export function creaMateria (nome: string, sigla = ''): Materia {
  return { id: nuovoIdMateria(), nome: nome.trim(), sigla: sigla.trim(), colore: '', note: '' }
}

/**
 * Un corso: questa materia, a questa classe. Il titolo predefinito dice proprio
 * quella coppia, perché è come lo si chiama parlando.
 */
export function creaCorso (classeId: string, materiaId: string, titolo: string): Corso {
  return {
    id: nuovoIdCorso(),
    classeId,
    materiaId,
    titolo: titolo.trim(),
    orario: [],
    note: '',
    creatoIl: adesso(),
    aggiornatoIl: adesso(),
  }
}

/** Una fascia dell'orario: il giorno e l'ora in cui quel corso si fa. */
export function creaRicorrenza (giorno: number, inizio: Ora, durataMin: number): Ricorrenza {
  // Una fascia dura unità didattiche intere: chi chiama passa minuti, ma non
  // c'è orario scolastico che duri un'ora e mezza e un quarto.
  return { id: nuovoIdRicorrenza(), giorno, inizio, durataMin: minutiInUd(durataMin), aula: '' }
}

/** Un periodo di chiusura dell'anno: vacanze, ponti, giornate d'istituto. */
export function creaSospensione (etichetta: string, dal: Iso, al: Iso): Sospensione {
  return { id: nuovoIdSospensione(), etichetta: etichetta.trim() || 'Sospensione', dal, al }
}

/**
 * Una consegna nuova, agganciata all'ora in cui la si sta dando.
 *
 * Nasce sempre dentro un corso: senza, non saprebbe a chi ripresentarsi. La
 * data è quella della lezione se ce n'è una — così spostando l'ora si sposta
 * anche quel che ci si è detti — e resta una data libera quando la consegna non
 * viene da un'ora ma da un pensiero avuto la sera prima.
 */
export function creaConsegna (
  corsoId: string,
  testo: string,
  data: Iso,
  lezioneId: string | null = null,
): Consegna {
  return {
    id: nuovoIdConsegna(),
    corsoId,
    testo: testo.trim(),
    tipo: 'compito',
    a: 'classe',
    allieviIds: [],
    dataLezioneId: lezioneId,
    data,
    scadenzaLezioneId: null,
    scadenza: null,
    note: '',
    fatte: [],
    // Gli stessi valori che la normalizzazione mette leggendo il file: una
    // consegna nata qui e una riletta dopo un riavvio devono scrivere alle
    // stesse persone.
    mailAllievo: true,
    mailTutore: true,
    creataIl: adesso(),
    aggiornataIl: adesso(),
  }
}

export function creaAllievo (cognome: string, nome: string): Allievo {
  return {
    id: nuovoIdAllievo(),
    cognome: cognome.trim(),
    nome: nome.trim(),
    telefoni: [],
    attivo: true,
  }
}

/**
 * Un numero nuovo: l'etichetta la propone il contatto, e chi scrive la cambia
 * se non è quella.
 */
export function creaTelefono (
  contatto: ContattoTelefonico,
  numero = '',
  etichetta: EtichettaTelefono = ETICHETTA_TELEFONO_PREDEFINITA[contatto],
): Telefono {
  return { id: nuovoIdTelefono(), contatto, etichetta, numero: numero.trim() }
}

export function creaRecapito (etichetta: string, email: string, predefinito = true): Recapito {
  return { id: nuovoIdRecapito(), etichetta: etichetta.trim(), email: email.trim(), predefinito }
}

/**
 * Una comunicazione nuova: parte come bozza e con i recapiti predefiniti del
 * fascicolo già dentro, che sono quelli a cui si scrive quasi sempre.
 */
export function creaComunicazione (fascicolo: Fascicolo): Comunicazione {
  return {
    id: nuovoIdComunicazione(),
    oggetto: '',
    corpo: '',
    aAllievi: true,
    aTutori: false,
    recapitiIds: fascicolo.recapiti.filter((r) => r.predefinito).map((r) => r.id),
    documentiIds: [],
    stato: 'bozza',
    destinatari: [],
    creataIl: adesso(),
  }
}

/**
 * L'appello di un allievo su un'ora di `ud` unità didattiche, tutte allo stesso
 * stato. Una riga nuova nasce muta — nessuna casella impostata — perché l'ora
 * non è ancora cominciata e nessuno ha guardato in faccia nessuno.
 */
export function creaPresenza (
  allievoId: string,
  ud: number,
  stato: StatoPresenza = 'non-impostato',
): Presenza {
  return { allievoId, stati: Array.from({ length: Math.max(1, ud) }, () => stato) }
}

export function creaSlot (inizio: Ora, durataMin: number, tipo: Slot['tipo'] = 'lezione'): Slot {
  // Uno slot di lezione è fatto di unità didattiche intere; una pausa dura i
  // minuti che le si danno.
  const quanto = tipo === 'pausa' ? Math.max(1, Math.round(durataMin)) : minutiInUd(durataMin)
  return { id: nuovoIdSlot(), inizio, fine: sommaMinuti(inizio, quanto), tipo }
}

/**
 * Una lezione nuova con un solo slot. Le presenze restano vuote finché la
 * lezione non viene aperta: la classe può cambiare fino all'ultimo.
 */
export function creaLezione (
  corsoId: string,
  data: Iso,
  inizio: Ora,
  durataMin: number,
): Lezione {
  return {
    id: nuovoIdLezione(),
    corsoId,
    data,
    slot: [creaSlot(inizio, durataMin)],
    aula: '',
    stato: 'pianificata',
    pianoId: null,
    avanzamento: [],
    presenze: [],
    osservazioni: [],
    matrice: [],
    argomenti: '',
    materiali: '',
    consuntivo: '',
    creataIl: adesso(),
    aggiornataIl: adesso(),
  }
}

export function creaOsservazione (
  tipo: Osservazione['tipo'],
  testo: string,
  allievoId: string | null = null,
): Osservazione {
  return { id: nuovoIdOsservazione(), allievoId, tipo, testo, creataIl: adesso() }
}

export function creaAttivita (titolo: string, durataUd: number): Attivita {
  return {
    id: nuovoIdAttivita(),
    titolo,
    tipo: 'spiegazione',
    durataUd: udArrotondate(durataUd),
    descrizione: '',
    materiali: '',
    raggruppamento: 'plenaria',
    risorse: [],
  }
}

/**
 * Una risorsa nuova. Il file non c'è ancora: lo mette l'host dopo aver copiato
 * quel che si è scelto nella cartella dei dati, perché il webview il disco non
 * lo tocca.
 */
export function creaRisorsa (tipo: Risorsa['tipo'], titolo = ''): Risorsa {
  return { id: nuovoIdRisorsa(), tipo, titolo: titolo.trim(), aggiuntaIl: adesso() }
}

export function creaPiano (corsoId: string | null = null): PianoLezione {
  return {
    id: nuovoIdPiano(),
    corsoId,
    obiettivi: [],
    prerequisiti: '',
    attivita: [],
    risorse: [],
    note: '',
    tag: [],
    creatoIl: adesso(),
    aggiornatoIl: adesso(),
  }
}

export function creaValutazione (
  corsoId: string,
  titolo: string,
  scala: Scala = SCALA_PREDEFINITA,
  data: Iso = oggi(),
): MomentoValutazione {
  return {
    id: nuovoIdValutazione(),
    corsoId,
    lezioneId: null,
    pianoId: null,
    titolo,
    tipo: 'scritto',
    data,
    peso: 1,
    scala: { ...scala },
    descrizione: '',
    voti: [],
    allegati: [],
    creatoIl: adesso(),
    aggiornatoIl: adesso(),
  }
}

/** Duplica un piano azzerando gli identificatori: la copia è indipendente. */
export function duplicaPiano (piano: PianoLezione): PianoLezione {
  return {
    ...piano,
    id: nuovoIdPiano(),
    // Le risorse seguono la copia con id nuovi: i file li ricopia l'host, che
    // è l'unico che tocca il disco, e i percorsi li riscrive di conseguenza.
    attivita: piano.attivita.map((a) => ({
      ...a,
      id: nuovoIdAttivita(),
      risorse: a.risorse.map((r) => ({ ...r, id: nuovoIdRisorsa() })),
      // La prova prevista si copia a fondo: due piani che condividono lo
      // stesso oggetto sono un piano solo appena si cambia il peso di uno.
      valutazione: a.valutazione ? { ...a.valutazione } : a.valutazione,
    })),
    risorse: piano.risorse.map((r) => ({ ...r, id: nuovoIdRisorsa() })),
    obiettivi: [...piano.obiettivi],
    tag: [...piano.tag],
    creatoIl: adesso(),
    aggiornatoIl: adesso(),
  }
}

/**
 * Duplica una lezione su un'altra data: si tiene l'impianto (orari, piano,
 * aula), si lascia indietro quel che è successo in aula.
 */
export function duplicaLezione (lezione: Lezione, data: Iso): Lezione {
  return {
    ...lezione,
    id: nuovoIdLezione(),
    data,
    slot: lezione.slot.map((s) => ({ ...s, id: nuovoIdSlot() })),
    stato: 'pianificata',
    avanzamento: [],
    presenze: [],
    osservazioni: [],
    matrice: [],
    argomenti: '',
    consuntivo: '',
    creataIl: adesso(),
    aggiornataIl: adesso(),
  }
}
