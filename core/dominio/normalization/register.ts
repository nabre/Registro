// Il registro intero dal file, di qualunque versione: mette insieme i lettori
// della cartella e la migrazione delle forme vecchie (`migration.ts`).

import type { Registro } from '#core/dominio/models.js'
import { VERSIONE_DATI } from '#core/dominio/models.js'
import { fasiDelleTappe } from '#core/dominio/projects.js'
import { Migrazione } from '#core/dominio/migration.js'
import {
  testo,
  riferimento,
  elenco,
  oggetto,
  normalizzaAnno,
  normalizzaMateria,
  normalizzaCorso,
  normalizzaClasse,
  normalizzaLezione,
  normalizzaFascicolo,
  coordinateDellAnno,
  normalizzaPiano,
  normalizzaValutazione,
} from './readers.js'
import { minutiUdLetti, normalizzaImpostazioni, conCarteComplete } from './settings.js'
import {
  compitiDiventatiConsegne,
  conSpunteDiChiusura,
  documentiDiventatiConsegne,
  normalizzaConsegna,
} from './deliveries.js'
import { normalizzaCheck, unCheckPerCorso } from './check.js'
import { normalizzaProgetto } from './projects.js'
import { normalizzaSmistamento } from './sorting.js'

/**
 * Un registro completo da quel che c'è su disco, di qualunque versione. Non
 * lancia mai: al peggio un registro vuoto. `Archivio` si accorge delle
 * migrazioni e riscrive i file una volta.
 */
