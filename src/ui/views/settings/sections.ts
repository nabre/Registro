// Come le impostazioni del programma si dividono in sezioni.
//
// Sta a parte dal resto della pagina, e senza una riga di DOM, per una ragione
// sola: così si prova. La divisione è l'unica cosa qui che può rompersi in
// silenzio — un'impostazione aggiunta al manifesto e finita in nessuna sezione
// esiste, si può cambiare da riga di comando, e non compare da nessuna parte —
// e una prova che la guardi vale più di qualunque attenzione.
//
// La regola che rende impossibile quel guasto è l'ultima sezione, che
// *raccoglie*: quel che nessuna ha nominato finisce lì. È la stessa dei gruppi
// del menu, e per la stessa ragione — l'elenco delle sezioni può restare
// indietro senza che si perda una funzione.

import { Maiuscola } from '../../../domain/lexicon.js'
import type { Vista, VoceProgramma } from '../../../protocol.js'
import type { SchedaDocumento, SchedaProgramma } from '../../state.js'

export interface SezioneProgramma {
  id: SchedaProgramma
  titolo: string
  sottotitolo: string
  /** Le chiavi che raccoglie, per prefisso. */
  prefissi: readonly string[]
  /**
   * La pagina in cui quel che questa sezione regola si fa davvero.
   *
   * Tre sezioni parlano di modelli del linguaggio, e in nessuna delle tre si
   * può scaricarne uno: le impostazioni tengono il *nome* di un file, e il file
   * arriva dalla pagina «Modelli linguistici». Senza questa riga si legge
   * «Il file .gguf con cui risponde l'assistente» accanto a una casella vuota,
   * e non c'è niente che dica dove si prende un .gguf.
   */
  pagina?: { vista: Vista, testo: string, perche: string }
  /**
   * Quel che va letto **prima** di toccare queste voci, quando toccarle
   * concede qualcosa a qualcun altro.
   *
   * Una sola sezione ce l'ha, ed è quella del condotto: lì un interruttore
   * apre i dati delle persone in formazione a ogni programma che gira con lo
   * stesso accesso. La descrizione di ciascuna voce lo dice già, ma si legge
   * dopo aver spuntato — e questa è la specie di casella che si spunta per
   * provare.
   */
  avvertenza?: string
  /** L'ultima: raccoglie anche quel che nessuna sezione ha nominato. */
  raccoglie?: boolean
}

/**
 * Il rimando alla pagina dei modelli, uguale per le tre sezioni che ne parlano.
 *
 * Scritto una volta: tre copie della stessa frase sono tre posti in cui
 * correggerla, e il giorno in cui la pagina cambiasse nome ne resterebbe
 * indietro una.
 */
const PAGINA_MODELLI = {
  vista: 'modelliLinguistici' as const,
  testo: 'Apri i modelli linguistici',
  perche:
    'Qui si dice **quale** modello lavora; a scaricarlo, a trascinarlo dentro e a toglierlo ' +
    'si va nella pagina «Modelli linguistici», che dice anche quanto pesa e se è pronto.',
}

