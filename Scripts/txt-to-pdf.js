const { jsPDF } = window.jspdf;

const dropzone   = document.getElementById('dropzone');
const fileInput  = document.getElementById('fileInput');
const fileList   = document.getElementById('fileList');
const convertBtn = document.getElementById('convertBtn');
const toast      = document.getElementById('toast');
const divider    = document.getElementById('divider');
const options    = document.getElementById('options');

let files = [];

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderFiles() {
  fileList.innerHTML = '';
  files.forEach((f, i) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <span class="file-item-icon">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </span>
      <span class="file-item-name">${f.name}</span>
      <span class="file-item-size">${formatSize(f.size)}</span>
      <button class="file-item-remove" data-index="${i}" title="Remove">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    fileList.appendChild(item);
  });

  const hasFiles = files.length > 0;
  convertBtn.disabled = !hasFiles;
  divider.style.display = hasFiles ? 'block' : 'none';
  options.style.display = hasFiles ? 'flex' : 'none';
  hideToast();
}

fileList.addEventListener('click', e => {
  const btn = e.target.closest('[data-index]');
  if (!btn) return;
  files.splice(parseInt(btn.dataset.index), 1);
  renderFiles();
});

function addFiles(newFiles) {
  const valid = Array.from(newFiles).filter(f => f.name.endsWith('.txt'));
  const invalid = Array.from(newFiles).length - valid.length;
  const existing = new Set(files.map(f => f.name));
  valid.forEach(f => { if (!existing.has(f.name)) files.push(f); });
  renderFiles();
  if (invalid > 0) showToast('error', `${invalid} file(s) skipped — only .txt files are supported.`);
}

fileInput.addEventListener('change', e => { addFiles(e.target.files); fileInput.value = ''; });

dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  addFiles(e.dataTransfer.files);
});

function showToast(type, msg) {
  const icon = type === 'success'
    ? `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  toast.className = `toast ${type}`;
  toast.innerHTML = icon + msg;
}

function hideToast() { toast.className = 'toast'; }

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Could not read ' + file.name));
    reader.readAsText(file);
  });
}

function textToPdf(text, pageSize, fontSizePt) {
  const doc = new jsPDF({ unit: 'pt', format: pageSize });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = fontSizePt * 1.5;

  doc.setFont('Courier', 'normal');
  doc.setFontSize(fontSizePt);

  const lines = text.split('\n');
  let y = margin + fontSizePt;

  lines.forEach(rawLine => {
    const wrapped = doc.splitTextToSize(rawLine === '' ? ' ' : rawLine, maxWidth);
    wrapped.forEach(line => {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin + fontSizePt;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });
  });

  return doc;
}

convertBtn.addEventListener('click', async () => {
  if (!files.length) return;

  const pageSize   = document.getElementById('pageSize').value;
  const fontSizePt = parseInt(document.getElementById('fontSize').value);
  const outputMode = document.getElementById('outputMode').value;

  convertBtn.disabled = true;
  convertBtn.innerHTML = `
    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="animation:spin 0.8s linear infinite">
      <path d="M21 12a9 9 0 11-3.07-6.79"/>
    </svg>
    Converting…
  `;

  try {
    const texts = await Promise.all(files.map(readFile));

    if (outputMode === 'separate') {
      texts.forEach((text, i) => {
        const doc = textToPdf(text, pageSize, fontSizePt);
        const outName = files[i].name.replace(/\.txt$/i, '') + '.pdf';
        doc.save(outName);
      });
      showToast('success', `${files.length} PDF${files.length > 1 ? 's' : ''} downloaded successfully.`);
    } else {
      const merged = new jsPDF({ unit: 'pt', format: pageSize });
      const margin = 48;
      const pageWidth = merged.internal.pageSize.getWidth();
      const pageHeight = merged.internal.pageSize.getHeight();
      const maxWidth = pageWidth - margin * 2;
      const lineHeight = fontSizePt * 1.5;

      merged.setFont('Courier', 'normal');
      merged.setFontSize(fontSizePt);

      let firstFile = true;
      texts.forEach((text) => {
        if (!firstFile) merged.addPage();
        firstFile = false;

        let y = margin + fontSizePt;
        const lines = text.split('\n');
        lines.forEach(rawLine => {
          const wrapped = merged.splitTextToSize(rawLine === '' ? ' ' : rawLine, maxWidth);
          wrapped.forEach(line => {
            if (y + lineHeight > pageHeight - margin) {
              merged.addPage();
              y = margin + fontSizePt;
            }
            merged.text(line, margin, y);
            y += lineHeight;
          });
        });
      });

      merged.save('merged.pdf');
      showToast('success', 'Merged PDF downloaded successfully.');
    }
  } catch (err) {
    showToast('error', 'Something went wrong: ' + err.message);
  }

  convertBtn.disabled = false;
  convertBtn.innerHTML = `
    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
    Convert to PDF
  `;
});
