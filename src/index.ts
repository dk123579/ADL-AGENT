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
import { ADLMCPClient } from './adlMcpClient.js';
import { DecisionExtractor } from './decisionExtractor.js';

// Configuration from environment variables
const ADL_MCP_SERVER_PATH = process.env.ADL_MCP_SERVER_PATH || '';
const ADL_MCP_COMMAND = process.env.ADL_MCP_COMMAND || 'node';
const ADL_MCP_ARGS = (process.env.ADL_MCP_ARGS || 'dist/index.js').split(' ');
const ADL_DEFAULT_AUTHOR = process.env.ADL_DEFAULT_AUTHOR || 'DK';
const ADL_DEFAULT_FACTSHEET = process.env.ADL_DEFAULT_FACTSHEET || 'LeanIX';
const ADL_DEFAULT_STATUS = process.env.ADL_DEFAULT_STATUS || 'Proposed';

// Custom conversation state to track multi-turn ADL capture
interface ConversationState {
  capturingDecision?: boolean;
  capturedText?: string;
  messageCount: number;
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
    'To log a decision, use one of these formats:\n' +
    '• **Chat**: `@ADL [Your decision here]`\n' +
    '• **Chat**: `@ADL (Your decision here)`\n' +
    '• **Speech**: Say "ADL ... your decision ... END ADL"\n\n' +
    'I\'ll automatically capture and save your decisions to the ADL system.'
  );
});

// Main message handler
agentApp.onActivity(ActivityTypes.Message, async (context: TurnContext, state: ApplicationTurnState) => {
  const messageText = context.activity.text?.trim() || '';
  
  // Initialize message count
  state.conversation.messageCount = (state.conversation.messageCount || 0) + 1;

  // Check if this is an ADL command
  if (DecisionExtractor.isADLCommand(messageText)) {
    // Try to extract decision
    const decision = DecisionExtractor.extractDecision(messageText);
    
    if (decision) {
      // Decision extracted successfully
      await processDecision(context, decision);
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
        'Please use one of these formats:\n' +
        '• `@ADL [Your decision here]`\n' +
        '• `@ADL (Your decision here)`\n' +
        '• Say "ADL ... your decision ... END ADL"'
      );
    }
  } else if (state.conversation.capturingDecision) {
    // Continue capturing multi-turn decision
    state.conversation.capturedText += ' ' + messageText;
    
    // Check if END ADL was said
    if (messageText.toLowerCase().includes('end adl')) {
      const decision = DecisionExtractor.extractDecision(state.conversation.capturedText || '');
      if (decision) {
        await processDecision(context, decision);
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
 * Process and save an extracted decision
 */
async function processDecision(context: TurnContext, decision: string): Promise<void> {
  try {
    await context.sendActivity(`📝 Processing decision: "${decision}"`);
    
    // Check if ADL-MCP client is connected
    if (!adlClient.isConnected()) {
      await context.sendActivity(
        '⚠️ ADL-MCP server is not connected. Please configure ADL_MCP_SERVER_PATH in .env file.\n\n' +
        `**Decision captured**: ${decision}\n` +
        `**Author**: ${ADL_DEFAULT_AUTHOR}\n` +
        `**Fact Sheet**: ${ADL_DEFAULT_FACTSHEET}\n` +
        `**Status**: ${ADL_DEFAULT_STATUS}`
      );
      return;
    }

    // Create ADL entry via MCP
    const result = await adlClient.createADLEntry(
      decision,
      ADL_DEFAULT_AUTHOR,
      ADL_DEFAULT_FACTSHEET,
      ADL_DEFAULT_STATUS
    );

    // Success feedback with beep emoji (🔔)
    await context.sendActivity(
      '✅ 🔔 **Decision logged successfully!**\n\n' +
      `**Decision**: ${decision}\n` +
      `**Author**: ${ADL_DEFAULT_AUTHOR}\n` +
      `**Fact Sheet**: ${ADL_DEFAULT_FACTSHEET}\n` +
      `**Status**: ${ADL_DEFAULT_STATUS}\n\n` +
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
