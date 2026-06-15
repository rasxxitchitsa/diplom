const API_BASE = '/api';
let currentPatternId = null;
let currentScale = 1.0;
let savedPatternIds = [];
let currentCategory = 'all';
let myUploads = [];
let savedFromCatalog = [];

let currentPdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let currentUserId = localStorage.getItem('currentUserId');

let notesPanelOpen = false;
let currentNotes = '';

const catalogList = document.getElementById('catalogList');
const myUploadsList = document.getElementById('myUploadsList');
const savedCatalogList = document.getElementById('savedCatalogList');
const canvas = document.getElementById('patternCanvas');
const ctx = canvas.getContext('2d');
const noPatternMsg = document.getElementById('noPatternMsg');
const scaleValue = document.getElementById('scaleValue');

let authToken = localStorage.getItem('authToken');
let currentUsername = localStorage.getItem('currentUsername');

let yarns = [];
let currentSelectedYarn = null;
let favoriteYarnIds = new Set();
let savedYarns = [];

let aiWindowOpen = false;
const aiToggleBtn = document.getElementById('aiToggleBtn');
const aiChatWindow = document.getElementById('aiChatWindow');
const aiCloseBtn = document.getElementById('aiCloseBtn');
const aiInput = document.getElementById('aiInput');
const aiSendBtn = document.getElementById('aiSendBtn');
const aiMessages = document.getElementById('aiMessages');

let searchDebounceTimer = null;
let currentSearchTypeGlobal = 'patterns';

const globalSearchInput = document.getElementById('globalSearchInput');
const searchDropdown = document.getElementById('searchDropdown');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const closeSearchDropdown = document.getElementById('closeSearchDropdown');
const searchDropdownResults = document.getElementById('searchDropdownResults');
const searchTabBtns = document.querySelectorAll('.search-tab-btn');
const patternsFiltersMini = document.getElementById('patternsFiltersMini');
const yarnsFiltersMini = document.getElementById('yarnsFiltersMini');
const searchCategoryMini = document.getElementById('searchCategoryMini');
const searchDifficultyMini = document.getElementById('searchDifficultyMini');
const searchBrandMini = document.getElementById('searchBrandMini');
const searchCompositionMini = document.getElementById('searchCompositionMini');
const searchMaterialsMini = document.getElementById('searchMaterialsMini');
const searchCountryMini = document.getElementById('searchCountryMini');
const searchHookSizeMini = document.getElementById('searchHookSizeMini');
const searchNeedleSizeMini = document.getElementById('searchNeedleSizeMini');
const searchWeightFromMini = document.getElementById('searchWeightFromMini');
const searchWeightToMini = document.getElementById('searchWeightToMini');
const searchLengthFromMini = document.getElementById('searchLengthFromMini');
const searchLengthToMini = document.getElementById('searchLengthToMini');

let allCatalogPatterns = [];
let selectedCategories = [];
let selectedDifficulties = [];
let selectedMaterials = [];

let currentCatalogSubtab = 'schemes';
let selectedYarnBrands = [];
let selectedYarnCompositions = [];
let selectedYarnCountries = [];
let allYarns = [];

let selectedPriceTypes = [];

let currentRole = localStorage.getItem('currentRole') || null;
let adminPatternCategories = [];


function getYarnImageUrl(path) {
    if (!path) return null;
    return `${API_BASE}/yarns/image/${path}?t=${Date.now()}`;
}

function isAdmin() {
    return authToken && currentRole === 'ADMIN';
}

let md;
try {
    md = window.markdownit();
} catch(e) {
    console.error('Markdown-it not loaded', e);
    md = { render: (t) => t };
}


async function loadAllYarns(force = false) {
    if (!force && allYarns.length) return allYarns;
    try {
        const res = await fetch(`${API_BASE}/yarns`);
        if (!res.ok) throw new Error('Ошибка загрузки пряжи');
        allYarns = await res.json();
        return allYarns;
    } catch (err) {
        console.error(err);
        allYarns = [];
        return [];
    }
}

function showSearchDropdown() {
    const query = globalSearchInput.value.trim();
    let hasFilters = false;
    if (currentSearchTypeGlobal === 'patterns') {
        hasFilters = !!(searchCategoryMini.value || searchDifficultyMini.value || searchMaterialsMini.value);
    } else {
        hasFilters = !!(searchBrandMini.value.trim() || searchCompositionMini.value.trim() || searchCountryMini.value.trim() ||
        searchHookSizeMini.value.trim() || searchNeedleSizeMini.value.trim() ||
        searchWeightFromMini.value || searchWeightToMini.value ||
        searchLengthFromMini.value || searchLengthToMini.value);
    }
    if (query.length > 0 || hasFilters) {
        searchDropdown.style.display = 'block';
    }
}
function hideSearchDropdown() {
    searchDropdown.style.display = 'none';
}

function switchSearchType(type) {
    currentSearchTypeGlobal = type;
    searchTabBtns.forEach(btn => {
        if (btn.dataset.searchType === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    if (type === 'patterns') {
        patternsFiltersMini.style.display = 'flex';
        yarnsFiltersMini.style.display = 'none';
    } else {
        patternsFiltersMini.style.display = 'none';
        yarnsFiltersMini.style.display = 'flex';
    }

    if (globalSearchInput.value.trim() === '') {
        if (type === 'patterns') {
            showLatestPatternsInSearch();
        } else {
            showLatestYarnsInSearch();
        }
        showSearchDropdown();
    } else {
        performGlobalSearch();
        showSearchDropdown();
    }
}

async function performGlobalSearch() {
    const query = globalSearchInput.value.trim();

    if (query.length > 0) {
        searchDropdownResults.innerHTML = '<div class="empty">Поиск...</div>';
        try {
            if (currentSearchTypeGlobal === 'patterns') {
                const category = searchCategoryMini.value;
                const difficulty = searchDifficultyMini.value;
                const materials = searchMaterialsMini.value;
                let url = `${API_BASE}/search/patterns?q=${encodeURIComponent(query)}`;
                if (category) url += `&category=${encodeURIComponent(category)}`;
                if (difficulty) url += `&difficulty=${encodeURIComponent(difficulty)}`;
                if (materials) url += `&materials=${encodeURIComponent(materials)}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Ошибка ${res.status}`);
                const patterns = await res.json();
                renderGlobalSearchPatterns(patterns);
            } else {
                const brand = searchBrandMini.value.trim();
                const composition = searchCompositionMini.value.trim();
                const country = searchCountryMini.value.trim();
                const hookSize = searchHookSizeMini.value.trim();
                const needleSize = searchNeedleSizeMini.value.trim();
                const weightFrom = searchWeightFromMini.value ? parseFloat(searchWeightFromMini.value) : null;
                const weightTo = searchWeightToMini.value ? parseFloat(searchWeightToMini.value) : null;
                const lengthFrom = searchLengthFromMini.value ? parseFloat(searchLengthFromMini.value) : null;
                const lengthTo = searchLengthToMini.value ? parseFloat(searchLengthToMini.value) : null;

                let url = `${API_BASE}/search/yarns?q=${encodeURIComponent(query)}`;
                if (brand) url += `&brand=${encodeURIComponent(brand)}`;
                if (composition) url += `&composition=${encodeURIComponent(composition)}`;
                if (country) url += `&country=${encodeURIComponent(country)}`;
                if (hookSize) url += `&hookSize=${encodeURIComponent(hookSize)}`;
                if (needleSize) url += `&needleSize=${encodeURIComponent(needleSize)}`;
                if (weightFrom) url += `&weightFrom=${weightFrom}`;
                if (weightTo) url += `&weightTo=${weightTo}`;
                if (lengthFrom) url += `&lengthFrom=${lengthFrom}`;
                if (lengthTo) url += `&lengthTo=${lengthTo}`;

                const res = await fetch(url);
                if (!res.ok) throw new Error(`Ошибка ${res.status}`);
                const yarns = await res.json();
                renderGlobalSearchYarns(yarns);
            }
        } catch (err) {
            console.error(err);
            searchDropdownResults.innerHTML = `<div class="empty">❌ Ошибка поиска: ${err.message}</div>`;
        }
        return;
    }

    let hasFilters = false;
    if (currentSearchTypeGlobal === 'patterns') {
        const category = searchCategoryMini.value;
        const difficulty = searchDifficultyMini.value;
        const materials = searchMaterialsMini.value;
        hasFilters = !!(category || difficulty || materials);
    } else {
        const brand = searchBrandMini.value.trim();
        const composition = searchCompositionMini.value.trim();
        const country = searchCountryMini.value.trim();
        const hookSize = searchHookSizeMini.value.trim();
        const needleSize = searchNeedleSizeMini.value.trim();
        const weightFrom = searchWeightFromMini.value;
        const weightTo = searchWeightToMini.value;
        const lengthFrom = searchLengthFromMini.value;
        const lengthTo = searchLengthToMini.value;
        hasFilters = !!(brand || composition || country || hookSize || needleSize ||
        weightFrom || weightTo || lengthFrom || lengthTo);
    }

    if (hasFilters) {
        searchDropdownResults.innerHTML = '<div class="empty">Поиск по фильтрам...</div>';
        try {
            if (currentSearchTypeGlobal === 'patterns') {
                const category = searchCategoryMini.value;
                const difficulty = searchDifficultyMini.value;
                const materials = searchMaterialsMini.value;
                let url = `${API_BASE}/search/patterns?q=`;
                if (category) url += `&category=${encodeURIComponent(category)}`;
                if (difficulty) url += `&difficulty=${encodeURIComponent(difficulty)}`;
                if (materials) url += `&materials=${encodeURIComponent(materials)}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Ошибка ${res.status}`);
                const patterns = await res.json();
                renderGlobalSearchPatterns(patterns);
            } else {
                const brand = searchBrandMini.value.trim();
                const composition = searchCompositionMini.value.trim();
                const country = searchCountryMini.value.trim();
                const hookSize = searchHookSizeMini.value.trim();
                const needleSize = searchNeedleSizeMini.value.trim();
                const weightFrom = searchWeightFromMini.value ? parseFloat(searchWeightFromMini.value) : null;
                const weightTo = searchWeightToMini.value ? parseFloat(searchWeightToMini.value) : null;
                const lengthFrom = searchLengthFromMini.value ? parseFloat(searchLengthFromMini.value) : null;
                const lengthTo = searchLengthToMini.value ? parseFloat(searchLengthToMini.value) : null;

                let url = `${API_BASE}/search/yarns?q=`;
                if (brand) url += `&brand=${encodeURIComponent(brand)}`;
                if (composition) url += `&composition=${encodeURIComponent(composition)}`;
                if (country) url += `&country=${encodeURIComponent(country)}`;
                if (hookSize) url += `&hookSize=${encodeURIComponent(hookSize)}`;
                if (needleSize) url += `&needleSize=${encodeURIComponent(needleSize)}`;
                if (weightFrom) url += `&weightFrom=${weightFrom}`;
                if (weightTo) url += `&weightTo=${weightTo}`;
                if (lengthFrom) url += `&lengthFrom=${lengthFrom}`;
                if (lengthTo) url += `&lengthTo=${lengthTo}`;

                const res = await fetch(url);
                if (!res.ok) throw new Error(`Ошибка ${res.status}`);
                const yarns = await res.json();
                renderGlobalSearchYarns(yarns);
            }
        } catch (err) {
            console.error(err);
            searchDropdownResults.innerHTML = `<div class="empty">❌ Ошибка фильтрации: ${err.message}</div>`;
        }
    } else {
        if (currentSearchTypeGlobal === 'patterns') {
            showLatestPatternsInSearch();
        } else {
            showLatestYarnsInSearch();
        }
    }
}

function onFilterChange() {
    if (globalSearchInput.value.trim() === '') {
        showSearchDropdown();
    }
    performGlobalSearch();
}

function renderGlobalSearchPatterns(patterns, isLatest = false) {
    if (!patterns.length) {
        searchDropdownResults.innerHTML = '<div class="empty">Ничего не найдено</div>';
        return;
    }

    let html = '';
    if (isLatest) {
        html += '<div class="latest-header">Новинки схем!</div>';
    }
    html += `<div class="pattern-grid">`;
    patterns.forEach(p => {
        const thumbnailHtml = p.thumbnailPath
        ? `<div class="pattern-thumbnail"><img src="/api/thumbnails/${p.thumbnailPath}" alt="${escapeHtml(p.name)}"></div>`
        : `<div class="pattern-icon">${getCategoryIcon(p.categoryName)}</div>`;
        const isSaved = p.saved;
        const isOwn = p.own;
        let saveButtonHtml = '';
        html += `
            <div class="catalog-card" data-id="${p.id}" data-type="pattern">
                ${thumbnailHtml}
                <div class="pattern-name">${escapeHtml(p.name)}</div>
                <div class="pattern-author">
                    <span class="author-link" data-author-id="${p.userId || ''}" data-author-name="${escapeHtml(p.author || 'Неизвестный автор')}">
                        ${escapeHtml(p.author || 'Неизвестный автор')}
                    </span>
                </div>
                ${saveButtonHtml}
            </div>
        `;
    });
    html += `</div>`;
    searchDropdownResults.innerHTML = html;

    document.querySelectorAll('.author-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            const userId = link.dataset.authorId;
            const authorName = link.dataset.authorName;
            showAuthorProfile(userId, authorName);
        });
    });

    document.querySelectorAll('#searchDropdownResults .catalog-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.target.classList.contains('save-from-search-global')) return;
            const id = parseInt(card.dataset.id);
            showPatternDetail(id);
        });
        const saveBtn = card.querySelector('.save-from-search-global');
        if (saveBtn) {
            saveBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = parseInt(saveBtn.dataset.id);
                await saveToLibrary(id);
                performGlobalSearch();
            });
        }
    });
}

async function showLatestPatternsInSearch() {
    try {
        const res = await fetch(`${API_BASE}/catalog`);
        const all = await res.json();
        const sorted = all.sort((a,b) => new Date(b.uploadDate) - new Date(a.uploadDate));
        const latest = sorted.slice(0, 6);
        if (latest.length) {
            renderGlobalSearchPatterns(latest, true);
        } else {
            searchDropdownResults.innerHTML = '<div class="empty">✨ Схем пока нет</div>';
        }
    } catch (err) {
        searchDropdownResults.innerHTML = '<div class="empty">🔍 Начните вводить текст для поиска</div>';
    }
}

