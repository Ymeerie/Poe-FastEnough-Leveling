// Global levelingData - will be loaded from data.json
let levelingData = [];

// Get quest type icon
function getQuestIcon(type) {
    const icons = {
        'kill': '⚔️',
        'chat': '💬',
        'loot': '💰',
        'portal': '🌀',
        'door': '🚪',
        'run': '🏃‍♂️',
        'warning': '⚠️',
        'sail': '⛵',
        'setting': '⚙️'
    };
    return icons[type] || '📋';
}

// Get map location icon
function getMapIcon() {
    return '📍';
}

// Map image tooltip (supports multiple images gallery)
const _mapTooltip = (() => {
    const tooltip = document.createElement('div');
    tooltip.className = 'map-tooltip hidden';

    const img = document.createElement('img');
    img.className = 'map-tooltip-img';

    const controls = document.createElement('div');
    controls.className = 'map-tooltip-controls';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'map-tooltip-prev';
    prevBtn.textContent = '◀';

    const indicator = document.createElement('span');
    indicator.className = 'map-tooltip-indicator';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'map-tooltip-next';
    nextBtn.textContent = '▶';

    controls.appendChild(prevBtn);
    controls.appendChild(indicator);
    controls.appendChild(nextBtn);

    const description = document.createElement('div');
    description.className = 'map-tooltip-description';

    tooltip.appendChild(img);
    tooltip.appendChild(controls);
    tooltip.appendChild(description);
    document.body.appendChild(tooltip);

    let pinned = false;
    let visible = false;
    let images = [];
    let descriptions = [];
    let index = 0;

    function updateIndicator() {
        if (images.length > 1) indicator.textContent = `${index + 1} / ${images.length}`;
        else indicator.textContent = '';
    }

    function updateDescription() {
        if (descriptions && descriptions[index]) {
            description.innerHTML = descriptions[index];
            description.style.display = 'block';
        } else {
            description.innerHTML = '';
            description.style.display = 'none';
        }
    }

    function show(srcOrArray, descOrArray, clientX, clientY, pin = false) {
        const arr = Array.isArray(srcOrArray) ? srcOrArray.slice() : (srcOrArray ? [srcOrArray] : []);
        if (!arr || arr.length === 0) return;
        images = arr;
        descriptions = Array.isArray(descOrArray) ? descOrArray.slice() : (descOrArray ? [descOrArray] : []);
        index = 0;
        pinned = pin || pinned;
        visible = true;
        img.src = images[index];
        tooltip.classList.remove('hidden');
        updateIndicator();
        updateDescription();
        if (img.complete) position(clientX, clientY);
        else img.onload = () => position(clientX, clientY);
    }

    function position(clientX, clientY) {
        // Center on screen via CSS (left: 50%, top: 50%, transform: translate(-50%, -50%))
        // Position function is now a no-op
    }

    function hide(force = false) {
        if (pinned && !force) return;
        visible = false;
        tooltip.classList.add('hidden');
    }

    function setPin(val) {
        pinned = !!val;
        if (!pinned) hide(true);
    }

    function togglePin() {
        setPin(!pinned);
    }

    function showPrev() {
        if (images.length <= 1) return;
        index = (index - 1 + images.length) % images.length;
        img.src = images[index];
        updateIndicator();
        updateDescription();
    }

    function showNext() {
        if (images.length <= 1) return;
        index = (index + 1) % images.length;
        img.src = images[index];
        updateIndicator();
        updateDescription();
    }

    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); showPrev(); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); showNext(); });

    // Clicking outside tooltip or map icons should unpin/hide
    document.addEventListener('click', (e) => {
        if (tooltip.contains(e.target)) return;
        if (e.target.closest && e.target.closest('.map-has-image')) return;
        if (pinned || visible) {
            setPin(false);
            hide(true);
        }
    });

    // Keyboard navigation when tooltip is visible/pinned
    document.addEventListener('keydown', (e) => {
        if (!visible) return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); showPrev(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); showNext(); }
        if (e.key === 'Escape') { setPin(false); hide(true); }
    });

    return { show, position, hide, togglePin, setPin, isVisible: () => visible, isPinned: () => pinned };
})();

