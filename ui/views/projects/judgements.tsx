// I giudizi di un progetto: note datate su una persona o sulla classe. In cima
// una riga per scriverne uno al volo; sotto l'elenco, dal più recente. Dentro
// un'ora il giudizio nuovo si lega a lei e l'elenco mostra quelli dell'ora.

import { useRef, type ReactElement } from 'react'

import { nomeCompleto } from '#core/dominio/calculations.js'
import { formattaData } from '#core/dominio/dates.js'
import type { GiudizioProgetto, Lezione, ProgettoNelCorso } from '#core/dominio/models.js'
import { giornoDellaVoce } from '#core/dominio/projects.js'
import { parole } from '#core/dominio/words.testi.js'
import { Pulsante, Quieto, Tendina } from '#ui/components/base.js'
import { Input } from '#ui/fields.js'
import { azione } from '#ui/bridge.js'
import { allieviDelProgetto, attiviDelProgetto, moduloGiudizio } from '#ui/forms/project.js'
import { stato } from '#ui/state.js'
import { testi } from './judgements.testi.js'

/** Per chi si scrive il prossimo giudizio, per progetto: resta anche cambiando pagina. */
const destinatari = new Map<string, string>()

function GiudiziDelProgetto ({ progetto, lezione }: {
  progetto: ProgettoNelCorso
  lezione: Lezione | null
}): ReactElement {
  const t = testi()
  const allievi = allieviDelProgetto(progetto)
  const nomi = new Map(allievi.map((a) => [a.id, nomeCompleto(a)]))
  const chi = destinatari.get(progetto.id) ?? ''
  const campo = useRef<HTMLInputElement | null>(null)

  const aggiungi = async (): Promise<void> => {
    const scritto = campo.current?.value.trim() ?? ''
    if (!scritto) return
    const risposta = await azione({
      tipo: 'progetto.giudizio.salva',
      progettoId: progetto.id,
      corsoId: progetto.corsoId,
      giudizio: {
        allievoId: destinatari.get(progetto.id) || null,
        testo: scritto,
        ...(lezione ? { lezioneId: lezione.id } : { data: stato.adessoData }),
      },
    })
    if (risposta.ok && campo.current) campo.current.value = ''
  }

  const tutti = [...progetto.giudizi].sort((a, b) =>
    giornoDellaVoce(stato.registro, b).localeCompare(giornoDellaVoce(stato.registro, a)) ||
    b.creatoIl.localeCompare(a.creatoIl))
  const mostrati = lezione ? tutti.filter((g) => g.lezioneId === lezione.id) : tutti
  const altrove = tutti.length - mostrati.length

  const riga = (giudizio: GiudizioProgetto): ReactElement => (
    <li key={giudizio.id} className="osservazione">
      <div className="osservazione__testata">
        <span className="osservazione__ora">{formattaData(giornoDellaVoce(stato.registro, giudizio))}</span>
        <span className="osservazione__chi">
          {giudizio.allievoId ? nomi.get(giudizio.allievoId) ?? t.nonInElenco : t.tuttaLaClasse}
        </span>
        <Pulsante
          simbolo="matita"
          variante="fantasma"
          titolo={parole().modifica}
          al={() => moduloGiudizio({ progetto, giudizio })}
        />
      </div>
      <p className="osservazione__testo">{giudizio.testo}</p>
    </li>
  )

  return (
    <div
      className="giudizi-progetto"
      data-telaio={`giudizi:${progetto.id}`} // testo-fisso: una chiave, non un testo
    >
      <div className="giudizi-progetto__nuovo">
        <Tendina
          voci={[
            { valore: '', testo: t.tuttaLaClasse },
            ...attiviDelProgetto(progetto).map((a) => ({ valore: a.id, testo: nomeCompleto(a) })),
          ]}
          valore={chi}
          etichetta={parole().chi}
          al={(scelto) => { destinatari.set(progetto.id, scelto) }}
        />
        <Input
          ref={campo}
          className="campo__controllo giudizi-progetto__testo"
          type="text"
          placeholder={t.segnaposto}
          // testo-fisso: chiave di fuoco
          data-fuoco={`giudizio-nuovo-${progetto.id}`}
          aria-label={t.nuovo}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.preventDefault()
              void aggiungi()
            }
          }}
        />
        <Pulsante testo={parole().aggiungi} simbolo="piu" variante="sottile" al={aggiungi} />
      </div>
      {mostrati.length === 0
        ? <Quieto>{lezione ? t.nessunoInLezione : t.nessuno}</Quieto>
        : <ul className="osservazioni">{mostrati.map(riga)}</ul>}
      {altrove > 0 ? <Quieto>{t.altrove(altrove)}</Quieto> : null}
    </div>
  )
}

export function giudiziDelProgetto (progetto: ProgettoNelCorso, lezione: Lezione | null): ReactElement {
  return <GiudiziDelProgetto progetto={progetto} lezione={lezione} />
}
