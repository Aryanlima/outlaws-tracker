import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";

const SQUADS = ["1SQD", "2SQD", "3SQD", "4SQD"];
const LOCATIONS = ["AMP", "BMP", "CMP", "MAINTENANCE BAY", "MISSION"];
const STATUSES = ["FMC", "NMC"];

const LOCATION_CONFIG = {
  AMP:               { color: "#cc44ff", icon: "⚙️",  label: "AMP",             desc: "Area Motor Pool" },
  BMP:               { color: "#ff9900", icon: "🔧", label: "BMP",             desc: "Battalion Motor Pool" },
  CMP:               { color: "#00aaff", icon: "🏠", label: "CMP",             desc: "Company Motor Pool" },
  "MAINTENANCE BAY": { color: "#ff6600", icon: "🛠️", label: "MAINTENANCE BAY", desc: "Maintenance Bay" },
  MISSION:           { color: "#ffd700", icon: "🎯", label: "MISSION",         desc: "On Mission" },
};

const STATUS_CONFIG = {
  FMC: { badge: "#00c44f", text: "#00ff6a", bg: "rgba(0,196,79,0.08)" },
  NMC: { badge: "#cc0000", text: "#ff4444", bg: "rgba(204,0,0,0.08)" },
};

const inputStyle = {
  background: "#0a1a0a", border: "1px solid #2a4a2a", borderRadius: 3,
  padding: "4px 8px", fontSize: 13, fontFamily: "monospace",
  outline: "none", width: "100%", boxSizing: "border-box", color: "#88cc88",
};

const selectStyle = {
  background: "#0a1a0a", color: "#88cc88", border: "1px solid #2a4a2a",
  borderRadius: 3, padding: "6px 8px", fontSize: 13, fontFamily: "monospace",
  outline: "none", width: "100%",
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.FMC;
  return (
    <span style={{ background: cfg.badge, color: "#fff", fontFamily: "monospace", fontWeight: 900, fontSize: 12, letterSpacing: 2, padding: "4px 12px", borderRadius: 4, display: "inline-block", minWidth: 50, textAlign: "center" }}>
      {status || "FMC"}
    </span>
  );
}