async function showLatestYarnsInSearch() {
    try {
        const res = await fetch(`${API_BASE}/yarns`);
        let yarns = await res.json();
        const sorted = yarns.sort((a,b) => (b.id || 0) - (a.id || 0));
        const latest = sorted.slice(0, 6);
        if (latest.length) {
            renderGlobalSearchYarns(latest, true);
        } else {
            searchDropdownResults.innerHTML = '<div class="empty">🧶 Пряжи пока нет</div>';
        }
    } catch (err) {
        searchDropdownResults.innerHTML = '<div class="empty">🔍 Начните вводить текст для поиска</div>';
    }
}

function renderGlobalSearchYarns(yarns, isLatest = false) {
    if (!yarns.length) {
        searchDropdownResults.innerHTML = '<div class="empty">Ничего не найдено</div>';
        return;
    }
    let html = '';
    if (isLatest) {
        html += '<div class="latest-header">Новинки пряжи!</div>';
    }
    html += `<div class="pattern-grid">`;
    yarns.forEach(y => {
        let stitches = y.stitches;
        let rows = y.rows;
        if ((!stitches || !rows) && y.gauge) {
            const match = y.gauge.match(/(\d+)\D+(\d+)/);
            if (match) {
                stitches = parseInt(match[1], 10);
                rows = parseInt(match[2], 10);
            }
        }
        const gaugeText = (stitches && rows) ? `${stitches}п x ${rows}р` : '';
        html += `
            <div class="catalog-card" data-id="${y.id}" data-type="yarn">
                ${y.imagePath ? `<div class="pattern-thumbnail"><img src="${getYarnImageUrl(y.imagePath)}" alt="${escapeHtml(y.name)}"></div>` : `<div class="pattern-icon">🧵</div>`}                <div class="pattern-name">${escapeHtml(y.name)}</div>
                <div class="pattern-author">${escapeHtml(y.brand || 'Бренд не указан')}</div>
            </div>
        `;
    });
    html += `</div>`;
    searchDropdownResults.innerHTML = html;

    document.querySelectorAll('#searchDropdownResults .catalog-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(card.dataset.id);
            showYarnDetail(id);
        });
    });
}

globalSearchInput.addEventListener('focus', () => {
    const query = globalSearchInput.value.trim();
    if (query.length === 0) {
        if (currentSearchTypeGlobal === 'patterns') {
            showLatestPatternsInSearch();
        } else {
            showLatestYarnsInSearch();
        }
        searchDropdown.style.display = 'block';
    } else {
        if (searchDropdownResults.innerHTML === '' || searchDropdownResults.innerHTML.includes('Начните вводить')) {
            performGlobalSearch();
        }
        searchDropdown.style.display = 'block';
    }
});

globalSearchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val.length > 0) {
        clearSearchBtn.style.display = 'block';
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            performGlobalSearch();
            showSearchDropdown();
        }, 300);
    } else {
        clearSearchBtn.style.display = 'none';
        if (currentSearchTypeGlobal === 'patterns') {
            showLatestPatternsInSearch();
        } else {
            showLatestYarnsInSearch();
        }
        showSearchDropdown();
    }
});

clearSearchBtn.addEventListener('click', () => {
    globalSearchInput.value = '';
    clearSearchBtn.style.display = 'none';
    hideSearchDropdown();
    searchDropdownResults.innerHTML = '<div class="empty">Начните вводить текст для поиска</div>';
    globalSearchInput.focus();
});

closeSearchDropdown.addEventListener('click', hideSearchDropdown);

document.addEventListener('click', (e) => {
    if (!searchDropdown.contains(e.target) && e.target !== globalSearchInput && !searchWrapper.contains(e.target)) {
        hideSearchDropdown();
    }
});
const searchWrapper = document.querySelector('.search-wrapper');

searchTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        switchSearchType(btn.dataset.searchType);
    });
});

searchCategoryMini.addEventListener('change', onFilterChange);
searchDifficultyMini.addEventListener('change', onFilterChange);
searchBrandMini.addEventListener('input', () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(onFilterChange, 300);
});
searchCompositionMini.addEventListener('input', () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(onFilterChange, 300);
});
searchMaterialsMini.addEventListener('change', onFilterChange);
searchCountryMini.addEventListener('input', () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(onFilterChange, 300);
});
searchHookSizeMini.addEventListener('input', () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(onFilterChange, 300);
});
searchNeedleSizeMini.addEventListener('input', () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(onFilterChange, 300);
});
searchWeightFromMini.addEventListener('input', () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(onFilterChange, 300);
});
searchWeightToMini.addEventListener('input', () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(onFilterChange, 300);
});
searchLengthFromMini.addEventListener('input', () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(onFilterChange, 300);
});
searchLengthToMini.addEventListener('input', () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(onFilterChange, 300);
});


currentSearchTypeGlobal = 'patterns';
patternsFiltersMini.style.display = 'flex';
yarnsFiltersMini.style.display = 'none';
if (globalSearchInput.value.trim() === '') {
    showLatestPatternsInSearch();
}

function addMessage(text, isUser = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-message ${isUser ? 'user' : 'bot'}`;
    if (isUser) {
        msgDiv.innerText = text;
    } else {
        msgDiv.innerHTML = md.render(text);
    }
    aiMessages.appendChild(msgDiv);
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

function isPatternSearchRequest(message) {
    const keywords = ['покажи схемы', 'найди схему', 'рекомендуй схему', 'схемы', 'как связать', 'схема для', 'котят', 'шапку', 'шарф', 'игрушку'];
    return keywords.some(kw => message.toLowerCase().includes(kw));
}

async function sendToAI() {
    const message = aiInput.value.trim();
    if (!message) return;
    addMessage(message, true);
    aiInput.value = '';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-message bot';
    typingDiv.innerText = '...';
    aiMessages.appendChild(typingDiv);
    aiMessages.scrollTop = aiMessages.scrollHeight;

    try {
        const url = `${API_BASE}/ai/chat`;
        const body = JSON.stringify({ userQuestion: message });

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body
        });

        if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);

        const data = await response.json();
        typingDiv.remove();

        addMessage(data.message, false);

        if (data.patternIds && data.patternIds.length) {
            await showPatternCardsInline(data.patternIds);
        }
        if (data.yarnIds && data.yarnIds.length) {
            await showYarnCardsInline(data.yarnIds);
        }
    } catch (err) {
        console.error('AI Error:', err);
        typingDiv.remove();
        addMessage('❌ Ошибка связи с ассистентом. Попробуйте позже.', false);
    }
}

async function showPatternCardsInline(patternIds) {
    if (!patternIds.length) return;
    const catalogRes = await fetch(`${API_BASE}/catalog`);
    const allPatterns = await catalogRes.json();
    const patterns = allPatterns.filter(p => patternIds.includes(p.id));
    if (!patterns.length) return;

    const container = document.createElement('div');
    container.className = 'pattern-grid';
    container.style.marginTop = '12px';
    container.innerHTML = patterns.map(p => {
        const thumbnailHtml = p.thumbnailPath
        ? `<div class="pattern-thumbnail"><img src="/api/thumbnails/${p.thumbnailPath}" alt="${escapeHtml(p.name)}"></div>`
        : `<div class="pattern-icon">${getCategoryIcon(p.categoryName )}</div>`;
        return `
            <div class="catalog-card" data-id="${p.id}">
                ${thumbnailHtml}
                <div class="pattern-name">${escapeHtml(p.name)}</div>
                <div class="pattern-author">${escapeHtml(p.author || 'Неизвестный автор')}</div>
                <div class="pattern-price">${p.price && p.price > 0 ? p.price + ' ₽' : 'Бесплатно'}</div>
            </div>
        `;
    }).join('');

    aiMessages.appendChild(container);
    container.querySelectorAll('.catalog-card').forEach(card => {
        card.addEventListener('click', () => showPatternDetail(parseInt(card.dataset.id)));
    });
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

async function showYarnCardsInline(yarnIds) {
    if (!yarnIds || !yarnIds.length) return;
    let allYarns = await loadAllYarns();
    const yarns = allYarns.filter(y => yarnIds.includes(y.id));
    if (!yarns.length) return;

    const container = document.createElement('div');
    container.className = 'pattern-grid';
    container.style.marginTop = '12px';
    container.innerHTML = yarns.map(y => {
        let stitches = y.stitches, rows = y.rows;
        if ((!stitches || !rows) && y.gauge) {
            const match = y.gauge.match(/(\d+)\D+(\d+)/);
            if (match) {
                stitches = parseInt(match[1], 10);
                rows = parseInt(match[2], 10);
            }
        }
        const gaugeText = (stitches && rows) ? `${stitches}п x ${rows}р` : '';
        return `
            <div class="catalog-card" data-id="${y.id}" data-type="yarn">
                ${y.imagePath ? `<div class="pattern-thumbnail"><img src="${getYarnImageUrl(y.imagePath)}" alt="${escapeHtml(y.name)}"></div>` : `<div class="pattern-icon">🧵</div>`}
                <div class="pattern-name">${escapeHtml(y.name)}</div>
                <div class="pattern-author">${escapeHtml(y.brand || 'Бренд не указан')}</div>
                ${gaugeText ? `<div class="pattern-gauge">${gaugeText}</div>` : ''}
            </div>
        `;
    }).join('');

    aiMessages.appendChild(container);
    container.querySelectorAll('.catalog-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            showYarnDetail(id, false);
        });
    });
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

async function fetchCatalogForIds(ids) {
    const res = await fetch(`${API_BASE}/catalog`);
    const all = await res.json();
    return all.filter(p => ids.includes(p.id));
}

aiToggleBtn.addEventListener('click', () => {
    aiChatWindow.style.display = aiChatWindow.style.display === 'none' ? 'flex' : 'none';
});
aiCloseBtn.addEventListener('click', () => {
    aiChatWindow.style.display = 'none';
});
aiSendBtn.addEventListener('click', sendToAI);
aiInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendToAI();
});


function fetchWithAuth(url, options = {}) {
    const headers = options.headers || {};
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    return fetch(url, { ...options, headers })
        .catch(err => {
        if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
            console.warn('Сервер недоступен');
            throw new Error('Сервер недоступен');
        }
        throw err;
    })
        .then(async (res) => {
        if (res.status === 401) {
            throw new Error('Unauthorized');
        }
        return res;
    });
}

function updateAuthUI() {
    const loggedOut = document.getElementById('userBlockLoggedOut');
    const loggedIn = document.getElementById('userBlockLoggedIn');
    const usernameDisplay = document.getElementById('usernameDisplay');
    if (authToken && currentUsername) {
        loggedOut.style.display = 'none';
        loggedIn.style.display = 'flex';
        usernameDisplay.textContent = `👤 ${currentUsername}`;
    } else {
        loggedOut.style.display = 'flex';
        loggedIn.style.display = 'none';
        usernameDisplay.textContent = '';
    }
    const usernameSpan = document.getElementById('usernameDisplay');
    if (usernameSpan) {
        usernameSpan.style.cursor = 'pointer';
        usernameSpan.addEventListener('click', () => {
            openProfileModal();
        });
    }
    const adminBtn = document.getElementById('adminPanelBtn');
    if (adminBtn) {
        adminBtn.style.display = isAdmin() ? 'inline-block' : 'none';
        if (isAdmin()) {
            adminBtn.onclick = () => openAdminModal();
        }
    }
}

function initProfileTabs() {
    const tabs = document.querySelectorAll('.profile-tab-btn');
    tabs.forEach(tab => {
        tab.removeEventListener('click', profileTabHandler);
        tab.addEventListener('click', profileTabHandler);
    });
}

function profileTabHandler(e) {
    const targetTab = e.currentTarget.dataset.profileTab;
    document.querySelectorAll('.profile-tab-btn').forEach(btn => btn.classList.remove('active'));
    e.currentTarget.classList.add('active');
    document.querySelectorAll('#profileModal .profile-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    const activeContent = document.getElementById(`profile${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}Tab`);
    if (activeContent) activeContent.style.display = 'block';
    if (targetTab === 'purchases') {
        loadPurchaseHistory();
    }
}

async function loadPurchaseHistory() {
    const container = document.getElementById('purchasesList');
    if (!container) return;
    container.innerHTML = '<div class="empty">Загрузка...</div>';
    try {
        const res = await fetchWithAuth(`${API_BASE}/users/me/purchases`);
        if (!res.ok) throw new Error('Ошибка загрузки истории');
        const purchases = await res.json();

        console.log('Полученные покупки:', purchases);
        if (purchases.length) {
            console.log('Первая покупка:', purchases[0]);
            console.log('Название:', purchases[0].patternName, purchases[0].name);
            console.log('Миниатюра:', purchases[0].patternThumbnail, purchases[0].thumbnailPath);
        }

        if (!purchases.length) {
            container.innerHTML = '<div class="empty">🛒 У вас пока нет покупок</div>';
            return;
        }

        container.innerHTML = purchases.map(p => {
            const name = p.patternName || p.name || 'Без названия';
            const thumb = p.patternThumbnail || p.thumbnailPath || null;
            const thumbHtml = thumb
            ? `<img src="/api/thumbnails/${thumb}" class="purchase-thumb" alt="${escapeHtml(name)}" onerror="this.onerror=null;this.parentElement.innerHTML='📄';">`
            : `<div class="purchase-thumb">📄</div>`;
            return `
                <div class="purchase-item">
                    ${thumbHtml}
                    <div class="purchase-info">
                        <div class="purchase-name">${escapeHtml(name)}</div>
                        <div class="purchase-price">💰 ${p.price} ₽</div>
                        <div class="purchase-date">📅 ${new Date(p.purchaseDate).toLocaleDateString()}</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty">❌ Ошибка загрузки истории</div>';
    }
}

async function openProfileModal() {
    if (!authToken) {
        openModal('loginModal');
        return;
    }
    try {
        const res = await fetchWithAuth(`${API_BASE}/users/me`);
        if (!res.ok) throw new Error('Ошибка загрузки профиля');
        const user = await res.json();
        document.getElementById('profileUsername').value = user.username;
        document.getElementById('profileEmail').value = user.email;
        document.getElementById('profilePassword').value = '';
        document.getElementById('profilePasswordConfirm').value = '';
        document.getElementById('profileMessage').innerHTML = '';

        const infoTabBtn = document.querySelector('.profile-tab-btn[data-profile-tab="info"]');
        if (infoTabBtn) {
            infoTabBtn.classList.add('active');
            document.querySelectorAll('.profile-tab-btn').forEach(btn => {
                if (btn !== infoTabBtn) btn.classList.remove('active');
            });
        }
        document.getElementById('profileInfoTab').style.display = 'block';
        document.getElementById('profilePurchasesTab').style.display = 'none';

        openModal('profileModal');
    } catch (err) {
        alert('Не удалось загрузить профиль: ' + err.message);
    }
}

