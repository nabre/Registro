---
name: prove
description: >
  Come si riduce e si rende più solida la suite di prove di Regiklass senza
  perdere garanzie: misurare prima di tagliare, un comportamento provato a un
  livello solo, prove generate dal contratto, proprietà al posto degli esempi,
  snapshot per i rapporti, regole ESLint al posto delle prove che leggono il
  sorgente. Da usare quando si chiede di «ridurre le prove», «ottimizzare i
  test», «togliere i test doppi», «accelerare npm test», di rivedere un file di
  `tests/`, o prima di aggiungere una prova nuova per capire dove va.
---

# Ottimizzare le prove

## Prima di tutto: che cosa è una prova

- **Prove**: `tests/**/*.test.mjs` (eseguite da `npm test` con `node:test` sui
  bundle di `dist-tests/`) e `tests/**/*.py` (Playwright, `npm run ui-tests`).
- **Non prove**: i file `*.testi.ts`. Sono i cataloghi dei **testi** in quattro
  lingue (ADR-38, skill `testi`). Non si toccano in questo lavoro, non si
  contano, non si «riducono».
- **Aiuti**: `tests/helpers/`. Non sono prove, ma un aiuto nuovo o cambiato
  cambia tutte le prove che lo usano: trattalo come codice di produzione.

## Lo scopo, detto esattamente

Meno righe di prova e meno casi **a parità di garanzie**. Le garanzie si
misurano, non si dichiarano:

1. **Copertura**: righe e rami coperti di `core/`, `contract/`, `desktop/`,
   `ui/` non scendono.
2. **Mutanti uccisi**: solo sui file sorgente per cui è stato fatto un
   controllo mirato con Stryker (facoltativo, vedi «Controllo mirato con
   StrykerJS»), il punteggio non scende.
3. **Invarianti degli ADR**: ogni invariante che oggi ha una prova ne ha ancora
   una dopo (anche se diversa). L'elenco è nella sezione «Prove protette».
4. **Tempo**: `npm test` non diventa più lento. Deve scendere.

Una riduzione che rispetta 1–4 è buona. Una riduzione che ne viola anche solo
una non si fa, per quanto sia grande.

## Regole non negoziabili

- **D2 vale anche qui.** Nessun cambiamento di comportamento del programma. Se
  per semplificare una prova sembra necessario cambiare codice di produzione,
  fermati e riferisci: non è questo il lavoro.
- **Non si indebolisce un'asserzione per farla passare.** Niente `deepEqual`
  trasformato in `ok`, niente valori attesi ricopiati dall'uscita attuale senza
  capirli, niente tolleranze allargate.
- **Non si cancella una prova rossa.** Una prova che fallisce prima del tuo
  intervento si segnala; non si toglie, non si salta, non si marca `todo`.
- **Niente `skip`, `only`, `todo` lasciati nel codice.** A fine lavoro
  `grep -rnE "\.(skip|only|todo)\(|\{ ?(skip|only|todo):" tests` non trova
  niente di nuovo.
- **Nessuna dipendenza nuova senza il permesso esplicito del docente in
  chat.** fast-check è quella prevista; StrykerJS solo se si fa il controllo
  mirato. Chiedile per nome, versione e licenza prima di `npm i -D`. Nessuna dipendenza di produzione.
- **Un tipo di intervento per commit.** «Prove API generate dal manifesto» è un
  commit; «snapshot dei rapporti» è un altro. Mai mescolati con cambiamenti al
  codice di produzione o spostamenti di cartelle (D5).
- **I campioni non si rigenerano per comodità.** `tests/samples/anno_esempio.regi`
  si rigenera solo con `npm run sample`; `tests/samples/formato/` si fissa solo
  quando il formato cambia apposta (ADR-17, ADR-37). Mai in questo lavoro.

## Prove protette

Queste prove fissano decisioni del progetto. Si possono **riscrivere** (più
corte, generate, a proprietà), mai **togliere** senza che la stessa invariante
resti provata altrove. Prima di toccarne una, cita l'ADR nel messaggio di
commit.

