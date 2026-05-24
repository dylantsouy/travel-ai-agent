# Travel Agent for Codex

這是一組給 Codex 使用的旅遊規劃 agents 與 skills。你只要用自然語言說明目的地、日期、天數、人數與偏好，Codex 就會依規則規劃可執行行程，包含航班、住宿、交通班次、餐廳、預算、天氣、簽證、匯率與每日時間表。

## 最快開始

在 Codex 開啟這個資料夾：

```powershell
cd C:\Users\bear8\Downloads\travel-ai-agent
```

然後直接輸入：

```text
請用 Travel Agent 規劃福岡 5 天 4 夜，2 人，7/10 台北出發。
```

如果你有特殊旅遊風格，可以直接指定 agent：

```text
請用 Luxury Travel Agent 規劃東京 5 天 4 夜，想住高端飯店，晚餐安排 Fine Dining。
請用 Backpacker Travel Agent 規劃關西 6 天 5 夜，預算優先，可住青旅。
請用 Family Travel Agent 規劃福岡 5 天 4 夜，有 2 歲小孩，需要推車友善與午睡時間。
```

## 該用哪個 Agent

| 你想要的旅行 | 請這樣說 | 適合情境 |
|---|---|---|
| 一般標準行程 | `請用 Travel Agent...` | 第一次規劃、標準觀光、美食、交通、住宿、預算 |
| 高端旅行 | `請用 Luxury Travel Agent...` | 高端飯店、Fine Dining、米其林、包車、蜜月、紀念日 |
| 省錢旅行 | `請用 Backpacker Travel Agent...` | 青旅、廉航、夜巴、交通票券、低預算 |
| 親子 / 長輩 | `請用 Family Travel Agent...` | 推車、哺乳室、少走路、午睡、長輩、無障礙 |

沒有指定特殊 agent 時，預設使用一般 `Travel Agent`。特殊 agents 不會影響一般行程。

## 建議輸入格式

可以很簡短：

```text
請用 Travel Agent 規劃大阪 6 天 5 夜。
2 人，台北出發，11/5 出發。
```

也可以填完整一點：

```text
請用 Travel Agent 規劃：

目的地：
日期 / 天數：
出發地：
人數：
預算：
行程強度：輕鬆 / 標準 / 緊湊 / 沒想法
交通方式 / 是否自駕：不自駕 / 優先大眾運輸 / 可接受計程車 / 可包車 / 會自駕 / 沒想法
住宿偏好：
飲食禁忌：
一定要去 / 吃 / 買：
想避開的景點 / 餐廳 / 住宿：
特殊行程：
是否想參加 1 day tour：
```

如果你沒有提供偏好，agent 會先給你一份「一次性需求表單」。你可以填「沒想法」，它就會照預設安排。

### 一次性需求表單範例

當你只提供「目的地、天數、日期、出發地、人數」時，agent 會先請你一次填：

```text
1. 行程強度：
   例：輕鬆、標準、緊湊、大家庭不方便跑太多點、有嬰兒需哺乳室、行動不便需無障礙、沒想法
2. 交通方式 / 是否自駕：
   例：不自駕、優先大眾運輸、可接受計程車、不想走太多路、可包車、會自駕、沒想法
3. 睡眠時間：
   例：7 點起 10 點睡、早起晚睡、重睡眠、睡少也可以、沒想法
4. 旅行目的：
   例：美食、購物、景點、飯店設施、遊樂園、歷史文物、在地文化、沒想法
5. 一定要去 / 住 / 吃 / 體驗：
6. 飲食禁忌：
7. 想避開的景點 / 餐廳 / 住宿：
8. 想買的東西：
9. 特殊行程：
10. 是否想參加 1 day tour：
    例：想參加請安排 1 天（中文導遊）、想參加請安排 2 天（英文導遊）、不想參加、直接貼上想要的行程連結或名稱、沒想法
```

若有 1 day tour 參考選項，agent 會放在表單外面，保留可點擊連結；表單本身只顯示一次，方便整段複製填寫。

## 會輸出什麼

Travel Agent 會盡量輸出可以直接照著走的版本：

