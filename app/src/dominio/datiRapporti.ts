// Che cosa il registro mette dentro un modello di rapporto.
//
// Sta nel dominio e non accanto al PDF di proposito: che cosa dice un verbale
// è una domanda sul registro, non sulla carta. Qui si raccolgono valori,
// elenchi e tabelle; come finiscano su una pagina lo decide il modello, e a
// disegnarli è `dati/rapportiPdf.ts`. Il giorno in cui un rapporto servisse in
// un'altra forma — una pagina web, un foglio di calcolo — questi dati sono già
// pronti e non c'è niente da riscrivere.

import {
  SIGLE_PRESENZA,
  allieviAttivi,
  distribuzione,
  distribuzioneAPunti,
  formattaVoto,
  mediaAllievo,
  minutiDiAttivita,
  notaFineSemestre,
  nomeCompleto,
  ordinaAllievi,
  riepilogaPresenze,
  siglaPresenza,
  statoUd,
  unitaDidattiche,
} from './calcoli.js'
import {
  classeDelCorsoId,
  corsiDellaClasse,
  materiaDelCorso,
  registroDelCorso,
} from './corsi.js'
import { PERSONE, PIF, corto, del } from './lessico.js'
import { matriceCorso } from './matriceCorso.js'
import { recuperiDelMomento, rigaDelRecupero, type StatoRecupero } from './recuperi.js'
import { riconsegneDegliAllievi } from './riconsegne.js'
import { udPrevisteDaOrario } from './orario.js'
import {
  MINUTI_UD,
  durataMinuti,
  formattaData,
  formattaDurata,
  formattaUd,
  oggi,
  semestreDi,
} from './date.js'
import type {
  Allievo,
  Classe,
  Consegna,
  Corso,
  MomentoValutazione,
  Iso,
  Lezione,
  PianoLezione,
  Registro,
  Semestre,
} from './modelli.js'
import type { DatiRapporto, Tabella } from './rapporti.js'

/**
 * Le UD che l'orario di un corso prevede nel periodo: il cento per cento delle
 * presenze.
 *
 * Senza semestre si guarda l'anno intero. Un corso senza orario fisso torna
 * zero, e `matriceCorso` ripiega sulle UD delle ore a calendario: è l'unico
 * monte ore che in quel caso si conosca, e dirlo storto sarebbe peggio che
 * dire quello.
 */
function udPrevisteDelCorso (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): number {
  const classe = classeDelCorsoId(registro, corso.id)
  const anno = classe ? registro.anni.find((a) => a.id === classe.annoId) ?? null : null
  const dal = semestre?.inizio ?? anno?.inizio
  const al = semestre?.fine ?? anno?.fine
  if (!dal || !al) return 0
  return udPrevisteDaOrario(anno, corso, dal, al)
}

/** Un rapporto vuoto su cui i costruttori scrivono. */
function vuoto (): DatiRapporto {
  return { valori: {}, elenchi: {}, tabelle: {}, grafici: {} }
}

/**
 * I valori che ogni rapporto ha, e che l'intestazione usa senza sapere di che
 * rapporto si tratti: è quel che rende uguali le testate di tutti.
 *
 * `periodo` non è mai vuoto: un rapporto che non guarda un semestre guarda
 * l'anno, e dirlo costa due parole. Vuoto avrebbe lasciato in testata un
 * separatore appeso al nulla, e soprattutto avrebbe fatto sembrare «di sempre»
 * un foglio che invece un periodo ce l'ha.
 */
function comuni (registro: Registro, titolo: string, periodo = 'anno intero'): Record<string, string> {
  const anno = registro.anni.find((a) => a.id === registro.annoCorrenteId) ?? registro.anni[0] ?? null
  return {
    titolo,
    anno: anno?.etichetta ?? '',
    periodo,
    generato: formattaData(oggi()),
  }
}

/**
 * Le sigle dell'appello, per chi legge il foglio senza aver visto lo schermo.
 *
 * Le lettere vengono dal codice — sono le stesse che si premono nella griglia,
 * e due elenchi diversi delle stesse sigle sarebbero due occasioni di dire cose
 * diverse — mentre come si legge la legenda lo decide `_testi.tpl`, con la
 * frase `legenda-presenze`. `{{legendaPresenze}}` resta composta qui per i
 * modelli scritti prima.
 */
function legenda (dati: DatiRapporto): void {
  const vive = SIGLE_PRESENZA.filter((v) => v.valore !== 'non-impostato')
  for (const voce of vive) {
    const nome = voce.valore.replace(/-(.)/g, (_, c: string) => c.toUpperCase())
    dati.valori[`sigla${nome[0].toUpperCase()}${nome.slice(1)}`] = voce.sigla
    dati.valori[`nome${nome[0].toUpperCase()}${nome.slice(1)}`] = voce.nome.toLowerCase()
  }
  dati.valori.legendaPresenze = vive.map((v) => `${v.sigla} ${v.nome.toLowerCase()}`).join(' · ')
}

/** Come si chiama il semestre in cui cade un giorno, per la testata. */
function periodoDi (registro: Registro, giorno: Iso): string {
  const anno = registro.anni.find((a) => a.id === registro.annoCorrenteId) ?? registro.anni[0] ?? null
  return (anno ? semestreDi(anno, giorno)?.etichetta : null) ?? 'anno intero'
}

/** Vero per una data dentro il semestre, o per qualunque data se non ce n'è uno. */
function dentro (semestre: Semestre | null, giorno: Iso): boolean {
  return !semestre || (giorno >= semestre.inizio && giorno <= semestre.fine)
}

/** L'orario di un'ora come lo si legge: gli slot in fila, le pause dichiarate. */
function orarioDi (lezione: Lezione): string {
  return lezione.slot
    .map((s) => `${s.inizio}–${s.fine}${s.tipo === 'pausa' ? ' (pausa)' : ''}`)
    .join(', ')
}

