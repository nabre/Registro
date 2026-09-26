// Che cosa si porta via un'eliminazione.
//
// Si può cancellare tutto, ma prima si dice per intero che cosa sparisce
// («12 lezioni con l'appello, 5 momenti con 60 voti»). L'eliminazione è
// completa per costruzione: si porta dietro quel che resterebbe a puntare nel
// vuoto, e quel che può vivere staccato (un piano, un recupero) resta.
//
// Nel dominio perché serve due volte, con lo stesso conto: al pannello per la
// domanda, all'extension host per applicarla.

import { nomeCompleto } from './calculations.js'
import { classeDelCorsoId, corsiDellaClasse, fascicoloDellaClasse, nomeDelPiano } from './courses.js'
import {
  percorsiDiUnDocumento,
  percorsiInAltreLingue,
  type ContestoRapporto,
  type GenereRapporto,
} from './locations.js'
import type { Collezione, Consegna, Registro } from './models.js'
import { testi } from './deletions.testi.js'

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
 * non conosce `apparato` — quindi li elenca e lascia fare a chi può.
 */
export interface FileDaTogliere {
  /** Cartelle `risorse/<pianoId>`: gli allegati della scaletta. */
  risorse: string[]
  /** Cartelle `allegati/<valutazioneId>`: verifiche, soluzioni, prove corrette. */
  allegati: string[]
  /** Percorsi relativi dei documenti raccolti dal docente di classe. */
  documenti: string[]
  /**
   * I fogli che il registro aveva stampato da sé (verbali, schede, griglie):
   * copie che si rifanno con un pulsante, a differenza dei documenti raccolti.
   */
  stampati: string[]
  /**
   * Gli stessi fogli col nome di un'altra lingua (`percorsiInAltreLingue`):
   * non si contano fra le perdite, ma si tolgono se ci sono.
   */
  stampatiAltrove: string[]
}

interface Eliminazione {
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
 * Tutti i file di una consegna: documenti di ognuno, quello per tutti, foglio
 * firme, file nelle spunte. Se ne vanno con lei, o nessuno li ritroverebbe.
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
 * La chiusura di un'eliminazione: tutto quel che, tolto il bersaglio, non ha
 * più posto. Si scende una volta dall'alto (anno, classi, corsi, lezioni e
 * valutazioni), il verso delle dipendenze.
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

  // Le consegne sono del corso: senza, non saprebbero a chi ripresentarsi.
  const consegne = new Set<string>()
  if (bersaglio.genere === 'consegna') consegne.add(bersaglio.id)
  for (const consegna of registro.consegne) {
    if (corsi.has(consegna.corsoId)) consegne.add(consegna.id)
  }

  // Il check è del corso come le consegne.
  const check = new Set<string>()
  for (const lista of registro.check) {
    if (corsi.has(lista.corsoId)) check.add(lista.id)
  }

  // Gli smistamenti aspettano una consegna o una classe: senza, aspetterebbero
  // per sempre.
  const smistamenti = new Set<string>()
  for (const smistamento of registro.smistamenti) {
    if (smistamento.consegnaId && consegne.has(smistamento.consegnaId)) {
      smistamenti.add(smistamento.id)
    } else if (smistamento.classeId && classi.has(smistamento.classeId)) {
      smistamenti.add(smistamento.id)
    }
  }

  return { classi, corsi, materie, lezioni, valutazioni, consegne, check, smistamenti }
}

/**
 * I fogli stampati di una cosa che se ne va, senza doppioni (la stessa scheda
 * sta in più periodi e cartelle).
 */
