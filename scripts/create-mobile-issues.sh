#!/usr/bin/env bash
# ============================================================
# EsuStellar — Mobile Issues Creation Script
# ============================================================
# Usage:
#   GITHUB_TOKEN=<your_pat> bash scripts/create-mobile-issues.sh
#
# Requirements:
#   - A GitHub Personal Access Token with `repo` scope
#   - curl and jq installed
# ============================================================

set -euo pipefail

REPO="BlockHaven-Labs/esustellar"
API="https://api.github.com/repos/$REPO/issues"
TOKEN="${GITHUB_TOKEN:?Please set the GITHUB_TOKEN environment variable}"

create_issue() {
  local title="$1"
  local body="$2"
  local labels_json="$3"   # e.g. '["mobile","good first issue"]'

  local response
  response=$(curl -s -w "\n%{http_code}" -X POST "$API" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    -H "Content-Type: application/json" \
    --data-binary "$(jq -cn \
      --arg t "$title" \
      --arg b "$body" \
      --argjson l "$labels_json" \
      '{title:$t,body:$b,labels:$l}')")

  local http_code
  http_code=$(echo "$response" | tail -1)
  local body_resp
  body_resp=$(echo "$response" | head -n -1)

  if [[ "$http_code" == "201" ]]; then
    local num
    num=$(echo "$body_resp" | jq -r '.number')
    echo "✅  #$num  $title"
  else
    echo "❌  HTTP $http_code — $title"
    echo "    $(echo "$body_resp" | jq -r '.message // empty')"
  fi

  sleep 0.8   # stay well within GitHub's rate limit
}

echo ""
echo "======================================"
echo "  EsuStellar Mobile Issues Creator"
echo "  Repo: $REPO"
echo "======================================"
echo ""

# ─────────────────────────────────────────────────────────────
# SETUP & INFRASTRUCTURE  (5 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Add app icon and splash screen assets to mobile app" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

The EsuStellar mobile app (built with Expo) needs a branded app icon and splash screen that match EsuStellar's visual identity. Without these, the app shows Expo's default assets. This is a great first task for anyone comfortable with image files and Expo config.

---

### 🛠️ Tasks

