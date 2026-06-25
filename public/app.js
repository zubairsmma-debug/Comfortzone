const $ = selector => document.querySelector(selector);
const canvas = $("#canvas");

let state = null;
let activeView = "canvas";
let drag = null;
let canvasZoom = 0.72;
let preserveTableSizes = false;
let projectPersisted = false;
let projectTouched = false;
let inventoryState = null;
let inventoryScreen = "dashboard";
let activeSupplierDnId = "";
let supplierAllPage = 1;
let deliveryDraft = null;
let deliveryListPage = 1;
let deliverySearchQuery = "";
let deliveryPanelWidth = Number(localStorage.getItem("deliveryPanelWidth") || 430);
let deliveryResize = null;
let purchaseState = null;
let purchaseScreen = "form";
let purchaseDraft = null;
let purchaseSearchQuery = "";
let purchaseSupplierSearchQuery = "";
let salesDeskScreen = "dashboard";
let salesQuotationMode = "list";
let salesProjectMode = "list";
let salesProjectFilter = "";
let salesSearchQuery = "";
let salesLeadFilter = "";
let salesFollowUpMode = "list";
let salesFollowUpFilter = "";
let salesFollowUpFilterOpen = false;
let salesQuotationDraft = null;
let salesCrmState = null;
let currentUser = null;
let appSettings = null;
let settingsDraft = null;
const paymentTermOptions = ["CDC", "15 Days PDC", "30 Days PDC", "60 Days PDC", "90 Days PDC"];
const defaultPurchaseNotes = `1. Invoice should be attached with delivery note signed by site supervisor.
2. Attach LPO copy along with invoice.
3. Delivery to be made as per schedule instruction provided to you.`;
const quoteVrvTerms = `Warranty:
Units offered are covered under a standard warranty of 12 months from the date of purchase for the whole units and a total of 60 months on compressor against manufacturing defects. The warranty covers the replacement of defective parts and does not include labor charges. Defects caused due to improper installation will void the warranty.

Custom Duties & Taxes:
Only included if specifically mentioned in the proposal. If included, quoted prices are based on the prevailing rate for Custom duty and Taxes. However, if any variation in custom duty and / or other Taxes are imposed by the Federal Government, such variations will be borne by the purchaser.

Inland Freight:
1. In land Freight is included if units are delivered in one lot.
2. Offloading & Rigging at site is not included.

Cancellation:
25% of the material value will become payable in the event of cancellation, prior to the start of manufacturing. After manufacturing has started cancellation will be determined based on costs incurred by us.

Warehouse Fee:
A warehouse fee of 2% will be charged per month for all non-collected and or / non-delivered goods. This charge will become applicable (3) days from the agreed delivery date.

Exclusions:
Installation of AC units, unloading of units at site & supply of items other than mentioned.`;
const quoteFahuNotes = `Notes for FAHU:
1. All major specifications as per Daikin Standards.
2. Access doors are provided as per Daikin Standards.
3. Light & port hole shall be provided for filter and fan section.
4. Differential pressure switch 50-500 Pa shall be provided for each filter section
5. Drive screen shall be provided for all Fan section

Exclusions for FAHU:
1. Sound attenuators or silencers, sand trap louvers, insect screen, damper actuators, Motorized dampers.
2. We have not considered any control valves, thermostats or any kind of DDC or electric control, starters.
3. Any item which is not mentioned specifically in our offer.
4. We are not considering any spares for the units.
5. Unloading, installation, storage and maintenance of equipment's at site.
6. Starter panel and disconnect switch for AHU's.
7. VFD's for fan motors.
8. Special Warranty if any
9. Testing of AHU's
10. Assembly of modular sections of AHUs at site.
11. Modulating control valve installed on return CHW pipe.
12. External Vibration Isolators.
13. BMS connectivity.
14. Performance testing.
15. Thyristor Modulating controls/Controls for heaters if any
16. Starter & DDC control panel for AHUs.
17. EC Motor for AHU/FAHU
18. Spare filters/belts/bearings/Motors for AHU/FAHU

Exclusions for VRV ODU for FAHU:
1. Home Automation system interface
2. Central controller
3. Installation of any systems quoted
4. Copper pipes, insulation, Electrical wires and accessories
5. Refrigerant gas, supply & topping up.
6. Anything that is not mentioned in the BOQ above.`;
const quoteFahuTerms = `Warranty:
Units offered are covered under a standard warranty of 12 months from the date of purchase for the whole units and an additional 48 months on compressor against manufacturing defects. Warranty covers the replacement of defective parts and does not include labor charges. Defects caused due to improper installation will void the warranty.

Exclusions:
Installation of AC units, unloading of units at site & supply of items other than mentioned.`;
const salesCrmData = {
  settings: { nextQuotationNo: `CZ-QTN-${new Date().getFullYear()}-0416`, nextEnquiryNo: `ENQ-${new Date().getFullYear()}-0001` },
  leads: [
    { id: "L-1001", avatar: "AM", customer: "Mr. Ahmed Mansoor", phone: "+971 50 123 4567", requirement: "Daikin AC Supply & Install", projectType: "Villa Project", location: "Jumeirah 1, Dubai", source: "WhatsApp", status: "New Lead", followUp: "22 Jun 2026", priority: "Overdue" },
    { id: "L-1002", avatar: "SL", customer: "Skyline Logistics", phone: "+971 4 445 2190", requirement: "Warehouse VRV Replacement", projectType: "Commercial", location: "Dubai Investment Park", source: "Website", status: "Contacted", followUp: "24 Jun 2026", priority: "Today" },
    { id: "L-1003", avatar: "PN", customer: "Priya Nair", phone: "+971 55 901 2234", requirement: "Apartment ducted AC service", projectType: "Apartment", location: "JLT, Dubai", source: "Referral", status: "Site Visit", followUp: "25 Jun 2026", priority: "Planned" },
    { id: "L-1004", avatar: "TN", customer: "TechNova Solutions", phone: "+971 4 777 1020", requirement: "Office maintenance contract", projectType: "Commercial", location: "Business Bay, Dubai", source: "Website", status: "Quotation Needed", followUp: "26 Jun 2026", priority: "Planned" }
  ],
  customers: [
    { id: "C-1001", icon: "CO", name: "ABC Contracting LLC", type: "Commercial", contact: "Mr. Sameer Ahmad", role: "Procurement Manager", phone: "+971 50 123 4567", email: "sameer@abccontracting.ae", address: "Business Bay, Dubai", detail: "Tower A, Suite 1402", trn: "100234567890003" },
    { id: "C-1002", icon: "EV", name: "Elite Villas Management", type: "Maintenance", contact: "Fatima Al Sayed", role: "Property Supervisor", phone: "+971 4 888 2345", email: "fatima@elitevillas.ae", address: "Palm Jumeirah, Dubai", detail: "Villa Cluster 6", trn: "100987654320003" },
    { id: "C-1003", icon: "TN", name: "TechNova Solutions", type: "Commercial", contact: "Priya Nair", role: "Admin Manager", phone: "+971 55 612 9911", email: "admin@technova.ae", address: "JLT, Dubai", detail: "Cluster X", trn: "100675430000003" }
  ],
  projects: [
    { id: "P-2026-0042", name: "Villa AC Replacement - Jumeirah", customer: "ABC Contracting", location: "Jumeirah 1, Dubai", type: "Residential", requirement: "Supply & Installation", engineer: "Sarah Johnson", status: "Site Visit Done", date: "12 Oct 2026", value: "AED 128,500" },
    { id: "P-2026-0043", name: "Retail Mall Ducting Service", customer: "Majid Al Futtaim", location: "Mirdif, Dubai", type: "Commercial", requirement: "Repair / Service", engineer: "Michael Chen", status: "Quotation Sent", date: "14 Oct 2026", value: "AED 42,600" },
    { id: "P-2026-0044", name: "Office VRV Maintenance", customer: "TechNova Solutions", location: "JLT, Dubai", type: "Commercial", requirement: "AMC / Maintenance", engineer: "Arjun Singh", status: "Negotiation", date: "16 Oct 2026", value: "AED 88,900" }
  ],
  quotations: [
    { id: "Q-1001", no: "CZ-QTN-2026-0001-R2", revision: "2 Revisions", date: "18 May 2026", customer: "Rahul Mehta", project: "Villa AC Replacement", location: "Dubai Marina, UAE", amount: 125800, status: "Revised" },
    { id: "Q-1002", no: "CZ-QTN-2026-0412", revision: "Fresh Quote", date: "19 May 2026", customer: "GreenLeaf Apartments", project: "Ducted AC Supply", location: "Kondapur", amount: 84200, status: "Sent" },
    { id: "Q-1003", no: "CZ-QTN-2026-0413", revision: "Fresh Quote", date: "20 May 2026", customer: "TechNova Solutions", project: "Office Maintenance", location: "JLT, Dubai", amount: 62000, status: "Approved" }
  ],
  followUps: [
    { id: "F-1001", avatar: "RJ", customer: "Robert Jenkins", phone: "+1 555-0123", project: "HVAC Unit Replacement", quotation: "#QUO-8821", date: "Oct 20, 2026", due: "3 Days Overdue", type: "Call", status: "Overdue" },
    { id: "F-1002", avatar: "SL", customer: "Sarah Lopez", phone: "+1 555-0987", project: "Ductless Mini-Split Install", quotation: "#QUO-8854", date: "Oct 23, 2026", due: "Today @ 2:00 PM", type: "Message", status: "Today" },
    { id: "F-1003", avatar: "MA", customer: "Mr. Ahmed Mansoor", phone: "+971 50 123 4567", project: "Daikin AC Supply & Install", quotation: "CZ-QTN-2026-0415", date: "Oct 25, 2026", due: "Upcoming", type: "Site Visit", status: "Scheduled" }
  ]
};
const debounceSaveProject = debounce(() => saveProject({ auto: true }), 600);

const tableKeys = {
  thermalTable: "thermal",
  costingTable: "costing",
  boqTable: "boq",
  vrvSchedule: "vrvSchedule"
};

const samplePriceItems = [
  { model: "RXYTQ16U5YF", description: "DAIKIN VRV OUTDOOR UNIT", origin: "TURKEY", boqDescription: "RXYTQ16U5YF - DAIKIN VRV OUTDOOR UNIT - TURKEY", listPrice: 54285, multiplier: 0.5, costPrice: 27142.5, tr: 12.8 },
  { model: "RXYTQ8U5YF", description: "DAIKIN VRV OUTDOOR UNIT", origin: "TURKEY", boqDescription: "RXYTQ8U5YF - DAIKIN VRV OUTDOOR UNIT - TURKEY", listPrice: 30360, multiplier: 0.5, costPrice: 15180, tr: 6.4 },
  { model: "RXYTQ14U5YF", description: "DAIKIN VRV OUTDOOR UNIT", origin: "TURKEY", boqDescription: "RXYTQ14U5YF - DAIKIN VRV OUTDOOR UNIT - TURKEY", listPrice: 52544, multiplier: 0.5, costPrice: 26272, tr: 11.2 },
  { model: "RXYTQ12U5YF", description: "DAIKIN VRV OUTDOOR UNIT", origin: "TURKEY", boqDescription: "RXYTQ12U5YF - DAIKIN VRV OUTDOOR UNIT - TURKEY", listPrice: 43196, multiplier: 0.5, costPrice: 21598, tr: 9.6 },
  { model: "FXSQ25A", description: "DAIKIN VRV INDOOR UNIT- Ducted (medium static)", origin: "CZECH REPUBLIC", boqDescription: "FXSQ25A - DAIKIN VRV INDOOR UNIT- Ducted (medium static) - CZECH REPUBLIC", listPrice: 4498, multiplier: 0.55, costPrice: 2473.9, tr: 0 },
  { model: "FXSQ32A", description: "DAIKIN VRV INDOOR UNIT- Ducted (medium static)", origin: "CZECH REPUBLIC", boqDescription: "FXSQ32A - DAIKIN VRV INDOOR UNIT- Ducted (medium static) - CZECH REPUBLIC", listPrice: 4636, multiplier: 0.55, costPrice: 2549.8, tr: 0 },
  { model: "FXSQ63A", description: "DAIKIN VRV INDOOR UNIT- Ducted (medium static)", origin: "CZECH REPUBLIC", boqDescription: "FXSQ63A - DAIKIN VRV INDOOR UNIT- Ducted (medium static) - CZECH REPUBLIC", listPrice: 5955, multiplier: 0.55, costPrice: 3275.25, tr: 0 },
  { model: "FXSQ80A", description: "DAIKIN VRV INDOOR UNIT- Ducted (medium static)", origin: "CZECH REPUBLIC", boqDescription: "FXSQ80A - DAIKIN VRV INDOOR UNIT- Ducted (medium static) - CZECH REPUBLIC", listPrice: 6136, multiplier: 0.55, costPrice: 3374.8, tr: 0 },
  { model: "FXSQ100A", description: "DAIKIN VRV INDOOR UNIT- Ducted (medium static)", origin: "CZECH REPUBLIC", boqDescription: "FXSQ100A - DAIKIN VRV INDOOR UNIT- Ducted (medium static) - CZECH REPUBLIC", listPrice: 6994, multiplier: 0.55, costPrice: 3846.7, tr: 0 },
  { model: "KHRQ22M20T", description: "DAIKIN REFNETS - IDU", origin: "BELGIUM", boqDescription: "KHRQ22M20T - DAIKIN REFNETS - IDU - BELGIUM", listPrice: 726, multiplier: 0.65, costPrice: 471.9, tr: 0 },
  { model: "KHRQ22M29T9", description: "DAIKIN REFNETS - IDU", origin: "BELGIUM", boqDescription: "KHRQ22M29T9 - DAIKIN REFNETS - IDU - BELGIUM", listPrice: 805, multiplier: 0.65, costPrice: 523.25, tr: 0 },
  { model: "KHRQ22M64T", description: "DAIKIN REFNETS - IDU", origin: "BELGIUM", boqDescription: "KHRQ22M64T - DAIKIN REFNETS - IDU - BELGIUM", listPrice: 1061, multiplier: 0.65, costPrice: 689.65, tr: 0 },
  { model: "KHRQ22M75T", description: "DAIKIN REFNETS - IDU", origin: "BELGIUM", boqDescription: "KHRQ22M75T - DAIKIN REFNETS - IDU - BELGIUM", listPrice: 2223, multiplier: 0.65, costPrice: 1444.95, tr: 0 },
  { model: "BHFQ22P1007", description: "DAIKIN REFNETS - ODU", origin: "BELGIUM", boqDescription: "BHFQ22P1007 - DAIKIN REFNETS - ODU - BELGIUM", listPrice: 1124, multiplier: 0.65, costPrice: 730.6, tr: 0 },
  { model: "BHFQ22P1517", description: "DAIKIN REFNETS - ODU", origin: "BELGIUM", boqDescription: "BHFQ22P1517 - DAIKIN REFNETS - ODU - BELGIUM", listPrice: 2184, multiplier: 0.65, costPrice: 1419.6, tr: 0 },
  { model: "BRC1H82W", description: "DAIKIN WIRED THERMOSTAT (WHITE)", origin: "CHINA", boqDescription: "BRC1H82W - DAIKIN WIRED THERMOSTAT (WHITE) - CHINA", listPrice: 493, multiplier: 0.65, costPrice: 320.45, tr: 0 }
];

const fallbackMaterialRows = [
  ["RXYTQ16U5YF", 2], ["RXYTQ8U5YF", 1], ["RXYTQ14U5YF", 1], ["RXYTQ12U5YF", 3],
  ["FXSQ25A", 9], ["FXSQ32A", 1], ["FXSQ63A", 5], ["FXSQ80A", 5], ["FXSQ100A", 11],
  ["KHRQ22M20T", 3], ["KHRQ22M29T9", 6], ["KHRQ22M64T", 14], ["KHRQ22M75T", 5],
  ["BHFQ22P1007", 2], ["BHFQ22P1517", 1], ["BRC1H82W", 31]
];

const fallbackVrvRows = [
  { system: "VRV-BF", name: "FCU-BF-01", fcu: "FXSQ63A", outdoorName: "", outdoorModel: "" },
  { system: "VRV-BF", name: "FCU-BF-02", fcu: "FXSQ80A", outdoorName: "", outdoorModel: "" },
  { system: "VRV-BF", name: "FCU-BF-03", fcu: "FXSQ100A", outdoorName: "VRV-BF", outdoorModel: "RXYTQ36U5YF" },
  { system: "VRV-BF", name: "FCU-BF-04", fcu: "FXSQ25A", outdoorName: "A", outdoorModel: "RXYTQ12U5YF" },
  { system: "VRV-BF", name: "FCU-BF-05", fcu: "FXSQ80A", outdoorName: "B", outdoorModel: "RXYTQ12U5YF" },
  { system: "VRV-BF", name: "FCU-BF-05", fcu: "FXSQ80A", outdoorName: "C", outdoorModel: "RXYTQ12U5YF" },
  { system: "VRV-GF", name: "FCU-GF-01", fcu: "FXSQ100A", outdoorName: "VRV-GF", outdoorModel: "RXYTQ14U5YF" },
  { system: "VRV-GF", name: "FCU-GF-01", fcu: "FXSQ100A", outdoorName: "A", outdoorModel: "RXYTQ16U5YF" },
  { system: "VRV-GF", name: "FCU-GF-02", fcu: "FXSQ63A", outdoorName: "B", outdoorModel: "RXYTQ8U5YF" }
];

const sampleThermalRows = [
  ["FCU-BF-01", "BASEMENT FLOOR", "A", "FXSQ-A", 24.4, 17.2, 20, 5.6, 4.1, "", 253],
  ["FCU-BF-02", "BASEMENT FLOOR", "A", "FXSQ-A", 24.4, 17.2, 20, 7.1, 5.2, "", 350],
  ["FCU-BF-03", "BASEMENT FLOOR", "A", "FXSQ-A", 24.4, 17.2, 20, 9.0, 6.5, "", 812],
  ["FCU-BF-04", "BASEMENT FLOOR", "A", "FXSQ-A", 24.4, 17.2, 20, 2.2, 1.6, "", 318],
  ["FCU-BF-05", "BASEMENT FLOOR", "A", "FXSQ-A", 24.4, 17.2, 20, 7.1, 5.2, "", 350],
  ["FCU-GF-01", "GROUND FLOOR", "A", "FXSQ-A", 24.4, 17.2, 20, 9.0, 6.5, "", 812],
  ["FCU-GF-02", "GROUND FLOOR", "A", "FXSQ-A", 24.4, 17.2, 20, 5.6, 4.1, "", 253]
];

init();

async function init() {
  bindShell();
  const authenticated = await loadAuth();
  if (!authenticated) return;
  await loadSalesCrm().catch(() => {});
  const url = new URL(location.href);
  const projectId = url.searchParams.get("project");
  if (projectId) {
    await loadProject(projectId);
  } else {
    await createProject();
  }
}

function bindShell() {
  $("#newProjectBtn").addEventListener("click", createProject);
  $("#inventoryBtn").addEventListener("click", () => showInventory("dashboard"));
  $("#documentsBtn").addEventListener("click", showDocuments);
  $("#purchaseOrdersBtn").addEventListener("click", () => showPurchaseOrders("form"));
  $("#salesDeskBtn").addEventListener("click", () => showSalesDesk("dashboard"));
  $("#settingsBtn").addEventListener("click", showSettings);
  $("#logoutBtn").addEventListener("click", logout);
  $("#loginForm").addEventListener("submit", login);
  $("#saveBtn").addEventListener("click", () => saveProject({ manual: true, force: true }));
  $("#addNodeBtn").addEventListener("click", addFileNode);
  $("#zoomOutBtn").addEventListener("click", () => setZoom(canvasZoom - 0.1));
  $("#zoomInBtn").addEventListener("click", () => setZoom(canvasZoom + 0.1));
  $("#zoomFitBtn").addEventListener("click", zoomToFit);
  $("#searchInput").addEventListener("input", debounce(loadProjectList, 150));
  $("#closeChatBtn").addEventListener("click", () => $("#chatPanel").classList.add("hidden"));
  $("#addThermalSampleBtn").addEventListener("click", addThermalSampleRows);
  $("#confirmThermalBtn").addEventListener("click", extractThermalFromChat);
  $("#thermalFileInput").addEventListener("change", uploadThermalFromChat);
  $("#familyModelSelect").addEventListener("change", () => {
    $("#customFamilyModelInput").classList.toggle("hidden", $("#familyModelSelect").value !== "Other");
  });
  document.querySelectorAll("[data-inventory-view]").forEach(button => {
    button.addEventListener("click", () => showInventory(button.dataset.inventoryView));
  });
  document.querySelectorAll("[data-sales-view]").forEach(button => {
    button.addEventListener("click", () => showSalesDesk(button.dataset.salesView));
  });
  $("#inventoryRoot").addEventListener("click", handleInventoryClick);
  $("#inventoryRoot").addEventListener("input", handleInventoryInput);
  $("#purchaseOrdersRoot").addEventListener("click", handlePurchaseClick);
  $("#purchaseOrdersRoot").addEventListener("input", handlePurchaseInput);
  $("#salesDeskRoot").addEventListener("click", handleSalesClick);
  $("#salesDeskRoot").addEventListener("input", handleSalesInput);
  $("#salesDeskRoot").addEventListener("change", handleSalesChange);
  $("#settingsRoot").addEventListener("click", handleSettingsClick);
  $("#settingsRoot").addEventListener("input", handleSettingsInput);
  $("#settingsRoot").addEventListener("change", handleSettingsChange);
  window.addEventListener("pointermove", handleDeliveryResizeMove);
  window.addEventListener("pointerup", stopDeliveryResize);
  window.addEventListener("mousemove", handleDeliveryResizeMove);
  window.addEventListener("mouseup", stopDeliveryResize);
}

async function loadAuth() {
  const auth = await api("/api/auth/me").catch(() => ({ user: null, settings: null }));
  currentUser = auth.user;
  appSettings = auth.settings;
  applyAppSettings();
  if (!currentUser) {
    showLogin();
    return false;
  }
  hideLogin();
  return true;
}

function showLogin() {
  $("#loginView").classList.remove("hidden");
  document.body.classList.add("login-active");
}

function hideLogin() {
  $("#loginView").classList.add("hidden");
  document.body.classList.remove("login-active");
}

async function login(event) {
  event.preventDefault();
  $("#loginMessage").textContent = "";
  try {
    const auth = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: $("#loginEmail").value.trim(), password: $("#loginPassword").value })
    });
    currentUser = auth.user;
    appSettings = auth.settings;
    applyAppSettings();
    hideLogin();
    await loadSalesCrm().catch(() => {});
    const url = new URL(location.href);
    const projectId = url.searchParams.get("project");
    if (projectId) await loadProject(projectId);
    else await createProject();
  } catch {
    $("#loginMessage").textContent = "Invalid email or password.";
  }
}

async function logout() {
  await api("/api/auth/logout", { method: "POST", body: "{}" }).catch(() => {});
  currentUser = null;
  showLogin();
}

function applyAppSettings() {
  const company = appSettings?.company || {};
  const brand = document.querySelector(".sidebar .brand");
  if (!brand) return;
  const mark = brand.querySelector(".brand-mark");
  const title = brand.querySelector("strong");
  const subtitle = brand.querySelector("span");
  if (title) title.textContent = company.name || "Comfort Zone";
  if (subtitle) subtitle.textContent = "Daikin";
  if (mark) {
    if (company.logoUploadId) {
      mark.innerHTML = `<img src="/api/settings/uploads/${encodeURIComponent(company.logoUploadId)}" alt="">`;
      mark.classList.add("has-logo");
    } else {
      mark.textContent = initialsText(company.name || "CZ").slice(0, 2);
      mark.classList.remove("has-logo");
    }
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options
  });
  if (response.status === 401 && path !== "/api/auth/me" && path !== "/api/auth/login") {
    currentUser = null;
    showLogin();
  }
  if (!response.ok) throw new Error(await response.text());
  const type = response.headers.get("content-type") || "";
  return type.includes("application/json") ? response.json() : response.blob();
}

async function createProject() {
  state = await api("/api/projects?draft=1", { method: "POST", body: "{}" });
  projectPersisted = false;
  projectTouched = false;
  if (!state.priceList.items.length) state.priceList.items = structuredClone(samplePriceItems);
  applyCompactLayout(true);
  history.replaceState(null, "", location.pathname);
  showCanvas();
  render();
  requestAnimationFrame(zoomToFit);
}

async function loadProject(id) {
  state = await api(`/api/projects/${id}`);
  projectPersisted = true;
  projectTouched = false;
  applyCompactLayout(false);
  showCanvas();
  render();
  requestAnimationFrame(zoomToFit);
}

async function saveProject(options = {}) {
  if (!state) return;
  const opts = options && typeof options === "object" ? options : {};
  if (!opts.auto) projectTouched = true;
  if (!projectTouched && !opts.force && !opts.manual) return;
  const workflowStarted = hasWorkflowSourceUpload() || opts.manual;
  if (!workflowStarted && !opts.allowHidden) {
    if (opts.manual) toast("Workflow saved");
    return;
  }
  state.visible = workflowStarted;
  state.title = state.details.project || state.details.customer || "Untitled Project";
  state = await api(`/api/projects/${state.id}`, { method: "PUT", body: JSON.stringify(state) });
  projectPersisted = true;
  projectTouched = false;
  if (state.visible && !new URLSearchParams(location.search).get("project")) {
    history.replaceState(null, "", `?project=${state.id}`);
  }
  if (opts.manual || opts.showToast) toast("Workflow saved");
}

async function ensureProjectSaved(options = {}) {
  projectTouched = true;
  await saveProject({ force: true, allowHidden: !!options.hidden });
}

function scheduleProjectSave() {
  if (!hasWorkflowSourceUpload()) return;
  projectTouched = true;
  debounceSaveProject();
}

function hasWorkflowSourceUpload() {
  if (!state) return false;
  if (state.visible) return true;
  return state.nodes.some(node =>
    (node.id === "thermal-upload" || node.id === "vrv-upload") &&
    node.data &&
    node.data.uploadId
  );
}

