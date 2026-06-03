export type OsrmCoordinate = {
  longitude: number;
  latitude: number;
};

export type OsrmRouteResponse = {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
  }>;
  message?: string;
};