- [ ] Add a square app icon image (\`icon.png\`, 1024×1024 px) to \`mobile/assets/\`
- [ ] Add a splash screen image (\`splash.png\`, 1284×2778 px) to \`mobile/assets/\`
- [ ] Update \`mobile/app.json\` to reference the new icon and splash paths
- [ ] Set the splash screen \`backgroundColor\` to \`#0F172A\` (EsuStellar dark brand color)
- [ ] Verify assets load by running \`npx expo start\`

---

### ✅ Acceptance Criteria

- [ ] App icon appears when previewing the app
- [ ] Splash screen shows on launch instead of Expo's default
- [ ] \`app.json\` correctly references both asset paths
- [ ] No Expo build warnings about missing assets" \
  '["mobile","good first issue","setup"]'

create_issue \
  "Configure Expo Router tab and stack navigation layout" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

The mobile app uses Expo Router for file-based navigation. We need the root layout to define a bottom tab navigator (Home, Groups, Notifications, Profile) and a stack navigator for detail screens like Group Detail. This is the core navigation skeleton that all screens plug into.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/_layout.tsx\` with a \`Stack\` navigator as the root
- [ ] Create \`mobile/app/(tabs)/_layout.tsx\` with a \`Tabs\` navigator
- [ ] Add four tab entries: \`index\` (Home), \`groups\`, \`notifications\`, \`profile\`
- [ ] Add placeholder icon names from \`@expo/vector-icons\` for each tab
- [ ] Ensure the tab bar background matches the dark theme (\`#0F172A\`)

---

### ✅ Acceptance Criteria

- [ ] App launches with a visible bottom tab bar
- [ ] Tapping each tab navigates to the correct placeholder screen
- [ ] No TypeScript errors in layout files
- [ ] Stack navigation works for nested screens" \
  '["mobile","good first issue","setup"]'

create_issue \
  "Set up TypeScript path aliases in tsconfig for the mobile app" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Using import paths like \`../../components/Button\` is hard to read and breaks when files move. Path aliases like \`@/components/Button\` make imports clean and consistent. We need to configure these in both TypeScript and Babel.

---

### 🛠️ Tasks

- [ ] In \`mobile/tsconfig.json\`, add \`\"paths\": { \"@/*\": [\"./*\"] }\` under \`compilerOptions\`
- [ ] Install \`babel-plugin-module-resolver\` as a dev dependency
- [ ] Update \`mobile/babel.config.js\` to add the module-resolver plugin mapping \`@\` to \`.\`
- [ ] Test the alias by importing one file using \`@/\` in a screen

---

### ✅ Acceptance Criteria

- [ ] \`import Button from '@/components/Button'\` resolves without errors
- [ ] TypeScript IntelliSense recognizes \`@/\` aliases
- [ ] \`npx expo start\` runs without import resolution errors" \
  '["mobile","good first issue","setup"]'

create_issue \
  "Add .env.example file with required environment variables for mobile" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

The mobile app needs environment variables (Stellar network URL, contract addresses). New contributors need to know which variables are required. A \`.env.example\` file documents this without exposing real values.

---

### 🛠️ Tasks

- [ ] Create \`mobile/.env.example\` with placeholders for:
  - \`EXPO_PUBLIC_STELLAR_NETWORK\` — e.g. \`testnet\`
  - \`EXPO_PUBLIC_HORIZON_URL\` — e.g. \`https://horizon-testnet.stellar.org\`
  - \`EXPO_PUBLIC_REGISTRY_CONTRACT_ID\` — placeholder string
  - \`EXPO_PUBLIC_SAVINGS_CONTRACT_ID\` — placeholder string
- [ ] Add a comment above each variable explaining what it is
- [ ] Add a note in \`mobile/README.md\` to copy \`.env.example\` → \`.env\`
- [ ] Add \`.env\` to \`mobile/.gitignore\`

---

### ✅ Acceptance Criteria

- [ ] \`.env.example\` exists in the \`mobile/\` directory
- [ ] All variables have descriptive comments
- [ ] \`.env\` is listed in \`.gitignore\`" \
  '["mobile","good first issue","setup"]'

create_issue \
  "Configure ESLint and Prettier for the mobile codebase" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Consistent code style prevents unnecessary diffs and helps contributors follow the same conventions. We need ESLint and Prettier configured in the \`mobile/\` directory.

---

### 🛠️ Tasks

- [ ] Install \`eslint\`, \`@typescript-eslint/eslint-plugin\`, \`eslint-plugin-react\`, \`eslint-plugin-react-native\`, and \`prettier\` as dev dependencies
- [ ] Create \`mobile/.eslintrc.js\` extending \`expo\` and \`@typescript-eslint/recommended\`
- [ ] Create \`mobile/.prettierrc\` with project style rules (single quotes, 2-space indent, trailing comma)
- [ ] Add \`lint\` and \`format\` scripts to \`mobile/package.json\`
- [ ] Run linter on existing files and fix warnings

---

### ✅ Acceptance Criteria

- [ ] \`npm run lint\` runs without crashing in \`mobile/\`
- [ ] \`npm run format\` formats files according to \`.prettierrc\`
- [ ] No ESLint configuration errors on startup" \
  '["mobile","good first issue","setup"]'

echo ""
echo "── UI Components ──────────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# UI COMPONENTS  (10 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Create reusable Button component with Primary, Secondary, and Outline variants" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

The mobile app needs a consistent Button component used across all screens (contribute, join group, connect wallet). Instead of styling every button individually, we build one reusable component with size and variant props.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/ui/Button.tsx\`
- [ ] Accept props: \`variant\` (\`primary\` | \`secondary\` | \`outline\` | \`ghost\`), \`size\` (\`sm\` | \`md\` | \`lg\`), \`onPress\`, \`disabled\`, \`loading\`, \`children\`
- [ ] Apply EsuStellar color tokens: primary blue \`#6366F1\`, dark background \`#0F172A\`
- [ ] Show \`ActivityIndicator\` when \`loading={true}\`
- [ ] Disable press events and reduce opacity when \`disabled={true}\`
- [ ] Export from \`mobile/components/ui/index.ts\`

---

### ✅ Acceptance Criteria

- [ ] All four variants render with correct colors
- [ ] Loading state shows spinner and disables press
- [ ] Disabled state is visually distinct
- [ ] Component is typed with TypeScript (no \`any\`)" \
  '["mobile","good first issue"]'

create_issue \
  "Create reusable TextInput component with label and error state" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

Forms in the mobile app (create group, join with code, profile edit) need a consistent text input. This component wraps React Native's \`TextInput\` to add a label above and an error message below, with visual feedback for invalid input.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/ui/TextInput.tsx\`
- [ ] Accept props: \`label\`, \`placeholder\`, \`value\`, \`onChangeText\`, \`error\` (string), \`secureTextEntry\`, \`keyboardType\`, plus native \`TextInput\` props via spread
- [ ] Render a label \`Text\` above the input
- [ ] Apply a red border and show \`error\` text below when \`error\` is provided
- [ ] Dark theme: background \`#1E293B\`, text white, border \`#334155\`
- [ ] Export from \`mobile/components/ui/index.ts\`

---

### ✅ Acceptance Criteria

- [ ] Label displays above the input
- [ ] Error message appears in red below input when \`error\` prop is set
- [ ] Input border turns red on error
- [ ] Works with keyboard types: \`default\`, \`numeric\`, \`email-address\`" \
  '["mobile","good first issue"]'

create_issue \
  "Create reusable Avatar component with image and initials fallback" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Group members and user profiles need an Avatar component. When no profile image is available (most cases since wallets don't have photos), the avatar should show the user's initials on a colored background.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/ui/Avatar.tsx\`
- [ ] Accept props: \`uri\` (optional), \`name\` (used for initials fallback), \`size\` (\`sm\` | \`md\` | \`lg\` mapping to 32/40/56 px)
- [ ] If \`uri\` is provided, render an \`Image\` in a circular container
- [ ] If \`uri\` is absent, derive initials from the first letters of the first two words of \`name\`
- [ ] Generate a deterministic background color from the \`name\` string

---

### ✅ Acceptance Criteria

- [ ] Shows image when URI is provided
- [ ] Falls back to initials when no URI
- [ ] Three size variants render correctly
- [ ] Same name always produces the same background color" \
  '["mobile","good first issue"]'

create_issue \
  "Create reusable Badge component with status color variants" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Group status (Open, Active, Completed, Full) needs to be shown at a glance with color-coded badges. This small component will be used on GroupCards, group detail headers, and anywhere we need a quick status indicator.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/ui/Badge.tsx\`
- [ ] Accept props: \`label\` (string), \`variant\` (\`success\` | \`warning\` | \`error\` | \`info\` | \`neutral\`)
- [ ] Map variants to colors: success=green, warning=amber, error=red, info=blue, neutral=gray
- [ ] Use pill shape (border radius = half height), small font, horizontal padding
- [ ] Export from \`mobile/components/ui/index.ts\`

---

### ✅ Acceptance Criteria

- [ ] All five variants render with correct colors
- [ ] Badge text is readable (sufficient contrast)
- [ ] Pill shape is consistent across variants" \
  '["mobile","good first issue"]'

create_issue \
  "Create reusable Card component for content sections" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Many screens use card-style containers to group information. A reusable \`Card\` component ensures consistent padding, border, background, and border-radius across the app without repeating \`View\` styles.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/ui/Card.tsx\`
- [ ] Accept props: \`children\`, \`style\` (optional override), \`onPress\` (makes card pressable)
- [ ] Default styles: background \`#1E293B\`, border \`#334155\`, border-radius \`12\`, padding \`16\`
- [ ] When \`onPress\` is provided, wrap in \`Pressable\` with a subtle pressed opacity effect
- [ ] Export from \`mobile/components/ui/index.ts\`

---

### ✅ Acceptance Criteria

- [ ] Card renders with correct default styles
- [ ] Pressable Card dims on press
- [ ] Non-pressable Card renders as a plain \`View\`
- [ ] \`style\` prop overrides defaults" \
  '["mobile","good first issue"]'

create_issue \
  "Create EmptyState component with icon, title, and optional action button" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

When a user has no groups, no notifications, or no transactions, we need a friendly empty state instead of a blank screen. This component provides a consistent 'nothing here yet' experience.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/ui/EmptyState.tsx\`
- [ ] Accept props: \`icon\` (emoji string), \`title\`, \`message\`, \`actionLabel\` (optional), \`onAction\` (optional)
- [ ] Center all content vertically and horizontally
- [ ] Render action button using reusable \`Button\` only if \`actionLabel\` is provided
- [ ] Use muted text colors

---

### ✅ Acceptance Criteria

- [ ] Empty state renders centered with icon, title, and message
- [ ] Optional button appears only when \`actionLabel\` is provided
- [ ] Tapping button calls \`onAction\`
- [ ] Works as \`FlatList\` \`ListEmptyComponent\`" \
  '["mobile","good first issue"]'

create_issue \
  "Create LoadingSkeleton component for content placeholders" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

While data loads from the blockchain, users should see shimmering placeholder shapes instead of a blank screen. This improves perceived performance and prevents layout jumps.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/ui/Skeleton.tsx\`
- [ ] Accept props: \`width\`, \`height\`, \`borderRadius\`
- [ ] Use React Native's \`Animated\` API to create a shimmer that pulses between two dark grey shades
- [ ] Create a \`SkeletonGroupCard\` composed of 3–4 skeleton lines matching the GroupCard layout
- [ ] Export both from \`mobile/components/ui/index.ts\`

---

### ✅ Acceptance Criteria

- [ ] Skeleton animates with a looping shimmer effect
- [ ] \`SkeletonGroupCard\` matches the GroupCard layout shape
- [ ] Animation uses \`useNativeDriver: true\`
- [ ] No memory leaks (animation cleaned up on unmount)" \
  '["mobile","good first issue"]'

create_issue \
  "Create reusable ProgressBar component for contribution round display" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

On group cards and detail screens, users should see how many rounds of contributions have been completed out of the total. A \`ProgressBar\` makes this immediately visual — e.g. 'Round 3 of 10'.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/ui/ProgressBar.tsx\`
- [ ] Accept props: \`progress\` (0–1), \`color\` (default primary blue), \`height\` (default 8), \`label\` (optional)
- [ ] Render a background track and a filled inner bar at width = \`progress * 100%\`
- [ ] Clamp \`progress\` to \`[0, 1]\`
- [ ] Animate width change with \`Animated.timing\`

---

### ✅ Acceptance Criteria

- [ ] Bar fills proportionally to \`progress\` value
- [ ] \`progress=0\` shows empty bar, \`progress=1\` shows full bar
- [ ] Width animation is smooth (200ms)
- [ ] Optional label renders correctly" \
  '["mobile","good first issue"]'

create_issue \
  "Create reusable Divider component" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

A horizontal divider line visually separates sections within cards and screens. Having a single \`Divider\` component ensures consistent spacing and color everywhere.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/ui/Divider.tsx\`
- [ ] Accept props: \`color\` (default \`#334155\`), \`thickness\` (default \`1\`), \`marginVertical\` (default \`8\`)
- [ ] Render a \`View\` with \`height: thickness\`, \`backgroundColor: color\`, full width
- [ ] Export from \`mobile/components/ui/index.ts\`

---

### ✅ Acceptance Criteria

- [ ] Divider renders as a full-width horizontal line
- [ ] Color, thickness, and margin are customizable
- [ ] Renders correctly inside \`Card\` and \`ScrollView\`" \
  '["mobile","good first issue"]'

create_issue \
  "Create SectionHeader component for screen section titles" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Screens like Home, Group Detail, and Profile have multiple sections (e.g. 'Recent Activity', 'Contribution History'). A consistent \`SectionHeader\` component makes section headings look the same everywhere.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/ui/SectionHeader.tsx\`
- [ ] Accept props: \`title\` (string), \`actionLabel\` (optional), \`onAction\` (optional)
- [ ] Render \`title\` in medium-weight font with muted color
- [ ] If \`actionLabel\` is provided, render it on the right as a tappable link
- [ ] Add consistent vertical padding and bottom margin
- [ ] Export from \`mobile/components/ui/index.ts\`

---

### ✅ Acceptance Criteria

- [ ] Renders with correct typography and spacing
- [ ] Optional action label is tappable and appears on the right
- [ ] Consistent across all screens that use it" \
  '["mobile","good first issue"]'

echo ""
echo "── Onboarding ─────────────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# ONBOARDING  (5 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Build onboarding welcome screen (Screen 1 of 3)" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

First-time users see an onboarding flow before reaching the main app. Screen 1 is the welcome screen — it introduces EsuStellar with a hero graphic, headline, and tagline.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/onboarding/index.tsx\`
- [ ] Display the EsuStellar logo or placeholder ⭐ emoji
- [ ] Show headline: \`\"Save Together, Trust the Chain\"\`
- [ ] Show 1–2 sentence subtext explaining the app
- [ ] Add a 'Next' button navigating to Screen 2
- [ ] Add a 'Skip' text link at top-right navigating past all onboarding

---

### ✅ Acceptance Criteria

- [ ] Screen renders without errors
- [ ] 'Next' navigates to Screen 2
- [ ] 'Skip' navigates past all onboarding
- [ ] Layout is centered and visually clean" \
  '["mobile","good first issue"]'

create_issue \
  "Build onboarding 'How it Works' screen (Screen 2 of 3)" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Screen 2 explains the EsuStellar concept in three simple steps: Create a group → Members contribute → Payouts rotate. This helps users understand the app before signing up.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/onboarding/how-it-works.tsx\`
- [ ] Show 3 numbered steps with an icon, title, and one-line description:
  1. 🏦 Create or join a savings group
  2. 💸 Contribute monthly with your Stellar wallet
  3. 🔄 Receive payouts in rotating order
- [ ] Add 'Back' and 'Next' navigation buttons
- [ ] Add 'Skip' text link at top-right

---

### ✅ Acceptance Criteria

- [ ] Three steps display clearly
- [ ] 'Back' returns to Screen 1
- [ ] 'Next' navigates to Screen 3
- [ ] 'Skip' navigates past onboarding" \
  '["mobile","good first issue"]'

create_issue \
  "Build onboarding 'Get Started' screen (Screen 3 of 3)" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Screen 3 is the onboarding CTA — it directs users to connect their Stellar wallet. It reinforces the value proposition with a 'You're ready!' message and a 'Connect Wallet' primary button.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/onboarding/get-started.tsx\`
- [ ] Show a 'You're ready!' message and encouraging sub-headline
- [ ] Add primary 'Connect Wallet' button navigating to the wallet connect screen
- [ ] Add a 'Back' text link
- [ ] On completion, save \`onboardingComplete: true\` to AsyncStorage

---

### ✅ Acceptance Criteria

- [ ] 'Connect Wallet' button navigates to wallet connect screen
- [ ] Completion flag persists to AsyncStorage
- [ ] Screen renders without errors
- [ ] 'Back' returns to Screen 2" \
  '["mobile","good first issue"]'

create_issue \
  "Add dot pagination indicator to onboarding screens" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Onboarding flows typically show a row of dots at the bottom indicating which screen the user is on (e.g. ● ○ ○ for screen 1). This helps users know how far along they are.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/onboarding/PaginationDots.tsx\`
- [ ] Accept props: \`total\` (number of dots), \`current\` (0-based index of active dot)
- [ ] Active dot: filled, primary color, slightly larger
- [ ] Inactive dots: dimmed, smaller
- [ ] Add \`<PaginationDots total={3} current={N} />\` to each onboarding screen

---

### ✅ Acceptance Criteria

- [ ] Correct dot is highlighted on each screen
- [ ] Component is reusable with any \`total\`
- [ ] Dots are centered at the bottom of each screen" \
  '["mobile","good first issue"]'

create_issue \
  "Persist onboarding completion and skip onboarding on return visits" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Users who have already completed onboarding should not see it again when they reopen the app. We need to check AsyncStorage on startup and redirect appropriately.

---

### 🛠️ Tasks

- [ ] Install \`@react-native-async-storage/async-storage\` if not already installed
- [ ] In \`mobile/app/_layout.tsx\`, read \`onboardingComplete\` from AsyncStorage on mount
- [ ] If \`true\`, skip to \`/(tabs)\` (or wallet connect screen if no wallet connected)
- [ ] If not set, navigate to \`/onboarding\`
- [ ] Show \`LoadingScreen\` while checking AsyncStorage

---

### ✅ Acceptance Criteria

- [ ] First launch shows onboarding
- [ ] Subsequent launches skip onboarding
- [ ] Loading state prevents flash of incorrect screen
- [ ] Clearing app data resets onboarding" \
  '["mobile","good first issue"]'

echo ""
echo "── Auth / Wallet ───────────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# AUTH / WALLET  (5 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Build wallet connect landing screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

Users must connect a Stellar wallet before using the app. The wallet connect screen lists supported wallet options (Freighter, Lobstr) and explains what connecting means. It lives outside the main tab navigator.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/wallet/connect.tsx\`
- [ ] Show EsuStellar logo and headline: \`\"Connect your Stellar Wallet\"\`
- [ ] Add sub-message: \`\"Your wallet is used to sign contributions and payouts on-chain\"\`
- [ ] Display two wallet option buttons: 'Connect Freighter' and 'Connect Lobstr' (stub \`onPress\` to console.log)
- [ ] Add a 'What is a Stellar wallet?' help link

---

### ✅ Acceptance Criteria

- [ ] Screen renders with wallet options listed
- [ ] Tapping wallet buttons logs to console
- [ ] Help text link is visible and tappable
- [ ] No TypeScript errors" \
  '["mobile","good first issue"]'

create_issue \
  "Display truncated wallet address in the app header" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Once a user connects their wallet, their Stellar address should appear in the header. Stellar addresses are 56 characters long — we show a truncated version like \`GDQP...X7KM\`.

---

### 🛠️ Tasks

- [ ] Create \`truncateAddress(address: string, chars = 4): string\` in \`mobile/utils/stellar.ts\`
- [ ] In the home screen or tabs header, display the truncated wallet address
- [ ] Wrap in a \`Pressable\` that copies the full address to clipboard on tap
- [ ] Show 'Not connected' when no wallet is connected

---

### ✅ Acceptance Criteria

- [ ] Address truncates to \`GXXX...XXXX\` format
- [ ] 'Not connected' shows when wallet is absent
- [ ] \`truncateAddress\` utility is pure and testable
- [ ] No TypeScript errors" \
  '["mobile","good first issue"]'

create_issue \
  "Add 'Copy wallet address' button with toast feedback" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Users often need to share their Stellar wallet address. A copy icon next to the address lets them copy it to clipboard with a single tap, confirmed by a brief toast message.

---

### 🛠️ Tasks

- [ ] In the profile screen, add a copy icon button next to the wallet address
- [ ] Use \`expo-clipboard\` (\`Clipboard.setStringAsync(address)\`) to copy
- [ ] Show a success toast or \`Alert\`: \`\"Wallet address copied to clipboard\"\`
- [ ] Wrap in try/catch and show an error message if copy fails

---

### ✅ Acceptance Criteria

- [ ] Tapping copy button copies the full wallet address
- [ ] Success feedback appears within 500ms
- [ ] Error case is handled gracefully
- [ ] Works on both iOS and Android" \
  '["mobile","good first issue"]'

create_issue \
  "Build wallet disconnect confirmation modal" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Users need a way to disconnect their wallet (e.g. when switching wallets). This action should require confirmation to prevent accidental disconnection.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/wallet/DisconnectModal.tsx\`
- [ ] Accept props: \`visible\`, \`onConfirm\`, \`onCancel\`
- [ ] Show title: \`\"Disconnect Wallet?\"\` and warning message
- [ ] Two buttons: 'Cancel' (outline) and 'Disconnect' (error/red)
- [ ] Use React Native \`Modal\` with a semi-transparent backdrop

---

### ✅ Acceptance Criteria

- [ ] Modal renders over a dark backdrop
- [ ] 'Cancel' closes modal without action
- [ ] 'Disconnect' calls \`onConfirm\` and closes modal
- [ ] Modal is accessible (screen reader reads title)" \
  '["mobile"]'

create_issue \
  "Show wallet-not-connected empty state on protected screens" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Screens like Groups, Dashboard, and Profile require a connected wallet. If a user reaches these screens without a wallet, show a friendly empty state instead of crashing.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/wallet/WalletRequired.tsx\`
- [ ] Accept \`children\` as props
- [ ] Check wallet connection state from auth store/context
- [ ] If not connected, render \`EmptyState\` with icon 🔗, title 'Wallet Not Connected', and a 'Connect Wallet' action button
- [ ] If connected, render \`children\` normally

---

### ✅ Acceptance Criteria

- [ ] Shows empty state when no wallet is connected
- [ ] 'Connect Wallet' button navigates to connect screen
- [ ] Children render normally when wallet is connected
- [ ] Works as a wrapper on any screen" \
  '["mobile","good first issue"]'

echo ""
echo "── Home Screen ─────────────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# HOME SCREEN  (4 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Build home screen layout with greeting header" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

The home screen is the first thing users see after connecting their wallet. It should greet them with their wallet address and show a summary of savings activity.

---

### 🛠️ Tasks

- [ ] Create or update \`mobile/app/(tabs)/index.tsx\`
- [ ] Add a \`HomeHeader\` sub-component with:
  - Time-of-day greeting (Good morning / afternoon / evening)
  - Truncated wallet address (or 'EsuStellar User' fallback)
  - Notification bell icon on the right
- [ ] Use a \`ScrollView\` as the root container
- [ ] Add placeholder sections for balance and quick actions

---

### ✅ Acceptance Criteria

- [ ] Screen renders without errors
- [ ] Greeting changes based on time of day
- [ ] Wallet address or fallback is displayed
- [ ] Notification bell is tappable" \
  '["mobile","good first issue"]'

create_issue \
  "Add total savings balance card to home screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

The home screen should prominently display the user's total contributed savings amount. For now display a static \`0.00 XLM\` — real contract data connects in a later issue.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/home/BalanceCard.tsx\`
- [ ] Display label: 'Total Contributed'
- [ ] Display large XLM amount (hardcoded \`0.00 XLM\` initially)
- [ ] Display secondary line: 'Across X active groups' (hardcode 0 for now)
- [ ] Use reusable \`Card\` as the container
- [ ] Add to home screen

---

### ✅ Acceptance Criteria

- [ ] BalanceCard renders on the home screen
- [ ] XLM amount is prominently displayed
- [ ] Secondary group count is visible
- [ ] Card matches the dark theme" \
  '["mobile","good first issue"]'

create_issue \
  "Add Quick Actions section to the home screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

A 'Quick Actions' row gives users one-tap access to common tasks: Make a Contribution, Join a Group, and View My Groups. This reduces taps needed for key flows.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/home/QuickActions.tsx\`
- [ ] Display 3 action buttons in a horizontal row:
  - 💸 'Contribute' → navigates or logs
  - 🤝 'Join Group' → navigates to groups/join
  - 👥 'My Groups' → navigates to groups tab
- [ ] Each action: icon above, label below
- [ ] Use \`Card\` as section container

---

### ✅ Acceptance Criteria

- [ ] All three actions are visible and tappable
- [ ] Navigation works for tabs that exist
- [ ] Unimplemented actions log to console
- [ ] Fits on small screen widths without overflow" \
  '["mobile","good first issue"]'

create_issue \
  "Display recent activity list on the home screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

The home screen should show the user's recent activity (contributions made, payouts received). Use hardcoded mock data for now — real contract data connects later.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/home/RecentActivity.tsx\`
- [ ] Define 3–5 mock activity items: \`{ type: 'contribution' | 'payout', groupName, amount, date }\`
- [ ] Render each as a row: icon, group name + description, amount (green for payout), date
- [ ] Show \`EmptyState\` when array is empty
- [ ] Add section header: 'Recent Activity'

---

### ✅ Acceptance Criteria

- [ ] Mock items render correctly
- [ ] Icons and colors differ between contribution and payout types
- [ ] Empty state shows when no items
- [ ] Section header is visible" \
  '["mobile"]'

echo ""
echo "── Groups List ─────────────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# GROUPS LIST  (6 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Create mobile GroupCard component" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

The groups list screen needs a card to display each savings group. This is the mobile equivalent of the web \`GroupCard\`. It shows name, contribution amount (XLM), frequency, member count, and status badge.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/groups/GroupCard.tsx\`
- [ ] Props: \`id\`, \`name\`, \`contributionAmount\`, \`frequency\`, \`currentMembers\`, \`totalMembers\`, \`status\`, \`nextPayout\`
- [ ] Display: group name, status \`Badge\`, contribution amount + frequency, member count, next payout date
- [ ] Make the whole card \`Pressable\` — navigate to group detail on press
- [ ] Use reusable \`Card\` as the container

---

### ✅ Acceptance Criteria

- [ ] All props render correctly
- [ ] Status badge color matches group status
- [ ] Tapping card navigates or logs the group ID
- [ ] Typed with TypeScript" \
  '["mobile","good first issue"]'

create_issue \
  "Build groups list screen with FlatList and mock data" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

The Groups tab shows a list of all available savings groups. Uses \`FlatList\` for efficient rendering. Populate with 3–4 hardcoded mock groups for now.

---

### 🛠️ Tasks

- [ ] Create or update \`mobile/app/(tabs)/groups/index.tsx\`
- [ ] Define a mock array of 3–4 group objects
- [ ] Render with \`FlatList\` using \`GroupCard\` as the item renderer
- [ ] Add screen title header: 'Savings Groups'
- [ ] Add \`ItemSeparatorComponent\` for spacing
- [ ] Add bottom \`contentContainerStyle\` padding

---

### ✅ Acceptance Criteria

- [ ] Groups list renders with mock data
- [ ] \`FlatList\` scrolls smoothly
- [ ] Cards are spaced correctly
- [ ] Screen title is visible" \
  '["mobile","good first issue"]'

create_issue \
  "Add search bar to the groups list screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

As the number of groups grows, users need to search by name. A search bar at the top of the groups list filters the displayed groups in real time.

---

### 🛠️ Tasks

- [ ] Add a \`TextInput\` search bar at the top of the groups list screen
- [ ] Track \`searchQuery\` with \`useState\`
- [ ] Filter mock groups to only show those whose \`name\` contains the query (case-insensitive)
- [ ] Show a clear (×) button when query is non-empty
- [ ] Show \`EmptyState\` with message \`\"No groups found for '...'\"\` when no results

---

### ✅ Acceptance Criteria

- [ ] Typing filters the list in real time
- [ ] Clear button resets search
- [ ] Empty state shows when no results match
- [ ] Search is case-insensitive" \
  '["mobile","good first issue"]'

create_issue \
  "Add pull-to-refresh on the groups list screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Users should be able to pull down on the groups list to refresh data. React Native's \`FlatList\` supports this natively via \`refreshControl\`.

---

### 🛠️ Tasks

- [ ] Add \`refreshing\` state to the groups list screen
- [ ] Add \`onRefresh\` callback: set \`refreshing: true\`, wait 1s (simulated fetch), set \`refreshing: false\`
- [ ] Pass \`<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />\` to \`FlatList.refreshControl\`
- [ ] Use the primary color for spinner tint

---

### ✅ Acceptance Criteria

- [ ] Pulling down shows the refresh spinner
- [ ] Spinner disappears after the simulated delay
- [ ] Primary color tint is applied
- [ ] No layout shifts during refresh" \
  '["mobile","good first issue"]'

create_issue \
  "Build empty state for 'no groups joined' on groups list screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

When a user has no groups, show a friendly empty state guiding them toward joining or creating a group — instead of a blank screen.

---

### 🛠️ Tasks

- [ ] Use \`FlatList\`'s \`ListEmptyComponent\` prop on the groups list screen
- [ ] Pass \`EmptyState\` with:
  - Icon: 👥
  - Title: 'No savings groups yet'
  - Message: 'Join an existing group or create your own to start saving together'
  - Action button: 'Browse Groups' or 'Create a Group'
- [ ] Verify by emptying the mock data array

---

### ✅ Acceptance Criteria

- [ ] Empty state renders when groups array is empty
- [ ] Action button is visible and tappable
- [ ] Does not show when groups exist
- [ ] Layout is vertically centered" \
  '["mobile","good first issue"]'

create_issue \
  "Add 'My Groups / All / Open' filter tabs to groups list screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

The groups list will contain both joined and joinable groups. A simple tab filter lets users switch between 'All', 'Joined', and 'Open' groups quickly.

---

### 🛠️ Tasks

- [ ] Add a filter tab bar at the top of the groups list with three options: All / Joined / Open
- [ ] Track active filter with \`useState\`
- [ ] Filter mock groups:
  - All: show all groups
  - Joined: groups where \`userJoined: true\`
  - Open: groups where \`status === 'Open'\`
- [ ] Highlight active filter tab with underline or background

---

### ✅ Acceptance Criteria

- [ ] Three filter tabs render
- [ ] Selecting a filter updates displayed groups
- [ ] Active tab is visually highlighted
- [ ] Filters work correctly with mock data" \
  '["mobile","good first issue"]'

echo ""
echo "── Group Detail ────────────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# GROUP DETAIL  (6 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Build group detail screen header with name, status, and contribution info" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

When a user taps a GroupCard they go to the group detail screen. The header shows the group's key info: name, status badge, contribution amount, frequency, and member count.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/(tabs)/groups/[groupId].tsx\`
- [ ] Read \`groupId\` from route params with \`useLocalSearchParams\`
- [ ] Show a hardcoded mock group matching the ID
- [ ] Create \`GroupDetailHeader\` sub-component: name, status badge, XLM amount, frequency, member count
- [ ] Add a back button in the navigation header

---

### ✅ Acceptance Criteria

- [ ] Screen loads when navigated from GroupCard
- [ ] \`groupId\` is read from URL params
- [ ] Header displays correct mock group info
- [ ] Back button returns to groups list" \
  '["mobile"]'

create_issue \
  "Add members section with avatar stack to group detail screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

The group detail screen should show who the members are. An 'avatar stack' (overlapping circular avatars) gives a quick visual summary.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/groups/MemberAvatarStack.tsx\`
- [ ] Props: \`members\` (array of \`{ address: string, name?: string }\`), \`maxVisible\` (default 5)
- [ ] Render up to \`maxVisible\` \`Avatar\` components overlapping (negative \`marginLeft\`)
- [ ] Show \`+N\` badge for remaining members
- [ ] Add 'View All Members' text link below
- [ ] Place in group detail with mock member data

---

### ✅ Acceptance Criteria

- [ ] Up to 5 avatars render overlapping
- [ ] \`+N\` shows for additional members
- [ ] 'View All Members' link is visible and tappable
- [ ] Handles 1 member without breaking" \
  '["mobile","good first issue"]'

create_issue \
  "Build payout schedule list component for group detail screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

In a rotating savings group, each member receives a payout in turn. The group detail screen should show the full payout schedule: who receives funds in which round and on what date.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/groups/PayoutSchedule.tsx\`
- [ ] Props: \`rounds\` array of \`{ round, recipient, date, status: 'upcoming' | 'completed' | 'current' }\`
- [ ] Each row: round number, truncated wallet address, date, status indicator
- [ ] Highlight current round (bold, different background)
- [ ] Completed rounds show a ✓ checkmark
- [ ] Use mock data in group detail screen

---

### ✅ Acceptance Criteria

- [ ] All rounds render in order
- [ ] Current round is visually highlighted
- [ ] Completed rounds show checkmark
- [ ] Truncated addresses display correctly" \
  '["mobile","good first issue"]'

create_issue \
  "Build contribution history list for group detail screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

The group detail screen should show all past contributions: who paid, how much, and when. This transparency is a core value of EsuStellar.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/groups/ContributionHistory.tsx\`
- [ ] Props: \`transactions\` array of \`{ contributor, amount, date, round }\`
- [ ] Each row: truncated contributor address, amount (XLM), date, round number
- [ ] Section header: 'Contribution History'
- [ ] Show \`EmptyState\` with 'No contributions yet' when empty
- [ ] Place in group detail with 4 mock transactions

---

### ✅ Acceptance Criteria

- [ ] Transactions render newest-first
- [ ] Empty state shows correctly
- [ ] Each row shows all four data points
- [ ] Handles large lists without performance issues" \
  '["mobile","good first issue"]'

create_issue \
  "Add 'Copy Group Invite Code' button to group detail screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Group organizers need to invite members using a short invite code. The group detail screen should show this code and let the organizer copy it to clipboard with one tap.

---

### 🛠️ Tasks

- [ ] Add \`inviteCode\` field to mock group object (e.g. \`ESU-ABCD-1234\`)
- [ ] Render a row: 'Invite Code: ESU-ABCD-1234' with a copy icon button
- [ ] On tap, copy using \`expo-clipboard\` and show toast: 'Invite code copied!'
- [ ] Only show this row if current user is the group creator (\`isOwner: boolean\` in mock)

---

### ✅ Acceptance Criteria

- [ ] Invite code row renders for group owner
- [ ] Copy action copies the code
- [ ] Success toast appears after copy
- [ ] Row is hidden for non-owners" \
  '["mobile","good first issue"]'

create_issue \
  "Show next payout countdown in group detail screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Members want to know how long until the next payout. A countdown showing 'Days until next payout: 14' in the group detail gives members a clear timeline.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/groups/NextPayoutCountdown.tsx\`
- [ ] Prop: \`nextPayoutDate\` (ISO date string)
- [ ] Calculate days difference between today and \`nextPayoutDate\`
- [ ] Display: 'Next payout in X days' (or 'Payout due today!' if 0 days)
- [ ] Add a small calendar icon
- [ ] Use \`ProgressBar\` to show progress toward payout (30-day cycle)

---

### ✅ Acceptance Criteria

- [ ] Countdown shows correct days
- [ ] 'Payout due today!' shows when days = 0
- [ ] Progress bar fills as payout approaches
- [ ] Past dates show 'Payout overdue'" \
  '["mobile","good first issue"]'

echo ""
echo "── Contributions ───────────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# CONTRIBUTIONS  (4 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Build contribution confirmation modal" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: High**

---

### 📖 Context

Before submitting a contribution on-chain, users should see a confirmation showing the exact amount, group name, and expected wallet deduction. This prevents accidental transactions — critical for a financial app.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/contributions/ContributionConfirmModal.tsx\`
- [ ] Props: \`visible\`, \`groupName\`, \`amount\` (XLM), \`onConfirm\`, \`onCancel\`
- [ ] Display: group name, amount in XLM, network fee disclaimer (\`+ ~0.00001 XLM network fee\`)
- [ ] Two buttons: 'Cancel' (outline) and 'Confirm & Pay' (primary)
- [ ] 'Confirm & Pay' shows \`ActivityIndicator\` while processing

---

### ✅ Acceptance Criteria

- [ ] Modal shows group name and contribution amount
- [ ] Network fee disclaimer is present
- [ ] 'Cancel' closes modal
- [ ] 'Confirm & Pay' shows loading and calls \`onConfirm\`" \
  '["mobile"]'

create_issue \
  "Build contribution success screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

After a contribution is submitted successfully, show a celebratory success screen confirming the transaction. This closes the contribution flow and gives users confidence.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/contributions/success.tsx\`
- [ ] Display a large ✅ icon (or animated scale-in icon)
- [ ] Show headline: 'Contribution Successful!'
- [ ] Show group name and amount contributed
- [ ] Add 'Back to Home' and 'View Group' buttons
- [ ] Accept route params: \`groupName\`, \`amount\`, \`txHash\`

---

### ✅ Acceptance Criteria

- [ ] Screen renders with success icon
- [ ] Group name and amount display from route params
- [ ] 'Back to Home' navigates to home screen
- [ ] 'View Group' navigates to group detail" \
  '["mobile","good first issue"]'

create_issue \
  "Add contribution due date badge to GroupCard and home screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Users need reminders about upcoming contribution deadlines. A 'Due in X days' badge helps users plan their payments in advance.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/contributions/DueDateBadge.tsx\`
- [ ] Prop: \`dueDate\` (ISO string)
- [ ] Color logic:
  - > 7 days → neutral/gray
  - 3–7 days → warning/amber
  - ≤ 2 days → error/red with 🚨
  - 0 days → 'Due today' in red
  - Past due → 'Overdue' in red
- [ ] Render as a small pill badge
- [ ] Add to \`GroupCard\` component

---

### ✅ Acceptance Criteria

- [ ] Badge shows correct number of days
- [ ] Color changes per urgency rules
- [ ] Renders correctly inside GroupCard
- [ ] Past-due date shows 'Overdue' in red" \
  '["mobile","good first issue"]'

create_issue \
  "Add contribution status indicator to group member list (Paid / Pending / Late)" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

In the group detail member list, each member's contribution status for the current round should be visible at a glance: who has paid, who hasn't, and who is overdue.

---

### 🛠️ Tasks

- [ ] Add \`contributionStatus: 'paid' | 'pending' | 'late'\` to mock member data
- [ ] Show a colored dot or badge next to each member:
  - paid → green dot ✓
  - pending → gray dot (waiting)
  - late → red dot ⚠️
- [ ] Add a legend at the top of the members section explaining the three states

---

### ✅ Acceptance Criteria

- [ ] All three statuses render with correct colors
- [ ] Legend is visible and correct
- [ ] Mock data covers all three status values
- [ ] No layout overflow for long wallet addresses" \
  '["mobile","good first issue"]'

echo ""
echo "── Profile & Settings ──────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# PROFILE & SETTINGS  (5 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Build profile screen with wallet address and display name" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

The Profile tab shows the user's identity and account details: avatar, display name, wallet address, and links to settings.

---

### 🛠️ Tasks

- [ ] Create or update \`mobile/app/(tabs)/profile/index.tsx\`
- [ ] Show large (64px) \`Avatar\` with user initials
- [ ] Show display name (mock: 'EsuStellar User') and truncated wallet address
- [ ] 'Edit Profile' button → navigates to \`profile/edit\`
- [ ] 'Settings' row → navigates to \`profile/settings\`
- [ ] 'Disconnect Wallet' row → opens disconnect modal

---

### ✅ Acceptance Criteria

- [ ] Profile screen renders with avatar, name, and address
- [ ] All navigation links work
- [ ] Screen is part of the bottom tab navigator" \
  '["mobile","good first issue"]'

create_issue \
  "Build edit profile screen with display name input" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Users should be able to set a friendly display name (stored locally, not on-chain). This makes the app feel personal and group member lists more readable.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/(tabs)/profile/edit.tsx\`
- [ ] Pre-fill \`TextInput\` with current display name from AsyncStorage
- [ ] Character limit: 32 chars — show \`X/32\` counter
- [ ] 'Save': persist to AsyncStorage, navigate back
- [ ] 'Cancel': discard changes, navigate back
- [ ] Validate: name must not be empty

---

### ✅ Acceptance Criteria

- [ ] Input is pre-filled with existing name
- [ ] Character counter updates as user types
- [ ] Save persists to AsyncStorage
- [ ] Empty name is blocked from saving" \
  '["mobile","good first issue"]'

create_issue \
  "Build settings screen layout with grouped sections" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

The Settings screen gives users control over app preferences. It should be a grouped list: Appearance, Notifications, Security, and About.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/(tabs)/profile/settings.tsx\`
- [ ] Group settings into sections:
  - **Appearance**: Theme toggle
  - **Notifications**: Notification preferences
  - **Security**: Biometric toggle
  - **About**: App version, Privacy Policy, Open Source
- [ ] Each row has a label and right-side value or arrow
- [ ] Read app version from \`expo-constants\`

---

### ✅ Acceptance Criteria

- [ ] All four sections render with correct items
- [ ] App version displays correctly
- [ ] Rows navigate or log on tap
- [ ] Back button returns to profile" \
  '["mobile","good first issue"]'

create_issue \
  "Add light/dark theme toggle to the settings screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Allowing users to toggle light/dark mode is a quality-of-life feature. The preference should persist between sessions.

---

### 🛠️ Tasks

- [ ] Add a \`colorScheme\` preference (\`'dark' | 'light' | 'system'\`) to the auth/settings store
- [ ] In settings Appearance section, add a toggle row with three options: Dark / Light / System
- [ ] Persist selection to AsyncStorage
- [ ] Apply theme via \`ThemeContext\` or React Native Paper
- [ ] Test that the setting persists after app restart

---

### ✅ Acceptance Criteria

- [ ] Theme toggle appears in settings
- [ ] Changing theme applies immediately
- [ ] Selection persists after app restart
- [ ] 'System' follows device dark/light preference" \
  '["mobile","good first issue"]'

create_issue \
  "Build notification preferences settings screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Users should control which push notifications they receive: contribution reminders, payout received, new member joined, and group status changes.

---

### 🛠️ Tasks

- [ ] Create \`mobile/app/(tabs)/profile/notifications-settings.tsx\`
- [ ] List 4 toggles using React Native \`Switch\`:
  - Contribution Reminders (default: on)
  - Payout Received (default: on)
  - New Member Joined (default: off)
  - Group Status Changes (default: on)
- [ ] Persist toggle states to AsyncStorage
- [ ] Add a description label for each toggle

---

### ✅ Acceptance Criteria

- [ ] All four toggles render with correct defaults
- [ ] State persists between sessions
- [ ] Each toggle has a descriptive label
- [ ] Screen is accessible from settings" \
  '["mobile","good first issue"]'

echo ""
echo "── Notifications ───────────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# NOTIFICATIONS  (3 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Build notifications list screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

The Notifications tab shows all recent activity alerts: contribution reminders, payout confirmations, group invites, etc. Use hardcoded mock notifications for now.

---

### 🛠️ Tasks

- [ ] Create or update \`mobile/app/(tabs)/notifications/index.tsx\`
- [ ] Define 4–5 mock notifications: \`{ id, type, title, message, date, read }\`
- [ ] Render with \`FlatList\` using \`NotificationItem\`
- [ ] Add a 'Mark All as Read' button at top-right
- [ ] Show \`EmptyState\` with 'No notifications yet' when list is empty

---

### ✅ Acceptance Criteria

- [ ] Notifications render with mock data
- [ ] Unread notifications are visually distinct (blue dot or bold)
- [ ] 'Mark All as Read' makes all appear read
- [ ] Empty state shows correctly" \
  '["mobile","good first issue"]'

create_issue \
  "Create NotificationItem component" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Each notification needs a consistent row: icon representing the type, title, message preview, and timestamp. Unread notifications should be highlighted.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/notifications/NotificationItem.tsx\`
- [ ] Props: \`type\` (\`contribution\` | \`payout\` | \`member\` | \`status\`), \`title\`, \`message\`, \`date\`, \`read\`
- [ ] Map \`type\` to emoji: 💸 / 🏆 / 👥 / 🔔
- [ ] If \`read\` is false, show a small blue dot on the left
- [ ] Format \`date\` as relative time ('2 hours ago', 'Yesterday')
- [ ] Make the row \`Pressable\`

---

### ✅ Acceptance Criteria

- [ ] All four types render with correct icons
- [ ] Blue dot appears only on unread items
- [ ] Date shows as relative time
- [ ] Row is pressable" \
  '["mobile","good first issue"]'

create_issue \
  "Add unread notification badge on the notifications tab icon" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

When the user has unread notifications, the Notifications tab icon should show a red badge with the count. This is the standard mobile UX pattern.

---

### 🛠️ Tasks

- [ ] In \`mobile/app/(tabs)/_layout.tsx\`, get the unread notification count from mock data or a store
- [ ] Add the \`tabBarBadge\` prop to the Notifications tab entry
- [ ] Only show the badge when unread count > 0
- [ ] Show '9+' when count exceeds 9

---

### ✅ Acceptance Criteria

- [ ] Badge appears when unread count > 0
- [ ] Badge disappears when all notifications are read
- [ ] '9+' shows for counts > 9
- [ ] Badge matches standard iOS/Android appearance" \
  '["mobile","good first issue"]'

echo ""
echo "── Accessibility & Polish ──────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# ACCESSIBILITY & POLISH  (7 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Add haptic feedback on button press interactions" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Haptic feedback on button presses makes the app feel more native and responsive. Expo provides \`expo-haptics\` for this. Standard actions get light feedback; destructive actions get heavy feedback.

---

### 🛠️ Tasks

- [ ] Install \`expo-haptics\`
- [ ] In the reusable \`Button\` component, call \`Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)\` on press for standard buttons
- [ ] For destructive buttons (Disconnect Wallet), use \`Heavy\`
- [ ] For success events (contribution confirmed), use \`Haptics.notificationAsync(NotificationFeedbackType.Success)\`

---

### ✅ Acceptance Criteria

- [ ] Tapping any Button triggers haptic feedback on physical devices
- [ ] Feedback intensity matches the action type
- [ ] No errors on simulator (where haptics are unavailable)" \
  '["mobile","good first issue"]'

create_issue \
  "Add KeyboardAvoidingView to all form screens" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

On screens with text inputs, the software keyboard can cover the input fields. \`KeyboardAwareScrollView\` fixes this by adjusting the layout when the keyboard appears.

---

### 🛠️ Tasks

- [ ] Install \`react-native-keyboard-aware-scroll-view\`
- [ ] Replace root \`ScrollView\` with \`KeyboardAwareScrollView\` on:
  - \`mobile/app/(tabs)/profile/edit.tsx\`
  - \`mobile/app/wallet/connect.tsx\`
  - \`mobile/app/groups/join.tsx\`
- [ ] Set \`enableOnAndroid={true}\` and \`extraScrollHeight={20}\`

---

### ✅ Acceptance Criteria

- [ ] On-screen inputs are not covered by the keyboard when focused
- [ ] Keyboard automatically scrolls to the focused input
- [ ] Works on both iOS and Android
- [ ] No layout jumps on keyboard appear/disappear" \
  '["mobile","good first issue"]'

create_issue \
  "Ensure all interactive elements have accessibilityLabel props" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Screen readers need descriptive labels on interactive elements to help users with visual impairments navigate the app. Any icon-only button must have an \`accessibilityLabel\`.

---

### 🛠️ Tasks

- [ ] Audit all icon-only buttons and add \`accessibilityLabel\`:
  - Notification bell → 'View notifications'
  - Copy address button → 'Copy wallet address'
  - Disconnect button → 'Disconnect wallet'
  - Group card → 'View [group name] savings group'
- [ ] Add \`accessibilityRole=\"button\"\` to all \`Pressable\` elements
- [ ] Add \`accessibilityHint\` where action is not obvious from label

---

### ✅ Acceptance Criteria

- [ ] All icon-only buttons have descriptive labels
- [ ] No interactive element has empty or missing label
- [ ] \`accessibilityRole\` is set on all pressable elements
- [ ] Verified with React Native Accessibility Inspector" \
  '["mobile","good first issue"]'

create_issue \
  "Add loading indicator while wallet is connecting" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

Wallet connections can take a few seconds. Without feedback, users may tap the button repeatedly. Show a loading state on the wallet connect button and prevent repeated taps while connecting.

---

### 🛠️ Tasks

- [ ] In the wallet connect screen, add a \`connecting\` boolean state
- [ ] When a wallet button is tapped, set \`connecting: true\` and disable all wallet buttons
- [ ] Show spinner using the \`Button\`'s \`loading\` prop
- [ ] After a simulated 2s delay, set \`connecting: false\`
- [ ] Show an error message if connection fails

---

### ✅ Acceptance Criteria

- [ ] Wallet button shows spinner while connecting
- [ ] All wallet buttons disabled while one is connecting
- [ ] Error message appears on simulated failure
- [ ] State resets correctly after attempt" \
  '["mobile","good first issue"]'

create_issue \
  "Add error boundary component for crash recovery" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

If a screen crashes due to an unexpected error, the app shouldn't show a white screen. A React Error Boundary catches render errors and shows a recovery screen instead.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/ErrorBoundary.tsx\` as a class component implementing \`componentDidCatch\`
- [ ] Fallback UI: ⚠️ icon, title 'Something went wrong', message, and a 'Retry' button
- [ ] Wrap each tab screen in the root \`_layout.tsx\` with \`<ErrorBoundary>\`
- [ ] Log error to console in \`componentDidCatch\`

---

### ✅ Acceptance Criteria

- [ ] Catches render errors in child components
- [ ] Fallback UI renders instead of a white screen
- [ ] 'Retry' button attempts to re-render children
- [ ] Error logged to console" \
  '["mobile"]'

create_issue \
  "Add network offline detection and offline banner" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

EsuStellar needs network connectivity to interact with the Stellar blockchain. If the user loses internet, inform them rather than showing confusing loading states.

---

### 🛠️ Tasks

- [ ] Install \`@react-native-community/netinfo\`
- [ ] Create \`mobile/hooks/useNetworkStatus.ts\` returning \`{ isConnected: boolean }\`
- [ ] Create \`mobile/components/ui/OfflineBanner.tsx\` — red banner: '⚠️ No internet connection'
- [ ] In root layout, show \`<OfflineBanner />\` when \`isConnected\` is false
- [ ] Banner animates in/out when connectivity changes

---

### ✅ Acceptance Criteria

- [ ] Banner appears when device goes offline
- [ ] Banner disappears when connectivity restores
- [ ] Banner is visible without blocking screen content
- [ ] Hook reflects real network status" \
  '["mobile"]'

create_issue \
  "Add 'Retry' button on failed data fetch screens" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

When a data fetch fails, users should see an error message with a retry button rather than being stuck on a loading or blank screen.

---

### 🛠️ Tasks

- [ ] Create \`mobile/components/ui/ErrorState.tsx\`
- [ ] Props: \`message\`, \`onRetry\`, \`retryLabel\` (default 'Try Again')
- [ ] Display: ⚠️ icon, message, and 'Try Again' button
- [ ] In the groups list, simulate a fetch that fails 30% of the time
- [ ] Show \`ErrorState\` on failure, \`LoadingSkeleton\` while loading, \`FlatList\` on success

---

### ✅ Acceptance Criteria

- [ ] Error state renders with message and retry button
- [ ] Retry button triggers a new fetch attempt
- [ ] Loading skeleton shows during fetch
- [ ] Switching between loading/error/success states works" \
  '["mobile","good first issue"]'

echo ""
echo "── Utilities & Hooks ───────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# UTILITIES & HOOKS  (4 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Create a custom useDebounce hook for search inputs" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

The search bar fires on every keystroke. When real API calls are added this sends too many requests. A \`useDebounce\` hook delays the value update until the user stops typing for 300ms.

---

### 🛠️ Tasks

- [ ] Create \`mobile/hooks/useDebounce.ts\`
- [ ] Accept \`value: T\` and \`delay: number\`, return debounced value
- [ ] Use \`useEffect\` + \`setTimeout\` internally; clean up on unmount
- [ ] Update groups list screen to use \`useDebounce(searchQuery, 300)\`
- [ ] Add JSDoc comment explaining the hook

---

### ✅ Acceptance Criteria

- [ ] Debounced value only updates after \`delay\` ms of inactivity
- [ ] Cleanup prevents memory leaks
- [ ] Search filter works correctly with debouncing
- [ ] Hook is generic (\`T\`) and works with any value type" \
  '["mobile","good first issue"]'

create_issue \
  "Create a formatXLM utility function for consistent XLM display" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

XLM amounts appear throughout the app. Currently each component formats them differently. A shared utility ensures consistent formatting everywhere: \`1,234.56 XLM\`.

---

### 🛠️ Tasks

- [ ] Create \`mobile/utils/stellar.ts\` (or add to existing)
- [ ] Implement \`formatXLM(amount: number, decimals = 2): string\`
  - Thousand separators, fixed decimals, ' XLM' suffix
- [ ] Edge cases: negative numbers (show as-is), \`NaN\` → '0.00 XLM'
- [ ] Replace all inline XLM formatting in components with this function

---

### ✅ Acceptance Criteria

- [ ] \`formatXLM(1234.5)\` → \`\"1,234.50 XLM\"\`
- [ ] \`formatXLM(0)\` → \`\"0.00 XLM\"\`
- [ ] \`formatXLM(NaN)\` → \`\"0.00 XLM\"\`
- [ ] All components use this function" \
  '["mobile","good first issue"]'

create_issue \
  "Create a custom useAsyncStorage hook for persistent state" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Multiple features (theme, onboarding flag, display name) read and write AsyncStorage. A shared hook centralizes this pattern and avoids code duplication.

---

### 🛠️ Tasks

- [ ] Create \`mobile/hooks/useAsyncStorage.ts\`
- [ ] Accepts \`key: string\` and \`defaultValue: T\`, returns \`[value, setValue, loading]\`
- [ ] On mount, read key from AsyncStorage and JSON-parse; use \`defaultValue\` if absent
- [ ] \`setValue\` JSON-serializes and writes to AsyncStorage, then updates local state
- [ ] Replace existing direct AsyncStorage calls in settings screens with this hook

---

### ✅ Acceptance Criteria

- [ ] Hook returns correct value after mount
- [ ] \`setValue\` updates both local state and AsyncStorage
- [ ] \`loading\` is \`true\` during initial read
- [ ] Works with string, number, boolean, and object types" \
  '["mobile","good first issue"]'

create_issue \
  "Create a Stellar transaction explorer link utility" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Transparency is central to EsuStellar. When a contribution is made, users should be able to tap a link to view the transaction on the Stellar blockchain explorer.

---

### 🛠️ Tasks

- [ ] Create \`getStellarExplorerUrl(txHash: string, network: 'testnet' | 'mainnet'): string\` in \`mobile/utils/stellar.ts\`
  - Testnet: \`https://stellar.expert/explorer/testnet/tx/\${txHash}\`
  - Mainnet: \`https://stellar.expert/explorer/public/tx/\${txHash}\`
- [ ] On contribution success screen, add 'View on Stellar Explorer' text link
- [ ] Use \`Linking.openURL()\` to open the URL
- [ ] Read network from \`EXPO_PUBLIC_STELLAR_NETWORK\` env var

---

### ✅ Acceptance Criteria

- [ ] Explorer URL is correct for testnet and mainnet
- [ ] Link opens in browser on tap
- [ ] Uses env variable for network selection
- [ ] Link hidden if \`txHash\` is undefined" \
  '["mobile","good first issue"]'

echo ""
echo "── Miscellaneous ───────────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# MISC  (4 issues)
# ─────────────────────────────────────────────────────────────

create_issue \
  "Create a mobile-specific README for the mobile/ directory" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

New contributors to the mobile app need clear setup instructions. The \`mobile/README.md\` should explain prerequisites, setup steps, and how to run the app.

---

### 🛠️ Tasks

- [ ] Create \`mobile/README.md\` with sections:
  - **Prerequisites**: Node.js, Expo CLI, iOS Simulator / Android Studio
  - **Setup**: \`npm install\`, copy \`.env.example\` → \`.env\`, fill variables
  - **Running**: \`npx expo start\`, opening on iOS/Android simulator
  - **Project Structure**: brief description of each folder
  - **Contributing**: link to root \`CONTRIBUTING.md\`

---

### ✅ Acceptance Criteria

- [ ] README covers all five sections
- [ ] Setup steps are accurate
- [ ] Folder structure matches actual structure
- [ ] Links are valid" \
  '["mobile","good first issue"]'

create_issue \
  "Add animated splash screen transition to the mobile app" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

Expo's default splash screen disappears abruptly. Using \`expo-splash-screen\`, we keep the native splash visible until the app is ready, then fade it out gracefully.

---

### 🛠️ Tasks

- [ ] Install and configure \`expo-splash-screen\`
- [ ] In root \`_layout.tsx\`, call \`SplashScreen.preventAutoHideAsync()\`
- [ ] After all async initialization completes, call \`SplashScreen.hideAsync()\`
- [ ] Add a 3s timeout fallback to force-hide the splash if something takes too long

---

### ✅ Acceptance Criteria

- [ ] Splash stays visible during initialization
- [ ] No white flash between splash and first screen
- [ ] Splash hides within 3s in worst case
- [ ] No errors in Expo logs" \
  '["mobile","good first issue"]'

create_issue \
  "Implement app version display in Settings > About section" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Low**

---

### 📖 Context

The Settings screen's About section should show the current app version. This helps users and support staff identify which version is running.

---

### 🛠️ Tasks

- [ ] Ensure \`expo-constants\` is installed
- [ ] Read \`Constants.expoConfig?.version\`
- [ ] Display in About section as: 'Version 1.0.0'
- [ ] Also display 'Build: X' using \`Constants.expoConfig?.extra?.buildNumber\` if available
- [ ] Fallback to 'Version: N/A' if version is undefined

---

### ✅ Acceptance Criteria

- [ ] App version string displays in About section
- [ ] Reads dynamically from \`app.json\` (not hardcoded)
- [ ] No crash if version field is undefined" \
  '["mobile","good first issue"]'

create_issue \
  "Add form validation to the join group screen" \
  "### 🏠 BlockHaven-Labs / esustellar \`mobile\`  |  **Priority: Medium**

---

### 📖 Context

The join group screen has an invite code input. Before submitting, validate that the code is non-empty and matches the expected format (\`ESU-XXXX-XXXX\`). This prevents confusing blockchain errors.

---

### 🛠️ Tasks

- [ ] In \`mobile/app/groups/join.tsx\`, add validation before form submit
- [ ] Validation rules:
  - Code must not be empty
  - Code must match: \`/^ESU-[A-Z0-9]{4}-[0-9]{4}\$/\`
- [ ] Show inline error via \`TextInput\`'s \`error\` prop
- [ ] Disable 'Join' button while input is empty
- [ ] Clear error when user starts typing again

---

### ✅ Acceptance Criteria

- [ ] Empty submit shows 'Invite code is required'
- [ ] Invalid format shows 'Invalid invite code format'
- [ ] Valid code clears error and enables Join button
- [ ] Error clears as user edits input" \
  '["mobile","good first issue"]'

echo ""
echo "======================================"
echo "  ✅  All mobile issues created!"
echo "======================================"
SCRIPT_EOF

echo "Script written successfully"
wc -l /home/runner/work/esustellar/esustellar/scripts/create-mobile-issues.sh