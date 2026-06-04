// src/App.js
import { useState, useEffect } from "react";
import { ref, push, remove, onValue } from "firebase/database";
import { db } from "./firebase";
import * as XLSX from "xlsx";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const USERS = {
  pdg: { id: "pdg", label: "PDG", pin: "0000", color: "#D4AF37" },
  collab: { id: "collab", label: "Collaborateur", pin: "1234", color: "#4FC3F7" },
};

const VENTE_CATS = [
  { id: "photocopie", label: "Photocopie", icon: "🖨️" },
  { id: "popcorn",    label: "Popcorn",    icon: "🍿" },
  { id: "transaction",label: "Transaction", icon: "💸" },
  { id: "jus",        label: "Jus",         icon: "🧃" },
  { id: "photo",      label: "Photo",       icon: "📸" },
  { id: "gadget",     label: "Gadget",      icon: "💻" },
];

const DEPENSE_CATS = [
  { id: "loyer",       label: "Loyer",          icon: "🏠" },
  { id: "connexion",   label: "Connexion",       icon: "📶" },
  { id: "materiel",    label: "Achat matériel",  icon: "📦" },
  { id: "electricite", label: "Électricité",     icon: "⚡" },
  { id: "autre",       label: "Autre",           icon: "🔧" },
];

const CURRENCY = "FCFA";

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

