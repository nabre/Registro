// I materiali appesi a un piano lezione (collegamenti, file, immagini), per le
// finestre del piano, l'elenco e la scaletta. Chi disegna l'elenco decide solo
// che cosa mettere al sicuro prima di toccare i file e che cosa fare dopo; il
// resto è uguale ovunque.

import type { Risorsa } from '../../domain/models.js'
import { campo, collegamento, pulsante, quieto } from '../components/base.js'
import { icona } from '../components/icons.js'
import { suggerimento } from '../components/hint.js'
import { apriModale } from '../components/modal.js'
import { h } from '../dom.js'
import { notifica } from '../components/notifications.js'
import { azione } from '../bridge.js'
import { pianoPerId, uriDato } from '../state.js'
import { parole } from '../../domain/words.testi.js'

import { inviaDalModulo, salva, tastoElimina, testo } from './common.js'
import { testi } from './resources.testi.js'

/**
 * Dove si disegna l'elenco e che cosa può fare. `prima` mette il piano su disco
 * prima di toccare i file (se no l'host non saprebbe dove appendere la risorsa,
 * e il salvataggio dopo la cancellerebbe); falso, e non si aggiunge niente.
 */
interface OpzioniRisorse {
  pianoId: string
  attivitaId: string | null
  risorse: Risorsa[]
  /** Righe strette e pulsanti senza testo: dentro la scaletta lo spazio è poco. */
  compatto?: boolean
  prima?: () => Promise<boolean>
  dopo?: () => void
}

/**
 * Una risorsa in una riga: il simbolo dice che cos'è, il titolo la apre, la
 * matita la modifica. Un'immagine porta la sua miniatura.
 */
function rigaRisorsa (opzioni: OpzioniRisorse, risorsa: Risorsa): HTMLElement {
  const t = testi()
  const { pianoId, attivitaId } = opzioni
  const apri =() => void azione({ tipo: 'risorsa.apri', pianoId, attivitaId, risorsaId: risorsa.id })
  const indirizzo = risorsa.tipo === 'immagine' ? uriDato(risorsa.file) : null

  return h(
    'li',
    { class: `risorsa risorsa--${risorsa.tipo}` },
    indirizzo
      ? h('img', {
          class: 'risorsa__miniatura',
          attr: { src: indirizzo, alt: risorsa.titolo, loading: 'lazy' },
          onclick: apri,
        })
      : icona(risorsa.tipo === 'collegamento' ? 'collegamento' : 'documento', 'risorsa__simbolo'),
    h(
      'div',
      { class: 'risorsa__corpo' },
      collegamento({ testo: risorsa.titolo || parole().senzaTitolo, al: apri }),
      risorsa.note ? h('p', { class: 'risorsa__note' }, risorsa.note) : null,
      h(
        'span',
        { class: 'risorsa__origine' },
        risorsa.tipo === 'collegamento' ? risorsa.url ?? '' : risorsa.nome ?? risorsa.file ?? '',
      ),
    ),
    pulsante({
      simbolo: 'matita',
      variante: 'fantasma',
      titolo: t.modificaRisorsa,
      // Anche la matita passa da `prima`: le tappe fra cui spostare la risorsa sono
      // quelle che si stanno scrivendo.
      al: async () => {
        if (opzioni.prima && !(await opzioni.prima())) return
        moduloRisorsa(pianoId, attivitaId, risorsa, opzioni.dopo)
      },
    }),
  )
}

/**
 * Le risorse di un piano o di una sua attività, con i tre modi di aggiungerne:
 * un indirizzo si scrive, file e immagini si scelgono e si copiano nell'archivio.
 */
export function bloccoRisorse (opzioni: OpzioniRisorse): HTMLElement {
  const t = testi()
  const { pianoId, attivitaId, risorse, compatto = false } = opzioni

  const aggiungi = (genere: 'file' | 'immagine') => async () => {
    if (opzioni.prima && !(await opzioni.prima())) return
    const risposta = await azione({ tipo: 'risorsa.aggiungi', pianoId, attivitaId, genere })
    if (risposta.ok) opzioni.dopo?.()
  }

  const collegamento = async () => {
    if (opzioni.prima && !(await opzioni.prima())) return
    moduloCollegamento(pianoId, attivitaId, opzioni.dopo)
  }

  return h(
    'div',
    { class: ['risorse', compatto && 'risorse--compatte'] },
    risorse.length > 0
      ? h('ul', { class: 'risorse__elenco' }, ...risorse.map((r) => rigaRisorsa(opzioni, r)))
      : compatto
        ? null
        : quieto(t.nessunaRisorsa),
    h(
      'div',
      { class: 'risorse__azioni' },
      pulsante({
        testo: compatto ? undefined : t.collegamento,
        simbolo: 'collegamento',
        variante: 'fantasma',
        titolo: t.aggiungiCollegamento,
        al: () => void collegamento(),
      }),
      pulsante({
        testo: compatto ? undefined : t.file,
        simbolo: 'allegato',
        variante: 'fantasma',
        titolo: t.aggiungiFile,
        al: () => void aggiungi('file')(),
      }),
      pulsante({
        testo: compatto ? undefined : t.immagine,
        simbolo: 'immagine',
        variante: 'fantasma',
        titolo: t.aggiungiImmagine,
        al: () => void aggiungi('immagine')(),
      }),
    ),
  )
}

