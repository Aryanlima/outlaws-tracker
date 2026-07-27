import { useState, useEffect, useRef, useCallback, memo } from "react";
import { supabase } from "./supabase.js";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const SQUADS    = ["1SQD", "2SQD", "3SQD", "4SQD"];
const LOCATIONS = ["AMP", "BMP", "CMP", "MAINTENANCE BAY", "MISSION"];
const STATUSES  = ["FMC", "NMC"];
const TYPES     = ["PLS", "TRAILER", "LMTV TRL", "MATV", "LMTV", "PO5025"];
const HISTORY_PAGE_SIZE = 50;

// ── PIN CONFIG — change these to your actual PINs ─────────────────────────────
const VIEWER_PIN = "1234";
const EDITOR_PIN = "5678";

const LOCATION_CONFIG = {
  AMP:               { color: "#cc44ff", icon: "⚙️",  desc: "Area Motor Pool" },
  BMP:               { color: "#ff9900", icon: "🔧", desc: "Battalion Motor Pool" },
  CMP:               { color: "#00aaff", icon: "🏠", desc: "Company Motor Pool" },
  "MAINTENANCE BAY": { color: "#ff6600", icon: "🛠️", desc: "Maintenance Bay" },
  MISSION:           { color: "#ffd700", icon: "🎯", desc: "On Mission" },
};
const STATUS_CONFIG = {
  FMC: { badge: "#00c44f", text: "#00ff6a", bg: "rgba(0,196,79,0.08)" },
  NMC: { badge: "#cc0000", text: "#ff4444", bg: "rgba(204,0,0,0.08)" },
};
const TYPE_COLOR = { PLS: "#a0a0c0", TRAILER: "#5a5a7a", "LMTV TRL": "#8844cc", MATV: "#ff9900", LMTV: "#cc44ff", PO5025: "#00cccc", TRUCK: "#a0a0c0" };

const inputStyle  = { background: "#0e0e1c", border: "1px solid #2a4a2a", borderRadius: 3, padding: "4px 8px", fontSize: 13, fontFamily: "monospace", outline: "none", width: "100%", boxSizing: "border-box", color: "#a0a0c0", WebkitTapHighlightColor: "transparent" };
const selectStyle = { background: "#0e0e1c", color: "#a0a0c0", border: "1px solid #2a4a2a", borderRadius: 3, padding: "6px 8px", fontSize: 13, fontFamily: "monospace", outline: "none", width: "100%", WebkitTapHighlightColor: "transparent" };

// ── OFFLINE QUEUE ─────────────────────────────────────────────────────────────
const QUEUE_KEY  = "shadow-pending-updates";
const loadQueue  = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; } };
const saveQueue  = (q) => localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
const addToQueue = (item) => saveQueue([...loadQueue(), item]);

// ── HELPERS ───────────────────────────────────────────────────────────────────
function nmcDuration(nmcSince) {
  if (!nmcSince) return null;
  const start = new Date(nmcSince);
  if (isNaN(start)) return null;
  const diff  = Date.now() - start.getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return "< 1h";
}

function nmcColor(nmcSince) {
  if (!nmcSince) return "#cc0000";
  const days = (Date.now() - new Date(nmcSince).getTime()) / 86400000;
  if (days >= 7)  return "#ff0000";
  if (days >= 3)  return "#ff6600";
  if (days >= 1)  return "#ffaa00";
  return "#ffcc44";
}

// ── PIN SCREEN ────────────────────────────────────────────────────────────────
function PinScreen({ onAuth }) {
  const [pin,     setPin]     = useState("");
  const [error,   setError]   = useState("");
  const [role,    setRole]    = useState("editor"); // "viewer" | "editor"
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = () => {
    if (role === "viewer") { onAuth("viewer"); return; }
    if (role === "editor" && pin === EDITOR_PIN) { onAuth("editor"); return; }
    setError("Incorrect PIN"); setPin("");
    setTimeout(() => setError(""), 2000);
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  const digitBtn = (d) => (
    <button key={d} onClick={() => { const next = (pin + d).slice(0, 6); setPin(next); }} style={{ background: "#0e0e1c", border: "1px solid #2a4a2a", borderRadius: 8, color: "#a0a0c0", fontFamily: "monospace", fontSize: 20, fontWeight: 700, padding: "16px", cursor: "pointer", width: "100%", aspectRatio: "1" }}>
      {d}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#08080f", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#0e0e1c", border: "1px solid #2a4a2a", borderRadius: 16, padding: 32, textAlign: "center", maxWidth: 320, width: "100%" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>☠</div>
        <div style={{ fontSize: 16, fontWeight: 900, color: "#c8c8d8", letterSpacing: 3, marginBottom: 4 }}>SHADOW PLATOON</div>
        <div style={{ fontSize: 10, color: "#5a5a7a", letterSpacing: 3, marginBottom: 24 }}>TRANSPORT · MAINTENANCE TRACKER</div>

        {/* Role selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {["viewer","editor"].map(r => (
            <button key={r} onClick={() => { setRole(r); setPin(""); setError(""); }} style={{ flex: 1, background: role === r ? (r === "editor" ? "#00c44f" : "#2a4a8a") : "#0e0e1c", color: role === r ? (r === "editor" ? "#000" : "#fff") : "#5a5a7a", border: `1px solid ${role === r ? (r === "editor" ? "#00c44f" : "#4a6aaa") : "#28283a"}`, borderRadius: 6, padding: "8px", fontFamily: "monospace", fontWeight: 700, fontSize: 11, letterSpacing: 2, cursor: "pointer" }}>
              {r === "viewer" ? "👁 VIEWER" : "✏️ EDITOR"}
            </button>
          ))}
        </div>

        {/* PIN dots — only for editor */}
        {role === "editor" && (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 20 }}>
            {[0,1,2,3,4,5].slice(0, Math.max(4, pin.length + 1)).map((_, i) => (
              <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: i < pin.length ? "#00ff6a" : "#1e1e2e", border: "1px solid #2a4a2a", transition: "background 0.15s" }} />
            ))}
          </div>
        )}

        {/* Hidden input for keyboard — only for editor */}
        {role === "editor" && <input ref={inputRef} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,"").slice(0,6))} onKeyDown={handleKey} type="password" inputMode="numeric" style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1 }} />}

        {/* Numpad — only for editor */}
        {role === "editor" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
            {[1,2,3,4,5,6,7,8,9].map(d => digitBtn(String(d)))}
            <div />
            {digitBtn("0")}
            <button onClick={() => setPin(p => p.slice(0,-1))} style={{ background: "#0e0e1c", border: "1px solid #2a4a2a", borderRadius: 8, color: "#ff4444", fontFamily: "monospace", fontSize: 18, cursor: "pointer", padding: "16px" }}>⌫</button>
          </div>
        )}

        <button onClick={handleSubmit} style={{ background: role === "editor" ? "#00c44f" : "#2a4a8a", color: role === "editor" ? "#000" : "#fff", border: "none", borderRadius: 8, padding: "12px", fontFamily: "monospace", fontWeight: 700, fontSize: 14, letterSpacing: 2, cursor: "pointer", width: "100%", marginBottom: 8 }}>
          ENTER
        </button>

        {error && <div style={{ color: "#ff4444", fontFamily: "monospace", fontSize: 12, letterSpacing: 2, marginTop: 8 }}>⚠ {error}</div>}
        <div style={{ color: "#3a3a5a", fontSize: 10, fontFamily: "monospace", marginTop: 12, letterSpacing: 1 }}>
          {role === "viewer" ? "VIEW ONLY — no editing" : "FULL ACCESS — all edits"}
        </div>
      </div>
    </div>
  );
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.FMC;
  return <span style={{ background: cfg.badge, color: "#fff", fontFamily: "monospace", fontWeight: 900, fontSize: 12, letterSpacing: 2, padding: "4px 12px", borderRadius: 4, display: "inline-block", minWidth: 50, textAlign: "center" }}>{status || "FMC"}</span>;
}

