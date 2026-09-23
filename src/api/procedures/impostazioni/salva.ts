import { sistema } from '../../../actions/system.js'
import type { QuandoRifarePdf, VoceLista } from '../../../domain/models.js'
import { definisci } from '../../contract.js'
import { daGestore, SCRITTURA } from '../../core.js'
import { elenco, esaustivo, numero, oggetto, opzionale, ora, qualunque, scelta, type Schema } from '../../schemas.js'

/**
 * Quando il registro rifà da sé i PDF di un corso.
 *
 * Scritti qui come in `hours.ts` gli stati dell'appello, e per lo stesso motivo:
 * uno schema ha bisogno dei valori quando compila. `esaustivo()` fa si' che un
 * modo aggiunto al dominio e dimenticato qui non compili — e stavolta e' vero:
 * qui c'era `as const satisfies readonly QuandoRifarePdf[]`, che verifica che
 * ogni elemento sia valido e **non** che ci siano tutti, sotto un commento che
 * prometteva il contrario.
 */
const QUANDO_RIFARE_PDF = esaustivo<QuandoRifarePdf>()([
  'mai', 'chiusura', 'sempre',
] as const)

/**
 * Le liste delle tendine: una mappa da nome di lista alle sue voci.
 *
 * `qualunque` e non un oggetto con le chiavi scritte, perché le chiavi *sono*
 * il dato: `oggetto` sa descrivere campi fissi, non una mappa aperta, e
 * scrivere qui l'elenco delle liste riconosciute vorrebbe dire rifiutare per
 * intero un salvataggio che oggi passa — `normalizzaListe` le liste che non
 * conosce le lascia cadere, non fa fallire niente. La dogana resta dov'è, in
 * `domain/validation.ts`.
 */
const LISTE = qualunque({
  aiuto: 'Le voci delle tendine cambiate: nome della lista → voci. Quel che non è una lista riconosciuta si perde',
}) as Schema<Record<string, VoceLista[]> | undefined>

/**
 * Un `Impostazioni` intero, campo per campo.
 *
 * `entita` non si può usare — la pretende con un `id`, e le impostazioni non
 * ne hanno uno: sono l'unico oggetto del documento che esiste in copia sola e
 * non si trova per identificatore — e `qualunque` da solo non
 * tipizzerebbe: `daGestore` compone un'azione che dichiara
 * `impostazioni: Impostazioni`, e con `unknown` dentro non compilerebbe. Quel
 * che resta è dirlo per esteso, ed è anche la versione che conviene: scritto
 * così, un campo aggiunto a `Impostazioni` fa fallire *questa* compilazione
 * invece di arrivare al gestore come `undefined`.
 *
 * Largo dove il dominio è largo. `normalizzaImpostazioni` — che il gestore
 * chiama su tutto quel che arriva — riporta al predefinito ogni valore che non
 * riconosce invece di rifiutarlo, quindi qui non si ristringe oltre il tipo:
 * i giorni visibili sono numeri e non «da 1 a 7», la soglia è un numero e non
 * «da 0 a 100». Rifiutare dove il dominio correggerebbe romperebbe un
 * salvataggio che oggi riesce.
 */
const IMPOSTAZIONI = oggetto({
  scala: oggetto({
    min: numero(),
    max: numero(),
    sufficienza: numero(),
    passo: numero({ aiuto: 'Il passo dei voti inseribili: 0.25 sono mezzi e quarti' }),
  }),
  passoFineSemestre: numero({ aiuto: 'Il passo della nota di fine semestre. Zero vuol dire «non arrotondare»' }),
  sogliaAssenza: numero({ aiuto: 'In cifra tonda: 20 è il venti per cento. Zero spegne la segnalazione' }),
  // `ora()` porta lo stesso modello di `oraValida` nel dominio, non uno più
  // stretto: quel che il registro rilegge senza correggere, qui passa.
  oraInizioGiornata: ora(),
  oraFineGiornata: ora(),
  giorniVisibili: elenco(numero(), { aiuto: '1 = lunedì … 7 = domenica. Quel che cade fuori lo scarta il dominio' }),
  durataSlotPredefinita: numero(),
  durataPausaPredefinita: numero(),
  pdfAutomatici: scelta(QUANDO_RIFARE_PDF, { aiuto: 'Quando il registro rifà da sé i PDF di un corso' }),
  liste: opzionale(LISTE),
}, { aiuto: 'Le impostazioni del documento d’anno, intere' })

export const procedura = definisci({
  nome: 'impostazioni.salva',
  versione: 1,
  genere: 'scrittura',
  titolo: 'Le impostazioni del documento d’anno, tutte insieme',
  azione: 'impostazioni.salva',
  // Scriverle due volte uguali lascia il registro com'era: il gestore
  // sostituisce l'oggetto intero, non lo somma a quel che c'era.
  idempotente: true,
  collezioni: ['registro'],
  ingresso: oggetto({ impostazioni: IMPOSTAZIONI }),
  uscita: SCRITTURA,
  esegui: (ambito, ingresso) =>
    daGestore(sistema['impostazioni.salva'], (i: typeof ingresso) => ({
      tipo: 'impostazioni.salva' as const, ...i,
    }))(ambito, ingresso),
})
