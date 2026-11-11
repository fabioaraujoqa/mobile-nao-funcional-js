// Comandos adb (via `mobile: shell`) e medições do ApiDemos para os testes de tipos/.
const assert = require("node:assert/strict");
const p = require("./parsers");
const { Csv } = require("./csv");
const { APPS, resourceId } = require("./apps");
const L = require("./limits");
const PACKAGE = APPS.apidemos.package;
const SAVED = resourceId("apidemos", "saved");
/** Texto digitado antes de uma interrupção, que precisa continuar na tela depois dela. */
const TEXTO_PRESERVADO = "texto preservado";

class Nfr {
  /**
   * Sem argumentos, usa os globais do WebdriverIO (`browser` e `gestures`) na hora do uso:
   * assim o spec pode criar o Nfr ao carregar, antes de a sessão existir.
   */
  constructor(driver, gestures) {
    this._driver = driver;
    this._gestures = gestures;
    this.csv = new Csv();
    this.previous = null;
    this.touchLog = `/data/local/tmp/nfr_getevent_${Date.now()}.log`;
  }
  get driver() {
    return this._driver ?? global.browser;
  }
  get gestures() {
    return this._gestures ?? global.gestures;
  }
  mobile(command, args = {}) {
    return this.driver.execute(`mobile: ${command}`, args);
  }
  async shell(command) {
    try {
      return p.saidaShell(
        await this.mobile("shell", { command, timeout: 30000 }),
      );
    } catch (e) {
      if (String(e).includes("adb_shell"))
        throw Error(
          "Inicie Appium com --allow-insecure=uiautomator2:adb_shell",
        );
      throw e;
    }
  }
  async open(activity = APPS.apidemos.activity) {
    const out = await this.shell(`am start -W -n ${PACKAGE}/${activity}`);
    if (/Error|Exception/.test(out)) throw Error(out);
  }
  /**
   * Muda uma configuração do Android (`settings put`), roda `acao` e devolve o valor
   * anterior, mesmo se a ação falhar. Valor anterior "null" = configuração apagada.
   */
  async comConfiguracao(namespace, chave, valor, acao, { pausaMs = 0 } = {}) {
    const antes = (
      await this.shell(`settings get ${namespace} ${chave}`)
    ).trim();
    try {
      await this.shell(`settings put ${namespace} ${chave} ${valor}`);
      if (pausaMs) await this.driver.pause(pausaMs);
      return await acao();
    } finally {
      await this.shell(
        antes === "null"
          ? `settings delete ${namespace} ${chave}`
          : `settings put ${namespace} ${chave} ${antes}`,
      );
      if (pausaMs) await this.driver.pause(pausaMs);
    }
  }
  /**
   * Compara a tela com a referência deste aparelho (@wdio/visual-service). "Localização do
   * ponteiro" e "Mostrar toques" (opções do desenvolvedor, úteis com o braço) desenham por
   * cima da tela: ficam desligadas só durante a captura.
   */
  async compararTela(nome, maxPct = L.VISUAL_DIFERENCA_MAX_PCT) {
    await this.comConfiguracao("system", "pointer_location", 0, () =>
      this.comConfiguracao("system", "show_touches", 0, async () => {
        await this.driver.pause(500);
        await expect(this.driver).toMatchScreenSnapshot(nome, maxPct);
      }),
    );
  }
  /** Fecha diálogos do sistema que cobririam os próximos testes, inclusive "o app parou". */
  async fecharDialogos() {
    await this.shell(
      "am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS",
    );
    // O diálogo de crash não fecha com o broadcast no Android 10+: toca em "Fechar app".
    for (const botao of await this.driver.$$("id=android:id/aerr_close"))
      await botao.click().catch(() => {});
  }
  async prepare(activity = APPS.apidemos.activity) {
    await this.shell("true");
    await this.fecharDialogos();
    const w = await this.shell("dumpsys window");
    if (/(?:isKeyguardShowing|mShowingLockscreen)=true/.test(w))
      throw Error("Desbloqueie o aparelho");
    await this.open(activity);
  }
  async pid() {
    return p.num(await this.shell(`pidof ${PACKAGE} || true`), /(\d+)/);
  }
  async crashes() {
    return Number(
      (
        await this.shell(
          `logcat -d -b crash | grep -c 'Process: ${PACKAGE}' || true`,
        )
      ).trim() || 0,
    );
  }
  async baseline() {
    const pid = await this.pid();
    assert.ok(pid, "App não está em execução");
    return { pid, crashes: await this.crashes() };
  }
  async alive(base, focus = true) {
    assert.equal(await this.pid(), base.pid, "Processo morreu ou reiniciou");
    assert.equal(await this.crashes(), base.crashes, "Crash registrado");
    if (focus)
      assert.equal(
        (await this.shell("dumpsys activity activities")).match(
          /(?:topResumedActivity|ResumedActivity)[=:]\s*ActivityRecord\{\S+ \S+ ([\w.]+)\//,
        )?.[1],
        PACKAGE,
        "App fora de primeiro plano",
      );
  }
  /** Abre o SaveRestoreState e digita um texto que deve sobreviver às interrupções. */
  async digitarTexto(text = TEXTO_PRESERVADO) {
    await this.open(".app.SaveRestoreState");
    const el = await this.driver.$(SAVED);
    await el.waitForDisplayed();
    await el.setValue(text);
  }
  async textoDigitado() {
    const el = await this.driver.$(SAVED);
    await el.waitForDisplayed();
    return el.getText();
  }
  /** O app continua vivo, na frente, e o texto digitado não se perdeu. */
  async confirmaTexto(base, text = TEXTO_PRESERVADO) {
    await this.alive(base);
    assert.equal(await this.textoDigitado(), text, "Texto digitado se perdeu");
  }
  async scroll(direction = 1) {
    if (!this.gestures)
      throw Error("Nfr sem gestures (global ou no construtor)");
    const { width, height } = await this.driver.getWindowSize();
    await this.gestures.swipe(
      width / 2,
      height * (0.5 + 0.3 * direction),
      width / 2,
      height * (0.5 - 0.3 * direction),
      0.3,
    );
  }
  async wait(seconds) {
    for (let left = seconds; left > 0; left -= 60) {
      await this.driver.pause(Math.min(left, 60) * 1000);
      await this.shell("true");
    }
  }
  async startup(mode) {
    if (mode === "morno") await this.shell("input keyevent HOME");
    const out = await this.shell(
        `am start -W ${mode === "frio" ? "-S" : "-f 0x10008000"} -n ${PACKAGE}/${APPS.apidemos.activity}`,
      ),
      r = p.startup(out);
    if (r.total_ms == null) throw Error(`TotalTime ausente: ${out}`);
    return r;
  }
  async sample(start, event = "") {
    const pid = await this.pid();
    let memory = { pss_mb: null, java_heap_mb: null, native_heap_mb: null },
      threads = null,
      cpu_pct = null;
    if (pid != null) {
      memory = p.meminfo(await this.shell(`dumpsys meminfo ${PACKAGE}`));
      threads = p.num(
        await this.shell(`cat /proc/${pid}/status || true`),
        /^Threads:\s*(\d+)/m,
      );
      const proc = p.cpuTicks(
          await this.shell(`cat /proc/${pid}/stat || true`),
        ),
        total = p.totalTicks(await this.shell("cat /proc/stat"));
      if (
        this.previous?.pid === pid &&
        proc != null &&
        total != null &&
        this.previous.proc != null &&
        this.previous.total != null
      ) {
        const dp = proc - this.previous.proc,
          dt = total - this.previous.total;
        if (dp >= 0 && dt > 0) cpu_pct = (100 * dp) / dt;
      }
      this.previous = { pid, proc, total };
    } else this.previous = null;
    const battery = p.battery(await this.shell("dumpsys battery")),
      temp = p.thermal(await this.shell("dumpsys thermalservice || true"));
    return {
      pid,
      ...memory,
      threads,
      cpu_pct,
      ...battery,
      temperatura_c: temp ?? battery.temperatura_c,
      horas: (Date.now() - start) / 3600000,
      evento: event,
    };
  }
  async startTouch() {
    const devices = await this.shell("getevent -lp");
    const blocks = devices.split(/add device/).slice(1);
    const device = blocks
      .find((b) => /ABS_MT_POSITION_X/.test(b) && /ABS_MT_POSITION_Y/.test(b))
      ?.match(/\/dev\/input\/event\d+/)?.[0];
    if (!device) throw Error("Touchscreen não encontrado");
    const out = await this.shell(
      `nohup getevent -lt ${device} > ${this.touchLog} 2>&1 < /dev/null & echo $!`,
    );
    this.touchPid = Number(out.trim());
    if (!Number.isInteger(this.touchPid) || this.touchPid <= 0)
      throw Error("PID inválido do getevent");
  }
  async stopTouch() {
    try {
      if (this.touchPid) await this.shell(`kill ${this.touchPid} || true`);
    } finally {
      await this.shell(`rm -f ${this.touchLog}`);
    }
  }
  async latency(previous) {
    const toque_s = p.touch(await this.shell(`cat ${this.touchLog}`));
    if (toque_s == null || (previous != null && toque_s <= previous))
      throw Error("Nenhum contato físico novo");
    return {
      toque_s,
      latencia_ms: p.latency(
        toque_s,
        p.frames(await this.shell(`dumpsys gfxinfo ${PACKAGE} framestats`)),
      ),
    };
  }
}
module.exports = { Nfr, PACKAGE, TEXTO_PRESERVADO };
