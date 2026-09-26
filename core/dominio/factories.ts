// Costruttori delle entità: la forma "appena creata" in un posto solo, perché
// webview ed extension host creano le stesse cose con gli stessi predefiniti.

import { annoAllineato, semestriFra } from './years.js'
import { ETICHETTA_TELEFONO_PREDEFINITA } from './lexicon.js'
import { testi } from './factories.testi.js'
import {
  LIMITI_UD,
  udArrotondate,
  daIso,
  etichettaAnno,
  istanteAdesso,
  oggi,
  primoAnnoScolastico,
  sommaMinuti,
} from './dates.js'
import {
  nuovoIdAllievo,
  nuovoIdAnno,
  nuovoIdAttivita,
  nuovoIdCheck,
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
  Check,
  ColonnaCheck,
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
import { ALTEZZA_LOGO, VERSIONE_DATI } from './models.js'

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
  return COLORI_CLASSE.find((c) => !usati.includes(c)) ??
    COLORI_CLASSE[usati.length % COLORI_CLASSE.length]
}

export const IMPOSTAZIONI_PREDEFINITE: Impostazioni = {
  scala: { ...SCALA_PREDEFINITA },
  oraInizioGiornata: '07:30',
  oraFineGiornata: '18:00',
  giorniVisibili: [1, 2, 3, 4, 5],
  // Mezzi punti per la nota di fine semestre; durante l'anno si va a quarti.
  passoFineSemestre: 0.5,
  sogliaAssenza: 20,
  minutiUd: LIMITI_UD.predefinita,
  durataSlotPredefinita: LIMITI_UD.predefinita,
  durataPausaPredefinita: 15,
  // I documenti seguono i dati da soli; chi li vuole fermi lo dice.
  pdfAutomatici: 'sempre',
  // Vuoto: le tendine partono da quelle di fabbrica, qui solo le modifiche.
  liste: {},
  // Vuota: i fogli escono senza sede né firma finché non le si scrive.
  intestazione: {
    carte: [{ id: 'car-prima', sede: '', altezzaLogo: ALTEZZA_LOGO.predefinita, corsi: [] }],
    docente: '',
  },
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
    check: [],
    smistamenti: [],
    coordinate: [],
    impostazioni: {
      ...IMPOSTAZIONI_PREDEFINITE,
      scala: { ...SCALA_PREDEFINITA },
      intestazione: {
        ...IMPOSTAZIONI_PREDEFINITE.intestazione,
        carte: IMPOSTAZIONI_PREDEFINITE.intestazione.carte.map((carta) => ({ ...carta, corsi: [] })),
      },
    },
  }
}

/**
 * Un anno scolastico con i due semestri tagliati. Il confine è l'ultimo giorno
 * del primo semestre; se non lo si dice, fine gennaio. Modificabile dopo.
 */
