# Recent Activity Feed - Testing Guide

## Quick Start

### What Changed
The Recent Activity feed now displays meaningful transaction descriptions instead of generic "Contract Interaction" text. It pulls data from Soroban contract events and enriches it with group names, amounts, and round numbers.

### Key Features Implemented

#### 1. Meaningful Activity Descriptions
- **Before**: "Contract Interaction"
- **After**: "Contributed 50.00 XLM to Tech Workers Circle (Round 3)"

#### 2. Color-Coded Amounts
- **Contributions**: Red text with minus sign (-50.00 XLM)
- **Payouts**: Green text with plus sign (+1,125.00 XLM)
- **Other**: Default text color (no amount shown)

#### 3. Clickable Group Links
- Click "View Group" to navigate to `/groups/[groupId]`
- Group names are now linked to group detail pages

#### 4. Round Numbers
- Shows which round the activity occurred in
- Format: "Round 8" displayed in parentheses

#### 5. Performance
- Limited to 10 most recent activities (fast loading)
- Parallel processing of Soroban RPC calls
- Group names cached to avoid duplicate queries

---

## Testing Checklist

### ✅ Test 1: Create Group
**Steps:**
1. Navigate to Create Group page
2. Fill in all required fields
3. Submit transaction
4. Wait for confirmation
5. Go to Dashboard

**Expected Result:**
- Recent Activity shows: "Created [Your Group Name]"
- No generic "Contract Interaction" text
- Group name is clickable
- Transaction hash is visible

---

### ✅ Test 2: Join Group
**Steps:**
1. Find a public group or use known group ID
2. Join the group
3. Wait for confirmation
4. Go to Dashboard

**Expected Result:**
- Recent Activity shows: "Joined [Group Name]"
- Correct group name displayed
- Blue icon with users symbol

---

### ✅ Test 3: Contribute to Group
**Steps:**
1. Join a group (or create one)
2. Wait for contribution window to open
3. Click Contribute
4. Enter contribution amount
5. Approve transaction
6. Go to Dashboard

**Expected Result:**
- Recent Activity shows: "Contributed [Amount] XLM to [Group Name] (Round X)"
- Amount is in RED with minus sign: "-50.00 XLM"
- Round number is visible
- Orange/red up arrow icon

---

### ✅ Test 4: Receive Payout
**Steps:**
1. Be in a group where your turn to receive payout is coming
2. Wait for all members to contribute in a round
3. Payout is automatically distributed
4. Go to Dashboard

**Expected Result:**
- Recent Activity shows: "Received payout of [Amount] XLM from [Group Name] (Round X)"
- Amount is in GREEN with plus sign: "+1,125.00 XLM"
- Round number is visible
- Green down arrow icon

---

### ✅ Test 5: Round Completion
**Steps:**
1. Be in an active group
2. Complete a full round (all members contribute)
3. Payout is processed
4. Go to Dashboard

**Expected Result:**
- Recent Activity shows: "Round X completed in [Group Name]"
- Check circle icon (muted color)
- No amount shown (this is a status event)

---

### ✅ Test 6: Multiple Groups
**Steps:**
1. Create or join at least 2 different groups
2. Perform activities in both groups
3. Go to Dashboard

**Expected Result:**
- Recent Activity shows activities from both groups
- Each activity shows correct group name
- Different groups have different names (not all generic)
- No duplicate API calls to fetch group names (check Network tab)

---

### ✅ Test 7: Amount Formatting
**Steps:**
1. Contribute 100 XLM (or any amount)
2. Check Recent Activity

**Expected Result:**
- Amount formatted with 2 decimal places
- Amount formatted with thousands separators if > 1,000
- Examples: "50.00 XLM", "1,125.00 XLM", "10,000.50 XLM"

---

### ✅ Test 8: Transaction Links
**Steps:**
1. Perform any transaction
2. In Recent Activity, find the transaction
3. Click the transaction hash link (e.g., "abc1...xyz9")

**Expected Result:**
- Opens Stellar Expert explorer in new tab
- Shows transaction details
- URL format: https://stellar.expert/explorer/testnet/tx/[HASH]

---

