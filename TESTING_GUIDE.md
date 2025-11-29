# Habit Frequency Testing Guide

This guide provides both automated and manual testing procedures to verify habit frequency logic.

## Automated Tests

Run the comprehensive unit tests:

```bash
pnpm test src/tests/habitStatus.test.ts
```

### What the Tests Cover

**Daily Habits:**
- ✅ Always active by frequency
- ✅ Inactive when completed today
- ✅ Active again at midnight (next day)

**Weekly Habits:**
- ✅ Active if never completed
- ✅ Inactive for 6 days after completion
- ✅ Active at midnight of day 7 (not at exact completion time)
- ✅ Correct countdown (4, 3, 2, 1 days to midnight)
- ✅ Proper availability messages
- ✅ Real-time countdown display

**Custom Habits:**
- ✅ Active only on selected days (e.g., Mon, Fri, Sat)
- ✅ Inactive on non-selected days
- ✅ Inactive when completed on active day
- ✅ Active again on next selected day
- ✅ Correct next active date calculation

## Manual Testing Procedures

### Test 1: Daily Habits Reset at Midnight

**Objective:** Verify daily habits become available again at midnight and show real-time countdown.

**Steps:**
1. Create a daily habit
2. Complete the habit (should show trophy + shade out)
3. Verify button is disabled
4. Check countdown timer shows "Available in: Xh Ym Zs"
5. **Option A - Wait for midnight:**
   - Watch countdown decrease in real-time
   - At midnight (00:00 local time), countdown disappears
   - Refresh the page
   - Habit should be active again
6. **Option B - Simulate with database:**
   ```bash
   # Connect to your database
   pnpm db:studio
   
   # Find the habit_completion record
   # Change completedAt to yesterday's date
   # Refresh the app - habit should be active
   ```

**Expected Results:**
- ✅ Completed today: Shaded, disabled, shows trophy + countdown timer
- ✅ Countdown updates every second (real-time)
- ✅ At midnight: Countdown disappears, habit becomes active
- ✅ Next day: Active, enabled, no trophy

---

### Test 2: Weekly Habits Have 7-Day Cooldown (Reset at Midnight)

**Objective:** Verify weekly habits are inactive for 7 days after completion and reset at midnight of day 7.

**Steps:**
1. Create a weekly habit
2. Complete the habit on Friday 11:00 PM
3. Note the current date
4. Verify the countdown shows "Available in: Xd Yh Zm" (real-time)
5. Countdown should reach midnight of next Friday (7 days later)
6. **Simulate time progression:**
   ```bash
   # Open database studio
   pnpm db:studio
   
   # Find your habit completion record
   # Test different dates:
   
   # Day 1: Set completedAt to 1 day ago
   # Expected: "Available in: 4d 23h 59m" (to midnight of day 7)
   
   # Day 3: Set completedAt to 3 days ago
   # Expected: "Available in: 2d 23h 59m", shaded, disabled
   
   # Day 6: Set completedAt to 6 days ago
   # Expected: "Available in: 0d 23h 59m" (almost midnight), shaded, disabled
   
   # Day 7 after midnight: Set completedAt to 7 days ago
   # Expected: Active, enabled, no countdown
   ```

**Expected Results:**
- ✅ Day 0-6: Shaded, disabled, real-time countdown showing
- ✅ Countdown shows time to midnight of day 7 (not exact completion time)
- ✅ Day 7 at midnight: Countdown disappears, habit becomes active
- ✅ Day 7+: Active, enabled, no countdown

---

### Test 3: Custom Habits Active on Specific Days (with Real-Time Countdown)

**Objective:** Verify custom habits are only active on selected days and show accurate countdown to next active day.

**Setup:**
1. Create a custom habit with specific days (e.g., Monday, Friday, Saturday)
2. Note which days are selected

**Test Scenario A - Active Day (e.g., Monday, not completed):**
1. On Monday, habit should be active (no countdown)
2. Button is enabled
3. Can complete immediately
4. After completion: Shows trophy + "Available on: Mon, Fri, Sat" + countdown to Friday

