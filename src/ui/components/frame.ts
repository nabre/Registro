// La cornice che mostra un documento, e che un ridisegno non spegne.
//
// Il pannello rifà la vista intera a ogni cambiamento — un voto salvato,
// l'orologio che batte il minuto — e per tutto il resto va benissimo: è veloce,
// e toglie di mezzo i pezzi rimasti indietro. Per un `<iframe>` no. Un telaio
// tolto dal documento perde il suo contesto di navigazione: rimettendolo,
// ricarica. Chi stava leggendo pagina quattro di un verbale con lo zoom al 150%
// se li vedeva sparire da soli ogni sessanta secondi, senza aver toccato
// niente.
//
// Quindi il telaio non sta nella vista. Sta in fondo alla pagina, appeso una
// volta sola, e insegue con una posizione fissa il segnaposto che la vista
// mette al posto suo. La vista continua a dichiarare dove va la cornice — un
// `<div>` vuoto dentro il suo riquadro — e chi legge non vede la differenza,
// tranne quella che conta: il documento resta dov'era.

import { h } from '../dom.js'

let ospite: HTMLDivElement | null = null
let telaio: HTMLIFrameElement | null = null

/** Il segnaposto che l'ultima vista disegnata ha dichiarato, se ce n'è uno. */
let posto: HTMLElement | null = null

/**
 * Che cosa sta mostrando il telaio adesso.
 *
 * Il confronto è su questa chiave e non sull'indirizzo: rifare un documento non
 * ne cambia il percorso — si riscrive al posto suo — e senza un pezzo che
 * cambia il telaio terrebbe in mostra la copia di prima, presa dalla memoria
 * del lettore. Chi rifà un foglio ci mette dentro qualcosa che lo distingue, e
 * quella è la sola cosa che fa ricaricare.
 */
let chiave: string | null = null

/** L'ultimo rettangolo applicato: si riscrive lo stile solo quando cambia. */
let misura = ''

let giroAcceso = false

function costruisci (): void {
  if (ospite) return
  telaio = h('iframe', { class: 'cornice-fissa__telaio' })
  ospite = h('div', { class: 'cornice-fissa' }, telaio)
  ospite.hidden = true
  document.body.appendChild(ospite)
}

/**
 * Mette il telaio dove sta il segnaposto, e lo spegne quando il segnaposto non
 * c'è più.
 *
 * Un giro a ogni fotogramma e non un ascoltatore su ogni cosa che possa
 * spostarlo: la pagina scorre, i riquadri accanto crescono, la finestra cambia
 * misura, e il ridisegno rifà il segnaposto da capo. Costa la lettura di un
 * rettangolo per fotogramma, e solo finché un documento è aperto.
 */
function segui (): void {
  if (!ospite) {
    giroAcceso = false
    return
  }
  // Niente segnaposto — si è chiusa l'anteprima, o si è cambiata pagina — e il
  // telaio si mette via senza perdere quel che ha caricato: tornando, il
  // documento è già lì.
  if (!posto || !posto.isConnected) {
    ospite.hidden = true
    misura = ''
    giroAcceso = false
    return
  }

  const rettangolo = posto.getBoundingClientRect()
  if (rettangolo.width < 1 || rettangolo.height < 1) {
    ospite.hidden = true
  } else {
    const adesso = `${rettangolo.top}:${rettangolo.left}:${rettangolo.width}:${rettangolo.height}`
    if (adesso !== misura) {
      misura = adesso
      ospite.style.top = `${rettangolo.top}px`
      ospite.style.left = `${rettangolo.left}px`
      ospite.style.width = `${rettangolo.width}px`
      ospite.style.height = `${rettangolo.height}px`
    }
    ospite.hidden = false
  }
  requestAnimationFrame(segui)
}

/**
 * Il segnaposto della cornice: si mette nella vista dove il documento deve
 * comparire.
 *
 * `chiave` distingue una versione dall'altra dello stesso file: cambiandola il
 * telaio ricarica, lasciandola uguale resta dov'è — stessa pagina, stesso
 * ingrandimento — anche se intorno la vista si è rifatta dieci volte.
 */
export function corniceDocumento (opzioni: {
  indirizzo: string
  chiave: string
  titolo: string
}): HTMLElement {
  costruisci()
  if (telaio) {
    telaio.setAttribute('title', `Anteprima di ${opzioni.titolo}`)
    if (chiave !== opzioni.chiave) {
      chiave = opzioni.chiave
      telaio.setAttribute('src', opzioni.indirizzo)
    }
  }

  posto = h('div', { class: 'cornice-posto' })
  if (!giroAcceso) {
    giroAcceso = true
    requestAnimationFrame(segui)
  }
  return posto
}
