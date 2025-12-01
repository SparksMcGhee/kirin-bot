# ⚙️ Collector Settings Editor

## Overview

Added a **Settings Editor** to each collector card in the dashboard, allowing you to configure schedules, lookback windows, and channels directly from the web interface!

## ✨ Features

### 🎯 Per-Collector Settings Button
- **Location**: Each collector card has a new **"⚙️ Settings"** button
- **Action**: Expands an inline settings form
- **Saves to**: PostgreSQL database (persists across restarts)

### 📝 Editable Settings

#### **All Collectors:**
- **Schedule Pattern (Cron)**: Control when the collector runs
  - Examples provided: `*/30 * * * *` (every 30 min), `0 */6 * * *` (every 6 hours)
  - Validation: Must be valid cron syntax
  - Takes effect: Next scheduled run

#### **Slack Collector:**
- **Slack Channels**: List of channel IDs to monitor
  - Add/remove channels dynamically
  - Visual tags for each channel
  - Validation: Channel ID format (e.g., C1234567890)
  - Help text: Instructions to find channel IDs
  
- **Lookback Hours**: How far back to fetch messages
  - Range: 1-720 hours (max 30 days)
  - Default: 24 hours
  - Current value shown in form

#### **Signal/Twitter Collectors:**
- Schedule pattern (future: add source-specific settings)

### 🎨 Visual Design

**Collapsed State:**
```
┌─ Slack Collector ────────────────────────┐
│ Schedule: */15 * * * *        [✓ Enabled] │
│                                           │
│ [⏸️ Disable] [🚀 Trigger] [⚙️ Settings]  │
└───────────────────────────────────────────┘
```

**Expanded Settings:**
```
┌─ Slack Collector ────────────────────────┐
│ Schedule: */15 * * * *        [✓ Enabled] │
│                                           │
│ [⏸️ Disable] [🚀 Trigger] [⚙️ Settings]  │
│                                           │
│ ┌─ ⚙️ Slack Collector Settings ────────┐ │
│ │                                       │ │
│ │ Schedule Pattern (Cron)               │ │
│ │ [*/15 * * * *___________________]     │ │
│ │ Examples: "*/30 * * * *" (every 30m)  │ │
│ │                                       │ │
│ │ Slack Channels                        │ │
│ │ [C8V3VF916 ×] [C1234567890 ×]         │ │
│ │ [Channel ID_________] [➕ Add]        │ │
│ │ Find IDs: Right-click channel → ...   │ │
│ │                                       │ │
│ │ Lookback Hours                        │ │
│ │ [168__]                               │ │
│ │ How far back to fetch (1-720 hours)   │ │
│ │                                       │ │
│ │ [💾 Save Settings] [✖️ Cancel]        │ │
│ └───────────────────────────────────────┘ │
└───────────────────────────────────────────┘
```

### 🔧 Channel Management

**Add Channel:**
1. Type channel ID in input field
2. Click **"➕ Add"** button
3. Channel appears as a tag
4. Click **"💾 Save Settings"** to persist

**Remove Channel:**
1. Click **"×"** on channel tag
2. Confirm deletion
3. Channel removed from display
4. Click **"💾 Save Settings"** to persist

**Find Channel IDs:**
- In Slack: Right-click channel → View channel details → Copy ID
- Format: Starts with 'C' followed by alphanumeric (e.g., C8V3VF916)
- Validation: Must match pattern `^[A-Z][A-Z0-9]{8,}$`

### 💾 Save Behavior

**What Gets Saved:**
- Schedule pattern (cron expression)
- Slack channels (array of channel IDs)
- Lookback hours (integer 1-720)
- Timestamp of change
- Audit log entry (who changed what)

**When It Takes Effect:**
- **Schedule**: Next time scheduler checks (within 1 minute)
- **Channels**: Next time collector runs
- **Lookback**: Next time collector fetches messages

**Where It's Stored:**
- Database: PostgreSQL `Collector` table
- Field: `settings` (JSONB column)
- Audit: `AuditLog` table tracks all changes

### ✅ Validation & Error Handling

