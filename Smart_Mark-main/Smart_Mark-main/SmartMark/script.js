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

let current = { class: "1", section: "A", exam: "", year: "2026-27" };

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function toast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.backgroundColor = isError ? "var(--danger-color)" : "var(--sidebar-bg)";
  t.style.display = "block";
  setTimeout(() => t.style.display = "none", 2500);
}

function getKey(c, s) { return `${c}|${s}`; }

function getClassObj() {
  return data.classes[getKey(current.class, current.section)] || { className: current.class, section: current.section, students: [] };
}

function formatNum(val) {
  if (val === "" || val === null || val === undefined || isNaN(val)) return val;
  let num = Number(val);
  return Number.isInteger(num) ? num.toString() : num.toFixed(2);
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
  
  if (valStr === "AB") {
    return ["AB", "-", "-", "AB"];
  }

  if (valStr === "" || isNaN(valStr) || maxMark <= 0) {
    return ["", "", "", ""];
  }

  let numVal = +valStr;
  let score100 = Math.max(0, Math.min(maxMark, numVal)) * 100 / maxMark;
  let grade = "", gradePoint = "";

  if (score100 >= 91) { grade = "A1"; gradePoint = "10.0"; }
  else if (score100 >= 81) { grade = "A2"; gradePoint = "9.0"; }
  else if (score100 >= 71) { grade = "B1"; gradePoint = "8.0"; }
  else if (score100 >= 61) { grade = "B2"; gradePoint = "7.0"; }
  else if (score100 >= 51) { grade = "C1"; gradePoint = "6.0"; }
  else if (score100 >= 41) { grade = "C2"; gradePoint = "5.0"; }
  else if (score100 >= 33) { grade = "D";  gradePoint = "4.0"; } // 33 to 40 (Grade D)
  else if (score100 >= 21) { grade = "E1"; gradePoint = "3.0"; } // 21 to 32 (Grade E1)
  else { grade = "E2"; gradePoint = "2.0"; }                     // 0 to 20 (Grade E2)

  let resultStatus = isPassing(score100) ? "Pass" : "Fail";
  return [score100, grade, gradePoint, resultStatus];
}

// Pass criterion strictly >= 35
function isPassing(score100) {
  return typeof score100 === "number" && score100 >= 35;
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
  document.getElementById(sectionId).classList.remove("hidden");
  
  if (sectionId === "dashboard") dashboard();
  if (sectionId === "classes") renderClasses();
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
  let name = document.getElementById("studentName").value.trim();
  if (!name) return alert("Enter Student Name.");
  if (!current.class || !current.section) return alert("Select Class and Section first.");
  getClassObj().students.push({ id: Date.now(), name });
  save();
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
  
  document.getElementById("students").innerHTML = (getClassObj().students || []).map((s, i) =>
    `<tr>
      <td class="text-center">${i + 1}</td>
      <td class="text-left"><b>${s.name}</b></td>
      <td style="text-align:right;"><button class="btn btn-danger" style="padding:4px 8px; font-size:12px;" onclick="deleteStudent(${s.id})">Remove</button></td>
    </tr>`
  ).join("");
}

document.getElementById("classSel").onchange = e => { current.class = e.target.value; current.section = getSections(current.class)[0] || ""; renderClasses(); };
document.getElementById("sectionSel").onchange = e => { current.section = e.target.value; renderClasses(); };