export const SEZIONI_PROGRAMMA: readonly SezioneProgramma[] = [
  {
    id: 'aspetto',
    titolo: 'Aspetto e avvio',
    sottotitolo:
      'come si presenta il registro, e che cosa si trova acceso quando si accende il computer',
    prefissi: [
      'registroDocenti.aspetto',
      'registroDocenti.vassoio',
      'registroDocenti.avvio',
      'registroDocenti.aperturaAutomatica',
    ],
  },
  {
    id: 'agenda',
    titolo: 'Agenda sul desktop',
    sottotitolo: 'la striscia con le ore della settimana, appesa al bordo dello schermo',
    prefissi: ['registroDocenti.agenda'],
  },
  {
    id: 'avvisi',
    titolo: 'Avvisi e proiezione',
    sottotitolo: 'che cosa il registro dice da sé, e come si presenta alla classe',
    prefissi: ['registroDocenti.promemoria', 'registroDocenti.proiezione'],
  },
  {
    id: 'posta',
    titolo: 'Posta',
    sottotitolo: 'da quale casella escono le comunicazioni, e se partono da sole',
    prefissi: ['registroDocenti.posta'],
  },
  {
    id: 'recapiti',
    // Stava insieme alla posta, e non è la stessa cosa: di là si decide da che
    // casella parte una comunicazione a tutta la classe, qui con che programma
    // si chiama una persona sola. Insieme erano sei righe sotto un titolo che
    // ne annunciava tre.
    titolo: 'Numeri e indirizzi',
    sottotitolo: 'con che cosa si chiama e si scrive a una persona sola, dall’anagrafica',
    prefissi: ['registroDocenti.recapiti'],
  },
  {
    id: 'modelli',
    titolo: 'Modelli e cartelle',
    sottotitolo:
      'dove stanno i file .gguf che fanno rispondere l’assistente e leggere le scansioni',
    prefissi: ['registroDocenti.modelli'],
    pagina: PAGINA_MODELLI,
  },
  {
    id: 'lettura',
    titolo: 'Lettura delle scansioni',
    sottotitolo: 'il riconoscimento dei fogli che arrivano scansionati',
    prefissi: ['registroDocenti.ocr'],
    pagina: PAGINA_MODELLI,
  },
  {
    id: 'assistente',
    titolo: 'Assistente',
    sottotitolo: 'il modello locale a cui si può chiedere del registro, e che può solo leggerlo',
    prefissi: ['registroDocenti.assistente'],
    pagina: PAGINA_MODELLI,
  },
  {
    id: 'dettatura',
    // Staccata dall'assistente: sono dieci voci in tutto, e metà parlano di un
    // microfono e metà di un modello che legge il registro. In una sezione sola
    // le due metà si somigliavano abbastanza da far cercare nella sbagliata.
    titolo: 'Dettatura',
    sottotitolo: 'il microfono con cui si detta una domanda invece di batterla',
    prefissi: ['registroDocenti.dettatura'],
    pagina: PAGINA_MODELLI,
  },
  {
    id: 'condotto',
    // Finiva nella sezione che raccoglie, sotto «quel che non sta altrove».
    // Sono le tre voci che concedono a qualunque programma dello stesso utente
    // di leggere i dati delle persone in formazione e di far partire posta a
    // nome del docente: la cosa meno adatta di tutte a stare negli avanzi.
    titolo: 'Condotto e riga di comando',
    sottotitolo: 'se il registro risponde anche fuori dalle sue finestre, e a che cosa',
    prefissi: ['registroDocenti.api'],
    avvertenza:
      'Qui si concede a **programmi che non sono il registro** di guardarci dentro. Acceso il '
      + 'condotto, ogni programma che gira con il tuo stesso accesso può usarlo senza chiedertelo: '
      + 'non c’è una password e non c’è una domanda. Accendilo per il tempo che serve a quello '
      + 'script, e spegnilo quando hai finito.',
  },
  {
    id: 'file',
    titolo: 'Quel che non sta altrove',
    // Questa sezione resta anche da vuota, ed è il punto: è la rete sotto
    // l'elenco qui sopra. Una chiave aggiunta domani a un gruppo che nessuno
    // ha previsto finisce qui, e si può regolare lo stesso giorno in cui
    // nasce, senza che nessuno debba ricordarsi di nominarla.
    sottotitolo:
      'i documenti d’anno che si aprono e si mettono da parte, e ogni impostazione che nessuna '
      + 'sezione ha ancora nominato',
    prefissi: [],
    raccoglie: true,
  },
]

/**
 * Le sezioni delle impostazioni del documento d'anno: come si chiamano.
 *
 * Qui ci sono i nomi e basta; quel che ciascuna disegna lo attacca
 * `views/settings.ts`, che è l'unico a sapere di DOM. Stavano là tutti e
 * due insieme, e finché a leggerli era soltanto la pagina andava bene: adesso
 * li legge anche la veduta dell'assistente — «in quale sezione si sta» — e
 * farle importare la pagina delle impostazioni vorrebbe dire tirarsi dietro
 * l'intero modulo che la disegna per leggere sei stringhe.
 *
 * L'alternativa era riscriverli nella veduta, ed è quella che non si fa: due
 * elenchi di nomi divergono, e il modello racconterebbe a chi chiede una
 * sezione che non si chiama più così.
 */
interface SezioneDocumento {
  id: SchedaDocumento
  titolo: string
  sottotitolo: string
}

export const SEZIONI_DOCUMENTO: readonly SezioneDocumento[] = [
  {
    id: 'anno',
    titolo: 'Anno scolastico',
    sottotitolo: 'semestri, chiusure, settimane A e B',
  },
  {
    id: 'calendario',
    titolo: 'Calendario',
    sottotitolo: 'la griglia della settimana e quel che viene proposto per una lezione nuova',
  },
  {
    id: 'valutazione',
    titolo: 'Valutazione',
    sottotitolo: 'la scala dei voti, l’arrotondamento di fine semestre, la soglia di assenza',
  },
  {
    id: 'materie',
    titolo: 'Materie',
    sottotitolo: 'che cosa si insegna, e in quali corsi finisce',
  },
  {
    id: 'liste',
    titolo: 'Liste',
    sottotitolo: 'le voci dei menu a tendina: tipi di attività, di prova, supporti',
  },
  {
    id: 'file',
    titolo: 'File',
    sottotitolo: 'il documento aperto, quel che contiene, e i riferimenti che non tornano',
  },
]

