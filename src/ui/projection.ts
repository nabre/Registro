// Lo schermo che guarda la classe: un'applicazione a sé che riceve un pacchetto
// già filtrato (i blocchi accesi dal docente) e lo disegna grande. Non manda
// niente indietro e non ha comandi; il codice del registro non entra, solo `dom.ts`.

// Per prima: la lingua della pagina, prima che qualunque altro modulo si carichi.
import '../i18n/page.js'
import './styles/projection.css'

import { graficoNote } from './components/notes.js'
import { h, rimpiazza, type Figlio } from './dom.js'
import type {
  AnnoProiettato,
  AppelloProiettato,
  CalendarioProiettato,
  ConsegnaProiettata,
  ContenutoProiezione,
  DocumentoProiettato,
  GiornoAnno,
  GiornoProiettato,
  MeseProiettato,
  OraProiettata,
  RisorsaProiettata,
  SettimanaProiettata,
  TappaProiettata,
  ValutazioneProiettata,
  VoceCalendario,
} from '../domain/projection.js'
import type { MessaggioProiezione } from '../protocol.js'
import { quieto } from './components/base.js'
import { parole } from '../domain/words.testi.js'
import { testi } from './projection.testi.js'

declare function acquireVsCodeApi (): { postMessage (messaggio: unknown): void }

// Si acquisisce comunque: la chiamata accende l'ascolto dei messaggi nel
// preload. Per mandare non serve.
acquireVsCodeApi()

const radice = document.getElementById('radice')

let contenuto: ContenutoProiezione | null = null
let radiceDati: string | null = null

/** L'indirizzo di un file della cartella dei dati: ogni pezzo va codificato. */
function uriDato (relativo: string | undefined): string | null {
  if (!relativo || !radiceDati) return null
  const pezzi = relativo.split('/').filter(Boolean).map(encodeURIComponent)
  return pezzi.length > 0 ? `${radiceDati}/${pezzi.join('/')}` : null
}

// ------------------------------------------------------------------ pezzi

function sezione (titolo: string, ...figli: Figlio[]): HTMLElement {
  return sezioneCon(null, titolo, ...figli)
}

/**
 * Una scheda con una classe sua: il calendario deve prendersi tutta l'altezza,
 * e il riquadro deve saperlo.
 */
function sezioneCon (classe: string | null, titolo: string, ...figli: Figlio[]): HTMLElement {
  return h(
    'section',
    { class: ['blocco', classe] },
    h('h2', { class: 'blocco__titolo' }, titolo),
    h('div', { class: 'blocco__corpo' }, ...figli),
  )
}

/**
 * La testata: una riga sola e piccola, per chi entra a metà ora. Lo spazio è
 * del contenuto.
 */
function intestazione (dati: ContenutoProiezione['intestazione']): HTMLElement {
  const quando = [dati.data, dati.orario, dati.aula ? testi().aula(dati.aula) : null]
    .filter(Boolean)
  return h(
    'header',
    { class: 'testata' },
    h(
      'div',
      { class: 'testata__chi' },
      dati.classe ? h('span', { class: 'testata__classe' }, dati.classe) : null,
      dati.materia ? h('span', { class: 'testata__materia' }, dati.materia) : null,
      // Il titolo del piano di seguito, non sopra: in una riga sola si taglia.
      dati.titolo ? h('span', { class: 'testata__titolo' }, dati.titolo) : null,
    ),
    quando.length > 0 ? h('div', { class: 'testata__quando' }, quando.join(' · ')) : null,
  )
}

function risorsa (voce: RisorsaProiettata): Figlio {
  if (voce.tipo === 'immagine') {
    const src = uriDato(voce.file)
    if (!src) return null
    return h(
      'figure',
      { class: 'figura' },
      h('img', { class: 'figura__immagine', src, alt: voce.titolo }),
      h('figcaption', { class: 'figura__nome' }, voce.titolo),
    )
  }
  // Un collegamento resta scritto per esteso: la classe lo copia dallo schermo.
  return h(
    'div',
    { class: 'risorsa' },
    h('span', { class: 'risorsa__nome' }, voce.titolo),
    voce.tipo === 'collegamento' && voce.url
      ? h('span', { class: 'risorsa__indirizzo' }, voce.url)
      : null,
  )
}

