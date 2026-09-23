// Le porzioni di una pagina: le linguette che stanno dentro una vista.
//
// Una pagina non è sempre una schermata sola. Il registro dell'ora ha tre
// linguette — amministrazione, lezione, annotazioni — il calendario quattro
// modi, la pagina Documenti tre schede, la mappa tre. Quale sia aperta è una
// domanda che si fanno in due: la vista, che la disegna, e il percorso in
// fondo allo schermo, che la dice.
//
// Le parole con cui si chiamano stanno qui, una volta sola. Stavano sparse —
// i modi del calendario e le schede dei documenti dentro l'elenco dei comandi,
// le linguette dell'ora dentro la vista che le disegna — e un percorso che se
// le riscrivesse sarebbe la seconda risposta alla domanda «come si chiama
// questa linguetta»: quella che resta indietro il giorno in cui la prima
// cambia.

import { NOMI_GENERE } from '../domain/map.js'
import { Molti, PERSONE, PIF, SCUOLA, Uno } from '../domain/lexicon.js'
import type { NomeIcona } from './components/icons.js'
import {
  classeDellAllievo,
  stato,
  type ModoCalendario,
  type SchedaDocumenti,
  type FiltroTodo,
  type SchedaLezione,
  type SchedaPersona,
} from './state.js'

/** Le tre linguette del registro dell'ora. */
export const PORZIONI_LEZIONE: ReadonlyArray<{
  valore: SchedaLezione
  testo: string
  simbolo: NomeIcona
}> = [
  { valore: 'amministrazione', testo: 'Amministrazione', simbolo: 'todo' },
  { valore: 'lezione', testo: 'Lezione', simbolo: 'piano' },
  { valore: 'annotazioni', testo: 'Annotazioni', simbolo: 'matita' },
]

/**
 * Le tre linguette della scheda di una persona.
 *
 * I nomi vengono dal lessico dove il lessico ce l'ha: cambiando «docente di
 * classe» o «materia» in una riga sola, cambia anche qui.
 */
const PORZIONI_PERSONA: ReadonlyArray<{
  valore: SchedaPersona
  testo: string
  simbolo: NomeIcona
}> = [
  { valore: 'anagrafica', testo: 'Anagrafica', simbolo: 'utente' },
  { valore: 'docenteClasse', testo: Uno(PERSONE.docenteClasse), simbolo: 'classi' },
  { valore: 'materie', testo: Molti(SCUOLA.materia), simbolo: 'libro' },
]

/**
 * Le linguette che valgono per una persona.
 *
 * Quella del docente di classe compare solo sulle classi in cui lo si è.
 * Mostrarla sempre voleva dire una linguetta che si preme e sotto la quale
 * c'è scritto che non è roba tua: un posto dove andare per scoprire di non
 * doverci andare. Chi non è docente di classe di nessuna classe non la vede
 * mai, e non è una mancanza — è che quel mestiere non lo fa.
 *
 * Le annotazioni restano dove sono: sono di chi insegna, non del docente di
 * classe, e stanno sotto le materie quando la linguetta di mezzo non c'è.
 */
export function porzioniPersona (docenteDiClasse: boolean) {
  return PORZIONI_PERSONA.filter((p) => p.valore !== 'docenteClasse' || docenteDiClasse)
}

/**
 * La linguetta aperta davvero: quella scelta, se per questa persona esiste.
 *
 * Chi guardava una classe di cui è docente e poi ne apre una di cui non lo è,
 * si porta dietro una scelta che l’ non vale: senza questa riga vedrebbe una
 * scheda vuota sotto una linguetta che non c'è.
 */
export function porzionePersona (docenteDiClasse: boolean): SchedaPersona {
  const valide = porzioniPersona(docenteDiClasse)
  return valide.some((p) => p.valore === stato.schedaPersona) ? stato.schedaPersona : 'anagrafica'
}