// ── MOBILE CARD ────────────────────────────────────────────────────────────────
function MobileCard({ row, onUpdate, username }) {
  const [editing, setEditing] = useState(null);
  const [localStatus,   setLocalStatus]   = useState(row.status);
  const [localFaults,   setLocalFaults]   = useState(row.faults);
  const [localLocation, setLocalLocation] = useState(row.location);
  const [localSquad,    setLocalSquad]    = useState(row.squad);
  const faultsRef = useRef(null);

  useEffect(() => {
    setLocalStatus(row.status); setLocalFaults(row.faults);
    setLocalLocation(row.location); setLocalSquad(row.squad);
  }, [row]);

  const isNMC = localStatus === "NMC";
  const sc = STATUS_CONFIG[localStatus] || STATUS_CONFIG.FMC;
  const locColor = LOCATION_CONFIG[localLocation]?.color || "#6a9a6a";

  const save = useCallback((field, value) => {
    const now = new Date();
    const ts = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString("en-US",{hour12:false})}`;
    onUpdate(row.id, { [field]: value, last_updated: ts, updated_by: username || "OPERATOR" });
  }, [row.id, onUpdate, username]);

  const handleStatus = (val) => {
    setLocalStatus(val); save("status", val);
    if (val === "NMC") setTimeout(() => { setEditing("faults"); faultsRef.current?.focus(); }, 80);
  };

  return (
    <div style={{ background: isNMC ? "rgba(255,30,30,0.07)" : "#080f08", border: `1px solid ${isNMC ? "#4a1010" : "#1a2a1a"}`, borderRadius: 10, margin: "8px 12px", padding: "12px 14px", transition: "all 0.2s" }}>
      {/* Top row: number + unit + type + status */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ color: "#3a6a3a", fontSize: 11, fontFamily: "monospace", minWidth: 20 }}>{row.line}</span>
        <span style={{ color: sc.text, fontWeight: 900, fontSize: 16, fontFamily: "monospace", letterSpacing: 1 }}>{row.unit}</span>
        <span style={{ color: "#4a7a4a", fontSize: 10, fontFamily: "monospace", background: "#0f1f0f", padding: "2px 8px", borderRadius: 4 }}>{row.type}</span>
        <div style={{ marginLeft: "auto" }} onClick={() => setEditing("status")}>
          <StatusBadge status={localStatus} />
        </div>
      </div>

      {/* Status select when editing */}
      {editing === "status" && (
        <select autoFocus value={localStatus} onChange={e => { handleStatus(e.target.value); setEditing(null); }} onBlur={() => setEditing(null)} style={{ ...selectStyle, marginBottom: 10 }}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )}

      {/* Middle row: squad + location */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: "#3a6a3a", letterSpacing: 2, marginBottom: 4 }}>SQUAD</div>
          {editing === "squad"
            ? <select autoFocus value={localSquad} onChange={e => { setLocalSquad(e.target.value); save("squad", e.target.value); setEditing(null); }} onBlur={() => setEditing(null)} style={selectStyle}>{SQUADS.map(s => <option key={s}>{s}</option>)}</select>
            : <div onClick={() => setEditing("squad")} style={{ color: "#7aaa7a", fontFamily: "monospace", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "6px 8px", background: "#0a1a0a", borderRadius: 4, border: "1px solid #1a3a1a" }}>{localSquad}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: "#3a6a3a", letterSpacing: 2, marginBottom: 4 }}>LOCATION</div>
          {editing === "location"
            ? <select autoFocus value={localLocation} onChange={e => { setLocalLocation(e.target.value); save("location", e.target.value); setEditing(null); }} onBlur={() => setEditing(null)} style={selectStyle}>{LOCATIONS.map(l => <option key={l}>{l}</option>)}</select>
            : <div onClick={() => setEditing("location")} style={{ color: locColor, fontFamily: "monospace", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "6px 8px", background: "#0a1a0a", borderRadius: 4, border: "1px solid #1a3a1a" }}>{localLocation}</div>}
        </div>
      </div>

      {/* Faults */}
      <div>
        <div style={{ fontSize: 9, color: "#3a6a3a", letterSpacing: 2, marginBottom: 4 }}>FAULTS / DETAILS</div>
        {editing === "faults"
          ? <input ref={faultsRef} autoFocus value={localFaults} onChange={e => setLocalFaults(e.target.value)}
              onBlur={() => { save("faults", localFaults); setEditing(null); }}
              onKeyDown={e => { if (e.key === "Enter") { save("faults", localFaults); setEditing(null); } }}
              placeholder="Enter fault description..."
              style={{ ...inputStyle, color: isNMC ? "#ff8888" : "#88cc88", background: isNMC ? "#2a0a0a" : "#0a1a0a", fontSize: 13, padding: "8px 10px" }} />
          : <div onClick={() => setEditing("faults")} style={{ color: isNMC ? "#ff6666" : "#3a6a3a", fontFamily: "monospace", fontSize: 12, cursor: "pointer", padding: "8px 10px", background: "#0a1a0a", borderRadius: 4, border: `1px solid ${isNMC ? "#4a1010" : "#1a2a1a"}`, fontStyle: localFaults ? "normal" : "italic", minHeight: 36 }}>
              {localFaults || (isNMC ? "Tap to add fault..." : "— No faults —")}
            </div>}
      </div>

      {/* Footer: updated by */}
      {row.last_updated && (
        <div style={{ marginTop: 8, display: "flex", gap: 8, fontSize: 10, color: "#2a5a2a", fontFamily: "monospace" }}>
          <span>🕐 {row.last_updated}</span>
          {row.updated_by && <span>· {row.updated_by}</span>}
        </div>
      )}
    </div>
  );
}

// ── DESKTOP ROW ────────────────────────────────────────────────────────────────
function DesktopRow({ row, onUpdate, username }) {
  const [editing, setEditing] = useState(null);
  const [localStatus,   setLocalStatus]   = useState(row.status);
  const [localFaults,   setLocalFaults]   = useState(row.faults);
  const [localLocation, setLocalLocation] = useState(row.location);
  const [localSquad,    setLocalSquad]    = useState(row.squad);
  const faultsRef = useRef(null);

  useEffect(() => {
    setLocalStatus(row.status); setLocalFaults(row.faults);
    setLocalLocation(row.location); setLocalSquad(row.squad);
  }, [row]);

  const sc = STATUS_CONFIG[localStatus] || STATUS_CONFIG.FMC;
  const isNMC = localStatus === "NMC";
  const locColor = LOCATION_CONFIG[localLocation]?.color || "#6a9a6a";

  const save = useCallback((field, value) => {
    const now = new Date();
    const ts = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString("en-US",{hour12:false})}`;
    onUpdate(row.id, { [field]: value, last_updated: ts, updated_by: username || "OPERATOR" });
  }, [row.id, onUpdate, username]);

  const handleStatus = (val) => {
    setLocalStatus(val); save("status", val);
    if (val === "NMC") setTimeout(() => { setEditing("faults"); faultsRef.current?.focus(); }, 80);
  };

  const cell = { padding: "0 6px", fontFamily: "monospace", fontSize: 12 };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "36px 80px 72px 72px 130px 80px 1fr 148px 120px", alignItems: "center", borderBottom: `1px solid ${isNMC ? "#3a1010" : "#1a2a1a"}`, background: isNMC ? "rgba(255,40,40,0.06)" : "transparent", minHeight: 42 }}>
      <div style={{ ...cell, textAlign: "center", color: "#3a6a3a", fontSize: 11 }}>{row.line}</div>
      <div style={{ ...cell, color: sc.text, fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>{row.unit}</div>
      <div style={{ ...cell, color: "#4a7a4a", fontSize: 10 }}>{row.type}</div>
      <div style={{ ...cell }}>
        {editing === "squad"
          ? <select autoFocus value={localSquad} onChange={e => { setLocalSquad(e.target.value); save("squad", e.target.value); setEditing(null); }} onBlur={() => setEditing(null)} style={selectStyle}>{SQUADS.map(s => <option key={s}>{s}</option>)}</select>
          : <span onClick={() => setEditing("squad")} style={{ color: "#7aaa7a", cursor: "pointer" }}>{localSquad}</span>}
      </div>
      <div style={{ ...cell }}>
        {editing === "location"
          ? <select autoFocus value={localLocation} onChange={e => { setLocalLocation(e.target.value); save("location", e.target.value); setEditing(null); }} onBlur={() => setEditing(null)} style={selectStyle}>{LOCATIONS.map(l => <option key={l}>{l}</option>)}</select>
          : <span onClick={() => setEditing("location")} style={{ color: locColor, fontWeight: 700, cursor: "pointer", fontSize: 11 }}>{localLocation}</span>}
      </div>
      <div style={{ ...cell }}>
        {editing === "status"
          ? <select autoFocus value={localStatus} onChange={e => { handleStatus(e.target.value); setEditing(null); }} onBlur={() => setEditing(null)} style={selectStyle}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
          : <div onClick={() => setEditing("status")} style={{ cursor: "pointer" }}><StatusBadge status={localStatus} /></div>}
      </div>
      <div style={{ ...cell }}>
        {editing === "faults"
          ? <input ref={faultsRef} autoFocus value={localFaults} onChange={e => setLocalFaults(e.target.value)} onBlur={() => { save("faults", localFaults); setEditing(null); }} onKeyDown={e => { if (e.key === "Enter") { save("faults", localFaults); setEditing(null); } }} placeholder={isNMC ? "Enter fault..." : "No faults"} style={{ ...inputStyle, color: isNMC ? "#ff8888" : "#88cc88", background: isNMC ? "#2a0a0a" : "#0a1a0a" }} />
          : <span onClick={() => setEditing("faults")} style={{ color: isNMC ? "#ff6666" : "#3a6a3a", cursor: "pointer", fontStyle: localFaults ? "normal" : "italic", opacity: localFaults ? 1 : 0.5, fontSize: 12 }}>{localFaults || (isNMC ? "Click to add fault..." : "—")}</span>}
      </div>
      <div style={{ ...cell, fontSize: 10, color: "#2a5a2a", whiteSpace: "nowrap" }}>{row.last_updated || "—"}</div>
      <div style={{ ...cell, fontSize: 11, color: "#4a7a4a", fontWeight: 700 }}>{row.updated_by || "—"}</div>
    </div>
  );
}

