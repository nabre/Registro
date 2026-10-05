// I materiali appesi a un piano lezione (collegamenti, file, immagini), per le
// finestre del piano, l'elenco e la scaletta. Chi disegna l'elenco decide solo
// che cosa mettere al sicuro prima di toccare i file e che cosa fare dopo; il
// resto è uguale ovunque.

import type { Risorsa } from '#core/dominio/models.js'
import type { ReactElement } from 'react'

import { Campo, Collegamento, Pulsante, Quieto } from '#ui/components/base.js'
import { Icona } from '#ui/components/icons.js'
import { Suggerimento } from '#ui/components/hint.js'
import { apriModale } from '#ui/components/modal.js'
import { notifica } from '#ui/components/notifications.js'
import { azione } from '#ui/bridge.js'
import { pianoPerId, uriDato } from '#ui/state.js'
import { parole } from '#core/dominio/words.testi.js'

import { inviaDalModulo, salva, TastoElimina, testo } from './common.js'
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
  prima?: () => Promise<boolean>
  dopo?: () => void
}

/**
 * Una risorsa in una riga: il simbolo dice che cos'è, il titolo la apre, la
 * matita la modifica. Un'immagine porta la sua miniatura.
 */
function RigaRisorsa ({ opzioni, risorsa }: { opzioni: OpzioniRisorse, risorsa: Risorsa }): ReactElement {
  const t = testi()
  const { pianoId, attivitaId } = opzioni
  const apri = () => void azione({ tipo: 'risorsa.apri', pianoId, attivitaId, risorsaId: risorsa.id })
  const indirizzo = risorsa.tipo === 'immagine' ? uriDato(risorsa.file) : null

  return (
    <li className={`risorsa risorsa--${risorsa.tipo}`}>
      {indirizzo
        ? (
            <img
              className="risorsa__miniatura"
              src={indirizzo}
              alt={risorsa.titolo}
              loading="lazy"
              onClick={apri}
            />
          )
        : <Icona nome={risorsa.tipo === 'collegamento' ? 'collegamento' : 'documento'} classe="risorsa__simbolo" />}
      <div className="risorsa__corpo">
        <Collegamento testo={risorsa.titolo || parole().senzaTitolo} al={apri} />
        {risorsa.note ? <p className="risorsa__note">{risorsa.note}</p> : null}
        <span className="risorsa__origine">
          {risorsa.tipo === 'collegamento' ? risorsa.url ?? '' : risorsa.nome ?? risorsa.file ?? ''}
        </span>
      </div>
      <Pulsante
        simbolo="matita"
        variante="fantasma"
        titolo={t.modificaRisorsa}
        // Anche la matita passa da `prima`: le tappe fra cui spostare la risorsa sono
        // quelle che si stanno scrivendo.
        al={async () => {
          if (opzioni.prima && !(await opzioni.prima())) return
          moduloRisorsa(pianoId, attivitaId, risorsa, opzioni.dopo)
        }}
      />
    </li>
  )
}

/**
 * Le risorse di un piano o di una sua attività, con i tre modi di aggiungerne:
 * un indirizzo si scrive, file e immagini si scelgono e si copiano nell'archivio.
 */
export function BloccoRisorse (opzioni: OpzioniRisorse): ReactElement {
  const t = testi()
  const { pianoId, attivitaId, risorse } = opzioni

  const aggiungi = (genere: 'file' | 'immagine') => async () => {
    if (opzioni.prima && !(await opzioni.prima())) return
    const risposta = await azione({ tipo: 'risorsa.aggiungi', pianoId, attivitaId, genere })
    if (risposta.ok) opzioni.dopo?.()
  }

  const collegamento = async () => {
    if (opzioni.prima && !(await opzioni.prima())) return
    moduloCollegamento(pianoId, attivitaId, opzioni.dopo)
  }

  return (
    <div className="risorse">
      {risorse.length > 0
        ? (
            <ul className="risorse__elenco">
              {risorse.map((r) => <RigaRisorsa key={r.id} opzioni={opzioni} risorsa={r} />)}
            </ul>
          )
        : <Quieto>{t.nessunaRisorsa}</Quieto>}
      <div className="risorse__azioni">
        <Pulsante
          testo={t.collegamento}
          simbolo="collegamento"
          variante="fantasma"
          titolo={t.aggiungiCollegamento}
          al={() => void collegamento()}
        />
        <Pulsante
          testo={t.file}
          simbolo="allegato"
          variante="fantasma"
          titolo={t.aggiungiFile}
          al={() => void aggiungi('file')()}
        />
        <Pulsante
          testo={t.immagine}
          simbolo="immagine"
          variante="fantasma"
          titolo={t.aggiungiImmagine}
          al={() => void aggiungi('immagine')()}
        />
      </div>
    </div>
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
    corpo: () => (
      <div className="modulo">
        <Campo
          nome="url"
          etichetta={parole().indirizzo}
          valore=""
          segnaposto="https://…"
          richiesto
          aiuto={t.aiutoIndirizzo}
        />
        <Campo
          nome="titolo"
          etichetta={parole().titolo}
          valore=""
          segnaposto={t.segnapostoTitolo}
          aiuto={t.aiutoTitolo}
        />
      </div>
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
    corpo: () => (
      <div className="modulo">
        <Campo nome="titolo" etichetta={parole().titolo} valore={risorsa.titolo} richiesto />
        {/* In vista e non dietro la «i»: spostando, il file nell'archivio cambia nome. */}
        {tappe.length > 0
          ? (
              <Campo
                nome="appesaA"
                etichetta={t.appesaA}
                tipo="select"
                valore={attivitaId ?? ''}
                opzioni={dove}
                sotto={<small className="campo__aiuto">{t.spostandola}</small>}
              />
            )
          : null}
        {risorsa.tipo === 'collegamento'
          ? (
              <Campo
                nome="url"
                etichetta={parole().indirizzo}
                valore={risorsa.url ?? ''}
                segnaposto="https://…"
                richiesto
              />
            )
          : (
              <p className="testo-quieto">
                {t.fileDi(risorsa.nome ?? risorsa.file ?? '—')}
                <Suggerimento testo={t.perSostituirlo} etichetta={t.file} />
              </p>
            )}
        <Campo
          nome="note"
          etichetta={parole().note}
          tipo="textarea"
          righe={2}
          valore={risorsa.note ?? ''}
          segnaposto={t.segnapostoNote}
        />
      </div>
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
    azioniSecondarie: (contesto) => (
      <TastoElimina
        contesto={contesto}
        chiedi={{
          titolo: t.eliminare(risorsa.titolo),
          testo: risorsa.tipo === 'collegamento' ? t.soloLaRiga : t.fileNelCestino,
          testoConferma: parole().elimina,
        }}
        azione={{ tipo: 'risorsa.elimina', pianoId, attivitaId, risorsaId: risorsa.id }}
        fatto={t.eliminata}
        poi={() => dopo?.()}
      />
    ),
  })
}
