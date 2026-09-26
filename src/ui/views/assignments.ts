// Le consegne dentro una lezione.
// Una consegna si ripresenta a ogni ora finché non è chiusa. Aprendo un'ora si
// vede quel che scade oggi, quel che è rimasto indietro, quel che si è dato in
// quest'ora e quel che resta aperto. Le spunte si mettono qui, una per nome.

import {
  avanzamentoConsegna,
  raccoglieDocumento,
  consegneDellaLezione,
  daConsegnareA,
  dataConsegna,
  haFatto,
  scadenzaConsegna,
  senzaDocumento,
  siConsegna,
  spuntaDi,
} from '../../domain/assignments.js'
import { gestoDelClic } from '../../domain/check.js'
import { nomeCompleto, ordinaAllievi } from '../../domain/calculations.js'
import { Molti, Uno, quanti } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { parole } from '../../domain/words.testi.js'
import { formattaData, giornoDi, oggi } from '../../domain/dates.js'
import { CHI_INSEGNA, type Consegna, type Lezione } from '../../domain/models.js'
import { barra, conAttesa, pastiglia, pulsante, scheda, titoloGruppo } from '../components/base.js'
import { eseguiOAvvisa } from '../components/filters.js'
import { icona } from '../components/icons.js'
import { menuContestuale, type ElementoMenu } from '../components/menu.js'
import { apriModale, conferma } from '../components/modal.js'
import { h, rimpiazza, type Figlio } from '../dom.js'
import { corsoPendenza, pendenza } from '../components/pending.js'
import { moduloConsegna } from '../forms.js'
import { azione } from '../bridge.js'
import { classeDelCorsoId, classeDiLezione, iscriviti, nomeCorso, stato } from '../state.js'
import { testi } from './assignments.testi.js'

/** Con che icona si riconosce ogni tipo nell'elenco; il nome sta nel catalogo. */
const SIMBOLI_TIPO = {
  compito: 'piano',
  studio: 'libro',
  materiale: 'cartella',
  consegna: 'allegato',
  preparazione: 'orologio',
  amministrativo: 'documento',
  altro: 'informazione',
} as const

/** La classe che deve fare una consegna: quella del suo corso. */
function classeDi (consegna: Consegna) {
  return classeDelCorsoId(consegna.corsoId)
}

/** Il nome di chi deve spuntare: un allievo, o chi insegna. */
function nomeDi (chi: string, consegna: Consegna): string {
  if (chi === CHI_INSEGNA) return testi().io
  const allievo = classeDi(consegna)?.allievi.find((a) => a.id === chi)
  return allievo ? nomeCompleto(allievo) : testi().pifUscita
}

async function spunta (consegna: Consegna, chi: string, fatta: boolean): Promise<void> {
  await eseguiOAvvisa({ tipo: 'consegna.spunta', consegnaId: consegna.id, chi, fatta })
}

/** «Rossi M.»: in una pastiglia il nome per esteso non ci sta, il cognome sì. */
function nomeCorto (chi: string, consegna: Consegna): string {
  if (chi === CHI_INSEGNA) return testi().io
  const allievo = classeDi(consegna)?.allievi.find((a) => a.id === chi)
  if (!allievo) return testi().uscito
  return `${allievo.cognome}${allievo.nome ? ` ${allievo.nome.slice(0, 1)}.` : ''}`
}

/**
 * Una pastiglia che si preme: premuta vuol dire fatta. Il clic segue la regola
 * del check (`gestoDelClic`): vuota si spunta, spuntata oggi si toglie,
 * spuntata un altro giorno si toglie solo dal tasto destro. Il giorno è quello
 * di `fattaIl`, quindi «oggi» anche dentro un'ora di un'altra data.
 */
