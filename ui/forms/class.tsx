// La classe e chi la frequenta: le persone in formazione si aggiungono una per
// una o si incollano tutte insieme (quel che si fa a settembre).

import { useLayoutEffect, useReducer, useRef, useState, type ReactElement, type ReactNode } from 'react'

import { nomeCompleto } from '#core/dominio/calculations.js'
import { creaAllievo, creaTelefono, COLORI_CLASSE } from '#core/dominio/factories.js'
import { Maiuscola, Uno } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import { titoloComando } from '#contract/manifest.js'
import { nuovoIdClasse } from '#core/dominio/identifiers.js'
import { coordinataDi, indirizzoDi, rubricaDi, scriviCoordinate } from '#core/dominio/map.js'
import type {
  Allievo,
  Classe,
  ContattoTelefonico,
  Telefono,
} from '#core/dominio/models.js'
import { ETICHETTE, conPrefissoInternazionale } from '#core/dominio/phones.js'
import { INDIRIZZO_VUOTO, type Indirizzo } from '#core/dominio/addresses.js'
import { validaAllievo } from '#core/dominio/validation.js'
import { Campo, Pulsante, Riga, SezioneModulo, Tendina } from '#ui/components/base.js'
import { Suggerimento } from '#ui/components/hint.js'
import { Icona } from '#ui/components/icons.js'
import { apriModale } from '#ui/components/modal.js'
import { Input } from '#ui/fields.js'
import { azione } from '#ui/bridge.js'
import {
  classePerId,
  classiDellAnno,
  corsiDi,
  materieDiClasse,
  postoCorrente,
  stato,
  uriDato,
  vai,
} from '#ui/state.js'

import {
  CampoCollegato,
  PresaDiRiga,
  TastoElimina,
  baseViva,
  opzioniMaterie,
  richiedeAnno,
  salva,
  spostaVoce,
  testo,
  useRiordino,
} from './common.js'
import { moduloAnno } from './year.js'
import { moduloMateria } from './subject.js'
import { testi } from './class.testi.js'

