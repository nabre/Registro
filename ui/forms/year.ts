// L'anno scolastico e le sue interruzioni: semestri, vacanze, giorni di
// sospensione. Le chiusure di un anno che c'è già hanno un posto solo, la
// scheda Chiusure con il suo modulo (`moduloPause`): il modulo dell'anno tiene
// date e semestri. Un anno che nasce le porta con sé, dal calendario ufficiale
// o scritte qui.

import { allineaSemestri, annoAllineato } from '#core/dominio/years.js'
import {
  differenzaGiorni, etichettaAnno, formattaData, nomeSemestre, oggi, primoAnnoScolastico,
  sommaGiorni,
} from '#core/dominio/dates.js'
import { creaSospensione } from '#core/dominio/factories.js'
import type {
  AnnoScolastico, CalendarioDellAnno, Iso, Sospensione,
} from '#core/dominio/models.js'
import { èCollegata } from '#core/dominio/schoolCalendar.js'
import { campo, pulsante, riga, sezioneModulo } from '#ui/components/base.js'
import { apriModale, type ContestoModale } from '#ui/components/modal.js'
import { suggerimento } from '#ui/components/hint.js'
import { h, rimpiazza } from '#ui/dom.js'

import { stato, vai } from '#ui/state.js'
import { leggiData, salva, scriviData, testo } from './common.js'
import { moduloImportaRegistro } from './registerImport.js'
import {
  anniUfficialiDaProporre,
  bozzaUfficiale,
  pastigliaCalendario,
  pastigliaChiusuraUfficiale,
  sceltaAnnoUfficiale,
  sezioneCalendarioUfficiale,
} from './schoolCalendar.js'

import { parole } from '#core/dominio/words.testi.js'
import { titoloComando } from '#contract/manifest.js'
import { testi } from './year.testi.js'

/**
 * Le pause che quasi ogni anno ha, col mese in cui cadono di solito:
 * scorciatoie che creano la riga già intitolata e datata, da spostare.
 * `ufficiale`: la porta già il calendario, e in un anno che lo segue sarebbe
 * un doppione.
 */
const PAUSE_TIPICHE: Array<{
  chiave: keyof ReturnType<typeof testi>['pauseTipiche']
  mese: number
  giorni: number
  ufficiale: boolean
}> = [
  { chiave: 'autunno', mese: 10, giorni: 14, ufficiale: true },
  { chiave: 'natale', mese: 12, giorni: 14, ufficiale: true },
  { chiave: 'carnevale', mese: 2, giorni: 7, ufficiale: true },
  { chiave: 'pasqua', mese: 4, giorni: 7, ufficiale: true },
  { chiave: 'istituto', mese: 0, giorni: 1, ufficiale: false },
]

/**
 * Il campo data si blocca, o si sblocca: in un anno che segue il calendario
 * inizio e fine sono del calendario. Si spegne la casella scritta; quella
 * nascosta tiene il valore, che il modulo legge lo stesso.
 */
function bloccaData (campoData: HTMLElement, bloccata: boolean): void {
  const scritta = campoData.querySelector<HTMLInputElement>('input[type="text"]')
  if (scritta) scritta.disabled = bloccata
}

/**
 * Le pause dell'anno: una riga per vacanza (nome, dal, al). Si ridisegna solo
 * quando cambia il numero delle righe; cambiando una data si aggiorna il conto
 * dei giorni in posto, così il fuoco resta nel campo.
 */