async function showDocuments() {
  activeView = "documents";
  setCanvasActionsVisible(false);
  renderViewActions();
  $("#canvasView").classList.add("hidden");
  $("#documentsView").classList.remove("hidden");
  $("#inventoryView").classList.add("hidden");
  $("#purchaseOrdersView").classList.add("hidden");
  $("#salesDeskView").classList.add("hidden");
  $("#settingsView").classList.add("hidden");
  $("#documentsBtn").classList.add("active");
  $("#newProjectBtn").classList.add("active");
  $("#inventoryBtn").classList.remove("active");
  $("#purchaseOrdersBtn").classList.remove("active");
  $("#salesDeskBtn").classList.remove("active");
  $("#settingsBtn").classList.remove("active");
  $("#projectSubnav").classList.remove("hidden");
  $("#inventorySubnav").classList.add("hidden");
  $("#salesDeskSubnav").classList.add("hidden");
  $("#pageTitle").textContent = "My WorkFlows";
  $("#projectMeta").textContent = "Search and reopen saved workflow canvases.";
  await loadProjectList();
}

function showCanvas() {
  activeView = "canvas";
  setCanvasActionsVisible(true);
  renderViewActions();
  $("#documentsView").classList.add("hidden");
  $("#inventoryView").classList.add("hidden");
  $("#purchaseOrdersView").classList.add("hidden");
  $("#salesDeskView").classList.add("hidden");
  $("#settingsView").classList.add("hidden");
  $("#canvasView").classList.remove("hidden");
  $("#newProjectBtn").classList.add("active");
  $("#documentsBtn").classList.remove("active");
  $("#inventoryBtn").classList.remove("active");
  $("#purchaseOrdersBtn").classList.remove("active");
  $("#salesDeskBtn").classList.remove("active");
  $("#settingsBtn").classList.remove("active");
  $("#projectSubnav").classList.remove("hidden");
  $("#inventorySubnav").classList.add("hidden");
  $("#salesDeskSubnav").classList.add("hidden");
}

async function showInventory(screen = "dashboard") {
  activeView = "inventory";
  setCanvasActionsVisible(false);
  inventoryScreen = screen;
  renderViewActions();
  $("#canvasView").classList.add("hidden");
  $("#documentsView").classList.add("hidden");
  $("#inventoryView").classList.remove("hidden");
  $("#purchaseOrdersView").classList.add("hidden");
  $("#salesDeskView").classList.add("hidden");
  $("#settingsView").classList.add("hidden");
  $("#newProjectBtn").classList.remove("active");
  $("#documentsBtn").classList.remove("active");
  $("#inventoryBtn").classList.add("active");
  $("#purchaseOrdersBtn").classList.remove("active");
  $("#salesDeskBtn").classList.remove("active");
  $("#settingsBtn").classList.remove("active");
  $("#projectSubnav").classList.add("hidden");
  $("#inventorySubnav").classList.remove("hidden");
  $("#salesDeskSubnav").classList.add("hidden");
  document.querySelectorAll("[data-inventory-view]").forEach(button => {
    const activeScreen = screen === "supplierAll" ? "supplier" : screen;
    button.classList.toggle("active", button.dataset.inventoryView === activeScreen);
  });
  $("#pageTitle").textContent = "Inventory";
  $("#projectMeta").textContent = "Quantity-only AC unit stock tracking.";
  await loadInventory();
  renderInventory();
}

async function showPurchaseOrders(screen = "form") {
  activeView = "purchaseOrders";
  setCanvasActionsVisible(false);
  purchaseScreen = screen;
  renderViewActions();
  $("#canvasView").classList.add("hidden");
  $("#documentsView").classList.add("hidden");
  $("#inventoryView").classList.add("hidden");
  $("#purchaseOrdersView").classList.remove("hidden");
  $("#salesDeskView").classList.add("hidden");
  $("#settingsView").classList.add("hidden");
  $("#newProjectBtn").classList.remove("active");
  $("#documentsBtn").classList.remove("active");
  $("#inventoryBtn").classList.remove("active");
  $("#purchaseOrdersBtn").classList.add("active");
  $("#salesDeskBtn").classList.remove("active");
  $("#settingsBtn").classList.remove("active");
  $("#projectSubnav").classList.add("hidden");
  $("#inventorySubnav").classList.add("hidden");
  $("#salesDeskSubnav").classList.add("hidden");
  $("#pageTitle").textContent = "Purchase Orders";
  $("#projectMeta").textContent = "Upload a quotation to auto-fill the PO form, or create a purchase order manually.";
  await loadPurchaseOrders();
  if (!purchaseDraft) purchaseDraft = newPurchaseDraft();
  renderPurchaseOrders();
}

async function showSalesDesk(screen = "dashboard") {
  activeView = "salesDesk";
  setCanvasActionsVisible(false);
  salesDeskScreen = screen;
  renderViewActions();
  $("#canvasView").classList.add("hidden");
  $("#documentsView").classList.add("hidden");
  $("#inventoryView").classList.add("hidden");
  $("#purchaseOrdersView").classList.add("hidden");
  $("#salesDeskView").classList.remove("hidden");
  $("#settingsView").classList.add("hidden");
  $("#newProjectBtn").classList.remove("active");
  $("#documentsBtn").classList.remove("active");
  $("#inventoryBtn").classList.remove("active");
  $("#purchaseOrdersBtn").classList.remove("active");
  $("#salesDeskBtn").classList.add("active");
  $("#settingsBtn").classList.remove("active");
  $("#projectSubnav").classList.add("hidden");
  $("#inventorySubnav").classList.add("hidden");
  $("#salesDeskSubnav").classList.remove("hidden");
  document.querySelectorAll("[data-sales-view]").forEach(button => {
    button.classList.toggle("active", button.dataset.salesView === screen);
  });
  $("#pageTitle").textContent = "Sales Desk";
  $("#projectMeta").textContent = "CRM workspace from lead to quotation.";
  await loadSalesCrm();
  renderSalesDesk();
}

async function showSettings() {
  activeView = "settings";
  setCanvasActionsVisible(false);
  renderViewActions();
  $("#canvasView").classList.add("hidden");
  $("#documentsView").classList.add("hidden");
  $("#inventoryView").classList.add("hidden");
  $("#purchaseOrdersView").classList.add("hidden");
  $("#salesDeskView").classList.add("hidden");
  $("#settingsView").classList.remove("hidden");
  $("#newProjectBtn").classList.remove("active");
  $("#documentsBtn").classList.remove("active");
  $("#inventoryBtn").classList.remove("active");
  $("#purchaseOrdersBtn").classList.remove("active");
  $("#salesDeskBtn").classList.remove("active");
  $("#settingsBtn").classList.add("active");
  $("#projectSubnav").classList.add("hidden");
  $("#inventorySubnav").classList.add("hidden");
  $("#salesDeskSubnav").classList.add("hidden");
  $("#pageTitle").textContent = "Settings";
  $("#projectMeta").textContent = "Admin settings, company details, attachments, and login access.";
  await loadSettings();
  renderSettings();
}

async function loadSettings() {
  const response = await api("/api/settings");
  currentUser = response.user;
  appSettings = response.settings;
  settingsDraft = structuredClone(appSettings);
  applyAppSettings();
}

function renderSettings() {
  const root = $("#settingsRoot");
  if (!isCurrentAdmin()) {
    root.innerHTML = `<div class="inventory-card"><h2>Settings</h2><p class="inventory-muted">Only Admin users can edit company settings and login access.</p></div>`;
    return;
  }
  settingsDraft = settingsDraft || structuredClone(appSettings);
  root.innerHTML = `
    <div class="settings-page">
      <div class="settings-grid">
        ${settingsCompanyCard("company", "Company Details")}
        ${settingsCompanyCard("company2", "Company 2 Details")}
      </div>
      <div class="settings-grid">
        ${settingsAttachmentsCard()}
        ${settingsUsersCard()}
      </div>
    </div>
  `;
}

function isCurrentAdmin() {
  return String(currentUser?.role || "").toLowerCase() === "admin";
}

function settingsCompanyCard(companyKey, title) {
  const company = settingsDraft?.[companyKey] || {};
  return `
    <section class="inventory-card settings-card">
      <div class="inventory-topbar">
        <div><h2>${escapeHtml(title)}</h2><p class="inventory-muted">Used for app branding and company documents.</p></div>
        <button class="primary-button" data-save-company="${companyKey}">Save</button>
      </div>
      <div class="settings-logo-row">
        <div class="settings-logo-preview">${company.logoUploadId ? `<img src="/api/settings/uploads/${encodeURIComponent(company.logoUploadId)}" alt="">` : initialsText(company.name || "CZ").slice(0, 2)}</div>
        <label class="ghost-button settings-upload-button">Upload Logo<input type="file" data-settings-upload-logo="${companyKey}" accept=".png,.jpg,.jpeg,.svg"></label>
      </div>
      <div class="form-grid">
        <label>Company Name<input data-company-key="${companyKey}" data-company-field="name" value="${escapeHtml(company.name || "")}"></label>
        <label>TRN<input data-company-key="${companyKey}" data-company-field="trn" value="${escapeHtml(company.trn || "")}"></label>
        <label>Phone<input data-company-key="${companyKey}" data-company-field="phone" value="${escapeHtml(company.phone || "")}"></label>
        <label>Email<input data-company-key="${companyKey}" data-company-field="email" value="${escapeHtml(company.email || "")}"></label>
        <label>Website<input data-company-key="${companyKey}" data-company-field="website" value="${escapeHtml(company.website || "")}"></label>
        <label class="span-two">Address<textarea data-company-key="${companyKey}" data-company-field="address">${escapeHtml(company.address || "")}</textarea></label>
      </div>
    </section>
  `;
}

function settingsAttachmentsCard() {
  const attachments = settingsDraft?.attachments || [];
  return `
    <section class="inventory-card settings-card">
      <div class="inventory-topbar">
        <div><h2>Attachments</h2><p class="inventory-muted">Upload templates, certificates, letterheads, and company files.</p></div>
        <label class="primary-button settings-upload-button">Attach File<input type="file" data-settings-upload-file></label>
      </div>
      <table class="inventory-table">
        <thead><tr><th>File</th><th>Type</th><th>Size</th><th>Uploaded</th><th>Action</th></tr></thead>
        <tbody>${attachments.map(file => `
          <tr>
            <td><strong>${escapeHtml(file.originalName)}</strong></td>
            <td>${escapeHtml(file.category || "Attachment")}</td>
            <td>${prettyBytes(file.size || 0)}</td>
            <td>${file.createdAt ? new Date(file.createdAt).toLocaleDateString("en-GB") : ""}</td>
            <td>${rowMenu([
              { label: "Preview", action: "settings-preview-file", id: file.id },
              { label: "Delete", action: "settings-delete-file", id: file.id, danger: true }
            ])}</td>
          </tr>`).join("") || `<tr><td colspan="5">No files attached.</td></tr>`}</tbody>
      </table>
    </section>
  `;
}

function settingsUsersCard() {
  const users = settingsDraft?.users || [];
  return `
    <section class="inventory-card settings-card">
      <div class="inventory-topbar">
        <div><h2>Login Access</h2><p class="inventory-muted">Only active users can login with their email and password.</p></div>
        <button class="primary-button" data-add-settings-user>Add User</button>
      </div>
      <table class="inventory-table">
        <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>${users.map(user => `
          <tr>
            <td><input data-settings-user="${escapeHtml(user.id)}" data-user-field="name" value="${escapeHtml(user.name || "")}"></td>
            <td><select data-settings-user="${escapeHtml(user.id)}" data-user-field="role">${["Admin", "Staff"].map(role => `<option ${user.role === role ? "selected" : ""}>${role}</option>`).join("")}</select></td>
            <td><input data-settings-user="${escapeHtml(user.id)}" data-user-field="email" value="${escapeHtml(user.email || "")}"></td>
            <td><select data-settings-user="${escapeHtml(user.id)}" data-user-field="active"><option value="true" ${user.active !== false ? "selected" : ""}>Active</option><option value="false" ${user.active === false ? "selected" : ""}>Disabled</option></select></td>
            <td>${rowMenu([
              { label: "Set Password", action: "settings-password-user", id: user.id },
              { label: "Save", action: "settings-save-user", id: user.id },
              { label: "Delete", action: "settings-delete-user", id: user.id, danger: true }
            ])}</td>
          </tr>`).join("")}</tbody>
      </table>
      <div class="settings-new-user hidden" id="settingsNewUser">
        <h3>New User</h3>
        <div class="form-grid">
          <label>Name<input id="settingsNewUserName"></label>
          <label>Role<select id="settingsNewUserRole"><option>Staff</option><option>Admin</option></select></label>
          <label>Email<input id="settingsNewUserEmail" type="email"></label>
          <label>Password<input id="settingsNewUserPassword" type="password"></label>
        </div>
        <div class="inventory-actions"><button class="ghost-button" data-cancel-settings-user>Cancel</button><button class="primary-button" data-save-new-settings-user>Save User</button></div>
      </div>
    </section>
  `;
}

async function handleSettingsClick(event) {
  const target = event.target.closest("button");
  if (!target || !$("#settingsRoot").contains(target)) return;
  if (target.dataset.rowMenu !== undefined) {
    const menu = target.closest(".row-menu").querySelector(".row-menu-list");
    document.querySelectorAll(".row-menu-list").forEach(list => {
      if (list !== menu) list.classList.add("hidden");
    });
    menu.classList.toggle("hidden");
    return;
  }
  if (target.dataset.saveCompany) return saveSettingsCompany(target.dataset.saveCompany);
  if (target.dataset.addSettingsUser !== undefined) {
    $("#settingsNewUser")?.classList.remove("hidden");
    $("#settingsNewUserName")?.focus();
    return;
  }
  if (target.dataset.cancelSettingsUser !== undefined) {
    $("#settingsNewUser")?.classList.add("hidden");
    return;
  }
  if (target.dataset.saveNewSettingsUser !== undefined) return saveNewSettingsUser();
  if (target.dataset.menuAction) {
    document.querySelectorAll(".row-menu-list").forEach(list => list.classList.add("hidden"));
    if (target.dataset.menuAction === "settings-preview-file") return window.open(`/api/settings/uploads/${encodeURIComponent(target.dataset.menuId)}`, "_blank");
    if (target.dataset.menuAction === "settings-delete-file") return deleteSettingsUpload(target.dataset.menuId);
    if (target.dataset.menuAction === "settings-save-user") return saveSettingsUser(target.dataset.menuId);
    if (target.dataset.menuAction === "settings-password-user") return setSettingsUserPassword(target.dataset.menuId);
    if (target.dataset.menuAction === "settings-delete-user") return deleteSettingsUser(target.dataset.menuId);
  }
}

function handleSettingsInput(event) {
  const companyKey = event.target.dataset.companyKey;
  const companyField = event.target.dataset.companyField;
  if (companyKey && companyField) {
    settingsDraft[companyKey] = settingsDraft[companyKey] || {};
    settingsDraft[companyKey][companyField] = event.target.value;
    return;
  }
  const userId = event.target.dataset.settingsUser;
  const userField = event.target.dataset.userField;
  if (userId && userField) {
    const user = settingsDraft.users.find(item => item.id === userId);
    if (!user) return;
    user[userField] = userField === "active" ? event.target.value === "true" : event.target.value;
  }
}

function handleSettingsChange(event) {
  handleSettingsInput(event);
  if (event.target.dataset.settingsUploadLogo) uploadSettingsFile(event.target.files?.[0], "Logo", event.target.dataset.settingsUploadLogo);
  if (event.target.dataset.settingsUploadFile !== undefined) uploadSettingsFile(event.target.files?.[0], "Attachment", "");
}

async function saveSettingsCompany(companyKey) {
  const company = settingsDraft?.[companyKey] || {};
  const response = await api("/api/settings/company", {
    method: "PUT",
    body: JSON.stringify({ companyKey, ...company })
  });
  appSettings = response.settings;
  settingsDraft = structuredClone(appSettings);
  applyAppSettings();
  renderSettings();
  toast("Company settings saved");
}

async function uploadSettingsFile(file, category, companyKey) {
  if (!file) return;
  const form = new FormData();
  form.append("file", file);
  form.append("category", category);
  if (companyKey) form.append("companyKey", companyKey);
  const response = await api("/api/settings/uploads", { method: "POST", body: form });
  appSettings = response.settings;
  settingsDraft = structuredClone(appSettings);
  applyAppSettings();
  renderSettings();
  toast(category === "Logo" ? "Logo uploaded" : "File attached");
}

async function saveSettingsUser(userId, password = "") {
  const user = settingsDraft.users.find(item => item.id === userId);
  if (!user) return;
  const payload = { ...user };
  if (password) payload.password = password;
  const response = await api("/api/settings/users", { method: "POST", body: JSON.stringify(payload) });
  appSettings = response.settings;
  settingsDraft = structuredClone(appSettings);
  renderSettings();
  toast("User saved");
}

async function saveNewSettingsUser() {
  const payload = {
    name: $("#settingsNewUserName").value.trim(),
    role: $("#settingsNewUserRole").value,
    email: $("#settingsNewUserEmail").value.trim(),
    password: $("#settingsNewUserPassword").value
  };
  if (!payload.name || !payload.email || !payload.password) return alert("Name, email, and password are required.");
  const response = await api("/api/settings/users", { method: "POST", body: JSON.stringify(payload) });
  appSettings = response.settings;
  settingsDraft = structuredClone(appSettings);
  renderSettings();
  toast("User added");
}

async function setSettingsUserPassword(userId) {
  const password = prompt("Enter new password for this user:");
  if (!password) return;
  await saveSettingsUser(userId, password);
}

