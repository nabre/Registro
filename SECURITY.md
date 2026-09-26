# Sicurezza

Regiclass custodisce dati di persone reali, spesso minorenni. Una
vulnerabilità qui non è un difetto come gli altri.

## Versioni supportate

Le correzioni di sicurezza escono solo sull'**ultima versione** pubblicata
nelle [release](https://github.com/nabre/Registro/releases/latest).

## Eseguibili autentici

Gli eseguibili per Windows si scaricano solo dalle
[release](https://github.com/nabre/Registro/releases) di questo repository.
Quando la firma del codice sarà attiva (vedi il README, § «Code signing
policy»), porteranno la firma di **SignPath Foundation**: un eseguibile che si
presenta come Regiclass — o, fino alla 1.8.0, come Registro docenti — con una
firma diversa non viene da qui, e va segnalato come sotto.

## Come segnalare

**Non aprire una issue pubblica.** Usa la segnalazione privata di GitHub:
[**Report a vulnerability**](https://github.com/nabre/Registro/security/advisories/new).

Indica:

- la versione e il tipo di installazione (installer o portabile);
- che cosa permette di fare la vulnerabilità e a chi;
- i passi per riprodurla, senza dati reali.

Riceverai una prima risposta entro una settimana. La correzione esce in una
release, e la segnalazione diventa pubblica solo dopo.

## Che cosa interessa

- lettura o scrittura di un documento `.regi` da parte di chi non dovrebbe;
- il condotto JSON-RPC e `regi`: permessi di lettura e scrittura aggirati,
  accesso da un altro utente della stessa macchina;
- contenuto di un documento o di un modello che porta a eseguire codice;
- dati che lasciano la macchina senza un'azione esplicita di chi usa il registro;
- credenziali della posta conservate o trasmesse in modo scorretto.
