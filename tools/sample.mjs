// Rigenera il documento campione: `npm run sample`.
//
// `tests/samples/anno_esempio.regi` è un anno finto (una classe, tre persone in
// formazione, un corso, tre ore, una verifica, un progetto) scritto
// dall'archivio vero. Si
// guarda dentro rinominandolo `.zip`, e `tests/data/sample.test.mjs` lo riapre
// per accorgersi che il formato ha reso illeggibili i documenti già scritti.
//
// I dati sono inventati e devono restarlo: i documenti veri stanno in
// `registro/`, in `.gitignore`. Si rigenera solo quando il formato cambia
// apposta.
//
// Fissa anche `tests/samples/formato/v<N>.regi` per la versione dei dati
// corrente, se non c'è ancora; quelli esistenti non si riscrivono mai.
// `tests/data/formatUpgrade.test.mjs` li porta tutti al formato corrente e
// pretende quello di `VERSIONE_DATI`.

import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'

import { RADICE } from './common.mjs'

const DESTINAZIONE = percorso.join(RADICE, 'tests', 'samples', 'anno_esempio.regi')
const STORIA = percorso.join(RADICE, 'tests', 'samples', 'formato')

/**
 * L'archivio gira sui bundle di prova, con `electron` finto, per lavorare fuori
 * da una finestra. `npm run sample` li ricostruisce prima.
 */
const bundle = (nome) => `file:///${percorso.join(RADICE, 'dist-tests', nome).replace(/\\/g, '/')}`

// Una cartella di lavoro usa e getta: il campione nasce lì e viene copiato.
const banco = percorso.join(tmpdir(), 'registro-campione')
rmSync(banco, { recursive: true, force: true })
mkdirSync(percorso.join(banco, 'userData'), { recursive: true })
mkdirSync(percorso.join(banco, 'lavoro', 'registro'), { recursive: true })
process.env.REGISTRO_USERDATA = percorso.join(banco, 'userData')
writeFileSync(
  percorso.join(banco, 'userData', 'impostazioni.json'),
  JSON.stringify({ cartellaLavoro: percorso.join(banco, 'lavoro') }),
)

// `data.mjs`: lo stesso grafo delle prove, con anno in uso e deposito in una
// copia sola (vedi `tests/helpers/data.ts`).
const { Archivio, Uri } = await import(bundle('data.mjs'))
const d = await import(bundle('domain.mjs'))

const archivio = new Archivio(Uri.file(process.env.REGISTRO_USERDATA))
await archivio.apri(null)

const documento = percorso.join(banco, 'lavoro', 'registro', 'anno_esempio.regi')
// L'anno segue il calendario ufficiale (dal formato 5): le sue chiusure,
// collegate, più una propria. Le date restano quelle di sempre, come in un anno
// collegato prima che il calendario le correggesse: le prove le cercano così.
const calendario = d.CALENDARI_UFFICIALI[0]
const ufficiale = calendario.anni.find((a) => a.annoScolastico === '2026/2027')
const anno = await archivio.creaAnno({
  ...d.creaAnno('2026-09-01', '2027-06-30'),
  sospensioni: [
    ...d.chiusureUfficiali(calendario, ufficiale),
    d.creaSospensione('Giornata d’istituto', '2026-10-16', '2026-10-16'),
  ].sort((a, b) => a.dal.localeCompare(b.dal)),
  calendarioUfficiale: d.marcatoreDi(calendario, ufficiale),
}, Uri.file(documento))
if (!anno) throw new Error("l'anno del campione non si è creato")
const materia = d.creaMateria('Calcolo professionale', 'CAL')
const classe = d.creaClasse(anno.id, 'I MEC A')
classe.allievi.push(
  d.creaAllievo('Rossi', 'Maria'),
  d.creaAllievo('Bianchi', 'Luca'),
  d.creaAllievo('Verdi', 'Anna'),
)
const corso = d.creaCorso(classe.id, materia.id, 'Calcolo professionale — I MEC A')

const lezioni = ['2026-09-07', '2026-09-14', '2026-09-21'].map((data) =>
  d.creaLezione(corso.id, data, '08:20', 45),
)
lezioni[0].argomenti = 'Unità di misura e conversioni'
// Le pause della giornata e la durata dell'UD sono scritte esplicitamente nel campione.
const conImpostazioni = (impostazioni) => ({
  ...impostazioni,
  minutiUd: 45,
  pause: { prima: { inizio: '09:50', durataMin: 15 }, seguenti: [{ dopoUd: 2, durataMin: 10 }] },
})
lezioni[0].consuntivo = 'Fatti gli esercizi 1–8. Restano da riprendere le potenze di dieci.'
lezioni[0].stato = 'svolta'

// L'appello della prima ora, con un ritardo e i suoi minuti per UD (dal formato 5).
const [primo, secondo, terzo] = classe.allievi
lezioni[0].presenze = [
  { allievoId: primo.id, stati: ['presente'] },
  { allievoId: secondo.id, stati: ['ritardo'], ritardi: [7], nota: 'Treno in ritardo' },
  { allievoId: terzo.id, stati: ['assente'] },
]

const valutazione = d.creaValutazione(corso.id, 'Verifica 1 — unità di misura')
valutazione.data = '2026-09-21'

