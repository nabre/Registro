// Il check: la lista di controllo di un corso, allievo per allievo.
// Le colonne le decide chi insegna; ogni spunta porta il quando (l'ora aperta,
// oggi dalla pagina, o un giorno scelto col tasto destro). La griglia la
// disegnano questa pagina, la scheda del corso e la scheda Amministrazione
// dell'ora, e sta solo qui; anche la casella singola (`casellaDelCheck`) per la
// scheda della persona.

import { allieviAttivi, nomeCompleto } from '../../domain/calculations.js'
import {
  allieviDelCheck,
  checkDelCorso,
  dataSpunta,
  gestoDelClic,
  riepilogoDelCheck,
  spuntaDelCheck,
} from '../../domain/check.js'
import { formattaData, oggi } from '../../domain/dates.js'
import type {
  Allievo,
  Check,
  ColonnaCheck,
  Corso,
  Iso,
  Lezione,
  SpuntaCheck,
} from '../../domain/models.js'
import { Molti, Uno } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { parole } from '../../domain/words.testi.js'
import { collegamento, pulsante, scheda, statoVuoto, testataVista } from '../components/base.js'
import { statoVuotoAnno } from '../components/filters.js'
import { icona } from '../components/icons.js'
import { menuContestuale, menuSotto, type ElementoMenu } from '../components/menu.js'
import { conferma } from '../components/modal.js'
import { classeDelFascicolo, corsoDelContesto, nomeDelCorso } from '../context.js'
import { h, type Figlio } from '../dom.js'
import { avvisoSpunteCheCadono, colonneAttuali, spunteCheCadonoOra } from '../forms/check.js'
import { moduloAnno, moduloColonnaCheck, moduloDataCheck } from '../forms.js'
import { azione } from '../bridge.js'
import {
  aggiorna,
  annoCorrente,
  classePerId,
  corsiDi,
  corsoPerId,
  lezioniDiCorso,
  stato,
} from '../state.js'
import { tabella } from '../components/table.js'
import { testi } from './check.testi.js'

// ------------------------------------------------------------------ il quando

/** Il quando di una spunta nuova, come lo vuole `check.spunta`. */
interface Quando {
  lezioneId?: string
  data?: Iso
}

/**
 * L'ora di oggi del corso, se c'è e non è annullata: la spunta data dalla
 * pagina durante l'ora si lega alla lezione e ne segue gli spostamenti.
 */
function lezioneDiOggi (corsoId: string): Lezione | null {
  const adesso = oggi()
  return lezioniDiCorso(corsoId).find((l) => l.data === adesso && l.stato !== 'annullata') ?? null
}

