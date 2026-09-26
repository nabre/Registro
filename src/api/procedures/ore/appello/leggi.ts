import { contaUd, fineLezione, inizioLezione } from '../../../../domain/calculations.js'
import {
  classeDellaLezione,
  corsoDellaLezione,
  materiaDellaLezione,
} from '../../../../domain/courses.js'
import { corto } from '../../../../domain/lexicon.js'
import { lessico } from '../../../../domain/lexicon.testi.js'
import { parole } from '../../../../domain/words.testi.js'
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
import { testi } from '../ore.testi.js'

const t = () => testi().appello.leggi
const p = () => t().presentazione

/**
 * L'appello di un'ora, con i nomi accanto agli id: il modello non ha altro
 * modo di risolvere un id di persona. Esce anche di quale ora si tratta
 * (corso, classe, materia, orario, stato), per rispondere senza altre buste.
 */
export const procedura = definisci({
  nome: 'ore.appello.leggi',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({ lezioneId: identificatore() }),
  uscita: oggetto({
    lezioneId: testo(),
    data: testo(),
    inizio: nullabile(testo({ aiuto: () => t().inizio })),
    fine: nullabile(testo({ aiuto: () => t().fine })),
    stato: scelta(STATI_LEZIONE, { aiuto: () => testi().comune.statiLezione }),
    corsoId: testo(),
    corso: testo({ aiuto: () => testi().comune.corsoComeSiLegge }),
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
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'corso', etichetta: () => p().oraDi },
          { campo: 'data', etichetta: () => parole().giorno, formato: 'data' },
          { campo: 'inizio', etichetta: () => p().dalle, formato: 'ora' },
          { campo: 'fine', etichetta: () => p().alle, formato: 'ora' },
          { campo: 'stato', etichetta: () => p().stato },
          { campo: 'ud', etichetta: () => corto(lessico().unitaDidattica), formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'righe',
        colonne: [
          { campo: 'cognome', testo: () => parole().cognome },
          { campo: 'nome', testo: () => parole().nome },
          // Uno stato per UD, in fila: dice chi se n'è andato a metà ora.
          { campo: 'stati', testo: () => p().appello, formato: 'elenco' },
          { campo: 'minuti', testo: () => p().minutiDiRitardo, formato: 'numero' },
          { campo: 'nota', testo: () => p().nota },
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
    // I nomi si indicizzano una volta sola.
    const nomi = new Map((classe?.allievi ?? []).map((a) => [a.id, a]))

    return {
      lezioneId: lezione.id,
      data: lezione.data,
      inizio: inizioLezione(lezione),
      fine: fineLezione(lezione),
      stato: lezione.stato,
      corsoId: lezione.corsoId,
      // Classe e materia per esteso, non il `titolo` del corso, che può essere vuoto.
      corso: [classe?.nome, materia?.nome].filter(Boolean).join(' — ') || corso?.titolo || '—',
      classeId: classe?.id ?? '',
      classe: classe?.nome ?? '—',
      materia: materia?.nome ?? '—',
      // Le UD dell'ora, non quelle della prima riga, che può essere corta dopo una
      // modifica dell'orario.
      ud: contaUd(lezione, r.impostazioni.minutiUd),
      righe: lezione.presenze.map((presenza) => {
        const allievo = nomi.get(presenza.allievoId)
        return {
          allievoId: presenza.allievoId,
          // Chi non è più iscritto resta nell'appello dell'ora in cui c'era: si dice che
          // manca, invece di una cella vuota.
          cognome: allievo?.cognome ?? t().nonPiuInClasse,
          nome: allievo?.nome ?? '',
          stati: presenza.stati,
          ...(presenza.minuti === undefined ? {} : { minuti: presenza.minuti }),
          ...(presenza.nota === undefined ? {} : { nota: presenza.nota }),
        }
      }),
    }
  },
})
