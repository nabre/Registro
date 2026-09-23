# Contribuire al Registro docenti

Grazie di voler dare una mano. Questo file dice che cosa serve perché una
proposta entri senza giri a vuoto.

## Prima di tutto: i dati

Un file `.registro` contiene nomi, assenze e voti di persone reali, spesso
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
- **Un'impostazione nuova o una procedura nuova** toccano più punti di quel che
  sembra. Le istruzioni per non dimenticarne nessuno sono in
  `.claude/skills/impostazione/` e `.claude/skills/procedure-api/`.

## Prima di aprire la pull request

La CI esegue questi controlli a ogni push, e una PR entra solo se passano tutti:

```bash
npx tsc --noEmit
npx eslint .
npm test
npm run layers && npm run census && npm run collections
npm run forms && npm run buttons && npm run procedures
```

I sei controlli scritti in casa verificano regole d'architettura che
TypeScript non vede: nessun import attraversa uno strato, nessun export resta
inutilizzato, ogni campo di un modulo viene salvato. Quando uno fallisce,
l'uscita dice dove.

## Commit e versioni

- Messaggi in stile [Conventional Commits](https://www.conventionalcommits.org/it/),
  in italiano: `feat: …`, `fix: …`, `docs: …`, `refactor: …`.
- **Non cambiare la versione** in `package.json` dentro una PR: ogni cambio di
  versione su `main` pubblica una release.

## Licenza

Contribuendo accetti che il tuo lavoro sia distribuito con la
[licenza MIT](LICENSE) del progetto.
