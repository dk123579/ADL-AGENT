# Deploying ADL Agent to Microsoft Teams

Your ADL Teams Agent is currently **built but not deployed** to Microsoft Teams. Here's how to test and deploy it.

## 🧪 Testing Stages

### Stage 1: Local Testing with Agent Playground ✅ (Current Stage)

**Already set up!** Run this command:

```bash
cd /Users/DKENNEDY/bbw/Agents/samples/nodejs/adl-teams-agent
npm test
```

This opens the **Microsoft 365 Agents Playground** at http://localhost:56150 where you can:
- Send messages to your agent
- Test @ADL commands
- Verify decision extraction
- Check MCP integration

**Test these commands:**
```
@ADL [We decided to use PostgreSQL for the database]
@ADL (Implementing OAuth2 authentication)
ADL This is a meeting decision END ADL
```

### Stage 2: Deploy to Teams (Choose One Method)

---

## Method 1: Using Teams Toolkit (Recommended - Easiest)

### Prerequisites
1. **Microsoft 365 Developer Account** (Free)
   - Sign up at: https://developer.microsoft.com/microsoft-365/dev-program
   - Get a free developer tenant with Teams access

2. **Install Teams Toolkit for VS Code**
   ```bash
   code --install-extension TeamsDevApp.ms-teams-vscode-extension
   ```

### Steps

#### 1. Create Teams App Manifest

Create a `teamsapp.yml` file in your agent directory:

```yaml
version: 1.0.0

provision:
  - uses: botAadApp/create
    with:
      name: ADL Teams Agent
    writeToEnvironmentFile:
      botId: BOT_ID
      botPassword: SECRET_BOT_PASSWORD

  - uses: botFramework/create
    with:
      botId: ${{BOT_ID}}
      name: ADL Teams Agent
      messagingEndpoint: ${{BOT_ENDPOINT}}/api/messages
      description: "Capture architectural decisions in Teams meetings and chats"
      iconUrl: https://www.example.com/icon.png

deploy:
  - uses: cli/runNpmCommand
    with:
      args: install

  - uses: cli/runNpmCommand
    with:
      args: run build

  - uses: azureAppService/deploy
    with:
      artifactFolder: .
      resourceId: ${{AZURE_APP_SERVICE_RESOURCE_ID}}
```

#### 2. Open in VS Code with Teams Toolkit

```bash
cd /Users/DKENNEDY/bbw/Agents/samples/nodejs/adl-teams-agent
code .
```

#### 3. Use Teams Toolkit Commands

In VS Code:
1. Open Command Palette (`Cmd+Shift+P`)
2. Type "Teams: Provision" - Sets up Azure resources
3. Type "Teams: Deploy" - Deploys your agent
4. Type "Teams: Publish" - Publishes to your Teams org

#### 4. Test in Teams

- Open Microsoft Teams
- Go to "Apps" > "Built for your org"
- Find "ADL Teams Agent"
- Add it to a chat or meeting

---

## Method 2: Manual Azure Bot Service Setup

### Prerequisites
- Azure subscription
- Azure CLI installed: `brew install azure-cli`

### Steps

#### 1. Login to Azure
```bash
az login
```

#### 2. Create Azure Bot Registration

```bash
# Set variables
RESOURCE_GROUP="adl-teams-agent-rg"
BOT_NAME="adl-teams-agent"
LOCATION="eastus"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create bot registration
az bot create \
  --resource-group $RESOURCE_GROUP \
  --name $BOT_NAME \
  --kind registration \
  --sku F0 \
  --endpoint "https://YOUR-DOMAIN.com/api/messages"
```

#### 3. Get Bot Credentials

```bash
# Get App ID
az bot show --resource-group $RESOURCE_GROUP --name $BOT_NAME --query "microsoftAppId"

# Create App Secret
az ad app credential reset --id YOUR_APP_ID
```

#### 4. Update .env File

Add to your `.env`:
```bash
MICROSOFT_APP_ID=your-app-id-from-above
MICROSOFT_APP_PASSWORD=your-app-password-from-above
```

#### 5. Deploy Agent to Azure App Service

```bash
# Create App Service Plan
az appservice plan create \
  --name adl-agent-plan \
  --resource-group $RESOURCE_GROUP \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan adl-agent-plan \
  --name adl-teams-agent-webapp \
  --runtime "NODE|18-lts"

# Deploy code
cd /Users/DKENNEDY/bbw/Agents/samples/nodejs/adl-teams-agent
zip -r deploy.zip . -x "node_modules/*" -x ".git/*"
az webapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name adl-teams-agent-webapp \
  --src deploy.zip

# Set environment variables
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name adl-teams-agent-webapp \
  --settings \
    ADL_MCP_SERVER_PATH="/home/site/wwwroot/ADL-MCP" \
    ADL_DEFAULT_AUTHOR="DK" \
    ADL_DEFAULT_FACTSHEET="LeanIX" \
    ADL_DEFAULT_STATUS="Proposed"
```