/**
 * Le chiavi che una scheda dedicata disegna da sé, e che l'elenco generico
 * quindi salta.
 *
 * Sta qui e non nella scheda che le disegna per non chiudere un cerchio: la
 * scheda Posta usa già il disegnatore delle righe, e se il disegnatore dovesse
 * chiedere a lei quali saltare i due moduli si importerebbero a vicenda.
 * Questo file non importa niente da nessuno, ed è il posto in cui la
 * collocazione delle impostazioni è già scritta.
 *
 * Non sono nascoste: sono *spostate*, e restano intere — nome, chiave,
 * «modificata», «Ritira» — perché è la stessa funzione a disegnarle. Quel che
 * cambia è dove si trovano: accanto alla riga che ne racconta l'effetto,
 * invece che in fila con `server` e `porta`, che si toccano una volta nella
 * vita.
 */
export const CHIAVI_IN_SCHEDA: Readonly<Record<string, readonly string[]>> = {
  posta: ['registroDocenti.posta.invioDiretto'],
}

/** Se una chiave la disegna già la scheda dedicata di quella sezione. */
function disegnataDallaScheda (chiave: string, sezione: SezioneProgramma): boolean {
  return (CHIAVI_IN_SCHEDA[sezione.id] ?? []).includes(chiave)
}

/** Se una chiave appartiene a un elenco di prefissi: esatta, o puntata sotto. */
export function sottoPrefisso (chiave: string, prefissi: readonly string[]): boolean {
  return prefissi.some((prefisso) => chiave === prefisso || chiave.startsWith(`${prefisso}.`))
}

// La regola delle voci sospese — figlia spenta finché il padre lo è — stava
// qui. Adesso sta in `src/manifest.ts`, accanto alla dichiarazione di
// `dipendeDa`, e il suo risultato arriva già calcolato dentro `voce.sospesa`:
// le superfici sono due, e la seconda è una pagina HTML senza import, che di
// questa regola poteva solo non sapere niente. Vedi lì per il perché.

/**
 * Le voci di una sezione, nell'ordine in cui arrivano — che è quello del
 * manifesto.
 *
 * Chi raccoglie prende anche le orfane: quelle che nessun'altra sezione ha
 * nominato.
 */
export function vociDiSezione (
  voci: readonly VoceProgramma[],
  sezione: SezioneProgramma,
): VoceProgramma[] {
  const nominati = SEZIONI_PROGRAMMA.filter((altra) => !altra.raccoglie).flatMap((altra) => [
    ...altra.prefissi,
  ])
  return voci.filter(
    (voce) =>
      !disegnataDallaScheda(voce.chiave, sezione) &&
      (sezione.raccoglie
        ? sottoPrefisso(voce.chiave, sezione.prefissi) || !sottoPrefisso(voce.chiave, nominati)
        : sottoPrefisso(voce.chiave, sezione.prefissi)),
  )
}

/**
 * Tutte le voci che la sezione **mostra**, elenco e scheda dedicata insieme.
 *
 * `vociDiSezione` toglie quel che la scheda promuove, perché a disegnarlo è
 * lei; ma chi conta — «Ripristina (3)», il numero accanto al titolo nella
 * colonna — non sta disegnando, sta guardando la sezione intera. Contando solo
 * l'elenco, `posta.invioDiretto` si vedeva in pagina segnata «modificata» e
 * non era né contata né ritirata: il pulsante prometteva di rimettere tutto a
 * posto e ne lasciava indietro una, senza dirlo.
 *
 * È la stessa unione che la prova di copertura usa da sempre per dire che
 * ogni chiave sta da qualche parte. Un solo modo di contare, in tutti e due i
 * posti in cui contare vuol dire la stessa cosa.
 */
export function vociMostrateDaSezione (
  voci: readonly VoceProgramma[],
  sezione: SezioneProgramma,
): VoceProgramma[] {
  const promosse = CHIAVI_IN_SCHEDA[sezione.id] ?? []
  return [
    ...vociDiSezione(voci, sezione),
    ...voci.filter((voce) => promosse.includes(voce.chiave)),
  ]
}