| Invariante | ADR / regola | Dove guardare |
| --- | --- | --- |
| «Conta come assenza» usato dai cinque consumatori | ADR-11 | `tests/domain/lateness.test.mjs` |
| `'non-impostato'` mai contato, due denominatori mai fusi | ADR-12 | prove di `courseMatrix`, `reportData` |
| Modelli di stampa generati uguali a `templates/` | ADR-13 | `sono in accordo con templates/` |
| Round-trip degli indirizzi | ADR-03 | prove di `addresses` |
| ZIP leggibile con `unzip`, coda nuova prima dell'indice | ADR-17, ADR-18 | prove di `zip`, `package` |
| Documenti vecchi portati avanti per passi | ADR-37 | `tests/samples/formato/` e le loro prove |
| Schemi con `~standard`, chiavi non dichiarate scartate | ADR-28 | `tests/api/schemas.test.mjs` |
| Le letture non scrivono | ADR-43, `CLAUDE.md` | `tests/api/reads.test.mjs` |
| Guida coerente con le pagine | ADR-05, `CLAUDE.md` | `tests/ui/help.test.mjs` |
| Conteggi documentali derivati dal codice | `CLAUDE.md` | `tests/counts.test.mjs` |

Se trovi un'invariante di un ADR che **non** ha nessuna prova, non è compito
tuo scriverla adesso: annotala nel rapporto finale.

## Tempo zero: la linea di partenza

Esegui il rituale della skill `verifica` e **salva i numeri** in
`tmp/prove-partenza.md` (fuori dal commit):

```sh
npm run typecheck
npx eslint .
npm test 2>&1 | tee tmp/prove-partenza.log      # # tests, # pass, # fail, durata
```

Poi misura, file per file:

1. **Righe e casi**: per ogni `tests/**/*.test.mjs`, righe (`wc -l`) e casi
   (`it(` e `test(`).
2. **Durata**: `node --test --test-reporter=spec` e annota i file più lenti
   (i primi 20).
3. **Copertura complessiva**: `node --test --experimental-test-coverage` sui
   bundle di `dist-tests/`. Verifica prima che `node esbuild.mjs --test` emetta
   le *source map*: senza, la copertura è riferita ai bundle e non ai sorgenti,
   e non serve a niente. Se non le emette, riferisci e chiedi prima di cambiare
   `esbuild.mjs`.
4. **Copertura per file di prova**: la stessa misura lanciata su un file di
   prova alla volta. È lenta: falla una volta, salva i risultati come JSON in
   `tmp/copertura/<file>.json`.

Se la linea di partenza non è verde, **fermati**: si riferisce e non si
comincia.

## Primo tempo: inventario

Per ogni file di prova compila una riga di questa tabella (in
`tmp/prove-inventario.md`):

| file | righe | casi | durata | livello | che cosa prova | tecnica candidata | protetto? |
| --- | --- | --- | --- | --- | --- | --- | --- |

- **livello**: `dominio` (funzioni pure di `core/dominio/`), `dati`
  (`core/dati/`, disco, ZIP), `azioni`, `api` (procedure via centralino),
  `cli`, `pannello`, `ui` (Playwright), `sorgente` (legge il codice come
  testo), `ambiente`.
- **tecnica candidata**: una delle sei qui sotto, o `nessuna`.
- **protetto?**: sì se tocca una riga della tabella «Prove protette».

Per un lavoro su tutta la suite usa la skill `sciame`: un esploratore per
cartella di `tests/` (`api`, `domain`, `data`, `environment`, `ui`, il resto),
**in sola lettura**, ciascuno riempie le sue righe. La regola dello scettico
della skill `sciame` vale qui così: *prima di scrivere «doppione», trova la
prova che copre lo stesso caso e cita file e nome del caso*.

## Secondo tempo: misurare la ridondanza

La misura di questo tempo è **la copertura esclusiva**, e basta. Stryker non
fa parte del giro ordinario: è un controllo mirato, facoltativo, descritto più
avanti.

**Copertura esclusiva.** Dai JSON del tempo zero calcola, per ogni file di
prova, le righe e i rami che copre **solo lui**. Classifica ogni file così:

| classe | criterio | che cosa si può fare |
| --- | --- | --- |
| **necessario** | copre righe o rami che nessun altro copre | si può riscrivere, non togliere |
| **sovrapposto** | copertura esclusiva zero, ma prova valori o casi limite diversi (lo dici citando i casi) | si può fondere o trasformare in proprietà |
| **doppione** | copertura esclusiva zero **e** gli stessi casi sono provati altrove (citi file e nome del caso) | candidato alla rimozione |

La copertura di riga non vede i valori: due prove sulle stesse righe possono
prendere errori diversi. Per questo un file finisce fra i **doppioni** solo
se citi la prova che fa lo stesso controllo, e un file **protetto** non ci
finisce mai senza il controllo mirato con Stryker.

Riporta la copertura di partenza per file sorgente: sarà il pavimento.

## Controllo mirato con StrykerJS (facoltativo)

**Quando si fa.** Solo in due casi, e solo con il via del docente:

1. si sta per togliere o fondere una **prova protetta**;
2. si sta per togliere più di un terzo dei casi che provano un file sorgente
   critico (`core/dominio/calculations.ts`, `courseMatrix.ts`, `alerts.ts`,
   `normalization.ts`, `core/dati/zip.ts`, `core/dati/package.ts`).

Mai su tutta la suite, mai in CI, mai come misura di routine.

**Perché così stretto.** Stryker non ha un runner per `node:test`: usa il
*command runner*, che per ogni mutante ricostruisce `dist-tests/` con esbuild
e rilancia tutte le prove del comando, senza sapere quali coprono la riga
mutata. Su un file solo e con le sole prove del suo livello si parla di
minuti; su `core/dominio/` intero di ore.

**Come.** La configurazione sta in `stryker.config.json` alla radice (vedi il
prompt di configurazione in fondo). Per ogni controllo:

1. `mutate` punta a **un** file sorgente.
2. Il comando lancia solo le prove che riguardano quel file (di solito
   `tests/domain/<nome>.test.mjs` e poche altre), dopo `node esbuild.mjs
   --test`.
3. Si esegue **prima** dell'intervento: il punteggio è il pavimento. Si
   annotano i mutanti sopravvissuti (sono buchi già presenti, non colpa tua)
   e, per ogni prova candidata alla rimozione, se è l'unica a uccidere qualche
   mutante.
4. Si esegue **dopo** l'intervento con la stessa configurazione. Il punteggio
   non deve scendere e nessun mutante ucciso prima deve sopravvivere.

Una prova che è l'unica a uccidere un mutante è **necessaria**, anche con
copertura esclusiva zero. Un mutante sopravvissuto già prima si annota nel
rapporto in «Da decidere»: non è compito di questo giro scrivere la prova che
manca.

## Terzo tempo: le sei tecniche

Applicale in quest'ordine: le prime sono meccaniche e senza rischio, le ultime
richiedono giudizio.

### 1. Le prove che leggono il sorgente diventano regole ESLint

**Quando.** Il file legge codice come testo (`readFileSync` su `.ts`,
`tests/helpers/sorgente.mjs` usato per cercare stringhe, espressioni regolari
sul codice). Esempio: la vecchia prova `onlyOnce`, che vietava di ricomporre a
mano `nomeCompleto`, la soglia d'assenza, `allieviAttivi`, `contaUd`.

**Come.** Ogni divieto diventa una voce `no-restricted-syntax` (selettore AST)
o `no-restricted-imports` in `eslint.config.mjs`, nel blocco giusto per
cartella, con un `message` che cita la funzione da usare e l'ADR. Un divieto
che un selettore non sa esprimere resta prova: non forzarlo.

**Controllo.** Prima di togliere la prova, introduci di proposito la violazione
in un file e verifica che `npx eslint .` la segnali come **errore**. Poi
annulla. Scrivi nel commit quale violazione hai provato.

Le regole sui confini fra strati non vanno in ESLint: sono di `npm run layers`.

### 2. Le prove ripetitive delle procedure si generano dal manifesto

**Quando.** Più prove in `tests/api/` controllano, procedura per procedura, la
stessa cosa: che una lettura non muova `archivio.revisione`, che un ingresso
fuori schema sia rifiutato, che l'uscita abbia la forma dichiarata, che una
scrittura tocchi solo le collezioni dichiarate.

