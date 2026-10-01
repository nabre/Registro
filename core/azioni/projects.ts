// Il progetto di un corso (ADR-54): testata, compiti con inizio per allievo,
// giudizi e matrice a livelli. Le regole e le letture stanno in
// `core/dominio/projects.ts`; qui si trova, si controlla e si scrive. Un gesto
// che non cambia niente si prova su una copia e torna `invariato`, perché
// `modifica` leggerebbe il suo `false` come «non c'è più».
//
// L'ora conclusa: quel che annota un'ora (inizi, giudizi, celle) la segue come
// le osservazioni della lezione, e su un'ora svolta non si scrive né si toglie.
// La fine di un compito no: è una scadenza, come quella delle consegne, e può
// cadere in un'ora qualunque del corso.

import { allieviAttivi } from '../dominio/calculations.js'
import { istanteAdesso, oggi } from '../dominio/dates.js'
import { nuovoIdCompitoProgetto, nuovoIdGiudizioProgetto } from '../dominio/identifiers.js'
import type { Allievo, FaseProgetto, Iso, Lezione, Progetto, Registro } from '../dominio/models.js'
import { normalizzaProgetto } from '../dominio/normalization.js'
import {
  cellaVuota,
  celleDi,
  progettoPerId,
  ripulisciMatrice,
} from '../dominio/projects.js'
import { normalizzaTesto } from '../dominio/text.js'
import { validaProgetto } from '../dominio/validation.js'
import {
  aOraAperta,
  cestina,
  conMessaggio,
  invariato,
  rifiuta,
  rifiutaCon,
  riponi,
  type EsitoAzione,
  type Parte,
} from './context.js'
import { testi as comuni } from './context.testi.js'
import { testi } from './projects.testi.js'

/** Il pezzo del contesto che serve per scrivere. */
type Scrittura = Pick<Parameters<NonNullable<Parte['progetto.cella']>>[0], 'modifica'>

/** Un progetto trovato, o il rifiuto da tornare. */
type Trovato = { progetto: Progetto } | { errore: EsitoAzione }

function progettoDa (registro: Registro, progettoId: string): Trovato {
  const progetto = progettoPerId(registro, progettoId)
  if (!progetto) return { errore: rifiutaCon('non-trovato', comuni().vociSparite.progetti) }
  return { progetto }
}

/**
 * Scrive l'operazione sul progetto vivo, se cambia qualcosa, con il timbro di
 * aggiornamento; altrimenti `invariato`. Provata prima su una copia.
 */
function scriviSulProgetto (
  contesto: Scrittura,
  progetto: Progetto,
  op: (progetto: Progetto) => boolean,
): EsitoAzione {
  if (!op(structuredClone(progetto))) return invariato
  return contesto.modifica((r) => {
    const vivo = r.progetti.find((p) => p.id === progetto.id)
    if (!vivo) return false
    op(vivo)
    vivo.aggiornatoIl = istanteAdesso()
  }, ['progetti'], comuni().vociSparite.progetti)
}

/** Le persone della classe del corso, ritirati compresi: le loro voci si devono poter correggere. */
function allieviDelCorso (registro: Registro, corsoId: string): Allievo[] {
  const corso = registro.corsi.find((c) => c.id === corsoId)
  return registro.classi.find((c) => c.id === corso?.classeId)?.allievi ?? []
}

/** La lezione nominata, purché del corso del progetto; `null` se non se ne nomina una. */
function lezioneDelProgetto (
  registro: Registro,
  progetto: Progetto,
  lezioneId: string | null | undefined,
): { lezione: Lezione | null } | { errore: EsitoAzione } {
  if (!lezioneId) return { lezione: null }
  const lezione = registro.lezioni.find((l) => l.id === lezioneId)
  if (!lezione) return { errore: rifiutaCon('non-trovato', comuni().nonTrovato.lezione) }
  if (lezione.corsoId !== progetto.corsoId) return { errore: rifiuta(testi().lezioneDiAltroCorso) }
  return { lezione }
}

