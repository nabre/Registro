// Misura le prestazioni delle operazioni su bozza Immer con 20000 lezioni.
// Confronta l'esecuzione dentro il passo (inUnPasso) e fuori dal passo,
// per rendere confrontabili nel tempo le misure su:
// - lezione nuova (crea / inserimento e riordino)
// - lezione sposta (modifica data e riordino)
// - lezione duplica (duplicazione e riordino)
//
// Uso: node tools/immerBench.mjs

import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { RADICE } from './common.mjs'

const bundle = (nome) => `file:///${percorso.join(RADICE, 'dist-tests', nome).replace(/\\/g, '/')}`

// Banco di prova temporaneo
const banco = percorso.join(tmpdir(), 'registro-misura-immer')
rmSync(banco, { recursive: true, force: true })
mkdirSync(percorso.join(banco, 'userData'), { recursive: true })
mkdirSync(percorso.join(banco, 'lavoro', 'registro'), { recursive: true })
process.env.REGISTRO_USERDATA = percorso.join(banco, 'userData')
writeFileSync(
  percorso.join(banco, 'userData', 'impostazioni.json'),
  JSON.stringify({ cartellaLavoro: percorso.join(banco, 'lavoro') }),
)

const { Archivio, Uri } = await import(bundle('data.mjs'))
const d = await import(bundle('domain.mjs'))

const archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
await archivio.apri(null)

const TOTALE_LEZIONI = 20_000
const RIPETIZIONI = 10
const RISCALDAMENTO = 3

console.log(`Inizializzazione registro con ${TOTALE_LEZIONI} lezioni...`)

archivio.modifica((r) => {
  for (let i = 0; i < TOTALE_LEZIONI; i++) {
    r.lezioni.push({
      id: `lez-${i}`,
      corsoId: `cor-${i % 10}`,
      data: `2026-09-${String(1 + (i % 28)).padStart(2, '0')}`,
      slot: [{ id: `s-${i}`, inizio: '08:00', durataMin: 45 }],
      stato: 'pianificata',
      presenze: [],
      osservazioni: [],
    })
  }
  r.lezioni.sort((a, b) => a.data.localeCompare(b.data))
}, ['lezioni'])

async function misura (nome, esegui) {
  for (let i = 0; i < RISCALDAMENTO; i++) {
    await esegui(i)
  }
  const tempi = []
  for (let i = 0; i < RIPETIZIONI; i++) {
    const inizio = performance.now()
    await esegui(i)
    tempi.push(performance.now() - inizio)
  }
  const media = tempi.reduce((a, b) => a + b, 0) / tempi.length
  const min = Math.min(...tempi)
  const max = Math.max(...tempi)
  return { nome, media, min, max }
}

console.log(`Misurazione su ${RIPETIZIONI} ripetizioni (dopo ${RISCALDAMENTO} di riscaldamento)...\n`)

let idGenerato = TOTALE_LEZIONI

// 1. Sposta
const spostaDentro = await misura('sposta (dentro)', async (i) => {
  await archivio.inUnPasso(async () => {
    archivio.modifica((r) => {
      const idx = 5000 + (i * 100) % 5000
      r.lezioni[idx].data = `2026-10-${String(1 + (i % 28)).padStart(2, '0')}`
      r.lezioni.sort((a, b) => a.data.localeCompare(b.data))
    }, ['lezioni'])
  })
})

const spostaFuori = await misura('sposta (fuori)', async (i) => {
  archivio.fuoriDalPasso(() => {
    archivio.modifica((r) => {
      const idx = 5000 + (i * 100) % 5000
      r.lezioni[idx].data = `2026-10-${String(1 + (i % 28)).padStart(2, '0')}`
      r.lezioni.sort((a, b) => a.data.localeCompare(b.data))
    }, ['lezioni'])
  })
})

// 2. Crea
const creaDentro = await misura('crea (dentro)', async (i) => {
  await archivio.inUnPasso(async () => {
    archivio.modifica((r) => {
      r.lezioni.push({
        id: `lez-nuova-${++idGenerato}`,
        corsoId: 'cor-1',
        data: `2026-09-${String(1 + (i % 28)).padStart(2, '0')}`,
        slot: [{ id: `s-nuovo-${idGenerato}`, inizio: '09:00', durataMin: 45 }],
        stato: 'pianificata',
        presenze: [],
        osservazioni: [],
      })
      r.lezioni.sort((a, b) => a.data.localeCompare(b.data))
    }, ['lezioni'])
  })
})

const creaFuori = await misura('crea (fuori)', async (i) => {
  archivio.fuoriDalPasso(() => {
    archivio.modifica((r) => {
      r.lezioni.push({
        id: `lez-nuova-${++idGenerato}`,
        corsoId: 'cor-1',
        data: `2026-09-${String(1 + (i % 28)).padStart(2, '0')}`,
        slot: '09:00',
        stato: 'pianificata',
        presenze: [],
        osservazioni: [],
      })
      r.lezioni.sort((a, b) => a.data.localeCompare(b.data))
    }, ['lezioni'])
  })
})

// 3. Duplica
const duplicaDentro = await misura('duplica (dentro)', async (i) => {
  await archivio.inUnPasso(async () => {
    const origine = archivio.registro.lezioni[1000]
    const copia = d.duplicaLezione(origine, `2026-10-${String(1 + (i % 28)).padStart(2, '0')}`)
    archivio.modifica((r) => {
      r.lezioni.push(copia)
      r.lezioni.sort((a, b) => a.data.localeCompare(b.data))
    }, ['lezioni'])
  })
})

const duplicaFuori = await misura('duplica (fuori)', async (i) => {
  archivio.fuoriDalPasso(() => {
    const origine = archivio.registro.lezioni[1000]
    const copia = d.duplicaLezione(origine, `2026-10-${String(1 + (i % 28)).padStart(2, '0')}`)
    archivio.modifica((r) => {
      r.lezioni.push(copia)
      r.lezioni.sort((a, b) => a.data.localeCompare(b.data))
    }, ['lezioni'])
  })
})

console.log('| Operazione | Media (ms) | Min (ms) | Max (ms) | Obiettivo |')
console.log('| --- | ---: | ---: | ---: | --- |')
for (const ris of [spostaDentro, spostaFuori, creaDentro, creaFuori, duplicaDentro, duplicaFuori]) {
  const ok = ris.media <= 25 ? '✓ ≤ 22 ms' : '⚠ > 22 ms'
  console.log(`| ${ris.nome.padEnd(18)} | ${ris.media.toFixed(2).padStart(10)} | ${ris.min.toFixed(2).padStart(8)} | ${ris.max.toFixed(2).padStart(8)} | ${ok} |`)
}

console.log('\nRiepilogo:')
console.log(`- sposta:  dentro ${spostaDentro.media.toFixed(2)} ms, fuori ${spostaFuori.media.toFixed(2)} ms (rapporto ${(spostaFuori.media / spostaDentro.media).toFixed(2)}x)`)
console.log(`- crea:    dentro ${creaDentro.media.toFixed(2)} ms, fuori ${creaFuori.media.toFixed(2)} ms (rapporto ${(creaFuori.media / creaDentro.media).toFixed(2)}x)`)
console.log(`- duplica: dentro ${duplicaDentro.media.toFixed(2)} ms, fuori ${duplicaFuori.media.toFixed(2)} ms (rapporto ${(duplicaFuori.media / duplicaDentro.media).toFixed(2)}x)`)

rmSync(banco, { recursive: true, force: true })
