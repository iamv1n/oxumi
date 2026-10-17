// The illustrative calls played by the demo, each line written three ways:
// English, Hindi and Hinglish. Square brackets mark the words a field's value
// is read from, in the same order as the line's `captures`. The captured
// values are identical in every language: three ways of saying it, one
// stored answer. Every company, person and number here is made up.
// The first call follows the real example flow in
// flows/driver-status-check.json (late-trip path).

import type { ExampleLanguage, Localized } from "@/components/landing/language";
import type { Beat, Field, Scenario, Step } from "./scenarios";

interface Line {
  role: "agent" | "caller";
  step: string;
  text: Localized;
  captures?: { field: string; value: string; reject?: string }[];
  route?: string;
  cut?: boolean;
  // Engine note shown just above this line, in English in every mode.
  note?: string;
  // Languages the note applies to; all of them when omitted.
  noteIn?: ExampleLanguage[];
}

export interface Call {
  id: string;
  tab: string;
  title: string;
  caller: string;
  outcome: string;
  steps: Step[];
  fields: Field[];
  lines: Line[];
}

export const CALLS: Call[] = [
  {
    id: "fleet",
    tab: "Fleet check-in",
    title: "Driver status check",
    caller: "Driver",
    outcome: "completed",
    steps: [
      { id: "greeting", kind: "start", label: "Greeting" },
      { id: "ask_location", kind: "ask", label: "Location" },
      { id: "ask_schedule", kind: "ask", label: "Schedule" },
      { id: "check_schedule", kind: "branch", label: "Late?" },
      { id: "ask_delay", kind: "ask", label: "Delay" },
      { id: "ask_help", kind: "ask", label: "Help" },
      { id: "goodbye", kind: "end", label: "Goodbye" },
    ],
    fields: [
      { name: "current_location", type: "string", step: "ask_location" },
      { name: "on_schedule", type: "boolean", step: "ask_schedule" },
      { name: "delay_reason", type: "enum", step: "ask_delay" },
      { name: "revised_eta", type: "string", step: "ask_delay" },
      { name: "needs_help", type: "boolean", step: "ask_help" },
    ],
    lines: [
      {
        role: "agent",
        step: "greeting",
        text: {
          en: "Hello Ramesh, this is the automated assistant from Shakti Logistics.",
          hi: "नमस्ते रमेश जी, मैं शक्ति लॉजिस्टिक्स की ओर से स्वचालित सहायक बोल रहा हूँ.",
          hinglish:
            "Namaste Ramesh ji, Shakti Logistics ki taraf se automated assistant bol raha hoon.",
        },
      },
      {
        role: "agent",
        step: "ask_location",
        text: {
          en: "Where have you reached?",
          hi: "अभी आप कहाँ पहुँचे हैं?",
          hinglish: "Abhi aap kahan pahunche hain?",
        },
      },
      {
        role: "caller",
        step: "ask_location",
        text: {
          en: "Just crossed the [Adilabad toll.]",
          hi: "अभी [आदिलाबाद टोल] पार किया है.",
          hinglish: "Abhi [Adilabad toll] cross kiya hai.",
        },
        captures: [{ field: "current_location", value: '"Adilabad toll"' }],
      },
      {
        role: "agent",
        step: "ask_schedule",
        text: {
          en: "Good. Will you reach Hyderabad by nine tonight?",
          hi: "ठीक है. क्या आप रात नौ बजे तक हैदराबाद पहुँच जाएँगे?",
          hinglish: "Theek hai. Kya aap raat nau baje tak Hyderabad pahunch jayenge?",
        },
      },
      {
        role: "caller",
        step: "ask_schedule",
        text: {
          en: "No, [running a bit late.]",
          hi: "नहीं, [थोड़ी देर होगी.]",
          hinglish: "Nahi, thoda [late ho jayega.]",
        },
        captures: [{ field: "on_schedule", value: "false" }],
        route: "check_schedule",
      },
      {
        role: "agent",
        step: "ask_delay",
        text: {
          en: "No problem. What is holding you up, and when will you reach now?",
          hi: "कोई बात नहीं. देरी किस वजह से है, और अब कब तक पहुँचेंगे?",
          hinglish: "Koi baat nahi. Delay kis wajah se hai, aur ab kab tak pahunchenge?",
        },
      },
      {
        role: "caller",
        step: "ask_delay",
        text: {
          en: "[Jam on the highway,] it will be [around midnight.]",
          hi: "[हाईवे पर जाम है,] [बारह बज जाएँगे.]",
          hinglish: "[Highway pe jam hai,] [barah baj jayenge.]",
        },
        captures: [
          { field: "delay_reason", value: "traffic" },
          { field: "revised_eta", value: '"around midnight"' },
        ],
      },
      {
        role: "agent",
        step: "ask_help",
        text: {
          en: "Understood. Any trouble with the truck or the paperwork?",
          hi: "समझ गया. गाड़ी या कागज़ात में कोई दिक्कत?",
          hinglish: "Samajh gaya. Gaadi ya paperwork mein koi dikkat?",
        },
      },
      {
        role: "caller",
        step: "ask_help",
        text: {
          en: "[No, all fine.]",
          hi: "[नहीं, सब ठीक है.]",
          hinglish: "[Nahi, sab theek hai.]",
        },
        captures: [{ field: "needs_help", value: "false" }],
      },
      {
        role: "agent",
        step: "goodbye",
        text: {
          en: "Thank you, your update is recorded. Drive safe.",
          hi: "धन्यवाद, आपकी जानकारी दर्ज हो गई है. सुरक्षित चलाइए.",
          hinglish: "Dhanyavaad, aapka update record ho gaya. Drive safe.",
        },
      },
    ],
  },
  {
    id: "clinic",
    tab: "Clinic reschedule",
    title: "OPD appointment check",
    caller: "Patient",
    outcome: "completed",
    steps: [
      { id: "greeting", kind: "start", label: "Greeting" },
      { id: "ask_attending", kind: "ask", label: "Coming?" },
      { id: "check_attending", kind: "branch", label: "Can't?" },
      { id: "ask_day", kind: "ask", label: "New day" },
      { id: "ask_slot", kind: "ask", label: "Slot" },
      { id: "goodbye", kind: "end", label: "Goodbye" },
    ],
    fields: [
      { name: "attending", type: "boolean", step: "ask_attending" },
      { name: "new_day", type: "enum", step: "ask_day" },
      { name: "slot", type: "enum", step: "ask_slot" },
    ],
    lines: [
      {
        role: "agent",
        step: "greeting",
        text: {
          en: "Hello Sunita, this is an automated call from City Care Clinic.",
          hi: "नमस्ते सुनीता जी, यह सिटी केयर क्लिनिक की ओर से स्वचालित कॉल है.",
          hinglish: "Namaste Sunita ji, City Care Clinic ki taraf se automated call hai.",
        },
      },
      {
        role: "agent",
        step: "ask_attending",
        text: {
          en: "You have an OPD appointment at ten tomorrow morning. Can you make it?",
          hi: "कल सुबह दस बजे आपका ओपीडी अपॉइंटमेंट है. क्या आप आ पाएँगी?",
          hinglish: "Kal subah das baje aapka OPD appointment hai. Kya aap aa payengi?",
        },
      },
      {
        role: "caller",
        step: "ask_attending",
        text: {
          en: "[I can't tomorrow,] my son has an exam.",
          hi: "[कल नहीं हो पाएगा,] बेटे की परीक्षा है.",
          hinglish: "[Kal nahi ho payega,] bete ka exam hai.",
        },
        captures: [{ field: "attending", value: "false" }],
        route: "check_attending",
      },
      {
        role: "agent",
        step: "ask_day",
        text: {
          en: "No problem. Which day would you like instead?",
          hi: "कोई बात नहीं. आप किस दिन आना चाहेंगी?",
          hinglish: "Koi baat nahi. Kis din aana chahengi?",
        },
      },
      {
        role: "caller",
        step: "ask_day",
        text: {
          en: "[Sometime next week.]",
          hi: "[अगले हफ़्ते कभी भी.]",
          hinglish: "[Agle hafte kabhi bhi.]",
        },
        captures: [{ field: "new_day", value: '"next week"', reject: "not a day of the week" }],
      },
      {
        role: "agent",
        step: "ask_day",
        text: {
          en: "Sure. Which day next week suits you?",
          hi: "ज़रूर. अगले हफ़्ते में कौन सा दिन ठीक रहेगा?",
          hinglish: "Zaroor. Agle hafte mein kaun sa din theek rahega?",
        },
        note: "new_day failed its check · asking again",
      },
      {
        role: "caller",
        step: "ask_day",
        text: {
          en: "[Wednesday,] please.",
          hi: "[बुधवार] को रख दीजिए.",
          hinglish: "[Budhvaar] ko rakh dijiye.",
        },
        captures: [{ field: "new_day", value: "wednesday" }],
      },
      {
        role: "agent",
        step: "ask_slot",
        text: { en: "Morning or evening?", hi: "सुबह या शाम?", hinglish: "Subah ya shaam?" },
      },
      {
        role: "caller",
        step: "ask_slot",
        text: { en: "[Evening.]", hi: "[शाम को.]", hinglish: "[Shaam ko.]" },
        captures: [{ field: "slot", value: "evening" }],
      },
      {
        role: "agent",
        step: "goodbye",
        text: {
          en: "Done. You are booked for Wednesday evening. Thank you.",
          hi: "ठीक है, बुधवार शाम का अपॉइंटमेंट दर्ज कर लिया है. धन्यवाद.",
          hinglish: "Theek hai, Budhvaar shaam ka appointment note kar liya hai. Dhanyavaad.",
        },
      },
    ],
  },
  {
    id: "property",
    tab: "Flat buyer",
    title: "Lead qualification",
    caller: "Buyer",
    outcome: "completed",
    steps: [
      { id: "greeting", kind: "start", label: "Greeting" },
      { id: "ask_config", kind: "ask", label: "Size" },
      { id: "ask_budget", kind: "ask", label: "Budget" },
      { id: "ask_move_in", kind: "ask", label: "Move-in" },
      { id: "ask_visit", kind: "ask", label: "Site visit" },
      { id: "goodbye", kind: "end", label: "Goodbye" },
    ],
    fields: [
      { name: "configuration", type: "enum", step: "ask_config" },
      { name: "budget_max", type: "number", step: "ask_budget" },
      { name: "move_in", type: "enum", step: "ask_move_in" },
      { name: "site_visit", type: "boolean", step: "ask_visit" },
    ],
    lines: [
      {
        role: "agent",
        step: "greeting",
        text: {
          en: "Hello, this is an automated call from Greenfield Homes. You asked about our new project.",
          hi: "नमस्ते, यह ग्रीनफ़ील्ड होम्स की ओर से स्वचालित कॉल है. आपने हमारे नए प्रोजेक्ट के बारे में पूछा था.",
          hinglish:
            "Namaste, Greenfield Homes ki taraf se automated call hai. Aapne hamare naye project ke baare mein poocha tha.",
        },
      },
      {
        role: "agent",
        step: "ask_config",
        text: {
          en: "What size of flat are you looking for?",
          hi: "आप कितने बीएचके का फ़्लैट देख रहे हैं?",
          hinglish: "Aap kitne BHK ka flat dekh rahe hain?",
        },
      },
      {
        role: "caller",
        step: "ask_config",
        text: { en: "A [2 BHK.]", hi: "[दो बीएचके.]", hinglish: "[2 BHK] chahiye." },
        captures: [{ field: "configuration", value: "2bhk" }],
      },
      {
        role: "agent",
        step: "ask_budget",
        text: {
          en: "And what is the most you would spend?",
          hi: "और आपका अधिकतम बजट कितना है?",
          hinglish: "Aur aapka maximum budget kitna hai?",
        },
      },
      {
        role: "caller",
        step: "ask_budget",
        text: {
          en: "Around 85 lakh, [90 at most.]",
          hi: "पचासी लाख के आसपास, [ज़्यादा से ज़्यादा नब्बे.]",
          hinglish: "Around 85 lakh, [max 90 tak] stretch kar sakte hain.",
        },
        captures: [{ field: "budget_max", value: "9000000" }],
        note: "Hindi and English in one sentence · one number stored",
        noteIn: ["hinglish"],
      },
      {
        role: "agent",
        step: "ask_move_in",
        text: {
          en: "Got it. When do you plan to move in?",
          hi: "ठीक है. आप कब तक शिफ़्ट होना चाहते हैं?",
          hinglish: "Theek hai. Aap kab tak shift hona chahte hain?",
        },
      },
      {
        role: "caller",
        step: "ask_move_in",
        text: {
          en: "[Within six months.]",
          hi: "[छह महीने के अंदर.]",
          hinglish: "[Six months ke andar.]",
        },
        captures: [{ field: "move_in", value: "within_6_months" }],
      },
      {
        role: "agent",
        step: "ask_visit",
        text: {
          en: "Would you like to visit the site this weekend?",
          hi: "क्या आप इस सप्ताहांत साइट देखने आना चाहेंगे?",
          hinglish: "Kya aap is weekend site visit karna chahenge?",
        },
      },
      {
        role: "caller",
        step: "ask_visit",
        text: {
          en: "[Yes,] Saturday works.",
          hi: "[हाँ,] शनिवार ठीक रहेगा.",
          hinglish: "[Haan,] Saturday theek rahega.",
        },
        captures: [{ field: "site_visit", value: "true" }],
      },
      {
        role: "agent",
        step: "goodbye",
        text: {
          en: "Done. An advisor will call you to fix the time. Thank you.",
          hi: "ठीक है. समय तय करने के लिए हमारे सलाहकार आपको कॉल करेंगे. धन्यवाद.",
          hinglish: "Done. Time fix karne ke liye hamare advisor aapko call karenge. Thank you.",
        },
      },
    ],
  },
  {
    id: "support",
    tab: "Refund triage",
    title: "Refund request",
    caller: "Customer",
    outcome: "completed",
    steps: [
      { id: "greeting", kind: "start", label: "Greeting" },
      { id: "ask_order", kind: "ask", label: "Order" },
      { id: "ask_issue", kind: "ask", label: "Issue" },
      { id: "ask_resolution", kind: "ask", label: "Resolution" },
      { id: "goodbye", kind: "end", label: "Goodbye" },
    ],
    fields: [
      { name: "order_id", type: "string", step: "ask_order" },
      { name: "issue", type: "enum", step: "ask_issue" },
      { name: "resolution", type: "enum", step: "ask_resolution" },
    ],
    lines: [
      {
        role: "agent",
        step: "greeting",
        text: {
          en: "Hello Priya, this is the automated assistant from Kirana Cart support, about your refund request.",
          hi: "नमस्ते प्रिया जी, मैं किराना कार्ट सपोर्ट की ओर से स्वचालित सहायक बोल रहा हूँ, आपके रिफ़ंड अनुरोध के बारे में.",
          hinglish:
            "Hello Priya ji, Kirana Cart support se automated assistant bol raha hoon, aapke refund request ke baare mein.",
        },
      },
      {
        role: "agent",
        step: "ask_order",
        text: {
          en: "Could you tell me the order number? It starts with K C and has",
          hi: "क्या आप ऑर्डर नंबर बता सकती हैं? यह के सी से शुरू होता है और इसमें",
          hinglish: "Kya aap order number bata sakti hain? Ye K C se shuru hota hai aur isme",
        },
        cut: true,
      },
      {
        role: "caller",
        step: "ask_order",
        text: {
          en: "Yes yes, [KC 482913.]",
          hi: "हाँ हाँ, [केसी 482913.]",
          hinglish: "Haan haan, [KC 482913.]",
        },
        note: "Caller spoke over the agent · agent stopped",
        captures: [{ field: "order_id", value: '"KC482913"' }],
      },
      {
        role: "agent",
        step: "ask_issue",
        text: {
          en: "Thank you. What went wrong with the order?",
          hi: "धन्यवाद. ऑर्डर में क्या दिक्कत हुई?",
          hinglish: "Thank you. Order mein kya dikkat hui?",
        },
      },
      {
        role: "caller",
        step: "ask_issue",
        text: {
          en: "The mixer [never arrived,] but the app says delivered.",
          hi: "मिक्सर [आया ही नहीं,] पर ऐप में डिलीवर दिखा रहा है.",
          hinglish: "Mixer [aaya hi nahi,] par app mein delivered dikha raha hai.",
        },
        captures: [{ field: "issue", value: "not_delivered" }],
      },
      {
        role: "agent",
        step: "ask_resolution",
        text: {
          en: "Sorry about that. Would you like a refund or a replacement?",
          hi: "इसके लिए खेद है. आप रिफ़ंड चाहेंगी या नया सामान?",
          hinglish: "Sorry for that. Aap refund chahengi ya replacement?",
        },
      },
      {
        role: "caller",
        step: "ask_resolution",
        text: {
          en: "[A refund,] please.",
          hi: "[रिफ़ंड] कर दीजिए.",
          hinglish: "[Refund] kar do.",
        },
        captures: [{ field: "resolution", value: "refund" }],
      },
      {
        role: "agent",
        step: "goodbye",
        text: {
          en: "Noted. Your case is with the refund team now. Thank you.",
          hi: "ठीक है. आपका मामला रिफ़ंड टीम को भेज दिया है. धन्यवाद.",
          hinglish: "Noted. Aapka case refund team ko bhej diya hai. Thank you.",
        },
      },
    ],
  },
];

