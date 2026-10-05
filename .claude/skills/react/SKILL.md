---
name: react
description: Come si scrive un pezzo d'interfaccia di Regiklass in React (ADR-56): la radice ridisegnata tutta a ogni cambio di stato, lo stato letto da `stato` durante il disegno, i campi con `change` del browser e valore che entra solo senza fuoco (`Input`, `Select`, `TextArea` di `ui/fields.tsx`), le modali (`ui/components/modal.tsx`), le isole (`<Isola>`), i componenti pronti di `ui/components/`, i tranelli (`onChange` di React, `onFocus` che sale, chiavi delle liste, due clic nello stesso giro, campi nascosti). Da usare ogni volta che si tocca un file di `ui/`, `core/controlli/` o `desktop/shell/pages/` che disegna, o si parla di componenti, JSX, hook o React.
---

# Interfaccia in React

Il perché: ADR-56 in `docs/DECISIONI.md`; i cambi di comportamento della
conversione ancora da confermare: `docs/PIANO-REACT.md`; la conversione stessa
sta nella storia di git. Qui: come si scrive.

## Come gira

- **Una radice, disegnata tutta a ogni cambio di stato** (`ui/main.tsx`):
  `flushSync(radice.render(<Fotografo><Guscio/></Fotografo>))`. Ogni
  componente si ridisegna a ogni `aggiorna`/`vai`/`ridisegna()` (ADR-06).
  Fuoco e scorrimenti li fotografa e rimette `Fotografo`
  (`data-fuoco`, `data-scorrimento`): **tenere quegli attributi**.
- **Lo stato si legge da `stato` durante il disegno.** Non copiarlo
  in `useState`: si scrive con `aggiorna`, `vai`, `azione`, `invia`.
- **Stato locale di vita uguale a prima.** Una `let` di modulo che sopravvive
  quando si cambia pagina (la ricerca delle persone, gli scaricamenti in coda)
  resta di modulo, con `ridisegna()` dopo averla cambiata: `useState` la
  azzererebbe lasciando la pagina, ed è un cambio di comportamento (D2). Quel
  che prima viveva **nel DOM** (una bozza aperta, un menu, un'attesa sul
  pulsante, il contenuto di una modale rifatto con `rimpiazza`) diventa
  `useState`/`useReducer`/`useRef` del componente.
- **Le viste** (`vistaOggi()` …) tornano `<VistaOggi />`: `ui/shell.tsx` le
  chiama dal suo `switch`. Le sotto-viste usate da più pagine tengono la forma
  di funzione minuscola che torna `ReactNode`, senza hook dentro.

## Da `h()` a JSX (per leggere il codice di prima)

| Prima | Dopo |
| --- | --- |
| `h('div', { class: ['a', c && 'b'] })` | `<div className={classi('a', c && 'b')}>` (`#ui/classNames.js`) |
| `dataset: { fuoco: x, chiave: y }` | `data-fuoco={x} data-chiave={y}` |
| `attr: { role, 'aria-label': t, tabindex: 0, colspan: 2, for: id }` | `role={…} aria-label={t} tabIndex={0} colSpan={2} htmlFor={id}` |
| `attr: { 'aria-pressed': false }` (scritto anche a `false`) | `aria-pressed={false}` (React lo scrive) |
| `style: { width: '3px', '--x': v }` | `style={{ width: '3px', '--x': v } as CSSProperties}` |
| `style: 'a: b'` (stringa) | oggetto: React non accetta stringhe |
| `onclick`, `onkeydown`, `oncontextmenu`, `oninput`, `onpointerdown`… | `onClick`, `onKeyDown`, `onContextMenu`, `onInput`, `onPointerDown`… |
| `onchange` su testo, data, numero, textarea | **`<Input onCambio>`**, `<TextArea onCambio>` (`#ui/fields.js`): `change` del browser |
| `onchange` su `select`, casella | `<Select onCambio>`, `<Input type="checkbox" onCambio>` |
| `value: v` su un campo | `<Input valore={v}>` (`TextArea`, `Select` uguale) |
| `checked: b` | `<Input type="checkbox" spuntato={b}>` |
| `svg(vista, tracciato, classe)` | `<Svg vista contenuto classe />` (`#ui/svg.js`) |
| `icona('x', 'c')` | `<Icona nome="x" classe="c" />` |
| `isola(chiave, () => …, attr)` | `<Isola chiave={…} disegna={() => …} {...attr} />` (`#ui/island.js`) |
| `gruppo(a, b)` | `<>{a}{b}</>` |
| `Figlio` | `ReactNode` |
| `gestisci(el, 'keydown', f)` | `onKeyDown={f}` sull'elemento |
| `document.querySelector` sul proprio pezzo, `rimpiazza`, `classList` | `useRef` + stato |
| `addEventListener` su `window`/`document`, observer, timer | `useEffect` con la pulizia |

