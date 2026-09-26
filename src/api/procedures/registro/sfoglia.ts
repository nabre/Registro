import * as apparato from 'apparato'

import { definisci } from '../../contract.js'
import { nullabile, oggetto, testo, vuoto } from '../../schemas.js'
import { parole } from '../../../domain/words.testi.js'
import { ESTENSIONE } from '../../../data/package.js'
import { testi } from './registro.testi.js'

const t = () => testi().sfoglia
const p = () => t().presentazione

/**
 * Un altro documento `.regi`, scelto con il dialogo del sistema: torna il
 * percorso, o null se il dialogo si chiude senza scelta. Serve a «Importa da un
 * altro registro…» per un anno che non sta fra i recenti; il percorso va poi a
 * `registro.altrove`.
 *
 * Lettura: non tocca registro né impostazioni, e torna un dato per il canale
 * delle domande. Non va al modello (`perAssistente: false`): aprirebbe dialoghi
 * sullo schermo di chi insegna. Non idempotente: ogni chiamata è un dialogo.
 */
export const procedura = definisci({
  nome: 'registro.sfoglia',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: false,
  perAssistente: false,
  ingresso: vuoto(),
  uscita: oggetto({
    percorso: nullabile(testo({ aiuto: () => t().percorso })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [{ tipo: 'valori', campi: [{ campo: 'percorso', etichetta: () => p().file }] }],
  },
  esegui: async () => {
    const scelti = await apparato.dialoghi.chiediFile({
      title: t().dialogo,
      openLabel: parole().scegliConferma,
      canSelectMany: false,
      canSelectFiles: true,
      canSelectFolders: false,
      filters: { Regiclass: [ESTENSIONE.slice(1)] },
    })
    return { percorso: scelti?.[0]?.fsPath ?? null }
  },
})
