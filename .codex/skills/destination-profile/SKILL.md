---
name: destination-profile
description: "常見旅遊目的地快取，用於快速取得穩定的機場交通、住宿區、景點分區、動線骨架與官方查證入口。Use when: 規劃東京、大阪、京都、神戶、福岡、九州、首爾、曼谷等常見目的地，或需要 destination profile, destination cache, city overview, common travel routes."
---

# 目的地快取（Destination Profile）

用於節省從零搜尋的時間。快取只放相對穩定的資訊：機場 / 車站、住宿區、景點分區、常見動線、官方查證入口與季節風險。不要把快取當作最新票價、營業時間、班次、天氣或簽證。

## 使用方式

1. 依目的地只讀一個最相關 reference。
2. 用快取建立住宿區、行程分區與首末日動線骨架。
3. 需要正式行程時，仍依 `AGENTS.md` 的查證來源優先級確認航班、天氣、營業時間、票價、班次、餐廳與住宿規則。

## 可用快取

- 東京：`references/tokyo.md`
- 大阪 / 京都 / 神戶：`references/kansai-osaka-kyoto-kobe.md`
- 福岡 / 九州北部：`references/fukuoka-kyushu.md`
- 首爾：`references/seoul.md`
- 曼谷：`references/bangkok.md`

若目的地不在清單中，不要硬套快取；直接用相關 skills 查證。
