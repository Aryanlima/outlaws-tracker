import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";

const SQUADS = ["1SQD", "2SQD", "3SQD", "4SQD"];
const LOCATIONS = ["AMP", "BMP", "CMP", "MAINTENANCE BAY", "MISSION"];
const STATUSES = ["FMC", "NMC"];
const TYPES = ["TRUCK", "TRAILER", "MATV", "LMTV"];

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

const TYPE_COLOR = { TRUCK: "#88cc88", TRAILER: "#5a8a5a", MATV: "#ff9900", LMTV: "#cc44ff" };

const inputStyle = { background: "#0a1a0a", border: "1px solid #2a4a2a", borderRadius: 3, padding: "4px 8px", fontSize: 13, fontFamily: "monospace", outline: "none", width: "100%", boxSizing: "border-box", color: "#88cc88" };
const selectStyle = { background: "#0a1a0a", color: "#88cc88", border: "1px solid #2a4a2a", borderRadius: 3, padding: "6px 8px", fontSize: 13, fontFamily: "monospace", outline: "none", width: "100%" };

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.FMC;
  return <span style={{ background: cfg.badge, color: "#fff", fontFamily: "monospace", fontWeight: 900, fontSize: 12, letterSpacing: 2, padding: "4px 12px", borderRadius: 4, display: "inline-block", minWidth: 50, textAlign: "center" }}>{status || "FMC"}</span>;
}