/** Il verbale di un'ora: quel che si è fatto, chi c'era, che cosa se ne è detto. */
export function datiLezione (
  registro: Registro,
  lezione: Lezione,
  consegne: Consegna[] = [],
): DatiRapporto {
  const dati = vuoto()
  const classe = classeDelCorsoId(registro, lezione.corsoId)
  const corso = registro.corsi.find((c) => c.id === lezione.corsoId) ?? null
  const piano = registro.piani.find((p) => p.id === lezione.pianoId) ?? null
  const riepilogo = riepilogaPresenze(lezione.presenze)
  const nomi = new Map(classe?.allievi.map((a) => [a.id, nomeCompleto(a)]) ?? [])
  const ud = unitaDidattiche(lezione)
  // Nel piano le durate si leggono in minuti: è così che la scaletta è stata
  // scritta, e un verbale che le riconvertisse in unità direbbe un'altra cosa.
  const minutiPerUd =
    ud.length > 0
      ? ud.reduce((somma, u) => somma + durataMinuti(u.inizio, u.fine), 0) / ud.length
      : MINUTI_UD

  dati.valori = {
    ...comuni(registro, 'Verbale della lezione', periodoDi(registro, lezione.data)),
    classe: classe?.nome ?? '',
    // La materia sta per conto suo, accanto alla classe: nel registro il corso
    // è la combinazione delle due, ma su un verbale sono due informazioni
    // diverse — la classe dice a chi, la materia dice di che cosa — e chi legge
    // le cerca in due punti diversi del foglio.
    materia: materiaDelCorso(registro, corso)?.nome ?? '',
    corso: corso?.titolo ?? '',
    data: formattaData(lezione.data),
    orario: orarioDi(lezione),
    aula: lezione.aula ?? '',
    stato: lezione.stato,
    durata: formattaUd(ud.length),
    argomenti: lezione.argomenti ?? '',
    consuntivo: lezione.consuntivo ?? '',
    materiali: lezione.materiali ?? '',
    // I numeri dell'appello, uno per uno: sono quelli che `_testi.tpl` mette
    // dentro le sue frasi. Le due righe già composte qui sotto restano perché
    // i modelli scritti prima le chiamano per nome, e un rapporto che perde una
    // riga senza dirlo è peggio di una riga in più.
    presenti: String(riepilogo.presenti),
    conAppello: String(riepilogo.totale - riepilogo.senzaAppello),
    assenti: String(riepilogo.assenti),
    parziali: String(riepilogo.parziali),
    ritardi: String(riepilogo.ritardi),
    // Vuoto quando non ce ne sono, e non «0»: è così che il `se:` di un modello
    // sa che non c'è niente da dire, e che la riga sparisce da sé.
    udSenzaAppello: riepilogo.udSenzaAppello > 0 ? String(riepilogo.udSenzaAppello) : '',
    presenze:
      `Presenti ${riepilogo.presenti}/${riepilogo.totale - riepilogo.senzaAppello} · ` +
      `assenti ${riepilogo.assenti} · parziali ${riepilogo.parziali} · ritardi ${riepilogo.ritardi}`,
    // Un appello a metà si dichiara: un verbale che tace le caselle vuote le
    // fa passare per presenze, ed è la cosa che di un verbale non deve
    // succedere.
    appelloIncompleto:
      riepilogo.udSenzaAppello > 0
        ? `Appello incompleto: ${riepilogo.udSenzaAppello} caselle non impostate.`
        : '',
  }

  // L'appello è la stessa griglia che si compila a schermo: una riga per
  // allievo, una colonna per UD, le stesse sigle. Prima il verbale elencava
  // soltanto gli irregolari, e per sapere se qualcuno era stato interrogato
  // bisognava contare chi mancava dall'elenco. Le colonne portano l'ora in cui
  // la UD comincia, così il foglio dice anche quando è successo.
  dati.tabelle.presenze = {
    intestazione: [corto(PIF), ...ud.map((u) => u.inizio), 'Min.', 'Nota'],
    pesi: [5, ...ud.map(() => 1), 1, 4],
    righe: (classe?.allievi ?? []).map((allievo) => {
      const presenza = lezione.presenze.find((p) => p.allievoId === allievo.id)
      return [
        nomeCompleto(allievo),
        ...ud.map((_, i) => siglaPresenza(statoUd(presenza, i))),
        presenza?.minuti ? String(presenza.minuti) : '',
        presenza?.nota ?? '',
      ]
    }),
  }

  // La legenda delle sigle: un foglio che esce dal registro finisce in mano a
  // chi la griglia sullo schermo non l'ha mai vista.
  legenda(dati)

  if (piano) {
    dati.elenchi.obiettivi = piano.obiettivi
    dati.tabelle.scaletta = {
      intestazione: ['#', 'Attività', 'Tipo', 'Durata', 'Svolta'],
      pesi: [1, 6, 3, 2, 2],
      righe: piano.attivita.map((attivita, i) => {
        const stato = lezione.avanzamento.find((a) => a.attivitaId === attivita.id)?.stato ?? 'da-fare'
        return [
          String(i + 1),
          attivita.titolo || 'senza titolo',
          attivita.tipo,
          formattaDurata(minutiDiAttivita(attivita.durataUd, minutiPerUd)),
          stato,
        ]
      }),
    }
  }

  dati.tabelle.consegne = {
    intestazione: ['Tipo', 'Che cosa', 'A chi', 'Per quando'],
    pesi: [2, 6, 3, 2],
    righe: consegne.map((consegna) => [
      consegna.tipo,
      consegna.testo,
      consegna.a === 'docente'
        ? 'docente'
        : consegna.a === 'allievi'
          ? consegna.allieviIds.map((id) => nomi.get(id) ?? id).join(', ')
          : 'tutta la classe',
      consegna.scadenza ? formattaData(consegna.scadenza) : '',
    ]),
  }

  dati.tabelle.osservazioni = {
    intestazione: ['Tipo', 'Chi', 'Che cosa'],
    pesi: [2, 3, 8],
    righe: lezione.osservazioni.map((osservazione) => [
      osservazione.tipo,
      osservazione.allievoId ? nomi.get(osservazione.allievoId) ?? osservazione.allievoId : 'classe',
      osservazione.testo,
    ]),
  }

  return dati
}

/** La scaletta di un'ora, da portare in aula stampata. */
export function datiPiano (registro: Registro, piano: PianoLezione): DatiRapporto {
  const dati = vuoto()
  const corso = piano.corsoId ? registro.corsi.find((c) => c.id === piano.corsoId) ?? null : null
  const classe = piano.corsoId ? classeDelCorsoId(registro, piano.corsoId) : null
  const usi = registro.lezioni
    .filter((l) => l.pianoId === piano.id)
    .sort((a, b) => a.data.localeCompare(b.data))

  dati.valori = {
    ...comuni(registro, 'Piano lezione'),
    classe: classe?.nome ?? '',
    materia: materiaDelCorso(registro, corso)?.nome ?? '',
    corso: corso?.titolo ?? '',
    data: usi[0] ? formattaData(usi[0].data) : '',
    durata: formattaDurata(
      minutiDiAttivita(piano.attivita.reduce((somma, a) => somma + a.durataUd, 0)),
    ),
    prerequisiti: piano.prerequisiti ?? '',
    note: piano.note ?? '',
    etichette: piano.tag.join(', '),
  }

  dati.elenchi.obiettivi = piano.obiettivi
  dati.tabelle.scaletta = {
    intestazione: ['#', 'Attività', 'Tipo', 'Durata', 'Come', 'Prova'],
    pesi: [1, 6, 3, 2, 3, 3],
    righe: piano.attivita.map((attivita, i) => [
      String(i + 1),
      [attivita.titolo || 'senza titolo', attivita.descrizione].filter(Boolean).join(' — '),
      attivita.tipo,
      formattaDurata(minutiDiAttivita(attivita.durataUd)),
      attivita.raggruppamento ?? '',
      attivita.valutazione
        ? `${attivita.valutazione.tipo}${attivita.valutazione.peso !== 1 ? ` · peso ${attivita.valutazione.peso}` : ''}`
        : '',
    ]),
  }

  dati.tabelle.materiali = {
    intestazione: ['Dove', 'Materiale', 'Origine'],
    pesi: [3, 5, 6],
    righe: [
      ...piano.risorse.map((r) => ['tutta l’ora', r.titolo, r.url ?? r.nome ?? '']),
      ...piano.attivita.flatMap((a) =>
        a.risorse.map((r) => [a.titolo || 'una tappa', r.titolo, r.url ?? r.nome ?? '']),
      ),
    ],
  }

  return dati
}