export function normalizzaRegistro (grezzo: unknown): Registro {
  const dati = oggetto(grezzo)
  // Prima la durata dell'UD: orari e fasce si leggono in UD di quella lunghezza.
  const minutiUd = minutiUdLetti(oggetto(dati.impostazioni).minutiUd)
  const anni = elenco(dati.anni).map(normalizzaAnno)
  const annoCorrenteId = testo(dati.annoCorrenteId)
  const classiGrezze = elenco(dati.classi)

  // La migrazione riceve dati e fabbriche invece di importare questa cartella
  // (che la importa).
  const migrazione = new Migrazione(
    elenco(dati.materie).map(normalizzaMateria),
    classiGrezze.map((grezza) => {
      const classe = oggetto(grezza)
      return {
        id: testo(classe.id),
        materiaId: typeof classe.materiaId === 'string' ? classe.materiaId : '',
        materia: testo(classe.materia),
      }
    }),
    { materia: normalizzaMateria, corso: (corso) => normalizzaCorso(corso, minutiUd) },
  )
  const classi = classiGrezze.map((grezza, indice) => normalizzaClasse(grezza, indice))

  // Prima i corsi scritti (v2), poi i programmi (v1), poi le coppie implicite
  // nelle classi: chi arriva prima tiene il suo id e i suoi piani.
  for (const grezzo of elenco(dati.corsi)) migrazione.accogli(normalizzaCorso(grezzo, minutiUd))
  for (const grezzo of elenco(dati.programmi)) {
    migrazione.accogli(normalizzaCorso(grezzo, minutiUd), testo(oggetto(grezzo).id))
  }
  for (const classe of classi) {
    if (migrazione.corsi.some((c) => c.classeId === classe.id)) continue
    const grezza = oggetto(classiGrezze.find((c) => testo(oggetto(c).id) === classe.id))
    const suaMateria = typeof grezza.materiaId === 'string' && grezza.materiaId
    if (suaMateria || testo(grezza.materia).trim()) migrazione.corsoDiClasse(classe.id)
  }

  // Le lezioni: le nuove hanno il corso, le vecchie lo trovano dalla coppia
  // classe+materia. Un `corsoId` che è l'id di una classe si riaggancia. Tutte
  // passano da `conCorsoVero`, che le sposta dal doppione scartato.
  const lezioni = elenco(dati.lezioni).map((grezza) => {
    const dato = oggetto(migrazione.conCorsoVero(grezza))
    const suo = testo(dato.corsoId)
    if (suo && migrazione.conosce(suo)) return normalizzaLezione(dato, minutiUd, suo)
    if (suo && migrazione.eUnaClasse(suo)) {
      return normalizzaLezione(dato, minutiUd, migrazione.corsoDiClasse(suo).id)
    }
    if (suo) return normalizzaLezione(dato, minutiUd, suo)
    const classeId = testo(dato.classeId)
    if (!classeId) return normalizzaLezione(dato, minutiUd)
    const materiaId = riferimento(dato.materiaId)
    return normalizzaLezione(dato, minutiUd, migrazione.corsoDiClasse(classeId, materiaId).id)
  })

  // I piani si legano alla materia (dal programma o dalla classe), non più ad
  // anno e classe.
  const piani = elenco(dati.piani).map((grezzo) => {
    const dato = oggetto(migrazione.conCorsoVero(grezzo))
    if (typeof dato.corsoId === 'string' && dato.corsoId) return normalizzaPiano(dato)
    // I piani legati alla materia vanno sul primo corso che la porta.
    if (typeof dato.materiaId === 'string' && dato.materiaId) {
      const suo = migrazione.corsi.find((c) => c.materiaId === dato.materiaId)
      return normalizzaPiano(dato, suo?.id ?? null)
    }
    const dalProgramma = migrazione.corsoDelProgramma(testo(dato.programmaId))
    if (dalProgramma) return normalizzaPiano(dato, dalProgramma.id)
    const classeId = testo(dato.classeId)
    if (!classeId) return normalizzaPiano(dato)
    return normalizzaPiano(dato, migrazione.corsoDiClasse(classeId).id)
  })

  // Le valutazioni: il corso dalla lezione, o dalla classe. Il semestre
  // salvato si butta: lo dice la data.
  const lezionePerId = new Map(lezioni.map((l) => [l.id, l]))
  const valutazioni = elenco(dati.valutazioni).map((grezzo) => {
    const dato = oggetto(migrazione.conCorsoVero(grezzo))
    const suo = testo(dato.corsoId)
    if (suo && migrazione.conosce(suo)) return normalizzaValutazione(dato, suo)
    if (suo && migrazione.eUnaClasse(suo)) {
      return normalizzaValutazione(dato, migrazione.corsoDiClasse(suo).id)
    }
    if (suo) return normalizzaValutazione(dato, suo)
    const lezione = lezionePerId.get(testo(dato.lezioneId))
    if (lezione?.corsoId) return normalizzaValutazione(dato, lezione.corsoId)
    const classeId = testo(dato.classeId)
    if (!classeId) return normalizzaValutazione(dato)
    return normalizzaValutazione(dato, migrazione.corsoDiClasse(classeId).id)
  })

  // I fascicoli: quelli scritti, più quelli che stavano dentro le classi.
  const fascicoli = elenco(dati.fascicoli).map(normalizzaFascicolo)
  const gia = new Set(fascicoli.map((f) => f.classeId))
  for (const grezza of classiGrezze) {
    const classe = oggetto(grezza)
    const classeId = testo(classe.id)
    if (!classeId || gia.has(classeId)) continue
    const roba =
      elenco(classe.recapiti).length +
      elenco(classe.documenti).length +
      elenco(classe.comunicazioni).length
    if (roba === 0) continue
    fascicoli.push(
      normalizzaFascicolo({
        classeId,
        recapiti: classe.recapiti,
        documenti: classe.documenti,
        comunicazioni: classe.comunicazioni,
      }),
    )
    gia.add(classeId)
  }

  migrazione.intitola(classi)

  // Prima del return: svuota dai fascicoli i documenti che ha convertito.
  const dallaRaccolta = documentiDiventatiConsegne(fascicoli, migrazione.corsi)

  const registro: Registro = {
    versione: VERSIONE_DATI,
    anni,
    annoCorrenteId: anni.some((a) => a.id === annoCorrenteId)
      ? annoCorrenteId
      : anni[0]?.id ?? null,
    materie: migrazione.materie,
    classi,
    corsi: migrazione.corsi,
    lezioni,
    piani,
    valutazioni,
    fascicoli,
    consegne: conSpunteDiChiusura(
      [
        ...elenco(dati.consegne).map((g) => normalizzaConsegna(migrazione.conCorsoVero(g))),
        ...compitiDiventatiConsegne(elenco(dati.lezioni), lezioni),
        ...dallaRaccolta,
      ],
      // Chiuse a mano, più i compiti migrati, che nascono chiusi.
      new Set([
        ...elenco(dati.consegne)
          .filter((grezza) => Boolean(oggetto(grezza).chiusa))
          .map((grezza) => testo(oggetto(grezza).id)),
        ...compitiDiventatiConsegne(elenco(dati.lezioni), lezioni).map((c) => c.id),
      ]),
      classi,
      migrazione.corsi,
    ),
    check: unCheckPerCorso(
      elenco(dati.check).map((g) => normalizzaCheck(migrazione.conCorsoVero(g))),
    ),
    progetti: elenco(dati.progetti).map((g) => normalizzaProgetto(migrazione.conCorsoVero(g))),
    smistamenti: elenco(dati.smistamenti).map(normalizzaSmistamento),
    coordinate: coordinateDellAnno(dati, classiGrezze),
    impostazioni: conCarteComplete(normalizzaImpostazioni(dati.impostazioni), migrazione.corsi),
  }
  fasiDelleTappe(registro)
  return registro
}