function tappa (voce: TappaProiettata, numero: number): HTMLElement {
  return h(
    'li',
    // La tinta arriva già scelta: il foglio di stile la legge da `--tinta`.
    // testo-fisso: classe CSS
    { class: ['tappa', `tappa--${voce.stato}`], style: { '--tinta': voce.colore } },
    h(
      'div',
      { class: 'tappa__riga' },
      h('span', { class: 'tappa__numero' }, String(numero)),
      h('span', { class: 'tappa__titolo' }, voce.titolo),
      voce.valutata ? h('span', { class: 'segno segno--prova' }, testi().prova) : null,
      h('span', { class: 'tappa__durata' }, voce.durata),
    ),
    h(
      'div',
      { class: 'tappa__sotto' },
      h('span', { class: 'tappa__tipo' }, voce.nomeTipo),
      voce.materiali ? h('span', { class: 'tappa__materiali' }, voce.materiali) : null,
    ),
    voce.descrizione ? h('p', { class: 'tappa__descrizione' }, voce.descrizione) : null,
    voce.risorse.length > 0
      ? h('div', { class: 'tappa__risorse' }, ...voce.risorse.map(risorsa))
      : null,
  )
}

function scaletta (tappe: TappaProiettata[]): Figlio {
  if (tappe.length === 0) return null
  return sezione(
    testi().cheCosaFacciamo,
    h('ol', { class: 'scaletta' }, ...tappe.map((t, i) => tappa(t, i + 1))),
  )
}

function argomenti (dati: NonNullable<ContenutoProiezione['argomenti']>): Figlio {
  if (!dati.argomenti && !dati.materiali) return null
  const t = testi()
  return sezione(
    parole().oggi,
    dati.argomenti ? h('p', { class: 'testo-grande' }, dati.argomenti) : null,
    dati.materiali
      ? quieto(t.portare, h('strong', null, dati.materiali))
      : null,
  )
}

function consegne (elenco: ConsegnaProiettata[]): Figlio {
  if (elenco.length === 0) return null
  return sezione(
    testi().daFare,
    h(
      'ul',
      { class: 'elenco' },
      ...elenco.map((voce) =>
        h(
          'li',
          // testo-fisso: classe CSS
          { class: ['voce', `voce--${voce.stato}`] },
          h(
            'div',
            { class: 'voce__riga' },
            h('span', { class: 'voce__testo' }, voce.testo),
            voce.scadenza ? h('span', { class: 'voce__quando' }, voce.scadenza) : null,
          ),
          h(
            'div',
            { class: 'voce__sotto' },
            voce.a,
            voce.note ? ` · ${voce.note}` : null,
          ),
        ),
      ),
    ),
  )
}

// ------------------------------------------------------------- calendario

/*
 * Le quattro viste, disposte come quelle del registro: il docente indica lo
 * schermo («qui, giovedì») e il punto deve essere lo stesso. Qui però non si
 * scorre: la griglia prende l'altezza che c'è e le ore stanno in percentuale
 * della fascia.
 */

/** Che giorno è, detto con i segni buoni per tutte e tre le griglie. */
function classiGiorno (giorno: GiornoProiettato): Array<string | false> {
  return [
    giorno.oggi && 'giorno--oggi',
    giorno.festivo && 'giorno--festivo',
    Boolean(giorno.chiuso) && 'giorno--chiuso',
    giorno.fuori && 'giorno--fuori',
  ]
}

/** Il rettangolo di un'ora nella griglia della settimana: in percentuale, non in pixel. */
function oraNellaGriglia (ora: OraProiettata, da: number, durata: number): Figlio {
  if (ora.daMinuti === null || ora.aMinuti === null) return null
  const alto = ((ora.daMinuti - da) / durata) * 100
  const altezza = ((ora.aMinuti - ora.daMinuti) / durata) * 100
  return h(
    'div',
    {
      // testo-fisso: classe CSS
      class: ['ora-blocco', `ora-blocco--${ora.stato}`, ora.corrente && 'ora-blocco--adesso'],
      style: { top: `${alto}%`, height: `${altezza}%` },
    },
    h('span', { class: 'ora-blocco__quando' }, ora.inizio ?? ''),
    h('span', { class: 'ora-blocco__titolo' }, ora.titolo),
  )
}

