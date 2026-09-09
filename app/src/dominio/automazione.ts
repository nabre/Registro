// Quando i PDF di un corso vanno rifatti, e quelli di quale corso.
//
// Un documento nella cartella è una fotografia: nasce giusto e invecchia da
// solo. Basta un voto messo o un appello corretto perché il foglio dica una
// cosa e il registro un'altra, e la differenza non si vede — un PDF vecchio
// non ha l'aria di essere vecchio, e chi lo apre non ha modo di sapere che
// nel frattempo è cambiato qualcosa. L'unica difesa è rifarlo quando i dati
// cambiano, e per farlo bisogna sapere due cose: se si deve, e per chi.
//
// Il «per chi» sta qui e non fra le azioni perché è una domanda sul registro —
// quale corso tocca questa modifica — e la risposta si prova senza aprire
// un'applicazione intorno.

import { corsiDellaClasse } from './corsi.js'
import type { QuandoRifarePdf, Registro } from './modelli.js'

/** I valori ammessi, in ordine da meno a più automatico: serve anche al modulo. */
export const QUANDO_RIFARE_PDF: QuandoRifarePdf[] = ['mai', 'chiusura', 'sempre']

/** Come si chiamano nell'interfaccia, e che cosa promettono. */
export const MODI_PDF: Array<{ valore: QuandoRifarePdf, nome: string, spiegazione: string }> = [
  {
    valore: 'mai',
    nome: 'Solo a mano',
    spiegazione:
      'I documenti si rifanno con i pulsanti di questa pagina. Quel che sta nella cartella ' +
      'resta com’era finché non lo si chiede.',
  },
  {
    valore: 'chiusura',
    nome: 'Quando si chiude un’ora',
    spiegazione:
      'Segnando un’ora come svolta si rifanno il suo verbale e i documenti del corso: è il ' +
      'momento in cui i dati di quell’ora sono completi.',
  },
  {
    valore: 'sempre',
    nome: 'A ogni modifica',
    spiegazione:
      'Come sopra, e in più a ogni cambiamento che tocca un corso — un voto, un appello, un ' +
      'allievo — poco dopo che si è smesso di scrivere.',
  },
]

/**
 * Da che cosa si capisce quale corso è stato toccato.
 *
 * Non sono i campi di un'azione in particolare: sono i nomi che il protocollo
 * usa dappertutto per dire «di che cosa stiamo parlando». Un'azione che non ne
 * porta nessuno non riguarda un corso — le impostazioni, la proiezione, un
 * documento del fascicolo — e non fa rifare niente.
 */
export interface Riferimenti {
  corsoId?: string | null
  lezioneId?: string | null
  valutazioneId?: string | null
  pianoId?: string | null
  classeId?: string | null
  allievoId?: string | null
}

/**
 * I corsi i cui documenti una modifica rende vecchi.
 *
 * Si parte dal riferimento più stretto: il corso, se lo si sa, è quello e
 * basta. Una lezione, una valutazione o un piano dicono il loro corso. Una
 * classe o un allievo ne toccano tutti — cambiare il cognome di qualcuno
 * rifà la sua riga su ogni foglio di ogni materia — ed è il caso in cui
 * rifare tutto costa, ma rifare a metà lascia in giro fogli con il nome
 * vecchio.
 *
 * Un id che non si trova non torna «tutti»: torna niente. Cancellare una
 * lezione arriva qui quando quella lezione non c'è più, e in quel caso è
 * l'azione stessa a dover dire il corso.
 */
export function corsiDaRifare (registro: Registro, riferimenti: Riferimenti): string[] {
  const unico = (id: string | null | undefined): string[] =>
    id && registro.corsi.some((c) => c.id === id) ? [id] : []

  if (riferimenti.corsoId) return unico(riferimenti.corsoId)

  if (riferimenti.lezioneId) {
    const lezione = registro.lezioni.find((l) => l.id === riferimenti.lezioneId)
    return unico(lezione?.corsoId)
  }
  if (riferimenti.valutazioneId) {
    const momento = registro.valutazioni.find((v) => v.id === riferimenti.valutazioneId)
    return unico(momento?.corsoId)
  }
  if (riferimenti.pianoId) {
    const piano = registro.piani.find((p) => p.id === riferimenti.pianoId)
    return unico(piano?.corsoId)
  }

  const classeId =
    riferimenti.classeId ??
    (riferimenti.allievoId
      ? registro.classi.find((c) => c.allievi.some((a) => a.id === riferimenti.allievoId))?.id ??
        null
      : null)
  if (!classeId) return []
  return corsiDellaClasse(registro, classeId).map((corso) => corso.id)
}
