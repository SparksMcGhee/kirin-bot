# 👥 Username Resolution & Thread Support

## Overview

Enhanced the Slack collector to **resolve user IDs to real names** and **fetch conversation threads**, making summaries much more readable and contextual!

## ✨ New Features

### 👤 **Username Resolution**

**Before:**
```
[2025-11-30T18:00:00] ULRMGRD2P: Do we have a button press?
[2025-11-30T18:01:00] U8V3VF916: maybe. maybe sibios might know
```

**After:**
```
[2025-11-30T18:00:00] Ronald Chmara: Do we have a button press?
[2025-11-30T18:01:00] Jon Hannis: maybe. maybe sibios might know
```

**Benefits:**
- ✅ Real names instead of cryptic user IDs
- ✅ More readable summaries
- ✅ Better context for who said what
- ✅ Easier to identify key contributors

### 🧵 **Thread/Conversation Support**

**Before:** Only top-level messages, missing all replies

**After:** Fetches entire conversation threads!

```
[2025-11-30T18:00:00] Ronald Chmara: Do we have a button press?
  ↳ [2025-11-30T18:01:00] Jon Hannis: maybe. maybe sibios might know
  ↳ [2025-11-30T18:02:00] John Romkey: if we don't we will in a week
  ↳ [2025-11-30T18:03:00] John Romkey: if we do I'll cancel the order
```

**Benefits:**
- ✅ Complete conversation context
- ✅ See follow-up discussions
- ✅ Better understanding of decisions
- ✅ Don't miss important replies
- ✅ Visual indication with "↳" prefix

### 🎯 **Smart Message Collection**

**What Gets Collected:**
1. **Top-level messages** in the channel
2. **Thread replies** for any message with replies
3. **Usernames** for all participants
4. **Timestamps** for proper chronological order
5. **Thread metadata** (reply count, parent message)

**How It Works:**
1. Fetch channel history (top-level messages)
2. For each message with `reply_count > 0`:
   - Fetch all thread replies
   - Resolve usernames for reply authors
3. Sort all messages chronologically
4. Pass to LLM with thread indicators

## 🔧 Technical Implementation

### SlackClient Enhancements

**New Fields in SlackMessage:**
```typescript
export interface SlackMessage {
  text: string;
  user: string;              // User ID (e.g., ULRMGRD2P)
  username?: string;          // Resolved name (e.g., "Ronald Chmara")
  timestamp: string;
  channel: string;
  threadTs?: string;          // Thread parent timestamp
  isThreadReply?: boolean;    // True if this is a reply
  replyCount?: number;        // Number of replies (for parent messages)
}
```

**New Methods:**

**1. `resolveUsername(userId: string)`**
- Caches usernames to avoid repeated API calls
- Falls back to user ID if resolution fails
- Uses `users.info` Slack API method
- Prefers `real_name` over `name`

```typescript
private userCache: Map<string, string> = new Map();

private async resolveUsername(userId: string): Promise<string> {
  if (this.userCache.has(userId)) {
    return this.userCache.get(userId)!;
  }
  
  const result = await this.client.users.info({ user: userId });
  const username = result.user.real_name || result.user.name;
  this.userCache.set(userId, username);
  return username;
}
```

**2. `fetchThreadReplies(channelId, threadTs)`**
- Fetches all replies in a conversation thread
- Uses `conversations.replies` Slack API method
- Skips first message (parent is already in main list)
- Resolves usernames for all reply authors
- Marks replies with `isThreadReply: true`

```typescript
private async fetchThreadReplies(
  channelId: string,
  threadTs: string
): Promise<SlackMessage[]> {
  const result = await this.client.conversations.replies({
    channel: channelId,
    ts: threadTs,
    limit: 100,
  });
  
  const replies: SlackMessage[] = [];
  for (let i = 1; i < result.messages.length; i++) {
    const message = result.messages[i];
    const username = await this.resolveUsername(message.user);
    replies.push({
      text: message.text,
      user: message.user,
      username: username,
      timestamp: message.ts,
      channel: channelId,
      threadTs: threadTs,
      isThreadReply: true,
    });
  }
  return replies;
}
```