**Test Scenario B - Active Day (e.g., Monday, completed):**
1. After completing on Monday
2. Shows trophy + countdown to next active day (Friday)
3. Countdown shows "Available in: Xd Yh Zm" (real-time, updates every second)
4. Button is disabled
5. Habit remains inactive until Friday midnight

**Test Scenario C - Inactive Day (e.g., Tuesday):**
1. On Tuesday, habit should be shaded out
2. Shows "Available on: Mon, Fri, Sat" + countdown to Friday
3. Button is disabled
4. Cannot complete

**Test Scenario D - Next Active Day (e.g., Friday):**
1. Completed on Monday
2. On Friday, habit should be active again
3. Countdown disappears
4. Can complete again
5. Shows as active (not shaded)

**Simulate with Database:**
```bash
pnpm db:studio

# Test Monday (day 1):
# Set completedAt to current Monday
# Expected: Shaded, shows availability message

# Test Tuesday (day 2):
# Expected: Shaded, shows availability message

# Test Friday (day 5):
# Remove completion record or set to previous week
# Expected: Active, can complete
```

**Expected Results:**
- ✅ Active days (Mon/Fri/Sat): Can complete when not completed today
- ✅ Inactive days (Sun/Tue/Wed/Thu): Always shaded, always disabled
- ✅ After completion: Shaded until next active day
- ✅ Shows correct availability message

---

## Quick Database Testing Script

For rapid testing without waiting for real time to pass:

```sql
-- Find your habit
SELECT * FROM habit WHERE title = 'Your Habit Name';

-- Find completions
SELECT * FROM habit_completion WHERE habitId = 'your-habit-id';

-- Test daily habit (simulate yesterday)
UPDATE habit_completion 
SET completedAt = date('now', '-1 day')
WHERE habitId = 'your-habit-id';

-- Test weekly habit (simulate 3 days ago)
UPDATE habit_completion 
SET completedAt = date('now', '-3 days')
WHERE habitId = 'your-habit-id';

-- Test weekly habit (simulate 7 days ago - should be active)
UPDATE habit_completion 
SET completedAt = date('now', '-7 days')
WHERE habitId = 'your-habit-id';

-- Delete completion to test fresh state
DELETE FROM habit_completion WHERE habitId = 'your-habit-id';
```

---

## Verification Checklist

After running tests, verify:

- [ ] Daily habits reset at midnight with real-time countdown
- [ ] Weekly habits show correct countdown to midnight of day 7
- [ ] Weekly habits reset at midnight (not exact completion time)
- [ ] Weekly habits become active at midnight on day 7
- [ ] Custom habits only active on selected days
- [ ] Custom habits show no countdown when active today (not completed)
- [ ] Custom habits show countdown to next active day when completed
- [ ] Custom habits inactive on non-selected days
- [ ] All habits shade out when completed
- [ ] All habits disable button when inactive
- [ ] Trophy icon shows when completed
- [ ] Availability messages are accurate
- [ ] Real-time countdown updates every second
- [ ] Countdown disappears when habit becomes active
- [ ] Cannot double-complete any habit
- [ ] XP and streaks still work correctly

---

## Troubleshooting

**Issue: Tests fail with import errors**
```bash
# Make sure dependencies are installed
pnpm install

# Run tests with verbose output
pnpm test src/tests/habitStatus.test.ts -- --reporter=verbose
```

**Issue: Manual tests don't reflect changes**
- Clear browser cache
- Hard refresh (Cmd+Shift+R or Ctrl+Shift+F5)
- Check database changes were saved
- Verify you're testing the correct habit

**Issue: Timezone problems**
- All dates are stored in YYYY-MM-DD format (no timezone)
- Server uses server's local date for "today"
- Completions are date-based, not timestamp-based

---

## Success Criteria

All tests pass when:
1. ✅ Automated tests pass: `pnpm test src/tests/habitStatus.test.ts`
2. ✅ Daily habits work correctly in production
3. ✅ Weekly habits show accurate countdown
4. ✅ Custom habits respect day selection
5. ✅ No double completions possible
6. ✅ UI updates correctly after completion