function vistaSettimana (settimana: SettimanaProiettata): Figlio {
  const durata = Math.max(1, settimana.aMinuti - settimana.daMinuti)
  const colonne = `3.2em repeat(${settimana.giorni.length}, 1fr)`

  return h(
    'div',
    { class: 'calendario-settimana' },
    h(
      'div',
      { class: 'calendario-settimana__testa', style: { gridTemplateColumns: colonne } },
      h(
        'div',
        { class: 'calendario-settimana__angolo' },
        `s. ${settimana.numero}`,
        settimana.lettera
          ? h('span', { class: 'calendario-settimana__lettera' }, settimana.lettera)
          : null,
      ),
      ...settimana.giorni.map((giorno) =>
        h(
          'div',
          { class: ['calendario-settimana__giorno', ...classiGiorno(giorno)] },
          h('span', { class: 'calendario-settimana__nome' }, giorno.nome),
          h('span', { class: 'calendario-settimana__numero' }, String(giorno.numero)),
          giorno.chiuso ? h('span', { class: 'segno-chiusura' }, giorno.chiuso) : null,
          giorno.semestre ? h('span', { class: 'segno-semestre' }, giorno.semestre) : null,
        ),
      ),
    ),
    h(
      'div',
      { class: 'calendario-settimana__corpo', style: { gridTemplateColumns: colonne } },
      h(
        'div',
        { class: 'calendario-settimana__ore' },
        ...settimana.ore.map((ora) =>
          h(
            'span',
            {
              class: 'calendario-settimana__ora',
              style: { top: `${((ora.minuti - settimana.daMinuti) / durata) * 100}%` },
            },
            ora.etichetta,
          ),
        ),
      ),
      ...settimana.giorni.map((giorno) =>
        h(
          'div',
          { class: ['calendario-settimana__colonna', ...classiGiorno(giorno)] },
          ...settimana.ore.map((ora) =>
            h('span', {
              class: 'calendario-settimana__riga',
              style: { top: `${((ora.minuti - settimana.daMinuti) / durata) * 100}%` },
            }),
          ),
          ...giorno.ore.map((ora) => oraNellaGriglia(ora, settimana.daMinuti, durata)),
          // Le prove non hanno un'ora: stanno in fondo alla colonna, tutte insieme.
          giorno.prove.length > 0
            ? h(
                'div',
                { class: 'giorno-prove' },
                ...giorno.prove.map((prova) =>
                  h('div', { class: 'giorno-prova' }, prova.titolo),
                ),
              )
            : null,
        ),
      ),
    ),
  )
}

function vistaMese (mese: MeseProiettato): Figlio {
  const colonne = `2.6em repeat(${mese.colonne.length}, 1fr)`

  return h(
    'div',
    { class: 'calendario-mese' },
    h(
      'div',
      { class: 'calendario-mese__testa', style: { gridTemplateColumns: colonne } },
      h('span', null, 's.'),
      ...mese.colonne.map((nome) => h('span', null, nome)),
    ),
    ...mese.righe.map((riga) =>
      h(
        'div',
        { class: 'calendario-mese__riga', style: { gridTemplateColumns: colonne } },
        h(
          'div',
          { class: 'calendario-mese__settimana' },
          String(riga.numero),
          riga.lettera ? h('span', { class: 'calendario-mese__lettera' }, riga.lettera) : null,
        ),
        ...riga.giorni.map((giorno) =>
          h(
            'div',
            { class: ['calendario-mese__cella', ...classiGiorno(giorno)] },
            h(
              'div',
              { class: 'calendario-mese__numero' },
              // Il primo del mese per esteso: è il confine fra due mesi.
              giorno.apreMese ? `1 ${giorno.mese}` : String(giorno.numero),
              giorno.semestre
                ? h('span', { class: 'segno-semestre' }, giorno.semestre)
                : null,
            ),
            giorno.chiuso ? h('div', { class: 'segno-chiusura' }, giorno.chiuso) : null,
            ...giorno.ore.map((ora) =>
              h(
                'div',
                {
                  class: [
                    'ora-pastiglia',
                    // testo-fisso: classe CSS
                    `ora-pastiglia--${ora.stato}`,
                    ora.corrente && 'ora-pastiglia--adesso',
                  ],
                },
                h('span', { class: 'ora-pastiglia__quando' }, ora.inizio ?? ''),
                h('span', { class: 'ora-pastiglia__titolo' }, ora.titolo),
              ),
            ),
            ...giorno.prove.map((prova) =>
              h('div', { class: 'giorno-prova' }, prova.titolo),
            ),
          ),
        ),
      ),
    ),
  )
}