async function deleteSettingsUser(userId) {
  if (!confirm("Delete this login access?")) return;
  const response = await api(`/api/settings/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
  appSettings = response.settings;
  settingsDraft = structuredClone(appSettings);
  renderSettings();
  toast("User deleted");
}

async function deleteSettingsUpload(uploadId) {
  if (!confirm("Delete this attachment?")) return;
  const response = await api(`/api/settings/uploads/${encodeURIComponent(uploadId)}`, { method: "DELETE" });
  appSettings = response.settings;
  settingsDraft = structuredClone(appSettings);
  applyAppSettings();
  renderSettings();
  toast("Attachment deleted");
}

async function loadSalesCrm() {
  salesCrmState = await api("/api/sales-crm");
}

function salesData() {
  return salesCrmState || salesCrmData;
}

function renderSalesDesk() {
  const root = $("#salesDeskRoot");
  const html = {
    dashboard: salesDashboardHtml,
    leads: salesLeadsHtml,
    customers: salesCustomersHtml,
    projects: salesProjectsHtml,
    quotation: salesQuotationHtml,
    followUps: salesFollowUpsHtml
  }[salesDeskScreen];
  root.innerHTML = `<div class="sales-page">${html ? html() : salesDashboardHtml()}</div>`;
}

function salesPageHeader(title, subtitle, actions = "") {
  return `
    <div class="sales-header">
      <div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      <div class="sales-header-actions">
        <div class="sales-search"><span>Search</span><input data-sales-search value="${escapeHtml(salesSearchQuery)}" placeholder="Search CRM..."></div>
        ${actions}
      </div>
    </div>
  `;
}

function salesDashboardHtml() {
  const data = salesData();
  const leads = data.leads || [];
  const quotations = data.quotations || [];
  const followUps = salesFollowUpRows();
  const recentLeads = salesFilter(leads, ["enquiryNo", "customer", "requirement", "location", "source", "status", "projectType"]).slice(0, 3);
  const todayFollowUps = salesFilter(followUps, ["customer", "project", "quotation", "status", "date", "due"]).filter(item => followUpBucket(item) === "today").slice(0, 5);
  const sentQuotationCount = quotations.filter(isSentQuotationStatus).length;
  const wonDealCount = quotations.filter(isWonQuotationStatus).length;
  return `
    ${salesPageHeader("Dashboard", "Welcome back. Here's what's happening today.", `<button class="sales-primary" data-sales-action="create-quotation">Create Quotation</button>`)}
    <div class="sales-kpi-grid">
      ${salesKpi("New Enquiries", leads.length.toLocaleString(), "Live", "enquiries")}
      ${salesKpi("Follow-ups Today", todayFollowUps.length.toLocaleString(), todayFollowUps.length ? "Needs" : "No", todayFollowUps.length ? "attention" : "pending", todayFollowUps.length ? "warning" : "")}
      ${salesKpi("Quotations Sent", sentQuotationCount.toLocaleString(), "Live", "sent quotes")}
      ${salesKpi("Won Deals", wonDealCount.toLocaleString(), "Live", "confirmed deals", "success")}
    </div>
    <div class="sales-dashboard-grid">
      <section class="sales-card">
        <div class="sales-card-title"><h3>Recent Leads</h3><button data-sales-goto="leads">View All</button></div>
        <table class="sales-table">
          <thead><tr><th>Customer</th><th>Location</th><th>Requirement</th><th>Status</th><th>Follow-up</th></tr></thead>
          <tbody>${recentLeads.map(lead => `
            <tr>
              <td>${salesAvatar(lead.avatar)}<strong>${escapeHtml(lead.customer)}</strong></td>
              <td>${escapeHtml(lead.location)}</td>
              <td>${escapeHtml(lead.requirement)}</td>
              <td>${salesBadge(lead.status)}</td>
              <td>${escapeHtml(lead.followUp)}</td>
            </tr>`).join("")}</tbody>
        </table>
      </section>
      <aside class="sales-card">
        <h3>Today</h3>
        <div class="sales-timeline">
          ${todayFollowUps.map(item => `
            <div>
              <strong>${escapeHtml(item.quotation || item.status)}</strong>
              <span>${escapeHtml(item.customer)}${item.project ? ` - ${escapeHtml(item.project)}` : ""}</span>
              <small>${escapeHtml(item.status)}</small>
            </div>`).join("") || `<p class="inventory-muted">No follow-ups today.</p>`}
        </div>
      </aside>
    </div>
  `;
}

function isSentQuotationStatus(quote) {
  return ["SENT", "QUOTATIONSENT", "AWAITINGRESPONSE", "NEGOTIATION"].includes(norm(quote?.status));
}

function isWonQuotationStatus(quote) {
  return ["APPROVED", "WON", "CONFIRMED"].includes(norm(quote?.status));
}

function salesKpi(label, value, trend, caption, tone = "") {
  return `
    <article class="sales-kpi ${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(trend)} ${escapeHtml(caption)}</small>
    </article>
  `;
}

function salesLeadsHtml() {
  const searchableRows = salesFilter(salesData().leads, ["enquiryNo", "customer", "requirement", "location", "source", "status", "projectType"]);
  const rows = salesLeadFilter
    ? searchableRows.filter(lead => [lead.status, lead.source].map(value => norm(value)).includes(norm(salesLeadFilter)))
    : searchableRows;
  const filterButtons = ["Status: All", "Contacted", "Site Visit", "Quotation Needed", "WhatsApp", "Website", "Referral"]
    .map(label => salesChip(label, {
      "data-sales-lead-filter": label === "Status: All" ? "" : label,
      class: (label === "Status: All" && !salesLeadFilter) || norm(label) === norm(salesLeadFilter) ? "active" : ""
    }))
    .join("");
  return `
    ${salesPageHeader("Leads & Enquiries", "Manage incoming technical requests and project assessments.", `<button class="sales-secondary" data-sales-export="leads">Export CSV</button><button class="sales-primary" data-sales-action="new-lead">New Enquiry</button>`)}
    <section class="sales-card">
      <div class="sales-filter-row">
        <strong>Filters:</strong>
        ${filterButtons}
        <span class="sales-filter-count">Showing: ${rows.length} of ${searchableRows.length} Enquiries</span>
      </div>
      <table class="sales-table sales-leads-table">
        <thead><tr><th>Customer & Contact</th><th>Details & Project</th><th>Location</th><th>Source</th><th>Status</th><th>Follow-up</th><th>Actions</th></tr></thead>
        <tbody>${rows.map(lead => `
          <tr>
            <td>${salesAvatar(lead.avatar)}<strong>${escapeHtml(lead.customer)}</strong><br><span>${escapeHtml(lead.phone)}</span>${lead.enquiryNo ? `<br><span>${escapeHtml(lead.enquiryNo)}</span>` : ""}</td>
            <td><strong>${escapeHtml(lead.requirement)}</strong><br><span>${escapeHtml(lead.projectType)}</span></td>
            <td>${escapeHtml(lead.location)}</td>
            <td><span class="sales-source">${escapeHtml(lead.source)}</span></td>
            <td>${salesBadge(lead.status)}</td>
            <td>${escapeHtml(lead.followUp)}<br><span class="${lead.priority === "Overdue" ? "sales-danger-text" : ""}">${escapeHtml(lead.priority)}</span></td>
            <td>${rowMenu([
              { label: "Create Customer", action: "lead-to-customer", id: lead.id },
              { label: "Create Quotation", action: "lead-quote", id: lead.id },
              { label: "Edit", action: "edit-lead", id: lead.id },
              { label: "Delete", action: "delete-lead", id: lead.id, danger: true }
            ])}</td>
          </tr>`).join("")}</tbody>
      </table>
    </section>
  `;
}

function salesCustomersHtml() {
  const data = salesData();
  const customers = data.customers || [];
  const rows = salesFilter(customers, ["name", "type", "contact", "phone", "email", "address", "trn"]);
  const commercialCount = customers.filter(customer => customerTypeKey(customer) === "commercial").length;
  const residentialCount = customers.filter(customer => customerTypeKey(customer) === "residential").length;
  const quotationTotal = (data.quotations || []).reduce((sum, quote) => sum + Number(quote.amount || 0), 0);
  const revenuePerClient = customers.length ? quotationTotal / customers.length : 0;
  return `
    ${salesPageHeader("Customer Database", "Customer and company records for the Sales Desk.", `<button class="sales-secondary" data-sales-export="customers">Export CSV</button><button class="sales-primary" data-sales-action="add-customer">Add Customer</button>`)}
    <div class="sales-kpi-grid">
      ${salesKpi("Total Customers", customers.length.toLocaleString(), "Live", "records")}
      ${salesKpi("Commercial Clients", commercialCount.toLocaleString(), "Active", "accounts", "success")}
      ${salesKpi("Residential Clients", residentialCount.toLocaleString(), "Private", "customers")}
      ${salesKpi("Revenue / Client", salesCompactMoney(revenuePerClient), "Average", "value")}
    </div>
    <section class="sales-card">
      <table class="sales-table">
        <thead><tr><th>Customer / Company Name</th><th>Contact Person</th><th>Contact Details</th><th>Location / Address</th><th>TRN Number</th><th>Actions</th></tr></thead>
        <tbody>${rows.map(customer => `
          <tr>
            <td>${salesAvatar(customer.icon)}<strong>${escapeHtml(customer.name)}</strong><br><span>${escapeHtml(customer.type)}</span></td>
            <td><strong>${escapeHtml(customer.contact)}</strong><br><span>${escapeHtml(customer.role)}</span></td>
            <td>${escapeHtml(customer.phone)}<br><span>${escapeHtml(customer.email)}</span></td>
            <td>${escapeHtml(customer.address)}<br><span>${escapeHtml(customer.detail)}</span></td>
            <td>${escapeHtml(customer.trn)}</td>
            <td>${rowMenu([
              { label: "History", action: "customer-history", id: customer.id },
              { label: "Edit", action: "edit-customer", id: customer.id },
              { label: "Delete", action: "delete-customer", id: customer.id, danger: true }
            ])}</td>
          </tr>`).join("")}</tbody>
      </table>
    </section>
  `;
}

function customerTypeKey(customer) {
  const key = norm(customer?.type);
  if (key.includes("COMMERCIAL")) return "commercial";
  if (key.includes("RESIDENTIAL") || key.includes("PRIVATE") || key.includes("VILLA") || key.includes("APARTMENT")) return "residential";
  return "other";
}

function averageQuotationRevision(quotations = []) {
  const revisions = quotations.map(quote => {
    const revisionText = String(quote.revision || quote.no || "");
    const match = revisionText.match(/R(\d+)|(\d+)\s*Revisions?/i);
    return match ? Number(match[1] || match[2] || 0) : 0;
  });
  if (!revisions.length) return 0;
  return revisions.reduce((sum, value) => sum + value, 0) / revisions.length;
}

function followUpBucket(item) {
  const status = norm(item?.status);
  const due = norm(item?.due);
  const priority = norm(item?.priority);
  if (status.includes("COMPLETED") || status.includes("CONFIRMED")) return "completed";
  if (status.includes("OVERDUE") || due.includes("OVERDUE") || priority.includes("OVERDUE")) return "overdue";
  if (status.includes("TODAY") || due.includes("TODAY") || priority.includes("TODAY")) return "today";
  const date = followUpDate(item);
  if (date) {
    const diffDays = Math.floor((date - salesStartOfToday()) / 86400000);
    if (diffDays < 0) return "overdue";
    if (diffDays === 0) return "today";
    if (diffDays <= 7) return "upcoming";
    return "future";
  }
  return "upcoming";
}

function followUpDate(item) {
  const due = norm(item?.due);
  if (due.includes("TODAY")) return salesStartOfToday();
  const candidates = [item?.date, item?.followUp, item?.due].filter(Boolean);
  for (const value of candidates) {
    const parsed = parseSalesDate(value);
    if (parsed) return parsed;
  }
  return null;
}

function parseSalesDate(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const clean = text.replace(/(\d+)(st|nd|rd|th)/gi, "$1").replace(/,/g, " ");
  let match = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  match = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  const months = { jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 };
  match = clean.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (match && months[match[2].toLowerCase()] !== undefined) return new Date(Number(match[3]), months[match[2].toLowerCase()], Number(match[1]));
  match = clean.match(/^([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})/);
  if (match && months[match[1].toLowerCase()] !== undefined) return new Date(Number(match[3]), months[match[1].toLowerCase()], Number(match[2]));
  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? null : new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
}

function salesStartOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function salesDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatSalesCalendarDate(dateKey) {
  if (dateKey === "No date") return dateKey;
  const date = parseSalesDate(dateKey);
  return date ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : dateKey;
}

function formatSalesDateInput(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const parsed = parseSalesDate(text);
  if (!parsed) return text;
  return `${String(parsed.getDate()).padStart(2, "0")}/${String(parsed.getMonth() + 1).padStart(2, "0")}/${parsed.getFullYear()}`;
}

function salesProjectsHtml() {
  const searchableRows = salesFilter(salesData().projects, ["name", "customer", "location", "type", "requirement", "engineer", "status"]);
  const rows = salesProjectFilter ? searchableRows.filter(project => [project.type, project.requirement].map(value => norm(value)).includes(norm(salesProjectFilter))) : searchableRows;
  const filterLabels = ["Residential", "Commercial", "Supply & Installation", "Supply of AC Units", "AMC / Maintenance"];
  return `
    ${salesPageHeader("Active Projects", "Manage and track live opportunities across all regions.", `<button class="sales-secondary" data-sales-export="projects">Export CSV</button><button class="sales-primary" data-sales-action="new-project">New Project</button><button class="sales-primary" data-sales-action="create-quotation">Create Quotation</button>`)}
    <section class="sales-card">
      <div class="sales-filter-row">
        <button class="${salesProjectMode === "list" ? "active" : ""}" data-sales-project-mode="list">List View</button>
        <button class="${salesProjectMode === "kanban" ? "active" : ""}" data-sales-project-mode="kanban">Kanban</button>
        ${filterLabels.map(label => salesChip(label, { class: norm(salesProjectFilter) === norm(label) ? "active" : "", "data-sales-project-filter": label })).join("")}
        ${salesProjectFilter ? salesChip("Clear", { "data-sales-project-filter": "" }) : ""}
        <span class="sales-filter-count">Showing: ${rows.length} of ${searchableRows.length}</span>
      </div>
      ${salesProjectMode === "kanban" ? salesKanbanHtml(rows) : salesProjectTableHtml(rows)}
    </section>
  `;
}

function salesProjectTableHtml(rows) {
  return `
    <table class="sales-table">
      <thead><tr><th>Project & Customer</th><th>Location</th><th>Type / Requirement</th><th>Assigned To</th><th>Status</th><th>Dates</th><th>Actions</th></tr></thead>
      <tbody>${rows.map(project => `
        <tr>
          <td><strong>${escapeHtml(project.name)}</strong><br><span>${escapeHtml(project.customer)}</span></td>
          <td>${escapeHtml(project.location)}</td>
          <td>${escapeHtml(project.type)}<br><span>${escapeHtml(project.requirement)}</span></td>
          <td>${escapeHtml(project.engineer)}</td>
          <td>${salesBadge(project.status)}</td>
          <td>${escapeHtml(project.date)}</td>
          <td>${rowMenu([
            { label: "Create Quotation", action: "project-quote", id: project.id },
            { label: "Edit", action: "edit-project", id: project.id },
            { label: "Delete", action: "delete-project", id: project.id, danger: true }
          ])}</td>
        </tr>`).join("")}</tbody>
    </table>
  `;
}

function salesKanbanHtml(rows) {
  const groups = ["Site Visit Done", "Quotation Sent", "Negotiation"];
  return `<div class="sales-kanban">${groups.map(status => `
    <div class="sales-kanban-col">
      <h4>${escapeHtml(status)}</h4>
      ${rows.filter(project => project.status === status).map(project => `
        <article>
          <strong>${escapeHtml(project.name)}</strong>
          <span>${escapeHtml(project.customer)}</span>
          <small>${escapeHtml(formatProjectValue(project.value))}</small>
        </article>`).join("") || `<p class="inventory-muted">No projects.</p>`}
    </div>`).join("")}</div>`;
}

function formatProjectValue(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/aed/i.test(text)) return text;
  const number = Number(text.replace(/,/g, ""));
  return Number.isFinite(number) ? salesMoney(number) : text;
}

function salesQuotationHtml() {
  return salesQuotationMode === "create" ? salesCreateQuotationHtml() : salesQuotationListHtml();
}

function salesQuotationListHtml() {
  const quotations = salesData().quotations || [];
  const rows = salesFilter(quotations, ["no", "customer", "project", "location", "status"]);
  const totalValue = quotations.reduce((sum, quote) => sum + Number(quote.amount || 0), 0);
  const pendingSent = quotations.filter(quote => ["draft", "revised"].includes(String(quote.status || "").toLowerCase())).length;
  const wonCount = quotations.filter(quote => ["approved", "won"].includes(String(quote.status || "").toLowerCase())).length;
  const conversionRate = quotations.length ? (wonCount / quotations.length) * 100 : 0;
  const avgRevision = averageQuotationRevision(quotations);
  return `
    ${salesPageHeader("Quotations", "Track draft, sent, revised, approved, and lost quotations.", `<button class="sales-secondary" data-sales-export="quotations">Export CSV</button><button class="sales-primary" data-sales-action="create-quotation">Create Quotation</button>`)}
    <div class="sales-kpi-grid">
      ${salesKpi("Total Value", salesCompactMoney(totalValue), "Pipeline", "value")}
      ${salesKpi("Pending Sent", pendingSent.toLocaleString(), "Quotes", "waiting", "warning")}
      ${salesKpi("Conversion Rate", `${conversionRate.toFixed(1)}%`, "Won", "deals", "success")}
      ${salesKpi("Avg. Revision Time", `${avgRevision.toFixed(1)} Days`, "Revision", "cycle")}
    </div>
    <section class="sales-card">
      <div class="sales-filter-row">${["All Quotations", "Draft", "Sent", "Revised", "Approved", "Lost"].map(label => salesChip(label)).join("")}</div>
      <table class="sales-table">
        <thead><tr><th>Quotation No</th><th>Date</th><th>Customer</th><th>Project</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${rows.map(quote => `
          <tr>
            <td><strong>${escapeHtml(quote.no)}</strong><br><span>${escapeHtml(quote.revision)}</span></td>
            <td>${escapeHtml(quote.date)}</td>
            <td>${escapeHtml(quote.customer)}</td>
            <td>${escapeHtml(quote.project)}<br><span>${escapeHtml(quote.location)}</span></td>
            <td>${salesMoney(quote.amount)}</td>
            <td>${salesBadge(quote.status)}</td>
            <td>${rowMenu([
              { label: "Edit", action: "edit-quote", id: quote.id },
              { label: "Preview", action: "preview-quote", id: quote.id },
              { label: "PDF", action: "pdf-quote", id: quote.id },
              { label: "Copy", action: "copy-quote", id: quote.id },
              { label: "Delete", action: "delete-quote", id: quote.id, danger: true }
            ])}</td>
          </tr>`).join("")}</tbody>
      </table>
    </section>
  `;
}

function salesCreateQuotationHtml() {
  salesQuotationDraft = salesQuotationDraft || quoteDraftFromSource();
  salesQuotationDraft.quoteType = salesQuotationDraft.quoteType || "VRV";
  if (salesQuotationDraft.quoteType === "VRV" && !String(salesQuotationDraft.terms || "").trim()) {
    salesQuotationDraft.terms = quoteVrvTerms;
  }
  const quoteType = salesQuotationDraft.quoteType || "VRV";
  const itemSubtotal = salesQuotationDraft.items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.unitPrice || 0), 0);
  const manualSubtotalText = String(salesQuotationDraft.manualSubtotal ?? "").trim();
  const subtotal = manualSubtotalText ? Number(manualSubtotalText.replace(/,/g, "")) || 0 : itemSubtotal;
  const discount = Number(salesQuotationDraft.discount || 0);
  const taxable = Math.max(0, subtotal - discount);
  const vat = taxable * 0.05;
  const total = taxable + vat;
  return `
    ${salesPageHeader("Create New Quotation", "Prepare a quotation inside Sales Desk.", `<button class="sales-secondary" data-sales-action="quotation-list">Quotation List</button><button class="sales-primary" data-sales-action="save-quote">Save Draft</button><button class="sales-primary" data-sales-action="send-quote">Mark Sent</button>`)}
    <div class="sales-quote-layout">
      <section class="sales-card">
        <div class="sales-card-title"><h3>Quotation Details</h3>${salesBadge("Draft")}</div>
        <div class="sales-form-grid">
          <label>Quotation No<input data-sales-quote-field="quotationNo" value="${escapeHtml(salesQuotationDraft.quotationNo)}"></label>
          <label>Quotation Date<input data-sales-quote-field="quotationDate" value="${escapeHtml(salesQuotationDraft.quotationDate)}"></label>
          <label>Validity<select data-sales-quote-field="validity">${["7 Days", "15 Days", "30 Days"].map(v => `<option ${salesQuotationDraft.validity === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>
          <label>Sales Person<input data-sales-quote-field="salesperson" value="${escapeHtml(salesQuotationDraft.salesperson)}"></label>
          <label>Customer Name<input data-sales-quote-field="customer" list="salesQuoteCustomerList" placeholder="Type to search customer..." value="${escapeHtml(salesQuotationDraft.customer || "")}"><datalist id="salesQuoteCustomerList">${salesData().customers.map(c => `<option value="${escapeHtml(c.name)}"></option>`).join("")}</datalist></label>
          <label>Project Name<input data-sales-quote-field="project" list="salesQuoteProjectList" placeholder="Type to search project..." value="${escapeHtml(salesQuotationDraft.project || "")}"><datalist id="salesQuoteProjectList">${salesData().projects.map(p => `<option value="${escapeHtml(p.name)}"></option>`).join("")}</datalist></label>
          <label>Payment Terms<input data-sales-quote-field="paymentTerms" value="${escapeHtml(salesQuotationDraft.paymentTerms)}"></label>
          <label>Availability<input data-sales-quote-field="deliveryTime" value="${escapeHtml(salesQuotationDraft.deliveryTime || "To be discussed")}"></label>
          <label>Enquiry no<input data-sales-quote-field="warranty" value="${escapeHtml(salesQuotationDraft.warranty === "1 Year" ? "" : salesQuotationDraft.warranty || "")}"></label>
        </div>
        <div class="sales-card-title"><h3>Item Breakdown</h3><button data-sales-action="add-quote-item">Add Item</button></div>
        <table class="sales-table sales-quote-table">
          <thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th></th></tr></thead>
          <tbody>${salesQuotationDraft.items.map((item, index) => `
            <tr>
              <td><input data-sales-quote-line="${index}" data-field="description" value="${escapeHtml(item.description)}"></td>
              <td><input type="number" data-sales-quote-line="${index}" data-field="qty" value="${Number(item.qty || 0)}"></td>
              <td><select data-sales-quote-line="${index}" data-field="unit">${["Nos", "Sets", "Meters", "Units"].map(unit => `<option ${item.unit === unit ? "selected" : ""}>${unit}</option>`).join("")}</select></td>
              <td><button data-sales-delete-quote-line="${index}">Delete</button></td>
            </tr>`).join("")}</tbody>
        </table>
        <div class="sales-notes-block">
          <div class="sales-notes-heading">
            <span>Additional Remarks / Notes</span>
            <div class="quote-template-toggle" aria-label="Quotation template">
              ${["VRV", "FAHU"].map(type => `<button type="button" class="${quoteType === type ? "active" : ""}" data-sales-quote-preset="${type}">${type}</button>`).join("")}
            </div>
          </div>
          <textarea data-sales-quote-field="notes">${escapeHtml(salesQuotationDraft.notes)}</textarea>
        </div>
        <label class="sales-notes">Terms &amp; Conditions<textarea data-sales-quote-field="terms">${escapeHtml(salesQuotationDraft.terms || "")}</textarea></label>
      </section>
      <aside class="sales-card sales-summary-card">
        <h3>Financial Summary</h3>
        <div><span>Subtotal</span><input data-sales-quote-field="manualSubtotal" inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" value="${escapeHtml(manualSubtotalText || money(itemSubtotal))}"></div>
        <div><span>Discount</span><input data-sales-quote-field="discount" inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" value="${Number(salesQuotationDraft.discount || 0)}"></div>
        <div><span>VAT (5%)</span><strong data-sales-summary="vat">${salesMoney(vat)}</strong></div>
        <div class="sales-total"><span>Grand Total</span><strong data-sales-summary="total">${salesMoney(total)}</strong></div>
      </aside>
    </div>
  `;
}

function salesFollowUpsHtml() {
  const followUps = salesFollowUpRows();
  const searchableRows = salesFilter(followUps, ["customer", "phone", "project", "quotation", "date", "due", "status"]);
  const rows = salesFollowUpFilter ? searchableRows.filter(item => followUpBucket(item) === salesFollowUpFilter) : searchableRows;
  const overdueCount = followUps.filter(item => followUpBucket(item) === "overdue").length;
  const todayCount = followUps.filter(item => followUpBucket(item) === "today").length;
  const upcomingCount = followUps.filter(item => followUpBucket(item) === "upcoming").length;
  const completedCount = followUps.filter(item => ["COMPLETED", "CONFIRMED"].some(status => norm(item.status).includes(status))).length;
  const successRate = followUps.length ? (completedCount / followUps.length) * 100 : 0;
  const filterLabels = [
    ["", "All"],
    ["overdue", "Overdue"],
    ["today", "Today"],
    ["upcoming", "Upcoming"],
    ["completed", "Completed"]
  ];
  return `
    ${salesPageHeader("Follow-ups", "Manage and track sent quotation follow-ups.", `<button class="sales-secondary" data-sales-export="followUps">Export CSV</button><button class="sales-primary" data-sales-action="add-follow-up">Add Follow-up</button>`)}
    <div class="sales-kpi-grid">
      ${salesKpi("Overdue Follow-ups", overdueCount.toLocaleString(), "Needs", "attention", "warning")}
      ${salesKpi("Due Today", todayCount.toLocaleString(), "Today", "follow-up")}
      ${salesKpi("Upcoming This Week", upcomingCount.toLocaleString(), "Planned", "range")}
      ${salesKpi("Success Rate", `${successRate.toFixed(1)}%`, "Confirmed", "follow-ups", "success")}
    </div>
    <section class="sales-card">
      <div class="sales-filter-row">
        ${salesChip("List View", { class: salesFollowUpMode === "list" ? "active" : "", "data-sales-follow-mode": "list" })}
        ${salesChip("Calendar View", { class: salesFollowUpMode === "calendar" ? "active" : "", "data-sales-follow-mode": "calendar" })}
        ${salesChip("Filter", { class: salesFollowUpFilterOpen || salesFollowUpFilter ? "active" : "", "data-sales-follow-filter-toggle": "1" })}
        <span class="sales-filter-count">Showing: ${rows.length} of ${searchableRows.length}</span>
      </div>
      ${salesFollowUpFilterOpen ? `<div class="sales-filter-row">${filterLabels.map(([value, label]) => salesChip(label, { class: salesFollowUpFilter === value ? "active" : "", "data-sales-follow-filter": value })).join("")}</div>` : ""}
      ${salesFollowUpMode === "calendar" ? salesFollowUpCalendarHtml(rows) : salesFollowUpTableHtml(rows)}
    </section>
  `;
}

function salesFollowUpRows() {
  const data = salesData();
  const manualRows = (data.followUps || []).map(item => ({ ...item, status: normalizeFollowUpStatus(item.status), source: "manual" }));
  const manualQuotationKeys = new Set(manualRows.map(item => norm(item.quotation)).filter(Boolean));
  const quotationRows = (data.quotations || [])
    .filter(isFollowUpQuotation)
    .filter(quote => !manualQuotationKeys.has(norm(quote.no)))
    .map(quotationFollowUpRow);
  return [...quotationRows, ...manualRows];
}

function normalizeFollowUpStatus(status) {
  const key = norm(status);
  if (key.includes("CONFIRMED") || key.includes("COMPLETED") || key.includes("DONE")) return "Confirmed";
  if (key.includes("NEGOTIATION")) return "Negotiation";
  if (key.includes("AWAITING") || key.includes("OVERDUE")) return "Awaiting Response";
  return "Quotation Sent";
}

function isFollowUpQuotation(quote) {
  return ["SENT", "QUOTATIONSENT", "AWAITINGRESPONSE", "NEGOTIATION", "CONFIRMED"].includes(norm(quote?.status));
}

function quotationFollowUpRow(quote) {
  const customer = (salesData().customers || []).find(item => norm(item.name) === norm(quote.customer)) || {};
  const displayStatus = norm(quote.status) === "SENT" ? "Quotation Sent" : quote.status || "Quotation Sent";
  return {
    id: `quote-${quote.id}`,
    quoteId: quote.id,
    source: "quotation",
    avatar: customer.icon || initialsText(quote.customer),
    customer: quote.customer || "",
    phone: customer.phone || "",
    project: quote.project || "",
    quotation: quote.no || "",
    date: formatSalesDateInput(quote.date || ""),
    due: "",
    type: "Quotation",
    status: displayStatus
  };
}

function findSalesQuotation(identifier) {
  const key = norm(identifier);
  return (salesData().quotations || []).find(item => norm(item.id) === key || norm(item.no) === key);
}

function salesFollowUpTableHtml(rows) {
  return `
    <table class="sales-table">
      <thead><tr><th>Customer</th><th>Project</th><th>Quotation No.</th><th>Quotation Date</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${rows.map(item => `
        <tr>
          <td>${salesAvatar(item.avatar)}<strong>${escapeHtml(item.customer)}</strong><br><span>${escapeHtml(item.phone)}</span></td>
          <td>${escapeHtml(item.project)}</td>
          <td>${escapeHtml(item.quotation)}</td>
          <td>${escapeHtml(item.date)}${item.due ? `<br><span>${escapeHtml(item.due)}</span>` : ""}</td>
          <td>${item.source === "quotation" ? salesQuotationFollowStatusSelect(item) : salesManualFollowStatusSelect(item)}</td>
          <td>${item.source === "quotation" ? rowMenu([
            { label: "Edit Quotation", action: "edit-quote", id: item.quoteId || item.quotation },
            { label: "Preview", action: "preview-quote", id: item.quoteId || item.quotation },
            { label: "PDF", action: "pdf-quote", id: item.quoteId || item.quotation }
          ]) : rowMenu([
            { label: "Edit", action: "edit-follow-up", id: item.id },
            { label: "Done", action: "complete-follow-up", id: item.id },
            { label: "Delete", action: "delete-follow-up", id: item.id, danger: true }
          ])}</td>
        </tr>`).join("") || `<tr><td colspan="6">No follow-ups found.</td></tr>`}</tbody>
    </table>
  `;
}

function salesQuotationFollowStatusSelect(item) {
  const statuses = ["Quotation Sent", "Awaiting Response", "Negotiation", "Confirmed"];
  return `<select class="sales-inline-select" data-quote-follow-status="${escapeHtml(item.quoteId)}">${statuses.map(status => `<option value="${escapeHtml(status)}" ${norm(item.status) === norm(status) ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}</select>`;
}

function salesManualFollowStatusSelect(item) {
  const statuses = ["Quotation Sent", "Awaiting Response", "Negotiation", "Confirmed"];
  return `<select class="sales-inline-select" data-manual-follow-status="${escapeHtml(item.id)}">${statuses.map(status => `<option value="${escapeHtml(status)}" ${norm(item.status) === norm(status) ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}</select>`;
}

function salesFollowUpCalendarHtml(rows) {
  const groups = new Map();
  rows.forEach(item => {
    const date = followUpDate(item);
    const key = date ? salesDateKey(date) : "No date";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  const sortedGroups = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  return `<div class="sales-kanban sales-follow-calendar">
    ${sortedGroups.map(([dateKey, items]) => `
      <div class="sales-kanban-col">
        <h4>${escapeHtml(formatSalesCalendarDate(dateKey))}</h4>
        ${items.map(item => `<article>
          <strong>${escapeHtml(item.customer)}</strong>
          <span>${escapeHtml(item.project)}</span>
          <small>${escapeHtml(item.quotation)}${item.quotation ? " - " : ""}${escapeHtml(item.status)}</small>
        </article>`).join("")}
      </div>`).join("") || `<p class="inventory-muted">No follow-ups found.</p>`}
  </div>`;
}

function salesFilter(rows, fields) {
  const q = salesSearchQuery.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(row => fields.map(field => row[field] || "").join(" ").toLowerCase().includes(q));
}

function salesChip(label, attrs = {}) {
  const className = ["sales-chip", attrs.class || ""].filter(Boolean).join(" ");
  const attributes = Object.entries(attrs)
    .filter(([key]) => key !== "class")
    .map(([key, value]) => ` ${key}="${escapeHtml(value)}"`)
    .join("");
  return `<button class="${className}"${attributes}>${escapeHtml(label)}</button>`;
}

function salesAvatar(text) {
  return `<span class="sales-avatar">${escapeHtml(text || "CZ")}</span>`;
}

function initialsText(value) {
  return String(value || "CZ").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase() || "CZ";
}

function salesBadge(status) {
  const key = String(status || "").toLowerCase().replace(/\s+/g, "-");
  return `<span class="sales-badge ${key}">${escapeHtml(status || "")}</span>`;
}

function salesMoney(value) {
  return `AED ${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function salesCompactMoney(value) {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1000000) return `AED ${(amount / 1000000).toFixed(1).replace(/\.0$/, "")}m`;
  if (Math.abs(amount) >= 1000) return `AED ${(amount / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `AED ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function handleSalesClick(event) {
  const target = event.target.closest("button");
  if (!target || !$("#salesDeskRoot").contains(target)) return;
  if (target.dataset.rowMenu !== undefined) {
    const menu = target.closest(".row-menu").querySelector(".row-menu-list");
    document.querySelectorAll(".row-menu-list").forEach(list => {
      if (list !== menu) list.classList.add("hidden");
    });
    menu.classList.toggle("hidden");
    return;
  }
  if (target.dataset.menuAction) {
    return handleSalesMenuAction(target.dataset.menuAction, target.dataset.menuId);
  }
  if (target.dataset.salesExport) {
    exportSalesCsv(target.dataset.salesExport);
    return;
  }
  if (target.dataset.salesGoto) {
    showSalesDesk(target.dataset.salesGoto);
    return;
  }
  if (target.dataset.salesLeadFilter !== undefined) {
    salesLeadFilter = target.dataset.salesLeadFilter;
    renderSalesDesk();
    return;
  }
  if (target.dataset.salesQuotePreset) {
    applySalesQuotePreset(target.dataset.salesQuotePreset);
    return;
  }
  if (target.dataset.salesProjectMode) {
    salesProjectMode = target.dataset.salesProjectMode;
    renderSalesDesk();
    return;
  }
  if (target.dataset.salesProjectFilter !== undefined) {
    salesProjectFilter = target.dataset.salesProjectFilter;
    renderSalesDesk();
    return;
  }
  if (target.dataset.salesFollowMode) {
    salesFollowUpMode = target.dataset.salesFollowMode;
    renderSalesDesk();
    return;
  }
  if (target.dataset.salesFollowFilterToggle !== undefined) {
    salesFollowUpFilterOpen = !salesFollowUpFilterOpen;
    renderSalesDesk();
    return;
  }
  if (target.dataset.salesFollowFilter !== undefined) {
    salesFollowUpFilter = target.dataset.salesFollowFilter;
    renderSalesDesk();
    return;
  }
  if (target.dataset.salesDeleteQuoteLine) {
    salesQuotationDraft.items.splice(Number(target.dataset.salesDeleteQuoteLine), 1);
    renderSalesDesk();
    return;
  }
  const action = target.dataset.salesAction;
  if (action === "create-quotation") {
    salesQuotationDraft = null;
    salesQuotationMode = "create";
    showSalesDesk("quotation");
  }
  if (action === "lead-quote") {
    const lead = salesData().leads.find(item => item.id === target.dataset.salesId);
    salesQuotationDraft = quoteDraftFromSource({ customer: lead?.customer || "", project: lead?.requirement || "", location: lead?.location || "", enquiryNo: lead?.enquiryNo || "" });
    salesQuotationMode = "create";
    showSalesDesk("quotation");
  }
  if (action === "project-quote") {
    const project = salesData().projects.find(item => item.id === target.dataset.salesId);
    salesQuotationDraft = quoteDraftFromSource({ customer: project?.customer || "", project: project?.name || "", location: project?.location || "" });
    salesQuotationMode = "create";
    showSalesDesk("quotation");
  }
  if (action === "quotation-list") {
    salesQuotationMode = "list";
    renderSalesDesk();
  }
  if (action === "add-quote-item") {
    salesQuotationDraft.items.push({ description: "", qty: 1, unit: "Nos", unitPrice: 0 });
    renderSalesDesk();
  }
  if (action === "save-quote") saveSalesQuotation("Draft");
  if (action === "send-quote") saveSalesQuotation("Sent");
  if (action === "preview-quote") previewSalesQuotation(target.dataset.salesId);
  if (action === "pdf-quote") downloadSalesQuotationPdf(target.dataset.salesId);
  if (action === "copy-quote") copySalesQuotation(target.dataset.salesId);
  if (action === "edit-quote") editSalesQuotation(target.dataset.salesId);
  if (action === "delete-quote") deleteSalesItem("quotations", target.dataset.salesId);
  if (action === "new-lead") openSalesForm("leads");
  if (action === "edit-lead") openSalesForm("leads", target.dataset.salesId);
  if (action === "delete-lead") deleteSalesItem("leads", target.dataset.salesId);
  if (action === "add-customer") openSalesForm("customers");
  if (action === "edit-customer") openSalesForm("customers", target.dataset.salesId);
  if (action === "delete-customer") deleteSalesItem("customers", target.dataset.salesId);
  if (action === "customer-history") {
    salesQuotationMode = "list";
    salesSearchQuery = salesData().customers.find(item => item.id === target.dataset.salesId)?.name || "";
    showSalesDesk("quotation");
  }
  if (action === "edit-project") openSalesForm("projects", target.dataset.salesId);
  if (action === "new-project") openSalesForm("projects");
  if (action === "delete-project") deleteSalesItem("projects", target.dataset.salesId);
  if (action === "add-follow-up") openSalesForm("followUps");
  if (action === "edit-follow-up") openSalesForm("followUps", target.dataset.salesId);
  if (action === "delete-follow-up") deleteSalesItem("followUps", target.dataset.salesId);
  if (action === "complete-follow-up") completeSalesFollowUp(target.dataset.salesId);
}

function handleSalesMenuAction(action, itemId) {
  document.querySelectorAll(".row-menu-list").forEach(list => list.classList.add("hidden"));
  const quote = ["preview-quote", "pdf-quote", "copy-quote", "edit-quote", "delete-quote"].includes(action) ? findSalesQuotation(itemId) : null;
  const quoteId = quote?.id || itemId;
  if (action === "lead-to-customer") return createCustomerFromLead(itemId);
  if (action === "lead-quote") {
    const lead = salesData().leads.find(item => item.id === itemId);
    salesQuotationDraft = quoteDraftFromSource({ customer: lead?.customer || "", project: lead?.requirement || "", location: lead?.location || "", enquiryNo: lead?.enquiryNo || "" });
    salesQuotationMode = "create";
    return showSalesDesk("quotation");
  }
  if (action === "edit-lead") return openSalesForm("leads", itemId);
  if (action === "delete-lead") return deleteSalesItem("leads", itemId);
  if (action === "customer-history") {
    salesQuotationMode = "list";
    salesSearchQuery = salesData().customers.find(item => item.id === itemId)?.name || "";
    return showSalesDesk("quotation");
  }
  if (action === "edit-customer") return openSalesForm("customers", itemId);
  if (action === "delete-customer") return deleteSalesItem("customers", itemId);
  if (action === "project-quote") {
    const project = salesData().projects.find(item => item.id === itemId);
    salesQuotationDraft = quoteDraftFromSource({ customer: project?.customer || "", project: project?.name || "", location: project?.location || "" });
    salesQuotationMode = "create";
    return showSalesDesk("quotation");
  }
  if (action === "edit-project") return openSalesForm("projects", itemId);
  if (action === "delete-project") return deleteSalesItem("projects", itemId);
  if (action === "preview-quote") return previewSalesQuotation(quoteId);
  if (action === "pdf-quote") return downloadSalesQuotationPdf(quoteId);
  if (action === "copy-quote") return copySalesQuotation(quoteId);
  if (action === "edit-quote") return editSalesQuotation(quoteId);
  if (action === "delete-quote") return deleteSalesItem("quotations", quoteId);
  if (action === "edit-follow-up") return openSalesForm("followUps", itemId);
  if (action === "complete-follow-up") return completeSalesFollowUp(itemId);
  if (action === "delete-follow-up") return deleteSalesItem("followUps", itemId);
}

function handleSalesInput(event) {
  if (event.target.matches("[data-sales-search]")) {
    const cursor = event.target.selectionStart || 0;
    salesSearchQuery = event.target.value;
    renderSalesDesk();
    const input = document.querySelector("[data-sales-search]");
    if (input) {
      input.focus();
      input.setSelectionRange(cursor, cursor);
    }
    return;
  }
  if (event.target.dataset.salesQuoteField && ["manualSubtotal", "discount"].includes(event.target.dataset.salesQuoteField)) {
    const cleanValue = sanitizeSalesMoneyInput(event.target.value);
    if (event.target.value !== cleanValue) event.target.value = cleanValue;
    salesQuotationDraft[event.target.dataset.salesQuoteField] = cleanValue;
    updateSalesQuoteSummaryValues();
    return;
  }
  updateSalesQuotationDraft(event, false);
}

function handleSalesChange(event) {
  if (event.target.dataset.quoteFollowStatus) {
    updateQuotationFollowStatus(event.target.dataset.quoteFollowStatus, event.target.value);
    return;
  }
  if (event.target.dataset.manualFollowStatus) {
    updateManualFollowStatus(event.target.dataset.manualFollowStatus, event.target.value);
    return;
  }
  updateSalesQuotationDraft(event, true);
}

function sanitizeSalesMoneyInput(value) {
  const parts = String(value || "").replace(/,/g, "").replace(/[^\d.]/g, "").split(".");
  if (parts.length === 1) return parts[0];
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function updateSalesQuoteSummaryValues() {
  if (!salesQuotationDraft) return;
  const itemSubtotal = salesQuotationDraft.items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.unitPrice || 0), 0);
  const manualSubtotalText = String(salesQuotationDraft.manualSubtotal ?? "").trim();
  const subtotal = manualSubtotalText ? Number(manualSubtotalText.replace(/,/g, "")) || 0 : itemSubtotal;
  const discount = Number(String(salesQuotationDraft.discount || "").replace(/,/g, "")) || 0;
  const taxable = Math.max(0, subtotal - discount);
  const vat = taxable * 0.05;
  const total = taxable + vat;
  const vatEl = document.querySelector('[data-sales-summary="vat"]');
  const totalEl = document.querySelector('[data-sales-summary="total"]');
  if (vatEl) vatEl.textContent = salesMoney(vat);
  if (totalEl) totalEl.textContent = salesMoney(total);
}

function updateSalesQuotationDraft(event, shouldRender = false) {
  if (!salesQuotationDraft) return;
  const field = event.target.dataset.salesQuoteField;
  if (field) {
    salesQuotationDraft[field] = event.target.value;
    if (shouldRender) renderSalesDesk();
    return;
  }
  const index = event.target.dataset.salesQuoteLine;
  const lineField = event.target.dataset.field;
  if (index !== undefined && lineField) {
    const item = salesQuotationDraft.items[Number(index)];
    if (!item) return;
    item[lineField] = ["qty", "unitPrice"].includes(lineField) ? Number(event.target.value || 0) : event.target.value;
    if (shouldRender) renderSalesDesk();
  }
}

function applySalesQuotePreset(type) {
  if (!salesQuotationDraft) return;
  salesQuotationDraft.quoteType = type;
  if (type === "FAHU") {
    salesQuotationDraft.notes = quoteFahuNotes;
    salesQuotationDraft.terms = quoteFahuTerms;
  } else {
    salesQuotationDraft.notes = "";
    salesQuotationDraft.terms = quoteVrvTerms;
  }
  renderSalesDesk();
}

function quoteDraftFromSource(source = {}) {
  return {
    quotationNo: salesData().settings?.nextQuotationNo || `CZ-QTN-${new Date().getFullYear()}-0001`,
    quotationDate: new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
    validity: "7 Days",
    salesperson: "",
    customer: source.customer || "",
    project: source.project || "",
    location: source.location || "",
    paymentTerms: "30 Days Credit",
    deliveryTime: "To be discussed",
    warranty: source.enquiryNo || "",
    quoteType: source.quoteType || "VRV",
    notes: source.notes ?? "",
    terms: source.terms || quoteVrvTerms,
    items: Array.isArray(source.items) && source.items.length ? source.items : [{ description: "", qty: 1, unit: "Nos", unitPrice: 0 }],
    manualSubtotal: source.manualSubtotal || "",
    discount: 0,
    status: "Draft"
  };
}

async function saveSalesQuotation(status = "Draft") {
  if (!salesQuotationDraft) return;
  const quote = {
    ...salesQuotationDraft,
    no: salesQuotationDraft.quotationNo,
    date: salesQuotationDraft.quotationDate,
    status
  };
  salesCrmState = await api("/api/sales-crm/quotations", { method: "POST", body: JSON.stringify(quote) });
  salesQuotationMode = "list";
  salesQuotationDraft = null;
  renderSalesDesk();
  toast(status === "Sent" ? "Quotation marked as sent" : "Quotation saved");
}

async function updateQuotationFollowStatus(quoteId, status) {
  const quote = salesData().quotations.find(item => item.id === quoteId);
  if (!quote) return;
  const savedStatus = status === "Quotation Sent" ? "Sent" : status;
  salesCrmState = await api("/api/sales-crm/quotations", { method: "POST", body: JSON.stringify({ ...quote, status: savedStatus }) });
  renderSalesDesk();
  toast("Follow-up status updated");
}

async function updateManualFollowStatus(itemId, status) {
  const followUp = salesData().followUps.find(item => item.id === itemId);
  if (!followUp) return;
  salesCrmState = await api("/api/sales-crm/followUps", {
    method: "POST",
    body: JSON.stringify({ ...followUp, status, due: status === "Confirmed" ? "Done" : followUp.due })
  });
  renderSalesDesk();
  toast("Follow-up status updated");
}

function editSalesQuotation(quoteId) {
  const quote = findSalesQuotation(quoteId);
  if (!quote) return;
  salesQuotationDraft = {
    ...structuredClone(quote),
    quotationNo: quote.no || "",
    quotationDate: quote.date || "",
    discount: quote.discount || 0,
    items: structuredClone(quote.items || [])
  };
  salesQuotationMode = "create";
  showSalesDesk("quotation");
}

async function deleteSalesItem(collection, itemId) {
  if (!itemId || !confirm("Delete this CRM record?")) return;
  salesCrmState = await api(`/api/sales-crm/${collection}/${encodeURIComponent(itemId)}`, { method: "DELETE" });
  renderSalesDesk();
  toast("CRM record deleted");
}

async function completeSalesFollowUp(itemId) {
  const followUp = salesData().followUps.find(item => item.id === itemId);
  if (!followUp) return;
  salesCrmState = await api("/api/sales-crm/followUps", {
    method: "POST",
    body: JSON.stringify({ ...followUp, status: "Confirmed", due: "Done" })
  });
  renderSalesDesk();
  toast("Follow-up confirmed");
}

async function createCustomerFromLead(leadId) {
  const lead = salesData().leads.find(item => item.id === leadId);
  if (!lead) return;
  const exists = salesData().customers.some(customer => norm(customer.name) === norm(lead.customer));
  if (exists && !confirm("Customer already exists. Create another customer record from this lead?")) return;
  salesCrmState = await api("/api/sales-crm/customers", {
    method: "POST",
    body: JSON.stringify({
      name: lead.customer || "",
      type: lead.projectType || "Commercial",
      contact: lead.customer || "",
      role: "",
      phone: lead.phone || "",
      email: "",
      address: lead.location || "",
      detail: lead.requirement || "",
      trn: ""
    })
  });
  toast("Customer created from lead");
  showSalesDesk("customers");
}

function openSalesForm(collection, itemId = "") {
  const existing = itemId ? structuredClone((salesData()[collection] || []).find(item => item.id === itemId)) : null;
  const config = salesFormConfig(collection);
  const item = existing || config.blank();
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal sales-modal">
      <div class="inventory-topbar">
        <div>
          <h2>${existing ? "Edit" : "Add"} ${escapeHtml(config.title)}</h2>
          <p class="inventory-muted">Sales Desk CRM record.</p>
        </div>
        <button class="mini-button" data-close-sales-modal>Close</button>
      </div>
      <div class="form-grid sales-modal-grid">
        ${config.fields.map(field => salesFormField(field, item[field.key])).join("")}
      </div>
      <div class="inventory-actions">
        <button class="ghost-button" data-close-sales-modal>Cancel</button>
        <button class="primary-button" id="saveSalesFormBtn">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelectorAll("[data-close-sales-modal]").forEach(button => button.addEventListener("click", () => modal.remove()));
  modal.querySelector("#saveSalesFormBtn").addEventListener("click", async () => {
    const payload = { ...item };
    config.fields.forEach(field => {
      const el = modal.querySelector(`[data-sales-form-field="${field.key}"]`);
      const value = el ? el.value.trim() : "";
      payload[field.key] = field.type === "dateText" ? formatSalesDateInput(value) : field.type === "money" ? sanitizeSalesMoneyInput(value) : value;
    });
    if (!config.required(payload)) return alert(config.requiredMessage);
    salesCrmState = await api(`/api/sales-crm/${collection}`, { method: "POST", body: JSON.stringify(payload) });
    modal.remove();
    renderSalesDesk();
    toast(`${config.title} saved`);
  });
}

function salesFormField(field, value = "") {
  const common = `data-sales-form-field="${field.key}"`;
  if (field.type === "customerSelect") {
    const customers = salesData().customers || [];
    const names = [...new Set(customers.map(customer => customer.name).filter(Boolean))];
    if (value && !names.includes(value)) names.unshift(value);
    const listId = `salesCustomerList-${field.key}`;
    return `<label>${escapeHtml(field.label)}<input ${common} list="${listId}" placeholder="Type to search customer..." value="${escapeHtml(value || "")}"><datalist id="${listId}">${names.map(name => `<option value="${escapeHtml(name)}"></option>`).join("")}</datalist></label>`;
  }
  if (field.type === "select") {
    return `<label>${escapeHtml(field.label)}<select ${common}>${field.options.map(option => `<option ${String(value) === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></label>`;
  }
  if (field.type === "textarea") {
    return `<label class="span-two">${escapeHtml(field.label)}<textarea ${common}>${escapeHtml(value || "")}</textarea></label>`;
  }
  if (field.type === "dateText") {
    return `<label>${escapeHtml(field.label)}<input ${common} inputmode="numeric" placeholder="DD/MM/YYYY" value="${escapeHtml(formatSalesDateInput(value || ""))}"></label>`;
  }
  if (field.type === "money") {
    return `<label>${escapeHtml(field.label)}<input ${common} type="number" min="0" step="0.01" inputmode="decimal" placeholder="AED" value="${escapeHtml(sanitizeSalesMoneyInput(value || ""))}"></label>`;
  }
  return `<label>${escapeHtml(field.label)}<input ${common} value="${escapeHtml(value || "")}"></label>`;
}

function salesFormConfig(collection) {
  const configs = {
    leads: {
      title: "Enquiry",
      requiredMessage: "Customer name is required.",
      required: item => !!item.customer,
      blank: () => ({ enquiryNo: salesData().settings?.nextEnquiryNo || `ENQ-${new Date().getFullYear()}-0001`, customer: "", phone: "", requirement: "", projectType: "Villa Project", location: "", source: "WhatsApp", status: "New Lead", followUp: "", priority: "Planned" }),
      fields: [
        { key: "enquiryNo", label: "Enquiry No." },
        { key: "customer", label: "Customer / Contact" },
        { key: "phone", label: "Phone" },
        { key: "requirement", label: "Requirement" },
        { key: "projectType", label: "Project Type", type: "select", options: ["Villa Project", "Commercial", "Apartment", "Maintenance"] },
        { key: "location", label: "Location" },
        { key: "source", label: "Source", type: "select", options: ["WhatsApp", "Website", "Referral", "Phone", "Email"] },
        { key: "status", label: "Status", type: "select", options: ["New Lead", "Contacted", "Site Visit", "Quotation Needed", "Won", "Lost"] },
        { key: "followUp", label: "Follow-up Date", type: "dateText" },
        { key: "priority", label: "Priority", type: "select", options: ["Overdue", "Today", "Planned"] }
      ]
    },
    customers: {
      title: "Customer",
      requiredMessage: "Customer name is required.",
      required: item => !!item.name,
      blank: () => ({ name: "", type: "Commercial", contact: "", role: "", phone: "", email: "", address: "", detail: "", trn: "" }),
      fields: [
        { key: "name", label: "Customer / Company Name" },
        { key: "type", label: "Type", type: "select", options: ["Commercial", "Residential", "Maintenance", "Private"] },
        { key: "contact", label: "Contact Person" },
        { key: "role", label: "Role" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "address", label: "Location / Address" },
        { key: "detail", label: "Address Details" },
        { key: "trn", label: "TRN Number" }
      ]
    },
    projects: {
      title: "Project",
      requiredMessage: "Project name is required.",
      required: item => !!item.name,
      blank: () => ({ name: "", customer: "", location: "", type: "Commercial", requirement: "Supply & Installation", engineer: "", status: "Site Visit Done", date: "", value: "" }),
      fields: [
        { key: "name", label: "Project Name" },
        { key: "customer", label: "Customer", type: "customerSelect" },
        { key: "location", label: "Location" },
        { key: "type", label: "Type", type: "select", options: ["Residential", "Commercial", "Industrial"] },
        { key: "requirement", label: "Requirement", type: "select", options: ["Supply & Installation", "Supply of AC Units", "AMC / Maintenance", "Repair / Service"] },
        { key: "engineer", label: "Assigned Engineer" },
        { key: "status", label: "Status", type: "select", options: ["Site Visit Done", "Quotation Sent", "Negotiation", "Won", "Lost"] },
        { key: "date", label: "Date", type: "dateText" },
        { key: "value", label: "Value", type: "money" }
      ]
    },
    followUps: {
      title: "Follow-up",
      requiredMessage: "Customer name is required.",
      required: item => !!item.customer,
      blank: () => ({ customer: "", phone: "", project: "", quotation: "", date: "", due: "", status: "Quotation Sent" }),
      fields: [
        { key: "customer", label: "Customer" },
        { key: "phone", label: "Phone" },
        { key: "project", label: "Project" },
        { key: "quotation", label: "Quotation No." },
        { key: "date", label: "Date", type: "dateText" },
        { key: "due", label: "Due / Reminder" },
        { key: "status", label: "Status", type: "select", options: ["Quotation Sent", "Awaiting Response", "Negotiation", "Confirmed"] }
      ]
    }
  };
  return configs[collection];
}

function previewSalesQuotation(quoteId) {
  const quote = findSalesQuotation(quoteId);
  if (!quote) return;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(salesQuotationDocumentHtml(quote));
  win.document.close();
}

async function downloadSalesQuotationPdf(quoteId) {
  const quote = findSalesQuotation(quoteId);
  if (!quote) return;
  const response = await fetch("/api/sales-crm/quotations/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quoteId: quote.id })
  });
  if (!response.ok) return toast("Could not create quotation PDF");
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  downloadBlob(blob, match ? match[1] : `${safeFile(quote.no || "quotation")}.pdf`);
}

async function copySalesQuotation(quoteId) {
  const quote = findSalesQuotation(quoteId);
  if (!quote) return;
  const copy = structuredClone(quote);
  delete copy.id;
  copy.no = salesData().settings?.nextQuotationNo || `${quote.no}-COPY`;
  copy.status = "Draft";
  copy.revision = "Copied Quote";
  salesCrmState = await api("/api/sales-crm/quotations", { method: "POST", body: JSON.stringify(copy) });
  renderSalesDesk();
  toast("Quotation copied");
}

function salesQuotationDocumentHtml(quote) {
  const itemSubtotal = (quote.items || []).reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.unitPrice || 0), 0);
  const manualSubtotal = String(quote.manualSubtotal || "").trim();
  const subtotal = manualSubtotal ? Number(manualSubtotal.replace(/,/g, "")) || 0 : itemSubtotal;
  const discount = Number(quote.discount || 0);
  const taxable = Math.max(0, subtotal - discount);
  const vat = taxable * 0.05;
  return `<!doctype html><html><head><title>${escapeHtml(quote.no || "Quotation")}</title><style>
    body{font-family:Arial,sans-serif;color:#0b1c30;padding:36px} h1{color:#1b365d} table{width:100%;border-collapse:collapse;margin-top:18px} th,td{border:1px solid #cbd5e1;padding:9px;text-align:left} th{background:#1b365d;color:white}.summary{margin-left:auto;width:320px}.right{text-align:right}.muted{color:#64748b;white-space:pre-wrap}
  </style></head><body>
    <h1>Quotation</h1><p><strong>${escapeHtml(quote.no || "")}</strong> | ${escapeHtml(quote.date || "")}</p>
    <p><strong>Customer:</strong> ${escapeHtml(quote.customer || "")}<br><strong>Project:</strong> ${escapeHtml(quote.project || "")}<br><strong>Validity:</strong> ${escapeHtml(quote.validity || "")}</p>
    <table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>
      ${(quote.items || []).map((item, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(item.description || "")}</td><td>${item.qty || 0}</td><td>${escapeHtml(item.unit || "")}</td><td>${salesMoney(item.unitPrice || 0)}</td><td>${salesMoney(Number(item.qty || 0) * Number(item.unitPrice || 0))}</td></tr>`).join("")}
    </tbody></table>
    <table class="summary"><tr><td>Subtotal</td><td class="right">${salesMoney(subtotal)}</td></tr><tr><td>Discount</td><td class="right">${salesMoney(discount)}</td></tr><tr><td>VAT 5%</td><td class="right">${salesMoney(vat)}</td></tr><tr><th>Total</th><th class="right">${salesMoney(taxable + vat)}</th></tr></table>
    <p class="muted">${escapeHtml(quote.notes || "")}</p>
    ${quote.terms ? `<h3>Terms &amp; Conditions</h3><p class="muted">${escapeHtml(quote.terms)}</p>` : ""}
  </body></html>`;
}

function exportSalesCsv(collection) {
  const rows = salesData()[collection] || [];
  if (!rows.length) return toast("No records to export");
  const columns = Object.keys(rows[0]).filter(key => !["items"].includes(key));
  const csv = [
    columns.join(","),
    ...rows.map(row => columns.map(column => csvCell(row[column])).join(","))
  ].join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `sales-${collection}.csv`);
}

function csvCell(value) {
  const text = String(value ?? "").replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
}

async function loadPurchaseOrders() {
  purchaseState = await api("/api/purchase-orders");
}

function setCanvasActionsVisible(visible) {
  document.querySelector(".top-actions")?.classList.toggle("hidden", !visible);
}

function renderViewActions() {
  const actions = $("#viewActions");
  if (!actions) return;
  actions.classList.add("hidden");
  actions.innerHTML = "";
  if (activeView === "purchaseOrders") {
    actions.classList.remove("hidden");
    actions.innerHTML = `
      <button class="ghost-button" id="headerPoListBtn">Purchase Orders</button>
      <button class="ghost-button" id="headerPoSuppliersBtn">Suppliers</button>
      <button class="primary-button" id="headerPoManualBtn">Create PO</button>
      <button class="ghost-button" id="headerPoUploadBtn">Upload</button>
    `;
    $("#headerPoListBtn").addEventListener("click", () => showPurchaseOrders("list"));
    $("#headerPoSuppliersBtn").addEventListener("click", () => showPurchaseOrders("suppliers"));
    $("#headerPoUploadBtn").addEventListener("click", () => uploadPurchaseQuotation());
    $("#headerPoManualBtn").addEventListener("click", () => {
      purchaseDraft = newPurchaseDraft();
      showPurchaseOrders("form");
    });
    return;
  }
  if (activeView !== "inventory") return;
  if (["supplier", "supplierAll"].includes(inventoryScreen)) {
    actions.classList.remove("hidden");
    actions.innerHTML = `
      <button class="primary-button" id="headerSupplierDnBtn">Supplier DN</button>
      <button class="primary-button" id="headerUploadDnBtn">Upload DN</button>
    `;
    $("#headerSupplierDnBtn").addEventListener("click", () => {
      supplierAllPage = 1;
      showInventory("supplierAll");
    });
    $("#headerUploadDnBtn").addEventListener("click", () => uploadSupplierDn());
    return;
  }
  if (!["delivery", "customers"].includes(inventoryScreen)) return;
  actions.classList.remove("hidden");
  actions.innerHTML = `
    <button class="primary-button" id="headerAddCustomerBtn">Add Customer</button>
    <button class="primary-button" id="headerNewDeliveryBtn">Create Delivery Note</button>
    <button class="primary-button" id="headerCustomerListBtn">Customer List</button>
  `;
  $("#headerAddCustomerBtn").addEventListener("click", () => openCustomerModal());
  $("#headerNewDeliveryBtn").addEventListener("click", () => {
    deliveryDraft = newDeliveryDraft();
    showInventory("delivery");
  });
  $("#headerCustomerListBtn").addEventListener("click", () => showInventory("customers"));
}

function renderPurchaseOrders() {
  const root = $("#purchaseOrdersRoot");
  if (!purchaseState) {
    root.innerHTML = "";
    return;
  }
  if (purchaseScreen === "list") root.innerHTML = purchaseOrderListHtml();
  else if (purchaseScreen === "suppliers") root.innerHTML = purchaseSupplierListHtml();
  else root.innerHTML = purchaseOrderFormPageHtml();
  bindPurchaseEvents();
}

function purchaseOrderShell(inner) {
  return `
    <div class="po-page">
      ${inner}
    </div>
  `;
}

function purchaseOrderFormPageHtml() {
  purchaseDraft = purchaseDraft || newPurchaseDraft();
  if (!purchaseDraft.poNo && purchaseState?.settings?.nextPoNo) purchaseDraft.poNo = purchaseState.settings.nextPoNo;
  recalcPurchaseOrder(purchaseDraft);
  return purchaseOrderShell(`
    <div class="po-layout">
      <section class="inventory-card">
        <div class="po-form-title-row">
          <h3>New Purchase Order</h3>
          <label>LPO No.<input data-po-field="poNo" value="${escapeHtml(purchaseDraft.poNo || "")}"></label>
        </div>
        ${purchaseOrderFormHtml(purchaseDraft)}
      </section>
      <aside class="inventory-card po-summary-card">
        <h3>Order Summary</h3>
        ${purchaseSummaryHtml(purchaseDraft)}
      </aside>
    </div>
  `);
}

function purchaseOrderListHtml() {
  const orders = purchaseFilteredOrders();
  return purchaseOrderShell(`
    <section class="inventory-card">
      <div class="po-list-header">
        <div>
          <h3>Purchase Orders</h3>
          <p class="inventory-muted">Saved drafts and created purchase orders.</p>
        </div>
        <input id="poSearchInput" type="search" placeholder="Search PO, supplier, quotation, project..." value="${escapeHtml(purchaseSearchQuery)}">
      </div>
      <table class="inventory-table">
        <thead><tr><th>PO No.</th><th>Supplier / Project</th><th>PO Date</th><th>Items</th><th>Grand Total</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${orders.map(order => `<tr><td><strong>${escapeHtml(order.poNo || "Draft")}</strong></td><td>${escapeHtml(order.supplierName || "-")}<br><span class="inventory-muted">${escapeHtml(order.projectName || "")}</span></td><td>${formatInventoryDate(order.poDate)}</td><td>${(order.items || []).length}</td><td>${money(order.grandTotal)}</td><td>${statusPill(order.status)}</td><td>${rowMenu([{label:"Edit",action:"edit-po",id:order.id},{label:"Download",action:"download-po",id:order.id},{label:"Delete",action:"delete-po",id:order.id,danger:true}])}</td></tr>`).join("") || `<tr><td colspan="7">No purchase orders saved.</td></tr>`}
        </tbody>
      </table>
    </section>
  `);
}

function purchaseSupplierListHtml() {
  const suppliers = purchaseFilteredSuppliers();
  return purchaseOrderShell(`
    <section class="inventory-card">
      <div class="po-list-header">
        <div>
          <h3>Suppliers</h3>
          <p class="inventory-muted">Manage supplier details used in Purchase Orders.</p>
        </div>
        <div class="inventory-search">
          <input id="poSupplierSearchInput" type="search" placeholder="Search supplier, TRN, phone..." value="${escapeHtml(purchaseSupplierSearchQuery)}">
          <button class="primary-button" id="poAddSupplierBtn">Create New Supplier</button>
        </div>
      </div>
      <table class="inventory-table">
        <thead><tr><th>Supplier Name</th><th>TRN</th><th>Contact</th><th>Email</th><th>Payment Terms</th><th>Action</th></tr></thead>
        <tbody>
          ${suppliers.map(supplier => `<tr><td><strong>${escapeHtml(supplier.supplierName)}</strong><br><span class="inventory-muted">${escapeHtml(supplier.address || "")}</span></td><td>${escapeHtml(supplier.trn || "")}</td><td>${escapeHtml(supplier.contactPerson || "")}<br><span class="inventory-muted">${escapeHtml(supplier.phone || "")}</span></td><td>${escapeHtml(supplier.email || "")}</td><td>${escapeHtml(supplier.paymentTerms || "")}</td><td>${rowMenu([{label:"Edit",action:"edit-po-supplier",id:supplier.id},{label:"Delete",action:"delete-po-supplier",id:supplier.id,danger:true}])}</td></tr>`).join("") || `<tr><td colspan="6">No suppliers added.</td></tr>`}
        </tbody>
      </table>
    </section>
  `);
}

function purchaseFilteredSuppliers() {
  const suppliers = purchaseState?.suppliers || [];
  const q = purchaseSupplierSearchQuery.trim().toLowerCase();
  if (!q) return suppliers;
  return suppliers.filter(supplier => [
    supplier.supplierName,
    supplier.address,
    supplier.trn,
    supplier.contactPerson,
    supplier.phone,
    supplier.email,
    supplier.paymentTerms
  ].join(" ").toLowerCase().includes(q));
}

function paymentTermFieldHtml(value, mode = "po") {
  return `<input list="poPaymentTermOptions" data-po-field="paymentTerms" value="${escapeHtml(value || "")}">`;
}

function supplierPaymentTermFieldHtml(value) {
  return `<input list="poSupplierPaymentOptions" data-po-supplier-payment value="${escapeHtml(value || "")}">`;
}

function purchaseFilteredOrders() {
  const orders = purchaseState?.orders || [];
  const q = purchaseSearchQuery.trim().toLowerCase();
  if (!q) return orders;
  return orders.filter(order => [
    order.poNo,
    order.supplierName,
    order.projectName,
    order.quotationNo,
    order.status,
    ...(order.items || []).flatMap(item => [item.description, item.modelNo])
  ].join(" ").toLowerCase().includes(q));
}

function purchaseOrderFormHtml(po) {
  const suppliers = purchaseState?.suppliers || [];
  return `
    <datalist id="poSupplierList">${suppliers.map(supplier => `<option value="${escapeHtml(supplier.supplierName)}"></option>`).join("")}</datalist>
    <datalist id="poPaymentTermOptions">${paymentTermOptions.map(option => `<option value="${escapeHtml(option)}"></option>`).join("")}</datalist>
    <div class="po-form-grid">
      <label>Supplier Name<input list="poSupplierList" data-po-field="supplierName" value="${escapeHtml(po.supplierName)}"></label>
      <label>Reference No<input data-po-field="quotationNo" value="${escapeHtml(po.quotationNo)}"></label>
      <label>Purchase Representative<input data-po-field="purchaseRepresentative" value="${escapeHtml(po.purchaseRepresentative || "")}"></label>
      <label class="wide-field">Supplier Address<textarea data-po-field="supplierAddress">${escapeHtml(po.supplierAddress)}</textarea></label>
      <label>PO Date<input data-po-field="poDate" placeholder="DD-MM-YYYY" value="${formatInventoryDate(po.poDate)}"></label>
      <label>Project Name<input data-po-field="projectName" value="${escapeHtml(po.projectName)}"></label>
      <label>TRN<input data-po-field="trn" value="${escapeHtml(po.trn)}"></label>
      <label>Payment Terms${paymentTermFieldHtml(po.paymentTerms, "po")}</label>
      <label class="span-two">Notes<textarea data-po-field="notes">${escapeHtml(po.notes)}</textarea></label>
    </div>
    <table class="inventory-table po-item-table">
      <thead><tr><th>#</th><th>Item Description</th><th>Qty</th><th>Unit Price (AED)</th><th>VAT (%)</th><th>Amount (AED)</th><th>Action</th></tr></thead>
      <tbody>
        ${(po.items || []).map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td><textarea data-po-line="${index}" data-field="description">${escapeHtml(item.description)}</textarea></td>
            <td><input type="number" min="0" data-po-line="${index}" data-field="qty" value="${Number(item.qty || 0)}"></td>
            <td><input type="number" min="0" step="0.01" data-po-line="${index}" data-field="unitPrice" value="${Number(item.unitPrice || 0)}"></td>
            <td><input type="number" min="0" step="0.01" data-po-line="${index}" data-field="vatPercent" value="${Number(item.vatPercent ?? 5)}"></td>
            <td data-po-amount="${index}">${money(item.amount)}</td>
            <td><button class="danger-button" data-delete-po-line="${index}">Delete</button></td>
          </tr>
        `).join("") || `<tr><td colspan="7">No items added.</td></tr>`}
      </tbody>
    </table>
    <div class="inventory-actions" style="justify-content:flex-start"><button class="ghost-button" id="poAddItemBtn">+ Add Item</button></div>
  `;
}

function purchaseSummaryHtml(po) {
  return `
    <div class="po-summary-row po-subtotal-row"><span>Subtotal (AED)</span><input id="poSubtotalInput" type="text" inputmode="decimal" data-po-subtotal value="${escapeHtml(po.manualSubtotal ?? money(po.subtotal))}"></div>
    <div class="po-summary-row"><span>VAT Total (AED)</span><strong id="poVatTotal">${money(po.vatTotal)}</strong></div>
    <div class="po-summary-row po-summary-total"><strong>Grand Total (AED)</strong><strong id="poGrandTotal">${money(po.grandTotal)}</strong></div>
    <div class="po-status-box"><span>Status</span>${statusPill(po.status || "Draft")}</div>
    <div class="inventory-actions">
      <button class="ghost-button" id="poSaveDraftBtn">Save Draft</button>
      <button class="primary-button" id="poCreateBtn">Create Purchase Order</button>
      <button class="ghost-button" id="poDownloadBtn">Download PDF</button>
    </div>
  `;
}

function newPurchaseDraft() {
  return {
    id: "",
    poNo: "",
    status: "Draft",
    supplierName: "",
    supplierAddress: "",
    trn: "",
    quotationNo: "",
    quotationDate: "",
    purchaseRepresentative: "",
    poDate: new Date().toISOString().slice(0, 10),
    projectName: "",
    paymentTerms: "",
    manualSubtotal: "",
    notes: defaultPurchaseNotes,
    items: [newPurchaseItem()]
  };
}

function newPurchaseItem() {
  return { id: String(Date.now() + Math.random()), description: "", modelNo: "", qty: 1, unitPrice: 0, vatPercent: 5, amount: 0 };
}

function recalcPurchaseOrder(po) {
  po.items = po.items || [];
  let subtotal = 0;
  let vatTotal = 0;
  for (const item of po.items) {
    const base = Number(item.qty || 0) * Number(item.unitPrice || 0);
    const vat = base * (Number(item.vatPercent || 0) / 100);
    item.amount = base + vat;
    subtotal += base;
    vatTotal += vat;
  }
  const hasManualSubtotal = String(po.manualSubtotal ?? "").trim() !== "";
  const finalSubtotal = hasManualSubtotal ? (Number(String(po.manualSubtotal).replace(/,/g, "")) || 0) : subtotal;
  const vatRate = subtotal > 0 ? vatTotal / subtotal : averageVatRate(po.items);
  po.subtotal = finalSubtotal;
  po.vatTotal = finalSubtotal * vatRate;
  po.grandTotal = po.subtotal + po.vatTotal;
  return po;
}

function averageVatRate(items = []) {
  const rates = items.map(item => Number(item.vatPercent || 0)).filter(rate => Number.isFinite(rate) && rate > 0);
  const rate = rates.length ? rates.reduce((sum, item) => sum + item, 0) / rates.length : 5;
  return rate / 100;
}

function refreshPurchaseTotals() {
  if (!purchaseDraft) return;
  recalcPurchaseOrder(purchaseDraft);
  const subtotalInput = $("#poSubtotalInput");
  if (subtotalInput && String(purchaseDraft.manualSubtotal ?? "").trim() === "") subtotalInput.value = money(purchaseDraft.subtotal);
  $("#poVatTotal") && ($("#poVatTotal").textContent = money(purchaseDraft.vatTotal));
  $("#poGrandTotal") && ($("#poGrandTotal").textContent = money(purchaseDraft.grandTotal));
  (purchaseDraft.items || []).forEach((item, index) => {
    const amountCell = document.querySelector(`[data-po-amount="${index}"]`);
    if (amountCell) amountCell.textContent = money(item.amount);
  });
}

function bindPurchaseEvents() {
  const supplierInput = document.querySelector('[data-po-field="supplierName"]');
  supplierInput?.addEventListener("change", () => applyPurchaseSupplierToDraft(supplierInput.value));
}

function applyPurchaseSupplierToDraft(name) {
  if (!purchaseDraft) return;
  const supplier = (purchaseState?.suppliers || []).find(item => norm(item.supplierName) === norm(name));
  if (!supplier) return;
  purchaseDraft.supplierName = supplier.supplierName || "";
  purchaseDraft.supplierAddress = supplier.address || "";
  purchaseDraft.trn = supplier.trn || "";
  if (!purchaseDraft.paymentTerms) purchaseDraft.paymentTerms = supplier.paymentTerms || "";
  renderPurchaseOrders();
}

function openPurchaseSupplierModal(supplier = null) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal">
      <datalist id="poSupplierPaymentOptions">${paymentTermOptions.map(option => `<option value="${escapeHtml(option)}"></option>`).join("")}</datalist>
      <div class="inventory-topbar">
        <div>
          <h2>${supplier ? "Edit Supplier" : "Create New Supplier"}</h2>
          <p class="inventory-muted">Supplier details for Purchase Orders only.</p>
        </div>
        <button class="mini-button" data-close-po-supplier-modal>Close</button>
      </div>
      <div class="form-grid">
        <label>Supplier Name<input id="poSupplierName" value="${escapeHtml(supplier?.supplierName || "")}"></label>
        <label>TRN<input id="poSupplierTrn" value="${escapeHtml(supplier?.trn || "")}"></label>
        <label>Contact Person<input id="poSupplierContact" value="${escapeHtml(supplier?.contactPerson || "")}"></label>
        <label>Phone<input id="poSupplierPhone" value="${escapeHtml(supplier?.phone || "")}"></label>
        <label>Email<input id="poSupplierEmail" type="email" value="${escapeHtml(supplier?.email || "")}"></label>
        <label>Payment Terms${supplierPaymentTermFieldHtml(supplier?.paymentTerms || "")}</label>
        <label>Address<textarea id="poSupplierAddress">${escapeHtml(supplier?.address || "")}</textarea></label>
      </div>
      <div class="inventory-actions">
        <button class="ghost-button" data-close-po-supplier-modal>Cancel</button>
        <button class="primary-button" id="savePoSupplierBtn">Save Supplier</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelectorAll("[data-close-po-supplier-modal]").forEach(button => button.addEventListener("click", () => modal.remove()));
  modal.querySelector("#savePoSupplierBtn").addEventListener("click", () => savePurchaseSupplierFromModal(modal, supplier?.id || ""));
  modal.querySelector("#poSupplierName")?.focus();
}

async function savePurchaseSupplierFromModal(modal, supplierId) {
  const paymentField = modal.querySelector("[data-po-supplier-payment]");
  const supplier = {
    id: supplierId,
    supplierName: $("#poSupplierName").value.trim(),
    trn: $("#poSupplierTrn").value.trim(),
    contactPerson: $("#poSupplierContact").value.trim(),
    phone: $("#poSupplierPhone").value.trim(),
    email: $("#poSupplierEmail").value.trim(),
    paymentTerms: paymentField?.value?.trim() || "",
    address: $("#poSupplierAddress").value.trim()
  };
  if (!supplier.supplierName) return alert("Supplier Name is required.");
  purchaseState = await api("/api/purchase-orders/suppliers", { method: "POST", body: JSON.stringify(supplier) });
  modal.remove();
  renderPurchaseOrders();
  toast("Supplier saved");
}

async function deletePurchaseSupplier(supplierId) {
  if (!confirm("Delete this supplier?")) return;
  purchaseState = await api(`/api/purchase-orders/suppliers/${encodeURIComponent(supplierId)}`, { method: "DELETE" });
  renderPurchaseOrders();
  toast("Supplier deleted");
}

async function loadInventory() {
  inventoryState = await api("/api/inventory");
}

async function loadProjectList() {
  const q = encodeURIComponent($("#searchInput").value || "");
  const projects = await api(`/api/projects?q=${q}`);
  $("#projectList").innerHTML = projects.map(project => `
    <article class="project-card">
      <div>
        <h3>${escapeHtml(project.project || project.title || "Untitled Project")}</h3>
        <p>${escapeHtml(project.customer || "No customer")} · ${escapeHtml(project.quotationNo || "")} · ${new Date(project.updatedAt).toLocaleString()}</p>
      </div>
      <div class="project-card-actions">
        <button class="primary-button" data-open-project="${project.id}">Open Canvas</button>
        <button class="danger-button" data-delete-project="${project.id}">Delete</button>
      </div>
    </article>
  `).join("") || "<p>No saved projects found.</p>";
  document.querySelectorAll("[data-open-project]").forEach(button => {
    button.addEventListener("click", () => loadProject(button.dataset.openProject));
  });
  document.querySelectorAll("[data-delete-project]").forEach(button => {
    button.addEventListener("click", () => deleteProject(button.dataset.deleteProject));
  });
}

async function deleteProject(projectId) {
  if (!confirm("Delete this project canvas? This cannot be undone.")) return;
  await api(`/api/projects/${projectId}`, { method: "DELETE" });
  if (state && state.id === projectId) state = null;
  await loadProjectList();
  toast("Project deleted");
}

function render() {
  $("#pageTitle").textContent = state.details.project || "Workflow";
  $("#projectMeta").textContent = `${state.details.customer || "Internal project"} · ${state.quotation.quotationNo}`;
  canvas.innerHTML = "";
  state.nodes.forEach(renderNode);
  applyCanvasZoom();
}

function applyCompactLayout(force) {
  if (!force && state.layoutVersion === "screenshot-v3") return;
  const positions = {
    details: [0, 0],
    "thermal-upload": [145, 250],
    "vrv-upload": [860, 6],
    "thermal-table": [10, 470],
    "costing-table": [725, 300],
    "boq-table": [725, 545],
    quotation: [1605, 485],
    "vrv-schedule": [20, 815]
  };
  state.nodes.forEach(node => {
    if (positions[node.id]) {
      node.x = positions[node.id][0];
      node.y = positions[node.id][1];
      applyDefaultNodeSize(node);
    }
  });
  state.layoutVersion = "screenshot-v3";
}

function autoLayoutWorkflow() {
  const positions = {
    details: [0, 0],
    "thermal-upload": [145, 250],
    "vrv-upload": [860, 6],
    "thermal-table": [10, 470],
    "costing-table": [725, 300],
    "boq-table": [725, 545],
    quotation: [1605, 485],
    "vrv-schedule": [20, 815]
  };
  const thermalRows = state.tables.thermal.rows.length;
  const costingRows = state.tables.costing.rows.length;
  const boqRows = state.tables.boq.rows.length;
  const vrvRows = state.tables.vrvSchedule.rows.length;
  const thermalHeight = tableAutoHeight("thermal", thermalRows);
  const costingHeight = tableAutoHeight("costing", costingRows);
  const boqHeight = tableAutoHeight("boq", boqRows);
  const vrvHeight = tableAutoHeight("vrvSchedule", vrvRows);

  positions["boq-table"][1] = positions["costing-table"][1] + costingHeight + 22;
  positions.quotation[1] = positions["boq-table"][1] + 8;
  positions["vrv-schedule"][1] = Math.max(
    815,
    positions["thermal-table"][1] + thermalHeight + 65,
    positions["boq-table"][1] + boqHeight + 65
  );
  state.nodes.forEach(node => {
    if (positions[node.id] && !node.locked) {
      node.x = positions[node.id][0];
      node.y = positions[node.id][1];
      applyAutoNodeSize(node, { thermalHeight, costingHeight, boqHeight, vrvHeight });
    }
  });
  canvas.style.height = `${positions["vrv-schedule"][1] + vrvHeight + 180}px`;
}

function tableAutoHeight(key, rowCount) {
  const rows = Math.max(1, rowCount);
  if (key === "costing") return Math.max(270, 128 + rows * 28 + 128);
  if (key === "boq") return Math.max(235, 118 + rows * 28 + 92);
  if (key === "thermal") return Math.max(260, 118 + rows * 28 + 54);
  if (key === "vrvSchedule") return Math.max(260, 118 + rows * 28 + 54);
  return 240;
}

function applyAutoNodeSize(node, heights) {
  const sizes = {
    "thermal-table": [620, heights.thermalHeight],
    "costing-table": [790, heights.costingHeight],
    "boq-table": [790, heights.boqHeight],
    "vrv-schedule": [1880, heights.vrvHeight]
  };
  if (sizes[node.id]) {
    node.width = Math.max(node.width || 0, sizes[node.id][0]);
    node.height = preserveTableSizes ? Math.max(node.height || 0, sizes[node.id][1]) : sizes[node.id][1];
  }
}

function applyDefaultNodeSize(node) {
  const sizes = {
    "thermal-table": [620, 260],
    "costing-table": [790, 270],
    "boq-table": [790, 235],
    "vrv-schedule": [1880, 260]
  };
  if (sizes[node.id]) {
    node.width = node.width || sizes[node.id][0];
    node.height = node.height || sizes[node.id][1];
  }
}

function setZoom(next) {
  canvasZoom = Math.min(1.35, Math.max(0.45, next));
  applyCanvasZoom();
}

function applyCanvasZoom() {
  canvas.style.transformOrigin = "0 0";
  canvas.style.transform = `scale(${canvasZoom})`;
  canvas.parentElement.style.background = "#fbfcff";
  canvas.style.marginRight = `${Math.max(0, canvas.offsetWidth * (canvasZoom - 1))}px`;
  canvas.style.marginBottom = `${Math.max(0, canvas.offsetHeight * (canvasZoom - 1))}px`;
}

function zoomToFit() {
  const wrap = $("#canvasView");
  if (!wrap) return;
  const neededWidth = 1970;
  const available = Math.max(600, wrap.clientWidth - 30);
  setZoom(Math.min(0.9, Math.max(0.55, available / neededWidth)));
  wrap.scrollTo({ left: 0, top: 0, behavior: "smooth" });
}

function renderNode(node) {
  const template = $("#nodeTemplate").content.firstElementChild.cloneNode(true);
  template.dataset.nodeId = node.id;
  template.classList.toggle("locked", !!node.locked);
  template.style.left = `${node.x}px`;
  template.style.top = `${node.y}px`;
  if (node.width) template.style.width = `${node.width}px`;
  if (node.height) template.style.height = `${node.height}px`;
  template.querySelector("h2").textContent = node.title;
  template.querySelector(".node-body").appendChild(nodeBody(node));
  if (["projectDetails"].includes(node.type)) template.classList.add("details-node");
  if (["thermalUpload", "vrvUpload", "file"].includes(node.type)) template.classList.add("upload-node");
  if (["thermalTable", "costingTable", "boqTable"].includes(node.type)) template.classList.add("table-node");
  if (node.type === "vrvSchedule") template.classList.add("wide-node");
  if (tableKeys[node.type]) template.classList.add("resizable-node");
  if (node.locked) template.style.resize = "none";
  if (node.type === "quotation") template.classList.add("quotation-node");
  bindNode(template, node);
  bindResizeObserver(template, node);
  canvas.appendChild(template);
}

function bindResizeObserver(el, node) {
  if (!tableKeys[node.type]) return;
  const observer = new ResizeObserver(entries => {
    const rect = entries[0].contentRect;
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (Math.abs((node.width || 0) - width) > 2 || Math.abs((node.height || 0) - height) > 2) {
      node.width = width;
      node.height = height;
      debounceSaveProject();
    }
  });
  observer.observe(el);
}

function bindNode(el, node) {
  const header = el.querySelector(".node-header");
  if (tableKeys[node.type]) {
    el.addEventListener("pointerdown", () => {
      projectTouched = true;
    });
  }
  header.addEventListener("pointerdown", event => {
    if (node.locked || event.target.closest("button")) return;
    drag = { node, el, sx: event.clientX, sy: event.clientY, ox: node.x, oy: node.y };
    header.setPointerCapture(event.pointerId);
  });
  header.addEventListener("pointermove", event => {
    if (!drag || drag.node.id !== node.id) return;
    node.x = Math.max(0, drag.ox + (event.clientX - drag.sx) / canvasZoom);
    node.y = Math.max(0, drag.oy + (event.clientY - drag.sy) / canvasZoom);
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
  });
  header.addEventListener("pointerup", () => {
    if (drag && drag.node.id === node.id) {
      drag = null;
      saveProject();
    }
  });

  const menu = el.querySelector(".node-menu");
  el.querySelector(".menu-button").addEventListener("click", event => {
    event.stopPropagation();
    menu.innerHTML = menuItems(node);
    menu.classList.toggle("hidden");
    bindMenu(menu, node);
  });
}

function menuItems(node) {
  const lockedText = node.locked ? "Unlock" : "Lock";
  const download = tableKeys[node.type] ? `<button data-action="download">Download Excel</button>` : "";
  const quotationDownload = node.type === "quotation" ? `<button data-action="download-doc">Download Word</button><button data-action="download-pdf">PDF View</button>` : "";
  const regen = tableKeys[node.type] ? `<button data-action="regenerate">Regenerate</button>` : "";
  const preview = node.type === "file" || node.type.includes("Upload") ? `<button data-action="preview">Preview File</button>` : "";
  const uploadDownload = ["thermalUpload", "vrvUpload"].includes(node.type) && node.data?.uploadId ? `<button data-action="download-upload">Download File</button>` : "";
  const deleteUpload = node.data && node.data.uploadId ? `<button class="danger" data-action="delete-upload">Delete Uploaded File</button>` : "";
  const del = tableKeys[node.type] || node.type === "file" ? `<button class="danger" data-action="delete">Delete</button>` : "";
  return `<button data-action="lock">${lockedText}</button>${download}${quotationDownload}${regen}${preview}${uploadDownload}${deleteUpload}${del}`;
}

function bindMenu(menu, node) {
  menu.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", async () => {
      const action = button.dataset.action;
      menu.classList.add("hidden");
      if (action === "lock") {
        node.locked = !node.locked;
        render();
        saveProject();
      }
      if (action === "download") downloadTable(tableKeys[node.type]);
      if (action === "regenerate") regenerate(node.type);
      if (action === "delete") deleteNodeData(node);
      if (action === "delete-upload") deleteUploadedFile(node);
      if (action === "preview") previewUpload(node);
      if (action === "download-upload") downloadUploadedFile(node);
      if (action === "download-doc") downloadQuotation();
      if (action === "download-pdf") openQuotationPrint();
    });
  });
}

function nodeBody(node) {
  if (node.type === "projectDetails") return detailsBody();
  if (node.type === "thermalUpload") return thermalUploadBody(node);
  if (node.type === "vrvUpload") return vrvUploadBody(node);
  if (tableKeys[node.type]) return tableBody(tableKeys[node.type], node);
  if (node.type === "quotation") return quotationBody();
  if (node.type === "file") return fileBody(node);
  return document.createElement("div");
}

function detailsBody() {
  const wrap = document.createElement("div");
  wrap.className = "details-grid";
  if (!state.details.model) state.details.model = "Daikin";
  const fields = [
    ["customer", "Customer"], ["contactPerson", "Contact Person"], ["telNo", "Tel. No"],
    ["email", "Email"], ["project", "Project"], ["date", "Date"],
    ["location", "Location"], ["model", "Model"], ["preparedBy", "Prepared By"]
  ];
  fields.forEach(([key, label]) => {
    const field = document.createElement("label");
    field.textContent = label;
    const input = document.createElement("input");
    input.type = key === "date" ? "date" : "text";
    input.dataset.detailKey = key;
    if (key === "customer") {
      input.setAttribute("list", "workflowCustomerList");
      input.placeholder = "Type to search customer";
    }
    if (key === "project") {
      input.setAttribute("list", "workflowProjectList");
      input.placeholder = "Type to search project";
    }
    input.value = state.details[key] || "";
    input.addEventListener("input", () => {
      state.details[key] = input.value;
      if (key === "customer") applyWorkflowCustomer(input.value, wrap);
      if (key === "project") applyWorkflowProject(input.value, wrap);
      if (key === "project") {
        state.title = input.value || "Untitled Project";
        $("#pageTitle").textContent = state.title;
      }
      scheduleProjectSave();
    });
    field.appendChild(input);
    wrap.appendChild(field);
  });
  wrap.appendChild(workflowDatalist("workflowCustomerList", (salesData().customers || []).map(customer => customer.name)));
  wrap.appendChild(workflowDatalist("workflowProjectList", (salesData().projects || []).map(project => project.name)));
  return wrap;
}

function workflowDatalist(id, values) {
  const list = document.createElement("datalist");
  list.id = id;
  [...new Set(values.filter(Boolean))].forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    list.appendChild(option);
  });
  return list;
}

