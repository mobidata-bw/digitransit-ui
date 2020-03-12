import PropTypes from 'prop-types';
import React from 'react';
import { intlShape } from 'react-intl';
import cx from 'classnames';
import { matchShape, routerShape } from 'found';
import connectToStores from 'fluxible-addons-react/connectToStores';
import shouldUpdate from 'recompose/shouldUpdate';
import isEqual from 'lodash/isEqual';
import d from 'debug';

import {
  initGeolocation,
  checkPositioningPermission,
} from '../action/PositionActions';
import storeOrigin from '../action/originActions';
import ControlPanel from './ControlPanel';
import DTEndpointAutosuggest from './DTEndpointAutosuggest';
import DTAutosuggestPanel from './DTAutosuggestPanel';
import MapWithTracking from './map/MapWithTracking';
import PageFooter from './PageFooter';
import { isBrowser } from '../util/browser';
import searchContext from './searchContext';
import {
  parseLocation,
  isItinerarySearchObjects,
  navigateTo,
} from '../util/path';
import OverlayWithSpinner from './visual/OverlayWithSpinner';
import { dtLocationShape } from '../util/shapes';
import Icon from './Icon';
import SelectMapLayersDialog from './SelectMapLayersDialog';
import SelectStreetModeDialog from './SelectStreetModeDialog';
import events from '../util/events';
import * as ModeUtils from '../util/modeUtils';
import withBreakpoint from '../util/withBreakpoint';
import ComponentUsageExample from './ComponentUsageExample';
import { addAnalyticsEvent } from '../util/analyticsUtils';
import intializeSearchContext from './DTSearchContextInitializer';
import scrollTop from '../util/scroll';

const debug = d('IndexPage.js');

class IndexPage extends React.Component {
  static contextTypes = {
    config: PropTypes.object.isRequired,
    intl: intlShape.isRequired,
    executeAction: PropTypes.func.isRequired,
    getStore: PropTypes.func.isRequired,
  };

  static propTypes = {
    match: matchShape.isRequired,
    router: routerShape.isRequired,
    autoSetOrigin: PropTypes.bool,
    breakpoint: PropTypes.string.isRequired,
    origin: dtLocationShape.isRequired,
    destination: dtLocationShape.isRequired,
    showSpinner: PropTypes.bool.isRequired,
  };

  static defaultProps = {
    autoSetOrigin: true,
  };

  constructor(props, context) {
    super(props);
    this.state = {
      mapExpanded: false, // Show right-now as default
    };
    if (this.props.autoSetOrigin) {
      context.executeAction(storeOrigin, props.origin);
    }
  }

  componentDidMount() {
    intializeSearchContext(this.context, searchContext);
    events.on('popupOpened', this.onPopupOpen);
    scrollTop();
  }

