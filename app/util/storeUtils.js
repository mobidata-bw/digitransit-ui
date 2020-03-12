export const getPositions = context => {
  return context.getStore('PositionStore').getLocationState();
};

export const getFavouriteLocations = context => {
  return context.getStore('FavouriteStore').getLocations();
};

export const getFavouriteRoutes = context => {
  return context.getStore('FavouriteStore').getRoutes();
};

export const getFavouriteStops = context => {
  return context.getStore('FavouriteStore').getStopsAndStations();
};

export const getOldSearches = (context, type) => {
  return context.getStore('OldSearchesStore').getOldSearches(type);
};

export const getLanguage = context => {
  return context.getStore('PreferencesStore').getLanguage();
};
