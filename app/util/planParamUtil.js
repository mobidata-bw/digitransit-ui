import omitBy from 'lodash/omitBy';
import moment from 'moment';
import Cookies from 'universal-cookie';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import point from 'turf-point';
import polygon from 'turf-polygon';
import herrenbergOldTownGeojson from './geojson/herrenberg-old-town.json';

import {
  filterModes,
  getDefaultModes,
  getModes,
  modesAsOTPModes,
  getBicycleCompatibleModes,
  isTransportModeAvailable,
} from './modeUtils';
import { otpToLocation, getIntermediatePlaces } from './otpStrings';
import { getCitybikeNetworks, getDefaultNetworks } from './citybikes';
import { getCustomizedSettings } from '../store/localStorage';
import { estimateItineraryDistance } from './geo-utils';
import { BicycleParkingFilter } from '../constants';

/**
 * Retrieves the default settings from the configuration.
 *
 * @param {*} config the configuration for the software installation
 */
export const getDefaultSettings = config => {
  if (!config) {
    return {};
  }
  return {
    ...config.defaultSettings,
    modes: getDefaultModes(config).sort(),
    allowedVehicleRentalNetworks: config.transportModes.citybike.defaultValue
      ? getDefaultNetworks(config)
      : [],
    useVehicleParkingAvailabilityInformation: null,
  };
};

/**
 * Retrieves the current (customized) settings that are in use.
 *
 * @param {*} config the configuration for the software installation
 * @param {*} query the query part of the current url
 */
export const getCurrentSettings = config => {
  const defaultSettings = getDefaultSettings(config);
  const customizedSettings = getCustomizedSettings();
  return {
    ...defaultSettings,
    ...customizedSettings,
    modes: customizedSettings?.modes
      ? [
          ...customizedSettings?.modes.filter(mode =>
            isTransportModeAvailable(config, mode),
          ),
          'WALK',
        ].sort()
      : defaultSettings.modes,
    allowedVehicleRentalNetworks: getCitybikeNetworks(config),
  };
};

function getTicketTypes(settingsTicketType, defaultTicketType) {
  // separator used to be _, map it to : to keep old URLs compatible
  const remap = str => [`${str}`.replace('_', ':')];
  const isRestriction = type => type !== 'none';

  if (settingsTicketType) {
    return isRestriction(settingsTicketType) ? remap(settingsTicketType) : null;
  }
  return defaultTicketType && isRestriction(defaultTicketType)
    ? remap(defaultTicketType)
    : null;
}
/**
 * Find an option nearest to the value
 *
 * @param value a number
 * @param options array of numbers
 * @returns on option from options that is closest to the provided value
 */
export const findNearestOption = (value, options) => {
  let currNearest = options[0];
  let diff = Math.abs(value - currNearest);
  for (let i = 0; i < options.length; i++) {
    const newdiff = Math.abs(value - options[i]);
    if (newdiff < diff) {
      diff = newdiff;
      currNearest = options[i];
    }
  }
  return currNearest;
};

function nullOrUndefined(val) {
  return val === null || val === undefined;
}

const getNumberValueOrDefault = (value, defaultValue = undefined) =>
  value !== undefined ? Number(value) : defaultValue;

export const getSettings = config => {
  const custSettings = getCustomizedSettings();

  return {
    walkSpeed:
      config.defaultOptions.walkSpeed.find(
        option =>
          option ===
          getNumberValueOrDefault(
            custSettings.walkSpeed,
            config.defaultSettings.walkSpeed,
          ),
      ) ||
      config.defaultOptions.walkSpeed.find(
        option =>
          option ===
          findNearestOption(
            getNumberValueOrDefault(
              custSettings.walkSpeed,
              config.defaultSettings.walkSpeed,
            ),
            config.defaultOptions.walkSpeed,
          ),
      ),
    walkReluctance: getNumberValueOrDefault(custSettings.walkReluctance),
    walkBoardCost: getNumberValueOrDefault(custSettings.walkBoardCost),
    modes: undefined,
    accessibilityOption: getNumberValueOrDefault(
      custSettings.accessibilityOption,
    ),
    ticketTypes: custSettings.ticketTypes,
    bikeSpeed:
      config.defaultOptions.bikeSpeed.find(
        option =>
          option ===
          getNumberValueOrDefault(
            custSettings.bikeSpeed,
            config.defaultSettings.bikeSpeed,
          ),
      ) ||
      config.defaultOptions.bikeSpeed.find(
        option =>
          option ===
          findNearestOption(
            getNumberValueOrDefault(
              custSettings.bikeSpeed,
              config.defaultSettings.bikeSpeed,
            ),
            config.defaultOptions.bikeSpeed,
          ),
      ),
    allowedVehicleRentalNetworks: custSettings.allowedVehicleRentalNetworks,
    includeBikeSuggestions: custSettings.includeBikeSuggestions,
    includeCarSuggestions: custSettings.includeCarSuggestions,
    includeParkAndRideSuggestions: custSettings.includeParkAndRideSuggestions,
    useVehicleParkingAvailabilityInformation:
      custSettings.useVehicleParkingAvailabilityInformation,
    bicycleParkingFilter: custSettings.bicycleParkingFilter,
    showBikeAndParkItineraries: custSettings.showBikeAndParkItineraries,
  };
};

