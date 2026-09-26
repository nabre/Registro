# La scaletta di un'ora, da portare in aula stampata.

titolo: {{titolo}}
estende: _base

[corpo]
usa: apertura | titolo={{titolo}}; sottotitolo={{data}}
campi: {{frase.classe}}={{classe}}; {{frase.materia}}={{materia}}; {{frase.durata}}={{durata}}; {{frase.etichette}}={{etichette}}

sezione: {{frase.obiettivi}}
elenco: obiettivi

sezione: {{frase.prerequisiti}}
paragrafo: {{prerequisiti}}

sezione: {{frase.scaletta}}
tabella: scaletta

sezione: {{frase.materiali}}
tabella: materiali

sezione: {{frase.note}}
paragrafo: {{note}}
