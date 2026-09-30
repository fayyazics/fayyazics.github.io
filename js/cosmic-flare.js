(function () {
  'use strict';

  var TAU = Math.PI * 2;

  var DEFAULTS = {
    light: {
      windAmp: 0.25,
      windPeriod: 6.5,
      breathPeriod: 4,
      minHeight: 0.2,
      maxHeight: 0.45,
      scale: 3,
      flowSpeed: 0.2,
      cyclePeriod: 16,
      hueSpread: 0.18,
      intensity: 2,
      core: 0,
      alpha: 0.95,
      desat: 0
    },
    dark: {
      windAmp: 0.25,
      windPeriod: 6,
      breathPeriod: 3.5,
      minHeight: 0.2,
      maxHeight: 0.42,
      scale: 3.2,
      flowSpeed: 0.25,
      cyclePeriod: 10.5,
      hueSpread: 0.18,
      intensity: 1.4,
      core: 0.55,
      alpha: 1,
      desat: 0
    }
  };

  var PALETTES = {
    light: ['#7fa8e0', '#b8a0e0', '#f29a88', '#f7b27a', '#f8d98a', '#8cc0ea', '#e8a0c0'],
    dark: ['#f5b04a', '#e8843a', '#d8c24a', '#38c9d6', '#6fe0b8', '#e070b8', '#8a6cf0']
  };

  var VERTEX = [
    'attribute vec2 a_pos;',
    'varying vec2 v_uv;',
    'void main() {',
    '  v_uv = a_pos * 0.5 + 0.5;',
    '  gl_Position = vec4(a_pos, 0.0, 1.0);',
    '}'
  ].join('\n');

  var PALETTE_FN = [
    'vec3 NAME(float s) {',
    '  s = fract(s) * 7.0;',
    '  vec3 c = vec3(0.0);',
    '  float total = 0.0;',
    '  for (int i = 0; i < 7; i++) {',
    '    float d = abs(s - float(i));',
    '    d = min(d, 7.0 - d);',
    '    float w = max(0.0, 1.0 - d);',
    '    w = w * w * (3.0 - 2.0 * w);',
    '    c += ARR[i] * w;',
    '    total += w;',
    '  }',
    '  return c / max(total, 1e-4);',
    '}'
  ].join('\n');

  var FRAGMENT = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 u_res;',
    'uniform float u_time;',
    'uniform float u_wind;',
    'uniform float u_breath;',
    'uniform float u_hue;',
    'uniform float u_flow;',
    'uniform float u_mix;',
    'uniform float u_windAmp;',
    'uniform float u_minH;',
    'uniform float u_maxH;',
    'uniform float u_scale;',
    'uniform float u_spread;',
    'uniform float u_intensity;',
    'uniform float u_core;',
    'uniform float u_alpha;',
    'uniform float u_desat;',
    'uniform vec3 u_dark[7];',
    'uniform vec3 u_light[7];',
    'varying vec2 v_uv;',
    '',
    'float hash(vec2 p) {',
    '  vec3 p3 = fract(vec3(p.xyx) * 0.1031);',
    '  p3 += dot(p3, p3.yzx + 33.33);',
    '  return fract((p3.x + p3.y) * p3.z);',
    '}',
    '',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),',
    '             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);',
    '}',
    '',
    'float fbm(vec2 p) {',
    '  float v = 0.0;',
    '  float a = 0.5;',
    '  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);',
    '  for (int i = 0; i < 4; i++) {',
    '    v += a * noise(p);',
    '    p = r * p * 2.03 + 17.1;',
    '    a *= 0.5;',
    '  }',
    '  return v;',
    '}',
    '',
    'float soft(vec2 p) {',
    '  return noise(p) * 0.62 + noise(p * 1.97 + 5.3) * 0.28 + noise(p * 4.1 + 9.1) * 0.1;',
    '}',
    '',
    PALETTE_FN.replace('NAME', 'paletteDark').replace('ARR', 'u_dark'),
    PALETTE_FN.replace('NAME', 'paletteLight').replace('ARR', 'u_light'),
    '',
    /* Gaussian falloff instead of a hard cutoff keeps the tips glowing off rather than ending in ridges. */
    'float flame(float y, float h, float n, float flick) {',
    '  float reach = h * (0.4 + 1.0 * n + 0.2 * (flick - 0.5));',
    '  float t = y / max(reach, 1e-3);',
    '  float tongue = exp(-t * t * 2.4) * (0.08 + 1.4 * smoothstep(0.2, 0.8, n));',
    '  return tongue + 0.3 * n * exp(-y / (h * 0.22));',
    '}',
    '',
    'void main() {',
    '  float y = v_uv.y;',
    '  float top = u_maxH * 1.5;',
    '  if (y > top) { gl_FragColor = vec4(0.0); return; }',
    '  float aspect = u_res.x / u_res.y;',
    /* Past portrait proportions, widen plumes with the viewport so a wide screen gets broad plumes, not a busy fringe. */
    '  float span = aspect > 0.7 ? 0.7 * sqrt(aspect / 0.7) : aspect;',
    '  float x = v_uv.x * span;',
    '',
    /* Upper parts of the field trail the base, so the lean reads as wind rather than a rigid tilt. */
    '  float lean = sin(u_wind - y * 2.2) + 0.45 * sin(u_wind * 1.63 + 1.7 - y * 3.1);',
    '  float gust = noise(vec2(u_time * 0.12, 3.7)) - 0.5;',
    '  float rise = clamp(y / u_maxH, 0.0, 1.3);',
    '  x += u_windAmp * u_maxH * (lean * 0.7 + gust * 1.2) * pow(rise, 1.4);',
    '',
    '  vec2 q = vec2(x * u_scale, y * u_scale * 0.35 - u_flow);',
    '  vec2 w = vec2(fbm(q * 0.5 + vec2(0.0, u_time * 0.05)),',
    '                fbm(q * 0.5 + vec2(5.2, 1.3) - u_time * 0.04)) - 0.47;',
    '',
    '  float n1 = soft(vec2(q.x + w.x * 1.6, q.y * 0.9 + w.y * 1.2));',
    '  float n2 = soft(vec2(q.x * 1.3 + 11.3 - w.y * 1.4, q.y * 1.1 - u_flow * 0.4 + w.x));',
    '  float flick = noise(vec2(q.x * 2.5, y * 6.0 - u_time * 1.8));',
    '  float streak = noise(vec2(x * u_scale * 1.6 + w.x * 3.0, y * 1.2 - u_flow * 1.5));',
    '',
    '  float ph1 = noise(vec2(x * u_scale * 0.35, 1.3)) * 6.2832;',
    '  float ph2 = noise(vec2(x * u_scale * 0.35, 7.9)) * 6.2832;',
    '  float h1 = mix(u_minH, u_maxH, 0.5 + 0.5 * sin(u_breath + ph1));',
    '  float h2 = mix(u_minH, u_maxH, 0.5 + 0.5 * sin(u_breath * 1.21 + 2.1 + ph2)) * 0.85;',
    '',
    '  float fade = smoothstep(top, u_maxH * 0.85, y);',
    '  float texture = 0.85 + 0.3 * streak;',
    '  float d1 = flame(y, h1, n1, flick) * texture * fade;',
    '  float d2 = flame(y, h2, n2, flick) * texture * fade * 0.85;',
    '',
    '  float s = u_hue + x * u_spread + w.x * 0.3;',
    '',
    '  vec3 dc = paletteDark(s) * d1 + paletteDark(s + 0.28) * d2;',
    /* Tone-map on the peak channel so bright plumes keep their hue instead of washing to cream. */
    '  float peak = max(dc.r, max(dc.g, dc.b));',
    '  dc *= (1.0 - exp(-peak * u_intensity)) / max(peak, 1e-4);',
    '  float hot = smoothstep(1.0, 1.9, d1 + d2) * u_core;',
    '  dc = mix(dc, vec3(1.0, 0.97, 0.92), clamp(hot, 0.0, 1.0));',
    '  vec4 dark = vec4(dc, max(dc.r, max(dc.g, dc.b)));',
    '',
    /* Averaging opposite pastels turns them muddy on white, so the dominant plume owns the color. */
    '  float w1 = d1 * d1 * d1;',
    '  float w2 = d2 * d2 * d2;',
    '  vec3 lc = (paletteLight(s) * w1 + paletteLight(s + 0.28) * w2) / max(w1 + w2, 1e-5);',
    '  lc = mix(lc, vec3(dot(lc, vec3(0.299, 0.587, 0.114))), u_desat);',
    '  float la = smoothstep(0.0, 1.0, (d1 + d2) * 0.35 * u_intensity) * u_alpha;',
    '  vec4 light = vec4(lc * la, la);',
    '',
    '  vec4 color = mix(light, dark, u_mix);',
    /* 8-bit output bands badly on slow gradients against a flat background. */
    '  float dither = (hash(gl_FragCoord.xy + fract(u_time) * 97.0) - 0.5) / 255.0;',
    '  color.a = clamp(color.a + dither, 0.0, 1.0);',
    '  color.rgb = min(color.rgb + dither, vec3(color.a));',
    '  gl_FragColor = color;',
    '}'
  ].join('\n');

  var UNIFORMS = ['u_res', 'u_time', 'u_wind', 'u_breath', 'u_hue', 'u_flow', 'u_mix', 'u_windAmp',
    'u_minH', 'u_maxH', 'u_scale', 'u_spread', 'u_intensity', 'u_core', 'u_alpha', 'u_desat',
    'u_dark', 'u_light'];

  function hexToVec(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  function flatten(palette) {
    var out = [];
    palette.forEach(function (hex) { out.push.apply(out, hexToVec(hex)); });
    return new Float32Array(out);
  }

  function copy(obj) {
    var out = {};
    Object.keys(obj).forEach(function (key) { out[key] = obj[key]; });
    return out;
  }

  function compile(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('cosmic-flare:', gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  function create(canvas, options) {
    options = options || {};
    var gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: !!options.preserveDrawingBuffer
    });
    if (!gl) return null;

    var vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) return null;
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var loc = {};
    UNIFORMS.forEach(function (name) {
      loc[name] = gl.getUniformLocation(program, name);
    });

    var params = {
      light: copy(DEFAULTS.light),
      dark: copy(DEFAULTS.dark)
    };
    if (options.params) {
      if (options.params.light) Object.assign(params.light, options.params.light);
      if (options.params.dark) Object.assign(params.dark, options.params.dark);
    }
    var palettes = {
      light: (options.palettes && options.palettes.light) || PALETTES.light,
      dark: (options.palettes && options.palettes.dark) || PALETTES.dark
    };
    gl.uniform3fv(loc.u_light, flatten(palettes.light));
    gl.uniform3fv(loc.u_dark, flatten(palettes.dark));

    var resolution = options.resolution || 0.5;
    var state = { time: 0, wind: 0, breath: 0, hue: 0, flow: 0 };
    var themeMix = options.theme === 'dark' ? 1 : 0;
    var themeTarget = themeMix;
    var themeDuration = 0.6;
    var frameId = null;
    var lastTime = null;

    function blended() {
      var out = {};
      Object.keys(params.light).forEach(function (key) {
        out[key] = params.light[key] + (params.dark[key] - params.light[key]) * themeMix;
      });
      return out;
    }

    function resize() {
      var ratio = Math.min(window.devicePixelRatio || 1, 1.5) * resolution;
      var w = Math.max(1, Math.round(canvas.clientWidth * ratio));
      var h = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function step(dt) {
      if (themeMix !== themeTarget) {
        var delta = dt / themeDuration;
        themeMix = themeTarget > themeMix
          ? Math.min(themeTarget, themeMix + delta)
          : Math.max(themeTarget, themeMix - delta);
      }
      /* Phases are integrated rather than derived from time so that
         changing a period (theme tween, lab sliders) never makes the motion jump. */
      var p = blended();
      state.time += dt;
      state.wind = (state.wind + dt * TAU / p.windPeriod) % (TAU * 100);
      state.breath = (state.breath + dt * TAU / p.breathPeriod) % (TAU * 100);
      state.hue = (state.hue + dt / p.cyclePeriod) % 1000;
      state.flow += dt * p.flowSpeed;
    }

    function draw() {
      var p = blended();
      var eased = themeMix * themeMix * (3 - 2 * themeMix);
      /* Portrait screens fit fewer, broader plumes whose overlap would bury copy, so they get a lower, dimmer flare. */
      var portrait = Math.max(0, Math.min(1, (0.75 - canvas.width / canvas.height) / 0.3));
      var shrink = 1 - 0.3 * portrait;
      p.minHeight *= shrink;
      p.maxHeight *= shrink;
      p.core *= 1 - 0.7 * portrait;
      p.intensity *= 1 - 0.25 * portrait;
      p.alpha *= 1 - 0.2 * portrait;
      gl.uniform2f(loc.u_res, canvas.width, canvas.height);
      gl.uniform1f(loc.u_time, state.time);
      gl.uniform1f(loc.u_wind, state.wind);
      gl.uniform1f(loc.u_breath, state.breath);
      gl.uniform1f(loc.u_hue, state.hue);
      gl.uniform1f(loc.u_flow, state.flow);
      gl.uniform1f(loc.u_mix, eased);
      gl.uniform1f(loc.u_windAmp, p.windAmp);
      gl.uniform1f(loc.u_minH, p.minHeight);
      gl.uniform1f(loc.u_maxH, p.maxHeight);
      gl.uniform1f(loc.u_scale, p.scale);
      gl.uniform1f(loc.u_spread, p.hueSpread);
      gl.uniform1f(loc.u_intensity, p.intensity);
      gl.uniform1f(loc.u_core, p.core);
      gl.uniform1f(loc.u_alpha, p.alpha);
      gl.uniform1f(loc.u_desat, p.desat);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function tick(now) {
      var dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      step(dt);
      draw();
      frameId = requestAnimationFrame(tick);
    }

    var api = {
      canvas: canvas,
      params: params,
      resize: function () { resize(); if (frameId === null) draw(); },
      start: function () {
        if (frameId !== null) return;
        lastTime = null;
        resize();
        frameId = requestAnimationFrame(tick);
      },
      stop: function () {
        if (frameId !== null) cancelAnimationFrame(frameId);
        frameId = null;
      },
      isRunning: function () { return frameId !== null; },
      setTheme: function (theme, immediate) {
        themeTarget = theme === 'dark' ? 1 : 0;
        if (immediate) themeMix = themeTarget;
        if (frameId === null) draw();
      },
      setParams: function (theme, values) {
        Object.assign(params[theme], values);
        if (frameId === null) draw();
      },
      /* Deterministic render at a simulated time, advancing in fixed steps from zero. */
      renderAt: function (seconds) {
        state = { time: 0, wind: 0, breath: 0, hue: 0, flow: 0 };
        var dt = 1 / 30;
        for (var t = 0; t < seconds; t += dt) step(dt);
        resize();
        draw();
      }
    };

    resize();
    return api;
  }

  window.CosmicFlare = { create: create, defaults: DEFAULTS, palettes: PALETTES };

  function mount() {
    var canvas = document.querySelector('canvas.cosmic-flare');
    if (!canvas) return;
    var root = document.documentElement;
    var currentTheme = function () { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; };
    var flare = create(canvas, { theme: currentTheme() });
    if (!flare) {
      canvas.remove();
      return;
    }

    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    var still = function () { return reducedMotion && reducedMotion.matches; };

    function sync() {
      flare.stop();
      if (still()) {
        flare.renderAt(6);
      } else if (!document.hidden) {
        flare.start();
      }
    }

    new MutationObserver(function () {
      flare.setTheme(currentTheme(), still());
    }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    var resizeFrame = null;
    window.addEventListener('resize', function () {
      if (resizeFrame !== null) return;
      resizeFrame = requestAnimationFrame(function () {
        resizeFrame = null;
        flare.resize();
      });
    });

    document.addEventListener('visibilitychange', sync);
    if (reducedMotion && reducedMotion.addEventListener) reducedMotion.addEventListener('change', sync);
    canvas.addEventListener('webglcontextlost', function (event) {
      event.preventDefault();
      flare.stop();
    });

    sync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
