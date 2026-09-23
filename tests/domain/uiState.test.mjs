import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { build } from 'esbuild'

const bundle = await build({ entryPoints: [fileURLToPath(new URL('../../src/environment/uiState.ts', import.meta.url))], bundle: true, write: false, platform: 'node', format: 'esm' })
const { gestisciStatoInterfaccia: stato } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)

test('le preferenze sopravvivono alla riapertura e restano separate per pannello', () => {
  const radice = mkdtempSync(join(tmpdir(), 'registro-interfaccia-'))
  try {
    assert.equal(stato(radice, 'registro', 'leggi'), null)
    const preferenze = { vista: 'docenteClasse', schedaDocente: 'assenze', filtroTodoClasse: 'mie', sidebarDesktop: false, data: '2026-09-14' }
    assert.equal(stato(radice, 'registro', 'scrivi', preferenze), true)
    assert.deepEqual(JSON.parse(readFileSync(join(radice, 'interfaccia/registro.json'), 'utf8')), preferenze)
    assert.deepEqual(stato(radice, 'registro', 'leggi'), preferenze)
    assert.equal(stato(radice, 'proiezione', 'leggi'), null)
    assert.equal(stato(radice, 'registro', 'scrivi', { ...preferenze, vista: 'calendario' }), true)
    assert.equal(stato(radice, 'registro', 'leggi').vista, 'calendario')
    assert.equal(stato(radice, 'registro', 'scrivi', 'non valido'), null)
    assert.equal(stato(radice, 'registro', 'scrivi', { ricerca: 'a'.repeat(256001) }), null)
    assert.equal(stato(radice, 'registro', 'leggi').vista, 'calendario')
    writeFileSync(join(radice, 'interfaccia/registro.json'), '{rotto')
    assert.equal(stato(radice, 'registro', 'leggi'), null)
  } finally {
    rmSync(radice, { recursive: true, force: true })
  }
})

const renderer = await build({ entryPoints: [fileURLToPath(new URL('../../src/ui/state.ts', import.meta.url))], bundle: true, write: false, platform: 'browser', format: 'iife', globalName: 'interfaccia' })
test('una nuova finestra ripristina pagina, filtri e selezioni dal ponte', () => {
  let salvato = null
  const apri = () => {
    const ambiente = { navigator: { onLine: true }, window: { addEventListener () {} }, acquireVsCodeApi: () => ({ getState: () => salvato, setState: (valore) => { salvato = JSON.parse(JSON.stringify(valore)) } }) }
    runInNewContext(renderer.outputFiles[0].text, ambiente)
    return ambiente.interfaccia
  }
  const prima = apri()
  const preferenze = { vista: 'docenteClasse', paginaId: 'pagina.classe.assenze', schedaDocente: 'assenze', filtroTodoClasse: 'tutte', sidebarDesktop: false, modoCalendario: 'mese', data: '2026-10-02', ricerca: 'Rossi', classeId: 'classe-1', corsoId: 'corso-1', semestreId: 'semestre-1', allievoId: 'allievo-1', filtroClasseId: 'classe-1', filtroCorsoAgendaId: 'corso-1' }
  prima.aggiorna(preferenze)
  prima.aggiorna({ documentiScelti: ['esportazioni/a.pdf', 'esportazioni/b.pdf'] })
  const seconda = apri()
  for (const [chiave, valore] of Object.entries(preferenze)) assert.equal(seconda.stato[chiave], valore, chiave)
  assert.deepEqual(Array.from(seconda.stato.documentiScelti), ['esportazioni/a.pdf', 'esportazioni/b.pdf'])
})
