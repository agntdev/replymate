# ReplySuggester — Bot specification

**Archetype:** custom

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A Telegram bot that generates five suggested replies for every incoming message, with confidence/tonality tags and copy/send buttons. Maintains a 30-day history of messages and user choices while respecting privacy boundaries.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- single-user Telegram account owner

## Success criteria

- User sends 50+ suggested replies per week through the bot interface

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main menu with bot status and controls
- **/enable** (command, actor: user, command: /enable) — Activate reply suggestions for incoming messages
- **/disable** (command, actor: user, command: /disable) — Pause the suggestion feature
- **/history** (command, actor: user, command: /history) — View last 30 days of message suggestions and user actions
- **/tone** (command, actor: user, command: /tone) — Cycle through Neutral/Friendly/Professional tone presets

## Flows

### Message Handling
_Trigger:_ incoming message to owner

1. Generate 5 reply suggestions with confidence scores
2. Display as 5 buttons with tone tags
3. Log original message metadata

_Data touched:_ IncomingMessage, SuggestedReply

### Reply Selection
_Trigger:_ button press

1. Send selected reply to original chat
2. Mark suggestion as used
3. Log action timestamp

_Data touched:_ UsageLog

### History Review
_Trigger:_ /history

1. Display table of recent messages and choices
2. Include copy/send actions taken

_Data touched:_ UsageLog

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **IncomingMessage** _(retention: persistent)_ — Original messages received by the owner
  - fields: sender, text, timestamp, chat_type
- **SuggestedReply** _(retention: persistent)_ — Generated reply options with metadata
  - fields: text, confidence_score, tonality
- **UsageLog** _(retention: persistent)_ — User interaction tracking for history feature
  - fields: message_id, chosen_reply, copied_flag, timestamp

## Integrations

- **Telegram** (required) — Message interception and UI buttons
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- /enable
- /disable
- /history
- /tone

## Permissions & privacy

- Stores message text for 30 days for suggestion history
- Logs user interaction choices (no content beyond metadata)
- No cross-account data sharing

## Edge cases

- Message with no suggested replies generated
- User ignores suggestions repeatedly
- Tone preset conflicts with message context

## Required tests

- End-to-end test of suggestion generation → selection → logging workflow
- History command shows accurate 30-day data

## Assumptions

- Suggestion algorithm uses basic NLP pattern matching
- Default tone is Neutral until changed
- Max 5 suggestions per message is optimal