document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newUsername = document.getElementById('profileUsername').value.trim();
    const newEmail = document.getElementById('profileEmail').value.trim();
    const newPassword = document.getElementById('profilePassword').value;
    const confirmPassword = document.getElementById('profilePasswordConfirm').value;

    if (newPassword !== confirmPassword) {
        document.getElementById('profileMessage').innerHTML = '<span style="color:red;">Пароли не совпадают</span>';
        return;
    }

    const payload = {
        username: newUsername,
        email: newEmail,
        password: newPassword || null
    };

    try {
        const res = await fetchWithAuth(`${API_BASE}/users/me`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err);
        }
        const updatedUser = await res.json();
        currentUsername = updatedUser.username;
        localStorage.setItem('currentUsername', currentUsername);
        const usernameDisplay = document.getElementById('usernameDisplay');
        if (usernameDisplay) usernameDisplay.textContent = `👤 ${currentUsername}`;
        alert('Профиль успешно обновлён!');
        closeModal('profileModal');
        if (newPassword) {
            alert('Пароль изменён. Пожалуйста, войдите снова.');
            logout();
        }
    } catch (err) {
        document.getElementById('profileMessage').innerHTML = `<span style="color:red;">${err.message}</span>`;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initProfileTabs();
});

document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newUsername = document.getElementById('profileUsername').value.trim();
    const newEmail = document.getElementById('profileEmail').value.trim();
    const newPassword = document.getElementById('profilePassword').value;
    const confirmPassword = document.getElementById('profilePasswordConfirm').value;

    if (newPassword !== confirmPassword) {
        document.getElementById('profileMessage').innerHTML = '<span style="color:red;">Пароли не совпадают</span>';
        return;
    }

    const payload = {
        username: newUsername,
        email: newEmail,
        password: newPassword || null
    };

    try {
        const res = await fetchWithAuth(`${API_BASE}/users/me`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err);
        }
        const updatedUser = await res.json();
        currentUsername = updatedUser.username;
        localStorage.setItem('currentUsername', currentUsername);
        const usernameDisplay = document.getElementById('usernameDisplay');
        if (usernameDisplay) usernameDisplay.textContent = `👤 ${currentUsername}`;
        alert('Профиль успешно обновлён!');
        closeModal('profileModal');
        if (newPassword) {
            alert('Пароль изменён. Пожалуйста, войдите снова.');
            logout();
        }
    } catch (err) {
        document.getElementById('profileMessage').innerHTML = `<span style="color:red;">${err.message}</span>`;
    }
});


function logout(reloadPage = true) {
    authToken = null;
    currentUsername = null;
    currentUserId = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUsername');
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentRole');
    currentRole = null;
    updateAuthUI();
    updateLibraryVisibility();
    myUploads = [];
    savedFromCatalog = [];
    if (document.getElementById('myUploadsList')) document.getElementById('myUploadsList').innerHTML = '<div class="empty">Войдите, чтобы увидеть свои схемы</div>';
    if (document.getElementById('savedCatalogList')) document.getElementById('savedCatalogList').innerHTML = '<div class="empty">Войдите, чтобы увидеть сохранённые</div>';
    clearViewer();
    resetCalculator();
    if (reloadPage) {
        window.location.reload();
    }
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (id === 'uploadModal' && authToken && currentUsername) {
        const authorField = document.getElementById('uploadAuthor');
        if (authorField) {
            authorField.value = currentUsername;
        }
    }
    modal.style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

function initAuth() {
    document.getElementById('loginBtn').addEventListener('click', () => openModal('loginModal'));
    document.getElementById('registerBtn').addEventListener('click', () => openModal('registerModal'));
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('loginFromLibraryBtn').addEventListener('click', () => openModal('loginModal'));

    document.getElementById('resetSearchFiltersBtn')?.addEventListener('click', () => {
        searchCategoryMini.value = '';
        searchDifficultyMini.value = '';
        searchMaterialsMini.value = '';
        searchBrandMini.value = '';
        searchCompositionMini.value = '';
        searchCountryMini.value = '';
        searchHookSizeMini.value = '';
        searchNeedleSizeMini.value = '';
        searchWeightFromMini.value = '';
        searchWeightToMini.value = '';
        searchLengthFromMini.value = '';
        searchLengthToMini.value = '';
        if (globalSearchInput.value.trim()) {
            performGlobalSearch();
        }
        onFilterChange();
    });

    document.querySelectorAll('.close').forEach(span => {
        span.addEventListener('click', (e) => {
            closeModal(e.target.dataset.modal);
        });
    });

    document.getElementById('switchToRegister').addEventListener('click', (e) => {
        closeModal('loginModal');
        openModal('registerModal');
    });
    document.getElementById('switchToLogin').addEventListener('click', (e) => {
        closeModal('registerModal');
        openModal('loginModal');
    });

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!res.ok) {
                alert('Неверные учетные данные');
                return;
            }
            const data = await res.json();
            authToken = data.token;
            currentUsername = data.username;
            currentUserId = String(data.id);
            currentRole = data.role;
            localStorage.setItem('currentRole', currentRole);
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUsername', currentUsername);
            localStorage.setItem('currentUserId', currentUserId);
            updateAuthUI();
            updateLibraryVisibility();
            closeModal('loginModal');
            loadUserPatterns();
            loadCatalog(currentCategory);
            loadFavoriteYarnIds();
            document.getElementById('loginUsername').value = '';
            document.getElementById('loginPassword').value = '';
            loadUserPatterns();
            loadCatalog(currentCategory);
        } catch (err) {
            alert('Ошибка входа');
        }
    });

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            if (!res.ok) {
                const text = await res.text();
                alert(text);
                return;
            }
            alert('Регистрация успешна! Теперь войдите.');
            closeModal('registerModal');
            openModal('loginModal');
            document.getElementById('regUsername').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
        } catch (err) {
            alert('Ошибка регистрации');
        }
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    updateAuthUI();
}

async function loadFavoriteYarnIds() {
    if (!authToken) {
        favoriteYarnIds.clear();
        return;
    }
    try {
        const res = await fetchWithAuth(`${API_BASE}/yarns/favorites`);
        if (!res.ok) throw new Error('Ошибка загрузки избранного');
        const yarns = await res.json();
        favoriteYarnIds.clear();
        yarns.forEach(y => favoriteYarnIds.add(y.id));
    } catch (err) {
        console.error('Ошибка загрузки ID сохранённой пряжи:', err);
        favoriteYarnIds.clear();
    }
}

async function toggleFavorite(yarnId) {
    if (!authToken) {
        openModal('loginModal');
        return false;
    }
    try {
        const isFav = favoriteYarnIds.has(yarnId);
        const method = isFav ? 'DELETE' : 'POST';
        const res = await fetchWithAuth(`${API_BASE}/yarns/${yarnId}/favorite`, {
            method: method,
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || 'Ошибка изменения статуса');
        }
        if (isFav) {
            favoriteYarnIds.delete(yarnId);
        } else {
            favoriteYarnIds.add(yarnId);
        }
        await loadSavedYarns();
        return true;
    } catch (err) {
        console.error(err);
        alert('Не удалось изменить статус: ' + err.message);
        return false;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function getCategoryIcon(category) {
    const icons = {
        'Игрушки': '',
        'Одежда': '',
        'Аксессуары': ''
    };
    return icons[category] || '';
}

function getCategoryIconYarn() {
    return '';
}

async function showYarnDetail(id, fromLibrary = false) {
    try {
        const res = await fetch(`${API_BASE}/yarns/${id}`);
        if (!res.ok) throw new Error('Не удалось загрузить');
        const yarn = await res.json();
        renderYarnDetailModal(yarn, fromLibrary);
        openModal('yarnDetailModal');
    } catch (err) {
        alert('Ошибка загрузки деталей: ' + err.message);
    }
}

function renderYarnDetailModal(yarn, fromLibrary = false) {
    const content = document.getElementById('yarnDetailContent');
    const isFav = favoriteYarnIds.has(yarn.id);

    let stitches = yarn.stitches;
    let rows = yarn.rows;
    if ((!stitches || !rows) && yarn.gauge) {
        const match = y.gauge.match(/(\d+)\D+(\d+)/);
        if (match) {
            stitches = parseInt(match[1], 10);
            rows = parseInt(match[2], 10);
        }
    }
    const gaugeText = (stitches && rows) ? `${stitches}п x ${rows}р` : '';

    let saveButtonHtml = '';
    if (fromLibrary) {
        saveButtonHtml = `<button id="detailDeleteBtn" class="secondary-btn delete-btn">🗑️ Удалить из библиотеки</button>`;
    } else {
        if (!authToken) {
            saveButtonHtml = `<button id="detailFavBtn" class="secondary-btn login-prompt">🔑 Войдите, чтобы сохранить</button>`;
        } else {
            if (isFav) {
                saveButtonHtml = `<button id="detailFavBtn" class="secondary-btn" disabled>✅ В библиотеке</button>`;
            } else {
                saveButtonHtml = `<button id="detailFavBtn" class="secondary-btn">📥 Сохранить в библиотеку</button>`;
            }
        }
    }

    content.innerHTML = `
        ${yarn.imagePath ? `<div class="detail-thumbnail"><img src="${getYarnImageUrl(yarn.imagePath)}" alt="${escapeHtml(yarn.name)}"></div>` : ''}
        <div class="detail-name">${escapeHtml(yarn.name)}</div>
        <div class="detail-meta">
            ${yarn.brand ? `<span>${escapeHtml(yarn.brand)}</span>` : ''}
            ${yarn.weight ? `<span>️${yarn.weight} г</span>` : ''}
            ${yarn.length ? `<span>${yarn.length} м</span>` : ''}
            ${yarn.composition ? `<span> ${escapeHtml(yarn.composition)}</span>` : ''}
            ${gaugeText ? `<span>Плотность: ${gaugeText}</span>` : ''}
            ${yarn.hookSize ? `<span>Крючок: ${escapeHtml(yarn.hookSize)} мм</span>` : ''}
            ${yarn.needleSize ? `<span>Спицы: ${escapeHtml(yarn.needleSize)} мм</span>` : ''}
            ${yarn.country ? `<span>${escapeHtml(yarn.country)}</span>` : ''}
        </div>
        <div class="detail-actions">
            ${saveButtonHtml}
            <button id="detailCloseBtn" class="secondary-btn">Закрыть</button>
        </div>
    `;

    const favBtn = document.getElementById('detailFavBtn');
    if (favBtn && !fromLibrary) {
        if (favBtn.classList.contains('login-prompt')) {
            favBtn.addEventListener('click', () => {
                closeModal('yarnDetailModal');
                openModal('loginModal');
            });
        } else if (!favBtn.disabled) {
            favBtn.addEventListener('click', async () => {
                await toggleFavorite(yarn.id);
                const newIsFav = favoriteYarnIds.has(yarn.id);
                favBtn.innerHTML = newIsFav ? '✅ В библиотеке' : '📥 Сохранить в библиотеку';
                favBtn.disabled = newIsFav;
                await loadSavedYarns();
            });
        }
    }

    const deleteBtn = document.getElementById('detailDeleteBtn');
    if (deleteBtn && fromLibrary) {
        deleteBtn.addEventListener('click', async () => {
            if (confirm('Удалить пряжу из библиотеки?')) {
                await toggleFavorite(yarn.id);
                closeModal('yarnDetailModal');
                await loadSavedYarns();
            }
        });
    }

    const modal = document.getElementById('yarnDetailModal');
    const closeBtn = modal.querySelector('#detailCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal('yarnDetailModal'));
    }
}

function renderPatternCards(patterns, showPublishButton = false) {
    return patterns.map(p => {
        const thumbnailHtml = p.thumbnailPath
        ? `<div class="pattern-thumbnail"><img src="/api/thumbnails/${p.thumbnailPath}" alt="${escapeHtml(p.name)}"></div>`
        : `<div class="pattern-icon">${getCategoryIcon(p.category)}</div>`;

        const categoryHtml = `<div class="pattern-category">${getCategoryIcon(p.categoryName)} ${escapeHtml(p.categoryName) || 'Без категории'}</div>`;
        const notesIcon = p.notes ? '<i class="fas fa-sticky-note" style="color:#6b4e3a; margin-left: 8px;"></i>' : '';
        return `
            <div class="catalog-card library-card" data-id="${p.id}" data-name="${escapeHtml(p.name)}" data-category="${escapeHtml(p.categoryName || '')}" data-owner="${p.userId == currentUserId ? 'own' : 'saved'}">
                ${thumbnailHtml}
                <div class="pattern-name">${escapeHtml(p.name)}</div>
                <div class="pattern-author">
                    <span class="author-link" data-author-id="${p.userId || ''}" data-author-name="${escapeHtml(p.author || 'Неизвестный автор')}">
                        ${escapeHtml(p.author || 'Неизвестный автор')}
                    </span>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.author-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            const userId = link.dataset.authorId;
            const authorName = link.dataset.authorName;
            showAuthorProfile(userId, authorName);
        });
    });
}

function openEditModal(pattern) {
    document.getElementById('editPatternId').value = pattern.id;
    document.getElementById('editName').value = pattern.name || '';
    document.getElementById('editCategory').value = pattern.categoryName  || '';
    document.getElementById('editDifficulty').value = pattern.difficulty || '';
    document.getElementById('editMaterials').value = pattern.materials || '';
    document.getElementById('editDescription').value = pattern.description || '';
    document.getElementById('editPrice').value = pattern.price || '';
    document.getElementById('cancelEditBtn')?.addEventListener('click', () => {
        closeModal('editPatternModal');
    });
    openModal('editPatternModal');
}

function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle = handle || element;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        element.classList.add('dragging');
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        let top = element.offsetTop - pos2;
        let left = element.offsetLeft - pos1;
        if (top < 0) top = 0;
        if (left < 0) left = 0;
        element.style.top = top + "px";
        element.style.left = left + "px";
        element.style.right = "auto";
        element.style.bottom = "auto";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        element.classList.remove('dragging');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const notesPanel = document.getElementById('notesPanel');
    const notesHeader = document.querySelector('#notesPanel .notes-panel-header');
    if (notesPanel && notesHeader) {
        makeDraggable(notesPanel, notesHeader);
        const savedTop = localStorage.getItem('notesPanelTop');
        const savedLeft = localStorage.getItem('notesPanelLeft');
        if (savedTop) notesPanel.style.top = savedTop + 'px';
        if (savedLeft) notesPanel.style.left = savedLeft + 'px';
        window.addEventListener('beforeunload', () => {
            localStorage.setItem('notesPanelTop', notesPanel.style.top);
            localStorage.setItem('notesPanelLeft', notesPanel.style.left);
        });
    }
});

document.getElementById('editPatternForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editPatternId').value;
    const priceValue = document.getElementById('editPrice').value;
    const updatedData = {
        name: document.getElementById('editName').value,
        category: document.getElementById('editCategory').value,
        difficulty: document.getElementById('editDifficulty').value,
        materials: document.getElementById('editMaterials').value,
        description: document.getElementById('editDescription').value,
        price: priceValue === '' ? null : Number(priceValue)
    };
    try {
        const res = await fetchWithAuth(`${API_BASE}/patterns/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(err);
        }
        closeModal('editPatternModal');
        await loadUserPatterns();
        await loadCatalog(currentCategory);
        closeModal('patternDetailModal');
    } catch (err) {
        alert('Ошибка обновления: ' + err.message);
    }
});

async function loadUserPatterns() {
    if (!authToken) {
        myUploads = [];
        savedFromCatalog = [];
        renderSubtab('my-uploads');
        renderSubtab('saved-catalog');
        return;
    }
    try {
        const res = await fetchWithAuth(`${API_BASE}/patterns`);

        if (!res.ok) {
            console.error(`Ошибка загрузки библиотеки: ${res.status} ${res.statusText}`);
            if (res.status === 401) {
                logout();
                return;
            }
            throw new Error(`HTTP ${res.status}`);
        }

        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            console.error('Ответ не JSON:', text.substring(0, 200));
            throw new Error('Сервер вернул не JSON');
        }

        const patterns = await res.json();
        myUploads = patterns.filter(p => !p.catalogCopy);
        savedFromCatalog = patterns.filter(p => p.catalogCopy);
        renderSubtab('my-uploads');
        renderSubtab('saved-catalog');
    } catch (err) {
        console.error('Ошибка загрузки библиотеки', err);
        if (err.message === 'Unauthorized') {
            logout(false);
        }
        document.getElementById('myUploadsList').innerHTML = '<div class="empty">Ошибка загрузки. Попробуйте позже.</div>';
        document.getElementById('savedCatalogList').innerHTML = '<div class="empty">Ошибка загрузки</div>';
    }
}

