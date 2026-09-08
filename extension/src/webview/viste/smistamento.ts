// La bozza di smistamento: quel che il registro propone, e quel che resta da
// decidere a mano.
//
// Nella cassetta si butta un PDF di classe e qui compare la sua bozza: un
// blocco per documento, con scritto di chi il registro crede che sia. Niente
// viene archiviato prima di una conferma — riconoscere un nome è un'ipotesi, e
// un documento finito nel fascicolo sbagliato è un errore che nessuno scopre
// finché non serve quel documento.
//
// Il giro è quello: si guarda la pagina, si controlla il nome, si conferma. Chi
// si fida della bozza intera la conferma in un gesto solo; chi ha una scansione
// che nessuno legge dice a mano le pagine, l'allievo e il documento.
//
// La lettura delle scansioni non è istantanea: decine di secondi a pagina. Per
// questo non si aspetta un pulsante, si mette in coda — e la coda si vede,
// perché un lavoro che dura minuti e non si mostra è indistinguibile da un
// programma rotto.

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '../../dominio/calcoli.js'
import { avanzamentoConsegna, consegneDocumento } from '../../dominio/consegne.js'
import { formattaData } from '../../dominio/date.js'
import type { BloccoDaSmistare, Classe, Consegna, Smistamento } from '../../dominio/modelli.js'
import {
  nomeProposto,
  smistamentiDellaClasse,
  spiegaMotivo,
} from '../../dominio/smistamento.js'
import { campo, conAttesa, pastiglia, pulsante, scheda, statoVuoto } from '../componenti/base.js'
import { eseguiOAvvisa } from '../componenti/filtri.js'
import { apriModale } from '../componenti/modale.js'
import { notifica } from '../componenti/notifiche.js'
import { h } from '../dom.js'
import { corsiDi, stato, uriDato } from '../stato.js'

/** Manda l'azione e racconta l'errore dov'è successo, senza ricaricare la pagina. */
const esegui = eseguiOAvvisa

/** Le pagine di un blocco, dette come si dicono a voce. */
function etichettaPagine (blocco: { da: number, a: number }): string {
  return blocco.da === blocco.a ? `pagina ${blocco.da}` : `pagine ${blocco.da}–${blocco.a}`
}

/** Il tono con cui si guarda un blocco: proposto è quasi fatto, il resto no. */
function tonoMotivo (blocco: BloccoDaSmistare): 'attenzione' | 'informativo' | 'negativo' {
  if (blocco.allievoId) return 'informativo'
  return blocco.motivo === 'senza-testo' ? 'attenzione' : 'negativo'
}

/**
 * Che cosa sta succedendo alle pagine di un blocco.
 *
 * La coda è fatta di pagine e i blocchi si rifanno a ogni lettura: un blocco è
 * «in lettura» quando la pagina che si sta guardando è una delle sue.
 */
function statoLettura (
  smistamentoId: string,
  blocco: { da: number, a: number },
): 'fermo' | 'in-coda' | 'in-corso' {
  const { corrente, coda } = stato.lavoro
  const sua = (voce: { smistamentoId: string, pagina: number }) =>
    voce.smistamentoId === smistamentoId && voce.pagina >= blocco.da && voce.pagina <= blocco.a
  if (corrente && sua(corrente)) return 'in-corso'
  return coda.some(sua) ? 'in-coda' : 'fermo'
}

/**
 * La fotografia della prima pagina del blocco.
 *
 * È la cosa che risponde davvero alla domanda: su una scansione il nome si
 * legge a occhio in un secondo, mentre una trascrizione va controllata. Piccola
 * di suo, si apre con un clic — il pannello non è un lettore di PDF, e per
 * sfogliare c'è il lettore del sistema.
 */
function anteprimaBlocco (smistamento: Smistamento, blocco: BloccoDaSmistare) {
  const indirizzo = uriDato(blocco.anteprima)
  if (!indirizzo) return null

  return h(
    'button',
    {
      class: 'blocco-smistato__anteprima',
      type: 'button',
      attr: { title: 'Apri queste pagine nel lettore di PDF' },
      onclick: (evento: MouseEvent) =>
        void conAttesa(
          evento.currentTarget as HTMLButtonElement,
          esegui({
            tipo: 'smistamento.apriBlocco',
            smistamentoId: smistamento.id,
            bloccoId: blocco.id,
          }),
        ),
    },
    h('img', {
      class: 'blocco-smistato__foto',
      attr: { src: indirizzo, alt: `Anteprima ${etichettaPagine(blocco)}`, loading: 'lazy' },
    }),
  )
}