/** Vero se l'ora c'è ed è svolta: le voci che vi stanno non si toccano più. */
function inOraConclusa (registro: Registro, lezioneId: string | null | undefined): boolean {
  if (!lezioneId) return false
  return registro.lezioni.find((l) => l.id === lezioneId)?.stato === 'svolta'
}

/**
 * Criteri e fasi come li manda chi salva: uno senza id con il titolo (a meno
 * di maiuscole, accenti e spazi) di uno che c'è già ne riprende l'id. Così chi
 * rimanda la testata senza gli id non stacca le celle dal criterio, né le
 * tappe dei piani dalla fase.
 */
function conIdDi<T extends { id: string, titolo: string }> (
  chiesti: T[],
  esistenti: readonly T[],
): T[] {
  const usati = new Set(chiesti.map((c) => c.id).filter(Boolean))
  const liberi = new Map<string, string>()
  for (const criterio of esistenti) {
    const chiave = normalizzaTesto(criterio.titolo)
    if (!usati.has(criterio.id) && !liberi.has(chiave)) liberi.set(chiave, criterio.id)
  }
  return chiesti.map((criterio) => {
    if (criterio.id) return criterio
    const chiave = normalizzaTesto(criterio.titolo ?? '')
    const id = liberi.get(chiave)
    if (!id) return criterio
    liberi.delete(chiave)
    return { ...criterio, id }
  })
}

/**
 * Dove vanno le tappe di una fase tolta: nella fase rimasta che la precedeva,
 * se ce n'è una, se no nella prima. È il ripiego più vicino a quel che diceva
 * la tappa (il lavoro di prima, non quello che verrà).
 */
function destinoDelleFasi (prima: readonly FaseProgetto[], dopo: readonly FaseProgetto[]): Map<string, string> {
  const restano = new Set(dopo.map((f) => f.id))
  const destino = new Map<string, string>()
  let precedente: string | null = null
  for (const fase of prima) {
    if (restano.has(fase.id)) precedente = fase.id
    else destino.set(fase.id, precedente ?? dopo[0].id)
  }
  return destino
}

/**
 * Le celle che il salvataggio farebbe cadere o lascerebbe senza livello, con
 * i titoli dei criteri e i testi dei livelli di prima che ne sono la causa.
 */
function celleCheCadono (
  prima: Progetto,
  dopo: Pick<Progetto, 'criteri' | 'livelli'>,
): { n: number, criteri: string[], livelli: string[] } {
  const criteri = new Set(dopo.criteri.map((c) => c.id))
  const livelli = new Set(dopo.livelli.map((l) => l.valore))
  const criteriVia = new Set<string>()
  const livelliVia = new Set<string>()
  let n = 0
  for (const cella of prima.matrice) {
    if (!criteri.has(cella.criterioId)) {
      criteriVia.add(cella.criterioId)
      n++
    } else if (cella.livello !== null && !livelli.has(cella.livello)) {
      livelliVia.add(cella.livello)
      n++
    }
  }
  const titolo = (id: string) => prima.criteri.find((c) => c.id === id)?.titolo ?? id
  const testo = (valore: string) => prima.livelli.find((l) => l.valore === valore)?.testo ?? valore
  return { n, criteri: [...criteriVia].map(titolo), livelli: [...livelliVia].map(testo) }
}

/** L'ora della fine che resta, se la fine chiesta è ancora il suo giorno. */
function oraDellaFineTenuta (
  registro: Registro,
  fineLezioneId: string | null | undefined,
  fine: Iso | null,
): string | null {
  if (!fineLezioneId) return null
  const lezione = registro.lezioni.find((l) => l.id === fineLezioneId)
  return lezione && lezione.data === fine ? lezione.id : null
}

