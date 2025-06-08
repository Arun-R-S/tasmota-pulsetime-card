
## Installation

### HACS

TasmotaPulseTime is available in [HACS][hacs] (Home Assistant Community Store).

Use this link to directly go to the repository in HACS

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://github.com/Arun-R-S/tasmota-pulsetime-card)

_or_

1. Install HACS if you don't have it already
2. Open HACS in Home Assistant
3. Search for "Mushroom"
4. Click the download button. ⬇️

## Dependancies
1. To run this card seamlessly without issue you should include the below service and cusomt component to you home assistant
    - **tasmota_dynamic_pulse:** Actually this is a script which can be able to publich the specific switch PulseTime and Turn on it. You can find the repository and instruction [here](https://github.com/Arun-R-S/home-assistant-scripts).
     - **mycustomapi:** This is a custom component actually to get the current PulseTime Status of a switch from tasmota. You can find the repository and the instruction [here](https://github.com/Arun-R-S/mycustomapi).

⚠️**Note: Without these two dependancies this card won't work properly**⚠️

### Manual

1. Download `tasmota-pulsetime-card.js` file from the [latest release][release-url].
2. Put `tasmota-pulsetime-card.js` file into your `config/www` folder.
3. Add reference to `tasmota-pulsetime-card.js` in Dashboard. There's two way to do that:
    - **Using UI:** _Settings_ → _Dashboards_ → _More Options icon_ → _Resources_ → _Add Resource_ → Set _Url_ as `/local/tasmota-pulsetime-card.js` → Set _Resource type_ as `JavaScript Module`.
      **Note:** If you do not see the Resources menu, you will need to enable _Advanced Mode_ in your _User Profile_
    - **Using YAML:** Add following code to `lovelace` section.
        ```yaml
        resources:
            - url: /local/tasmota-pulsetime-card.js
              type: module
        ```

## Usage

All the TasmotaPulseTime cards can be configured using Dashboard UI editor.

1. In Dashboard UI, click 3 dots in top right corner.
2. Click _Edit Dashboard_.
3. Click Plus button to add a new card.
4. Find one of the _Custom: tasmota-pulsetime-card in the list.

## Demo
![tasmota-pulsetime-card-demo.gif](https://raw.githubusercontent.com/arun-r-s/tasmota-pulsetime-card/sit/tasmota-pulsetime-card-demo.gif)

### Theme customization

TasmotaPulseTime works without theme but you can add a theme for better experience by installing the [Mushroom Themes](https://github.com/piitaya/lovelace-mushroom-themes). If you want more information about themes, check out the official [Home Assistant documentation about themes][home-assitant-theme-docs].


## Credits

The design is inspired by [Arun’s work][Arun-R-S] on Behance and [Ui Lovelace Minimalist][ui-lovelace-minimalist].

<!-- Badges -->

[hacs-url]: https://github.com/hacs/integration
[hacs-badge]: https://img.shields.io/badge/hacs-default-orange.svg?style=flat-square

<!-- References -->

[home-assistant]: https://www.home-assistant.io/
[home-assitant-theme-docs]: https://www.home-assistant.io/integrations/frontend/#defining-themes
[hacs]: https://hacs.xyz
[ui-lovelace-minimalist]: https://ui-lovelace-minimalist.github.io/UI/
[button-card]: https://github.com/custom-cards/button-card
[Arun-R-S]: https://arunrs.com
[release-url]: https://github.com/Arun-R-S/tasmota-pulsetime-card/releases