function editorPause (
  iniziali: Sospensione[],
  dentro: { inizio: Iso, fine: Iso },
  allaModifica: (pause: Sospensione[]) => void,
  /** Il calendario che l'anno segue: le sue chiusure si leggono e basta. */
  segue: CalendarioDellAnno | null = null,
): HTMLElement {
  const t = testi()
  let pause = iniziali.map((s) => ({ ...s }))
  const contenitore = h('div', { class: 'pause-editor' })

  /** Dove cade di solito quella pausa, dentro quest'anno. */
  const quandoCade = (mese: number): Iso => {
    if (mese === 0) return dentro.inizio
    const annoCivile = Number(dentro.inizio.slice(0, 4)) + (mese >= 9 ? 0 : 1)
    const proposta = `${annoCivile}-${String(mese).padStart(2, '0')}-15`
    return proposta >= dentro.inizio && proposta <= dentro.fine ? proposta : dentro.inizio
  }

  const aggiungi = (nome: string, mese: number, giorni: number) => {
    const dal = quandoCade(mese)
    pause.push(creaSospensione(nome, dal, sommaGiorni(dal, Math.max(0, giorni - 1))))
    allaModifica(pause)
    disegna()
  }

  /**
   * Una chiusura del calendario che l'anno segue: nome e date da leggere, la
   * pastiglia al posto del cestino.
   */
  const rigaUfficiale = (pausa: Sospensione): HTMLElement => {
    const giorni = differenzaGiorni(pausa.dal, pausa.al) + 1
    return h(
      'li',
      { class: 'pausa-riga pausa-riga--ufficiale' },
      h('span', { class: 'pausa-riga__nome' }, pausa.etichetta),
      h('span', { class: 'pausa-riga__data' }, formattaData(pausa.dal)),
      h('span', { class: 'pausa-riga__data' }, formattaData(pausa.al)),
      h('span', { class: 'testo-quieto' }, t.giorni(giorni)),
      pastigliaChiusuraUfficiale(),
    )
  }

  /** Una riga: le tre caselle, il conto dei giorni, il cestino. */
  const riga = (pausa: Sospensione): HTMLElement => {
    if (segue && èCollegata({ calendarioUfficiale: segue }, pausa)) return rigaUfficiale(pausa)
    const statoPausa = h('span', { class: 'testo-quieto' })

    // Quanti giorni dura e se sta nell'anno: si riscrive in posto, senza rifare
    // la riga e perdere il fuoco.
    const aggiornaStato = () => {
      const giorni = differenzaGiorni(pausa.dal, pausa.al) + 1
      const fuori = pausa.dal < dentro.inizio || pausa.al > dentro.fine
      statoPausa.className = fuori ? 'testo-negativo' : 'testo-quieto'
      statoPausa.textContent = fuori ? t.fuoriDallAnno : t.giorni(giorni)
      elemento.classList.toggle('pausa-riga--fuori', fuori)
    }

    const dal = campo({
      // testo-fisso: il nome del campo, non si legge
      nome: `pausa-dal-${pausa.id}`,
      tipo: 'date',
      valore: pausa.dal,
      classe: 'pausa-riga__data',
      al: (valore) => {
        pausa.dal = valore
        // Una pausa che finisce prima di cominciare dura un giorno: una data sola.
        if (pausa.al < pausa.dal) {
          pausa.al = pausa.dal
          scriviData(al, pausa.al)
        }
        allaModifica(pause)
        aggiornaStato()
      },
    })

    const al = campo({
      // testo-fisso: il nome del campo, non si legge
      nome: `pausa-al-${pausa.id}`,
      tipo: 'date',
      valore: pausa.al,
      classe: 'pausa-riga__data',
      al: (valore) => {
        pausa.al = valore < pausa.dal ? pausa.dal : valore
        if (pausa.al !== valore) scriviData(al, pausa.al)
        allaModifica(pause)
        aggiornaStato()
      },
    })

    const elemento = h(
      'li',
      { class: 'pausa-riga' },
      h('input', {
        class: 'campo__controllo pausa-riga__nome',
        type: 'text',
        value: pausa.etichetta,
        placeholder: t.pauseTipiche.autunno,
        attr: { 'aria-label': t.comeSiChiama },
        onchange: (evento: Event) => {
          pausa.etichetta = (evento.target as HTMLInputElement).value
          allaModifica(pause)
        },
      }),
      dal,
      al,
      statoPausa,
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: t.togliPausa,
        al: () => {
          pause = pause.filter((x) => x.id !== pausa.id)
          allaModifica(pause)
          disegna()
        },
      }),
    )

    aggiornaStato()
    return elemento
  }

  const disegna = () => {
    rimpiazza(
      contenitore,
      pause.length === 0
        ? h(
            'p',
            { class: 'testo-quieto' },
            t.nessunaPausa,
            suggerimento(t.suggerimentoPause, { etichetta: t.pause }),
          )
        : h(
            'ul',
            { class: 'pause-editor__elenco' },
            h(
              'li',
              { class: 'pause-editor__intestazione' },
              h('span', null, parole().cheCosa),
              h('span', null, parole().dal),
              h('span', null, parole().al),
              h('span', null, t.quanto),
              h('span', null, ''),
            ),
            ...[...pause].sort((a, b) => a.dal.localeCompare(b.dal)).map(riga),
          ),
      h(
        'div',
        { class: 'pause-editor__piede' },
        pulsante({
          testo: t.aggiungiPausa,
          simbolo: 'piu',
          variante: 'sottile',
          al: () => aggiungi('', 0, 1),
        }),
        ...PAUSE_TIPICHE.filter((tipica) => !segue || !tipica.ufficiale).map((tipica) => {
          const nome = t.pauseTipiche[tipica.chiave]
          return pulsante({
            testo: nome,
            variante: 'fantasma',
            simbolo: 'piu',
            titolo: t.aggiungeTipica(nome),
            al: () => aggiungi(nome, tipica.mese, tipica.giorni),
          })
        }),
      ),
    )
  }

  disegna()
  return contenitore
}

