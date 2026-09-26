// Le notifiche di sistema si tengono in vita fino al clic, o il raccoglitore
// le porterebbe via. Qui un `electron` finto con una `Notification` comandata
// dalla prova.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { ELECTRON_CON_NOTIFICHE, importaSorgente } from '../helpers/sorgente.mjs'

describe('le notifiche restano in mano finché servono', () => {
  it('tiene la notifica viva fino al clic, e il clic arriva', async () => {
    globalThis.__notifiche = []
    const { avvisa, notificheVive } = await importaSorgente('src/environment/notifications.ts', {
      finti: { electron: ELECTRON_CON_NOTIFICHE },
    })
    let premuta = 0
    avvisa({ titolo: 'DIC4a', corpo: 'fra cinque minuti', al: () => { premuta += 1 } })
    avvisa({ titolo: 'MAT2b', corpo: 'fra cinque minuti' })
    assert.equal(notificheVive(), 2)

    const [prima, seconda] = globalThis.__notifiche
    prima.emetti('click')
    assert.equal(premuta, 1)
    assert.equal(notificheVive(), 1)
    seconda.emetti('failed')
    assert.equal(notificheVive(), 0)
    delete globalThis.__notifiche
  })

  it('ritirarla la lascia andare', async () => {
    globalThis.__notifiche = []
    const { avvisa, notificheVive } = await importaSorgente('src/environment/notifications.ts', {
      finti: { electron: ELECTRON_CON_NOTIFICHE },
    })
    const ritiro = avvisa({ titolo: 'x', corpo: 'y' })
    assert.equal(notificheVive(), 1)
    ritiro.chiudi()
    assert.equal(notificheVive(), 0)
    delete globalThis.__notifiche
  })
})
