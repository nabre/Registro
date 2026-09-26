// Chi riceve una comunicazione, e come si legge prima di spedirla.
//
// La comunicazione salva i gruppi (allievi, tutori, recapiti fissi), non gli
// indirizzi: le mail si ricavano a ogni uso da classe e fascicolo, così una
// casella corretta vale anche per le bozze già scritte.

import { allieviAttivi, nomeCompleto, ordinaAllievi } from './calculations.js'
import { CHI_INSEGNA } from './models.js'
import type { Classe, Comunicazione, Consegna, Fascicolo, Registro } from './models.js'
import { aggiungiIndirizzo } from './text.js'
import { lessico } from './lexicon.testi.js'

interface DestinatariComunicazione {
  /** Gli indirizzi buoni, senza doppioni. */
  indirizzi: string[]
  /** Chi doveva ricevere e non ha un indirizzo utilizzabile: va detto prima di spedire. */
  senzaIndirizzo: string[]
}

/**
 * Gli indirizzi a cui va la comunicazione. Solo allievi attivi: chi si è
 * ritirato resta nel registro per i conti dell'anno, ma non nelle mail.
 */
export function destinatariComunicazione (
  classe: Classe,
  fascicolo: Fascicolo,
  comunicazione: Comunicazione,
): DestinatariComunicazione {
  const indirizzi = new Set<string>()
  const senzaIndirizzo: string[] = []

  if (comunicazione.aAllievi || comunicazione.aTutori) {
    for (const allievo of ordinaAllievi(allieviAttivi(classe))) {
      let raggiunto = false
      if (comunicazione.aAllievi) {
        raggiunto = aggiungiIndirizzo(indirizzi, allievo.email) || raggiunto
      }
      if (comunicazione.aTutori) {
        raggiunto = aggiungiIndirizzo(indirizzi, allievo.emailTutore) || raggiunto
      }
      if (!raggiunto) senzaIndirizzo.push(nomeCompleto(allievo))
    }
  }

  for (const id of comunicazione.recapitiIds) {
    const recapito = fascicolo.recapiti.find((r) => r.id === id)
    if (!recapito) continue
    if (!aggiungiIndirizzo(indirizzi, recapito.email)) senzaIndirizzo.push(recapito.etichetta)
  }

  return { indirizzi: [...indirizzi], senzaIndirizzo }
}

/**
 * Gli allegati di una comunicazione: le consegne «a me» con un file raccolto,
 * scelte per id. Una consegna senza file non è allegabile.
 */
export function allegatiComunicazione (
  registro: Registro,
  comunicazione: Comunicazione,
): Consegna[] {
  return registro.consegne.filter(
    (c) =>
      comunicazione.documentiIds.includes(c.id) &&
      c.documento !== undefined &&
      (c.documenti ?? []).some((d) => d.allievoId === CHI_INSEGNA),
  )
}

/** Il file raccolto da una consegna «a me»: quel che si allega davvero. */
export function fileDellaConsegna (consegna: Consegna): { file: string, nome: string } | null {
  const suo = (consegna.documenti ?? []).find((d) => d.allievoId === CHI_INSEGNA)
  if (!suo) return null
  const nome = suo.nome || suo.file.split('/').pop() || lessico().documento.singolare
  return { file: suo.file, nome }
}

// ------------------------------------------------------------------ il corpo

/**
 * Se un testo porta dei tag: così si riconosce una firma HTML da una a righe,
 * senza chiedere di dichiararlo.
 */
export function sembraHtml (testo: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(testo)
}