### Tranelli

- **`onChange` di React parte a ogni tasto.** Per i campi di testo si usa sempre
  `onCambio` dei campi di `ui/fields.tsx`: chi salva a ogni `change` salverebbe
  a ogni lettera. `onChange` di React è vietato sui campi di testo.
- **Campi controllati vietati.** `<input value={x}>` senza i nostri campi
  riporterebbe il valore indietro a ogni tasto. `Input`/`Select`/`TextArea`
  portano dentro il valore dello stato solo quando cambia e il campo non ha il
  fuoco, come faceva il disegno di prima.
- **`onFocus`/`onBlur` di React salgono** (come `focusin`). Un `onfocus` di prima
  messo su un contenitore partiva solo per lui: si controlla
  `evento.target === evento.currentTarget`.
- **`currentTarget`** è l'elemento del gestore, come prima. `evento.nativeEvent`
  quando una funzione vuole l'evento del browser (`menuContestuale(evento.nativeEvent, …)`).
- **Chiavi delle liste**: ogni `.map()` che torna elementi ha `key` stabile (l'id,
  non l'indice, salvo liste fisse). Una chiave sbagliata riusa il nodo di
  un'altra voce: fuoco, campi e iframe saltano sulla voce accanto.
- **Campi nascosti senza `defaultValue`.** React riscrive `defaultValue` a ogni
  disegno, e in un `<input type="hidden">` `defaultValue` è il valore: quel che
  un gestore ci ha scritto (`scriviData`) torna indietro. Il valore iniziale si
  mette con un effetto al montaggio (`ControlloData`).
- **Due gesti nello stesso giro.** React applica lo stato di un clic in un
  microtask: due clic di fila (o un clic e una tastiera simulata) vedono
  tutti e due lo stato di prima. Chi calcola il valore nuovo da quello vecchio
  (scelte multiple, contatori, caselle in volo) tiene l'ultimo in un `useRef`
  aggiornato nel gestore, e lo stato solo per il disegno.
- **Hook solo in un componente** (`PascalCase`, usato come `<X />`), mai in una
  funzione chiamata come `x()`. Le funzioni minuscole che tornano JSX vanno
  bene, senza hook dentro.
- **Il disegno è puro**: niente `invia`, `aggiorna`, iscrizioni o timer nel
  corpo del componente; vanno in un gestore o in un `useEffect`.
- **Nodi pesanti** (iframe, canvas, visore PDF, mappa): un componente con
  `key` = la sorgente. React non lo ricrea finché la chiave resta; un iframe
  spostato sotto un altro genitore si ricarica, quindi la struttura attorno
  resta fissa.
- **`data-telaio`** resta dov'era (le prove lo leggono). La radice di una vista
  porta `data-telaio={telaioVista()}` (`#ui/viewFrame.js`), salvo le viste che
  se ne danno uno loro (il calendario).
- **Niente `dangerouslySetInnerHTML`** (eslint): i tracciati SVG passano da `<Svg>`.
- **Testi**: solo dai cataloghi (`testi()`, `parole()`, `lessico()`), letti
  dentro il componente. Un testo libero fra i tag lo trova `npm run i18n`.

## I componenti pronti (`ui/components/`)

Stessi nomi delle fabbriche di prima, con la maiuscola; le opzioni sono le
proprietà. `al` dei pulsanti riceve l'evento di React (`currentTarget` è il
pulsante); se torna una promessa il pulsante resta occupato con la rotella.

