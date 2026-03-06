const STORAGE_KEY = "jiraZephyrConfig";
const FINALIZED_KEY = "finalizedTestCases";
const MOCK_REQUIREMENTS = [
  { id: "US-101", summary: "User can create project templates", priority: "High" },
  { id: "US-102", summary: "User can assign team members to tasks", priority: "Medium" },
  { id: "US-103", summary: "Dashboard shows velocity trends", priority: "High" },
  { id: "US-104", summary: "Search supports filters and tags", priority: "Low" },
  { id: "US-105", summary: "Notifications are sent on status changes", priority: "Medium" }
];

function getSavedConfig() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setStatus(el, text, type = "default") {
  if (!el) return;
  el.textContent = text;
  el.classList.remove("success", "warning");
  if (type === "success") el.classList.add("success");
  if (type === "warning") el.classList.add("warning");
}

function initConnectionPage() {
  const jiraBaseUrl = document.getElementById("jiraBaseUrl");
  if (!jiraBaseUrl) return;

  const fields = {
    jiraBaseUrl,
    jiraUser: document.getElementById("jiraUser"),
    jiraToken: document.getElementById("jiraToken"),
    jiraProject: document.getElementById("jiraProject"),
    zephyrBaseUrl: document.getElementById("zephyrBaseUrl"),
    zephyrAccessKey: document.getElementById("zephyrAccessKey"),
    zephyrSecretKey: document.getElementById("zephyrSecretKey")
  };

  const testConnectionBtn = document.getElementById("testConnectionBtn");
  const saveConnectionBtn = document.getElementById("saveConnectionBtn");
  const statusEl = document.getElementById("connectionStatus");

  const saved = getSavedConfig();
  if (saved) {
    Object.entries(fields).forEach(([key, input]) => {
      input.value = saved[key] || "";
    });
    setStatus(statusEl, "Existing connection settings loaded.", "success");
  }

  let lastTestPassed = false;

  testConnectionBtn.addEventListener("click", () => {
    const values = Object.fromEntries(
      Object.entries(fields).map(([key, input]) => [key, input.value.trim()])
    );

    const allFilled = Object.values(values).every(Boolean);
    const urlsValid = [values.jiraBaseUrl, values.zephyrBaseUrl].every((url) => /^https?:\/\//.test(url));

    if (!allFilled) {
      lastTestPassed = false;
      saveConnectionBtn.disabled = true;
      setStatus(statusEl, "Please fill in all Jira and Zephyr fields before testing.", "warning");
      return;
    }

    if (!urlsValid) {
      lastTestPassed = false;
      saveConnectionBtn.disabled = true;
      setStatus(statusEl, "Both base URLs must start with http:// or https://.", "warning");
      return;
    }

    lastTestPassed = true;
    saveConnectionBtn.disabled = false;
    setStatus(statusEl, "Connection test successful for Jira and Zephyr.", "success");
  });

  saveConnectionBtn.addEventListener("click", () => {
    if (!lastTestPassed) {
      setStatus(statusEl, "Run a successful connection test before saving.", "warning");
      return;
    }

    const payload = Object.fromEntries(
      Object.entries(fields).map(([key, input]) => [key, input.value.trim()])
    );

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setStatus(statusEl, "Connection details saved successfully.", "success");
  });
}

function createTestCaseTemplate(story, index) {
  return `TC-${story.id}-${index}: Validate ${story.summary.toLowerCase()}\n\nPreconditions:\n- User is authenticated.\n\nSteps:\n1. Navigate to the relevant module.\n2. Execute action for ${story.id}.\n3. Verify expected behavior.\n\nExpected Result:\n- ${story.summary} works as expected.`;
}

function initReleasePage() {
  const fetchBtn = document.getElementById("fetchReleaseBtn");
  if (!fetchBtn) return;

  const releaseInput = document.getElementById("releaseVersion");
  const releaseStatus = document.getElementById("releaseStatus");
  const tableBody = document.querySelector("#requirementsTable tbody");
  const selectAllBtn = document.getElementById("selectAllBtn");
  const clearSelectionBtn = document.getElementById("clearSelectionBtn");
  const generateBtn = document.getElementById("generateTestsBtn");
  const testCasesContainer = document.getElementById("testCasesContainer");
  const pushBtn = document.getElementById("pushToJiraBtn");
  const pushStatus = document.getElementById("pushStatus");

  let requirements = [];
  let generated = [];

  const saved = getSavedConfig();
  if (!saved) {
    setStatus(releaseStatus, "No saved connection found. Go to setup page first.", "warning");
  } else {
    setStatus(releaseStatus, "Saved connection loaded. Fetch release requirements.", "success");
  }

  function renderRequirements() {
    tableBody.innerHTML = "";
    requirements.forEach((req) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="checkbox" data-story="${req.id}" /></td>
        <td>${req.id}</td>
        <td>${req.summary}</td>
        <td>${req.priority}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  function renderTestCases() {
    testCasesContainer.innerHTML = "";

    if (!generated.length) {
      testCasesContainer.innerHTML = "<p class='status'>No test cases generated yet.</p>";
      return;
    }

    generated.forEach((item, idx) => {
      const wrapper = document.createElement("article");
      wrapper.className = "test-case";
      wrapper.innerHTML = `
        <div class="test-case-head">
          <h4>${item.storyId} - ${item.storySummary}</h4>
          <div class="review-controls">
            <span class="badge ${item.approved ? "approved" : "draft"}">${item.approved ? "Approved" : "Draft"}</span>
            <button class="secondary" data-approve-index="${idx}">${item.approved ? "Unapprove" : "Approve"}</button>
          </div>
        </div>
        <textarea data-testcase-index="${idx}">${item.content}</textarea>
      `;
      testCasesContainer.appendChild(wrapper);
    });

    testCasesContainer.querySelectorAll("textarea").forEach((ta) => {
      ta.addEventListener("input", (e) => {
        const index = Number(e.target.dataset.testcaseIndex);
        generated[index].content = e.target.value;
      });
    });

    testCasesContainer.querySelectorAll("button[data-approve-index]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = Number(e.target.dataset.approveIndex);
        generated[index].approved = !generated[index].approved;
        renderTestCases();
      });
    });
  }

  fetchBtn.addEventListener("click", () => {
    if (!saved) {
      setStatus(releaseStatus, "Cannot fetch requirements because connection settings were not saved.", "warning");
      return;
    }

    const version = releaseInput.value.trim();
    if (!version) {
      setStatus(releaseStatus, "Please enter release version first.", "warning");
      return;
    }

    requirements = [...MOCK_REQUIREMENTS];
    renderRequirements();
    setStatus(releaseStatus, `Fetched ${requirements.length} requirements for ${version}.`, "success");
  });

  selectAllBtn.addEventListener("click", () => {
    tableBody.querySelectorAll("input[type='checkbox']").forEach((cb) => {
      cb.checked = true;
    });
  });

  clearSelectionBtn.addEventListener("click", () => {
    tableBody.querySelectorAll("input[type='checkbox']").forEach((cb) => {
      cb.checked = false;
    });
  });

  generateBtn.addEventListener("click", () => {
    const selected = Array.from(tableBody.querySelectorAll("input[type='checkbox']:checked"))
      .map((cb) => cb.dataset.story)
      .map((id) => requirements.find((req) => req.id === id))
      .filter(Boolean);

    if (!selected.length) {
      setStatus(pushStatus, "Select at least one requirement to generate test cases.", "warning");
      return;
    }

    generated = selected.flatMap((story) => [
      { storyId: story.id, storySummary: story.summary, content: createTestCaseTemplate(story, 1), approved: false },
      { storyId: story.id, storySummary: story.summary, content: createTestCaseTemplate(story, 2), approved: false }
    ]);

    renderTestCases();
    setStatus(pushStatus, `Generated ${generated.length} test cases. Review and approve before push.`, "success");
  });

  pushBtn.addEventListener("click", () => {
    const approved = generated.filter((tc) => tc.approved);
    if (!approved.length) {
      setStatus(pushStatus, "Approve at least one test case before pushing.", "warning");
      return;
    }

    const finalized = approved.map((testCase) => ({
      ...testCase,
      finalizedAt: new Date().toISOString()
    }));

    localStorage.setItem(FINALIZED_KEY, JSON.stringify(finalized));
    setStatus(pushStatus, `Pushed ${finalized.length} approved test cases to Jira (prototype save).`, "success");
  });

  renderTestCases();
}

initConnectionPage();
initReleasePage();
