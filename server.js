const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");
const { spawnSync } = require("child_process");
let createClient = null;
try {
  ({ createClient } = require("@supabase/supabase-js"));
} catch {}
let PDFDocument = null;
try {
  PDFDocument = require("pdfkit");
} catch {}

loadLocalEnv();

const PORT = process.env.PORT || 4173;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");
const PROJECTS = path.join(DATA, "projects");
const UPLOADS = path.join(DATA, "uploads");
const MASTER_LOOKUPS = path.join(DATA, "master-lookups.json");
const MASTER_PRICE_LIST = path.join(DATA, "master-price-list.json");
const QUOTATION_TEMPLATE = path.join(DATA, "quotation-template.docx");
const INVENTORY_FILE = path.join(DATA, "inventory.json");
const DELIVERY_NOTE_PDF_SCRIPT = path.join(ROOT, "scripts", "delivery_note_pdf.py");
const PURCHASE_ORDERS_FILE = path.join(DATA, "purchase-orders.json");
const PURCHASE_ORDER_PDF_SCRIPT = path.join(ROOT, "scripts", "purchase_order_pdf.py");
const SALES_CRM_FILE = path.join(DATA, "sales-crm.json");
const SALES_QUOTATION_PDF_SCRIPT = path.join(ROOT, "scripts", "sales_quotation_pdf.py");
const SETTINGS_FILE = path.join(DATA, "settings.json");
const SETTINGS_UPLOADS = path.join(DATA, "settings-uploads");
const PYTHON_EXE = process.env.PYTHON_EXE || "C:\\Users\\HP\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || "app_data";
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "comfortzone-files";
const DEFAULT_PURCHASE_NOTES = `1. Invoice should be attached with delivery note signed by site supervisor.
2. Attach LPO copy along with invoice.
3. Delivery to be made as per schedule instruction provided to you.`;

function loadLocalEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const splitIndex = trimmed.indexOf("=");
    if (splitIndex <= 0) continue;
    const key = trimmed.slice(0, splitIndex).trim();
    let value = trimmed.slice(splitIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

if ((SUPABASE_URL || SUPABASE_KEY) && !createClient) {
  throw new Error("Supabase environment variables are set, but @supabase/supabase-js is not installed.");
}

const supabase = SUPABASE_URL && SUPABASE_KEY && createClient
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null;
const USE_SUPABASE = !!supabase;

if (!USE_SUPABASE) {
  for (const dir of [DATA, PROJECTS, UPLOADS, SETTINGS_UPLOADS]) fs.mkdirSync(dir, { recursive: true });
}

const sessions = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel"
};

function id() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
}

function passwordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password || ""), salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const check = passwordHash(password, salt).split(":")[1];
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(check, "hex"));
}

function localReadJson(file, fallbackFactory, normalize = value => value) {
  if (!fs.existsSync(file)) return normalize(fallbackFactory());
  try {
    return normalize(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return normalize(fallbackFactory());
  }
}

async function readSupabaseValue(key) {
  const { data, error } = await supabase
    .from(SUPABASE_TABLE)
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(`Supabase read failed for ${key}: ${error.message}`);
  return data ? data.value : null;
}

async function writeSupabaseValue(key, value) {
  const { error } = await supabase
    .from(SUPABASE_TABLE)
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(`Supabase write failed for ${key}: ${error.message}`);
}

async function readStore(key, file, fallbackFactory, normalize = value => value) {
  if (USE_SUPABASE) {
    const value = await readSupabaseValue(key);
    if (value === null || value === undefined) {
      const seed = normalize(fallbackFactory());
      await writeSupabaseValue(key, seed);
      return seed;
    }
    return normalize(value);
  }
  return localReadJson(file, fallbackFactory, normalize);
}

async function writeStore(key, file, value) {
  if (USE_SUPABASE) {
    await writeSupabaseValue(key, value);
    return;
  }
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function storagePath(scope, storedName) {
  return `${String(scope || "uploads").replace(/^\/+|\/+$/g, "")}/${storedName}`;
}

function localUploadPath(scope, storedName) {
  return path.join(UPLOADS, ...String(scope || "uploads").split("/"), storedName);
}

async function saveUpload(scope, storedName, body, mimeType) {
  if (USE_SUPABASE) {
    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath(scope, storedName), body, {
        contentType: mimeType || "application/octet-stream",
        upsert: true
      });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    return;
  }
  const file = localUploadPath(scope, storedName);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

async function readUpload(scope, storedName) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(storagePath(scope, storedName));
    if (error) throw new Error(`Supabase download failed: ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
  }
  const file = localUploadPath(scope, storedName);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file);
}

async function deleteUpload(scope, storedName) {
  if (!storedName) return;
  if (USE_SUPABASE) {
    await supabase.storage.from(SUPABASE_BUCKET).remove([storagePath(scope, storedName)]);
    return;
  }
  fs.rmSync(localUploadPath(scope, storedName), { force: true });
}

async function sendStoredUpload(res, upload, scope) {
  const bytes = await readUpload(scope, upload.storedName);
  if (!bytes) return notFound(res);
  res.writeHead(200, {
    "Content-Type": upload.mimeType || "application/octet-stream",
    "Content-Disposition": `inline; filename="${upload.originalName.replace(/"/g, "")}"`
  });
  return res.end(bytes);
}

function defaultSettings() {
  return {
    company: {
      name: "Comfort Zone AC Devices Tr. LLC",
      address: "Showroom 1, Industrial Area 18, Sharjah",
      trn: "",
      phone: "0561772530",
      email: "info@comfortzoneuae.com",
      website: "www.comfortzoneuae.com",
      logoUploadId: ""
    },
    company2: {
      name: "",
      address: "",
      trn: "",
      phone: "",
      email: "",
      website: "",
      logoUploadId: ""
    },
    users: [
      {
        id: "admin",
        name: "Admin User",
        role: "Admin",
        email: "admin@comfortzone.local",
        passwordHash: passwordHash("admin123"),
        active: true
      }
    ],
    attachments: []
  };
}

function normalizeSettings(parsed = {}) {
  const fallback = defaultSettings();
  const settings = {
    ...fallback,
    ...parsed,
    company: { ...fallback.company, ...(parsed.company || {}) },
    company2: { ...fallback.company2, ...(parsed.company2 || {}) },
    users: Array.isArray(parsed.users) && parsed.users.length ? parsed.users : fallback.users,
    attachments: Array.isArray(parsed.attachments) ? parsed.attachments : []
  };
  if (!settings.users.some(user => String(user.role).toLowerCase() === "admin")) settings.users.unshift(fallback.users[0]);
  return settings;
}

async function readSettings() {
  return readStore("settings", SETTINGS_FILE, defaultSettings, normalizeSettings);
}

async function writeSettings(settings) {
  await writeStore("settings", SETTINGS_FILE, settings);
}

function publicSettings(settings) {
  return {
    company: settings.company,
    company2: settings.company2,
    attachments: settings.attachments,
    users: (settings.users || []).map(({ passwordHash: _passwordHash, ...user }) => user)
  };
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").map(part => part.trim()).filter(Boolean).map(part => {
    const index = part.indexOf("=");
    if (index < 0) return [decodeURIComponent(part), ""];
    return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
  }));
}

async function sessionUser(req) {
  const token = parseCookies(req).cz_session;
  if (!token || !sessions.has(token)) return null;
  const session = sessions.get(token);
  const settings = await readSettings();
  const user = (settings.users || []).find(item => item.id === session.userId && item.active !== false);
  if (!user) {
    sessions.delete(token);
    return null;
  }
  return { id: user.id, name: user.name, role: user.role, email: user.email };
}

function isAdmin(user) {
  return String(user?.role || "").toLowerCase() === "admin";
}

function sendAuthRequired(res) {
  return send(res, 401, { error: "Login required" });
}

function sendForbidden(res) {
  return send(res, 403, { error: "Admin access required" });
}

function projectPath(projectId) {
  return path.join(PROJECTS, `${projectId}.json`);
}

async function readProject(projectId) {
  if (USE_SUPABASE) {
    const value = await readSupabaseValue(`project:${projectId}`);
    return value ? hydrateProject(value) : null;
  }
  const file = projectPath(projectId);
  if (!fs.existsSync(file)) return null;
  return hydrateProject(JSON.parse(fs.readFileSync(file, "utf8")));
}

async function writeProject(project) {
  project.updatedAt = new Date().toISOString();
  if (USE_SUPABASE) {
    await writeSupabaseValue(`project:${project.id}`, project);
    return;
  }
  fs.writeFileSync(projectPath(project.id), JSON.stringify(project, null, 2));
}

async function deleteProject(projectId) {
  if (USE_SUPABASE) {
    const { error } = await supabase.from(SUPABASE_TABLE).delete().eq("key", `project:${projectId}`);
    if (error) throw new Error(`Supabase delete failed for project:${projectId}: ${error.message}`);
    return;
  }
  const file = projectPath(projectId);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

function defaultInventory() {
  return {
    settings: { nextDeliveryNo: "DN-2057" },
    models: [],
    customers: [],
    supplierDns: [],
    deliveryNotes: [],
    uploads: []
  };
}

function normalizeInventory(parsed = {}) {
  return { ...defaultInventory(), ...parsed };
}

async function readInventory() {
  return readStore("inventory", INVENTORY_FILE, defaultInventory, normalizeInventory);
}

async function writeInventory(inventory) {
  await writeStore("inventory", INVENTORY_FILE, inventory);
}

function defaultPurchaseOrders() {
  return {
    settings: { nextPoNo: `PO-${new Date().getFullYear()}-0001` },
    orders: [],
    suppliers: [],
    uploads: []
  };
}

function normalizePurchaseOrders(parsed = {}) {
  const store = {
    ...defaultPurchaseOrders(),
    ...parsed,
    settings: { ...defaultPurchaseOrders().settings, ...(parsed.settings || {}) },
    orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
    uploads: Array.isArray(parsed.uploads) ? parsed.uploads : []
  };
  store.settings.nextPoNo = nextPurchaseNoFromOrders(store.orders);
  return store;
}

async function readPurchaseOrders() {
  return readStore("purchase-orders", PURCHASE_ORDERS_FILE, defaultPurchaseOrders, normalizePurchaseOrders);
}

async function writePurchaseOrders(store) {
  await writeStore("purchase-orders", PURCHASE_ORDERS_FILE, store);
}

function defaultSalesCrm() {
  return {
    settings: { nextQuotationNo: `CZ-QTN-${new Date().getFullYear()}-0416`, nextEnquiryNo: `ENQ-${new Date().getFullYear()}-0001` },
    leads: [
      { id: id(), avatar: "AM", customer: "Mr. Ahmed Mansoor", phone: "+971 50 123 4567", requirement: "Daikin AC Supply & Install", projectType: "Villa Project", location: "Jumeirah 1, Dubai", source: "WhatsApp", status: "New Lead", followUp: "22 Jun 2026", priority: "Overdue" },
      { id: id(), avatar: "SL", customer: "Skyline Logistics", phone: "+971 4 445 2190", requirement: "Warehouse VRV Replacement", projectType: "Commercial", location: "Dubai Investment Park", source: "Website", status: "Contacted", followUp: "24 Jun 2026", priority: "Today" },
      { id: id(), avatar: "PN", customer: "Priya Nair", phone: "+971 55 901 2234", requirement: "Apartment ducted AC service", projectType: "Apartment", location: "JLT, Dubai", source: "Referral", status: "Site Visit", followUp: "25 Jun 2026", priority: "Planned" },
      { id: id(), avatar: "TN", customer: "TechNova Solutions", phone: "+971 4 777 1020", requirement: "Office maintenance contract", projectType: "Commercial", location: "Business Bay, Dubai", source: "Website", status: "Quotation Needed", followUp: "26 Jun 2026", priority: "Planned" }
    ],
    customers: [
      { id: id(), icon: "CO", name: "ABC Contracting LLC", type: "Commercial", contact: "Mr. Sameer Ahmad", role: "Procurement Manager", phone: "+971 50 123 4567", email: "sameer@abccontracting.ae", address: "Business Bay, Dubai", detail: "Tower A, Suite 1402", trn: "100234567890003" },
      { id: id(), icon: "EV", name: "Elite Villas Management", type: "Maintenance", contact: "Fatima Al Sayed", role: "Property Supervisor", phone: "+971 4 888 2345", email: "fatima@elitevillas.ae", address: "Palm Jumeirah, Dubai", detail: "Villa Cluster 6", trn: "100987654320003" },
      { id: id(), icon: "TN", name: "TechNova Solutions", type: "Commercial", contact: "Priya Nair", role: "Admin Manager", phone: "+971 55 612 9911", email: "admin@technova.ae", address: "JLT, Dubai", detail: "Cluster X", trn: "100675430000003" }
    ],
    projects: [
      { id: id(), name: "Villa AC Replacement - Jumeirah", customer: "ABC Contracting", location: "Jumeirah 1, Dubai", type: "Residential", requirement: "Supply & Installation", engineer: "Sarah Johnson", status: "Site Visit Done", date: "12 Oct 2026", value: "AED 128,500" },
      { id: id(), name: "Retail Mall Ducting Service", customer: "Majid Al Futtaim", location: "Mirdif, Dubai", type: "Commercial", requirement: "Repair / Service", engineer: "Michael Chen", status: "Quotation Sent", date: "14 Oct 2026", value: "AED 42,600" },
      { id: id(), name: "Office VRV Maintenance", customer: "TechNova Solutions", location: "JLT, Dubai", type: "Commercial", requirement: "AMC / Maintenance", engineer: "Arjun Singh", status: "Negotiation", date: "16 Oct 2026", value: "AED 88,900" }
    ],
    quotations: [
      { id: id(), no: "CZ-QTN-2026-0001-R2", revision: "2 Revisions", date: "18 May 2026", validity: "30 Days", salesperson: "Arjun Singh", customer: "Rahul Mehta", project: "Villa AC Replacement", location: "Dubai Marina, UAE", paymentTerms: "30 Days Credit", deliveryTime: "To be discussed", warranty: "", notes: "", items: [{ description: "Daikin AC Supply", qty: 1, unit: "Set", unitPrice: 119809.52 }], discount: 0, amount: 125800, status: "Revised" },
      { id: id(), no: "CZ-QTN-2026-0412", revision: "Fresh Quote", date: "19 May 2026", validity: "30 Days", salesperson: "Arjun Singh", customer: "GreenLeaf Apartments", project: "Ducted AC Supply", location: "Kondapur", paymentTerms: "30 Days Credit", deliveryTime: "To be discussed", warranty: "", notes: "", items: [{ description: "Ducted AC Unit", qty: 1, unit: "Set", unitPrice: 80190.48 }], discount: 0, amount: 84200, status: "Sent" },
      { id: id(), no: "CZ-QTN-2026-0413", revision: "Fresh Quote", date: "20 May 2026", validity: "30 Days", salesperson: "Arjun Singh", customer: "TechNova Solutions", project: "Office Maintenance", location: "JLT, Dubai", paymentTerms: "30 Days Credit", deliveryTime: "To be discussed", warranty: "", notes: "", items: [{ description: "Office Maintenance Contract", qty: 1, unit: "Nos", unitPrice: 59047.62 }], discount: 0, amount: 62000, status: "Approved" }
    ],
    followUps: [
      { id: id(), avatar: "RJ", customer: "Robert Jenkins", phone: "+1 555-0123", project: "HVAC Unit Replacement", quotation: "#QUO-8821", date: "Oct 20, 2026", due: "3 Days Overdue", type: "Call", status: "Overdue" },
      { id: id(), avatar: "SL", customer: "Sarah Lopez", phone: "+1 555-0987", project: "Ductless Mini-Split Install", quotation: "#QUO-8854", date: "Oct 23, 2026", due: "Today @ 2:00 PM", type: "Message", status: "Today" },
      { id: id(), avatar: "MA", customer: "Mr. Ahmed Mansoor", phone: "+971 50 123 4567", project: "Daikin AC Supply & Install", quotation: "CZ-QTN-2026-0415", date: "Oct 25, 2026", due: "Upcoming", type: "Site Visit", status: "Scheduled" }
    ]
  };
}

function normalizeSalesCrm(parsed = {}) {
  const fallback = defaultSalesCrm();
  return {
    settings: { ...fallback.settings, ...(parsed.settings || {}) },
    leads: Array.isArray(parsed.leads) ? parsed.leads : fallback.leads,
    customers: Array.isArray(parsed.customers) ? parsed.customers : fallback.customers,
    projects: Array.isArray(parsed.projects) ? parsed.projects : fallback.projects,
    quotations: Array.isArray(parsed.quotations) ? parsed.quotations : fallback.quotations,
    followUps: Array.isArray(parsed.followUps) ? parsed.followUps : fallback.followUps
  };
}

async function readSalesCrm() {
  return readStore("sales-crm", SALES_CRM_FILE, defaultSalesCrm, normalizeSalesCrm);
}

async function writeSalesCrm(store) {
  await writeStore("sales-crm", SALES_CRM_FILE, store);
}

function salesCustomerToInventoryCustomer(customer, existing = null) {
  return {
    id: existing?.id || customer.inventoryCustomerId || customer.id || id(),
    customerName: cleanCell(customer.name || customer.customerName || ""),
    contactPerson: cleanCell(customer.contact || customer.contactPerson || ""),
    phone: cleanCell(customer.phone || ""),
    email: cleanCell(customer.email || ""),
    address: cleanCell(customer.address || ""),
    defaultDeliveryLocation: cleanCell(customer.defaultDeliveryLocation || customer.detail || customer.address || "")
  };
}

function inventoryCustomerToSalesCustomer(customer, existing = null) {
  const name = cleanCell(customer.customerName || customer.name || "");
  return {
    id: existing?.id || customer.salesCustomerId || customer.id || id(),
    icon: initials(name),
    name,
    type: cleanCell(existing?.type || customer.type || "Commercial"),
    contact: cleanCell(customer.contactPerson || customer.contact || ""),
    role: cleanCell(existing?.role || customer.role || ""),
    phone: cleanCell(customer.phone || ""),
    email: cleanCell(customer.email || ""),
    address: cleanCell(customer.address || ""),
    detail: cleanCell(customer.defaultDeliveryLocation || customer.detail || customer.address || ""),
    trn: cleanCell(existing?.trn || customer.trn || "")
  };
}

function mergedInventoryCustomers(inventoryCustomers = [], salesCustomers = []) {
  const merged = [...inventoryCustomers];
  for (const customer of salesCustomers || []) {
    const name = cleanCell(customer.name || customer.customerName || "");
    if (!name) continue;
    const existingIndex = merged.findIndex(item => inventoryNorm(item.customerName) === inventoryNorm(name));
    const existing = existingIndex >= 0 ? merged[existingIndex] : null;
    const next = salesCustomerToInventoryCustomer(customer, existing);
    if (existing) merged[existingIndex] = { ...existing, ...next };
    else merged.push(next);
  }
  return merged.sort((a, b) => String(a.customerName || "").localeCompare(String(b.customerName || "")));
}

function mergedSalesCustomers(salesCustomers = [], inventoryCustomers = []) {
  const merged = [...salesCustomers];
  for (const customer of inventoryCustomers || []) {
    const name = cleanCell(customer.customerName || customer.name || "");
    if (!name) continue;
    const existingIndex = merged.findIndex(item => inventoryNorm(item.name) === inventoryNorm(name));
    const existing = existingIndex >= 0 ? merged[existingIndex] : null;
    const next = inventoryCustomerToSalesCustomer(customer, existing);
    if (existing) merged[existingIndex] = { ...existing, ...next };
    else merged.push(next);
  }
  return merged.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

async function salesCrmView(store) {
  const inventory = await readInventory();
  return {
    ...store,
    customers: mergedSalesCustomers(store.customers || [], inventory.customers || [])
  };
}

async function syncSalesCustomerToInventory(customer) {
  if (!customer?.name) return;
  const inventory = await readInventory();
  const existingIndex = (inventory.customers || []).findIndex(item => item.id === customer.id || inventoryNorm(item.customerName) === inventoryNorm(customer.name));
  const existing = existingIndex >= 0 ? inventory.customers[existingIndex] : null;
  const next = salesCustomerToInventoryCustomer(customer, existing);
  if (existingIndex >= 0) inventory.customers[existingIndex] = next;
  else inventory.customers.push(next);
  await writeInventory(inventory);
}

async function syncInventoryCustomerToSales(customer) {
  if (!customer?.customerName) return;
  const store = await readSalesCrm();
  const existingIndex = (store.customers || []).findIndex(item => item.id === customer.id || inventoryNorm(item.name) === inventoryNorm(customer.customerName));
  const existing = existingIndex >= 0 ? store.customers[existingIndex] : null;
  const next = inventoryCustomerToSalesCustomer(customer, existing);
  if (existingIndex >= 0) store.customers[existingIndex] = next;
  else store.customers.unshift(next);
  await writeSalesCrm(store);
}

function mergeDuplicateSalesCustomers(customers = []) {
  const merged = [];
  const indexByName = new Map();
  for (const customer of customers) {
    const key = inventoryNorm(customer.name || "");
    if (!key) {
      merged.push(customer);
      continue;
    }
    if (!indexByName.has(key)) {
      indexByName.set(key, merged.length);
      merged.push(customer);
      continue;
    }
    const existingIndex = indexByName.get(key);
    const existing = merged[existingIndex];
    merged[existingIndex] = {
      ...customer,
      ...existing,
      id: existing.id || customer.id,
      name: existing.name || customer.name
    };
  }
  return merged;
}

function loadMasterLookups() {
  if (fs.existsSync(MASTER_LOOKUPS)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(MASTER_LOOKUPS, "utf8"));
      return {
        indoorData: Array.isArray(parsed.indoorData) ? parsed.indoorData : defaultIndoorData(),
        outdoorData: Array.isArray(parsed.outdoorData) ? parsed.outdoorData : defaultOutdoorData()
      };
    } catch {}
  }
  return { indoorData: defaultIndoorData(), outdoorData: defaultOutdoorData() };
}