// ── LOCATION BREAKDOWN ─────────────────────────────────────────────────────────
function LocationBreakdown({ rows, isMobile }) {
  const grouped = {};
  LOCATIONS.forEach(l => { grouped[l] = []; });
  rows.forEach(r => { const loc = r.location || "CMP"; if (!grouped[loc]) grouped[loc] = []; grouped[loc].push(r); });
  const active = LOCATIONS.filter(l => grouped[l]?.length > 0);

  return (
    <div style={{ padding: isMobile ? "12px" : "24px" }}>
      <div style={{ fontSize: 11, color: "#3a6a3a", letterSpacing: 3, marginBottom: 16 }}>LOCATION BREAKDOWN</div>

      {/* Summary cards */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {active.map(loc => {
          const lcfg = LOCATION_CONFIG[loc] || { color: "#888", icon: "📍", label: loc, desc: loc };
          const units = grouped[loc];
          const fmc = units.filter(u => u.status === "FMC").length;
          const nmc = units.filter(u => u.status === "NMC").length;
          return (
            <div key={loc} style={{ background: "#0a1a0a", border: `1px solid ${lcfg.color}44`, borderRadius: 8, padding: "10px 14px", minWidth: isMobile ? "calc(50% - 4px)" : 140, flex: isMobile ? "1 1 calc(50% - 4px)" : "0 0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>{lcfg.icon}</span>
                <span style={{ color: lcfg.color, fontWeight: 900, fontSize: 12, letterSpacing: 2 }}>{lcfg.label}</span>
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

      {/* Detail sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {active.map(loc => {
          const lcfg = LOCATION_CONFIG[loc] || { color: "#888", icon: "📍", label: loc, desc: loc };
          const units = grouped[loc];
          const trucks = units.filter(u => u.type === "TRUCK");
          const trailers = units.filter(u => u.type === "TRAILER");
          return (
            <div key={loc} style={{ background: "#080f08", border: `1px solid ${lcfg.color}33`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ background: `${lcfg.color}15`, borderBottom: `1px solid ${lcfg.color}33`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{lcfg.icon}</span>
                <div>
                  <div style={{ color: lcfg.color, fontWeight: 900, fontSize: 14, letterSpacing: 2 }}>{lcfg.label}</div>
                  <div style={{ color: "#4a7a4a", fontSize: 10 }}>{lcfg.desc} · {units.length} UNITS</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  {["FMC", "NMC"].map(s => { const count = units.filter(u => u.status === s).length; if (!count) return null; return <span key={s} style={{ background: STATUS_CONFIG[s].badge, color: s === "FMC" ? "#000" : "#fff", fontSize: 11, fontWeight: 900, padding: "3px 10px", borderRadius: 4 }}>{s} {count}</span>; })}
                </div>
              </div>
              <div style={{ padding: "12px 16px", display: "flex", gap: 12, flexWrap: "wrap" }}>
                {[["🚛 TRUCKS", trucks], ["🚚 TRAILERS", trailers]].map(([label, items]) => items.length > 0 && (
                  <div key={label} style={{ flex: 1, minWidth: isMobile ? "100%" : 240 }}>
                    <div style={{ fontSize: 10, color: "#3a6a3a", letterSpacing: 2, marginBottom: 6 }}>{label}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {items.map(unit => {
                        const sc = STATUS_CONFIG[unit.status] || STATUS_CONFIG.FMC;
                        return (
                          <div key={unit.id} style={{ display: "flex", alignItems: "center", gap: 8, background: sc.bg, border: `1px solid ${sc.badge}33`, borderRadius: 6, padding: "8px 10px", flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 13, color: sc.text, minWidth: 50 }}>{unit.unit}</span>
                            <StatusBadge status={unit.status} />
                            <span style={{ fontSize: 10, color: "#4a7a4a", fontFamily: "monospace" }}>{unit.squad}</span>
                            {unit.faults && <span style={{ fontSize: 11, color: unit.status === "NMC" ? "#ff6666" : "#5a8a5a", fontFamily: "monospace", flex: 1 }}>⚠ {unit.faults}</span>}
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

// ── MAIN APP ───────────────────────────────────────────────────────────────────
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

  useEffect(() => {
    const fetchRows = async () => {
      const { data, error } = await supabase.from("fleet").select("*").order("line", { ascending: true });
      if (!error && data) setRows(data);
      setLoading(false);
    };
    fetchRows();

    const channel = supabase.channel("fleet-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "fleet" }, (payload) => {
        if (payload.eventType === "UPDATE") setRows(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleUpdate = useCallback(async (id, changes) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r));
    await supabase.from("fleet").update(changes).eq("id", id);
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

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#050d05", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 32 }}>☠</div>
      <div style={{ color: "#00ff6a", fontFamily: "monospace", letterSpacing: 4, fontSize: 14 }}>LOADING TRACKER...</div>
    </div>
  );

  const hCol = { fontFamily: "monospace", fontSize: 10, color: "#4a7a4a", letterSpacing: 2, padding: "10px 6px" };

  return (
    <div style={{ minHeight: "100vh", background: "#050d05", color: "#88cc88", fontFamily: "monospace" }}>

      {/* NAME PROMPT */}
      {showPrompt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: "#0a1a0a", border: "1px solid #2a4a2a", borderRadius: 12, padding: 32, textAlign: "center", maxWidth: 340, width: "100%" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🪖</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#00ff6a", letterSpacing: 3, marginBottom: 6 }}>OUTLAWS TRACKER</div>
            <div style={{ color: "#5a8a5a", fontSize: 12, marginBottom: 20 }}>Enter your callsign</div>
            <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === "Enter" && commitName()} placeholder="e.g. 2LT.EVANS"
              style={{ ...inputStyle, fontSize: 16, textAlign: "center", marginBottom: 14, color: "#00ff6a", letterSpacing: 2, padding: "10px" }} />
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
      <div style={{ background: "#060e06", borderBottom: "1px solid #1a2a1a", display: "flex" }}>
        {[["tracker", "📋", isMobile ? "TRACKER" : "TRACKER"], ["locations", "📍", isMobile ? "LOCATIONS" : "LOCATION BREAKDOWN"]].map(([id, icon, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ background: tab === id ? "#0f2a0f" : "transparent", color: tab === id ? "#00ff6a" : "#3a6a3a", border: "none", borderBottom: tab === id ? "2px solid #00ff6a" : "2px solid transparent", padding: isMobile ? "10px 16px" : "10px 20px", fontFamily: "monospace", fontWeight: tab === id ? 700 : 400, fontSize: isMobile ? 11 : 12, letterSpacing: 2, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* TRACKER TAB */}
      {tab === "tracker" && <>
        {/* Filters */}
        <div style={{ background: "#060e06", borderBottom: "1px solid #1a2a1a", padding: isMobile ? "8px 12px" : "10px 24px", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {!isMobile && <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search unit or fault..." style={{ ...inputStyle, width: 180, fontSize: 12 }} />}
          {["ALL", "FMC", "NMC"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{ background: filterStatus === s ? (s === "FMC" ? "#00c44f" : s === "NMC" ? "#cc0000" : "#2a4a2a") : "#0a1a0a", color: filterStatus === s ? "#fff" : "#5a8a5a", border: "1px solid #2a4a2a", borderRadius: 4, padding: isMobile ? "6px 14px" : "5px 14px", fontFamily: "monospace", fontWeight: 700, fontSize: 12, letterSpacing: 2, cursor: "pointer" }}>{s}</button>
          ))}
          <div style={{ width: 1, background: "#1a3a1a", height: 22 }} />
          {["ALL", "TRUCK", "TRAILER"].map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{ background: filterType === t ? "#1a3a1a" : "#0a1a0a", color: filterType === t ? "#88cc88" : "#4a6a4a", border: "1px solid #2a4a2a", borderRadius: 4, padding: isMobile ? "6px 10px" : "5px 12px", fontFamily: "monospace", fontSize: 11, cursor: "pointer" }}>{t}</button>
          ))}
          {isMobile && <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ ...inputStyle, flex: 1, minWidth: 80, fontSize: 12 }} />}
          <span style={{ fontSize: 10, color: "#2a5a2a", marginLeft: "auto" }}>{filtered.length}</span>
        </div>

        {/* Desktop table header */}
        {!isMobile && (
          <div style={{ display: "grid", gridTemplateColumns: "36px 80px 72px 72px 130px 80px 1fr 148px 120px", background: "#050d05", borderBottom: "1px solid #1a3a1a", position: "sticky", top: 0, zIndex: 10 }}>
            {["#", "UNIT", "TYPE", "SQUAD", "LOCATION", "STATUS", "FAULTS / DETAILS", "LAST UPDATED", "UPDATED BY"].map((h, i) => (
              <div key={i} style={{ ...hCol, textAlign: i === 0 ? "center" : "left" }}>{h}</div>
            ))}
          </div>
        )}

        {/* Rows / Cards */}
        <div style={{ paddingBottom: isMobile ? 80 : 0 }}>
          {filtered.map(row => isMobile
            ? <MobileCard key={row.id} row={row} onUpdate={handleUpdate} username={username} />
            : <DesktopRow key={row.id} row={row} onUpdate={handleUpdate} username={username} />
          )}
          {filtered.length === 0 && <div style={{ textAlign: "center", padding: 48, color: "#2a5a2a", letterSpacing: 3 }}>NO RECORDS MATCH</div>}
        </div>
      </>}

      {tab === "locations" && <LocationBreakdown rows={rows} isMobile={isMobile} />}

      {!isMobile && (
        <div style={{ borderTop: "1px solid #1a2a1a", padding: "10px 24px", fontSize: 10, color: "#2a4a2a", letterSpacing: 2, display: "flex", justifyContent: "space-between" }}>
          <span>TAP ANY FIELD TO EDIT · NMC AUTO-JUMPS TO FAULTS · LIVE SYNC</span>
          <span>OUTLAWS CO.</span>
        </div>
      )}
    </div>
  );
}