  componentWillUnmount() {
    events.removeListener('popupOpened', this.onPopupOpen);
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps = nextProps => {
    this.handleLocationProps(nextProps);
  };

  onPopupOpen = () => {
    this.setState({ mapExpanded: true });
  };

  /* eslint-disable no-param-reassign */
  handleLocationProps = nextProps => {
    if (!isEqual(nextProps.origin, this.props.origin)) {
      this.context.executeAction(storeOrigin, nextProps.origin);
    }

    if (isItinerarySearchObjects(nextProps.origin, nextProps.destination)) {
      debug('Redirecting to itinerary summary page');
      navigateTo({
        origin: nextProps.origin,
        destination: nextProps.destination,
        context: '/',
        router: this.props.router,
        base: {},
      });
    }
  };

  renderStreetModeSelector = (config, router, match) => (
    <SelectStreetModeDialog
      selectedStreetMode={ModeUtils.getStreetMode(match.location, config)}
      selectStreetMode={(streetMode, isExclusive) => {
        addAnalyticsEvent({
          category: 'ItinerarySettings',
          action: 'SelectTravelingModeFromIndexPage',
          name: streetMode,
        });
        ModeUtils.setStreetMode(streetMode, config, router, match, isExclusive);
      }}
      streetModeConfigs={ModeUtils.getAvailableStreetModeConfigs(config)}
    />
  );

  renderMapLayerSelector = () => <SelectMapLayersDialog />;

  /* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
  render() {
    const { config, intl } = this.context;
    const { breakpoint, destination, origin, router, match } = this.props;
    const { mapExpanded } = this.state;

    // DT-3381 TODO: DTEndpointAutoSuggest currently does not search for stops or stations, as it should be. SearchUtils needs refactoring.
    return breakpoint === 'large' ? (
      <div
        className={`front-page flex-vertical ${origin &&
          origin.gps === true &&
          origin.ready === false &&
          origin.gpsError === false &&
          `blurred`} fullscreen bp-${breakpoint}`}
      >
        <div className="front-page-map-wrapper">
          <MapWithTracking
            breakpoint={breakpoint}
            showStops
            showScaleBar
            origin={origin}
            destination={destination}
            renderCustomButtons={() => (
              <React.Fragment>
                {this.renderStreetModeSelector(config, router, match)}
                {this.renderMapLayerSelector()}
              </React.Fragment>
            )}
          />
        </div>
        <ControlPanel className="control-panel-container-left">
          <DTAutosuggestPanel
            searchPanelText={intl.formatMessage({
              id: 'where',
              defaultMessage: 'Where to?',
            })}
            origin={origin}
            destination={destination}
            searchType="endpoint"
            originPlaceHolder="search-origin-index"
            destinationPlaceHolder="search-destination-index"
            searchContext={searchContext}
          />
          <div className="control-panel-separator-line" />
          <div className="stops-near-you-text">
            <span>
              {' '}
              {intl.formatMessage({
                id: 'stop-near-you-title',
                defaultMessage: 'Stops and lines near you',
              })}
            </span>
          </div>
          <div>
            <DTEndpointAutosuggest
              icon="mapMarker-via"
              id="searchfield-preferred"
              autoFocus={false}
              refPoint={origin}
              className="destination"
              searchType="search"
              placeholder="stop-near-you"
              value=""
              isFocused={this.isFocused}
              onLocationSelected={e => e.stopPropagation()}
              searchContext={searchContext}
            />
          </div>
        </ControlPanel>
        {(this.props.showSpinner && <OverlayWithSpinner />) || null}
        <div id="page-footer-container">
          <PageFooter
            content={(config.footer && config.footer.content) || []}
          />
        </div>
      </div>
    ) : (
      <div
        className={`front-page flex-vertical ${origin &&
          origin.gps === true &&
          origin.ready === false &&
          origin.gpsError === false &&
          `blurred`} fullscreen bp-${breakpoint}`}
      >
        <div
          className={cx('flex-grow', 'map-container', {
            expanded: mapExpanded,
          })}
        >
          <MapWithTracking
            breakpoint={breakpoint}
            showStops
            origin={origin}
            destination={destination}
            renderCustomButtons={() => (
              <React.Fragment>
                {this.renderStreetModeSelector(config, router, match)}
                {this.renderMapLayerSelector()}
              </React.Fragment>
            )}
          >
            {(this.props.showSpinner && <OverlayWithSpinner />) || null}
          </MapWithTracking>
        </div>
        <div style={{ position: 'relative' }}>
          <div
            className={cx('fullscreen-toggle', {
              expanded: mapExpanded,
            })}
            onClick={this.togglePanelExpanded}
          >
            {mapExpanded ? (
              <Icon img="icon-icon_minimize" className="cursor-pointer" />
            ) : (
              <Icon img="icon-icon_maximize" className="cursor-pointer" />
            )}
          </div>
        </div>
        <ControlPanel className="control-panel-container-bottom">
          <DTAutosuggestPanel
            searchPanelText={intl.formatMessage({
              id: 'where',
              defaultMessage: 'Where to?',
            })}
            origin={origin}
            destination={destination}
            searchType="all"
            originPlaceHolder="search-origin"
            destinationPlaceHolder="search-destination"
            searchContext={searchContext}
          />
          <div className="control-panel-separator-line" />
          <div className="stops-near-you-text">
            <span>
              {' '}
              {intl.formatMessage({
                id: 'stop-near-you-title',
                defaultMessage: 'Stops and lines near you',
              })}
            </span>
          </div>
          <div>
            <DTEndpointAutosuggest
              icon="mapMarker-via"
              id="searchfield-preferred-bottom"
              autoFocus={false}
              refPoint={origin}
              className="destination"
              searchType="search"
              placeholder="stop-near-you"
              value=""
              isFocused={this.isFocused}
              onLocationSelected={e => e.stopPropagation()}
              searchContext={searchContext}
            />
          </div>
        </ControlPanel>
      </div>
    );
  }
}

const Index = shouldUpdate(
  // update only when origin/destination/breakpoint or language changes
  (props, nextProps) =>
    !(
      isEqual(nextProps.origin, props.origin) &&
      isEqual(nextProps.destination, props.destination) &&
      isEqual(nextProps.breakpoint, props.breakpoint) &&
      isEqual(nextProps.lang, props.lang) &&
      isEqual(nextProps.locationState, props.locationState) &&
      isEqual(nextProps.showSpinner, props.showSpinner)
    ),
)(IndexPage);

const IndexPageWithBreakpoint = withBreakpoint(Index);

IndexPageWithBreakpoint.description = (
  <ComponentUsageExample isFullscreen>
    <IndexPageWithBreakpoint
      autoSetOrigin={false}
      destination={{
        ready: false,
        set: false,
      }}
      origin={{
        ready: false,
        set: false,
      }}
      routes={[]}
      showSpinner={false}
    />
  </ComponentUsageExample>
);

/* eslint-disable no-param-reassign */
const processLocation = (locationString, locationState, intl) => {
  let location;
  if (locationString) {
    location = parseLocation(locationString);

    if (location.gps === true) {
      if (
        locationState.lat &&
        locationState.lon &&
        locationState.address !== undefined // address = "" when reverse geocoding cannot return address
      ) {
        location.ready = true;
        location.lat = locationState.lat;
        location.lon = locationState.lon;
        location.address =
          locationState.address ||
          intl.formatMessage({
            id: 'own-position',
            defaultMessage: 'Own Location',
          });
      }
      const gpsError = locationState.locationingFailed === true;

      location.gpsError = gpsError;
    }
  } else {
    location = { set: false };
  }
  return location;
};

const IndexPageWithPosition = connectToStores(
  IndexPageWithBreakpoint,
  ['PositionStore'],
  (context, props) => {
    const locationState = context.getStore('PositionStore').getLocationState();

    const { from, to } = props.match.params;

    const newProps = {};

    newProps.locationState = locationState;
    newProps.origin = processLocation(from, locationState, context.intl);
    newProps.destination = processLocation(to, locationState, context.intl);

    newProps.showSpinner = locationState.isLocationingInProgress === true;

    if (
      isBrowser &&
      locationState.isLocationingInProgress !== true &&
      locationState.hasLocation === false &&
      (newProps.origin.gps === true || newProps.destination.gps === true)
    ) {
      checkPositioningPermission().then(status => {
        if (
          // check logic for starting geolocation
          status.state === 'granted' &&
          locationState.status === 'no-location'
        ) {
          debug('Auto Initialising geolocation');

          context.executeAction(initGeolocation);
        } else {
          // clear gps & redirect
          if (newProps.origin.gps === true) {
            newProps.origin.gps = false;
            newProps.origin.set = false;
          }

          if (newProps.destination.gps === true) {
            newProps.destination.gps = false;
            newProps.destination.set = false;
          }

          debug('Redirecting away from POS');
          navigateTo({
            origin: newProps.origin,
            destination: newProps.destination,
            context: '/',
            router: props.router,
            base: {},
          });
        }
      });
    }
    newProps.lang = context.getStore('PreferencesStore').getLanguage();

    return newProps;
  },
);

IndexPageWithPosition.contextTypes = {
  ...IndexPageWithPosition.contextTypes,
  executeAction: PropTypes.func.isRequired,
  intl: intlShape,
};

export {
  IndexPageWithPosition as default,
  IndexPageWithBreakpoint as Component,
};
