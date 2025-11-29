/**
 * Interface for LLM clients (Ollama, OpenAI, etc.)
 * This abstraction allows swapping LLM providers without changing core code
 */
export interface LLMClient {
  /**
   * Generate a summary from a list of messages
   * @param messages Array of message objects to summarize
   * @returns Promise resolving to the generated summary text
   */
  summarize(messages: Array<{ text: string; user: string; timestamp: string }>): Promise<string>;
}

