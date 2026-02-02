const DEFAULT_STATE = {
  title: "Did You Know?",
  fact: "Material Design was introduced by Google in 2014",
  category: "Technology",
  showCategory: true,
  primaryColor: "#1976d2",
  surfaceColor: "#ffffff",
};

const STYLE_TEXT = `
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

:host {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  font-family: "Roboto", sans-serif;
  --primary: #1976d2;
  --surface: #ffffff;
}

* {
  box-sizing: border-box;
}

.tombstone-container {
  position: absolute;
  bottom: calc(max(3vh, 36px) + env(safe-area-inset-bottom));
  left: 50%;
  transform: translate(-50%, 0);
  opacity: 0;
  will-change: transform, opacity;
  max-width: min(85vw, 1000px);
}

.tombstone-card {
  background: var(--surface);
  border-radius: 12px;
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.24),
    0 4px 8px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tombstone-header {
  background: var(--primary);
  padding: 18px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 3px solid rgba(0, 0, 0, 0.12);
}

.tombstone-title {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.02em;
}

.category-chip {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 16px;
  font-size: 18px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.category-chip[hidden] {
  display: none;
}

.tombstone-content {
  padding: 28px 32px;
  background: var(--surface);
}

.fact-text {
  font-size: 30px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.87);
  line-height: 1.4;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .tombstone-container {
    transition: none;
  }
}
`;

class MaterialDesignTombstone extends HTMLElement {
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

    const card = document.createElement("div");
    card.className = "tombstone-card";

    const header = document.createElement("div");
    header.className = "tombstone-header";

    const title = document.createElement("div");
    title.className = "tombstone-title";

    const categoryChip = document.createElement("div");
    categoryChip.className = "category-chip";

    header.append(title, categoryChip);

    const content = document.createElement("div");
    content.className = "tombstone-content";

    const factText = document.createElement("div");
    factText.className = "fact-text";

    content.append(factText);
    card.append(header, content);
    container.append(card);
    root.append(style, container);

    this._elements = {
      container,
      card,
      title,
      categoryChip,
      factText,
    };
  }

  connectedCallback() {
    this._elements.container.style.opacity = "0";
    this._elements.container.style.transform = "translate(-50%, 100%)";
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
        document.fonts.load("700 28px Roboto"),
        document.fonts.load("400 30px Roboto"),
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
    const { title, fact, category, showCategory, primaryColor, surfaceColor } = this._state;
    const { title: titleEl, categoryChip, factText, card } = this._elements;

    titleEl.textContent = title || "";
    factText.textContent = fact || "";
    categoryChip.textContent = category || "";
    categoryChip.hidden = !showCategory;

    if (primaryColor) {
      this.style.setProperty("--primary", primaryColor);
    }

    if (surfaceColor) {
      this.style.setProperty("--surface", surfaceColor);
      card.style.background = surfaceColor;
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
      ? { opacity: 0, transform: "translate(-50%, 100%)" }
      : { opacity: 1, transform: "translate(-50%, 0)" };
    const to = visible
      ? { opacity: 1, transform: "translate(-50%, 0)" }
      : { opacity: 0, transform: "translate(-50%, 100%)" };

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
      duration: 320,
      easing: "cubic-bezier(0.4, 0.0, 0.2, 1)",
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

export default MaterialDesignTombstone;
