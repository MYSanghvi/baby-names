const SHEET_URL = "https://script.google.com/macros/s/AKfycbwW3tFovjuVxCUoHawfrfY3FQPJVyzcqShE4yNh8CHQ6meFqOoKns_7sxTqwIwVnnTgtA/exec";

const RASHI_MAP = [
  { rashi: "મેષ ♈ (Aries)", sortLetters: ["A","L","I","E"], displayEng: "A, L, I, E", displayGuj: "અ, લ, ઇ" },
  { rashi: "વૃષભ ♉ (Taurus)", sortLetters: ["B","V","U"], displayEng: "B, V, U", displayGuj: "બ, વ, ઉ" },
  { rashi: "મિથુન ♊ (Gemini)", sortLetters: ["K","CHH","GH"], displayEng: "K, CHH, GH", displayGuj: "ક, છ, ઘ" },
  { rashi: "કર્ક ♋ (Cancer)", sortLetters: ["DDA","H"], displayEng: "DDA, H", displayGuj: "ડ, હ" },
  { rashi: "સિંહ ♌ (Leo)", sortLetters: ["M"], displayEng: "M, TTA", displayGuj: "મ, ટ" },
  { rashi: "કન્યા ♍ (Virgo)", sortLetters: ["P"], displayEng: "P, TTH, NNA", displayGuj: "પ" },
  { rashi: "તુલા ♎ (Libra)", sortLetters: ["R","T"], displayEng: "R, T", displayGuj: "ર, ત" },
  { rashi: "વૃશ્ચિક ♏ (Scorpio)", sortLetters: ["N","Y"], displayEng: "N, Y", displayGuj: "ન, ય" },
  { rashi: "ધનુ ♐ (Sagittarius)", sortLetters: ["BH","DH","F"], displayEng: "BH, DH, F, DDH", displayGuj: "ભ, ધ, ફ" },
  { rashi: "મકર ♑ (Capricorn)", sortLetters: ["KH","J"], displayEng: "KH, J", displayGuj: "ખ, જ" },
  { rashi: "કુંભ ♒ (Aquarius)", sortLetters: ["G","SH","S"], displayEng: "G, SH, S, SS", displayGuj: "ગ, શ, સ, ષ" },
  { rashi: "મીન ♓ (Pisces)", sortLetters: ["D","CH","TH","Z"], displayEng: "D, CH, TH, Z", displayGuj: "દ, ચ, થ, ઝ" }
];

const PANDITJI_REVIEW = ["TTA","TTH","NNA","DDH","SS","O","Q","W","X"];
const MULTI_INITIALS = ["CHH","GH","BH","DH","KH","SH","CH","TH","TTA","TTH","NNA","DDH","SS"];

const COLORS = [
  "#e07898","#6aace0","#7ac8a8","#b090d8",
  "#f0a060","#60b8b0","#e0a040","#a0b8e0",
  "#d87898","#8ab870"
];

const submitterColors = {};
let colorIndex = 0;
let localNames = [];
let msgInterval = null;
let activeRashiFilterMode = "virgo";
let selectedRashiFilters = [];

var _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

