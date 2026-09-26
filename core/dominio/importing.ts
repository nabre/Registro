// Far entrare persone e dati da fuori.
//
// Un elenco di allievi incollato in uno dei tre formati che arrivano davvero:
// «Cognome Nome», «Cognome, Nome», righe di foglio di calcolo separate da
// tabulazione (con l'e-mail in fondo). Poi una classe da un altro documento
// `.regi` (`importaClasse`) e, a blocchi, quel che di un altro registro vale
// anche in questo (`importaRegistro`). Nel dominio perché si prova da solo.

import { oreConAppello } from './calculations.js'
import { titoloCorso } from './courses.js'
import { duplicaClasse, duplicaPiano } from './factories.js'
import {
  nuovoIdCalendarioEsterno,
  nuovoIdCorso,
  nuovoIdMateria,
  nuovoIdRegolaCalendario,
  nuovoIdRicorrenza,
} from './identifiers.js'
import type {
  CalendarioEsterno,
  Classe,
  Corso,
  Impostazioni,
  Materia,
  PianoLezione,
  Registro,
} from './models.js'
import { istanteAdesso } from './dates.js'
import { testi } from './importing.testi.js'
import { nomeNormalizzato, validaClasse } from './validation.js'

interface VoceElenco {
  cognome: string
  nome: string
  email?: string
}

/** Vero per qualcosa che somiglia a un indirizzo, non per validarlo davvero. */
function sembraEmail (campo: string): boolean {
  return campo.includes('@')
}

export function leggiElencoAllievi (testo: string): VoceElenco[] {
  const voci: VoceElenco[] = []

  for (const riga of testo.split(/\r?\n/)) {
    const pulita = riga.trim()
    if (!pulita) continue

    const campi = pulita.split(/\t|;|,/).map((c) => c.trim()).filter(Boolean)
    const email = campi.find(sembraEmail)
    const senzaEmail = campi.filter((c) => !sembraEmail(c))

    if (senzaEmail.length >= 2) {
      voci.push({ cognome: senzaEmail[0], nome: senzaEmail[1], ...(email ? { email } : {}) })
      continue
    }

    // Senza separatori: l'ultima parola è il nome, il resto il cognome (i
    // cognomi composti sono più frequenti dei nomi doppi).
    const parole = (senzaEmail[0] ?? '').split(/\s+/).filter(Boolean)
    if (parole.length === 0) continue
    if (parole.length === 1) {
      voci.push({ cognome: parole[0], nome: '', ...(email ? { email } : {}) })
    } else {
      voci.push({
        cognome: parole.slice(0, -1).join(' '),
        nome: parole[parole.length - 1],
        ...(email ? { email } : {}),
      })
    }
  }

  return voci
}

// ------------------------------------------------- una classe da un altro anno

/** Che cosa portare di una classe da un altro documento. */
interface SceltaImport {
  /** L'anno di qui in cui la classe arriva. */
  annoId: string
  nome: string
  /** Le persone, con identificativi nuovi. Spento, la classe arriva vuota. */
  anagrafica: boolean
  /** I corsi della classe, con le loro materie abbinate a quelle di qui. */
  corsi: boolean
}

/** Quel che l'import aggiunge all'anno aperto. */
interface ClasseImportata {
  classe: Classe
  /** Le materie che qui non c'erano: vanno aggiunte insieme ai corsi. */
  materieNuove: Materia[]
  corsi: Corso[]
  /**
   * Da quale corso di là viene ogni corso di qui (id di là → id di qui), per
   * riagganciare piani, carte intestate e regole del calendario.
   */
  daCorso: Record<string, string>
}

/**
 * La materia di qui con lo stesso nome normalizzato di quella di là (la regola
 * di `validaMateria`), o una nuova copiata da lei, messa in `nuove` perché chi
 * chiama la aggiunga.
 */
function materiaAbbinata (sua: Materia, qui: readonly Materia[], nuove: Materia[]): Materia {
  const chiave = nomeNormalizzato(sua.nome)
  const trovata = [...qui, ...nuove].find((m) => nomeNormalizzato(m.nome) === chiave)
  if (trovata) return trovata
  const nata: Materia = {
    id: nuovoIdMateria(),
    nome: sua.nome,
    ...(sua.sigla ? { sigla: sua.sigla } : {}),
    ...(sua.colore ? { colore: sua.colore } : {}),
    ...(sua.note ? { note: sua.note } : {}),
  }
  nuove.push(nata)
  return nata
}

/**
 * Una classe di un altro anno, rifatta per questo: l'impianto, e a scelta le
 * persone e i corsi, mai quel che è successo là. Null se la classe non c'è.
 *
 * Le persone escono da `duplicaClasse` (id nuovi; le foto restano col percorso
 * dell'altro documento, da ricopiare). Materie abbinate con `materiaAbbinata`.
 * Dei corsi si portano titolo (rifatto), orario, note e colore; le fasce
 * perdono `dal` e `al`, che sono date dell'altro anno.
 */
