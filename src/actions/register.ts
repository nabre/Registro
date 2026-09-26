// L'anagrafica del registro: anni, materie, corsi, classi e allievi. Regge
// tutto il resto, quindi ogni salvataggio si valida anche contro gli altri.

import * as apparato from 'apparato'

import { nomeCompleto } from '../domain/calculations.js'
import { lezioniDaOrario, lezioniNeiGiorniChiusi } from '../domain/timetable.js'
import { annoAllineato, conLetteraSettimana } from '../domain/years.js'
import type {
  AnnoScolastico,
  Attivita,
  Classe,
  PianoLezione,
  Registro,
  Risorsa,
} from '../domain/models.js'
import {
  creaAllievo,
  creaAnno,
  creaCheck,
  creaCorso,
  duplicaClasse,
} from '../domain/factories.js'
import { corsoDi, corsoPerId, titoloCorso } from '../domain/courses.js'
import { nuovoIdColonnaCheck, nuovoIdCorso } from '../domain/identifiers.js'
import {
  esitoImportRegistro,
  importaClasse,
  importaRegistro,
  leggiElencoAllievi,
} from '../domain/importing.js'
import { confrontaNomi, normalizzaTesto } from '../domain/text.js'
import { conCarteComplete, fondiCheck, normalizzaImpostazioni } from '../domain/normalization.js'
import { validaAnno, validaCorso, validaMateria, validaClasse } from '../domain/validation.js'
import { archivia, archiviaCopia, percorsoFoto, percorsoRisorsaPiano } from '../data/filing.js'
import { percorsoCopiaCalendario, scriviCopia } from '../data/calendar.js'
import { contenutoDi } from '../data/store.js'
import { percorsoLogo, portaDentroLaVecchiaCartella } from './templates.js'
import { percorsoProvvisorio } from '../data/paths.js'
import {
  cestina,
  conMessaggio,
  documentoCambiato,
  fatto,
  rifiuta,
  riponi,
  scegliUnFile,
  type Parte,
} from './context.js'
import { parole } from '../domain/words.testi.js'
import { testi as comuni } from './context.testi.js'
import { testi } from './register.testi.js'
import { istanteAdesso } from '../domain/dates.js'

/** I formati di ritratto che `@cantoo/pdf-lib` sa incorporare nei PDF. */
const FORMATI_RITRATTO = ['png', 'jpg', 'jpeg']

/**
 * Vero se un altro allievo cita ancora quel file come foto (classi duplicate
 * senza ricopiare le foto): allora il file non si cestina.
 */
function fotoCondivisa (registro: Registro, file: string, allievoId: string): boolean {
  return registro.classi.some((c) => c.allievi.some((a) => a.id !== allievoId && a.foto === file))
}

/** I byte di un altro documento, letto soltanto: vedi `Archivio.leggiAltroAnno`. */
interface ByteDiLa {
  bytes: (relativo: string) => Uint8Array | null
}

/** L'estensione di un percorso, senza punto; `riserva` se non ne ha. */
function formatoDi (percorso: string, riserva: string): string {
  return /\.([^./]+)$/.exec(percorso)?.[1] ?? riserva
}

/**
 * Ricopia in questo documento le foto di una classe portata da un altro; chi
 * non ha la foto là arriva senza. Falso se intanto è cambiato documento.
 */
async function ricopiaFoto (
  classe: Classe,
  la: ByteDiLa,
  contesto: { ancoraQui: () => boolean },
): Promise<boolean> {
  for (const allievo of classe.allievi) {
    const foto = allievo.foto
    if (!foto) continue
    delete allievo.foto
    const contenuto = la.bytes(foto)
    if (!contenuto) continue
    if (!contesto.ancoraQui()) return false
    const copiata = await archivia(percorsoFoto(classe, allievo, formatoDi(foto, 'jpg')), contenuto)
    if ('relativo' in copiata) allievo.foto = copiata.relativo
  }
  return true
}

/**
 * Ricopia gli allegati di un piano portato da un altro documento, dove li
 * mette `percorsoRisorsaPiano` (il corso nuovo deve già stare in `dopo`). Un
 * file che manca toglie la sua risorsa; i collegamenti passano. Falso se
 * intanto è cambiato documento.
 */
