// map values
let currentCategory = 'health';
let currentDatasetKey = 'life_birth';
let currentYear = 2023;

const dataCache = {};
buildMetricSelect('health');
loadAndRender();

// metric dropdown values
function buildMetricSelect(cat) {
  const sel = document.getElementById('metric-select');
  sel.innerHTML = '';
  CATEGORY_DATASETS[cat].forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = DATASETS[key].label;
    sel.appendChild(opt);
  });
  sel.value = currentDatasetKey;
}

// slider values to current data
function updateYearSlider(ds) {
  const slider = document.getElementById('year-slider');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  slider.min = ds.yearMin;
  slider.max = ds.yearMax;
  currentYear = clamp(currentYear, ds.yearMin, ds.yearMax);
  slider.value = currentYear;
  document.getElementById('year-display').textContent = currentYear;
}

// category set by button
function setCategory(cat) {
  currentCategory = cat;
  closePanel();
  document.querySelectorAll('.cat-tabs button').forEach(b =>
    b.classList.toggle('active', b.dataset.cat === cat));
  currentDatasetKey = CATEGORY_DATASETS[cat][0];
  buildMetricSelect(cat);
  loadAndRender();
}

// metric set by dropdown
document.getElementById('metric-select').addEventListener('change', e => {
  currentDatasetKey = e.target.value;
  closePanel();
  loadAndRender();
});

// map updating, check cache first then fetch and parse
function loadAndRender() {
  const ds = DATASETS[currentDatasetKey];
  updateYearSlider(ds);

  if (dataCache[currentDatasetKey]) {
    renderMap();
    refreshLegendIfOpen();
    return;
  }

  showLoading(`Loading ${ds.label}…`);

  Papa.parse(ds.file, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      // proper ISO
      const rows = results.data.filter(row => {
        const code = (row['Code'] || '').trim();
        return code.length === 3 && /^[A-Z]{3}$/.test(code);
      });
      // store year
      rows.forEach(r => { r._year = parseInt(r['Year']); });
      dataCache[currentDatasetKey] = rows;
      hideLoading();
      renderMap();
      refreshLegendIfOpen();
    },
    error: (err) => {
      document.getElementById('loading').innerHTML =
        `<div class="loading-text" style="color:#D32F2F">
          Failed to load: ${ds.file}<br>
          <small>${err.message}</small>
        </div>`;
    }
  });
}

const _colCache = {};

// actual column name for wanted
function resolveCol(rows, wantedCol) {
  if (_colCache[wantedCol]) return _colCache[wantedCol];
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]);
  if (keys.includes(wantedCol)) { _colCache[wantedCol] = wantedCol; return wantedCol; }
  const lower = wantedCol.toLowerCase();
  const found = keys.find(k => k.toLowerCase() === lower)
             || keys.find(k => k.toLowerCase().includes(lower.replace(' year old', '').trim()));
  if (found) { _colCache[wantedCol] = found; return found; }
  console.warn(`Column "${wantedCol}" not found. Available:`, keys);
  return null;
}

