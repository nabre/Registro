// Il dispositivo multilingua e i suoi cataloghi. Che ogni traduzione abbia le
// chiavi e i tipi dell'italiano lo garantisce il compilatore; qui:
//
//   - come si sceglie la lingua (il sistema, la scelta a mano, il ripiego);
//   - nessuna traduzione vuota o rimasta in italiano;
//   - le scelte delle impostazioni hanno la loro frase in tutte le lingue.
//
// I cataloghi arrivano da `dist-tests/i18n.mjs`, che esbuild costruisce
// cercandoli sul disco: un catalogo nuovo entra da sé.

import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'

const i18n = await import('../../dist-tests/i18n.mjs')
const { IMPOSTAZIONI } = await import('../../dist-tests/manifest.mjs')

const { CATALOGHI, LINGUE, impostaLingua, lingua, risolviLingua, linguaDaEtichetta } = i18n

afterEach(() => impostaLingua('it'))

/** Ogni catalogo esportato dai file `.testi.ts`, con il suo nome. */
function tuttiICataloghi () {
  const trovati = []
  for (const { file, esporta } of CATALOGHI) {
    for (const [nome, valore] of Object.entries(esporta)) {
      if (typeof valore === 'function' && typeof valore.in === 'function') {
        trovati.push({ dove: `${file} › ${nome}`, catalogo: valore })
      }
    }
  }
  return trovati
}

/** Ogni foglia stringa di un catalogo, con il suo percorso. */
function foglie (valore, percorso = [], raccolte = []) {
  if (typeof valore === 'string') raccolte.push({ percorso: percorso.join('.'), testo: valore })
  else if (Array.isArray(valore)) valore.forEach((v, i) => foglie(v, [...percorso, i], raccolte))
  else if (valore && typeof valore === 'object') {
    for (const [chiave, dentro] of Object.entries(valore)) {
      foglie(dentro, [...percorso, chiave], raccolte)
    }
  }
  return raccolte
}

/** Le forme della struttura: chiavi e tipi, senza i testi. */
function forma (valore) {
  if (typeof valore === 'string') return 'testo'
  if (typeof valore === 'function') return `funzione/${valore.length}`
  if (Array.isArray(valore)) return valore.map(forma)
  if (valore && typeof valore === 'object') {
    return Object.fromEntries(Object.keys(valore).sort().map((k) => [k, forma(valore[k])]))
  }
  return typeof valore
}

/**
 * Parole che esistono solo in italiano. Due diverse nella stessa frase di una
 * traduzione vogliono dire che la frase è rimasta com'era.
 */
const SOLO_ITALIANO = /\b(della|delle|degli|dello|nella|nelle|negli|questo|questa|sono|anche|perché|più|già|dell’|all’|sull’|nell’)\b/giu

/** Quante parole solo-italiane diverse ci sono nel testo. */
function paroleItaliane (testo) {
  return new Set((testo.match(SOLO_ITALIANO) ?? []).map((p) => p.toLowerCase())).size
}

describe('la scelta della lingua', () => {
  it('«sistema» segue la prima lingua del sistema, se il registro la sa', () => {
    assert.equal(risolviLingua('sistema', ['de-CH', 'it-CH']), 'de')
    assert.equal(risolviLingua('sistema', ['fr_CH.UTF-8']), 'fr')
    assert.equal(risolviLingua('sistema', ['EN-us']), 'en')
  })

  it('una lingua che il registro non sa porta all’italiano, anche se dopo ce n’è una che sa', () => {
    assert.equal(risolviLingua('sistema', ['es-ES', 'en-US']), 'it')
    assert.equal(risolviLingua('sistema', []), 'it')
  })

  it('una lingua scelta a mano vince sul sistema', () => {
    assert.equal(risolviLingua('en', ['de-CH']), 'en')
  })

  it('un valore che non si capisce vale «sistema»', () => {
    assert.equal(risolviLingua('klingon', ['fr-CH']), 'fr')
    assert.equal(risolviLingua(undefined, ['xx']), 'it')
  })

  it('riconosce la lingua in tutte le grafie delle etichette', () => {
    assert.equal(linguaDaEtichetta('de-CH'), 'de')
    assert.equal(linguaDaEtichetta('it_CH.UTF-8'), 'it')
    assert.equal(linguaDaEtichetta('rm-CH'), null)
    assert.equal(linguaDaEtichetta(''), null)
  })

  it('senza nessuna scelta il processo parla italiano', () => {
    assert.equal(lingua(), 'it')
  })
})

