// Rigenera il documento campione: `npm run sample`.
//
// `tests/samples/2026-2027.regi` è un anno finto (una classe, tre persone in
// formazione, un corso, tre ore, una verifica) scritto dall'archivio vero. Si
// guarda dentro rinominandolo `.zip`, e `tests/data/sample.test.mjs` lo riapre
// per accorgersi che il formato ha reso illeggibili i documenti già scritti.
//
// I dati sono inventati e devono restarlo: i documenti veri stanno in
// `registro/`, in `.gitignore`. Si rigenera solo quando il formato cambia
// apposta.
//
// Fissa anche `tests/samples/formato/v<N>.regi` per la versione dei dati
// corrente, se non c'è ancora; quelli esistenti non si riscrivono mai.
// `tests/data/formatUpgrade.test.mjs` li porta tutti al formato corrente e
// pretende quello di `VERSIONE_DATI`.

import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'

import { RADICE } from './common.mjs'

const DESTINAZIONE = percorso.join(RADICE, 'tests', 'samples', '2026-2027.regi')
const STORIA = percorso.join(RADICE, 'tests', 'samples', 'formato')

/**
 * L'archivio gira sui bundle di prova, con `electron` finto, per lavorare fuori
 * da una finestra. `npm run sample` li ricostruisce prima.
 */
const bundle = (nome) => `file:///${percorso.join(RADICE, 'dist-tests', nome).replace(/\\/g, '/')}`

// Una cartella di lavoro usa e getta: il campione nasce lì e viene copiato.
const banco = percorso.join(tmpdir(), 'registro-campione')
rmSync(banco, { recursive: true, force: true })
mkdirSync(percorso.join(banco, 'userData'), { recursive: true })
mkdirSync(percorso.join(banco, 'lavoro', 'registro'), { recursive: true })
process.env.REGISTRO_USERDATA = percorso.join(banco, 'userData')
writeFileSync(
  percorso.join(banco, 'userData', 'impostazioni.json'),
  JSON.stringify({ cartellaLavoro: percorso.join(banco, 'lavoro') }),
)

// `data.mjs`: lo stesso grafo delle prove, con anno in uso e deposito in una
// copia sola (vedi `tests/helpers/data.ts`).
const { Archivio, Uri } = await import(bundle('data.mjs'))
const d = await import(bundle('domain.mjs'))

const archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
await archivio.apri(null)

const documento = percorso.join(banco, 'lavoro', 'registro', '2026-2027.regi')
const anno = await archivio.creaAnno(d.creaAnno('2026-09-01', '2027-06-30'), Uri.file(documento))
if (!anno) throw new Error("l'anno del campione non si è creato")
const materia = d.creaMateria('Calcolo professionale', 'CAL')
const classe = d.creaClasse(anno.id, 'I MEC A')
classe.allievi.push(
  d.creaAllievo('Rossi', 'Maria'),
  d.creaAllievo('Bianchi', 'Luca'),
  d.creaAllievo('Verdi', 'Anna'),
)
const corso = d.creaCorso(classe.id, materia.id, 'Calcolo professionale — I MEC A')

const lezioni = ['2026-09-07', '2026-09-14', '2026-09-21'].map((data) =>
  d.creaLezione(corso.id, data, '08:20', 45),
)
lezioni[0].argomenti = 'Unità di misura e conversioni'
// Le pause della giornata e la durata dell'UD sono scritte esplicitamente nel campione.
const conImpostazioni = (impostazioni) => ({
  ...impostazioni,
  minutiUd: 45,
  pause: { prima: { inizio: '09:50', durataMin: 15 }, seguenti: [{ dopoUd: 2, durataMin: 10 }] },
})
lezioni[0].consuntivo = 'Fatti gli esercizi 1–8. Restano da riprendere le potenze di dieci.'
lezioni[0].stato = 'svolta'

const valutazione = d.creaValutazione(corso.id, 'Verifica 1 — unità di misura')
valutazione.data = '2026-09-21'

archivio.modifica(
  (registro) => {
    registro.impostazioni = conImpostazioni(registro.impostazioni)
    registro.materie.push(materia)
    registro.classi.push(classe)
    registro.corsi.push(corso)
    registro.lezioni.push(...lezioni)
    registro.valutazioni.push(valutazione)
  },
  ['registro', 'classi', 'corsi', 'lezioni', 'valutazioni'],
)
await archivio.salva()

// Una seconda modifica salvata a parte, perché il campione abbia anche una copia in `.storico/`.
archivio.modifica((registro) => {
  registro.lezioni[1].argomenti = 'Potenze di dieci'
}, ['lezioni'])
await archivio.salva()
await archivio.chiudi()

mkdirSync(percorso.dirname(DESTINAZIONE), { recursive: true })
copyFileSync(documento, DESTINAZIONE)
mkdirSync(STORIA, { recursive: true })
const diQuestaVersione = percorso.join(STORIA, `v${d.VERSIONE_DATI}.regi`)
if (existsSync(diQuestaVersione)) {
  console.log(`campione del formato ${d.VERSIONE_DATI} già fissato: ${percorso.relative(RADICE, diQuestaVersione)}`)
} else {
  copyFileSync(documento, diQuestaVersione)
  console.log(`campione del formato ${d.VERSIONE_DATI} fissato: ${percorso.relative(RADICE, diQuestaVersione)}`)
}
rmSync(banco, { recursive: true, force: true })
console.log(`campione scritto: ${percorso.relative(RADICE, DESTINAZIONE)}`)
