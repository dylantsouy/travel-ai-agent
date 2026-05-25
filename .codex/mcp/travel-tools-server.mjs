#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
let buffer = Buffer.alloc(0);

const weatherCodes = new Map([
  [0, "Clear"],
  [1, "Mainly clear"],
  [2, "Partly cloudy"],
  [3, "Overcast"],
  [45, "Fog"],
  [48, "Rime fog"],
  [51, "Light drizzle"],
  [53, "Drizzle"],
  [55, "Dense drizzle"],
  [61, "Light rain"],
  [63, "Rain"],
  [65, "Heavy rain"],
  [71, "Light snow"],
  [73, "Snow"],
  [75, "Heavy snow"],
  [80, "Rain showers"],
  [81, "Rain showers"],
  [82, "Violent rain showers"],
  [95, "Thunderstorm"],
  [96, "Thunderstorm with hail"],
  [99, "Severe thunderstorm with hail"],
]);

const locationEmoji = {
  transport: "🚏",
  luggage: "🛅",
  attraction: "🏖️",
  restaurant: "🍱",
  shopping: "🛍️",
  tea: "🍵",
  shrine: "⛩️",
  hotel: "🏨",
  dessert: "🍰",
  historic: "🗿",
  museum: "🏛️",
  bar: "🍷",
  cafe: "☕",
  church: "⛪",
  castle: "🏰",
  department_store: "🏬",
  convenience_store: "🏪",
  onsen: "♨️",
  amusement_park: "🎠",
};

function send(message) {
  const body = encoder.encode(JSON.stringify(message));
  process.stdout.write(`Content-Length: ${body.length}\r\n\r\n`);
  process.stdout.write(Buffer.from(body));
}

function respond(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "travel-ai-agent-mcp/0.2",
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }
  return response.json();
}

