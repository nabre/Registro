/**
 * Verifica che ogni modifica dichiari le collezioni che tocca davvero. In
 * `modifica(op, collezioni)` l'elenco dice quali file JSON si riscrivono: quel
 * che manca non si salva, e la modifica sparisce alla riapertura senza che
 * niente lo mostri prima.
 *
 * Legge i gestori, guarda quali raccolte toccano e confronta con l'elenco.
 * Legge il testo, non compila: quel che non sa leggere lo dice.
 *
 * Uso: `npm run collections`
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { daRadice, fileSotto, RADICE } from './common.mjs'

/**
 * Dove stanno le modifiche. `src/actions/` sono i gestori; `src/data/` ha le
 * sue, dove lo smistamento e l'archiviazione scrivono il registro da sé
 * (`filing.ts`, `sorter.ts`).
 */
const CARTELLE = ['src/actions', 'src/data']

/** Chi definisce `modifica` invece di chiamarla: dentro non c'è niente da contare. */
const DEFINISCONO = new Set(['src/actions/context.ts'])

/**
 * Da campo del registro al file che lo contiene. `anni`, `materie` e
 * `impostazioni` stanno in `registro.json` (`contenutoDi` in `data/archive.ts`).
 */
const FILE_DI = {
  anni: 'registro',
  materie: 'registro',
  impostazioni: 'registro',
  classi: 'classi',
  corsi: 'corsi',
  lezioni: 'lezioni',
  piani: 'piani',
  valutazioni: 'valutazioni',
  fascicoli: 'fascicoli',
  consegne: 'consegne',
  check: 'check',
  smistamenti: 'smistamenti',
  coordinate: 'coordinate',
}

/** Il nome della variabile del registro, come lo scrivono i gestori. */
const REGISTRO = String.raw`[A-Za-z_$][\w$]*`

/**
 * Le raccolte toccate dentro un corpo: `<reg>.<campo>` assegnato, mutato con un
 * metodo d'array o passato a `riponi`. Le sole letture non contano.
 */
function toccate (corpo, reg) {
  const trovate = new Set()
  const campi = Object.keys(FILE_DI).join('|')
  const scritture = [
    // r.classi = ..., r.classi.push(...), r.classi.splice(...)
    new RegExp(`\\b${reg}\\.(${campi})\\s*=[^=]`, 'g'),
    new RegExp(`\\b${reg}\\.(${campi})\\.(push|pop|shift|unshift|splice|sort|reverse|fill)\\s*\\(`, 'g'),
    // riponi(r.classi, ...) e sorelle: inseriscono o sostituiscono
    new RegExp(`\\b(?:riponi|togli|rimuovi)\\s*\\(\\s*${reg}\\.(${campi})\\b`, 'g'),
    // r.impostazioni.passo = ...: si scrive dentro l'oggetto, non l'oggetto
    new RegExp(`\\b${reg}\\.(${campi})\\.[\\w$]+\\s*=[^=]`, 'g'),
  ]
  for (const espressione of scritture) {
    for (const trovato of corpo.matchAll(espressione)) trovate.add(trovato[1])
  }

  // Le voci prese per nome (`const ora = r.lezioni.find(...)`, poi
  // `ora.stato = …`): si segue la variabile, e se viene mutata conta la sua collezione.
  const alias = new Map()
  const presa = new RegExp(
    `\\b(?:const|let|var)\\s+([\\w$]+)[^=\\n]*=\\s*${reg}\\.(${campi})\\b`,
    'g',
  )
  for (const trovato of corpo.matchAll(presa)) alias.set(trovato[1], trovato[2])
  // `for (const voce of r.consegne)` conta allo stesso modo.
  const ciclo = new RegExp(`\\bfor\\s*\\(\\s*(?:const|let)\\s+([\\w$]+)\\s+of\\s+${reg}\\.(${campi})\\b`, 'g')
  for (const trovato of corpo.matchAll(ciclo)) alias.set(trovato[1], trovato[2])

  for (const [nome, campo] of alias) {
    const mutazioni = [
      // voce.campo = ..., voce.campo += ...
      new RegExp(`\\b${nome}(?:\\?)?\\.[\\w$]+\\s*(?:\\+|-|\\|\\||\\?\\?)?=[^=]`),
      // voce.elenco.push(...)
      new RegExp(`\\b${nome}(?:\\?)?\\.[\\w$.]+\\.(push|pop|shift|unshift|splice|sort|reverse|fill)\\s*\\(`),
      // Object.assign(voce, ...) / riponi(voce.qualcosa, ...)
      new RegExp(`\\bObject\\.assign\\s*\\(\\s*${nome}\\b`),
      new RegExp(`\\b(?:riponi|togli|rimuovi)\\s*\\(\\s*${nome}\\b`),
      // delete voce.campo
      new RegExp(`\\bdelete\\s+${nome}\\.`),
    ]
    if (mutazioni.some((e) => e.test(corpo))) trovate.add(campo)
  }

  return trovate
}

/**
 * Gli aiuti a cui il corpo consegna il registro intero: l'analisi si ferma e
 * li elenca da guardare a mano. Quelli che leggono soltanto stanno a parte.
 */
const SOLO_LETTURA = new Set([
  'classeDelCorsoId', 'classeDellaLezione', 'corsiDellaClasse', 'corsoPerId',
  'fascicoloDellaClasse', 'fascicoloDi', 'collocazioneDi', 'semestreScelto',
  'semestreDelCorso', 'documentiDelCorso', 'registroDelCorso', 'appelloScritto',
  'bloccoAssenze', 'conPosto', 'eliminazione', 'riparazioni', 'annoDellaClasse',
  'annoDelCorso', 'lezioniDellAnno', 'corsiDellAnno', 'pianiDelCorso',
])