function loadMasterPriceList() {
  if (fs.existsSync(MASTER_PRICE_LIST)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(MASTER_PRICE_LIST, "utf8"));
      return { items: Array.isArray(parsed.items) ? parsed.items : [] };
    } catch {}
  }
  return { items: [] };
}

function hydrateProject(project) {
  project.lookup = loadMasterLookups();
  project.priceList = loadMasterPriceList();
  if (!project.tables) project.tables = {};
  if (!project.tables.vrvSchedule) project.tables.vrvSchedule = { columns: vrvColumns(), rows: [] };
  project.tables.vrvSchedule.columns = vrvColumns();
  return project;
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  const payload = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": type });
  res.end(payload);
}

function notFound(res) {
  send(res, 404, { error: "Not found" });
}

function collect(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJson(req) {
  const buffer = await collect(req);
  if (!buffer.length) return {};
  return JSON.parse(buffer.toString("utf8"));
}

async function createDefaultProject() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const projectId = id();
  return {
    id: projectId,
    title: "Untitled Project",
    visible: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    details: {
      customer: "",
      contactPerson: "",
      telNo: "",
      email: "",
      project: "",
      date: `${yyyy}-${mm}-${dd}`,
      location: "",
      model: "Daikin",
      validity: "Valid for 7 days",
      enquiryNo: "",
      preparedBy: ""
    },
    quotation: { quotationNo: await nextQuotationNo(), generatedDocId: "", generatedPdfId: "" },
    layoutVersion: "screenshot-v5",
    nodes: defaultNodes(),
    uploads: [],
    tables: {
      thermal: { columns: thermalColumns(), rows: [] },
      costing: { columns: costingColumns(), rows: [], summary: defaultCostingSummary() },
      boq: { columns: boqColumns(), rows: [], summary: { total: 0, vat: 0, netAmount: 0 } },
      vrvSchedule: { columns: vrvColumns(), rows: [] }
    },
    priceList: loadMasterPriceList(),
    lookup: loadMasterLookups()
  };
}

async function nextQuotationNo() {
  const projects = await listProjects("", true);
  let max = 1000;
  const year = String(new Date().getFullYear()).slice(-2);
  for (const project of projects) {
    try {
      const q = project.quotation && project.quotation.quotationNo;
      const match = typeof q === "string" && q.match(/(\d+)$/);
      if (match) max = Math.max(max, Number(match[1]));
    } catch {}
  }
  return `QCZ-A/${year}/${max + 1}`;
}

function defaultNodes() {
  return [
    { id: "details", type: "projectDetails", title: "Project / Client Details", x: 0, y: 0, locked: false, data: {} },
    { id: "thermal-upload", type: "thermalUpload", title: "Thermal Sheet", x: 180, y: 255, locked: false, data: {} },
    { id: "vrv-upload", type: "vrvUpload", title: "VRV Selection Report", x: 640, y: 250, locked: false, data: {} },
    { id: "thermal-table", type: "thermalTable", title: "Export File", x: 55, y: 520, locked: false, width: 520, height: 205, data: {} },
    { id: "costing-table", type: "costingTable", title: "Costing Sheet", x: 980, y: 130, locked: false, width: 650, height: 220, data: {} },
    { id: "boq-table", type: "boqTable", title: "BOQ / Price", x: 970, y: 430, locked: false, width: 650, height: 190, data: {} },
    { id: "quotation", type: "quotation", title: "Quotation", x: 1680, y: 340, locked: false, data: {} },
    { id: "vrv-schedule", type: "vrvSchedule", title: "VRV Schedule", x: 170, y: 770, locked: false, width: 1550, height: 230, data: {} }
  ];
}

function thermalColumns() {
  return ["Indoor", "Room", "Mode", "Family or Model", "Cooling DBT", "Cooling WBT", "Heating T", "Tot Cool Cap", "Sens Cool Cap", "Heat Cap", "Air Flow Rate"];
}

function costingColumns() {
  return ["S.No", "Model", "Qty", "TR", "List Price", "Multiplier", "Cost", "Amount", "Selling Price / Unit"];
}

function boqColumns() {
  return ["S.No", "Description", "Qty", "Unit"];
}

function defaultCostingSummary() {
  return { totalTR: 0, totalCost: 0, margin: 0.1, sellingPrice: 0, profit: 0, pricePerTon: 0 };
}

function vrvColumns() {
  return [
    "System", "Name", "Location", "Rq TC", "Rq SC", "Air Flow Rate",
    "FCU", "Nominal Index", "Country of Origin", "Type", "Ambient - On Coil Temperature",
    "Max TC", "Max SC", "Proposed Air Flow Rate", "PIC", "Sound", "PS", "MCA", "WxHxD", "Weight",
    "Outdoor Name", "Outdoor Model", "Outdoor Nominal Index", "Ambient Temp", "CC", "PI ESMA", "Outdoor PS",
    "Outdoor MCA", "MOP", "RLA", "Outdoor WxHxD", "Outdoor Weight"
  ];
}

function defaultIndoorData() {
  return [
    { fcu: "FXSQ25A", type: "Ducted", ambient: "46 - 24.4/17.2", maxTC: 2.5, maxSC: 1.9, airflow: 150, pic: 0.041, sound: "25 - 30", ps: "220V 1ph", mca: 0.8, wxhxd: "550 x 245 x 800", weight: 23.5, nominalIndex: 25, origin: "Czech Republic" },
    { fcu: "FXSQ32A", type: "Ducted", ambient: "46 - 24.4/17.2", maxTC: 3.2, maxSC: 2.4, airflow: 158, pic: 0.045, sound: "26 - 32", ps: "220V 1ph", mca: 1.0, wxhxd: "700 x 245 x 800", weight: 25, nominalIndex: 32, origin: "Czech Republic" },
    { fcu: "FXSQ63A", type: "Ducted", ambient: "46 - 24.4/17.2", maxTC: 6.2, maxSC: 4.7, airflow: 350, pic: 0.101, sound: "27 - 33", ps: "220V 1ph", mca: 1.6, wxhxd: "1,000 x 245 x 800", weight: 35.5, nominalIndex: 63, origin: "Czech Republic" },
    { fcu: "FXSQ80A", type: "Ducted", ambient: "46 - 24.4/17.2", maxTC: 7.9, maxSC: 5.9, airflow: 383, pic: 0.135, sound: "29 - 35", ps: "220V 1ph", mca: 1.9, wxhxd: "1,000 x 245 x 800", weight: 36.5, nominalIndex: 80, origin: "Czech Republic" },
    { fcu: "FXSQ100A", type: "Ducted", ambient: "46 - 24.4/17.2", maxTC: 9.9, maxSC: 7.5, airflow: 533, pic: 0.173, sound: "31 - 36", ps: "220V 1ph", mca: 2.4, wxhxd: "1,400 x 245 x 800", weight: 46, nominalIndex: 100, origin: "Czech Republic" }
  ];
}

function defaultOutdoorData() {
  return [
    { model: "RXYTQ8U5YF", ambient: 46, cc: 17.7, piEsma: 6.5, ps: "400V 3Nph", mca: 21.2, mop: 32, rla: 12.7, wxhxd: "930 x 1,657 x 765", weight: 175, nominalIndex: 200 },
    { model: "RXYTQ12U5YF", ambient: 46, cc: 27.2, piEsma: 8.72, ps: "400V 3Nph", mca: 24, mop: 32, rla: 12.7, wxhxd: "1,240 x 1,685 x 765", weight: 234, nominalIndex: 300 },
    { model: "RXYTQ14U5YF", ambient: 46, cc: 31.5, piEsma: 9.9, ps: "400V 3Nph", mca: 31, mop: 40, rla: 19.3, wxhxd: "1,240 x 1,685 x 765", weight: 283, nominalIndex: 350 },
    { model: "RXYTQ16U5YF", ambient: 46, cc: 36.1, piEsma: 12.1, ps: "400V 3Nph", mca: 31, mop: 40, rla: 19.3, wxhxd: "1,240 x 1,685 x 765", weight: 283, nominalIndex: 400 }
  ];
}

