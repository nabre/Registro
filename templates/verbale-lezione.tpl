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

# La matrice del comportamento, in chiaro: le caselle segnate durante l'ora,
# con la riga scritta accanto quando c'è. La sezione sparisce da sé nelle ore
# in cui non si è segnato niente.
sezione: Com'è andata
tabella: comportamento

sezione: Consuntivo
paragrafo: {{consuntivo}}