/** Il testo come si scrive dentro dell'HTML: niente tag per caso, gli a capo restano. */
function comeHtml (testo: string): string {
  return testo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

/**
 * Il corpo della mail con la firma in fondo. Una firma a righe tiene il
 * messaggio in testo semplice; una firma HTML obbliga tutto il corpo in HTML
 * (non può essere misto), con il testo del docente neutralizzato e gli a capo
 * resi come `<br>`. La riga «-- » segna la firma per i programmi di posta.
 */
export function corpoDelMessaggio (
  corpo: string,
  firma?: string,
  sempreHtml = false,
): { html: boolean, contenuto: string } {
  const pulita = (firma ?? '').trim()
  if (!pulita) {
    return sempreHtml
      ? { html: true, contenuto: `<div>${comeHtml(corpo.trimEnd())}</div>` }
      : { html: false, contenuto: corpo }
  }
  if (!sembraHtml(pulita) && !sempreHtml) {
    return { html: false, contenuto: `${corpo.trimEnd()}\n\n-- \n${pulita}` }
  }
  const inFondo = sembraHtml(pulita) ? pulita : `<div>${comeHtml(pulita)}</div>`
  return {
    html: true,
    contenuto: `<div>${comeHtml(corpo.trimEnd())}</div><div>&nbsp;</div><div>-- </div>${inFondo}`,
  }
}

// ------------------------------------------------------------------ il file di posta

/**
 * Il messaggio come file `.eml`, pronto da aprire nel programma di posta. Sta
 * nel dominio perché non tocca il disco e si prova (nomi di allegati, oggetti
 * accentati).
 */

/** Un allegato già in base64, come lo si legge da disco. */
export interface AllegatoPosta {
  nome: string
  tipo: string
  /** Il file stesso, in base64: è così che viaggia, dovunque vada. */
  contenuto: string
}

export interface MessaggioPosta {
  oggetto: string
  corpo: string
  /**
   * Da quale casella parte, quando la si sa: con più conti nello stesso
   * programma il «Da» predefinito può non essere quello della scuola.
   */
  da?: string
  /** Vanno tutti in copia nascosta: una comunicazione alla classe non è una rubrica. */
  ccn: string[]
  /** I destinatari in chiaro, quando la mail è indirizzata a qualcuno. */
  a?: string[]
  allegati?: AllegatoPosta[]
  /** La firma da mettere in fondo, uguale per tutto quel che esce dal registro. */
  firma?: string
}

const ACAPO = '\r\n'

/**
 * Un testo su una riga sola. Nelle intestazioni e nei comandi SMTP l'a capo è
 * sintassi: dentro un oggetto o un nome di file aggiungerebbe un'intestazione
 * (`Bcc:`) o un comando. Gli a capo diventano spazi.
 */
function unaRiga (testo: string): string {
  return testo.replace(/[\r\n]+/g, ' ')
}

/**
 * Un'intestazione non ASCII scritta come vuole la posta, `=?UTF-8?B?…?=`,
 * perché «Assenze 1° semestre» arrivi intero.
 */
function intestazione (grezzo: string): string {
  const testo = unaRiga(grezzo)
  if (!/[^\u0000-\u007f]/.test(testo)) return testo
  return `=?UTF-8?B?${Buffer.from(testo, 'utf8').toString('base64')}?=`
}

/** Base64 spezzato a 76 colonne, come vuole il MIME. */
function aRighe (base64: string): string {
  return (base64.match(/.{1,76}/g) ?? []).join(ACAPO)
}

/** Un nome buono per un file su qualunque sistema: niente accenti, niente segni. */
export function schiacciaNome (testo: string): string {
  const senzaAccenti = testo.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return (
    senzaAccenti.replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/\s+/g, '_').slice(0, 60) ||
    lessico().bozza.singolare
  )
}

/**
 * Il nome di un allegato in tutti e due i modi: `filename=` ASCII per i
 * programmi vecchi, `filename*=` UTF-8 per gli altri.
 */
