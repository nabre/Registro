import { composizioni } from '../../../actions/compositions.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { elenco, oggetto, testo } from '../../schemas.js'

/**
 * Un fascicolo nuovo.
 *
 * Lo schema non ricontrolla niente di quel che il gestore già impone — i
 * percorsi devono cominciare per `esportazioni/`, non contenere `..`, finire
 * per `.pdf`, ed essere fra due e duecento. Quelle regole restano dove sanno
 * anche che cosa c'è su disco: qui non si saprebbe che un percorso buono punta
 * a un file che non c'è più, e uno schema che rifiuta prima direbbe «servono
 * almeno due documenti» a chi ne ha spuntati cinque, tre dei quali scaduti.
 * Lo schema chiede solo un nome e un elenco di testi.
 */
export const procedura = definisci({
  nome: 'composizioni.crea',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Mette i documenti scelti in un PDF solo, sotto un nome',
  azione: 'composizione.crea',
  // Il nome decide il percorso del PDF, e un secondo colpo con lo stesso nome
  // viene rifiutato invece di fare un doppione: il disco resta come dopo il
  // primo.
  idempotente: true,
  collezioni: [],
  ingresso: oggetto({
    nome: testo({ minimo: 1, aiuto: 'È anche il nome del file che ne esce' }),
    percorsi: elenco(testo({ minimo: 1 }), {
      aiuto: 'I documenti da combinare, nell’ordine in cui vanno in fila',
    }),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(composizioni['composizione.crea'], (i: typeof ingresso) => ({
      tipo: 'composizione.crea' as const, ...i,
    }))(ambito, ingresso),
})
