import app from "./en/ui/app.json";
import birth from "./en/ui/birth.json";
import brand from "./en/ui/brand.json";
import chart from "./en/ui/chart.json";
import details from "./en/ui/details.json";
import error from "./en/ui/error.json";
import explorer from "./en/ui/explorer.json";
import landing from "./en/ui/landing.json";
import language from "./en/ui/language.json";
import settings from "./en/ui/settings.json";
import wheel from "./en/ui/wheel.json";
import body from "./en/reference/body.json";
import angle from "./en/reference/angle.json";
import sign from "./en/reference/sign.json";
import aspect from "./en/reference/aspect.json";
import house from "./en/reference/house.json";

export const english = {
  ui: {
    ...app,
    ...birth,
    ...brand,
    ...chart,
    ...details,
    ...error,
    ...explorer,
    ...landing,
    ...language,
    ...settings,
    ...wheel,
  },
  body,
  angle,
  sign,
  aspect,
  house,
};