// Splits a bracketed line into its words and the word ranges of its brackets.
function parse(text: string) {
  const words: string[] = [];
  const ranges: [number, number][] = [];
  for (const match of text.matchAll(/\[([^\]]+)\]|([^[\]]+)/g)) {
    const chunk = (match[1] ?? match[2] ?? "").trim();
    if (!chunk) continue;
    const parts = chunk.split(/\s+/);
    if (match[1]) ranges.push([words.length, words.length + parts.length - 1]);
    words.push(...parts);
  }
  return { text: words.join(" "), ranges };
}

const resolved = new Map<string, Scenario>();

// One call in one language, in the shape the timeline engine plays. Each
// language gets its own id, so each gets its own timeline.
export function resolve(call: Call, language: ExampleLanguage): Scenario {
  const id = `${call.id}:${language}`;
  const cached = resolved.get(id);
  if (cached) return cached;

  const beats: Beat[] = call.lines.map((line) => {
    const { text, ranges } = parse(line.text[language]);
    return {
      role: line.role,
      step: line.step,
      text,
      route: line.route,
      cut: line.cut,
      note: !line.noteIn || line.noteIn.includes(language) ? line.note : undefined,
      captures: line.captures?.map((capture, n) => ({
        ...capture,
        from: ranges[n]?.[0] ?? 0,
        to: ranges[n]?.[1] ?? 0,
      })),
    };
  });

  const scenario: Scenario = {
    id,
    title: call.title,
    caller: call.caller,
    outcome: call.outcome,
    steps: call.steps,
    fields: call.fields,
    beats,
  };
  resolved.set(id, scenario);
  return scenario;
}
