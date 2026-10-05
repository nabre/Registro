// L'anno scolastico e le sue interruzioni: semestri, vacanze, giorni di
// sospensione. Le chiusure di un anno che c'è già hanno un posto solo, la
// scheda Chiusure con il suo modulo (`moduloPause`): il modulo dell'anno tiene
// date e semestri. Un anno che nasce le porta con sé, dal calendario ufficiale
// o scritte qui.

import { useReducer, useRef, useState, type ReactElement } from 'react'

import { allineaSemestri, annoAllineato } from '#core/dominio/years.js'
import {
  differenzaGiorni, etichettaAnno, formattaData, nomeSemestre, oggi, primoAnnoScolastico,
  sommaGiorni,
} from '#core/dominio/dates.js'
import { creaSospensione } from '#core/dominio/factories.js'
import type {
  AnnoScolastico, CalendarioDellAnno, Iso, Sospensione,
} from '#core/dominio/models.js'
import { èCollegata, type BozzaAnno } from '#core/dominio/schoolCalendar.js'
import { Campo, Pulsante, Riga, SezioneModulo } from '#ui/components/base.js'
import { apriModale, type ContestoModale } from '#ui/components/modal.js'
import { Suggerimento } from '#ui/components/hint.js'
import { classi } from '#ui/classNames.js'
import { Input } from '#ui/fields.js'

