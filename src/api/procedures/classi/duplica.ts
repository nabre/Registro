import { registro } from '../../../actions/register.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { identificatore, oggetto, testo } from '../../schemas.js'
import { esigiAnno, esigiClasse } from '../common/register.js'

/**
 * Duplicare non è idempotente, e non lo sarà mai.
 *
 * Ogni chiamata fa una classe nuova con persone nuove — identificativi nuovi,
 * apposta, perché due classi che si dividono lo stesso id di allievo rendono
 * ambigua ogni ricerca. Chi ritenta dopo un errore di trasporto si ritrova due
 * classi, e deve saperlo prima di ritentare.
 */
export const procedura = definisci({
  nome: 'classi.duplica',
  versione: 1,
  genere: 'scrittura',
  titolo: 'La stessa classe in un altro anno, con i suoi corsi',
  azione: 'classe.duplica',
  idempotente: false,
  collezioni: ['classi', 'corsi'],
  ingresso: oggetto({
    classeId: identificatore({ aiuto: 'La classe da copiare' }),
    annoId: identificatore({ aiuto: 'L’anno in cui mettere la copia' }),
    nome: testo({ aiuto: 'Come si chiamerà: di norma la stessa sigla' }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    esigiClasse(ambito, ingresso.classeId)
    // Nel pannello l'anno si sceglie da un elenco chiuso, e da fuori no: una
    // copia messa in un anno che non c'è sarebbe una classe che nessuna
    // schermata mostra più.
    esigiAnno(ambito, ingresso.annoId)
    return daGestore(registro['classe.duplica'], (i: typeof ingresso) => ({
      tipo: 'classe.duplica' as const, ...i,
    }))(ambito, ingresso)
  },
})