/**
 * Come si chiamano i gruppi di chiavi, dove il nome della chiave non basta.
 *
 * Serve perché una sezione ne tiene insieme più d'uno: «Aspetto e avvio» ha
 * dentro il tema, il vassoio e l'accensione con il computer, e in fila
 * diventano tre righe «Attivo» e due «Attiva» che non si distinguono. Il titolo
 * di gruppo rimette ogni riga sotto la cosa di cui parla.
 *
 * Un gruppo che non è qui prende il nome dal proprio ultimo pezzo: è quel che
 * succede a un gruppo aggiunto domani, e si legge comunque.
 */
const TITOLI_GRUPPI: Readonly<Record<string, string>> = {
  'registroDocenti.aspetto': 'Tema',
  'registroDocenti.vassoio': 'Icona accanto all’orologio',
  'registroDocenti.agenda': 'Agenda sul desktop',
  'registroDocenti.avvio': 'Accensione con il computer',
  'registroDocenti.promemoria': 'Promemoria delle lezioni',
  'registroDocenti.proiezione': 'Proiezione per la classe',
  'registroDocenti.posta': 'Casella di posta',
  'registroDocenti.recapiti': 'Numeri e indirizzi dell’anagrafica',
  'registroDocenti.ocr': 'Lettura delle scansioni',
  'registroDocenti.assistente': 'Assistente',
  'registroDocenti.dettatura': 'Dettatura',
  'registroDocenti.api': 'Concessioni del condotto',
}

export interface GruppoVoci {
  /** `registroDocenti.agenda`, o la chiave stessa quando non ha gruppo. */
  prefisso: string
  titolo: string
  voci: VoceProgramma[]
}

/** Il gruppo di una chiave: `registroDocenti.agenda.celle` → `registroDocenti.agenda`. */
function gruppoDi (chiave: string): string {
  const pezzi = chiave.split('.')
  return pezzi.length > 2 ? pezzi.slice(0, -1).join('.') : chiave
}

/**
 * Le voci di una sezione, divise nei loro gruppi e nell'ordine in cui arrivano.
 *
 * Solo quelle di tutti i giorni: i percorsi degli eseguibili e le attese
 * massime — `avanzata` nel manifesto — le dà `avanzateDiSezione`, e chi
 * disegna le mette in fondo in un gruppo che si apre. Stavano in fila con il
 * tema, e facevano sembrare tecnica una pagina che per il resto si legge in un
 * minuto.
 *
 * I gruppi con una voce sola e lo stesso nome della voce non si vedranno: li
 * scarta chi disegna, perché un titolo che ripete la riga sotto è rumore.
 */
export function gruppiDiSezione (
  voci: readonly VoceProgramma[],
  sezione: SezioneProgramma,
): GruppoVoci[] {
  return raggruppa(vociDiSezione(voci, sezione).filter((voce) => !voce.avanzata))
}

/**
 * Quel che di una sezione sta in fondo, nel gruppo che si apre.
 *
 * Non divise per gruppo: sono poche e vengono da posti diversi — un percorso e
 * due attese — e sotto un titolo che si è già dovuto aprire un secondo livello
 * di titoli non aggiunge niente.
 */
export function avanzateDiSezione (
  voci: readonly VoceProgramma[],
  sezione: SezioneProgramma,
): VoceProgramma[] {
  return vociDiSezione(voci, sezione).filter((voce) => voce.avanzata)
}

function raggruppa (voci: readonly VoceProgramma[]): GruppoVoci[] {
  const gruppi: GruppoVoci[] = []
  for (const voce of voci) {
    const prefisso = gruppoDi(voce.chiave)
    const gia = gruppi.find((gruppo) => gruppo.prefisso === prefisso)
    if (gia) {
      gia.voci.push(voce)
      continue
    }
    gruppi.push({
      prefisso,
      titolo: TITOLI_GRUPPI[prefisso] ?? nomeVoce(prefisso),
      voci: [voce],
    })
  }
  return gruppi
}

/**
 * Il nome di un'impostazione, ricavato dall'ultimo pezzo della chiave:
 * `attesaMassimaSecondi` → «Attesa massima secondi».
 *
 * Ricavato e non scritto a mano perché il manifesto ha già la descrizione, che
 * è la cosa che conta: un secondo elenco di titoli sarebbe un secondo posto da
 * tenere allineato per guadagnare tre parole più belle.
 */
export function nomeVoce (chiave: string): string {
  const ultimo = chiave.split('.').pop() ?? chiave
  const parole = ultimo.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
  return Maiuscola(parole)
}
