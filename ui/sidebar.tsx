// Navigazione persistente sul desktop, apribile a richiesta nelle finestre strette.
import { Fragment, type ReactElement, type ReactNode } from 'react'

import { assistenteAperto } from './assistant.js'
import { classi } from './classNames.js'
import { Icona } from './components/icons.js'
import { alternaMenuSotto, type ElementoMenu } from './components/menu.js'
import {
  classeDelFascicolo, corsoDelContesto, nomeDelCorso, scegliClasseDelFascicolo, scegliCorso,
} from './context.js'
import { gruppiDiPagine, vaiA, type GruppoDiPagine, type Pagina } from './pages.js'
import { raggruppamentoDeiCorsi } from '#core/dominio/courses.js'
import { confrontaNomi } from '#core/dominio/text.js'
import {
  aggiorna,
  classePerId,
  classiDiCuiSonoDocente,
  coloreDiCorso,
  corsiDellAnnoAperto,
  materiaPerId,
  nomeClasse,
  nomeMateria,
  ridisegna,
  stato,
  vai,
} from './state.js'
import type { Posto } from './place.js'
import { testi } from './sidebar.testi.js'

const stretta = window.matchMedia('(max-width: 64em)')
// La larghezza della finestra non sta nello stato: cambiandola si ridisegna a mano.
stretta.addEventListener('change', () => ridisegna())

/**
 * Se la navigazione è ridotta per forza: su finestra stretta con l'assistente
 * aperto (`styles/assistant.css`) non c'è spazio per allargarla. Le scelte
 * `sidebarDesktop`/`sidebarMobile` restano, e tornano quando c'è posto.
 */
function sidebarCostretta (): boolean {
  return stretta.matches && assistenteAperto()
}

export function sidebarAperta (): boolean {
  if (sidebarCostretta()) return false
  return stretta.matches ? stato.sidebarMobile : stato.sidebarDesktop
}

function imposta (aperta: boolean, restituisciFuoco = false): void {
  aggiorna(stretta.matches ? { sidebarMobile: aperta } : { sidebarDesktop: aperta })
  if (restituisciFuoco) requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('[data-fuoco="apri-navigazione"]')?.focus()
  })
}

/**
 * Il titolo di un gruppo che sceglie di che cosa sono le pagine (il corso del
 * Registro, la classe del docente di classe): una tendina del programma, non
 * un `select`, con la voce in uso spuntata.
 */
function titoloCheSceglie (
  righe: string[],
  azione: string,
  fuoco: string,
  voci: () => ElementoMenu[],
): ReactElement {
  return (
    <button
      type="button"
      className="sidebar__titolo-scelta"
      data-fuoco={fuoco}
      aria-haspopup="menu"
      aria-label={`${azione}: ${righe.join(' · ')}`}
      onClick={(evento) => {
        alternaMenuSotto(evento.currentTarget, voci())
      }}
    >
      <span className="sidebar__titolo-righe">
        {righe.map((riga, i) => <span key={i} className="sidebar__titolo-riga">{riga}</span>)}
      </span>
      <Icona nome="giu" classe="sidebar__titolo-freccia" />
    </button>
  )
}

/**
 * Le classi con il fascicolo: quelle di cui si è docente di classe. Da una
 * pagina del gruppo la pagina resta e mostra la classe nuova; da fuori si apre
 * la prima pagina del gruppo, già sulla classe: `scegliClasseDelFascicolo`
 * appenderebbe la classe a una pagina che non è sua.
 */
function vociDelleClassi (gruppo: GruppoDiPagine): ElementoMenu[] {
  const attuale = classeDelFascicolo()?.id
  return classiDiCuiSonoDocente().map((classe) => ({
    testo: classe.nome,
    simbolo: 'classi' as const,
    accesa: classe.id === attuale,
    al: () => {
      if (gruppo.attivo) {
        scegliClasseDelFascicolo(classe.id)
        return
      }
      entraNelGruppo(gruppo, { tipo: 'classe', id: classe.id },
        { classeId: classe.id, filtroClasseId: classe.id })
    },
  }))
}

/**
 * Apre la prima pagina del gruppo sul soggetto scelto, contesto compreso: un
 * passo solo, una voce sola nella storia.
 */
function entraNelGruppo (
  gruppo: GruppoDiPagine,
  soggetto: NonNullable<Posto['soggetto']>,
  contesto: NonNullable<Parameters<typeof vai>[1]>['contesto'],
): void {
  const pagina = gruppo.pagine[0]
  if (!pagina) return
  vai({ pagina: pagina.id, soggetto }, { contesto })
  chiudiSidebarMobile()
}

