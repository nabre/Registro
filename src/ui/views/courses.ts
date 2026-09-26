// I corsi: che cosa si insegna, a chi, e quando.
// In cima la matrice classi (colonne) × materie (righe): una casella vuota
// crea il corso, una accesa lo apre sotto; si toglie dalla × o dal tasto destro.
// Sotto, un corso alla volta: com'è fatto, a che punto è, come va per allievo.
// Non possiede dati: mette insieme lezioni, valutazioni e piani.

import {
  allieviAttivi,
  formattaVoto,
  momentoLezione,
  nomeCompleto,
  ordinaAllievi,
  prossimaLezione,
} from '../../domain/calculations.js'
import { oltreSoglia, percentoAssenza } from '../../domain/alerts.js'
import { checkDelCorso, riepilogoDelCheck } from '../../domain/check.js'
import { corsiDellaMateria, siglaMateria } from '../../domain/courses.js'
import { creaMateria } from '../../domain/factories.js'
import { validaMateria } from '../../domain/validation.js'
import { notifica } from '../components/notifications.js'
import { matriceCorso } from '../../domain/courseMatrix.js'
import { bilancioSegni, celleDiAllievo } from '../../domain/observations.js'
import { descriviRicorrenza } from '../../domain/timetable.js'
import { udPrevisteDelCorso } from '../../domain/courseMatrix.js'
import { Molti, Uno, corto } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { parole } from '../../domain/words.testi.js'
import { formattaData, formattaDurata, udDaMinuti } from '../../domain/dates.js'
import { confrontaNomi, percento } from '../../domain/text.js'
import type { Classe, Corso, Materia } from '../../domain/models.js'
import { azione } from '../bridge.js'
import { icona } from '../components/icons.js'
import { menuContestuale } from '../components/menu.js'
import {
  collegamento,
  pastiglia,
  pulsante,
  puntoColore,
  quieto,
  scheda,
  statoVuoto,
  testataVista,
  tonoPresenza,
} from '../components/base.js'
import { eseguiOAvvisa, sintesiIncassata, statoVuotoAnno } from '../components/filters.js'
import { corsoDelContesto } from '../context.js'
import { h, type Figlio } from '../dom.js'
import { tabella } from '../components/table.js'
import { cellaNome } from '../components/avatar.js'
import { grigliaCheck } from './check.js'
import {
  chiediEliminazione,
  moduloAnno,
  moduloClasse,
  moduloCorso,
  moduloLezione,
  moduloMateria,
  moduloUnisciMaterie,
} from '../forms.js'
import {
  aggiorna,
  annoCorrente,
  classePerId,
  classiDellAnno,
  coloreDiCorso,
  corsiDellAnnoAperto,
  materiaPerId,
  nelSemestreScelto,
  nomeSemestreScelto,
  pianiPerCorso,
  semestreScelto,
  stato,
} from '../state.js'
import { testi } from './courses.testi.js'

/**
 * Tutto quel che si sa di un corso, calcolato una volta: la scheda in alto e la
 * tabella sotto leggono gli stessi conti e restano d'accordo. I conti si
 * fermano al semestre scelto.
 */