#### 6. Update Bot Endpoint

```bash
# Get webapp URL
WEBAPP_URL=$(az webapp show --resource-group $RESOURCE_GROUP --name adl-teams-agent-webapp --query "defaultHostName" -o tsv)

# Update bot messaging endpoint
az bot update \
  --resource-group $RESOURCE_GROUP \
  --name $BOT_NAME \
  --endpoint "https://$WEBAPP_URL/api/messages"
```

#### 7. Enable Teams Channel

1. Go to Azure Portal: https://portal.azure.com
2. Navigate to your Bot resource
3. Go to "Channels" blade
4. Click "Microsoft Teams" icon
5. Accept terms and click "Apply"

#### 8. Create Teams App Package

Create `manifest.json`:
```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
  "manifestVersion": "1.16",
  "version": "1.0.0",
  "id": "YOUR_APP_ID",
  "packageName": "com.adl.teamsagent",
  "developer": {
    "name": "DK",
    "websiteUrl": "https://www.example.com",
    "privacyUrl": "https://www.example.com/privacy",
    "termsOfUseUrl": "https://www.example.com/terms"
  },
  "name": {
    "short": "ADL Agent",
    "full": "Architectural Decision Log Agent"
  },
  "description": {
    "short": "Capture decisions in Teams",
    "full": "Automatically capture and log architectural decisions during Teams meetings and chats"
  },
  "icons": {
    "outline": "outline.png",
    "color": "color.png"
  },
  "accentColor": "#FFFFFF",
  "bots": [
    {
      "botId": "YOUR_APP_ID",
      "scopes": ["personal", "team", "groupchat"],
      "supportsFiles": false,
      "isNotificationOnly": false,
      "commandLists": [
        {
          "scopes": ["personal", "team", "groupchat"],
          "commands": [
            {
              "title": "Log Decision",
              "description": "Log an architectural decision"
            }
          ]
        }
      ]
    }
  ],
  "permissions": ["identity", "messageTeamMembers"],
  "validDomains": []
}
```

Create a ZIP file with:
- `manifest.json`
- `outline.png` (32x32 icon)
- `color.png` (192x192 icon)

#### 9. Upload to Teams

1. Open Microsoft Teams
2. Click "Apps" in the left sidebar
3. Click "Manage your apps" → "Upload an app"
4. Select "Upload a custom app"
5. Upload your ZIP file
6. Add the app to a chat or team

---

## Method 3: Local Testing with ngrok (Quick Testing)

Perfect for testing without Azure deployment.

### Steps

#### 1. Install ngrok
```bash
brew install ngrok
# Or download from https://ngrok.com/download
```

#### 2. Start ngrok tunnel
```bash
ngrok http 3978
```

This gives you a public URL like: `https://abc123.ngrok.io`

#### 3. Create Bot Registration

Follow Method 2, steps 2-3, but use your ngrok URL as the endpoint:
```
https://abc123.ngrok.io/api/messages
```

#### 4. Add credentials to .env
```bash
MICROSOFT_APP_ID=your-app-id
MICROSOFT_APP_PASSWORD=your-app-password
```

#### 5. Start your agent
```bash
npm start
```

#### 6. Create Teams App (follow Method 2, step 8)

**Note**: ngrok URLs change every restart, so you'll need to update the bot endpoint each time.

---

## 🎯 Current Status

✅ **Built locally** - Agent is ready  
✅ **Local testing available** - Agent Playground running  
⏳ **Not deployed to Teams** - Follow one of the methods above  

## 🚀 Recommended Next Steps

1. **Test locally first**: Run `npm test` to use Agent Playground
2. **Sign up for M365 Developer**: Get free Teams environment
3. **Install Teams Toolkit**: Easiest deployment method
4. **Deploy with Teams Toolkit**: Use F5 in VS Code

## 📚 Resources

- [Teams Toolkit Documentation](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
- [Azure Bot Service](https://learn.microsoft.com/en-us/azure/bot-service/)
- [Teams App Manifest](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [M365 Developer Program](https://developer.microsoft.com/microsoft-365/dev-program)

## 💡 Testing Tips

When testing in Agent Playground or Teams:
- Type `@ADL [Your decision]` to log decisions
- The agent will show a 🔔 when successful
- Check http://localhost:3000 to see logged decisions in the ADL UI
- Review http://localhost:4000/graphql to query the GraphQL API

## 🐛 Troubleshooting

**"Bot not responding in Teams"**
- Verify messaging endpoint is correct
- Check bot credentials in .env
- Review Azure App Service logs

**"MCP server not connected"**
- Ensure ADL-MCP servers are running
- Check ADL_MCP_SERVER_PATH in .env
- Deploy ADL-MCP with your agent (or use HTTP endpoint)

**"Agent Playground not opening"**
- Run `npm test` from the agent directory
- Check port 3978 is available
- Look for errors in console output
