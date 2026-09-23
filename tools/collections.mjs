/**
 * Verifica che ogni modifica dichiari le collezioni che tocca davvero.
 *
 * È il controllo che tiene insieme «il pulsante ha funzionato» e «il dato è sul
 * disco». Un gestore cambia il registro dentro `modifica(op, collezioni)`, e
 * `collezioni` è l'elenco dei file JSON che verranno riscritti: quel che non è
 * elencato **non si salva**. In memoria il registro è giusto, la pagina si
 * ridisegna giusta, e alla riapertura del documento la modifica non c'è più —
 * il modo peggiore in cui un dato può sparire, perché sul momento sembra tutto
 * a posto.
 *
 * Lo script legge i gestori di `src/actions/`, guarda quali raccolte del
 * registro toccano dentro ogni `modifica` e confronta con l'elenco dichiarato.
 *
 * Non è un compilatore: legge il testo. I casi che non sa leggere li dice
 * invece di tacerli, così si guardano a mano.
 *
 * Uso: `npm run collections`
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const CARTELLA = 'src/actions'

/**
 * Da campo del registro al file che lo contiene.
 *
 * `anni`, `materie` e `impostazioni` non hanno un file loro: stanno tutti e tre
 * dentro `registro.json` — vedi `contenutoDi` in `data/archive.ts`.
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
  smistamenti: 'smistamenti',
  coordinate: 'coordinate',
}

/** Il nome della variabile del registro, come lo scrivono i gestori. */
const REGISTRO = String.raw`[A-Za-z_$][\w$]*`

/**
 * Le raccolte toccate dentro un corpo: si cerca `<reg>.<campo>` in una
 * posizione che non sia una sola lettura.
 *
 * Una lettura pura — `r.classi.find(...)` — non ha bisogno di dichiarare
 * niente. Scrivono invece l'assegnazione, i metodi che mutano un array, e il
 * passaggio a `riponi`, che è il modo con cui questo codice inserisce o
 * sostituisce una voce.
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

  // Le voci prese per nome: `const ora = r.lezioni.find(...)`, e poi
  // `ora.stato = 'svolta'`. È il modo normale di scrivere questi gestori, e
  // guardare le sole `r.<campo>` lascerebbe fuori quasi tutte le modifiche
  // vere. Si segue la variabile: se qualcuno le assegna un campo, o la passa a
  // una funzione che muta, la collezione da cui viene è stata toccata.
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
 * Gli aiuti a cui il corpo consegna il registro intero.
 *
 * Qui l'analisi si ferma: `togliFoglioAssenze(r, ...)` può toccare qualunque
 * cosa, e seguirla vorrebbe dire scrivere mezzo compilatore. Invece di far
 * finta di aver verificato, si dice quali sono e si guardano a mano — il
 * silenzio sarebbe la risposta peggiore, perché somiglia a un via libera.
 *
 * Le funzioni che si limitano a leggere sono elencate a parte: passano il
 * registro perché ne hanno bisogno per cercare, non per cambiare.
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

for (const nome of readdirSync(CARTELLA)) {
  if (!nome.endsWith('.ts') || nome === 'contesto.ts') continue
  const percorso = join(CARTELLA, nome)
  const testo = readFileSync(percorso, 'utf8')
  const righeFino = (indice) => testo.slice(0, indice).split('\n').length

  // Due forme, stesso rischio. `modifica` dichiara tutto quel che tocca;
  // `suVoce` dichiara da sé la collezione della voce, e in `altre` va il resto.
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

    // Lista assente: per `modifica` vuol dire «tutte le collezioni» — e allora
    // non c'è niente da verificare — ma per `suVoce` vuol dire «nessuna
    // oltre alla sua», che è il caso in cui il difetto si nasconde.
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
