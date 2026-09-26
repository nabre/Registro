#!/usr/bin/env bash
# UserPromptSubmit: ricorda di integrare ogni nuovo prompt nella coda di lavoro e allargare lo sciame.
# Registrato in .claude/settings.json. Testo statico: il filtro sul prompt lo fa il modello (punto 0).
cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"CODA+SCIAME: prompt nuovo si somma a lavoro in corso, non sostituisce. 0) Prompt piccolo (conferma, domanda, fix noto a un file) → fai diretto, niente agente, niente coda. 1) Aggiungi a coda (strumento todo/task se c'è, sennò elenco in chat), tieni voci precedenti. 2) Indipendente da agenti attivi → nuovo agente background, perimetro file esplicito e disgiunto (skill sciame). Worktree: mai junction su node_modules (rimozione svuota quello vero), npm ci dentro. 3) Tocca file di agente attivo → accoda dopo lui o SendMessage per ampliare. 4) Agente finito → rileggi rapporto, skill verifica, registra docs/CANTIERE.md, prossima voce. 5) Chiudi turno solo coda vuota, riepilogo per attività. CAVEMAN OVUNQUE: chat, docs, hook, memoria, prompt subagenti. Normale solo codice, commit, PR, avvisi sicurezza."}}
EOF
