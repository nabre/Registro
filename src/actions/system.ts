// Quel che non appartiene a nessuna area in particolare: le impostazioni, le
// esportazioni, le riparazioni e i comandi che parlano con il sistema.

import * as apparato from 'apparato'

import { collocazioneDi, percorsoDi } from '../domain/locations.js'
import { csvPresenze, csvValutazioni, scriviGenerato, testoLezione } from '../data/exports.js'
import { cartellaAnno, cartellaDocumento } from '../data/paths.js'
import { impostazioneDichiarata, valoreAccettabile } from '../environment/settings.js'
import { collegaAccount, inviaProva, provaCollegamento, scollegaAccount } from '../data/mail.js'
import { classeDelCorsoId, classeDellaLezione, registroDelCorso } from '../domain/courses.js'
import { udPrevisteDaOrario } from '../domain/timetable.js'
import { numeroComponibile } from '../domain/phones.js'
import {
  composizioneOutlookWeb,
  indirizzoChiamata,
  indirizzoMailto,
  indirizzoScrivibile,
  modoChiamata,
  modoPosta,
} from '../domain/contacts.js'
import { apriConOutlook } from '../data/outlook.js'
import type { Registro } from '../domain/models.js'
import { riparazioni } from '../domain/repairs.js'
import { normalizzaImpostazioni } from '../domain/validation.js'
import { conMessaggio, fatto, rifiuta, rifiutaCon, type Parte } from './context.js'

/**
 * Dove va il CSV di un corso: accanto al PDF, con lo stesso nome.
 *
 * Il posto lo dice il dominio, come per i rapporti: sono lo stesso documento in
 * due forme — quello che si consegna e quello su cui si rifanno i conti — e due
 * regole diverse sullo stesso scaffale sono peggio di una sola.
 */
function percorsoCsv (
  registro: Registro,
  genere: 'presenze' | 'valutazioni',
  corsoId: string,
  semestreId: string | null,
): string {
  const dove = collocazioneDi(registro, genere, corsoId, { semestreId })
  return dove ? percorsoDi(dove, 'csv') : ''
}

/**
 * Come si chiama, a schermo, il posto in cui si sceglie il programma. Scritta
 * una volta: tre messaggi che mandano in tre posti diversi mandano a cercare.
 */
const VOCE_RECAPITI = 'nelle impostazioni, alla voce «Numeri e indirizzi»'

/** Un'impostazione dei recapiti: con che cosa si chiama, con che cosa si scrive. */
function scelta (chiave: 'telefono' | 'posta'): string | undefined {
  return apparato.impostazioni.leggi('registroDocenti.recapiti').get<string>(chiave)
}

/** Riuscita che nel registro non cambia niente: si è alzata una cornetta, si è aperta una finestra. */
const fuori = { ok: true, invariato: true } as const

