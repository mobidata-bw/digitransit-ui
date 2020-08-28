/* eslint-disable import/no-extraneous-dependencies */
import PropTypes from 'prop-types';
import React from 'react';
import cx from 'classnames';
import pure from 'recompose/pure';
import Icon from '@digitransit-component/digitransit-component-icon';
import styles from './helpers/styles.scss';

function getIconProperties(item) {
  let iconId;
  let iconColor = '#888888';
  if (item && item.selectedIconId) {
    iconId = item.selectedIconId;
  } else if (item && item.properties) {
    iconId = item.properties.selectedIconId || item.properties.layer;
  }
  if (item && item.iconColor) {
    // eslint-disable-next-line prefer-destructuring
    iconColor = item.iconColor;
  } else if (
    item &&
    item.properties &&
    item.properties.layer.includes('favourite')
  ) {
    iconColor = '#007ac9';
  }
  const layerIcon = new Map([
    ['currentPosition', 'locate'],
    ['favouritePlace', 'star'],
    ['favouriteRoute', 'star'],
    ['favouriteStop', 'star'],
    ['favouriteStation', 'star'],
    ['favourite', 'star'],
    ['address', 'place'],
    ['stop', 'busstop'],
    ['locality', 'city'],
    ['station', 'station'],
    ['localadmin', 'city'],
    ['neighbourhood', 'city'],
    ['route-BUS', 'bus'],
    ['route-TRAM', 'tram'],
    ['route-RAIL', 'rail'],
    ['route-SUBWAY', 'subway'],
    ['route-FERRY', 'ferry'],
    ['route-AIRPLANE', 'airplane'],
    ['edit', 'edit'],
    ['icon-icon_home', 'home'],
    ['icon-icon_work', 'work'],
    ['icon-icon_sport', 'sport'],
    ['icon-icon_school', 'school'],
    ['icon-icon_shopping', 'shopping'],
    ['selectFromMap', 'select-from-map'],
    ['ownLocations', 'star'],
    ['back', 'arrow'],
  ]);

  const defaultIcon = 'place';
  return [layerIcon.get(iconId) || defaultIcon, iconColor];
}

/**
 * SuggestionItem renders suggestions for digitransit-autosuggest component.
 * @example
 * <SuggestionItem
 *    item={suggestionObject}
 *    ariaContent={'Station - Pasila - Helsinki'}
 *    loading={false}
 * />
 */
const SuggestionItem = pure(
  ({ item, ariaContent, loading, className, isMobile }) => {
    const [iconId, iconColor] = getIconProperties(item);
    const icon = (
      <span className={styles[iconId]}>
        <Icon color={iconColor} img={iconId} />
      </span>
    );
    const [iconstr, name, label] = ariaContent || [
      iconId,
      item.name,
      item.address,
    ];
    const acri = (
      <div className={styles['sr-only']}>
        <p>
          {' '}
          {iconstr} - {name} - {label}
        </p>
      </div>
    );
    const ri = (
      <div
        aria-hidden="true"
        className={cx(styles['search-result'], {
          loading,
        })}
      >
        <span aria-label={iconstr} className={styles['suggestion-icon']}>
          {icon}
        </span>
        <div className={styles['suggestion-result']}>
          <p className={cx(styles['suggestion-name'], styles[className])}>
            {name}
          </p>
          <p className={styles['suggestion-label']}>{label}</p>
        </div>
        {iconId !== 'arrow' && (
          <span
            className={cx(styles['arrow-icon'], {
              [styles.mobile]: isMobile,
            })}
          >
            <Icon img="arrow" />
          </span>
        )}
      </div>
    );
    return (
      <div
        className={cx(
          styles['suggestion-item-container'],
          {
            [styles.mobile]: isMobile,
          },
          styles[item.type],
        )}
      >
        {acri}
        {ri}
      </div>
    );
  },
);

SuggestionItem.propTypes = {
  item: PropTypes.object,
  ariaContent: PropTypes.arrayOf(PropTypes.string),
  className: PropTypes.string,
  isMobile: PropTypes.bool,
};

SuggestionItem.defaultProps = {
  className: undefined,
  isMobile: false,
};

export default SuggestionItem;