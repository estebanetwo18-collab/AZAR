/**
 * Convierte un análisis semanal aprobado (HTML autocontenido con `const DATA = {...}`) en el JSON que lee la
 * pestaña "Análisis semanal". Copia DATA sin cambios y agrega `contenido` con los textos de la semana
 * (puntos del resumen, datos, insights, hipótesis y recomendaciones) generados por la propia referencia.
 * Los números de esos textos quedan marcados ({{m:…}}, {{p:…}}…) para que se conviertan a USD en el dashboard.
 *
 * Uso: npm run analisis:extraer -- referencias/analisis-semanal-AAAA-MM-DD.html data/analisis-semanal/AAAA-MM-DD.json
 */
import { readFileSync, writeFileSync } from "fs";
import vm from "vm";
const [ref, out] = process.argv.slice(2);
if (!ref || !out) {
  console.error("Uso: npm run analisis:extraer -- <referencia.html> <data/analisis-semanal/AAAA-MM-DD.json>");
  process.exit(1);
}
const html = readFileSync(ref, "utf8");
let js = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
js = js.replace(/renderAll\(\);\s*$/, "");
// Tokens numéricos: el texto queda igual, los números se formatean en el dashboard según moneda.
const swap = (name, body) => {
  const re = new RegExp(`const ${name}=[^\\n]*\\n`);
  if (!re.test(js)) throw new Error("no " + name);
  js = js.replace(re, `const ${name}=${body};\n`);
};
swap("fmtMoney", 'v=>!ok(v)?"—":`{{m:${v}}}`');
swap("fmtInt", 'v=>!ok(v)?"—":`{{i:${v}}}`');
swap("fmtPct", '(v,base100)=>!ok(v)?"—":`{{p:${base100?v/100:v}}}`');
swap("fmtFreq", 'v=>!ok(v)?"—":`{{f:${v}}}`');
swap("fmtX", 'v=>!ok(v)?"—":`{{x:${v}}}`');
const store = {};
const el = (sel) => (store[sel] ??= { sel, innerHTML: "", textContent: "", value: "", classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, addEventListener() {}, insertAdjacentHTML() {}, querySelector: () => el(sel + " *") });
const ctx = { document: { querySelector: el, querySelectorAll: () => [], addEventListener() {} }, localStorage: { getItem: () => null, setItem() {} }, Intl, Math, console, IntersectionObserver: class { observe() {} } };
vm.createContext(ctx);
vm.runInContext(js + "\n;renderWeekPts();renderInsights();this.__DATA=DATA;", ctx);
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const md = (s) => unesc(s.replace(/<b[^>]*>/g, "**").replace(/<\/b>/g, "**").replace(/<[^>]+>/g, "")).trim();
const lis = (h) => [...h.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
const puntos = lis(store["#weekPts"].innerHTML).map((x) => md(x.replace(/^<b class="n">\d+<\/b>/, "")));
const blocks = [...store["#insBlocks"].innerHTML.matchAll(/<div class="ib (\w+)">([\s\S]*?)<\/(?:ol|ul)><\/div>/g)];
const by = Object.fromEntries(blocks.map((b) => [b[1], b[2]]));
const datos = lis(by.dato).map(md);
const insights = lis(by.insight).map(md);
const hipotesis = lis(by.hip).map((x) => {
  const m = x.match(/^([\s\S]*?)\s*<em>([\s\S]*?)<\/em>\s*$/);
  return { texto: md(m[1]), nota: md(m[2]) };
});
const recomendaciones = lis(by.rec).map((x) => {
  const m = x.match(/<span class="what">([\s\S]*?)<\/span>\s*<span class="tag t-mut">([\s\S]*?)<\/span><span class="meta">([\s\S]*?)<\/span>/);
  return { accion: md(m[1]), donde: md(m[2]), porque: md(m[3]) };
});
const titulos = Object.fromEntries(blocks.map((b) => [b[1], md(b[2].match(/<h3[^>]*>([\s\S]*?)<\/h3>/)[1])]));
const DATA = ctx.__DATA;
const outJson = {
  ...JSON.parse(JSON.stringify(DATA)),
  contenido: {
    nota: "Textos de la semana generados por la referencia aprobada. {{m:n}} = monto en UYU, {{i:n}} entero, {{p:n}} proporción (0,25 = 25 %), {{f:n}} frecuencia, {{x:n}} veces; **texto** = negrita.",
    puntosSemana: puntos,
    recomendacionesPara: "Semana del 19 al 25 de octubre de 2026",
    bloques: { datos: { titulo: titulos.dato, items: datos }, insights: { titulo: titulos.insight, items: insights }, hipotesis: { titulo: titulos.hip, items: hipotesis }, recomendaciones: { titulo: titulos.rec, items: recomendaciones } },
  },
};
writeFileSync(out, JSON.stringify(outJson, null, 1));
console.log(`OK: ${out} · ${outJson.anuncios.length} anuncios · ${puntos.length} puntos · ${recomendaciones.length} recomendaciones`);
