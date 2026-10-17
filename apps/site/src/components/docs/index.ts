// The public surface of the docs' sample library. The parts the app's API
// page also uses (CodeBlock, the languages, requestSamples, the captured
// samples) live in @oxumi/ui/docs; SamplePanel and the topics are the site's.
//
//   CodeBlock        highlighted, copyable code: { code, language, title?,
//                    provenance?, status?, clip?, actions? }. Colours come
//                    from the theme, so it follows light or dark mode.
//   JsonBlock        CodeBlock for a JSON value: { value, title?, status?, … }.
//   CodeSurface      wrapper that puts code on the dark palette in any mode.
//   LanguagePicker   the nine languages as pills; LanguageSelect, as a menu.
//                    Both read and write one remembered choice.
//   useSampleLanguage() → [language, setLanguage]; SAMPLE_LANGUAGES lists them.
//   SampleBlock      one Samples record (code in all nine) in the chosen one.
//   SamplePanel      a named topic as request + response:
//                    { topic, context?, title?, response?, picker?, clip? }.
//   Topics           placeCall, getCall, listCalls, hangUpCall, listAgents,
//                    getAgent, authenticate, verifyWebhook, startConversation,
//                    sendMessage, endConversation, handleRateLimit. Each is
//                    (context?: TopicContext) => TopicSample, where the context
//                    carries { baseUrl, apiKey, agentId, agentName, variables,
//                    fields, turns, callId, conversationId, text } and every
//                    part is optional. TOPICS maps the names to the functions.
//   requestSamples   (spec, { baseUrl?, apiKey? }) → Samples, for a request
//                    that is not one of the topics.
//
// There are no Oxumi SDKs: every sample uses the language's standard
// library or its one de-facto HTTP client.

export {
  CodeBlock,
  type CodeBlockProps,
  CodeSurface,
  CopyButton,
  JsonBlock,
  LanguagePicker,
  LanguageSelect,
  type Provenance,
  SampleBlock,
} from "@oxumi/ui/docs/CodeBlock";
export type { ExampleContext } from "@oxumi/ui/docs/examples";
export type { CodeLanguage } from "@oxumi/ui/docs/highlight";
export {
  languageInfo,
  SAMPLE_LANGUAGES,
  type SampleLanguage,
  type Samples,
  useSampleLanguage,
} from "@oxumi/ui/docs/languages";
export {
  BASE_URL,
  type Json,
  KEY_PLACEHOLDER,
  type RequestOptions,
  type RequestSpec,
  requestSamples,
} from "@oxumi/ui/docs/request";
export { SamplePanel } from "./SamplePanel";
export {
  authenticate,
  endConversation,
  getAgent,
  getCall,
  handleRateLimit,
  hangUpCall,
  listAgents,
  listCalls,
  placeCall,
  sendMessage,
  startConversation,
  type Topic,
  type TopicContext,
  type TopicName,
  type TopicResponse,
  type TopicSample,
  TOPICS,
  verifyWebhook,
} from "./topics";
export { BACKOFF_SAMPLES, backoffSamples } from "@oxumi/ui/docs/backoff";
export { VERIFY_SAMPLES } from "@oxumi/ui/docs/verify";
