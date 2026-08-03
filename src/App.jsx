import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard, ClipboardList, AlertTriangle, Users, CheckCircle2,
  Circle, Clock, Plus, X, ChevronDown, ChevronRight, Trash2, Pencil,
  ShieldCheck, ListChecks, Search, Save, GraduationCap, Wrench, Paperclip,
  Activity, BarChart3, UserCheck, ShieldAlert, FlaskConical, Download, Upload,
  History, LogOut, FolderOpen, Link as LinkIcon, KeyRound, DatabaseBackup
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer
} from "recharts";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient.js";
import * as authApi from "./auth.js";
import { adminCreateStaff, adminResetPassword } from "./api/adminStaff.js";
import * as personnelApi from "./api/personnel.js";
import * as clauseApi from "./api/clauses.js";
import * as taskApi from "./api/tasks.js";
import * as ncApi from "./api/ncs.js";
import * as opsApi from "./api/operations.js";
import * as qcApi from "./api/qc.js";
import * as eqaDocApi from "./api/eqaAndDocuments.js";
import * as auditApi from "./api/auditAndBackup.js";
import {
  syncList, syncClauseStatus, nameToId, idToName, rowToClauseStatus,
  personnelFromDb, personnelToDb,
  taskFromDb, taskToDb, ncFromDb, ncToDb,
  competencyFromDb, competencyToDb, equipmentFromDb, equipmentToDb,
  equipmentRecordFromDb, equipmentRecordToDb,
  machineFromDb, machineToDb, parameterFromDb, parameterToDb,
  controlFromDb, controlToDb, runFromDb, runToDb,
  eqaFromDb, eqaToDb, documentFromDb, documentToDb,
} from "./dataSync.js";

// ---------- ISO 15189:2022 clause tree ----------
const CLAUSES = [
  { id: "4", title: "General requirements", subs: [
    { id: "4.1", title: "Impartiality" },
    { id: "4.2", title: "Confidentiality" },
    { id: "4.3", title: "Requirements related to patients" },
  ]},
  { id: "5", title: "Structural and governance requirements", subs: [
    { id: "5.1", title: "Legal entity" },
    { id: "5.2", title: "Laboratory director" },
    { id: "5.3", title: "Laboratory activities" },
    { id: "5.4", title: "Structure and authority" },
    { id: "5.5", title: "Objectives and policies" },
    { id: "5.6", title: "Risk management" },
    { id: "5.7", title: "Quality management system" },
  ]},
  { id: "6", title: "Resource requirements", subs: [
    { id: "6.1", title: "Personnel" },
    { id: "6.2", title: "Facilities and environmental conditions" },
    { id: "6.3", title: "Equipment" },
    { id: "6.4", title: "Equipment calibration and metrological traceability" },
    { id: "6.5", title: "Reagents and consumables" },
    { id: "6.6", title: "Service agreements" },
    { id: "6.7", title: "Externally provided products and services" },
  ]},
  { id: "7", title: "Process requirements", subs: [
    { id: "7.1", title: "General" },
    { id: "7.2", title: "Pre-examination processes" },
    { id: "7.3", title: "Examination processes" },
    { id: "7.4", title: "Post-examination processes" },
    { id: "7.5", title: "Nonconforming work" },
    { id: "7.6", title: "Control of data and information management" },
    { id: "7.7", title: "Complaints" },
    { id: "7.8", title: "Continuity and emergency preparedness planning" },
  ]},
  { id: "8", title: "Management system requirements", subs: [
    { id: "8.1", title: "General" },
    { id: "8.2", title: "Management system documentation" },
    { id: "8.3", title: "Control of management system documents" },
    { id: "8.4", title: "Control of records" },
    { id: "8.5", title: "Actions to address risks and opportunities for improvement" },
    { id: "8.6", title: "Improvement" },
    { id: "8.7", title: "Nonconformities and corrective actions" },
    { id: "8.8", title: "Evaluations" },
    { id: "8.9", title: "Management reviews" },
  ]},
];
const ALL_SUBCLAUSES = CLAUSES.flatMap(c => c.subs.map(s => ({ ...s, parent: c.id, parentTitle: c.title })));

// ---------- palette (Teal Trust) ----------
const COLORS = {
  navy: "#0F2A3D", teal: "#14746F", seafoam: "#7FBFA0", mint: "#E6F5EC",
  bg: "#F6FAF9", amber: "#C98A2C", red: "#B4453F", ink: "#12262B",
};

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
const todayISO = () => new Date().toISOString().slice(0, 10);

const STATUS_OPTS = ["Not assessed", "Compliant", "Partial", "Non-conformant"];
const STATUS_COLOR = {
  "Not assessed": "#9AA5A3", "Compliant": "#1F8A5F", "Partial": COLORS.amber, "Non-conformant": COLORS.red,
};
const TASK_STATUS = ["Open", "In progress", "Done"];
const NC_STATUS = ["Open", "Investigating", "Action planned", "Action implemented", "Verified", "Closed"];
const NC_SEVERITY = ["Minor", "Major", "Critical"];

// Staff competency (ISO 15189:2022 Clause 6.1 Personnel)
const COMPETENCY_TYPES = ["Initial competency assessment", "Ongoing/annual competency assessment", "Training", "Certification / license", "Induction"];
const COMPETENCY_METHODS = ["Direct observation", "Review of records", "Monitoring correlation of results", "Written/practical test", "Sample re-testing", "Other"];
const COMPETENCY_RESULT = ["Competent", "Not yet competent", "Pass", "Fail", "Completed"];

// Equipment record management (ISO 15189:2022 Clauses 6.3 / 6.4)
const EQUIPMENT_CATEGORIES = ["Hematology analyser", "Chemistry analyser", "Immunoassay analyser", "Microscope", "Centrifuge", "Refrigerator/Freezer", "Incubator", "Pipette", "POCT device", "Other"];
const EQUIPMENT_STATUS = ["In service", "Out of service", "Under qualification", "Decommissioned"];
const EQUIPMENT_RECORD_TYPES = ["IQ (Installation Qualification)", "OQ (Operational Qualification)", "PQ (Performance Qualification)", "Calibration", "Preventive maintenance", "Corrective maintenance / repair", "Verification"];
const RECORD_RESULT = ["Pass", "Fail", "Conditional pass", "Pending"];

// IQC / EQA (Clauses 7.3.7 Quality control, 7.3.7.3 EQA / interlaboratory comparison)
const DISCIPLINES = ["Hematology", "Biochemistry", "Immunochemistry"];
const DISCIPLINE_COLOR = { Hematology: "#B4453F", Biochemistry: "#14746F", Immunochemistry: "#5B6FA8" };
const CONTROL_LEVELS = ["Level 1 (Low)", "Level 2 (Normal)", "Level 3 (High)"];
const REJECT_RULES = ["1_3s", "2_2s", "R_4s", "4_1s", "10x"];
const RULE_LABEL = {
  "1_2s": "1₂s (warning)", "1_3s": "1₃s", "2_2s": "2₂s", "R_4s": "R₄s", "4_1s": "4₁s", "10x": "10x",
};
const EQA_EVALUATION = ["Not yet received", "Satisfactory", "Marginal", "Unsatisfactory"];

// Access, documents, audit
const ROLES = ["Admin", "Deputy Admin", "QA Manager", "Deputy QA Manager", "Technologist", "Viewer"];
const ROLE_DESC = {
  Admin: "Full access, including personnel access roles, audit log, and system backup.",
  "Deputy Admin": "Stands in for the Admin — same access, including personnel roles, audit log, and backup.",
  "QA Manager": "Manage clauses, NC/CAPA, IQC authorization, competency, equipment, documents, and task assignment.",
  "Deputy QA Manager": "Stands in for the QA Manager — same access, including task assignment and IQC authorization.",
  Technologist: "Enter IQC results, update task status, log competency records. Cannot assign tasks, authorize IQC, or delete records.",
  Viewer: "Read-only access to all modules.",
};
const TASK_ASSIGNER_ROLES = ["Admin", "Deputy Admin", "QA Manager", "Deputy QA Manager"];
const DOCUMENT_CATEGORIES = ["SOP", "Policy", "Manual", "Calibration certificate", "Service report", "EQA certificate", "Training material", "Other"];

const initialsOf = (name) => (name || "").trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 3);
const zScore = (value, mean, sd) => (!sd ? 0 : (value - mean) / sd);

// Evaluate a single control's chronologically-ascending run series against Westgard multirule QC
function evaluateControlSeries(runsAsc) {
  return runsAsc.map((r, i) => {
    const z = zScore(r.value, r.mean, r.sd);
    const v = [];
    if (Math.abs(z) > 3) v.push("1_3s");
    else if (Math.abs(z) > 2) v.push("1_2s");
    if (i >= 1) {
      const z0 = zScore(runsAsc[i - 1].value, runsAsc[i - 1].mean, runsAsc[i - 1].sd);
      if (Math.abs(z) > 2 && Math.abs(z0) > 2 && Math.sign(z) === Math.sign(z0)) v.push("2_2s");
    }
    if (i >= 3) {
      const last4 = runsAsc.slice(i - 3, i + 1).map(x => zScore(x.value, x.mean, x.sd));
      if (last4.every(zz => Math.abs(zz) > 1) && last4.every(zz => Math.sign(zz) === Math.sign(last4[0])) && last4[0] !== 0) v.push("4_1s");
    }
    if (i >= 9) {
      const last10 = runsAsc.slice(i - 9, i + 1).map(x => zScore(x.value, x.mean, x.sd));
      if (last10.every(zz => zz > 0) || last10.every(zz => zz < 0)) v.push("10x");
    }
    return { ...r, z, violations: v };
  });
}

// Cross-level R4s: flags a run pair on the same date/parameter whose z-scores span >=4SD in opposite directions
function applyR4s(runsWithZ, allControlsRunsForParam) {
  const byDate = {};
  allControlsRunsForParam.forEach(r => { (byDate[r.date] = byDate[r.date] || []).push(r); });
  const flagged = new Set();
  Object.values(byDate).forEach(group => {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (Math.abs(group[i].z - group[j].z) >= 4 && Math.sign(group[i].z) !== Math.sign(group[j].z)) {
          flagged.add(group[i].id); flagged.add(group[j].id);
        }
      }
    }
  });
  return runsWithZ.map(r => flagged.has(r.id) ? { ...r, violations: [...r.violations, "R_4s"] } : r);
}

// Persistence for this build goes entirely through Supabase (src/api/*.js),
// wired up inside App() below — there is no local storage layer anymore.

function Badge({ color, children }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: color + "22", color }}>
      {children}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium mb-1" style={{ color: COLORS.navy }}>{label}</span>
      {children}
    </label>
  );
}
const inputCls = "w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2";
const inputStyle = { borderColor: "#D8E5E1", "--tw-ring-color": COLORS.teal };

// ---------- Excel export / import (staff & machine/equipment master data) ----------
function exportRowsToExcel(rows, sheetName, filename) {
  const safeRows = rows.length ? rows : [{ "(no data yet — fill in a row per record)": "" }];
  const ws = XLSX.utils.json_to_sheet(safeRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}
function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(ws, { defval: "" }));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
const cellGet = (row, ...keys) => { for (const k of keys) if (row[k] !== undefined && row[k] !== "") return row[k]; return ""; };

