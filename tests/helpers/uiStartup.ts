/**
 * Ponte di prova per `tests/interfaccia/*.spec.ts`: stesso renderer, dati sintetici, nessun
 * accesso ai registri reali. Lo costruisce `node esbuild.mjs --ui` in
 * `dist-tests/ui.js`.
 */
import '#ui/pannello/main.js'
import {
  stato, aggiorna, ridisegna, lezioniInAgenda, MISURE_SFOGLIO, riconvalidaRicordati, vai,
  postoCorrente,
} from '#ui/pannello/state.js'
import { postoDaVista } from '#ui/pannello/place.js'
import { PAGINE, apriLezione, gruppiDiPagine, vaiA } from '#ui/pannello/pages.js'
import { scegliCorso } from '#ui/pannello/context.js'
import { COMANDI_UI } from '#ui/pannello/commands.js'
// Le miniature hanno bisogno di una tela vera: `tests/interfaccia/pageBrowser.spec.ts` le
// chiama a mano per provare apertura e chiusura di un documento.
import { miniatura, dimentica } from '#ui/pannello/components/thumbnails.js'
// Due pezzi di dominio che le prove leggono invece di ricopiarli: le regole dei
// nomi dei documenti e l'elenco delle tipologie delle pendenze.
import { collocazioneDi, percorsoDi } from '#core/dominio/locations.js'
import { FAMIGLIE_TODO } from '#core/dominio/todo.js'
import type { Classe, Registro } from '#core/dominio/models.js'
import { registroVuoto, creaAnno, creaClasse, creaMateria, creaCorso, creaLezione, creaAllievo, creaConsegna, creaPiano, creaAttivita } from '#core/dominio/factories.js'
/**
 * Un anno sintetico con due classi (una col fascicolo), un corso e un'ora
 * ciascuna. Ogni chiamata fa id nuovi: le prove del cambio di documento ne
 * costruiscono un secondo.
 */
function annoDiProva () {
  const registro = registroVuoto()
  const anno = creaAnno('2026-09-01', '2027-06-30')
  registro.anni.push(anno)
  registro.annoCorrenteId = anno.id
  for (const nome of ['DIC4a', 'DIC4b']) {
    const classe = creaClasse(anno.id, nome)
    classe.docenteDiClasse = nome === 'DIC4a'
    classe.allievi.push(creaAllievo('Esempio', 'Anna'))
    const materia = creaMateria('Matematica')
    const corso = creaCorso(classe.id, materia.id, `${nome} · Matematica`)
    registro.classi.push(classe)
    registro.materie.push(materia)
    registro.corsi.push(corso)
    registro.lezioni.push(creaLezione(corso.id, '2026-09-14', '08:20', 45))
    // Una pendenza per classe: la pagina delle pendenze ha linguette e conti.
    registro.consegne.push(creaConsegna(corso.id, `Esercizi di ${nome}`, '2026-09-14'))
  }
  return registro
}
/**
 * Dati grandi ma possibili, per le tabelle lunghe (`tests/interfaccia/misure.spec.ts`,
 * `finestra.spec.ts`): quaranta persone nella prima classe e, a scelta, molte
 * prove, molte richieste di documento o molte classi. Il numero è un parametro,
 * così la stessa pagina si misura lunga e corta. Ognuno torna sulla pagina di
 * oggi: la prova sceglie poi dove andare.
 */
const ISTANTE = '2026-09-01T08:00:00.000Z'

/** Un giorno del primo semestre per l'elemento `j` di `n`: da settembre a inizio gennaio. */
function giornoDi (j: number, n: number): string {
  return new Date(Date.UTC(2026, 8, 7) + Math.floor(j * 120 / n) * 864e5).toISOString().slice(0, 10)
}

/** Il registro di adesso, copiato, con quaranta persone nella prima classe. */
function conQuaranta (): { r: Registro, classe: Classe, corsoId: string } {
  const r = structuredClone(stato.registro)
  const classe = r.classi[0]
  const modello = classe.allievi[0]
  classe.allievi = Array.from({ length: 40 }, (_, i) => ({
    ...modello,
    id: `al-${i}`,
    cognome: `Cognome${String(i).padStart(2, '0')}`,
    nome: `Nome${i}`,
    azienda: `Azienda ${i % 7}`,
  }))
  const corsoId = r.corsi.find((c) => c.classeId === classe.id)?.id ?? ''
  return { r, classe, corsoId }
}

function carica (r: Registro, altro: Parameters<typeof aggiorna>[0] = {}): void {
  aggiorna({ registro: r, ...altro })
  vai({ pagina: 'pagina.oggi' })
}