function pastigliaSpunta (
  consegna: Consegna,
  chi: string,
  dopo?: () => void,
  perEsteso = false,
): HTMLElement {
  const spuntata = spuntaDi(consegna, chi)
  const fatta = spuntata !== null
  // Un istante illeggibile vale «un altro giorno»: nel dubbio il clic non cancella.
  const alClic = gestoDelClic(spuntata ? (giornoDi(spuntata.fattaIl) ?? '') : null, oggi())
  // Su una consegna che raccoglie un foglio, spuntare vuol dire scegliere il
  // file: una spunta senza documento contraddirebbe la matrice del docente di classe.
  const conDocumento = raccoglieDocumento(consegna)
  const cambia = (bottone: HTMLButtonElement, fai: boolean): void =>
    void conAttesa(
      bottone,
      (async () => {
        if (conDocumento) {
          await azione(
            fai
              ? { tipo: 'consegna.raccogli', consegnaId: consegna.id, chi }
              : { tipo: 'consegna.file.togli', consegnaId: consegna.id, chi },
          )
        } else {
          await spunta(consegna, chi, fai)
        }
        dopo?.()
      })(),
    )
  const t = testi()
  const gesto =
    alClic === 'spunta'
      ? t.clicPerSpuntare(conDocumento)
      : alClic === 'togli'
        ? t.clicPerTogliere(conDocumento)
        : t.spuntataIl(formattaData(giornoDi(spuntata?.fattaIl) ?? '', 'lungo'), conDocumento)
  const voci = (bottone: HTMLButtonElement): ElementoMenu[] => [
    { titolo: nomeDi(chi, consegna) },
    fatta
      ? {
          testo: conDocumento ? t.togliDocumento : t.togliSpunta,
          simbolo: 'chiudi',
          pericolo: true,
          al: () => cambia(bottone, false),
        }
      : {
          testo: conDocumento ? t.raccogliDocumento : t.spunta,
          simbolo: 'spunta',
          al: () => cambia(bottone, true),
        },
  ]
  return h(
    'button',
    {
      class: ['spunta-nome', fatta && 'spunta-nome--fatta'],
      type: 'button',
      attr: {
        'aria-pressed': fatta,
        'aria-haspopup': 'menu',
        title: `${nomeDi(chi, consegna)}
${gesto}.`,
      },
      onclick: (evento: MouseEvent) => {
        if (alClic === null) return
        cambia(evento.currentTarget as HTMLButtonElement, alClic === 'spunta')
      },
      oncontextmenu: (evento: MouseEvent) => {
        const bottone = evento.currentTarget as HTMLButtonElement
        menuContestuale(evento, voci(bottone), bottone)
      },
    },
    fatta ? icona('spunta', 'icona--minuta') : null,
    h('span', null, perEsteso ? nomeDi(chi, consegna) : nomeCorto(chi, consegna)),
  )
}

/** I destinatari nell'ordine in cui si chiamano facendo il giro dei banchi. */
function inOrdine (consegna: Consegna, destinatari: string[]): string[] {
  if (consegna.a === 'docente') return destinatari
  const classe = classeDi(consegna)
  return ordinaAllievi((classe?.allievi ?? []).filter((a) => destinatari.includes(a.id))).map(
    (a) => a.id,
  )
}

/**
 * Il ritiro: la consegna per intero e i nomi da spuntare, in una finestra sua.
 * Le spunte partono subito, una per una: chiudere a metà non perde niente. Il
 * contenuto si ridisegna a ogni spunta perché i conti seguano.
 */