async function ricopiaRisorse (
  piano: PianoLezione,
  dopo: Registro,
  la: ByteDiLa,
  contesto: { ancoraQui: () => boolean },
): Promise<boolean> {
  const ricopia = async (
    risorse: Risorsa[],
    attivita: Attivita | null,
  ): Promise<Risorsa[] | null> => {
    const restano: Risorsa[] = []
    for (const risorsa of risorse) {
      if (!risorsa.file) {
        restano.push(risorsa)
        continue
      }
      const contenuto = la.bytes(risorsa.file)
      if (!contenuto) continue
      if (!contesto.ancoraQui()) return null
      const nome = risorsa.nome ?? risorsa.file.split('/').pop() ?? 'allegato'
      const copiata = await archivia(percorsoRisorsaPiano(dopo, piano, attivita, nome), contenuto)
      if ('relativo' in copiata) restano.push({ ...risorsa, file: copiata.relativo })
    }
    return restano
  }
  const delPiano = await ricopia(piano.risorse, null)
  if (!delPiano) return false
  piano.risorse = delPiano
  for (const attivita of piano.attivita) {
    const sue = await ricopia(attivita.risorse, attivita)
    if (!sue) return false
    attivita.risorse = sue
  }
  return true
}

export const registro = {
  // All'apertura del pannello si porta dentro, una volta, un'eventuale
  // `templates/` accanto al documento: vedi `portaDentroLaVecchiaCartella`.
  'stato.leggi': async (contesto, _azione) => {
    const detto = await portaDentroLaVecchiaCartella(contesto)
    return detto ? conMessaggio(detto, 'info') : fatto
  },

  'stato.ricarica': async (contesto, _azione) => {
    await contesto.archivio.carica()
    const detto = await portaDentroLaVecchiaCartella(contesto)
    return detto ? conMessaggio(detto, 'info') : fatto
  },

  // Un anno nuovo è un documento nuovo: nasce in una cartella provvisoria
  // (`paths.ts`), e posto e nome si scelgono al primo salvataggio. Niente
  // `modifica`: crearlo vuol dire aprirlo.
  'anno.crea': async (contesto, azione) => {
    const nato = creaAnno(azione.inizio, azione.fine, azione.etichetta, azione.confine)
    // `creaAnno` fa l'ossatura; pause e nomi dei semestri arrivano dal modulo.
    const anno: AnnoScolastico = {
      ...nato,
      sospensioni: azione.sospensioni ?? [],
      semestri: nato.semestri.map((semestre, indice) => ({
        ...semestre,
        etichetta: azione.etichetteSemestri?.[indice]?.trim() || semestre.etichetta,
      })),
    }
    const esito = validaAnno(anno)
    if (!esito.valido) return { ok: false, errori: esito.errori }

    const dove = percorsoProvvisorio(anno.etichetta)
    if (!dove) return rifiuta(testi().senzaCartella)

    const creato = await contesto.archivio.creaAnno(anno, dove)
    if (!creato) return rifiuta(testi().annoNonCreato)
    return conMessaggio(testi().annoCreato(creato.etichetta), 'info', { creato: { id: creato.id } })
  },

  'anno.salva': (contesto, azione) => {
    // Le date dell'anno si ricavano dai semestri.
    const anno = annoAllineato(azione.anno)
    const esito = validaAnno(anno)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    // Si scrive solo l'anno aperto.
    if (anno.id !== contesto.registro.annoCorrenteId) return rifiuta(comuni().nonTrovato.anno)
    // Nelle chiusure nuove le lezioni intatte se ne vanno nello stesso gesto;
    // quelle con dati restano e lo si dice (`lezioniNeiGiorniChiusi`).
    const prima = contesto.registro.anni.find((a) => a.id === anno.id) ?? null
    const { intatte, conDati } = lezioniNeiGiorniChiusi(contesto.registro, prima, anno)
    const via = new Set(intatte.map((l) => l.id))
    const scritto = contesto.modifica((r) => {
      const cartella = r.anni.find((a) => a.id === anno.id)?.cartella
      riponi(r.anni, { ...anno, cartella }, (a, b) => a.inizio.localeCompare(b.inizio))
      if (via.size > 0) r.lezioni = r.lezioni.filter((l) => !via.has(l.id))
    }, via.size > 0 ? ['registro', 'lezioni'] : ['registro'])
    if (!scritto.ok || (via.size === 0 && conDati.length === 0)) return scritto
    const t = testi()
    const tolte = via.size > 0 ? t.tolteInChiusura(via.size) : ''
    const restano = conDati.length > 0 ? t.restanoInChiusura(conDati.length) : ''
    return conMessaggio(`${tolte}${restano}`.trim(), conDati.length > 0 ? 'avviso' : 'info', scritto)
  },

  /** La lettera di una settimana (A, B o niente), senza riscrivere il resto dell'anno come `anno.salva`. */
  'anno.settimana': (contesto, azione) => {
    const anno = contesto.registro.anni.find((a) => a.id === azione.annoId)
    if (!anno) return rifiuta(comuni().nonTrovato.anno)
    const aggiornato = conLetteraSettimana(anno, azione.giorno, azione.lettera)
    if (anno.id !== contesto.registro.annoCorrenteId) return rifiuta(comuni().nonTrovato.anno)
    return contesto.modifica((r) => {
      riponi(r.anni, aggiornato, (a, b) => a.inizio.localeCompare(b.inizio))
    }, ['registro'])
  },

  'materia.salva': (contesto, azione) => {
    const esito = validaMateria(azione.materia, contesto.registro.materie)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    contesto.archivio.modifica((r) => {
      riponi(r.materie, azione.materia, (a, b) => confrontaNomi(a.nome, b.nome))
    }, ['registro'])
    return { ok: true, creato: { id: azione.materia.id } }
  },

  // I corsi della materia se ne vanno con lei; i piani restano, senza materia.
  'materia.elimina': (contesto, azione) => {
    return contesto.elimina({ genere: 'materia', id: azione.materiaId })
  },

  /**
   * Fonde due materie. Corsi e piani passano alla superstite; due corsi della
   * stessa classe si fondono, e il seguito del doppione passa a quello che resta.
   */
  'materia.unisci': (contesto, azione) => {
    if (azione.daId === azione.aId) return rifiuta(testi().stessaMateria)
    const da = contesto.registro.materie.find((m) => m.id === azione.daId)
    const a = contesto.registro.materie.find((m) => m.id === azione.aId)
    if (!da || !a) return rifiuta(comuni().nonTrovato.materia)

    return contesto.modifica((r) => {

      const superstiti = new Map<string, string>()
      for (const corso of r.corsi.filter((c) => c.materiaId === azione.daId)) {
        const gemello = corsoDi(r, corso.classeId, azione.aId)
        if (gemello) superstiti.set(corso.id, gemello.id)
        else corso.materiaId = azione.aId
      }
      for (const lezione of r.lezioni) {
        const dove = superstiti.get(lezione.corsoId)
        if (dove) lezione.corsoId = dove
      }
      for (const momento of r.valutazioni) {
        const dove = superstiti.get(momento.corsoId)
        if (dove) momento.corsoId = dove
      }
      // Piani e consegne seguono il corso superstite.
      for (const piano of r.piani) {
        const dove = piano.corsoId ? superstiti.get(piano.corsoId) : undefined
        if (dove) piano.corsoId = dove
      }
      for (const consegna of r.consegne) {
        const dove = superstiti.get(consegna.corsoId)
        if (dove) consegna.corsoId = dove
      }
      // Anche il check; se il superstite ne ha già uno (una lista per corso),
      // i due si fondono senza perdere spunte.
      for (const lista of r.check.filter((c) => superstiti.has(c.corsoId))) {
        const dove = superstiti.get(lista.corsoId)!
        const gia = r.check.find((c) => c.corsoId === dove)
        if (gia) {
          fondiCheck(gia, lista)
          r.check = r.check.filter((c) => c !== lista)
        } else {
          lista.corsoId = dove
        }
      }
      r.corsi = r.corsi.filter((c) => !superstiti.has(c.id))
      r.materie = r.materie.filter((m) => m.id !== azione.daId)

      // I titoli prendono il nome della materia superstite.
      for (const corso of r.corsi) {
        if (corso.materiaId !== azione.aId) continue
        const classe = r.classi.find((c) => c.id === corso.classeId) ?? null
        corso.titolo = titoloCorso(classe, a)
      }
    }, ['registro', 'corsi', 'lezioni', 'piani', 'valutazioni', 'consegne', 'check'])
  },

  'corso.crea': (contesto, azione) => {
    const classe = contesto.registro.classi.find((c) => c.id === azione.classeId)
    const materia = contesto.registro.materie.find((m) => m.id === azione.materiaId)
    if (!classe || !materia) return rifiuta(testi().classeOMateria)
    // Se il corso c'è già si torna quello.
    const gia = corsoDi(contesto.registro, azione.classeId, azione.materiaId)
    if (gia) return { ok: true, creato: { id: gia.id } }
    const corso = creaCorso(
      classe.id,
      materia.id,
      azione.titolo?.trim() || titoloCorso(classe, materia),
    )
    contesto.modifica((r) => {
      r.corsi.push(corso)
      r.corsi.sort((x, y) => confrontaNomi(x.titolo, y.titolo))
    }, ['corsi'])
    return { ok: true, creato: { id: corso.id } }
  },

  'corso.salva': (contesto, azione) => {
    const esito = validaCorso(azione.corso, contesto.registro.corsi)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    const nuovo = !contesto.registro.corsi.some((c) => c.id === azione.corso.id)
    const corso = { ...azione.corso, aggiornatoIl: istanteAdesso() }
    contesto.modifica((r) => {
      riponi(r.corsi, corso, (x, y) => confrontaNomi(x.titolo, y.titolo))
    }, ['corsi'])
    return nuovo ? { ok: true, creato: { id: corso.id } } : fatto
  },

  'corso.elimina': (contesto, azione) => {
    return contesto.elimina({ genere: 'corso', id: azione.corsoId })
  },

  /** Le ore fisse di un corso: si cambiano senza rimandare indietro il corso intero. */
  'orario.imposta': (contesto, azione) => {
    const corso = corsoPerId(contesto.registro, azione.corsoId)
    if (!corso) return rifiuta(comuni().nonTrovato.corso)
    const aggiornato = { ...corso, orario: azione.orario, aggiornatoIl: istanteAdesso() }
    const esito = validaCorso(aggiornato, contesto.registro.corsi)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    return contesto.modifica((r) => {
      const indice = r.corsi.findIndex((c) => c.id === corso.id)
      if (indice >= 0) r.corsi[indice] = aggiornato
    }, ['corsi'])
  },

  /** Genera le lezioni dell'orario che mancano; ripetibile, quel che c'è non si tocca. */
  'orario.genera': (contesto, azione) => {
    const corso = corsoPerId(contesto.registro, azione.corsoId)
    const t = testi()
    if (!corso) return rifiuta(comuni().nonTrovato.corso)
    if (corso.orario.length === 0) return rifiuta(t.senzaOrario)
    if (azione.dal > azione.al) return rifiuta(t.periodoRovescio)

    const { nuove, saltate, conflitti } =
      lezioniDaOrario(contesto.registro, corso, azione.dal, azione.al)
    // Tutte già a calendario: riuscita invariata. Orario che non cade mai nel
    // periodo: rifiuto.
    if (nuove.length === 0 && saltate > 0) {
      return conMessaggio(t.giaTutte(saltate), 'info', { invariato: true })
    }
    if (nuove.length === 0) return rifiuta(t.orarioMaiNelPeriodo)

    const scritto = contesto.modifica((r) => {
      r.lezioni.push(...nuove)
      r.lezioni.sort((a, b) => a.data.localeCompare(b.data))
    }, ['lezioni'])
    if (!scritto.ok) return scritto

    // I conflitti (due classi nella stessa ora) si dicono: sono quasi sempre refusi.
    return conMessaggio(
      t.aggiunte(nuove.length, corso.titolo, saltate, conflitti),
      conflitti > 0 ? 'avviso' : 'info',
    )
  },

  'classe.salva': (contesto, azione) => {
    const esito = validaClasse(azione.classe, contesto.registro.classi)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    const classe = { ...azione.classe, aggiornataIl: istanteAdesso() }
    const prima = contesto.registro.classi.find((c) => c.id === classe.id)
    const nuova = !prima
    // Da qui non si toglie nessuno: lascerebbe orfani voti e presenze. Si
    // toglie con `allievo.elimina`, che porta via il seguito.
    const restano = new Set(classe.allievi.map((a) => a.id))
    const tolti = (prima?.allievi ?? []).filter((a) => !restano.has(a.id))
    if (tolti.length > 0) {
      return rifiuta(testi().nonSiTogliDaQui(tolti.map(nomeCompleto)))
    }
    contesto.modifica((r) => {
      riponi(r.classi, classe)
    }, ['classi'])
    return nuova ? { ok: true, creato: { id: classe.id } } : fatto
  },

  // Con la classe se ne vanno corsi, ore, voti e fascicolo.
  'classe.elimina': (contesto, azione) => {
    return contesto.elimina({ genere: 'classe', id: azione.classeId })
  },

  'allievo.elimina': (contesto, azione) => {
    return contesto.elimina({
      genere: 'allievo',
      classeId: azione.classeId,
      id: azione.allievoId,
    })
  },

  /**
   * Il ritratto di un allievo: se ne tiene una copia nel documento, così segue
   * il registro. Il file vecchio con un altro nome si cestina.
   */
  'allievo.foto.imposta': async (contesto, azione) => {
    const classe = contesto.registro.classi.find((c) => c.id === azione.classeId)
    const allievo = classe?.allievi.find((a) => a.id === azione.allievoId)
    const t = testi()
    if (!classe || !allievo) return rifiuta(comuni().nonTrovato.pif)

    const scelto = await scegliUnFile({
      titolo: t.fotoDi(nomeCompleto(allievo)),
      tasto: t.usaFoto,
      filtri: { [parole().immagini]: FORMATI_RITRATTO },
    })
    // Dialogo chiuso senza scegliere: non è un errore, non si dice niente.
    if (!scelto) return fatto

    const formato = scelto.estensione.replace('.', '').toLowerCase()
    if (!FORMATI_RITRATTO.includes(formato)) {
      return rifiuta(t.nonJpegNePng(scelto.nome))
    }

    // Durante il dialogo può essersi aperto un altro anno.
    if (!contesto.ancoraQui()) return documentoCambiato()

    const vecchia = allievo.foto ?? null
    const esito = await archiviaCopia(
      percorsoFoto(classe, allievo, formato),
      scelto.uri,
      // Si sovrascrive la vecchia invece di accumulare copie, salvo che la
      // citi anche qualcun altro.
      vecchia && !fotoCondivisa(contesto.registro, vecchia, allievo.id) ? vecchia : null,
    )
    if ('errore' in esito) return rifiuta(t.copiaFotoNonRiuscita(esito.errore))

    const salvato = contesto.suVoce('classi', azione.classeId, (bersaglio) => {
      const chi = bersaglio.allievi.find((a) => a.id === azione.allievoId)
      // Sparita dalla classe mentre si sceglieva: «non trovata», non «fatto».
      if (!chi) return false
      chi.foto = esito.relativo
    }, [], comuni().nonTrovato.pif)
    // Solo a scrittura riuscita: altrimenti `cestina` toccherebbe il documento nuovo.
    if (
      salvato.ok && vecchia && vecchia !== esito.relativo &&
      !fotoCondivisa(contesto.registro, vecchia, azione.allievoId)
    ) {
      await cestina(vecchia)
    }
    return salvato
  },

  /** Toglie la foto e il suo file. */
  'allievo.foto.togli': async (contesto, azione) => {
    const classe = contesto.registro.classi.find((c) => c.id === azione.classeId)
    const allievo = classe?.allievi.find((a) => a.id === azione.allievoId)
    if (!classe || !allievo) return rifiuta(comuni().nonTrovato.pif)
    if (!allievo.foto) return fatto

    const file = allievo.foto
    const esito = contesto.suVoce('classi', azione.classeId, (bersaglio) => {
      const chi = bersaglio.allievi.find((a) => a.id === azione.allievoId)
      if (chi) delete chi.foto
    })
    // Il file resta se lo cita ancora qualcun altro.
    if (!fotoCondivisa(contesto.registro, file, azione.allievoId)) await cestina(file)
    return esito
  },

  'classe.duplica': async (contesto, azione) => {
    const origine = contesto.registro.classi.find((c) => c.id === azione.classeId)
    if (!origine) return rifiuta(comuni().nonTrovato.classe)
    // Id nuovi per le persone: vedi `duplicaClasse`.
    const copia = duplicaClasse(origine, azione.annoId, azione.nome)
    const esito = validaClasse(copia, contesto.registro.classi)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    // Le foto si ricopiano, così non sono condivise; una che manca si salta.
    for (const allievo of copia.allievi) {
      const foto = allievo.foto
      if (!foto) continue
      delete allievo.foto
      // Ogni copia aspetta il disco: il documento può cambiare.
      if (!contesto.ancoraQui()) return documentoCambiato()
      const contenuto = await contenutoDi(foto)
      if (!contenuto) continue
      const formato = /\.([^./]+)$/.exec(foto)?.[1] ?? 'jpg'
      const copiata = await archivia(percorsoFoto(copia, allievo, formato), contenuto)
      if ('relativo' in copiata) allievo.foto = copiata.relativo
    }
    // Con la classe si duplicano i corsi.
    const originali = contesto.registro.corsi.filter((c) => c.classeId === origine.id)
    const corsi = originali.map((c) => ({
      ...c,
      id: nuovoIdCorso(),
      classeId: copia.id,
      titolo: c.titolo.replace(origine.nome, copia.nome),
      creatoIl: istanteAdesso(),
      aggiornatoIl: istanteAdesso(),
    }))
    // E le liste di controllo, solo le colonne (con id nuovi): le spunte sono
    // di persone che nella copia hanno altri id.
    const liste = originali.flatMap((vecchio, i) => {
      const lista = contesto.registro.check.find((c) => c.corsoId === vecchio.id)
      if (!lista || lista.colonne.length === 0) return []
      const colonne = lista.colonne.map((c) => ({ ...c, id: nuovoIdColonnaCheck() }))
      return [creaCheck(corsi[i].id, colonne)]
    })
    const scritto = contesto.modifica((r) => {
      r.classi.push(copia)
      r.corsi.push(...corsi)
      r.check.push(...liste)
    }, ['classi', 'corsi', 'check'])
    if (!scritto.ok) return scritto
    return { ok: true, creato: { id: copia.id } }
  },

  /**
   * Una classe da un altro documento `.regi`, letto e non aperto
   * (`leggiAltroAnno`). Che cosa si porta lo decide `importaClasse`; qui si
   * ricopiano le foto e si scrive.
   */
  'classe.importa': async (contesto, azione) => {
    const anno = contesto.registro.anni.find((a) => a.id === contesto.registro.annoCorrenteId)
    if (!anno) return rifiuta(testi().senzaAnnoPerClasse)
    const letto = await contesto.archivio.leggiAltroAnno(apparato.Uri.file(azione.percorso))
    // La lettura aspetta il disco: il documento può cambiare.
    if (!contesto.ancoraQui()) return documentoCambiato()
    if ('errore' in letto) return rifiuta(letto.errore)
    const importata = importaClasse(letto.registro, azione.classeId, contesto.registro, {
      annoId: anno.id,
      nome: azione.nome.trim(),
      anagrafica: azione.anagrafica,
      corsi: azione.corsi,
    })
    if (!importata) return rifiuta(testi().classeSparitaAltrove)
    const { classe, materieNuove, corsi } = importata
    const esito = validaClasse(classe, contesto.registro.classi)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    // Le foto: la persona arriva senza, se la sua là non si trova.
    if (!(await ricopiaFoto(classe, letto, contesto))) return documentoCambiato()
    // `registro` perché le materie nuove stanno lì.
    const scritto = contesto.modifica((r) => {
      r.classi.push(classe)
      r.materie.push(...materieNuove)
      r.corsi.push(...corsi)
    }, ['classi', 'corsi', 'registro'])
    if (!scritto.ok) return scritto
    return { ok: true, creato: { id: classe.id } }
  },

  /**
   * «Importa da un altro registro…»: i blocchi scelti di un altro `.regi`,
   * letto e non aperto. Che cosa arriva lo decide `importaRegistro`; qui si
   * ricopiano i file (foto, loghi, allegati, calendari ICS), ricontrollando il
   * documento dopo ogni attesa, e si scrive in una sola `modifica`. Un file
   * che manca non ferma niente; i loghi sostituiti si cestinano dopo.
   */
  'registro.importa': async (contesto, azione) => {
    const anno = contesto.registro.anni.find((a) => a.id === contesto.registro.annoCorrenteId)
    if (!anno) return rifiuta(testi().senzaAnnoPerImport)
    const scelta = {
      annoId: anno.id,
      impostazioni: azione.impostazioni,
      materie: azione.materie,
      classi: azione.classi,
      piani: azione.piani,
      calendari: azione.calendari,
    }
    // I piani da soli no: stanno sui corsi, e senza classi non ne arriva nessuno.
    const qualcosa = scelta.impostazioni || scelta.materie || scelta.calendari
    if (!qualcosa && scelta.classi.length === 0) return rifiuta(testi().nienteScelto)
    const letto = await contesto.archivio.leggiAltroAnno(apparato.Uri.file(azione.percorso))
    if (!contesto.ancoraQui()) return documentoCambiato()
    if ('errore' in letto) return rifiuta(letto.errore)

    const portato = importaRegistro(letto.registro, contesto.registro, scelta)
    for (const classe of portato.classi) {
      const esito = validaClasse(classe, contesto.registro.classi)
      if (!esito.valido) return { ok: false, errori: esito.errori }
    }

    for (const classe of portato.classi) {
      if (!(await ricopiaFoto(classe, letto, contesto))) return documentoCambiato()
    }

    // I loghi: la carta arriva col percorso di là, e riparte con il suo qui.
    const carte = portato.impostazioni && scelta.impostazioni
      ? portato.impostazioni.intestazione.carte
      : []
    for (const carta of carte) {
      const logo = carta.logo
      if (!logo) continue
      delete carta.logo
      const contenuto = letto.bytes(logo)
      if (!contenuto) continue
      if (!contesto.ancoraQui()) return documentoCambiato()
      const copiato = await archivia(percorsoLogo(carta.id, formatoDi(logo, 'png')), contenuto)
      if ('relativo' in copiato) carta.logo = copiato.relativo
    }

    // Gli allegati dei piani vanno sotto il corso nuovo: il registro com'è
    // dopo, perché `percorsoRisorsaPiano` ne trovi classe e titolo.
    const dopo: Registro = {
      ...contesto.registro,
      materie: [...contesto.registro.materie, ...portato.materieNuove],
      classi: [...contesto.registro.classi, ...portato.classi],
      corsi: [...contesto.registro.corsi, ...portato.corsi],
    }
    for (const piano of portato.piani) {
      if (!(await ricopiaRisorse(piano, dopo, letto, contesto))) return documentoCambiato()
    }

    // Le copie dei calendari, sotto l'id nuovo; se manca la rifarà «Aggiorna».
    const sorgenti = portato.impostazioni?.calendario?.calendari ?? []
    for (const { da, a } of portato.copie) {
      const contenuto = letto.bytes(percorsoCopiaCalendario(da))
      if (!contesto.ancoraQui()) return documentoCambiato()
      if (contenuto && scriviCopia(a, contenuto)) continue
      const calendario = sorgenti.find((c) => c.id === a)
      if (calendario) delete calendario.copiatoIl
    }

    const loghiPrima = contesto.registro.impostazioni.intestazione.carte
      .map((c) => c.logo)
      .filter((logo): logo is string => Boolean(logo))
    const scritto = contesto.modifica((r) => {
      r.materie.push(...portato.materieNuove)
      r.classi.push(...portato.classi)
      r.corsi.push(...portato.corsi)
      r.piani.push(...portato.piani)
      // Normalizzate come dalla pagina; ogni corso finisce su una carta.
      if (portato.impostazioni) {
        r.impostazioni = conCarteComplete(normalizzaImpostazioni(portato.impostazioni), r.corsi)
      }
    }, ['registro', 'classi', 'corsi', 'piani'])
    if (!scritto.ok) return scritto
    if (scelta.impostazioni) {
      const dopoScritto = contesto.archivio.registro.impostazioni.intestazione.carte
      const vivi = new Set(dopoScritto.map((c) => c.logo))
      for (const logo of loghiPrima) if (!vivi.has(logo)) await cestina(logo)
    }
    return conMessaggio(
      esitoImportRegistro(portato, scelta),
      portato.saltate.length > 0 ? 'avviso' : 'info',
    )
  },

  'allievi.importa': (contesto, azione) => {
    const voci = leggiElencoAllievi(azione.testo)
    if (voci.length === 0) return rifiuta(testi().nessunoNelTesto)
    return contesto.suVoce('classi', azione.classeId, (classe) => {
      for (const voce of voci) {
        // Confronto normalizzato: «Muller» e «Müller» sono la stessa persona.
        const gia = classe.allievi.find(
          (a) =>
            normalizzaTesto(a.cognome) === normalizzaTesto(voce.cognome) &&
            normalizzaTesto(a.nome) === normalizzaTesto(voce.nome),
        )
        if (gia) continue
        const allievo = creaAllievo(voce.cognome, voce.nome)
        if (voce.email) allievo.email = voce.email
        classe.allievi.push(allievo)
      }
    })
  },
} satisfies Parte
