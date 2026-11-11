// TIPO 12 DE 12 · PLATAFORMA — Teste de segurança
// Objetivo:    se os dados do usuário estão protegidos.
// O que testa: permissões além das esperadas, senha/token em texto aberto nos arquivos
//              internos e build de produção depurável ou com backup liberado.
// Onde rodar:  emulador e mesa.
// Appium:      mobile: getPermissions · mobile: pullFile · mobile: shell (run-as, dumpsys package)
// O Appium só ajuda a olhar. A análise de segurança de verdade usa ferramentas próprias (MobSF).
const assert = require("node:assert/strict");
const { PACKAGE } = require("../support/nfr");
const { prepararSuite } = require("../support/suite");

// Todas as permissões concedidas ao app (de instalação e de execução).
// Uma versão nova pedindo outra reprova aqui até alguém revisar e incluir na lista.
const PERMISSOES_ESPERADAS = [
  "android.permission.INTERNET",
  "android.permission.NFC",
  "android.permission.SET_WALLPAPER",
  "android.permission.VIBRATE",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.CAMERA",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.READ_CONTACTS",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.RECEIVE_SMS",
  "android.permission.RECORD_AUDIO",
  "android.permission.SEND_SMS",
  "android.permission.WRITE_CONTACTS",
  "android.permission.WRITE_EXTERNAL_STORAGE",
];
const SEGREDO = /(token|password|passwd|senha|secret|api[_-]?key)/i;

describe("12 · Segurança: dados protegidos", () => {
  const n = prepararSuite();

  it("Tem só as permissões esperadas", async () => {
    const concedidas = await n.mobile("getPermissions", {
      type: "granted",
      appPackage: PACKAGE,
    });
    const extras = concedidas.filter((p) => !PERMISSOES_ESPERADAS.includes(p));
    n.csv.write("seguranca", {
      caso: "permissoes",
      concedidas: concedidas.join(" "),
    });
    assert.deepEqual(extras, [], "Permissões não esperadas");
  });

  it("Arquivos internos não guardam senha ou token em texto aberto", async () => {
    // run-as só funciona em build depurável; em build de produção, use o MobSF.
    const arquivos = (
      await n.shell(`run-as ${PACKAGE} ls shared_prefs 2>/dev/null || true`)
    )
      .split(/\s+/)
      .filter((f) => f.endsWith(".xml"));
    const comSegredo = [];
    for (const arquivo of arquivos) {
      const conteudo = Buffer.from(
        await n.mobile("pullFile", {
          remotePath: `@${PACKAGE}/shared_prefs/${arquivo}`,
        }),
        "base64",
      ).toString("utf8");
      if (SEGREDO.test(conteudo)) comSegredo.push(arquivo);
    }
    n.csv.write("seguranca", {
      caso: "shared_prefs",
      concedidas: arquivos.join(" "),
    });
    assert.deepEqual(comSegredo, [], "Possível segredo em texto aberto");
  });

  it("Build não é depurável nem permite backup [falha conhecida ApiDemos]", async () => {
    const flags =
      (await n.shell(`dumpsys package ${PACKAGE}`)).match(
        /^\s*flags=\[([^\]]*)\]/m,
      )?.[1] ?? "";
    const riscos = ["DEBUGGABLE", "ALLOW_BACKUP"].filter((f) =>
      flags.split(/\s+/).includes(f),
    );
    assert.deepEqual(riscos, [], `Flags de risco no build: ${flags.trim()}`);
  });
});