/**
 * Il collegamento da appendere, l'unico tipo che si scrive: file e immagini li
 * sceglie il dialogo dell'host.
 */
function moduloCollegamento (
  pianoId: string,
  attivitaId: string | null,
  dopo?: () => void,
): void {
  const t = testi()
  apriModale({
    titolo: t.nuovoCollegamento,
    sottotitolo: attivitaId ? t.appesoAllAttivita : t.delPianoIntero,
    larghezza: 'media',
    testoSalva: parole().aggiungi,
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'url',
          etichetta: parole().indirizzo,
          valore: '',
          segnaposto: 'https://…',
          richiesto: true,
          aiuto: t.aiutoIndirizzo,
        }),
        campo({
          nome: 'titolo',
          etichetta: parole().titolo,
          valore: '',
          segnaposto: t.segnapostoTitolo,
          aiuto: t.aiutoTitolo,
        }),
      ),
    alSalva: async (valori, contesto) => {
      await salva(
        contesto,
        {
          tipo: 'risorsa.aggiungi',
          pianoId,
          attivitaId,
          genere: 'collegamento',
          url: testo(valori.url),
          titolo: testo(valori.titolo),
        },
        t.collegamentoAggiunto,
        () => dopo?.(),
      )
    },
  })
}

/**
 * Un campo con sotto una riga in vista: un'avvertenza dietro la «i» non la
 * leggerebbe nessuno.
 */
function conNota (fatto: HTMLElement, nota: string): HTMLElement {
  fatto.append(h('small', { class: 'campo__aiuto' }, nota))
  return fatto
}

/**
 * Titolo, indirizzo, note e la tappa a cui è appesa. Il file non si cambia da
 * qui: se ne aggiunge un altro.
 */
function moduloRisorsa (
  pianoId: string,
  attivitaId: string | null,
  risorsa: Risorsa,
  dopo?: () => void,
): void {
  // Le tappe fra cui si può spostare; senza scaletta resta dov'è.
  const t = testi()
  const tappe = pianoPerId(pianoId)?.attivita ?? []
  const dove = [
    { valore: '', testo: t.pianoNelSuoInsieme },
    ...tappe.map((a, i) => ({ valore: a.id, testo: `${i + 1}. ${a.titolo || parole().senzaTitolo}` })),
  ]

  apriModale({
    titolo: t.risorsa(risorsa.titolo),
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'titolo',
          etichetta: parole().titolo,
          valore: risorsa.titolo,
          richiesto: true,
        }),
        // In vista e non dietro la «i»: spostando, il file nell'archivio cambia nome.
        tappe.length > 0
          ? conNota(
              campo({
                nome: 'appesaA',
                etichetta: t.appesaA,
                tipo: 'select',
                valore: attivitaId ?? '',
                opzioni: dove,
              }),
              t.spostandola,
            )
          : null,
        risorsa.tipo === 'collegamento'
          ? campo({
              nome: 'url',
              etichetta: parole().indirizzo,
              valore: risorsa.url ?? '',
              segnaposto: 'https://…',
              richiesto: true,
            })
          : h(
              'p',
              { class: 'testo-quieto' },
              t.fileDi(risorsa.nome ?? risorsa.file ?? '—'),
              suggerimento(t.perSostituirlo, { etichetta: t.file }),
            ),
        campo({
          nome: 'note',
          etichetta: parole().note,
          tipo: 'textarea',
          righe: 2,
          valore: risorsa.note ?? '',
          segnaposto: t.segnapostoNote,
        }),
      ),
    alSalva: async (valori, contesto) => {
      const aggiornata: Risorsa = {
        ...risorsa,
        titolo: testo(valori.titolo),
        url: risorsa.tipo === 'collegamento' ? testo(valori.url) : risorsa.url,
        note: testo(valori.note) || undefined,
      }

      // Prima si sposta, poi si scrive: il salvataggio cerca la riga dove sta adesso.
      const destinazione = tappe.length > 0 ? testo(valori.appesaA) || null : attivitaId
      if (destinazione !== attivitaId) {
        const risposta = await inviaDalModulo(contesto, {
          tipo: 'risorsa.sposta',
          pianoId,
          daAttivitaId: attivitaId,
          aAttivitaId: destinazione,
          risorsaId: risorsa.id,
        }, t.spostamentoNonRiuscito)
        if (!risposta) return
        notifica(
          destinazione
            ? t.spostataSu(dove.find((d) => d.valore === destinazione)?.testo ?? t.unAltraTappa)
            : t.spostataSulPiano,
          'info',
        )
      }

      await salva(
        contesto,
        { tipo: 'risorsa.salva', pianoId, attivitaId: destinazione, risorsa: aggiornata },
        t.aggiornata,
        () => dopo?.(),
      )
    },
    azioniSecondarie: (contesto) =>
      tastoElimina({
        contesto,
        chiedi: {
          titolo: t.eliminare(risorsa.titolo),
          testo: risorsa.tipo === 'collegamento' ? t.soloLaRiga : t.fileNelCestino,
          testoConferma: parole().elimina,
        },
        azione: { tipo: 'risorsa.elimina', pianoId, attivitaId, risorsaId: risorsa.id },
        fatto: t.eliminata,
        poi: () => dopo?.(),
      }),
  })
}
