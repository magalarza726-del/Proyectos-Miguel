(() => {
  'use strict';

  const STORAGE_KEY = 'projectRandomizer:v1';
  const ALL_CATEGORY = 'Todas';

  const categoryIcons = {
    [ALL_CATEGORY]: '▦',
    'Literatura de ficción': '▣',
    'No ficción': '▤',
    'Juegos de Mesa': '♟',
    'Videojuegos': '🎮'
  };

  const projectIcons = {
    'OmegaZero': 'Ω',
    'ContraDrivers': '🎮',
    'QTE Fighter': '⚔',
    'ESPOL Builder': '▥',
    'Lectura Paralela': '▤',
    'Visualizador IO': '▥'
  };

  const starterState = {
    categories: ['Literatura de ficción', 'No ficción', 'Juegos de Mesa', 'Videojuegos'],
    projects: [
      {
        id: 'omega-zero',
        name: 'OmegaZero',
        category: 'Videojuegos',
        missions: ['Probar una partida completa', 'Revisar una visualización de Stockfish', 'Corregir un bug pequeño']
      },
      {
        id: 'contra-drivers',
        name: 'ContraDrivers',
        category: 'Videojuegos',
        missions: ['Probar IA durante 3 vueltas', 'Mejorar un tramo de la pista', 'Revisar controles y colisiones']
      },
      {
        id: 'qte-fighter',
        name: 'QTE Fighter',
        category: 'Videojuegos',
        missions: ['Jugar 3 combates completos', 'Revisar el balance de emblemas', 'Probar una secuencia de animación final']
      },
      {
        id: 'espol-builder',
        name: 'ESPOL Builder',
        category: 'Videojuegos',
        missions: ['Recorrer el mapa en primera persona', 'Mejorar un edificio del campus', 'Revisar escala y desplazamiento del mapa']
      },
      {
        id: 'lectura-paralela',
        name: 'Lectura Paralela',
        category: 'Literatura de ficción',
        missions: ['Probar un capítulo completo', 'Añadir un capítulo de prueba', 'Revisar audio y micrófono de un párrafo']
      },
      {
        id: 'visualizador-io',
        name: 'Visualizador IO',
        category: 'No ficción',
        missions: ['Probar una función completa', 'Revisar la visualización por columnas', 'Exportar un ejemplo de prueba']
      }
    ],
    activeCategory: 'Videojuegos',
    selectedProjectId: 'contra-drivers',
    resultProjectId: 'contra-drivers',
    resultMissionIndex: 0
  };

  const els = {
    categoryList: document.querySelector('#categoryList'),
    projectList: document.querySelector('#projectList'),
    newCategory: document.querySelector('#newCategory'),
    createCategoryBtn: document.querySelector('#createCategoryBtn'),
    newProject: document.querySelector('#newProject'),
    projectCategory: document.querySelector('#projectCategory'),
    projectMissions: document.querySelector('#projectMissions'),
    addProjectBtn: document.querySelector('#addProjectBtn'),
    focusNewProjectBtn: document.querySelector('#focusNewProjectBtn'),
    deleteProjectBtn: document.querySelector('#deleteProjectBtn'),
    categorySelect: document.querySelector('#categorySelect'),
    activeCategoryPill: document.querySelector('#activeCategoryPill'),
    resultCategory: document.querySelector('#resultCategory'),
    resultProject: document.querySelector('#resultProject'),
    resultMission: document.querySelector('#resultMission'),
    resultCard: document.querySelector('#resultCard'),
    randomProjectBtn: document.querySelector('#randomProjectBtn'),
    randomMissionBtn: document.querySelector('#randomMissionBtn'),
    changeCategoryBtn: document.querySelector('#changeCategoryBtn'),
    confetti: document.querySelector('#confetti'),
    toast: document.querySelector('#toast')
  };

  let state = loadState();
  normalizeState();

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(starterState);
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.categories) || !Array.isArray(parsed.projects)) return clone(starterState);
      return parsed;
    } catch {
      return clone(starterState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function normalizeState() {
    state.categories = [...new Set(state.categories.map(x => String(x).trim()).filter(Boolean))];
    state.projects = state.projects
      .filter(p => p && p.name && p.category)
      .map(p => ({
        id: p.id || createId(p.name),
        name: String(p.name).trim(),
        category: String(p.category).trim(),
        missions: Array.isArray(p.missions) && p.missions.length
          ? p.missions.map(x => String(x).trim()).filter(Boolean)
          : genericMissions(String(p.name).trim())
      }));
    for (const p of state.projects) {
      if (!state.categories.includes(p.category)) state.categories.push(p.category);
    }
    if (state.activeCategory !== ALL_CATEGORY && !state.categories.includes(state.activeCategory)) {
      state.activeCategory = state.categories[0] || ALL_CATEGORY;
    }
    if (!state.projects.some(p => p.id === state.selectedProjectId)) state.selectedProjectId = state.projects[0]?.id || null;
    if (!state.projects.some(p => p.id === state.resultProjectId)) state.resultProjectId = state.selectedProjectId;
    if (!Number.isInteger(state.resultMissionIndex)) state.resultMissionIndex = 0;
    saveState();
  }

  function createId(text) {
    const base = String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'proyecto';
    return `${base}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  function genericMissions(name) {
    return [
      `Avanzar 25 minutos en ${name}`,
      `Completar una mejora pequeña de ${name}`,
      `Probar ${name} y corregir un detalle visible`
    ];
  }

  function categoryIcon(name) {
    return categoryIcons[name] || '◆';
  }

  function projectIcon(name) {
    return projectIcons[name] || '●';
  }

  function filteredProjects() {
    if (state.activeCategory === ALL_CATEGORY) return state.projects;
    return state.projects.filter(p => p.category === state.activeCategory);
  }

  function selectedProject() {
    return state.projects.find(p => p.id === state.selectedProjectId) || null;
  }

  function resultProject() {
    return state.projects.find(p => p.id === state.resultProjectId) || null;
  }

  function render() {
    renderCategories();
    renderCategorySelects();
    renderProjects();
    renderResult();
  }

  function renderCategories() {
    els.categoryList.innerHTML = '';
    const categories = [ALL_CATEGORY, ...state.categories];
    categories.forEach(category => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `list-item${state.activeCategory === category ? ' active' : ''}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(state.activeCategory === category));
      item.innerHTML = `<span class="item-icon">${escapeHtml(categoryIcon(category))}</span><span class="item-name">${escapeHtml(category)}</span>`;
      item.addEventListener('click', () => setActiveCategory(category));
      els.categoryList.appendChild(item);
    });
  }

  function renderCategorySelects() {
    const categories = [ALL_CATEGORY, ...state.categories];
    els.categorySelect.innerHTML = categories.map(c => `<option value="${escapeAttribute(c)}">${escapeHtml(c === state.activeCategory ? 'Cambiar' : c)}</option>`).join('');
    els.categorySelect.value = state.activeCategory;
    Array.from(els.categorySelect.options).forEach(opt => { opt.textContent = opt.value === state.activeCategory ? 'Cambiar' : opt.value; });

    els.projectCategory.innerHTML = state.categories.map(c => `<option value="${escapeAttribute(c)}">${escapeHtml(c)}</option>`).join('');
    const sensibleCategory = state.activeCategory !== ALL_CATEGORY && state.categories.includes(state.activeCategory)
      ? state.activeCategory
      : state.categories[0];
    if (sensibleCategory) els.projectCategory.value = sensibleCategory;

    const icon = categoryIcon(state.activeCategory);
    els.activeCategoryPill.textContent = `${icon} ${state.activeCategory}`;
  }

  function renderProjects() {
    els.projectList.innerHTML = '';
    const projects = filteredProjects();
    if (!projects.length) {
      els.projectList.innerHTML = '<div class="empty-state">No hay proyectos en esta categoría.</div>';
      return;
    }

    if (!projects.some(p => p.id === state.selectedProjectId)) state.selectedProjectId = projects[0].id;

    projects.forEach(project => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `list-item${state.selectedProjectId === project.id ? ' active' : ''}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(state.selectedProjectId === project.id));
      item.innerHTML = `
        <span class="item-icon">${escapeHtml(projectIcon(project.name))}</span>
        <span class="item-name">${escapeHtml(project.name)}</span>
        <span class="item-tag">${escapeHtml(project.category)}</span>`;
      item.addEventListener('click', () => {
        state.selectedProjectId = project.id;
        saveState();
        renderProjects();
      });
      els.projectList.appendChild(item);
    });
  }

  function renderResult() {
    let project = resultProject();
    if (!project) {
      const fallback = filteredProjects()[0] || state.projects[0] || null;
      if (fallback) {
        state.resultProjectId = fallback.id;
        state.resultMissionIndex = 0;
        project = fallback;
        saveState();
      }
    }

    if (!project) {
      els.resultCategory.textContent = state.activeCategory;
      els.resultProject.textContent = 'Sin proyectos';
      els.resultMission.textContent = 'Agrega un proyecto para comenzar';
      els.randomMissionBtn.disabled = true;
      return;
    }

    const missions = project.missions.length ? project.missions : genericMissions(project.name);
    const index = Math.max(0, Math.min(state.resultMissionIndex, missions.length - 1));
    state.resultMissionIndex = index;
    els.resultCategory.textContent = project.category;
    els.resultProject.textContent = project.name;
    els.resultMission.textContent = missions[index];
    els.randomMissionBtn.disabled = false;
  }

  function setActiveCategory(category) {
    state.activeCategory = category;
    const visible = filteredProjects();
    if (visible.length) state.selectedProjectId = visible[0].id;
    saveState();
    render();
  }

  function addCategory() {
    const value = els.newCategory.value.trim();
    if (!value) return notify('Escribe un nombre para la categoría.');
    if (value.toLowerCase() === ALL_CATEGORY.toLowerCase() || state.categories.some(c => c.toLowerCase() === value.toLowerCase())) {
      return notify('Esa categoría ya existe.');
    }
    state.categories.push(value);
    state.activeCategory = value;
    els.newCategory.value = '';
    saveState();
    render();
    notify(`Categoría “${value}” creada.`);
  }

  function addProject() {
    const name = els.newProject.value.trim();
    const category = els.projectCategory.value;
    if (!name) return notify('Escribe el nombre del proyecto.');
    if (!category) return notify('Primero crea una categoría.');
    if (state.projects.some(p => p.name.toLowerCase() === name.toLowerCase())) return notify('Ya existe un proyecto con ese nombre.');

    const customMissions = els.projectMissions.value.split('\n').map(x => x.trim()).filter(Boolean);
    const project = {
      id: createId(name),
      name,
      category,
      missions: customMissions.length ? customMissions : genericMissions(name)
    };
    state.projects.push(project);
    state.activeCategory = category;
    state.selectedProjectId = project.id;
    state.resultProjectId = project.id;
    state.resultMissionIndex = 0;
    els.newProject.value = '';
    els.projectMissions.value = '';
    saveState();
    render();
    animateResult();
    notify(`Proyecto “${name}” guardado.`);
  }

  function deleteSelectedProject() {
    const project = selectedProject();
    if (!project) return notify('Selecciona un proyecto para eliminarlo.');
    const ok = window.confirm(`¿Eliminar “${project.name}”? Esta acción no se puede deshacer.`);
    if (!ok) return;

    state.projects = state.projects.filter(p => p.id !== project.id);
    const visible = filteredProjects();
    state.selectedProjectId = visible[0]?.id || state.projects[0]?.id || null;
    if (state.resultProjectId === project.id) {
      state.resultProjectId = state.selectedProjectId;
      state.resultMissionIndex = 0;
    }
    saveState();
    render();
    notify(`Proyecto “${project.name}” eliminado.`);
  }

  function chooseRandomProject() {
    const pool = filteredProjects();
    if (!pool.length) return notify('No hay proyectos disponibles en esta categoría.');
    const previousId = state.resultProjectId;
    let chosen = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && chosen.id === previousId) {
      const alternatives = pool.filter(p => p.id !== previousId);
      chosen = alternatives[Math.floor(Math.random() * alternatives.length)];
    }
    state.resultProjectId = chosen.id;
    state.selectedProjectId = chosen.id;
    state.resultMissionIndex = Math.floor(Math.random() * chosen.missions.length);
    saveState();
    renderProjects();
    renderResult();
    animateResult(true);
  }

  function chooseRandomMission() {
    const project = resultProject();
    if (!project) return notify('Primero selecciona un proyecto.');
    const missions = project.missions.length ? project.missions : genericMissions(project.name);
    if (missions.length <= 1) {
      state.resultMissionIndex = 0;
    } else {
      let next = state.resultMissionIndex;
      while (next === state.resultMissionIndex) next = Math.floor(Math.random() * missions.length);
      state.resultMissionIndex = next;
    }
    saveState();
    renderResult();
    animateResult(false);
  }

  function cycleCategory() {
    const categories = [ALL_CATEGORY, ...state.categories];
    if (!categories.length) return;
    const index = Math.max(0, categories.indexOf(state.activeCategory));
    setActiveCategory(categories[(index + 1) % categories.length]);
  }

  function animateResult(withConfetti = false) {
    els.resultCard.classList.remove('flash');
    void els.resultCard.offsetWidth;
    els.resultCard.classList.add('flash');
    if (withConfetti) launchConfetti();
  }

  function launchConfetti() {
    els.confetti.innerHTML = '';
    const colors = ['#1769ed', '#ffb703', '#18a866', '#ef4444', '#7c3aed'];
    for (let i = 0; i < 26; i += 1) {
      const piece = document.createElement('i');
      piece.className = 'confetti-piece';
      piece.style.left = `${5 + Math.random() * 90}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${Math.random() * 120}ms`;
      piece.style.transform = `rotate(${Math.random() * 180}deg)`;
      els.confetti.appendChild(piece);
    }
    window.setTimeout(() => { els.confetti.innerHTML = ''; }, 1200);
  }

  let toastTimer;
  function notify(message) {
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add('show');
    toastTimer = window.setTimeout(() => els.toast.classList.remove('show'), 2400);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  els.createCategoryBtn.addEventListener('click', addCategory);
  els.newCategory.addEventListener('keydown', event => { if (event.key === 'Enter') addCategory(); });
  els.addProjectBtn.addEventListener('click', addProject);
  els.focusNewProjectBtn.addEventListener('click', () => { els.newProject.focus(); els.newProject.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  els.deleteProjectBtn.addEventListener('click', deleteSelectedProject);
  els.randomProjectBtn.addEventListener('click', chooseRandomProject);
  els.randomMissionBtn.addEventListener('click', chooseRandomMission);
  els.changeCategoryBtn.addEventListener('click', cycleCategory);
  els.categorySelect.addEventListener('change', event => {
    const value = event.target.value;
    if (value && ([ALL_CATEGORY, ...state.categories].includes(value))) setActiveCategory(value);
  });

  render();
})();
