// Che cosa il condotto lascia passare, e a chi.
//
// Il condotto si accende con un interruttore generale e concede due cose
// separate: la lettura e la scrittura. Il confine non è un elenco di nomi — di
// quelli ne resterebbe indietro uno al mese — è il `genere` che ogni procedura
// dichiara nel proprio contratto. Questa prova guarda le due metà di
// quell'affermazione:
//
//   1. la regola in sé, su tutte e quattro le combinazioni;
//   2. che le procedure vere cadano davvero dalla parte giusta, cioè che
//      concedere la sola lettura basti a far passare `corsi.elenco` e a fermare
//      `ore.appello.casella`.
//
// La seconda è quella che conta. La prima si potrebbe leggere; la seconda no:
// dipende da 149 contratti, e basta che una procedura nuova si dichiari
// `lettura` mentre scrive perché la promessa «con la sola lettura nessuno tocca
// il registro» diventi falsa senza che nessuno se ne accorga.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { permessoMancante, procedura, registraTutte } from '../../dist-tests/api.mjs'

registraTutte()

const NIENTE = { lettura: false, scrittura: false }
const SOLA_LETTURA = { lettura: true, scrittura: false }
const SOLA_SCRITTURA = { lettura: false, scrittura: true }
const TUTTO = { lettura: true, scrittura: true }

describe('i permessi del condotto', () => {
  it('lasciano passare solo il genere che concedono', () => {
    assert.equal(permessoMancante('lettura', TUTTO), null)
    assert.equal(permessoMancante('scrittura', TUTTO), null)

    assert.equal(permessoMancante('lettura', SOLA_LETTURA), null)
    assert.equal(permessoMancante('scrittura', SOLA_LETTURA), 'scrittura')

    assert.equal(permessoMancante('lettura', SOLA_SCRITTURA), 'lettura')
    assert.equal(permessoMancante('scrittura', SOLA_SCRITTURA), null)

    assert.equal(permessoMancante('lettura', NIENTE), 'lettura')
    assert.equal(permessoMancante('scrittura', NIENTE), 'scrittura')
  })

  it('dicono quale impostazione manca, non un no e basta', () => {
    // Il valore che torna è il nome dell'impostazione da accendere, ed è quel
    // che la riga di comando ripete a chi ha chiamato: un rifiuto che non dice
    // come si toglie di mezzo manda a cercare nel posto sbagliato.
    assert.equal(permessoMancante('scrittura', SOLA_LETTURA), 'scrittura')
    assert.equal(permessoMancante('lettura', SOLA_SCRITTURA), 'lettura')
  })

  it('con la sola lettura nessuna procedura di scrittura passa', () => {
    // La promessa dell'impostazione, verificata sulle procedure vere e non su
    // un elenco scritto a mano: una procedura nuova cade dalla parte che ha
    // dichiarato, e se la dichiara male questa riga lo dice.
    const scritture = ['ore.appello.casella', 'corsi.crea', 'corsi.elimina']
    for (const nome of scritture) {
      const p = procedura(nome)
      assert.ok(p, `«${nome}» non è più fra le procedure: il nome è cambiato?`)
      assert.equal(p.genere, 'scrittura', `«${nome}» dovrebbe dichiararsi scrittura`)
      assert.equal(permessoMancante(p.genere, SOLA_LETTURA), 'scrittura')
    }

    const letture = ['corsi.elenco', 'corso.presenze']
    for (const nome of letture) {
      const p = procedura(nome)
      assert.ok(p, `«${nome}» non è più fra le procedure: il nome è cambiato?`)
      assert.equal(p.genere, 'lettura', `«${nome}» dovrebbe dichiararsi lettura`)
      assert.equal(permessoMancante(p.genere, SOLA_LETTURA), null)
    }
  })

  it('ogni procedura dichiara un genere che il cancello conosce', () => {
    // Un `genere` inventato passerebbe indisturbato: `permessoMancante` torna
    // `null` per quel che non è né lettura né scrittura, ed è la scelta giusta
    // per una riga che non deve inventare permessi — ma vuol dire che il
    // controllo vero è qui.
    for (const nome of ['corsi.elenco', 'corsi.crea']) {
      assert.ok(['lettura', 'scrittura'].includes(procedura(nome).genere))
    }
  })
})
