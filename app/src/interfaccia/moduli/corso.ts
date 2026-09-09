// Il corso — una materia a una classe — con le sue ore fisse, e l'avvio guidato
// che li mette insieme la prima volta.
//
// L'orario sta qui e non a parte perché è la ragione per cui un corso esiste:
// senza le ore in cui lo si fa, il corso è una riga che non produce niente.

import {
  formattaDurata,
  minutiDaUd,
  minutiInUd,
  oggi,
  sommaMinuti,
  udDaMinuti,
} from '../../dominio/date.js'
import {
  creaAnnoCorrente,
  creaClasse,
  creaMateria,
  creaRicorrenza,
} from '../../dominio/fabbriche.js'
import type { Corso, Ricorrenza } from '../../dominio/modelli.js'
import { nomeNormalizzato } from '../../dominio/validazione.js'
import { campo, pastiglia, pulsante, riga, sezioneModulo } from '../componenti/base.js'
import { apriModale } from '../componenti/modale.js'
import { notifica } from '../componenti/notifiche.js'
import { h, rimpiazza } from '../dom.js'
import { azione, invia } from '../ponte.js'
import {
  annoCorrente,
  aggiorna,
  classePerId,
  classiVisibili,
  materiaPerId,
  stato,
} from '../stato.js'
import { titoloCorso } from '../../dominio/corsi.js'
import { ricorrenzeIncatenate } from '../../dominio/orario.js'

import { moduloClasse } from './classe.js'
import {
  applicaOrario,
  campoCollegato,
  campoDi,
  fuocoSullaPresa,
  opzioniMaterie,
  presaDiRiga,
  riordinatore,
  richiedeAnno,
  salva,
  spostaVoce,
  tastoElimina,
  testo,
  VOCI_GIORNO_SETTIMANA,
} from './comune.js'
import { moduloMateria } from './materia.js'

/**
 * L’editor delle ricorrenze: le ore fisse di un corso in settimana.
 *
 * Come per gli slot, le righe si costruiscono una volta sola e restano: si
 * ridisegnava a ogni tasto, e chi scriveva l’orario di sei fasce perdeva il
 * campo sotto le dita a ogni cifra.
 *
 * La giornata è un seguito, non un elenco di ore sparse: la seconda fascia del
 * mercoledì comincia quando finisce la prima, e per questo di ogni giorno si
 * dichiara una sola ora — quella con cui si entra. Le altre le eredita il
 * registro e il campo resta spento, perché ribatterle a mano è soltanto il
 * modo di farle scivolare di cinque minuti senza accorgersene. Quel che si
 * decide è l’ordine dentro la giornata, e lo si decide trascinando la riga per
 * la presa; trascinata su un altro giorno, la fascia si sposta lì.
 */
