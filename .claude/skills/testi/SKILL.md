---
name: testi
description: >
  Come si scrive, si traduce e si legge un testo di Regiclass nel
  dispositivo multilingua (ADR-38): i cataloghi `*.testi.ts` accanto al codice,
  le quattro lingue (it, de, fr, en) una sotto l'altra, `catalogo()`, `lessico()`,
  `parole()`, le frasi come funzioni, la regola «mai a livello di modulo», e
  `npm run i18n` che trova quel che resta scritto a mano. Da usare ogni volta
  che si aggiunge o si cambia una parola che una persona legge — un'etichetta,
  un messaggio d'errore, un titolo di PDF, una frase della guida, il prompt
  dell'assistente — o si parla di lingue, traduzioni, multilingua, i18n,
  «in tedesco», «in inglese», impostazione della lingua.
---

# I testi del registro

Quattro lingue: **it** (fonte, predefinita, ripiego), **de**, **fr**, **en**.
Lingua scelta in `registroDocenti.aspetto.lingua` (`sistema` = prima lingua di
Windows se nota, altrimenti it). Una lingua per processo, `src/i18n/state.ts`.

## Dove sta un testo

**Accanto al codice che lo usa**, in `<file>.testi.ts`:
`views/absences.ts` → `views/absences.testi.ts`. Un catalogo per file sorgente
(o per piccolo gruppo di file dello stesso tema). Le quattro lingue nello stesso
file, una sotto l'altra.

```ts
import { catalogo } from '../../i18n/index.js'
import { PIF, del, frase } from '../../domain/lexicon.js'   // SOLO nel blocco `it`
import { plurale } from '../../domain/text.js'

const it = {
  titolo: 'Assenze',
  righe: (n: number) => plurale(n, 'riga', 'righe'),
  nonTrovata: frase(PIF, 'trovato', { nega: true }),       // «Persona in formazione non trovata.»
  firmaDi: (nome: string) => `Firma ${del(PIF)} ${nome}`,
}

export const testi = catalogo(it, {
  de: { titolo: 'Absenzen', righe: (n) => plurale(n, 'Zeile', 'Zeilen'), nonTrovata: '…', firmaDi: (nome) => `…` },
  fr: { … },
  en: { … },
})
```

Nel file che lo usa, **al momento dell'uso**:

```ts
import { testi } from './absences.testi.js'
…
function vista (): Figlio {
  const t = testi()
  return h('h2', null, t.titolo)
}
```

## Regole

1. **Mai a livello di modulo — fuori dalle pagine.** Nel main process e nel
   codice che ci finisce (`src/domain`, `src/data`, `src/actions`, `src/api`,
   `src/environment`, `shell/` tranne `shell/pages/`) `const TITOLO =
   testi().titolo` in cima a un file si calcola prima che il processo scelga la
   lingua → resta italiano. Lì si legge dentro funzioni; costanti con testo →
   funzioni (`vociGiornoSettimana()`) o getter pigri (`comando()` in
   `src/manifest.ts`). `npm run i18n` lo segnala con `!!` e fa fallire.
   **Nelle pagine (`src/ui/`, `shell/pages/`) una costante di modulo va bene**:
   `src/i18n/page.ts` è il primo import e sceglie la lingua prima che il resto
   si carichi, e al cambio lingua la pagina si ricarica. Quindi `GUIDA`,
   `SEZIONI_PROGRAMMA` & co. restano costanti con lo stesso nome — le prove le
   importano così. Attenzione: un modulo di `src/domain/` importato da una
   pagina gira **anche** nel main process — lì la regola dura vale.
2. **L'italiano resta identico, carattere per carattere.** Le prove sono scritte
   in italiano e devono restare verdi **senza toccarle** (D2). Spostare un testo
   nel catalogo non cambia una virgola dell'italiano.
3. **Compilatore = completezza.** `catalogo(it, {de, fr, en})` vuole in ogni
   lingua le stesse chiavi e gli stessi tipi dell'italiano. Chiave dimenticata
   → non compila. Non esiste ripiego silenzioso.
