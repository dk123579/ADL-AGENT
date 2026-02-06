# ADL Teams Agent

An intelligent Microsoft Teams agent that captures and logs Architecture Decision Log (ADL) entries during meetings and chats.

## Features

- 🎯 **Voice & Text Capture**: Works with both meeting transcriptions and typed chat messages
- 🤖 **Smart Detection**: Automatically detects ADL commands using @ADL mentions
- 📝 **Multiple Input Formats**: Flexible syntax for logging decisions
- 🔗 **MCP Integration**: Connects to your ADL-MCP server for data persistence
- 🔔 **Audio Feedback**: Provides success confirmation with visual indicators
- ⚙️ **Default Values**: Pre-configured author, fact sheet, and status fields

## Input Formats

### Chat Messages
```
@ADL [We will use PostgreSQL for the database]
@ADL (Switching to microservices architecture)
@ADL We decided to implement OAuth2 authentication
```

### Meeting Transcription
```
"ADL we will migrate to Azure cloud services END ADL"
```

## Setup

### 1. Prerequisites
- Node.js 18+ installed
- Your ADL-MCP server from the ADL-MCP project
- Microsoft Teams or Teams Toolkit for testing

### 2. Install Dependencies
```bash
cd samples/nodejs/adl-teams-agent
npm install
```

### 3. Configure Environment
Copy the template and update with your settings:
```bash
cp .env.template .env
```

Edit `.env`:
```bash
# Path to your ADL-MCP server directory
ADL_MCP_SERVER_PATH=/path/to/your/ADL-MCP

# Command to run the MCP server (node, python, etc.)
ADL_MCP_COMMAND=node

# Arguments to pass to the MCP server
ADL_MCP_ARGS=dist/index.js

# Default values for ADL entries
ADL_DEFAULT_AUTHOR=DK
ADL_DEFAULT_FACTSHEET=LeanIX
ADL_DEFAULT_STATUS=Proposed

# Agent server port
PORT=3978
```

### 4. Build and Run
```bash
# Development mode
npm run build
npm start

# Or for testing without .env file
npm run start:anon
```

## Testing

### Local Testing with Agent Playground
```bash
npm test
```

This will start both the agent and the Microsoft 365 Agents Playground for testing.

### Testing in Teams
1. Install [Teams Toolkit for VS Code](https://marketplace.visualstudio.com/items?itemName=TeamsDevApp.ms-teams-vscode-extension)
2. Open this project in VS Code
3. Press F5 to launch in Teams
4. Test the agent by sending messages with @ADL commands

## Usage Examples

### During a Teams Meeting
1. Open the agent: `@ADL`
2. Say or type your decision:
   - Voice: "ADL we will implement rate limiting on all APIs END ADL"
   - Chat: `@ADL [We will implement rate limiting on all APIs]`
3. The agent captures the decision and logs it to ADL-MCP
4. You'll receive a confirmation with a 🔔 beep indicator

### In Teams Chat
```
You: @ADL [We decided to use TypeScript for the new service]

Agent: ✅ 🔔 Decision logged successfully!

Decision: We decided to use TypeScript for the new service
Author: DK
Fact Sheet: LeanIX
Status: Proposed
Entry ID: ADL-2026-001
```

## Architecture

### Components
- **index.ts**: Main agent application and message routing
- **decisionExtractor.ts**: Parses and extracts decision text from various formats
- **adlMcpClient.ts**: MCP client for communicating with ADL-MCP server

### Flow
1. User sends message with @ADL command
2. DecisionExtractor identifies the format and extracts decision text
3. ADLMCPClient sends the decision to your ADL-MCP server
4. Agent provides visual feedback with success/error message

## Integration with ADL-MCP

This agent uses the Model Context Protocol (MCP) to communicate with your ADL-MCP server. Make sure your ADL-MCP server exposes a `create_adl_entry` tool with these parameters:
- `decision` (string): The decision text
- `author` (string): Decision author
- `factSheet` (string): Associated fact sheet
- `status` (string): Decision status

## Troubleshooting

### ADL-MCP Server Not Connected
- Verify `ADL_MCP_SERVER_PATH` points to your ADL-MCP project
- Check that your ADL-MCP server is properly built
- Ensure `ADL_MCP_COMMAND` and `ADL_MCP_ARGS` are correct for your setup

### Decision Not Captured
- Ensure you're using one of the supported formats
- Check that brackets/parentheses are properly closed
- For speech, make sure to say "END ADL" clearly

### Agent Not Responding in Teams
- Verify the agent is running (`npm start`)
- Check that port 3978 is available
- Review Teams Toolkit configuration

## Development

### Project Structure
```
adl-teams-agent/
├── src/
│   ├── index.ts              # Main agent application
│   ├── decisionExtractor.ts  # Decision text extraction logic
│   └── adlMcpClient.ts       # ADL-MCP server client
├── package.json
├── tsconfig.json
└── .env.template
```

### Adding Features
- Modify `decisionExtractor.ts` to support new input formats
- Update `index.ts` to add new commands or behaviors
- Extend `adlMcpClient.ts` for additional ADL-MCP operations

## License

MIT

## Support

For issues related to:
- **Agent SDK**: See [Microsoft 365 Agents SDK documentation](https://aka.ms/M365-Agents-SDK-Docs)
- **ADL-MCP Server**: Check your ADL-MCP project documentation
- **This Agent**: Open an issue in this repository