/**
 * La riga di un blocco: di chi il registro crede che sia, da che pagina a che
 * pagina, e i gesti possibili — guardarlo, farlo leggere, confermarlo, buttarlo.
 *
 * I campi non si mandano mentre si scrivono: si leggono al momento del clic. È
 * la stessa regola di tutti i moduli del registro, e qui conta il doppio —
 * cambiare l'intervallo ridisegnerebbe la riga sotto le dita.
 */
function rigaBlocco (smistamento: Smistamento, blocco: BloccoDaSmistare, classe: Classe | null) {
  const allievi = ordinaAllievi((classe?.allievi ?? []).filter((a) => a.attivo))
  const lettura = statoLettura(smistamento.id, blocco)
  const proposto = nomeProposto(blocco, classe)

  const scelta = h(
    'select',
    {
      class: 'campo__controllo blocco-smistato__chi',
      dataset: { fuoco: `smistato-chi-${blocco.id}` },
    },
    h('option', { value: '' }, 'Di chi sono queste pagine…'),
    ...allievi.map((allievo) =>
      h(
        'option',
        {
          value: allievo.id,
          attr: { selected: allievo.id === blocco.allievoId ? 'selected' : null },
        },
        nomeCompleto(allievo),
      ),
    ),
  )

  const numero = (valore: number, titolo: string, fuoco: string) =>
    h('input', {
      class: 'campo__controllo blocco-smistato__pagina',
      dataset: { fuoco },
      attr: {
        type: 'number',
        min: String(blocco.da),
        max: String(blocco.a),
        value: String(valore),
        title: titolo,
      },
    })
  // Con `data-fuoco`, un messaggio di avanzamento della lettura — che arriva
  // mentre si sta ancora scegliendo — ridisegna la riga senza scacciare il
  // fuoco da questi campi: senza, ogni pagina letta altrove azzerava la scelta.
  const daCampo = numero(blocco.da, 'Dalla pagina', `smistato-da-${blocco.id}`)
  const aCampo = numero(blocco.a, 'Alla pagina', `smistato-a-${blocco.id}`)

  return h(
    'li',
    {
      class: [
        'blocco-smistato',
        blocco.allievoId && 'blocco-smistato--proposto',
        lettura === 'in-corso' && 'blocco-smistato--in-lettura',
      ],
    },
    h(
      'div',
      { class: 'blocco-smistato__testata' },
      h('strong', null, etichettaPagine(blocco)),
      proposto
        ? pastiglia(`bozza: ${proposto}`, 'informativo', 'spunta')
        : pastiglia(spiegaMotivo(blocco.motivo), tonoMotivo(blocco)),
      blocco.lettura === 'ocr' ? pastiglia('letto dalla scansione', 'neutro') : null,
      lettura === 'in-corso' ? pastiglia('lettura in corso', 'informativo') : null,
      lettura === 'in-coda' ? pastiglia('in coda', 'neutro') : null,
    ),
    h(
      'div',
      { class: 'blocco-smistato__corpo' },
      anteprimaBlocco(smistamento, blocco),
      h(
        'p',
        { class: 'blocco-smistato__estratto testo-quieto' },
        blocco.estratto || 'Nessun testo su queste pagine.',
      ),
    ),
    lettura === 'in-corso' ? h('div', { class: 'barra-lavoro' }, h('span', null)) : null,
    h(
      'div',
      { class: 'blocco-smistato__azioni' },
      scelta,
      h('span', { class: 'blocco-smistato__intervallo' }, daCampo, h('span', null, '–'), aCampo),
      pulsante({
        testo: blocco.allievoId ? 'Conferma' : 'Assegna',
        simbolo: 'spunta',
        variante: 'primario',
        al: () => {
          if (!scelta.value) {
            notifica('Scegliere l’allievo a cui vanno queste pagine.', 'avviso')
            return
          }
          const da = Number(daCampo.value)
          const a = Number(aCampo.value)
          // L'host clampa solo il verso «a dentro l'intervallo del blocco»: un
          // inizio dopo la fine passerebbe comunque, e la pagina di fine finita
          // prima di quella di inizio non ha nessun modo di dirsi da sola.
          if (da > a) {
            notifica('La pagina di inizio non può essere dopo quella di fine.', 'avviso')
            return
          }
          return esegui({
            tipo: 'smistamento.assegna',
            smistamentoId: smistamento.id,
            bloccoId: blocco.id,
            allievoId: scelta.value,
            da,
            a,
          })
        },
      }),
      // L'anteprima si chiede una volta sola: dopo c'è, e il pulsante lascia il
      // posto alla fotografia.
      blocco.anteprima
        ? null
        : pulsante({
            testo: 'Anteprima',
            simbolo: 'immagine',
            variante: 'sottile',
            titolo: 'Mostra la fotografia della prima pagina del blocco',
            al: () =>
              esegui({
                tipo: 'smistamento.anteprima',
                smistamentoId: smistamento.id,
                bloccoId: blocco.id,
              }),
          }),
      pulsante({
        testo: 'Apri le pagine',
        simbolo: 'documento',
        variante: 'fantasma',
        titolo: 'Apre solo queste pagine nel lettore di PDF del sistema',
        al: () =>
          esegui({
            tipo: 'smistamento.apriBlocco',
            smistamentoId: smistamento.id,
            bloccoId: blocco.id,
          }),
      }),
      // La lettura automatica si offre dove serve davvero: su pagine che testo
      // non ne hanno. Sulle altre il testo c'è già, e riconoscerlo è compito
      // dell'indice della classe, non di un modello.
      //
      // Spenta, il pulsante non sparisce: diventa quello che la accende. Un
      // comando che non c'è non si può nemmeno cercare, ed è esattamente qui
      // che ci si chiede se il registro sappia leggere una scansione.
      blocco.lettura !== 'testo'
        ? !stato.ocrAttivo
          ? pulsante({
              testo: 'Attiva la lettura',
              simbolo: 'impostazioni',
              variante: 'sottile',
              titolo:
                'La lettura automatica delle scansioni è spenta: apre le impostazioni su «registroDocenti.ocr.attivo».',
              al: () => esegui({ tipo: 'smistamento.impostazioni' }),
            })
          : pulsante({
              testo: lettura === 'fermo' ? 'Leggi la scansione' : 'In lettura…',
              simbolo: 'ricarica',
              variante: 'sottile',
              disabilitato: lettura !== 'fermo',
              titolo: 'Mette in coda la lettura: qualche decina di secondi per pagina.',
              al: () =>
                esegui({
                  tipo: 'smistamento.leggi',
                  smistamentoId: smistamento.id,
                  bloccoId: blocco.id,
                }),
            })
        : null,
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: 'Scarta queste pagine: non vanno a nessuno',
        al: () =>
          esegui({
            tipo: 'smistamento.scarta',
            smistamentoId: smistamento.id,
            bloccoId: blocco.id,
          }),
      }),
    ),
  )
}

