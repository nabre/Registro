import { smistamento } from '../../../../actions/sorting.js'
import { definisci } from '../../../contract.js'
import { daGestore, SCRITTURA } from '../../../core.js'
import { identificatore, nullabile, oggetto, opzionale, testo } from '../../../schemas.js'
import { comeDivisione, divisione } from '../common.js'

/**
 * Il PDF trascinato nel pannello, con i suoi byte in base64.
 *
 * **`contenuto` non ha un tetto di lunghezza, ed è una scelta.** È il payload
 * più grosso del protocollo: una scansione di venti pagine sono megabyte, e in
 * base64 un terzo in più. Un massimo scelto a occhio — un milione di
 * caratteri, dieci — non si manifesterebbe come «il file è troppo grande»: si
 * manifesterebbe come «il trascinamento non funziona più», su certi PDF e non
 * su altri, senza che chi guarda possa vedere che cos'hanno di diverso. Il
 * limite vero ce l'hanno già il trasporto e il disco, e sono loro a doverlo
 * dire.
 *
 * Nemmeno un minimo: `contenuto: ''` oggi entra e il gestore risponde «Il file
 * trascinato è vuoto», che è la frase giusta e che una prova verifica.
 */
export const procedura = definisci({
  nome: 'smistamento.pdf.deposita',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Posa in quarantena un PDF arrivato con i suoi byte',
  azione: 'smistamento.deposita',
  idempotente: false,
  collezioni: ['smistamenti'],
  ingresso: oggetto({
    consegnaId: nullabile(identificatore({ aiuto: 'La richiesta a cui appartiene, o null' })),
    classeId: opzionale(nullabile(identificatore({ aiuto: 'La classe da cui è stato lasciato cadere' }))),
    nome: testo({ aiuto: 'Il nome che aveva il file. Il gestore ne toglie i caratteri impossibili' }),
    contenuto: testo({ aiuto: 'I byte del PDF in base64. Senza tetto: vedi la nota sopra' }),
    divisione: opzionale(divisione()),
  }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) => daGestore(smistamento['smistamento.deposita'], (i: typeof ingresso) => ({
    tipo: 'smistamento.deposita' as const, ...i, divisione: comeDivisione(i.divisione),
  }))(ambito, ingresso),
})
