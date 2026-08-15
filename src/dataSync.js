// Bridges the app's existing "local array, replace the whole thing" update
// pattern with real per-row Supabase inserts/updates/deletes. Each updateX()
// in App.jsx still receives the full next array the way it always did — this
// module figures out what actually changed and issues the right calls.

/**
 * @param {Array} prev - current in-memory list (UI shape, camelCase)
 * @param {Array} next - the new full list a component just constructed
 * @param {(item:any)=>any} toDb - maps one UI-shaped item to DB column names
 * @param {(row:any)=>any} fromDb - maps one DB row back to UI shape
 * @param {{create:Function, update:Function, remove:Function}} api
 * @returns {Promise<Array>} the reconciled list, in UI shape, with server-assigned fields filled in
 */
export async function syncList({ prev, next, toDb, fromDb, api }) {
  const prevById = Object.fromEntries(prev.map(x => [x.id, x]));
  const nextIds = new Set(next.map(x => x.id));

  const added = next.filter(x => !prevById[x.id]);
  const removed = prev.filter(x => !nextIds.has(x.id));
  const modified = next.filter(x => prevById[x.id] && JSON.stringify(x) !== JSON.stringify(prevById[x.id]));

  const results = [...next];
  const replace = (id, row) => {
    const idx = results.findIndex(x => x.id === id);
    if (idx >= 0) results[idx] = fromDb(row);
  };

  for (const item of removed) await api.remove(item.id);
  for (const item of added) replace(item.id, await api.create(toDb(item)));
  for (const item of modified) replace(item.id, await api.update(item.id, toDb(item)));

  return results;
}

/** Same idea as syncList but for an OBJECT keyed by business id (clauseStatus's shape). */
export async function syncClauseStatus({ prev, next, upsert }) {
  const changedKeys = Object.keys(next).filter(k => JSON.stringify(next[k]) !== JSON.stringify(prev[k]));
  const result = { ...next };
  for (const clauseId of changedKeys) {
    const row = await upsert(clauseId, next[clauseId]);
    result[clauseId] = rowToClauseStatus(row);
  }
  return result;
}

// ---------------- name <-> id lookup helpers ----------------
// The UI stores "assigned to / owner / operator / performed by / verified by /
// raised by" as a PERSON'S NAME (a plain string) throughout, since that's what
// every <select> in the app populates and displays. The database stores a
// proper uuid foreign key instead. These helpers convert between the two,
// given the current personnel list.
export const nameToId = (personnel, name) => personnel.find(p => p.name === name)?.id || null;
export const idToName = (personnel, id) => personnel.find(p => p.id === id)?.name || "";

// ---------------- personnel ----------------
export const personnelFromDb = (row) => ({
  id: row.id,
  name: row.name,
  role: row.job_title || "",
  email: row.email || "",
  recordCardNumber: row.record_card_number || "",
  password: "",              // never round-tripped — Supabase Auth owns credentials
  accessRole: row.access_role || "Technologist",
});
/** For UPDATING an existing person's non-credential fields only. */
export const personnelToDb = (p) => ({
  name: p.name,
  job_title: p.role || null,
  email: p.email || null,
  record_card_number: p.recordCardNumber,
  access_role: p.accessRole,
});

// ---------------- clause_status ----------------
export const rowToClauseStatus = (row) => ({
  id: row.id,
  status: row.status,
  owner: row._ownerName || "",   // filled in by the caller after a personnel lookup — see App.jsx
  ownerId: row.owner_id || null,
  lastReviewed: row.last_reviewed || "",
  notes: row.notes || "",
  evidenceDocumentId: row.evidence_document_id || "",
});

// ---------------- clause_evidence (many-to-many clause <-> document) ----------------
export const clauseEvidenceFromDb = (row, personnel) => ({
  id: row.id,
  clauseId: row.clause_id,
  documentId: row.document_id,
  addedBy: idToName(personnel, row.added_by),
  addedAt: row.added_at,
});

// ---------------- equipment_downtime ----------------
export const downtimeFromDb = (row, personnel) => ({
  id: row.id,
  equipmentId: row.equipment_id,
  reason: row.reason,
  startedAt: row.started_at,
  resolvedAt: row.resolved_at || "",
  resolutionNotes: row.resolution_notes || "",
  reportedBy: idToName(personnel, row.reported_by),
});

