const SHEET_URL = "https://script.google.com/macros/s/AKfycbxHng7vyLaTr-RhnJUZMaXZSoXQvxV1o2jd7ksbTXKpr-96C6T62DHoiz-NnWBW9HuHeg/exec";

const RASHI_MAP = [
  { rashi: "\u0AAE\u0AC7\u0AB7 \u2648 (Aries)",             sortLetters: ["A","L","I","E"],      displayEng: "A, L, I, E",      displayGuj: "\u0A85, \u0AB2, \u0A87" },
  { rashi: "\u0AB5\u0AC3\u0AB7\u0AAD \u2649 (Taurus)",       sortLetters: ["B","V","U"],           displayEng: "B, V, U",         displayGuj: "\u0AAC, \u0AB5, \u0A89" },
  { rashi: "\u0AAE\u0ABF\u0AA5\u0AC1\u0AA8 \u264A (Gemini)", sortLetters: ["K","CHH","GH"],        displayEng: "K, CHH, GH",      displayGuj: "\u0A95, \u0A9B, \u0A98" },
  { rashi: "\u0A95\u0AB0\u0ACD\u0A95 \u264B (Cancer)",       sortLetters: ["DDA","H"],             displayEng: "DDA, H",          displayGuj: "\u0AA1, \u0AB9" },
  { rashi: "\u0AB8\u0ABF\u0A82\u0AB9 \u264C (Leo)",          sortLetters: ["M"],                   displayEng: "M, TTA",          displayGuj: "\u0AAE, \u0A9F" },
  { rashi: "\u0A95\u0AA8\u0ACD\u0AAF\u0ABE \u264D (Virgo)",  sortLetters: ["P"],                   displayEng: "P, TTH, NNA",     displayGuj: "\u0AAA" },
  { rashi: "\u0AA4\u0AC1\u0AB2\u0ABE \u264E (Libra)",        sortLetters: ["R","T"],               displayEng: "R, T",            displayGuj: "\u0AB0, \u0AA4" },
  { rashi: "\u0AB5\u0AC3\u0AB6\u0ACD\u0A9A\u0ABF\u0A95 \u264F (Scorpio)", sortLetters: ["N","Y"], displayEng: "N, Y",            displayGuj: "\u0AA8, \u0AAF" },
  { rashi: "\u0AA7\u0AA8\u0AC1 \u2650 (Sagittarius)",        sortLetters: ["BH","DH","F"],         displayEng: "BH, DH, F, DDH", displayGuj: "\u0AAD, \u0AA7, \u0AAB" },
  { rashi: "\u0AAE\u0A95\u0AB0 \u2651 (Capricorn)",          sortLetters: ["KH","J"],              displayEng: "KH, J",           displayGuj: "\u0A96, \u0A9C" },
  { rashi: "\u0A95\u0AC1\u0A82\u0AAD \u2652 (Aquarius)",     sortLetters: ["G","SH","S"],          displayEng: "G, SH, S, SS",   displayGuj: "\u0A97, \u0AB6, \u0AB8, \u0AB7" },
  { rashi: "\u0AAE\u0AC0\u0AA8 \u2653 (Pisces)",             sortLetters: ["D","CH","TH","Z"],     displayEng: "D, CH, TH, Z",   displayGuj: "\u0AA6, \u0A9A, \u0AA5, \u0A9D" }
];

const PANDITJI_REVIEW = ["TTA","TTH","NNA","DDH","SS","O","Q","W","X"];
const MULTI_INITIALS  = ["CHH","GH","BH","DH","KH","SH","CH","TH","TTA","TTH","NNA","DDH","SS"];

const COLORS = [
  "#e07898","#6aace0","#7ac8a8","#b090d8",
  "#f0a060","#60b8b0","#e0a040","#a0b8e0",
  "#d87898","#8ab870"
];

const submitterColors = {};
let colorIndex     = 0;
let localNames     = [];
let activeFilter   = "All";
let selectedGender = "Either";
let msgInterval    = null;
let _hasLoadedOnce = false;

// ── Audio ──
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
  notes.forEach(function(n) {
    setTimeout(function() {
      playTone(n.freq, n.type || "sine", n.duration || 0.25, n.vol || 0.15);
    }, n.delay || 0);
  });
}

