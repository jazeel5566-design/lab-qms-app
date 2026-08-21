import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard, ClipboardList, AlertTriangle, Users, CheckCircle2,
  Circle, Clock, Plus, X, ChevronDown, ChevronRight, Trash2, Pencil,
  ShieldCheck, ListChecks, Search, Save, GraduationCap, Wrench, Paperclip,
  Activity, BarChart3, UserCheck, ShieldAlert, FlaskConical, Download, Upload,
  History, LogOut, FolderOpen, Link as LinkIcon, KeyRound, DatabaseBackup, BookOpen
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
import * as riskApi from "./api/risks.js";
import * as mgmtReviewApi from "./api/managementReviews.js";
import * as storageApi from "./api/storage.js";
import * as ackApi from "./api/documentAcknowledgments.js";
import * as downtimeApi from "./api/equipmentDowntime.js";
import * as clauseEvidenceApi from "./api/clauseEvidence.js";
import * as taskCommentsApi from "./api/taskComments.js";
import * as taskTemplatesApi from "./api/taskTemplates.js";
import * as notificationsApi from "./api/notifications.js";
import * as machineKeysApi from "./api/machineKeys.js";
import * as notificationSettingsApi from "./api/notificationSettings.js";
import * as labsApi from "./api/laboratories.js";
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
  riskFromDb, riskToDb, managementReviewFromDb, managementReviewToDb,
  acknowledgmentFromDb, downtimeFromDb, clauseEvidenceFromDb, taskCommentFromDb, taskTemplateFromDb,
  laboratoryFromDb, personnelLabFromDb,
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

/**
 * Plain-language, practical summaries of what each clause is about — written
 * as a quick-reference aid for lab staff, NOT a substitute for the official
 * ISO 15189:2022 standard text. Always framed and disclaimed as such in the
 * UI (see the guidance panel in ClauseRegister below).
 */
const CLAUSE_GUIDANCE = {
  "4.1": "Lab decisions and results must never be swayed by financial, administrative, or personal pressure. Watch for conflicts of interest — anything that could compromise objectivity needs to be identified and managed.",
  "4.2": "Patient and client information stays private. Results and personal data are only shared with people authorized to receive them, never released to unauthorized parties.",
  "4.3": "Patient needs come first: informed consent for procedures, respectful handling of samples, and reasonable access to results and services regardless of where testing actually happens.",
  "5.1": "The lab (or the organization it's part of) has to be a recognized legal entity that can be held legally responsible for what it does.",
  "5.2": "There's a named director with real, defined authority over the lab's operations — competent in the field, and accountable for quality and service.",
  "5.3": "The lab clearly defines what testing it performs and where, including any satellite or point-of-care sites, and keeps activities consistent with that stated scope.",
  "5.4": "Roles, responsibilities, and reporting lines are clearly defined, including who can deputize for key roles (like the director or QA Manager) when they're away.",
  "5.5": "Documented quality objectives and policies exist and are actually used to guide decisions day to day — not just written once and filed away.",
  "5.6": "Risks to patients, staff, and result quality are identified and managed proactively, rather than only being addressed after something's already gone wrong.",
  "5.7": "A documented, functioning quality management system covers all the lab's processes, and — critically — is actually followed in daily practice, not just built to pass an audit.",
  "6.1": "Staff are competent for their roles: documented qualifications, training, ongoing competency assessment, clear job descriptions, and authorization for specific tasks.",
  "6.2": "The physical space and environment — temperature, humidity, biosafety, etc. — suit the tests being performed, and are monitored so conditions that could affect results get caught.",
  "6.3": "Equipment is validated, fit for purpose, properly maintained, and its use is restricted to trained, authorized staff.",
  "6.4": "Measurements trace back to recognized reference standards, with equipment calibrated on a defined schedule so results stay trustworthy and comparable over time.",
  "6.5": "Reagents and consumables are verified before use, stored correctly, and tracked by lot number and expiry — so a problem with a batch can actually be traced and addressed.",
  "6.6": "Formal agreements exist with providers of critical services (maintenance, calibration, IT support), spelling out what's expected and how their performance is monitored.",
  "6.7": "Suppliers of anything affecting result quality are evaluated and approved, with a defined process for handling it when something they provide falls short.",
  "7.1": "Examination processes are built on documented, validated procedures, applied consistently across every relevant site.",
  "7.2": "Everything before testing — patient prep, sample collection, labeling, transport, acceptance criteria — is controlled, so a sample is reliable before testing even starts.",
  "7.3": "Test methods themselves are validated or verified as fit for purpose, performed correctly, and consistent with the lab's scope and actual clinical needs.",
  "7.4": "Results get reviewed before release, reported correctly (including critical/panic values), and samples are handled properly afterward — storage, retention, disposal.",
  "7.5": "When something doesn't meet requirements — a failed QC, a mislabeled sample, a wrongly reported result — there's a defined process to catch it, contain the impact, and decide what happens next.",
  "7.6": "Patient data, results, and lab records stay accurate, secure, and appropriately accessible — protected against loss, unauthorized access, or tampering.",
  "7.7": "A clear, fair process exists for receiving, investigating, and responding to complaints from patients, clinicians, or anyone else.",
  "7.8": "There's a real plan for keeping critical services running — or recovering quickly — through equipment failure, power outages, staff shortages, or other disruptions.",
  "8.1": "The management system meets both ISO 15189's requirements and the lab's own organizational needs, covering every process it's supposed to.",
  "8.2": "Policies and processes are documented in a way staff can actually find and use — not scattered across random files or effectively inaccessible.",
  "8.3": "Documents have real version control: it's always clear which version is current and who approved it, and old versions can't accidentally get used.",
  "8.4": "Records — results, QC data, training history, and more — are kept for a defined period, protected from loss or tampering, and retrievable when needed.",
  "8.5": "Beyond just managing risk, the lab actively looks for ways to improve — not only reacting once something's already broken.",
  "8.6": "There's an ongoing, structured effort to improve the QMS based on real data — audit findings, complaints, NC trends, staff feedback — not just one-off fixes.",
  "8.7": "When something goes wrong, the lab investigates the actual root cause (not just the symptom), fixes it, and verifies the fix genuinely worked rather than just moving the problem elsewhere.",
  "8.8": "The lab regularly evaluates itself — internal audits, EQA/PT performance, user feedback, staff competency — to catch problems before they grow bigger.",
  "8.9": "Leadership periodically steps back and reviews the whole QMS's performance, rather than leaving quality entirely to one person, and uses that review to actually set direction and allocate resources.",
};

