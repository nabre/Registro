// Quel che sta dentro il documento d'anno: la scala dei voti. La
// giornata sta in `settings/schoolDay.ts`, che usa da qui il salvataggio e i
// lettori dei campi.
// Queste impostazioni viaggiano con il `.regi`. Si salvano appena si tocca un
// campo. I campi disegnati con i controlli condivisi (`campoAnno`) dicono
// l'esito accanto a sé (`salvaConEsito`), gli altri in una notifica; quel che
// l'host corregge in silenzio si dice sempre.

import type { Esito } from '#core/controlli/control.js'
import { numero } from '#core/i18n/index.js'
import { parole } from '#core/dominio/words.testi.js'
import type { Impostazioni } from '#core/dominio/models.js'
import type { ImpostazioniDaSalvare } from '#contract/protocol.js'
import { scheda } from '#ui/pannello/components/base.js'
import { notifica } from '#ui/pannello/components/notifications.js'
import { avanzateAnno, campoAnno, gruppoAnno, sezioneAnno, voceAnno } from '#ui/pannello/components/yearSetting.js'
import { h } from '#ui/pannello/dom.js'
import { azione, invia } from '#ui/pannello/bridge.js'
import { stato } from '#ui/pannello/state.js'
import { testi } from './document.testi.js'

/** Le differenze fra quel che si è mandato e quel che l'host ha salvato (normalizza in silenzio). */
function scostamenti (mandate: ImpostazioniDaSalvare, arrivate: Impostazioni): string[] {
  const esito: string[] = []
  const t = testi()
  const nomi = t.scostamenti
  const confronta = (etichetta: string, a: unknown, b: unknown) => {
    if (a !== b) esito.push(t.portataA(etichetta, String(b)))
  }
  confronta(nomi.minutiUd, mandate.minutiUd, arrivate.minutiUd)
  confronta(nomi.oraInizioGiornata, mandate.oraInizioGiornata, arrivate.oraInizioGiornata)
  confronta(nomi.oraFineGiornata, mandate.oraFineGiornata, arrivate.oraFineGiornata)
  confronta(
    nomi.durataPausaPredefinita,
    mandate.durataPausaPredefinita,
    arrivate.durataPausaPredefinita,
  )
  confronta(
    nomi.durataSlotPredefinita,
    mandate.durataSlotPredefinita,
    arrivate.durataSlotPredefinita,
  )
  confronta(nomi.passoFineSemestre, mandate.passoFineSemestre, arrivate.passoFineSemestre)
  confronta(nomi.sogliaAssenza, mandate.sogliaAssenza, arrivate.sogliaAssenza)
  // Anche la scala: `validaImpostazioni` raddrizza una scala impossibile (con
  // `max` a zero fa `massimo = min + 1`), e va detto.
  confronta(nomi.scalaMin, mandate.scala.min, arrivate.scala.min)
  confronta(nomi.scalaMax, mandate.scala.max, arrivate.scala.max)
  confronta(nomi.sufficienza, mandate.scala.sufficienza, arrivate.scala.sufficienza)
  confronta(nomi.passoVoti, mandate.scala.passo, arrivate.scala.passo)
  // L'altezza del logo è per carta: si confronta per id; una carta aggiunta o
  // tolta dall'host non ha niente da dire.
  for (const mandata of mandate.intestazione?.carte ?? []) {
    const arrivata = arrivate.intestazione.carte.find((carta) => carta.id === mandata.id)
    if (arrivata) confronta(nomi.altezzaLogo, mandata.altezzaLogo, arrivata.altezzaLogo)
  }
  return esito
}

/** L’orario battuto in un campo, o `null`: vuoto vuol dire «non toccare». */
export function oraBattuta (valore: string, etichetta: string): string | null {
  if (valore.trim() === '') {
    notifica(testi().serveUnOrario(etichetta), 'errore')
    return null
  }
  return valore
}

/** L'intestazione come la si manda a salvare: senza logo, che ha le sue azioni. */
type IntestazioneDaSalvare = NonNullable<ImpostazioniDaSalvare['intestazione']>

/** Una modifica puntuale: l'intestazione si può mandare anche a pezzi. */
type ModificheImpostazioni =
  Partial<Omit<Impostazioni, 'intestazione'>> & { intestazione?: Partial<IntestazioneDaSalvare> }

/**
 * L'intestazione di adesso, pronta da rimandare. Le carte partono senza logo
 * (lo gestiscono `intestazione.logo` e `intestazione.togliLogo`, per id) e
 * senza il segno della vecchia cartella (lo scrive solo il registro). Le carte
 * si mandano sempre tutte: l'host sostituisce la matrice intera, non la fonde.
 */
