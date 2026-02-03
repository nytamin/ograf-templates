/**
 * Material Design Billboard Module
 * Renders sponsor/presenter content with Material Design principles including shadow elevation and typography hierarchy.
 * Features configurable headline, subheadline, and sponsor information.
 */

const DEFAULT_STATE = {
  headline: "Championship Finals",
  subheadline: "Live Coverage Starts Soon",
  sponsor: "Presented by TechCorp",
  showSponsor: true,
  primaryColor: "#1976d2",
  accentColor: "#ffa726",
  scrimOpacity: 0.85,
};

const STYLE_TEXT = `
:host {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  font-family: "Roboto", sans-serif;
  --primary: #1976d2;
  --accent: #ffa726;
  --scrim: 0.85;
}

* {
  box-sizing: border-box;
}

.billboard-container {
  position: absolute;
  inset: 0;
  opacity: 0;
  will-change: opacity;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--primary) 0%, rgba(0, 0, 0, 0.9) 100%);
  opacity: var(--scrim);
}

.content-wrapper {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 48px;
  transform: scale(0.9);
  will-change: transform;
}

.hero-card {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 24px;
  padding: 64px 80px;
  max-width: min(80vw, 1400px);
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.3),
    0 12px 24px rgba(0, 0, 0, 0.22);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.accent-bar {
  width: 120px;
  height: 8px;
  background: var(--accent);
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.headline {
  font-size: 96px;
  font-weight: 900;
  color: var(--primary);
  text-align: center;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.subheadline {
  font-size: 48px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.7);
  text-align: center;
  line-height: 1.3;
}

.sponsor-chip {
  background: var(--accent);
  border-radius: 32px;
  padding: 20px 48px;
  font-size: 32px;
  font-weight: 700;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.24),
    0 4px 8px rgba(0, 0, 0, 0.18);
}

.sponsor-chip[hidden] {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .billboard-container,
  .content-wrapper {
    transition: none;
  }
}
`;

class MaterialDesignBillboard extends HTMLElement {
  constructor() {
    super();
    this._state = { ...DEFAULT_STATE };
    this._currentStep = undefined;
    this._isVisible = false;
    this._backgroundAnimation = null;
    this._contentAnimation = null;

    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE_TEXT;

    const container = document.createElement("div");
    container.className = "billboard-container";

    const scrim = document.createElement("div");
    scrim.className = "scrim";

    const contentWrapper = document.createElement("div");
    contentWrapper.className = "content-wrapper";

    const heroCard = document.createElement("div");
    heroCard.className = "hero-card";

    const accentBar = document.createElement("div");
    accentBar.className = "accent-bar";

    const headline = document.createElement("div");
    headline.className = "headline";

    const subheadline = document.createElement("div");
    subheadline.className = "subheadline";

    heroCard.append(accentBar, headline, subheadline);

    const sponsorChip = document.createElement("div");
    sponsorChip.className = "sponsor-chip";

    contentWrapper.append(heroCard, sponsorChip);
    container.append(scrim, contentWrapper);
    root.append(style, container);

    this._elements = {
      container,
      scrim,
      contentWrapper,
      heroCard,
      headline,
      subheadline,
      sponsorChip,
    };
  }

  connectedCallback() {
    this._elements.container.style.opacity = "0";
    this._elements.contentWrapper.style.transform = "scale(0.9)";
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
        document.fonts.load("900 96px Roboto"),
        document.fonts.load("400 48px Roboto"),
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
      headline,
      subheadline,
      sponsor,
      showSponsor,
      primaryColor,
      accentColor,
      scrimOpacity,
    } = this._state;

    const { headline: headlineEl, subheadline: subheadlineEl, sponsorChip, scrim } = this._elements;

    headlineEl.textContent = headline || "";
    subheadlineEl.textContent = subheadline || "";
    sponsorChip.textContent = sponsor || "";
    sponsorChip.hidden = !showSponsor;

    if (primaryColor) {
      this.style.setProperty("--primary", primaryColor);
      scrim.style.background = `linear-gradient(135deg, ${primaryColor} 0%, rgba(0, 0, 0, 0.9) 100%)`;
    }

    if (accentColor) {
      this.style.setProperty("--accent", accentColor);
    }

    if (typeof scrimOpacity === "number") {
      this.style.setProperty("--scrim", String(scrimOpacity));
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
    const contentWrapper = this._elements.contentWrapper;

    if (this._backgroundAnimation) {
      this._backgroundAnimation.cancel();
      this._backgroundAnimation = null;
    }
    if (this._contentAnimation) {
      this._contentAnimation.cancel();
      this._contentAnimation = null;
    }

    if (skipAnimation) {
      container.style.opacity = visible ? "1" : "0";
      contentWrapper.style.transform = visible ? "scale(1)" : "scale(0.9)";
      return Promise.resolve();
    }

    const bgAnimation = container.animate(
      [
        { opacity: visible ? 0 : 1 },
        { opacity: visible ? 1 : 0 },
      ],
      {
        duration: 400,
        easing: "cubic-bezier(0.4, 0.0, 0.2, 1)",
        fill: "forwards",
      }
    );

    const contentAnimation = contentWrapper.animate(
      [
        { transform: visible ? "scale(0.9)" : "scale(1)", opacity: visible ? 0 : 1 },
        { transform: visible ? "scale(1)" : "scale(0.9)", opacity: visible ? 1 : 0 },
      ],
      {
        duration: 500,
        delay: visible ? 100 : 0,
        easing: "cubic-bezier(0.4, 0.0, 0.2, 1)",
        fill: "forwards",
      }
    );

    this._backgroundAnimation = bgAnimation;
    this._contentAnimation = contentAnimation;

    return Promise.all([bgAnimation.finished, contentAnimation.finished])
      .catch(() => undefined)
      .finally(() => {
        container.style.opacity = visible ? "1" : "0";
        contentWrapper.style.transform = visible ? "scale(1)" : "scale(0.9)";
        if (this._backgroundAnimation === bgAnimation) {
          this._backgroundAnimation = null;
        }
        if (this._contentAnimation === contentAnimation) {
          this._contentAnimation = null;
        }
      });
  }
}

export default MaterialDesignBillboard;
