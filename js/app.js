const layout = document.querySelector(".layout");
const sidebar = document.querySelector(".sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const mobileMenuToggle = document.getElementById("mobileMenuToggle");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const profileDateTime = document.getElementById("profileDateTime");
const searchInput = document.querySelector(".search");

const statusModal = document.getElementById("statusModal");
const statusModalTitle = document.getElementById("statusModalTitle");
const statusModalMessage = document.getElementById("statusModalMessage");
const modalAction = document.querySelector(".modal-action");
const modalCancel = document.querySelector(".modal-cancel");
const modalCloseButtons = document.querySelectorAll(
  ".modal-close, .modal-cancel",
);

let modalActionHandler = null;
const wizards = new Map();

function openStatusModal(title, message, options = {}) {
  if (!statusModal) return;

  modalActionHandler = options.onAction || null;
  statusModalTitle.textContent = title;
  statusModalMessage.textContent = message;

  if (modalAction) {
    modalAction.textContent = options.actionText || "Done";
  }

  if (modalCancel) {
    modalCancel.hidden = !options.showCancel;
  }

  statusModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeStatusModal() {
  if (!statusModal) return;

  statusModal.hidden = true;
  document.body.classList.remove("modal-open");
  modalActionHandler = null;
}

function updateProfileDateTime() {
  if (!profileDateTime) return;

  profileDateTime.textContent = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

function closeMobileSidebar() {
  sidebar?.classList.remove("mobile-open");
  sidebarOverlay?.classList.remove("active");
  document.body.style.overflow = "auto";
}

function getActiveModule() {
  return document.querySelector(".module.active-module");
}

function switchModule(moduleName) {
  const targetModule = document.querySelector(`[data-module="${moduleName}"]`);
  if (!targetModule) return;

  document.querySelectorAll("[data-module]").forEach((module) => {
    const isActive = module === targetModule;
    module.hidden = !isActive;
    module.classList.toggle("active-module", isActive);
  });

  document.querySelectorAll(".nav").forEach((item) => {
    const isActive = item.dataset.moduleTarget === moduleName;
    item.classList.toggle("active", isActive);
    item.setAttribute("aria-current", isActive ? "page" : "false");
  });

  closeMobileSidebar();
}

function collectFormData(module) {
  const data = {};
  const fields = module.querySelectorAll("input, select, textarea");

  fields.forEach((field) => {
    if (!field.id) return;
    data[field.id] = field.value;
  });

  if (module.dataset.module === "sales-enquiry") {
    data.items = getTableData();
  }

  data.module = module.dataset.module;
  data.timestamp = new Date().toISOString();
  return data;
}

function initWizard(wizard) {
  let currentStep = 0;
  const tabs = Array.from(wizard.querySelectorAll(".step-tab"));
  const panels = Array.from(wizard.querySelectorAll(".step"));
  const prevBtn = wizard.querySelector("[data-wizard-prev]");
  const nextBtn = wizard.querySelector("[data-wizard-next]");

  function render() {
    panels.forEach((panel, index) => {
      panel.classList.toggle("active-step", index === currentStep);
    });

    tabs.forEach((tab, index) => {
      const isActive = index === currentStep;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.setAttribute("aria-disabled", "false");
      tab.tabIndex = 0;
    });

    if (prevBtn) {
      prevBtn.disabled = currentStep === 0;
    }

    if (nextBtn) {
      const isFinalStep = currentStep === panels.length - 1;
      nextBtn.innerHTML = isFinalStep
        ? '<span>Submit</span><i class="fa-solid fa-check"></i>'
        : '<span>Next</span><i class="fa-solid fa-arrow-right"></i>';
    }
  }

  function goToStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= panels.length) return;
    currentStep = stepIndex;
    render();
  }

  function submit() {
    const module = wizard.closest("[data-module]");
    const title = wizard.dataset.submitTitle || "Submitted";
    const message =
      wizard.dataset.submitMessage || "Record saved successfully.";
    console.log("Form Submitted:", collectFormData(module));
    openStatusModal(title, message);
  }

  function next() {
    if (currentStep < panels.length - 1) {
      currentStep += 1;
      render();
      return;
    }

    submit();
  }

  function previous() {
    if (currentStep > 0) {
      currentStep -= 1;
      render();
    }
  }

  prevBtn?.addEventListener("click", previous);
  nextBtn?.addEventListener("click", next);
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      const stepIndex = Number(tab.dataset.step ?? index);
      goToStep(Number.isNaN(stepIndex) ? index : stepIndex);
    });
  });

  render();

  return {
    render,
    submit,
    goToStep,
    getCurrentStep: () => currentStep,
  };
}

function addRow() {
  const table = document.getElementById("items");
  if (!table) return;

  const tbody = table.tBodies[0];
  const rowCount = tbody.rows.length + 1;
  const row = tbody.insertRow();

  row.innerHTML = `
    <td>${rowCount}</td>
    <td><input type="text" value="ITM-${String(rowCount).padStart(4, "0")}"></td>
    <td><input type="text" placeholder="Description"></td>
    <td><input type="text" placeholder="HSN"></td>
    <td><input type="number" value="0" min="0" class="qty-input"></td>
    <td><input type="text" value="Nos"></td>
    <td><input type="number" value="0.00" min="0" step="0.01"></td>
    <td>
      <select>
        <option>INR</option>
        <option>USD</option>
        <option>EUR</option>
      </select>
    </td>
    <td><input type="text" placeholder="Remarks"></td>
  `;

  updateTotals();
}

