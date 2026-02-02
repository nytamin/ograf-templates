const DEFAULT_STATE = {
  homeTeam: { name: "HOME", abbreviation: "HOM", score: 0 },
  awayTeam: { name: "AWAY", abbreviation: "AWY", score: 0 },
  clock: "00:00",
  period: "1st",
  showClock: true,
  accentColor: "#4ecdc4",
};

const STYLE_TEXT = `
:host {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
  font-family: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color: rgba(245, 248, 255, 0.95);
  --accent: #4ecdc4;
}

* {
  box-sizing: border-box;
}

.scorebug-container {
  position: absolute;
  top: calc(max(3vh, 36px) + env(safe-area-inset-top));
  left: max(4vw, 48px);
  transform: translate3d(-100%, 0, 0);
  opacity: 0;
  will-change: transform, opacity;
}

.scorebug-glass {
  display: flex;
  align-items: stretch;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(16, 24, 36, 0.72), rgba(22, 30, 48, 0.38));
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow:
    0 16px 48px rgba(10, 16, 24, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(16px) saturate(135%);
  overflow: hidden;
}

.teams-section {
  display: flex;
  flex-direction: column;
}

.team {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  min-width: 240px;
}

.team:first-child {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.team-abbr {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 0.02em;
  min-width: 90px;
}

.team-score {
  font-size: 40px;
  font-weight: 800;
  color: var(--accent);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  margin-left: auto;
  min-width: 60px;
  text-align: right;
}

.clock-section {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 14px 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
  border-left: 2px solid var(--accent);
  gap: 4px;
  min-width: 120px;
}

.clock-section[hidden] {
  display: none;
}

.clock-time {
  font-size: 32px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
}

.clock-period {
  font-size: 20px;
  font-weight: 600;
  text-transform: uppercase;
  color: rgba(220, 230, 244, 0.85);
  letter-spacing: 0.08em;
}

@media (prefers-reduced-motion: reduce) {
  .scorebug-container {
    transition: none;
  }
}
`;

class GlassmorphismScorebug extends HTMLElement {
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
    container.className = "scorebug-container";

    const glass = document.createElement("div");
    glass.className = "scorebug-glass";

    const teamsSection = document.createElement("div");
    teamsSection.className = "teams-section";

    const awayTeam = document.createElement("div");
    awayTeam.className = "team";
    const awayAbbr = document.createElement("div");
    awayAbbr.className = "team-abbr";
    const awayScore = document.createElement("div");
    awayScore.className = "team-score";
    awayTeam.append(awayAbbr, awayScore);

    const homeTeam = document.createElement("div");
    homeTeam.className = "team";
    const homeAbbr = document.createElement("div");
    homeAbbr.className = "team-abbr";
    const homeScore = document.createElement("div");
    homeScore.className = "team-score";
    homeTeam.append(homeAbbr, homeScore);

    teamsSection.append(awayTeam, homeTeam);

    const clockSection = document.createElement("div");
    clockSection.className = "clock-section";
    const clockTime = document.createElement("div");
    clockTime.className = "clock-time";
    const clockPeriod = document.createElement("div");
    clockPeriod.className = "clock-period";
    clockSection.append(clockTime, clockPeriod);

    glass.append(teamsSection, clockSection);
    container.append(glass);
    root.append(style, container);

    this._elements = {
      container,
      awayAbbr,
      awayScore,
      homeAbbr,
      homeScore,
      clockSection,
      clockTime,
      clockPeriod,
    };
  }

  connectedCallback() {
    this._elements.container.style.opacity = "0";
    this._elements.container.style.transform = "translate3d(-100%, 0, 0)";
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
        document.fonts.load("800 40px Inter"),
        document.fonts.load("700 32px Inter"),
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
    const { homeTeam, awayTeam, clock, period, showClock, accentColor } = this._state;
    const {
      awayAbbr,
      awayScore,
      homeAbbr,
      homeScore,
      clockSection,
      clockTime,
      clockPeriod,
    } = this._elements;

    awayAbbr.textContent = (awayTeam?.abbreviation || awayTeam?.name || "AWY").toUpperCase();
    awayScore.textContent = String(awayTeam?.score ?? 0);

    homeAbbr.textContent = (homeTeam?.abbreviation || homeTeam?.name || "HOM").toUpperCase();
    homeScore.textContent = String(homeTeam?.score ?? 0);

    clockTime.textContent = clock || "00:00";
    clockPeriod.textContent = period || "";
    clockSection.hidden = !showClock;

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

export default GlassmorphismScorebug;
