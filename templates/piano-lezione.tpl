# La scaletta di un'ora, da portare in aula stampata.

titolo: Piano lezione
estende: _base

[corpo]
usa: apertura | titolo={{titolo}}; sottotitolo={{data}}
campi: Classe={{classe}}; Materia={{materia}}; Durata={{durata}}; Etichette={{etichette}}

sezione: Obiettivi
elenco: obiettivi

sezione: Prerequisiti
paragrafo: {{prerequisiti}}

sezione: Scaletta
tabella: scaletta

sezione: Materiali
tabella: materiali

sezione: Note
paragrafo: {{note}}