/**
 * L'assegnazione a mano, in fondo a ogni PDF: pagine, allievo, documento.
 *
 * È la via che non passa dal riconoscimento, e serve sempre — le scansioni che
 * nessun OCR legge, i documenti in cui il nome non c'è. Il documento si sceglie
 * qui e non si eredita: in un PDF di segreteria possono esserci due pratiche
 * diverse, e archiviarne una sotto il nome dell'altra è un errore che si scopre
 * mesi dopo.
 */
function assegnazioneManuale (smistamento: Smistamento, classe: Classe, richieste: Consegna[]) {
  const allievi = ordinaAllievi(allieviAttivi(classe))

  const daCampo = h('input', {
    class: 'campo__controllo blocco-smistato__pagina',
    dataset: { fuoco: `manuale-da-${smistamento.id}` },
    attr: { type: 'number', min: '1', max: String(smistamento.pagine), value: '1', title: 'Dalla pagina' },
  })
  const aCampo = h('input', {
    class: 'campo__controllo blocco-smistato__pagina',
    dataset: { fuoco: `manuale-a-${smistamento.id}` },
    attr: { type: 'number', min: '1', max: String(smistamento.pagine), value: '1', title: 'Alla pagina' },
  })
  const chi = h(
    'select',
    { class: 'campo__controllo blocco-smistato__chi', dataset: { fuoco: `manuale-chi-${smistamento.id}` } },
    h('option', { value: '' }, 'Allievo…'),
    ...allievi.map((allievo) => h('option', { value: allievo.id }, nomeCompleto(allievo))),
  )
  const documento = h(
    'select',
    { class: 'campo__controllo', dataset: { fuoco: `manuale-documento-${smistamento.id}` } },
    ...richieste.map((consegna) =>
      h(
        'option',
        {
          value: consegna.id,
          attr: { selected: consegna.id === smistamento.consegnaId ? 'selected' : null },
        },
        consegna.testo,
      ),
    ),
  )

  return h(
    'div',
    { class: 'smistamento__manuale' },
    h('span', { class: 'testo-quieto' }, 'A mano:'),
    h('span', { class: 'blocco-smistato__intervallo' }, daCampo, h('span', null, '–'), aCampo),
    chi,
    documento,
    pulsante({
      testo: 'Assegna',
      simbolo: 'spunta',
      variante: 'sottile',
      al: () => {
        if (!chi.value || !documento.value) {
          notifica('Servono l’allievo e il documento.', 'avviso')
          return
        }
        const da = Number(daCampo.value)
        const a = Number(aCampo.value)
        if (da > a) {
          notifica('La pagina di inizio non può essere dopo quella di fine.', 'avviso')
          return
        }
        return esegui({
          tipo: 'smistamento.assegnaManuale',
          smistamentoId: smistamento.id,
          consegnaId: documento.value,
          allievoId: chi.value,
          da,
          a,
        })
      },
    }),
  )
}

