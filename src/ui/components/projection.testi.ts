// I testi della fascia della proiezione (`projection.ts`): che cosa sta
// vedendo la classe, detto a chi ha davanti il registro.

import { catalogo, minuscolo } from '../../i18n/index.js'

const it = {
  inVista: (nome: string) => `${nome}: è quel che la classe sta vedendo. Cliccando lo si toglie.`,
  /** Il nome del blocco sta in mezzo alla frase: minuscolo, tranne in tedesco. */
  sulloSchermo: (blocco: string) => `Sullo schermo: ${minuscolo(blocco)}`,
  conINomi: ', con i nomi',
  cheCosaVede: 'Che cosa sta vedendo la classe',
  inPausa: 'In pausa',
  inProiezione: 'In proiezione',
}

export const testi = catalogo(it, {
  de: {
    inVista: (nome) => `${nome}: Das sieht die Klasse gerade. Ein Klick entfernt es.`,
    sulloSchermo: (blocco) => `Auf dem Bildschirm: ${blocco}`,
    conINomi: ', mit den Namen',
    cheCosaVede: 'Was die Klasse gerade sieht',
    inPausa: 'Pausiert',
    inProiezione: 'Wird projiziert',
  },
  fr: {
    inVista: (nome) => `${nome} : c’est ce que la classe voit. Un clic le retire.`,
    sulloSchermo: (blocco) => `À l’écran : ${minuscolo(blocco)}`,
    conINomi: ', avec les noms',
    cheCosaVede: 'Ce que la classe voit',
    inPausa: 'En pause',
    inProiezione: 'En projection',
  },
  en: {
    inVista: (nome) => `${nome}: this is what the class is seeing. Click to remove it.`,
    sulloSchermo: (blocco) => `On screen: ${minuscolo(blocco)}`,
    conINomi: ', with names',
    cheCosaVede: 'What the class is seeing',
    inPausa: 'Paused',
    inProiezione: 'Projecting',
  },
})
