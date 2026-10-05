// Il dettaglio di una lezione: la schermata che si tiene aperta durante l'ora.
// Tutto si salva da sé: l'appello al clic, i testi quando si lascia il campo.

import type { ReactElement, ReactNode } from 'react'

import {
  fineLezione,
  inizioLezione,
  nomeCompleto,
} from '#core/dominio/calculations.js'
import { Molti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import { minuscolo } from '#core/i18n/index.js'
import { formattaData } from '#core/dominio/dates.js'
import { numeriDelleLezioni } from '#core/dominio/courses.js'
import type { Lezione, Osservazione } from '#core/dominio/models.js'
import {
  Avviso,
  Campo,
  Pastiglia,
  Pulsante,
  Quieto,
  Scheda,
  Selettore,
  StatoVuoto,
  Tendina,
  type TonoPastiglia,
} from '#ui/components/base.js'
import { classi } from '#ui/classNames.js'
import { pannelloConsegne } from './assignments.js'
import { pannelloCheckDellOra } from './check.js'
import { pannelloRiconsegneDellOra } from './assessments/returns.js'
import { moduloOsservazione } from '#ui/forms.js'
import { porzioniLezione, schedaLezioneAperta } from '#ui/tabs.js'
import { apriLezione } from '#ui/pages.js'
import { azione } from '#ui/bridge.js'
import {
  aggiorna,
  classeDiLezione,
  lezioneDiRiferimento,
  lezionePerId,
  lezioniDiCorso,
  stato,
  vai,
  type SchedaLezione,
} from '#ui/state.js'
import { telaioVista } from '#ui/viewFrame.js'
import { pannelloAppello } from './lesson/attendance.js'
import { matriceOsservata, noteDellaMatrice } from './lesson/behaviour.js'
import { pannelloPiano } from './lesson/plan.js'
import { schedaProgettoDellOra } from './lesson/project.js'
import { pannelloValutazioni } from './lesson/assessments.js'
import { testi } from './lesson.testi.js'

// ------------------------------------------------------------------ osservazioni

const TONI_OSSERVAZIONE: Record<Osservazione['tipo'], TonoPastiglia> = {
  nota: 'neutro',
  merito: 'positivo',
  disciplina: 'negativo',
  compiti: 'attenzione',
  materiale: 'attenzione',
  colloquio: 'informativo',
}

function pannelloOsservazioni (lezione: Lezione): ReactElement {
  const classe = classeDiLezione(lezione)
  const nomi = new Map(classe?.allievi.map((a) => [a.id, nomeCompleto(a)]) ?? [])
  const t = testi()
  const L = lessico()

  return (
    <Scheda
      telaio="osservazioni"
      titolo={Molti(L.osservazione)}
      aiuto={t.osservazioniAiuto}
      azioni={(
        <Pulsante
          testo={parole().aggiungi}
          simbolo="piu"
          variante="sottile"
          al={() => moduloOsservazione(lezione, classe)}
        />
      )}
    >
      <div className="colonna" data-telaio="osservazioni:colonna">
        {matriceOsservata(lezione, classe)}
        {noteDellaMatrice(lezione, classe)}
        {lezione.osservazioni.length === 0
          ? <Quieto>{t.nessunaOsservazione}</Quieto>
          : (
              <ul className="osservazioni">
                {[...lezione.osservazioni]
                  .sort((a, b) => (a.ora ?? '').localeCompare(b.ora ?? '') || a.creataIl.localeCompare(b.creataIl))
                  .map((osservazione) => (
                    <li key={osservazione.id} className="osservazione">
                      <div className="osservazione__testata">
                        <Pastiglia
                          testo={minuscolo(L.tipiOsservazione[osservazione.tipo])}
                          tono={TONI_OSSERVAZIONE[osservazione.tipo]}
                        />
                        <span className="osservazione__chi">
                          {osservazione.allievoId
                            ? nomi.get(osservazione.allievoId) ?? t.pifNonInElenco
                            : t.tuttaLaClasse}
                        </span>
                        {osservazione.ora ? <span className="osservazione__ora">{osservazione.ora}</span> : null}
                        <Pulsante
                          simbolo="matita"
                          variante="fantasma"
                          titolo={parole().modifica}
                          al={() => moduloOsservazione(lezione, classe, osservazione)}
                        />
                      </div>
                      <p className="osservazione__testo">{osservazione.testo}</p>
                    </li>
                  ))}
              </ul>
            )}
      </div>
    </Scheda>
  )
}

// ------------------------------------------------------------------ contenuti

/** I campi di testo lunghi, salvati quando si lascia il campo. */
function pannelloContenuti (lezione: Lezione): ReactElement {
  // Un campo alla volta e non la lezione della chiusura del disegno: il secondo
  // salvataggio rimanderebbe la copia vecchia e cancellerebbe il primo.
  const salvaCampo = async (chiave: 'argomenti' | 'materiali' | 'consuntivo', valore: string) => {
    if ((lezione[chiave] ?? '') === valore) return
    await azione(
      chiave === 'argomenti'
        ? { tipo: 'lezione.testi', lezioneId: lezione.id, argomenti: valore }
        : chiave === 'materiali'
          ? { tipo: 'lezione.testi', lezioneId: lezione.id, materiali: valore }
          : { tipo: 'lezione.testi', lezioneId: lezione.id, consuntivo: valore },
    )
  }

  const t = testi()
  // `al` di `Campo` è il `change` del browser: si salva uscendo dal campo, non a ogni tasto.
  return (
    <Scheda titolo={t.svolgimento} sottotitolo={t.siSalva}>
      <div className="modulo">
        <Campo
          nome="argomenti"
          etichetta={t.argomenti}
          tipo="textarea"
          righe={4}
          valore={lezione.argomenti ?? ''}
          segnaposto={t.argomentiSegnaposto}
          // testo-fisso: chiave di fuoco
          fuoco={`lezione-argomenti-${lezione.id}`}
          al={(valore) => void salvaCampo('argomenti', valore)}
        />
        <Campo
          nome="materiali"
          etichetta={t.materiali}
          tipo="textarea"
          righe={2}
          valore={lezione.materiali ?? ''}
          segnaposto={t.materialiSegnaposto}
          // testo-fisso: chiave di fuoco
          fuoco={`lezione-materiali-${lezione.id}`}
          al={(valore) => void salvaCampo('materiali', valore)}
        />
        <Campo
          nome="consuntivo"
          etichetta={t.consuntivo}
          tipo="textarea"
          righe={4}
          valore={lezione.consuntivo ?? ''}
          segnaposto={t.consuntivoSegnaposto}
          // testo-fisso: chiave di fuoco
          fuoco={`lezione-consuntivo-${lezione.id}`}
          al={(valore) => void salvaCampo('consuntivo', valore)}
        />
      </div>
    </Scheda>
  )
}

// ------------------------------------------------------------------ navigazione

/**
 * Come una lezione si legge nella tendina: numero d'ordine (le annullate non
 * contano), giorno della settimana, data e ora. Niente titolo del piano: la
 * tendina sceglie un'ora, non un argomento.
 */
function etichettaLezione (altra: Lezione, numero: number | null): string {
  const inizio = inizioLezione(altra)
  const segno = altra.stato === 'svolta' ? '✓ ' : altra.stato === 'annullata' ? '× ' : ''
  const ordine = numero === null ? '' : `${numero}. `
  return `${segno}${ordine}${formattaData(altra.data, 'settimana')}${inizio ? ` · ${inizio}` : ''}`
}

/**
 * Le ore del corso come si leggono nella tendina. La legge anche la veduta
 * dell'assistente, per nominare l'ora come la vede chi guarda; sta qui perché
 * qui stanno `etichettaLezione` e la numerazione.
 */
export function oreDelCorso (lezione: Lezione): Array<{ id: string, etichetta: string }> {
  const sorelle = lezioniDiCorso(lezione.corsoId)
  // Contati una volta, come nel resto del registro: ripartono a ogni semestre
  // (`numeriDelleLezioni`).
  const numeri = numeriDelleLezioni(stato.registro, sorelle)
  return sorelle.map((altra) => ({
    id: altra.id,
    etichetta: etichettaLezione(altra, numeri.get(altra.id) ?? null),
  }))
}

/**
 * La testata della lezione: il titolo è il navigatore delle ore del corso
 * (prima, tendina, dopo), in riga con la classe, l'orario e l'aula. Il giorno
 * lo dice già la tendina (e il percorso in cima): ripetuto nel sottotitolo
 * sarebbe la terza volta. Il corso si sceglie solo dalla barra in cima.
 */
function testataLezione (lezione: Lezione): ReactElement {
  const sorelle = lezioniDiCorso(lezione.corsoId)
  const posizione = sorelle.findIndex((l) => l.id === lezione.id)
  const ore = oreDelCorso(lezione)
  const classe = classeDiLezione(lezione)
  const t = testi()

  // L'ora precedente e successiva dello stesso corso.
  const vaiA = (indice: number) => {
    const bersaglio = sorelle[indice]
    if (bersaglio) apriLezione(bersaglio.id)
  }

  return (
    <header className="testata testata--lezione">
      <h2 className="testata__titolo navigatore-registro">
        <Pulsante
          simbolo="sinistra"
          variante="fantasma"
          titolo={t.precedente}
          disabilitato={posizione <= 0}
          al={() => vaiA(posizione - 1)}
        />
        <Tendina
          voci={ore.map((ora) => ({ valore: ora.id, testo: ora.etichetta }))}
          valore={lezione.id}
          etichetta={t.lezioneDelCorso}
          classe="navigatore-registro__lezione"
          al={(scelto) => apriLezione(scelto)}
        />
        <Pulsante
          simbolo="destra"
          variante="fantasma"
          titolo={t.successiva}
          disabilitato={posizione < 0 || posizione >= sorelle.length - 1}
          al={() => vaiA(posizione + 1)}
        />
      </h2>
      <p className="testata__sottotitolo">
        <strong className="testata__classe">{classe?.nome ?? t.classeEliminata}</strong>
        {/* testo-fisso: separatore */}
        {` · ${inizioLezione(lezione) ?? ''}–${fineLezione(lezione) ?? ''}` +
          (lezione.aula ? t.aula(lezione.aula) : '')}
      </p>
      <span className="testata__spazio" />
      {/* Con un'ora sola «1 di 1» non dice niente. */}
      {sorelle.length > 1
        ? (
            <span className="navigatore-registro__conta">
              {posizione >= 0
                ? t.posizione(posizione + 1, sorelle.length)
                : t.lezioni(sorelle.length)}
            </span>
          )
        : null}
    </header>
  )
}

// ------------------------------------------------------------------ ora svolta

/**
 * Il contenuto delle schede di un'ora svolta, in sola lettura: un `fieldset`
 * spento disattiva ogni controllo dentro, tastiera compresa. È solo cortesia:
 * le azioni rifiutano comunque (`aOraAperta`).
 */
function aOraSvolta (lezione: Lezione, chiave: string, figli: ReactNode): ReactNode {
  if (lezione.stato !== 'svolta') return figli
  return (
    // testo-fisso: una chiave, non un testo
    <fieldset className="lezione-chiusa" data-telaio={`chiusa:${chiave}`} disabled>
      {figli}
    </fieldset>
  )
}

/** L'avviso in testa a un'ora svolta, con il gesto per riaprirla. */
function avvisoOraSvolta (lezione: Lezione): ReactNode {
  if (lezione.stato !== 'svolta') return null
  const t = testi()
  return (
    <Avviso>
      <span className="lezione-chiusa__avviso">
        {t.chiusa}
        <Pulsante
          testo={t.riapri}
          titolo={t.riapriTitolo}
          simbolo="calendario"
          variante="sottile"
          al={() => azione({ tipo: 'lezione.stato', lezioneId: lezione.id, stato: 'pianificata' })}
        />
      </span>
    </Avviso>
  )
}

// ------------------------------------------------------------------ vista

/**
 * Le due colonne di una scheda della lezione. La chiave di telaio resta perché
 * le prove la leggono; i nodi li tiene React, e lo scorrimento di lato delle
 * matrici (appello, comportamento) resta fra un clic e l'altro.
 */
function colonne (porzione: SchedaLezione, sinistra: ReactNode, destra: ReactNode): ReactElement {
  return (
    // testo-fisso: una chiave, non un testo
    <div className={classi('colonne', 'colonne--lezione', `colonne--${porzione}`)} data-telaio={`lezione:${porzione}`}>
      <div className="colonna" data-telaio="sinistra">{sinistra}</div>
      <div className="colonna" data-telaio="destra">{destra}</div>
    </div>
  )
}

/**
 * Una scheda a tutta larghezza: la scaletta ha colonne di durata e di orario,
 * le valutazioni le loro tabelle, e accanto non c'è niente da tenere.
 */
function intera (porzione: SchedaLezione, figli: ReactNode): ReactElement {
  return (
    // testo-fisso: una chiave, non un testo
    <div className="colonna" data-telaio={`lezione:${porzione}`}>{figli}</div>
  )
}

/** La scheda Progetto: le linguette fuori dal `fieldset`, le colonne dentro. */
function porzioneProgetto (lezione: Lezione): ReactElement {
  const { scelta, sinistra, destra } = schedaProgettoDellOra(lezione)
  return (
    <>
      {scelta}
      {colonne(
        'progetto',
        aOraSvolta(lezione, 'progetto', sinistra),
        aOraSvolta(lezione, 'progetto-matrice', destra),
      )}
    </>
  )
}

function VistaLezione (): ReactElement {
  const lezione = lezionePerId(stato.lezioneId)
  const t = testi()
  if (!lezione) {
    // Registro vuoto o lezione cancellata altrove: si offre un'ora da aprire, se
    // c'è, altrimenti il calendario.
    const riferimento = lezioneDiRiferimento()
    return (
      <StatoVuoto
        telaio={telaioVista()}
        simbolo="lezione"
        titolo={t.vuotoTitolo}
        testo={t.vuotoTesto}
        azione={riferimento
          ? (
              <Pulsante
                testo={t.apriUltima}
                variante="primario"
                simbolo="lezione"
                al={() => apriLezione(riferimento)}
              />
            )
          : (
              <Pulsante
                testo={t.vaiAlCalendario}
                variante="primario"
                al={() => { vai({ pagina: 'pagina.calendario' }) }}
              />
            )}
      />
    )
  }

  // La linguetta scelta, se quest'ora ce l'ha: Progetto c'è solo con un progetto nel piano.
  const aperta = schedaLezioneAperta(lezione)

  return (
    <div className="vista vista--lezione" data-telaio={telaioVista()}>
      {testataLezione(lezione)}
      {avvisoOraSvolta(lezione)}
      {/* Le schede nell'ordine dell'ora: Inizio ora mentre la classe entra
          (appello, pendenze, check, prove da ridare); durante, Piano lezione
          (la scaletta), Valutazioni e Progetto (compiti, matrice, giudizi, solo
          se il piano dell'ora lavora a uno); Fine ora (svolgimento,
          osservazioni) dopo. Ogni cosa sta in una scheda sola. I nomi delle
          linguette vengono da `tabs.ts`, che li dà anche al percorso nella
          barra del titolo. */}
      <Selettore
        valore={aperta}
        voci={[...porzioniLezione(lezione)]}
        al={(scelta: SchedaLezione) => aggiorna({ schedaLezione: scelta })}
      />
      {aperta === 'amministrazione'
        ? colonne(
            'amministrazione',
            aOraSvolta(lezione, 'appello', pannelloAppello(lezione)),
            aOraSvolta(
              lezione,
              'consegne',
              <>
                {pannelloConsegne(lezione)}
                {/* Il check sotto le consegne: si spunta nello stesso momento, persona per persona. */}
                {pannelloCheckDellOra(lezione)}
                {/* Le prove da ridare accanto alle consegne da ritirare: stesso momento. */}
                {pannelloRiconsegneDellOra(lezione)}
              </>,
            ),
          )
        : null}
      {aperta === 'lezione'
        ? intera('lezione', aOraSvolta(lezione, 'piano', pannelloPiano(lezione)))
        : null}
      {aperta === 'valutazioni'
        ? intera('valutazioni', aOraSvolta(lezione, 'valutazioni', pannelloValutazioni(lezione)))
        : null}
      {aperta === 'progetto' ? porzioneProgetto(lezione) : null}
      {aperta === 'annotazioni'
        ? colonne(
            'annotazioni',
            aOraSvolta(lezione, 'svolgimento', pannelloContenuti(lezione)),
            aOraSvolta(lezione, 'osservazioni', pannelloOsservazioni(lezione)),
          )
        : null}
    </div>
  )
}

export function vistaLezione (): ReactElement {
  return <VistaLezione />
}
