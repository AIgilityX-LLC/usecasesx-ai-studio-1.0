import fs from "fs";

const cssPath = new URL("../src/styles.css", import.meta.url);
let css = fs.readFileSync(cssPath, "utf8");
const start = css.indexOf("/* ---- Landing: Midnight systems editorial");
const end = css.indexOf("/* ---- Print-friendly repository detail");
if (start < 0 || end < 0) {
  console.error("markers missing", start, end);
  process.exit(1);
}
css = `${css.slice(0, start)}@import "./landing.css";\n\n${css.slice(end)}`;
fs.writeFileSync(cssPath, css);
console.log("patched styles.css; removed", end - start, "chars of old landing CSS");
