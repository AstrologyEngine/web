import type { english } from "./english";

export type UiKey = keyof typeof english.ui;

export const placeholders = {
  "app.birth.dateTime": ["date", "time"],
  "app.status.housesAdjusted": ["houseSystem"],
  "app.status.notApplied": ["shown"],
  "app.status.updating": ["requested", "shown"],
  "birth.choice.placeOption": ["city", "country", "region"],
  "chart.house.name": ["number"],
  "details.aspect.title": ["aspect", "first", "second"],
  "details.context": ["houseSystem", "reference"],
  "details.contextRequested": ["houseSystem", "reference", "requested"],
  "explorer.aspects.exploreOf": ["body"],
  "explorer.picker.second": ["body"],
  "settings.advanced.houses": ["houses"],
  "settings.help.summary": ["divisions", "houses"],
  "settings.help.summaryOphiuchusIncluded": ["divisions", "houses"],
  "wheel.group.label": ["bodies"],
  "wheel.group.labelSelected": ["bodies", "body"],
  "wheel.sign.region": ["sign"],
} as const satisfies Partial<Record<UiKey, readonly string[]>>;
