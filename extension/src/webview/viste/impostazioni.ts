// Impostazioni: gli anni scolastici, i valori che valgono per tutto il
// registro, e i comandi sui file.
//
// Gli anni stanno qui e non altrove perché si toccano due volte l'anno — a
// settembre e a gennaio — e non hanno bisogno di una voce di menu tutta loro.

import { letteraSettimana } from '../../dominio/anni.js'
import {
  MINUTI_UD,
  differenzaGiorni,
  formattaData,
  inizioSettimana,
  minutiDaUd,
  settimanaIso,
  sommaGiorni,
  udDaMinuti,
} from '../../dominio/date.js'
import type {
  AnnoScolastico,
  Impostazioni,
  Iso,
  LetteraSettimana,
} from '../../dominio/modelli.js'
import { sospensioneDi } from '../../dominio/orario.js'
import {
  avviso,
  campo,
  conAttesa,
  pastiglia,
  pulsante,
  puntoColore,
  riga,
  scheda,
  statoVuoto,
  testataVista,
} from '../componenti/base.js'
import { eseguiOAvvisa, sintesiIncassata } from '../componenti/filtri.js'
import { notifica } from '../componenti/notifiche.js'
import { h, type Figlio } from '../dom.js'
import {
  moduloAnno,
  moduloAvvio,
  moduloMateria,
  moduloPause,
  moduloUnisciMaterie,
} from '../moduli.js'
import type { Messaggio } from '../../protocollo.js'
import { azione } from '../ponte.js'
import { aggiorna, annoCorrente, iscriviti, stato } from '../stato.js'

const GIORNI = [
  { numero: 1, nome: 'lunedì' },
  { numero: 2, nome: 'martedì' },
  { numero: 3, nome: 'mercoledì' },
  { numero: 4, nome: 'giovedì' },
  { numero: 5, nome: 'venerdì' },
  { numero: 6, nome: 'sabato' },
  { numero: 7, nome: 'domenica' },
]

/**
 * Quel che si è mandato non è sempre quel che resta: l'host normalizza in
 * silenzio — un'ora vuota torna al valore predefinito, una pausa sotto i
 * cinque minuti sale a cinque. Si dice, invece di annunciare «salvate» mentre
 * il campo mostra già un altro numero.
 */
function scostamenti (mandate: Impostazioni, arrivate: Impostazioni): string[] {
  const esito: string[] = []
  const confronta = (etichetta: string, a: unknown, b: unknown) => {
    if (a !== b) esito.push(`${etichetta} portata a ${String(b)}`)
  }
  confronta('prima ora della giornata', mandate.oraInizioGiornata, arrivate.oraInizioGiornata)
  confronta('ultima ora della giornata', mandate.oraFineGiornata, arrivate.oraFineGiornata)
  confronta('durata della pausa', mandate.durataPausaPredefinita, arrivate.durataPausaPredefinita)
  confronta('durata dello slot', mandate.durataSlotPredefinita, arrivate.durataSlotPredefinita)
  confronta(
    'passo della nota di fine semestre',
    mandate.passoFineSemestre,
    arrivate.passoFineSemestre,
  )
  confronta('soglia di assenza', mandate.sogliaAssenza, arrivate.sogliaAssenza)
  return esito
}

/** Salva una modifica puntuale delle impostazioni, senza toccare il resto. */
async function salvaImpostazioni (modifiche: Partial<Impostazioni>): Promise<void> {
  const impostazioni: Impostazioni = {
    ...stato.registro.impostazioni,
    ...modifiche,
    scala: { ...stato.registro.impostazioni.scala, ...(modifiche.scala ?? {}) },
  }
  const risposta = await azione({ tipo: 'impostazioni.salva', impostazioni })
  if (!risposta.ok) return
  // Lo stato nuovo — quello che l'host ha davvero salvato — arriva un istante
  // dopo questa risposta: si aspetta quello, invece di confrontare con la
  // copia vecchia ancora in `stato.registro`.
  const disiscriviti = iscriviti(() => {
    disiscriviti()
    const scarti = scostamenti(impostazioni, stato.registro.impostazioni)
    notifica(
      scarti.length === 0 ? 'Impostazioni salvate.' : `Impostazioni salvate, corrette: ${scarti.join(', ')}.`,
      scarti.length === 0 ? 'successo' : 'avviso',
    )
  })
}

