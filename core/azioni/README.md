# Azioni del nucleo (`core/azioni/`)

Tutte le azioni di scrittura e lettura definite in questo strato sono coperte al 100% via API dalle prove situate in `tests/api/`:

- `tests/api/coverage.test.mjs`: verifica la corrispondenza 1:1 fra le varianti dell'unione `Azione` e le procedure registrate;
- `tests/api/procedures.test.mjs`, `tests/api/writes.test.mjs`, `tests/api/reads.test.mjs`, `tests/api/writesAssessments.test.mjs`, `tests/api/writesPlans.test.mjs`: verificano l'esecuzione concreta di tutte le azioni e le loro regole di validazione e persistenza.
