// Il check: la lista di controllo di un corso, allievo per allievo.
// Le colonne le decide chi insegna; ogni spunta porta il quando (l'ora aperta,
// oggi dalla pagina, o un giorno scelto col tasto destro). La griglia la
// disegnano questa pagina, la scheda del corso e la scheda Inizio ora
// della lezione, e sta solo qui; anche la casella singola (`casellaDelCheck`) per la
// scheda della persona.

import type { ReactElement } from 'react'

import { allieviAttivi, nomeCompleto } from '#core/dominio/calculations.js'
import {
  allieviDelCheck,
  checkDelCorso,
  dataSpunta,
  gestoDelClic,
  riepilogoDelCheck,
  spuntaDelCheck,
} from '#core/dominio/check.js'
import { formattaData } from '#core/dominio/dates.js'
import type {
  Allievo,
  Check,
  ColonnaCheck,
  Corso,
  Iso,
  Lezione,
  SpuntaCheck,
} from '#core/dominio/models.js'
import { Molti, Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import { classi } from '#ui/classNames.js'
import { Collegamento, Pulsante, Scheda, StatoVuoto, TestataVista } from '#ui/components/base.js'
import { StatoVuotoAnno } from '#ui/components/filters.js'
import { Icona } from '#ui/components/icons.js'
import { frecceNellaGriglia } from '#ui/components/gridArrows.js'
import { statoInVolo } from '#ui/components/inFlight.js'
import { menuContestuale, menuSotto, type ElementoMenu } from '#ui/components/menu.js'
import { conferma } from '#ui/components/modal.js'
import { classeDelFascicolo, corsoDelContesto, nomeDelCorso } from '#ui/context.js'
import { avvisoSpunteCheCadono, colonneAttuali, spunteCheCadonoOra } from '#ui/forms/check.js'
import { moduloAnno, moduloColonnaCheck, moduloDataCheck } from '#ui/forms.js'
import { azione } from '#ui/bridge.js'
import {
  annoCorrente,
  classePerId,
  corsiDi,
  corsoPerId,
  lezioniDiCorso,
  stato,
  vai,
} from '#ui/state.js'
import { telaioVista } from '#ui/viewFrame.js'
import { testi } from './check.testi.js'

// ------------------------------------------------------------------ il quando

/** Il quando di una spunta nuova, come lo vuole `check.spunta`. */
interface Quando {
  lezioneId?: string
  data?: Iso
}

/**
 * L'ora di oggi del corso, se c'è ed è ancora aperta: la spunta data dalla
 * pagina durante l'ora si lega alla lezione e ne segue gli spostamenti. Un'ora
 * conclusa rifiuta le scritture, e la spunta va a oggi e basta.
 */
function lezioneDiOggi (corsoId: string): Lezione | null {
  const adesso = stato.adessoData
  return lezioniDiCorso(corsoId).find((l) => l.data === adesso && l.stato === 'pianificata') ?? null
}

/** Il quando di una spunta data dalla pagina: l'ora di oggi, o oggi e basta. */
function quandoDallaPagina (corsoId: string): Quando {
  const lezione = lezioneDiOggi(corsoId)
  return lezione ? { lezioneId: lezione.id } : { data: stato.adessoData }
}

/** Il quando di un clic: l'ora aperta se si è dentro un'ora, se no la pagina. */
function quandoDelClic (corsoId: string, lezione: Lezione | null): Quando {
  return lezione ? { lezioneId: lezione.id } : quandoDallaPagina(corsoId)
}

// ------------------------------------------------------------------ scritture

const chiaveCasella = (corsoId: string, allievoId: string, colonnaId: string): string =>
  `${corsoId}|${allievoId}|${colonnaId}`

/**
 * Le caselle mandate all'host e non ancora tornate: vero se spuntate, falso se
 * tolte. Il secondo clic parte da quel che ha mandato il primo, non dal disegno
 * (come `PulsanteStato` in `lesson/attendance.tsx`). Sta nel modulo: i due
 * clic dello stesso giro, prima che React ridisegni, la leggono tutti e due.
 */
const inVolo = statoInVolo<boolean>()

async function spunta (
  corsoId: string,
  allievoId: string,
  colonnaId: string,
  fatta: boolean,
  quando: Quando | null,
): Promise<boolean> {
  const risposta = await inVolo.manda(chiaveCasella(corsoId, allievoId, colonnaId), fatta, () =>
    azione({
      tipo: 'check.spunta',
      corsoId,
      allievoId,
      colonnaId,
      fatta,
      ...(fatta && quando ? quando : {}),
    }))
  return risposta.ok
}

async function assegnaAllaLezione (
  corsoId: string,
  allievoId: string,
  colonnaId: string,
  lezioneId: string,
): Promise<void> {
  await azione({ tipo: 'check.lezione', corsoId, allievoId, colonnaId, lezioneId })
}

async function scriviColonne (corsoId: string, colonne: ColonnaCheck[]): Promise<void> {
  await azione({ tipo: 'check.colonne', corsoId, colonne })
}

async function spostaColonna (corsoId: string, colonnaId: string, verso: -1 | 1): Promise<void> {
  // Le colonne come sono adesso nel registro: il menu può restare aperto a lungo.
  const colonne = colonneAttuali(corsoId)
  const da = colonne.findIndex((c) => c.id === colonnaId)
  const a = da + verso
  if (da < 0 || a < 0 || a >= colonne.length) return
  const nuove = [...colonne]
  ;[nuove[da], nuove[a]] = [nuove[a], nuove[da]]
  await scriviColonne(corsoId, nuove)
}

/**
 * Toglie una colonna, dopo averlo chiesto. Quel che resta si rilegge dallo stato
 * dopo la risposta, perché intanto altri possono aggiungere colonne; se le
 * spunte da perdere sono aumentate si richiede.
 */
async function togliColonna (corsoId: string, colonna: ColonnaCheck): Promise<void> {
  const restanti = (): ColonnaCheck[] =>
    colonneAttuali(corsoId).filter((c) => c.id !== colonna.id)
  const t = testi()
  let detto = -1
  for (;;) {
    const cadono = spunteCheCadonoOra(corsoId, restanti())
    if (cadono <= detto) break
    const perdita = avvisoSpunteCheCadono(corsoId, restanti())
    const sicuro = await conferma({
      titolo: t.togliere(colonna.titolo),
      testo: perdita ?? t.nienteDaPerdere,
      testoConferma: t.togliLaColonna,
      pericolo: true,
    })
    if (!sicuro) return
    detto = cadono
  }
  const restano = restanti()
  // Tolta altrove mentre si rispondeva: non c'è più niente da togliere.
  if (restano.length === colonneAttuali(corsoId).length) return
  await scriviColonne(corsoId, restano)
}

/**
 * Spunta la colonna a chi frequenta e non l'ha ancora: una scrittura per
 * casella (il protocollo spunta caselle); le già spuntate tengono il loro giorno.
 */
async function spuntaTutti (corsoId: string, colonnaId: string, quando: Quando): Promise<void> {
  const check = checkDelCorso(stato.registro, corsoId)
  const classe = classePerId(corsoPerId(corsoId)?.classeId ?? null)
  if (!check || !classe) return
  const mancano = allieviAttivi(classe).filter((a) => !spuntaDelCheck(check, a.id, colonnaId))
  // Al primo rifiuto ci si ferma: gli altri avrebbero lo stesso motivo.
  for (const allievo of mancano) {
    if (!await spunta(corsoId, allievo.id, colonnaId, true, quando)) return
  }
}

// ------------------------------------------------------------------ i menu

/**
 * Apre il menu dove l'ha chiesto il gesto. Tasto Menu e Maiusc+F10 mandano un
 * `contextmenu` senza coordinate: allora si appende sotto la casella.
 */
function apriMenu (evento: MouseEvent, origine: HTMLElement, voci: ElementoMenu[]): void {
  if (evento.clientX === 0 && evento.clientY === 0) {
    evento.preventDefault()
    menuSotto(origine, voci)
    return
  }
  menuContestuale(evento, voci, origine)
}

/** Quel che serve a disegnare una casella: chi, quale colonna, e in che ora. */
interface Casella {
  corsoId: string
  allievo: Allievo
  colonna: ColonnaCheck
  spunta: SpuntaCheck | null
  data: Iso | null
  lezione: Lezione | null
}

/** Le voci del tasto destro su una casella: le stesse nella pagina e nell'ora. */
function vociCasella (casella: Casella): ElementoMenu[] {
  const { corsoId, allievo, colonna, lezione } = casella
  const t = testi()
  const voci: ElementoMenu[] = [{ titolo: `${nomeCompleto(allievo)} · ${colonna.titolo}` }]
  const data = (): void => moduloDataCheck({ corsoId, allievo, colonna, data: casella.data })

  if (!casella.spunta) {
    if (lezione) {
      voci.push({
        testo: t.spuntaInLezione,
        simbolo: 'spunta',
        al: async () => { await spunta(corsoId, allievo.id, colonna.id, true, { lezioneId: lezione.id }) },
      })
    }
    // Dentro l'ora di oggi resta solo «in questa lezione», che segue l'ora.
    if (!lezione || lezione.data !== stato.adessoData) {
      voci.push({
        testo: t.spuntaOggi,
        simbolo: lezione ? 'calendario' : 'spunta',
        // «Oggi» vuol dire quel che vuol dire dalla pagina: la lezione di oggi, o oggi.
        al: async () => { await spunta(corsoId, allievo.id, colonna.id, true, quandoDallaPagina(corsoId)) },
      })
    }
    voci.push({ testo: t.scegliData, simbolo: 'calendario', al: data })
    return voci
  }

  // Dentro un'ora, una spunta di un altro giorno o scelta a mano si può riportare
  // a questa lezione, e da lì segue l'ora.
  if (lezione && casella.spunta.lezioneId !== lezione.id) {
    voci.push({
      testo: t.assegnaAllaLezione,
      descrizione: formattaData(lezione.data, 'lungo'),
      simbolo: 'spunta',
      al: () => assegnaAllaLezione(corsoId, allievo.id, colonna.id, lezione.id),
    })
  }
  voci.push(
    { testo: t.cambiaData, simbolo: 'calendario', al: data },
    'separatore',
    {
      testo: t.togliSpunta,
      simbolo: 'chiudi',
      pericolo: true,
      al: async () => { await spunta(corsoId, allievo.id, colonna.id, false, null) },
    },
  )
  return voci
}

/** Le voci su una colonna: spuntarla a tutti, rinominarla, spostarla, toglierla. */
function vociColonna (
  corsoId: string,
  colonna: ColonnaCheck,
  indice: number,
  quante: number,
  mancano: number,
  lezione: Lezione | null,
): ElementoMenu[] {
  const quando = quandoDelClic(corsoId, lezione)
  const t = testi()
  return [
    { titolo: colonna.titolo },
    {
      testo: lezione ? t.spuntaTuttiInLezione : t.spuntaTuttiOggi,
      simbolo: 'spunta',
      disabilitato: mancano === 0,
      titolo: mancano === 0 ? t.giaTutti : t.spuntaVuote(mancano),
      al: () => spuntaTutti(corsoId, colonna.id, quando),
    },
    'separatore',
    {
      // Aggiungere una colonna anche da qui, accanto a questa.
      testo: t.aggiungiColonna,
      simbolo: 'piu',
      al: () => moduloColonnaCheck({ corsoId, dopo: colonna.id }),
    },
    {
      testo: `${parole().rinomina}…`,
      simbolo: 'matita',
      al: () => moduloColonnaCheck({ corsoId, colonna }),
    },
    {
      testo: t.spostaASinistra,
      simbolo: 'sinistra',
      disabilitato: indice === 0,
      al: () => spostaColonna(corsoId, colonna.id, -1),
    },
    {
      testo: t.spostaADestra,
      simbolo: 'destra',
      disabilitato: indice === quante - 1,
      al: () => spostaColonna(corsoId, colonna.id, 1),
    },
    'separatore',
    {
      testo: t.togliLaColonnaMenu,
      simbolo: 'cestino',
      pericolo: true,
      al: () => togliColonna(corsoId, colonna),
    },
  ]
}

// ------------------------------------------------------------------ la griglia

/**
 * Il quadretto di una casella. Nella pagina la spuntata dice il giorno, corto;
 * dentro un'ora solo le spuntate in un altro giorno lo dicono.
 */
function casellaCheck (casella: Casella): ReactElement {
  const { corsoId, allievo, colonna, spunta: fatta, data, lezione } = casella
  const t = testi()
  const chi = `${nomeCompleto(allievo)} · ${colonna.titolo}`
  const lunga = data ? formattaData(data, 'lungo') : ''
  // Il giorno di cui si parla: quello dell'ora aperta, o oggi nella pagina.
  const contesto = lezione ? lezione.data : stato.adessoData
  const qui = Boolean(lezione && data === lezione.data)
  const altrove = Boolean(lezione && fatta && !qui)
  const alClic = gestoDelClic(fatta ? data : null, contesto)

  const quando = fatta
    ? fatta.lezioneId
      ? t.spuntataInLezione(lunga)
      : t.spuntataAMano(lunga)
    : null
  const gesto =
    alClic === 'spunta'
      ? t.clicPerSpuntare(Boolean(lezione))
      : alClic === 'togli'
        ? t.clicPerTogliere
        : t.clicFermo(Boolean(lezione))

  return (
    <button
      className={classi(
        'casella-check',
        fatta && 'casella-check--fatta',
        altrove && 'casella-check--altrove',
        fatta && alClic === null && 'casella-check--ferma',
      )}
      type="button"
      // testo-fisso: chiave del fuoco, non si legge
      data-fuoco={`check-${allievo.id}-${colonna.id}`}
      title={[chi, quando, gesto].filter(Boolean).join('\n')}
      aria-label={!fatta ? t.daFare(chi) : t.spuntataIl(chi, lunga, alClic === 'togli')}
      aria-pressed={Boolean(fatta)}
      aria-haspopup="menu"
      // Il pulsante non si spegne mai: serve il fuoco, e il menu (anche dal tasto Menu).
      onClick={(evento) => {
        // Quel che è partito e non è tornato conta come già fatto: il secondo clic
        // toglie invece di rispuntare, anche nello stesso giro.
        const chiave = chiaveCasella(corsoId, allievo.id, colonna.id)
        const partita = inVolo.da(chiave, undefined)
        const dataOra = partita === undefined ? (fatta ? data : null) : partita ? contesto : null
        const esito = gestoDelClic(dataOra, contesto)
        // Spuntata un altro giorno: il clic non la cambia, ma apre il menu, così
        // non sembra una casella morta. Mai mentre un clic è in volo.
        if (esito === null) {
          if (partita === undefined) {
            apriMenu(evento.nativeEvent, evento.currentTarget, vociCasella(casella))
          }
          return
        }
        void spunta(
          corsoId,
          allievo.id,
          colonna.id,
          esito === 'spunta',
          esito === 'spunta' ? quandoDelClic(corsoId, lezione) : null,
        )
      }}
      onContextMenu={(evento) =>
        apriMenu(evento.nativeEvent, evento.currentTarget, vociCasella(casella))}
    >
      {fatta && data
        ? lezione && qui
          ? <Icona nome="spunta" />
          : <span className="casella-check__data">{formattaData(data, 'corto')}</span>
        : null}
    </button>
  )
}

/**
 * La casella di una persona su una colonna, letta dallo stato, per chi disegna
 * caselle fuori da questa pagina: stessa spunta, menu e difesa dal doppio clic.
 * Senza lezione il quando è quello della pagina.
 */
export function casellaDelCheck (
  corsoId: string,
  check: Check,
  allievo: Allievo,
  colonna: ColonnaCheck,
  lezione: Lezione | null = null,
): ReactElement {
  const fatta = spuntaDelCheck(check, allievo.id, colonna.id)
  return casellaCheck({
    corsoId,
    allievo,
    colonna,
    spunta: fatta,
    data: fatta ? dataSpunta(stato.registro, fatta) : null,
    lezione,
  })
}

/**
 * Come è stata spuntata una casella, per intero: «in lezione» o «a mano». La
 * stessa frase del suggerimento sulla casella.
 */
export function comeSpuntata (spunta: SpuntaCheck, data: Iso): string {
  const lunga = formattaData(data, 'lungo')
  const t = testi()
  return spunta.lezioneId ? t.comeInLezione(lunga) : t.comeAMano(lunga)
}

/**
 * La griglia: persone in riga, colonne in colonna. Scorre di lato con i nomi
 * fermi, come la matrice del comportamento. Ogni testata è un pulsante che
 * apre il menu della colonna e dice quanti l'hanno spuntata.
 */
export function grigliaCheck (corso: Corso, check: Check, lezione: Lezione | null): ReactElement {
  const righe = allieviDelCheck(stato.registro, corso.id)
  const riepilogo = riepilogoDelCheck(stato.registro, corso.id)
  const colonne = check.colonne
  const t = testi()

  const testata = (colonna: ColonnaCheck, indice: number): ReactElement => {
    // I conti dal dominio, sugli attivi, come nella scheda del corso.
    const conto = riepilogo.find((r) => r.colonna.id === colonna.id)
    const fatte = conto?.fatte ?? 0
    const totale = conto?.totale ?? 0
    const voci = (): ElementoMenu[] =>
      vociColonna(corso.id, colonna, indice, colonne.length, totale - fatte, lezione)
    return (
      <th key={colonna.id} className="check__colonna" scope="col">
        <button
          className="check__testata"
          type="button"
          // testo-fisso: chiave del fuoco, non si legge
          data-fuoco={`check-colonna-${colonna.id}`}
          title={t.testata(colonna.titolo, fatte, totale)}
          aria-haspopup="menu"
          onClick={(evento) => menuSotto(evento.currentTarget, voci())}
          onContextMenu={(evento) => apriMenu(evento.nativeEvent, evento.currentTarget, voci())}
        >
          <span className="check__titolo">{colonna.titolo}</span>
          <span className={classi('check__conto', fatte === totale && totale > 0 && 'check__conto--pieno')}>
            {`${fatte}/${totale}`}
          </span>
        </button>
      </th>
    )
  }

  // La chiave tiene la riga alla persona: se una riga sparisce (un ritirato
  // senza più spunte), il fuoco non scivola sulla casella di chi segue.
  const riga = (allievo: Allievo): ReactElement => (
    <tr
      key={allievo.id}
      className={classi(!allievo.attivo && 'check__riga--ritirata')}
      data-chiave={allievo.id}
    >
      <th className="check__chi" scope="row">
        {nomeCompleto(allievo)}
        {/* Chi non frequenta più resta solo se ha qualcosa di spuntato, e lo si dice. */}
        {allievo.attivo ? null : <small className="check__nota">{t.nonFrequentaPiu}</small>}
      </th>
      {colonne.map((colonna) => (
        <td key={colonna.id}>{casellaDelCheck(corso.id, check, allievo, colonna, lezione)}</td>
      ))}
    </tr>
  )

  // Una spunta non riporta la griglia a sinistra: il nodo resta, e
  // `data-scorrimento` rimette il punto se no.
  return (
    <div
      className="check__telaio"
      data-telaio="check"
      // testo-fisso: una chiave, non un testo
      data-scorrimento={`check:${corso.id}:${lezione?.id ?? ''}`}
      onKeyDown={frecceNellaGriglia('.casella-check')}
    >
      <table className="check" aria-label={t.checkDi(nomeDelCorso(corso))}>
        <thead>
          <tr>
            <th className="check__angolo" scope="col">{Molti(lessico().pif)}</th>
            {colonne.map(testata)}
          </tr>
        </thead>
        <tbody>{righe.map(riga)}</tbody>
      </table>
    </div>
  )
}

// ------------------------------------------------------------------ nell'ora

/**
 * Il check dentro l'ora, nella scheda Inizio ora: un clic spunta in
 * quest'ora. Senza colonne resta solo una riga che dice dove prepararle.
 */
export function pannelloCheckDellOra (lezione: Lezione): ReactElement | null {
  const corso = corsoPerId(lezione.corsoId)
  if (!corso) return null
  const check = checkDelCorso(stato.registro, corso.id)
  const apriPagina = (): void => {
    vai({ pagina: 'pagina.corso.check', soggetto: { tipo: 'corso', id: corso.id } })
  }

  const t = testi()
  if (!check || check.colonne.length === 0) {
    return (
      <p className="check-assente testo-quieto">
        <Icona nome="check" classe="icona--minuta" />
        {t.nessunCheck}
        <Collegamento testo={t.preparaColonne} al={apriPagina} />
      </p>
    )
  }

  // Nessun pulsante per la pagina del check (sta nella barra laterale); le
  // colonne si cambiano col menu sulla testata.
  return (
    <Scheda telaio="check-ora" titolo={Uno(lessico().check)} aiuto={t.aiutoOra} classe="scheda--check">
      {grigliaCheck(corso, check, lezione)}
    </Scheda>
  )
}

// ------------------------------------------------------------------ la pagina

/** Nessuna colonna, o nessuno da spuntare: lo stato vuoto del check di un corso. */
function vuotoDelCheck (
  corso: Corso,
  check: Check | null | undefined,
  nomeClasse: string,
): ReactElement | null {
  const t = testi()
  if (!check || check.colonne.length === 0) {
    return (
      <StatoVuoto
        simbolo="check"
        titolo={t.nessunaColonna}
        testo={t.cheColonna}
        azione={(
          <Pulsante
            testo={t.primaColonna}
            simbolo="piu"
            variante="primario"
            al={() => moduloColonnaCheck({ corsoId: corso.id })}
          />
        )}
      />
    )
  }
  if (allieviDelCheck(stato.registro, corso.id).length === 0) {
    return <StatoVuoto simbolo="utente" titolo={t.classeVuota} testo={t.righeDelCheck(nomeClasse)} />
  }
  return null
}

/** Un check del fascicolo di classe. Ogni corso conserva colonne e comandi propri. */
function schedaCheckDiClasse (corso: Corso): ReactElement {
  const t = testi()
  const check = checkDelCorso(stato.registro, corso.id)
  const classe = classePerId(corso.classeId)
  return (
    <Scheda
      key={corso.id}
      telaio={`check:${corso.id}`} // testo-fisso: una chiave, non un testo
      titolo={nomeDelCorso(corso)}
      sottotitolo={t.checkDelCorso}
      classe="scheda--check scheda--check-classe"
    >
      {vuotoDelCheck(corso, check, classe?.nome ?? '') ?? (check ? grigliaCheck(corso, check, null) : null)}
    </Scheda>
  )
}

function VistaCheck (): ReactElement {
  if (!annoCorrente()) {
    return <StatoVuotoAnno telaio={telaioVista()} simbolo="check" crea={() => moduloAnno()} />
  }

  const t = testi()
  if (stato.ambitoCheck === 'classe') {
    const classe = classeDelFascicolo()
    if (!classe) {
      return (
        <StatoVuoto
          telaio={telaioVista()}
          simbolo="check"
          titolo={t.nessunaClasseDocente}
          testo={t.checkClasseNonDisponibile}
        />
      )
    }
    const corsi = corsiDi(classe.id)
    return (
      <div className="vista vista--check vista--check-classe" data-telaio={telaioVista()}>
        <TestataVista
          titolo={t.checkDellaClasse}
          sottotitolo={t.comeDocenteDiClasse(classe.nome)}
          contorno={<p className="suggerimento">{t.suggerimentoClasse}</p>}
        />
        {corsi.length > 0
          ? (
              <div className="elenco-schede check-classe__corsi" data-telaio="check-classe:corsi">
                {corsi.map(schedaCheckDiClasse)}
              </div>
            )
          : (
              <StatoVuoto
                simbolo="check"
                titolo={t.nessunCorsoDellaClasse}
                testo={t.creaCorsoPerCheck}
              />
            )}
      </div>
    )
  }

  const corso = corsoDelContesto()
  const classe = corso ? classePerId(corso.classeId) : null
  if (!corso || !classe) {
    return (
      <StatoVuoto
        telaio={telaioVista()}
        simbolo="check"
        titolo={t.nessunCorso}
        testo={t.checkInUnCorso}
        azione={(
          <Pulsante
            testo={t.vaiAiCorsi}
            variante="primario"
            al={() => { vai({ pagina: 'pagina.corsi' }) }}
          />
        )}
      />
    )
  }

  const check = checkDelCorso(stato.registro, corso.id)
  const lezione = lezioneDiOggi(corso.id)

  return (
    <div className="vista vista--check" data-telaio={telaioVista()}>
      <TestataVista
        titolo={Uno(lessico().check)}
        sottotitolo={nomeDelCorso(corso)}
        contorno={(
          <div className="filtri">
            <p className="suggerimento">{t.suggerimento(Boolean(lezione))}</p>
          </div>
        )}
      />
      {vuotoDelCheck(corso, check, classe.nome) ??
        (check ? <Scheda telaio="check:scheda">{grigliaCheck(corso, check, null)}</Scheda> : null)}
    </div>
  )
}

export function vistaCheck (): ReactElement {
  return <VistaCheck />
}