/** I modi in cui il calendario mostra le stesse ore. */
export const MODI_CALENDARIO: ReadonlyArray<{
  valore: ModoCalendario
  testo: string
  simbolo: NomeIcona
  aiuto: string
}> = [
  {
    valore: 'settimana',
    testo: 'Settimana',
    simbolo: 'settimana',
    aiuto: 'Le ore sulla griglia dei giorni, alte quanto durano',
  },
  {
    valore: 'mese',
    testo: 'Mese',
    simbolo: 'mese',
    aiuto: 'Una striscia di settimane che scorre senza fine',
  },
  {
    valore: 'anno',
    testo: 'Anno',
    simbolo: 'calendario',
    aiuto: 'L’anno intero in un foglio: vacanze, semestri e quanti corsi per giorno',
  },
  {
    valore: 'agenda',
    testo: 'Agenda',
    simbolo: 'agenda',
    aiuto: 'Le ore in elenco, una riga ciascuna',
  },
]

/** Le tre schede della pagina Documenti: di che cosa si stanno guardando i fogli. */
export const SCHEDE_DOCUMENTI: ReadonlyArray<{
  valore: SchedaDocumenti
  nome: string
  simbolo: NomeIcona
  aiuto: string
}> = [
  {
    valore: 'corso',
    nome: 'Corso',
    simbolo: 'libro',
    aiuto: 'Presenze, valutazioni, verbali, prove, piani, fascicolo: i fogli di tutta la classe',
  },
  {
    valore: 'lezioni',
    nome: 'Lezioni',
    simbolo: 'presa',
    aiuto: 'Un riquadro per ogni ora: il suo verbale, il suo piano, le prove di quel giorno',
  },
  {
    valore: 'allievi',
    nome: Molti(PIF),
    simbolo: 'classi',
    aiuto: `Una scheda per ogni ${PIF.singolare}: profitto, presenze, annotazioni`,
  },
]

/**
 * I tre modi di guardare le pendenze, con che cosa ciascuno tiene.
 *
 * «Portare le fotocopie» e «esercizi 4–7» sono due liste diverse con due
 * momenti diversi: la prima si guarda la sera prima, la seconda entrando in
 * classe. Il filtro vale per le consegne, che sono le sole cose di cui si possa
 * dire a chi tocca il gesto; prove ferme, recuperi e richieste di firma restano
 * sempre in vista.
 */
export const FILTRI_TODO: ReadonlyArray<{
  valore: FiltroTodo
  testo: string
  simbolo: NomeIcona
  aiuto: string
}> = [
  {
    valore: 'tutte',
    testo: 'Tutte',
    simbolo: 'spunta',
    aiuto: 'Quel che tocca a me e quel che tocca alle classi, insieme',
  },
  {
    valore: 'mie',
    testo: 'Le mie',
    simbolo: 'utente',
    aiuto: 'Solo quel che devo fare io: la lista della sera prima',
  },
  {
    valore: 'classi',
    testo: 'Delle classi',
    simbolo: 'classi',
    aiuto: 'Solo quel che devono portare loro: la lista che si legge entrando in aula',
  },
]

/**
 * I due modi di guardare le pendenze di una classe.
 *
 * Sono lo stesso taglio dei filtri della pagina delle pendenze — a chi tocca il
 * gesto — ridotto a due, perché nella scheda di una classe «delle classi» vorrebbe
 * dire «di questa classe», che è dove si è già. Si parte da tutte: la domanda
 * di chi apre la scheda è come sta la classe, non che cosa tocca a sé.
 */
export const FILTRI_TODO_CLASSE: ReadonlyArray<{
  valore: 'tutte' | 'mie'
  testo: string
  simbolo: NomeIcona
  aiuto: string
}> = [
  {
    valore: 'tutte',
    testo: 'Tutte le consegne',
    simbolo: 'spunta',
    aiuto: 'Quel che tocca a me e quel che tocca alla classe, insieme',
  },
  {
    valore: 'mie',
    testo: 'Consegne personali',
    simbolo: 'utente',
    aiuto: 'Solo quel che devo fare io in questa classe: la lista della sera prima',
  },
]

/** Una porzione detta a chi la deve mostrare: come si chiama e con che segno. */
export interface Porzione {
  testo: string
  simbolo: NomeIcona
}

