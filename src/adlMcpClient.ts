// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Options for creating an ADL entry
 */
export interface CreateADLOptions {
  decision: string;
  title?: string;
  author?: string;
  factSheets?: string[];
  meeting?: string;
  status?: string;
}

/**
 * ADL-MCP Client for interacting with the ADL Model Context Protocol server
 */
export class ADLMCPClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private connected: boolean = false;

  constructor() {
    this.client = new Client({
      name: 'adl-teams-agent',
      version: '1.0.0',
    }, {
      capabilities: {}
    });
  }

  /**
   * Connect to the ADL-MCP server
   */
  async connect(serverPath: string, command: string, args: string[]): Promise<void> {
    if (this.connected) {
      console.log('Already connected to ADL-MCP server');
      return;
    }

    try {
      // Build full path to the server script
      const fullPath = `${serverPath}/${args[0]}`;
      
      // Create transport with command - use full path
      this.transport = new StdioClientTransport({
        command,
        args: [fullPath, ...args.slice(1)]
      });

      // Connect client
      await this.client.connect(this.transport);
      this.connected = true;
      console.log('✅ Successfully connected to ADL-MCP server');
      console.log('   Server path:', serverPath);
      console.log('   Full command:', command, fullPath);
    } catch (error) {
      console.error('Failed to connect to ADL-MCP server:', error);
      throw error;
    }
  }

  /**
   * Create a new ADL entry
   */
  async createADLEntry(options: CreateADLOptions): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to ADL-MCP server. Call connect() first.');
    }

    try {
      // Generate title if not provided
      const title = options.title || this.generateTitle(options.decision);
      
      // Prepare factSheets array
      const factSheets = options.factSheets && options.factSheets.length > 0 
        ? options.factSheets 
        : ['General'];
      
      // Call the ADL-MCP tool to create a new entry
      const result = await this.client.callTool({
        name: 'adl_create',
        arguments: {
          title,
          decision: options.decision,
          author: options.author || 'Unknown',
          factSheets,
          status: options.status || 'Proposed'
        }
      });

      return result;
    } catch (error) {
      console.error('Failed to create ADL entry:', error);
      throw error;
    }
  }

  /**
   * Generate a short title from decision text
   */
  private generateTitle(decision: string): string {
    if (!decision) return 'Untitled Decision';
    
    // Clean the decision text
    let cleaned = decision.trim();
    
    // Remove common prefixes
    cleaned = cleaned.replace(/^(we (decided|will|chose|selected|are going) (to |that )?)/i, '');
    cleaned = cleaned.replace(/^(decided to |decision to |decision: )/i, '');
    
    // Take first sentence or first 60 characters
    const firstSentence = cleaned.split(/[.!?]/)[0];
    let title = firstSentence.length > 60 ? firstSentence.substring(0, 57) + '...' : firstSentence;
    
    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);
    
    return title;
  }

  /**
   * Disconnect from the ADL-MCP server
   */
  async disconnect(): Promise<void> {
    if (this.transport && this.connected) {
      await this.client.close();
      this.connected = false;
      console.log('Disconnected from ADL-MCP server');
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}