function schedaAnni (): HTMLElement {
  const registro = stato.registro
  const corrente = annoCorrente()

  return scheda({
    titolo: 'Anni scolastici',
    sottotitolo:
      'ogni anno è una cartella, e ha due semestri: è la scansione su cui si contano le medie',
    azioni: pulsante({ testo: 'Nuovo anno', simbolo: 'piu', variante: 'primario', al: () => moduloAnno() }),
    contenuto:
      registro.anni.length === 0
        ? statoVuoto({
            simbolo: 'calendario',
            titolo: 'Nessun anno scolastico',
            testo: 'È il primo passo: classi, lezioni e valutazioni stanno tutte dentro un anno.',
            azione: h(
              'div',
              { class: 'stato-vuoto__pulsanti' },
              pulsante({ testo: 'Avvio guidato', variante: 'primario', simbolo: 'piu', al: () => moduloAvvio() }),
              pulsante({ testo: 'Solo l’anno', al: () => moduloAnno() }),
            ),
          })
        : h(
            'ul',
            { class: 'elenco-anni' },
            ...registro.anni.map((anno) =>
              h(
                'li',
                { class: ['anno', anno.id === corrente?.id && 'anno--corrente'] },
                h(
                  'div',
                  { class: 'anno__intestazione' },
                  h('strong', null, anno.etichetta),
                  anno.id === corrente?.id ? pastiglia('aperto', 'positivo', 'spunta') : null,
                  h(
                    'span',
                    { class: 'anno__periodo' },
                    `${formattaData(anno.inizio)} → ${formattaData(anno.fine)}`,
                  ),
                  // La cartella si dice: è dove l'anno vive davvero, ed è quel
                  // che si cerca quando lo si vuole archiviare o consegnare a
                  // chi subentra.
                  anno.cartella
                    ? h('span', { class: 'anno__cartella' }, `cartella ${anno.cartella}/`)
                    : null,
                  h(
                    'span',
                    { class: 'anno__azioni' },
                    anno.id === corrente?.id
                      ? null
                      : pulsante({
                          // Aprire, non filtrare: si cambia cartella, e quel
                          // che si vede dopo sono altri file.
                          testo: 'Apri quest’anno',
                          variante: 'sottile',
                          al: async () => {
                            const risposta = await azione({ tipo: 'anno.seleziona', annoId: anno.id })
                            if (!risposta.ok) return
                            notifica(`Anno ${anno.etichetta} aperto.`, 'successo')
                          },
                        }),
                    pulsante({ simbolo: 'matita', variante: 'fantasma', titolo: 'Modifica', al: () => moduloAnno(anno) }),
                  ),
                ),
                h(
                  'div',
                  { class: 'anno__semestri' },
                  ...anno.semestri.map((semestre) =>
                    h(
                      'div',
                      { class: 'anno__semestre' },
                      h('span', { class: 'anno__semestre-nome' }, semestre.etichetta),
                      h(
                        'span',
                        { class: 'anno__semestre-periodo' },
                        `${formattaData(semestre.inizio)} → ${formattaData(semestre.fine)}`,
                      ),
                      // I voti contati sono quelli caricati, e caricato c'è
                      // solo l'anno aperto: di un altro si direbbe «0
                      // valutazioni», che è falso e sembra vero.
                      anno.id === corrente?.id
                        ? h(
                            'span',
                            { class: 'anno__semestre-conti' },
                            `${
                              stato.registro.valutazioni.filter(
                                (v) => v.data >= semestre.inizio && v.data <= semestre.fine,
                              ).length
                            } valutazioni`,
                          )
                        : null,
                    ),
                  ),
                ),
                elencoSospensioni(anno),
                settimaneAB(anno),
              ),
            ),
          ),
  })
}

