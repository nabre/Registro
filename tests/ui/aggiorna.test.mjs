// `aggiorna` avvisa gli iscritti (e quindi ridisegna) solo quando qualcosa
// cambia davvero: un valore uguale non rifà la pagina e non riscrive quel che
// si ricorda. `ridisegna` è il modo esplicito di rifarla senza cambiare niente.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { apriInterfaccia } from '../helpers/statoInterfaccia.mjs'

/** Un'interfaccia nuova, con il conto degli avvisi e delle scritture nel ponte. */
function apri () {
  const conti = { avvisi: 0, scritture: 0 }
  const interfaccia = apriInterfaccia({
    getState: () => null,
    setState: () => { conti.scritture += 1 },
  })
  interfaccia.iscriviti(() => { conti.avvisi += 1 })
  return { interfaccia, conti }
}

describe('aggiorna confronta prima di avvisare', () => {
  it('un valore identico non avvisa e non ricorda', () => {
    const { interfaccia, conti } = apri()
    interfaccia.aggiorna({ ricerca: 'Rossi' })
    assert.equal(conti.avvisi, 1)
    const scritture = conti.scritture
    interfaccia.aggiorna({ ricerca: 'Rossi' })
    interfaccia.aggiorna({ ricerca: 'Rossi', vista: interfaccia.stato.vista })
    assert.equal(conti.avvisi, 1)
    assert.equal(conti.scritture, scritture)
  })

  it('basta una chiave cambiata per avvisare', () => {
    const { interfaccia, conti } = apri()
    interfaccia.aggiorna({ ricerca: 'Rossi', data: interfaccia.stato.data })
    assert.equal(conti.avvisi, 1)
    assert.equal(interfaccia.stato.ricerca, 'Rossi')
  })

  it('lo stesso oggetto non è un cambio; uno nuovo sì', () => {
    const { interfaccia, conti } = apri()
    const scelti = interfaccia.stato.documentiScelti
    interfaccia.aggiorna({ documentiScelti: scelti })
    assert.equal(conti.avvisi, 0)
    interfaccia.aggiorna({ documentiScelti: [...scelti] })
    assert.equal(conti.avvisi, 1)
  })

  it('ridisegna avvisa senza cambiare lo stato né ricordare', () => {
    const { interfaccia, conti } = apri()
    const scritture = conti.scritture
    interfaccia.ridisegna()
    assert.equal(conti.avvisi, 1)
    assert.equal(conti.scritture, scritture)
  })
})

// L'orologio: il minuto nuovo non ridisegna, lo sente solo chi segna l'ora
// (`alMinuto` in `orologio.ts`); il giorno nuovo sì. Stato e orologio nello
// stesso pacchetto, perché gli iscritti di `alMinuto` sono quelli che `batti` chiama.
describe('il battito dell’orologio', async () => {
  const { build } = await import('esbuild')
  const { runInNewContext } = await import('node:vm')
  const { fileURLToPath } = await import('node:url')
  const cartella = fileURLToPath(new URL('../../ui/pannello/', import.meta.url))
  const pacchetto = await build({
    stdin: {
      contents: "export * from './state.ts'\nexport { alMinuto } from './orologio.ts'",
      resolveDir: cartella,
      loader: 'ts',
    },
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    globalName: 'interfaccia',
  })

  it('un battito nello stesso giorno non ridisegna e avvisa chi segna l’ora', () => {
    const battiti = []
    const ambiente = {
      navigator: { onLine: true },
      window: { addEventListener () {} },
      document: { addEventListener () {}, activeElement: null, querySelector: () => null },
      HTMLTextAreaElement: class {},
      HTMLInputElement: class {},
      setInterval: (fn) => { battiti.push(fn); return 0 },
      clearInterval () {},
      acquireVsCodeApi: () => ({ getState: () => null, setState () {} }),
    }
    runInNewContext(pacchetto.outputFiles[0].text, ambiente)
    const ui = ambiente.interfaccia
    let avvisi = 0
    const minuti = []
    ui.iscriviti(() => { avvisi += 1 })
    ui.alMinuto((ora) => minuti.push(ora))
    ui.avviaOrologio()
    // Un minuto che non è quello di adesso, lo stesso giorno.
    ui.stato.adessoOra = '99:99'
    battiti[0]()
    assert.equal(avvisi, 0)
    assert.equal(minuti.length, 1)
    assert.equal(ui.stato.adessoOra, minuti[0])
    // Un altro giorno: si ridisegna, e il minuto non si annuncia a parte.
    ui.stato.adessoData = '2000-01-01'
    battiti[0]()
    assert.equal(avvisi, 1)
    assert.equal(minuti.length, 1)
  })
})