export function creaAnno (
  inizio: Iso,
  fine: Iso,
  etichetta?: string,
  confineScelto?: Iso,
): AnnoScolastico {
  // Il confine deve cadere dentro l'anno, se no fine gennaio; per un anno che
  // nemmeno quella attraversa, `semestriFra` taglia a metà.
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
  const primo = primoAnnoScolastico(oggi())
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
 * Un periodo di assenze da far firmare. Nasce senza righe: una riga compare
 * col primo foglio di quell'allievo.
 */
export function creaBloccoAssenze (
  dal: Iso,
  al: Iso,
  fascicolo?: Fascicolo,
  etichetta = '',
): BloccoAssenze {
  return {
    id: nuovoIdBloccoAssenze(),
    // Il nome lo ricava chi salva dalle date (vedi `etichettaPeriodo`).
    etichetta: etichetta.trim(),
    dal,
    al,
    // `{tipi}` diventa «Assenze», «Ritardi» o «Assenze e ritardi» secondo gli
    // allegati; `{periodo}` è il nome se c'è e sempre le due date, perché
    // l'azienda non ha il registro davanti.
    oggetto: '{tipi} — {allievo} — {periodo}',
    // La lettera nasce già scritta; i segnaposto li riempie `testoAssenze`
    // allievo per allievo.
    corpo: testi().corpoAssenze,
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
 * Il testo con cui un documento parte per mail, già scritto; i segnaposto li
 * riempie `testoConsegna` allievo per allievo.
 */
export function corpoConsegna (): string {
  return testi().corpoConsegna
}

/**
 * Un PDF appena arrivato: senza blocchi né assegnazioni, che scrive lo
 * smistatore dopo aver letto le pagine.
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

/** Un corso: questa materia, a questa classe, col titolo di serie. */
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

/**
 * Una fascia dell'orario: giorno, ora e minuti dati. Quanto dura un'UD lo sa
 * il documento: chi chiama passa `minutiDaUd(ud, minutiUd)` e
 * `validaRicorrenza` rifiuta quel che non torna.
 */
export function creaRicorrenza (giorno: number, inizio: Ora, durataMin: number): Ricorrenza {
  return {
    id: nuovoIdRicorrenza(),
    giorno,
    inizio,
    durataMin: Math.max(1, Math.round(durataMin)),
    aula: '',
  }
}

/** Un periodo di chiusura dell'anno: vacanze, ponti, giornate d'istituto. */
export function creaSospensione (etichetta: string, dal: Iso, al: Iso): Sospensione {
  return { id: nuovoIdSospensione(), etichetta: etichetta.trim() || testi().sospensione, dal, al }
}

/**
 * Una consegna nuova, sempre dentro un corso. Con una lezione la data è la
 * sua (e la segue se l'ora si sposta); altrimenti è una data libera.
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
    // Gli stessi valori della normalizzazione: nata qui o riletta dopo un
    // riavvio, la consegna scrive alle stesse persone.
    mailAllievo: true,
    mailTutore: true,
    creataIl: adesso(),
    aggiornataIl: adesso(),
  }
}

/**
 * La lista di controllo di un corso, vuota o con le colonne date. Nasce senza
 * spunte anche quando le colonne vengono da un'altra lista.
 */
export function creaCheck (corsoId: string, colonne: readonly ColonnaCheck[] = []): Check {
  return {
    id: nuovoIdCheck(),
    corsoId,
    colonne: colonne.map((c) => ({ ...c })),
    spunte: [],
    creatoIl: adesso(),
    aggiornatoIl: adesso(),
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

/** Un numero nuovo: l'etichetta proposta dipende dal contatto. */
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
 * Una comunicazione nuova: bozza, con dentro i recapiti predefiniti del
 * fascicolo.
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
 * L'appello di un allievo su un'ora di `ud` unità didattiche. Nasce senza
 * nessuna casella impostata: l'ora non è ancora cominciata.
 */
export function creaPresenza (
  allievoId: string,
  ud: number,
  stato: StatoPresenza = 'non-impostato',
): Presenza {
  return { allievoId, stati: Array.from({ length: Math.max(1, ud) }, () => stato) }
}

export function creaSlot (inizio: Ora, durataMin: number, tipo: Slot['tipo'] = 'lezione'): Slot {
  // Quanto dura un'UD lo dice il documento: chi chiama passa un multiplo, e
  // `validaSlot` rifiuta quel che non lo è.
  const quanto = Math.max(1, Math.round(durataMin))
  return { id: nuovoIdSlot(), inizio, fine: sommaMinuti(inizio, quanto), tipo }
}

/**
 * Una lezione nuova con un solo slot. Le presenze restano vuote finché la
 * lezione non si apre: la classe può cambiare fino all'ultimo.
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
 * Una risorsa nuova, ancora senza file: lo mette l'host dopo averlo copiato,
 * perché il webview non tocca il disco.
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
    // Risorse con id nuovi; i file li ricopia l'host e riscrive i percorsi.
    attivita: piano.attivita.map((a) => ({
      ...a,
      id: nuovoIdAttivita(),
      risorse: a.risorse.map((r) => ({ ...r, id: nuovoIdRisorsa() })),
      // Copia profonda: un oggetto condiviso legherebbe i due piani.
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
 * Duplica una classe in un anno, con un nome: l'impianto e le persone, senza
 * quel che le persone hanno fatto.
 *
 * Allievi con id nuovi: l'id è la chiave di voti, presenze e fogli, e due
 * classi che lo condividono rendono ambigua ogni ricerca
 * (`classeDellAllievo`). Copia profonda (niente telefoni condivisi). La foto
 * esce col percorso dell'originale: chi duplica deve ricopiare il file o
 * togliere il riferimento, se no due allievi hanno una foto sola.
 */
export function duplicaClasse (classe: Classe, annoId: string, nome: string): Classe {
  return {
    ...classe,
    id: nuovoIdClasse(),
    annoId,
    nome,
    allievi: classe.allievi.map((a) => ({ ...structuredClone(a), id: nuovoIdAllievo() })),
    creataIl: adesso(),
    aggiornataIl: adesso(),
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