/** Il quando di una spunta data dalla pagina: l'ora di oggi, o oggi e basta. */
function quandoDallaPagina (corsoId: string): Quando {
  const lezione = lezioneDiOggi(corsoId)
  return lezione ? { lezioneId: lezione.id } : { data: oggi() }
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
 * (come `pulsanteStato` in `lesson.ts`). Fuori dalla casella perché un
 * ridisegno fra i due clic la ricrea.
 */
const inVolo = new Map<string, boolean>()

/**
 * Il numero dell'ultimo clic partito per ogni casella: il ritorno di un clic
 * toglie la voce da `inVolo` solo se è l'ultimo (confrontare il valore non
 * basta con spunta-togli-spunta).
 */
const numeroDelClic = new Map<string, number>()

async function spunta (
  corsoId: string,
  allievoId: string,
  colonnaId: string,
  fatta: boolean,
  quando: Quando | null,
): Promise<void> {
  const chiave = chiaveCasella(corsoId, allievoId, colonnaId)
  const mio = (numeroDelClic.get(chiave) ?? 0) + 1
  numeroDelClic.set(chiave, mio)
  inVolo.set(chiave, fatta)
  try {
    await azione({
      tipo: 'check.spunta',
      corsoId,
      allievoId,
      colonnaId,
      fatta,
      ...(fatta && quando ? quando : {}),
    })
  } finally {
    // Solo se nel frattempo non è partito un clic dopo.
    if (numeroDelClic.get(chiave) === mio) {
      inVolo.delete(chiave)
      numeroDelClic.delete(chiave)
    }
  }
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
  for (const allievo of mancano) await spunta(corsoId, allievo.id, colonnaId, true, quando)
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
        al: () => spunta(corsoId, allievo.id, colonna.id, true, { lezioneId: lezione.id }),
      })
    }
    // Dentro l'ora di oggi resta solo «in questa lezione», che segue l'ora.
    if (!lezione || lezione.data !== oggi()) {
      voci.push({
        testo: t.spuntaOggi,
        simbolo: lezione ? 'calendario' : 'spunta',
        // «Oggi» vuol dire quel che vuol dire dalla pagina: la lezione di oggi, o oggi.
        al: () => spunta(corsoId, allievo.id, colonna.id, true, quandoDallaPagina(corsoId)),
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
      al: () => spunta(corsoId, allievo.id, colonna.id, false, null),
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
function casellaCheck (casella: Casella): HTMLElement {
  const { corsoId, allievo, colonna, spunta: fatta, data, lezione } = casella
  const t = testi()
  const chi = `${nomeCompleto(allievo)} · ${colonna.titolo}`
  const lunga = data ? formattaData(data, 'lungo') : ''
  // Il giorno di cui si parla: quello dell'ora aperta, o oggi nella pagina.
  const contesto = lezione ? lezione.data : oggi()
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

  const bottone = h(
    'button',
    {
      class: [
        'casella-check',
        fatta && 'casella-check--fatta',
        altrove && 'casella-check--altrove',
        fatta && alClic === null && 'casella-check--ferma',
      ],
      type: 'button',
      // testo-fisso: chiave del fuoco, non si legge
      dataset: { fuoco: `check-${allievo.id}-${colonna.id}` },
      attr: {
        title: [chi, quando, gesto].filter(Boolean).join('\n'),
        'aria-label': !fatta ? t.daFare(chi) : t.spuntataIl(chi, lunga, alClic === 'togli'),
        'aria-pressed': String(Boolean(fatta)),
        'aria-haspopup': 'menu',
      },
      // Il pulsante non si spegne mai: serve il fuoco, e il menu (anche dal tasto Menu).
      onclick: () => {
        // Quel che è partito e non è tornato conta come già fatto: il secondo clic
        // toglie invece di rispuntare.
        const chiave = chiaveCasella(corsoId, allievo.id, colonna.id)
        const partita = inVolo.get(chiave)
        const dataOra = partita === undefined ? (fatta ? data : null) : partita ? contesto : null
        const esito = gestoDelClic(dataOra, contesto)
        if (esito === null) return
        void spunta(
          corsoId,
          allievo.id,
          colonna.id,
          esito === 'spunta',
          esito === 'spunta' ? quandoDelClic(corsoId, lezione) : null,
        )
      },
      oncontextmenu: (evento: MouseEvent) => apriMenu(evento, bottone, vociCasella(casella)),
    },
    fatta && data
      ? lezione && qui
        ? icona('spunta')
        : h('span', { class: 'casella-check__data' }, formattaData(data, 'corto'))
      : null,
  )
  return bottone
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
): HTMLElement {
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
export function grigliaCheck (corso: Corso, check: Check, lezione: Lezione | null): HTMLElement {
  const righe = allieviDelCheck(stato.registro, corso.id)
  const riepilogo = riepilogoDelCheck(stato.registro, corso.id)
  const colonne = check.colonne
  const t = testi()

  const testata = (colonna: ColonnaCheck, indice: number): HTMLElement => {
    // I conti dal dominio, sugli attivi, come nella scheda del corso.
    const conto = riepilogo.find((r) => r.colonna.id === colonna.id)
    const fatte = conto?.fatte ?? 0
    const totale = conto?.totale ?? 0
    const voci = (): ElementoMenu[] =>
      vociColonna(corso.id, colonna, indice, colonne.length, totale - fatte, lezione)
    const bottone = h(
      'button',
      {
        class: 'check__testata',
        type: 'button',
        // testo-fisso: chiave del fuoco, non si legge
        dataset: { fuoco: `check-colonna-${colonna.id}` },
        attr: {
          title: t.testata(colonna.titolo, fatte, totale),
          'aria-haspopup': 'menu',
        },
        onclick: () => menuSotto(bottone, voci()),
        oncontextmenu: (evento: MouseEvent) => apriMenu(evento, bottone, voci()),
      },
      h('span', { class: 'check__titolo' }, colonna.titolo),
      h(
        'span',
        { class: ['check__conto', fatte === totale && totale > 0 && 'check__conto--pieno'] },
        `${fatte}/${totale}`,
      ),
    )
    return h('th', { class: 'check__colonna', attr: { scope: 'col' } }, bottone)
  }

  const riga = (allievo: Allievo): HTMLElement =>
    h(
      'tr',
      { class: [!allievo.attivo && 'check__riga--ritirata'] },
      h(
        'th',
        { class: 'check__chi', attr: { scope: 'row' } },
        nomeCompleto(allievo),
        // Chi non frequenta più resta solo se ha qualcosa di spuntato, e lo si dice.
        allievo.attivo ? null : h('small', { class: 'check__nota' }, t.nonFrequentaPiu),
      ),
      ...colonne.map((colonna) =>
        h('td', null, casellaDelCheck(corso.id, check, allievo, colonna, lezione)),
      ),
    )

  return tabella({
    classi: { telaio: 'check__telaio', tabella: 'check' },
    etichetta: t.checkDi(nomeDelCorso(corso)),
    intestazione: [
      h('th', { class: 'check__angolo', attr: { scope: 'col' } }, Molti(lessico().pif)),
      ...colonne.map(testata),
    ],
    righe: righe.map(riga),
  })
}

// ------------------------------------------------------------------ nell'ora

/**
 * Il check dentro l'ora, nella scheda Amministrazione: un clic spunta in
 * quest'ora. Senza colonne resta solo una riga che dice dove prepararle.
 */
export function pannelloCheckDellOra (lezione: Lezione): HTMLElement | null {
  const corso = corsoPerId(lezione.corsoId)
  if (!corso) return null
  const check = checkDelCorso(stato.registro, corso.id)
  const apriPagina = (): void =>
    aggiorna({
      vista: 'check',
      ambitoCheck: 'corso',
      corsoId: corso.id,
      filtroClasseId: corso.classeId,
    })

  const t = testi()
  if (!check || check.colonne.length === 0) {
    return h(
      'p',
      { class: 'check-assente testo-quieto' },
      icona('check', 'icona--minuta'),
      t.nessunCheck,
      collegamento({ testo: t.preparaColonne, al: apriPagina }),
    )
  }

  return scheda({
    titolo: Uno(lessico().check),
    aiuto: t.aiutoOra,
    classe: 'scheda--check',
    // Nessun pulsante per la pagina del check (sta nella barra laterale); le
    // colonne si cambiano col menu sulla testata.
    contenuto: grigliaCheck(corso, check, lezione),
  })
}

// ------------------------------------------------------------------ la pagina

/** Un check del fascicolo di classe. Ogni corso conserva colonne e comandi propri. */
function schedaCheckDiClasse (corso: Corso): HTMLElement {
  const t = testi()
  const check = checkDelCorso(stato.registro, corso.id)
  const classe = classePerId(corso.classeId)
  const contenuto = !check || check.colonne.length === 0
    ? statoVuoto({
        simbolo: 'check',
        titolo: t.nessunaColonna,
        testo: t.cheColonna,
        azione: pulsante({
          testo: t.primaColonna,
          simbolo: 'piu',
          variante: 'primario',
          al: () => moduloColonnaCheck({ corsoId: corso.id }),
        }),
      })
    : allieviDelCheck(stato.registro, corso.id).length === 0
      ? statoVuoto({
          simbolo: 'utente',
          titolo: t.classeVuota,
          testo: t.righeDelCheck(classe?.nome ?? ''),
        })
      : grigliaCheck(corso, check, null)

  return scheda({
    titolo: nomeDelCorso(corso),
    sottotitolo: t.checkDelCorso,
    classe: 'scheda--check scheda--check-classe',
    contenuto,
  })
}

export function vistaCheck (): Figlio {
  if (!annoCorrente()) {
    return statoVuotoAnno({ simbolo: 'check', crea: () => moduloAnno() })
  }

  const t = testi()
  if (stato.ambitoCheck === 'classe') {
    const classe = classeDelFascicolo()
    if (!classe) {
      return statoVuoto({
        simbolo: 'check',
        titolo: t.nessunaClasseDocente,
        testo: t.checkClasseNonDisponibile,
      })
    }
    const corsi = corsiDi(classe.id)
    return h(
      'div',
      { class: 'vista vista--check vista--check-classe' },
      testataVista({
        titolo: t.checkDellaClasse,
        sottotitolo: t.comeDocenteDiClasse(classe.nome),
        contorno: h('p', { class: 'suggerimento' }, t.suggerimentoClasse),
      }),
      corsi.length > 0
        ? h('div', { class: 'elenco-schede check-classe__corsi' }, ...corsi.map(schedaCheckDiClasse))
        : statoVuoto({
            simbolo: 'check',
            titolo: t.nessunCorsoDellaClasse,
            testo: t.creaCorsoPerCheck,
          }),
    )
  }

  const corso = corsoDelContesto()
  const classe = corso ? classePerId(corso.classeId) : null
  if (!corso || !classe) {
    return statoVuoto({
      simbolo: 'check',
      titolo: t.nessunCorso,
      testo: t.checkInUnCorso,
      azione: pulsante({
        testo: t.vaiAiCorsi,
        variante: 'primario',
        al: () => aggiorna({ vista: 'corsi' }),
      }),
    })
  }

  const check = checkDelCorso(stato.registro, corso.id)
  const lezione = lezioneDiOggi(corso.id)

  return h(
    'div',
    { class: 'vista vista--check' },
    testataVista({
      titolo: Uno(lessico().check),
      sottotitolo: nomeDelCorso(corso),
      contorno: h(
        'div',
        { class: 'filtri' },
        h(
          'p',
          { class: 'suggerimento' },
          t.suggerimento(Boolean(lezione)),
        ),
      ),
    }),
    !check || check.colonne.length === 0
      ? statoVuoto({
          simbolo: 'check',
          titolo: t.nessunaColonna,
          testo: t.cheColonna,
          azione: pulsante({
            testo: t.primaColonna,
            simbolo: 'piu',
            variante: 'primario',
            al: () => moduloColonnaCheck({ corsoId: corso.id }),
          }),
        })
      : allieviDelCheck(stato.registro, corso.id).length === 0
        ? statoVuoto({
            simbolo: 'utente',
            titolo: t.classeVuota,
            testo: t.righeDelCheck(classe.nome),
          })
        : scheda({ contenuto: grigliaCheck(corso, check, null) }),
  )
}
