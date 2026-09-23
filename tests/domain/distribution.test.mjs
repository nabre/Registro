// Distribuire un documento, e raccoglierne uno.
//
// La prova che regge tutto è una sola: il file e il gesto sono due fatti
// distinti. Avere la pagella di Rossi non vuol dire avergliela data; Rossi che
// mi porta il certificato non vuol dire che io l'abbia già scansionato. Una
// matrice che li confonde mente in un verso o nell'altro, e sono le due bugie
// che si scoprono tardi — a colloqui coi genitori, o in segreteria.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  creaAllievo,
  creaClasse,
  creaConsegna,
  daConsegnareA,
  documentoPer,
  haFatto,
  normalizzaConsegna,
  senzaDocumento,
  siConsegna,
  testoConsegna,
} from '../../dist-tests/domain.mjs'

function classeCon (...nomi) {
  const classe = creaClasse('anno-1', 'DIC4a')
  classe.allievi = nomi.map(([cognome, nome]) => creaAllievo(cognome, nome))
  return classe
}

/** Una richiesta di documento, nel verso che si vuole. */
function richiesta (verso, allieviIds) {
  return {
    ...creaConsegna('cor-1', 'Pagella 3° anno', '2026-09-01'),
    tipo: 'consegna',
    documento: 'certificato',
    verso,
    a: 'allievi',
    allieviIds,
  }
}

const documento = (allievoId, nome = 'pagella.pdf') => ({
  allievoId,
  file: `archivio/DIC4a/docente-di-classe/Pagella 3° anno/${nome}`,
  nome,
  aggiuntoIl: '2026-09-05T08:00:00.000Z',
})

describe('i due versi di un documento', () => {
  it('distingue quel che si consegna da quel che si raccoglie', () => {
    const classe = classeCon(['Rossi', 'Mario'])
    assert.equal(siConsegna(richiesta('consegno', [classe.allievi[0].id])), true)
    assert.equal(siConsegna(richiesta('ricevo', [classe.allievi[0].id])), false)

    // Una consegna che non raccoglie nessun foglio non si consegna nemmeno.
    assert.equal(siConsegna(creaConsegna('cor-1', 'esercizi 4–7', '2026-09-01')), false)
  })
})

describe('il documento pronto per un allievo', () => {
  it('è il suo, quando ce l’ha', () => {
    const classe = classeCon(['Rossi', 'Mario'], ['Bianchi', 'Luca'])
    const [rossi, bianchi] = classe.allievi
    const consegna = {
      ...richiesta('consegno', [rossi.id, bianchi.id]),
      documenti: [documento(rossi.id, 'Rossi.pdf')],
    }

    assert.equal(documentoPer(consegna, rossi.id)?.nome, 'Rossi.pdf')
    assert.equal(documentoPer(consegna, bianchi.id), null)
  })

  it('altrimenti è quello uguale per tutti, se c’è', () => {
    const classe = classeCon(['Rossi', 'Mario'])
    const consegna = {
      ...richiesta('consegno', [classe.allievi[0].id]),
      fileTutti: 'archivio/DIC4a/docente-di-classe/Circolare/tutti.pdf',
      nomeTutti: 'circolare.pdf',
    }

    assert.equal(documentoPer(consegna, classe.allievi[0].id)?.nome, 'circolare.pdf')
  })
})

describe('chi aspetta ancora', () => {
  it('è chi ha un documento pronto e non l’ha ancora ricevuto', () => {
    const classe = classeCon(['Rossi', 'Mario'], ['Bianchi', 'Luca'], ['Verdi', 'Anna'])
    const [rossi, bianchi, verdi] = classe.allievi
    const consegna = {
      ...richiesta('consegno', [rossi.id, bianchi.id, verdi.id]),
      documenti: [documento(rossi.id), documento(bianchi.id)],
      // A Bianchi è già stata data a mano: fuori dall'elenco.
      fatte: [{ chi: bianchi.id, fattaIl: '2026-09-05T09:00:00.000Z', modo: 'mano' }],
    }

    assert.deepEqual(daConsegnareA(consegna, classe), [rossi.id])
    // Verdi non aspetta: il suo documento non c'è ancora, e spedire niente non
    // è consegnare.
    assert.deepEqual(senzaDocumento(consegna, classe), [verdi.id])
  })

  it('su una richiesta che si raccoglie non c’è niente da consegnare', () => {
    const classe = classeCon(['Rossi', 'Mario'])
    const consegna = {
      ...richiesta('ricevo', [classe.allievi[0].id]),
      documenti: [documento(classe.allievi[0].id)],
    }

    assert.deepEqual(daConsegnareA(consegna, classe), [])
  })
})

describe('il file e il gesto restano due cose', () => {
  it('i file scritti col formato di prima diventano documenti, e la spunta resta', () => {
    // Prima il file stava dentro la spunta: spuntato voleva dire archiviato, e
    // le due cose non si potevano più separare.
    const vecchia = normalizzaConsegna({
      corsoId: 'cor-1',
      testo: 'Pagella 3° anno',
      documento: 'certificato',
      a: 'allievi',
      allieviIds: ['alv-1'],
      fatte: [
        {
          chi: 'alv-1',
          fattaIl: '2026-09-02T10:00:00.000Z',
          file: 'documenti/cls-1/Rossi.pdf',
          nome: 'Rossi.pdf',
        },
      ],
    })

    assert.equal(haFatto(vecchia, 'alv-1'), true)
    assert.equal(documentoPer(vecchia, 'alv-1')?.nome, 'Rossi.pdf')
    // Il file non è più dentro la spunta: una sola verità, in un posto solo.
    assert.equal(vecchia.fatte[0].file, undefined)
  })

  it('un documento archiviato non spunta niente da sé', () => {
    const classe = classeCon(['Rossi', 'Mario'])
    const consegna = {
      ...richiesta('consegno', [classe.allievi[0].id]),
      documenti: [documento(classe.allievi[0].id)],
    }

    assert.equal(documentoPer(consegna, classe.allievi[0].id) !== null, true)
    assert.equal(haFatto(consegna, classe.allievi[0].id), false)
  })
})

describe('il testo del messaggio', () => {
  it('riempie i segnaposto che valgono in tutto il registro', () => {
    assert.equal(
      testoConsegna('In allegato {documento} di {allievo} ({classe}).', 'Rossi Mario', 'DIC4a', 'la pagella'),
      'In allegato la pagella di Rossi Mario (DIC4a).',
    )
  })
})
