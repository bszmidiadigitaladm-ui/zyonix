import { APP_NAME } from "@/lib/config";

// Shown verbatim in the crisis-interrupt panel (see CrisisInterrupt.tsx) and
// logged into spiritual_chat_messages so the exact copy a user saw is auditable.
export const CRISIS_RESOURCES = [
  {
    label: "US: 988 Suicide & Crisis Lifeline",
    detail: "Call or text 988 — available 24/7",
  },
  {
    label: "US: Crisis Text Line",
    detail: "Text HOME to 741741",
  },
  {
    label: "International",
    detail: "findahelpline.com lists crisis lines by country",
  },
  {
    label: "Immediate danger",
    detail: "Call your local emergency number now (e.g. 911 in the US)",
  },
] as const;

export const CRISIS_REDIRECT_MESSAGE =
  "It sounds like you might be going through something really painful right now. " +
  "I'm not able to provide crisis support, but you don't have to go through this alone — " +
  "please reach out to one of the resources below right now. This app offers Bible-based " +
  "reflection and is not a substitute for professional mental health care or emergency services.";

export const CHAT_DISCLAIMER =
  `${APP_NAME}'s spiritual chat offers Bible-based reflection and prayer support. ` +
  "It is not therapy, counseling, or a substitute for professional mental health care. " +
  "If you are in crisis, contact 988 (US) or your local emergency services.";
