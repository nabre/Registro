// Identificatori delle entità. Devono reggere due cose: finire in un file JSON
// che si apre con un editor di testo, e non collidere se due macchine
// modificano lo stesso registro (OneDrive sincronizza, non fonde).
// Un prefisso parlante più tempo più caso: leggibile a occhio e ordinabile.

const ALFABETO = '0123456789abcdefghijklmnopqrstuvwxyz'

function casuale (lunghezza: number): string {
  let esito = ''
  for (let i = 0; i < lunghezza; i += 1) {
    esito += ALFABETO[Math.floor(Math.random() * ALFABETO.length)]
  }
  return esito
}

/** `prefisso-<tempo in base36>-<4 casuali>`, per esempio `lez-m3k9x2-a7f1`. */
export function identificatore (prefisso: string): string {
  return `${prefisso}-${Date.now().toString(36)}-${casuale(4)}`
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
export const nuovoIdOsservazione = () => identificatore('oss')
export const nuovoIdPiano = () => identificatore('pia')
export const nuovoIdAttivita = () => identificatore('att')
export const nuovoIdValutazione = () => identificatore('val')
export const nuovoIdAllegato = () => identificatore('alg')
export const nuovoIdRisorsa = () => identificatore('ris')
export const nuovoIdRecapito = () => identificatore('rec')
export const nuovoIdDocumento = () => identificatore('doc')
export const nuovoIdComunicazione = () => identificatore('com')
export const nuovoIdFascicolo = () => identificatore('fas')
export const nuovoIdBloccoAssenze = (): string => identificatore('ass')
export const nuovoIdSmistamento = (): string => identificatore('smi')
export const nuovoIdBlocco = (): string => identificatore('blc')
