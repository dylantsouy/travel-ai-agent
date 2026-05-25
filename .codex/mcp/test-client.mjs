#!/usr/bin/env node

import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, "travel-tools-server.mjs");
const child = spawn(process.execPath, [serverPath], {
  stdio: ["pipe", "pipe", "inherit"],
});

let nextId = 1;
let buffer = Buffer.alloc(0);
const pending = new Map();
const decoder = new TextDecoder();
const encoder = new TextEncoder();

function write(message) {
  const body = encoder.encode(JSON.stringify(message));
  child.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
  child.stdin.write(Buffer.from(body));
}

function request(method, params) {
  const id = nextId;
  nextId += 1;
  write({ jsonrpc: "2.0", id, method, params });
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`Timeout waiting for ${method}`));
      }
    }, 20000);
  });
}

function processBuffer() {
  while (true) {
    const marker = buffer.indexOf("\r\n\r\n");
    if (marker === -1) {
      return;
    }

    const header = buffer.subarray(0, marker).toString("utf8");
    const match = /Content-Length:\s*(\d+)/i.exec(header);
    if (!match) {
      buffer = buffer.subarray(marker + 4);
      continue;
    }

    const length = Number(match[1]);
    const start = marker + 4;
    const end = start + length;
    if (buffer.length < end) {
      return;
    }

    const message = JSON.parse(decoder.decode(buffer.subarray(start, end)));
    buffer = buffer.subarray(end);

    const waiter = pending.get(message.id);
    if (waiter) {
      pending.delete(message.id);
      if (message.error) {
        waiter.reject(new Error(message.error.message));
      } else {
        waiter.resolve(message.result);
      }
    }
  }
}

child.stdout.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  processBuffer();
});

