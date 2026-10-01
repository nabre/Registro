// I comandi del check: le sue colonne.

import { checkDelCorso } from '#core/dominio/check.js'
import type { ComandoUI } from '#ui/commands.js'
import { testi as testiComuni } from '#ui/commands.testi.js'
import { moduloColonnaCheck, moduloColonneCheck } from '#ui/forms.js'
import { corsoDelContesto, senzaCorso } from '#ui/context.js'
import { stato } from '#ui/state.js'
import { testi } from './check.testi.js'

// Testi letti una volta: la pagina si ricarica quando cambia lingua (`core/i18n/page.ts`).
const t = testi()
const G = testiComuni().gruppi

export const COMANDI_CHECK: readonly ComandoUI[] = [
  // ---------------------------------------------------------------- Check
  //
  // Le colonne si toccano una alla volta dal menu della loro testata, o tutte
  // insieme da qui. Aggiungerne una sta qui: una colonna che non c'è non ha testata.
  {
    id: 'check.nuovaColonna',
    titolo: t.aggiungiColonna,
    simbolo: 'piu',
    dove: ['check'],
    gruppo: G.check,
    aiuto: t.aggiungiColonnaAiuto,
    primario: true,
    soloSe: () => stato.ambitoCheck !== 'classe',
    impedimento: senzaCorso,
    al: () => {
      const corso = corsoDelContesto()
      if (corso) moduloColonnaCheck({ corsoId: corso.id })
    },
  },
  {
    id: 'check.colonne',
    titolo: t.colonne,
    simbolo: 'presa',
    dove: ['check'],
    gruppo: G.check,
    aiuto: t.colonneAiuto,
    soloSe: () => stato.ambitoCheck !== 'classe',
    impedimento: () => {
      const corso = corsoDelContesto()
      if (!corso) return senzaCorso()
      return checkDelCorso(stato.registro, corso.id)?.colonne.length ? null : t.senzaColonne
    },
    al: () => {
      const corso = corsoDelContesto()
      if (corso) moduloColonneCheck(corso.id)
    },
  },
]
