import { color } from "@oxumi/ui/design/tokens";
import type { Localized } from "../language";
import type { ArtKey } from "./illustrations";

// Everything the site says about use cases, in one place: the four main ones
// (each with its own page) and eight more that live in the picker. All
// conversations, values and step names are illustrative examples.

export type Slug = "clinics" | "fleets" | "real-estate" | "support";
export type StepKind = "say" | "ask" | "branch" | "end";

export interface UseCase {
  slug: Slug;
  art: ArtKey;
  tone: string;
  // Card copy
  sector: string;
  call: string;
  line: string; // one line for the home card
  chips: [string, string, string];
  pitch: string; // two sentences for the /use-cases card
  // Detail page
  promise: string;
  intro: string;
  problem: { title: string; points: [title: string, body: string][] };
  callTitle: string;
  // The example call, in each language a visitor can pick.
  turns: [who: "agent" | "caller", text: Localized][];
  resultTitle: string;
  fields: [field: string, example: string][];
  setupTitle: string;
  steps: [kind: StepKind, name: string, text: string][];
  watchTitle: string;
  watch: [title: string, body: string][];
}

export const USE_CASES: UseCase[] = [
  {
    slug: "clinics",
    art: "clinics",
    tone: color.pink,
    sector: "Clinics",
    call: "OPD appointment confirmation",
    line: "Confirm tomorrow's OPD list tonight.",
    chips: ["Confirm or reschedule", "New slot", "Reason"],
    pitch: "Tomorrow's list, called tonight. You see who is coming, who moved, and why.",
    promise: "Tomorrow's OPD list, confirmed tonight.",
    intro:
      "An agent calls every booked patient, confirms, reschedules or cancels, and hands the front desk a clean list before the first appointment.",
    problem: {
      title: "The list is long. The front desk is one person.",
      points: [
        ["Calls that never get made", "Reminder calls lose to the queue at the counter. The no-show is discovered when the slot is already gone."],
        ["Answers on paper", "A reschedule lands on a sticky note or in someone's memory, not in the schedule."],
        ["No reason on record", "Nobody writes down why patients cancel, so the pattern stays invisible."],
      ],
    },
    callTitle: "A patient who cannot come tomorrow.",
    turns: [
      ["agent", { en: "Hello, I'm calling from the clinic. You have an OPD appointment tomorrow at 10:30 am. Will you be able to come?", hi: "नमस्ते, मैं क्लिनिक की तरफ़ से बोल रही हूँ। कल सुबह 10:30 बजे आपका ओपीडी अपॉइंटमेंट है। क्या आप आ पाएँगे?", hinglish: "Namaste, main clinic ki taraf se bol rahi hoon. Kal subah 10:30 baje aapka OPD appointment hai. Aap aa payenge?" }],
      ["caller", { en: "Not tomorrow, I'm out of town.", hi: "कल तो नहीं हो पाएगा, मैं शहर से बाहर हूँ।", hinglish: "Kal toh nahi ho payega, main out of town hoon." }],
      ["agent", { en: "No problem. Shall I move the appointment or cancel it?", hi: "कोई बात नहीं। अपॉइंटमेंट आगे बढ़ा दूँ या रद्द कर दूँ?", hinglish: "Koi baat nahi. Appointment reschedule kar doon ya cancel?" }],
      ["caller", { en: "Move it to Thursday evening, after 5.", hi: "गुरुवार शाम को रख दीजिए, 5 बजे के बाद।", hinglish: "Thursday evening rakh dijiye, 5 ke baad." }],
      ["agent", { en: "Does Thursday at 5:30 work?", hi: "गुरुवार, शाम 5:30 बजे ठीक रहेगा?", hinglish: "Thursday, 5:30 baje theek rahega?" }],
      ["caller", { en: "Yes, that's fine.", hi: "हाँ, ठीक है।", hinglish: "Haan, theek hai." }],
    ],
    resultTitle: "Three fields per patient.",
    fields: [
      ["Confirm, reschedule or cancel", "Reschedule"],
      ["Preferred new slot", "Thu, 5:30 pm"],
      ["Reason", "Out of town"],
    ],
    setupTitle: "Six steps on the canvas.",
    steps: [
      ["say", "greeting", "Says who is calling and which appointment it is about."],
      ["ask", "decision", "Confirm, reschedule or cancel. Only those three are accepted."],
      ["branch", "what next", "Reschedule goes to the slot question. Cancel goes to the reason."],
      ["ask", "new_slot", "A day and a time. A vague answer is asked again."],
      ["ask", "reason", "Optional, kept in the patient's own words."],
      ["end", "wrap_up", "Reads the outcome back and closes the call."],
    ],
    watchTitle: "Keep it to the appointment.",
    watch: [
      ["No medical advice", "The flow asks about the booking and nothing else. Add a step that hands any clinical question to your staff, and say so in the agent's persona."],
      ["Call only patients who agreed", "Consent and do-not-disturb rules are yours to meet. This build does not check them for you."],
      ["Valid is not the same as available", "A valid slot is a real day and time. Whether the doctor is free then is your schedule's call."],
    ],
  },
  {
    slug: "fleets",
    art: "fleets",
    tone: color.accentText,
    sector: "Fleets",
    call: "Driver status check",
    line: "Ask every driver where they are.",
    chips: ["Location", "On time or late", "Revised ETA"],
    pitch: "One call per truck, no dispatcher on the line. Location, delay and the new ETA come back as fields.",
    promise: "Know where every truck is without phoning the driver.",
    intro:
      "An agent rings each driver on a trip, asks where they are and when they will arrive, and gives dispatch one table instead of a morning of phone calls.",
    problem: {
      title: "Dispatch spends the day asking one question.",
      points: [
        ["One answer per call", "Each status check is ringing, waiting and small talk, all for a single line in a sheet."],
        ["Delays surface late", "A tyre change at noon reaches the customer in the evening, when the truck was already due."],
        ["Every driver reports differently", "\"Almost there\" is not an ETA."],
      ],
    },
    callTitle: "A driver running late.",
    turns: [
      ["agent", { en: "Hello, this is dispatch. Where have you reached?", hi: "नमस्ते भैया, डिस्पैच से बोल रहा हूँ। अभी कहाँ तक पहुँचे?", hinglish: "Bhaiya, namaste. Dispatch se bol raha hoon. Abhi kahan tak pahunche?" }],
      ["caller", { en: "I'm near the Vadodara toll.", hi: "वडोदरा टोल के पास हूँ।", hinglish: "Vadodara toll ke paas hoon." }],
      ["agent", { en: "Okay. Will you arrive on time, or are you running late?", hi: "ठीक है। समय पर पहुँच जाएँगे या देर होगी?", hinglish: "Theek hai. Time pe pahunch jaoge ya late hoga?" }],
      ["caller", { en: "Late. I had to change a tyre.", hi: "देर होगी, टायर बदलना पड़ा।", hinglish: "Late hoga, tyre badalna pada." }],
      ["agent", { en: "No problem. What time will you reach now?", hi: "कोई बात नहीं। अब कितने बजे तक पहुँचेंगे?", hinglish: "Koi baat nahi. Ab kitne baje tak pahunchoge?" }],
      ["caller", { en: "By 9:40 tonight.", hi: "रात 9:40 तक।", hinglish: "Raat ko 9:40 tak." }],
    ],
    resultTitle: "Four fields per trip.",
    fields: [
      ["Current location", "Near Vadodara toll"],
      ["On time or delayed", "Delayed"],
      ["Revised ETA", "9:40 pm"],
      ["Issues", "Tyre change"],
    ],
    setupTitle: "A short flow, by design.",
    steps: [
      ["say", "greeting", "Says it is dispatch calling, in the driver's language."],
      ["ask", "location", "Where the truck is now, as the driver describes it."],
      ["ask", "status", "On time or delayed. One of the two is required."],
      ["branch", "if delayed", "Only a delayed trip gets the next two questions."],
      ["ask", "revised_eta", "A clock time. \"In a while\" is asked again."],
      ["ask", "issues", "What went wrong, in the driver's words."],
    ],
    watchTitle: "The driver is on the road.",
    watch: [
      ["Keep it brief", "Three or four questions, and let the driver say \"call later\". No status update is worth a distraction at the wheel."],
      ["Location is what the driver says", "It is a spoken answer, not GPS. Use it beside your tracking, not instead of it."],
      ["Highway noise", "Loud lines are harder to transcribe. Read the transcripts of your first calls before you rely on the fields."],
    ],
  },
  {
    slug: "real-estate",
    art: "real-estate",
    tone: color.violet,
    sector: "Real estate",
    call: "Lead qualification",
    line: "Qualify each enquiry before sales calls.",
    chips: ["Budget", "Locality", "Site-visit slot"],
    pitch: "Every enquiry gets the same four questions. Sales opens the list knowing who is ready to visit.",
    promise: "Every enquiry called back, with the same four questions.",
    intro:
      "An agent calls each new lead, asks budget, locality and timeline, offers a site visit, and gives sales the answers before they pick up the phone.",
    problem: {
      title: "Leads arrive faster than anyone can call them.",
      points: [
        ["The enquiry goes cold", "Leads come in at night and on weekends. By the time someone calls, the buyer has moved on."],
        ["Every caller asks differently", "One executive opens with budget, another never asks about timeline. The sheet has gaps."],
        ["Site visits booked on hope", "Without the basics, a Saturday goes to visitors who were never going to buy."],
      ],
    },
    callTitle: "A buyer who is ready to visit.",
    turns: [
      ["agent", { en: "Hi, you enquired about a 2 BHK in Baner. Is this a good time for a few quick questions?", hi: "नमस्ते, आपने बाणेर में 2 BHK के बारे में पूछा था। क्या अभी दो मिनट बात हो सकती है?", hinglish: "Hi, aapne Baner mein 2 BHK ke liye enquiry ki thi. Abhi do minute baat ho sakti hai?" }],
      ["caller", { en: "Yes, go ahead.", hi: "हाँ, बोलिए।", hinglish: "Haan, boliye." }],
      ["agent", { en: "What budget should I note for you?", hi: "आपका बजट कितना लिखूँ?", hinglish: "Aapka budget kitna note karoon?" }],
      ["caller", { en: "Around 90 lakh. A little more is fine.", hi: "करीब 90 लाख। थोड़ा ऊपर भी चलेगा।", hinglish: "Around 90 lakh. Thoda upar bhi chalega." }],
      ["agent", { en: "Got it. Only Baner, or nearby areas as well?", hi: "ठीक है। सिर्फ़ बाणेर चाहिए, या आस-पास के इलाक़े भी देखेंगे?", hinglish: "Got it. Baner hi chahiye, ya aas-paas ke areas bhi dekhenge?" }],
      ["caller", { en: "Wakad works too. I need possession within three months.", hi: "वाकड भी चलेगा। पज़ेशन तीन महीने में चाहिए।", hinglish: "Wakad bhi chalega. Possession teen mahine mein chahiye." }],
      ["agent", { en: "Understood. Would Saturday at 11 work for a site visit?", hi: "समझ गया। साइट विज़िट के लिए शनिवार 11 बजे ठीक रहेगा?", hinglish: "Theek hai. Site visit ke liye Saturday 11 baje chalega?" }],
      ["caller", { en: "Saturday at 11 is fine.", hi: "शनिवार 11 बजे ठीक है।", hinglish: "Saturday 11 baje theek hai." }],
    ],
    resultTitle: "Four fields per lead.",
    fields: [
      ["Budget", "₹80 to 95 lakh"],
      ["Locality", "Baner or Wakad"],
      ["Timeline", "Within 3 months"],
      ["Site-visit slot", "Sat, 11:00 am"],
    ],
    setupTitle: "Four questions, always in order.",
    steps: [
      ["say", "greeting", "Names the enquiry and asks if now is a good time."],
      ["ask", "budget", "A range in rupees. \"Depends\" is asked again."],
      ["ask", "locality", "One or more areas, as the buyer names them."],
      ["ask", "timeline", "When they want possession."],
      ["ask", "visit_slot", "A day and a time for the site visit."],
      ["end", "wrap_up", "Confirms the slot and closes."],
    ],
    watchTitle: "It qualifies. It does not sell.",
    watch: [
      ["No prices, no promises", "Keep quotes, availability and negotiation out of the flow and out of the persona. Those stay with your team."],
      ["Only call people who enquired", "Outbound calls need consent, and do-not-disturb rules apply to promotional calls. Meeting them is your responsibility."],
      ["A budget is a claim", "The field records what the buyer said. It is checked as a number, not verified."],
    ],
  },
  {
    slug: "support",
    art: "support",
    tone: color.info,
    sector: "Support desks",
    call: "First-line triage",
    line: "Triage the complaint before a human does.",
    chips: ["Issue category", "Urgency", "Callback consent"],
    pitch: "The first questions never change, so the agent asks them. Your team starts each case with the facts.",
    promise: "The first questions of every ticket, already asked.",
    intro:
      "An agent calls the customer back, finds out what went wrong, how urgent it is and whether they want a callback. Your team starts with the facts.",
    problem: {
      title: "Your best people spend the day asking for order numbers.",
      points: [
        ["The same opening, every time", "What happened, which order, how urgent. A person asks it and types it, call after call."],
        ["Tickets with holes", "Fields stay blank because the customer was upset and the agent was rushing."],
        ["Urgent looks like everything else", "A damaged delivery and a billing question sit in one queue until someone reads them."],
      ],
    },
    callTitle: "A damaged delivery.",
    turns: [
      ["agent", { en: "Hello, you raised a complaint yesterday. What went wrong?", hi: "नमस्ते, आपने कल एक शिकायत दर्ज की थी। क्या दिक्कत आ रही है?", hinglish: "Namaste, aapne kal ek complaint raise ki thi. Kya dikkat aa rahi hai?" }],
      ["caller", { en: "The mixer jar arrived broken.", hi: "मिक्सर का जार टूटा हुआ आया है।", hinglish: "Mixer ka jar toota hua aaya hai." }],
      ["agent", { en: "Sorry about that. Could you tell me the order number?", hi: "माफ़ कीजिए। ऑर्डर नंबर बता पाएँगे?", hinglish: "Sorry for that. Order number bata payenge?" }],
      ["caller", { en: "Yes, 48213.", hi: "हाँ, 48213।", hinglish: "Haan, 48213." }],
      ["agent", { en: "Thank you, 4-8-2-1-3. How urgent is this?", hi: "धन्यवाद, 4-8-2-1-3। यह कितना ज़रूरी है?", hinglish: "Thank you, 4-8-2-1-3. Yeh kitna urgent hai?" }],
      ["caller", { en: "Very. I have guests coming on Sunday.", hi: "बहुत। रविवार को मेहमान आ रहे हैं।", hinglish: "Bahut. Sunday ko guests aa rahe hain." }],
      ["agent", { en: "Understood. May our team call you back today?", hi: "समझ गई। क्या हमारी टीम आज आपको कॉल करे?", hinglish: "Samajh gayi. Kya hamari team aaj aapko call kare?" }],
      ["caller", { en: "Yes, after 6 pm.", hi: "हाँ, शाम 6 बजे के बाद।", hinglish: "Haan, shaam 6 ke baad." }],
    ],
    resultTitle: "Four fields per case.",
    fields: [
      ["Issue category", "Damaged item"],
      ["Order reference", "48213"],
      ["Urgency", "High"],
      ["Callback consent", "Yes, after 6 pm"],
    ],
    setupTitle: "Collect, read back, hand over.",
    steps: [
      ["say", "greeting", "Names the complaint it is calling about."],
      ["ask", "category", "Mapped to one of your own categories."],
      ["ask", "order_ref", "Read back digit by digit to confirm."],
      ["ask", "urgency", "Low, medium or high."],
      ["ask", "callback_ok", "Yes or no, and a time if yes."],
      ["end", "wrap_up", "Says a person will follow up, and closes."],
    ],
    watchTitle: "It triages. It does not resolve.",
    watch: [
      ["No refunds, no promises", "The agent collects and hands over. Say so in the persona, so it does not improvise a fix."],
      ["Some callers want a person", "Give the flow an early end step that books a human callback for anyone who asks."],
      ["Transcripts hold customer details", "Order and contact details are in the call history. Treat it like any other customer record."],
    ],
  },
];