| Prima (fabbrica con `h()`) | Adesso (`ui/components/*.tsx`) |
| --- | --- |
| `pulsante({ … })` | `<Pulsante … fuoco="chiave" />` (più ogni attributo di `<button>`) |
| `collegamento({ testo, al })` | `<Collegamento testo al />` |
| `selettore(valore, voci, al, etichetta)` | `<Selettore valore voci al etichetta />` |
| `campo({ … })` | `<Campo … />` (in una modale id e fuoco unici da sé) |
| `controlloData`, `dataInLinea`, `tendina` | `<ControlloData>`, `<DataInLinea>`, `<Tendina>` |
| `quieto(…)`, `riga(…)`, `sezioneModulo(t, …)` | `<Quieto>…</Quieto>`, `<Riga>`, `<SezioneModulo titolo>` |
| `pastiglia(t, tono, simbolo)` | `<Pastiglia testo tono simbolo />` |
| `titoloGruppo`, `puntoColore`, `datoSintetico`, `barra` | `<TitoloGruppo>`, `<PuntoColore>`, `<DatoSintetico>`, `<Barra>` |
| `scheda({ … contenuto })`, `statoVuoto`, `testataVista` | `<Scheda … contenuto>` (o figli), `<StatoVuoto>`, `<TestataVista>` |
| `avviso(testo, tono)` | `<Avviso tono>{testo}</Avviso>` |
| `suggerimento(testo, { etichetta })` | `<Suggerimento testo etichetta />` |
| `apriModale`, `conferma`, `chiudiTutte` | stessi nomi da `modal.js`; `corpo` e `azioniSecondarie` tornano JSX e si chiamano **una volta** |

Le funzioni pure (`valoriModulo`, `quantoMisura`, `tonoPresenza`,
`conAttesa`) e le chiamate imperative che prendono dati (`notifica`,
`menuContestuale`, `menuSotto`, `apriPalette`, `notificaAnnullabile`) si usano
così come sono.

### Le modali

- `corpo(contesto)` si chiama una volta: quel che cambia dentro (una sezione che
  compare, un avviso «somiglia a…») è un componente col suo stato, non un
  `rimpiazza`.
- I valori si leggono come prima, dal DOM per `name` (`valoriModulo`): campi
  non controllati, col valore iniziale in `valore`.
- `contesto.corpo` esiste dal primo disegno in poi: non usarlo mentre si disegna.
- Tutte le modali stanno in una pila (Escape, Tab, `chiudiTutte` al cambio
  di documento).

## Comportamenti da non perdere

Toccando il guscio, lo stato o un pezzo condiviso, queste prove dicono se un
comportamento trasversale è rimasto. Una prova da cambiare è un comportamento
cambiato (D2): si cambia solo per un dettaglio d'implementazione, col motivo
nel commit.

