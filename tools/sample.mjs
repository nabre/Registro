// Rigenera il documento campione: `npm run sample`.
//
// In `tests/samples/2026-2027.registro` c'è un anno finto — una classe, tre
// persone in formazione, un corso, tre ore e una verifica — dentro un documento
// vero, scritto dall'archivio vero. Serve a due cose:
//
//   - a chi apre il repo e vuole vedere che cos'è un `.registro` senza doversi
//     costruire un anno: si rinomina in `.zip` e si guarda dentro;
//   - alla prova `tests/data/sample.test.mjs`, che lo riapre a ogni giro. È
//     il solo modo di accorgersi che una modifica al formato ha reso illeggibili
//     i documenti scritti prima — un difetto che altrimenti si scoprirebbe da un
//     docente che non riapre più il proprio anno.
//
// I dati sono inventati e devono restarlo. I documenti veri stanno in
// `registro/`, che è in `.gitignore` per la ragione ovvia: dentro ci sono nomi,
// voti e assenze di persone.
//
// Si rigenera quando il formato cambia apposta, e non prima: un campione
// riscritto a ogni build non proverebbe più niente sul passato.

import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = percorso.dirname(fileURLToPath(import.meta.url))
const APP = percorso.resolve(QUI, '..')
const DESTINAZIONE = percorso.join(APP, 'tests', 'samples', '2026-2027.registro')

/**
 * L'archivio gira sui bundle di prova — quelli con `electron` finto — perché è
 * l'unico modo di farlo lavorare fuori da una finestra. `npm run sample` li
 * ricostruisce prima di arrivare qui.
 */
const bundle = (nome) => `file:///${percorso.join(APP, 'dist-tests', nome).replace(/\\/g, '/')}`

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

const { Archivio } = await import(bundle('archivio.mjs'))
const d = await import(bundle('dominio.mjs'))

const archivio = new Archivio()
await archivio.carica()

const anno = await archivio.creaAnno(d.creaAnno('2026-09-01', '2027-06-30'))
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
lezioni[0].consuntivo = 'Fatti gli esercizi 1–8. Restano da riprendere le potenze di dieci.'
lezioni[0].stato = 'svolta'

const valutazione = d.creaValutazione(corso.id, 'Verifica 1 — unità di misura')
valutazione.data = '2026-09-21'

archivio.modifica(
  (registro) => {
    registro.materie.push(materia)
    registro.classi.push(classe)
    registro.corsi.push(corso)
    registro.lezioni.push(...lezioni)
    registro.valutazioni.push(valutazione)
  },
  ['registro', 'classi', 'corsi', 'lezioni', 'valutazioni'],
)
await archivio.salva()

// Una seconda modifica salvata a parte: così il campione porta anche una copia
// in `.storico/`, che è metà di quel che c'è da mostrare di questo formato.
archivio.modifica((registro) => {
  registro.lezioni[1].argomenti = 'Potenze di dieci'
}, ['lezioni'])
await archivio.salva()
await archivio.chiudi()

mkdirSync(percorso.dirname(DESTINAZIONE), { recursive: true })
copyFileSync(percorso.join(banco, 'lavoro', 'registro', `${anno.cartella}.registro`), DESTINAZIONE)
rmSync(banco, { recursive: true, force: true })
console.log(`campione scritto: ${percorso.relative(APP, DESTINAZIONE)}`)