export const useCaseBySlug = (slug: Slug): UseCase => USE_CASES.find((u) => u.slug === slug)!;

export interface Scenario {
  art: ArtKey;
  tone: string;
  label: string;
  line: string; // one line for the home card
  who: string;
  opening: Localized;
  fields: [string, string, string, string];
}

export const SCENARIOS: Scenario[] = [
  {
    art: "pharmacy",
    tone: color.success,
    label: "Pharmacy refills",
    line: "Ask before the tablets run out.",
    who: "A pharmacy calling regular customers",
    opening: { en: "Your blood-pressure tablets run out on Friday. Shall we keep a refill ready?", hi: "आपकी बीपी की दवा शुक्रवार को ख़त्म हो रही है। रीफ़िल तैयार रखें?", hinglish: "Aapki BP ki dawa Friday ko khatam ho rahi hai. Refill ready rakhein?" },
    fields: ["Refill needed", "Pickup or delivery", "Preferred time", "Prescription changed"],
  },
  {
    art: "school",
    tone: color.info,
    label: "School admissions",
    line: "Follow up every campus visit.",
    who: "A school following up on enquiries",
    opening: { en: "You visited us about Class 6 admission. Have you decided?", hi: "आप कक्षा 6 के दाख़िले के लिए आए थे। क्या आपने फ़ैसला कर लिया?", hinglish: "Aap Class 6 admission ke liye aaye the. Decide kar liya?" },
    fields: ["Still interested", "Class applying for", "Campus visit slot", "Open questions"],
  },
  {
    art: "society",
    tone: color.violet,
    label: "Society dues",
    line: "Chase maintenance, flat by flat.",
    who: "A housing society calling its flats",
    opening: { en: "This quarter's maintenance for flat B-204 is pending. When can we expect it?", hi: "फ़्लैट B-204 का इस तिमाही का मेंटेनेंस बाक़ी है। कब तक हो जाएगा?", hinglish: "Flat B-204 ka is quarter ka maintenance pending hai. Kab tak ho jayega?" },
    fields: ["Payment date", "Payment mode", "Dispute, if any", "Aware of dues"],
  },
  {
    art: "garage",
    tone: color.accentText,
    label: "Garage feedback",
    line: "Check in after every service.",
    who: "A garage calling after a service",
    opening: { en: "How is the car running since the service? Any trouble?", hi: "सर्विस के बाद गाड़ी कैसी चल रही है? कोई दिक्कत?", hinglish: "Service ke baad gaadi kaisi chal rahi hai? Koi problem?" },
    fields: ["Satisfied or not", "Issue since service", "Follow-up visit", "Okay to call again"],
  },
  {
    art: "kirana",
    tone: color.pink,
    label: "Kirana deliveries",
    line: "Confirm the slot before you pack.",
    who: "A kirana store confirming orders",
    opening: { en: "Your order is ready. Shall we deliver between 5 and 7 this evening?", hi: "आपका ऑर्डर तैयार है। शाम 5 से 7 के बीच भेज दें?", hinglish: "Aapka order ready hai. Shaam 5 se 7 ke beech bhej dein?" },
    fields: ["Slot confirmed", "Substitutions okay", "Payment mode", "Alternate slot"],
  },
  {
    art: "emi",
    tone: color.warning,
    label: "EMI reminders",
    line: "Remind before the due date.",
    who: "A lender calling before the due date",
    opening: { en: "Your EMI is due on the 5th. Will you be able to pay on time?", hi: "आपकी ईएमआई 5 तारीख़ को देय है। क्या समय पर हो जाएगी?", hinglish: "Aapki EMI 5 tareekh ko due hai. Time pe ho jayegi?" },
    fields: ["Will pay on time", "Promised date", "Reason for delay", "Aware of due date"],
  },
  {
    art: "rsvp",
    tone: color.violet,
    label: "Event RSVPs",
    line: "Know who is coming.",
    who: "A host confirming the guest list",
    opening: { en: "Are you joining us on Saturday evening? How many of you?", hi: "क्या आप शनिवार शाम के समारोह में आ रहे हैं? कितने लोग होंगे?", hinglish: "Saturday evening ke function mein aap aa rahe hain? Kitne log honge?" },
    fields: ["Attending", "Number of guests", "Meal preference", "Needs pickup"],
  },
  {
    art: "donor",
    tone: color.danger,
    label: "Donor recall",
    line: "Bring past donors back in.",
    who: "A blood bank calling past donors",
    opening: { en: "You are eligible to donate blood again. Could you come in this week?", hi: "आप फिर से रक्तदान कर सकते हैं। क्या इस हफ़्ते आ पाएँगे?", hinglish: "Aap phir se blood donate kar sakte hain. Is hafte aa payenge?" },
    fields: ["Available to donate", "Preferred day", "Recent illness", "Nearest centre"],
  },
];
