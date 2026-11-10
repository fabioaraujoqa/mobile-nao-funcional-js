// Cliente HTTP do servidor do braço (python -m tools.server).
class RobotClient {
  constructor(
    url = process.env.ROBOT_URL || "http://127.0.0.1:8765",
    request = fetch,
  ) {
    this.url = url;
    this.request = request;
  }
  async call(route, body) {
    let response;
    try {
      response = await this.request(this.url + route, {
        method: body === undefined ? "GET" : "POST",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(120000),
      });
    } catch (e) {
      throw Error(
        `Braço indisponível em ${this.url} (${e.cause?.code || e.message}). ` +
          "Inicie: .venv/bin/python -m tools.server",
      );
    }
    const result = await response.json().catch(() => null);
    if (!result)
      throw Error(
        `Braço ${route}: resposta inválida (HTTP ${response.status})`,
      );
    if (!response.ok || !result.ok)
      throw Error(
        `Braço ${route}: ${result.error || `HTTP ${response.status}`}`,
      );
    return result;
  }
  health() {
    return this.call("/health");
  }
  tap(x, y) {
    return this.call("/tap", { x, y });
  }
  swipe(x1, y1, x2, y2, duration_s = 0.8, hold_s = 0) {
    return this.call("/swipe", { x1, y1, x2, y2, duration_s, hold_s });
  }
  longPress(x, y, seconds = 1) {
    return this.call("/long_press", { x, y, seconds });
  }
  park() {
    return this.call("/park", {});
  }
}
module.exports = { RobotClient };
