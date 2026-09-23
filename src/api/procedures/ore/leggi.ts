// Un'ora per intero, come si legge aprendola.
//
// `ore.appello.leggi` dice chi c'era; questa dice **che cosa si è fatto**: gli
// argomenti, i materiali, il consuntivo, le osservazioni annotate durante
// l'ora, il piano assegnato. Sono le due metà della stessa pagina, e tenerle in
// una busta sola vorrebbe dire mandare venticinque righe di appello a chi ha
// chiesto «che cosa ho fatto giovedì».

import {
  contaUd, fineLezione, inizioLezione, minutiEffettivi, nomeCompleto,
} from '../../../domain/calculations.js'
import {
  classeDellaLezione,
  materiaDellaLezione,
  nomeDelPiano,
  numeroDellaLezione,
} from '../../../domain/courses.js'
import { definisci } from '../../contract.js'
import {
  elenco,
  identificatore,
  nullabile,
  numero,
  oggetto,
  scelta,
  testo,
} from '../../schemas.js'
import { esigiLezione, STATI_LEZIONE } from './common.js'

export const procedura = definisci({
  nome: 'ore.leggi',
  versione: 1,
  genere: 'lettura',
  titolo: 'Un’ora per intero: argomenti, materiali, consuntivo, osservazioni',
  idempotente: true,
  ingresso: oggetto({ lezioneId: identificatore() }),
  uscita: oggetto({
    id: testo(),
    data: testo(),
    inizio: nullabile(testo()),
    fine: nullabile(testo()),
    stato: scelta(STATI_LEZIONE),
    corsoId: testo(),
    corso: testo(),
    classeId: testo(),
    classe: testo(),
    numero: nullabile(numero({ intero: true, aiuto: 'La quantesima del corso' })),
    aula: testo(),
    ud: numero({ intero: true }),
    minuti: numero({ intero: true }),
    argomenti: testo({ aiuto: 'Che cosa si è fatto' }),
    materiali: testo(),
    consuntivo: testo({ aiuto: 'Com’è andata, scritto a fine ora' }),
    pianoId: nullabile(testo()),
    piano: testo({ aiuto: 'Il piano assegnato, come si chiama' }),
    osservazioni: elenco(oggetto({
      tipo: testo({ aiuto: 'Di che genere è l’annotazione' }),
      testo: testo(),
      // Le osservazioni di classe non hanno una persona: `null` vuol dire
      // «riguarda l'ora», non «non si sa di chi è».
      allievoId: nullabile(testo()),
      chi: testo({ aiuto: 'Di chi è, per esteso. Vuoto quando riguarda l’ora intera' }),
      ora: testo(),
    })),
  }),
  presentazione: {
    titolo: 'L’ora del registro',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'corso', etichetta: 'Corso' },
          { campo: 'data', etichetta: 'Giorno', formato: 'data' },
          { campo: 'inizio', etichetta: 'Dalle', formato: 'ora' },
          { campo: 'fine', etichetta: 'Alle', formato: 'ora' },
          { campo: 'stato', etichetta: 'Stato' },
          { campo: 'numero', etichetta: 'Quantesima', formato: 'numero' },
          { campo: 'aula', etichetta: 'Aula' },
          { campo: 'piano', etichetta: 'Piano assegnato' },
          { campo: 'argomenti', etichetta: 'Argomenti' },
          { campo: 'materiali', etichetta: 'Materiali' },
          { campo: 'consuntivo', etichetta: 'Consuntivo' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'osservazioni',
        titolo: 'Annotazioni dell’ora',
        colonne: [
          { campo: 'chi', testo: 'Chi' },
          { campo: 'tipo', testo: 'Genere' },
          { campo: 'testo', testo: 'Annotazione' },
          { campo: 'ora', testo: 'Ora', formato: 'ora' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const lezione = esigiLezione(ambito, ingresso.lezioneId)
    const classe = classeDellaLezione(r, lezione)
    const materia = materiaDellaLezione(r, lezione)
    const piano = r.piani.find((p) => p.id === lezione.pianoId) ?? null
    const nomi = new Map((classe?.allievi ?? []).map((a) => [a.id, nomeCompleto(a)]))

    return {
      id: lezione.id,
      data: lezione.data,
      inizio: inizioLezione(lezione),
      fine: fineLezione(lezione),
      stato: lezione.stato,
      corsoId: lezione.corsoId,
      corso: [classe?.nome, materia?.nome].filter(Boolean).join(' — ') || '—',
      classeId: classe?.id ?? '',
      classe: classe?.nome ?? '—',
      numero: numeroDellaLezione(r, lezione),
      aula: lezione.aula ?? '',
      ud: contaUd(lezione),
      minuti: minutiEffettivi(lezione),
      argomenti: lezione.argomenti ?? '',
      materiali: lezione.materiali ?? '',
      consuntivo: lezione.consuntivo ?? '',
      pianoId: lezione.pianoId,
      // Il nome che la pagina gli dà — «3ª lezione», «bozza del 12.09» — e non
      // l'id: è quel che chi insegna legge nell'elenco dei piani.
      piano: piano ? nomeDelPiano(r, piano) : '',
      osservazioni: lezione.osservazioni.map((osservazione) => ({
        tipo: osservazione.tipo,
        testo: osservazione.testo,
        allievoId: osservazione.allievoId,
        chi: osservazione.allievoId ? nomi.get(osservazione.allievoId) ?? '—' : '',
        ora: osservazione.ora ?? '',
      })),
    }
  },
})
