// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { C, card, lbl, inp, btn } from "../styles";

export default function Login({ users, onLogin }) {
  const [em, setEm]     = useState("");
  const [pw, setPw]     = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr]   = useState("");

  const go = () => {
    const u = users.find(x => !x.deleted && x.email === em.trim() && x.password === pw);
    u ? onLogin(u) : setErr("Invalid email or password.");
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex",
                  alignItems:"center", justifyContent:"center",
                  fontFamily:"'Courier New',monospace" }}>
      <div style={card({ width:360, borderColor:C.accent })}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:40, marginBottom:6 }}>🚛</div>
          <div style={{ fontSize:22, fontWeight:900, color:"#fff", letterSpacing:2 }}>
            ETTR FLEET
          </div>
          <div style={{ fontSize:10, color:C.accent, letterSpacing:2 }}>
            EDGERTON TRUCK &amp; TRAILER REPAIR
          </div>
          <div style={{ fontSize:9, color:C.border, marginTop:3 }}>
            DOT 1978980 · MC#699644 · Bonduel, WI
          </div>
        </div>

        <span style={lbl}>Email</span>
        <input
          type="email"
          value={em}
          onChange={e => setEm(e.target.value)}
          style={{ ...inp, marginBottom:12 }}
          placeholder="you@ettr.com"
          autoCapitalize="none"
          autoCorrect="off"
        />

        <div style={{ position:"relative", marginBottom:16 }}>
          <span style={lbl}>Password</span>
          <input
            type={show ? "text" : "password"}
            value={pw}
            onChange={e => setPw(e.target.value)}
            style={inp}
            onKeyDown={e => e.key === "Enter" && go()}
          />
          <button
            onClick={() => setShow(!show)}
            style={{ position:"absolute", right:10, top:28, background:"none",
                     border:"none", color:C.dim, cursor:"pointer",
                     WebkitTapHighlightColor:"transparent" }}
          >
            {show ? "🙈" : "👁"}
          </button>
        </div>

        {err && (
          <div style={{ color:C.red, fontSize:12, marginBottom:10 }}>{err}</div>
        )}

        <button onClick={go} style={{ ...btn(), width:"100%", padding:12, fontSize:13 }}>
          SIGN IN
        </button>

        <div style={{ marginTop:10, fontSize:10, color:C.border, textAlign:"center" }}>
          tim@ettr.com or bruce@ettr.com · pw: ettr2024
        </div>
      </div>
    </div>
  );
}
