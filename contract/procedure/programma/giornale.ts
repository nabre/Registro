import { definisci } from '#contract/contract.js'
import { ultimeVociGiornale } from '#contract/core.js'
import { booleano, elenco, numero, oggetto, opzionale, testo } from '#contract/schemas.js'
import { testi } from './programma.testi.js'

const t = () => testi().giornale
const p = () => t().presentazione

/**
 * Legge le ultime chiamate registrate nel giornale in memoria dell'applicazione.
 * Non scrive mai su disco per rispettare la riservatezza delle attività didattiche.
 */
export const procedura = definisci({
  nome: 'programma.giornale',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  perAssistente: false,
  documento: 'indipendente',
  idempotente: true,
  ingresso: oggetto({
    limite: opzionale(numero({ minimo: 1, massimo: 500, aiuto: () => t().limite })),
    soloErrori: opzionale(booleano({ aiuto: () => t().soloErrori })),
  }),
  uscita: oggetto({
    voci: elenco(oggetto({
      tracciato: testo(),
      procedura: testo(),
      origine: testo(),
      genere: opzionale(testo()),
      durataMs: numero(),
      ok: booleano(),
      codice: opzionale(testo()),
      modifiche: opzionale(numero()),
      ora: numero(),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'tabella',
        da: 'voci',
        colonne: [
          { campo: 'procedura', testo: () => p().procedura },
          { campo: 'origine', testo: () => p().origine },
          { campo: 'durataMs', testo: () => p().durataMs, formato: 'numero' },
          { campo: 'ok', testo: () => p().ok, formato: 'siNo' },
          { campo: 'codice', testo: () => p().codice },
        ],
      },
    ],
  },
  esegui: (_ambito, ingresso) => {
    let voci = ultimeVociGiornale(ingresso.limite ?? 100)
    if (ingresso.soloErrori) {
      voci = voci.filter((v) => !v.ok)
    }
    return { voci: [...voci] }
  },
})
