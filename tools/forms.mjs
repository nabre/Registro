/**
 * I campi dei moduli che nessuno raccoglie al salvataggio.
 *
 * Un modulo del registro si apre con `apriModale({ corpo, alSalva })`: `corpo`
 * disegna dei `campo({ nome: 'x', ... })`, e `alSalva(valori)` riceve un
 * oggetto con dentro `valori.x`. Il legame fra i due è una stringa, e le
 * stringhe non le controlla nessuno: un `nome` scritto in un modo nel campo e
 * in un altro in `alSalva` — o un campo aggiunto e mai raccolto — non fa
 * rumore. Il campo si vede, ci si scrive dentro, si preme Salva, e quel che si
 * era scritto non arriva da nessuna parte.
 *
 * È il difetto che questa verifica cerca: un campo compilato dall'utente che
 * non finisce nel JSON.
 *
 * Lo script accosta, dentro ogni chiamata a `apriModale`, i `nome:` dei campi
 * con le chiavi lette da `valori`. Non conosce i casi in cui `valori` viene
 * passato intero a un'altra funzione: quelli li dichiara invece di tacerli.
 *
 * Uso: `npm run forms`
 */
import { readFileSync } from 'node:fs'

import { daRadice, fileSotto } from './common.mjs'

const RADICE = 'src/ui'


/** Il testo della chiamata che comincia alla parentesi data. */
function chiamataDa (testo, apertura) {
  let profondita = 0
  for (let i = apertura; i < testo.length; i += 1) {
    const c = testo[i]
    if ('([{'.includes(c)) profondita += 1
    if (')]}'.includes(c)) {
      profondita -= 1
      if (profondita === 0) return testo.slice(apertura, i + 1)
    }
  }
  return testo.slice(apertura)
}

const rilievi = []
const daGuardare = []

for (const percorso of fileSotto(RADICE)) {
  const testo = readFileSync(percorso, 'utf8')
  const nome = daRadice(percorso)

  for (const apertura of testo.matchAll(/\bapriModale\s*\(/g)) {
    const corpo = chiamataDa(testo, apertura.index + apertura[0].length - 1)
    const riga = testo.slice(0, apertura.index).split('\n').length

    // I campi disegnati, con il nome con cui si dichiarano.
    const dichiarati = [...corpo.matchAll(/\bnome\s*:\s*'([^']+)'/g)].map((m) => m[1])

    // Spesso il corpo del modulo non sta qui: `corpo: () => moduloClasse(...)`
    // lo costruisce altrove. Si segue un passaggio — abbastanza per tutti i
    // moduli di questo progetto — e si guarda dentro quella funzione.
    const viaAltrove = corpo.slice(corpo.search(/\bcorpo\s*:/), corpo.search(/\balSalva\s*:/) + 1)
    for (const richiamo of viaAltrove.matchAll(/\b([a-z][\w$]*)\s*\(/g)) {
      const aiuto = richiamo[1]
      if (['campo', 'h', 'riga', 'gruppo', 'map', 'filter', 'pulsante'].includes(aiuto)) continue
      const definizione = testo.search(
        new RegExp(`(?:function|const)\\s+${aiuto}\\b`),
      )
      if (definizione < 0) continue
      const apre = testo.indexOf('{', definizione)
      if (apre < 0) continue
      const dentro = chiamataDa(testo, apre)
      for (const c of dentro.matchAll(/\bnome\s*:\s*'([^']+)'/g)) dichiarati.push(c[1])
    }

    if (dichiarati.length === 0) continue

    // Il pezzo che salva: da `alSalva` in giù.
    const dove = corpo.search(/\balSalva\s*:/)
    if (dove < 0) {
      daGuardare.push(`${nome}:${riga} — modulo con campi e senza \`alSalva\``)
      continue
    }
    // Si parte dopo la freccia: la lista dei parametri di `alSalva` contiene
    // `valori` per definizione, e contarla come un passaggio faceva sembrare
    // opaco ogni modulo — cioè spegneva la verifica invece di farla.
    const salvataggio = corpo.slice(dove).replace(/^[^=]*=>/, '')

    // Se `valori` viene passato intero a qualcun altro, l'analisi si ferma.
    const passatoIntero = /[A-Za-z_$][\w$]*\s*\(\s*valori\s*[,)]/.test(salvataggio) ||
      /\.\.\.\s*valori\b/.test(salvataggio)

    const raccolti = new Set([
      ...[...salvataggio.matchAll(/\bvalori\s*\.\s*([\w$]+)/g)].map((m) => m[1]),
      ...[...salvataggio.matchAll(/\bvalori\s*\[\s*'([^']+)'\s*\]/g)].map((m) => m[1]),
    ])

    const persi = dichiarati.filter((c) => !raccolti.has(c))
    if (persi.length === 0) continue

    if (passatoIntero) {
      daGuardare.push(
        `${nome}:${riga} — \`valori\` passato intero a un'altra funzione; ` +
          `non raccolti qui: ${persi.join(', ')}`,
      )
    } else {
      rilievi.push(`${nome}:${riga}  campi compilati e mai letti: ${persi.join(', ')}`)
    }
  }
}

if (rilievi.length === 0) {
  console.log('Ogni campo dichiarato in un modulo viene raccolto al salvataggio.')
} else {
  console.log(`# Campi che l'utente compila e che il salvataggio non legge: ${rilievi.length}\n`)
  for (const voce of rilievi) console.log(voce)
}

if (daGuardare.length) {
  console.log(`\n# Da guardare a mano: ${daGuardare.length}\n`)
  for (const voce of daGuardare) console.log(voce)
}

process.exitCode = rilievi.length ? 1 : 0