function getTableData() {
  const table = document.getElementById("items");
  if (!table) return [];

  return Array.from(table.tBodies[0].rows).map((row) => ({
    itemCode: row.cells[1].querySelector("input").value,
    description: row.cells[2].querySelector("input").value,
    hsn: row.cells[3].querySelector("input").value,
    qty: row.cells[4].querySelector("input").value,
    uom: row.cells[5].querySelector("input").value,
    targetPrice: row.cells[6].querySelector("input").value,
    currency: row.cells[7].querySelector("select").value,
    remarks: row.cells[8].querySelector("input").value,
  }));
}

function updateTotals() {
  const qtyInputs = document.querySelectorAll(
    "#items tbody td:nth-child(5) input[type='number']",
  );
  const totalQty = Array.from(qtyInputs).reduce(
    (sum, input) => sum + Number(input.value || 0),
    0,
  );
  const itemCount = document.querySelectorAll("#items tbody tr").length;

  const totalItems = document.getElementById("totalItems");
  const totalQtyEl = document.getElementById("totalQty");
  const badge = document.getElementById("itemsBadge");

  if (totalItems) totalItems.textContent = itemCount;
  if (totalQtyEl) totalQtyEl.textContent = totalQty;
  if (badge) badge.textContent = itemCount;
}

function resetModuleForm(module) {
  module.querySelectorAll("input, textarea").forEach((field) => {
    if (field.disabled) return;
    field.value = field.defaultValue || "";
  });

  module.querySelectorAll("select").forEach((field) => {
    field.selectedIndex = 0;
  });

  wizards.get(module.querySelector("[data-wizard]"))?.goToStep(0);
  updateTotals();
}

function handleToolbarAction(button) {
  const module = button.closest("[data-module]");
  const action = button.dataset.action;
  const moduleLabel =
    module.dataset.module === "customer-master"
      ? "Customer Master"
      : "Sales Enquiry";

  if (action === "discard") {
    openStatusModal("Discard Changes", `Discard this ${moduleLabel}?`, {
      actionText: "Discard",
      showCancel: true,
      onAction: () => resetModuleForm(module),
    });
    return;
  }

  if (action === "new") {
    resetModuleForm(module);
    openStatusModal("New Record", `${moduleLabel} form is ready.`);
    return;
  }

  if (action === "save") {
    const storageKey = `${module.dataset.module}_draft`;
    localStorage.setItem(storageKey, JSON.stringify(collectFormData(module)));
    openStatusModal("Draft Saved", `${moduleLabel} draft saved successfully.`);
    return;
  }

  if (action === "convert") {
    openStatusModal("Quotation", "Converting to quotation...");
    return;
  }

  if (action === "verify") {
    openStatusModal("GST Verification", "GST verification queued for demo.");
  }
}

const isSidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
if (isSidebarCollapsed) {
  layout?.classList.add("sidebar-collapsed");
  sidebar?.classList.add("collapsed");
}

sidebarToggle?.addEventListener("click", () => {
  layout?.classList.toggle("sidebar-collapsed");
  sidebar?.classList.toggle("collapsed");
  localStorage.setItem(
    "sidebarCollapsed",
    String(layout?.classList.contains("sidebar-collapsed")),
  );
});

mobileMenuToggle?.addEventListener("click", () => {
  sidebar?.classList.toggle("mobile-open");
  sidebarOverlay?.classList.toggle("active");
  document.body.style.overflow = sidebar?.classList.contains("mobile-open")
    ? "hidden"
    : "auto";
});

sidebarOverlay?.addEventListener("click", closeMobileSidebar);

document.querySelectorAll(".nav").forEach((navItem) => {
  navItem.addEventListener("click", () => {
    if (navItem.dataset.moduleTarget) {
      switchModule(navItem.dataset.moduleTarget);
      return;
    }

    document.querySelectorAll(".nav").forEach((item) => {
      item.classList.toggle("active", item === navItem);
      item.setAttribute("aria-current", item === navItem ? "page" : "false");
    });
    closeMobileSidebar();
  });
});

document.querySelectorAll("[data-wizard]").forEach((wizard) => {
  wizards.set(wizard, initWizard(wizard));
});

document.querySelectorAll("[data-add-row]").forEach((button) => {
  button.addEventListener("click", addRow);
});

document.getElementById("items")?.addEventListener("input", (event) => {
  if (event.target.classList.contains("qty-input")) {
    updateTotals();
  }
});

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => handleToolbarAction(button));
});

searchInput?.addEventListener("input", (event) => {
  console.log("Searching for:", event.target.value);
});

modalCloseButtons.forEach((button) => {
  button.addEventListener("click", closeStatusModal);
});

modalAction?.addEventListener("click", () => {
  const action = modalActionHandler;
  closeStatusModal();
  if (action) action();
});

statusModal?.addEventListener("click", (event) => {
  if (event.target === statusModal) {
    closeStatusModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && statusModal && !statusModal.hidden) {
    closeStatusModal();
  }
});

updateProfileDateTime();
updateTotals();
setInterval(updateProfileDateTime, 60000);

if (!getActiveModule()) {
  switchModule("sales-enquiry");
}
