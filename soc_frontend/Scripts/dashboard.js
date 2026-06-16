// Page Vars
const PAGE_SIZE = 20;
let analyses = [];
let filtered = [];
let currentPage = 1;

// Page items vars
const refreshBtn = document.getElementById("refreshBtn");
const filterScore = document.getElementById("filterScore");
const alertBody = document.getElementById("alertTableBody");
const tableCount = document.getElementById("tableCount");
const pagination = document.getElementById("pagination");
const statTotal = document.getElementById("statTotal");
const statMalicious = document.getElementById("statMalicious");
const statSuspicious = document.getElementById("statSuspicious");
const statClean = document.getElementById("statClean");
const fileInput = document.getElementById("fileInput");

// Cache parameters for storing reports on the browser session
let browserCache = null;
let browserCacheTime = 0;
const BROWSER_CACHE_TIMEOUT = 600000; // Max Time until the server goes fetching for reports (10 minutes)

// Function to get analysis from the backend on server.js
async function fetchData() {
  try {

    // Checking if there exists any reports on cache
    if (browserCache && Date.now() - browserCacheTime < BROWSER_CACHE_TIMEOUT){
      console.log("INFO -- Using browser cache, skipping fetch");
      // console.log(`DEBUG -- Storede cache:${browserCache}`)
      analyses = browserCache;
      updateStats();
      applyFilters();
      return analyses;
      
    }

    console.log("INFO -- No browser cache found, fetching new data")
    const response = await fetch("/api/analyses"); // Backend route
    const data = await response.json();
    analyses = normalizeAnalyses(data);

    // Updating the cache parameters
    browserCache = analyses;
    browserCacheTime = Date.now();

    // Update the page
    updateStats();
    applyFilters();
    document.getElementById("lastUpdated").textContent = new Date().toLocaleTimeString();
    return analyses;

  } catch (err) {
    console.error(err);
  }
}

// Function to get the information from the json files 
function normalizeAnalyses(data) {
  if (Array.isArray(data)) return data.map(normalizeItem);
  if (data && typeof data === "object") return [normalizeItem(data)];
  return [];
}

// Function to get the information for each label from the json files 
function normalizeItem(report) {
  const info = report.info || report.AnalysisInfo || {};
  const target = report.target || {};
  const targetFile = target.file || report.targetfile || {};
  const signatures = Array.isArray(report.signatures)
    ? report.signatures
    : Array.isArray(report.Signatures)
      ? report.Signatures
      : [];

  return {
    created_at: // Time in which the analysis ended
      report.created_at ||
      info.started ||
      info.starttime ||
      info.startedon ||
      report.timestamp ||
      "",

    id: report.id ?? info.id ?? null, // Analysis Id inside CAPEv2
      
    filename: // Sample name tested
      report.filename ||
      targetFile.name ||
      target.file_name ||
      target.name ||
      report.name ||
      "-",

    score: Number( // Final score of the analysis 
      report.score ??
        info.score ??
        info.malscore ??
        signatures.length ??
        0
    ),

    sha256: // Sha256 codification from the sample
      report.sha256 ||
      targetFile.sha256 ||
      target.sha256 ||
      report.targetsha256 ||
      "",

    signatures: signatures.length, // Number of malicious tasks done by the sample

    status: // Final status 
      report.status ||
      info.status ||
      report.malstatus ||
      (signatures.length ? "completed" : "unknown"),
    analysis_url: report.analysis_url || "",
    report_url: report.analysis_report_url || ""
  };
}

// Function to update report stats, card on top of the page 
function updateStats() {
  statTotal.textContent = analyses.length;
  statMalicious.textContent = analyses.filter(x => x.score >= 10).length;
  statSuspicious.textContent = analyses.filter(x => x.score >= 5 && x.score < 10).length;
  statClean.textContent = analyses.filter(x => x.score < 5).length;
}

// Function to filter prior reports
function applyFilters() {
  const scoreFilter = filterScore.value;

  filtered = analyses.filter(item => {
    if (scoreFilter === "high" && item.score < 10) return false;
    if (scoreFilter === "medium" && (item.score < 5 || item.score >= 10)) return false;
    if (scoreFilter === "low" && item.score >= 5) return false;
    return true;
  });

  currentPage = 1;
  renderTable();
}

filterScore.addEventListener("change", applyFilters);

// Function to update the report table entries
function renderTable() {
  if (filtered.length === 0) {
    alertBody.innerHTML = `<tr><td colspan="7">Sem Análises Realizadas</td></tr>`;
    tableCount.textContent = "0 analyses";
    pagination.innerHTML = "";
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const page = filtered.slice(start, start + PAGE_SIZE);

  // All the items must have the same name both here and in the html page
  alertBody.innerHTML = page.map(item => `<tr>
    <td>${formatTime(item.created_at)}</td>
    <td>${item.id ?? "-"}</td>
    <td>${escapeHtml(item.filename)}</td>
    <td>${scoreBadge(item.score)}</td>
    <td>${shortHash(item.sha256)}</td>
    <td>${item.signatures}</td>
    <td>${item.analysis_url? `<a href="${item.analysis_url}" target="_blank">Open</a>`: "-"}
</td>
    <td>${escapeHtml(item.status)}</td>
  </tr>`).join("");

  tableCount.textContent = `${filtered.length} analyses`;
  renderPagination();
}

// Function to render pagination for there is more than one page, 20 reports per page
function renderPagination() {
  const total = Math.ceil(filtered.length / PAGE_SIZE);

  if (total <= 1) {
    pagination.innerHTML = "";
    return;
  }

  let html = "";
  for (let i = 1; i <= total; i++) {
    html += `<button onclick="goPage(${i})">${i}</button>`;
  }

  pagination.innerHTML = html;
}

function goPage(page) {
  currentPage = page;
  renderTable();
}

window.goPage = goPage;

// Classifing the analysis based on its score
function scoreBadge(score) {
  if (score >= 10) return `HIGH ${score}`;
  if (score >= 5) return `MED ${score}`;
  return `LOW ${score}`;
}

// Shortens the hash in case is to big to be displayed
function shortHash(hash) {
  return hash ? hash.slice(0, 24) + "..." : "-";
}

// Time from last refresh
function formatTime(time) {
  if (!time) return "-";
  const d = new Date(time);
  return isNaN(d.getTime()) ? String(time) : d.toLocaleString();
}

// Function to safely display text in html without being interpreted as markup
function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Function to upload new reports
async function uploadFile() {
  console.log("INFO -- Uploading new files")
  const file = fileInput.files[0];
  if (!file){ // Checks if there is any file 
    alert("ERROR -- No input file detected");
    return;
  }
  // Create the payload
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch( // Call for the backend
    "/api/upload",
    {
      method: "POST", // Post the new report to the database
      body:formData
    }
  );
  const result = await response.json();
  console.log(result);

  // Resetting the cache parameters
  console.log("INFO -- Resetting browser cache")
  browserCache = null;
  browserCacheTime = 0;
  console.log("INFO -- Browser cache reset")

  alert("INFO -- Upload completed with success");

}
// Page refresh atributes
refreshBtn.addEventListener("click", fetchData);
setInterval(fetchData, 150000);
fetchData();
