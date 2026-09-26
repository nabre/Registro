#!/bin/bash

# ---- Dal modello di electron-builder (`templates/linux/after-remove.tpl`) ----
#
# Il nostro `afterRemove` sostituisce il suo: queste righe vanno ricopiate da
# lì quando electron-builder le cambia. I `${...}` li sostituisce
# electron-builder, quindi le variabili nostre si scrivono senza graffe.

# Delete the link to the binary
# update-alternatives --remove <name> <path>: 'path' must be the registered alternative binary,
# not the generic symlink — see https://man7.org/linux/man-pages/man1/update-alternatives.1.html
if type update-alternatives >/dev/null 2>&1; then
    update-alternatives --remove '${executable}' '/opt/${sanitizedProductName}/${executable}'
else
    rm -f '/usr/bin/${executable}'
fi

APPARMOR_PROFILE_DEST='/etc/apparmor.d/${executable}'

# Remove and unload apparmor profile.
if [ -f "$APPARMOR_PROFILE_DEST" ]; then
  # Unload the profile from the running kernel before deleting the file so the
  # policy is not left enforced until the next reboot.  Mirror the chroot guard
  # used in the after-install script — live AppArmor operations are not
  # meaningful inside a chroot.
  # https://wiki.debian.org/AppArmor/HowToUse
  if apparmor_status --enabled > /dev/null 2>&1; then
    if ! { [ -x '/usr/bin/ischroot' ] && /usr/bin/ischroot; } && hash apparmor_parser 2>/dev/null; then
      apparmor_parser --remove "$APPARMOR_PROFILE_DEST" || true
    fi
  fi
  rm -f "$APPARMOR_PROFILE_DEST"
fi
# ---- Il registro: quel che resta nelle case degli utenti ----
#
# Lo stesso elenco di `src/cli/disinstalla.mjs`, che qui non si può chiamare:
# lo script gira da root, a programma già tolto, una volta per la macchina; si
# passa per ogni utente. I documenti `.regi` non si toccano.
#
# Solo alla rimozione vera (`remove`/`purge` per il `.deb`, `0` per l'`.rpm`):
# in un aggiornamento gira con `upgrade` o `1`, e i dati devono restare.
case "$1" in
  remove|purge|0) ;;
  *) exit 0 ;;
esac

rm -rf /tmp/registro-pagina-* /tmp/registro-voce-* /tmp/registro-aggiornamento-*

getent passwd | while IFS=: read -r _nome _x _uid _gid _info casa _shell; do
  [ -n "$casa" ] && [ "$casa" != "/" ] && [ -d "$casa" ] || continue
  # Anche col nome precedente del programma, se l'avvio non l'ha già tolto.
  rm -rf "$casa/.config/Regiclass" "$casa/.cache/Regiclass" \
    "$casa/.config/Registro docenti" "$casa/.cache/Registro docenti"
  # I ponti di `shell/system/commandLine.ts`, e non un omonimo di qualcun altro.
  for comando in regi regdoc; do
    ponte="$casa/.local/bin/$comando"
    if [ -f "$ponte" ] && grep -q "REGISTRO_COMANDO=$comando" "$ponte"; then
      rm -f "$ponte"
    fi
  done
  for profilo in "$casa/.profile" "$casa/.zprofile"; do
    [ -f "$profilo" ] || continue
    sed -i -e '/^# >>> Regiclass: regi >>>$/,/^# <<< Regiclass: regi <<<$/d' \
      -e '/^# >>> Registro docenti: regdoc >>>$/,/^# <<< Registro docenti: regdoc <<<$/d' "$profilo"
  done
done

exit 0
