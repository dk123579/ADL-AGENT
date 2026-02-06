// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { startServer } from '@microsoft/agents-hosting-express';
import { 
  TurnState, 
  MemoryStorage, 
  TurnContext, 
  AgentApplication, 
  AttachmentDownloader 
} from '@microsoft/agents-hosting';
import { ActivityTypes } from '@microsoft/agents-activity';
import { ADLMCPClient, CreateADLOptions } from './adlMcpClient.js';
import { DecisionExtractor, ADLConfig } from './decisionExtractor.js';

// Configuration from environment variables
const ADL_MCP_SERVER_PATH = process.env.ADL_MCP_SERVER_PATH || '';
const ADL_MCP_COMMAND = process.env.ADL_MCP_COMMAND || 'node';
const ADL_MCP_ARGS = (process.env.ADL_MCP_ARGS || 'dist/index.js').split(' ');
const ADL_DEFAULT_AUTHOR = process.env.ADL_DEFAULT_AUTHOR || 'DK';
const ADL_DEFAULT_FACTSHEET = process.env.ADL_DEFAULT_FACTSHEET || 'LeanIX';
const ADL_DEFAULT_STATUS = process.env.ADL_DEFAULT_STATUS || 'Proposed';

// Custom conversation state to track multi-turn ADL capture and configuration
interface ConversationState {
  capturingDecision?: boolean;
  capturedText?: string;
  messageCount: number;
  config?: ADLConfig;
}

type ApplicationTurnState = TurnState<ConversationState>;

// Initialize ADL-MCP Client
const adlClient = new ADLMCPClient();

// Connect to ADL-MCP server if configured
if (ADL_MCP_SERVER_PATH) {
  adlClient.connect(ADL_MCP_SERVER_PATH, ADL_MCP_COMMAND, ADL_MCP_ARGS)
    .then(() => console.log('✅ ADL-MCP server connected'))
    .catch(err => console.error('❌ Failed to connect to ADL-MCP server:', err));
} else {
  console.warn('⚠️  ADL_MCP_SERVER_PATH not configured. Please set it in .env file.');
}

// Storage and downloader setup
const storage = new MemoryStorage();
const downloader = new AttachmentDownloader();

// Create agent application
const agentApp = new AgentApplication<ApplicationTurnState>({
  storage,
  fileDownloaders: [downloader]
});

// Welcome message when members are added
agentApp.onConversationUpdate('membersAdded', async (context: TurnContext, state: ApplicationTurnState) => {
  await context.sendActivity(
    '👋 Hello! I\'m the ADL Decision Capture Agent.\n\n' +
    '**Log a decision:**\n' +
    '• `@ADL [Your decision here]`\n' +
    '• `@ADL Your decision here author:"Name" factSheets:"Sheet1,Sheet2"`\n' +
    '• Say: "ADL ... your decision ... END ADL"\n\n' +
    '**Set defaults:**\n' +
    '• `@ADL author:"name@email.com" factSheets:"LeanIX,OTCAS" meeting:"Teams link"`\n\n' +
    '**Optional fields:** title, author, factSheets, meeting, status'
  );
});