function aggiungiGenerati (
  registro: Registro,
  file: FileDaTogliere,
  genere: GenereRapporto,
  id: string,
  dentro: ContestoRapporto = {},
): void {
  for (const percorso of percorsiDiUnDocumento(registro, genere, id, dentro)) {
    if (!file.stampati.includes(percorso)) file.stampati.push(percorso)
  }
  for (const percorso of percorsiInAltreLingue(registro, genere, id, dentro)) {
    if (!file.stampatiAltrove.includes(percorso)) file.stampatiAltrove.push(percorso)
  }
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
 * Le foto di chi se ne va che nessun altro allievo cita: ritratti di minori
 * che resterebbero nel pacchetto senza nessuna scheda. Una classe copiata
 * condivide i ritratti: quelli citati da altri restano.
 */
function fotoDaTogliere (registro: Registro, vanno: Set<string>): string[] {
  const restano = new Set<string>()
  const loro: string[] = []
  for (const classe of registro.classi) {
    for (const allievo of classe.allievi) {
      if (!allievo.foto) continue
      if (vanno.has(allievo.id)) {
        if (!loro.includes(allievo.foto)) loro.push(allievo.foto)
      } else {
        restano.add(allievo.foto)
      }
    }
  }
  return loro.filter((foto) => !restano.has(foto))
}

/**
 * Che cosa comporta togliere una cosa: che cosa sparisce, che cosa resta
 * staccato, quali file escono e come si fa. `null` se il bersaglio non c'è già
 * più (due finestre sullo stesso registro, un file corretto a mano).
 */
export function eliminazione (registro: Registro, bersaglio: Bersaglio): Eliminazione | null {
  const t = testi()
  const insieme = chiusura(registro, bersaglio)
  const perdite: string[] = []
  const staccati: string[] = []
  const collezioni = new Set<Collezione>()
  const file: FileDaTogliere = {
    risorse: [], allegati: [], documenti: [], stampati: [], stampatiAltrove: [],
  }
  let invece: string | null = null
  let nome = ''

  // ---------------------------------------------------------------- il nome
  switch (bersaglio.genere) {
    case 'anno': {
      const anno = registro.anni.find((a) => a.id === bersaglio.id)
      if (!anno) return null
      nome = t.nomeAnno(anno.etichetta)
      // Togliere l'anno toglie la sua cartella: anche documentazione, cassetta
      // e allegati. Va detto per intero.
      perdite.push(t.cartellaAnno(anno.cartella ?? anno.etichetta))
      // Di un anno non aperto non si sa di più: i suoi dati non sono caricati,
      // e meglio non elencarli che elencarne zero.
      if (anno.id !== registro.annoCorrenteId) {
        perdite.push(t.annoNonAperto)
      }
      invece = t.nelCestino
      break
    }
    case 'materia': {
      const materia = registro.materie.find((m) => m.id === bersaglio.id)
      if (!materia) return null
      nome = t.nomeMateria(materia.nome)
      invece = t.unireMateria
      break
    }
    case 'classe': {
      const classe = registro.classi.find((c) => c.id === bersaglio.id)
      if (!classe) return null
      nome = t.nomeClasse(classe.nome)
      invece = t.archiviareClasse
      break
    }
    case 'corso': {
      const corso = registro.corsi.find((c) => c.id === bersaglio.id)
      if (!corso) return null
      nome = t.nomeCorso(corso.titolo)
      break
    }
    case 'allievo': {
      const classe = registro.classi.find((c) => c.id === bersaglio.classeId)
      const allievo = classe?.allievi.find((a) => a.id === bersaglio.id)
      if (!classe || !allievo) return null
      nome = nomeCompleto(allievo)
      invece = t.ritiro
      break
    }
    case 'lezione': {
      const lezione = registro.lezioni.find((l) => l.id === bersaglio.id)
      if (!lezione) return null
      nome = t.nomeLezione(lezione.data)
      break
    }
    case 'piano': {
      const piano = registro.piani.find((p) => p.id === bersaglio.id)
      if (!piano) return null
      nome = t.nomePiano(nomeDelPiano(registro, piano))
      // I file del piano e delle sue tappe, uno per uno: nell'archivio la sua
      // cartella sta accanto a quelle di altri documenti del corso.
      const suoi = [...piano.risorse, ...piano.attivita.flatMap((a) => a.risorse)]
        .map((r) => r.file)
        .filter((f): f is string => Boolean(f))
      file.documenti.push(...suoi)
      // Anche la cartella piatta `risorse/<id>`, se c'è ancora.
      if (suoi.some((f) => f.startsWith('risorse/'))) file.risorse.push(piano.id)
      if (suoi.length > 0) perdite.push(t.fileDelPiano(suoi.length))
      break
    }
    case 'valutazione': {
      const momento = registro.valutazioni.find((v) => v.id === bersaglio.id)
      if (!momento) return null
      nome = t.nomeMomento(momento.titolo)
      break
    }
    case 'consegna': {
      const consegna = registro.consegne.find((c) => c.id === bersaglio.id)
      if (!consegna) return null
      nome = t.nomeConsegna(consegna.testo)
      invece = t.spuntareConsegna
      break
    }
  }

  // ------------------------------------------------- l'allievo, un caso a sé
  // Non è un ramo della catena: si portano via le righe che parlano di lui in
  // lezioni e valutazioni.
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

    const recuperi = registro.valutazioni.reduce(
      (somma, v) => somma + (v.recuperi ?? []).filter((x) => x.allievoId === bersaglio.id).length,
      0,
    )

    if (presenze > 0) perdite.push(t.presenze(presenze))
    if (voti > 0) perdite.push(t.voti(voti))
    if (recuperi > 0) perdite.push(t.recuperi(recuperi))
    if (osservazioni > 0) perdite.push(t.osservazioni(osservazioni))

    // Le sue caselle del check se ne vanno con lui.
    const spunteSue = registro.check.reduce(
      (somma, c) => somma + c.spunte.filter((s) => s.allievoId === bersaglio.id).length,
      0,
    )
    if (spunteSue > 0) perdite.push(t.spunteDelCheck(spunteSue))

    const caselle = lezioniDellaClasse.reduce(
      (somma, l) => somma + (l.matrice ?? []).filter((c) => c.allievoId === bersaglio.id).length,
      0,
    )
    if (caselle > 0) perdite.push(t.caselle(caselle))

    const fascicolo = fascicoloDellaClasse(registro, bersaglio.classeId)
    const suoi = fascicolo?.documenti.filter((d) => d.allievoId === bersaglio.id).length ?? 0
    if (suoi > 0) staccati.push(t.documentiSenzaIntestatario(suoi))

    // Una consegna data a lui soltanto resterebbe data a nessuno (e
    // `validaConsegna` non la salverebbe): se ne va, con documenti e PDF in
    // attesa.
    const soloSue = new Set(
      registro.consegne
        .filter((c) => c.a === 'allievi' && c.allieviIds.length > 0 &&
          c.allieviIds.every((id) => id === bersaglio.id))
        .map((c) => c.id),
    )
    const sueConsegne = registro.consegne.filter(
      (c) => !soloSue.has(c.id) &&
        (c.allieviIds.includes(bersaglio.id) || c.fatte.some((f) => f.chi === bersaglio.id)),
    ).length
    if (sueConsegne > 0) staccati.push(t.consegneSenzaNome(sueConsegne))

    // I documenti che aveva portato se ne vanno con la sua spunta.
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
    if (documentiSuoi > 0) perdite.push(t.documentiRaccolti(documentiSuoi))

    if (soloSue.size > 0) {
      perdite.push(t.consegneSoloSue(soloSue.size))
      for (const consegna of registro.consegne) {
        if (!soloSue.has(consegna.id)) continue
        for (const percorso of fileDellaConsegna(consegna)) {
          if (!file.documenti.includes(percorso)) file.documenti.push(percorso)
        }
      }
    }
    // I PDF in quarantena che aspettavano quelle consegne se ne vanno con loro.
    const smistamentiSuoi = new Set(
      registro.smistamenti
        .filter((s) => s.consegnaId !== null && soloSue.has(s.consegnaId))
        .map((s) => s.id),
    )
    if (smistamentiSuoi.size > 0) {
      perdite.push(t.pdfInQuarantena(smistamentiSuoi.size))
      for (const smistamento of registro.smistamenti) {
        if (!smistamentiSuoi.has(smistamento.id)) continue
        if (smistamento.file) file.documenti.push(smistamento.file)
        for (const lettura of smistamento.letture) {
          if (lettura.anteprima) file.documenti.push(lettura.anteprima)
        }
      }
    }
    // Le pagine smistate a suo nome e i blocchi che lo proponevano.
    const smistamentiToccati = registro.smistamenti.some((s) =>
      s.assegnate.some((f) => f.allievoId === bersaglio.id) ||
      s.blocchi.some((b) => b.allievoId === bersaglio.id),
    )

    const foto = fotoDaTogliere(registro, new Set([bersaglio.id]))
    if (foto.length > 0) {
      file.documenti.push(...foto)
      perdite.push(t.suaFoto)
    }

    // I suoi fogli delle assenze, vergini e firmati, e la riga intera anche con
    // sola mail spedita: parlano di lui.
    const sueRighe = (fascicolo?.assenze ?? []).flatMap((blocco) =>
      blocco.righe.filter((r) => r.allievoId === bersaglio.id),
    )
    const sueAssenze = sueRighe.flatMap((r) => r.fogli)
    for (const foglio of sueAssenze) file.documenti.push(foglio.file)
    if (sueAssenze.length > 0) perdite.push(t.fogliDiAssenze(sueAssenze.length))
    if (sueRighe.length > 0) collezioni.add('fascicoli')

    collezioni.add('classi')
    if (presenze > 0 || osservazioni > 0) collezioni.add('lezioni')
    if (voti > 0) collezioni.add('valutazioni')
    if (sueConsegne > 0 || documentiSuoi > 0 || soloSue.size > 0) collezioni.add('consegne')
    if (smistamentiSuoi.size > 0 || smistamentiToccati) collezioni.add('smistamenti')
    if (spunteSue > 0) collezioni.add('check')
    if (suoi > 0) collezioni.add('fascicoli')

    // Le sue schede già stampate, in tutte le materie e tutti i periodi.
    aggiungiGenerati(registro, file, 'allievo', bersaglio.id)

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
          // Le caselle segnate sulla matrice, se no resterebbero intestate a un
          // id di nessuno.
          if (lezione.matrice?.some((c) => c.allievoId === bersaglio.id)) {
            lezione.matrice = lezione.matrice.filter((c) => c.allievoId !== bersaglio.id)
          }
        }
        for (const momento of r.valutazioni) {
          momento.voti = momento.voti.filter((v) => v.allievoId !== bersaglio.id)
          // Anche i recuperi, che `orphans.ts` e `repairs.ts` non vedrebbero e
          // `recuperiUrgenti` conterebbe.
          if (momento.recuperi?.some((x) => x.allievoId === bersaglio.id)) {
            momento.recuperi = momento.recuperi.filter((x) => x.allievoId !== bersaglio.id)
          }
          // La prova corretta resta: è un file, e non era la domanda.
          for (const allegato of momento.allegati) {
            if (allegato.allievoId === bersaglio.id) allegato.allievoId = null
          }
        }
        if (soloSue.size > 0) r.consegne = r.consegne.filter((c) => !soloSue.has(c.id))
        if (smistamentiSuoi.size > 0) {
          r.smistamenti = r.smistamenti.filter((s) => !smistamentiSuoi.has(s.id))
        }
        for (const smistamento of r.smistamenti) {
          if (smistamento.assegnate.some((f) => f.allievoId === bersaglio.id)) {
            smistamento.assegnate = smistamento.assegnate.filter(
              (f) => f.allievoId !== bersaglio.id,
            )
          }
          for (const blocco of smistamento.blocchi) {
            if (blocco.allievoId === bersaglio.id) blocco.allievoId = null
          }
        }
        for (const consegna of r.consegne) {
          consegna.allieviIds = consegna.allieviIds.filter((id) => id !== bersaglio.id)
          consegna.fatte = consegna.fatte.filter((f) => f.chi !== bersaglio.id)
          // Il suo documento è nel cestino: la voce non deve dire che è pronto.
          if (consegna.documenti?.some((d) => d.allievoId === bersaglio.id)) {
            consegna.documenti = consegna.documenti.filter((d) => d.allievoId !== bersaglio.id)
          }
        }
        for (const lista of r.check) {
          if (lista.spunte.some((s) => s.allievoId === bersaglio.id)) {
            lista.spunte = lista.spunte.filter((s) => s.allievoId !== bersaglio.id)
          }
        }
        const fascicoloVivo = fascicoloDellaClasse(r, bersaglio.classeId)
        if (fascicoloVivo) {
          for (const documento of fascicoloVivo.documenti) {
            if (documento.allievoId === bersaglio.id) documento.allievoId = null
          }
          // La riga di un periodo è tutta sua: se ne va intera.
          for (const blocco of fascicoloVivo.assenze) {
            blocco.righe = blocco.righe.filter((riga) => riga.allievoId !== bersaglio.id)
          }
        }
      },
    }
  }

  // ------------------------------------------------------------- la catena
  const { classi, corsi, lezioni, valutazioni, consegne, check, smistamenti } = insieme

  if (bersaglio.genere === 'anno' && classi.size > 0) {
    const allievi = contaAllievi(registro, classi)
    perdite.push(t.classi(classi.size, allievi))
  }
  if (bersaglio.genere === 'classe') {
    const allievi = contaAllievi(registro, classi)
    if (allievi > 0) perdite.push(t.allievi(allievi))
  }
  // I ritratti di chi se ne va con le classi.
  if (classi.size > 0) {
    const vanno = new Set(
      registro.classi.filter((c) => classi.has(c.id)).flatMap((c) => c.allievi.map((a) => a.id)),
    )
    const foto = fotoDaTogliere(registro, vanno)
    if (foto.length > 0) {
      file.documenti.push(...foto)
      perdite.push(t.foto(foto.length))
    }
  }
  if (bersaglio.genere !== 'corso' && corsi.size > 0) {
    perdite.push(t.corsi(corsi.size))
  }
  if (lezioni.size > 0) {
    perdite.push(t.lezioni(lezioni.size))
  }
  if (valutazioni.size > 0) {
    const voti = contaVoti(registro, valutazioni)
    perdite.push(t.momenti(valutazioni.size, voti))
  }

  if (consegne.size > 0) {
    if (bersaglio.genere !== 'consegna') perdite.push(t.consegne(consegne.size))
    collezioni.add('consegne')
    // I documenti raccolti se ne vanno con la consegna che li aveva chiesti.
    let raccolti = 0
    for (const consegna of registro.consegne) {
      if (!consegne.has(consegna.id)) continue
      const suoi = fileDellaConsegna(consegna)
      raccolti += suoi.length
      file.documenti.push(...suoi)
    }
    if (bersaglio.genere === 'consegna' && raccolti > 0) {
      perdite.push(t.documentiRaccolti(raccolti))
    }
  }

  if (check.size > 0) {
    const spunte = registro.check
      .filter((c) => check.has(c.id))
      .reduce((somma, c) => somma + c.spunte.length, 0)
    perdite.push(t.check(check.size, spunte))
    collezioni.add('check')
  }

  // Le spunte date in un'ora che se ne va restano, col giorno dell'ora. Si
  // contano solo quelle dei check che restano; gli altri sono già perdite.
  const spunteStaccate = registro.check
    .filter((c) => !check.has(c.id))
    .reduce(
      (somma, c) => somma + c.spunte.filter((s) => s.lezioneId && lezioni.has(s.lezioneId)).length,
      0,
    )
  if (spunteStaccate > 0) {
    staccati.push(t.spunteConData(spunteStaccate))
    collezioni.add('check')
  }

  // I PDF in quarantena di quelle consegne o classi vanno nel cestino con la
  // riga; le pagine non decise si perdono.
  if (smistamenti.size > 0) {
    perdite.push(t.pdfInQuarantena(smistamenti.size))
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
      fascicolo.documenti.length > 0 ? t.fascicoloDocumenti(fascicolo.documenti.length) : null,
      fascicolo.comunicazioni.length > 0
        ? t.fascicoloComunicazioni(fascicolo.comunicazioni.length)
        : null,
      fascicolo.assenze.length > 0 ? t.fascicoloAssenze(fascicolo.assenze.length, fogli) : null,
    ].filter((pezzo): pezzo is string => Boolean(pezzo))
    if (pezzi.length > 0) perdite.push(t.fascicolo(pezzi))
    for (const documento of fascicolo.documenti) {
      if (documento.file) file.documenti.push(documento.file)
    }
    for (const blocco of fascicolo.assenze) {
      for (const riga of blocco.righe) {
        for (const foglio of riga.fogli) file.documenti.push(foglio.file)
      }
    }
  }

  // I PDF dei momenti che se ne vanno, per percorso e non per cartella: la
  // cartella di una verifica può contenere file di altre.
  for (const momento of registro.valutazioni) {
    if (!valutazioni.has(momento.id)) continue
    for (const allegato of momento.allegati) {
      if (allegato.file) file.documenti.push(allegato.file)
    }
    // Anche le cartelle piatte `allegati/<id>`, se ci sono ancora.
    if (momento.allegati.some((a) => a.file.startsWith('allegati/'))) {
      file.allegati.push(momento.id)
    }
  }

  // ------------------------------------------------------------- gli staccati
  if (bersaglio.genere === 'corso') {
    // I piani sopravvivono al corso: restano senza corso, in fondo all'elenco,
    // da riagganciare o duplicare.
    const piani = registro.piani.filter((p) => p.corsoId === bersaglio.id).length
    if (piani > 0) {
      staccati.push(t.pianiSenzaCorso(piani))
      collezioni.add('piani')
    }
  }
  if (bersaglio.genere === 'lezione') {
    // Una consegna legata a quell'ora resta da fare: perde il rimando e tiene
    // la data della lezione.
    const legate = registro.consegne.filter(
      (c) => c.dataLezioneId === bersaglio.id || c.scadenzaLezioneId === bersaglio.id,
    ).length
    if (legate > 0) {
      staccati.push(t.consegneConData(legate))
      collezioni.add('consegne')
    }

    const momenti = registro.valutazioni.filter((v) => v.lezioneId === bersaglio.id).length
    if (momenti > 0) {
      staccati.push(t.momentiSenzaLezione(momenti))
      collezioni.add('valutazioni')
    }
  }
  if (bersaglio.genere === 'piano') {
    const usato = registro.lezioni.filter((l) => l.pianoId === bersaglio.id).length
    if (usato > 0) {
      staccati.push(t.lezioniSenzaScaletta(usato))
      collezioni.add('lezioni')
    }
    // I file sono già elencati uno per uno; la cartella `risorse/<id>` solo se
    // ha ancora qualcosa dentro.
  }

  // I piani dei corsi che se ne vanno (a mano, o con classe, anno, materia)
  // restano staccati, e il file dei piani va riscritto in ogni caso.
  const pianiStaccati = registro.piani.filter((p) => p.corsoId && corsi.has(p.corsoId)).length
  if (pianiStaccati > 0) {
    collezioni.add('piani')
    if (bersaglio.genere !== 'corso') staccati.push(t.pianiSenzaCorso(pianiStaccati))
  }

  // ------------------------------------------- i fogli già stampati di quel che se ne va
  //
  // I PDF che il registro ha stampato (un verbale con l'appello di un'ora
  // cancellata) non hanno più un originale: se ne vanno. I documenti raccolti
  // seguono le regole qui sopra.
  for (const lezioneId of lezioni) aggiungiGenerati(registro, file, 'lezione', lezioneId)
  for (const valutazioneId of valutazioni) {
    aggiungiGenerati(registro, file, 'momento', valutazioneId)
  }
  for (const corsoId of corsi) {
    aggiungiGenerati(registro, file, 'presenze', corsoId)
    aggiungiGenerati(registro, file, 'valutazioni', corsoId)
    // Solo le schede di quella materia.
    const classe = classeDelCorsoId(registro, corsoId)
    for (const allievo of classe?.allievi ?? []) {
      aggiungiGenerati(registro, file, 'allievo', allievo.id, { corsoId })
    }
  }
  // Una classe porta via anche le schede fuori dalle materie, nella sua cartella.
  for (const classeId of classi) {
    const classe = registro.classi.find((c) => c.id === classeId)
    for (const allievo of classe?.allievi ?? []) {
      aggiungiGenerati(registro, file, 'allievo', allievo.id)
    }
  }
  if (bersaglio.genere === 'piano') aggiungiGenerati(registro, file, 'piano', bersaglio.id)

  // Si dice: si rifanno con un pulsante, ma chi li aveva consegnati deve saperlo.
  const fogli = file.stampati.length
  if (fogli > 0) perdite.push(t.fogliStampati(fogli))

  // ------------------------------------------------------- quali file toccare
  if (bersaglio.genere === 'anno' || bersaglio.genere === 'materia') collezioni.add('registro')
  if (classi.size > 0) collezioni.add('classi')
  if (classi.size > 0) collezioni.add('fascicoli')
  if (corsi.size > 0 || bersaglio.genere === 'corso') collezioni.add('corsi')
  if (lezioni.size > 0) collezioni.add('lezioni')
  if (valutazioni.size > 0) collezioni.add('valutazioni')
  if (bersaglio.genere === 'piano') {
    collezioni.add('piani')
    // Togliere un piano scrive anche in `lezioni` e `valutazioni`, che per un
    // bersaglio «piano» restano vuote: vanno dichiarate qui, perché
    // `archivio.modifica` riscrive solo le collezioni annunciate.
    if (registro.lezioni.some((l) => l.pianoId === bersaglio.id)) collezioni.add('lezioni')
    if (registro.valutazioni.some((v) => v.pianoId === bersaglio.id)) {
      collezioni.add('valutazioni')
    }
  }

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
          // Le spunte erano di quelle attività: senza il piano non dicono niente.
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
        // I piani restano, senza corso, in fondo all'elenco.
        for (const piano of r.piani) {
          if (piano.corsoId && corsi.has(piano.corsoId)) piano.corsoId = null
        }
      }
      if (lezioni.size > 0) {
        // Prima di togliere le ore si fissa la loro data sulle consegne.
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
        // Lo stesso per le spunte del check.
        for (const lista of r.check) {
          for (const spunta of lista.spunte) {
            if (!spunta.lezioneId || !lezioni.has(spunta.lezioneId)) continue
            const persa = r.lezioni.find((l) => l.id === spunta.lezioneId)
            if (persa) spunta.data = persa.data
            spunta.lezioneId = null
          }
        }
        r.lezioni = r.lezioni.filter((l) => !lezioni.has(l.id))
        for (const momento of r.valutazioni) {
          if (momento.lezioneId && lezioni.has(momento.lezioneId)) momento.lezioneId = null
        }
      }
      if (valutazioni.size > 0) r.valutazioni = r.valutazioni.filter((v) => !valutazioni.has(v.id))
      if (consegne.size > 0) r.consegne = r.consegne.filter((c) => !consegne.has(c.id))
      if (check.size > 0) r.check = r.check.filter((c) => !check.has(c.id))
      if (smistamenti.size > 0) r.smistamenti = r.smistamenti.filter((s) => !smistamenti.has(s.id))
    },
  }
}
