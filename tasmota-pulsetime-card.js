class TasmotaPulseTimeCard extends HTMLElement {
  _config;
  _hass;
  _elements = {};
  _pollTimer = null;
  _lastState = null;

  __defaultValues = {
    entity: "",
    entityName: "",
    header: "",
    switchNo: 1,
    turnOffAfter: 10,
    mqttTopic: "tasmotaindoortest01",
    mqttStatusTopic: "", // NEW!
    title: "",
    pollIntervalSeconds: 5,  // Added default poll interval
    nextPollCheck:null,
    iconOnColor: "green",
    iconOffColor: "red",
    iconDefaultColor: "",
  };

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    this._config = Object.assign({}, this.__defaultValues, config);
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateHass();
  }

  disconnectedCallback() {
    clearInterval(this._pollTimer);
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
  _getIconColor(entityID){
    console.log("Entity ID from config:", this._config.entity);
    const stateObj = this._hass?.states?.[this._config.entity];
    const entityState = stateObj?.state;
    console.log(stateObj);
    if(entityState =="on")
    {
      return this._config.iconOnColor;
    }
    else if(entityState == "off")
    {
      return this._config.iconOffColor;
    }
    return this._config.iconDefaultColor;
  }
  _buildCard() {
    const title = this._config.title || this.__defaultValues.title;
    const name =
      this._hass?.states?.[this._config.entity]?.attributes?.friendly_name || this._config.entityName ||
      this._config.entity;

    const turnOffAfterSeconds = this._config.turnOffAfter || 10;
    const timeValue = this._secondsToHHMMSS(turnOffAfterSeconds);
    const thisIconColor = this._getIconColor(this._config.entity);
    this._elements.card = document.createElement("ha-card");
    this._elements.card.innerHTML = `
      <div class="card-container">
        <div class="card-title">${title}</div>
        <p class="error-message hidden"></p>
        <div class="switch-row">
          <state-badge class="state-icon" color="${thisIconColor}"></state-badge>
          <span class="state-label">${name}</span>
          <ha-switch class="toggle-switch"></ha-switch>
        </div>
        <div class="row-container">
  <div class="input-row good-box">
    <label for="run-time-input" class="run-time-label">Run Time</label>
    <div class="dropdown-time-inputs">
  <select id="dropdown-hour" class="dropdown">
    ${[...Array(19).keys()].map(i => `<option value="${i}">${i.toString().padStart(2, '0')}</option>`).join("")}
  </select>
  <span>:</span>
  <select id="dropdown-minute" class="dropdown">
    ${[...Array(60).keys()].map(i => `<option value="${i}">${i.toString().padStart(2, '0')}</option>`).join("")}
  </select>
  <span>:</span>
  <select id="dropdown-second" class="dropdown">
    ${[...Array(60).keys()].map(i => `<option value="${i}">${i.toString().padStart(2, '0')}</option>`).join("")}
  </select>
</div>
  </div>
  
  <div class="mqtt-data-row">
  <label for="turnOffLabel" style="text-align: center;">Turn off in</label>
    <div id="mqtt-status-text">--:--:--</div>
  </div>
</div>
        
        <div class="progress-container" style="visibility:hidden;">
          <div class="progress-bar" id="progress-bar-percent" style="width: 0%">0%</div>
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
    .dropdown-time-inputs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-bottom: 10px;
}

.dropdown {
  padding: 4px;
  font-size: 14px;
  border-radius: 6px;
  border: 1px solid var(--divider-color);
}
      .row-container {
    display: flex;
    flex-wrap: wrap; /* 👈 enables wrapping */
    align-items: center;
    justify-content: space-between;
    gap: 0px; /* Optional spacing between the two divs */
  }
    /* When container is too narrow, center items */
@media (max-width: 400px) {
  .row-container {
    justify-content: center;
  }
}
    .good-box{
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    background: var(--card-background-color);
    padding: 5px;
    }
      .card-container { padding: 14px;font-family: Noto, Noto Sans, sans-serif ; }
      .card-title { font-weight: bold; font-size: 15px; margin-bottom: 5px; }
      .error-message { color: var(--error-color); font-weight: bold; margin-bottom: 10px; }
      .hidden { display: none; }
      .switch-row {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 12px; padding: 8px;
        // border: 1px solid var(--divider-color);
        border-radius: 8px;
        background: var(--card-background-color);
      }
      .state-icon { --mdc-icon-size: 32px; color: var(--state-icon-color); }
      .state-label { font-size: 16px; font-weight: 500; flex-grow: 1; padding-left: 10px; }
      .toggle-switch { margin-left: auto; }
      .input-row { display: flex;
        flex-direction: column;
        margin-bottom: 5px; }
      label { display: block; font-weight:600;}
      .run-time-label { text-align:center; }
      input.run-time-input { width: 100%; padding: 8px; font-size: 14px; border-radius:8px; font-family: Noto, Noto Sans, sans-serif ; box-sizing: border-box; border-color: transparent;}
      .button-row { text-align: right; }
      .mqtt-data-row { margin-top: 2px; padding: 6px; min-width:100px; font-size: 14px; border-radius: 5px; }
      #mqtt-status-text { margin:11px; margin-top: 1px;text-align: center;
    margin-bottom: 1px; }
      input[type="time"]::-webkit-datetime-edit-ampm-field { display: none; }
      .progress-container {
  width: 100%;
  background-color: var(--divider-color, #e0e0e0);
  border-radius: 12px;
  overflow: hidden;
  height: 14px;
  margin-bottom: 2px;
}

.progress-bar {
  height: 100%;
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.2) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.2) 75%,
    transparent 75%,
    transparent
  );
  background-color: #4caf50;
  background-size: 40px 40px;
  animation: moveStripes 1s linear infinite;
  text-align: center;
  line-height: 15px;
  color: white;
  font-weight: bold;
  transition: width 0.3s ease-in-out;
  will-change: width, background-position;
  border-radius: 12px;
}
  
@keyframes moveStripes {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 40px 0;
  }
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
    this._elements.mqttStatusText = card.querySelector("#mqtt-status-text");
    this._elements.progressBarPercent = card.querySelector("#progress-bar-percent");
    this._elements.progressBar = card.querySelector(".progress-bar");
    this._elements.progressContainer = card.querySelector(".progress-container");
    this._elements.dropdownHour = card.querySelector("#dropdown-hour");
    this._elements.dropdownMinute = card.querySelector("#dropdown-minute");
    this._elements.dropdownSecond = card.querySelector("#dropdown-second");
  }

  _addListeners() {
    this._elements.runButton.addEventListener("click", () => this._onRunClicked());
    this._elements.progressBarPercent.addEventListener("click", () => this._onProgressBarCheck());
    //this._elements.runTimeInput.addEventListener("change", () => this._onRunTimeChanged());
    this._elements.toggleSwitch.addEventListener("change", () => this._onToggleChanged());
    ["dropdownHour", "dropdownMinute", "dropdownSecond"].forEach(id => {
      this._elements[id].addEventListener("change", () => this._onRunTimeChanged());
    });
  }
  _onProgressBarCheck(){
    const entityId = this._config.entity;
  const state = this._hass.states[entityId]?.state;
const hiddenStates = ["off", "unavailable", "unknown"];
  //console.log(`[DEBUG] Entity "${entityId}" state =`, state);
  if (!state || hiddenStates.includes(state)) {
    this._elements.progressContainer.style.visibility = "hidden";
  }
  }
  _setProgress(percent) {
    if (!this._elements.progressBar || !this._elements.progressContainer) return;

    this._elements.progressContainer.style.visibility = "visible";
    this._elements.progressBar.style.width = `${percent}%`;
    this._elements.progressBar.textContent = `${percent}%`;

    if (percent >= 100) {
      setTimeout(() => {
        this._elements.progressContainer.style.visibility = "hidden";
      }, 1500);
    }
    /*else if (percent == 0) {
      setTimeout(() => {
        this._elements.progressContainer.style.visibility = "hidden";
      }, 1500);
    }*/
  }
  _updateConfig() {
    this._elements.card.setAttribute("header", this._config.header || this.__defaultValues.header);
  }

  async _updateHass() {
    if (!this._elements.errorMessage) return;

    const stateObj = this._hass?.states?.[this._config.entity];
    if (!stateObj) {
      this._elements.errorMessage.textContent = `${this._config.entity} is unavailable.`;
      this._elements.errorMessage.classList.remove("hidden");
      clearInterval(this._pollTimer);
      return;
    }

    this._elements.errorMessage.classList.add("hidden");
    if (this._elements.stateIcon && this._hass) {
      this._elements.stateIcon.hass = this._hass;
      this._elements.stateIcon.stateObj = stateObj;
    }
    this._elements.toggleSwitch.checked = stateObj.state === "on";

    // Start or stop polling based on entity state
    if (this._lastState !== stateObj.state) {
      this._lastState = stateObj.state;
      clearInterval(this._pollTimer);
      if (stateObj.state === "on") {
        this._startPolling();
      }
    }

    // if (!this._elements.runTimeInput.value) {
    //   this._elements.runTimeInput.value = this._secondsToHHMMSS(this._config.turnOffAfter || this.__defaultValues.turnOffAfter);
    // }
    const totalSec = this._config.turnOffAfter || this.__defaultValues.turnOffAfter;
    this._elements.dropdownHour.value = Math.floor(totalSec / 3600).toString();
    this._elements.dropdownMinute.value = Math.floor((totalSec % 3600) / 60).toString();
    this._elements.dropdownSecond.value = (totalSec % 60).toString();
  }

  _startPolling() {
    // Immediately fetch once
    this._fetchRemainingTime();

    // Then start interval polling with config.pollIntervalSeconds
    const interval = (this._config.pollIntervalSeconds || this.__defaultValues.pollIntervalSeconds) * 1000;
    this._pollTimer = setInterval(() => {
      this._fetchRemainingTime();
    }, interval);
  }

  async _fetchRemainingTime() {
    try {
      const ip = this._config.ip || ""; // add ip config or get from mqttTopic if you want
      const switchNo = this._config.switchNo || 1;

      // Construct your API URL here
      // Example: adjust this URL to match your real endpoint
      const url = `/customapi/tasmota?ip=${encodeURIComponent(ip)}&pulsetime=${encodeURIComponent(switchNo)}`;

      const response = await fetch(url);
      if (!response.ok)
        {
          console.log(await response.json());
          throw new Error(`API error: ${response.status}`);
        } 

      const data = await response.json();

      // Assuming your API returns { Remaining: <seconds> } or similar
      if (data?.data[`PulseTime${switchNo}`]?.Remaining != null) {
        var actualPulseTime = this._getFormattedPulseTime(data?.data[`PulseTime${switchNo}`]?.Set);
        var remainingPulseTime = this._getFormattedPulseTime(data?.data[`PulseTime${switchNo}`]?.Remaining);
        
        this._elements.mqttStatusText.textContent = `${this._secondsToHHMMSS(remainingPulseTime)}`;
        var yetToProgressPulseTime = (actualPulseTime-remainingPulseTime)/actualPulseTime;
        var remainingPercent = Math.floor(yetToProgressPulseTime * 100);
        this._setProgress(remainingPercent);
      } else {
        this._elements.mqttStatusText.textContent = "No Remaining time data";
      }
    } catch (err) {
      this._elements.mqttStatusText.textContent = `Error: ${err.message}`;
    }
  }
  _getFormattedPulseTime(time)
  {
    if (time > 100 && time <= 110) {
      time = 10;
    }
    else if (time > 100) {
      time -= 100;
    }
    else if (time < 100) {
      time = Math.floor(time / 10);
    }
    return time;
  }
  _getTurnOffAfter() {
    // const input = this._elements.runTimeInput?.value;
    // if (!input) return this._config.turnOffAfter || 10;
    // const seconds = this._HHMMSSToSeconds(input);
    // const maxSeconds = 18 * 3600 + 12 * 60 + 15;
    // return seconds > maxSeconds ? maxSeconds : seconds;
    const h = parseInt(this._elements.dropdownHour?.value || "0", 10);
    const m = parseInt(this._elements.dropdownMinute?.value || "0", 10);
    const s = parseInt(this._elements.dropdownSecond?.value || "0", 10);
    let seconds = h * 3600 + m * 60 + s;
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
    // const input = this._elements.runTimeInput.value;
    // const seconds = this._HHMMSSToSeconds(input);
    // const maxSeconds = 18 * 3600 + 12 * 60 + 15;
    // if (seconds > maxSeconds) {
    //   this._elements.errorMessage.textContent = "Max allowed time is 18:12:15 auto correcting";
    //   this._elements.errorMessage.classList.remove("hidden");
    //   this._elements.runTimeInput.value = this._secondsToHHMMSS(maxSeconds);
    //   this._config.turnOffAfter = maxSeconds;
    // } else {
    //   this._elements.errorMessage.classList.add("hidden");
    //   this._config.turnOffAfter = seconds;
    // }
    const seconds = this._getTurnOffAfter();
    const maxSeconds = 18 * 3600 + 12 * 60 + 15;
    if (seconds > maxSeconds) {
      this._elements.errorMessage.textContent = "Max allowed time is 18:12:15 auto correcting";
      this._elements.errorMessage.classList.remove("hidden");
      const maxH = 18, maxM = 12, maxS = 15;
      this._elements.dropdownHour.value = maxH.toString();
      this._elements.dropdownMinute.value = maxM.toString();
      this._elements.dropdownSecond.value = maxS.toString();
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
      type: "custom:tasmota-pulsetime-card",
      entity: "sun.sun",
      header: "",
      switchNo: 1,
      turnOffAfter: 10,
      mqttTopic: "tasmotaindoortest01",
      mqttStatusTopic: "",
      title: "",
      pollIntervalSeconds: 5,
      ip: "192.168.0.53", // Add IP here or in config
      iconOnColor: "",
      iconOffColor: "",
      iconDefaultColor: "",
    };
  }
}

customElements.define("tasmota-pulsetime-card", TasmotaPulseTimeCard);

class TasmotaPulseTimeCardEditor extends HTMLElement {
  _config;
  _formEl;
  _hass;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set hass(hass) {
    this._hass = hass;
    if (this._formEl) {
      this._formEl.hass = hass;
    }
  }

  connectedCallback() {
    if (!this._formEl) {
      this._formEl = document.createElement("ha-form");
      this._formEl.schema = TasmotaPulseTimeCardEditor.getConfigSchema();
      this._formEl.hass = this._hass;
      this._formEl.data = this._config || {};
      this.shadowRoot.appendChild(this._formEl);
    }

    this._formEl.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      const newConfig = ev.detail.value;

      // Validate turnOffAfter
      if (newConfig.turnOffAfter > 65536) {
        // Option 1: Show error and don't update the config
        alert("Value for 'Turn Off After' must be less than or equal to 65536.\n\nAuto defaulting the value to 65536 ........");
        ev.detail.value.turnOffAfter = 65536;

        // Option 2: Or auto-correct the value
        // newConfig.turnOffAfter = 65536;
      }
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
        selector: { entity: { domain: "" } },
      },
      {
        name: "entityName",
        selector: { text: {} },
      },
      {
        name: "header",
        selector: { text: {} },
      },
      {
        name: "title",
        selector: { text: {} },
      },
      {
        name: "switchNo",
        selector: {
          number: {
            min: 1,
            max: 100,
            mode: "box",
          },
        },
      },
      {
        name: "turnOffAfter",
        selector: {
          number: {
            min: 1,
            max: 65536,
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
      {
        name: "pollIntervalSeconds",
        selector: {
          number: {
            min: 1,
            max: 65536,
            mode: "box",
          },
        },
      },
      {
        name: "ip",
        selector: {
          text: {},
        },
      },
      {
        name: "iconOnColor",
        selector: {
          text: {},
        },
      },
      {
        name: "iconOffColor",
        selector: {
          text: {},
        },
      },
      {
        name: "iconDefaultColor",
        selector: {
          text: {},
        },
      },
    ];
  }
}

customElements.define("tasmota-pulsetime-card-editor", TasmotaPulseTimeCardEditor);


// Register the card so Home Assistant knows about it
window.customCards = window.customCards || [];
window.customCards.push({
  type: "tasmota-pulsetime-card",
  name: "Tasmota PulseTime Card",
  description: "Created by Arun R S for test",
});
