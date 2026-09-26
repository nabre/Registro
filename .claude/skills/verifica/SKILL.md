---
name: verifica
description: >
  Il rituale di verifica di Regiclass: i tre controlli d'obbligo
  (`npx tsc --noEmit`, `npx eslint .`, `npm test`) e gli otto controlli statici
  fatti in casa (`layers`, `census`, `collections`, `forms`, `buttons`,
  `procedures`, `docs`, `i18n`) — che cosa guarda ognuno, come si legge la sua uscita, che cosa
  è un guasto e che cosa è solo «da guardare a mano», e in che ordine si
  ricostruisce quando qualcosa non torna. Da usare prima di spuntare una
  casella in `docs/CANTIERE.md`, prima di un commit, dopo ogni rimozione di
  codice o spostamento di file, e ogni volta che si chiede «è verde?», «le
  prove passano?», «ho rotto qualcosa?», «posso committare?».
---

# Verificare il registro

La regola sta in testa a `docs/CANTIERE.md` e non è negoziabile: **una casella
si spunta quando il lavoro è fatto e verificato.** Verificato vuol dire questi
comandi, in quest'ordine, tutti verdi. Non «probabilmente verde»: eseguiti.

`.github/workflows/verifica.yml` li esegue tutti a ogni push e a ogni PR, con
`npm ci`. Girano su `windows-latest` perché il registro è un'applicazione
Windows e `node-llama-cpp` porta binari nativi montati per percorso.

## I tre d'obbligo

```sh
npx tsc --noEmit     # i tipi. Nessuna uscita = verde
npx eslint .         # lo stile. 0 errori; gli avvisi si contano, non fermano
npm test             # le prove. `pretest` ricostruisce `dist-tests/` da sé
```

**`eslint` ha degli avvisi di riga lunga e non sono un guasto** — sono
`@stylistic/max-len` a 100 colonne. Quel che ferma è la riga «✖ N problems (E
errors…)» con `E > 0`. Un avviso nuovo in un file che si è toccato si corregge
comunque: il conteggio deve scendere, mai salire.

**`npm test` stampa il numero vero delle prove** — `# pass` e `# fail` in fondo.
Il numero cresce e va bene; `# fail 0` è l'unica riga che conta. Le prove
leggono i bundle di `dist-tests/`, che `npm run pretest` costruisce: lanciare
`node --test` a mano su una copia appena scaricata non prova niente.

## Gli otto controlli statici

Non sono un extra. Sono il modo in cui il progetto verifica le **proprie**
regole d'architettura, quelle che nessun compilatore conosce. Nessuno di questi
gira dentro `npm test`.

| Comando | Guarda | Esce rosso quando |
| --- | --- | --- |
| `npm run layers` | ogni `import` contro i confini di `docs/IMPIANTO.md` | un import attraversa un confine, o nasce un ciclo |
| `npm run census` | gli export che nessuno consuma | — mai: **stampa e basta**, si legge |
| `npm run collections` | che ogni `modifica()` di `src/actions/` e `src/data/` dichiari i JSON che riscrive | una collezione toccata non è dichiarata |
| `npm run forms` | che ogni `campo({nome})` sia raccolto da `alSalva` | un nome dichiarato e mai raccolto |
| `npm run buttons` | i comandi disegnati senza `al` | un pulsante che non fa niente |
| `npm run procedures` | percorso = nome, file nell'indice, indice registrato | una procedura non arriva a `src/api/index.ts` |
| `npm run docs` | che docs e skill citino script e file che esistono | uno script citato o un percorso fra backtick che non c'è |
| `npm run i18n -- --severo` | testi per chi usa il registro fuori da un catalogo `*.testi.ts`, grammatica italiana fuori dai cataloghi italiani, cataloghi letti a livello di modulo nel main process (ADR-38, skill `testi`) | resta un reperto; senza `--severo` solo per il terzo |

### Come si leggono le uscite «da guardare a mano»

Tre di questi strumenti hanno una seconda sezione, sotto il verdetto, che **non
è un guasto**: sono i casi che lo strumento non sa decidere, perché leggono il
testo e non eseguono il programma. Vanno letti, non temuti.

- **`collections`** — `passa il registro a X: l'elenco dichiarato va verificato a
  mano`. Succede quando un gestore passa l'oggetto `Registro` intero a una
  funzione: da lì lo strumento non vede più che cosa si tocca. Si controlla
  aprendo quella funzione. Alla data dell'ultima verifica erano otto, tutti
  chiusi e giustificati.
  `elenco non riconosciuto` è diverso: là lo strumento non ha proprio capito la
  forma dell'elenco, e vale la pena guardare. Il caso noto è
  `actions/system.ts` su `manutenzione.ripara`, che calcola le sue collezioni
  con un `flatMap` sulle riparazioni trovate: sono quelle vere, ma si conoscono
  solo quando il programma gira.
