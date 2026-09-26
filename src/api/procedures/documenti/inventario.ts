import { archiviPresenti, esportazioniPresenti } from '../../../data/filing.js'
import { composizioniPresenti } from '../../../data/compositions.js'
import { CATALOGO_MODELLI, fileDelModello, type RuoloModello } from '../../../domain/templateCatalog.js'
import { definisci } from '../../contract.js'
import { elenco, nullabile, numero, oggetto, scelta, testo, vuoto } from '../../schemas.js'
import { GENERI } from '../common/reports.js'
import { testi } from './documenti.testi.js'

const t = () => testi().inventario
const p = () => t().presentazione

const RUOLI = ['comune', 'rapporto', 'posta', 'immagine'] as const satisfies readonly RuoloModello[]

/**
 * Che cosa c'è su disco: esportazioni, archivio, fascicoli. È quel che il
 * pannello riceve in `MessaggioStato`, per chi il registro non ce l'ha (riga di
 * comando, condotto). Niente contenuti: nomi, misure, revisioni; la revisione
 * dice a un'anteprima che il foglio è cambiato anche a parità di nome e misura.
 */
const DOCUMENTO = oggetto({
  percorso: testo({ aiuto: () => t().percorso }),
  misura: numero({ intero: true, aiuto: () => t().misura }),
  revisione: numero({ intero: true, aiuto: () => t().revisione }),
})

/**
 * I modelli con cui escono i fogli: il catalogo del programma, uguale per tutti,
 * senza niente da misurare su disco. Servono a chi ripara un documento; la carta
 * intestata la dice `stato.leggi` nelle impostazioni.
 */
function modelliDelProgramma () {
  return CATALOGO_MODELLI.map((voce) => ({
    nome: voce.nome,
    file: fileDelModello(voce.nome),
    titolo: voce.titolo,
    ruolo: voce.ruolo,
    aiuto: voce.aiuto,
    genere: voce.genere,
  }))
}

export const procedura = definisci({
  // Versione 2: i modelli non stanno su disco, quindi niente `misura`, `suDisco`,
  // `haDiSerie`, `modificato`, `arretrato`.
  nome: 'documenti.inventario',
  versione: 2,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  // Manutenzione del documento: serve a chi lo ripara, non a chi insegna.
  perAssistente: false,
  ingresso: vuoto(),
  uscita: oggetto({
    esportazioni: elenco(DOCUMENTO, { aiuto: () => t().esportazioni }),
    archivio: elenco(DOCUMENTO, { aiuto: () => t().archivio }),
    composizioni: elenco(oggetto({
      id: testo(),
      nome: testo(),
      percorsi: elenco(testo(), { aiuto: () => t().percorsi }),
      creataIl: testo(),
      aggiornataIl: testo(),
    })),
    modelli: elenco(oggetto({
      nome: testo({ aiuto: '`_base`, `verbale-lezione`, `_firma.html`' }),
      file: testo({ aiuto: () => t().fileModello }),
      titolo: testo(),
      ruolo: scelta(RUOLI),
      aiuto: testo(),
      genere: nullabile(scelta(GENERI, { aiuto: () => t().genereModello })),
    }), { aiuto: () => t().modelli }),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'tabella',
        da: 'esportazioni',
        titolo: () => p().fogliEsportati,
        colonne: [
          { campo: 'percorso', testo: () => p().foglio },
          { campo: 'misura', testo: () => p().misura, formato: 'byte' },
          { campo: 'revisione', testo: () => p().revisione, formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'archivio',
        titolo: () => p().documentiRaccolti,
        colonne: [
          { campo: 'percorso', testo: () => p().documento },
          { campo: 'misura', testo: () => p().misura, formato: 'byte' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'composizioni',
        titolo: () => p().fascicoli,
        colonne: [
          { campo: 'nome', testo: () => p().fascicolo },
          { campo: 'percorsi', testo: () => p().fogli, formato: 'elenco' },
          { campo: 'aggiornataIl', testo: () => p().aggiornato },
        ],
      },
      {
        tipo: 'tabella',
        da: 'modelli',
        titolo: () => p().modelliDelProgramma,
        colonne: [
          { campo: 'nome', testo: () => p().modello },
          { campo: 'titolo', testo: () => p().cheCose },
          { campo: 'ruolo', testo: () => p().ruolo },
        ],
      },
    ],
  },
  esegui: () => ({
    esportazioni: esportazioniPresenti(),
    archivio: archiviPresenti(),
    composizioni: composizioniPresenti(),
    modelli: modelliDelProgramma(),
  }),
})
