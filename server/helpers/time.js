const IST_OFFSET_MINUTES = 330;

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatAsMysqlDatetime(date) {
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

function getISTDate(date = new Date()) {
  return new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
}

function getCurrentISTMysqlDatetime() {
  return formatAsMysqlDatetime(getISTDate());
}

function getISTMysqlDatetimeAfterHours(delayHours = 0) {
  const future = new Date(Date.now() + (IST_OFFSET_MINUTES * 60 + delayHours * 3600) * 1000);
  return formatAsMysqlDatetime(future);
}

function normalizeToISTMysqlDatetime(input) {
  if (!input) return null;

  const value = String(input).trim();
  if (!value) return null;

  const normalized = value.replace(" ", "T");
  const parsed = new Date(normalized);

  if (!Number.isNaN(parsed.getTime())) {
    if (/z$/i.test(value) || /[+-]\d{2}:\d{2}$/.test(value)) {
      return formatAsMysqlDatetime(getISTDate(parsed));
    }

    const [datePart, timePart = "00:00"] = normalized.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes, seconds = 0] = timePart.split(":").map(Number);

    if ([year, month, day, hours, minutes, seconds].every(Number.isFinite)) {
      return (
        `${year}-${pad(month)}-${pad(day)} ` +
        `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      );
    }
  }

  return null;
}

module.exports = {
  getCurrentISTMysqlDatetime,
  getISTMysqlDatetimeAfterHours,
  normalizeToISTMysqlDatetime,
};