function aiutiOpachi (corpo, reg) {
  const nomi = new Set()
  const chiamata = new RegExp(`\\b([A-Za-z_$][\\w$]*)\\s*\\(\\s*${reg}\\s*[,)]`, 'g')
  for (const trovato of corpo.matchAll(chiamata)) {
    const nome = trovato[1]
    if (SOLO_LETTURA.has(nome)) continue
    if (['if', 'for', 'while', 'switch', 'return', 'typeof'].includes(nome)) continue
    nomi.add(nome)
  }
  return nomi
}

/** Il testo fra la graffa aperta e la sua chiusura, dall'indice dato. */
function corpoDa (testo, apertura) {
  let profondita = 0
  for (let i = apertura; i < testo.length; i += 1) {
    if (testo[i] === '{') profondita += 1
    if (testo[i] === '}') {
      profondita -= 1
      if (profondita === 0) return { corpo: testo.slice(apertura, i + 1), fine: i + 1 }
    }
  }
  return { corpo: testo.slice(apertura), fine: testo.length }
}

/** L'elenco fra parentesi quadre che segue il corpo, se c'è. */
function dichiarate (testo, da) {
  const coda = testo.slice(da, da + 400)
  const elenco = coda.match(/^\s*,\s*\[([^\]]*)\]/)
  if (!elenco) return coda.trimStart().startsWith(')') ? 'tutte' : null
  return new Set(
    [...elenco[1].matchAll(/'([^']+)'/g)].map((t) => t[1]),
  )
}

const rilievi = []
const daGuardare = []

const file = CARTELLE.flatMap((cartella) => fileSotto(join(RADICE, cartella)))
for (const percorso of file.map((f) => daRadice(f, RADICE))) {
  if (DEFINISCONO.has(percorso)) continue
  const testo = readFileSync(join(RADICE, percorso), 'utf8')
  const righeFino = (indice) => testo.slice(0, indice).split('\n').length

  // `modifica` dichiara tutto quel che tocca; `suVoce` dichiara da sé la
  // collezione della voce, e in `altre` va il resto.
  const chiamate = [
    ...[...testo.matchAll(
      new RegExp(`\\.modifica\\s*\\(\\s*\\((${REGISTRO})\\)\\s*=>\\s*\\{`, 'g'),
    )].map((t) => ({ trovato: t, reg: t[1], implicita: null })),
    ...[...testo.matchAll(
      new RegExp(
        `\\bsuVoce\\s*\\(\\s*'([a-z]+)'\\s*,[^,]*,\\s*\\([\\w$]+\\s*(?:,\\s*(${REGISTRO}))?\\)\\s*=>\\s*\\{`,
        'g',
      ),
    )].map((t) => ({ trovato: t, reg: t[2], implicita: t[1] })),
  ].sort((a, b) => a.trovato.index - b.trovato.index)

  for (const { trovato: chiamata, reg, implicita } of chiamate) {
    const apertura = chiamata.index + chiamata[0].length - 1
    const { corpo, fine } = corpoDa(testo, apertura)
    // Un `suVoce` che non si fa dare il registro non può toccare altro.
    const scritte = reg ? toccate(corpo, reg) : new Set()
    let elenco = dichiarate(testo, fine)
    const riga = righeFino(chiamata.index)

    // Lista assente: per `modifica` vuol dire «tutte», per `suVoce` «nessuna
    // oltre alla sua», dove il difetto si nasconde.
    if (elenco === 'tutte') {
      if (implicita === null) continue
      elenco = null
    }
    if (elenco === null && implicita === null) {
      daGuardare.push(`${percorso}:${riga} — elenco non riconosciuto`)
      continue
    }
    // `suVoce` senza `altre` dichiara comunque la sua collezione.
    const dichiarato = new Set(elenco === null ? [] : [...elenco])
    if (implicita) dichiarato.add(implicita === 'anni' || implicita === 'materie' ? 'registro' : implicita)
    elenco = dichiarato
    const opachi = reg ? aiutiOpachi(corpo, reg) : new Set()
    if (opachi.size) {
      daGuardare.push(
        `${percorso}:${riga} — passa il registro a ${[...opachi].join(', ')}: ` +
          `l'elenco dichiarato (${[...elenco].join(', ') || 'nessuno'}) va verificato a mano`,
      )
    }
    const mancanti = [...scritte].map((c) => FILE_DI[c]).filter((f) => !elenco.has(f))
    const inutili = [...elenco].filter(
      (f) => ![...scritte].some((c) => FILE_DI[c] === f),
    )
    if (mancanti.length) {
      rilievi.push({
        percorso,
        riga,
        gravita: 'NON SALVA',
        dettaglio: `tocca ${[...scritte].join(', ')} ma non dichiara ${[...new Set(mancanti)].join(', ')}`,
      })
    } else if (inutili.length && scritte.size) {
      daGuardare.push(
        `${percorso}:${riga} — dichiara ${inutili.join(', ')} senza toccarli (riscrittura inutile, non un guasto)`,
      )
    }
  }
}

if (rilievi.length === 0) {
  console.log('Nessuna modifica scrive in una collezione che non dichiara.')
} else {
  console.log(`# Modifiche che non arrivano sul disco: ${rilievi.length}\n`)
  for (const r of rilievi) console.log(`${r.percorso}:${r.riga}  ${r.gravita}  ${r.dettaglio}`)
}

if (daGuardare.length) {
  console.log(`\n# Da guardare a mano: ${daGuardare.length}\n`)
  for (const voce of daGuardare) console.log(voce)
}

process.exitCode = rilievi.length ? 1 : 0