function vistaAnno (anno: AnnoProiettato): Figlio {
  const colonne = `1.6em repeat(${anno.mesi.length}, minmax(0, 1fr)) 1.6em`
  const righe: Figlio[] = []
  const t = testi()

  for (let numero = 1; numero <= 31; numero += 1) {
    righe.push(
      h(
        'div',
        { class: 'calendario-anno__riga', style: { gridTemplateColumns: colonne } },
        h('span', { class: 'calendario-anno__numero' }, String(numero)),
        ...anno.mesi.map((mese) => cellaAnno(mese.giorni[numero - 1])),
        h('span', { class: 'calendario-anno__numero' }, String(numero)),
      ),
    )
  }

  return h(
    'div',
    { class: 'calendario-anno' },
    h(
      'div',
      { class: 'calendario-anno__riga calendario-anno__riga--mesi', style: { gridTemplateColumns: colonne } },
      h('span', { class: 'calendario-anno__numero' }, t.giorno),
      ...anno.mesi.map((mese) => h('span', { class: 'calendario-anno__mese' }, mese.titolo)),
      h('span', { class: 'calendario-anno__numero' }, t.giorno),
    ),
    ...righe,
    h(
      'div',
      { class: 'calendario-anno__legenda' },
      h('span', null, h('span', { class: 'calendario-anno__segno giorno--chiuso' }), t.vacanze),
      h(
        'span',
        null,
        h('span', { class: 'calendario-anno__segno giorno--festivo' }),
        t.sabatoDomenica,
      ),
      h(
        'span',
        null,
        h('span', { class: 'calendario-anno__segno calendario-anno__segno--lezione' }),
        t.giorniDiLezione,
      ),
      h('span', null, t.letteraSettimana),
    ),
  )
}

/**
 * Una casella dell'anno: l'iniziale del giorno e che cosa ci succede. Le
 * caselle che non esistono (31 novembre) restano vuote, per tenere allineate
 * le righe fra i mesi.
 */
function cellaAnno (giorno: GiornoAnno | undefined): Figlio {
  if (!giorno || !giorno.data) return h('span', { class: 'calendario-anno__giorno calendario-anno__giorno--nulla' })
  return h(
    'span',
    {
      class: [
        'calendario-anno__giorno',
        giorno.festivo && 'giorno--festivo',
        Boolean(giorno.chiuso) && 'giorno--chiuso',
        giorno.oggi && 'giorno--oggi',
        giorno.ore > 0 && 'calendario-anno__giorno--lezione',
        giorno.apre && 'calendario-anno__giorno--apre',
        giorno.chiude && 'calendario-anno__giorno--chiude',
      ],
    },
    h('span', { class: 'calendario-anno__lettera' }, giorno.lettera ?? ''),
    h(
      'span',
      { class: 'calendario-anno__dentro' },
      // Il nome della vacanza vince sul conto delle ore, che dentro una pausa è zero.
      giorno.chiuso ? giorno.chiuso : giorno.ore > 0 ? String(giorno.ore) : '',
    ),
    h('span', { class: 'calendario-anno__iniziale' }, giorno.iniziale),
  )
}

