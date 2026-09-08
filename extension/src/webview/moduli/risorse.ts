// I materiali appesi a un piano lezione: collegamenti, file, immagini.
//
// Stavano dentro `moduli/piano.ts` per le due finestre e dentro `viste/piani.ts`
// per l'elenco. Sono la stessa cosa vista da due parti — e da quando si allega
// anche mentre si scrive il piano, da tre — e tre copie dello stesso elenco
// erano tre occasioni di farlo comportare in tre modi diversi.
//
// Chi disegna l'elenco decide soltanto due cose: se c'è qualcosa da mettere al
// sicuro prima di toccare i file, e che cosa fare quando l'elenco è cambiato.
// Il resto — il simbolo, la miniatura, l'apertura — è uguale ovunque, perché
// la risorsa è la stessa.

import type { Risorsa } from '../../dominio/modelli.js'
import { campo, pulsante } from '../componenti/base.js'
import { icona } from '../componenti/icone.js'
import { apriModale } from '../componenti/modale.js'
import { h } from '../dom.js'
import { notifica } from '../componenti/notifiche.js'
import { azione, invia } from '../ponte.js'
import { pianoPerId, uriDato } from '../stato.js'

import { salva, tastoElimina, testo } from './comune.js'

/**
 * Dove si sta disegnando l'elenco, e che cosa può fare.
 *
 * `prima` è la promessa che l'editor fa prima di toccare i file: il piano che
 * si sta scrivendo dev'essere già sul disco, o l'host non saprebbe a quale
 * piano appendere la risorsa e il salvataggio successivo la cancellerebbe.
 * Torna false se non ci è riuscito, e allora non si aggiunge niente.
 */
export interface OpzioniRisorse {
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
 * matita la modifica. Un'immagine porta con sé la sua miniatura — se non si
 * vede, un elenco di nomi di file non aiuta a ritrovarla.
 */
function rigaRisorsa (opzioni: OpzioniRisorse, risorsa: Risorsa): HTMLElement {
  const { pianoId, attivitaId } = opzioni
  const apri = () => void azione({ tipo: 'risorsa.apri', pianoId, attivitaId, risorsaId: risorsa.id })
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
      h(
        'button',
        { class: 'collegamento', type: 'button', onclick: apri },
        risorsa.titolo || 'senza titolo',
      ),
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
      titolo: 'Modifica la risorsa',
      // Anche la matita passa da `prima`: da lì si sposta la risorsa su
      // un'altra tappa, e l'elenco delle tappe fra cui scegliere dev'essere
      // quello che si sta scrivendo, non quello dell'ultimo salvataggio.
      al: async () => {
        if (opzioni.prima && !(await opzioni.prima())) return
        moduloRisorsa(pianoId, attivitaId, risorsa, opzioni.dopo)
      },
    }),
  )
}

/**
 * Le risorse di un piano o di una sua attività, con i tre modi di aggiungerne:
 * un indirizzo si scrive, un file e un'immagine si scelgono da disco e vengono
 * copiati nell'archivio del registro, accanto agli altri documenti del corso.
 */
export function bloccoRisorse (opzioni: OpzioniRisorse): HTMLElement {
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
        : h('p', { class: 'testo-quieto' }, 'Nessuna risorsa: si aggiungono qui accanto.'),
    h(
      'div',
      { class: 'risorse__azioni' },
      pulsante({
        testo: compatto ? undefined : 'Collegamento',
        simbolo: 'collegamento',
        variante: 'fantasma',
        titolo: 'Aggiungi un collegamento',
        al: () => void collegamento(),
      }),
      pulsante({
        testo: compatto ? undefined : 'File',
        simbolo: 'allegato',
        variante: 'fantasma',
        titolo: 'Aggiungi un file dalla cartella',
        al: () => void aggiungi('file')(),
      }),
      pulsante({
        testo: compatto ? undefined : 'Immagine',
        simbolo: 'immagine',
        variante: 'fantasma',
        titolo: 'Aggiungi un’immagine',
        al: () => void aggiungi('immagine')(),
      }),
    ),
  )
}

/**
 * Il collegamento da appendere a un piano o a una sua attività. È l'unico tipo
 * di risorsa che si scrive: file e immagini si scelgono da disco, e per quelli
 * il dialogo lo apre l'host.
 */