/**
 * Le settimane A e B dell'anno, una casella per settimana.
 *
 * Stanno qui e non nel calendario perché si mettono tutte insieme, una volta,
 * quando arriva l'orario: nel calendario bisognava aprire una settimana alla
 * volta per marcarla, quaranta volte, e ogni volta si perdeva di vista il
 * disegno dell'alternanza — che è proprio la cosa da controllare. In fila su
 * una griglia si vede a colpo d'occhio dove salta.
 *
 * Nel calendario la lettera resta, di sola lettura, accanto al numero della
 * settimana: lì serve a sapere dove si è, non a decidere.
 */
function settimaneAB (anno: AnnoScolastico) {
  const lunedi: Iso[] = []
  const ultimo = inizioSettimana(anno.fine)
  for (let giorno = inizioSettimana(anno.inizio); giorno <= ultimo; giorno = sommaGiorni(giorno, 7)) {
    lunedi.push(giorno)
  }

  const messe = lunedi.filter((giorno) => letteraSettimana(anno, giorno)).length

  return h(
    'div',
    { class: 'anno__settimane' },
    h(
      'div',
      { class: 'anno__sospensioni-testata' },
      h('h5', null, 'Settimane A e B'),
      h(
        'span',
        { class: 'testo-quieto' },
        messe === 0
          ? 'nessuna marcata: serve solo dove l’orario è quindicinale'
          : `${messe} settimane su ${lunedi.length} marcate`,
      ),
    ),
    h(
      'div',
      { class: 'settimane-ab' },
      ...lunedi.map((giorno) => {
        const lettera = letteraSettimana(anno, giorno)
        const sospesa = sospensioneDi(anno, giorno)
        return h(
          'div',
          {
            class: ['settimana-ab', sospesa && 'settimana-ab--sospesa'],
            attr: {
              title: [
                `Settimana ${settimanaIso(giorno)} · dal ${formattaData(giorno)}`,
                sospesa ? sospesa.etichetta : null,
              ]
                .filter(Boolean)
                .join(' · '),
            },
          },
          h('span', { class: 'settimana-ab__numero' }, String(settimanaIso(giorno))),
          h(
            'div',
            { class: 'settimana-ab__lettere' },
            ...(['A', 'B'] as LetteraSettimana[]).map((quale) =>
              h(
                'button',
                {
                  class: [
                    'settimana-ab__lettera',
                    lettera === quale && 'settimana-ab__lettera--scelta',
                  ],
                  type: 'button',
                  attr: {
                    // Ricliccando quella già messa si toglie: «nessuna delle
                    // due» è il caso normale — vacanze, stage — e non merita
                    // un terzo pulsante acceso in quasi tutte le settimane.
                    title:
                      lettera === quale
                        ? `Settimana ${quale}: cliccando la togli`
                        : `Segna come settimana ${quale}`,
                    'aria-pressed': lettera === quale ? 'true' : 'false',
                  },
                  onclick: (evento: MouseEvent) =>
                    void conAttesa(
                      evento.currentTarget as HTMLButtonElement,
                      eseguiOAvvisa({
                        tipo: 'anno.settimana',
                        annoId: anno.id,
                        giorno,
                        lettera: lettera === quale ? null : quale,
                      }),
                    ),
                },
                quale,
              ),
            ),
          ),
        )
      }),
    ),
  )
}

/**
 * I giorni senza lezione di un anno.
 *
 * Non servono a colorare il calendario — quello è il di più. Servono perché la
 * generazione dell'orario li salti: senza, mettere sul calendario un semestre
 * vorrebbe dire poi cancellare a mano le due settimane di Natale, che è peggio
 * che scrivere le lezioni una per una.
 */
