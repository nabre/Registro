import { registro } from '../../../actions/register.js'
import { annoAllineato } from '../../../domain/years.js'
import type { AnnoScolastico } from '../../../domain/models.js'
import { validaAnno } from '../../../domain/validation.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { entita, oggetto, type EsitoDominio } from '../../schemas.js'
import { esigiAnno } from '../common/register.js'

/**
 * L'anno si convalida **allineato**, come fa il gestore.
 *
 * `validaAnno` pretende che `inizio` e `fine` siano quelli dei suoi semestri,
 * e il pannello non li manda: li ricava il gestore con `annoAllineato` prima
 * di guardare il resto — sta scritto accanto ad `anno.salva`, ed è il motivo
 * per cui quel passaggio esiste. Convalidare l'anno così com'è arrivato
 * rifiuterebbe quindi un anno che il registro salva ogni giorno senza batter
 * ciglio: uno schema più stretto del lavoro che dovrebbe difendere.
 */
function annoValido (anno: AnnoScolastico): EsitoDominio {
  // Senza semestri non c'è niente da allineare, e `validaAnno` lo dice con la
  // sua frase — che è meglio di un guasto raccolto da `entita`.
  if (!Array.isArray(anno.semestri) || anno.semestri.length === 0) return validaAnno(anno)
  return validaAnno(annoAllineato(anno))
}

export const procedura = definisci({
  nome: 'anni.salva',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Riscrive un anno intero: etichetta, semestri e pause',
  azione: 'anno.salva',
  idempotente: true,
  collezioni: ['registro'],
  ingresso: oggetto({
    anno: entita<AnnoScolastico>({ cosa: 'Anno scolastico', valida: annoValido }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => {
    // `anno.salva` riscrive, non crea: un anno che il registro non conosce
    // finiva in `Anno scolastico non trovato.`, cioè in un rifiuto. È invece
    // un «non c'è più», e si ritenta dopo aver riletto.
    esigiAnno(ambito, ingresso.anno.id)
    return daGestore(registro['anno.salva'], (i: typeof ingresso) => ({
      tipo: 'anno.salva' as const, ...i,
    }))(ambito, ingresso)
  },
})
