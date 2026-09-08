// Quel che non appartiene a nessuna area in particolare: le impostazioni, le
// esportazioni, le riparazioni e i comandi che parlano con VS Code.

import * as vscode from 'vscode'

import { nomeFileArchivio, percorsoEsportazione } from '../dati/archiviazione.js'
import { csvPresenze, csvValutazioni, scriviGenerato, testoLezione } from '../dati/esportazioni.js'
import { cartellaAnno, cartellaDati } from '../dati/percorsi.js'
import { collegaAccount, provaCollegamento, scollegaAccount } from '../dati/posta.js'
import { dataNelNome } from '../dominio/date.js'
import {
  classeDelCorsoId,
  classeDellaLezione,
  materiaDelCorso,
  registroDelCorso,
} from '../dominio/corsi.js'
import { riparazioni } from '../dominio/riparazioni.js'
import { normalizzaImpostazioni } from '../dominio/validazione.js'
import { conMessaggio, fatto, rifiuta, type Parte } from './contesto.js'

export const sistema = {
  'impostazioni.salva': (contesto, azione) => {
    return contesto.modifica((r) => {
      r.impostazioni = normalizzaImpostazioni(azione.impostazioni)
    }, ['registro'])
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
      percorsoEsportazione(
        classe.nome,
        materiaDelCorso(contesto.registro, corso)?.nome ?? corso.titolo,
        nomeFileArchivio(classe.nome, null, 'Valutazioni', periodo, 'csv'),
      ),
      contenuto,
    )
    if (file) await vscode.window.showTextDocument(file, { preview: false })
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
      periodo,
    )
    const file = await scriviGenerato(
      percorsoEsportazione(
        classe.nome,
        materiaDelCorso(contesto.registro, corso)?.nome ?? corso.titolo,
        nomeFileArchivio(classe.nome, null, 'Presenze', periodo, 'csv'),
      ),
      contenuto,
    )
    if (file) await vscode.window.showTextDocument(file, { preview: false })
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
    const corso = contesto.registro.corsi.find((c) => c.id === lezione.corsoId) ?? null
    const nomeClasse = classe?.nome ?? 'senza classe'
    const file = await scriviGenerato(
      percorsoEsportazione(
        nomeClasse,
        materiaDelCorso(contesto.registro, corso)?.nome ?? corso?.titolo ?? null,
        nomeFileArchivio(nomeClasse, null, 'Verbali', dataNelNome(lezione.data), 'md'),
      ),
      contenuto,
    )
    if (file) await vscode.window.showTextDocument(file, { preview: false })
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
    // Quella dell'anno in uso: è lì che stanno i file di cui si sta parlando.
    const cartella = cartellaAnno() ?? cartellaDati()
    if (!cartella) return rifiuta('Nessuna cartella di lavoro aperta.')
    await vscode.commands.executeCommand('revealFileInOS', cartella)
    return fatto
  },

  /**
   * Prova il collegamento con la posta e lo racconta.
   *
   * Non manda niente: apre la sessione di Outlook, legge di chi è la casella e
   * chiude. È la risposta a «collegato, sì, ma a che cosa?» — una domanda a
   * cui fin qui si poteva rispondere solo mandando una mail vera a qualcuno.
   */
  'posta.prova': async (_contesto, _azione) => {
    const stato = await provaCollegamento()
    // `invariato` perché non è successo niente al registro: si è solo guardato
    // fuori dalla finestra.
    return conMessaggio(stato.testo, stato.livello, { invariato: true })
  },

  /**
   * Collega la casella: l'host chiede l'indirizzo e la password, prova, e
   * salva solo se il server accetta.
   *
   * Sta qui e non nel webview perché la password non deve attraversare il
   * ponte: il webview vive in una sandbox e non ha modo di metterla nel
   * portachiavi, e farcela passare vorrebbe dire farla passare per un
   * `postMessage`. Di là torna solo com'è andata.
   *
   * Non è `invariato`: nel registro non è cambiato niente, ma nello stato che
   * il pannello spinge sì — la pastiglia «casella collegata» si accende adesso.
   */
  'posta.collega': async (_contesto, _azione) => {
    const stato = await collegaAccount()
    // Chiuso senza scrivere niente: non è un errore e non è una notizia.
    if (!stato) return { ok: true, invariato: true }
    return conMessaggio(stato.testo, stato.livello)
  },

  'posta.scollega': async (_contesto, _azione) => {
    const stato = await scollegaAccount()
    return conMessaggio(stato.testo, stato.livello)
  },

  'sistema.messaggio': (_contesto, azione) => {
    const mostra =
      azione.livello === 'errore'
        ? vscode.window.showErrorMessage
        : azione.livello === 'avviso'
          ? vscode.window.showWarningMessage
          : vscode.window.showInformationMessage
    void mostra(azione.testo)
    return fatto
  },
} satisfies Parte
