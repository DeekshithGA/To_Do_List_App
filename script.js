let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let archive = JSON.parse(localStorage.getItem("archive")) || [];
let editIndex = null;
let lastDeleted = null;
let showCompleted = true;

const taskList = document.getElementById("task-list");
const archiveList = document.getElementById("archive-list");
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const priorityInput = document.getElementById("priority-input");
const dueDateInput = document.getElementById("due-date-input");
const categoryInput = document.getElementById("category-input");
const attachmentInput = document.getElementById("attachment-input");
const recurringInput = document.getElementById("recurring-input");
const searchInput = document.getElementById("search-input");
const sortInput = document.getElementById("sort-input");
const clearCompletedBtn = document.getElementById("clear-completed");
const bulkCompleteBtn = document.getElementById("bulk-complete");
const clearAllBtn = document.getElementById("clear-all");
const undoBtn = document.getElementById("undo-btn");
const themeToggle = document.getElementById("theme-toggle");
const toggleCompletedBtn = document.getElementById("toggle-completed-visibility");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const editDialog = document.getElementById("edit-dialog");
const editForm = document.getElementById("edit-form");
const editTaskInput = document.getElementById("edit-task-input");
const cancelEditBtn = document.getElementById("cancel-edit");
const completeBar = document.getElementById("complete-bar");
const progressLabel = document.getElementById("progress-label");
const statsDiv = document.getElementById("stats");
const currentDateTimeDiv = document.getElementById("current-datetime");

function saveData() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
  localStorage.setItem("archive", JSON.stringify(archive));
}

function notifyDueTasks() {
  const today = new Date().toISOString().split("T")[0];
  tasks.forEach((task) => {
    if (!task.completed && task.dueDate) {
      if (task.dueDate < today) alert(`Task "${task.text}" is overdue!`);
      else if (task.dueDate === today) alert(`Task "${task.text}" is due today!`);
    }
  });
}

function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  currentDateTimeDiv.innerText = now.toLocaleDateString(undefined, options);
}

function updateProgress() {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const percent = total ? (completed / total) * 100 : 0;
  completeBar.value = percent;
  progressLabel.innerText = `${completed}/${total} tasks completed (${percent.toFixed(1)}%)`;
}

function updateStats() {
  const byCat = tasks.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {});
  const byPriority = tasks.reduce((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {});
  let html = "<b>Tasks by Category:</b><br>";
  Object.entries(byCat).forEach(([cat, count]) => {
    html += `${cat}: ${count}<br>`;
  });
  html += "<b>Tasks by Priority:</b><br>";
  Object.entries(byPriority).forEach(([pri, count]) => {
    html += `${pri}: ${count}<br>`;
  });
  statsDiv.innerHTML = html;
}

function renderTasks() {
  let filtered = tasks.filter(
    (task) =>
      task.text.toLowerCase().includes(searchInput.value.toLowerCase()) &&
      (showCompleted || !task.completed)
  );
  if (sortInput.value === "priority") {
    filtered.sort(
      (a, b) =>
        ["High", "Medium", "Low"].indexOf(a.priority) -
        ["High", "Medium", "Low"].indexOf(b.priority)
    );
  } else if (sortInput.value === "date") {
    filtered.sort(
      (a, b) =>
        new Date(a.dueDate || "2099-12-31") - new Date(b.dueDate || "2099-12-31")
    );
  }
  taskList.innerHTML = "";
  filtered.forEach((task, i) => {
    const li = document.createElement("li");
    li.className = `task-item ${task.completed ? "completed" : ""}`;
    li.draggable = true;
    li.dataset.index = i;
    let subtasks = "";
    if (task.subtasks && task.subtasks.length) {
      subtasks =
        "<ul>" +
        task.subtasks
          .map(
            (sub, j) =>
              `<li>
          <input type="checkbox" ${
            sub.completed ? "checked" : ""
          } data-subidx="${j}" class="sub-complete"/>
          ${sub.text}</li>`
          )
          .join("") +
        "</ul>";
    }
    li.innerHTML = `
      <input type="checkbox" ${
        task.completed ? "checked" : ""
      } class="complete-toggle" />
      <div class="task-info">
        <span class="priority-${task.priority}">[${task.priority}]</span>
        <span>${task.text}</span>
        <small>Due: ${task.dueDate || "N/A"}</small>
        <small>(${task.category})</small>
        ${
          task.attachment
            ? `<small>Attachment: ${task.attachment}</small>`
            : ""
        }
        ${task.recurring ? `<small>(Recurring)</small>` : ""}
        ${subtasks}
      </div>
      <div class="task-actions">
        <button class="edit-btn">Edit</button>
        <button class="add-subtask-btn">Add Subtask</button>
        <button class="archive-btn">Archive</button>
        <button class="delete-btn">Delete</button>
      </div>
    `;
    taskList.appendChild(li);
  });
  updateProgress();
  updateStats();
  renderArchive();
}