**Come.** Estendi il modello di `leTutte()` in `tests/api/reads.test.mjs`: un
solo elenco `[procedura, ingressoBuono]` per tutte le procedure, ricavato da
`$elenco` e `$schema` dove possibile, e una prova per **invariante** che gira
su tutto l'elenco. Un ingresso cattivo si ricava dallo schema (campo
obbligatorio tolto, tipo sbagliato), non si scrive a mano per ogni procedura.

**Poi.** Togli dalle prove per singola procedura solo i casi che l'invariante
generata copre **per quella procedura**. I casi di valore (che cosa risponde,
non che forma ha) restano.

**Controllo.** Il numero di procedure coperte dall'elenco generato è uguale al
numero di procedure in `resources/tools.json`. Una procedura aggiunta domani
deve finire nell'elenco da sola, o far fallire la prova che conta.

### 3. Un comportamento, un livello

**Regola.**

- La **logica** si prova nel livello più basso che la vede: di solito
  `dominio`.
- Il livello **api** prova il cablaggio: la procedura arriva alla funzione
  giusta con gli argomenti giusti e rimanda quel che torna. Un caso felice per
  procedura, più i rifiuti che nascono nel gestore (non nello schema).
- Il livello **ui** prova l'interazione: clic, tastiera, fuoco, scorrimento,
  accessibilità. Non ricontrolla numeri che il dominio ha già provato.

**Come.** Per ogni prova di livello `api` o `ui` che controlla un valore
calcolato, cerca la prova di dominio dello stesso calcolo. Se c'è ed è
equivalente (stessi casi limite), la prova alta si riduce al cablaggio. Se non
c'è, la prova si **sposta** nel dominio, non si toglie.

**Controllo.** Copertura esclusiva dei file di dominio coinvolti, prima e
dopo; il controllo mirato con Stryker se il file è fra quelli critici.

### 4. Gli esempi ripetuti diventano proprietà (fast-check)

**Quando.** Più casi provano la stessa regola con valori diversi, o la regola
è un round-trip o un'invariante: indirizzi (ADR-03), ZIP scritto e riletto,
migrazioni dei documenti vecchi, normalizzazione, date e UD
(`scalettaSulleUd`), conteggi che non devono dipendere dall'ordine.

**Come.**

