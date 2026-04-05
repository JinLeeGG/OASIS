export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: FunctionCall[];
  tool_call_id?: string;
}

export interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string
  tool_calls?: OllamaFunctionCall[][];
  tool_name?: string;
}

export enum ASRServer {
  vosk = "vosk",
  whisper = "whisper",
  whisperhttp = "whisper-http",
  llm8850whisper = "llm8850whisper",
  fasterwhisper = "faster-whisper",
}

export enum LLMServer {
  ollama = "ollama",
  llm8850 = "llm8850",
}

export enum TTSServer {
  piper = "piper",
  piperhttp = "piper-http",
  llm8850melotts = "llm8850melotts",
}

export enum VectorDBServer {
  qdrant = "qdrant",
}

export enum EmbeddingServer {
  ollama = "ollama",
}


export interface FunctionCall {
  function: {
    arguments: string;
    name?: string;
  };
  id?: string;
  index: number;
  type?: string;
}

// {"function":{"index":0,"name":"setVolume","arguments":{"percent":50}}}
export interface OllamaFunctionCall {
  function: {
    index: number;
    name: string;
    arguments: Record<string, any>;
  };
}


export type LLMFunc = (params: any) => Promise<string>

export interface LLMTool {
  id?: string;
  type: "function";
  function: {
    name: string
    description: string
    parameters: {
      type?: string
      properties?: {
        [key: string]: {
          type: string
          description: string
          enum?: string[]
          items?: {
            type: string
            description?: string
            properties?: {
              [key: string]: {
                type: string
                description: string
              }
            }
            required?: string[]
          }
        }
      }
      items?: {
        type: string
        description: string
      }
      required?: string[]
    }
  }
  func: LLMFunc
}

export enum ToolReturnTag {
  Success = "[success]",
  Error = "[error]",
  Response = "[response]", // use as assistant response
}

export type TTSResult = {
  filePath?: string;
  base64?: string;
  buffer?: Buffer;
  duration: number;
};