function agenda (elenco: VoceCalendario[]): Figlio {
  if (elenco.length === 0) return null
  return h(
    'ul',
    { class: 'elenco' },
    ...elenco.map((voce) =>
      h(
        'li',
        {
          class: [
            'voce',
            voce.genere === 'prova' && 'voce--prova',
            voce.corrente && 'voce--corrente',
          ],
        },
        h(
          'div',
          { class: 'voce__riga' },
          h('span', { class: 'voce__testo' }, voce.titolo),
          h('span', { class: 'voce__quando' }, voce.data),
        ),
        h(
          'div',
          { class: 'voce__sotto' },
          voce.genere === 'prova' ? testi().prova : voce.orario ?? testi().lezione,
          voce.corrente ? testi().adesso : null,
        ),
      ),
    ),
  )
}

function calendario (dati: CalendarioProiettato): Figlio {
  const dentro =
    dati.vista === 'agenda'
      ? dati.agenda
        ? agenda(dati.agenda)
        : null
      : dati.vista === 'settimana'
        ? dati.settimana
          ? vistaSettimana(dati.settimana)
          : null
        : dati.vista === 'mese'
          ? dati.mese
            ? vistaMese(dati.mese)
            : null
          : dati.anno
            ? vistaAnno(dati.anno)
            : null

  if (!dentro) return null
  // testo-fisso: classe CSS
  return sezioneCon(`blocco--${dati.vista}`, dati.titolo, dentro)
}

function valutazione (voce: ValutazioneProiettata): HTMLElement {
  return h(
    'article',
    { class: 'prova' },
    h(
      'div',
      { class: 'voce__riga' },
      h('span', { class: 'voce__testo' }, voce.titolo),
      h('span', { class: 'voce__quando' }, voce.data),
    ),
    h(
      'div',
      { class: 'prova__conti' },
      h(
        'span',
        { class: 'conto conto--quieto' },
        testi().votiSu(voce.espressi, voce.attesi),
      ),
    ),
    // Lo stesso grafico del registro, perché la forma commentata sul proiettore sia
    // quella che si ritrova sul portatile.
    graficoNote({
      grafico: voce.grafico,
      media: voce.media,
      sufficienti: voce.sufficienti,
      conteggio: voce.espressi,
    }),
    // I nomi, quando sono accesi, in tabella: da in fondo all'aula due colonne
    // allineate si leggono meglio di un voto in coda alla riga.
    voce.voti
      ? h(
          'table',
          { class: 'tabella-voti' },
          h(
            'thead',
            null,
            h(
              'tr',
              null,
              h('th', null, testi().persona),
              h('th', { class: 'tabella-voti__voto' }, testi().voto),
            ),
          ),
          h(
            'tbody',
            null,
            ...voce.voti.map((v) =>
              h(
                'tr',
                {
                  class: [
                    v.sufficiente === false && 'tabella-voti__riga--insufficiente',
                    v.assente && 'tabella-voti__riga--assente',
                  ],
                },
                h('td', null, v.nome),
                h('td', { class: 'tabella-voti__voto' }, v.voto),
              ),
            ),
          ),
        )
      : null,
  )
}

function valutazioni (elenco: ValutazioneProiettata[]): Figlio {
  if (elenco.length === 0) return null
  return sezione(testi().valutazioni, ...elenco.map(valutazione))
}

function documenti (elenco: DocumentoProiettato[]): Figlio {
  if (elenco.length === 0) return null
  const t = testi()
  return sezione(
    t.documentiDaPortare,
    h(
      'ul',
      { class: 'elenco' },
      ...elenco.map((voce) =>
        h(
          'li',
          { class: 'voce' },
          h(
            'div',
            { class: 'voce__riga' },
            h('span', { class: 'voce__testo' }, voce.testo),
            h('span', { class: 'voce__quando' }, `${voce.consegnati} / ${voce.attesi}`),
          ),
          h(
            'div',
            { class: 'voce__sotto' },
            voce.scadenza ? t.entro(voce.scadenza) : t.senzaTermine,
            voce.mancano && voce.mancano.length > 0 ? t.manca(voce.mancano.join(', ')) : null,
          ),
        ),
      ),
    ),
  )
}

