class TasmotaPulseTimeCard extends HTMLElement {
  _config;
  _hass;
  _elements = {};

  __defaultValues={
      entity: "",
      header: "",
      switchNo: 1,
      turnOffAfter: 10,
      mqttTopic: "tasmotaindoortest01",
      title:"",
  };

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateHass();
  }

  _render() {
    try {
      this._checkConfig();
    } catch (e) {
      this.shadowRoot.innerHTML = `<ha-card><div class="card-content" style="color:red;">${e.message}</div></ha-card>`;
      return;
    }
    this._buildCard();
    this._applyStyle();
    this._attachElements();
    this._queryElements();
    this._addListeners();
    this._updateConfig();
    this._updateHass();
  }

  _checkConfig() {
    if (!this._config.entity) {
      throw new Error("Please define an entity!");
    }
  }

  _secondsToHHMMSS(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  _HHMMSSToSeconds(hhmmss) {
    const parts = hhmmss.split(":");
    if (parts.length !== 3) return 0;
    const [h, m, s] = parts.map(Number);
    return h * 3600 + m * 60 + s;
  }

  _buildCard() {
    const title = this._config.title || this.__defaultValues.title;
    const header = this._config.header || this.__defaultValues.header;
    const name = this._hass?.states?.[this._config.entity]?.attributes?.friendly_name || this._config.entityName || this._config.entity;
    const turnOffAfterSeconds = this._config.turnOffAfter || 10;
    const timeValue = this._secondsToHHMMSS(turnOffAfterSeconds);

    this._elements.card = document.createElement("ha-card");
    this._elements.card.innerHTML = `
      <div class="card-container">
        <div class="card-title">${title}</div>
        <p class="error-message hidden"></p>
        <div class="switch-row">
          <ha-state-icon class="state-icon"></ha-state-icon>
          <span class="state-label">${name}</span>
          <ha-switch class="toggle-switch"></ha-switch>
        </div>
        <div class="input-row">
          <label for="run-time-input">Run Time (HH:MM:SS, max 18:12:15):</label>
          <input 
            type="time" 
            id="run-time-input" 
            class="run-time-input" 
            step="1"
            max="18:12:15"
            value="${timeValue}"
            pattern="^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$"
          >
        </div>
        <div class="button-row">
          <mwc-button class="run-button" raised label="Run"></mwc-button>
        </div>
      </div>
    `;
  }

  _applyStyle() {
    if (!this._elements.style) {
      this._elements.style = document.createElement("style");
      this.shadowRoot.appendChild(this._elements.style);
    }
    this._elements.style.textContent = `
      .card-container {
        padding: 16px;
        font-family: sans-serif;
      }
      .card-header {
        font-weight: bold;
        font-size: 20px;
        margin-bottom: 12px;
      }
      .card-title {
        font-weight: bold;
        font-size: 15px;
        margin-bottom: 15px;
      }
      .error-message {
        color: var(--error-color);
        font-weight: bold;
        margin-bottom: 10px;
      }
      .hidden {
        display: none;
      }
      .switch-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        padding: 8px;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        background: var(--card-background-color);
      }
      .state-icon {
        --mdc-icon-size: 32px;
        color: var(--state-icon-color);
      }
      .state-label {
        font-size: 16px;
        font-weight: 500;
        flex-grow: 1;
        padding-left: 10px;
      }
      .toggle-switch {
        margin-left: auto;
      }
      .input-row {
        margin-bottom: 16px;
      }
      label {
        display: block;
        font-weight: 600;
        margin-bottom: 4px;
      }
      input.run-time-input {
        width: 100%;
        padding: 8px;
        font-size: 14px;
        box-sizing: border-box;
      }
      .button-row {
        text-align: right;
      }
        input[type="time"]::-webkit-datetime-edit-ampm-field {
    display: none;
  }
    `;
  }

  _attachElements() {
    this.shadowRoot.innerHTML = "";
    this.shadowRoot.append(this._elements.style, this._elements.card);
  }

  _queryElements() {
    const card = this._elements.card;
    this._elements.errorMessage = card.querySelector(".error-message");
    this._elements.runTimeInput = card.querySelector("#run-time-input");
    this._elements.runButton = card.querySelector(".run-button");
    this._elements.toggleSwitch = card.querySelector(".toggle-switch");
    this._elements.stateIcon = card.querySelector(".state-icon");
  }

  _addListeners() {
    this._elements.runButton.addEventListener("click", () => this._onRunClicked());
    this._elements.runTimeInput.addEventListener("change", () => this._onRunTimeChanged());
    this._elements.toggleSwitch.addEventListener("change", () => this._onToggleChanged());
  }

  _updateConfig() {
    this._elements.card.setAttribute("header", this._config.header || this.__defaultValues.header);
  }

  _updateHass() {
    if (!this._elements.errorMessage) return;

    const stateObj = this._hass?.states?.[this._config.entity];
    if (!stateObj) {
      this._elements.errorMessage.textContent = `${this._config.entity} is unavailable.`;
      this._elements.errorMessage.classList.remove("hidden");
      return;
    }

    this._elements.errorMessage.classList.add("hidden");
    this._elements.stateIcon.stateObj = stateObj;
    this._elements.toggleSwitch.checked = stateObj.state === "on";

    if (!this._elements.runTimeInput.value) {
      this._elements.runTimeInput.value = this._secondsToHHMMSS(this._config.turnOffAfter || this.__defaultValues.turnOffAfter);
    }
  }

  _getTurnOffAfter() {
    const input = this._elements.runTimeInput?.value;
    if (!input) return this._config.turnOffAfter || 10;
    const seconds = this._HHMMSSToSeconds(input);
    const maxSeconds = 18 * 3600 + 12 * 60 + 15;
    return seconds > maxSeconds ? maxSeconds : seconds;
  }

  _getSwitchNo() {
    return this._config.switchNo || 1;
  }

  _getMqttTopic() {
    return this._config.mqttTopic || "";
  }

  _onToggleChanged() {
    const newState = this._elements.toggleSwitch.checked;
    this._hass.callService("switch", newState ? "turn_on" : "turn_off", {
      entity_id: this._config.entity,
    });
  }

  _onRunClicked() {
    const timer = this._getTurnOffAfter();
    const switchNo = this._getSwitchNo();
    const topic = this._getMqttTopic();

    if (!topic) {
      this._elements.errorMessage.textContent = "MQTT topic is missing!";
      this._elements.errorMessage.classList.remove("hidden");
      return;
    }

    this._elements.errorMessage.classList.add("hidden");

    this._hass.callService("script", "tasmota_dynamic_pulse", {
      relay_num: switchNo,
      duration: timer,
      mqtt_topic: topic,
    });
  }

  _onRunTimeChanged() {
    const input = this._elements.runTimeInput.value;
    const seconds = this._HHMMSSToSeconds(input);
    const maxSeconds = 18 * 3600 + 12 * 60 + 15;
    if (seconds > maxSeconds) {
      this._elements.errorMessage.textContent = "Max allowed time is 18:12:15 auto correcting";
      this._elements.errorMessage.classList.remove("hidden");
      this._elements.runTimeInput.value = this._secondsToHHMMSS(maxSeconds);
      this._config.turnOffAfter = maxSeconds;
    } else {
      this._elements.errorMessage.classList.add("hidden");
      this._config.turnOffAfter = seconds;
    }
  }

  static getConfigElement() {
    return document.createElement("tasmota-pulsetime-card-editor");
  }

  static getStubConfig() {
    return {
      entity: "",
      header: "",
      switchNo: 1,
      turnOffAfter: 10,
      mqttTopic: "tasmota_test01",
      entityName:"", 
      title:"",
    };
  }
}