/**
 * Le sole pause, senza il resto dell'anno: se ne aggiunge una in corso d'anno
 * senza avere sotto mano (e toccare per sbaglio) le date dei semestri.
 */
export function moduloPause (anno: AnnoScolastico): void {
  const t = testi()
  let pause = anno.sospensioni.map((x) => ({ ...x }))
  const contenitorePause = h('div')
  const disegnaPause = () => {
    rimpiazza(
      contenitorePause,
      editorPause(pause, { inizio: anno.inizio, fine: anno.fine }, (nuove) => {
        pause = nuove
        ufficiale.ridisegna()
      }, anno.calendarioUfficiale ?? null),
    )
  }
  let modale: ContestoModale | null = null
  // Solo le chiusure: inizio e fine dell'anno si cambiano dal modulo dell'anno.
  const ufficiale = sezioneCalendarioUfficiale({
    leggi: () => ({ inizio: anno.inizio, fine: anno.fine, sospensioni: pause }),
    applica: (nuovo) => {
      pause = nuovo.sospensioni
      disegnaPause()
    },
    soloPause: true,
    anno: () => stato.registro.anni.find((a) => a.id === anno.id) ?? null,
    fatto: () => modale?.chiudi(),
  })
  disegnaPause()

  modale = apriModale({
    titolo: t.giorniSenzaLezione(anno.etichetta),
    sottotitolo: t.sottotitoloPause,
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        ufficiale.elemento,
        contenitorePause,
      ),
    alSalva: async (_valori, contesto) => {
      const base = stato.registro.anni.find((a) => a.id === anno.id) ?? anno
      const aggiornato = annoAllineato({
        ...base,
        sospensioni: [...pause].sort((a, b) => a.dal.localeCompare(b.dal)),
      })
      await salva(contesto, { tipo: 'anno.salva', anno: aggiornato }, t.pauseAggiornate)
    },
  })
}