// ---------------- tasks ----------------
export const taskFromDb = (row, personnel) => ({
  id: row.id,
  title: row.title,
  clauseId: row.clause_id || "",
  assignedTo: idToName(personnel, row.assigned_to),
  dueDate: row.due_date || "",
  dueTime: row.due_time || "",
  priority: row.priority,
  status: row.status,
  createdAt: row.created_at,
  isRecurring: row.is_recurring || false,
  recurrenceIntervalDays: row.recurrence_interval_days || null,
  recurrenceParentId: row.recurrence_parent_id || null,
  completionApproved: row.completion_approved || false,
  approvedBy: idToName(personnel, row.approved_by),
  approvedAt: row.approved_at || "",
});
export const taskToDb = (t, personnel) => ({
  title: t.title,
  clause_id: t.clauseId || null,
  assigned_to: nameToId(personnel, t.assignedTo),
  due_date: t.dueDate || null,
  due_time: t.dueTime || null,
  priority: t.priority,
  status: t.status,
  is_recurring: t.isRecurring || false,
  recurrence_interval_days: t.recurrenceIntervalDays || null,
  recurrence_parent_id: t.recurrenceParentId || null,
});

// ---------------- task_comments ----------------
export const taskCommentFromDb = (row, personnel) => ({
  id: row.id,
  taskId: row.task_id,
  authorName: idToName(personnel, row.author_id),
  comment: row.comment,
  createdAt: row.created_at,
});

// ---------------- task_templates ----------------
export const taskTemplateFromDb = (row, personnel) => ({
  id: row.id,
  title: row.title,
  defaultPriority: row.default_priority,
  defaultClauseId: row.default_clause_id || "",
  isRecurring: row.is_recurring || false,
  recurrenceIntervalDays: row.recurrence_interval_days || null,
  createdBy: idToName(personnel, row.created_by),
});

// ---------------- nonconformities ----------------
export const ncFromDb = (row, personnel) => ({
  id: row.id,
  ncNumber: row.nc_number,
  title: row.title,
  description: row.description || "",
  clauseId: row.clause_id || "",
  severity: row.severity,
  source: row.source || "",
  status: row.status,
  assignedTo: idToName(personnel, row.assigned_to),
  raisedBy: idToName(personnel, row.raised_by),
  verifiedBy: idToName(personnel, row.verified_by),
  rootCause: row.root_cause || "",
  correctiveAction: row.corrective_action || "",
  preventiveAction: row.preventive_action || "",
  evidence: row.evidence || "",
  dueDate: row.due_date || "",
  dueTime: row.due_time || "",
  closedDate: row.closed_date || "",
  dateRaised: row.date_raised || (row.created_at || "").slice(0, 10),
  effectivenessCheckDue: row.effectiveness_check_due || "",
  effectivenessCheckResult: row.effectiveness_check_result || "",
  effectivenessNotes: row.effectiveness_notes || "",
  effectivenessVerifiedBy: idToName(personnel, row.effectiveness_verified_by),
  effectivenessVerifiedAt: row.effectiveness_verified_at || "",
  relatedNcId: row.related_nc_id || "",
});
export const ncToDb = (n, personnel) => ({
  nc_number: n.ncNumber,
  title: n.title,
  description: n.description || null,
  clause_id: n.clauseId || null,
  severity: n.severity || null,
  source: n.source || null,
  status: n.status,
  assigned_to: nameToId(personnel, n.assignedTo),
  raised_by: nameToId(personnel, n.raisedBy),
  verified_by: nameToId(personnel, n.verifiedBy),
  root_cause: n.rootCause || null,
  corrective_action: n.correctiveAction || null,
  preventive_action: n.preventiveAction || null,
  evidence: n.evidence || null,
  due_date: n.dueDate || null,
  due_time: n.dueTime || null,
  closed_date: n.closedDate || null,
  date_raised: n.dateRaised || null,
  effectiveness_check_due: n.effectivenessCheckDue || null,
  effectiveness_check_result: n.effectivenessCheckResult || null,
  effectiveness_notes: n.effectivenessNotes || null,
  effectiveness_verified_by: nameToId(personnel, n.effectivenessVerifiedBy),
  effectiveness_verified_at: n.effectivenessVerifiedAt || null,
  related_nc_id: n.relatedNcId || null,
});

