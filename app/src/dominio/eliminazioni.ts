// Che cosa si porta via un'eliminazione.
//
// Il registro rifiutava di cancellare tutto quel che aveva qualcosa dentro: un
// anno con le sue classi, una classe con le sue lezioni, un corso con i suoi
// voti. Era una regola comoda per il codice e inutile per chi la subiva — una
// classe sbagliata a settembre restava lì per sempre, e l'unica via d'uscita
// era aprire i file a mano, che è il modo con cui i riferimenti si rompono.
//
// Qui la regola cambia: si cancella tutto, ma prima si dice per intero che cosa
// sparisce. La sicurezza non sta nel rifiuto — sta nel fatto che chi preme
// «Elimina» ha appena letto «12 lezioni con l'appello, 5 momenti con 60 voti».
// L'eliminazione è completa per costruzione: si porta dietro tutto quel che
// senza di lei resterebbe a puntare nel vuoto, e quel che può sopravvivere
// staccato — un piano lezione, una valutazione di recupero — sopravvive.
//
// Il calcolo sta nel dominio e non nel centralino perché serve due volte: al
// pannello per scrivere la domanda, all'extension host per applicarla. Due
// conteggi scritti in due posti diversi sono due occasioni di dire due cose
// diverse, e qui la seconda sarebbe una bugia detta appena prima di cancellare.

import { nomeCompleto } from './calcoli.js'
import { corsiDellaClasse, fascicoloDellaClasse, nomeDelPiano } from './corsi.js'
import type { Collezione, Consegna, Registro } from './modelli.js'
import { PIF, quanti } from './lessico.js'
import { plurale } from './testo.js'

export type Bersaglio =
  | { genere: 'anno'; id: string }
  | { genere: 'materia'; id: string }
  | { genere: 'classe'; id: string }
  | { genere: 'corso'; id: string }
  | { genere: 'allievo'; classeId: string; id: string }
  | { genere: 'lezione'; id: string }
  | { genere: 'piano'; id: string }
  | { genere: 'valutazione'; id: string }
  | { genere: 'consegna'; id: string }

/**
 * I file su disco che seguono l'eliminazione. Il dominio non tocca il disco —
 * non conosce `vscode` — quindi li elenca e lascia fare a chi può.
 */
export interface FileDaTogliere {
  /** Cartelle `risorse/<pianoId>`: gli allegati della scaletta. */
  risorse: string[]
  /** Cartelle `allegati/<valutazioneId>`: verifiche, soluzioni, prove corrette. */
  allegati: string[]
  /** Percorsi relativi dei documenti raccolti dal docente di classe. */
  documenti: string[]
}

export interface Eliminazione {
  /** Come si chiama quel che si sta togliendo, per la domanda. */
  nome: string
  /** Che cosa sparisce insieme a lui. Vuoto vuol dire che se ne va da solo. */
  perdite: string[]
  /** Che cosa resta, ma senza il collegamento che aveva. */
  staccati: string[]
  /** La mossa che non perde niente, quando ce n'è una. */
  invece: string | null
  collezioni: Collezione[]
  file: FileDaTogliere
  /** Toglie il bersaglio e tutto il suo seguito dallo stato vivo. */
  applica: (registro: Registro) => void
}

/**
 * Tutti i file che una consegna tiene: i documenti di ognuno, quello uguale
 * per tutti, il foglio delle firme e quel che sta ancora dentro le spunte
 * vecchie. Se ne vanno con lei, e vanno elencati tutti: un file che nessuna
 * consegna nomina più non lo ritrova nessuno.
 */
function fileDellaConsegna (consegna: Consegna): string[] {
  const file: string[] = []
  for (const spunta of consegna.fatte) if (spunta.file) file.push(spunta.file)
  for (const documento of consegna.documenti ?? []) if (documento.file) file.push(documento.file)
  if (consegna.fileTutti) file.push(consegna.fileTutti)
  if (consegna.fileFirme) file.push(consegna.fileFirme)
  return file
}

/**
 * La chiusura di un'eliminazione: tutto quel che, tolto il bersaglio, non
 * avrebbe più un posto dove stare. Si risale una volta sola, dall'alto in
 * basso — anno, classi, corsi, lezioni e valutazioni — perché è l'unico verso
 * in cui le dipendenze corrono.
 */