const getShouldMakeParkRideQuery = (
  linearDistance,
  config,
  settings,
  defaultSettings,
) => {
  return (
    linearDistance > config.suggestCarMinDistance &&
    (settings.includeParkAndRideSuggestions !== undefined
      ? settings.includeParkAndRideSuggestions
      : defaultSettings.includeParkAndRideSuggestions)
  );
};

const getShouldMakeCarQuery = (
  linearDistance,
  config,
  settings,
  defaultSettings,
) => {
  return (
    linearDistance > config.suggestCarMinDistance &&
    (settings.includeCarSuggestions !== undefined
      ? settings.includeCarSuggestions
      : defaultSettings.includeCarSuggestions)
  );
};

const isDestinationOldTownOfHerrenberg = destination => {
  return booleanPointInPolygon(
    point([destination.lon, destination.lat]),
    polygon(herrenbergOldTownGeojson.features[0].geometry.coordinates),
  );
};

export const hasStartAndDestination = ({ from, to }) =>
  from && to && from !== '-' && to !== '-';

export const preparePlanParams = (config, useDefaultModes) => (
  { from, to },
  {
    location: {
      query: {
        arriveBy,
        intermediatePlaces,
        time,
        locale,
        useVehicleParkingAvailabilityInformation,
        bannedVehicleParkingTags,
      },
    },
  },
) => {
  const settings = getSettings(config);
  const fromLocation = otpToLocation(from);
  const toLocation = otpToLocation(to);
  const intermediatePlaceLocations = getIntermediatePlaces({
    intermediatePlaces,
  });
  let modesOrDefault = useDefaultModes
    ? getDefaultModes(config)
    : filterModes(
        config,
        getModes(config),
        fromLocation,
        toLocation,
        intermediatePlaceLocations,
      );
  const defaultSettings = { ...getDefaultSettings(config) };
  const allowedVehicleRentalNetworks = getDefaultNetworks(config);
  // legacy settings used to set network name in uppercase in localstorage
  const allowedVehicleRentalNetworksMapped =
    Array.isArray(settings.allowedVehicleRentalNetworks) &&
    settings.allowedVehicleRentalNetworks.length > 0
      ? settings.allowedVehicleRentalNetworks
          .filter(
            network =>
              allowedVehicleRentalNetworks.includes(network) ||
              allowedVehicleRentalNetworks.includes(network.toLowerCase()),
          )
          .map(network =>
            allowedVehicleRentalNetworks.includes(network.toLowerCase())
              ? network.toLowerCase()
              : network,
          )
      : defaultSettings.allowedVehicleRentalNetworks;
  if (
    !allowedVehicleRentalNetworksMapped ||
    !allowedVehicleRentalNetworksMapped.length
  ) {
    // do not ask citybike routes if no networks are allowed
    modesOrDefault = modesOrDefault.filter(mode => mode !== 'BICYCLE_RENT');
  }
  const formattedModes = modesAsOTPModes(modesOrDefault);
  const wheelchair =
    getNumberValueOrDefault(settings.accessibilityOption, defaultSettings) ===
    1;
  const includeBikeSuggestions =
    settings.includeBikeSuggestions !== undefined
      ? settings.includeBikeSuggestions
      : defaultSettings.includeBikeSuggestions;
  const linearDistance = estimateItineraryDistance(
    fromLocation,
    toLocation,
    intermediatePlaceLocations,
  );
  const parsedTime = time ? moment(time * 1000) : moment();

  let bannedBicycleParkingTags = [];
  let preferredBicycleParkingTags = [];
  if (BicycleParkingFilter.FreeOnly === settings.bicycleParkingFilter) {
    bannedBicycleParkingTags = ['osm:fee=yes'];
  }
  if (BicycleParkingFilter.SecurePreferred === settings.bicycleParkingFilter) {
    preferredBicycleParkingTags = [
      'osm:fee=yes',
      'osm:fee=some',
      'osm:bicycle_parking=lockers',
    ];
  }

  // Use defaults or user given settings
  const ticketTypes = useDefaultModes
    ? null
    : getTicketTypes(settings.ticketTypes, defaultSettings.ticketTypes);
  const walkReluctance = useDefaultModes
    ? defaultSettings.walkReluctance
    : settings.walkReluctance;
  const walkBoardCost = useDefaultModes
    ? defaultSettings.walkBoardCost
    : settings.walkBoardCost;

  const cookies = new Cookies();

  return {
    ...defaultSettings,
    ...omitBy(
      {
        fromPlace: from,
        toPlace: to,
        from: fromLocation,
        to: toLocation,
        intermediatePlaces: intermediatePlaceLocations,
        numItineraries: 5,
        date: parsedTime.format('YYYY-MM-DD'),
        time: parsedTime.format('HH:mm:ss'),
        date: (time ? moment(time * 1000) : moment()).format('YYYY-MM-DD'),
        time: (time ? moment(time * 1000) : moment()).format('HH:mm:ss'),
        // TODO Check why HSL did not retrieve from settings
        walkReluctance: settings.walkReluctance,
        walkBoardCost: settings.walkBoardCost,
        minTransferTime: config.minTransferTime,
        walkSpeed: settings.walkSpeed,
        arriveBy: arriveBy === 'true',
        wheelchair,
        transferPenalty: config.transferPenalty,
        bikeSpeed: settings.bikeSpeed,
        optimize: settings.includeBikeSuggestions
          ? config.defaultSettings.optimize
          : config.optimize,
        triangle: {
          safetyFactor: config.defaultSettings.safetyFactor,
          slopeFactor: config.defaultSettings.slopeFactor,
          timeFactor: config.defaultSettings.timeFactor,
        },
        itineraryFiltering: config.itineraryFiltering,
        locale: locale || cookies.get('lang') || 'fi',
        // todo
        useVehicleParkingAvailabilityInformation,

        bannedVehicleParkingTags: bannedVehicleParkingTags
          ? [bannedVehicleParkingTags].concat(
              config.parkAndRideBannedVehicleParkingTags,
            )
          : config.parkAndRideBannedVehicleParkingTags,
      },
      nullOrUndefined,
    ),
    // These modes are used by the "default" routing query.
    modes: [
      // In bbnavi, we want direct Flex routing whenever bus routing is enabled.
      ...(formattedModes.some(({ mode }) => mode === 'BUS')
        ? [{ mode: 'FLEX', qualifier: 'DIRECT' }]
        : []),
      ...formattedModes,
    ],
    ticketTypes: getTicketTypes(
      settings.ticketTypes,
      defaultSettings.ticketTypes,
    ),
    modeWeight: config.customWeights,
    allowedVehicleRentalNetworks: allowedVehicleRentalNetworksMapped,
    shouldMakeWalkQuery:
      !wheelchair && linearDistance < config.suggestWalkMaxDistance,
    shouldMakeBikeQuery:
      !wheelchair &&
      linearDistance < config.suggestBikeMaxDistance &&
      includeBikeSuggestions,
    shouldMakeCarQuery: getShouldMakeCarQuery(
      linearDistance,
      config,
      settings,
      defaultSettings,
    ),
    shouldMakeParkRideQuery: getShouldMakeParkRideQuery(
      linearDistance,
      config,
      settings,
      defaultSettings,
    ),
    // In bbnavi, we include Flex routing in the "default" public routing mode.
    shouldMakeOnDemandTaxiQuery: false,
    showBikeAndPublicItineraries:
      !wheelchair &&
      config.showBikeAndPublicItineraries &&
      linearDistance >= config.suggestBikeAndPublicMinDistance &&
      modesOrDefault.length > 1 &&
      includeBikeSuggestions,
    showBikeAndParkItineraries:
      !wheelchair &&
      config.showBikeAndParkItineraries &&
      linearDistance >= config.suggestBikeAndParkMinDistance &&
      modesOrDefault.length > 1 &&
      includeBikeSuggestions,
    bikeAndPublicMaxWalkDistance: config.suggestBikeAndPublicMaxDistance,
    bikeAndPublicModes: [
      { mode: 'BICYCLE' },
      ...modesAsOTPModes(getBicycleCompatibleModes(config, modesOrDefault)),
    ],
    bannedBicycleParkingTags,
    preferredBicycleParkingTags,
    unpreferredBicycleParkingTagPenalty:
      config.unpreferredBicycleParkingTagPenalty,
    onDemandTaxiModes: [
      // `filterModes` removes `FLEX_*`, so we include it manually.
      { mode: 'FLEX', qualifier: 'DIRECT' },
      { mode: 'FLEX', qualifier: 'ACCESS' },
      { mode: 'FLEX', qualifier: 'EGRESS' },
      ...modesAsOTPModes(
        filterModes(
          config,
          ['RAIL', 'BUS', 'WALK'],
          from,
          to,
          intermediatePlaces || [],
        ),
      ),
    ],
    bikeParkModes: [{ mode: 'BICYCLE', qualifier: 'PARK' }, ...formattedModes],
    carParkModes: [
      isDestinationOldTownOfHerrenberg(toLocation)
        ? { mode: 'CAR', qualifier: 'PARK' }
        : { mode: 'CAR' },
    ],
    parkRideModes: modesAsOTPModes(
      filterModes(
        config,
        ['CAR_PARK', 'BUS', 'RAIL', 'SUBWAY'],
        from,
        to,
        intermediatePlaces || [],
      ),
    ),
  };
};