function textResult(text) {
  return { content: [{ type: "text", text }], isError: false };
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function makeZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { dosTime, dosDate } = dosDateTime();

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(String(file.data), "utf8");
    const crc = crc32(data);

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    localParts.push(local, data);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centralParts.push(central);

    offset += local.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function columnName(index) {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function splitAlternatives(value) {
  return String(value ?? "")
    .split(/\s*(?:\/|、|,|;|\n)\s*/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function geocode({ query, language = "zh", count = 5 }) {
  if (!query || typeof query !== "string") throw new Error("query is required");
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", String(Math.min(Math.max(Number(count) || 5, 1), 10)));
  url.searchParams.set("language", language);
  url.searchParams.set("format", "json");
  const data = await fetchJson(url);
  const results = (data.results ?? []).map((item) => ({
    name: item.name,
    country: item.country,
    admin1: item.admin1,
    latitude: item.latitude,
    longitude: item.longitude,
    timezone: item.timezone,
  }));
  return results.length ? JSON.stringify(results, null, 2) : `No geocode result for ${query}.`;
}

async function weatherForecast({ location, days = 5, language = "zh" }) {
  if (!location || typeof location !== "string") throw new Error("location is required");
  const places = JSON.parse(await geocode({ query: location, language, count: 1 }));
  const place = places[0];
  if (!place) return `No weather location found for ${location}.`;

  const forecastDays = Math.min(Math.max(Number(days) || 5, 1), 14);
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(place.latitude));
  url.searchParams.set("longitude", String(place.longitude));
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum",
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", String(forecastDays));

  const data = await fetchJson(url);
  const daily = data.daily;
  const lines = [
    `${place.name}${place.admin1 ? `, ${place.admin1}` : ""}, ${place.country} forecast`,
    `Coordinates: ${place.latitude}, ${place.longitude}; timezone: ${data.timezone}`,
    "",
    "| Date | Weather | Low | High | Rain chance | Rainfall |",
    "|---|---|---:|---:|---:|---:|",
  ];
  for (let i = 0; i < daily.time.length; i += 1) {
    lines.push([
      daily.time[i],
      weatherCodes.get(daily.weather_code[i]) ?? `Code ${daily.weather_code[i]}`,
      `${daily.temperature_2m_min[i]} C`,
      `${daily.temperature_2m_max[i]} C`,
      `${daily.precipitation_probability_max[i]}%`,
      `${daily.precipitation_sum[i]} mm`,
    ].join(" | "));
  }
  return lines.join("\n");
}

async function currencyConvert({ amount = 1, from_currency, to_currency }) {
  const from = String(from_currency ?? "").trim().toUpperCase();
  const to = String(to_currency ?? "").trim().toUpperCase();
  const numericAmount = Number(amount);
  if (!from || !to) throw new Error("from_currency and to_currency are required");
  if (!Number.isFinite(numericAmount)) throw new Error("amount must be a number");

  const data = await fetchJson(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`);
  const rate = data.rates?.[to];
  if (!rate) throw new Error(`currency ${to} is not available from ${from}`);
  const converted = numericAmount * rate;
  return [
    `${numericAmount.toLocaleString("en-US")} ${from} = ${converted.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${to}`,
    `Rate: 1 ${from} = ${rate} ${to}`,
    `Updated: ${data.time_last_update_utc}`,
    "Note: reference rate only; card fees and cash exchange spreads may apply.",
  ].join("\n");
}

async function nominatimSearch(query, limit = 1) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "zh-TW,zh,en");
  const data = await fetchJson(url);
  return data.map((item) => ({
    name: item.name || item.display_name,
    display_name: item.display_name,
    latitude: Number(item.lat),
    longitude: Number(item.lon),
    type: item.type,
    category: item.category,
  }));
}

async function resolvePlaces(names) {
  const places = [];
  for (const name of names) {
    const results = await nominatimSearch(name, 1);
    if (!results[0]) throw new Error(`Place not found: ${name}`);
    places.push(results[0]);
  }
  return places;
}

async function routeMetrics(places, mode) {
  const isWalking = String(mode).toLowerCase() === "walking";
  const coords = places.map((place) => `${place.longitude},${place.latitude}`).join(";");
  const url = new URL(`https://router.project-osrm.org/route/v1/driving/${coords}`);
  url.searchParams.set("overview", "false");
  url.searchParams.set("alternatives", "false");
  url.searchParams.set("steps", "false");
  const data = await fetchJson(url);
  const route = data.routes?.[0];
  if (!route) throw new Error("OSRM could not route these places");
  const distance = route.distance;
  const duration = isWalking ? (distance / 1000 / 4.5) * 3600 : route.duration;
  return { distance, duration, legs: route.legs };
}

async function routeEstimate({ origin, destination, mode = "driving" }) {
  if (!origin || !destination) throw new Error("origin and destination are required");
  const places = await resolvePlaces([origin, destination]);
  const metrics = await routeMetrics(places, mode);
  const distanceKm = metrics.distance / 1000;
  const durationMin = Math.round(metrics.duration / 60);
  const modeLabel = String(mode).toLowerCase() === "walking" ? "walking" : "driving/taxi";
  return [
    `${origin} -> ${destination}`,
    `Mode: ${modeLabel}`,
    `Distance: about ${distanceKm.toFixed(1)} km`,
    `Duration: about ${durationMin} min`,
    `Origin match: ${places[0].display_name}`,
    `Destination match: ${places[1].display_name}`,
    "Note: route estimate only; public transit schedules, waiting time, traffic, closures, and itinerary buffers are not included.",
  ].join("\n");
}

async function routeSequenceEstimate({ stops, mode = "driving" }) {
  if (!Array.isArray(stops) || stops.length < 2) throw new Error("stops must contain at least 2 places");
  if (stops.length > 10) throw new Error("stops supports at most 10 places");
  const cleanStops = stops.map((stop) => String(stop).trim()).filter(Boolean);
  const places = await resolvePlaces(cleanStops);
  const metrics = await routeMetrics(places, mode);
  const isWalking = String(mode).toLowerCase() === "walking";
  const lines = [
    `Route sequence estimate (${isWalking ? "walking" : "driving/taxi"})`,
    "",
    "| Segment | From | To | Distance | Duration |",
    "|---:|---|---|---:|---:|",
  ];
  let totalDistance = 0;
  let totalDuration = 0;
  for (let i = 0; i < metrics.legs.length; i += 1) {
    const leg = metrics.legs[i];
    const legKm = leg.distance / 1000;
    const legSec = isWalking ? (legKm / 4.5) * 3600 : leg.duration;
    totalDistance += leg.distance;
    totalDuration += legSec;
    lines.push([String(i + 1), cleanStops[i], cleanStops[i + 1], `about ${legKm.toFixed(1)} km`, `about ${Math.round(legSec / 60)} min`].join(" | "));
  }
  lines.push("");
  lines.push(`Total distance: about ${(totalDistance / 1000).toFixed(1)} km`);
  lines.push(`Total travel time: about ${Math.round(totalDuration / 60)} min`);
  lines.push("Place matches:");
  cleanStops.forEach((stop, index) => lines.push(`- ${stop} -> ${places[index].display_name}`));
  lines.push("Note: estimate only; check transit schedules, business hours, luggage, weather, queues, and buffers separately.");
  return lines.join("\n");
}

function permute(items) {
  if (items.length <= 1) return [items];
  const results = [];
  for (let i = 0; i < items.length; i += 1) {
    const rest = items.slice(0, i).concat(items.slice(i + 1));
    for (const tail of permute(rest)) results.push([items[i], ...tail]);
  }
  return results;
}

async function routeOptimize({ start, stops, end, mode = "driving", top_n = 3 }) {
  if (!start || !Array.isArray(stops) || stops.length < 2) throw new Error("start and at least 2 stops are required");
  if (stops.length > 7) throw new Error("stops supports at most 7 places");
  const cleanStart = String(start).trim();
  const cleanStops = stops.map((stop) => String(stop).trim()).filter(Boolean);
  const cleanEnd = end ? String(end).trim() : cleanStart;
  const names = [cleanStart, ...cleanStops, cleanEnd];
  const places = await resolvePlaces(names);
  const startPlace = places[0];
  const stopPlaces = places.slice(1, -1);
  const endPlace = places.at(-1);
  const candidates = [];
  for (const order of permute(cleanStops.map((name, index) => ({ name, place: stopPlaces[index] })))) {
    const orderedNames = [cleanStart, ...order.map((item) => item.name), cleanEnd];
    const orderedPlaces = [startPlace, ...order.map((item) => item.place), endPlace];
    candidates.push({ orderedNames, metrics: await routeMetrics(orderedPlaces, mode) });
  }
  candidates.sort((a, b) => a.metrics.duration - b.metrics.duration);
  const limit = Math.min(Math.max(Number(top_n) || 3, 1), 5, candidates.length);
  const lines = [
    `Route order optimization (${String(mode).toLowerCase() === "walking" ? "walking" : "driving/taxi"})`,
    "",
    "| Rank | Order | Distance | Travel time |",
    "|---:|---|---:|---:|",
  ];
  for (let i = 0; i < limit; i += 1) {
    const candidate = candidates[i];
    lines.push([String(i + 1), candidate.orderedNames.join(" -> "), `about ${(candidate.metrics.distance / 1000).toFixed(1)} km`, `about ${Math.round(candidate.metrics.duration / 60)} min`].join(" | "));
  }
  lines.push("");
  lines.push("Note: optimizes distance/time only; business hours, tickets, luggage, weather, meals, and transit schedules still need Travel Agent review.");
  return lines.join("\n");
}

async function exportItineraryCsv({ rows, output_path }) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("rows must be a non-empty array");
  const headers = ["day", "location", "event", "arrival", "stay", "departure", "transport", "notes", "alternatives"];
  const csvRows = [headers.join(",")];
  for (const row of rows) csvRows.push(headers.map((key) => csvEscape(row[key])).join(","));
  const csv = `${csvRows.join("\r\n")}\r\n`;
  if (output_path) {
    const path = resolve(String(output_path));
    await writeFile(path, csv, "utf8");
    return `CSV written: ${path}\nRows: ${rows.length}`;
  }
  return csv;
}

async function exportItineraryXlsx({ rows, output_path }) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("rows must be a non-empty array");
  if (!output_path || typeof output_path !== "string") throw new Error("output_path is required for XLSX export");
  const headers = ["day", "location", "event", "arrival", "stay", "departure", "transport", "notes", "alternatives"];
  const displayHeaders = ["日期", "地點", "待處理事件", "抵達", "停留", "出發", "採用交通", "備註", "備選"];
  const table = [displayHeaders, ...rows.map((row) => headers.map((key) => row[key] ?? ""))];
  const sheetRows = table.map((row, rowIndex) => {
    const cells = row.map((value, colIndex) => {
      const ref = `${columnName(colIndex)}${rowIndex + 1}`;
      return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  const dimension = `A1:${columnName(headers.length - 1)}${table.length}`;
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${dimension}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols><col min="1" max="1" width="14" customWidth="1"/><col min="2" max="2" width="34" customWidth="1"/><col min="3" max="3" width="24" customWidth="1"/><col min="4" max="6" width="12" customWidth="1"/><col min="7" max="9" width="32" customWidth="1"/></cols>
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;
  const files = [
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Itinerary" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellXfs></styleSheet>` },
    { name: "xl/worksheets/sheet1.xml", data: worksheet },
  ];
  const path = resolve(output_path);
  await writeFile(path, makeZip(files));
  return `XLSX written: ${path}\nRows: ${rows.length}`;
}

function validateItineraryDay({ rows }) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("rows must be a non-empty array");
  const findings = [];
  const transportBadWords = /breakfast|lunch|dinner|meal|restaurant|shopping|museum|check[ -]?in|check[ -]?out|早餐|午餐|晚餐|用餐|購物|參觀|博物館|飯店早餐/u;
  const locationStartEmoji = /^[\p{Extended_Pictographic}\uFE0F]\s/u;
  const transportEmoji = /^(✈️|🚌|🚇|🚆|🚶|⛴️|🚕|🚗|🛵|🚲|🛴|🚠|🚁|同地點|same place)/iu;

  rows.forEach((row, index) => {
    const rowNo = index + 1;
    const isLastRow = index === rows.length - 1;
    const location = String(row.location ?? "");
    const event = String(row.event ?? "");
    const transport = String(row.transport ?? "");
    const alternatives = String(row.alternatives ?? "");

    if (locationStartEmoji.test(location)) findings.push(`[P2] Row ${rowNo}: location icon should be after the place name.`);
    if (transportBadWords.test(transport)) findings.push(`[P1] Row ${rowNo}: transport contains a non-transport activity: ${transport}`);
    if (isLastRow && transport.trim()) findings.push(`[P2] Row ${rowNo}: last row transport should be blank because there is no next stop.`);
    if (transport && !transportEmoji.test(transport)) findings.push(`[P3] Row ${rowNo}: transport should start with a transport icon or 'same place'.`);
    if (event && location && event.includes(location.replace(/\s*[^\p{Letter}\p{Number}]+$/u, ""))) findings.push(`[P2] Row ${rowNo}: event appears to repeat the location name.`);
    if (/lunch|dinner|午餐|晚餐|吃/u.test(event)) {
      const count = splitAlternatives(alternatives).length;
      if (count < 2) findings.push(`[P2] Row ${rowNo}: meal row should include 2 alternatives.`);
    }
  });

  if (!/hotel|住宿|飯店|旅館|hostel/i.test(String(rows[0].location ?? ""))) findings.push("[P2] First row should usually start from the adopted accommodation.");
  if (!/hotel|住宿|飯店|旅館|hostel/i.test(String(rows.at(-1).location ?? ""))) findings.push("[P2] Last row should usually return to accommodation.");

  return findings.length ? findings.join("\n") : "No itinerary table issues found by the validator.";
}

function dedupeTours({ tours }) {
  if (!Array.isArray(tours) || tours.length === 0) throw new Error("tours must be a non-empty array");
  const patterns = [
    ["kyoto_nara", /kyoto|nara|京都|奈良/i],
    ["kobe_arima", /kobe|arima|神戶|神戸|有馬/i],
    ["wakayama_koyasan", /wakayama|koyasan|和歌山|高野山/i],
    ["miyama_ine_amanohashidate", /miyama|ine|amanohashidate|美山|伊根|天橋立/i],
    ["tagaytay_taal", /tagaytay|taal|塔爾|大雅台/i],
    ["old_city", /intramuros|old city|老城|古城|歷史/i],
    ["market_culture", /market|市場|水上市場|鐵道市場/i],
  ];
  const groups = new Map();
  for (const item of tours) {
    const title = typeof item === "string" ? item : String(item.title ?? item.name ?? "");
    const url = typeof item === "object" ? item.url : undefined;
    const key = patterns.find(([, regex]) => regex.test(title))?.[0] ?? title.toLowerCase().replace(/klook|kkday|getyourguide|viator|tour|day trip|一日遊|半日遊/gi, "").replace(/\s+/g, " ").trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ title, url });
  }
  const lines = ["| Route/theme group | Representative | Duplicates |", "|---|---|---:|"];
  for (const [key, items] of groups) lines.push([key, items[0].url ? `[${items[0].title}](${items[0].url})` : items[0].title, String(items.length - 1)].join(" | "));
  lines.push("");
  lines.push("Use one representative per group by default. Compare vendors inside the same group only when the user asks for platform comparison or has selected that route.");
  return lines.join("\n");
}

function estimateBudget({ travelers = 2, days = 5, nights, exchange_rate = 1, local_currency = "LOCAL", items = [] }) {
  const n = Number(nights ?? Math.max(Number(days) - 1, 0));
  const people = Number(travelers) || 1;
  const rate = Number(exchange_rate) || 1;
  const rows = [];
  let totalLocal = 0;
  for (const item of items) {
    const unit = Number(item.amount ?? 0);
    const qty = Number(item.quantity ?? 1);
    const multiplier = (item.per_person ? people : 1) * (item.per_day ? Number(days) : 1) * (item.per_night ? n : 1);
    const subtotal = unit * qty * multiplier;
    totalLocal += subtotal;
    rows.push({ name: item.name ?? "item", local: subtotal, twd: subtotal * rate, note: item.note ?? "" });
  }
  const lines = [`Budget estimate (${people} travelers, ${days} days, ${n} nights)`, "", "| Item | Local currency | NT$ | Note |", "|---|---:|---:|---|"];
  for (const row of rows) lines.push([row.name, `${row.local.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${local_currency}`, `NT$${Math.round(row.twd).toLocaleString("en-US")}`, row.note].join(" | "));
  lines.push(["Total", `${totalLocal.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${local_currency}`, `NT$${Math.round(totalLocal * rate).toLocaleString("en-US")}`, "Reference estimate"].join(" | "));
  lines.push(["Per person", `${(totalLocal / people).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${local_currency}`, `NT$${Math.round((totalLocal * rate) / people).toLocaleString("en-US")}`, ""].join(" | "));
  return lines.join("\n");
}

function formatPlaceName({ user_name, original_name, category, force_original = false }) {
  const user = String(user_name ?? "").trim();
  const original = String(original_name ?? "").trim();
  const cat = String(category ?? "").toLowerCase();
  const preserveOriginal = force_original || /restaurant|hotel|bar|cafe|shop|餐廳|飯店|酒吧|咖啡|商店/.test(cat);
  const display = user && original && user !== original
    ? `${user} (${original})`
    : user || original;
  const finalName = preserveOriginal && original ? original : display;
  const emoji = locationEmoji[cat] ?? "";
  return emoji ? `${finalName} ${emoji}` : finalName;
}

const itineraryHeaders = ["location", "event", "arrival", "stay", "departure", "transport", "notes", "alternatives"];

function normalizeItineraryRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("rows must be a non-empty array");
  return rows.map((row) => {
    const normalized = {};
    for (const key of itineraryHeaders) normalized[key] = String(row[key] ?? "").trim();
    normalized.day = String(row.day ?? "").trim();
    return normalized;
  });
}

function validateItinerarySchema({ days }) {
  if (!Array.isArray(days) || days.length === 0) throw new Error("days must be a non-empty array");
  const findings = [];
  const seenDates = new Set();

  days.forEach((day, dayIndex) => {
    const label = day.date || day.day || `day ${dayIndex + 1}`;
    if (!day.date && !day.day) findings.push(`[P2] ${label}: missing date/day label.`);
    if (seenDates.has(label)) findings.push(`[P2] ${label}: duplicate day label.`);
    seenDates.add(label);

    let rows = [];
    try {
      rows = normalizeItineraryRows(day.rows);
    } catch {
      findings.push(`[P1] ${label}: rows must be a non-empty array.`);
      return;
    }

    rows.forEach((row, rowIndex) => {
      const rowNo = rowIndex + 1;
      const isLastRow = rowIndex === rows.length - 1;
      for (const key of ["location", "event", "arrival", "stay", "departure"]) {
        if (!row[key]) findings.push(`[P1] ${label} row ${rowNo}: missing required field '${key}'.`);
      }
      if (!isLastRow && !row.transport) findings.push(`[P1] ${label} row ${rowNo}: missing required field 'transport'.`);
      if (isLastRow && row.transport) findings.push(`[P2] ${label} row ${rowNo}: last row transport should be blank because there is no next stop.`);
      if (row.location.startsWith(" ")) findings.push(`[P3] ${label} row ${rowNo}: location has leading whitespace.`);
      if (/^\p{Extended_Pictographic}/u.test(row.location)) findings.push(`[P2] ${label} row ${rowNo}: location icon should be after text.`);
      if (/breakfast|lunch|dinner|shopping|museum|restaurant|hotel breakfast/i.test(row.transport)) findings.push(`[P1] ${label} row ${rowNo}: transport contains non-transport text.`);
      if (/lunch|dinner|eat|午餐|晚餐|吃/u.test(row.event) && splitAlternatives(row.alternatives).length < 2) findings.push(`[P2] ${label} row ${rowNo}: meal rows should include at least 2 alternatives.`);
    });

    const first = rows[0]?.location ?? "";
    const last = rows.at(-1)?.location ?? "";
    if (!/hotel|hostel|住宿|飯店|旅館/i.test(first)) findings.push(`[P2] ${label}: first row should start from accommodation.`);
    if (!/hotel|hostel|住宿|飯店|旅館/i.test(last)) findings.push(`[P2] ${label}: last row should return to accommodation.`);
  });

  return findings.length ? findings.join("\n") : "Itinerary schema validation passed.";
}

function escapeMarkdownCell(value) {
  return String(value ?? "")
    .replace(/\r?\n/g, "<br>")
    .replace(/\|/g, "\\|")
    .trim();
}

function itineraryToMarkdown({ days }) {
  if (!Array.isArray(days) || days.length === 0) throw new Error("days must be a non-empty array");
  const output = [];
  for (const day of days) {
    const title = day.title || day.date || day.day || "Day";
    const rows = normalizeItineraryRows(day.rows);
    output.push(`### ${title}`);
    output.push("");
    output.push("| 地點 | 待處理事件 | 抵達 | 停留 | 出發 | 採用交通 | 備註 | 備選 |");
    output.push("|---|---|---:|---:|---:|---|---|---|");
    for (const row of rows) {
      output.push(`| ${itineraryHeaders.map((key) => escapeMarkdownCell(row[key])).join(" | ")} |`);
    }
    if (day.summary) {
      output.push("");
      output.push("### 當日行程大綱");
      output.push(String(day.summary).trim());
    }
    output.push("");
  }
  return output.join("\n").trimEnd();
}

function lintMarkdownTables({ markdown }) {
  const text = String(markdown ?? "");
  if (!text.trim()) throw new Error("markdown is required");
  const findings = [];
  const lines = text.split(/\r?\n/);
  let tableStart = null;
  let expectedColumns = null;

  function countColumns(line) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
    return trimmed.split(/(?<!\\)\|/).length - 2;
  }

  for (let i = 0; i < lines.length; i += 1) {
    const count = countColumns(lines[i]);
    if (count == null) {
      tableStart = null;
      expectedColumns = null;
      continue;
    }
    if (tableStart == null) {
      tableStart = i + 1;
      expectedColumns = count;
      continue;
    }
    if (count !== expectedColumns) findings.push(`[P1] Table starting line ${tableStart}, line ${i + 1}: expected ${expectedColumns} columns, found ${count}.`);
  }

  const dayHeadings = lines.filter((line) => /^###\s+\d{4}\//.test(line)).length;
  const tableHeaders = lines.filter((line) => line.includes("| 地點 | 待處理事件 | 抵達 | 停留 | 出發 | 採用交通 | 備註 | 備選 |")).length;
  if (dayHeadings > tableHeaders) findings.push(`[P2] Found ${dayHeadings} day headings but only ${tableHeaders} itinerary table headers.`);
  if (/\|\s*日\s*\|/.test(text)) findings.push("[P2] Main itinerary table should not include a separate day column.");
  if (/主要來源|資料來源整理|關鍵營業與交通檢查/.test(text)) findings.push("[P3] Formal itinerary should avoid standalone source/check sections unless explicitly requested.");

  return findings.length ? findings.join("\n") : "Markdown table lint passed.";
}

const tools = [
  {
    name: "travel_geocode",
    description: "Find latitude, longitude, country, and timezone for a travel destination or place name.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, language: { type: "string", default: "zh" }, count: { type: "number", default: 5 } }, required: ["query"] },
  },
  {
    name: "travel_weather_forecast",
    description: "Get a daily weather forecast for a destination using Open-Meteo.",
    inputSchema: { type: "object", properties: { location: { type: "string" }, days: { type: "number", default: 5 }, language: { type: "string", default: "zh" } }, required: ["location"] },
  },
  {
    name: "travel_currency_convert",
    description: "Convert travel budget amounts between currencies using current reference rates.",
    inputSchema: { type: "object", properties: { amount: { type: "number", default: 1 }, from_currency: { type: "string" }, to_currency: { type: "string" } }, required: ["from_currency", "to_currency"] },
  },
  {
    name: "travel_route_estimate",
    description: "Estimate driving/taxi or walking distance and duration between two places.",
    inputSchema: { type: "object", properties: { origin: { type: "string" }, destination: { type: "string" }, mode: { type: "string", enum: ["driving", "walking"], default: "driving" } }, required: ["origin", "destination"] },
  },
  {
    name: "travel_route_sequence_estimate",
    description: "Estimate route distance and duration for an ordered sequence of itinerary stops.",
    inputSchema: { type: "object", properties: { stops: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 10 }, mode: { type: "string", enum: ["driving", "walking"], default: "driving" } }, required: ["stops"] },
  },
  {
    name: "travel_route_optimize",
    description: "Try all orders of itinerary stops and return the shortest route candidates.",
    inputSchema: { type: "object", properties: { start: { type: "string" }, stops: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 7 }, end: { type: "string" }, mode: { type: "string", enum: ["driving", "walking"], default: "driving" }, top_n: { type: "number", default: 3 } }, required: ["start", "stops"] },
  },
  {
    name: "travel_export_itinerary_csv",
    description: "Export itinerary rows to CSV text or write a CSV file.",
    inputSchema: { type: "object", properties: { rows: { type: "array", items: { type: "object" } }, output_path: { type: "string" } }, required: ["rows"] },
  },
  {
    name: "travel_export_itinerary_xlsx",
    description: "Export itinerary rows to an Excel .xlsx workbook file.",
    inputSchema: { type: "object", properties: { rows: { type: "array", items: { type: "object" } }, output_path: { type: "string" } }, required: ["rows", "output_path"] },
  },
  {
    name: "travel_validate_itinerary_day",
    description: "Validate one day itinerary table for common Travel Agent formatting issues.",
    inputSchema: { type: "object", properties: { rows: { type: "array", items: { type: "object" } } }, required: ["rows"] },
  },
  {
    name: "travel_dedupe_tours",
    description: "Group duplicate 1 day tour products by route/theme and choose representative options.",
    inputSchema: { type: "object", properties: { tours: { type: "array", items: {} } }, required: ["tours"] },
  },
  {
    name: "travel_budget_estimate",
    description: "Estimate travel budget totals from structured cost items.",
    inputSchema: { type: "object", properties: { travelers: { type: "number" }, days: { type: "number" }, nights: { type: "number" }, exchange_rate: { type: "number" }, local_currency: { type: "string" }, items: { type: "array", items: { type: "object" } } }, required: ["items"] },
  },
  {
    name: "travel_format_place_name",
    description: "Format a place name with user-language/original-language logic and icon after text.",
    inputSchema: { type: "object", properties: { user_name: { type: "string" }, original_name: { type: "string" }, category: { type: "string" }, force_original: { type: "boolean" } } },
  },
  {
    name: "travel_itinerary_schema_validate",
    description: "Validate a structured multi-day itinerary object before rendering it.",
    inputSchema: { type: "object", properties: { days: { type: "array", items: { type: "object" } } }, required: ["days"] },
  },
  {
    name: "travel_itinerary_to_markdown",
    description: "Render structured itinerary days/rows into the standard Travel Agent Markdown table format.",
    inputSchema: { type: "object", properties: { days: { type: "array", items: { type: "object" } } }, required: ["days"] },
  },
  {
    name: "travel_markdown_table_lint",
    description: "Lint Markdown itinerary tables for column count consistency and common Travel Agent output issues.",
    inputSchema: { type: "object", properties: { markdown: { type: "string" } }, required: ["markdown"] },
  },
];

async function callTool(name, args) {
  switch (name) {
    case "travel_geocode": return geocode(args);
    case "travel_weather_forecast": return weatherForecast(args);
    case "travel_currency_convert": return currencyConvert(args);
    case "travel_route_estimate": return routeEstimate(args);
    case "travel_route_sequence_estimate": return routeSequenceEstimate(args);
    case "travel_route_optimize": return routeOptimize(args);
    case "travel_export_itinerary_csv": return exportItineraryCsv(args);
    case "travel_export_itinerary_xlsx": return exportItineraryXlsx(args);
    case "travel_validate_itinerary_day": return validateItineraryDay(args);
    case "travel_dedupe_tours": return dedupeTours(args);
    case "travel_budget_estimate": return estimateBudget(args);
    case "travel_format_place_name": return formatPlaceName(args);
    case "travel_itinerary_schema_validate": return validateItinerarySchema(args);
    case "travel_itinerary_to_markdown": return itineraryToMarkdown(args);
    case "travel_markdown_table_lint": return lintMarkdownTables(args);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

async function handleMessage(message) {
  if (!message.id && message.method?.startsWith("notifications/")) return;
  try {
    switch (message.method) {
      case "initialize":
        respond(message.id, { protocolVersion: message.params?.protocolVersion ?? "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "travel-tools", version: "0.3.0" } });
        break;
      case "tools/list":
        respond(message.id, { tools });
        break;
      case "tools/call": {
        const { name, arguments: args = {} } = message.params ?? {};
        respond(message.id, textResult(await callTool(name, args)));
        break;
      }
      case "ping":
        respond(message.id, {});
        break;
      default:
        send({ jsonrpc: "2.0", id: message.id, error: { code: -32601, message: `Method not found: ${message.method}` } });
    }
  } catch (error) {
    respond(message.id, { content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }], isError: true });
  }
}

function processBuffer() {
  while (true) {
    const marker = buffer.indexOf("\r\n\r\n");
    if (marker === -1) return;
    const header = buffer.subarray(0, marker).toString("utf8");
    const match = /Content-Length:\s*(\d+)/i.exec(header);
    if (!match) {
      buffer = buffer.subarray(marker + 4);
      continue;
    }
    const length = Number(match[1]);
    const start = marker + 4;
    const end = start + length;
    if (buffer.length < end) return;
    const raw = buffer.subarray(start, end);
    buffer = buffer.subarray(end);
    try {
      void handleMessage(JSON.parse(decoder.decode(raw)));
    } catch (error) {
      console.error(error);
    }
  }
}

process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  processBuffer();
});
process.stdin.on("end", () => process.exit(0));
