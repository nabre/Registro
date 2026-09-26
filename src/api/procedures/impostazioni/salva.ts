import { sistema } from '../../../actions/system.js'
import type { QuandoRifarePdf, VoceLista } from '../../../domain/models.js'
import { inoltra, scrittura } from '../../core.js'
import {
  elenco,
  esaustivo,
  identificatore,
  nullabile,
  numero,
  oggetto,
  opzionale,
  ora,
  qualunque,
  scelta,
  testo,
  type Schema,
} from '../../schemas.js'
import { testi } from './impostazioni.testi.js'

const t = () => testi().salva

/**
 * Quando il registro rifà da sé i PDF di un corso. Scritti qui perché lo schema
 * li vuole in compilazione; `esaustivo()` fa fallire un modo dimenticato.
 */
const QUANDO_RIFARE_PDF = esaustivo<QuandoRifarePdf>()([
  'mai', 'chiusura', 'sempre',
] as const)

/**
 * Le liste delle tendine, da nome di lista alle sue voci. `qualunque`, perché
 * le chiavi sono il dato e `oggetto` descrive solo campi fissi;
 * `normalizzaListe` lascia cadere le liste che non conosce. La dogana sta in
 * `domain/validation.ts`.
 */
const LISTE = qualunque({
  aiuto: () => t().liste,
}) as Schema<Record<string, VoceLista[]> | undefined>

/**
 * Un `ImpostazioniDaSalvare` intero, campo per campo, con l'intestazione
 * facoltativa e senza il logo.
 *
 * Non `entita` (le impostazioni non hanno `id`) e non `qualunque` (`inoltra`
 * vuole `impostazioni: Impostazioni`): scritto per esteso, un campo aggiunto a
 * `Impostazioni` fa fallire questa compilazione.
 *
 * Largo come il tipo: il merito lo giudica il gestore (`erroriImpostazioni` in
 * `actions/system.ts`).
 */
const IMPOSTAZIONI = oggetto({
  scala: oggetto({
    min: numero(),
    max: numero(),
    sufficienza: numero(),
    passo: numero({ aiuto: () => t().passo }),
  }),
  passoFineSemestre: numero({ aiuto: () => t().passoFineSemestre }),
  sogliaAssenza: numero({ aiuto: () => t().sogliaAssenza }),
  // `ora()` ha lo stesso modello di `oraValida` nel dominio, non uno più stretto.
  minutiUd: numero({
    aiuto: () => t().minutiUd,
  }),
  oraInizioGiornata: ora(),
  oraFineGiornata: ora(),
  giorniVisibili: elenco(numero(), { aiuto: () => t().giorniVisibili }),
  durataSlotPredefinita: numero(),
  durataPausaPredefinita: numero(),
  // Le pause della giornata. Senza questo campo, rimandare le impostazioni le
  // toglierebbe.
  pause: opzionale(oggetto({
    prima: oggetto({
      inizio: ora({ aiuto: () => t().inizioPrimaPausa }),
      durataMin: numero({ aiuto: () => t().durataPausa }),
    }),
    seguenti: elenco(oggetto({
      dopoUd: numero({ aiuto: () => t().dopoUd }),
      durataMin: numero({ aiuto: () => t().durataPausa }),
    }), { aiuto: () => t().seguenti }),
  }, { aiuto: () => t().pause })),
  pdfAutomatici: scelta(QUANDO_RIFARE_PDF, { aiuto: () => t().pdfAutomatici }),
  liste: opzionale(LISTE),
  // Il calendario ICS: la pagina rimanda tutte le impostazioni a ogni ritocco, e
  // senza questo campo `oggetto()` lo scarterebbe.
  calendario: opzionale(oggetto({
    // I calendari passano come sono: si aggiungono e tolgono con
    // `calendario.aggiungi` e `calendario.togli`.
    calendari: elenco(oggetto({
      id: testo(),
      nome: testo(),
      origine: testo({ aiuto: () => t().origine }),
      copiatoIl: opzionale(testo({ aiuto: () => t().copiatoIl })),
    })),
    // Le regole già salvate, con il loro id: le nuove nascono in `calendario.applica`.
    regole: elenco(oggetto({
      id: testo(),
      testo: testo({
        aiuto: () => t().regola,
      }),
      corsoId: nullabile(identificatore({ aiuto: () => t().corsoDellaRegola })),
    })),
  }, { aiuto: () => t().calendario })),
  // La carta intestata senza il logo, che è un file (`intestazione.logo`,
  // `intestazione.togliLogo`); il gestore tiene quello che c'è. Assente,
  // l'intestazione resta com'era.
  intestazione: opzionale(oggetto({
    carte: elenco(oggetto({
      id: identificatore({ aiuto: () => t().idCarta }),
      sede: testo({ aiuto: () => t().sede }),
      altezzaLogo: numero({ aiuto: () => t().altezzaLogo }),
      corsi: elenco(identificatore(), {
        aiuto: () => t().corsi,
      }),
    }), { aiuto: () => t().carte }),
    docente: testo({ aiuto: () => t().docente }),
    firma: opzionale(testo({
      aiuto: () => t().firma,
    })),
  }, { aiuto: () => t().intestazione })),
}, { aiuto: () => t().impostazioni })

export const procedura = scrittura({
  nome: 'impostazioni.salva',
  titolo: () => t().titolo,
  azione: 'impostazioni.salva',
  // Il gestore sostituisce l'oggetto intero.
  idempotente: true,
  collezioni: ['registro', 'lezioni'],
  ingresso: oggetto({ impostazioni: IMPOSTAZIONI }),
  esegui: inoltra(sistema, 'impostazioni.salva'),
})