// Un progetto (dal formato 4), provato fino in fondo: due fasi, criteri e,
// nell'integrazione nel corso (dal formato 7), un compito con inizi (in
// un'ora e a mano), una proroga e una spunta, un giudizio, la matrice in due
// giorni; una tappa per fase in due piani e la prova. E un progetto di
// biblioteca, in nessun corso.
const [rossi, bianchi] = classe.allievi
const progetto = d.creaProgetto(corso.id, 'Officina delle misure')
const [integrazione] = progetto.integrazioni
integrazione.stato = 'in-corso'
progetto.fasi = [
  { id: 'fsp-rilievo', titolo: 'Rilievo' },
  { id: 'fsp-relazione', titolo: 'Relazione', descrizione: 'Si scrive e si presenta' },
]
progetto.obiettivi = ['Scegliere lo strumento di misura adatto']
progetto.criteri = [
  { id: 'crp-strumenti', titolo: 'Uso degli strumenti' },
  { id: 'crp-precisione', titolo: 'Precisione', descrizione: 'Arrotonda come si deve' },
]
integrazione.compiti = [{
  id: 'cmp-rilievo',
  titolo: 'Rilievo del pezzo',
  fine: null,
  fineLezioneId: lezioni[2].id,
  inizi: [
    { allievoId: rossi.id, data: lezioni[0].data, lezioneId: lezioni[0].id },
    { allievoId: bianchi.id, data: '2026-09-10', lezioneId: null },
  ],
  proroghe: [{ allievoId: bianchi.id, fine: '2026-09-28', nota: 'Assente due settimane' }],
  fatti: [{ allievoId: rossi.id, fattoIl: '2026-09-14T10:00:00.000Z' }],
}]
integrazione.giudizi = [{
  id: 'giu-avvio',
  allievoId: null,
  testo: 'La classe parte con entusiasmo.',
  data: lezioni[0].data,
  lezioneId: lezioni[0].id,
  creatoIl: '2026-09-07T09:00:00.000Z',
}]
const cella = { allievoId: rossi.id, criterioId: 'crp-strumenti' }
integrazione.matrice = [
  { ...cella, data: lezioni[0].data, lezioneId: lezioni[0].id, livello: 'parziale' },
  { ...cella, data: '2026-09-14', lezioneId: null, livello: 'raggiunto', nota: 'Molto meglio' },
]
const piano = d.creaPiano(corso.id)
const tappa = d.creaAttivita('Misure in officina', 1)
tappa.progettoId = progetto.id
tappa.faseProgettoId = 'fsp-rilievo'
tappa.attivitaProgettoId = 'att-rilievo'
const { risorse: _risorse, progettoId: _progetto, faseProgettoId: _fase,
  attivitaProgettoId: _origine, ...contenuto } = tappa
progetto.attivita = [{ ...contenuto, id: 'att-rilievo', faseId: 'fsp-rilievo', durataUd: 1.5 }]
piano.attivita.push(tappa)
lezioni[1].pianoId = piano.id
const pianoRelazione = d.creaPiano(corso.id)
const stesura = d.creaAttivita('Stesura della relazione', 1)
stesura.progettoId = progetto.id
stesura.faseProgettoId = 'fsp-relazione'
pianoRelazione.attivita.push(stesura)
lezioni[2].pianoId = pianoRelazione.id
valutazione.progettoId = progetto.id
const biblioteca = d.creaProgetto(null, 'Leggere un disegno tecnico')
biblioteca.obiettivi = ['Riconoscere viste e quote']

archivio.modifica(
  (registro) => {
    registro.impostazioni = conImpostazioni(registro.impostazioni)
    registro.materie.push(materia)
    registro.classi.push(classe)
    registro.corsi.push(corso)
    registro.lezioni.push(...lezioni)
    // Nella forma che la lettura rifarebbe: riaperto, il campione non ha niente da riscrivere.
    registro.valutazioni.push(d.normalizzaValutazione(valutazione))
    registro.piani.push(d.normalizzaPiano(piano), d.normalizzaPiano(pianoRelazione))
    registro.progetti.push(d.normalizzaProgetto(progetto))
    registro.progetti.push(d.normalizzaProgetto(biblioteca))
  },
  ['registro', 'classi', 'corsi', 'lezioni', 'valutazioni', 'piani', 'progetti'],
)
await archivio.salva()

// Una seconda modifica salvata a parte, perché il campione abbia anche una copia in `.storico/`.
archivio.modifica((registro) => {
  registro.lezioni[1].argomenti = 'Potenze di dieci'
}, ['lezioni'])
await archivio.salva()
await archivio.chiudi()

mkdirSync(percorso.dirname(DESTINAZIONE), { recursive: true })
copyFileSync(documento, DESTINAZIONE)
mkdirSync(STORIA, { recursive: true })
const diQuestaVersione = percorso.join(STORIA, `v${d.VERSIONE_DATI}.regi`)
if (existsSync(diQuestaVersione)) {
  console.log(`campione del formato ${d.VERSIONE_DATI} già fissato: ${percorso.relative(RADICE, diQuestaVersione)}`)
} else {
  copyFileSync(documento, diQuestaVersione)
  console.log(`campione del formato ${d.VERSIONE_DATI} fissato: ${percorso.relative(RADICE, diQuestaVersione)}`)
}
rmSync(banco, { recursive: true, force: true })
console.log(`campione scritto: ${percorso.relative(RADICE, DESTINAZIONE)}`)
