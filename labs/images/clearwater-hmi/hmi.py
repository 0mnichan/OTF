"""
Clearwater operator HMI.

A minimal, dependency-light web view of the clarifier: it polls the PLC over
Modbus and renders a live tank with level, setpoint, pump state and alarm. It
deliberately displays whatever the PLC reports — so if an attacker manipulates
the reported values, the operator's screen is fooled exactly as it would be on a
real plant. This is the concrete demonstration of Manipulation of View.
"""
import json
import os
import struct
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from pymodbus.client import ModbusTcpClient

PLC_HOST = os.environ.get("OTF_PLC_HOST", "plc.lab")
PLC_PORT = int(os.environ.get("OTF_PLC_PORT", "502"))
PORT = int(os.environ.get("PORT", "8080"))

PAGE = """<!doctype html><html><head><meta charset=utf-8>
<title>Clearwater WTP — T-101</title>
<style>
 body{background:#0d1117;color:#e6edf3;font-family:ui-monospace,monospace;margin:0;padding:24px}
 .wrap{max-width:640px;margin:0 auto}
 h1{font-size:16px;color:#f5a623;letter-spacing:1px}
 .grid{display:grid;grid-template-columns:200px 1fr;gap:24px;align-items:center}
 .tank{position:relative;width:180px;height:300px;border:3px solid #232b36;border-top:none;border-radius:0 0 12px 12px;background:#0a0e14}
 .water{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(#1f6feb,#0d47a1);transition:height .5s}
 .mark{position:absolute;left:0;right:0;border-top:1px dashed #6b7684;font-size:10px;color:#9aa7b4;padding-left:4px}
 .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #232b36}
 .k{color:#9aa7b4}.v{font-weight:bold}
 .on{color:#3fb950}.off{color:#6b7684}.alarm{color:#f85149;animation:b 1s infinite}
 @keyframes b{50%{opacity:.3}}
</style></head><body><div class=wrap>
<h1>◉ CLEARWATER WTP · CLARIFIER T-101 · LEVEL CONTROL</h1>
<div class=grid>
 <div class=tank>
   <div class=mark style="bottom:110%">overflow 110%</div>
   <div class=mark style="bottom:95%">HH alarm 95%</div>
   <div class=water id=water style="height:60%"></div>
 </div>
 <div>
   <div class=row><span class=k>Measured level</span><span class=v id=level>--</span></div>
   <div class=row><span class=k>Setpoint</span><span class=v id=sp>--</span></div>
   <div class=row><span class=k>Inlet pump</span><span class=v id=pump>--</span></div>
   <div class=row><span class=k>HH alarm</span><span class=v id=alarm>--</span></div>
   <div class=row><span class=k>PLC link</span><span class=v id=link>--</span></div>
 </div>
</div>
<p style="color:#6b7684;font-size:11px;margin-top:24px">This screen shows what the PLC reports. That is the point.</p>
</div>
<script>
async function poll(){
 try{
  const r=await fetch('/api/state');const s=await r.json();
  document.getElementById('level').textContent=s.level+'%';
  document.getElementById('sp').textContent=s.setpoint+'%';
  document.getElementById('water').style.height=Math.min(100,s.level)+'%';
  const p=document.getElementById('pump');p.textContent=s.pump?'RUNNING':'STOPPED';p.className='v '+(s.pump?'on':'off');
  const a=document.getElementById('alarm');a.textContent=s.alarm?'!! HIGH-HIGH !!':'normal';a.className='v '+(s.alarm?'alarm':'off');
  const l=document.getElementById('link');l.textContent=s.ok?'online':'FAULT';l.className='v '+(s.ok?'on':'alarm');
 }catch(e){document.getElementById('link').textContent='HMI ERROR';}
}
poll();setInterval(poll,1500);
</script></body></html>"""


def read_state():
    c = ModbusTcpClient(PLC_HOST, port=PLC_PORT, timeout=2)
    if not c.connect():
        return {"ok": False, "level": 0, "setpoint": 0, "pump": False, "alarm": False}
    try:
        level = c.read_input_registers(address=2, count=1).registers[0]
        sp = c.read_holding_registers(address=10, count=1).registers[0]
        pump = c.read_coils(address=1, count=1).bits[0]
        alarm = c.read_discrete_inputs(address=0, count=1).bits[0]
        return {"ok": True, "level": level, "setpoint": sp, "pump": bool(pump), "alarm": bool(alarm)}
    except Exception:
        return {"ok": False, "level": 0, "setpoint": 0, "pump": False, "alarm": False}
    finally:
        c.close()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):  # quiet
        pass

    def do_GET(self):
        if self.path.startswith("/api/state"):
            body = json.dumps(read_state()).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            body = PAGE.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)


if __name__ == "__main__":
    print(f"Clearwater HMI on :{PORT}, polling {PLC_HOST}:{PLC_PORT}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