/** Il selettore con cui si dice a quale richiesta appartiene un PDF orfano. */
function agganciaConsegna (smistamento: Smistamento, richieste: Consegna[]) {
  const scelta = h(
    'select',
    { class: 'campo__controllo' },
    h('option', { value: '' }, 'A quale documento appartiene…'),
    ...richieste.map((consegna) => h('option', { value: consegna.id }, consegna.testo)),
  )

  return h(
    'div',
    { class: 'blocco-smistato__azioni' },
    scelta,
    pulsante({
      testo: 'Aggancia e riprova',
      simbolo: 'documento',
      variante: 'primario',
      al: () => {
        if (!scelta.value) {
          notifica('Scegliere il documento a cui appartiene il PDF.', 'avviso')
          return
        }
        return esegui({
          tipo: 'smistamento.aggancia',
          smistamentoId: smistamento.id,
          consegnaId: scelta.value,
        })
      },
    }),
  )
}

/** Un PDF in attesa, con la sua bozza. */
function rigaSmistamento (smistamento: Smistamento, classe: Classe, richieste: Consegna[]) {
  const consegna = stato.registro.consegne.find((c) => c.id === smistamento.consegnaId) ?? null
  const arrivato = formattaData(smistamento.arrivatoIl.slice(0, 10))
  const proposte = smistamento.blocchi.filter((b) => b.allievoId)
  const daLeggere = smistamento.letture.filter((l) => l.lettura === 'niente').length

  return h(
    'li',
    { class: 'smistamento' },
    h(
      'div',
      { class: 'smistamento__testata' },
      h('strong', { class: 'smistamento__nome' }, smistamento.nome),
      consegna
        ? pastiglia(consegna.testo, 'neutro', 'documento')
        : pastiglia('senza documento', 'negativo'),
      h(
        'span',
        { class: 'testo-quieto' },
        `${smistamento.pagine} pagine · arrivato il ${arrivato}` +
          (smistamento.assegnate.length > 0
            ? ` · ${smistamento.assegnate.length} già archiviati`
            : ''),
      ),
      h(
        'span',
        { class: 'smistamento__azioni' },
        proposte.length > 0
          ? pulsante({
              testo: `Conferma le ${proposte.length} proposte`,
              simbolo: 'spunta',
              variante: 'primario',
              titolo: 'Archivia in un gesto tutte le righe che hanno già un nome',
              al: () =>
                esegui({ tipo: 'smistamento.confermaTutto', smistamentoId: smistamento.id }),
            })
          : null,
        // Leggere tutto è il gesto normale su una scansione: un documento
        // scansionato lo è per intero, e chiederlo pagina per pagina sarebbe
        // dodici clic per la stessa risposta.
        daLeggere > 0 && stato.ocrAttivo
          ? pulsante({
              testo: `Leggi tutto (${daLeggere})`,
              simbolo: 'ricarica',
              variante: 'sottile',
              titolo: 'Mette in coda tutte le pagine ancora da leggere di questo PDF',
              al: () =>
                esegui({ tipo: 'smistamento.leggiTutto', smistamentoId: smistamento.id }),
            })
          : null,
        pulsante({
          simbolo: 'documento',
          variante: 'fantasma',
          titolo: 'Apri il PDF originale',
          al: () => esegui({ tipo: 'smistamento.apri', smistamentoId: smistamento.id }),
        }),
        pulsante({
          simbolo: 'cestino',
          variante: 'fantasma',
          titolo: 'Butta via il PDF e tutto quel che resta da smistare',
          al: () => esegui({ tipo: 'smistamento.elimina', smistamentoId: smistamento.id }),
        }),
      ),
    ),
    smistamento.errore
      ? h('p', { class: 'smistamento__errore testo-quieto' }, smistamento.errore)
      : null,
    consegna
      ? h(
          'div',
          null,
          h(
            'ul',
            { class: 'elenco-blocchi' },
            ...smistamento.blocchi.map((blocco) => rigaBlocco(smistamento, blocco, classe)),
          ),
          richieste.length > 0 ? assegnazioneManuale(smistamento, classe, richieste) : null,
        )
      : agganciaConsegna(smistamento, richieste),
  )
}