function applyWorkflowCustomer(customerName, wrap) {
  const customer = (salesData().customers || []).find(item => norm(item.name) === norm(customerName));
  if (!customer) return;
  setWorkflowDetail("customer", customer.name, wrap);
  setWorkflowDetail("contactPerson", customer.contact || "", wrap);
  setWorkflowDetail("telNo", customer.phone || "", wrap);
  setWorkflowDetail("email", customer.email || "", wrap);
}

function applyWorkflowProject(projectName, wrap) {
  const project = (salesData().projects || []).find(item => norm(item.name) === norm(projectName));
  if (!project) return;
  setWorkflowDetail("project", project.name, wrap);
  setWorkflowDetail("location", project.location || "", wrap);
  setWorkflowDetail("model", state.details.model || "Daikin", wrap);
  if (project.customer) applyWorkflowCustomer(project.customer, wrap);
}

function setWorkflowDetail(key, value, wrap) {
  state.details[key] = value || "";
  const input = wrap.querySelector(`[data-detail-key="${key}"]`);
  if (input && input.value !== state.details[key]) input.value = state.details[key];
  if (key === "project") {
    state.title = state.details.project || "Untitled Project";
    $("#pageTitle").textContent = state.title;
  }
}

function uploadCard(title, upload) {
  const card = document.createElement("div");
  card.className = "upload-card";
  card.innerHTML = `<div><div class="pdf-icon"></div><strong>${escapeHtml(upload ? upload.originalName : "No file uploaded")}</strong><span>${upload ? prettyBytes(upload.size) : "Click Upload"}</span></div>`;
  return card;
}