function fmt(n) {
  return Number(n || 0).toLocaleString("fr-FR") + " " + CURRENCY;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("fr-FR", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function getMonthKey(dateStr) {
  return dateStr?.slice(0, 7) || "";
}

// ─── EXPORT EXCEL ─────────────────────────────────────────────────────────────

function exportToExcel(ventes, depenses) {
  const wb = XLSX.utils.book_new();

  // Feuille Ventes
  const ventesData = [
    ["Date", "Service", "Montant (FCFA)", "Quantité", "Note", "Saisi par"],
    ...ventes.map(v => {
      const cat = VENTE_CATS.find(c => c.id === v.categorie);
      return [v.date, cat?.label || v.categorie, v.montant, v.quantite || 1, v.note || "", USERS[v.saisiePar]?.label || v.saisiePar];
    }),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(ventesData);
  XLSX.utils.book_append_sheet(wb, ws1, "Ventes");

  // Feuille Dépenses
  const depensesData = [
    ["Date", "Catégorie", "Montant (FCFA)", "Note", "Saisi par"],
    ...depenses.map(d => {
      const cat = DEPENSE_CATS.find(c => c.id === d.categorie);
      return [d.date, cat?.label || d.categorie, d.montant, d.note || "", USERS[d.saisiePar]?.label || d.saisiePar];
    }),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(depensesData);
  XLSX.utils.book_append_sheet(wb, ws2, "Dépenses");

  // Feuille Résumé mensuel
  const months = [...new Set([...ventes.map(v => getMonthKey(v.date)), ...depenses.map(d => getMonthKey(d.date))])].sort();
  const resumeData = [
    ["Mois", "Total Ventes (FCFA)", "Total Dépenses (FCFA)", "Bénéfice Net (FCFA)"],
    ...months.map(m => {
      const tv = ventes.filter(v => getMonthKey(v.date) === m).reduce((s, v) => s + v.montant, 0);
      const td = depenses.filter(d => getMonthKey(d.date) === m).reduce((s, d) => s + d.montant, 0);
      return [m, tv, td, tv - td];
    }),
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(resumeData);
  XLSX.utils.book_append_sheet(wb, ws3, "Résumé mensuel");

  XLSX.writeFile(wb, `LaRelativite_${todayKey()}.xlsx`);
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser]       = useState(null);
  const [pin, setPin]         = useState("");
  const [pinTarget, setPinTarget] = useState(null);
  const [pinError, setPinError]   = useState(false);
  const [ventes, setVentes]   = useState([]);
  const [depenses, setDepenses] = useState([]);
  const [tab, setTab]         = useState("dashboard");
  const [toast, setToast]     = useState(null);
  const [online, setOnline]   = useState(true);

  // ── Écoute Firebase en temps réel ──
  useEffect(() => {
    const unsubV = onValue(ref(db, "ventes"), snap => {
      const data = snap.val();
      setVentes(data ? Object.entries(data).map(([id, v]) => ({ ...v, firebaseId: id })) : []);
      setOnline(true);
    }, () => setOnline(false));

    const unsubD = onValue(ref(db, "depenses"), snap => {
      const data = snap.val();
      setDepenses(data ? Object.entries(data).map(([id, d]) => ({ ...d, firebaseId: id })) : []);
    }, () => {});

    return () => { unsubV(); unsubD(); };
  }, []);

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  // ── LOGIN ──
  if (!user) {
    return (
      <LoginScreen
        pinTarget={pinTarget} setPinTarget={setPinTarget}
        pin={pin} setPin={setPin}
        pinError={pinError}
        onSubmit={() => {
          const u = USERS[pinTarget];
          if (pin === u.pin) { setUser(u); setPin(""); setPinError(false); }
          else { setPinError(true); setPin(""); }
        }}
        onCancel={() => { setPinTarget(null); setPin(""); setPinError(false); }}
      />
    );
  }

  // ── CALCULS ──
  const today        = todayKey();
  const currentMonth = getMonthKey(today);

  const ventesAujourd   = ventes.filter(v => v.date === today);
  const ventesMonth     = ventes.filter(v => getMonthKey(v.date) === currentMonth);
  const depensesMonth   = depenses.filter(d => getMonthKey(d.date) === currentMonth);

  const totalVentesToday   = ventesAujourd.reduce((s, v) => s + v.montant, 0);
  const totalVentesMonth   = ventesMonth.reduce((s, v) => s + v.montant, 0);
  const totalDepensesMonth = depensesMonth.reduce((s, v) => s + v.montant, 0);
  const beneficeMonth      = totalVentesMonth - totalDepensesMonth;

  const ventesParCat = VENTE_CATS.map(c => ({
    ...c,
    total: ventesMonth.filter(v => v.categorie === c.id).reduce((s, v) => s + v.montant, 0),
  })).sort((a, b) => b.total - a.total);

  async function addVente(vente) {
    await push(ref(db, "ventes"), { ...vente, date: today, saisiePar: user.id, ts: Date.now() });
    showToast("✅ Vente enregistrée !");
  }

  async function addDepense(dep) {
    await push(ref(db, "depenses"), { ...dep, date: today, saisiePar: user.id, ts: Date.now() });
    showToast("✅ Dépense enregistrée !");
  }

  async function deleteEntry(type, firebaseId) {
    if (user.id !== "pdg") return showToast("❌ Réservé au PDG", "err");
    await remove(ref(db, `${type}/${firebaseId}`));
    showToast("🗑️ Supprimé");
  }

  return (
    <div style={S.root}>
      <div style={S.grain} />

      {toast && (
        <div style={{ ...S.toast, background: toast.type === "err" ? "#5c1a1a" : "#1a3a2a" }}>
          {toast.msg}
        </div>
      )}

      <header style={S.header}>
        <div>
          <div style={S.shopName}>La Relativité</div>
          <div style={S.shopSub}>Libreville, Gabon</div>
        </div>
        <div style={S.headerRight}>
          <span style={{ ...S.onlineDot, background: online ? "#66BB6A" : "#EF5350" }} title={online ? "En ligne" : "Hors ligne"} />
          <span style={{ ...S.userDot, background: USERS[user.id].color }} />
          <span style={S.userName}>{user.label}</span>
          <button style={S.logoutBtn} onClick={() => setUser(null)}>↩</button>
        </div>
      </header>

      <div style={{ ...S.syncBar, background: online ? "rgba(0,80,30,0.15)" : "rgba(80,0,0,0.2)", color: online ? "#3a6a4a" : "#8a3a3a" }}>
        {online ? "🔄 Synchronisé en temps réel avec Firebase" : "⚠️ Hors ligne — données locales"}
      </div>

      <nav style={S.tabs}>
        {[
          { id: "dashboard",  label: "📊 Tableau" },
          { id: "vente",      label: "💰 Vente" },
          { id: "depense",    label: "📤 Dépense" },
          { id: "historique", label: "📋 Historique" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ ...S.tabBtn, ...(tab === t.id ? S.tabActive : {}) }}>
            {t.label}
          </button>
        ))}
      </nav>

      <main style={S.main}>
        {tab === "dashboard"  && <Dashboard totalVentesToday={totalVentesToday} totalVentesMonth={totalVentesMonth} totalDepensesMonth={totalDepensesMonth} beneficeMonth={beneficeMonth} ventesParCat={ventesParCat} ventesAujourd={ventesAujourd} isPdg={user.id === "pdg"} ventes={ventes} depenses={depenses} onExport={() => exportToExcel(ventes, depenses)} />}
        {tab === "vente"      && <VenteForm onAdd={addVente} />}
        {tab === "depense"    && <DepenseForm onAdd={addDepense} />}
        {tab === "historique" && <Historique ventes={ventes} depenses={depenses} user={user} onDelete={deleteEntry} onExport={() => exportToExcel(ventes, depenses)} />}
      </main>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

function LoginScreen({ pinTarget, setPinTarget, pin, setPin, pinError, onSubmit, onCancel }) {
  return (
    <div style={S.loginRoot}>
      <div style={S.grain} />
      <div style={S.loginBox}>
        <div style={S.loginLogo}>La Relativité</div>
        <div style={S.loginTagline}>Gestion de boutique · Libreville</div>
        {!pinTarget ? (
          <div style={S.loginChoices}>
            <p style={S.loginPrompt}>Qui êtes-vous ?</p>
            {Object.values(USERS).map(u => (
              <button key={u.id} onClick={() => setPinTarget(u.id)}
                style={{ ...S.loginUserBtn, borderColor: u.color }}>
                <span style={{ ...S.loginUserDot, background: u.color }} />
                {u.label}
              </button>
            ))}
          </div>
        ) : (
          <div style={S.pinBox}>
            <p style={S.loginPrompt}>Code PIN — {USERS[pinTarget].label}</p>
            <div style={S.pinDisplay}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ ...S.pinDot, background: pin.length > i ? "#D4AF37" : "rgba(255,255,255,0.15)" }} />
              ))}
            </div>
            {pinError && <p style={S.pinError}>PIN incorrect, réessayez</p>}
            <div style={S.pinGrid}>
              {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k, i) => (
                <button key={i} disabled={k === ""} style={{ ...S.pinKey, opacity: k === "" ? 0 : 1 }}
                  onClick={() => {
                    if (k === "") return;
                    if (k === "⌫") { setPin(p => p.slice(0,-1)); return; }
                    const next = pin + String(k);
                    if (next.length === 4) {
                      const u = USERS[pinTarget];
                      if (next === u.pin) { setUser(u); setPin(""); setPinError(false); }
                      else { setPinError(true); setPin(""); }
                    } else {
                      setPin(next);
                    }
                  }}>
                  {k}
                </button>
              ))}
            </div>
            <button style={S.cancelBtn} onClick={onCancel}>← Retour</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function Dashboard({ totalVentesToday, totalVentesMonth, totalDepensesMonth, beneficeMonth, ventesParCat, ventesAujourd, isPdg, onExport }) {
  const maxCat = Math.max(...ventesParCat.map(c => c.total), 1);
  return (
    <div>
      <div style={S.kpiGrid}>
        <KpiCard label="Ventes aujourd'hui"  value={fmt(totalVentesToday)}   accent="#D4AF37" icon="📈" />
        <KpiCard label="Ventes ce mois"      value={fmt(totalVentesMonth)}   accent="#4FC3F7" icon="🗓️" />
        <KpiCard label="Dépenses ce mois"    value={fmt(totalDepensesMonth)} accent="#FF7043" icon="📤" />
        <KpiCard label="Bénéfice net du mois" value={fmt(beneficeMonth)} accent={beneficeMonth >= 0 ? "#66BB6A" : "#EF5350"} icon={beneficeMonth >= 0 ? "✅" : "⚠️"} big />
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>Performance par service (ce mois)</div>
        {ventesParCat.map(c => (
          <div key={c.id} style={S.barRow}>
            <span style={S.barLabel}>{c.icon} {c.label}</span>
            <div style={S.barTrack}>
              <div style={{ ...S.barFill, width: `${(c.total / maxCat) * 100}%` }} />
            </div>
            <span style={S.barValue}>{fmt(c.total)}</span>
          </div>
        ))}
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>Ventes d'aujourd'hui ({ventesAujourd.length})</div>
        {ventesAujourd.length === 0
          ? <p style={S.empty}>Aucune vente enregistrée aujourd'hui</p>
          : [...ventesAujourd].sort((a,b) => b.ts - a.ts).slice(0,8).map(v => {
              const cat = VENTE_CATS.find(c => c.id === v.categorie);
              return (
                <div key={v.firebaseId} style={S.miniRow}>
                  <span>{cat?.icon} {cat?.label}</span>
                  <span style={S.miniAmt}>{fmt(v.montant)}</span>
                </div>
              );
            })
        }
      </div>

      {isPdg && (
        <button onClick={onExport} style={S.exportBtn}>
          📥 Exporter Excel (.xlsx)
        </button>
      )}
    </div>
  );
}

function KpiCard({ label, value, accent, icon, big }) {
  return (
    <div style={{ ...S.kpiCard, borderTop: `3px solid ${accent}`, gridColumn: big ? "1 / -1" : "auto" }}>
      <div style={S.kpiIcon}>{icon}</div>
      <div style={S.kpiLabel}>{label}</div>
      <div style={{ ...S.kpiValue, color: accent }}>{value}</div>
    </div>
  );
}

// ─── VENTE FORM ───────────────────────────────────────────────────────────────

function VenteForm({ onAdd }) {
  const [cat, setCat]       = useState(null);
  const [montant, setMontant] = useState("");
  const [qte, setQte]       = useState("1");
  const [note, setNote]     = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!cat || !montant) return;
    setLoading(true);
    await onAdd({ categorie: cat, montant: parseFloat(montant) * parseFloat(qte || 1), quantite: parseFloat(qte || 1), note });
    setMontant(""); setQte("1"); setNote(""); setCat(null);
    setLoading(false);
  }

  return (
    <div style={S.formBox}>
      <div style={S.formTitle}>💰 Enregistrer une vente</div>
      <label style={S.label}>Service vendu *</label>
      <div style={S.catGrid}>
        {VENTE_CATS.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)}
            style={{ ...S.catBtn, background: cat === c.id ? "#D4AF37" : "rgba(255,255,255,0.05)", color: cat === c.id ? "#000" : "#ccc" }}>
            <span style={{ fontSize: 24 }}>{c.icon}</span>
            <span style={{ fontSize: 11 }}>{c.label}</span>
          </button>
        ))}
      </div>

      <label style={S.label}>Prix unitaire ({CURRENCY}) *</label>
      <input style={S.input} type="number" placeholder="Ex: 500" value={montant} onChange={e => setMontant(e.target.value)} />

      <label style={S.label}>Quantité</label>
      <input style={S.input} type="number" value={qte} min="1" onChange={e => setQte(e.target.value)} />

      {montant && qte && (
        <div style={S.totalPreview}>Total : <strong>{fmt(parseFloat(montant || 0) * parseFloat(qte || 1))}</strong></div>
      )}

      <label style={S.label}>Note (optionnel)</label>
      <input style={S.input} placeholder="Ex: client régulier..." value={note} onChange={e => setNote(e.target.value)} />

      <button onClick={submit} disabled={!cat || !montant || loading}
        style={{ ...S.submitBtn, opacity: cat && montant && !loading ? 1 : 0.4 }}>
        {loading ? "Enregistrement..." : "Enregistrer la vente ✓"}
      </button>
    </div>
  );
}

