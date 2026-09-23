// Le icone come le vedono electron-builder e Windows, lette dai file veri.
//
// L'icona è la cosa che va storta in silenzio: in sviluppo tutto a posto, e il
// guasto compare solo costruendo per un'altra piattaforma o guardando la barra
// del titolo con lo schermo al 125%. Qui si tengono fermi i tre modi in cui è
// già successo:
//
// - `fileAssociations[].icon` puntava a `icons/icon.ico`: su macOS
//   electron-builder cambia l'estensione in `.icns`, non trova il file e ferma
//   la build;
// - il tipo MIME era `application/zip`, e su Linux il registro si proponeva
//   per aprire ogni archivio;
// - il `.ico` non aveva la 20 e la 40, le misure dello schermo al 125%.

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const radice = fileURLToPath(new URL('../../', import.meta.url))
const file = (relativo) => `${radice}${relativo}`

/** `electron-builder.json` ha solo commenti di riga: toglierli basta. */
function configurazione () {
  const senzaCommenti = readFileSync(file('electron-builder.json'), 'utf8')
    .split('\n')
    .map((riga) => riga.replace(/^\s*\/\/.*/, ''))
    .join('\n')
  return JSON.parse(senzaCommenti)
}

/** Le voci dell'indice di un `.ico`: la misura dichiarata e quella del PNG. */
function vociIco (byte) {
  assert.equal(byte.readUInt16LE(2), 1, 'non è un .ico')
  const voci = []
  for (let i = 0; i < byte.readUInt16LE(4); i++) {
    const voce = 6 + 16 * i
    const inizio = byte.readUInt32LE(voce + 12)
    voci.push({
      dichiarata: byte[voce] || 256,
      larga: byte.readUInt32BE(inizio + 16),
      alta: byte.readUInt32BE(inizio + 20),
    })
  }
  return voci
}

describe('le icone del pacchetto', () => {
  const config = configurazione()

  it('ogni piattaforma ha il suo formato, e il file c’è', () => {
    for (const [piattaforma, estensione] of [['win', '.ico'], ['mac', '.png'], ['linux', '.png']]) {
      const icona = config[piattaforma].icon
      assert.ok(icona.endsWith(estensione), `${piattaforma}.icon deve essere ${estensione}: è ${icona}`)
      assert.ok(existsSync(file(icona)), `${piattaforma}.icon: ${icona} non c’è`)
    }
  })

  it('i documenti non chiedono un’icona che su macOS non esiste', () => {
    for (const associazione of config.fileAssociations) {
      if (associazione.icon === undefined) continue
      // electron-builder scambia `.ico` e `.icns` a seconda della piattaforma:
      // un'icona propria vuole tutti e due i file.
      const base = associazione.icon.replace(/\.(ico|icns)$/, '')
      for (const estensione of ['.ico', '.icns']) {
        assert.ok(existsSync(file(base + estensione)), `manca ${base}${estensione}: la build lo cerca`)
      }
    }
  })

  it('i documenti hanno un tipo MIME loro, non quello di ogni zip', () => {
    for (const associazione of config.fileAssociations) {
      assert.notEqual(associazione.mimeType, 'application/zip')
      assert.match(associazione.mimeType, /^application\/x-/)
    }
  })
})

describe('il .ico', () => {
  const voci = vociIco(readFileSync(file('icons/icon.ico')))

  it('ha le misure che Windows chiede, anche al 125%', () => {
    const misure = voci.map((voce) => voce.dichiarata)
    for (const misura of [16, 20, 24, 32, 40, 48, 256]) {
      assert.ok(misure.includes(misura), `manca la ${misura}: ci sono ${misure.join(', ')}`)
    }
  })

  it('ogni voce contiene davvero l’immagine della misura che dichiara', () => {
    for (const { dichiarata, larga, alta } of voci) {
      assert.deepEqual([larga, alta], [dichiarata, dichiarata])
    }
  })
})

describe('l’identità del portabile', () => {
  it('chi la registra e chi la toglie la chiamano allo stesso modo', () => {
    // Scritta in `HKCU\Software\Classes\AppUserModelId` da una parte, tolta da
    // «Disinstalla…» dall'altra: se i nomi divergono la chiave resta per sempre.
    const suffisso = (testo, davanti) =>
      new RegExp(`${davanti}\`\\$\\{IDENTITA\\}(\\.[a-z]+)\``).exec(testo)?.[1]
    const scrive = suffisso(readFileSync(file('src/environment/notifications.ts'), 'utf8'), 'IDENTITA_PORTABILE = ')
    const toglie = suffisso(readFileSync(file('src/cli/disinstalla.mjs'), 'utf8'), 'REGISTRO_AUMID: portabile \\? ')
    assert.ok(scrive, 'notifications.ts non dichiara più l’identità del portabile')
    assert.equal(toglie, scrive)
  })
})

describe('il .png', () => {
  it('è almeno 512: è il minimo di electron-builder per l’.icns di macOS', () => {
    const byte = readFileSync(file('icons/icon.png'))
    assert.ok(byte.readUInt32BE(16) >= 512 && byte.readUInt32BE(20) >= 512)
  })
})