- Un generatore (`fc.Arbitrary`) per il dato, in `tests/helpers/proprieta.mjs`,
  riusabile. Genera dati **validi per il dominio** (date ISO vere, stati
  d'appello ammessi, UD positive), non stringhe a caso.
- Una proprietà per regola. Seme fisso in CI (`seed` letto da una variabile
  d'ambiente con un valore predefinito) e `numRuns` ragionevole: la prova deve
  restare deterministica e veloce.
- Tieni **due o tre esempi** scritti a mano accanto alla proprietà: i casi
  limite noti e quelli che hanno già causato un difetto. Servono da
  documentazione e da diagnosi.

**Controllo.** Rompi di proposito la regola nel codice: la proprietà deve
fallire e fast-check deve stampare un controesempio ridotto leggibile. Poi
annulla.

### 5. Le asserzioni campo per campo dei rapporti diventano snapshot

**Quando.** Prove che costruiscono un rapporto o una proiezione e ne
controllano decine di campi uno per uno: `tests/domain/reportData.test.mjs`,
`tests/domain/reports.test.mjs`, le prove di `projection`.

**Come.**

- Dati d'ingresso: il campione `tests/samples/anno_esempio.regi` o un registro
  costruito dagli aiuti. Nessun dato che dipenda dall'orologio: fissa la data
  corrente.
- Uno snapshot per **genere di rapporto e caso significativo** (semestre,
  anno intero, con recuperi, senza appello), non uno per campo. Usa gli
  snapshot di `node:test` (`t.assert.snapshot`); verifica prima che siano
  disponibili senza flag su Node 24 e come si aggiornano
  (`--test-update-snapshots`).
- Lo snapshot è il **dato** del rapporto (`reportData`), non il PDF: un PDF
  cambia per un font e non dice niente.
- Le asserzioni che fissano una **regola** (i due denominatori di ADR-12, la R
  del voto rifatto) restano esplicite accanto allo snapshot, con un nome che
  dice la regola. Lo snapshot prende il resto.

**Controllo.** Un aggiornamento di snapshot è sempre in un commit suo, e il
messaggio dice perché il rapporto è cambiato. Mai aggiornare uno snapshot per
far passare un'altra modifica.

### 6. Quel che è dei tipi resta ai tipi

**Quando.** Prove che controllano solo la forma di un valore già tipizzato
(`typeof`, presenza di una chiave, `!== undefined` su un campo non opzionale)
in codice che passa da `tsc` con `strict: true`.

**Come.** Toglile solo se il valore arriva da codice TypeScript e non da JSON
letto da disco, dall'IPC o dall'utente. Quel che arriva dall'esterno si prova
sempre: i tipi non lo garantiscono.

## Quarto tempo: applicare

- Una tecnica alla volta, un perimetro di file disgiunto per agente (skill
  `sciame`, secondo e terzo tempo).
- Per ogni file toccato: `npm test` verde, copertura dei sorgenti coinvolti
  non scesa, mutanti uccisi non scesi (solo dove è stato fatto il controllo
  mirato).
- Fuse due prove in una? Il nome del caso deve ancora dire che cosa è rotto
  quando fallisce. Una prova da duecento righe con un nome generico è peggio di
  dieci prove piccole: non fondere per contare meno casi.
- Messaggio di commit: tecnica, file, numeri prima e dopo (righe, casi,
  durata), ADR toccati.

## Quinto tempo: verifica e rapporto

Rifai il rituale della skill `verifica` per intero, più `npm run ui-tests` se
hai toccato `tests/ui/`. Poi scrivi il rapporto, in questo formato:

```text
## Prove: giro <n>

Partenza → arrivo
- file di prova:   A → B
- righe:           A → B
- casi:            A → B
- durata npm test: A s → B s
- copertura righe/rami (sorgenti): A% / A% → B% / B%
- mutanti uccisi (solo controlli mirati, per file): <file> A% → B%

Per tecnica
| tecnica | file | righe tolte | casi tolti | garanzia che la sostituisce |

Prove protette toccate
| prova | ADR | dove sta adesso l'invariante |

Ipotesi cadute
- file che sembravano doppioni e non lo erano, e perché (quale caso o
  mutante solo loro prendono)

Da decidere (non fatto)
- invarianti degli ADR senza prova
- prove che per semplificarsi chiederebbero di cambiare codice di produzione
- dipendenze che servirebbero e non sono state installate
```

Le «ipotesi cadute» non sono facoltative: dicono al giro dopo che cosa non
serve più guardare.

## Quando fermarsi

- La linea di partenza non è verde.
- Una misura di garanzia (copertura, mutanti dove misurati, invarianti)
  scende e non sai
  riportarla su senza cambiare codice di produzione.
- Una prova sembra sbagliata (asserisce un comportamento che contraddice un
  ADR): non correggerla, riferisci. Può essere un difetto del programma.
- Serve una dipendenza non ancora approvata.

In tutti questi casi: fermati, scrivi che cosa hai visto con file e riga, e
chiedi.

## Errori tipici da non fare

- Contare `*.testi.ts` fra le prove.
- Togliere una prova perché «è coperta» guardando solo la copertura di riga:
  due prove sulle stesse righe possono provare rami o valori diversi.
- Aggiornare in blocco tutti gli snapshot dopo una modifica.
- Proprietà fast-check senza seme fisso: prove che falliscono una volta su
  cento in CI.
- Generatori che producono dati che il dominio non ammetterebbe mai: la
  proprietà fallisce su casi impossibili e si finisce per indebolirla.
- Spostare prove fra cartelle nello stesso commit in cui si cambiano.
- Riscrivere gli aiuti di `tests/helpers/` senza rilanciare **tutte** le prove.

---

## Prompt d'avvio

Da incollare all'agente per cominciare un giro:

> Leggi `CLAUDE.md`, poi le skill `prove`, `verifica` e `sciame`. Obiettivo:
> ridurre la suite di prove di Regiklass a parità di garanzie, secondo la skill
> `prove`. In questo giro fai **solo** il tempo zero, il primo tempo
> (inventario) e il secondo tempo (misura della ridondanza): nessuna modifica
> ai file di `tests/`, nessuna dipendenza installata. Se per misurare servono
> fast-check, chiedimelo indicando versione e licenza. Stryker non si usa in
> questo giro. Consegna
> `tmp/prove-partenza.md`, `tmp/prove-inventario.md` e una proposta ordinata
> di interventi per tecnica, con i numeri attesi e le prove protette
> coinvolte. Aspetta il mio via prima di applicare qualunque cosa.

## Prompt di configurazione di StrykerJS

Da incollare all'agente solo quando serve il primo controllo mirato:

> Leggi `CLAUDE.md` e le skill `prove` (sezione «Controllo mirato con
> StrykerJS») e `verifica`. Obiettivo: preparare StrykerJS per controlli
> mirati su un file sorgente alla volta, senza cambiare codice di produzione
> né prove.
>
> 1. Verifica che l'albero sia verde (skill `verifica`). Se non lo è, fermati.
> 2. Chiedimi il permesso di installare `@stryker-mutator/core` come
>    dipendenza di sviluppo, indicando versione e licenza (Apache-2.0).
>    Nessun altro pacchetto Stryker: per `node:test` non esiste un runner
>    dedicato, si usa il *command runner* incluso.
> 3. Crea `stryker.config.json` alla radice con: `testRunner: "command"`;
>    `coverageAnalysis: "off"`; `reporters: ["clear-text", "html", "json"]`;
>    `htmlReporter` e `jsonReporter` che scrivono sotto `reports/mutation/`;
>    `tempDirName: ".stryker-tmp"`; `concurrency` pari a metà dei core
>    disponibili; `timeoutMS` e `timeoutFactor` adatti a una ricostruzione con
>    esbuild per mutante; nessun `mutate` fisso, perché il file da mutare si
>    passa ogni volta da riga di comando.
> 4. Il comando del runner deve funzionare **dentro la cartella temporanea di
>    Stryker**: ricostruire `dist-tests/` da lì (`node esbuild.mjs --test`) e
>    poi lanciare `node --test` sui soli file di prova passati. Verifica che
>    esbuild e le prove non leggano percorsi assoluti della copia originale
>    (alias `apparato`, `tests/helpers/`, `tests/samples/`): se lo fanno,
>    riferisci invece di aggirarlo.
> 5. Aggiungi uno script in `tools/` (per esempio `tools/mutants.mjs`) e la
>    voce `"mutanti"` in `package.json`, così che si lanci con
>    `npm run mutanti -- --file core/dominio/calculations.ts --prove
>    "tests/domain/calculations.test.mjs tests/domain/lateness.test.mjs"`. Lo
>    script passa a Stryker `--mutate` e il comando con le prove indicate,
>    rifiuta di partire senza `--file` o con più di un file, e stampa alla
>    fine punteggio, mutanti sopravvissuti e percorso del rapporto HTML.
> 6. Aggiungi a `.gitignore` `.stryker-tmp/` e `reports/mutation/`. Aggiungi a
>    `eslint.config.mjs` gli ignorati corrispondenti se servono.
> 7. Non aggiungere lo script a `npm run ci` né ai workflow di GitHub.
> 8. Prova la configurazione su un file piccolo e ben provato di
>    `core/dominio/` scelto da te: annota durata, numero di mutanti,
>    punteggio. Poi ripeti su `core/dominio/calculations.ts` con le sue prove
>    e stima la durata; se supera i trenta minuti fermati e proponi come
>    restringere (sottoinsieme di funzioni con `mutate` a intervallo di righe,
>    `mutator.excludedMutations`, meno prove).
> 9. Aggiorna `docs/GUIDA.md` con una riga sul comando e rilancia
>    `npm run docs` perché la citazione dello script risulti valida.
> 10. Consegna: i file creati o cambiati, i numeri delle due prove del punto
>     8, eventuali problemi dei percorsi nella cartella temporanea, e l'esito
>     di `npm run ci -- --solo verifica`. Un commit solo, che non contiene
>     altro.

