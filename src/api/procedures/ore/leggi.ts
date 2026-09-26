// Un'ora per intero, come si legge aprendola: argomenti, materiali, consuntivo,
// osservazioni, piano. Chi c'era lo dice `ore.appello.leggi`, a parte, per non
// mandare l'appello a chi chiede «che cosa ho fatto giovedì».

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
import { parole } from '../../../domain/words.testi.js'
import { esigiLezione, STATI_LEZIONE } from './common.js'
import { testi } from './ore.testi.js'

const t = () => testi().leggi
const p = () => t().presentazione

export const procedura = definisci({
  nome: 'ore.leggi',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
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
    numero: nullabile(numero({ intero: true, aiuto: () => t().numero })),
    aula: testo(),
    ud: numero({ intero: true }),
    minuti: numero({ intero: true }),
    argomenti: testo({ aiuto: () => t().argomenti }),
    materiali: testo(),
    consuntivo: testo({ aiuto: () => t().consuntivo }),
    pianoId: nullabile(testo()),
    piano: testo({ aiuto: () => t().piano }),
    osservazioni: elenco(oggetto({
      tipo: testo({ aiuto: () => t().tipo }),
      testo: testo(),
      // Le osservazioni di classe non hanno una persona: `null` vuol dire
      // «riguarda l'ora», non «non si sa di chi è».
      allievoId: nullabile(testo()),
      chi: testo({ aiuto: () => t().chi }),
      ora: testo(),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'corso', etichetta: () => p().corso },
          { campo: 'data', etichetta: () => parole().giorno, formato: 'data' },
          { campo: 'inizio', etichetta: () => p().dalle, formato: 'ora' },
          { campo: 'fine', etichetta: () => p().alle, formato: 'ora' },
          { campo: 'stato', etichetta: () => p().stato },
          { campo: 'numero', etichetta: () => p().quantesima, formato: 'numero' },
          { campo: 'aula', etichetta: () => parole().aula },
          { campo: 'piano', etichetta: () => p().pianoAssegnato },
          { campo: 'argomenti', etichetta: () => p().argomenti },
          { campo: 'materiali', etichetta: () => p().materiali },
          { campo: 'consuntivo', etichetta: () => p().consuntivo },
        ],
      },
      {
        tipo: 'tabella',
        da: 'osservazioni',
        titolo: () => p().annotazioni,
        colonne: [
          { campo: 'chi', testo: () => parole().chi },
          { campo: 'tipo', testo: () => p().genere },
          { campo: 'testo', testo: () => p().annotazione },
          { campo: 'ora', testo: () => parole().ora, formato: 'ora' },
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
      ud: contaUd(lezione, r.impostazioni.minutiUd),
      minuti: minutiEffettivi(lezione),
      argomenti: lezione.argomenti ?? '',
      materiali: lezione.materiali ?? '',
      consuntivo: lezione.consuntivo ?? '',
      pianoId: lezione.pianoId,
      // Il nome del piano come lo mostra la pagina («3ª lezione»), non l'id.
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