**Client-Side Validation:**
- Schedule pattern: Required field
- Channel IDs: Format validation (C + alphanumerics)
- Lookback hours: Range validation (1-720)
- Duplicate channels: Prevented

**Server-Side Validation:**
- All fields validated again
- Database constraints enforced
- Error messages shown to user

**Error Messages:**
```
❌ Invalid channel ID format. Should be like: C1234567890
❌ Please add at least one channel
❌ Lookback hours must be between 1 and 720
❌ Error saving settings: [specific error]
```

**Success Message:**
```
✅ slack settings saved successfully!
```

## 🚀 Usage Guide

### Edit Slack Collector Settings

**Step 1: Open Settings**
1. Go to **🔧 Collectors** tab
2. Find **Slack Collector** card
3. Click **⚙️ Settings** button
4. Form expands below

**Step 2: Change Schedule**
1. Edit **Schedule Pattern** field
2. Use cron syntax (help text provided)
3. Example: `0 */2 * * *` = every 2 hours

**Step 3: Manage Channels**
1. See current channels as tags
2. Remove unwanted: Click **×** on tag
3. Add new: Type ID, click **➕ Add**
4. Repeat for multiple channels

**Step 4: Adjust Lookback**
1. Change **Lookback Hours** number
2. Range: 1-720 (max 30 days)
3. Higher = more history, slower collection

**Step 5: Save Changes**
1. Click **💾 Save Settings**
2. Wait for success message
3. Settings form collapses
4. Changes take effect immediately

### Common Cron Patterns

| Pattern | Description |
|---------|-------------|
| `*/15 * * * *` | Every 15 minutes |
| `*/30 * * * *` | Every 30 minutes |
| `0 * * * *` | Every hour (on the hour) |
| `0 */2 * * *` | Every 2 hours |
| `0 */6 * * *` | Every 6 hours |
| `0 9 * * *` | Daily at 9:00 AM |
| `0 9,17 * * *` | Daily at 9 AM and 5 PM |
| `0 9 * * 1-5` | Weekdays at 9 AM |
| `0 0 * * 0` | Sundays at midnight |

**Cron Format:** `minute hour day month weekday`

### Finding Slack Channel IDs

**Method 1: Web Interface**
1. Open Slack in browser
2. Right-click on channel name
3. Select "View channel details"
4. Click channel name at top
5. Find "Channel ID" field
6. Click to copy

**Method 2: Desktop App**
1. Right-click channel name
2. Select "Copy" → "Copy link"
3. Paste link (format: `.../archives/C8V3VF916`)
4. Extract the ID part (starts with C)

**Method 3: API Call**
```bash
curl -s http://x.x.x.x:666/api/collectors/slack | jq '.settings.channelIds'
```

## 🎯 Use Cases

### Adjust Collection Frequency
**Scenario:** Slack collector running every 15 minutes is too frequent

**Solution:**
1. Open Slack settings
2. Change schedule to `*/30 * * * *` (every 30 min)
3. Save → Now runs half as often

### Add New Slack Channel
**Scenario:** Team created new project channel, want to include in summaries

**Solution:**
1. Get channel ID from Slack (C9876543210)
2. Open Slack settings in dashboard
3. Add channel: Type ID, click ➕
4. Save → Next run includes new channel

### Increase History Window
**Scenario:** Want summaries of weekend discussions on Monday

**Solution:**
1. Open Slack settings
2. Change lookback to 72 hours (3 days)
3. Save → Next summary includes weekend

### Reduce Lookback for Speed
**Scenario:** Very active channel, processing takes too long

**Solution:**
1. Open Slack settings
2. Reduce lookback to 6 hours
3. Save → Faster collection, recent messages only

### Change to Business Hours Only
**Scenario:** Only want summaries during work hours

**Solution:**
1. Open Slack settings
2. Change schedule to `0 9 * * 1-5` (weekdays 9 AM)
3. Save → Single daily summary

## 🔧 Technical Implementation

### Frontend (HTML)

