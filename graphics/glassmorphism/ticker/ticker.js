/**
 * Glassmorphism Ticker Module
 * Scrolling headline ticker with frosted glass aesthetic and smooth continuous animation.
 * Displays rotating headlines with customizable speed and cycling.
 */

const DEFAULT_STATE = {
  headlines: [
    "Breaking: Major technology announcement expected today",
    "Markets close higher for third consecutive day",
    "Weather alert: Storm system moving through region",
  ],
  category: "Breaking News",
  accentColor: "#ff6b6b",
  scrollSpeed: 60,
};

const STYLE_TEXT = `
:host {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  font-family: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color: rgba(245, 248, 255, 0.95);
  --accent: #ff6b6b;
}

* {
  box-sizing: border-box;
}

.ticker-container {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(max(2vh, 24px) + env(safe-area-inset-bottom));
  transform: translate3d(0, 100%, 0);
  opacity: 0;
  will-change: transform, opacity;
}

.ticker-glass {
  position: relative;
  height: 68px;
  background: linear-gradient(135deg, rgba(16, 24, 36, 0.75), rgba(22, 30, 48, 0.45));
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow:
    0 12px 40px rgba(10, 16, 24, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(16px) saturate(130%);
  overflow: hidden;
  display: flex;
  align-items: center;
}

.category-label {
  position: absolute;
  left: max(4vw, 48px);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  background: var(--accent);
  border-radius: 8px;
  font-size: 22px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.98);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  z-index: 2;
}

.category-icon {
  width: 8px;
  height: 8px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}

.scroll-content {
  display: flex;
  align-items: center;
  white-space: nowrap;
  padding-left: 100%;
  will-change: transform;
}

.headline {
  font-size: 28px;
  font-weight: 500;
  padding: 0 48px;
  position: relative;
}

.headline:not(:last-child)::after {
  content: "•";
  position: absolute;
  right: 16px;
  color: var(--accent);
  font-size: 32px;
}

@media (prefers-reduced-motion: reduce) {
  .category-icon {
    animation: none;
  }
}
`;

class GlassmorphismTicker extends HTMLElement {
  constructor() {
    super();
    this._state = { ...DEFAULT_STATE };
    this._currentStep = undefined;
    this._isVisible = false;
    this._animation = null;
    this._scrollAnimation = null;

    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE_TEXT;

    const container = document.createElement("div");
    container.className = "ticker-container";

    const glass = document.createElement("div");
    glass.className = "ticker-glass";

    const label = document.createElement("div");
    label.className = "category-label";

    const icon = document.createElement("div");
    icon.className = "category-icon";

    const labelText = document.createElement("span");

    label.append(icon, labelText);

    const scrollContent = document.createElement("div");
    scrollContent.className = "scroll-content";

    glass.append(label, scrollContent);
    container.append(glass);
    root.append(style, container);

    this._elements = { container, label: labelText, scrollContent };
  }

  connectedCallback() {
    this._elements.container.style.opacity = "0";
    this._elements.container.style.transform = "translate3d(0, 100%, 0)";
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
      await document.fonts.load("700 24px Inter").catch(() => undefined);
    }

    return { statusCode: 200 };
  }

  async dispose() {
    if (this._scrollAnimation) {
      this._scrollAnimation.cancel();
      this._scrollAnimation = null;
    }
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
      this._startScrolling();
    }

    return {
      statusCode: 200,
      currentStep: this._currentStep,
    };
  }

  async stopAction(params) {
    const skipAnimation = params?.skipAnimation === true;
    this._stopScrolling();
    await this._animateTo(false, skipAnimation);
    this._currentStep = undefined;
    return { statusCode: 200 };
  }

  async updateAction(params) {
    this._state = { ...this._state, ...(params?.data || {}) };
    this._applyState();
    if (this._isVisible) {
      this._stopScrolling();
      this._startScrolling();
    }
    return { statusCode: 200 };
  }

  async customAction() {
    return { statusCode: 200 };
  }

  _applyState() {
    const { headlines, category, accentColor } = this._state;
    const { label, scrollContent } = this._elements;

    label.textContent = category || "";

    if (accentColor) {
      this.style.setProperty("--accent", accentColor);
    }

    scrollContent.innerHTML = "";
    const validHeadlines = Array.isArray(headlines) ? headlines : [];
    const displayHeadlines = validHeadlines.length > 0 ? validHeadlines : ["No headlines available"];

    displayHeadlines.forEach((headline) => {
      const div = document.createElement("div");
      div.className = "headline";
      div.textContent = headline;
      scrollContent.appendChild(div);
    });
  }

  _startScrolling() {
    const scrollContent = this._elements.scrollContent;
    const speed = this._state.scrollSpeed || 60;
    const contentWidth = scrollContent.scrollWidth;
    const duration = (contentWidth / speed) * 1000;

    const scroll = () => {
      if (this._scrollAnimation) {
        this._scrollAnimation.cancel();
      }

      this._scrollAnimation = scrollContent.animate(
        [
          { transform: "translate3d(0, 0, 0)" },
          { transform: `translate3d(-${contentWidth}px, 0, 0)` },
        ],
        {
          duration: duration,
          easing: "linear",
          iterations: Infinity,
        }
      );
    };

    requestAnimationFrame(scroll);
  }

  _stopScrolling() {
    if (this._scrollAnimation) {
      this._scrollAnimation.cancel();
      this._scrollAnimation = null;
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
      ? { opacity: 0, transform: "translate3d(0, 100%, 0)" }
      : { opacity: 1, transform: "translate3d(0, 0, 0)" };
    const to = visible
      ? { opacity: 1, transform: "translate3d(0, 0, 0)" }
      : { opacity: 0, transform: "translate3d(0, 100%, 0)" };

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
      duration: 380,
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

export default GlassmorphismTicker;
