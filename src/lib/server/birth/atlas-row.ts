/** Compact GeoNames asset format shared by the generator and server reader. */
export type AtlasRow = readonly [
  key: string,
  city: string,
  asciiName: string,
  region: string,
  country: string,
  countryCode: string,
  latitude: number,
  longitude: number,
  population: number,
  timezone: string,
];