/**
 * Quali linguette ha la pagina che si ha davanti, aperta compresa.
 *
 * La gemella di `porzioneAttiva()`, e sta accanto a lei per la stessa ragione
 * per cui i nomi delle linguette stanno in questo file: perché siano scritti
 * una volta sola. La legge la veduta dell'assistente — «dove sono» è mezza
 * risposta, «dove posso andare» è l'altra metà — e a chi disegna non serve:
 * ogni vista le sue linguette le elenca già da sé.
 *
 * Le pagine di una schermata sola tornano un elenco vuoto, come
 * `porzioneAttiva()` torna `null`.
 */
export function porzioniDellaVista (): Porzione[] {
  const dette = (voci: ReadonlyArray<{ testo?: string, nome?: string, simbolo: NomeIcona }>) =>
    voci.map((voce) => ({ testo: voce.testo ?? voce.nome ?? '', simbolo: voce.simbolo }))

  switch (stato.vista) {
    case 'lezione':
      return dette(PORZIONI_LEZIONE)
    case 'allievo':
    case 'persone': {
      const classe = classeDellAllievo(stato.allievoId, stato.classeId)
      return dette(porzioniPersona(Boolean(classe?.docenteDiClasse)))
    }
    case 'calendario':
      return dette(MODI_CALENDARIO)
    case 'documenti':
      return dette(SCHEDE_DOCUMENTI)
    case 'mappa':
      return [
        { testo: 'Tutti', simbolo: 'mappa' },
        { testo: NOMI_GENERE.lavoro, simbolo: 'azienda' },
        { testo: NOMI_GENERE.domicilio, simbolo: 'casa' },
      ]
    case 'impostazioni':
      return [
        { testo: 'Il programma', simbolo: 'impostazioni' },
        { testo: 'Il documento', simbolo: 'documento' },
      ]
    default:
      return []
  }
}

/**
 * Qual è la porzione aperta della pagina che si ha davanti.
 *
 * `null` per le pagine che una porzione non ce l'hanno: sono una schermata
 * sola, e il percorso finisce con il loro nome.
 */
export function porzioneAttiva (): Porzione | null {
  switch (stato.vista) {
    case 'lezione': {
      const linguetta = PORZIONI_LEZIONE.find((p) => p.valore === stato.schedaLezione)
      return linguetta ? { testo: linguetta.testo, simbolo: linguetta.simbolo } : null
    }
    // Le due pagine che mostrano la stessa scheda: quella della sola persona e
    // l'elenco con la scheda accanto. La linguetta aperta è la stessa, e il
    // percorso la dice allo stesso modo in tutte e due.
    case 'allievo':
    case 'persone': {
      const classe = classeDellAllievo(stato.allievoId, stato.classeId)
      const quale = porzionePersona(Boolean(classe?.docenteDiClasse))
      const linguetta = PORZIONI_PERSONA.find((p) => p.valore === quale)
      return linguetta ? { testo: linguetta.testo, simbolo: linguetta.simbolo } : null
    }
    case 'calendario': {
      const modo = MODI_CALENDARIO.find((m) => m.valore === stato.modoCalendario)
      return modo ? { testo: modo.testo, simbolo: modo.simbolo } : null
    }
    case 'documenti': {
      const scheda = SCHEDE_DOCUMENTI.find((s) => s.valore === stato.schedaDocumenti)
      return scheda ? { testo: scheda.nome, simbolo: scheda.simbolo } : null
    }
    case 'mappa':
      return stato.schedaMappa === 'tutti'
        ? { testo: 'Tutti', simbolo: 'mappa' }
        : {
            testo: NOMI_GENERE[stato.schedaMappa],
            simbolo: stato.schedaMappa === 'lavoro' ? 'azienda' : 'casa',
          }
    // Delle impostazioni basta di quale metà si tratta. La sezione aperta ha
    // già il suo titolo grande in cima alla colonna, e ripeterlo in fondo allo
    // schermo direbbe una cosa che si sta leggendo in quel momento.
    case 'impostazioni':
      return stato.ambitoImpostazioni === 'documento'
        ? { testo: 'Il documento', simbolo: 'documento' }
        : { testo: 'Il programma', simbolo: 'impostazioni' }
    default:
      return null
  }
}
