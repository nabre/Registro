// I modelli consigliati del registro per l'assistente e per l'OCR.
//
// Generato da `resources/modelli-consigliati.json` con
// `npm run modelli-consigliati`: non si scrive a mano. Che i due siano
// in accordo lo controlla `npm test`.

import { testi } from './gguf.testi.js'

/** A che cosa serve un modello, nel registro. */
export type PerChe = 'assistente' | 'ocr'

/** Una voce consigliata: un deposito, e perché sta in elenco. */
export interface VoceCatalogo {
  /** Il deposito: `utente/nome`. */
  deposito: string
  /** Come si chiama per chi legge. */
  titolo: string
  perChe: PerChe
  /** La quantizzazione da preferire, fra quelle che il deposito pubblica. */
  taglio: string
  /** Una riga: che cosa sa fare, e che macchina vuole. */
  nota: string
}

/** Una voce consigliata, con il titolo e la nota letti nella lingua di adesso. */
function consigliato (
  deposito: string,
  quale: keyof ReturnType<typeof testi>['consigliati'],
  perChe: PerChe,
  taglio: string,
): VoceCatalogo {
  return {
    deposito,
    get titolo () {
      return testi().consigliati[quale].titolo
    },
    perChe,
    taglio,
    get nota () {
      return testi().consigliati[quale].nota
    },
  }
}

/**
 * I modelli consigliati: una macchina piccola e una normale per ciascun uso.
 * Sono depositi, non file, perché i nomi dei file cambiano; per l'assistente
 * niente sotto i 3B, che chiama male gli attrezzi. Titolo e nota sono getter:
 * `{ ...voce }` ne copia i valori nella lingua di quel momento.
 */
export const CATALOGO: readonly VoceCatalogo[] = [
  consigliato('bartowski/Qwen2.5-7B-Instruct-GGUF', 'qwen7', 'assistente', 'Q4_K_M'),
  consigliato('bartowski/Qwen2.5-3B-Instruct-GGUF', 'qwen3', 'assistente', 'Q4_K_M'),
  consigliato('ggml-org/Qwen2.5-VL-7B-Instruct-GGUF', 'qwenVl', 'ocr', 'Q4_K_M'),
  consigliato('ggml-org/SmolVLM-500M-Instruct-GGUF', 'smolVlm', 'ocr', 'Q8_0'),
]