describe('i formati', () => {
  it('il plurale segue la lingua: in francese lo zero è singolare', () => {
    impostaLingua('fr')
    assert.equal(i18n.perNumero(0, 'leçon', 'leçons'), 'leçon')
    impostaLingua('it')
    assert.equal(i18n.perNumero(0, 'lezione', 'lezioni'), 'lezioni')
    assert.equal(i18n.perNumero(1, 'lezione', 'lezioni'), 'lezione')
  })

  it('gli elenchi si chiudono con la congiunzione della lingua', () => {
    assert.equal(i18n.elenco(['a', 'b', 'c']), 'a, b e c')
    impostaLingua('en')
    assert.match(i18n.elenco(['a', 'b', 'c']), /^a, b,? and c$/)
    impostaLingua('de')
    assert.equal(i18n.elenco(['a', 'b', 'c']), 'a, b und c')
  })

  it('un catalogo risponde nella lingua di adesso, e in tutte a richiesta', () => {
    const { testi } = CATALOGHI.find((c) => c.file === 'src/manifest.testi.ts').esporta
    assert.equal(testi().comandi['registroDocenti.guida'], 'Guida')
    impostaLingua('de')
    assert.equal(testi().comandi['registroDocenti.guida'], 'Hilfe')
    assert.equal(testi.in('fr').comandi['registroDocenti.guida'], 'Aide')
    assert.equal(testi.tutte().length, LINGUE.length)
  })
})

describe('i cataloghi', () => {
  const tutti = tuttiICataloghi()

  it('ce n’è almeno uno', () => {
    assert.ok(tutti.length > 0)
  })

  for (const { dove, catalogo } of tutti) {
    describe(dove, () => {
      const italiano = catalogo.in('it')

      for (const altra of LINGUE.filter((l) => l !== 'it')) {
        const tradotto = catalogo.in(altra)

        it(`${altra}: ha la stessa forma dell’italiano`, () => {
          assert.deepEqual(forma(tradotto), forma(italiano))
        })

        it(`${altra}: nessun testo vuoto`, () => {
          const vuoti = foglie(tradotto).filter((f) => f.testo.trim() === '').map((f) => f.percorso)
          const vuotiInItaliano = new Set(foglie(italiano).filter((f) => f.testo.trim() === '').map((f) => f.percorso))
          assert.deepEqual(vuoti.filter((p) => !vuotiInItaliano.has(p)), [])
        })

        it(`${altra}: nessuna frase rimasta in italiano`, () => {
          const rimaste = foglie(tradotto)
            .filter((f) => paroleItaliane(f.testo) >= 2)
            .map((f) => `${f.percorso}: ${f.testo.slice(0, 80)}`)
          assert.deepEqual(rimaste, [])
        })
      }
    })
  }
})

describe('le impostazioni', () => {
  const { testi } = CATALOGHI.find((c) => c.file === 'src/manifest.testi.ts').esporta

  it('ogni scelta di ogni impostazione ha la sua frase, in ogni lingua', () => {
    const mancanti = []
    for (const [chiave, voce] of Object.entries(IMPOSTAZIONI)) {
      if (!voce.scelte || chiave === 'registroDocenti.aspetto.lingua') continue
      for (const { valore } of voce.scelte) {
        for (const l of LINGUE) {
          if (!testi.in(l).impostazioni[chiave]?.scelte?.[String(valore)]) mancanti.push(`${l} ${chiave} = ${valore}`)
        }
      }
    }
    assert.deepEqual(mancanti, [])
  })

  it('la lingua si sceglie fra «sistema» e le lingue, ognuna con il proprio nome', () => {
    const voce = IMPOSTAZIONI['registroDocenti.aspetto.lingua']
    assert.deepEqual(voce.scelte.map((s) => s.valore), ['sistema', ...LINGUE])
    // Il nome proprio davanti, e dopo i due punti come lo chiama chi legge —
    // niente, se è la lingua in cui già legge.
    assert.deepEqual(
      voce.scelte.slice(1).map((s) => s.aiuto),
      ['Italiano', 'Deutsch: Tedesco', 'Français: Francese', 'English: Inglese'],
    )
    assert.equal(voce.predefinito, 'sistema')
  })

  it('nella propria lingua una lingua si chiama col suo nome, e non si ripete', () => {
    // L'assunto di `aiutoDellaLingua` nel manifesto: a chi legge in tedesco
    // «Deutsch», non «Deutsch: Deutsch». Si controlla su `Intl` perché il manifesto
    // delle prove ha una lingua sua.
    for (const l of LINGUE) {
      const detta = new Intl.DisplayNames([i18n.LOCALI[l]], { type: 'language' }).of(l)
      assert.equal(detta.toLocaleLowerCase(), i18n.NOMI_DELLE_LINGUE[l].toLocaleLowerCase(), l)
    }
  })

  it('ogni impostazione che richiede qualcosa dice perché, in ogni lingua', () => {
    for (const [chiave, voce] of Object.entries(IMPOSTAZIONI)) {
      if (!voce.richiede) continue
      for (const l of LINGUE) assert.ok(testi.in(l).impostazioni[chiave].motivo, `${l} ${chiave}`)
    }
  })
})