| Comportamento | Dove vive | Prova |
| --- | --- | --- |
| Posto, `vai`, `completa`, ripieghi | `ui/place.ts`, `ui/state.ts` | `tests/ui/posto.test.mjs` |
| Storia indietro/avanti con scorrimenti | `ui/history.ts` | `navigation`, `movimento` |
| Memoria per documento | `ui/memory.ts` | `tests/ui/memoria.test.mjs` |
| Segnalibri di scorrimento | `ui/bookmark.ts` | `tests/ui/segnalibri.test.mjs` |
| Scorciatoie (Alt+frecce, Ctrl+K/B/Z/Y/1…9, tasti del mouse) | `ui/shortcuts.ts` | `settingsKeyboard`, `navigation`, `gesti` (annulla e ripristina) |
| Clic in volo (pulsante spento, `aria-busy`) | `ui/commandBar.tsx`, `ui/components/inFlight.ts` | `clicInVolo`, `check` |
| Differenze dall'host, stato intero al buco | `ui/statePatches.ts` | `tests/ui/statePatches.test.mjs`, `tests/panels/stateDifferences.test.mjs` |
| Cambio documento: modali chiuse, storia azzerata, posto ripristinato | `ui/main.tsx` `ricevoStato` | `informazioniDocumento` |
| Orologio: riga di adesso al minuto, giorno nuovo senza rompere un trascinamento | `ui/clock.ts`, `avviaOrologio` in `ui/state.ts` | `tests/ui/aggiorna.test.mjs` |
| Mira della proiezione e contesto dell'assistente a ogni cambio di posto | `ui/main.tsx` (iscritti) | `gesti` |
| Rete in linea/fuori linea | `avviaRete` in `ui/state.ts` | `gesti` |
| Quattro lingue | cataloghi `*.testi.ts` | `lingue`, `npm run i18n` |
| Chiaro/scuro, contrasto | `ui/styles/theme.css` | `accessibility`, `calendarContrast`, `themeChoice` |
| Modali: Esc, Tab dentro, Invio, pila, errori dell'host | `ui/components/modal.tsx` | `modalErrors`, `modaleOccupata`, `moduli` |
| Finestre virtuali (voti, archivio, persone) | `ui/components/virtualList.tsx` | `misure`, `persone`, `tabelle` |
| Iframe e PDF che non si ricaricano, cursore e scorrimento che restano | `key` = sorgente, struttura fissa | `stabilita`, `riquadri`, `documentiRiquadri`, `sfoglioIsole` |
| Animazione d'entrata della pagina | `segnaEntrata` in `ui/main.tsx` | `telaioVista` |
| CSP `default-src 'none'` | `desktop/pannelli/page.ts` | nessun `eval`, `style={}` dal CSSOM, nessun `<style>` iniettato |

I nomi senza percorso sono spec di `tests/interfaccia/`.

### Dove si rompe più facilmente

- **Prestazioni.** Ogni `aggiorna` ridisegna tutto l'albero: una vista pesante
  si tiene sotto le soglie di `tests/interfaccia/misure.spec.ts` (ridisegno
  ≤ 50 ms o ≤ 3× la tabella corta). Se non basta, selettori memoizzati per
  collezione: il registro cambia identità solo dove immer l'ha toccato.
- **Niente API concorrenti** (`startTransition`, `Suspense` per i dati) finché
  `derivato()` di `ui/state.ts` sostituisce `stato.registro` con un Proxy
  durante il calcolo: regge solo con un disegno sincrono.
- **La firma** (`ui/views/settings/signature.tsx`) è `contenteditable` non
  controllato: ref e sanificazione all'uscita, mai il valore riscritto da React.
- **Trascinamenti** (ore, pagine, loghi): puntatore catturato in un effetto e
  ascoltatori nativi sul nodo con ref, non eventi sintetici.

## Scrivere un file

1. JSX solo nei `.tsx`; un file senza JSX resta `.ts`. Import con l'alias
   dello strato (`#ui/…`, ADR-55).
2. Componenti da `#ui/components/…`, campi da `#ui/fields.js`, isole da
   `#ui/island.js`, chiave di telaio della vista da `#ui/viewFrame.js`.
3. Commenti: il perché, non il come.
4. Controlli: `npx tsc --noEmit`, `npx eslint --fix <file>`,
   `node tools/i18n.mjs --elenco <file>`; le prove sull'app vera con
   `npm run ui-tests` (o, dopo `node esbuild.mjs --ui`, una spec sola:
   `npx playwright test -c tests/interfaccia/playwright.config.ts <nome>`).