// ---------------- risks (Clause 5.6) ----------------
export const riskFromDb = (row, personnel) => ({
  id: row.id,
  title: row.title,
  description: row.description || "",
  category: row.category || "",
  clauseId: row.clause_id || "",
  likelihood: row.likelihood,
  impact: row.impact,
  riskLevel: row.risk_level,
  mitigation: row.mitigation || "",
  owner: idToName(personnel, row.owner_id),
  status: row.status,
  identifiedDate: row.identified_date || "",
  lastReviewed: row.last_reviewed || "",
  nextReviewDate: row.next_review_date || "",
});
export const riskToDb = (r, personnel) => ({
  title: r.title,
  description: r.description || null,
  category: r.category || null,
  clause_id: r.clauseId || null,
  likelihood: r.likelihood,
  impact: r.impact,
  mitigation: r.mitigation || null,
  owner_id: nameToId(personnel, r.owner),
  status: r.status,
  identified_date: r.identifiedDate || null,
  last_reviewed: r.lastReviewed || null,
  next_review_date: r.nextReviewDate || null,
});

// ---------------- management_reviews (Clause 8.9) ----------------
export const managementReviewFromDb = (row, personnel) => ({
  id: row.id,
  reviewDate: row.review_date || "",
  attendees: row.attendees || "",
  metricsSnapshot: row.metrics_snapshot || null,
  inputsReviewed: row.inputs_reviewed || "",
  decisions: row.decisions || "",
  actionsArising: row.actions_arising || "",
  conductedBy: idToName(personnel, row.conducted_by),
  createdAt: row.created_at,
});
export const managementReviewToDb = (m, personnel) => ({
  review_date: m.reviewDate || null,
  attendees: m.attendees || null,
  metrics_snapshot: m.metricsSnapshot || null,
  inputs_reviewed: m.inputsReviewed || null,
  decisions: m.decisions || null,
  actions_arising: m.actionsArising || null,
  conducted_by: nameToId(personnel, m.conductedBy),
});

// ---------------- competency_records ----------------
export const competencyFromDb = (row, personnel) => ({
  id: row.id,
  personnelName: idToName(personnel, row.personnel_id),
  type: row.type,
  title: row.title,
  method: row.method || "",
  assessor: row.assessor || "",
  result: row.result || "",
  date: row.date || "",
  dueDate: row.due_date || "",
  notes: row.notes || "",
  assesseeConfirmed: row.assessee_confirmed || false,
  assesseeConfirmedAt: row.assessee_confirmed_at || "",
});
export const competencyToDb = (c, personnel) => ({
  personnel_id: nameToId(personnel, c.personnelName),
  type: c.type,
  title: c.title,
  method: c.method || null,
  assessor: c.assessor || null,
  result: c.result || null,
  date: c.date || null,
  due_date: c.dueDate || null,
  notes: c.notes || null,
});

// ---------------- equipment ----------------
export const equipmentFromDb = (row) => ({
  id: row.id,
  name: row.name,
  model: row.model || "",
  serialNumber: row.serial_number || "",
  category: row.category || "",
  location: row.location || "",
  commissionDate: row.commission_date || "",
  status: row.status,
  qcMachineId: row.qc_machine_id || "",
});
export const equipmentToDb = (e) => ({
  name: e.name,
  model: e.model || null,
  serial_number: e.serialNumber || null,
  category: e.category || null,
  location: e.location || null,
  commission_date: e.commissionDate || null,
  status: e.status,
  qc_machine_id: e.qcMachineId || null,
});

// ---------------- equipment_records ----------------
export const equipmentRecordFromDb = (row, personnel) => ({
  id: row.id,
  equipmentId: row.equipment_id,
  type: row.type,
  date: row.date || "",
  dueDate: row.due_date || "",
  performedBy: idToName(personnel, row.performed_by),
  performedByExternal: row.performed_by_external || "",
  result: row.result || "",
  documentRef: row.document_ref || "",
  notes: row.notes || "",
  url: row.url || "",
  storagePath: row.storage_path || "",
});
export const equipmentRecordToDb = (r, personnel) => ({
  equipment_id: r.equipmentId,
  type: r.type,
  date: r.date || null,
  due_date: r.dueDate || null,
  performed_by: r.performedByExternal ? null : nameToId(personnel, r.performedBy),
  performed_by_external: r.performedByExternal || null,
  result: r.result || null,
  document_ref: r.documentRef || null,
  notes: r.notes || null,
  url: r.url || null,
  storage_path: r.storagePath || null,
});

// ---------------- qc_machines / qc_parameters / qc_controls ----------------
export const machineFromDb = (row) => ({ id: row.id, name: row.name, model: row.model || "", discipline: row.discipline });
export const machineToDb = (m) => ({ name: m.name, model: m.model || null, discipline: m.discipline });