/**
 * L'anno scolastico, nuovo o da modificare. Si scrivono tre date: inizio e
 * fine del primo semestre, fine del secondo (che parte il giorno dopo).
 *
 * Nuovo: in cima gli anni del calendario ufficiale, il primo già scelto, con
 * date, vacanze e festivi; in fondo la domanda se portarci classi e corsi di un
 * altro registro. Per un anno esistente il calendario ufficiale si guarda voce
 * per voce.
 */
export function moduloAnno (anno?: AnnoScolastico): void {
  const t = testi()
  const modifica = Boolean(anno)
  const oggiIso = oggi()
  // Un anno nuovo parte dal primo anno ufficiale da proporre (in corso, o il
  // prossimo), con le sue chiusure; senza calendario, dalle date di sempre.
  const ufficialeIniziale = anno ? null : anniUfficialiDaProporre()[0] ?? null
  const annoBase = ufficialeIniziale?.inizioAnno
    ? primoAnnoScolastico(ufficialeIniziale.inizioAnno)
    : Number(oggiIso.slice(0, 4)) - (Number(oggiIso.slice(5, 7)) >= 8 ? 0 : 1)
  const iniziale = ufficialeIniziale
    ? bozzaUfficiale(ufficialeIniziale, {
        inizio: `${annoBase}-09-01`,
        fine: `${annoBase + 1}-06-30`,
        sospensioni: [],
      })
    : null

  let pause = anno?.sospensioni.map((x) => ({ ...x })) ?? iniziale?.sospensioni ?? []
  // Il calendario che l'anno segue, o seguirà nascendo: inizio, fine e
  // chiusure ufficiali si leggono e basta. Un anno esistente lo cambia solo coi
  // gesti della sezione del calendario; uno che nasce, con la tendina in cima.
  let segue: CalendarioDellAnno | null = anno
    ? anno.calendarioUfficiale ?? null
    : iniziale?.calendarioUfficiale ?? null
  const semestri = anno ? allineaSemestri(anno.semestri) : []
  const primo = semestri[0] ?? null
  const secondo = semestri[1] ?? null

  // Campi e editor delle pause stanno fuori dal disegno: il calendario ufficiale
  // li legge per confrontarli, e importando li riscrive.
  const campoInizio = campo({
    nome: 'inizio',
    etichetta: t.inizioDi(nomeSemestre({ numero: 1 })),
    tipo: 'date',
    valore: primo?.inizio ?? iniziale?.inizio ?? `${annoBase}-09-01`,
    richiesto: true,
    larghezza: 'quarto',
    al: () => {
      seguiDate()
      ufficiale.ridisegna()
      scelta?.ridisegna()
    },
  })
  const campoFine = campo({
    nome: 'fine',
    etichetta: t.fineDi(nomeSemestre({ numero: 2 })),
    tipo: 'date',
    valore: secondo?.fine ?? iniziale?.fine ?? `${annoBase + 1}-06-30`,
    richiesto: true,
    larghezza: 'quarto',
    al: () => {
      ufficiale.ridisegna()
      scelta?.ridisegna()
    },
  })
  const date = () => ({ inizio: leggiData(campoInizio), fine: leggiData(campoFine) })

  // Il confine fra i semestri, con sotto da quando parte il secondo: si vede
  // mentre si sceglie, invece di doverlo contare.
  const secondoDal = h('small', { class: 'campo__aiuto anno__secondo-dal' })
  const campoConfine = campo({
    nome: 'confine',
    etichetta: t.fineDi(nomeSemestre({ numero: 1 })),
    tipo: 'date',
    valore: primo?.fine ?? `${annoBase + 1}-01-31`,
    richiesto: true,
    aiuto: t.aiutoConfine,
    larghezza: 'quarto',
    al: () => diciSecondo(),
  })
  campoConfine.append(secondoDal)
  const diciSecondo = (): void => {
    const confine = leggiData(campoConfine)
    secondoDal.textContent = confine ? t.secondoDal(formattaData(sommaGiorni(confine, 1), 'lungo')) : ''
  }
  diciSecondo()

  // Un anno che nasce prende l'etichetta dalle date, finché non la si scrive a mano.
  let etichettaDalleDate = anno ? null : `${annoBase}/${annoBase + 1}`
  const seguiDate = (): void => {
    if (etichettaDalleDate === null) return
    const campoEtichetta = campoInizio.closest('form')?.querySelector<HTMLInputElement>('input[name="etichetta"]')
    if (!campoEtichetta || campoEtichetta.value !== etichettaDalleDate) {
      etichettaDalleDate = null
      return
    }
    etichettaDalleDate = etichettaAnno(leggiData(campoInizio))
    campoEtichetta.value = etichettaDalleDate
  }
  const bozza = () => ({ ...date(), sospensioni: pause })
  const contenitorePause = h('div')
  const disegnaPause = () => {
    bloccaData(campoInizio, segue !== null)
    bloccaData(campoFine, segue !== null)
    rimpiazza(
      contenitorePause,
      editorPause(pause, date(), (nuove) => {
        pause = nuove
        ufficiale.ridisegna()
      }, segue),
    )
  }
  /** Riscrive nel modulo l'anno che arriva dal calendario ufficiale. */
  const applicaBozza = (nuovo: ReturnType<typeof bozza>): void => {
    const primoPrima = primoAnnoScolastico(leggiData(campoInizio))
    scriviData(campoInizio, nuovo.inizio)
    scriviData(campoFine, nuovo.fine)
    // Cambiando anno scolastico cambiano etichetta e confine del primo semestre,
    // o il modulo rifiuterebbe un semestre che finisce prima di cominciare.
    const primo = primoAnnoScolastico(nuovo.inizio)
    if (!anno && primo !== primoPrima) {
      const modulo = ufficiale.elemento.closest('form')
      const etichetta = modulo?.querySelector<HTMLInputElement>('input[name="etichetta"]')
      if (etichetta) etichetta.value = etichettaAnno(nuovo.inizio)
      if (etichettaDalleDate !== null) etichettaDalleDate = etichettaAnno(nuovo.inizio)
      scriviData(campoConfine, `${primo + 1}-01-31`)
      diciSecondo()
    }
    pause = nuovo.sospensioni
    disegnaPause()
  }
  let modale: ContestoModale | null = null
  const ufficiale = sezioneCalendarioUfficiale({
    leggi: bozza,
    applica: (nuovo) => {
      applicaBozza(nuovo)
      scelta?.ridisegna()
    },
    anno: anno ? () => stato.registro.anni.find((a) => a.id === anno.id) ?? null : undefined,
    fatto: () => modale?.chiudi(),
    seguira: anno ? undefined : () => segue,
  })
  // La tendina in cima, solo per un anno che nasce: sceglierne uno porta date,
  // vacanze e festivi, e l'anno nascerà collegato; «date scritte a mano» lo
  // lascia libero.
  const scelta = anno
    ? null
    : sceltaAnnoUfficiale({
        leggi: bozza,
        applica: (nuovo) => {
          segue = nuovo.calendarioUfficiale
          applicaBozza(nuovo)
          ufficiale.ridisegna()
          scelta?.ridisegna()
        },
        seguira: () => segue,
        aMano: () => {
          segue = null
          disegnaPause()
          ufficiale.ridisegna()
        },
      })
  disegnaPause()

  modale = apriModale({
    titolo: modifica ? t.anno(anno!.etichetta) : titoloComando('registroDocenti.nuovoAnno'),
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        scelta?.elemento ?? null,
        anno ? pastigliaCalendario(anno) : null,
        campo({
          nome: 'etichetta',
          etichetta: t.etichetta,
          valore: anno?.etichetta ?? `${annoBase}/${annoBase + 1}`,
          richiesto: true,
          larghezza: 'meta',
        }),
        sezioneModulo(
          {
            testo: t.semestri,
            aiuto: t.aiutoSemestri,
          },
          riga(campoInizio, campoConfine),
          riga(campoFine),
        ),
        sezioneModulo(
          {
            testo: t.calendarioUfficiale,
            aiuto: anno ? t.aiutoUfficialeAnno : t.aiutoUfficialeNuovo,
          },
          ufficiale.elemento,
        ),
        // Le chiusure di un anno che c'è già si cambiano nella loro scheda.
        anno
          ? h(
              'div',
              { class: 'opzioni__rimando' },
              h('p', { class: 'opzioni__rimando-testo' }, t.chiusureAltrove),
              pulsante({
                testo: t.apriChiusure,
                simbolo: 'calendario',
                variante: 'sottile',
                al: () => {
                  modale?.chiudi()
                  vai({ pagina: 'pagina.impostazioni', scheda: 'calendario#chiusure' })
                },
              }),
            )
          : sezioneModulo(
              {
                testo: t.pause,
                aiuto: t.aiutoPause,
              },
              contenitorePause,
            ),
        // Solo per un anno che nasce: materie e impostazioni vengono da quello aperto;
        // classi, corsi e piani li porta questa finestra, aperta appena l'anno è nato
        // (accesa se c'è un registro da cui portarli).
        anno
          ? null
          : sezioneModulo(
              {
                testo: t.importare,
                aiuto: t.aiutoImportare,
              },
              campo({
                nome: 'importa',
                etichetta: t.importaDa,
                tipo: 'checkbox',
                valore: stato.documenti.elenco.some((d) => !d.mancante),
                aiuto: t.aiutoImportaDa,
              }),
            ),
      ),
    alSalva: async (valori, contesto) => {
      const inizio = testo(valori.inizio)
      const confine = testo(valori.confine)
      const fine = testo(valori.fine)
      if (confine <= inizio) {
        contesto.mostraErrori([t.primoAlRovescio])
        return
      }
      if (fine <= confine) {
        contesto.mostraErrori([t.secondoAlRovescio])
        return
      }

      if (!anno) {
        // Le pause si mandano anche per un anno nuovo, o andrebbero perse.
        await salva(
          contesto,
          {
            tipo: 'anno.crea',
            inizio,
            fine,
            etichetta: testo(valori.etichetta),
            confine,
            sospensioni: [...pause].sort((a, b) => a.dal.localeCompare(b.dal)),
            ...(segue ? { calendarioUfficiale: segue } : {}),
          },
          t.annoCreato,
          // Dopo la risposta: lo stato del documento nuovo arriva prima (vedi
          // `eseguiRichiesta` in `panels/panel.ts`) e con lui `chiudiTutte`; aperta qui
          // la finestra nasce già sull'anno nuovo.
          valori.importa === true ? () => moduloImportaRegistro() : undefined,
        )
        return
      }

      // Si riscrivono le date, non gli id: lezioni e valutazioni devono ritrovare il
      // loro semestre.
      const base = stato.registro.anni.find((a) => a.id === anno.id) ?? anno
      const semestriFreschi = allineaSemestri(base.semestri)
      const primoAttuale = semestriFreschi[0] ?? primo
      const secondoAttuale = semestriFreschi[1] ?? secondo
      if (!primoAttuale || !secondoAttuale) return
      const aggiornato = annoAllineato({
        ...base,
        etichetta: testo(valori.etichetta),
        sospensioni: [...pause].sort((a, b) => a.dal.localeCompare(b.dal)),
        semestri: [
          { ...primoAttuale, inizio, fine: confine },
          { ...secondoAttuale, inizio: sommaGiorni(confine, 1), fine },
        ],
      })
      await salva(contesto, { tipo: 'anno.salva', anno: aggiornato }, t.annoAggiornato)
    },
    // Nessun «Elimina»: un anno è un documento, e un documento si butta dal
    // gestore di file.
    azioniSecondarie: () => null,
  })
}