import { stato, vai } from '#ui/state.js'
import { salva, scriviData, testo } from './common.js'
import { moduloImportaRegistro } from './registerImport.js'
import {
  anniUfficialiDaProporre,
  bozzaUfficiale,
  pastigliaCalendario,
  pastigliaChiusuraUfficiale,
  SceltaAnnoUfficiale,
  SezioneCalendarioUfficiale,
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

const perData = (a: Sospensione, b: Sospensione) => a.dal.localeCompare(b.dal)

/**
 * Una chiusura del calendario che l'anno segue: nome e date da leggere, la
 * pastiglia al posto del cestino.
 */
function RigaUfficiale ({ pausa }: { pausa: Sospensione }): ReactElement {
  const giorni = differenzaGiorni(pausa.dal, pausa.al) + 1
  return (
    <li className="pausa-riga pausa-riga--ufficiale">
      <span className="pausa-riga__nome">{pausa.etichetta}</span>
      <span className="pausa-riga__data">{formattaData(pausa.dal)}</span>
      <span className="pausa-riga__data">{formattaData(pausa.al)}</span>
      <span className="testo-quieto">{testi().giorni(giorni)}</span>
      {pastigliaChiusuraUfficiale()}
    </li>
  )
}

/** Il campo data accanto a quello con questo nome, nella stessa riga. */
function campoVicino (evento: Event, nome: string): HTMLElement | null {
  const riga = (evento.target as HTMLElement | null)?.closest('li')
  return riga?.querySelector(`[name="${nome}"]`)?.closest<HTMLElement>('.campo') ?? null
}

/**
 * Le pause dell'anno: una riga per vacanza (nome, dal, al). L'ordine si rifà
 * solo quando cambia il numero delle righe: cambiando una data la riga resta
 * dov'è (e il fuoco con lei), e si aggiorna il conto dei giorni. Chi la
 * contiene la rifà da capo, con una `key` nuova, quando riscrive le pause.
 */
function EditorPause ({ iniziali, dentro, allaModifica, segue = null }: {
  iniziali: Sospensione[]
  dentro: { inizio: Iso, fine: Iso }
  allaModifica: (pause: Sospensione[]) => void
  /** Il calendario che l'anno segue: le sue chiusure si leggono e basta. */
  segue?: CalendarioDellAnno | null
}): ReactElement {
  const t = testi()
  const pause = useRef<Sospensione[]>(iniziali.map((s) => ({ ...s })))
  const [ordinate, impostaOrdinate] = useState(() => [...pause.current].sort(perData))
  const [, rifai] = useReducer((n: number) => n + 1, 0)

  const cambiaElenco = (nuove: Sospensione[]) => {
    pause.current = nuove
    allaModifica(nuove)
    impostaOrdinate([...nuove].sort(perData))
  }

  /** Dove cade di solito quella pausa, dentro quest'anno. */
  const quandoCade = (mese: number): Iso => {
    if (mese === 0) return dentro.inizio
    const annoCivile = Number(dentro.inizio.slice(0, 4)) + (mese >= 9 ? 0 : 1)
    const proposta = `${annoCivile}-${String(mese).padStart(2, '0')}-15`
    return proposta >= dentro.inizio && proposta <= dentro.fine ? proposta : dentro.inizio
  }

  const aggiungi = (nome: string, mese: number, giorni: number) => {
    const dal = quandoCade(mese)
    cambiaElenco([...pause.current, creaSospensione(nome, dal, sommaGiorni(dal, Math.max(0, giorni - 1)))])
  }

  /** Una data cambiata: la pausa è la stessa, si rifà solo il disegno. */
  const cambiata = () => {
    allaModifica(pause.current)
    rifai()
  }

  /** Una riga: le tre caselle, il conto dei giorni, il cestino. */
  const riga = (pausa: Sospensione): ReactElement => {
    if (segue && èCollegata({ calendarioUfficiale: segue }, pausa)) {
      return <RigaUfficiale key={pausa.id} pausa={pausa} />
    }
    // Quanti giorni dura e se sta nell'anno.
    const giorni = differenzaGiorni(pausa.dal, pausa.al) + 1
    const fuori = pausa.dal < dentro.inizio || pausa.al > dentro.fine
    const nomeAl = `pausa-al-${pausa.id}` // testo-fisso: il nome del campo, non si legge
    return (
      <li key={pausa.id} className={classi('pausa-riga', fuori && 'pausa-riga--fuori')}>
        <Input
          className="campo__controllo pausa-riga__nome"
          type="text"
          valore={pausa.etichetta}
          placeholder={t.pauseTipiche.autunno}
          aria-label={t.comeSiChiama}
          onCambio={(evento) => {
            pausa.etichetta = (evento.target as HTMLInputElement).value
            allaModifica(pause.current)
          }}
        />
        <Campo
          // testo-fisso: il nome del campo, non si legge
          nome={`pausa-dal-${pausa.id}`}
          tipo="date"
          valore={pausa.dal}
          classe="pausa-riga__data"
          al={(valore, evento) => {
            pausa.dal = valore
            // Una pausa che finisce prima di cominciare dura un giorno: una data sola.
            if (pausa.al < pausa.dal) {
              pausa.al = pausa.dal
              // Subito, anche se il fuoco è passato lì.
              const campoAl = campoVicino(evento, nomeAl)
              if (campoAl) scriviData(campoAl, pausa.al)
            }
            cambiata()
          }}
        />
        <Campo
          nome={nomeAl}
          tipo="date"
          valore={pausa.al}
          classe="pausa-riga__data"
          al={(valore, evento) => {
            pausa.al = valore < pausa.dal ? pausa.dal : valore
            if (pausa.al !== valore) {
              const campoAl = campoVicino(evento, nomeAl)
              if (campoAl) scriviData(campoAl, pausa.al)
            }
            cambiata()
          }}
        />
        <span className={fuori ? 'testo-negativo' : 'testo-quieto'}>
          {fuori ? t.fuoriDallAnno : t.giorni(giorni)}
        </span>
        <Pulsante
          simbolo="cestino"
          variante="fantasma"
          titolo={t.togliPausa}
          al={() => cambiaElenco(pause.current.filter((x) => x.id !== pausa.id))}
        />
      </li>
    )
  }

  return (
    <div className="pause-editor">
      {ordinate.length === 0
        ? (
            <p className="testo-quieto">
              {t.nessunaPausa}
              <Suggerimento testo={t.suggerimentoPause} etichetta={t.pause} />
            </p>
          )
        : (
            <ul className="pause-editor__elenco">
              <li className="pause-editor__intestazione">
                <span>{parole().cheCosa}</span>
                <span>{parole().dal}</span>
                <span>{parole().al}</span>
                <span>{t.quanto}</span>
                <span />
              </li>
              {ordinate.map(riga)}
            </ul>
          )}
      <div className="pause-editor__piede">
        <Pulsante
          testo={t.aggiungiPausa}
          simbolo="piu"
          variante="sottile"
          al={() => aggiungi('', 0, 1)}
        />
        {PAUSE_TIPICHE.filter((tipica) => !segue || !tipica.ufficiale).map((tipica) => {
          const nome = t.pauseTipiche[tipica.chiave]
          return (
            <Pulsante
              key={tipica.chiave}
              testo={nome}
              variante="fantasma"
              simbolo="piu"
              titolo={t.aggiungeTipica(nome)}
              al={() => aggiungi(nome, tipica.mese, tipica.giorni)}
            />
          )
        })}
      </div>
    </div>
  )
}

/**
 * Le sole pause, senza il resto dell'anno: se ne aggiunge una in corso d'anno
 * senza avere sotto mano (e toccare per sbaglio) le date dei semestri.
 */
export function moduloPause (anno: AnnoScolastico): void {
  const t = testi()
  const dati = { pause: anno.sospensioni.map((x) => ({ ...x })) }

  apriModale({
    titolo: t.giorniSenzaLezione(anno.etichetta),
    sottotitolo: t.sottotitoloPause,
    larghezza: 'media',
    corpo: (contesto) => <CorpoPause anno={anno} dati={dati} chiudi={() => contesto.chiudi()} />,
    alSalva: async (_valori, contesto) => {
      const base = stato.registro.anni.find((a) => a.id === anno.id) ?? anno
      const aggiornato = annoAllineato({
        ...base,
        sospensioni: [...dati.pause].sort(perData),
      })
      await salva(contesto, { tipo: 'anno.salva', anno: aggiornato }, t.pauseAggiornate)
    },
  })
}

function CorpoPause ({ anno, dati, chiudi }: {
  anno: AnnoScolastico
  /** Le pause come le ha il modulo: le legge il Salva. */
  dati: { pause: Sospensione[] }
  chiudi: () => void
}): ReactElement {
  const [, rifai] = useReducer((n: number) => n + 1, 0)
  /** Cresce quando il calendario riscrive le pause: l'editor riparte da capo. */
  const [versione, avanza] = useReducer((n: number) => n + 1, 0)
  return (
    <div className="modulo">
      {/* Solo le chiusure: inizio e fine dell'anno si cambiano dal modulo dell'anno. */}
      <SezioneCalendarioUfficiale
        leggi={() => ({ inizio: anno.inizio, fine: anno.fine, sospensioni: dati.pause })}
        applica={(nuovo) => {
          dati.pause = nuovo.sospensioni
          avanza()
        }}
        soloPause
        anno={() => stato.registro.anni.find((a) => a.id === anno.id) ?? null}
        fatto={chiudi}
      />
      <div>
        <EditorPause
          key={versione}
          iniziali={dati.pause}
          dentro={{ inizio: anno.inizio, fine: anno.fine }}
          allaModifica={(nuove) => {
            dati.pause = nuove
            rifai()
          }}
          segue={anno.calendarioUfficiale ?? null}
        />
      </div>
    </div>
  )
}

/** Quel che il modulo dell'anno tiene fuori dai campi, letto al Salva. */
interface DatiAnno {
  pause: Sospensione[]
  /**
   * Il calendario che l'anno segue, o seguirà nascendo: inizio, fine e
   * chiusure ufficiali si leggono e basta. Un anno esistente lo cambia solo coi
   * gesti della sezione del calendario; uno che nasce, con la tendina in cima.
   */
  segue: CalendarioDellAnno | null
  /** Le date scritte nei campi, per il calendario ufficiale e l'editor delle pause. */
  inizio: Iso
  fine: Iso
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

  const semestri = anno ? allineaSemestri(anno.semestri) : []
  const primo = semestri[0] ?? null
  const secondo = semestri[1] ?? null

  const dati: DatiAnno = {
    pause: anno?.sospensioni.map((x) => ({ ...x })) ?? iniziale?.sospensioni ?? [],
    segue: anno ? anno.calendarioUfficiale ?? null : iniziale?.calendarioUfficiale ?? null,
    inizio: primo?.inizio ?? iniziale?.inizio ?? `${annoBase}-09-01`,
    fine: secondo?.fine ?? iniziale?.fine ?? `${annoBase + 1}-06-30`,
  }

  apriModale({
    titolo: modifica ? t.anno(anno!.etichetta) : titoloComando('registroDocenti.nuovoAnno'),
    larghezza: 'media',
    corpo: (contesto) => (
      <CorpoAnno
        anno={anno}
        annoBase={annoBase}
        confine={primo?.fine ?? `${annoBase + 1}-01-31`}
        dati={dati}
        contesto={contesto}
      />
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
            sospensioni: [...dati.pause].sort(perData),
            ...(dati.segue ? { calendarioUfficiale: dati.segue } : {}),
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
        sospensioni: [...dati.pause].sort(perData),
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

function CorpoAnno ({ anno, annoBase, confine, dati, contesto }: {
  anno: AnnoScolastico | undefined
  annoBase: number
  /** La fine del primo semestre all'apertura. */
  confine: Iso
  dati: DatiAnno
  contesto: ContestoModale
}): ReactElement {
  const t = testi()
  const [, rifai] = useReducer((n: number) => n + 1, 0)
  /** Cresce quando il calendario riscrive le pause: l'editor riparte da capo. */
  const [versionePause, avanzaPause] = useReducer((n: number) => n + 1, 0)
  // Le date dei campi all'apertura: dopo, i campi tengono quel che si scrive e
  // il calendario ufficiale li riscrive a mano (`scriviData`).
  const [apertura] = useState(() => ({ inizio: dati.inizio, fine: dati.fine, confine }))
  const [confineOra, impostaConfine] = useState(confine)
  // Un anno che nasce prende l'etichetta dalle date, finché non la si scrive a mano.
  const etichettaDalleDate = useRef<string | null>(anno ? null : `${annoBase}/${annoBase + 1}`)

  const campoDelModulo = (nome: string) =>
    contesto.corpo.querySelector(`[name="${nome}"]`)?.closest<HTMLElement>('.campo') ?? null
  const campoEtichetta = () => contesto.corpo.querySelector<HTMLInputElement>('input[name="etichetta"]')

  const seguiDate = (): void => {
    if (etichettaDalleDate.current === null) return
    const campo = campoEtichetta()
    if (!campo || campo.value !== etichettaDalleDate.current) {
      etichettaDalleDate.current = null
      return
    }
    etichettaDalleDate.current = etichettaAnno(dati.inizio)
    campo.value = etichettaDalleDate.current
  }

  const bozza = (): BozzaAnno => ({ inizio: dati.inizio, fine: dati.fine, sospensioni: dati.pause })

  /** Riscrive nel modulo l'anno che arriva dal calendario ufficiale. */
  const applicaBozza = (nuovo: BozzaAnno): void => {
    const primoPrima = primoAnnoScolastico(dati.inizio)
    const scrivi = (nome: string, iso: Iso) => {
      const campo = campoDelModulo(nome)
      if (campo) scriviData(campo, iso)
    }
    scrivi('inizio', nuovo.inizio)
    scrivi('fine', nuovo.fine)
    dati.inizio = nuovo.inizio
    dati.fine = nuovo.fine
    // Cambiando anno scolastico cambiano etichetta e confine del primo semestre,
    // o il modulo rifiuterebbe un semestre che finisce prima di cominciare.
    const primo = primoAnnoScolastico(nuovo.inizio)
    if (!anno && primo !== primoPrima) {
      const etichetta = campoEtichetta()
      if (etichetta) etichetta.value = etichettaAnno(nuovo.inizio)
      if (etichettaDalleDate.current !== null) etichettaDalleDate.current = etichettaAnno(nuovo.inizio)
      const campoConfine = campoDelModulo('confine')
      if (campoConfine) scriviData(campoConfine, `${primo + 1}-01-31`)
      impostaConfine(`${primo + 1}-01-31`)
    }
    dati.pause = nuovo.sospensioni
    avanzaPause()
  }

  const bloccate = dati.segue !== null

  return (
    <div className="modulo">
      {anno
        ? null
        : (
            // La tendina in cima, solo per un anno che nasce: sceglierne uno porta date,
            // vacanze e festivi, e l'anno nascerà collegato; «date scritte a mano» lo
            // lascia libero.
            <SceltaAnnoUfficiale
              leggi={bozza}
              applica={(nuovo) => {
                dati.segue = nuovo.calendarioUfficiale
                applicaBozza(nuovo)
              }}
              seguira={() => dati.segue}
              aMano={() => {
                dati.segue = null
                avanzaPause()
              }}
            />
          )}
      {anno ? pastigliaCalendario(anno) : null}
      <Campo
        nome="etichetta"
        etichetta={t.etichetta}
        valore={anno?.etichetta ?? `${annoBase}/${annoBase + 1}`}
        richiesto
        larghezza="meta"
      />
      <SezioneModulo titolo={{ testo: t.semestri, aiuto: t.aiutoSemestri }}>
        <Riga>
          {/* In un anno che segue il calendario inizio e fine sono del calendario: si
              spegne la casella scritta, quella nascosta tiene il valore. */}
          <Campo
            nome="inizio"
            etichetta={t.inizioDi(nomeSemestre({ numero: 1 }))}
            tipo="date"
            valore={apertura.inizio}
            richiesto
            disabilitato={bloccate}
            larghezza="quarto"
            al={(valore) => {
              dati.inizio = valore
              seguiDate()
              rifai()
            }}
          />
          {/* Sotto, da quando parte il secondo semestre: si vede mentre si sceglie,
              invece di doverlo contare. */}
          <Campo
            nome="confine"
            etichetta={t.fineDi(nomeSemestre({ numero: 1 }))}
            tipo="date"
            valore={apertura.confine}
            richiesto
            aiuto={t.aiutoConfine}
            larghezza="quarto"
            al={(valore) => impostaConfine(valore)}
            sotto={(
              <small className="campo__aiuto anno__secondo-dal">
                {confineOra ? t.secondoDal(formattaData(sommaGiorni(confineOra, 1), 'lungo')) : ''}
              </small>
            )}
          />
        </Riga>
        <Riga>
          <Campo
            nome="fine"
            etichetta={t.fineDi(nomeSemestre({ numero: 2 }))}
            tipo="date"
            valore={apertura.fine}
            richiesto
            disabilitato={bloccate}
            larghezza="quarto"
            al={(valore) => {
              dati.fine = valore
              rifai()
            }}
          />
        </Riga>
      </SezioneModulo>
      <SezioneModulo
        titolo={{
          testo: t.calendarioUfficiale,
          aiuto: anno ? t.aiutoUfficialeAnno : t.aiutoUfficialeNuovo,
        }}
      >
        <SezioneCalendarioUfficiale
          leggi={bozza}
          applica={applicaBozza}
          anno={anno ? () => stato.registro.anni.find((a) => a.id === anno.id) ?? null : undefined}
          fatto={() => contesto.chiudi()}
          seguira={anno ? undefined : () => dati.segue}
        />
      </SezioneModulo>
      {/* Le chiusure di un anno che c'è già si cambiano nella loro scheda. */}
      {anno
        ? (
            <div className="opzioni__rimando">
              <p className="opzioni__rimando-testo">{t.chiusureAltrove}</p>
              <Pulsante
                testo={t.apriChiusure}
                simbolo="calendario"
                variante="sottile"
                al={() => {
                  contesto.chiudi()
                  vai({ pagina: 'pagina.impostazioni', scheda: 'calendario#chiusure' })
                }}
              />
            </div>
          )
        : (
            <SezioneModulo titolo={{ testo: t.pause, aiuto: t.aiutoPause }}>
              <div>
                <EditorPause
                  key={versionePause}
                  iniziali={dati.pause}
                  dentro={{ inizio: dati.inizio, fine: dati.fine }}
                  allaModifica={(nuove) => {
                    dati.pause = nuove
                    rifai()
                  }}
                  segue={dati.segue}
                />
              </div>
            </SezioneModulo>
          )}
      {/* Solo per un anno che nasce: materie e impostazioni vengono da quello aperto;
          classi, corsi e piani li porta questa finestra, aperta appena l'anno è nato
          (accesa se c'è un registro da cui portarli). */}
      {anno
        ? null
        : (
            <SezioneModulo titolo={{ testo: t.importare, aiuto: t.aiutoImportare }}>
              <Campo
                nome="importa"
                etichetta={t.importaDa}
                tipo="checkbox"
                valore={stato.documenti.elenco.some((d) => !d.mancante)}
                aiuto={t.aiutoImportaDa}
              />
            </SezioneModulo>
          )}
    </div>
  )
}