export function moduloClasse (classe?: Classe, dopo?: (classeId: string) => void): void {
  const t = testi().classe
  // Senza anno una classe non ha a chi appendersi: si apre il modulo che lo crea.
  const anno = richiedeAnno(() => moduloAnno())
  if (!anno) return
  const modifica = Boolean(classe)
  const base =
    classe ??
    ({
      id: nuovoIdClasse(),
      annoId: anno.id,
      nome: '',
      sede: '',
      colore: COLORI_CLASSE[stato.registro.classi.length % COLORI_CLASSE.length],
      note: '',
      allievi: [],
      archiviata: false,
      docenteDiClasse: false,
      creataIl: new Date().toISOString(),
      aggiornataIl: new Date().toISOString(),
    } satisfies Classe)

  // Le materie che la classe già porta (una per corso) non si offrono di nuovo.
  const gia = new Set(corsiDi(base.id).map((c) => c.materiaId))

  // Sotto la tendina, in vista, quali materie la classe porta già (un dato);
  // dietro la «i» che cosa sia un corso (una spiegazione).
  const campoMateria = (): ReactElement => {
    const insegnate = materieDiClasse(base.id)
    return (
      <CampoCollegato
        nome="materiaId"
        etichetta={modifica ? t.aggiungiMateria : t.materiaInsegnata}
        valore=""
        vuoto={t.nessunaMateria}
        voci={() => opzioniMaterie().filter((o) => !gia.has(o.valore))}
        titoloNuovo={t.nuovaMateria}
        apriNuovo={(fatto) => moduloMateria(undefined, fatto)}
        aiuto={insegnate.length > 0 ? undefined : t.aiutoMateria}
        larghezza="meta"
        sotto={insegnate.length > 0
          ? <small className="campo__aiuto">{t.giaInsegnate(insegnate.join(', '))}</small>
          : null}
      />
    )
  }

  apriModale({
    titolo: modifica ? t.titolo(base.nome) : titoloComando('registroDocenti.nuovaClasse'),
    larghezza: 'media',
    corpo: () => (
      <div className="modulo">
        <Riga>
          <Campo
            nome="nome"
            etichetta={t.nome}
            valore={base.nome}
            segnaposto={t.segnapostoNome}
            richiesto
            larghezza="meta"
          />
          {campoMateria()}
        </Riga>
        <Riga>
          <Campo nome="sede" etichetta={t.sede} valore={base.sede ?? ''} larghezza="meta" />
          <Campo nome="colore" etichetta={t.colore} tipo="color" valore={base.colore} larghezza="quarto" />
          <Campo
            nome="archiviata"
            tipo="checkbox"
            etichetta={t.archiviata}
            valore={base.archiviata}
            aiuto={t.aiutoArchiviata}
            larghezza="quarto"
          />
        </Riga>
        {/* Il mestiere in più: chi non lo fa non vede nemmeno il pannello. */}
        <Campo
          nome="docenteDiClasse"
          tipo="checkbox"
          etichetta={t.docenteDiClasse}
          valore={base.docenteDiClasse}
          aiuto={t.aiutoDocenteDiClasse}
        />
        <Campo nome="note" etichetta={parole().note} tipo="textarea" righe={3} valore={base.note ?? ''} />
      </div>
    ),
    alSalva: async (valori, contesto) => {
      const viva = baseViva(contesto, modifica, base, classePerId(base.id))
      if (!viva) return
      const aggiornata: Classe = {
        ...viva,
        nome: testo(valori.nome),
        sede: testo(valori.sede),
        colore: testo(valori.colore) || base.colore,
        note: testo(valori.note),
        archiviata: Boolean(valori.archiviata),
        docenteDiClasse: Boolean(valori.docenteDiClasse),
      }
      const materiaId = testo(valori.materiaId)
      await salva(
        contesto,
        { tipo: 'classe.salva', classe: aggiornata },
        modifica ? t.aggiornata : t.creata,
        async (idCreato) => {
          const classeId = idCreato ?? aggiornata.id
          // La materia scelta apre un corso.
          if (materiaId) await azione({ tipo: 'corso.crea', classeId, materiaId })
          if (dopo) {
            dopo(classeId)
            return
          }
          vai({ pagina: 'pagina.classi', soggetto: { tipo: 'classe', id: classeId } })
        },
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? (
            <TastoElimina
              contesto={contesto}
              chiedi={{ genere: 'classe', id: base.id }}
              azione={{ tipo: 'classe.elimina', classeId: base.id }}
              fatto={t.eliminata}
              // La pagina resta; se mostrava la classe tolta, `completa` ne sceglie un'altra.
              poi={() => {
                const qui = postoCorrente()
                const suo = qui.soggetto?.tipo === 'classe' && qui.soggetto.id === base.id
                vai(suo ? { pagina: qui.pagina } : qui, { contesto: { classeId: null } })
              }}
            />
          )
        : null,
  })
}


/**
 * Che cosa dire, sotto un indirizzo, di dove il registro l'ha collocato: le
 * coordinate sono una conseguenza, non un campo, e cambiando la via la riga
 * dice che valgono per l'indirizzo di prima. In vista, perché è uno stato.
 * Senza indirizzo niente riga.
 */
function statoCoordinate (
  allievo: Allievo,
  genere: 'domicilio' | 'lavoro',
): string | null {
  const indirizzo = indirizzoDi(allievo, genere)
  if (!indirizzo) return null
  const punto = coordinataDi(rubricaDi(stato.registro), indirizzo)
  if (!punto) return testi().mappa.nonAncora
  // Le coordinate appartengono all'indirizzo, non alla persona.
  return testi().mappa.cadeA(scriviCoordinate(punto))
}

/**
 * L'editor dei numeri di un contatto: una riga per numero. Le righe restano
 * (ridisegnare a ogni tasto toglierebbe il campo sotto le dita). L'ordine, per
 * presa o frecce, è quello in cui si prova, e il primo finisce nei fogli stampati.
 */
function EditorTelefoni ({ contatto, iniziali, allaModifica }: {
  contatto: ContattoTelefonico
  iniziali: Telefono[]
  allaModifica: (telefoni: Telefono[]) => void
}): ReactElement {
  const testiTelefoni = testi().telefoni
  const etichette = lessico().etichetteTelefono
  // L'elenco di adesso sta qui, cambiato subito; lo stato serve solo al disegno.
  const numeri = useRef<Telefono[]>(iniziali.map((t) => ({ ...t })))
  const [, rifai] = useReducer((n: number) => n + 1, 0)
  const righe = useRef<HTMLDivElement | null>(null)
  const fuocoInFondo = useRef(false)

  const avvisa = () => allaModifica(numeri.current.map((t) => ({ ...t })))
  const cambia = (nuovi: Telefono[]) => {
    numeri.current = nuovi
    rifai()
    avvisa()
  }

  const riordino = useRiordino((da, a) => {
    if (a < 0 || a >= numeri.current.length || da === a) return
    cambia(spostaVoce(numeri.current, da, a))
  })

  // Il fuoco nella casella appena aperta: chi preme «aggiungi» ha il numero in mano.
  useLayoutEffect(() => {
    if (!fuocoInFondo.current) return
    fuocoInFondo.current = false
    righe.current?.lastElementChild?.querySelector<HTMLInputElement>('.telefono__numero')?.focus()
  })

  return (
    <div className="telefoni">
      <div
        className="telefoni__righe"
        ref={(nodo) => {
          righe.current = nodo
          riordino.elenco(nodo)
        }}
      >
        {numeri.current.map((telefono, indice) => (
          <div key={telefono.id} className="telefono" {...riordino.riga(indice)}>
            <PresaDiRiga {...riordino.presa(indice)} />
            <Tendina
              voci={ETICHETTE.map((valore) => ({ valore, testo: Maiuscola(etichette[valore]) }))}
              valore={telefono.etichetta}
              etichetta={testiTelefoni.cheNumero}
              classe="telefono__etichetta"
              al={(valore) => {
                telefono.etichetta = valore
                avvisa()
              }}
            />
            <Input
              className="campo__controllo telefono__numero"
              type="tel"
              valore={telefono.numero}
              // Il nome dell'etichetta nel segnaposto: si vede che cosa ci si aspetta.
              placeholder={testiTelefoni.numeroDi(contatto)}
              aria-label={testiTelefoni.numeroCome(etichette[telefono.etichetta])}
              autoComplete="off"
              onInput={(evento) => {
                telefono.numero = evento.currentTarget.value
                avvisa()
              }}
            />
            <Pulsante
              simbolo="cestino"
              variante="fantasma"
              titolo={testiTelefoni.togli}
              al={() => cambia(numeri.current.filter((t) => t.id !== telefono.id))}
            />
          </div>
        ))}
      </div>
      <Pulsante
        testo={testiTelefoni.aggiungi}
        simbolo="piu"
        variante="sottile"
        classe="telefoni__aggiungi"
        al={() => {
          fuocoInFondo.current = true
          cambia([...numeri.current, creaTelefono(contatto)])
        }}
      />
    </div>
  )
}

/**
 * Il ritratto nel modulo, con i comandi che lo cambiano (non nella scheda,
 * dove si premerebbero per sbaglio a colloquio). La foto non aspetta «Salva»:
 * l'host la copia subito, e qui si rilegge dov'è finita e la si passa a chi
 * salva, se no l'anagrafica riscriverebbe il percorso di prima. Su una persona
 * mai salvata i comandi sono spenti: l'host non saprebbe in che cartella metterla.
 */
function CampoFoto ({ classe, base, modifica, allaModifica }: {
  classe: Classe
  base: Allievo
  modifica: boolean
  allaModifica: (foto: string | undefined) => void
}): ReactElement {
  const t = testi().foto
  const [foto, impostaFoto] = useState(base.foto)

  const comando = (tipo: 'allievo.foto.imposta' | 'allievo.foto.togli') => async () => {
    const risposta = await azione({ tipo, classeId: classe.id, allievoId: base.id })
    if (!risposta.ok) return
    const adesso = classePerId(classe.id)?.allievi.find((a) => a.id === base.id)?.foto
    allaModifica(adesso)
    impostaFoto(adesso)
  }

  const indirizzo = uriDato(foto)
  return (
    <div className="campo campo--piena">
      {/* Che file ci va sta dietro la «i»; che la foto si applica subito, senza
          «Salva», resta in vista, se no si scopre dopo aver premuto «Annulla». */}
      <span className="campo__etichetta">
        {t.titolo}
        <Suggerimento testo={modifica ? t.aiuto : t.aiutoNuova} etichetta={t.titolo} />
      </span>
      <div className="modulo__ritratto">
        {indirizzo
          ? <img className="ritratto__foto" src={indirizzo} alt={nomeCompleto(base)} loading="lazy" />
          : <div className="ritratto__vuoto"><Icona nome="utente" classe="ritratto__simbolo" /></div>}
        <div className="ritratto__comandi">
          <Pulsante
            testo={foto ? t.cambia : t.aggiungi}
            simbolo="immagine"
            variante="sottile"
            disabilitato={!modifica}
            al={comando('allievo.foto.imposta')}
          />
          {foto
            ? (
                <Pulsante
                  testo={parole().togli}
                  simbolo="cestino"
                  variante="sottile"
                  al={comando('allievo.foto.togli')}
                />
              )
            : null}
        </div>
      </div>
      {modifica ? <small className="campo__aiuto">{t.subito}</small> : null}
    </div>
  )
}

/** L'editor dei numeri di un contatto, dentro un campo con la sua etichetta. */
function CampoTelefoni ({ contatto, telefoni, aiuto, allaModifica }: {
  contatto: ContattoTelefonico
  telefoni: Telefono[]
  aiuto: string
  allaModifica: (telefoni: Telefono[]) => void
}): ReactElement {
  const titolo = testi().telefoni.titolo
  return (
    <div className="campo campo--piena">
      <span className="campo__etichetta">
        {titolo}
        <Suggerimento testo={aiuto} etichetta={titolo} />
      </span>
      <EditorTelefoni contatto={contatto} iniziali={telefoni} allaModifica={allaModifica} />
    </div>
  )
}

/**
 * Le caselle di un indirizzo: caselle e non una riga, perché il NAP si ordina e
 * la località va su una riga sua. Sopra via, NAP e località; sotto presso,
 * casella postale e paese, tutte scrivibili.
 */
function campiIndirizzo (
  prefisso: string,
  indirizzo: Indirizzo | undefined,
  aiuto: string,
  coordinate: string | null,
): ReactNode {
  const t = testi().indirizzo
  const dove = indirizzo ?? INDIRIZZO_VUOTO
  return (
    <>
      {/* La riga che si batte d'un fiato, nell'ordine in cui la si detta al telefono. */}
      <Riga>
        <Campo
          // testo-fisso: il nome del campo, lo rilegge indirizzoScritto
          nome={`${prefisso}Via`}
          etichetta={t.via}
          valore={dove.via}
          aiuto={aiuto}
          larghezza="meta"
          sotto={coordinate ? <small className="campo__aiuto">{coordinate}</small> : null}
        />
        <Campo
          // testo-fisso: il nome del campo, lo rilegge indirizzoScritto
          nome={`${prefisso}Cap`}
          etichetta={t.nap}
          valore={dove.cap}
          aiuto={t.aiutoNap}
          larghezza="quarto"
        />
        <Campo
          // testo-fisso: il nome del campo, lo rilegge indirizzoScritto
          nome={`${prefisso}Localita`}
          etichetta={t.localita}
          valore={dove.localita}
          larghezza="quarto"
        />
      </Riga>
      {/* Le tre caselle che quasi nessuno riempie: un'azienda con lo studio davanti,
          una casella postale, un domicilio oltre confine. */}
      <Riga>
        <Campo
          // testo-fisso: il nome del campo, lo rilegge indirizzoScritto
          nome={`${prefisso}Presso`}
          etichetta={t.presso}
          valore={dove.presso ?? ''}
          aiuto={t.aiutoPresso}
          larghezza="terzo"
        />
        <Campo
          // testo-fisso: il nome del campo, lo rilegge indirizzoScritto
          nome={`${prefisso}Casella`}
          etichetta={t.casella}
          valore={dove.casella ?? ''}
          aiuto={t.aiutoCasella}
          larghezza="terzo"
        />
        <Campo
          // testo-fisso: il nome del campo, lo rilegge indirizzoScritto
          nome={`${prefisso}Paese`}
          etichetta={t.paese}
          valore={dove.paese ?? ''}
          aiuto={t.aiutoPaese}
          larghezza="terzo"
        />
      </Riga>
    </>
  )
}

/** L'indirizzo riletto dalle sue caselle. */
function indirizzoScritto (
  prefisso: string,
  valori: Record<string, string | number | boolean>,
): Indirizzo {
  // Le facoltative vuote spariscono: un `presso: ''` nel file è un dato che non c'è.
  const facoltativo = (nome: string) => testo(valori[`${prefisso}${nome}`]) || undefined
  return {
    presso: facoltativo('Presso'), // testo-fisso: il nome del campo
    via: testo(valori[`${prefisso}Via`]),
    casella: facoltativo('Casella'), // testo-fisso: il nome del campo
    cap: testo(valori[`${prefisso}Cap`]),
    localita: testo(valori[`${prefisso}Localita`]),
    paese: facoltativo('Paese'), // testo-fisso: il nome del campo
  }
}

/**
 * Una persona nuova da una pagina che non è di una classe (l'elenco delle
 * persone): la classe si sceglie nel modulo, proposta quella in contesto.
 * Senza classi nell'anno, prima la classe.
 */
export function moduloNuovaPersona (classeProposta: Classe | null): void {
  const classi = classiDellAnno().filter((c) => !c.archiviata)
  if (classi.length === 0) {
    moduloClasse()
    return
  }
  // La classe si sceglie nel modulo stesso: qui si propone quella in contesto.
  const proposta = classeProposta && !classeProposta.archiviata ? classeProposta : classi[0]
  moduloAllievo(proposta)
}

export function moduloAllievo (classe: Classe, allievo?: Allievo): void {
  const t = testi().persona
  const L = lessico()
  const modifica = Boolean(allievo)
  const base = allievo ?? creaAllievo('', '')
  // I numeri non passano da `valoriModulo`: sono righe che si aprono e chiudono;
  // li tiene questa variabile, letta da `alSalva`.
  let telefoni = (base.telefoni ?? []).map((t) => ({ ...t }))
  // Nemmeno la foto: è un file già copiato. Si tiene dov'è finita, perché
  // `alSalva` riscrive l'anagrafica intera.
  let foto = base.foto
  const soloDi = (contatto: ContattoTelefonico) =>
    telefoni.filter((t) => t.contatto === contatto)
  const rimpiazzaDi = (contatto: ContattoTelefonico) => (nuovi: Telefono[]) => {
    telefoni = [...telefoni.filter((t) => t.contatto !== contatto), ...nuovi]
  }

  // Le classi aperte dell'anno, più la sua se archiviata: il campo deve elencare
  // il valore che mostra.
  const classiScelta = [
    ...classiDellAnno().filter((c) => !c.archiviata),
    ...(classe.archiviata ? [classe] : []),
  ]

  apriModale({
    titolo: modifica ? t.modifica : t.nuova,
    sottotitolo: modifica ? classe.nome : undefined,
    larghezza: 'media',
    corpo: () => (
      <div className="modulo">
        {/* La classe: nuova si sceglie, già scritta si legge soltanto (spostare appelli
            e voti è un'altra cosa). */}
        <Campo
          nome="classeId"
          etichetta={Uno(L.classe)}
          tipo="select"
          valore={classe.id}
          opzioni={classiScelta.map((c) => ({ valore: c.id, testo: c.nome }))}
          richiesto
          disabilitato={modifica}
          aiuto={modifica ? t.aiutoClasseScritta : t.aiutoClasseNuova}
        />
        {/* Tre sezioni: chi è, come la si raggiunge, chi sta dall'altra parte, così
            mail e telefoni non si confondono fra persona, rappresentante e datore. */}
        <SezioneModulo titolo={t.chiE}>
          <Riga>
            <Campo nome="cognome" etichetta={parole().cognome} valore={base.cognome} richiesto larghezza="meta" />
            <Campo nome="nome" etichetta={parole().nome} valore={base.nome} richiesto larghezza="meta" />
          </Riga>
          <Riga>
            <Campo
              nome="dataNascita"
              etichetta={t.dataNascita}
              tipo="date"
              valore={base.dataNascita ?? ''}
              aiuto={t.aiutoDataNascita}
              larghezza="meta"
            />
            <Campo
              nome="attivo"
              tipo="checkbox"
              etichetta={t.frequenta}
              valore={base.attivo}
              aiuto={t.aiutoFrequenta}
              larghezza="meta"
            />
          </Riga>
          <CampoFoto
            classe={classe}
            base={base}
            modifica={modifica}
            allaModifica={(scelta) => {
              foto = scelta
            }}
          />
        </SezioneModulo>
        <SezioneModulo titolo={t.comeRaggiungerla}>
          {campiIndirizzo('indirizzo', base.indirizzo, t.doveAbita, statoCoordinate(base, 'domicilio'))}
          <Campo nome="email" etichetta={Uno(L.email)} tipo="email" valore={base.email ?? ''} />
          <CampoTelefoni
            contatto="pif"
            telefoni={soloDi('pif')}
            aiuto={t.aiutoTelefoni}
            allaModifica={rimpiazzaDi('pif')}
          />
        </SezioneModulo>
        <SezioneModulo titolo={Uno(L.rappresentante)}>
          <Campo
            nome="emailTutore"
            etichetta={Uno(L.email)}
            tipo="email"
            valore={base.emailTutore ?? ''}
            aiuto={t.aiutoEmailRappresentante}
          />
          <CampoTelefoni
            contatto="rappresentante"
            telefoni={soloDi('rappresentante')}
            aiuto={t.aiutoTelefoniRappresentante}
            allaModifica={rimpiazzaDi('rappresentante')}
          />
        </SezioneModulo>
        <SezioneModulo titolo={Uno(L.azienda)}>
          <Campo nome="azienda" etichetta={t.nomeAzienda} valore={base.azienda ?? ''} aiuto={t.aiutoAzienda} />
          {campiIndirizzo(
            'indirizzoDatore',
            base.indirizzoDatore,
            t.aiutoIndirizzoAzienda,
            statoCoordinate(base, 'lavoro'),
          )}
          {/* Spezzata: a che cosa serve va dietro la «i»; che senza la
              richiesta non parte resta scritto, perché è una conseguenza. */}
          <Campo
            nome="emailDatore"
            etichetta={t.emailDatore}
            tipo="email"
            valore={base.emailDatore ?? ''}
            aiuto={t.aiutoEmailDatore}
            sotto={<small className="campo__aiuto">{t.senzaEmailDatore}</small>}
          />
          <CampoTelefoni
            contatto="datore"
            telefoni={soloDi('datore')}
            aiuto={t.aiutoTelefoniDatore}
            allaModifica={rimpiazzaDi('datore')}
          />
        </SezioneModulo>
      </div>
    ),
    alSalva: async (valori, contesto) => {
      // La classe com'è adesso (`classe.salva` rimanda l'elenco intero); nuova, è
      // quella scelta nel campo.
      const classeViva = classePerId(modifica ? classe.id : testo(valori.classeId) || classe.id)
      if (!classeViva) {
        contesto.mostraErrori([t.classeTolta])
        return
      }
      const vivo = baseViva(
        contesto,
        modifica,
        base,
        classeViva.allievi.find((a) => a.id === base.id),
        t.toltaAltrove,
      )
      if (!vivo) return
      const aggiornato: Allievo = {
        ...vivo,
        cognome: testo(valori.cognome),
        nome: testo(valori.nome),
        dataNascita: testo(valori.dataNascita),
        indirizzo: indirizzoScritto('indirizzo', valori),
        email: testo(valori.email),
        emailTutore: testo(valori.emailTutore),
        azienda: testo(valori.azienda),
        indirizzoDatore: indirizzoScritto('indirizzoDatore', valori),
        emailDatore: testo(valori.emailDatore),
        // Le righe vuote non si salvano. Il prefisso si mette qui e non mentre si
        // scrive, per non cambiare il numero sotto le dita.
        telefoni: telefoni
          .map((n) => ({ ...n, numero: conPrefissoInternazionale(n.numero) }))
          .filter((n) => n.numero !== ''),
        attivo: Boolean(valori.attivo),
      }
      // Senza foto la chiave se ne va, invece di restare `undefined` nel file.
      if (foto) aggiornato.foto = foto
      else delete aggiornato.foto
      // L'host valida solo la classe: la persona si controlla qui.
      const esito = validaAllievo(aggiornato)
      if (!esito.valido) {
        contesto.mostraErrori(esito.errori)
        return
      }
      const allievi = modifica
        ? classeViva.allievi.map((a) => (a.id === aggiornato.id ? aggiornato : a))
        : [...classeViva.allievi, aggiornato]

      await salva(
        contesto,
        { tipo: 'classe.salva', classe: { ...classeViva, allievi } },
        modifica ? t.aggiornata : t.aggiunta,
      )
    },
    azioniSecondarie: (contesto) =>
      modifica
        ? (
            <TastoElimina
              contesto={contesto}
              etichetta={t.togliDallaClasse}
              // Con la persona se ne vanno presenze e voti a suo nome.
              chiedi={{ genere: 'allievo', classeId: classe.id, id: base.id }}
              azione={{ tipo: 'allievo.elimina', classeId: classe.id, allievoId: base.id }}
              fatto={t.tolta}
            />
          )
        : null,
  })
}

/** Incolla-elenco: il modo in cui gli allievi entrano davvero, all'inizio dell'anno. */
export function moduloImportaAllievi (classe: Classe): void {
  const t = testi().importa
  apriModale({
    titolo: t.titolo,
    sottotitolo: classe.nome,
    larghezza: 'media',
    testoSalva: parole().importa,
    corpo: () => (
      <div className="modulo">
        <p className="testo-quieto">{t.spiegazione}</p>
        <Campo nome="testo" tipo="textarea" righe={12} segnaposto={t.segnaposto} />
      </div>
    ),
    alSalva: async (valori, contesto) => {
      await salva(
        contesto,
        { tipo: 'allievi.importa', classeId: classe.id, testo: String(valori.testo ?? '') },
        t.fatto,
      )
    },
  })
}