4. **Frasi con dati = funzioni** con argomenti tipizzati, non modelli `{n}`.
   Ogni lingua fa plurale, articoli, accordi a modo suo dentro la sua funzione.
   Nelle traduzioni i parametri si inferiscono (`(n) => …`).
5. **Grammatica italiana solo nel blocco `it`.** `il`, `del`, `al`, `un`,
   `accorda`, `frase`, `PIF`, `UD`, `PERSONE`, `VOCI_PRESENZA`, `TIPI_*`… da
   `domain/lexicon.ts` compongono italiano. Fuori da `const it = {…}` di un
   catalogo sono un errore: `npm run i18n` li conta come «lessico».
6. **Termini in ogni lingua: `lessico()`** (`src/domain/lexicon.testi.ts`).
   `Uno(lessico().pif)`, `Molti(L.classe)`, `corto(L.unitaDidattica)`,
   `quanti(n, L.lezione)`, `L.tipiAttivita[tipo]`, `L.presenze[stato]`.
   `Uno`, `Molti`, `corto`, `quanti`, `Maiuscola` sono **neutre**: si usano
   ovunque. Sigle appello: `SIGLE_PRESENZA` (non si traducono).
7. **Parole comuni: `parole()`** (`src/domain/words.testi.ts`) — Salva,
   Annulla, Chiudi, Togli, Butta via, Sì/No, Oggi, Stato, Tipo, Dal/Al…
   Pulsanti ed etichette generici usano quelle, **mai una copia locale**: la
   prova `tests/i18n/words.test.mjs` fallisce su una voce che ne ricopia una.
   Quando usarla e quando no: sezione «Parole comuni» qui sotto.
8. **Date e numeri.** Giorni/mesi: `giorniBrevi()`, `giorniLunghi()`, `mesi()`,
   `inizialiGiorno()`, `siglaUd()` da `domain/dates.ts`. `formattaData` segue
   già la lingua. Numeri: `numero()` da `src/i18n`. Istanti (copie, orari
   serratura): `istante(date, opzioni)` al posto di `toLocaleString('it-CH')`.
   Minuscole di ricerca: `minuscolo()`. Plurale: `plurale()` di
   `domain/text.ts` (segue la lingua) o `perNumero()`. Elenchi «a, b e c»:
   `elenco()`.
9. **Ordine dei nomi resta `'it'`** (`confrontaNomi`): finisce nel documento
   salvato, non deve cambiare con la lingua della macchina.
10. **Non si traduce:** identificatori, chiavi di impostazione, valori salvati
    nel documento (`'presente'`, `'scritto'`), nomi di cartelle su disco
    (`esportazioni/`, `versioni-precedenti/`), il marchio «Regiclass»,
    nomi di prodotti (Outlook, voicebox, GitHub), le sigle dell'appello, i log
    per chi sviluppa (`console.*`), i dati già scritti dal docente.
11. **Si traduce:** tutto quel che una persona legge — interfaccia, dialoghi,
    menu, notifiche, messaggi d'errore mostrati, PDF e loro nomi di file, e-mail
    generate, guida, prompt dell'assistente, descrizioni delle procedure che il
    modello legge.
12. **Eccezione esplicita:** una stringa che l'euristica prende per testo e non
    lo è (nome di tasto, argomento di un programma esterno) → sulla riga, o su
    quella sopra: `// testo-fisso: <perché>`. Il perché è obbligatorio.

## Parole comuni

`parole()` è il vocabolario di tutti: una parola sola, senza niente attorno,
che più pagine dicono **con lo stesso senso** — un tasto («Salva», «Annulla»,
«Togli», «Butta via», «Scegli…» che apre e «Scegli» che conferma), un titolo di
colonna o di campo («Data», «Tipo», «Stato», «Periodo», «Dal», «Al», «Chi»,
«Che cosa», «Aula», «Colore», «Indirizzo», «E-mail»), una parola di filtro
(«Tutti», «Tutte», «Con», «Senza», «Immagini»).

