// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

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
  async createADLEntry(decision: string, author: string, factSheet: string, status: string, title?: string): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to ADL-MCP server. Call connect() first.');
    }

    try {
      // Call the ADL-MCP tool to create a new entry
      const result = await this.client.callTool({
        name: 'adl_create',
        arguments: {
          title: title || 'TITLE HERE',
          decision,
          author,
          factSheets: [factSheet],
          status
        }
      });

      return result;
    } catch (error) {
      console.error('Failed to create ADL entry:', error);
      throw error;
    }
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