var SOUNDS = {
  submit: function() {
    playChime([
      { freq: 523, delay:   0, duration: 0.18 },
      { freq: 659, delay:  90, duration: 0.18 },
      { freq: 784, delay: 180, duration: 0.28 },
      { freq:1047, delay: 290, duration: 0.35 }
    ]);
  },
  vote: function() {
    playChime([
      { freq: 880, delay:  0, duration: 0.12, vol: 0.14 },
      { freq:1109, delay: 80, duration: 0.22, vol: 0.12 }
    ]);
  },
  error: function() {
    playChime([
      { freq: 220, delay:   0, duration: 0.18, type: "sawtooth", vol: 0.10 },
      { freq: 196, delay: 120, duration: 0.25, type: "sawtooth", vol: 0.08 }
    ]);
  },
  click: function() {
    playTone(600, "sine", 0.08, 0.08);
  },
  load: function() {
    playChime([
      { freq: 659, delay:   0, duration: 0.14, vol: 0.10 },
      { freq: 784, delay:  80, duration: 0.14, vol: 0.10 },
      { freq: 988, delay: 160, duration: 0.14, vol: 0.10 },
      { freq:1319, delay: 240, duration: 0.22, vol: 0.10 }
    ]);
  }
};

// ── Haptics (Android Chrome only, silent on iOS) ──
var HAPTICS = {
  submit: function() { try { navigator.vibrate && navigator.vibrate([40, 30, 80]); } catch(e) {} },
  vote:   function() { try { navigator.vibrate && navigator.vibrate(30);           } catch(e) {} },
  error:  function() { try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch(e) {} },
  click:  function() { try { navigator.vibrate && navigator.vibrate(10);           } catch(e) {} },
  load:   function() { try { navigator.vibrate && navigator.vibrate([20, 20, 20]); } catch(e) {} }
};

function feedback(type) {
  SOUNDS[type]  && SOUNDS[type]();
  HAPTICS[type] && HAPTICS[type]();
}

// ── localStorage vote tracking ──
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

// ── Helpers ──
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
  if (g === "Boy")  return "👦";
  if (g === "Girl") return "👧";
  return "🌈";
}

// ── Gender Slider ──
function setGender(val) {
  if (val !== selectedGender) feedback("click");
  selectedGender = val;
  var thumb = document.getElementById("gsThumb");
  var fill  = document.getElementById("gsFill");
  var hint  = document.getElementById("genderHint");

  thumb.classList.remove("girl","boy","either");
  fill.classList.remove("girl","boy","either");
  hint.classList.remove("girl","boy","either");

  if (val === "Girl") {
    thumb.textContent = "👧";
    thumb.style.left  = "0%";
    thumb.classList.add("girl");
    fill.classList.add("girl");
    hint.textContent = "👧 Girl";
    hint.classList.add("girl");
  } else if (val === "Boy") {
    thumb.textContent = "👦";
    thumb.style.left  = "100%";
    thumb.classList.add("boy");
    fill.classList.add("boy");
    hint.textContent = "👦 Boy";
    hint.classList.add("boy");
  } else {
    thumb.textContent = "🌈";
    thumb.style.left  = "50%";
    thumb.classList.add("either");
    fill.classList.add("either");
    hint.textContent = "🌈 Either / Neutral";
    hint.classList.add("either");
  }
}

function initGenderSlider() {
  var track    = document.querySelector(".gs-track");
  var thumb    = document.getElementById("gsThumb");
  var dragging = false;

  function valFromX(clientX) {
    var rect  = track.getBoundingClientRect();
    var ratio = (clientX - rect.left) / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    if (ratio < 0.33)      return "Girl";
    else if (ratio > 0.66) return "Boy";
    else                   return "Either";
  }

  thumb.addEventListener("mousedown",   function(e) { dragging = true; e.preventDefault(); });
  document.addEventListener("mousemove", function(e) { if (dragging) setGender(valFromX(e.clientX)); });
  document.addEventListener("mouseup",   function()  { dragging = false; });

  thumb.addEventListener("touchstart",   function(e) { dragging = true; e.preventDefault(); }, { passive: false });
  document.addEventListener("touchmove", function(e) { if (dragging) setGender(valFromX(e.touches[0].clientX)); }, { passive: true });
  document.addEventListener("touchend",  function()  { dragging = false; });

  track.addEventListener("click", function(e) { if (e.target !== thumb) setGender(valFromX(e.clientX)); });
  document.querySelector(".gs-left").addEventListener("click",  function() { setGender("Girl"); });
  document.querySelector(".gs-right").addEventListener("click", function() { setGender("Boy");  });

  setGender("Either");
}

// ── Filter ──
function setFilter(val, btn) {
  activeFilter = val;
  document.querySelectorAll(".f-btn").forEach(function(b) { b.classList.remove("active"); });
  btn.classList.add("active");
  feedback("click");
  renderNames();
}