function elencoSospensioni (anno: AnnoScolastico) {
  return h(
    'div',
    { class: 'anno__sospensioni' },
    h(
      'div',
      { class: 'anno__sospensioni-testata' },
      h('h5', null, 'Giorni senza lezione'),
      pulsante({
        testo: 'Aggiungi',
        simbolo: 'piu',
        variante: 'fantasma',
        // Le pause hanno una finestra loro: a settembre si mette il calendario
        // delle vacanze, e in primavera ne salta fuori una. Aprire il modulo
        // dell'anno intero per aggiungere un giorno di chiusura voleva dire
        // avere sotto gli occhi le date dei semestri, con il rischio di
        // toccarle per sbaglio.
        al: () => moduloPause(anno),
      }),
    ),
    anno.sospensioni.length === 0
      ? h(
          'p',
          { class: 'testo-quieto' },
          'Nessuna: vacanze e giorni di chiusura si dichiarano qui, e la generazione ' +
            'dell’orario li salta.',
        )
      : h(
          'ul',
          { class: 'sospensioni' },
          ...anno.sospensioni.map((sospensione) => {
            const giorni = differenzaGiorni(sospensione.dal, sospensione.al) + 1
            return h(
              'li',
              { class: 'sospensione' },
              h('strong', null, sospensione.etichetta),
              h(
                'span',
                { class: 'testo-quieto' },
                sospensione.dal === sospensione.al
                  ? formattaData(sospensione.dal, 'giorno')
                  : `${formattaData(sospensione.dal)} → ${formattaData(sospensione.al)} · ${giorni} giorni`,
              ),
              pulsante({
                simbolo: 'matita',
                variante: 'fantasma',
                titolo: 'Modifica le pause dell’anno',
                al: () => moduloPause(anno),
              }),
            )
          }),
        ),
  )
}

/**
 * Le materie e i corsi che ne derivano. Stanno accanto agli anni perché
 * si toccano nello stesso momento: a settembre si dice che cosa si insegna, e
 * da li' in poi il programma di ogni classe esiste da solo.
 */
function schedaMaterie (): HTMLElement {
  const registro = stato.registro

  return scheda({
    titolo: 'Materie',
    sottotitolo: 'classe + anno + materia fanno il programma a cui appartengono i piani lezione',
    azioni: pulsante({
      testo: 'Nuova materia',
      simbolo: 'piu',
      variante: 'primario',
      al: () => moduloMateria(),
    }),
    contenuto:
      registro.materie.length === 0
        ? h(
            'p',
            { class: 'testo-quieto' },
            'Nessuna materia. Finché non ce n’è una, le classi non hanno corsi ' +
              'e le lezioni non sanno di che cosa parlano.',
          )
        : h(
            'ul',
            { class: 'elenco-materie' },
            ...registro.materie.map((materia) => {
              const corsi = registro.corsi.filter((c) => c.materiaId === materia.id)
              const classi = new Set(corsi.map((c) => c.classeId)).size
              const suoi = new Set(corsi.map((c) => c.id))
              const piani = registro.piani.filter((p) => p.corsoId && suoi.has(p.corsoId)).length

              return h(
                'li',
                { class: 'materia' },
                materia.colore ? puntoColore(materia.colore) : null,
                h('strong', null, materia.nome),
                materia.sigla ? pastiglia(materia.sigla, 'quiete') : null,
                h(
                  'span',
                  { class: 'testo-quieto' },
                  `${classi} class${classi === 1 ? 'e' : 'i'} · ${corsi.length} cors${corsi.length === 1 ? 'o' : 'i'} · ${piani} pian${piani === 1 ? 'o' : 'i'}`,
                ),
                pulsante({
                  simbolo: 'matita',
                  variante: 'fantasma',
                  titolo: 'Modifica la materia',
                  al: () => moduloMateria(materia),
                }),
                // Due voci nate dalla stessa cosa tornano una: è il rimedio a
                // un refuso, e l'alternativa a cancellare portandosi via i corsi.
                registro.materie.length > 1
                  ? pulsante({
                      simbolo: 'duplica',
                      variante: 'fantasma',
                      titolo: 'Unisci questa materia a un’altra',
                      al: () => moduloUnisciMaterie(materia),
                    })
                  : null,
              )
            }),
          ),
  })
}