// ─── DEPENSE FORM ─────────────────────────────────────────────────────────────

function DepenseForm({ onAdd }) {
  const [cat, setCat]       = useState(null);
  const [montant, setMontant] = useState("");
  const [note, setNote]     = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!cat || !montant) return;
    setLoading(true);
    await onAdd({ categorie: cat, montant: parseFloat(montant), note });
    setMontant(""); setNote(""); setCat(null);
    setLoading(false);
  }

  return (
    <div style={S.formBox}>
      <div style={S.formTitle}>📤 Enregistrer une dépense</div>
      <label style={S.label}>Type de dépense *</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {DEPENSE_CATS.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)}
            style={{ ...S.depBtn, background: cat === c.id ? "#FF7043" : "rgba(255,255,255,0.05)", color: cat === c.id ? "#fff" : "#ccc" }}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <label style={S.label}>Montant ({CURRENCY}) *</label>
      <input style={S.input} type="number" placeholder="Ex: 50000" value={montant} onChange={e => setMontant(e.target.value)} />

      <label style={S.label}>Note</label>
      <input style={S.input} placeholder="Ex: loyer du mois de juin..." value={note} onChange={e => setNote(e.target.value)} />

      <button onClick={submit} disabled={!cat || !montant || loading}
        style={{ ...S.submitBtn, background: "#FF7043", opacity: cat && montant && !loading ? 1 : 0.4 }}>
        {loading ? "Enregistrement..." : "Enregistrer la dépense ✓"}
      </button>
    </div>
  );
}

