// ── Audio Context (lazy init to comply with browser autoplay rules) ──
var _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

function playTone(freq, type, duration, vol) {
  try {
    var ctx  = getAudioCtx();
    var osc  = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type            = type || "sine";
    osc.frequency.value = freq || 440;
    gain.gain.setValueAtTime(vol || 0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch(e) {}
}

function playChime(notes) {
  // notes: [{freq, delay, duration, vol}]
  notes.forEach(function(n) {
    setTimeout(function() {
      playTone(n.freq, n.type || "sine", n.duration || 0.25, n.vol || 0.15);
    }, n.delay || 0);
  });
}

// Predefined sounds
var SOUNDS = {
  // Soft upward chime — name submitted successfully
  submit: function() {
    playChime([
      { freq: 523, delay:   0, duration: 0.18 },  // C5
      { freq: 659, delay:  90, duration: 0.18 },  // E5
      { freq: 784, delay: 180, duration: 0.28 },  // G5
      { freq:1047, delay: 290, duration: 0.35 }   // C6
    ]);
  },
  // Warm single pop — vote cast
  vote: function() {
    playChime([
      { freq: 880, delay:  0, duration: 0.12, vol: 0.14 },  // A5
      { freq:1109, delay: 80, duration: 0.22, vol: 0.12 }   // C#6
    ]);
  },
  // Low soft thud — error / duplicate
  error: function() {
    playChime([
      { freq: 220, delay:  0, duration: 0.18, type: "sawtooth", vol: 0.10 },
      { freq: 196, delay: 120, duration: 0.25, type: "sawtooth", vol: 0.08 }
    ]);
  },
  // Soft click — filter / slider moved
  click: function() {
    playTone(600, "sine", 0.08, 0.08);
  },
  // Gentle sparkle — page load complete
  load: function() {
    playChime([
      { freq: 659, delay:   0, duration: 0.14, vol: 0.10 },
      { freq: 784, delay:  80, duration: 0.14, vol: 0.10 },
      { freq: 988, delay: 160, duration: 0.14, vol: 0.10 },
      { freq:1319, delay: 240, duration: 0.22, vol: 0.10 }
    ]);
  }
};

// ── Haptics (Android Chrome only, silent elsewhere) ──
var HAPTICS = {
  submit:  function() { try { navigator.vibrate && navigator.vibrate([40, 30, 80]); } catch(e) {} },
  vote:    function() { try { navigator.vibrate && navigator.vibrate(30); } catch(e) {} },
  error:   function() { try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch(e) {} },
  click:   function() { try { navigator.vibrate && navigator.vibrate(10); } catch(e) {} },
  load:    function() { try { navigator.vibrate && navigator.vibrate([20, 20, 20]); } catch(e) {} }
};

function feedback(type) {
  SOUNDS[type]  && SOUNDS[type]();
  HAPTICS[type] && HAPTICS[type]();
}