function renderSubtab(subtabId) {
    let patterns = [];
    let containerId = '';
    let isYarn = false;

    if (subtabId === 'my-uploads') {
        patterns = myUploads;
        containerId = 'myUploadsList';
    } else if (subtabId === 'saved-catalog') {
        patterns = savedFromCatalog;
        containerId = 'savedCatalogList';
    } else if (subtabId === 'saved-yarns') {
        containerId = 'savedYarnsList';
        isYarn = true;
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    if (isYarn) {
        if (!savedYarns.length) {
            container.innerHTML = '<div class="empty">🧶 Нет сохранённой пряжи</div>';
            return;
        }
        container.classList.add('pattern-grid');
        container.innerHTML = renderYarnCards(savedYarns, true);
        attachYarnCardHandlers(container);
        return;
    }

    container.classList.add('pattern-grid');
    if (patterns.length === 0) {
        container.innerHTML = '<div class="empty">Нет схем</div>';
        return;
    }

    container.innerHTML = patterns.map(p => {
        const thumbnailHtml = p.thumbnailPath
        ? `<div class="pattern-thumbnail"><img src="/api/thumbnails/${p.thumbnailPath}" alt="${escapeHtml(p.name)}"></div>`
        : `<div class="pattern-icon">${getCategoryIcon(p.categoryName)}</div>`;

        let priceHtml = '';
        if (p.price && p.price > 0) {
            priceHtml = `<div class="pattern-price">💰 ${p.price} ₽ <span class="purchase-count">(куплено: ${p.purchaseCount || 0})</span></div>`;
        } else {
            priceHtml = `<div class="pattern-price">Бесплатно <span class="save-count">(добавили: ${p.purchaseCount || 0})</span></div>`;
        }

        return `
            <div class="catalog-card library-card" data-id="${p.id}" data-name="${escapeHtml(p.name)}" data-category="${escapeHtml(p.categoryName || '')}" data-owner="${p.userId == currentUserId ? 'own' : 'saved'}">
                ${thumbnailHtml}
                <div class="pattern-name">${escapeHtml(p.name)}</div>
                <div class="pattern-author">
                    <span class="author-link" data-author-id="${p.userId || ''}" data-author-name="${escapeHtml(p.author || 'Неизвестный автор')}">
                        ${escapeHtml(p.author || 'Неизвестный автор')}
                    </span>
                </div>
                ${priceHtml}
            </div>
        `;
    }).join('');

    container.querySelectorAll('.library-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('author-link')) return;
            const id = parseInt(card.dataset.id);
            const owner = card.dataset.owner;
            showLibraryPatternDetail(id, owner);
        });
    });

    container.querySelectorAll('.author-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            const userId = link.dataset.authorId;
            const authorName = link.dataset.authorName;
            showAuthorProfile(userId, authorName);
        });
    });
}

function renderYarnCards(yarns, showDeleteBtn = false) {
    if (!yarns || !yarns.length) return '<div class="empty">Нет пряжи</div>';
    return yarns.map(y => {
        let stitches = y.stitches;
        let rows = y.rows;
        if ((!stitches || !rows) && y.gauge) {
            const match = y.gauge.match(/(\d+)\D+(\d+)/);
            if (match) {
                stitches = parseInt(match[1], 10);
                rows = parseInt(match[2], 10);
            }
        }
        const gaugeText = (stitches && rows) ? `${stitches}п x ${rows}р` : '';
        return `
            <div class="catalog-card yarn-library-card" data-id="${y.id}" data-yarn='${JSON.stringify(y)}'>
                ${y.imagePath ? `<div class="pattern-thumbnail"><img src="${getYarnImageUrl(y.imagePath)}" alt="${escapeHtml(y.name)}"></div>` : `<div class="pattern-icon">🧵</div>`}
                <div class="pattern-name">${escapeHtml(y.name)}</div>
                <div class="pattern-author">${escapeHtml(y.brand || 'Бренд не указан')}</div>
            </div>
        `;
    }).join('');
}

function attachYarnCardHandlers(container) {
    container.querySelectorAll('.yarn-library-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const yarnData = JSON.parse(card.dataset.yarn);
            showYarnDetail(yarnData.id, true);
        });
    });
}

async function loadYarnsForCatalog() {
    const container = document.getElementById('catalogYarnsList');
    if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/yarns`);
        if (!res.ok) throw new Error('Ошибка загрузки пряжи');
        const yarns = await res.json();
        renderCatalogYarns(yarns, container);
    } catch (err) {
        container.innerHTML = '<div class="empty">❌ Не удалось загрузить пряжу</div>';
    }
}

function renderCatalogYarns(yarnsList, container) {
    if (!container) return;
    if (!yarnsList.length) {
        container.innerHTML = '<div class="empty">🧶 Нет пряжи, соответствующей фильтрам</div>';
        return;
    }
    container.innerHTML = yarnsList.map(y => {
        let stitches = y.stitches, rows = y.rows;
        if ((!stitches || !rows) && y.gauge) {
            const match = y.gauge.match(/(\d+)\D+(\d+)/);
            if (match) { stitches = match[1]; rows = match[2]; }
        }
        const gaugeText = (stitches && rows) ? `${stitches}п x ${rows}р` : '';
        return `
            <div class="catalog-card yarn-card" data-id="${y.id}">
                ${y.imagePath ? `<div class="pattern-thumbnail"><img src="${getYarnImageUrl(y.imagePath)}" alt="${escapeHtml(y.name)}"></div>` : `<div class="pattern-icon">🧵</div>`}
                <div class="pattern-name">${escapeHtml(y.name)}</div>
                <div class="pattern-author">${escapeHtml(y.brand || 'Бренд не указан')}</div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('#catalogYarnsList .yarn-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            showYarnDetail(id, false);
        });
    });
}

function applyYarnFiltersAndRender() {
    if (!allYarns.length) {
        loadAllYarns().then(() => applyYarnFiltersAndRender());
        return;
    }
    let filtered = [...allYarns];
    if (selectedYarnBrands.length) {
        filtered = filtered.filter(y => selectedYarnBrands.includes(y.brand));
    }
    if (selectedYarnCompositions.length) {
        filtered = filtered.filter(y => y.composition && selectedYarnCompositions.some(comp => y.composition.toLowerCase().includes(comp.toLowerCase())));
    }
    if (selectedYarnCountries.length) {
        filtered = filtered.filter(y => selectedYarnCountries.includes(y.country));
    }
    const container = document.getElementById('catalogYarnsList');
    if (container) renderCatalogYarns(filtered, container);
}

function initYarnFilterListeners() {
    const yarnsSidebar = document.querySelector('#yarnsView .filters-sidebar');
    if (!yarnsSidebar) return;

    const groups = {
        brand: yarnsSidebar.querySelectorAll('.filter-group:first-child input'),
        composition: yarnsSidebar.querySelectorAll('.filter-group:nth-child(2) input'),
        country: yarnsSidebar.querySelectorAll('.filter-group:nth-child(3) input')
    };

    function updateFilters() {
        selectedYarnBrands = Array.from(groups.brand).filter(cb => cb.checked).map(cb => cb.value);
        selectedYarnCompositions = Array.from(groups.composition).filter(cb => cb.checked).map(cb => cb.value);
        selectedYarnCountries = Array.from(groups.country).filter(cb => cb.checked).map(cb => cb.value);
        applyYarnFiltersAndRender();
    }

    for (const group of Object.values(groups)) {
        group.forEach(cb => cb.addEventListener('change', updateFilters));
    }

    const resetBtn = document.getElementById('resetYarnFiltersBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            Object.values(groups).forEach(group => group.forEach(cb => cb.checked = false));
            updateFilters();
        });
    }
}

function initCatalogSubtabs() {
    const schemesView = document.getElementById('schemesView');
    const yarnsView = document.getElementById('yarnsView');
    const subtabBtns = document.querySelectorAll('.catalog-subtabs .sub-tab-btn');
    if (!schemesView || !yarnsView || !subtabBtns.length) return;

    subtabBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const subtab = btn.dataset.subtab;
            if (subtab === 'schemes') {
                schemesView.style.display = 'block';
                yarnsView.style.display = 'none';
                applyFiltersAndRender();
            } else {
                schemesView.style.display = 'none';
                yarnsView.style.display = 'block';
                if (!allYarns.length) {
                    await loadAllYarns();
                }
                applyYarnFiltersAndRender();
            }
            subtabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}


function toggleNotesPanel() {
    const panel = document.getElementById('notesPanel');
    if (!panel) return;
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
        notesPanelOpen = true;
        loadNotesForCurrentPattern();
    } else {
        panel.style.display = 'none';
        notesPanelOpen = false;
    }
}

async function loadNotesForCurrentPattern() {
    if (!currentPatternId) {
        document.getElementById('notesTextarea').value = 'Выберите схему для просмотра';
        document.getElementById('notesTextarea').disabled = true;
        document.getElementById('saveNotesPanelBtn').disabled = true;
        return;
    }
    try {
        const res = await fetchWithAuth(`${API_BASE}/patterns/${currentPatternId}/metadata`);
        if (!res.ok) throw new Error('Не удалось загрузить заметки');
        const pattern = await res.json();
        currentNotes = pattern.notes || '';
        document.getElementById('notesTextarea').value = currentNotes;
        document.getElementById('notesTextarea').disabled = false;
        document.getElementById('saveNotesPanelBtn').disabled = false;
    } catch (err) {
        console.error(err);
        document.getElementById('notesTextarea').value = 'Ошибка загрузки заметок';
        document.getElementById('notesTextarea').disabled = true;
        document.getElementById('saveNotesPanelBtn').disabled = true;
    }
}

async function saveNotesForCurrentPattern() {
    if (!currentPatternId) {
        alert('Нет активной схемы');
        return;
    }
    const newNotes = document.getElementById('notesTextarea').value;
    const statusDiv = document.getElementById('notesStatus');
    statusDiv.textContent = 'Сохранение...';
    try {
        const res = await fetchWithAuth(`${API_BASE}/patterns/${currentPatternId}/notes`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: newNotes })
        });
        if (!res.ok) throw new Error(await res.text());
        statusDiv.textContent = '✅ Сохранено!';
        currentNotes = newNotes;
        const detailModalTextarea = document.getElementById('patternNotes');
        if (detailModalTextarea) detailModalTextarea.value = newNotes;
        setTimeout(() => { statusDiv.textContent = ''; }, 2000);
    } catch (err) {
        statusDiv.textContent = '❌ Ошибка: ' + err.message;
    }
}

async function showLibraryPatternDetail(patternId, owner) {
    try {
        const res = await fetchWithAuth(`${API_BASE}/patterns/${patternId}/metadata`);
        if (!res.ok) throw new Error('Не удалось загрузить схему');
        const pattern = await res.json();
        renderLibraryDetailModal(pattern, owner);
        openModal('patternDetailModal');
    } catch (err) {
        alert('Ошибка загрузки деталей: ' + err.message);
    }
}