function datiCorso (corso: Corso) {
  const classe = classePerId(corso.classeId)
  const allievi = classe ? ordinaAllievi(allieviAttivi(classe)) : []

  const lezioni = nelSemestreScelto(
    stato.registro.lezioni.filter((l) => l.corsoId === corso.id),
  )
  // Le annullate restano fuori dai conti di presenza.
  const tenute = lezioni.filter((l) => l.stato !== 'annullata')
  const momenti = nelSemestreScelto(
    stato.registro.valutazioni.filter((v) => v.corsoId === corso.id),
  ).sort((a, b) => a.data.localeCompare(b.data))

  // L'orologio dello stato e non `oggi()`, che non sa che un'ora di stamattina è finita.
  const svolte = tenute.filter(
    (l) =>
      l.stato === 'svolta' ||
      momentoLezione(l, stato.adessoData, stato.adessoOra) === 'passata',
  ).length

  return {
    classe,
    allievi,
    lezioni: lezioni.length,
    tenute,
    momenti,
    svolte,
    daFare: tenute.length - svolte,
    annullate: lezioni.length - tenute.length,
    piani: pianiPerCorso(corso.id).length,
    // Il check non ha semestre: una colonna vale per l'anno. I conti vengono dal
    // dominio, sugli attivi, come la testata della griglia.
    check: riepilogoDelCheck(stato.registro, corso.id),
    prossima: prossimaLezione(lezioni, stato.adessoData, stato.adessoOra),
    settimanali: corso.orario.reduce((somma, r) => somma + r.durataMin, 0),
    // Il cento per cento sono le ore previste dall'orario nel periodo, non quelle
    // già a calendario: lo stesso riferimento del rapporto stampato.
    matrice: matriceCorso(
      allievi,
      tenute,
      momenti,
      stato.registro.impostazioni,
      udPrevisteDelCorso(stato.registro, corso, semestreScelto()),
    ),
  }
}

type DatiCorso = ReturnType<typeof datiCorso>

/** Come sta andando il corso, in una fila di numeri sopra tutto il resto. */
function numeriDelCorso (dati: DatiCorso): HTMLElement {
  const { matrice } = dati
  const presenza = matrice.classe.presenza
  const media = matrice.classe.media
  const scala = stato.registro.impostazioni.scala
  const t = testi()

  return sintesiIncassata(
    { etichetta: corto(lessico().pif), valore: String(dati.allievi.length) },
    { etichetta: t.oreSvolte, valore: `${dati.svolte}/${dati.tenute.length}` },
    { etichetta: t.udPreviste, valore: String(matrice.udPreviste) },
    { etichetta: t.udACalendario, valore: String(matrice.ud) },
    // Solo quando ce ne sono.
    dati.annullate > 0 && { etichetta: t.annullate, valore: String(dati.annullate) },
    {
      // L'etichetta dice su che cosa è fatta: qui sulle ore con appello (meno gli
      // esoneri), mentre la colonna «Presenza» della tabella sta sulle UD previste.
      etichetta: t.presenzaConAppello,
      valore: presenza === null ? '—' : `${Math.round(presenza * 100)}%`,
      tono: tonoPresenza(presenza),
    },
    matrice.classe.udAssenza > 0 && {
      // Quanto si è perso di quel che era in programma: la cifra del rapporto.
      etichetta: t.udDiAssenzaSu(matrice.udPreviste),
      valore: `${matrice.classe.udAssenza}${
        matrice.classe.assenza === null ? '' : ` · ${percento(matrice.classe.assenza)}`
      }`,
    },
    { etichetta: t.valutazioni, valore: String(dati.momenti.length) },
    {
      // Su quanti è fatta la media si dice nell'etichetta, se non è tutta la classe.
      etichetta:
        media === null || matrice.classe.conVoto === dati.allievi.length
          ? t.mediaDiClasse
          : t.mediaDiAlcuni(matrice.classe.conVoto, dati.allievi.length),
      valore: media === null ? '—' : formattaVoto(media),
      tono: media === null ? undefined : media >= scala.sufficienza ? 'positivo' : 'negativo',
    },
    { etichetta: t.piani, valore: String(dati.piani), tono: dati.piani === 0 ? 'quiete' : undefined },
    // Una casella per colonna del check: quanti l'hanno fatta su quanti
    // frequentano, piena quando la colonna è chiusa.
    ...dati.check.map((r) => ({
      etichetta: r.colonna.titolo,
      valore: `${r.fatte}/${r.totale}`,
      tono: r.totale > 0 && r.fatte === r.totale ? ('positivo' as const) : undefined,
    })),
  )
}

