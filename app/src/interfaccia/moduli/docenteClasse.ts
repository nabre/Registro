// Il fascicolo del docente di classe: recapiti fissi e comunicazioni alle
// famiglie.
//
// I destinatari non si scrivono a mano: si dice a quali gruppi va, e gli
// indirizzi si ricavano al momento dell'invio — così una mail corretta a metà
// anno vale anche per le bozze scritte a settembre.

import { destinatariComunicazione, fileDellaConsegna } from '../../dominio/comunicazioni.js'
import { consegneDocumento } from '../../dominio/consegne.js'
import { formattaData } from '../../dominio/date.js'
import { PIF, Molti } from '../../dominio/lessico.js'
import { creaComunicazione, creaRecapito } from '../../dominio/fabbriche.js'
import type { Classe, Comunicazione, Recapito } from '../../dominio/modelli.js'
import { validaComunicazione, validaRecapito } from '../../dominio/validazione.js'
import { campo, pulsante, riga, sezioneModulo, valoriModulo } from '../componenti/base.js'
import { apriModale, conferma } from '../componenti/modale.js'
import { h } from '../dom.js'
import { invia } from '../ponte.js'
import { corsiDi, fascicoloDi, stato } from '../stato.js'

import { campiRecapiti, recapitiScelti, salva, tastoElimina, testo } from './comune.js'

/** Un indirizzo fisso della classe: segreteria, capoclasse, sede. */
export function moduloRecapito (classe: Classe, recapito?: Recapito): void {
  const modifica = Boolean(recapito)
  const base = recapito ?? creaRecapito('', '')

  apriModale({
    titolo: modifica ? 'Modifica recapito' : 'Nuovo recapito',
    larghezza: 'stretta',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'etichetta',
          etichetta: 'Etichetta',
          valore: base.etichetta,
          segnaposto: 'Segreteria',
          richiesto: true,
        }),
        campo({
          nome: 'email',
          etichetta: 'Indirizzo',
          tipo: 'email',
          valore: base.email,
          richiesto: true,
        }),
        campo({
          nome: 'predefinito',
          tipo: 'checkbox',
          etichetta: 'In copia a ogni comunicazione nuova',
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
        modifica ? 'Recapito aggiornato.' : 'Recapito aggiunto.',
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? tastoElimina({
            contesto,
            chiedi: {
              titolo: `Eliminare «${base.etichetta}»?`,
              testo: 'Sparisce anche dalle comunicazioni che lo tenevano in copia.',
              testoConferma: 'Elimina',
            },
            azione: { tipo: 'recapito.elimina', classeId: classe.id, recapitoId: base.id },
            fatto: 'Recapito tolto.',
          })
        : null,
  })
}

/**
 * La comunicazione alla classe. I destinatari si scelgono per gruppi e il
 * conteggio degli indirizzi si vede prima di spedire: è l'unico modo di
 * accorgersi che metà classe non ha la mail, prima e non dopo.
 */