function renderLibraryDetailModal(pattern, owner) {
    const content = document.getElementById('patternDetailContent');
    const thumbnailHtml = pattern.thumbnailPath
    ? `<div class="detail-thumbnail"><img src="/api/thumbnails/${pattern.thumbnailPath}" alt="${escapeHtml(pattern.name)}">`
    : '';

    const categoryDisplay = pattern.categoryName
    ? `${getCategoryIcon(pattern.categoryName)} ${escapeHtml(pattern.categoryName)}`
    : '❓ Категория не указана';

    let priceDisplayHtml = '';
    if (pattern.price && pattern.price > 0) {
        priceDisplayHtml = `<div class="detail-price">💰 Цена: <strong>${pattern.price} ₽</strong> <span class="purchase-count">(куплено ${pattern.purchaseCount || 0} раз)</span></div>`;
    } else {
        priceDisplayHtml = `<div class="detail-price">Бесплатно <span class="save-count">(добавили ${pattern.purchaseCount || 0} раз)</span></div>`;
    }

    let buttonsHtml = '';
    if (owner === 'own') {
        buttonsHtml = `
            <button id="viewPdfBtn" class="primary-btn">📄 Просмотреть PDF</button>
            <button id="downloadOwnBtn" class="primary-btn">⬇️ Скачать</button>
            <button id="editOwnBtn" class="primary-btn">✏️ Изменить</button>
            ${!pattern.isPublic && !pattern.catalogCopy ? '<button id="publishOwnBtn" class="primary-btn">📢 Опубликовать</button>' : ''}
            <button id="deleteOwnBtn" class="delete-btn">🗑️ Удалить</button>
        `;
    } else {
        buttonsHtml = `
            <button id="viewPdfBtn" class="primary-btn">📄 Просмотреть PDF</button>
            <button id="downloadOwnBtn" class="primary-btn">⬇️ Скачать</button>
            <button id="deleteOwnBtn" class="delete-btn">🗑️ Удалить</button>
        `;
    }
    buttonsHtml += `<button id="detailCloseBtn" class="user-btn">Закрыть</button>`;

    content.innerHTML = `
        ${thumbnailHtml}
        <div class="detail-name">${escapeHtml(pattern.name)}</div>
        <div class="detail-meta">
            <span>👤 ${escapeHtml(pattern.author || 'Неизвестный автор')}</span>
            <span>${categoryDisplay}</span>
            <span>${escapeHtml(pattern.difficulty || 'Сложность не указана')}</span>
            <span>${escapeHtml(pattern.materials || 'Материалы не указаны')}</span>
            <span>📅 ${new Date(pattern.uploadDate).toLocaleDateString()}</span>
        </div>
        ${priceDisplayHtml}
        <div class="detail-description">${escapeHtml(pattern.description || 'Описание отсутствует')}</div>
        <div class="notes-section">
            <label for="patternNotes">📝 Мои заметки:</label>
            <textarea id="patternNotes" rows="3" placeholder="Добавьте свои заметки к схеме...">${escapeHtml(pattern.notes || '')}</textarea>
            <button id="saveNotesBtn" class="secondary-btn">💾 Сохранить заметку</button>
        </div>
        <div class="detail-actions" style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
            ${buttonsHtml}
        </div>
    `;

    document.getElementById('saveNotesBtn')?.addEventListener('click', async () => {
        const newNotes = document.getElementById('patternNotes').value;
        try {
            const res = await fetchWithAuth(`${API_BASE}/patterns/${pattern.id}/notes`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: newNotes })
            });
            if (!res.ok) throw new Error('Ошибка сохранения');
            alert('Заметки сохранены');
            currentNotes = newNotes;
            const notesPanelTextarea = document.getElementById('notesTextarea');
            if (notesPanelTextarea) notesPanelTextarea.value = newNotes;
            pattern.notes = newNotes;
        } catch (err) {
            alert('Не удалось сохранить заметки: ' + err.message);
        }
    });
    document.getElementById('viewPdfBtn')?.addEventListener('click', () => {
        closeModal('patternDetailModal');
        loadPatternForView(pattern.id);
        document.querySelector('.tab-btn[data-tab="library"]').click();
    });
    document.getElementById('downloadOwnBtn')?.addEventListener('click', async () => {
        const resp = await fetchWithAuth(`${API_BASE}/patterns/${pattern.id}/download`);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = pattern.name + '.pdf';
        a.click();
        URL.revokeObjectURL(url);
    });
    document.getElementById('publishOwnBtn')?.addEventListener('click', async () => {
        const category = pattern.categoryName;
        if (!category) {
            alert('У схемы нет категории. Укажите категорию перед публикацией.');
            return;
        }
        const url = `${API_BASE}/patterns/${pattern.id}/publish?name=${encodeURIComponent(pattern.name)}&category=${encodeURIComponent(category)}&author=`;
        const res = await fetchWithAuth(url, { method: 'POST' });
        if (res.ok) {
            alert('✅ Схема опубликована!');
            closeModal('patternDetailModal');
            loadUserPatterns();
            loadCatalog(currentCategory);
        } else {
            alert('❌ Ошибка: ' + await res.text());
        }
    });
    document.getElementById('deleteOwnBtn')?.addEventListener('click', async () => {
        const confirmMsg = owner === 'saved' ? 'Удалить схему из библиотеки?' : 'Удалить схему навсегда?';
        if (confirm(confirmMsg)) {
            let url;
            if (owner === 'saved') {
                url = `${API_BASE}/library/${pattern.id}`;
            } else {
                url = `${API_BASE}/patterns/${pattern.id}`;
            }
            const res = await fetchWithAuth(url, { method: 'DELETE' });
            if (res.ok) {
                alert(owner === 'saved' ? 'Схема удалена из библиотеки' : 'Схема удалена');
                closeModal('patternDetailModal');
                if (currentPatternId === pattern.id) clearViewer();
                loadUserPatterns();
                loadCatalog(currentCategory);
            } else {
                alert('Ошибка удаления');
            }
        }
    });
    const modalElem = document.getElementById('patternDetailModal');
    const closeBtn = modalElem.querySelector('#detailCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal('patternDetailModal'));
    }

    document.getElementById('editOwnBtn')?.addEventListener('click', () => {
        closeModal('patternDetailModal');
        openEditModal(pattern);
    });

    if (notesPanelOpen && currentPatternId === pattern.id) {
        document.getElementById('notesTextarea').value = pattern.notes || '';
        currentNotes = pattern.notes || '';
    }
}

async function loadCatalog() {
    try {
        const res = await fetch(`${API_BASE}/catalog`);
        const patterns = await res.json();
        allCatalogPatterns = patterns;
        applyFiltersAndRender();
    } catch (err) {
        console.error(err);
        catalogList.innerHTML = '<div class="empty">Ошибка загрузки каталога</div>';
    }
}

function applyFiltersAndRender() {
    let filtered = [...allCatalogPatterns];

    if (selectedCategories.length > 0) {
        filtered = filtered.filter(p => selectedCategories.includes(p.categoryName));
    }

    if (selectedDifficulties.length > 0) {
        filtered = filtered.filter(p => p.difficulty && selectedDifficulties.includes(p.difficulty));
    }

    if (selectedMaterials.length > 0) {
        filtered = filtered.filter(p => p.materials && selectedMaterials.includes(p.materials));
    }

    if (selectedPriceTypes.length > 0) {
        filtered = filtered.filter(p => {
            const isFree = !p.price || p.price === 0;
            const isPaid = p.price && p.price > 0;
            if (selectedPriceTypes.includes('free') && selectedPriceTypes.includes('paid')) {
                return true;
            }
            if (selectedPriceTypes.includes('free')) return isFree;
            if (selectedPriceTypes.includes('paid')) return isPaid;
            return true;
        });
    }

    renderCatalog(filtered);
}

function attachFilterListeners() {
    document.querySelectorAll('.filters-sidebar input[value="Игрушки"], .filters-sidebar input[value="Одежда"], .filters-sidebar input[value="Аксессуары"]').forEach(cb => {
        cb.addEventListener('change', () => {
            selectedCategories = Array.from(document.querySelectorAll('.filters-sidebar input[value="Игрушки"]:checked, .filters-sidebar input[value="Одежда"]:checked, .filters-sidebar input[value="Аксессуары"]:checked'))
                .map(c => c.value);
            applyFiltersAndRender();
        });
    });

    document.querySelectorAll('.filters-sidebar input[value="Начинающий"], .filters-sidebar input[value="Средний"], .filters-sidebar input[value="Сложный"]').forEach(cb => {
        cb.addEventListener('change', () => {
            selectedDifficulties = Array.from(document.querySelectorAll('.filters-sidebar input[value="Начинающий"]:checked, .filters-sidebar input[value="Средний"]:checked, .filters-sidebar input[value="Сложный"]:checked'))
                .map(c => c.value);
            applyFiltersAndRender();
        });
    });

    document.querySelectorAll('.filters-sidebar input[value="Спицы"], .filters-sidebar input[value="Крючок"]').forEach(cb => {
        cb.addEventListener('change', () => {
            selectedMaterials = Array.from(document.querySelectorAll('.filters-sidebar input[value="Спицы"]:checked, .filters-sidebar input[value="Крючок"]:checked'))
                .map(c => c.value);
            applyFiltersAndRender();
        });
    });

    document.querySelectorAll('.price-filter').forEach(cb => {
        cb.addEventListener('change', () => {
            selectedPriceTypes = Array.from(document.querySelectorAll('.price-filter:checked'))
                .map(cb => cb.value);
            applyFiltersAndRender();
        });
    });

    const resetBtn = document.getElementById('resetFiltersBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            document.querySelectorAll('.filters-sidebar input[type="checkbox"]').forEach(cb => cb.checked = false);
            selectedCategories = [];
            selectedDifficulties = [];
            selectedMaterials = [];
            selectedPriceTypes = [];
            applyFiltersAndRender();
        });
    }
}

function renderCatalog(patterns) {
    if (!patterns.length) {
        catalogList.innerHTML = '<div class="empty">Нет схем в этой категории</div>';
        return;
    }
    catalogList.innerHTML = patterns.map(p => {
        const thumbnailHtml = p.thumbnailPath
        ? `<div class="pattern-thumbnail"><img src="/api/thumbnails/${p.thumbnailPath}" alt="${escapeHtml(p.name)}"></div>`
        : `<div class="pattern-icon">${getCategoryIcon(p.categoryName)}</div>`;

        let priceHtml = '';
        if (p.price && p.price > 0) {
            priceHtml = `<div class="pattern-price">💰 ${p.price} ₽ <span class="purchase-count">(куплено: ${p.purchaseCount || 0})</span></div>`;
        } else {
            priceHtml = `<div class="pattern-price">Бесплатно <span class="save-count">(добавили: ${p.purchaseCount || 0})</span></div>`;
        }

        return `
            <div class="catalog-card" data-id="${p.id}" data-name="${escapeHtml(p.name)}">
                ${thumbnailHtml}
                <div class="pattern-name">${escapeHtml(p.name)}</div>
                <div class="pattern-author">
                    <span class="author-link" data-author-id="${p.userId || ''}" data-author-name="${escapeHtml(p.author || 'Неизвестный автор')}">
                        ${escapeHtml(p.author || 'Неизвестный автор')}
                    </span>
                </div>
                ${priceHtml}
            </div>
        `;
    }).join('');

    document.querySelectorAll('.catalog-card').forEach(card => {
        card.addEventListener('click', () => {
            if (card.classList.contains('library-card')) return;
            const id = parseInt(card.dataset.id);
            showPatternDetail(id);
        });
    });
    document.querySelectorAll('.author-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            const userId = link.dataset.authorId;
            const authorName = link.dataset.authorName;
            showAuthorProfile(userId, authorName);
        });
    });
}

async function showPatternDetail(patternId) {
    try {
        await loadSavedIds();

        const res = await fetch(`${API_BASE}/catalog`);
        if (!res.ok) throw new Error('Ошибка загрузки');
        const allPatterns = await res.json();
        const pattern = allPatterns.find(p => p.id === patternId);
        if (!pattern) {
            alert('Схема не найдена');
            return;
        }
        renderDetailModal(pattern);
        openModal('patternDetailModal');
    } catch (err) {
        alert('Не удалось загрузить информацию о схеме');
    }
}