customElements.define("tasmota-pulsetime-card", TasmotaPulseTimeCard);

class TasmotaPulseTimeCardEditor extends HTMLElement {
  _config;
  _formEl;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (!this._formEl) {
      this._formEl = document.createElement("ha-form");
      this.shadowRoot.appendChild(this._formEl);
    }
    if (this._config) {
      this._formEl.data = this._config;
    }

    this._formEl.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._config = ev.detail.value;
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: { config: this._config },
          bubbles: true,
          composed: true,
        })
      );
    });
  }

  setConfig(config) {
    this._config = config;
    if (this._formEl) {
      this._formEl.data = config;
    }
  }

  static getConfigSchema() {
    return [
      {
        name: "entity",
        selector: { entity: { domain: "switch" } },
      },
      {
        name: "header",
        selector: { text: {} },
      },
      {
        name: "switchNo",
        selector: {
          number: {
            min: 1,
            max: 4,
            mode: "box",
          },
        },
      },
      {
        name: "turnOffAfter",
        selector: {
          number: {
            min: 1,
            max: 999,
            mode: "box",
          },
        },
      },
      {
        name: "mqttTopic",
        selector: {
          text: {},
        },
      },
    ];
  }
}

customElements.define("tasmota-pulsetime-card-editor", TasmotaPulseTimeCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "tasmota-pulsetime-card",
  name: "Tasmota PulseTime Card",
  description: "Created by Arun R S for test",
});
