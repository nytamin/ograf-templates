/**
 * Material Design Scorebug Module
 * Sports scoreboard with Material Design principles, elevation shadows, and responsive layout.
 * Displays team information, scores, clock, and period with clean typography.
 */

const DEFAULT_STATE = {
  homeTeam: { name: "HOME", abbreviation: "HOM", score: 0 },
  awayTeam: { name: "AWAY", abbreviation: "AWY", score: 0 },
  clock: "00:00",
  period: "1st",
  showClock: true,
  primaryColor: "#1976d2",
  accentColor: "#ffa726",
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
}

* {
  box-sizing: border-box;
}

.scorebug-container {
  position: absolute;
  top: calc(max(3vh, 36px) + env(safe-area-inset-top));
  left: max(4vw, 48px);
  opacity: 0;
  will-change: transform, opacity;
}

.scorebug-card {
  display: flex;
  align-items: stretch;
  border-radius: 8px;
  overflow: hidden;
  background: var(--primary);
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.24),
    0 4px 8px rgba(0, 0, 0, 0.18);
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
  background: var(--primary);
}

.team:first-child {
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.team-abbr {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 0.02em;
  min-width: 90px;
  color: #ffffff;
}

.team-score {
  font-size: 40px;
  font-weight: 900;
  color: var(--accent);
  margin-left: auto;
  min-width: 60px;
  text-align: right;
}

.clock-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 14px 24px;
  background: rgba(0, 0, 0, 0.15);
  gap: 4px;
  min-width: 120px;
  border-left: 3px solid var(--accent);
}

.clock-card[hidden] {
  display: none;
}

.clock-time {
  font-size: 32px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
  color: #ffffff;
}

.clock-period {
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.08em;
}

@media (prefers-reduced-motion: reduce) {
  .scorebug-container {
    transition: none;
  }
}
`;

class MaterialDesignScorebug extends HTMLElement {
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

    const card = document.createElement("div");
    card.className = "scorebug-card";

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

    const clockCard = document.createElement("div");
    clockCard.className = "clock-card";
    const clockTime = document.createElement("div");
    clockTime.className = "clock-time";
    const clockPeriod = document.createElement("div");
    clockPeriod.className = "clock-period";
    clockCard.append(clockTime, clockPeriod);

    card.append(teamsSection, clockCard);
    container.append(card);
    root.append(style, container);

    this._elements = {
      container,
      card,
      awayAbbr,
      awayScore,
      homeAbbr,
      homeScore,
      clockCard,
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
        document.fonts.load("900 40px 'Roboto'"),
        document.fonts.load("700 32px 'Roboto'"),
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
    const { homeTeam, awayTeam, clock, period, showClock, primaryColor, accentColor } = this._state;
    const {
      awayAbbr,
      awayScore,
      homeAbbr,
      homeScore,
      clockCard,
      clockTime,
      clockPeriod,
      card,
    } = this._elements;

    awayAbbr.textContent = (awayTeam?.abbreviation || awayTeam?.name || "AWY").toUpperCase();
    awayScore.textContent = String(awayTeam?.score ?? 0);

    homeAbbr.textContent = (homeTeam?.abbreviation || homeTeam?.name || "HOM").toUpperCase();
    homeScore.textContent = String(homeTeam?.score ?? 0);

    clockTime.textContent = clock || "00:00";
    clockPeriod.textContent = period || "";
    clockCard.hidden = !showClock;

    if (primaryColor) {
      this.style.setProperty("--primary", primaryColor);
      card.style.background = primaryColor;
    }

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

export default MaterialDesignScorebug;
