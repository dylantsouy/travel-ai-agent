---
name: demo-scenarios
description: "提供 Travel Agent 展示用情境、示範 prompt、展示流程、講解重點與 demo 取捨。Use when: 使用者要求 demo、展示給同事、設計展示腳本、產生示範 prompt、準備 showcases、demo scenarios, demo flow, showcase script, sample prompts."
---

# 展示情境（Demo Scenarios）

本 skill 只在使用者明確要求「展示、demo、給同事看、示範 prompt、展示腳本」時使用。它負責設計展示流程與可複製 prompt，不改變正式行程、健檢或差異比較的預設輸出。

## 使用方式

- 若使用者只問「可以展示什麼」，先輸出 3-5 個展示功能與建議順序，不啟動查證。
- 若使用者要「幫我準備 demo」，依時間長度輸出可直接複製的 prompt、預期展示亮點與講解重點。
- 若使用者說「直接跑其中一個 demo」，再依 demo prompt 觸發對應 Travel Agent、`itinerary-auditor`、`itinerary-diff`、`weather-contingency`、`tour-dedupe-comparer` 或 `itinerary-exporter` 流程。
- 需要最新航班、天氣、匯率、簽證、營業時間、票價或 tour 狀態時，仍遵守 `AGENTS.md` 的查證規則。
- 不要把 demo 講解文字混入正式行程輸出；正式行程仍依 `itinerary-output-format`。

## 展示節奏

### 3 分鐘快閃

展示重點：需求表單、規則感、避免直接亂排。

1. 用「目的地 + 日期 + 出發地」但不給偏好，展示一次性需求表單。
2. 說明 agent 不會在偏好不足時直接產生看似完整但不貼近需求的正式行程。
3. 若同事想看完整行程，再補一句「照預設直接排」進入正式規劃。

### 7 分鐘專業度展示

展示重點：行程可行性、行李節點、交通與餐廳實名化。

1. 先展示一段故意有問題的行程，使用 `itinerary-auditor` 做健檢。
2. 接著請 agent 提出修正方向，但不要重排完整行程。
3. 強調它會抓拖行李逛景點、交通時間過短、餐廳繞路、缺營業時間等問題。

### 12-15 分鐘完整展示

展示重點：多技能組合、正式行程、版本迭代與差異說明。

1. 用「照預設直接排」產生一版正式行程。
2. 請 agent 改成親子 / 背包客 / 輕鬆版。
3. 用 `itinerary-diff` 列出新版與原版的差異、取捨與預算 / 步行 / 交通影響。
4. 若時間足夠，補 `tour-dedupe-comparer` 或 `itinerary-exporter`，展示從規劃走到比較與交付。

## 輸出格式

準備 demo 時使用：

```text
## Demo 目標
...

## 建議流程
1. ...

## 可複製 Prompt
...

## 預期亮點
- ...

## 講解備註
- ...
```

## 參考資源

需要精選可複製 prompts 時，讀 `references/demo-prompt-catalog.md`。
