# La scaletta di un'ora, da portare in aula stampata.

titolo: {{titolo}}
estende: _base

[corpo]
# Tutte le date delle ore che lo usano, in ordine: un piano rifatto in due
# classi o due giorni lo dice in testa.
usa: apertura | titolo={{titolo}}; sottotitolo={{date}}
campi: {{frase.classe}}={{classe}}; {{frase.materia}}={{materia}}; {{frase.durata}}={{durata}}; {{frase.etichette}}={{etichette}}

sezione: {{frase.obiettivi}}
elenco: obiettivi

sezione: {{frase.prerequisiti}}
paragrafo: {{prerequisiti}}

sezione: {{frase.scaletta}}
tabella: scaletta

sezione: {{frase.materiali}}
tabella: materiali