// ── Voting ──
function castVote(nameStr) {
  var voter     = document.getElementById("userName").value.trim();
  var msg       = document.getElementById("msg");
  var userField = document.getElementById("userName");

  if (!voter) {
    var prev      = msg.textContent;
    var prevClass = msg.className;
    msg.textContent = "✋ Enter your name at the top before voting!";
    msg.className   = "msg error";
    feedback("error");
    userField.focus();
    userField.style.borderColor = "#e06080";
    userField.style.boxShadow   = "0 0 0 4px rgba(224,96,128,0.18)";
    setTimeout(function() {
      userField.style.borderColor = "";
      userField.style.boxShadow   = "";
      if (msg.textContent === "✋ Enter your name at the top before voting!") {
        msg.textContent = prev;
        msg.className   = prevClass;
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
    + "&voter="        + encodeURIComponent(voter)
    + "&nameVotedFor=" + encodeURIComponent(nameStr);

  fetch(url).catch(function() { setTimeout(function() { fetch(url); }, 3000); });
}

// ── Funny loading messages ──
function showFunnyMessages() {
  var msg = document.getElementById("msg");
  var i   = Math.floor(Math.random() * funnyMessages.length);
  msg.textContent = funnyMessages[i];
  msg.className   = "msg loading";
  msgInterval = setInterval(function() {
    i = (i + 1) % funnyMessages.length;
    msg.textContent = funnyMessages[i];
  }, 1800);
}
function stopFunnyMessages() {
  if (msgInterval) { clearInterval(msgInterval); msgInterval = null; }
}

// ── Submit ──
function submitName() {
  var userName   = document.getElementById("userName").value.trim();
  var babyName   = document.getElementById("babyName").value.trim();
  var nameReason = document.getElementById("nameReason").value.trim();
  var msg        = document.getElementById("msg");

  if (!userName || !babyName) {
    msg.textContent = "We need at least your name and a baby name!";
    msg.className   = "msg error";
    feedback("error");
    return;
  }

  var isDuplicate = localNames.some(function(n) {
    return n.name.toLowerCase() === babyName.toLowerCase();
  });
  if (isDuplicate) {
    msg.textContent = babyName + " is already in the Sanctuary! Try another.";
    msg.className   = "msg error";
    feedback("error");
    return;
  }

  var warnEl       = document.getElementById("panditjiWarning");
  var reviewPrefix = getPanditjiPrefix(babyName);
  if (reviewPrefix) {
    warnEl.innerHTML = "⚠️ <strong>" + babyName + "</strong> starts with <strong>"
      + reviewPrefix + "</strong> — under review by panditji, placed under Others for now.";
    warnEl.style.display = "block";
    setTimeout(function() { warnEl.style.display = "none"; }, 7000);
  } else {
    warnEl.style.display = "none";
  }

  var submittedGender = selectedGender;

  localNames.push({ name: babyName, by: userName, reason: nameReason, gender: submittedGender, votes: 0 });
  document.getElementById("babyName").value   = "";
  document.getElementById("nameReason").value = "";
  setGender("Either");
  renderNames();
  showFunnyMessages();

  var url = SHEET_URL
    + "?action=submit"
    + "&submittedBy=" + encodeURIComponent(userName)
    + "&name="        + encodeURIComponent(babyName)
    + "&reason="      + encodeURIComponent(nameReason)
    + "&gender="      + encodeURIComponent(submittedGender);

  fetch(url).then(function() {
    stopFunnyMessages();
    feedback("submit");
    msg.textContent = babyName + " has entered the Sanctuary! Got another one?";
    msg.className   = "msg success";
  }).catch(function() {
    setTimeout(function() { fetch(url); }, 3000);
    stopFunnyMessages();
    msg.textContent = babyName + " saved! Add another name below.";
    msg.className   = "msg success";
  });
}

// ── Keyboard nav ──
document.getElementById("userName").addEventListener("keydown", function(e) {
  if (e.key === "Enter") document.getElementById("babyName").focus();
});
document.getElementById("babyName").addEventListener("keydown", function(e) {
  if (e.key === "Enter") document.getElementById("nameReason").focus();
});
document.getElementById("nameReason").addEventListener("keydown", function(e) {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitName(); }
});

// ── Render ──
function renderNames() {
  document.getElementById("loadingMsg").style.display = "none";
  document.getElementById("filterBar").style.display  = "flex";

  // Leaderboard
  var counts = {};
  localNames.forEach(function(r) {
    var by = r.by ? r.by.trim() : "Unknown";
    getColor(by);
    counts[by] = (counts[by] || 0) + 1;
  });
  document.getElementById("stats").innerHTML = Object.entries(counts)
    .sort(function(a, b) { return b[1] - a[1]; })
    .map(function(entry) {
      return "<div class='stat-chip' style='background:" + getColor(entry[0]) + "'>"
        + entry[0] + ": " + entry[1] + (entry[1] > 1 ? " names" : " name") + "</div>";
    }).join("");

  // Gender filter — Either always shows in Boys and Girls views
  var filtered = activeFilter === "All"
    ? localNames
    : localNames.filter(function(n) {
        return n.gender === activeFilter || n.gender === "Either" || !n.gender;
      });

  // Group by rashi
  var grouped = {};
  RASHI_MAP.forEach(function(r) { grouped[r.rashi] = []; });
  grouped["Others"] = [];

  filtered.forEach(function(r) {
    var name   = r.name   ? r.name.trim()   : "";
    var by     = r.by     ? r.by.trim()     : "Unknown";
    var reason = r.reason ? r.reason.trim() : "";
    var gender = r.gender || "Either";
    var votes  = r.votes  || 0;
    if (!name) return;
    var rashi = getRashi(name);
    if (!grouped[rashi]) grouped[rashi] = [];
    grouped[rashi].push({ name: name, by: by, reason: reason, gender: gender, votes: votes });
  });

  var allRashis = RASHI_MAP.map(function(r) { return r.rashi; });
  allRashis.push("Others");

  document.getElementById("rashiContainer").innerHTML = allRashis.map(function(rashi) {
    var names      = (grouped[rashi] || []).sort(function(a, b) { return a.name.localeCompare(b.name); });
    var rashiObj   = RASHI_MAP.find(function(r) { return r.rashi === rashi; });
    var engLetters = rashiObj ? rashiObj.displayEng : "";
    var gujLetters = rashiObj ? rashiObj.displayGuj : "";
    var tags       = "";

    if (names.length === 0) {
      tags = "<span class='empty'>No names yet — be the first! ☁️</span>";
    } else {
      names.forEach(function(n) {
        var color     = getColor(n.by);
        var voted     = hasVoted(n.name);
        var voteLabel = voted ? "✓ Voted" : "👍 Vote";
        var voteCount = n.votes > 0
          ? n.votes + (n.votes === 1 ? " vote" : " votes")
          : "No votes yet";
        var safeN = n.name.replace(/'/g, "\\'");

        if (n.reason) {
          tags += "<div class='name-card'>"
            + "<div class='name-header' style='background:" + color + "'>"
            +   n.name
            +   "<span class='gender-badge'>" + genderEmoji(n.gender) + "</span>"
            + "</div>"
            + "<div class='name-meta'>"
            +   "<div class='by'>By: " + n.by + "</div>"
            +   "<div class='reason'>" + n.reason + "</div>"
            + "</div>"
            + "<div class='vote-row'>"
            +   "<span class='vote-count'>❤️ " + voteCount + "</span>"
            +   "<button class='vote-btn" + (voted ? " voted" : "") + "'"
            +   (voted ? "" : " onclick=\"castVote('" + safeN + "')\"")
            +   ">" + voteLabel + "</button>"
            + "</div>"
            + "</div>";
        } else {
          tags += "<div class='name-tag-wrap'>"
            + "<span class='name-tag' style='background:" + color + "' title='By: " + n.by + "'>"
            +   n.name + " " + genderEmoji(n.gender)
            +   "<button class='tag-vote-btn" + (voted ? " voted" : "") + "'"
            +   (voted ? "" : " onclick=\"castVote('" + safeN + "')\"")
            +   ">" + (voted ? "✓" : "👍 " + (n.votes || 0)) + "</button>"
            + "</span>"
            + "</div>";
        }
      });
    }

    var lettersHtml = engLetters
      ? "<span class='rashi-letters-inline'>&nbsp;·&nbsp;" + engLetters + "&nbsp;&nbsp;|&nbsp;&nbsp;" + gujLetters + "</span>"
      : "";

    return "<div class='rashi-section'>"
      + "<div class='rashi-title'>" + rashi + lettersHtml + "</div>"
      + tags + "</div>";
  }).join("");
}

// ── Load from sheet ──
function loadNames() {
  fetch(SHEET_URL + "?action=load")
    .then(function(res) { return res.json(); })
    .then(function(data) {
      localNames = data.names.map(function(r) {
        var existing = localNames.find(function(l) {
          return l.name.toLowerCase() === r.name.toLowerCase();
        });
        return {
          name:   r.name   || "",
          by:     r.by     || "Unknown",
          reason: r.reason || "",
          gender: r.gender || "Either",
          votes:  Math.max(r.votes || 0, existing ? (existing.votes || 0) : 0)
        };
      });
      renderNames();
      if (!_hasLoadedOnce) {
        feedback("load");
        _hasLoadedOnce = true;
      }
    })
    .catch(function(e) {
      document.getElementById("loadingMsg").style.display = "none";
      console.error("Load error:", e);
    });
}

// ── Init ──
initGenderSlider();
loadNames();
setInterval(loadNames, 20000);