function renderDetailModal(pattern) {
    const isOwn = pattern.userId && String(pattern.userId) === currentUserId;
    const isSaved = savedPatternIds.includes(pattern.id);
    const isPurchased = pattern.purchased;

    const content = document.getElementById('patternDetailContent');

    const thumbnailHtml = pattern.thumbnailPath
    ? `<div class="detail-thumbnail"><img src="/api/thumbnails/${pattern.thumbnailPath}" alt="${escapeHtml(pattern.name)}"></div>`
    : '';

    let priceDisplayHtml = '';
    if (pattern.price && pattern.price > 0) {
        priceDisplayHtml = `<div class="detail-price">💰 Цена: <strong>${pattern.price} ₽</strong> <span class="purchase-count">(куплено ${pattern.purchaseCount || 0} раз)</span></div>`;
    } else {
        priceDisplayHtml = `<div class="detail-price">Бесплатно <span class="save-count">(добавили ${pattern.purchaseCount || 0} раз)</span></div>`;
    }

    let buttonHtml = '';
    if (!authToken) {
        buttonHtml = `<button class="login-to-save-btn">🔑 Войдите, чтобы сохранить/купить</button>`;
    } else if (isOwn) {
        buttonHtml = `<button disabled>📘 Это ваша схема</button>`;
    } else if (pattern.price && pattern.price > 0) {
        if (isPurchased || isSaved) {
            buttonHtml = `<button disabled>✅ Уже в библиотеке</button>`;
        } else {
            buttonHtml = `<button id="buyPatternBtn">💳 Купить за ${pattern.price} ₽</button>`;
        }
    } else {
        if (isSaved) {
            buttonHtml = `<button disabled>✅ Уже в библиотеке</button>`;
        } else {
            buttonHtml = `<button id="saveFromDetailBtn">📥 Сохранить в библиотеку</button>`;
        }
    }

    content.innerHTML = `
        ${thumbnailHtml}
        <div class="detail-name">${escapeHtml(pattern.name)}</div>
        <div class="detail-meta">
            <span>👤 ${escapeHtml(pattern.author || 'Неизвестный автор')}</span>
            <span>${getCategoryIcon(pattern.categoryName)} ${escapeHtml(pattern.categoryName)}</span>
            <span>${escapeHtml(pattern.difficulty || 'Сложность не указана')}</span>
            <span>${escapeHtml(pattern.materials || 'Материалы не указаны')}</span>
            <span>📅 ${new Date(pattern.uploadDate).toLocaleDateString()}</span>
        </div>
        ${priceDisplayHtml}
        <div class="detail-description">${escapeHtml(pattern.description || 'Описание отсутствует')}</div>
        <div class="detail-actions">
            ${buttonHtml}
            <button id="detailCloseBtn" class="user-btn">Закрыть</button>
        </div>
    `;

    const modal = document.getElementById('patternDetailModal');
    const closeBtn = modal.querySelector('#detailCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal('patternDetailModal'));
    }

    const saveBtn = document.getElementById('saveFromDetailBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            await saveToLibrary(pattern.id, pattern.userId);
            closeModal('patternDetailModal');
            await loadSavedIds();
            await loadCatalog();
            if (authToken) await loadUserPatterns();
        });
    }

    const buyBtn = document.getElementById('buyPatternBtn');
    if (buyBtn) {
        buyBtn.addEventListener('click', async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE}/patterns/${pattern.id}/buy`, { method: 'POST' });
                if (!res.ok) {
                    const err = await res.text();
                    throw new Error(err);
                }
                alert('Схема куплена! Она добавлена в вашу библиотеку.');
                closeModal('patternDetailModal');
                await loadCatalog();
                if (authToken) await loadUserPatterns();
                await loadSavedIds();
            } catch (err) {
                alert('Ошибка покупки: ' + err.message);
            }
        });
    }

    const loginBtn = document.querySelector('.login-to-save-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            closeModal('patternDetailModal');
            openModal('loginModal');
        });
    }
}

async function saveToLibrary(publicId, patternUserId) {
    if (patternUserId && String(patternUserId) === currentUserId) {
        return;
    }
    if (savedPatternIds.includes(publicId)) {
        alert('Эта схема уже есть в вашей библиотеке');
        return;
    }
    try {
        const res = await fetchWithAuth(`${API_BASE}/catalog/${publicId}/save`, { method: 'POST' });
        if (res.status === 409) {
            const msg = await res.text();
            alert(msg);
            return;
        }
        if (!res.ok) {
            alert('Ошибка при сохранении');
            return;
        }
        savedPatternIds.push(publicId);
        await loadCatalog();
        await loadUserPatterns();
        const savedCatalogSubtab = document.querySelector('#library-tab .sub-tab-btn[data-subtab="saved-catalog"]');
        if (savedCatalogSubtab && !savedCatalogSubtab.classList.contains('active')) {
            savedCatalogSubtab.click();
        }
        alert('Схема сохранена в библиотеку');
    } catch (err) {
        alert('Ошибка при сохранении: ' + err.message);
    }
}

async function loadPatternForView(id) {
    currentPatternId = id;
    try {
        const res = await fetchWithAuth(`${API_BASE}/patterns/${id}`);
        if (!res.ok) throw new Error('Нет доступа');
        const blob = await res.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        currentPdfDoc = pdf;
        totalPages = pdf.numPages;
        currentPage = 1;
        document.getElementById('pageControls').style.display = 'flex';
        document.getElementById('totalPagesNum').innerText = totalPages;
        document.getElementById('currentPageNum').innerText = currentPage;
        updateNavButtons();
        await renderCurrentPage();
        noPatternMsg.style.display = 'none';
        canvas.style.display = 'block';
        updateZoomButtonsState();
    } catch (err) {
        console.error(err);
        alert('Ошибка загрузки PDF');
        clearViewer();
    }
    if (notesPanelOpen) {
        loadNotesForCurrentPattern();
    }

}

async function renderCurrentPage() {
    if (!currentPdfDoc) return;
    const page = await currentPdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale: currentScale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    await page.render({ canvasContext: ctx, viewport }).promise;
}

function updateNavButtons() {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    if (prevBtn) prevBtn.disabled = (currentPage === 1);
    if (nextBtn) nextBtn.disabled = (currentPage === totalPages);
}

function goPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        document.getElementById('currentPageNum').innerText = currentPage;
        renderCurrentPage();
        updateNavButtons();
    }
}

function goNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        document.getElementById('currentPageNum').innerText = currentPage;
        renderCurrentPage();
        updateNavButtons();
    }
}

function clearViewer() {
    currentPatternId = null;
    currentPdfDoc = null;
    canvas.style.display = 'none';
    noPatternMsg.style.display = 'block';
    const pageControls = document.getElementById('pageControls');
    if (pageControls) pageControls.style.display = 'none';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (notesPanelOpen) {
        document.getElementById('notesPanel').style.display = 'none';
        notesPanelOpen = false;
    }
    updateZoomButtonsState();
}

async function handleLibraryAction(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const card = btn.closest('.library-card');
    if (!card) return;
    const id = parseInt(card.dataset.id);
    const owner = card.dataset.owner;

    if (action === 'view') {
        loadPatternForView(id);
    } else if (action === 'delete') {
        if (confirm(owner === 'saved' ? 'Удалить схему из библиотеки?' : 'Удалить схему навсегда?')) {
            try {
                let url;
                if (owner === 'saved') {
                    url = `${API_BASE}/library/${id}`;
                } else {
                    url = `${API_BASE}/patterns/${id}`;
                }
                const response = await fetchWithAuth(url, { method: 'DELETE' });
                if (response.ok) {
                    if (currentPatternId === id) clearViewer();
                    await loadUserPatterns();
                    await loadSavedIds();
                    await loadCatalog(currentCategory);
                }
                if (currentPatternId === id) clearViewer();
                await loadUserPatterns();
                await loadSavedIds();
                if (document.querySelector('.tab-btn.active').getAttribute('data-tab') === 'catalog') {
                    loadCatalog(currentCategory);
                }
            } catch (err) {
                alert('Ошибка удаления: ' + err.message);
            }
        }
    } else if (action === 'download') {
        try {
            const resp = await fetchWithAuth(`${API_BASE}/patterns/${id}/download`);
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '';
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('Ошибка скачивания');
        }
    }  else if (action === 'publish') {
            const id = parseInt(card.dataset.id);
            let currentCategory = card.dataset.categoryName;
            const currentName = card.dataset.name;

            if (!currentCategory || currentCategory === '') {
            currentCategory = prompt('Укажите категорию для публикации (Игрушки, Одежда, Аксессуары):');
            if (!currentCategory || !['Игрушки', 'Одежда', 'Аксессуары'].includes(currentCategory.toLowerCase())) {
            alert('Категория не указана или неверна. Публикация отменена.');
            return;
            }
            currentCategory = currentCategory.toLowerCase();
            }

            const url = `${API_BASE}/patterns/${id}/publish?name=${encodeURIComponent(currentName)}&category=${encodeURIComponent(currentCategory)}&author=`;
            const res = await fetchWithAuth(url, { method: 'POST' });
            if (res.ok) {
            alert('Схема опубликована в каталоге!');
            loadUserPatterns();
            loadCatalog(currentCategory);
            } else {
            const errorText = await res.text();
            alert('Ошибка публикации: ' + errorText);
            }
    }
}

async function loadSavedIds() {
    if (!authToken) return;
    try {
        const res = await fetchWithAuth('/api/patterns/saved-ids');
        if (!res.ok) {
            if (res.status === 401) logout();
            return;
        }
        savedPatternIds = await res.json();
    } catch (err) {
        console.error('Ошибка загрузки сохранённых ID', err);
        savedPatternIds = [];
    }
}

function updateLibraryVisibility() {
    const guestMsg = document.getElementById('libraryGuestMessage');
    const authContent = document.getElementById('libraryAuthContent');
    const uploadBtn = document.getElementById('uploadBtn');

    if (!authToken) {
        if (guestMsg) guestMsg.style.display = 'flex';
        if (authContent) authContent.style.display = 'none';
    } else {
        if (guestMsg) guestMsg.style.display = 'none';
        if (authContent) authContent.style.display = 'block';
    }

    if (uploadBtn) {
        uploadBtn.onclick = () => {
            if (!authToken) {
                alert('Необходимо войти');
                return;
            }
            openModal('uploadModal');
        };
    }
}

document.getElementById('uploadForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pdfFile = document.getElementById('uploadPdf').files[0];
    if (!pdfFile) {
        alert('Выберите PDF файл');
        return;
    }
    const coverFile = document.getElementById('uploadCover').files[0] || null;
    const formData = new FormData();
    formData.append('file', pdfFile);
    if (coverFile) formData.append('cover', coverFile);
    formData.append('name', document.getElementById('uploadName').value.trim());
    formData.append('category', document.getElementById('uploadCategory').value);
    formData.append('difficulty', document.getElementById('uploadDifficulty').value);
    formData.append('materials', document.getElementById('uploadMaterials').value);
    formData.append('description', document.getElementById('uploadDescription').value.trim());
    formData.append('price', document.getElementById('uploadPrice').value.trim());

    try {
        const res = await fetchWithAuth(`${API_BASE}/patterns`, {
            method: 'POST',
            body: formData
        });
        if (!res.ok) {
            const msg = await res.text();
            throw new Error(msg || 'Ошибка сервера');
        }
        closeModal('uploadModal');
        await loadUserPatterns();
        await loadCatalog();
        document.getElementById('uploadForm').reset();
        const authorField = document.getElementById('uploadAuthor');
        if (authorField) {
            authorField.disabled = false;
            authorField.value = '';
        }
        loadUserPatterns();
    } catch (err) {
        alert('Ошибка загрузки: ' + err.message);
    }
});

const subTabBtns = document.querySelectorAll('#library-tab .sub-tab-btn');
subTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const subtab = btn.dataset.subtab;
        subTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.subtab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(subtab).classList.add('active');
        if (subtab === 'saved-yarns') {
            loadSavedYarns();
        }
    });
});

async function loadYarnsForSelector() {
    const container = document.getElementById('yarnSelectorList');
    if (!container) return;
    try {
        let yarns = [];
        if (authToken) {
            const res = await fetchWithAuth(`${API_BASE}/yarns/favorites`);
            if (!res.ok) throw new Error('Ошибка загрузки сохранённой пряжи');
            yarns = await res.json();
            if (!yarns.length) {
                container.innerHTML = '<div class="empty">🧶 У вас нет сохранённой пряжи. Добавьте пряжу в библиотеку на вкладке "Пряжа".</div>';
                return;
            }
        } else {
            const res = await fetch(`${API_BASE}/yarns`);
            if (!res.ok) throw new Error('Ошибка загрузки каталога');
            yarns = await res.json();
        }
        renderYarnSelectorCards(yarns);
    } catch (err) {
        container.innerHTML = '<div class="empty">❌ Не удалось загрузить пряжу</div>';
        console.error(err);
    }
}

function renderYarnSelectorCards(yarns) {
    const container = document.getElementById('yarnSelectorList');
    if (!container) return;
    if (!yarns.length) {
        container.innerHTML = '<div class="empty">🧶 Нет доступной пряжи</div>';
        return;
    }
    container.innerHTML = yarns.map(y => {
        let stitches = y.stitches;
        let rows = y.rows;
        if ((!stitches || !rows) && y.gauge) {
            const match = y.gauge.match(/(\d+)\D+(\d+)/);
            if (match) {
                stitches = parseInt(match[1], 10);
                rows = parseInt(match[2], 10);
            }
        }
        const gaugeText = (stitches && rows) ? `${stitches}п x ${rows}р` : 'плотность не указана';
        return `
            <div class="yarn-selector-card catalog-card" data-yarn='${JSON.stringify(y)}'>
                ${y.imagePath ? `<div class="pattern-thumbnail"><img src="${getYarnImageUrl(y.imagePath)}" alt="${escapeHtml(y.name)}"></div>` : `<div class="pattern-icon">🧵</div>`}
                <div class="pattern-name">${escapeHtml(y.name)}</div>
                <div class="pattern-author">${escapeHtml(y.brand || 'Бренд не указан')}</div>
                <div class="pattern-gauge">${gaugeText}</div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('#yarnSelectorList .yarn-selector-card').forEach(card => {
        card.addEventListener('click', () => {
            const yarnData = JSON.parse(card.dataset.yarn);
            fillCalculatorFromYarn(yarnData);
            closeModal('selectYarnModal');
        });
    });
}

async function showAuthorProfile(userId, authorName) {
    if (!userId) {
        alert('Информация об авторе недоступна');
        return;
    }
    const modal = document.getElementById('authorProfileModal');
    const nameElement = document.getElementById('authorProfileName');
    const container = document.getElementById('authorPatternsList');

    nameElement.textContent = `Схемы автора: ${escapeHtml(authorName || 'Автор')}`;
    container.innerHTML = '<div class="empty">Загрузка...</div>';
    openModal('authorProfileModal');

    try {
        const response = await fetch(`${API_BASE}/users/${userId}/patterns`);
        if (!response.ok) throw new Error('Не удалось загрузить схемы автора');
        const patterns = await response.json();

        if (!patterns.length) {
            container.innerHTML = '<div class="empty">У автора пока нет опубликованных схем.</div>';
            return;
        }

        container.innerHTML = patterns.map(p => {
            const thumbnailHtml = p.thumbnailPath
            ? `<div class="pattern-thumbnail"><img src="/api/thumbnails/${p.thumbnailPath}" alt="${escapeHtml(p.name)}"></div>`
            : `<div class="pattern-icon">${getCategoryIcon(p.categoryName)}</div>`;
            const saveButton = (authToken && !p.own && !p.saved)
            ? `<button class="save-from-author-profile" data-id="${p.id}">📥 Сохранить</button>`
            : (p.saved ? `<button disabled>✅ В библиотеке</button>` : '');
            return `
                <div class="catalog-card" data-id="${p.id}">
                    ${thumbnailHtml}
                    <div class="pattern-name">${escapeHtml(p.name)}</div>
                    <div class="pattern-author">${escapeHtml(p.author || 'Неизвестный автор')}</div>

                </div>
            `;
        }).join('');

        container.querySelectorAll('.catalog-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('save-from-author-profile')) return;
                const id = parseInt(card.dataset.id);
                showPatternDetail(id);
                closeModal('authorProfileModal');
            });
            const saveBtn = card.querySelector('.save-from-author-profile');
            if (saveBtn) {
                saveBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = parseInt(saveBtn.dataset.id);
                    await saveToLibrary(id);
                    showAuthorProfile(userId, authorName);
                });
            }
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty">❌ Ошибка загрузки схем автора</div>';
    }
}