function thermalUploadBody(node) {
  const wrap = document.createElement("div");
  const upload = findUpload(node.data.uploadId);
  const card = uploadCard("Thermal_Sheet.pdf", upload);
  card.addEventListener("click", () => chooseUpload(node.id));
  wrap.appendChild(card);
  const actions = div("node-actions");
  actions.innerHTML = `<button data-action="chat">Open Chat</button>`;
  wrap.appendChild(actions);
  actions.querySelector('[data-action="chat"]').addEventListener("click", openThermalChat);
  return wrap;
}

function vrvUploadBody(node) {
  const wrap = document.createElement("div");
  const upload = findUpload(node.data.uploadId);
  const card = uploadCard("VRV_Selection_Report.pdf", upload);
  card.addEventListener("click", () => chooseUpload(node.id));
  wrap.appendChild(card);
  const actions = div("node-actions");
  actions.innerHTML = `<button data-action="sample">Build Tables</button>`;
  wrap.appendChild(actions);
  actions.querySelector('[data-action="sample"]').addEventListener("click", generateWorkflow);
  return wrap;
}

function tableBody(key, node) {
  const table = state.tables[key];
  const wrap = document.createElement("div");
  if (!table) {
    wrap.innerHTML = `<div class="upload-card"><div><strong>${node.title} unavailable</strong></div></div>`;
    return wrap;
  }
  const scroll = div("table-scroll");
  const html = [
    "<table><thead><tr>",
    table.columns.map((column, index) => `<th>${key === "costing" && index === 0 ? `<button class="row-add-button" title="Add row" data-add-row="${key}">+</button>` : ""}${escapeHtml(column)}</th>`).join(""),
    "</tr></thead><tbody>",
    table.rows.length
      ? table.rows.map((row, rowIndex) => `<tr class="${isEmptyRow(row) ? "separator-row" : ""}">${table.columns.map((column, colIndex) => `<td contenteditable="${!node.locked}" data-table="${key}" data-row="${rowIndex}" data-col="${escapeHtml(column)}">${escapeHtml(row[column])}${key === "costing" && colIndex === table.columns.length - 1 ? `<button class="row-delete-button" title="Delete row" data-delete-row="${rowIndex}">-</button>` : ""}</td>`).join("")}</tr>`).join("")
      : `<tr>${table.columns.map(() => `<td class="empty-cell"></td>`).join("")}</tr>`,
    "</tbody></table>"
  ].join("");
  scroll.innerHTML = html;
  wrap.appendChild(scroll);
  if (key === "costing" || key === "boq") wrap.appendChild(summaryBody(key));
  const badge = div("excel-badge");
  badge.textContent = "X";
  wrap.appendChild(badge);
  scroll.querySelectorAll("[contenteditable='true']").forEach(cell => {
    cell.addEventListener("blur", () => {
      const t = state.tables[cell.dataset.table];
      t.rows[Number(cell.dataset.row)][cell.dataset.col] = cell.textContent.trim();
      if (cell.dataset.table === "costing") {
        recalcCosting();
        buildBoqFromCosting();
      }
      if (cell.dataset.table === "boq") recalcBoq();
      if (cell.dataset.table === "thermal") buildVrvSchedule();
      if (cell.dataset.table === "vrvSchedule") fillVrvScheduleLookups();
      if (cell.dataset.table === "costing") {
        preserveTableSizes = true;
        autoLayoutWorkflow();
        preserveTableSizes = false;
      }
      render();
      saveProject();
    });
  });
  scroll.querySelectorAll("[data-add-row]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      addCostingRow();
    });
  });
  scroll.querySelectorAll("[data-delete-row]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      deleteCostingRow(Number(button.dataset.deleteRow));
    });
  });
  return wrap;
}