export function moduloComunicazione (classe: Classe, comunicazione?: Comunicazione): void {
  const fascicolo = fascicoloDi(classe.id)
  const modifica = Boolean(comunicazione)
  const base = comunicazione ?? creaComunicazione(fascicolo)
  const inviata = base.stato === 'inviata'
  // Quel che si può allegare: le raccolte «a me» che hanno già il file — un
  // modulo scaricato, la circolare ricevuta. Quel che si aspetta ancora non è
  // un allegato, è una cosa da fare.
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
    titolo: inviata ? 'Comunicazione inviata' : modifica ? 'Modifica comunicazione' : 'Nuova comunicazione',
    sottotitolo: classe.nome,
    larghezza: 'larga',
    corpo: () => {
      const conteggio = h('span', { class: 'testo-quieto' }, '')

      const elemento = h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'oggetto',
          etichetta: 'Oggetto',
          valore: base.oggetto,
          richiesto: true,
          disabilitato: inviata,
        }),
        campo({
          nome: 'corpo',
          etichetta: 'Testo',
          tipo: 'textarea',
          righe: 10,
          valore: base.corpo,
          richiesto: true,
          disabilitato: inviata,
        }),
        sezioneModulo(
          'Destinatari',
          riga(
            campo({
              nome: 'aAllievi',
              tipo: 'checkbox',
              etichetta: Molti(PIF),
              valore: base.aAllievi,
              disabilitato: inviata,
              larghezza: 'quarto',
            }),
            campo({
              nome: 'aTutori',
              tipo: 'checkbox',
              etichetta: 'Tutori',
              valore: base.aTutori,
              disabilitato: inviata,
              larghezza: 'quarto',
            }),
            ...campiRecapiti(fascicolo, base.recapitiIds, inviata),
          ),
          h('p', { class: 'campo__aiuto' }, conteggio),
          h(
            'p',
            { class: 'campo__aiuto' },
            'Gli indirizzi vanno in copia nascosta: nessuno vede la lista degli altri.',
          ),
        ),
        daAllegare.length > 0
          ? sezioneModulo(
              'Allegati',
              riga(
                ...daAllegare.map((raccolta) =>
                  campo({
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
              `Spedita il ${formattaData(base.inviataIl?.slice(0, 10) ?? '', 'lungo')} a ${base.destinatari.length} indirizzi.`,
            )
          : null,
        // La firma non si scrive qui: la mette chi spedisce, uguale per tutti i
        // messaggi. Dirlo evita di ricopiarla in fondo al corpo e ritrovarsela
        // due volte nella mail che arriva.
        !inviata
          ? h(
              'p',
              { class: 'testo-quieto' },
              'La firma non va scritta qui: nella bozza aperta nel programma di posta la mette ' +
                'lui; quando spedisce il registro, in fondo va quella di templates/_firma.html.',
            )
          : null,
        base.errore ? h('p', { class: 'testo-errore' }, base.errore) : null,
      )

      // Un ascoltatore solo sul contenitore, invece di uno per campo: si vede
      // subito chi resta senza mail, spuntando allievi, tutori o un recapito.
      const aggiornaConteggio = () => {
        const { indirizzi, senzaIndirizzo } = destinatariComunicazione(
          classe,
          fascicolo,
          leggi(valoriModulo(elemento)),
        )
        conteggio.textContent =
          `${indirizzi.length} indirizzi` +
          (senzaIndirizzo.length > 0 ? ` · senza e-mail: ${senzaIndirizzo.join(', ')}` : '')
      }
      elemento.addEventListener('change', aggiornaConteggio)
      aggiornaConteggio()

      return elemento
    },
    testoSalva: inviata ? 'Chiudi' : 'Salva bozza',
    alSalva: async (valori, contesto) => {
      if (inviata) {
        contesto.chiudi()
        return
      }
      await salva(
        contesto,
        { tipo: 'comunicazione.salva', classeId: classe.id, comunicazione: leggi(valori) },
        'Bozza salvata.',
      )
    },
    azioniSecondarie: (contesto) =>
      inviata
        ? // Una comunicazione partita non si disfa, ma la sua riga qui sì: il
          // registro non guarda più dentro la casella — prepara la bozza e
          // basta — e quindi non ha niente da opporre a chi vuole togliere una
          // traccia che considera vecchia. Il testo dice per intero che cosa
          // sparisce, ed è quello a fare da freno.
          [
            tastoElimina({
              contesto,
              chiedi: {
                titolo: 'Eliminare la comunicazione inviata?',
                testo:
                  'Qui sparisce la sua traccia: quando è andata, a chi, e che cosa diceva. ' +
                  'L’e-mail spedita resta nella casella di posta, dove è stata mandata.',
                testoConferma: 'Elimina',
              },
              azione: {
                tipo: 'comunicazione.elimina',
                classeId: classe.id,
                comunicazioneId: base.id,
              },
              fatto: 'Comunicazione eliminata dallo storico.',
            }),
          ]
        : [
            pulsante({
              testo: 'Salva e apri nella posta',
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
                  titolo: `Preparare la bozza per ${indirizzi.length} destinatari?`,
                  testo:
                    'Si apre nel programma di posta, con gli indirizzi già in copia nascosta. ' +
                    'A spedirla sei tu: poi la spunti nell’elenco delle comunicazioni.',
                  testoConferma: 'Prepara',
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
                const risposta = await invia({
                  tipo: 'comunicazione.invia',
                  classeId: classe.id,
                  comunicazioneId: aggiornata.id,
                })
                contesto.occupato(false)
                if (!risposta.ok) {
                  contesto.mostraErrori(risposta.errori ?? ['Invio non riuscito.'])
                  return
                }
                contesto.chiudi()
                // Quanti destinatari e da che casella lo dice l'host, e lo dice
                // meglio: ripeterlo qui sarebbe la stessa notizia due volte.
              },
            }),
            modifica
              ? tastoElimina({
                  contesto,
                  chiedi: {
                    titolo: 'Eliminare la bozza?',
                    testo: 'Sparisce dallo storico della classe.',
                    testoConferma: 'Elimina',
                  },
                  azione: { tipo: 'comunicazione.elimina', classeId: classe.id, comunicazioneId: base.id },
                  fatto: 'Bozza eliminata.',
                })
              : null,
          ],
  })
}


