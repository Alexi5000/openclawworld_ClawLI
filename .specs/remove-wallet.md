# Remove Wallet / Currency System Spec

## Overview
Completely remove the wallet, coin currency, coin transfers, bot shop purchases, and all related UI, state, socket events, server handlers, and database references from the codebase. The quest reward system should be preserved structurally but with coin rewards stripped out.

---

## Task 1: Delete WalletPanel component (CLIENT)

### What
Remove the entire `WalletPanel.jsx` component file.

### Files
- **Delete** `client/src/components/WalletPanel.jsx`

### Validation
- No imports of `WalletPanel` remain anywhere in the codebase

---

## Task 2: Remove wallet atoms and coin socket events from SocketManager (CLIENT)

### What
Remove the `coinsAtom` and `walletOpenAtom` Jotai atoms, and all coin/purchase-related socket event handlers.

### Files
- `client/src/components/SocketManager.jsx`

### Changes
1. **Remove atoms** (around line 40, 45):
   - `coinsAtom` (initial value: 100)
   - `walletOpenAtom` (initial value: false)
2. **Remove socket listeners and handlers:**
   - `onCoinsUpdate` handler (~line 231)
   - `coinsTransferSuccess` handler (~line 359-364)
   - `coinsTransferReceived` handler (~line 365-370)
   - `purchaseComplete` handler (~line 434-435)
   - All corresponding `socket.on(...)` registrations (~lines 698-703, 746-748)
   - All corresponding `socket.off(...)` cleanup calls
3. **Remove activity log entries** for:
   - `addActivity("coins_sent", ...)`
   - `addActivity("coins_received", ...)`
   - `addActivity("purchase", ...)`
4. **Keep all exports intact** — remove `coinsAtom` and `walletOpenAtom` from the export list

### Validation
- No references to `coinsAtom`, `walletOpenAtom`, `coinsTransfer`, or `purchaseComplete` remain in SocketManager
- Other atoms and socket events are unaffected

---

## Task 3: Remove wallet UI from UI.jsx (CLIENT)

### What
Remove the coin balance display, the wallet toggle button, and the WalletPanel render from the main UI component.

### Files
- `client/src/components/UI.jsx`

### Changes
1. **Remove imports** (~line 16, 28, 32):
   - Remove `coinsAtom` import
   - Remove `walletOpenAtom` import
   - Remove `WalletPanel` import
2. **Remove `useAtom` calls** for `coinsAtom` and `walletOpenAtom`
3. **Remove coin balance display button** (~lines 1500-1516) — the amber-styled button showing coin count
4. **Remove wallet toggle logic** (~lines 1375, 1503-1508, 1754, 1779-1783)
5. **Remove `<WalletPanel />` render** (~line 1568)
6. **Remove wallet button from bottom menu** (~lines 1772-1792) — the wallet icon and label

### Validation
- No wallet icon, coin count, or wallet panel renders in the UI
- UI builds without errors
- Other UI elements (chat, minimap, etc.) are unaffected

---

## Task 4: Remove coin references from DirectMessagePanel (CLIENT)

### What
Remove the coin balance display and bot shop functionality from the DM panel.

### Files
- `client/src/components/DirectMessagePanel.jsx`

### Changes
1. **Remove `coinsAtom` import and usage** (~line 10, 23)
2. **Remove bot shop interaction** (~lines 77-86) — the `getBotShop` socket emit
3. **Remove shop item display** with coin prices
4. If the shop tab becomes empty, remove the tab entirely or replace with a placeholder

### Validation
- DM panel works without coin references
- Bot conversations still function (minus shop)

---

## Task 5: Remove purchase event from ActivityFeed (CLIENT)

### What
Remove the `purchase` event type from the activity feed.

### Files
- `client/src/components/ActivityFeed.jsx`

### Changes
1. **Remove `purchase` from `typeConfig`** (~line 19)
2. Remove any rendering logic specific to purchase events

### Validation
- Activity feed renders without errors
- Other event types are unaffected

---

## Task 6: Remove coin transfer and shop socket handlers (SERVER)

### What
Remove all coin transfer and bot shop purchase socket event handlers from the server.

### Files
- `server/socketHandlers.js`

### Changes
1. **Remove `coins:transfer` handler** (~lines 1131-1199):
   - Rate limiting, amount validation, recipient validation, self-transfer prevention, atomic transfer, emitted events
2. **Remove `getBotShop` handler** (~line 1205)
3. **Remove `purchaseItem` handler** (~lines 1220-1257):
   - Coin balance check, deduction, item addition, emitted events
4. **Remove coins from welcome/roomJoined responses** (~lines 369, 382, 405, 569):
   - Remove `coins` field from the data sent to the client on connection/room join
5. **Remove any imports** from `currencyQuests.js` used only for these handlers

### Validation
- Server starts without errors
- No `coins:transfer`, `getBotShop`, or `purchaseItem` handlers remain
- Room join still works (just without coins data)

---

## Task 7: Delete currencyQuests.js (SERVER)

### What
Remove the entire currency and quest-reward-coins module.

