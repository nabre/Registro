// L'anno scolastico e le sue interruzioni: semestri, vacanze, giorni di
// sospensione.

import { allineaSemestri, annoAllineato } from '../../domain/years.js'
import {
  differenzaGiorni, etichettaAnno, oggi, primoAnnoScolastico, sommaGiorni,
} from '../../domain/dates.js'
import { creaSospensione } from '../../domain/factories.js'
import type { AnnoScolastico, Iso, Sospensione } from '../../domain/models.js'
import { campo, pulsante, riga, sezioneModulo } from '../components/base.js'
import { apriModale } from '../components/modal.js'
import { suggerimento } from '../components/hint.js'
import { h, rimpiazza } from '../dom.js'

import { stato as statoPannello } from '../state.js'
import { leggiData, salva, scriviData, testo } from './common.js'
import { moduloImportaRegistro } from './registerImport.js'
import {
  anniUfficialiDaProporre,
  bozzaUfficiale,
  sceltaAnnoUfficiale,
  sezioneCalendarioUfficiale,
} from './schoolCalendar.js'

import { parole } from '../../domain/words.testi.js'
import { testi } from './year.testi.js'

/**
 * Le pause che quasi ogni anno ha, col mese in cui cadono di solito:
 * scorciatoie che creano la riga già intitolata e datata, da spostare.
 */
const PAUSE_TIPICHE: Array<{
  chiave: keyof ReturnType<typeof testi>['pauseTipiche']
  mese: number
  giorni: number
}> = [
  { chiave: 'autunno', mese: 10, giorni: 14 },
  { chiave: 'natale', mese: 12, giorni: 14 },
  { chiave: 'carnevale', mese: 2, giorni: 7 },
  { chiave: 'pasqua', mese: 4, giorni: 7 },
  { chiave: 'istituto', mese: 0, giorni: 1 },
]

/**
 * Le pause dell'anno: una riga per vacanza (nome, dal, al). Si ridisegna solo
 * quando cambia il numero delle righe; cambiando una data si aggiorna il conto
 * dei giorni in posto, così il fuoco resta nel campo.
 */
function editorPause (
  iniziali: Sospensione[],
  dentro: { inizio: Iso, fine: Iso },
  allaModifica: (pause: Sospensione[]) => void,
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

  /** Una riga: le tre caselle, il conto dei giorni, il cestino. */
  const riga = (pausa: Sospensione): HTMLElement => {
    const stato = h('span', { class: 'testo-quieto' })

    // Quanti giorni dura e se sta nell'anno: si riscrive in posto, senza rifare
    // la riga e perdere il fuoco.
    const aggiornaStato = () => {
      const giorni = differenzaGiorni(pausa.dal, pausa.al) + 1
      const fuori = pausa.dal < dentro.inizio || pausa.al > dentro.fine
      stato.className = fuori ? 'testo-negativo' : 'testo-quieto'
      stato.textContent = fuori ? t.fuoriDallAnno : t.giorni(giorni)
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
      stato,
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
        ...PAUSE_TIPICHE.map((tipica) => {
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
      }),
    )
  }
  // Solo le chiusure: inizio e fine dell'anno si cambiano dal modulo dell'anno.
  const ufficiale = sezioneCalendarioUfficiale({
    leggi: () => ({ inizio: anno.inizio, fine: anno.fine, sospensioni: pause }),
    applica: (nuovo) => {
      pause = nuovo.sospensioni
      disegnaPause()
    },
    soloPause: true,
  })
  disegnaPause()

  apriModale({
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
      const aggiornato = annoAllineato({
        ...anno,
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
  const semestri = anno ? allineaSemestri(anno.semestri) : []
  const primo = semestri[0] ?? null
  const secondo = semestri[1] ?? null

  // Campi e editor delle pause stanno fuori dal disegno: il calendario ufficiale
  // li legge per confrontarli, e importando li riscrive.
  const campoInizio = campo({
    nome: 'inizio',
    etichetta: t.cominciaIl,
    tipo: 'date',
    valore: primo?.inizio ?? iniziale?.inizio ?? `${annoBase}-09-01`,
    richiesto: true,
    larghezza: 'quarto',
    al: () => {
      ufficiale.ridisegna()
      scelta?.ridisegna()
    },
  })
  const campoFine = campo({
    nome: 'fine',
    etichetta: t.finisceIl,
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
  const bozza = () => ({ ...date(), sospensioni: pause })
  const contenitorePause = h('div')
  const disegnaPause = () => {
    rimpiazza(
      contenitorePause,
      editorPause(pause, date(), (nuove) => {
        pause = nuove
        ufficiale.ridisegna()
      }),
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
      const confine = modulo?.querySelector('input[name="confine"]')?.closest<HTMLElement>('.campo')
      if (confine) scriviData(confine, `${primo + 1}-01-31`)
    }
    pause = nuovo.sospensioni
    disegnaPause()
  }
  const ufficiale = sezioneCalendarioUfficiale({
    leggi: bozza,
    applica: (nuovo) => {
      applicaBozza(nuovo)
      scelta?.ridisegna()
    },
  })
  // La tendina in cima, solo per un anno che nasce: sceglierne uno porta date,
  // vacanze e festivi.
  const scelta = anno
    ? null
    : sceltaAnnoUfficiale({
        leggi: bozza,
        applica: (nuovo) => {
          applicaBozza(nuovo)
          ufficiale.ridisegna()
          scelta?.ridisegna()
        },
      })
  disegnaPause()

  apriModale({
    titolo: modifica ? t.anno(anno!.etichetta) : t.nuovoAnno,
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        scelta?.elemento ?? null,
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
          riga(
            campo({
              nome: 'primoEtichetta',
              etichetta: t.nomePrimo,
              valore: primo?.etichetta ?? t.primoSemestre,
              larghezza: 'meta',
            }),
            campoInizio,
            campo({
              nome: 'confine',
              etichetta: t.finisceIl,
              tipo: 'date',
              valore: primo?.fine ?? `${annoBase + 1}-01-31`,
              richiesto: true,
              aiuto: t.aiutoConfine,
              larghezza: 'quarto',
            }),
          ),
          riga(
            campo({
              nome: 'secondoEtichetta',
              etichetta: t.nomeSecondo,
              valore: secondo?.etichetta ?? t.secondoSemestre,
              larghezza: 'meta',
            }),
            campoFine,
          ),
        ),
        sezioneModulo(
          {
            testo: t.calendarioUfficiale,
            aiuto: anno ? t.aiutoUfficialeAnno : t.aiutoUfficialeNuovo,
          },
          ufficiale.elemento,
        ),
        sezioneModulo(
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
                valore: statoPannello.documenti.elenco.some((d) => !d.mancante),
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
            etichetteSemestri: [testo(valori.primoEtichetta), testo(valori.secondoEtichetta)],
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
      const aggiornato = annoAllineato({
        ...anno,
        etichetta: testo(valori.etichetta),
        sospensioni: [...pause].sort((a, b) => a.dal.localeCompare(b.dal)),
        semestri: [
          {
            ...primo,
            etichetta: testo(valori.primoEtichetta) || primo.etichetta,
            inizio,
            fine: confine,
          },
          {
            ...secondo,
            etichetta: testo(valori.secondoEtichetta) || secondo.etichetta,
            inizio: sommaGiorni(confine, 1),
            fine,
          },
        ],
      })
      await salva(contesto, { tipo: 'anno.salva', anno: aggiornato }, t.annoAggiornato)
    },
    // Nessun «Elimina»: un anno è un documento, e un documento si butta dal
    // gestore di file.
    azioniSecondarie: () => null,
  })
}
