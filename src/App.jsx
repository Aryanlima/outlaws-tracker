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

const selectStyle = {
  background: "#0a1a0a", color: "#88cc88", border: "1px solid #2a4a2a",
  borderRadius: 3, padding: "3px 6px", fontSize: 12, fontFamily: "monospace",
  outline: "none", width: "100%",
};
const inputStyle = {
  background: "#0a1a0a", border: "1px solid #2a4a2a", borderRadius: 3,
  padding: "4px 8px", fontSize: 12, fontFamily: "monospace",
  outline: "none", width: "100%", boxSizing: "border-box",
};
const cellText = { fontFamily: "monospace", fontSize: 12, display: "block" };

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.FMC;
  return (
    <span style={{ background: cfg.badge, color: "#fff", fontFamily: "'Courier New',monospace", fontWeight: 900, fontSize: 11, letterSpacing: 2, padding: "3px 10px", borderRadius: 3, display: "inline-block", minWidth: 44, textAlign: "center" }}>
      {status || "FMC"}
    </span>
  );
}

function TrackerRow({ row, onUpdate, username }) {
  const [editing, setEditing] = useState(null);
  const [localStatus,   setLocalStatus]   = useState(row.status);
  const [localFaults,   setLocalFaults]   = useState(row.faults);
  const [localLocation, setLocalLocation] = useState(row.location);
  const [localSquad,    setLocalSquad]    = useState(row.squad);
  const faultsRef = useRef(null);

  useEffect(() => {
    setLocalStatus(row.status);
    setLocalFaults(row.faults);
    setLocalLocation(row.location);
    setLocalSquad(row.squad);
  }, [row]);

  const cfg   = STATUS_CONFIG[localStatus] || STATUS_CONFIG.FMC;
  const isNMC = localStatus === "NMC";

  const save = useCallback((field, value) => {
    const now = new Date();
    const ts  = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString("en-US",{hour12:false})}`;
    onUpdate(row.id, { [field]: value, last_updated: ts, updated_by: username || "OPERATOR" });
  }, [row.id, onUpdate, username]);

  const handleStatus = (val) => {
    setLocalStatus(val); save("status", val);
    if (val === "NMC") {
      setTimeout(() => { setEditing("faults"); faultsRef.current?.focus(); }, 80);
    }
  };

  const locColor = LOCATION_CONFIG[localLocation]?.color || "#6a9a6a";

  return (
    <div style={{ display:"grid", gridTemplateColumns:"42px 90px 80px 80px 140px 90px 1fr 160px 140px", alignItems:"center", borderBottom:`1px solid ${isNMC?"#3a1010":"#1a2a1a"}`, background:isNMC?"rgba(255,40,40,0.06)":"transparent", transition:"background 0.3s", minHeight:42 }}>
      <div style={{ textAlign:"center", color:"#4a6a4a", fontSize:11, fontFamily:"monospace" }}>{row.line}</div>
      <div style={{ fontFamily:"'Courier New',monospace", fontWeight:700, fontSize:13, color:cfg.text, padding:"0 8px", letterSpacing:1 }}>{row.unit}</div>
      <div style={{ fontSize:10, color:"#5a8a5a", fontFamily:"monospace", letterSpacing:1, paddingLeft:4 }}>{row.type}</div>

      <div style={{ padding:"0 4px" }}>
        {editing==="squad"
          ? <select autoFocus value={localSquad} onChange={e=>{setLocalSquad(e.target.value);save("squad",e.target.value);setEditing(null);}} onBlur={()=>setEditing(null)} style={selectStyle}>{SQUADS.map(s=><option key={s}>{s}</option>)}</select>
          : <span onClick={()=>setEditing("squad")} style={{...cellText,color:"#7aaa7a",cursor:"pointer"}}>{localSquad}</span>}
      </div>

      <div style={{ padding:"0 4px" }}>
        {editing==="location"
          ? <select autoFocus value={localLocation} onChange={e=>{setLocalLocation(e.target.value);save("location",e.target.value);setEditing(null);}} onBlur={()=>setEditing(null)} style={selectStyle}>{LOCATIONS.map(l=><option key={l}>{l}</option>)}</select>
          : <span onClick={()=>setEditing("location")} style={{...cellText,color:locColor,fontWeight:700,cursor:"pointer",fontSize:11}}>{localLocation}</span>}
      </div>

      <div style={{ padding:"0 4px" }}>
        {editing==="status"
          ? <select autoFocus value={localStatus} onChange={e=>{handleStatus(e.target.value);setEditing(null);}} onBlur={()=>setEditing(null)} style={{...selectStyle,color:cfg.text}}>{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select>
          : <div onClick={()=>setEditing("status")} style={{cursor:"pointer"}}><StatusBadge status={localStatus}/></div>}
      </div>

      <div style={{ padding:"0 8px" }}>
        {editing==="faults"
          ? <input ref={faultsRef} autoFocus value={localFaults} onChange={e=>setLocalFaults(e.target.value)} onBlur={()=>{save("faults",localFaults);setEditing(null);}} onKeyDown={e=>{if(e.key==="Enter"){save("faults",localFaults);setEditing(null);}}} placeholder={isNMC?"Enter fault...":"No faults"} style={{...inputStyle,color:isNMC?"#ff8888":"#88cc88",background:isNMC?"#2a0a0a":"#0a1a0a"}}/>
          : <span onClick={()=>setEditing("faults")} style={{...cellText,color:isNMC?"#ff6666":"#4a8a4a",fontSize:12,cursor:"pointer",fontStyle:localFaults?"normal":"italic",opacity:localFaults?1:0.4}}>{localFaults||(isNMC?"Click to add fault...":"—")}</span>}
      </div>

      <div style={{ fontSize:10, color:"#3a6a3a", fontFamily:"monospace", padding:"0 6px", whiteSpace:"nowrap" }}>{row.last_updated||"—"}</div>
      <div style={{ fontSize:11, color:"#5a8a5a", fontFamily:"monospace", fontWeight:700, padding:"0 6px", letterSpacing:1 }}>{row.updated_by||"—"}</div>
    </div>
  );
}

function LocationBreakdown({ rows }) {
  const grouped = {};
  LOCATIONS.forEach(l => { grouped[l] = []; });
  rows.forEach(r => {
    const loc = r.location || "CMP";
    if (!grouped[loc]) grouped[loc] = [];
    grouped[loc].push(r);
  });
  const active = LOCATIONS.filter(l => grouped[l]?.length > 0);

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ fontSize:11, color:"#3a6a3a", letterSpacing:3, marginBottom:20 }}>LOCATION BREAKDOWN — ALL UNITS</div>

      <div style={{ display:"flex", gap:10, marginBottom:28, flexWrap:"wrap" }}>
        {active.map(loc => {
          const lcfg = LOCATION_CONFIG[loc] || { color:"#888", icon:"📍", label:loc, desc:loc };
          const units = grouped[loc];
          const fmc = units.filter(u=>u.status==="FMC").length;
          const nmc = units.filter(u=>u.status==="NMC").length;
          return (
            <div key={loc} style={{ background:"#0a1a0a", border:`1px solid ${lcfg.color}44`, borderRadius:8, padding:"12px 16px", minWidth:140 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                <span style={{ fontSize:16 }}>{lcfg.icon}</span>
                <span style={{ color:lcfg.color, fontWeight:900, fontSize:13, letterSpacing:2 }}>{lcfg.label}</span>
              </div>
              <div style={{ fontSize:10, color:"#4a6a4a", marginBottom:6 }}>{lcfg.desc}</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {fmc>0 && <span style={{ background:"#00c44f", color:"#000", fontSize:10, fontWeight:900, padding:"2px 8px", borderRadius:3 }}>FMC {fmc}</span>}
                {nmc>0 && <span style={{ background:"#cc0000", color:"#fff", fontSize:10, fontWeight:900, padding:"2px 8px", borderRadius:3 }}>NMC {nmc}</span>}
              </div>
              <div style={{ fontSize:10, color:"#3a5a3a", marginTop:6 }}>{units.length} UNIT{units.length!==1?"S":""}</div>
            </div>
          );
        })}
        {active.length === 0 && <div style={{ color:"#2a5a2a", fontFamily:"monospace", fontSize:12, letterSpacing:2 }}>NO DATA YET</div>}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
        {active.map(loc => {
          const lcfg = LOCATION_CONFIG[loc] || { color:"#888", icon:"📍", label:loc, desc:loc };
          const units = grouped[loc];
          const trucks   = units.filter(u=>u.type==="TRUCK");
          const trailers = units.filter(u=>u.type==="TRAILER");
          return (
            <div key={loc} style={{ background:"#080f08", border:`1px solid ${lcfg.color}33`, borderRadius:10, overflow:"hidden" }}>
              <div style={{ background:`${lcfg.color}15`, borderBottom:`1px solid ${lcfg.color}33`, padding:"12px 20px", display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:22 }}>{lcfg.icon}</span>
                <div>
                  <div style={{ color:lcfg.color, fontWeight:900, fontSize:16, letterSpacing:3 }}>{lcfg.label}</div>
                  <div style={{ color:"#4a7a4a", fontSize:10, letterSpacing:2 }}>{lcfg.desc} · {units.length} UNIT{units.length!==1?"S":""}</div>
                </div>
                <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
                  {["FMC","NMC"].map(s=>{
                    const count = units.filter(u=>u.status===s).length;
                    if(!count) return null;
                    return <span key={s} style={{ background:STATUS_CONFIG[s].badge, color:s==="FMC"?"#000":"#fff", fontSize:11, fontWeight:900, padding:"4px 12px", borderRadius:4, letterSpacing:1 }}>{s} {count}</span>;
                  })}
                </div>
              </div>
              <div style={{ padding:"16px 20px", display:"flex", gap:16, flexWrap:"wrap" }}>
                {[["🚛 TRUCKS", trucks],["🚚 TRAILERS", trailers]].map(([label, items]) =>
                  items.length > 0 && (
                    <div key={label} style={{ flex:1, minWidth:260 }}>
                      <div style={{ fontSize:10, color:"#3a6a3a", letterSpacing:2, marginBottom:8 }}>{label}</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        {items.map(unit => {
                          const sc = STATUS_CONFIG[unit.status] || STATUS_CONFIG.FMC;
                          return (
                            <div key={unit.id} style={{ display:"flex", alignItems:"center", gap:8, background:sc.bg, border:`1px solid ${sc.badge}33`, borderRadius:6, padding:"8px 12px", flexWrap:"wrap" }}>
                              <span style={{ fontFamily:"monospace", fontWeight:900, fontSize:13, color:sc.text, minWidth:54 }}>{unit.unit}</span>
                              <StatusBadge status={unit.status}/>
                              <span style={{ fontSize:10, color:"#4a7a4a", fontFamily:"monospace" }}>{unit.squad}</span>
                              {unit.faults && <span style={{ fontSize:11, color:unit.status==="NMC"?"#ff6666":"#5a8a5a", fontFamily:"monospace", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>⚠ {unit.faults}</span>}
                              {unit.last_updated && <span style={{ fontSize:9, color:"#2a5a2a", fontFamily:"monospace", marginLeft:"auto", whiteSpace:"nowrap" }}>{unit.last_updated}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  const [online,       setOnline]       = useState(0);

  // Load data from Supabase
  useEffect(() => {
    const fetchRows = async () => {
      const { data, error } = await supabase
        .from("fleet")
        .select("*")
        .order("line", { ascending: true });
      if (!error && data) setRows(data);
      setLoading(false);
    };
    fetchRows();

    // Real-time subscription — any change from anyone updates the UI instantly
    const channel = supabase
      .channel("fleet-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "fleet" }, (payload) => {
        if (payload.eventType === "UPDATE") {
          setRows(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setOnline(prev => prev + 1);
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleUpdate = useCallback(async (id, changes) => {
    // Optimistic update — show change immediately
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r));
    // Sync to Supabase
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

  const stats = {
    fmc:   rows.filter(r=>r.status==="FMC").length,
    nmc:   rows.filter(r=>r.status==="NMC").length,
    total: rows.length,
  };

  const hCol = { fontFamily:"'Courier New',monospace", fontSize:10, color:"#4a7a4a", letterSpacing:2, textTransform:"uppercase", padding:"10px 8px 10px 4px" };

  const TabBtn = ({ id, icon, label }) => (
    <button onClick={() => setTab(id)} style={{ background:tab===id?"#0f2a0f":"transparent", color:tab===id?"#00ff6a":"#3a6a3a", border:"none", borderBottom:tab===id?"2px solid #00ff6a":"2px solid transparent", padding:"10px 20px", fontFamily:"monospace", fontWeight:tab===id?700:400, fontSize:12, letterSpacing:2, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
      {icon} {label}
    </button>
  );

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#050d05", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ fontSize:28 }}>☠</div>
      <div style={{ color:"#00ff6a", fontFamily:"monospace", letterSpacing:4, fontSize:14 }}>LOADING TRACKER...</div>
      <div style={{ color:"#2a5a2a", fontFamily:"monospace", fontSize:11 }}>Connecting to database</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#050d05", color:"#88cc88", fontFamily:"'Courier New',monospace" }}>

      {/* NAME PROMPT */}
      {showPrompt && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999 }}>
          <div style={{ background:"#0a1a0a", border:"1px solid #2a4a2a", borderRadius:8, padding:40, textAlign:"center", maxWidth:360, width:"90%" }}>
            <div style={{ fontSize:28, marginBottom:8 }}>🪖</div>
            <div style={{ fontSize:18, fontWeight:700, color:"#00ff6a", letterSpacing:3, marginBottom:8 }}>OUTLAWS TRACKER</div>
            <div style={{ color:"#5a8a5a", fontSize:12, marginBottom:24 }}>Enter your operator name / callsign</div>
            <input autoFocus value={nameInput} onChange={e=>setNameInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&commitName()} placeholder="e.g. 2LT.EVANS"
              style={{...inputStyle,fontSize:16,textAlign:"center",marginBottom:16,color:"#00ff6a",letterSpacing:2}}/>
            <button onClick={commitName} style={{ background:"#00c44f", color:"#000", border:"none", borderRadius:4, padding:"10px 28px", fontFamily:"monospace", fontWeight:700, fontSize:14, letterSpacing:2, cursor:"pointer", width:"100%" }}>LOG IN</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background:"#061006", borderBottom:"2px solid #1a3a1a", padding:"14px 24px", display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:20, fontWeight:900, color:"#00ff6a", letterSpacing:4 }}>☠ OUTLAWS</div>
          <div style={{ fontSize:10, color:"#4a7a4a", letterSpacing:3 }}>MAINTENANCE TRACKER</div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {[{l:"FMC",v:stats.fmc,c:"#00c44f"},{l:"NMC",v:stats.nmc,c:"#cc0000"},{l:"TOTAL",v:stats.total,c:"#4a7a4a"}].map(s=>(
            <div key={s.l} style={{ background:"#0a1a0a", border:`1px solid ${s.c}33`, borderRadius:6, padding:"5px 12px", textAlign:"center", minWidth:48 }}>
              <div style={{ fontSize:18, fontWeight:900, color:s.c }}>{s.v}</div>
              <div style={{ fontSize:9, color:s.c, letterSpacing:2, opacity:0.7 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#00ff6a", boxShadow:"0 0 6px #00ff6a" }}/>
            <span style={{ fontSize:10, color:"#3a6a3a", letterSpacing:1 }}>LIVE</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:11, color:"#3a6a3a" }}>OPERATOR:</span>
            <span style={{ fontSize:13, fontWeight:700, color:"#00ff6a", letterSpacing:2, cursor:"pointer", textDecoration:"underline dotted" }} onClick={()=>setShowPrompt(true)}>{username||"—"}</span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ background:"#060e06", borderBottom:"1px solid #1a2a1a", display:"flex", paddingLeft:16 }}>
        <TabBtn id="tracker"   icon="📋" label="TRACKER"/>
        <TabBtn id="locations" icon="📍" label="LOCATION BREAKDOWN"/>
      </div>

      {/* TRACKER TAB */}
      {tab === "tracker" && <>
        <div style={{ background:"#060e06", borderBottom:"1px solid #1a2a1a", padding:"10px 24px", display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search unit or fault..." style={{...inputStyle,width:200,fontSize:12}}/>
          {["ALL","FMC","NMC"].map(s=>(
            <button key={s} onClick={()=>setFilterStatus(s)} style={{ background:filterStatus===s?(s==="FMC"?"#00c44f":s==="NMC"?"#cc0000":"#2a4a2a"):"#0a1a0a", color:filterStatus===s?"#fff":"#5a8a5a", border:"1px solid #2a4a2a", borderRadius:4, padding:"5px 14px", fontFamily:"monospace", fontWeight:700, fontSize:12, letterSpacing:2, cursor:"pointer" }}>{s}</button>
          ))}
          <div style={{ width:1, background:"#1a3a1a", height:24, margin:"0 4px" }}/>
          {["ALL","TRUCK","TRAILER"].map(t=>(
            <button key={t} onClick={()=>setFilterType(t)} style={{ background:filterType===t?"#1a3a1a":"#0a1a0a", color:filterType===t?"#88cc88":"#4a6a4a", border:"1px solid #2a4a2a", borderRadius:4, padding:"5px 14px", fontFamily:"monospace", fontSize:11, letterSpacing:1, cursor:"pointer" }}>{t}</button>
          ))}
          <span style={{ fontSize:10, color:"#2a5a2a", marginLeft:"auto" }}>{filtered.length} RECORDS</span>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"42px 90px 80px 80px 140px 90px 1fr 160px 140px", background:"#050d05", borderBottom:"1px solid #1a3a1a", position:"sticky", top:0, zIndex:10 }}>
          {["#","UNIT","TYPE","SQUAD","LOCATION","STATUS","FAULTS / DETAILS","LAST UPDATED","UPDATED BY"].map((h,i)=>(
            <div key={i} style={{...hCol,textAlign:i===0?"center":"left"}}>{h}</div>
          ))}
        </div>

        <div>
          {filtered.map(row=><TrackerRow key={row.id} row={row} onUpdate={handleUpdate} username={username}/>)}
          {filtered.length===0 && <div style={{ textAlign:"center", padding:48, color:"#2a5a2a", fontFamily:"monospace", letterSpacing:3 }}>NO RECORDS MATCH FILTER</div>}
        </div>
      </>}

      {tab === "locations" && <LocationBreakdown rows={rows}/>}

      <div style={{ borderTop:"1px solid #1a2a1a", padding:"12px 24px", fontSize:10, color:"#2a4a2a", letterSpacing:2, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <span>CLICK ANY CELL TO EDIT · NMC AUTO-JUMPS TO FAULTS · CHANGES SYNC IN REAL TIME</span>
        <span>OUTLAWS CO. MAINTENANCE TRACKER</span>
      </div>
    </div>
  );
}