function editorRicorrenze (
  iniziali: Ricorrenza[],
  allaModifica: (orario: Ricorrenza[]) => void,
): HTMLElement {
  // All’apertura l’ordine viene dagli orari salvati; da lì in poi lo tiene chi
  // trascina, e il riordino guarda solo il giorno.
  let orario = [...iniziali]
    .sort((a, b) => a.giorno - b.giorno || a.inizio.localeCompare(b.inizio))
    .map((r) => ({ ...r }))

  const contenitore = h('div', { class: 'slot-editor' })

  const notifica_ = () => allaModifica(orario.map((r) => ({ ...r })))

  const righe = h('div', { class: 'slot-editor__righe' })
  const totale = h('span', { class: 'slot-editor__conti' })
  /** Come rimettere nei campi di ogni riga quel che dice il modello. */
  const sincronizzatori: Array<() => void> = []

  /**
   * Rimette le fasce in fila per giorno e riattacca ciascuna alla precedente,
   * sugli stessi oggetti: le righe già costruite tengono in mano la loro voce.
   *
   * L’ordinamento è stabile e guarda solo il giorno, così l’ordine deciso
   * trascinando resta quello dentro la giornata.
   */
  const riallinea = () => {
    orario = [...orario].sort((a, b) => a.giorno - b.giorno)
    const attaccate = ricorrenzeIncatenate(orario)
    orario.forEach((r, i) => {
      r.inizio = attaccate[i].inizio
    })
  }

  const aggiornaTotale = () => {
    const settimanali = orario.reduce((somma, r) => somma + r.durataMin, 0)
    rimpiazza(
      totale,
      orario.length > 0
        ? pastiglia(
            `${udDaMinuti(settimanali)} UD a settimana · ${formattaDurata(settimanali)}`,
            'informativo',
            'orologio',
          )
        : h('span', { class: 'testo-quieto' }, 'Senza fasce non si genera niente.'),
    )
  }

  /** Rifà la catena e rimette nei campi quel che ne è venuto fuori. */
  const incatena = () => {
    riallinea()
    for (const sincronizza of sincronizzatori) sincronizza()
    aggiornaTotale()
    notifica_()
  }

  const riordina = riordinatore(righe, (da, a) => {
    if (a < 0 || a >= orario.length || da === a) return
    // Trascinata fra le fasce di un altro giorno, la fascia passa a quel
    // giorno: è il gesto che si sta facendo, e chiederlo poi al menu sarebbe
    // farlo due volte.
    orario[da].giorno = orario[a].giorno
    orario = spostaVoce(orario, da, a)
    disegna()
    notifica_()
    fuocoSullaPresa(righe, a)
  })

  /** Il primo giorno della settimana senza fasce, a partire da quello dato. */
  const giornoLibero = (da: number): number => {
    for (let passo = 1; passo <= 6; passo += 1) {
      const giorno = ((da - 1 + passo) % 7) + 1
      if (!orario.some((r) => r.giorno === giorno)) return giorno
    }
    return da
  }

  const rigaRicorrenza = (voce: Ricorrenza, indice: number): HTMLElement => {
    // La prima fascia del giorno dice a che ora si entra; le altre vengono
    // dietro.
    const attaccata = indice > 0 && orario[indice - 1].giorno === voce.giorno
    const fine = h('span', { class: 'slot-riga__durata' })

    const inizio = h('input', {
      class: 'campo__controllo campo__controllo--ora',
      type: 'time',
      value: voce.inizio,
      disabled: attaccata,
      attr: {
        'aria-label': attaccata ? 'Inizio, dato dalla fascia precedente' : 'Inizio della giornata',
        title: attaccata
          ? 'Comincia dove finisce la fascia sopra: per spostarla, cambia l’ordine o l’ora della prima fascia del giorno.'
          : 'L’ora in cui comincia la giornata: le fasce sotto la seguono.',
      },
    }) as HTMLInputElement

    const durata = h('input', {
      class: 'campo__controllo campo__controllo--numero',
      type: 'number',
      value: String(udDaMinuti(voce.durataMin)),
      attr: { min: '1', step: '1', 'aria-label': 'Unità didattiche' },
    }) as HTMLInputElement

    const sincronizza = () => {
      inizio.value = voce.inizio
      durata.value = String(udDaMinuti(voce.durataMin))
      rimpiazza(fine, `→ ${sommaMinuti(voce.inizio, voce.durataMin)}`)
    }
    sincronizzatori.push(sincronizza)

    inizio.addEventListener('change', () => {
      if (!inizio.value) return sincronizza()
      voce.inizio = inizio.value
      // Spostare la prima fascia sposta tutta la giornata: le altre sono
      // attaccate.
      incatena()
    })

    durata.addEventListener('change', () => {
      voce.durataMin = minutiDaUd(Number(durata.value) || 1)
      // Allungare una fascia spinge avanti quelle che le stanno dietro.
      incatena()
    })

    const presa = presaDiRiga()
    const riga = h(
      'div',
      { class: 'slot-riga' },
      presa,
      h(
        'select',
        {
          class: 'campo__controllo campo__controllo--selezione slot-riga__giorno',
          attr: { 'aria-label': 'Giorno' },
          onchange: (evento: Event) => {
            voce.giorno = Number((evento.target as HTMLSelectElement).value)
            // In coda al nuovo giorno: l’ordinamento stabile la lascia lì, e
            // si sa dov’è finita senza doverla cercare.
            orario = [...orario.filter((r) => r !== voce), voce]
            disegna()
            notifica_()
          },
        },
        ...VOCI_GIORNO_SETTIMANA.map((g) =>
          h('option', { value: g.valore, selected: String(voce.giorno) === g.valore }, g.testo),
        ),
      ),
      inizio,
      durata,
      h('span', { class: 'slot-riga__durata' }, 'UD'),
      fine,
      h('input', {
        class: 'campo__controllo',
        type: 'text',
        value: voce.aula ?? '',
        attr: { placeholder: 'aula', 'aria-label': 'Aula' },
        onchange: (evento: Event) => {
          voce.aula = (evento.target as HTMLInputElement).value
          notifica_()
        },
      }),
      pulsante({
        simbolo: 'duplica',
        variante: 'fantasma',
        titolo: 'Ripeti questa fascia in un altro giorno',
        al: () => {
          // Un orario è quasi sempre la stessa ora in giorni diversi: la copia
          // va sul primo giorno ancora vuoto e tiene ora e durata, invece di
          // impilarsi sotto l’originale — che è l’unico posto in cui la stessa
          // fascia due volte non serve a niente.
          const copia = creaRicorrenza(giornoLibero(voce.giorno), voce.inizio, voce.durataMin)
          copia.aula = voce.aula
          orario.push(copia)
          disegna()
          notifica_()
        },
      }),
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: 'Togli questa fascia',
        al: () => {
          orario = orario.filter((r) => r.id !== voce.id)
          disegna()
          notifica_()
        },
      }),
    )
    riordina(riga, presa, indice)
    sincronizza()
    return riga
  }

  function disegna (): void {
    riallinea()
    sincronizzatori.length = 0
    rimpiazza(righe, ...orario.map(rigaRicorrenza))
    aggiornaTotale()
  }

  contenitore.append(
    righe,
    h(
      'div',
      { class: 'slot-editor__coda' },
      pulsante({
        testo: 'Aggiungi una fascia',
        simbolo: 'piu',
        variante: 'sottile',
        al: () => {
          const ultima = orario.at(-1)
          orario.push(
            creaRicorrenza(
              ultima?.giorno ?? 1,
              ultima?.inizio ?? stato.registro.impostazioni.oraInizioGiornata,
              minutiInUd(
                ultima?.durataMin ?? stato.registro.impostazioni.durataSlotPredefinita,
              ),
            ),
          )
          disegna()
          notifica_()
        },
      }),
      totale,
    ),
  )

  disegna()
  // Come per gli slot: le fasce mostrate sono già attaccate, e sono quelle che
  // si salvano anche senza toccare niente.
  notifica_()
  return contenitore
}