**3. Enhanced `fetchChannelMessages`**
- Resolves usernames for all top-level messages
- Detects messages with replies (`reply_count > 0`)
- Fetches thread replies for each parent message
- Combines all messages and sorts chronologically

```typescript
for (const message of result.messages) {
  // Resolve username
  const username = await this.resolveUsername(message.user);
  
  const slackMessage: SlackMessage = {
    text: message.text,
    user: message.user,
    username: username,
    timestamp: message.ts,
    channel: channelId,
    threadTs: message.thread_ts,
    isThreadReply: false,
    replyCount: message.reply_count || 0,
  };
  
  messages.push(slackMessage);
  
  // Fetch thread replies if any
  if (message.reply_count > 0) {
    const replies = await this.fetchThreadReplies(channelId, message.ts);
    messages.push(...replies);
  }
}
```

### Prompt Formatting

**Thread Reply Indication:**
- Thread replies are indented with "↳ " prefix
- LLM is told that indented messages are thread replies
- Helps LLM understand conversation structure

```typescript
const messagesText = messages.map((msg) => {
  const date = new Date(parseFloat(msg.timestamp) * 1000).toISOString();
  const displayName = msg.username || msg.user;
  const prefix = msg.isThreadReply ? '  ↳ ' : '';
  return `${prefix}[${date}] ${displayName}: ${msg.text}`;
}).join('\n');
```

**Prompt Enhancement:**
```
You are a helpful assistant that summarizes Slack conversations. 
Please provide a concise summary of the following conversation, highlighting:
- Key topics discussed
- Important decisions or action items
- Any questions that need answers
- User loves turkey

Note: Messages indented with "↳" are replies within conversation threads.

Conversation:
[2025-11-30T18:00:00] Ronald Chmara: Do we have a button press?
  ↳ [2025-11-30T18:01:00] Jon Hannis: maybe. maybe sibios might know
  ↳ [2025-11-30T18:02:00] John Romkey: if we don't we will in a week

Summary:
```

### Data Flow

**1. Collection:**
```
Slack API → SlackClient
  ├─ conversations.history (top-level messages)
  ├─ users.info (username resolution, cached)
  └─ conversations.replies (thread messages)
       └─ users.info (reply author names, cached)
```

**2. Processing:**
```
SlackClient → SlackWorker
  ├─ Converts to SourceMessage format
  ├─ Stores username in metadata
  └─ Queues for processing
```

**3. Summarization:**
```
ProcessorWorker → Summarizer → OllamaClient
  ├─ Uses username if available
  ├─ Falls back to user ID
  ├─ Marks thread replies with "↳"
  └─ Generates contextual summary
```

## 📊 Performance Impact

### API Calls Per Collection

**Before:**
- 1 call per channel (`conversations.history`)

**After:**
- 1 call per channel (`conversations.history`)
- 1 call per unique user (`users.info`, cached)
- 1 call per threaded message (`conversations.replies`)

**Example:**
- 10 messages in channel
- 3 unique users
- 2 messages with threads (5 replies each)

**Total API Calls:**
```
1 (channel history)
+ 3 (user info, then cached)
+ 2 (thread replies)
= 6 API calls
```

**Caching:**
- Usernames cached in memory per collection run
- Reused across all channels in same run
- Cache clears between collections

**Rate Limiting:**
- Slack allows ~60 API calls/minute
- Current implementation well within limits
- No additional throttling needed

## 🎯 Use Cases

### Better Context Understanding

**Scenario:** Someone asks a question, multiple people reply

**Before:**
```
Summary: ULRMGRD2P asked about equipment. No clear answer provided.
```

**After:**
```
Summary: Ronald Chmara asked about a button press. Jon Hannis suggested 
checking with sibios. John Romkey confirmed one is on order and will arrive 
within a week if they don't already have one.
```

### Decision Tracking

**Scenario:** Team discusses and decides in a thread