export const parameterFromDb = (row) => ({ id: row.id, machineId: row.machine_id, name: row.name, unit: row.unit || "" });
export const parameterToDb = (p) => ({ machine_id: p.machineId, name: p.name, unit: p.unit || null });

export const controlFromDb = (row) => ({
  id: row.id, parameterId: row.parameter_id, level: row.level, lotNumber: row.lot_number || "",
  mean: Number(row.mean), sd: Number(row.sd), expiryDate: row.expiry_date || "",
});
export const controlToDb = (c) => ({
  parameter_id: c.parameterId, level: c.level, lot_number: c.lotNumber || null,
  mean: c.mean, sd: c.sd, expiry_date: c.expiryDate || null,
});

// ---------------- qc_runs ----------------
export const runFromDb = (row, personnel) => ({
  id: row.id,
  controlId: row.control_id,
  date: row.date,
  time: row.time || "",
  value: Number(row.value),
  operator: idToName(personnel, row.operator),
  authorized: row.authorized,
  authorizedByName: idToName(personnel, row.authorized_by),
  authorizedByInitials: initialsOfLocal(idToName(personnel, row.authorized_by)),
  authorizedAt: row.authorized_at || "",
  comment: row.comment || "",
});
export const runToDb = (r, personnel) => ({
  control_id: r.controlId,
  date: r.date,
  time: r.time || null,
  value: r.value,
  operator: nameToId(personnel, r.operator),
  comment: r.comment || null,
  // authorized / authorized_by / authorized_at are deliberately never sent —
  // only authorize_qc_run() (called via authorizeRun in src/api/qc.js) can set them.
});
function initialsOfLocal(name) {
  return (name || "").trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 3);
}

// ---------------- eqa_events ----------------
export const eqaFromDb = (row) => ({
  id: row.id,
  discipline: row.discipline,
  machineId: row.machine_id || "",
  parameter: row.parameter,
  provider: row.provider || "",
  cycle: row.cycle || "",
  dateReceived: row.date_received || "",
  labResult: row.lab_result,
  peerMean: row.peer_mean,
  peerSD: row.peer_sd,
  sdi: row.sdi,
  evaluation: row.evaluation,
  notes: row.notes || "",
  linkedNcId: row.linked_nc_id || "",
  nextCycleDate: row.next_cycle_date || "",
});
export const eqaToDb = (e) => ({
  discipline: e.discipline,
  machine_id: e.machineId || null,
  parameter: e.parameter,
  provider: e.provider || null,
  cycle: e.cycle || null,
  date_received: e.dateReceived || null,
  lab_result: e.labResult === "" ? null : e.labResult,
  peer_mean: e.peerMean === "" ? null : e.peerMean,
  peer_sd: e.peerSD === "" ? null : e.peerSD,
  evaluation: e.evaluation || "Not yet received",
  notes: e.notes || null,
  linked_nc_id: e.linkedNcId || null,
  next_cycle_date: e.nextCycleDate || null,
});

// ---------------- documents ----------------
export const documentFromDb = (row, personnel) => ({
  id: row.id,
  title: row.title,
  category: row.category || "",
  relatedTo: row.related_to || "",
  url: row.url,
  storagePath: row.storage_path || "",
  uploadedBy: idToName(personnel, row.uploaded_by),
  uploadedAt: (row.uploaded_at || "").slice(0, 10),
  notes: row.notes || "",
  documentCode: row.document_code || "",
  version: row.version || 1,
  isCurrent: row.is_current !== false,
  personnelName: idToName(personnel, row.personnel_id),
  nextReviewDate: row.next_review_date || "",
});
export const documentToDb = (d, personnel) => ({
  title: d.title,
  category: d.category || null,
  related_to: d.relatedTo || null,
  url: d.url || null,
  storage_path: d.storagePath || null,
  uploaded_by: nameToId(personnel, d.uploadedBy),
  notes: d.notes || null,
  document_code: d.documentCode || null,
  personnel_id: nameToId(personnel, d.personnelName),
  next_review_date: d.nextReviewDate || null,
});

// ---------------- document_acknowledgments ----------------
export const acknowledgmentFromDb = (row, personnel) => ({
  id: row.id,
  documentId: row.document_id,
  personnelName: idToName(personnel, row.personnel_id),
  acknowledgedAt: row.acknowledged_at,
});
