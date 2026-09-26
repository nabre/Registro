// Che cosa il condotto lascia passare: lettura e scrittura si concedono a
// parte, e il confine è il `genere` che ogni procedura dichiara. Si provano la
// regola sulle quattro combinazioni e le procedure vere: con la sola lettura
// passa `corsi.elenco` e si ferma `ore.appello.casella`.

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
    // Torna il nome dell'impostazione da accendere, che la riga di comando ripete.
    assert.equal(permessoMancante('scrittura', SOLA_LETTURA), 'scrittura')
    assert.equal(permessoMancante('lettura', SOLA_SCRITTURA), 'lettura')
  })

  it('con la sola lettura nessuna procedura di scrittura passa', () => {
    // Sulle procedure vere, non su un elenco scritto a mano.
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
    // `permessoMancante` torna `null` per un genere né lettura né scrittura: il
    // controllo che il genere sia valido è qui.
    for (const nome of ['corsi.elenco', 'corsi.crea']) {
      assert.ok(['lettura', 'scrittura'].includes(procedura(nome).genere))
    }
  })
})
