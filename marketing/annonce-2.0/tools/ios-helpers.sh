# Aides idb pour piloter l'app sur le simulateur iPhone 17 (points, pas pixels).
U=FF0F4486-F797-4111-8ADA-06507385144B; CONTAINER=E61D530D-B753-49DD-9237-1EC6A3FFC733; SWX=200
find_lbl() { idb ui describe-all --udid $U 2>/dev/null | python3 -c "
import sys,json
needle=sys.argv[1].lower()
try: els=json.load(sys.stdin)
except Exception: sys.exit(0)
for e in els:
    lab=(e.get('AXLabel') or '')+' '+(e.get('AXUniqueId') or '')
    if needle in lab.lower():
        f=e['frame']; print(int(f['x']+f['width']/2), int(f['y']+f['height']/2)); break
" "$1"; }
bring() { for k in $(seq 1 14); do p=$(find_lbl "$1"); if [ -z "$p" ]; then idb ui swipe --udid $U $SWX 650 $SWX 300 --duration 0.35 >/dev/null 2>&1; sleep 0.7; continue; fi; y=${p#* }; if [ "$y" -gt 110 ] && [ "$y" -lt 740 ]; then echo "$p"; return; fi; if [ "$y" -ge 740 ]; then d=$((y-400)); [ $d -gt 420 ] && d=420; idb ui swipe --udid $U $SWX 650 $SWX $((650-d)) --duration 0.35 >/dev/null 2>&1; else d=$((400-y)); [ $d -gt 420 ] && d=420; idb ui swipe --udid $U $SWX 250 $SWX $((250+d)) --duration 0.35 >/dev/null 2>&1; fi; sleep 0.8; done; echo ""; }
tap_id() { p=$(find_lbl "$1"); [ -n "$p" ] && idb ui tap --udid $U ${p% *} ${p#* } >/dev/null 2>&1 && echo "tap $1 @ $p" || echo "introuvable: $1"; }
shot() { xcrun simctl io $U screenshot "$1" >/dev/null 2>&1; }
gotop() { for k in 1 2 3 4 5; do idb ui swipe --udid $U $SWX 200 $SWX 700 --duration 0.3 >/dev/null 2>&1; sleep 0.3; done; }
dismiss() { for k in 1 2; do idb ui describe-all --udid $U 2>/dev/null | python3 -c "
import sys,json
try: els=json.load(sys.stdin)
except Exception: els=[]
for e in els:
    l=e.get('AXLabel') or ''
    if 'Open debugger' in l or 'TypeError' in l or 'request failed' in l or 'Network' in l:
        f=e['frame']; print(int(f['x']+f['width']-24), int(f['y']+f['height']/2)); break
" | { read x y; [ -n "$x" ] && idb ui tap --udid $U $x $y >/dev/null 2>&1; }; sleep 0.4; done; }
nudge_to() { p=$(bring "$1"); [ -z "$p" ] && { echo ""; return; }; for k in 1 2 3 4; do p=$(find_lbl "$1"); [ -z "$p" ] && break; y=${p#* }; d=$((y-$2)); [ ${d#-} -le 60 ] && break; s=$(( (d<0?-d:d) * 10 / 23 )); [ $s -lt 45 ] && s=45; [ $s -gt 400 ] && s=400; if [ $d -gt 0 ]; then idb ui swipe --udid $U $SWX 600 $SWX $((600-s)) --duration 0.35 >/dev/null 2>&1; else idb ui swipe --udid $U $SWX 300 $SWX $((300+s)) --duration 0.35 >/dev/null 2>&1; fi; sleep 0.9; done; echo "$(find_lbl "$1")"; }
