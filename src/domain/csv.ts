// Il CSV come lo apre un foglio di calcolo italiano.
//
// Sta nel dominio e non accanto alle esportazioni per un motivo solo: qui non
// si tocca il disco, e le due regole che contano davvero — la virgola dei
// decimali e le celle che sembrano formule — si possono provare senza aprire
// l'editor. Il resto (che cosa esportare, dove scriverlo) resta in `dati/`.
//
// Separatore punto e virgola e BOM in testa: è il modo in cui Excel in ambito
// italiano apre un CSV senza chiedere niente e senza mangiarsi gli accenti.

const SEPARATORE = ';'

/**
 * Una cella. I numeri escono con la virgola, come li legge Excel in italiano;
 * il testo si mette fra virgolette se contiene qualcosa che le richiede.
 *
 * Un testo che comincia come una formula — «=», «+», «-», «@» — si protegge
 * con un apostrofo: il nome di un allievo o il titolo di una verifica non
 * devono diventare un comando per il foglio di calcolo che li apre.
 */
export function cella (valore: string | number | null | undefined): string {
  if (valore === null || valore === undefined) return ''
  if (typeof valore === 'number') return String(valore).replace('.', ',')
  const testo = /^[=+\-@]/.test(valore) ? `'${valore}` : valore
  return /[";\r\n]/.test(testo) ? `"${testo.replace(/"/g, '""')}"` : testo
}

/** Le righe di un CSV, già col BOM davanti e le interruzioni che Excel si aspetta. */
export function righe (dati: Array<Array<string | number | null>>): string {
  // Il BOM si scrive `\uFEFF` e non come carattere: nel sorgente sarebbe invisibile,
  // e un carattere invisibile che decide se Excel legge gli accenti o no non deve
  // dipendere da chi se ne ricorda guardando una riga che sembra vuota.
  return `\uFEFF${dati.map((r) => r.map(cella).join(SEPARATORE)).join('\r\n')}\r\n`
}

/**
 * Le righe di un CSV, rilette.
 *
 * Serve all'anteprima: un CSV nella cornice è una tabella, e per disegnarla la
 * pagina deve poter tornare dalle righe di testo alle celle. Sta qui accanto a
 * chi le scrive perché è la stessa grammatica letta al contrario — il punto e
 * virgola, le virgolette raddoppiate, l'apostrofo davanti a quel che sembra una
 * formula — e due grammatiche in due file divergono al primo cambiamento.
 *
 * Il BOM se ne va: è per il foglio di calcolo, non per chi legge. L'apostrofo
 * di protezione pure, ma solo davanti ai caratteri per cui `cella` lo mette:
 * un nome che comincia davvero con un apostrofo resta com'è.
 */
export function leggiCsv (testo: string): string[][] {
  const senzaBom = testo.charCodeAt(0) === 0xfeff ? testo.slice(1) : testo
  const righe: string[][] = []
  let riga: string[] = []
  let campo = ''
  let virgolettato = false
  let aperto = false

  for (let i = 0; i < senzaBom.length; i += 1) {
    const carattere = senzaBom[i]

    if (virgolettato) {
      // Due virgolette dentro un campo virgolettato sono una virgoletta sola;
      // una sola chiude il campo.
      if (carattere === '"') {
        if (senzaBom[i + 1] === '"') {
          campo += '"'
          i += 1
        } else {
          virgolettato = false
        }
      } else {
        campo += carattere
      }
      continue
    }

    // Le virgolette contano solo in testa al campo: `cella` le mette lì, e in
    // mezzo a un testo sono un carattere come un altro.
    if (carattere === '"' && campo === '' && !aperto) {
      virgolettato = true
      aperto = true
      continue
    }
    if (carattere === SEPARATORE) {
      riga.push(scopri(campo))
      campo = ''
      aperto = false
      continue
    }
    // I ritorni a capo di Excel sono due caratteri: il primo non è testo.
    if (carattere === '\r') continue
    if (carattere === '\n') {
      riga.push(scopri(campo))
      righe.push(riga)
      riga = []
      campo = ''
      aperto = false
      continue
    }
    campo += carattere
    aperto = true
  }

  if (campo !== '' || riga.length > 0) {
    riga.push(scopri(campo))
    righe.push(riga)
  }
  return righe
}

/** Toglie l'apostrofo con cui `cella` disinnesca quel che sembra una formula. */
function scopri (campo: string): string {
  return /^'[=+\-@]/.test(campo) ? campo.slice(1) : campo
}