function intestazioneDaSalvare (
  modifiche: Partial<IntestazioneDaSalvare> = {},
): IntestazioneDaSalvare {
  const attuale = stato.registro.impostazioni.intestazione
  const carte = modifiche.carte ?? attuale.carte
  const docente = modifiche.docente ?? attuale.docente
  const firma = modifiche.firma ?? attuale.firma
  // Le parti del nome si rimandano sempre: l'host sostituisce l'intestazione
  // intera, e senza di loro un ritocco della scala dei voti le cancellerebbe.
  const appellativo = modifiche.docenteAppellativo ?? attuale.docenteAppellativo
  const nome = modifiche.docenteNome ?? attuale.docenteNome
  const cognome = modifiche.docenteCognome ?? attuale.docenteCognome
  return {
    carte: carte.map(({ id, sede, altezzaLogo, corsi }) => ({
      id, sede, altezzaLogo, corsi: [...corsi],
    })),
    docente,
    ...(appellativo ? { docenteAppellativo: appellativo } : {}),
    ...(nome ? { docenteNome: nome } : {}),
    ...(cognome ? { docenteCognome: cognome } : {}),
    // Una firma vuota vuol dire «quella di serie»: si manda senza, e l'host usa la sua.
    ...(firma && firma.trim() !== '' ? { firma } : {}),
  }
}

/** Le impostazioni intere da mandare, con la modifica dentro e il resto com'è. */
function daSalvare (modifiche: ModificheImpostazioni): ImpostazioniDaSalvare {
  const { intestazione: _intestazione, ...resto } = stato.registro.impostazioni
  return {
    ...resto,
    ...modifiche,
    scala: { ...stato.registro.impostazioni.scala, ...(modifiche.scala ?? {}) },
    intestazione: intestazioneDaSalvare(modifiche.intestazione),
  }
}

/** Salva una modifica puntuale delle impostazioni, senza toccare il resto. */
export async function salvaImpostazioni (modifiche: ModificheImpostazioni): Promise<void> {
  const impostazioni = daSalvare(modifiche)
  const risposta = await azione({ tipo: 'impostazioni.salva', impostazioni })
  if (!risposta.ok) return
  // Lo stato nuovo è già arrivato: il pannello lo spinge prima di rispondere
  // (`panels/panel.ts`), quindi `stato.registro` è quello appena salvato.
  const scarti = scostamenti(impostazioni, stato.registro.impostazioni)
  notifica(
    scarti.length === 0 ? testi().salvate : testi().salvateCorrette(scarti.join(', ')),
    scarti.length === 0 ? 'successo' : 'avviso',
  )
}

/**
 * Come `salvaImpostazioni`, per un campo disegnato con i controlli condivisi:
 * l'esito si dice accanto al campo. `null` salvato; il rifiuto dell'host, o
 * quel che ha raddrizzato, come motivo — e il campo si rifà con il valore vero.
 */
export async function salvaConEsito (modifiche: ModificheImpostazioni): Promise<Esito> {
  const impostazioni = daSalvare(modifiche)
  // `invia` e non `azione`: il rifiuto si legge accanto al campo, non in una notifica.
  const risposta = await invia({ tipo: 'impostazioni.salva', impostazioni })
  if (!risposta.ok) return risposta.errori?.join(' ') || testi().nonSalvata
  const scarti = scostamenti(impostazioni, stato.registro.impostazioni)
  return scarti.length === 0 ? null : testi().corretta(scarti.join(', '))
}

// ------------------------------------------------------------ la valutazione

/** Un numero della scala come lo si legge: «0,25», non «0.25». */
function detto (quanto: number): string {
  return numero(quanto, { maximumFractionDigits: 2 })
}

/** Le grane dei voti che si usano: decimi, quarti, mezzi, interi. */
const PASSI_VOTI = [0.1, 0.25, 0.5, 1] as const

/** L'arrotondamento della nota di fine semestre: niente, quarti, mezzi, interi. */
const PASSI_FINE_SEMESTRE = [0, 0.25, 0.5, 1] as const

/**
 * La scala dei voti, l'arrotondamento di fine semestre, la soglia di assenza.
 * In testa la scala detta in una riga; sotto le scelte di tutti i giorni; gli
 * estremi della scala, che si decidono una volta, fra le avanzate.
 */