function fillCalculatorFromYarn(yarn) {
    if (!yarn) return;

    const meterInput = document.getElementById('yarnMeterPer100g');
    if (meterInput && yarn.length && yarn.weight) {
        const metersPer100g = (yarn.length / yarn.weight) * 100;
        meterInput.value = Math.round(metersPer100g);
    }

    const stitchesInput = document.getElementById('gaugeStitches10');
    const rowsInput = document.getElementById('gaugeRows10');
    if (stitchesInput && yarn.stitches) stitchesInput.value = yarn.stitches;
    if (rowsInput && yarn.rows) rowsInput.value = yarn.rows;

    const infoDiv = document.getElementById('selectedYarnInfo');
    if (infoDiv) {
        infoDiv.innerHTML = `✅ Выбрана: <strong>${escapeHtml(yarn.name)}</strong> (${escapeHtml(yarn.brand || 'бренд не указан')})`;
    }
    currentSelectedYarn = yarn;

    const event = new Event('input');
    meterInput?.dispatchEvent(event);
    stitchesInput?.dispatchEvent(event);
    rowsInput?.dispatchEvent(event);
}

function initCalculator() {
    const gaugeStitches10 = document.getElementById('gaugeStitches10');
    const gaugeRows10 = document.getElementById('gaugeRows10');
    const sampleWidth = document.getElementById('sampleWidthCm');
    const sampleHeight = document.getElementById('sampleHeightCm');
    const sampleYarnLength = document.getElementById('sampleYarnLengthM');
    const itemWidthCm = document.getElementById('itemWidthCm');
    const itemHeightCm = document.getElementById('itemHeightCm');
    const itemStitchesW = document.getElementById('itemStitchesW');
    const itemRowsH = document.getElementById('itemRowsH');
    const meterPer100g = document.getElementById('yarnMeterPer100g');
    const requiredLengthSpan = document.getElementById('requiredLengthM');
    const requiredWeightSpan = document.getElementById('requiredWeightG');
    const selectedYarnInfo = document.getElementById('selectedYarnInfo');

    function updateFromCm() {
        const stitches10 = parseFloat(gaugeStitches10?.value);
        const rows10 = parseFloat(gaugeRows10?.value);
        let width = parseFloat(itemWidthCm?.value);
        let height = parseFloat(itemHeightCm?.value);

        if (!isNaN(stitches10) && stitches10 > 0 && !isNaN(width) && width > 0) {
            const stitches = Math.round(width * (stitches10 / 10));
            if (itemStitchesW) itemStitchesW.value = stitches;
        } else {
            if (itemStitchesW) itemStitchesW.value = '';
        }
        if (!isNaN(rows10) && rows10 > 0 && !isNaN(height) && height > 0) {
            const rows = Math.round(height * (rows10 / 10));
            if (itemRowsH) itemRowsH.value = rows;
        } else {
            if (itemRowsH) itemRowsH.value = '';
        }
    }

    function calculateYarnUsage() {
        let sw = parseFloat(sampleWidth?.value);
        let sh = parseFloat(sampleHeight?.value);
        let sampleLength = parseFloat(sampleYarnLength?.value);
        let iw = parseFloat(itemWidthCm?.value);
        let ih = parseFloat(itemHeightCm?.value);
        let meter100 = parseFloat(meterPer100g?.value);

        if (isNaN(sw) || sw <= 0 || isNaN(sh) || sh <= 0 || isNaN(sampleLength) || sampleLength <= 0 ||
        isNaN(iw) || iw <= 0 || isNaN(ih) || ih <= 0 || isNaN(meter100) || meter100 <= 0) {
            if (requiredLengthSpan) requiredLengthSpan.innerText = '--- м';
            if (requiredWeightSpan) requiredWeightSpan.innerText = '--- г';
            return;
        }

        const sampleArea = sw * sh;
        const itemArea = iw * ih;
        const requiredLength = (itemArea * sampleLength) / sampleArea;
        const requiredWeight = requiredLength / (meter100 / 100);

        if (requiredLengthSpan) requiredLengthSpan.innerText = Math.round(requiredLength) + ' м';
        if (requiredWeightSpan) requiredWeightSpan.innerText = Math.round(requiredWeight) + ' г';
    }

    function resetCalculator() {
        if (gaugeStitches10) gaugeStitches10.value = '';
        if (gaugeRows10) gaugeRows10.value = '';
        if (sampleWidth) sampleWidth.value = '';
        if (sampleHeight) sampleHeight.value = '';
        if (sampleYarnLength) sampleYarnLength.value = '';
        if (itemWidthCm) itemWidthCm.value = '';
        if (itemHeightCm) itemHeightCm.value = '';
        if (itemStitchesW) itemStitchesW.value = '';
        if (itemRowsH) itemRowsH.value = '';
        if (meterPer100g) meterPer100g.value = '';
        if (requiredLengthSpan) requiredLengthSpan.innerText = '--- м';
        if (requiredWeightSpan) requiredWeightSpan.innerText = '--- г';
        if (selectedYarnInfo) selectedYarnInfo.innerHTML = 'Пряжа не выбрана';
        window.currentSelectedYarn = null;
    }

    const calcStitchesRowsBtn = document.getElementById('calcStitchesRowsBtn');
    if (calcStitchesRowsBtn) {
        calcStitchesRowsBtn.addEventListener('click', () => {
            updateFromCm();
        });
    }

    const calcConsumptionBtn = document.getElementById('calcConsumptionBtn');
    if (calcConsumptionBtn) {
        calcConsumptionBtn.addEventListener('click', () => {
            calculateYarnUsage();
        });
    }

    const resetBtn = document.getElementById('resetCalculatorBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetCalculator();
        });
    }

    //resetCalculator();
}


const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');

if (zoomInBtn && zoomOutBtn) {
    zoomInBtn.addEventListener('click', () => {
        if (!currentPdfDoc) return;
        if (currentScale < 3.0) {
            currentScale = Math.min(3.0, currentScale + 0.1);
            scaleValue.innerText = `${Math.round(currentScale * 100)}%`;
            renderCurrentPage();
        }
    });
    zoomOutBtn.addEventListener('click', () => {
        if (!currentPdfDoc) return;
        if (currentScale > 0.5) {
            currentScale = Math.max(0.5, currentScale - 0.1);
            scaleValue.innerText = `${Math.round(currentScale * 100)}%`;
            renderCurrentPage();
        }
    });
}

function updateZoomButtonsState() {
    const zoomIn = document.getElementById('zoomInBtn');
    const zoomOut = document.getElementById('zoomOutBtn');
    if (zoomIn) zoomIn.disabled = !currentPdfDoc;
    if (zoomOut) zoomOut.disabled = !currentPdfDoc;
}

const mainTabs = document.querySelectorAll('.tab-btn');
mainTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        console.log('Переключение на вкладку:', tabId);
        mainTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        const activeTab = document.getElementById(`${tabId}-tab`);
        if (activeTab) activeTab.classList.add('active');

        if (tabId === 'catalog') {
            const catalogSubTabBtns = document.querySelectorAll('.catalog-subtabs .sub-tab-btn');
            const schemesBtn = Array.from(catalogSubTabBtns).find(btn => btn.dataset.subtab === 'schemes');
            if (schemesBtn && !schemesBtn.classList.contains('active')) {
                schemesBtn.click();
            } else if (schemesBtn && schemesBtn.classList.contains('active')) {
                const schemesView = document.getElementById('schemesView');
                const yarnsView = document.getElementById('yarnsView');
                if (schemesView) schemesView.style.display = 'block';
                if (yarnsView) yarnsView.style.display = 'none';
                applyFiltersAndRender();
            }
        }
        if (tabId === 'library') {
            updateLibraryVisibility();
            loadUserPatterns();
            loadSavedYarns();

            const librarySubTabBtns = document.querySelectorAll('#library-tab .sub-tab-btn');
            const savedCatalogBtn = Array.from(librarySubTabBtns).find(btn => btn.dataset.subtab === 'saved-catalog');
            if (savedCatalogBtn) {
                librarySubTabBtns.forEach(b => b.classList.remove('active'));
                savedCatalogBtn.classList.add('active');
                document.querySelectorAll('#library-tab .subtab-content').forEach(c => c.classList.remove('active'));
                const contentToShow = document.getElementById('saved-catalog');
                if (contentToShow) contentToShow.classList.add('active');
            }
        }
        if (tabId === 'calculator') {
            setTimeout(() => {
                //if (typeof initCalculator === 'function') initCalculator();
                const gauge10 = document.getElementById('gauge10');
                if (gauge10) gauge10.dispatchEvent(new Event('input'));
            }, 50);
        }
    });
});

async function loadSavedYarns() {
    if (!authToken) {
        savedYarns = [];
        renderSubtab('saved-yarns');
        return;
    }
    try {
        const res = await fetchWithAuth(`${API_BASE}/yarns/favorites`);
        if (!res.ok) throw new Error('Ошибка загрузки сохранённой пряжи');
        const data = await res.json();
        savedYarns = Array.isArray(data) ? data : [];
        renderSubtab('saved-yarns');
    } catch (err) {
        console.error('Ошибка загрузки сохранённой пряжи:', err);
        savedYarns = [];
        renderSubtab('saved-yarns');
    }
}

async function openAdminModal() {
    if (!isAdmin()) {
        alert('Доступ запрещён');
        return;
    }
    await loadAdminYarns();
    await loadAdminPatterns();
    await loadAdminUsers();
    await loadAdminCategories();
    await loadAdminStats();
    openModal('adminModal');
    document.getElementById('adminAddYarnBtn')?.addEventListener('click', () => openYarnForm());
}