// ---------- palette (Teal Trust) ----------
const COLORS = {
  navy: "#0F2A3D", teal: "#14746F", seafoam: "#7FBFA0", mint: "#E6F5EC",
  bg: "#F6FAF9", amber: "#C98A2C", red: "#B4453F", ink: "#12262B",
};

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysFromNowISO = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };

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
const NOTIFICATION_EVENT_LABELS = [
  { key: "task_assigned", label: "A task is assigned to someone" },
  { key: "task_overdue", label: "A task becomes overdue (checked daily)" },
  { key: "nc_assigned", label: "An NC is assigned to someone" },
  { key: "document_published", label: "A controlled document is published" },
  { key: "eqa_cycle_due", label: "An EQA cycle is coming due (checked daily)" },
];
const DOCUMENT_PUBLISHER_ROLES = ["Admin", "QA Manager", "Deputy QA Manager"];
const CONTROLLED_DOCUMENT_CATEGORIES = ["SOP", "QSP", "Policy", "Manual"];
const PERSONAL_DOCUMENT_CATEGORIES = ["Professional licence / registration", "Certification", "Other personal document"];
const GENERAL_DOCUMENT_CATEGORIES = ["Calibration certificate", "Service report", "EQA certificate", "Training material", "Other"];
const DOCUMENT_CATEGORIES = [...CONTROLLED_DOCUMENT_CATEGORIES, ...PERSONAL_DOCUMENT_CATEGORIES, ...GENERAL_DOCUMENT_CATEGORIES];

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
const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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
  const [authChecked, setAuthChecked] = useState(false);
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
  const [risks, setRisks] = useState([]);
  const [managementReviews, setManagementReviews] = useState([]);
  const [documentAcknowledgments, setDocumentAcknowledgments] = useState([]);
  const [equipmentDowntime, setEquipmentDowntime] = useState([]);
  const [clauseEvidence, setClauseEvidence] = useState([]);
  const [taskComments, setTaskComments] = useState([]);
  const [taskTemplates, setTaskTemplates] = useState([]);
  const [notificationSettings, setNotificationSettings] = useState({});
  const [laboratories, setLaboratories] = useState([]);
  const [personnelLaboratories, setPersonnelLaboratories] = useState([]);
  const [activeLaboratoryId, setActiveLaboratoryId] = useState(null);
  const [labChoicesPending, setLabChoicesPending] = useState(null); // null = not yet determined; array = show the picker with these options

  // Runs exactly once, on first load: is there already a signed-in session
  // (e.g. a returning visitor)? Deliberately does NOT fetch any app data here —
  // that happens in the next effect, keyed on currentUser, so it re-runs after
  // a fresh sign-in too, not just on page load.
  useEffect(() => {
    (async () => {
      try {
        const existingUser = await authApi.restoreSession();
        if (existingUser) {
          setCurrentUser({ id: existingUser.id, name: existingUser.name, role: existingUser.access_role || "Technologist" });
        }
      } catch (err) {
        console.error("Session check failed:", err);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  // Runs whenever someone actually becomes signed in — on page load if a
  // session already existed, AND immediately after a fresh login, since
  // currentUser?.id changes in both cases. This is what fixes needing a
  // manual reload after signing in.
  /**
   * Loads everything that depends on knowing which laboratory is active.
   * Split out from the effect below so it can be called either immediately
   * (the common case — exactly one laboratory, nothing to ask the user)
   * or later, once they've picked one from the login-time selector.
   */
  const loadLabScopedData = async (labId, p) => {
    const [csRows, tRows, nRows, compRows, eqRows, eqrRows, qmRows, qpRows, qcRows, qrRows, eqaRows, docRows, riskRows, mrRows, ackRows, dtRows, ceRows, tcRows, ttRows, nsRows] = await Promise.all([
      clauseApi.listClauseStatus(labId),
      taskApi.listTasks(labId),
      ncApi.listNonconformities(labId),
      opsApi.listCompetency(labId),
      opsApi.listEquipment(labId),
      opsApi.listEquipmentRecords(undefined, labId),
      qcApi.listMachines(labId),
      qcApi.listParameters(undefined, labId),
      qcApi.listControls(undefined, labId),
      qcApi.listRuns(undefined, labId),
      eqaDocApi.listEqaEvents(labId),
      eqaDocApi.listDocuments(labId),
      riskApi.listRisks(labId),
      mgmtReviewApi.listManagementReviews(labId),
      ackApi.listAllAcknowledgments(labId),
      downtimeApi.listEquipmentDowntime(labId),
      clauseEvidenceApi.listClauseEvidence(labId),
      taskCommentsApi.listTaskComments(labId),
      taskTemplatesApi.listTaskTemplates(labId),
      notificationSettingsApi.listNotificationSettings(),
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
    setRisks(riskRows.map(r => riskFromDb(r, p)));
    setManagementReviews(mrRows.map(r => managementReviewFromDb(r, p)));
    setDocumentAcknowledgments(ackRows.map(r => acknowledgmentFromDb(r, p)));
    setEquipmentDowntime(dtRows.map(r => downtimeFromDb(r, p)));
    setClauseEvidence(ceRows.map(r => clauseEvidenceFromDb(r, p)));
    setTaskComments(tcRows.map(r => taskCommentFromDb(r, p)));
    setTaskTemplates(ttRows.map(r => taskTemplateFromDb(r, p)));
    setNotificationSettings(Object.fromEntries(nsRows.map(r => [r.event_key, r.enabled])));
  };

  /** Called once the user has picked a laboratory from the login-time selector (only shown when they have more than one). */
  const selectLaboratoryAction = async (labId) => {
    setActiveLaboratoryId(labId);
    setLabChoicesPending(null);
    setLoading(true);
    try {
      await loadLabScopedData(labId, personnel);
    } catch (err) {
      console.error("Failed to load data from Supabase:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    (async () => {
      try {
        const pRows = await personnelApi.listPersonnel();
        const p = pRows.map(personnelFromDb);
        setPersonnel(p);

        const [labRows, plRows] = await Promise.all([labsApi.listLaboratories(), labsApi.listPersonnelLaboratories()]);
        const labs = labRows.map(laboratoryFromDb);
        const pls = plRows.map(personnelLabFromDb);
        setLaboratories(labs);
        setPersonnelLaboratories(pls);

        const myPersonnel = p.find(person => person.id === currentUser.id || person.name === currentUser.name);
        // A user's accessible labs = their PRIMARY lab (personnel.laboratory_id) plus any
        // EXTRA labs assigned via personnel_laboratories (e.g. a QA Manager covering more
        // than one department). Checking personnel_laboratories alone was missing every
        // user's primary lab, since a primary assignment isn't duplicated into that table.
        const accessibleLabs = currentUser.role === "Admin"
          ? labs
          : labs.filter(lab =>
              lab.id === myPersonnel?.laboratoryId ||
              pls.some(pl => pl.laboratoryId === lab.id && pl.personnelId === myPersonnel?.id)
            );

        if (accessibleLabs.length === 1) {
          setActiveLaboratoryId(accessibleLabs[0].id);
          await loadLabScopedData(accessibleLabs[0].id, p);
        } else {
          // Either no laboratory assigned yet, or more than one — either way,
          // pause here and let the picker (or an explanatory message, if
          // the list is empty) decide what happens next, rather than
          // guessing which laboratory's data to show.
          setLabChoicesPending(accessibleLabs);
        }
      } catch (err) {
        console.error("Failed to load data from Supabase:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser?.id]);

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
        return synced;
      } catch (e) {
        console.error(e);
        alert("Save failed — reverting this change.\n\n" + e.message);
        setStateFn(prev);
        return null;
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
        upsert: (clauseId, val) => clauseApi.upsertClauseStatus(clauseId, activeLaboratoryId, {
          status: val.status, owner_id: nameToId(personnel, val.owner), last_reviewed: val.lastReviewed || null, notes: val.notes || null,
          evidence_document_id: val.evidenceDocumentId || null,
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
    setTasks(tasks.map(t => (t.id === id
      ? { ...t, status, ...(status !== "Done" ? { completionApproved: false, approvedBy: "", approvedAt: "" } : {}) }
      : t)));
    try {
      await taskApi.setTaskStatus(id, status);
    } catch (e) {
      alert("Could not update task status.\n\n" + e.message);
      setTasks(prev);
    }
  };

  /**
   * Marking a task "Done" no longer finishes it outright — this is the
   * actual sign-off step, restricted server-side to Admin/QA Manager/deputy
   * (0014 migration). Only once approved does a recurring task's next
   * occurrence get created, so a rejected completion never leaves an
   * already-spawned follow-up task behind.
   */
  const approveTaskCompletionAction = async (id) => {
    try {
      const row = await taskApi.approveTaskCompletion(id);
      const approvedTask = taskFromDb(row, personnel);
      setTasks(current => current.map(t => t.id === id ? approvedTask : t));
      if (approvedTask.isRecurring) {
        const newRow = await taskApi.createNextRecurrence(id);
        if (newRow) setTasks(current => [taskFromDb(newRow, personnel), ...current]);
      }
    } catch (e) {
      alert("Could not approve this task.\n\n" + e.message);
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

  /** CSV bulk import — inserts many IQC results (any mix of parameters/machines) in one call. */
  const bulkImportQcRuns = async (dbRows) => {
    const inserted = await qcApi.logRunsBulk(dbRows);
    const mapped = inserted.map(r => runFromDb(r, personnel));
    setQcRuns(prev => [...mapped, ...prev]);
    return mapped.length;
  };

  const updateEqaEvents = makeListUpdater(setEqaEvents, () => eqaEvents, eqaToDb, eqaFromDb, {
    create: (row) => eqaDocApi.createEqaEvent(row),
    update: (id, row) => eqaDocApi.updateEqaEvent(id, row),
    remove: (id) => eqaDocApi.deleteEqaEvent(id),
  });

  /** One click to raise an NC directly from an Unsatisfactory EQA result, pre-filled — and records the link back on the EQA row so it's never accidentally raised twice. */
  /**
   * One click to raise an NC directly from an Unsatisfactory EQA result,
   * pre-filled — and records the link back on the EQA row so it's never
   * accidentally raised twice.
   *
   * IMPORTANT: the NC object built below has a client-side temporary id
   * (from uid()) purely so the UI can show it immediately — the database
   * assigns its own real id on insert, which is DIFFERENT. Linking the EQA
   * row must use that real id, not the temporary one, or the foreign key
   * will always fail. ncNumber is unique and unchanged by the insert, so
   * it's used here to find the real row afterward.
   */
  const createNcFromEqaAction = async (eqaEvent) => {
    const ncNumber = `NC-${String(ncs.length + 1).padStart(3, "0")}`;
    const sdiText = (eqaEvent.sdi !== null && eqaEvent.sdi !== undefined) ? Number(eqaEvent.sdi).toFixed(2) : "n/a";
    const newNc = {
      id: uid(), ncNumber, status: "Open", dateRaised: todayISO(),
      title: `EQA/PT failure — ${eqaEvent.parameter} (${eqaEvent.discipline})`,
      description: `Unsatisfactory EQA result for ${eqaEvent.parameter}, ${eqaEvent.provider || "provider not specified"}${eqaEvent.cycle ? " " + eqaEvent.cycle : ""}. Lab result ${eqaEvent.labResult}, peer mean ${eqaEvent.peerMean}, SDI ${sdiText}.`,
      source: "EQA/PT failure", severity: "Major",
      rootCause: "", correctiveAction: "", preventiveAction: "", evidence: "", verifiedBy: "", closedDate: "",
      effectivenessCheckDue: "", effectivenessCheckResult: "", effectivenessNotes: "", effectivenessVerifiedBy: "",
      laboratoryId: activeLaboratoryId,
    };
    const syncedNcs = await updateNcs([newNc, ...ncs]);
    if (!syncedNcs) return; // NC creation itself failed — already alerted by updateNcs, nothing further to link.
    const createdNc = syncedNcs.find(n => n.ncNumber === ncNumber);
    if (!createdNc) { alert("The NC was created but couldn't be re-found to link it to this EQA result — please link it manually from the NC/CAPA page."); return; }
    await updateEqaEvents(eqaEvents.map(e => e.id === eqaEvent.id ? { ...e, linkedNcId: createdNc.id } : e));
  };

  const updateDocuments = makeListUpdater(setDocuments, () => documents, (d) => documentToDb(d, personnel), (r) => documentFromDb(r, personnel), {
    create: (row) => eqaDocApi.createDocument(row),
    update: () => { throw new Error("Documents are not editable after creation in this build — delete and re-add if needed."); },
    remove: (id) => eqaDocApi.deleteDocument(id),
  });

  const updateRisks = makeListUpdater(setRisks, () => risks, (r) => riskToDb(r, personnel), (r) => riskFromDb(r, personnel), {
    create: (row) => riskApi.createRisk(row),
    update: (id, row) => riskApi.updateRisk(id, row),
    remove: (id) => riskApi.deleteRisk(id),
  });

  /** Management reviews are create/delete only — a review record is a dated snapshot, not something edited after the fact. */
  const addManagementReview = async (draft) => {
    const dbRow = managementReviewToDb({ ...draft, conductedBy: currentUser.name, laboratoryId: activeLaboratoryId }, personnel);
    const inserted = await mgmtReviewApi.createManagementReview(dbRow);
    const mapped = managementReviewFromDb(inserted, personnel);
    setManagementReviews(prev => [mapped, ...prev]);
    return mapped;
  };
  const deleteManagementReview = async (id) => {
    await mgmtReviewApi.deleteManagementReview(id);
    setManagementReviews(prev => prev.filter(m => m.id !== id));
  };

  /** Records that the CURRENT signed-in user has read a document — the personnel_id is always the caller's own, enforced server-side (0009 migration), so no one can acknowledge on someone else's behalf. */
  const acknowledgeDocumentAction = async (documentId) => {
    const myPersonnel = personnel.find(p => p.id === currentUser.id || p.name === currentUser.name);
    if (!myPersonnel) return;
    try {
      await ackApi.acknowledgeDocument(documentId, myPersonnel.id, activeLaboratoryId);
      setDocumentAcknowledgments(prev => {
        const already = prev.some(a => a.documentId === documentId && a.personnelName === myPersonnel.name);
        if (already) return prev;
        return [...prev, { id: uid(), documentId, personnelName: myPersonnel.name, acknowledgedAt: new Date().toISOString(), laboratoryId: activeLaboratoryId }];
      });
    } catch (e) {
      alert("Could not record acknowledgment.\n\n" + e.message);
    }
  };

  /** Reporting downtime automatically marks the equipment Out of service server-side (0012 trigger) — reflected here so the UI doesn't need a separate round trip. */
  const reportDowntimeAction = async (equipmentId, reason) => {
    try {
      const row = await downtimeApi.reportDowntime({ equipment_id: equipmentId, reason, reported_by: nameToId(personnel, currentUser.name), laboratory_id: activeLaboratoryId });
      setEquipmentDowntime(prev => [downtimeFromDb(row, personnel), ...prev]);
      setEquipment(prev => prev.map(e => e.id === equipmentId ? { ...e, status: "Out of service" } : e));
    } catch (e) {
      alert("Could not report downtime.\n\n" + e.message);
    }
  };
  /** Resolving marks the equipment back In service server-side, same trigger. */
  const resolveDowntimeAction = async (downtimeId, equipmentId, notes) => {
    try {
      const row = await downtimeApi.resolveDowntime(downtimeId, notes);
      setEquipmentDowntime(prev => prev.map(d => d.id === downtimeId ? downtimeFromDb(row, personnel) : d));
      setEquipment(prev => prev.map(e => e.id === equipmentId ? { ...e, status: "In service" } : e));
    } catch (e) {
      alert("Could not resolve this downtime record.\n\n" + e.message);
    }
  };

  const addClauseEvidenceAction = async (clauseId, documentId) => {
    try {
      const row = await clauseEvidenceApi.addClauseEvidence(clauseId, documentId, nameToId(personnel, currentUser.name), activeLaboratoryId);
      setClauseEvidence(prev => [...prev, clauseEvidenceFromDb(row, personnel)]);
    } catch (e) {
      alert("Could not link this document.\n\n" + e.message);
    }
  };
  const removeClauseEvidenceAction = async (id) => {
    try {
      await clauseEvidenceApi.removeClauseEvidence(id);
      setClauseEvidence(prev => prev.filter(ce => ce.id !== id));
    } catch (e) {
      alert("Could not remove this evidence link.\n\n" + e.message);
    }
  };

  /**
   * The ONE place notification toggles get changed. Settings used to keep
   * its own separate local copy that only touched the database — meaning
   * the shared copy every action actually checks (below, and in addTask/
   * addNc/publishControlledDocumentAction) never learned about the change
   * until a full page reload. Now there's exactly one copy, updated here.
   */
  const toggleNotificationSettingAction = async (eventKey, currentlyEnabled) => {
    setNotificationSettings(prev => ({ ...prev, [eventKey]: !currentlyEnabled }));
    try {
      await notificationSettingsApi.setNotificationEnabled(eventKey, !currentlyEnabled);
    } catch (e) {
      alert("Could not update this setting.\n\n" + e.message);
      setNotificationSettings(prev => ({ ...prev, [eventKey]: currentlyEnabled })); // revert on failure
    }
  };

  /** Admin-only. Immediately seeds all 34 clauses for the new lab — see the note on seedClauseStatusForLab for why this is essential, not optional. */
  const createLaboratoryAction = async (name) => {
    const row = await labsApi.createLaboratory(name);
    const lab = laboratoryFromDb(row);
    await clauseApi.seedClauseStatusForLab(lab.id, ALL_SUBCLAUSES.map(s => s.id));
    setLaboratories(prev => [...prev, lab].sort((a, b) => a.name.localeCompare(b.name)));
    return lab;
  };

  const assignPersonnelToLabAction = async (personnelId, laboratoryId) => {
    const row = await labsApi.assignPersonnelToLab(personnelId, laboratoryId);
    setPersonnelLaboratories(prev => [...prev, personnelLabFromDb(row)]);
  };
  const unassignPersonnelFromLabAction = async (id) => {
    await labsApi.unassignPersonnelFromLab(id);
    setPersonnelLaboratories(prev => prev.filter(pl => pl.id !== id));
  };

  /** Switching mid-session re-loads every lab-scoped module for the newly chosen laboratory. */
  const switchLaboratoryAction = async (labId) => {
    setActiveLaboratoryId(labId);
    setLoading(true);
    try {
      await loadLabScopedData(labId, personnel);
    } catch (e) {
      alert("Could not switch laboratory.\n\n" + e.message);
    } finally {
      setLoading(false);
    }
  };

  const addTaskCommentAction = async (taskId, comment) => {
    try {
      const row = await taskCommentsApi.addTaskComment(taskId, nameToId(personnel, currentUser.name), comment, activeLaboratoryId);
      setTaskComments(prev => [...prev, taskCommentFromDb(row, personnel)]);
    } catch (e) {
      alert("Could not add comment.\n\n" + e.message);
    }
  };
  const deleteTaskCommentAction = async (id) => {
    try {
      await taskCommentsApi.deleteTaskComment(id);
      setTaskComments(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      alert("Could not delete this comment.\n\n" + e.message);
    }
  };

  const createTaskTemplateAction = async (template) => {
    try {
      const row = await taskTemplatesApi.createTaskTemplate({
        title: template.title,
        default_priority: template.defaultPriority,
        default_clause_id: template.defaultClauseId || null,
        is_recurring: template.isRecurring || false,
        recurrence_interval_days: template.recurrenceIntervalDays || null,
        created_by: nameToId(personnel, currentUser.name),
        laboratory_id: activeLaboratoryId,
      });
      setTaskTemplates(prev => [...prev, taskTemplateFromDb(row, personnel)]);
    } catch (e) {
      alert("Could not save this template.\n\n" + e.message);
    }
  };
  const deleteTaskTemplateAction = async (id) => {
    try {
      await taskTemplatesApi.deleteTaskTemplate(id);
      setTaskTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      alert("Could not delete this template.\n\n" + e.message);
    }
  };

  /** Restricted server-side to the person the record is actually about (0015 migration). */
  const confirmCompetencyAssessmentAction = async (recordId) => {
    try {
      const row = await opsApi.confirmCompetencyAssessment(recordId);
      setCompetency(prev => prev.map(c => c.id === recordId ? competencyFromDb(row, personnel) : c));
    } catch (e) {
      alert("Could not confirm this assessment.\n\n" + e.message);
    }
  };

  /**
   * Publishes a new version of a controlled document (SOP/QSP/Policy/Manual).
   * Enforced server-side (RLS, 0007_document_control.sql) to Admin/QA Manager/
   * Deputy QA Manager regardless of what the client sends. On success, the
   * prior current version for the same document_code is marked superseded
   * in local state too, so every signed-in user's next fetch — and this
   * session immediately — shows the new version as current.
   */
  const publishControlledDocumentAction = async (draft) => {
    const dbRow = documentToDb({ ...draft, uploadedBy: currentUser.name, laboratoryId: activeLaboratoryId }, personnel);
    const inserted = await eqaDocApi.publishControlledDocument(dbRow);
    const mapped = documentFromDb(inserted, personnel);
    setDocuments(prev => [
      mapped,
      ...prev.map(d => (d.documentCode && d.documentCode === mapped.documentCode ? { ...d, isCurrent: false } : d)),
    ]);
    // Everyone needs to acknowledge a newly published/updated controlled document — notify anyone with an email on file.
    if (notificationSettings.document_published !== false) {
      personnel.forEach(p => {
        if (p.email) {
          notificationsApi.sendNotificationEmail(p.email, `New document published: ${mapped.title}`,
            `<p>Hi ${p.name},</p><p>A new version of "<strong>${mapped.title}</strong>"${mapped.documentCode ? ` (${mapped.documentCode})` : ""} has just been published and needs your acknowledgment in Lab QMS.</p>`);
        }
      });
    }
    return mapped;
  };

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

    const controlLotsExpired = qcControls.filter(c => c.expiryDate && c.expiryDate < todayISO()).length;
    const controlLotsExpiringSoon = qcControls.filter(c => c.expiryDate && c.expiryDate >= todayISO() && c.expiryDate <= in30ISO).length;
    const documentsOverdueForReview = documents.filter(d => d.isCurrent && d.nextReviewDate && d.nextReviewDate < todayISO()).length;
    const oneYearAgoISO = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10); })();
    const clausesOverdueForReview = ALL_SUBCLAUSES.filter(s => {
      const cs = clauseStatus[s.id];
      return !cs || !cs.lastReviewed || cs.lastReviewed < oneYearAgoISO;
    }).length;
    const tasksAwaitingApproval = tasks.filter(t => t.status === "Done" && !t.completionApproved).length;

    // Only the MOST RECENT event per parameter matters for "when's the next cycle due" — an older event's next_cycle_date becomes stale the moment a newer result comes in.
    const latestEqaByParameter = {};
    eqaEvents.forEach(e => {
      const key = e.parameter;
      if (!latestEqaByParameter[key] || (e.dateReceived || "") > (latestEqaByParameter[key].dateReceived || "")) latestEqaByParameter[key] = e;
    });
    const latestEqaList = Object.values(latestEqaByParameter);
    const eqaCyclesOverdue = latestEqaList.filter(e => e.nextCycleDate && e.nextCycleDate < todayISO()).length;
    const eqaCyclesDueSoon = latestEqaList.filter(e => e.nextCycleDate && e.nextCycleDate >= todayISO() && e.nextCycleDate <= in30ISO).length;

    return {
      counts, openTasks, overdueTasks, openNcs, criticalNcs, totalClauses: ALL_SUBCLAUSES.length,
      competencyOverdue, competencyDueSoon, equipmentOverdue, equipmentDueSoon,
      iqcUnauthorizedViolations, eqaUnsatisfactory, controlLotsExpired, controlLotsExpiringSoon, documentsOverdueForReview,
      clausesOverdueForReview, tasksAwaitingApproval, eqaCyclesOverdue, eqaCyclesDueSoon,
    };
  }, [clauseStatus, tasks, ncs, competency, equipmentRecords, qcParameters, qcControls, qcRuns, eqaEvents, documents]);

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
      <div className="text-sm" style={{ color: COLORS.navy }}>Loading quality management system…</div>
    </div>;
  }

  if (!currentUser) {
    return <SignInScreen onSignIn={setCurrentUser} />;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
      <div className="text-sm" style={{ color: COLORS.navy }}>Loading your data…</div>
    </div>;
  }

  if (labChoicesPending !== null && !activeLaboratoryId) {
    return <LaboratoryPicker choices={labChoicesPending} onSelect={selectLaboratoryAction} onLogout={() => { authApi.signOut(); setCurrentUser(null); setLabChoicesPending(null); }} />;
  }

  const isAdmin = currentUser.role === "Admin";
  const isQaManager = currentUser.role === "QA Manager";
  const canEdit = currentUser.role !== "Viewer";
  const canAuthorizeIQC = isAdmin || isQaManager;
  const canAssignTasks = TASK_ASSIGNER_ROLES.includes(currentUser.role);
  /** Clause compliance assessment is a QA governance judgment, not routine data entry — same role group as task assignment, so a deputy can still act while the QA Manager/Admin is away. */
  const canManageClauseStatus = TASK_ASSIGNER_ROLES.includes(currentUser.role);
  const canPublishControlledDocs = DOCUMENT_PUBLISHER_ROLES.includes(currentUser.role);
  const canSeeAuditBackup = isAdmin || isQaManager;

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "clauses", label: "Clause register", icon: ListChecks },
    { id: "tasks", label: "Tasks", icon: ClipboardList },
    { id: "ncs", label: "NC / CAPA", icon: AlertTriangle },
    { id: "risks", label: "Risk register", icon: ShieldAlert },
    { id: "iqc", label: "IQC & Levey-Jennings", icon: Activity },
    { id: "eqa", label: "EQAS", icon: BarChart3 },
    { id: "competency", label: "Staff competency", icon: GraduationCap },
    { id: "equipment", label: "Equipment records", icon: Wrench },
    { id: "documents", label: "Documents", icon: FolderOpen },
    { id: "personnel", label: "Personnel", icon: Users },
    ...(canSeeAuditBackup ? [{ id: "mgmtreview", label: "Management review", icon: CheckCircle2 }] : []),
    ...(canSeeAuditBackup ? [{ id: "audit", label: "Audit & Backup", icon: History }] : []),
    ...(isAdmin ? [{ id: "settings", label: "Settings", icon: KeyRound }] : []),
    { id: "manual", label: "User Manual", icon: BookOpen, href: "/Lab-QMS-User-Manual.pdf" },
  ];

  const myOwnPersonnel = personnel.find(p => p.id === currentUser.id || p.name === currentUser.name);
  const switchableLabs = isAdmin
    ? laboratories
    : laboratories.filter(lab => personnelLaboratories.some(pl => pl.laboratoryId === lab.id && pl.personnelId === myOwnPersonnel?.id));
  const activeLab = laboratories.find(l => l.id === activeLaboratoryId);

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
        {switchableLabs.length > 1 ? (
          <div className="px-5 py-3 border-b" style={{ borderColor: "#1C4753" }}>
            <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#7C9C97" }}>Laboratory</div>
            <select value={activeLaboratoryId || ""} onChange={e => switchLaboratoryAction(e.target.value)}
              className="w-full text-xs rounded-md px-2 py-1.5 border-0"
              style={{ background: "#1C4753", color: "white" }}>
              {switchableLabs.map(lab => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
            </select>
          </div>
        ) : activeLab ? (
          <div className="px-5 py-3 border-b text-xs" style={{ borderColor: "#1C4753", color: "#A9C4C0" }}>{activeLab.name}</div>
        ) : null}
        <nav className="flex-1 py-3">
          {NAV.map(n => {
            const Icon = n.icon;
            const active = tab === n.id;
            if (n.href) {
              return (
                <a key={n.id} href={n.href} target="_blank" rel="noreferrer"
                  className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-left transition-colors"
                  style={{ color: "#A9C4C0", background: "transparent" }}>
                  <Icon size={16} /> {n.label}
                </a>
              );
            }
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
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0" style={{ background: COLORS.teal }}>
              {initialsOf(currentUser.name)}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-white truncate">{currentUser.name}</div>
              <div className="text-[10px]" style={{ color: COLORS.seafoam }}>{currentUser.role}</div>
            </div>
          </div>
          <button onClick={() => { authApi.signOut(); setCurrentUser(null); }}
            className="w-full flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-md border mb-2"
            style={{ borderColor: "#2A5560", color: "#C7D6D2" }}>
            <LogOut size={13} /> Log out
          </button>
          <div className="text-[10px]" style={{ color: "#5C8A85" }}>Data is stored in this browser only — not shared with other devices or people.</div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-auto">
        {tab === "dashboard" && <Dashboard stats={stats} tasks={tasks} ncs={ncs} personnel={personnel} setTab={setTab}
          competency={competency} equipmentRecords={equipmentRecords} equipment={equipment} canAssignTasks={canAssignTasks} />}
        {tab === "clauses" && <ClauseRegister clauseStatus={clauseStatus} updateClauseStatus={updateClauseStatus}
          personnel={personnel} tasks={tasks} updateTasks={updateTasks} canEdit={canEdit} canAssignTasks={canAssignTasks} documents={documents}
          canSeeAuditBackup={canSeeAuditBackup} clauseEvidence={clauseEvidence} canManageClauseStatus={canManageClauseStatus}
          addClauseEvidenceAction={addClauseEvidenceAction} removeClauseEvidenceAction={removeClauseEvidenceAction} activeLaboratoryId={activeLaboratoryId} />}
        {tab === "tasks" && <Tasks tasks={tasks} updateTasks={updateTasks} setTaskStatusAction={setTaskStatusAction} approveTaskCompletionAction={approveTaskCompletionAction}
          personnel={personnel} canEdit={canEdit} canAssignTasks={canAssignTasks} taskComments={taskComments} currentUser={currentUser}
          addTaskCommentAction={addTaskCommentAction} deleteTaskCommentAction={deleteTaskCommentAction}
          taskTemplates={taskTemplates} createTaskTemplateAction={createTaskTemplateAction} deleteTaskTemplateAction={deleteTaskTemplateAction}
          notificationSettings={notificationSettings} activeLaboratoryId={activeLaboratoryId} />}
        {tab === "ncs" && <NCRegister ncs={ncs} updateNcs={updateNcs} personnel={personnel} canEdit={canEdit} notificationSettings={notificationSettings} activeLaboratoryId={activeLaboratoryId} />}
        {tab === "risks" && <RiskRegister risks={risks} updateRisks={updateRisks} personnel={personnel} canEdit={canEdit} activeLaboratoryId={activeLaboratoryId} />}
        {tab === "iqc" && <IQCPage qcMachines={qcMachines} updateQcMachines={updateQcMachines}
          qcParameters={qcParameters} updateQcParameters={updateQcParameters}
          qcControls={qcControls} updateQcControls={updateQcControls}
          qcRuns={qcRuns} updateQcRuns={updateQcRuns} personnel={personnel}
          canEdit={canEdit} canAuthorizeIQC={canAuthorizeIQC} currentUser={currentUser}
          authorizeQcRunAction={authorizeQcRunAction} bulkImportQcRuns={bulkImportQcRuns}
          equipment={equipment} updateEquipment={updateEquipment} activeLaboratoryId={activeLaboratoryId} />}
        {tab === "eqa" && <EQAPage eqaEvents={eqaEvents} updateEqaEvents={updateEqaEvents} qcMachines={qcMachines} canEdit={canEdit}
          ncs={ncs} createNcFromEqaAction={createNcFromEqaAction} activeLaboratoryId={activeLaboratoryId} />}
        {tab === "competency" && <Competency competency={competency} updateCompetency={updateCompetency} personnel={personnel} canEdit={canEdit} currentUser={currentUser} confirmCompetencyAssessmentAction={confirmCompetencyAssessmentAction} activeLaboratoryId={activeLaboratoryId} />}
        {tab === "equipment" && <Equipment equipment={equipment} updateEquipment={updateEquipment}
          equipmentRecords={equipmentRecords} updateEquipmentRecords={updateEquipmentRecords} personnel={personnel} canEdit={canEdit}
          equipmentDowntime={equipmentDowntime} reportDowntimeAction={reportDowntimeAction} resolveDowntimeAction={resolveDowntimeAction}
          qcMachines={qcMachines} qcParameters={qcParameters} qcControls={qcControls} qcRuns={qcRuns} activeLaboratoryId={activeLaboratoryId} />}
        {tab === "documents" && <Documents documents={documents} updateDocuments={updateDocuments} personnel={personnel}
          currentUser={currentUser} canEdit={canEdit} canPublishControlledDocs={canPublishControlledDocs}
          publishControlledDocumentAction={publishControlledDocumentAction}
          documentAcknowledgments={documentAcknowledgments} acknowledgeDocumentAction={acknowledgeDocumentAction} activeLaboratoryId={activeLaboratoryId} />}
        {tab === "personnel" && <Personnel personnel={personnel} setPersonnel={setPersonnel} updatePersonnel={updatePersonnel} currentUser={currentUser} isAdmin={isAdmin} canEdit={canEdit}
          laboratories={laboratories} personnelLaboratories={personnelLaboratories} assignPersonnelToLabAction={assignPersonnelToLabAction} unassignPersonnelFromLabAction={unassignPersonnelFromLabAction} />}
        {tab === "mgmtreview" && canSeeAuditBackup && <ManagementReview managementReviews={managementReviews} addManagementReview={addManagementReview}
          deleteManagementReview={deleteManagementReview} stats={stats} currentUser={currentUser} />}
        {tab === "audit" && canSeeAuditBackup && <AuditBackup />}
        {tab === "settings" && isAdmin && <Settings qcMachines={qcMachines} currentUser={currentUser}
          notificationSettings={notificationSettings} toggleNotificationSettingAction={toggleNotificationSettingAction}
          laboratories={laboratories} createLaboratoryAction={createLaboratoryAction} activeLaboratoryId={activeLaboratoryId} />}
      </div>
    </div>
  );
}

// ---------------- Dashboard ----------------
function Dashboard({ stats, tasks, ncs, personnel, setTab, competency, equipmentRecords, equipment, canAssignTasks }) {
  const pct = Math.round((stats.counts["Compliant"] / stats.totalClauses) * 100);
  const upcoming = tasks.filter(t => t.status !== "Done").sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999")).slice(0, 5);
  const openNcs = ncs.filter(n => n.status !== "Closed").slice(0, 5);
  const equipById = Object.fromEntries(equipment.map(e => [e.id, e]));
  const competencyAlerts = competency.filter(c => c.dueDate && c.dueDate < todayISO())
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  const equipmentAlerts = equipmentRecords.filter(r => r.dueDate && r.dueDate < todayISO())
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);

  const printDashboardSnapshot = () => {
    const w = window.open("", "_blank");
    if (!w) { alert("Please allow pop-ups for this site to print the report."); return; }
    const row = (label, value) => `<tr><td>${escapeHtml(label)}</td><td style="font-weight:600">${escapeHtml(value)}</td></tr>`;
    w.document.write(`<!DOCTYPE html><html><head><title>Quality Management Snapshot</title>
      <style>
        body { font-family: -apple-system, system-ui, sans-serif; padding: 32px; color: #0F2A3D; }
        h1 { font-size: 18px; margin-bottom: 2px; }
        h2 { font-size: 13px; margin: 20px 0 6px; }
        p.meta { color: #6B7A78; font-size: 12px; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        td { border: 1px solid #D8E5E1; padding: 6px 10px; font-size: 12px; }
        tr:nth-child(even) td { background: #F6FAF9; }
      </style></head>
      <body>
        <h1>Quality Management Snapshot</h1>
        <p class="meta">Lab QMS \u2014 generated ${escapeHtml(new Date().toLocaleString())} \u2014 suitable for attaching to a Management Review record</p>
        <h2>Compliance</h2>
        <table>
          ${row("Clause compliance", `${pct}% (${stats.counts["Compliant"]} of ${stats.totalClauses})`)}
          ${row("Non-conformant clauses", stats.counts["Non-conformant"])}
          ${row("Clauses overdue for review", stats.clausesOverdueForReview)}
          ${row("EQA cycles overdue", `${stats.eqaCyclesOverdue} (${stats.eqaCyclesDueSoon} due within 30 days)`)}
        </table>
        <h2>Tasks & NCs</h2>
        <table>
          ${row("Open tasks", `${stats.openTasks} (${stats.overdueTasks} overdue)`)}
          ${row("Tasks awaiting approval", stats.tasksAwaitingApproval)}
          ${row("Open NCs", `${stats.openNcs} (${stats.criticalNcs} critical)`)}
        </table>
        <h2>Personnel & equipment</h2>
        <table>
          ${row("Competency overdue", stats.competencyOverdue)}
          ${row("Equipment maintenance overdue", stats.equipmentOverdue)}
          ${row("Documents overdue for review", stats.documentsOverdueForReview)}
        </table>
        <h2>IQC & EQA</h2>
        <table>
          ${row("Unauthorized IQC violations", stats.iqcUnauthorizedViolations)}
          ${row("Control lots expired", stats.controlLotsExpired)}
          ${row("EQA unsatisfactory results", stats.eqaUnsatisfactory)}
        </table>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold" style={{ color: COLORS.navy }}>Quality management overview</h1>
        <button onClick={printDashboardSnapshot} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
          <Download size={14} /> Export snapshot (PDF)
        </button>
      </div>
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

      <div className="grid grid-cols-2 gap-4 mb-4">
        <StatCard label="Control lots expired" value={stats.controlLotsExpired} sub={`${stats.controlLotsExpiringSoon} expiring within 30 days`} color={stats.controlLotsExpired ? COLORS.red : COLORS.teal} />
        <StatCard label="Documents overdue for review" value={stats.documentsOverdueForReview} sub="controlled documents past their next review date" color={stats.documentsOverdueForReview ? COLORS.red : COLORS.teal} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <StatCard label="Clauses overdue for review" value={stats.clausesOverdueForReview} sub="not reviewed in the last 12 months" color={stats.clausesOverdueForReview ? COLORS.amber : COLORS.teal} />
        <StatCard label="EQA cycles overdue" value={stats.eqaCyclesOverdue} sub={`${stats.eqaCyclesDueSoon} due within 30 days`} color={stats.eqaCyclesOverdue ? COLORS.red : COLORS.teal} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {canAssignTasks && (
          <StatCard label="Tasks awaiting approval" value={stats.tasksAwaitingApproval} sub="marked Done by the assignee, not yet approved" color={stats.tasksAwaitingApproval ? COLORS.amber : COLORS.teal} />
        )}
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
function ClauseRegister({ clauseStatus, updateClauseStatus, personnel, tasks, updateTasks, canAssignTasks, documents, canSeeAuditBackup, clauseEvidence, addClauseEvidenceAction, removeClauseEvidenceAction, canManageClauseStatus, activeLaboratoryId }) {
  const [openGroups, setOpenGroups] = useState(() => Object.fromEntries(CLAUSES.map(c => [c.id, true])));
  const [taskDraftFor, setTaskDraftFor] = useState(null);
  const [historyOpenFor, setHistoryOpenFor] = useState(null);
  const [guidanceOpenFor, setGuidanceOpenFor] = useState(null);
  const [historyCache, setHistoryCache] = useState({});
  const [historyLoading, setHistoryLoading] = useState(null);
  const oneYearAgoISO = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10); })();

  const toggleHistory = async (clauseId, recordId) => {
    if (historyOpenFor === clauseId) { setHistoryOpenFor(null); return; }
    setHistoryOpenFor(clauseId);
    if (!recordId || historyCache[clauseId]) return;
    setHistoryLoading(clauseId);
    try {
      const rows = await auditApi.listAuditLog({ entity: "clause_status", recordId });
      setHistoryCache(prev => ({ ...prev, [clauseId]: rows }));
    } catch (e) {
      setHistoryCache(prev => ({ ...prev, [clauseId]: [] }));
    } finally {
      setHistoryLoading(null);
    }
  };

  const setStatus = (id, patch) => {
    const cur = clauseStatus[id] || { status: "Not assessed", owner: "", lastReviewed: "", notes: "" };
    updateClauseStatus({ ...clauseStatus, [id]: { ...cur, ...patch } });
  };

  const createTaskFromClause = (clauseId, draft) => {
    const t = { id: uid(), title: draft.title, clauseId, assignedTo: draft.assignedTo, dueDate: draft.dueDate, priority: draft.priority || "Medium", status: "Open", notes: "", createdAt: todayISO(), laboratoryId: activeLaboratoryId };
    updateTasks([t, ...tasks]);
    setTaskDraftFor(null);
  };

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: COLORS.navy }}>Clause register</h1>
      <p className="text-sm text-gray-500 mb-1">Track compliance status, ownership, and review dates for every clause of ISO 15189:2022.</p>
      {!canManageClauseStatus && <p className="text-xs text-gray-400 mb-6">Compliance assessment is limited to the Admin, QA Manager, and their deputies — you can view every clause here, but not change its status, owner, or evidence.</p>}
      {canManageClauseStatus && <div className="mb-6" />}

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
                        <div className="text-sm mb-2 flex items-center gap-2">
                          {sub.title}
                          {CLAUSE_GUIDANCE[sub.id] && (
                            <button onClick={() => setGuidanceOpenFor(guidanceOpenFor === sub.id ? null : sub.id)} className="text-xs text-gray-400 underline font-normal">
                              {guidanceOpenFor === sub.id ? "Hide" : "What this means"}
                            </button>
                          )}
                        </div>
                        {guidanceOpenFor === sub.id && CLAUSE_GUIDANCE[sub.id] && (
                          <div className="mb-2 p-2 rounded-md text-xs" style={{ background: COLORS.mint, color: COLORS.ink }}>
                            {CLAUSE_GUIDANCE[sub.id]}
                            <div className="text-[10px] text-gray-400 mt-1">Plain-language summary for quick reference only — always consult the official ISO 15189:2022 standard text for the authoritative requirement.</div>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 items-center">
                          <select value={cs.status} disabled={!canManageClauseStatus} onChange={e => setStatus(sub.id, { status: e.target.value })}
                            className="text-xs border rounded-md px-2 py-1 disabled:opacity-60" style={{ borderColor: "#D8E5E1", color: STATUS_COLOR[cs.status] }}>
                            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <select value={cs.owner} disabled={!canManageClauseStatus} onChange={e => setStatus(sub.id, { owner: e.target.value })}
                            className="text-xs border rounded-md px-2 py-1 disabled:opacity-60" style={{ borderColor: "#D8E5E1" }}>
                            <option value="">Assign owner…</option>
                            {personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                          <input type="date" value={cs.lastReviewed} disabled={!canManageClauseStatus} onChange={e => setStatus(sub.id, { lastReviewed: e.target.value })}
                            className="text-xs border rounded-md px-2 py-1 disabled:opacity-60" style={{ borderColor: "#D8E5E1" }} title="Last reviewed" />
                          {(!cs.lastReviewed || cs.lastReviewed < oneYearAgoISO) && <Badge color={COLORS.amber}>Review due</Badge>}
                          {canAssignTasks && (
                            <button onClick={() => setTaskDraftFor(sub.id)} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
                              <Plus size={12} /> Assign task
                            </button>
                          )}
                          {canSeeAuditBackup && (
                            <button onClick={() => toggleHistory(sub.id, cs.id)} className="text-xs text-gray-400 underline">
                              {historyOpenFor === sub.id ? "Hide" : "Show"} history
                            </button>
                          )}
                        </div>
                        {historyOpenFor === sub.id && (
                          <div className="mt-2 p-2 rounded-md text-xs" style={{ background: COLORS.mint }}>
                            {historyLoading === sub.id && <div className="text-gray-400">Loading…</div>}
                            {historyLoading !== sub.id && (!historyCache[sub.id] || historyCache[sub.id].length === 0) && (
                              <div className="text-gray-400">{cs.id ? "No changes recorded yet." : "This clause hasn't been touched yet, so there's no change record."}</div>
                            )}
                            {historyLoading !== sub.id && historyCache[sub.id] && historyCache[sub.id].map(h => (
                              <div key={h.id} className="py-0.5 text-gray-600">
                                {(h.ts || "").slice(0, 16).replace("T", " ")} — {h.action} by {h.actor_name}{h.actor_role ? ` (${h.actor_role})` : ""}
                              </div>
                            ))}
                          </div>
                        )}
                        <textarea value={cs.notes} disabled={!canManageClauseStatus} onChange={e => setStatus(sub.id, { notes: e.target.value })}
                          placeholder="Notes…" rows={cs.notes ? 2 : 1}
                          className="w-full mt-2 text-xs border rounded-md px-2 py-1.5 text-gray-600 disabled:opacity-60" style={{ borderColor: "#EEF3F1" }} />
                        <div className="mt-2">
                          <div className="text-[11px] font-medium text-gray-500 mb-1">Evidence documents</div>
                          {clauseEvidence.filter(ce => ce.clauseId === sub.id).length === 0 && (
                            <div className="text-xs text-gray-400 mb-1">No evidence documents linked yet.</div>
                          )}
                          {clauseEvidence.filter(ce => ce.clauseId === sub.id).map(ce => {
                            const doc = documents.find(d => d.id === ce.documentId);
                            if (!doc) return null;
                            return (
                              <div key={ce.id} className="flex items-center gap-2 text-xs py-0.5">
                                <LinkIcon size={11} color={COLORS.teal} className="shrink-0" />
                                <a href={doc.url} target="_blank" rel="noreferrer" className="underline flex-1 truncate" style={{ color: COLORS.teal }}>{doc.title} ({doc.category})</a>
                                {canManageClauseStatus && <button onClick={() => removeClauseEvidenceAction(ce.id)} className="text-gray-300 hover:text-red-500"><X size={12} /></button>}
                              </div>
                            );
                          })}
                          {canManageClauseStatus && (() => {
                            const linkedIds = new Set(clauseEvidence.filter(ce => ce.clauseId === sub.id).map(ce => ce.documentId));
                            const available = documents.filter(d => !linkedIds.has(d.id));
                            return (
                              <select value="" disabled={available.length === 0} onChange={e => e.target.value && addClauseEvidenceAction(sub.id, e.target.value)}
                                className="text-xs border rounded-md px-2 py-1 mt-1 disabled:opacity-50" style={{ borderColor: "#D8E5E1" }}>
                                <option value="">{available.length === 0 ? "All documents already linked" : "+ Link another document…"}</option>
                                {available.map(d => <option key={d.id} value={d.id}>{d.title} ({d.category})</option>)}
                              </select>
                            );
                          })()}
                        </div>
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
  const [dueTime, setDueTime] = useState("");
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
        <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} disabled={!dueDate} title="Optional — time of day this is due" className="text-xs border rounded-md px-2 py-1 w-24 disabled:opacity-40" style={{ borderColor: "#D8E5E1" }} />
        <select value={priority} onChange={e => setPriority(e.target.value)} className="text-xs border rounded-md px-2 py-1" style={{ borderColor: "#D8E5E1" }}>
          <option>Low</option><option>Medium</option><option>High</option>
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="text-xs px-3 py-1 rounded-md text-gray-500">Cancel</button>
        <button onClick={() => title.trim() && onSave({ title, assignedTo, dueDate, dueTime: dueDate ? dueTime : "", priority })}
          className="text-xs px-3 py-1 rounded-md text-white" style={{ background: COLORS.teal }}>Create task</button>
      </div>
    </div>
  );
}

// ---------------- Tasks ----------------
function Tasks({ tasks, updateTasks, setTaskStatusAction, approveTaskCompletionAction, personnel, canEdit, canAssignTasks, taskComments, currentUser, addTaskCommentAction, deleteTaskCommentAction, taskTemplates, createTaskTemplateAction, deleteTaskTemplateAction, notificationSettings, activeLaboratoryId }) {
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterAssignee, setFilterAssignee] = useState("All");
  const [commentsOpenFor, setCommentsOpenFor] = useState(null);
  const [newComment, setNewComment] = useState("");

  const addTask = (draft) => {
    updateTasks([{ id: uid(), ...draft, status: "Open", createdAt: todayISO(), laboratoryId: activeLaboratoryId }, ...tasks]);
    setShowForm(false);
    if (draft.assignedTo && notificationSettings.task_assigned !== false) {
      const assignee = personnel.find(p => p.name === draft.assignedTo);
      if (assignee?.email) {
        notificationsApi.sendNotificationEmail(assignee.email, `New task assigned: ${draft.title}`,
          `<p>Hi ${assignee.name},</p><p>You've been assigned a new task in Lab QMS: "<strong>${draft.title}</strong>"${draft.dueDate ? `, due ${draft.dueDate}` : ""}.</p>`);
      }
    }
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

      {showForm && canAssignTasks && <TaskForm personnel={personnel} onCancel={() => setShowForm(false)} onSave={addTask} taskTemplates={taskTemplates} createTaskTemplateAction={createTaskTemplateAction} deleteTaskTemplateAction={deleteTaskTemplateAction} />}

      <div className="bg-white rounded-lg border divide-y" style={{ borderColor: "#E1EBE8" }}>
        {filtered.length === 0 && <Empty text="No tasks match this view." />}
        {filtered.map(t => {
          const overdue = t.status !== "Done" && t.dueDate && t.dueDate < todayISO();
          const trulyDone = t.status === "Done" && t.completionApproved;
          const awaitingApproval = t.status === "Done" && !t.completionApproved;
          const commentsForTask = taskComments.filter(c => c.taskId === t.id);
          return (
            <div key={t.id}>
            <div className="flex items-center gap-3 px-5 py-3">
              <button disabled={!canEdit} onClick={() => setTaskStatusAction(t.id, t.status === "Done" ? "Open" : "Done")} className="disabled:opacity-50">
                {trulyDone ? <CheckCircle2 size={18} color={COLORS.teal} /> : awaitingApproval ? <Clock size={18} color={COLORS.amber} /> : <Circle size={18} color="#C7D6D2" />}
              </button>
              <div className="flex-1">
                <div className="text-sm" style={{ textDecoration: trulyDone ? "line-through" : "none", color: trulyDone ? "#9AA5A3" : COLORS.ink }}>{t.title}</div>
                <div className="text-xs text-gray-400">
                  {t.assignedTo || "Unassigned"} {t.clauseId && `· Clause ${t.clauseId}`}
                  {trulyDone && t.approvedBy && ` · approved by ${t.approvedBy}`}
                </div>
              </div>
              {t.isRecurring && <Badge color={COLORS.teal}>Recurring · every {t.recurrenceIntervalDays}d</Badge>}
              {awaitingApproval && <Badge color={COLORS.amber}>Awaiting approval</Badge>}
              {awaitingApproval && canAssignTasks && (
                <button onClick={() => approveTaskCompletionAction(t.id)} className="text-xs px-2 py-1 rounded-md text-white whitespace-nowrap" style={{ background: COLORS.teal }}>
                  Approve
                </button>
              )}
              <select value={t.status} disabled={!canEdit} onChange={e => setTaskStatusAction(t.id, e.target.value)} className="text-xs border rounded-md px-2 py-1 disabled:opacity-50" style={{ borderColor: "#D8E5E1" }}>
                {TASK_STATUS.map(s => <option key={s}>{s}</option>)}
              </select>
              <Badge color={overdue ? COLORS.red : "#9AA5A3"}>{t.dueDate ? `${t.dueDate}${t.dueTime ? ` ${t.dueTime}` : ""}` : "no date"}</Badge>
              <Badge color={t.priority === "High" ? COLORS.red : t.priority === "Medium" ? COLORS.amber : "#9AA5A3"}>{t.priority}</Badge>
              <button onClick={() => setCommentsOpenFor(commentsOpenFor === t.id ? null : t.id)} className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
                {commentsForTask.length} comment{commentsForTask.length !== 1 ? "s" : ""} {commentsOpenFor === t.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {canAssignTasks && <button onClick={() => removeTask(t.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>}
            </div>
            {commentsOpenFor === t.id && (
              <div className="px-5 pb-3 pl-12" style={{ background: COLORS.bg }}>
                {commentsForTask.length === 0 && <div className="text-xs text-gray-400 py-2">No comments yet.</div>}
                {commentsForTask.map(c => (
                  <div key={c.id} className="flex items-start gap-2 text-xs py-1.5 border-b" style={{ borderColor: "#EEF3F1" }}>
                    <div className="flex-1">
                      <span className="font-medium" style={{ color: COLORS.navy }}>{c.authorName}</span>
                      <span className="text-gray-400"> · {(c.createdAt || "").slice(0, 16).replace("T", " ")}</span>
                      <div className="text-gray-600 mt-0.5">{c.comment}</div>
                    </div>
                    {(currentUser.name === c.authorName || canAssignTasks) && (
                      <button onClick={() => deleteTaskCommentAction(c.id)} className="text-gray-300 hover:text-red-500"><X size={12} /></button>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <div className="flex items-center gap-2 mt-2">
                    <input className={inputCls} style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} placeholder="Add a comment…"
                      value={commentsOpenFor === t.id ? newComment : ""} onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && newComment.trim()) { addTaskCommentAction(t.id, newComment.trim()); setNewComment(""); } }} />
                    <button onClick={() => { if (newComment.trim()) { addTaskCommentAction(t.id, newComment.trim()); setNewComment(""); } }}
                      className="text-xs px-3 py-1.5 rounded-md text-white whitespace-nowrap" style={{ background: COLORS.teal }}>Post</button>
                  </div>
                )}
              </div>
            )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskForm({ personnel, onSave, onCancel, taskTemplates, createTaskTemplateAction, deleteTaskTemplateAction }) {
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [clauseId, setClauseId] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceIntervalDays, setRecurrenceIntervalDays] = useState(30);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [showManageTemplates, setShowManageTemplates] = useState(false);

  const applyTemplate = (templateId) => {
    const t = taskTemplates.find(tt => tt.id === templateId);
    if (!t) return;
    setTitle(t.title);
    setPriority(t.defaultPriority);
    setClauseId(t.defaultClauseId || "");
    setIsRecurring(t.isRecurring);
    if (t.isRecurring && t.recurrenceIntervalDays) setRecurrenceIntervalDays(t.recurrenceIntervalDays);
  };

  return (
    <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
      {taskTemplates.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <select className={inputCls} style={{ ...inputStyle, maxWidth: 300 }} value="" onChange={e => e.target.value && applyTemplate(e.target.value)}>
            <option value="">Start from a saved template…</option>
            {taskTemplates.map(t => <option key={t.id} value={t.id}>{t.title}{t.isRecurring ? ` (every ${t.recurrenceIntervalDays}d)` : ""}</option>)}
          </select>
          <button onClick={() => setShowManageTemplates(v => !v)} className="text-xs text-gray-400 underline">Manage templates</button>
        </div>
      )}
      {showManageTemplates && (
        <div className="border rounded-md p-2 mb-3 space-y-1" style={{ borderColor: "#EEF3F1" }}>
          {taskTemplates.length === 0 && <div className="text-xs text-gray-400">No saved templates yet.</div>}
          {taskTemplates.map(t => (
            <div key={t.id} className="flex items-center justify-between text-xs">
              <span>{t.title}</span>
              <button onClick={() => deleteTaskTemplateAction(t.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
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
        <Field label="Due time (optional)"><input type="time" className={inputCls} style={inputStyle} value={dueTime} onChange={e => setDueTime(e.target.value)} disabled={!dueDate} /></Field>
        <Field label="Priority">
          <select className={inputCls} style={inputStyle} value={priority} onChange={e => setPriority(e.target.value)}>
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
        </Field>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <input type="checkbox" id="recurring-task" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
        <label htmlFor="recurring-task" className="text-xs text-gray-600">Recurring — automatically create the next one when this is marked Done</label>
      </div>
      {isRecurring && (
        <Field label="Repeat every (days)">
          <input type="number" min="1" className={inputCls} style={{ ...inputStyle, maxWidth: 120 }} value={recurrenceIntervalDays} onChange={e => setRecurrenceIntervalDays(e.target.value)} />
        </Field>
      )}
      <div className="flex items-center gap-2 mb-2">
        <input type="checkbox" id="save-template" checked={saveAsTemplate} onChange={e => setSaveAsTemplate(e.target.checked)} />
        <label htmlFor="save-template" className="text-xs text-gray-600">Save this title/priority/clause/recurrence as a reusable template for next time</label>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 text-gray-500">Cancel</button>
        <button onClick={() => {
          if (!title.trim()) return;
          if (saveAsTemplate) {
            createTaskTemplateAction({ title, defaultPriority: priority, defaultClauseId: clauseId, isRecurring, recurrenceIntervalDays: isRecurring ? Number(recurrenceIntervalDays) || 30 : null });
          }
          onSave({
            title, assignedTo, dueDate, dueTime: dueDate ? dueTime : "", priority, clauseId,
            isRecurring, recurrenceIntervalDays: isRecurring ? Number(recurrenceIntervalDays) || 30 : null,
          });
        }}
          className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1" style={{ background: COLORS.teal }}><Save size={14} /> Save task</button>
      </div>
    </div>
  );
}

// ---------------- NC / CAPA Register ----------------
function NCRegister({ ncs, updateNcs, personnel, canEdit, notificationSettings, activeLaboratoryId }) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [showTrends, setShowTrends] = useState(false);
  const [showNcReportPicker, setShowNcReportPicker] = useState(false);
  const [selectedNcReportIds, setSelectedNcReportIds] = useState([]);

  const nextNcNumber = () => `NC-${String(ncs.length + 1).padStart(3, "0")}`;

  const addNc = (draft) => {
    const nc = {
      id: uid(), ncNumber: nextNcNumber(), status: "Open", dateRaised: todayISO(),
      rootCause: "", correctiveAction: "", preventiveAction: "", evidence: "", verifiedBy: "", closedDate: "",
      effectivenessCheckDue: "", effectivenessCheckResult: "", effectivenessNotes: "", effectivenessVerifiedBy: "",
      laboratoryId: activeLaboratoryId,
      ...draft,
    };
    updateNcs([nc, ...ncs]);
    setShowForm(false);
    if (nc.assignedTo && notificationSettings.nc_assigned !== false) {
      const assignee = personnel.find(p => p.name === nc.assignedTo);
      if (assignee?.email) {
        notificationsApi.sendNotificationEmail(assignee.email, `NC assigned to you: ${nc.title}`,
          `<p>Hi ${assignee.name},</p><p>You've been assigned a nonconformity in Lab QMS: "<strong>${nc.title}</strong>" (${nc.ncNumber}), severity ${nc.severity || "not set"}.</p>`);
      }
    }
  };
  const setNc = (id, patch) => updateNcs(ncs.map(n => n.id === id ? { ...n, ...patch } : n));
  const removeNc = (id) => updateNcs(ncs.filter(n => n.id !== id));

  const trendData = useMemo(() => {
    const byMonth = {};
    ncs.forEach(n => {
      const month = (n.dateRaised || "").slice(0, 7); // YYYY-MM
      if (!month) return;
      byMonth[month] = (byMonth[month] || 0) + 1;
    });
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }));
  }, [ncs]);

  const bySource = useMemo(() => {
    const counts = {};
    ncs.forEach(n => { const s = n.source || "Not specified"; counts[s] = (counts[s] || 0) + 1; });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [ncs]);

  const bySeverity = useMemo(() => {
    const counts = { Critical: 0, Major: 0, Minor: 0 };
    ncs.forEach(n => { if (n.severity) counts[n.severity] = (counts[n.severity] || 0) + 1; });
    return counts;
  }, [ncs]);

  /** Follows relatedNcId back to the ultimate root of a recurrence chain. Guards against a cycle (e.g. a data-entry mistake linking A->B->A) so this can never loop forever. */
  const getChainRootId = (nc, allNcs, guard = new Set()) => {
    if (!nc.relatedNcId || guard.has(nc.id)) return nc.id;
    guard.add(nc.id);
    const parent = allNcs.find(o => o.id === nc.relatedNcId);
    if (!parent) return nc.id;
    return getChainRootId(parent, allNcs, guard);
  };
  /** Groups every NC by its chain's root, so each recurring pattern's full history — not just "is this a recurrence" — is available: which occurrence number this is, and how many total. */
  const occurrenceInfo = useMemo(() => {
    const familyByRoot = {};
    ncs.forEach(n => {
      const root = getChainRootId(n, ncs);
      (familyByRoot[root] = familyByRoot[root] || []).push(n);
    });
    const info = {};
    Object.values(familyByRoot).forEach(family => {
      const sorted = [...family].sort((a, b) => (a.dateRaised || "").localeCompare(b.dateRaised || ""));
      sorted.forEach((n, i) => { info[n.id] = { occurrenceNumber: i + 1, totalOccurrences: sorted.length }; });
    });
    return info;
  }, [ncs]);

  const buildNcReportRows = (ncIds) => ncs.filter(n => ncIds.includes(n.id)).map(n => {
    const related = n.relatedNcId ? ncs.find(o => o.id === n.relatedNcId) : null;
    const occ = occurrenceInfo[n.id] || { occurrenceNumber: 1, totalOccurrences: 1 };
    return {
      "NC Number": n.ncNumber,
      "Title": n.title,
      "Status": n.status,
      "Severity": n.severity || "",
      "Source": n.source || "",
      "Clause": n.clauseId || "",
      "Date Raised": n.dateRaised || "",
      "Assigned To": n.assignedTo || "",
      "Root Cause": n.rootCause || "",
      "Corrective Action": n.correctiveAction || "",
      "Preventive Action": n.preventiveAction || "",
      "Verified By": n.verifiedBy || "",
      "Closed Date": n.closedDate || "",
      "Recurrence Of": related ? `${related.ncNumber} — ${related.title}` : "",
      "Occurrence": `${occ.occurrenceNumber} of ${occ.totalOccurrences}`,
      "Effectiveness Check Due": n.effectivenessCheckDue || "",
      "Effectiveness Result": n.effectivenessCheckResult || "",
    };
  });

  const downloadNcReportExcel = (ncIds) => {
    exportRowsToExcel(buildNcReportRows(ncIds), "NC-CAPA", `nc-capa-register-${todayISO()}.xlsx`);
  };

  const printNcReport = (ncIds) => {
    const rows = buildNcReportRows(ncIds);
    const recurrenceCount = rows.filter(r => r["Recurrence Of"]).length;
    const w = window.open("", "_blank");
    if (!w) { alert("Please allow pop-ups for this site to print the report."); return; }
    const tableRows = rows.map(r => `
      <tr>
        <td>${escapeHtml(r["NC Number"])}</td>
        <td>${escapeHtml(r["Title"])}</td>
        <td>${escapeHtml(r["Status"])}</td>
        <td>${escapeHtml(r["Severity"])}</td>
        <td>${escapeHtml(r["Date Raised"])}</td>
        <td>${escapeHtml(r["Recurrence Of"])}</td>
        <td>${escapeHtml(r["Occurrence"])}</td>
        <td>${escapeHtml(r["Root Cause"])}</td>
        <td>${escapeHtml(r["Corrective Action"])}</td>
      </tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>NC / CAPA Register</title>
      <style>
        body { font-family: -apple-system, system-ui, sans-serif; padding: 32px; color: #0F2A3D; }
        h1 { font-size: 18px; margin-bottom: 2px; }
        p.meta { color: #6B7A78; font-size: 12px; margin-top: 0; }
        p.summary { font-size: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #D8E5E1; padding: 6px 10px; font-size: 11px; text-align: left; }
        th { background: #0F2A3D; color: white; }
        tr:nth-child(even) td { background: #F6FAF9; }
      </style></head>
      <body>
        <h1>NC / CAPA Register</h1>
        <p class="meta">Lab QMS \u2014 generated ${escapeHtml(new Date().toLocaleString())}</p>
        <p class="summary"><strong>${rows.length}</strong> nonconformit${rows.length === 1 ? "y" : "ies"} included \u2014 <strong>${recurrenceCount}</strong> marked as a recurrence of an earlier NC.</p>
        <table>
          <thead><tr><th>NC Number</th><th>Title</th><th>Status</th><th>Severity</th><th>Date Raised</th><th>Recurrence Of</th><th>Occurrence</th><th>Root Cause</th><th>Corrective Action</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold" style={{ color: COLORS.navy }}>Non-conformities & CAPA</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowTrends(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
            <Activity size={14} /> {showTrends ? "Hide" : "Show"} trends
          </button>
          <button onClick={() => { setShowNcReportPicker(v => !v); setSelectedNcReportIds(ncs.map(n => n.id)); }}
            className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
            <Download size={14} /> Export report
          </button>
          {canEdit && (
            <button onClick={() => setShowForm(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md text-white" style={{ background: COLORS.teal }}>
              <Plus size={14} /> Log nonconformity
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-4">Full lifecycle: raise, investigate root cause, implement corrective/preventive action, verify, and close.</p>

      {showNcReportPicker && (
        <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
          <div className="text-sm font-semibold mb-2" style={{ color: COLORS.navy }}>Choose which NCs to include</div>
          <div className="flex gap-3 mb-2 text-xs">
            <button onClick={() => setSelectedNcReportIds(ncs.map(n => n.id))} className="underline" style={{ color: COLORS.teal }}>Select all</button>
            <button onClick={() => setSelectedNcReportIds([])} className="underline text-gray-400">Clear</button>
          </div>
          <div className="space-y-1 mb-4 max-h-52 overflow-y-auto">
            {ncs.length === 0 && <div className="text-xs text-gray-400">No nonconformities logged yet.</div>}
            {ncs.map(n => (
              <label key={n.id} className="flex items-center gap-2 text-sm py-0.5">
                <input type="checkbox" checked={selectedNcReportIds.includes(n.id)}
                  onChange={e => setSelectedNcReportIds(prev => e.target.checked ? [...prev, n.id] : prev.filter(id => id !== n.id))} />
                <span>{n.ncNumber} — {n.title}</span>
                {occurrenceInfo[n.id]?.totalOccurrences > 1 && <span className="text-xs" style={{ color: COLORS.amber }}>(occurrence {occurrenceInfo[n.id].occurrenceNumber} of {occurrenceInfo[n.id].totalOccurrences})</span>}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled={selectedNcReportIds.length === 0} onClick={() => downloadNcReportExcel(selectedNcReportIds)}
              className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md border disabled:opacity-40" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
              <Download size={14} /> Download Excel ({selectedNcReportIds.length} selected)
            </button>
            <button disabled={selectedNcReportIds.length === 0} onClick={() => printNcReport(selectedNcReportIds)}
              className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md border disabled:opacity-40" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
              <Download size={14} /> Print / Save as PDF ({selectedNcReportIds.length} selected)
            </button>
          </div>
        </div>
      )}

      {showTrends && (
        <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
          <div className="text-sm font-semibold mb-3" style={{ color: COLORS.navy }}>NCs raised per month</div>
          {trendData.length === 0 ? (
            <Empty text="Not enough data yet to show a trend." />
          ) : (
            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F1" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke={COLORS.teal} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: COLORS.navy }}>By source</div>
              {bySource.length === 0 ? <div className="text-xs text-gray-400">No data yet</div> : bySource.map(([source, count]) => (
                <div key={source} className="flex items-center justify-between text-xs text-gray-600 py-0.5">
                  <span>{source}</span><span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: COLORS.navy }}>By severity</div>
              {Object.entries(bySeverity).map(([sev, count]) => (
                <div key={sev} className="flex items-center justify-between text-xs text-gray-600 py-0.5">
                  <span>{sev}</span><span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showForm && canEdit && <NcForm personnel={personnel} existingNcs={ncs} onCancel={() => setShowForm(false)} onSave={addNc} />}

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
              {n.relatedNcId && <Badge color={COLORS.amber}>Recurrence</Badge>}
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
                  <Field label="Due time (optional)">
                    <input type="time" className={inputCls} style={inputStyle} value={n.dueTime || ""} onChange={e => setNc(n.id, { dueTime: e.target.value })} disabled={!n.dueDate} />
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
                  <Field label="Recurrence of (optional)">
                    <select className={inputCls} style={inputStyle} value={n.relatedNcId || ""} onChange={e => setNc(n.id, { relatedNcId: e.target.value })}>
                      <option value="">Not a recurrence of a previous NC</option>
                      {ncs.filter(other => other.id !== n.id).map(other => <option key={other.id} value={other.id}>{other.ncNumber} — {other.title}</option>)}
                    </select>
                    {n.relatedNcId && (() => {
                      const related = ncs.find(o => o.id === n.relatedNcId);
                      return related ? <div className="text-[11px] mt-1" style={{ color: COLORS.amber }}>Marked as a recurrence of {related.ncNumber} — worth checking whether the earlier corrective action actually held.</div> : null;
                    })()}
                  </Field>
                </div>

                <div className="mt-4 p-3 rounded-md" style={{ background: COLORS.mint }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-xs font-semibold" style={{ color: COLORS.navy }}>Effectiveness check</div>
                    {n.effectivenessCheckDue && !n.effectivenessCheckResult && n.effectivenessCheckDue < todayISO() && (
                      <Badge color={COLORS.red}>Overdue</Badge>
                    )}
                    {n.effectivenessCheckResult === "Effective" && <Badge color={COLORS.teal}>Effective</Badge>}
                    {n.effectivenessCheckResult === "Not effective" && <Badge color={COLORS.red}>Not effective</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 mb-2">A dated follow-up to confirm the corrective action actually worked — required by Clause 8.7, separate from just verifying the action was carried out.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Effectiveness check due">
                      <input type="date" className={inputCls} style={inputStyle} value={n.effectivenessCheckDue || ""} onChange={e => setNc(n.id, { effectivenessCheckDue: e.target.value })} />
                    </Field>
                    <Field label="Result">
                      <select className={inputCls} style={inputStyle} value={n.effectivenessCheckResult || ""} onChange={e => setNc(n.id, {
                        effectivenessCheckResult: e.target.value,
                        effectivenessVerifiedBy: e.target.value ? n.effectivenessVerifiedBy : "",
                        effectivenessVerifiedAt: e.target.value ? new Date().toISOString() : "",
                      })}>
                        <option value="">Not yet checked</option>
                        <option>Pending</option><option>Effective</option><option>Not effective</option>
                      </select>
                    </Field>
                    <Field label="Notes">
                      <textarea className={inputCls} style={inputStyle} rows={2} value={n.effectivenessNotes || ""} onChange={e => setNc(n.id, { effectivenessNotes: e.target.value })} placeholder="What was checked, and how" />
                    </Field>
                    <Field label="Verified by">
                      <select className={inputCls} style={inputStyle} value={n.effectivenessVerifiedBy || ""} onChange={e => setNc(n.id, { effectivenessVerifiedBy: e.target.value })}>
                        <option value="">Select…</option>{personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                    </Field>
                  </div>
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

const NC_STOPWORDS = new Set(["the", "a", "an", "of", "in", "on", "for", "to", "and", "or", "with", "was", "is", "were", "are", "not", "no", "at", "by", "from"]);
const ncTokenize = (s) => (s || "").toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !NC_STOPWORDS.has(w));
/** Deliberately simple keyword overlap, not real text similarity — a starting point that surfaces likely matches for a person to confirm, not an automatic classifier. */
const ncMatchScore = (draftTitle, draftClauseId, draftSource, candidate) => {
  const draftWords = new Set(ncTokenize(draftTitle));
  const candWords = ncTokenize(candidate.title);
  let overlap = 0;
  candWords.forEach(w => { if (draftWords.has(w)) overlap++; });
  let score = overlap * 2;
  if (draftClauseId && candidate.clauseId === draftClauseId) score += 1.5;
  if (draftSource && candidate.source === draftSource) score += 1;
  return score;
};

function NcForm({ personnel, existingNcs, onCancel, onSave }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clauseId, setClauseId] = useState("");
  const [severity, setSeverity] = useState("Minor");
  const [source, setSource] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [raisedBy, setRaisedBy] = useState("");
  const [relatedNcId, setRelatedNcId] = useState("");

  const suggestions = useMemo(() => {
    if (relatedNcId || !existingNcs?.length) return [];
    if (!title.trim() && !clauseId && !source) return [];
    return existingNcs
      .map(n => ({ n, score: ncMatchScore(title, clauseId, source, n) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ n }) => n);
  }, [title, clauseId, source, existingNcs, relatedNcId]);

  return (
    <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
      <Field label="Title"><input className={inputCls} style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Short summary of the nonconformity" /></Field>
      {relatedNcId ? (
        <div className="mb-3 flex items-center gap-2">
          <Badge color={COLORS.teal}>Linked as a recurrence of {existingNcs.find(n => n.id === relatedNcId)?.ncNumber}</Badge>
          <button onClick={() => setRelatedNcId("")} className="text-xs text-gray-400 underline">Unlink</button>
        </div>
      ) : suggestions.length > 0 && (
        <div className="mb-3 p-2 rounded-md text-xs" style={{ background: COLORS.mint }}>
          <div className="font-medium mb-1" style={{ color: COLORS.navy }}>This looks similar to past NC(s) — worth linking as a recurrence?</div>
          {suggestions.map(n => (
            <div key={n.id} className="flex items-center justify-between py-0.5">
              <span className="text-gray-600">{n.ncNumber} — {n.title} ({n.dateRaised || "no date"})</span>
              <button onClick={() => setRelatedNcId(n.id)} className="text-xs px-2 py-0.5 rounded-md border shrink-0 ml-2" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>Link</button>
            </div>
          ))}
        </div>
      )}
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
        <Field label="Due time (optional)"><input type="time" className={inputCls} style={inputStyle} value={dueTime} onChange={e => setDueTime(e.target.value)} disabled={!dueDate} /></Field>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 text-gray-500">Cancel</button>
        <button onClick={() => title.trim() && onSave({ title, description, clauseId, severity, source, assignedTo, dueDate, dueTime: dueDate ? dueTime : "", raisedBy, relatedNcId })}
          className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1" style={{ background: COLORS.teal }}><Save size={14} /> Log nonconformity</button>
      </div>
    </div>
  );
}

// ---------------- Personnel ----------------
function Personnel({ personnel, setPersonnel, updatePersonnel, currentUser, isAdmin, canEdit, laboratories, personnelLaboratories, assignPersonnelToLabAction, unassignPersonnelFromLabAction }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [recordCardNumber, setRecordCardNumber] = useState("");
  const [password, setPassword] = useState("");
  const [accessRole, setAccessRole] = useState("Technologist");
  const [newStaffLabId, setNewStaffLabId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [rowDrafts, setRowDrafts] = useState({}); // { [personnelId]: { role?, email?, recordCardNumber?, accessRole? } } — only fields with a pending, unsaved edit
  const [savingRow, setSavingRow] = useState(null);

  const editRow = (id, patch) => setRowDrafts(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const valueFor = (p, field) => rowDrafts[p.id]?.[field] !== undefined ? rowDrafts[p.id][field] : (p[field] ?? "");
  const saveRow = async (p) => {
    const draft = rowDrafts[p.id];
    if (!draft) return;
    setSavingRow(p.id);
    try {
      await updatePersonnel(personnel.map(x => x.id === p.id ? { ...x, ...draft } : x));
      setRowDrafts(prev => { const next = { ...prev }; delete next[p.id]; return next; });
    } finally {
      setSavingRow(null);
    }
  };

  const addPerson = async () => {
    if (!name.trim() || !recordCardNumber.trim() || password.length < 6) {
      setCreateError("Name, record card number, and a password of at least 6 characters are required.");
      return;
    }
    if (!newStaffLabId) {
      setCreateError("Select a primary laboratory for this staff member.");
      return;
    }
    setCreating(true); setCreateError("");
    try {
      const created = await adminCreateStaff({ name, jobTitle: role, email, recordCardNumber, password, accessRole, laboratoryId: newStaffLabId });
      setPersonnel([...personnel, personnelFromDb(created)]);
      setName(""); setRole(""); setEmail(""); setRecordCardNumber(""); setPassword(""); setAccessRole("Technologist");
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };
  const removePerson = (id) => updatePersonnel(personnel.filter(p => p.id !== id));

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
      const labName = cellGet(row, "Laboratory", "laboratory");
      const common = {
        name: rName,
        role: cellGet(row, "Role", "role"),
        email: cellGet(row, "Email", "email"),
        recordCardNumber: cellGet(row, "Record Card Number", "RecordCardNumber", "recordCardNumber"),
        accessRole: cellGet(row, "Access Role", "AccessRole", "accessRole") || "Technologist",
      };
      if (id && existingById[id]) toUpdate.push({ ...existingById[id], ...common });
      else toCreate.push({ ...common, password: cellGet(row, "Password", "password"), laboratoryId: laboratories.find(l => l.name === labName)?.id || "" });
    });

    let created = 0, failed = [];
    for (const draft of toCreate) {
      if (!draft.password || draft.password.length < 6) { failed.push(`${draft.name} (no valid password)`); continue; }
      if (!draft.laboratoryId) { failed.push(`${draft.name} (Laboratory column missing or doesn't match an existing lab name)`); continue; }
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
        templateRows={personnel.map(p => ({ ID: p.id, Name: p.name, Role: p.role, Email: p.email, "Record Card Number": p.recordCardNumber, Password: p.password, "Access Role": p.accessRole, Laboratory: laboratories.find(l => l.id === p.laboratoryId)?.name || "" }))}
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
            <Field label="Primary laboratory">
              <select className={inputCls} style={inputStyle} value={newStaffLabId} onChange={e => setNewStaffLabId(e.target.value)}>
                <option value="">Select a laboratory…</option>
                {laboratories.map(lab => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
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
          <div key={p.id} className="flex items-start gap-3 px-5 py-3 flex-wrap">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-white shrink-0" style={{ background: COLORS.teal }}>
              {p.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-[140px]">
              <div className="text-sm">{p.name}{p.id === currentUser?.id ? <span className="text-xs text-gray-400"> (you)</span> : ""}</div>
              {isAdmin ? (
                <div className="flex gap-2 mt-1 flex-wrap">
                  <input value={valueFor(p, "role")} onChange={e => editRow(p.id, { role: e.target.value })}
                    placeholder="Job title" className="text-xs border rounded-md px-2 py-1 w-36" style={{ borderColor: "#D8E5E1" }} />
                  <input value={valueFor(p, "email")} onChange={e => editRow(p.id, { email: e.target.value })}
                    placeholder="Email" className="text-xs border rounded-md px-2 py-1 w-48" style={{ borderColor: "#D8E5E1" }} />
                </div>
              ) : (
                <div className="text-xs text-gray-400">{p.role || "No role set"}{p.email ? ` · ${p.email}` : ""}</div>
              )}
              {isAdmin && (
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <input value={valueFor(p, "recordCardNumber")} onChange={e => editRow(p.id, { recordCardNumber: e.target.value })}
                    placeholder="Record card #" className="text-xs border rounded-md px-2 py-1 w-28" style={{ borderColor: "#D8E5E1" }} />
                  <select value={valueFor(p, "accessRole") || "Technologist"} onChange={e => editRow(p.id, { accessRole: e.target.value })} className="text-xs border rounded-md px-2 py-1" style={{ borderColor: "#D8E5E1" }}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                  <select value={valueFor(p, "laboratoryId") || ""} onChange={e => editRow(p.id, { laboratoryId: e.target.value })}
                    className="text-xs border rounded-md px-2 py-1" style={{ borderColor: "#D8E5E1" }} title="Primary laboratory">
                    <option value="">No primary lab</option>
                    {laboratories.map(lab => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
                  </select>
                  {rowDrafts[p.id] && (
                    <button onClick={() => saveRow(p)} disabled={savingRow === p.id}
                      className="text-xs px-2 py-1 rounded-md text-white disabled:opacity-50 whitespace-nowrap" style={{ background: COLORS.teal }}>
                      {savingRow === p.id ? "Saving…" : "Save"}
                    </button>
                  )}
                  <ResetPasswordControl personnelId={p.id} />
                  <button onClick={() => removePerson(p.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
            {!isAdmin && (
              <>
                <span className="text-xs text-gray-400">{p.recordCardNumber || "no card #"}</span>
                <Badge color={COLORS.teal}>{p.accessRole || "Technologist"}</Badge>
              </>
            )}
            {isAdmin && laboratories.length > 0 && (
              <div className="w-full flex items-center gap-2 flex-wrap pl-12">
                {personnelLaboratories.filter(pl => pl.personnelId === p.id).map(pl => {
                  const lab = laboratories.find(l => l.id === pl.laboratoryId);
                  if (!lab) return null;
                  return (
                    <span key={pl.id} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: COLORS.mint, color: COLORS.teal }}>
                      {lab.name}
                      <button onClick={() => unassignPersonnelFromLabAction(pl.id)} className="hover:text-red-500">×</button>
                    </span>
                  );
                })}
                <select value="" onChange={e => e.target.value && assignPersonnelToLabAction(p.id, e.target.value)}
                  className="text-xs border rounded-md px-1.5 py-0.5" style={{ borderColor: "#D8E5E1" }}>
                  <option value="">+ Assign lab…</option>
                  {laboratories.filter(lab => !personnelLaboratories.some(pl => pl.personnelId === p.id && pl.laboratoryId === lab.id)).map(lab => (
                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                  ))}
                </select>
              </div>
            )}
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
// ---------------- Risk Register (Clause 5.6) ----------------
const RISK_LEVEL_COLOR = { Critical: COLORS.red, High: COLORS.red, Medium: COLORS.amber, Low: COLORS.teal };
const RISK_CATEGORIES = ["Pre-examination", "Examination", "Post-examination", "IT / Data", "Facilities", "Personnel", "Equipment", "Supply chain", "Other"];

function RiskRegister({ risks, updateRisks, personnel, canEdit, activeLaboratoryId }) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");

  const addRisk = (draft) => {
    updateRisks([{ id: uid(), status: "Open", identifiedDate: todayISO(), mitigation: "", laboratoryId: activeLaboratoryId, ...draft }, ...risks]);
    setShowForm(false);
  };
  const setRisk = (id, patch) => updateRisks(risks.map(r => r.id === id ? { ...r, ...patch } : r));
  const removeRisk = (id) => updateRisks(risks.filter(r => r.id !== id));

  const filtered = risks.filter(r => filterStatus === "All" || r.status === filterStatus)
    .sort((a, b) => {
      const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (order[a.riskLevel] ?? 9) - (order[b.riskLevel] ?? 9);
    });

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold" style={{ color: COLORS.navy }}>Risk register</h1>
        {canEdit && (
          <button onClick={() => setShowForm(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md text-white" style={{ background: COLORS.teal }}>
            <Plus size={14} /> Identify a risk
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">Risks to laboratory operations, tracked proactively — before they become a Non-conformity, not after. Risk level is calculated automatically from likelihood \u00d7 impact.</p>

      <div className="flex gap-2 mb-4">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
          <option>All</option><option>Open</option><option>Mitigating</option><option>Monitoring</option><option>Closed</option>
        </select>
      </div>

      {showForm && canEdit && <RiskForm personnel={personnel} onCancel={() => setShowForm(false)} onSave={addRisk} />}

      <div className="space-y-3">
        {filtered.length === 0 && <Empty text="No risks logged yet." />}
        {filtered.map(r => (
          <div key={r.id} className="bg-white rounded-lg border" style={{ borderColor: "#E1EBE8" }}>
            <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="w-full flex items-center gap-3 px-5 py-3 text-left">
              {expanded === r.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span className="text-sm flex-1 truncate">{r.title}</span>
              {r.category && <span className="text-xs text-gray-400">{r.category}</span>}
              <Badge color={RISK_LEVEL_COLOR[r.riskLevel] || "#9AA5A3"}>{r.riskLevel}</Badge>
              <Badge color={r.status === "Closed" ? COLORS.teal : "#9AA5A3"}>{r.status}</Badge>
            </button>
            {expanded === r.id && (
              <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: "#EEF3F1" }}>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Field label="Description">
                    <textarea className={inputCls} style={inputStyle} rows={2} value={r.description || ""} onChange={e => setRisk(r.id, { description: e.target.value })} />
                  </Field>
                  <Field label="Category">
                    <select className={inputCls} style={inputStyle} value={r.category || ""} onChange={e => setRisk(r.id, { category: e.target.value })}>
                      <option value="">Select…</option>{RISK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Likelihood">
                    <select className={inputCls} style={inputStyle} value={r.likelihood} onChange={e => setRisk(r.id, { likelihood: e.target.value })}>
                      <option>Low</option><option>Medium</option><option>High</option>
                    </select>
                  </Field>
                  <Field label="Impact">
                    <select className={inputCls} style={inputStyle} value={r.impact} onChange={e => setRisk(r.id, { impact: e.target.value })}>
                      <option>Low</option><option>Medium</option><option>High</option>
                    </select>
                  </Field>
                  <Field label="Owner">
                    <select className={inputCls} style={inputStyle} value={r.owner || ""} onChange={e => setRisk(r.id, { owner: e.target.value })}>
                      <option value="">Unassigned</option>{personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Status">
                    <select className={inputCls} style={inputStyle} value={r.status} onChange={e => setRisk(r.id, { status: e.target.value })}>
                      <option>Open</option><option>Mitigating</option><option>Monitoring</option><option>Closed</option>
                    </select>
                  </Field>
                  <Field label="Mitigation / controls in place">
                    <textarea className={inputCls} style={inputStyle} rows={2} value={r.mitigation || ""} onChange={e => setRisk(r.id, { mitigation: e.target.value })} />
                  </Field>
                  <Field label="Related clause (optional)">
                    <select className={inputCls} style={inputStyle} value={r.clauseId || ""} onChange={e => setRisk(r.id, { clauseId: e.target.value })}>
                      <option value="">None</option>{ALL_SUBCLAUSES.map(s => <option key={s.id} value={s.id}>{s.id} — {s.title}</option>)}
                    </select>
                  </Field>
                  <Field label="Last reviewed">
                    <input type="date" className={inputCls} style={inputStyle} value={r.lastReviewed || ""} onChange={e => setRisk(r.id, { lastReviewed: e.target.value })} />
                  </Field>
                  <Field label="Next review date">
                    <input type="date" className={inputCls} style={inputStyle} value={r.nextReviewDate || ""} onChange={e => setRisk(r.id, { nextReviewDate: e.target.value })} />
                  </Field>
                </div>
                {canEdit && (
                  <div className="flex justify-end mt-2">
                    <button onClick={() => removeRisk(r.id)} className="text-xs text-red-400 flex items-center gap-1"><Trash2 size={12} /> Delete record</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskForm({ personnel, onSave, onCancel }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [likelihood, setLikelihood] = useState("Medium");
  const [impact, setImpact] = useState("Medium");
  const [owner, setOwner] = useState("");
  const [clauseId, setClauseId] = useState("");

  return (
    <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
      <Field label="Risk"><input className={inputCls} style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Single point of failure — only one trained CBC analyser operator on night shift" /></Field>
      <Field label="Description"><textarea className={inputCls} style={inputStyle} rows={2} value={description} onChange={e => setDescription(e.target.value)} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Category">
          <select className={inputCls} style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Select…</option>{RISK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Likelihood">
          <select className={inputCls} style={inputStyle} value={likelihood} onChange={e => setLikelihood(e.target.value)}>
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
        </Field>
        <Field label="Impact">
          <select className={inputCls} style={inputStyle} value={impact} onChange={e => setImpact(e.target.value)}>
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
        </Field>
        <Field label="Owner">
          <select className={inputCls} style={inputStyle} value={owner} onChange={e => setOwner(e.target.value)}>
            <option value="">Unassigned</option>{personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Related clause (optional)">
          <select className={inputCls} style={inputStyle} value={clauseId} onChange={e => setClauseId(e.target.value)}>
            <option value="">None</option>{ALL_SUBCLAUSES.map(s => <option key={s.id} value={s.id}>{s.id} — {s.title}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 text-gray-500">Cancel</button>
        <button onClick={() => title.trim() && onSave({ title, description, category, likelihood, impact, owner, clauseId })}
          className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1" style={{ background: COLORS.teal }}><Save size={14} /> Save risk</button>
      </div>
    </div>
  );
}

function Competency({ competency, updateCompetency, personnel, canEdit, currentUser, confirmCompetencyAssessmentAction, activeLaboratoryId }) {
  const [showForm, setShowForm] = useState(false);
  const [filterPerson, setFilterPerson] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [view, setView] = useState("list");

  const addRecord = (draft) => {
    updateCompetency([{ id: uid(), createdAt: todayISO(), laboratoryId: activeLaboratoryId, ...draft }, ...competency]);
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

  const procedures = useMemo(() => [...new Set(competency.map(c => c.title).filter(Boolean))].sort(), [competency]);
  const matrix = useMemo(() => {
    // For each person x procedure, keep only their MOST RECENT record (by date), since that's what's actually current.
    const latest = {};
    competency.forEach(c => {
      const key = `${c.personnelName}||${c.title}`;
      if (!latest[key] || (c.date || "") > (latest[key].date || "")) latest[key] = c;
    });
    return latest;
  }, [competency]);

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold" style={{ color: COLORS.navy }}>Staff competency & training</h1>
        <div className="flex gap-2">
          <div className="flex gap-1 border rounded-md p-0.5" style={{ borderColor: "#D8E5E1" }}>
            <button onClick={() => setView("list")} className="text-xs px-2 py-1 rounded" style={{ background: view === "list" ? COLORS.mint : "transparent", color: view === "list" ? COLORS.teal : "#9AA5A3" }}>List</button>
            <button onClick={() => setView("matrix")} className="text-xs px-2 py-1 rounded" style={{ background: view === "matrix" ? COLORS.mint : "transparent", color: view === "matrix" ? COLORS.teal : "#9AA5A3" }}>Matrix</button>
          </div>
          {canEdit && view === "list" && (
            <button onClick={() => setShowForm(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md text-white" style={{ background: COLORS.teal }}>
              <Plus size={14} /> Log record
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-4">Training, induction, and competency assessment records supporting ISO 15189:2022 Clause 6.1 (Personnel).</p>

      {view === "matrix" ? (
        procedures.length === 0 ? <Empty text="No competency records yet — matrix will populate once records exist." /> : (
          <div className="bg-white rounded-lg border overflow-x-auto" style={{ borderColor: "#E1EBE8" }}>
            <table className="text-xs w-full">
              <thead>
                <tr style={{ background: COLORS.navy }}>
                  <th className="text-left px-3 py-2 text-white sticky left-0" style={{ background: COLORS.navy }}>Staff</th>
                  {procedures.map(p => <th key={p} className="text-left px-3 py-2 text-white whitespace-nowrap">{p}</th>)}
                </tr>
              </thead>
              <tbody>
                {personnel.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 ? COLORS.bg : "white" }}>
                    <td className="px-3 py-2 font-medium whitespace-nowrap sticky left-0" style={{ background: i % 2 ? COLORS.bg : "white", color: COLORS.navy }}>{p.name}</td>
                    {procedures.map(proc => {
                      const rec = matrix[`${p.name}||${proc}`];
                      if (!rec) return <td key={proc} className="px-3 py-2 text-gray-300">— never assessed</td>;
                      const s = statusOf(rec);
                      return <td key={proc} className="px-3 py-2"><Badge color={s.color}>{s.label}{rec.dueDate ? ` · ${rec.dueDate}` : ""}</Badge></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
      <>
      <div className="flex gap-2 mb-4">
        <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
          <option>All</option>{personnel.map(p => <option key={p.id}>{p.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
          <option>All</option>{COMPETENCY_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {showForm && canEdit && <CompetencyForm personnel={personnel} existingTitles={procedures} onCancel={() => setShowForm(false)} onSave={addRecord} />}

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
              <div className="pl-7 mt-1.5 flex items-center gap-2">
                {c.assesseeConfirmed ? (
                  <Badge color={COLORS.teal}>Confirmed by {c.personnelName} · {(c.assesseeConfirmedAt || "").slice(0, 10)}</Badge>
                ) : currentUser.name === c.personnelName ? (
                  <button onClick={() => confirmCompetencyAssessmentAction(c.id)} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
                    This is accurate — confirm
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">Awaiting {c.personnelName}'s confirmation</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </>
      )}
    </div>
  );
}

function CompetencyForm({ personnel, existingTitles, onSave, onCancel }) {
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
      <Field label="Title / procedure assessed">
        <input className={inputCls} style={inputStyle} value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Manual differential counting, Medonic M51 operation" list="competency-title-suggestions" />
        <datalist id="competency-title-suggestions">{existingTitles.map(t => <option key={t} value={t} />)}</datalist>
        <div className="text-[11px] text-gray-400 mt-1">Pick an existing procedure from the list where possible — matching titles exactly is what lets the Matrix view group everyone's competency for the same procedure together.</div>
      </Field>
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
function Equipment({ equipment, updateEquipment, equipmentRecords, updateEquipmentRecords, personnel, canEdit, equipmentDowntime, reportDowntimeAction, resolveDowntimeAction, qcMachines, qcParameters, qcControls, qcRuns, activeLaboratoryId }) {
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [recordDraftFor, setRecordDraftFor] = useState(null);
  const [downtimeReasonDraft, setDowntimeReasonDraft] = useState({});
  const [resolveNotesDraft, setResolveNotesDraft] = useState({});
  const [showDowntimeFormFor, setShowDowntimeFormFor] = useState(null);

  const addEquipment = (draft) => {
    updateEquipment([{ id: uid(), status: "In service", laboratoryId: activeLaboratoryId, ...draft }, ...equipment]);
    setShowEquipForm(false);
  };
  const setEquip = (id, patch) => updateEquipment(equipment.map(e => e.id === id ? { ...e, ...patch } : e));
  const removeEquipment = (id) => {
    updateEquipment(equipment.filter(e => e.id !== id));
    updateEquipmentRecords(equipmentRecords.filter(r => r.equipmentId !== id));
  };

  const addRecord = (equipmentId, draft) => {
    updateEquipmentRecords([{ id: uid(), equipmentId, createdAt: todayISO(), laboratoryId: activeLaboratoryId, ...draft }, ...equipmentRecords]);
    setRecordDraftFor(null);
  };
  const removeRecord = (id) => updateEquipmentRecords(equipmentRecords.filter(r => r.id !== id));

  const recordsFor = (equipmentId) => equipmentRecords.filter(r => r.equipmentId === equipmentId)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const downtimeFor = (equipmentId) => equipmentDowntime.filter(d => d.equipmentId === equipmentId)
    .sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""));

  /** Recorded authorization status over the last 30 days for the linked machine — a snapshot, not a live Westgard re-check (same honest framing as the IQC summary report). */
  const iqcHealthForMachine = (machineId) => {
    if (!machineId) return null;
    const paramIds = new Set(qcParameters.filter(p => p.machineId === machineId).map(p => p.id));
    const controlIds = new Set(qcControls.filter(c => paramIds.has(c.parameterId)).map(c => c.id));
    const cutoff = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); })();
    const recentRuns = qcRuns.filter(r => controlIds.has(r.controlId) && r.date >= cutoff);
    return {
      totalRuns: recentRuns.length,
      unauthorized: recentRuns.filter(r => !r.authorized).length,
    };
  };

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
      else next.push({ id: uid(), laboratoryId: activeLaboratoryId, ...rec });
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

                  <div className="mb-3">
                    <Field label="Linked IQC machine (optional)">
                      <select className={inputCls} style={{ ...inputStyle, maxWidth: 320 }} value={eq.qcMachineId || ""} onChange={e => setEquip(eq.id, { qcMachineId: e.target.value })}>
                        <option value="">Not linked to an IQC machine</option>
                        {qcMachines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.discipline})</option>)}
                      </select>
                    </Field>
                    {eq.qcMachineId && (() => {
                      const health = iqcHealthForMachine(eq.qcMachineId);
                      if (!health || health.totalRuns === 0) return <div className="text-xs text-gray-400 mt-1">No IQC runs recorded for this machine in the last 30 days.</div>;
                      return (
                        <div className="text-xs mt-1 flex items-center gap-2">
                          <Badge color={health.unauthorized > 0 ? COLORS.amber : COLORS.teal}>
                            {health.totalRuns} IQC run{health.totalRuns !== 1 ? "s" : ""} in last 30 days
                          </Badge>
                          {health.unauthorized > 0 && <span className="text-gray-500">{health.unauthorized} not yet authorized</span>}
                        </div>
                      );
                    })()}
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
                            <div className="text-xs">{r.date} · {r.performedByExternal || r.performedBy || "unassigned"}{r.performedByExternal ? " (external)" : ""}{r.documentRef ? ` · Ref: ${r.documentRef}` : ""}</div>
                            {r.notes && <div className="text-xs text-gray-400">{r.notes}</div>}
                            {(r.url || r.storagePath) && <DocumentLink title="View evidence" url={r.url} storagePath={r.storagePath} className="text-xs underline" />}
                          </div>
                          {r.result && <Badge color={r.result === "Fail" ? COLORS.red : r.result === "Conditional pass" ? COLORS.amber : COLORS.teal}>{r.result}</Badge>}
                          {rds && <Badge color={rds.color}>{rds.label === "OK" ? `Due ${r.dueDate}` : `${rds.label} ${r.dueDate}`}</Badge>}
                          <button onClick={() => removeRecord(r.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between mb-2 mt-4">
                    <div className="text-xs font-medium" style={{ color: COLORS.navy }}>Downtime / service tickets</div>
                    {canEdit && (
                      <button onClick={() => setShowDowntimeFormFor(showDowntimeFormFor === eq.id ? null : eq.id)} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border" style={{ borderColor: COLORS.red, color: COLORS.red }}>
                        <Plus size={12} /> Report downtime
                      </button>
                    )}
                  </div>
                  {showDowntimeFormFor === eq.id && (
                    <div className="border rounded-md p-3 mb-2" style={{ borderColor: "#EEF3F1" }}>
                      <Field label="Reason">
                        <input className={inputCls} style={inputStyle} value={downtimeReasonDraft[eq.id] || ""}
                          onChange={e => setDowntimeReasonDraft(prev => ({ ...prev, [eq.id]: e.target.value }))}
                          placeholder="e.g. Reagent probe fault — technician called" />
                      </Field>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowDowntimeFormFor(null)} className="text-xs px-2 py-1 text-gray-500">Cancel</button>
                        <button onClick={() => {
                          const reason = (downtimeReasonDraft[eq.id] || "").trim();
                          if (!reason) return;
                          reportDowntimeAction(eq.id, reason);
                          setDowntimeReasonDraft(prev => ({ ...prev, [eq.id]: "" }));
                          setShowDowntimeFormFor(null);
                        }} className="text-xs px-3 py-1 rounded-md text-white" style={{ background: COLORS.red }}>Confirm out of service</button>
                      </div>
                    </div>
                  )}
                  <div className="border rounded-md divide-y" style={{ borderColor: "#EEF3F1" }}>
                    {downtimeFor(eq.id).length === 0 && <div className="text-xs text-gray-400 px-3 py-3">No downtime recorded — equipment has been continuously in service.</div>}
                    {downtimeFor(eq.id).map(d => (
                      <div key={d.id} className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          <Badge color={d.resolvedAt ? COLORS.teal : COLORS.red}>{d.resolvedAt ? "Resolved" : "Out of service"}</Badge>
                          <div className="flex-1 text-xs">
                            {d.reason} — started {(d.startedAt || "").slice(0, 16).replace("T", " ")}{d.resolvedAt ? `, resolved ${(d.resolvedAt || "").slice(0, 16).replace("T", " ")}` : ""}
                            {d.reportedBy ? ` · reported by ${d.reportedBy}` : ""}
                          </div>
                        </div>
                        {d.resolutionNotes && <div className="text-xs text-gray-400 pl-0 mt-1">Resolution: {d.resolutionNotes}</div>}
                        {!d.resolvedAt && canEdit && (
                          <div className="flex items-center gap-2 mt-2">
                            <input className={inputCls} style={{ ...inputStyle, fontSize: 12, padding: "4px 8px" }} placeholder="Resolution notes (optional)"
                              value={resolveNotesDraft[d.id] || ""} onChange={e => setResolveNotesDraft(prev => ({ ...prev, [d.id]: e.target.value }))} />
                            <button onClick={() => resolveDowntimeAction(d.id, eq.id, resolveNotesDraft[d.id] || "")}
                              className="text-xs px-2 py-1 rounded-md text-white whitespace-nowrap" style={{ background: COLORS.teal }}>Mark resolved</button>
                          </div>
                        )}
                      </div>
                    ))}
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
  const [performedByExternal, setPerformedByExternal] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [result, setResult] = useState("");
  const [documentRef, setDocumentRef] = useState("");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState("upload"); // "upload" | "link" | "none"
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleSave = async () => {
    setUploadError("");
    setUploading(true);
    try {
      let storagePath = "";
      if (mode === "upload" && file) {
        storagePath = await storageApi.uploadDocumentFile(file, "equipment");
      }
      onSave({ type, date, performedBy, performedByExternal: performedByExternal.trim(), dueDate, result, documentRef, notes, url: mode === "link" ? url : "", storagePath });
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-3 p-3 rounded-md" style={{ background: COLORS.mint }}>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <select value={type} onChange={e => setType(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
          {EQUIPMENT_RECORD_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <div>
          <select value={performedByExternal ? "__external__" : performedBy}
            onChange={e => { if (e.target.value === "__external__") { setPerformedByExternal(" "); setPerformedBy(""); } else { setPerformedByExternal(""); setPerformedBy(e.target.value); } }}
            className="text-xs border rounded-md px-2 py-1.5 w-full" style={{ borderColor: "#D8E5E1" }}>
            <option value="">Performed by…</option>
            {personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            <option value="__external__">External / not in this system…</option>
          </select>
          {performedByExternal !== "" && (
            <input value={performedByExternal.trim() === "" ? "" : performedByExternal} onChange={e => setPerformedByExternal(e.target.value)}
              placeholder="e.g. John Smith — Ozelle Field Engineer" className="text-xs border rounded-md px-2 py-1.5 w-full mt-1" style={{ borderColor: "#D8E5E1" }} />
          )}
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }} title="Date performed" />
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }} title="Next due date" />
        <select value={result} onChange={e => setResult(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
          <option value="">Result…</option>{RECORD_RESULT.map(r => <option key={r}>{r}</option>)}
        </select>
        <input value={documentRef} onChange={e => setDocumentRef(e.target.value)} placeholder="Reference note (e.g. Certificate #1234)" className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }} />
      </div>
      <div className="mb-2">
        <div className="text-[11px] font-medium text-gray-500 mb-1">Evidence file (optional)</div>
        <div className="flex gap-2 mb-1.5">
          <button type="button" onClick={() => setMode("upload")} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: mode === "upload" ? COLORS.teal : "#D8E5E1", color: mode === "upload" ? COLORS.teal : "#9AA5A3", background: mode === "upload" ? "white" : "white" }}>Upload file</button>
          <button type="button" onClick={() => setMode("link")} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: mode === "link" ? COLORS.teal : "#D8E5E1", color: mode === "link" ? COLORS.teal : "#9AA5A3", background: "white" }}>Link instead</button>
          <button type="button" onClick={() => setMode("none")} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: mode === "none" ? COLORS.teal : "#D8E5E1", color: mode === "none" ? COLORS.teal : "#9AA5A3", background: "white" }}>None</button>
        </div>
        {mode === "upload" && <input type="file" onChange={e => setFile(e.target.files[0] || null)} className="text-xs" />}
        {mode === "link" && <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" className="text-xs border rounded-md px-2 py-1.5 w-full" style={{ borderColor: "#D8E5E1" }} />}
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes…" rows={2} className="w-full text-xs border rounded-md px-2 py-1.5 mb-2" style={{ borderColor: "#D8E5E1" }} />
      {uploadError && <div className="text-xs mb-2" style={{ color: COLORS.red }}>{uploadError}</div>}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs px-3 py-1 rounded-md text-gray-500">Cancel</button>
        <button disabled={uploading} onClick={handleSave}
          className="text-xs px-3 py-1 rounded-md text-white disabled:opacity-50" style={{ background: COLORS.teal }}>{uploading ? "Saving…" : "Save record"}</button>
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
function IQCPage({ qcMachines, updateQcMachines, qcParameters, updateQcParameters, qcControls, updateQcControls, qcRuns, updateQcRuns, personnel, canEdit, canAuthorizeIQC, currentUser, authorizeQcRunAction, bulkImportQcRuns, equipment, updateEquipment, activeLaboratoryId }) {
  const [showMachineForm, setShowMachineForm] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState(qcMachines[0]?.id || null);
  const [showParamForm, setShowParamForm] = useState(false);
  const [showDailyEntry, setShowDailyEntry] = useState(false);
  const [selectedParamId, setSelectedParamId] = useState(null);
  const [pointsToShow, setPointsToShowState] = useState(() => localStorage.getItem("lqms_iqc_points_to_show") || "20"); // "7" | "20" | "30" | "all"
  const setPointsToShow = (val) => { setPointsToShowState(val); localStorage.setItem("lqms_iqc_points_to_show", val); };
  const [showValuesTable, setShowValuesTable] = useState(false);
  const [controlFormFor, setControlFormFor] = useState(null);
  const [runFormFor, setRunFormFor] = useState(null);
  const [showIqcReportPicker, setShowIqcReportPicker] = useState(false);
  const [reportDateFrom, setReportDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); });
  const [reportDateTo, setReportDateTo] = useState(todayISO());
  const [reportMachineId, setReportMachineId] = useState("All");

  useEffect(() => {
    if (!selectedMachineId && qcMachines.length) setSelectedMachineId(qcMachines[0].id);
  }, [qcMachines]);

  /**
   * If the form was used to pick an existing equipment record rather than
   * typing a brand-new machine, this links them together automatically —
   * using the REAL database-assigned id from the synced result, not the
   * temporary client-side id, same lesson learned from the earlier
   * NC-from-EQA bug (a temporary id never actually exists in the database).
   */
  const addMachine = async (draft) => {
    const { linkedEquipmentId, ...machineDraft } = draft;
    const syncedMachines = await updateQcMachines([{ id: uid(), laboratoryId: activeLaboratoryId, ...machineDraft }, ...qcMachines]);
    setShowMachineForm(false);
    if (!syncedMachines || !linkedEquipmentId) return;
    const createdMachine = syncedMachines.find(m => m.name === machineDraft.name);
    if (createdMachine) {
      updateEquipment(equipment.map(e => e.id === linkedEquipmentId ? { ...e, qcMachineId: createdMachine.id } : e));
    }
  };
  const removeMachine = (id) => {
    updateQcMachines(qcMachines.filter(m => m.id !== id));
    const paramIds = qcParameters.filter(p => p.machineId === id).map(p => p.id);
    updateQcParameters(qcParameters.filter(p => p.machineId !== id));
    const controlIds = qcControls.filter(c => paramIds.includes(c.parameterId)).map(c => c.id);
    updateQcControls(qcControls.filter(c => !paramIds.includes(c.parameterId)));
    updateQcRuns(qcRuns.filter(r => !controlIds.includes(r.controlId)));
    if (selectedMachineId === id) setSelectedMachineId(null);
  };

  const addParameter = (draft) => { updateQcParameters([{ id: uid(), machineId: selectedMachineId, laboratoryId: activeLaboratoryId, ...draft }, ...qcParameters]); setShowParamForm(false); };
  const removeParameter = (id) => {
    updateQcParameters(qcParameters.filter(p => p.id !== id));
    const controlIds = qcControls.filter(c => c.parameterId === id).map(c => c.id);
    updateQcControls(qcControls.filter(c => c.parameterId !== id));
    updateQcRuns(qcRuns.filter(r => !controlIds.includes(r.controlId)));
  };

  const addControl = (parameterId, draft) => { updateQcControls([{ id: uid(), parameterId, laboratoryId: activeLaboratoryId, ...draft }, ...qcControls]); setControlFormFor(null); };
  const removeControl = (id) => { updateQcControls(qcControls.filter(c => c.id !== id)); updateQcRuns(qcRuns.filter(r => r.controlId !== id)); };

  const addRun = (controlId, draft) => { updateQcRuns([{ id: uid(), controlId, authorized: false, laboratoryId: activeLaboratoryId, ...draft }, ...qcRuns]); setRunFormFor(null); };
  const addRunsBatch = (entries) => {
    const newRuns = entries.map(e => ({ id: uid(), controlId: e.controlId, authorized: false, laboratoryId: activeLaboratoryId, ...e.draft }));
    updateQcRuns([...newRuns, ...qcRuns]);
  };
  const removeRun = (id) => updateQcRuns(qcRuns.filter(r => r.id !== id));

  const machinesByDiscipline = DISCIPLINES.map(d => ({ discipline: d, machines: qcMachines.filter(m => m.discipline === d) }));
  const selectedMachine = qcMachines.find(m => m.id === selectedMachineId);
  const paramsForMachine = qcParameters.filter(p => p.machineId === selectedMachineId);

  const buildIqcReportRows = () => {
    return qcRuns
      .filter(r => r.date >= reportDateFrom && r.date <= reportDateTo)
      .map(r => {
        const control = qcControls.find(c => c.id === r.controlId);
        const param = control ? qcParameters.find(p => p.id === control.parameterId) : null;
        const machine = param ? qcMachines.find(m => m.id === param.machineId) : null;
        return { r, control, param, machine };
      })
      .filter(({ machine }) => reportMachineId === "All" || machine?.id === reportMachineId)
      .filter(({ machine, param }) => machine && param)
      .sort((a, b) => a.r.date.localeCompare(b.r.date))
      .map(({ r, control, param, machine }) => ({
        "Machine": machine.name,
        "Parameter": param.name,
        "Level": control?.level || "",
        "Lot": control?.lotNumber || "",
        "Date": r.date,
        "Value": r.value,
        "Authorized": r.authorized ? "Yes" : "No",
        "Authorized By": r.authorizedByName || "",
        "Operator": r.operator || "",
      }));
  };

  const downloadIqcReportExcel = () => {
    exportRowsToExcel(buildIqcReportRows(), "IQC Summary", `iqc-summary-${reportDateFrom}-to-${reportDateTo}.xlsx`);
  };

  const printIqcReport = () => {
    const rows = buildIqcReportRows();
    const unauthorizedCount = rows.filter(r => r["Authorized"] === "No").length;
    const w = window.open("", "_blank");
    if (!w) { alert("Please allow pop-ups for this site to print the report."); return; }
    const tableRows = rows.map(r => `
      <tr>
        <td>${escapeHtml(r["Machine"])}</td>
        <td>${escapeHtml(r["Parameter"])}</td>
        <td>${escapeHtml(r["Level"])}</td>
        <td>${escapeHtml(r["Date"])}</td>
        <td>${escapeHtml(r["Value"])}</td>
        <td>${escapeHtml(r["Authorized"])}</td>
        <td>${escapeHtml(r["Authorized By"])}</td>
      </tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>IQC Summary Report</title>
      <style>
        body { font-family: -apple-system, system-ui, sans-serif; padding: 32px; color: #0F2A3D; }
        h1 { font-size: 18px; margin-bottom: 2px; }
        p.meta { color: #6B7A78; font-size: 12px; margin-top: 0; margin-bottom: 8px; }
        p.summary { font-size: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #D8E5E1; padding: 6px 10px; font-size: 12px; text-align: left; }
        th { background: #0F2A3D; color: white; }
        tr:nth-child(even) td { background: #F6FAF9; }
      </style></head>
      <body>
        <h1>IQC Summary Report</h1>
        <p class="meta">Lab QMS \u2014 ${escapeHtml(reportDateFrom)} to ${escapeHtml(reportDateTo)} \u2014 generated ${escapeHtml(new Date().toLocaleString())}</p>
        <p class="summary"><strong>${rows.length}</strong> result(s) in this period \u2014 <strong>${unauthorizedCount}</strong> not yet authorized.</p>
        <table>
          <thead><tr><th>Machine</th><th>Parameter</th><th>Level</th><th>Date</th><th>Value</th><th>Authorized</th><th>Authorized By</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  /**
   * Prints exactly what's currently on screen for one parameter — same
   * point-count window as the "points to show" selector, so what you see
   * is what prints. Represented as a data table per level rather than a
   * chart image, consistent with every other report in this app.
   */
  const printParameterLJReport = (param, controls, perControlEvald, withR4sById) => {
    const w = window.open("", "_blank");
    if (!w) { alert("Please allow pop-ups for this site to print the report."); return; }
    const levelSections = controls.map(ctrl => {
      const evaldRuns = (perControlEvald[ctrl.id] || []).map(r => ({ ...r, ...withR4sById[r.id] }));
      const sliced = pointsToShow === "all" ? evaldRuns : evaldRuns.slice(-Number(pointsToShow));
      const rows = sliced.map(r => `
        <tr>
          <td>${escapeHtml(r.date)}${r.time ? " " + escapeHtml(r.time) : ""}</td>
          <td>${escapeHtml(r.value)}</td>
          <td>${escapeHtml(r.z.toFixed(2))}</td>
          <td>${r.violations.length ? r.violations.map(v => escapeHtml(RULE_LABEL[v] || v)).join(", ") : "In control"}</td>
          <td>${r.authorized ? "Yes" : "No"}</td>
        </tr>`).join("");
      return `
        <h2>${escapeHtml(ctrl.level)} \u2014 Lot ${escapeHtml(ctrl.lotNumber)} \u00b7 Mean ${escapeHtml(ctrl.mean)} \u00b7 SD ${escapeHtml(ctrl.sd)}</h2>
        <table>
          <thead><tr><th>Date</th><th>Value</th><th>Z-score</th><th>Violations</th><th>Authorized</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5">No results in this window.</td></tr>`}</tbody>
        </table>`;
    }).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(param.name)} \u2014 Levey-Jennings</title>
      <style>
        body { font-family: -apple-system, system-ui, sans-serif; padding: 32px; color: #0F2A3D; }
        h1 { font-size: 18px; margin-bottom: 2px; }
        h2 { font-size: 13px; margin: 20px 0 6px; }
        p.meta { color: #6B7A78; font-size: 12px; margin-top: 0; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th, td { border: 1px solid #D8E5E1; padding: 6px 10px; font-size: 12px; text-align: left; }
        th { background: #0F2A3D; color: white; }
        tr:nth-child(even) td { background: #F6FAF9; }
      </style></head>
      <body>
        <h1>${escapeHtml(param.name)} (${escapeHtml(param.unit || "")}) \u2014 Levey-Jennings</h1>
        <p class="meta">Lab QMS \u2014 showing ${pointsToShow === "all" ? "all points" : `last ${pointsToShow} points`} per level \u2014 generated ${escapeHtml(new Date().toLocaleString())}</p>
        ${levelSections}
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

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
      else next.push({ id: uid(), laboratoryId: activeLaboratoryId, ...rec });
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
          <div className="flex gap-2">
            <button onClick={() => setShowCsvImport(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
              <Upload size={14} /> Bulk import results (CSV)
            </button>
            <button onClick={() => setShowIqcReportPicker(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
              <Download size={14} /> Summary report
            </button>
            <button onClick={() => setShowMachineForm(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md text-white" style={{ background: COLORS.teal }}>
              <Plus size={14} /> Add machine
            </button>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">Internal quality control for Hematology, Biochemistry, and Immunochemistry analysers — Levey-Jennings charts with Westgard multirule evaluation and result authorization.</p>

      {showIqcReportPicker && canEdit && (
        <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
          <div className="text-sm font-semibold mb-2" style={{ color: COLORS.navy }}>IQC summary report</div>
          <p className="text-xs text-gray-500 mb-3">Lists recorded results and authorization status for the period — a record of what was run and signed off, not a live re-check of Westgard rules.</p>
          <div className="flex flex-wrap gap-3 items-end mb-3">
            <Field label="From"><input type="date" className={inputCls} style={{ ...inputStyle, maxWidth: 160 }} value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} /></Field>
            <Field label="To"><input type="date" className={inputCls} style={{ ...inputStyle, maxWidth: 160 }} value={reportDateTo} onChange={e => setReportDateTo(e.target.value)} /></Field>
            <Field label="Machine">
              <select className={inputCls} style={{ ...inputStyle, maxWidth: 220 }} value={reportMachineId} onChange={e => setReportMachineId(e.target.value)}>
                <option value="All">All machines</option>
                {qcMachines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadIqcReportExcel} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
              <Download size={14} /> Download Excel
            </button>
            <button onClick={printIqcReport} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
              <Download size={14} /> Print / Save as PDF
            </button>
          </div>
        </div>
      )}

      {showCsvImport && canEdit && (
        <IQCCsvImport
          qcMachines={qcMachines} qcParameters={qcParameters} qcControls={qcControls} personnel={personnel}
          onImport={bulkImportQcRuns} onClose={() => setShowCsvImport(false)} activeLaboratoryId={activeLaboratoryId}
        />
      )}

      <ImportExportBar
        label="analyser list"
        templateRows={qcMachines.map(m => ({ ID: m.id, Name: m.name, Discipline: m.discipline, Model: m.model }))}
        sheetName="Analysers" filenameBase="lab-analysers" onImportRows={handleImportMachines} canImport={canEdit}
      />
      <p className="text-xs text-gray-400 -mt-2 mb-4">Download, edit in Excel, then re-import — rows with a matching ID update that analyser; new rows (blank ID) are added. Discipline must be Hematology, Biochemistry, or Immunochemistry.</p>

      {showMachineForm && canEdit && <MachineForm onCancel={() => setShowMachineForm(false)} onSave={addMachine} equipment={equipment} />}

      {/* Machine tabs grouped by discipline */}
      <div className="mb-6 space-y-3">
        {machinesByDiscipline.map(group => group.machines.length > 0 && (
          <div key={group.discipline}>
            <div className="text-xs font-medium mb-1.5" style={{ color: DISCIPLINE_COLOR[group.discipline] }}>{group.discipline}</div>
            <div className="flex flex-wrap gap-2">
              {group.machines.map(m => (
                <button key={m.id} onClick={() => { setSelectedMachineId(m.id); setSelectedParamId(null); }}
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

          <div className="flex gap-4 items-start">
            {/* LEFT: parameter list */}
            <div className="w-60 shrink-0 space-y-1">
              {paramsForMachine.length === 0 && <Empty text="No parameters set up for this machine yet." />}
              {paramsForMachine.map(param => {
                const pControls = qcControls.filter(c => c.parameterId === param.id);
                const pAllRuns = [];
                pControls.forEach(ctrl => {
                  const runsAsc = qcRuns.filter(r => r.controlId === ctrl.id)
                    .map(r => ({ ...r, mean: ctrl.mean, sd: ctrl.sd }))
                    .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
                  pAllRuns.push(...evaluateControlSeries(runsAsc));
                });
                const pWithR4s = applyR4s(pAllRuns, pAllRuns);
                const pWithR4sById = Object.fromEntries(pWithR4s.map(r => [r.id, r]));
                const pOpenViolations = pWithR4s.filter(r => !r.authorized && r.violations.some(v => REJECT_RULES.includes(v))).length;
                const levelStatus = pControls.map(ctrl => {
                  const ctrlRuns = pAllRuns.filter(r => r.controlId === ctrl.id).map(r => pWithR4sById[r.id]);
                  if (ctrlRuns.length === 0) return { level: ctrl.level, color: "#D8E5E1" };
                  const hasReject = ctrlRuns.some(r => !r.authorized && r.violations.some(v => REJECT_RULES.includes(v)));
                  const hasWarn = ctrlRuns.some(r => !r.authorized && r.violations.includes("1_2s"));
                  return { level: ctrl.level, color: hasReject ? COLORS.red : hasWarn ? COLORS.amber : COLORS.teal };
                });
                const isSelected = selectedParamId === param.id;
                return (
                  <button key={param.id} onClick={() => setSelectedParamId(param.id)}
                    className="w-full text-left px-3 py-2 rounded-md text-sm"
                    style={{ background: isSelected ? COLORS.mint : "white", border: `1px solid ${isSelected ? COLORS.teal : "#E1EBE8"}`, color: isSelected ? COLORS.teal : COLORS.ink }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{param.name}</span>
                      {pOpenViolations > 0 && <Badge color={COLORS.red}>{pOpenViolations}</Badge>}
                    </div>
                    {levelStatus.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {levelStatus.map(ls => (
                          <span key={ls.level} title={ls.level} style={{ width: 7, height: 7, borderRadius: "50%", background: ls.color, display: "inline-block" }} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* RIGHT: detail panel for the selected parameter — all levels' charts at once */}
            <div className="flex-1 min-w-0">
              {(() => {
                const param = paramsForMachine.find(p => p.id === selectedParamId);
                if (!param) return <Empty text="Select a parameter on the left to view its Levey-Jennings charts." />;

                const controls = qcControls.filter(c => c.parameterId === param.id);
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
                const allParamRunsDesc = allRuns.map(r => withR4sById[r.id])
                  .sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
                const openViolations = allParamRunsDesc.filter(r => !r.authorized && r.violations.some(v => REJECT_RULES.includes(v))).length;

                return (
                  <div className="bg-white rounded-lg border p-4" style={{ borderColor: "#E1EBE8" }}>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: COLORS.navy }}>{param.name}</span>
                        <span className="text-xs text-gray-400">{param.unit}</span>
                        {openViolations > 0 && <Badge color={COLORS.red}><ShieldAlert size={11} className="inline -mt-0.5 mr-1" />{openViolations} unauthorized violation{openViolations !== 1 ? "s" : ""}</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={pointsToShow} onChange={e => setPointsToShow(e.target.value)} className="text-xs border rounded-md px-2 py-1" style={{ borderColor: "#D8E5E1" }}>
                          <option value="7">Last 7 points</option>
                          <option value="20">Last 20 points</option>
                          <option value="30">Last 30 points</option>
                          <option value="all">All points</option>
                        </select>
                        <button onClick={() => setShowValuesTable(v => !v)} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
                          {showValuesTable ? "Hide" : "Show"} values
                        </button>
                        <button onClick={() => printParameterLJReport(param, controls, perControlEvald, withR4sById)} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
                          Print
                        </button>
                      </div>
                    </div>

                    {controls.length === 0 && <div className="text-xs text-gray-400 py-4 text-center border rounded-md" style={{ borderColor: "#EEF3F1" }}>No control levels defined for this parameter yet.</div>}
                    {controls.map(ctrl => {
                      const evaldRuns = (perControlEvald[ctrl.id] || []).map(r => ({ ...r, ...withR4sById[r.id] }));
                      const sliced = pointsToShow === "all" ? evaldRuns : evaldRuns.slice(-Number(pointsToShow));
                      return (
                        <div key={ctrl.id} className="mb-4">
                          <div className="text-xs font-medium mb-1" style={{ color: COLORS.navy }}>{ctrl.level} — Lot {ctrl.lotNumber} · Mean {ctrl.mean} · SD {ctrl.sd}</div>
                          {sliced.length > 0 ? <LJChart runs={sliced} mean={ctrl.mean} sd={ctrl.sd} /> : (
                            <div className="text-xs text-gray-400 py-6 text-center border rounded-md" style={{ borderColor: "#EEF3F1" }}>No IQC results logged for this level yet.</div>
                          )}
                        </div>
                      );
                    })}

                    {showValuesTable && (
                      <div className="border rounded-md divide-y mb-4" style={{ borderColor: "#EEF3F1" }}>
                        {allParamRunsDesc.length === 0 && <div className="text-xs text-gray-400 px-3 py-3">No results logged yet.</div>}
                        {allParamRunsDesc.map(r => {
                          const ctrl = controls.find(c => c.id === r.controlId);
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
                    )}

                    <div className="pt-3 border-t" style={{ borderColor: "#EEF3F1" }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium" style={{ color: COLORS.navy }}>Control levels / lots</div>
                        {canEdit && (
                          <button onClick={() => setControlFormFor(controlFormFor === param.id ? null : param.id)} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
                            <Plus size={12} /> Add level
                          </button>
                        )}
                      </div>
                      {controlFormFor === param.id && canEdit && <ControlForm onCancel={() => setControlFormFor(null)} onSave={(draft) => addControl(param.id, draft)} />}
                      <div className="border rounded-md divide-y mb-3" style={{ borderColor: "#EEF3F1" }}>
                        {controls.length === 0 && <div className="text-xs text-gray-400 px-3 py-2">No control levels defined. Add one to start logging IQC.</div>}
                        {controls.map(c => (
                          <div key={c.id} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                            <span className="font-medium w-32">{c.level}</span>
                            <span className="text-gray-500 flex-1">Lot {c.lotNumber} · Mean {c.mean} · SD {c.sd}</span>
                            {c.expiryDate && (
                              <Badge color={c.expiryDate < todayISO() ? COLORS.red : (c.expiryDate <= daysFromNowISO(30) ? COLORS.amber : "#9AA5A3")}>
                                {c.expiryDate < todayISO() ? "Expired" : "Expires"} {c.expiryDate}
                              </Badge>
                            )}
                            {canEdit && <button onClick={() => removeControl(c.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>}
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium" style={{ color: COLORS.navy }}>Add a result</div>
                        {controls.length > 0 && canEdit && (
                          <button onClick={() => setRunFormFor(runFormFor === param.id ? null : param.id)} className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
                            <Plus size={12} /> Add IQC result
                          </button>
                        )}
                      </div>
                      {runFormFor === param.id && canEdit && <RunForm controls={controls} personnel={personnel} onCancel={() => setRunFormFor(null)} onSave={(controlId, draft) => addRun(controlId, draft)} />}
                    </div>

                    <div className="flex justify-end mt-3">
                      {canEdit && <button onClick={() => removeParameter(param.id)} className="text-xs text-red-400 flex items-center gap-1"><Trash2 size={12} /> Remove parameter</button>}
                    </div>
                  </div>
                );
              })()}
            </div>
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

// ---------------- Bulk CSV import for IQC results (any mix of parameters/machines) ----------------
function IQCCsvImport({ qcMachines, qcParameters, qcControls, personnel, onImport, onClose, activeLaboratoryId }) {
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [resultMsg, setResultMsg] = useState("");

  const downloadTemplate = () => {
    const headers = ["Machine", "Parameter", "Level", "Lot Number", "Date", "Time", "Value", "Operator", "Comment"];
    const sample = qcControls.slice(0, 3).map(c => {
      const param = qcParameters.find(p => p.id === c.parameterId);
      const machine = qcMachines.find(m => m.id === param?.machineId);
      return [machine?.name || "MachineName", param?.name || "ParameterName", c.level, c.lotNumber, todayISO(), "", "", "", ""];
    });
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [headers.map(escape).join(","), ...sample.map(r => r.map(escape).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "iqc-bulk-import-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setResultMsg("");
    try {
      const text = await file.text();
      const wb = XLSX.read(text, { type: "string" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const withStatus = parsed.map((row) => {
        const machineName = cellGet(row, "Machine", "machine");
        const paramName = cellGet(row, "Parameter", "parameter");
        const level = cellGet(row, "Level", "level");
        const lot = cellGet(row, "Lot Number", "LotNumber", "lot number", "lot");
        const date = cellGet(row, "Date", "date");
        const time = cellGet(row, "Time", "time");
        const value = cellGet(row, "Value", "value");
        const operator = cellGet(row, "Operator", "operator");
        const comment = cellGet(row, "Comment", "comment");

        const machine = qcMachines.find(m => m.name.trim().toLowerCase() === String(machineName).trim().toLowerCase());
        if (!machine) return { raw: row, status: "error", reason: `Machine "${machineName}" not found` };
        const param = qcParameters.find(p => p.machineId === machine.id && p.name.trim().toLowerCase() === String(paramName).trim().toLowerCase());
        if (!param) return { raw: row, status: "error", reason: `Parameter "${paramName}" not found under ${machine.name}` };
        const paramControls = qcControls.filter(c => c.parameterId === param.id);
        let control = lot ? paramControls.find(c => (c.lotNumber || "").trim().toLowerCase() === String(lot).trim().toLowerCase()) : null;
        if (!control && level) control = paramControls.find(c => c.level === String(level).trim());
        if (!control) return { raw: row, status: "error", reason: `No control level/lot match for ${param.name} (check Level or Lot Number)` };
        if (!date) return { raw: row, status: "error", reason: "Missing date" };
        if (value === "" || isNaN(parseFloat(value))) return { raw: row, status: "error", reason: "Missing or invalid value" };

        return {
          raw: row, status: "ok",
          machine: machine.name, parameter: param.name, level: control.level, lot: control.lotNumber,
          controlId: control.id, date: String(date), time: time || "", value: parseFloat(value),
          operator: operator || "", comment: comment || "",
        };
      });
      setRows(withStatus);
    } catch (err) {
      setResultMsg("Could not read that file — make sure it's a .csv file matching the template's columns.");
      setRows([]);
    }
    e.target.value = "";
  };

  const validRows = rows.filter(r => r.status === "ok");
  const errorRows = rows.filter(r => r.status === "error");

  const handleImport = async () => {
    setImporting(true);
    try {
      const count = await onImport(validRows.map(r => ({
        control_id: r.controlId,
        date: r.date,
        time: r.time || null,
        value: r.value,
        operator: nameToId(personnel, r.operator),
        comment: r.comment || null,
        laboratory_id: activeLaboratoryId,
      })));
      setResultMsg(`Imported ${count} result${count !== 1 ? "s" : ""}.${errorRows.length ? ` ${errorRows.length} row(s) skipped — see below.` : ""}`);
      setRows(errorRows); // keep only the failed rows visible so they can be fixed and re-tried
    } catch (e) {
      setResultMsg("Import failed: " + e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: COLORS.teal, borderWidth: 1.5 }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold flex items-center gap-2" style={{ color: COLORS.navy }}>
          <Upload size={15} color={COLORS.teal} /> Bulk import IQC results from CSV
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        One file, any mix of parameters and machines — each row is matched to an existing control level by Machine + Parameter + (Lot Number or Level). Control levels must already be set up first; this only logs results, it doesn't create new parameters or controls.
      </p>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button onClick={downloadTemplate} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
          <Download size={13} /> Download CSV template
        </button>
        <button onClick={() => fileRef.current?.click()} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border" style={{ borderColor: COLORS.navy, color: COLORS.navy }}>
          <Upload size={13} /> Choose CSV file
        </button>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
        {fileName && <span className="text-xs text-gray-400">{fileName}</span>}
      </div>

      {rows.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-2 text-xs">
            <Badge color={COLORS.teal}>{validRows.length} ready to import</Badge>
            {errorRows.length > 0 && <Badge color={COLORS.red}>{errorRows.length} need fixing</Badge>}
          </div>
          <div className="border rounded-md divide-y max-h-64 overflow-auto mb-3" style={{ borderColor: "#EEF3F1" }}>
            {rows.map((r, i) => (
              <div key={i} className="px-3 py-1.5 text-xs flex items-center gap-2">
                {r.status === "ok" ? (
                  <>
                    <Badge color={COLORS.teal}>OK</Badge>
                    <span>{r.machine} · {r.parameter} · {r.level} · {r.date} · value {r.value}</span>
                  </>
                ) : (
                  <>
                    <Badge color={COLORS.red}>Skip</Badge>
                    <span className="text-gray-500">{r.reason}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {resultMsg && <div className="text-xs mb-3" style={{ color: COLORS.teal }}>{resultMsg}</div>}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="text-sm px-3 py-1.5 text-gray-500">Close</button>
        <button onClick={handleImport} disabled={importing || validRows.length === 0}
          className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1 disabled:opacity-40" style={{ background: COLORS.teal }}>
          <Save size={14} /> {importing ? "Importing…" : `Import ${validRows.length} result${validRows.length !== 1 ? "s" : ""}`}
        </button>
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

function MachineForm({ onSave, onCancel, equipment }) {
  const [name, setName] = useState("");
  const [discipline, setDiscipline] = useState(DISCIPLINES[0]);
  const [model, setModel] = useState("");
  const [linkedEquipmentId, setLinkedEquipmentId] = useState("");

  const applyEquipment = (equipmentId) => {
    setLinkedEquipmentId(equipmentId);
    const eq = equipment.find(e => e.id === equipmentId);
    if (eq) {
      setName(eq.name);
      setModel(eq.model || "");
    }
  };

  return (
    <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
      {equipment.length > 0 && (
        <Field label="Select from existing equipment (optional)">
          <select className={inputCls} style={inputStyle} value={linkedEquipmentId} onChange={e => applyEquipment(e.target.value)}>
            <option value="">Type a new machine below instead…</option>
            {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}{eq.model ? ` (${eq.model})` : ""}</option>)}
          </select>
          <div className="text-[11px] text-gray-400 mt-1">Picking one fills in the name and model, and links this IQC machine back to that equipment record.</div>
        </Field>
      )}
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
        <button onClick={() => name.trim() && onSave({ name, discipline, model, linkedEquipmentId })} className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1" style={{ background: COLORS.teal }}><Save size={14} /> Add machine</button>
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
function EQAPage({ eqaEvents, updateEqaEvents, qcMachines, canEdit, ncs, createNcFromEqaAction, activeLaboratoryId }) {
  const [showForm, setShowForm] = useState(false);
  const [filterDiscipline, setFilterDiscipline] = useState("All");
  const [showTrends, setShowTrends] = useState(false);
  const [trendParameter, setTrendParameter] = useState("");

  const addEvents = (drafts) => {
    const newEvents = drafts.map(draft => {
      const sdi = draft.peerMean !== "" && draft.peerSD && draft.peerSD !== "0"
        ? (parseFloat(draft.labResult) - parseFloat(draft.peerMean)) / parseFloat(draft.peerSD) : null;
      const evaluation = sdi === null ? "Not yet received" : Math.abs(sdi) <= 2 ? "Satisfactory" : Math.abs(sdi) <= 3 ? "Marginal" : "Unsatisfactory";
      return { id: uid(), laboratoryId: activeLaboratoryId, ...draft, sdi, evaluation };
    });
    updateEqaEvents([...newEvents, ...eqaEvents]);
    setShowForm(false);
  };
  const setEvent = (id, patch) => updateEqaEvents(eqaEvents.map(e => e.id === id ? { ...e, ...patch } : e));
  const removeEvent = (id) => updateEqaEvents(eqaEvents.filter(e => e.id !== id));

  const filtered = eqaEvents.filter(e => filterDiscipline === "All" || e.discipline === filterDiscipline)
    .sort((a, b) => (b.dateReceived || "").localeCompare(a.dateReceived || ""));

  const evalColor = (ev) => ev === "Satisfactory" ? COLORS.teal : ev === "Marginal" ? COLORS.amber : ev === "Unsatisfactory" ? COLORS.red : "#9AA5A3";

  const trendParameters = useMemo(() => [...new Set(eqaEvents.map(e => e.parameter).filter(Boolean))].sort(), [eqaEvents]);
  const trendData = useMemo(() => {
    if (!trendParameter) return [];
    return eqaEvents
      .filter(e => e.parameter === trendParameter && e.sdi !== null && e.sdi !== undefined)
      .sort((a, b) => (a.dateReceived || "").localeCompare(b.dateReceived || ""))
      .map(e => ({ date: e.dateReceived, sdi: Number(e.sdi) }));
  }, [eqaEvents, trendParameter]);

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold" style={{ color: COLORS.navy }}>External Quality Assessment (EQAS)</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowTrends(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
            <Activity size={14} /> {showTrends ? "Hide" : "Show"} trends
          </button>
          {canEdit && (
            <button onClick={() => setShowForm(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md text-white" style={{ background: COLORS.teal }}>
              <Plus size={14} /> Log EQA result
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-4">Proficiency testing / interlaboratory comparison across Hematology, Biochemistry, and Immunochemistry, with automatic SDI evaluation.</p>

      {showTrends && (
        <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold" style={{ color: COLORS.navy }}>SDI over time by analyte</div>
            <select className={inputCls} style={{ ...inputStyle, maxWidth: 240 }} value={trendParameter} onChange={e => setTrendParameter(e.target.value)}>
              <option value="">Select an analyte…</option>
              {trendParameters.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {!trendParameter ? (
            <Empty text="Pick an analyte above to see its SDI trend across all EQA cycles received so far." />
          ) : trendData.length === 0 ? (
            <Empty text="No SDI results yet for this analyte." />
          ) : (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F1" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[-4, 4]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <ReferenceLine y={0} stroke="#9AA5A3" />
                  <ReferenceLine y={2} stroke={COLORS.amber} strokeDasharray="3 3" />
                  <ReferenceLine y={-2} stroke={COLORS.amber} strokeDasharray="3 3" />
                  <ReferenceLine y={3} stroke={COLORS.red} strokeDasharray="3 3" />
                  <ReferenceLine y={-3} stroke={COLORS.red} strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="sdi" stroke={COLORS.teal} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <select value={filterDiscipline} onChange={e => setFilterDiscipline(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
          <option>All</option>{DISCIPLINES.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {showForm && canEdit && <EQAForm qcMachines={qcMachines} onCancel={() => setShowForm(false)} onSave={addEvents} />}

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
            {e.evaluation === "Unsatisfactory" && (
              e.linkedNcId ? (
                <div className="mt-1"><Badge color={COLORS.teal}>{ncs.find(n => n.id === e.linkedNcId)?.ncNumber || "NC"} raised from this result</Badge></div>
              ) : canEdit && (
                <button onClick={() => createNcFromEqaAction(e)} className="mt-1 text-xs px-2 py-1 rounded-md border" style={{ borderColor: COLORS.red, color: COLORS.red }}>
                  Create NC from this result
                </button>
              )
            )}
            {e.notes && <div className="text-xs text-gray-400 mt-1">{e.notes}</div>}
            {e.nextCycleDate && (
              <div className="mt-1">
                <Badge color={e.nextCycleDate < todayISO() ? COLORS.red : "#9AA5A3"}>
                  {e.nextCycleDate < todayISO() ? "Next cycle overdue" : "Next cycle due"} {e.nextCycleDate}
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EQAForm({ qcMachines, onSave, onCancel }) {
  const [mode, setMode] = useState("single"); // "single" | "batch"
  const [discipline, setDiscipline] = useState(DISCIPLINES[0]);
  const [machineId, setMachineId] = useState("");
  const [provider, setProvider] = useState("");
  const [cycle, setCycle] = useState("");
  const [dateReceived, setDateReceived] = useState(todayISO());
  const [nextCycleDate, setNextCycleDate] = useState("");
  const [notes, setNotes] = useState("");

  // Single-entry fields
  const [parameter, setParameter] = useState("");
  const [labResult, setLabResult] = useState("");
  const [peerMean, setPeerMean] = useState("");
  const [peerSD, setPeerSD] = useState("");

  // Batch-entry rows — same shared header above, one row per analyte in the panel
  const [rows, setRows] = useState([{ parameter: "", labResult: "", peerMean: "", peerSD: "" }]);
  const updateRow = (i, patch) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const addRow = () => setRows(prev => [...prev, { parameter: "", labResult: "", peerMean: "", peerSD: "" }]);
  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const machinesForDiscipline = qcMachines.filter(m => m.discipline === discipline);
  const sharedFields = { discipline, machineId, provider, cycle, dateReceived, nextCycleDate, notes };

  const handleSave = () => {
    if (mode === "single") {
      if (!parameter.trim() || labResult === "") return;
      onSave([{ ...sharedFields, parameter, labResult, peerMean, peerSD }]);
    } else {
      const validRows = rows.filter(r => r.parameter.trim() && r.labResult !== "");
      if (validRows.length === 0) return;
      onSave(validRows.map(r => ({ ...sharedFields, ...r })));
    }
  };

  return (
    <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
      <div className="flex gap-2 mb-3">
        <button onClick={() => setMode("single")} className="text-xs px-3 py-1.5 rounded-md border" style={{ borderColor: mode === "single" ? COLORS.teal : "#D8E5E1", color: mode === "single" ? COLORS.teal : COLORS.ink, background: mode === "single" ? COLORS.mint : "white" }}>Single result</button>
        <button onClick={() => setMode("batch")} className="text-xs px-3 py-1.5 rounded-md border" style={{ borderColor: mode === "batch" ? COLORS.teal : "#D8E5E1", color: mode === "batch" ? COLORS.teal : COLORS.ink, background: mode === "batch" ? COLORS.mint : "white" }}>Batch entry (full panel)</button>
      </div>
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
        <Field label="Provider / scheme"><input className={inputCls} style={inputStyle} value={provider} onChange={e => setProvider(e.target.value)} placeholder="e.g. RIQAS, UK NEQAS, CAP" /></Field>
        <Field label="Cycle / round"><input className={inputCls} style={inputStyle} value={cycle} onChange={e => setCycle(e.target.value)} placeholder="e.g. 2026 Round 4" /></Field>
        <Field label="Date result received"><input type="date" className={inputCls} style={inputStyle} value={dateReceived} onChange={e => setDateReceived(e.target.value)} /></Field>
        <Field label="Next cycle due (optional)"><input type="date" className={inputCls} style={inputStyle} value={nextCycleDate} onChange={e => setNextCycleDate(e.target.value)} /></Field>
      </div>

      {mode === "single" ? (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Parameter"><input className={inputCls} style={inputStyle} value={parameter} onChange={e => setParameter(e.target.value)} placeholder="e.g. Hemoglobin, Glucose, TSH" /></Field>
          <Field label="Lab result"><input type="number" step="any" className={inputCls} style={inputStyle} value={labResult} onChange={e => setLabResult(e.target.value)} /></Field>
          <Field label="Peer group mean"><input type="number" step="any" className={inputCls} style={inputStyle} value={peerMean} onChange={e => setPeerMean(e.target.value)} /></Field>
          <Field label="Peer group SD"><input type="number" step="any" className={inputCls} style={inputStyle} value={peerSD} onChange={e => setPeerSD(e.target.value)} /></Field>
        </div>
      ) : (
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-500 mb-1">Analytes in this panel</div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 mb-1.5 items-center">
              <input className={inputCls} style={inputStyle} value={r.parameter} onChange={e => updateRow(i, { parameter: e.target.value })} placeholder="Analyte" />
              <input type="number" step="any" className={inputCls} style={inputStyle} value={r.labResult} onChange={e => updateRow(i, { labResult: e.target.value })} placeholder="Lab result" />
              <input type="number" step="any" className={inputCls} style={inputStyle} value={r.peerMean} onChange={e => updateRow(i, { peerMean: e.target.value })} placeholder="Peer mean" />
              <input type="number" step="any" className={inputCls} style={inputStyle} value={r.peerSD} onChange={e => updateRow(i, { peerSD: e.target.value })} placeholder="Peer SD" />
              <button onClick={() => removeRow(i)} disabled={rows.length === 1} className="text-gray-300 hover:text-red-500 disabled:opacity-30"><Trash2 size={14} /></button>
            </div>
          ))}
          <button onClick={addRow} className="text-xs flex items-center gap-1 mt-1" style={{ color: COLORS.teal }}><Plus size={12} /> Add another analyte</button>
        </div>
      )}

      <Field label="Notes"><textarea className={inputCls} style={inputStyle} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Corrective action reference, comments…" /></Field>
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 text-gray-500">Cancel</button>
        <button onClick={handleSave}
          className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1" style={{ background: COLORS.teal }}><Save size={14} /> Save {mode === "batch" ? `${rows.filter(r => r.parameter.trim() && r.labResult !== "").length} result(s)` : "EQA result"}</button>
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
              <input type="password" className={inputCls} style={inputStyle} value={password} onChange={e => { setPassword(e.target.value); setError(""); }} onKeyDown={e => { if (e.key === "Enter") handleLogin(); }} placeholder="Password" />
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

      </div>
    </div>
  );
}

/** Shown after a successful login, before the main app, when the person's laboratory can't be determined automatically — either because they have more than one assigned (they choose), or none at all (Admin sees every lab regardless; anyone else sees a clear message instead of a confusing empty app). */
function LaboratoryPicker({ choices, onSelect, onLogout }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.bg }}>
      <div className="w-full max-w-sm bg-white rounded-xl border p-6" style={{ borderColor: "#E1EBE8" }}>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={22} color={COLORS.teal} />
          <div className="font-semibold text-lg" style={{ color: COLORS.navy }}>Lab QMS</div>
        </div>
        {choices.length === 0 ? (
          <>
            <div className="text-sm mb-4" style={{ color: COLORS.navy }}>No laboratory assigned</div>
            <div className="text-xs text-gray-500 mb-4">Your account isn't assigned to any laboratory yet. Contact an Admin to be added to one before you can use Lab QMS.</div>
          </>
        ) : (
          <>
            <div className="text-xs text-gray-400 mb-4">You're assigned to more than one laboratory. Choose which one to work in — you can switch later from the sidebar.</div>
            <div className="space-y-2">
              {choices.map(lab => (
                <button key={lab.id} onClick={() => onSelect(lab.id)}
                  className="w-full text-left px-4 py-3 rounded-md border text-sm" style={{ borderColor: "#D8E5E1", color: COLORS.ink }}>
                  {lab.name}
                </button>
              ))}
            </div>
          </>
        )}
        <button onClick={onLogout} className="w-full text-xs text-gray-400 mt-4">Log out</button>
      </div>
    </div>
  );
}

// ---------------- Documents (linked SOPs, certificates, calibration reports) ----------------
// ---------------- Document link (handles both an external URL and a real uploaded file) ----------------
function DocumentLink({ title, url, storagePath, className }) {
  const [loading, setLoading] = useState(false);

  if (storagePath) {
    const handleOpen = async () => {
      setLoading(true);
      try {
        const signedUrl = await storageApi.getSignedDocumentUrl(storagePath);
        window.open(signedUrl, "_blank", "noopener,noreferrer");
      } catch (e) {
        alert("Could not open this file.\n\n" + e.message);
      } finally {
        setLoading(false);
      }
    };
    return (
      <button onClick={handleOpen} disabled={loading} className={`text-sm font-medium truncate text-left ${className || "block"}`} style={{ color: COLORS.navy }}>
        {loading ? "Opening…" : title}
      </button>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className={`text-sm font-medium truncate ${className || "block"}`} style={{ color: COLORS.navy }}>{title}</a>
  );
}

function Documents({ documents, updateDocuments, personnel, currentUser, canEdit, canPublishControlledDocs, publishControlledDocumentAction, documentAcknowledgments, acknowledgeDocumentAction, activeLaboratoryId }) {
  const [section, setSection] = useState("controlled");
  const [showControlledForm, setShowControlledForm] = useState(false);
  const [showPersonalForm, setShowPersonalForm] = useState(false);
  const [showGeneralForm, setShowGeneralForm] = useState(false);
  const [expandedCode, setExpandedCode] = useState(null);
  const [publishError, setPublishError] = useState("");
  const [showReportPicker, setShowReportPicker] = useState(false);
  const [selectedReportDocIds, setSelectedReportDocIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const controlledDocs = documents.filter(d => CONTROLLED_DOCUMENT_CATEGORIES.includes(d.category));
  const personalDocs = documents.filter(d => PERSONAL_DOCUMENT_CATEGORIES.includes(d.category));
  const generalDocs = documents.filter(d => GENERAL_DOCUMENT_CATEGORIES.includes(d.category));

  const controlledGroups = {};
  controlledDocs.forEach(d => {
    const key = d.documentCode || d.id;
    (controlledGroups[key] = controlledGroups[key] || []).push(d);
  });
  const controlledList = Object.entries(controlledGroups).map(([code, versions]) => {
    const sorted = [...versions].sort((a, b) => b.version - a.version);
    const current = sorted.find(v => v.isCurrent) || sorted[0];
    const history = sorted.filter(v => v.id !== current.id);
    return { code, current, history };
  }).sort((a, b) => (b.current.uploadedAt || "").localeCompare(a.current.uploadedAt || ""));

  const personalByPerson = {};
  personalDocs.forEach(d => {
    const key = d.personnelName || "Unassigned";
    (personalByPerson[key] = personalByPerson[key] || []).push(d);
  });

  const removeDoc = (id) => updateDocuments(documents.filter(d => d.id !== id));

  const buildAcknowledgmentReportRows = (docIds) => {
    const rows = [];
    controlledList
      .filter(({ current }) => docIds.includes(current.id))
      .forEach(({ current }) => {
        personnel.forEach(p => {
          const ack = documentAcknowledgments.find(a => a.documentId === current.id && a.personnelName === p.name);
          rows.push({
            "Document Code": current.documentCode || "",
            "Title": current.title,
            "Version": current.version,
            "Category": current.category,
            "Staff": p.name,
            "Acknowledged": ack ? "Yes" : "No",
            "Acknowledged Date": ack ? (ack.acknowledgedAt || "").slice(0, 10) : "",
          });
        });
      });
    return rows;
  };

  const downloadAcknowledgmentExcel = (docIds) => {
    exportRowsToExcel(buildAcknowledgmentReportRows(docIds), "Acknowledgments", "document-acknowledgment-report.xlsx");
  };

  const printAcknowledgmentReport = (docIds) => {
    const rows = buildAcknowledgmentReportRows(docIds);
    const w = window.open("", "_blank");
    if (!w) { alert("Please allow pop-ups for this site to print the report."); return; }
    const tableRows = rows.map(r => `
      <tr>
        <td>${escapeHtml(r["Document Code"])}</td>
        <td>${escapeHtml(r["Title"])}</td>
        <td>${escapeHtml(r["Version"])}</td>
        <td>${escapeHtml(r["Staff"])}</td>
        <td>${escapeHtml(r["Acknowledged"])}</td>
        <td>${escapeHtml(r["Acknowledged Date"])}</td>
      </tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>Document Acknowledgment Report</title>
      <style>
        body { font-family: -apple-system, system-ui, sans-serif; padding: 32px; color: #0F2A3D; }
        h1 { font-size: 18px; margin-bottom: 2px; }
        p.meta { color: #6B7A78; font-size: 12px; margin-top: 0; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #D8E5E1; padding: 6px 10px; font-size: 12px; text-align: left; }
        th { background: #0F2A3D; color: white; }
        tr:nth-child(even) td { background: #F6FAF9; }
      </style></head>
      <body>
        <h1>Document Acknowledgment Report</h1>
        <p class="meta">Lab QMS \u2014 generated ${escapeHtml(new Date().toLocaleString())}</p>
        <table>
          <thead><tr><th>Document Code</th><th>Title</th><th>Version</th><th>Staff</th><th>Acknowledged</th><th>Date</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const handlePublish = async (draft) => {
    setPublishError("");
    try {
      await publishControlledDocumentAction(draft);
      setShowControlledForm(false);
    } catch (e) {
      setPublishError(e.message);
    }
  };
  const addPersonal = (draft) => {
    updateDocuments([{ id: uid(), uploadedBy: currentUser.name, uploadedAt: todayISO(), laboratoryId: activeLaboratoryId, ...draft }, ...documents]);
    setShowPersonalForm(false);
  };
  const addGeneral = (draft) => {
    updateDocuments([{ id: uid(), uploadedBy: currentUser.name, uploadedAt: todayISO(), laboratoryId: activeLaboratoryId, ...draft }, ...documents]);
    setShowGeneralForm(false);
  };

  const SECTION_TABS = [
    { id: "controlled", label: `Controlled documents (${controlledList.length})` },
    { id: "personal", label: `Personal documents (${personalDocs.length})` },
    { id: "general", label: `General documents (${generalDocs.length})` },
  ];

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: COLORS.navy }}>Documents</h1>
      <p className="text-xs text-gray-400 mb-4">Upload a file directly, or paste a link to wherever it's already stored (Drive, SharePoint, etc.) — either works for any document below.</p>

      <div className="mb-4">
        <input className={inputCls} style={{ ...inputStyle, maxWidth: 360 }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search all documents by title, notes, or code…" />
      </div>

      {searchQuery.trim() ? (() => {
        const q = searchQuery.trim().toLowerCase();
        const results = documents.filter(d =>
          (d.title || "").toLowerCase().includes(q) ||
          (d.notes || "").toLowerCase().includes(q) ||
          (d.documentCode || "").toLowerCase().includes(q) ||
          (d.category || "").toLowerCase().includes(q) ||
          (d.relatedTo || "").toLowerCase().includes(q)
        );
        const sectionLabelFor = (d) => CONTROLLED_DOCUMENT_CATEGORIES.includes(d.category) ? "Controlled" : PERSONAL_DOCUMENT_CATEGORIES.includes(d.category) ? "Personal" : "General";
        return (
          <div className="bg-white rounded-lg border divide-y" style={{ borderColor: "#E1EBE8" }}>
            <div className="px-4 py-2 text-xs text-gray-400">{results.length} result{results.length !== 1 ? "s" : ""} for "{searchQuery.trim()}"</div>
            {results.length === 0 && <div className="px-4 py-6 text-sm text-gray-400 text-center">No documents match that search.</div>}
            {results.map(d => (
              <div key={d.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium" style={{ color: COLORS.navy }}>{d.title}</div>
                  <div className="text-xs text-gray-400">{sectionLabelFor(d)} · {d.category}{d.documentCode ? ` · ${d.documentCode}` : ""}{d.notes ? ` · ${d.notes}` : ""}</div>
                </div>
                <DocumentLink title="Open" url={d.url} storagePath={d.storagePath} />
              </div>
            ))}
          </div>
        );
      })() : (
      <>
      <div className="flex gap-2 mb-4">
        {SECTION_TABS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className="text-xs px-3 py-1.5 rounded-md border"
            style={{
              borderColor: section === s.id ? COLORS.teal : "#D8E5E1",
              background: section === s.id ? COLORS.mint : "white",
              color: section === s.id ? COLORS.teal : COLORS.ink,
            }}>{s.label}</button>
        ))}
      </div>

      {section === "controlled" && (
        <>
          <p className="text-sm text-gray-500 mb-3">SOPs, QSPs, policies, and manuals. Publishing a new version under the same Document Code automatically replaces the current version for everyone — earlier versions stay retrievable under version history. Only Admin, QA Manager, or their deputy can publish.</p>
          {canPublishControlledDocs ? (
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={() => setShowControlledForm(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md text-white" style={{ background: COLORS.teal }}>
                <Plus size={14} /> Publish SOP / QSP / Policy / Manual
              </button>
              <button onClick={() => { setShowReportPicker(v => !v); setSelectedReportDocIds(controlledList.map(({ current }) => current.id)); }}
                className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
                <Download size={14} /> Acknowledgment report
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mb-3">Publishing controlled documents is limited to the QA Manager, their deputy, or an Admin.</p>
          )}
          {showReportPicker && canPublishControlledDocs && (
            <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
              <div className="text-sm font-semibold mb-2" style={{ color: COLORS.navy }}>Choose which documents to include</div>
              <div className="flex gap-3 mb-2 text-xs">
                <button onClick={() => setSelectedReportDocIds(controlledList.map(({ current }) => current.id))} className="underline" style={{ color: COLORS.teal }}>Select all</button>
                <button onClick={() => setSelectedReportDocIds([])} className="underline text-gray-400">Clear</button>
              </div>
              <div className="space-y-1 mb-4 max-h-52 overflow-y-auto">
                {controlledList.length === 0 && <div className="text-xs text-gray-400">No controlled documents published yet.</div>}
                {controlledList.map(({ current }) => (
                  <label key={current.id} className="flex items-center gap-2 text-sm py-0.5">
                    <input type="checkbox" checked={selectedReportDocIds.includes(current.id)}
                      onChange={e => setSelectedReportDocIds(prev => e.target.checked ? [...prev, current.id] : prev.filter(id => id !== current.id))} />
                    <span>{current.title}{current.documentCode ? ` (${current.documentCode})` : ""}</span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button disabled={selectedReportDocIds.length === 0} onClick={() => downloadAcknowledgmentExcel(selectedReportDocIds)}
                  className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md border disabled:opacity-40" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
                  <Download size={14} /> Download Excel ({selectedReportDocIds.length} selected)
                </button>
                <button disabled={selectedReportDocIds.length === 0} onClick={() => printAcknowledgmentReport(selectedReportDocIds)}
                  className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md border disabled:opacity-40" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
                  <Download size={14} /> Print / Save as PDF ({selectedReportDocIds.length} selected)
                </button>
              </div>
            </div>
          )}
          {showControlledForm && canPublishControlledDocs && (
            <ControlledDocumentForm onCancel={() => { setShowControlledForm(false); setPublishError(""); }} onSave={handlePublish}
              error={publishError} existingCodes={[...new Set(controlledDocs.map(d => d.documentCode).filter(Boolean))]} />
          )}
          <div className="space-y-2">
            {controlledList.length === 0 && <Empty text="No controlled documents published yet." />}
            {controlledList.map(({ code, current, history }) => {
              const ackForDoc = documentAcknowledgments.filter(a => a.documentId === current.id);
              const iAcknowledged = ackForDoc.some(a => a.personnelName === currentUser.name);
              const showAckList = expandedCode === `ack-${code}`;
              const toggleAckList = () => setExpandedCode(expandedCode === `ack-${code}` ? null : `ack-${code}`);
              return (
              <div key={code} className="bg-white rounded-lg border" style={{ borderColor: "#E1EBE8" }}>
                <div className="flex items-center gap-3 px-5 py-3">
                  <ShieldCheck size={15} color={COLORS.teal} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <DocumentLink title={current.title} url={current.url} storagePath={current.storagePath} />
                    <div className="text-xs text-gray-400 truncate">
                      {current.documentCode ? `${current.documentCode} · ` : ""}v{current.version} (current) · Published by {current.uploadedBy} · {current.uploadedAt}
                      {current.nextReviewDate && (
                        <span style={{ color: current.nextReviewDate < todayISO() ? COLORS.red : "inherit" }}> · {current.nextReviewDate < todayISO() ? "Review overdue" : "Next review"} {current.nextReviewDate}</span>
                      )}
                    </div>
                  </div>
                  <Badge color={COLORS.teal}>{current.category}</Badge>
                  {history.length > 0 && (
                    <button onClick={() => setExpandedCode(expandedCode === code ? null : code)} className="text-xs text-gray-400 flex items-center gap-1">
                      {history.length} earlier version{history.length !== 1 ? "s" : ""} {expandedCode === code ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>
                  )}
                  {canPublishControlledDocs && <button onClick={() => removeDoc(current.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>}
                </div>

                <div className="px-5 pb-3 flex items-center gap-2 flex-wrap">
                  <Badge color={ackForDoc.length === personnel.length && personnel.length > 0 ? COLORS.teal : COLORS.amber}>
                    {ackForDoc.length} of {personnel.length} staff acknowledged
                  </Badge>
                  {iAcknowledged ? (
                    <Badge color={COLORS.teal}>You've confirmed reading this version</Badge>
                  ) : (
                    <button onClick={() => acknowledgeDocumentAction(current.id)} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
                      I've read this
                    </button>
                  )}
                  {canPublishControlledDocs && (
                    <button onClick={toggleAckList} className="text-xs text-gray-400 underline">
                      {showAckList ? "Hide" : "Show"} who has / hasn't acknowledged
                    </button>
                  )}
                </div>
                {showAckList && canPublishControlledDocs && (
                  <div className="px-5 pb-3 border-t pt-2 text-xs" style={{ borderColor: "#EEF3F1" }}>
                    <div className="text-gray-500 mb-1">Acknowledged ({ackForDoc.length}): {ackForDoc.map(a => a.personnelName).join(", ") || "—"}</div>
                    <div className="text-gray-400">Not yet acknowledged: {personnel.filter(p => !ackForDoc.some(a => a.personnelName === p.name)).map(p => p.name).join(", ") || "Everyone has acknowledged"}</div>
                  </div>
                )}

                {expandedCode === code && history.length > 0 && (
                  <div className="px-5 pb-3 border-t pt-2" style={{ borderColor: "#EEF3F1" }}>
                    {history.map(h => (
                      <div key={h.id} className="flex items-center gap-2 text-xs text-gray-400 py-1 pl-7">
                        <Badge color="#9AA5A3">Superseded</Badge>
                        <DocumentLink title={h.title} url={h.url} storagePath={h.storagePath} className="underline" />
                        <span>v{h.version} · {h.uploadedAt}</span>
                        {canPublishControlledDocs && <button onClick={() => removeDoc(h.id)} className="ml-auto text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </>
      )}

      {section === "personal" && (
        <>
          <p className="text-sm text-gray-500 mb-3">Staff professional licences, registrations, and certifications relevant to QMS work — kept against each person's record.</p>
          {canEdit && (
            <button onClick={() => setShowPersonalForm(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md text-white mb-3" style={{ background: COLORS.teal }}>
              <Plus size={14} /> Upload personal document
            </button>
          )}
          {showPersonalForm && canEdit && <PersonalDocumentForm personnel={personnel} onCancel={() => setShowPersonalForm(false)} onSave={addPersonal} />}

          {Object.keys(personalByPerson).length === 0 && <Empty text="No personal documents uploaded yet." />}
          {Object.entries(personalByPerson).map(([person, docs]) => (
            <div key={person} className="mb-3">
              <div className="text-xs font-medium mb-1" style={{ color: COLORS.navy }}>{person}</div>
              <div className="bg-white rounded-lg border divide-y" style={{ borderColor: "#E1EBE8" }}>
                {docs.map(d => (
                  <div key={d.id} className="flex items-center gap-3 px-5 py-2.5">
                    <UserCheck size={14} color={COLORS.teal} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <DocumentLink title={d.title} url={d.url} storagePath={d.storagePath} className="text-sm truncate block" />
                      <div className="text-xs text-gray-400 truncate">{d.category} · Uploaded {d.uploadedAt}{d.notes ? ` · ${d.notes}` : ""}</div>
                    </div>
                    {canEdit && <button onClick={() => removeDoc(d.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {section === "general" && (
        <>
          <p className="text-sm text-gray-500 mb-3">Calibration certificates, service reports, EQA certificates, training materials, and anything else worth indexing.</p>
          {canEdit && (
            <button onClick={() => setShowGeneralForm(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md text-white mb-3" style={{ background: COLORS.teal }}>
              <Plus size={14} /> Link a document
            </button>
          )}
          {showGeneralForm && canEdit && <GeneralDocumentForm onCancel={() => setShowGeneralForm(false)} onSave={addGeneral} />}

          <div className="bg-white rounded-lg border divide-y" style={{ borderColor: "#E1EBE8" }}>
            {generalDocs.length === 0 && <Empty text="No general documents linked yet." />}
            {generalDocs.map(d => (
              <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                <Paperclip size={15} color={COLORS.teal} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <DocumentLink title={d.title} url={d.url} storagePath={d.storagePath} className="text-sm font-medium truncate block" />
                  <div className="text-xs text-gray-400 truncate">{d.relatedTo}{d.relatedTo ? " · " : ""}Uploaded by {d.uploadedBy} · {d.uploadedAt}</div>
                </div>
                <Badge color={COLORS.teal}>{d.category}</Badge>
                {canEdit && <button onClick={() => removeDoc(d.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>}
              </div>
            ))}
          </div>
        </>
      )}
      </>
      )}
    </div>
  );
}

function ControlledDocumentForm({ onSave, onCancel, error, existingCodes }) {
  const [documentCode, setDocumentCode] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CONTROLLED_DOCUMENT_CATEGORIES[0]);
  const [mode, setMode] = useState("upload"); // "upload" | "link"
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const isNewVersion = existingCodes.includes(documentCode.trim());

  const handleSave = async () => {
    if (!title.trim()) return;
    if (mode === "link" && !url.trim()) return;
    if (mode === "upload" && !file) return;
    setUploadError("");
    setUploading(true);
    try {
      let storagePath = "";
      if (mode === "upload") {
        storagePath = await storageApi.uploadDocumentFile(file, "controlled");
      }
      await onSave({ documentCode: documentCode.trim(), title, category, url: mode === "link" ? url : "", storagePath, notes, nextReviewDate, relatedTo: "" });
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Document Code">
          <input className={inputCls} style={inputStyle} value={documentCode} onChange={e => setDocumentCode(e.target.value)}
            placeholder="e.g. SOP-HEM-014" list="existing-doc-codes" />
          <datalist id="existing-doc-codes">{existingCodes.map(c => <option key={c} value={c} />)}</datalist>
          {documentCode.trim() && (
            <div className="text-[11px] mt-1" style={{ color: isNewVersion ? COLORS.amber : COLORS.teal }}>
              {isNewVersion ? "Matches an existing code — this will publish as the new current version and supersede the old one." : "New code — this will be published as version 1."}
            </div>
          )}
        </Field>
        <Field label="Category">
          <select className={inputCls} style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
            {CONTROLLED_DOCUMENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Title"><input className={inputCls} style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Manual Differential Counting" /></Field>
        <Field label="File">
          <div className="flex gap-2 mb-1.5">
            <button type="button" onClick={() => setMode("upload")} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: mode === "upload" ? COLORS.teal : "#D8E5E1", color: mode === "upload" ? COLORS.teal : "#9AA5A3", background: mode === "upload" ? COLORS.mint : "white" }}>Upload file</button>
            <button type="button" onClick={() => setMode("link")} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: mode === "link" ? COLORS.teal : "#D8E5E1", color: mode === "link" ? COLORS.teal : "#9AA5A3", background: mode === "link" ? COLORS.mint : "white" }}>Link instead</button>
          </div>
          {mode === "upload" ? (
            <input type="file" onChange={e => setFile(e.target.files[0] || null)} className="text-xs" />
          ) : (
            <input className={inputCls} style={inputStyle} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" />
          )}
        </Field>
      </div>
      <Field label="Notes (optional)"><textarea className={inputCls} style={inputStyle} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What changed in this version, effective date, etc." /></Field>
      <Field label="Next review due (optional)"><input type="date" className={inputCls} style={{ ...inputStyle, maxWidth: 200 }} value={nextReviewDate} onChange={e => setNextReviewDate(e.target.value)} /></Field>
      {(error || uploadError) && <div className="text-xs mb-2" style={{ color: COLORS.red }}>{error || uploadError}</div>}
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 text-gray-500">Cancel</button>
        <button disabled={uploading} onClick={handleSave}
          className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1 disabled:opacity-50" style={{ background: COLORS.teal }}>
          <Save size={14} /> {uploading ? "Publishing…" : "Publish"}
        </button>
      </div>
    </div>
  );
}

function PersonalDocumentForm({ personnel, onSave, onCancel }) {
  const [personnelName, setPersonnelName] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(PERSONAL_DOCUMENT_CATEGORIES[0]);
  const [mode, setMode] = useState("upload");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleSave = async () => {
    if (!personnelName || !title.trim()) return;
    if (mode === "link" && !url.trim()) return;
    if (mode === "upload" && !file) return;
    setUploadError("");
    setUploading(true);
    try {
      let storagePath = "";
      if (mode === "upload") storagePath = await storageApi.uploadDocumentFile(file, "personal");
      onSave({ personnelName, title, category, url: mode === "link" ? url : "", storagePath, notes, relatedTo: "" });
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Staff member">
          <select className={inputCls} style={inputStyle} value={personnelName} onChange={e => setPersonnelName(e.target.value)}>
            <option value="">Select…</option>{personnel.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Document type">
          <select className={inputCls} style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
            {PERSONAL_DOCUMENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Title"><input className={inputCls} style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. MLS Licence — Aishath Shifa" /></Field>
        <Field label="File">
          <div className="flex gap-2 mb-1.5">
            <button type="button" onClick={() => setMode("upload")} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: mode === "upload" ? COLORS.teal : "#D8E5E1", color: mode === "upload" ? COLORS.teal : "#9AA5A3", background: mode === "upload" ? COLORS.mint : "white" }}>Upload file</button>
            <button type="button" onClick={() => setMode("link")} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: mode === "link" ? COLORS.teal : "#D8E5E1", color: mode === "link" ? COLORS.teal : "#9AA5A3", background: mode === "link" ? COLORS.mint : "white" }}>Link instead</button>
          </div>
          {mode === "upload" ? (
            <input type="file" onChange={e => setFile(e.target.files[0] || null)} className="text-xs" />
          ) : (
            <input className={inputCls} style={inputStyle} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" />
          )}
        </Field>
      </div>
      <Field label="Notes (optional)"><input className={inputCls} style={inputStyle} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Expires 2027-04-01" /></Field>
      {uploadError && <div className="text-xs mb-2" style={{ color: COLORS.red }}>{uploadError}</div>}
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 text-gray-500">Cancel</button>
        <button disabled={uploading} onClick={handleSave}
          className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1 disabled:opacity-50" style={{ background: COLORS.teal }}>
          <Save size={14} /> {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>
    </div>
  );
}

function GeneralDocumentForm({ onSave, onCancel }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(GENERAL_DOCUMENT_CATEGORIES[0]);
  const [relatedTo, setRelatedTo] = useState("");
  const [mode, setMode] = useState("upload");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleSave = async () => {
    if (!title.trim()) return;
    if (mode === "link" && !url.trim()) return;
    if (mode === "upload" && !file) return;
    setUploadError("");
    setUploading(true);
    try {
      let storagePath = "";
      if (mode === "upload") storagePath = await storageApi.uploadDocumentFile(file, "general");
      onSave({ title, category, relatedTo, url: mode === "link" ? url : "", storagePath, notes });
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Title"><input className={inputCls} style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Medonic M51 Service Report — March 2026" /></Field>
        <Field label="Category">
          <select className={inputCls} style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
            {GENERAL_DOCUMENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Related to (optional)"><input className={inputCls} style={inputStyle} value={relatedTo} onChange={e => setRelatedTo(e.target.value)} placeholder="e.g. Medonic M51, Clause 6.4, NC-003" /></Field>
        <Field label="File">
          <div className="flex gap-2 mb-1.5">
            <button type="button" onClick={() => setMode("upload")} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: mode === "upload" ? COLORS.teal : "#D8E5E1", color: mode === "upload" ? COLORS.teal : "#9AA5A3", background: mode === "upload" ? COLORS.mint : "white" }}>Upload file</button>
            <button type="button" onClick={() => setMode("link")} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: mode === "link" ? COLORS.teal : "#D8E5E1", color: mode === "link" ? COLORS.teal : "#9AA5A3", background: mode === "link" ? COLORS.mint : "white" }}>Link instead</button>
          </div>
          {mode === "upload" ? (
            <input type="file" onChange={e => setFile(e.target.files[0] || null)} className="text-xs" />
          ) : (
            <input className={inputCls} style={inputStyle} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" />
          )}
        </Field>
      </div>
      <Field label="Notes"><textarea className={inputCls} style={inputStyle} rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
      {uploadError && <div className="text-xs mb-2" style={{ color: COLORS.red }}>{uploadError}</div>}
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 text-gray-500">Cancel</button>
        <button disabled={uploading} onClick={handleSave}
          className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1 disabled:opacity-50" style={{ background: COLORS.teal }}>
          <Save size={14} /> {uploading ? "Uploading…" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ---------------- Audit log & backup export ----------------
// ---------------- Management Review records (Clause 8.9) ----------------
function ManagementReview({ managementReviews, addManagementReview, deleteManagementReview, stats, currentUser }) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (draft) => {
    setSaving(true); setError("");
    try {
      await addManagementReview(draft);
      setShowForm(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold" style={{ color: COLORS.navy }}>Management review</h1>
        <button onClick={() => setShowForm(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md text-white" style={{ background: COLORS.teal }}>
          <Plus size={14} /> Record a review
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">A dated record of each management review meeting — not just live Dashboard data, but formal evidence that a review happened, what was discussed, and what was decided (Clause 8.9).</p>

      {showForm && (
        <ManagementReviewForm stats={stats} onCancel={() => setShowForm(false)} onSave={handleSave} saving={saving} error={error} />
      )}

      <div className="space-y-3">
        {managementReviews.length === 0 && <Empty text="No management reviews recorded yet." />}
        {managementReviews.map(m => (
          <div key={m.id} className="bg-white rounded-lg border" style={{ borderColor: "#E1EBE8" }}>
            <button onClick={() => setExpanded(expanded === m.id ? null : m.id)} className="w-full flex items-center gap-3 px-5 py-3 text-left">
              {expanded === m.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span className="text-sm font-medium" style={{ color: COLORS.navy }}>{m.reviewDate}</span>
              <span className="text-xs text-gray-400 flex-1 truncate">{m.attendees}</span>
              <span className="text-xs text-gray-400">Conducted by {m.conductedBy}</span>
            </button>
            {expanded === m.id && (
              <div className="px-5 pb-5 pt-1 border-t space-y-3" style={{ borderColor: "#EEF3F1" }}>
                {m.metricsSnapshot && (
                  <div className="mt-3 p-3 rounded-md text-xs" style={{ background: COLORS.mint }}>
                    <div className="font-semibold mb-1" style={{ color: COLORS.navy }}>Metrics at time of review</div>
                    <div className="grid grid-cols-3 gap-2 text-gray-600">
                      <div>Clause compliance: {m.metricsSnapshot.compliancePct}%</div>
                      <div>Open NCs: {m.metricsSnapshot.openNcs}</div>
                      <div>Overdue tasks: {m.metricsSnapshot.overdueTasks}</div>
                      <div>Non-conformant clauses: {m.metricsSnapshot.nonConformantClauses}</div>
                      <div>Unauthorized IQC violations: {m.metricsSnapshot.iqcViolations}</div>
                      <div>EQA unsatisfactory: {m.metricsSnapshot.eqaUnsatisfactory}</div>
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs font-medium mb-1" style={{ color: COLORS.navy }}>Inputs reviewed</div>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap">{m.inputsReviewed || "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-medium mb-1" style={{ color: COLORS.navy }}>Decisions</div>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap">{m.decisions || "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-medium mb-1" style={{ color: COLORS.navy }}>Actions arising</div>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap">{m.actionsArising || "—"}</div>
                  <div className="text-[11px] text-gray-400 mt-1">Individual action items should also be created as Tasks so they're tracked to completion, not just noted here.</div>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => deleteManagementReview(m.id)} className="text-xs text-red-400 flex items-center gap-1"><Trash2 size={12} /> Delete record</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ManagementReviewForm({ stats, onSave, onCancel, saving, error }) {
  const [reviewDate, setReviewDate] = useState(todayISO());
  const [attendees, setAttendees] = useState("");
  const [inputsReviewed, setInputsReviewed] = useState("");
  const [decisions, setDecisions] = useState("");
  const [actionsArising, setActionsArising] = useState("");

  const compliancePct = stats.totalClauses ? Math.round((stats.counts["Compliant"] / stats.totalClauses) * 100) : 0;
  const snapshot = {
    compliancePct,
    openNcs: stats.openNcs,
    overdueTasks: stats.overdueTasks,
    nonConformantClauses: stats.counts["Non-conformant"],
    iqcViolations: stats.iqcUnauthorizedViolations,
    eqaUnsatisfactory: stats.eqaUnsatisfactory,
  };

  return (
    <div className="bg-white rounded-lg border p-5 mb-4" style={{ borderColor: "#E1EBE8" }}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Review date"><input type="date" className={inputCls} style={inputStyle} value={reviewDate} onChange={e => setReviewDate(e.target.value)} /></Field>
        <Field label="Attendees"><input className={inputCls} style={inputStyle} value={attendees} onChange={e => setAttendees(e.target.value)} placeholder="Names / roles present" /></Field>
      </div>
      <div className="p-3 rounded-md text-xs mb-3" style={{ background: COLORS.mint }}>
        <div className="font-semibold mb-1" style={{ color: COLORS.navy }}>This snapshot will be attached to the record automatically:</div>
        <div className="grid grid-cols-3 gap-2 text-gray-600">
          <div>Clause compliance: {snapshot.compliancePct}%</div>
          <div>Open NCs: {snapshot.openNcs}</div>
          <div>Overdue tasks: {snapshot.overdueTasks}</div>
          <div>Non-conformant clauses: {snapshot.nonConformantClauses}</div>
          <div>Unauthorized IQC violations: {snapshot.iqcViolations}</div>
          <div>EQA unsatisfactory: {snapshot.eqaUnsatisfactory}</div>
        </div>
      </div>
      <Field label="Inputs reviewed"><textarea className={inputCls} style={inputStyle} rows={2} value={inputsReviewed} onChange={e => setInputsReviewed(e.target.value)} placeholder="NC trends, IQC/EQA performance, audit results, staff feedback, previous action follow-up, etc." /></Field>
      <Field label="Decisions"><textarea className={inputCls} style={inputStyle} rows={2} value={decisions} onChange={e => setDecisions(e.target.value)} /></Field>
      <Field label="Actions arising"><textarea className={inputCls} style={inputStyle} rows={2} value={actionsArising} onChange={e => setActionsArising(e.target.value)} placeholder="Summary here — create the individual items as Tasks too" /></Field>
      {error && <div className="text-xs mb-2" style={{ color: COLORS.red }}>{error}</div>}
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 text-gray-500">Cancel</button>
        <button disabled={saving} onClick={() => onSave({ reviewDate, attendees, metricsSnapshot: snapshot, inputsReviewed, decisions, actionsArising })}
          className="text-sm px-4 py-1.5 rounded-md text-white flex items-center gap-1 disabled:opacity-50" style={{ background: COLORS.teal }}>
          <Save size={14} /> {saving ? "Saving…" : "Save review record"}
        </button>
      </div>
    </div>
  );
}

function AuditBackup() {
  const [auditLog, setAuditLog] = useState([]);
  const [loadingLog, setLoadingLog] = useState(true);
  const [filterEntity, setFilterEntity] = useState("All");
  const [filterActor, setFilterActor] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [backingUp, setBackingUp] = useState(false);

  const runSearch = async () => {
    setLoadingLog(true);
    try {
      setAuditLog(await auditApi.listAuditLog({
        entity: filterEntity === "All" ? undefined : filterEntity,
        actorName: filterActor === "All" ? undefined : filterActor,
        dateFrom: dateFrom ? `${dateFrom}T00:00:00` : undefined,
        dateTo: dateTo ? `${dateTo}T23:59:59` : undefined,
      }));
    } catch (e) {
      console.error("Could not load audit log:", e);
    } finally {
      setLoadingLog(false);
    }
  };

  useEffect(() => { runSearch(); }, []);

  const entities = ["All", ...Array.from(new Set(auditLog.map(a => a.entity)))];
  const actors = ["All", ...Array.from(new Set(auditLog.map(a => a.actor_name)))];
  const filtered = auditLog; // server already applies entity/actor/date filters via runSearch()

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

  const buildAuditReportRows = () => filtered.map(a => ({
    "Timestamp": new Date(a.ts).toLocaleString(),
    "Entity": a.entity,
    "Action": a.action,
    "Summary": a.summary || "",
    "Actor": a.actor_name || "",
    "Role": a.actor_role || "",
  }));

  const downloadAuditLogExcel = () => {
    exportRowsToExcel(buildAuditReportRows(), "Audit Log", `audit-log-${dateFrom || "all"}-to-${dateTo || "all"}.xlsx`);
  };

  const printAuditLogReport = () => {
    const rows = buildAuditReportRows();
    const w = window.open("", "_blank");
    if (!w) { alert("Please allow pop-ups for this site to print the report."); return; }
    const tableRows = rows.map(r => `
      <tr>
        <td>${escapeHtml(r["Timestamp"])}</td>
        <td>${escapeHtml(r["Entity"])}</td>
        <td>${escapeHtml(r["Action"])}</td>
        <td>${escapeHtml(r["Summary"])}</td>
        <td>${escapeHtml(r["Actor"])}</td>
        <td>${escapeHtml(r["Role"])}</td>
      </tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>Audit Log Report</title>
      <style>
        body { font-family: -apple-system, system-ui, sans-serif; padding: 32px; color: #0F2A3D; }
        h1 { font-size: 18px; margin-bottom: 2px; }
        p.meta { color: #6B7A78; font-size: 12px; margin-top: 0; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #D8E5E1; padding: 6px 10px; font-size: 11px; text-align: left; }
        th { background: #0F2A3D; color: white; }
        tr:nth-child(even) td { background: #F6FAF9; }
      </style></head>
      <body>
        <h1>Audit Log Report</h1>
        <p class="meta">Lab QMS \u2014 ${rows.length} record(s)${dateFrom ? ` \u2014 from ${escapeHtml(dateFrom)}` : ""}${dateTo ? ` to ${escapeHtml(dateTo)}` : ""} \u2014 generated ${escapeHtml(new Date().toLocaleString())}</p>
        <table>
          <thead><tr><th>Timestamp</th><th>Entity</th><th>Action</th><th>Summary</th><th>Actor</th><th>Role</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
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

      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="text-sm font-medium" style={{ color: COLORS.navy }}>Audit log</div>
        <div className="flex gap-2 flex-wrap items-center">
          <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
            {entities.map(e => <option key={e}>{e}</option>)}
          </select>
          <select value={filterActor} onChange={e => setFilterActor(e.target.value)} className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }}>
            {actors.map(a => <option key={a}>{a}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date" className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }} />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="To date" className="text-xs border rounded-md px-2 py-1.5" style={{ borderColor: "#D8E5E1" }} />
          <button onClick={runSearch} className="text-xs px-3 py-1.5 rounded-md text-white" style={{ background: COLORS.teal }}>Search</button>
          <button onClick={downloadAuditLogExcel} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
            <Download size={12} /> Excel
          </button>
          <button onClick={printAuditLogReport} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
            <Download size={12} /> Print / PDF
          </button>
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

// ---------------- Settings (Admin only) ----------------
function Settings({ qcMachines, currentUser, notificationSettings, toggleNotificationSettingAction, laboratories, createLaboratoryAction, activeLaboratoryId }) {
  const [newLabName, setNewLabName] = useState("");
  const [creatingLab, setCreatingLab] = useState(false);
  const [labError, setLabError] = useState("");
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [label, setLabel] = useState("");
  const [restrictToMachine, setRestrictToMachine] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [justCreatedKey, setJustCreatedKey] = useState(null); // { plainKey, keyPrefix } — shown once, then discarded
  const [testEmailStatus, setTestEmailStatus] = useState("");
  const [resendStatus, setResendStatus] = useState(null);
  const [resendStatusLoading, setResendStatusLoading] = useState(true);
  const [showSetupChecklist, setShowSetupChecklist] = useState(false);

  const checkResendStatus = async () => {
    setResendStatusLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-resend-status");
      if (error) throw error;
      setResendStatus(data);
    } catch (e) {
      setResendStatus({ configured: false, reason: e.message });
    } finally {
      setResendStatusLoading(false);
    }
  };
  useEffect(() => { checkResendStatus(); }, []);

  const iqcEndpointUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-qc-result`;
  const eqaEndpointUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-eqa-result`;

  const sendTestEmail = async () => {
    if (!currentUser?.email) { setTestEmailStatus("Your own account has no email on file — add one on the Personnel page first."); return; }
    setTestEmailStatus("Sending…");
    try {
      await notificationsApi.sendNotificationEmail(currentUser.email, "Lab QMS test email",
        `<p>Hi ${currentUser.name},</p><p>This is a test email from Lab QMS, sent from Settings to confirm notifications are working.</p>`);
      setTestEmailStatus(`Sent to ${currentUser.email} — check your inbox (and spam folder) in a minute.`);
    } catch (e) {
      setTestEmailStatus("Failed: " + e.message);
    }
  };

  const loadKeys = async () => {
    setLoading(true);
    try {
      setKeys(await machineKeysApi.listMachineApiKeys());
    } catch (e) {
      console.error("Could not load API keys:", e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadKeys(); }, []);

  const handleCreate = async () => {
    if (!label.trim()) return;
    setCreating(true); setCreateError("");
    try {
      const result = await machineKeysApi.createMachineApiKey(label.trim(), restrictToMachine, activeLaboratoryId);
      setJustCreatedKey(result);
      setLabel(""); setRestrictToMachine(""); setShowCreateForm(false);
      await loadKeys();
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!confirm("Revoke this API key? Anything using it to submit QC results will stop working immediately.")) return;
    try {
      await machineKeysApi.revokeMachineApiKey(id);
      await loadKeys();
    } catch (e) {
      alert("Could not revoke this key.\n\n" + e.message);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: COLORS.navy }}>Settings</h1>
      <p className="text-sm text-gray-500 mb-6">Admin-only configuration for Lab QMS.</p>

      <div className="bg-white rounded-lg border p-5 mb-6" style={{ borderColor: "#E1EBE8" }}>
        <div className="text-sm font-semibold mb-1" style={{ color: COLORS.navy }}>Laboratories</div>
        <p className="text-xs text-gray-500 mb-3">
          Each laboratory is a fully separate workspace — its own clause register, tasks, and NCs, with more modules
          following. Creating one automatically seeds all 34 ISO 15189:2022 clauses for it, ready to use immediately.
        </p>
        <div className="border rounded-md divide-y mb-3" style={{ borderColor: "#EEF3F1" }}>
          {laboratories.length === 0 && <div className="text-xs text-gray-400 px-3 py-3">No laboratories yet.</div>}
          {laboratories.map(lab => (
            <div key={lab.id} className="px-3 py-2 text-sm">{lab.name}</div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newLabName} onChange={e => setNewLabName(e.target.value)} placeholder="e.g. Biochemistry"
            className="text-sm border rounded-md px-3 py-1.5 flex-1" style={{ borderColor: "#D8E5E1" }} />
          <button disabled={creatingLab || !newLabName.trim()} onClick={async () => {
            setCreatingLab(true); setLabError("");
            try { await createLaboratoryAction(newLabName.trim()); setNewLabName(""); }
            catch (e) { setLabError(e.message); }
            finally { setCreatingLab(false); }
          }} className="text-sm px-4 py-1.5 rounded-md text-white disabled:opacity-50" style={{ background: COLORS.teal }}>
            {creatingLab ? "Creating…" : "Add laboratory"}
          </button>
        </div>
        {labError && <div className="text-xs mt-2" style={{ color: COLORS.red }}>{labError}</div>}
        <div className="text-[11px] text-gray-400 mt-2">Assign staff to laboratories from the Personnel page.</div>
      </div>


      <div className="bg-white rounded-lg border p-5 mb-6" style={{ borderColor: "#E1EBE8" }}>
        <div className="text-sm font-semibold mb-1" style={{ color: COLORS.navy }}>Machine data interface (IQC & EQAS)</div>
        <p className="text-xs text-gray-500 mb-3">
          A one-way connection: any analyser — not tied to any specific brand or model — or middleware sitting between it and
          the internet, can push a result directly into Lab QMS using an API key below. Nothing is ever sent back to the
          machine. What the instrument itself needs, to actually reach these endpoints, depends on that specific machine —
          some can call a web address directly, others need translator/gateway software in between.
        </p>
        <div className="p-3 rounded-md text-xs mb-4" style={{ background: COLORS.mint }}>
          <div className="font-medium mb-1" style={{ color: COLORS.navy }}>IQC endpoint</div>
          <code className="block mb-2 break-all">{iqcEndpointUrl}</code>
          <div className="font-medium mb-1" style={{ color: COLORS.navy }}>JSON body</div>
          <pre className="whitespace-pre-wrap mb-2">{`{
  "machineName": "exact QC machine name in Lab QMS",
  "parameter": "exact parameter name",
  "level": "Level 1 (Low)" | "Level 2 (Normal)" | "Level 3 (High)",
  "lotNumber": "optional, disambiguates if needed",
  "value": 5.4,
  "date": "optional, defaults to today",
  "time": "optional"
}`}</pre>
          <div className="font-medium mb-1" style={{ color: COLORS.navy }}>EQAS endpoint</div>
          <code className="block mb-2 break-all">{eqaEndpointUrl}</code>
          <div className="font-medium mb-1" style={{ color: COLORS.navy }}>JSON body</div>
          <pre className="whitespace-pre-wrap">{`{
  "discipline": "Hematology" | "Biochemistry" | "Immunochemistry",
  "machineName": "optional",
  "parameter": "e.g. Hemoglobin",
  "provider": "optional, e.g. RIQAS",
  "cycle": "optional, e.g. 2026 Round 4",
  "labResult": 12.4,
  "peerMean": 12.6,
  "peerSD": 0.5,
  "dateReceived": "optional, defaults to today"
}`}</pre>
          <div className="text-[11px] text-gray-500 mt-2">
            Both: header <code>X-API-Key: (your key)</code>, method POST. Machine/parameter/level/lot names must exactly match what's already
            set up in Lab QMS — nothing is ever auto-created. peerMean/peerSD for EQAS are optional — if omitted, the result is stored
            for someone to complete once the provider's report arrives. Every result, from either endpoint, arrives requiring the same
            human review as manual entry — this interface never bypasses that.
          </div>
        </div>

        {justCreatedKey && (
          <div className="p-3 rounded-md mb-4 border" style={{ borderColor: COLORS.amber, background: "#FFFBEB" }}>
            <div className="text-xs font-semibold mb-1" style={{ color: COLORS.amber }}>Copy this key now — it will never be shown again</div>
            <code className="block text-sm font-mono break-all mb-2">{justCreatedKey.plainKey}</code>
            <button onClick={() => { navigator.clipboard?.writeText(justCreatedKey.plainKey); }} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>Copy</button>
            <button onClick={() => setJustCreatedKey(null)} className="text-xs px-2 py-1 rounded-md text-gray-400 ml-2">Dismiss</button>
          </div>
        )}

        <button onClick={() => setShowCreateForm(v => !v)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-md text-white mb-3" style={{ background: COLORS.teal }}>
          <Plus size={14} /> Generate new API key
        </button>
        {showCreateForm && (
          <div className="border rounded-md p-3 mb-4" style={{ borderColor: "#EEF3F1" }}>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <Field label="Label"><input className={inputCls} style={inputStyle} value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Ozelle EHBT-75 QC feed" /></Field>
              <Field label="Restrict to one machine (optional)">
                <select className={inputCls} style={inputStyle} value={restrictToMachine} onChange={e => setRestrictToMachine(e.target.value)}>
                  <option value="">Any machine</option>
                  {qcMachines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
            </div>
            {createError && <div className="text-xs mb-2" style={{ color: COLORS.red }}>{createError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreateForm(false)} className="text-xs px-3 py-1.5 text-gray-500">Cancel</button>
              <button disabled={creating} onClick={handleCreate} className="text-xs px-3 py-1.5 rounded-md text-white disabled:opacity-50" style={{ background: COLORS.teal }}>
                {creating ? "Generating…" : "Generate key"}
              </button>
            </div>
          </div>
        )}

        <div className="border rounded-md divide-y" style={{ borderColor: "#EEF3F1" }}>
          {loading && <div className="text-xs text-gray-400 px-3 py-3">Loading…</div>}
          {!loading && keys.length === 0 && <div className="text-xs text-gray-400 px-3 py-3">No API keys yet.</div>}
          {!loading && keys.map(k => {
            const machine = qcMachines.find(m => m.id === k.qc_machine_id);
            return (
              <div key={k.id} className="px-3 py-2 flex items-center justify-between">
                <div>
                  <div className="text-sm">{k.label} <span className="text-xs text-gray-400 font-mono">({k.key_prefix}…)</span></div>
                  <div className="text-xs text-gray-400">
                    {machine ? `Restricted to ${machine.name}` : "Any machine"} · created {k.created_at.slice(0, 10)}
                    {k.last_used_at ? ` · last used ${k.last_used_at.slice(0, 10)}` : " · never used"}
                    {k.revoked_at ? " · " : ""}{k.revoked_at && <span style={{ color: COLORS.red }}>revoked {k.revoked_at.slice(0, 10)}</span>}
                  </div>
                </div>
                {!k.revoked_at && <button onClick={() => handleRevoke(k.id)} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: COLORS.red, color: COLORS.red }}>Revoke</button>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-5 mb-6" style={{ borderColor: "#E1EBE8" }}>
        <div className="text-sm font-semibold mb-1" style={{ color: COLORS.navy }}>Email sending status</div>
        <p className="text-xs text-gray-500 mb-3">
          Live check against Resend's own records — this can only look, never change anything on Resend or your domain registrar.
        </p>
        {resendStatusLoading ? (
          <div className="text-xs text-gray-400">Checking…</div>
        ) : !resendStatus?.configured ? (
          <div className="p-3 rounded-md text-xs" style={{ background: "#FEF2F2", color: COLORS.red }}>
            Not working: {resendStatus?.reason || "unknown reason"}
          </div>
        ) : resendStatus.domains.length === 0 ? (
          <div className="p-3 rounded-md text-xs" style={{ background: "#FEF2F2", color: COLORS.red }}>
            API key is valid, but no sending domain has been added in Resend yet.
          </div>
        ) : (
          <div className="border rounded-md divide-y" style={{ borderColor: "#EEF3F1" }}>
            {resendStatus.domains.map(d => (
              <div key={d.name} className="px-3 py-2 flex items-center justify-between text-xs">
                <span>{d.name}</span>
                <Badge color={d.status === "verified" ? COLORS.teal : COLORS.amber}>{d.status}</Badge>
              </div>
            ))}
          </div>
        )}
        <button onClick={checkResendStatus} className="text-xs text-gray-400 underline mt-2">Re-check now</button>

        <div className="mt-4 pt-4 border-t" style={{ borderColor: "#EEF3F1" }}>
          <button onClick={() => setShowSetupChecklist(v => !v)} className="text-xs underline" style={{ color: COLORS.teal }}>
            {showSetupChecklist ? "Hide" : "Show"} setup reference (domain, DNS, API key — done outside this app)
          </button>
          {showSetupChecklist && (
            <div className="text-xs text-gray-600 mt-2 space-y-1.5">
              <p><strong>These steps happen on Cloudflare and Resend directly, not in Lab QMS</strong> — this app has no login access to either, by design.</p>
              <p>1. Register a domain (e.g. Cloudflare Registrar).</p>
              <p>2. In Resend → Domains → Add Domain → use a subdomain like <code>notify.yourdomain.com</code>.</p>
              <p>3. Copy the DNS records Resend shows, add them at your registrar's DNS settings.</p>
              <p>4. In Resend, click Verify — check the status above once it's done.</p>
              <p>5. Generate an API key in Resend → API Keys.</p>
              <p>6. From Terminal, in the project folder: <code>supabase secrets set RESEND_API_KEY=your_key</code> — this is the only step that connects Resend to this app.</p>
              <p>7. If the key is ever regenerated, only step 6 needs repeating.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-5 mb-6" style={{ borderColor: "#E1EBE8" }}>
        <div className="text-sm font-semibold mb-1" style={{ color: COLORS.navy }}>Email notifications</div>
        <p className="text-xs text-gray-500 mb-3">
          Turn individual notification emails on or off. The actual sending account (Resend, and its API key) is configured
          separately as a Supabase secret, deliberately outside the app itself — a key that could be read or changed from
          this page would defeat the purpose of keeping it secret in the first place.
        </p>
        <div className="border rounded-md divide-y mb-4" style={{ borderColor: "#EEF3F1" }}>
          {NOTIFICATION_EVENT_LABELS.map(({ key, label: eventLabel }) => {
            const enabled = notificationSettings[key] !== false;
            return (
              <div key={key} className="px-3 py-2 flex items-center justify-between">
                <span className="text-sm">{eventLabel}</span>
                <button onClick={() => toggleNotificationSettingAction(key, enabled)}
                  className="text-xs px-3 py-1 rounded-full"
                  style={{ background: enabled ? COLORS.teal : "#E1EBE8", color: enabled ? "white" : "#9AA5A3" }}>
                  {enabled ? "On" : "Off"}
                </button>
              </div>
            );
          })}
        </div>
        <button onClick={sendTestEmail} className="text-sm px-3 py-1.5 rounded-md border" style={{ borderColor: COLORS.teal, color: COLORS.teal }}>
          Send test email to myself
        </button>
        {testEmailStatus && <div className="text-xs mt-2 text-gray-500">{testEmailStatus}</div>}
      </div>
    </div>
  );
}
