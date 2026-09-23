import { archiviPresenti, esportazioniPresenti } from '../../../data/filing.js'
import { composizioniPresenti } from '../../../data/compositions.js'
import { aggiornaInventarioModelli, inventarioModelli } from '../../../data/templates.js'
import type { RuoloModello } from '../../../domain/templateCatalog.js'
import { definisci } from '../../contract.js'
import { booleano, elenco, nullabile, numero, oggetto, scelta, testo, vuoto } from '../../schemas.js'
import { GENERI } from '../common/reports.js'

const RUOLI = ['comune', 'rapporto', 'posta', 'immagine'] as const satisfies readonly RuoloModello[]

/**
 * Che cosa c'è scritto su disco: esportazioni, archivio, fascicoli, modelli.
 *
 * È la stessa sostanza che il pannello spinge oggi dentro `MessaggioStato` —
 * `esportazioniPresenti`, `archiviPresenti`, `composizioniPresenti`,
 * `inventarioModelli` — e non è un doppione: là viaggia con lo stato, cioè
 * arriva a chi il registro ce l'ha già. Chi il registro non ce l'ha — la riga
 * di comando, il widget dell'agenda — non ha modo di sapere se un foglio sta
 * ancora nella cartella, e «esserci» per il registro vuol dire comparire qui
 * dentro: nel documento d'anno, non sul disco.
 *
 * Niente contenuti: nomi, misure e revisioni. La revisione è quel che dice a
 * un'anteprima che il foglio mostrato non è più quello nella cartella, anche
 * quando nome e misura non sono cambiati di un byte.
 */
const DOCUMENTO = oggetto({
  percorso: testo({ aiuto: 'Relativo alla cartella dei dati, la cartella radice compresa' }),
  misura: numero({ intero: true, aiuto: 'In byte: un PDF da zero byte è un foglio da rifare' }),
  revisione: numero({ intero: true, aiuto: 'Quante volte è stato riscritto da quando l’anno è aperto' }),
})

export const procedura = definisci({
  nome: 'documenti.inventario',
  versione: 1,
  genere: 'lettura',
  titolo: 'Che cosa c’è scritto nel documento d’anno: fogli, fascicoli, modelli',
  idempotente: true,
  // Manutenzione del documento d'anno: serve a chi lo ripara, non a chi
  // insegna.
  perAssistente: false,
  ingresso: vuoto(),
  uscita: oggetto({
    esportazioni: elenco(DOCUMENTO, { aiuto: 'Quel che sta sotto `esportazioni/`' }),
    archivio: elenco(DOCUMENTO, { aiuto: 'Quel che sta sotto `archivio/`, quarantena compresa' }),
    composizioni: elenco(oggetto({
      id: testo(),
      nome: testo(),
      percorsi: elenco(testo(), { aiuto: 'I fogli che lo compongono, nell’ordine' }),
      creataIl: testo(),
      aggiornataIl: testo(),
    })),
    modelli: elenco(oggetto({
      nome: testo({ aiuto: '`_base`, `verbale-lezione`, `_firma.html`' }),
      file: testo({ aiuto: 'Come si chiama su disco' }),
      titolo: testo(),
      ruolo: scelta(RUOLI),
      aiuto: testo(),
      genere: nullabile(scelta(GENERI, { aiuto: 'Il rapporto su cui se ne guarda l’anteprima' })),
      misura: numero({ intero: true }),
      suDisco: booleano({ aiuto: 'Se il file c’è davvero: quel che manca vale nella copia di serie' }),
      haDiSerie: booleano({ aiuto: 'Se c’è una copia di serie a cui tornare' }),
      modificato: booleano({ aiuto: 'Se quel che c’è su disco è diverso dalla copia di serie' }),
      arretrato: booleano({ aiuto: 'Modificato, e la copia di serie è cambiata da allora' }),
    })),
  }),
  presentazione: {
    titolo: 'Che cosa c’è scritto nel documento d’anno',
    blocchi: [
      {
        tipo: 'tabella',
        da: 'esportazioni',
        titolo: 'Fogli esportati',
        colonne: [
          { campo: 'percorso', testo: 'Foglio' },
          { campo: 'misura', testo: 'Misura', formato: 'byte' },
          { campo: 'revisione', testo: 'Revisione', formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'archivio',
        titolo: 'Documenti raccolti',
        colonne: [
          { campo: 'percorso', testo: 'Documento' },
          { campo: 'misura', testo: 'Misura', formato: 'byte' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'composizioni',
        titolo: 'Fascicoli',
        colonne: [
          { campo: 'nome', testo: 'Fascicolo' },
          { campo: 'percorsi', testo: 'Fogli', formato: 'elenco' },
          { campo: 'aggiornataIl', testo: 'Aggiornato' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'modelli',
        titolo: 'Modelli di templates/',
        colonne: [
          { campo: 'nome', testo: 'Modello' },
          { campo: 'titolo', testo: 'Che cos’è' },
          { campo: 'ruolo', testo: 'Ruolo' },
          { campo: 'suDisco', testo: 'Su disco', formato: 'siNo' },
          { campo: 'modificato', testo: 'Modificato', formato: 'siNo' },
        ],
      },
    ],
  },
  esegui: async () => {
    // L'inventario dei modelli si rilegge prima di rispondere, e non si prende
    // com'è: `inventarioModelli()` torna quel che sta **in memoria**, che è
    // vuoto finché qualcuno non ha aperto la pagina Modelli. Una lettura che
    // risponde «nessun modello» perché nessuno ha ancora scaldato una cache è
    // peggio di una che fallisce — la risposta ha l'aria di essere vera.
    //
    // Costa un giro di disco sulla cartella `templates/`, che ha tredici file:
    // il prezzo giusto per una risposta che non dipende da quel che è
    // successo prima.
    await aggiornaInventarioModelli()
    return {
      esportazioni: esportazioniPresenti(),
      archivio: archiviPresenti(),
      composizioni: composizioniPresenti(),
      modelli: [...inventarioModelli()],
    }
  },
})