function renderArchive() {
  archiveList.innerHTML = "";
  archive.forEach((task, i) => {
    const li = document.createElement("li");
    li.className = "archive-item";
    li.innerHTML = `<div class="task-info">${task.text}</div>`;
    archiveList.appendChild(li);
  });
}

taskForm.onsubmit = function (e) {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return alert("Task cannot be empty");
  tasks.push({
    text,
    priority: priorityInput.value,
    dueDate: dueDateInput.value,
    category: categoryInput.value,
    attachment: attachmentInput.value,
    recurring: recurringInput.checked,
    completed: false,
    subtasks: [],
  });
  saveData();
  renderTasks();
  taskForm.reset();
};

taskList.onclick = function (e) {
  const li = e.target.closest(".task-item");
  if (!li) return;
  const idx = li.dataset.index;
  if (e.target.classList.contains("complete-toggle")) {
    if (tasks[idx].recurring && e.target.checked) {
      let nextDate = new Date(tasks[idx].dueDate || new Date());
      nextDate.setDate(nextDate.getDate() + 1);
      tasks[idx].dueDate = nextDate.toISOString().split("T")[0];
      tasks[idx].completed = false;
    } else {
      tasks[idx].completed = e.target.checked;
    }
    saveData();
    renderTasks();
  }
  if (e.target.classList.contains("sub-complete")) {
    const subidx = parseInt(e.target.getAttribute("data-subidx"));
    tasks[idx].subtasks[subidx].completed = e.target.checked;
    saveData();
    renderTasks();
  }
  if (e.target.classList.contains("edit-btn")) {
    editIndex = idx;
    editTaskInput.value = tasks[idx].text;
    editDialog.showModal();
  }
  if (e.target.classList.contains("add-subtask-btn")) {
    const txt = prompt("Subtask text?");
    if (txt && txt.trim() !== "") {
      tasks[idx].subtasks.push({ text: txt, completed: false });
      saveData();
      renderTasks();
    }
  }
  if (e.target.classList.contains("archive-btn")) {
    if (confirm("Are you sure you want to archive this task?")) {
      archive.push(tasks[idx]);
      tasks.splice(idx, 1);
      saveData();
      renderTasks();
    }
  }
  if (e.target.classList.contains("delete-btn")) {
    if (confirm("Delete this task?")) {
      lastDeleted = tasks.splice(idx, 1)[0];
      saveData();
      renderTasks();
      alert("Task deleted. Click Undo to restore.");
    }
  }
};

editForm.onsubmit = function (e) {
  e.preventDefault();
  tasks[editIndex].text = editTaskInput.value.trim();
  saveData();
  renderTasks();
  editDialog.close();
};
cancelEditBtn.onclick = () => editDialog.close();

searchInput.oninput = renderTasks;
sortInput.onchange = renderTasks;

clearCompletedBtn.onclick = function () {
  const completedTasks = tasks.filter((task) => task.completed);
  archive = archive.concat(completedTasks);
  tasks = tasks.filter((task) => !task.completed);
  saveData();
  renderTasks();
};

bulkCompleteBtn.onclick = function () {
  tasks.forEach((t) => (t.completed = true));
  saveData();
  renderTasks();
};

clearAllBtn.onclick = function () {
  if (
    confirm(
      "Are you sure you want to clear ALL tasks? This action cannot be undone."
    )
  ) {
    tasks = [];
    saveData();
    renderTasks();
  }
};

undoBtn.onclick = function () {
  if (lastDeleted) {
    tasks.push(lastDeleted);
    saveData();
    renderTasks();
    lastDeleted = null;
  }
};

toggleCompletedBtn.onclick = () => {
  showCompleted = !showCompleted;
  toggleCompletedBtn.innerText = showCompleted
    ? "Hide Completed"
    : "Show Completed";
  renderTasks();
};

themeToggle.onclick = function () {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
};

taskList.ondragstart = function (e) {
  e.dataTransfer.setData("text/plain", e.target.dataset.index);
};
taskList.ondragover = function (e) {
  e.preventDefault();
};
taskList.ondrop = function (e) {
  e.preventDefault();
  const draggedIdx = e.dataTransfer.getData("text/plain");
  const targetLi = e.target.closest(".task-item");
  if (!targetLi) return;
  const targetIdx = targetLi.dataset.index;
  if (draggedIdx === targetIdx) return;
  const [moved] = tasks.splice(draggedIdx, 1);
  tasks.splice(targetIdx, 0, moved);
  saveData();
  renderTasks();
};

exportBtn.onclick = () => {
  const blob = new Blob([JSON.stringify(tasks)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tasks.json";
  a.click();
  URL.revokeObjectURL(url);
};

importBtn.onchange = function (e) {
  const file = e.target.files[0];
  if (file) {
    file.text().then((json) => {
      tasks = JSON.parse(json);
      saveData();
      renderTasks();
    });
  }
};

window.onload = function () {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  }
  renderTasks();
  notifyDueTasks();
  updateDateTime();
  setInterval(updateDateTime, 1000);
};
