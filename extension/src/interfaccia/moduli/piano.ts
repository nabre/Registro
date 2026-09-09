// Il piano di una lezione: la scaletta delle attività, e i materiali che
// servono per farle.
//
// Un piano vive più a lungo dell'ora in cui lo si usa — si riassegna, si copia
// per l'anno dopo — ed è per questo che le sue risorse stanno con lui.

import {
  contaUd,
  minutiDiAttivita,
  minutiEffettivi,
  scalettaSulleUd,
  udDaMinutiAttivita,
} from '../../dominio/calcoli.js'
import { attivitaValutata, parametriDi, valoreParametro } from '../../dominio/attivita.js'
import { MINUTI_UD, formattaData, formattaDurata, formattaUd } from '../../dominio/date.js'
import { creaAttivita, creaPiano } from '../../dominio/fabbriche.js'
import type {
  Attivita,
  Lezione,
  PianoLezione,
  Risorsa,
  TipoValutazione,
} from '../../dominio/modelli.js'
import {
  avviso,
  campo,
  conAttesa,
  pastiglia,
  pulsante,
  riga,
  sezioneModulo,
  statoVuoto,
  valoriModulo,
} from '../componenti/base.js'
import { apriModale, type ContestoModale } from '../componenti/modale.js'
import { notifica } from '../componenti/notifiche.js'
import { icona } from '../componenti/icone.js'
import { h, rimpiazza,
  type Figlio,
} from '../dom.js'
import { azione, invia } from '../ponte.js'
import { aggiorna, classeDelCorsoId, corsiDi, nomeDiPiano, pianiPerCorso, stato } from '../stato.js'

import { bloccoRisorse } from './risorse.js'
import {
  VOCI_TIPO_ATTIVITA,
  VOCI_TIPO_VALUTAZIONE,
  campoCorso,
  numero,
  salva,
  tastoDuplica,
  tastoElimina,
  testo,
} from './comune.js'

/** Editor della scaletta: righe di attività che si spostano su e giù. */
/**
 * I campi che dipendono dal tipo dell'attività.
 *
 * Compaiono e spariscono cambiando il tipo, perché sono domande che hanno senso
 * per un tipo solo: la grandezza dei gruppi non si chiede a una spiegazione, e
 * il materiale ammesso non si chiede a un ripasso. Quel che si era scritto sotto
 * un tipo di prima resta nel file, in silenzio: cambiare tipo per sbaglio non
 * deve cancellare niente.
 */
function campiParametri (voce: Attivita, alCambio: () => void): Figlio {
  const parametri = parametriDi(voce.tipo)
  if (parametri.length === 0) return null

  const scrivi = (chiave: string, valore: string | number | boolean | undefined) => {
    const attuali = { ...(voce.parametri ?? {}) }
    if (valore === undefined || valore === '' || valore === false) delete attuali[chiave]
    else attuali[chiave] = valore
    voce.parametri = Object.keys(attuali).length > 0 ? attuali : undefined
    alCambio()
  }

  return h(
    'div',
    { class: 'attivita-riga__parametri' },
    ...parametri.map((parametro) => {
      const valore = valoreParametro(voce, parametro.chiave)

      if (parametro.tipo === 'sino') {
        return h(
          'label',
          { class: 'attivita-riga__sino', attr: { title: parametro.aiuto ?? '' } },
          h('input', {
            type: 'checkbox',
            checked: valore === true,
            onchange: (evento: Event) =>
              scrivi(parametro.chiave, (evento.target as HTMLInputElement).checked),
          }),
          h('span', null, parametro.etichetta),
        )
      }

      if (parametro.tipo === 'scelta') {
        return h(
          'select',
          {
            class: 'campo__controllo campo__controllo--selezione attivita-riga__parametro',
            attr: { 'aria-label': parametro.etichetta, title: parametro.aiuto ?? parametro.etichetta },
            onchange: (evento: Event) =>
              scrivi(parametro.chiave, (evento.target as HTMLSelectElement).value),
          },
          h('option', { value: '' }, `${parametro.etichetta}…`),
          ...(parametro.opzioni ?? []).map((opzione) =>
            h(
              'option',
              { value: opzione.valore, selected: String(valore) === opzione.valore },
              opzione.testo,
            ),
          ),
        )
      }

      return h('input', {
        class: [
          'campo__controllo attivita-riga__parametro',
          parametro.tipo === 'numero' && 'campo__controllo--numero',
        ],
        type: parametro.tipo === 'numero' ? 'number' : 'text',
        value: valore === undefined ? '' : String(valore),
        placeholder: parametro.segnaposto ?? parametro.etichetta,
        attr: {
          'aria-label': parametro.etichetta,
          title: parametro.aiuto ?? parametro.etichetta,
          // Senza passo, come la durata: un parametro numerico chiede punti,
          // minuti, quante persone per gruppo — e un passo fisso rifiuterebbe
          // quel che non ci cade sopra invece di limitarsi a suggerirlo.
          ...(parametro.tipo === 'numero' ? { min: 0, step: 'any' } : {}),
        },
        onchange: (evento: Event) => {
          const scritto = (evento.target as HTMLInputElement).value.trim()
          if (parametro.tipo === 'numero') {
            scrivi(parametro.chiave, scritto === '' ? undefined : numero(scritto, 0))
            return
          }
          scrivi(parametro.chiave, scritto === '' ? undefined : scritto)
        },
      })
    }),
  )
}

