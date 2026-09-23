// L'anagrafica del registro: gli anni, le materie, i corsi, le classi e chi le
// frequenta.
//
// È la parte che si tocca a settembre e poi quasi più: quel che si dichiara qui
// regge tutto il resto — un'ora appartiene a un corso, un corso a una classe, una
// classe a un anno — e per questo ogni salvataggio passa da una validazione che
// guarda anche gli altri, non solo se stesso.

import { nomeCompleto } from '../domain/calculations.js'
import { PIF, frase } from '../domain/lexicon.js'
import { lezioniDaOrario } from '../domain/timetable.js'
import { annoAllineato, conLetteraSettimana } from '../domain/years.js'
import type { AnnoScolastico } from '../domain/models.js'
import { creaAllievo, creaAnno, creaCorso } from '../domain/factories.js'
import { corsoDi, corsoPerId, titoloCorso } from '../domain/courses.js'
import { nuovoIdAllievo, nuovoIdClasse, nuovoIdCorso } from '../domain/identifiers.js'
import { leggiElencoAllievi } from '../domain/importing.js'
import { confrontaNomi, nomeSicuro, normalizzaTesto } from '../domain/text.js'
import { validaAnno, validaCorso, validaMateria, validaClasse } from '../domain/validation.js'
import { archiviaCopia, percorsoFoto } from '../data/filing.js'
import { aggiornaInventarioModelli } from '../data/templates.js'
import * as apparato from 'apparato'

import { ESTENSIONE } from '../data/paths.js'
import { cestina, conMessaggio, fatto, invariato, rifiuta, riponi, scegliUnFile, type Parte } from './context.js'

/**
 * I formati di ritratto che il registro sa mettere dentro un PDF.
 *
 * Sono i due che `@cantoo/pdf-lib` incorpora, e la scheda personale è il posto in
 * cui una foto serve davvero: accettare un WEBP qui vorrebbe dire una foto che
 * si vede nel pannello e sparisce in stampa, cioè il modo peggiore di
 * scoprirlo.
 */
const FORMATI_RITRATTO = ['png', 'jpg', 'jpeg']

/**
 * Dove proporre il documento di un anno nuovo: accanto a quello aperto, con il
 * nome dell'anno.
 *
 * Accanto e non in una cartella nostra: chi tiene i suoi anni in una cartella
 * se li ritrova insieme senza doverci pensare, e chi li tiene sparsi non si
 * vede proporre un posto che non è il suo. Senza un documento aperto si lascia
 * decidere al dialogo, che ripropone l'ultima cartella usata.
 */
function dovePropore (aperto: apparato.Uri | null, etichetta: string): apparato.Uri | undefined {
  // `nomeSicuro` e non una classe di caratteri riscritta qui: quella si era
  // dimenticata la barra rovescia, i caratteri di controllo e i punti in coda,
  // e un'etichetta d'anno che li contenga è un file che Windows non crea.
  const nome = `${nomeSicuro(etichetta, 'anno')}${ESTENSIONE}`
  return aperto ? apparato.Uri.joinPath(aperto, '..', nome) : undefined
}

