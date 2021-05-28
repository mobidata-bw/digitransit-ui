import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import StopCode from './StopCode';
import BackButton from './BackButton';
import LazilyLoad, { importLazy } from './LazilyLoad';
import { getJson } from '../util/xhrPromise';
import getZoneId from '../util/zoneIconUtils';
import ZoneIcon from './ZoneIcon';

const modules = {
  FavouriteBikeRentalStationContainer: () =>
    importLazy(import('./FavouriteBikeRentalStationContainer')),
};
const BikeRentalStationHeader = (
  { bikeRentalStation, breakpoint },
  { config },
) => {
  const [zoneId, setZoneId] = useState(undefined);
  useEffect(() => {
    getJson(config.URL.PELIAS_REVERSE_GEOCODER, {
      'point.lat': bikeRentalStation.lat,
      'point.lon': bikeRentalStation.lon,
      'boundary.circle.radius': 0.2,
      layers: 'address',
      size: 1,
      zones: 1,
    }).then(data => {
      if (data.features != null && data.features.length > 0) {
        const match = data.features[0].properties;
        const id = getZoneId(config, match.zones, data.zones);
        setZoneId(id.toString().toLowerCase());
      }
    });
  }, []);
  return (
    <div className="bike-station-header">
      {breakpoint === 'large' && (
        <BackButton
          icon="icon-icon_arrow-collapse--left"
          iconClassName="arrow-icon"
        />
      )}
      <div className="header">
        <h3>{bikeRentalStation.name}</h3>
        <div className="bike-station-sub-header">
          <FormattedMessage id="citybike-station-no-id" />
          {bikeRentalStation.name !== bikeRentalStation.stationId && (
            <>
              <StopCode code={bikeRentalStation.stationId} />
              {zoneId && (
                <span className="bike-station-zone-icon">
                  <ZoneIcon zoneId={zoneId.toUpperCase()} />
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <LazilyLoad modules={modules}>
        {({ FavouriteBikeRentalStationContainer }) => (
          <FavouriteBikeRentalStationContainer
            bikeRentalStation={bikeRentalStation}
          />
        )}
      </LazilyLoad>
    </div>
  );
};

BikeRentalStationHeader.propTypes = {
  breakpoint: PropTypes.string.isRequired,
  bikeRentalStation: PropTypes.shape({
    name: PropTypes.string.isRequired,
    stationId: PropTypes.string.isRequired,
    lat: PropTypes.number.isRequired,
    lon: PropTypes.number.isRequired,
  }),
};

BikeRentalStationHeader.contextTypes = {
  config: PropTypes.object.isRequired,
};

export default BikeRentalStationHeader;