function moduloSpunta (consegnaId: string, opzioni: { lezione?: Lezione } = {}): void {
  const corpo = h('div', { class: 'modulo ritiro' })
  const t = testi()

  const disegna = () => {
    // Si rilegge dallo stato ogni volta: la finestra vive fuori dal ciclo di ridisegno.
    const consegna = stato.registro.consegne.find((c) => c.id === consegnaId)
    if (!consegna) {
      rimpiazza(corpo, h('p', { class: 'testo-quieto' }, t.nonCePiu))
      return
    }

    const classe = classeDi(consegna)
    const avanzamento = avanzamentoConsegna(consegna, classe)
    const ordinati = inOrdine(consegna, avanzamento.destinatari)
    const scadenza = scadenzaConsegna(stato.registro, consegna)

    const tutti = (fatta: boolean) => async () => {
      // In sequenza: ogni spunta è una scrittura sullo stesso file, e insieme
      // vincerebbe l'ultima. Il ridisegno lo fa `iscriviti` quando arriva lo stato nuovo.
      for (const chi of ordinati) {
        if (haFatto(consegna, chi) !== fatta) await spunta(consegna, chi, fatta)
      }
    }

    rimpiazza(
      corpo,
      h(
        'div',
        { class: 'ritiro__testa' },
        pastiglia(t.tipi[consegna.tipo], 'quiete', SIMBOLI_TIPO[consegna.tipo]),
        consegna.a === 'docente'
          ? pastiglia(t.toccaAMe, 'informativo', 'utente')
          : consegna.a === 'allievi'
            ? pastiglia(t.soloAdAlcuni, 'informativo', 'utente')
            : pastiglia(t.tuttaLaClasse, 'quiete', 'classi'),
        avanzamento.completa ? pastiglia(t.fattaDaTutti, 'positivo', 'spunta') : null,
      ),
      h(
        'p',
        { class: 'ritiro__quando' },
        t.dataIl(formattaData(dataConsegna(stato.registro, consegna), 'lungo')),
        scadenza
          ? h('span', null, t.daFarePer(formattaData(scadenza, 'lungo')))
          : h('span', { class: 'testo-quieto' }, t.senzaTermine),
      ),
      consegna.note ? h('p', { class: 'ritiro__note' }, consegna.note) : null,

      avanzamento.senzaNessuno
        ? h(
            'p',
            { class: 'consegna__nota' },
            consegna.a === 'allievi' ? t.nessunaDelleScelte : t.classeSenzaPif,
          )
        : h(
            'div',
            { class: 'ritiro__conto' },
            barra(avanzamento.quota, avanzamento.completa ? 'positivo' : 'informativo'),
            h(
              'strong',
              null,
              t.suTotale(avanzamento.fatte, avanzamento.destinatari.length),
            ),
            avanzamento.mancano.length > 0
              ? h(
                  'span',
                  { class: 'testo-quieto' },
                  t.mancanoN(avanzamento.mancano.length),
                )
              : h('span', { class: 'testo-quieto' }, t.fattaDaTutti),
          ),

      avanzamento.destinatari.length > 1
        ? h(
            'div',
            { class: 'ritiro__comandi' },
            pulsante({ testo: t.segnaTutti, simbolo: 'spunta', variante: 'sottile', al: tutti(true) }),
            pulsante({ testo: t.togliTutti, simbolo: 'ricarica', variante: 'fantasma', al: tutti(false) }),
          )
        : null,

      h(
        'div',
        { class: 'ritiro__nomi' },
        ...ordinati.map((chi) => pastigliaSpunta(consegna, chi, undefined, true)),
      ),
    )
  }

  disegna()
  // La modale vive fuori dal ciclo di ridisegno: si iscrive allo stato, che
  // arriva un istante dopo la risposta.
  const disiscriviti = iscriviti(disegna)

  apriModale({
    titolo:
      stato.registro.consegne.find((c) => c.id === consegnaId)?.testo ?? Uno(lessico().consegna),
    sottotitolo: nomeCorso(
      stato.registro.consegne.find((c) => c.id === consegnaId)?.corsoId ?? null,
    ),
    larghezza: 'media',
    corpo: () => corpo,
    allaChiusura: disiscriviti,
    azioniSecondarie: (contesto) => {
      const consegna = stato.registro.consegne.find((c) => c.id === consegnaId)
      if (!consegna) return null
      return [
        // «Spunta tutti»: scrive una spunta per nome, non un «fatta» generico.
        pulsante({
          testo: t.spuntaTutti,
          simbolo: 'spunta',
          variante: 'sottile',
          titolo: t.spuntaTuttiAiuto,
          al: async () => {
            const risposta = await eseguiOAvvisa({
              tipo: 'consegna.spuntaTutti',
              consegnaId: consegna.id,
              fatta: true,
            })
            if (risposta.ok) contesto.chiudi()
          },
        }),
        pulsante({
          testo: parole().modifica,
          simbolo: 'matita',
          variante: 'fantasma',
          al: () => {
            contesto.chiudi()
            moduloConsegna({ consegna, lezione: opzioni.lezione })
          },
        }),
      ]
    },
  })
}

/**
 * Quel che della consegna si vede nella riga: il conto e i primi nomi che
 * mancano; premendolo si apre il ritiro. Per una persona sola c'è solo la pastiglia.
 */