try {
  const initialized = await request("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "travel-tools-test-client", version: "0.1.0" },
  });
  console.log("initialize:", initialized.serverInfo);

  write({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

  const list = await request("tools/list", {});
  console.log("tools:", list.tools.map((tool) => tool.name).join(", "));

  const weather = await request("tools/call", {
    name: "travel_weather_forecast",
    arguments: { location: "Osaka", days: 3 },
  });
  console.log("\nweather sample:\n" + weather.content[0].text);

  const currency = await request("tools/call", {
    name: "travel_currency_convert",
    arguments: { amount: 10000, from_currency: "TWD", to_currency: "JPY" },
  });
  console.log("\ncurrency sample:\n" + currency.content[0].text);

  const route = await request("tools/call", {
    name: "travel_route_estimate",
    arguments: {
      origin: "Osaka Station",
      destination: "Dotonbori Osaka",
      mode: "driving",
    },
  });
  console.log("\nroute sample:\n" + route.content[0].text);

  const sequence = await request("tools/call", {
    name: "travel_route_sequence_estimate",
    arguments: {
      stops: [
        "Osaka Station",
        "Kuromon Ichiba Market Osaka",
        "Dotonbori Osaka",
        "Shinsaibashi-suji Shopping Street Osaka",
      ],
      mode: "walking",
    },
  });
  console.log("\nroute sequence sample:\n" + sequence.content[0].text);

  const optimized = await request("tools/call", {
    name: "travel_route_optimize",
    arguments: {
      start: "Osaka Station",
      stops: [
        "Kuromon Ichiba Market Osaka",
        "Dotonbori Osaka",
        "Shinsaibashi-suji Shopping Street Osaka",
      ],
      end: "Osaka Station",
      mode: "driving",
      top_n: 3,
    },
  });
  console.log("\nroute optimize sample:\n" + optimized.content[0].text);

  const sampleRows = [
    {
      day: "2026/6/10",
      location: "[Hotel Example](https://example.com) 🏨",
      event: "wake up / breakfast / depart",
      arrival: "08:00",
      stay: "01:00",
      departure: "09:00",
      transport: "🚕 taxi about 20 min",
      notes: "Breakfast before departure",
      alternatives: "",
    },
    {
      day: "2026/6/10",
      location: "[Dotonbori](https://example.com) 🏖️",
      event: "sightseeing",
      arrival: "09:30",
      stay: "01:30",
      departure: "11:00",
      transport: "🚶 walk 10 min",
      notes: "",
      alternatives: "",
    },
    {
      day: "2026/6/10",
      location: "[Restaurant Example](https://example.com) 🍱",
      event: "eat lunch",
      arrival: "11:30",
      stay: "01:00",
      departure: "12:30",
      transport: "🚕 taxi about 20 min",
      notes: "signature set meal",
      alternatives: "Alt A / Alt B",
    },
    {
      day: "2026/6/10",
      location: "[Hotel Example](https://example.com) 🏨",
      event: "return / sleep",
      arrival: "21:30",
      stay: "01:00",
      departure: "22:30",
      transport: "",
      notes: "",
      alternatives: "",
    },
  ];

  const csv = await request("tools/call", {
    name: "travel_export_itinerary_csv",
    arguments: { rows: sampleRows },
  });
  console.log("\ncsv sample:\n" + csv.content[0].text.split("\n").slice(0, 3).join("\n"));

  const xlsx = await request("tools/call", {
    name: "travel_export_itinerary_xlsx",
    arguments: { rows: sampleRows, output_path: join(tmpdir(), "travel-agent-sample-itinerary.xlsx") },
  });
  console.log("\nxlsx sample:\n" + xlsx.content[0].text);

  const validation = await request("tools/call", {
    name: "travel_validate_itinerary_day",
    arguments: { rows: sampleRows },
  });
  console.log("\nvalidator sample:\n" + validation.content[0].text);

  const tours = await request("tools/call", {
    name: "travel_dedupe_tours",
    arguments: {
      tours: [
        { title: "Klook Kobe and Arima Onsen Day Tour" },
        { title: "KKday Kobe Arima Onsen One Day Trip" },
        { title: "Kyoto and Nara Day Tour from Osaka" },
        { title: "Wakayama Koyasan Day Trip" },
      ],
    },
  });
  console.log("\ntour dedupe sample:\n" + tours.content[0].text);

  const budget = await request("tools/call", {
    name: "travel_budget_estimate",
    arguments: {
      travelers: 2,
      days: 5,
      nights: 4,
      local_currency: "JPY",
      exchange_rate: 0.198,
      items: [
        { name: "Hotel", amount: 16000, per_night: true, note: "room per night" },
        { name: "Meals", amount: 5000, per_person: true, per_day: true },
        { name: "Local transport", amount: 2000, per_person: true, per_day: true },
      ],
    },
  });
  console.log("\nbudget sample:\n" + budget.content[0].text);

  const placeName = await request("tools/call", {
    name: "travel_format_place_name",
    arguments: {
      user_name: "聖地牙哥堡",
      original_name: "Fort Santiago",
      category: "historic",
    },
  });
  console.log("\nplace format sample:\n" + placeName.content[0].text);

  const structuredDays = [
    {
      title: "2026/6/10（三）｜大阪",
      date: "2026/6/10",
      rows: sampleRows,
      summary: "This day keeps the route compact and returns to the hotel at night.",
    },
  ];

  const schemaValidation = await request("tools/call", {
    name: "travel_itinerary_schema_validate",
    arguments: { days: structuredDays },
  });
  console.log("\nschema validation sample:\n" + schemaValidation.content[0].text);

  const markdown = await request("tools/call", {
    name: "travel_itinerary_to_markdown",
    arguments: { days: structuredDays },
  });
  console.log("\nmarkdown render sample:\n" + markdown.content[0].text.split("\n").slice(0, 6).join("\n"));

  const markdownLint = await request("tools/call", {
    name: "travel_markdown_table_lint",
    arguments: { markdown: markdown.content[0].text },
  });
  console.log("\nmarkdown lint sample:\n" + markdownLint.content[0].text);
} finally {
  child.stdin.end();
}