function NmcTimer({ nmcSince }) {
  const dur   = nmcDuration(nmcSince);
  const color = nmcColor(nmcSince);
  if (!dur) return null;
  return <span style={{ background: `${color}22`, border: `1px solid ${color}66`, color, fontFamily: "monospace", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, letterSpacing: 1, whiteSpace: "nowrap" }}>⏱ {dur}</span>;
}

function SaveError({ onRetry }) {
  return (
    <div style={{ background: "#2a0808", border: "1px solid #cc0000", borderRadius: 6, padding: "6px 10px", fontSize: 11, color: "#ff6666", fontFamily: "monospace", marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
      ⚠ Save failed
      <span onClick={onRetry} style={{ color: "#ffaa44", cursor: "pointer", textDecoration: "underline" }}>Retry</span>
    </div>
  );
}

// ── MOBILE CARD ───────────────────────────────────────────────────────────────
const MobileCard = memo(function MobileCard({ row, onUpdate, username, editingRowId, isViewer }) {
  const [editing,       setEditing]       = useState(null);
  const [localStatus,   setLocalStatus]   = useState(row.status);
  const [localFaults,   setLocalFaults]   = useState(row.faults);
  const [localLocation, setLocalLocation] = useState(row.location);
  const [localSquad,    setLocalSquad]    = useState(row.squad);
  const [saveError,     setSaveError]     = useState(false);
  const faultsRef = useRef(null);

  useEffect(() => {
    if (editing) return;
    setLocalStatus(row.status); setLocalFaults(row.faults);
    setLocalLocation(row.location); setLocalSquad(row.squad);
  }, [row, editing]);

  const startEdit = (field) => { if (isViewer) return; if (editingRowId) editingRowId.current = row.id; setEditing(field); };
  const stopEdit  = ()       => { if (editingRowId) editingRowId.current = null; setEditing(null); };

  const isNMC    = localStatus === "NMC";
  const sc       = STATUS_CONFIG[localStatus] || STATUS_CONFIG.FMC;
  const locColor = LOCATION_CONFIG[localLocation]?.color || "#6a9a6a";

  const save = useCallback(async (field, value) => {
    setSaveError(false);
    const now = new Date();
    const ts  = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString("en-US",{hour12:false})}`;
    const ok  = await onUpdate(row, field, value, ts, username || "OPERATOR");
    if (!ok) setSaveError(true);
  }, [row, onUpdate, username]);

  const handleStatus = (val) => {
    setLocalStatus(val);
    save("status", val);
    if (val === "NMC") setTimeout(() => { startEdit("faults"); faultsRef.current?.focus(); }, 80);
    else stopEdit();
  };

  return (
    <div style={{ background: isNMC ? "rgba(255,30,30,0.07)" : "#0c0c16", border: `1px solid ${isNMC ? "#4a1010" : "#1a1a28"}`, borderRadius: 10, margin: "8px 12px", padding: "12px 14px", opacity: isViewer ? 0.95 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ color: "#4a4a6a", fontSize: 11, fontFamily: "monospace", minWidth: 20 }}>{row.line}</span>
        <span style={{ color: sc.text, fontWeight: 900, fontSize: 16, fontFamily: "monospace", letterSpacing: 1 }}>{row.unit}</span>
        <span style={{ color: TYPE_COLOR[row.type] || "#5a5a7a", fontSize: 10, fontFamily: "monospace", background: "#131320", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>{row.type}</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          {isNMC && <NmcTimer nmcSince={row.nmc_since} />}
          <div onClick={() => startEdit("status")} style={{ cursor: isViewer ? "default" : "pointer" }}><StatusBadge status={localStatus} /></div>
        </div>
      </div>
      {editing === "status" && !isViewer && <select autoFocus value={localStatus} onChange={e => { handleStatus(e.target.value); }} onBlur={() => stopEdit()} style={{ ...selectStyle, marginBottom: 10 }}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: "#4a4a6a", letterSpacing: 2, marginBottom: 4 }}>SQUAD</div>
          {editing === "squad" && !isViewer
            ? <select autoFocus value={localSquad} onChange={e => { setLocalSquad(e.target.value); save("squad", e.target.value); stopEdit(); }} onBlur={() => stopEdit()} style={selectStyle}>{SQUADS.map(s => <option key={s}>{s}</option>)}</select>
            : <div onClick={() => startEdit("squad")} style={{ color: "#9090b0", fontFamily: "monospace", fontSize: 13, fontWeight: 700, cursor: isViewer ? "default" : "pointer", padding: "6px 8px", background: "#0e0e1c", borderRadius: 4, border: "1px solid #1a3a1a" }}>{localSquad}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: "#4a4a6a", letterSpacing: 2, marginBottom: 4 }}>LOCATION</div>
          {editing === "location" && !isViewer
            ? <select autoFocus value={localLocation} onChange={e => { setLocalLocation(e.target.value); save("location", e.target.value); stopEdit(); }} onBlur={() => stopEdit()} style={selectStyle}>{LOCATIONS.map(l => <option key={l}>{l}</option>)}</select>
            : <div onClick={() => startEdit("location")} style={{ color: locColor, fontFamily: "monospace", fontSize: 13, fontWeight: 700, cursor: isViewer ? "default" : "pointer", padding: "6px 8px", background: "#0e0e1c", borderRadius: 4, border: "1px solid #1a3a1a" }}>{localLocation}</div>}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 9, color: "#4a4a6a", letterSpacing: 2, marginBottom: 4 }}>FAULTS / DETAILS</div>
        {editing === "faults" && !isViewer
          ? <input
              ref={faultsRef}
              autoFocus
              defaultValue={localFaults}
              onBlur={e => { const v = e.target.value; setLocalFaults(v); save("faults", v); stopEdit(); }}
              onKeyDown={e => { if (e.key === "Enter") { const v = e.target.value; setLocalFaults(v); save("faults", v); stopEdit(); } if (e.key === "Escape") stopEdit(); }}
              placeholder="Enter fault description..."
              style={{ ...inputStyle, color: isNMC ? "#ff8888" : "#a0a0c0", background: isNMC ? "#2a0a0a" : "#0e0e1c", padding: "8px 10px" }}
            />
          : <div onClick={() => startEdit("faults")} style={{ color: isNMC ? "#ff6666" : "#4a4a6a", fontFamily: "monospace", fontSize: 12, cursor: isViewer ? "default" : "pointer", padding: "8px 10px", background: "#0e0e1c", borderRadius: 4, border: `1px solid ${isNMC ? "#4a1010" : "#1a1a28"}`, fontStyle: localFaults ? "normal" : "italic", minHeight: 36 }}>{localFaults || (isNMC ? (isViewer ? "No fault listed" : "Tap to add fault...") : "— No faults —")}</div>}
      </div>
      {saveError && <SaveError onRetry={() => { setSaveError(false); save("faults", localFaults); }} />}
      {row.last_updated && <div style={{ marginTop: 8, fontSize: 10, color: "#3a3a5a", fontFamily: "monospace" }}>🕐 {row.last_updated} · {row.updated_by}</div>}
    </div>
  );
});

// ── DESKTOP ROW ───────────────────────────────────────────────────────────────
const DesktopRow = memo(function DesktopRow({ row, onUpdate, username, editingRowId, isViewer }) {
  const [editing,       setEditing]       = useState(null);
  const [localStatus,   setLocalStatus]   = useState(row.status);
  const [localFaults,   setLocalFaults]   = useState(row.faults);
  const [localLocation, setLocalLocation] = useState(row.location);
  const [localSquad,    setLocalSquad]    = useState(row.squad);
  const [saveError,     setSaveError]     = useState(false);
  const faultsRef = useRef(null);

  useEffect(() => {
    if (editing) return;
    setLocalStatus(row.status); setLocalFaults(row.faults);
    setLocalLocation(row.location); setLocalSquad(row.squad);
  }, [row, editing]);

  const startEdit = (field) => { if (isViewer) return; if (editingRowId) editingRowId.current = row.id; setEditing(field); };
  const stopEdit  = ()       => { if (editingRowId) editingRowId.current = null; setEditing(null); };

  const sc       = STATUS_CONFIG[localStatus] || STATUS_CONFIG.FMC;
  const isNMC    = localStatus === "NMC";
  const locColor = LOCATION_CONFIG[localLocation]?.color || "#6a9a6a";
  const cell     = { padding: "0 6px", fontFamily: "monospace", fontSize: 12 };

  const save = useCallback(async (field, value) => {
    setSaveError(false);
    const now = new Date();
    const ts  = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString("en-US",{hour12:false})}`;
    const ok  = await onUpdate(row, field, value, ts, username || "OPERATOR");
    if (!ok) setSaveError(true);
  }, [row, onUpdate, username]);

  const handleStatus = (val) => {
    setLocalStatus(val); save("status", val);
    if (val === "NMC") setTimeout(() => { startEdit("faults"); faultsRef.current?.focus(); }, 80);
    else stopEdit();
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "36px 80px 72px 72px 130px 80px 110px 1fr 148px 120px", alignItems: "center", borderBottom: `1px solid ${isNMC ? "#3a1010" : "#1a1a28"}`, background: isNMC ? "rgba(255,40,40,0.06)" : "transparent", minHeight: 42 }}>
      <div style={{ ...cell, textAlign: "center", color: "#4a4a6a", fontSize: 11 }}>{row.line}</div>
      <div style={{ ...cell, color: sc.text, fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>{row.unit}</div>
      <div style={{ ...cell, color: TYPE_COLOR[row.type] || "#5a5a7a", fontSize: 10, fontWeight: 700 }}>{row.type}</div>
      <div style={{ ...cell }}>
        {editing === "squad" && !isViewer
          ? <select autoFocus value={localSquad} onChange={e => { setLocalSquad(e.target.value); save("squad", e.target.value); stopEdit(); }} onBlur={() => stopEdit()} style={selectStyle}>{SQUADS.map(s => <option key={s}>{s}</option>)}</select>
          : <span onClick={() => startEdit("squad")} style={{ color: "#9090b0", cursor: isViewer ? "default" : "pointer" }}>{localSquad}</span>}
      </div>
      <div style={{ ...cell }}>
        {editing === "location" && !isViewer
          ? <select autoFocus value={localLocation} onChange={e => { setLocalLocation(e.target.value); save("location", e.target.value); stopEdit(); }} onBlur={() => stopEdit()} style={selectStyle}>{LOCATIONS.map(l => <option key={l}>{l}</option>)}</select>
          : <span onClick={() => startEdit("location")} style={{ color: locColor, fontWeight: 700, cursor: isViewer ? "default" : "pointer", fontSize: 11 }}>{localLocation}</span>}
      </div>
      <div style={{ ...cell }}>
        {editing === "status" && !isViewer
          ? <select autoFocus value={localStatus} onChange={e => { handleStatus(e.target.value); }} onBlur={() => stopEdit()} style={selectStyle}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
          : <div onClick={() => startEdit("status")} style={{ cursor: isViewer ? "default" : "pointer" }}><StatusBadge status={localStatus} /></div>}
      </div>
      {/* NMC Timer column */}
      <div style={{ ...cell }}>
        {isNMC && <NmcTimer nmcSince={row.nmc_since} />}
      </div>
      <div style={{ ...cell, paddingTop: saveError ? 4 : 0, paddingBottom: saveError ? 4 : 0 }}>
        {editing === "faults" && !isViewer
          ? <input
              ref={faultsRef}
              autoFocus
              defaultValue={localFaults}
              onBlur={e => { const v = e.target.value; setLocalFaults(v); save("faults", v); stopEdit(); }}
              onKeyDown={e => { if (e.key === "Enter") { const v = e.target.value; setLocalFaults(v); save("faults", v); stopEdit(); } if (e.key === "Escape") stopEdit(); }}
              style={{ ...inputStyle, color: isNMC ? "#ff8888" : "#a0a0c0", background: isNMC ? "#2a0a0a" : "#0e0e1c" }}
            />
          : <span onClick={() => startEdit("faults")} style={{ color: isNMC ? "#ff6666" : "#4a4a6a", cursor: isViewer ? "default" : "pointer", fontStyle: localFaults ? "normal" : "italic", opacity: localFaults ? 1 : 0.5, fontSize: 12 }}>{localFaults || (isNMC ? "Click to add fault..." : "—")}</span>}
        {saveError && <SaveError onRetry={() => { setSaveError(false); save("faults", localFaults); }} />}
      </div>
      <div style={{ ...cell, fontSize: 10, color: "#3a3a5a", whiteSpace: "nowrap" }}>{row.last_updated || "—"}</div>
      <div style={{ ...cell, fontSize: 11, color: "#5a5a7a", fontWeight: 700 }}>{row.updated_by || "—"}</div>
    </div>
  );
});

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ rows, isMobile }) {
  const total = rows.length;
  const fmc   = rows.filter(r => r.status === "FMC").length;
  const nmc   = rows.filter(r => r.status === "NMC").length;
  const pct   = total ? Math.round((fmc / total) * 100) : 0;

  const bySquad    = ["1SQD","2SQD","3SQD","4SQD"].map(sq => { const s = rows.filter(r => r.squad === sq); return { sq, total: s.length, fmc: s.filter(r=>r.status==="FMC").length, nmc: s.filter(r=>r.status==="NMC").length }; });
  const byType     = ["TRUCK","TRAILER","MATV","LMTV"].map(t => { const s = rows.filter(r => r.type === t); return { t, total: s.length, fmc: s.filter(r=>r.status==="FMC").length, nmc: s.filter(r=>r.status==="NMC").length }; }).filter(x => x.total > 0);
  const byLocation = LOCATIONS.map(l => { const s = rows.filter(r => r.location === l); return { l, total: s.length, fmc: s.filter(r=>r.status==="FMC").length, nmc: s.filter(r=>r.status==="NMC").length, cfg: LOCATION_CONFIG[l] }; }).filter(x => x.total > 0);
  const nmcList    = rows.filter(r => r.status === "NMC").sort((a,b) => { const da = new Date(a.nmc_since||0); const db = new Date(b.nmc_since||0); return da - db; });

  const card = (title, value, color, sub) => (
    <div style={{ background: "#0e0e1c", border: `1px solid ${color}33`, borderRadius: 10, padding: "16px 20px", flex: 1, minWidth: isMobile ? "calc(50% - 6px)" : 120 }}>
      <div style={{ fontSize: 32, fontWeight: 900, color, fontFamily: "monospace" }}>{value}</div>
      <div style={{ fontSize: 11, color, letterSpacing: 2, opacity: 0.8, marginTop: 2 }}>{title}</div>
      {sub && <div style={{ fontSize: 10, color: "#4a4a6a", marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ padding: isMobile ? "12px" : "24px" }}>
      <div style={{ fontSize: 11, color: "#4a4a6a", letterSpacing: 3, marginBottom: 20 }}>SHADOW PLATOON · FLEET DASHBOARD</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        {card("TOTAL UNITS", total, "#5a5a7a")}
        {card("FMC", fmc, "#00c44f", `${pct}% operational`)}
        {card("NMC", nmc, "#cc0000", `${100-pct}% down`)}
      </div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#4a4a6a", letterSpacing: 2, marginBottom: 6 }}>
          <span>OPERATIONAL RATE</span><span>{pct}%</span>
        </div>
        <div style={{ background: "#cc0000", borderRadius: 6, height: 14, overflow: "hidden" }}>
          <div style={{ background: "#00c44f", width: `${pct}%`, height: "100%", borderRadius: 6, transition: "width 0.5s" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ flex: 1, minWidth: isMobile ? "100%" : 280 }}>
          <div style={{ fontSize: 10, color: "#4a4a6a", letterSpacing: 3, marginBottom: 10 }}>BY SQUAD</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bySquad.map(({ sq, total, fmc, nmc }) => {
              const p = total ? Math.round((fmc/total)*100) : 0;
              return (
                <div key={sq} style={{ background: "#0e0e1c", border: "1px solid #1a2a1a", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#a0a0c0", fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>{sq}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ background: "#00c44f", color: "#000", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 3 }}>FMC {fmc}</span>
                      {nmc > 0 && <span style={{ background: "#cc0000", color: "#fff", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 3 }}>NMC {nmc}</span>}
                    </div>
                  </div>
                  <div style={{ background: "#cc000044", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{ background: "#00c44f", width: `${p}%`, height: "100%", borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 9, color: "#4a4a6a", marginTop: 4 }}>{p}% operational · {total} units</div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: isMobile ? "100%" : 220 }}>
          <div style={{ fontSize: 10, color: "#4a4a6a", letterSpacing: 3, marginBottom: 10 }}>BY VEHICLE TYPE</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {byType.map(({ t, total, fmc }) => (
              <div key={t} style={{ background: "#0e0e1c", border: `1px solid ${TYPE_COLOR[t]}33`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: TYPE_COLOR[t], fontFamily: "monospace", fontWeight: 900, fontSize: 13, minWidth: 70 }}>{t}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ background: "#cc000044", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{ background: "#00c44f", width: `${total ? Math.round((fmc/total)*100) : 0}%`, height: "100%", borderRadius: 4 }} />
                  </div>
                </div>
                <span style={{ color: "#00c44f", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>{fmc}/{total}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#4a4a6a", letterSpacing: 3, margin: "16px 0 10px" }}>BY LOCATION</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {byLocation.map(({ l, total, fmc, nmc, cfg }) => (
              <div key={l} style={{ background: "#0e0e1c", border: `1px solid ${cfg?.color || "#333"}33`, borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>{cfg?.icon}</span>
                <span style={{ color: cfg?.color || "#888", fontFamily: "monospace", fontWeight: 700, fontSize: 11, flex: 1 }}>{l}</span>
                <span style={{ background: "#00c44f", color: "#000", fontSize: 10, fontWeight: 900, padding: "2px 6px", borderRadius: 3 }}>{fmc}</span>
                {nmc > 0 && <span style={{ background: "#cc0000", color: "#fff", fontSize: 10, fontWeight: 900, padding: "2px 6px", borderRadius: 3 }}>{nmc}</span>}
                <span style={{ color: "#4a4a6a", fontSize: 10, fontFamily: "monospace" }}>{total}u</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NMC List sorted by time down — longest first */}
      <div>
        <div style={{ fontSize: 10, color: "#cc0000", letterSpacing: 3, marginBottom: 10 }}>⚠ NMC UNITS — SORTED BY TIME DOWN ({nmcList.length})</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {nmcList.map(u => {
            const dur   = nmcDuration(u.nmc_since);
            const color = nmcColor(u.nmc_since);
            return (
              <div key={u.id} style={{ background: "rgba(204,0,0,0.06)", border: "1px solid #3a1010", borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                <span style={{ color: "#ff4444", fontFamily: "monospace", fontWeight: 900, fontSize: 13, minWidth: 60 }}>{u.unit}</span>
                <span style={{ color: "#cc4444", fontFamily: "monospace", fontSize: 10, background: "#1a0808", padding: "2px 6px", borderRadius: 3 }}>{u.squad}</span>
                <span style={{ color: "#ff9900", fontFamily: "monospace", fontSize: 10 }}>{u.location}</span>
                {dur && <span style={{ color, fontFamily: "monospace", fontSize: 10, fontWeight: 700, background: `${color}22`, padding: "2px 8px", borderRadius: 3 }}>⏱ {dur}</span>}
                <span style={{ color: "#aa4444", fontFamily: "monospace", fontSize: 11, flex: 1 }}>{u.faults || "—"}</span>
                {u.updated_by && <span style={{ color: "#3a4a3a", fontFamily: "monospace", fontSize: 10 }}>{u.updated_by}</span>}
              </div>
            );
          })}
          {nmcList.length === 0 && <div style={{ color: "#00c44f", fontFamily: "monospace", fontSize: 13, letterSpacing: 2, padding: 16, textAlign: "center" }}>✓ ALL UNITS FMC</div>}
        </div>
      </div>
    </div>
  );
}

// ── HISTORY ───────────────────────────────────────────────────────────────────
function History({ isMobile }) {
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState(false);
  const [page,       setPage]       = useState(0);
  const [hasMore,    setHasMore]    = useState(true);
  const [filterUnit, setFilterUnit] = useState("");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");

  const fetchPage = useCallback(async (pageNum, unit, from, to) => {
    setLoading(true); setLoadError(false);
    let query = supabase.from("fleet_history").select("*").order("changed_at", { ascending: false });
    if (unit) query = query.ilike("unit", `%${unit}%`);
    if (from) query = query.gte("changed_at", new Date(from).toISOString());
    if (to)   query = query.lte("changed_at", new Date(to + "T23:59:59").toISOString());
    query = query.range(pageNum * HISTORY_PAGE_SIZE, (pageNum + 1) * HISTORY_PAGE_SIZE - 1);
    const { data, error } = await query;
    if (error) { setLoadError(true); setLoading(false); return; }
    if (data.length < HISTORY_PAGE_SIZE) setHasMore(false);
    else setHasMore(true);
    setLogs(prev => pageNum === 0 ? data : [...prev, ...data]);
    setLoading(false);
  }, []);

  useEffect(() => { setPage(0); fetchPage(0, filterUnit, dateFrom, dateTo); }, [filterUnit, dateFrom, dateTo, fetchPage]);

  useEffect(() => {
    const ch = supabase.channel("history-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "fleet_history" }, payload => {
        setLogs(prev => [payload.new, ...prev]);
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const loadMore = () => { const next = page + 1; setPage(next); fetchPage(next, filterUnit, dateFrom, dateTo); };

  const fieldLabel = (f) => ({ status: "STATUS", faults: "FAULTS", location: "LOCATION", squad: "SQUAD" }[f] || f.toUpperCase());
  const fieldColor = (f) => ({ status: "#00aaff", faults: "#ff6600", location: "#cc44ff", squad: "#ffcc00" }[f] || "#888");

  const clearFilters = () => { setFilterUnit(""); setDateFrom(""); setDateTo(""); };
  const hasFilters   = filterUnit || dateFrom || dateTo;

  return (
    <div style={{ padding: isMobile ? "12px" : "24px" }}>
      <div style={{ fontSize: 11, color: "#4a4a6a", letterSpacing: 3, marginBottom: 16 }}>CHANGE LOG</div>

      {/* Filters */}
      <div style={{ background: "#0c0c16", border: "1px solid #1a2a1a", borderRadius: 10, padding: "14px", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 9, color: "#4a4a6a", letterSpacing: 2, marginBottom: 4 }}>FILTER BY UNIT</div>
          <input value={filterUnit} onChange={e => setFilterUnit(e.target.value)} placeholder="e.g. C-210" style={{ ...inputStyle, fontSize: 12 }} />
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 9, color: "#4a4a6a", letterSpacing: 2, marginBottom: 4 }}>FROM DATE</div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inputStyle, fontSize: 12, colorScheme: "dark" }} />
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 9, color: "#4a4a6a", letterSpacing: 2, marginBottom: 4 }}>TO DATE</div>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inputStyle, fontSize: 12, colorScheme: "dark" }} />
        </div>
        {hasFilters && (
          <button onClick={clearFilters} style={{ background: "#1a0a0a", border: "1px solid #4a2a2a", color: "#ff6666", fontFamily: "monospace", fontSize: 11, padding: "6px 14px", borderRadius: 6, cursor: "pointer", letterSpacing: 1 }}>CLEAR</button>
        )}
      </div>

      {loadError && (
        <div style={{ background: "#2a0808", border: "1px solid #cc0000", borderRadius: 6, padding: "10px 14px", color: "#ff6666", fontFamily: "monospace", fontSize: 12, marginBottom: 12, display: "flex", gap: 10 }}>
          ⚠ Failed to load
          <span onClick={() => fetchPage(0, filterUnit, dateFrom, dateTo)} style={{ color: "#ffaa44", cursor: "pointer", textDecoration: "underline" }}>Retry</span>
        </div>
      )}

      {loading && page === 0 && <div style={{ color: "#4a4a6a", fontFamily: "monospace", letterSpacing: 2, padding: 16 }}>LOADING...</div>}
      {!loading && logs.length === 0 && <div style={{ color: "#3a3a5a", fontFamily: "monospace", fontSize: 12, letterSpacing: 2, padding: 24, textAlign: "center" }}>NO RECORDS FOUND</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {logs.map(log => {
          const date = new Date(log.changed_at);
          const ts   = `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()} ${date.toLocaleTimeString("en-US",{hour12:false})}`;
          const fc   = fieldColor(log.field_changed);
          return (
            <div key={log.id} style={{ background: "#0c0c16", border: "1px solid #1a2a1a", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <span style={{ color: "#00ff6a", fontFamily: "monospace", fontWeight: 900, fontSize: 13, minWidth: 60 }}>{log.unit}</span>
              <span style={{ color: fc, fontFamily: "monospace", fontSize: 10, background: "#0e0e1c", padding: "2px 8px", borderRadius: 3, fontWeight: 700 }}>{fieldLabel(log.field_changed)}</span>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {log.old_value && <span style={{ color: "#cc0000", fontFamily: "monospace", fontSize: 11, textDecoration: "line-through", opacity: 0.7 }}>{log.old_value}</span>}
                {log.old_value && <span style={{ color: "#4a4a6a", fontSize: 12 }}>→</span>}
                <span style={{ color: "#a0a0c0", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>{log.new_value || "—"}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: "#6a6a8a", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>{log.changed_by}</span>
                <span style={{ color: "#3a3a5a", fontFamily: "monospace", fontSize: 10, whiteSpace: "nowrap" }}>{ts}</span>
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button onClick={loadMore} disabled={loading} style={{ marginTop: 16, background: "#0e0e1c", border: "1px solid #2a4a2a", color: "#6a6a8a", fontFamily: "monospace", fontSize: 12, padding: "8px 20px", borderRadius: 6, cursor: "pointer", width: "100%", letterSpacing: 2 }}>
          {loading ? "LOADING..." : "LOAD MORE"}
        </button>
      )}
    </div>
  );
}

// ── LOCATION BREAKDOWN ────────────────────────────────────────────────────────
function LocationBreakdown({ rows, isMobile }) {
  const grouped = {};
  LOCATIONS.forEach(l => { grouped[l] = []; });
  rows.forEach(r => { const loc = r.location || "CMP"; if (!grouped[loc]) grouped[loc] = []; grouped[loc].push(r); });
  const active = LOCATIONS.filter(l => grouped[l]?.length > 0);
  return (
    <div style={{ padding: isMobile ? "12px" : "24px" }}>
      <div style={{ fontSize: 11, color: "#4a4a6a", letterSpacing: 3, marginBottom: 16 }}>LOCATION BREAKDOWN</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {active.map(loc => {
          const lcfg = LOCATION_CONFIG[loc] || { color: "#888", icon: "📍" };
          const units = grouped[loc];
          const fmc = units.filter(u => u.status === "FMC").length;
          const nmc = units.filter(u => u.status === "NMC").length;
          return (
            <div key={loc} style={{ background: "#0e0e1c", border: `1px solid ${lcfg.color}44`, borderRadius: 8, padding: "10px 14px", minWidth: isMobile ? "calc(50% - 4px)" : 140, flex: isMobile ? "1 1 calc(50% - 4px)" : "0 0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>{lcfg.icon}</span>
                <span style={{ color: lcfg.color, fontWeight: 900, fontSize: 12, letterSpacing: 2 }}>{loc}</span>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                {fmc > 0 && <span style={{ background: "#00c44f", color: "#000", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 3 }}>FMC {fmc}</span>}
                {nmc > 0 && <span style={{ background: "#cc0000", color: "#fff", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 3 }}>NMC {nmc}</span>}
              </div>
              <div style={{ fontSize: 10, color: "#3a5a3a", marginTop: 4 }}>{units.length} UNITS</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {active.map(loc => {
          const lcfg  = LOCATION_CONFIG[loc] || { color: "#888", icon: "📍", desc: loc };
          const units = grouped[loc];
          const byType = TYPES.map(t => ({ t, items: units.filter(u => u.type === t) })).filter(x => x.items.length > 0);
          return (
            <div key={loc} style={{ background: "#0c0c16", border: `1px solid ${lcfg.color}33`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ background: `${lcfg.color}15`, borderBottom: `1px solid ${lcfg.color}33`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{lcfg.icon}</span>
                <div>
                  <div style={{ color: lcfg.color, fontWeight: 900, fontSize: 14, letterSpacing: 2 }}>{loc}</div>
                  <div style={{ color: "#5a5a7a", fontSize: 10 }}>{lcfg.desc} · {units.length} UNITS</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  {["FMC","NMC"].map(s => { const count = units.filter(u => u.status === s).length; if (!count) return null; return <span key={s} style={{ background: STATUS_CONFIG[s].badge, color: s==="FMC"?"#000":"#fff", fontSize: 11, fontWeight: 900, padding: "3px 10px", borderRadius: 4 }}>{s} {count}</span>; })}
                </div>
              </div>
              <div style={{ padding: "12px 16px", display: "flex", gap: 12, flexWrap: "wrap" }}>
                {byType.map(({ t, items }) => (
                  <div key={t} style={{ flex: 1, minWidth: isMobile ? "100%" : 220 }}>
                    <div style={{ fontSize: 10, color: TYPE_COLOR[t], letterSpacing: 2, marginBottom: 6, fontWeight: 700 }}>{t}S</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {items.map(unit => {
                        const sc = STATUS_CONFIG[unit.status] || STATUS_CONFIG.FMC;
                        return (
                          <div key={unit.id} style={{ display: "flex", alignItems: "center", gap: 8, background: sc.bg, border: `1px solid ${sc.badge}33`, borderRadius: 6, padding: "8px 10px", flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 13, color: sc.text, minWidth: 54 }}>{unit.unit}</span>
                            <StatusBadge status={unit.status} />
                            <span style={{ fontSize: 10, color: "#5a5a7a", fontFamily: "monospace" }}>{unit.squad}</span>
                            {unit.status === "NMC" && <NmcTimer nmcSince={unit.nmc_since} />}
                            {unit.faults && <span style={{ fontSize: 11, color: unit.status==="NMC"?"#ff6666":"#6a6a8a", fontFamily: "monospace", flex: 1 }}>⚠ {unit.faults}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ── SQUAD VIEW ────────────────────────────────────────────────────────────────
function SquadView({ rows, isMobile, onUpdate, username, editingRowId, isViewer }) {
  const [selectedSquad, setSelectedSquad] = useState(null);

  const squadData = ["1SQD","2SQD","3SQD","4SQD"].map(sq => {
    const units = rows.filter(r => r.squad === sq);
    const fmc   = units.filter(r => r.status === "FMC").length;
    const nmc   = units.filter(r => r.status === "NMC").length;
    return { sq, units, fmc, nmc, total: units.length };
  });

  const selected = selectedSquad ? squadData.find(s => s.sq === selectedSquad) : null;

  const byType = selected
    ? ["PLS","TRAILER","MATV","LMTV","LMTV TRL","PO5025"]
        .map(t => ({ t, items: selected.units.filter(u => u.type === t) }))
        .filter(x => x.items.length > 0)
    : [];

  return (
    <div style={{ padding: isMobile ? "12px" : "24px" }}>
      <div style={{ fontSize: 11, color: "#4a4a6a", letterSpacing: 3, marginBottom: 20 }}>SQUAD BREAKDOWN</div>

      {/* Squad selector cards */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        {squadData.map(({ sq, fmc, nmc, total }) => {
          const isSelected = selectedSquad === sq;
          const pct = total ? Math.round((fmc/total)*100) : 0;
          return (
            <div key={sq} onClick={() => setSelectedSquad(isSelected ? null : sq)}
              style={{ background: isSelected ? "#14141e" : "#0e0e1c", border: `2px solid ${isSelected ? "#00ff6a" : "#1e1e2e"}`, borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: isMobile ? "calc(50% - 5px)" : 160, cursor: "pointer", transition: "all 0.2s" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: isSelected ? "#00ff6a" : "#a0a0c0", fontFamily: "monospace", letterSpacing: 3, marginBottom: 10 }}>{sq}</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <span style={{ background: "#00c44f", color: "#000", fontSize: 11, fontWeight: 900, padding: "3px 10px", borderRadius: 4 }}>FMC {fmc}</span>
                {nmc > 0 && <span style={{ background: "#cc0000", color: "#fff", fontSize: 11, fontWeight: 900, padding: "3px 10px", borderRadius: 4 }}>NMC {nmc}</span>}
              </div>
              <div style={{ background: "#cc000044", borderRadius: 4, height: 6, overflow: "hidden", marginBottom: 6 }}>
                <div style={{ background: "#00c44f", width: `${pct}%`, height: "100%", borderRadius: 4, transition: "width 0.5s" }} />
              </div>
              <div style={{ fontSize: 10, color: isSelected ? "#3a7a3a" : "#3a3a5a", fontFamily: "monospace" }}>{pct}% operational · {total} units</div>
              {isSelected && <div style={{ fontSize: 10, color: "#00ff6a", fontFamily: "monospace", marginTop: 6, letterSpacing: 1 }}>▼ VIEWING</div>}
            </div>
          );
        })}
      </div>

      {/* Selected squad detail */}
      {selected && (
        <div>
          <div style={{ fontSize: 13, color: "#00ff6a", fontFamily: "monospace", fontWeight: 900, letterSpacing: 3, marginBottom: 16 }}>
            {selected.sq} — {selected.total} UNITS
          </div>

          {/* NMC alert for this squad */}
          {selected.nmc > 0 && (
            <div style={{ background: "rgba(204,0,0,0.08)", border: "1px solid #3a1010", borderRadius: 8, padding: "10px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#cc0000", letterSpacing: 2, marginBottom: 8 }}>⚠ NMC UNITS ({selected.nmc})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {selected.units.filter(u => u.status === "NMC").map(u => {
                  const dur   = nmcDuration(u.nmc_since);
                  const color = nmcColor(u.nmc_since);
                  return (
                    <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ color: "#ff4444", fontFamily: "monospace", fontWeight: 900, fontSize: 13, minWidth: 60 }}>{u.unit}</span>
                      <span style={{ color: TYPE_COLOR[u.type] || "#888", fontFamily: "monospace", fontSize: 10, fontWeight: 700 }}>{u.type}</span>
                      {dur && <span style={{ color, fontFamily: "monospace", fontSize: 10, fontWeight: 700 }}>⏱ {dur}</span>}
                      <span style={{ color: "#ff6666", fontFamily: "monospace", fontSize: 11, flex: 1 }}>{u.faults || "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All units by type */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {byType.map(({ t, items }) => (
              <div key={t} style={{ background: "#0c0c16", border: `1px solid ${TYPE_COLOR[t] || "#333"}33`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ background: `${TYPE_COLOR[t] || "#333"}15`, borderBottom: `1px solid ${TYPE_COLOR[t] || "#333"}33`, padding: "8px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: TYPE_COLOR[t] || "#888", fontWeight: 900, fontSize: 13, letterSpacing: 2, fontFamily: "monospace" }}>{t}</span>
                  <span style={{ color: "#4a4a6a", fontSize: 10, fontFamily: "monospace" }}>{items.length} UNITS</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    {["FMC","NMC"].map(s => { const count = items.filter(u => u.status === s).length; if (!count) return null; return <span key={s} style={{ background: STATUS_CONFIG[s].badge, color: s==="FMC"?"#000":"#fff", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 3 }}>{s} {count}</span>; })}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {items.map(unit => (
                    <MobileCard key={unit.id} row={unit} onUpdate={onUpdate} username={username} editingRowId={editingRowId} isViewer={isViewer} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!selectedSquad && (
        <div style={{ textAlign: "center", padding: 40, color: "#3a3a5a", fontFamily: "monospace", fontSize: 12, letterSpacing: 2 }}>
          ↑ TAP A SQUAD TO VIEW ITS VEHICLES
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function ShadowTracker() {
  const [role,         setRole]         = useState(() => sessionStorage.getItem("shadow-role") || null);
  const [rows,         setRows]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState(false);
  const [username,     setUsername]     = useState(() => localStorage.getItem("shadow-username") || "");
  const [tab,          setTab]          = useState("tracker");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType,   setFilterType]   = useState("ALL");
  const [search,       setSearch]       = useState("");
  const [showPrompt,   setShowPrompt]   = useState(!localStorage.getItem("shadow-username"));
  const [nameInput,    setNameInput]    = useState("");
  const [isMobile,     setIsMobile]     = useState(window.innerWidth < 768);
  const [online,       setOnline]       = useState(true);
  const [pendingCount, setPendingCount] = useState(loadQueue().length);

  const isViewer     = role === "viewer";
  const editingRowId = useRef(null);
  const realtimeOk   = useRef(false);
  const pollRef      = useRef(null);

  const handleAuth = (r) => {
    setRole(r);
    sessionStorage.setItem("shadow-role", r);
    if (r === "viewer" && !username) {
      setUsername("VIEWER"); localStorage.setItem("shadow-username", "VIEWER"); setShowPrompt(false);
    }
  };

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const flushQueue = useCallback(async () => {
    const queue = loadQueue();
    if (!queue.length) return;
    const remaining = [];
    for (const item of queue) {
      const { error } = await supabase.from("fleet").update(item.changes).eq("id", item.id);
      if (error) remaining.push(item);
    }
    saveQueue(remaining);
    setPendingCount(remaining.length);
  }, []);

  useEffect(() => {
    if (!role) return;
    const fetchRows = async () => {
      const { data, error } = await supabase.from("fleet").select("*").order("line", { ascending: true });
      if (error) { setLoadError(true); setLoading(false); setOnline(false); return; }
      setOnline(true); setLoadError(false);
      setRows(prev => data.map(serverRow => {
        if (editingRowId.current === serverRow.id) return prev.find(r => r.id === serverRow.id) || serverRow;
        return serverRow;
      }));
      setLoading(false);
      flushQueue();
    };
    fetchRows();

    const channel = supabase.channel("fleet-realtime", { config: { broadcast: { self: false } } })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "fleet" }, payload => {
        if (editingRowId.current === payload.new.id) return;
        setRows(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
      })
      .subscribe(status => {
        realtimeOk.current = status === "SUBSCRIBED";
        setOnline(status === "SUBSCRIBED");
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(fetchRows, status === "SUBSCRIBED" ? 15000 : 8000);
      });

    const goOnline  = () => { setOnline(true);  fetchRows(); };
    const goOffline = () => setOnline(false);
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      supabase.removeChannel(channel);
      if (pollRef.current) clearInterval(pollRef.current);
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [role, flushQueue]);

  const handleUpdate = useCallback(async (row, field, value, ts, user) => {
    if (isViewer) return false;
    const oldValue = row[field] || "";
    const changes  = { [field]: value, last_updated: ts, updated_by: user };
    // If changing to NMC, record the start time
    if (field === "status" && value === "NMC") changes.nmc_since = ts;
    if (field === "status" && value === "FMC") changes.nmc_since = "";
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, ...changes } : r));
    try {
      const { error } = await supabase.from("fleet").update(changes).eq("id", row.id);
      if (error) throw error;
      supabase.from("fleet_history").insert({ unit: row.unit, type: row.type, squad: row.squad, field_changed: field, old_value: oldValue, new_value: value, changed_by: user })
        .then(({ error }) => { if (error) console.warn("History log failed:", error.message); });
      return true;
    } catch (err) {
      addToQueue({ id: row.id, changes });
      setPendingCount(loadQueue().length);
      return false;
    }
  }, [isViewer]);

  const commitName = () => {
    const n = nameInput.trim().toUpperCase() || "OPERATOR";
    setUsername(n); localStorage.setItem("shadow-username", n); setShowPrompt(false);
  };

  // Show PIN screen if not authenticated
  if (!role) return <PinScreen onAuth={handleAuth} />;

  const filtered = rows.filter(r => {
    if (filterStatus !== "ALL" && r.status !== filterStatus) return false;
    if (filterType   !== "ALL" && r.type   !== filterType)   return false;
    if (search && !r.unit.includes(search.toUpperCase()) && !r.faults?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = { fmc: rows.filter(r=>r.status==="FMC").length, nmc: rows.filter(r=>r.status==="NMC").length, total: rows.length };
  const hCol  = { fontFamily: "monospace", fontSize: 10, color: "#5a5a7a", letterSpacing: 2, padding: "10px 6px" };
  const TABS  = [
    { id: "tracker",   icon: "📋", label: isMobile ? "TRACKER"   : "TRACKER" },
    { id: "squads",    icon: "🪖", label: isMobile ? "SQUADS"    : "SQUAD VIEW" },
    { id: "locations", icon: "📍", label: isMobile ? "LOCATIONS" : "LOCATION BREAKDOWN" },
    { id: "dashboard", icon: "📊", label: isMobile ? "DASH"      : "DASHBOARD" },
    { id: "history",   icon: "🕐", label: isMobile ? "LOG"       : "CHANGE LOG" },
  ];

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#08080f", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 32 }}>☠</div>
      <div style={{ color: "#c8c8d8", fontFamily: "monospace", letterSpacing: 4, fontSize: 14 }}>LOADING...</div>
      {loadError && (
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#ff4444", fontFamily: "monospace", fontSize: 12, marginBottom: 12 }}>⚠ Could not connect</div>
          <button onClick={() => window.location.reload()} style={{ background: "#0e0e1c", border: "1px solid #2a4a2a", color: "#a0a0c0", fontFamily: "monospace", fontSize: 12, padding: "8px 20px", borderRadius: 6, cursor: "pointer" }}>RETRY</button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#08080f", color: "#a0a0c0", fontFamily: "monospace", overscrollBehavior: "none" }}>

      {/* NAME PROMPT — only for editors */}
      {showPrompt && !isViewer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: "#0e0e1c", border: "1px solid #2a4a2a", borderRadius: 12, padding: 32, textAlign: "center", maxWidth: 340, width: "100%" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🪖</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#c8c8d8", letterSpacing: 3, marginBottom: 6 }}>SHADOW PLATOON</div>
            <div style={{ color: "#6a6a8a", fontSize: 12, marginBottom: 20 }}>Enter your callsign</div>
            <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === "Enter" && commitName()} placeholder="e.g. 2LT.EVANS" style={{ ...inputStyle, fontSize: 16, textAlign: "center", marginBottom: 14, color: "#00ff6a", letterSpacing: 2, padding: "10px" }} />
            <button onClick={commitName} style={{ background: "#00c44f", color: "#000", border: "none", borderRadius: 6, padding: "12px", fontFamily: "monospace", fontWeight: 700, fontSize: 15, letterSpacing: 2, cursor: "pointer", width: "100%" }}>LOG IN</button>
          </div>
        </div>
      )}

      {/* OFFLINE BANNER */}
      {!online && (
        <div style={{ background: "#2a1000", borderBottom: "1px solid #cc6600", padding: "6px 16px", fontSize: 11, color: "#ffaa44", fontFamily: "monospace", letterSpacing: 2, display: "flex", alignItems: "center", gap: 10 }}>
          ⚠ NO CONNECTION — changes saved locally, will sync when back online
          {pendingCount > 0 && <span style={{ background: "#cc6600", color: "#000", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 3 }}>{pendingCount} PENDING</span>}
        </div>
      )}
      {online && pendingCount > 0 && (
        <div style={{ background: "#0a2a0a", borderBottom: "1px solid #00c44f", padding: "6px 16px", fontSize: 11, color: "#00ff6a", fontFamily: "monospace", letterSpacing: 2 }}>
          ✓ Back online — syncing {pendingCount} pending change{pendingCount > 1 ? "s" : ""}...
        </div>
      )}

      {/* VIEWER BANNER */}
      {isViewer && (
        <div style={{ background: "#0e0e1e", borderBottom: "1px solid #2a4a8a", padding: "6px 16px", fontSize: 11, color: "#8888cc", fontFamily: "monospace", letterSpacing: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>👁 VIEW ONLY MODE — no editing allowed</span>
          <span onClick={() => { setRole(null); sessionStorage.removeItem("shadow-role"); }} style={{ color: "#aaaaee", cursor: "pointer", textDecoration: "underline" }}>Switch Role</span>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: "#0d0d18", borderBottom: "2px solid #1a3a1a", padding: isMobile ? "10px 14px" : "14px 24px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: "#c8c8d8", letterSpacing: 4 }}>☠ SHADOW</div>
          <div style={{ fontSize: 9, color: "#6a6a8a", letterSpacing: 3 }}>MAINTENANCE TRACKER</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[{ l: "FMC", v: stats.fmc, c: "#00c44f" }, { l: "NMC", v: stats.nmc, c: "#cc0000" }, { l: "TOTAL", v: stats.total, c: "#5a5a7a" }].map(s => (
            <div key={s.l} style={{ background: "#0e0e1c", border: `1px solid ${s.c}33`, borderRadius: 6, padding: "4px 10px", textAlign: "center", minWidth: 44 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 8, color: s.c, letterSpacing: 1 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: online ? "#88aaff" : "#cc0000", boxShadow: online ? "0 0 6px #88aaff" : "0 0 6px #cc0000", transition: "all 0.3s" }} />
          <span style={{ fontSize: 10, color: online ? "#88aaff" : "#cc0000", letterSpacing: 1 }}>{online ? "LIVE" : "OFFLINE"}</span>
          {!isViewer && <span style={{ fontSize: 11, color: "#c8c8d8", fontWeight: 700, cursor: "pointer", marginLeft: 4 }} onClick={() => setShowPrompt(true)}>{username || "—"}</span>}
          {isViewer  && <span style={{ fontSize: 11, color: "#8888cc", fontWeight: 700, marginLeft: 4 }}>👁 VIEWER</span>}
        </div>
      </div>

      {/* TABS */}
      <div style={{ background: "#0a0a14", borderBottom: "1px solid #1a2a1a", display: "flex", overflowX: "auto" }}>
        {TABS.map(({ id, icon, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{ background: tab===id ? "#14141e" : "transparent", color: tab===id ? "#c8c8d8" : "#5a5a7a", border: "none", borderBottom: tab===id ? "2px solid #c8c8d8" : "2px solid transparent", padding: isMobile ? "10px 12px" : "10px 20px", fontFamily: "monospace", fontWeight: tab===id ? 700 : 400, fontSize: isMobile ? 11 : 12, letterSpacing: 1, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* TRACKER TAB */}
      {tab === "tracker" && <>
        <div style={{ background: "#0a0a14", borderBottom: "1px solid #1a2a1a", padding: isMobile ? "8px 12px" : "10px 24px", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {["ALL","FMC","NMC"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{ background: filterStatus===s ? (s==="FMC"?"#00c44f":s==="NMC"?"#cc0000":"#28283a") : "#0e0e1c", color: filterStatus===s?"#fff":"#6a6a8a", border: "1px solid #2a4a2a", borderRadius: 4, padding: "5px 12px", fontFamily: "monospace", fontWeight: 700, fontSize: 12, letterSpacing: 2, cursor: "pointer" }}>{s}</button>
          ))}
          <div style={{ width: 1, background: "#1e1e2e", height: 22 }} />
          {["ALL","PLS","TRAILER","LMTV TRL","MATV","LMTV","PO5025"].map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{ background: filterType===t ? "#1e1e2e" : "#0e0e1c", color: filterType===t ? (TYPE_COLOR[t]||"#a0a0c0") : "#4a6a4a", border: "1px solid #2a4a2a", borderRadius: 4, padding: "5px 10px", fontFamily: "monospace", fontSize: 11, cursor: "pointer", fontWeight: filterType===t?700:400 }}>{t}</button>
          ))}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ ...inputStyle, flex: 1, minWidth: 80, maxWidth: 200, fontSize: 12 }} />
          <span style={{ fontSize: 10, color: "#3a3a5a" }}>{filtered.length}</span>
        </div>

        {!isMobile && (
          <div style={{ display: "grid", gridTemplateColumns: "36px 80px 72px 72px 130px 80px 110px 1fr 148px 120px", background: "#08080f", borderBottom: "1px solid #1a3a1a", position: "sticky", top: 0, zIndex: 10 }}>
            {["#","UNIT","TYPE","SQUAD","LOCATION","STATUS","TIME DOWN","FAULTS / DETAILS","LAST UPDATED","UPDATED BY"].map((h, i) => (
              <div key={i} style={{ ...hCol, textAlign: i===0?"center":"left" }}>{h}</div>
            ))}
          </div>
        )}

        <div style={{ paddingBottom: isMobile ? 80 : 0 }}>
          {filtered.map(row => isMobile
            ? <MobileCard key={row.id} row={row} onUpdate={handleUpdate} username={username} editingRowId={editingRowId} isViewer={isViewer} />
            : <DesktopRow key={row.id} row={row} onUpdate={handleUpdate} username={username} editingRowId={editingRowId} isViewer={isViewer} />
          )}
          {filtered.length === 0 && <div style={{ textAlign: "center", padding: 48, color: "#3a3a5a", letterSpacing: 3 }}>NO RECORDS MATCH</div>}
        </div>
      </>}

      {tab === "dashboard"  && <Dashboard rows={rows} isMobile={isMobile} />}
      {tab === "squads"     && <SquadView rows={rows} isMobile={isMobile} onUpdate={handleUpdate} username={username} editingRowId={editingRowId} isViewer={isViewer} />}
      {tab === "locations"  && <LocationBreakdown rows={rows} isMobile={isMobile} />}
      {tab === "history"    && <History isMobile={isMobile} />}
    </div>
  );
}
