// fwb.js — the site's own script (the Label look, 2026-11-13). Loaded with
// `defer` from templates/base.html on every page. Three small jobs, each of
// which does nothing on a page that has no markup for it:
//
//   1. Play buttons. Any element with data-audio (an episode's MP3) holding
//      a .play button, a .time and a .bar plays through one shared <audio>.
//      Nothing is fetched until a button is pressed.
//   2. The home page's turning label. The seven newest episodes are all in
//      the page as .label[data-label] and one is shown; choosing a small
//      label on the shelf (.mini[data-n]) shows that episode's label instead.
//      Without this script the small labels are plain links.
//   3. Kind words. The three reviews in #warning are re-picked on every load
//      from the inline #reviews-data list, and "More warnings" deals three
//      more. Scott, 2026-09-13: a build-time trio only rotated on deploy.
(function () {
  "use strict";

  // ---- 1. Play buttons ----
  var audio = null, current = null;
  function fmt(s) {
    s = Math.floor(s);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0");
  }
  function stop() { if (current) current.classList.remove("is-playing"); }
  function ensureAudio() {
    if (audio) return;
    audio = new Audio();
    audio.preload = "none";
    audio.addEventListener("timeupdate", function () {
      if (!current || !audio.duration) return;
      var fill = current.querySelector(".bar i"), time = current.querySelector(".time");
      if (fill) fill.style.width = (100 * audio.currentTime / audio.duration) + "%";
      if (time) time.textContent = fmt(audio.currentTime) + " / " + fmt(audio.duration);
    });
    audio.addEventListener("ended", stop);
    audio.addEventListener("pause", stop);
    audio.addEventListener("play", function () { if (current) current.classList.add("is-playing"); });
  }
  document.addEventListener("click", function (ev) {
    var btn = ev.target.closest(".play"), bar = ev.target.closest(".bar");
    var box = (btn || bar) && (btn || bar).closest("[data-audio]");
    if (!box) return;
    if (btn) {
      ensureAudio();
      if (current !== box) {
        stop();
        current = box;
        audio.src = box.dataset.audio;
      }
      if (audio.paused) audio.play(); else audio.pause();
    } else if (audio && current === box && audio.duration) {
      var r = bar.getBoundingClientRect();
      audio.currentTime = audio.duration * (ev.clientX - r.left) / r.width;
    }
  });

  // ---- 2. The home page's turning label ----
  var labels = document.getElementById("labels"), minis = document.getElementById("minis");
  if (labels && minis) {
    var show = function (n) {
      labels.querySelectorAll(".label").forEach(function (l) { l.hidden = l.dataset.label !== n; });
      minis.querySelectorAll(".mini").forEach(function (m) {
        if (m.dataset.n === n) m.setAttribute("aria-current", "true"); else m.removeAttribute("aria-current");
      });
      if (audio && current && !audio.paused && current.closest(".label") && current.closest(".label").hidden) audio.pause();
    };
    minis.addEventListener("click", function (ev) {
      var m = ev.target.closest(".mini");
      // A modified click (new tab, new window) keeps the link's own behaviour.
      if (!m || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      ev.preventDefault();
      if (m.getAttribute("aria-current") === "true") return;
      var n = m.dataset.n, still = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (document.startViewTransition && !still) {
        // A hidden tab aborts the transition (the swap still runs); don't leave that as an uncaught error.
        var vt = document.startViewTransition(function () { show(n); });
        vt.ready.catch(function () {});
        vt.finished.catch(function () {});
      } else {
        show(n);
      }
      var top = labels.getBoundingClientRect().top;
      if (top < 0) window.scrollTo({ top: window.scrollY + top - 16, behavior: still ? "auto" : "smooth" });
    });
  }

  // ---- 3. Kind words ----
  var box = document.getElementById("warning"), data = document.getElementById("reviews-data"), more = document.getElementById("more-warnings");
  if (box && data) {
    var items;
    try { items = JSON.parse(data.textContent); } catch (e) { items = null; }
    if (items && items.length >= 3) {
      var order = items.slice().sort(function () { return Math.random() - 0.5; }), at = 0;
      // The review follows "According to X," so its first letter drops to lower case, except the word I.
      var lower = function (t) { return /^I[\s']/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1); };
      var deal = function () {
        var lead = box.querySelector("span");
        box.textContent = "";
        if (lead) box.appendChild(lead);
        var text = "";
        for (var i = 0; i < 3; i++) {
          var r = order[(at + i) % order.length];
          text += " (" + (i + 1) + ") According to " + r.reviewer + ", " + lower(r.review);
        }
        box.appendChild(document.createTextNode(text));
      };
      deal();
      if (more) {
        more.hidden = false;
        more.addEventListener("click", function () { at += 3; deal(); });
      }
    }
  }
})();