async function listProjects(query = "", includeHidden = false) {
  const q = query.toLowerCase();
  let projects = [];
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select("value")
      .like("key", "project:%");
    if (error) throw new Error(`Supabase project list failed: ${error.message}`);
    projects = (data || []).map(row => row.value).filter(Boolean).map(hydrateProject);
  } else {
    projects = fs.readdirSync(PROJECTS)
      .filter(file => file.endsWith(".json"))
      .map(file => JSON.parse(fs.readFileSync(path.join(PROJECTS, file), "utf8")));
  }
  const filtered = projects
    .filter(project => includeHidden || project.visible !== false)
    .filter(project => {
      if (!q) return true;
      const haystack = [
        project.title,
        project.details.customer,
        project.details.project,
        project.details.location,
        project.details.model,
        project.details.enquiryNo,
        project.details.preparedBy,
        project.quotation.quotationNo
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  if (includeHidden) return filtered;
  return filtered
    .map(project => ({
      id: project.id,
      title: project.title,
      project: project.details.project,
      customer: project.details.customer,
      location: project.details.location,
      model: project.details.model,
      quotationNo: project.quotation.quotationNo,
      enquiryNo: project.details.enquiryNo,
      preparedBy: project.details.preparedBy,
      updatedAt: project.updatedAt
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function parseMultipart(buffer, contentType) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return [];
  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const parts = [];
  let start = buffer.indexOf(boundary) + boundary.length + 2;
  while (start > boundary.length) {
    const next = buffer.indexOf(boundary, start);
    if (next < 0) break;
    const part = buffer.subarray(start, next - 2);
    const split = part.indexOf(Buffer.from("\r\n\r\n"));
    if (split > -1) {
      const rawHeaders = part.subarray(0, split).toString("utf8");
      const body = part.subarray(split + 4);
      const name = /name="([^"]+)"/.exec(rawHeaders);
      const filename = /filename="([^"]*)"/.exec(rawHeaders);
      const type = /Content-Type:\s*([^\r\n]+)/i.exec(rawHeaders);
      parts.push({
        name: name && name[1],
        filename: filename && filename[1],
        mimeType: type ? type[1] : "application/octet-stream",
        body
      });
    }
    start = next + boundary.length + 2;
  }
  return parts;
}

function safeName(name) {
  return path.basename(name || "upload.bin").replace(/[^\w.\- ]+/g, "_");
}

function normalizeSalesItem(collection, input, store) {
  const base = { ...(input || {}) };
  base.id = base.id || id();
  if (collection === "leads") {
    const customer = cleanCell(base.customer || "");
    return {
      id: base.id,
      enquiryNo: cleanCell(base.enquiryNo || store.settings.nextEnquiryNo || `ENQ-${new Date().getFullYear()}-0001`),
      avatar: initials(customer),
      customer,
      phone: cleanCell(base.phone || ""),
      requirement: cleanCell(base.requirement || ""),
      projectType: cleanCell(base.projectType || ""),
      location: cleanCell(base.location || ""),
      source: cleanCell(base.source || "WhatsApp"),
      status: cleanCell(base.status || "New Lead"),
      followUp: cleanCell(base.followUp || ""),
      priority: cleanCell(base.priority || "Planned")
    };
  }
  if (collection === "customers") {
    const name = cleanCell(base.name || "");
    return {
      id: base.id,
      icon: initials(name),
      name,
      type: cleanCell(base.type || "Commercial"),
      contact: cleanCell(base.contact || ""),
      role: cleanCell(base.role || ""),
      phone: cleanCell(base.phone || ""),
      email: cleanCell(base.email || ""),
      address: cleanCell(base.address || ""),
      detail: cleanCell(base.detail || ""),
      trn: cleanCell(base.trn || "")
    };
  }
  if (collection === "projects") {
    return {
      id: base.id,
      name: cleanCell(base.name || ""),
      customer: cleanCell(base.customer || ""),
      location: cleanCell(base.location || ""),
      type: cleanCell(base.type || "Commercial"),
      requirement: cleanCell(base.requirement || ""),
      engineer: cleanCell(base.engineer || ""),
      status: cleanCell(base.status || "Site Visit Done"),
      date: cleanCell(base.date || todayDisplayDate()),
      value: cleanCell(base.value || "")
    };
  }
  if (collection === "followUps") {
    const customer = cleanCell(base.customer || "");
    return {
      id: base.id,
      avatar: initials(customer),
      customer,
      phone: cleanCell(base.phone || ""),
      project: cleanCell(base.project || ""),
      quotation: cleanCell(base.quotation || ""),
      date: cleanCell(base.date || todayDisplayDate()),
      due: cleanCell(base.due || ""),
      type: cleanCell(base.type || "Call"),
      status: cleanCell(base.status || "Scheduled")
    };
  }
  if (collection === "quotations") {
    const quote = {
      id: base.id,
      no: cleanCell(base.no || base.quotationNo || store.settings.nextQuotationNo || `CZ-QTN-${new Date().getFullYear()}-0001`),
      revision: cleanCell(base.revision || "Fresh Quote"),
      date: cleanCell(base.date || base.quotationDate || todayDisplayDate()),
      validity: cleanCell(base.validity || "7 Days"),
      salesperson: cleanCell(base.salesperson || ""),
      customer: cleanCell(base.customer || ""),
      project: cleanCell(base.project || ""),
      location: cleanCell(base.location || ""),
      paymentTerms: cleanCell(base.paymentTerms || ""),
      deliveryTime: cleanCell(base.deliveryTime || "To be discussed"),
      warranty: cleanCell(base.warranty || ""),
      quoteType: cleanCell(base.quoteType || "VRV"),
      notes: cleanMultilineCell(base.notes || ""),
      terms: cleanMultilineCell(base.terms || ""),
      items: Array.isArray(base.items) ? base.items.map(normalizeSalesQuoteItem) : [],
      manualSubtotal: cleanCell(base.manualSubtotal || ""),
      discount: Number(base.discount || 0),
      status: cleanCell(base.status || "Draft")
    };
    quote.amount = salesQuotationTotal(quote);
    return quote;
  }
  return base;
}

function normalizeSalesQuoteItem(item) {
  return {
    id: item.id || id(),
    description: cleanCell(item.description || ""),
    qty: Number(item.qty || 0),
    unit: cleanCell(item.unit || "Nos"),
    unitPrice: Number(item.unitPrice || 0)
  };
}

function salesQuotationTotal(quote) {
  const itemSubtotal = (quote.items || []).reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.unitPrice || 0), 0);
  const manualSubtotal = String(quote.manualSubtotal || "").trim();
  const subtotal = manualSubtotal ? Number(manualSubtotal.replace(/,/g, "")) || 0 : itemSubtotal;
  const taxable = Math.max(0, subtotal - Number(quote.discount || 0));
  return Math.round((taxable + taxable * 0.05) * 100) / 100;
}

function nextSalesQuotationNoFrom(current) {
  const text = String(current || "");
  const match = text.match(/^(.*?)(\d+)$/);
  if (!match) return `CZ-QTN-${new Date().getFullYear()}-0001`;
  return `${match[1]}${String(Number(match[2]) + 1).padStart(match[2].length, "0")}`;
}

function nextSalesEnquiryNoFrom(current) {
  const text = String(current || "");
  const match = text.match(/^(.*?)(\d+)$/);
  if (!match) return `ENQ-${new Date().getFullYear()}-0001`;
  return `${match[1]}${String(Number(match[2]) + 1).padStart(match[2].length, "0")}`;
}

function initials(text) {
  const parts = String(text || "CZ").trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) || "CZ").toUpperCase();
}