function isEmptyRow(row) {
  return Object.values(row || {}).every(value => String(value ?? "").trim() === "");
}

function addCostingRow() {
  const columns = state.tables.costing.columns;
  const row = Object.fromEntries(columns.map(column => [column, ""]));
  row["S.No"] = state.tables.costing.rows.length + 1;
  row.Qty = 1;
  state.tables.costing.rows.push(row);
  recalcCosting();
  buildBoqFromCosting();
  preserveTableSizes = true;
  autoLayoutWorkflow();
  preserveTableSizes = false;
  render();
  saveProject();
}

function deleteCostingRow(index) {
  if (index < 0 || index >= state.tables.costing.rows.length) return;
  state.tables.costing.rows.splice(index, 1);
  recalcCosting();
  buildBoqFromCosting();
  preserveTableSizes = true;
  autoLayoutWorkflow();
  preserveTableSizes = false;
  render();
  saveProject();
}

function summaryBody(key) {
  const box = div("summary");
  const summary = state.tables[key].summary || {};
  const rows = key === "costing"
    ? [
        ["Total TR", fmt(summary.totalTR)],
        ["Total Cost", money(summary.totalCost)],
        ["Margin", `<input class="margin-input" value="${Number(summary.margin || 0.1) * 100}"> %`],
        ["Selling Price", money(summary.sellingPrice)],
        ["Profit", money(summary.profit)],
        ["Price / Ton", money(summary.pricePerTon)]
      ]
    : [
        ["Total", money(summary.total)],
        ["VAT 5%", money(summary.vat)],
        ["Net Amount", money(summary.netAmount)]
      ];
  box.innerHTML = rows.map(([k, v]) => `<strong>${k}</strong><span>${v}</span>`).join("");
  const margin = box.querySelector(".margin-input");
  if (margin) {
    margin.addEventListener("change", () => {
      state.tables.costing.summary.margin = Number(margin.value || 10) / 100;
      recalcCosting();
      buildBoqFromCosting();
      render();
      saveProject();
    });
  }
  return box;
}

