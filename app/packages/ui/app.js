// Preferências de aparência e de leitura. Guardadas no aparelho; a página funciona sem elas.
(function () {
  var root = document.documentElement;
  var themes = ["", "dark", "hc"];      // "" = segue o sistema
  var scales = ["", "lg", "xl"];        // "" = normal

  function read(key) { try { return localStorage.getItem(key) || ""; } catch (e) { return ""; } }
  function write(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* sem armazenamento */ } }

  function apply(attr, value) { if (value) root.setAttribute(attr, value); else root.removeAttribute(attr); }
  function next(list, current) { return list[(list.indexOf(current) + 1) % list.length]; }

  apply("data-theme", read("uh-theme"));
  apply("data-scale", read("uh-scale"));

  var themeBtn = document.getElementById("theme");
  var scaleBtn = document.getElementById("scale");
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var value = next(themes, root.getAttribute("data-theme") || "");
    apply("data-theme", value); write("uh-theme", value);
  });
  if (scaleBtn) scaleBtn.addEventListener("click", function () {
    var value = next(scales, root.getAttribute("data-scale") || "");
    apply("data-scale", value); write("uh-scale", value);
  });

  // Áudio: lê o conteúdo principal com a voz do aparelho (Web Speech), quando existir.
  var audioBtn = document.getElementById("audio");
  if (audioBtn && "speechSynthesis" in window) {
    audioBtn.addEventListener("click", function () {
      var main = document.querySelector("main");
      if (!main) return;
      window.speechSynthesis.cancel();
      var speech = new SpeechSynthesisUtterance(main.innerText);
      speech.lang = "pt-BR";
      window.speechSynthesis.speak(speech);
    });
  } else if (audioBtn) {
    audioBtn.hidden = true;
  }
})();
