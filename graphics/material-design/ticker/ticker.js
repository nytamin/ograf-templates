/**
 * Material Design Ticker Module
 * Scrolling news ticker with Material Design styling and smooth animation cycles.
 * Displays multiple headlines with elevation shadows and responsive typography.
 */

const DEFAULT_STATE = {
  headlines: [
    "Breaking: Major technology announcement expected today",
    "Markets close higher for third consecutive day",
    "Weather alert: Storm system moving through region",
  ],
  category: "Breaking News",
  primaryColor: "#1976d2",
  accentColor: "#d32f2f",
  scrollSpeed: 60,
};

const STYLE_TEXT = `
:host {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  font-family: "Roboto", sans-serif;
  --primary: #1976d2;
  --accent: #d32f2f;
}

* {
  box-sizing: border-box;
}

.ticker-container {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(max(2vh, 24px) + env(safe-area-inset-bottom));
  opacity: 0;
  will-change: transform, opacity;
}

.ticker-surface {
  position: relative;
  height: 72px;
  background: var(--primary);
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.24),
    0 4px 8px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  display: flex;
  align-items: center;
}

.category-chip {
  position: absolute;
  left: max(4vw, 48px);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 24px;
  background: var(--accent);
  border-radius: 24px;
  font-size: 22px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #ffffff;
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.2),
    0 2px 4px rgba(0, 0, 0, 0.14);
  z-index: 2;
}

.category-icon {
  width: 8px;
  height: 8px;
  background: #ffffff;
  border-radius: 50%;
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
  color: #ffffff;
  position: relative;
}

.headline:not(:last-child)::after {
  content: "•";
  position: absolute;
  right: 16px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 32px;
}

@media (prefers-reduced-motion: reduce) {
  .ticker-container {
    transition: none;
  }
}
`;

class MaterialDesignTicker extends HTMLElement {
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

    const surface = document.createElement("div");
    surface.className = "ticker-surface";

    const chip = document.createElement("div");
    chip.className = "category-chip";

    const icon = document.createElement("div");
    icon.className = "category-icon";

    const chipText = document.createElement("span");

    chip.append(icon, chipText);

    const scrollContent = document.createElement("div");
    scrollContent.className = "scroll-content";

    surface.append(chip, scrollContent);
    container.append(surface);
    root.append(style, container);

    this._elements = { container, surface, chip: chipText, scrollContent };
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
      await document.fonts.load("700 24px 'Roboto'").catch(() => undefined);
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
    const { headlines, category, primaryColor, accentColor } = this._state;
    const { chip, scrollContent, surface } = this._elements;

    chip.textContent = category || "";

    if (primaryColor) {
      this.style.setProperty("--primary", primaryColor);
      surface.style.background = primaryColor;
    }

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

export default MaterialDesignTicker;
