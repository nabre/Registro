// I progetti dal file: criteri, livelli, fasi, scaletta e, per ogni corso in
// cui sono integrati, stato, compiti, giudizi e matrice.

import { giornoDi, isoValida, istanteAdesso, oggi } from '#core/dominio/dates.js'
import { coloreValido } from '#core/dominio/lists.js'
import {
  nuovoIdProgetto,
  nuovoIdAttivita,
  nuovoIdCriterioProgetto,
  nuovoIdFaseProgetto,
  nuovoIdCompitoProgetto,
  nuovoIdGiudizioProgetto,
} from '#core/dominio/identifiers.js'
import type {
  Progetto,
  AttivitaProgetto,
  FaseProgetto,
  IntegrazioneProgetto,
  CompitoProgetto,
  CriterioProgetto,
  GiudizioProgetto,
  CellaProgetto,
  LivelloProgetto,
  Lezione,
} from '#core/dominio/models.js'
import { Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import {
  STATI_PROGETTO,
  cellaVuota,
  fasePredefinita,
  livelliPredefiniti,
  ripulisciMatrice,
} from '#core/dominio/projects.js'
import {
  testo,
  riferimento,
  unaData,
  unaVoce,
  elenco,
  oggetto,
  normalizzaRisorsa,
  normalizzaAttivita,
} from './readers.js'


/**
 * Gli id unici: un doppione (un file copiato a mano) ne prende uno nuovo, se no
 * le azioni per id toccherebbero sempre e solo il primo. Come per i criteri.
 */
function idUnici<T extends { id: string }> (voci: T[], nuovoId: () => string): T[] {
  const visti = new Set<string>()
  for (const voce of voci) {
    if (visti.has(voce.id)) voce.id = nuovoId()
    visti.add(voce.id)
  }
  return voci
}

/** Una voce per allievo: con due, vale la prima, come nel pannello. */
function unaPerAllievo<T extends { allievoId: string }> (voci: T[]): T[] {
  const visti = new Set<string>()
  return voci.filter((voce) => {
    if (!voce.allievoId || visti.has(voce.allievoId)) return false
    visti.add(voce.allievoId)
    return true
  })
}

function normalizzaCompitoProgetto (grezzo: unknown): CompitoProgetto {
  const dati = oggetto(grezzo)
  return {
    id: testo(dati.id) || nuovoIdCompitoProgetto(),
    titolo: testo(dati.titolo).trim() || Uno(lessico().compitoProgetto),
    descrizione: testo(dati.descrizione) || undefined,
    fine: isoValida(dati.fine) ? dati.fine : null,
    fineLezioneId: riferimento(dati.fineLezioneId),
    inizi: unaPerAllievo(elenco(dati.inizi).map((voce) => {
      const inizio = oggetto(voce)
      return {
        allievoId: testo(inizio.allievoId),
        data: unaData(inizio.data, oggi()),
        lezioneId: riferimento(inizio.lezioneId),
      }
    })),
    // Una proroga senza giorno non proroga niente.
    proroghe: unaPerAllievo(elenco(dati.proroghe).flatMap((voce) => {
      const proroga = oggetto(voce)
      if (!isoValida(proroga.fine)) return []
      return [{
        allievoId: testo(proroga.allievoId),
        fine: proroga.fine,
        nota: testo(proroga.nota) || undefined,
      }]
    })),
    fatti: unaPerAllievo(elenco(dati.fatti).map((voce) => {
      const fatto = oggetto(voce)
      return {
        allievoId: testo(fatto.allievoId),
        fattoIl: testo(fatto.fattoIl, istanteAdesso()),
        nota: testo(fatto.nota) || undefined,
      }
    })),
  }
}

/** Un giudizio senza testo non dice niente, e se ne va. */
function normalizzaGiudizioProgetto (grezzo: unknown): GiudizioProgetto | null {
  const dati = oggetto(grezzo)
  const scritto = testo(dati.testo)
  if (!scritto.trim()) return null
  const creatoIl = testo(dati.creatoIl, istanteAdesso())
  return {
    id: testo(dati.id) || nuovoIdGiudizioProgetto(),
    allievoId: riferimento(dati.allievoId),
    testo: scritto,
    data: unaData(dati.data, giornoDi(creatoIl) ?? oggi()),
    lezioneId: riferimento(dati.lezioneId),
    creatoIl,
  }
}

function normalizzaCellaProgetto (grezzo: unknown): CellaProgetto | null {
  const dati = oggetto(grezzo)
  const allievoId = testo(dati.allievoId)
  const criterioId = testo(dati.criterioId)
  if (!allievoId || !criterioId) return null
  const livello = typeof dati.livello === 'string' && dati.livello ? dati.livello : null
  return {
    allievoId,
    criterioId,
    data: unaData(dati.data, oggi()),
    lezioneId: riferimento(dati.lezioneId),
    livello,
    nota: testo(dati.nota) || undefined,
  }
}

/**
 * L'integrazione in un corso dal file; senza corso non c'è classe di cui
 * parlare, e se ne va. Compiti e giudizi con id unico, celle ripulite: niente
 * vuote, né due nella stessa ora (o nello stesso giorno senza ora) sulla
 * stessa coppia.
 */
function normalizzaIntegrazione (grezzo: unknown): IntegrazioneProgetto | null {
  const dati = oggetto(grezzo)
  const corsoId = testo(dati.corsoId)
  if (!corsoId) return null
  const caselle = new Set<string>()
  const matrice: CellaProgetto[] = []
  for (const cella of elenco(dati.matrice).map(normalizzaCellaProgetto)) {
    if (!cella || cellaVuota(cella)) continue
    const casella = `${cella.allievoId} ${cella.criterioId} ${cella.lezioneId ?? cella.data}`
    if (caselle.has(casella)) continue
    caselle.add(casella)
    matrice.push(cella)
  }
  return {
    corsoId,
    stato: unaVoce(dati.stato, STATI_PROGETTO, 'bozza'),
    compiti: idUnici(elenco(dati.compiti).map(normalizzaCompitoProgetto), nuovoIdCompitoProgetto),
    giudizi: idUnici(
      elenco(dati.giudizi)
        .map(normalizzaGiudizioProgetto)
        .filter((g): g is GiudizioProgetto => g !== null),
      nuovoIdGiudizioProgetto,
    ),
    matrice,
  }
}

/**
 * Fonde nell'integrazione superstite quella di un corso doppione: compiti e
 * giudizi si sommano (gli id sono unici nell'anno); delle celle sulla stessa
 * casella vale quella del superstite, come per le spunte del check. La casella
 * è persona, criterio e giorno, non l'ora (`celleDi`: un giorno, una cella):
 * due ore dello stesso giorno, o un'ora e il giorno senza ora, ne fanno una.
 * Il giorno di un'ora è quello della lezione, come in `giornoDellaVoce`.
 */
export function fondiIntegrazione (
  superstite: IntegrazioneProgetto,
  doppione: IntegrazioneProgetto,
  lezioni: readonly Pick<Lezione, 'id' | 'data'>[],
): void {
  superstite.compiti.push(...doppione.compiti)
  superstite.giudizi.push(...doppione.giudizi)
  const giorni = new Map(lezioni.map((l) => [l.id, l.data]))
  const giorno = (c: CellaProgetto) => (c.lezioneId ? giorni.get(c.lezioneId) : undefined) ?? c.data
  const casella = (c: CellaProgetto) => `${c.allievoId} ${c.criterioId} ${giorno(c)}`
  const prese = new Set(superstite.matrice.map(casella))
  superstite.matrice.push(...doppione.matrice.filter((c) => !prese.has(casella(c))))
}

/**
 * Il progetto dal file. Criteri con id unico, una scala che non resta mai
 * vuota (senza, la matrice non saprebbe che cosa scrivere), un'integrazione
 * per corso, celle ripulite come dopo un salvataggio: niente celle di criteri
 * spariti. Il giorno di un'ora qui non si sa (manca il registro): due celle
 * dello stesso giorno, una nell'ora e una no, restano, e `progetto.cella` le
 * riscrive insieme.
 *
 * `fondiCon` (le lezioni dell'anno, per il giorno delle ore) quando la
 * migrazione ha spostato un'integrazione dal corso doppione a quello tenuto
 * (`Migrazione.conCorsoVero`): lì due integrazioni sullo stesso corso sono
 * lavoro vero di due corsi, e si fondono invece di tenere la prima.
 */
export function normalizzaProgetto (
  grezzo: unknown,
  fondiCon?: readonly Pick<Lezione, 'id' | 'data'>[],
): Progetto {
  const dati = oggetto(grezzo)
  const ora = istanteAdesso()

  const idCriteri = new Set<string>()
  const criteri: CriterioProgetto[] = []
  for (const voce of elenco(dati.criteri)) {
    const criterio = oggetto(voce)
    const titolo = testo(criterio.titolo).trim()
    let id = testo(criterio.id)
    if (!id && !titolo) continue
    if (!id || idCriteri.has(id)) id = nuovoIdCriterioProgetto()
    idCriteri.add(id)
    criteri.push({ id, titolo, descrizione: testo(criterio.descrizione) || undefined })
  }

  const valori = new Set<string>()
  const livelli: LivelloProgetto[] = []
  for (const voce of elenco(dati.livelli)) {
    const livello = oggetto(voce)
    const valore = testo(livello.valore).trim()
    if (!valore || valori.has(valore)) continue
    valori.add(valore)
    const colore = testo(livello.colore)
    livelli.push({
      valore,
      testo: testo(livello.testo).trim() || valore,
      descrizione: testo(livello.descrizione).trim() || undefined,
      colore: coloreValido(colore) ? colore : undefined,
    })
  }

  // Sempre almeno una fase: le tappe del progetto devono cadere in una.
  const idFasi = new Set<string>()
  const fasi: FaseProgetto[] = []
  for (const voce of elenco(dati.fasi)) {
    const fase = oggetto(voce)
    let id = testo(fase.id)
    if (!id || idFasi.has(id)) id = nuovoIdFaseProgetto()
    idFasi.add(id)
    fasi.push({
      id,
      titolo: testo(fase.titolo).trim() || fasePredefinita(fasi.length + 1).titolo,
      descrizione: testo(fase.descrizione) || undefined,
    })
  }
  if (fasi.length === 0) fasi.push(fasePredefinita())

  const attivita: AttivitaProgetto[] = elenco(dati.attivita).map((grezza) => {
    const voce = oggetto(grezza)
    const {
      risorse: _risorse, progettoId: _progetto, faseProgettoId: _fase,
      attivitaProgettoId: _origine, ...contenuto
    } = normalizzaAttivita(voce)
    return {
      ...contenuto,
      faseId: fasi.find((f) => f.id === riferimento(voce.faseId))?.id ?? fasi[0].id,
    }
  })

  // Un'integrazione per corso: con due, vale la prima, come per le voci per
  // allievo; o si fondono, se vengono da due corsi diventati uno.
  const perCorso = new Map<string, IntegrazioneProgetto>()
  const integrazioni: IntegrazioneProgetto[] = []
  for (const voce of elenco(dati.integrazioni)) {
    const integrazione = normalizzaIntegrazione(voce)
    if (!integrazione) continue
    const gia = perCorso.get(integrazione.corsoId)
    if (!gia) {
      perCorso.set(integrazione.corsoId, integrazione)
      integrazioni.push(integrazione)
      continue
    }
    if (!fondiCon) continue
    fondiIntegrazione(gia, integrazione, fondiCon)
    // Gli id restano unici anche se i due corsi venivano da una copia.
    idUnici(gia.compiti, nuovoIdCompitoProgetto)
    idUnici(gia.giudizi, nuovoIdGiudizioProgetto)
  }

  const progetto: Progetto = {
    id: testo(dati.id) || nuovoIdProgetto(),
    titolo: testo(dati.titolo).trim() || Uno(lessico().progetto),
    descrizione: testo(dati.descrizione) || undefined,
    obiettivi: elenco(dati.obiettivi).map((o) => testo(o).trim()).filter(Boolean),
    fasi,
    attivita: idUnici(attivita, nuovoIdAttivita),
    criteri,
    livelli: livelli.length > 0 ? livelli : livelliPredefiniti(),
    integrazioni,
    risorse: elenco(dati.risorse).map(normalizzaRisorsa),
    note: testo(dati.note) || undefined,
    creatoIl: testo(dati.creatoIl, ora),
    aggiornatoIl: testo(dati.aggiornatoIl, ora),
  }
  ripulisciMatrice(progetto)
  return progetto
}