// the proper choropleth map
// year slider, category and metric and alt colors change it
function renderMap() {
  const ds = DATASETS[currentDatasetKey];
  const rows = dataCache[currentDatasetKey];
  if (!rows) return;

  // projected when past 2023
  let colName = ds.col;
  let isProjected = false;
  if (ds.colProjected && currentYear > 2023) {
    colName = ds.colProjected;
    isProjected = true;
  }

  const col = resolveCol(rows, colName);
  if (!col) {
    showLoading(`Column "${colName}" not found in ${ds.file}`);
    return;
  }

  // all rows for year except sparse literacy
  let subset;
  if (ds.mostRecentOnly) {
    const best = {};
    rows.forEach(r => {
      if (r._year > currentYear) return;
      const val  = parseFloat(r[col]);
      if (isNaN(val)) return;
      const code = r['Code'].trim();
      if (!best[code] || r._year > best[code]._year) best[code] = r;
    });
    subset = Object.values(best).map(r => ({
      code: r['Code'].trim(),
      name: r['Entity'] || r['Country'] || r['Code'],
      val: parseFloat(r[col]),
      dataYear: r._year,
    }));
  } else {
    subset = rows
      .filter(r => r._year === currentYear)
      .map(r => ({
        code: r['Code'].trim(),
        name: r['Entity'] || r['Country'] || r['Code'],
        val: parseFloat(r[col]),
        dataYear: null,
      }))
      .filter(r => !isNaN(r.val));
  }

  // average, max and min statistics
  // max and min also country name for hover
  const vals = subset.map(r => r.val);
  const fmt = v => v.toFixed(ds.decimals);
  document.getElementById('stat-avg').textContent =
    vals.length ? fmt(vals.reduce((a, b) => a + b, 0) / vals.length) : '—';
  if (vals.length) {
    const maxVal = Math.max(...vals);
    const minVal = Math.min(...vals);
    const maxRow = subset.find(r => r.val === maxVal);
    const minRow = subset.find(r => r.val === minVal);
    document.getElementById('stat-max').textContent = fmt(maxVal);
    document.getElementById('stat-min').textContent = fmt(minVal);
    document.getElementById('tip-max').textContent  = maxRow ? maxRow.name : '';
    document.getElementById('tip-min').textContent  = minRow ? minRow.name : '';
  } else {
    document.getElementById('stat-max').textContent = '—';
    document.getElementById('stat-min').textContent = '—';
    document.getElementById('tip-max').textContent  = '';
    document.getElementById('tip-min').textContent  = '';
  }

  document.getElementById('projected-badge').style.display =
    isProjected ? 'inline-block' : 'none';

  document.getElementById('footer-source').innerHTML =
    'Source: ' + ds.source + ' via <a href="https://ourworldindata.org" target="_blank">Our World in Data</a>';

  // override some values
  const hoverUnit = ds.hoverUnit !== undefined ? ds.hoverUnit : (ds.unit || '');
  const hoverUnitStr = hoverUnit ? ` ${hoverUnit}` : '';
  const hoverLbl = ds.hoverLabel || ds.label;
  const decFmt = `.${ds.decimals}f`;

  // note data year for most recent
  const hoverText = subset.map(r =>
    ds.mostRecentOnly && r.dataYear
      ? `${r.name} (data: ${r.dataYear})`
      : r.name
  );

  const plotData = [{
    type: 'choropleth',
    locations: subset.map(r => r.code),
    z: subset.map(r => r.val),
    text: hoverText,
    zmin: ds.zmin,
    zmax: ds.zmax,
    colorscale: CS[currentDatasetKey],
    hovertemplate: `<b>%{text}</b><br>${hoverLbl}: <b>%{z:${decFmt}}</b>${hoverUnitStr}<extra></extra>`,
    showscale: false,
    marker: { line: { color: '#333333', width: 0.5 } },
  }];

  const layout = {
    // preserve zoom and pan
    uirevision: 'map',
    margin: { t: 0, b: 0, l: 0, r: 0 },
    geo: {
      showframe: false,
      showcoastlines: true,
      coastlinecolor: '#CCCCCC',
      showland: true,
      landcolor: '#F2F3F4',
      showocean: true,
      oceancolor: '#EAF4FB',
      showlakes: true,
      lakecolor: '#EAF4FB',
      bgcolor: '#FFFFFF',
      projection: { type: 'natural earth' },
      domain: { x: [0, 1], y: [0, 1] },
    },
    paper_bgcolor: '#FFFFFF',
    plot_bgcolor: '#FFFFFF',
    hoverlabel: {
      bgcolor: '#F7F7F7',
      bordercolor: '#CCCCCC',
      font: { family: 'ui-monospace, monospace', color: '#1A1814' },
    },
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'toImage', 'pan2d', 'pan3d'],
    displaylogo: false,
  };

  Plotly.react('map', plotData, layout, config);
}

// year slider
const slider = document.getElementById('year-slider');
const yearDisplay = document.getElementById('year-display');
// minus and plus one
function stepYear(delta) {
  const ds = DATASETS[currentDatasetKey];
  currentYear = Math.max(ds.yearMin, Math.min(ds.yearMax, currentYear + delta));
  slider.value = currentYear;
  yearDisplay.textContent = currentYear;
  renderMap();
}
// render on drag release
slider.addEventListener('input', e => {
  currentYear = parseInt(e.target.value);
  yearDisplay.textContent = currentYear;
});
slider.addEventListener('change', () => renderMap());

function showLoading(msg) {
  const el = document.getElementById('loading');
  el.style.display = 'flex';
  el.innerHTML = `<div class="spinner"></div><div class="loading-text">${msg}</div>`;
}

function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}
