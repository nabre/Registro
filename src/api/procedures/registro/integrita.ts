import { riparazioni } from '../../../domain/repairs.js'
import { riferimentiRotti } from '../../../domain/validation.js'
import { definisci } from '../../contract.js'
import { elenco, oggetto, testo, vuoto } from '../../schemas.js'

/**
 * Che cosa non torna nel registro, e che cosa si saprebbe aggiustare.
 *
 * Due elenchi e due mestieri: `riferimentiRotti` dice quel che è rotto e basta
 * — un collegamento appeso al nulla, una lezione senza corso — e `riparazioni`
 * dice, delle rotture, quali il registro sa correggere da solo senza perdere
 * niente.
 *
 * **Solo la diagnosi.** Ogni `Riparazione` porta con sé una closure `applica`
 * che scrive nel registro vivo: qui non si chiama mai, e non è una svista da
 * completare — una lettura non tocca il registro, e il gesto che applica le
 * correzioni esiste già, è l'azione `manutenzione.ripara`. Di una riparazione
 * restano le due cose che si possono dire: che cosa succederebbe, e quali
 * raccolte toccherebbe.
 */
export const procedura = definisci({
  nome: 'registro.integrita',
  versione: 1,
  genere: 'lettura',
  titolo: 'I riferimenti rotti del registro, e le correzioni che si saprebbero fare',
  idempotente: true,
  // Manutenzione: i riferimenti rotti si guardano dalla pagina apposta, e
  // un'anteprima di correzioni non è una risposta da conversazione.
  perAssistente: false,
  ingresso: vuoto(),
  uscita: oggetto({
    riferimentiRotti: elenco(testo(), { aiuto: 'Quel che non torna, una frase per rottura' }),
    riparazioni: elenco(oggetto({
      titolo: testo({ aiuto: 'Che cosa succede, detto prima di farlo' }),
      dettaglio: testo({ aiuto: 'Le raccolte che la correzione toccherebbe' }),
    })),
  }),
  presentazione: {
    titolo: 'Che cosa non torna nel registro',
    blocchi: [
      { tipo: 'elenco', da: 'riferimentiRotti', titolo: 'Riferimenti rotti' },
      {
        tipo: 'tabella',
        da: 'riparazioni',
        titolo: 'Correzioni possibili',
        colonne: [
          { campo: 'titolo', testo: 'Correzione' },
          { campo: 'dettaglio', testo: 'Che cosa tocca' },
        ],
      },
    ],
  },
  esegui: (ambito) => {
    const r = ambito.contesto.registro
    return {
      riferimentiRotti: riferimentiRotti(r),
      riparazioni: riparazioni(r).map((riparazione) => ({
        titolo: riparazione.descrizione,
        dettaglio: riparazione.collezioni.join(', '),
      })),
    }
  },
})