export function importaClasse (
  origine: Registro,
  classeId: string,
  qui: Registro,
  scelta: SceltaImport,
): ClasseImportata | null {
  const sorgente = origine.classi.find((c) => c.id === classeId)
  if (!sorgente) return null
  const copia = duplicaClasse(sorgente, scelta.annoId, scelta.nome)
  // Una classe archiviata là, portata qui, ricomincia.
  const classe: Classe = {
    ...copia,
    archiviata: false,
    allievi: scelta.anagrafica ? copia.allievi : [],
  }
  if (!scelta.corsi) return { classe, materieNuove: [], corsi: [], daCorso: {} }

  const materieNuove: Materia[] = []
  const corsi: Corso[] = []
  const daCorso: Record<string, string> = {}
  const adesso = istanteAdesso()
  const inUdDiQui = (minuti: number) =>
    stesseUd(minuti, origine.impostazioni.minutiUd, qui.impostazioni.minutiUd)
  for (const vecchio of origine.corsi.filter((c) => c.classeId === sorgente.id)) {
    const sua = origine.materie.find((m) => m.id === vecchio.materiaId)
    if (!sua) continue
    const materia = materiaAbbinata(sua, qui.materie, materieNuove)
    // Due corsi di là sulla stessa materia di qui (materie omonime): resta il
    // primo, che `validaCorso` accetta, e il secondo si aggancia a lui.
    const gemello = corsi.find((c) => c.materiaId === materia.id)
    if (gemello) {
      daCorso[vecchio.id] = gemello.id
      continue
    }
    const corso: Corso = {
      id: nuovoIdCorso(),
      classeId: classe.id,
      materiaId: materia.id,
      titolo: titoloCorso(classe, materia),
      // In UD di qui: due UD restano due UD anche se qui durano altri minuti.
      orario: vecchio.orario.map(({ dal: _dal, al: _al, ...fascia }) => ({
        ...fascia,
        durataMin: inUdDiQui(fascia.durataMin),
        id: nuovoIdRicorrenza(),
      })),
      note: vecchio.note ?? '',
      ...(vecchio.colore ? { colore: vecchio.colore } : {}),
      creatoIl: adesso,
      aggiornatoIl: adesso,
    }
    corsi.push(corso)
    daCorso[vecchio.id] = corso.id
  }
  return { classe, materieNuove, corsi, daCorso }
}

// ------------------------------------------------ un altro registro, a blocchi

/** Una classe da portare, con le sue due spunte. */
interface SceltaClasse {
  classeId: string
  anagrafica: boolean
  corsi: boolean
}

/**
 * Che cosa portare da un altro registro, blocco per blocco: solo quel che vale
 * anche l'anno dopo. Lezioni, presenze, voti, osservazioni, consegne, check,
 * smistamenti e fascicoli restano là.
 */
interface SceltaRegistro {
  /** L'anno di qui in cui le classi arrivano. */
  annoId: string
  /** Scala, arrotondamenti, soglia d'assenza, giornata, liste, carta intestata. */
  impostazioni: boolean
  /** Tutte le materie di là, anche quelle che nessuna classe portata insegna. */
  materie: boolean
  classi: SceltaClasse[]
  /** Le scalette dei corsi portati, senza niente che parli di un'ora di là. */
  piani: boolean
  /** I calendari ICS e le regole che dicono quale evento è quale corso. */
  calendari: boolean
}

/** Una copia ICS da ricopiare: l'id del calendario di là e quello di qui. */
interface CopiaIcs { da: string, a: string }

/** Quel che l'import di un registro aggiunge a quello aperto. */
interface RegistroImportato {
  /**
   * Le impostazioni come saranno, intere; null se non se ne tocca nessuna. I
   * loghi delle carte hanno ancora il percorso di là: li ricopia l'host.
   */
  impostazioni: Impostazioni | null
  materieNuove: Materia[]
  classi: Classe[]
  corsi: Corso[]
  /** Con le risorse che portano il percorso di là, come i loghi. */
  piani: PianoLezione[]
  /** Le copie ICS da ricopiare: l'id del calendario di là e quello di qui. */
  copie: CopiaIcs[]
  /** Quanti calendari e quante regole sono arrivati: per l'esito. */
  calendari: number
  regole: number
  /** Le classi che non sono arrivate, e perché: «I MEC A: c’è già». */
  saltate: string[]
}

/** Una durata scritta in UD da `da` minuti, riscritta con le stesse UD da `a` minuti. */
function stesseUd (minuti: number, da: number, a: number): number {
  return Math.max(1, Math.round(minuti / da)) * a
}