function schedaCorso (corso: Corso, dati: DatiCorso): HTMLElement {
  const materia = materiaPerId(corso.materiaId)
  const t = testi()

  return scheda({
    classe: 'corso-scheda',
    titolo: corso.titolo,
    // Classe prima di materia, come nel titolo.
    sottotitolo: `${dati.classe?.nome ?? t.classeSparita} · ${materia?.nome ?? t.materiaSparita}`,
    azioni: h(
      'div',
      { class: 'corso-scheda__comandi' },
      pulsante({
        simbolo: 'matita',
        variante: 'fantasma',
        titolo: t.orarioNomeNote,
        al: () => moduloCorso({ corso }),
      }),
      pulsante({
        simbolo: 'calendario',
        variante: 'fantasma',
        titolo: t.nuovaLezione,
        al: () => moduloLezione({ corsoId: corso.id, classeId: corso.classeId }),
      }),
      pulsante({
        simbolo: 'check',
        variante: 'fantasma',
        // La pagina del check: lì si preparano le colonne.
        titolo: t.ilCheck,
        al: () =>
          aggiorna({ vista: 'check', corsoId: corso.id, filtroClasseId: corso.classeId }),
      }),
      pulsante({
        simbolo: 'piano',
        variante: 'fantasma',
        // Un piano è di un'ora: si va a vedere quali ore del corso ne aspettano uno.
        titolo: t.leOre,
        // Anche il corso: la pagina dei piani sceglie con `corsoDelContesto()`, e con
        // la sola classe potrebbe aprire un altro corso.
        al: () =>
          aggiorna({ vista: 'piani', corsoId: corso.id, filtroClasseId: corso.classeId }),
      }),
      // Nessuna esportazione qui: i documenti del corso stanno in Documenti.
      // Il corso si toglie da qui: la domanda dice quante ore e quanti voti se ne vanno.
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: t.eliminaCorso,
        al: async () => {
          if (!(await chiediEliminazione({ genere: 'corso', id: corso.id }))) return
          const risposta = await eseguiOAvvisa(
            { tipo: 'corso.elimina', corsoId: corso.id },
            t.corsoEliminato,
          )
          if (risposta.ok) aggiorna({ corsoId: null })
        },
      }),
    ),
    contenuto: h(
      'div',
      { class: 'corso-scheda__corpo' },
      numeriDelCorso(dati),
      // Se il corso ha una lezione ricorrente, e quale. Si dichiara da «Titolo e
      // orario…» (tasto destro sulla casella della matrice).
      corso.orario.length > 0
        ? h(
            'p',
            { class: 'corso-scheda__orario' },
            h('span', { class: 'testo-quieto' }, t.lezioneRicorrente),
            ...corso.orario.map((r) =>
              pastiglia(descriviRicorrenza(r, stato.registro.impostazioni), 'informativo', 'orologio')),
            h(
              'span',
              { class: 'testo-quieto' },
              t.udASettimana(udDaMinuti(dati.settimanali, stato.registro.impostazioni.minutiUd)) +
                formattaDurata(dati.settimanali),
            ),
          )
        : quieto(t.nessunaRicorrente),
      dati.prossima
        ? h(
            'p',
            { class: 'testo-quieto' },
            t.prossimaOra,
            collegamento({
              testo: formattaData(dati.prossima.data),
              al: () => aggiorna({ vista: 'lezione', lezioneId: dati.prossima?.id ?? null }),
            }),
          )
        : null,
      // Il programma d'insegnamento del corso.
      corso.note ? h('p', { class: 'corso-scheda__note' }, corso.note) : null,
    ),
  })
}

/**
 * Il corso visto per allievo: ore, assenze, voti, una riga per ciascuno. I
 * numeri arrivano da `datiCorso`, gli stessi della fila sopra.
 */