/** Come si dice a parole lo stato di un recupero, su un foglio stampato. */
const STATI_RECUPERO: Record<StatoRecupero, string> = {
  'da-fissare': 'da fissare',
  fissato: 'fissato',
  oggi: 'oggi',
  scaduto: 'non rifatta',
  fatto: 'rifatta',
  dispensato: 'non si recupera',
}

/** Le valutazioni di una classe in un semestre: la griglia con le medie. */
/**
 * Le valutazioni di un corso in un semestre: la griglia con le medie.
 *
 * Di un corso e non di una classe. La media è la ragione: mescolare le prove di
 * matematica con quelle di italiano dà un numero che non è la media di niente,
 * e la colonna in fondo alla griglia lo dichiarava come se lo fosse. Una classe
 * con quattro corsi fa quattro fogli, che è poi il modo in cui si consegnano.
 */
export function datiValutazioni (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): DatiRapporto {
  const dati = vuoto()
  const classe = classeDelCorsoId(registro, corso.id)
  const momenti = registro.valutazioni
    .filter((v) => v.corsoId === corso.id)
    .filter((v) => !semestre || (v.data >= semestre.inizio && v.data <= semestre.fine))
    .sort((a, b) => a.data.localeCompare(b.data))

  dati.valori = {
    ...comuni(registro, 'Valutazioni', semestre?.etichetta ?? 'anno intero'),
    classe: classe?.nome ?? '',
    materia: materiaDelCorso(registro, corso)?.nome ?? '',
    corso: corso.titolo,
    periodo: semestre?.etichetta ?? 'anno intero',
    quanti: String(momenti.length),
  }

  const giorno = oggi()
  // Tutti i recuperi delle prove del periodo, in un elenco solo: sul foglio
  // che si consegna in conferenza sono la spiegazione delle caselle vuote —
  // «manca perché non c'era, e la rifà giovedì» — e senza di loro un buco
  // sembra una dimenticanza.
  const recuperi = momenti.flatMap((momento) =>
    recuperiDelMomento(registro, momento, classe, giorno),
  )

  /** La casella di un allievo in una prova, con quel che il recupero aggiunge. */
  const casella = (momento: MomentoValutazione, allievoId: string): string => {
    const voto = momento.voti.find((v) => v.allievoId === allievoId)
    const riga = rigaDelRecupero(momento, allievoId)
    if (voto?.valore !== null && voto?.valore !== undefined) {
      // La «R» dice che quel voto viene da un'altra giornata: un 4 rifatto a
      // gennaio non si legge come un 4 preso con la classe.
      return riga ? `${voto.valore} R` : String(voto.valore)
    }
    if (riga?.dispensato) return 'disp.'
    if (riga?.previstoIl) return `R ${formattaData(riga.previstoIl)}`
    if (voto?.assente) return 'ass.'
    return ''
  }

  // Una colonna per momento, e in fondo la media: è la griglia che si guarda
  // in conferenza, e nessuno la ricostruisce a mente da un elenco di prove.
  dati.tabelle.voti = {
    intestazione: [
      corto(PIF),
      ...momenti.map((m) => `${formattaData(m.data)} ${m.titolo}`),
      'Media',
      'Nota',
    ],
    pesi: [4, ...momenti.map(() => 2), 2, 2],
    righe: (classe?.allievi ?? []).map((allievo) => {
      const suoi = momenti.map((momento) => casella(momento, allievo.id))
      // La media è il conto, la nota è quel che va sulla pagella: sul foglio
      // che si consegna devono esserci tutte e due, o l'arrotondamento lo rifà
      // a mente chi legge.
      const media = mediaAllievo(momenti, allievo.id)
      const nota = notaFineSemestre(
        media.media,
        registro.impostazioni.scala,
        registro.impostazioni.passoFineSemestre,
      )
      return [
        nomeCompleto(allievo),
        ...suoi,
        media.media === null ? '' : media.media.toFixed(2),
        nota === null ? '' : formattaVoto(nota),
      ]
    }),
  }

  // La stessa griglia dei voti, ma con le date al posto dei numeri: quando
  // ognuno ha fatto quella prova e quando se l'è riavuta. Sono le due cose che
  // in conferenza si contestano — «io la verifica l'ho fatta», «quel compito
  // non me l'hanno mai ridato» — e finora stavano sparse fra tre tabelle: la
  // riconsegna della classe nei momenti, quella di chi ha recuperato nei
  // recuperi, quella di chi mancava il giorno della ridistribuzione in
  // «da ridare». Chi cercava un nome le doveva incrociare a mano.
  //
  // La data d'esecuzione non è quella della colonna: chi ha recuperato l'ha
  // fatta un altro giorno, ed è il giorno del recupero quello che conta.
  const esecuzione = (momento: MomentoValutazione, allievoId: string): string => {
    const voto = momento.voti.find((v) => v.allievoId === allievoId)
    const riga = rigaDelRecupero(momento, allievoId)
    if (riga?.dispensato) return 'disp.'
    // Prima il recupero e poi la prova: se la prova è stata rifatta, il giorno
    // buono è quello — con il voto della classe non c'entra più niente.
    if (riga?.previstoIl) return formattaData(riga.previstoIl)
    if (riga) return 'da fissare'
    if (voto?.assente) return 'ass.'
    if (voto?.valore === null || voto === undefined) return ''
    return formattaData(momento.data)
  }

  /** Il giorno in cui quel foglio è tornato in mano a lui, se è tornato. */
  const riconsegna = (momento: MomentoValutazione, allievoId: string): Iso | null => {
    const riga = rigaDelRecupero(momento, allievoId)
    // Prima il recupero: chi ha rifatto la prova ha riavuto quel foglio, non
    // quello del primo giro.
    if (riga) return riga.riconsegnataIl ?? null
    const voto = momento.voti.find((v) => v.allievoId === allievoId)
    return voto?.riconsegnataIl ?? null
  }

  dati.tabelle.esecuzioni = {
    intestazione: [
      corto(PIF),
      ...momenti.map((m) => m.titolo),
    ],
    // Colonne larghe: in ogni casella ci stanno due date per esteso, e una
    // data troncata a metà non è una data.
    pesi: [4, ...momenti.map(() => 4)],
    righe: (classe?.allievi ?? []).map((allievo) => [
      nomeCompleto(allievo),
      ...momenti.map((momento) => {
        const fatta = esecuzione(momento, allievo.id)
        if (fatta === '') return ''
        const resa = riconsegna(momento, allievo.id)
        // Il trattino dice «non ancora»: una casella che si ferma alla data
        // d'esecuzione si legge come se la riconsegna non fosse mai stata una
        // domanda, ed è invece proprio quella che si viene a chiedere.
        return `${fatta} > ${resa ? formattaData(resa) : '-'}`
      }),
    ]),
  }

  dati.tabelle.momenti = {
    intestazione: ['Data', 'Titolo', 'Tipo', 'Peso', 'Voti', 'Recuperi', 'Riconsegna'],
    pesi: [2, 5, 3, 1, 1, 2, 2],
    righe: momenti.map((momento) => {
      const suoi = recuperi.filter((r) => r.momento.id === momento.id)
      // Aperto è anche il recupero già valutato che non è ancora tornato in
      // mano all'allievo: il voto c'è, ma il foglio è ancora sulla scrivania,
      // ed è lo stesso conto che fa il todo.
      const aperti = suoi.filter(
        (r) => r.stato !== 'dispensato' && !(r.stato === 'fatto' && r.riconsegnataIl),
      ).length
      return [
        formattaData(momento.data),
        momento.titolo,
        momento.tipo,
        String(momento.peso),
        String(momento.voti.filter((v) => v.valore !== null).length),
        suoi.length === 0
          ? ''
          : aperti === 0
            ? `${suoi.length} ${suoi.length === 1 ? 'chiuso' : 'chiusi'}`
            : `${aperti} di ${suoi.length}`,
        // La riconsegna è per allievo: qui si dice se il giro è finito. «Resa
        // a tutti» solo se qualcuno l'ha davvero riavuta — una prova che
        // nessuno ha ancora corretto non ha fogli da ridare, e senza questo
        // controllo risulterebbe finita prima di cominciare.
        resiUnoPerUno(momento, classe) ? 'resa a tutti' : 'da riconsegnare',
      ]
    }),
  }

  // Le prove da rifare, nome per nome. Su un foglio che si porta in
  // conferenza è la riga che risponde alla domanda che segue ogni casella
  // vuota: «e questo?».
  dati.tabelle.recuperi = {
    intestazione: [corto(PIF), 'Prova', 'Si rifà il', 'Voto', 'Riconsegnata', 'Stato'],
    pesi: [4, 5, 2, 1, 2, 3],
    righe: recuperi.map((recupero) => [
      nomeCompleto(recupero.allievo),
      recupero.momento.titolo,
      recupero.previstoIl ? formattaData(recupero.previstoIl) : '',
      recupero.voto === null ? '' : String(recupero.voto),
      recupero.riconsegnataIl ? formattaData(recupero.riconsegnataIl) : '',
      STATI_RECUPERO[recupero.stato],
    ]),
  }

  // Chi non ha ancora riavuto la sua prova: la classe l'ha riavuta il giorno
  // in cui la si è ridistribuita, ma chi mancava no — e quel foglio resta in
  // mano a chi insegna finché qualcuno non lo nomina.
  dati.tabelle.daRidare = {
    intestazione: [corto(PIF), 'Prova', 'Voto'],
    pesi: [4, 6, 1],
    righe: momenti.flatMap((momento) =>
      riconsegneDegliAllievi(momento, classe, true).map((riga) => [
        nomeCompleto(riga.allievo),
        momento.titolo,
        String(riga.voto),
      ]),
    ),
  }

  return dati
}