function quotationBody() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <button class="upload-card workflow-quote-button" id="workflowCreateQuoteBtn" type="button" style="height:150px;width:100%;cursor:pointer">
      <div><div class="pdf-icon download-icon"></div><strong>Create Quotation</strong><span>Open Sales Desk</span></div>
    </button>
  `;
  wrap.querySelector("#workflowCreateQuoteBtn").addEventListener("click", createSalesQuotationFromWorkflow);
  return wrap;
}

async function createSalesQuotationFromWorkflow() {
  if (!state) return;
  const customerName = state.details.customer || "";
  if (customerName) {
    if (!salesCrmState) await loadSalesCrm();
    const existingCustomer = (salesData().customers || []).find(item => norm(item.name) === norm(customerName));
    salesCrmState = await api("/api/sales-crm/customers", {
      method: "POST",
      body: JSON.stringify({
        id: existingCustomer?.id || "",
        name: customerName,
        contact: existingCustomer?.contact || state.details.contactPerson || "",
        phone: existingCustomer?.phone || state.details.telNo || "",
        email: existingCustomer?.email || state.details.email || "",
        address: existingCustomer?.address || state.details.location || "",
        detail: existingCustomer?.detail || state.details.project || "",
        type: existingCustomer?.type || "Commercial"
      })
    });
  } else if (!salesCrmState) {
    await loadSalesCrm();
  }
  salesQuotationDraft = quoteDraftFromSource({
    customer: customerName,
    project: state.details.project || "",
    location: state.details.location || "",
    enquiryNo: state.details.enquiryNo || "",
    items: workflowBoqQuoteItems(),
    manualSubtotal: money(state.tables.boq.summary?.total || state.tables.costing.summary?.sellingPrice || 0)
  });
  salesQuotationMode = "create";
  showSalesDesk("quotation");
  toast("Quotation draft prepared from workflow");
}

function workflowBoqQuoteItems() {
  const boqRows = state.tables.boq.rows || [];
  if (!boqRows.length) return [{ description: "", qty: 1, unit: "Nos", unitPrice: 0 }];
  return boqRows.map(row => {
    const qty = Number(row.Qty || 0) || 1;
    return {
      description: row.Description || "",
      qty,
      unit: "Nos",
      unitPrice: 0
    };
  });
}

function renderInventory() {
  const root = $("#inventoryRoot");
  if (!inventoryState) {
    root.innerHTML = "";
    return;
  }
  renderViewActions();
  if (inventoryScreen === "supplier") root.innerHTML = supplierDnViewHtml();
  else if (inventoryScreen === "supplierAll") root.innerHTML = supplierDnAllViewHtml();
  else if (inventoryScreen === "delivery") root.innerHTML = deliveryNoteViewHtml();
  else if (inventoryScreen === "customers") root.innerHTML = customerListViewHtml();
  else if (inventoryScreen === "stock") root.innerHTML = stockViewHtml();
  else root.innerHTML = inventoryDashboardHtml();
  bindInventoryEvents();
}

function inventoryDashboardHtml() {
  const d = inventoryState.dashboard;
  return `
    <div class="inventory-topbar">
      <div class="inventory-title"><h2>Inventory Dashboard</h2><p>Simple AC unit stock summary.</p></div>
      <div class="inventory-search"><input id="inventorySearch" placeholder="Search model, description, or DN..."><button class="primary-button" data-go-inventory="supplier">Upload DN</button></div>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card"><span>Total Models</span><strong>${d.totalModels}</strong><span>Different AC Models</span></div>
      <div class="kpi-card"><span>Total Stock Units</span><strong>${d.totalStockUnits}</strong><span>All AC Units in Stock</span></div>
      <div class="kpi-card"><span>Low Stock Models</span><strong>${d.lowStockModels}</strong><span>Below Minimum Stock</span></div>
      <div class="kpi-card"><span>Pending Review</span><strong>${d.pendingReview}</strong><span>Supplier DN Pending</span></div>
    </div>
    <div class="inventory-grid">
      <div class="inventory-card">
        <h3>Stock Overview</h3>
        <table class="inventory-table"><thead><tr><th>Model No.</th><th>Description</th><th>Qty.</th></tr></thead><tbody>
          ${d.stock.map(item => `<tr><td><strong>${escapeHtml(item.modelNo)}</strong></td><td>${escapeHtml(item.description)}</td><td><button class="qty-link" data-stock-model="${escapeHtml(item.modelNo)}">${item.qty}</button></td></tr>`).join("") || `<tr><td colspan="3">No stock yet.</td></tr>`}
        </tbody></table>
      </div>
      <div>
        <div class="inventory-card"><h3>Low Stock Alert</h3>${d.lowStock.slice(0,5).map(item => `<p><strong>${escapeHtml(item.modelNo)}</strong><br><span class="inventory-muted">Minimum Stock: ${item.minimumStock}</span> <span class="pill red">${item.qty} Units</span></p>`).join("") || `<p class="inventory-muted">No low stock alerts.</p>`}</div>
        <div class="inventory-card"><h3>Recent Stock In</h3>${d.recentIn.map(m => `<p><strong>${escapeHtml(m.referenceNo)}</strong> ${escapeHtml(m.modelNo)} <span class="pill green">+${m.quantity}</span><br><span class="inventory-muted">${formatInventoryDate(m.date)}</span></p>`).join("") || `<p class="inventory-muted">No stock in yet.</p>`}</div>
        <div class="inventory-card"><h3>Recent Stock Out</h3>${d.recentOut.map(m => `<p><strong>${escapeHtml(m.referenceNo)}</strong> ${escapeHtml(m.modelNo)} <span class="pill red">${m.quantity}</span><br><span class="inventory-muted">${formatInventoryDate(m.date)}</span></p>`).join("") || `<p class="inventory-muted">No stock out yet.</p>`}</div>
      </div>
    </div>
  `;
}

function supplierDnViewHtml() {
  const dns = inventoryState.supplierDns || [];
  const latestDns = dns.slice(0, 5);
  const active = activeSupplierDnId ? dns.find(dn => dn.id === activeSupplierDnId && !dn.isManualAdjustment) : null;
  return `
    <div class="inventory-topbar">
      <div class="inventory-title"><h2>Supplier DN</h2><p>Latest 5 stock-in records and upload verification.</p></div>
      <div class="inventory-search"><input id="supplierSearchInput" placeholder="Search DN No, Project Name, Model No"></div>
    </div>
    <div class="inventory-card">
      <table class="inventory-table supplier-dn-table"><thead><tr><th>Uploaded Date</th><th>Supplier DN No.</th><th>Project Name</th><th>Models Found</th><th>Total Qty</th><th>Status</th><th>Action</th></tr></thead><tbody>
        ${supplierDnRows(latestDns)}
      </tbody></table>
    </div>
    <div class="inventory-card">
      <h3>Verification Details</h3>
      ${active ? supplierVerificationHtml(active) : `<label class="upload-zone" id="supplierUploadZone">Upload DN<br><span class="inventory-muted">AI/OCR detects model and quantity.</span></label>`}
    </div>
  `;
}

function supplierDnAllViewHtml() {
  const dns = inventoryState.supplierDns || [];
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(dns.length / pageSize));
  supplierAllPage = Math.min(Math.max(1, supplierAllPage), totalPages);
  const pageRows = dns.slice((supplierAllPage - 1) * pageSize, supplierAllPage * pageSize);
  return `
    <div class="inventory-topbar">
      <div class="inventory-title"><h2>Supplier DN</h2><p>All uploaded and manual stock entries.</p></div>
      <div class="inventory-search"><input id="supplierAllSearchInput" placeholder="Search DN No, Project Name, Model No"></div>
    </div>
    <div class="inventory-card">
      <table class="inventory-table supplier-dn-all-table"><thead><tr><th>Uploaded Date</th><th>Supplier DN No.</th><th>Project Name</th><th>Models Found</th><th>Total Qty</th><th>Status</th><th>Action</th></tr></thead><tbody>
        ${supplierDnRows(pageRows)}
      </tbody></table>
      ${supplierDnPagination(dns.length, pageSize, supplierAllPage)}
    </div>
  `;
}

function supplierDnRows(dns) {
  return dns.map(dn => `<tr><td>${formatInventoryDate(dn.uploadedDate)}</td><td><strong>${escapeHtml(dn.supplierDnNo || "-")}</strong></td><td>${escapeHtml(dn.projectName)}</td><td>${(dn.lines || []).length}</td><td>${sumSupplierQty(dn)}</td><td>${statusPill(dn.status)}</td><td>${rowMenu(supplierDnMenuItems(dn))}</td></tr>`).join("") || `<tr><td colspan="7">No Supplier DN uploaded.</td></tr>`;
}

function supplierDnPagination(total, pageSize, currentPage) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return "";
  return `
    <div class="table-pagination">
      <span>Showing ${((currentPage - 1) * pageSize) + 1} to ${Math.min(currentPage * pageSize, total)} of ${total} entries</span>
      <div>
        ${Array.from({ length: totalPages }, (_, index) => {
          const page = index + 1;
          return `<button class="mini-button ${page === currentPage ? "active-page" : ""}" data-supplier-page="${page}">${page}</button>`;
        }).join("")}
      </div>
    </div>
  `;
}

function supplierDnMenuItems(dn) {
  const items = [{ label: "View", action: "view-supplier", id: dn.id }];
  if (!dn.isManualAdjustment) items.push({ label: "Edit", action: "edit-supplier", id: dn.id });
  items.push({ label: "Cancel", action: "cancel-supplier", id: dn.id, danger: true });
  items.push({ label: "Delete", action: "delete-supplier", id: dn.id, danger: true });
  return items;
}

function supplierVerificationHtml(dn) {
  return `
    <div class="form-grid">
      <label>Uploaded Date<input data-supplier-field="uploadedDate" value="${formatInventoryDate(dn.uploadedDate || "")}"></label>
      <label>Supplier DN No.<input data-supplier-field="supplierDnNo" value="${escapeHtml(dn.supplierDnNo || "")}"></label>
      <label>Project Name<input data-supplier-field="projectName" value="${escapeHtml(dn.projectName || "")}"></label>
    </div>
    ${dn.duplicateWarning ? `<p class="pill orange">Duplicate Supplier DN No. warning</p>` : ""}
    <table class="inventory-table"><thead><tr><th>Model No.</th><th>Description</th><th>Detected Qty</th><th>Final Qty</th><th>Status</th><th>Action</th></tr></thead><tbody>
      ${(dn.lines || []).map((line, index) => `<tr><td contenteditable="true" data-supplier-line="${index}" data-field="modelNo">${escapeHtml(line.modelNo)}</td><td contenteditable="true" data-supplier-line="${index}" data-field="description">${escapeHtml(line.description)}</td><td>${line.detectedQty}</td><td><input type="number" min="0" data-supplier-line="${index}" data-field="finalQty" value="${line.finalQty}"></td><td>${statusPill(line.status)}</td><td><button class="danger-button" data-remove-supplier-line="${index}">Remove</button></td></tr>`).join("") || `<tr><td colspan="6">No detected rows. Add manually.</td></tr>`}
    </tbody></table>
    <div class="inventory-actions"><button class="ghost-button" id="addSupplierLineBtn">Add Row</button><button class="ghost-button" id="saveSupplierDnBtn">Save Review</button><button class="danger-button" id="cancelSupplierDnBtn">Cancel DN</button><button class="primary-button" id="confirmSupplierDnBtn">Confirm Stock In</button></div>
  `;
}

function deliveryNoteViewHtml() {
  deliveryDraft = deliveryDraft || newDeliveryDraft();
  const notes = inventoryState.deliveryNotes || [];
  const pageSize = 30;
  const totalPages = Math.max(1, Math.ceil(notes.length / pageSize));
  deliveryListPage = Math.min(Math.max(1, deliveryListPage), totalPages);
  const search = deliverySearchQuery.trim().toLowerCase();
  const visibleNotes = search
    ? notes.filter(note => deliveryNoteSearchText(note).includes(search))
    : notes.slice((deliveryListPage - 1) * pageSize, deliveryListPage * pageSize);
  return `
    <div class="split-layout" id="deliverySplit">
      <div>
        <div class="inventory-topbar"><div class="inventory-title"><h2>Outbound Delivery Note</h2><p>Create, manage, and track outbound delivery notes.</p></div><div class="inventory-search"><input id="deliverySearchInput" placeholder="Search delivery note..." value="${escapeHtml(deliverySearchQuery)}"></div></div>
        <div class="inventory-card">
          <table class="inventory-table delivery-list-table"><thead><tr><th>DN No.</th><th>Customer / Project</th><th>Date</th><th>Total Qty</th><th>Status</th><th>Action</th></tr></thead><tbody>
            ${deliveryNoteRows(visibleNotes)}
          </tbody></table>
          <div id="deliveryPagination">${deliveryNotePagination(notes.length, pageSize, deliveryListPage, search, visibleNotes.length)}</div>
        </div>
      </div>
      <div class="split-resizer" id="deliverySplitResizer"></div>
      <div class="inventory-card">
        <h3>Create Delivery Note</h3>
        ${deliveryFormHtml(deliveryDraft)}
      </div>
    </div>
  `;
}

function deliveryNoteRows(notes) {
  return notes.map(note => `<tr><td><strong>${escapeHtml(note.dnNo)}</strong></td><td>${escapeHtml(note.customerName)}<br><span class="inventory-muted">${escapeHtml(note.projectName)}</span></td><td>${formatInventoryDate(note.date)}</td><td>${sumDeliveryQty(note)}</td><td>${statusPill(note.status)}</td><td>${rowMenu([{label:"Edit",action:"edit-delivery",id:note.id},{label:"Download",action:"download-delivery",id:note.id},{label:"Cancel",action:"cancel-delivery",id:note.id,danger:true},{label:"Delete",action:"delete-delivery",id:note.id,danger:true}])}</td></tr>`).join("") || `<tr><td colspan="6">No delivery notes yet.</td></tr>`;
}

function deliveryNotePagination(total, pageSize, currentPage, search, visibleCount) {
  if (search) {
    return `<div class="table-pagination"><span>Showing ${visibleCount} search result${visibleCount === 1 ? "" : "s"}</span></div>`;
  }
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return "";
  return `
    <div class="table-pagination">
      <span>Showing ${((currentPage - 1) * pageSize) + 1} to ${Math.min(currentPage * pageSize, total)} of ${total} entries</span>
      <div>
        ${Array.from({ length: totalPages }, (_, index) => {
          const page = index + 1;
          return `<button class="mini-button ${page === currentPage ? "active-page" : ""}" data-delivery-page="${page}">${page}</button>`;
        }).join("")}
      </div>
    </div>
  `;
}

function deliveryNoteSearchText(note) {
  return [
    note.dnNo,
    note.customerName,
    note.projectName,
    note.date,
    formatInventoryDate(note.date),
    note.status,
    ...(note.lines || []).flatMap(line => [line.modelNo, line.description, line.qtyGoingOut])
  ].join(" ").toLowerCase();
}

function refreshDeliveryNoteList() {
  const notes = inventoryState.deliveryNotes || [];
  const pageSize = 30;
  const totalPages = Math.max(1, Math.ceil(notes.length / pageSize));
  deliveryListPage = Math.min(Math.max(1, deliveryListPage), totalPages);
  const search = deliverySearchQuery.trim().toLowerCase();
  const visibleNotes = search
    ? notes.filter(note => deliveryNoteSearchText(note).includes(search))
    : notes.slice((deliveryListPage - 1) * pageSize, deliveryListPage * pageSize);
  const body = document.querySelector(".delivery-list-table tbody");
  const pagination = $("#deliveryPagination");
  if (body) body.innerHTML = deliveryNoteRows(visibleNotes);
  if (pagination) pagination.innerHTML = deliveryNotePagination(notes.length, pageSize, deliveryListPage, search, visibleNotes.length);
}

function customerListViewHtml() {
  const customers = inventoryState.customers || [];
  return `
    <div class="inventory-topbar">
      <div class="inventory-title"><h2>Customer List</h2><p>Manage customers used in outbound Delivery Notes.</p></div>
    </div>
    <div class="inventory-card">
      <table class="inventory-table"><thead><tr><th>Customer Name</th><th>Contact Person</th><th>Phone</th><th>Email</th><th>Default Delivery Location</th><th>Action</th></tr></thead><tbody>
        ${customers.map(customer => `<tr><td><strong>${escapeHtml(customer.customerName)}</strong></td><td>${escapeHtml(customer.contactPerson || "")}</td><td>${escapeHtml(customer.phone || "")}</td><td>${escapeHtml(customer.email || "")}</td><td>${escapeHtml(customer.defaultDeliveryLocation || "")}</td><td>${rowMenu([{label:"Edit",action:"edit-customer",id:customer.id},{label:"Delete",action:"delete-customer",id:customer.id,danger:true}])}</td></tr>`).join("") || `<tr><td colspan="6">No customers added.</td></tr>`}
      </tbody></table>
    </div>
  `;
}

function deliveryFormHtml(dn) {
  const customers = inventoryState.customers || [];
  const stock = inventoryState.dashboard.stock || [];
  return `
    <div class="form-grid">
      <label>DN No.<input id="dnNoInput" value="${escapeHtml(dn.dnNo)}"></label>
      <label>Date<input id="dnDateInput" placeholder="DD-MM-YYYY" value="${formatInventoryDate(dn.date)}"></label>
      <label>Customer Name<input id="customerNameInput" list="customerList" value="${escapeHtml(dn.customerName)}"></label>
      <label>Contact Person<input id="contactInput" value="${escapeHtml(dn.contactPerson)}"></label>
      <label>Phone<input id="phoneInput" value="${escapeHtml(dn.phone)}"></label>
      <label>Delivery Location<input id="locationInput" value="${escapeHtml(dn.deliveryLocation)}"></label>
      <label>Project Name<input id="projectInput" value="${escapeHtml(dn.projectName)}"></label>
    </div>
    <datalist id="customerList">${customers.map(c => `<option value="${escapeHtml(c.customerName)}"></option>`).join("")}</datalist>
    <datalist id="modelList">${stock.map(item => `<option value="${escapeHtml(item.modelNo)}">${escapeHtml(item.description)}</option>`).join("")}</datalist>
    <h3>Item Details</h3>
    <table class="inventory-table"><thead><tr><th>Model No.</th><th>Description</th><th>Available Qty</th><th>Qty Going Out</th><th>Action</th></tr></thead><tbody>
      ${(dn.lines || []).map((line, index) => `<tr><td><input list="modelList" data-delivery-model-line="${index}" value="${escapeHtml(line.modelNo)}"></td><td>${escapeHtml(line.description)}</td><td>${line.availableQty}</td><td><input type="number" min="1" max="${line.availableQty}" data-delivery-line="${index}" value="${line.qtyGoingOut}"></td><td><button class="danger-button" data-remove-delivery-line="${index}">Remove</button></td></tr>`).join("") || `<tr><td colspan="5">No items added.</td></tr>`}
    </tbody></table>
    <div class="inventory-actions" style="justify-content:flex-start"><button class="ghost-button" id="addDeliveryLineBtn">Add Row</button></div>
    <div class="inventory-actions"><button class="ghost-button" id="saveDraftBtn">Save Draft</button><button class="primary-button" id="issueDeliveryBtn">Create</button><button class="ghost-button" id="downloadDraftPdfBtn">Download PDF</button></div>
  `;
}

function stockViewHtml() {
  const stock = inventoryState.dashboard.stock || [];
  const modelMap = new Map((inventoryState.models || []).map(model => [norm(model.modelNo), model]));
  return `
    <div class="inventory-topbar">
      <div class="inventory-title"><h2>Stock</h2><p>Manage AC unit model master and view full stock details.</p></div>
      <div class="inventory-search"><input id="stockSearchInput" placeholder="Search model or description"><button class="primary-button" id="saveStockModelBtn">Save Model</button></div>
    </div>
    <div class="split-layout">
      <div class="inventory-card">
        <h3>Full Stock Details</h3>
        <table class="inventory-table"><thead><tr><th>Model No.</th><th>Description</th><th>Brand</th><th>Type</th><th>Current Qty</th><th>Action</th></tr></thead><tbody>
          ${stock.map(item => {
            const model = modelMap.get(norm(item.modelNo)) || {};
            return `<tr><td><strong>${escapeHtml(item.modelNo)}</strong></td><td>${escapeHtml(item.description)}</td><td>${escapeHtml(model.brand || "Daikin")}</td><td>${escapeHtml(model.type || "")}</td><td><button class="qty-link" data-stock-model="${escapeHtml(item.modelNo)}">${item.qty}</button></td><td>${rowMenu([{label:"Edit",action:"edit-stock-model",id:item.modelNo},{label:"Delete",action:"delete-stock-model",id:item.modelNo,danger:true}])}</td></tr>`;
          }).join("") || `<tr><td colspan="6">No models yet. Add a model manually.</td></tr>`}
        </tbody></table>
      </div>
      <div class="inventory-card">
        <h3>Add / Edit Model</h3>
        <div class="form-grid">
          <label>Model No.<input id="stockModelNo"></label>
          <label>Description<input id="stockDescription"></label>
          <label>Brand<input id="stockBrand" value="Daikin"></label>
          <label>Type<input id="stockType"></label>
          <label>Quantity<input id="stockQuantity" type="number" min="0" value="0"></label>
        </div>
        <p class="inventory-muted">Quantity sets the current available stock using a manual inventory adjustment.</p>
        <div class="inventory-actions"><button class="danger-button" id="deleteStockModelBtn">Delete Model</button><button class="ghost-button" id="clearStockModelBtn">Clear</button><button class="primary-button" id="saveStockModelBtn2">Save Model</button></div>
      </div>
    </div>
  `;
}

function bindInventoryEvents() {
  $("#customerNameInput")?.addEventListener("change", fillCustomerDetails);
  bindDeliveryResizer();
}

function rowMenu(items) {
  return `<div class="row-menu"><button class="menu-button inventory-menu-button" data-row-menu>...</button><div class="row-menu-list hidden">${items.map(item => `<button class="${item.danger ? "danger" : ""}" data-menu-action="${item.action}" data-menu-id="${escapeHtml(item.id)}">${escapeHtml(item.label)}</button>`).join("")}</div></div>`;
}

function handleInventoryClick(event) {
  const target = event.target.closest("button, .upload-zone");
  if (!target || !$("#inventoryRoot").contains(target)) return;
  if (target.dataset.rowMenu !== undefined) {
    const menu = target.closest(".row-menu").querySelector(".row-menu-list");
    document.querySelectorAll(".row-menu-list").forEach(list => {
      if (list !== menu) list.classList.add("hidden");
    });
    menu.classList.toggle("hidden");
    return;
  }
  if (target.dataset.menuAction) return handleInventoryMenuAction(target.dataset.menuAction, target.dataset.menuId);
  if (target.dataset.goInventory) return showInventory(target.dataset.goInventory);
  if (target.dataset.stockModel) return openStockPopup(target.dataset.stockModel);
  if (target.dataset.supplierPage) {
    supplierAllPage = Number(target.dataset.supplierPage);
    return renderInventory();
  }
  if (target.dataset.deliveryPage) {
    deliveryListPage = Number(target.dataset.deliveryPage);
    return refreshDeliveryNoteList();
  }
  if (target.id === "supplierUploadZone") return uploadSupplierDn();
  if (target.dataset.selectSupplier) {
    activeSupplierDnId = target.dataset.selectSupplier;
    return renderInventory();
  }
  if (target.dataset.removeSupplierLine) {
    const dn = activeSupplierDn();
    dn?.lines?.splice(Number(target.dataset.removeSupplierLine), 1);
    return renderInventory();
  }
  if (target.id === "addSupplierLineBtn") {
    const dn = activeSupplierDn();
    dn.lines.push({ id: String(Date.now()), modelNo: "", description: "", detectedQty: 0, finalQty: 0, status: "Check Needed" });
    return renderInventory();
  }
  if (target.id === "saveSupplierDnBtn") return saveActiveSupplierDn();
  if (target.id === "confirmSupplierDnBtn") return confirmActiveSupplierDn();
  if (target.id === "cancelSupplierDnBtn") return cancelActiveSupplierDn();
  if (target.id === "newDeliveryBtn") {
    deliveryDraft = newDeliveryDraft();
    return renderInventory();
  }
  if (target.id === "addCustomerBtn") return openCustomerModal();
  if (target.dataset.editDelivery) {
    const note = inventoryState.deliveryNotes.find(item => item.id === target.dataset.editDelivery);
    deliveryDraft = structuredClone(note);
    return renderInventory();
  }
  if (target.dataset.downloadDelivery) {
    const note = inventoryState.deliveryNotes.find(item => item.id === target.dataset.downloadDelivery);
    return downloadDeliveryPdf(note);
  }
  if (target.dataset.cancelDelivery) return cancelDeliveryNote(target.dataset.cancelDelivery);
  if (target.id === "addDeliveryLineBtn") return addDeliveryLine();
  if (target.dataset.removeDeliveryLine) {
    deliveryDraft.lines.splice(Number(target.dataset.removeDeliveryLine), 1);
    return renderInventory();
  }
  if (target.id === "saveDraftBtn") return saveDelivery("Draft");
  if (target.id === "issueDeliveryBtn") return saveDelivery("Issued");
  if (target.id === "downloadDraftPdfBtn") return downloadDeliveryPdf(collectDeliveryDraft("Draft"));
  if (target.id === "saveStockModelBtn" || target.id === "saveStockModelBtn2") return saveStockModel();
  if (target.id === "deleteStockModelBtn") return deleteStockModel();
  if (target.id === "clearStockModelBtn") return clearStockModelForm();
  if (target.dataset.editStockModel) return fillStockModelForm(target.dataset.editStockModel);
}

function handlePurchaseClick(event) {
  const target = event.target.closest("button");
  if (!target || !$("#purchaseOrdersRoot").contains(target)) return;
  if (target.dataset.rowMenu !== undefined) {
    const menu = target.closest(".row-menu").querySelector(".row-menu-list");
    document.querySelectorAll(".row-menu-list").forEach(list => {
      if (list !== menu) list.classList.add("hidden");
    });
    menu.classList.toggle("hidden");
    return;
  }
  if (target.dataset.menuAction) return handlePurchaseMenuAction(target.dataset.menuAction, target.dataset.menuId);
  if (target.id === "poAddSupplierBtn") return openPurchaseSupplierModal();
  if (target.id === "poAddItemBtn") {
    purchaseDraft.items.push(newPurchaseItem());
    return renderPurchaseOrders();
  }
  if (target.dataset.deletePoLine) {
    purchaseDraft.items.splice(Number(target.dataset.deletePoLine), 1);
    if (!purchaseDraft.items.length) purchaseDraft.items.push(newPurchaseItem());
    recalcPurchaseOrder(purchaseDraft);
    return renderPurchaseOrders();
  }
  if (target.id === "poSaveDraftBtn") return savePurchaseDraft(false);
  if (target.id === "poCreateBtn") return savePurchaseDraft(true);
  if (target.id === "poDownloadBtn") return downloadPurchasePdf(purchaseDraft);
}

function handlePurchaseMenuAction(action, idValue) {
  document.querySelectorAll(".row-menu-list").forEach(list => list.classList.add("hidden"));
  if (action === "edit-po") {
    const order = (purchaseState.orders || []).find(item => item.id === idValue);
    if (!order) return;
    purchaseDraft = structuredClone(order);
    return showPurchaseOrders("form");
  }
  if (action === "download-po") {
    const order = (purchaseState.orders || []).find(item => item.id === idValue);
    if (order) return downloadPurchasePdf(order);
  }
  if (action === "delete-po") return deletePurchaseOrder(idValue);
  if (action === "edit-po-supplier") {
    const supplier = (purchaseState.suppliers || []).find(item => item.id === idValue);
    if (supplier) return openPurchaseSupplierModal(supplier);
  }
  if (action === "delete-po-supplier") return deletePurchaseSupplier(idValue);
}

function handlePurchaseInput(event) {
  const input = event.target;
  if (input.id === "poSearchInput") {
    purchaseSearchQuery = input.value;
    return renderPurchaseOrders();
  }
  if (input.id === "poSupplierSearchInput") {
    purchaseSupplierSearchQuery = input.value;
    return renderPurchaseOrders();
  }
  if (!purchaseDraft) return;
  if (input.dataset.poPaymentCustomInline !== undefined) {
    purchaseDraft.paymentTerms = input.value;
    return;
  }
  if (input.dataset.poSubtotal !== undefined) {
    purchaseDraft.manualSubtotal = input.value;
    refreshPurchaseTotals();
    return;
  }
  if (input.dataset.poField) {
    const key = input.dataset.poField;
    purchaseDraft[key] = key.toLowerCase().includes("date") ? parseInventoryDate(input.value) : input.value;
    return;
  }
  if (input.dataset.poLine) {
    const line = purchaseDraft.items[Number(input.dataset.poLine)];
    if (!line) return;
    const field = input.dataset.field;
    line[field] = ["qty", "unitPrice", "vatPercent"].includes(field) ? Number(input.value || 0) : input.value;
    refreshPurchaseTotals();
  }
}

async function uploadPurchaseQuotation() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,.doc,.docx,.png,.jpg,.jpeg";
  input.addEventListener("change", async () => {
    if (!input.files[0]) return;
    const form = new FormData();
    form.append("file", input.files[0]);
    toast("Scanning quotation...");
    const result = await api("/api/purchase-orders/upload-quotation", { method: "POST", body: form });
    purchaseDraft = { ...newPurchaseDraft(), ...(result.order || {}) };
    if (!String(purchaseDraft.notes || "").trim()) purchaseDraft.notes = defaultPurchaseNotes;
    if (!purchaseDraft.items || !purchaseDraft.items.length) purchaseDraft.items = [newPurchaseItem()];
    recalcPurchaseOrder(purchaseDraft);
    purchaseScreen = "form";
    await loadPurchaseOrders();
    renderPurchaseOrders();
    toast(result.message || "Quotation scanned. Review and edit the PO form.");
  });
  input.value = "";
  input.click();
}

async function savePurchaseDraft(createOfficial) {
  if (!purchaseDraft.supplierName.trim()) return alert("Supplier Name is required.");
  purchaseDraft.items = (purchaseDraft.items || []).filter(item => item.description || item.modelNo || Number(item.qty || 0) || Number(item.unitPrice || 0));
  if (!purchaseDraft.items.length) return alert("Add at least one item.");
  recalcPurchaseOrder(purchaseDraft);
  const result = await api("/api/purchase-orders", {
    method: "POST",
    body: JSON.stringify({ order: purchaseDraft, createOfficial })
  });
  purchaseState = result.state;
  purchaseDraft = result.order;
  renderPurchaseOrders();
  toast(createOfficial ? "Purchase Order created" : "Draft saved");
}

async function deletePurchaseOrder(orderId) {
  if (!confirm("Delete this Purchase Order?")) return;
  purchaseState = await api(`/api/purchase-orders/${encodeURIComponent(orderId)}`, { method: "DELETE" });
  if (purchaseDraft?.id === orderId) purchaseDraft = newPurchaseDraft();
  renderPurchaseOrders();
  toast("Purchase Order deleted");
}

async function downloadPurchasePdf(order) {
  if (!order || order.status !== "Created" || !order.poNo) {
    return alert("Create the Purchase Order first, then download PDF.");
  }
  const blob = await api("/api/purchase-orders/pdf", { method: "POST", body: JSON.stringify({ order }) });
  downloadBlob(blob, `${safeFile(`${order.poNo}-${order.supplierName || "Supplier"}`)}.pdf`);
}

function handleInventoryMenuAction(action, idValue) {
  document.querySelectorAll(".row-menu-list").forEach(list => list.classList.add("hidden"));
  if (action === "view-supplier") {
    activeSupplierDnId = "";
    return renderInventory();
  }
  if (action === "edit-supplier" || action === "select-supplier") {
    const dn = inventoryState.supplierDns.find(item => item.id === idValue);
    if (dn?.isManualAdjustment) {
      activeSupplierDnId = "";
      return renderInventory();
    }
    activeSupplierDnId = idValue;
    if (inventoryScreen === "supplierAll") return showInventory("supplier");
    return renderInventory();
  }
  if (action === "cancel-supplier") {
    activeSupplierDnId = idValue;
    return cancelActiveSupplierDn();
  }
  if (action === "delete-supplier") return deleteSupplierDn(idValue);
  if (action === "edit-delivery") {
    const note = inventoryState.deliveryNotes.find(item => item.id === idValue);
    deliveryDraft = structuredClone(note);
    return renderInventory();
  }
  if (action === "download-delivery") {
    const note = inventoryState.deliveryNotes.find(item => item.id === idValue);
    return downloadDeliveryPdf(note);
  }
  if (action === "cancel-delivery") return cancelDeliveryNote(idValue);
  if (action === "delete-delivery") return deleteDeliveryNote(idValue);
  if (action === "edit-customer") {
    const customer = inventoryState.customers.find(item => item.id === idValue);
    return openCustomerModal(customer);
  }
  if (action === "delete-customer") return deleteCustomer(idValue);
  if (action === "edit-stock-model") return fillStockModelForm(idValue);
  if (action === "delete-stock-model") {
    fillStockModelForm(idValue);
    return deleteStockModel();
  }
}

function handleInventoryInput(event) {
  const input = event.target;
  if (input.id === "stockSearchInput") return filterInventoryTable(input.value);
  if (input.id === "deliverySearchInput") {
    deliverySearchQuery = input.value;
    deliveryListPage = 1;
    return refreshDeliveryNoteList();
  }
  if (input.id === "supplierSearchInput") return filterScopedTable(".supplier-dn-table", input.value);
  if (input.id === "supplierAllSearchInput") return filterScopedTable(".supplier-dn-all-table", input.value);
  if (input.dataset.supplierField) {
    const dn = activeSupplierDn();
    if (dn) dn[input.dataset.supplierField] = input.dataset.supplierField === "uploadedDate" ? parseInventoryDate(input.value) : input.value;
  }
  if (input.dataset.supplierLine) {
    const dn = activeSupplierDn();
    const line = dn?.lines?.[Number(input.dataset.supplierLine)];
    if (!line) return;
    line[input.dataset.field] = input.dataset.field.includes("Qty") ? Number(input.value || 0) : input.textContent || input.value;
    if (input.dataset.field === "finalQty") line.status = Number(line.finalQty) === Number(line.detectedQty) ? "Ready" : "Edited";
  }
  if (input.dataset.deliveryLine) {
    const line = deliveryDraft.lines[Number(input.dataset.deliveryLine)];
    if (!line) return;
    line.qtyGoingOut = Math.min(Number(input.value || 0), Number(line.availableQty || 0));
    input.value = line.qtyGoingOut;
  }
  if (input.dataset.deliveryModelLine) {
    updateDeliveryLineModel(Number(input.dataset.deliveryModelLine), input.value);
  }
}

function bindDeliveryResizer() {
  const split = $("#deliverySplit");
  const resizer = $("#deliverySplitResizer");
  if (!split || !resizer) return;
  deliveryPanelWidth = clampDeliveryPanelWidth(deliveryPanelWidth, split);
  split.style.setProperty("--delivery-panel-width", `${deliveryPanelWidth}px`);
  resizer.addEventListener("pointerdown", event => {
    startDeliveryResize(event.clientX);
    event.preventDefault();
  });
  resizer.addEventListener("mousedown", event => {
    startDeliveryResize(event.clientX);
    event.preventDefault();
  });
}

function startDeliveryResize(clientX) {
  deliveryResize = { startX: clientX, startWidth: deliveryPanelWidth };
  document.body.classList.add("resizing-delivery");
}

function handleDeliveryResizeMove(event) {
  if (!deliveryResize) return;
  const split = $("#deliverySplit");
  if (!split) return;
  const nextWidth = deliveryResize.startWidth - (event.clientX - deliveryResize.startX);
  deliveryPanelWidth = clampDeliveryPanelWidth(nextWidth, split);
  split.style.setProperty("--delivery-panel-width", `${deliveryPanelWidth}px`);
  event.preventDefault();
}

function stopDeliveryResize() {
  if (!deliveryResize) return;
  deliveryResize = null;
  document.body.classList.remove("resizing-delivery");
  localStorage.setItem("deliveryPanelWidth", String(Math.round(deliveryPanelWidth)));
}

function clampDeliveryPanelWidth(width, split = $("#deliverySplit")) {
  const minRight = 380;
  const minLeft = 360;
  const dividerAndGaps = 36;
  const available = split?.clientWidth || window.innerWidth;
  const maxRight = Math.max(minRight, available - minLeft - dividerAndGaps);
  return Math.max(minRight, Math.min(maxRight, Number(width || 430)));
}

function activeSupplierDn() {
  return inventoryState.supplierDns.find(dn => dn.id === activeSupplierDnId) || inventoryState.supplierDns[0];
}

async function uploadSupplierDn() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,.png,.jpg,.jpeg";
  input.addEventListener("change", async () => {
    if (!input.files[0]) return;
    const form = new FormData();
    form.append("file", input.files[0]);
    const result = await api("/api/inventory/supplier-dns/upload", { method: "POST", body: form });
    inventoryState = result;
    activeSupplierDnId = result.activeSupplierDnId;
    inventoryScreen = "supplier";
    renderInventory();
  });
  input.click();
}

async function saveActiveSupplierDn() {
  const dn = activeSupplierDn();
  inventoryState = await api("/api/inventory/supplier-dns", { method: "POST", body: JSON.stringify(dn) });
  activeSupplierDnId = dn.id;
  renderInventory();
  toast("Supplier DN saved");
}

async function confirmActiveSupplierDn() {
  const dn = activeSupplierDn();
  await saveActiveSupplierDn();
  const missing = dn.lines.filter(line => !inventoryState.models.some(model => norm(model.modelNo) === norm(line.modelNo)));
  if (missing.length && !confirm(`${missing.length} model(s) are not in Model Master. Add them and confirm stock?`)) return;
  inventoryState = await api(`/api/inventory/supplier-dns/${dn.id}/confirm`, { method: "POST", body: "{}" });
  renderInventory();
  toast("Stock updated");
}

async function cancelActiveSupplierDn() {
  const dn = activeSupplierDn();
  if (!dn || !confirm("Cancel this Supplier DN and reverse its stock effect?")) return;
  inventoryState = await api(`/api/inventory/supplier-dns/${dn.id}/cancel`, { method: "POST", body: "{}" });
  activeSupplierDnId = "";
  renderInventory();
}

async function deleteSupplierDn(supplierDnId) {
  if (!confirm("Delete this Supplier DN? This removes the record.")) return;
  inventoryState = await api(`/api/inventory/supplier-dns/${supplierDnId}`, { method: "DELETE" });
  if (activeSupplierDnId === supplierDnId) activeSupplierDnId = "";
  renderInventory();
  toast("Supplier DN deleted");
}

function newDeliveryDraft() {
  return {
    id: "",
    dnNo: inventoryState?.settings?.nextDeliveryNo || "DN-2057",
    date: new Date().toISOString().slice(0, 10),
    customerName: "",
    contactPerson: "",
    phone: "",
    deliveryLocation: "",
    projectName: "",
    status: "Draft",
    lines: []
  };
}

function collectDeliveryDraft(status) {
  const lines = (deliveryDraft.lines || []).filter(line => line.modelNo);
  return {
    ...deliveryDraft,
    dnNo: $("#dnNoInput")?.value || deliveryDraft.dnNo,
    date: parseInventoryDate($("#dnDateInput")?.value || deliveryDraft.date),
    customerName: $("#customerNameInput")?.value || deliveryDraft.customerName,
    contactPerson: $("#contactInput")?.value || deliveryDraft.contactPerson,
    phone: $("#phoneInput")?.value || deliveryDraft.phone,
    deliveryLocation: $("#locationInput")?.value || deliveryDraft.deliveryLocation,
    projectName: $("#projectInput")?.value || deliveryDraft.projectName,
    lines,
    status
  };
}

function fillCustomerDetails() {
  const name = $("#customerNameInput").value;
  const customer = inventoryState.customers.find(c => c.customerName === name);
  if (!customer) {
    if (name && confirm("Customer not found. Add New Customer?")) {
      api("/api/inventory/customers", { method: "POST", body: JSON.stringify({ customerName: name }) }).then(next => {
        inventoryState = next;
        renderInventory();
      });
    }
    return;
  }
  $("#contactInput").value = customer.contactPerson || "";
  $("#phoneInput").value = customer.phone || "";
  $("#locationInput").value = customer.defaultDeliveryLocation || "";
}

function openCustomerModal(customer = null) {
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal">
      <div class="inventory-topbar">
        <div><h2>${customer ? "Edit Customer" : "Add Customer"}</h2><p class="inventory-muted">Create a customer for Delivery Notes.</p></div>
        <button class="mini-button" data-close-customer-modal>Close</button>
      </div>
      <div class="form-grid">
        <label>Customer Name<input id="newCustomerName" value="${escapeHtml(customer?.customerName || "")}"></label>
        <label>Contact Person<input id="newCustomerContact" value="${escapeHtml(customer?.contactPerson || "")}"></label>
        <label>Phone<input id="newCustomerPhone" value="${escapeHtml(customer?.phone || "")}"></label>
        <label>Email<input id="newCustomerEmail" type="email" value="${escapeHtml(customer?.email || "")}"></label>
        <label>Address<input id="newCustomerAddress" value="${escapeHtml(customer?.address || "")}"></label>
        <label>Default Delivery Location<input id="newCustomerLocation" value="${escapeHtml(customer?.defaultDeliveryLocation || "")}"></label>
      </div>
      <div class="inventory-actions">
        <button class="ghost-button" data-close-customer-modal>Cancel</button>
        <button class="primary-button" id="saveCustomerBtn">Save Customer</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelectorAll("[data-close-customer-modal]").forEach(button => {
    button.addEventListener("click", () => modal.remove());
  });
  modal.querySelector("#saveCustomerBtn").addEventListener("click", () => saveCustomerFromModal(modal, customer?.id || ""));
}

async function saveCustomerFromModal(modal, customerId = "") {
  const payload = {
    id: customerId,
    customerName: modal.querySelector("#newCustomerName")?.value.trim(),
    contactPerson: modal.querySelector("#newCustomerContact")?.value.trim(),
    phone: modal.querySelector("#newCustomerPhone")?.value.trim(),
    email: modal.querySelector("#newCustomerEmail")?.value.trim(),
    address: modal.querySelector("#newCustomerAddress")?.value.trim(),
    defaultDeliveryLocation: modal.querySelector("#newCustomerLocation")?.value.trim()
  };
  if (!payload.customerName) return alert("Customer Name is required.");
  if (inventoryScreen === "delivery" && deliveryDraft) deliveryDraft = collectDeliveryDraft(deliveryDraft.status || "Draft");
  inventoryState = await api("/api/inventory/customers", { method: "POST", body: JSON.stringify(payload) });
  if (inventoryScreen === "delivery" && deliveryDraft && !deliveryDraft.customerName) {
    deliveryDraft.customerName = payload.customerName;
    deliveryDraft.contactPerson = payload.contactPerson || "";
    deliveryDraft.phone = payload.phone || "";
    deliveryDraft.deliveryLocation = payload.defaultDeliveryLocation || "";
  }
  modal.remove();
  renderInventory();
  toast("Customer saved");
}

async function deleteCustomer(customerId) {
  const customer = inventoryState.customers.find(item => item.id === customerId);
  if (!customer) return;
  if (!confirm(`Delete customer ${customer.customerName}?`)) return;
  inventoryState = await api(`/api/inventory/customers/${encodeURIComponent(customerId)}`, { method: "DELETE" });
  renderInventory();
  toast("Customer deleted");
}

function addDeliveryLine() {
  deliveryDraft = collectDeliveryDraft(deliveryDraft.status || "Draft");
  deliveryDraft.lines.push({ id: String(Date.now()), modelNo: "", description: "", availableQty: 0, qtyGoingOut: 1 });
  renderInventory();
}

function updateDeliveryLineModel(index, value) {
  const line = deliveryDraft?.lines?.[index];
  if (!line) return;
  const typedModel = value.trim().toUpperCase();
  const stock = inventoryState.dashboard.stock.find(item => norm(item.modelNo) === norm(typedModel));
  line.modelNo = typedModel;
  if (!stock) {
    line.description = "";
    line.availableQty = 0;
    line.qtyGoingOut = Math.max(1, Number(line.qtyGoingOut || 1));
    return;
  }
  line.modelNo = stock.modelNo;
  line.description = stock.description || "";
  line.availableQty = Number(stock.qty || 0);
  line.qtyGoingOut = Math.min(Math.max(1, Number(line.qtyGoingOut || 1)), line.availableQty);
  renderInventory();
}

async function saveDelivery(status) {
  const note = collectDeliveryDraft(status);
  note.lines = note.lines.filter(line => line.modelNo && Number(line.qtyGoingOut || 0) > 0);
  if (!note.customerName) return alert("Customer name is required.");
  if (!note.lines.length) return alert("Add at least one model.");
  const overQtyLine = note.lines.find(line => Number(line.qtyGoingOut || 0) > Number(line.availableQty || 0));
  if (overQtyLine) return alert(`Qty Going Out cannot be more than Available Qty for ${overQtyLine.modelNo}.`);
  inventoryState = await api("/api/inventory/delivery-notes", { method: "POST", body: JSON.stringify(note) });
  deliveryDraft = newDeliveryDraft();
  deliverySearchQuery = "";
  deliveryListPage = 1;
  renderInventory();
  toast(status === "Issued" ? "Delivery Note issued and stock reduced" : "Draft saved");
}

async function cancelDeliveryNote(deliveryNoteId) {
  if (!confirm("Cancel this Delivery Note? If issued, stock will be returned.")) return;
  inventoryState = await api(`/api/inventory/delivery-notes/${deliveryNoteId}/cancel`, { method: "POST", body: "{}" });
  renderInventory();
}

async function deleteDeliveryNote(deliveryNoteId) {
  if (!confirm("Delete this Delivery Note? This removes the record.")) return;
  inventoryState = await api(`/api/inventory/delivery-notes/${deliveryNoteId}`, { method: "DELETE" });
  deliveryDraft = newDeliveryDraft();
  renderInventory();
  toast("Delivery Note deleted");
}

async function downloadDeliveryPdf(note) {
  const blob = await api("/api/inventory/delivery-note-pdf", { method: "POST", body: JSON.stringify({ deliveryNote: note }) });
  downloadBlob(blob, `${safeFile(note.dnNo || "delivery-note")}.pdf`);
}

function openStockPopup(modelNo) {
  const stock = inventoryState.dashboard.stock.find(item => norm(item.modelNo) === norm(modelNo));
  const lots = inventoryState.dashboard.lots.filter(lot => norm(lot.modelNo) === norm(modelNo));
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `<div class="modal"><div class="inventory-topbar"><div><h2>Stock Details - ${escapeHtml(stock.modelNo)}</h2><p>${escapeHtml(stock.description)}</p></div><button class="mini-button" data-close-modal>Close</button></div><p><strong>Total Available Qty</strong> <span class="qty-link">${stock.qty}</span></p><table class="inventory-table"><thead><tr><th>Received Date</th><th>Project Name</th><th>Supplier DN No.</th><th>Received Qty</th><th>Delivered Qty</th><th>Available Qty</th></tr></thead><tbody>${lots.map(lot => `<tr><td>${formatInventoryDate(lot.date)}</td><td>${escapeHtml(lot.projectName)}</td><td>${escapeHtml(lot.supplierDnNo)}</td><td>${lot.receivedQty}</td><td>${lot.deliveredQty}</td><td>${lot.availableQty}</td></tr>`).join("") || `<tr><td colspan="6">No receipt breakdown.</td></tr>`}</tbody></table></div>`;
  document.body.appendChild(modal);
  modal.querySelector("[data-close-modal]").addEventListener("click", () => modal.remove());
}

function fillStockModelForm(modelNo) {
  const model = inventoryState.models.find(item => norm(item.modelNo) === norm(modelNo));
  const stock = inventoryState.dashboard.stock.find(item => norm(item.modelNo) === norm(modelNo));
  $("#stockModelNo").value = model?.modelNo || stock?.modelNo || "";
  $("#stockDescription").value = model?.description || stock?.description || "";
  $("#stockBrand").value = model?.brand || "Daikin";
  $("#stockType").value = model?.type || "";
  $("#stockQuantity").value = stock?.qty || 0;
}

function clearStockModelForm() {
  ["stockModelNo", "stockDescription", "stockType"].forEach(id => {
    const el = $(`#${id}`);
    if (el) el.value = "";
  });
  $("#stockBrand").value = "Daikin";
  $("#stockQuantity").value = 0;
}

