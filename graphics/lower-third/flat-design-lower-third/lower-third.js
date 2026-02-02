const DEFAULT_STATE = {
  name: "Alex Morgan",
  title: "Chief Analyst",
  location: "New York",
  showLocation: true,
  isLive: false,
  primaryColor: "#3498db",
  accentColor: "#e74c3c",
};

const STYLE_TEXT = `
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');

:host {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  font-family: "Roboto", "Arial", sans-serif;
  --primary: #3498db;
  --accent: #e74c3c;
}

* {
  box-sizing: border-box;
}

.scene {
  position: absolute;
  left: max(5vw, 72px);
  bottom: calc(max(6vh, 72px) + env(safe-area-inset-bottom));
  opacity: 0;
  will-change: transform, opacity;
}

.container {
  display: flex;
  align-items: stretch;
  border-radius: 8px;
  overflow: hidden;
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.24),
    0 4px 8px rgba(0, 0, 0, 0.18);
}

.accent-bar {
  width: 8px;
  background: var(--accent);
  flex-shrink: 0;
}

.content-box {
  background: var(--primary);
  padding: 28px 44px;
  min-width: clamp(480px, 48vw, 780px);
}

.name {
  font-size: clamp(48px, 3.4vw, 64px);
  font-weight: 900;
  letter-spacing: -0.01em;
  line-height: 1;
  color: #ffffff;
  margin-bottom: 12px;
}

.title {
  font-size: clamp(30px, 2.2vw, 38px);
  font-weight: 500;
  line-height: 1.2;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 14px;
}

.meta-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}

.meta-bar[hidden] {
  display: none;
}

.live-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 18px;
  background: var(--accent);
  color: #ffffff;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-radius: 4px;
  box-shadow:
    0 3px 6px rgba(0, 0, 0, 0.16),
    0 2px 4px rgba(0, 0, 0, 0.12);
}

.live-badge[hidden] {
  display: none;
}

.location-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 18px;
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  border-radius: 4px;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.14),
    0 1px 2px rgba(0, 0, 0, 0.10);
}

.location-badge[hidden] {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .scene {
    transition: none;
  }
}
`;

class MaterialDesignLowerThird extends HTMLElement {
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

    const container = document.createElement("div");
    container.className = "container";

    const accentBar = document.createElement("div");
    accentBar.className = "accent-bar";

    const contentBox = document.createElement("div");
    contentBox.className = "content-box";

    const name = document.createElement("div");
    name.className = "name";

    const title = document.createElement("div");
    title.className = "title";

    const metaBar = document.createElement("div");
    metaBar.className = "meta-bar";

    const liveBadge = document.createElement("div");
    liveBadge.className = "live-badge";
    liveBadge.textContent = "LIVE";

    const locationBadge = document.createElement("div");
    locationBadge.className = "location-badge";

    metaBar.append(liveBadge, locationBadge);
    contentBox.append(name, title, metaBar);
    container.append(accentBar, contentBox);
    scene.append(container);
    root.append(style, scene);

    this._elements = { scene, accentBar, contentBox, name, title, metaBar, liveBadge, locationBadge };
  }

  connectedCallback() {
    this._elements.scene.style.opacity = "0";
    this._elements.scene.style.transform = "translate3d(-100%, 0, 0)";
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
        document.fonts.load("900 64px Roboto"),
        document.fonts.load("500 38px Roboto"),
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
    const { name, title, location, showLocation, isLive, primaryColor, accentColor } = this._state;
    const { name: nameEl, title: titleEl, locationBadge, metaBar, liveBadge, accentBar, contentBox } = this._elements;

    nameEl.textContent = name || "";
    titleEl.textContent = title || "";
    locationBadge.textContent = location || "";

    const showMeta = Boolean((showLocation && location) || isLive);
    metaBar.hidden = !showMeta;
    liveBadge.hidden = !isLive;
    locationBadge.hidden = !(showLocation && location);

    if (primaryColor) {
      this.style.setProperty("--primary", primaryColor);
      contentBox.style.background = primaryColor;
    }

    if (accentColor) {
      this.style.setProperty("--accent", accentColor);
      accentBar.style.background = accentColor;
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
    const scene = this._elements.scene;
    const from = visible
      ? { opacity: 0, transform: "translate3d(-100%, 0, 0)" }
      : { opacity: 1, transform: "translate3d(0, 0, 0)" };
    const to = visible
      ? { opacity: 1, transform: "translate3d(0, 0, 0)" }
      : { opacity: 0, transform: "translate3d(-100%, 0, 0)" };

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
      duration: 380,
      easing: "cubic-bezier(0.4, 0.0, 0.2, 1)",
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

export default MaterialDesignLowerThird;