/**
 * Una prova sola, per esteso: chi ha preso che cosa, e che forma ha la classe.
 *
 * La griglia delle valutazioni risponde a «come va il corso» e mette venti
 * prove in venti colonne strette; questa risponde a «com'è andata *questa*
 * prova», che è la domanda che ci si fa il giorno in cui la si riconsegna e
 * quello in cui qualcuno la contesta. Sono due fogli diversi perché sono due
 * momenti diversi, e il secondo su una colonna larga due centimetri non si
 * poteva fare: non c'è posto per la nota, per il recupero, per la data in cui
 * quel foglio è tornato in mano a chi l'aveva scritto.
 *
 * Il grafico non è un ornamento. La distribuzione è l'unica cosa del foglio
 * che non si legge: si guarda. «Nove insufficienze su ventidue» è un numero
 * che si commenta, un ammasso di colonne a sinistra è una prova da rifare, e
 * la differenza fra le due cose la fa vedere la forma, non la cifra.
 */
export function datiMomento (registro: Registro, momento: MomentoValutazione): DatiRapporto {
  const dati = vuoto()
  const corso = registro.corsi.find((c) => c.id === momento.corsoId) ?? null
  const classe = corso ? classeDelCorsoId(registro, corso.id) : null
  const conti = distribuzione(momento)
  const scala = momento.scala

  dati.valori = {
    ...comuni(registro, 'Momento di valutazione', periodoDi(registro, momento.data)),
    classe: classe?.nome ?? '',
    materia: corso ? materiaDelCorso(registro, corso)?.nome ?? '' : '',
    corso: corso?.titolo ?? '',
    prova: momento.titolo,
    data: formattaData(momento.data),
    tipo: momento.tipo,
    peso: String(momento.peso),
    scala: `${formattaVoto(scala.min)}–${formattaVoto(scala.max)}, sufficienza ${formattaVoto(scala.sufficienza)}`,
    descrizione: momento.descrizione ?? '',
    voti: String(conti.conteggio),
    media: conti.media === null ? '—' : formattaVoto(conti.media),
    minimo: conti.minimo === null ? '—' : formattaVoto(conti.minimo),
    massimo: conti.massimo === null ? '—' : formattaVoto(conti.massimo),
    // Il conto che si dice ad alta voce quando si riconsegna, scritto una
    // volta sola perché nessuno lo rifaccia a mente in due modi diversi.
    sufficienti:
      conti.conteggio === 0
        ? '—'
        : `${conti.sufficienti} su ${conti.conteggio} (${Math.round(conti.quotaSufficienti * 100)}%)`,
    insufficienti: conti.conteggio === 0 ? '—' : String(conti.insufficienti),
    // Non c'è una data della prova: ci sono venti date, una per allievo. Qui
    // si dice a che punto è il giro — è la riga che qualcuno legge per sapere
    // se la faccenda è chiusa, non per contare i termini di un ricorso.
    riconsegna: resiUnoPerUno(momento, classe)
      ? 'tornata a tutti'
      : 'non ancora riconsegnata a tutti',
  }

  // Il disegno lo prepara il dominio, ed è lo stesso che finisce a schermo e
  // sul proiettore: tre grafici scritti a mano erano tre forme diverse per la
  // stessa prova.
  dati.grafici.distribuzione = distribuzioneAPunti(momento)

  const giorno = oggi()
  const recuperi = recuperiDelMomento(registro, momento, classe, giorno)

  // Una riga per allievo, non solo per chi ha un voto: la casella vuota è
  // proprio quel che si viene a chiedere, e un elenco dei soli presenti la
  // farebbe sparire.
  dati.tabelle.voti = {
    intestazione: [corto(PIF), 'Voto', 'Recupero', 'Riconsegnata', 'Nota'],
    pesi: [5, 1, 3, 2, 6],
    righe: ordinaAllievi(allieviAttivi(classe ?? ({ allievi: [] } as unknown as Classe))).map(
      (allievo) => {
        const voto = momento.voti.find((v) => v.allievoId === allievo.id)
        const riga = rigaDelRecupero(momento, allievo.id)
        const recupero = riga?.dispensato
          ? 'non si recupera'
          : riga?.previstoIl
            ? `del ${formattaData(riga.previstoIl)}`
            : riga
              ? 'da fissare'
              : ''
        // La riconsegna che vale per lui: quella del recupero se la prova
        // l'ha rifatta, altrimenti la sua.
        const resa = riga ? riga.riconsegnataIl : voto?.riconsegnataIl ?? null
        return [
          nomeCompleto(allievo),
          voto?.assente
            ? 'ass.'
            : voto?.valore === null || voto === undefined
              ? ''
              : String(voto.valore),
          recupero,
          resa ? formattaData(resa) : '',
          voto?.nota ?? '',
        ]
      },
    ),
  }

  // Chi la deve rifare, in chiaro: sul foglio della singola prova è la
  // spiegazione delle caselle vuote qui sopra.
  dati.tabelle.recuperi = {
    intestazione: [corto(PIF), 'Si rifà il', 'Voto', 'Riconsegnata', 'Stato'],
    pesi: [5, 2, 1, 2, 3],
    righe: recuperi.map((recupero) => [
      nomeCompleto(recupero.allievo),
      recupero.previstoIl ? formattaData(recupero.previstoIl) : '',
      recupero.voto === null ? '' : String(recupero.voto),
      recupero.riconsegnataIl ? formattaData(recupero.riconsegnataIl) : '',
      STATI_RECUPERO[recupero.stato],
    ]),
  }

  return dati
}

