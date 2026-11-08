// Format the resolved local calendar fields, independently of the host timezone.
export const birthDateLabel = (localDate: string) => {
  const [year, month, day] = localDate.split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};
export const birthTimeLabel = (localTime: string) => {
  const [hour, minute, second] = localTime.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")}${second ? `:${String(second).padStart(2, "0")}` : ""} ${hour < 12 ? "AM" : "PM"}`;
};
