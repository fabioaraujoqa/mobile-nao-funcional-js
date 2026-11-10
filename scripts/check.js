const fs = require("node:fs"),
  path = require("node:path"),
  { execFileSync } = require("node:child_process");
function check(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) check(file);
    else if (file.endsWith(".js"))
      execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
  }
}
check("tests/js");
check("scripts");
execFileSync(process.execPath, ["--check", "wdio.conf.js"], {
  stdio: "inherit",
});
console.log("Sintaxe JavaScript OK");