/**
 * Vero se ogni foglio è tornato al suo allievo senza una data di gruppo.
 *
 * Serve a non dire «da riconsegnare» di una prova che è finita: la data della
 * classe è una scorciatoia — la pila ridistribuita in un giorno solo — e chi
 * riconsegna in tre volte non la scrive mai.
 */
function resiUnoPerUno (momento: MomentoValutazione, classe: Classe | null): boolean {
  const suoi = riconsegneDegliAllievi(momento, classe)
  return suoi.length > 0 && suoi.every((riga) => riga.riconsegnataIl !== null)
}

/** Le presenze di una classe, ora per ora: il conto che si consegna. */
/**
 * Il conto delle presenze di un corso in un semestre.
 *
 * Di un semestre e non dell'anno: la percentuale di presenza del primo non è
 * quella del secondo, e un foglio che sommasse tutto nasconderebbe proprio il
 * caso che si vuole vedere — chi ha cominciato a mancare dopo gennaio. Con
 * `semestre` nullo si guarda l'anno intero, ed è scritto in testata.
 *
 * I numeri li fa `matriceCorso`, gli stessi che la vista Corsi mostra a
 * schermo. Erano contati qui una seconda volta, e in un modo diverso: il
 * denominatore erano tutte le UD invece di quelle su cui l'appello è stato
 * fatto davvero, e un'ora dimenticata faceva crollare la percentuale di tutti.
 * Il foglio stampato diceva così una cosa e lo schermo un'altra.
 */
export function datiPresenze (
  registro: Registro,
  corso: Corso,
  semestre: Semestre | null,
): DatiRapporto {
  const dati = vuoto()
  const classe = classeDelCorsoId(registro, corso.id)
  const periodo = semestre?.etichetta ?? 'anno intero'

  // Le ore di questo insegnamento, nel periodo, e non le annullate: un'ora che
  // non si è tenuta non è un'ora in cui qualcuno poteva mancare.
  const lezioni = registroDelCorso(registro, corso.id).filter(
    (l) => l.stato !== 'annullata' && dentro(semestre, l.data),
  )
  const allievi = ordinaAllievi(allieviAttivi(classe ?? ({ allievi: [] } as unknown as Classe)))
  // Il cento per cento sono le ore che l'orario del corso prevede nel periodo,
  // non quelle già messe a calendario: a metà ottobre metà del semestre non è
  // ancora stata generata, e contare sulle ore esistenti direbbe che tutti
  // hanno seguito tutto.
  const matrice = matriceCorso(
    allievi,
    lezioni,
    [],
    registro.impostazioni,
    udPrevisteDelCorso(registro, corso, semestre),
  )
  const totali = matrice.classe

  const percento = (quota: number | null) => (quota === null ? '—' : `${Math.round(quota * 100)}%`)

  dati.valori = {
    ...comuni(registro, 'Presenze', periodo),
    classe: classe?.nome ?? '',
    materia: materiaDelCorso(registro, corso)?.nome ?? '',
    corso: corso.titolo,
    quanti: String(lezioni.length),
    ud: String(matrice.udPreviste),
    udTenute: String(matrice.ud),
    presenza: percento(totali.presenza),
    assenza: percento(totali.assenza),
  }

  // Due percentuali, e non una: «% assenza» sulle ore che il corso prevedeva —
  // è la cifra che si consegna, quella che risponde a «quanto ha perso di
  // quel che doveva fare» — e «% appello» sulle UD in cui l'appello è stato
  // davvero fatto, che dice quanto quel primo numero è affidabile. Con la sola
  // seconda, un semestre con metà appelli dimenticati risultava perfetto.
  dati.tabelle.presenze = {
    intestazione: [
      corto(PIF),
      'UD corso',
      'UD seguite',
      '% presenza',
      'UD di assenza',
      '% assenza',
      'Ritardi',
      'UD con appello',
      '% appello',
    ],
    pesi: [5, 2, 2, 2, 2, 2, 2, 2, 2],
    righe: [
      ...matrice.righe.map((riga) => [
        nomeCompleto(riga.allievo),
        String(riga.udPreviste),
        String(riga.udPresenza),
        percento(riga.presenzaPreviste),
        String(riga.udAssenza),
        percento(riga.assenza),
        String(riga.ritardi),
        String(riga.udConAppello),
        percento(riga.presenza),
      ]),
      // La riga della classe in fondo: è il numero che si legge per primo
      // guardando il foglio, e sommarlo a mente da dodici righe non lo fa
      // nessuno.
      [
        'Classe',
        String(totali.udPreviste),
        String(totali.udPresenza),
        percento(totali.presenzaPreviste),
        String(totali.udAssenza),
        percento(totali.assenza),
        String(totali.ritardi),
        String(totali.udConAppello),
        percento(totali.presenza),
      ],
    ],
  }

  // Chi è oltre la soglia, per nome: sul foglio della classe una percentuale in
  // una colonna di nove non salta all'occhio, e il motivo per cui si guarda
  // questo foglio è proprio sapere di chi ci si deve occupare. Vuoto — nessuno
  // oltre, o segnalazione spenta — la sezione sparisce da sé.
  dati.elenchi.oltreSoglia = matrice.righe
    .filter((riga) => oltreSoglia(registro, riga.assenza))
    .map(
      (riga) =>
        `${nomeCompleto(riga.allievo)} — assenza del ${percento(riga.assenza)} ` +
        `su ${riga.udPreviste} UD previste, ${riga.udAssenza} perse`,
    )
  dati.valori.sogliaAssenza = String(registro.impostazioni.sogliaAssenza)

  // Le due regole si dichiarano sul foglio: chi legge «8%» ha il diritto di
  // sapere su che cosa è fatto, e messe una accanto all'altra senza dirlo le
  // due percentuali sembrerebbero in contraddizione.
  // I due numeri da soli, per chi la frase se la riscrive in `_testi.tpl`.
  dati.valori.udPrevisteCorso = String(matrice.udPreviste)
  dati.valori.udACalendario = String(matrice.ud)
  dati.valori.nota =
    `Le UD previste dall’orario del corso nel periodo sono ${matrice.udPreviste}, ` +
    `di cui ${matrice.ud} già a calendario. «% presenza» e «% assenza» sono calcolate su ` +
    'quelle previste: la seconda è quanto si è perso di ciò che era in programma, la prima ' +
    'è la frequenza, cioè cento meno quella. Le ore ancora da fare non pesano su nessuna ' +
    'delle due. La ' +
    '«% appello» è invece calcolata sulle sole UD in cui l’appello è stato fatto, e dice ' +
    'quanto i primi due numeri sono affidabili: un’ora di cui nessuno ha segnato niente non ' +
    'è un’ora di assenze per nessuno.'

  return dati
}