/**
 * La prova che una tappa prevede.
 *
 * Sta sull'attività e non sul piano perché è la tappa a essere una verifica, e
 * una lezione può contenerne due — l'interrogazione all'inizio, il test alla
 * fine. Qui si dice soltanto che cosa sarà: il momento vero, con i voti, nasce
 * dentro la lezione in cui la prova si fa.
 */
function campiValutazione (voce: Attivita, alCambio: () => void): Figlio {
  const prevista = voce.valutazione ?? null

  return h(
    'div',
    { class: ['attivita-riga__valutazione', prevista && 'attivita-riga__valutazione--accesa'] },
    h(
      'label',
      {
        class: 'attivita-riga__sino',
        attr: { title: 'Questa tappa è il momento di valutazione: da qui nascono i voti' },
      },
      h('input', {
        type: 'checkbox',
        checked: prevista !== null,
        onchange: (evento: Event) => {
          // Spegnendola la prova non si butta: resta scritta, e si riaccende
          // com'era. Chi toglie la spunta per sbaglio non deve ribattere tipo
          // e peso — e chi la toglie sul serio salva un piano che non li ha.
          voce.valutazione = (evento.target as HTMLInputElement).checked
            ? voce.valutazione ?? { titolo: '', tipo: 'scritto', peso: 1 }
            : null
          alCambio()
        },
      }),
      h('span', null, 'È una valutazione'),
    ),
    prevista
      ? h('input', {
          class: 'campo__controllo attivita-riga__titolo-prova',
          type: 'text',
          value: prevista.titolo,
          // Vuoto vuol dire «come si chiama la tappa»: il titolo della prova è
          // quasi sempre quello, e chiederlo due volte era una casella da
          // riempire con quel che già si sapeva.
          placeholder: voce.titolo || 'titolo della prova',
          attr: { 'aria-label': 'Titolo della prova', title: 'Come si chiamerà il momento di valutazione' },
          onchange: (evento: Event) => {
            if (!voce.valutazione) return
            voce.valutazione.titolo = (evento.target as HTMLInputElement).value.trim()
            alCambio()
          },
        })
      : null,
    prevista
      ? h(
          'select',
          {
            class: 'campo__controllo campo__controllo--selezione attivita-riga__parametro',
            attr: { 'aria-label': 'Tipo di prova' },
            onchange: (evento: Event) => {
              if (!voce.valutazione) return
              voce.valutazione.tipo = (evento.target as HTMLSelectElement)
                .value as TipoValutazione
              alCambio()
            },
          },
          ...VOCI_TIPO_VALUTAZIONE.map((opzione) =>
            h(
              'option',
              { value: opzione.valore, selected: prevista.tipo === opzione.valore },
              opzione.testo,
            ),
          ),
        )
      : null,
    prevista
      ? h('input', {
          class: 'campo__controllo campo__controllo--numero attivita-riga__parametro',
          type: 'number',
          value: String(prevista.peso),
          // Passo libero: con un passo fisso il browser rifiutava i decimali
          // che non ci cadevano sopra, e il campo non si lasciava salvare.
          attr: {
            min: 0,
            max: 10,
            step: 'any',
            'aria-label': 'Peso',
            title: 'Quanto pesa nella media: da 0 a 10, zero non fa media',
          },
          onchange: (evento: Event) => {
            if (!voce.valutazione) return
            voce.valutazione.peso = Math.min(
              10,
              Math.max(0, numero((evento.target as HTMLInputElement).value, 1)),
            )
            alCambio()
          },
        })
      : null,
  )
}

/**
 * Che cosa serve alla scaletta per allegare file mentre la si scrive.
 *
 * L'editor lavora su una copia — «Annulla» dev'essere davvero un annulla — ma
 * i file no: li copia l'host, dentro l'archivio, e per farlo deve sapere a
 * quale piano appartengono. Quindi prima di allegare qualcosa il piano si
 * salva com'è (`prima`), e appena l'host ha finito la copia locale rilegge le
 * risorse dal registro (`rilette`): senza, il salvataggio successivo
 * rimanderebbe la scaletta di prima e cancellerebbe l'allegato appena messo.
 */
interface GestoreRisorse {
  pianoId: string
  prima: () => Promise<boolean>
  rilette: (attivitaId: string | null) => Risorsa[] | null
  /**
   * Chi disegna un elenco di risorse dice qui come si ridisegna, e chiama
   * `rinfrescaTutto` quando qualcosa è cambiato: una risorsa si sposta da una
   * tappa all'altra, e rinfrescare solo l'elenco da cui è partita lascerebbe
   * quello d'arrivo a mostrare quel che c'era prima.
   */
  registra: (rinfresca: () => void) => void
  rinfrescaTutto: () => void
}

/**
 * L'editor della scaletta.
 *
 * Con una lezione sotto, le attività si posano sui suoi gruppi di unità
 * didattiche attaccate: si vede in quale tratto di lezione cade ciascuna e
 * quanto resta libero, invece di dover fare la somma a mente e scoprire in
 * aula che il tempo prima dell'intervallo era già finito.
 */