// State management
const tracker = {
    completedQuests: new Set(),
    completedTasks: new Set(),
    collapsedActs: new Set(),

    loadFromStorage() {
        const saved = localStorage.getItem('levelingTracker');
        if (saved) {
            const data = JSON.parse(saved);
            this.completedQuests = new Set(data.completedQuests || []);
            this.completedTasks = new Set(data.completedTasks || []);
            this.collapsedActs = new Set(data.collapsedActs || []);
        }
    },

    saveToStorage() {
        const data = {
            completedQuests: Array.from(this.completedQuests),
            completedTasks: Array.from(this.completedTasks),
            collapsedActs: Array.from(this.collapsedActs)
        };
        localStorage.setItem('levelingTracker', JSON.stringify(data));
    },

    toggleQuest(questId) {
        if (this.completedQuests.has(questId)) {
            this.completedQuests.delete(questId);
        } else {
            this.completedQuests.add(questId);
        }
        this.saveToStorage();
    },

    toggleTask(taskId) {
        if (this.completedTasks.has(taskId)) {
            this.completedTasks.delete(taskId);
        } else {
            this.completedTasks.add(taskId);
        }
        this.saveToStorage();
    },

    isQuestCompleted(questId) {
        return this.completedQuests.has(questId);
    },

    isTaskCompleted(taskId) {
        return this.completedTasks.has(taskId);
    },

    isActCollapsed(actId) {
        return this.collapsedActs.has(actId);
    },

    reset() {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone!')) {
            this.completedQuests.clear();
            this.completedTasks.clear();
            this.collapsedActs.clear();
            this.saveToStorage();
            render();
        }
    },

    getProgress() {
        let totalItems = 0;
        let completedItems = 0;

        levelingData.forEach(act => {
            act.maps.forEach(map => {
                map.quests.forEach(quest => {
                    totalItems++;
                    if (this.isQuestCompleted(quest.id)) {
                        completedItems++;
                    }
                });
            });
        });

        return {
            completed: completedItems,
            total: totalItems,
            percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
        };
    }
};

// Rendering
function render() {
    tracker.loadFromStorage();
    renderActs();
    updateStats();
}

function renderActs() {
    const container = document.getElementById('actsContainer');
    container.innerHTML = '';

    levelingData.forEach(act => {
        const actEl = createActElement(act);
        container.appendChild(actEl);
    });
}

function createActElement(act) {
    const actDiv = document.createElement('div');
    actDiv.className = 'act';
    actDiv.id = act.id;

    // If every map in this act is fully completed, auto-collapse the act
    const allMapsCompleted = act.maps && act.maps.length > 0 && act.maps.every(map =>
        map.quests && map.quests.length > 0 && map.quests.every(q => tracker.isQuestCompleted(q.id))
    );
    if (allMapsCompleted && !tracker.isActCollapsed(act.id)) {
        tracker.collapsedActs.add(act.id);
        tracker.saveToStorage();
    }

    const header = document.createElement('div');
    header.className = 'act-header';
    header.onclick = () => toggleActExpand(act.id);

    const titleContainer = document.createElement('div');
    titleContainer.className = 'act-title-container';

    const toggle = document.createElement('span');
    toggle.className = 'act-toggle';
    toggle.textContent = '▶';
    toggle.id = `toggle-${act.id}`;

    const title = document.createElement('h2');
    title.className = 'act-title';
    title.textContent = act.name;

    const progress = getActProgress(act);
    const progressSpan = document.createElement('span');
    progressSpan.className = 'act-progress';
    progressSpan.textContent = `(${progress.completed}/${progress.total} completed)`;

    titleContainer.appendChild(toggle);
    const actCheckbox = document.createElement('input');
    actCheckbox.type = 'checkbox';
    actCheckbox.className = 'act-checkbox';
    actCheckbox.checked = (progress.total > 0 && progress.completed === progress.total);
    actCheckbox.onclick = (e) => { e.stopPropagation(); };
    actCheckbox.onchange = () => {
        if (act.maps) {
            if (actCheckbox.checked) {
                act.maps.forEach(map => {
                    if (map.quests) map.quests.forEach(q => tracker.completedQuests.add(q.id));
                });
            } else {
                act.maps.forEach(map => {
                    if (map.quests) map.quests.forEach(q => tracker.completedQuests.delete(q.id));
                });
            }
        }
        tracker.saveToStorage();
        render();
    };
    titleContainer.appendChild(actCheckbox);
    titleContainer.appendChild(title);
    header.appendChild(titleContainer);
    header.appendChild(progressSpan);

    const content = document.createElement('div');
    content.className = 'act-content';
    content.id = `content-${act.id}`;

    if (tracker.isActCollapsed(act.id)) {
        content.classList.add('hidden');
        toggle.classList.remove('open');
    } else {
        toggle.classList.add('open');
    }

    act.maps.forEach(map => {
        const mapEl = createMapElement(map);
        content.appendChild(mapEl);
    });

    actDiv.appendChild(header);
    actDiv.appendChild(content);

    return actDiv;
}

