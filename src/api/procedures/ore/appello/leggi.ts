import { contaUd, fineLezione, inizioLezione } from '../../../../domain/calculations.js'
import {
  classeDellaLezione,
  corsoDellaLezione,
  materiaDellaLezione,
} from '../../../../domain/courses.js'
import { definisci } from '../../../contract.js'
import {
  elenco,
  identificatore,
  nullabile,
  numero,
  oggetto,
  opzionale,
  scelta,
  testo,
} from '../../../schemas.js'
import { esigiLezione, STATI_LEZIONE } from '../common.js'
import { STATI_APPELLO } from '../../common/rollCall.js'

/**
 * L'appello di un'ora, con **i nomi accanto agli id**.
 *
 * Tornava `allievoId` e basta, e non era un'economia: chi chiama di qui è il
 * modello dell'assistente, a cui è vietato inventare un nome e che non ha un
 * secondo attrezzo per risolvere un id di persona. «Chi era assente?» riceveva
 * `all-0004`, e la risposta onesta diventava «non lo so».
 *
 * Insieme ai nomi esce anche **di quale ora si tratta** — corso, classe,
 * materia, l'orario, com'è andata — cioè quel che serve per scrivere una
 * risposta che si legge senza rimettere in fila tre buste. Sono dati che la
 * procedura ha già in mano: la lezione ce l'ha, il corso è a un salto.
 */
export const procedura = definisci({
  nome: 'ore.appello.leggi',
  versione: 1,
  genere: 'lettura',
  titolo: 'L’appello di un’ora, riga per riga, con i nomi di chi c’era',
  idempotente: true,
  ingresso: oggetto({ lezioneId: identificatore() }),
  uscita: oggetto({
    lezioneId: testo(),
    data: testo(),
    inizio: nullabile(testo({ aiuto: 'L’ora in cui comincia: «08:10»' })),
    fine: nullabile(testo({ aiuto: 'L’ora in cui finisce' })),
    stato: scelta(STATI_LEZIONE, { aiuto: 'Pianificata, svolta o annullata' }),
    corsoId: testo(),
    corso: testo({ aiuto: 'Come si legge: «I MEC A — Matematica»' }),
    classeId: testo(),
    classe: testo(),
    materia: testo(),
    ud: numero({ intero: true }),
    righe: elenco(oggetto({
      allievoId: testo(),
      cognome: testo(),
      nome: testo(),
      stati: elenco(scelta(STATI_APPELLO)),
      minuti: opzionale(numero({ intero: true })),
      nota: opzionale(testo()),
    })),
  }),
  presentazione: {
    titolo: 'L’appello dell’ora',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'corso', etichetta: 'Ora di' },
          { campo: 'data', etichetta: 'Giorno', formato: 'data' },
          { campo: 'inizio', etichetta: 'Dalle', formato: 'ora' },
          { campo: 'fine', etichetta: 'Alle', formato: 'ora' },
          { campo: 'stato', etichetta: 'Stato' },
          { campo: 'ud', etichetta: 'UD', formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'righe',
        colonne: [
          { campo: 'cognome', testo: 'Cognome' },
          { campo: 'nome', testo: 'Nome' },
          // Uno stato per UD, in fila: «presente, assente» dice quel che una
          // sola parola non direbbe — chi se n'è andato a metà ora.
          { campo: 'stati', testo: 'Appello', formato: 'elenco' },
          { campo: 'minuti', testo: 'Minuti di ritardo', formato: 'numero' },
          { campo: 'nota', testo: 'Nota' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const lezione = esigiLezione(ambito, ingresso.lezioneId)
    const classe = classeDellaLezione(r, lezione)
    const materia = materiaDellaLezione(r, lezione)
    const corso = corsoDellaLezione(r, lezione)
    // I nomi si cercano una volta sola: una classe da venticinque scandita per
    // ogni riga dell'appello sono seicento confronti per una busta che si
    // legge in un colpo d'occhio.
    const nomi = new Map((classe?.allievi ?? []).map((a) => [a.id, a]))

    return {
      lezioneId: lezione.id,
      data: lezione.data,
      inizio: inizioLezione(lezione),
      fine: fineLezione(lezione),
      stato: lezione.stato,
      corsoId: lezione.corsoId,
      // Classe e materia scritte per esteso e non il `titolo` del corso: quello
      // è un campo che chi apre un corso può lasciare vuoto, e una risposta che
      // dice «— » invece del nome della classe non si può usare.
      corso: [classe?.nome, materia?.nome].filter(Boolean).join(' — ') || corso?.titolo || '—',
      classeId: classe?.id ?? '',
      classe: classe?.nome ?? '—',
      materia: materia?.nome ?? '—',
      // Le UD dell'ora, non quelle della prima riga: un'ora senza appello ne ha
      // lo stesso, e una riga rimasta corta da una modifica dell'orario non è
      // la misura dell'ora — è una riga da allungare.
      ud: contaUd(lezione),
      righe: lezione.presenze.map((presenza) => {
        const allievo = nomi.get(presenza.allievoId)
        return {
          allievoId: presenza.allievoId,
          // Chi non è più iscritto resta nell'appello dell'ora in cui c'era, e
          // il suo nome non si trova più nella classe: si dice che manca invece
          // di lasciare una cella vuota che sembra un guasto.
          cognome: allievo?.cognome ?? '(non più in classe)',
          nome: allievo?.nome ?? '',
          stati: presenza.stati,
          ...(presenza.minuti === undefined ? {} : { minuti: presenza.minuti }),
          ...(presenza.nota === undefined ? {} : { nota: presenza.nota }),
        }
      }),
    }
  },
})