function editorAttivita (
  iniziali: Attivita[],
  allaModifica: (attivita: Attivita[]) => void,
  lezione?: Lezione | null,
  gestore?: GestoreRisorse,
  /**
   * Se sulla classe di questo piano si fa anche il docente di classe.
   *
   * È una funzione e non un valore perché il corso si può cambiare mentre il
   * modulo è aperto, e la tendina dei tipi deve dire la verità di adesso.
   */
  docenteDiClasse: () => boolean = () => false,
): HTMLElement {
  let attivita = iniziali.map((a) => ({ ...a }))
  const contenitore = h('div', { class: 'attivita-editor' })

  const sposta = (indice: number, verso: number) => {
    const destinazione = indice + verso
    if (destinazione < 0 || destinazione >= attivita.length) return
    const copia = [...attivita]
    ;[copia[indice], copia[destinazione]] = [copia[destinazione], copia[indice]]
    attivita = copia
    disegna()
    allaModifica(attivita)
  }

  /**
   * Rilegge dal registro le risorse di tutte le tappe.
   *
   * Tutte, e non solo quella che si è toccata: una risorsa si può spostare da
   * una tappa all'altra, e rinfrescare la sola tappa di partenza lascerebbe
   * quella d'arrivo a mostrare l'elenco di prima.
   */
  const rileggiRisorse = () => {
    if (!gestore) return
    for (const voce of attivita) {
      const fresche = gestore.rilette(voce.id)
      if (fresche) voce.risorse = fresche
    }
  }
  gestore?.registra(() => {
    rileggiRisorse()
    disegna()
    allaModifica(attivita)
  })

  const disegna = () => {
    const totale = attivita.reduce((somma, a) => somma + a.durataUd, 0)
    // La scaletta posata sulle UD dell'ora: dice per ciascuna quanto è presa,
    // e che cosa è rimasto fuori dalla lezione.
    const sulleUd = lezione ? scalettaSulleUd(attivita, lezione) : null
    const posto = (indice: number) => sulleUd?.posti[indice] ?? null
    // Dentro il piano le durate si scrivono in minuti: è così che si prepara
    // un'ora. Sotto restano unità didattiche, così lo stesso piano riusato dove
    // le UD sono da cinquanta riempie comunque l'ora; il cambio è quello
    // dell'ora vera se c'è, quello delle impostazioni se il piano è ancora una
    // bozza.
    const perUd =
      sulleUd?.minutiPerUd ?? stato.registro.impostazioni.durataSlotPredefinita ?? MINUTI_UD

    /**
     * Una tappa, in riga.
     *
     * Le colonne sono le stesse per tutte — numero, titolo, tipo, durata,
     * quando — e stanno su una griglia sola, dichiarata dall'elenco. Prima
     * ogni riga si disponeva per conto suo: con titoli di lunghezza diversa i
     * tipi e le durate finivano ognuno a un'ascissa sua, e confrontare due
     * tappe voleva dire leggerle una per una invece di guardarle in colonna.
     *
     * Quel che in una colonna non ci sta — descrizione, parametri, prova,
     * materiale — scende sotto, allineato al titolo: è roba di quella tappa, e
     * incolonnarla avrebbe voluto dire quattro colonne quasi sempre vuote.
     */
    const rigaAttivita = (voce: Attivita, indice: number): HTMLElement =>
      h(
        'li',
        {
          class: [
            'attivita-riga',
            posto(indice)?.ud === null && 'attivita-riga--fuori',
            posto(indice)?.aCavallo && 'attivita-riga--a-cavallo',
            posto(indice)?.oltreLaPausa && 'attivita-riga--oltre-la-pausa',
          ],
          dataset: { attivitaId: voce.id },
        },
        h(
          'div',
          { class: 'attivita-riga__ordine' },
          pulsante({ simbolo: 'su', variante: 'fantasma', titolo: 'Su', disabilitato: indice === 0, al: () => sposta(indice, -1) }),
          h('span', { class: 'attivita-riga__numero' }, String(indice + 1)),
          pulsante({
            simbolo: 'giu',
            variante: 'fantasma',
            titolo: 'Giù',
            disabilitato: indice === attivita.length - 1,
            al: () => sposta(indice, 1),
          }),
        ),
        h('input', {
          class: 'campo__controllo attivita-riga__titolo',
          type: 'text',
          value: voce.titolo,
          placeholder: 'titolo dell’attività',
          onchange: (evento: Event) => {
            voce.titolo = (evento.target as HTMLInputElement).value
            disegna()
            allaModifica(attivita)
          },
        }),
        h(
          'select',
          {
            class: 'campo__controllo campo__controllo--selezione attivita-riga__tipo',
            attr: { 'aria-label': 'Tipo di attività' },
            onchange: (evento: Event) => {
              voce.tipo = (evento.target as HTMLSelectElement).value as Attivita['tipo']
              disegna()
              allaModifica(attivita)
            },
          },
          // La docenza di classe si offre solo dove la si fa: su una classe di
          // cui non si è docente di classe è un tipo che non capiterà mai, e
          // starebbe in mezzo a quelli che si scelgono ogni volta. Se una
          // tappa ce l'ha già — il corso è cambiato sotto — resta scelta e
          // resta visibile: toglierla dall'elenco l'avrebbe cambiata di
          // nascosto al primo salvataggio.
          VOCI_TIPO_ATTIVITA.filter(
            (v) =>
              v.valore !== 'docenza-di-classe' ||
              docenteDiClasse() ||
              voce.tipo === 'docenza-di-classe',
          ).map((v) => h('option', { value: v.valore, selected: voce.tipo === v.valore }, v.testo)),
        ),
        h(
          'div',
          { class: 'attivita-riga__durata' },
          h('input', {
            class: 'campo__controllo campo__controllo--numero',
            type: 'number',
            value: String(minutiDiAttivita(voce.durataUd, perUd)),
            // Qualunque numero di minuti, senza passo: una spiegazione da sette
            // minuti è una cosa che si scrive. Con un passo — cinque, o anche
            // uno solo — il browser rifiuta quel che non ci cade sopra e il
            // campo non si lascia salvare, che è il modo peggiore di suggerire
            // una grana: la impone senza dirlo.
            attr: { min: 1, step: 'any', 'aria-label': 'Durata in minuti' },
            onchange: (evento: Event) => {
              voce.durataUd = udDaMinutiAttivita(
                numero((evento.target as HTMLInputElement).value, perUd / 2),
                perUd,
              )
              disegna()
              allaModifica(attivita)
            },
          }),
          h('span', { class: 'attivita-riga__unita' }, 'min'),
        ),
        // L'ora dell'orologio, non la somma dei minuti: se in mezzo c'è un
        // intervallo, la differenza è quella che si vede in aula guardando il
        // muro. La colonna c'è solo quando c'è un'ora sotto.
        sulleUd
          ? h(
              'span',
              {
                class: 'attivita-riga__orario',
                attr: { title: 'Quando cade, orologio alla mano' },
              },
              posto(indice)?.oraInizio
                ? `${posto(indice)?.oraInizio}–${posto(indice)?.oraFine ?? '…'}`
                : '—',
            )
          : null,
        pulsante({
          simbolo: 'cestino',
          variante: 'fantasma',
          titolo: 'Togli l’attività',
          al: () => {
            attivita = attivita.filter((a) => a.id !== voce.id)
            disegna()
            allaModifica(attivita)
          },
        }),
        h(
          'div',
          { class: 'attivita-riga__estesa' },
          h('input', {
            class: 'campo__controllo attivita-riga__descrizione',
            type: 'text',
            value: voce.descrizione ?? '',
            placeholder: 'come si svolge, materiali, consegne',
            onchange: (evento: Event) => {
              voce.descrizione = (evento.target as HTMLInputElement).value
              allaModifica(attivita)
            },
          }),
          campiParametri(voce, () => {
            disegna()
            allaModifica(attivita)
          }),
          campiValutazione(voce, () => {
            disegna()
            allaModifica(attivita)
          }),
          // Il materiale della tappa sta con la tappa: la scheda che serve al
          // lavoro di gruppo appartiene a quel quarto d'ora e non al piano
          // intero, e cercarla in un elenco comune vuol dire ritrovarsi in
          // aula a chiedersi quale delle tre era.
          gestore
            ? bloccoRisorse({
                pianoId: gestore.pianoId,
                attivitaId: voce.id,
                risorse: voce.risorse,
                compatto: true,
                prima: gestore.prima,
                dopo: () => gestore.rinfrescaTutto(),
              })
            : null,
        ),
      )

    /** I nomi delle colonne, una volta sola in cima all'elenco. */
    const intestazione = (): HTMLElement =>
      h(
        'li',
        { class: 'attivita-riga attivita-riga--intestazione' },
        h('span', null, '#'),
        h('span', null, 'Attività'),
        h('span', null, 'Tipo'),
        h('span', null, 'Minuti'),
        sulleUd ? h('span', null, 'Quando') : null,
        h('span', null, ''),
      )

    /**
     * L'ora intera, gruppo per gruppo, con dentro le attività che ci cadono.
     *
     * Il gruppo — le UD attaccate fra un intervallo e l'altro — è l'unità con
     * cui si pianifica: dentro non ci sono confini che si sentano, e contarne
     * le UD una per una riempiva l'elenco di intestazioni che dicevano tutte
     * la stessa cosa. Del gruppo importa quante UD tiene, da che ora a che
     * ora, e quanto ne resta libero.
     *
     * I gruppi ci sono tutti, anche quelli su cui non cade niente: una
     * scaletta che finisce prima dell'intervallo deve far vedere il tempo che
     * resta dopo, non fermarsi dove finisce l'elenco. E gli intervalli stanno
     * al loro posto, con i minuti che durano.
     */
    const scheletro = (): Figlio[] => {
      if (!sulleUd) {
        return [intestazione(), ...attivita.map((voce, indice) => rigaAttivita(voce, indice))]
      }

      const righe: Figlio[] = [intestazione()]
      sulleUd.blocchi.forEach((blocco, i) => {
        // Fra un gruppo e l'altro c'è l'intervallo, con i minuti che dura: è
        // il solo confine che si sente in aula.
        if (i > 0) {
          const prima = sulleUd.blocchi[i - 1]
          righe.push(
            h(
              'li',
              { class: 'attivita-editor__pausa' },
              icona('pausa', 'icona--minuta'),
              h(
                'span',
                null,
                `Intervallo · ${blocco.pausaPrima} min · ${prima.fine}–${blocco.inizio}`,
              ),
            ),
          )
        }

        // Il gruppo si conta in UD come tutto il resto: i minuti che il
        // dominio usa per posare la scaletta restano lì sotto, e non è roba
        // che chi prepara un'ora debba dividere a mente.
        const libero = blocco.capienza - blocco.occupati
        righe.push(
          h(
            'li',
            {
              class: [
                'attivita-editor__blocco',
                blocco.occupati === 0 && 'attivita-editor__blocco--vuoto',
              ],
            },
            h('strong', null, sulleUd.blocchi.length > 1 ? `Gruppo ${i + 1}` : 'Lezione'),
            // Quante UD attaccate, e non quali: dentro il gruppo il tempo è
            // continuo, e il confine fra la prima e la seconda non si sente.
            h(
              'span',
              { class: 'attivita-editor__blocco-ud' },
              `${blocco.ud} UD${blocco.ud > 1 ? ' attaccate' : ''}`,
            ),
            h(
              'span',
              { class: 'testo-quieto' },
              `${blocco.inizio}–${blocco.fine} · ${blocco.occupati}/${blocco.capienza} min`,
            ),
            blocco.occupati === 0
              ? pastiglia('vuoto', 'quiete')
              : libero > 0
                ? pastiglia(`${libero} min liberi`, 'quiete')
                : libero === 0
                  ? pastiglia('pieno', 'positivo')
                  : pastiglia(`${-libero} min di troppo`, 'attenzione'),
          ),
        )
        attivita.forEach((voce, indice) => {
          if (posto(indice)?.blocco === i) righe.push(rigaAttivita(voce, indice))
        })
      })

      // Quel che non ci sta più nell'ora resta in fondo, dichiarato: toglierlo
      // sarebbe deciderlo al posto di chi lo ha scritto.
      if (attivita.some((_, indice) => posto(indice)?.ud === null)) {
        righe.push(
          h(
            'li',
            { class: 'attivita-editor__ud attivita-editor__ud--fuori' },
            icona('avviso', 'icona--minuta'),
            h('span', null, 'Oltre la fine della lezione'),
          ),
        )
        attivita.forEach((voce, indice) => {
          if (posto(indice)?.ud === null) righe.push(rigaAttivita(voce, indice))
        })
      }
      return righe
    }

    rimpiazza(
      contenitore,
      // Senza lezione sotto non c'è scheletro da mostrare: solo l'elenco, e se
      // è vuoto lo si dice.
      attivita.length === 0 && !sulleUd
        ? h('p', { class: 'testo-quieto' }, 'Nessuna attività: la scaletta è ancora vuota.')
        : h(
            'ol',
            {
              class: [
                'attivita-editor__elenco',
                sulleUd && 'attivita-editor__elenco--con-orario',
              ],
            },
            scheletro(),
          ),
      attivita.length === 0 && sulleUd
        ? h('p', { class: 'testo-quieto' }, 'Nessuna attività: la scaletta è ancora vuota.')
        : null,
      h(
        'div',
        { class: 'attivita-editor__piede' },
        pulsante({
          testo: 'Aggiungi attività',
          simbolo: 'piu',
          variante: 'sottile',
          al: () => {
            const nuova = creaAttivita('', udDaMinutiAttivita(15, perUd))
            attivita.push(nuova)
            disegna()
            allaModifica(attivita)
            // Chi aggiunge una riga vuole scriverci subito il titolo: andarlo
            // a cercare in fondo alla scaletta è il gesto che si vuole evitare.
            contenitore
              .querySelector<HTMLElement>(`[data-attivita-id="${nuova.id}"] input`)
              ?.focus()
          },
        }),
        // Il totale in minuti come le tappe, e accanto quante unità fa l'ora:
        // è il confronto che si guarda preparando, e mescolare le due unità
        // nella stessa riga costringeva a convertire a mente.
        sulleUd
          ? pastiglia(
              `${formattaDurata(minutiDiAttivita(totale, sulleUd.minutiPerUd))} su ` +
                `${formattaDurata(sulleUd.minutiLezione)} (${formattaUd(sulleUd.udLezione)})` +
                (sulleUd.scostamento > 0
                  ? ` · ${minutiDiAttivita(sulleUd.scostamento, sulleUd.minutiPerUd)} min di troppo`
                  : ''),
              sulleUd.scostamento > 0 ? 'negativo' : 'positivo',
              'orologio',
            )
          : pastiglia(
              `totale ${formattaDurata(minutiDiAttivita(totale, perUd))}`,
              'informativo',
              'orologio',
            ),
      ),
    )
  }

  disegna()
  return contenitore
}

