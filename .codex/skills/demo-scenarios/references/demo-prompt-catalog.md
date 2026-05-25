# Demo Prompt Catalog

Use these prompts when the user wants ready-to-run Travel Agent demos. Adjust dates and destination if the user gives a preferred scenario.

## 3 分鐘：需求表單守門

```text
請用 Travel Agent 規劃大阪 6 天 5 夜。
2 人，台北出發，2026/11/5 出發。
```

Expected showcase:
- Agent should not immediately produce a full formal itinerary because preferences are missing.
- Agent should output the one-time preference form with destination-specific examples and 1 day tour reference options.

## 7 分鐘：行程健檢

```text
請用 itinerary-auditor 幫我健檢這份大阪行程是否可照走：

Day 1：12:30 抵達關西機場，13:00 到難波飯店寄放行李，13:20 去大阪城，15:00 去京都清水寺，18:00 回道頓堀吃晚餐，21:00 check in。
Day 2：環球影城一整天，晚上再去神戶看夜景。
Day 3：早上退房後拖行李去黑門市場、心齋橋購物，下午搭車去京都，晚上入住京都。
```

Expected showcase:
- Catch impossible airport-to-city timing.
- Catch cross-city overpacking and late check-in issues.
- Catch luggage handling problems.
- Suggest focused fixes without rewriting the whole itinerary unless asked.

## 12 分鐘：正式行程加版本差異

```text
請用 Travel Agent 先照預設直接排福岡 5 天 4 夜，2 人，台北出發，2026/7/10 出發，不自駕，標準強度。
```

Follow-up prompt:

```text
請用 itinerary-diff 把這份福岡行程改成輕鬆版，先不要整份重貼，只列出差異、取捨、預算與交通影響。
```

Expected showcase:
- First prompt demonstrates full planning with flights, lodging nodes, meals, transport, budget, weather and visa reminders.
- Follow-up demonstrates iterative modification without flooding the user with the full itinerary again.

## 多風格比較

```text
請用 itinerary-diff 示範同一趟東京 5 天 4 夜，在標準版、親子版、背包客版、高端版之間會有哪些差異。先做比較表，不用排完整行程。
```

Expected showcase:
- Clear audience-specific tradeoffs.
- No unnecessary live search unless prices, flights, availability or rules are requested.

## 雨天備案

```text
請用 Travel Agent 示範把大阪行程第 3 天改成雨天備案，只輸出第 3 天差異與替代動線。
```

Expected showcase:
- Preserve original constraints.
- Replace exposed outdoor segments with indoor or covered routes.
- Keep meals, luggage, and return-to-hotel logic intact.

## Tour 去重比較

```text
請用 tour-dedupe-comparer 比較大阪出發的一日遊，預設 2 人、不自駕、想看中文導遊選項；不要把同一路線的不同平台商品列成多個選項。
```

Expected showcase:
- Group similar products by route or theme before recommending.
- Show different experience directions instead of duplicate platform listings.
- Compare language, meeting point, approximate price, cancellation rules, and who each option fits.

## 行程匯出

```text
請用 itinerary-exporter 把這份行程整理成 Google Maps 搜尋清單欄位，不用重排行程。
```

Follow-up prompt:

```text
請用 itinerary-exporter 把這份行程匯出成 Excel，欄位包含日期、地點、事件、抵達、出發、交通、備註。
```

Expected showcase:
- Convert itinerary content into structured rows without changing the itinerary.
- Produce CSV or XLSX when local tools are available.
- Keep missing data empty or marked as unconfirmed instead of inventing addresses or times.
