// side panel for clicked country

var currentPanelCode = null;

function attachClickHandler() {
  var mapEl = document.getElementById('map');
  // handlers were stacking up
  mapEl.removeAllListeners('plotly_click');
  mapEl.on('plotly_click', function(data) {
    if (!data || !data.points || !data.points.length) return;
    var pt = data.points[0];
    var code = pt.location;
    // strip suffix
    var name = pt.text ? pt.text.replace(/ [(]data:.*[)]$/, '') : code;
    if (code === currentPanelCode) {
      closePanel();
    } else {
      openPanel(code, name);
    }
  });
}

function openPanel(code, name) {
  var ds = DATASETS[currentDatasetKey];
  var rows = dataCache[currentDatasetKey];
  if (!rows) return;

  currentPanelCode = code;
  document.getElementById('panel-country').textContent = name;
  document.getElementById('panel-metric').textContent  = ds.label;
  document.getElementById('detail-panel').classList.add('open');

  // chrono
  var countryRows = rows
    .filter(function(r) { return r['Code'].trim() === code; })
    .sort(function(a, b) { return a._year - b._year; });

  var resolvedCol = resolveCol(rows, ds.col);

  function fmt(v) { return parseFloat(v.toFixed(ds.decimals)); }

  // limit start year
  var panelMin = ds.panelMinYear || 1;
  var histRows = countryRows
    .filter(function(r) { return r[resolvedCol] !== undefined && r[resolvedCol] !== '' && r._year >= panelMin; })
    .map(function(r) { return { year: r._year, val: fmt(parseFloat(r[resolvedCol])) }; })
    .filter(function(r) { return !isNaN(r.val); });

  // projected
  var projRows = ds.colProjected
    ? countryRows
        .filter(function(r) { return r[ds.colProjected] !== undefined && r[ds.colProjected] !== ''; })
        .map(function(r) { return { year: r._year, val: fmt(parseFloat(r[ds.colProjected])) }; })
        .filter(function(r) { return !isNaN(r.val); })
    : [];

  var traces  = [];
  var isSparse = !!ds.mostRecentOnly;
  // one dot for one data point
  var sparseMode = (isSparse && histRows.length === 1) ? 'markers' : 'lines';

  if (histRows.length > 0) {
    traces.push({
      x: histRows.map(function(r) { return r.year; }),
      y: histRows.map(function(r) { return r.val;  }),
      type: 'scatter',
      mode: sparseMode,
      line: { color: '#2D5BE3', width: 2, dash: 'solid' },
      marker: (isSparse && histRows.length === 1) ? { color: '#2D5BE3', size: 7 } : { size: 0 },
      name: ds.label,
      showlegend: false,
      hovertemplate: '%{x}: <b>%{y}</b> ' + (ds.unit || '') + '<extra></extra>',
    });
  }

  if (projRows.length > 0) {
    // connect dashed line
    var connector = histRows.length > 0 ? [histRows[histRows.length - 1]] : [];
    var projFull  = connector.concat(projRows);
    traces.push({
      x: projFull.map(function(r) { return r.year; }),
      y: projFull.map(function(r) { return r.val;  }),
      type: 'scatter',
      mode: 'lines',
      line: { color: '#2D5BE3', width: 2, dash: 'dot' },
      name: 'Projected',
      hovertemplate: '%{x} (proj): <b>%{y}</b> ' + (ds.unit || '') + '<extra></extra>',
    });
  }

  var allYears = histRows.concat(projRows).map(function(r) { return r.year; });
  var rawMin = allYears.length ? Math.min.apply(null, allYears) : undefined;
  var xMin = rawMin !== undefined ? Math.max(rawMin, ds.panelMinYear || rawMin) - 1 : undefined;
  var xMax = allYears.length ? Math.max.apply(null, allYears) + 1 : undefined;

  var layout = {
    margin: { t: 16, b: 40, l: 52, r: 16 },
    paper_bgcolor: '#FFFFFF',
    plot_bgcolor: '#FFFFFF',
    showlegend: projRows.length > 0,
    legend: { x: 0, y: 1, font: { family: 'ui-monospace, monospace', size: 10, color: '#8A8478' }, bgcolor: 'rgba(0,0,0,0)' },
    xaxis: {
      tickfont: { family: 'ui-monospace, monospace', size: 10, color: '#8A8478' },
      gridcolor: '#E2DDD6',
      zeroline: false,
      range: xMin !== undefined ? [xMin, xMax] : undefined,
    },
    yaxis: {
      title: { text: ds.unit || '', font: { family: 'ui-monospace, monospace', size: 10, color: '#8A8478' } },
      tickfont: { family: 'ui-monospace, monospace', size: 10, color: '#8A8478' },
      gridcolor: '#E2DDD6',
      zeroline: false,
    },

    hoverlabel: { bgcolor: '#F7F7F7', bordercolor: '#CCCCCC', font: { family: 'ui-monospace, monospace', size: 11, color: '#1A1814' } },
  };

  Plotly.react('panel-chart', traces, layout, { responsive: true, displayModeBar: false });
}