export const sistema = {
  'impostazioni.salva': (contesto, azione) => {
    return contesto.modifica((r) => {
      r.impostazioni = normalizzaImpostazioni(azione.impostazioni)
    }, ['registro'])
  },

  /**
   * Un'impostazione del programma, scritta dalla pagina Impostazioni.
   *
   * Il valore ripassa dalla dogana dell'ambiente anche se arriva da una pagina
   * nostra: è pur sempre una pagina, e una chiave inventata o un numero
   * arrivato come testo finirebbero nel file. `update` e non una scrittura
   * diretta, perché è `update` a far scattare l'avviso che fa ricaricare chi
   * deve — la cartella dei dati, la lettura delle scansioni, il widget.
   */
  'programma.salva': async (_contesto, azione) => {
    const valore = valoreAccettabile(azione.chiave, azione.valore)
    if (valore === undefined) return rifiuta(`Impostazione non riconosciuta: ${azione.chiave}.`)
    await apparato.impostazioni
      .leggi()
      .update(azione.chiave, valore, apparato.AmbitoImpostazione.Global)
    return fatto
  },

  /**
   * Ritira il valore scritto: da lì in poi vale quel che dice il manifesto.
   *
   * La domanda è una sola — «questa chiave esiste?» — e si risponde guardando
   * il manifesto. Prima si costruivano **tutte** le voci per trovarne una: una
   * `inspect` per ognuna delle quarantatré chiavi, e «Ripristina (n)» lo
   * faceva n volte di fila, una per ogni chiave che stava ritirando.
   */
  'programma.azzera': async (_contesto, azione) => {
    if (!impostazioneDichiarata(azione.chiave)) {
      return rifiuta(`Impostazione non riconosciuta: ${azione.chiave}.`)
    }
    await apparato.impostazioni
      .leggi()
      .update(azione.chiave, undefined, apparato.AmbitoImpostazione.Global)
    return fatto
  },

  'esporta.valutazioni': async (contesto, azione) => {
    const corso = contesto.registro.corsi.find((c) => c.id === azione.corsoId)
    if (!corso) return rifiuta('Corso non trovato.')
    const classe = classeDelCorsoId(contesto.registro, corso.id)
    if (!classe) return rifiuta('Il corso non è di nessuna classe.')
    const anno = contesto.registro.anni.find((a) => a.id === classe.annoId)
    const semestre = anno?.semestri.find((s) => s.id === azione.semestreId) ?? null
    // Il semestre di un momento è quello in cui cade la sua data: non c'è un
    // campo da confrontare, c'è un intervallo in cui stare.
    const momenti = contesto.registro.valutazioni
      .filter((v) => v.corsoId === corso.id)
      .filter((v) => !semestre || (v.data >= semestre.inizio && v.data <= semestre.fine))
    if (momenti.length === 0) return rifiuta('Nessun momento di valutazione da esportare.')
    const periodo = semestre?.etichetta ?? 'anno intero'
    const contenuto = csvValutazioni(classe, corso, momenti, periodo)
    // Accanto al PDF, nella stessa cartella: sono lo stesso documento in due
    // forme — quello che si consegna e quello su cui si rifanno i conti.
    const file = await scriviGenerato(
      percorsoCsv(contesto.registro, 'valutazioni', corso.id, azione.semestreId),
      contenuto,
    )
    // `scriviGenerato` torna null quando la scrittura non è riuscita: dirlo,
    // invece di annunciare un'esportazione che sul disco non c'è.
    if (!file) return rifiuta('Non ho potuto scrivere il file esportato.')
    await apparato.dialoghi.apriDocumento(file, { preview: false })
    return fatto
  },

  'esporta.presenze': async (contesto, azione) => {
    const corso = contesto.registro.corsi.find((c) => c.id === azione.corsoId)
    if (!corso) return rifiuta('Corso non trovato.')
    const classe = classeDelCorsoId(contesto.registro, corso.id)
    if (!classe) return rifiuta('Il corso non è di nessuna classe.')
    // Accanto al PDF, nella cartella del corso: sono lo stesso documento in due
    // forme — quello che si consegna e quello su cui si rifanno i conti.
    const anno = contesto.registro.anni.find((a) => a.id === classe.annoId)
    const semestre = anno?.semestri.find((s) => s.id === azione.semestreId) ?? null
    const periodo = semestre?.etichetta ?? 'anno intero'
    // Lo stesso periodo e le stesse ore del PDF: sono lo stesso documento in
    // due forme — quello che si consegna e quello su cui si rifanno i conti —
    // e due conteggi diversi sullo stesso scaffale sono peggio di uno solo.
    const contenuto = csvPresenze(
      classe,
      registroDelCorso(contesto.registro, corso.id).filter(
        (l) => l.stato !== 'annullata' && (!semestre || (l.data >= semestre.inizio && l.data <= semestre.fine)),
      ),
      contesto.registro.impostazioni,
      // Il denominatore del PDF, non un altro: il cento per cento sono le ore
      // che l'orario prevedeva nel periodo, non quelle finite a calendario.
      udPrevisteDaOrario(
        anno ?? null,
        corso,
        semestre?.inizio ?? anno?.inizio ?? '',
        semestre?.fine ?? anno?.fine ?? '',
      ),
      periodo,
    )
    const file = await scriviGenerato(
      percorsoCsv(contesto.registro, 'presenze', corso.id, azione.semestreId),
      contenuto,
    )
    // `scriviGenerato` torna null quando la scrittura non è riuscita: dirlo,
    // invece di annunciare un'esportazione che sul disco non c'è.
    if (!file) return rifiuta('Non ho potuto scrivere il file esportato.')
    await apparato.dialoghi.apriDocumento(file, { preview: false })
    return fatto
  },

  'esporta.lezione': async (contesto, azione) => {
    const lezione = contesto.registro.lezioni.find((l) => l.id === azione.lezioneId)
    if (!lezione) return rifiuta('Lezione non trovata.')
    const classe = classeDellaLezione(contesto.registro, lezione)
    const piano = contesto.registro.piani.find((p) => p.id === lezione.pianoId) ?? null
    // Le consegne date in quest'ora hanno preso il posto del vecchio campo
    // «compiti»: il verbale le stampa da lì.
    const date = contesto.registro.consegne.filter((c) => c.dataLezioneId === lezione.id)
    const contenuto = testoLezione(lezione, classe, piano, date)
    // Lo stesso posto del verbale in PDF, e lo stesso nome con un'altra
    // estensione: il PDF si consegna, il testo si riapre e si corregge, e stare
    // vicini è quel che li fa trovare insieme.
    const dove = collocazioneDi(contesto.registro, 'lezione', lezione.id)
    if (!dove) return rifiuta('Lezione non trovata.')
    const file = await scriviGenerato(percorsoDi(dove, 'md'), contenuto)
    // `scriviGenerato` torna null quando la scrittura non è riuscita: dirlo,
    // invece di annunciare un'esportazione che sul disco non c'è.
    if (!file) return rifiuta('Non ho potuto scrivere il file esportato.')
    await apparato.dialoghi.apriDocumento(file, { preview: false })
    return fatto
  },

  'manutenzione.ripara': (contesto, _azione) => {
    const correzioni = riparazioni(contesto.registro)
    if (correzioni.length === 0) return conMessaggio('Non c’è niente da riparare.', 'info')
    const collezioni = [...new Set(correzioni.flatMap((c) => c.collezioni))]
    // Tutte dentro una modifica sola: i file si riscrivono una volta e le
    // correzioni si vedono l'una con l'altra, invece di partire ognuna dallo
    // stato di prima.
    return contesto.modifica((r) => {
      for (const correzione of correzioni) correzione.applica(r)
    }, collezioni)
  },

  'sistema.apriCartella': async (_contesto, _azione) => {
    // La cartella che contiene il documento, dove lo si vede accanto alla sua
    // gemella. Aprire quella dell'anno mostrerebbe solo le bozze della posta:
    // i documenti stanno dentro il file, e per tirarli fuori c'è «Estrai i
    // documenti dell'anno».
    const cartella = cartellaDocumento() ?? cartellaAnno()
    if (!cartella) return rifiuta('Nessuna cartella di lavoro aperta.')
    await apparato.comandi.esegui('apparato.mostraNellaCartella', cartella)
    return fatto
  },

  /**
   * Lo zoom della finestra, di un passo per volta.
   *
   * `fuori`: nel registro non cambia niente, è cambiato quanto è grande.
   * Senza quella nota il giornale segnerebbe una modifica per ogni scalino, e
   * l'automazione si sveglierebbe per una cosa che i dati non li tocca.
   */
  'finestra.zoom': async (_contesto, azione) => {
    await apparato.comandi.esegui('apparato.zoom', azione.verso)
    return fuori
  },

  'finestra.schermoIntero': async (_contesto, _azione) => {
    await apparato.comandi.esegui('apparato.finestraIntera')
    return fuori
  },

  /**
   * Chiude il registro.
   *
   * Nessuna conferma, e non è una dimenticanza: il documento si salva da sé a
   * ogni modifica — è la promessa su cui tutto il registro è costruito — e una
   * domanda «salvare prima di uscire?» prometterebbe che ci sia qualcosa da
   * perdere.
   */
  'programma.esci': async (_contesto, _azione) => {
    await apparato.comandi.esegui('registroDocenti.esci')
    return fuori
  },

  /**
   * Compone il numero con il programma che il sistema tiene per le chiamate.
   *
   * L'indirizzo lo costruisce l'host e non il webview, e il numero ripassa
   * comunque dalla dogana: quel che arriva di là è un pezzo di anagrafica, e
   * un'anagrafica la scrive una persona. Ridotto a cifre e a un `+`, non c'è
   * modo che diventi un altro indirizzo — «tel:» più quel che si vuole — e
   * quel che si consegna alla shell è sempre e solo una telefonata.
   *
   * `invariato`: nel registro non cambia niente, si è solo alzata la cornetta.
   */
  'sistema.chiama': async (_contesto, azione) => {
    const numero = numeroComponibile(azione.numero)
    if (!numero) return rifiuta(`«${azione.numero}» non è un numero da comporre.`)

    const modo = modoChiamata(scelta('telefono'))
    const indirizzo = indirizzoChiamata(modo, numero)
    if (!indirizzo) {
      return conMessaggio(
        `Le chiamate dal registro sono spente: si accendono ${VOCE_RECAPITI}.`,
        'info',
        { invariato: true },
      )
    }

    const aperto = await apparato.esterno.apri(apparato.Uri.parse(indirizzo))
    if (!aperto) {
      return rifiuta(`Nessun programma ha risposto a «${modo}:». Si sceglie quale ${VOCE_RECAPITI}.`)
    }
    return fuori
  },

  /**
   * Apre il programma di posta su un messaggio nuovo a quell'indirizzo.
   *
   * Vuoto: niente oggetto e niente corpo. Non è una comunicazione della
   * classe — quelle le scrive il registro, con la sua firma e i suoi
   * destinatari — è una riga a una persona sola, e chi la scrive sa già che
   * cosa scriverci.
   *
   * Quale programma lo dicono le impostazioni. «Outlook» non passa da
   * `mailto:` ma chiama l'eseguibile: è l'unico modo di aprire Outlook su una
   * macchina dove il predefinito è un altro, ed è il caso che si incontra —
   * scrivere da un programma diverso vuol dire scrivere da un'altra casella,
   * e chi riceve risponde lì.
   *
   * Non riuscendoci si ripiega sul predefinito invece di fermarsi: il
   * messaggio da scrivere c'è comunque, e la ragione per cui si è aperto
   * l'altro programma si dice a voce bassa.
   */
  'sistema.scrivi': async (_contesto, azione) => {
    const indirizzo = indirizzoScrivibile(azione.indirizzo)
    if (!indirizzo) return rifiuta(`«${azione.indirizzo}» non è un indirizzo di posta.`)

    const modo = modoPosta(scelta('posta'))
    if (modo === 'nessuno') {
      return conMessaggio(
        `Scrivere dal registro è spento: si accende ${VOCE_RECAPITI}.`,
        'info',
        { invariato: true },
      )
    }

    if (modo === 'outlook' && (await apriConOutlook(indirizzo))) return fuori

    const dove =
      modo === 'outlookWeb' ? composizioneOutlookWeb(indirizzo) : indirizzoMailto(indirizzo)
    const aperto = await apparato.esterno.apri(apparato.Uri.parse(dove))
    if (!aperto) return rifiuta('Nessun programma di posta ha risposto.')
    if (modo === 'outlook') {
      return conMessaggio(
        'Outlook non si è aperto: ho scritto con il programma predefinito. Il percorso di '
          + `OUTLOOK.EXE si indica ${VOCE_RECAPITI}.`,
        'avviso',
        { invariato: true },
      )
    }
    return fuori
  },

  /**
   * Prova il collegamento con la posta e lo racconta.
   *
   * Non manda niente: bussa alla casella, si fa dire di chi è, e chiude. È la
   * risposta a «collegato, sì, ma a che cosa?» — una domanda a cui fin qui si
   * poteva rispondere solo mandando una mail vera a qualcuno.
   */
  'posta.prova': async (_contesto, _azione) => {
    const stato = await provaCollegamento()
    // Guardare `collegato` era l'unica cosa che mancava, e senza di essa la
    // busta usciva `ok: true` anche quando il server rifiutava: chi non e' il
    // pannello — il condotto, la riga di comando, uno script — leggeva
    // «riuscito» e concludeva che la posta funziona.
    if (!stato.collegato) return rifiutaCon('non-disponibile', stato.testo)
    // `invariato` perché non è successo niente al registro: si è solo guardato
    // fuori dalla finestra.
    return conMessaggio(stato.testo, stato.livello, { invariato: true })
  },

  /**
   * Manda una mail di prova, e lo racconta.
   *
   * Questa manda davvero, ed è il punto: `posta.prova` verifica che si entri
   * nella casella e si ferma lì, mentre spedire chiede un permesso diverso e
   * incontra cose — la firma, il formato del corpo, il peso — che si vedono
   * solo con un messaggio che parte. L'indirizzo lo chiede l'host con una
   * finestra del sistema, già riempito con il proprio.
   *
   * `invariato`: nel registro non cambia niente. La mail è uscita, e quello
   * non è un dato del registro.
   */
  'posta.invioProva': async (_contesto, _azione) => {
    const stato = await inviaProva()
    // Chiusa la finestra senza scrivere l'indirizzo: non è un errore, e non
    // c'è niente da raccontare.
    if (!stato) return { ok: true, invariato: true }
    // Questa e' la procedura che dichiara `idempotente: false` «perche' quel
    // che e' uscito non torna indietro»: rispondere `ok` senza saper dire se il
    // messaggio e' partito era la contraddizione piu' costosa delle tre.
    if (!stato.collegato) return rifiutaCon('non-disponibile', stato.testo)
    return conMessaggio(stato.testo, stato.livello, { invariato: true })
  },

  /**
   * Collega la casella: l'host chiede l'indirizzo, fa accedere a Microsoft dal
   * browser, prova, e salva solo se il server accetta.
   *
   * Sta qui e non nel webview perché quel che apre la casella non deve
   * attraversare il ponte: il webview vive in una sandbox e non ha modo di
   * metterlo nel portachiavi, e farcelo passare vorrebbe dire farlo passare
   * per un `postMessage`. Di là torna solo com'è andata.
   *
   * Non è `invariato`: nel registro non è cambiato niente, ma nello stato che
   * il pannello spinge sì — la pastiglia «casella collegata» si accende adesso.
   */
  'posta.collega': async (_contesto, _azione) => {
    const stato = await collegaAccount()
    // Chiuso senza scrivere niente: non è un errore e non è una notizia.
    if (!stato) return { ok: true, invariato: true }
    if (!stato.collegato) return rifiutaCon('non-disponibile', stato.testo)
    return conMessaggio(stato.testo, stato.livello)
  },

  'posta.scollega': async (_contesto, _azione) => {
    const stato = await scollegaAccount()
    return conMessaggio(stato.testo, stato.livello)
  },

  'sistema.messaggio': (_contesto, azione) => {
    const mostra =
      azione.livello === 'errore'
        ? apparato.dialoghi.errore
        : azione.livello === 'avviso'
          ? apparato.dialoghi.avvisa
          : apparato.dialoghi.informa
    void mostra(azione.testo)
    return fatto
  },
} satisfies Parte
