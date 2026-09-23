/**
 * I comandi dell'interfaccia che non fanno niente.
 *
 * Un pulsante nasce da `pulsante({ testo, al })` — `al` è quel che succede al
 * clic. Senza `al`, e senza essere un `submit` dentro un modulo, il pulsante si
 * disegna, si illumina al passaggio, si preme… e non succede niente. È il
 * difetto più difficile da notare leggendo il codice, perché non c'è niente da
 * leggere: è un'assenza.
 *
 * Lo stesso vale per i campi e i selettori — `campo({ al })`, `selettore(…)` —
 * che sono i filtri: uno senza `al` non filtra.
 *
 * Lo script elenca i punti in cui un comando si disegna senza dire che cosa fa.
 * Non giudica: alcuni sono legittimi (un `submit`, un pulsante disabilitato che
 * fa da etichetta). Dice dove guardare.
 *
 * Uso: `npm run buttons`
 */
import { readFileSync } from 'node:fs'

import { daRadice, fileSotto } from './common.mjs'

const RADICE = 'src/ui'

/**
 * Le fabbriche di comandi: nome → come si chiama il loro gestore.
 *
 * `pulsante` è l'unico che si segnala come guasto. Per gli altri l'assenza del
 * gestore è spesso il modo giusto di scriverli:
 *
 * - un `campo` dentro un modulo non ha `al` perché il suo valore si legge
 *   tutto insieme al salvataggio, con `valoriModulo` — vedi `alSalva` di
 *   `apriModale`. Un `al` per campo sarebbe il modo sbagliato;
 * - un `campo` dentro una vista, invece, di solito è un filtro, e un filtro
 *   senza `al` non filtra. Questi finiscono fra i «da guardare».
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
 * I pulsanti a cui il comportamento lo attacca chi li usa.
 *
 * `presaDiRiga` ne è l'esempio: è la presa con cui si trascina una riga, e
 * trascinamento e frecce glieli mette `riordinatore` al momento di usarla.
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
        ?? '(senza testo)'
      // Un `disabilitato` calcolato è sospetto ma non certo: può essere spento
      // in questo ramo e acceso altrove, con il gestore aggiunto dopo.
      const voce = `${nome}:${riga}  ${fabbrica}  «${etichetta}»`
      if (fabbrica !== 'pulsante') {
        // Dentro un modulo è la forma giusta e non si dice niente; dentro una
        // vista è quasi sempre un filtro, e allora va guardato.
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