**Settings Form Template:**
```javascript
<div class="settings-form" id="settings-${name}">
  <form onsubmit="saveCollectorSettings(event, '${name}')">
    <!-- Schedule input -->
    <input id="schedule-${name}" value="${schedulePattern}">
    
    <!-- Slack-specific: Channels -->
    <div id="channels-${name}">
      <!-- Channel tags rendered here -->
    </div>
    <input id="new-channel-${name}" placeholder="Channel ID">
    <button onclick="addChannel('${name}')">➕ Add</button>
    
    <!-- Slack-specific: Lookback -->
    <input id="lookback-${name}" type="number" value="${lookbackHours}">
    
    <button type="submit">💾 Save Settings</button>
  </form>
</div>
```

**JavaScript Functions:**
- `toggleSettings(name)` - Show/hide settings form
- `addChannel(name)` - Add channel to list
- `removeChannel(name, id)` - Remove channel from list
- `saveCollectorSettings(event, name)` - Save all settings to API

### Backend (API)

**Endpoint Used:**
```http
PUT /api/collectors/:name
```

**Request Body:**
```json
{
  "schedulePattern": "*/30 * * * *",
  "settings": {
    "channelIds": ["C8V3VF916", "C1234567890"],
    "lookbackHours": 168
  }
}
```

**Response:**
```json
{
  "id": "...",
  "name": "slack",
  "displayName": "Slack Collector",
  "enabled": true,
  "schedulePattern": "*/30 * * * *",
  "settings": {
    "channelIds": ["C8V3VF916", "C1234567890"],
    "lookbackHours": 168
  },
  "updatedAt": "2025-11-29T06:47:00.000Z"
}
```

### Database Schema

**Collector Table:**
```prisma
model Collector {
  id              String   @id @default(uuid())
  name            String   @unique
  displayName     String
  enabled         Boolean  @default(true)
  schedulePattern String
  settings        Json     @default("{}")  // <-- Settings stored here
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**Settings JSON Structure:**
```json
{
  "channelIds": ["C8V3VF916"],
  "lookbackHours": 168,
  "token": "xoxb-..." // Optional, can store per-collector
}
```

### Audit Log

**Every settings change creates an audit entry:**
```json
{
  "entity": "collector",
  "entityId": "b1b8cfca-...",
  "action": "UPDATE",
  "changes": {
    "schedulePattern": "*/30 * * * *",
    "settings": {
      "channelIds": ["C8V3VF916"],
      "lookbackHours": 168
    }
  },
  "ipAddress": "192.168.1.100",
  "createdAt": "2025-11-29T06:47:00.000Z"
}
```

## 🎨 CSS Styling

**Key Classes:**
- `.settings-form` - Expandable form container
- `.settings-form.show` - Visible state
- `.channel-tag` - Visual channel ID tags
- `.channel-tag .remove-btn` - Remove button on tags
- `.settings-help` - Helper text below inputs

**Animations:**
- Form slides down when opened
- Channel tags fade in when added
- Buttons change state on hover/click

## ✅ Status

**DEPLOYED AND WORKING!**

- ✅ Settings button on all collector cards
- ✅ Expandable settings form
- ✅ Schedule pattern editor (all collectors)
- ✅ Channel management (Slack)
- ✅ Lookback hours editor (Slack)
- ✅ Add/remove channels dynamically
- ✅ Validation on all inputs
- ✅ Success/error messages
- ✅ Database persistence
- ✅ Audit log tracking
- ✅ Cron examples and help text

**Access now at:** http://x.x.x.x:666 → **🔧 Collectors tab** → **⚙️ Settings button**

## 🔮 Future Enhancements

Potential additions:
- [ ] Visual cron builder (dropdown selectors)
- [ ] Channel search/autocomplete
- [ ] Test button (validate before saving)
- [ ] Settings templates (common presets)
- [ ] Bulk edit (apply to multiple collectors)
- [ ] Import/export settings (JSON download)
- [ ] Schedule preview ("Next 5 runs: ...")
- [ ] Token management per collector
- [ ] Advanced filters (message types, users, etc.)
- [ ] Settings history (view past configurations)