/**
 * Un corso: questa materia, a questa classe — e le ore in cui la si fa.
 *
 * È l'unico posto in cui un corso nasce, cambia nome, prende un orario e ne fa
 * lezioni vere. Sta tutto in una finestra perché è un gesto solo: si dice che
 * cosa si insegna a chi, si dichiara quando, e le ore vanno sul calendario.
 * Classe e materia si creano da qui: chi apre questo modulo sta preparando
 * l'anno, e mandarlo in altre due viste a cercare i pezzi è il modo migliore
 * per fargli perdere il filo.
 *
 * Su un corso che c'è già, classe e materia non si toccano più: cambiarle
 * porterebbe lezioni, presenze e voti addosso a un'altra classe senza che
 * nessuno se ne accorga. Si toglie il corso e se ne fa un altro, che è quel che
 * si intendeva davvero.
 */
export interface OpzioniModuloCorso {
  corso?: Corso
  /** La classe da proporre a un corso nuovo. */
  classeId?: string
  /** La materia da proporre a un corso nuovo. */
  materiaId?: string
  dopo?: (corsoId: string) => void
}

export function moduloCorso (opzioni: OpzioniModuloCorso = {}): void {
  const anno = richiedeAnno(moduloAvvio)
  if (!anno) return

  const corso = opzioni.corso ?? null
  const modifica = Boolean(corso)
  let orario = (corso?.orario ?? []).map((r) => ({ ...r }))
  let classeScelta = corso?.classeId ?? opzioni.classeId ?? stato.filtroClasseId ?? ''
  let materiaScelta = corso?.materiaId ?? opzioni.materiaId ?? ''

  // La generazione parte da oggi se l'anno è già cominciato: rimettere sul
  // calendario le ore di settembre a marzo non serve a nessuno.
  const dalPredefinito = oggi() > anno.inizio ? oggi() : anno.inizio

  // Il titolo si scrive da solo — 'Matematica — I MEC A' è come lo si chiama
  // parlando — finché non lo si tocca a mano: da lì in poi comanda chi scrive.
  let campoTitolo: HTMLInputElement | null = null
  const proponiTitolo = () => {
    if (!campoTitolo || campoTitolo.dataset.tocco === 'si') return
    campoTitolo.value =
      classeScelta && materiaScelta
        ? titoloCorso(classePerId(classeScelta), materiaPerId(materiaScelta))
        : ''
  }

  const corpoModulo = h(
    'div',
    { class: 'modulo' },
    riga(
      modifica
        ? campo({
            nome: 'classeFissa',
            etichetta: 'Classe',
            valore: classePerId(classeScelta)?.nome ?? 'classe sparita',
            disabilitato: true,
            larghezza: 'meta',
            aiuto: 'Non si cambia: lezioni e voti sono di questa classe.',
          })
        : campoCollegato({
            nome: 'classeId',
            etichetta: 'Classe',
            valore: classeScelta,
            vuoto: '— scegli la classe —',
            voci: () => classiVisibili().map((c) => ({ valore: c.id, testo: c.nome })),
            titoloNuovo: 'Nuova classe',
            apriNuovo: (fatto) => moduloClasse(undefined, fatto),
            richiesto: true,
            larghezza: 'meta',
            al: (valore) => {
              classeScelta = valore
              proponiTitolo()
            },
          }),
      modifica
        ? campo({
            nome: 'materiaFissa',
            etichetta: 'Materia',
            valore: materiaPerId(materiaScelta)?.nome ?? 'materia sparita',
            disabilitato: true,
            larghezza: 'meta',
            aiuto: 'Non si cambia: i piani lezione seguono la materia.',
          })
        : campoCollegato({
            nome: 'materiaId',
            etichetta: 'Materia',
            valore: materiaScelta,
            vuoto: '— scegli la materia —',
            voci: () => opzioniMaterie(),
            titoloNuovo: 'Nuova materia',
            apriNuovo: (fatto) => moduloMateria(undefined, fatto),
            richiesto: true,
            larghezza: 'meta',
            al: (valore) => {
              materiaScelta = valore
              proponiTitolo()
            },
          }),
    ),
    campo({
      nome: 'titolo',
      etichetta: 'Come si chiama',
      valore: corso?.titolo ?? '',
      segnaposto: 'Matematica — I MEC A',
      aiuto: 'Lasciandolo stare si scrive da solo con la materia e la classe.',
      al: (_valore, evento) => {
        ;(evento.target as HTMLInputElement).dataset.tocco = 'si'
      },
    }),
    sezioneModulo(
      'Ore fisse in settimana',
      editorRicorrenze(orario, (nuove) => {
        orario = nuove
      }),
    ),
    sezioneModulo(
      'Lezioni sul calendario',
      h(
        'p',
        { class: 'testo-quieto' },
        'Mette sul calendario le ore che mancano, saltando le sospensioni dell’anno. ' +
          'Quel che c’è già non viene toccato, quindi si può rilanciare a ogni cambio d’orario.',
      ),
      riga(
        campo({ nome: 'dal', etichetta: 'Dal', tipo: 'date', valore: dalPredefinito, larghezza: 'meta' }),
        campo({ nome: 'al', etichetta: 'Al', tipo: 'date', valore: anno.fine, larghezza: 'meta' }),
      ),
      modifica
        ? pulsante({
            testo: 'Genera le lezioni',
            simbolo: 'calendario',
            variante: 'sottile',
            al: async (evento: MouseEvent) => {
              const modulo = (evento.target as HTMLElement).closest<HTMLElement>('.modulo')
              const dal = (modulo && campoDi(modulo, 'dal')?.value) ?? ''
              const al = (modulo && campoDi(modulo, 'al')?.value) ?? ''
              // L'orario appena scritto vale solo se salvato prima: generare da
              // uno stampo che sta ancora nel modulo darebbe lezioni che non
              // corrispondono a niente. A differenza di `applicaOrario`, qui va
              // salvato anche un orario svuotato: il corso ne aveva già uno, e
              // «Genera» deve rispecchiare quello che l'editor mostra adesso.
              const salvato = await azione({ tipo: 'orario.imposta', corsoId: corso!.id, orario })
              if (!salvato.ok) return
              // Quante ne sono nate, quante c'erano gia', quante vanno addosso
              // a un'altra classe: lo dice l'host, ed e' molto piu' di
              // «Lezioni generate». Qui non si ripete niente.
              await azione({ tipo: 'orario.genera', corsoId: corso!.id, dal, al })
            },
          })
        : campo({
            nome: 'genera',
            tipo: 'checkbox',
            etichetta: 'Genera le lezioni appena creato il corso',
            valore: true,
          }),
    ),
    campo({ nome: 'note', etichetta: 'Note', tipo: 'textarea', righe: 2, valore: corso?.note ?? '' }),
  )

  campoTitolo = campoDi(corpoModulo, 'titolo')
  if (!modifica) proponiTitolo()

  apriModale({
    titolo: modifica ? `Corso — ${corso!.titolo}` : 'Nuovo corso',
    sottotitolo: 'una materia a una classe: il perno a cui si agganciano lezioni e valutazioni',
    larghezza: 'media',
    testoSalva: modifica ? 'Salva' : 'Crea il corso',
    corpo: () => corpoModulo,
    alSalva: async (valori, contesto) => {
      if (modifica) {
        await salva(
          contesto,
          {
            tipo: 'corso.salva',
            corso: {
              ...corso!,
              titolo: testo(valori.titolo) || corso!.titolo,
              note: testo(valori.note),
              orario,
            },
          },
          'Corso aggiornato.',
          () => opzioni.dopo?.(corso!.id),
        )
        return
      }

      const classeId = testo(valori.classeId)
      const materiaId = testo(valori.materiaId)
      if (!classeId || !materiaId) {
        contesto.mostraErrori(['Servono una classe e una materia: il corso è la loro coppia.'])
        return
      }

      // Tre azioni in fila invece di una sola: ognuna è valida per conto suo, e
      // se una non passa quel che è già stato fatto resta buono — un corso
      // senza orario è un corso, e l'orario si rimette da qui.
      contesto.occupato(true)
      const creato = await invia({
        tipo: 'corso.crea',
        classeId,
        materiaId,
        titolo: testo(valori.titolo),
      })
      if (!creato.ok || !creato.creato) {
        contesto.occupato(false)
        contesto.mostraErrori(creato.errori ?? ['Corso non creato.'])
        return
      }
      const corsoId = creato.creato.id
      const esitoOrario = await applicaOrario(
        corsoId,
        orario,
        Boolean(valori.genera),
        testo(valori.dal),
        testo(valori.al),
      )
      contesto.occupato(false)
      contesto.chiudi()
      notifica(
        orario.length === 0
          ? 'Corso creato.'
          : esitoOrario.ok
            ? 'Corso creato, con le sue ore.'
            : 'Corso creato, ma l’orario non si è salvato: riprova dal corso.',
        esitoOrario.ok ? 'successo' : 'avviso',
      )
      if (opzioni.dopo) opzioni.dopo(corsoId)
      else aggiorna({ vista: 'corsi', corsoId })
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? tastoElimina({
            contesto,
            chiedi: { genere: 'corso', id: corso!.id },
            azione: { tipo: 'corso.elimina', corsoId: corso!.id },
            fatto: 'Corso tolto.',
            poi: () => aggiorna({ corsoId: null }),
          })
        : null,
  })
}


/**
 * Da registro vuoto a prima lezione sul calendario, in una finestra sola.
 *
 * Il registro ha una catena obbligata — anno, classe, materia, corso, orario,
 * lezioni — e finora la si doveva percorrere a mano fra tre viste diverse,
 * indovinando l'ordine. Qui la catena è scritta una volta: si compilano quattro
 * campi e i sei pezzi nascono nell'ordine giusto, agganciati fra loro.
 *
 * Non nasconde il modello: al termine ci sono gli stessi oggetti che si
 * sarebbero fatti a mano, e ognuno resta modificabile dal suo modulo. È solo il
 * giro fatto una volta al posto del docente.
 */
export function moduloAvvio (): void {
  const anno = annoCorrente()
  const proposto = creaAnnoCorrente()
  const impostazioni = stato.registro.impostazioni
  let orario = [
    creaRicorrenza(1, impostazioni.oraInizioGiornata, minutiInUd(impostazioni.durataSlotPredefinita)),
  ]

  // Persistono fuori da `alSalva`: un secondo tentativo dopo un errore deve
  // riprendere da quel che è già nato — anno, classe, materia, corso — non
  // ricrearlo daccapo. Senza, un passo che fallisce dopo che l'anno è stato
  // creato faceva nascere un secondo anno a ogni nuovo tentativo.
  let annoIdCreato: string | null = anno?.id ?? null
  let classeCreata: { id: string } | null = null
  let materiaIdCreato: string | null = null
  let corsoIdCreato: string | null = null

  apriModale({
    titolo: anno ? 'Aggiungi una classe con la sua materia' : 'Avvio del registro',
    sottotitolo: anno
      ? `Anno in uso: ${anno.etichetta}`
      : 'anno scolastico, classe, materia e ore: il registro parte da qui',
    larghezza: 'media',
    testoSalva: 'Crea tutto',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        anno
          ? null
          : sezioneModulo(
              'Anno scolastico',
              riga(
                campo({
                  nome: 'etichetta',
                  etichetta: 'Anno',
                  valore: proposto.etichetta,
                  larghezza: 'terzo',
                }),
                campo({
                  nome: 'inizio',
                  etichetta: 'Primo giorno',
                  tipo: 'date',
                  valore: proposto.inizio,
                  richiesto: true,
                  larghezza: 'terzo',
                }),
                campo({
                  nome: 'fine',
                  etichetta: 'Ultimo giorno',
                  tipo: 'date',
                  valore: proposto.fine,
                  richiesto: true,
                  larghezza: 'terzo',
                }),
              ),
              h(
                'p',
                { class: 'testo-quieto' },
                'I due semestri nascono con l’anno, tagliati a fine gennaio. Si spostano dalle Impostazioni.',
              ),
            ),
        sezioneModulo(
          'Che cosa insegni, e a chi',
          riga(
            campo({
              nome: 'classe',
              etichetta: 'Classe',
              valore: '',
              segnaposto: 'I MEC A',
              richiesto: true,
              larghezza: 'meta',
            }),
            campo({
              nome: 'materia',
              etichetta: 'Materia',
              valore: '',
              segnaposto: 'Matematica',
              richiesto: true,
              aiuto: 'Se la materia c’è già, si riusa quella invece di farne una copia.',
              larghezza: 'meta',
            }),
          ),
        ),
        sezioneModulo(
          'Quando si fa lezione',
          editorRicorrenze(orario, (nuove) => {
            orario = nuove
          }),
          campo({
            nome: 'genera',
            tipo: 'checkbox',
            etichetta: 'Metti subito le lezioni sul calendario, fino a fine anno',
            valore: true,
            aiuto: 'Si può rifare quando l’orario cambia: le ore che ci sono già non si toccano.',
          }),
        ),
      ),
    alSalva: async (valori, contesto) => {
      const nomeClasse = testo(valori.classe)
      const nomeMateria = testo(valori.materia)
      if (!nomeClasse || !nomeMateria) {
        contesto.mostraErrori(['Servono il nome della classe e quello della materia.'])
        return
      }

      // Una fila di azioni, non una transazione: se una non passa, quel che è
      // già nato resta valido e l'errore dice a che punto ci si è fermati.
      // Rifare il giro non duplica niente — la materia si riusa e il corso di
      // una coppia già aperta si ritrova invece di sdoppiarsi.
      const passo = async (comando: Parameters<typeof invia>[0]): Promise<string | null> => {
        const risposta = await invia(comando)
        if (!risposta.ok) throw new Error((risposta.errori ?? ['Non riuscito.']).join(' '))
        return risposta.creato?.id ?? null
      }

      contesto.occupato(true)
      try {
        const inizio = anno?.inizio ?? testo(valori.inizio)
        const fine = anno?.fine ?? testo(valori.fine)

        if (!annoIdCreato) {
          annoIdCreato = await passo({
            tipo: 'anno.crea',
            inizio,
            fine,
            etichetta: testo(valori.etichetta),
          })
          if (!annoIdCreato) throw new Error('Anno non creato.')
        }

        if (!classeCreata) {
          const classe = creaClasse(
            annoIdCreato,
            nomeClasse,
            stato.registro.classi.map((c) => c.colore),
          )
          await passo({ tipo: 'classe.salva', classe })
          classeCreata = { id: classe.id }
        }

        if (!materiaIdCreato) {
          // Una materia scritta due volte fa due corsi che si dividono le
          // stesse ore: se il nome c'è già, si riusa quella.
          const gia = stato.registro.materie.find(
            (m) => nomeNormalizzato(m.nome) === nomeNormalizzato(nomeMateria),
          )
          materiaIdCreato = gia?.id ?? null
          if (!materiaIdCreato) {
            const materia = creaMateria(nomeMateria)
            await passo({ tipo: 'materia.salva', materia })
            materiaIdCreato = materia.id
          }
        }

        if (!corsoIdCreato) {
          corsoIdCreato = await passo({
            tipo: 'corso.crea',
            classeId: classeCreata.id,
            materiaId: materiaIdCreato,
          })
          if (!corsoIdCreato) throw new Error('Corso non creato.')
        }

        const esitoOrario = await applicaOrario(
          corsoIdCreato,
          orario,
          Boolean(valori.genera),
          oggi() > inizio ? oggi() : inizio,
          fine,
        )

        contesto.occupato(false)
        contesto.chiudi()
        notifica(
          esitoOrario.ok
            ? `${nomeClasse} è pronta: ${nomeMateria} è sul calendario.`
            : `${nomeClasse} e ${nomeMateria} sono pronte, ma l’orario non si è salvato: riprova dal corso.`,
          esitoOrario.ok ? 'successo' : 'avviso',
        )
        // Tutt'e due i filtri: la classe appena fatta è quella su cui si sta
        // lavorando, e il calendario si apre subito dopo per guardare la sua.
        aggiorna({
          vista: 'calendario',
          classeId: classeCreata.id,
          filtroClasseId: classeCreata.id,
          filtroClasseAgendaId: classeCreata.id,
        })
      } catch (errore) {
        contesto.occupato(false)
        contesto.mostraErrori([errore instanceof Error ? errore.message : String(errore)])
      }
    },
  })
}