function schedaCalendario (): HTMLElement {
  const impostazioni = stato.registro.impostazioni

  return scheda({
    titolo: 'Calendario',
    sottotitolo: 'come si presenta la settimana e che cosa viene proposto per una lezione nuova',
    contenuto: h(
      'div',
      { class: 'modulo' },
      riga(
        campo({
          nome: 'oraInizioGiornata',
          etichetta: 'Prima ora mostrata',
          tipo: 'time',
          valore: impostazioni.oraInizioGiornata,
          larghezza: 'quarto',
          al: (valore) => void salvaImpostazioni({ oraInizioGiornata: valore }),
        }),
        campo({
          nome: 'oraFineGiornata',
          etichetta: 'Ultima ora mostrata',
          tipo: 'time',
          valore: impostazioni.oraFineGiornata,
          larghezza: 'quarto',
          al: (valore) => void salvaImpostazioni({ oraFineGiornata: valore }),
        }),
        campo({
          nome: 'durataSlotPredefinita',
          etichetta: 'Slot di lezione',
          tipo: 'number',
          valore: udDaMinuti(impostazioni.durataSlotPredefinita),
          min: 1,
          max: 8,
          passo: 1,
          aiuto: `unità didattiche da ${MINUTI_UD} min`,
          larghezza: 'quarto',
          al: (valore) =>
            void salvaImpostazioni({ durataSlotPredefinita: minutiDaUd(Number(valore)) }),
        }),
        campo({
          nome: 'durataPausaPredefinita',
          etichetta: 'Durata di una pausa',
          tipo: 'number',
          valore: impostazioni.durataPausaPredefinita,
          min: 1,
          max: 120,
          // Senza passo: una pausa dura i minuti che dura, e un passo da cinque
          // rifiutava i dodici minuti fra due blocchi invece di suggerirli.
          passo: 'any',
          aiuto: 'minuti',
          larghezza: 'quarto',
          al: (valore) => void salvaImpostazioni({ durataPausaPredefinita: Number(valore) }),
        }),
      ),
      h(
        'div',
        { class: 'campo' },
        h('span', { class: 'campo__etichetta' }, 'Giorni mostrati'),
        h(
          'div',
          { class: 'scelta-giorni' },
          ...GIORNI.map((giorno) =>
            h(
              'button',
              {
                class: [
                  'scelta-giorni__voce',
                  impostazioni.giorniVisibili.includes(giorno.numero) && 'scelta-giorni__voce--attiva',
                ],
                type: 'button',
                attr: { 'aria-pressed': impostazioni.giorniVisibili.includes(giorno.numero) },
                onclick: () => {
                  const attuali = new Set(impostazioni.giorniVisibili)
                  if (attuali.has(giorno.numero)) attuali.delete(giorno.numero)
                  else attuali.add(giorno.numero)
                  if (attuali.size === 0) {
                    notifica('Almeno un giorno deve restare visibile.', 'avviso')
                    return
                  }
                  void salvaImpostazioni({ giorniVisibili: [...attuali].sort((a, b) => a - b) })
                },
              },
              giorno.nome.slice(0, 3),
            ),
          ),
        ),
      ),
    ),
  })
}

