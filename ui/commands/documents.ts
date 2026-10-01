// I comandi della pagina Documenti, e la strada per l'account di posta.

import { MODI_PDF } from '#core/dominio/automation.js'
import type { QuandoRifarePdf } from '#core/dominio/models.js'
import type { Ambito, ComandoUI } from '#ui/commands.js'
import { testi as testiComuni } from '#ui/commands.testi.js'
import type { NomeIcona } from '#ui/components/icons.js'
import { azione } from '#ui/bridge.js'
import { corsoDelContesto, senzaCorso } from '#ui/context.js'
import { aggiorna, nomeSemestreScelto, stato, vai } from '#ui/state.js'
// Le porzioni delle pagine (modi, schede, filtri) le nomina solo `tabs.ts`.
import { SCHEDE_DOCUMENTI } from '#ui/tabs.js'
import { testi } from './documents.testi.js'

// Testi letti una volta: la pagina si ricarica quando cambia lingua (`core/i18n/page.ts`).
const t = testi()
const G = testiComuni().gruppi

/** L'icona di ogni modo di rifare i PDF: dice chi li rifà, non che si rifanno. */
const ICONE_MODO_PDF: Record<QuandoRifarePdf, NomeIcona> = {
  mai: 'mano',
  chiusura: 'bandiera',
  sempre: 'fulmine',
}

export const COMANDI_DOCUMENTI: readonly ComandoUI[] = [
  // ------------------------------------------------------------ Documenti
  //
  // Le tre schede della pagina come interruttori nella riga delle azioni, come i
  // modi del calendario: il pulsante acceso dice quale si guarda.
  ...SCHEDE_DOCUMENTI.map((scheda) => ({
    id: `documenti.scheda.${scheda.valore}`,
    titolo: scheda.nome,
    simbolo: scheda.simbolo,
    dove: ['documenti'] as Ambito,
    gruppo: G.documentiDi,
    aiuto: scheda.aiuto,
    impedimento: senzaCorso,
    acceso: () => stato.schedaDocumenti === scheda.valore,
    al: () => aggiorna({ schedaDocumenti: scheda.valore }),
  })),
  {
    id: 'documenti.aggiornaTutto',
    titolo: t.aggiornaTutto,
    simbolo: 'ricarica',
    dove: ['documenti'],
    gruppo: G.genera,
    aiuto: () => t.aggiornaTuttoAiuto(nomeSemestreScelto()),
    primario: true,
    impedimento: senzaCorso,
    al: () =>
      azione({
        tipo: 'rapporto.completo',
        corsoId: corsoDelContesto()?.id ?? null,
        semestreId: stato.semestreId,
      }),
  },
  // Chi rifà i documenti: tre interruttori, acceso quello in vigore.
  ...MODI_PDF.map((modo) => ({
    id: `documenti.rifare.${modo.valore}`,
    titolo: modo.nome,
    simbolo: ICONE_MODO_PDF[modo.valore],
    dove: ['documenti'] as Ambito,
    gruppo: G.chiLiRifa,
    aiuto: modo.spiegazione,
    acceso: () => stato.registro.impostazioni.pdfAutomatici === modo.valore,
    al: () =>
      azione({
        tipo: 'impostazioni.salva',
        impostazioni: { ...stato.registro.impostazioni, pdfAutomatici: modo.valore },
      }),
  })),

  // Collegare, provare, scollegare e azzerare la casella stanno in un posto
  // solo, Utente › Account, per capacità: da qui ci si va.
  {
    id: 'file.accountPosta',
    titolo: t.accountPosta,
    simbolo: 'posta',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.posta,
    aiuto: t.accountPostaAiuto,
    al: () => { vai({ pagina: 'pagina.impostazioni', scheda: 'utente#account' }) },
  },
]
