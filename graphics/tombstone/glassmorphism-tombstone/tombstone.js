const DEFAULT_STATE = {
  header: "DID YOU KNOW?",
  fact: "This is an interesting fact about the topic",
  source: "",
  accentColor: "#f39c12",
};

const STYLE_TEXT = `
:host {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  font-family: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color: rgba(245, 248, 255, 0.95);
  --accent: #f39c12;
}

* {
  box-sizing: border-box;
}

.tombstone-container {
  position: absolute;
  left: 50%;
  bottom: calc(max(8vh, 88px) + env(safe-area-inset-bottom));
  transform: translate3d(-50%, 28px, 0);
  opacity: 0;
  will-change: transform, opacity;
}

.tombstone-glass {
  position: relative;
  min-width: clamp(640px, 60vw, 1100px);
  max-width: 90vw;
  padding: 32px 48px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(16, 24, 36, 0.78), rgba(22, 30, 48, 0.4));
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow:
    0 20px 56px rgba(10, 16, 24, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(18px) saturate(140%);
}

.header-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.header-icon {
  width: 8px;
  height: 8px;
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 0 16px var(--accent);
}

.header-text {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}

.fact-content {
  font-size: clamp(32px, 2.4vw, 42px);
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.01em;
  text-shadow: 0 3px 12px rgba(0, 0, 0, 0.3);
  margin-bottom: 16px;
}

.source-text {
  font-size: 22px;
  font-weight: 500;
  font-style: italic;
  color: rgba(220, 230, 244, 0.85);
  letter-spacing: 0.02em;
}

.source-text:empty {
  display: none;
}

.accent-line {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: var(--accent);
  border-radius: 0 0 20px 20px;
  box-shadow: 0 -2px 16px var(--accent);
}

@media (prefers-reduced-motion: reduce) {
  .tombstone-container {
    transition: none;
  }
}
`;

class GlassmorphismTombstone extends HTMLElement {
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
    container.className = "tombstone-container";

    const glass = document.createElement("div");
    glass.className = "tombstone-glass";

    const headerBar = document.createElement("div");
    headerBar.className = "header-bar";

    const headerIcon = document.createElement("div");
    headerIcon.className = "header-icon";

    const headerText = document.createElement("div");
    headerText.className = "header-text";

    headerBar.append(headerIcon, headerText);

    const factContent = document.createElement("div");
    factContent.className = "fact-content";

    const sourceText = document.createElement("div");
    sourceText.className = "source-text";

    const accentLine = document.createElement("div");
    accentLine.className = "accent-line";

    glass.append(headerBar, factContent, sourceText, accentLine);
    container.append(glass);
    root.append(style, container);

    this._elements = { container, headerText, factContent, sourceText };
  }

  connectedCallback() {
    this._elements.container.style.opacity = "0";
    this._elements.container.style.transform = "translate3d(-50%, 28px, 0)";
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
        document.fonts.load("600 42px Inter"),
        document.fonts.load("800 24px Inter"),
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
    const { header, fact, source, accentColor } = this._state;
    const { headerText, factContent, sourceText } = this._elements;

    headerText.textContent = header || "";
    factContent.textContent = fact || "";
    sourceText.textContent = source ? `— ${source}` : "";

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
    const from = visible
      ? { opacity: 0, transform: "translate3d(-50%, 28px, 0)" }
      : { opacity: 1, transform: "translate3d(-50%, 0, 0)" };
    const to = visible
      ? { opacity: 1, transform: "translate3d(-50%, 0, 0)" }
      : { opacity: 0, transform: "translate3d(-50%, 28px, 0)" };

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
      duration: 420,
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

export default GlassmorphismTombstone;
