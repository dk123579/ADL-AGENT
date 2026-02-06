// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Interface for parsed ADL entry data
 */
export interface ADLEntryData {
  decision: string;
  title?: string;
  author?: string;
  factSheets?: string[];
  meeting?: string;
  status?: string;
}

/**
 * Interface for ADL configuration
 */
export interface ADLConfig {
  author?: string;
  factSheets?: string[];
  meeting?: string;
  status?: string;
}

/**
 * Extracts decision text and optional fields from user input
 * Handles multiple formats:
 * 1. Chat: @ADL [decision text]
 * 2. Speech: ADL ... END ADL
 * 3. With fields: @ADL [decision] author:"name" factSheets:"sheet1,sheet2"
 * 4. Config: @ADL author:"name" factSheets:"sheet1,sheet2" meeting:"link"
 */
export class DecisionExtractor {
  
  /**
   * Check if message is an ADL command
   */
  static isADLCommand(text: string): boolean {
    if (!text) return false;
    
    const normalizedText = text.trim().toLowerCase();
    
    // Check for @ADL mention or ADL keyword at start
    return normalizedText.includes('@adl') || normalizedText.startsWith('adl');
  }

  /**
   * Check if message is a configuration command
   */
  static isConfigCommand(text: string): boolean {
    if (!text) return false;
    const normalizedText = text.trim().toLowerCase();
    
    // Config command has @ADL but no decision text in brackets/parens
    // and contains field assignments like author:"..." or factSheets:"..."
    return normalizedText.includes('@adl') && 
           !normalizedText.match(/@adl\s*[\[\{\(]/i) &&
           (normalizedText.includes('author:') || 
            normalizedText.includes('factsheets:') || 
            normalizedText.includes('meeting:') ||
            normalizedText.includes('status:'));
  }

  /**
   * Parse configuration from command
   */
  static parseConfig(text: string): ADLConfig {
    const config: ADLConfig = {};
    
    // Extract author:"value"
    const authorMatch = text.match(/author:\s*["']([^"']+)["']/i);
    if (authorMatch) config.author = authorMatch[1].trim();
    
    // Extract factSheets:"value1,value2"
    const factSheetsMatch = text.match(/factsheets:\s*["']([^"']+)["']/i);
    if (factSheetsMatch) {
      config.factSheets = factSheetsMatch[1].split(',').map(s => s.trim()).filter(s => s);
    }
    
    // Extract meeting:"value"
    const meetingMatch = text.match(/meeting:\s*["']([^"']+)["']/i);
    if (meetingMatch) config.meeting = meetingMatch[1].trim();
    
    // Extract status:"value"
    const statusMatch = text.match(/status:\s*["']([^"']+)["']/i);
    if (statusMatch) config.status = statusMatch[1].trim();
    
    return config;
  }

  /**
   * Extract system/application names from decision text (capitalized words or acronyms)
   */
  static extractSystemNames(decision: string): string[] {
    if (!decision) return [];
    
    // Find capitalized words (2+ consecutive caps, or cap followed by lowercase)
    const systemPattern = /\b([A-Z]{2,}(?:[A-Z])*)\b|(?:^|\s)([A-Z][a-z]+(?:[A-Z][a-z]+)*)\b/g;
    const systems = new Set<string>();
    
    let match;
    while ((match = systemPattern.exec(decision)) !== null) {
      const system = match[1] || match[2];
      // Exclude common words
      if (system && !['We', 'The', 'This', 'That', 'Our', 'All', 'For', 'And', 'But', 'Or'].includes(system)) {
        systems.add(system);
      }
    }
    
    return Array.from(systems);
  }

  /**
   * Generate a very brief title (<12 words) from decision text
   * Rephrases decision as a concise action-oriented title
   */
  static generateTitle(decision: string): string {
    if (!decision) return 'Untitled Decision';
    
    // Clean the decision text
    let cleaned = decision.trim();
    
    // Extract key action verbs and objects
    const actionPatterns = [
      // "We decided to use X" -> "Use X"
      /(?:we(?:'ve| have)?|i(?:'ve| have)?) (?:decided|chosen|selected|agreed) to (use|implement|adopt|migrate to|switch to|integrate|deploy|establish|create) (.+?)(?:\s+(?:for|to|because|since|as|in order to)|\.|$)/i,
      // "We will use X" -> "Use X"
      /(?:we|i) (?:will|shall|are going to|plan to) (use|implement|adopt|migrate|switch|integrate|deploy|establish|create) (.+?)(?:\s+(?:for|to|because|since|as|in order to)|\.|$)/i,
      // "Using X for Y" -> "Use X for Y"
      /(using|implementing|adopting|migrating to|switching to|integrating|deploying) (.+?)(?:\s+(?:for|to|as)(.+?))?(?:\.|$)/i,
      // "Decision to use X" -> "Use X"
      /decision (?:to|is to) (use|implement|adopt|migrate to|switch to|integrate|deploy) (.+?)(?:\s+(?:for|to)|\.|$)/i,
    ];
    
    for (const pattern of actionPatterns) {
      const match = cleaned.match(pattern);
      if (match) {
        const verb = match[1].charAt(0).toUpperCase() + match[1].slice(1);
        const object = match[2]?.trim() || '';
        const context = match[3]?.trim() || '';
        
        // Build title with verb + object + optional context
        let title = `${verb} ${object}`;
        if (context) {
          title += ` for ${context}`;
        }
        
        // Limit to ~60 chars (approximately 12 words)
        if (title.length > 60) {
          title = title.substring(0, 57) + '...';
        }
        
        return title;
      }
    }
    
    // Fallback: Remove common prefixes and take first part
    cleaned = cleaned.replace(/^(we(?:'ve| have)?|i(?:'ve| have)?) (?:decided|will|chose|selected|are going) (?:to |that )?/i, '');
    cleaned = cleaned.replace(/^(decided to |decision to |decision: |use |implement |adopt )/i, '');
    
    // Take first sentence or first 60 characters
    const firstSentence = cleaned.split(/[.!?]/)[0];
    let title = firstSentence.length > 60 ? firstSentence.substring(0, 57) + '...' : firstSentence;
    
    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);
    
    return title;
  }

  /**
   * Extract optional fields from text
   */
  static extractFields(text: string): Partial<ADLEntryData> {
    const fields: Partial<ADLEntryData> = {};
    
    // Extract author:"value"
    const authorMatch = text.match(/author:\s*["']([^"']+)["']/i);
    if (authorMatch) fields.author = authorMatch[1].trim();
    
    // Extract factSheets:"value1,value2"
    const factSheetsMatch = text.match(/factsheets:\s*["']([^"']+)["']/i);
    if (factSheetsMatch) {
      fields.factSheets = factSheetsMatch[1].split(',').map(s => s.trim()).filter(s => s);
    }
    
    // Extract meeting:"value"
    const meetingMatch = text.match(/meeting:\s*["']([^"']+)["']/i);
    if (meetingMatch) fields.meeting = meetingMatch[1].trim();
    
    // Extract status:"value"
    const statusMatch = text.match(/status:\s*["']([^"']+)["']/i);
    if (statusMatch) fields.status = statusMatch[1].trim();
    
    // Extract title:"value"
    const titleMatch = text.match(/title:\s*["']([^"']+)["']/i);
    if (titleMatch) fields.title = titleMatch[1].trim();
    
    return fields;
  }

  /**
   * Extract complete ADL entry data from text
   */
  static extractADLEntry(text: string): ADLEntryData | null {
    if (!text) return null;

    const normalizedText = text.trim();
    let decision: string | null = null;

    // Format 1: @ADL ['decision text'] or @ADL ["decision text"]
    const bracketMatch = normalizedText.match(/@adl\s*\[['"]?([^"'\]]+?)['"]?\]/i);
    if (bracketMatch && bracketMatch[1]) {
      decision = bracketMatch[1].trim();
    }

    // Format 2: @ADL {decision text} 
    if (!decision) {
      const curlyBraceMatch = normalizedText.match(/@adl\s*\{(.+?)\}/i);
      if (curlyBraceMatch && curlyBraceMatch[1]) {
        decision = curlyBraceMatch[1].trim();
      }
    }

    // Format 3: @ADL (decision text)
    if (!decision) {
      const parenMatch = normalizedText.match(/@adl\s*\((.+?)\)/i);
      if (parenMatch && parenMatch[1]) {
        decision = parenMatch[1].trim();
      }
    }

    // Format 4: ADL ... END ADL (for speech/meeting transcription)
    if (!decision) {
      const speechMatch = normalizedText.match(/\badl\b\s+(.+?)\s+end\s+adl\b/is);
      if (speechMatch && speechMatch[1]) {
        decision = speechMatch[1].trim();
      }
    }

    // Format 5: Simple @ADL followed by text (before any field definitions)
    if (!decision) {
      const simpleMatch = normalizedText.match(/@adl\s+([^a-z]+?)(?:\s+(?:author|factsheets|meeting|status|title):|\s*$)/i);
      if (simpleMatch && simpleMatch[1]) {
        decision = simpleMatch[1].trim();
      } else {
        // Fallback: take everything after @ADL until field definitions
        const fallbackMatch = normalizedText.match(/@adl\s+(.+?)(?:\s+(?:author|factsheets|meeting|status|title):|$)/i);
        if (fallbackMatch && fallbackMatch[1]) {
          const potential = fallbackMatch[1].trim();
          if (potential.length > 0 && !potential.match(/^[\[\{\(]+$/)) {
            decision = potential;
          }
        }
      }
    }

    if (!decision) return null;

    // Extract optional fields
    const fields = this.extractFields(normalizedText);
    
    // Auto-generate fact sheets from system names if not explicitly provided
    const autoFactSheets = fields.factSheets && fields.factSheets.length > 0 
      ? fields.factSheets 
      : this.extractSystemNames(decision);
    
    return {
      decision,
      title: fields.title || this.generateTitle(decision),
      author: fields.author,
      factSheets: autoFactSheets.length > 0 ? autoFactSheets : undefined,
      meeting: fields.meeting,
      status: fields.status
    };
  }

  /**
   * Legacy method for backward compatibility
   */
  static extractDecision(text: string): string | null {
    const entry = this.extractADLEntry(text);
    return entry?.decision || null;
  }

  /**
   * Check if message is still being captured (waiting for END ADL)
   */
  static isCapturingDecision(text: string): boolean {
    if (!text) return false;
    
    const normalizedText = text.trim().toLowerCase();
    
    // Check if ADL command started but no END ADL yet
    return normalizedText.includes('adl') && 
           !normalizedText.includes('end adl') &&
           !normalizedText.match(/@adl\s*[\[\{\(]/i); // and not using bracket format
  }
}