function spunte (consegna: Consegna, lezione?: Lezione): Figlio {
  const t = testi()
  const classe = classeDi(consegna)
  const avanzamento = avanzamentoConsegna(consegna, classe)

  if (avanzamento.senzaNessuno) {
    // Senza destinatari (a settembre, prima delle iscrizioni) resta aperta: contarla
    // come fatta la farebbe sparire.
    return h(
      'p',
      { class: 'consegna__nota' },
      consegna.a === 'allievi' ? t.nessunaDelleScelte : t.classeSenzaPif,
    )
  }

  const ordinati = inOrdine(consegna, avanzamento.destinatari)
  if (ordinati.length === 1) {
    return h('div', { class: 'consegna__spunte-poche' }, pastigliaSpunta(consegna, ordinati[0]))
  }

  const primi = avanzamento.mancano.slice(0, 3).map((chi) => nomeCorto(chi, consegna))
  const riassunto =
    avanzamento.mancano.length === 0
      ? t.fattaDaTutti
      : t.mancanoNomi(primi.join(', '), avanzamento.mancano.length - primi.length)

  return h(
    'button',
    {
      class: 'consegna__riassunto',
      type: 'button',
      attr: { title: t.apriRitiro },
      onclick: () => moduloSpunta(consegna.id, { lezione }),
    },
    barra(avanzamento.quota, avanzamento.completa ? 'positivo' : 'informativo'),
    h('span', { class: 'consegna__conto' }, `${avanzamento.fatte}/${avanzamento.destinatari.length}`),
    h('span', { class: 'testo-quieto' }, riassunto),
  )
}

type TonoConsegna = 'scade' | 'arretrata' | 'aperta' | 'data' | 'fatta'

/**
 * Una consegna, dovunque la si guardi: la classe viene dal corso, così la
 * stessa riga serve dentro un'ora e nella pagina che le raccoglie.
 */
function rigaConsegna (
  consegna: Consegna,
  tono: TonoConsegna,
  opzioni: { lezione?: Lezione, mostraCorso?: boolean } = {},
): HTMLElement {
  const classe = classeDi(consegna)
  const avanzamento = avanzamentoConsegna(consegna, classe)
  const scadenza = scadenzaConsegna(stato.registro, consegna)
  const data = dataConsegna(stato.registro, consegna)
  const t = testi()
  const L = lessico()

  return pendenza({
    classe: 'consegna',
    // testo-fisso: classe CSS
    stato: [`consegna--${tono}`],
    testata: [
      h(
        'span',
        { class: 'consegna__tipo', attr: { title: t.tipi[consegna.tipo] } },
        icona(SIMBOLI_TIPO[consegna.tipo]),
      ),
      h('strong', { class: 'consegna__testo' }, consegna.testo),
      opzioni.mostraCorso ? corsoPendenza('consegna', nomeCorso(consegna.corsoId)) : null,
      consegna.documento !== undefined
        ? pastiglia(consegna.documento, 'quiete', 'documento')
        : null,
      // Il verso cambia che cosa manca, e va detto con parole diverse.
      siConsegna(consegna)
        ? h(
            'span',
            { class: 'consegna__distribuzione' },
            pastiglia(
              consegna.modoConsegna === 'email' ? t.consegnoPerEmail : t.consegnoAMano,
              'informativo',
              consegna.modoConsegna === 'email' ? 'posta' : 'utente',
            ),
            daConsegnareA(consegna, classe).length > 0
              ? pastiglia(t.daConsegnareA(daConsegnareA(consegna, classe).length), 'attenzione')
              : null,
            senzaDocumento(consegna, classe).length > 0
              ? pastiglia(
                  t.senzaDocumento(senzaDocumento(consegna, classe).length),
                  'negativo',
                  'avviso',
                )
              : null,
          )
        : null,
      avanzamento.senzaNessuno ? pastiglia(t.senzaDestinatari, 'attenzione', 'avviso') : null,
      consegna.a === 'docente'
        ? pastiglia(t.io, 'informativo', 'utente')
        : consegna.a === 'allievi'
          ? pastiglia(quanti(consegna.allieviIds.length, L.pif), 'informativo', 'utente')
          : pastiglia(L.classe.singolare, 'quiete', 'classi'),
      // Spunta chi manca, o toglie le spunte senza documento (una scrittura per
      // nome); quelle con un foglio raccolto restano.
      pulsante({
        simbolo: avanzamento.completa ? 'ricarica' : 'spunta',
        variante: 'fantasma',
        titolo: avanzamento.completa
          ? t.togliSpunteAiuto
          : t.spuntaIMancanti(avanzamento.mancano.length),
        al: async () => {
          // Togliere le spunte cancella il lavoro di una classe e non si ricorda: si chiede.
          const nude = consegna.fatte.filter((f) => !f.file).length
          if (avanzamento.completa && nude > 0) {
            const vai = await conferma({
              titolo: t.togliereSpunte(nude),
              testo: t.togliereSpunteTesto,
              testoConferma: parole().togli,
              pericolo: true,
            })
            if (!vai) return
          }
          await eseguiOAvvisa({
            tipo: 'consegna.spuntaTutti',
            consegnaId: consegna.id,
            fatta: !avanzamento.completa,
          })
        },
      }),
      pulsante({
        simbolo: 'matita',
        variante: 'fantasma',
        titolo: t.modificaConsegna,
        al: () => moduloConsegna({ consegna, lezione: opzioni.lezione }),
      }),
    ],
    quando: [
      t.dataIlGiorno(formattaData(data, 'giorno')),
      scadenza
        ? h(
            'span',
            { class: ['consegna__scadenza', tono === 'arretrata' && 'consegna__scadenza--tardi'] },
            t.per(formattaData(scadenza, 'giorno')),
          )
        : h('span', { class: 'testo-quieto' }, t.senzaTermine),
      consegna.note ? h('span', { class: 'testo-quieto' }, ` · ${consegna.note}`) : null,
    ],
    coda: [spunte(consegna, opzioni.lezione)],
  })
}