export function schedaValutazione (): HTMLElement {
  const impostazioni = stato.registro.impostazioni
  const scala = impostazioni.scala
  // La scala al momento di salvare, non quella del disegno: due campi cambiati
  // di fila partono prima del ridisegno.
  const scalaViva = (): Impostazioni['scala'] => stato.registro.impostazioni.scala
  const t = testi()

  const passoVoti = voceAnno({
    nome: t.passoVoti,
    aiuto: t.passoVotiAiuto,
    voce: 'scalaPasso',
    controllo: campoAnno(() => ({
      tipo: 'segmenti',
      chiave: 'scalaPasso',
      nome: t.passoVoti,
      valore: stato.registro.impostazioni.scala.passo,
      scelte: PASSI_VOTI.map((passo) => ({ valore: passo, nome: detto(passo), aiuto: t.grane[passo] })),
    }), (valore) => salvaConEsito({ scala: { ...scalaViva(), passo: Number(valore) } })),
  })

  const sufficienza = voceAnno({
    nome: t.sufficienza,
    aiuto: t.sufficienzaAiuto,
    voce: 'scalaSufficienza',
    // Sulla scala, a passi dei voti: fuori non avrebbe senso, e l'host lo raddrizzerebbe.
    controllo: campoAnno(() => {
      const viva = stato.registro.impostazioni.scala
      return {
        tipo: 'cursore',
        chiave: 'scalaSufficienza',
        nome: t.sufficienza,
        valore: viva.sufficienza,
        minimo: viva.min,
        massimo: viva.max,
        passo: viva.passo,
      }
    }, (valore) => salvaConEsito({ scala: { ...scalaViva(), sufficienza: Number(valore) } })),
  })

  // Un passo suo, diverso da quello dei voti: la nota di pagella si arrotonda
  // (p. es. a mezzi) anche se i voti sono a quarti.
  const passoFine = voceAnno({
    nome: t.passoFineSemestre,
    aiuto: t.passoFineSemestreAiuto,
    voce: 'passoFineSemestre',
    controllo: campoAnno(() => ({
      tipo: 'segmenti',
      chiave: 'passoFineSemestre',
      nome: t.passoFineSemestre,
      valore: stato.registro.impostazioni.passoFineSemestre,
      scelte: PASSI_FINE_SEMESTRE.map((passo) => ({
        valore: passo,
        nome: passo === 0 ? parole().nessuno : detto(passo),
        aiuto: t.graneFine[passo],
      })),
    }), (valore) => salvaConEsito({ passoFineSemestre: Number(valore) })),
  })

  // La soglia oltre cui un'assenza diventa un caso da segnalare: la decide la scuola.
  const soglia = voceAnno({
    nome: t.sogliaAssenza,
    aiuto: t.sogliaAssenzaAiuto,
    voce: 'sogliaAssenza',
    controllo: campoAnno(() => ({
      tipo: 'numero',
      chiave: 'sogliaAssenza',
      nome: t.sogliaAssenza,
      valore: stato.registro.impostazioni.sogliaAssenza,
      minimo: 0,
      massimo: 100,
      unita: '%',
    }), (valore) => salvaConEsito({ sogliaAssenza: Number(valore) })),
  })

  // Gli estremi: il minimo sta sotto il massimo di almeno un passo, e viceversa.
  const estremo = (quale: 'min' | 'max'): HTMLElement => {
    const nome = quale === 'min' ? t.votoMinimo : t.votoMassimo
    // testo-fisso: nomi dei campi, non si leggono
    const chiave = quale === 'min' ? 'scalaMin' : 'scalaMax'
    return voceAnno({
      nome,
      voce: chiave,
      controllo: campoAnno(() => {
        const viva = stato.registro.impostazioni.scala
        return {
          tipo: 'numero',
          chiave,
          nome,
          valore: viva[quale],
          minimo: quale === 'min' ? 0 : viva.min + viva.passo,
          massimo: quale === 'min' ? viva.max - viva.passo : 100,
          passo: viva.passo,
        }
      }, (valore) => salvaConEsito({ scala: { ...scalaViva(), [quale]: Number(valore) } })),
    })
  }

  return scheda({
    titolo: t.scala,
    aiuto: t.scalaAiuto,
    classe: 'scheda--opzioni',
    contenuto: sezioneAnno({
      stato: h(
        'p',
        { class: 'voce-opzione__aiuto impostazioni-anno__stato' },
        t.scalaDetta(detto(scala.min), detto(scala.max), detto(scala.sufficienza), detto(scala.passo)),
      ),
      scelte: [
        // Il titolo della scheda dice già «Scala dei voti».
        gruppoAnno(null, passoVoti, sufficienza),
        gruppoAnno(t.fineSemestre, passoFine, soglia),
      ],
      avanzate: avanzateAnno('valutazione', [estremo('min'), estremo('max')]),
    }),
  })
}