function todayDisplayDate() {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const target = urlPath === "/" ? path.join(PUBLIC, "index.html") : path.join(PUBLIC, urlPath);
  const normalized = path.normalize(target);
  if (!normalized.startsWith(PUBLIC) || !fs.existsSync(normalized) || fs.statSync(normalized).isDirectory()) {
    return notFound(res);
  }
  const ext = path.extname(normalized).toLowerCase();
  send(res, 200, fs.readFileSync(normalized), mimeTypes[ext] || "application/octet-stream");
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);
  const user = await sessionUser(req);

  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    const settings = await readSettings();
    return send(res, 200, { user, settings: publicSettings(settings) });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readJson(req);
    const settings = await readSettings();
    const matched = (settings.users || []).find(item => cleanCell(item.email).toLowerCase() === cleanCell(body.email).toLowerCase() && item.active !== false);
    if (!matched || !verifyPassword(body.password, matched.passwordHash)) return send(res, 401, { error: "Invalid email or password" });
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, { userId: matched.id, createdAt: Date.now() });
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": `cz_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`
    });
    return res.end(JSON.stringify({ user: { id: matched.id, name: matched.name, role: matched.role, email: matched.email }, settings: publicSettings(settings) }));
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    const token = parseCookies(req).cz_session;
    if (token) sessions.delete(token);
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": "cz_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
    });
    return res.end(JSON.stringify({ ok: true }));
  }

  if (!user) return sendAuthRequired(res);

  if (req.method === "GET" && url.pathname === "/api/settings") {
    return send(res, 200, { user, settings: publicSettings(await readSettings()) });
  }

  if (req.method === "PUT" && url.pathname === "/api/settings/company") {
    if (!isAdmin(user)) return sendForbidden(res);
    const body = await readJson(req);
    const settings = await readSettings();
    const key = body.companyKey === "company2" ? "company2" : "company";
    settings[key] = {
      ...settings[key],
      name: cleanCell(body.name || ""),
      address: cleanCell(body.address || ""),
      trn: cleanCell(body.trn || ""),
      phone: cleanCell(body.phone || ""),
      email: cleanCell(body.email || ""),
      website: cleanCell(body.website || ""),
      logoUploadId: cleanCell(body.logoUploadId || settings[key].logoUploadId || "")
    };
    await writeSettings(settings);
    return send(res, 200, { user, settings: publicSettings(settings) });
  }

  if (req.method === "POST" && url.pathname === "/api/settings/users") {
    if (!isAdmin(user)) return sendForbidden(res);
    const body = await readJson(req);
    const settings = await readSettings();
    const email = cleanCell(body.email || "").toLowerCase();
    if (!email) return send(res, 400, { error: "Email is required" });
    const existing = body.id
      ? settings.users.find(item => item.id === body.id)
      : settings.users.find(item => cleanCell(item.email).toLowerCase() === email);
    const nextUser = existing || { id: id(), passwordHash: passwordHash(body.password || "ChangeMe123") };
    nextUser.name = cleanCell(body.name || "");
    nextUser.role = cleanCell(body.role || "Staff");
    nextUser.email = email;
    nextUser.active = body.active !== false;
    if (body.password) nextUser.passwordHash = passwordHash(body.password);
    if (existing) {
      settings.users = settings.users.map(item => item.id === existing.id ? nextUser : item);
    } else {
      settings.users.push(nextUser);
    }
    await writeSettings(settings);
    return send(res, 200, { user, settings: publicSettings(settings) });
  }

  if (req.method === "DELETE" && url.pathname.match(/^\/api\/settings\/users\/[^/]+$/)) {
    if (!isAdmin(user)) return sendForbidden(res);
    const userId = decodeURIComponent(parts[3]);
    if (userId === user.id) return send(res, 400, { error: "You cannot delete your own admin login" });
    const settings = await readSettings();
    settings.users = (settings.users || []).filter(item => item.id !== userId);
    await writeSettings(settings);
    return send(res, 200, { user, settings: publicSettings(settings) });
  }

  if (req.method === "POST" && url.pathname === "/api/settings/uploads") {
    if (!isAdmin(user)) return sendForbidden(res);
    const buffer = await collect(req);
    const multipart = parseMultipart(buffer, req.headers["content-type"] || "");
    const filePart = multipart.find(part => part.filename);
    if (!filePart) return send(res, 400, { error: "No file uploaded" });
    const uploadId = id();
    const storedName = `${uploadId}-${safeName(filePart.filename)}`;
    await saveUpload("settings", storedName, filePart.body, filePart.mimeType);
    const settings = await readSettings();
    const upload = {
      id: uploadId,
      originalName: filePart.filename,
      storedName,
      mimeType: filePart.mimeType,
      size: filePart.body.length,
      category: cleanCell(multipart.find(part => part.name === "category")?.body.toString("utf8") || "Attachment"),
      createdAt: new Date().toISOString()
    };
    settings.attachments.unshift(upload);
    const targetCompany = cleanCell(multipart.find(part => part.name === "companyKey")?.body.toString("utf8"));
    if (upload.category === "Logo" && ["company", "company2"].includes(targetCompany)) settings[targetCompany].logoUploadId = upload.id;
    await writeSettings(settings);
    return send(res, 201, { upload, settings: publicSettings(settings) });
  }

  if (req.method === "GET" && url.pathname.match(/^\/api\/settings\/uploads\/[^/]+$/)) {
    const settings = await readSettings();
    const upload = (settings.attachments || []).find(item => item.id === decodeURIComponent(parts[3]));
    if (!upload) return notFound(res);
    return sendStoredUpload(res, upload, "settings");
  }

  if (req.method === "DELETE" && url.pathname.match(/^\/api\/settings\/uploads\/[^/]+$/)) {
    if (!isAdmin(user)) return sendForbidden(res);
    const settings = await readSettings();
    const uploadId = decodeURIComponent(parts[3]);
    const upload = (settings.attachments || []).find(item => item.id === uploadId);
    settings.attachments = (settings.attachments || []).filter(item => item.id !== uploadId);
    for (const key of ["company", "company2"]) if (settings[key].logoUploadId === uploadId) settings[key].logoUploadId = "";
    if (upload) await deleteUpload("settings", upload.storedName);
    await writeSettings(settings);
    return send(res, 200, { user, settings: publicSettings(settings) });
  }

  if (req.method === "GET" && url.pathname === "/api/projects") {
    return send(res, 200, await listProjects(url.searchParams.get("q") || ""));
  }

  if (req.method === "POST" && url.pathname === "/api/projects") {
    const project = await createDefaultProject();
    if (url.searchParams.get("draft") === "1") {
      return send(res, 200, project);
    }
    await writeProject(project);
    return send(res, 201, project);
  }

  if (req.method === "GET" && url.pathname === "/api/inventory") {
    return send(res, 200, await inventoryView(await readInventory()));
  }

  if (req.method === "GET" && url.pathname === "/api/purchase-orders") {
    return send(res, 200, purchaseOrderView(await readPurchaseOrders()));
  }

  if (req.method === "GET" && url.pathname === "/api/sales-crm") {
    return send(res, 200, await salesCrmView(await readSalesCrm()));
  }

  if (req.method === "POST" && url.pathname === "/api/sales-crm/quotations/pdf") {
    const store = await readSalesCrm();
    const body = await readJson(req);
    const sourceQuote = body.quoteId
      ? (store.quotations || []).find(item => item.id === body.quoteId)
      : (body.quote || body);
    if (!sourceQuote) return notFound(res);
    const quote = normalizeSalesItem("quotations", sourceQuote, store);
    const customer = (store.customers || []).find(item => cleanCell(item.name).toLowerCase() === cleanCell(quote.customer).toLowerCase()) || {};
    const pdf = await salesQuotationPdfBuffer({ quote, customer });
    const filename = salesQuotationPdfFilename(quote);
    const upload = {
      id: id(),
      originalName: filename,
      storedName: `${id()}-${safeName(filename)}`,
      mimeType: "application/pdf",
      size: pdf.length,
      createdAt: new Date().toISOString(),
      category: "Sales Quotation PDF"
    };
    await saveUpload("sales-quotations", upload.storedName, pdf, upload.mimeType);
    if (body.quoteId) {
      const index = (store.quotations || []).findIndex(item => item.id === body.quoteId);
      if (index >= 0) {
        store.quotations[index] = {
          ...store.quotations[index],
          pdfUpload: upload,
          lastPdfGeneratedAt: upload.createdAt
        };
        await writeSalesCrm(store);
      }
    }
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`
    });
    return res.end(pdf);
  }

  if (req.method === "POST" && url.pathname.match(/^\/api\/sales-crm\/(leads|customers|projects|quotations|followUps)$/)) {
    const store = await readSalesCrm();
    const collection = url.pathname.split("/").pop();
    const body = await readJson(req);
    const item = normalizeSalesItem(collection, body.item || body, store);
    const existingIndex = store[collection].findIndex(entry => (
      entry.id === item.id ||
      (collection === "customers" && inventoryNorm(entry.name) === inventoryNorm(item.name))
    ));
    if (existingIndex >= 0) {
      if (collection === "customers") item.id = store[collection][existingIndex].id || item.id;
      store[collection][existingIndex] = item;
    }
    else store[collection].unshift(item);
    if (collection === "customers") store.customers = mergeDuplicateSalesCustomers(store.customers);
    if (collection === "quotations") {
      store.settings.nextQuotationNo = nextSalesQuotationNoFrom(item.no || store.settings.nextQuotationNo);
    }
    if (collection === "leads" && item.enquiryNo) {
      store.settings.nextEnquiryNo = nextSalesEnquiryNoFrom(item.enquiryNo);
    }
    await writeSalesCrm(store);
    if (collection === "customers") await syncSalesCustomerToInventory(item);
    return send(res, 200, await salesCrmView(store));
  }

  if (req.method === "DELETE" && url.pathname.match(/^\/api\/sales-crm\/(leads|customers|projects|quotations|followUps)\/[^/]+$/)) {
    const store = await readSalesCrm();
    const parts = url.pathname.split("/");
    const collection = parts[3];
    const itemId = decodeURIComponent(parts[4]);
    const deletedItem = (store[collection] || []).find(item => item.id === itemId);
    store[collection] = (store[collection] || []).filter(item => item.id !== itemId);
    await writeSalesCrm(store);
    if (collection === "customers" && deletedItem) {
      const inventory = await readInventory();
      inventory.customers = (inventory.customers || []).filter(customer => inventoryNorm(customer.customerName) !== inventoryNorm(deletedItem.name));
      await writeInventory(inventory);
    } else if (collection === "customers") {
      const inventory = await readInventory();
      inventory.customers = (inventory.customers || []).filter(customer => customer.id !== itemId);
      await writeInventory(inventory);
    }
    return send(res, 200, await salesCrmView(store));
  }

  if (req.method === "POST" && url.pathname === "/api/purchase-orders/suppliers") {
    const store = await readPurchaseOrders();
    const body = await readJson(req);
    const supplier = normalizePurchaseSupplier(body);
    if (!supplier.supplierName) return send(res, 400, { error: "Supplier Name is required" });
    const existingIndex = store.suppliers.findIndex(item => item.id === supplier.id || inventoryNorm(item.supplierName) === inventoryNorm(supplier.supplierName));
    if (existingIndex >= 0) {
      supplier.id = store.suppliers[existingIndex].id;
      supplier.createdAt = store.suppliers[existingIndex].createdAt || supplier.createdAt;
      store.suppliers[existingIndex] = supplier;
    } else {
      store.suppliers.unshift(supplier);
    }
    await writePurchaseOrders(store);
    return send(res, 200, purchaseOrderView(store));
  }

  if (req.method === "DELETE" && url.pathname.match(/^\/api\/purchase-orders\/suppliers\/[^/]+$/)) {
    const store = await readPurchaseOrders();
    const supplierId = decodeURIComponent(url.pathname.split("/").pop());
    store.suppliers = (store.suppliers || []).filter(supplier => supplier.id !== supplierId);
    await writePurchaseOrders(store);
    return send(res, 200, purchaseOrderView(store));
  }

  if (req.method === "POST" && url.pathname === "/api/purchase-orders/upload-quotation") {
    const store = await readPurchaseOrders();
    const buffer = await collect(req);
    const multipart = parseMultipart(buffer, req.headers["content-type"] || "");
    const filePart = multipart.find(part => part.filename);
    if (!filePart) return send(res, 400, { error: "No quotation uploaded" });
    const uploadId = id();
    const storedName = `${uploadId}-${safeName(filePart.filename)}`;
    await saveUpload("purchase-orders", storedName, filePart.body, filePart.mimeType);
    store.uploads.unshift({ id: uploadId, originalName: filePart.filename, storedName, mimeType: filePart.mimeType, size: filePart.body.length, createdAt: new Date().toISOString() });
    await writePurchaseOrders(store);
    const extracted = await extractPurchaseQuotationWithOpenAI(filePart).catch(error => ({ message: error.message, items: [] }));
    const extractedSubtotal = Number(String(extracted.manualSubtotal ?? extracted.subtotal ?? "").replace(/,/g, "")) || 0;
    const order = normalizePurchaseOrder({
      ...extracted,
      manualSubtotal: extractedSubtotal > 0 ? extractedSubtotal : "",
      discount: extracted.discount ?? 0,
      notes: DEFAULT_PURCHASE_NOTES,
      sourceUploadId: uploadId,
      status: "Draft"
    }, store, false);
    order.id = "";
    order.poNo = "";
    return send(res, 200, { order, message: extracted.message || "Quotation scanned. Review and edit before creating the PO." });
  }

  if (req.method === "POST" && url.pathname === "/api/purchase-orders") {
    const store = await readPurchaseOrders();
    const body = await readJson(req);
    const order = normalizePurchaseOrder(body.order || body, store, !!body.createOfficial);
    const existingIndex = store.orders.findIndex(item => item.id === order.id);
    if (body.createOfficial && !order.poNo) {
      order.poNo = store.settings.nextPoNo || defaultPurchaseOrders().settings.nextPoNo;
      store.settings.nextPoNo = nextPoNoFrom(order.poNo);
    } else if (body.createOfficial && order.poNo) {
      store.settings.nextPoNo = nextPoNoFrom(order.poNo);
    }
    if (body.createOfficial) order.status = "Created";
    if (existingIndex >= 0) store.orders[existingIndex] = order;
    else store.orders.unshift(order);
    await writePurchaseOrders(store);
    return send(res, 200, { state: purchaseOrderView(store), order });
  }

  if (req.method === "DELETE" && url.pathname.match(/^\/api\/purchase-orders\/[^/]+$/)) {
    const store = await readPurchaseOrders();
    const orderId = decodeURIComponent(url.pathname.split("/").pop());
    store.orders = store.orders.filter(order => order.id !== orderId);
    store.settings.nextPoNo = nextPurchaseNoFromOrders(store.orders);
    await writePurchaseOrders(store);
    return send(res, 200, purchaseOrderView(store));
  }

  if (req.method === "POST" && url.pathname === "/api/purchase-orders/pdf") {
    const payload = await readJson(req);
    const order = normalizePurchaseOrder(payload.order || payload, await readPurchaseOrders(), false);
    if (order.status !== "Created" || !order.poNo) return send(res, 400, { error: "Create the Purchase Order before downloading PDF." });
    const pdf = purchaseOrderPdfBuffer(order);
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${purchaseOrderPdfFilename(order)}"`
    });
    return res.end(pdf);
  }

    if (req.method === "POST" && url.pathname === "/api/inventory/models") {
    const inventory = await readInventory();
    const body = await readJson(req);
    const modelNo = cleanCell(body.modelNo || body.model || "").toUpperCase();
    if (!modelNo) return send(res, 400, { error: "Model No. is required" });
    const existing = inventory.models.find(model => inventoryNorm(model.modelNo) === inventoryNorm(modelNo));
    if (existing) Object.assign(existing, { modelNo, description: body.description || "", brand: body.brand || "Daikin", type: body.type || "" });
    else inventory.models.push({ id: id(), modelNo, description: body.description || "", brand: body.brand || "Daikin", type: body.type || "" });
    if (body.quantity !== undefined && body.quantity !== "") {
      const current = computeInventory(inventory).stockByModel[inventoryNorm(modelNo)]?.qty || 0;
      const target = Number(body.quantity || 0);
      const diff = target - current;
      if (diff !== 0) {
        const uploadedDate = todayISO();
        inventory.supplierDns.unshift({
          id: id(),
          uploadedDate,
          supplierDnNo: nextManualStockNo(inventory, uploadedDate),
          projectName: "Manual Stock Entry",
          status: "Confirmed",
          isManualAdjustment: true,
          lines: [{ id: id(), modelNo, description: body.description || "", detectedQty: Math.abs(diff), finalQty: diff, status: "Ready" }]
        });
      }
    }
    await writeInventory(inventory);
    return send(res, 200, await inventoryView(inventory));
  }

  if (req.method === "DELETE" && url.pathname.match(/^\/api\/inventory\/models\/[^/]+$/)) {
    const inventory = await readInventory();
    const modelNo = decodeURIComponent(url.pathname.split("/").pop());
    inventory.models = (inventory.models || []).filter(model => inventoryNorm(model.modelNo) !== inventoryNorm(modelNo));
    inventory.supplierDns = (inventory.supplierDns || []).filter(dn => {
      if (!dn.isManualAdjustment) return true;
      return !(dn.lines || []).some(line => inventoryNorm(line.modelNo) === inventoryNorm(modelNo));
    });
    await writeInventory(inventory);
    return send(res, 200, await inventoryView(inventory));
  }

  if (req.method === "POST" && url.pathname === "/api/inventory/customers") {
    const inventory = await readInventory();
    const body = await readJson(req);
    if (!body.customerName) return send(res, 400, { error: "Customer name is required" });
    const existing = inventory.customers.find(customer => customer.id === body.id || inventoryNorm(customer.customerName) === inventoryNorm(body.customerName));
    const customer = {
      id: existing ? existing.id : id(),
      customerName: body.customerName || "",
      contactPerson: body.contactPerson || "",
      phone: body.phone || "",
      email: body.email || "",
      address: body.address || "",
      defaultDeliveryLocation: body.defaultDeliveryLocation || body.deliveryLocation || ""
    };
    if (existing) Object.assign(existing, customer);
    else inventory.customers.push(customer);
    await writeInventory(inventory);
    await syncInventoryCustomerToSales(customer);
    return send(res, 200, await inventoryView(inventory));
  }

  if (req.method === "DELETE" && url.pathname.match(/^\/api\/inventory\/customers\/[^/]+$/)) {
    const inventory = await readInventory();
    const customerId = decodeURIComponent(url.pathname.split("/").pop());
    const deletedCustomer = (inventory.customers || []).find(customer => customer.id === customerId);
    inventory.customers = (inventory.customers || []).filter(customer => customer.id !== customerId);
    await writeInventory(inventory);
    if (deletedCustomer) {
      const store = await readSalesCrm();
      store.customers = (store.customers || []).filter(customer => inventoryNorm(customer.name) !== inventoryNorm(deletedCustomer.customerName));
      await writeSalesCrm(store);
    } else {
      const store = await readSalesCrm();
      store.customers = (store.customers || []).filter(customer => customer.id !== customerId);
      await writeSalesCrm(store);
    }
    return send(res, 200, await inventoryView(inventory));
  }

  if (req.method === "POST" && url.pathname === "/api/inventory/supplier-dns") {
    const inventory = await readInventory();
    const body = await readJson(req);
    const supplierDn = {
      id: body.id || id(),
      uploadedDate: body.uploadedDate || todayISO(),
      supplierDnNo: body.supplierDnNo || "",
      projectName: body.projectName || "",
      status: body.status || "Review Needed",
      lines: (body.lines || []).map(line => normalizeSupplierLine(line)),
      uploadId: body.uploadId || "",
      isManualAdjustment: !!body.isManualAdjustment,
      duplicateWarning: !!body.supplierDnNo && inventory.supplierDns.some(dn => dn.id !== body.id && dn.supplierDnNo && inventoryNorm(dn.supplierDnNo) === inventoryNorm(body.supplierDnNo))
    };
    const existingIndex = inventory.supplierDns.findIndex(dn => dn.id === supplierDn.id);
    if (existingIndex >= 0) inventory.supplierDns[existingIndex] = supplierDn;
    else inventory.supplierDns.unshift(supplierDn);
    await writeInventory(inventory);
    return send(res, 200, await inventoryView(inventory));
  }

  if (req.method === "POST" && url.pathname === "/api/inventory/supplier-dns/upload") {
    const inventory = await readInventory();
    const buffer = await collect(req);
    const multipart = parseMultipart(buffer, req.headers["content-type"] || "");
    const filePart = multipart.find(part => part.filename);
    if (!filePart) return send(res, 400, { error: "No file uploaded" });
    const uploadId = id();
    const storedName = `${uploadId}-${safeName(filePart.filename)}`;
    await saveUpload("inventory", storedName, filePart.body, filePart.mimeType);
    const extracted = await extractSupplierDnWithOpenAI(filePart, uploadId).catch(error => ({ supplierDnNo: "", projectName: "", lines: [], message: error.message }));
    const supplierDn = {
      id: id(),
      uploadedDate: todayISO(),
      supplierDnNo: extracted.supplierDnNo || "",
      projectName: extracted.projectName || "",
      status: "Review Needed",
      lines: combineSupplierLines(extracted.lines || []),
      uploadId,
      message: extracted.message || "",
      duplicateWarning: false
    };
    supplierDn.duplicateWarning = !!supplierDn.supplierDnNo && inventory.supplierDns.some(dn => dn.supplierDnNo && inventoryNorm(dn.supplierDnNo) === inventoryNorm(supplierDn.supplierDnNo));
    inventory.uploads.push({ id: uploadId, originalName: filePart.filename, storedName, mimeType: filePart.mimeType, size: filePart.body.length, createdAt: new Date().toISOString() });
    inventory.supplierDns.unshift(supplierDn);
    await writeInventory(inventory);
    return send(res, 200, { ...(await inventoryView(inventory)), activeSupplierDnId: supplierDn.id });
  }

  if (req.method === "POST" && url.pathname.match(/^\/api\/inventory\/supplier-dns\/[^/]+\/confirm$/)) {
    const inventory = await readInventory();
    const supplierDnId = url.pathname.split("/")[4];
    const supplierDn = inventory.supplierDns.find(dn => dn.id === supplierDnId);
    if (!supplierDn) return notFound(res);
    for (const line of supplierDn.lines) {
      if (!findModel(inventory, line.modelNo)) {
        inventory.models.push({ id: id(), modelNo: line.modelNo, description: line.description || "", brand: "Daikin", type: "", warehouseLocation: "", minimumStock: 0, needsReview: true });
      }
    }
    supplierDn.status = "Confirmed";
    await writeInventory(inventory);
    return send(res, 200, await inventoryView(inventory));
  }

  if (req.method === "POST" && url.pathname.match(/^\/api\/inventory\/supplier-dns\/[^/]+\/cancel$/)) {
    const inventory = await readInventory();
    const supplierDnId = url.pathname.split("/")[4];
    const supplierDn = inventory.supplierDns.find(dn => dn.id === supplierDnId);
    if (!supplierDn) return notFound(res);
    supplierDn.status = "Cancelled";
    await writeInventory(inventory);
    return send(res, 200, await inventoryView(inventory));
  }

  if (req.method === "DELETE" && url.pathname.match(/^\/api\/inventory\/supplier-dns\/[^/]+$/)) {
    const inventory = await readInventory();
    const supplierDnId = url.pathname.split("/").pop();
    inventory.supplierDns = (inventory.supplierDns || []).filter(dn => dn.id !== supplierDnId);
    await writeInventory(inventory);
    return send(res, 200, await inventoryView(inventory));
  }

  if (req.method === "POST" && url.pathname === "/api/inventory/delivery-notes") {
    const inventory = await readInventory();
    const body = await readJson(req);
    const deliveryNote = normalizeDeliveryNote(body, inventory);
    const existingIndex = inventory.deliveryNotes.findIndex(dn => dn.id === deliveryNote.id);
    const issuing = deliveryNote.status === "Issued";
    if (issuing) {
      const availabilityInventory = { ...inventory, deliveryNotes: inventory.deliveryNotes.filter(dn => dn.id !== deliveryNote.id) };
      const availability = computeInventory(availabilityInventory).stockByModel;
      for (const line of deliveryNote.lines) {
        if (Number(line.qtyGoingOut || 0) > Number(availability[inventoryNorm(line.modelNo)]?.qty || 0)) {
          return send(res, 400, { error: `Insufficient stock for ${line.modelNo}` });
        }
      }
    }
    if (existingIndex >= 0) inventory.deliveryNotes[existingIndex] = deliveryNote;
    else inventory.deliveryNotes.unshift(deliveryNote);
    inventory.settings.nextDeliveryNo = nextDeliveryNoFrom(deliveryNote.dnNo || inventory.settings.nextDeliveryNo);
    await writeInventory(inventory);
    return send(res, 200, await inventoryView(inventory));
  }

  if (req.method === "POST" && url.pathname.match(/^\/api\/inventory\/delivery-notes\/[^/]+\/cancel$/)) {
    const inventory = await readInventory();
    const deliveryNoteId = url.pathname.split("/")[4];
    const dn = inventory.deliveryNotes.find(item => item.id === deliveryNoteId);
    if (!dn) return notFound(res);
    dn.status = "Cancelled";
    await writeInventory(inventory);
    return send(res, 200, await inventoryView(inventory));
  }

  if (req.method === "DELETE" && url.pathname.match(/^\/api\/inventory\/delivery-notes\/[^/]+$/)) {
    const inventory = await readInventory();
    const deliveryNoteId = url.pathname.split("/").pop();
    inventory.deliveryNotes = (inventory.deliveryNotes || []).filter(item => item.id !== deliveryNoteId);
    await writeInventory(inventory);
    return send(res, 200, await inventoryView(inventory));
  }

  if (req.method === "POST" && url.pathname === "/api/inventory/delivery-note-pdf") {
    const payload = await readJson(req);
    const dn = payload.deliveryNote || payload;
    const pdf = deliveryNotePdfBuffer(payload);
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${(dn.dnNo || "delivery-note").replace(/"/g, "")}.pdf"`
    });
    return res.end(pdf);
  }

  if (parts[0] === "api" && parts[1] === "projects" && parts[2]) {
    const projectId = parts[2];
    const project = await readProject(projectId);

    if (req.method === "PUT" && parts.length === 3) {
      const next = await readJson(req);
      next.id = projectId;
      next.createdAt = project?.createdAt || next.createdAt || new Date().toISOString();
      await writeProject(next);
      return send(res, 200, next);
    }

    if (!project) return notFound(res);

    if (req.method === "GET" && parts.length === 3) return send(res, 200, project);

    if (req.method === "DELETE" && parts.length === 3) {
      await deleteProject(projectId);
      return send(res, 200, { ok: true });
    }

    if (req.method === "POST" && parts[3] === "uploads") {
      const buffer = await collect(req);
      const multipart = parseMultipart(buffer, req.headers["content-type"] || "");
      const filePart = multipart.find(part => part.filename);
      const nodePart = multipart.find(part => part.name === "nodeId");
      if (!filePart) return send(res, 400, { error: "No file uploaded" });
      const uploadId = id();
      const nodeId = nodePart ? nodePart.body.toString("utf8") : "file";
      const storedName = `${uploadId}-${safeName(filePart.filename)}`;
      await saveUpload(`projects/${projectId}`, storedName, filePart.body, filePart.mimeType);
      const upload = {
        id: uploadId,
        projectId,
        nodeId,
        originalName: filePart.filename,
        storedName,
        mimeType: filePart.mimeType,
        size: filePart.body.length,
        createdAt: new Date().toISOString()
      };
      project.uploads.push(upload);
      const node = project.nodes.find(n => n.id === nodeId);
      if (node) node.data.uploadId = uploadId;
      if (nodeId === "thermal-upload" || nodeId === "vrv-upload") project.visible = true;
      await writeProject(project);
      return send(res, 201, upload);
    }

    if (req.method === "GET" && parts[3] === "uploads" && parts[4]) {
      const upload = project.uploads.find(item => item.id === parts[4]);
      if (!upload) return notFound(res);
      return sendStoredUpload(res, upload, `projects/${projectId}`);
    }

    if (req.method === "POST" && parts[3] === "extract" && parts[4] === "thermal") {
      const body = await readJson(req);
      const upload = project.uploads.find(item => item.id === body.uploadId);
      if (!upload) return send(res, 400, { error: "Thermal file not found" });
      return send(res, 200, {
        status: "ready_for_options",
        capacitySources: ["Calculated AC Load", "First Selection", "Second Selection"],
        familyModels: [],
        rows: [],
        message: "Thermal sheet uploaded. Select the capacity source, and mention a model/family only if it should be filled. Add zoomed screenshots first if any values are unclear."
      });
    }

    if (req.method === "POST" && parts[3] === "extract" && parts[4] === "thermal-vision") {
      const body = await readJson(req);
      const result = await extractThermalWithOpenAI(project, body);
      if (!body.previewOnly && result.rows && result.rows.length) {
        project.tables.thermal.rows = result.rows;
        await writeProject(project);
      }
      return send(res, 200, result);
    }

    if (req.method === "POST" && parts[3] === "extract" && parts[4] === "vrv") {
      const body = await readJson(req);
      const upload = project.uploads.find(item => item.id === body.uploadId);
      if (!upload) return send(res, 400, { error: "VRV file not found" });
      const bytes = await readUpload(`projects/${projectId}`, upload.storedName);
      if (!bytes) return send(res, 400, { error: "VRV file not found" });
      const extracted = extractVrvFile(bytes, upload.originalName);
      return send(res, 200, extracted);
    }
  }

  if (req.method === "POST" && url.pathname === "/api/export/table") {
    const { filename = "table.xls", title = "Table", columns = [], rows = [], summaryRows = [] } = await readJson(req);
    const html = tableWorkbookHtml(title, columns, rows, summaryRows);
    res.writeHead(200, {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`
    });
    return res.end(html);
  }

  if (req.method === "POST" && url.pathname === "/api/export/quotation") {
    const payload = await readJson(req);
    if (fs.existsSync(QUOTATION_TEMPLATE)) {
      const docx = generateQuotationDocx(payload);
      res.writeHead(200, {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${(payload.filename || "quotation.docx").replace(/\.(doc|docx)$/i, ".docx").replace(/"/g, "")}"`
      });
      return res.end(docx);
    }
    const html = quotationHtml(payload);
    res.writeHead(200, {
      "Content-Type": "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename="${(payload.filename || "quotation.doc").replace(/"/g, "")}"`
    });
    return res.end(html);
  }

  notFound(res);
}

async function extractThermalWithOpenAI(project, options) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      status: "missing_api_key",
      rows: [],
      unclearFields: ["OPENAI_API_KEY"],
      message: "OpenAI vision extraction is configured, but OPENAI_API_KEY is not set on the server."
    };
  }

  const uploadIds = Array.isArray(options.uploadIds) ? options.uploadIds : [];
  const uploads = uploadIds
    .map(uploadId => project.uploads.find(upload => upload.id === uploadId))
    .filter(Boolean);
  if (!uploads.length) {
    return { status: "no_files", rows: [], unclearFields: [], message: "Upload the thermal sheet PDF or screenshots first." };
  }

  const content = [
    {
      type: "input_text",
      text: thermalPrompt(options)
    }
  ];

  for (const upload of uploads) {
    const bytes = await readUpload(`projects/${project.id}`, upload.storedName);
    if (!bytes) continue;
    const base64 = bytes.toString("base64");
    const mime = upload.mimeType || mimeTypes[path.extname(upload.originalName).toLowerCase()] || "application/octet-stream";
    if (mime.includes("pdf")) {
      content.push({
        type: "input_file",
        filename: upload.originalName,
        file_data: `data:${mime};base64,${base64}`
      });
    } else if (mime.startsWith("image/")) {
      content.push({
        type: "input_image",
        image_url: `data:${mime};base64,${base64}`
      });
    }
  }

  const payload = {
    model: OPENAI_MODEL,
    input: [{ role: "user", content }],
    temperature: 0,
    text: {
      format: {
        type: "json_schema",
        name: "thermal_sheet_extraction",
        strict: true,
        schema: thermalJsonSchema()
      }
    }
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      status: "openai_error",
      rows: [],
      unclearFields: [],
      message: json.error ? json.error.message : `OpenAI request failed with status ${response.status}`
    };
  }

  const text = extractResponseText(json);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { status: "parse_error", rows: [], unclearFields: [], message: "OpenAI returned an unreadable extraction response." };
  }

  const customColumns = Array.isArray(parsed.customColumns) ? parsed.customColumns.map(safeExtract).filter(Boolean) : [];
  const customRows = Array.isArray(parsed.customRows)
    ? parsed.customRows.map(row => (Array.isArray(row.cells) ? row.cells.map(safeExtract) : []))
    : [];
  const rows = options.customExtraction ? [] : (parsed.rows || []).map(row => ({
    "Indoor": safeExtract(row.indoor),
    "Room": safeExtract(row.room),
    "Mode": "A",
    "Family or Model": options.familyModel || parsed.familyModel || "",
    "Cooling DBT": "24.4",
    "Cooling WBT": "17.2",
    "Heating T": "20",
    "Tot Cool Cap": safeExtract(row.totCoolCap),
    "Sens Cool Cap": safeExtract(row.sensCoolCap),
    "Heat Cap": "",
    "Air Flow Rate": safeExtract(row.airFlowRate)
  }));

  return {
    status: parsed.unclearFields && parsed.unclearFields.length ? "needs_verification" : "ok",
    capacitySources: parsed.capacitySources || [],
    selectedCapacitySource: options.capacitySource || parsed.selectedCapacitySource || "",
    familyModel: options.familyModel || parsed.familyModel || "",
    rows,
    customColumns,
    customRows,
    unclearFields: parsed.unclearFields || [],
    message: parsed.message || (customRows.length ? "Requested table columns were extracted into the Export File table." : rows.length ? "Thermal values extracted into the Export File table." : "No rows were detected.")
  };
}

