// Il fascicolo del docente di classe: recapiti fissi e comunicazioni alle
// famiglie. I destinatari si scelgono per gruppi e gli indirizzi si ricavano
// all'invio, così una mail corretta vale anche per le bozze già scritte.

import { destinatariComunicazione, fileDellaConsegna } from '../../domain/communications.js'
import { consegneDocumento } from '../../domain/assignments.js'
import { formattaData, giornoDi } from '../../domain/dates.js'
import { Molti } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { parole } from '../../domain/words.testi.js'
import { creaComunicazione, creaRecapito } from '../../domain/factories.js'
import type { Classe, Comunicazione, Recapito } from '../../domain/models.js'
import { validaComunicazione, validaRecapito } from '../../domain/validation.js'
import { campo, pulsante, riga, sezioneModulo, valoriModulo } from '../components/base.js'
import { apriModale, conferma } from '../components/modal.js'
import { h } from '../dom.js'
import { invia } from '../bridge.js'
import { corsiDi, fascicoloDi, stato } from '../state.js'

import {
  campiRecapiti,
  inviaDalModulo,
  recapitiScelti,
  salva,
  tastoElimina,
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
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'etichetta',
          etichetta: t.etichetta,
          valore: base.etichetta,
          segnaposto: t.segnapostoEtichetta,
          richiesto: true,
        }),
        campo({
          nome: 'email',
          etichetta: t.indirizzo,
          tipo: 'email',
          valore: base.email,
          richiesto: true,
        }),
        campo({
          nome: 'predefinito',
          tipo: 'checkbox',
          etichetta: t.predefinito,
          valore: base.predefinito,
        }),
      ),
    alSalva: async (valori, contesto) => {
      const aggiornato: Recapito = {
        ...base,
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
        ? tastoElimina({
            contesto,
            chiedi: {
              titolo: t.eliminare(base.etichetta),
              testo: t.sparisceAnche,
              testoConferma: parole().elimina,
            },
            azione: { tipo: 'recapito.elimina', classeId: classe.id, recapitoId: base.id },
            fatto: t.tolto,
          })
        : null,
  })
}

/**
 * La comunicazione alla classe: destinatari per gruppi, e il conteggio degli
 * indirizzi visibile prima di spedire (chi non ha la mail si vede prima).
 */
