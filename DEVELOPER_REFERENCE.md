# 📋 Developer Reference Card - Recent Activity Feed

## Quick Reference

### Import Statements
```typescript
// activityFeed.ts
import { Horizon, rpc, xdr, scValToNative } from '@stellar/stellar-sdk';
import { SOROBAN_RPC_URL } from '@/config/walletConfig';

// recent-activity.tsx
import { useSavingsContract } from '@/context/savingsContract'
```

---

## Key Functions

### Main Entry Point
```typescript
// Fetch recent activities with optional group name resolver
fetchRecentActivity(userAddress: string, getGroupName?: (groupId: string) => Promise<string>)
  → Promise<Activity[]>
```

### In Component
```tsx
const { getGroupName } = useSavingsContract()
const data = await fetchRecentActivity(publicKey, getGroupName)
```

---

## Activity Interface
```typescript
interface Activity {
  type: 'contribution' | 'payout' | 'joined' | 'created' | 'round_end'
  description: string        // "Contributed 50.00 XLM to Tech Circle (Round 3)"
  amount: string | null      // "+1,125.00 XLM" or "-50.00 XLM"
  time: string              // "5 minutes ago"
  txHash: string | null     // Transaction hash
  groupId: string           // Group identifier
  groupName: string         // "Tech Workers Circle"
  roundNumber?: number      // 3
}
```

---

## Event Mapping Quick Reference

| Event | Data Fields | Output |
|-------|------------|--------|
| `created` | (group_id, amount, total_members) | Created [Group] |
| `joined` | (member, new_count) | Joined [Group] |
| `contrib` | (member, amount, round) | Contrib X to [Group] (R#) |
| `payout` | (recipient, amount, round) | Payout X from [Group] (R#) |
| `round_end` | (completed_round) | Round # completed |

---

## Conversion Constants
```typescript
// Stroops to XLM
const xlm = stroops / 10_000_000

// Example
const amount = 500_000_000  // stroops
const xlmAmount = amount / 10_000_000  // 50.00 XLM
```

---

## Amount Formatting
```typescript
formatAmount(amount: string | number): string

// Examples
formatAmount('50') → "50.00"
formatAmount(1125) → "1,125.00"
formatAmount('10000.5') → "10,000.50"
```

---

## Color Coding in UI
```tsx
// Contribution (Red)
className="text-red-500"

// Payout (Green)
className="text-green-500"

// Default (Foreground)
className="text-foreground"
```

---

## Error Handling Pattern
```typescript
try {
  // Do something
} catch (error) {
  console.error('Error context:', error)
  // Gracefully degrade or return null
}
```

---

## Caching Pattern (in Context)
```typescript
const cache = React.useMemo(() => new Map<string, string>(), [])

const getGroupName = React.useCallback(async (id: string) => {
  if (cache.has(id)) return cache.get(id)!
  
  const name = await fetchName(id)
  cache.set(id, name)
  return name
}, [cache])
```

---

## Common Patterns

### Extracting Event Data
```typescript
const data = event.data  // xdr.ScVal[]
const firstValue = scValToNative(data[0])
const amountVal = scValToNative(data[1])
const amount = Number(amountVal) / 10_000_000
```

### Building Activity
```typescript
const activity: Activity = {
  type: 'contribution',
  description: `Contributed ${amount.toFixed(2)} XLM`,
  amount: `-${amount.toFixed(2)} XLM`,
  time: formatTime(timestamp),
  txHash: hash,
  groupId: groupId,
  groupName: await getGroupName(groupId),
  roundNumber: roundNum
}
```

---

## Debugging Tips

### Check Events
```typescript
// In browser console
const events = parseContractEvents(resultMeta)
console.log('Events:', events)
```

### Check Data
```typescript
// In browser console
const native = scValToNative(xdrValue)
console.log('Native value:', native, typeof native)
```

### Check Network
1. Open DevTools Network tab
2. Look for `/api/tx` or Soroban requests
3. Verify responses contain eventsMeta

### Common Issues
```
Issue: "undefined is not a function"
→ Check if scValToNative is imported

Issue: NaN in amounts
→ Check stroops conversion: amount / 10_000_000

Issue: Empty group names
→ Check getGroupName is passed correctly

Issue: No events found
→ Check transaction actually has events
```

---

## File Locations
```
📁 apps/web/
├── 📄 lib/activityFeed.ts          ← Event parsing logic
├── 📄 context/savingsContract.tsx  ← Group name caching
└── 📄 components/recent-activity.tsx ← UI rendering

📁 config/
└── 📄 walletConfig.ts              ← RPC URLs

📁 docs/
├── 📄 IMPLEMENTATION_SUMMARY.md    ← Technical details
├── 📄 TESTING_GUIDE.md             ← Test scenarios
├── 📄 COMPLETION_SUMMARY.md        ← Project summary
└── 📄 DELIVERABLES_CHECKLIST.md   ← This checklist
```

---

## Quick Debugging Checklist
- [ ] Check TypeScript compilation errors
- [ ] Check browser console for errors
- [ ] Check Network tab for failed requests
- [ ] Verify Soroban RPC endpoint is accessible
- [ ] Check event data format
- [ ] Verify group name fetch
- [ ] Check amount calculations
- [ ] Verify UI rendering

---

## Performance Targets
- Load time: < 5 seconds ✓
- Operations fetched: 10 max ✓
- Parallel requests: Yes ✓
- Group name queries: Cached ✓
- Re-renders: Optimized ✓

---

## Support Resources
1. **IMPLEMENTATION_SUMMARY.md** - Full technical docs
2. **TESTING_GUIDE.md** - Test scenarios & troubleshooting
3. **Source comments** - JSDoc on all functions
4. **This card** - Quick reference

---

## Deployment Checklist
```
☐ TypeScript compiles without errors
☐ No console warnings
☐ Recent activity displays properly
☐ Group names show correctly
☐ Amounts format with 2 decimals
☐ Color coding works
☐ Links are functional
☐ Performance acceptable
☐ Error handling works
```

---

**Keep this card handy while debugging! 📌**
