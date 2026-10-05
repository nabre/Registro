import { testi } from './overview.testi.js'
import { sezione, type SezioneGuida } from './types.js'

export const SEZIONI_PANORAMICA: readonly SezioneGuida[] = [sezione({
  id: 'panoramica', parte: 'registro', simbolo: 'colonne', vista: 'overview',
  vedi: ['piani', 'integrazioneProgetti', 'valutazioni', 'check'],
}, testi())]