/**
 * La coda di lettura: che cosa sta macinando la macchina e che cosa aspetta.
 *
 * Una barra che scorre senza dire una percentuale sul singolo foglio, perché
 * quella non c'è: un OCR impiega quel che impiega, e inventare una stima
 * vorrebbe dire mentire a chi la guarda. Quel che si dice è vero — quante
 * pagine sono fatte, quante ne restano — e c'è il modo di fermare tutto.
 */
function schedaCoda () {
  const { corrente, fatte, totale, coda } = stato.lavoro
  if (!corrente && coda.length === 0) return null

  return h(
    'div',
    { class: 'lavoro-ocr' },
    h(
      'div',
      { class: 'lavoro-ocr__testata' },
      h('span', null, corrente ? `Sto leggendo ${corrente.etichetta}` : 'Lettura in avvio…'),
      totale > 0 ? pastiglia(`${fatte} di ${totale}`, 'informativo') : null,
      coda.length > 0 ? pastiglia(`${coda.length} in coda`, 'neutro') : null,
      pulsante({
        testo: 'Ferma',
        simbolo: 'chiudi',
        variante: 'fantasma',
        classe: 'lavoro-ocr__ferma',
        titolo: 'Svuota la coda: la pagina in corso finisce, il resto non parte',
        al: () => esegui({ tipo: 'smistamento.fermaLettura' }),
      }),
    ),
    h('div', { class: 'barra-lavoro' }, h('span', null)),
    coda.length > 0
      ? h(
          'ul',
          { class: 'lavoro-ocr__coda' },
          ...coda.slice(0, 6).map((voce) => h('li', { class: 'testo-quieto' }, voce.etichetta)),
          coda.length > 6
            ? h('li', { class: 'testo-quieto' }, `…e altre ${coda.length - 6}`)
            : null,
        )
      : null,
  )
}

/** I byte di un file trascinato, in base64: è così che passano il ponte. */
async function inBase64 (file: File): Promise<string> {
  const byte = new Uint8Array(await file.arrayBuffer())
  let testo = ''
  // A pezzi, e non con lo spread: un PDF di quattro megabyte diventa quattro
  // milioni di argomenti, e `String.fromCharCode` li rifiuta.
  const PASSO = 8192
  for (let i = 0; i < byte.length; i += PASSO) {
    testo += String.fromCharCode(...byte.subarray(i, i + PASSO))
  }
  return btoa(testo)
}