function chiusura (registro: Registro, bersaglio: Bersaglio) {
  const classi = new Set<string>()
  const corsi = new Set<string>()
  const materie = new Set<string>()

  if (bersaglio.genere === 'anno') {
    for (const classe of registro.classi) {
      if (classe.annoId === bersaglio.id) classi.add(classe.id)
    }
  }
  if (bersaglio.genere === 'classe') classi.add(bersaglio.id)
  if (bersaglio.genere === 'materia') materie.add(bersaglio.id)

  for (const corso of registro.corsi) {
    if (bersaglio.genere === 'corso' && corso.id === bersaglio.id) corsi.add(corso.id)
    if (classi.has(corso.classeId)) corsi.add(corso.id)
    if (materie.has(corso.materiaId)) corsi.add(corso.id)
  }

  const lezioni = new Set<string>()
  const valutazioni = new Set<string>()
  if (bersaglio.genere === 'lezione') lezioni.add(bersaglio.id)
  if (bersaglio.genere === 'valutazione') valutazioni.add(bersaglio.id)
  for (const lezione of registro.lezioni) {
    if (corsi.has(lezione.corsoId)) lezioni.add(lezione.id)
  }
  for (const momento of registro.valutazioni) {
    if (corsi.has(momento.corsoId)) valutazioni.add(momento.id)
  }

  // Le consegne appartengono al corso: senza di lui non saprebbero più a chi
  // ripresentarsi, e resterebbero a chiedere qualcosa a una classe che non c'è.
  const consegne = new Set<string>()
  if (bersaglio.genere === 'consegna') consegne.add(bersaglio.id)
  for (const consegna of registro.consegne) {
    if (corsi.has(consegna.corsoId)) consegne.add(consegna.id)
  }

  // Gli smistamenti aspettano una consegna o una classe: senza, il PDF in
  // quarantena resterebbe ad aspettare per sempre qualcosa che non c'è più.
  const smistamenti = new Set<string>()
  for (const smistamento of registro.smistamenti) {
    if (smistamento.consegnaId && consegne.has(smistamento.consegnaId)) smistamenti.add(smistamento.id)
    else if (smistamento.classeId && classi.has(smistamento.classeId)) smistamenti.add(smistamento.id)
  }

  return { classi, corsi, materie, lezioni, valutazioni, consegne, smistamenti }
}

/** Le classi, con quanti allievi ci sono dentro: è il numero che pesa davvero. */
function contaAllievi (registro: Registro, classi: Set<string>): number {
  return registro.classi
    .filter((c) => classi.has(c.id))
    .reduce((somma, c) => somma + c.allievi.length, 0)
}

function contaVoti (registro: Registro, valutazioni: Set<string>): number {
  return registro.valutazioni
    .filter((v) => valutazioni.has(v.id))
    .reduce((somma, v) => somma + v.voti.filter((x) => x.valore !== null || x.assente).length, 0)
}

/**
 * Che cosa comporta togliere una cosa dal registro: che cosa sparisce con lei,
 * che cosa resta staccato, quali file escono dalla cartella e come si fa.
 *
 * Torna `null` se il bersaglio non c'è già più: due finestre aperte sullo
 * stesso registro, o un file corretto a mano nel frattempo.
 */
