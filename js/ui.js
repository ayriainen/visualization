// zoom controls for resolution differences
var currentZoom = 100;

function pageZoom(delta) {
  currentZoom = Math.max(50, Math.min(150, currentZoom + delta));
  applyZoom();
}

function pageZoomReset() {
  currentZoom = 100;
  applyZoom();
}

function applyZoom() {
  document.getElementById('map').style.maxWidth = (1000 * currentZoom / 100) + 'px';
  document.getElementById('zoom-level').textContent = currentZoom + '%';
  Plotly.Plots.resize(document.getElementById('map'));
}

// alternative colors for accessibility
function toggleAltColors() {
  altColorsActive = !altColorsActive;
  CS = buildColorscales();
  var btn = document.getElementById('cb-btn');
  btn.style.color = altColorsActive ? 'var(--accent)' : 'var(--muted)';
  btn.style.borderColor = altColorsActive ? 'var(--accent)' : 'var(--border)';
  renderMap();
  refreshLegendIfOpen();
}

// color legend
var legendOpen = false;

function getBandColors(dir) {
  var c = altColorsActive ? PAL_ALT : PAL;
  return dir === 'low_red'
    ? [c.red, c.orange, c.yellow, c.ltgrn, c.green, c.blue]
    : [c.blue, c.green, c.ltgrn, c.yellow, c.orange, c.red];
}

// for some don't show maximum or minimum
var LEGEND_EDGE = {
  life: {hideZmin: true, hideZmax: false},
  mort: {hideZmin: false, hideZmax: true},
  fertility:{hideZmin: true, hideZmax: true},
  median: {hideZmin: false, hideZmax: true},
  urban: {hideZmin: false, hideZmax: false},
  literacy: {hideZmin: false, hideZmax: false},
  gii: {hideZmin: false, hideZmax: false},
  gdp: {hideZmin: false, hideZmax: true},
};

// legend color bands
function bandLabel(i, def, defKey) {
  var breaks = def.breaks, zmin = def.zmin, zmax = def.zmax;
  var edge = LEGEND_EDGE[defKey] || {};
  var numBands = breaks.length + 1;

  var lo = (i === 0) ? zmin : breaks[i - 1];
  var hi = (i === numBands - 1) ? zmax : breaks[i];

  function fmt(v) {
    if (Math.abs(v) >= 10000) return v.toLocaleString();
    return v.toString();
  }

  var loStr = (i === 0 && edge.hideZmin) ? '' : fmt(lo);
  var hiStr = (i === numBands - 1 && edge.hideZmax) ? '' : fmt(hi);

  if (!loStr && !hiStr) return '\u2014';
  if (!loStr) return '< ' + hiStr;
  if (!hiStr) return '> ' + loStr;
  return loStr + ' \u2013 ' + hiStr;
}

// assemble
function buildLegendHTML(dsKey) {
  var ds = DATASETS[dsKey];
  var defKey = DATASET_CS_DEF[dsKey];
  var def = defKey ? COLORSCALE_DEFS[defKey] : null;
  if (!def) return '<div style="color:var(--muted);font-size:12px;padding:16px;">No legend available.</div>';

  var colors = getBandColors(def.dir);
  var numBands = def.breaks.length + 1;

  var rows = '';
  for (var i = numBands - 1; i >= 0; i--) {
    rows += '<div class="legend-row">' +
      '<div class="legend-swatch" style="background:' + colors[i] + ';"></div>' +
      '<div class="legend-label">' + bandLabel(i, def, defKey) + '</div>' +
    '</div>';
  }

  var gradBar =
    '<div class="legend-grad-wrap">' +
      '<div class="legend-grad-bar" style="background:linear-gradient(to top,' + colors.join(',') + ');"></div>' +
      '<div class="legend-grad-labels">' +
        '<span>Higher</span>' +
        '<span>Lower</span>' +
      '</div>' +
    '</div>';

  return '<div class="legend-unit">' + (ds.unit || '') + '</div>' +
         '<div class="legend-body">' + gradBar +
           '<div class="legend-rows">' + rows + '</div>' +
         '</div>';
}

function renderLegendContent() {
  document.getElementById('legend-panel-title').textContent = DATASETS[currentDatasetKey].label;
  document.getElementById('legend-panel-body').innerHTML = buildLegendHTML(currentDatasetKey);
}

function openLegend() {
  if (legendOpen) return;
  legendOpen = true;
  document.getElementById('legend-panel').classList.add('open');
  renderLegendContent();
  var btn = document.getElementById('legend-btn');
  btn.style.color = 'var(--accent)';
  btn.style.borderColor = 'var(--accent)';
  setTimeout(function() {
    document.addEventListener('click', onDocClickCloseLegend, { once: true });
  }, 0);
}

function closeLegend() {
  legendOpen = false;
  document.getElementById('legend-panel').classList.remove('open');
  var btn = document.getElementById('legend-btn');
  btn.style.color = 'var(--muted)';
  btn.style.borderColor = 'var(--border)';
}

function onDocClickCloseLegend() {
  closeLegend();
}

function refreshLegendIfOpen() {
  if (legendOpen) renderLegendContent();
}
