const STORAGE_KEY = "summerSportsTrackerV1";

const defaultState = {
  players: [],
  seasons: {},
  activeSeasonId: null,
};

let state = loadState();
initialize();

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultState);
  try {
    return { ...structuredClone(defaultState), ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getSeasonId(year, name) {
  return `${year}__${name.trim().toLowerCase()}`;
}

function ensureActiveSeason() {
  if (!state.activeSeasonId) {
    const now = new Date();
    const year = now.getFullYear();
    const name = "Summer";
    const id = getSeasonId(year, name);
    state.seasons[id] = state.seasons[id] || { year, name, pickleball: [], bowling: [] };
    state.activeSeasonId = id;
    saveState();
  }
  return state.seasons[state.activeSeasonId];
}

function initialize() {
  bindTabs();
  bindForms();
  ensureActiveSeason();
  renderAll();
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

function bindForms() {
  document.getElementById('season-form').addEventListener('submit', e => {
    e.preventDefault();
    const year = Number(document.getElementById('season-year').value);
    const name = document.getElementById('season-name').value.trim();
    if (!name) return;
    const id = getSeasonId(year, name);
    state.seasons[id] = state.seasons[id] || { year, name, pickleball: [], bowling: [] };
    state.activeSeasonId = id;
    saveState();
    renderAll();
  });

  document.getElementById('player-form').addEventListener('submit', e => {
    e.preventDefault();
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim();
    if (!name || state.players.includes(name)) return;
    state.players.push(name);
    state.players.sort((a, b) => a.localeCompare(b));
    nameInput.value = '';
    saveState();
    renderAll();
  });

  document.getElementById('pickleball-form').addEventListener('submit', e => {
    e.preventDefault();
    const winner = document.getElementById('pickleball-winner').value;
    const opponent = document.getElementById('pickleball-opponent').value;
    const notes = document.getElementById('pickleball-notes').value.trim();
    if (!winner) return;
    const season = ensureActiveSeason();
    season.pickleball.push({ winner, opponent: opponent || null, notes, at: new Date().toISOString() });
    saveState();
    renderAll();
  });

  document.getElementById('generate-sync-code').addEventListener('click', generateSyncCode);
  document.getElementById('copy-sync-code').addEventListener('click', copySyncCode);
  document.getElementById('import-sync-code').addEventListener('click', importSyncCode);

  document.getElementById('bowling-form').addEventListener('submit', e => {
    e.preventDefault();
    const player = document.getElementById('bowling-player').value;
    const score = Number(document.getElementById('bowling-score').value);
    if (!player || Number.isNaN(score)) return;
    const season = ensureActiveSeason();
    season.bowling.push({ player, score, at: new Date().toISOString() });
    saveState();
    renderAll();
  });
}

function renderAll() {
  const season = ensureActiveSeason();
  document.getElementById('active-season-label').textContent = `Current: ${season.name} ${season.year}`;
  renderPlayers();
  renderSeasonControls(season);
  renderPickleball(season);
  renderBowling(season);
  renderStats(season);
  renderArchive();
}

function renderPlayers() {
  const ul = document.getElementById('player-list');
  ul.innerHTML = state.players.map(p => `<li>${p}</li>`).join('') || '<li>No players yet</li>';

  const winnerSelect = document.getElementById('pickleball-winner');
  const oppSelect = document.getElementById('pickleball-opponent');
  const bowlingPlayer = document.getElementById('bowling-player');
  const opts = '<option value="">Select player</option>' + state.players.map(p => `<option value="${p}">${p}</option>`).join('');
  winnerSelect.innerHTML = opts;
  oppSelect.innerHTML = '<option value="">None</option>' + state.players.map(p => `<option value="${p}">${p}</option>`).join('');
  bowlingPlayer.innerHTML = opts;
}

function renderSeasonControls(season) {
  document.getElementById('season-year').value = season.year;
  document.getElementById('season-name').value = season.name;
}

function renderPickleball(season) {
  const list = document.getElementById('pickleball-games');
  list.innerHTML = season.pickleball.map(game => {
    const opponentText = game.opponent ? ` vs ${game.opponent}` : '';
    const notes = game.notes ? ` • ${game.notes}` : '';
    return `<li><strong>${game.winner}</strong> won${opponentText}${notes}</li>`;
  }).join('') || '<li>No pickleball games recorded</li>';
}

function renderBowling(season) {
  const list = document.getElementById('bowling-games');
  list.innerHTML = season.bowling.map(game => `<li><strong>${game.player}</strong> scored <strong>${game.score}</strong></li>`).join('') || '<li>No bowling scores recorded</li>';
}

function renderStats(season) {
  const pickleballWins = {};
  season.pickleball.forEach(g => { pickleballWins[g.winner] = (pickleballWins[g.winner] || 0) + 1; });

  const bowlingTotals = {};
  season.bowling.forEach(g => {
    bowlingTotals[g.player] = bowlingTotals[g.player] || { total: 0, games: 0 };
    bowlingTotals[g.player].total += g.score;
    bowlingTotals[g.player].games += 1;
  });

  const pLeader = Object.entries(pickleballWins).sort((a,b) => b[1]-a[1]);
  const bLeader = Object.entries(bowlingTotals).map(([p, s]) => [p, (s.total/s.games).toFixed(1)]).sort((a,b) => b[1]-a[1]);

  document.getElementById('pickleball-leaderboard').innerHTML = pLeader.map(([p,w]) => `<li>${p}: ${w} wins</li>`).join('') || '<li>No games yet</li>';
  document.getElementById('bowling-leaderboard').innerHTML = bLeader.map(([p,avg]) => `<li>${p}: ${avg} avg</li>`).join('') || '<li>No scores yet</li>';

  const stats = [
    `Players: ${state.players.length}`,
    `Pickleball games this season: ${season.pickleball.length}`,
    `Bowling scores this season: ${season.bowling.length}`,
    `Tracked seasons: ${Object.keys(state.seasons).length}`,
  ];
  document.getElementById('quick-stats').innerHTML = stats.map(s => `<li>${s}</li>`).join('');
}

function renderArchive() {
  const archive = document.getElementById('season-archive');
  const seasons = Object.values(state.seasons).sort((a,b) => b.year - a.year || a.name.localeCompare(b.name));
  archive.innerHTML = seasons.map(s => {
    const wins = s.pickleball.length;
    const bowls = s.bowling.length;
    return `<details><summary><strong>${s.name} ${s.year}</strong> — ${wins} pickleball games, ${bowls} bowling scores</summary>
      <p>Top pickleball winner: ${topWinner(s) || 'N/A'}</p>
      <p>Top bowling average: ${topBowler(s) || 'N/A'}</p>
    </details>`;
  }).join('');
}

function topWinner(season) {
  const wins = {};
  season.pickleball.forEach(g => wins[g.winner] = (wins[g.winner] || 0) + 1);
  return Object.entries(wins).sort((a,b) => b[1]-a[1])[0]?.[0] || null;
}

function topBowler(season) {
  const t = {};
  season.bowling.forEach(g => {
    t[g.player] = t[g.player] || { total: 0, games: 0 };
    t[g.player].total += g.score;
    t[g.player].games += 1;
  });
  return Object.entries(t).map(([p,s]) => [p,s.total/s.games]).sort((a,b) => b[1]-a[1])[0]?.[0] || null;
}


function showSyncStatus(message) {
  document.getElementById('sync-status').textContent = message;
}

function generateSyncCode() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'summerSportsTrackerV1',
    state,
  };
  const code = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  document.getElementById('sync-code').value = code;
  showSyncStatus('Sync code generated. Copy and paste it on the other phone.');
}

async function copySyncCode() {
  const area = document.getElementById('sync-code');
  if (!area.value.trim()) {
    showSyncStatus('Generate a code first.');
    return;
  }
  try {
    await navigator.clipboard.writeText(area.value.trim());
    showSyncStatus('Sync code copied to clipboard.');
  } catch {
    area.select();
    document.execCommand('copy');
    showSyncStatus('Sync code selected/copied. If needed, copy manually.');
  }
}

function importSyncCode() {
  const rawCode = document.getElementById('sync-code').value.trim();
  if (!rawCode) {
    showSyncStatus('Paste a sync code first.');
    return;
  }

  try {
    const decoded = decodeURIComponent(escape(atob(rawCode)));
    const parsed = JSON.parse(decoded);
    if (!parsed || parsed.app !== 'summerSportsTrackerV1' || typeof parsed.state !== 'object') {
      throw new Error('Invalid sync code');
    }

    state = { ...structuredClone(defaultState), ...parsed.state };
    ensureActiveSeason();
    saveState();
    renderAll();
    showSyncStatus(`Imported successfully (exported ${new Date(parsed.exportedAt).toLocaleString()}).`);
  } catch {
    showSyncStatus('Invalid sync code. Please verify and try again.');
  }
}
