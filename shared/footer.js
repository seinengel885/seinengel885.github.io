/* Fußzeile mit der geladenen Versionsnummer (aus version.js). Prüft zusätzlich ohne Cache, welcher Stand auf dem
   Server liegt: Ist dort schon ein neuerer, erscheint „Neuer Stand online – neu laden“. */
(function(){
  const me = document.currentScript;
  const vUrl = new URL("version.js", me.src).href;
  const css = `.site-foot{max-width:560px;margin:28px auto 8px;padding:0 16px;text-align:center;font:12px/1.5 system-ui,-apple-system,sans-serif;color:var(--muted,#5f6f66);opacity:.8}
  .site-foot button{font:inherit;color:var(--accent,#2f7a4a);background:none;border:0;padding:0;text-decoration:underline;cursor:pointer}
  .site-foot button.site-nr{color:inherit;text-decoration:none;padding:6px 10px;margin:-6px -10px}
  .site-foot ol{list-style:none;margin:8px auto 0;padding:0;max-width:420px;text-align:left;display:grid;gap:6px}
  .site-foot li{display:grid;grid-template-columns:auto 1fr;gap:2px 10px}
  .site-foot li b{font-weight:600;font-variant-numeric:tabular-nums}
  .site-foot li span{grid-column:2}
  .site-foot li small{grid-column:2;font-size:inherit;opacity:.75}`;
  function fmt(s){ const m = String(s||"").match(/^(\d{4})-(\d\d)-(\d\d) (\d\d:\d\d)/); return m ? `${m[3]}.${m[2]}.${m[1]} ${m[4]}` : s || "?"; }
  function render(){
    const v = window.SITE_VERSION || {};
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const f = document.createElement("footer"); f.className = "site-foot";
    const esc = t => String(t ?? "").replace(/[<>&"]/g, c => `&#${c.charCodeAt(0)};`);
    const liste = (window.SITE_VERSIONEN || [v]).slice(0, 5);
    f.innerHTML = `<button type="button" class="site-nr" aria-expanded="false">Version ${esc(v.nr ?? "?")}</button><span class="site-new"></span>
      <ol hidden>${liste.map(x => `<li><b>${esc(x.nr)}</b><span>${esc(x.was)}</span><small>${esc(fmt(x.stand))}</small></li>`).join("")}</ol>`;
    const nrB = f.querySelector(".site-nr"), ol = f.querySelector("ol");
    nrB.onclick = () => { ol.hidden = !ol.hidden; nrB.setAttribute("aria-expanded", !ol.hidden); };
    document.body.appendChild(f);
    fetch(vUrl, { cache: "no-store" }).then(r => r.ok ? r.text() : "").then(t => {
      const m = t.match(/nr:\s*(\d+)/);
      if(m && v.nr && +m[1] > v.nr){
        f.querySelector(".site-new").innerHTML = ` · Version ${m[1]} ist online – <button type="button">neu laden</button>`;
        f.querySelector(".site-new button").onclick = () => location.reload();
      }
    }).catch(() => {});
  }
  document.body ? render() : addEventListener("DOMContentLoaded", render);
})();