const datiGrandi = {
  /**
   * `prove` prove nel primo semestre, un voto a testa (qualche buco, qualche
   * assente). Ognuna nasce dalla sua tappa di un piano, come nell'uso: sganciate,
   * la pagina le elencherebbe tutte sopra la griglia.
   */
  voti (prove: number): void {
    const { r, classe, corsoId } = conQuaranta()
    const scala = r.impostazioni.scala
    const passi = Math.round((scala.max - scala.min) / scala.passo) + 1
    const piano = creaPiano(corsoId)
    piano.attivita = Array.from({ length: prove }, (_, j) => ({
      ...creaAttivita(`Prova ${j + 1}`, 1),
      id: `tappa-${j}`,
      valutazione: { titolo: `Prova ${j + 1}`, tipo: 'scritto' as const, peso: 1 },
    }))
    r.piani = [...r.piani, piano]
    r.valutazioni = Array.from({ length: prove }, (_, j) => ({
      id: `val-${j}`,
      corsoId,
      lezioneId: null,
      pianoId: piano.id,
      attivitaId: `tappa-${j}`,
      titolo: `Prova ${j + 1}`,
      tipo: 'scritto' as const,
      data: giornoDi(j, prove),
      peso: 1,
      scala: { ...scala },
      descrizione: '',
      allegati: [],
      voti: classe.allievi.map((a, i) => ({
        allievoId: a.id,
        valore: (i * 7 + j * 3) % 11 === 0 ? null : scala.min + ((i + j) % passi) * scala.passo,
        assente: (i + j) % 37 === 0,
      })),
      creatoIl: ISTANTE,
      aggiornatoIl: ISTANTE,
    }))
    carica(r)
  },
  /** `richieste` richieste di documento, un foglio per persona: 125 fanno 5000 voci. */
  archivio (richieste: number): void {
    const { r, classe, corsoId } = conQuaranta()
    const modello = r.consegne.find((c) => c.corsoId === corsoId)
    if (!modello) throw new Error('manca la consegna di prova')
    const nuove = Array.from({ length: richieste }, (_, j) => ({
      ...modello,
      id: `cons-${j}`,
      testo: `Certificato ${j + 1}`,
      documento: 'certificato' as const,
      data: giornoDi(j, richieste),
      docenteDiClasse: true,
      documenti: classe.allievi.map((a) => ({
        allievoId: a.id, file: `archivio/c${j}/${a.id}.pdf`, nome: `${a.cognome}.pdf`, aggiuntoIl: ISTANTE,
      })),
      fatte: classe.allievi.filter((_, i) => (i + j) % 3 !== 0).map((a) => ({ chi: a.id, fattaIl: ISTANTE })),
    }))
    r.consegne = [...r.consegne.filter((c) => c.id !== modello.id), ...nuove]
    carica(r)
  },
  /** `classi` classi da quaranta, tutte aperte fra le persone: 25 fanno mille persone. */
  persone (classi: number): void {
    const r = structuredClone(stato.registro)
    const modello = r.classi[0]
    const allievo = modello.allievi[0]
    const nuove = Array.from({ length: classi }, (_, c) => ({
      ...modello,
      id: `cl-${c}`,
      nome: `C${String(c).padStart(2, '0')}`,
      docenteDiClasse: false,
      allievi: Array.from({ length: 40 }, (_, i) => ({
        ...allievo,
        id: `p-${c}-${i}`,
        cognome: `Cognome${String(i).padStart(2, '0')}`,
        nome: `Nome${c}`,
        azienda: `Azienda ${i % 13}`,
      })),
    }))
    r.classi = [...r.classi, ...nuove]
    carica(r, { classiApertePersone: nuove.map((c) => c.id) })
  },
  /** Il ritorno dall'host con un voto cambiato, in una prova che c'è anche nella griglia corta. */
  votoCambiato (): void {
    const r = stato.registro
    const valutazioni = r.valutazioni.map((v, j) => j !== 5 ? v : {
      ...v,
      voti: v.voti.map((x, i) => i !== 20 ? x : { ...x, valore: x.valore === 5 ? 4 : 5 }),
    })
    aggiorna({ registro: { ...r, valutazioni } })
  },
  /** Il ritorno dall'host con una spunta cambiata nella sesta richiesta. */
  spuntaCambiata (): void {
    const r = stato.registro
    const consegne = r.consegne.map((c) => c.id !== 'cons-5' ? c : {
      ...c,
      fatte: c.fatte.some((f) => f.chi === 'al-0')
        ? c.fatte.filter((f) => f.chi !== 'al-0')
        : [...c.fatte, { chi: 'al-0', fattaIl: ISTANTE }],
    })
    aggiorna({ registro: { ...r, consegne } })
  },
  /** Il ritorno dall'host con un nome cambiato nella prima classe aggiunta. */
  nomeCambiato (): void {
    const r = stato.registro
    const classi = r.classi.map((c) => c.id !== 'cl-0' ? c : {
      ...c,
      allievi: c.allievi.map((a, i) => i !== 5 ? a : { ...a, nome: a.nome === 'Bis' ? 'Nome0' : 'Bis' }),
    })
    aggiorna({ registro: { ...r, classi } })
  },
}

const registro = annoDiProva()
Object.assign(window, {
  prova: {
    stato, aggiorna, ridisegna, vai, postoCorrente, postoDaVista, apriLezione, annoDiProva,
    MISURE_SFOGLIO, PAGINE, gruppiDiPagine, vaiA, scegliCorso,
    lezioniInAgenda, riconvalidaRicordati,
    COMANDI_UI, registroVuoto, collocazioneDi, percorsoDi, FAMIGLIE_TODO, miniatura, dimentica,
    datiGrandi,
  },
})
vai(postoCorrente(), {
  contesto: { corsoId: registro.corsi[0].id, classeId: registro.classi[0].id },
  altro: {
    registro, caricato: true, data: '2026-09-14', semestreId: null,
    documenti: { corrente: null, elenco: [{ nome: '2025-2026', etichetta: null, percorso: 'C:/esempio/2025-2026.regi', cartella: 'C:/esempio', preferito: true, mancante: false, aperto: false }] },
  },
})