// ── MOBILE CARD ───────────────────────────────────────────────────────────────
function MobileCard({ row, onUpdate, username, editingRowId }) {
  const [editing, setEditing] = useState(null);
  const [localStatus,   setLocalStatus]   = useState(row.status);
  const [localFaults,   setLocalFaults]   = useState(row.faults);
  const [localLocation, setLocalLocation] = useState(row.location);
  const [localSquad,    setLocalSquad]    = useState(row.squad);
  const faultsRef = useRef(null);

  useEffect(() => {
    if (editing) return; // don't sync while editing
    setLocalStatus(row.status); setLocalFaults(row.faults); setLocalLocation(row.location); setLocalSquad(row.squad);
  }, [row, editing]);

  const startEdit = (field) => { if (editingRowId) editingRowId.current = row.id; setEditing(field); };
  const stopEdit  = () => { if (editingRowId) editingRowId.current = null; setEditing(null); };

  const isNMC = localStatus === "NMC";
  const sc = STATUS_CONFIG[localStatus] || STATUS_CONFIG.FMC;
  const locColor = LOCATION_CONFIG[localLocation]?.color || "#6a9a6a";

  const save = useCallback((field, value) => {
    const now = new Date();
    const ts = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString("en-US",{hour12:false})}`;
    onUpdate(row, field, value, ts, username || "OPERATOR");
  }, [row, onUpdate, username]);

  const handleStatus = (val) => {
    setLocalStatus(val); save("status", val);
    if (val === "NMC") setTimeout(() => { startEdit("faults"); faultsRef.current?.focus(); }, 80);
    else stopEdit();
  };

  return (
    <div style={{ background: isNMC ? "rgba(255,30,30,0.07)" : "#080f08", border: `1px solid ${isNMC ? "#4a1010" : "#1a2a1a"}`, borderRadius: 10, margin: "8px 12px", padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ color: "#3a6a3a", fontSize: 11, fontFamily: "monospace", minWidth: 20 }}>{row.line}</span>
        <span style={{ color: sc.text, fontWeight: 900, fontSize: 16, fontFamily: "monospace", letterSpacing: 1 }}>{row.unit}</span>
        <span style={{ color: TYPE_COLOR[row.type] || "#4a7a4a", fontSize: 10, fontFamily: "monospace", background: "#0f1f0f", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>{row.type}</span>
        <div style={{ marginLeft: "auto" }} onClick={() => startEdit("status")}><StatusBadge status={localStatus} /></div>
      </div>
      {editing === "status" && <select autoFocus value={localStatus} onChange={e => { handleStatus(e.target.value); }} onBlur={() => stopEdit()} style={{ ...selectStyle, marginBottom: 10 }}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: "#3a6a3a", letterSpacing: 2, marginBottom: 4 }}>SQUAD</div>
          {editing === "squad"
            ? <select autoFocus value={localSquad} onChange={e => { setLocalSquad(e.target.value); save("squad", e.target.value); stopEdit(); }} onBlur={() => stopEdit()} style={selectStyle}>{SQUADS.map(s => <option key={s}>{s}</option>)}</select>
            : <div onClick={() => startEdit("squad")} style={{ color: "#7aaa7a", fontFamily: "monospace", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "6px 8px", background: "#0a1a0a", borderRadius: 4, border: "1px solid #1a3a1a" }}>{localSquad}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: "#3a6a3a", letterSpacing: 2, marginBottom: 4 }}>LOCATION</div>
          {editing === "location"
            ? <select autoFocus value={localLocation} onChange={e => { setLocalLocation(e.target.value); save("location", e.target.value); stopEdit(); }} onBlur={() => stopEdit()} style={selectStyle}>{LOCATIONS.map(l => <option key={l}>{l}</option>)}</select>
            : <div onClick={() => startEdit("location")} style={{ color: locColor, fontFamily: "monospace", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "6px 8px", background: "#0a1a0a", borderRadius: 4, border: "1px solid #1a3a1a" }}>{localLocation}</div>}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 9, color: "#3a6a3a", letterSpacing: 2, marginBottom: 4 }}>FAULTS / DETAILS</div>
        {editing === "faults"
          ? <input ref={faultsRef} autoFocus value={localFaults} onChange={e => setLocalFaults(e.target.value)} onBlur={() => { save("faults", localFaults); stopEdit(); }} onKeyDown={e => { if (e.key === "Enter") { save("faults", localFaults); stopEdit(); } }} placeholder="Enter fault description..." style={{ ...inputStyle, color: isNMC ? "#ff8888" : "#88cc88", background: isNMC ? "#2a0a0a" : "#0a1a0a", padding: "8px 10px" }} />
          : <div onClick={() => startEdit("faults")} style={{ color: isNMC ? "#ff6666" : "#3a6a3a", fontFamily: "monospace", fontSize: 12, cursor: "pointer", padding: "8px 10px", background: "#0a1a0a", borderRadius: 4, border: `1px solid ${isNMC ? "#4a1010" : "#1a2a1a"}`, fontStyle: localFaults ? "normal" : "italic", minHeight: 36 }}>{localFaults || (isNMC ? "Tap to add fault..." : "— No faults —")}</div>}
      </div>
      {row.last_updated && <div style={{ marginTop: 8, fontSize: 10, color: "#2a5a2a", fontFamily: "monospace" }}>🕐 {row.last_updated} · {row.updated_by}</div>}
    </div>
  );
}

// ── DESKTOP ROW ───────────────────────────────────────────────────────────────
function DesktopRow({ row, onUpdate, username, editingRowId }) {
  const [editing, setEditing] = useState(null);
  const [localStatus,   setLocalStatus]   = useState(row.status);
  const [localFaults,   setLocalFaults]   = useState(row.faults);
  const [localLocation, setLocalLocation] = useState(row.location);
  const [localSquad,    setLocalSquad]    = useState(row.squad);
  const faultsRef = useRef(null);

  useEffect(() => { setLocalStatus(row.status); setLocalFaults(row.faults); setLocalLocation(row.location); setLocalSquad(row.squad); }, [row]);

  const sc = STATUS_CONFIG[localStatus] || STATUS_CONFIG.FMC;
  const isNMC = localStatus === "NMC";
  const locColor = LOCATION_CONFIG[localLocation]?.color || "#6a9a6a";
  const cell = { padding: "0 6px", fontFamily: "monospace", fontSize: 12 };

  const save = useCallback((field, value) => {
    const now = new Date();
    const ts = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString("en-US",{hour12:false})}`;
    onUpdate(row, field, value, ts, username || "OPERATOR");
  }, [row, onUpdate, username]);

  const handleStatus = (val) => {
    setLocalStatus(val); save("status", val);
    if (val === "NMC") setTimeout(() => { setEditing("faults"); faultsRef.current?.focus(); }, 80);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "36px 80px 72px 72px 130px 80px 1fr 148px 120px", alignItems: "center", borderBottom: `1px solid ${isNMC ? "#3a1010" : "#1a2a1a"}`, background: isNMC ? "rgba(255,40,40,0.06)" : "transparent", minHeight: 42 }}>
      <div style={{ ...cell, textAlign: "center", color: "#3a6a3a", fontSize: 11 }}>{row.line}</div>
      <div style={{ ...cell, color: sc.text, fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>{row.unit}</div>
      <div style={{ ...cell, color: TYPE_COLOR[row.type] || "#4a7a4a", fontSize: 10, fontWeight: 700 }}>{row.type}</div>
      <div style={{ ...cell }}>
        {editing === "squad" ? <select autoFocus value={localSquad} onChange={e => { setLocalSquad(e.target.value); save("squad", e.target.value); stopEdit(); }} onBlur={() => stopEdit()} style={selectStyle}>{SQUADS.map(s => <option key={s}>{s}</option>)}</select>
          : <span onClick={() => startEdit("squad")} style={{ color: "#7aaa7a", cursor: "pointer" }}>{localSquad}</span>}
      </div>
      <div style={{ ...cell }}>
        {editing === "location" ? <select autoFocus value={localLocation} onChange={e => { setLocalLocation(e.target.value); save("location", e.target.value); stopEdit(); }} onBlur={() => stopEdit()} style={selectStyle}>{LOCATIONS.map(l => <option key={l}>{l}</option>)}</select>
          : <span onClick={() => startEdit("location")} style={{ color: locColor, fontWeight: 700, cursor: "pointer", fontSize: 11 }}>{localLocation}</span>}
      </div>
      <div style={{ ...cell }}>
        {editing === "status" ? <select autoFocus value={localStatus} onChange={e => { handleStatus(e.target.value); }} onBlur={() => stopEdit()} style={selectStyle}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
          : <div onClick={() => startEdit("status")} style={{ cursor: "pointer" }}><StatusBadge status={localStatus} /></div>}
      </div>
      <div style={{ ...cell }}>
        {editing === "faults" ? <input ref={faultsRef} autoFocus value={localFaults} onChange={e => setLocalFaults(e.target.value)} onBlur={() => { save("faults", localFaults); stopEdit(); }} onKeyDown={e => { if (e.key === "Enter") { save("faults", localFaults); stopEdit(); } }} style={{ ...inputStyle, color: isNMC ? "#ff8888" : "#88cc88", background: isNMC ? "#2a0a0a" : "#0a1a0a" }} />
          : <span onClick={() => startEdit("faults")} style={{ color: isNMC ? "#ff6666" : "#3a6a3a", cursor: "pointer", fontStyle: localFaults ? "normal" : "italic", opacity: localFaults ? 1 : 0.5, fontSize: 12 }}>{localFaults || (isNMC ? "Click to add fault..." : "—")}</span>}
      </div>
      <div style={{ ...cell, fontSize: 10, color: "#2a5a2a", whiteSpace: "nowrap" }}>{row.last_updated || "—"}</div>
      <div style={{ ...cell, fontSize: 11, color: "#4a7a4a", fontWeight: 700 }}>{row.updated_by || "—"}</div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ rows, isMobile }) {
  const total = rows.length;
  const fmc = rows.filter(r => r.status === "FMC").length;
  const nmc = rows.filter(r => r.status === "NMC").length;
  const pct = total ? Math.round((fmc / total) * 100) : 0;

  const bySquad = ["1SQD","2SQD","3SQD","4SQD"].map(sq => {
    const s = rows.filter(r => r.squad === sq);
    return { sq, total: s.length, fmc: s.filter(r=>r.status==="FMC").length, nmc: s.filter(r=>r.status==="NMC").length };
  });

  const byType = ["TRUCK","TRAILER","MATV","LMTV"].map(t => {
    const s = rows.filter(r => r.type === t);
    return { t, total: s.length, fmc: s.filter(r=>r.status==="FMC").length, nmc: s.filter(r=>r.status==="NMC").length };
  }).filter(x => x.total > 0);

  const byLocation = LOCATIONS.map(l => {
    const s = rows.filter(r => r.location === l);
    return { l, total: s.length, fmc: s.filter(r=>r.status==="FMC").length, nmc: s.filter(r=>r.status==="NMC").length, cfg: LOCATION_CONFIG[l] };
  }).filter(x => x.total > 0);

  const nmcList = rows.filter(r => r.status === "NMC").sort((a,b) => a.unit.localeCompare(b.unit));

  const card = (title, value, color, sub) => (
    <div style={{ background: "#0a1a0a", border: `1px solid ${color}33`, borderRadius: 10, padding: "16px 20px", flex: 1, minWidth: isMobile ? "calc(50% - 6px)" : 120 }}>
      <div style={{ fontSize: 32, fontWeight: 900, color, fontFamily: "monospace" }}>{value}</div>
      <div style={{ fontSize: 11, color, letterSpacing: 2, opacity: 0.8, marginTop: 2 }}>{title}</div>
      {sub && <div style={{ fontSize: 10, color: "#3a6a3a", marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ padding: isMobile ? "12px" : "24px" }}>
      <div style={{ fontSize: 11, color: "#3a6a3a", letterSpacing: 3, marginBottom: 20 }}>FLEET DASHBOARD</div>

      {/* Top stats */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        {card("TOTAL UNITS", total, "#4a7a4a")}
        {card("FMC", fmc, "#00c44f", `${pct}% operational`)}
        {card("NMC", nmc, "#cc0000", `${100-pct}% down`)}
      </div>

      {/* Operational bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#3a6a3a", letterSpacing: 2, marginBottom: 6 }}>
          <span>OPERATIONAL RATE</span><span>{pct}%</span>
        </div>
        <div style={{ background: "#cc0000", borderRadius: 6, height: 14, overflow: "hidden" }}>
          <div style={{ background: "#00c44f", width: `${pct}%`, height: "100%", borderRadius: 6, transition: "width 0.5s" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        {/* By Squad */}
        <div style={{ flex: 1, minWidth: isMobile ? "100%" : 280 }}>
          <div style={{ fontSize: 10, color: "#3a6a3a", letterSpacing: 3, marginBottom: 10 }}>BY SQUAD</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bySquad.map(({ sq, total, fmc, nmc }) => {
              const p = total ? Math.round((fmc/total)*100) : 0;
              return (
                <div key={sq} style={{ background: "#0a1a0a", border: "1px solid #1a2a1a", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#88cc88", fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>{sq}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ background: "#00c44f", color: "#000", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 3 }}>FMC {fmc}</span>
                      {nmc > 0 && <span style={{ background: "#cc0000", color: "#fff", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 3 }}>NMC {nmc}</span>}
                    </div>
                  </div>
                  <div style={{ background: "#cc000044", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{ background: "#00c44f", width: `${p}%`, height: "100%", borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 9, color: "#3a6a3a", marginTop: 4 }}>{p}% operational · {total} units</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Type */}
        <div style={{ flex: 1, minWidth: isMobile ? "100%" : 220 }}>
          <div style={{ fontSize: 10, color: "#3a6a3a", letterSpacing: 3, marginBottom: 10 }}>BY VEHICLE TYPE</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {byType.map(({ t, total, fmc, nmc }) => (
              <div key={t} style={{ background: "#0a1a0a", border: `1px solid ${TYPE_COLOR[t]}33`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: TYPE_COLOR[t], fontFamily: "monospace", fontWeight: 900, fontSize: 13, minWidth: 70 }}>{t}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ background: "#cc000044", borderRadius: 4, height: 6, overflow: "hidden", marginBottom: 4 }}>
                    <div style={{ background: "#00c44f", width: `${total ? Math.round((fmc/total)*100) : 0}%`, height: "100%", borderRadius: 4 }} />
                  </div>
                </div>
                <span style={{ color: "#00c44f", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>{fmc}</span>
                <span style={{ color: "#3a6a3a", fontFamily: "monospace", fontSize: 11 }}>/</span>
                <span style={{ color: "#4a7a4a", fontFamily: "monospace", fontSize: 11 }}>{total}</span>
              </div>
            ))}
          </div>

          {/* By Location */}
          <div style={{ fontSize: 10, color: "#3a6a3a", letterSpacing: 3, margin: "16px 0 10px" }}>BY LOCATION</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {byLocation.map(({ l, total, fmc, nmc, cfg }) => (
              <div key={l} style={{ background: "#0a1a0a", border: `1px solid ${cfg?.color || "#333"}33`, borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>{cfg?.icon}</span>
                <span style={{ color: cfg?.color || "#888", fontFamily: "monospace", fontWeight: 700, fontSize: 11, flex: 1 }}>{l}</span>
                <span style={{ background: "#00c44f", color: "#000", fontSize: 10, fontWeight: 900, padding: "2px 6px", borderRadius: 3 }}>{fmc}</span>
                {nmc > 0 && <span style={{ background: "#cc0000", color: "#fff", fontSize: 10, fontWeight: 900, padding: "2px 6px", borderRadius: 3 }}>{nmc}</span>}
                <span style={{ color: "#3a6a3a", fontSize: 10, fontFamily: "monospace" }}>{total}u</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NMC List */}
      <div>
        <div style={{ fontSize: 10, color: "#cc0000", letterSpacing: 3, marginBottom: 10 }}>⚠ NMC UNITS ({nmcList.length})</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {nmcList.map(u => (
            <div key={u.id} style={{ background: "rgba(204,0,0,0.06)", border: "1px solid #3a1010", borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <span style={{ color: "#ff4444", fontFamily: "monospace", fontWeight: 900, fontSize: 13, minWidth: 60 }}>{u.unit}</span>
              <span style={{ color: "#cc4444", fontFamily: "monospace", fontSize: 10, background: "#1a0808", padding: "2px 6px", borderRadius: 3 }}>{u.squad}</span>
              <span style={{ color: "#ff9900", fontFamily: "monospace", fontSize: 10 }}>{u.location}</span>
              <span style={{ color: "#aa4444", fontFamily: "monospace", fontSize: 11, flex: 1 }}>{u.faults || "—"}</span>
              {u.updated_by && <span style={{ color: "#3a4a3a", fontFamily: "monospace", fontSize: 10 }}>{u.updated_by}</span>}
            </div>
          ))}
          {nmcList.length === 0 && <div style={{ color: "#00c44f", fontFamily: "monospace", fontSize: 13, letterSpacing: 2, padding: 16, textAlign: "center" }}>✓ ALL UNITS FMC</div>}
        </div>
      </div>
    </div>
  );
}

// ── HISTORY ───────────────────────────────────────────────────────────────────
function History({ isMobile }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUnit, setFilterUnit] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("fleet_history").select("*").order("changed_at", { ascending: false }).limit(200);
      if (data) setLogs(data);
      setLoading(false);
    };
    fetch();

    const ch = supabase.channel("history-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "fleet_history" }, payload => {
        setLogs(prev => [payload.new, ...prev].slice(0, 200));
      }).subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  const filtered = filterUnit ? logs.filter(l => l.unit.toLowerCase().includes(filterUnit.toLowerCase())) : logs;

  const fieldLabel = (f) => ({ status: "STATUS", faults: "FAULTS", location: "LOCATION", squad: "SQUAD" }[f] || f.toUpperCase());
  const fieldColor = (f) => ({ status: "#00aaff", faults: "#ff6600", location: "#cc44ff", squad: "#ffcc00" }[f] || "#888");

  return (
    <div style={{ padding: isMobile ? "12px" : "24px" }}>
      <div style={{ fontSize: 11, color: "#3a6a3a", letterSpacing: 3, marginBottom: 16 }}>CHANGE LOG</div>
      <input value={filterUnit} onChange={e => setFilterUnit(e.target.value)} placeholder="Filter by unit (e.g. C-210)..." style={{ ...inputStyle, maxWidth: 280, marginBottom: 16, fontSize: 12 }} />

      {loading && <div style={{ color: "#3a6a3a", fontFamily: "monospace", letterSpacing: 2 }}>LOADING...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ color: "#2a5a2a", fontFamily: "monospace", fontSize: 12, letterSpacing: 2, padding: 24, textAlign: "center" }}>NO CHANGES RECORDED YET</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.map(log => {
          const date = new Date(log.changed_at);
          const ts = `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()} ${date.toLocaleTimeString("en-US",{hour12:false})}`;
          const fc = fieldColor(log.field_changed);
          return (
            <div key={log.id} style={{ background: "#080f08", border: "1px solid #1a2a1a", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <span style={{ color: "#00ff6a", fontFamily: "monospace", fontWeight: 900, fontSize: 13, minWidth: 60 }}>{log.unit}</span>
              <span style={{ color: fc, fontFamily: "monospace", fontSize: 10, background: "#0a1a0a", padding: "2px 8px", borderRadius: 3, fontWeight: 700 }}>{fieldLabel(log.field_changed)}</span>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {log.old_value && <span style={{ color: "#cc0000", fontFamily: "monospace", fontSize: 11, textDecoration: "line-through", opacity: 0.7 }}>{log.old_value}</span>}
                {log.old_value && <span style={{ color: "#3a6a3a", fontSize: 12 }}>→</span>}
                <span style={{ color: "#88cc88", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>{log.new_value || "—"}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: "#5a8a5a", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>{log.changed_by}</span>
                <span style={{ color: "#2a5a2a", fontFamily: "monospace", fontSize: 10, whiteSpace: "nowrap" }}>{ts}</span>
              </div>
            </div>
          );
        })}
      </div>
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
      <div style={{ fontSize: 11, color: "#3a6a3a", letterSpacing: 3, marginBottom: 16 }}>LOCATION BREAKDOWN</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {active.map(loc => {
          const lcfg = LOCATION_CONFIG[loc] || { color: "#888", icon: "📍" };
          const units = grouped[loc];
          const fmc = units.filter(u => u.status === "FMC").length;
          const nmc = units.filter(u => u.status === "NMC").length;
          return (
            <div key={loc} style={{ background: "#0a1a0a", border: `1px solid ${lcfg.color}44`, borderRadius: 8, padding: "10px 14px", minWidth: isMobile ? "calc(50% - 4px)" : 140, flex: isMobile ? "1 1 calc(50% - 4px)" : "0 0 auto" }}>
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
          const lcfg = LOCATION_CONFIG[loc] || { color: "#888", icon: "📍", desc: loc };
          const units = grouped[loc];
          const byType = TYPES.map(t => ({ t, items: units.filter(u => u.type === t) })).filter(x => x.items.length > 0);
          return (
            <div key={loc} style={{ background: "#080f08", border: `1px solid ${lcfg.color}33`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ background: `${lcfg.color}15`, borderBottom: `1px solid ${lcfg.color}33`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{lcfg.icon}</span>
                <div>
                  <div style={{ color: lcfg.color, fontWeight: 900, fontSize: 14, letterSpacing: 2 }}>{loc}</div>
                  <div style={{ color: "#4a7a4a", fontSize: 10 }}>{lcfg.desc} · {units.length} UNITS</div>
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
                            <span style={{ fontSize: 10, color: "#4a7a4a", fontFamily: "monospace" }}>{unit.squad}</span>
                            {unit.faults && <span style={{ fontSize: 11, color: unit.status==="NMC"?"#ff6666":"#5a8a5a", fontFamily: "monospace", flex: 1 }}>⚠ {unit.faults}</span>}
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

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function OutlawsTracker() {
  const [rows,         setRows]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [username,     setUsername]     = useState(() => localStorage.getItem("outlaws-username") || "");
  const [tab,          setTab]          = useState("tracker");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType,   setFilterType]   = useState("ALL");
  const [search,       setSearch]       = useState("");
  const [showPrompt,   setShowPrompt]   = useState(!localStorage.getItem("outlaws-username"));
  const [nameInput,    setNameInput]    = useState("");
  const [isMobile,     setIsMobile]     = useState(window.innerWidth < 768);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  // Tracks which row the user is actively editing so sync never overwrites it
  const editingRowId = useRef(null);

  useEffect(() => {
    const fetchRows = async () => {
      const { data, error } = await supabase.from("fleet").select("*").order("line", { ascending: true });
      if (!error && data) {
        setRows(prev => data.map(serverRow => {
          if (editingRowId.current === serverRow.id) {
            return prev.find(r => r.id === serverRow.id) || serverRow;
          }
          return serverRow;
        }));
        setLoading(false);
      }
    };
    fetchRows();

    const channel = supabase.channel("fleet-realtime", { config: { broadcast: { self: false } } })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "fleet" }, payload => {
        if (editingRowId.current === payload.new.id) return;
        setRows(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
      })
      .subscribe();

    // Poll every 8 seconds — editing rows are protected from overwrite
    const poll = setInterval(fetchRows, 8000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, []);

  const handleUpdate = useCallback(async (row, field, value, ts, user) => {
    const oldValue = row[field] || "";
    const changes = { [field]: value, last_updated: ts, updated_by: user };
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, ...changes } : r));
    await supabase.from("fleet").update(changes).eq("id", row.id);
    // Log to history
    await supabase.from("fleet_history").insert({
      unit: row.unit, type: row.type, squad: row.squad,
      field_changed: field, old_value: oldValue, new_value: value,
      changed_by: user
    });
  }, []);

  const commitName = () => {
    const n = nameInput.trim().toUpperCase() || "OPERATOR";
    setUsername(n); localStorage.setItem("outlaws-username", n); setShowPrompt(false);
  };

  const filtered = rows.filter(r => {
    if (filterStatus !== "ALL" && r.status !== filterStatus) return false;
    if (filterType   !== "ALL" && r.type   !== filterType)   return false;
    if (search && !r.unit.includes(search.toUpperCase()) && !r.faults?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = { fmc: rows.filter(r=>r.status==="FMC").length, nmc: rows.filter(r=>r.status==="NMC").length, total: rows.length };
  const hCol = { fontFamily: "monospace", fontSize: 10, color: "#4a7a4a", letterSpacing: 2, padding: "10px 6px" };

  const TABS = [
    { id: "tracker",   icon: "📋", label: isMobile ? "TRACKER"   : "TRACKER" },
    { id: "dashboard", icon: "📊", label: isMobile ? "DASH"      : "DASHBOARD" },
    { id: "locations", icon: "📍", label: isMobile ? "LOCATIONS" : "LOCATION BREAKDOWN" },
    { id: "history",   icon: "🕐", label: isMobile ? "LOG"       : "CHANGE LOG" },
  ];

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#050d05", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 32 }}>☠</div>
      <div style={{ color: "#00ff6a", fontFamily: "monospace", letterSpacing: 4, fontSize: 14 }}>LOADING...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#050d05", color: "#88cc88", fontFamily: "monospace" }}>

      {/* NAME PROMPT */}
      {showPrompt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: "#0a1a0a", border: "1px solid #2a4a2a", borderRadius: 12, padding: 32, textAlign: "center", maxWidth: 340, width: "100%" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🪖</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#00ff6a", letterSpacing: 3, marginBottom: 6 }}>OUTLAWS TRACKER</div>
            <div style={{ color: "#5a8a5a", fontSize: 12, marginBottom: 20 }}>Enter your callsign</div>
            <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === "Enter" && commitName()} placeholder="e.g. 2LT.EVANS" style={{ ...inputStyle, fontSize: 16, textAlign: "center", marginBottom: 14, color: "#00ff6a", letterSpacing: 2, padding: "10px" }} />
            <button onClick={commitName} style={{ background: "#00c44f", color: "#000", border: "none", borderRadius: 6, padding: "12px", fontFamily: "monospace", fontWeight: 700, fontSize: 15, letterSpacing: 2, cursor: "pointer", width: "100%" }}>LOG IN</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: "#061006", borderBottom: "2px solid #1a3a1a", padding: isMobile ? "10px 14px" : "14px 24px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 900, color: "#00ff6a", letterSpacing: 4 }}>☠ OUTLAWS</div>
          <div style={{ fontSize: 9, color: "#4a7a4a", letterSpacing: 2 }}>MAINTENANCE TRACKER</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[{ l: "FMC", v: stats.fmc, c: "#00c44f" }, { l: "NMC", v: stats.nmc, c: "#cc0000" }, { l: "TOTAL", v: stats.total, c: "#4a7a4a" }].map(s => (
            <div key={s.l} style={{ background: "#0a1a0a", border: `1px solid ${s.c}33`, borderRadius: 6, padding: "4px 10px", textAlign: "center", minWidth: 44 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 8, color: s.c, letterSpacing: 1 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00ff6a", boxShadow: "0 0 5px #00ff6a" }} />
          <span style={{ fontSize: 11, color: "#00ff6a", fontWeight: 700, cursor: "pointer" }} onClick={() => setShowPrompt(true)}>{username || "—"}</span>
        </div>
      </div>

      {/* TABS */}
      <div style={{ background: "#060e06", borderBottom: "1px solid #1a2a1a", display: "flex", overflowX: "auto" }}>
        {TABS.map(({ id, icon, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{ background: tab===id ? "#0f2a0f" : "transparent", color: tab===id ? "#00ff6a" : "#3a6a3a", border: "none", borderBottom: tab===id ? "2px solid #00ff6a" : "2px solid transparent", padding: isMobile ? "10px 12px" : "10px 20px", fontFamily: "monospace", fontWeight: tab===id ? 700 : 400, fontSize: isMobile ? 11 : 12, letterSpacing: 1, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* TRACKER TAB */}
      {tab === "tracker" && <>
        <div style={{ background: "#060e06", borderBottom: "1px solid #1a2a1a", padding: isMobile ? "8px 12px" : "10px 24px", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {["ALL","FMC","NMC"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{ background: filterStatus===s ? (s==="FMC"?"#00c44f":s==="NMC"?"#cc0000":"#2a4a2a") : "#0a1a0a", color: filterStatus===s?"#fff":"#5a8a5a", border: "1px solid #2a4a2a", borderRadius: 4, padding: "5px 12px", fontFamily: "monospace", fontWeight: 700, fontSize: 12, letterSpacing: 2, cursor: "pointer" }}>{s}</button>
          ))}
          <div style={{ width: 1, background: "#1a3a1a", height: 22 }} />
          {["ALL","TRUCK","TRAILER","MATV","LMTV"].map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{ background: filterType===t ? "#1a3a1a" : "#0a1a0a", color: filterType===t ? (TYPE_COLOR[t]||"#88cc88") : "#4a6a4a", border: "1px solid #2a4a2a", borderRadius: 4, padding: "5px 10px", fontFamily: "monospace", fontSize: 11, cursor: "pointer", fontWeight: filterType===t?700:400 }}>{t}</button>
          ))}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ ...inputStyle, flex: 1, minWidth: 80, maxWidth: 200, fontSize: 12 }} />
          <span style={{ fontSize: 10, color: "#2a5a2a" }}>{filtered.length}</span>
        </div>

        {!isMobile && (
          <div style={{ display: "grid", gridTemplateColumns: "36px 80px 72px 72px 130px 80px 1fr 148px 120px", background: "#050d05", borderBottom: "1px solid #1a3a1a", position: "sticky", top: 0, zIndex: 10 }}>
            {["#","UNIT","TYPE","SQUAD","LOCATION","STATUS","FAULTS / DETAILS","LAST UPDATED","UPDATED BY"].map((h, i) => (
              <div key={i} style={{ ...hCol, textAlign: i===0?"center":"left" }}>{h}</div>
            ))}
          </div>
        )}

        <div style={{ paddingBottom: isMobile ? 80 : 0 }}>
          {filtered.map(row => isMobile
            ? <MobileCard key={row.id} row={row} onUpdate={handleUpdate} username={username} editingRowId={editingRowId} />
            : <DesktopRow key={row.id} row={row} onUpdate={handleUpdate} username={username} editingRowId={editingRowId} />
          )}
          {filtered.length === 0 && <div style={{ textAlign: "center", padding: 48, color: "#2a5a2a", letterSpacing: 3 }}>NO RECORDS MATCH</div>}
        </div>
      </>}

      {tab === "dashboard"  && <Dashboard rows={rows} isMobile={isMobile} />}
      {tab === "locations"  && <LocationBreakdown rows={rows} isMobile={isMobile} />}
      {tab === "history"    && <History isMobile={isMobile} />}
    </div>
  );
}