```ts
import { parole } from '../../domain/words.testi.js'   // anche da shell/pages/
…
h('button', { onclick: togli }, parole().togli)
```

**Si usa `parole()`** quando la parola è la stessa nelle quattro lingue di
un'altra già detta altrove — anche nelle figure della guida, che disegnano i
tasti del pannello: la figura deve dire quel che dice il tasto.

**Non si usa** — la voce resta nel catalogo locale — quando:

- **è un omonimo**: stesso italiano, un'altra cosa. «Annulla» che disfa un
  gesto (Rückgängig/Undo) non è «Annulla» che chiude (Abbrechen/Cancel);
  «Modifica» del menu è Édition; «Nome» di una classe o di un'azienda non è il
  nome di battesimo (Vorname); «Ora» di lezione non è l'ora del giorno;
  «Fatto» di un impegno sbrigato è Erledigt. Va dichiarato in `OMONIMI` di
  `tests/i18n/words.test.mjs`, con il perché;
- **è dentro una frase**: «Togliere le 2 ore?» non è «Togli». Le frasi stanno
  nel catalogo di chi le dice, dove si declinano;
- **è minuscola in mezzo a una riga** («oggi», «ieri» dentro una frase fatta a
  pezzi): è un'altra parola per ogni lingua che ha le maiuscole diverse;
- **è un termine del registro** («Classe», «Corso», «Lezione», «Valutazioni»):
  quelli sono di `lessico()`;
- **è il nome di un comando** («Nuova classe», «Apri un anno…»): è del
  manifesto e dei comandi;
- **è il termine di una voce di glossario della guida** (`voci[n].termine`):
  sta con la sua spiegazione.

**Una parola ripetuta che `parole()` non ha** (la stessa, con le stesse
traduzioni, in tre cataloghi o più): si aggiunge a `words.testi.ts` nelle
quattro lingue, si tolgono le copie (`parole().x` nel codice), e la prova tiene
il posto. Due posti soli: meglio aspettare il terzo.

Le pagine che si riempiono dall'HTML (`data-testo="esci"` e `riempi(t)` in
`shell/pages/`) non vedono il compilatore: se si toglie una voce che l'HTML
nomina, la si passa a mano — `riempi({ ...t, esci: parole().esci })`.

## Tono delle traduzioni

**Il glossario vincolante sta in [glossario.md](glossario.md)**: termini, tono (du/tu/you), virgolette, nomi dei pulsanti citati. Prima di tradurre si legge quello.


Quello dell'italiano: discorsivo, concreto, seconda persona dove l'italiano la
usa, niente gergo tecnico se l'italiano non ne ha. Tedesco svizzero standard
(`ss` non `ß`, «du», «Lernende», «Lehrbetrieb», «Stunde» = lezione, «Lektion» = UD da 45′), francese
svizzero («personne en formation», «période», «branche»), inglese britannico
(«learner», «timetable», «maths»). Virgolette: it/fr «…» (fr con spazi: « … »),
de «…», en “…”. Apostrofo tipografico ’ dove l'italiano lo usa.

## Controllo

```sh
npm run i18n                          # riepilogo per file: quanto resta
npm run i18n -- --elenco src/ui/views # ogni reperto, con riga
npx tsc --noEmit && npx eslint <file> && npm test
```

`tests/i18n/catalogs.test.mjs` trova da sé ogni `*.testi.ts` (esbuild li
raccoglie in `dist-tests/i18n.mjs`) e controlla: stessa forma in ogni lingua,
nessun testo vuoto, nessuna frase rimasta in italiano (due parole solo-italiane
nella stessa traduzione = svista). `tests/i18n/words.test.mjs`, sugli stessi
cataloghi: nessuna copia di una parola di `parole()`, ogni omonimo dichiarato.

## Pagine

Ogni pagina importa per primo `src/i18n/page.ts`: prende la lingua dal preload
(`window.registroLingua`) e scrive `<html lang>`. Al cambio lingua il main
process ricarica tutte le finestre (`environment/language.ts`) e ridisegna menu
e icona accanto all'orologio (`alCambioLingua`).