function matriceDelCorso (dati: DatiCorso): Figlio {
  const classe = dati.classe
  if (!classe) return null
  const t = testi()
  const L = lessico()

  const allievi = dati.allievi
  if (allievi.length === 0) {
    return scheda({
      titolo: Molti(L.pif),
      contenuto: h('p', { class: 'testo-quieto' }, t.nessunoFrequenta),
    })
  }

  const momenti = dati.momenti
  const matrice = dati.matrice
  const scala = stato.registro.impostazioni.scala

  /**
   * I segni della matrice del comportamento di una persona, sommati sulle ore
   * del periodo in due cifre; il dettaglio sta nella sua scheda.
   */
  const segniSegnati = (allievoId: string): Figlio => {
    const conti = bilancioSegni(celleDiAllievo(dati.tenute, allievoId))
    if (conti.positivi === 0 && conti.negativi === 0 && conti.neutre === 0) {
      return h('span', { class: 'testo-quieto' }, '—')
    }
    return h(
      'span',
      { class: 'segni-contati' },
      conti.positivi > 0 ? pastiglia(`+${conti.positivi}`, 'positivo') : null,
      conti.negativi > 0 ? pastiglia(`−${conti.negativi}`, 'negativo') : null,
      // Anche le annotazioni senza segno: qualcuno ha scritto una riga.
      conti.neutre > 0 ? h('span', { class: 'testo-quieto' }, String(conti.neutre)) : null,
    )
  }

  /**
   * Quanto ha perso delle UD previste dall'orario nel periodo (non di quelle
   * svolte), come pastiglia: la cifra del rapporto. Sopra soglia è un avviso.
   */
  const quota = (riga: (typeof matrice.righe)[number]): Figlio => {
    if (riga.assenza === null) return h('span', { class: 'testo-quieto' }, '—')
    // Oltre soglia secondo l'elenco, e con un decimale: 45 UD su 224 si legge «20,1%».
    const soglia = stato.registro.impostazioni.sogliaAssenza
    const oltre = oltreSoglia(soglia, riga.assenza)
    const intero = Math.round(riga.assenza * 100 + 1e-9)
    return pastiglia(
      percentoAssenza(riga.assenza, soglia),
      oltre ? 'negativo' : intero <= 10 ? 'positivo' : intero <= 20 ? 'attenzione' : 'negativo',
    )
  }

  /**
   * La frequenza: cento meno l'assenza, complemento esatto della colonna accanto
   * (non la quota sulle ore con appello).
   */
  const seguito = (riga: (typeof matrice.righe)[number]): Figlio => {
    if (riga.presenzaPreviste === null) return h('span', { class: 'testo-quieto' }, '—')
    // Il miliardesimo in più è quello di `percento`: 14,5% si legge 15%.
    const percento = Math.round(riga.presenzaPreviste * 100 + 1e-9)
    return pastiglia(
      `${percento}%`,
      percento >= 90 ? 'positivo' : percento >= 80 ? 'attenzione' : 'negativo',
    )
  }

  const colonneCheck = dati.check.length

  /**
   * Il check di una persona in due cifre (fatte su totali); le mancanti, per
   * nome, stanno nel suggerimento.
   */
  const contoCheck = (allievoId: string): Figlio => {
    const mancanti = dati.check
      .filter((r) => r.mancano.some((a) => a.id === allievoId))
      .map((r) => r.colonna.titolo)
    const fatte = colonneCheck - mancanti.length
    const testo = `${fatte}/${colonneCheck}`
    return h(
      'span',
      {
        attr: {
          title: mancanti.length === 0 ? t.tuttoFatto : t.mancano(mancanti),
        },
      },
      mancanti.length === 0 ? pastiglia(testo, 'positivo') : testo,
    )
  }

  return scheda({
    titolo: Molti(L.pif),
    sottotitolo: t.sottotitoloTabella(
      matrice.lezioni,
      matrice.ud,
      momenti.length,
      nomeSemestreScelto(),
    ),
    contenuto: tabella({
      variante: 'matrice',
      intestazione: [
        h('th', { class: 'tabella__nome' }, Uno(L.pif)),
        h('th', { attr: { title: t.sulleUdPreviste(matrice.udPreviste) } }, t.assenza),
        // Le due percentuali complementari affiancate, per non fare la sottrazione a mente.
        h('th', { attr: { title: t.sulleUdPreviste(matrice.udPreviste) } }, t.presenza),
        h('th', null, t.udDiAssenza),
        h('th', null, t.udSeguite),
        // Il denominatore, accanto alle percentuali.
        h('th', { attr: { title: t.udDelCorsoAiuto } }, t.udDelCorso),
        h('th', null, t.ritardi),
        // I segni del comportamento stanno fra ritardi e prove: sono di com'è andata l'ora.
        h('th', { attr: { title: t.segnatoAiuto } }, t.segnato),
        h('th', null, Molti(L.prova)),
        h('th', null, Uno(L.media)),
        h('th', null, corto(L.nota)),
        // La colonna del check solo se il corso ne ha uno.
        colonneCheck > 0
          ? h('th', { attr: { title: t.checkAiuto } }, Uno(L.check))
          : null,
      ],
      righe: matrice.righe.map((riga) =>
        h(
          'tr',
          null,
          h(
            'th',
            { class: 'tabella__nome', attr: { scope: 'row' } },
            cellaNome(
              riga.allievo,
              collegamento({
                testo: nomeCompleto(riga.allievo),
                // Il nome porta alla scheda personale.
                al: () =>
                  aggiorna({
                    vista: 'allievo',
                    classeId: classe.id,
                    allievoId: riga.allievo.id,
                  }),
              }),
            ),
          ),
          h('td', null, quota(riga)),
          h('td', null, seguito(riga)),
          h(
            'td',
            { class: riga.udAssenza > 0 ? 'tabella__cella--attenzione' : undefined },
            riga.udAssenza > 0 ? String(riga.udAssenza) : '—',
          ),
          h('td', null, String(riga.udPresenza)),
          h('td', { class: 'testo-quieto' }, String(matrice.udPreviste)),
          h('td', null, riga.ritardi > 0 ? String(riga.ritardi) : '—'),
          h('td', null, segniSegnati(riga.allievo.id)),
          h(
            'td',
            { class: riga.prove === 0 && momenti.length > 0 ? 'tabella__cella--attenzione' : undefined },
            `${riga.prove}/${momenti.length}`,
          ),
          h(
            'td',
            null,
            riga.media === null
              ? h('span', { class: 'testo-quieto' }, '—')
              : h('span', { class: 'testo-quieto' }, formattaVoto(riga.media)),
          ),
          h(
            'td',
            null,
            riga.nota === null
              ? h('span', { class: 'testo-quieto' }, '—')
              : pastiglia(
                  formattaVoto(riga.nota),
                  riga.nota >= scala.sufficienza ? 'positivo' : 'negativo',
                ),
          ),
          colonneCheck > 0 ? h('td', null, contoCheck(riga.allievo.id)) : null,
        ),
      ),
    }),
  })
}

