---
name: itinerary-exporter
description: "將旅遊行程整理成可匯出的結構化格式，例如 CSV、Excel、Google Sheets、行事曆欄位、Google Maps 搜尋清單或 Markdown 表格。Use when: 使用者要求匯出、下載、轉 Excel、轉 CSV、Google Sheets、calendar、map list、export itinerary."
---

# 行程匯出（Itinerary Exporter）

本 skill 用於把已完成或貼上的行程轉成可匯出的結構化資料。預設不改寫行程內容，只整理欄位、補齊必要欄名與匯出格式；若資料不足，標記空值或未確認。

正式行程結尾的「匯出提示」只用來提醒使用者有匯出功能；不要因為看到提示就自動啟動本 skill。只有使用者明確回覆「匯出成 Excel / CSV / Google Maps 清單 / 行事曆」或點擊宿主介面的匯出 action button 時，才開始產生檔案或結構化欄位。

## 使用流程

1. 判斷目標格式：CSV、Excel `.xlsx`、Google Sheets、行事曆、Google Maps 搜尋清單、Markdown 表格或純文字清單。
2. 從行程抽出日期、地點、事件、抵達、停留、出發、採用交通、備註、備選、地址 / 連結、訂位 / 訂票狀態。
3. 不可重新發明未提供的精準時間、地址、票價或訂位狀態；查不到就留空或標「未確認」。
4. 若 `travel_tools` MCP server 可用，優先使用：
   - 用 `travel_itinerary_schema_validate` 驗證多日結構。
   - 用 `travel_markdown_table_lint` 檢查 Markdown 表格。
   - 用 `travel_export_itinerary_csv` 匯出 CSV。
   - 用 `travel_export_itinerary_xlsx` 匯出 Excel。
5. 若 MCP 工具不可用，但本地可執行 Python，使用 `scripts/export_itinerary.py` 產生 CSV / XLSX。
6. 若無法產生實體檔，輸出可直接貼到試算表的表格或 CSV code block，並說明尚未產生實體檔。

## 本地匯出 script

`scripts/export_itinerary.py` 可讀 `.json`、`.csv`、`.md` 或 `.txt`。建議先把行程整理成 JSON；也可直接輸入 Travel Agent 的 Markdown 表格。

JSON 支援三種結構：

```json
[
  {
    "date": "2026/7/10",
    "location": "飯店",
    "event": "check in",
    "arrival": "15:00",
    "departure": "16:00"
  }
]
```

```json
{ "rows": [ ... ] }
```

```json
{
  "days": [
    {
      "date": "2026/7/10",
      "rows": [ ... ]
    }
  ]
}
```

常用命令：

```powershell
python .codex\skills\itinerary-exporter\scripts\export_itinerary.py --input itinerary.json --format both --kind itinerary --output fukuoka-itinerary.xlsx
```

```powershell
python .codex\skills\itinerary-exporter\scripts\export_itinerary.py --input itinerary.md --format xlsx --kind maps --output fukuoka-map-list.xlsx
```

`--kind` 可用：

- `itinerary`：主行程表欄位。
- `maps`：Google Maps 搜尋清單欄位。
- `calendar`：行事曆匯入欄位。

## 欄位建議

### 行程表

```text
date,day,location,event,arrival,duration,departure,transport,notes,alternatives,link,status
```

### Google Maps 搜尋清單

```text
date,sequence,place_name,search_query,category,notes
```

### 行事曆

```text
title,start_date,start_time,end_date,end_time,location,description
```

## 輸出規則

- 使用者要求實體檔時，優先建立 `.csv` 或 `.xlsx`，檔名使用目的地、日期與格式，例如 `fukuoka-itinerary-2026-07-10.xlsx`。
- 匯出前先檢查每日表格欄位數一致、日期不跨錯、最後一列交通欄留空。
- 若行程包含 Markdown 連結，CSV / Excel 中保留可讀地名與連結欄，不把整個 Markdown 語法塞進地名欄。
- 不要把內部查證表或來源清單自動匯出；除非使用者要求，匯出主行程即可。
- 產生實體檔後，回覆檔案的絕對路徑與筆數；不要要求使用者手動複製檔案內容。

## 回覆格式

```text
已整理成：CSV / Excel / Google Sheets 欄位 / Google Maps 清單
檔案：若有產生實體檔，提供路徑。
提醒：列出缺漏欄位或未確認資料。
```
