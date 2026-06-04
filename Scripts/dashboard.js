const PAGE_SIZE = 20;
let analyses = [];
let filtered = [];
let currentPage = 1;

const refreshBtn = document.getElementById("refreshBtn");
const filterScore = document.getElementById("filterScore");
const alertBody = document.getElementById("alertTableBody");
const tableCount = document.getElementById("tableCount");
const pagination = document.getElementById("pagination");
const statTotal = document.getElementById("statTotal");
const statMalicious = document.getElementById("statMalicious");
const statSuspicious = document.getElementById("statSuspicious");
const statClean = document.getElementById("statClean");
const fileInput = document.getElementById("fileInput")

async function fetchData() {
  try {
    const response = await fetch("http://172.20.2.29:3000/api/analyses"); //Ip Contentor
    //const response = await fetch("http://127.0.0.1:3000/api/analyses"); //Ip LocalHost
    const data = await response.json();
    analyses = normalizeAnalyses(data);
    updateStats();
    applyFilters();
    document.getElementById("lastUpdated").textContent =
      new Date().toLocaleTimeString();
    return analyses;
  } catch (err) {
    console.error(err);
  }
}

function normalizeAnalyses(data) {
  if (Array.isArray(data)) return data.map(normalizeItem);
  if (data && typeof data === "object") return [normalizeItem(data)];
  return [];
}

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
    created_at:
      report.created_at ||
      info.started ||
      info.starttime ||
      info.startedon ||
      report.timestamp ||
      "",
    id: report.id ?? info.id ?? null,
      
    filename:
      report.filename ||
      targetFile.name ||
      target.file_name ||
      target.name ||
      report.name ||
      "-",
    score: Number(
      report.score ??
        info.score ??
        info.malscore ??
        signatures.length ??
        0
    ),
    sha256:
      report.sha256 ||
      targetFile.sha256 ||
      target.sha256 ||
      report.targetsha256 ||
      "",
    signatures: signatures.length,
    status:
      report.status ||
      info.status ||
      report.malstatus ||
      (signatures.length ? "completed" : "unknown"),
    analysis_url: report.analysis_url || "",
    report_url: report.analysis_report_url || ""
  };
}

function updateStats() {
  statTotal.textContent = analyses.length;
  statMalicious.textContent = analyses.filter(x => x.score >= 7).length;
  statSuspicious.textContent = analyses.filter(x => x.score >= 4 && x.score < 7).length;
  statClean.textContent = analyses.filter(x => x.score < 4).length;
}

function applyFilters() {
  const scoreFilter = filterScore.value;

  filtered = analyses.filter(item => {
    if (scoreFilter === "high" && item.score < 7) return false;
    if (scoreFilter === "medium" && (item.score < 4 || item.score >= 7)) return false;
    if (scoreFilter === "low" && item.score >= 4) return false;
    return true;
  });

  currentPage = 1;
  renderTable();
}

filterScore.addEventListener("change", applyFilters);

function renderTable() {
  if (filtered.length === 0) {
    alertBody.innerHTML = `<tr><td colspan="7">Sem Análises Realizadas</td></tr>`;
    tableCount.textContent = "0 analyses";
    pagination.innerHTML = "";
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const page = filtered.slice(start, start + PAGE_SIZE);

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

function scoreBadge(score) {
  if (score >= 7) return `HIGH ${score}`;
  if (score >= 4) return `MED ${score}`;
  return `LOW ${score}`;
}

function shortHash(hash) {
  return hash ? hash.slice(0, 12) + "..." : "-";
}

function formatTime(time) {
  if (!time) return "-";
  const d = new Date(time);
  return isNaN(d.getTime()) ? String(time) : d.toLocaleString();
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function uploadFile() {
  const file = fileInput.files[0];
  if (!file){
    alert("Nenhum ficheiro inserido");
    return;
  }
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(
    "http://172.20.2.29:3000/api/upload",
    {
      method: "POST", 
      body:formData
    }
  );
  const result = await response.json();
  console.log(result);
  alert("Uploade Completo");

}

refreshBtn.addEventListener("click", fetchData);
setInterval(fetchData, 60000);
fetchData();