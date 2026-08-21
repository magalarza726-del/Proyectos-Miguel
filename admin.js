(() => {
  'use strict';

  const STORAGE_KEY = 'projectRandomizer:v1';
  const FLASH_KEY = 'projectRandomizer:flash';

  const els = {
    editProjectBtn: document.querySelector('#editProjectBtn'),
    manageMissionsBtn: document.querySelector('#manageMissionsBtn'),
    editProjectModal: document.querySelector('#editProjectModal'),
    editProjectName: document.querySelector('#editProjectName'),
    editProjectCategory: document.querySelector('#editProjectCategory'),
    saveProjectEditBtn: document.querySelector('#saveProjectEditBtn'),
    missionsModal: document.querySelector('#missionsModal'),
    missionsProjectName: document.querySelector('#missionsProjectName'),
    missionEditorList: document.querySelector('#missionEditorList'),
    addMissionRowBtn: document.querySelector('#addMissionRowBtn'),
    saveMissionsBtn: document.querySelector('#saveMissionsBtn'),
    projectList: document.querySelector('#projectList'),
    toast: document.querySelector('#toast')
  };

  if (!els.editProjectBtn || !els.manageMissionsBtn) return;

  let missionDraft = [];
  let missionProjectId = null;
  let toastTimer = null;

  function readState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!state || !Array.isArray(state.projects) || !Array.isArray(state.categories)) return null;
      return state;
    } catch {
      return null;
    }
  }

  function writeState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function selectedProject(state = readState()) {
    if (!state) return null;
    return state.projects.find(project => project.id === state.selectedProjectId) || null;
  }

  function notify(message) {
    if (!els.toast) return;
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add('show');
    toastTimer = window.setTimeout(() => els.toast.classList.remove('show'), 2500);
  }

  function saveFlash(message) {
    sessionStorage.setItem(FLASH_KEY, message);
  }

  function reloadWithFlash(message) {
    saveFlash(message);
    window.location.reload();
  }

  function consumeFlash() {
    const message = sessionStorage.getItem(FLASH_KEY);
    if (!message) return;
    sessionStorage.removeItem(FLASH_KEY);
    window.setTimeout(() => notify(message), 80);
  }

  function openModal(modal) {
    modal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeModal(modal) {
    modal.hidden = true;
    if (els.editProjectModal.hidden && els.missionsModal.hidden) {
      document.body.classList.remove('modal-open');
    }
  }

  function syncAdminButtons() {
    const exists = Boolean(selectedProject());
    els.editProjectBtn.disabled = !exists;
    els.manageMissionsBtn.disabled = !exists;
  }

  function openProjectEditor() {
    const state = readState();
    const project = selectedProject(state);
    if (!state || !project) return notify('Selecciona un proyecto para editarlo.');
    if (!state.categories.length) return notify('Primero necesitas al menos una categoría.');

    els.editProjectName.value = project.name;
    els.editProjectCategory.innerHTML = state.categories
      .map(category => `<option value="${escapeAttribute(category)}">${escapeHtml(category)}</option>`)
      .join('');
    els.editProjectCategory.value = project.category;
    openModal(els.editProjectModal);
    window.setTimeout(() => {
      els.editProjectName.focus();
      els.editProjectName.select();
    }, 0);
  }

  function saveProjectEdit() {
    const state = readState();
    const project = selectedProject(state);
    if (!state || !project) return closeModal(els.editProjectModal);

    const name = els.editProjectName.value.trim();
    const category = els.editProjectCategory.value;
    if (!name) return notify('El proyecto necesita un nombre.');
    if (!category) return notify('Selecciona una categoría.');
    if (state.projects.some(item => item.id !== project.id && item.name.toLowerCase() === name.toLowerCase())) {
      return notify('Ya existe otro proyecto con ese nombre.');
    }

    const previousName = project.name;
    project.name = name;
    project.category = category;
    state.activeCategory = category;
    state.selectedProjectId = project.id;
    state.resultProjectId = project.id;
    state.resultMissionIndex = Math.min(Number(state.resultMissionIndex) || 0, Math.max(0, project.missions.length - 1));
    writeState(state);

    const message = previousName === name
      ? `Proyecto “${name}” actualizado.`
      : `“${previousName}” ahora se llama “${name}”.`;
    reloadWithFlash(message);
  }

  function openMissionManager() {
    const state = readState();
    const project = selectedProject(state);
    if (!state || !project) return notify('Selecciona un proyecto para administrar sus misiones.');

    missionProjectId = project.id;
    missionDraft = Array.isArray(project.missions) ? [...project.missions] : [];
    els.missionsProjectName.textContent = project.name;
    renderMissionDraft();
    openModal(els.missionsModal);
  }

  function renderMissionDraft() {
    els.missionEditorList.innerHTML = '';

    if (!missionDraft.length) {
      const empty = document.createElement('div');
      empty.className = 'mission-editor-empty';
      empty.textContent = 'No hay misiones. Añade al menos una antes de guardar.';
      els.missionEditorList.appendChild(empty);
      return;
    }

    missionDraft.forEach((mission, index) => {
      const row = document.createElement('div');
      row.className = 'mission-editor-row';
      row.innerHTML = `
        <span class="mission-number">${index + 1}</span>
        <input class="text-input mission-edit-input" type="text" maxlength="160" value="${escapeAttribute(mission)}" aria-label="Misión ${index + 1}" />
        <div class="mission-row-actions">
          <button type="button" class="mini-action" data-action="up" title="Subir" aria-label="Subir misión" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="mini-action" data-action="down" title="Bajar" aria-label="Bajar misión" ${index === missionDraft.length - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" class="mini-action danger" data-action="delete" title="Eliminar" aria-label="Eliminar misión">×</button>
        </div>`;

      row.querySelector('input').addEventListener('input', event => {
        missionDraft[index] = event.target.value;
      });
      row.querySelector('[data-action="up"]').addEventListener('click', () => moveMission(index, -1));
      row.querySelector('[data-action="down"]').addEventListener('click', () => moveMission(index, 1));
      row.querySelector('[data-action="delete"]').addEventListener('click', () => {
        missionDraft.splice(index, 1);
        renderMissionDraft();
      });
      els.missionEditorList.appendChild(row);
    });
  }

  function moveMission(index, offset) {
    const target = index + offset;
    if (target < 0 || target >= missionDraft.length) return;
    [missionDraft[index], missionDraft[target]] = [missionDraft[target], missionDraft[index]];
    renderMissionDraft();
    const inputs = els.missionEditorList.querySelectorAll('input');
    inputs[target]?.focus();
  }

  function addMissionRow() {
    missionDraft.push('');
    renderMissionDraft();
    const inputs = els.missionEditorList.querySelectorAll('input');
    const last = inputs[inputs.length - 1];
    last?.focus();
  }

  function saveMissions() {
    const state = readState();
    if (!state) return notify('No pude leer los datos guardados.');
    const project = state.projects.find(item => item.id === missionProjectId);
    if (!project) return notify('El proyecto ya no existe.');

    const missions = missionDraft.map(item => item.trim()).filter(Boolean);
    if (!missions.length) return notify('Añade al menos una misión antes de guardar.');

    project.missions = missions;
    state.selectedProjectId = project.id;
    state.resultProjectId = project.id;
    state.resultMissionIndex = Math.min(Number(state.resultMissionIndex) || 0, missions.length - 1);
    writeState(state);
    reloadWithFlash(`${missions.length} ${missions.length === 1 ? 'misión guardada' : 'misiones guardadas'} en “${project.name}”.`);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character]));
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  els.editProjectBtn.addEventListener('click', openProjectEditor);
  els.manageMissionsBtn.addEventListener('click', openMissionManager);
  els.saveProjectEditBtn.addEventListener('click', saveProjectEdit);
  els.addMissionRowBtn.addEventListener('click', addMissionRow);
  els.saveMissionsBtn.addEventListener('click', saveMissions);
  els.editProjectName.addEventListener('keydown', event => {
    if (event.key === 'Enter') saveProjectEdit();
  });

  document.querySelectorAll('[data-close-modal]').forEach(button => {
    button.addEventListener('click', () => {
      const modal = document.getElementById(button.dataset.closeModal);
      if (modal) closeModal(modal);
    });
  });

  [els.editProjectModal, els.missionsModal].forEach(modal => {
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal(modal);
    });
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!els.missionsModal.hidden) closeModal(els.missionsModal);
    else if (!els.editProjectModal.hidden) closeModal(els.editProjectModal);
  });

  document.addEventListener('click', () => window.setTimeout(syncAdminButtons, 0));
  els.projectList?.addEventListener('dblclick', event => {
    if (event.target.closest('.list-item')) window.setTimeout(openProjectEditor, 0);
  });

  const observer = new MutationObserver(syncAdminButtons);
  if (els.projectList) observer.observe(els.projectList, { childList: true, subtree: true });

  syncAdminButtons();
  consumeFlash();
})();
