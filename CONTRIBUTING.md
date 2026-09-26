# Contribuire a Regiclass

Grazie di voler dare una mano. Questo file dice che cosa serve perché una
proposta entri senza giri a vuoto.

## Prima di tutto: i dati

Un file `.regi` contiene nomi, assenze e voti di persone reali, spesso
minorenni. **Non allegarlo mai** a una issue o a una pull request, e non
incollarne il contenuto. Se un difetto si vede solo con i tuoi dati, prova a
riprodurlo con il documento di esempio in `tests/samples/`, oppure descrivi la
situazione a parole.

## Segnalare un difetto o proporre una funzione

Apri una [issue](https://github.com/nabre/Registro/issues/new/choose) con il
modello adatto. Per un difetto contano soprattutto la versione, che cosa hai
fatto, che cosa ti aspettavi e che cosa è successo davvero.

Le vulnerabilità non vanno nelle issue pubbliche: vedi [SECURITY.md](SECURITY.md).

## Preparare l'ambiente

```bash
git clone https://github.com/nabre/Registro.git
cd Registro
npm ci
npm run dev
```

Serve Node.js 24. Per `npm run ui-tests` servono anche Python, il pacchetto
`playwright` e `python -m playwright install chromium`.

## Orientarsi

La documentazione sta in [`docs/`](docs/INDICE.md). Due letture prima di
toccare qualcosa di strutturale:

- [ARCHITETTURA](docs/ARCHITETTURA.md): gli strati e che cosa succede quando;
- [DECISIONI](docs/DECISIONI.md): i vincoli che una modifica non deve rompere
  senza saperlo.

Il lavoro in corso e le scelte ancora aperte sono in [CANTIERE](docs/CANTIERE.md).

## Le regole del codice

- **La lingua del progetto è l'italiano**: nomi di dominio, commenti, messaggi
  e documentazione. I commenti spiegano il *perché* e non il *che cosa*.
- **Scrivi come il codice intorno**: stessa densità di commenti, stessi nomi,
  stesse forme.
- **Un'impostazione nuova, una procedura nuova o un campo nuovo nel documento**
  toccano più punti di quel che sembra. Le istruzioni per non dimenticarne
  nessuno sono in `.claude/skills/impostazione/`, `.claude/skills/procedure-api/`
  e `.claude/skills/formato/` — l'ultima dice come cambiare la forma dei dati
  senza lasciare indietro i documenti già scritti.
- **Come si verifica** — che cosa guarda ogni controllo, come si legge la sua
  uscita, che cosa è un guasto — sta in `.claude/skills/verifica/`; come si
  divide un lavoro largo in pezzi che non si pestano i piedi, in
  `.claude/skills/sciame/`.
- **Una funzione che si vede cambia anche la guida.** La guida d'uso sta in
  `src/ui/views/help/`, una sezione per pagina: il nome di un pulsante si scrive
  com'è sullo schermo, e `tests/ui/help.test.mjs` controlla che si tenga insieme.

## Prima di aprire la pull request

La CI esegue questi controlli a ogni push, e una PR entra solo se passano tutti:

```bash
npx tsc --noEmit
npx eslint .
npm test
npm run layers && npm run census && npm run collections
npm run forms && npm run buttons && npm run procedures && npm run docs
```

I sette controlli scritti in casa verificano regole d'architettura che
TypeScript non vede: nessun import attraversa uno strato, nessun export resta
inutilizzato, ogni campo di un modulo viene salvato, i documenti citano file
che esistono. Quando uno fallisce, l'uscita dice dove. `npm run ci` esegue in
locale gli stessi passi della CI, letti da `.github/workflows/verifica.yml`.

## Commit e versioni

- Messaggi in stile [Conventional Commits](https://www.conventionalcommits.org/it/),
  in italiano: `feat: …`, `fix: …`, `docs: …`, `refactor: …`.
- **Non cambiare la versione** in `package.json` dentro una PR: ogni cambio di
  versione su `main` pubblica una release.

## Revisione e firma

Le release per Windows sono firmate con il certificato di SignPath Foundation
(README, § «Code signing policy»), e la Foundation chiede che niente entri
nel codice firmato senza che qualcuno di fidato lo abbia guardato. Quindi:

- ogni pull request di chi non ha il permesso di scrittura sul repository
  viene rivista da un committer prima dell'unione, **compresi** i file che
  costruiscono il pacchetto — `.github/workflows/`, `electron-builder.json`,
  `esbuild.mjs`, `tools/`, `.signpath/` — che sono quelli da guardare con più
  attenzione;
- si rilascia solo da `main`, e ogni richiesta di firma la approva a mano chi
  ha il ruolo di *approver*.

## Licenza

Contribuendo accetti che il tuo lavoro sia distribuito con la
[licenza MIT](LICENSE) del progetto.