function createMapElement(map) {
    const mapDiv = document.createElement('div');
    mapDiv.className = 'map';

    // Check if all quests in this map are completed
    const allQuestsCompleted = map.quests && map.quests.length > 0 && map.quests.every(quest => tracker.isQuestCompleted(quest.id));
    if (allQuestsCompleted) {
        mapDiv.classList.add('completed');
        // Auto-collapse quest list when map is fully completed
        mapDiv.classList.add('collapsed');
    }
    mapDiv.id = map.id;

    const header = document.createElement('div');
    header.className = 'map-header';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'map-checkbox';
    checkbox.checked = allQuestsCompleted;
    checkbox.onchange = () => {
        // If checked, mark all quests completed (do not uncheck already-checked quests)
        // If unchecked, remove completion from all quests in this map
        if (map.quests) {
            if (checkbox.checked) {
                map.quests.forEach(quest => {
                    tracker.completedQuests.add(quest.id);
                });
            } else {
                map.quests.forEach(quest => {
                    tracker.completedQuests.delete(quest.id);
                });
            }
        }
        tracker.saveToStorage();
        render();
    };

    const name = document.createElement('span');
    name.className = 'map-name';
    name.textContent = map.name;

    // Create icon only when map has image(s); attach click-only tooltip to it
    let icon = null;
    let images = [];
    let imageDescriptions = [];
    if (map.images && Array.isArray(map.images) && map.images.length > 0) {
        images = map.images;
    } else if (map.image) {
        images = Array.isArray(map.image) ? map.image : [map.image];
    }

    if (map.imageDescriptions && Array.isArray(map.imageDescriptions)) {
        imageDescriptions = map.imageDescriptions;
    } else if (map.imageDescription) {
        imageDescriptions = Array.isArray(map.imageDescription) ? map.imageDescription : [map.imageDescription];
    }

    if (images.length > 0) {
        icon = document.createElement('span');
        icon.className = 'map-icon map-has-image';
        icon.textContent = getMapIcon();
        icon.style.cursor = 'pointer';
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            const rect = icon.getBoundingClientRect();
            const clientX = Math.round(rect.left + rect.width / 2);
            const clientY = Math.round(rect.top + rect.height / 2);
            if (typeof _mapTooltip.isPinned === 'function' && _mapTooltip.isPinned()) {
                _mapTooltip.togglePin();
                return;
            }
            _mapTooltip.show(images, imageDescriptions, clientX, clientY, true);
        });
    }

    header.appendChild(checkbox);
    header.appendChild(name);
    if (icon) header.appendChild(icon);
    mapDiv.appendChild(header);

    if (map.quests && map.quests.length > 0) {
        const questsContainer = document.createElement('div');
        questsContainer.className = 'quests';

        map.quests.forEach(quest => {
            const questEl = createQuestElement(quest);
            questsContainer.appendChild(questEl);
        });

        mapDiv.appendChild(questsContainer);
    }

    return mapDiv;
}

function createQuestElement(quest) {
    const questDiv = document.createElement('div');
    questDiv.className = 'quest';
    if (tracker.isQuestCompleted(quest.id)) {
        questDiv.classList.add('completed');
    }
    questDiv.id = quest.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'quest-checkbox';
    checkbox.checked = tracker.isQuestCompleted(quest.id);
    checkbox.onchange = () => {
        tracker.toggleQuest(quest.id);
        render();
    };

    const icon = document.createElement('span');
    icon.className = 'quest-icon';
    icon.textContent = getQuestIcon(quest.type);

    const name = document.createElement('span');
    name.className = 'quest-name';
    name.textContent = quest.name;

    questDiv.appendChild(checkbox);
    questDiv.appendChild(icon);
    questDiv.appendChild(name);

    return questDiv;
}

function toggleActExpand(actId) {
    const content = document.getElementById(`content-${actId}`);
    const toggle = document.getElementById(`toggle-${actId}`);

    const collapsed = tracker.isActCollapsed(actId);
    if (collapsed) {
        tracker.collapsedActs.delete(actId);
        content.classList.remove('hidden');
        toggle.classList.add('open');
    } else {
        tracker.collapsedActs.add(actId);
        content.classList.add('hidden');
        toggle.classList.remove('open');
    }

    tracker.saveToStorage();
}

function updateStats() {
    const progress = tracker.getProgress();
    document.getElementById('completedCount').textContent = progress.completed;
    document.getElementById('totalCount').textContent = progress.total;
    document.getElementById('progressFill').style.width = progress.percentage + '%';
}

function getActProgress(act) {
    let completed = 0;
    let total = 0;

    act.maps.forEach(map => {
        map.quests.forEach(quest => {
            total++;
            if (tracker.isQuestCompleted(quest.id)) {
                completed++;
            }
        });
    });

    return { completed, total };
}

// Event listeners
document.getElementById('resetBtn').addEventListener('click', () => {
    tracker.reset();
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('data.json');
        levelingData = await response.json();
        tracker.loadFromStorage();
        render();
    } catch (error) {
        console.error('Failed to load data.json:', error);
        document.getElementById('actsContainer').innerHTML = '<p style="color: red;">Error loading data. Check console.</p>';
    }
});