function thermalPrompt(options) {
  if (options.customExtraction) {
    return `
You are an accurate table extraction assistant for scanned PDFs and screenshots.

The user wants a custom table extraction, not the regular VRV thermal export template.
User request:
${options.customInstruction || "Extract the requested table and columns."}

Rules:
- Extract only the table(s), columns, and rows requested by the user.
- If the user asks for specific columns, return only those columns in customColumns, in the requested order.
- If the user asks for a particular table but not exact columns, return the visible table columns.
- Preserve row order exactly.
- Preserve values exactly as shown; do not round, correct, merge, or deduplicate.
- If OCR confidence is uncertain, leave that cell as an empty string and list it in unclearFields.
- Never guess, infer, or hallucinate unclear values.
- Leave the regular rows array empty for custom extraction.
- Set capacitySources to [], selectedCapacitySource to "", and familyModel to "".
- Return JSON only.`;
  }
  return `
You are an HVAC Schedule Extractor specialized in scanned Thermal Load Sheets.
Priority is extraction accuracy, especially for numeric values.

Follow this workflow:
- Detect multi-row, merged, and hierarchical headers.
- Use lowest-level child headers as extractable columns.
- Preserve all rows exactly; never merge, deduplicate, or remove rows.
- Include all units.
- Detect capacity sources containing both Total kW and Sensible kW.
- Capacity source selected by user: ${options.capacitySource || "auto if only one exists"}.
- Family or Model selected by user: ${options.familyModel || "not specified; leave Family or Model blank"}.

Extract these source fields when available:
- Unit Reference No.
- Location.
- Calculated AC Load Total kW and Sensible kW.
- First Selection Total kW and Sensible kW.
- Second Selection Total kW and Sensible kW.
- Air Flow Rate.

Generate rows for this final table mapping:
- indoor = Unit Reference No.
- room = Location.
- totCoolCap = selected source Total kW.
- sensCoolCap = selected source Sensible kW.
- airFlowRate = Air Flow Rate.

Numeric accuracy rules:
- Preserve numeric values exactly as shown.
- Never round.
- Never truncate trailing zeros.
- Never remove decimal points.
- Do not infer missing digits.
- If OCR confidence is uncertain, leave that cell as an empty string and list it in unclearFields.
- Never guess, infer, or hallucinate unclear values.

If screenshots are uploaded with the PDF, use screenshots to clarify unreadable values.
Return JSON only.`;
}

function thermalJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      capacitySources: { type: "array", items: { type: "string" } },
      selectedCapacitySource: { type: "string" },
      familyModel: { type: "string" },
      rows: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            indoor: { type: "string" },
            room: { type: "string" },
            totCoolCap: { type: "string" },
            sensCoolCap: { type: "string" },
            airFlowRate: { type: "string" }
          },
          required: ["indoor", "room", "totCoolCap", "sensCoolCap", "airFlowRate"]
        }
      },
      customColumns: { type: "array", items: { type: "string" } },
      customRows: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            cells: { type: "array", items: { type: "string" } }
          },
          required: ["cells"]
        }
      },
      unclearFields: { type: "array", items: { type: "string" } },
      message: { type: "string" }
    },
    required: ["capacitySources", "selectedCapacitySource", "familyModel", "rows", "customColumns", "customRows", "unclearFields", "message"]
  };
}

function extractResponseText(response) {
  if (typeof response.output_text === "string") return response.output_text;
  const chunks = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("");
}

function safeExtract(value) {
  const text = String(value == null ? "" : value).trim();
  return text || "";
}

function inventoryNorm(value) {
  return String(value || "").toUpperCase().replace(/[\s_\-]/g, "");
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function manualStockDateCode(dateValue) {
  const match = String(dateValue || todayISO()).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return manualStockDateCode(todayISO());
  return `${match[3]}${match[2]}${match[1]}`;
}

function nextManualStockNo(inventory, dateValue) {
  const dateCode = manualStockDateCode(dateValue);
  const pattern = new RegExp(`^Stock ${dateCode}(\\d{2})$`, "i");
  let maxSuffix = -1;
  for (const dn of inventory.supplierDns || []) {
    const match = String(dn.supplierDnNo || "").match(pattern);
    if (match) maxSuffix = Math.max(maxSuffix, Number(match[1]));
  }
  return `Stock ${dateCode}${String(maxSuffix + 1).padStart(2, "0")}`;
}

function ensureManualStockNumbers(inventory) {
  const usedByDate = {};
  let changed = false;
  for (const dn of inventory.supplierDns || []) {
    if (!dn.isManualAdjustment) continue;
    const dateCode = manualStockDateCode(dn.uploadedDate);
    usedByDate[dateCode] = usedByDate[dateCode] || new Set();
    const existing = String(dn.supplierDnNo || "").match(new RegExp(`^Stock ${dateCode}(\\d{2})$`, "i"));
    if (existing && !usedByDate[dateCode].has(existing[1])) {
      usedByDate[dateCode].add(existing[1]);
      continue;
    }
    let suffix = 0;
    while (usedByDate[dateCode].has(String(suffix).padStart(2, "0"))) suffix += 1;
    const suffixText = String(suffix).padStart(2, "0");
    dn.supplierDnNo = `Stock ${dateCode}${suffixText}`;
    usedByDate[dateCode].add(suffixText);
    changed = true;
  }
  return changed;
}

function findModel(inventory, modelNo) {
  return inventory.models.find(model => inventoryNorm(model.modelNo) === inventoryNorm(modelNo));
}

function normalizeSupplierLine(line) {
  const detectedQty = Number(line.detectedQty ?? line.quantity ?? line.qty ?? 0) || 0;
  const finalQty = Number(line.finalQty ?? detectedQty) || 0;
  return {
    id: line.id || id(),
    modelNo: cleanCell(line.modelNo || line.model || line.unitName || "").toUpperCase(),
    description: cleanCell(line.description || ""),
    detectedQty,
    finalQty,
    status: line.status || (line.modelNo ? "Ready" : "Check Needed")
  };
}

function combineSupplierLines(lines) {
  const byModel = new Map();
  for (const raw of lines) {
    const line = normalizeSupplierLine(raw);
    if (!line.modelNo) continue;
    const key = inventoryNorm(line.modelNo);
    if (!byModel.has(key)) byModel.set(key, line);
    else {
      const existing = byModel.get(key);
      existing.detectedQty += Number(line.detectedQty || 0);
      existing.finalQty += Number(line.finalQty || 0);
      if (!existing.description && line.description) existing.description = line.description;
      if (line.status === "Check Needed") existing.status = "Check Needed";
    }
  }
  return [...byModel.values()];
}

function normalizeDeliveryNote(body, inventory) {
  const dnNo = body.dnNo || inventory.settings.nextDeliveryNo || "DN-2057";
  return {
    id: body.id || id(),
    dnNo,
    date: body.date || todayISO(),
    customerId: body.customerId || "",
    customerName: body.customerName || "",
    contactPerson: body.contactPerson || "",
    phone: body.phone || "",
    deliveryLocation: body.deliveryLocation || "",
    projectName: body.projectName || "",
    status: body.status || "Draft",
    lines: (body.lines || []).map(line => ({
      id: line.id || id(),
      modelNo: cleanCell(line.modelNo || "").toUpperCase(),
      description: cleanCell(line.description || ""),
      availableQty: Number(line.availableQty || 0),
      qtyGoingOut: Number(line.qtyGoingOut || 0)
    })).filter(line => line.modelNo && line.qtyGoingOut > 0)
  };
}

function nextDeliveryNoFrom(current) {
  const match = String(current || "DN-2057").match(/^(.*?)(\d+)$/);
  if (!match) return current || "DN-2057";
  const prefix = match[1];
  const number = match[2];
  return `${prefix}${String(Number(number) + 1).padStart(number.length, "0")}`;
}

function nextPoNoFrom(current) {
  const fallback = `PO-${new Date().getFullYear()}-0001`;
  const match = String(current || fallback).match(/^(.*?)(\d+)$/);
  if (!match) return fallback;
  const prefix = match[1];
  const number = match[2];
  return `${prefix}${String(Number(number) + 1).padStart(number.length, "0")}`;
}

function nextPurchaseNoFromOrders(orders = []) {
  const year = new Date().getFullYear();
  let max = 0;
  for (const order of orders) {
    if (order.status !== "Created") continue;
    const match = String(order.poNo || "").match(/^PO-(\d{4})-(\d+)$/i);
    if (match && Number(match[1]) === year) max = Math.max(max, Number(match[2]));
  }
  return `PO-${year}-${String(max + 1).padStart(4, "0")}`;
}

function purchaseOrderView(store) {
  return {
    settings: store.settings || defaultPurchaseOrders().settings,
    orders: (store.orders || []).map(order => normalizePurchaseOrder(order, store, false)).sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""))),
    suppliers: (store.suppliers || []).map(normalizePurchaseSupplier).sort((a, b) => a.supplierName.localeCompare(b.supplierName)),
    uploads: store.uploads || []
  };
}