/**
 * Gli stati particolari di un piano, detti aprendo la modifica.
 *
 * Un piano non è un foglio per conto suo: sta su un corso, lo usano delle ore,
 * e dalle sue tappe sono nati dei voti. Quel che si cambia qui si sente
 * altrove, e finora non lo diceva nessuno — si scopriva dopo, guardando l'ora
 * che aveva perso la spunta o il momento che non sapeva più da dove veniva.
 *
 * Chi impedisce il salvataggio viene per primo: è la cosa da sistemare prima
 * di scrivere qualunque altra riga.
 */
function statiDelPiano (base: PianoLezione): Array<{ testo: string, blocca: boolean }> {
  const avvisi: Array<{ testo: string, blocca: boolean }> = []
  const corsi = stato.registro.corsi
  const suo = base.corsoId ? corsi.find((c) => c.id === base.corsoId) ?? null : null

  if (corsi.length === 0) {
    avvisi.push({
      testo:
        'Nel registro non c’è nessun corso. Un piano è di un corso, e senza non si ' +
        'può salvare: crea prima il corso, dal «+» qui accanto al campo.',
      blocca: true,
    })
  } else if (!base.corsoId) {
    avvisi.push({
      testo:
        'Questo piano non ha un corso: glielo ha tolto l’eliminazione del corso che ' +
        'citava. Scegline uno qui sopra — senza, il salvataggio viene rifiutato.',
      blocca: true,
    })
  } else if (!suo) {
    avvisi.push({
      testo: 'Il corso che questo piano citava non esiste più. Scegline un altro qui sopra.',
      blocca: true,
    })
  }

  const usi = stato.registro.lezioni.filter((l) => l.pianoId === base.id)
  if (usi.length > 1) {
    avvisi.push({
      testo:
        `Questa scaletta è di ${usi.length} ore: quel che si cambia qui cambia in tutte. ` +
        'Per cambiarne una sola, duplica il piano e adatta la copia.',
      blocca: false,
    })
  }

  // Le ore su cui si è già spuntato qualcosa: togliere una tappa toglie anche
  // la sua spunta, e quella spunta era il consuntivo di un'ora già fatta.
  const conSpunte = usi.filter((l) => l.avanzamento.some((a) => a.stato !== 'da-fare'))
  if (conSpunte.length > 0) {
    avvisi.push({
      testo:
        `${conSpunte.length === 1 ? 'Un’ora ha' : `${conSpunte.length} ore hanno`} già le spunte ` +
        'di quel che si è fatto. Togliendo una tappa se ne va anche la sua spunta; ' +
        'gli argomenti e il consuntivo già scritti restano.',
      blocca: false,
    })
  }

  // I momenti nati dalle tappe: i voti restano comunque, ma il momento perde
  // la riga di scaletta da cui era uscito.
  const daTappe = stato.registro.valutazioni.filter(
    (v) => v.pianoId === base.id && Boolean(v.attivitaId),
  )
  if (daTappe.length > 0) {
    const voti = daTappe.reduce((somma, m) => somma + m.voti.filter((x) => x.valore !== null).length, 0)
    avvisi.push({
      testo:
        `Da queste tappe ${daTappe.length === 1 ? 'è nato un momento' : `sono nati ${daTappe.length} momenti`} ` +
        `di valutazione${voti > 0 ? ` con ${voti} voti già messi` : ''}. Togliendo la tappa che ` +
        'lo ha prodotto i voti restano dove sono, ma il momento non sa più da dove viene.',
      blocca: false,
    })
  }

  return avvisi
}