/**
 * I corsi dell'anno per il menu del titolo: un titoletto per materia e le
 * classi sotto, o per classe e le materie sotto (`raggruppamentoDeiCorsi`). Da una pagina del Registro `scegliCorso` la sposta sul corso;
 * da fuori si apre la prima pagina del Registro sul corso scelto (restando
 * dov'è, una pagina di classe tornerebbe alle Classi).
 */
function vociDeiCorsi (gruppo: GruppoDiPagine): ElementoMenu[] {
  const attuale = corsoDelContesto()?.id
  const corsi = corsiDellAnnoAperto()
  const per = raggruppamentoDeiCorsi(corsi)
  const gruppi = new Map<string, ElementoMenu[]>()
  // Il colore del titoletto: della materia o della classe, quel che il titoletto nomina.
  const coloriDeiGruppi = new Map<string, string | undefined>()
  for (const corso of corsi) {
    const materia = nomeMateria(corso.materiaId)
    const classe = nomeClasse(corso.classeId)
    const titoletto = per === 'materia' ? materia || classe : classe
    coloriDeiGruppi.set(titoletto, per === 'materia'
      ? materiaPerId(corso.materiaId)?.colore
      : classePerId(corso.classeId)?.colore)
    const voci = gruppi.get(titoletto) ?? []
    voci.push({
      testo: (per === 'materia' ? classe : materia) || corso.titolo,
      simbolo: per === 'materia' ? 'classi' : 'libro',
      colore: coloreDiCorso(corso),
      accesa: corso.id === attuale,
      al: () => {
        if (gruppo.attivo) {
          scegliCorso(corso.id)
          return
        }
        entraNelGruppo(gruppo, { tipo: 'corso', id: corso.id },
          { corsoId: corso.id, filtroClasseId: corso.classeId, classeId: corso.classeId })
      },
    })
    gruppi.set(titoletto, voci)
  }
  return [...gruppi]
    .sort(([a], [b]) => confrontaNomi(a, b))
    .flatMap(([titoletto, voci]) => [
      {
        titolo: titoletto,
        simbolo: per === 'materia' ? 'libro' as const : 'classi' as const,
        ...(coloriDeiGruppi.get(titoletto) ? { colore: coloriDeiGruppi.get(titoletto) } : {}),
      },
      ...voci.sort((a, b) => confrontaNomi(testoDi(a), testoDi(b))),
    ])
}

function testoDi (elemento: ElementoMenu): string {
  return typeof elemento === 'object' && 'testo' in elemento ? elemento.testo : ''
}

/** Chiude il cassetto stretto senza cambiare la scelta della sidebar desktop. */
export function chiudiSidebarMobile (restituisciFuoco = true): boolean {
  if (!stretta.matches || !stato.sidebarMobile) return false
  imposta(false, restituisciFuoco)
  return true
}

/** Velo del cassetto: separato dalla navigazione, così copre anche la pagina. */
export function sfondoSidebar (): ReactNode {
  if (!stretta.matches || !sidebarAperta()) return null
  return <div className="sidebar__sfondo" aria-hidden="true" onClick={() => chiudiSidebarMobile()} />
}

function interruttoreSidebar (): ReactNode {
  // C'è solo se c'è qualcosa da aprire o chiudere. Il nome resta «Navigazione»
  // in tutti e due gli stati e lo stato lo dice `aria-expanded`; il gesto lo
  // dicono il suggerimento e l'icona.
  if (sidebarCostretta()) return null
  const aperta = sidebarAperta()
  const t = testi()
  return (
    <button
      type="button"
      className="barra-comandi__tendina sidebar__interruttore"
      data-fuoco="apri-navigazione"
      aria-label={t.navigazione}
      title={aperta ? t.riduci : t.espandi}
      aria-expanded={aperta}
      aria-controls="navigazione-laterale"
      onClick={() => imposta(!sidebarAperta())}
    >
      {/* Ridotta, il pulsante porta il quaderno del registro in cima alla striscia
          delle icone; aperta, la freccia per ridurla. */}
      {aperta ? <Icona nome="sidebarRiduci" /> : <Icona nome="libro" classe="sidebar__segno" />}
    </button>
  )
}

/**
 * Il suggerimento di una voce: il nome, perché non si può o a che cosa serve,
 * e in coda la scorciatoia come in `commandBar.ts`. Il numero è la posizione
 * fra le voci visibili, la regola di Ctrl+1…9 in `shortcuts.ts`.
 */