function schedaValutazione (): HTMLElement {
  const impostazioni = stato.registro.impostazioni
  const scala = impostazioni.scala

  return scheda({
    titolo: 'Scala dei voti',
    sottotitolo: 'valori proposti per un nuovo momento di valutazione; ogni momento può poi avere la sua',
    contenuto: h(
      'div',
      { class: 'modulo' },
      riga(
        campo({
          nome: 'scalaMin',
          etichetta: 'Voto minimo',
          tipo: 'number',
          valore: scala.min,
          // Gli estremi di una scala non hanno una grana: 1-6 e 0-100 sono
          // scale, e lo è anche una che parte da 2,3. Il passo con cui si
          // arrotondano i voti si dichiara qui accanto, ed è un'altra cosa.
          passo: 'any',
          larghezza: 'quarto',
          al: (valore) => void salvaImpostazioni({ scala: { ...scala, min: Number(valore) } }),
        }),
        campo({
          nome: 'scalaMax',
          etichetta: 'Voto massimo',
          tipo: 'number',
          valore: scala.max,
          passo: 'any',
          larghezza: 'quarto',
          al: (valore) => void salvaImpostazioni({ scala: { ...scala, max: Number(valore) } }),
        }),
        campo({
          nome: 'scalaSufficienza',
          etichetta: 'Sufficienza',
          tipo: 'number',
          valore: scala.sufficienza,
          passo: 'any',
          larghezza: 'quarto',
          al: (valore) => void salvaImpostazioni({ scala: { ...scala, sufficienza: Number(valore) } }),
        }),
        campo({
          nome: 'scalaPasso',
          etichetta: 'Passo dei voti',
          tipo: 'number',
          valore: scala.passo,
          min: 0.01,
          passo: 'any',
          aiuto: '0.25 = mezzi e quarti',
          larghezza: 'quarto',
          al: (valore) => void salvaImpostazioni({ scala: { ...scala, passo: Number(valore) } }),
        }),
        // Un passo suo, diverso da quello dei voti: durante l'anno si mettono
        // quarti di punto, ma la nota che va sulla pagella si dà a mezzi — e la
        // media pesata di sei prove non ci cade quasi mai sopra. Prima
        // l'arrotondamento lo faceva a mente chi compilava, che è il posto
        // peggiore dove tenere una regola.
        campo({
          nome: 'passoFineSemestre',
          etichetta: 'Passo della nota di fine semestre',
          tipo: 'number',
          valore: impostazioni.passoFineSemestre,
          min: 0,
          max: 10,
          passo: 'any',
          aiuto: '0.5 = mezzi punti; 0 = non arrotondare',
          larghezza: 'quarto',
          al: (valore) => void salvaImpostazioni({ passoFineSemestre: Number(valore) }),
        }),
        // La soglia oltre cui un'assenza diventa un caso da segnalare. Sta
        // qui e non dentro il codice perché la decide la scuola, e cambia fra
        // un corso di tirocinio e una formazione a tempo pieno.
        campo({
          nome: 'sogliaAssenza',
          etichetta: 'Segnala l’assenza oltre il',
          tipo: 'number',
          valore: impostazioni.sogliaAssenza,
          min: 0,
          max: 100,
          passo: 'any',
          aiuto: 'in percento; 0 = nessuna segnalazione',
          larghezza: 'quarto',
          al: (valore) => void salvaImpostazioni({ sogliaAssenza: Number(valore) }),
        }),
      ),
    ),
  })
}

/**
 * La posta: da dove parte, e dove sta la firma.
 *
 * La firma non si scrive qui: sta in `templates/_firma.html`, con le
 * intestazioni dei rapporti, perché è la stessa specie di cosa — un pezzo di
 * testo che si scrive una volta e si corregge a mano quando cambia un numero
 * di telefono. Qui c'è la porta per arrivarci.
 */
/**
 * Scrive sotto le azioni com'è andata, e ce lo lascia.
 *
 * La notifica passa e chi ha premuto sta ancora correggendo le impostazioni:
 * il motivo per cui il server ha detto di no deve restare leggibile mentre si
 * rimedia, non sparire dopo tre secondi.
 */