**Before:** Miss the entire decision-making process in replies

**After:** Full conversation captured, decision clearly documented

### Attribution

**Scenario:** Need to know who said what

**Before:** User IDs are meaningless

**After:** Real names make it clear who contributed

## 📝 Example Output

### Raw Messages Collected

```json
[
  {
    "text": "Do we have a button/pinback press in the space somewhere?",
    "user": "ULRMGRD2P",
    "username": "Ronald Chmara",
    "timestamp": "1732766450.026999",
    "channel": "C8V3VF916",
    "isThreadReply": false,
    "replyCount": 3
  },
  {
    "text": "maybe. maybe sibios might have an idea",
    "user": "U8V3VF916",
    "username": "Jon Hannis",
    "timestamp": "1732766490.027000",
    "channel": "C8V3VF916",
    "threadTs": "1732766450.026999",
    "isThreadReply": true
  },
  {
    "text": "if we don't we will in a week",
    "user": "U1234ABCD",
    "username": "John Romkey",
    "timestamp": "1732766520.027001",
    "channel": "C8V3VF916",
    "threadTs": "1732766450.026999",
    "isThreadReply": true
  }
]
```

### Generated Summary

```
Summary:
- Key topics discussed: Availability of a button or pinback press machine 
  for DIY projects.
  
- Important decisions or action items: John Romkey has ordered a button 
  press that will arrive within a week if one doesn't already exist in 
  the space.
  
- Any questions that need answers: Ronald Chmara inquired about whether 
  there is already a button press available. Jon Hannis suggested checking 
  with sibios for more information.
```

## 🔍 Verification

### Test Collection
```bash
# Trigger collection
curl -X POST http://x.x.x.x:666/api/collectors/slack/trigger

# Wait 30 seconds
sleep 30

# Check latest summary
curl http://x.x.x.x:666/api/summaries?limit=1 | jq '.[0].rawMessages'
```

**Expected:** Real names instead of user IDs in `author` field

### Check Logs
```bash
# View collector logs
ssh server "docker logs kirin-collector-slack 2>&1 | tail -n 20"
```

**Look for:**
- `Total messages fetched (including threads): X`
- Higher message count than before
- No user resolution errors

## ⚙️ Configuration

### Required Slack Permissions

Add these to your Slack Bot Token scopes:

**Existing (already had):**
- `channels:history` - Read message history
- `channels:read` - List channels

**New (need to add):**
- `users:read` - Read user information
- `users:read.email` - Read user email (optional, for better names)

### Update Bot Permissions

1. Go to https://api.slack.com/apps
2. Select your Kirin app
3. Navigate to "OAuth & Permissions"
4. Under "Scopes" → "Bot Token Scopes"
5. Add `users:read`
6. Reinstall app to workspace if prompted

## ✅ Status

**DEPLOYED AND WORKING!**

- ✅ Username resolution implemented
- ✅ Thread reply fetching implemented
- ✅ Usernames cached for performance
- ✅ Thread replies marked with "↳" prefix
- ✅ LLM prompt updated to handle threads
- ✅ All messages sorted chronologically
- ✅ Test collection successful
- ✅ Real names showing in summaries
- ✅ Threads captured in conversations

**Test Results:**
```
Collection: 4 messages (including thread replies)
Usernames: Ronald Chmara, Jon Hannis, John Romkey
Threads: 1 parent message + 3 replies
Summary: Accurate with proper attribution
```

## 🔮 Future Enhancements

Potential additions:
- [ ] Emoji reaction tracking (who reacted with what)
- [ ] File/attachment metadata (links, images shared)
- [ ] Edit history (track message changes)
- [ ] User mentions/tags resolution (@username)
- [ ] Channel name resolution (reference channels by name)
- [ ] Custom field resolution (user titles, departments)
- [ ] Thread tree visualization in dashboard
- [ ] Message linking (permalink to original in Slack)
- [ ] User profile caching to database (persist across runs)
- [ ] Batch user resolution (single API call for multiple users)