/**
 * Le impostazioni di là, voce per voce: arriva come lavora chi insegna (scala,
 * arrotondamenti, soglia, giornata, quando rifare i PDF, tendine, carta
 * intestata). Resta di qui quel che è del file: calendario ICS (ha il suo
 * blocco) e il segno della cartella `templates/` già letta. Le date dell'anno
 * non sono impostazioni.
 *
 * Campo per campo e non `...la`: un campo nuovo non compila finché qui non si
 * decide se viaggia. Le carte tengono i loro id (l'elenco si sostituisce) e i
 * corsi passano per `daCorso`; quelli rimasti senza carta li sistema
 * `completaCarte` alla scrittura.
 */
function impostazioniDaLa (
  la: Impostazioni,
  qui: Impostazioni,
  daCorso: Readonly<Record<string, string>>,
): Impostazioni {
  return {
    scala: { ...la.scala },
    passoFineSemestre: la.passoFineSemestre,
    sogliaAssenza: la.sogliaAssenza,
    // La durata dell'UD viaggia con la giornata; se qui ci sono già appelli si
    // riporta a quella di qui, più sotto.
    minutiUd: la.minutiUd,
    oraInizioGiornata: la.oraInizioGiornata,
    oraFineGiornata: la.oraFineGiornata,
    giorniVisibili: [...la.giorniVisibili],
    durataSlotPredefinita: la.durataSlotPredefinita,
    durataPausaPredefinita: la.durataPausaPredefinita,
    // Le pause sono della scuola, non dell'anno.
    ...(la.pause ? { pause: structuredClone(la.pause) } : {}),
    pdfAutomatici: la.pdfAutomatici,
    // Tutte: una lista che là manca vuol dire «di fabbrica», anche qui.
    liste: structuredClone(la.liste ?? {}),
    ...(qui.calendario ? { calendario: qui.calendario } : {}),
    intestazione: {
      carte: la.intestazione.carte.map((carta) => ({
        ...carta,
        corsi: carta.corsi.flatMap((id) => (daCorso[id] ? [daCorso[id]] : [])),
      })),
      docente: la.intestazione.docente,
      ...(la.intestazione.firma ? { firma: la.intestazione.firma } : {}),
      ...(qui.intestazione.vecchiaCartellaVista ? { vecchiaCartellaVista: true } : {}),
    },
  }
}

/**
 * I calendari ICS di là aggiunti a quelli di qui (una stessa origine non si
 * raddoppia), con id nuovi e regole riagganciate. Una regola di un corso che
 * non arriva si toglie: trasformarla in «non è una lezione» nasconderebbe gli
 * eventi di quel corso. Le regole «non è una lezione» arrivano com'erano.
 */
function calendarioDaLa (
  la: CalendarioEsterno | undefined,
  qui: CalendarioEsterno | undefined,
  daCorso: Readonly<Record<string, string>>,
): { calendario: CalendarioEsterno | undefined, copie: CopiaIcs[], regole: number } {
  const calendari = [...(qui?.calendari ?? [])]
  const regole = [...(qui?.regole ?? [])]
  const copie: CopiaIcs[] = []
  let nuoveRegole = 0
  for (const sorgente of la?.calendari ?? []) {
    const origine = sorgente.origine.trim()
    if (calendari.some((c) => c.origine.trim() === origine)) continue
    const id = nuovoIdCalendarioEsterno()
    calendari.push({ ...sorgente, id })
    copie.push({ da: sorgente.id, a: id })
  }
  for (const regola of la?.regole ?? []) {
    const corsoId = regola.corsoId === null ? null : daCorso[regola.corsoId]
    if (corsoId === undefined) continue
    const testo = regola.testo.trim()
    if (regole.some((r) => r.testo.trim() === testo && r.corsoId === corsoId)) continue
    regole.push({ id: nuovoIdRegolaCalendario(), testo, corsoId })
    nuoveRegole += 1
  }
  const calendario = calendari.length === 0 && regole.length === 0 ? qui : { calendari, regole }
  return { calendario, copie, regole: nuoveRegole }
}

/**
 * Da un altro registro, le modifiche da fare a questo, calcolate e non fatte.
 *
 * L'ordine conta: materie, poi classi (`importaClasse` dice dove finisce ogni
 * corso di là), poi quel che dipende dai corsi (carte, piani, regole). Una
 * classe con lo stesso nome di una di qui si salta e lo si dice: fondere due
 * elenchi di persone non lo decide un import. I file restano col percorso di
 * là: li ricopia chi ha i due pacchetti.
 */
