import PropTypes from 'prop-types';
import React from 'react';
import { intlShape } from 'react-intl';
import connectToStores from 'fluxible-addons-react/connectToStores';

import Icon from './Icon';
import FareZoneSelector from './FareZoneSelector';
import TransportModesSection from './customizesearch/TransportModesSection';
import WalkingOptionsSection from './customizesearch/WalkingOptionsSection';
import AccessibilityOptionSection from './customizesearch/AccessibilityOptionSection';
import { getDefaultSettings } from '../util/planParamUtil';
import TransferOptionsSection from './customizesearch/TransferOptionsSection';

class CustomizeSearch extends React.Component {
  static contextTypes = {
    intl: intlShape.isRequired,
    config: PropTypes.object.isRequired,
  };

  static propTypes = {
    onToggleClick: PropTypes.func.isRequired,
    customizedSettings: PropTypes.object.isRequired,
    mobile: PropTypes.bool,
  };

  static defaultProps = {
    mobile: false,
  };

  defaultSettings = getDefaultSettings(this.context.config);

  render() {
    const { config, intl } = this.context;
    const { onToggleClick, customizedSettings, mobile } = this.props;
    // Merge default and customized settings
    const currentSettings = { ...this.defaultSettings, ...customizedSettings };
    let ticketOptions = [];
    if (config.showTicketSelector && config.availableTickets) {
      Object.keys(config.availableTickets).forEach(key => {
        if (config.feedIds.indexOf(key) > -1) {
          ticketOptions = ticketOptions.concat(
            Object.keys(config.availableTickets[key]),
          );
        }
      });

      ticketOptions.sort((a, b) => {
        return a.split('').reverse() > b.split('').reverse() ? 1 : -1;
      });
    }
    const backIcon = mobile ? (
      <Icon className="close-icon" img="icon-icon_arrow-collapse--left" />
    ) : (
      <Icon className="close-icon" img="icon-icon_close" />
    );
    return (
      <div className="customize-search">
        <button
          title="Close window and save settings"
          aria-label="Close window and save settings"
          type="button"
          className="close-offcanvas"
          onClick={() => {
            // Move focus back to the button that opened settings window
            const openSettingsButton = document.querySelector(
              '.open-advanced-settings-window-button',
            );
            if (openSettingsButton) {
              openSettingsButton.focus();
            }
            onToggleClick();
          }}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        >
          {backIcon}
        </button>
        <div className="settings-option-container">
          <h1>
            {intl.formatMessage({
              id: 'settings',
              defaultMessage: 'Settings',
            })}
          </h1>
        </div>
        <div className="scrollable-content-wrapper momentum-scroll">
          <div className="settings-option-container">
            <WalkingOptionsSection
              walkSpeedOptions={config.defaultOptions.walkSpeed}
              currentSettings={currentSettings}
              defaultSettings={this.defaultSettings}
            />
          </div>
          <div className="settings-option-container">
            <TransportModesSection
              config={config}
              currentSettings={currentSettings}
            />
          </div>
          <div className="settings-option-container">
            <TransferOptionsSection
              defaultSettings={this.defaultSettings}
              currentSettings={currentSettings}
              walkBoardCostHigh={config.walkBoardCostHigh}
            />
          </div>
          <div className="settings-option-container">
            <AccessibilityOptionSection currentSettings={currentSettings} />
          </div>
          {config.showTicketSelector && (
            <FareZoneSelector
              options={ticketOptions}
              currentOption={currentSettings.ticketTypes}
            />
          )}
        </div>
      </div>
    );
  }
}

const withStore = connectToStores(
  CustomizeSearch,
  ['RoutingSettingsStore'],
  context => ({
    customizedSettings: context
      .getStore('RoutingSettingsStore')
      .getRoutingSettings(),
  }),
);

export { withStore as default, CustomizeSearch as component };
