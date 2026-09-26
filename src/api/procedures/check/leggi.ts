// La lista di controllo di un corso, per «chi non ha ancora portato il
// modulo?»: ogni colonna porta i nomi di chi manca e il conto.
//
// Chi manca è chi frequenta: le righe comprendono i ritirati con qualcosa di
// spuntato, ma un ritirato non manca, e `fatte` su `totale` conta solo chi
// frequenta.
//
// Il giorno viene dal dominio: una spunta data dentro un'ora ne segue la data.

import { allieviAttivi, nomeCompleto } from '../../../domain/calculations.js'
import {
  allieviDelCheck,
  checkDelCorso,
  dataSpunta,
  fatteDellaColonna,
  spuntaDelCheck,
} from '../../../domain/check.js'
import { classeDelCorso, materiaDelCorso, titoloCorso } from '../../../domain/courses.js'
import { definisci } from '../../contract.js'
import {
  booleano,
  elenco,
  identificatore,
  iso,
  nullabile,
  numero,
  oggetto,
  testo,
} from '../../schemas.js'
import { esigiCorso } from '../common/register.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './check.testi.js'

const t = () => testi().leggi
const p = () => t().presentazione

export const procedura = definisci({
  nome: 'check.leggi',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    corsoId: identificatore({ aiuto: () => t().corsoId }),
  }),
  uscita: oggetto({
    corsoId: testo(),
    corso: testo({ aiuto: () => t().corso }),
    allievi: numero({ intero: true, aiuto: () => t().allievi }),
    colonne: elenco(oggetto({
      id: testo(),
      titolo: testo({ aiuto: () => t().titoloColonna }),
      fatte: numero({ intero: true, aiuto: () => t().fatte }),
      totale: numero({ intero: true, aiuto: () => t().totale }),
      mancano: elenco(testo(), { aiuto: () => t().mancano }),
    }), { aiuto: () => t().colonne }),
    righe: elenco(oggetto({
      allievoId: testo(),
      nome: testo({ aiuto: () => t().nome }),
      attivo: booleano({ aiuto: () => t().attivo }),
      caselle: elenco(oggetto({
        colonnaId: testo(),
        data: nullabile(iso({ aiuto: () => t().data })),
        lezioneId: nullabile(testo({ aiuto: () => t().lezioneId })),
      }), { aiuto: () => t().caselle }),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'corso', etichetta: () => p().corso },
          { campo: 'allievi', etichetta: () => p().frequentano, formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'colonne',
        colonne: [
          { campo: 'titolo', testo: () => parole().cheCosa },
          { campo: 'fatte', testo: () => p().fatte, formato: 'numero' },
          { campo: 'totale', testo: () => p().su, formato: 'numero' },
          { campo: 'mancano', testo: () => p().mancano, formato: 'elenco' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const corso = esigiCorso(ambito, ingresso.corsoId)
    const classe = classeDelCorso(r, corso)
    const check = checkDelCorso(r, corso.id)
    const righe = allieviDelCheck(r, corso.id)
    const attivi = classe ? allieviAttivi(classe) : []
    const colonne = check?.colonne ?? []

    return {
      corsoId: corso.id,
      corso: titoloCorso(classe, materiaDelCorso(r, corso)),
      allievi: attivi.length,
      colonne: colonne.map((colonna) => ({
        id: colonna.id,
        titolo: colonna.titolo,
        fatte: check ? fatteDellaColonna(check, colonna.id, attivi) : 0,
        totale: attivi.length,
        mancano: righe
          .filter((a) => a.attivo && !(check && spuntaDelCheck(check, a.id, colonna.id)))
          .map(nomeCompleto),
      })),
      righe: righe.map((allievo) => ({
        allievoId: allievo.id,
        nome: nomeCompleto(allievo),
        attivo: allievo.attivo,
        caselle: colonne.map((colonna) => {
          const spunta = check ? spuntaDelCheck(check, allievo.id, colonna.id) : null
          return {
            colonnaId: colonna.id,
            data: spunta ? dataSpunta(r, spunta) : null,
            lezioneId: spunta?.lezioneId ?? null,
          }
        }),
      })),
    }
  },
})