async function saveStockModel() {
  const payload = {
    modelNo: $("#stockModelNo")?.value.trim().toUpperCase(),
    description: $("#stockDescription")?.value.trim(),
    brand: $("#stockBrand")?.value.trim() || "Daikin",
    type: $("#stockType")?.value.trim(),
    quantity: Number($("#stockQuantity")?.value || 0)
  };
  if (!payload.modelNo) return alert("Model No. is required.");
  inventoryState = await api("/api/inventory/models", { method: "POST", body: JSON.stringify(payload) });
  renderInventory();
  toast("Model saved");
}

async function deleteStockModel() {
  const modelNo = $("#stockModelNo")?.value.trim().toUpperCase();
  if (!modelNo) return alert("Select a model to delete.");
  if (!confirm(`Delete model ${modelNo}? Manual stock entries for this model will also be removed.`)) return;
  inventoryState = await api(`/api/inventory/models/${encodeURIComponent(modelNo)}`, { method: "DELETE" });
  clearStockModelForm();
  renderInventory();
  toast("Model deleted");
}

function filterInventoryTable(query) {
  const q = String(query || "").toLowerCase();
  document.querySelectorAll(".inventory-table tbody tr").forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(q) ? "" : "none";
  });
}

function filterScopedTable(selector, query) {
  const q = String(query || "").toLowerCase();
  document.querySelectorAll(`${selector} tbody tr`).forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(q) ? "" : "none";
  });
}

function statusPill(status) {
  const s = status || "Draft";
  const color = s === "Confirmed" || s === "Issued" || s === "Ready" || s === "Created" ? "green" : s === "Cancelled" ? "red" : s === "Review Needed" || s === "Check Needed" ? "orange" : "gray";
  return `<span class="pill ${color}">${escapeHtml(s)}</span>`;
}

function sumSupplierQty(dn) {
  return (dn.lines || []).reduce((sum, line) => sum + Number(line.finalQty || 0), 0);
}

function sumDeliveryQty(dn) {
  return (dn.lines || []).reduce((sum, line) => sum + Number(line.qtyGoingOut || 0), 0);
}

function formatInventoryDate(value) {
  const text = String(value || "").trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  const dmy = text.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (dmy) return `${dmy[1]}-${dmy[2]}-${dmy[3]}`;
  return escapeHtml(text);
}

function parseInventoryDate(value) {
  const text = String(value || "").trim();
  const dmy = text.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return text;
}

function fileBody(node) {
  const wrap = document.createElement("div");
  const upload = findUpload(node.data.uploadId);
  wrap.appendChild(uploadCard("Supporting_File.pdf", upload));
  const actions = div("node-actions");
  actions.innerHTML = `<button data-action="upload">Upload</button><button data-action="preview">Preview</button>`;
  wrap.appendChild(actions);
  actions.querySelector('[data-action="upload"]').addEventListener("click", () => chooseUpload(node.id));
  actions.querySelector('[data-action="preview"]').addEventListener("click", () => previewUpload(node));
  return wrap;
}

function openThermalChat() {
  $("#chatPanel").classList.remove("hidden");
  $("#chatLog").innerHTML = "";
  addChat("Upload the thermal sheet PDF or a zoomed screenshot here.");
  addChat("I will scan the uploaded file with OpenAI vision, show detected capacity source options, then write the extracted preview directly into the Export File table.");
  addChat("If a value is unclear, upload one or more zoomed screenshots here and click Extract Table again.");
  thermalUploadIds().forEach(uploadId => {
    const upload = findUpload(uploadId);
    if (upload) addChatFile(upload);
  });
}

function addChat(message) {
  const bubble = div("bubble");
  bubble.textContent = message;
  $("#chatLog").appendChild(bubble);
  $("#chatLog").scrollTop = $("#chatLog").scrollHeight;
}

function addChatFile(upload) {
  const bubble = div("bubble");
  bubble.innerHTML = `<strong>${escapeHtml(upload.originalName)}</strong><br>${prettyBytes(upload.size)} uploaded`;
  $("#chatLog").appendChild(bubble);
  $("#chatLog").scrollTop = $("#chatLog").scrollHeight;
}

function addThermalSampleRows() {
  state.tables.thermal.rows = [];
  buildVrvSchedule();
  addChat("Headers are visible now. No values were inserted because sample/demo values are disabled.");
  render();
}

async function uploadThermalFromChat() {
  const input = $("#thermalFileInput");
  if (!input.files[0]) return;
  await ensureProjectSaved({ hidden: true });
  const form = new FormData();
  const isFirst = !thermalUploadIds().length;
  form.append("nodeId", isFirst ? "thermal-upload" : "thermal-screenshot");
  form.append("file", input.files[0]);
  const upload = await api(`/api/projects/${state.id}/uploads`, { method: "POST", body: form });
  const project = await api(`/api/projects/${state.id}`);
  state.uploads = project.uploads;
  state.nodes = project.nodes;
  state.thermalChatUploadIds = [...new Set([...(state.thermalChatUploadIds || []), upload.id])];
  addChatFile(upload);
  addChat("Scanning uploaded thermal file with OpenAI vision...");
  const scan = await scanThermal(true);
  applyThermalScanOptions(scan);
  addChat(scan.message || "Scan complete. Select capacity source/model, then click Extract Table.");
  input.value = "";
  render();
  saveProject();
}

function selectedFamilyModel() {
  const selected = $("#familyModelSelect").value;
  if (selected === "Other") return $("#customFamilyModelInput").value.trim() || "Other";
  return selected;
}

async function extractThermalFromChat() {
  if (!thermalUploadIds().length) {
    addChat("Please upload a thermal sheet PDF or screenshot first.");
    return;
  }
  addChat(`Selected ${$("#capacitySourceSelect").value} and ${selectedFamilyModel()}.`);
  addChat("Extracting values into the Export File table...");
  const extracted = await scanThermal(false);
  applyThermalScanOptions(extracted);
  if (extracted.rows && extracted.rows.length) {
    state.tables.thermal.rows = extracted.rows;
    buildVrvSchedule();
    autoLayoutWorkflow();
    addChat(extracted.message || "Preview table is ready in the Export File table. Please verify and edit there before downloading Excel.");
    if (extracted.unclearFields && extracted.unclearFields.length) {
      addChat(`Unable to read clearly: ${extracted.unclearFields.join(", ")}. Upload a higher-resolution or zoomed screenshot.`);
    }
  } else {
    addChat(extracted.message || "No rows were extracted. Upload a clearer screenshot and try again.");
  }
  render();
  saveProject();
}

async function scanThermal(previewOnly) {
  return api(`/api/projects/${state.id}/extract/thermal-vision`, {
    method: "POST",
    body: JSON.stringify({
      uploadIds: thermalUploadIds(),
      capacitySource: $("#capacitySourceSelect").value,
      familyModel: selectedFamilyModel(),
      previewOnly
    })
  });
}

function applyThermalScanOptions(result) {
  if (result.capacitySources && result.capacitySources.length) {
    const select = $("#capacitySourceSelect");
    const current = select.value;
    select.innerHTML = result.capacitySources.map(source => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`).join("");
    select.value = result.capacitySources.includes(current) ? current : result.capacitySources[0];
  }
}

function thermalUploadIds() {
  const nodeUploadId = state.nodes.find(node => node.id === "thermal-upload")?.data?.uploadId;
  return [...new Set([nodeUploadId, ...(state.thermalChatUploadIds || [])].filter(Boolean))];
}

async function chooseUpload(nodeId) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg";
  input.addEventListener("change", async () => {
    if (!input.files[0]) return;
    await ensureProjectSaved({ hidden: true });
    const form = new FormData();
    form.append("nodeId", nodeId);
    form.append("file", input.files[0]);
    const upload = await api(`/api/projects/${state.id}/uploads`, { method: "POST", body: form });
    const project = await api(`/api/projects/${state.id}`);
    state.uploads = project.uploads;
    state.nodes = project.nodes;
    if (nodeId === "vrv-upload" && !state.details.project) {
      state.details.project = projectNameFromFile(upload.originalName);
      state.title = state.details.project;
    }
    if (nodeId === "vrv-upload") {
      await extractVrvUpload(upload.id);
    }
    render();
    saveProject();
  });
  input.value = "";
  input.click();
}

async function extractVrvUpload(uploadId) {
  const extracted = await api(`/api/projects/${state.id}/extract/vrv`, {
    method: "POST",
    body: JSON.stringify({ uploadId })
  });
  state.extracted = state.extracted || {};
  state.extracted.vrv = extracted;
  if (extracted.projectName && !state.details.project) state.details.project = extracted.projectName;
  if (extracted.materialRows && extracted.materialRows.length) {
    buildCosting(extracted.materialRows.map(row => [row.model, row.qty]));
    buildBoqFromCosting();
  } else {
    state.tables.costing.rows = [];
    state.tables.boq.rows = [];
    recalcCosting();
    recalcBoq();
  }
  if (extracted.vrvRows && extracted.vrvRows.length) {
    buildVrvSchedule(extracted.vrvRows);
  } else {
    state.tables.vrvSchedule.rows = [];
  }
  autoLayoutWorkflow();
  toast(extracted.message || "VRV extraction completed");
}

function projectNameFromFile(name) {
  const match = name.match(/VRVSelectionReport-(.*?)-\s*\(/i);
  return match ? match[1].trim() : name.replace(/\.[^.]+$/, "");
}

function generateWorkflow() {
  if (!state.priceList.items.length) state.priceList.items = structuredClone(samplePriceItems);
  const vrv = state.extracted && state.extracted.vrv;
  if (vrv?.materialRows?.length) {
    buildCosting(vrv.materialRows.map(row => [row.model, row.qty]));
    buildBoqFromCosting();
  }
  if (vrv?.vrvRows?.length) buildVrvSchedule(vrv.vrvRows);
  autoLayoutWorkflow();
  render();
  saveProject();
}

function buildCosting(materialRows) {
  const cols = state.tables.costing.columns;
  const lookup = new Map(state.priceList.items.map(item => [norm(item.model), item]));
  state.tables.costing.rows = materialRows.map(([model, qty], index) => {
    const item = lookup.get(norm(model));
    return {
      "S.No": index + 1,
      Model: model,
      Qty: qty,
      TR: item ? item.tr || 0 : "",
      "List Price": item ? item.listPrice : "",
      Multiplier: item ? item.multiplier : "",
      Cost: "",
      Amount: "",
      "Selling Price / Unit": ""
    };
  });
  recalcCosting();
  state.tables.costing.columns = cols;
}

function recalcCosting() {
  const summary = state.tables.costing.summary || { margin: 0.1 };
  const margin = Number(summary.margin ?? 0.1);
  let totalTR = 0;
  let totalCost = 0;
  state.tables.costing.rows.forEach((row, index) => {
    row["S.No"] = index + 1;
    const qty = num(row.Qty);
    const tr = num(row.TR);
    const list = num(row["List Price"]);
    const multiplier = num(row.Multiplier);
    const cost = list && multiplier ? list * multiplier : num(row.Cost);
    const amount = cost * qty;
    row.Cost = cost ? round2(cost) : "";
    row.Amount = amount ? round2(amount) : "";
    row["Selling Price / Unit"] = cost ? round2(cost * (1 + margin)) : "";
    totalTR += tr * qty;
    totalCost += amount;
  });
  summary.totalTR = round2(totalTR);
  summary.totalCost = round2(totalCost);
  summary.margin = margin;
  summary.sellingPrice = round2(totalCost * (1 + margin));
  summary.profit = round2(summary.sellingPrice - totalCost);
  summary.pricePerTon = totalTR ? round2(summary.sellingPrice / totalTR) : 0;
  state.tables.costing.summary = summary;
}

function buildBoqFromCosting() {
  const lookup = new Map(state.priceList.items.map(item => [norm(item.model), item]));
  state.tables.boq.rows = state.tables.costing.rows.map((row, index) => {
    const item = lookup.get(norm(row.Model));
    return {
      "S.No": index + 1,
      Description: item ? item.boqDescription : row.Model,
      Qty: row.Qty,
      Unit: "Nos"
    };
  });
  recalcBoq();
}

function recalcBoq() {
  const total = Number(state.tables.costing.summary?.sellingPrice || 0);
  state.tables.boq.summary = {
    total: round2(total),
    vat: round2(total * 0.05),
    netAmount: round2(total * 1.05)
  };
}

function buildVrvSchedule(sourceRows) {
  const thermalMap = new Map(state.tables.thermal.rows.map(row => [norm(row.Indoor), row]));
  const indoorMap = new Map(state.lookup.indoorData.map(item => [norm(item.fcu), item]));
  const outdoorMap = new Map(state.lookup.outdoorData.map(item => [norm(item.model), item]));
  const rows = sourceRows || state.extracted?.vrv?.vrvRows || [];
  const output = [];
  let previousSystem = "";
  rows.forEach(item => {
    if (previousSystem && item.system !== previousSystem) {
      output.push(emptyVrvSeparatorRow());
    }
    const thermal = thermalMap.get(norm(item.name)) || {};
    const indoor = indoorMap.get(norm(item.fcu)) || {};
    const outdoor = outdoorMap.get(norm(item.outdoorModel)) || {};
    output.push(vrvRow(item, thermal, indoor, outdoor));
    previousSystem = item.system;
  });
  state.tables.vrvSchedule.rows = output;
}

function emptyVrvSeparatorRow() {
  return Object.fromEntries(state.tables.vrvSchedule.columns.map(column => [column, ""]));
}

function fillVrvScheduleLookups() {
  const indoorMap = new Map(state.lookup.indoorData.map(item => [norm(item.fcu), item]));
  const outdoorMap = new Map(state.lookup.outdoorData.map(item => [norm(item.model), item]));
  state.tables.vrvSchedule.rows = state.tables.vrvSchedule.rows.map(row => {
    const indoor = indoorMap.get(norm(row.FCU)) || {};
    const outdoor = outdoorMap.get(norm(row["Outdoor Model"])) || {};
    return { ...row, ...indoorFields(indoor), ...outdoorFields(outdoor) };
  });
}

function vrvRow(item, thermal, indoor, outdoor) {
  return {
    System: item.system,
    Name: item.name,
    Location: thermal.Room || "",
    "Rq TC": thermal["Tot Cool Cap"] || "",
    "Rq SC": thermal["Sens Cool Cap"] || "",
    "Air Flow Rate": thermal["Air Flow Rate"] || "",
    FCU: item.fcu,
    ...indoorFields(indoor),
    "Outdoor Name": item.outdoorName,
    "Outdoor Model": item.outdoorModel,
    ...outdoorFields(outdoor)
  };
}

function indoorFields(indoor) {
  return {
    "Nominal Index": indoor.nominalIndex || "",
    "Country of Origin": indoor.origin || "",
    Type: indoor.type || "",
    "Ambient - On Coil Temperature": indoor.ambient || "",
    "Max TC": indoor.maxTC || "",
    "Max SC": indoor.maxSC || "",
    "Proposed Air Flow Rate": indoor.airflow || "",
    PIC: indoor.pic || "",
    Sound: indoor.sound || "",
    PS: indoor.ps || "",
    MCA: indoor.mca || "",
    WxHxD: indoor.wxhxd || "",
    Weight: indoor.weight || ""
  };
}

function outdoorFields(outdoor) {
  return {
    "Outdoor Nominal Index": outdoor.nominalIndex || "",
    "Ambient Temp": outdoor.ambient || "",
    CC: outdoor.cc || "",
    "PI ESMA": outdoor.piEsma || "",
    "Outdoor PS": outdoor.ps || "",
    "Outdoor MCA": outdoor.mca || "",
    MOP: outdoor.mop || "",
    RLA: outdoor.rla || "",
    "Outdoor WxHxD": outdoor.wxhxd || "",
    "Outdoor Weight": outdoor.weight || ""
  };
}

function regenerate(type) {
  if (type === "thermalTable") state.tables.thermal.rows = [];
  if (type === "costingTable") {
    const rows = state.extracted?.vrv?.materialRows || [];
    buildCosting(rows.map(row => [row.model, row.qty]));
  }
  if (type === "boqTable") buildBoqFromCosting();
  if (type === "vrvSchedule") buildVrvSchedule();
  autoLayoutWorkflow();
  render();
  saveProject();
}

function deleteNodeData(node) {
  if (!confirm("Delete this item? Generated tables can be regenerated later from the workflow source.")) return;
  if (tableKeys[node.type]) {
    const key = tableKeys[node.type];
    state.tables[key].rows = [];
    if (key === "costing") state.tables.boq.rows = [];
  } else if (node.type === "file") {
    state.nodes = state.nodes.filter(item => item.id !== node.id);
  }
  render();
  saveProject();
}

function deleteUploadedFile(node) {
  if (!confirm("Delete the uploaded file from this node?")) return;
  const uploadId = node.data.uploadId;
  state.uploads = state.uploads.filter(upload => upload.id !== uploadId);
  delete node.data.uploadId;
  render();
  saveProject();
}

async function downloadTable(key) {
  const table = state.tables[key];
  const summaryRows = [];
  if (key === "costing") {
    const s = table.summary;
    summaryRows.push(["Total TR", s.totalTR], ["Total Cost", money(s.totalCost)], ["Margin", `${Number(s.margin) * 100}%`], ["Selling Price", money(s.sellingPrice)], ["Profit", money(s.profit)], ["Price / Ton", money(s.pricePerTon)]);
  }
  if (key === "boq") {
    const s = table.summary;
    summaryRows.push(["Total", money(s.total)], ["VAT 5%", money(s.vat)], ["Net Amount", money(s.netAmount)]);
  }
  const blob = await api("/api/export/table", {
    method: "POST",
    body: JSON.stringify({
      filename: `${key}.xls`,
      title: key,
      columns: table.columns,
      rows: table.rows,
      summaryRows: summaryRows.map(([label, value]) => ({ label, value }))
    })
  });
  downloadBlob(blob, `${key}.xls`);
}

async function downloadQuotation() {
  const blob = await api("/api/export/quotation", {
    method: "POST",
    body: JSON.stringify({
      filename: `${safeFile(state.quotation.quotationNo || "quotation")}.docx`,
      details: state.details,
      quotationNo: state.quotation.quotationNo,
      boq: state.tables.boq
    })
  });
  downloadBlob(blob, `${safeFile(state.quotation.quotationNo || "quotation")}.docx`);
}

async function openQuotationPrint() {
  const blob = await api("/api/export/quotation", {
    method: "POST",
    body: JSON.stringify({ details: state.details, quotationNo: state.quotation.quotationNo, boq: state.tables.boq })
  });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) setTimeout(() => win.print(), 800);
}

function addFileNode() {
  const count = state.nodes.filter(node => node.type === "file").length + 1;
  state.nodes.push({ id: `file-${Date.now()}`, type: "file", title: `File ${count}`, x: 360 + count * 30, y: 720 + count * 30, locked: false, data: {} });
  render();
  saveProject();
}

function previewUpload(node) {
  const upload = findUpload(node.data.uploadId);
  if (!upload) return toast("No file uploaded yet");
  window.open(`/api/projects/${state.id}/uploads/${upload.id}`, "_blank");
}

async function downloadUploadedFile(node) {
  const upload = findUpload(node.data.uploadId);
  if (!upload) return toast("No file uploaded yet");
  const blob = await api(`/api/projects/${state.id}/uploads/${upload.id}`);
  downloadBlob(blob, upload.originalName || "uploaded-file");
}

function copyShareLink() {
  navigator.clipboard.writeText(location.href);
  toast("Share link copied");
}

function findUpload(uploadId) {
  return state.uploads.find(upload => upload.id === uploadId);
}

function rowFrom(columns, values) {
  return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""]));
}

function div(className) {
  const el = document.createElement("div");
  if (className) el.className = className;
  return el;
}

function norm(value) {
  return String(value || "").toUpperCase().replace(/[\s_\-]/g, "");
}

function num(value) {
  if (value === "" || value == null) return 0;
  return Number(String(value).replace(/,/g, "")) || 0;
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function fmt(value) {
  return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function money(value) {
  return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function prettyBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function fileExt(name) {
  const ext = String(name || "").split(".").pop().slice(0, 4).toUpperCase();
  return ext || "FILE";
}

function safeFile(name) {
  return String(name).replace(/[^\w.-]+/g, "_");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toast(message) {
  const el = document.createElement("div");
  el.textContent = message;
  el.style.cssText = "position:fixed;right:24px;top:24px;background:#101a33;color:#fff;padding:10px 14px;border-radius:8px;z-index:99;box-shadow:0 12px 30px rgba(0,0,0,.2)";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
