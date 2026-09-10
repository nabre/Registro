// Le consegne dentro una lezione.
//
// Il punto di tutta la faccenda sta qui: una consegna data il 12 deve
// ripresentarsi il 19 e il 26 finché non è chiusa, senza che nessuno debba
// ricordarsi di cercarla. Aprendo un'ora si vede in ordine quel che scade oggi,
// quel che è rimasto indietro, quel che si è dato proprio in quest'ora, e
// infine quel che sta ancora in piedi con un termine più in là.
//
// Le spunte si mettono qui, una per nome, perché è qui che si ritira: passare
// dal modulo di modifica per segnare che Rossi ha portato il compito sarebbe il
// giro lungo di un gesto che si fa venti volte in due minuti.

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
} from '../../dominio/consegne.js'
import { nomeCompleto, ordinaAllievi } from '../../dominio/calcoli.js'
import { PIF, quanti } from '../../dominio/lessico.js'
import { formattaData } from '../../dominio/date.js'
import { CHI_INSEGNA, type Consegna, type Lezione } from '../../dominio/modelli.js'
import { barra, conAttesa, pastiglia, pulsante, scheda } from '../componenti/base.js'
import { eseguiOAvvisa } from '../componenti/filtri.js'
import { icona } from '../componenti/icone.js'
import { apriModale } from '../componenti/modale.js'
import { h, rimpiazza, type Figlio } from '../dom.js'
import { moduloConsegna } from '../moduli.js'
import { azione } from '../ponte.js'
import { classeDelCorsoId, classeDiLezione, iscriviti, nomeCorso, stato } from '../stato.js'

/** Come si chiama ogni tipo, e con che icona lo si riconosce nell'elenco. */
const TIPI = {
  compito: { testo: 'compito', simbolo: 'piano' },
  studio: { testo: 'studio', simbolo: 'libro' },
  materiale: { testo: 'materiale', simbolo: 'cartella' },
  consegna: { testo: 'da consegnare', simbolo: 'allegato' },
  preparazione: { testo: 'preparazione', simbolo: 'orologio' },
  amministrativo: { testo: 'amministrativo', simbolo: 'documento' },
  altro: { testo: 'altro', simbolo: 'informazione' },
} as const

/** La classe che deve fare una consegna: quella del suo corso. */
function classeDi (consegna: Consegna) {
  return classeDelCorsoId(consegna.corsoId)
}

/** Il nome di chi deve spuntare: un allievo, o chi insegna. */
function nomeDi (chi: string, consegna: Consegna): string {
  if (chi === CHI_INSEGNA) return 'io'
  const allievo = classeDi(consegna)?.allievi.find((a) => a.id === chi)
  return allievo ? nomeCompleto(allievo) : `${PIF.singolare} uscita`
}

async function spunta (consegna: Consegna, chi: string, fatta: boolean): Promise<void> {
  await eseguiOAvvisa({ tipo: 'consegna.spunta', consegnaId: consegna.id, chi, fatta })
}

/** «Rossi M.»: in una pastiglia il nome per esteso non ci sta, il cognome sì. */
function nomeCorto (chi: string, consegna: Consegna): string {
  if (chi === CHI_INSEGNA) return 'io'
  const allievo = classeDi(consegna)?.allievi.find((a) => a.id === chi)
  if (!allievo) return 'uscito'
  return `${allievo.cognome}${allievo.nome ? ` ${allievo.nome.slice(0, 1)}.` : ''}`
}

