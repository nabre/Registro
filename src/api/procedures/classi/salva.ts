import { registro } from '../../../actions/register.js'
import type { Classe } from '../../../domain/models.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { entita, oggetto } from '../../schemas.js'
import { esigiAnno } from '../common/register.js'

/** `validaClasse(classe, altre)` vuole le altre: due nomi uguali nello stesso anno. */
export const procedura = definisci({
  nome: 'classi.salva',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Scrive una classe intera con il suo elenco di iscritti',
  azione: 'classe.salva',
  idempotente: true,
  collezioni: ['classi'],
  ingresso: oggetto({ classe: entita<Classe>({ cosa: 'Classe' }) }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    // `registro.anni` tiene **solo** l'anno aperto: una classe con un `annoId`
    // diverso finiva nel file e non compariva più in nessuna schermata, né si
    // poteva eliminare. E senza documento aperto l'elenco è vuoto, quindi
    // questa riga è anche la guardia che impedisce di scrivere nel nulla.
    esigiAnno(ambito, ingresso.classe.annoId)
    return daGestore(registro['classe.salva'], (i: typeof ingresso) => ({
      tipo: 'classe.salva' as const, ...i,
    }))(ambito, ingresso)
  },
})