export function gruppoConsegne (
  titolo: string,
  consegne: Consegna[],
  tono: TonoConsegna,
  opzioni: { lezione?: Lezione, mostraCorso?: boolean } = {},
): Figlio {
  if (consegne.length === 0) return null
  return h(
    'section',
    { class: 'consegne__gruppo' },
    // Senza titolo il gruppo è già dentro qualcosa che lo nomina.
    titolo ? titoloGruppo(titolo, consegne.length) : null,
    ...consegne.map((consegna) => rigaConsegna(consegna, tono, opzioni)),
  )
}

/**
 * Le consegne del registro della lezione, in una scheda loro, con il conto
 * delle aperte nel sottotitolo. In ordine di urgenza: arretrate, in scadenza,
 * date in quest'ora, ancora aperte.
 */
export function pannelloConsegne (lezione: Lezione): HTMLElement {
  const classe = classeDiLezione(lezione)
  const gruppi = consegneDellaLezione(stato.registro, lezione, classe)
  const quante =
    gruppi.arretrate.length + gruppi.scadono.length + gruppi.date.length + gruppi.aperte.length

  // Quelle date qui si mostrano a parte solo se non sono già in un altro gruppo.
  const t = testi()
  const gia = new Set([...gruppi.arretrate, ...gruppi.scadono, ...gruppi.aperte].map((c) => c.id))
  const soloDate = gruppi.date.filter((c) => !gia.has(c.id))

  // Le arretrate nel sottotitolo: si vedono anche a scheda chiusa.
  const sottotitolo =
    gruppi.arretrate.length > 0
      ? t.arretrateInTutto(gruppi.arretrate.length, quante)
      : t.sottotitolo

  return scheda({
    titolo: Molti(lessico().consegna),
    sottotitolo,
    classe: 'scheda--consegne',
    azioni: pulsante({
      testo: t.nuovaConsegna,
      simbolo: 'piu',
      variante: 'sottile',
      al: () => moduloConsegna({ lezione }),
    }),
    contenuto:
      quante === 0
        ? h(
            'p',
            { class: 'testo-quieto' },
            t.nienteInSospeso,
          )
        : h(
            'div',
            { class: 'consegne' },
            gruppoConsegne(t.rimasteIndietro, gruppi.arretrate, 'arretrata', { lezione }),
            gruppoConsegne(t.scadonoOggi, gruppi.scadono, 'scade', { lezione }),
            gruppoConsegne(t.dateInQuestaLezione, soloDate, 'data', { lezione }),
            gruppoConsegne(t.ancoraAperte, gruppi.aperte, 'aperta', { lezione }),
          ),
  })
}