async function loadAdminYarns() {
    const container = document.getElementById('adminYarnsList');
    if (!container) return;
    container.innerHTML = 'Загрузка...';
    try {
        const res = await fetchWithAuth(`${API_BASE}/admin/yarns`);
        if (!res.ok) throw new Error('Ошибка загрузки');
        const yarns = await res.json();
        if (!yarns.length) {
            container.innerHTML = '<div class="empty">Нет пряжи</div>';
            return;
        }
        container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr><th>Название</th><th>Бренд</th><th>Действия</th></tr>
                </thead>
                <tbody>
                    ${yarns.map(y => `
                        <tr>
                            <td>${escapeHtml(y.name)}</td>
                            <td>${escapeHtml(y.brand || '')}</td>
                            <td>
                                <button class="edit-yarn-btn" data-id="${y.id}">✏️</button>
                                <button class="delete-yarn-btn" data-id="${y.id}">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        document.querySelectorAll('.edit-yarn-btn').forEach(btn => {
            btn.addEventListener('click', () => openYarnForm(parseInt(btn.dataset.id)));
        });
        document.querySelectorAll('.delete-yarn-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Удалить пряжу?')) {
                    const id = parseInt(btn.dataset.id);
                    await fetchWithAuth(`${API_BASE}/admin/yarns/${id}`, { method: 'DELETE' });
                    allYarns = [];
                    await loadAllYarns(true);
                    await loadAdminYarns();
                    if (currentCatalogSubtab === 'yarns') {
                        applyYarnFiltersAndRender();
                    }
                }
            });
        });
    } catch (err) {
        container.innerHTML = '<div class="empty">Ошибка загрузки</div>';
    }
}

async function openYarnForm(id = null) {
    const formModal = document.getElementById('adminYarnFormModal');
    const title = document.getElementById('adminYarnFormTitle');
    const form = document.getElementById('adminYarnForm');
    form.reset();
    document.getElementById('adminYarnId').value = '';
    document.getElementById('adminYarnImage').value = '';
    document.getElementById('currentYarnImage').innerHTML = '';

    if (id) {
        title.innerText = 'Редактировать пряжу';
        try {
            const res = await fetchWithAuth(`${API_BASE}/admin/yarns/${id}`);
            if (res.ok) {
                const yarn = await res.json();
                document.getElementById('adminYarnId').value = yarn.id;
                document.getElementById('adminYarnName').value = yarn.name || '';
                document.getElementById('adminYarnBrand').value = yarn.brand || '';
                document.getElementById('adminYarnWeight').value = yarn.weight || '';
                document.getElementById('adminYarnLength').value = yarn.length || '';
                document.getElementById('adminYarnComposition').value = yarn.composition || '';
                document.getElementById('adminYarnHookSize').value = yarn.hookSize || '';
                document.getElementById('adminYarnNeedleSize').value = yarn.needleSize || '';
                document.getElementById('adminYarnCountry').value = yarn.country || '';
                document.getElementById('adminYarnStitches').value = yarn.stitches || '';
                document.getElementById('adminYarnRows').value = yarn.rows || '';
                if (yarn.imagePath) {
                    document.getElementById('currentYarnImage').innerHTML =
                    `<img src="${getYarnImageUrl(yarn.imagePath)}" style="max-width: 100px;"
                     onerror="this.onerror=null; this.parentElement.innerHTML='<span>Ошибка загрузки</span>';">`;
                } else {
                    document.getElementById('currentYarnImage').innerHTML = '<span style="color: gray;">Нет изображения</span>';
                }
            } else {
                alert('Ошибка загрузки данных пряжи');
            }
        } catch (err) {
            alert('Ошибка: ' + err.message);
        }
    } else {
        title.innerText = 'Добавить пряжу';
        document.getElementById('currentYarnImage').innerHTML = '<span style="color: gray;">Нет изображения</span>';
    }
    formModal.style.display = 'flex';
}

async function fillCategorySelect(selectId, type, selectedValue = '') {
    const select = document.getElementById(selectId);
    if (!select) return;
    const res = await fetchWithAuth(`${API_BASE}/admin/categories`);
    const cats = await res.json();
    const filtered = cats.filter(c => c.type === type);
    select.innerHTML = '<option value="">-- Выберите категорию --</option>' +
    filtered.map(c => `<option value="${escapeHtml(c.name)}" ${c.name === selectedValue ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
}

document.getElementById('adminYarnForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('adminYarnId').value;
    const imageFile = document.getElementById('adminYarnImage').files[0];

    const yarnData = {
        name: document.getElementById('adminYarnName').value,
        brand: document.getElementById('adminYarnBrand').value,
        weight: parseFloat(document.getElementById('adminYarnWeight').value) || null,
        length: parseFloat(document.getElementById('adminYarnLength').value) || null,
        composition: document.getElementById('adminYarnComposition').value,
        hookSize: document.getElementById('adminYarnHookSize').value,
        needleSize: document.getElementById('adminYarnNeedleSize').value,
        country: document.getElementById('adminYarnCountry').value,
        stitches: parseInt(document.getElementById('adminYarnStitches').value) || null,
        rows: parseInt(document.getElementById('adminYarnRows').value) || null
    };

    let yarnId = id;

    try {
        if (id) {
            const res = await fetchWithAuth(`${API_BASE}/admin/yarns/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(yarnData)
            });
            if (!res.ok) throw new Error(await res.text());
            if (imageFile) {
                const imgFormData = new FormData();
                imgFormData.append('file', imageFile);
                const imgRes = await fetchWithAuth(`${API_BASE}/admin/yarns/${id}/image`, {
                    method: 'POST',
                    body: imgFormData
                });
                if (!imgRes.ok) throw new Error('Ошибка загрузки изображения');
            }
        }
        else {
            const res = await fetchWithAuth(`${API_BASE}/admin/yarns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(yarnData)
            });
            if (!res.ok) throw new Error(await res.text());
            const newYarn = await res.json();
            yarnId = newYarn.id;
            if (imageFile) {
                const imgFormData = new FormData();
                imgFormData.append('file', imageFile);
                const imgRes = await fetchWithAuth(`${API_BASE}/admin/yarns/${yarnId}/image`, {
                    method: 'POST',
                    body: imgFormData
                });
                if (!imgRes.ok) throw new Error('Ошибка загрузки изображения');
            }
        }
        allYarns = [];
        await loadAllYarns(true);
        if (currentCatalogSubtab === 'yarns') {
            applyYarnFiltersAndRender();
        }
        if (authToken) await loadSavedYarns();

        closeModal('adminYarnFormModal');
        await loadAdminYarns();
    } catch (err) {
        alert('Ошибка: ' + err.message);
    }
});

document.getElementById('cancelYarnFormBtn')?.addEventListener('click', () => {
    closeModal('adminYarnFormModal');
});


async function loadPatternCategories() {
    const res = await fetchWithAuth(`${API_BASE}/admin/categories`);
    const all = await res.json();
    adminPatternCategories = all.filter(c => c.type === 'PATTERN');
    return adminPatternCategories;
}

async function loadAdminPatterns() {
    const container = document.getElementById('adminPatternsList');
    if (!container) return;
    container.innerHTML = 'Загрузка...';
    try {
        const [patterns, categories] = await Promise.all([
            fetchWithAuth(`${API_BASE}/admin/patterns`).then(r => r.json()),
            loadPatternCategories()
        ]);
        if (!patterns.length) {
            container.innerHTML = '<div class="empty">Нет схем</div>';
            return;
        }
        container.innerHTML = `
    <table class="admin-table">
        <thead>
            <tr><th>Название</th><th>Автор</th><th>Категория</th><th>Действия</th></tr>
        </thead>
        <tbody>
            ${patterns.map(p => `
                <tr data-id="${p.id}">
                    <td>${escapeHtml(p.name)}</td>
                    <td>${escapeHtml(p.author || '')}</td>
                    <td>
                        <select class="admin-pattern-category" data-id="${p.id}" data-old="${escapeHtml(p.category?.name || '')}">
                            ${categories.map(cat => `
                                <option value="${escapeHtml(cat.name)}" ${p.category?.name === cat.name ? 'selected' : ''}>${escapeHtml(cat.name)}</option>
                            `).join('')}
                            ${!p.category?.name || !categories.some(c => c.name === p.category?.name) ?
                                `<option value="${escapeHtml(p.category?.name || '')}" selected>${escapeHtml(p.category?.name || 'Без категории')}</option>` : ''}
                        </select>
                    </td>
                    <td>
                        <button class="delete-pattern-btn" data-id="${p.id}">🗑️ Удалить</button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>
`;
        document.querySelectorAll('.admin-pattern-category').forEach(select => {
            select.addEventListener('change', async () => {
                const patternId = select.dataset.id;
                const newCategory = select.value;
                if (!newCategory) return;
                const res = await fetchWithAuth(`${API_BASE}/admin/patterns/${patternId}/category?category=${encodeURIComponent(newCategory)}`, { method: 'PATCH' });
                if (!res.ok) alert('Ошибка смены категории');
            });
        });
        document.querySelectorAll('.delete-pattern-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Удалить схему навсегда?')) {
                    const id = btn.dataset.id;
                    await fetchWithAuth(`${API_BASE}/admin/patterns/${id}`, { method: 'DELETE' });
                    await loadAdminPatterns();
                }
            });
        });
    } catch (err) {
        container.innerHTML = '<div class="empty">Ошибка загрузки</div>';
    }
}

async function loadAdminUsers() {
    const container = document.getElementById('adminUsersList');
    if (!container) return;
    container.innerHTML = 'Загрузка...';
    try {
        const res = await fetchWithAuth(`${API_BASE}/admin/users`);
        const users = await res.json();
        if (!users.length) {
            container.innerHTML = '<div class="empty">Нет пользователей</div>';
            return;
        }
        container.innerHTML = `
            <table class="admin-table">
                <thead><tr><th>Имя</th><th>Email</th><th>Роль</th><th>Действия</th></tr></thead>
                <tbody>
                    ${users.map(u => `
                        <tr>
                            <td>${escapeHtml(u.username)}</td>
                            <td>${escapeHtml(u.email)}</td>
                            <td>
                                <select class="admin-role-select" data-id="${u.id}">
                                    <option value="USER" ${u.role === 'USER' ? 'selected' : ''}>Пользователь</option>
                                    <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>Администратор</option>
                                </select>
                            </td>
                            <td>
                                <button class="delete-user-btn" data-id="${u.id}">🗑️ Удалить</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        document.querySelectorAll('.admin-role-select').forEach(select => {
            select.addEventListener('change', async () => {
                const userId = select.dataset.id;
                const newRole = select.value;
                const res = await fetchWithAuth(`${API_BASE}/admin/users/${userId}/role?role=${newRole}`, { method: 'PUT' });
                if (!res.ok) alert('Ошибка смены роли');
                else await loadAdminUsers();
            });
        });
        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Удалить пользователя? Все его данные будут удалены.')) {
                    const userId = btn.dataset.id;
                    await fetchWithAuth(`${API_BASE}/admin/users/${userId}`, { method: 'DELETE' });
                    await loadAdminUsers();

                    if (userId == currentUserId) {
                        logout(true);
                        return;
                    }

                    if (authToken) {
                        await loadUserPatterns();
                        await loadCatalog();
                        await loadSavedIds();
                        await loadFavoriteYarnIds();
                    }
                }
            });
        });
    } catch (err) {
        container.innerHTML = '<div class="empty">Ошибка загрузки</div>';
    }
}

async function loadAdminCategories() {
    const container = document.getElementById('adminCategoriesList');
    if (!container) return;
    container.innerHTML = 'Загрузка...';
    try {
        const categories = await loadPatternCategories();
        if (!categories.length) {
            container.innerHTML = '<div class="empty">Нет категорий для схем</div>';
            return;
        }
        const patternsRes = await fetchWithAuth(`${API_BASE}/admin/patterns`);
        const allPatterns = await patternsRes.json();
        const categoryUsage = new Map();
        allPatterns.forEach(p => {
            if (p.categoryName) categoryUsage.set(p.categoryName, true);
        });

        container.innerHTML = `
            <table class="admin-table">
                <thead><tr><th>Название</th><th>Действия</th></tr></thead>
                <tbody>
                    ${categories.map(c => `
                        <tr data-id="${c.id}">
                            <td>
                                <input type="text" class="category-name-input" value="${escapeHtml(c.name)}" data-id="${c.id}" data-original="${escapeHtml(c.name)}">
                            </td>
                            <td>
                                <button class="save-category-btn" data-id="${c.id}">💾 Сохранить</button>
                                <button class="delete-category-btn" data-id="${c.id}" ${categoryUsage.has(c.name) ? 'disabled' : ''}>🗑️ Удалить</button>
                                ${categoryUsage.has(c.name) ? '<span class="tooltip">⚠️ Используется в схемах</span>' : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        document.querySelectorAll('.save-category-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const input = document.querySelector(`.category-name-input[data-id="${id}"]`);
                const newName = input.value.trim();
                if (!newName) return alert('Название не может быть пустым');
                const oldName = input.dataset.original;
                if (newName === oldName) return;
                const res = await fetchWithAuth(`${API_BASE}/admin/categories/${id}?name=${encodeURIComponent(newName)}`, { method: 'PUT' });
                if (res.ok) {
                    input.dataset.original = newName;
                    await loadAdminCategories();
                    await loadAdminPatterns();
                } else {
                    const err = await res.text();
                    alert('Ошибка: ' + err);
                }
            });
        });
        document.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Удалить категорию? Все схемы с этой категорией останутся, но категория у них сбросится.')) return;
                const id = btn.dataset.id;
                const res = await fetchWithAuth(`${API_BASE}/admin/categories/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    await loadAdminCategories();
                    await loadAdminPatterns();
                } else {
                    const err = await res.text();
                    alert('Ошибка: ' + err);
                }
            });
        });
    } catch (err) {
        container.innerHTML = '<div class="empty">Ошибка загрузки категорий</div>';
    }
}

document.getElementById('adminAddCategoryBtn')?.addEventListener('click', async () => {
    const name = document.getElementById('newCategoryName').value.trim();
    if (!name) return alert('Введите название');
    const res = await fetchWithAuth(`${API_BASE}/admin/categories?name=${encodeURIComponent(name)}&type=PATTERN`, { method: 'POST' });
    if (res.ok) {
        document.getElementById('newCategoryName').value = '';
        await loadAdminCategories();
        await loadAdminPatterns();
    } else {
        const err = await res.text();
        alert('Ошибка: ' + err);
    }
});

async function loadAdminStats() {
    const container = document.getElementById('adminStatsContent');
    if (!container) return;
    container.innerHTML = 'Загрузка...';
    try {
        const res = await fetchWithAuth(`${API_BASE}/admin/statistics`);
        const stats = await res.json();

        const patternsRes = await fetchWithAuth(`${API_BASE}/admin/patterns`);
        const patterns = patternsRes.ok ? await patternsRes.json() : [];
        const patternMap = new Map(patterns.map(p => [p.id, p.name]));

        const yarnsRes = await fetchWithAuth(`${API_BASE}/admin/yarns`);
        const yarns = yarnsRes.ok ? await yarnsRes.json() : [];
        const yarnMap = new Map(yarns.map(y => [y.id, y.name]));

        const usersRes = await fetchWithAuth(`${API_BASE}/admin/users`);
        const users = usersRes.ok ? await usersRes.json() : [];
        const userMap = new Map(users.map(u => [u.id, u.username]));

        const decl = (n, titles) => {
            const cases = [2, 0, 1, 1, 1, 2];
            return titles[(n % 100 > 4 && n % 100 < 20) ? 2 : cases[(n % 10 < 5) ? n % 10 : 5]];
        };

        const getUserName = (userId) => {
            if (userId === null) return '🗑️ Удалённый пользователь';
            return userMap.get(userId) || `Пользователь #${userId}`;
        };

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">👥 Всего пользователей: <strong>${stats.totalUsers}</strong></div>
                <div class="stat-card">📄 Всего схем: <strong>${stats.totalPatterns}</strong></div>
                <div class="stat-card">🧶 Всего пряжи: <strong>${stats.totalYarns}</strong></div>
                <div class="stat-card">📂 Категорий: <strong>${stats.totalCategories}</strong></div>
                <div class="stat-card">💰 Платных схем: <strong>${stats.paidPatterns}</strong></div>
                <div class="stat-card">🛒 Всего покупок: <strong>${stats.totalPurchases}</strong></div>
            </div>
            <h4>⭐ Топ сохранённых схем</h4>
            <ul>${
                (stats.topSavedPatterns || []).slice(0, 3).map(([id, count]) => {
            const name = patternMap.get(id) || `Схема #${id}`;
            return `<li><span>${escapeHtml(name)}</span><span>${count} ${decl(count, ['сохранение', 'сохранения', 'сохранений'])}</span></li>`;
        }).join('') || '<li>Нет данных</li>'
            }</ul>
            <h4>❤️ Топ избранной пряжи</h4>
            <ul>${
        (stats.topFavoriteYarns || []).slice(0, 3).map(([id, count]) => {
            const name = yarnMap.get(id) || `Пряжа #${id}`;
            return `<li><span>${escapeHtml(name)}</span><span>${count} ${decl(count, ['раз', 'раза', 'раз'])}</span></li>`;
        }).join('') || '<li>Нет данных</li>'
            }</ul>
            <h4>✍️ Топ авторов по количеству схем</h4>
            <ul>${
        (stats.topPatternAuthors || []).slice(0, 3).map(([userId, count]) => {
            const userName = getUserName(userId);
            return `<li><span>${escapeHtml(userName)}</span><span>${count} ${decl(count, ['схема', 'схемы', 'схем'])}</span></li>`;
        }).join('') || '<li>Нет данных</li>'
            }</ul>
        `;
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty">Ошибка загрузки статистики</div>';
    }
}

document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.adminTab;
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`admin${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`).classList.add('active');
    });
});


async function validateToken() {
    if (!authToken) return;
    try {
        const res = await fetchWithAuth(`${API_BASE}/users/me`);
        if (!res.ok) {
            throw new Error('Invalid token');
        }
    } catch (err) {
        console.warn('Token validation failed, logging out', err);
        logout(false);
    }
}

async function init() {
    initAuth();
    await validateToken();
    updateLibraryVisibility();
    if (authToken) {
        await loadSavedIds();
        await loadUserPatterns();
        await loadFavoriteYarnIds();
        await loadSavedYarns();
    }
    await loadCatalog();
    initCatalogSubtabs();
    hideSearchDropdown();
    initYarnFilterListeners();
    loadAllYarns();
    attachFilterListeners();
    initCalculator();

    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const showNotesBtn = document.getElementById('showNotesBtn');
    if (showNotesBtn) {
        showNotesBtn.addEventListener('click', toggleNotesPanel);
    }
    const closeNotesPanel = document.getElementById('closeNotesPanelBtn');
    if (closeNotesPanel) {
        closeNotesPanel.addEventListener('click', () => toggleNotesPanel());
    }
    const saveNotesPanelBtn = document.getElementById('saveNotesPanelBtn');
    if (saveNotesPanelBtn) {
        saveNotesPanelBtn.addEventListener('click', saveNotesForCurrentPattern);
    }
    if (prevBtn) prevBtn.addEventListener('click', goPrevPage);
    if (nextBtn) nextBtn.addEventListener('click', goNextPage);
    const selectYarnBtn = document.getElementById('selectYarnBtn');
    if (selectYarnBtn) {
        selectYarnBtn.addEventListener('click', () => {
            loadYarnsForSelector();
            openModal('selectYarnModal');
        });
    }

}

init();