export const registro = {
  'stato.leggi': async (_contesto, _azione) => {
    // La cartella dei modelli si rilegge qui e non a ogni spinta di stato:
    // questa richiesta è il segnale che un pannello si è aperto, ed è il
    // momento in cui `templates/` può essere stata cambiata da fuori — a mano,
    // o da una cartella sincronizzata.
    await aggiornaInventarioModelli()
    return fatto
  },

  'stato.ricarica': async (contesto, _azione) => {
    await contesto.archivio.carica()
    await aggiornaInventarioModelli()
    return fatto
  },

  // Un anno nuovo è un documento nuovo: dove metterlo lo si chiede, come per
  // ogni altro documento che nasce. Prima si creava d'ufficio accanto a quelli
  // che c'erano già, perché il registro possedeva una cartella di anni; adesso
  // che non la possiede più, l'unico posto sensato è quello che sceglie chi lo
  // crea — e il dialogo del sistema è già il posto dove si sa scegliere.
  //
  // Non si passa da `modifica` perché non c'è niente da modificare: l'anno non
  // sta in un file insieme agli altri, sta in un file suo, e crearlo vuol dire
  // aprirlo.
  'anno.crea': async (contesto, azione) => {
    const nato = creaAnno(azione.inizio, azione.fine, azione.etichetta, azione.confine)
    // `creaAnno` fa l'ossatura — date e semestri — e non sa niente di quel che
    // il modulo ha raccolto attorno. Le pause e i nomi dei semestri si posano
    // qui sopra: arrivano dal modulo di creazione, e fin qui venivano spediti
    // e scartati, cioè scritti dall'utente e persi senza dire niente.
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

    const dove = await apparato.dialoghi.chiediDoveSalvare({
      title: 'Nuovo anno del registro',
      saveLabel: 'Crea',
      defaultUri: dovePropore(contesto.archivio.documentoAperto, anno.etichetta),
      filters: { 'Registro docenti': [ESTENSIONE] },
    })
    // Annullare il dialogo non è un errore, e non si dice: non si è creato
    // niente, ed è esattamente quel che si voleva premendo «Annulla».
    if (!dove) return invariato

    const creato = await contesto.archivio.creaAnno(anno, dove)
    if (!creato) return rifiuta('Non si è potuto creare il documento dell’anno.')
    return { ok: true, creato: { id: creato.id } }
  },

  'anno.salva': async (contesto, azione) => {
    // Le date dell'anno non arrivano dal pannello: si ricavano dai semestri,
    // qui, prima di guardare se il resto sta in piedi.
    const anno = annoAllineato(azione.anno)
    const esito = validaAnno(anno)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    // L'anno in uso passa dallo stato vivo, come tutto il resto; gli altri si
    // riscrivono nella loro cartella senza doverci passare sopra — le vacanze
    // dell'anno prossimo si sistemano in primavera, mentre si è ancora dentro
    // quello in corso.
    if (anno.id === contesto.registro.annoCorrenteId) {
      return contesto.modifica((r) => {
        riponi(r.anni, { ...anno, cartella: r.anni.find((a) => a.id === anno.id)?.cartella }, (a, b) =>
          a.inizio.localeCompare(b.inizio),
        )
      }, ['registro'])
    }
    if (!(await contesto.archivio.salvaAnno(anno))) return rifiuta('Anno scolastico non trovato.')
    return fatto
  },

  /**
   * La lettera di una settimana: A, B, o niente.
   *
   * Si tocca solo quella settimana, e il resto dell'anno resta com'era: è il
   * motivo per cui non passa da `anno.salva`, che riscriverebbe anche semestri
   * e sospensioni con la copia che il pannello aveva in mano.
   */
  'anno.settimana': async (contesto, azione) => {
    const anno = contesto.registro.anni.find((a) => a.id === azione.annoId)
    if (!anno) return rifiuta('Anno scolastico non trovato.')
    const aggiornato = conLetteraSettimana(anno, azione.giorno, azione.lettera)
    if (anno.id === contesto.registro.annoCorrenteId) {
      return contesto.modifica((r) => {
        riponi(r.anni, aggiornato, (a, b) => a.inizio.localeCompare(b.inizio))
      }, ['registro'])
    }
    if (!(await contesto.archivio.salvaAnno(aggiornato))) return rifiuta('Anno scolastico non trovato.')
    return fatto
  },

  'materia.salva': (contesto, azione) => {
    const esito = validaMateria(azione.materia, contesto.registro.materie)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    contesto.archivio.modifica((r) => {
      riponi(r.materie, azione.materia, (a, b) => confrontaNomi(a.nome, b.nome))
    }, ['registro'])
    return { ok: true, creato: { id: azione.materia.id } }
  },

  // I corsi della materia se ne vanno con lei; i piani restano, senza
  // materia: sono il lavoro di preparazione, e si riagganciano con due clic.
  'materia.elimina': (contesto, azione) => {
    return contesto.elimina({ genere: 'materia', id: azione.materiaId })
  },

  /**
   * Due materie nate dalla stessa cosa — un refuso, un import ripetuto —
   * tornano una. Corsi e piani passano alla superstite; se la fusione creasse
   * due corsi uguali nella stessa classe, i due corsi si fondono a loro volta
   * e le lezioni del doppione si spostano su quello che resta.
   */
  'materia.unisci': (contesto, azione) => {
    if (azione.daId === azione.aId) return rifiuta('Sono la stessa materia.')
    const da = contesto.registro.materie.find((m) => m.id === azione.daId)
    const a = contesto.registro.materie.find((m) => m.id === azione.aId)
    if (!da || !a) return rifiuta('Materia non trovata.')

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
      // I piani e le consegne del corso che sparisce nella fusione seguono
      // il gemello superstite: restare sul vecchio id li lascerebbe a
      // puntare a un corso che non c'è più.
      for (const piano of r.piani) {
        const dove = piano.corsoId ? superstiti.get(piano.corsoId) : undefined
        if (dove) piano.corsoId = dove
      }
      for (const consegna of r.consegne) {
        const dove = superstiti.get(consegna.corsoId)
        if (dove) consegna.corsoId = dove
      }
      r.corsi = r.corsi.filter((c) => !superstiti.has(c.id))
      r.materie = r.materie.filter((m) => m.id !== azione.daId)

      // I titoli restavano quelli della materia sparita.
      for (const corso of r.corsi) {
        if (corso.materiaId !== azione.aId) continue
        const classe = r.classi.find((c) => c.id === corso.classeId) ?? null
        corso.titolo = titoloCorso(classe, a)
      }
    }, ['registro', 'corsi', 'lezioni', 'piani', 'valutazioni', 'consegne'])
  },

  'corso.crea': (contesto, azione) => {
    const classe = contesto.registro.classi.find((c) => c.id === azione.classeId)
    const materia = contesto.registro.materie.find((m) => m.id === azione.materiaId)
    if (!classe || !materia) return rifiuta('Classe o materia non trovata.')
    // Aprire due volte lo stesso corso non vuol dire niente: si torna quello
    // che c'è già, così chi chiama può andare avanti senza distinguere.
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
    const corso = { ...azione.corso, aggiornatoIl: new Date().toISOString() }
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
    if (!corso) return rifiuta('Corso non trovato.')
    const aggiornato = { ...corso, orario: azione.orario, aggiornatoIl: new Date().toISOString() }
    const esito = validaCorso(aggiornato, contesto.registro.corsi)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    return contesto.modifica((r) => {
      const indice = r.corsi.findIndex((c) => c.id === corso.id)
      if (indice >= 0) r.corsi[indice] = aggiornato
    }, ['corsi'])
  },

  /**
   * Genera le lezioni che l'orario del corso prevede e che non ci sono
   * ancora. Si può rilanciare quante volte si vuole: quel che c'è già non
   * viene toccato, e una lezione spostata a mano resta dove l'ha messa chi la
   * insegna.
   */
  'orario.genera': (contesto, azione) => {
    const corso = corsoPerId(contesto.registro, azione.corsoId)
    if (!corso) return rifiuta('Corso non trovato.')
    if (corso.orario.length === 0) {
      return rifiuta('Il corso non ha ancora un orario: prima si dichiarano le ore fisse.')
    }
    if (azione.dal > azione.al) return rifiuta('Il periodo finisce prima di cominciare.')

    const { nuove, saltate, conflitti } = lezioniDaOrario(contesto.registro, corso, azione.dal, azione.al)
    if (nuove.length === 0) {
      return rifiuta(
        saltate > 0
          ? `Le ${saltate} lezioni di questo periodo ci sono già tutte.`
          : 'In questo periodo l’orario non cade mai: controllare le date e le sospensioni.',
      )
    }

    contesto.modifica((r) => {
      r.lezioni.push(...nuove)
      r.lezioni.sort((a, b) => a.data.localeCompare(b.data))
    }, ['lezioni'])

    // I conflitti si dicono: due classi nella stessa ora sono quasi sempre
    // un refuso nell'orario di una delle due, e l'unico momento per accorgersene
    // è adesso, non sfogliando il calendario settimana per settimana.
    return conMessaggio(
      `${nuove.length} lezioni aggiunte a ${corso.titolo}` +
        (saltate > 0 ? `, ${saltate} c’erano già` : '') +
        (conflitti > 0 ? `, ${conflitti} in conflitto con un’altra classe` : '') +
        '.',
      conflitti > 0 ? 'avviso' : 'info',
    )
  },

  'classe.salva': (contesto, azione) => {
    const esito = validaClasse(azione.classe, contesto.registro.classi)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    const classe = { ...azione.classe, aggiornataIl: new Date().toISOString() }
    const nuova = !contesto.registro.classi.some((c) => c.id === classe.id)
    contesto.modifica((r) => {
      riponi(r.classi, classe)
    }, ['classi'])
    return nuova ? { ok: true, creato: { id: classe.id } } : fatto
  },

  // Via la classe, via i suoi corsi, le sue ore, i suoi voti e il suo
  // fascicolo: senza la classe non vogliono dire più niente e resterebbero a
  // puntare nel vuoto. Chi vuole conservare lo storico la archivia.
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
   * Il ritratto di un allievo: si sceglie dal disco e se ne tiene una copia.
   *
   * Copia e non riferimento al file d'origine: la foto che sta sul desktop di
   * chi la scatta sparisce alla prima pulizia, e un'anagrafica che punta a un
   * file altrui è un'anagrafica che si svuota da sola. Nella cartella
   * dell'anno la foto segue il registro dovunque vada.
   *
   * Il file vecchio va nel cestino quando quello nuovo ha un altro nome — un
   * PNG che sostituisce un JPEG — o resterebbe lì a non servire più a nessuno.
   */
  'allievo.foto.imposta': async (contesto, azione) => {
    const classe = contesto.registro.classi.find((c) => c.id === azione.classeId)
    const allievo = classe?.allievi.find((a) => a.id === azione.allievoId)
    if (!classe || !allievo) return rifiuta(frase(PIF, 'trovato', { nega: true }))

    const scelto = await scegliUnFile({
      titolo: `Foto di ${nomeCompleto(allievo)}`,
      tasto: 'Usa questa foto',
      filtri: { Immagini: FORMATI_RITRATTO },
    })
    // Dialogo chiuso senza scegliere: non è un errore, non si dice niente.
    if (!scelto) return fatto

    const formato = scelto.estensione.replace('.', '').toLowerCase()
    if (!FORMATI_RITRATTO.includes(formato)) {
      return rifiuta(`«${scelto.nome}» non è un JPEG né un PNG: sono i due formati che finiscono nei rapporti.`)
    }

    const vecchia = allievo.foto ?? null
    const esito = await archiviaCopia(
      percorsoFoto(classe, allievo, formato),
      scelto.uri,
      // La sua, se ce l'aveva: si sostituisce invece di accumulare
      // «Rossi Mario (2).jpg» a ogni foto rifatta.
      vecchia,
    )
    if ('errore' in esito) return rifiuta(`Copia della foto non riuscita: ${esito.errore}`)

    const salvato = contesto.suVoce('classi', azione.classeId, (bersaglio) => {
      const chi = bersaglio.allievi.find((a) => a.id === azione.allievoId)
      if (chi) chi.foto = esito.relativo
    })
    if (vecchia && vecchia !== esito.relativo) await cestina(vecchia)
    return salvato
  },

  /** Via la foto e via il file: una faccia tolta dall'anagrafica se ne va davvero. */
  'allievo.foto.togli': async (contesto, azione) => {
    const classe = contesto.registro.classi.find((c) => c.id === azione.classeId)
    const allievo = classe?.allievi.find((a) => a.id === azione.allievoId)
    if (!classe || !allievo) return rifiuta(frase(PIF, 'trovato', { nega: true }))
    if (!allievo.foto) return fatto

    const file = allievo.foto
    const esito = contesto.suVoce('classi', azione.classeId, (bersaglio) => {
      const chi = bersaglio.allievi.find((a) => a.id === azione.allievoId)
      if (chi) delete chi.foto
    })
    await cestina(file)
    return esito
  },

  'classe.duplica': (contesto, azione) => {
    const origine = contesto.registro.classi.find((c) => c.id === azione.classeId)
    if (!origine) return rifiuta('Classe non trovata.')
    const copia = {
      ...origine,
      id: nuovoIdClasse(),
      annoId: azione.annoId,
      nome: azione.nome,
      // Persone nuove, con identificativi nuovi. Sono le stesse persone, ma
      // non lo stesso *record*: l'identificativo di un allievo è la chiave con
      // cui voti, presenze e fogli lo nominano, e due classi che se lo dividono
      // rendono ambigua ogni ricerca — `classeDellAllievo` prende la prima che
      // capita, e le due classi stanno in due anni diversi.
      allievi: origine.allievi.map((a) => ({ ...a, id: nuovoIdAllievo() })),
      creataIl: new Date().toISOString(),
      aggiornataIl: new Date().toISOString(),
    }
    const esito = validaClasse(copia, contesto.registro.classi)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    // Con la classe si duplicano i corsi: si insegnano le stesse materie,
    // ed è l'unica lettura sensata di «duplica» per l'anno nuovo.
    const corsi = contesto.registro.corsi
      .filter((c) => c.classeId === origine.id)
      .map((c) => ({
        ...c,
        id: nuovoIdCorso(),
        classeId: copia.id,
        titolo: c.titolo.replace(origine.nome, copia.nome),
        creatoIl: new Date().toISOString(),
        aggiornatoIl: new Date().toISOString(),
      }))
    contesto.modifica((r) => {
      r.classi.push(copia)
      r.corsi.push(...corsi)
    }, ['classi', 'corsi'])
    return { ok: true, creato: { id: copia.id } }
  },

  'allievi.importa': (contesto, azione) => {
    const voci = leggiElencoAllievi(azione.testo)
    if (voci.length === 0) return rifiuta(`Nessuna ${PIF.singolare} riconosciuta nel testo incollato.`)
    return contesto.suVoce('classi', azione.classeId, (classe) => {
      for (const voce of voci) {
        // Confrontati normalizzati: la segreteria incolla «Muller» dove il
        // registro scrive «Müller», e con il solo minuscolo quella persona
        // veniva importata una seconda volta — due righe nella stessa classe,
        // una con le assenze e una senza.
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
