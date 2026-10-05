// Il fascicolo del docente di classe: recapiti fissi e comunicazioni alle
// famiglie. I destinatari si scelgono per gruppi e gli indirizzi si ricavano
// all'invio, così una mail corretta vale anche per le bozze già scritte.

import { useLayoutEffect, useRef, useState, type ReactElement } from 'react'

import { destinatariComunicazione, fileDellaConsegna } from '#core/dominio/communications.js'
import { consegneDocumento } from '#core/dominio/assignments.js'
import { formattaData, giornoDi } from '#core/dominio/dates.js'
import { Molti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import { creaComunicazione, creaRecapito } from '#core/dominio/factories.js'
import type { Classe, Comunicazione, Consegna, Fascicolo, Recapito } from '#core/dominio/models.js'
import { validaComunicazione, validaRecapito } from '#core/dominio/validation.js'
import { Campo, Pulsante, Riga, SezioneModulo, valoriModulo } from '#ui/components/base.js'
import { apriModale, conferma } from '#ui/components/modal.js'
import { invia } from '#ui/bridge.js'
import { corsiDi, fascicoloDi, stato } from '#ui/state.js'

import {
  campiRecapiti,
  inviaDalModulo,
  recapitiScelti,
  salva,
  TastoElimina,
  testo,
} from './common.js'
import { testi } from './classTeacher.testi.js'

/** Un indirizzo fisso della classe: segreteria, capoclasse, sede. */
export function moduloRecapito (classe: Classe, recapito?: Recapito): void {
  const t = testi().recapito
  const modifica = Boolean(recapito)
  const base = recapito ?? creaRecapito('', '')

  apriModale({
    titolo: modifica ? t.modifica : t.nuovo,
    // Due campi e una casella: una modale media li stirerebbe su tutta la larghezza.
    larghezza: 'stretta',
    corpo: () => (
      <div className="modulo">
        <Campo
          nome="etichetta"
          etichetta={t.etichetta}
          valore={base.etichetta}
          segnaposto={t.segnapostoEtichetta}
          richiesto
        />
        <Campo
          nome="email"
          etichetta={t.indirizzo}
          tipo="email"
          valore={base.email}
          richiesto
        />
        <Campo
          nome="predefinito"
          tipo="checkbox"
          etichetta={t.predefinito}
          valore={base.predefinito}
        />
      </div>
    ),
    alSalva: async (valori, contesto) => {
      const sorgente = modifica
        ? fascicoloDi(classe.id).recapiti.find((r) => r.id === base.id) ?? base
        : base
      const aggiornato: Recapito = {
        ...sorgente,
        etichetta: testo(valori.etichetta),
        email: testo(valori.email),
        predefinito: Boolean(valori.predefinito),
      }
      const esito = validaRecapito(aggiornato)
      if (!esito.valido) {
        contesto.mostraErrori(esito.errori)
        return
      }
      await salva(
        contesto,
        { tipo: 'recapito.salva', classeId: classe.id, recapito: aggiornato },
        modifica ? t.aggiornato : t.aggiunto,
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? (
            <TastoElimina
              contesto={contesto}
              chiedi={{
                titolo: t.eliminare(base.etichetta),
                testo: t.sparisceAnche,
                testoConferma: parole().elimina,
              }}
              azione={{ tipo: 'recapito.elimina', classeId: classe.id, recapitoId: base.id }}
              fatto={t.tolto}
            />
          )
        : null,
  })
}

type LeggiComunicazione = (
  valori: Record<string, string | number | boolean>,
  sorgente?: Comunicazione,
) => Comunicazione

/** Il modulo della comunicazione, col conteggio degli indirizzi che segue le spunte. */
function CorpoComunicazione ({ classe, fascicolo, base, daAllegare, leggi }: {
  classe: Classe
  fascicolo: Fascicolo
  base: Comunicazione
  daAllegare: Consegna[]
  leggi: LeggiComunicazione
}): ReactElement {
  const t = testi().comunicazione
  const L = lessico()
  const inviata = base.stato === 'inviata'
  const elemento = useRef<HTMLDivElement | null>(null)
  const [conteggio, impostaConteggio] = useState('')

  // Un ascoltatore solo sul contenitore, al `change` del browser: si vede subito
  // chi resta senza mail.
  useLayoutEffect(() => {
    const nodo = elemento.current
    if (!nodo) return
    const aggiornaConteggio = () => {
      const tc = testi().comunicazione
      const { indirizzi, senzaIndirizzo } = destinatariComunicazione(
        classe,
        fascicolo,
        leggi(valoriModulo(nodo)),
      )
      impostaConteggio(
        tc.indirizzi(indirizzi.length) +
        (senzaIndirizzo.length > 0 ? tc.senzaEmail(senzaIndirizzo.join(', ')) : ''),
      )
    }
    nodo.addEventListener('change', aggiornaConteggio)
    aggiornaConteggio()
    return () => nodo.removeEventListener('change', aggiornaConteggio)
  }, [classe, fascicolo, leggi])

  return (
    <div ref={elemento} className="modulo">
      <Campo
        nome="oggetto"
        etichetta={t.oggetto}
        valore={base.oggetto}
        richiesto
        disabilitato={inviata}
      />
      {/* La firma la mette chi spedisce, uguale per tutti: detto qui per non
          ricopiarla nel corpo. A comunicazione spedita il consiglio tace. */}
      <Campo
        nome="corpo"
        etichetta={t.testo}
        tipo="textarea"
        righe={10}
        valore={base.corpo}
        richiesto
        disabilitato={inviata}
        aiuto={inviata ? undefined : t.aiutoFirma}
      />
      <SezioneModulo titolo={{ testo: t.destinatari, aiuto: t.aiutoDestinatari }}>
        <Riga>
          <Campo
            nome="aAllievi"
            tipo="checkbox"
            etichetta={Molti(L.pif)}
            valore={base.aAllievi}
            disabilitato={inviata}
            larghezza="quarto"
          />
          <Campo
            nome="aTutori"
            tipo="checkbox"
            etichetta={Molti(L.rappresentante)}
            valore={base.aTutori}
            disabilitato={inviata}
            larghezza="quarto"
          />
          {campiRecapiti(fascicolo, base.recapitiIds, inviata)}
        </Riga>
        <p className="campo__aiuto"><span className="testo-quieto">{conteggio}</span></p>
      </SezioneModulo>
      {daAllegare.length > 0
        ? (
            <SezioneModulo titolo={Molti(L.allegato)}>
              <Riga>
                {daAllegare.map((raccolta) => (
                  <Campo
                    key={raccolta.id}
                    // testo-fisso: il nome del campo, lo rilegge `leggi` del modulo
                    nome={`documento-${raccolta.id}`}
                    tipo="checkbox"
                    etichetta={raccolta.testo}
                    valore={base.documentiIds.includes(raccolta.id)}
                    disabilitato={inviata}
                    larghezza="meta"
                  />
                ))}
              </Riga>
            </SezioneModulo>
          )
        : null}
      {inviata
        ? (
            <p className="testo-quieto">
              {t.spedita(
                formattaData(giornoDi(base.inviataIl) ?? '', 'lungo'),
                base.destinatari.length,
              )}
            </p>
          )
        : null}
      {base.errore ? <p className="testo-errore">{base.errore}</p> : null}
    </div>
  )
}

/**
 * La comunicazione alla classe: destinatari per gruppi, e il conteggio degli
 * indirizzi visibile prima di spedire (chi non ha la mail si vede prima).
 */
export function moduloComunicazione (classe: Classe, comunicazione?: Comunicazione): void {
  const t = testi().comunicazione
  const fascicolo = fascicoloDi(classe.id)
  const modifica = Boolean(comunicazione)
  const base = comunicazione ?? creaComunicazione(fascicolo)
  const inviata = base.stato === 'inviata'
  // Si allegano le raccolte «a me» che hanno già il file; quel che si aspetta
  // ancora non è un allegato.
  const daAllegare = consegneDocumento(stato.registro, corsiDi(classe.id)).filter(
    (c) => c.a === 'docente' && fileDellaConsegna(c) !== null,
  )

  const leggi: LeggiComunicazione = (valori, sorgente = base) => ({
    ...sorgente,
    oggetto: testo(valori.oggetto),
    corpo: String(valori.corpo ?? ''),
    aAllievi: Boolean(valori.aAllievi),
    aTutori: Boolean(valori.aTutori),
    recapitiIds: recapitiScelti(fascicolo, valori),
    documentiIds: daAllegare
      .filter((c) => Boolean(valori[`documento-${c.id}`]))
      .map((c) => c.id),
  })

  apriModale({
    titolo: inviata ? t.inviata : modifica ? t.modifica : t.nuova,
    sottotitolo: classe.nome,
    larghezza: 'larga',
    corpo: () => (
      <CorpoComunicazione
        classe={classe}
        fascicolo={fascicolo}
        base={base}
        daAllegare={daAllegare}
        leggi={leggi}
      />
    ),
    testoSalva: inviata ? parole().chiudi : t.salvaBozza,
    alSalva: async (valori, contesto) => {
      if (inviata) {
        contesto.chiudi()
        return
      }
      const sorgente = modifica
        ? fascicoloDi(classe.id).comunicazioni.find((c) => c.id === base.id) ?? base
        : base
      await salva(
        contesto,
        { tipo: 'comunicazione.salva', classeId: classe.id, comunicazione: leggi(valori, sorgente) },
        t.bozzaSalvata,
      )
    },
    azioniSecondarie: (contesto) =>
      inviata
        ? (
            // Una comunicazione partita non si disfa, ma la sua riga sì: che cosa
            // sparisce, il testo lo dice per intero.
            <TastoElimina
              contesto={contesto}
              chiedi={{
                titolo: t.eliminareInviata,
                testo: t.sparisceLaTraccia,
                testoConferma: parole().elimina,
              }}
              azione={{
                tipo: 'comunicazione.elimina',
                classeId: classe.id,
                comunicazioneId: base.id,
              }}
              fatto={t.eliminataDalloStorico}
            />
          )
        : (
            <>
              <Pulsante
                testo={t.salvaEApri}
                simbolo="posta"
                variante="primario"
                al={async () => {
                  const sorgente = modifica
                    ? fascicoloDi(classe.id).comunicazioni.find((c) => c.id === base.id) ?? base
                    : base
                  const aggiornata = leggi(valoriModulo(contesto.corpo), sorgente)
                  const esito = validaComunicazione(aggiornata)
                  if (!esito.valido) {
                    contesto.mostraErrori(esito.errori)
                    return
                  }
                  const { indirizzi } = destinatariComunicazione(classe, fascicolo, aggiornata)
                  const sicuro = await conferma({
                    titolo: t.preparare(indirizzi.length),
                    testo: t.siApreNellaPosta,
                    testoConferma: t.prepara,
                  })
                  if (!sicuro) return
                  contesto.occupato(true)
                  let salvata
                  try {
                    salvata = await invia({
                      tipo: 'comunicazione.salva',
                      classeId: classe.id,
                      comunicazione: aggiornata,
                    })
                  } finally {
                    contesto.occupato(false)
                  }
                  // Chiusa mentre salvava: la bozza resta, ma non si spedisce.
                  if (!contesto.aperta()) return
                  if (!salvata.ok) {
                    contesto.mostraErrori(salvata.errori ?? [])
                    return
                  }
                  const spedita = await inviaDalModulo(contesto, {
                    tipo: 'comunicazione.invia',
                    classeId: classe.id,
                    comunicazioneId: aggiornata.id,
                  }, t.invioNonRiuscito)
                  if (!spedita) return
                  contesto.chiudi()
                  // Quanti destinatari e da che casella lo dice l'host.
                }}
              />
              {modifica
                ? (
                    <TastoElimina
                      contesto={contesto}
                      chiedi={{
                        titolo: t.eliminareBozza,
                        testo: t.sparisceDalloStorico,
                        testoConferma: parole().elimina,
                      }}
                      azione={{ tipo: 'comunicazione.elimina', classeId: classe.id, comunicazioneId: base.id }}
                      fatto={t.bozzaEliminata}
                    />
                  )
                : null}
            </>
          ),
  })
}
