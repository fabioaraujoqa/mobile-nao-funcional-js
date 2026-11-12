// Aplicativos testados: única fonte de pacote, activity inicial e APK.
const path = require("node:path");

const APPS = {
  apidemos: {
    package: "io.appium.android.apis",
    activity: ".ApiDemos",
    apk: path.resolve(__dirname, "../../../apps/ApiDemos-debug.apk"),
  },
};

/** Seletor WebdriverIO para um resource-id do app (`id=pacote:id/nome`). */
const resourceId = (app, name) => `id=${APPS[app].package}:id/${name}`;

module.exports = { APPS, resourceId };
