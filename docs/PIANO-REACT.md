# Piano: interfaccia in React

Stato: **fatto** 2026-10-05 (ADR-56 in [DECISIONI](DECISIONI.md)). Tutte le
pagine del renderer sono in React, tranne avvio e lettore PDF; il motore di
prima (`h()`, isole a mano, gestori per delega, idiomorph) non c'è più.

- **La strada** (fasi F0–F11, ondate, misure di partenza): nella storia di git,
  fino al commit che ha concluso la conversione.
- **Come si scrive oggi**, i comportamenti trasversali da non perdere con le
  loro prove, e i punti dove si rompe più facilmente: skill `react`
  (`.claude/skills/react/SKILL.md`).
- **Il perché e i vincoli**: ADR-56, con ADR-48, ADR-50 e ADR-52 modificate.

I §§ 1–10 del piano sono stati tolti a lavoro finito; il numero del § 11 resta
perché CANTIERE lo cita.

## 11. Cambi di comportamento da confermare

Tre comportamenti sono cambiati con la conversione e sono stati tenuti. Vanno
confermati o rimessi come prima (voce in CANTIERE):

1. Nel calendario ufficiale di un anno le spunte delle voci restano fra due
   disegni; prima tornavano tutte accese.
2. Nell'editor delle pause il conto dei giorni segue subito le date nuove.
3. Le notifiche compaiono un fotogramma dopo.