function suggerimentoDi (pagina: Pagina): string {
  const posto = gruppiDiPagine().flatMap((gruppo) => gruppo.pagine).indexOf(pagina)
  const tasto = posto >= 0 && posto < 9 ? `(${testi().scorciatoia(posto + 1)})` : null
  const spiegazione = [pagina.impedimento?.() ?? pagina.aiuto, tasto].filter(Boolean).join(' ')
  return spiegazione ? `${pagina.titolo} — ${spiegazione}` : pagina.titolo
}

/** Il titolo di un gruppo: le sue righe, o la tendina che sceglie di che cosa sono le pagine. */
function titoloDelGruppo (gruppo: GruppoDiPagine): ReactNode {
  if (gruppo.gruppo === 'registro' || gruppo.gruppo === 'progettazione') {
    return <span className="sidebar__titolo-riga">{gruppo.nome}</span>
  }
  if (gruppo.gruppo === 'classe' && classiDiCuiSonoDocente().length > 1) {
    // testo-fisso: chiave di fuoco
    return titoloCheSceglie(gruppo.righe, testi().cambiaClasse, 'sidebar-classe', () => vociDelleClassi(gruppo))
  }
  return gruppo.righe.map((riga, i) => <span key={i} className="sidebar__titolo-riga">{riga}</span>)
}

function vocePagina (pagina: Pagina): ReactElement {
  const conto = pagina.conto?.() ?? 0
  return (
    <button
      key={pagina.id}
      type="button"
      className="sidebar__pagina"
      data-fuoco={pagina.id}
      aria-label={pagina.titolo}
      aria-current={pagina.attiva() ? 'page' : undefined}
      aria-disabled={Boolean(pagina.impedimento?.())}
      title={suggerimentoDi(pagina)}
      onClick={() => {
        vaiA(pagina)
        if (!pagina.impedimento?.()) chiudiSidebarMobile()
      }}
    >
      <Icona nome={pagina.simbolo} classe="icona--minuta" />
      <span>{pagina.titolo}</span>
      {/* Il conto in coda, solo se maggiore di zero. */}
      {conto > 0 ? <span className="sidebar__conto">{String(conto)}</span> : null}
    </button>
  )
}

export function sidebar (): ReactElement {
  const t = testi()
  const corso = corsoDelContesto()
  return (
    <aside
      id="navigazione-laterale"
      className={classi('sidebar', !sidebarAperta() && 'sidebar--compatta')}
      // Lo scorrimento resta al ridisegno (`ricordaScorrimenti` in `focus.ts`).
      data-scorrimento="sidebar"
      data-telaio="sidebar"
      onKeyDown={(evento) => {
        if (evento.key === 'Escape') {
          evento.preventDefault()
          chiudiSidebarMobile()
        }
      }}
    >
      {/* L'intestazione resta ferma in cima e porta l'interruttore: lo si cerca sulla navigazione. */}
      <div className="sidebar__marchio">
        <Icona nome="libro" classe="sidebar__logo" />
        <div><strong>{t.registro}</strong><small>{t.spazioDocente}</small></div>
        {interruttoreSidebar()}
      </div>
      <nav className="sidebar__pagine" aria-label={t.principale}>
        {/* La classe del gruppo manda «sistema» (Impostazioni, Guida) in fondo alla
            colonna (`sidebar.css`). */}
        {gruppiDiPagine().map((gruppo) => (
          <Fragment key={gruppo.gruppo}>
            {gruppo.gruppo === 'registro'
              ? (
                  <div className="sidebar__titolo sidebar__corso">
                    {titoloCheSceglie(
                      [corso ? nomeDelCorso(corso) : t.cambiaCorso],
                      t.cambiaCorso, 'sidebar-corso',
                      () => vociDeiCorsi({ ...gruppo,
                        attivo: gruppiDiPagine().some((g) =>
                          g.pagine.some((p) => p.id.startsWith('pagina.corso.') && p.attiva())),
                      }),
                    )}
                  </div>
                )
              : null}
            <section className={classi('sidebar__gruppo', `sidebar__gruppo--${gruppo.gruppo}`)}>
              {/* Il titolo lungo («Registro — DIC4a», a capo «Matematica») dice di quale
                  corso sono le pagine; una riga che non ci sta si accorcia, intera nel suggerimento. */}
              <h2 className="sidebar__titolo" title={gruppo.titolo}>{titoloDelGruppo(gruppo)}</h2>
              {gruppo.pagine.map(vocePagina)}
            </section>
          </Fragment>
        ))}
      </nav>
    </aside>
  )
}