function nomeAllegato (grezzo: string): string {
  // Un nome di file può contenere un a capo (macOS, Linux), e la coda va fra
  // `"…"` senza passare da `schiacciaNome`: via anche le virgolette.
  const nome = unaRiga(grezzo)
  const coda = nome.match(/\.[^.]+$/)?.[0] ?? ''
  const ripiego = schiacciaNome(nome.slice(0, nome.length - coda.length)) + coda.replace(/"/g, '')
  return `filename="${ripiego}"${ACAPO} filename*=UTF-8''${encodeURIComponent(nome)}`
}

/**
 * Le parti MIME del messaggio (corpo, firma, allegati), comuni al file `.eml`
 * e all'invio SMTP: cambiano solo le intestazioni davanti.
 */
function partiMime (
  messaggio: MessaggioPosta,
  adesso: Date,
  sempreHtml = false,
): { testate: string[], pezzi: string[] } {
  const scritto = corpoDelMessaggio(messaggio.corpo, messaggio.firma, sempreHtml)
  const allegati = messaggio.allegati ?? []

  const corpo = [
    // testo-fisso: intestazione MIME
    `Content-Type: text/${scritto.html ? 'html' : 'plain'}; charset=UTF-8`,
    'Content-Transfer-Encoding: base64',
    '',
    aRighe(Buffer.from(scritto.contenuto, 'utf8').toString('base64')),
  ].join(ACAPO)

  if (allegati.length === 0) return { testate: [], pezzi: [corpo] }

  // Un confine che non può comparire nel base64: trattini e parola non ne fanno parte.
  const confine = `----registro-${adesso.getTime().toString(36)}-${allegati.length}`
  return {
    // testo-fisso: intestazione MIME
    testate: [`Content-Type: multipart/mixed; boundary="${confine}"`, ''],
    pezzi: [
      `--${confine}`,
      corpo,
      ...allegati.map((allegato) =>
        [
          `--${confine}`,
          // testo-fisso: intestazione MIME
          `Content-Type: ${allegato.tipo}; name="${schiacciaNome(allegato.nome)}"`,
          'Content-Transfer-Encoding: base64',
          // testo-fisso: intestazione MIME
          `Content-Disposition: attachment; ${nomeAllegato(allegato.nome)}`,
          '',
          aRighe(allegato.contenuto),
        ].join(ACAPO),
      ),
      `--${confine}--`,
    ],
  }
}

/**
 * Il messaggio come file di posta. `X-Unsent: 1` fa aprire a Outlook una bozza
 * da finire invece di un messaggio ricevuto.
 *
 * Il corpo è sempre HTML: il programma di posta attacca alla bozza la firma
 * HTML dell'utente, e un corpo in testo semplice verrebbe riscritto perdendo il
 * testo.
 */
export function componiEml (messaggio: MessaggioPosta, adesso = new Date()): string {
  const visibili = messaggio.a ?? []
  const { testate, pezzi } = partiMime(messaggio, adesso, true)

  return (
    [
      'MIME-Version: 1.0',
      'X-Unsent: 1',
      `Date: ${adesso.toUTCString()}`,
      // testo-fisso: intestazione MIME
      `Subject: ${intestazione(messaggio.oggetto)}`,
      ...(messaggio.da ? [`From: ${unaRiga(messaggio.da)}`] : []), // testo-fisso: intestazione MIME
      // testo-fisso: intestazione MIME
      ...(visibili.length > 0 ? [`To: ${unaRiga(visibili.join(', '))}`] : []),
      // testo-fisso: intestazione MIME
      ...(messaggio.ccn.length > 0 ? [`Bcc: ${unaRiga(messaggio.ccn.join(', '))}`] : []),
      ...testate,
      ...pezzi,
    ].join(ACAPO) + ACAPO
  )
}

// ------------------------------------------------------------------ l'invio diretto

/** Un messaggio che non è partito, e perché. */
export interface MessaggioFallito {
  /** La sua posizione nell'elenco passato: è così che chi chiama lo ritrova. */
  indice: number
  errore: string
}

/**
 * Un'intestazione di indirizzi piegata su più righe: una riga di posta non
 * supera 998 caratteri, e venticinque indirizzi li superano. Si piega con a
 * capo più spazio.
 */
function piega (nome: string, indirizzi: string[]): string {
  const righe: string[] = []
  let riga = `${nome}:`
  for (const [posizione, indirizzo] of indirizzi.entries()) {
    const pezzo = ` ${indirizzo}${posizione < indirizzi.length - 1 ? ',' : ''}`
    if (riga.length + pezzo.length > 76 && riga !== `${nome}:`) {
      righe.push(riga)
      riga = pezzo
    } else {
      riga += pezzo
    }
  }
  righe.push(riga)
  return righe.join(ACAPO)
}

/**
 * Il messaggio da consegnare a un server di posta. Due differenze dal `.eml`:
 * niente `Bcc:` nelle intestazioni (gli indirizzi nascosti vanno solo nella
 * busta, `RCPT TO`, se no ogni famiglia legge l'elenco delle altre), e niente
 * `X-Unsent`, che dice «bozza».
 */
export function componiPerInvio (
  messaggio: MessaggioPosta,
  adesso = new Date(),
  chiave = Math.random().toString(36).slice(2),
): string {
  const visibili = messaggio.a ?? []
  const { testate, pezzi } = partiMime(messaggio, adesso)
  const dominio = (messaggio.da ?? '').split('@')[1] || 'registro.local'

  return (
    [
      'MIME-Version: 1.0',
      `Date: ${adesso.toUTCString()}`,
      // Senza `Message-ID` lo inventa il server, se lo fa: un messaggio senza
      // finisce più facilmente fra la posta indesiderata.
      // testo-fisso: intestazione MIME
      `Message-ID: <${adesso.getTime().toString(36)}.${chiave}@${dominio}>`,
      // testo-fisso: intestazione MIME
      `Subject: ${intestazione(messaggio.oggetto)}`,
      ...(messaggio.da ? [`From: ${unaRiga(messaggio.da)}`] : []), // testo-fisso: intestazione MIME
      ...(visibili.length > 0 ? [piega('To', visibili.map(unaRiga))] : []),
      ...testate,
      ...pezzi,
    ].join(ACAPO) + ACAPO
  )
}

/**
 * Gli indirizzi della busta (`RCPT TO`): destinatari in chiaro e copia
 * nascosta, senza doppioni.
 */
export function destinatariBusta (messaggio: MessaggioPosta): string[] {
  const tutti = new Set<string>()
  for (const indirizzo of [...(messaggio.a ?? []), ...messaggio.ccn]) {
    // Una riga sola: un a capo in `RCPT TO:<…>` sarebbe un comando SMTP in più.
    const pulito = unaRiga(indirizzo).trim()
    if (pulito) tutti.add(pulito)
  }
  return [...tutti]
}
