// I testi dei conti delle regole di un calendario ICS (`ruleCounts.ts`).

import { catalogo } from '../i18n/index.js'

const it = {
  nessunEvento: 'nessun evento',
  coperta: (abbinabili: number) => `coperta da regole più specifiche · ${abbinabili} abbinabili`,
  abbinati: (abbinati: number, abbinabili: number) =>
    `${abbinati} abbinati · ${abbinabili} abbinabili`,
}

export const testi = catalogo(it, {
  de: {
    nessunEvento: 'kein Termin',
    coperta: (abbinabili) => `von spezifischeren Regeln abgedeckt · ${abbinabili} zuordenbar`,
    abbinati: (abbinati, abbinabili) => `${abbinati} zugeordnet · ${abbinabili} zuordenbar`,
  },
  fr: {
    nessunEvento: 'aucun événement',
    coperta: (abbinabili) => `couverte par des règles plus précises · ${abbinabili} associables`,
    abbinati: (abbinati, abbinabili) => `${abbinati} associés · ${abbinabili} associables`,
  },
  en: {
    nessunEvento: 'no events',
    coperta: (abbinabili) => `covered by more specific rules · ${abbinabili} matchable`,
    abbinati: (abbinati, abbinabili) => `${abbinati} matched · ${abbinabili} matchable`,
  },
})