/**
 * La griglia del check dentro la scheda del corso, la stessa della pagina
 * Check. Assente senza colonne o senza allievi: le colonne si preparano nella
 * pagina Check.
 */
function grigliaDelCorso (corso: Corso, dati: DatiCorso): Figlio {
  const check = checkDelCorso(stato.registro, corso.id)
  if (!check || check.colonne.length === 0 || dati.allievi.length === 0) return null
  return scheda({
    titolo: Uno(lessico().check),
    classe: 'scheda--check',
    aiuto: testi().aiutoGriglia,
    // Nessun pulsante per la pagina: sta fra i comandi in cima alla scheda.
    contenuto: grigliaCheck(corso, check, null),
  })
}

// ------------------------------------------------------------ la matrice

/** Il corso nasce all'incrocio, e si apre qui sotto. */
async function accendiCorso (classe: Classe, materia: Materia): Promise<void> {
  const risposta = await azione({ tipo: 'corso.crea', classeId: classe.id, materiaId: materia.id })
  if (risposta.ok && risposta.creato) aggiorna({ corsoId: risposta.creato.id })
}

/**
 * Toglie il corso dopo che `chiediEliminazione` ha detto che cosa si porta via
 * (lezioni, voti, piani).
 */
async function spegniCorso (corso: Corso): Promise<void> {
  if (stato.registro.lezioni.some((l) => l.corsoId === corso.id)) return
  if (!(await chiediEliminazione({ genere: 'corso', id: corso.id }))) return
  await azione({ tipo: 'corso.elimina', corsoId: corso.id })
}