// ─── HISTORIQUE ───────────────────────────────────────────────────────────────

function Historique({ ventes, depenses, user, onDelete, onExport }) {
  const [filter, setFilter] = useState("tous");

  const allItems = [
    ...ventes.map(v => ({ ...v, type: "ventes" })),
    ...depenses.map(d => ({ ...d, type: "depenses" })),
  ].sort((a, b) => (b.ts || 0) - (a.ts || 0));

  const filtered = filter === "tous" ? allItems
    : filter === "ventes" ? allItems.filter(i => i.type === "ventes")
    : allItems.filter(i => i.type === "depenses");

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["tous","ventes","dépenses"].map(f => {
          const key = f === "dépenses" ? "depenses" : f;
          return (
            <button key={f} onClick={() => setFilter(key)}
              style={{ ...S.filterBtn, background: filter === key ? "#D4AF37" : "rgba(255,255,255,0.06)", color: filter === key ? "#000" : "#ccc" }}>
              {f}
            </button>
          );
        })}
        {user.id === "pdg" && (
          <button onClick={onExport} style={{ ...S.filterBtn, background: "#1a3a2a", color: "#66BB6A", marginLeft: "auto" }}>
            📥 Export Excel
          </button>
        )}
      </div>

      {filtered.length === 0 && <p style={S.empty}>Aucune entrée</p>}

      {filtered.map(item => {
        const isVente = item.type === "ventes";
        const cat = isVente
          ? VENTE_CATS.find(c => c.id === item.categorie)
          : DEPENSE_CATS.find(c => c.id === item.categorie);
        return (
          <div key={item.firebaseId} style={{ ...S.histCard, borderLeft: `3px solid ${isVente ? "#D4AF37" : "#FF7043"}` }}>
            <div style={S.histTop}>
              <div>
                <span style={S.histCat}>{cat?.icon} {cat?.label}</span>
                <span style={{ ...S.histType, color: isVente ? "#D4AF37" : "#FF7043" }}>
                  {isVente ? "Vente" : "Dépense"}
                </span>
              </div>
              <span style={{ ...S.histAmt, color: isVente ? "#66BB6A" : "#EF5350" }}>
                {isVente ? "+" : "-"}{fmt(item.montant)}
              </span>
            </div>
            <div style={S.histMeta}>
              {formatDate(item.date)} · {USERS[item.saisiePar]?.label || item.saisiePar}
              {item.note ? ` · "${item.note}"` : ""}
            </div>
            {user.id === "pdg" && (
              <button style={S.delBtn} onClick={() => onDelete(item.type, item.firebaseId)}>🗑️</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const S = {
  root: { minHeight: "100vh", background: "#0d0d0d", color: "#e8e0d0", fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", paddingBottom: 60, position: "relative" },
  grain: { position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")" },
  toast: { position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", padding: "10px 22px", borderRadius: 30, fontSize: 14, border: "1px solid rgba(255,255,255,0.1)", zIndex: 999, color: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.6)" },
  header: { position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 20px 8px", borderBottom: "1px solid rgba(212,175,55,0.2)" },
  shopName: { fontSize: 22, fontWeight: "bold", letterSpacing: "0.05em", color: "#D4AF37" },
  shopSub: { fontSize: 11, color: "#666", marginTop: 2 },
  headerRight: { display: "flex", alignItems: "center", gap: 8 },
  onlineDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  userDot: { width: 8, height: 8, borderRadius: "50%" },
  userName: { fontSize: 13, color: "#aaa" },
  logoutBtn: { background: "none", border: "1px solid #333", color: "#888", padding: "3px 8px", borderRadius: 6, cursor: "pointer", fontSize: 14 },
  syncBar: { position: "relative", zIndex: 1, textAlign: "center", fontSize: 10, padding: "4px", letterSpacing: 0.5 },
  tabs: { position: "relative", zIndex: 1, display: "flex", overflowX: "auto", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 12px" },
  tabBtn: { background: "none", border: "none", color: "#555", padding: "12px 14px", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", fontSize: 13, borderBottom: "2px solid transparent" },
  tabActive: { color: "#D4AF37", borderBottom: "2px solid #D4AF37" },
  main: { position: "relative", zIndex: 1, padding: "16px 16px" },
  kpiGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 },
  kpiCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 14px 12px" },
  kpiIcon: { fontSize: 18, marginBottom: 4 },
  kpiLabel: { fontSize: 11, color: "#666", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  kpiValue: { fontSize: 16, fontWeight: "bold" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, fontFamily: "monospace" },
  barRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  barLabel: { fontSize: 13, width: 120, flexShrink: 0 },
  barTrack: { flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", background: "#D4AF37", borderRadius: 3, transition: "width 0.5s" },
  barValue: { fontSize: 12, color: "#888", width: 100, textAlign: "right", flexShrink: 0 },
  miniRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 14 },
  miniAmt: { color: "#66BB6A", fontWeight: 600 },
  empty: { color: "#444", fontSize: 14, textAlign: "center", padding: "20px 0" },
  exportBtn: { width: "100%", background: "rgba(26,58,42,0.5)", border: "1px solid #2a5a3a", color: "#66BB6A", borderRadius: 12, padding: "14px", fontSize: 15, fontFamily: "inherit", cursor: "pointer", marginTop: 8 },
  formBox: { display: "flex", flexDirection: "column", gap: 14 },
  formTitle: { fontSize: 18, marginBottom: 4, color: "#D4AF37" },
  label: { fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", color: "#e8e0d0", fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" },
  catGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 },
  catBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 6px", borderRadius: 10, cursor: "pointer", border: "none", transition: "all 0.15s", fontFamily: "inherit" },
  depBtn: { padding: "12px 16px", borderRadius: 10, cursor: "pointer", border: "none", textAlign: "left", fontSize: 15, fontFamily: "inherit", transition: "all 0.15s" },
  totalPreview: { background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#D4AF37" },
  submitBtn: { background: "#D4AF37", color: "#000", border: "none", borderRadius: 12, padding: "15px", fontSize: 16, fontFamily: "inherit", fontWeight: 700, cursor: "pointer", marginTop: 4, transition: "opacity 0.2s" },
  filterBtn: { padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontFamily: "inherit" },
  histCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px", marginBottom: 10, position: "relative" },
  histTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  histCat: { fontSize: 14, fontWeight: 600, marginRight: 8 },
  histType: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  histAmt: { fontSize: 15, fontWeight: 700 },
  histMeta: { fontSize: 11, color: "#555" },
  delBtn: { position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: 0.5 },
  loginRoot: { minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, position: "relative" },
  loginBox: { width: "100%", maxWidth: 360, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 20, padding: "32px 24px", position: "relative", zIndex: 1 },
  loginLogo: { fontSize: 30, fontWeight: "bold", color: "#D4AF37", fontFamily: "'Palatino Linotype', serif", textAlign: "center", marginBottom: 4 },
  loginTagline: { fontSize: 12, color: "#555", textAlign: "center", marginBottom: 28 },
  loginPrompt: { fontSize: 14, color: "#888", textAlign: "center", marginBottom: 16 },
  loginChoices: { display: "flex", flexDirection: "column", gap: 12 },
  loginUserBtn: { display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.04)", border: "1px solid", borderRadius: 12, padding: "14px 18px", cursor: "pointer", color: "#e8e0d0", fontSize: 16, fontFamily: "'Palatino Linotype', serif", transition: "background 0.2s" },
  loginUserDot: { width: 12, height: 12, borderRadius: "50%", flexShrink: 0 },
  pinBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
  pinDisplay: { display: "flex", gap: 12 },
  pinDot: { width: 14, height: 14, borderRadius: "50%", transition: "background 0.15s" },
  pinError: { color: "#EF5350", fontSize: 12, marginTop: -8 },
  pinGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, width: "100%" },
  pinKey: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "16px", fontSize: 20, color: "#e8e0d0", cursor: "pointer", fontFamily: "inherit", transition: "background 0.1s" },
  cancelBtn: { background: "none", border: "none", color: "#555", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
};
