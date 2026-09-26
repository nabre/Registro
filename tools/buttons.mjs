/**
 * I comandi dell'interfaccia che non fanno niente: un `pulsante({ testo, al })`
 * senza `al` (e non `submit`) si disegna e si preme senza effetto; un `campo` o
 * un `selettore` senza `al` non filtra.
 *
 * Elenca dove guardare, senza giudicare: alcuni casi sono legittimi (un
 * `submit`, un pulsante disabilitato che fa da etichetta).
 *
 * Uso: `npm run buttons`
 */
import { readFileSync } from 'node:fs'

import { daRadice, fileSotto } from './common.mjs'

const RADICE = 'src/ui'

/**
 * Le fabbriche di comandi: nome → come si chiama il loro gestore. Solo
 * `pulsante` si segnala come guasto: un `campo` in un modulo si legge al
 * salvataggio con `valoriModulo` (`alSalva` di `apriModale`), uno in una vista è
 * di solito un filtro e finisce fra i «da guardare».
 */
const FABBRICHE = {
  pulsante: 'al',
  campo: 'al',
  controlloData: 'al',
  dataInLinea: 'al',
  interruttore: 'al',
}

/** Vero per i comandi che vivono dentro un modulo, dove `al` non serve. */
function dentroUnModulo (percorso) {
  return percorso.includes('/moduli/')
}

/**
 * I pulsanti a cui il comportamento lo attacca chi li usa (`presaDiRiga`:
 * trascinamento e frecce li mette `riordinatore`).
 */
const COMPORTAMENTO_ALTROVE = ['presa-riga']


/** Il testo dell'oggetto letterale che segue la parentesi, se c'è. */
function argomento (testo, da) {
  let profondita = 0
  for (let i = da; i < testo.length; i += 1) {
    const c = testo[i]
    if ('([{'.includes(c)) profondita += 1
    if (')]}'.includes(c)) {
      profondita -= 1
      if (profondita === 0) return testo.slice(da, i + 1)
    }
  }
  return testo.slice(da, da + 400)
}

const muti = []
const daGuardare = []

for (const percorso of fileSotto(RADICE)) {
  const testo = readFileSync(percorso, 'utf8')
  const nome = daRadice(percorso)
  const righeFino = (indice) => testo.slice(0, indice).split('\n').length

  for (const [fabbrica, gestore] of Object.entries(FABBRICHE)) {
    if (!gestore) continue
    const chiamate = testo.matchAll(new RegExp(`\\b${fabbrica}\\s*\\(`, 'g'))
    for (const chiamata of chiamate) {
      const apertura = chiamata.index + chiamata[0].length - 1
      const corpo = argomento(testo, apertura)
      // Non è una chiamata con oggetto di opzioni: la salta.
      if (!corpo.includes('{')) continue

      const haGestore = new RegExp(`\\b${gestore}\\s*:`).test(corpo)
      const eSubmit = /tipo\s*:\s*'submit'/.test(corpo)
      const sempreSpento = /disabilitato\s*:\s*true\b/.test(corpo)
      const altrove = COMPORTAMENTO_ALTROVE.some((c) => corpo.includes(`'${c}'`))
      if (haGestore || eSubmit || sempreSpento || altrove) continue

      const riga = righeFino(chiamata.index)
      const etichetta = corpo.match(/testo\s*:\s*'([^']{0,40})'/)?.[1]
        ?? corpo.match(/etichetta\s*:\s*'([^']{0,40})'/)?.[1]
        ?? corpo.match(/titolo\s*:\s*'([^']{0,40})'/)?.[1]
        // Il testo da un catalogo: si mostra l'espressione, `t.salva`.
        ?? corpo.match(/(?:testo|etichetta|titolo)\s*:\s*([^,\n}]{1,40})/)?.[1]?.trim()
        ?? '(senza testo)'
      // Un `disabilitato` calcolato è sospetto ma non certo: può essere spento
      // in questo ramo e acceso altrove, con il gestore aggiunto dopo.
      const voce = `${nome}:${riga}  ${fabbrica}  «${etichetta}»`
      if (fabbrica !== 'pulsante') {
        // In un modulo è la forma giusta; in una vista è quasi sempre un filtro da guardare.
        if (!dentroUnModulo(nome)) daGuardare.push(`${voce} — filtro o campo di vista senza \`al\``)
        continue
      }
      if (/disabilitato\s*:/.test(corpo)) daGuardare.push(`${voce} — ha \`disabilitato\` calcolato`)
      else muti.push(voce)
    }
  }
}

if (muti.length === 0) {
  console.log('Nessun comando si disegna senza dire che cosa fa.')
} else {
  console.log(`# Comandi senza gestore: ${muti.length}\n`)
  for (const voce of muti) console.log(voce)
}

if (daGuardare.length) {
  console.log(`\n# Da guardare: ${daGuardare.length}\n`)
  for (const voce of daGuardare) console.log(voce)
}

process.exitCode = muti.length ? 1 : 0
