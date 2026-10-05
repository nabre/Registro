// Le consegne dentro una lezione.
// Una consegna si ripresenta a ogni ora finché non è chiusa. Aprendo un'ora si
// vede quel che scade oggi, quel che è rimasto indietro, quel che si è dato in
// quest'ora e quel che resta aperto. Le spunte si mettono qui, una per nome.

import { useEffect, useReducer, useRef, useState, type ReactElement, type ReactNode } from 'react'

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
} from '#core/dominio/assignments.js'
import { gestoDelClic } from '#core/dominio/check.js'
import { nomeCompleto, ordinaAllievi } from '#core/dominio/calculations.js'
import { Molti, Uno, quanti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import { formattaData, giornoDi, oggi } from '#core/dominio/dates.js'
import { CHI_INSEGNA, type Consegna, type Lezione } from '#core/dominio/models.js'
import { classi } from '#ui/classNames.js'
import { Barra, Pastiglia, Pulsante, Scheda, TitoloGruppo } from '#ui/components/base.js'
import { eseguiOAvvisa } from '#ui/components/filters.js'
import { Icona } from '#ui/components/icons.js'
import { menuContestuale, type ElementoMenu } from '#ui/components/menu.js'
import { apriModale, conferma } from '#ui/components/modal.js'
import { CorsoPendenza, Pendenza } from '#ui/components/pending.js'
import { moduloConsegna } from '#ui/forms.js'
import { azione } from '#ui/bridge.js'
import {
  classeDelCorsoId,
  classeDiLezione,
  classiDiCuiSonoDocente,
  iscriviti,
  nomeCorso,
  stato,
} from '#ui/state.js'
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

/** Quanto aspettare prima della rotella: le spunte istantanee non lampeggiano. */
const RITARDO_ROTELLA = 150

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
 * di `fattaIl`, quindi «oggi» anche dentro un'ora di un'altra data. Mentre la
 * scrittura è in corso il pulsante è spento, e dopo un attimo gira la rotella.
 */
function PastigliaSpunta ({ consegna, chi, perEsteso = false }: {
  consegna: Consegna
  chi: string
  perEsteso?: boolean
}): ReactElement {
  const [occupato, impostaOccupato] = useState(false)
  const [rotella, impostaRotella] = useState(false)
  const vivo = useRef(true)
  useEffect(() => {
    vivo.current = true
    return () => { vivo.current = false }
  }, [])

  const spuntata = spuntaDi(consegna, chi)
  const fatta = spuntata !== null
  // Un istante illeggibile vale «un altro giorno»: nel dubbio il clic non cancella.
  const alClic = gestoDelClic(spuntata ? (giornoDi(spuntata.fattaIl) ?? '') : null, oggi())
  // Su una consegna che raccoglie un foglio, spuntare vuol dire scegliere il
  // file: una spunta senza documento contraddirebbe la matrice del docente di classe.
  const conDocumento = raccoglieDocumento(consegna)
  const cambia = (fai: boolean): void => {
    impostaOccupato(true)
    const tempo = setTimeout(() => { if (vivo.current) impostaRotella(true) }, RITARDO_ROTELLA)
    const libera = () => {
      clearTimeout(tempo)
      if (!vivo.current) return
      impostaOccupato(false)
      impostaRotella(false)
    }
    void (async () => {
      if (conDocumento) {
        await azione(
          fai
            ? { tipo: 'consegna.raccogli', consegnaId: consegna.id, chi }
            : { tipo: 'consegna.file.togli', consegnaId: consegna.id, chi },
        )
      } else {
        await spunta(consegna, chi, fai)
      }
    })().then(libera, libera)
  }
  const t = testi()
  const gesto =
    alClic === 'spunta'
      ? t.clicPerSpuntare(conDocumento)
      : alClic === 'togli'
        ? t.clicPerTogliere(conDocumento)
        : t.spuntataIl(formattaData(giornoDi(spuntata?.fattaIl) ?? '', 'lungo'), conDocumento)
  const voci = (): ElementoMenu[] => [
    { titolo: nomeDi(chi, consegna) },
    fatta
      ? {
          testo: conDocumento ? t.togliDocumento : t.togliSpunta,
          simbolo: 'chiudi',
          pericolo: true,
          al: () => cambia(false),
        }
      : {
          testo: conDocumento ? t.raccogliDocumento : t.spunta,
          simbolo: 'spunta',
          al: () => cambia(true),
        },
  ]
  return (
    <button
      className={classi('spunta-nome', fatta && 'spunta-nome--fatta', rotella && 'in-corso')}
      type="button"
      disabled={occupato}
      aria-busy={rotella ? true : undefined}
      aria-pressed={fatta}
      aria-haspopup="menu"
      title={`${nomeDi(chi, consegna)}\n${gesto}.`}
      onClick={() => {
        if (alClic === null) return
        cambia(alClic === 'spunta')
      }}
      onContextMenu={(evento) => menuContestuale(evento.nativeEvent, voci(), evento.currentTarget)}
    >
      {fatta ? <Icona nome="spunta" classe="icona--minuta" /> : null}
      <span>{perEsteso ? nomeDi(chi, consegna) : nomeCorto(chi, consegna)}</span>
    </button>
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
 * Il corpo del ritiro. La finestra vive fuori dal disegno della pagina: si
 * iscrive allo stato, che arriva un istante dopo la risposta, e si rilegge da
 * lì a ogni cambio perché i conti seguano.
 */
function Ritiro ({ consegnaId }: { consegnaId: string }): ReactElement {
  const [, rifai] = useReducer((volte: number) => volte + 1, 0)
  useEffect(() => iscriviti(rifai), [])
  const t = testi()

  const consegna = stato.registro.consegne.find((c) => c.id === consegnaId)
  if (!consegna) {
    return <div className="modulo ritiro"><p className="testo-quieto">{t.nonCePiu}</p></div>
  }

  const classe = classeDi(consegna)
  const avanzamento = avanzamentoConsegna(consegna, classe)
  const ordinati = inOrdine(consegna, avanzamento.destinatari)
  const scadenza = scadenzaConsegna(stato.registro, consegna)

  const tutti = (fatta: boolean) => async () => {
    // In sequenza: ogni spunta è una scrittura sullo stesso file, e insieme
    // vincerebbe l'ultima. Il disegno lo fa `iscriviti` quando arriva lo stato nuovo.
    for (const chi of ordinati) {
      if (haFatto(consegna, chi) !== fatta) await spunta(consegna, chi, fatta)
    }
  }

  return (
    <div className="modulo ritiro">
      <div className="ritiro__testa">
        <Pastiglia testo={t.tipi[consegna.tipo]} tono="quiete" simbolo={SIMBOLI_TIPO[consegna.tipo]} />
        {consegna.docenteDiClasse
          ? <Pastiglia testo={t.ambitoClasse} tono="informativo" simbolo="classi" />
          : null}
        {consegna.a === 'docente'
          ? <Pastiglia testo={t.toccaAMe} tono="informativo" simbolo="utente" />
          : consegna.a === 'allievi'
            ? <Pastiglia testo={t.soloAdAlcuni} tono="informativo" simbolo="utente" />
            : <Pastiglia testo={t.tuttaLaClasse} tono="quiete" simbolo="classi" />}
        {avanzamento.completa ? <Pastiglia testo={t.fattaDaTutti} tono="positivo" simbolo="spunta" /> : null}
      </div>
      <p className="ritiro__quando">
        {t.dataIl(formattaData(dataConsegna(stato.registro, consegna), 'lungo'))}
        {scadenza
          ? <span>{t.daFarePer(formattaData(scadenza, 'lungo'))}</span>
          : <span className="testo-quieto">{t.senzaTermine}</span>}
      </p>
      {consegna.note ? <p className="ritiro__note">{consegna.note}</p> : null}

      {avanzamento.senzaNessuno
        ? (
            <p className="consegna__nota">
              {consegna.a === 'allievi' ? t.nessunaDelleScelte : t.classeSenzaPif}
            </p>
          )
        : (
            <div className="ritiro__conto">
              <Barra quota={avanzamento.quota} tono={avanzamento.completa ? 'positivo' : 'informativo'} />
              <strong>{t.suTotale(avanzamento.fatte, avanzamento.destinatari.length)}</strong>
              {avanzamento.mancano.length > 0
                ? <span className="testo-quieto">{t.mancanoN(avanzamento.mancano.length)}</span>
                : <span className="testo-quieto">{t.fattaDaTutti}</span>}
            </div>
          )}

      {avanzamento.destinatari.length > 1
        ? (
            <div className="ritiro__comandi">
              <Pulsante testo={t.segnaTutti} simbolo="spunta" variante="sottile" al={tutti(true)} />
              <Pulsante testo={t.togliTutti} simbolo="ricarica" variante="fantasma" al={tutti(false)} />
            </div>
          )
        : null}

      <div className="ritiro__nomi">
        {ordinati.map((chi) => (
          <PastigliaSpunta key={chi} consegna={consegna} chi={chi} perEsteso />
        ))}
      </div>
    </div>
  )
}

/**
 * Il ritiro: la consegna per intero e i nomi da spuntare, in una finestra sua.
 * Le spunte partono subito, una per una: chiudere a metà non perde niente.
 */
export function moduloSpunta (consegnaId: string, opzioni: { lezione?: Lezione } = {}): void {
  const t = testi()
  apriModale({
    titolo:
      stato.registro.consegne.find((c) => c.id === consegnaId)?.testo ?? Uno(lessico().consegna),
    sottotitolo: nomeCorso(
      stato.registro.consegne.find((c) => c.id === consegnaId)?.corsoId ?? null,
    ),
    larghezza: 'media',
    corpo: () => <Ritiro consegnaId={consegnaId} />,
    azioniSecondarie: (contesto) => {
      const consegna = stato.registro.consegne.find((c) => c.id === consegnaId)
      if (!consegna) return null
      const classe = classeDi(consegna)
      const puoCambiare = Boolean(
        classe && classiDiCuiSonoDocente().some((c) => c.id === classe.id),
      )
      return (
        <>
          {puoCambiare
            ? (
                <Pulsante
                  testo={consegna.docenteDiClasse ? t.spostaACorso : t.spostaAClasse}
                  simbolo="scambio"
                  variante="fantasma"
                  al={async () => {
                    await eseguiOAvvisa({
                      tipo: 'consegna.salva',
                      consegna: {
                        ...consegna,
                        docenteDiClasse: !consegna.docenteDiClasse,
                      },
                    })
                  }}
                />
              )
            : null}
          {/* «Spunta tutti»: scrive una spunta per nome, non un «fatta» generico. */}
          <Pulsante
            testo={t.spuntaTutti}
            simbolo="spunta"
            variante="sottile"
            titolo={t.spuntaTuttiAiuto}
            al={async () => {
              const risposta = await eseguiOAvvisa({
                tipo: 'consegna.spuntaTutti',
                consegnaId: consegna.id,
                fatta: true,
              })
              if (risposta.ok) contesto.chiudi()
            }}
          />
          <Pulsante
            testo={parole().modifica}
            simbolo="matita"
            variante="fantasma"
            al={() => {
              contesto.chiudi()
              moduloConsegna({ consegna, lezione: opzioni.lezione })
            }}
          />
        </>
      )
    },
  })
}

/**
 * Quel che della consegna si vede nella riga: il conto e i primi nomi che
 * mancano; premendolo si apre il ritiro. Per una persona sola c'è solo la pastiglia.
 */
function spunte (consegna: Consegna, lezione?: Lezione): ReactElement {
  const t = testi()
  const classe = classeDi(consegna)
  const avanzamento = avanzamentoConsegna(consegna, classe)

  if (avanzamento.senzaNessuno) {
    // Senza destinatari (a settembre, prima delle iscrizioni) resta aperta: contarla
    // come fatta la farebbe sparire.
    return (
      <p className="consegna__nota">
        {consegna.a === 'allievi' ? t.nessunaDelleScelte : t.classeSenzaPif}
      </p>
    )
  }

  const ordinati = inOrdine(consegna, avanzamento.destinatari)
  if (ordinati.length === 1) {
    return (
      <div className="consegna__spunte-poche">
        <PastigliaSpunta consegna={consegna} chi={ordinati[0]} />
      </div>
    )
  }

  const primi = avanzamento.mancano.slice(0, 3).map((chi) => nomeCorto(chi, consegna))
  const riassunto =
    avanzamento.mancano.length === 0
      ? t.fattaDaTutti
      : t.mancanoNomi(primi.join(', '), avanzamento.mancano.length - primi.length)

  return (
    <button
      className="consegna__riassunto"
      type="button"
      title={t.apriRitiro}
      onClick={() => moduloSpunta(consegna.id, { lezione })}
    >
      <Barra quota={avanzamento.quota} tono={avanzamento.completa ? 'positivo' : 'informativo'} />
      <span className="consegna__conto">{`${avanzamento.fatte}/${avanzamento.destinatari.length}`}</span>
      <span className="testo-quieto">{riassunto}</span>
    </button>
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
): ReactElement {
  const classe = classeDi(consegna)
  const eDocenteDiClasse = Boolean(
    classe && classiDiCuiSonoDocente().some((c) => c.id === classe.id),
  )
  const avanzamento = avanzamentoConsegna(consegna, classe)
  const scadenza = scadenzaConsegna(stato.registro, consegna)
  const data = dataConsegna(stato.registro, consegna)
  const t = testi()
  const L = lessico()
  const daConsegnare = daConsegnareA(consegna, classe).length
  const senzaFoglio = senzaDocumento(consegna, classe).length

  return (
    <Pendenza
      key={consegna.id}
      classe="consegna"
      // testo-fisso: classe CSS
      stato={[`consegna--${tono}`]}
      testata={(
        <>
          <span className="consegna__tipo" title={t.tipi[consegna.tipo]}>
            <Icona nome={SIMBOLI_TIPO[consegna.tipo]} />
          </span>
          <strong className="consegna__testo">{consegna.testo}</strong>
          {opzioni.mostraCorso ? <CorsoPendenza classe="consegna" nome={nomeCorso(consegna.corsoId)} /> : null}
          {consegna.docenteDiClasse
            ? <Pastiglia testo={t.ambitoClasse} tono="informativo" simbolo="classi" />
            : null}
          {consegna.documento !== undefined
            ? <Pastiglia testo={consegna.documento} tono="quiete" simbolo="documento" />
            : null}
          {/* Il verso cambia che cosa manca, e va detto con parole diverse. */}
          {siConsegna(consegna)
            ? (
                <span className="consegna__distribuzione">
                  <Pastiglia
                    testo={consegna.modoConsegna === 'email' ? t.consegnoPerEmail : t.consegnoAMano}
                    tono="informativo"
                    simbolo={consegna.modoConsegna === 'email' ? 'posta' : 'utente'}
                  />
                  {daConsegnare > 0
                    ? <Pastiglia testo={t.daConsegnareA(daConsegnare)} tono="attenzione" />
                    : null}
                  {senzaFoglio > 0
                    ? <Pastiglia testo={t.senzaDocumento(senzaFoglio)} tono="negativo" simbolo="avviso" />
                    : null}
                </span>
              )
            : null}
          {avanzamento.senzaNessuno ? <Pastiglia testo={t.senzaDestinatari} tono="attenzione" simbolo="avviso" /> : null}
          {consegna.a === 'docente'
            ? <Pastiglia testo={t.io} tono="informativo" simbolo="utente" />
            : consegna.a === 'allievi'
              ? <Pastiglia testo={quanti(consegna.allieviIds.length, L.pif)} tono="informativo" simbolo="utente" />
              : <Pastiglia testo={L.classe.singolare} tono="quiete" simbolo="classi" />}
          {eDocenteDiClasse
            ? (
                <Pulsante
                  simbolo="scambio"
                  variante="fantasma"
                  titolo={consegna.docenteDiClasse ? t.spostaACorso : t.spostaAClasse}
                  al={async () => {
                    await eseguiOAvvisa({
                      tipo: 'consegna.salva',
                      consegna: {
                        ...consegna,
                        docenteDiClasse: !consegna.docenteDiClasse,
                      },
                    })
                  }}
                />
              )
            : null}
          {/* Spunta chi manca, o toglie le spunte senza documento (una scrittura per
              nome); quelle con un foglio raccolto restano. */}
          <Pulsante
            simbolo={avanzamento.completa ? 'ricarica' : 'spunta'}
            variante="fantasma"
            titolo={avanzamento.completa
              ? t.togliSpunteAiuto
              : t.spuntaIMancanti(avanzamento.mancano.length)}
            al={async () => {
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
            }}
          />
          <Pulsante
            simbolo="matita"
            variante="fantasma"
            titolo={t.modificaConsegna}
            al={() => moduloConsegna({ consegna, lezione: opzioni.lezione })}
          />
        </>
      )}
      quando={(
        <>
          {t.dataIlGiorno(formattaData(data, 'giorno'))}
          {scadenza
            ? (
                <span className={classi('consegna__scadenza', tono === 'arretrata' && 'consegna__scadenza--tardi')}>
                  {t.per(formattaData(scadenza, 'giorno'))}
                </span>
              )
            : <span className="testo-quieto">{t.senzaTermine}</span>}
          {consegna.note ? <span className="testo-quieto">{` · ${consegna.note}`}</span> : null}
        </>
      )}
      coda={spunte(consegna, opzioni.lezione)}
    />
  )
}

export function gruppoConsegne (
  titolo: string,
  consegne: Consegna[],
  tono: TonoConsegna,
  opzioni: { lezione?: Lezione, mostraCorso?: boolean } = {},
): ReactNode {
  if (consegne.length === 0) return null
  return (
    <section className="consegne__gruppo">
      {/* Senza titolo il gruppo è già dentro qualcosa che lo nomina. */}
      {titolo ? <TitoloGruppo titolo={titolo} quante={consegne.length} /> : null}
      {consegne.map((consegna) => rigaConsegna(consegna, tono, opzioni))}
    </section>
  )
}

/**
 * Le consegne del registro della lezione, in una scheda loro, con il conto
 * delle aperte nel sottotitolo. In ordine di urgenza: arretrate, in scadenza,
 * date in quest'ora, ancora aperte.
 */
export function pannelloConsegne (lezione: Lezione): ReactElement {
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

  return (
    <Scheda
      titolo={Molti(lessico().pendenza)}
      sottotitolo={sottotitolo}
      classe="scheda--consegne"
      azioni={(
        <Pulsante
          testo={t.nuovaConsegna}
          simbolo="piu"
          variante="sottile"
          al={() => moduloConsegna({ lezione })}
        />
      )}
    >
      {quante === 0
        ? <p className="testo-quieto">{t.nienteInSospeso}</p>
        : (
            <div className="consegne">
              {gruppoConsegne(t.rimasteIndietro, gruppi.arretrate, 'arretrata', { lezione })}
              {gruppoConsegne(t.scadonoOggi, gruppi.scadono, 'scade', { lezione })}
              {gruppoConsegne(t.dateInQuestaLezione, soloDate, 'data', { lezione })}
              {gruppoConsegne(t.ancoraAperte, gruppi.aperte, 'aperta', { lezione })}
            </div>
          )}
    </Scheda>
  )
}