function mostraEsito (dove: HTMLElement, detto: Messaggio | undefined): void {
  dove.replaceChildren(
    detto
      ? avviso(
        detto.testo,
        detto.livello === 'errore'
          ? 'negativo'
          : detto.livello === 'avviso'
            ? 'attenzione'
            : 'informativo',
      )
      : avviso('Non è arrivata nessuna risposta.', 'attenzione'),
  )
}

function schedaPosta (): HTMLElement {
  const posta = stato.posta

  // L'esito della prova, che compare qui sotto e ci resta: la notifica passa,
  // e chi ha premuto per sapere di che casella si tratta vuole poterlo
  // rileggere mentre corregge le impostazioni.
  const esito = h('div', { class: 'posta-esito' })

  return scheda({
    titolo: 'Posta',
    sottotitolo: posta.invioDiretto
      ? posta.exchange
        ? `le comunicazioni partono dal registro, consegnate a ${posta.server}`
        : 'le comunicazioni partono dal registro, dalla casella di Outlook'
      : 'le comunicazioni escono come bozze, da spedire dal programma di posta',
    azioni: [
      pulsante({
        testo: posta.exchange ? 'Ricollega la casella' : 'Collega la casella',
        simbolo: 'collegamento',
        variante: 'sottile',
        titolo:
          'Chiede l’indirizzo e la password e li prova sul server. La password va nel ' +
          'portachiavi del sistema, non nelle impostazioni.',
        al: async () => {
          const risposta = await azione({ tipo: 'posta.collega' })
          mostraEsito(esito, risposta.messaggio)
        },
      }),
      ...(posta.exchange
        ? [
            pulsante({
              testo: 'Scollega',
              simbolo: 'chiudi',
              variante: 'sottile',
              titolo: 'Toglie la password dal portachiavi: si torna alle bozze.',
              al: async () => {
                const risposta = await azione({ tipo: 'posta.scollega' })
                mostraEsito(esito, risposta.messaggio)
              },
            }),
          ]
        : []),
      pulsante({
        testo: 'Prova il collegamento',
        simbolo: 'posta',
        variante: 'sottile',
        titolo: 'Va a bussare al server, o a Outlook. Non manda niente.',
        al: async () => {
          const risposta = await azione({ tipo: 'posta.prova' })
          mostraEsito(esito, risposta.messaggio)
        },
      }),
      pulsante({
        testo: 'Apri i modelli',
        simbolo: 'cartella',
        variante: 'sottile',
        titolo: 'La cartella templates/, dove sta anche la firma delle mail',
        al: () => azione({ tipo: 'rapporto.modelli' }),
      }),
    ],
    contenuto: h(
      'div',
      null,
      // Quel che si sa senza chiedere niente a nessuno. Di chi sia davvero la
      // casella lo dice il pulsante qui sopra: per saperlo bisogna svegliare
      // Outlook, e non è una cosa da fare a ogni apertura della vista.
      h(
        'div',
        { class: 'modulo__riga' },
        pastiglia(
          posta.exchange ? `casella collegata a ${posta.server}` : 'casella da collegare',
          posta.exchange ? 'positivo' : 'quiete',
          'collegamento',
        ),
        pastiglia(
          posta.modo === 'vscode'
            ? 'account Microsoft di VS Code'
            : posta.modo === 'oauth'
              ? 'account Microsoft'
              : 'password per le app',
          'neutro',
          'utente',
        ),
        pastiglia(
          posta.outlook ? 'Outlook comandabile' : 'senza Outlook: file .eml',
          posta.outlook ? 'positivo' : 'quiete',
          'posta',
        ),
        pastiglia(
          posta.invioDiretto ? 'invio diretto acceso' : 'invio diretto spento',
          posta.invioDiretto ? 'attenzione' : 'neutro',
        ),
        pastiglia(posta.mittente || 'mittente non detto', posta.mittente ? 'neutro' : 'quiete'),
      ),
      esito,
      h(
        'p',
        null,
        'La firma che va in fondo a ogni mail — comunicazioni, richieste di firma alle ' +
          'aziende, documenti mandati a un allievo — sta in ',
        h('code', null, 'templates/_firma.html'),
        '.',
      ),
      h(
        'p',
        { class: 'testo-quieto' },
        'È HTML, e con una firma in HTML tutta la mail parte in HTML. Svuotando il file la ' +
          'mail parte senza firma.',
      ),
      h(
        'p',
        { class: 'testo-quieto' },
        'Collegando la casella il registro consegna le comunicazioni direttamente al server, ' +
          'senza passare da Outlook: funziona anche su un Mac e con Outlook chiuso, e il ' +
          'registro sa quali sono partite e quali no. Si entra con l’account Microsoft — la ' +
          'solita pagina, la solita verifica in due passaggi, e un’autorizzazione a spedire e ' +
          'basta — oppure con una «password per le app». In tutti e due i casi quel che apre ' +
          'la casella sta nel portachiavi del sistema, non nelle impostazioni.',
      ),
      h(
        'p',
        { class: 'testo-quieto' },
        'Con più di una casella nel programma di posta conviene dire quale è la propria in ',
        h('code', null, 'registroDocenti.posta.mittente'),
        ': la bozza si apre già da quella, e una comunicazione tutta in copia nascosta trova ' +
          'il proprio indirizzo nel campo «A» invece di restare senza destinatari.',
      ),
    ),
  })
}

