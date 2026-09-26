// Un evento del calendario ICS, preso dal clic destro nel calendario: di che
// corso è, in che aula, e se si vuole la lezione corrispondente. La scelta del
// corso diventa una regola di abbinamento, se nessuna la dice già. Si scrive
// con `calendario.applica`, come nel confronto (`forms/calendar.ts`).

import { fineLezione, inizioLezione } from '../../domain/calculations.js'
import { confrontaLezione, lezioneDaEventi } from '../../domain/calendar.js'
import type { EventoCalendario } from '../../domain/calendarIcs.js'
import { abbina, corsiConfrontabili, regoleConScelta } from '../../domain/calendarRules.js'
import { formattaData } from '../../domain/dates.js'
import { Uno } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import type { Lezione } from '../../domain/models.js'
import type { Azione } from '../../protocol.js'
import { avviso, campo, quieto, riga } from '../components/base.js'
import { eseguiOAvvisa } from '../components/filters.js'
import { apriModale } from '../components/modal.js'
import { notifica } from '../components/notifications.js'
import { h } from '../dom.js'
import { eventiDellaLezione } from '../externalCalendar.js'
import { nomeCorso, stato } from '../state.js'
import { corsoProposto, opzioniCorsi, salva, testo } from './common.js'
import { parole } from '../../domain/words.testi.js'
import { testi } from './icsEvent.testi.js'

/** Il valore della tendina che dice «non è una lezione». */
const IGNORA = '—ignora—'

export interface OpzioniModuloEventoIcs {
  evento: EventoCalendario
  /** Gli eventi che con quello fanno una lezione sola: tutti diventano la stessa ora. */
  gruppo: EventoCalendario[]
  /** `genera` crea anche la lezione; `abbina` scrive solo la regola. */
  modo: 'genera' | 'abbina'
  /** Dopo un salvataggio riuscito: chi ha aperto la finestra sgombra la sua scelta. */
  dopo?: () => void
}

/** La frase dopo il salvataggio: che cosa è nato, fra lezione e regola. */
function messaggio (lezione: boolean, regola: boolean, corsoId: string | null): string {
  const t = testi()
  if (lezione) return regola ? t.lezioneEAbbinamento : t.lezioneDallEvento
  return corsoId ? t.abbinamentoSalvato(nomeCorso(corsoId)) : t.nonPiuProposti
}