function ImportExportBar({ label, templateRows, sheetName, filenameBase, onImportRows, canImport = true }) {
  const fileRef = useRef(null);
  const [status, setStatus] = useState("");
  const handleDownload = () => exportRowsToExcel(templateRows, sheetName, `${filenameBase}.xlsx`);
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const rows = await readExcelFile(file);
      const count = onImportRows(rows);
      setStatus(`Imported ${count ?? rows.length} row(s) from ${file.name}.`);
    } catch (err) {
      setStatus("Couldn't read that file — please upload a .xlsx exported from this app.");
    }
    e.target.value = "";
  };
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <button onClick={handleDownload} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
        <Download size={13} /> Download {label} (Excel)
      </button>
      {canImport && (
        <button onClick={() => fileRef.current?.click()} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border" style={{ borderColor: COLORS.navy, color: COLORS.navy }}>
          <Upload size={13} /> Import from Excel
        </button>
      )}
      <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
      {status && <span className="text-xs text-gray-400">{status}</span>}
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [currentUser, setCurrentUser] = useState(null); // { id, name, role }
  const [personnel, setPersonnel] = useState([]);
  const [clauseStatus, setClauseStatus] = useState({});
  const [tasks, setTasks] = useState([]);
  const [ncs, setNcs] = useState([]);
  const [competency, setCompetency] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [equipmentRecords, setEquipmentRecords] = useState([]);
  const [qcMachines, setQcMachines] = useState([]);
  const [qcParameters, setQcParameters] = useState([]);
  const [qcControls, setQcControls] = useState([]);
  const [qcRuns, setQcRuns] = useState([]);
  const [eqaEvents, setEqaEvents] = useState([]);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const existingUser = await authApi.restoreSession();
        if (existingUser) {
          setCurrentUser({ id: existingUser.id, name: existingUser.name, role: existingUser.access_role || "Technologist" });
        }

        const pRows = await personnelApi.listPersonnel();
        const p = pRows.map(personnelFromDb);
        setPersonnel(p);

        const [csRows, tRows, nRows, compRows, eqRows, eqrRows, qmRows, qpRows, qcRows, qrRows, eqaRows, docRows] = await Promise.all([
          clauseApi.listClauseStatus(),
          taskApi.listTasks(),
          ncApi.listNonconformities(),
          opsApi.listCompetency(),
          opsApi.listEquipment(),
          opsApi.listEquipmentRecords(),
          qcApi.listMachines(),
          qcApi.listParameters(),
          qcApi.listControls(),
          qcApi.listRuns(),
          eqaDocApi.listEqaEvents(),
          eqaDocApi.listDocuments(),
        ]);

        const cs = {};
        Object.entries(csRows).forEach(([clauseId, row]) => {
          cs[clauseId] = { ...rowToClauseStatus(row), owner: idToName(p, row.owner_id) };
        });
        setClauseStatus(cs);
        setTasks(tRows.map(r => taskFromDb(r, p)));
        setNcs(nRows.map(r => ncFromDb(r, p)));
        setCompetency(compRows.map(r => competencyFromDb(r, p)));
        setEquipment(eqRows.map(equipmentFromDb));
        setEquipmentRecords(eqrRows.map(r => equipmentRecordFromDb(r, p)));
        setQcMachines(qmRows.map(machineFromDb));
        setQcParameters(qpRows.map(parameterFromDb));
        setQcControls(qcRows.map(controlFromDb));
        setQcRuns(qrRows.map(r => runFromDb(r, p)));
        setEqaEvents(eqaRows.map(eqaFromDb));
        setDocuments(docRows.map(r => documentFromDb(r, p)));
      } catch (err) {
        console.error("Failed to load data from Supabase:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Generic error-safe wrapper: optimistic local update, sync to Supabase,
  // revert on failure. The audit log itself is now written automatically by
  // a database trigger (0003_audit_log_trigger.sql) — nothing to do here for it.
  function makeListUpdater(setStateFn, getPrev, toDb, fromDb, api) {
    return async (next) => {
      const prev = getPrev();
      setStateFn(next);
      try {
        const synced = await syncList({ prev, next, toDb, fromDb, api });
        setStateFn(synced);
      } catch (e) {
        console.error(e);
        alert("Save failed — reverting this change.\n\n" + e.message);
        setStateFn(prev);
      }
    };
  }

  const updatePersonnel = makeListUpdater(setPersonnel, () => personnel, personnelToDb, personnelFromDb, {
    create: async () => { throw new Error("New staff logins are created via the Personnel page's \"Add staff member\" form (adminCreateStaff), not through a raw list update."); },
    update: (id, row) => personnelApi.updatePersonnel(id, row),
    remove: (id) => personnelApi.deletePersonnel(id),
  });

  const updateClauseStatus = async (next) => {
    const prev = clauseStatus;
    setClauseStatus(next);
    try {
      const synced = await syncClauseStatus({
        prev, next,
        upsert: (clauseId, val) => clauseApi.upsertClauseStatus(clauseId, {
          status: val.status, owner_id: nameToId(personnel, val.owner), last_reviewed: val.lastReviewed || null, notes: val.notes || null,
        }),
      });
      // upsert only returns the raw row's owner_id; re-attach the display name locally.
      Object.keys(synced).forEach(k => { synced[k].owner = next[k].owner; });
      setClauseStatus(synced);
    } catch (e) {
      console.error(e);
      alert("Could not save clause status — reverting.\n\n" + e.message);
      setClauseStatus(prev);
    }
  };

  const updateTasks = makeListUpdater(setTasks, () => tasks, (t) => taskToDb(t, personnel), (r) => taskFromDb(r, personnel), {
    create: (row) => taskApi.createTask(row),
    update: (id, row) => taskApi.updateTask(id, row),
    remove: (id) => taskApi.deleteTask(id),
  });

  /** Status-only change, callable by any non-Viewer even if they can't otherwise edit tasks (goes through the set_task_status RPC). */
  const setTaskStatusAction = async (id, status) => {
    const prev = tasks;
    setTasks(tasks.map(t => (t.id === id ? { ...t, status } : t)));
    try {
      await taskApi.setTaskStatus(id, status);
    } catch (e) {
      alert("Could not update task status.\n\n" + e.message);
      setTasks(prev);
    }
  };

  const updateNcs = makeListUpdater(setNcs, () => ncs, (n) => ncToDb(n, personnel), (r) => ncFromDb(r, personnel), {
    create: (row) => ncApi.createNonconformity(row),
    update: (id, row) => ncApi.updateNonconformity(id, row),
    remove: (id) => ncApi.deleteNonconformity(id),
  });

  const updateCompetency = makeListUpdater(setCompetency, () => competency, (c) => competencyToDb(c, personnel), (r) => competencyFromDb(r, personnel), {
    create: (row) => opsApi.createCompetency(row),
    update: (id, row) => opsApi.updateCompetency(id, row),
    remove: (id) => opsApi.deleteCompetency(id),
  });

  const updateEquipment = makeListUpdater(setEquipment, () => equipment, equipmentToDb, equipmentFromDb, {
    create: (row) => opsApi.createEquipment(row),
    update: (id, row) => opsApi.updateEquipment(id, row),
    remove: (id) => opsApi.deleteEquipment(id),
  });

  const updateEquipmentRecords = makeListUpdater(setEquipmentRecords, () => equipmentRecords, (r) => equipmentRecordToDb(r, personnel), (r) => equipmentRecordFromDb(r, personnel), {
    create: (row) => opsApi.createEquipmentRecord(row),
    update: () => { throw new Error("Equipment records are not editable after creation in this build — delete and re-add if needed."); },
    remove: (id) => opsApi.deleteEquipmentRecord(id),
  });

  const updateQcMachines = makeListUpdater(setQcMachines, () => qcMachines, machineToDb, machineFromDb, {
    create: (row) => qcApi.createMachine(row),
    update: (id, row) => qcApi.updateMachine(id, row),
    remove: (id) => qcApi.deleteMachine(id),
  });

  const updateQcParameters = makeListUpdater(setQcParameters, () => qcParameters, parameterToDb, parameterFromDb, {
    create: (row) => qcApi.createParameter(row),
    update: () => { throw new Error("Editing a parameter after creation isn't supported in this build — remove and re-add it."); },
    remove: (id) => qcApi.deleteParameter(id),
  });

  const updateQcControls = makeListUpdater(setQcControls, () => qcControls, controlToDb, controlFromDb, {
    create: (row) => qcApi.createControl(row),
    update: () => { throw new Error("Editing a control level after creation isn't supported in this build — remove and re-add it."); },
    remove: (id) => qcApi.deleteControl(id),
  });

  const updateQcRuns = makeListUpdater(setQcRuns, () => qcRuns, (r) => runToDb(r, personnel), (r) => runFromDb(r, personnel), {
    create: (row) => qcApi.logRun(row),
    update: () => { throw new Error("Editing a logged IQC result isn't supported — delete and re-log it (only possible before it's authorized)."); },
    remove: (id) => qcApi.deleteRun(id),
  });

  /** The ONLY path that can set authorized=true — goes through the authorize_qc_run RPC, which stamps the CALLER's own identity server-side. */
  const authorizeQcRunAction = async (runId) => {
    const prev = qcRuns;
    try {
      await qcApi.authorizeRun(runId);
      setQcRuns(qcRuns.map(r => r.id === runId ? {
        ...r, authorized: true, authorizedByName: currentUser.name,
        authorizedByInitials: initialsOf(currentUser.name), authorizedAt: new Date().toISOString(),
      } : r));
    } catch (e) {
      alert("Could not authorize this result.\n\n" + e.message);
      setQcRuns(prev);
    }
  };

  const updateEqaEvents = makeListUpdater(setEqaEvents, () => eqaEvents, eqaToDb, eqaFromDb, {
    create: (row) => eqaDocApi.createEqaEvent(row),
    update: (id, row) => eqaDocApi.updateEqaEvent(id, row),
    remove: (id) => eqaDocApi.deleteEqaEvent(id),
  });

  const updateDocuments = makeListUpdater(setDocuments, () => documents, (d) => documentToDb(d, personnel), (r) => documentFromDb(r, personnel), {
    create: (row) => eqaDocApi.createDocument(row),
    update: () => { throw new Error("Documents are not editable after creation in this build — delete and re-add if needed."); },
    remove: (id) => eqaDocApi.deleteDocument(id),
  });

  const stats = useMemo(() => {
    const statuses = ALL_SUBCLAUSES.map(s => clauseStatus[s.id]?.status || "Not assessed");
    const counts = { "Not assessed": 0, "Compliant": 0, "Partial": 0, "Non-conformant": 0 };
    statuses.forEach(s => counts[s]++);
    const openTasks = tasks.filter(t => t.status !== "Done").length;
    const overdueTasks = tasks.filter(t => t.status !== "Done" && t.dueDate && t.dueDate < todayISO()).length;
    const openNcs = ncs.filter(n => n.status !== "Closed").length;
    const criticalNcs = ncs.filter(n => n.status !== "Closed" && n.severity === "Critical").length;
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);
    const in30ISO = in30.toISOString().slice(0, 10);
    const competencyOverdue = competency.filter(c => c.dueDate && c.dueDate < todayISO()).length;
    const competencyDueSoon = competency.filter(c => c.dueDate && c.dueDate >= todayISO() && c.dueDate <= in30ISO).length;
    const equipmentOverdue = equipmentRecords.filter(r => r.dueDate && r.dueDate < todayISO()).length;
    const equipmentDueSoon = equipmentRecords.filter(r => r.dueDate && r.dueDate >= todayISO() && r.dueDate <= in30ISO).length;

    // IQC: evaluate every parameter's control series to find unauthorized runs carrying a violation
    let iqcUnauthorizedViolations = 0;
    qcParameters.forEach(param => {
      const controls = qcControls.filter(c => c.parameterId === param.id);
      const allRunsForParam = [];
      controls.forEach(ctrl => {
        const runs = qcRuns.filter(r => r.controlId === ctrl.id)
          .map(r => ({ ...r, mean: ctrl.mean, sd: ctrl.sd }))
          .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
        const evald = evaluateControlSeries(runs);
        allRunsForParam.push(...evald);
      });
      const withR4s = applyR4s(allRunsForParam, allRunsForParam);
      withR4s.forEach(r => {
        if (!r.authorized && r.violations.some(v => REJECT_RULES.includes(v))) iqcUnauthorizedViolations++;
      });
    });
    const eqaUnsatisfactory = eqaEvents.filter(e => e.evaluation === "Unsatisfactory").length;

    return {
      counts, openTasks, overdueTasks, openNcs, criticalNcs, totalClauses: ALL_SUBCLAUSES.length,
      competencyOverdue, competencyDueSoon, equipmentOverdue, equipmentDueSoon,
      iqcUnauthorizedViolations, eqaUnsatisfactory,
    };
  }, [clauseStatus, tasks, ncs, competency, equipmentRecords, qcParameters, qcControls, qcRuns, eqaEvents]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
      <div className="text-sm" style={{ color: COLORS.navy }}>Loading quality management system…</div>
    </div>;
  }

  if (!currentUser) {
    return <SignInScreen onSignIn={setCurrentUser} />;
  }

  const isAdmin = currentUser.role === "Admin";
  const isQaManager = currentUser.role === "QA Manager";
  const canEdit = currentUser.role !== "Viewer";
  const canAuthorizeIQC = isAdmin || isQaManager;
  const canAssignTasks = TASK_ASSIGNER_ROLES.includes(currentUser.role);
  const canSeeAuditBackup = isAdmin || isQaManager;

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "clauses", label: "Clause register", icon: ListChecks },
    { id: "tasks", label: "Tasks", icon: ClipboardList },
    { id: "ncs", label: "NC / CAPA", icon: AlertTriangle },
    { id: "iqc", label: "IQC & Levey-Jennings", icon: Activity },
    { id: "eqa", label: "EQAS", icon: BarChart3 },
    { id: "competency", label: "Staff competency", icon: GraduationCap },
    { id: "equipment", label: "Equipment records", icon: Wrench },
    { id: "documents", label: "Documents", icon: FolderOpen },
    { id: "personnel", label: "Personnel", icon: Users },
    ...(canSeeAuditBackup ? [{ id: "audit", label: "Audit & Backup", icon: History }] : []),
  ];

  return (
    <div className="min-h-screen flex" style={{ background: COLORS.bg, color: COLORS.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Sidebar */}
      <div className="w-56 shrink-0 flex flex-col" style={{ background: COLORS.navy }}>
        <div className="px-5 py-6 flex items-center gap-2 border-b" style={{ borderColor: "#1C4753" }}>
          <ShieldCheck size={22} color={COLORS.seafoam} />
          <div>
            <div className="text-white font-semibold text-sm leading-tight">Lab QMS</div>
            <div className="text-xs" style={{ color: COLORS.seafoam }}>ISO 15189:2022</div>
          </div>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map(n => {
            const Icon = n.icon;
            const active = tab === n.id;
            return (
              <button key={n.id} onClick={() => setTab(n.id)}
                className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-left transition-colors"
                style={{ color: active ? "white" : "#A9C4C0", background: active ? "#1C4753" : "transparent" }}>
                <Icon size={16} /> {n.label}
              </button>
            );
          })}
        </nav>
        <div className="px-5 py-3 border-t" style={{ borderColor: "#1C4753" }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0" style={{ background: COLORS.teal }}>
              {initialsOf(currentUser.name)}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-white truncate">{currentUser.name}</div>
              <div className="text-[10px]" style={{ color: COLORS.seafoam }}>{currentUser.role}</div>
            </div>
            <button onClick={() => { authApi.signOut(); setCurrentUser(null); }} title="Switch user" className="ml-auto text-gray-400 hover:text-white"><LogOut size={14} /></button>
          </div>
          <div className="text-[10px]" style={{ color: "#5C8A85" }}>Data is stored in this browser only — not shared with other devices or people.</div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-auto">
        {tab === "dashboard" && <Dashboard stats={stats} tasks={tasks} ncs={ncs} personnel={personnel} setTab={setTab}
          competency={competency} equipmentRecords={equipmentRecords} equipment={equipment} />}
        {tab === "clauses" && <ClauseRegister clauseStatus={clauseStatus} updateClauseStatus={updateClauseStatus}
          personnel={personnel} tasks={tasks} updateTasks={updateTasks} canEdit={canEdit} canAssignTasks={canAssignTasks} />}
        {tab === "tasks" && <Tasks tasks={tasks} updateTasks={updateTasks} setTaskStatusAction={setTaskStatusAction} personnel={personnel} canEdit={canEdit} canAssignTasks={canAssignTasks} />}
        {tab === "ncs" && <NCRegister ncs={ncs} updateNcs={updateNcs} personnel={personnel} canEdit={canEdit} />}
        {tab === "iqc" && <IQCPage qcMachines={qcMachines} updateQcMachines={updateQcMachines}
          qcParameters={qcParameters} updateQcParameters={updateQcParameters}
          qcControls={qcControls} updateQcControls={updateQcControls}
          qcRuns={qcRuns} updateQcRuns={updateQcRuns} personnel={personnel}
          canEdit={canEdit} canAuthorizeIQC={canAuthorizeIQC} currentUser={currentUser}
          authorizeQcRunAction={authorizeQcRunAction} />}
        {tab === "eqa" && <EQAPage eqaEvents={eqaEvents} updateEqaEvents={updateEqaEvents} qcMachines={qcMachines} canEdit={canEdit} />}
        {tab === "competency" && <Competency competency={competency} updateCompetency={updateCompetency} personnel={personnel} canEdit={canEdit} />}
        {tab === "equipment" && <Equipment equipment={equipment} updateEquipment={updateEquipment}
          equipmentRecords={equipmentRecords} updateEquipmentRecords={updateEquipmentRecords} personnel={personnel} canEdit={canEdit} />}
        {tab === "documents" && <Documents documents={documents} updateDocuments={updateDocuments} currentUser={currentUser} canEdit={canEdit} />}
        {tab === "personnel" && <Personnel personnel={personnel} setPersonnel={setPersonnel} updatePersonnel={updatePersonnel} currentUser={currentUser} isAdmin={isAdmin} canEdit={canEdit} />}
        {tab === "audit" && canSeeAuditBackup && <AuditBackup />}
      </div>
    </div>
  );
}

