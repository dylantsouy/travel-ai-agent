# Travel Tools MCP

這是一個給 Travel Agent 練習 MCP 的本地 stdio server，不需要 npm 套件。

## 工具

- `travel_geocode`：用 Open-Meteo Geocoding 查地點座標、國家與時區。
- `travel_weather_forecast`：用 Open-Meteo 查 1-14 天天氣預報。
- `travel_currency_convert`：用 open.er-api.com 查即時參考匯率。
- `travel_route_estimate`：用 OpenStreetMap / OSRM 估算步行或開車 / 計程車距離與時間，不提供大眾運輸班次。
- `travel_route_sequence_estimate`：用 OpenStreetMap / OSRM 估算多個行程點之間的每段距離、每段時間與總移動時間，用於檢查一日動線是否折返。
- `travel_route_optimize`：嘗試多個景點排列，回傳總移動時間較短的候選順序，用於減少折返。
- `travel_export_itinerary_csv`：把行程表列輸出成 CSV，或寫入指定檔案。
- `travel_export_itinerary_xlsx`：把行程表列輸出成 Excel `.xlsx` 檔案。
- `travel_validate_itinerary_day`：檢查單日行程表欄位語義、交通欄、icon 位置與餐廳備選數量。
- `travel_dedupe_tours`：把 1 day tour 商品依路線 / 主題分組去重。
- `travel_budget_estimate`：依人數、天數、晚數、匯率與費用項目估算預算。
- `travel_format_place_name`：依使用者語言 / 原文 / 類型格式化地點名稱，並把 icon 放在文字後。
- `travel_itinerary_schema_validate`：驗證整份結構化多日行程資料是否符合正式表格欄位與基本規則。
- `travel_itinerary_to_markdown`：把結構化多日行程 rows 轉成 Travel Agent 正式 Markdown 表格。
- `travel_markdown_table_lint`：檢查 Markdown 表格欄位數、每日表頭與常見正式輸出問題。

## 本地測試

```powershell
node .codex\mcp\test-client.mjs
```

成功時會看到：

```text
tools: travel_geocode, travel_weather_forecast, travel_currency_convert, travel_route_estimate, travel_route_sequence_estimate, travel_route_optimize, travel_export_itinerary_csv, travel_export_itinerary_xlsx, travel_validate_itinerary_day, travel_dedupe_tours, travel_budget_estimate, travel_format_place_name, travel_itinerary_schema_validate, travel_itinerary_to_markdown, travel_markdown_table_lint
```

## Codex MCP 設定範例

把下面片段加入 `%USERPROFILE%\.codex\config.toml` 後，重新啟動 Codex：

```toml
[mcp_servers.travel_tools]
command = "node"
args = ["C:\\Users\\bear8\\Downloads\\travel-ai-agent\\.codex\\mcp\\travel-tools-server.mjs"]
startup_timeout_sec = 30
```

之後 Travel Agent 可以把天氣、匯率與地點座標查詢改成優先呼叫 MCP 工具。
