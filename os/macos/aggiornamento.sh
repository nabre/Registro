#!/bin/bash
# L'aggiornamento su macOS, lanciato staccato da `desktop/apparato/updateMac.ts`
# mentre il registro esce: aspetta che esca, mette il pacchetto nuovo al posto
# del vecchio e, se richiesto, lo riapre.
#
# Non Squirrel.Mac: accetta solo un pacchetto firmato come quello che gira, e
# con la firma ad-hoc (`mac.identity` in `electron-builder.json`) ogni versione
# ha una firma diversa. Il pacchetto nuovo è estratto da un archivio già
# controllato con lo SHA-512 di `latest-mac.yml`.
#
#   aggiornamento.sh <pid> <archivio.zip> <Regiklass.app> <riapri 1|0>
#
# Lavora nella cartella in cui sta, e ci lascia `diario.txt`.

set -u

pid=$1
archivio=$2
pacchetto=$3
riapri=$4
lavoro=$(cd "$(dirname "$0")" && pwd)

exec >> "$lavoro/diario.txt" 2>&1
echo "$(date '+%F %T') $pacchetto da $archivio"

# Qualunque cosa vada storta, il registro che c'era si riapre se era chiesto.
fallito () {
  echo "fallito: $1"
  if [ "$riapri" = 1 ] && [ -d "$pacchetto" ]; then open "$pacchetto"; fi
  exit 1
}

# Due minuti per uscire: il registro salva prima di chiudersi.
for _ in $(seq 1 240); do
  kill -0 "$pid" 2> /dev/null || break
  sleep 0.5
done
kill -0 "$pid" 2> /dev/null && fallito "il registro non è uscito"

estratto="$lavoro/estratto"
rm -rf "$estratto"
mkdir -p "$estratto" || fallito "la cartella di lavoro non si crea"
# `ditto` e non `unzip`: tiene collegamenti simbolici e attributi dei framework.
ditto -x -k "$archivio" "$estratto" || fallito "l'archivio non si estrae"
nuovo=$(find "$estratto" -maxdepth 1 -name '*.app' -print -quit)
[ -n "$nuovo" ] || fallito "nell'archivio non c'è un .app"
xattr -dr com.apple.quarantine "$nuovo" 2> /dev/null || true

# Prima si sposta il vecchio, poi entra il nuovo: se il nuovo non entra, il
# vecchio torna al suo posto.
vecchio="$lavoro/vecchio.app"
rm -rf "$vecchio"
mv "$pacchetto" "$vecchio" || fallito "il pacchetto attuale non si sposta"
if ! mv "$nuovo" "$pacchetto"; then
  mv "$vecchio" "$pacchetto"
  fallito "il pacchetto nuovo non entra"
fi

rm -rf "$vecchio" "$estratto" "$archivio"
echo "fatto"
if [ "$riapri" = 1 ]; then open "$pacchetto"; fi
exit 0
