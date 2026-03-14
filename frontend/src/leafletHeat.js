// leafletHeat.js - Attaches leaflet.heat to any L instance
export function setupLeafletHeat(L) {
  if (L.HeatLayer) return; // already set up

  // simpleheat library
  function simpleheat(canvas) {
    if (!(this instanceof simpleheat)) return new simpleheat(canvas);
    this._canvas = canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
    this._ctx = canvas.getContext('2d', { willReadFrequently: true });
    this._width = canvas.width;
    this._height = canvas.height;
    this._max = 1;
    this.clear();
  }

  simpleheat.prototype = {
    defaultRadius: 25,
    defaultGradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1: 'red' },
    data(data) { this._data = data; return this; },
    max(max) { this._max = max; return this; },
    add(point) { this._data.push(point); return this; },
    clear() { this._data = []; return this; },
    radius(r, blur) {
      blur = blur === undefined ? 15 : blur;
      const circle = this._circle = document.createElement('canvas');
      const ctx = circle.getContext('2d');
      const r2 = this._r = r + blur;
      circle.width = circle.height = r2 * 2;
      ctx.shadowOffsetX = ctx.shadowOffsetY = 200;
      ctx.shadowBlur = blur;
      ctx.shadowColor = 'black';
      ctx.beginPath();
      ctx.arc(r2 - 200, r2 - 200, r, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();
      return this;
    },
    gradient(grad) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 256);
      canvas.width = 1;
      canvas.height = 256;
      for (const i in grad) gradient.addColorStop(+i, grad[i]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1, 256);
      this._grad = ctx.getImageData(0, 0, 1, 256).data;
      return this;
    },
    draw(minOpacity) {
      if (!this._circle) this.radius(this.defaultRadius);
      if (!this._grad) this.gradient(this.defaultGradient);
      const ctx = this._ctx;
      ctx.clearRect(0, 0, this._width, this._height);
      for (let i = 0, len = this._data.length; i < len; i++) {
        const p = this._data[i];
        ctx.globalAlpha = Math.max(p[2] / this._max, minOpacity || 0.05);
        ctx.drawImage(this._circle, p[0] - this._r, p[1] - this._r);
      }
      const colored = ctx.getImageData(0, 0, this._width, this._height);
      this._colorize(colored.data, this._grad);
      ctx.putImageData(colored, 0, 0);
      return this;
    },
    _colorize(pixels, gradient) {
      for (let i = 3, len = pixels.length; i < len; i += 4) {
        const j = pixels[i] * 4;
        if (j) {
          pixels[i - 3] = gradient[j];
          pixels[i - 2] = gradient[j + 1];
          pixels[i - 1] = gradient[j + 2];
        }
      }
    }
  };

  L.HeatLayer = (L.Layer ? L.Layer : L.Class).extend({
    initialize(latlngs, options) {
      this._latlngs = latlngs;
      L.setOptions(this, options);
    },
    setLatLngs(latlngs) { this._latlngs = latlngs; return this.redraw(); },
    addLatLng(latlng) { this._latlngs.push(latlng); return this.redraw(); },
    setOptions(options) {
      L.setOptions(this, options);
      if (this._heat) this._updateOptions();
      return this.redraw();
    },
    redraw() {
      if (this._heat && !this._frame && this._map && !this._map._animating) {
        this._frame = L.Util.requestAnimFrame(this._redraw, this);
      }
      return this;
    },
    onAdd(map) {
      this._map = map;
      if (!this._canvas) this._initCanvas();
      map.getPanes().overlayPane.appendChild(this._canvas);
      map.on('moveend', this._reset, this);
      if (map.options.zoomAnimation && L.Browser.any3d) {
        map.on('zoomanim', this._animateZoom, this);
      }
      this._reset();
    },
    onRemove(map) {
      map.getPanes().overlayPane.removeChild(this._canvas);
      map.off('moveend', this._reset, this);
      if (map.options.zoomAnimation) map.off('zoomanim', this._animateZoom, this);
    },
    addTo(map) { map.addLayer(this); return this; },
    _initCanvas() {
      const canvas = this._canvas = L.DomUtil.create('canvas', 'leaflet-heatmap-layer leaflet-layer');
      const originProp = L.DomUtil.testProp(['transformOrigin', 'WebkitTransformOrigin', 'msTransformOrigin']);
      canvas.style[originProp] = '50% 50%';
      const size = this._map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
      const animated = this._map.options.zoomAnimation && L.Browser.any3d;
      L.DomUtil.addClass(canvas, 'leaflet-zoom-' + (animated ? 'animated' : 'hide'));
      this._heat = simpleheat(canvas);
      this._updateOptions();
    },
    _updateOptions() {
      this._heat.radius(this.options.radius || this._heat.defaultRadius, this.options.blur);
      if (this.options.gradient) this._heat.gradient(this.options.gradient);
      if (this.options.max) this._heat.max(this.options.max);
    },
    _reset() {
      const topLeft = this._map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this._canvas, topLeft);
      const size = this._map.getSize();
      if (this._heat._width !== size.x) this._canvas.width = this._heat._width = size.x;
      if (this._heat._height !== size.y) this._canvas.height = this._heat._height = size.y;
      this._redraw();
    },
    _redraw() {
      if (!this._map) return;
      const r = this._heat._r;
      const size = this._map.getSize();
      const bounds = new L.Bounds(L.point([-r, -r]), size.add([r, r]));
      const max = this.options.max === undefined ? 1 : this.options.max;
      const maxZoom = this.options.maxZoom === undefined ? this._map.getMaxZoom() : this.options.maxZoom;
      const v = 1 / Math.pow(2, Math.max(0, Math.min(maxZoom - this._map.getZoom(), 12)));
      const cellSize = r / 2;
      const grid = [];
      const panePos = this._map._getMapPanePos();
      const offsetX = panePos.x % cellSize;
      const offsetY = panePos.y % cellSize;
      const data = [];

      for (let i = 0, len = this._latlngs.length; i < len; i++) {
        const p = this._map.latLngToContainerPoint(this._latlngs[i]);
        if (bounds.contains(p)) {
          const x = Math.floor((p.x - offsetX) / cellSize) + 2;
          const y = Math.floor((p.y - offsetY) / cellSize) + 2;
          const alt = this._latlngs[i].alt !== undefined ? this._latlngs[i].alt :
            this._latlngs[i][2] !== undefined ? +this._latlngs[i][2] : 1;
          const k = alt * v;
          grid[y] = grid[y] || [];
          const cell = grid[y][x];
          if (cell) {
            cell[0] = (cell[0] * cell[2] + p.x * k) / (cell[2] + k);
            cell[1] = (cell[1] * cell[2] + p.y * k) / (cell[2] + k);
            cell[2] += k;
          } else {
            grid[y][x] = [p.x, p.y, k];
          }
        }
      }

      for (let i = 0, len = grid.length; i < len; i++) {
        if (grid[i]) {
          for (let j = 0, len2 = grid[i].length; j < len2; j++) {
            const cell = grid[i][j];
            if (cell) data.push([Math.round(cell[0]), Math.round(cell[1]), Math.min(cell[2], max)]);
          }
        }
      }

      this._heat.data(data).draw(this.options.minOpacity);
      this._frame = null;
    },
    _animateZoom(e) {
      const scale = this._map.getZoomScale(e.zoom);
      const offset = this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());
      if (L.DomUtil.setTransform) {
        L.DomUtil.setTransform(this._canvas, offset, scale);
      } else {
        this._canvas.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(offset) + ' scale(' + scale + ')';
      }
    }
  });

  L.heatLayer = function (latlngs, options) {
    return new L.HeatLayer(latlngs, options);
  };
}