- **`forms`** — `valori passato intero a un'altra funzione`. Due casi noti,
  `forms/absences.ts` e `forms/classTeacher.ts`: falsi positivi verificati nel
  giro 2, lo strumento non sa seguire `valori` passato tutto insieme.
- **`buttons`** — `filtro o campo di vista senza al`. Un campo di ricerca che
  agisce alla digitazione, non al clic. Quattro casi noti.

Un caso nuovo in queste sezioni **va guardato**: è lo strumento che dice «qui
non arrivo», e il giorno in cui uno di quei casi è un guasto vero ha esattamente
questa faccia.

### Il censimento e la regola D6

`npm run census` elenca gli export che nessuno nomina fuori dal loro file.
La decisione D6 di `docs/CANTIERE.md` dice che cosa farne, e va rispettata:

> Un export senza consumatori esterni **non si cancella se è vivo**: si rende
> interno. Si cancella solo quel che nessuno chiama, e solo dopo che una prova
> ha confermato che nessuno lo chiama.

«Interno» vuol dire togliere `export`, non togliere il codice. La distinzione la
fa lo strumento stesso, contando le citazioni in casa propria.

## Quando qualcosa non torna

L'ordine conta, perché il sospetto più comune è il più economico da escludere.

1. **Sono i bundle vecchi?** `npm run clean` rimette `dist/` e
   `dist-tests/` allo stato di partenza. Succede quando il modo sviluppo è
   morto a metà costruzione.
2. **È una prova che legge il sorgente?** Alcune prove — `tests/api/coverage.test.mjs`,
   `tests/api/writes.test.mjs`, `tests/ui/settingsSections.test.mjs` — non provano
   il comportamento: leggono il testo dei file e contano. Falliscono quando si
   **aggiunge** qualcosa di legittimo, e allora è la prova che va aggiornata,
   con il nuovo conteggio scritto a mano.
3. **È un conteggio nelle docs?** `docs/INDICE.md` porta i numeri veri (azioni,
   procedure, comandi, viste, entità) e dice che si ricontano, non si ricordano.
   `npm run procedures` stampa quante ce ne sono e **legge il testo senza
   compilare**: risponde anche quando `tsc` non passa.
4. **È un artefatto generato?** Quattro file non si scrivono a mano:
   `resources/tools.json` (`npm run tools`),
   `src/data/defaultTemplates.ts` (`npm run templates`),
   `src/data/schoolCalendarTicino.ts` (`npm run calendario`),
   `tests/samples/2026-2027.regi` (`npm run sample`).
   Se il diff li tocca senza che nessuno li abbia rigenerati, il difetto è a
   monte.

## La forma breve

Prima di dire «fatto», questa riga, e si legge la fine di ognuna:

```sh
npx tsc --noEmit && npx eslint . && npm test && npm run layers && npm run collections && npm run forms && npm run buttons && npm run procedures && npm run docs && npm run i18n -- --severo && npm run census
```

In PowerShell `&&` non esiste: si usa il Bash tool, oppure si separano con `;`
e si guarda ogni uscita.

## La CI in locale, prima di spingere

```sh
npm run ci                    # tutti i lavori di .github/workflows/verifica.yml
npm run ci -- --solo verifica # solo i controlli; --solo interfaccia per le prove UI
```

`tools/ci.mjs` legge **lo stesso** `verifica.yml` che GitHub esegue e ne lancia
i passi `run:` di una riga, con i loro nomi, fermandosi al primo rosso. Salta
`npm ci` e le installazioni a più righe (Python, Chromium). Un passo aggiunto al
workflow si esegue anche qui senza toccare niente.

Due cose che la forma breve qui sopra non vede e la CI sì:

- **il codice d'uscita di `npm test`**: con `# fail 0` ma prove *cancellate*
  Node esce con 1, e la CI è rossa. Si legge anche `# cancelled`;
- **le prove dell'interfaccia** (`npm run ui-tests`): leggono i testi e i nomi
  accessibili dei pulsanti. I bundle che caricano li costruisce una volta
  `node esbuild.mjs --ui`, lanciato da `tools/uiTests.mjs`: una prova Python
  lanciata a mano vuole prima quel comando. Cambiare l'etichetta di una voce di menu rompe una
  prova Python che nessun `tsc` vede.
