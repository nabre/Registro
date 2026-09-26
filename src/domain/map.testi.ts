// I testi di `map.ts`: i generi dei punti sulla mappa, i cartellini dei
// segnaposti e le distanze con il decimale.

import { catalogo, numero } from '../i18n/index.js'

/** Un decimale, come la lingua lo scrive: «2.3» in tedesco svizzero, «2,3» in francese. */
const unDecimale = (km: number) =>
  numero(km, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const it = {
  domicilio: 'Domicilio',
  lavoro: 'Posto di lavoro',
  sede: 'Sede scolastica',
  /** Più aziende allo stesso indirizzo: sempre più d'una. */
  aziende: (n: number) => `${n} aziende`,
  /** Più persone allo stesso indirizzo: sempre più d'una. */
  persone: (n: number) => `${n} persone`,
  inTirocinio: (n: number) => `${n} in tirocinio qui`,
  stessoIndirizzo: (n: number) => `Stesso indirizzo · ${n} persone`,
  eAltre: (classe: string) => `${classe} e altre`,
  /**
   * Una distanza sotto i dieci chilometri. In italiano la virgola scritta a
   * mano: `Intl` in `it-CH` mette il punto.
   */
  kmDecimale: (km: number) => `${km.toFixed(1).replace('.', ',')} km`,
}

export const testi = catalogo(it, {
  de: {
    domicilio: 'Wohnort',
    lavoro: 'Arbeitsort',
    sede: 'Schulstandort',
    aziende: (n) => `${n} Lehrbetriebe`,
    persone: (n) => `${n} Personen`,
    inTirocinio: (n) => `${n} machen hier die Lehre`,
    stessoIndirizzo: (n) => `Gleiche Adresse · ${n} Personen`,
    eAltre: (classe) => `${classe} und weitere`,
    kmDecimale: (km) => `${unDecimale(km)} km`,
  },
  fr: {
    domicilio: 'Domicile',
    lavoro: 'Lieu de travail',
    sede: 'Site scolaire',
    aziende: (n) => `${n} entreprises`,
    persone: (n) => `${n} personnes`,
    inTirocinio: (n) => `${n} en apprentissage ici`,
    stessoIndirizzo: (n) => `Même adresse · ${n} personnes`,
    eAltre: (classe) => `${classe} et autres`,
    kmDecimale: (km) => `${unDecimale(km)} km`,
  },
  en: {
    domicilio: 'Home',
    lavoro: 'Workplace',
    sede: 'School site',
    aziende: (n) => `${n} companies`,
    persone: (n) => `${n} people`,
    inTirocinio: (n) => `${n} training here`,
    stessoIndirizzo: (n) => `Same address · ${n} people`,
    eAltre: (classe) => `${classe} and others`,
    kmDecimale: (km) => `${unDecimale(km)} km`,
  },
})