export function eliminazione (registro: Registro, bersaglio: Bersaglio): Eliminazione | null {
  const insieme = chiusura(registro, bersaglio)
  const perdite: string[] = []
  const staccati: string[] = []
  const collezioni = new Set<Collezione>()
  const file: FileDaTogliere = { risorse: [], allegati: [], documenti: [] }
  let invece: string | null = null
  let nome = ''

  // ---------------------------------------------------------------- il nome
  switch (bersaglio.genere) {
    case 'anno': {
      const anno = registro.anni.find((a) => a.id === bersaglio.id)
      if (!anno) return null
      nome = `l’anno ${anno.etichetta}`
      // L'anno è una cartella, e togliere l'anno vuol dire togliere la
      // cartella: non solo le classi e le ore, ma anche la documentazione, la
      // cassetta e gli allegati che stanno lì dentro. Si dice per intero,
      // perché è più di quanto chi clicca si aspetti.
      perdite.push(
        `la cartella «${anno.cartella ?? anno.etichetta}» per intero, con la sua documentazione`,
      )
      // Di un anno che non è quello aperto non si sa dire di più: le sue
      // classi e le sue ore stanno nei suoi file, e non sono caricate. Meglio
      // non elencarle che elencarne zero.
      if (anno.id !== registro.annoCorrenteId) {
        perdite.push('quel che contiene: non è l’anno aperto, e non si può contarlo da qui')
      }
      invece = 'Va nel cestino del sistema: si può ancora ripescare da lì.'
      break
    }
    case 'materia': {
      const materia = registro.materie.find((m) => m.id === bersaglio.id)
      if (!materia) return null
      nome = `la materia «${materia.nome}»`
      invece = 'Unirla a un’altra materia le rimette insieme senza perdere niente.'
      break
    }
    case 'classe': {
      const classe = registro.classi.find((c) => c.id === bersaglio.id)
      if (!classe) return null
      nome = `la classe ${classe.nome}`
      invece = 'Archiviarla la toglie dagli elenchi e conserva tutto lo storico.'
      break
    }
    case 'corso': {
      const corso = registro.corsi.find((c) => c.id === bersaglio.id)
      if (!corso) return null
      nome = `il corso «${corso.titolo}»`
      break
    }
    case 'allievo': {
      const classe = registro.classi.find((c) => c.id === bersaglio.classeId)
      const allievo = classe?.allievi.find((a) => a.id === bersaglio.id)
      if (!classe || !allievo) return null
      nome = nomeCompleto(allievo)
      invece =
        'Per un ritiro basta togliere la spunta «Frequenta»: esce dagli appelli e ' +
        'quel che ha fatto finora resta leggibile.'
      break
    }
    case 'lezione': {
      const lezione = registro.lezioni.find((l) => l.id === bersaglio.id)
      if (!lezione) return null
      nome = `la lezione del ${lezione.data}`
      break
    }
    case 'piano': {
      const piano = registro.piani.find((p) => p.id === bersaglio.id)
      if (!piano) return null
      nome = `il piano di ${nomeDelPiano(registro, piano)}`
      // I file appesi al piano e alle sue tappe se ne vanno con lui: uno per
      // uno, come gli allegati delle verifiche — nell'archivio la cartella di
      // un piano sta accanto a quelle degli altri documenti dello stesso
      // corso, e cancellarla intera si porterebbe via anche quelli.
      const suoi = [...piano.risorse, ...piano.attivita.flatMap((a) => a.risorse)]
        .map((r) => r.file)
        .filter((f): f is string => Boolean(f))
      file.documenti.push(...suoi)
      // La vecchia cartella piatta: finché esiste, se ne va come prima.
      if (suoi.some((f) => f.startsWith('risorse/'))) file.risorse.push(piano.id)
      if (suoi.length > 0) {
        perdite.push(plurale(suoi.length, 'file allegato al piano', 'file allegati al piano'))
      }
      break
    }
    case 'valutazione': {
      const momento = registro.valutazioni.find((v) => v.id === bersaglio.id)
      if (!momento) return null
      nome = `il momento «${momento.titolo}»`
      break
    }
    case 'consegna': {
      const consegna = registro.consegne.find((c) => c.id === bersaglio.id)
      if (!consegna) return null
      nome = `la consegna «${consegna.testo}»`
      invece = 'Spuntarla per tutti la toglie dalle cose da fare e conserva quel che è stato raccolto.'
      break
    }
  }

  // ------------------------------------------------- l'allievo, un caso a sé
  // Non è un ramo della catena: sta dentro una classe, e quel che si porta via
  // sono le righe che parlano di lui sparse in lezioni e valutazioni.
  if (bersaglio.genere === 'allievo') {
    const lezioniDellaClasse = registro.lezioni.filter((l) =>
      corsiDellaClasse(registro, bersaglio.classeId).some((c) => c.id === l.corsoId),
    )
    const presenze = lezioniDellaClasse.reduce(
      (somma, l) => somma + l.presenze.filter((p) => p.allievoId === bersaglio.id).length,
      0,
    )
    const osservazioni = lezioniDellaClasse.reduce(
      (somma, l) => somma + l.osservazioni.filter((o) => o.allievoId === bersaglio.id).length,
      0,
    )
    const voti = registro.valutazioni.reduce(
      (somma, v) =>
        somma +
        v.voti.filter(
          (x) => x.allievoId === bersaglio.id && (x.valore !== null || x.assente),
        ).length,
      0,
    )

    if (presenze > 0) perdite.push(plurale(presenze, 'presenza registrata', 'presenze registrate'))
    if (voti > 0) perdite.push(plurale(voti, 'voto', 'voti'))
    if (osservazioni > 0) perdite.push(plurale(osservazioni, 'osservazione', 'osservazioni'))

    const fascicolo = fascicoloDellaClasse(registro, bersaglio.classeId)
    const suoi = fascicolo?.documenti.filter((d) => d.allievoId === bersaglio.id).length ?? 0
    if (suoi > 0) {
      staccati.push(
        `${plurale(suoi, 'documento resta', 'documenti restano')} nel fascicolo, senza intestatario`,
      )
    }

    const sueConsegne = registro.consegne.filter(
      (c) => c.allieviIds.includes(bersaglio.id) || c.fatte.some((f) => f.chi === bersaglio.id),
    ).length
    if (sueConsegne > 0) {
      staccati.push(
        `${plurale(sueConsegne, 'consegna resta', 'consegne restano')}, senza il suo nome fra i destinatari`,
      )
    }

    // I documenti che aveva portato se ne vanno con lui: la spunta sparisce, e
    // un file che nessuna spunta nomina più non lo ritroverebbe nessuno.
    let documentiSuoi = 0
    for (const consegna of registro.consegne) {
      for (const spunta of consegna.fatte) {
        if (spunta.chi === bersaglio.id && spunta.file) {
          file.documenti.push(spunta.file)
          documentiSuoi += 1
        }
      }
      for (const documento of consegna.documenti ?? []) {
        if (documento.allievoId === bersaglio.id) {
          file.documenti.push(documento.file)
          documentiSuoi += 1
        }
      }
    }
    if (documentiSuoi > 0) {
      perdite.push(plurale(documentiSuoi, 'documento raccolto', 'documenti raccolti'))
    }

    // E così i suoi fogli delle assenze, vergini e firmati: sono intestati a
    // lui, e nel periodo di un altro non vogliono dire niente. La riga se ne
    // va anche se ha solo una mail spedita e nessun foglio: parla di lui.
    const sueRighe = (fascicolo?.assenze ?? []).flatMap((blocco) =>
      blocco.righe.filter((r) => r.allievoId === bersaglio.id),
    )
    const sueAssenze = sueRighe.flatMap((r) => r.fogli)
    for (const foglio of sueAssenze) file.documenti.push(foglio.file)
    if (sueAssenze.length > 0) {
      perdite.push(plurale(sueAssenze.length, 'foglio di assenze', 'fogli di assenze'))
    }
    if (sueRighe.length > 0) collezioni.add('fascicoli')

    collezioni.add('classi')
    if (presenze > 0 || osservazioni > 0) collezioni.add('lezioni')
    if (voti > 0) collezioni.add('valutazioni')
    if (sueConsegne > 0 || documentiSuoi > 0) collezioni.add('consegne')
    if (suoi > 0) collezioni.add('fascicoli')

    return {
      nome,
      perdite,
      staccati,
      invece,
      collezioni: [...collezioni],
      file,
      applica: (r) => {
        const classe = r.classi.find((c) => c.id === bersaglio.classeId)
        if (classe) classe.allievi = classe.allievi.filter((a) => a.id !== bersaglio.id)
        const suoiCorsi = new Set(corsiDellaClasse(r, bersaglio.classeId).map((c) => c.id))
        for (const lezione of r.lezioni) {
          if (!suoiCorsi.has(lezione.corsoId)) continue
          lezione.presenze = lezione.presenze.filter((p) => p.allievoId !== bersaglio.id)
          lezione.osservazioni = lezione.osservazioni.filter((o) => o.allievoId !== bersaglio.id)
        }
        for (const momento of r.valutazioni) {
          momento.voti = momento.voti.filter((v) => v.allievoId !== bersaglio.id)
          // La prova corretta resta: è un file, e buttarlo non era la domanda.
          for (const allegato of momento.allegati) {
            if (allegato.allievoId === bersaglio.id) allegato.allievoId = null
          }
        }
        for (const consegna of r.consegne) {
          consegna.allieviIds = consegna.allieviIds.filter((id) => id !== bersaglio.id)
          consegna.fatte = consegna.fatte.filter((f) => f.chi !== bersaglio.id)
          // Il suo documento è andato nel cestino con lui: la voce che lo
          // nominava non deve restare a dire che c'è qualcosa di pronto.
          if (consegna.documenti?.some((d) => d.allievoId === bersaglio.id)) {
            consegna.documenti = consegna.documenti.filter((d) => d.allievoId !== bersaglio.id)
          }
        }
        const fascicoloVivo = fascicoloDellaClasse(r, bersaglio.classeId)
        if (fascicoloVivo) {
          for (const documento of fascicoloVivo.documenti) {
            if (documento.allievoId === bersaglio.id) documento.allievoId = null
          }
          // La riga di un periodo è tutta sua — i suoi fogli, la sua mail — e
          // senza di lui non resta niente da mostrare: se ne va intera.
          for (const blocco of fascicoloVivo.assenze) {
            blocco.righe = blocco.righe.filter((riga) => riga.allievoId !== bersaglio.id)
          }
        }
      },
    }
  }

  // ------------------------------------------------------------- la catena
  const { classi, corsi, lezioni, valutazioni, consegne, smistamenti } = insieme

  if (bersaglio.genere === 'anno' && classi.size > 0) {
    const allievi = contaAllievi(registro, classi)
    perdite.push(
      `${plurale(classi.size, 'classe', 'classi')}` +
        (allievi > 0 ? `, con ${quanti(allievi, PIF)}` : ''),
    )
  }
  if (bersaglio.genere === 'classe') {
    const allievi = contaAllievi(registro, classi)
    if (allievi > 0) perdite.push(quanti(allievi, PIF))
  }
  if (bersaglio.genere !== 'corso' && corsi.size > 0) {
    perdite.push(plurale(corsi.size, 'corso', 'corsi'))
  }
  if (lezioni.size > 0) {
    perdite.push(
      `${plurale(lezioni.size, 'lezione', 'lezioni')}, con appello, osservazioni e consuntivo`,
    )
  }
  if (valutazioni.size > 0) {
    const voti = contaVoti(registro, valutazioni)
    perdite.push(
      `${plurale(valutazioni.size, 'momento di valutazione', 'momenti di valutazione')}` +
        (voti > 0 ? `, con ${plurale(voti, 'voto', 'voti')}` : ''),
    )
  }

  if (consegne.size > 0) {
    if (bersaglio.genere !== 'consegna') perdite.push(plurale(consegne.size, 'consegna', 'consegne'))
    collezioni.add('consegne')
    // I documenti raccolti se ne vanno con la consegna che li aveva chiesti,
    // nel cestino del sistema come ogni altro allegato.
    let raccolti = 0
    for (const consegna of registro.consegne) {
      if (!consegne.has(consegna.id)) continue
      const suoi = fileDellaConsegna(consegna)
      raccolti += suoi.length
      file.documenti.push(...suoi)
    }
    if (bersaglio.genere === 'consegna' && raccolti > 0) {
      perdite.push(plurale(raccolti, 'documento raccolto', 'documenti raccolti'))
    }
  }

  // I PDF in quarantena che aspettavano quelle consegne o quelle classi: il
  // file originale va nel cestino con la riga, e le pagine non decise si
  // perdono — è il prezzo di togliere la richiesta a cui appartenevano.
  if (smistamenti.size > 0) {
    perdite.push(plurale(smistamenti.size, 'PDF in quarantena', 'PDF in quarantena'))
    collezioni.add('smistamenti')
    for (const smistamento of registro.smistamenti) {
      if (!smistamenti.has(smistamento.id)) continue
      if (smistamento.file) file.documenti.push(smistamento.file)
      for (const lettura of smistamento.letture) {
        if (lettura.anteprima) file.documenti.push(lettura.anteprima)
      }
    }
  }

  // I fascicoli seguono le classi: recapiti, documenti e comunicazioni spedite.
  for (const classeId of classi) {
    const fascicolo = fascicoloDellaClasse(registro, classeId)
    if (!fascicolo) continue
    const fogli = fascicolo.assenze.reduce(
      (somma, blocco) => somma + blocco.righe.reduce((q, riga) => q + riga.fogli.length, 0),
      0,
    )
    const pezzi = [
      fascicolo.documenti.length > 0
        ? plurale(fascicolo.documenti.length, 'documento', 'documenti')
        : null,
      fascicolo.comunicazioni.length > 0
        ? plurale(fascicolo.comunicazioni.length, 'comunicazione', 'comunicazioni')
        : null,
      fascicolo.assenze.length > 0
        ? `${plurale(fascicolo.assenze.length, 'periodo di assenze', 'periodi di assenze')}` +
          (fogli > 0 ? ` con ${plurale(fogli, 'foglio', 'fogli')}` : '')
        : null,
    ].filter(Boolean)
    if (pezzi.length > 0) perdite.push(`il fascicolo della classe: ${pezzi.join(', ')}`)
    for (const documento of fascicolo.documenti) {
      if (documento.file) file.documenti.push(documento.file)
    }
    for (const blocco of fascicolo.assenze) {
      for (const riga of blocco.righe) {
        for (const foglio of riga.fogli) file.documenti.push(foglio.file)
      }
    }
  }

  // I PDF dei momenti che se ne vanno escono dall'archivio con loro. Si citano
  // per percorso e non per cartella: nell'archivio i file di una verifica
  // stanno accanto a quelli di un'altra dello stesso corso, e cancellare una
  // cartella si porterebbe via anche quelli.
  for (const momento of registro.valutazioni) {
    if (!valutazioni.has(momento.id)) continue
    for (const allegato of momento.allegati) {
      if (allegato.file) file.documenti.push(allegato.file)
    }
    // Le vecchie cartelle piatte: finché esistono, se ne vanno come prima.
    if (momento.allegati.some((a) => a.file.startsWith('allegati/'))) {
      file.allegati.push(momento.id)
    }
  }

  // ------------------------------------------------------------- gli staccati
  if (bersaglio.genere === 'corso') {
    // I piani sopravvivono al corso: sono il lavoro di preparazione, e valgono
    // ancora per l'anno prossimo. Restano senza corso, in fondo all'elenco,
    // pronti da riagganciare o da duplicare altrove.
    const piani = registro.piani.filter((p) => p.corsoId === bersaglio.id).length
    if (piani > 0) {
      staccati.push(`${plurale(piani, 'piano lezione resta', 'piani lezione restano')}, senza corso`)
      collezioni.add('piani')
    }
  }
  if (bersaglio.genere === 'lezione') {
    // Una consegna data in quell'ora, o che scadeva lì, non se ne va con la
    // lezione: resta da fare. Perde solo il rimando, e si tiene la data che
    // quella lezione aveva — altrimenti «per la prossima volta» diventerebbe
    // «per mai».
    const legate = registro.consegne.filter(
      (c) => c.dataLezioneId === bersaglio.id || c.scadenzaLezioneId === bersaglio.id,
    ).length
    if (legate > 0) {
      staccati.push(
        `${plurale(legate, 'consegna resta', 'consegne restano')}, con la data al posto della lezione`,
      )
      collezioni.add('consegne')
    }

    const momenti = registro.valutazioni.filter((v) => v.lezioneId === bersaglio.id).length
    if (momenti > 0) {
      staccati.push(
        `${plurale(momenti, 'momento di valutazione resta', 'momenti di valutazione restano')}, ` +
          'senza la lezione a cui era legato',
      )
      collezioni.add('valutazioni')
    }
  }
  if (bersaglio.genere === 'piano') {
    const usato = registro.lezioni.filter((l) => l.pianoId === bersaglio.id).length
    if (usato > 0) {
      staccati.push(
        `${plurale(usato, 'lezione resta', 'lezioni restano')}, senza scaletta e senza le spunte già messe`,
      )
      collezioni.add('lezioni')
    }
    // I file li ha già elencati il ramo qui sopra, uno per uno: la cartella
    // vecchia — `risorse/<id>` — solo se ce n'è ancora qualcuno dentro.
  }

  // I piani dei corsi che se ne vanno restano, staccati: vale per il corso
  // tolto a mano come per quelli che cadono con la classe, l'anno o la
  // materia — e il file dei piani va riscritto in tutti i casi, o al riavvio
  // punterebbero ancora a un corso che non c'è.
  const pianiStaccati = registro.piani.filter((p) => p.corsoId && corsi.has(p.corsoId)).length
  if (pianiStaccati > 0) {
    collezioni.add('piani')
    if (bersaglio.genere !== 'corso') {
      staccati.push(
        `${plurale(pianiStaccati, 'piano lezione resta', 'piani lezione restano')}, senza corso`,
      )
    }
  }

  // ------------------------------------------------------- quali file toccare
  if (bersaglio.genere === 'anno' || bersaglio.genere === 'materia') collezioni.add('registro')
  if (classi.size > 0) collezioni.add('classi')
  if (classi.size > 0) collezioni.add('fascicoli')
  if (corsi.size > 0 || bersaglio.genere === 'corso') collezioni.add('corsi')
  if (lezioni.size > 0) collezioni.add('lezioni')
  if (valutazioni.size > 0) collezioni.add('valutazioni')
  if (bersaglio.genere === 'piano') collezioni.add('piani')

  return {
    nome,
    perdite,
    staccati,
    invece,
    collezioni: [...collezioni],
    file,
    applica: (r) => {
      if (bersaglio.genere === 'anno') {
        r.anni = r.anni.filter((a) => a.id !== bersaglio.id)
        if (r.annoCorrenteId === bersaglio.id) r.annoCorrenteId = r.anni[0]?.id ?? null
      }
      if (bersaglio.genere === 'materia') {
        r.materie = r.materie.filter((m) => m.id !== bersaglio.id)
      }
      if (bersaglio.genere === 'piano') {
        r.piani = r.piani.filter((p) => p.id !== bersaglio.id)
        for (const lezione of r.lezioni) {
          if (lezione.pianoId !== bersaglio.id) continue
          lezione.pianoId = null
          // Le spunte erano di quelle attività: senza il piano non dicono più
          // niente, e lasciarle vorrebbe dire mostrare un consuntivo di nulla.
          lezione.avanzamento = []
        }
        for (const momento of r.valutazioni) {
          if (momento.pianoId === bersaglio.id) momento.pianoId = null
        }
      }
      if (classi.size > 0) {
        r.classi = r.classi.filter((c) => !classi.has(c.id))
        r.fascicoli = r.fascicoli.filter((f) => !classi.has(f.classeId))
      }
      if (corsi.size > 0) {
        r.corsi = r.corsi.filter((c) => !corsi.has(c.id))
        // I piani sopravvivono al corso — sono il lavoro di preparazione, e
        // valgono ancora l'anno prossimo — ma restano senza casa, in fondo
        // all'elenco, invece di puntare a un corso che non c'è più.
        for (const piano of r.piani) {
          if (piano.corsoId && corsi.has(piano.corsoId)) piano.corsoId = null
        }
      }
      if (lezioni.size > 0) {
        // Prima di togliere le ore si fissa la data sulle consegne che ci si
        // appoggiavano: dopo non ci sarebbe più da nessuna parte.
        for (const consegna of r.consegne) {
          const data = consegna.dataLezioneId ? lezioni.has(consegna.dataLezioneId) : false
          const scadenza = consegna.scadenzaLezioneId
            ? lezioni.has(consegna.scadenzaLezioneId)
            : false
          if (data) {
            const persa = r.lezioni.find((l) => l.id === consegna.dataLezioneId)
            if (persa) consegna.data = persa.data
            consegna.dataLezioneId = null
          }
          if (scadenza) {
            const persa = r.lezioni.find((l) => l.id === consegna.scadenzaLezioneId)
            if (persa) consegna.scadenza = persa.data
            consegna.scadenzaLezioneId = null
          }
        }
        r.lezioni = r.lezioni.filter((l) => !lezioni.has(l.id))
        for (const momento of r.valutazioni) {
          if (momento.lezioneId && lezioni.has(momento.lezioneId)) momento.lezioneId = null
        }
      }
      if (valutazioni.size > 0) r.valutazioni = r.valutazioni.filter((v) => !valutazioni.has(v.id))
      if (consegne.size > 0) r.consegne = r.consegne.filter((c) => !consegne.has(c.id))
      if (smistamenti.size > 0) r.smistamenti = r.smistamenti.filter((s) => !smistamenti.has(s.id))
    },
  }
}