function schedaDati (): HTMLElement {
  const registro = stato.registro

  return scheda({
    titolo: 'Dati',
    sottotitolo: 'i file JSON stanno nella cartella del registro, dentro il workspace',
    azioni: [
      pulsante({
        testo: 'Apri la cartella',
        simbolo: 'cartella',
        variante: 'sottile',
        al: () => azione({ tipo: 'sistema.apriCartella' }),
      }),
      pulsante({
        testo: 'Ricarica',
        simbolo: 'ricarica',
        variante: 'sottile',
        al: async () => {
          const risposta = await azione({ tipo: 'stato.ricarica' })
          if (!risposta.ok) return
          notifica('Dati ricaricati dal disco.', 'info')
        },
      }),
    ],
    contenuto: h(
      'div',
      null,
      sintesiIncassata(
        { etichetta: 'anni', valore: String(registro.anni.length) },
        { etichetta: 'classi', valore: String(registro.classi.length) },
        { etichetta: 'lezioni', valore: String(registro.lezioni.length) },
        { etichetta: 'piani', valore: String(registro.piani.length) },
        { etichetta: 'valutazioni', valore: String(registro.valutazioni.length) },
      ),
      stato.avvisi.length > 0
        ? avviso(
            h(
              'div',
              null,
              h('strong', null, 'Riferimenti che non tornano'),
              h('ul', null, ...stato.avvisi.slice(0, 8).map((testo) => h('li', null, testo))),
              stato.avvisi.length > 8 ? h('p', null, `…e altri ${stato.avvisi.length - 8}.`) : null,
            ),
            'attenzione',
          )
        : avviso('Tutti i riferimenti fra classi, lezioni, piani e valutazioni tornano.', 'informativo'),
    ),
  })
}

export function vistaImpostazioni (): Figlio {
  return h(
    'div',
    { class: 'vista vista--impostazioni' },
    testataVista({
      titolo: 'Impostazioni',
      sottotitolo: 'anni scolastici, calendario, scala dei voti, posta, file',
      azioni: pulsante({
        testo: 'Torna al calendario',
        variante: 'sottile',
        simbolo: 'calendario',
        al: () => aggiorna({ vista: 'calendario' }),
      }),
    }),
    h(
      'div',
      { class: 'colonna colonna--impostazioni' },
      schedaAnni(),
      schedaMaterie(),
      schedaCalendario(),
      schedaValutazione(),
      schedaPosta(),
      schedaDati(),
    ),
  )
}
