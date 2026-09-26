import { definisci } from '../../contract.js'
import { nullabile, numero, oggetto, testo, vuoto } from '../../schemas.js'
import { testi } from './registro.testi.js'

const t = () => testi().riassunto
const p = () => t().presentazione

export const procedura = definisci({
  nome: 'registro.riassunto',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: vuoto(),
  uscita: oggetto({
    versione: numero({ intero: true, aiuto: () => t().versione }),
    anno: nullabile(oggetto({
      id: testo(),
      etichetta: testo(),
      inizio: testo(),
      fine: testo(),
      semestri: numero({ intero: true }),
    })),
    classi: numero({ intero: true }),
    corsi: numero({ intero: true }),
    lezioni: numero({ intero: true }),
    valutazioni: numero({ intero: true }),
    consegne: numero({ intero: true }),
    daSmistare: numero({ intero: true, aiuto: () => t().daSmistare }),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'classi', etichetta: () => p().classi, formato: 'numero' },
          { campo: 'corsi', etichetta: () => p().corsi, formato: 'numero' },
          { campo: 'lezioni', etichetta: () => p().lezioni, formato: 'numero' },
          { campo: 'valutazioni', etichetta: () => p().valutazioni, formato: 'numero' },
          { campo: 'consegne', etichetta: () => p().consegne, formato: 'numero' },
          { campo: 'daSmistare', etichetta: () => p().daSmistare, formato: 'numero' },
        ],
      },
    ],
  },
  esegui: (ambito) => {
    const r = ambito.contesto.registro
    const anno = r.anni.find((a) => a.id === r.annoCorrenteId) ?? null
    return {
      versione: r.versione,
      anno: anno
        ? {
            id: anno.id,
            etichetta: anno.etichetta,
            inizio: anno.inizio,
            fine: anno.fine,
            semestri: anno.semestri.length,
          }
        : null,
      classi: r.classi.length,
      corsi: r.corsi.length,
      lezioni: r.lezioni.length,
      valutazioni: r.valutazioni.length,
      consegne: r.consegne.length,
      daSmistare: r.smistamenti.filter((s) => s.blocchi.length > 0).length,
    }
  },
})
