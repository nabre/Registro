// I testi dei periodi di assenze da far firmare (`absences.ts`): come si
// chiamano i fogli, come la lettera nomina i rapporti allegati, e a chi manca
// l'indirizzo.
//
// `rapporti` entra nella lettera di serie al posto di `{rapporti}` («in
// allegato trovate {rapporti} di …»), e ogni lingua lo scrive nel caso che la
// sua lettera vuole: in tedesco è un accusativo, «Im Anhang finden Sie den
// Absenzenbericht».

import { catalogo } from '../i18n/index.js'
import { PERSONE } from './lexicon.js'
import type { TipoRapporto } from './models.js'

const it = {
  /** Il foglio nelle etichette: «assenze», «ritardi firmati». */
  foglio: (tipo: TipoRapporto, firmato: boolean) => {
    if (!firmato) return tipo
    return tipo === 'assenze' ? 'assenze firmate' : 'ritardi firmati'
  },
  /** A chi manca l'indirizzo, quando non si sa il nome dell'azienda. */
  rappresentanteDi: (nome: string) => `${PERSONE.rappresentante.singolare} di ${nome}`,
  /** «il rapporto delle assenze», «i rapporti delle assenze e dei ritardi». */
  rapporti: (tipi: readonly TipoRapporto[]) => {
    const nomi = tipi.map((tipo) => (tipo === 'assenze' ? 'delle assenze' : 'dei ritardi'))
    if (nomi.length === 1) return `il rapporto ${nomi[0]}`
    return `i rapporti ${(nomi.length > 0 ? nomi : ['delle assenze', 'dei ritardi']).join(' e ')}`
  },
  /** Gli stessi rapporti in un oggetto: «Assenze», «Ritardi», «Assenze e ritardi». */
  tipi: (tipi: readonly TipoRapporto[]) => {
    if (tipi.length === 1) return tipi[0] === 'assenze' ? 'Assenze' : 'Ritardi'
    return 'Assenze e ritardi'
  },
}

export const testi = catalogo(it, {
  de: {
    foglio: (tipo, firmato) => {
      const nome = tipo === 'assenze' ? 'Absenzen' : 'Verspätungen'
      return firmato ? `unterschriebene ${nome}` : nome
    },
    rappresentanteDi: (nome) => `gesetzliche Vertretung von ${nome}`,
    rapporti: (tipi) => {
      if (tipi.length === 1) {
        return tipi[0] === 'assenze' ? 'den Absenzenbericht' : 'den Verspätungsbericht'
      }
      return 'die Berichte über Absenzen und Verspätungen'
    },
    tipi: (tipi) => {
      if (tipi.length === 1) return tipi[0] === 'assenze' ? 'Absenzen' : 'Verspätungen'
      return 'Absenzen und Verspätungen'
    },
  },
  fr: {
    foglio: (tipo, firmato) => {
      if (tipo === 'assenze') return firmato ? 'absences signées' : 'absences'
      return firmato ? 'retards signés' : 'retards'
    },
    rappresentanteDi: (nome) => `représentant légal de ${nome}`,
    rapporti: (tipi) => {
      if (tipi.length === 1) {
        return tipi[0] === 'assenze' ? 'le rapport des absences' : 'le rapport des retards'
      }
      return 'les rapports des absences et des retards'
    },
    tipi: (tipi) => {
      if (tipi.length === 1) return tipi[0] === 'assenze' ? 'Absences' : 'Retards'
      return 'Absences et retards'
    },
  },
  en: {
    foglio: (tipo, firmato) => {
      const nome = tipo === 'assenze' ? 'absences' : 'late arrivals'
      return firmato ? `signed ${nome}` : nome
    },
    rappresentanteDi: (nome) => `legal guardian of ${nome}`,
    rapporti: (tipi) => {
      if (tipi.length === 1) {
        return tipi[0] === 'assenze' ? 'the absence report' : 'the late-arrival report'
      }
      return 'the absence and late-arrival reports'
    },
    tipi: (tipi) => {
      if (tipi.length === 1) return tipi[0] === 'assenze' ? 'Absences' : 'Late arrivals'
      return 'Absences and late arrivals'
    },
  },
})
