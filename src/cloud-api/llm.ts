import { noop } from "lodash";
import dotenv from "dotenv";
import { LLMServer } from "../type";
import ollamaLLM from "./local/ollama-llm";
import llm8850LLM from "./local/llm8850-llm";
import {
  ChatWithLLMStreamFunction,
  ResetChatHistoryFunction,
  SummaryTextWithLLMFunction,
} from "./interface";

dotenv.config();

let chatWithLLMStream: ChatWithLLMStreamFunction = noop as any;
let resetChatHistory: ResetChatHistoryFunction = noop as any;
let summaryTextWithLLM: SummaryTextWithLLMFunction = async (text, _) => text;

export const llmServer: LLMServer = (
  process.env.LLM_SERVER || LLMServer.ollama
).toLowerCase() as LLMServer;

console.log(`Current LLM Server: ${llmServer}`);

switch (llmServer) {
  case LLMServer.ollama:
    ({ chatWithLLMStream, resetChatHistory, summaryTextWithLLM } = ollamaLLM);
    break;
  case LLMServer.llm8850:
    ({ chatWithLLMStream, resetChatHistory } = llm8850LLM);
    break;
  default:
    console.warn(
      `unknown llm server: ${llmServer}, should be ollama/llm8850`,
    );
    break;
}

export { chatWithLLMStream, resetChatHistory, summaryTextWithLLM };