/**
 * Chiede a quale documento appartiene un file appena trascinato.
 *
 * Si chiede sempre, anche quando la richiesta aperta è una sola: un PDF che
 * finisce nel documento sbagliato costa più di un clic, e il momento in cui si
 * lascia il file è esattamente quello in cui chi trascina sa la risposta.
 */
function chiediDocumento (nome: string, richieste: Consegna[]): Promise<string | null> {
  return new Promise((risolvi) => {
    let scelto: string | null = null
    apriModale({
      titolo: 'A quale documento appartiene?',
      sottotitolo: nome,
      larghezza: 'stretta',
      corpo: () =>
        h(
          'div',
          { class: 'modulo' },
          campo({
            nome: 'consegnaId',
            etichetta: 'Documento',
            tipo: 'select',
            valore: richieste[0]?.id ?? '',
            opzioni: richieste.map((consegna) => ({
              valore: consegna.id,
              testo: `${consegna.testo}${consegna.verso === 'consegno' ? ' — lo consegno io' : ''}`,
            })),
          }),
        ),
      testoSalva: 'Smista',
      alSalva: (valori, contesto) => {
        scelto = String(valori.consegnaId ?? '') || null
        contesto.chiudi()
      },
      allaChiusura: () => risolvi(scelto),
    })
  })
}

/**
 * La zona in cui si lasciano cadere i PDF.
 *
 * È il gesto che chi insegna fa già: il file arriva per mail, lo si trascina
 * dove va. La cartella «in-arrivo» resta — serve quando il registro è chiuso, e
 * per i file che si scaricano a mucchi — ma pretendere di passare sempre dal
 * gestore file per un PDF che si ha già sotto il puntatore è una cerimonia.
 */
function zonaTrascinamento (richieste: Consegna[]) {
  const zona = h(
    'div',
    { class: 'zona-trascinamento' },
    h('span', null, 'Trascina qui i PDF di classe: ti chiedo a quale documento appartengono.'),
  )

  const acceso = (attivo: boolean) => zona.classList.toggle('zona-trascinamento--attiva', attivo)

  zona.addEventListener('dragover', (evento: DragEvent) => {
    evento.preventDefault()
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'copy'
    acceso(true)
  })
  zona.addEventListener('dragleave', () => acceso(false))
  zona.addEventListener('drop', (evento: DragEvent) => {
    evento.preventDefault()
    acceso(false)
    const file = [...(evento.dataTransfer?.files ?? [])]
    if (file.length === 0) {
      notifica('Da lì non è arrivato nessun file: trascinane uno dal gestore file.', 'avviso')
      return
    }
    void deposita(file, richieste)
  })

  return zona
}

/** Uno per uno: si chiede il documento e si manda all'host. */
async function deposita (file: File[], richieste: Consegna[]): Promise<void> {
  for (const uno of file) {
    if (!uno.name.toLowerCase().endsWith('.pdf')) {
      notifica(`«${uno.name}» non è un PDF: lo smistamento lavora solo su quelli.`, 'avviso')
      continue
    }
    const consegnaId = await chiediDocumento(uno.name, richieste)
    if (!consegnaId) continue
    notifica(`«${uno.name}»: lo sto dividendo…`, 'info')
    await esegui({
      tipo: 'smistamento.deposita',
      consegnaId,
      nome: uno.name,
      contenuto: await inBase64(uno),
    })
  }
}

/**
 * La scheda dello smistamento, sotto i documenti del docente di classe.
 *
 * Quando non c'è niente in attesa non sparisce: resta a dire dov'è la cassetta
 * e che cosa succede a buttarci dentro un PDF. È l'unico posto in cui quella
 * cartella viene nominata, e una funzionalità che nessuno sa di avere vale
 * quanto una che non c'è.
 */
