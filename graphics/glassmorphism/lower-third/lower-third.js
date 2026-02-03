/**
 * Glassmorphism Lower Third Module
 * Modern frosted glass lower-third graphic with blur effects and layered animations.
 * Supports custom colors and animated reveal with name, title, and location display.
 */

const DEFAULT_STATE = {
  name: "Alex Morgan",
  title: "Chief Analyst",
  location: "New York",
  showLocation: true,
  isLive: false,
  accentColor: "#6cc7ff",
};

const STYLE_TEXT = `
:host {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  font-family: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color: rgba(245, 248, 255, 0.95);
  --accent: #6cc7ff;
}

* {
  box-sizing: border-box;
}

.scene {
  position: absolute;
  left: max(5vw, 72px);
  bottom: calc(max(6vh, 72px) + env(safe-area-inset-bottom));
  transform: translate3d(0, 28px, 0);
  opacity: 0;
  will-change: transform, opacity;
}

.glass {
  position: relative;
  display: flex;
  align-items: stretch;
  padding: 28px 40px;
  min-width: clamp(520px, 50vw, 820px);
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(18, 28, 44, 0.78), rgba(14, 22, 34, 0.35));
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow:
    0 28px 80px rgba(7, 12, 20, 0.45),
    0 12px 32px rgba(10, 16, 24, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(22px) saturate(160%);
  overflow: hidden;
}

.glass::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.16), transparent 45%, rgba(255, 255, 255, 0.04));
  opacity: 0.9;
  pointer-events: none;
  z-index: 0;
}

.glass::after {
  content: "";
  position: absolute;
  top: -50px;
  left: -40px;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, rgba(108, 199, 255, 0.55), rgba(108, 199, 255, 0) 70%);
  filter: blur(18px);
  opacity: 0.8;
  pointer-events: none;
  z-index: 0;
}

.glass > * {
  position: relative;
  z-index: 1;
}

.accent {
  width: 8px;
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.7), var(--accent));
  margin-right: 18px;
  box-shadow:
    0 0 18px rgba(108, 199, 255, 0.6),
    0 0 34px rgba(108, 199, 255, 0.25);
}

.content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.name {
  font-size: clamp(46px, 3.2vw, 60px);
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.05;
  text-shadow:
    0 6px 16px rgba(0, 0, 0, 0.45),
    0 0 12px rgba(108, 199, 255, 0.2);
}

.title {
  font-size: clamp(28px, 2vw, 36px);
  font-weight: 500;
  line-height: 1.2;
  color: rgba(220, 230, 244, 0.95);
}

.meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: clamp(22px, 1.6vw, 28px);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(200, 214, 232, 0.9);
}

.meta[hidden] {
  display: none;
}

.live {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 80, 80, 0.22);
  border: 1px solid rgba(255, 140, 140, 0.7);
  color: rgba(255, 210, 210, 0.95);
  font-weight: 700;
  letter-spacing: 0.12em;
  box-shadow: 0 8px 18px rgba(255, 80, 80, 0.25);
}

.live::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 120, 120, 0.95);
  box-shadow: 0 0 12px rgba(255, 120, 120, 0.7);
}

.live[hidden] {
  display: none;
}

.location {
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .scene {
    transition: none;
  }
}
`;

class GlassmorphismLowerThird extends HTMLElement {
  constructor() {
    super();
    this._state = { ...DEFAULT_STATE };
    this._currentStep = undefined;
    this._isVisible = false;
    this._animation = null;

    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE_TEXT;

    const scene = document.createElement("div");
    scene.className = "scene";

    const glass = document.createElement("div");
    glass.className = "glass";

    const accent = document.createElement("div");
    accent.className = "accent";

    const content = document.createElement("div");
    content.className = "content";

    const name = document.createElement("div");
    name.className = "name";

    const title = document.createElement("div");
    title.className = "title";

    const meta = document.createElement("div");
    meta.className = "meta";

    const live = document.createElement("span");
    live.className = "live";
    live.textContent = "LIVE";

    const location = document.createElement("span");
    location.className = "location";

    meta.append(live, location);
    content.append(name, title, meta);
    glass.append(accent, content);
    scene.append(glass);
    root.append(style, scene);

    this._elements = { scene, accent, name, title, meta, live, location };
  }

  connectedCallback() {
    this._elements.scene.style.opacity = "0";
    this._elements.scene.style.transform = "translate3d(0, 28px, 0)";
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
        document.fonts.load("700 56px Inter"),
        document.fonts.load("500 32px Inter"),
      ]).catch(() => undefined);
    }

    return { statusCode: 200 };
  }

  async dispose() {
    this._elements.scene.remove();
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
    const { name, title, location, showLocation, isLive, accentColor } = this._state;
    const { name: nameEl, title: titleEl, location: locationEl, meta, live, accent } = this._elements;

    nameEl.textContent = name || "";
    titleEl.textContent = title || "";
    locationEl.textContent = location || "";

    const showMeta = Boolean((showLocation && location) || isLive);
    meta.hidden = !showMeta;
    live.hidden = !isLive;
    locationEl.hidden = !(showLocation && location);

    if (accentColor) {
      this.style.setProperty("--accent", accentColor);
      accent.style.background = "var(--accent)";
      accent.style.boxShadow = `0 0 14px ${this._toRgba(accentColor, 0.6)}`;
    }
  }

  _toRgba(color, alpha) {
    const fallback = `rgba(108, 199, 255, ${alpha})`;
    if (typeof color !== "string") {
      return fallback;
    }

    const hexMatch = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!hexMatch) {
      return fallback;
    }

    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((value) => value + value)
        .join("");
    }

    const intVal = Number.parseInt(hex, 16);
    const r = (intVal >> 16) & 255;
    const g = (intVal >> 8) & 255;
    const b = intVal & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
    const scene = this._elements.scene;
    const from = visible
      ? { opacity: 0, transform: "translate3d(0, 28px, 0)" }
      : { opacity: 1, transform: "translate3d(0, 0, 0)" };
    const to = visible
      ? { opacity: 1, transform: "translate3d(0, 0, 0)" }
      : { opacity: 0, transform: "translate3d(0, 28px, 0)" };

    if (this._animation) {
      this._animation.cancel();
      this._animation = null;
    }

    if (skipAnimation) {
      scene.style.opacity = String(to.opacity);
      scene.style.transform = to.transform;
      return Promise.resolve();
    }

    const animation = scene.animate([from, to], {
      duration: 420,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      fill: "forwards",
    });

    this._animation = animation;

    return animation.finished
      .catch(() => undefined)
      .finally(() => {
        scene.style.opacity = String(to.opacity);
        scene.style.transform = to.transform;
        if (this._animation === animation) {
          this._animation = null;
        }
      });
  }
}


export default GlassmorphismLowerThird;