/** Il fascicolo di una classe: quel che si consegna a chi subentra. */
/**
 * La parete di ritratti di una classe: una faccia, un nome.
 *
 * Serve alle prime settimane — venticinque nomi da imparare, e un elenco
 * alfabetico non aiuta a chiamare per nome chi alza la mano — e a chi sostituisce
 * per un'ora: si porta il foglio in aula e sa con chi sta parlando.
 *
 * Ci sono tutti quelli che frequentano, con foto o senza: chi non ce l'ha tiene
 * la sua casella con il posto segnato, perché una parete in cui manca qualcuno
 * senza dirlo è una parete che si crede completa.
 */
export function datiFotoClasse (registro: Registro, classe: Classe): DatiRapporto {
  const dati = vuoto()
  // Nell'ordine dell'elenco di classe: la parete si guarda accanto al registro
  // delle presenze, e due ordini diversi per le stesse venticinque persone
  // obbligano a cercare due volte.
  const attivi = ordinaAllievi(allieviAttivi(classe))

  dati.valori = {
    ...comuni(registro, 'Foto della classe'),
    classe: classe.nome,
    // Una parete è della classe e non di un insegnamento, come il fascicolo:
    // esistono vuoti perché la testata comune li nomina.
    materia: '',
    corso: '',
    allievi: String(attivi.length),
    conFoto: String(attivi.filter((a) => a.foto).length),
  }

  dati.gallerie = {
    allievi: {
      celle: attivi.map((allievo) => ({
        immagine: allievo.foto ?? '',
        titolo: nomeCompleto(allievo),
        sotto: allievo.azienda ?? '',
      })),
    },
  }

  return dati
}

export function datiFascicolo (registro: Registro, classe: Classe): DatiRapporto {
  const dati = vuoto()
  const fascicolo = registro.fascicoli.find((f) => f.classeId === classe.id) ?? null

  dati.valori = {
    // L'anno intero, e non un semestre: recapiti, documenti raccolti e
    // comunicazioni non si azzerano a gennaio.
    ...comuni(registro, 'Fascicolo di classe'),
    classe: classe.nome,
    // Un fascicolo è della classe e non di un insegnamento: materia e corso
    // esistono e sono vuoti, perché la testata comune li nomina e un valore
    // che manca del tutto è indistinguibile da uno dimenticato.
    materia: '',
    corso: '',
    allievi: String(classe.allievi.length),
    corsi: corsiDellaClasse(registro, classe.id)
      .map((c) => c.titolo)
      .join(', '),
  }

  // Chi è, e come la si raggiunge: è tutto quel che il registro tiene di una
  // persona in formazione, ed è tutto quel che serve a chi subentra.
  dati.tabelle.allievi = {
    intestazione: [
      corto(PIF),
      'Nascita',
      'Indirizzo',
      'E-mail',
      corto(PERSONE.rappresentante),
      corto(PERSONE.azienda),
      corto(PERSONE.datore),
    ],
    pesi: [4, 2, 5, 4, 4, 3, 4],
    righe: classe.allievi.map((allievo: Allievo) => [
      nomeCompleto(allievo),
      allievo.dataNascita ? formattaData(allievo.dataNascita) : '',
      allievo.indirizzo ?? '',
      allievo.email ?? '',
      allievo.emailTutore ?? '',
      allievo.azienda ?? '',
      allievo.emailDatore ?? '',
    ]),
  }

  dati.tabelle.documenti = {
    intestazione: ['Documento', 'Categoria', 'Di chi', 'Raccolto il'],
    pesi: [5, 3, 4, 2],
    righe: (fascicolo?.documenti ?? []).map((documento) => [
      documento.titolo,
      documento.categoria,
      documento.allievoId
        ? nomeCompleto(classe.allievi.find((a) => a.id === documento.allievoId) ?? ({ cognome: '', nome: '' } as Allievo))
        : 'la classe',
      documento.aggiuntoIl ? formattaData(documento.aggiuntoIl.slice(0, 10)) : '',
    ]),
  }

  dati.tabelle.assenze = {
    intestazione: ['Periodo', 'Dal', 'Al', 'Righe'],
    pesi: [5, 2, 2, 2],
    righe: (fascicolo?.assenze ?? []).map((blocco) => [
      blocco.etichetta,
      formattaData(blocco.dal),
      formattaData(blocco.al),
      String(blocco.righe.length),
    ]),
  }

  return dati
}

/** La scheda di un allievo: medie per corso, prove e assenze del periodo. */
/**
 * La scheda di un allievo in un corso: medie, prove e assenze di quella
 * materia.
 *
 * `corso` nullo vuol dire che la classe non ne ha nemmeno uno, e allora la
 * scheda parla di tutti — cioè di niente, ma è meglio di un foglio vuoto.
 * Fuori da quel caso la scheda è sempre di un corso solo: mettere due materie
 * nella stessa tabella delle medie dà un numero che non è la media di niente,
 * ed è lo stesso motivo per cui le valutazioni si guardano un corso alla
 * volta.
 */
/**
 * La colonna del corso via, quando il corso è uno solo.
 *
 * La scheda di un corso lo dice già tre volte — in testata, nel sottotitolo e
 * nel nome del file — e ripeterlo su ogni riga di quattro tabelle è una
 * colonna che non distingue niente: ruba larghezza agli argomenti, che è
 * l'unica cosa lì dentro che cambia da una riga all'altra. Resta dov'è utile:
 * la scheda di tutta la classe mette insieme più corsi, e lì la colonna è
 * quel che dice a quale ora appartiene una riga.
 */
function senzaColonnaCorso (tabella: Tabella): Tabella {
  const dove = tabella.intestazione.indexOf('Corso')
  if (dove < 0) return tabella
  const togli = <T>(elenco: T[]): T[] => elenco.filter((_, i) => i !== dove)
  return {
    intestazione: togli(tabella.intestazione),
    ...(tabella.pesi ? { pesi: togli(tabella.pesi) } : {}),
    ...(tabella.totale ? { totale: togli(tabella.totale) } : {}),
    righe: tabella.righe.map(togli),
  }
}

/**
 * La frase da mettere in evidenza quando un'assenza supera la soglia, o niente.
 *
 * Una sola funzione per la scheda del singolo e per il foglio della classe: la
 * soglia è la stessa cosa vista da due lati, e due conti scritti in due posti
 * sono due occasioni di segnalare persone diverse.
 *
 * Soglia a zero vuol dire spenta: c'è chi quel conto lo fa altrove e non vuole
 * un avviso su ogni foglio.
 */
