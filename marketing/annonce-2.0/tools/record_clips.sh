#!/bin/zsh
# Enregistre six plans d'utilisation réels de l'app sur le simulateur iPhone (rec/*.mp4).
T=$(cd "$(dirname "$0")" && pwd); source $T/ios-helpers.sh
OUT=$T/../rec; mkdir -p $OUT; PIDF=$T/.rec.pid
rec() { xcrun simctl io $U recordVideo --codec h264 --force "$OUT/$1.mp4" >/dev/null 2>&1 & echo $! > $PIDF; sleep 1.0; }
stop() { kill -INT $(pgrep -f "simctl io $U recordVideo") 2>/dev/null; sleep 2.5; }
LS="/Users/stephane.pizeuil/Library/Developer/CoreSimulator/Devices/$U/data/Containers/Data/Application/$CONTAINER/Library/Application Support/com.stouph.netbudget.app/RCTAsyncLocalStorage_V1"
xcrun simctl terminate $U com.stouph.netbudget.app 2>/dev/null; sleep 1
python3 $T/setlang.py "$LS" fr EUR paris 1 FR "Île-de-France"
xcrun simctl status_bar $U override --time 9:41 --batteryState discharging --batteryLevel 100 --wifiBars 3 --cellularBars 4 >/dev/null 2>&1
xcrun simctl launch $U com.stouph.netbudget.app >/dev/null; sleep 10; dismiss
xcrun simctl openurl $U "netbudget:///?tab=budget"; sleep 3; gotop; dismiss; sleep 0.5
rec budget; sleep 0.6; idb ui swipe --udid $U 200 650 200 250 --duration 1.2 >/dev/null 2>&1; sleep 0.8; idb ui swipe --udid $U 200 650 200 300 --duration 1.2 >/dev/null 2>&1; sleep 1.2; stop; echo "budget ok"
gotop; sleep 0.5; p=$(find_lbl "Salaire"); echo "salaire @ $p"; rec revenu; sleep 0.5; [ -n "$p" ] && idb ui tap --udid $U ${p% *} ${p#* } >/dev/null 2>&1; sleep 1.6; idb ui swipe --udid $U 200 600 200 350 --duration 0.9 >/dev/null 2>&1; sleep 1.0; stop; echo "revenu ok"; dismiss; idb ui tap --udid $U 360 181 >/dev/null 2>&1; sleep 1
gotop; sleep 0.4; rec reperes; sleep 0.4; for k in 1 2 3; do idb ui swipe --udid $U 200 700 200 250 --duration 0.7 >/dev/null 2>&1; sleep 0.5; done; p=$(nudge_to "Repères" 300); sleep 1.4; stop; echo "reperes ok @ $p"
xcrun simctl openurl $U "netbudget:///event-detail?id=ev-1791646244460"; sleep 5; dismiss; rec projet; sleep 0.8; idb ui swipe --udid $U 200 650 200 300 --duration 1.1 >/dev/null 2>&1; sleep 0.8; idb ui swipe --udid $U 200 650 200 300 --duration 1.1 >/dev/null 2>&1; sleep 1; stop; echo "projet ok"
xcrun simctl openurl $U "netbudget:///advice"; sleep 4; dismiss; rec coach; sleep 0.8; p=$(find_lbl "BUDGET & ÉPARGNE"); [ -n "$p" ] && idb ui tap --udid $U ${p% *} ${p#* } >/dev/null 2>&1; sleep 1.4; idb ui swipe --udid $U 200 650 200 350 --duration 1.0 >/dev/null 2>&1; sleep 1.2; stop; echo "coach ok @ $p"
xcrun simctl openurl $U "netbudget:///workspaces"; sleep 4; dismiss; rec espaces; sleep 1.0; idb ui swipe --udid $U 200 650 200 400 --duration 1.0 >/dev/null 2>&1; sleep 1.5; stop; echo "espaces ok"
for f in $OUT/*.mp4; do echo "$(basename $f) $(ffprobe -v error -show_entries stream=width,height,duration -of csv=p=0 $f | head -1)"; done; echo REC-DONE