- 採用航班與備選航班
- 航班機型與安全關注
- 每日時間精算表
- 飯店起床、早餐、出門、check in / check out
- 行李寄放、置物櫃、取行李、搭車地點
- 採用交通方案與具體班次
- 採用餐廳與 2 家備選餐廳
- 值得買的伴手禮、點心、零食
- 天氣與必要風險提醒
- 預算估算與台幣 / 當地貨幣換算
- 出發前確認事項與可點擊連結

每日行程表主要欄位：

```text
地點 | 待處理事件 | 抵達 | 停留 | 出發 | 採用交通 | 備註 | 備選
```

## 輸出規則重點

- 每天第一列一定從飯店開始，標示起床、早餐、整理行李、出門時間。
- 每天最後一列一定回飯店，並標示預計睡覺時間。
- 不會讓你拖著大行李逛景點；會安排寄放行李或置物櫃。
- 交通只放已精算的採用方案，不列一堆會打亂時間的第二方案。
- 餐廳會寫實際店名，不只寫「拉麵」「明太子」。
- 備選景點與備選餐廳會放在 `備選` 欄。
- 備註盡量精簡，只寫使用者需要看的提醒。
- 景點、餐廳、飯店、訂票頁會盡量用可點擊短連結。
- Boeing 737 MAX 8 / MAX 9 標高關注；Boeing 787 / 777 標中關注。

## Agent 架構

目前採用「1 個主入口 + 多個專門入口 + 共用 skills」：

```text
Travel Agent / Travel Planner Manager
├─ Luxury Travel Agent
├─ Backpacker Travel Agent
├─ Family Travel Agent
└─ 共用 skills：航班、住宿、交通、美食、天氣、簽證、預算、匯率
```

- `travel-agent.agent.md`：一般行程主入口，負責整理需求、排流程、決定要用哪些 skills。
- `luxury-travel-agent.agent.md`：高端飯店、Fine Dining、包車、蜜月、紀念日。
- `backpacker-travel-agent.agent.md`：省錢、青旅、廉航、夜巴、交通票券。
- `family-travel-agent.agent.md`：親子、推車、哺乳室、長輩、無障礙、少走路。

## 專案結構

```text
travel-ai-agent/
├── AGENTS.md
├── README.md
├── .codex/
│   ├── agents/
│   │   ├── travel-agent.agent.md
│   │   ├── luxury-travel-agent.agent.md
│   │   ├── backpacker-travel-agent.agent.md
│   │   └── family-travel-agent.agent.md
│   └── skills/
│       ├── budget-calculator/
│       ├── currency-converter/
│       ├── flight-search/
│       ├── food-recommender/
│       ├── hotel-recommender/
│       ├── itinerary-planner/
│       ├── map-distance/
│       ├── visa-checker/
│       └── weather-checker/
```

## Codex 會讀哪些檔案

在這個資料夾使用時，Codex 會依需求讀取：

- `AGENTS.md`：共用總規則
- `.codex/agents/*.agent.md`：你指定的 agent
- `.codex/skills/*/SKILL.md`：任務需要的技能，例如航班、交通、餐廳、住宿

通常你不需要手動指定 skill；直接說「請用 Travel Agent 規劃...」即可。

## 安裝到 Codex 使用者技能目錄

如果你希望任何工作區都能使用這些 skills，可以把 `.codex/skills` 複製到你的 Codex skills 目錄：

```powershell
$src = "C:\Users\bear8\Downloads\travel-ai-agent\.codex\skills"
$dest = "$env:USERPROFILE\.codex\skills"
Copy-Item -LiteralPath "$src\*" -Destination $dest -Recurse -Force
```

之後在任意 Codex 對話中可以直接提到相關任務，例如「規劃日本行程」、「查台幣換日圓」、「估算旅遊預算」。

## 注意事項

- 航班、機型、匯率、天氣、簽證、飯店價格、交通班次、景點與餐廳營業時間都需要即時查證。
- 若日期太遠查不到天氣，agent 會先用季節風險安排，並把必要確認項目放在「出發前確認」。
- 若資料來源查不到，agent 會標示「未確認」，不會硬編店名、班次、機型或價格。
- Agent 無法直接代訂機票、飯店或餐廳，但會提供官方或主流平台連結。