function appello (dati: AppelloProiettato): Figlio {
  if (dati.righe.length === 0) return null
  return sezione(
    testi().appello(dati.presenti, dati.totale),
    h(
      'div',
      { class: 'tabella-scorrevole' },
      h(
        'table',
        { class: 'appello' },
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            h('th', { class: 'appello__nome' }, testi().persona),
            ...dati.colonne.map((colonna) =>
              h('th', { class: 'appello__ud' }, colonna.inizio),
            ),
          ),
        ),
        h(
          'tbody',
          null,
          ...dati.righe.map((riga) =>
            h(
              'tr',
              { class: riga.presente ? 'appello__riga' : 'appello__riga--assente' },
              h(
                'th',
                { class: 'appello__nome', attr: { scope: 'row' } },
                riga.nome,
                riga.minuti ? h('span', { class: 'appello__minuti' }, `+${riga.minuti}′`) : null,
              ),
              // La sigla va nel dataset: «appello__cella---» non è una classe scrivibile in CSS.
              ...riga.sigle.map((sigla) =>
                h('td', { class: 'appello__cella', dataset: { sigla } }, sigla),
              ),
            ),
          ),
        ),
      ),
    ),
  )
}

// ------------------------------------------------------------------ pagina

/** Lo schermo in pausa, o senza niente da mostrare: due modi di dire «aspetta». */
function segnaposto (testo: string, sotto: string): HTMLElement {
  return h(
    'div',
    { class: 'attesa' },
    h('div', { class: 'attesa__titolo' }, testo),
    h('div', { class: 'attesa__sotto' }, sotto),
  )
}

/**
 * La striscia delle schede in cima allo schermo: non si clicca, dice quale si
 * guarda e che ce ne sono altre. Con una scheda sola sparisce.
 */
function strisciaSchede (schede: ContenutoProiezione['schede']): Figlio {
  if (schede.length < 2) return null
  return h(
    'div',
    { class: 'schede' },
    ...schede.map((scheda) =>
      h(
        'span',
        { class: ['schede__voce', scheda.corrente && 'schede__voce--corrente'] },
        scheda.nome,
      ),
    ),
  )
}

function pagina (): Figlio {
  const t = testi()
  if (!contenuto) return segnaposto(t.registro, t.inAttesa)

  if (contenuto.sospesa) {
    return h(
      'div',
      { class: 'foglio foglio--sospesa' },
      segnaposto(t.pausa, t.riprende),
    )
  }

  // Uno solo: dal messaggio arriva un blocco solo, e riempie lo schermo.
  const aperto =
    (contenuto.argomenti ? argomenti(contenuto.argomenti) : null) ??
    (contenuto.scaletta ? scaletta(contenuto.scaletta) : null) ??
    (contenuto.appello ? appello(contenuto.appello) : null) ??
    (contenuto.consegne ? consegne(contenuto.consegne) : null) ??
    (contenuto.calendario ? calendario(contenuto.calendario) : null) ??
    (contenuto.valutazioni ? valutazioni(contenuto.valutazioni) : null) ??
    (contenuto.documenti ? documenti(contenuto.documenti) : null)

  return h(
    'div',
    { class: 'foglio' },
    intestazione(contenuto.intestazione),
    strisciaSchede(contenuto.schede),
    aperto ??
      segnaposto(
        contenuto.vuota ? t.nienteDaMostrare : t.schermoPulito,
        contenuto.vuota ? t.apriUnOra : t.nessunaScheda,
      ),
  )
}

let disegnoProgrammato = false

function disegna (): void {
  if (!radice || disegnoProgrammato) return
  disegnoProgrammato = true
  requestAnimationFrame(() => {
    disegnoProgrammato = false
    // Le misure stanno su una classe della radice: ridefiniscono corpo e spazi, e
    // la pagina si stringe tutta insieme.
    radice?.classList.toggle('proiezione--compatta', contenuto?.compatta !== false)
    rimpiazza(radice, pagina())
  })
}

window.addEventListener('message', (evento: MessageEvent<MessaggioProiezione>) => {
  const messaggio = evento.data
  if (!messaggio || messaggio.tipo !== 'proiezione') return
  contenuto = messaggio.contenuto
  radiceDati = messaggio.radiceDati
  disegna()
})

disegna()