/**
 * Scrive una materia modificata nella riga. Passa da `validaMateria` come il
 * modulo: un nome vuoto o già usato non si scrive e il campo torna com'era.
 * Anche la materia nuova della riga in fondo nasce così.
 */
async function scriviMateria (materia: Materia, campo?: HTMLInputElement): Promise<boolean> {
  const pulita: Materia = { ...materia, nome: materia.nome.trim(), sigla: materia.sigla?.trim() ?? '' }
  const esito = validaMateria(pulita, stato.registro.materie)
  if (!esito.valido) {
    notifica(esito.errori.join(' '), 'avviso')
    if (campo) campo.value = campo.defaultValue
    return false
  }
  const risposta = await azione({ tipo: 'materia.salva', materia: pulita })
  if (!risposta.ok && campo) campo.value = campo.defaultValue
  return risposta.ok
}

/**
 * Elimina la materia se nessun corso di nessun anno la usa; altrimenti c'è
 * «unisci», e il cestino è spento.
 */
async function eliminaMateria (materia: Materia): Promise<void> {
  if (corsiDellaMateria(stato.registro, materia.id).length > 0) return
  await azione({ tipo: 'materia.elimina', materiaId: materia.id })
}

/** I tre campi di una materia, in riga: colore, sigla, nome. */
function campiMateria (
  materia: Materia,
  chiave: string,
  cambia: (campo: 'nome' | 'sigla' | 'colore', valore: string, input: HTMLInputElement) => void,
): HTMLElement[] {
  const input = (
    campo: 'nome' | 'sigla' | 'colore',
    attributi: Record<string, string>,
    valore: string,
  ): HTMLInputElement => {
    const elemento = h('input', {
      class: `matrice-corsi__campo matrice-corsi__campo--${campo}`,
      type: campo === 'colore' ? 'color' : 'text',
      value: valore,
      // testo-fisso: chiave del fuoco, non si legge
      dataset: { fuoco: `materia-${chiave}-${campo}` },
      attr: attributi,
      onchange: (evento: Event) => {
        const bersaglio = evento.target as HTMLInputElement
        cambia(campo, bersaglio.value, bersaglio)
      },
      onkeydown: (evento: KeyboardEvent) => {
        if (evento.key === 'Enter') (evento.target as HTMLInputElement).blur()
        if (evento.key === 'Escape') {
          const bersaglio = evento.target as HTMLInputElement
          bersaglio.value = bersaglio.defaultValue
          bersaglio.blur()
        }
      },
    })
    elemento.defaultValue = valore
    return elemento
  }
  const t = testi()
  return [
    input(
      'colore',
      { 'aria-label': parole().colore, title: t.coloreMateria },
      materia.colore || '#7a7a7a',
    ),
    input('sigla', {
      'aria-label': t.sigla,
      // Vuota, vale quella ricavata dal nome, mostrata in trasparenza.
      placeholder: siglaMateria(materia) || t.siglaEsempio,
      maxlength: '8',
      title: materia.sigla?.trim() ? t.siglaMateria : t.siglaVuota,
    }, materia.sigla ?? ''),
    input('nome', { 'aria-label': t.nomeMateria, placeholder: t.nomeMateria }, materia.nome),
  ]
}

/**
 * L'intestazione di una riga: colore, sigla (vuota = `siglaMateria`) e nome
 * modificabili sul posto, e il cestino, acceso solo se nessun corso la usa. Il
 * tasto destro la unisce a un'altra.
 */