function normalizePurchaseSupplier(input = {}) {
  const now = new Date().toISOString();
  return {
    id: input.id || id(),
    supplierName: cleanCell(input.supplierName || input.name),
    contactPerson: cleanCell(input.contactPerson),
    phone: cleanCell(input.phone),
    email: cleanCell(input.email),
    address: cleanCell(input.address || input.supplierAddress),
    trn: cleanCell(input.trn || input.supplierTrn),
    deliveryTerms: cleanCell(input.deliveryTerms),
    paymentTerms: cleanCell(input.paymentTerms),
    createdAt: input.createdAt || now,
    updatedAt: now
  };
}

function normalizePurchasePaymentTerms(value) {
  const text = cleanCell(value);
  const lower = text.toLowerCase();
  if (!text) return "";
  if (/\b(cash|cdc|c\.d\.c|current\s+dated)\b/.test(lower)) return "CDC";
  if (/\b15\b/.test(lower) && /\b(day|days|pdc)\b/.test(lower)) return "15 Days PDC";
  if (/\b30\b/.test(lower) && /\b(day|days|pdc)\b/.test(lower)) return "30 Days PDC";
  if (/\b60\b/.test(lower) && /\b(day|days|pdc)\b/.test(lower)) return "60 Days PDC";
  if (/\b90\b/.test(lower) && /\b(day|days|pdc)\b/.test(lower)) return "90 Days PDC";
  return text;
}

function normalizePurchaseOrder(input = {}, store = defaultPurchaseOrders(), createOfficial = false) {
  const now = new Date().toISOString();
  const order = {
    id: input.id || id(),
    poNo: input.poNo || "",
    status: createOfficial ? "Created" : (input.status || "Draft"),
    supplierName: cleanCell(input.supplierName),
    supplierAddress: cleanCell(input.supplierAddress || input.address),
    trn: cleanCell(input.trn || input.supplierTrn || input.supplierTRN),
    quotationNo: cleanCell(input.quotationNo || input.quotationNumber),
    quotationDate: parseServerDate(input.quotationDate),
    purchaseRepresentative: cleanCell(input.purchaseRepresentative),
    poDate: parseServerDate(input.poDate) || todayISO(),
    projectName: cleanCell(input.projectName),
    deliveryTerms: cleanCell(input.deliveryTerms),
    paymentTerms: normalizePurchasePaymentTerms(input.paymentTerms),
    manualSubtotal: cleanCell(input.manualSubtotal),
    discount: Number(String(input.discount || "").replace(/,/g, "")) || 0,
    notes: cleanMultilineCell(input.notes) || DEFAULT_PURCHASE_NOTES,
    sourceUploadId: input.sourceUploadId || "",
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
    items: (input.items || input.lines || []).map(normalizePurchaseItem).filter(item => item.description || item.modelNo || item.qty || item.unitPrice)
  };
  if (!order.items.length) order.items = [normalizePurchaseItem({})];
  recalcPurchaseOrderServer(order);
  return order;
}

function normalizePurchaseItem(item = {}) {
  const modelNo = cleanCell(item.modelNo || item.modelNumber || item.model);
  const description = combinePurchaseDescriptionParts([
    item.description || item.itemDescription || item.item,
    item.size || item.dimension || item.dimensions,
    modelNo,
    item.remarks || item.remark || item.notes
  ]);
  return {
    id: item.id || id(),
    description,
    modelNo,
    qty: Number(item.qty || item.quantity || 0),
    unitPrice: Number(item.unitPrice || item.unitPriceAed || item.rate || 0),
    vatPercent: Number(item.vatPercent ?? item.vat ?? item.vatPercentage ?? 5),
    amount: Number(item.amount || 0)
  };
}

function combinePurchaseDescriptionParts(parts = []) {
  const output = [];
  for (const raw of parts) {
    const part = cleanCell(raw);
    if (!part) continue;
    const normalizedPart = part.toLowerCase().replace(/\s+/g, " ").trim();
    const alreadyIncluded = output.some(existing => {
      const normalizedExisting = existing.toLowerCase().replace(/\s+/g, " ").trim();
      return normalizedExisting === normalizedPart || normalizedExisting.includes(normalizedPart);
    });
    if (!alreadyIncluded) output.push(part);
  }
  return output.join(" - ");
}

function recalcPurchaseOrderServer(order) {
  let subtotal = 0;
  let vatTotal = 0;
  for (const item of order.items || []) {
    const base = Number(item.qty || 0) * Number(item.unitPrice || 0);
    const vat = base * (Number(item.vatPercent || 0) / 100);
    item.amount = base + vat;
    subtotal += base;
    vatTotal += vat;
  }
  const hasManualSubtotal = String(order.manualSubtotal || "").trim() !== "";
  const finalSubtotal = hasManualSubtotal ? Number(String(order.manualSubtotal).replace(/,/g, "")) || 0 : subtotal;
  const vatRate = subtotal > 0 ? vatTotal / subtotal : averagePurchaseVatRate(order.items);
  const discount = Number(String(order.discount || "").replace(/,/g, "")) || 0;
  const taxable = Math.max(0, finalSubtotal - discount);
  order.subtotal = finalSubtotal;
  order.discount = discount;
  order.vatTotal = taxable * vatRate;
  order.grandTotal = taxable + order.vatTotal;
}

function averagePurchaseVatRate(items = []) {
  const rates = (items || []).map(item => Number(item.vatPercent || 0)).filter(rate => Number.isFinite(rate) && rate > 0);
  const rate = rates.length ? rates.reduce((sum, item) => sum + item, 0) / rates.length : 5;
  return rate / 100;
}

function parseServerDate(value) {
  const text = String(value || "").trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return "";
}

function computeInventory(inventory) {
  const lots = [];
  for (const dn of inventory.supplierDns || []) {
    if (dn.status !== "Confirmed") continue;
    for (const line of dn.lines || []) {
      lots.push({
        lotId: `${dn.id}:${line.id}`,
        date: dn.uploadedDate,
        modelNo: line.modelNo,
        description: line.description,
        projectName: dn.projectName,
        supplierDnNo: dn.supplierDnNo,
        isManualAdjustment: !!dn.isManualAdjustment,
        receivedQty: Number(line.finalQty || 0),
        deliveredQty: 0,
        availableQty: Number(line.finalQty || 0)
      });
    }
  }
  lots.sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const movements = [];
  for (const lot of lots) {
    movements.push({
      date: lot.date,
      modelNo: lot.modelNo,
      description: lot.description,
      projectName: lot.projectName,
      referenceNo: lot.supplierDnNo,
      movementType: lot.isManualAdjustment ? "Manual Adjustment" : "Supplier DN Confirmed",
      quantity: lot.receivedQty,
      availableQty: lot.availableQty
    });
  }

  for (const dn of inventory.deliveryNotes || []) {
    if (dn.status !== "Issued") continue;
    for (const line of dn.lines || []) {
      let remaining = Number(line.qtyGoingOut || 0);
      const modelLots = lots.filter(lot => inventoryNorm(lot.modelNo) === inventoryNorm(line.modelNo) && lot.availableQty > 0);
      for (const lot of modelLots) {
        if (remaining <= 0) break;
        const used = Math.min(lot.availableQty, remaining);
        lot.availableQty -= used;
        lot.deliveredQty += used;
        remaining -= used;
      }
      movements.push({
        date: dn.date,
        modelNo: line.modelNo,
        description: line.description,
        projectName: dn.projectName,
        referenceNo: dn.dnNo,
        movementType: "Delivery Note Issued",
        quantity: -Number(line.qtyGoingOut || 0),
        availableQty: 0
      });
    }
  }

  const stockByModel = {};
  for (const model of inventory.models || []) {
    stockByModel[inventoryNorm(model.modelNo)] = { modelNo: model.modelNo, description: model.description, qty: 0, minimumStock: Number(model.minimumStock || 0) };
  }
  for (const lot of lots) {
    const key = inventoryNorm(lot.modelNo);
    if (!stockByModel[key]) stockByModel[key] = { modelNo: lot.modelNo, description: lot.description, qty: 0, minimumStock: 0 };
    stockByModel[key].qty += lot.availableQty;
    if (!stockByModel[key].description && lot.description) stockByModel[key].description = lot.description;
  }
  for (const movement of movements) {
    const key = inventoryNorm(movement.modelNo);
    if (stockByModel[key]) movement.availableQty = stockByModel[key].qty;
  }
  return { lots, stockByModel, movements };
}

async function inventoryView(inventory) {
  ensureManualStockNumbers(inventory);
  const computed = computeInventory(inventory);
  const stock = Object.values(computed.stockByModel).sort((a, b) => a.modelNo.localeCompare(b.modelNo));
  const lowStock = stock.filter(item => item.minimumStock && item.qty < item.minimumStock);
  const pendingReview = (inventory.supplierDns || []).filter(dn => dn.status === "Review Needed").length;
  const salesStore = await readSalesCrm();
  return {
    settings: inventory.settings,
    models: inventory.models,
    customers: mergedInventoryCustomers(inventory.customers || [], salesStore.customers || []),
    supplierDns: inventory.supplierDns || [],
    deliveryNotes: inventory.deliveryNotes,
    dashboard: {
      totalModels: stock.length,
      totalStockUnits: stock.reduce((sum, item) => sum + Number(item.qty || 0), 0),
      lowStockModels: lowStock.length,
      pendingReview,
      stock,
      lowStock,
      recentIn: computed.movements.filter(m => m.quantity > 0).slice(-3).reverse(),
      recentOut: computed.movements.filter(m => m.quantity < 0).slice(-3).reverse(),
      lots: computed.lots,
      movements: computed.movements
    }
  };
}

async function extractSupplierDnWithOpenAI(filePart, uploadId) {
  if (!process.env.OPENAI_API_KEY) {
    return { supplierDnNo: "", projectName: "", lines: [], message: "OpenAI API key is missing. Add rows manually or configure OPENAI_API_KEY." };
  }
  const mime = filePart.mimeType || "application/octet-stream";
  const base64 = filePart.body.toString("base64");
  const content = [{ type: "input_text", text: "Extract supplier delivery note data for AC unit stock only. Return JSON with supplierDnNo, projectName, lines [{modelNo, description, detectedQty, finalQty, status}]. Combine duplicate models. No prices." }];
  if (mime.includes("pdf")) content.push({ type: "input_file", filename: filePart.filename, file_data: `data:${mime};base64,${base64}` });
  else if (mime.startsWith("image/")) content.push({ type: "input_image", image_url: `data:${mime};base64,${base64}` });
  else return { supplierDnNo: "", projectName: "", lines: [], message: "Unsupported file type for OCR. Add rows manually." };
  const payload = {
    model: OPENAI_MODEL,
    input: [{ role: "user", content }],
    temperature: 0,
    text: { format: { type: "json_schema", name: "supplier_dn_extract", strict: true, schema: supplierDnSchema() } }
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) return { supplierDnNo: "", projectName: "", lines: [], message: json.error?.message || "OpenAI extraction failed." };
  try {
    return JSON.parse(extractResponseText(json));
  } catch {
    return { supplierDnNo: "", projectName: "", lines: [], message: "OCR response could not be parsed." };
  }
}

function supplierDnSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      supplierDnNo: { type: "string" },
      projectName: { type: "string" },
      lines: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            modelNo: { type: "string" },
            description: { type: "string" },
            detectedQty: { type: "number" },
            finalQty: { type: "number" },
            status: { type: "string" }
          },
          required: ["modelNo", "description", "detectedQty", "finalQty", "status"]
        }
      },
      message: { type: "string" }
    },
    required: ["supplierDnNo", "projectName", "lines", "message"]
  };
}

async function extractPurchaseQuotationWithOpenAI(filePart) {
  if (!process.env.OPENAI_API_KEY) {
    return { message: "OpenAI API key is missing. Fill the PO manually or configure OPENAI_API_KEY.", items: [] };
  }
  const mime = filePart.mimeType || "application/octet-stream";
  const base64 = filePart.body.toString("base64");
  const content = [{
    type: "input_text",
    text: "Extract supplier quotation details for a purchase order. Return blank strings for missing text values and 0 for missing numeric totals. Never invent values. Extract supplierName, supplierAddress, trn, quotationNo, quotationDate, projectName, paymentTerms, subtotal before VAT, discount if shown, and item rows with description, modelNo, qty, unitPrice, vatPercent, amount. Do not extract or change PO notes; return notes as an empty string. For paymentTerms, normalize cash/CDC/current dated cheque as CDC; 30 days as 30 Days PDC; 60 days as 60 Days PDC; 90 days as 90 Days PDC; 15 days as 15 Days PDC. For each item, combine every description-adjacent/specification column into the description field: Description, Size, Model, Type, Brand, Remarks, Specification, or any similar column next to description must become one description line joined with ' - '. Example: Description VCD, Size 1000 x 1000 mm, Model TAO => description 'VCD - 1000 x 1000 mm - TAO'. Keep qty, unit price, VAT, and amount separate as usual. Return JSON only."
  }];
  if (mime.startsWith("image/")) content.push({ type: "input_image", image_url: `data:${mime};base64,${base64}` });
  else content.push({ type: "input_file", filename: filePart.filename, file_data: `data:${mime};base64,${base64}` });
  const payload = {
    model: OPENAI_MODEL,
    input: [{ role: "user", content }],
    temperature: 0,
    text: { format: { type: "json_schema", name: "purchase_quotation_extract", strict: true, schema: purchaseQuotationSchema() } }
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) return { message: json.error?.message || "Quotation extraction failed.", items: [] };
  try {
    return JSON.parse(extractResponseText(json));
  } catch {
    return { message: "Quotation OCR response could not be parsed.", items: [] };
  }
}

function purchaseQuotationSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      supplierName: { type: "string" },
      supplierAddress: { type: "string" },
      trn: { type: "string" },
      quotationNo: { type: "string" },
      quotationDate: { type: "string" },
      projectName: { type: "string" },
      paymentTerms: { type: "string" },
      notes: { type: "string" },
      subtotal: { type: "number" },
      discount: { type: "number" },
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            description: { type: "string" },
            modelNo: { type: "string" },
            qty: { type: "number" },
            unitPrice: { type: "number" },
            vatPercent: { type: "number" },
            amount: { type: "number" }
          },
          required: ["description", "modelNo", "qty", "unitPrice", "vatPercent", "amount"]
        }
      },
      message: { type: "string" }
    },
    required: ["supplierName", "supplierAddress", "trn", "quotationNo", "quotationDate", "projectName", "paymentTerms", "notes", "subtotal", "discount", "items", "message"]
  };
}

function deliveryNotePdfHtml(payload) {
  const dn = payload.deliveryNote || payload;
  const rows = (dn.lines || []).map((line, index) => `
    <tr>
      <td class="sl">${index + 1}</td>
      <td><strong>${esc(line.modelNo)}</strong><br><span>${esc(line.description)}</span></td>
      <td class="qty"><strong>${money(line.qtyGoingOut)}</strong><br><span>pcs</span></td>
    </tr>
  `).join("");
  const challanNo = deliveryChallanNo(dn.dnNo);
  const challanDate = formatChallanDate(todayISO());
  const letterhead = assetDataUri("assets/letterhead-full.jpg");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(challanNo)} Delivery Challan</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3f4f7; font-family: Arial, Helvetica, sans-serif; color: #111; }
    .page { position: relative; width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff ${letterhead ? `url("${letterhead}")` : ""} center top / 210mm 297mm no-repeat; overflow: hidden; padding: 31mm 16mm 30mm; }
    .intro { display: grid; grid-template-columns: 1fr 1fr; gap: 18mm; align-items: start; }
    .company-block { margin-left: 5mm; margin-top: 7mm; font-size: 12px; line-height: 1.35; color: #343434; }
    .company-block strong { display: block; margin-bottom: 1mm; font-size: 13px; letter-spacing: .1px; }
    .title { text-align: right; margin-top: 14mm; }
    .title h1 { margin: 0 0 3mm; font-size: 32px; font-weight: 400; letter-spacing: .5px; }
    .title strong { font-size: 13px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 18mm; margin-top: 18mm; font-size: 13px; align-items: start; }
    .deliver-to { line-height: 1.45; }
    .deliver-to .label { margin-bottom: 1mm; }
    .meta-table { width: 100%; border-collapse: collapse; }
    .meta-table td { padding: 0 0 4.5mm; border: 0; }
    .meta-table td:first-child { text-align: right; padding-right: 8mm; width: 45%; }
    .meta-table td:last-child { text-align: right; font-weight: 500; }
    .item-table { width: 100%; border-collapse: collapse; margin-top: 6mm; font-size: 13px; }
    .item-table th { background: #363837; color: #fff; padding: 3.3mm 4mm; font-weight: 400; text-align: left; }
    .item-table th.qty, .item-table td.qty { text-align: right; }
    .item-table td { border-bottom: 1px solid #9d9d9d; padding: 4mm; vertical-align: top; }
    .item-table td.sl { width: 11mm; text-align: center; }
    .item-table td.qty { width: 24mm; }
    .item-table td span { display: inline-block; margin-top: 1.5mm; font-size: 12px; }
    .receiver { width: 47%; margin: 16mm 0 0 auto; font-size: 14px; line-height: 2.2; }
    @media print { body { background: #fff; } .page { margin: 0; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="intro">
      <div class="company-block">
        <strong>COMFORT ZONE A/C. DEVICES TR. LLC</strong>
        SHOWROOM 1<br>
        INDUSTRIAL AREA 18<br>
        SHARJAH Sharjah 343105<br>
        U.A.E<br>
        TRN 100543358400003<br>
        00971561772530<br>
        mudassir@comfortzoneuae.com<br>
        https://comfortzoneuae.com/
      </div>
      <div class="title">
        <h1>DELIVERY CHALLAN</h1>
        <strong>Delivery Challan# ${esc(challanNo)}</strong>
      </div>
    </div>
    <div class="meta">
      <div class="deliver-to">
        <div class="label">Deliver To</div>
        <strong>${esc(dn.customerName)}</strong><br>
        ${esc(dn.deliveryLocation)}<br>
        ${dn.phone ? `Tel: ${esc(dn.phone)}<br>` : ""}
        ${dn.contactPerson ? `Contact: ${esc(dn.contactPerson)}<br>` : ""}
        U.A.E
      </div>
      <table class="meta-table">
        <tr><td>Challan Date :</td><td>${esc(challanDate)}</td></tr>
        <tr><td>Ref :</td><td>${esc(dn.projectName)}</td></tr>
      </table>
    </div>
    <table class="item-table">
      <thead><tr><th style="width:12mm">#</th><th>Item &amp; Description</th><th class="qty">Qty</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="3">No items added.</td></tr>`}</tbody>
    </table>
    <div class="receiver">
      Receivers Name:<br>
      Receiver Number:<br>
      Date &amp; Signature:
    </div>
  </div>
</body>
</html>`;
}

function assetDataUri(relativePath) {
  const file = path.join(PUBLIC, relativePath);
  if (!fs.existsSync(file)) return "";
  const ext = path.extname(file).toLowerCase() === ".png" ? "png" : "jpeg";
  return `data:image/${ext};base64,${fs.readFileSync(file).toString("base64")}`;
}

function deliveryChallanNo(dnNo) {
  const text = String(dnNo || "DN").trim();
  const match = text.match(/^DN[-/ ]?(.+)$/i);
  return match ? `DN/${match[1]}` : text;
}

function formatChallanDate(dateValue) {
  const date = new Date(`${dateValue || todayISO()}T00:00:00`);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, " ");
}

function deliveryNotePdfBuffer(payload) {
  const input = {
    ...(payload || {}),
    letterheadPath: path.join(PUBLIC, "assets", "letterhead-full.jpg")
  };
  const result = spawnSync(PYTHON_EXE, [DELIVERY_NOTE_PDF_SCRIPT], {
    input: JSON.stringify(input),
    maxBuffer: 15 * 1024 * 1024
  });
  if (result.status !== 0) {
    const message = result.stderr ? result.stderr.toString("utf8") : "Unknown PDF generation error";
    throw new Error(message);
  }
  return result.stdout;
}

function purchaseOrderPdfBuffer(order) {
  const result = spawnSync(PYTHON_EXE, [PURCHASE_ORDER_PDF_SCRIPT], {
    input: JSON.stringify({ order }),
    maxBuffer: 15 * 1024 * 1024
  });
  if (result.status !== 0) {
    const message = result.stderr ? result.stderr.toString("utf8") : "Unknown PO PDF generation error";
    throw new Error(message);
  }
  return result.stdout;
}

function purchaseOrderPdfFilename(order) {
  const supplier = safeName(order.supplierName || "Supplier").replace(/\s+/g, "-");
  return `${safeName(order.poNo || "PO")}-${supplier}.pdf`.replace(/"/g, "");
}

async function salesQuotationPdfBuffer(payload) {
  if (PDFDocument) return salesQuotationPdfKitBuffer(payload);
  const input = {
    ...(payload || {}),
    letterheadPath: path.join(PUBLIC, "assets", "quotation-letterhead.jpg")
  };
  const result = spawnSync(PYTHON_EXE, [SALES_QUOTATION_PDF_SCRIPT], {
    input: JSON.stringify(input),
    maxBuffer: 15 * 1024 * 1024
  });
  if (result.status !== 0) {
    const message = result.stderr ? result.stderr.toString("utf8") : "Unknown quotation PDF generation error";
    throw new Error(message);
  }
  return result.stdout;
}

function salesQuotationPdfKitBuffer(payload) {
  return new Promise((resolve, reject) => {
    const quote = payload.quote || payload;
    const customer = payload.customer || {};
    const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
    const chunks = [];
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const left = 46;
    const tableWidth = pageWidth - left * 2;
    const bottom = 86;
    const letterhead = path.join(PUBLIC, "assets", "quotation-letterhead.jpg");

    const drawBackground = () => {
      if (fs.existsSync(letterhead)) {
        doc.image(letterhead, 0, 0, { width: pageWidth, height: pageHeight });
      }
      doc.fillColor("#000000").strokeColor("#c5cddb").lineWidth(0.6);
    };

    const addPage = () => {
      doc.addPage({ size: "A4", margin: 0 });
      drawBackground();
      return 142;
    };

    const writeWrapped = (text, x, y, width, options = {}) => {
      doc.font(options.bold ? "Helvetica-Bold" : "Helvetica").fontSize(options.size || 8.6).fillColor("#000000");
      doc.text(String(text || ""), x, y, {
        width,
        align: options.align || "left",
        lineGap: options.lineGap || 1
      });
    };

    const textHeight = (text, width, size = 8.6) => {
      doc.font("Helvetica").fontSize(size);
      return doc.heightOfString(String(text || ""), { width, lineGap: 1 });
    };

    const detailTable = (x, y, width) => {
      const labelW = 88;
      const valueW = 168;
      const label2W = 96;
      const value2W = width - labelW - valueW - label2W;
      const rowH = 25;
      const rows = [
        ["Customer:", quote.customer, "Date:", formatPdfDate(quote.date)],
        ["Contact Person:", customer.contact, "Quotation No:", quote.no],
        ["Email:", customer.email, "Salesperson:", quote.salesperson],
        ["Payment Terms:", quote.paymentTerms, "Availability:", quote.deliveryTime]
      ];
      const height = rowH * (rows.length + 1);
      doc.rect(x, y, width, height).stroke("#000000");
      let rowY = y;
      for (const row of rows) {
        doc.moveTo(x, rowY + rowH).lineTo(x + width, rowY + rowH).stroke();
        const colX = [x + labelW, x + labelW + valueW, x + labelW + valueW + label2W];
        for (const lineX of colX) doc.moveTo(lineX, rowY).lineTo(lineX, rowY + rowH).stroke();
        writeWrapped(row[0], x + 6, rowY + 8, labelW - 10, { bold: true });
        writeWrapped(row[1], x + labelW + 6, rowY + 8, valueW - 10);
        writeWrapped(row[2], x + labelW + valueW + 6, rowY + 8, label2W - 10, { bold: true });
        writeWrapped(row[3], x + labelW + valueW + label2W + 6, rowY + 8, value2W - 10);
        rowY += rowH;
      }
      doc.moveTo(x + labelW, rowY).lineTo(x + labelW, rowY + rowH).stroke();
      writeWrapped("Project:", x + 6, rowY + 8, labelW - 10, { bold: true });
      writeWrapped(quote.project, x + labelW + 6, rowY + 8, width - labelW - 10);
      return y + height;
    };

    const drawItemHeader = y => {
      const widths = [42, tableWidth - 162, 60, 60];
      doc.rect(left, y, tableWidth, 22).fillAndStroke("#e1e5eb", "#c5cddb");
      let x = left;
      ["S. No.", "Description", "Qty", "Unit"].forEach((title, index) => {
        doc.strokeColor("#c5cddb").moveTo(x, y).lineTo(x, y + 22).stroke();
        doc.font("Helvetica-Bold").fontSize(8.4).fillColor("#000000")
          .text(title, x + 4, y + 7, { width: widths[index] - 8, align: "center" });
        x += widths[index];
      });
      doc.moveTo(left + tableWidth, y).lineTo(left + tableWidth, y + 22).stroke();
      return { y: y + 22, widths };
    };

    const drawItemRow = (item, serial, y, widths) => {
      const descriptionHeight = textHeight(item.description, widths[1] - 14, 8.4);
      const rowH = Math.max(24, descriptionHeight + 14);
      if (y + rowH > pageHeight - bottom - 90) {
        y = addPage();
        ({ y, widths } = drawItemHeader(y));
      }
      doc.rect(left, y, tableWidth, rowH).stroke("#c5cddb");
      let x = left;
      for (const width of widths.slice(0, -1)) {
        x += width;
        doc.moveTo(x, y).lineTo(x, y + rowH).stroke();
      }
      const mid = y + rowH / 2 - 4;
      writeWrapped(serial, left + 4, mid, widths[0] - 8, { align: "center" });
      writeWrapped(item.description, left + widths[0] + 8, y + 8, widths[1] - 14, { size: 8.4 });
      writeWrapped(trimNumber(item.qty), left + widths[0] + widths[1] + 4, mid, widths[2] - 8, { align: "center" });
      writeWrapped(item.unit || "Nos", left + widths[0] + widths[1] + widths[2] + 4, mid, widths[3] - 8, { align: "center" });
      return y + rowH;
    };

    const drawSummary = y => {
      const itemSubtotal = (quote.items || []).reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.unitPrice || 0), 0);
      const manual = String(quote.manualSubtotal || "").replace(/,/g, "").trim();
      const subtotal = manual ? Number(manual || 0) : itemSubtotal;
      const discount = Number(quote.discount || 0);
      const taxable = Math.max(0, subtotal - discount);
      const vat = taxable * 0.05;
      const net = taxable + vat;
      const rows = [["Total", money(subtotal)]];
      if (discount) {
        rows.push(["Discount", `-${money(discount)}`]);
        rows.push(["Subtotal", money(taxable)]);
      }
      rows.push(["VAT 5%", money(vat)], ["Net Amount", money(net)]);
      y += 15;
      for (const [label, value] of rows) {
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#000000");
        doc.text(label, left + tableWidth - 155, y, { width: 80, align: "right" });
        doc.text(value, left + tableWidth - 70, y, { width: 70, align: "right" });
        y += 14;
      }
      return y + 8;
    };

    const drawBlock = (title, text, y) => {
      if (!String(text || "").trim()) return y;
      if (y > pageHeight - bottom - 50) y = addPage();
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#000000").text(title, left, y, { width: tableWidth });
      y += 16;
      doc.font("Helvetica").fontSize(8.3);
      for (const raw of String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")) {
        const height = doc.heightOfString(raw || " ", { width: tableWidth, lineGap: 2 });
        if (y + height > pageHeight - bottom) y = addPage();
        doc.text(raw || " ", left, y, { width: tableWidth, lineGap: 2 });
        y += Math.max(11, height);
      }
      return y + 8;
    };

    drawBackground();
    doc.font("Helvetica-Bold").fontSize(14.5).fillColor("#07152f").text("Quotation", 0, 124, { width: pageWidth, align: "center" });
    let y = detailTable(left, 154, tableWidth) + 20;
    doc.font("Helvetica-Bold").fontSize(9.3).fillColor("#000000").text("Subject: Supply of Daikin AC Units", left, y);
    y += 18;
    doc.font("Helvetica").fontSize(8.9).text("Thank you very much for your valid enquiry. We are offering our best quote as below.", left, y);
    y += 31;
    let header = drawItemHeader(y);
    y = header.y;
    for (let index = 0; index < (quote.items || []).length; index += 1) {
      y = drawItemRow(quote.items[index], index + 1, y, header.widths);
    }
    y = drawSummary(y);
    y = drawBlock("Notes", quote.notes, y);
    y = drawBlock("Terms & Conditions", quote.terms, y);
    doc.end();
  });
}

function formatPdfDate(value) {
  const text = String(value || "").trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const dmy = text.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (dmy) return `${dmy[1]}/${dmy[2]}/${dmy[3]}`;
  return text;
}

function trimNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return String(value || "");
  return String(number).replace(/\.0+$/, "");
}

function salesQuotationPdfFilename(quote) {
  const customer = safeName(quote.customer || "Customer").replace(/\s+/g, "-");
  return `${safeName(quote.no || "Quotation")}-${customer}.pdf`.replace(/"/g, "");
}

function extractVrvFile(file, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  if (ext !== ".docx") {
    return {
      status: "needs_parser",
      materialRows: [],
      vrvRows: [],
      projectName: "",
      message: "Automatic VRV extraction is available for DOCX in this MVP. PDF/image parsing needs OCR."
    };
  }
  const entries = unzipEntries(Buffer.isBuffer(file) ? file : fs.readFileSync(file));
  const documentXml = entries["word/document.xml"];
  if (!documentXml) return { status: "error", materialRows: [], vrvRows: [], projectName: "", message: "Could not read DOCX document.xml" };
  const text = xmlText(documentXml);
  const projectMatch = text.match(/Project name:\s*([^\n]+)/i);
  const projectName = projectMatch ? projectMatch[1].trim() : "";
  const materialRows = extractMaterialRows(documentXml);
  const vrvRows = extractVrvRows(documentXml, text);
  return {
    status: materialRows.length || vrvRows.length ? "ok" : "empty",
    materialRows,
    vrvRows,
    projectName,
    message: materialRows.length || vrvRows.length ? "VRV report extracted." : "No material rows were detected."
  };
}

function unzipEntries(buffer) {
  const entries = {};
  let offset = 0;
  while (offset < buffer.length - 30) {
    const sig = buffer.readUInt32LE(offset);
    if (sig !== 0x04034b50) {
      offset += 1;
      continue;
    }
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLen).toString("utf8");
    const start = offset + 30 + nameLen + extraLen;
    const compressed = buffer.subarray(start, start + compressedSize);
    if (method === 0) entries[name] = compressed.toString("utf8");
    if (method === 8) entries[name] = zlib.inflateRawSync(compressed, { finishFlush: zlib.constants.Z_SYNC_FLUSH }).toString("utf8");
    offset = start + compressedSize;
    if (!compressedSize && !uncompressedSize) break;
  }
  return entries;
}

function unzipEntriesBuffer(buffer) {
  const entries = {};
  let offset = 0;
  while (offset < buffer.length - 30) {
    const sig = buffer.readUInt32LE(offset);
    if (sig !== 0x04034b50) {
      offset += 1;
      continue;
    }
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLen).toString("utf8");
    const start = offset + 30 + nameLen + extraLen;
    const compressed = buffer.subarray(start, start + compressedSize);
    let data = Buffer.alloc(0);
    if (method === 0) data = Buffer.from(compressed);
    if (method === 8) data = zlib.inflateRawSync(compressed, { finishFlush: zlib.constants.Z_SYNC_FLUSH });
    entries[name] = { name, data, method, uncompressedSize };
    offset = start + compressedSize;
    if (!compressedSize && !uncompressedSize) break;
  }
  return entries;
}

function zipEntries(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const name of Object.keys(entries)) {
    const data = Buffer.isBuffer(entries[name].data) ? entries[name].data : Buffer.from(entries[name].data);
    const compressed = zlib.deflateRawSync(data);
    const nameBuffer = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBuffer, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuffer);
    offset += local.length + nameBuffer.length + compressed.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function xmlText(xml) {
  return xml
    .replace(/<w:br\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n");
}

function extractTables(xml) {
  const tables = [];
  const tblMatches = xml.match(/<w:tbl[\s\S]*?<\/w:tbl>/g) || [];
  for (const tbl of tblMatches) {
    const rows = [];
    const trMatches = tbl.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];
    for (const tr of trMatches) {
      const cells = [];
      const tcMatches = tr.match(/<w:tc[\s\S]*?<\/w:tc>/g) || [];
      for (const tc of tcMatches) cells.push(xmlText(tc).trim());
      rows.push(cells);
    }
    tables.push(rows);
  }
  return tables;
}

function extractMaterialRows(xml) {
  const tables = extractTables(xml);
  const material = tables.find(table => {
    const h = (table[0] || []).join("|").toLowerCase();
    return h.includes("model") && h.includes("quantity") && h.includes("description");
  });
  if (!material) return [];
  return material.slice(1)
    .map(row => ({ model: cleanCell(row[0]), qty: Number(cleanCell(row[1])) || cleanCell(row[1]), description: cleanCell(row[2]) }))
    .filter(row => row.model && String(row.model).toLowerCase() !== "model");
}

function extractVrvRows(xml, text) {
  const systemByPrefix = {};
  const outdoorBySystem = {};
  const systemLines = text.split("\n").filter(line => /^VRV-[A-Z0-9]+/i.test(line.trim()));
  for (const line of systemLines) {
    const system = (line.match(/^(VRV-[A-Z0-9]+)/i) || [])[1];
    if (system) {
      const normalizedSystem = system.toUpperCase();
      systemByPrefix[system.replace(/^VRV-/i, "").toUpperCase()] = normalizedSystem;
      const main = (line.match(/-\s*([A-Z0-9]+)\s*=/i) || [])[1];
      const componentsPart = line.includes("=") ? line.split("=").slice(1).join("=") : "";
      const components = componentsPart.split("+").map(part => cleanCell(part)).filter(Boolean);
      outdoorBySystem[normalizedSystem] = { main, components };
    }
  }
  const tables = extractTables(xml);
  const rows = [];
  for (const table of tables) {
    const header = (table[0] || []).join("|").toLowerCase();
    const second = (table[1] || []).join("|").toLowerCase();
    if (!(header.includes("name") && header.includes("fcu")) && !(second.includes("name") && second.includes("fcu"))) continue;
    for (const row of table.slice(2)) {
      const name = cleanCell(row[0]);
      const fcu = cleanCell(row[1]);
      if (!/^FCU-/i.test(name) || !fcu) continue;
      const prefix = (name.match(/^FCU-([A-Z0-9]+)/i) || [])[1] || "";
      rows.push({ system: systemByPrefix[prefix.toUpperCase()] || `VRV-${prefix.toUpperCase()}`, name, fcu, outdoorName: "", outdoorModel: "" });
    }
  }
  const seen = new Set();
  const uniqueRows = rows.filter(row => {
    const key = `${row.system}|${row.name}|${row.fcu}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const systemCounts = {};
  for (const row of uniqueRows) {
    const info = outdoorBySystem[row.system];
    if (!info) continue;
    const index = systemCounts[row.system] || 0;
    if (index === 0 && info.main) {
      row.outdoorName = row.system;
      row.outdoorModel = info.main;
    } else if (info.components[index - 1]) {
      row.outdoorName = String.fromCharCode(64 + index);
      row.outdoorModel = info.components[index - 1];
    }
    systemCounts[row.system] = index + 1;
  }
  return uniqueRows;
}

function cleanCell(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

function cleanMultilineCell(value) {
  return String(value == null ? "" : value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map(line => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .trim();
}

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tableWorkbookHtml(title, columns, rows, summaryRows) {
  const head = columns.map(col => `<td><b>${esc(col)}</b></td>`).join("");
  const body = rows.map(row => `<tr>${columns.map(col => `<td>${esc(row[col])}</td>`).join("")}</tr>`).join("");
  const summaryPad = Math.max(columns.length - 2, 0);
  const summary = summaryRows.map(row => `<tr>${Array.from({ length: summaryPad }, () => "<td></td>").join("")}<td><b>${esc(row.label)}</b></td><td><b>${esc(row.value)}</b></td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="ProgId" content="Excel.Sheet"><style>table{border-collapse:collapse}td{border:1px solid #d9d9d9;padding:2px 4px;vertical-align:top}</style></head><body><table><tbody><tr>${head}</tr>${body}${summary}</tbody></table></body></html>`;
}

function quotationHtml(payload) {
  const d = payload.details || {};
  const b = payload.boq || { columns: [], rows: [], summary: {} };
  const rows = (b.rows || []).map(row => `<tr><td>${esc(row["S.No"])}</td><td>${esc(row.Description)}</td><td>${esc(row.Qty)}</td><td>${esc(row.Unit || "Nos")}</td></tr>`).join("");
  const total = Number(b.summary && b.summary.total || 0);
  const vat = Number(b.summary && b.summary.vat || 0);
  const net = Number(b.summary && b.summary.netAmount || 0);
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(payload.quotationNo || "Quotation")}</title>
<style>
body{font-family:Arial,sans-serif;color:#111;font-size:11pt}
h1{text-align:center;font-size:20pt}
table{border-collapse:collapse;width:100%;margin:12px 0}
td,th{border:1px solid #333;padding:6px;vertical-align:top}
th{background:#d9d9d9}
.meta td:nth-child(1),.meta td:nth-child(3){font-weight:bold;width:16%}
.summary{width:40%;margin-left:auto}
</style></head>
<body>
<h1>Quotation</h1>
<table class="meta">
<tr><td>Customer:</td><td>${esc(d.customer)}</td><td>Date:</td><td>${esc(d.date)}</td></tr>
<tr><td>Contact Person:</td><td>${esc(d.contactPerson)}</td><td>Quotation No:</td><td>${esc(payload.quotationNo)}</td></tr>
<tr><td>Tel. No:</td><td>${esc(d.telNo)}</td><td>Enq. No:</td><td>${esc(d.enquiryNo)}</td></tr>
<tr><td>Email:</td><td>${esc(d.email)}</td><td></td><td></td></tr>
<tr><td>Project:</td><td colspan="3">${esc(d.project)}</td></tr>
</table>
<p><b>Subject:</b> Supply of Daikin AC Units</p>
<p>Thank you very much for your valid enquiry. We are offering our best quote as below.</p>
<table>
<thead><tr><th>S. No.</th><th>Description</th><th>Qty</th><th>Unit</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<table class="summary">
<tr><td><b>Total</b></td><td>${money(total)}</td></tr>
<tr><td><b>VAT 5%</b></td><td>${money(vat)}</td></tr>
<tr><td><b>Net Amount</b></td><td>${money(net)}</td></tr>
</table>
<table>
<tr><th colspan="3">Terms & Conditions</th></tr>
<tr><td>Validity</td><td>:</td><td>${esc(d.validity)}</td></tr>
<tr><td>Terms of Payment</td><td>:</td><td>100% advance.</td></tr>
</table>
<p>Thanking You</p>
<p>For Comfort Zone AC Trading LLC</p>
<p>Prepared by: ${esc(d.preparedBy)}</p>
</body></html>`;
}

function generateQuotationDocx(payload) {
  const entries = unzipEntriesBuffer(fs.readFileSync(QUOTATION_TEMPLATE));
  const documentPath = "word/document.xml";
  let xml = entries[documentPath].data.toString("utf8");
  xml = fillQuotationDetails(xml, payload);
  xml = replaceBoqPlaceholder(xml, payload.boq || { rows: [], summary: {} });
  entries[documentPath].data = Buffer.from(xml, "utf8");
  return zipEntries(entries);
}

function fillQuotationDetails(xml, payload) {
  const d = payload.details || {};
  const q = payload.quotationNo || "";
  const replacements = [
    ["Customer:", d.customer || ""],
    ["Contact Person:", d.contactPerson || ""],
    ["Tel. No:", d.telNo || ""],
    ["Email:", d.email || ""],
    ["Project:", d.project || ""],
    ["Date:", formatDocDate(d.date || "")],
    ["Quotation No:", q],
    ["Enq. No:", d.enquiryNo || ""]
  ];
  return removeSalesEngineerSection(replaceFirstTableValues(xml, replacements));
}

function replaceFirstTableValues(xml, replacements) {
  const match = xml.match(/<w:tbl[\s\S]*?<\/w:tbl>/);
  if (!match) return xml;
  let table = match[0];
  for (const [label, value] of replacements) {
    table = replaceValueAfterLabel(table, label, value);
  }
  return xml.slice(0, match.index) + table + xml.slice(match.index + match[0].length);
}

function replaceValueAfterLabel(tableXml, label, value) {
  const rows = tableXml.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];
  for (const row of rows) {
    const cells = row.match(/<w:tc[\s\S]*?<\/w:tc>/g) || [];
    for (let i = 0; i < cells.length - 1; i += 1) {
      if (xmlText(cells[i]).trim() === label) {
        const next = setCellText(cells[i + 1], value);
        const newRow = row.replace(cells[i + 1], next);
        return tableXml.replace(row, newRow);
      }
    }
  }
  return tableXml;
}

function replaceBoqPlaceholder(xml, boq) {
  const marker = "{{BOQ_TABLE}}";
  const index = xml.indexOf(marker);
  if (index < 0) return xml;
  const pStart = findParagraphStart(xml, index);
  const pEnd = xml.indexOf("</w:p>", index);
  if (pStart < 0 || pEnd < 0) return xml.replace(marker, "");
  const tableXml = buildBoqDocxTable(boq);
  return xml.slice(0, pStart) + tableXml + xml.slice(pEnd + "</w:p>".length);
}

function findParagraphStart(xml, index) {
  const candidates = ["<w:p ", "<w:p>"];
  let best = -1;
  for (const token of candidates) {
    const found = xml.lastIndexOf(token, index);
    if (found > best) best = found;
  }
  return best;
}

function buildBoqDocxTable(boq) {
  const rows = boq.rows || [];
  const summary = boq.summary || {};
  const widths = [760, 5700, 1200, 1440];
  const tableRows = [
    docxRow(["S. No.", "Description", "Qty", "Unit"], widths, true),
    ...rows.map(row => docxRow([
      row["S.No"] || row["S. No."] || "",
      row.Description || "",
      row.Qty || "",
      row.Unit || "Nos"
    ], widths, false)),
    docxSummaryRow("Total", money(summary.total || 0), widths),
    docxSummaryRow("VAT 5%", money(summary.vat || 0), widths),
    docxSummaryRow("Net Amount", money(summary.netAmount || 0), widths)
  ].join("");
  return `<w:tbl>
<w:tblPr><w:tblW w:w="9100" w:type="dxa"/><w:tblInd w:w="0" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>
<w:tblGrid>${widths.map(width => `<w:gridCol w:w="${width}"/>`).join("")}</w:tblGrid>
${tableRows}
</w:tbl>`;
}

function docxRow(values, widths, header) {
  return `<w:tr>${values.map((value, index) => docxCell(value, widths[index], header)).join("")}</w:tr>`;
}

function docxSummaryRow(label, value, widths) {
  return `<w:tr>${docxCell("", widths[0], false)}${docxCell("", widths[1], false)}${docxCell(label, widths[2], true)}${docxCell(value, widths[3], true)}</w:tr>`;
}

function docxCell(value, width, bold) {
  const fill = bold ? `<w:shd w:fill="D9D9D9"/>` : "";
  const b = bold ? "<w:b/>" : "";
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${fill}<w:tcMar><w:top w:w="70" w:type="dxa"/><w:left w:w="70" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr>${b}<w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r></w:p></w:tc>`;
}

function removeSalesEngineerSection(xml) {
  const tables = [...xml.matchAll(/<w:tbl[\s\S]*?<\/w:tbl>/g)];
  for (const match of tables) {
    if (xmlText(match[0]).includes("Sales Engineer")) {
      const table = match[0].replace(/Sales Engineer[\s\S]*?yoonus@comfortzoneuae\.com/g, "");
      return xml.slice(0, match.index) + table + xml.slice(match.index + match[0].length);
    }
  }
  return xml
    .replace(/Sales Engineer[\s\S]*?Yoonus Muhamed[\s\S]*?\+971 56 683 3511[\s\S]*?yoonus@comfortzoneuae\.com/g, "")
    .replace(/Sales Engineer\s*\|\s*Yoonus Muhamed\s*\|\s*\+971 56 683 3511\s*\|\s*yoonus@comfortzoneuae\.com/g, "");
}

function setCellText(cellXml, value) {
  const tcPr = (cellXml.match(/<w:tcPr[\s\S]*?<\/w:tcPr>/) || [""])[0];
  return `<w:tc>${tcPr}<w:p><w:r><w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r></w:p></w:tc>`;
}

function formatDocDate(value) {
  if (!value) return "";
  const parts = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : value;
}

function escapeXml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(value) {
  return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res).catch(error => {
      console.error(error);
      send(res, 500, { error: error.message || "Server error" });
    });
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`HVAC Workflow App running at http://127.0.0.1:${PORT}`);
});
