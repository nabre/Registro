// Le impostazioni del documento dal file: UD, pause della giornata, carta
// intestata, calendario esterno. Vale anche fuori dal registro, per chi rilegge
// solo le impostazioni.

import { LIMITI_UD, minutiInUd, oraValida } from '#core/dominio/dates.js'
import { QUANDO_RIFARE_PDF } from '#core/dominio/automation.js'
import { normalizzaListe } from '#core/dominio/lists.js'
import { IMPOSTAZIONI_PREDEFINITE } from '#core/dominio/factories.js'
import { LIMITI_PAUSE, pauseDentroIlGiorno } from '#core/dominio/breaks.js'
import { nuovoIdCalendarioEsterno, nuovoIdRegolaCalendario } from '#core/dominio/identifiers.js'
import type {
  Impostazioni,
  CalendarioEsterno,
  RegolaCalendario,
  SorgenteCalendario,
  Corso,
  QuandoRifarePdf,
  Intestazione,
  CartaIntestata,
  PauseGiornata,
} from '#core/dominio/models.js'
import { Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { ALTEZZA_LOGO } from '#core/dominio/models.js'
import { cartaVuota, completaCarte, nuovoIdCarta } from '#core/dominio/letterhead.js'
import {
  testo,
  riferimento,
  numero,
  unOra,
  elenco,
  oggetto,
  normalizzaScala,
} from './readers.js'

/**
 * La durata dell'UD scritta nel file, o quella di fabbrica. Fuori dagli
 * estremi torna dentro invece di sparire.
 */
export function minutiUdLetti (grezzo: unknown): number {
  return interoFra(grezzo, LIMITI_UD.predefinita, LIMITI_UD)
}

export function normalizzaImpostazioni (grezzo: unknown): Impostazioni {
  const dati = oggetto(grezzo)
  const calendario = normalizzaCalendario(dati.calendario)
  const minutiUd = minutiUdLetti(dati.minutiUd)
  const pause = normalizzaPause(dati.pause, minutiUd)
  const giorni = elenco(dati.giorniVisibili)
    .map((g) => numero(g, 0))
    .filter((g) => g >= 1 && g <= 7)
  return {
    scala: normalizzaScala(dati.scala),
    oraInizioGiornata: unOra(dati.oraInizioGiornata, IMPOSTAZIONI_PREDEFINITE.oraInizioGiornata),
    oraFineGiornata: unOra(dati.oraFineGiornata, IMPOSTAZIONI_PREDEFINITE.oraFineGiornata),
    giorniVisibili: giorni.length > 0 ? giorni : [...IMPOSTAZIONI_PREDEFINITE.giorniVisibili],
    // Zero vuol dire «non arrotondare»; oltre il massimo della scala
    // schiaccerebbe ogni nota su un valore solo.
    passoFineSemestre: Math.min(10, Math.max(0, numero(dati.passoFineSemestre, 0.5))),
    // In percento, fra 0 e 100.
    sogliaAssenza: Math.min(100, Math.max(0, numero(dati.sogliaAssenza, 20))),
    minutiUd,
    durataSlotPredefinita: minutiInUd(numero(dati.durataSlotPredefinita, minutiUd), minutiUd),
    // Gli estremi di una pausa della giornata, minuti interi: fuori, la
    // convalida la rifiuterebbe.
    durataPausaPredefinita: interoFra(dati.durataPausaPredefinita, 15, LIMITI_PAUSE.durata),
    // Assenti e non vuote: senza pause dichiarate la lezione è un blocco solo.
    ...(pause ? { pause } : {}),
    // Un valore sconosciuto torna al predefinito invece di spegnere
    // l'automazione senza dirlo.
    pdfAutomatici: QUANDO_RIFARE_PDF.includes(dati.pdfAutomatici as QuandoRifarePdf)
      ? (dati.pdfAutomatici as QuandoRifarePdf)
      : IMPOSTAZIONI_PREDEFINITE.pdfAutomatici,
    // Solo le liste riconosciute e le voci offribili (vedi `domain/lists.ts`).
    liste: normalizzaListe(dati.liste),
    // Assente e non vuoto: senza calendario non si scrive una sorgente vuota.
    ...(calendario ? { calendario } : {}),
    intestazione: normalizzaIntestazione(dati.intestazione),
  }
}

/** Un intero dentro gli estremi: quel che sta fuori torna dentro, non sparisce. */
function interoFra (
  valore: unknown,
  riserva: number,
  estremi: { minimo: number, massimo: number },
): number {
  return Math.min(estremi.massimo, Math.max(estremi.minimo, Math.round(numero(valore, riserva))))
}

/**
 * Le pause della giornata dal file. Senza una prima pausa con orario non ce
 * n'è nessuna. Durate e distanze tornano negli estremi; cadono le pause oltre
 * il numero ammesso e quelle dopo mezzanotte (con le seguenti).
 */
export function normalizzaPause (grezzo: unknown, minutiUd: number): PauseGiornata | undefined {
  const dati = oggetto(grezzo)
  const prima = oggetto(dati.prima)
  if (!oraValida(prima.inizio)) return undefined
  const { durata, distanza, quante } = LIMITI_PAUSE
  return pauseDentroIlGiorno({
    prima: { inizio: prima.inizio, durataMin: interoFra(prima.durataMin, 15, durata) },
    seguenti: elenco(dati.seguenti)
      .slice(0, quante - 1)
      .map((voce) => {
        const seguente = oggetto(voce)
        return {
          dopoUd: interoFra(seguente.dopoUd, 2, distanza),
          durataMin: interoFra(seguente.durataMin, 15, durata),
        }
      }),
  }, minutiUd)
}

/** Una riga di testo della carta intestata: spazi stretti, e un tetto. */
function rigaIntestazione (valore: unknown): string {
  return typeof valore === 'string' ? valore.replace(/\s+/g, ' ').trim().slice(0, 200) : ''
}

/** Un campo di testo facoltativo per l'intestazione: stringa non vuota o undefined. */
function testoOSenza (valore: unknown): string | undefined {
  const pulito = rigaIntestazione(valore)
  return pulito || undefined
}

/**
 * Una carta intestata dal file. Il logo passa solo se è un'immagine dentro il
 * documento (un nome che finisce a un lettore di file non deve uscirne);
 * un'altezza fuori misura torna negli estremi.
 */
function normalizzaCarta (grezzo: unknown, riserva: string): CartaIntestata {
  const dati = oggetto(grezzo)
  const logo = typeof dati.logo === 'string' && logoAmmesso(dati.logo) ? dati.logo : undefined
  const alta = numero(dati.altezzaLogo, ALTEZZA_LOGO.predefinita)
  // Solo lettere, cifre, trattini: l'id finisce nel nome del file del logo.
  const id = typeof dati.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(dati.id) ? dati.id : riserva
  return {
    id,
    sede: rigaIntestazione(dati.sede),
    ...(logo ? { logo } : {}),
    altezzaLogo: Math.min(ALTEZZA_LOGO.massimo, Math.max(ALTEZZA_LOGO.minimo, alta)),
    corsi: elenco(dati.corsi).filter((c): c is string => typeof c === 'string'),
  }
}

/**
 * L'intestazione dal file, sempre con almeno una carta: la forma a carta
 * unica (sede e logo senza `carte`) diventa la prima carta. Due carte con lo
 * stesso id si separano, la seconda con un id nuovo. La matrice dei corsi la
 * completa `normalizzaRegistro` con `completaCarte`.
 */
export function normalizzaIntestazione (grezzo: unknown): Intestazione {
  const dati = oggetto(grezzo)
  const grezze = Array.isArray(dati.carte) ? dati.carte : [dati]
  const visti = new Set<string>()
  const carte = grezze.map((carta, i) => {
    const fatta = normalizzaCarta(carta, i === 0 ? 'car-prima' : nuovoIdCarta())
    // Con un id nuovo la carta non si porta il logo: il file è dell'altra.
    if (visti.has(fatta.id)) {
      fatta.id = nuovoIdCarta()
      delete fatta.logo
    }
    visti.add(fatta.id)
    return fatta
  })
  // La firma HTML si tiene com'è (incollata da Outlook), con un tetto di
  // lunghezza.
  const firma = typeof dati.firma === 'string' && dati.firma.trim() !== ''
    ? dati.firma.slice(0, 50_000)
    : undefined

  const docenteAppellativo = testoOSenza(dati.docenteAppellativo)
  const docenteNome = testoOSenza(dati.docenteNome)
  const docenteCognome = testoOSenza(dati.docenteCognome)
  let docente = rigaIntestazione(dati.docente)
  if (!docente && (docenteNome || docenteCognome)) {
    docente = [docenteAppellativo, docenteNome, docenteCognome].filter(Boolean).join(' ')
  }

  return {
    carte: carte.length > 0 ? carte : [cartaVuota('car-prima')],
    docente,
    ...(docenteAppellativo ? { docenteAppellativo } : {}),
    ...(docenteNome ? { docenteNome } : {}),
    ...(docenteCognome ? { docenteCognome } : {}),
    ...(firma ? { firma } : {}),
    ...(dati.vecchiaCartellaVista === true ? { vecchiaCartellaVista: true } : {}),
  }
}

/**
 * Le impostazioni con la matrice delle carte completa: ogni corso del
 * registro su una carta sola (vedi `completaCarte`).
 */
export function conCarteComplete (
  impostazioni: Impostazioni,
  corsi: readonly Corso[],
): Impostazioni {
  return {
    ...impostazioni,
    intestazione: {
      ...impostazioni.intestazione,
      carte: completaCarte(impostazioni.intestazione.carte, corsi.map((corso) => corso.id)),
    },
  }
}

/** Un percorso di logo accettabile: dentro `intestazione/`, PNG o JPEG, senza giri. */
export function logoAmmesso (percorso: string): boolean {
  return /^intestazione\/[^/\\:*?"<>|]+\.(png|jpe?g)$/i.test(percorso) && !percorso.includes('..')
}

/**
 * Il calendario esterno dal file, o niente. Una regola senza testo si butta;
 * una senza `corsoId` vale «non è una lezione», la lettura più prudente.
 */
export function normalizzaCalendario (grezzo: unknown): CalendarioEsterno | undefined {
  if (grezzo === undefined || grezzo === null) return undefined
  const dati = oggetto(grezzo)
  const regole: RegolaCalendario[] = []
  for (const voce of elenco(dati.regole)) {
    const regola = oggetto(voce)
    const scritto = testo(regola.testo).trim()
    // Solo il vuoto si butta: una regex di soli simboli dice qualcosa, e una
    // che non compila si tiene per essere corretta.
    if (!scritto) continue
    regole.push({
      id: testo(regola.id) || nuovoIdRegolaCalendario(),
      testo: scritto,
      corsoId: riferimento(regola.corsoId),
    })
  }
  const calendari: SorgenteCalendario[] = []
  const visti = new Set<string>()
  for (const voce of elenco(dati.calendari)) {
    const calendario = oggetto(voce)
    const origine = testo(calendario.origine).trim()
    // Senza origine o senza copia un calendario è un avanzo.
    if (!origine) continue
    let id = testo(calendario.id)
    if (!id || visti.has(id)) id = nuovoIdCalendarioEsterno()
    visti.add(id)
    const copiatoIl = testo(calendario.copiatoIl)
    calendari.push({
      id,
      nome: testo(calendario.nome).trim() || nomeDaOrigine(origine),
      origine,
      ...(copiatoIl ? { copiatoIl } : {}),
    })
  }
  // La forma vecchia a sorgente unica diventa il primo calendario; la copia
  // si fa alla prima lettura.
  const vecchia = testo(dati.sorgente).trim()
  if (vecchia && !calendari.some((c) => c.origine === vecchia)) {
    calendari.unshift({
      id: nuovoIdCalendarioEsterno(),
      nome: nomeDaOrigine(vecchia),
      origine: vecchia,
    })
  }
  if (calendari.length === 0 && regole.length === 0) return undefined
  return { calendari, regole }
}

/**
 * Il nome di un calendario senza nome: il nome del file, o solo l'host
 * dell'indirizzo (il resto porta spesso il gettone d'accesso).
 */
export function nomeDaOrigine (origine: string): string {
  const pulita = origine.trim()
  const indirizzo = /^(?:https?|webcals?):\/\/([^/?#]+)/i.exec(pulita)
  if (indirizzo) return indirizzo[1]
  const file = pulita.split(/[\\/]/).pop() ?? ''
  return file.replace(/\.ics$/i, '') || Uno(lessico().calendario)
}