function testaMateria (materia: Materia, quante: number): HTMLElement {
  const corsi = corsiDellaMateria(stato.registro, materia.id).length
  const t = testi()
  const menu = (evento: MouseEvent) => {
    if ((evento.target as HTMLElement).closest('input')) return
    menuContestuale(evento, [
      { titolo: materia.nome },
      { testo: `${parole().note}…`, simbolo: 'matita', al: () => moduloMateria(materia) },
      ...(quante > 1
        ? [{
            testo: t.unisci,
            simbolo: 'duplica',
            al: () => moduloUnisciMaterie(materia),
          } as const]
        : []),
    ])
  }
  return h(
    'th',
    { class: 'matrice-corsi__materia', attr: { scope: 'row' }, oncontextmenu: menu },
    h(
      'span',
      {
        class: 'matrice-corsi__riga-materia',
        style: materia.colore ? { '--colore-materia': materia.colore } : {},
      },
      ...campiMateria(materia, materia.id, (campo, valore, input) => {
        // La materia si rilegge al gesto e non dal disegno: nel frattempo può esserne
        // arrivata una più fresca, che la fotografia sovrascriverebbe.
        const viva = materiaPerId(materia.id)
        if (!viva) return
        void scriviMateria({ ...viva, [campo]: valore }, input)
      }),
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: corsi > 0 ? t.nonSiElimina(corsi) : t.eliminaMateria,
        disabilitato: corsi > 0,
        al: () => eliminaMateria(materia),
      }),
    ),
  )
}

/** La riga in fondo: una materia nuova nasce appena ha un nome. */
function rigaNuovaMateria (colonne: number): HTMLElement {
  const bozza = creaMateria('')
  return h(
    'tr',
    { class: 'matrice-corsi__nuova' },
    h(
      'th',
      { class: 'matrice-corsi__materia', attr: { scope: 'row' } },
      h(
        'span',
        { class: 'matrice-corsi__riga-materia' },
        ...campiMateria(bozza, 'nuova', (campo, valore, input) => {
          bozza[campo] = valore
          // Nasce col nome: colore e sigla scritti prima lo aspettano.
          if (campo !== 'nome') return
          if (!valore.trim()) return
          void scriviMateria(bozza, input)
        }),
      ),
    ),
    h('td', { class: 'matrice-corsi__aiuto-nuova', attr: { colspan: String(colonne) } },
      testi().nuovaMateria),
  )
}

/** Una casella della matrice: vuota si accende, accesa si apre. */
function casellaCorso (
  classe: Classe,
  materia: Materia,
  corso: Corso | undefined,
  scelto: Corso | null,
): HTMLElement {
  const t = testi()
  const dove = `${materia.nome} · ${classe.nome}`
  // testo-fisso: chiave del fuoco, non si legge
  const fuoco = `corso-${classe.id}-${materia.id}`
  if (!corso) {
    return h(
      'td',
      { class: 'matrice-corsi__cella' },
      h(
        'button',
        {
          class: ['matrice-corsi__casella', 'matrice-corsi__casella--vuota'],
          type: 'button',
          dataset: { fuoco },
          attr: { title: t.apriIlCorso(dove), 'aria-label': t.apriIlCorsoVoce(dove) },
          onclick: () => void accendiCorso(classe, materia),
        },
        icona('piu', 'icona--minuta'),
      ),
    )
  }
  const aperto = scelto?.id === corso.id
  // Un corso con lezioni non si toglie dalla matrice: prima si tolgono le ore.
  const lezioni = stato.registro.lezioni.filter((l) => l.corsoId === corso.id).length
  const menu = (evento: MouseEvent) =>
    menuContestuale(evento, [
      { titolo: corso.titolo },
      { testo: t.apriQuiSotto, simbolo: 'destra', al: () => aggiorna({ corsoId: corso.id }) },
      { testo: t.titoloEOrario, simbolo: 'matita', al: () => moduloCorso({ corso }) },
      'separatore',
      {
        testo: t.togliCorso,
        simbolo: 'cestino',
        pericolo: true,
        disabilitato: lezioni > 0,
        titolo: lezioni > 0 ? t.haLezioni(lezioni) : undefined,
        al: () => void spegniCorso(corso),
      },
    ])
  return h(
    'td',
    { class: 'matrice-corsi__cella', oncontextmenu: menu },
    h(
      'button',
      {
        class: [
          'matrice-corsi__casella',
          'matrice-corsi__casella--accesa',
          aperto && 'matrice-corsi__casella--aperta',
        ],
        type: 'button',
        dataset: { fuoco },
        // Il colore del corso (suo o della classe), lo stesso del calendario.
        style: { '--colore-classe': coloreDiCorso(corso) },
        attr: {
          title: t.premiPerAprire(corso.titolo),
          'aria-pressed': String(aperto),
        },
        onclick: () => aggiorna({ corsoId: corso.id }),
      },
      icona('spunta', 'icona--minuta'),
    ),
    lezioni === 0
      ? h(
          'button',
          {
            class: 'matrice-corsi__togli',
            type: 'button',
            attr: { title: t.togliIlCorso(dove), 'aria-label': t.togliIlCorso(dove) },
            onclick: () => void spegniCorso(corso),
          },
          icona('chiudi', 'icona--minuta'),
        )
      : null,
  )
}

