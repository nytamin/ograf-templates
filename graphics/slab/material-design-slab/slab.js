const DEFAULT_STATE = {
  title: "Top Stories",
  items: [
    { label: "Breaking News", value: "Market reaches new high" },
    { label: "Technology", value: "Innovation in AI" },
    { label: "Sports", value: "Championship results" },
  ],
  position: "left",
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

.slab-container {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  will-change: transform, opacity;
  width: 520px;
}

.slab-container[data-position="left"] {
  left: max(3vw, 36px);
  transform: translate3d(-100%, -50%, 0);
}

.slab-container[data-position="right"] {
  right: max(3vw, 36px);
  transform: translate3d(100%, -50%, 0);
}

.slab-card {
  background: var(--surface);
  border-radius: 16px;
  box-shadow:
    0 16px 32px rgba(0, 0, 0, 0.24),
    0 8px 16px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.slab-header {
  padding: 24px 28px;
  background: var(--primary);
}

.slab-title {
  font-size: 34px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.01em;
}

.slab-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item-card {
  padding: 20px 24px;
  background: var(--surface);
  border-radius: 8px;
  border-left: 4px solid var(--primary);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.12),
    0 1px 2px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-label {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.item-value {
  font-size: 26px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.87);
  line-height: 1.3;
}

@media (prefers-reduced-motion: reduce) {
  .slab-container {
    transition: none;
  }
}
`;

class MaterialDesignSlab extends HTMLElement {
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
    container.className = "slab-container";
    container.setAttribute("data-position", "left");

    const card = document.createElement("div");
    card.className = "slab-card";

    const header = document.createElement("div");
    header.className = "slab-header";

    const title = document.createElement("div");
    title.className = "slab-title";

    header.append(title);

    const content = document.createElement("div");
    content.className = "slab-content";

    card.append(header, content);
    container.append(card);
    root.append(style, container);

    this._elements = { container, title, content, card };
  }

  connectedCallback() {
    const position = this._state.position || "left";
    const translateX = position === "left" ? "-100%" : "100%";
    this._elements.container.style.opacity = "0";
    this._elements.container.style.transform = `translate3d(${translateX}, -50%, 0)`;
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
        document.fonts.load("700 34px Roboto"),
        document.fonts.load("400 26px Roboto"),
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
    const { title, items, position, primaryColor, surfaceColor } = this._state;
    const { title: titleEl, content, container, card } = this._elements;

    titleEl.textContent = title || "";

    const pos = position || "left";
    container.setAttribute("data-position", pos);

    if (primaryColor) {
      this.style.setProperty("--primary", primaryColor);
    }

    if (surfaceColor) {
      this.style.setProperty("--surface", surfaceColor);
      card.style.background = surfaceColor;
    }

    content.innerHTML = "";
    const validItems = Array.isArray(items) ? items : [];
    const displayItems = validItems.length > 0 ? validItems : [{ label: "No items", value: "" }];

    displayItems.forEach((item) => {
      const itemCard = document.createElement("div");
      itemCard.className = "item-card";

      const label = document.createElement("div");
      label.className = "item-label";
      label.textContent = item.label || "";

      itemCard.appendChild(label);

      if (item.value) {
        const value = document.createElement("div");
        value.className = "item-value";
        value.textContent = item.value;
        itemCard.appendChild(value);
      }

      content.appendChild(itemCard);
    });
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
    const position = this._state.position || "left";
    const translateX = position === "left" ? "-100%" : "100%";

    const from = visible
      ? { opacity: 0, transform: `translate3d(${translateX}, -50%, 0)` }
      : { opacity: 1, transform: "translate3d(0, -50%, 0)" };
    const to = visible
      ? { opacity: 1, transform: "translate3d(0, -50%, 0)" }
      : { opacity: 0, transform: `translate3d(${translateX}, -50%, 0)` };

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

export default MaterialDesignSlab;
