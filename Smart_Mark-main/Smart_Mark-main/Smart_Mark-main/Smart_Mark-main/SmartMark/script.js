const STORAGE_KEY = "smartmark_multiclass_v16";
let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

// Pre-fill default Classes 1 through 12 with Sections A through G
if (!data) {
  data = { classes: {}, exams: {} };
  const sectionsList = ["A", "B", "C", "D", "E", "F", "G"];
  for (let c = 1; c <= 12; c++) {
    sectionsList.forEach(s => {
      let k = `${c}|${s}`;
      data.classes[k] = { className: `${c}`, section: s, students: [] };
    });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let current = { class: "7", section: "B", exam: "", year: "2026-27" };

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function toast(msg, isError = false) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.style.backgroundColor = isError ? "var(--danger-color)" : "var(--sidebar-bg)";
  t.style.display = "block";
  setTimeout(() => t.style.display = "none", 2500);
}

function getKey(c, s) { return `${c}|${s}`; }

function getClassObj(c = current.class, s = current.section) {
  let k = getKey(c, s);
  if (!data.classes[k]) {
    data.classes[k] = { className: `${c}`, section: s, students: [] };
  }
  return data.classes[k];
}

function formatNum(val) {
  if (val === "" || val === null || val === undefined || isNaN(val)) return val;
  let num = Number(val);
  return Number.isInteger(num) ? num.toString() : num.toFixed(0);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function toggleExamPatternFields() {
  const pattern = document.getElementById("examType").value;
  const label = document.getElementById("maxMarkLabel");
  const maxMark = document.getElementById("maxMark");

  if (pattern === "term") {
    label.textContent = "EXAM MAX MARK (E)";
    if (!maxMark.value || maxMark.value === "50") maxMark.value = "80";
  } else {
    label.textContent = "MAXIMUM MARK";
    if (!maxMark.value || maxMark.value === "80") maxMark.value = "50";
  }
}

// 9-Point Scale: D (33-40, 4.0), E1 (21-32, 3.0), E2 (0-20, 2.0). Pass condition: >= 35
function calculateGrade(value, maxMark) {
  let valStr = String(value).trim().toUpperCase();
  
  if (valStr === "AB") return ["AB", "-", "-", "AB"];
  if (valStr === "" || isNaN(valStr) || maxMark <= 0) return ["", "", "", ""];

  let numVal = +valStr;
  let score100 = Math.max(0, Math.min(maxMark, numVal)) * 100 / maxMark;
  let grade = "", gradePoint = "";

  if (score100 >= 91) { grade = "A1"; gradePoint = "10.0"; }
  else if (score100 >= 81) { grade = "A2"; gradePoint = "9.0"; }
  else if (score100 >= 71) { grade = "B1"; gradePoint = "8.0"; }
  else if (score100 >= 61) { grade = "B2"; gradePoint = "7.0"; }
  else if (score100 >= 51) { grade = "C1"; gradePoint = "6.0"; }
  else if (score100 >= 41) { grade = "C2"; gradePoint = "5.0"; }
  else if (score100 >= 33) { grade = "D";  gradePoint = "4.0"; }
  else if (score100 >= 21) { grade = "E1"; gradePoint = "3.0"; }
  else { grade = "E2"; gradePoint = "2.0"; }

  let resultStatus = score100 >= 35 ? "Pass" : "Fail";
  return [score100, grade, gradePoint, resultStatus];
}

function getResultClass(res) {
  if (res === 'Pass') return 'pass-text';
  if (res === 'Fail') return 'fail-text';
  if (res === 'AB') return 'ab-text';
  return '';
}

function show(sectionId) {
  document.querySelectorAll(".content-section").forEach(s => s.classList.add("hidden"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  
  const target = document.getElementById(sectionId);
  if (target) target.classList.remove("hidden");

  const btns = document.querySelectorAll(".nav-menu .nav-btn");
  btns.forEach(btn => {
    if (btn.getAttribute("onclick") && btn.getAttribute("onclick").includes(sectionId)) {
      btn.classList.add("active");
    }
  });

  if (sectionId === "dashboard") dashboard();
  if (sectionId === "classes") renderClasses();
  if (sectionId === "consolidated") { populateDropdowns(); renderConsolidatedSheet(); }
  if (sectionId === "summary") { populateDropdowns(); renderSummary(); }
  if (sectionId === "report") { populateDropdowns(); renderReport(); }
}

function getClassList() { return Object.values(data.classes); }

function fillSelect(id, items, placeholder) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = (placeholder ? `<option value="">${placeholder}</option>` : "") +
    items.map(x => `<option value="${x}">${x}</option>`).join("");
}

function getClassNames() {
  let names = [...new Set(getClassList().map(x => x.className))];
  return names.sort((a, b) => +a - +b);
}

function getSections(c) {
  return getClassList().filter(x => x.className === c).map(x => x.section).sort();
}

function getExamsFor(c, s) {
  let k = getKey(c, s);
  return Object.values(data.exams).filter(e => e.classKey === k);
}

function addClass() {
  let c = document.getElementById("newClass").value.trim();
  let s = document.getElementById("newSection").value.trim().toUpperCase();
  if (!c || !s) return alert("Please specify Class and Section.");
  let k = getKey(c, s);
  if (!data.classes[k]) data.classes[k] = { className: c, section: s, students: [] };
  current = { class: c, section: s, exam: "", year: current.year };
  save();
  document.getElementById("newClass").value = "";
  document.getElementById("newSection").value = "";
  renderClasses();
  populateDropdowns();
  toast("New Section Created");
}

function addStudent() {
  let adm = document.getElementById("studentAdm").value.trim().toUpperCase();
  let name = document.getElementById("studentName").value.trim();
  if (!name) return alert("Enter Student Name.");
  if (!current.class || !current.section) return alert("Select Class and Section first.");
  
  getClassObj().students.push({ id: Date.now(), admissionNo: adm, name });
  save();
  document.getElementById("studentAdm").value = "";
  document.getElementById("studentName").value = "";
  renderClasses();
  toast("Student added successfully");
}

function deleteStudent(id) {
  getClassObj().students = getClassObj().students.filter(s => s.id != id);
  save();
  renderClasses();
}

function renderClasses() {
  let cNames = getClassNames();
  fillSelect("classSel", cNames, "Select Class");
  document.getElementById("classSel").value = current.class;
  fillSelect("sectionSel", getSections(current.class), "Select Section");
  document.getElementById("sectionSel").value = current.section;
  document.getElementById("studentHeading").textContent = `Enrolled Students - Class ${current.class || "-"} (${current.section || "-"})`;
  
  document.getElementById("students").innerHTML = (getClassObj().students || []).map((s, i) => `
    <tr id="row-${s.id}">
      <td class="text-center">${i + 1}</td>
      <td class="text-center adm-cell">
        <span class="view-adm"><b>${escapeHtml(s.admissionNo || "-")}</b></span>
        <input type="text" class="input-control edit-adm hidden" value="${escapeHtml(s.admissionNo || "")}" style="padding: 4px 6px; font-size: 13px; text-align:center;">
      </td>
      <td class="text-left name-cell">
        <span class="view-name"><b>${escapeHtml(s.name)}</b></span>
        <input type="text" class="input-control edit-name hidden" value="${escapeHtml(s.name)}" style="padding: 4px 8px; font-size: 13px;" onkeydown="handleEditKey(event, ${s.id})">
      </td>
      <td style="text-align:center;">
        <div class="action-btns" id="actions-view-${s.id}" style="display: flex; justify-content: center; gap: 6px;">
          <button class="btn btn-secondary" style="padding:4px 8px; font-size:12px;" onclick="startEdit(${s.id})">Edit</button>
          <button class="btn btn-danger" style="padding:4px 8px; font-size:12px;" onclick="deleteStudent(${s.id})">Remove</button>
        </div>
        <div class="edit-btns hidden" id="actions-edit-${s.id}" style="display: flex; justify-content: center; gap: 6px;">
          <button class="btn btn-success" style="padding: 4px 10px; font-size: 12px;" onclick="saveEdit(${s.id})">Save</button>
          <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;" onclick="cancelEdit(${s.id})">Cancel</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function startEdit(id) {
  const row = document.getElementById(`row-${id}`);
  if (!row) return;

  row.querySelector(".view-adm").classList.add("hidden");
  row.querySelector(".edit-adm").classList.remove("hidden");
  row.querySelector(".view-name").classList.add("hidden");
  row.querySelector(".edit-name").classList.remove("hidden");

  document.getElementById(`actions-view-${id}`).classList.add("hidden");
  document.getElementById(`actions-edit-${id}`).classList.remove("hidden");

  const nameInput = row.querySelector(".edit-name");
  nameInput.focus();
  nameInput.select();
}

function cancelEdit(id) {
  const row = document.getElementById(`row-${id}`);
  if (!row) return;

  row.querySelector(".view-adm").classList.remove("hidden");
  row.querySelector(".edit-adm").classList.add("hidden");
  row.querySelector(".view-name").classList.remove("hidden");
  row.querySelector(".edit-name").classList.add("hidden");

  document.getElementById(`actions-view-${id}`).classList.remove("hidden");
  document.getElementById(`actions-edit-${id}`).classList.add("hidden");
}

function handleEditKey(e, id) {
  if (e.key === "Enter") saveEdit(id);
  if (e.key === "Escape") cancelEdit(id);
}

function saveEdit(id) {
  const row = document.getElementById(`row-${id}`);
  const newAdm = row.querySelector(".edit-adm").value.trim().toUpperCase();
  const newName = row.querySelector(".edit-name").value.trim();

  if (!newName) return toast("Student name cannot be empty", true);

  const student = getClassObj().students.find(s => s.id === id);
  if (student) {
    student.admissionNo = newAdm;
    student.name = newName;
    save();
    renderClasses();
    toast("Student details updated successfully");
  }
}

function appendStudents(studentList) {
  if (!current.class || !current.section) return alert("Select Class and Section first.");
  const validList = studentList.filter(s => s.name && s.name.trim().length > 0);
  if (validList.length === 0) return toast("No valid student names found", true);

  validList.forEach((st, idx) => {
    getClassObj().students.push({
      id: Date.now() + idx,
      admissionNo: (st.admissionNo || "").trim().toUpperCase(),
      name: st.name.trim()
    });
  });

  save();
  renderClasses();
  toast(`Imported ${validList.length} student(s) successfully`);
}

function handleCSVUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const text = evt.target.result;
    const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(l => l.length > 0);
    const parsed = [];

    let startIndex = 0;
    if (lines.length > 0) {
      const headerLine = lines[0].toLowerCase();
      if (headerLine.includes("name") || headerLine.includes("admission") || headerLine.includes("s.no")) {
        startIndex = 1;
      }
    }

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(",").map(p => p.replace(/^["']|["']$/g, "").trim());
      if (parts.length >= 3) {
        parsed.push({ admissionNo: parts[1], name: parts[2] });
      } else if (parts.length === 2) {
        if (!isNaN(parts[0])) {
          parsed.push({ admissionNo: "", name: parts[1] });
        } else {
          parsed.push({ admissionNo: parts[0], name: parts[1] });
        }
      } else if (parts.length === 1 && parts[0]) {
        parsed.push({ admissionNo: "", name: parts[0] });
      }
    }

    appendStudents(parsed);
    e.target.value = "";
  };
  reader.readAsText(file);
}

async function handlePDFUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (typeof pdfjsLib === "undefined") {
    return alert("PDF processing library is loading. Please try again in a few moments.");
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let extractedTokens = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageTokens = textContent.items
        .map(item => item.str.trim())
        .filter(str => str.length > 0);

      extractedTokens = extractedTokens.concat(pageTokens);
    }

    const studentsFound = [];
    const admRegex = /^[A-Za-z0-9]{3,}\d{3,}$/;

    for (let i = 0; i < extractedTokens.length; i++) {
      let token = extractedTokens[i];

      if (token.toUpperCase().startsWith("ADM") || admRegex.test(token)) {
        let adm = token;
        let name = "";
        
        if (i + 1 < extractedTokens.length) {
          let nextToken = extractedTokens[i + 1];
          const isHeader = /admission|s\.no|student|name|class/i.test(nextToken);
          if (!isHeader && isNaN(nextToken)) {
            name = nextToken;
            i++;
          }
        }
        if (name) {
          studentsFound.push({ admissionNo: adm, name });
        }
      }
    }

    if (studentsFound.length === 0) {
      const cleanNames = extractedTokens
        .map(str => str.replace(/^[\d]+[\.\)\-\s]+/, "").trim())
        .filter(str => {
          const lower = str.toLowerCase();
          const isHeader = lower.includes("student name") || lower.includes("s.no") || lower.includes("class") || lower.includes("admission");
          return str.length > 1 && !isHeader && isNaN(str);
        });
      cleanNames.forEach(n => studentsFound.push({ admissionNo: "", name: n }));
    }

    appendStudents(studentsFound);
  } catch (err) {
    console.error(err);
    toast("Failed to parse PDF file. Ensure it contains selectable text.", true);
  } finally {
    e.target.value = "";
  }
}

document.getElementById("classSel").onchange = e => { current.class = e.target.value; current.section = getSections(current.class)[0] || ""; renderClasses(); };
document.getElementById("sectionSel").onchange = e => { current.section = e.target.value; renderClasses(); };

function populateDropdowns() {
  let cNames = getClassNames();
  ["entryClass", "sumClass", "repClass", "conClass"].forEach(id => {
    fillSelect(id, cNames);
    const el = document.getElementById(id);
    if (el) el.value = current.class;
  });
  ["entrySection", "sumSection", "repSection", "conSection"].forEach(id => {
    fillSelect(id, getSections(current.class));
    const el = document.getElementById(id);
    if (el) el.value = current.section;
  });
  
  let exams = getExamsFor(current.class, current.section).map(e => e.id);
  ["sumExam", "repExam"].forEach(id => {
    fillSelect(id, exams.map(x => data.exams[x].name), "Select Exam");
  });

  let distinctExams = [...new Set(getExamsFor(current.class, current.section).map(e => e.name))];
  fillSelect("conExamSel", distinctExams, distinctExams.length ? "" : "No Exams Recorded");
}

function onConFilterChange() {
  current.class = document.getElementById("conClass").value;
  const sections = getSections(current.class);
  fillSelect("conSection", sections);
  current.section = sections[0] || "A";
  document.getElementById("conSection").value = current.section;

  let distinctExams = [...new Set(getExamsFor(current.class, current.section).map(e => e.name))];
  fillSelect("conExamSel", distinctExams, distinctExams.length ? "" : "No Exams Recorded");
  renderConsolidatedSheet();
}

// -------------------------------------------------------------
// MARK ENTRY LOGIC
// -------------------------------------------------------------

function loadMarks() {
  let c = document.getElementById("entryClass").value;
  let s = document.getElementById("entrySection").value;
  let sub = document.getElementById("subject").value.trim();
  let pattern = document.getElementById("examType").value;
  let name = document.getElementById("examName").value.trim();
  let max = +document.getElementById("maxMark").value;
  let yearInput = document.getElementById("acadYear");
  let year = yearInput && yearInput.value.trim() ? yearInput.value.trim() : "2026-27";

  if (!c || !s || !sub || !name || !max || max <= 0) {
    return alert("Fill all required exam header fields with valid values.");
  }

  current = { class: c, section: s, exam: name, year: year };
  let id = `${getKey(c, s)}|${year}|${name}|${sub}`;

  if (!data.exams[id]) {
    data.exams[id] = { 
      id, 
      classKey: getKey(c, s), 
      className: c, 
      section: s, 
      name, 
      pattern,
      subject: sub, 
      max, 
      academicYear: year, 
      marks: {} 
    };
  } else {
    data.exams[id].pattern = pattern;
    data.exams[id].max = max;
    data.exams[id].academicYear = year;
    data.exams[id].subject = sub;
  }
  current.exam = id;
  save();

  renderMarkEntryTable(data.exams[id]);
}

function renderMarkEntryTable(examObj) {
  document.getElementById("markCard").classList.remove("hidden");
  const thead = document.getElementById("markTableHead");
  const tbody = document.getElementById("markRows");
  const dynamicExamMax = +examObj.max || 80;
  const totalMax = 20 + dynamicExamMax;

  if (examObj.pattern === "term") {
    thead.innerHTML = `
      <tr>
        <th class="text-center" style="width: 45px;">S.No</th>
        <th class="text-center" style="width: 120px;">Adm No.</th>
        <th class="text-left">Student Name</th>
        <th class="text-center" style="width: 70px;">NBS (5)</th>
        <th class="text-center" style="width: 70px;">SE (5)</th>
        <th class="text-center" style="width: 70px;">T (10)</th>
        <th class="text-center" style="width: 80px;">Exam (${dynamicExamMax})</th>
        <th class="text-center" style="width: 80px;">Total (${totalMax})</th>
        <th class="text-center" style="width: 65px;">Grade</th>
        <th class="text-center" style="width: 75px;">Grade Pt</th>
        <th class="text-center" style="width: 70px;">Result</th>
      </tr>`;

    tbody.innerHTML = getClassObj().students.map((st, i) => {
      let val = examObj.marks[st.id] || { nbs: "", se: "", t: "", e: "" };
      if (typeof val !== "object") val = { nbs: "", se: "", t: "", e: val };
      
      let resData = calculateTermScore(val, dynamicExamMax);
      let badgeClass = resData.grade && resData.grade !== "-" ? `badge badge-${resData.grade.toLowerCase()}` : '';
      let resClass = getResultClass(resData.res);

      return `<tr>
        <td class="text-center">${i + 1}</td>
        <td class="text-center" style="font-size: 12px; color: var(--text-muted); font-weight: 600;">${escapeHtml(st.admissionNo || "-")}</td>
        <td class="text-left"><b>${escapeHtml(st.name)}</b></td>
        <td class="text-center"><input type="text" class="input-control term-input" data-row="${i}" data-col="0" data-id="${st.id}" data-field="nbs" data-max="5" value="${val.nbs ?? ''}" style="width:70px; text-align:center;" placeholder="Mark/AB"></td>
        <td class="text-center"><input type="text" class="input-control term-input" data-row="${i}" data-col="1" data-id="${st.id}" data-field="se" data-max="5" value="${val.se ?? ''}" style="width:70px; text-align:center;" placeholder="Mark/AB"></td>
        <td class="text-center"><input type="text" class="input-control term-input" data-row="${i}" data-col="2" data-id="${st.id}" data-field="t" data-max="10" value="${val.t ?? ''}" style="width:70px; text-align:center;" placeholder="Mark/AB"></td>
        <td class="text-center"><input type="text" class="input-control term-input" data-row="${i}" data-col="3" data-id="${st.id}" data-field="e" data-max="${dynamicExamMax}" value="${val.e ?? ''}" style="width:80px; text-align:center;" placeholder="Mark/AB"></td>
        <td class="text-center"><b>${resData.totalStr}</b></td>
        <td class="text-center"><span class="${badgeClass}">${resData.grade}</span></td>
        <td class="text-center">${resData.gradePoint}</td>
        <td class="text-center ${resClass}">${resData.res}</td>
      </tr>`;
    }).join("");

    document.querySelectorAll(".term-input").forEach(inp => {
      inp.oninput = () => {
        validateAndClampInput(inp);
        updateTermRow(inp, dynamicExamMax);
      };
      inp.onkeydown = e => handleSpreadsheetKeyNav(e, inp, 4);
      inp.onfocus = () => inp.select();
    });

  } else {
    thead.innerHTML = `
      <tr>
        <th class="text-center" style="width: 45px;">S.No</th>
        <th class="text-center" style="width: 130px;">Adm No.</th>
        <th class="text-left">Student Name</th>
        <th class="text-center" style="width: 110px;">Obtained Mark</th>
        <th class="text-center" style="width: 110px;">Converted (/100)</th>
        <th class="text-center" style="width: 75px;">Grade</th>
        <th class="text-center" style="width: 85px;">Grade Point</th>
        <th class="text-center" style="width: 80px;">Result</th>
      </tr>`;

    tbody.innerHTML = getClassObj().students.map((st, i) => {
      let score = typeof examObj.marks[st.id] === "object" ? (examObj.marks[st.id].e ?? "") : (examObj.marks[st.id] ?? "");
      let [score100, grade, gradePoint, res] = calculateGrade(score, examObj.max);
      return createMarkRow(st, i, score, score100, grade, gradePoint, res);
    }).join("");

    document.querySelectorAll("#markRows input.mark-input").forEach(inp => {
      inp.oninput = () => {
        validateAndClampInput(inp, examObj.max);
        updateMarkRow(inp, examObj.max);
      };
      inp.onkeydown = e => handleSpreadsheetKeyNav(e, inp, 1);
      inp.onfocus = () => inp.select();
    });
  }
}

function handleSpreadsheetKeyNav(e, inp, colsPerRow) {
  const row = +inp.dataset.row;
  const col = +(inp.dataset.col || 0);
  const totalRows = getClassObj().students.length;

  let targetRow = row;
  let targetCol = col;

  switch (e.key) {
    case "Enter":
    case "ArrowDown":
      targetRow = row + 1;
      break;
    case "ArrowUp":
      targetRow = row - 1;
      break;
    case "ArrowRight":
      if (inp.selectionEnd === inp.value.length || e.key === "Tab") {
        if (col < colsPerRow - 1) {
          targetCol = col + 1;
        } else if (row < totalRows - 1) {
          targetRow = row + 1;
          targetCol = 0;
        }
      } else {
        return;
      }
      break;
    case "ArrowLeft":
      if (inp.selectionStart === 0) {
        if (col > 0) {
          targetCol = col - 1;
        } else if (row > 0) {
          targetRow = row - 1;
          targetCol = colsPerRow - 1;
        }
      } else {
        return;
      }
      break;
    default:
      return;
  }

  if (targetRow >= 0 && targetRow < totalRows && targetCol >= 0 && targetCol < colsPerRow) {
    e.preventDefault();
    const selector = colsPerRow > 1 
      ? `input[data-row="${targetRow}"][data-col="${targetCol}"]`
      : `input[data-row="${targetRow}"]`;
    const nextInp = document.querySelector(selector);
    if (nextInp) {
      nextInp.focus();
      nextInp.select();
    }
  }
}

function validateAndClampInput(inp, maxOverride) {
  let max = maxOverride !== undefined ? maxOverride : +inp.dataset.max;
  let val = inp.value.trim().toUpperCase();
  inp.classList.remove("input-error");

  if (val === "" || val === "AB") return;
  if (isNaN(val)) { inp.classList.add("input-error"); return; }

  let num = +val;
  if (num < 0 || (max && num > max)) {
    inp.classList.add("input-error");
  }
}

function calculateTermScore(val, dynamicExamMax) {
  const parseVal = (v) => String(v ?? "").trim().toUpperCase();
  const nbsStr = parseVal(val.nbs);
  const seStr = parseVal(val.se);
  const tStr = parseVal(val.t);
  const eStr = parseVal(val.e);

  const rawEntries = [nbsStr, seStr, tStr, eStr];
  const filledEntries = rawEntries.filter(v => v !== "");

  if (filledEntries.length === 0) {
    return { total: "", totalStr: "", grade: "", gradePoint: "", res: "" };
  }
  if (filledEntries.every(v => v === "AB")) {
    return { total: "AB", totalStr: "AB", grade: "-", gradePoint: "-", res: "AB" };
  }

  const getNumericVal = (str) => (str === "" || str === "AB" || isNaN(str)) ? 0 : +str;
  const nbs = getNumericVal(nbsStr);
  const se = getNumericVal(seStr);
  const t = getNumericVal(tStr);
  const e = getNumericVal(eStr);

  const maxE = +dynamicExamMax || 80;
  const maxTotal = 20 + maxE;
  const totalRaw = nbs + se + t + e;
  const [score100, grade, gradePoint, res] = calculateGrade(totalRaw, maxTotal);

  return { total: score100, totalStr: formatNum(totalRaw), grade, gradePoint, res };
}

function updateTermRow(inp, dynamicExamMax) {
  let row = inp.closest("tr");
  let nbs = row.querySelector('[data-field="nbs"]').value;
  let se = row.querySelector('[data-field="se"]').value;
  let t = row.querySelector('[data-field="t"]').value;
  let e = row.querySelector('[data-field="e"]').value;

  let resData = calculateTermScore({ nbs, se, t, e }, dynamicExamMax);
  let badgeClass = resData.grade && resData.grade !== "-" ? `badge badge-${resData.grade.toLowerCase()}` : '';

  row.children[7].innerHTML = `<b>${resData.totalStr}</b>`;
  row.children[8].innerHTML = `<span class="${badgeClass}">${resData.grade}</span>`;
  row.children[9].textContent = resData.gradePoint;
  row.children[10].textContent = resData.res;
  row.children[10].className = `text-center ${getResultClass(resData.res)}`;
}

function createMarkRow(st, index, val, score100, grade, gradePoint, res) {
  let badgeClass = grade && grade !== "-" ? `badge badge-${grade.toLowerCase()}` : '';
  let convertedText = score100 === "AB" ? "AB" : (score100 === "" ? "" : formatNum(score100));
  let resClass = getResultClass(res);

  return `<tr>
    <td class="text-center">${index + 1}</td>
    <td class="text-center" style="font-size:12px; color:var(--text-muted); font-weight:600;">${escapeHtml(st.admissionNo || "-")}</td>
    <td class="text-left"><b>${escapeHtml(st.name)}</b></td>
    <td class="text-center"><input type="text" class="input-control mark-input" data-row="${index}" data-col="0" data-id="${st.id}" value="${val}" style="width:100px; text-align:center;" placeholder="Mark / AB"></td>
    <td class="text-center"><b>${convertedText}</b></td>
    <td class="text-center"><span class="${badgeClass}">${grade}</span></td>
    <td class="text-center">${gradePoint}</td>
    <td class="text-center ${resClass}">${res}</td>
  </tr>`;
}

function updateMarkRow(inp, max) {
  let [score100, grade, gradePoint, res] = calculateGrade(inp.value, max);
  let row = inp.closest("tr");
  let convertedText = score100 === "AB" ? "AB" : (score100 === "" ? "" : formatNum(score100));
  let badgeClass = grade && grade !== "-" ? `badge badge-${grade.toLowerCase()}` : '';

  row.children[4].innerHTML = `<b>${convertedText}</b>`;
  row.children[5].innerHTML = `<span class="${badgeClass}">${grade}</span>`;
  row.children[6].textContent = gradePoint;
  row.children[7].textContent = res;
  row.children[7].className = `text-center ${getResultClass(res)}`;
}

function saveCurrentMarks() {
  let examObj = data.exams[current.exam];
  if (!examObj) return;

  let invalidInputs = document.querySelectorAll("#markRows .input-error");
  if (invalidInputs.length > 0) {
    invalidInputs[0].focus();
    return toast("Please fix highlighted out-of-range marks before saving!", true);
  }

  if (examObj.pattern === "term") {
    let rows = document.querySelectorAll("#markRows tr");
    rows.forEach(row => {
      let id = row.querySelector('[data-field="nbs"]').dataset.id;
      let nbs = row.querySelector('[data-field="nbs"]').value.trim().toUpperCase();
      let se = row.querySelector('[data-field="se"]').value.trim().toUpperCase();
      let t = row.querySelector('[data-field="t"]').value.trim().toUpperCase();
      let e = row.querySelector('[data-field="e"]').value.trim().toUpperCase();
      examObj.marks[id] = { nbs, se, t, e };
    });
  } else {
    document.querySelectorAll("#markRows input.mark-input").forEach(i => {
      let raw = i.value.trim().toUpperCase();
      examObj.marks[i.dataset.id] = raw === "AB" ? "AB" : (raw === "" ? "" : raw);
    });
  }
  save();
  toast("Marks record saved successfully!");
}

function clearCurrentMarks() {
  if (confirm("Reset marks for all students in this exam?")) {
    data.exams[current.exam].marks = {};
    save();
    renderMarkEntryTable(data.exams[current.exam]);
  }
}

// -------------------------------------------------------------
// CONSOLIDATED REGISTER (PEPS SCHOOL HEADER & DYNAMIC SUBJECTS)
// -------------------------------------------------------------

function renderConsolidatedSheet() {
  const c = document.getElementById("conClass").value || current.class;
  const s = document.getElementById("conSection").value || current.section;
  const examName = document.getElementById("conExamSel").value;
  const students = getClassObj(c, s).students;

  const thead = document.getElementById("conTableHead");
  const tbody = document.getElementById("conTableBody");
  const subHeader = document.getElementById("conSchoolSubHeader");

  subHeader.textContent = `Class ${c}-${s} | Academic Year: 2026-27 | Exam: ${examName || "Term - I"} [Consolidated]`;

  if (!examName || examName === "No Exams Recorded") {
    thead.innerHTML = `<tr><th class="text-center">No examination entries saved for Class ${c}-${s}.</th></tr>`;
    tbody.innerHTML = `<tr><td class="text-center" style="padding: 24px; color: var(--text-muted);">Please enter subject scores under <b>Mark Entry</b> first.</td></tr>`;
    return;
  }

  // Retrieve all subject exams registered under this Class, Section, and Exam Name
  const k = getKey(c, s);
  const subjectExams = Object.values(data.exams).filter(e => e.classKey === k && e.name === examName);

  if (subjectExams.length === 0) {
    thead.innerHTML = `<tr><th class="text-center">No subject entries found for ${examName}.</th></tr>`;
    tbody.innerHTML = `<tr><td class="text-center" style="padding: 24px; color: var(--text-muted);">Enter subject marks under Mark Entry.</td></tr>`;
    return;
  }

  // 1. Multi-Subject Dual Headers
  let headerTop = `
    <tr class="con-head-dark">
      <th style="width: 50px; text-align: center;">S.No</th>
      <th style="width: 120px; text-align: center;">Adm No</th>
      <th style="min-width: 150px; text-align: left;">Student Name</th>
  `;

  let headerSub = `
    <tr class="con-head-sub">
      <th colspan="3" style="background:#1e293b;"></th>
  `;

  subjectExams.forEach(ex => {
    headerTop += `<th colspan="2" style="text-align: center;">${escapeHtml(ex.subject)}</th>`;
    headerSub += `
      <th style="width: 75px; text-align: center;">Raw(/${ex.max})</th>
      <th style="width: 65px; text-align: center;">/100</th>
    `;
  });

  headerTop += `</tr>`;
  headerSub += `</tr>`;
  thead.innerHTML = headerTop + headerSub;

  // 2. Table Rows
  tbody.innerHTML = students.map((st, i) => {
    let rowHtml = `
      <tr>
        <td class="text-center" style="color:var(--text-muted); font-size:12px;">${i + 1}</td>
        <td class="text-center" style="font-size:12px; font-weight:600; color:#334155;">${escapeHtml(st.admissionNo || '-')}</td>
        <td class="text-left"><b>${escapeHtml(st.name)}</b></td>
    `;

    subjectExams.forEach(ex => {
      let rawVal = "-";
      let scaledVal = "-";
      let entry = ex.marks[st.id];

      if (entry !== undefined && entry !== null && entry !== "") {
        if (ex.pattern === "term") {
          let termObj = typeof entry === "object" ? entry : { nbs: "", se: "", t: "", e: entry };
          let resData = calculateTermScore(termObj, ex.max);
          rawVal = resData.totalStr || "-";
          scaledVal = typeof resData.total === "number" ? formatNum(resData.total) : (resData.total || "-");
        } else {
          let rawStr = String(entry).trim().toUpperCase();
          if (rawStr === "AB") {
            rawVal = "AB";
            scaledVal = "AB";
          } else if (!isNaN(rawStr)) {
            let [sc100] = calculateGrade(+rawStr, ex.max);
            rawVal = rawStr;
            scaledVal = formatNum(sc100);
          }
        }
      }

      rowHtml += `
        <td class="text-center" style="font-weight:600; color:#475569;">${rawVal}</td>
        <td class="text-center" style="font-weight:700; color:#0f172a;">${scaledVal}</td>
      `;
    });

    rowHtml += `</tr>`;
    return rowHtml;
  }).join("");
}

function exportConsolidatedCSV() {
  const c = document.getElementById("conClass").value || current.class;
  const s = document.getElementById("conSection").value || current.section;
  const examName = document.getElementById("conExamSel").value;
  const students = getClassObj(c, s).students;

  const k = getKey(c, s);
  const subjectExams = Object.values(data.exams).filter(e => e.classKey === k && e.name === examName);

  if (subjectExams.length === 0) return alert("No subject data available to export.");

  let csv = `PEARLS PUBLIC SCHOOL (CBSE) - Class ${c}-${s} ${examName} Consolidated Marksheet\n`;
  csv += `S.No,Admission No,Student Name,` + subjectExams.map(ex => `"${ex.subject} Raw(/${ex.max})","${ex.subject} (/100)"`).join(",") + `\n`;

  students.forEach((st, i) => {
    let row = `"${i + 1}","${st.admissionNo || ''}","${st.name}"`;
    subjectExams.forEach(ex => {
      let rawVal = "";
      let scaledVal = "";
      let entry = ex.marks[st.id];

      if (entry !== undefined && entry !== null && entry !== "") {
        if (ex.pattern === "term") {
          let termObj = typeof entry === "object" ? entry : { nbs: "", se: "", t: "", e: entry };
          let resData = calculateTermScore(termObj, ex.max);
          rawVal = resData.totalStr;
          scaledVal = typeof resData.total === "number" ? formatNum(resData.total) : resData.total;
        } else {
          let rawStr = String(entry).trim().toUpperCase();
          if (rawStr === "AB") {
            rawVal = "AB";
            scaledVal = "AB";
          } else if (!isNaN(rawStr)) {
            let [sc100] = calculateGrade(+rawStr, ex.max);
            rawVal = rawStr;
            scaledVal = formatNum(sc100);
          }
        }
      }
      row += `,"${rawVal}","${scaledVal}"`;
    });
    csv += row + `\n`;
  });

  const uri = encodeURI("data:text/csv;charset=utf-8," + csv);
  const link = document.createElement("a");
  link.setAttribute("href", uri);
  link.setAttribute("download", `Consolidated_Class_${c}${s}_${examName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// -------------------------------------------------------------
// STATISTICS & REPORTS
// -------------------------------------------------------------

function calculateStatistics(e) {
  let students = getClassObj().students;
  let isTerm = e.pattern === "term";
  let dynamicMax = +e.max || 80;
  let counts = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, D: 0, E1: 0, E2: 0 };
  let numericScores = [];
  let absCount = 0;
  let enteredCount = 0;

  students.forEach(s => {
    let val = e.marks[s.id];
    if (val === undefined || val === null || val === "") return;

    if (isTerm) {
      if (typeof val !== "object") val = { nbs: "", se: "", t: "", e: val };
      if (val.nbs === "" && val.se === "" && val.t === "" && (val.e === "" || val.e === undefined)) return;
      enteredCount++;
      let resData = calculateTermScore(val, dynamicMax);
      if (resData.total === "AB") {
        absCount++;
      } else if (typeof resData.total === "number") {
        numericScores.push(resData.total);
        if (counts[resData.grade] !== undefined) counts[resData.grade]++;
      }
    } else {
      let rawStr = String(val).toUpperCase();
      enteredCount++;
      if (rawStr === "AB") {
        absCount++;
      } else {
        let sc = +rawStr * 100 / dynamicMax;
        numericScores.push(sc);
        let [, grade] = calculateGrade(sc, 100);
        if (counts[grade] !== undefined) counts[grade]++;
      }
    }
  });

  let passCount = numericScores.filter(v => v >= 35).length;
  let attendedCount = numericScores.length;

  return {
    totalStudents: students.length,
    enteredCount,
    attendedCount,
    absentCount: absCount,
    average: attendedCount ? formatNum(numericScores.reduce((a, b) => a + b, 0) / attendedCount) : "0",
    counts,
    passed: passCount,
    failed: attendedCount - passCount,
    highest: attendedCount ? formatNum(Math.max(...numericScores)) : "0",
    lowest: attendedCount ? formatNum(Math.min(...numericScores)) : "0",
    passRate: attendedCount ? formatNum((passCount / attendedCount) * 100) : "0"
  };
}

function dashboard() {
  let totalEnrolled = getClassList().reduce((acc, item) => acc + item.students.length, 0);
  document.getElementById("dashStats").innerHTML = [
    ["Class Sections", getClassList().length],
    ["Students Stored", totalEnrolled],
    ["Exams Recorded", Object.keys(data.exams).length],
    ["Active Class", current.class || "—"],
    ["Active Section", current.section || "—"]
  ].map(x => `<div class="stat-card"><span>${x[0]}</span><b>${x[1]}</b></div>`).join("");
}

function renderSummary() {
  let examObj = data.exams[current.exam] || getExamsFor(current.class, current.section)[0];
  if (!examObj) {
    document.getElementById("sumStats").innerHTML = "<div class='card'>No exam entries saved for this class section.</div>";
    return;
  }
  current.exam = examObj.id;
  let stats = calculateStatistics(examObj);

  document.getElementById("sumStats").innerHTML = [
    ["Total Enrolled", stats.totalStudents],
    ["Evaluated", stats.enteredCount],
    ["Absent (AB)", stats.absentCount],
    ["Class Average", stats.average + "%"],
    ["Passed", stats.passed]
  ].map(x => `<div class="stat-card"><span>${x[0]}</span><b>${x[1]}</b></div>`).join("");

  const gradeRanges = {
    A1: "91 - 100", 
    A2: "81 - 90", 
    B1: "71 - 80", 
    B2: "61 - 70",
    C1: "51 - 60", 
    C2: "41 - 50", 
    D:  "33 - 40", 
    E1: "21 - 32", 
    E2: "00 - 20"  
  };

  document.getElementById("gradeRows").innerHTML = Object.entries(stats.counts).map(([grade, count]) => {
    let pct = stats.totalStudents ? formatNum((count / stats.totalStudents) * 100) : "0";
    return `<tr>
      <td class="text-center"><span class="badge badge-${grade.toLowerCase()}">${grade}</span></td>
      <td class="text-center">${gradeRanges[grade]}</td>
      <td class="text-center"><b>${count}</b></td>
      <td class="text-center">${pct}%</td>
    </tr>`;
  }).join("");

  document.getElementById("summaryTable").innerHTML = `
    <tr><th>Exam Title</th><td>${examObj.name}</td></tr>
    <tr><th>Subject</th><td>${examObj.subject}</td></tr>
    <tr><th>Exam Pattern</th><td>${examObj.pattern === 'term' ? `Term (NBS+SE+T+E${examObj.max})` : 'Mid Term'}</td></tr>
    <tr><th>Academic Year</th><td>${examObj.academicYear || "2026-27"}</td></tr>
    <tr><th>Exam Max Mark (E)</th><td>${examObj.max}</td></tr>
    <tr><th>Highest (/100)</th><td>${stats.highest}</td></tr>
    <tr><th>Lowest (/100)</th><td>${stats.lowest}</td></tr>
    <tr><th>Pass Rate (Attended)</th><td>${stats.passRate}%</td></tr>
  `;
}

function renderReport() {
  let examObj = data.exams[current.exam] || getExamsFor(current.class, current.section)[0];
  if (!examObj) {
    document.getElementById("reportPage").innerHTML = "<p>No exam details found.</p>";
    return;
  }
  current.exam = examObj.id;
  let students = getClassObj().students;
  let isTerm = examObj.pattern === "term";
  let examMax = +examObj.max || 80;
  let totalMax = 20 + examMax;
  let tableHeaderHtml = "";
  let rowsHtml = "";

  if (isTerm) {
    tableHeaderHtml = `
      <thead>
        <tr>
          <th class="text-center" style="width: 40px;">S.No</th>
          <th class="text-center" style="width: 100px;">Adm No.</th>
          <th class="text-left">Name of the Student</th>
          <th class="text-center" style="width: 60px;">NBS (5)</th>
          <th class="text-center" style="width: 60px;">SE (5)</th>
          <th class="text-center" style="width: 60px;">T (10)</th>
          <th class="text-center" style="width: 75px;">Exam (${examMax})</th>
          <th class="text-center" style="width: 75px;">Total (${totalMax})</th>
          <th class="text-center" style="width: 60px;">Grade</th>
          <th class="text-center" style="width: 70px;">Grade Pt</th>
          <th class="text-center" style="width: 70px;">Result</th>
        </tr>
      </thead>`;

    rowsHtml = students.map((s, i) => {
      let val = examObj.marks[s.id] || { nbs: "", se: "", t: "", e: "" };
      if (typeof val !== "object") val = { nbs: "", se: "", t: "", e: val };
      let resData = calculateTermScore(val, examMax);
      let resClass = getResultClass(resData.res);

      return `<tr>
        <td class="text-center">${i + 1}</td>
        <td class="text-center" style="font-weight:600; color: #475569;">${escapeHtml(s.admissionNo || "-")}</td>
        <td class="text-left">${escapeHtml(s.name)}</td>
        <td class="text-center">${val.nbs !== "" && val.nbs !== undefined ? val.nbs : '-'}</td>
        <td class="text-center">${val.se !== "" && val.se !== undefined ? val.se : '-'}</td>
        <td class="text-center">${val.t !== "" && val.t !== undefined ? val.t : '-'}</td>
        <td class="text-center">${val.e !== "" && val.e !== undefined ? val.e : '-'}</td>
        <td class="text-center"><b>${resData.totalStr}</b></td>
        <td class="text-center"><b>${resData.grade}</b></td>
        <td class="text-center">${resData.gradePoint}</td>
        <td class="text-center ${resClass}">${resData.res}</td>
      </tr>`;
    }).join("");

  } else {
    tableHeaderHtml = `
      <thead>
        <tr>
          <th class="text-center" style="width: 45px;">S.No</th>
          <th class="text-center" style="width: 110px;">Adm No.</th>
          <th class="text-left">Name of the Student</th>
          <th class="text-center" style="width: 100px;">Obtained Mark</th>
          <th class="text-center" style="width: 100px;">Mark (100)</th>
          <th class="text-center" style="width: 70px;">Grade</th>
          <th class="text-center" style="width: 80px;">Grade Point</th>
          <th class="text-center" style="width: 80px;">Result</th>
        </tr>
      </thead>`;

    rowsHtml = students.map((s, i) => {
      let val = typeof examObj.marks[s.id] === "object" ? (examObj.marks[s.id].e ?? "") : (examObj.marks[s.id] ?? "");
      let [score100, grade, gradePoint, res] = calculateGrade(val, examObj.max);
      let convertedText = score100 === "AB" ? "AB" : (score100 === "" ? "" : formatNum(score100));
      let resClass = getResultClass(res);

      return `<tr>
        <td class="text-center">${i + 1}</td>
        <td class="text-center" style="font-weight:600; color: #475569;">${escapeHtml(s.admissionNo || "-")}</td>
        <td class="text-left">${escapeHtml(s.name)}</td>
        <td class="text-center">${val}</td>
        <td class="text-center">${convertedText}</td>
        <td class="text-center"><b>${grade}</b></td>
        <td class="text-center">${gradePoint}</td>
        <td class="text-center ${resClass}">${res}</td>
      </tr>`;
    }).join("");
  }

  let stats = calculateStatistics(examObj);
  
  document.getElementById("reportPage").innerHTML = `
    <div style="text-align:center; margin-bottom:4px; font-weight:800; font-size:18px; color:var(--text-main); letter-spacing:0.5px;">
      PEARLS PUBLIC SCHOOL <span style="font-size:13px; font-weight:600;">(CBSE)</span>
    </div>
    <div style="text-align:center; margin-bottom:12px; font-weight:700; font-size:14px; color:var(--text-muted);">
      Class ${examObj.className}-${examObj.section} | Academic Year: ${examObj.academicYear || "2026-27"} | Exam: ${examObj.name} (${examObj.subject}) [${isTerm ? 'Term Pattern' : 'Mid Term Pattern'}]
    </div>
    
    <table class="data-table print-table">
      ${tableHeaderHtml}
      <tbody>${rowsHtml}</tbody>
    </table>
    
    <div style="margin-top:14px; font-size:12px; line-height:1.6;">
      <div>
        <b>Class Metrics:</b> &nbsp;
        <b>Total Enrolled:</b> ${stats.totalStudents} &nbsp;|&nbsp; 
        <b>Average:</b> ${stats.average}% &nbsp;|&nbsp; 
        <b>Passed:</b> ${stats.passed} &nbsp;|&nbsp; 
        <b>Absent:</b> ${stats.absentCount} &nbsp;|&nbsp; 
        <b>Pass Rate (Attended):</b> ${stats.passRate}%
      </div>
      <div style="margin-top:6px;">
        <b>Grade Counts:</b> &nbsp;${Object.entries(stats.counts).map(([gr, count]) => `<b>${gr}:</b> ${count}`).join(" &nbsp;|&nbsp; ")}
      </div>
    </div>
  `;
}

function downloadPDF() {
  const element = document.getElementById('reportPage');
  if (!element) return alert("No report available to download.");

  const opt = {
    margin:       [0.3, 0.3, 0.3, 0.3],
    filename:     `Academic_Report_Class_${current.class}${current.section}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
}

function exportToPages() {
  const examObj = data.exams[current.exam];
  if (!examObj) return alert("Select or generate an exam preview first.");

  const students = getClassObj().students;
  const isTerm = examObj.pattern === "term";
  const examMax = +examObj.max || 80;
  const stats = calculateStatistics(examObj);

  let rtf = "{\\rtf1\\ansi\\deff0\n";
  rtf += "{\\fonttbl{\\f0 Arial;}}\n";
  rtf += "{\\colortbl ;\\red0\\green128\\blue0;\\red220\\green38\\blue38;}\n";
  rtf += "\\viewkind4\\uc1\\pard\\qc\\b\\fs32 PEARLS PUBLIC SCHOOL \\fs22 (CBSE)\\par\\b0\n";
  rtf += `\\fs20 Class ${examObj.className}-${examObj.section} | Academic Year: ${examObj.academicYear || "2026-27"} | Exam: ${examObj.name} (${examObj.subject})\\par\\par\n`;

  rtf += "\\trowd\\trgaph70\\cellx600\\cellx2200\\cellx4800";
  if (isTerm) {
    rtf += "\\cellx5600\\cellx6400\\cellx7200\\cellx8200\\cellx9200\\cellx10000\\cellx10900\\cellx11800\n";
    rtf += "\\intbl\\b S.No\\cell Adm No.\\cell Student Name\\cell NBS (5)\\cell SE (5)\\cell T (10)\\cell Exam (" + examMax + ")\\cell Total\\cell Grade\\cell Grade Pt\\cell Result\\cell\\row\\b0\n";
  } else {
    rtf += "\\cellx6200\\cellx7500\\cellx8600\\cellx9700\\cellx11000\n";
    rtf += "\\intbl\\b S.No\\cell Adm No.\\cell Student Name\\cell Obtained Mark\\cell Mark (100)\\cell Grade\\cell Grade Pt\\cell Result\\cell\\row\\b0\n";
  }

  students.forEach((s, i) => {
    let adm = s.admissionNo || "-";
    let val = examObj.marks[s.id] ?? "";
    if (isTerm) {
      if (typeof val !== "object") val = { nbs: "", se: "", t: "", e: val };
      let resData = calculateTermScore(val, examMax);
      let resColor = resData.res === "Pass" ? "\\cf1" : "\\cf2";

      rtf += "\\trowd\\trgaph70\\cellx600\\cellx2200\\cellx4800\\cellx5600\\cellx6400\\cellx7200\\cellx8200\\cellx9200\\cellx10000\\cellx10900\\cellx11800\n";
      rtf += `\\intbl ${i + 1}\\cell ${adm}\\cell ${s.name}\\cell ${val.nbs || '-'}\\cell ${val.se || '-'}\\cell ${val.t || '-'}\\cell ${val.e || '-'}\\cell ${resData.totalStr}\\cell ${resData.grade}\\cell ${resData.gradePoint}\\cell ${resColor}\\b ${resData.res}\\b0\\cf0\\cell\\row\n`;
    } else {
      let [score100, grade, gradePoint, res] = calculateGrade(val, examObj.max);
      let convertedText = score100 === "AB" ? "AB" : (score100 === "" ? "" : formatNum(score100));
      let resColor = res === "Pass" ? "\\cf1" : "\\cf2";

      rtf += "\\trowd\\trgaph70\\cellx600\\cellx2200\\cellx4800\\cellx6200\\cellx7500\\cellx8600\\cellx9700\\cellx11000\n";
      rtf += `\\intbl ${i + 1}\\cell ${adm}\\cell ${s.name}\\cell ${val}\\cell ${convertedText}\\cell ${grade}\\cell ${gradePoint}\\cell ${resColor}\\b ${res}\\b0\\cf0\\cell\\row\n`;
    }
  });

  rtf += `\\pard\\sa100\\par\\b Class Metrics:\\b0  Total Enrolled: ${stats.totalStudents} | Average: ${stats.average}% | Passed: ${stats.passed} | Absent: ${stats.absentCount} | Pass Rate: ${stats.passRate}%\\par\n`;
  rtf += `\\b Grade Counts:\\b0  ${Object.entries(stats.counts).map(([gr, count]) => `${gr}: ${count}`).join(" | ")}\\par\n`;
  rtf += "}";

  const blob = new Blob([rtf], { type: "application/rtf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Report_Class_${examObj.className}${examObj.section}_${examObj.name}.rtf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportToWord() {
  const content = document.getElementById('reportPage');
  if (!content || !content.innerHTML.trim()) {
    return alert("Please generate the report preview first.");
  }

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Academic Report</title>
      <style>
        body { font-family: 'Calibri', Arial, sans-serif; font-size: 11pt; }
        .word-frame { border: 2px solid #000; padding: 15px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background-color: #f1f5f9; font-weight: bold; border: 1px solid #000; padding: 6px; font-size: 10pt; text-align: center; }
        td { border: 1px solid #000; padding: 5px; font-size: 10pt; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .pass-text { color: #10b981; font-weight: bold; }
        .fail-text, .ab-text { color: #ef4444; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="word-frame">
        ${content.innerHTML}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Academic_Report_Class_${current.class}${current.section}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportToExcel() {
  let examObj = data.exams[current.exam];
  if (!examObj) return alert("Select an exam first to export results.");

  let students = getClassObj().students;
  let isTerm = examObj.pattern === "term";
  let examMax = +examObj.max || 80;
  let totalMax = 20 + examMax;
  let csv = "";

  if (isTerm) {
    csv = `S.No,Admission No.,Student Name,NBS (5),SE (5),T (10),Exam (${examMax}),Total (${totalMax}),Grade,Grade Point,Result\n`;
    students.forEach((s, i) => {
      let val = examObj.marks[s.id] || { nbs: "", se: "", t: "", e: "" };
      if (typeof val !== "object") val = { nbs: "", se: "", t: "", e: val };
      let resData = calculateTermScore(val, examMax);
      csv += `"${i + 1}","${s.admissionNo || ''}","${s.name}","${val.nbs ?? ''}","${val.se ?? ''}","${val.t ?? ''}","${val.e ?? ''}","${resData.totalStr}","${resData.grade}","${resData.gradePoint}","${resData.res}"\n`;
    });
  } else {
    csv = "S.No,Admission No.,Student Name,Obtained Mark,Out of 100,Grade,Grade Point,Result\n";
    students.forEach((s, i) => {
      let val = typeof examObj.marks[s.id] === "object" ? (examObj.marks[s.id].e ?? "") : (examObj.marks[s.id] ?? "");
      let [score100, grade, gradePoint, res] = calculateGrade(val, examObj.max);
      let formattedScore = score100 === "AB" ? "AB" : (score100 === "" ? "" : formatNum(score100));
      csv += `"${i + 1}","${s.admissionNo || ''}","${s.name}","${val}","${formattedScore}","${grade}","${gradePoint}","${res}"\n`;
    });
  }

  let uri = encodeURI("data:text/csv;charset=utf-8," + csv);
  let link = document.createElement("a");
  link.setAttribute("href", uri);
  link.setAttribute("download", `Class_${examObj.className}${examObj.section}_${examObj.name}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function setFromSelector(prefix) {
  current.class = document.getElementById(prefix + "Class").value;
  current.section = document.getElementById(prefix + "Section").value;
  current.exam = "";
  if (prefix === "entry") document.getElementById("markCard").classList.add("hidden");
  populateDropdowns();
}

["entry", "sum", "rep"].forEach(p => {
  document.getElementById(p + "Class").onchange = () => setFromSelector(p);
  document.getElementById(p + "Section").onchange = () => setFromSelector(p);
});

document.getElementById("sumExam").onchange = e => {
  let found = getExamsFor(current.class, current.section).find(ex => ex.name === e.target.value);
  if (found) current.exam = found.id;
  renderSummary();
};

document.getElementById("repExam").onchange = e => {
  let found = getExamsFor(current.class, current.section).find(ex => ex.name === e.target.value);
  if (found) current.exam = found.id;
  renderReport();
};

// App Initialization
renderClasses();
populateDropdowns();
dashboard();
toggleExamPatternFields();