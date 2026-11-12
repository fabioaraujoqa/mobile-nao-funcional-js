// DEMO EM LOOP — para a apresentação. Numa sessão só, o braço alterna:
//   1) Bouncing Balls (bolinha): solta bolinhas por ~BOLINHA_S segundos
//   2) Controls/3: digita "hello world" no teclado e marca checkbox e radio
// Repete até DEMO_MIN minutos (padrão 30) ou até você parar com Ctrl+C.
// Rode com o braço:  scripts/demo-loop.sh   (ou: UDID=<cel> ROBO=true npm run test:demo-loop)
const { ControlesPage } = require("../pages/controles");

const PKG = "io.appium.android.apis";
const DEMO_MIN = Number(process.env.DEMO_MIN || 30);
const BOLINHA_S = Number(process.env.BOLINHA_S || 30);

describe("Demo em loop com o braço", () => {
  let controles;
  before(() => {
    controles = new ControlesPage(browser, gestures);
  });

  async function abrir(activity) {
    const out = await browser.execute("mobile: shell", {
      command: `am start -S -n ${PKG}/${activity}`,
      timeout: 30000,
    });
    if (/Error|Exception/.test(String(out))) throw Error(String(out));
    await browser.pause(800);
  }

  it(`Alterna bolinha e hello world por ${DEMO_MIN} min (Ctrl+C para parar)`, async function () {
    this.timeout((DEMO_MIN + 5) * 60000);
    const fim = Date.now() + DEMO_MIN * 60000;
    const { width, height } = await browser.getWindowSize();
    // Pontos para soltar bolinhas, dentro da área de desenho (abaixo do título).
    const pontos = [
      [0.5, 0.35], [0.25, 0.5], [0.75, 0.5],
      [0.5, 0.62], [0.33, 0.45], [0.67, 0.45],
    ].map(([fx, fy]) => [Math.round(fx * width), Math.round(fy * height)]);

    let ciclo = 0;
    while (Date.now() < fim) {
      ciclo += 1;
      console.log(`\n=== Ciclo ${ciclo} ===`);

      // 1) BOLINHA: toca a tela por ~BOLINHA_S segundos (o braço solta bolinhas).
      console.log("Bouncing Balls...");
      await abrir(".animation.BouncingBalls");
      const ateBolinha = Math.min(Date.now() + BOLINHA_S * 1000, fim);
      let i = 0;
      while (Date.now() < ateBolinha) {
        const [x, y] = pontos[i % pontos.length];
        i += 1;
        await gestures.tap(x, y);
        await browser.pause(600);
      }
      if (Date.now() >= fim) break;

      // 2) HELLO WORLD: digita no teclado e marca checkbox e radio, com o braço.
      console.log("hello world...");
      await abrir(".view.Controls3");
      await controles.digitar("hello world");
      await controles.marcarCheckbox(1);
      await controles.marcarRadio(1);
      await browser.pause(1200);
    }
    console.log(`\nDemo encerrada após ${ciclo} ciclo(s).`);
  });
});
