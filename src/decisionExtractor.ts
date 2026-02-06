// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Extracts decision text from user input
 * Handles two formats:
 * 1. Chat: @ADL ['decision text here']
 * 2. Speech: ADL ... END ADL
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
   * Extract decision text from various input formats
   */
  static extractDecision(text: string): string | null {
    if (!text) return null;

    const normalizedText = text.trim();

    // Format 1: @ADL ['decision text'] or @ADL ["decision text"]
    const bracketMatch = normalizedText.match(/@adl\s*\[['"](.+?)['"]\]/i);
    if (bracketMatch && bracketMatch[1]) {
      return bracketMatch[1].trim();
    }

    // Format 2: @ADL {decision text} 
    const curlyBraceMatch = normalizedText.match(/@adl\s*\{(.+?)\}/i);
    if (curlyBraceMatch && curlyBraceMatch[1]) {
      return curlyBraceMatch[1].trim();
    }

    // Format 3: @ADL (decision text)
    const parenMatch = normalizedText.match(/@adl\s*\((.+?)\)/i);
    if (parenMatch && parenMatch[1]) {
      return parenMatch[1].trim();
    }

    // Format 4: ADL ... END ADL (for speech/meeting transcription)
    const speechMatch = normalizedText.match(/\badl\b\s+(.+?)\s+end\s+adl\b/is);
    if (speechMatch && speechMatch[1]) {
      return speechMatch[1].trim();
    }

    // Format 5: Simple @ADL followed by text (rest of message is the decision)
    const simpleMatch = normalizedText.match(/@adl\s+(.+)/i);
    if (simpleMatch && simpleMatch[1]) {
      const decision = simpleMatch[1].trim();
      // Make sure it's not just a bracket or other formatting character
      if (decision.length > 0 && !decision.match(/^[\[\{\(]+$/)) {
        return decision;
      }
    }

    return null;
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
