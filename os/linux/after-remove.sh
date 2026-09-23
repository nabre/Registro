#!/bin/bash

# ---- Dal modello di electron-builder (`templates/linux/after-remove.tpl`) ----
#
# Un `afterRemove` nostro prende il posto del suo invece di aggiungersi: queste
# righe vanno ricopiate da lì quando electron-builder le cambia. I `${...}` li
# sostituisce electron-builder; per questo le variabili nostre, sotto, si
# scrivono senza graffe.

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
# Lo stesso elenco di `src/cli/disinstalla.mjs`, che su Windows e macOS fa questo
# lavoro. Qui non lo si può chiamare: questo script gira da root, dopo che il
# programma è già stato tolto, e una volta sola per tutta la macchina. Si passa
# allora per ogni utente. I documenti `.registro` non si toccano.
#
# Solo quando il pacchetto se ne va davvero: `remove` e `purge` per il `.deb`,
# `0` per l'`.rpm`. In un aggiornamento lo script del pacchetto vecchio gira lo
# stesso, con `upgrade` o `1`, e togliere lì i dati vorrebbe dire perderli a
# ogni versione nuova.
case "$1" in
  remove|purge|0) ;;
  *) exit 0 ;;
esac

rm -rf /tmp/registro-pagina-* /tmp/registro-voce-*

getent passwd | while IFS=: read -r _nome _x _uid _gid _info casa _shell; do
  [ -n "$casa" ] && [ "$casa" != "/" ] && [ -d "$casa" ] || continue
  rm -rf "$casa/.config/Registro docenti" "$casa/.cache/Registro docenti"
  # Il ponte di `shell/system/commandLine.ts`, e non un `regdoc` di qualcun altro.
  ponte="$casa/.local/bin/regdoc"
  if [ -f "$ponte" ] && grep -q 'REGISTRO_COMANDO=regdoc' "$ponte"; then
    rm -f "$ponte"
  fi
  for profilo in "$casa/.profile" "$casa/.zprofile"; do
    [ -f "$profilo" ] || continue
    sed -i '/^# >>> Registro docenti: regdoc >>>$/,/^# <<< Registro docenti: regdoc <<<$/d' "$profilo"
  done
done

exit 0
