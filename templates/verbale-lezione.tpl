# Il verbale di un'ora: quel che si è fatto, chi c'era, che cosa se ne è detto.

titolo: Verbale della lezione
estende: _base

[corpo]
usa: apertura | titolo={{titolo}}; sottotitolo={{data}}
campi: Classe={{classe}}; Materia={{materia}}; Orario={{orario}}; Aula={{aula}}; Durata={{durata}}; Stato={{stato}}

sezione: Presenze
usa: riepilogo-appello
usa: griglia-appello

sezione: Obiettivi
elenco: obiettivi

sezione: Scaletta svolta
tabella: scaletta

sezione: Argomenti svolti
paragrafo: {{argomenti}}

sezione: Materiali
paragrafo: {{materiali}}

sezione: Consegne date
tabella: consegne

sezione: Osservazioni
tabella: osservazioni

sezione: Consuntivo
paragrafo: {{consuntivo}}