export function importaRegistro (
  origine: Registro,
  qui: Registro,
  scelta: SceltaRegistro,
): RegistroImportato {
  const t = testi()
  const materieNuove: Materia[] = []
  if (scelta.materie) {
    for (const sua of origine.materie) materiaAbbinata(sua, qui.materie, materieNuove)
  }

  const classi: Classe[] = []
  const corsi: Corso[] = []
  const saltate: string[] = []
  const daCorso: Record<string, string> = {}
  for (const voce of scelta.classi) {
    const sorgente = origine.classi.find((c) => c.id === voce.classeId)
    if (!sorgente) {
      saltate.push(t.classeSparita)
      continue
    }
    const nome = sorgente.nome.trim()
    // Doppioni secondo `validaClasse`, anche fra le classi appena portate.
    if (!validaClasse({ id: '', nome, annoId: scelta.annoId }, [...qui.classi, ...classi]).valido) {
      saltate.push(t.ceGia(nome))
      continue
    }
    const fatta = importaClasse(
      origine,
      sorgente.id,
      { ...qui, materie: [...qui.materie, ...materieNuove] },
      { annoId: scelta.annoId, nome, anagrafica: voce.anagrafica, corsi: voce.corsi },
    )
    if (!fatta) continue
    classi.push(fatta.classe)
    corsi.push(...fatta.corsi)
    materieNuove.push(...fatta.materieNuove)
    Object.assign(daCorso, fatta.daCorso)
  }

  const piani: PianoLezione[] = []
  if (scelta.piani) {
    for (const piano of origine.piani) {
      const corsoId = piano.corsoId ? daCorso[piano.corsoId] : undefined
      if (!corsoId) continue
      // Un piano non nomina le sue ore (sono le ore a nominarlo): la copia non
      // porta lezioni né avanzamento.
      piani.push({ ...duplicaPiano(piano), corsoId })
    }
  }

  let impostazioni: Impostazioni | null = scelta.impostazioni
    ? impostazioniDaLa(origine.impostazioni, qui.impostazioni, daCorso)
    : null
  // Se qui c'è già un appello, la durata dell'UD resta quella di qui: l'appello
  // ha una casella per UD (vedi `erroriImpostazioni`).
  if (impostazioni && impostazioni.minutiUd !== qui.impostazioni.minutiUd &&
    oreConAppello(qui.lezioni) > 0) {
    impostazioni = {
      ...impostazioni,
      minutiUd: qui.impostazioni.minutiUd,
      durataSlotPredefinita: stesseUd(
        impostazioni.durataSlotPredefinita,
        impostazioni.minutiUd,
        qui.impostazioni.minutiUd,
      ),
    }
  }
  // L'orario dei corsi arrivati è già in UD di qui (`importaClasse`); con una
  // durata dell'UD nuova tiene le UD, non i minuti.
  const udDiQui = qui.impostazioni.minutiUd
  const udFinale = (impostazioni ?? qui.impostazioni).minutiUd
  if (udDiQui !== udFinale) {
    for (const corso of corsi) {
      for (const fascia of corso.orario) {
        fascia.durataMin = stesseUd(fascia.durataMin, udDiQui, udFinale)
      }
    }
  }
  let copie: CopiaIcs[] = []
  let regole = 0
  if (scelta.calendari) {
    const base = impostazioni ?? qui.impostazioni
    const fatto = calendarioDaLa(origine.impostazioni.calendario, base.calendario, daCorso)
    const { calendario: _prima, ...senza } = base
    impostazioni = { ...senza, ...(fatto.calendario ? { calendario: fatto.calendario } : {}) }
    copie = fatto.copie
    regole = fatto.regole
  }

  return {
    impostazioni,
    materieNuove,
    classi,
    corsi,
    piani,
    copie,
    calendari: copie.length,
    regole,
    saltate,
  }
}

/**
 * L'esito in una riga: «3 classi, 57 persone, 5 corsi, 2 materie nuove,
 * impostazioni; saltata I MEC A: c’è già». Solo quel che è arrivato.
 */
export function esitoImportRegistro (fatto: RegistroImportato, scelta: SceltaRegistro): string {
  const t = testi()
  const persone = fatto.classi.reduce((somma, c) => somma + c.allievi.length, 0)
  const parti = [
    fatto.classi.length ? t.classi(fatto.classi.length) : '',
    persone ? t.persone(persone) : '',
    fatto.corsi.length ? t.corsi(fatto.corsi.length) : '',
    fatto.materieNuove.length ? t.materieNuove(fatto.materieNuove.length) : '',
    fatto.piani.length ? t.piani(fatto.piani.length) : '',
    fatto.calendari ? t.calendari(fatto.calendari) : '',
    fatto.regole ? t.regole(fatto.regole) : '',
    scelta.impostazioni ? t.impostazioni : '',
  ].filter(Boolean)
  return t.esito(parti, fatto.saltate)
}
