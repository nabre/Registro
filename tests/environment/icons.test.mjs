// Le icone come le vedono electron-builder e Windows, lette dai file veri:
//
// - l'icona di `fileAssociations[]` esiste sia `.ico` sia `.icns`:
//   electron-builder cambia l'estensione a seconda della piattaforma;
// - il tipo MIME non è `application/zip`, o su Linux il registro si
//   proporrebbe per ogni archivio;
// - il `.ico` ha anche la 20 e la 40, le misure dello schermo al 125%.

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
    for (const [piattaforma, estensione] of [['win', '.ico'], ['mac', '.icns']]) {
      const icona = config[piattaforma].icon
      assert.ok(icona.endsWith(estensione), `${piattaforma}.icon deve essere ${estensione}: è ${icona}`)
      assert.ok(existsSync(file(icona)), `${piattaforma}.icon: ${icona} non c’è`)
    }
  })

  it('Linux ha la serie di PNG, un file per misura col nome che electron-builder cerca', () => {
    const cartella = config.linux.icon
    for (const misura of [16, 32, 48, 64, 128, 256, 512]) {
      const png = `${cartella}/${misura}x${misura}.png`
      assert.ok(existsSync(file(png)), `manca ${png}`)
      const byte = readFileSync(file(png))
      assert.deepEqual([byte.readUInt32BE(16), byte.readUInt32BE(20)], [misura, misura], png)
    }
  })

  it('le immagini del cassetto di macOS entrano nel pacchetto', () => {
    for (const nome of ['icons/trayTemplate.png', 'icons/trayTemplate@2x.png']) {
      assert.ok(existsSync(file(nome)), `${nome} non c’è`)
      assert.ok(config.files.includes(nome), `${nome} non è fra i \`files\``)
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
    // Scritta in `HKCU\Software\Classes\AppUserModelId` da una parte e tolta da
    // «Disinstalla…» dall'altra: i nomi devono coincidere.
    const suffisso = (testo, davanti) =>
      new RegExp(`${davanti}\`\\$\\{IDENTITA\\}(\\.[a-z]+)\``).exec(testo)?.[1]
    const scrive = suffisso(readFileSync(file('src/environment/notifications.ts'), 'utf8'), 'IDENTITA_PORTABILE = ')
    const toglie = suffisso(readFileSync(file('src/cli/disinstalla.mjs'), 'utf8'), 'REGISTRO_AUMID: portabile \\? ')
    assert.ok(scrive, 'notifications.ts non dichiara più l’identità del portabile')
    assert.equal(toglie, scrive)
  })
})

describe('l’.icns', () => {
  it('è un .icns e arriva alla 1024, la 512 del Retina', () => {
    const byte = readFileSync(file('icons/icon.icns'))
    assert.equal(byte.toString('ascii', 0, 4), 'icns')
    assert.equal(byte.readUInt32BE(4), byte.length)
    const tipi = []
    for (let i = 8; i < byte.length; i += byte.readUInt32BE(i + 4)) tipi.push(byte.toString('ascii', i, i + 4))
    for (const tipo of ['ic07', 'ic08', 'ic09', 'ic10']) assert.ok(tipi.includes(tipo), `manca ${tipo}: ci sono ${tipi.join(', ')}`)
  })
})

describe('il .png', () => {
  it('è almeno 512: è il minimo di electron-builder per l’.icns di macOS', () => {
    const byte = readFileSync(file('icons/icon.png'))
    assert.ok(byte.readUInt32BE(16) >= 512 && byte.readUInt32BE(20) >= 512)
  })
})

describe('i vettori che le pagine leggono da resources/', () => {
  // Le pagine chiedono le icone a `registro://app/resources/`: un nome cambiato
  // in `tools/icons.cjs` lascerebbe un'immagine rotta.
  const letti = [
    ['src/ui/components/logo.ts', 'resources/registro-app-piccola.svg'],
    ['shell/pages/splash/splash.html', 'resources/registro-app.svg'],
    ['shell/pages/welcome/welcome.html', 'resources/registro-fascia.svg'],
  ]
  for (const [chi, cosa] of letti) {
    it(`${chi} legge ${cosa}, e il file c'è`, () => {
      assert.ok(readFileSync(file(chi), 'utf8').includes(cosa), `${chi} non nomina più ${cosa}`)
      assert.ok(existsSync(file(cosa)), `${cosa} manca: npm run icons`)
    })
  }

  it('le pagine del guscio che mostrano un\'immagine la lasciano passare dalla CSP', () => {
    for (const pagina of ['shell/pages/splash/splash.html', 'shell/pages/welcome/welcome.html']) {
      assert.match(readFileSync(file(pagina), 'utf8'), /img-src registro:/, pagina)
    }
  })

  it('la fascia del benvenuto è la stessa della procedura, senza il nome', () => {
    const fascia = readFileSync(file('resources/registro-fascia.svg'), 'utf8')
    assert.match(fascia, /viewBox="0 0 164 1200"/)
    assert.doesNotMatch(fascia, /<text/)
  })
})