// save panel chart as 1200x500 .png file
// build it again in hidden div using wider layout
function saveChart() {
  var ds = DATASETS[currentDatasetKey];
  var rows = dataCache[currentDatasetKey];
  var country = document.getElementById('panel-country').textContent;
  if (!rows) return;

  // country code from country name
  var code = null;
  for (var i = 0; i < rows.length; i++) {
    if ((rows[i]['Entity'] || rows[i]['Country'] || '') === country) {
      code = rows[i]['Code'].trim();
      break;
    }
  }
  if (!code) return;

  var countryRows = rows
    .filter(function(r) { return r['Code'].trim() === code; })
    .sort(function(a, b) { return a._year - b._year; });

  var resolvedCol = resolveCol(rows, ds.col);
  function fmt(v) { return parseFloat(v.toFixed(ds.decimals)); }

  var panelMin = ds.panelMinYear || 1;
  var histRows = countryRows
    .filter(function(r) { return r[resolvedCol] !== undefined && r[resolvedCol] !== '' && r._year >= panelMin; })
    .map(function(r) { return { year: r._year, val: fmt(parseFloat(r[resolvedCol])) }; })
    .filter(function(r) { return !isNaN(r.val); });

  var projRows = ds.colProjected
    ? countryRows
        .filter(function(r) { return r[ds.colProjected] !== undefined && r[ds.colProjected] !== ''; })
        .map(function(r) { return { year: r._year, val: fmt(parseFloat(r[ds.colProjected])) }; })
        .filter(function(r) { return !isNaN(r.val); })
    : [];

  var isSparse = !!ds.mostRecentOnly;
  var sparseMode = (isSparse && histRows.length === 1) ? 'markers' : 'lines';
  var traces = [];

  if (histRows.length > 0) {
    traces.push({
      x: histRows.map(function(r) { return r.year; }),
      y: histRows.map(function(r) { return r.val;  }),
      type: 'scatter',
      mode: sparseMode,
      line: { color: '#2D5BE3', width: 3, dash: 'solid' },
      marker: (isSparse && histRows.length === 1) ? { color: '#2D5BE3', size: 9 } : { size: 0 },
      name: ds.label,
      showlegend: false,
      hovertemplate: '%{x}: <b>%{y}</b> ' + (ds.unit || '') + '<extra></extra>',
    });
  }

  if (projRows.length > 0) {
    var connector = histRows.length > 0 ? [histRows[histRows.length - 1]] : [];
    var projFull  = connector.concat(projRows);
    traces.push({
      x: projFull.map(function(r) { return r.year; }),
      y: projFull.map(function(r) { return r.val;  }),
      type: 'scatter',
      mode: 'lines',
      line: { color: '#2D5BE3', width: 3, dash: 'dot' },
      name: 'Projected',
      hovertemplate: '%{x} (proj): <b>%{y}</b> ' + (ds.unit || '') + '<extra></extra>',
    });
  }

  var allYears = histRows.concat(projRows).map(function(r) { return r.year; });

  // two anno for difr font colors
  var exportLayout = {
    width: 1200,
    height: 500,
    margin: { t: 70, b: 60, l: 80, r: 60 },
    title: { text: '' },
    annotations: [
      {
        text: country,
        font: { family: 'ui-monospace, monospace', size: 18, color: '#1A1814' },
        x: 0.04, xanchor: 'left', xref: 'paper',
        y: 1.08, yanchor: 'bottom', yref: 'paper',
        showarrow: false,
      },
      {
        text: ds.label,
        font: { family: 'ui-monospace, monospace', size: 14, color: '#8A8478' },
        x: 0.04, xanchor: 'left', xref: 'paper',
        y: 1.01, yanchor: 'bottom', yref: 'paper',
        showarrow: false,
      },
    ],
    paper_bgcolor: '#FFFFFF',
    plot_bgcolor: '#FFFFFF',
    showlegend: projRows.length > 0,
    legend: { x: 0.04, y: 0.97, font: { family: 'ui-monospace, monospace', size: 13, color: '#8A8478' }, bgcolor: 'rgba(0,0,0,0)' },
    xaxis: {
      tickfont: { family: 'ui-monospace, monospace', size: 12, color: '#8A8478' },
      gridcolor: '#E2DDD6',
      zeroline: false,
      range: allYears.length ? [Math.min.apply(null, allYears) - 1, Math.max.apply(null, allYears) + 1] : undefined,
    },
    yaxis: {
      title: { text: ds.unit || '', font: { family: 'ui-monospace, monospace', size: 12, color: '#8A8478' } },
      tickfont: { family: 'ui-monospace, monospace', size: 12, color: '#8A8478' },
      gridcolor: '#E2DDD6',
      zeroline: false,
    },

  };

  var hiddenDiv = document.createElement('div');
  hiddenDiv.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
  document.body.appendChild(hiddenDiv);

  Plotly.newPlot(hiddenDiv, traces, exportLayout, { staticPlot: true })
    .then(function() {
      return Plotly.toImage(hiddenDiv, { format: 'png', width: 1200, height: 500 });
    })
    .then(function(dataUrl) {
      var a = document.createElement('a');
      var safeName = country.replace(/[^a-zA-Z0-9]/g, '_');
      a.download = safeName + '_' + currentDatasetKey + '.png';
      a.href = dataUrl;
      a.click();
      document.body.removeChild(hiddenDiv);
    });
}

function closePanel() {
  document.getElementById('detail-panel').classList.remove('open');
  currentPanelCode = null;
}

// wrap so handler called every map render
var _origReact = Plotly.react.bind(Plotly);
Plotly.react = function(el) {
  var args = Array.prototype.slice.call(arguments);
  var result = _origReact.apply(Plotly, args);
  var mapEl = document.getElementById('map');
  if (el === 'map' || el === mapEl) {
    result.then(function() { attachClickHandler(); });
  }
  return result;
};
