import { smistamento } from '../../../../actions/sorting.js'
import type { TipoRapporto } from '../../../../domain/models.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { booleano, identificatore, oggetto, scelta } from '../../../schemas.js'
import { esigiClasse, esigiSmistamento, pagine } from '../common.js'

/**
 * I due rapporti della scuola.
 *
 * Scritti qui e non dedotti dal modello perché uno schema ha bisogno dei
 * valori quando compila; il `satisfies` fa sì che un rapporto aggiunto al
 * dominio e dimenticato qui non compili.
 */
const RAPPORTI = ['assenze', 'ritardi'] as const satisfies readonly TipoRapporto[]

/**
 * Le pagine trascinate su una casella della matrice delle assenze.
 *
 * `genere` e `firmato` sono l'unica cosa che il file non può sapere: i due
 * rapporti della scuola si somigliano pagina per pagina, e indovinarli
 * vorrebbe dire spedire all'azienda i ritardi al posto delle assenze. Per
 * questo `genere` è una `scelta` e non del testo — è l'unico campo di
 * quest'area in cui un valore storto passerebbe inosservato fino al momento
 * della spedizione.
 *
 * Il periodo (`bloccoId`) non si controlla qui: lo cerca `assegnaAssenze`
 * dentro il fascicolo della classe, che è l'unico posto in cui esiste.
 */
export const procedura = definisci({
  nome: 'smistamento.assenze.assegna',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Archivia le pagine scelte come rapporto di assenze o ritardi di una persona',
  azione: 'smistamento.assegnaAssenze',
  idempotente: false,
  collezioni: ['fascicoli', 'smistamenti'],
  ingresso: oggetto({
    smistamentoId: identificatore(),
    classeId: identificatore(),
    bloccoId: identificatore({ aiuto: 'Il periodo dentro cui sta la riga di quella persona' }),
    allievoId: identificatore(),
    genere: scelta(RAPPORTI, { aiuto: 'Quale rapporto: lo dice la casella, non il file' }),
    firmato: booleano({ aiuto: 'Vergine o già controfirmato' }),
    pagine: pagine(),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiSmistamento(ambito, ingresso.smistamentoId)
    esigiClasse(ambito, ingresso.classeId)
    return daGestore(smistamento['smistamento.assegnaAssenze'], (i: typeof ingresso) => ({
      tipo: 'smistamento.assegnaAssenze' as const, ...i,
    }))(ambito, ingresso)
  },
})
