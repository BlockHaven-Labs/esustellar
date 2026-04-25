#!/usr/bin/env bash
# ============================================================
# EsuStellar — Mobile Issues Creation Script
# ============================================================
# Usage:
#   GITHUB_TOKEN=<your_pat> bash scripts/create-mobile-issues.sh
#
# Requirements:
#   - A GitHub Personal Access Token with `repo` scope
#   - curl and node (Node.js) installed
# ============================================================

set -euo pipefail

REPO="BlockHaven-Labs/esustellar"
API="https://api.github.com/repos/$REPO/issues"
TOKEN="${GITHUB_TOKEN:?Please set GITHUB_TOKEN to a GitHub PAT with 'repo' scope}"

# Validate the token before creating any issues
_check=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user)
if [[ "$_check" != "200" ]]; then
  echo "❌  Token validation failed (HTTP $_check)."
  echo "    Make sure GITHUB_TOKEN is a valid PAT with 'repo' scope."
  echo "    Verify it with: curl -s -H \"Authorization: Bearer \$GITHUB_TOKEN\" https://api.github.com/user | grep login"
  exit 1
fi

create_issue() {
  local title="$1"
  local body="$2"
  local labels_json="$3"   # e.g. '["mobile","good first issue"]'

  local payload
  payload=$(node -e "
const [,t,b,l]=process.argv;
process.stdout.write(JSON.stringify({title:t,body:b,labels:JSON.parse(l)}).replace(/[^\x00-\x7F]/g,c=>'\\\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')));
" "$title" "$body" "$labels_json")

  local response
  response=$(curl -s -w "\n%{http_code}" -X POST "$API" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    -H "Content-Type: application/json" \
    --data-binary "$payload")

  local http_code
  http_code=$(echo "$response" | tail -1)
  local body_resp
  body_resp=$(echo "$response" | head -n -1)

  if [[ "$http_code" == "201" ]]; then
    local num
    num=$(echo "$body_resp" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>process.stdout.write(String(JSON.parse(d).number||'?')))")
    echo "✅  #$num  $title"
  else
    echo "❌  HTTP $http_code — $title"
    echo "    $(echo "$body_resp" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>process.stdout.write(JSON.parse(d).message||''))")"
  fi

  sleep 0.8   # stay well within GitHub's rate limit
}

echo ""
echo "=============================================="
echo "  EsuStellar Mobile Issues Creator"
echo "  Repo: $REPO"
echo "  Batch: 40 new issues (continuing from #132)"
echo "=============================================="
echo ""

# ─────────────────────────────────────────────────────────────
# NEW ISSUES BATCH — 40 issues (continuing from #132)
# ─────────────────────────────────────────────────────────────
echo ""
echo "── Testing ────────────────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# TESTING  (5 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Set up Jest and React Native Testing Library for the mobile app" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

Before writing tests we need a working test harness. Jest ships with Expo but needs configuration for path aliases and module mocking. React Native Testing Library (RNTL) is the recommended way to test components.

---

### 🛠️ Tasks