/**
 * Classi dell'anno in colonna, materie in riga: ogni incrocio è un corso. Le
 * classi archiviate restano fuori; le materie ci sono tutte, per poterle dare
 * a una classe.
 */
function matriceCorsi (): Figlio {
  const classi = classiDellAnno().filter((c) => !c.archiviata)
  const materie = [...stato.registro.materie].sort((a, b) => confrontaNomi(a.nome, b.nome))
  // Senza classi la matrice non ha colonne; senza materie resta la riga in fondo.
  const t = testi()
  if (classi.length === 0) {
    return statoVuoto({
      simbolo: 'libro',
      titolo: t.nessunaClasse,
      testo: t.primaLaClasse,
      azione: pulsante({
        testo: t.nuovaClasse,
        variante: 'primario',
        simbolo: 'piu',
        al: () => moduloClasse(),
      }),
    })
  }
  const perIncrocio = new Map(
    corsiDellAnnoAperto().map((c) => [`${c.classeId}|${c.materiaId}`, c]),
  )
  const scelto = perIncrocio.size > 0 ? corsoDelContesto() : null
  return tabella({
    classi: { telaio: 'matrice-corsi', tabella: 'matrice-corsi__tabella' },
    intestazione: [
      h('th', { class: 'matrice-corsi__angolo', attr: { scope: 'col' } }, Uno(lessico().materia)),
      ...classi.map((classe) =>
        h(
          'th',
          { class: 'matrice-corsi__classe', attr: { scope: 'col', title: classe.nome } },
          h('span', { class: 'matrice-corsi__classe-testo' }, puntoColore(classe.colore), classe.nome),
        ),
      ),
    ],
    righe: [
      ...materie.map((materia) =>
        h(
          'tr',
          null,
          testaMateria(materia, materie.length),
          ...classi.map((classe) =>
            casellaCorso(classe, materia, perIncrocio.get(`${classe.id}|${materia.id}`), scelto),
          ),
        ),
      ),
      rigaNuovaMateria(classi.length),
    ],
  })
}

export function vistaCorsi (): Figlio {
  const t = testi()
  const anno = annoCorrente()
  if (!anno) {
    return h(
      'div',
      { class: 'vista vista--corsi' },
      statoVuotoAnno({
        simbolo: 'libro',
        testo: t.corsoInUnAnno,
        crea: () => moduloAnno(),
      }),
    )
  }

  // Il corso scelto: dalla matrice o dalla tendina in cima, che sono la stessa scelta.
  const scelto = corsiDellAnnoAperto().length > 0 ? corsoDelContesto() : null
  const dati = scelto ? datiCorso(scelto) : null

  return h(
    'div',
    { class: 'vista vista--corsi' },
    testataVista({
      titolo: Molti(lessico().corso),
      sottotitolo: t.contiDel(nomeSemestreScelto()),
      aiuto: t.aiuto,
    }),
    matriceCorsi(),
    scelto && dati
      ? h(
          'div',
          { class: 'corso-dettaglio' },
          h(
            'div',
            { class: 'corso-dettaglio__testa' },
            // Il colore del corso sul bordo, lo stesso del calendario.
            puntoColore(coloreDiCorso(scelto)),
            schedaCorso(scelto, dati),
          ),
          matriceDelCorso(dati),
          grigliaDelCorso(scelto, dati),
        )
      : null,
  )
}