export function moduloPiano (
  piano?: PianoLezione,
  dopo?: (pianoId: string) => void,
  /** Il corso da proporre a un piano nuovo: chi apre il modulo di solito lo sa. */
  corsoDaProporre?: string | null,
  /**
   * L'ora per cui lo si sta preparando, quando c'è: la scaletta si posa sulle
   * sue unità didattiche, e si vede subito quanto ci sta e quanto sfora.
   */
  lezione?: Lezione | null,
): void {
  const modifica = Boolean(piano)
  // Il piano nasce sul corso che gli si indica, o su quello della classe
  // filtrata se ce n'è uno solo: è quasi sempre quello, e resta cambiabile.
  const corsiDelFiltro = stato.filtroClasseId ? corsiDi(stato.filtroClasseId) : []
  const base =
    piano ??
    creaPiano(corsoDaProporre ?? (corsiDelFiltro.length === 1 ? corsiDelFiltro[0].id : null))
  // La copia dev'essere profonda su tutto quel che l'editor tocca: senza,
  // `voce.parametri` e `voce.valutazione` restavano gli stessi oggetti di
  // `stato.registro`, e l'editor ci scriveva dentro prima ancora di salvare —
  // «Annulla» non ripristinava niente perché il registro era già stato toccato.
  let attivita: Attivita[] = base.attivita.map((a) => ({
    ...a,
    valutazione: a.valutazione ? { ...a.valutazione } : a.valutazione,
    parametri: a.parametri ? { ...a.parametri } : a.parametri,
    risorse: [...a.risorse],
  }))
  // Le risorse del piano nel suo insieme. Non passano dai campi del modulo —
  // le scrive l'host quando copia un file — e quindi si tengono qui, rilette
  // dal registro a ogni giro: prenderle da `base` vorrebbe dire rimandare
  // l'elenco di prima e cancellare l'allegato appena messo.
  let risorsePiano: Risorsa[] = base.risorse

  /** Il piano com'è adesso nel modulo, pronto da mandare. */
  const componiPiano = (valori: Record<string, string | number | boolean>): PianoLezione => ({
    ...base,
    corsoId: testo(valori.corsoId) || null,
    obiettivi: String(valori.obiettivi ?? '')
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean),
    prerequisiti: testo(valori.prerequisiti),
    note: testo(valori.note),
    tag: String(valori.tag ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    risorse: risorsePiano,
    attivita,
  })

  /**
   * Il piano messo al sicuro prima di allegarci qualcosa.
   *
   * Un file lo copia l'host, dentro l'archivio, e per farlo deve sapere a
   * quale piano e a quale tappa appartiene: un piano ancora solo nel modulo
   * non ce l'ha, un posto. Quindi allegare salva — ed è anche il motivo per
   * cui allegare a un piano nuovo lo fa esistere.
   */
  const salvaAdesso = async (): Promise<boolean> => {
    const risposta = await invia({
      tipo: 'piano.salva',
      piano: componiPiano(valoriModulo(corpoModulo)),
    })
    if (!risposta.ok) {
      notifica((risposta.errori ?? ['Il piano non si è potuto salvare.']).join(' '), 'avviso')
      return false
    }
    return true
  }

  /** Le risorse come stanno adesso nel registro: del piano, o di una sua tappa. */
  const rilette = (attivitaId: string | null): Risorsa[] | null => {
    const salvato = stato.registro.piani.find((p) => p.id === base.id)
    if (!salvato) return null
    if (!attivitaId) return salvato.risorse
    return salvato.attivita.find((a) => a.id === attivitaId)?.risorse ?? null
  }

  // Chi disegna risorse si registra qui, e un giro solo li rinfresca tutti.
  const rinfrescatori: Array<() => void> = []
  const rinfrescaTutto = () => {
    for (const rinfresca of rinfrescatori) rinfresca()
  }
  const gestoreRisorse: GestoreRisorse = {
    pianoId: base.id,
    prima: salvaAdesso,
    rilette,
    registra: (rinfresca) => rinfrescatori.push(rinfresca),
    rinfrescaTutto,
  }

  const zonaRisorsePiano = h('div')
  const disegnaRisorsePiano = (): void => {
    rimpiazza(
      zonaRisorsePiano,
      bloccoRisorse({
        pianoId: base.id,
        attivitaId: null,
        risorse: risorsePiano,
        prima: salvaAdesso,
        dopo: rinfrescaTutto,
      }),
    )
  }
  rinfrescatori.push(() => {
    const fresche = rilette(null)
    if (fresche) risorsePiano = fresche
    disegnaRisorsePiano()
  })

  const particolari = modifica ? statiDelPiano(base) : []

  /**
   * Il modulo, quando c'è.
   *
   * Dentro la sua costruzione c'è chi lo rilegge — la tendina dei tipi guarda
   * quale corso è scelto — e durante la costruzione il modulo non esiste
   * ancora: leggerlo di lì faceva cadere l'apertura con un errore, e il
   * pulsante «Modifica» non apriva niente. Sta qui, e vale null finché non è
   * finito.
   */
  let modulo: HTMLElement | null = null

  const corpoModulo: HTMLElement = h(
    'div',
    { class: 'modulo' },
    // Quel che c'è da sapere prima di toccare qualcosa: il corso che manca, le
    // ore che usano questa stessa scaletta, le spunte e i voti che ne sono
    // già usciti.
    particolari.length > 0
      ? avviso(
          h(
            'ul',
            { class: 'elenco-avviso' },
            ...particolari.map((v) => h('li', null, v.testo)),
          ),
          particolari.some((v) => v.blocca) ? 'attenzione' : 'informativo',
        )
      : null,
    // Un titolo non si chiede: il piano è la lezione di questo corso, e il
    // nome se lo compone da sé. Quel che lo rende ritrovabile — obiettivi,
    // etichette, note — si scrive qui sotto, ed è roba che dice qualcosa.
    riga(
      campoCorso({
        valore: base.corsoId ?? '',
        richiesto: true,
        aiuto: 'Il piano è di questo corso. Per usarlo altrove lo si duplica e lo si adatta.',
      }),
    ),
        riga(
          campo({
            nome: 'obiettivi',
            etichetta: 'Obiettivi',
            tipo: 'textarea',
            righe: 4,
            valore: base.obiettivi.join('\n'),
            aiuto: 'Uno per riga.',
            larghezza: 'meta',
          }),
          campo({
            nome: 'prerequisiti',
            etichetta: 'Prerequisiti',
            tipo: 'textarea',
            righe: 4,
            valore: base.prerequisiti ?? '',
            larghezza: 'meta',
          }),
        ),
        sezioneModulo(
          'Scaletta',
          h(
            'p',
            { class: 'testo-quieto' },
            'Ogni tappa porta con sé il suo materiale e dice se è una valutazione. ' +
              'Allegare un file salva subito il piano: il file dev’essere di qualcuno.',
          ),
          editorAttivita(
            attivita,
            (nuove) => {
              attivita = nuove
            },
            lezione,
            gestoreRisorse,
            // Il corso lo si legge dal campo e non da `base`: cambiandolo, i
            // tipi offerti cambiano con lui.
            () => {
              const scelto = modulo?.querySelector<HTMLSelectElement>('[name="corsoId"]')?.value
              return classeDelCorsoId(scelto || base.corsoId)?.docenteDiClasse ?? false
            },
          ),
        ),
        // Il materiale che vale per tutta l'ora, e non per una tappa sola: la
        // dispensa del capitolo, il link al video che si guarda in apertura.
        sezioneModulo(
          'Risorse del piano',
          h(
            'p',
            { class: 'testo-quieto' },
            'File e immagini vengono copiati nell’archivio del registro, accanto agli ' +
              'altri documenti del corso: il piano regge anche l’anno prossimo.',
          ),
          zonaRisorsePiano,
        ),
        riga(
          campo({
            nome: 'tag',
            etichetta: 'Etichette',
            valore: base.tag.join(', '),
            segnaposto: 'algebra, recupero',
            aiuto: 'Separate da virgola: servono a ritrovare il piano.',
            larghezza: 'meta',
          }),
          campo({ nome: 'note', etichetta: 'Note', tipo: 'textarea', righe: 2, valore: base.note ?? '', larghezza: 'meta' }),
        ),
  )

  modulo = corpoModulo
  disegnaRisorsePiano()

  apriModale({
    titolo: modifica ? 'Modifica piano lezione' : 'Nuovo piano lezione',
    larghezza: 'larga',
    corpo: () => corpoModulo,
    alSalva: async (valori, contesto) => {
      const aggiornato = componiPiano(valori)
      await salva(
        contesto,
        { tipo: 'piano.salva', piano: aggiornato },
        modifica ? 'Piano aggiornato.' : 'Piano creato.',
        (idCreato) => {
          const pianoId = idCreato ?? aggiornato.id
          if (dopo) {
            dopo(pianoId)
            return
          }
          aggiorna({ vista: 'piani', pianoId })
        },
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? [
            tastoDuplica({
              contesto,
              azione: { tipo: 'piano.duplica', pianoId: base.id },
              fatto: 'Piano duplicato.',
              poi: (idCreato) => aggiorna({ pianoId: idCreato }),
            }),
            tastoElimina({
              contesto,
              chiedi: { genere: 'piano', id: base.id },
              azione: { tipo: 'piano.elimina', pianoId: base.id },
              fatto: 'Piano eliminato.',
              poi: () => aggiorna({ pianoId: null }),
            }),
          ]
        : null,
  })
}


/** Sceglie quale piano assegnare a una lezione, con l'anteprima della scaletta. */
export function moduloAssegnaPiano (lezione: Lezione): void {
  // I piani della materia del corso, di qualunque anno: quello dell'anno
  // scorso è esattamente il candidato buono.
  const piani = pianiPerCorso(lezione.corsoId)
  // Il cambio fra le unità del piano e i minuti dell'ora: è quello dell'ora
  // vera, che è la sola con cui il confronto vuol dire qualcosa.
  const minutiUd = contaUd(lezione) > 0 ? minutiEffettivi(lezione) / contaUd(lezione) : MINUTI_UD

  /**
   * Il piano nuovo nasce già al posto suo: sul corso di questa lezione, e
   * assegnato a questa lezione appena salvato.
   *
   * Prima apriva il modulo vuoto: il piano nasceva senza corso — quindi fuori
   * da ogni elenco che lo cerca per materia — e la lezione da cui si era
   * partiti restava senza. Si finiva per rifare a mano i due passaggi che si
   * erano appena chiesti.
   */
  const creaEAssegna = (contesto: ContestoModale) => {
    contesto.chiudi()
    moduloPiano(
      undefined,
      async (pianoId) => {
        const risposta = await azione({ tipo: 'piano.assegna', lezioneId: lezione.id, pianoId })
        if (risposta.ok) notifica('Piano creato e assegnato a questa lezione.', 'successo')
      },
      lezione.corsoId,
      lezione,
    )
  }

  apriModale({
    titolo: 'Assegna un piano lezione',
    sottotitolo: formattaData(lezione.data, 'lungo'),
    larghezza: 'media',
    corpo: (contesto) => {
      if (piani.length === 0) {
        return statoVuoto({
          simbolo: 'piano',
          titolo: 'Nessun piano preparato',
          testo: 'I piani si preparano una volta e si riusano su più lezioni.',
          azione: pulsante({
            testo: 'Crea un piano',
            variante: 'primario',
            simbolo: 'piu',
            al: () => creaEAssegna(contesto),
          }),
        })
      }

      const disponibili = `${formattaDurata(minutiEffettivi(lezione))} (${formattaUd(contaUd(lezione))})`
      return h(
        'div',
        { class: 'elenco-scelta' },
        h('p', { class: 'testo-quieto' }, `La lezione è di ${disponibili}.`),
        ...piani.map((piano) => {
          const durata = piano.attivita.reduce((s, a) => s + a.durataUd, 0)
          const prove = piano.attivita.filter(attivitaValutata).length
          const scostamento = durata - contaUd(lezione)
          return h(
            'button',
            {
              class: ['voce-scelta', lezione.pianoId === piano.id && 'voce-scelta--attiva'],
              type: 'button',
              onclick: (evento: MouseEvent) =>
                void conAttesa(
                  evento.currentTarget as HTMLButtonElement,
                  (async () => {
                    const risposta = await azione({
                      tipo: 'piano.assegna',
                      lezioneId: lezione.id,
                      pianoId: piano.id,
                    })
                    if (!risposta.ok) return
                    contesto.chiudi()
                    notifica('Piano assegnato.', 'successo')
                  })(),
                ),
            },
            h(
              'div',
              { class: 'voce-scelta__testo' },
              h('strong', null, nomeDiPiano(piano)),
              h(
                'small',
                null,
                `${piano.attivita.length} attività · ${formattaDurata(minutiDiAttivita(durata, minutiUd))}` +
                  // Che l'ora porti dei voti è la cosa che si vuole sapere
                  // scegliendo un piano: cambia come si prepara la lezione.
                  (prove > 0 ? ` · ${prove === 1 ? 'una prova' : `${prove} prove`}` : ''),
              ),
            ),
            Math.abs(scostamento) >= 0.05
              ? pastiglia(
                  scostamento > 0
                    ? `+${minutiDiAttivita(scostamento, minutiUd)} min`
                    : `−${minutiDiAttivita(-scostamento, minutiUd)} min`,
                  scostamento > 0 ? 'attenzione' : 'quiete',
                )
              : pastiglia('in orario', 'positivo'),
          )
        }),
        h(
          'div',
          { class: 'elenco-scelta__piede' },
          // Nessuno di quelli va bene: se ne fa uno, e nasce già di questo
          // corso e di questa lezione.
          pulsante({
            testo: 'Nuovo piano per questa lezione',
            variante: 'sottile',
            simbolo: 'piu',
            al: () => creaEAssegna(contesto),
          }),
          lezione.pianoId
            ? pulsante({
                testo: 'Togli il piano assegnato',
                variante: 'sottile',
                simbolo: 'chiudi',
                al: async () => {
                  const risposta = await azione({
                    tipo: 'piano.assegna',
                    lezioneId: lezione.id,
                    pianoId: null,
                  })
                  if (!risposta.ok) return
                  contesto.chiudi()
                  notifica('Piano rimosso dalla lezione.', 'info')
                },
              })
            : null,
        ),
      )
    },
  })
}