function oltreSoglia (registro: Registro, assenza: number | null): boolean {
  const soglia = registro.impostazioni.sogliaAssenza
  return soglia > 0 && assenza !== null && assenza * 100 > soglia
}

function avvisoAssenza (registro: Registro, assenza: number | null): string {
  if (!oltreSoglia(registro, assenza)) return ''
  return (
    `Attenzione: assenza del ${Math.round((assenza ?? 0) * 100)}%, ` +
    `oltre il ${registro.impostazioni.sogliaAssenza}% previsto.`
  )
}

export function datiAllievo (
  registro: Registro,
  classe: Classe,
  allievo: Allievo,
  semestre: Semestre | null,
  corso: Corso | null,
): DatiRapporto {
  const dati = vuoto()
  const corsi = corso ? [corso] : corsiDellaClasse(registro, classe.id)
  const nelPeriodo = (data: string) => dentro(semestre, data)

  // Le presenze in cifre, dalla stessa matrice della vista Corsi: la scheda
  // elencava le assenze una per una e non diceva quante fossero, e chi la
  // legge — a un colloquio, davanti a un tutore — la prima cosa che chiede è
  // proprio quel numero.
  const oreDelPeriodo = corsi
    .flatMap((suo) => registroDelCorso(registro, suo.id))
    .filter((l) => l.stato !== 'annullata' && nelPeriodo(l.data))
  const riga = matriceCorso(
    [allievo],
    oreDelPeriodo,
    [],
    registro.impostazioni,
    // Con più corsi il monte ore è la somma dei loro: la scheda parla di
    // quelli, e il cento per cento è quel che insieme prevedono.
    corsi.reduce((somma, suo) => somma + udPrevisteDelCorso(registro, suo, semestre), 0),
  ).righe[0]

  dati.valori = {
    ...comuni(registro, `Scheda ${del(PIF)}`, semestre?.etichetta ?? 'anno intero'),
    classe: classe.nome,
    materia: corso ? materiaDelCorso(registro, corso)?.nome ?? '' : '',
    // Detto per esteso invece che lasciato vuoto: il sottotitolo lo mette in
    // fila con il periodo, e una riga che comincia con un separatore appeso al
    // nulla si legge come un dato che manca.
    corso: corso?.titolo ?? 'tutti i corsi della classe',
    allievo: nomeCompleto(allievo),
    udPreviste: String(riga?.udPreviste ?? 0),
    udSeguite: String(riga?.udPresenza ?? 0),
    udAssenza: String(riga?.udAssenza ?? 0),
    ritardi: String(riga?.ritardi ?? 0),
    assenza:
      riga && riga.assenza !== null ? `${Math.round(riga.assenza * 100)}%` : '—',
    presenza:
      riga && riga.presenzaPreviste !== null
        ? `${Math.round(riga.presenzaPreviste * 100)}%`
        : '—',
    appello:
      riga && riga.presenza !== null ? `${Math.round(riga.presenza * 100)}%` : 'appello mai fatto',
    // L'avviso, quando l'assenza supera la soglia della scuola. È una frase
    // fatta e non un «sì»: il modello la stampa dentro un riquadro senza
    // doverla comporre, e chi cambia le parole non tocca il conto.
    avvisoAssenza: avvisoAssenza(registro, riga?.assenza ?? null),
    nota:
      'Presenza e assenza sono calcolate sulle unità didattiche che il corso prevede nel ' +
      'periodo: l’assenza è quanto si è perso di ciò che era in programma, la presenza è la ' +
      'frequenza, cioè cento meno quella. Le ore ancora da fare non pesano su nessuna delle ' +
      'due. «Appello fatto su» è la quota ' +
      'di presenza sulle sole UD in cui l’appello è stato fatto, e dice quanto i primi due ' +
      'numeri sono affidabili.',
    email: allievo.email ?? '',
    // Tutta l'anagrafica che il registro tiene, e non i quattro campi di
    // prima: la scheda è il foglio che si porta a un colloquio o si passa a
    // chi subentra, e un recapito che c'è nel registro ma non sul foglio si
    // va a cercare nel registro — cioè si perde il foglio.
    indirizzo: allievo.indirizzo ?? '',
    // Nel formato che si legge, non in ISO: la scheda finisce in mano a chi
    // non sa che il registro tiene le date all'americana.
    nascita: allievo.dataNascita ? formattaData(allievo.dataNascita) : '',
    datore: allievo.emailDatore ?? '',
    // Il ritratto: il modello lo mette dove vuole con `immagine: {{foto}}`, e
    // chi non ce l'ha non lascia un buco — la riga sparisce da sé, come ogni
    // altra riga fatta di un segnaposto vuoto.
    foto: allievo.foto ?? '',
    tutore: allievo.emailTutore ?? '',
    azienda: allievo.azienda ?? '',
    indirizzoDatore: allievo.indirizzoDatore ?? '',
    periodo: semestre?.etichetta ?? 'anno intero',
    telefono: allievo.telefono ?? '',
    telefonoDatore: allievo.telefonoDatore ?? '',
  }

  // Il conto del corso di cui parla la scheda: la media di tutte le sue prove,
  // quante ne sono, e la nota che ne viene. Sono i tre numeri che chi legge
  // cerca per primi, e stavano solo dentro una tabella di una riga sola.
  //
  // Di un corso solo: con più corsi la media non è la media di niente, e i
  // valori restano vuoti — il modello se ne accorge e mostra la tabella.
  const unico = corsi.length === 1 ? corsi[0] : null
  const suoDelPeriodo = unico
    ? registro.valutazioni.filter((v) => v.corsoId === unico.id && nelPeriodo(v.data))
    : []
  const conto = unico ? mediaAllievo(suoDelPeriodo, allievo.id) : null
  const notaSua = conto
    ? notaFineSemestre(
        conto.media,
        registro.impostazioni.scala,
        registro.impostazioni.passoFineSemestre,
      )
    : null

  dati.valori.prove = conto ? String(conto.conteggio) : ''
  dati.valori.media = conto?.media === null || conto === null ? '' : conto.media.toFixed(2)
  dati.valori.notaSemestre = notaSua === null ? '' : formattaVoto(notaSua)

  dati.tabelle.medie = {
    intestazione: ['Corso', 'Prove', 'Media', 'Nota'],
    pesi: [8, 2, 2, 2],
    righe: corsi
      .map((corso) => {
        const suoi = registro.valutazioni.filter(
          (v) => v.corsoId === corso.id && nelPeriodo(v.data),
        )
        const media = mediaAllievo(suoi, allievo.id)
        const nota = notaFineSemestre(
          media.media,
          registro.impostazioni.scala,
          registro.impostazioni.passoFineSemestre,
        )
        return [
          corso.titolo,
          String(media.conteggio),
          media.media === null ? '' : media.media.toFixed(2),
          nota === null ? '' : formattaVoto(nota),
        ]
      })
      .filter((riga) => riga[1] !== '0'),
  }

  dati.tabelle.prove = {
    // Il recupero e la riconsegna in chiaro: sono le due cose che di una prova
    // si contestano — «non l'ho mai rifatta», «non me l'hanno mai ridata» — e
    // su una scheda che si consegna devono esserci scritte, non dedotte.
    // Il peso accanto al voto: la media in cima al foglio non si spiega senza,
    // e un 4 in una prova che conta mezzo e un 4 in una che conta doppio sono
    // la stessa cifra con due conseguenze diverse. È la domanda che arriva per
    // prima quando la scheda si legge insieme all'allievo.
    intestazione: ['Data', 'Corso', 'Prova', 'Peso', 'Voto', 'Recupero', 'Riconsegnata'],
    pesi: [2, 4, 5, 1, 1, 3, 2],
    // Quante prove hanno fatto media e che media ne è venuta, in fondo alla
    // colonna dei voti: è lì che si guarda dopo aver letto i voti uno per uno,
    // e in una tabella sua da un'altra parte del foglio era un numero da
    // andare a cercare. Con più corsi non c'è: una media che mescola due
    // materie non è la media di niente.
    ...(conto && conto.media !== null
      ? {
          totale: [
            'Totale',
            '',
            `${conto.conteggio} ${conto.conteggio === 1 ? 'prova' : 'prove'}`,
            '',
            conto.media.toFixed(2),
            '',
            '',
          ],
        }
      : {}),
    righe: registro.valutazioni
      .filter((v) => corsi.some((c) => c.id === v.corsoId) && nelPeriodo(v.data))
      .filter(
        (v) =>
          v.voti.some((voto) => voto.allievoId === allievo.id) ||
          rigaDelRecupero(v, allievo.id) !== null,
      )
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((momento) => {
        const voto = momento.voti.find((v) => v.allievoId === allievo.id)
        const riga = rigaDelRecupero(momento, allievo.id)
        const recupero = riga?.dispensato
          ? 'non si recupera'
          : riga?.previstoIl
            ? `del ${formattaData(riga.previstoIl)}`
            : riga
              ? 'da fissare'
              : ''
        // La riconsegna che vale per lui: quella del recupero se la prova
        // l'ha rifatta, altrimenti la sua.
        const resa = riga ? riga.riconsegnataIl : voto?.riconsegnataIl ?? null
        return [
          formattaData(momento.data),
          registro.corsi.find((c) => c.id === momento.corsoId)?.titolo ?? '',
          momento.titolo,
          // Zero si scrive per esteso: è una prova che si fa e si corregge ma
          // che nella media non entra, e uno «0» in colonna si legge come un
          // voto mancante invece che come la regola del conto.
          momento.peso === 0 ? 'non conta' : String(momento.peso),
          voto?.assente ? 'ass.' : voto?.valore === null || voto === undefined ? '' : String(voto.valore),
          recupero,
          resa ? formattaData(resa) : '',
        ]
      }),
  }

  // Le presenze come si compilano a schermo: una riga per ora, una colonna per
  // UD, le stesse sigle. Prima qui c'era l'elenco delle sole ore storte, e
  // aveva due difetti che su una scheda contestata pesano: un'ora regolare non
  // si distingueva da un'ora di cui nessuno aveva fatto l'appello — mancavano
  // tutte e due — e un'assenza di mezza mattina si leggeva «assente» come una
  // di tutto il giorno, perché le UD stavano tutte nella stessa parola.
  const ore = corsi
    .flatMap((suo) => registroDelCorso(registro, suo.id))
    .filter((l) => l.stato !== 'annullata' && nelPeriodo(l.data))
    .sort((a, b) => a.data.localeCompare(b.data))

  // Le colonne sono quelle dell'ora più lunga del periodo: le ore più corte
  // finiscono prima, e le caselle che non esistono restano vuote invece di
  // portare il trattino, che vuol dire un'altra cosa — «UD senza appello».
  const quanteUd = ore.reduce((massimo, l) => Math.max(massimo, unitaDidattiche(l).length), 0)
  const perUd = <T>(fai: (i: number) => T): T[] => Array.from({ length: quanteUd }, (_, i) => fai(i))

  dati.tabelle.presenze = {
    intestazione: ['Data', 'Corso', ...perUd((i) => String(i + 1)), 'Min.', 'Nota'],
    pesi: [2, 4, ...perUd(() => 1), 1, 4],
    righe: ore.map((lezione) => {
      const presenza = lezione.presenze.find((p) => p.allievoId === allievo.id)
      const sue = unitaDidattiche(lezione).length
      return [
        formattaData(lezione.data),
        registro.corsi.find((c) => c.id === lezione.corsoId)?.titolo ?? '',
        ...perUd((i) => (i < sue ? siglaPresenza(statoUd(presenza, i)) : '')),
        presenza?.minuti ? String(presenza.minuti) : '',
        presenza?.nota ?? '',
      ]
    }),
  }

  // La legenda delle sigle, come nel verbale: la scheda esce dal registro e la
  // guarda un tutore, che la griglia dell'appello non l'ha mai vista.
  legenda(dati)

  // Quel che di lui è stato scritto: le osservazioni delle ore e le note messe
  // accanto a un voto. Stavano ognuna dentro il suo posto — l'osservazione nel
  // verbale di quel giorno, la nota dentro la griglia dei voti — e per
  // ricostruire un anno bisognava riaprirli uno per uno. Su una scheda che si
  // porta a un colloquio devono stare insieme, in ordine di data.
  const titoloCorso = (corsoId: string) =>
    registro.corsi.find((c) => c.id === corsoId)?.titolo ?? ''

  const daLezioni = corsi
    .flatMap((suo) => registroDelCorso(registro, suo.id))
    .filter((l) => nelPeriodo(l.data))
    .flatMap((lezione) =>
      lezione.osservazioni
        .filter((osservazione) => osservazione.allievoId === allievo.id)
        .map((osservazione) => [
          lezione.data,
          titoloCorso(lezione.corsoId),
          String(osservazione.tipo),
          osservazione.testo,
        ]),
    )

  const daVoti = registro.valutazioni
    .filter((v) => corsi.some((c) => c.id === v.corsoId) && nelPeriodo(v.data))
    .flatMap((momento) => {
      const voto = momento.voti.find((v) => v.allievoId === allievo.id)
      if (!voto?.nota) return []
      return [[momento.data, titoloCorso(momento.corsoId), 'prova', `${momento.titolo}: ${voto.nota}`]]
    })

  dati.tabelle.annotazioni = {
    intestazione: ['Data', 'Corso', 'Tipo', 'Annotazione'],
    pesi: [2, 4, 2, 8],
    righe: [...daLezioni, ...daVoti]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, ...resto]) => [formattaData(data), ...resto]),
  }

  // Un corso solo: il suo nome è già in testata, e su ogni riga sarebbe la
  // stessa parola ripetuta venti volte.
  if (corso) {
    for (const nome of ['medie', 'prove', 'presenze', 'annotazioni']) {
      dati.tabelle[nome] = senzaColonnaCorso(dati.tabelle[nome])
    }
  }

  return dati
}

/** Le tabelle di un rapporto che hanno almeno una riga: serve solo alle prove. */
export function tabellePiene (dati: DatiRapporto): Array<[string, Tabella]> {
  return Object.entries(dati.tabelle).filter(([, tabella]) => tabella.righe.length > 0)
}