/** Il giorno e l'ora di una voce: quella dell'ora se c'è, se no il giorno dato, o oggi. */
function quando (
  lezione: Lezione | null,
  data: Iso | null | undefined,
): { data: Iso, lezioneId: string | null } {
  return lezione
    ? { data: lezione.data, lezioneId: lezione.id }
    : { data: data ?? oggi(), lezioneId: null }
}

/** I file delle risorse di un progetto. */
function fileDi (progetto: Pick<Progetto, 'risorse'>): string[] {
  return progetto.risorse.flatMap((r) => (r.file ? [r.file] : []))
}

export const progetti = {
  'progetto.salva': async (contesto, azione) => {
    const esito = validaProgetto(azione.progetto)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    const registro = contesto.registro
    if (!registro.corsi.some((c) => c.id === azione.progetto.corsoId)) {
      return rifiutaCon('non-trovato', comuni().nonTrovato.corso)
    }
    const prima = progettoPerId(registro, azione.progetto.id)
    if (prima && prima.corsoId !== azione.progetto.corsoId) return rifiuta(testi().altroCorso)
    // Come per i piani: un file non già citato potrebbe essere d'altri, e poi
    // verrebbe cestinato. Si rifiuta, non si azzera in silenzio.
    const citati = new Set(prima ? fileDi(prima) : [])
    const estranei = fileDi(azione.progetto).filter((f) => !citati.has(f))
    if (estranei.length > 0) return rifiuta(testi().fileEstranei(estranei.length))

    // Fasi omesse (un chiamante che non le conosce): restano quelle di prima.
    const fasiChieste = azione.progetto.fasi ?? prima?.fasi
    const letto = normalizzaProgetto({
      ...azione.progetto,
      fasi: fasiChieste && prima ? conIdDi(fasiChieste, prima.fasi) : fasiChieste,
      criteri: prima ? conIdDi(azione.progetto.criteri ?? [], prima.criteri) : azione.progetto.criteri ?? [],
    })
    // Un criterio tolto o un livello che non c'è più si portano via le celle:
    // non in silenzio. Si dice quante e perché; `scartaCelle` lo conferma.
    const cadono = prima ? celleCheCadono(prima, letto) : { n: 0, criteri: [], livelli: [] }
    if (cadono.n > 0 && !azione.scartaCelle) {
      return rifiuta(testi().celleCadrebbero(cadono.n, cadono.criteri, cadono.livelli))
    }
    const progetto: Progetto = {
      ...letto,
      // Quel che ha le sue azioni resta com'è nel registro.
      compiti: prima ? structuredClone(prima.compiti) : [],
      giudizi: prima ? structuredClone(prima.giudizi) : [],
      matrice: prima ? structuredClone(prima.matrice) : [],
      creatoIl: prima?.creatoIl ?? letto.creatoIl,
      aggiornatoIl: istanteAdesso(),
    }
    ripulisciMatrice(progetto)
    // Le tappe di una fase tolta non restano senza fase: passano a un'altra
    // del progetto, e lo si dice (non si rifiuta: nessun dato va perso).
    const destino = prima ? destinoDelleFasi(prima.fasi, progetto.fasi) : new Map<string, string>()
    const tappeDaSpostare = registro.piani.reduce((n, piano) => n + piano.attivita.filter((a) =>
      a.progettoId === progetto.id && destino.has(a.faseProgettoId ?? '')).length, 0)
    const restano = new Set(fileDi(progetto))
    const spariti = prima ? fileDi(prima).filter((f) => !restano.has(f)) : []
    // I piani si riscrivono solo se una tappa cambia davvero fase.
    const scritto = tappeDaSpostare > 0
      ? contesto.modifica((r) => {
          riponi(r.progetti, progetto)
          for (const piano of r.piani) {
            for (const attivita of piano.attivita) {
              const nuova = attivita.progettoId === progetto.id ? destino.get(attivita.faseProgettoId ?? '') : undefined
              if (nuova) attivita.faseProgettoId = nuova
            }
          }
        }, ['progetti', 'piani'])
      : contesto.modifica((r) => {
          riponi(r.progetti, progetto)
        }, ['progetti'])
    if (!scritto.ok) return scritto
    for (const file of spariti) await cestina(file)
    if (!prima) return { ok: true, creato: { id: progetto.id } }
    const avvisi = [
      ...(cadono.n > 0 ? [testi().celleScartate(cadono.n)] : []),
      ...(tappeDaSpostare > 0 ? [testi().tappeSpostate(tappeDaSpostare)] : []),
    ]
    return avvisi.length > 0 ? conMessaggio(avvisi.join(' ')) : scritto
  },

  'progetto.elimina': async (contesto, azione) =>
    contesto.elimina({ genere: 'progetto', id: azione.progettoId }),

  /**
   * Titolo, descrizione e fine comune; inizi, proroghe e spunte restano. Un
   * `fineLezioneId` omesso tiene l'ora della fine, se la fine data è ancora il
   * suo giorno (la si rimanda come la dà `progetti.leggi`); un altro giorno la
   * stacca dall'ora, `null` anche. La fine può stare in un'ora conclusa.
   */
  'progetto.compito.salva': (contesto, azione) => {
    const registro = contesto.registro
    const trovato = progettoDa(registro, azione.progettoId)
    if ('errore' in trovato) return trovato.errore
    const { progetto } = trovato
    const chiesto = azione.compito
    if (!chiesto.titolo.trim()) return rifiuta(testi().compitoSenzaTitolo)
    const vivo = chiesto.id ? progetto.compiti.find((c) => c.id === chiesto.id) : undefined
    if (chiesto.id && !vivo) return rifiutaCon('non-trovato', testi().compitoSparito)
    const fine = lezioneDelProgetto(registro, progetto, chiesto.fineLezioneId !== undefined
      ? chiesto.fineLezioneId
      : oraDellaFineTenuta(registro, vivo?.fineLezioneId, chiesto.fine))
    if ('errore' in fine) return fine.errore
    const id = vivo?.id ?? nuovoIdCompitoProgetto()
    const testata = {
      titolo: chiesto.titolo.trim(),
      descrizione: chiesto.descrizione?.trim() || undefined,
      fine: fine.lezione ? fine.lezione.data : chiesto.fine,
      fineLezioneId: fine.lezione?.id ?? null,
    }
    const scritto = scriviSulProgetto(contesto, progetto, (p) => {
      const compito = p.compiti.find((c) => c.id === id)
      if (!compito) {
        p.compiti.push({ id, ...testata, inizi: [], proroghe: [], fatti: [] })
        return true
      }
      const prima = JSON.stringify(compito)
      Object.assign(compito, testata)
      if (!compito.descrizione) delete compito.descrizione
      return JSON.stringify(compito) !== prima
    })
    if (!scritto.ok || vivo) return scritto
    return { ok: true, creato: { id } }
  },

  'progetto.compito.elimina': (contesto, azione) => {
    const trovato = progettoDa(contesto.registro, azione.progettoId)
    if ('errore' in trovato) return trovato.errore
    if (!trovato.progetto.compiti.some((c) => c.id === azione.compitoId)) {
      return rifiutaCon('non-trovato', testi().compitoSparito)
    }
    return scriviSulProgetto(contesto, trovato.progetto, (p) => {
      p.compiti = p.compiti.filter((c) => c.id !== azione.compitoId)
      return true
    })
  },

  /**
   * Segna l'inizio per le persone nominate. Con un giorno o un'ora lo sposta
   * anche a chi l'aveva; senza, è oggi solo per chi non ha cominciato, così
   * ripetere la chiamata su tutta la classe non sposta nessuno.
   */
  'progetto.compito.inizia': aOraAperta((contesto, azione) => {
    const registro = contesto.registro
    const trovato = progettoDa(registro, azione.progettoId)
    if ('errore' in trovato) return trovato.errore
    const { progetto } = trovato
    if (!progetto.compiti.some((c) => c.id === azione.compitoId)) {
      return rifiutaCon('non-trovato', testi().compitoSparito)
    }
    if (azione.allieviIds.length === 0) return rifiuta(testi().nessunoDaIniziare)
    const classe = new Set(allieviDelCorso(registro, progetto.corsoId).map((a) => a.id))
    if (azione.allieviIds.some((id) => !classe.has(id))) return rifiuta(comuni().fuoriClasse)
    const ora = lezioneDelProgetto(registro, progetto, azione.lezioneId)
    if ('errore' in ora) return ora.errore
    const voce = quando(ora.lezione, azione.data)
    const sposta = Boolean(ora.lezione || azione.data)
    return scriviSulProgetto(contesto, progetto, (p) => {
      const compito = p.compiti.find((c) => c.id === azione.compitoId)
      if (!compito) return false
      let cambiato = false
      for (const allievoId of new Set(azione.allieviIds)) {
        const gia = compito.inizi.find((i) => i.allievoId === allievoId)
        if (gia && !sposta) continue
        if (gia && gia.data === voce.data && gia.lezioneId === voce.lezioneId) continue
        if (gia) Object.assign(gia, voce)
        else compito.inizi.push({ allievoId, ...voce })
        cambiato = true
      }
      return cambiato
    })
  }),

  'progetto.compito.togliInizio': (contesto, azione) => {
    const trovato = progettoDa(contesto.registro, azione.progettoId)
    if ('errore' in trovato) return trovato.errore
    const compito = trovato.progetto.compiti.find((c) => c.id === azione.compitoId)
    if (!compito) return rifiutaCon('non-trovato', testi().compitoSparito)
    const via = new Set(azione.allieviIds)
    const chiusi = compito.inizi.filter((i) => inOraConclusa(contesto.registro, i.lezioneId))
    if (chiusi.some((i) => via.has(i.allievoId))) return rifiuta(comuni().oraSvolta)
    return scriviSulProgetto(contesto, trovato.progetto, (p) => {
      const compito = p.compiti.find((c) => c.id === azione.compitoId)
      if (!compito || !compito.inizi.some((i) => via.has(i.allievoId))) return false
      compito.inizi = compito.inizi.filter((i) => !via.has(i.allievoId))
      return true
    })
  },

  'progetto.compito.proroga': (contesto, azione) => {
    const registro = contesto.registro
    const trovato = progettoDa(registro, azione.progettoId)
    if ('errore' in trovato) return trovato.errore
    const { progetto } = trovato
    if (!progetto.compiti.some((c) => c.id === azione.compitoId)) {
      return rifiutaCon('non-trovato', testi().compitoSparito)
    }
    if (!allieviDelCorso(registro, progetto.corsoId).some((a) => a.id === azione.allievoId)) {
      return rifiuta(comuni().fuoriClasse)
    }
    const nota = azione.nota?.trim() || undefined
    return scriviSulProgetto(contesto, progetto, (p) => {
      const compito = p.compiti.find((c) => c.id === azione.compitoId)
      if (!compito) return false
      const gia = compito.proroghe.find((x) => x.allievoId === azione.allievoId)
      if (azione.fine === null) {
        if (!gia) return false
        compito.proroghe = compito.proroghe.filter((x) => x !== gia)
        return true
      }
      if (gia && gia.fine === azione.fine && gia.nota === nota) return false
      const proroga = { allievoId: azione.allievoId, fine: azione.fine, ...(nota ? { nota } : {}) }
      compito.proroghe = [...compito.proroghe.filter((x) => x !== gia), proroga]
      return true
    })
  },

  'progetto.compito.fatto': (contesto, azione) => {
    const registro = contesto.registro
    const trovato = progettoDa(registro, azione.progettoId)
    if ('errore' in trovato) return trovato.errore
    const { progetto } = trovato
    if (!progetto.compiti.some((c) => c.id === azione.compitoId)) {
      return rifiutaCon('non-trovato', testi().compitoSparito)
    }
    if (!allieviDelCorso(registro, progetto.corsoId).some((a) => a.id === azione.allievoId)) {
      return rifiuta(comuni().fuoriClasse)
    }
    const adesso = istanteAdesso()
    const nota = azione.nota?.trim() || undefined
    return scriviSulProgetto(contesto, progetto, (p) => {
      const compito = p.compiti.find((c) => c.id === azione.compitoId)
      if (!compito) return false
      const gia = compito.fatti.find((f) => f.allievoId === azione.allievoId)
      if (!azione.fatto) {
        if (!gia) return false
        compito.fatti = compito.fatti.filter((f) => f !== gia)
        return true
      }
      // Rispuntare non cambia il quando; una nota data la cambia.
      if (gia) {
        if (azione.nota === undefined || gia.nota === nota) return false
        if (nota) gia.nota = nota
        else delete gia.nota
        return true
      }
      const fatto = { allievoId: azione.allievoId, fattoIl: adesso }
      compito.fatti.push(nota ? { ...fatto, nota } : fatto)
      return true
    })
  },

  /**
   * Spuntare va a chi frequenta, e chi l'ha già fatto tiene la sua spunta.
   * Togliere toglie tutte le spunte, anche di chi s'è ritirato e con le loro
   * note: come `consegna.spuntaTutti`, ricomincia la colonna da capo.
   */
  'progetto.compito.fattoTutti': (contesto, azione) => {
    const registro = contesto.registro
    const trovato = progettoDa(registro, azione.progettoId)
    if ('errore' in trovato) return trovato.errore
    const { progetto } = trovato
    if (!progetto.compiti.some((c) => c.id === azione.compitoId)) {
      return rifiutaCon('non-trovato', testi().compitoSparito)
    }
    const classe = registro.classi.find((c) =>
      c.id === registro.corsi.find((k) => k.id === progetto.corsoId)?.classeId)
    const attivi = classe ? allieviAttivi(classe).map((a) => a.id) : []
    const adesso = istanteAdesso()
    return scriviSulProgetto(contesto, progetto, (p) => {
      const compito = p.compiti.find((c) => c.id === azione.compitoId)
      if (!compito) return false
      if (!azione.fatto) {
        if (compito.fatti.length === 0) return false
        compito.fatti = []
        return true
      }
      const gia = new Set(compito.fatti.map((f) => f.allievoId))
      const nuovi = attivi.filter((id) => !gia.has(id))
      compito.fatti.push(...nuovi.map((allievoId) => ({ allievoId, fattoIl: adesso })))
      return nuovi.length > 0
    })
  },

  'progetto.giudizio.salva': (contesto, azione) => {
    const registro = contesto.registro
    const trovato = progettoDa(registro, azione.progettoId)
    if ('errore' in trovato) return trovato.errore
    const { progetto } = trovato
    const chiesto = azione.giudizio
    if (!chiesto.testo.trim()) return rifiuta(testi().giudizioVuoto)
    if (
      chiesto.allievoId &&
      !allieviDelCorso(registro, progetto.corsoId).some((a) => a.id === chiesto.allievoId)
    ) {
      return rifiuta(comuni().fuoriClasse)
    }
    const ora = lezioneDelProgetto(registro, progetto, chiesto.lezioneId)
    if ('errore' in ora) return ora.errore
    const vivo = chiesto.id ? progetto.giudizi.find((g) => g.id === chiesto.id) : undefined
    if (chiesto.id && !vivo) return rifiutaCon('non-trovato', testi().giudizioSparito)
    const id = vivo?.id ?? nuovoIdGiudizioProgetto()
    // Senza data né ora, un giudizio che c'è già tiene il suo giorno.
    const voce = !ora.lezione && !chiesto.data && vivo
      ? { data: vivo.data, lezioneId: vivo.lezioneId }
      : quando(ora.lezione, chiesto.data)
    // Un giudizio annota l'ora come un'osservazione: in una conclusa non si
    // scrive, e quello che c'è non se ne sposta.
    if (inOraConclusa(registro, voce.lezioneId) || inOraConclusa(registro, vivo?.lezioneId)) {
      return rifiuta(comuni().oraSvolta)
    }
    const dati = { allievoId: chiesto.allievoId, testo: chiesto.testo.trim(), ...voce }
    const scritto = scriviSulProgetto(contesto, progetto, (p) => {
      const giudizio = p.giudizi.find((g) => g.id === id)
      if (!giudizio) {
        p.giudizi.push({ id, ...dati, creatoIl: istanteAdesso() })
        return true
      }
      const prima = JSON.stringify(giudizio)
      Object.assign(giudizio, dati)
      return JSON.stringify(giudizio) !== prima
    })
    if (!scritto.ok || vivo) return scritto
    return { ok: true, creato: { id } }
  },

  'progetto.giudizio.elimina': (contesto, azione) => {
    const trovato = progettoDa(contesto.registro, azione.progettoId)
    if ('errore' in trovato) return trovato.errore
    const giudizio = trovato.progetto.giudizi.find((g) => g.id === azione.giudizioId)
    if (!giudizio) return rifiutaCon('non-trovato', testi().giudizioSparito)
    if (inOraConclusa(contesto.registro, giudizio.lezioneId)) return rifiuta(comuni().oraSvolta)
    return scriviSulProgetto(contesto, trovato.progetto, (p) => {
      p.giudizi = p.giudizi.filter((g) => g.id !== azione.giudizioId)
      return true
    })
  },

  /**
   * Una cella della matrice nel suo giorno. Un omesso `nota` lascia quella che
   * c'è; livello nullo e nota vuota tolgono la cella. Se in quel giorno la
   * coppia ne ha più d'una (vedi `celleDi`), diventano questa sola.
   */
  'progetto.cella': aOraAperta((contesto, azione) => {
    const registro = contesto.registro
    const trovato = progettoDa(registro, azione.progettoId)
    if ('errore' in trovato) return trovato.errore
    const { progetto } = trovato
    if (!progetto.criteri.some((c) => c.id === azione.criterioId)) {
      return rifiutaCon('non-trovato', testi().criterioSparito)
    }
    if (azione.livello !== null && !progetto.livelli.some((l) => l.valore === azione.livello)) {
      return rifiuta(testi().livelloSconosciuto(azione.livello))
    }
    if (!allieviDelCorso(registro, progetto.corsoId).some((a) => a.id === azione.allievoId)) {
      return rifiuta(comuni().fuoriClasse)
    }
    const ora = lezioneDelProgetto(registro, progetto, azione.lezioneId)
    if ('errore' in ora) return ora.errore
    const voce = quando(ora.lezione, azione.data)
    const gia = celleDi(registro, progetto, azione.allievoId, azione.criterioId, voce.data)
    if (gia.some((c) => inOraConclusa(registro, c.lezioneId))) return rifiuta(comuni().oraSvolta)
    return scriviSulProgetto(contesto, progetto, (p) => {
      const [cella, ...doppie] =
        celleDi(registro, p, azione.allievoId, azione.criterioId, voce.data)
      if (doppie.length > 0) p.matrice = p.matrice.filter((c) => !doppie.includes(c))
      const nota = azione.nota === undefined ? cella?.nota : azione.nota.trim() || undefined
      const nuova = { livello: azione.livello, ...(nota ? { nota } : {}) }
      if (!cella) {
        if (cellaVuota(nuova)) return false
        p.matrice.push({
          allievoId: azione.allievoId,
          criterioId: azione.criterioId,
          ...voce,
          ...nuova,
        })
        return true
      }
      if (cellaVuota(nuova)) {
        p.matrice = p.matrice.filter((c) => c !== cella)
        return true
      }
      if (cella.livello === nuova.livello && cella.nota === nota) return doppie.length > 0
      cella.livello = nuova.livello
      if (nota) cella.nota = nota
      else delete cella.nota
      return true
    })
  }),
} satisfies Parte
