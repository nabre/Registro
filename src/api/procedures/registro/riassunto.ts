import { definisci } from '../../contract.js'
import { nullabile, numero, oggetto, testo, vuoto } from '../../schemas.js'

export const procedura = definisci({
  nome: 'registro.riassunto',
  versione: 1,
  genere: 'lettura',
  titolo: 'Che cosa c’è nel registro aperto, in cifre',
  idempotente: true,
  ingresso: vuoto(),
  uscita: oggetto({
    versione: numero({ intero: true, aiuto: 'La versione dello schema dei dati' }),
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
    daSmistare: numero({ intero: true, aiuto: 'Smistamenti con pagine ancora in quarantena' }),
  }),
  presentazione: {
    titolo: 'Il registro in cifre',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'classi', etichetta: 'Classi', formato: 'numero' },
          { campo: 'corsi', etichetta: 'Corsi', formato: 'numero' },
          { campo: 'lezioni', etichetta: 'Ore a calendario', formato: 'numero' },
          { campo: 'valutazioni', etichetta: 'Momenti di valutazione', formato: 'numero' },
          { campo: 'consegne', etichetta: 'Consegne', formato: 'numero' },
          { campo: 'daSmistare', etichetta: 'Da smistare', formato: 'numero' },
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