// ---------------- Dashboard ----------------
function Dashboard({ stats, tasks, ncs, personnel, setTab, competency, equipmentRecords, equipment }) {
  const pct = Math.round((stats.counts["Compliant"] / stats.totalClauses) * 100);
  const upcoming = tasks.filter(t => t.status !== "Done").sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999")).slice(0, 5);
  const openNcs = ncs.filter(n => n.status !== "Closed").slice(0, 5);
  const equipById = Object.fromEntries(equipment.map(e => [e.id, e]));
  const competencyAlerts = competency.filter(c => c.dueDate && c.dueDate < todayISO())
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  const equipmentAlerts = equipmentRecords.filter(r => r.dueDate && r.dueDate < todayISO())
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: COLORS.navy }}>Quality management overview</h1>
      <p className="text-sm text-gray-500 mb-6">Snapshot of ISO 15189:2022 compliance, open tasks, and nonconformities.</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Clause compliance" value={`${pct}%`} sub={`${stats.counts["Compliant"]} of ${stats.totalClauses} compliant`} color={COLORS.teal} />
        <StatCard label="Non-conformant clauses" value={stats.counts["Non-conformant"]} sub="need corrective action" color={COLORS.red} />
        <StatCard label="Open tasks" value={stats.openTasks} sub={`${stats.overdueTasks} overdue`} color={stats.overdueTasks ? COLORS.red : COLORS.teal} />
        <StatCard label="Open NCs" value={stats.openNcs} sub={`${stats.criticalNcs} critical`} color={stats.criticalNcs ? COLORS.red : COLORS.amber} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <StatCard label="Unauthorized IQC rule violations" value={stats.iqcUnauthorizedViolations} sub="Westgard rejects awaiting review" color={stats.iqcUnauthorizedViolations ? COLORS.red : COLORS.teal} />
        <StatCard label="EQA unsatisfactory results" value={stats.eqaUnsatisfactory} sub="across Hematology, Biochemistry, Immunochemistry" color={stats.eqaUnsatisfactory ? COLORS.red : COLORS.teal} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Staff competency overdue" value={stats.competencyOverdue} sub={`${stats.competencyDueSoon} due within 30 days`} color={stats.competencyOverdue ? COLORS.red : COLORS.teal} />
        <StatCard label="Equipment records overdue" value={stats.equipmentOverdue} sub={`${stats.equipmentDueSoon} due within 30 days (IQ/OQ/PQ, calibration, maintenance)`} color={stats.equipmentOverdue ? COLORS.red : COLORS.teal} />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-5" style={{ borderColor: "#E1EBE8" }}>
          <div className="text-sm font-medium mb-3" style={{ color: COLORS.navy }}>Compliance by status</div>
          {STATUS_OPTS.map(s => {
            const count = stats.counts[s];
            const w = stats.totalClauses ? (count / stats.totalClauses) * 100 : 0;
            return (
              <div key={s} className="mb-2">
                <div className="flex justify-between text-xs mb-1"><span>{s}</span><span>{count}</span></div>
                <div className="h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full" style={{ width: `${w}%`, background: STATUS_COLOR[s] }} /></div>
              </div>
            );
          })}
        </div>
        <div className="bg-white rounded-lg border p-5" style={{ borderColor: "#E1EBE8" }}>
          <div className="text-sm font-medium mb-3" style={{ color: COLORS.navy }}>Clause groups</div>
          <ClauseGroupBars stats={stats} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Panel title="Upcoming / open tasks" onSeeAll={() => setTab("tasks")}>
          {upcoming.length === 0 && <Empty text="No open tasks." />}
          {upcoming.map(t => (
            <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "#EEF3F1" }}>
              <div>
                <div className="text-sm">{t.title}</div>
                <div className="text-xs text-gray-500">{t.assignedTo || "Unassigned"} · Clause {t.clauseId || "—"}</div>
              </div>
              <Badge color={t.dueDate && t.dueDate < todayISO() ? COLORS.red : COLORS.teal}>{t.dueDate || "no date"}</Badge>
            </div>
          ))}
        </Panel>
        <Panel title="Open non-conformities" onSeeAll={() => setTab("ncs")}>
          {openNcs.length === 0 && <Empty text="No open nonconformities." />}
          {openNcs.map(n => (
            <div key={n.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "#EEF3F1" }}>
              <div>
                <div className="text-sm">{n.ncNumber} — {n.title}</div>
                <div className="text-xs text-gray-500">Clause {n.clauseId || "—"} · {n.status}</div>
              </div>
              <Badge color={n.severity === "Critical" ? COLORS.red : n.severity === "Major" ? COLORS.amber : "#9AA5A3"}>{n.severity}</Badge>
            </div>
          ))}
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6">
        <Panel title="Staff competency overdue" onSeeAll={() => setTab("competency")}>
          {competencyAlerts.length === 0 && <Empty text="Nothing overdue." />}
          {competencyAlerts.map(c => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "#EEF3F1" }}>
              <div>
                <div className="text-sm">{c.personnelName} — {c.title}</div>
                <div className="text-xs text-gray-500">{c.type}</div>
              </div>
              <Badge color={COLORS.red}>{c.dueDate}</Badge>
            </div>
          ))}
        </Panel>
        <Panel title="Equipment records overdue" onSeeAll={() => setTab("equipment")}>
          {equipmentAlerts.length === 0 && <Empty text="Nothing overdue." />}
          {equipmentAlerts.map(r => (
            <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "#EEF3F1" }}>
              <div>
                <div className="text-sm">{equipById[r.equipmentId]?.name || "Unknown equipment"} — {r.type}</div>
                <div className="text-xs text-gray-500">{equipById[r.equipmentId]?.model || ""}</div>
              </div>
              <Badge color={COLORS.red}>{r.dueDate}</Badge>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

function ClauseGroupBars({ stats }) {
  return (
    <div className="space-y-2">
      {CLAUSES.map(c => (
        <div key={c.id} className="flex items-center gap-2 text-xs">
          <span className="w-6 font-medium" style={{ color: COLORS.navy }}>{c.id}</span>
          <span className="flex-1 truncate text-gray-600">{c.title}</span>
          <span className="text-gray-400">{c.subs.length} clauses</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-lg border p-4" style={{ borderColor: "#E1EBE8" }}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-semibold" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}
function Panel({ title, onSeeAll, children }) {
  return (
    <div className="bg-white rounded-lg border p-5" style={{ borderColor: "#E1EBE8" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium" style={{ color: COLORS.navy }}>{title}</div>
        <button onClick={onSeeAll} className="text-xs" style={{ color: COLORS.teal }}>See all</button>
      </div>
      {children}
    </div>
  );
}
function Empty({ text }) { return <div className="text-sm text-gray-400 py-4 text-center">{text}</div>; }

// ---------------- Clause Register ----------------
function ClauseRegister({ clauseStatus, updateClauseStatus, personnel, tasks, updateTasks, canEdit, canAssignTasks }) {
  const [openGroups, setOpenGroups] = useState(() => Object.fromEntries(CLAUSES.map(c => [c.id, true])));
  const [taskDraftFor, setTaskDraftFor] = useState(null);

  const setStatus = (id, patch) => {
    const cur = clauseStatus[id] || { status: "Not assessed", owner: "", lastReviewed: "", notes: "" };
    updateClauseStatus({ ...clauseStatus, [id]: { ...cur, ...patch } });
  };

  const createTaskFromClause = (clauseId, draft) => {
    const t = { id: uid(), title: draft.title, clauseId, assignedTo: draft.assignedTo, dueDate: draft.dueDate, priority: draft.priority || "Medium", status: "Open", notes: "", createdAt: todayISO() };
    updateTasks([t, ...tasks]);
    setTaskDraftFor(null);
  };

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: COLORS.navy }}>Clause register</h1>
      <p className="text-sm text-gray-500 mb-6">Track compliance status, ownership, and review dates for every clause of ISO 15189:2022.</p>

      {CLAUSES.map(group => (
        <div key={group.id} className="mb-4 bg-white rounded-lg border" style={{ borderColor: "#E1EBE8" }}>
          <button onClick={() => setOpenGroups(g => ({ ...g, [group.id]: !g[group.id] }))}
            className="w-full flex items-center gap-2 px-5 py-3 text-left">
            {openGroups[group.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className="font-medium text-sm" style={{ color: COLORS.navy }}>Clause {group.id} — {group.title}</span>
            <span className="ml-auto text-xs text-gray-400">{group.subs.length} sub-clauses</span>
          </button>
          {openGroups[group.id] && (
            <div className="divide-y" style={{ borderColor: "#EEF3F1" }}>
              {group.subs.map(sub => {
                const cs = clauseStatus[sub.id] || { status: "Not assessed", owner: "", lastReviewed: "", notes: "" };
                return (
                  <div key={sub.id} className="px-5 py-3">
                    <div className="flex items-start gap-3">
                      <div className="w-16 text-xs font-medium text-gray-400 pt-1.5">{sub.id}</div>
                      <div className="flex-1">
                        <div className="text-sm mb-2">{sub.title}</div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <select value={cs.status} disabled={!canEdit} onChange={e => setStatus(sub.id, { status: e.target.value })}
                            className="text-xs border rounded-md px-2 py-1 disabled:opacity-60" style={{ borderColor: "#D8E5E1", color: STATUS_COLOR[cs.status] }}>
                            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <select value={cs.owner} disabled={!canEdit} onChange={e => setStatus(sub.id, { owner: e.target.value })}
                            className="text-xs border rounded-md px-2 py-1 disabled:opacity-60" style={{ borderColor: "#D8E5E1" }}>
                            <option value="">Assign owner…</option>
                            {personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                          <input type="date" value={cs.lastReviewed} disabled={!canEdit} onChange={e => setStatus(sub.id, { lastReviewed: e.target.value })}
                            className="text-xs border rounded-md px-2 py-1 disabled:opacity-60" style={{ borderColor: "#D8E5E1" }} title="Last reviewed" />
                          {canAssignTasks && (
                            <button onClick={() => setTaskDraftFor(sub.id)} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
                              <Plus size={12} /> Assign task
                            </button>
                          )}
                        </div>
                        <textarea value={cs.notes} disabled={!canEdit} onChange={e => setStatus(sub.id, { notes: e.target.value })}
                          placeholder="Notes / evidence reference…" rows={cs.notes ? 2 : 1}
                          className="w-full mt-2 text-xs border rounded-md px-2 py-1.5 text-gray-600 disabled:opacity-60" style={{ borderColor: "#EEF3F1" }} />
                        {taskDraftFor === sub.id && canAssignTasks && (
                          <MiniTaskForm personnel={personnel} onCancel={() => setTaskDraftFor(null)}
                            onSave={(draft) => createTaskFromClause(sub.id, draft)} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MiniTaskForm({ personnel, onSave, onCancel }) {
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  return (
    <div className="mt-3 p-3 rounded-md" style={{ background: COLORS.mint }}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task description"
        className="w-full text-xs border rounded-md px-2 py-1.5 mb-2" style={{ borderColor: "#D8E5E1" }} />
      <div className="flex gap-2 mb-2">
        <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="text-xs border rounded-md px-2 py-1 flex-1" style={{ borderColor: "#D8E5E1" }}>
          <option value="">Assign to…</option>
          {personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="text-xs border rounded-md px-2 py-1" style={{ borderColor: "#D8E5E1" }} />
        <select value={priority} onChange={e => setPriority(e.target.value)} className="text-xs border rounded-md px-2 py-1" style={{ borderColor: "#D8E5E1" }}>
          <option>Low</option><option>Medium</option><option>High</option>
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="text-xs px-3 py-1 rounded-md text-gray-500">Cancel</button>
        <button onClick={() => title.trim() && onSave({ title, assignedTo, dueDate, priority })}
          className="text-xs px-3 py-1 rounded-md text-white" style={{ background: COLORS.teal }}>Create task</button>
      </div>
    </div>
  );
}

// ---------------- Tasks ----------------
function Tasks({ tasks, updateTasks, setTaskStatusAction, personnel, canEdit, canAssignTasks }) {
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterAssignee, setFilterAssignee] = useState("All");

  const addTask = (draft) => {
    updateTasks([{ id: uid(), ...draft, status: "Open", createdAt: todayISO() }, ...tasks]);
    setShowForm(false);
  };
  const removeTask = (id) => updateTasks(tasks.filter(t => t.id !== id));

  const filtered = tasks.filter(t =>
    (filterStatus === "All" || t.status === filterStatus) &&
    (filterAssignee === "All" || t.assignedTo === filterAssignee)
  );

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold" style={{ color: COLORS.navy }}>Tasks</h1>
        {canAssignTasks && (
          <button onClick={() => setShowForm(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md text-white" style={{ background: COLORS.teal }}>
            <Plus size={14} /> New task
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-1">Assign and track quality-related work across the laboratory team.</p>
      {!canAssignTasks && <p className="text-xs text-gray-400 mb-3">Task assignment is limited to the Admin, QA Manager, and their deputies. You can still update the status of existing tasks.</p>}

      <div className="flex gap-2 mb-4">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
          <option>All</option>{TASK_STATUS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
          <option>All</option>{personnel.map(p => <option key={p.id}>{p.name}</option>)}
        </select>
      </div>

      {showForm && canAssignTasks && <TaskForm personnel={personnel} onCancel={() => setShowForm(false)} onSave={addTask} />}

      <div className="bg-white rounded-lg border divide-y" style={{ borderColor: "#E1EBE8" }}>
        {filtered.length === 0 && <Empty text="No tasks match this view." />}
        {filtered.map(t => {
          const overdue = t.status !== "Done" && t.dueDate && t.dueDate < todayISO();
          return (
            <div key={t.id} className="flex items-center gap-3 px-5 py-3">
              <button disabled={!canEdit} onClick={() => setTaskStatusAction(t.id, t.status === "Done" ? "Open" : "Done")} className="disabled:opacity-50">
                {t.status === "Done" ? <CheckCircle2 size={18} color={COLORS.teal} /> : <Circle size={18} color="#C7D6D2" />}
              </button>
              <div className="flex-1">
                <div className="text-sm" style={{ textDecoration: t.status === "Done" ? "line-through" : "none", color: t.status === "Done" ? "#9AA5A3" : COLORS.ink }}>{t.title}</div>
                <div className="text-xs text-gray-400">{t.assignedTo || "Unassigned"} {t.clauseId && `· Clause ${t.clauseId}`}</div>
              </div>
              <select value={t.status} disabled={!canEdit} onChange={e => setTaskStatusAction(t.id, e.target.value)} className="text-xs border rounded-md px-2 py-1 disabled:opacity-50" style={{ borderColor: "#D8E5E1" }}>
                {TASK_STATUS.map(s => <option key={s}>{s}</option>)}
              </select>
              <Badge color={overdue ? COLORS.red : "#9AA5A3"}>{t.dueDate || "no date"}</Badge>
              <Badge color={t.priority === "High" ? COLORS.red : t.priority === "Medium" ? COLORS.amber : "#9AA5A3"}>{t.priority}</Badge>
              {canAssignTasks && <button onClick={() => removeTask(t.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskForm({ personnel, onSave, onCancel }) {
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [clauseId, setClauseId] = useState("");
  return (
    <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
      <Field label="Task"><input className={inputCls} style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Update SOP for sample rejection criteria" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Assign to">
          <select className={inputCls} style={inputStyle} value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
            <option value="">Unassigned</option>{personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Related clause (optional)">
          <select className={inputCls} style={inputStyle} value={clauseId} onChange={e => setClauseId(e.target.value)}>
            <option value="">None</option>{ALL_SUBCLAUSES.map(s => <option key={s.id} value={s.id}>{s.id} — {s.title}</option>)}
          </select>
        </Field>
        <Field label="Due date"><input type="date" className={inputCls} style={inputStyle} value={dueDate} onChange={e => setDueDate(e.target.value)} /></Field>
        <Field label="Priority">
          <select className={inputCls} style={inputStyle} value={priority} onChange={e => setPriority(e.target.value)}>
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 text-gray-500">Cancel</button>
        <button onClick={() => title.trim() && onSave({ title, assignedTo, dueDate, priority, clauseId })}
          className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1" style={{ background: COLORS.teal }}><Save size={14} /> Save task</button>
      </div>
    </div>
  );
}

// ---------------- NC / CAPA Register ----------------
function NCRegister({ ncs, updateNcs, personnel, canEdit }) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const nextNcNumber = () => `NC-${String(ncs.length + 1).padStart(3, "0")}`;

  const addNc = (draft) => {
    const nc = {
      id: uid(), ncNumber: nextNcNumber(), status: "Open", dateRaised: todayISO(),
      rootCause: "", correctiveAction: "", preventiveAction: "", evidence: "", verifiedBy: "", closedDate: "",
      ...draft,
    };
    updateNcs([nc, ...ncs]);
    setShowForm(false);
  };
  const setNc = (id, patch) => updateNcs(ncs.map(n => n.id === id ? { ...n, ...patch } : n));
  const removeNc = (id) => updateNcs(ncs.filter(n => n.id !== id));

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold" style={{ color: COLORS.navy }}>Non-conformities & CAPA</h1>
        {canEdit && (
          <button onClick={() => setShowForm(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md text-white" style={{ background: COLORS.teal }}>
            <Plus size={14} /> Log nonconformity
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">Full lifecycle: raise, investigate root cause, implement corrective/preventive action, verify, and close.</p>

      {showForm && canEdit && <NcForm personnel={personnel} onCancel={() => setShowForm(false)} onSave={addNc} />}

      <div className="space-y-3">
        {ncs.length === 0 && <Empty text="No nonconformities logged yet." />}
        {ncs.map(n => (
          <div key={n.id} className="bg-white rounded-lg border" style={{ borderColor: "#E1EBE8" }}>
            <button onClick={() => setExpanded(expanded === n.id ? null : n.id)} className="w-full flex items-center gap-3 px-5 py-3 text-left">
              {expanded === n.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span className="text-sm font-medium" style={{ color: COLORS.navy }}>{n.ncNumber}</span>
              <span className="text-sm flex-1 truncate">{n.title}</span>
              <Badge color={n.severity === "Critical" ? COLORS.red : n.severity === "Major" ? COLORS.amber : "#9AA5A3"}>{n.severity}</Badge>
              <Badge color={n.status === "Closed" ? COLORS.teal : "#9AA5A3"}>{n.status}</Badge>
              {n.clauseId && <span className="text-xs text-gray-400">Clause {n.clauseId}</span>}
            </button>
            {expanded === n.id && (
              <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: "#EEF3F1" }}>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Field label="Description">
                    <textarea className={inputCls} style={inputStyle} rows={2} value={n.description || ""} onChange={e => setNc(n.id, { description: e.target.value })} />
                  </Field>
                  <Field label="Source">
                    <select className={inputCls} style={inputStyle} value={n.source || ""} onChange={e => setNc(n.id, { source: e.target.value })}>
                      <option value="">Select…</option>
                      <option>Internal audit</option><option>External audit</option><option>EQA/PT failure</option>
                      <option>Complaint</option><option>Equipment/IQC issue</option><option>Staff observation</option><option>Other</option>
                    </select>
                  </Field>
                  <Field label="Severity">
                    <select className={inputCls} style={inputStyle} value={n.severity} onChange={e => setNc(n.id, { severity: e.target.value })}>
                      {NC_SEVERITY.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Status">
                    <select className={inputCls} style={inputStyle} value={n.status} onChange={e => setNc(n.id, { status: e.target.value, closedDate: e.target.value === "Closed" ? todayISO() : n.closedDate })}>
                      {NC_STATUS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Assigned to">
                    <select className={inputCls} style={inputStyle} value={n.assignedTo || ""} onChange={e => setNc(n.id, { assignedTo: e.target.value })}>
                      <option value="">Unassigned</option>{personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Target close date">
                    <input type="date" className={inputCls} style={inputStyle} value={n.dueDate || ""} onChange={e => setNc(n.id, { dueDate: e.target.value })} />
                  </Field>
                  <Field label="Root cause analysis">
                    <textarea className={inputCls} style={inputStyle} rows={2} value={n.rootCause} onChange={e => setNc(n.id, { rootCause: e.target.value })} />
                  </Field>
                  <Field label="Corrective action">
                    <textarea className={inputCls} style={inputStyle} rows={2} value={n.correctiveAction} onChange={e => setNc(n.id, { correctiveAction: e.target.value })} />
                  </Field>
                  <Field label="Preventive action">
                    <textarea className={inputCls} style={inputStyle} rows={2} value={n.preventiveAction} onChange={e => setNc(n.id, { preventiveAction: e.target.value })} />
                  </Field>
                  <Field label="Evidence / records reference">
                    <textarea className={inputCls} style={inputStyle} rows={2} value={n.evidence} onChange={e => setNc(n.id, { evidence: e.target.value })} />
                  </Field>
                  <Field label="Verified by">
                    <select className={inputCls} style={inputStyle} value={n.verifiedBy || ""} onChange={e => setNc(n.id, { verifiedBy: e.target.value })}>
                      <option value="">Not yet verified</option>{personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Closed date">
                    <input type="date" className={inputCls} style={inputStyle} value={n.closedDate || ""} onChange={e => setNc(n.id, { closedDate: e.target.value })} />
                  </Field>
                </div>
                <div className="flex justify-end mt-2">
                  <button onClick={() => removeNc(n.id)} className="text-xs text-red-400 flex items-center gap-1"><Trash2 size={12} /> Delete record</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NcForm({ personnel, onSave, onCancel }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clauseId, setClauseId] = useState("");
  const [severity, setSeverity] = useState("Minor");
  const [source, setSource] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [raisedBy, setRaisedBy] = useState("");
  return (
    <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
      <Field label="Title"><input className={inputCls} style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Short summary of the nonconformity" /></Field>
      <Field label="Description"><textarea className={inputCls} style={inputStyle} rows={2} value={description} onChange={e => setDescription(e.target.value)} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Related clause">
          <select className={inputCls} style={inputStyle} value={clauseId} onChange={e => setClauseId(e.target.value)}>
            <option value="">Select…</option>{ALL_SUBCLAUSES.map(s => <option key={s.id} value={s.id}>{s.id} — {s.title}</option>)}
          </select>
        </Field>
        <Field label="Severity">
          <select className={inputCls} style={inputStyle} value={severity} onChange={e => setSeverity(e.target.value)}>
            {NC_SEVERITY.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Source">
          <select className={inputCls} style={inputStyle} value={source} onChange={e => setSource(e.target.value)}>
            <option value="">Select…</option>
            <option>Internal audit</option><option>External audit</option><option>EQA/PT failure</option>
            <option>Complaint</option><option>Equipment/IQC issue</option><option>Staff observation</option><option>Other</option>
          </select>
        </Field>
        <Field label="Raised by">
          <select className={inputCls} style={inputStyle} value={raisedBy} onChange={e => setRaisedBy(e.target.value)}>
            <option value="">Select…</option>{personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Assign investigation to">
          <select className={inputCls} style={inputStyle} value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
            <option value="">Unassigned</option>{personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Target close date"><input type="date" className={inputCls} style={inputStyle} value={dueDate} onChange={e => setDueDate(e.target.value)} /></Field>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 text-gray-500">Cancel</button>
        <button onClick={() => title.trim() && onSave({ title, description, clauseId, severity, source, assignedTo, dueDate, raisedBy })}
          className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1" style={{ background: COLORS.teal }}><Save size={14} /> Log nonconformity</button>
      </div>
    </div>
  );
}

// ---------------- Personnel ----------------
function Personnel({ personnel, setPersonnel, updatePersonnel, currentUser, isAdmin, canEdit }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [recordCardNumber, setRecordCardNumber] = useState("");
  const [password, setPassword] = useState("");
  const [accessRole, setAccessRole] = useState("Technologist");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const addPerson = async () => {
    if (!name.trim() || !recordCardNumber.trim() || password.length < 6) {
      setCreateError("Name, record card number, and a password of at least 6 characters are required.");
      return;
    }
    setCreating(true); setCreateError("");
    try {
      const created = await adminCreateStaff({ name, jobTitle: role, email, recordCardNumber, password, accessRole });
      setPersonnel([...personnel, personnelFromDb(created)]);
      setName(""); setRole(""); setEmail(""); setRecordCardNumber(""); setPassword(""); setAccessRole("Technologist");
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };
  const removePerson = (id) => updatePersonnel(personnel.filter(p => p.id !== id));
  const setAccess = (id, patch) => updatePersonnel(personnel.map(p => p.id === id ? { ...p, ...patch } : p));

  /**
   * Bulk Excel import: rows with a matching existing ID are treated as
   * metadata updates (name/role/email/record card/access role) and go
   * through the normal update path. Rows with no matching ID are brand-new
   * staff and need a real login — each is created individually via the same
   * admin-create-staff Edge Function the manual form uses, so it requires a
   * Password column filled in for new rows (the template includes one).
   */
  const handleImport = async (rows) => {
    const existingById = Object.fromEntries(personnel.map(p => [p.id, p]));
    const toUpdate = [];
    const toCreate = [];
    rows.forEach(row => {
      const id = cellGet(row, "ID", "Id", "id");
      const rName = cellGet(row, "Name", "name");
      if (!rName) return;
      const common = {
        name: rName,
        role: cellGet(row, "Role", "role"),
        email: cellGet(row, "Email", "email"),
        recordCardNumber: cellGet(row, "Record Card Number", "RecordCardNumber", "recordCardNumber"),
        accessRole: cellGet(row, "Access Role", "AccessRole", "accessRole") || "Technologist",
      };
      if (id && existingById[id]) toUpdate.push({ ...existingById[id], ...common });
      else toCreate.push({ ...common, password: cellGet(row, "Password", "password") });
    });

    let created = 0, failed = [];
    for (const draft of toCreate) {
      if (!draft.password || draft.password.length < 6) { failed.push(`${draft.name} (no valid password)`); continue; }
      try {
        const person = await adminCreateStaff(draft);
        setPersonnel(prev => [...prev, personnelFromDb(person)]);
        created++;
      } catch (e) {
        failed.push(`${draft.name} (${e.message})`);
      }
    }
    if (toUpdate.length) {
      const merged = personnel.map(p => toUpdate.find(u => u.id === p.id) || p);
      await updatePersonnel(merged);
    }
    if (failed.length) alert(`${created} new account(s) created. Skipped: ${failed.join(", ")}`);
    return created + toUpdate.length;
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: COLORS.navy }}>Personnel</h1>
      <p className="text-sm text-gray-500 mb-4">Laboratory staff available for clause ownership, task assignment, and NC investigation. Record Card Number is each person's sign-in username.</p>

      <ImportExportBar
        label="staff list"
        templateRows={personnel.map(p => ({ ID: p.id, Name: p.name, Role: p.role, Email: p.email, "Record Card Number": p.recordCardNumber, Password: p.password, "Access Role": p.accessRole }))}
        sheetName="Personnel" filenameBase="lab-personnel" onImportRows={handleImport} canImport={isAdmin}
      />
      <p className="text-xs text-gray-400 -mt-2 mb-4">Download, edit in Excel, then re-import — rows with a matching ID update that person's details; new rows (blank ID, with a Password filled in) create a real login. Record Card Number becomes their username.</p>

      {isAdmin ? (
        <div className="bg-white rounded-lg border p-5 mb-6" style={{ borderColor: "#E1EBE8" }}>
          <div className="flex items-center gap-1.5 text-xs font-medium mb-3" style={{ color: COLORS.navy }}><KeyRound size={13} /> Add new staff & set their access</div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Name"><input className={inputCls} style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" /></Field>
            <Field label="Job title"><input className={inputCls} style={inputStyle} value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Lab Technologist" /></Field>
            <Field label="Email"><input className={inputCls} style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="name@lab.mv" /></Field>
            <Field label="Record Card Number (username)"><input className={inputCls} style={inputStyle} value={recordCardNumber} onChange={e => setRecordCardNumber(e.target.value)} placeholder="e.g. RC-0142" /></Field>
            <Field label="Password"><input type="password" className={inputCls} style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" /></Field>
            <Field label="Access role / authorisation level">
              <select className={inputCls} style={inputStyle} value={accessRole} onChange={e => setAccessRole(e.target.value)}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
          </div>
          <div className="text-[11px] text-gray-400 mb-2">{ROLE_DESC[accessRole]}</div>
          {createError && <div className="text-xs mb-2" style={{ color: COLORS.red }}>{createError}</div>}
          <div className="flex justify-end">
            <button onClick={addPerson} disabled={creating} className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1 disabled:opacity-50" style={{ background: COLORS.teal }}>
              <Plus size={14} /> {creating ? "Creating…" : "Add staff member"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-6">Adding new staff and assigning access roles is limited to Admins. Contact your Admin to be added or to change your access level.</p>
      )}

      {isAdmin && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2"><KeyRound size={12} /> You can also update any existing person's record card number (username), access role, and password below. Access role is auto-detected from their account at login — staff never choose it themselves.</div>
      )}

      <div className="bg-white rounded-lg border divide-y" style={{ borderColor: "#E1EBE8" }}>
        {personnel.length === 0 && <Empty text="No personnel added yet." />}
        {personnel.map(p => (
          <div key={p.id} className="flex items-center gap-3 px-5 py-3 flex-wrap">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-white shrink-0" style={{ background: COLORS.teal }}>
              {p.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-[140px]">
              <div className="text-sm">{p.name}{p.id === currentUser?.id ? <span className="text-xs text-gray-400"> (you)</span> : ""}</div>
              <div className="text-xs text-gray-400">{p.role || "No role set"}{p.email ? ` · ${p.email}` : ""}</div>
            </div>
            {isAdmin ? (
              <>
                <input value={p.recordCardNumber || ""} onChange={e => setAccess(p.id, { recordCardNumber: e.target.value })}
                  placeholder="Record card #" className="text-xs border rounded-md px-2 py-1 w-28" style={{ borderColor: "#D8E5E1" }} />
                <select value={p.accessRole || "Technologist"} onChange={e => setAccess(p.id, { accessRole: e.target.value })} className="text-xs border rounded-md px-2 py-1" style={{ borderColor: "#D8E5E1" }}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
                <ResetPasswordControl personnelId={p.id} />
              </>
            ) : (
              <>
                <span className="text-xs text-gray-400">{p.recordCardNumber || "no card #"}</span>
                <Badge color={COLORS.teal}>{p.accessRole || "Technologist"}</Badge>
              </>
            )}
            {isAdmin && <button onClick={() => removePerson(p.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Reset an existing person's password (Admin only) ----------------
function ResetPasswordControl({ personnelId }) {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const handleReset = async () => {
    if (newPassword.length < 6) { setStatus("At least 6 characters."); return; }
    setBusy(true); setStatus("");
    try {
      await adminResetPassword(personnelId, newPassword);
      setStatus("Password updated.");
      setNewPassword("");
      setTimeout(() => { setOpen(false); setStatus(""); }, 1200);
    } catch (e) {
      setStatus(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return <button onClick={() => setOpen(true)} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: COLORS.navy, color: COLORS.navy }}>Reset password</button>;
  }
  return (
    <div className="flex items-center gap-1">
      <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password"
        className="text-xs border rounded-md px-2 py-1 w-28" style={{ borderColor: "#D8E5E1" }} />
      <button disabled={busy} onClick={handleReset} className="text-xs px-2 py-1 rounded-md text-white disabled:opacity-50" style={{ background: COLORS.teal }}>
        {busy ? "…" : "Save"}
      </button>
      <button onClick={() => { setOpen(false); setStatus(""); }} className="text-gray-400"><X size={12} /></button>
      {status && <span className="text-[10px]" style={{ color: status === "Password updated." ? COLORS.teal : COLORS.red }}>{status}</span>}
    </div>
  );
}

// ---------------- Staff Competency (Clause 6.1) ----------------
function Competency({ competency, updateCompetency, personnel, canEdit }) {
  const [showForm, setShowForm] = useState(false);
  const [filterPerson, setFilterPerson] = useState("All");
  const [filterType, setFilterType] = useState("All");

  const addRecord = (draft) => {
    updateCompetency([{ id: uid(), createdAt: todayISO(), ...draft }, ...competency]);
    setShowForm(false);
  };
  const setRecord = (id, patch) => updateCompetency(competency.map(c => c.id === id ? { ...c, ...patch } : c));
  const removeRecord = (id) => updateCompetency(competency.filter(c => c.id !== id));

  const filtered = competency.filter(c =>
    (filterPerson === "All" || c.personnelName === filterPerson) &&
    (filterType === "All" || c.type === filterType)
  ).sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));

  const statusOf = (c) => {
    if (!c.dueDate) return { label: "No due date", color: "#9AA5A3" };
    if (c.dueDate < todayISO()) return { label: "Overdue", color: COLORS.red };
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);
    if (c.dueDate <= in30.toISOString().slice(0, 10)) return { label: "Due soon", color: COLORS.amber };
    return { label: "On track", color: COLORS.teal };
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold" style={{ color: COLORS.navy }}>Staff competency & training</h1>
        {canEdit && (
          <button onClick={() => setShowForm(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md text-white" style={{ background: COLORS.teal }}>
            <Plus size={14} /> Log record
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">Training, induction, and competency assessment records supporting ISO 15189:2022 Clause 6.1 (Personnel).</p>

      <div className="flex gap-2 mb-4">
        <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
          <option>All</option>{personnel.map(p => <option key={p.id}>{p.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
          <option>All</option>{COMPETENCY_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {showForm && canEdit && <CompetencyForm personnel={personnel} onCancel={() => setShowForm(false)} onSave={addRecord} />}

      <div className="bg-white rounded-lg border divide-y" style={{ borderColor: "#E1EBE8" }}>
        {filtered.length === 0 && <Empty text="No competency or training records logged yet." />}
        {filtered.map(c => {
          const st = statusOf(c);
          return (
            <div key={c.id} className="px-5 py-3">
              <div className="flex items-center gap-3">
                <GraduationCap size={16} color={COLORS.teal} className="shrink-0" />
                <div className="flex-1">
                  <div className="text-sm">{c.personnelName} — {c.title}</div>
                  <div className="text-xs text-gray-400">{c.type}{c.method ? ` · ${c.method}` : ""}{c.assessor ? ` · Assessed by ${c.assessor}` : ""}</div>
                </div>
                <select value={c.result || ""} onChange={e => setRecord(c.id, { result: e.target.value })} className="text-xs border rounded-md px-2 py-1" style={{ borderColor: "#D8E5E1" }}>
                  <option value="">Result…</option>{COMPETENCY_RESULT.map(r => <option key={r}>{r}</option>)}
                </select>
                <span className="text-xs text-gray-400">{c.date}</span>
                <Badge color={st.color}>{c.dueDate ? `${st.label} · next ${c.dueDate}` : st.label}</Badge>
                <button onClick={() => removeRecord(c.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
              {c.notes && <div className="text-xs text-gray-500 mt-1 pl-7">{c.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompetencyForm({ personnel, onSave, onCancel }) {
  const [personnelName, setPersonnelName] = useState("");
  const [type, setType] = useState(COMPETENCY_TYPES[0]);
  const [title, setTitle] = useState("");
  const [method, setMethod] = useState("");
  const [assessor, setAssessor] = useState("");
  const [date, setDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [result, setResult] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Staff member">
          <select className={inputCls} style={inputStyle} value={personnelName} onChange={e => setPersonnelName(e.target.value)}>
            <option value="">Select…</option>{personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Record type">
          <select className={inputCls} style={inputStyle} value={type} onChange={e => setType(e.target.value)}>
            {COMPETENCY_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Title / procedure assessed"><input className={inputCls} style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Manual differential counting, Medonic M51 operation" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Assessment method">
          <select className={inputCls} style={inputStyle} value={method} onChange={e => setMethod(e.target.value)}>
            <option value="">Select…</option>{COMPETENCY_METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Assessor / trainer"><input className={inputCls} style={inputStyle} value={assessor} onChange={e => setAssessor(e.target.value)} /></Field>
        <Field label="Date"><input type="date" className={inputCls} style={inputStyle} value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Next due date"><input type="date" className={inputCls} style={inputStyle} value={dueDate} onChange={e => setDueDate(e.target.value)} /></Field>
        <Field label="Result">
          <select className={inputCls} style={inputStyle} value={result} onChange={e => setResult(e.target.value)}>
            <option value="">Select…</option>{COMPETENCY_RESULT.map(r => <option key={r}>{r}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Notes"><textarea className={inputCls} style={inputStyle} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Evidence reference, certificate number, observations…" /></Field>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 text-gray-500">Cancel</button>
        <button onClick={() => personnelName && title.trim() && onSave({ personnelName, type, title, method, assessor, date, dueDate, result, notes })}
          className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1" style={{ background: COLORS.teal }}><Save size={14} /> Save record</button>
      </div>
    </div>
  );
}

// ---------------- Equipment & Records (Clauses 6.3 / 6.4: IQ, OQ, PQ, calibration, maintenance) ----------------
function Equipment({ equipment, updateEquipment, equipmentRecords, updateEquipmentRecords, personnel, canEdit }) {
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [recordDraftFor, setRecordDraftFor] = useState(null);

  const addEquipment = (draft) => {
    updateEquipment([{ id: uid(), status: "In service", ...draft }, ...equipment]);
    setShowEquipForm(false);
  };
  const setEquip = (id, patch) => updateEquipment(equipment.map(e => e.id === id ? { ...e, ...patch } : e));
  const removeEquipment = (id) => {
    updateEquipment(equipment.filter(e => e.id !== id));
    updateEquipmentRecords(equipmentRecords.filter(r => r.equipmentId !== id));
  };

  const addRecord = (equipmentId, draft) => {
    updateEquipmentRecords([{ id: uid(), equipmentId, createdAt: todayISO(), ...draft }, ...equipmentRecords]);
    setRecordDraftFor(null);
  };
  const removeRecord = (id) => updateEquipmentRecords(equipmentRecords.filter(r => r.id !== id));

  const recordsFor = (equipmentId) => equipmentRecords.filter(r => r.equipmentId === equipmentId)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const dueStatus = (dueDate) => {
    if (!dueDate) return null;
    if (dueDate < todayISO()) return { label: "Overdue", color: COLORS.red };
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);
    if (dueDate <= in30.toISOString().slice(0, 10)) return { label: "Due soon", color: COLORS.amber };
    return { label: "OK", color: COLORS.teal };
  };

  const handleImportEquipment = (rows) => {
    const next = [...equipment];
    let count = 0;
    rows.forEach(row => {
      const id = cellGet(row, "ID", "Id", "id");
      const rName = cellGet(row, "Name", "name");
      if (!rName) return;
      const rec = {
        name: rName,
        model: cellGet(row, "Model", "model"),
        serialNumber: cellGet(row, "Serial Number", "SerialNumber", "serialNumber"),
        category: cellGet(row, "Category", "category"),
        location: cellGet(row, "Location", "location"),
        commissionDate: cellGet(row, "Commission Date", "CommissionDate", "commissionDate"),
        status: cellGet(row, "Status", "status") || "In service",
      };
      const idx = id ? next.findIndex(e => e.id === id) : -1;
      if (idx >= 0) next[idx] = { ...next[idx], ...rec };
      else next.push({ id: uid(), ...rec });
      count++;
    });
    updateEquipment(next);
    return count;
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold" style={{ color: COLORS.navy }}>Equipment records</h1>
        {canEdit && (
          <button onClick={() => setShowEquipForm(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md text-white" style={{ background: COLORS.teal }}>
            <Plus size={14} /> Add equipment
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">Inventory and full qualification/maintenance history — IQ, OQ, PQ, calibration, and preventive/corrective maintenance — per ISO 15189:2022 Clauses 6.3 and 6.4.</p>

      <ImportExportBar
        label="equipment inventory"
        templateRows={equipment.map(e => ({ ID: e.id, Name: e.name, Model: e.model, "Serial Number": e.serialNumber, Category: e.category, Location: e.location, "Commission Date": e.commissionDate, Status: e.status }))}
        sheetName="Equipment" filenameBase="lab-equipment" onImportRows={handleImportEquipment} canImport={canEdit}
      />
      <p className="text-xs text-gray-400 -mt-2 mb-4">Download, edit in Excel, then re-import — rows with a matching ID update that item; new rows (blank ID) are added. Qualification/maintenance history is managed per item below.</p>

      {showEquipForm && canEdit && <EquipmentForm onCancel={() => setShowEquipForm(false)} onSave={addEquipment} />}

      <div className="space-y-3">
        {equipment.length === 0 && <Empty text="No equipment added yet." />}
        {equipment.map(eq => {
          const recs = recordsFor(eq.id);
          const nextDue = recs.filter(r => r.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
          const ds = nextDue ? dueStatus(nextDue.dueDate) : null;
          return (
            <div key={eq.id} className="bg-white rounded-lg border" style={{ borderColor: "#E1EBE8" }}>
              <button onClick={() => setExpanded(expanded === eq.id ? null : eq.id)} className="w-full flex items-center gap-3 px-5 py-3 text-left">
                {expanded === eq.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <Wrench size={16} color={COLORS.teal} />
                <div className="flex-1">
                  <span className="text-sm font-medium" style={{ color: COLORS.navy }}>{eq.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{eq.model}{eq.serialNumber ? ` · S/N ${eq.serialNumber}` : ""}</span>
                </div>
                <Badge color={eq.status === "In service" ? COLORS.teal : "#9AA5A3"}>{eq.status}</Badge>
                {ds && <Badge color={ds.color}>{ds.label === "OK" ? `Next due ${nextDue.dueDate}` : `${ds.label}: ${nextDue.dueDate}`}</Badge>}
                <span className="text-xs text-gray-400">{recs.length} record{recs.length !== 1 ? "s" : ""}</span>
              </button>
              {expanded === eq.id && (
                <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: "#EEF3F1" }}>
                  <div className="grid grid-cols-3 gap-3 mt-3 mb-3">
                    <Field label="Category">
                      <select className={inputCls} style={inputStyle} value={eq.category || ""} onChange={e => setEquip(eq.id, { category: e.target.value })}>
                        <option value="">Select…</option>{EQUIPMENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Location">
                      <input className={inputCls} style={inputStyle} value={eq.location || ""} onChange={e => setEquip(eq.id, { location: e.target.value })} />
                    </Field>
                    <Field label="Status">
                      <select className={inputCls} style={inputStyle} value={eq.status} onChange={e => setEquip(eq.id, { status: e.target.value })}>
                        {EQUIPMENT_STATUS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </Field>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium" style={{ color: COLORS.navy }}>Qualification & maintenance history</div>
                    <button onClick={() => setRecordDraftFor(eq.id)} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
                      <Plus size={12} /> Add record
                    </button>
                  </div>

                  {recordDraftFor === eq.id && (
                    <EquipmentRecordForm personnel={personnel} onCancel={() => setRecordDraftFor(null)} onSave={(draft) => addRecord(eq.id, draft)} />
                  )}

                  <div className="border rounded-md divide-y" style={{ borderColor: "#EEF3F1" }}>
                    {recs.length === 0 && <div className="text-xs text-gray-400 px-3 py-3">No IQ/OQ/PQ, calibration, or maintenance records yet.</div>}
                    {recs.map(r => {
                      const rds = dueStatus(r.dueDate);
                      return (
                        <div key={r.id} className="px-3 py-2 flex items-center gap-3">
                          <Badge color={COLORS.navy}>{r.type}</Badge>
                          <div className="flex-1">
                            <div className="text-xs">{r.date} · {r.performedBy || "unassigned"}{r.documentRef ? ` · Ref: ${r.documentRef}` : ""}</div>
                            {r.notes && <div className="text-xs text-gray-400">{r.notes}</div>}
                          </div>
                          {r.result && <Badge color={r.result === "Fail" ? COLORS.red : r.result === "Conditional pass" ? COLORS.amber : COLORS.teal}>{r.result}</Badge>}
                          {rds && <Badge color={rds.color}>{rds.label === "OK" ? `Due ${r.dueDate}` : `${rds.label} ${r.dueDate}`}</Badge>}
                          <button onClick={() => removeRecord(r.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end mt-3">
                    <button onClick={() => removeEquipment(eq.id)} className="text-xs text-red-400 flex items-center gap-1"><Trash2 size={12} /> Remove equipment</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EquipmentForm({ onSave, onCancel }) {
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [commissionDate, setCommissionDate] = useState("");

  return (
    <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Equipment name"><input className={inputCls} style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Medonic M51 Hematology Analyser" /></Field>
        <Field label="Model"><input className={inputCls} style={inputStyle} value={model} onChange={e => setModel(e.target.value)} /></Field>
        <Field label="Serial number"><input className={inputCls} style={inputStyle} value={serialNumber} onChange={e => setSerialNumber(e.target.value)} /></Field>
        <Field label="Category">
          <select className={inputCls} style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Select…</option>{EQUIPMENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Location"><input className={inputCls} style={inputStyle} value={location} onChange={e => setLocation(e.target.value)} /></Field>
        <Field label="Commission date"><input type="date" className={inputCls} style={inputStyle} value={commissionDate} onChange={e => setCommissionDate(e.target.value)} /></Field>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 text-gray-500">Cancel</button>
        <button onClick={() => name.trim() && onSave({ name, model, serialNumber, category, location, commissionDate })}
          className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1" style={{ background: COLORS.teal }}><Save size={14} /> Add equipment</button>
      </div>
    </div>
  );
}

function EquipmentRecordForm({ personnel, onSave, onCancel }) {
  const [type, setType] = useState(EQUIPMENT_RECORD_TYPES[0]);
  const [date, setDate] = useState(todayISO());
  const [performedBy, setPerformedBy] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [result, setResult] = useState("");
  const [documentRef, setDocumentRef] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="mb-3 p-3 rounded-md" style={{ background: COLORS.mint }}>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <select value={type} onChange={e => setType(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
          {EQUIPMENT_RECORD_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={performedBy} onChange={e => setPerformedBy(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
          <option value="">Performed by…</option>{personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }} title="Date performed" />
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }} title="Next due date" />
        <select value={result} onChange={e => setResult(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
          <option value="">Result…</option>{RECORD_RESULT.map(r => <option key={r}>{r}</option>)}
        </select>
        <input value={documentRef} onChange={e => setDocumentRef(e.target.value)} placeholder="Document / certificate ref." className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }} />
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes…" rows={2} className="w-full text-xs border rounded-md px-2 py-1.5 mb-2" style={{ borderColor: "#D8E5E1" }} />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs px-3 py-1 rounded-md text-gray-500">Cancel</button>
        <button onClick={() => onSave({ type, date, performedBy, dueDate, result, documentRef, notes })}
          className="text-xs px-3 py-1 rounded-md text-white" style={{ background: COLORS.teal }}>Save record</button>
      </div>
    </div>
  );
}

// ---------------- Authorization control (shared by IQC) ----------------
function AuthorizeControl({ run, currentUser, canAuthorize, onAuthorize }) {
  const [confirming, setConfirming] = useState(false);

  if (run.authorized) {
    return (
      <div className="flex items-center gap-1 text-xs" style={{ color: COLORS.teal }}>
        <UserCheck size={13} />
        <span className="font-semibold">{run.authorizedByInitials}</span>
        <span className="text-gray-400">{run.authorizedAt ? new Date(run.authorizedAt).toLocaleString() : ""}</span>
      </div>
    );
  }
  if (!canAuthorize) {
    return <span className="text-xs text-gray-400">Awaiting QA Manager sign-off</span>;
  }
  if (!confirming) {
    return <button onClick={() => setConfirming(true)} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>Authorize</button>;
  }
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-gray-500">Authorize as <span className="font-semibold" style={{ color: COLORS.navy }}>{currentUser.name} ({initialsOf(currentUser.name)})</span>?</span>
      <button onClick={() => { onAuthorize(currentUser.name); setConfirming(false); }}
        className="px-2 py-1 rounded-md text-white" style={{ background: COLORS.teal }}>✓ Confirm</button>
      <button onClick={() => setConfirming(false)} className="text-gray-400"><X size={12} /></button>
    </div>
  );
}

// ---------------- IQC & Levey-Jennings (Clause 7.3.7 Quality control) ----------------
function IQCPage({ qcMachines, updateQcMachines, qcParameters, updateQcParameters, qcControls, updateQcControls, qcRuns, updateQcRuns, personnel, canEdit, canAuthorizeIQC, currentUser, authorizeQcRunAction }) {
  const [showMachineForm, setShowMachineForm] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState(qcMachines[0]?.id || null);
  const [showParamForm, setShowParamForm] = useState(false);
  const [showDailyEntry, setShowDailyEntry] = useState(false);
  const [expandedParamId, setExpandedParamId] = useState(null);
  const [controlFormFor, setControlFormFor] = useState(null);
  const [runFormFor, setRunFormFor] = useState(null);
  const [chartControlByParam, setChartControlByParam] = useState({});

  useEffect(() => {
    if (!selectedMachineId && qcMachines.length) setSelectedMachineId(qcMachines[0].id);
  }, [qcMachines]);

  const addMachine = (draft) => { updateQcMachines([{ id: uid(), ...draft }, ...qcMachines]); setShowMachineForm(false); };
  const removeMachine = (id) => {
    updateQcMachines(qcMachines.filter(m => m.id !== id));
    const paramIds = qcParameters.filter(p => p.machineId === id).map(p => p.id);
    updateQcParameters(qcParameters.filter(p => p.machineId !== id));
    const controlIds = qcControls.filter(c => paramIds.includes(c.parameterId)).map(c => c.id);
    updateQcControls(qcControls.filter(c => !paramIds.includes(c.parameterId)));
    updateQcRuns(qcRuns.filter(r => !controlIds.includes(r.controlId)));
    if (selectedMachineId === id) setSelectedMachineId(null);
  };

  const addParameter = (draft) => { updateQcParameters([{ id: uid(), machineId: selectedMachineId, ...draft }, ...qcParameters]); setShowParamForm(false); };
  const removeParameter = (id) => {
    updateQcParameters(qcParameters.filter(p => p.id !== id));
    const controlIds = qcControls.filter(c => c.parameterId === id).map(c => c.id);
    updateQcControls(qcControls.filter(c => c.parameterId !== id));
    updateQcRuns(qcRuns.filter(r => !controlIds.includes(r.controlId)));
  };

  const addControl = (parameterId, draft) => { updateQcControls([{ id: uid(), parameterId, ...draft }, ...qcControls]); setControlFormFor(null); };
  const removeControl = (id) => { updateQcControls(qcControls.filter(c => c.id !== id)); updateQcRuns(qcRuns.filter(r => r.controlId !== id)); };

  const addRun = (controlId, draft) => { updateQcRuns([{ id: uid(), controlId, authorized: false, ...draft }, ...qcRuns]); setRunFormFor(null); };
  const addRunsBatch = (entries) => {
    const newRuns = entries.map(e => ({ id: uid(), controlId: e.controlId, authorized: false, ...e.draft }));
    updateQcRuns([...newRuns, ...qcRuns]);
  };
  const removeRun = (id) => updateQcRuns(qcRuns.filter(r => r.id !== id));

  const machinesByDiscipline = DISCIPLINES.map(d => ({ discipline: d, machines: qcMachines.filter(m => m.discipline === d) }));
  const selectedMachine = qcMachines.find(m => m.id === selectedMachineId);
  const paramsForMachine = qcParameters.filter(p => p.machineId === selectedMachineId);

  const handleImportMachines = (rows) => {
    const next = [...qcMachines];
    let count = 0;
    rows.forEach(row => {
      const id = cellGet(row, "ID", "Id", "id");
      const rName = cellGet(row, "Name", "name");
      if (!rName) return;
      const rec = { name: rName, discipline: cellGet(row, "Discipline", "discipline") || DISCIPLINES[0], model: cellGet(row, "Model", "model") };
      const idx = id ? next.findIndex(m => m.id === id) : -1;
      if (idx >= 0) next[idx] = { ...next[idx], ...rec };
      else next.push({ id: uid(), ...rec });
      count++;
    });
    updateQcMachines(next);
    return count;
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold" style={{ color: COLORS.navy }}>IQC & Levey-Jennings</h1>
        {canEdit && (
          <button onClick={() => setShowMachineForm(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md text-white" style={{ background: COLORS.teal }}>
            <Plus size={14} /> Add machine
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">Internal quality control for Hematology, Biochemistry, and Immunochemistry analysers — Levey-Jennings charts with Westgard multirule evaluation and result authorization.</p>

      <ImportExportBar
        label="analyser list"
        templateRows={qcMachines.map(m => ({ ID: m.id, Name: m.name, Discipline: m.discipline, Model: m.model }))}
        sheetName="Analysers" filenameBase="lab-analysers" onImportRows={handleImportMachines} canImport={canEdit}
      />
      <p className="text-xs text-gray-400 -mt-2 mb-4">Download, edit in Excel, then re-import — rows with a matching ID update that analyser; new rows (blank ID) are added. Discipline must be Hematology, Biochemistry, or Immunochemistry.</p>

      {showMachineForm && canEdit && <MachineForm onCancel={() => setShowMachineForm(false)} onSave={addMachine} />}

      {/* Machine tabs grouped by discipline */}
      <div className="mb-6 space-y-3">
        {machinesByDiscipline.map(group => group.machines.length > 0 && (
          <div key={group.discipline}>
            <div className="text-xs font-medium mb-1.5" style={{ color: DISCIPLINE_COLOR[group.discipline] }}>{group.discipline}</div>
            <div className="flex flex-wrap gap-2">
              {group.machines.map(m => (
                <button key={m.id} onClick={() => setSelectedMachineId(m.id)}
                  className="text-sm px-3 py-1.5 rounded-md border flex items-center gap-1.5"
                  style={{
                    borderColor: selectedMachineId === m.id ? DISCIPLINE_COLOR[group.discipline] : "#D8E5E1",
                    background: selectedMachineId === m.id ? DISCIPLINE_COLOR[group.discipline] + "18" : "white",
                    color: selectedMachineId === m.id ? DISCIPLINE_COLOR[group.discipline] : COLORS.ink,
                  }}>
                  <FlaskConical size={13} /> {m.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        {qcMachines.length === 0 && <Empty text="No analysers added yet. Add a machine to begin logging IQC." />}
      </div>

      {selectedMachine && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-lg font-medium" style={{ color: COLORS.navy }}>{selectedMachine.name}</div>
              <div className="text-xs text-gray-400">{selectedMachine.discipline} · {selectedMachine.model || "no model set"}</div>
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <button onClick={() => setShowDailyEntry(v => !v)} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white" style={{ background: COLORS.teal }}>
                  <Activity size={13} /> Daily IQC entry
                </button>
                <button onClick={() => setShowParamForm(v => !v)} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
                  <Plus size={13} /> Add parameter
                </button>
                <button onClick={() => removeMachine(selectedMachine.id)} className="text-xs text-red-400 flex items-center gap-1"><Trash2 size={13} /> Remove machine</button>
              </div>
            )}
          </div>

          {showDailyEntry && canEdit && (
            <DailyIQCEntry
              parameters={paramsForMachine}
              controls={qcControls.filter(c => paramsForMachine.some(p => p.id === c.parameterId))}
              personnel={personnel}
              onSaveBatch={addRunsBatch}
              onClose={() => setShowDailyEntry(false)}
            />
          )}

          {showParamForm && canEdit && <ParameterForm onCancel={() => setShowParamForm(false)} onSave={addParameter} />}

          <div className="space-y-3">
            {paramsForMachine.length === 0 && <Empty text="No parameters set up for this machine yet." />}
            {paramsForMachine.map(param => {
              const controls = qcControls.filter(c => c.parameterId === param.id);
              // Evaluate all controls for this parameter (needed for cross-level R4s)
              const perControlEvald = {};
              const allRuns = [];
              controls.forEach(ctrl => {
                const runsAsc = qcRuns.filter(r => r.controlId === ctrl.id)
                  .map(r => ({ ...r, mean: ctrl.mean, sd: ctrl.sd }))
                  .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
                const evald = evaluateControlSeries(runsAsc);
                perControlEvald[ctrl.id] = evald;
                allRuns.push(...evald);
              });
              const withR4s = applyR4s(allRuns, allRuns);
              const withR4sById = Object.fromEntries(withR4s.map(r => [r.id, r]));
              const activeChartControlId = chartControlByParam[param.id] || controls[0]?.id;
              const chartRuns = activeChartControlId
                ? (perControlEvald[activeChartControlId] || []).map(r => ({ ...r, ...withR4sById[r.id] }))
                : [];
              const activeControl = controls.find(c => c.id === activeChartControlId);
              const isOpen = expandedParamId === param.id;
              const allParamRunsDesc = allRuns.map(r => withR4sById[r.id])
                .sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
              const openViolations = allParamRunsDesc.filter(r => !r.authorized && r.violations.some(v => REJECT_RULES.includes(v))).length;

              return (
                <div key={param.id} className="bg-white rounded-lg border" style={{ borderColor: "#E1EBE8" }}>
                  <button onClick={() => setExpandedParamId(isOpen ? null : param.id)} className="w-full flex items-center gap-3 px-5 py-3 text-left">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span className="text-sm font-medium" style={{ color: COLORS.navy }}>{param.name}</span>
                    <span className="text-xs text-gray-400">{param.unit}</span>
                    <span className="text-xs text-gray-400">{controls.length} control level{controls.length !== 1 ? "s" : ""}</span>
                    {openViolations > 0 && <Badge color={COLORS.red}><ShieldAlert size={11} className="inline -mt-0.5 mr-1" />{openViolations} unauthorized violation{openViolations !== 1 ? "s" : ""}</Badge>}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: "#EEF3F1" }}>
                      {/* Control levels */}
                      <div className="flex items-center justify-between mt-3 mb-2">
                        <div className="text-xs font-medium" style={{ color: COLORS.navy }}>Control levels / lots</div>
                        {canEdit && (
                          <button onClick={() => setControlFormFor(controlFormFor === param.id ? null : param.id)} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
                            <Plus size={12} /> Add level
                          </button>
                        )}
                      </div>
                      {controlFormFor === param.id && canEdit && <ControlForm onCancel={() => setControlFormFor(null)} onSave={(draft) => addControl(param.id, draft)} />}
                      <div className="border rounded-md divide-y mb-4" style={{ borderColor: "#EEF3F1" }}>
                        {controls.length === 0 && <div className="text-xs text-gray-400 px-3 py-2">No control levels defined. Add one to start logging IQC.</div>}
                        {controls.map(c => (
                          <div key={c.id} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                            <span className="font-medium w-32">{c.level}</span>
                            <span className="text-gray-500 flex-1">Lot {c.lotNumber} · Mean {c.mean} · SD {c.sd}{c.expiryDate ? ` · exp ${c.expiryDate}` : ""}</span>
                            {canEdit && <button onClick={() => removeControl(c.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>}
                          </div>
                        ))}
                      </div>

                      {/* Chart */}
                      {controls.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-medium" style={{ color: COLORS.navy }}>Levey-Jennings chart</div>
                            <select value={activeChartControlId || ""} onChange={e => setChartControlByParam(m => ({ ...m, [param.id]: e.target.value }))}
                              className="text-xs border rounded-md px-2 py-1" style={{ borderColor: "#D8E5E1" }}>
                              {controls.map(c => <option key={c.id} value={c.id}>{c.level} (Lot {c.lotNumber})</option>)}
                            </select>
                          </div>
                          {activeControl && chartRuns.length > 0 ? (
                            <LJChart runs={chartRuns} mean={activeControl.mean} sd={activeControl.sd} />
                          ) : <div className="text-xs text-gray-400 py-8 text-center border rounded-md" style={{ borderColor: "#EEF3F1" }}>No IQC results logged for this level yet.</div>}
                        </div>
                      )}

                      {/* Add result */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium" style={{ color: COLORS.navy }}>IQC results</div>
                        {controls.length > 0 && canEdit && (
                          <button onClick={() => setRunFormFor(runFormFor === param.id ? null : param.id)} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
                            <Plus size={12} /> Add IQC result
                          </button>
                        )}
                      </div>
                      {runFormFor === param.id && canEdit && <RunForm controls={controls} personnel={personnel} onCancel={() => setRunFormFor(null)} onSave={(controlId, draft) => addRun(controlId, draft)} />}

                      <div className="border rounded-md divide-y" style={{ borderColor: "#EEF3F1" }}>
                        {allParamRunsDesc.length === 0 && <div className="text-xs text-gray-400 px-3 py-3">No results logged yet.</div>}
                        {allParamRunsDesc.map(r => {
                          const ctrl = controls.find(c => c.id === r.controlId);
                          const hasReject = r.violations.some(v => REJECT_RULES.includes(v));
                          const hasWarn = r.violations.includes("1_2s");
                          return (
                            <div key={r.id} className="flex items-center gap-2 px-3 py-2 flex-wrap">
                              <span className="text-xs text-gray-400 w-24">{r.date}{r.time ? ` ${r.time}` : ""}</span>
                              <span className="text-xs w-28">{ctrl?.level}</span>
                              <span className="text-xs font-medium w-16">{r.value}</span>
                              <span className="text-xs text-gray-400 w-16">z={r.z.toFixed(2)}</span>
                              <span className="text-xs text-gray-400 w-24">{r.operator}</span>
                              <div className="flex gap-1 flex-wrap">
                                {r.violations.map(v => (
                                  <Badge key={v} color={REJECT_RULES.includes(v) ? COLORS.red : COLORS.amber}>{RULE_LABEL[v] || v}</Badge>
                                ))}
                                {r.violations.length === 0 && <Badge color={COLORS.teal}>In control</Badge>}
                              </div>
                              <div className="ml-auto flex items-center gap-2">
                                <AuthorizeControl run={r} currentUser={currentUser} canAuthorize={canAuthorizeIQC} onAuthorize={() => authorizeQcRunAction(r.id)} />
                                {canEdit && <button onClick={() => removeRun(r.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>}
                              </div>
                              {r.comment && <div className="w-full text-xs text-gray-400 pl-24">{r.comment}</div>}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-end mt-3">
                        {canEdit && <button onClick={() => removeParameter(param.id)} className="text-xs text-red-400 flex items-center gap-1"><Trash2 size={12} /> Remove parameter</button>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DailyIQCEntry({ parameters, controls, personnel, onSaveBatch, onClose }) {
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [operator, setOperator] = useState("");
  const [values, setValues] = useState({}); // controlId -> { value, comment }
  const [savedMsg, setSavedMsg] = useState("");

  const paramsWithControls = parameters
    .map(p => ({ param: p, controls: controls.filter(c => c.parameterId === p.id) }))
    .filter(x => x.controls.length > 0);

  const setVal = (controlId, patch) => setValues(v => ({ ...v, [controlId]: { ...v[controlId], ...patch } }));

  const filledCount = Object.values(values).filter(v => v?.value !== undefined && v.value !== "").length;

  const handleSave = () => {
    const entries = [];
    controls.forEach(c => {
      const v = values[c.id];
      if (v && v.value !== undefined && v.value !== "") {
        entries.push({ controlId: c.id, draft: { date, time, operator, value: parseFloat(v.value), comment: v.comment || "" } });
      }
    });
    if (entries.length === 0) return;
    onSaveBatch(entries);
    setSavedMsg(`Saved ${entries.length} result${entries.length !== 1 ? "s" : ""} for ${date}.`);
    setValues({});
  };

  return (
    <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: COLORS.teal, borderWidth: 1.5 }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold flex items-center gap-2" style={{ color: COLORS.navy }}>
          <Activity size={15} color={COLORS.teal} /> Daily IQC worksheet
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Field label="Date"><input type="date" className={inputCls} style={inputStyle} value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Time (optional)"><input type="time" className={inputCls} style={inputStyle} value={time} onChange={e => setTime(e.target.value)} /></Field>
        <Field label="Operator">
          <select className={inputCls} style={inputStyle} value={operator} onChange={e => setOperator(e.target.value)}>
            <option value="">Select…</option>{personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </Field>
      </div>

      {paramsWithControls.length === 0 ? (
        <Empty text="No parameters with control levels yet — set those up first, then daily entry will list them here." />
      ) : (
        <div className="border rounded-md overflow-hidden mb-3" style={{ borderColor: "#EEF3F1" }}>
          <div className="grid text-xs font-medium px-3 py-2" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 0.8fr 1.4fr", background: COLORS.mint, color: COLORS.navy }}>
            <div>Parameter</div><div>Level / Lot</div><div>Target (mean ± SD)</div><div>Value</div><div>Comment (optional)</div>
          </div>
          {paramsWithControls.map(({ param, controls: paramControls }) => (
            paramControls.map((c, i) => {
              const v = values[c.id]?.value ?? "";
              const z = v !== "" ? zScore(parseFloat(v), c.mean, c.sd) : null;
              return (
                <div key={c.id} className="grid items-center px-3 py-1.5 border-t text-xs" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 0.8fr 1.4fr", borderColor: "#EEF3F1" }}>
                  <div>{i === 0 ? <span className="font-medium">{param.name}</span> : ""}<span className="text-gray-400 ml-1">{i === 0 ? param.unit : ""}</span></div>
                  <div>{c.level} <span className="text-gray-400">(Lot {c.lotNumber})</span></div>
                  <div className="text-gray-500">{c.mean} ± {c.sd}</div>
                  <div>
                    <input type="number" step="any" value={v} onChange={e => setVal(c.id, { value: e.target.value })}
                      placeholder="—" className="w-full border rounded-md px-2 py-1 text-xs" style={{ borderColor: z !== null && Math.abs(z) > 2 ? COLORS.red : "#D8E5E1" }} />
                    {z !== null && <div className="text-[10px] mt-0.5" style={{ color: Math.abs(z) > 2 ? COLORS.red : COLORS.teal }}>z={z.toFixed(2)}</div>}
                  </div>
                  <input value={values[c.id]?.comment || ""} onChange={e => setVal(c.id, { comment: e.target.value })}
                    placeholder="" className="w-full border rounded-md px-2 py-1 text-xs" style={{ borderColor: "#D8E5E1" }} />
                </div>
              );
            })
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{savedMsg || (filledCount > 0 ? `${filledCount} value(s) entered` : "Enter values for as many rows as ran today")}</span>
        <div className="flex gap-2">
          <button onClick={onClose} className="text-sm px-3 py-1.5 text-gray-500">Close</button>
          <button onClick={handleSave} disabled={filledCount === 0}
            className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1 disabled:opacity-40" style={{ background: COLORS.teal }}>
            <Save size={14} /> Save all entered results
          </button>
        </div>
      </div>
    </div>
  );
}

function LJChart({ runs, mean, sd }) {
  const data = runs.map((r, i) => ({ idx: i + 1, date: r.date, value: r.value, violations: r.violations }));
  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    const hasReject = payload.violations?.some(v => REJECT_RULES.includes(v));
    const hasWarn = payload.violations?.includes("1_2s");
    const fill = hasReject ? COLORS.red : hasWarn ? COLORS.amber : COLORS.teal;
    return <circle cx={cx} cy={cy} r={4} fill={fill} stroke="#fff" strokeWidth={1} />;
  };
  return (
    <div className="border rounded-md p-2" style={{ borderColor: "#EEF3F1" }}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 10, right: 40, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F5F3" />
          <XAxis dataKey="idx" tick={{ fontSize: 10 }} label={{ value: "Run #", position: "insideBottom", offset: -3, fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
          <Tooltip labelFormatter={(l, p) => p?.[0]?.payload?.date ? `Run ${l} · ${p[0].payload.date}` : `Run ${l}`} />
          <ReferenceLine y={mean} stroke={COLORS.navy} strokeDasharray="4 2" label={{ value: "Mean", fontSize: 9, position: "right" }} />
          <ReferenceLine y={mean + sd} stroke={COLORS.teal} strokeDasharray="3 3" label={{ value: "+1SD", fontSize: 9, position: "right" }} />
          <ReferenceLine y={mean - sd} stroke={COLORS.teal} strokeDasharray="3 3" label={{ value: "-1SD", fontSize: 9, position: "right" }} />
          <ReferenceLine y={mean + 2 * sd} stroke={COLORS.amber} strokeDasharray="3 3" label={{ value: "+2SD", fontSize: 9, position: "right" }} />
          <ReferenceLine y={mean - 2 * sd} stroke={COLORS.amber} strokeDasharray="3 3" label={{ value: "-2SD", fontSize: 9, position: "right" }} />
          <ReferenceLine y={mean + 3 * sd} stroke={COLORS.red} strokeDasharray="2 2" label={{ value: "+3SD", fontSize: 9, position: "right" }} />
          <ReferenceLine y={mean - 3 * sd} stroke={COLORS.red} strokeDasharray="2 2" label={{ value: "-3SD", fontSize: 9, position: "right" }} />
          <Line type="monotone" dataKey="value" stroke={COLORS.navy} strokeWidth={1.25} dot={(p) => <CustomDot key={p.payload.idx} {...p} />} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MachineForm({ onSave, onCancel }) {
  const [name, setName] = useState("");
  const [discipline, setDiscipline] = useState(DISCIPLINES[0]);
  const [model, setModel] = useState("");
  return (
    <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Machine / analyser name"><input className={inputCls} style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Medonic M51" /></Field>
        <Field label="Discipline">
          <select className={inputCls} style={inputStyle} value={discipline} onChange={e => setDiscipline(e.target.value)}>
            {DISCIPLINES.map(d => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Model"><input className={inputCls} style={inputStyle} value={model} onChange={e => setModel(e.target.value)} /></Field>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 text-gray-500">Cancel</button>
        <button onClick={() => name.trim() && onSave({ name, discipline, model })} className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1" style={{ background: COLORS.teal }}><Save size={14} /> Add machine</button>
      </div>
    </div>
  );
}

function ParameterForm({ onSave, onCancel }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  return (
    <div className="bg-white rounded-lg border p-4 mb-4" style={{ borderColor: "#E1EBE8" }}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Parameter name"><input className={inputCls} style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. WBC, Glucose, TSH" /></Field>
        <Field label="Unit"><input className={inputCls} style={inputStyle} value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. 10⁹/L, mmol/L, mIU/L" /></Field>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 text-gray-500">Cancel</button>
        <button onClick={() => name.trim() && onSave({ name, unit })} className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1" style={{ background: COLORS.teal }}><Save size={14} /> Add parameter</button>
      </div>
    </div>
  );
}

function ControlForm({ onSave, onCancel }) {
  const [level, setLevel] = useState(CONTROL_LEVELS[0]);
  const [lotNumber, setLotNumber] = useState("");
  const [mean, setMean] = useState("");
  const [sd, setSd] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  return (
    <div className="mb-3 p-3 rounded-md" style={{ background: COLORS.mint }}>
      <div className="grid grid-cols-5 gap-2 mb-2">
        <select value={level} onChange={e => setLevel(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
          {CONTROL_LEVELS.map(l => <option key={l}>{l}</option>)}
        </select>
        <input value={lotNumber} onChange={e => setLotNumber(e.target.value)} placeholder="Lot number" className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }} />
        <input type="number" step="any" value={mean} onChange={e => setMean(e.target.value)} placeholder="Target mean" className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }} />
        <input type="number" step="any" value={sd} onChange={e => setSd(e.target.value)} placeholder="Target SD" className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }} />
        <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }} title="Lot expiry" />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs px-3 py-1 rounded-md text-gray-500">Cancel</button>
        <button onClick={() => lotNumber && mean !== "" && sd !== "" && onSave({ level, lotNumber, mean: parseFloat(mean), sd: parseFloat(sd), expiryDate })}
          className="text-xs px-3 py-1 rounded-md text-white" style={{ background: COLORS.teal }}>Save level</button>
      </div>
    </div>
  );
}

function RunForm({ controls, personnel, onSave, onCancel }) {
  const [controlId, setControlId] = useState(controls[0]?.id || "");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [value, setValue] = useState("");
  const [operator, setOperator] = useState("");
  const [comment, setComment] = useState("");
  const ctrl = controls.find(c => c.id === controlId);
  const previewZ = ctrl && value !== "" ? zScore(parseFloat(value), ctrl.mean, ctrl.sd) : null;

  return (
    <div className="mb-3 p-3 rounded-md" style={{ background: COLORS.mint }}>
      <div className="grid grid-cols-5 gap-2 mb-2">
        <select value={controlId} onChange={e => setControlId(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
          {controls.map(c => <option key={c.id} value={c.id}>{c.level} (Lot {c.lotNumber})</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }} />
        <input type="time" value={time} onChange={e => setTime(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }} />
        <input type="number" step="any" value={value} onChange={e => setValue(e.target.value)} placeholder="Value" className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }} />
        <select value={operator} onChange={e => setOperator(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
          <option value="">Operator…</option>{personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
      </div>
      {previewZ !== null && <div className="text-xs mb-2" style={{ color: Math.abs(previewZ) > 2 ? COLORS.red : COLORS.teal }}>z-score preview: {previewZ.toFixed(2)}</div>}
      <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Comment (optional)" className="w-full text-xs border rounded-md px-2 py-1.5 mb-2" style={{ borderColor: "#D8E5E1" }} />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs px-3 py-1 rounded-md text-gray-500">Cancel</button>
        <button onClick={() => controlId && value !== "" && onSave(controlId, { date, time, value: parseFloat(value), operator, comment })}
          className="text-xs px-3 py-1 rounded-md text-white" style={{ background: COLORS.teal }}>Save IQC result</button>
      </div>
    </div>
  );
}

// ---------------- EQAS (Clause 7.3.7.3 External Quality Assessment) ----------------
function EQAPage({ eqaEvents, updateEqaEvents, qcMachines, canEdit }) {
  const [showForm, setShowForm] = useState(false);
  const [filterDiscipline, setFilterDiscipline] = useState("All");

  const addEvent = (draft) => {
    const sdi = draft.peerMean !== "" && draft.peerSD && draft.peerSD !== "0"
      ? (parseFloat(draft.labResult) - parseFloat(draft.peerMean)) / parseFloat(draft.peerSD) : null;
    const evaluation = sdi === null ? "Not yet received" : Math.abs(sdi) <= 2 ? "Satisfactory" : Math.abs(sdi) <= 3 ? "Marginal" : "Unsatisfactory";
    updateEqaEvents([{ id: uid(), ...draft, sdi, evaluation }, ...eqaEvents]);
    setShowForm(false);
  };
  const setEvent = (id, patch) => updateEqaEvents(eqaEvents.map(e => e.id === id ? { ...e, ...patch } : e));
  const removeEvent = (id) => updateEqaEvents(eqaEvents.filter(e => e.id !== id));

  const filtered = eqaEvents.filter(e => filterDiscipline === "All" || e.discipline === filterDiscipline)
    .sort((a, b) => (b.dateReceived || "").localeCompare(a.dateReceived || ""));

  const evalColor = (ev) => ev === "Satisfactory" ? COLORS.teal : ev === "Marginal" ? COLORS.amber : ev === "Unsatisfactory" ? COLORS.red : "#9AA5A3";

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold" style={{ color: COLORS.navy }}>External Quality Assessment (EQAS)</h1>
        {canEdit && (
          <button onClick={() => setShowForm(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md text-white" style={{ background: COLORS.teal }}>
            <Plus size={14} /> Log EQA result
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">Proficiency testing / interlaboratory comparison across Hematology, Biochemistry, and Immunochemistry, with automatic SDI evaluation.</p>

      <div className="flex gap-2 mb-4">
        <select value={filterDiscipline} onChange={e => setFilterDiscipline(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
          <option>All</option>{DISCIPLINES.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {showForm && canEdit && <EQAForm qcMachines={qcMachines} onCancel={() => setShowForm(false)} onSave={addEvent} />}

      <div className="bg-white rounded-lg border divide-y" style={{ borderColor: "#E1EBE8" }}>
        {filtered.length === 0 && <Empty text="No EQA results logged yet." />}
        {filtered.map(e => (
          <div key={e.id} className="px-5 py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge color={DISCIPLINE_COLOR[e.discipline]}>{e.discipline}</Badge>
              <span className="text-sm font-medium">{e.parameter}</span>
              <span className="text-xs text-gray-400">{e.provider}{e.cycle ? ` · ${e.cycle}` : ""}</span>
              <span className="text-xs text-gray-400 ml-auto">{e.dateReceived}</span>
              <select value={e.evaluation} onChange={ev => setEvent(e.id, { evaluation: ev.target.value })} className="text-xs border rounded-md px-2 py-1" style={{ borderColor: "#D8E5E1", color: evalColor(e.evaluation) }}>
                {EQA_EVALUATION.map(opt => <option key={opt}>{opt}</option>)}
              </select>
              <button onClick={() => removeEvent(e.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Lab result: {e.labResult} {e.peerMean !== "" && e.peerMean !== undefined ? `· Peer mean ${e.peerMean} · Peer SD ${e.peerSD}` : ""}
              {e.sdi !== null && e.sdi !== undefined ? ` · SDI ${Number(e.sdi).toFixed(2)}` : ""}
            </div>
            {e.notes && <div className="text-xs text-gray-400 mt-1">{e.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function EQAForm({ qcMachines, onSave, onCancel }) {
  const [discipline, setDiscipline] = useState(DISCIPLINES[0]);
  const [machineId, setMachineId] = useState("");
  const [parameter, setParameter] = useState("");
  const [provider, setProvider] = useState("");
  const [cycle, setCycle] = useState("");
  const [dateReceived, setDateReceived] = useState(todayISO());
  const [labResult, setLabResult] = useState("");
  const [peerMean, setPeerMean] = useState("");
  const [peerSD, setPeerSD] = useState("");
  const [notes, setNotes] = useState("");

  const machinesForDiscipline = qcMachines.filter(m => m.discipline === discipline);

  return (
    <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Discipline">
          <select className={inputCls} style={inputStyle} value={discipline} onChange={e => { setDiscipline(e.target.value); setMachineId(""); }}>
            {DISCIPLINES.map(d => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Machine (optional)">
          <select className={inputCls} style={inputStyle} value={machineId} onChange={e => setMachineId(e.target.value)}>
            <option value="">Not machine-specific</option>{machinesForDiscipline.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="Parameter"><input className={inputCls} style={inputStyle} value={parameter} onChange={e => setParameter(e.target.value)} placeholder="e.g. Hemoglobin, Glucose, TSH" /></Field>
        <Field label="Provider / scheme"><input className={inputCls} style={inputStyle} value={provider} onChange={e => setProvider(e.target.value)} placeholder="e.g. RIQAS, UK NEQAS, CAP" /></Field>
        <Field label="Cycle / round"><input className={inputCls} style={inputStyle} value={cycle} onChange={e => setCycle(e.target.value)} placeholder="e.g. 2026 Round 4" /></Field>
        <Field label="Date result received"><input type="date" className={inputCls} style={inputStyle} value={dateReceived} onChange={e => setDateReceived(e.target.value)} /></Field>
        <Field label="Lab result"><input type="number" step="any" className={inputCls} style={inputStyle} value={labResult} onChange={e => setLabResult(e.target.value)} /></Field>
        <Field label="Peer group mean"><input type="number" step="any" className={inputCls} style={inputStyle} value={peerMean} onChange={e => setPeerMean(e.target.value)} /></Field>
        <Field label="Peer group SD"><input type="number" step="any" className={inputCls} style={inputStyle} value={peerSD} onChange={e => setPeerSD(e.target.value)} /></Field>
      </div>
      <Field label="Notes"><textarea className={inputCls} style={inputStyle} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Corrective action reference, comments…" /></Field>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 text-gray-500">Cancel</button>
        <button onClick={() => parameter.trim() && labResult !== "" && onSave({ discipline, machineId, parameter, provider, cycle, dateReceived, labResult, peerMean, peerSD, notes })}
          className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1" style={{ background: COLORS.teal }}><Save size={14} /> Save EQA result</button>
      </div>
    </div>
  );
}

// ---------------- Sign in (username = record card number, password, auto-detected role) ----------------
function SignInScreen({ onSignIn }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [newCardNumber, setNewCardNumber] = useState("");
  const [newName, setNewName] = useState("");
  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const handleLogin = async () => {
    if (!username.trim()) { setError("Enter your record card number."); return; }
    if (!password) { setError("Enter your password."); return; }
    setBusy(true); setError("");
    try {
      const { personnel } = await authApi.signIn(username, password);
      onSignIn({ id: personnel.id, name: personnel.name, role: personnel.access_role || "Technologist" });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateAndSignIn = async () => {
    if (!newCardNumber.trim()) { setError("Enter your record card number."); return; }
    if (!newName.trim()) { setError("Enter your name."); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters (Supabase Auth's minimum)."); return; }
    if (newPassword !== newPasswordConfirm) { setError("Passwords don't match."); return; }
    setBusy(true); setError("");
    try {
      const person = await authApi.signUpNew({ recordCardNumber: newCardNumber, name: newName, jobTitle: newRoleTitle, password: newPassword });
      onSignIn({ id: person.id, name: person.name, role: "Technologist" });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
      <div className="w-full max-w-sm bg-white rounded-xl border p-6" style={{ borderColor: "#E1EBE8" }}>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={22} color={COLORS.teal} />
          <div className="font-semibold text-lg" style={{ color: COLORS.navy }}>Lab QMS</div>
        </div>
        <div className="text-xs text-gray-400 mb-5">Sign in with your record card number to continue. Your access role is detected automatically from your account, and every change you make is attributed to you in the audit log.</div>

        <div className="flex gap-2 mb-4 text-xs">
          <button onClick={() => { setMode("login"); setError(""); }} className="px-3 py-1.5 rounded-md border flex-1"
            style={{ borderColor: mode === "login" ? COLORS.teal : "#D8E5E1", color: mode === "login" ? COLORS.teal : "#9AA5A3", background: mode === "login" ? COLORS.mint : "white" }}>Log in</button>
          <button onClick={() => { setMode("new"); setError(""); }} className="px-3 py-1.5 rounded-md border flex-1"
            style={{ borderColor: mode === "new" ? COLORS.teal : "#D8E5E1", color: mode === "new" ? COLORS.teal : "#9AA5A3", background: mode === "new" ? COLORS.mint : "white" }}>I'm new here</button>
        </div>

        {mode === "login" ? (
          <>
            <Field label="Username (Record Card Number)">
              <input className={inputCls} style={inputStyle} value={username} onChange={e => { setUsername(e.target.value); setError(""); }} placeholder="e.g. RC-0142" autoCapitalize="none" />
            </Field>
            <Field label="Password">
              <input type="password" className={inputCls} style={inputStyle} value={password} onChange={e => { setPassword(e.target.value); setError(""); }} placeholder="Password" />
            </Field>
            {error && <div className="text-xs mb-2" style={{ color: COLORS.red }}>{error}</div>}
            <button onClick={handleLogin} className="w-full text-sm px-4 py-2 rounded-md text-white font-medium" style={{ background: COLORS.teal }}>Log in</button>
          </>
        ) : (
          <>
            <Field label="Record card number (this becomes your username)"><input className={inputCls} style={inputStyle} value={newCardNumber} onChange={e => setNewCardNumber(e.target.value)} placeholder="e.g. RC-0142" /></Field>
            <Field label="Full name"><input className={inputCls} style={inputStyle} value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Aishath Shifa" /></Field>
            <Field label="Job title (optional)"><input className={inputCls} style={inputStyle} value={newRoleTitle} onChange={e => setNewRoleTitle(e.target.value)} placeholder="e.g. Lab Technologist" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Password"><input type="password" className={inputCls} style={inputStyle} value={newPassword} onChange={e => setNewPassword(e.target.value)} /></Field>
              <Field label="Confirm password"><input type="password" className={inputCls} style={inputStyle} value={newPasswordConfirm} onChange={e => setNewPasswordConfirm(e.target.value)} /></Field>
            </div>
            <div className="text-[11px] text-gray-400 mb-3">New accounts start as <strong>Technologist</strong>. An Admin can raise your access role from the Personnel page afterward.</div>
            {error && <div className="text-xs mb-2" style={{ color: COLORS.red }}>{error}</div>}
            <button onClick={handleCreateAndSignIn} className="w-full text-sm px-4 py-2 rounded-md text-white font-medium" style={{ background: COLORS.teal }}>Create account & continue</button>
          </>
        )}

        <div className="text-[11px] text-gray-400 mt-4 leading-relaxed">
          This login is a convenience check built into the app itself, not a secured authentication service — credentials are stored in plain text in this browser's local storage. For a hard security boundary, host this behind a real authentication system.
        </div>
      </div>
    </div>
  );
}

// ---------------- Documents (linked SOPs, certificates, calibration reports) ----------------
function Documents({ documents, updateDocuments, currentUser, canEdit }) {
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState("All");

  const addDoc = (draft) => {
    updateDocuments([{ id: uid(), uploadedBy: currentUser.name, uploadedAt: todayISO(), ...draft }, ...documents]);
    setShowForm(false);
  };
  const removeDoc = (id) => updateDocuments(documents.filter(d => d.id !== id));

  const filtered = documents.filter(d => filterCategory === "All" || d.category === filterCategory);

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold" style={{ color: COLORS.navy }}>Documents</h1>
        {canEdit && (
          <button onClick={() => setShowForm(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md text-white" style={{ background: COLORS.teal }}>
            <Plus size={14} /> Link a document
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-1">SOPs, certificates, calibration reports, and other quality records, linked from wherever they're stored (Drive, SharePoint, etc.).</p>
      <p className="text-xs text-gray-400 mb-4">This app stores links and metadata, not the files themselves — keep the source files in your document management system or cloud drive and paste the link here.</p>

      <div className="flex gap-2 mb-4">
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
          <option>All</option>{DOCUMENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {showForm && canEdit && <DocumentForm onCancel={() => setShowForm(false)} onSave={addDoc} />}

      <div className="bg-white rounded-lg border divide-y" style={{ borderColor: "#E1EBE8" }}>
        {filtered.length === 0 && <Empty text="No documents linked yet." />}
        {filtered.map(d => (
          <div key={d.id} className="flex items-center gap-3 px-5 py-3">
            <Paperclip size={15} color={COLORS.teal} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <a href={d.url} target="_blank" rel="noreferrer" className="text-sm font-medium truncate block" style={{ color: COLORS.navy }}>{d.title}</a>
              <div className="text-xs text-gray-400 truncate">{d.relatedTo}{d.relatedTo ? " · " : ""}Uploaded by {d.uploadedBy} · {d.uploadedAt}</div>
            </div>
            <Badge color={COLORS.teal}>{d.category}</Badge>
            {canEdit && <button onClick={() => removeDoc(d.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentForm({ onSave, onCancel }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [relatedTo, setRelatedTo] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Title"><input className={inputCls} style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. SOP-HEM-014 Manual Differential Counting v3" /></Field>
        <Field label="Category">
          <select className={inputCls} style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
            {DOCUMENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Related to (optional)"><input className={inputCls} style={inputStyle} value={relatedTo} onChange={e => setRelatedTo(e.target.value)} placeholder="e.g. Medonic M51, Clause 6.4, NC-003" /></Field>
        <Field label="Link (Drive / SharePoint / etc.)"><input className={inputCls} style={inputStyle} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" /></Field>
      </div>
      <Field label="Notes"><textarea className={inputCls} style={inputStyle} rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 text-gray-500">Cancel</button>
        <button onClick={() => title.trim() && url.trim() && onSave({ title, category, relatedTo, url, notes })}
          className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1" style={{ background: COLORS.teal }}><Save size={14} /> Save link</button>
      </div>
    </div>
  );
}

// ---------------- Audit log & backup export ----------------
function AuditBackup() {
  const [auditLog, setAuditLog] = useState([]);
  const [loadingLog, setLoadingLog] = useState(true);
  const [filterEntity, setFilterEntity] = useState("All");
  const [filterActor, setFilterActor] = useState("All");
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setAuditLog(await auditApi.listAuditLog());
      } catch (e) {
        console.error("Could not load audit log:", e);
      } finally {
        setLoadingLog(false);
      }
    })();
  }, []);

  const entities = ["All", ...Array.from(new Set(auditLog.map(a => a.entity)))];
  const actors = ["All", ...Array.from(new Set(auditLog.map(a => a.actor_name)))];
  const filtered = auditLog.filter(a => (filterEntity === "All" || a.entity === filterEntity) && (filterActor === "All" || a.actor_name === filterActor));

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      await auditApi.downloadFullBackup();
    } catch (e) {
      alert("Backup failed: " + e.message);
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: COLORS.navy }}>Audit log & backup</h1>
      <p className="text-sm text-gray-500 mb-6">Every create, update, and delete across the system, written automatically by a database trigger and attributed to whoever was signed in — plus a full data export.</p>

      <div className="bg-white rounded-lg border p-5 mb-6" style={{ borderColor: "#E1EBE8" }}>
        <div className="flex items-center gap-3 mb-2">
          <DatabaseBackup size={18} color={COLORS.teal} />
          <div className="text-sm font-medium" style={{ color: COLORS.navy }}>System backup</div>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Downloads every module — personnel, clauses, tasks, NC/CAPA, competency, equipment, IQC, EQA, documents, and this audit log — as one Excel workbook, read live from the database.
          Supabase also takes its own automatic daily backups on paid plans; this button is for an independent copy you keep outside the app.
        </p>
        <button onClick={handleBackup} disabled={backingUp} className="text-sm flex items-center gap-1.5 px-4 py-2 rounded-md text-white disabled:opacity-50" style={{ background: COLORS.teal }}>
          <Download size={14} /> {backingUp ? "Preparing…" : "Download full backup (.xlsx)"}
        </button>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium" style={{ color: COLORS.navy }}>Audit log</div>
        <div className="flex gap-2">
          <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
            {entities.map(e => <option key={e}>{e}</option>)}
          </select>
          <select value={filterActor} onChange={e => setFilterActor(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
            {actors.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>
      <div className="bg-white rounded-lg border divide-y max-h-[520px] overflow-auto" style={{ borderColor: "#E1EBE8" }}>
        {loadingLog && <div className="text-sm text-gray-400 py-4 text-center">Loading…</div>}
        {!loadingLog && filtered.length === 0 && <Empty text="No matching activity yet." />}
        {filtered.map(a => (
          <div key={a.id} className="flex items-center gap-3 px-4 py-2 text-xs">
            <span className="text-gray-400 w-36 shrink-0">{new Date(a.ts).toLocaleString()}</span>
            <Badge color={COLORS.navy}>{a.entity}</Badge>
            <span className="flex-1">{a.action} {a.summary || ""}</span>
            <span className="text-gray-500">{a.actor_name}{a.actor_role ? ` (${a.actor_role})` : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
