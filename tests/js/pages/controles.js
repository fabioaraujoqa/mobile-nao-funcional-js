// Page object da tela Views/Controls/3. Holo Light Theme do ApiDemos.
// Tudo passa por Gestures: campo, teclas do teclado, checkbox e radio viram
// toque do braço quando ROBO=true (e toque por software caso contrário).
const { resourceId } = require("../support/apps");
const id = (name) => resourceId("apidemos", name);

// Mapa de teclas do Gboard em retrato, Moto G06 (tela 720x1640).
// Coordenadas lidas da captura do teclado; cada tecla tem ~71 px de largura.
const TECLADO = {
  q: [40, 1210], w: [110, 1210], e: [181, 1210], r: [252, 1210], t: [323, 1210],
  y: [393, 1210], u: [464, 1210], i: [535, 1210], o: [606, 1210], p: [677, 1210],
  a: [74, 1304], s: [145, 1304], d: [216, 1304], f: [287, 1304], g: [358, 1304],
  h: [429, 1304], j: [500, 1304], k: [571, 1304], l: [642, 1304],
  z: [145, 1398], x: [216, 1398], c: [287, 1398], v: [358, 1398], b: [429, 1398],
  n: [500, 1398], m: [571, 1398],
  " ": [394, 1494],
};

class ControlesPage {
  constructor(driver, gestures) {
    Object.assign(this, { driver, gestures });
  }

  /** Navega ApiDemos: Views > Controls > 3. Holo Light Theme. */
  async abrir() {
    await this.gestures.click("~Views");
    await this.gestures.click("~Controls");
    await this.rolarAte("3. Holo Light Theme");
    await this.gestures.click("~3. Holo Light Theme");
    await (await this.driver.$(id("edit"))).waitForDisplayed();
  }

  /** Traz um item da lista para a tela (por software; o braço não rola por texto). */
  async rolarAte(texto) {
    const sel =
      "android=new UiScrollable(new UiSelector().scrollable(true).instance(0))" +
      `.scrollIntoView(new UiSelector().text("${texto}"))`;
    await this.driver.$(sel).catch(() => {});
  }

  /**
   * Toca o campo (abre o teclado) e digita tecla por tecla, como um usuário.
   * Cada tecla é um toque de Gestures: braço quando ROBO=true, software caso contrário.
   */
  async digitar(texto) {
    const campo = await this.driver.$(id("edit"));
    await campo.waitForDisplayed();
    await this.gestures.click(id("edit")); // foca o campo e abre o teclado
    await this.driver.waitUntil(async () => await this.tecladoAberto(), {
      timeout: 5000,
      timeoutMsg: "o teclado não abriu depois de tocar o campo",
    });
    for (const ch of texto.toLowerCase()) {
      const pos = TECLADO[ch];
      if (!pos) throw Error(`tecla não mapeada: "${ch}"`);
      await this.gestures.tap(pos[0], pos[1]);
      await this.driver.pause(140);
    }
    // Esconder o teclado antes dos próximos toques: senão o braço bateria nele,
    // e os checkboxes/radios mudam de lugar quando ele fecha.
    await this.driver.hideKeyboard().catch(() => {});
  }

  async tecladoAberto() {
    // UiAutomator2: true quando há um teclado (IME) na tela.
    return this.driver.isKeyboardShown().catch(() => true);
  }

  async texto() {
    return (await this.driver.$(id("edit"))).getText();
  }

  /** Marca um checkbox (check1 ou check2) com o gesto (braço quando ROBO=true). */
  async marcarCheckbox(n = 1) {
    await this.gestures.click(id(`check${n}`));
  }

  /** Seleciona um radio button (radio1 ou radio2) com o gesto. */
  async marcarRadio(n = 1) {
    await this.gestures.click(id(`radio${n}`));
  }

  async marcado(name) {
    const el = await this.driver.$(id(name));
    return (await el.getAttribute("checked")) === "true";
  }
}

module.exports = { ControlesPage };
