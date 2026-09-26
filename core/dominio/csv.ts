// Il CSV come lo apre un foglio di calcolo italiano: punto e virgola, BOM in
// testa, virgola nei decimali, celle-formula disinnescate. Sta nel dominio
// perché non tocca il disco e si prova da solo; che cosa esportare e dove sta
// in `dati/`.

const SEPARATORE = ';'

/**
 * Una cella: numeri con la virgola, testo fra virgolette se serve. Un testo
 * che comincia come una formula («=», «+», «-», «@») prende un apostrofo
 * davanti, perché il foglio di calcolo non lo esegua.
 */
export function cella (valore: string | number | null | undefined): string {
  if (valore === null || valore === undefined) return ''
  // `NaN` e `Infinity` diventano una cella vuota.
  if (typeof valore === 'number') {
    return Number.isFinite(valore) ? String(valore).replace('.', ',') : ''
  }
  // Anche tabulazione e ritorno a capo in testa: Excel li salta e legge la
  // formula che segue.
  const testo = /^[=+\-@\t\r]/.test(valore) ? `'${valore}` : valore
  return /[";\r\n]/.test(testo) ? `"${testo.replace(/"/g, '""')}"` : testo
}

/** Le righe di un CSV, già col BOM davanti e le interruzioni che Excel si aspetta. */
export function righe (dati: Array<Array<string | number | null>>): string {
  // BOM scritto come escape e non come carattere, che nel sorgente sarebbe invisibile.
  return `\uFEFF${dati.map((r) => r.map(cella).join(SEPARATORE)).join('\r\n')}\r\n`
}

/**
 * Le righe di un CSV, rilette (per l'anteprima). Stessa grammatica di `cella`
 * al contrario. Toglie il BOM e l'apostrofo di protezione solo davanti ai
 * caratteri per cui `cella` lo mette.
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
      // Due virgolette dentro un campo virgolettato valgono una; una sola lo chiude.
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

    // Le virgolette aprono un campo solo in testa: in mezzo sono testo.
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
    // `\r\n`: il `\r` non è testo.
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
  return /^'[=+\-@\t\r]/.test(campo) ? campo.slice(1) : campo
}
