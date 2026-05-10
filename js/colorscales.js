// basic palette
var PAL = {
  red: '#D32F2F',
  orange: '#F57C00',
  yellow: '#FBC02D',
  ltgrn: '#AED581',
  green: '#388E3C',
  blue: '#1565C0',
};

// accessible Paul Tol palette
var PAL_ALT = {
  red: '#D55E00',
  orange: '#E69F00',
  yellow: '#F0E442',
  ltgrn: '#009E73',
  green: '#0072B2',
  blue: '#332288',
};

var altColorsActive = false;

function p() { return altColorsActive ? PAL_ALT : PAL; }

// plotly colorscale arrays of fraction and color
// red low blue high
function CS_LOW_RED(breaks, zmin, zmax) {
  var c = p(), span = zmax - zmin;
  var f = function(v) { return (v - zmin) / span; };
  var b = breaks.map(f);
  return [
    [0, c.red],[b[0], c.red],
    [b[0], c.orange],[b[1], c.orange],
    [b[1], c.yellow],[b[2], c.yellow],
    [b[2], c.ltgrn],[b[3], c.ltgrn],
    [b[3], c.green],[b[4], c.green],
    [b[4], c.blue],[1, c.blue],
  ];
}
// red high blue low
function CS_LOW_BLUE(breaks, zmin, zmax) {
  var c = p(), span = zmax - zmin;
  var f = function(v) { return (v - zmin) / span; };
  var b = breaks.map(f);
  return [
    [0, c.blue],[b[0], c.blue],
    [b[0], c.green],[b[1], c.green],
    [b[1], c.ltgrn],[b[2], c.ltgrn],
    [b[2], c.yellow],[b[3], c.yellow],
    [b[3], c.orange],[b[4], c.orange],
    [b[4], c.red],[1, c.red],
  ];
}

// specific tuned values for the categories and metrics
var COLORSCALE_DEFS = {
  life: {breaks: [40, 50, 60, 70, 80], zmin: 30, zmax: 90, dir: 'low_red'},
  mort: {breaks: [1, 2, 4, 8, 15], zmin: 0, zmax: 30, dir: 'low_blue' },
  fertility:{breaks: [1.3, 1.5, 1.8, 2.1, 4.0], zmin: 1, zmax: 9, dir: 'low_red'},
  median: {breaks: [15, 20, 25, 35, 45], zmin: 10, zmax: 55, dir: 'low_red'},
  urban: {breaks: [10, 20, 40, 60, 80], zmin: 0, zmax: 100, dir: 'low_red'},
  literacy: {breaks: [10, 20, 40, 60, 80], zmin: 0, zmax: 100, dir: 'low_red'},
  gii: {breaks: [0.1, 0.2, 0.35, 0.55, 0.7], zmin: 0, zmax: 0.85, dir: 'low_blue'},
  gdp: {breaks: [5000, 10000, 15000, 30000, 50000], zmin: 0, zmax: 70000, dir: 'low_red'},
};

var DATASET_CS_DEF = {
  life_birth: 'life', life_10: 'life', life_25: 'life', life_45: 'life',
  infant_mort: 'mort', child_mort: 'mort',
  fertility_rate: 'fertility',
  median_age: 'median',
  urban: 'urban',
  literacy: 'literacy',
  gii: 'gii',
  gdp: 'gdp',
};

function buildColorscales() {
  var out = {};
  Object.keys(DATASET_CS_DEF).forEach(function(key) {
    var d = COLORSCALE_DEFS[DATASET_CS_DEF[key]];
    out[key] = d.dir === 'low_red'
      ? CS_LOW_RED(d.breaks, d.zmin, d.zmax)
      : CS_LOW_BLUE(d.breaks, d.zmin, d.zmax);
  });
  return out;
}

var CS = buildColorscales();
