const DEFAULT_STATE = {
  location: "London, UK",
  sublocation: "Westminster",
  status: "LIVE",
  showStatus: true,
  position: "top-left",
  primaryColor: "#1976d2",
  statusColor: "#d32f2f",
};

const STYLE_TEXT = `
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');

:host {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  font-family: "Roboto", sans-serif;
  --primary: #1976d2;
  --status: #d32f2f;
}

* {
  box-sizing: border-box;
}

.locator-container {
  position: absolute;
  opacity: 0;
  will-change: transform, opacity;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.locator-container[data-position="top-left"] {
  top: calc(max(3vh, 36px) + env(safe-area-inset-top));
  left: max(4vw, 48px);
}

.locator-container[data-position="top-right"] {
  top: calc(max(3vh, 36px) + env(safe-area-inset-top));
  right: max(4vw, 48px);
  flex-direction: row-reverse;
}

.locator-container[data-position="bottom-left"] {
  bottom: calc(max(3vh, 36px) + env(safe-area-inset-bottom));
  left: max(4vw, 48px);
}

.locator-container[data-position="bottom-right"] {
  bottom: calc(max(3vh, 36px) + env(safe-area-inset-bottom));
  right: max(4vw, 48px);
  flex-direction: row-reverse;
}

.status-fab {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  background: var(--status);
  border-radius: 28px;
  font-size: 22px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #ffffff;
  box-shadow:
    0 6px 12px rgba(0, 0, 0, 0.24),
    0 3px 6px rgba(0, 0, 0, 0.18);
  position: relative;
}

.status-fab[hidden] {
  display: none;
}

.status-pulse {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #ffffff;
  border-radius: 50%;
  left: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(1.5); }
}

.location-card {
  background: var(--primary);
  border-radius: 8px;
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.24),
    0 4px 8px rgba(0, 0, 0, 0.18);
  min-width: 280px;
}

.location-name {
  font-size: 32px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.01em;
}

.sublocation-name {
  font-size: 22px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.85);
}

.sublocation-name:empty {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .locator-container {
    transition: none;
  }
  .status-pulse {
    animation: none;
  }
}
`;

class MaterialDesignLocator extends HTMLElement {
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
    container.setAttribute("data-position", "top-left");

    const statusFab = document.createElement("div");
    statusFab.className = "status-fab";

    const statusPulse = document.createElement("div");
    statusPulse.className = "status-pulse";

    const statusText = document.createElement("span");
    statusText.style.marginLeft = "12px";

    statusFab.append(statusPulse, statusText);

    const locationCard = document.createElement("div");
    locationCard.className = "location-card";

    const locationName = document.createElement("div");
    locationName.className = "location-name";

    const sublocationName = document.createElement("div");
    sublocationName.className = "sublocation-name";

    locationCard.append(locationName, sublocationName);
    container.append(statusFab, locationCard);
    root.append(style, container);

    this._elements = {
      container,
      statusFab,
      statusText,
      locationCard,
      locationName,
      sublocationName,
    };
  }

  connectedCallback() {
    this._elements.container.style.opacity = "0";
    this._elements.container.style.transform = "scale(0.7)";
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
        document.fonts.load("900 22px Roboto"),
        document.fonts.load("700 32px Roboto"),
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
    const {
      location,
      sublocation,
      status,
      showStatus,
      position,
      primaryColor,
      statusColor,
    } = this._state;

    const {
      container,
      statusFab,
      statusText,
      locationName,
      sublocationName,
      locationCard,
    } = this._elements;

    locationName.textContent = location || "";
    sublocationName.textContent = sublocation || "";

    statusText.textContent = status || "LIVE";
    statusFab.hidden = !showStatus;

    const pos = position || "top-left";
    container.setAttribute("data-position", pos);

    if (primaryColor) {
      this.style.setProperty("--primary", primaryColor);
      locationCard.style.background = primaryColor;
    }

    if (statusColor) {
      this.style.setProperty("--status", statusColor);
      statusFab.style.background = statusColor;
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
      ? { opacity: 0, transform: "scale(0.7)" }
      : { opacity: 1, transform: "scale(1)" };
    const to = visible
      ? { opacity: 1, transform: "scale(1)" }
      : { opacity: 0, transform: "scale(0.7)" };

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
      duration: 280,
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

export default MaterialDesignLocator;
