#!/bin/zsh
# Enregistre les six plans d'utilisation de l'app dans une langue (rec-<lang>/*.mp4).
#   record_clips_lang.sh <es|pt|de|it|ar|ja|en>
# Libellés cherchés à l'écran : ceux des traductions de l'app (frontend/src/i18n/locales/<lang>.ts).
LANG_=$1; [ -z "$LANG_" ] && { echo "usage: $0 <lang>"; exit 1; }
T=$(cd "$(dirname "$0")" && pwd); source $T/ios-helpers.sh
case $LANG_ in
  en) CUR=USD; CITY=us-nyc;        SCALE=1;    PC=US; PLACE="New York"; SAL="Salary";    BENCH="Benchmarks"; BUDG="Budget & savings";;
  es) CUR=EUR; CITY=es-madrid;     SCALE=1;    PC=ES; PLACE="Madrid"; SAL="Salario";   BENCH="Referencias"; BUDG="Presupuesto y ahorro";;
  pt) CUR=EUR; CITY=pt-lisbon;     SCALE=1;    PC=PT; PLACE="Lisboa"; SAL="Salário";   BENCH="Referências"; BUDG="Orçamento e poupança";;
  de) CUR=EUR; CITY=de-berlin;     SCALE=1;    PC=DE; PLACE="Berlin"; SAL="Gehalt";    BENCH="Vergleich";   BUDG="Budget & Sparen";;
  it) CUR=EUR; CITY=it-rome;       SCALE=1;    PC=IT; PLACE="Roma"; SAL="Stipendio"; BENCH="Riferimenti"; BUDG="Budget e risparmio";;
  ar) CUR=MAD; CITY=ma-casablanca; SCALE=10.5; PC=MA; PLACE="Casablanca"; SAL="راتب";      BENCH="مقارنات";     BUDG="الميزانية والادّخار";;
  ja) CUR=JPY; CITY=jp-tokyo;      SCALE=160;  PC=JP; PLACE=""; OTHER="その他の国"; SAL="給与";      BENCH="目安";        BUDG="家計と貯蓄";;
  *) echo "langue inconnue: $LANG_"; exit 1;;
