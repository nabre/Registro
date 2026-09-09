// L'anagrafica del registro: gli anni, le materie, i corsi, le classi e chi le
// frequenta.
//
// È la parte che si tocca a settembre e poi quasi più: quel che si dichiara qui
// regge tutto il resto — un'ora appartiene a un corso, un corso a una classe, una
// classe a un anno — e per questo ogni salvataggio passa da una validazione che
// guarda anche gli altri, non solo se stesso.

import { lezioniDaOrario } from '../dominio/orario.js'
import { annoAllineato, conLetteraSettimana } from '../dominio/anni.js'
import { creaAllievo, creaAnno, creaCorso } from '../dominio/fabbriche.js'
import { corsoDi, corsoPerId, titoloCorso } from '../dominio/corsi.js'
import { nuovoIdClasse, nuovoIdCorso } from '../dominio/identificatori.js'
import { leggiElencoAllievi } from '../dominio/importazione.js'
import { validaAnno, validaCorso, validaMateria, validaClasse } from '../dominio/validazione.js'
import { archiviaCopia, percorsoFoto } from '../dati/archiviazione.js'
import { cestina, conMessaggio, fatto, rifiuta, riponi, scegliUnFile, type Parte } from './contesto.js'

/**
 * I formati di ritratto che il registro sa mettere dentro un PDF.
 *
 * Sono i due che `pdf-lib` incorpora, e la scheda dell'allievo è il posto in
 * cui una foto serve davvero: accettare un WEBP qui vorrebbe dire una foto che
 * si vede nel pannello e sparisce in stampa, cioè il modo peggiore di
 * scoprirlo.
 */
const FORMATI_RITRATTO = ['png', 'jpg', 'jpeg']

export const registro = {
  'stato.leggi': (_contesto, _azione) => {
    return fatto
  },

  'stato.ricarica': async (contesto, _azione) => {
    await contesto.archivio.carica()
    return fatto
  },

  // Un anno nuovo è una cartella nuova: si crea vuota, accanto a quelle che
  // ci sono già, con dentro le materie e le impostazioni copiate da quello in
  // uso. Non si passa da `modifica` perché non c'è niente da modificare —
  // l'anno non sta in un file insieme agli altri, sta in un file suo.
  'anno.crea': async (contesto, azione) => {
    const anno = creaAnno(azione.inizio, azione.fine, azione.etichetta, azione.confine)
    const esito = validaAnno(anno)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    const creato = await contesto.archivio.creaAnno(anno)
    if (!creato) return rifiuta('Non si è potuta creare la cartella dell’anno.')
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

  // Via l'anno, via la sua cartella: classi, ore, voti e documentazione. Va nel
  // cestino del sistema, non cancellata sul serio — un anno è troppo per
  // fidarsi di un clic — e chi lo elimina l'ha appena letto nella domanda.
  'anno.elimina': async (contesto, azione) => {
    if (!contesto.registro.anni.some((a) => a.id === azione.annoId)) {
      return rifiuta('Anno scolastico non trovato: forse è già sparito.')
    }
    if (!(await contesto.archivio.eliminaAnno(azione.annoId))) {
      return rifiuta('Non si è potuta eliminare la cartella dell’anno.')
    }
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

  // Cambiare anno non è filtrare: è aprire un'altra cartella. Si scrive quale
  // in radice — così la scelta viaggia con il registro invece di restare
  // sulla macchina — e si ricarica.
  'anno.seleziona': async (contesto, azione) => {
    if (!contesto.registro.anni.some((a) => a.id === azione.annoId)) {
      return rifiuta('Anno scolastico non trovato.')
    }
    if (!(await contesto.archivio.usaAnno(azione.annoId))) {
      return rifiuta('Quell’anno non ha una cartella: forse è stata spostata.')
    }
    return fatto
  },

  'materia.salva': (contesto, azione) => {
    const esito = validaMateria(azione.materia, contesto.registro.materie)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    contesto.archivio.modifica((r) => {
      riponi(r.materie, azione.materia, (a, b) => a.nome.localeCompare(b.nome, 'it'))
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
      r.corsi.sort((x, y) => x.titolo.localeCompare(y.titolo, 'it'))
    }, ['corsi'])
    return { ok: true, creato: { id: corso.id } }
  },

  'corso.salva': (contesto, azione) => {
    const esito = validaCorso(azione.corso, contesto.registro.corsi)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    const nuovo = !contesto.registro.corsi.some((c) => c.id === azione.corso.id)
    const corso = { ...azione.corso, aggiornatoIl: new Date().toISOString() }
    contesto.modifica((r) => {
      riponi(r.corsi, corso, (x, y) => x.titolo.localeCompare(y.titolo, 'it'))
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
    if (!classe || !allievo) return rifiuta('Allievo non trovato.')

    const scelto = await scegliUnFile({
      titolo: `Foto di ${allievo.cognome} ${allievo.nome}`,
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
    if (!classe || !allievo) return rifiuta('Allievo non trovato.')
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
      allievi: origine.allievi.map((a) => ({ ...a })),
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
    if (voci.length === 0) return rifiuta('Nessun allievo riconosciuto nel testo incollato.')
    return contesto.suVoce('classi', azione.classeId, (classe) => {
      for (const voce of voci) {
        const gia = classe.allievi.find(
          (a) =>
            a.cognome.toLowerCase() === voce.cognome.toLowerCase() &&
            a.nome.toLowerCase() === voce.nome.toLowerCase(),
        )
        if (gia) continue
        const allievo = creaAllievo(voce.cognome, voce.nome)
        if (voce.email) allievo.email = voce.email
        classe.allievi.push(allievo)
      }
    })
  },
} satisfies Parte
