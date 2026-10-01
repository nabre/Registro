// La lezione da compilare / da fare nel cruscotto.
// Mostra la prima ora che presenta buchi (es. senza appello o da segnare) oppure la prossima a calendario.

import {
  classeDellaLezione,
  corsoDellaLezione,
  materiaDellaLezione,
} from '#core/dominio/courses.js'
import { adesso, oggi } from '#core/dominio/dates.js'
import { cosaManca, diagnosiLezione, oraDaCompilare } from '#core/dominio/dashboard.js'
import { fineLezione, inizioLezione } from '#core/dominio/calculations.js'
import { definisci } from '#contract/contract.js'
import {
  booleano,
  elenco,
  iso,
  nullabile,
  oggetto,
  opzionale,
  testo,
} from '#contract/schemas.js'
import { parole } from '#core/dominio/words.testi.js'
import { testi } from './ore.testi.js'

const t = () => testi().cruscotto
const p = () => t().presentazione

export const procedura = definisci({
  nome: 'ore.cruscotto',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    oggi: opzionale(iso({ aiuto: () => t().oggi })),
    ora: opzionale(testo({
      modello: /^([01]\d|2[0-3]):[0-5]\d$/,
      aiuto: () => t().ora,
      esempio: '08:15',
    })),
  }),
  uscita: oggetto({
    trovata: booleano(),
    id: nullabile(testo()),
    corsoId: nullabile(testo()),
    corso: nullabile(testo()),
    classeId: nullabile(testo()),
    classe: nullabile(testo()),
    materiaId: nullabile(testo()),
    materia: nullabile(testo()),
    data: nullabile(testo()),
    inizio: nullabile(testo()),
    fine: nullabile(testo()),
    aula: nullabile(testo()),
    manca: booleano(),
    motivoMancanza: elenco(testo()),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'corso', etichetta: () => p().corso },
          { campo: 'classe', etichetta: () => p().classe },
          { campo: 'materia', etichetta: () => p().materia },
          { campo: 'data', etichetta: () => parole().giorno, formato: 'data' },
          { campo: 'inizio', etichetta: () => p().orario, formato: 'ora' },
          { campo: 'aula', etichetta: () => parole().aula },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const giorno = ingresso.oggi ?? oggi()
    const orario = ingresso.ora ?? adesso()

    const trovata = oraDaCompilare(r, r.lezioni, giorno, orario)
    if (!trovata) {
      return {
        trovata: false,
        id: null,
        corsoId: null,
        corso: null,
        classeId: null,
        classe: null,
        materiaId: null,
        materia: null,
        data: null,
        inizio: null,
        fine: null,
        aula: null,
        manca: false,
        motivoMancanza: [],
      }
    }

    const { lezione, manca } = trovata
    const c = corsoDellaLezione(r, lezione)
    const cl = classeDellaLezione(r, lezione)
    const m = materiaDellaLezione(r, lezione)

    const diag = diagnosiLezione(r, lezione, 1, giorno, orario)
    const motivi = cosaManca(diag)

    const nomeDelCorso = [cl?.nome, m?.nome].filter(Boolean).join(' — ') || c?.titolo || '—'

    return {
      trovata: true,
      id: lezione.id,
      corsoId: c?.id ?? lezione.corsoId,
      corso: nomeDelCorso,
      classeId: cl?.id ?? null,
      classe: cl?.nome ?? null,
      materiaId: m?.id ?? null,
      materia: m?.nome ?? null,
      data: lezione.data,
      inizio: inizioLezione(lezione),
      fine: fineLezione(lezione),
      aula: lezione.aula ?? '',
      manca,
      motivoMancanza: motivi,
    }
  },
})