### Files
- **Delete** `server/currencyQuests.js`

### Changes
1. **Delete the file** — contains `DEFAULT_COINS`, `playerCoins`, `getCoins`, `setCoins`, `updateCoins`, `transferCoins`, `checkQuestCompletion`
2. **Update `server/index.js`** (~line 19): remove the import of currencyQuests
3. **Update any other files** that import from `currencyQuests.js`

### Note
If `checkQuestCompletion` is used for non-coin quest tracking, extract just the completion-tracking logic and move it to a separate module. If it's only used for coin rewards, delete entirely.

### Validation
- Server starts without import errors
- No references to `currencyQuests` remain

---

## Task 8: Remove coin functions from userStore.js (SERVER)

### What
Remove all coin-related functions from the user store.

### Files
- `server/userStore.js`

### Changes
1. **Remove `DEFAULT_COINS` export** (100)
2. **Remove functions** (~lines 141-207):
   - `setUserCoins(userId, coins)`
   - `updateUserCoins(userId, delta)`
   - `transferCoinsAtomic(fromUserId, toUserId, amount)`
3. **Keep quest tracking functions** if they serve purposes beyond coins:
   - `hasCompletedQuest` — keep if used for general quest tracking
   - `recordCompletedQuest` — keep if used for general quest tracking, but remove `reward` parameter if it's only coins

### Validation
- No coin-related exports remain in userStore
- Other user store functions (get/set user, etc.) are unaffected

---

## Task 9: Remove coin columns and functions from db.js (SERVER)

### What
Remove the coins column from the users table schema and all coin-related database functions.

### Files
- `server/db.js`

### Changes
1. **Remove `coins` column from schema** (~line 80): remove `coins INTEGER NOT NULL DEFAULT 100` from users table creation
2. **Remove `completed_quests` table** (~line 148-152) — if only used for coin quest rewards
3. **Remove database functions:**
   - `setUserCoins(id, coins)` (~line 367)
   - `updateUserCoinsAtomic(userId, delta)` (~line 383)
   - `transferCoinsAtomic(fromId, toId, amount)` (~lines 391-426)
   - `recordCompletedQuest(userId, questId, reward)` (~line 1227)
4. **Remove `coins` from user query results** (~lines 196, 340, etc.) — remove from SELECT statements or strip from returned objects
5. **Note:** For existing databases, the column will persist but won't be read/written. If a migration system exists, add a migration to drop the column. If not, leave it — it's harmless as dead data.

### Validation
- Fresh database creation works without coins column
- User queries return user objects without `coins` field
- No coin-related DB functions remain

---

## Task 10: Remove coin-related HTTP routes (SERVER)

### What
Remove any HTTP API endpoints related to coins/wallet if they exist.

### Files
- `server/httpRoutes.js`

### Changes
1. Check for and remove any coin/wallet/shop-related HTTP routes
2. Remove any documentation comments about coin endpoints

### Validation
- HTTP routes file has no coin references

---

## Task 11: Delete test files (TESTS)

### What
Remove wallet/coin-related test files.

### Files
- **Delete** `tests/manual/test-coin-transfer.js`

### Validation
- No test files reference coins or wallet

---

## Task 12: Final sweep and cleanup

### What
Global search for any remaining references to the wallet/coin system.

### Search terms
- `wallet`, `Wallet`, `WALLET`
- `coins`, `Coins`, `COINS`, `coin`
- `coinsAtom`, `walletOpenAtom`
- `coinsTransfer`, `coinsUpdate`
- `purchaseItem`, `purchaseComplete`, `purchaseError`
- `getBotShop`, `botShop`
- `currencyQuests`
- `DEFAULT_COINS`
- `playerCoins`
- `transferCoins`
- `reward_coins`

### Validation
- Zero results for all search terms across the codebase (excluding this spec file and git history)
- Client builds successfully (`cd client && npm run build` or equivalent)
- Server starts successfully (`cd server && node index.js` or equivalent)
- No console errors related to missing wallet/coin functionality

---

## Execution Order

Recommended order to minimize broken intermediate states:

1. **Tasks 6-9** (Server) — Remove handlers, modules, store functions, DB functions
2. **Tasks 2-5** (Client) — Remove atoms, UI, DM panel, activity feed
3. **Task 1** (Client) — Delete WalletPanel component
4. **Task 10** (Server) — Clean up HTTP routes
5. **Task 11** (Tests) — Delete test files
6. **Task 12** — Final sweep

---

## Risk Notes

- **Quest system dependency:** The quest completion system awards coins. If quests are still desired without coins, the reward mechanism needs to be either removed or replaced with a different reward type (e.g., XP, badges). If quests aren't used, remove the quest tracking too.
- **Bot shop:** Removing coins kills the bot shop purchase flow. Bot conversations will still work but items can't be bought. If bot shops should persist with a different currency later, leave the shop UI skeleton but disable purchases.
- **Database migration:** Existing databases will retain the `coins` column and `completed_quests` table. This is harmless dead data but can be cleaned up with a manual migration if desired.
