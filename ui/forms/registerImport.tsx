// «Importa da un altro registro…»: si sceglie un altro `.regi` e, una casella
// per blocco, se ne porta quel che vale anche qui (impostazioni, materie,
// classi con persone e corsi, piani, calendari ICS), coi nomi di là. Lo aprono
// il menu File, la palette e il modulo del nuovo anno (`forms/year.tsx`). Il
// lavoro è dell'host: `registro.altrove` legge senza aprire, `registro.sfoglia`
// apre il dialogo, `registro.importa` scrive.

import { useEffect, useState, type ReactElement } from 'react'

import { Molti, quanti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import { Campo, Pulsante, SezioneModulo } from '#ui/components/base.js'
import { apriModale, type ContestoModale } from '#ui/components/modal.js'
import { chiedi } from '#ui/bridge.js'
import { stato, vai } from '#ui/state.js'
import { inviaDalModulo } from './common.js'
import { testi } from './registerImport.testi.js'

/** Quel che `registro.altrove` racconta di un altro registro. */
interface RegistroAltrove {
  anno: string
  impostazioni: { scala: string, carte: number, loghi: number, docente: string, liste: number }
  materie: Array<{ nome: string, nuova: boolean }>
  classi: Array<{
    id: string
    nome: string
    persone: number
    corsi: number
    materie: string[]
    piani: number
    esiste: boolean
  }>
  calendari: string[]
  regole: number
}

/** Il prefisso delle caselle delle classi: il resto del nome è l'id. */
const CASELLA_CLASSE = 'classe:'

/** Una riga sotto una casella: quel che quel blocco porterebbe, letto di là. */
function Quanto ({ testo }: { testo: string }): ReactElement {
  return <small className="campo__aiuto">{testo}</small>
}

/** Il riepilogo delle impostazioni, in una riga. */
function riepilogoImpostazioni (letto: RegistroAltrove): string {
  const t = testi()
  const { scala, carte, loghi, docente, liste } = letto.impostazioni
  return [
    t.scala(scala),
    `${t.carte(carte)}${loghi ? `, ${t.loghi(loghi)}` : ''}`,
    docente ? t.firma(docente) : '',
    liste ? t.liste(liste) : '',
  ].filter(Boolean).join(' · ')
}

/**
 * Le caselle dei blocchi, ognuna con sotto quanto porterebbe, letto dall'altro
 * registro: si guarda prima di spuntare.
 */
function Blocchi ({ letto }: { letto: RegistroAltrove }): ReactElement {
  const t = testi()
  const L = lessico()
  const nuove = letto.materie.filter((m) => m.nuova).length
  const piani = letto.classi.reduce((somma, c) => somma + c.piani, 0)
  return (
    <div>
      <SezioneModulo titolo={t.impostazioni}>
        <Campo
          nome="impostazioni"
          etichetta={t.impostazioni}
          tipo="checkbox"
          valore
          aiuto={t.aiutoImpostazioni}
        />
        <Quanto testo={riepilogoImpostazioni(letto)} />
      </SezioneModulo>
      <SezioneModulo titolo={Molti(L.materia)}>
        <Campo
          nome="materie"
          etichetta={t.tutteLeMaterie}
          tipo="checkbox"
          valore
          aiuto={t.aiutoMaterie}
        />
        <Quanto
          testo={letto.materie.length === 0
            ? t.nessunaMateria
            : t.materieLette(letto.materie.length, nuove)}
        />
      </SezioneModulo>
      <SezioneModulo titolo={t.classiPersoneCorsi}>
        <Campo
          nome="classi"
          etichetta={t.classiSpuntate}
          tipo="checkbox"
          valore={letto.classi.length > 0}
          aiuto={t.aiutoClassi}
        />
        <Campo
          nome="anagrafica"
          etichetta={t.anagrafica}
          tipo="checkbox"
          valore
          aiuto={t.aiutoAnagrafica}
        />
        <Campo
          nome="corsi"
          etichetta={t.corsiConOrario}
          tipo="checkbox"
          valore
          aiuto={t.aiutoCorsi}
        />
        {letto.classi.length === 0
          ? <Quanto testo={t.nessunaClasse} />
          : letto.classi.map((c) => (
              <Campo
                key={c.id}
                nome={`${CASELLA_CLASSE}${c.id}`}
                etichetta={[
                  c.nome,
                  quanti(c.persone, L.pif),
                  t.corsi(c.corsi),
                  c.esiste ? t.ceGia : '',
                ].filter(Boolean).join(' — ')}
                tipo="checkbox"
                valore
              />
            ))}
      </SezioneModulo>
      <SezioneModulo titolo={t.pianiECalendari}>
        <Campo
          nome="piani"
          etichetta={Molti(L.pianoLezione)}
          tipo="checkbox"
          valore={false}
          aiuto={t.aiutoPiani}
        />
        <Quanto testo={t.pianiLetti(piani)} />
        <Campo
          nome="calendari"
          etichetta={t.calendari}
          tipo="checkbox"
          valore={false}
          aiuto={t.aiutoCalendari}
        />
        <Quanto
          testo={letto.calendari.length === 0
            ? t.nessunCalendario
            : `${letto.calendari.join(', ')} · ${t.regole(letto.regole)}`}
        />
      </SezioneModulo>
    </div>
  )
}

/** Quel che il modulo sa dell'origine: lo legge anche il salvataggio. */
interface Memoria {
  /** L'origine scelta adesso: una risposta che arriva per un'altra è vecchia. */
  scelto: string
  /** Quel che se ne è letto; null finché non c'è. */
  letto: RegistroAltrove | null
}

interface Origine { valore: string, testo: string }

/** L'origine, quel che se ne legge e le caselle che seguono. */
function Importa ({ contesto, m, recenti }: {
  contesto: ContestoModale
  m: Memoria
  recenti: Origine[]
}): ReactElement {
  const t = testi()
  /** I registri presi col dialogo, che fra i recenti non c'erano. */
  const [sfogliati, impostaSfogliati] = useState<Origine[]>([])
  const [scelto, impostaScelto] = useState(m.scelto)
  const [titolo, impostaTitolo] = useState('')
  const [letto, impostaLetto] = useState<RegistroAltrove | null>(null)

  /** Rilegge l'origine scelta e ridisegna le caselle. */
  async function leggi (percorso: string): Promise<void> {
    m.scelto = percorso
    m.letto = null
    impostaScelto(percorso)
    impostaLetto(null)
    if (!percorso) {
      impostaTitolo(t.sceglineUno(parole().sfoglia))
      return
    }
    impostaTitolo(t.lettura)
    contesto.occupato(true)
    const esito = await chiedi<RegistroAltrove>('registro.altrove', { percorso })
    // Nel frattempo se n'è scelto un altro: questa risposta è vecchia.
    if (percorso !== m.scelto) return
    contesto.occupato(false)
    if (!esito.ok || !esito.dati) {
      impostaTitolo('')
      contesto.mostraErrori(esito.errori.length ? esito.errori : [t.nonSiLegge])
      return
    }
    contesto.mostraErrori([])
    m.letto = esito.dati
    impostaLetto(esito.dati)
    impostaTitolo(t.annoLetto(esito.dati.anno))
  }

  // La prima lettura all'apertura.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void leggi(m.scelto) }, [])

  /** Un registro che fra i recenti non c'è, scelto col dialogo del sistema. */
  async function sfoglia (): Promise<void> {
    const esito = await chiedi<{ percorso: string | null }>('registro.sfoglia')
    const percorso = esito.dati?.percorso
    if (!esito.ok || !percorso) return
    if (![...recenti, ...sfogliati].some((o) => o.valore === percorso)) {
      impostaSfogliati([...sfogliati, { valore: percorso, testo: percorso.split(/[\\/]/).pop() ?? percorso }])
    }
    await leggi(percorso)
  }

  // La riga «nessun altro registro» sparisce appena un registro c'è.
  const voci = [...recenti, ...sfogliati]
  return (
    <div className="modulo">
      <Campo
        nome="percorso"
        etichetta={t.daQualeRegistro}
        tipo="select"
        valore={scelto}
        opzioni={voci.length === 0 ? [{ valore: '', testo: t.nessunRecente }] : voci}
        al={(valore) => void leggi(valore)}
        azione={<Pulsante testo={parole().sfoglia} simbolo="cartella" al={() => sfoglia()} />}
      />
      <p className="campo__aiuto">{titolo}</p>
      {/* Un'origine nuova, caselle nuove: ognuna col suo valore di partenza. */}
      <div>{letto ? <Blocchi key={scelto} letto={letto} /> : null}</div>
    </div>
  )
}

/**
 * La finestra dell'import: da quale registro (fra i recenti che rispondono, o
 * col dialogo), che cosa c'è, che cosa portare. Ogni scelta si rilegge e le
 * caselle seguono quel che c'è davvero.
 */
export function moduloImportaRegistro (): void {
  const recenti = stato.documenti.elenco
    .filter((d) => !d.aperto && !d.mancante)
    .map((d) => ({ valore: d.percorso, testo: d.etichetta ? `${d.etichetta} — ${d.nome}` : d.nome }))
  const m: Memoria = { scelto: recenti[0]?.valore ?? '', letto: null }
  const t = testi()

  apriModale({
    titolo: t.titolo,
    larghezza: 'media',
    aiuto: t.aiuto,
    corpo: (contesto) => <Importa contesto={contesto} m={m} recenti={recenti} />,
    testoSalva: parole().importa,
    alSalva: async (valori, modale) => {
      const percorso = String(valori.percorso ?? '') || m.scelto
      const letto = m.letto
      if (!percorso || !letto) {
        modale.mostraErrori([t.primaScegli])
        return
      }
      const classi = valori.classi === true
        ? letto.classi
            .filter((c) => valori[`${CASELLA_CLASSE}${c.id}`] === true)
            .map((c) => ({
              classeId: c.id,
              anagrafica: valori.anagrafica === true,
              corsi: valori.corsi === true,
            }))
        : []
      const impostazioni = valori.impostazioni === true
      const materie = valori.materie === true
      const piani = valori.piani === true
      const calendari = valori.calendari === true
      if (!impostazioni && !materie && classi.length === 0 && !calendari) {
        modale.mostraErrori([t.nienteSpuntato])
        return
      }
      const risposta = await inviaDalModulo(modale, {
        tipo: 'registro.importa',
        percorso,
        impostazioni,
        materie,
        classi,
        piani,
        calendari,
      })
      if (!risposta) return
      // L'esito lo mostra `invia`, come per ogni risposta.
      modale.chiudi()
      if (classi.length > 0) vai({ pagina: 'pagina.classi' })
    },
  })
}