export function moduloCollegamento (
  pianoId: string,
  attivitaId: string | null,
  dopo?: () => void,
): void {
  apriModale({
    titolo: 'Nuovo collegamento',
    sottotitolo: attivitaId ? 'appeso a questa attività' : 'del piano nel suo insieme',
    larghezza: 'stretta',
    testoSalva: 'Aggiungi',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'url',
          etichetta: 'Indirizzo',
          valore: '',
          segnaposto: 'https://…',
          richiesto: true,
          aiuto: 'Solo http e https: un piano è un documento, e da un documento si aprono pagine.',
        }),
        campo({
          nome: 'titolo',
          etichetta: 'Titolo',
          valore: '',
          segnaposto: 'come lo si chiama nell’elenco',
          aiuto: 'Se resta vuoto vale l’indirizzo.',
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
        'Collegamento aggiunto.',
        () => dopo?.(),
      )
    },
  })
}

/**
 * Titolo, indirizzo, note — e a quale tappa è appesa. Il file non si cambia da
 * qui: lo si sostituisce aggiungendone un altro.
 */
export function moduloRisorsa (
  pianoId: string,
  attivitaId: string | null,
  risorsa: Risorsa,
  dopo?: () => void,
): void {
  // Le tappe fra cui si può spostare. Un piano senza scaletta non ha niente da
  // chiedere: la risorsa può stare solo dov'è.
  const tappe = pianoPerId(pianoId)?.attivita ?? []
  const dove = [
    { valore: '', testo: 'Il piano nel suo insieme' },
    ...tappe.map((a, i) => ({ valore: a.id, testo: `${i + 1}. ${a.titolo || 'senza titolo'}` })),
  ]

  apriModale({
    titolo: `Risorsa ${risorsa.titolo}`,
    larghezza: 'stretta',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({ nome: 'titolo', etichetta: 'Titolo', valore: risorsa.titolo, richiesto: true }),
        tappe.length > 0
          ? campo({
              nome: 'appesaA',
              etichetta: 'Appesa a',
              tipo: 'select',
              valore: attivitaId ?? '',
              opzioni: dove,
              aiuto:
                'Spostandola cambia anche il nome del file nell’archivio, che dice a ' +
                'quale tappa appartiene.',
            })
          : null,
        risorsa.tipo === 'collegamento'
          ? campo({
              nome: 'url',
              etichetta: 'Indirizzo',
              valore: risorsa.url ?? '',
              segnaposto: 'https://…',
              richiesto: true,
            })
          : h(
              'p',
              { class: 'testo-quieto' },
              `File: ${risorsa.nome ?? risorsa.file ?? '—'}. Per sostituirlo se ne aggiunge un altro.`,
            ),
        campo({
          nome: 'note',
          etichetta: 'Note',
          tipo: 'textarea',
          righe: 2,
          valore: risorsa.note ?? '',
          segnaposto: 'a che cosa serve, quando usarla',
        }),
      ),
    alSalva: async (valori, contesto) => {
      const aggiornata: Risorsa = {
        ...risorsa,
        titolo: testo(valori.titolo),
        url: risorsa.tipo === 'collegamento' ? testo(valori.url) : risorsa.url,
        note: testo(valori.note) || undefined,
      }

      // Prima si sposta, poi si scrive: il salvataggio deve arrivare dove la
      // risorsa sta adesso, o cercherebbe la riga nella tappa che ha lasciato.
      const destinazione = tappe.length > 0 ? testo(valori.appesaA) || null : attivitaId
      if (destinazione !== attivitaId) {
        contesto.occupato(true)
        const risposta = await invia({
          tipo: 'risorsa.sposta',
          pianoId,
          daAttivitaId: attivitaId,
          aAttivitaId: destinazione,
          risorsaId: risorsa.id,
        })
        contesto.occupato(false)
        if (!risposta.ok) {
          contesto.mostraErrori(risposta.errori ?? ['Spostamento non riuscito.'])
          return
        }
        notifica(
          destinazione
            ? `Risorsa spostata su «${dove.find((d) => d.valore === destinazione)?.testo ?? 'un’altra tappa'}».`
            : 'Risorsa spostata sul piano nel suo insieme.',
          'info',
        )
      }

      await salva(
        contesto,
        { tipo: 'risorsa.salva', pianoId, attivitaId: destinazione, risorsa: aggiornata },
        'Risorsa aggiornata.',
        () => dopo?.(),
      )
    },
    azioniSecondarie: (contesto) =>
      tastoElimina({
        contesto,
        chiedi: {
          titolo: `Eliminare «${risorsa.titolo}»?`,
          testo:
            risorsa.tipo === 'collegamento'
              ? 'Sparisce solo la riga: la pagina resta dov’è.'
              : 'Il file esce anche dall’archivio del registro, nel cestino.',
          testoConferma: 'Elimina',
        },
        azione: { tipo: 'risorsa.elimina', pianoId, attivitaId, risorsaId: risorsa.id },
        fatto: 'Risorsa eliminata.',
        poi: () => dopo?.(),
      }),
  })
}
