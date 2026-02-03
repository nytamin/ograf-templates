/**
 * Glassmorphism Locator Module
 * Displays broadcast location with live status indicator using frosted glass effects.
 * Supports multiple position layouts and animated location transitions.
 */

const DEFAULT_STATE = {
  location: "London",
  sublocation: "United Kingdom",
  isLive: true,
  position: "top-left",
  accentColor: "#e74c3c",
};

const STYLE_TEXT = `
:host {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  font-family: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color: rgba(245, 248, 255, 0.95);
  --accent: #e74c3c;
}

* {
  box-sizing: border-box;
}

.locator-container {
  position: absolute;
  top: calc(max(3vh, 36px) + env(safe-area-inset-top));
  opacity: 0;
  will-change: transform, opacity;
}

.locator-container[data-position="top-left"] {
  left: max(4vw, 48px);
  transform: translate3d(-100%, 0, 0);
}

.locator-container[data-position="top-right"] {
  right: max(4vw, 48px);
  transform: translate3d(100%, 0, 0);
}

.locator-glass {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 28px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(16, 24, 36, 0.75), rgba(22, 30, 48, 0.4));
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow:
    0 12px 40px rgba(10, 16, 24, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(16px) saturate(135%);
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: var(--accent);
  border-radius: 999px;
  box-shadow: 0 0 16px rgba(231, 76, 60, 0.5);
}

.live-indicator[hidden] {
  display: none;
}

.live-dot {
  width: 10px;
  height: 10px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  animation: pulse-live 1.5s ease-in-out infinite;
}

@keyframes pulse-live {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.live-text {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.98);
}

.location-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.location {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
  text-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
}

.sublocation {
  font-size: 22px;
  font-weight: 500;
  color: rgba(220, 230, 244, 0.9);
  letter-spacing: 0.03em;
  line-height: 1;
}

.sublocation:empty {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .live-dot {
    animation: none;
  }
}
`;

class GlassmorphismLocator extends HTMLElement {
  constructor() {
    super();
    this._state = { ...DEFAULT_STATE };
    this._currentStep = undefined;
    this._isVisible = false;
    this._animation = null;

    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE_TEXT;

    const container = document.createElement("div");
    container.className = "locator-container";

    const glass = document.createElement("div");
    glass.className = "locator-glass";

    const liveIndicator = document.createElement("div");
    liveIndicator.className = "live-indicator";

    const liveDot = document.createElement("div");
    liveDot.className = "live-dot";

    const liveText = document.createElement("div");
    liveText.className = "live-text";
    liveText.textContent = "LIVE";

    liveIndicator.append(liveDot, liveText);

    const locationContent = document.createElement("div");
    locationContent.className = "location-content";

    const location = document.createElement("div");
    location.className = "location";

    const sublocation = document.createElement("div");
    sublocation.className = "sublocation";

    locationContent.append(location, sublocation);
    glass.append(liveIndicator, locationContent);
    container.append(glass);
    root.append(style, container);

    this._elements = { container, liveIndicator, location, sublocation };
  }

  connectedCallback() {
    const position = this._state.position === "top-right" ? "top-right" : "top-left";
    this._elements.container.setAttribute("data-position", position);
    this._elements.container.style.opacity = "0";
    const transform = position === "top-right" ? "translate3d(100%, 0, 0)" : "translate3d(-100%, 0, 0)";
    this._elements.container.style.transform = transform;
  }

  async load(params) {
    if (params.renderType !== "realtime") {
      return {
        statusCode: 400,
        statusMessage: "Non-realtime rendering is not supported.",
      };
    }

    this._state = { ...DEFAULT_STATE, ...(params.data || {}) };
    this._applyState();

    if (document.fonts && document.fonts.load) {
      await Promise.all([
        document.fonts.load("700 32px Inter"),
        document.fonts.load("800 20px Inter"),
      ]).catch(() => undefined);
    }

    return { statusCode: 200 };
  }

  async dispose() {
    this._elements.container.remove();
    this.shadowRoot.innerHTML = "";
    return { statusCode: 200 };
  }

  async playAction(params) {
    const targetStep = this._resolveTargetStep(params);
    const skipAnimation = params?.skipAnimation === true;

    if (targetStep === undefined) {
      this._currentStep = undefined;
    } else {
      await this._animateTo(true, skipAnimation);
      this._currentStep = targetStep;
    }

    return {
      statusCode: 200,
      currentStep: this._currentStep,
    };
  }

  async stopAction(params) {
    const skipAnimation = params?.skipAnimation === true;
    await this._animateTo(false, skipAnimation);
    this._currentStep = undefined;
    return { statusCode: 200 };
  }

  async updateAction(params) {
    this._state = { ...this._state, ...(params?.data || {}) };
    this._applyState();
    return { statusCode: 200 };
  }

  async customAction() {
    return { statusCode: 200 };
  }

  _applyState() {
    const { location, sublocation, isLive, position, accentColor } = this._state;
    const { location: locationEl, sublocation: sublocationEl, liveIndicator, container } = this._elements;

    locationEl.textContent = location || "";
    sublocationEl.textContent = sublocation || "";
    liveIndicator.hidden = !isLive;

    const pos = position === "top-right" ? "top-right" : "top-left";
    container.setAttribute("data-position", pos);

    if (accentColor) {
      this.style.setProperty("--accent", accentColor);
    }
  }

  _resolveTargetStep(params) {
    const stepCount = 1;
    const goto = params?.goto;
    const delta = typeof params?.delta === "number" ? params.delta : 1;

    if (typeof goto === "number") {
      return goto >= stepCount ? undefined : Math.max(0, goto);
    }

    const current = typeof this._currentStep === "number" ? this._currentStep : -1;
    const target = current + delta;

    if (target >= stepCount) {
      return undefined;
    }

    return Math.max(0, target);
  }

  _animateTo(visible, skipAnimation) {
    if (this._isVisible === visible) {
      return Promise.resolve();
    }

    this._isVisible = visible;
    const container = this._elements.container;
    const position = this._state.position === "top-right" ? "top-right" : "top-left";
    const hideTransform = position === "top-right" ? "translate3d(100%, 0, 0)" : "translate3d(-100%, 0, 0)";

    const from = visible
      ? { opacity: 0, transform: hideTransform }
      : { opacity: 1, transform: "translate3d(0, 0, 0)" };
    const to = visible
      ? { opacity: 1, transform: "translate3d(0, 0, 0)" }
      : { opacity: 0, transform: hideTransform };

    if (this._animation) {
      this._animation.cancel();
      this._animation = null;
    }

    if (skipAnimation) {
      container.style.opacity = String(to.opacity);
      container.style.transform = to.transform;
      return Promise.resolve();
    }

    const animation = container.animate([from, to], {
      duration: 400,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      fill: "forwards",
    });

    this._animation = animation;

    return animation.finished
      .catch(() => undefined)
      .finally(() => {
        container.style.opacity = String(to.opacity);
        container.style.transform = to.transform;
        if (this._animation === animation) {
          this._animation = null;
        }
      });
  }
}

export default GlassmorphismLocator;