// Main message handler
agentApp.onActivity(ActivityTypes.Message, async (context: TurnContext, state: ApplicationTurnState) => {
  const messageText = context.activity.text?.trim() || '';
  
  // Initialize message count and config
  state.conversation.messageCount = (state.conversation.messageCount || 0) + 1;
  state.conversation.config = state.conversation.config || {};

  // Check if this is a configuration command
  if (DecisionExtractor.isConfigCommand(messageText)) {
    const config = DecisionExtractor.parseConfig(messageText);
    
    // Merge with existing config
    state.conversation.config = {
      ...state.conversation.config,
      ...config
    };
    
    await context.sendActivity(
      '✅ Configuration updated!\n\n' +
      `**Current defaults:**\n` +
      `• Author: ${state.conversation.config.author || ADL_DEFAULT_AUTHOR}\n` +
      `• Fact Sheets: ${state.conversation.config.factSheets?.join(', ') || ADL_DEFAULT_FACTSHEET}\n` +
      `• Meeting: ${state.conversation.config.meeting || 'Not set'}\n` +
      `• Status: ${state.conversation.config.status || ADL_DEFAULT_STATUS}`
    );
    return;
  }

  // Check if this is an ADL command with decision
  if (DecisionExtractor.isADLCommand(messageText)) {
    // Try to extract decision and fields
    const entry = DecisionExtractor.extractADLEntry(messageText);
    
    if (entry && entry.decision) {
      // Merge with stored config and environment defaults
      const finalEntry = {
        decision: entry.decision,
        title: entry.title,
        author: entry.author || state.conversation.config.author || ADL_DEFAULT_AUTHOR,
        factSheets: entry.factSheets || state.conversation.config.factSheets || [ADL_DEFAULT_FACTSHEET],
        meeting: entry.meeting || state.conversation.config.meeting,
        status: entry.status || state.conversation.config.status || ADL_DEFAULT_STATUS
      };
      
      // Process decision
      await processDecision(context, finalEntry);
      // Reset capturing state
      state.conversation.capturingDecision = false;
      state.conversation.capturedText = undefined;
    } else if (DecisionExtractor.isCapturingDecision(messageText)) {
      // Start capturing multi-turn decision (for speech that might come in parts)
      state.conversation.capturingDecision = true;
      state.conversation.capturedText = messageText;
      await context.sendActivity('🎤 Capturing decision... (say "END ADL" when finished)');
    } else {
      // ADL command detected but no valid decision format
      await context.sendActivity(
        '⚠️ ADL command detected, but I couldn\'t extract the decision.\n\n' +
        '**Supported formats:**\n' +
        '• `@ADL [Your decision here]`\n' +
        '• `@ADL Your decision text author:"Name"`\n' +
        '• Say "ADL ... your decision ... END ADL"\n\n' +
        '**Set defaults:** `@ADL author:"name" factSheets:"Sheet1,Sheet2"`'
      );
    }
  } else if (state.conversation.capturingDecision) {
    // Continue capturing multi-turn decision
    state.conversation.capturedText += ' ' + messageText;
    
    // Check if END ADL was said
    if (messageText.toLowerCase().includes('end adl')) {
      const entry = DecisionExtractor.extractADLEntry(state.conversation.capturedText || '');
      if (entry && entry.decision) {
        // Merge with stored config
        const finalEntry = {
          decision: entry.decision,
          title: entry.title,
          author: entry.author || state.conversation.config.author || ADL_DEFAULT_AUTHOR,
          factSheets: entry.factSheets || state.conversation.config.factSheets || [ADL_DEFAULT_FACTSHEET],
          meeting: entry.meeting || state.conversation.config.meeting,
          status: entry.status || state.conversation.config.status || ADL_DEFAULT_STATUS
        };
        await processDecision(context, finalEntry);
      } else {
        await context.sendActivity('❌ Could not extract decision from captured text.');
      }
      // Reset state
      state.conversation.capturingDecision = false;
      state.conversation.capturedText = undefined;
    }
  } else {
    // Regular message - provide helpful echo
    await context.sendActivity(
      `Message received: "${messageText}"\n\n` +
      `💡 Tip: To log a decision, use @ADL [Your decision here]`
    );
  }
});

/**
 * Process and save an extracted decision with all fields
 */
async function processDecision(context: TurnContext, options: CreateADLOptions): Promise<void> {
  try {
    await context.sendActivity(`📝 Processing decision: "${options.decision}"`);
    
    // Check if ADL-MCP client is connected
    if (!adlClient.isConnected()) {
      await context.sendActivity(
        '⚠️ ADL-MCP server is not connected. Please configure ADL_MCP_SERVER_PATH in .env file.\n\n' +
        `**Decision**: ${options.decision}\n` +
        `**Title**: ${options.title || 'Auto-generated'}\n` +
        `**Author**: ${options.author || ADL_DEFAULT_AUTHOR}\n` +
        `**Fact Sheets**: ${options.factSheets?.join(', ') || ADL_DEFAULT_FACTSHEET}\n` +
        `**Meeting**: ${options.meeting || 'Not specified'}\n` +
        `**Status**: ${options.status || ADL_DEFAULT_STATUS}`
      );
      return;
    }

    // Create ADL entry via MCP
    const result = await adlClient.createADLEntry(options);

    // Success feedback with beep emoji (🔔)
    await context.sendActivity(
      '✅ 🔔 **Decision logged successfully!**\n\n' +
      `**Title**: ${options.title || 'Auto-generated'}\n` +
      `**Decision**: ${options.decision}\n` +
      `**Author**: ${options.author || ADL_DEFAULT_AUTHOR}\n` +
      `**Fact Sheets**: ${options.factSheets?.join(', ') || ADL_DEFAULT_FACTSHEET}\n` +
      (options.meeting ? `**Meeting**: ${options.meeting}\n` : '') +
      `**Status**: ${options.status || ADL_DEFAULT_STATUS}\n\n` +
      `Entry ID: ${result.content?.[0]?.text || 'Created'}`
    );
    
    console.log('✅ ADL entry created:', result);
  } catch (error) {
    console.error('❌ Error creating ADL entry:', error);
    await context.sendActivity(
      `❌ Failed to log decision: ${error instanceof Error ? error.message : 'Unknown error'}\n\n` +
      'Please check the ADL-MCP server connection.'
    );
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await adlClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down...');
  await adlClient.disconnect();
  process.exit(0);
});

// Start the server
console.log('🚀 Starting ADL Teams Agent...');
startServer(agentApp);