- [ ] Confirm \`jest\` and \`@testing-library/react-native\` are listed in devDependencies
- [ ] Create \`mobile/jest.config.js\` with \`preset: 'jest-expo'\` and \`moduleNameMapper\` for \`@/\` path alias
- [ ] Add a \`__mocks__\` folder with stubs for \`expo-router\` and \`expo-haptics\`
- [ ] Add \`test\` script to \`mobile/package.json\` running \`jest --watchAll=false\`
- [ ] Write a smoke test (\`mobile/__tests__/smoke.test.ts\`) that asserts \`1 + 1 === 2\`
- [ ] Confirm \`npm test\` exits 0

---

### ✅ Acceptance Criteria

- [ ] \`npm test\` runs without configuration errors
- [ ] Smoke test passes
- [ ] Path alias \`@/\` resolves correctly in tests
- [ ] Coverage report generates with \`npm test -- --coverage\`" \
  '["mobile","setup","testing"]'

create_issue \
  "Write unit tests for mobile utility functions" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Pure utility functions are the easiest to test and the most critical to get right. This issue covers unit tests for the helper functions already created in \`mobile/utils/\`.

---

### 🛠️ Tasks

- [ ] Create \`mobile/__tests__/utils/stellar.test.ts\` for \`truncateAddress\`
  - Happy path: address of 56 chars truncates to \`GXXX...XXXX\` format
  - Edge cases: empty string, short string, exactly 8 chars
- [ ] Create \`mobile/__tests__/utils/formatXLM.test.ts\`
  - Formats integers, decimals, and very small amounts correctly
  - Handles \`0\` and negative values
- [ ] Create \`mobile/__tests__/utils/explorerLink.test.ts\`
  - Returns correct mainnet and testnet URLs

---

### ✅ Acceptance Criteria

- [ ] All test cases pass
- [ ] Edge cases are covered
- [ ] No mocks needed (pure functions)" \
  '["mobile","testing"]'

create_issue \
  "Write component tests for Button, TextInput, and Avatar" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

The core UI primitives need component tests to prevent regressions. Using React Native Testing Library we render each component and assert on its output and behaviour.

---

### 🛠️ Tasks

- [ ] Create \`mobile/__tests__/components/Button.test.tsx\`
  - Renders label text
  - Calls \`onPress\` when pressed
  - Does not call \`onPress\` when \`disabled\` is true
  - Applies correct style for each variant (Primary, Secondary, Outline)
- [ ] Create \`mobile/__tests__/components/TextInput.test.tsx\`
  - Renders label and placeholder
  - Shows error message when \`error\` prop is provided
  - Forwards \`onChangeText\` correctly
- [ ] Create \`mobile/__tests__/components/Avatar.test.tsx\`
  - Shows initials when no image is provided
  - Renders image when \`uri\` is provided

---

### ✅ Acceptance Criteria

- [ ] All assertions pass
- [ ] No snapshot tests (prefer explicit assertions)" \
  '["mobile","testing"]'

create_issue \
  "Write component tests for GroupCard and ProgressBar" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

GroupCard and ProgressBar are domain-specific components used throughout the app. Tests here catch regressions in display logic and prop handling.

---

### 🛠️ Tasks

- [ ] Create \`mobile/__tests__/components/GroupCard.test.tsx\`
  - Renders group name, status badge, and contribution amount
  - Calls \`onPress\` when the card is tapped
  - Shows the correct due date badge when a date is provided
- [ ] Create \`mobile/__tests__/components/ProgressBar.test.tsx\`
  - Renders with \`progress=0\` showing an empty bar
  - Renders with \`progress=1\` showing a full bar
  - Clamps values outside \`[0, 1]\`
  - Optional label renders when provided

---

### ✅ Acceptance Criteria

- [ ] All tests pass
- [ ] Both components render without errors in the test environment" \
  '["mobile","testing"]'

create_issue \
  "Set up Detox for end-to-end testing of the onboarding flow" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

End-to-end tests catch integration bugs that unit tests miss. Detox is the standard E2E framework for React Native. This issue gets it installed and writes a basic onboarding flow test.

---

### 🛠️ Tasks

- [ ] Install \`detox\` and \`jest-circus\` as devDependencies
- [ ] Add \`.detoxrc.js\` configured for Expo development build (iOS simulator)
- [ ] Create \`mobile/e2e/onboarding.test.js\`
  - Launch the app
  - Verify welcome screen is visible
  - Tap 'Next' and verify screen 2 is shown
  - Tap 'Next' and verify screen 3 is shown
  - Tap 'Skip' from screen 1 and verify onboarding is bypassed
- [ ] Add \`e2e\` script to \`package.json\`

---

### ✅ Acceptance Criteria

- [ ] \`detox build\` completes without errors
- [ ] Onboarding E2E test passes on iOS simulator
- [ ] CI step documented in README" \
  '["mobile","testing"]'

echo ""
echo "── State Management ───────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# STATE MANAGEMENT  (5 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Set up Zustand for global state management in the mobile app" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

As the app grows, prop drilling becomes unwieldy. Zustand is a lightweight state management library that pairs well with React Native. This issue installs it and establishes the store file structure.

---

### 🛠️ Tasks

- [ ] Install \`zustand\` as a dependency
- [ ] Create \`mobile/stores/\` directory
- [ ] Create \`mobile/stores/index.ts\` that re-exports all stores
- [ ] Document the store pattern in \`mobile/stores/README.md\` (one paragraph)
- [ ] Add \`zustand\` to the project dependencies section of the mobile README

---

### ✅ Acceptance Criteria

- [ ] \`zustand\` is importable in any component
- [ ] Store directory structure is established
- [ ] No TypeScript errors" \
  '["mobile","setup"]'

create_issue \
  "Create walletStore for wallet address and connection state" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

Multiple screens need access to the connected wallet address. A Zustand store replaces the current prop-passing approach and ensures all screens react to connection changes.

---

### 🛠️ Tasks

- [ ] Create \`mobile/stores/walletStore.ts\`
- [ ] State: \`address: string | null\`, \`isConnecting: boolean\`
- [ ] Actions: \`connect(address: string)\`, \`disconnect()\`, \`setConnecting(v: boolean)\`
- [ ] Persist \`address\` to AsyncStorage using Zustand's \`persist\` middleware
- [ ] Update wallet connect and disconnect screens to use the store
- [ ] Update header truncated address display to read from store

---

### ✅ Acceptance Criteria

- [ ] Connecting wallet updates address across all screens
- [ ] Address persists across app restarts
- [ ] Disconnect clears address from store and AsyncStorage
- [ ] No TypeScript errors" \
  '["mobile"]'

create_issue \
  "Create groupsStore for caching groups list data" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

The groups list is accessed from the tab bar and the home screen. A shared store avoids duplicate data fetching and keeps the UI in sync.

---

### 🛠️ Tasks

- [ ] Create \`mobile/stores/groupsStore.ts\`
- [ ] State: \`groups: Group[]\`, \`isLoading: boolean\`, \`lastFetched: number | null\`
- [ ] Actions: \`setGroups(groups: Group[])\`, \`setLoading(v: boolean)\`, \`reset()\`
- [ ] Define \`Group\` type in \`mobile/types/group.ts\` with at least: \`id\`, \`name\`, \`status\`, \`contributionAmount\`, \`memberCount\`
- [ ] Update groups list screen to read from and write to the store

---

### ✅ Acceptance Criteria

- [ ] Groups list screen reads from store
- [ ] Pull-to-refresh updates the store
- [ ] \`Group\` type is used consistently across components
- [ ] No TypeScript errors" \
  '["mobile"]'

create_issue \
  "Create notificationsStore for unread notification count" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

The notifications tab badge needs to show the number of unread notifications. A store keeps this count in sync between the tab icon and the notifications list screen.

---

### 🛠️ Tasks

- [ ] Create \`mobile/stores/notificationsStore.ts\`
- [ ] State: \`notifications: Notification[]\`, \`unreadCount: number\`
- [ ] Actions: \`setNotifications(items: Notification[])\`, \`markAllRead()\`, \`markRead(id: string)\`
- [ ] Define \`Notification\` type in \`mobile/types/notification.ts\`
- [ ] Update tab badge to read \`unreadCount\` from the store
- [ ] Update NotificationItem to call \`markRead\` on press

---

### ✅ Acceptance Criteria

- [ ] Tab badge reflects actual unread count
- [ ] Marking notifications as read decrements the badge
- [ ] \`markAllRead\` resets count to 0" \
  '["mobile"]'

create_issue \
  "Create userStore for display name and profile preferences" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

The user's display name and theme preference need to be accessible from multiple screens (profile, settings, header). A Zustand store with AsyncStorage persistence is the right approach.

---

### 🛠️ Tasks

- [ ] Create \`mobile/stores/userStore.ts\`
- [ ] State: \`displayName: string\`, \`theme: 'dark' | 'light' | 'system'\`
- [ ] Actions: \`setDisplayName(name: string)\`, \`setTheme(theme: string)\`
- [ ] Persist both fields using Zustand \`persist\` middleware
- [ ] Update edit profile screen to write \`displayName\` to the store
- [ ] Update settings theme toggle to read from and write to \`theme\`

---

### ✅ Acceptance Criteria

- [ ] Display name change on profile screen updates everywhere it is shown
- [ ] Theme preference persists across app restarts
- [ ] No TypeScript errors" \
  '["mobile"]'

echo ""
echo "── Group Creation Flow ────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# GROUP CREATION FLOW  (5 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Build create group screen Step 1 — name and description" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

Users need to be able to create a new savings group. This is Step 1 of a 3-step creation wizard. It collects the group name and an optional description.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/groups/create/index.tsx\`
- [ ] Add a 'Group Name' \`TextInput\` (required, max 50 chars)
- [ ] Add a 'Description' multi-line \`TextInput\` (optional, max 200 chars)
- [ ] Show character count below the description field
- [ ] Validate: name is required, show inline error if empty on submit
- [ ] 'Next' button is enabled only when name is non-empty
- [ ] 'Cancel' navigates back without saving

---

### ✅ Acceptance Criteria

- [ ] Validation fires on 'Next' press
- [ ] Character limit is enforced
- [ ] 'Next' navigates to Step 2 passing name and description
- [ ] Screen renders without errors" \
  '["mobile"]'

create_issue \
  "Build create group screen Step 2 — size and contribution settings" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

Step 2 of the create group wizard lets the user configure the group size and the monthly contribution amount in XLM.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/groups/create/settings.tsx\`
- [ ] Add a 'Group Size' numeric picker (2 to 20 members)
- [ ] Add a 'Contribution Amount' \`TextInput\` (XLM, numeric keyboard)
- [ ] Show a calculated 'Total pool per round' label: \`size * contribution XLM\`
- [ ] Validate: contribution amount must be a positive number
- [ ] 'Back' returns to Step 1 preserving entered values
- [ ] 'Next' navigates to Step 3

---

### ✅ Acceptance Criteria

- [ ] Total pool label updates live as values change
- [ ] Invalid contribution amount shows inline error
- [ ] Values are preserved when navigating back
- [ ] No TypeScript errors" \
  '["mobile"]'

create_issue \
  "Build create group screen Step 3 — review and confirm" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

Step 3 shows a read-only summary of all settings before the user confirms group creation. This prevents accidental creation with wrong settings.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/groups/create/confirm.tsx\`
- [ ] Display: group name, description, size, contribution amount, total pool
- [ ] Show a disclaimer: 'Once created, contribution settings cannot be changed'
- [ ] 'Create Group' primary button triggers group creation (log to console for now)
- [ ] Show an \`ActivityIndicator\` while creation is in progress
- [ ] On success navigate to the new group's detail screen
- [ ] 'Back' returns to Step 2

---

### ✅ Acceptance Criteria

- [ ] All settings are displayed correctly
- [ ] Disclaimer is visible
- [ ] Loading state is shown during creation
- [ ] Successful creation navigates to group detail" \
  '["mobile"]'

create_issue \
  "Build group creation success screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

After successfully creating a group the user should see a celebratory confirmation screen with their new invite code so they can immediately share it.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/groups/create/success.tsx\`
- [ ] Show a success icon and 'Group Created!' headline
- [ ] Display the invite code in a large, copyable text box
- [ ] Add a 'Copy Invite Code' button that copies to clipboard and shows a toast
- [ ] Add a 'Share Invite Code' button using \`expo-sharing\`
- [ ] Add a 'View My Group' button navigating to the group detail screen

---

### ✅ Acceptance Criteria

- [ ] Invite code is displayed and copyable
- [ ] Share sheet opens when 'Share' is tapped
- [ ] 'View My Group' navigates to group detail
- [ ] Screen cannot be navigated back to (replace navigation)" \
  '["mobile"]'

create_issue \
  "Build join group by invite code screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

Users join an existing group by entering the invite code shared by the group creator. This screen handles code entry, validation, and the join action.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/groups/join.tsx\`
- [ ] Add an invite code \`TextInput\` (uppercase, alphanumeric, auto-format as user types)
- [ ] Validate format on 'Join' press (show inline error if invalid)
- [ ] Show group preview card (name, size, contribution) after valid code is entered
- [ ] 'Confirm Join' button triggers join action (log to console for now)
- [ ] Show loading indicator during join
- [ ] On success navigate to group detail screen

---

### ✅ Acceptance Criteria

- [ ] Inline validation fires on 'Join' press
- [ ] Group preview shows after valid code entry
- [ ] Loading state is shown during join
- [ ] Success navigates to group detail" \
  '["mobile"]'

echo ""
echo "── Wallet & Transactions ──────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# WALLET & TRANSACTIONS  (5 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Build Stellar transaction signing confirmation screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

Before submitting any transaction to the Stellar network, users must review and confirm the details. This screen is shown for contributions, payouts, and any other on-chain actions.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/transaction/confirm.tsx\`
- [ ] Accept route params: \`type\`, \`amount\`, \`destination\`, \`fee\`, \`memo\`
- [ ] Display a clear summary: 'You are sending X XLM to GXXX...XXXX'
- [ ] Show the network fee prominently
- [ ] Add 'Confirm and Sign' primary button
- [ ] Add 'Cancel' secondary button
- [ ] Show a spinner while the transaction is being submitted

---

### ✅ Acceptance Criteria

- [ ] All transaction details are legible
- [ ] Fee is clearly shown before signing
- [ ] Loading state shown during submission
- [ ] Cancel returns to the previous screen without signing" \
  '["mobile"]'

create_issue \
  "Build transaction success screen with explorer link" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

After a successful transaction the user needs confirmation and a way to verify the transaction on Stellar Expert or Horizon. This screen provides that feedback.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/transaction/success.tsx\`
- [ ] Accept route param: \`txHash\`
- [ ] Show a success checkmark animation
- [ ] Display the truncated transaction hash
- [ ] Add 'View on Stellar Expert' link that opens the explorer URL in the browser
- [ ] Add 'Done' button returning to the home screen
- [ ] Screen cannot be navigated back to (replace navigation)

---

### ✅ Acceptance Criteria

- [ ] Transaction hash is displayed
- [ ] Explorer link opens correct URL
- [ ] 'Done' returns to home screen
- [ ] Back gesture is disabled" \
  '["mobile"]'

create_issue \
  "Build transaction history screen with paginated list" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Users need to review their past contributions and payouts. A paginated transaction history screen fetches records from the Stellar Horizon API.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/transactions/index.tsx\`
- [ ] Fetch mock transaction history on mount (real Horizon integration is a future issue)
- [ ] Render a \`FlatList\` with \`TransactionItem\` rows showing: type icon, description, amount, date
- [ ] Add pull-to-refresh support
- [ ] Show \`LoadingSkeleton\` rows while loading
- [ ] Show \`EmptyState\` when no transactions exist
- [ ] Implement 'load more' pagination via \`onEndReached\`

---

### ✅ Acceptance Criteria

- [ ] List renders mock data without errors
- [ ] Pull-to-refresh works
- [ ] Pagination loads additional items
- [ ] Empty state shows when list is empty" \
  '["mobile"]'

create_issue \
  "Add transaction type filter tabs to transaction history screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Transaction history can grow long. Filter tabs let users quickly view only contributions, only payouts, or all transactions.

---

### 🛠️ Tasks

- [ ] Add 'All / Contributions / Payouts' tab row above the list
- [ ] Filter the displayed transactions based on the active tab
- [ ] Persist the selected tab in local component state
- [ ] Show the count of items per tab in the tab label (e.g. 'Contributions (3)')
- [ ] Animated tab indicator matches the style of other filter tabs in the app

---

### ✅ Acceptance Criteria

- [ ] Switching tabs filters the list correctly
- [ ] Counts update when pull-to-refresh loads new data
- [ ] Active tab is visually distinct
- [ ] Animation is smooth" \
  '["mobile"]'

create_issue \
  "Create TransactionItem component for history list rows" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Each row in the transaction history list needs a consistent design showing the transaction type, description, amount, and date. A reusable component enforces this.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/transactions/TransactionItem.tsx\`
- [ ] Props: \`type: 'contribution' | 'payout' | 'fee'\`, \`description: string\`, \`amount: number\`, \`date: string\`
- [ ] Show a type icon: contribution (arrow up, red), payout (arrow down, green), fee (minus, grey)
- [ ] Show amount formatted with \`formatXLM\` utility
- [ ] Show relative date (e.g. '2 days ago') using a date utility
- [ ] Export from \`mobile/components/transactions/index.ts\`

---

### ✅ Acceptance Criteria

- [ ] All three transaction types render with correct icon and colour
- [ ] Amount is formatted correctly
- [ ] Relative date displays as expected" \
  '["mobile","good first issue"]'

echo ""
echo "── Push Notifications ─────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# PUSH NOTIFICATIONS  (4 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Set up Expo Notifications for push notification support" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

EsuStellar needs to notify users when contributions are due, payouts arrive, or group members join. Expo Notifications provides a cross-platform push notification API.

---

### 🛠️ Tasks

- [ ] Install \`expo-notifications\` and \`expo-device\`
- [ ] Create \`mobile/services/notifications.ts\` with:
  - \`registerForPushNotificationsAsync()\` that requests permission and returns the Expo push token
  - \`scheduleLocalNotification(title, body, trigger)\` helper
- [ ] Configure \`android.useNextNotificationsApi: true\` in \`app.json\`
- [ ] Log the push token on app start (for testing)

---

### ✅ Acceptance Criteria

- [ ] Push token is obtained on a real device or simulator
- [ ] Permission request appears on first launch
- [ ] Helper functions are typed and exported
- [ ] No runtime errors on iOS and Android" \
  '["mobile","setup"]'

create_issue \
  "Request notification permissions during onboarding" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

The best time to ask for notification permissions is during onboarding, after explaining why they are useful. Asking cold on first launch leads to high rejection rates.

---

### 🛠️ Tasks

- [ ] Add a 'Stay informed' step or modal after the onboarding 'Get Started' screen
- [ ] Explain what notifications the app will send (due dates, payouts, group updates)
- [ ] Call \`registerForPushNotificationsAsync()\` when the user taps 'Allow Notifications'
- [ ] Add a 'Skip for now' option that bypasses permission request
- [ ] Store whether permission was requested in AsyncStorage to avoid asking twice

---

### ✅ Acceptance Criteria

- [ ] Permission prompt appears after onboarding completion
- [ ] Skipping does not show the prompt again
- [ ] Permission state is persisted
- [ ] Works on both iOS and Android" \
  '["mobile"]'

create_issue \
  "Handle foreground push notification display" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

By default, iOS does not display push notifications when the app is in the foreground. We need to explicitly handle foreground notifications and show an in-app banner.

---

### 🛠️ Tasks

- [ ] In the root layout, set \`Notifications.setNotificationHandler\` to show alerts in the foreground
- [ ] Create a \`NotificationBanner\` component that appears at the top of the screen for 3 seconds
- [ ] Banner shows title, body, and a close button
- [ ] Tapping the banner navigates to the relevant screen based on notification data
- [ ] Banner auto-dismisses after 3 seconds

---

### ✅ Acceptance Criteria

- [ ] Foreground notifications display the in-app banner
- [ ] Banner dismisses automatically
- [ ] Tapping navigates correctly
- [ ] Banner does not block interaction with the current screen" \
  '["mobile"]'

create_issue \
  "Handle background push notification tap navigation" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

When a user taps a push notification while the app is in the background or closed, the app should open and navigate to the relevant screen (e.g. the group detail or the contributions screen).

---

### 🛠️ Tasks

- [ ] In the root layout, add a \`Notifications.addNotificationResponseReceivedListener\`
- [ ] Parse the notification \`data\` field for a \`screen\` and \`params\` property
- [ ] Use \`expo-router\`'s \`router.push\` to navigate to the target screen
- [ ] Handle unknown \`screen\` values gracefully (navigate to home)
- [ ] Test with a local notification scheduled via \`scheduleLocalNotification\`

---

### ✅ Acceptance Criteria

- [ ] Tapping a notification with \`screen: 'groups/detail'\` opens that group
- [ ] Unknown screen values fall back to home
- [ ] Listener is cleaned up on unmount
- [ ] No TypeScript errors" \
  '["mobile"]'

echo ""
echo "── Security ───────────────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# SECURITY  (4 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Add biometric authentication lock to the mobile app" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

EsuStellar manages financial data and wallet operations. Biometric authentication (Face ID / fingerprint) prevents unauthorised access when the phone is unlocked.

---

### 🛠️ Tasks

- [ ] Install \`expo-local-authentication\`
- [ ] On app foreground event, check if biometric is enrolled and supported
- [ ] If enrolled, show a biometric prompt before allowing access to the app
- [ ] Add a 'Use Biometric Lock' toggle in Settings that enables or disables this feature
- [ ] Store the toggle state in AsyncStorage
- [ ] Show a fallback 'Enter PIN' option if biometric fails

---

### ✅ Acceptance Criteria

- [ ] Biometric prompt appears on app resume when the feature is enabled
- [ ] Toggle in Settings persists across restarts
- [ ] Fallback PIN option is accessible
- [ ] Feature is disabled by default" \
  '["mobile","security"]'

create_issue \
  "Add PIN code setup and authentication screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

A 6-digit PIN provides a fallback authentication method and an alternative for users without biometric hardware. This issue covers PIN setup and the PIN entry screen.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/security/setup-pin.tsx\` with a 6-dot PIN entry pad
- [ ] After entry, prompt for confirmation (enter PIN again)
- [ ] Store a hashed PIN in SecureStore via \`expo-secure-store\`
- [ ] Create \`mobile/app/security/enter-pin.tsx\` shown when biometric fails
- [ ] Allow 3 failed attempts before locking the app for 30 seconds
- [ ] Add 'Change PIN' option in Settings

---

### ✅ Acceptance Criteria

- [ ] PIN is stored securely (not in plain text)
- [ ] Confirmation step prevents typos
- [ ] Failed attempts are counted and lockout works
- [ ] 'Change PIN' requires entering the current PIN first" \
  '["mobile","security"]'

create_issue \
  "Implement auto-lock after configurable idle timeout" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

If the user leaves the app open and walks away, the app should automatically lock after a period of inactivity. This protects against someone picking up an unlocked phone.

---

### 🛠️ Tasks

- [ ] Track the last user interaction timestamp using \`AppState\` and a global touch handler
- [ ] When the app comes to the foreground, compare elapsed time against the timeout setting
- [ ] If elapsed time exceeds the timeout, navigate to the PIN / biometric lock screen
- [ ] Add an 'Auto-lock after' picker in Security settings: 1 min, 5 min, 15 min, Never
- [ ] Default timeout: 5 minutes

---

### ✅ Acceptance Criteria

- [ ] App locks after the configured idle period
- [ ] Settings picker persists the chosen timeout
- [ ] 'Never' option disables auto-lock
- [ ] Lock activates on app resume, not just after background" \
  '["mobile","security"]'

create_issue \
  "Mask sensitive data in app switcher screenshot" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

When a user double-taps the home button, iOS and Android capture a screenshot of the app for the switcher. This can expose wallet addresses and balances. We should blur or replace the screen content when the app goes to the background.

---

### 🛠️ Tasks

- [ ] In the root layout, listen to \`AppState\` changes
- [ ] When state changes to \`background\` or \`inactive\`, render a full-screen overlay (logo + 'EsuStellar' text) over all content
- [ ] Remove the overlay when state returns to \`active\`
- [ ] On iOS use \`UIApplication.shared.ignoreSnapshotOnNextApplicationLaunch\` equivalent if available
- [ ] Test by quickly opening the app switcher

---

### ✅ Acceptance Criteria

- [ ] App switcher thumbnail shows the branded overlay, not wallet data
- [ ] Overlay disappears instantly on app resume
- [ ] No flicker on normal app usage
- [ ] Works on both iOS and Android" \
  '["mobile","security"]'

echo ""
echo "── Performance ────────────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# PERFORMANCE  (6 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Optimise FlatList performance on groups list and transaction history screens" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

FlatList performance degrades with large datasets if basic optimisations are not applied. This issue adds standard React Native FlatList performance props to all list screens.

---

### 🛠️ Tasks

- [ ] Add \`keyExtractor\` prop returning the item's \`id\` on all FlatLists
- [ ] Add \`getItemLayout\` for lists with fixed-height rows (groups list, transaction history)
- [ ] Set \`removeClippedSubviews={true}\` on long lists
- [ ] Set \`maxToRenderPerBatch={10}\` and \`windowSize={5}\` on groups list
- [ ] Wrap list item components with \`React.memo\` to prevent unnecessary re-renders
- [ ] Profile before and after using the React Native Perf Monitor

---

### ✅ Acceptance Criteria

- [ ] No 'missing keyExtractor' warnings
- [ ] Scroll frame rate is stable at 60 fps on a mid-range device
- [ ] \`React.memo\` applied to GroupCard and TransactionItem" \
  '["mobile","performance"]'

create_issue \
  "Add image caching for avatar images using expo-image" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

The default React Native \`Image\` component does not cache images aggressively. \`expo-image\` provides better caching, placeholder support, and smoother loading transitions.

---

### 🛠️ Tasks

- [ ] Install \`expo-image\`
- [ ] Replace all \`<Image>\` usages in \`Avatar\` component with \`<ExpoImage>\`
- [ ] Add a \`placeholder\` blur hash or the initials fallback during load
- [ ] Set \`cachePolicy='memory-disk'\` for avatar images
- [ ] Test with slow network (Network Link Conditioner on iOS or Android emulator throttling)

---

### ✅ Acceptance Criteria

- [ ] Avatars load from cache on revisit without a network request
- [ ] Placeholder shows during initial load
- [ ] No layout shift when image loads
- [ ] No TypeScript errors" \
  '["mobile","performance","good first issue"]'

create_issue \
  "Implement lazy loading for group detail tab content" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

The group detail screen has multiple tabs (Members, Payout Schedule, Contribution History). Currently all tabs load their data on mount. Lazy loading defers data fetching to when a tab is first visited.

---

### 🛠️ Tasks

- [ ] Track which tabs have been visited using a \`visitedTabs\` state Set
- [ ] Only trigger data fetch when a tab is first activated
- [ ] Show \`LoadingSkeleton\` in the tab content area before data loads
- [ ] Memoize tab content with \`React.memo\` and stable prop references
- [ ] Confirm no duplicate fetch occurs when switching back to a visited tab

---

### ✅ Acceptance Criteria

- [ ] Network requests only fire when the relevant tab is opened
- [ ] Switching back to a tab does not refetch
- [ ] Skeleton is shown correctly before data arrives
- [ ] No TypeScript errors" \
  '["mobile","performance"]'

create_issue \
  "Reduce bundle size by auditing and removing unused dependencies" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Every dependency added to the mobile app increases build time and bundle size. This issue audits \`mobile/package.json\` and removes packages that are not actually used.

---

### 🛠️ Tasks

- [ ] Run \`npx depcheck\` in the \`mobile/\` directory and note unused dependencies
- [ ] For each flagged package, verify it is genuinely unused (some are indirect)
- [ ] Remove confirmed unused packages with \`npm uninstall\`
- [ ] Run \`expo export\` and compare bundle sizes before and after
- [ ] Document findings in a comment on this issue

---

### ✅ Acceptance Criteria

- [ ] At least one unused package removed (if any found)
- [ ] \`npm run build\` still succeeds after removal
- [ ] Bundle size does not increase" \
  '["mobile","performance"]'

create_issue \
  "Add React.memo and useMemo to frequently re-rendered components" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Components that receive stable props but still re-render on every parent update waste CPU cycles. Wrapping them with \`React.memo\` and memoizing expensive calculations with \`useMemo\` improves UI responsiveness.

---

### 🛠️ Tasks

- [ ] Profile the groups list screen with React DevTools and identify unnecessary re-renders
- [ ] Wrap \`GroupCard\`, \`TransactionItem\`, \`NotificationItem\`, and \`Avatar\` with \`React.memo\`
- [ ] Use \`useCallback\` for \`onPress\` handlers passed to list items
- [ ] Use \`useMemo\` for any derived data (filtered lists, formatted totals) in screen components
- [ ] Re-profile after changes to confirm fewer renders

---

### ✅ Acceptance Criteria

- [ ] Target components only re-render when their own props change
- [ ] No correctness regressions (UI still updates when data changes)
- [ ] Changes are documented with a before/after render count comment" \
  '["mobile","performance"]'

create_issue \
  "Add Hermes engine and enable it for Android builds" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Hermes is a JavaScript engine optimised for React Native that improves startup time, reduces memory usage, and produces smaller APKs. It is enabled by default for new Expo projects but should be explicitly verified and configured.

---

### 🛠️ Tasks

- [ ] Verify \`expo.jsEngine: 'hermes'\` is set in \`app.json\`
- [ ] Confirm Hermes is active at runtime: \`global.HermesInternal != null\`
- [ ] Enable Hermes for iOS in the Expo config plugin if not already set
- [ ] Run a Release build on both platforms and measure startup time
- [ ] Document startup time improvement in the PR description

---

### ✅ Acceptance Criteria

- [ ] \`global.HermesInternal\` is truthy in production builds
- [ ] App builds successfully with Hermes on both platforms
- [ ] No runtime errors introduced by the engine switch" \
  '["mobile","performance"]'

echo ""
echo "── Internationalisation ───────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# INTERNATIONALISATION  (6 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Set up i18n translation infrastructure with expo-localization and i18next" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

EsuStellar is designed for communities across Africa and beyond. Supporting multiple languages starts with the right infrastructure. This issue establishes the i18n setup.

---

### 🛠️ Tasks

- [ ] Install \`expo-localization\`, \`i18next\`, and \`react-i18next\`
- [ ] Create \`mobile/locales/en.json\` with all current hard-coded UI strings
- [ ] Create \`mobile/i18n.ts\` that initialises i18next with the device locale and falls back to English
- [ ] Wrap the app root with \`I18nextProvider\`
- [ ] Replace at least 5 hard-coded strings in screens with \`t('key')\` calls to prove the setup works

---

### ✅ Acceptance Criteria

- [ ] App renders correctly with the i18n provider
- [ ] Changing the device locale to an unsupported language falls back to English
- [ ] TypeScript types for translation keys are generated or manually maintained
- [ ] No missing-key warnings in the console" \
  '["mobile","setup","i18n"]'

create_issue \
  "Add French translation file for the mobile app" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

French is widely spoken in West and Central Africa, a key market for EsuStellar. Adding a French translation makes the app accessible to millions more potential users.

---

### 🛠️ Tasks

- [ ] Create \`mobile/locales/fr.json\` by translating all keys from \`en.json\`
- [ ] Register the French locale in \`mobile/i18n.ts\`
- [ ] Test by changing the device locale to French and verifying all screens
- [ ] Note any strings that were missed and add them to both locale files

---

### ✅ Acceptance Criteria

- [ ] All UI strings display in French when device locale is \`fr\`
- [ ] No missing-key fallbacks to English keys (only values)
- [ ] Translations are accurate (native speaker review preferred)" \
  '["mobile","i18n","good first issue"]'

create_issue \
  "Add Swahili translation file for the mobile app" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Swahili is spoken by over 200 million people across East Africa. It is one of the most widely spoken languages on the continent and a high-priority translation target for EsuStellar.

---

### 🛠️ Tasks

- [ ] Create \`mobile/locales/sw.json\` by translating all keys from \`en.json\`
- [ ] Register the Swahili locale (\`sw\`) in \`mobile/i18n.ts\`
- [ ] Test by changing the device locale to Swahili
- [ ] Note any strings that were missed and add them to both locale files

---

### ✅ Acceptance Criteria

- [ ] All UI strings display in Swahili when device locale is \`sw\`
- [ ] No missing-key fallbacks
- [ ] Translations are accurate" \
  '["mobile","i18n","good first issue"]'

create_issue \
  "Add RTL layout support for Arabic and other right-to-left locales" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Arabic and several other target languages are written right-to-left. React Native has built-in RTL support but it must be explicitly enabled and tested.

---

### 🛠️ Tasks

- [ ] Call \`I18nManager.forceRTL(true)\` when the device locale is RTL
- [ ] Audit all screens for hard-coded \`left\`/\`right\` style values and replace with \`start\`/\`end\`
- [ ] Flip icon directions (arrows, chevrons) using the \`I18nManager.isRTL\` flag
- [ ] Test by forcing RTL in the \`i18n.ts\` initialisation
- [ ] Add a placeholder \`mobile/locales/ar.json\` with the English strings as a starting point

---

### ✅ Acceptance Criteria

- [ ] UI mirrors horizontally in RTL mode
- [ ] No layout overflow or clipping in RTL
- [ ] Arrow icons flip direction appropriately
- [ ] App does not require a restart after locale change" \
  '["mobile","i18n"]'

create_issue \
  "Format dates and numbers according to device locale" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Dates written as '04/24/2026' are confusing to users who expect 'DD/MM/YYYY'. Using the Intl API ensures dates and numbers are formatted according to the user's locale automatically.

---

### 🛠️ Tasks

- [ ] Create \`mobile/utils/formatDate.ts\` using \`Intl.DateTimeFormat\` with the device locale
- [ ] Create or update \`formatXLM\` to use \`Intl.NumberFormat\` for decimal separator
- [ ] Replace all \`new Date().toLocaleDateString()\` calls with the new utility
- [ ] Test with French locale (comma decimal separator) and US locale (period decimal separator)

---

### ✅ Acceptance Criteria

- [ ] Dates display in the locale-appropriate format
- [ ] XLM amounts use the correct decimal separator for the locale
- [ ] No hard-coded 'en-US' locale strings in the codebase" \
  '["mobile","i18n","good first issue"]'

create_issue \
  "Add language selection screen in Settings" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Some users may want to use a language different from their device locale (e.g. a French speaker using an English phone). A language picker in Settings gives them that control.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/settings/language.tsx\`
- [ ] List available languages with their native name (e.g. 'English', 'Francais', 'Kiswahili')
- [ ] Show a checkmark next to the currently selected language
- [ ] On selection, update \`i18next.changeLanguage\` and persist the choice to AsyncStorage
- [ ] Add 'Language' row to the Settings screen linking to this screen

---

### ✅ Acceptance Criteria

- [ ] Language change takes effect immediately without app restart
- [ ] Selected language persists across restarts
- [ ] All available locales are listed with their native name
- [ ] Settings row navigates to language screen" \
  '["mobile","i18n"]'

echo ""
echo "======================================"
echo "  ✅  All mobile issues created!"
echo "======================================"
