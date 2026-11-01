/* Fußzeile mit der geladenen Versionsnummer (aus version.js). Prüft zusätzlich ohne Cache, welcher Stand auf dem
   Server liegt: Ist dort schon ein neuerer, erscheint „Neuer Stand online – neu laden“. */
(function(){
  const me = document.currentScript;
  const vUrl = new URL("version.js", me.src).href;
  const css = `.site-foot{max-width:560px;margin:28px auto 8px;padding:0 16px;text-align:center;font:12px/1.5 system-ui,-apple-system,sans-serif;color:var(--muted,#5f6f66);opacity:.8}
  .site-foot button{font:inherit;color:var(--accent,#2f7a4a);background:none;border:0;padding:0;text-decoration:underline;cursor:pointer}`;
  function fmt(s){ const m = String(s||"").match(/^(\d{4})-(\d\d)-(\d\d) (\d\d:\d\d)/); return m ? `${m[3]}.${m[2]}.${m[1]} ${m[4]}` : s || "?"; }
  function render(){
    const v = window.SITE_VERSION || {};
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const f = document.createElement("footer"); f.className = "site-foot";
    f.innerHTML = `Version ${v.nr ?? "?"}<span class="site-new"></span>`;
    f.title = `Stand ${fmt(v.stand)}${v.was ? ": " + v.was : ""}`;
    document.body.appendChild(f);
    fetch(vUrl, { cache: "no-store" }).then(r => r.ok ? r.text() : "").then(t => {
      const m = t.match(/nr:\s*(\d+)/);
      if(m && v.nr && +m[1] > v.nr){
        f.querySelector(".site-new").innerHTML = ` · Version ${m[1]} ist online – <button type="button">neu laden</button>`;
        f.querySelector("button").onclick = () => location.reload();
      }
    }).catch(() => {});
  }
  document.body ? render() : addEventListener("DOMContentLoaded", render);
})();