function playTone(freq, type, duration, vol) {
  try {
    var ctx = getAudioCtx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type || "sine";
    osc.frequency.value = freq || 440;
    gain.gain.setValueAtTime(vol || 0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch(e) {}
}

function playChime(notes) {
  notes.forEach(function(n) {
    setTimeout(function() {
      playTone(n.freq, n.type || "sine", n.duration || 0.25, n.vol || 0.15);
    }, n.delay || 0);
  });
}

var SOUNDS = {
  submit: function() {
    playChime([
      { freq: 523, delay: 0, duration: 0.18 },
      { freq: 659, delay: 90, duration: 0.18 },
      { freq: 784, delay: 180, duration: 0.28 },
      { freq:1047, delay: 290, duration: 0.35 }
    ]);
  },
  vote: function() {
    playChime([
      { freq: 880, delay: 0, duration: 0.12, vol: 0.14 },
      { freq:1109, delay: 80, duration: 0.22, vol: 0.12 }
    ]);
  },
  error: function() {
    playChime([
      { freq: 220, delay: 0, duration: 0.18, type: "sawtooth", vol: 0.10 },
      { freq: 196, delay: 120, duration: 0.25, type: "sawtooth", vol: 0.08 }
    ]);
  },
  click: function() {
    playTone(600, "sine", 0.08, 0.08);
  },
  load: function() {
    playChime([
      { freq: 659, delay: 0, duration: 0.14, vol: 0.10 },
      { freq: 784, delay: 80, duration: 0.14, vol: 0.10 },
      { freq: 988, delay: 160, duration: 0.14, vol: 0.10 },
      { freq:1319, delay: 240, duration: 0.22, vol: 0.10 }
    ]);
  }
};

var HAPTICS = {
  submit: function() { try { navigator.vibrate && navigator.vibrate([40, 30, 80]); } catch(e) {} },
  vote: function() { try { navigator.vibrate && navigator.vibrate(30); } catch(e) {} },
  error: function() { try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch(e) {} },
  click: function() { try { navigator.vibrate && navigator.vibrate(10); } catch(e) {} },
  load: function() { try { navigator.vibrate && navigator.vibrate([20, 20, 20]); } catch(e) {} }
};

function feedback(type) {
  SOUNDS[type] && SOUNDS[type]();
  HAPTICS[type] && HAPTICS[type]();
}

function getVoted() {
  try { return JSON.parse(localStorage.getItem("babyVoted") || "{}"); } catch(e) { return {}; }
}
function markVoted(name) {
  var v = getVoted();
  v[name.toLowerCase()] = true;
  localStorage.setItem("babyVoted", JSON.stringify(v));
}
function hasVoted(name) {
  return !!getVoted()[name.toLowerCase()];
}

const funnyMessages = [
  "🕐 Asking the stars for approval...",
  "🪐 Consulting Jupiter about this name...",
  "📊 Running Anti-Bully Algorithm v2.0...",
  "📜 Checking the ancient Gujarati scrolls...",
  "🐘 Fiya is reviewing your suggestion...",
  "📯 Blowing the shankh before confirmation...",
  "🌙 Checking the nakshatra alignment...",
  "🔮 The panditji is calculating...",
  "✋ Taking Fui's aashirwad...",
  "🌈 Checking if the name passes vibe check...",
  "🪙 Tossing a lucky coin just in case...",
  "⚡ Pikachu is dancing approvingly...",
  "🎊 Preparing confetti made of rose petals...",
  "🧪 Stress-testing the name against middle schoolers...",
  "😅 Making sure it doesn't rhyme with anything suspicious...",
  "📣 Testing how it sounds when yelled across a playground...",
  "📚 Running playground nickname simulation...",
  "🍊 Checking if name sounds good at Navratri...",
  "📖 Flipping through the Panchang...",
  "🎯 Making sure cousins can't weaponize it...",
  "🎭 Testing dramatic mispronunciations...",
  "👀 Checking for accidental meme potential..."
];

function getColor(name) {
  var key = name.trim().toLowerCase();
  if (!submitterColors[key]) {
    submitterColors[key] = COLORS[colorIndex % COLORS.length];
    colorIndex++;
  }
  return submitterColors[key];
}

function getPanditjiPrefix(name) {
  var upper = name.trim().toUpperCase();
  for (var i = 0; i < PANDITJI_REVIEW.length; i++) {
    if (upper.indexOf(PANDITJI_REVIEW[i]) === 0) return PANDITJI_REVIEW[i];
  }
  return null;
}

function getRashi(name) {
  var upper = name.trim().toUpperCase();
  if (getPanditjiPrefix(name)) return "Others";
  for (var m = 0; m < MULTI_INITIALS.length; m++) {
    if (upper.indexOf(MULTI_INITIALS[m]) === 0) {
      for (var r = 0; r < RASHI_MAP.length; r++) {
        if (RASHI_MAP[r].sortLetters.indexOf(MULTI_INITIALS[m]) !== -1) return RASHI_MAP[r].rashi;
      }
    }
  }
  var firstLetter = upper[0];
  for (var i = 0; i < RASHI_MAP.length; i++) {
    if (RASHI_MAP[i].sortLetters.indexOf(firstLetter) !== -1) return RASHI_MAP[i].rashi;
  }
  return "Others";
}

function genderEmoji(g) {
  return "";
}

function normalizeRashiLabel(rashi) {
  return String(rashi || "").replace(/\s*[\u2648-\u2653]\s*/g, " ").replace(/\s+/g, " ").trim();
}

function isVirgoRashi(rashi) {
  return normalizeRashiLabel(rashi).toLowerCase().indexOf("virgo") !== -1;
}

function getAvailableRashiOptions() {
  return RASHI_MAP.map(function(item) {
    return { value: item.rashi, label: normalizeRashiLabel(item.rashi) };
  }).concat([{ value: "Others", label: "Others" }]);
}

function shouldShowRashi(rashi) {
  if (activeRashiFilterMode === "all") return true;
  if (activeRashiFilterMode === "virgo") return isVirgoRashi(rashi);
  if (activeRashiFilterMode === "custom") {
    if (!selectedRashiFilters.length) return false;
    return selectedRashiFilters.indexOf(rashi) !== -1;
  }
  return true;
}

function renderRashiFilters() {
  var host = document.getElementById("rashiFilterHost");
  if (!host) return;

  var options = getAvailableRashiOptions();
  host.innerHTML = ''
    + '<div class="rashi-filter-panel">'
    + '<div class="rashi-filter-top">'
    + '<div class="rashi-filter-title">Filter submissions</div>'
    + '<div class="rashi-filter-modes">'
    + '<button type="button" class="rf-mode ' + (activeRashiFilterMode === "virgo" ? "active" : "") + '" data-rf-mode="virgo">Only Virgo submissions</button>'
    + '<button type="button" class="rf-mode ' + (activeRashiFilterMode === "all" ? "active" : "") + '" data-rf-mode="all">All submissions</button>'
    + '<button type="button" class="rf-mode ' + (activeRashiFilterMode === "custom" ? "active" : "") + '" data-rf-mode="custom">Select zodiac signs</button>'
    + '</div>'
    + '</div>'
    + '<div class="rashi-filter-custom ' + (activeRashiFilterMode === "custom" ? "open" : "") + '">'
    + options.map(function(opt) {
        var checked = selectedRashiFilters.indexOf(opt.value) !== -1 ? "checked" : "";
        return '<label class="rashi-check-pill"><input type="checkbox" class="rashi-check" value="' + opt.value.replace(/"/g, "&quot;") + '" ' + checked + '> <span>' + opt.label + '</span></label>';
      }).join("")
    + '</div>'
    + '</div>';

  host.querySelectorAll('[data-rf-mode]').forEach(function(btn) {
    btn.addEventListener("click", function() {
      activeRashiFilterMode = btn.getAttribute("data-rf-mode");
      if (activeRashiFilterMode === "custom" && !selectedRashiFilters.length) selectedRashiFilters = ["Others"];
      renderNames();
    });
  });

  host.querySelectorAll(".rashi-check").forEach(function(input) {
    input.addEventListener("change", function() {
      var value = input.value;
      if (input.checked) {
        if (selectedRashiFilters.indexOf(value) === -1) selectedRashiFilters.push(value);
      } else {
        selectedRashiFilters = selectedRashiFilters.filter(function(item) { return item !== value; });
      }
      activeRashiFilterMode = "custom";
      renderNames();
    });
  });
}

function showFunnyMessages() {
  var msg = document.getElementById("msg");
  var i = Math.floor(Math.random() * funnyMessages.length);
  msg.textContent = funnyMessages[i];
  msg.className = "msg loading";
  msgInterval = setInterval(function() {
    i = (i + 1) % funnyMessages.length;
    msg.textContent = funnyMessages[i];
  }, 1800);
}
function stopFunnyMessages() {
  if (msgInterval) { clearInterval(msgInterval); msgInterval = null; }
}

function castVote(nameStr) {
  var voter = document.getElementById("userName").value.trim();
  var msg = document.getElementById("msg");
  var userField = document.getElementById("userName");

  if (!voter) {
    var prev = msg.textContent;
    var prevClass = msg.className;
    msg.textContent = "✋ Enter your name at the top before voting!";
    msg.className = "msg error";
    feedback("error");
    userField.focus();
    setTimeout(function() {
      if (msg.textContent === "✋ Enter your name at the top before voting!") {
        msg.textContent = prev;
        msg.className = prevClass;
      }
    }, 3000);
    return;
  }

  if (hasVoted(nameStr)) return;

  markVoted(nameStr);
  feedback("vote");

  var entry = localNames.find(function(n) {
    return n.name.toLowerCase() === nameStr.toLowerCase();
  });
  if (entry) entry.votes = (entry.votes || 0) + 1;
  renderNames();

  var url = SHEET_URL
    + "?action=vote"
    + "&voter=" + encodeURIComponent(voter)
    + "&nameVotedFor=" + encodeURIComponent(nameStr);

  fetch(url).catch(function() { setTimeout(function() { fetch(url); }, 3000); });
}

function submitName() {
  var userName = document.getElementById("userName").value.trim();
  var babyName = document.getElementById("babyName").value.trim();
  var nameReason = document.getElementById("nameReason").value.trim();
  var msg = document.getElementById("msg");

  if (!userName || !babyName) {
    msg.textContent = "We need at least your name and a baby name!";
    msg.className = "msg error";
    feedback("error");
    return;
  }

  var isDuplicate = localNames.some(function(n) {
    return n.name.toLowerCase() === babyName.toLowerCase();
  });
  if (isDuplicate) {
    msg.textContent = babyName + " is already in the Sanctuary! Try another.";
    msg.className = "msg error";
    feedback("error");
    return;
  }

  var warnEl = document.getElementById("panditjiWarning");
  var reviewPrefix = getPanditjiPrefix(babyName);
  if (reviewPrefix) {
    warnEl.innerHTML = "⚠️ **" + babyName + "** starts with **" + reviewPrefix + "** — under review by panditji, placed under Others for now.";
    warnEl.style.display = "block";
    setTimeout(function() { warnEl.style.display = "none"; }, 7000);
  } else {
    warnEl.style.display = "none";
  }

  localNames.push({ name: babyName, by: userName, reason: nameReason, gender: "Either", votes: 0 });
  document.getElementById("babyName").value = "";
  document.getElementById("nameReason").value = "";
  renderNames();
  showFunnyMessages();

  var url = SHEET_URL
    + "?action=submit"
    + "&submittedBy=" + encodeURIComponent(userName)
    + "&name=" + encodeURIComponent(babyName)
    + "&reason=" + encodeURIComponent(nameReason)
    + "&gender=" + encodeURIComponent("Either");

  fetch(url).then(function() {
    stopFunnyMessages();
    feedback("submit");
    msg.textContent = babyName + " has entered the Sanctuary! Got another one?";
    msg.className = "msg success";
  }).catch(function() {
    setTimeout(function() { fetch(url); }, 3000);
    stopFunnyMessages();
    msg.textContent = babyName + " saved! Add another name below.";
    msg.className = "msg success";
  });
}

function renderNames() {
  var loading = document.getElementById("loadingMsg");
  if (loading) loading.style.display = "none";

  renderRashiFilters();

  var counts = {};
  localNames.forEach(function(r) {
    var by = r.by ? r.by.trim() : "Unknown";
    getColor(by);
    counts[by] = (counts[by] || 0) + 1;
  });

  var stats = document.getElementById("stats");
  if (stats) {
    stats.innerHTML = Object.entries(counts)
      .sort(function(a, b) { return b[1] - a[1]; })
      .map(function(entry) {
        return '<div class="stat-chip" style="background:' + getColor(entry[0]) + '">' + entry[0] + ' · ' + entry[1] + '</div>';
      }).join("");
  }

  var groups = {};
  localNames.forEach(function(r) {
    var key = getRashi(r.name);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  var grouped = Object.keys(groups).sort(function(a, b) {
    if (a === "Others") return 1;
    if (b === "Others") return -1;
    return RASHI_MAP.findIndex(function(x) { return x.rashi === a; }) - RASHI_MAP.findIndex(function(x) { return x.rashi === b; });
  }).map(function(rashi) {
    return {
      rashi: rashi,
      items: groups[rashi].sort(function(a, b) { return (b.votes || 0) - (a.votes || 0); })
    };
  });

  var visibleGroups = grouped.filter(function(group) { return shouldShowRashi(group.rashi); });

  var sectionsHtml = visibleGroups.map(function(group) {
    var titleInfo = RASHI_MAP.find(function(x) { return x.rashi === group.rashi; });
    var letters = titleInfo ? '<span class="rashi-letters-inline">[' + titleInfo.displayEng + ' / ' + titleInfo.displayGuj + ']</span>' : '';
    var cards = group.items.map(function(item) {
      var votedClass = hasVoted(item.name) ? "voted" : "";
      var color = getColor(item.by || "Unknown");
      var reasonHtml = item.reason ? '<div class="reason">' + item.reason + '</div>' : '';
      return '<div class="name-card">'
        + '<div class="name-header" style="background:' + color + ';">'
        + '<span>' + item.name + '</span>'
        + '<span>' + (item.votes || 0) + ' votes</span>'
        + '</div>'
        + '<div class="name-meta">'
        + '<div class="by">By: ' + (item.by || "Unknown") + '</div>'
        + reasonHtml
        + '</div>'
        + '<div class="vote-row">'
        + '<div class="vote-count">Votes: ' + (item.votes || 0) + '</div>'
        + '<button class="vote-btn ' + votedClass + '" ' + (hasVoted(item.name) ? 'disabled' : '') + ' onclick="castVote(\'' + item.name.replace(/'/g, "\\'") + '\')">Vote</button>'
        + '</div>'
        + '</div>';
    }).join("");

    return '<div class="rashi-section">'
      + '<div class="rashi-title">' + group.rashi + letters + '</div>'
      + (cards || '<div class="empty">No names yet in this zodiac.</div>')
      + '</div>';
  });

  var namesList = document.getElementById("namesList");
  if (namesList) {
    namesList.innerHTML = sectionsHtml.length ? sectionsHtml.join("") : '<div class="rashi-section"><div class="empty">No submissions match the selected zodiac filter yet.</div></div>';
  }
}

function loadNames() {
  fetch(SHEET_URL)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      localNames = (data.names || []).map(function(n) {
        return {
          name: n.name,
          by: n.by,
          reason: n.reason || "",
          gender: n.gender || "Either",
          votes: Number(n.votes || 0)
        };
      });
      renderNames();
    })
    .catch(function() {
      var loading = document.getElementById("loadingMsg");
      if (loading) loading.textContent = "Could not load names right now.";
    });
}

document.addEventListener("DOMContentLoaded", function() {
  var user = document.getElementById("userName");
  var baby = document.getElementById("babyName");
  var reason = document.getElementById("nameReason");

  if (user) user.addEventListener("keydown", function(e) { if (e.key === "Enter") baby && baby.focus(); });
  if (baby) baby.addEventListener("keydown", function(e) { if (e.key === "Enter") reason && reason.focus(); });
  if (reason) reason.addEventListener("keydown", function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitName(); } });

  loadNames();
});