function populateDropdowns() {
  let cNames = getClassNames();
  ["entryClass", "sumClass", "repClass"].forEach(id => {
    fillSelect(id, cNames, "Select Class");
    document.getElementById(id).value = current.class;
  });
  ["entrySection", "sumSection", "repSection"].forEach(id => {
    fillSelect(id, getSections(current.class), "Select Section");
    document.getElementById(id).value = current.section;
  });
  let exams = getExamsFor(current.class, current.section).map(e => e.id);
  ["sumExam", "repExam"].forEach(id => {
    fillSelect(id, exams.map(x => data.exams[x].name), "Select Exam");
  });
}

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
        <th class="text-center" style="width: 50px;">S.No</th>
        <th class="text-left">Student Name</th>
        <th class="text-center" style="width: 75px;">NBS (5)</th>
        <th class="text-center" style="width: 75px;">SE (5)</th>
        <th class="text-center" style="width: 75px;">T (10)</th>
        <th class="text-center" style="width: 85px;">Exam (${dynamicExamMax})</th>
        <th class="text-center" style="width: 85px;">Total (${totalMax})</th>
        <th class="text-center" style="width: 65px;">Grade</th>
        <th class="text-center" style="width: 75px;">Grade Point</th>
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
        <td class="text-left"><b>${st.name}</b></td>
        <td class="text-center"><input type="text" class="input-control term-input" data-row="${i}" data-col="0" data-id="${st.id}" data-field="nbs" data-max="5" value="${val.nbs ?? ''}" style="width:75px; text-align:center;" placeholder="Mark/AB"></td>
        <td class="text-center"><input type="text" class="input-control term-input" data-row="${i}" data-col="1" data-id="${st.id}" data-field="se" data-max="5" value="${val.se ?? ''}" style="width:75px; text-align:center;" placeholder="Mark/AB"></td>
        <td class="text-center"><input type="text" class="input-control term-input" data-row="${i}" data-col="2" data-id="${st.id}" data-field="t" data-max="10" value="${val.t ?? ''}" style="width:75px; text-align:center;" placeholder="Mark/AB"></td>
        <td class="text-center"><input type="text" class="input-control term-input" data-row="${i}" data-col="3" data-id="${st.id}" data-field="e" data-max="${dynamicExamMax}" value="${val.e ?? ''}" style="width:85px; text-align:center;" placeholder="Mark/AB"></td>
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
        <th class="text-center" style="width: 50px;">S.No</th>
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

// Spreadsheet Keyboard Navigation
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

// Visual Range Verification
function validateAndClampInput(inp, maxOverride) {
  let max = maxOverride !== undefined ? maxOverride : +inp.dataset.max;
  let val = inp.value.trim().toUpperCase();

  inp.classList.remove("input-error");

  if (val === "" || val === "AB") return;

  if (isNaN(val)) {
    inp.classList.add("input-error");
    return;
  }

  let num = +val;
  if (num < 0 || (max && num > max)) {
    inp.classList.add("input-error");
  }
}

// Term Calculation: Sums all entered numeric scores even if Exam or other components are AB
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

  row.children[6].innerHTML = `<b>${resData.totalStr}</b>`;
  row.children[7].innerHTML = `<span class="${badgeClass}">${resData.grade}</span>`;
  row.children[8].textContent = resData.gradePoint;
  row.children[9].textContent = resData.res;
  row.children[9].className = `text-center ${getResultClass(resData.res)}`;
}

