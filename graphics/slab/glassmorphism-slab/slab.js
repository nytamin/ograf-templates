const DEFAULT_STATE = {
  title: "Starting Lineup",
  subtitle: "",
  items: [
    { label: "1", value: "John Smith" },
    { label: "2", value: "Sarah Johnson" },
    { label: "3", value: "Mike Davis" },
    { label: "4", value: "Emily Wilson" },
    { label: "5", value: "Chris Brown" },
  ],
  position: "right",
  accentColor: "#9b59b6",
};

const STYLE_TEXT = `
:host {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  font-family: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color: rgba(245, 248, 255, 0.95);
  --accent: #9b59b6;
}

* {
  box-sizing: border-box;
}

.slab-container {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 35vw;
  min-width: 480px;
  max-width: 680px;
  opacity: 0;
  will-change: transform, opacity;
}

.slab-container[data-position="left"] {
  left: 0;
  transform: translate3d(-100%, 0, 0);
}

.slab-container[data-position="right"] {
  right: 0;
  transform: translate3d(100%, 0, 0);
}

.slab-glass {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, rgba(16, 24, 36, 0.78), rgba(22, 30, 48, 0.42));
  box-shadow:
    0 0 80px rgba(10, 16, 24, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(20px) saturate(140%);
  padding: max(6vh, 64px) max(3vw, 48px);
}

.slab-container[data-position="right"] .slab-glass {
  border-left: 1px solid rgba(255, 255, 255, 0.18);
}

.slab-container[data-position="left"] .slab-glass {
  border-right: 1px solid rgba(255, 255, 255, 0.18);
}

.header {
  margin-bottom: 40px;
  padding-bottom: 24px;
  border-bottom: 3px solid var(--accent);
}

.title {
  font-size: clamp(48px, 4vw, 64px);
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1.1;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  margin-bottom: 8px;
}

.subtitle {
  font-size: clamp(26px, 2vw, 32px);
  font-weight: 500;
  color: rgba(220, 230, 244, 0.9);
  letter-spacing: 0.03em;
}

.subtitle:empty {
  display: none;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  padding-right: 12px;
}

.items-list::-webkit-scrollbar {
  width: 6px;
}

.items-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.items-list::-webkit-scrollbar-thumb {
  background: var(--accent);
  border-radius: 3px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 18px 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.item-label {
  font-size: 32px;
  font-weight: 700;
  color: var(--accent);
  min-width: 60px;
  text-align: center;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.item-value {
  font-size: 30px;
  font-weight: 600;
  letter-spacing: 0.01em;
  flex: 1;
}

@media (prefers-reduced-motion: reduce) {
  .slab-container {
    transition: none;
  }
}
`;

class GlassmorphismSlab extends HTMLElement {
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

    const glass = document.createElement("div");
    glass.className = "slab-glass";

    const header = document.createElement("div");
    header.className = "header";

    const title = document.createElement("div");
    title.className = "title";

    const subtitle = document.createElement("div");
    subtitle.className = "subtitle";

    header.append(title, subtitle);

    const itemsList = document.createElement("div");
    itemsList.className = "items-list";

    glass.append(header, itemsList);
    container.append(glass);
    root.append(style, container);

    this._elements = { container, title, subtitle, itemsList };
  }

  connectedCallback() {
    const position = this._state.position === "left" ? "left" : "right";
    this._elements.container.setAttribute("data-position", position);
    this._elements.container.style.opacity = "0";
    const transform = position === "left" ? "translate3d(-100%, 0, 0)" : "translate3d(100%, 0, 0)";
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
        document.fonts.load("800 64px Inter"),
        document.fonts.load("600 30px Inter"),
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
    const { title, subtitle, items, position, accentColor } = this._state;
    const { title: titleEl, subtitle: subtitleEl, itemsList, container } = this._elements;

    titleEl.textContent = title || "";
    subtitleEl.textContent = subtitle || "";

    const pos = position === "left" ? "left" : "right";
    container.setAttribute("data-position", pos);

    if (accentColor) {
      this.style.setProperty("--accent", accentColor);
    }

    itemsList.innerHTML = "";
    const validItems = Array.isArray(items) ? items : [];

    validItems.forEach((item) => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "list-item";

      const labelDiv = document.createElement("div");
      labelDiv.className = "item-label";
      labelDiv.textContent = item.label || "";

      const valueDiv = document.createElement("div");
      valueDiv.className = "item-value";
      valueDiv.textContent = item.value || "";

      itemDiv.append(labelDiv, valueDiv);
      itemsList.appendChild(itemDiv);
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
    const position = this._state.position === "left" ? "left" : "right";
    const hideTransform = position === "left" ? "translate3d(-100%, 0, 0)" : "translate3d(100%, 0, 0)";

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
      duration: 460,
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

export default GlassmorphismSlab;