export function moduloEventoIcs ({ evento, gruppo, modo, dopo }: OpzioniModuloEventoIcs): void {
  const t = testi()
  const registro = stato.registro
  const regole = registro.impostazioni.calendario?.regole ?? []
  const oggi = abbina(registro, evento, regole, corsiConfrontabili(registro))
  const genera = modo === 'genera'
  const inizio = gruppo[0]?.inizio ?? evento.inizio
  const fine = gruppo[gruppo.length - 1]?.fine ?? evento.fine

  const corsi = opzioniCorsi()
  const corsoDiPartenza = oggi.corsoId && corsi.some((c) => c.valore === oggi.corsoId)
    ? oggi.corsoId
    : corsoProposto()

  /** Che cosa sa già il registro di questo evento, in una frase. */
  const giaNoto = oggi.ignorato
    ? t.regolaIgnora
    : oggi.corsoId
      ? (oggi.via === 'regola' ? t.riconosciutoDaRegola : t.riconosciutoPerIndizio)(
          nomeCorso(oggi.corsoId),
        )
      : t.nessunaRegola

  apriModale({
    titolo: genera ? t.titoloGenera : t.titoloAbbina,
    sottotitolo: `${formattaData(evento.data, 'lungo')} · ${inizio}–${fine}`,
    larghezza: 'media',
    testoSalva: genera ? t.salvaGenera : t.salvaAbbina,
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        h(
          'p',
          { class: 'testo-quieto' },
          t.citato(evento.titolo || t.senzaTitolo) + (evento.luogo ? ` · ${evento.luogo}` : ''),
        ),
        gruppo.length > 1 ? quieto(t.unOraSola(gruppo.length)) : null,
        avviso(giaNoto),
        riga(
          campo({
            nome: 'corsoId',
            etichetta: Uno(lessico().corso),
            tipo: 'select',
            valore: oggi.ignorato && !genera ? IGNORA : corsoDiPartenza,
            opzioni: [
              ...(genera ? [] : [{ valore: IGNORA, testo: t.nonUnaLezione }]),
              ...corsi,
            ],
            richiesto: true,
            larghezza: genera ? 'meta' : 'piena',
          }),
          genera
            ? campo({
                nome: 'aula',
                etichetta: parole().aula,
                valore: evento.luogo,
                segnaposto: t.segnapostoAula,
                larghezza: 'meta',
              })
            : null,
        ),
        campo({
          nome: 'regola',
          etichetta: t.riconosci,
          valore: evento.titolo || evento.luogo,
          aiuto: t.aiutoRegola,
        }),
        genera
          ? campo({
              nome: 'ricorda',
              tipo: 'checkbox',
              etichetta: t.ricorda,
              valore: true,
            })
          : null,
      ),
    alSalva: async (valori, contesto) => {
      const scelto = testo(valori.corsoId)
      if (!scelto) {
        contesto.mostraErrori([t.scegliCorso])
        return
      }
      const corsoId = scelto === IGNORA ? null : scelto
      const ricorda = genera ? valori.ricorda === true : true
      const testoRegola = testo(valori.regola)
      if (ricorda && !testoRegola) {
        contesto.mostraErrori([genera ? t.scriviOTogli : t.scrivi])
        return
      }

      const nuove = ricorda ? regoleConScelta(registro, evento, regole, testoRegola, corsoId) : null
      if (nuove) {
        // Una regola che non riconosce il suo evento è scritta male: salvata non
        // abbinerebbe niente.
        // testo-fisso: un id di prova, non si vede
        const prova = nuove.map((r, i) => ({ ...r, id: r.id ?? `nuova-${i}` }))
        const esito = abbina(registro, evento, prova, corsiConfrontabili(registro))
        const funziona = corsoId === null
          ? esito.ignorato
          : esito.corsoId === corsoId && esito.via === 'regola'
        if (!funziona) {
          contesto.mostraErrori([t.nonRiconosce])
          return
        }
      }

      const lezione = genera && corsoId
        ? lezioneDaEventi(gruppo, corsoId, testo(valori.aula), stato.registro.impostazioni.minutiUd)
        : null
      if (genera && !lezione) {
        contesto.mostraErrori([t.troppoCorto])
        return
      }
      // `calendario.applica` salta in silenzio un'ora che c'è già: qui lo si dice.
      if (lezione && registro.lezioni.some((l) => {
        if (l.corsoId !== lezione.corsoId || l.data !== lezione.data) return false
        const da = inizioLezione(l)
        const a = fineLezione(l)
        return da !== null && a !== null && da < fine && inizio < a
      })) {
        contesto.mostraErrori([t.sovrapposta(nomeCorso(lezione.corsoId))])
        return
      }
      if (!lezione && !nuove) {
        contesto.chiudi()
        notifica(t.cEraGia, 'info')
        return
      }

      await salva(
        contesto,
        {
          tipo: 'calendario.applica',
          regole: nuove ?? regole,
          crea: lezione ? [lezione] : [],
          allinea: [],
          annulla: [],
        },
        messaggio(lezione !== null, nuove !== null, corsoId),
        dopo,
      )
    },
  })
}

/**
 * L'azione che porta una lezione ancorata a quel che dice il calendario ICS
 * (orario e aula, o annullata se lo sono tutti gli eventi), o `null` se combacia
 * o non è ancorata. È la voce del confronto (`confrontaLezione`), con la stessa
 * `calendario.applica`.
 */
function azioneSincronizzaIcs (lezione: Lezione): Azione | null {
  const eventi = eventiDellaLezione(lezione.id)
  if (eventi.length === 0) return null
  const voce = confrontaLezione(lezione, eventi, stato.registro.impostazioni.minutiUd)
  if (voce.esito === 'combacia') return null
  return {
    tipo: 'calendario.applica',
    regole: stato.registro.impostazioni.calendario?.regole ?? [],
    crea: [],
    allinea: voce.esito === 'allineare'
      ? [{
          lezioneId: lezione.id,
          ...(voce.cambiaOrario ? { fasce: voce.fasce } : {}),
          aula: voce.aula,
        }]
      : [],
    annulla: voce.esito === 'annullare' ? [lezione.id] : [],
  }
}

/**
 * «Sincronizza da ICS»: scrive l'azione di `azioneSincronizzaIcs`, o dice che
 * non c'è niente da cambiare. Vero se la lezione è cambiata.
 */
export async function sincronizzaDaIcs (lezione: Lezione): Promise<boolean> {
  const comando = azioneSincronizzaIcs(lezione)
  if (!comando) {
    notifica(testi().inPari, 'info')
    return false
  }
  const risposta = await eseguiOAvvisa(comando, testi().sincronizzata)
  return risposta.ok
}