function createMarkRow(st, index, val, score100, grade, gradePoint, res) {
  let badgeClass = grade && grade !== "-" ? `badge badge-${grade.toLowerCase()}` : '';
  let convertedText = score100 === "AB" ? "AB" : (score100 === "" ? "" : formatNum(score100));
  let resClass = getResultClass(res);

  return `<tr>
    <td class="text-center">${index + 1}</td>
    <td class="text-left"><b>${st.name}</b></td>
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

  row.children[3].innerHTML = `<b>${convertedText}</b>`;
  row.children[4].innerHTML = `<span class="${badgeClass}">${grade}</span>`;
  row.children[5].textContent = gradePoint;
  row.children[6].textContent = res;
  row.children[6].className = `text-center ${getResultClass(res)}`;
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

  let passCount = numericScores.filter(v => v >= 35).length; // Pass is >= 35
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
          <th class="text-center" style="width: 45px;">S.No</th>
          <th class="text-left">Name</th>
          <th class="text-center" style="width: 65px;">NBS (5)</th>
          <th class="text-center" style="width: 65px;">SE (5)</th>
          <th class="text-center" style="width: 65px;">T (10)</th>
          <th class="text-center" style="width: 80px;">Exam (${examMax})</th>
          <th class="text-center" style="width: 80px;">Total (${totalMax})</th>
          <th class="text-center" style="width: 65px;">Grade</th>
          <th class="text-center" style="width: 75px;">Grade Pt</th>
          <th class="text-center" style="width: 75px;">Result</th>
        </tr>
      </thead>`;

    rowsHtml = students.map((s, i) => {
      let val = examObj.marks[s.id] || { nbs: "", se: "", t: "", e: "" };
      if (typeof val !== "object") val = { nbs: "", se: "", t: "", e: val };
      let resData = calculateTermScore(val, examMax);
      let resClass = getResultClass(resData.res);

      return `<tr>
        <td class="text-center">${i + 1}</td>
        <td class="text-left">${s.name}</td>
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
          <th class="text-center" style="width: 50px;">S.No</th>
          <th class="text-left">Name</th>
          <th class="text-center" style="width: 110px;">Obtained Mark</th>
          <th class="text-center" style="width: 110px;">Mark (100)</th>
          <th class="text-center" style="width: 75px;">Grade</th>
          <th class="text-center" style="width: 85px;">Grade Point</th>
          <th class="text-center" style="width: 85px;">Result</th>
        </tr>
      </thead>`;

    rowsHtml = students.map((s, i) => {
      let val = typeof examObj.marks[s.id] === "object" ? (examObj.marks[s.id].e ?? "") : (examObj.marks[s.id] ?? "");
      let [score100, grade, gradePoint, res] = calculateGrade(val, examObj.max);
      let convertedText = score100 === "AB" ? "AB" : (score100 === "" ? "" : formatNum(score100));
      let resClass = getResultClass(res);

      return `<tr>
        <td class="text-center">${i + 1}</td>
        <td class="text-left">${s.name}</td>
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
    <!-- School Header -->
    <div style="text-align:center; margin-bottom:4px; font-weight:800; font-size:18px; color:var(--text-main); letter-spacing:0.5px;">
      PEARLS PUBLIC SCHOOL <span style="font-size:13px; font-weight:600;">(CBSE)</span>
    </div>

    <!-- Exam Sub-Header -->
    <div style="text-align:center; margin-bottom:12px; font-weight:700; font-size:14px; color:var(--text-muted);">
      Class ${examObj.className}-${examObj.section} | Academic Year: ${examObj.academicYear || "2026-27"} | Exam: ${examObj.name} (${examObj.subject}) [${isTerm ? 'Term Pattern' : 'Mid Term Pattern'}]
    </div>
    
    <table class="data-table print-table">
      ${tableHeaderHtml}
      <tbody>${rowsHtml}</tbody>
    </table>
    
    <!-- Footer with labels only in bold, numbers in regular font -->
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

// Native Apple Pages (.rtf) Export
function exportToPages() {
  const examObj = data.exams[current.exam];
  if (!examObj) return alert("Select or generate an exam preview first.");

  const students = getClassObj().students;
  const isTerm = examObj.pattern === "term";
  const examMax = +examObj.max || 80;
  const stats = calculateStatistics(examObj);

  let rtf = "{\\rtf1\\ansi\\deff0\n";
  rtf += "{\\fonttbl{\\f0 Arial;}}\n";
  rtf += "{\\colortbl ;\\red0\\green128\\blue0;\\red220\\green38\\blue38;}\n"; // Green, Red
  rtf += "\\viewkind4\\uc1\\pard\\qc\\b\\fs32 PEARLS PUBLIC SCHOOL \\fs22 (CBSE)\\par\\b0\n";
  rtf += `\\fs20 Class ${examObj.className}-${examObj.section} | Academic Year: ${examObj.academicYear || "2026-27"} | Exam: ${examObj.name} (${examObj.subject})\\par\\par\n`;

  // RTF Table Headers
  rtf += "\\trowd\\trgaph70\\cellx800\\cellx3600";
  if (isTerm) {
    rtf += "\\cellx4500\\cellx5400\\cellx6300\\cellx7400\\cellx8400\\cellx9300\\cellx10200\\cellx11200\n";
    rtf += "\\intbl\\b S.No\\cell Student Name\\cell NBS (5)\\cell SE (5)\\cell T (10)\\cell Exam (" + examMax + ")\\cell Total\\cell Grade\\cell Grade Pt\\cell Result\\cell\\row\\b0\n";
  } else {
    rtf += "\\cellx5200\\cellx6700\\cellx7800\\cellx8900\\cellx10200\n";
    rtf += "\\intbl\\b S.No\\cell Student Name\\cell Obtained Mark\\cell Mark (100)\\cell Grade\\cell Grade Pt\\cell Result\\cell\\row\\b0\n";
  }

  // Rows
  students.forEach((s, i) => {
    let val = examObj.marks[s.id] ?? "";
    if (isTerm) {
      if (typeof val !== "object") val = { nbs: "", se: "", t: "", e: val };
      let resData = calculateTermScore(val, examMax);
      let resColor = resData.res === "Pass" ? "\\cf1" : "\\cf2";

      rtf += "\\trowd\\trgaph70\\cellx800\\cellx3600\\cellx4500\\cellx5400\\cellx6300\\cellx7400\\cellx8400\\cellx9300\\cellx10200\\cellx11200\n";
      rtf += `\\intbl ${i + 1}\\cell ${s.name}\\cell ${val.nbs || '-'}\\cell ${val.se || '-'}\\cell ${val.t || '-'}\\cell ${val.e || '-'}\\cell ${resData.totalStr}\\cell ${resData.grade}\\cell ${resData.gradePoint}\\cell ${resColor}\\b ${resData.res}\\b0\\cf0\\cell\\row\n`;
    } else {
      let [score100, grade, gradePoint, res] = calculateGrade(val, examObj.max);
      let convertedText = score100 === "AB" ? "AB" : (score100 === "" ? "" : formatNum(score100));
      let resColor = res === "Pass" ? "\\cf1" : "\\cf2";

      rtf += "\\trowd\\trgaph70\\cellx800\\cellx3600\\cellx5200\\cellx6700\\cellx7800\\cellx8900\\cellx10200\n";
      rtf += `\\intbl ${i + 1}\\cell ${s.name}\\cell ${val}\\cell ${convertedText}\\cell ${grade}\\cell ${gradePoint}\\cell ${resColor}\\b ${res}\\b0\\cf0\\cell\\row\n`;
    }
  });

  // Footer summary
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

// Client-Side Microsoft Word (.doc) Generation with 4-Sided Frame
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
    csv = `S.No,Student Name,NBS (5),SE (5),T (10),Exam (${examMax}),Total (${totalMax}),Grade,Grade Point,Result\n`;
    students.forEach((s, i) => {
      let val = examObj.marks[s.id] || { nbs: "", se: "", t: "", e: "" };
      if (typeof val !== "object") val = { nbs: "", se: "", t: "", e: val };
      let resData = calculateTermScore(val, examMax);
      csv += `"${i + 1}","${s.name}","${val.nbs ?? ''}","${val.se ?? ''}","${val.t ?? ''}","${val.e ?? ''}","${resData.totalStr}","${resData.grade}","${resData.gradePoint}","${resData.res}"\n`;
    });
  } else {
    csv = "S.No,Student Name,Obtained Mark,Out of 100,Grade,Grade Point,Result\n";
    students.forEach((s, i) => {
      let val = typeof examObj.marks[s.id] === "object" ? (examObj.marks[s.id].e ?? "") : (examObj.marks[s.id] ?? "");
      let [score100, grade, gradePoint, res] = calculateGrade(val, examObj.max);
      let formattedScore = score100 === "AB" ? "AB" : (score100 === "" ? "" : formatNum(score100));
      csv += `"${i + 1}","${s.name}","${val}","${formattedScore}","${grade}","${gradePoint}","${res}"\n`;
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