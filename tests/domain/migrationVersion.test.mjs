// La versione dei dati legata alla forma dei dati. Un registro più vecchio
// rifiuta un documento con `VERSIONE_DATI` più alta; con la stessa lo apre, la
// normalizzazione butta i campi che non conosce e la prima scrittura li
// cancella. Quindi un campo nuovo vuole il numero alzato.
//
// Si tiene l'impronta della forma (ogni campo raggiungibile da `Registro`,
// letto dai tipi di `models.ts` col compilatore) accanto al numero, in
// `migrationImpronta.json`: un campo in più con lo stesso numero è rosso.
// Alzato il numero, l'impronta si riscrive con
//
//     AGGIORNA_IMPRONTA=1 npm test
//
// Un campo tolto non vuole il numero più alto, ma l'impronta va riscritta. Il
// resto del giro (passi in `src/domain/upgrades.ts`, campioni in
// `tests/samples/formato/`) lo racconta la skill `formato`.

import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import ts from 'typescript'

const RADICE = fileURLToPath(new URL('../..', import.meta.url))
const MODELLI = `${RADICE}src/domain/models.ts`
const IMPRONTA = fileURLToPath(new URL('./migrationImpronta.json', import.meta.url))

/**
 * I campi raggiungibili da `Registro`, come percorsi:
 * `impostazioni.intestazione.carte[].sede`. Dal compilatore, non da una regex:
 * i tipi arrivano da altri file, stanno in unioni e `Record`, e un commento
 * non è un campo.
 */
function campiDelRegistro () {
  const programma = ts.createProgram([MODELLI], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.Node16,
    moduleResolution: ts.ModuleResolutionKind.Node16,
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    types: [],
  })
  const controllo = programma.getTypeChecker()
  // Per nome di coda: il compilatore scrive i percorsi con le barre dritte anche
  // su Windows.
  const sorgente = programma.getSourceFiles().find((f) => f.fileName.endsWith('src/domain/models.ts'))
  assert.ok(sorgente, 'models.ts non si compila')
  const simboli = controllo.getExportsOfModule(controllo.getSymbolAtLocation(sorgente))
  const registro = simboli.find((s) => s.name === 'Registro')
  const versione = simboli.find((s) => s.name === 'VERSIONE_DATI')
  assert.ok(registro && versione, 'models.ts deve dichiarare Registro e VERSIONE_DATI')

  const campi = new Set()
  const visita = (tipo, dove, inCorso) => {
    // Le unioni: ogni ramo oggetto porta i suoi campi; `null`, `undefined` e i
    // letterali no.
    if (tipo.isUnion()) {
      for (const ramo of tipo.types) visita(ramo, dove, inCorso)
      return
    }
    if (controllo.isArrayType(tipo)) {
      visita(controllo.getTypeArguments(tipo)[0], `${dove}[]`, inCorso)
      return
    }
    if (!(tipo.flags & ts.TypeFlags.Object)) return
    // Un tipo che si contiene si ferma alla seconda volta.
    if (inCorso.has(tipo)) return
    const dentro = new Set(inCorso).add(tipo)
    const indice = controllo.getIndexInfosOfType(tipo)
    for (const info of indice) visita(info.type, `${dove}{}`, dentro)
    for (const proprieta of controllo.getPropertiesOfType(tipo)) {
      const percorso = dove ? `${dove}.${proprieta.name}` : proprieta.name
      campi.add(percorso)
      visita(controllo.getTypeOfSymbol(proprieta), percorso, dentro)
    }
  }
  visita(controllo.getDeclaredTypeOfSymbol(registro), '', new Set())

  const numero = Number(controllo.typeToString(controllo.getTypeOfSymbol(versione)))
  return { versione: numero, campi: [...campi].sort() }
}

describe('VERSIONE_DATI e la forma dei dati', () => {
  it('un campo nuovo nei dati porta con sé una versione più alta', () => {
    const adesso = campiDelRegistro()
    assert.ok(Number.isInteger(adesso.versione), 'VERSIONE_DATI deve essere un numero scritto per esteso')
    assert.ok(adesso.campi.includes('impostazioni.intestazione.carte[].sede'), 'il giro dei tipi deve arrivare in fondo')

    if (process.env.AGGIORNA_IMPRONTA) {
      writeFileSync(IMPRONTA, `${JSON.stringify(adesso, null, 2)}\n`)
      return
    }
    const fissata = JSON.parse(readFileSync(IMPRONTA, 'utf8'))
    const prima = new Set(fissata.campi)
    const ora = new Set(adesso.campi)
    const nuovi = adesso.campi.filter((c) => !prima.has(c))
    const tolti = fissata.campi.filter((c) => !ora.has(c))

    if (nuovi.length > 0 && adesso.versione <= fissata.versione) {
      assert.fail(
        `campo nuovo nei dati: alza VERSIONE_DATI (è ${adesso.versione}) in src/domain/models.ts, ` +
          'aggiungi il passo in src/domain/upgrades.ts, fissa il campione con npm run sample, ' +
          'poi riscrivi l’impronta con AGGIORNA_IMPRONTA=1 npm test (skill «formato»). ' +
          `Nuovi: ${nuovi.join(', ')}`,
      )
    }
    assert.ok(
      adesso.versione >= fissata.versione,
      `VERSIONE_DATI è scesa da ${fissata.versione} a ${adesso.versione}: un numero dato non si riprende`,
    )
    assert.deepEqual(
      { versione: adesso.versione, nuovi, tolti },
      { versione: fissata.versione, nuovi: [], tolti: [] },
      'la forma dei dati o la versione sono cambiate: riscrivi l’impronta con AGGIORNA_IMPRONTA=1 npm test',
    )
  })
})
