// Identificatori delle entità: leggibili in un JSON aperto a mano e senza
// collisioni fra due macchine sullo stesso registro (OneDrive sincronizza, non
// fonde). Prefisso parlante, tempo, caso.

const ALFABETO = '0123456789abcdefghijklmnopqrstuvwxyz'

function casuale (lunghezza: number): string {
  let esito = ''
  for (let i = 0; i < lunghezza; i += 1) {
    esito += ALFABETO[Math.floor(Math.random() * ALFABETO.length)]
  }
  return esito
}

/**
 * `prefisso-<tempo in base36>-<8 casuali>`, per esempio `lez-m3k9x2-a7f1q0zc`.
 * Otto caratteri casuali perché un orario intero genera centinaia di id nello
 * stesso millisecondo.
 */
export function identificatore (prefisso: string): string {
  return `${prefisso}-${Date.now().toString(36)}-${casuale(8)}`
}

export const nuovoIdAnno = () => identificatore('ann')
export const nuovoIdSemestre = () => identificatore('sem')
export const nuovoIdSospensione = () => identificatore('sos')
export const nuovoIdRicorrenza = () => identificatore('ric')
export const nuovoIdMateria = () => identificatore('mat')
export const nuovoIdCorso = () => identificatore('cor')
export const nuovoIdClasse = () => identificatore('cls')
export const nuovoIdAllievo = () => identificatore('alv')
export const nuovoIdLezione = () => identificatore('lez')
export const nuovoIdSlot = () => identificatore('slt')
export const nuovoIdConsegna = (): string => identificatore('cns')
export const nuovoIdCheck = (): string => identificatore('chk')
export const nuovoIdColonnaCheck = (): string => identificatore('clc')
export const nuovoIdOsservazione = () => identificatore('oss')
export const nuovoIdPiano = () => identificatore('pia')
export const nuovoIdAttivita = () => identificatore('att')
export const nuovoIdValutazione = () => identificatore('val')
export const nuovoIdAllegato = () => identificatore('alg')
export const nuovoIdRisorsa = () => identificatore('ris')
export const nuovoIdRecapito = () => identificatore('rec')
export const nuovoIdTelefono = () => identificatore('tel')
export const nuovoIdDocumento = () => identificatore('doc')
export const nuovoIdComunicazione = () => identificatore('com')
export const nuovoIdFascicolo = () => identificatore('fas')
export const nuovoIdBloccoAssenze = (): string => identificatore('ass')
export const nuovoIdSmistamento = (): string => identificatore('smi')
export const nuovoIdBlocco = (): string => identificatore('blc')
export const nuovoIdRegolaCalendario = (): string => identificatore('rgc')
export const nuovoIdCalendarioEsterno = (): string => identificatore('ics')