### ✅ Test 9: Group Detail Navigation
**Steps:**
1. Perform any activity
2. In Recent Activity, find the activity
3. Click "View Group" link

**Expected Result:**
- Navigates to group detail page
- URL format: `/groups/[groupId]`
- Shows correct group information

---

### ✅ Test 10: Graceful Fallback
**Steps:**
1. Perform a transaction that might cause an error
2. Or simulate network issues
3. Check Recent Activity

**Expected Result:**
- Activity still displays
- Falls back gracefully to shortened IDs if group name fetch fails
- No error messages shown to user
- No app crashes

---

## Troubleshooting

### Issue: Still Seeing "Contract Interaction"
**Possible Causes:**
1. Old component not reloaded (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. Soroban RPC connection failure (check Network tab for errors)
3. Transaction not yet processed (wait a few seconds)

**Solutions:**
- Hard refresh the page
- Check browser console for errors
- Verify Soroban RPC endpoint is accessible
- Try with a recent transaction

### Issue: Group Name Shows as Shortened ID
**Possible Causes:**
1. Group name fetch failed
2. Group ID not recognized by contract
3. Contract call error

**Solutions:**
- Verify group exists
- Check contract is deployed correctly
- Check browser console for error logs

### Issue: Amount Shows as NaN
**Possible Causes:**
1. Event data parsing error
2. Unexpected event format
3. Stroops conversion error

**Solutions:**
- Check event data format in browser console
- Verify contract event is emitting correct data
- Check calculation: amount / 10,000,000

### Issue: Links Not Working
**Possible Causes:**
1. Group ID is empty
2. Navigation not configured
3. Next.js routing issue

**Solutions:**
- Check groupId is populated in Activity object
- Verify `/groups/[id]` page exists
- Check Next.js routing configuration

---

## Performance Metrics

### What to Check
1. **Load Time**: Should complete in < 5 seconds
2. **Network Requests**: Should make 1 Horizon call + up to 10 Soroban RPC calls (parallel)
3. **Group Name Queries**: Should see < 5 unique group name queries (due to caching)
4. **Re-renders**: Component should not re-render unnecessarily

### How to Check
1. Open DevTools Network tab
2. Go to Dashboard
3. Observe requests
4. Should see:
   - 1x Horizon operations request
   - ~10x Soroban getTransaction requests (parallel)
   - ~N group name queries (N = number of unique groups)

### Acceptable Performance
- Initial load: < 5 seconds
- Re-load on page refresh: < 2 seconds
- No noticeable lag when scrolling activities

---

## Examples of Expected Outputs

### Example 1: Fresh Group Creation
```
Created Small Business Fund
now
abc123...def789  ← clickable
View Group link
```

### Example 2: Contribution
```
Contributed 50.00 XLM to Small Business Fund
2 minutes ago
View Group link    xyz789...abc123
-50.00 XLM        ← in red text
```

### Example 3: Payout Received
```
Received payout of 1,500.00 XLM from Small Business Fund (Round 5)
15 minutes ago
View Group link    def456...ghi789
+1,500.00 XLM     ← in green text
```

### Example 4: Round Completed
```
Round 5 completed in Small Business Fund
20 minutes ago
View Group link    jkl012...mno345
```

---

## Cleanup & Deployment

### Pre-Deployment Checklist
- [ ] All tests pass
- [ ] No console errors
- [ ] Performance metrics acceptable
- [ ] Group names display correctly
- [ ] Amounts format properly
- [ ] Color coding works
- [ ] Links are functional
- [ ] Fallbacks work

### Files Modified
1. `apps/web/lib/activityFeed.ts` - Event parsing and data transformation
2. `apps/web/context/savingsContract.tsx` - Group name caching
3. `apps/web/components/recent-activity.tsx` - UI rendering

### No Breaking Changes
- Existing APIs unchanged
- Backward compatible
- Safe to deploy anytime

---

## Support & Questions

For issues or questions:
1. Check browser console (F12) for error messages
2. Check Network tab for failed requests
3. Verify Soroban RPC endpoint accessibility
4. Review contract event emissions
5. Check test scenarios in this guide

---

**Ready to Test!** 🚀