esac
# bouton de fermeture de la fiche revenu : en haut à droite (la mise en page ne se retourne pas en arabe)
CLOSEX=360
OUT=$T/../rec-$LANG_; mkdir -p $OUT; PIDF=$T/.rec.pid
rec() { xcrun simctl io $U recordVideo --codec h264 --force "$OUT/$1.mp4" >/dev/null 2>&1 & echo $! > $PIDF; sleep 1.0; }
stop() { kill -INT $(pgrep -f "simctl io $U recordVideo") 2>/dev/null; sleep 2.5; }
LS="/Users/stephane.pizeuil/Library/Developer/CoreSimulator/Devices/$U/data/Containers/Data/Application/$CONTAINER/Library/Application Support/com.stouph.netbudget.app/RCTAsyncLocalStorage_V1"
xcrun simctl terminate $U com.stouph.netbudget.app 2>/dev/null; sleep 1
python3 $T/setlang.py "$LS" $LANG_ $CUR $CITY $SCALE $PC ""
xcrun simctl status_bar $U override --time 9:41 --batteryState discharging --batteryLevel 100 --wifiBars 3 --cellularBars 4 >/dev/null 2>&1
xcrun simctl launch $U com.stouph.netbudget.app >/dev/null; sleep 10; dismiss
# Lieu du profil (cloud) : c'est lui qui donne la ville du budget et le pays du coach.
# Ville tapée puis suggestion choisie (le pays suit) ; sans ville (Japon), puce « autre pays ».
xcrun simctl openurl $U "netbudget:///complete-profile"; sleep 6; dismiss
idb ui swipe --udid $U 200 700 200 250 --duration 0.5 >/dev/null 2>&1; sleep 2
for try in 1 2 3; do
  p=$(python3 $T/setplace.py field); [ -z "$p" ] && { idb ui swipe --udid $U 200 700 200 350 --duration 0.5 >/dev/null 2>&1; sleep 2; p=$(python3 $T/setplace.py field); }; idb ui tap --udid $U ${p% *} ${p#* } >/dev/null 2>&1; sleep 1.2
  for k in $(seq 1 16); do idb ui key --udid $U 42 >/dev/null 2>&1; done
  [ -z "$PLACE" ] && break
  idb ui text --udid $U "$(python3 $T/setplace.py azerty "$PLACE")" >/dev/null 2>&1; sleep 1.5
  v=$(python3 $T/setplace.py value); echo "ville tapée: $v"; [ "$v" = "$PLACE" ] && break
  dismiss; sleep 1.5
done
if [ -n "$PLACE" ]; then
  p=$(python3 $T/setplace.py suggest); echo "suggestion @ $p"; [ -n "$p" ] && idb ui tap --udid $U ${p% *} ${p#* } >/dev/null 2>&1; sleep 1
else
  p=$(python3 $T/setplace.py button "$OTHER"); echo "autre pays @ $p"; idb ui tap --udid $U ${p% *} ${p#* } >/dev/null 2>&1; sleep 1
fi
shot $OUT/profile.png
p=$(python3 $T/setplace.py button $'\uf12b'); echo "terminer @ $p"; idb ui tap --udid $U ${p% *} ${p#* } >/dev/null 2>&1; sleep 4
xcrun simctl terminate $U com.stouph.netbudget.app 2>/dev/null; sleep 1
xcrun simctl launch $U com.stouph.netbudget.app >/dev/null; sleep 10; dismiss
xcrun simctl openurl $U "netbudget:///?tab=budget"; sleep 3; gotop; dismiss; sleep 0.5
shot $OUT/budget-top.png
rec budget; sleep 0.6; idb ui swipe --udid $U 200 650 200 250 --duration 1.2 >/dev/null 2>&1; sleep 0.8; idb ui swipe --udid $U 200 650 200 300 --duration 1.2 >/dev/null 2>&1; sleep 1.2; stop; echo "budget ok"
gotop; sleep 0.5; p=$(find_lbl "$SAL"); echo "salaire @ $p"; rec revenu; sleep 0.5; [ -n "$p" ] && idb ui tap --udid $U ${p% *} ${p#* } >/dev/null 2>&1; sleep 1.6; idb ui swipe --udid $U 200 600 200 350 --duration 0.9 >/dev/null 2>&1; sleep 1.0; stop; echo "revenu ok"; shot $OUT/revenu-end.png; dismiss; idb ui tap --udid $U $CLOSEX 181 >/dev/null 2>&1; sleep 1
gotop; sleep 0.4; rec reperes; sleep 0.4; for k in 1 2 3; do idb ui swipe --udid $U 200 700 200 250 --duration 0.7 >/dev/null 2>&1; sleep 0.5; done; p=$(nudge_to "$BENCH" 300); sleep 1.4; stop; echo "reperes ok @ $p"
xcrun simctl openurl $U "netbudget:///event-detail?id=ev-1791646244460"; sleep 5; dismiss; rec projet; sleep 0.8; idb ui swipe --udid $U 200 650 200 300 --duration 1.1 >/dev/null 2>&1; sleep 0.8; idb ui swipe --udid $U 200 650 200 300 --duration 1.1 >/dev/null 2>&1; sleep 1; stop; echo "projet ok"
xcrun simctl openurl $U "netbudget:///advice"; sleep 4; dismiss; rec coach; sleep 0.8; p=$(find_lbl "$BUDG"); [ -n "$p" ] && idb ui tap --udid $U ${p% *} ${p#* } >/dev/null 2>&1; sleep 1.4; idb ui swipe --udid $U 200 650 200 350 --duration 1.0 >/dev/null 2>&1; sleep 1.2; stop; echo "coach ok @ $p"
xcrun simctl openurl $U "netbudget:///workspaces"; sleep 4; dismiss; rec espaces; sleep 1.0; idb ui swipe --udid $U 200 650 200 400 --duration 1.0 >/dev/null 2>&1; sleep 1.5; stop; echo "espaces ok"
for f in $OUT/*.mp4; do echo "$(basename $f) $(ffprobe -v error -show_entries stream=width,height,duration -of csv=p=0 $f | head -1)"; done; echo REC-DONE
