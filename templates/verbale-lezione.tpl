# Il verbale di un'ora: quel che si è fatto, chi c'era, che cosa se ne è detto.

titolo: {{titolo}}
estende: _base

[corpo]
usa: apertura | titolo={{titolo}}; sottotitolo={{data}}
campi: {{frase.classe}}={{classe}}; {{frase.materia}}={{materia}}; {{frase.orario}}={{orario}}; {{frase.aula}}={{aula}}; {{frase.durata}}={{durata}}; {{frase.stato}}={{stato}}

sezione: {{frase.presenze}}
usa: riepilogo-appello
usa: griglia-appello

sezione: {{frase.obiettivi}}
elenco: obiettivi

sezione: {{frase.scaletta-svolta}}
tabella: scaletta

sezione: {{frase.argomenti-svolti}}
paragrafo: {{argomenti}}

sezione: {{frase.materiali}}
paragrafo: {{materiali}}

sezione: {{frase.consegne-date}}
tabella: consegne

sezione: {{frase.osservazioni}}
tabella: osservazioni

# La matrice del comportamento, in chiaro: le caselle segnate durante l'ora,
# con la riga scritta accanto quando c'è. La sezione sparisce da sé nelle ore
# in cui non si è segnato niente.
sezione: {{frase.com-e-andata}}
tabella: comportamento

sezione: {{frase.consuntivo}}
paragrafo: {{consuntivo}}