export function moduloComunicazione (classe: Classe, comunicazione?: Comunicazione): void {
  const t = testi().comunicazione
  const L = lessico()
  const fascicolo = fascicoloDi(classe.id)
  const modifica = Boolean(comunicazione)
  const base = comunicazione ?? creaComunicazione(fascicolo)
  const inviata = base.stato === 'inviata'
  // Si allegano le raccolte «a me» che hanno già il file; quel che si aspetta
  // ancora non è un allegato.
  const daAllegare = consegneDocumento(stato.registro, corsiDi(classe.id)).filter(
    (c) => c.a === 'docente' && fileDellaConsegna(c) !== null,
  )

  const leggi = (valori: Record<string, string | number | boolean>): Comunicazione => ({
    ...base,
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
    corpo: () => {
      const conteggio = h('span', { class: 'testo-quieto' }, '')

      const elemento = h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'oggetto',
          etichetta: t.oggetto,
          valore: base.oggetto,
          richiesto: true,
          disabilitato: inviata,
        }),
        campo({
          nome: 'corpo',
          etichetta: t.testo,
          tipo: 'textarea',
          righe: 10,
          valore: base.corpo,
          richiesto: true,
          disabilitato: inviata,
          // La firma la mette chi spedisce, uguale per tutti: detto qui per non
          // ricopiarla nel corpo. A comunicazione spedita il consiglio tace.
          aiuto: inviata ? undefined : t.aiutoFirma,
        }),
        sezioneModulo(
          { testo: t.destinatari, aiuto: t.aiutoDestinatari },
          riga(
            campo({
              nome: 'aAllievi',
              tipo: 'checkbox',
              etichetta: Molti(L.pif),
              valore: base.aAllievi,
              disabilitato: inviata,
              larghezza: 'quarto',
            }),
            campo({
              nome: 'aTutori',
              tipo: 'checkbox',
              etichetta: Molti(L.rappresentante),
              valore: base.aTutori,
              disabilitato: inviata,
              larghezza: 'quarto',
            }),
            ...campiRecapiti(fascicolo, base.recapitiIds, inviata),
          ),
          h('p', { class: 'campo__aiuto' }, conteggio),
        ),
        daAllegare.length > 0
          ? sezioneModulo(
              Molti(L.allegato),
              riga(
                ...daAllegare.map((raccolta) =>
                  campo({
                    // testo-fisso: il nome del campo, lo rilegge `leggi` qui sopra
                    nome: `documento-${raccolta.id}`,
                    tipo: 'checkbox',
                    etichetta: raccolta.testo,
                    valore: base.documentiIds.includes(raccolta.id),
                    disabilitato: inviata,
                    larghezza: 'meta',
                  }),
                ),
              ),
            )
          : null,
        inviata
          ? h(
              'p',
              { class: 'testo-quieto' },
              t.spedita(
                formattaData(giornoDi(base.inviataIl) ?? '', 'lungo'),
                base.destinatari.length,
              ),
            )
          : null,
        base.errore ? h('p', { class: 'testo-errore' }, base.errore) : null,
      )

      // Un ascoltatore solo sul contenitore: si vede subito chi resta senza mail.
      const aggiornaConteggio = () => {
        const { indirizzi, senzaIndirizzo } = destinatariComunicazione(
          classe,
          fascicolo,
          leggi(valoriModulo(elemento)),
        )
        conteggio.textContent =
          t.indirizzi(indirizzi.length) +
          (senzaIndirizzo.length > 0 ? t.senzaEmail(senzaIndirizzo.join(', ')) : '')
      }
      elemento.addEventListener('change', aggiornaConteggio)
      aggiornaConteggio()

      return elemento
    },
    testoSalva: inviata ? parole().chiudi : t.salvaBozza,
    alSalva: async (valori, contesto) => {
      if (inviata) {
        contesto.chiudi()
        return
      }
      await salva(
        contesto,
        { tipo: 'comunicazione.salva', classeId: classe.id, comunicazione: leggi(valori) },
        t.bozzaSalvata,
      )
    },
    azioniSecondarie: (contesto) =>
      inviata
        ? // Una comunicazione partita non si disfa, ma la sua riga sì: che cosa
          // sparisce: il testo lo dice per intero.
          [
            tastoElimina({
              contesto,
              chiedi: {
                titolo: t.eliminareInviata,
                testo: t.sparisceLaTraccia,
                testoConferma: parole().elimina,
              },
              azione: {
                tipo: 'comunicazione.elimina',
                classeId: classe.id,
                comunicazioneId: base.id,
              },
              fatto: t.eliminataDalloStorico,
            }),
          ]
        : [
            pulsante({
              testo: t.salvaEApri,
              simbolo: 'posta',
              variante: 'primario',
              al: async () => {
                const aggiornata = leggi(valoriModulo(contesto.corpo))
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
                const salvata = await invia({
                  tipo: 'comunicazione.salva',
                  classeId: classe.id,
                  comunicazione: aggiornata,
                })
                if (!salvata.ok) {
                  contesto.occupato(false)
                  contesto.mostraErrori(salvata.errori ?? [])
                  return
                }
                const inviata = await inviaDalModulo(contesto, {
                  tipo: 'comunicazione.invia',
                  classeId: classe.id,
                  comunicazioneId: aggiornata.id,
                }, t.invioNonRiuscito)
                if (!inviata) return
                contesto.chiudi()
                // Quanti destinatari e da che casella lo dice l'host.
              },
            }),
            modifica
              ? tastoElimina({
                  contesto,
                  chiedi: {
                    titolo: t.eliminareBozza,
                    testo: t.sparisceDalloStorico,
                    testoConferma: parole().elimina,
                  },
                  azione: { tipo: 'comunicazione.elimina', classeId: classe.id, comunicazioneId: base.id },
                  fatto: t.bozzaEliminata,
                })
              : null,
          ],
  })
}


