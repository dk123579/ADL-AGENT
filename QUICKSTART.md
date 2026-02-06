# Quick Start Guide - ADL Teams Agent

## ✅ Setup Complete!

Your ADL Teams Agent has been created and built successfully at:
`/Users/DKENNEDY/bbw/Agents/samples/nodejs/adl-teams-agent`

## 🚀 Next Steps

### 1. Configure Your ADL-MCP Server Path

Edit the `.env` file and update the ADL_MCP_SERVER_PATH:

```bash
# Example: If your ADL-MCP project is at /Users/DKENNEDY/bbw/ADL-MCP
ADL_MCP_SERVER_PATH=/Users/DKENNEDY/bbw/ADL-MCP
ADL_MCP_COMMAND=node
ADL_MCP_ARGS=dist/index.js
```

### 2. Run the Agent

```bash
# Start the agent
npm start
```

The agent will run on http://localhost:3978

### 3. Test Locally with Agent Playground

```bash
# Run tests with the built-in playground
npm test
```

This opens an interactive testing environment where you can:
- Send messages to the agent
- Test @ADL commands
- Verify decision capture

## 📝 Usage Examples

Once running, try these commands:

### Format 1: Bracket Notation (Recommended for Chat)
```
@ADL [We will use PostgreSQL for the production database]
```

### Format 2: Parentheses
```
@ADL (Decided to implement rate limiting on all public APIs)
```

### Format 3: Simple Text
```
@ADL We chose TypeScript over JavaScript for type safety
```

### Format 4: Speech/Meeting Transcription
```
ADL we have decided to migrate to Azure cloud services END ADL
```

## 🔗 Connect to Microsoft Teams

### Option A: Using Teams Toolkit (Easiest)

1. **Install Teams Toolkit**
   - Open VS Code
   - Install the "Teams Toolkit" extension
   - Restart VS Code

2. **Create Teams App Manifest**
   ```bash
   # In the adl-teams-agent directory
   # Teams Toolkit will guide you through creating the manifest
   ```

3. **Deploy to Teams**
   - Press F5 in VS Code
   - Teams Toolkit will handle the deployment
   - Test in Teams!

### Option B: Manual Teams Integration

1. Create an Azure Bot Registration
2. Configure messaging endpoint: `https://your-domain.com/api/messages`
3. Deploy the agent to Azure or use ngrok for local testing
4. Add the bot to Teams

## 🧪 Testing Checklist

- [ ] Agent starts without errors
- [ ] Can send regular messages
- [ ] @ADL commands are recognized
- [ ] Decision text is extracted correctly
- [ ] ADL-MCP connection works (if configured)
- [ ] Success beep (🔔) appears on successful log

## 🐛 Troubleshooting

### "ADL-MCP server is not connected"
- Check that `ADL_MCP_SERVER_PATH` is correct in `.env`
- Verify your ADL-MCP server is built (`npm run build` in ADL-MCP project)
- Ensure `ADL_MCP_COMMAND` matches your setup (node/python/etc.)

### Agent not starting
- Check that port 3978 is available: `lsof -i :3978`
- Review console output for errors
- Verify all dependencies installed: `npm install`

### Decision not captured
- Ensure you're using correct format: `@ADL [decision]`
- Check for typos in command
- Review agent logs for parsing errors

## 📚 Learn More

- [Full README](./README.md) - Detailed documentation
- [Microsoft 365 Agents SDK](https://aka.ms/M365-Agents-SDK-Docs) - Official docs
- [Teams Bot Development](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots) - Teams integration guide

## 💡 Tips

1. **Default Values**: Author (DK), Fact Sheet (LeanIX), and Status (Proposed) are pre-configured in `.env`
2. **Multiple Formats**: The agent supports various input formats for flexibility
3. **Visual Feedback**: Look for the 🔔 emoji when decisions are successfully logged
4. **Meeting Integration**: Works with Teams meeting transcriptions automatically

---

**Need help?** Check the main [README.md](./README.md) or review the [samples documentation](../README.md).