export function schedaSmistamento (classe: Classe) {
  const corsi = corsiDi(classe.id)
  // Aperte vuol dire che manca ancora il foglio di qualcuno: sono quelle a
  // cui lo smistatore prova ad assegnare le pagine.
  const richieste = consegneDocumento(stato.registro, corsi).filter(
    (c) => !avanzamentoConsegna(c, classe).completa,
  )
  const suoi = smistamentiDellaClasse(
    stato.registro.smistamenti,
    classe.id,
    richieste.map((c) => c.id),
  )
  const pagine = suoi.reduce(
    (totale, s) => totale + s.blocchi.reduce((n, b) => n + (b.a - b.da + 1), 0),
    0,
  )
  const proposte = suoi.reduce((n, s) => n + s.blocchi.filter((b) => b.allievoId).length, 0)
  const daLeggere = suoi.reduce(
    (n, s) => n + (s.consegnaId ? s.letture.filter((l) => l.lettura === 'niente').length : 0),
    0,
  )

  return scheda({
    titolo: 'Da smistare',
    sottotitolo:
      suoi.length === 0
        ? 'i PDF di classe si dividono da soli, e si confermano a mano'
        : `${pagine} pagine in attesa` + (proposte > 0 ? `, ${proposte} già proposte` : ''),
    azioni: [
      stato.ocrAttivo
        ? daLeggere > 0
          ? pulsante({
              testo: `Leggi tutte le scansioni (${daLeggere})`,
              simbolo: 'ricarica',
              variante: 'sottile',
              titolo: 'Mette in coda ogni pagina senza testo di questa classe',
              al: () =>
                // Tutte insieme, e il pulsante aspetta l'ultima: mettere in coda
                // otto scansioni e vedere il pulsante ancora pronto faceva
                // premere due volte, e la coda raddoppiava.
                Promise.all(
                  suoi
                    .filter(
                      (smistamento) =>
                        smistamento.consegnaId &&
                        smistamento.letture.some((l) => l.lettura === 'niente'),
                    )
                    .map((smistamento) =>
                      esegui({ tipo: 'smistamento.leggiTutto', smistamentoId: smistamento.id }),
                    ),
                ),
            })
          : null
        : pulsante({
            testo: 'Lettura scansioni: spenta',
            simbolo: 'impostazioni',
            variante: 'fantasma',
            titolo: 'Apre le impostazioni di VS Code su «registroDocenti.ocr.attivo»',
            al: () => esegui({ tipo: 'smistamento.impostazioni' }),
          }),
      pulsante({
        testo: 'Apri la cassetta',
        simbolo: 'cartella',
        variante: 'sottile',
        titolo: 'Apre «in-arrivo»: i PDF lasciati lì dentro vengono divisi e proposti',
        al: () => esegui({ tipo: 'smistamento.apriCassetta' }),
      }),
      richieste.length > 0
        ? pulsante({
            testo: 'Carica un PDF',
            simbolo: 'piu',
            variante: 'primario',
            al: async () => {
              // Una richiesta sola: non c'è niente da chiedere. Più d'una, si
              // sceglie con la stessa modale del trascinamento — mandarlo alla
              // cassetta con solo una notifica lasciava lì un file a metà.
              let consegnaId: string | null = richieste[0]?.id ?? null
              if (richieste.length > 1) {
                consegnaId = await chiediDocumento('PDF di classe', richieste)
              }
              if (!consegnaId) return
              await esegui({ tipo: 'smistamento.carica', consegnaId })
            },
          })
        : null,
    ],
    contenuto: h(
      'div',
      null,
      richieste.length > 0 ? zonaTrascinamento(richieste) : null,
      schedaCoda(),
      suoi.length === 0
        ? statoVuoto({
            simbolo: 'cartella',
            titolo: 'Niente in attesa',
            testo:
              'Un PDF con le pagelle di tutta la classe si butta nella cartella «in-arrivo», ' +
              'dentro quella del documento che si sta raccogliendo: viene diviso, ogni pezzo ' +
              'viene attribuito all’allievo nominato nelle sue pagine, e la bozza compare qui ' +
              'in attesa di una conferma.',
          })
        : h(
            'ul',
            { class: 'elenco-smistamenti' },
            ...suoi.map((s) => rigaSmistamento(s, classe, richieste)),
          ),
    ),
  })
}
