// La scheda personale: tutto quel che il registro sa di una persona sola, per
// il colloquio. Da qui si modifica solo l'anagrafica.

import { createElement, type ReactElement, type ReactNode } from 'react'

import { nomeCompleto, ordinaAllievi } from '#core/dominio/calculations.js'
import type { Allievo, Classe } from '#core/dominio/models.js'
import { Pulsante, Selettore, StatoVuoto, TestataVista } from '#ui/components/base.js'
import { parole } from '#core/dominio/words.testi.js'
import { moduloAllievo } from '#ui/forms.js'
import { porzionePersona, porzioniPersona } from '#ui/tabs.js'
import {
  aggiorna,
  classeDellAllievo,
  corsiDi,
  lezioniDi,
  nomeSemestreScelto,
  stato,
  vai,
  type SchedaPersona,
} from '#ui/state.js'
import { telaioVista } from '#ui/viewFrame.js'
import { quadroDelPeriodo } from './student/attendance.js'
import { boxDelleMaterie } from './student/themes.js'
import {
  pannelloAnagrafica,
  pannelloAssenze,
  pannelloDocumenti,
  pannelloDoveSta,
} from './student/registry.js'
import { testi } from './student.testi.js'

/**
 * Il corpo della scheda, senza testata: lo mostrano sia la pagina della persona
 * sia «Persone in formazione», che scrive la sua testata.
 */
export function schedaAllievo (classe: Classe, allievo: Allievo): ReactNode {
  const lezioni = lezioniDi(classe.id)
  const corsi = corsiDi(classe.id)
  // Le linguette disponibili: quella del docente di classe solo nelle sue classi.
  const quale = porzionePersona(classe.docenteDiClasse)
  const linguette = porzioniPersona(classe.docenteDiClasse)

  return (
    <div className="scheda-persona">
      {/* I nomi delle linguette vengono da `tabs.ts`, che li dà anche al percorso
          nella barra del titolo. Con una linguetta sola niente selettore. */}
      {linguette.length > 1
        ? (
            <Selettore
              valore={quale}
              voci={[...linguette]}
              al={(scelta: SchedaPersona) => aggiorna({ schedaPersona: scelta })}
            />
          )
        : null}
      {quale === 'anagrafica'
        // Chi è e dove sta: la mappa subito sotto i recapiti.
        ? corpoScheda(pannelloAnagrafica(classe, allievo), pannelloDoveSta(classe, allievo))
        : null}
      {/* Il lavoro del docente di classe: documenti da riscuotere e fogli da far firmare. */}
      {quale === 'docenteClasse'
        ? corpoScheda(pannelloDocumenti(allievo, classe), pannelloAssenze(classe, allievo))
        : null}
      {/* Materia per materia, un box ciascuna; in cima il quadro del periodo, che è
          di tutte. */}
      {quale === 'materie'
        ? corpoScheda(
            quadroDelPeriodo(allievo, corsi, lezioni),
            ...boxDelleMaterie(allievo, classe, corsi, lezioni),
          )
        : null}
    </div>
  )
}

/**
 * Il corpo di una linguetta: i riquadri si affiancano quando c'è spazio. Se è
 * vuota lo dice, invece di mostrare un riquadro vuoto.
 */
function corpoScheda (...figli: ReactNode[]): ReactElement {
  const pieni = figli.filter((figlio) => figlio !== null && figlio !== undefined)
  if (pieni.length === 0) {
    return <p className="testo-quieto scheda-persona__nota">{testi().vuota}</p>
  }
  // Figli in fila e non in un elenco: i box delle materie portano già la loro chiave.
  return createElement('div', { className: 'scheda-persona__corpo' }, ...pieni)
}

export function vistaAllievo (): ReactNode {
  return <VistaAllievo />
}

function VistaAllievo (): ReactElement {
  const classe = classeDellAllievo(stato.allievoId, stato.classeId)
  const allievo = classe?.allievi.find((a) => a.id === stato.allievoId) ?? null
  const t = testi()

  if (!classe || !allievo) {
    return (
      <div className="vista vista--allievo" data-telaio={telaioVista()}>
        <StatoVuoto
          simbolo="utente"
          titolo={t.nessunaScelta}
          testo={t.comeSiApre}
          azione={(
            <Pulsante
              testo={t.vaiAllePersone}
              variante="primario"
              al={() => { vai({ pagina: 'pagina.persone' }) }}
            />
          )}
        />
      </div>
    )
  }

  // Gli allievi nell'ordine dell'elenco di classe, ritirati compresi: le frecce
  // passano al nome che si aveva sotto.
  const elenco = ordinaAllievi(classe.allievi)
  const dove = elenco.findIndex((a) => a.id === allievo.id)
  const vaiA = (quale: Allievo | undefined) =>
    quale
      ? () => { vai({ pagina: 'pagina.allievo', soggetto: { tipo: 'allievo', id: quale.id } }, { contesto: { classeId: classe.id } }) }
      : undefined
  const precedente = elenco[dove - 1]
  const successivo = elenco[dove + 1]

  return (
    <div className="vista vista--allievo" data-telaio={telaioVista()}>
      <TestataVista
        titolo={nomeCompleto(allievo)}
        sottotitolo={
          `${classe.nome}${allievo.attivo ? '' : t.ritirato} · ${nomeSemestreScelto()}` +
          // La posizione nella classe, scorrendo le schede.
          (elenco.length > 1 ? t.posizione(dove + 1, elenco.length) : '')
        }
        azioni={(
          <>
            {/* Le frecce prima di tutto: si scorre la classe preparando i colloqui. */}
            <Pulsante
              simbolo="su"
              variante="sottile"
              titolo={precedente ? t.schedaDi(nomeCompleto(precedente)) : t.primo}
              disabilitato={!precedente}
              al={vaiA(precedente)}
            />
            <Pulsante
              simbolo="giu"
              variante="sottile"
              titolo={successivo ? t.schedaDi(nomeCompleto(successivo)) : t.ultimo}
              disabilitato={!successivo}
              al={vaiA(successivo)}
            />
            {/* Il ritorno va all'elenco di tutte le persone, da cui si arriva di solito. */}
            <Pulsante
              testo={t.tornaAllElenco}
              simbolo="sinistra"
              variante="sottile"
              al={() => { vai({ pagina: 'pagina.persone' }) }}
            />
            {/* La scheda in PDF si chiede da Documenti, con quelle degli altri. */}
            <Pulsante
              testo={parole().modifica}
              simbolo="matita"
              al={() => moduloAllievo(classe, allievo)}
            />
          </>
        )}
      />
      {schedaAllievo(classe, allievo)}
    </div>
  )
}