/** Una pastiglia che si preme: premuta vuol dire fatta. */
function pastigliaSpunta (
  consegna: Consegna,
  chi: string,
  dopo?: () => void,
  perEsteso = false,
): HTMLElement {
  const fatta = haFatto(consegna, chi)
  // Su una consegna che si spunta portando un foglio, spuntare vuol dire
  // scegliere il file: una spunta senza documento direbbe che è arrivato
  // qualcosa che non c'è, e la matrice del docente di classe la smentirebbe.
  const conDocumento = raccoglieDocumento(consegna)
  return h(
    'button',
    {
      class: ['spunta-nome', fatta && 'spunta-nome--fatta'],
      type: 'button',
      attr: {
        'aria-pressed': fatta,
        title: conDocumento
          ? `${fatta ? 'Togli' : 'Raccogli'} il documento di ${nomeDi(chi, consegna)}`
          : nomeDi(chi, consegna),
      },
      onclick: (evento: MouseEvent) =>
        void conAttesa(
          evento.currentTarget as HTMLButtonElement,
          (async () => {
            if (conDocumento) {
              await azione(
                fatta
                  ? { tipo: 'consegna.file.togli', consegnaId: consegna.id, chi }
                  : { tipo: 'consegna.raccogli', consegnaId: consegna.id, chi },
              )
            } else {
              await spunta(consegna, chi, !fatta)
            }
            dopo?.()
          })(),
        ),
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
 * Il ritiro: la consegna per intero, e i nomi da spuntare.
 *
 * Le caselle in linea non funzionavano in nessuna delle due direzioni. Aperte
 * facevano una parete su ogni riga; chiuse dietro una fisarmonica costringevano
 * ad aprirle una per una e si richiudevano al primo ridisegno. Il ritiro è un
 * gesto a sé — ci si ferma, si guarda una consegna sola, si fa l'appello dei
 * nomi — e un gesto a sé vuole una finestra sua, dove i nomi stanno per esteso e
 * ci si sta larghi.
 *
 * Le spunte partono subito, una per una: non c'è niente da salvare in fondo, e
 * chiudere la finestra a metà non perde nulla. Il contenuto si ridisegna a ogni
 * spunta perché i conti in cima devono seguire quel che si preme.
 */
export function moduloSpunta (consegnaId: string, opzioni: { lezione?: Lezione } = {}): void {
  const corpo = h('div', { class: 'modulo ritiro' })

  const disegna = () => {
    // Si rilegge ogni volta dallo stato: la finestra vive fuori dal ciclo di
    // ridisegno del pannello, e con una copia in mano mostrerebbe i conti di
    // com'era quando è stata aperta.
    const consegna = stato.registro.consegne.find((c) => c.id === consegnaId)
    if (!consegna) {
      rimpiazza(corpo, h('p', { class: 'testo-quieto' }, 'La consegna non c’è più.'))
      return
    }

    const classe = classeDi(consegna)
    const avanzamento = avanzamentoConsegna(consegna, classe)
    const ordinati = inOrdine(consegna, avanzamento.destinatari)
    const scadenza = scadenzaConsegna(stato.registro, consegna)
    const tipo = TIPI[consegna.tipo]

    const tutti = (fatta: boolean) => async () => {
      // In sequenza e non in parallelo: ogni spunta è una scrittura sullo
      // stesso file, e mandarle insieme farebbe vincere l'ultima che arriva.
      // Non si ridisegna qui: lo stato nuovo arriva un istante dopo la
      // risposta, e ridisegnare subito mostrerebbe ancora quello vecchio —
      // il ridisegno vero lo fa l'iscrizione a `iscriviti`, quando arriva.
      for (const chi of ordinati) {
        if (haFatto(consegna, chi) !== fatta) await spunta(consegna, chi, fatta)
      }
    }

    rimpiazza(
      corpo,
      h(
        'div',
        { class: 'ritiro__testa' },
        pastiglia(tipo.testo, 'quiete', tipo.simbolo),
        consegna.a === 'docente'
          ? pastiglia('tocca a me', 'informativo', 'utente')
          : consegna.a === 'allievi'
            ? pastiglia('solo ad alcuni', 'informativo', 'utente')
            : pastiglia('tutta la classe', 'quiete', 'classi'),
        avanzamento.completa ? pastiglia('fatta da tutti', 'positivo', 'spunta') : null,
      ),
      h(
        'p',
        { class: 'ritiro__quando' },
        `Data ${formattaData(dataConsegna(stato.registro, consegna), 'lungo')}`,
        scadenza
          ? h('span', null, ` · da fare per ${formattaData(scadenza, 'lungo')}`)
          : h('span', { class: 'testo-quieto' }, ' · senza termine'),
      ),
      consegna.note ? h('p', { class: 'ritiro__note' }, consegna.note) : null,

      avanzamento.senzaNessuno
        ? h(
            'p',
            { class: 'consegna__nota' },
            consegna.a === 'allievi'
              ? `Nessuna delle ${PIF.plurale} scelte frequenta più: resta aperta finché non la si chiude.`
              : `La classe non ha ancora ${PIF.plurale}: resta aperta finché non la si chiude.`,
          )
        : h(
            'div',
            { class: 'ritiro__conto' },
            barra(avanzamento.quota, avanzamento.completa ? 'positivo' : 'informativo'),
            h(
              'strong',
              null,
              `${avanzamento.fatte} su ${avanzamento.destinatari.length}`,
            ),
            avanzamento.mancano.length > 0
              ? h(
                  'span',
                  { class: 'testo-quieto' },
                  `mancano ${avanzamento.mancano.length}`,
                )
              : h('span', { class: 'testo-quieto' }, 'fatta da tutti'),
          ),

      avanzamento.destinatari.length > 1
        ? h(
            'div',
            { class: 'ritiro__comandi' },
            pulsante({ testo: 'Segna tutti', simbolo: 'spunta', variante: 'sottile', al: tutti(true) }),
            pulsante({ testo: 'Togli tutti', simbolo: 'ricarica', variante: 'fantasma', al: tutti(false) }),
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
  // La modale vive fuori dal ciclo di ridisegno del pannello: senza
  // iscriversi qui, un clic ridisegnerebbe leggendo lo stato di prima —
  // quello nuovo arriva un istante dopo la risposta — e la pastiglia
  // cambierebbe solo al clic successivo.
  const disiscriviti = iscriviti(disegna)

  apriModale({
    titolo: stato.registro.consegne.find((c) => c.id === consegnaId)?.testo ?? 'Consegna',
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
        // «Spunta tutti» invece di «Chiudi comunque»: lo stesso clic, ma quel
        // che resta scritto è una spunta per nome e non un interruttore che
        // diceva «fatta» anche di chi non aveva portato niente.
        pulsante({
          testo: 'Spunta tutti',
          simbolo: 'spunta',
          variante: 'sottile',
          titolo: 'Segna come fatta da tutti quelli a cui era stata data',
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
          testo: 'Modifica',
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
 * Quel che della consegna si vede nella riga: il conto, e i primi nomi che
 * mancano. Premendolo si apre il ritiro.
 *
 * Chi tocca a una persona sola non ha niente da aprire: c'è una cosa da premere
 * e sta lì.
 */
function spunte (consegna: Consegna, lezione?: Lezione): Figlio {
  const classe = classeDi(consegna)
  const avanzamento = avanzamentoConsegna(consegna, classe)

  if (avanzamento.senzaNessuno) {
    // Resta aperta lo stesso: è settembre, la classe c'è e le iscrizioni non
    // ancora. Contarla come fatta la farebbe sparire il minuto dopo averla
    // scritta, ed è esattamente quel che non deve succedere a una consegna.
    return h(
      'p',
      { class: 'consegna__nota' },
      consegna.a === 'allievi'
        ? `Nessuna delle ${PIF.plurale} scelte frequenta più: resta aperta finché non la si chiude.`
        : `La classe non ha ancora ${PIF.plurale}: resta aperta finché non la si chiude.`,
    )
  }

  const ordinati = inOrdine(consegna, avanzamento.destinatari)
  if (ordinati.length === 1) {
    return h('div', { class: 'consegna__spunte-poche' }, pastigliaSpunta(consegna, ordinati[0]))
  }

  const primi = avanzamento.mancano.slice(0, 3).map((chi) => nomeCorto(chi, consegna))
  const riassunto =
    avanzamento.mancano.length === 0
      ? 'fatta da tutti'
      : `mancano ${primi.join(', ')}${
          avanzamento.mancano.length > primi.length
            ? ` +${avanzamento.mancano.length - primi.length}`
            : ''
        }`

  return h(
    'button',
    {
      class: 'consegna__riassunto',
      type: 'button',
      attr: { title: 'Apri il ritiro e spunta i nomi' },
      onclick: () => moduloSpunta(consegna.id, { lezione }),
    },
    barra(avanzamento.quota, avanzamento.completa ? 'positivo' : 'informativo'),
    h('span', { class: 'consegna__conto' }, `${avanzamento.fatte}/${avanzamento.destinatari.length}`),
    h('span', { class: 'testo-quieto' }, riassunto),
  )
}

export type TonoConsegna = 'scade' | 'arretrata' | 'aperta' | 'data' | 'fatta'

/**
 * Una consegna, dovunque la si guardi.
 *
 * Non dipende più dalla lezione da cui la si apre: la classe se la ricava dal
 * corso. Serve perché la stessa riga sta dentro un'ora e dentro la pagina che
 * le raccoglie tutte, e due disegni della stessa cosa finirebbero per divergere
 * proprio nel dettaglio che conta — quale spunta è già stata messa.
 */
export function rigaConsegna (
  consegna: Consegna,
  tono: TonoConsegna,
  opzioni: { lezione?: Lezione, mostraCorso?: boolean } = {},
): HTMLElement {
  const classe = classeDi(consegna)
  const avanzamento = avanzamentoConsegna(consegna, classe)
  const scadenza = scadenzaConsegna(stato.registro, consegna)
  const data = dataConsegna(stato.registro, consegna)
  const tipo = TIPI[consegna.tipo]

  return h(
    'article',
    { class: ['consegna', `consegna--${tono}`] },
    h(
      'header',
      { class: 'consegna__testata' },
      h('span', { class: 'consegna__tipo', attr: { title: tipo.testo } }, icona(tipo.simbolo)),
      h('strong', { class: 'consegna__testo' }, consegna.testo),
      opzioni.mostraCorso
        ? h('span', { class: 'consegna__corso' }, nomeCorso(consegna.corsoId))
        : null,
      consegna.documento !== undefined
        ? pastiglia(consegna.documento, 'quiete', 'documento')
        : null,
      // Il verso cambia che cosa manca da fare, e il todo lo deve dire con
      // parole diverse: «da consegnare a dodici» non è «ne mancano dodici».
      siConsegna(consegna)
        ? h(
            'span',
            { class: 'consegna__distribuzione' },
            pastiglia(
              consegna.modoConsegna === 'email' ? 'consegno per mail' : 'consegno a mano',
              'informativo',
              consegna.modoConsegna === 'email' ? 'posta' : 'utente',
            ),
            daConsegnareA(consegna, classe).length > 0
              ? pastiglia(`da consegnare a ${daConsegnareA(consegna, classe).length}`, 'attenzione')
              : null,
            senzaDocumento(consegna, classe).length > 0
              ? pastiglia(
                  `${senzaDocumento(consegna, classe).length} senza documento`,
                  'negativo',
                  'avviso',
                )
              : null,
          )
        : null,
      avanzamento.senzaNessuno ? pastiglia('senza destinatari', 'attenzione', 'avviso') : null,
      consegna.a === 'docente'
        ? pastiglia('io', 'informativo', 'utente')
        : consegna.a === 'allievi'
          ? pastiglia(quanti(consegna.allieviIds.length, PIF), 'informativo', 'utente')
          : pastiglia('classe', 'quiete', 'classi'),
      // Spunta chi manca, o toglie le spunte nude: il gesto rapido di una riga
      // intera, che però scrive un nome alla volta. Quelle con un documento
      // raccolto restano — quel foglio è arrivato davvero.
      pulsante({
        simbolo: avanzamento.completa ? 'ricarica' : 'spunta',
        variante: 'fantasma',
        titolo: avanzamento.completa
          ? 'Toglie le spunte e torna a chiederla'
          : `Spunta i ${avanzamento.mancano.length} che mancano`,
        al: () =>
          eseguiOAvvisa({
            tipo: 'consegna.spuntaTutti',
            consegnaId: consegna.id,
            fatta: !avanzamento.completa,
          }),
      }),
      pulsante({
        simbolo: 'matita',
        variante: 'fantasma',
        titolo: 'Modifica la consegna',
        al: () => moduloConsegna({ consegna, lezione: opzioni.lezione }),
      }),
    ),
    h(
      'p',
      { class: 'consegna__quando' },
      `data il ${formattaData(data, 'giorno')}`,
      scadenza
        ? h(
            'span',
            { class: ['consegna__scadenza', tono === 'arretrata' && 'consegna__scadenza--tardi'] },
            ` · per ${formattaData(scadenza, 'giorno')}`,
          )
        : h('span', { class: 'testo-quieto' }, ' · senza termine'),
      consegna.note ? h('span', { class: 'testo-quieto' }, ` · ${consegna.note}`) : null,
    ),
    spunte(consegna, opzioni.lezione),
  )
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
    // Senza titolo il gruppo è già dentro qualcosa che lo nomina — il blocco
    // delle fatte, che dice quante sono nella sua linguetta.
    titolo ? h('h4', { class: 'consegne__titolo' }, `${titolo} · ${consegne.length}`) : null,
    ...consegne.map((consegna) => rigaConsegna(consegna, tono, opzioni)),
  )
}

/**
 * Le consegne del registro dell'ora, in una scheda loro.
 *
 * Stavano dentro lo svolgimento, dove prima c'era il campo di testo «compiti
 * assegnati», e quel posto le raccontava male: lo svolgimento sono tre campi
 * di testo che si riempiono a fine ora e non si toccano più, le consegne sono
 * un elenco vivo — si spunta, si sposta una scadenza, se ne aggiunge una
 * mentre la classe esce. Due gesti diversi con ritmi diversi infilati nello
 * stesso riquadro: per arrivare al consuntivo bisognava scorrere l'elenco
 * delle consegne, e l'elenco a sua volta si perdeva fra i campi di testo. Qui
 * ha la sua scheda, con il conto delle aperte nel sottotitolo e il suo
 * pulsante in testata, dove si cerca.
 *
 * L'ordine non è alfabetico né cronologico: è quello dell'urgenza. Prima quel
 * che è rimasto indietro — perché è la cosa che si dimentica — poi quel che
 * scade adesso, poi quel che si è dato proprio in quest'ora, e in fondo quel
 * che sta ancora in piedi.
 */
export function pannelloConsegne (lezione: Lezione): HTMLElement {
  const classe = classeDiLezione(lezione)
  const gruppi = consegneDellaLezione(stato.registro, lezione, classe)
  const quante =
    gruppi.arretrate.length + gruppi.scadono.length + gruppi.date.length + gruppi.aperte.length

  // Quelle date qui compaiono già fra le aperte o le scadute: si mostrano a
  // parte solo se non sono comparse altrove, o si leggerebbero due volte.
  const gia = new Set([...gruppi.arretrate, ...gruppi.scadono, ...gruppi.aperte].map((c) => c.id))
  const soloDate = gruppi.date.filter((c) => !gia.has(c.id))

  // Quel che è rimasto indietro si dice nel sottotitolo: è l'unico numero per
  // cui vale la pena aprire la scheda quando è chiusa in fondo alla colonna.
  const sottotitolo =
    gruppi.arretrate.length > 0
      ? `${gruppi.arretrate.length} rimaste indietro · ${quante} in tutto`
      : 'quel che si è dato da fare, finché non è fatto'

  return scheda({
    titolo: 'Consegne',
    sottotitolo,
    classe: 'scheda--consegne',
    azioni: pulsante({
      testo: 'Nuova consegna',
      simbolo: 'piu',
      variante: 'sottile',
      al: () => moduloConsegna({ lezione }),
    }),
    contenuto:
      quante === 0
        ? h(
            'p',
            { class: 'testo-quieto' },
            'Niente in sospeso per questo corso. Quel che si assegna qui torna a galla ' +
              'nelle lezioni successive finché non è spuntato.',
          )
        : h(
            'div',
            { class: 'consegne' },
            gruppoConsegne('Rimaste indietro', gruppi.arretrate, 'arretrata', { lezione }),
            gruppoConsegne('Scadono oggi', gruppi.scadono, 'scade', { lezione }),
            gruppoConsegne('Date in questa lezione', soloDate, 'data', { lezione }),
            gruppoConsegne('Ancora aperte', gruppi.aperte, 'aperta', { lezione }),
          ),
  })
}
