// ✏️ EDIT HERE: names, texts, daily questions, quotes. No coding needed.
const CONFIG = {
  appName: "Saathi",
  tagline: "Tera AI dost 🤗",
  greeting: "Heyyy! 🥳 Main Saathi hoon, tumhara AI dost! 😊 Kuch bhi poocho: kaam, padhai, motivation, ya dil ki baat. Aaj kaisa feel ho raha hai? 🌈",
  milestones: [1, 3, 7, 14, 21, 30, 60, 90, 180, 365],
  quotes: [
    "Tum apni aadaton se bade ho! 💪 Aaj ek faisla apni marzi se karo.",
    "Urge ek lehar hai 🌊 aati hai, charhti hai, utar jaati hai.",
    "Khudi ka matlab: main khud ka malik hoon! 👑",
    "Aaj ka sabr, kal ki izzat banta hai ✨",
    "Girna failure nahi, na uthna failure hai 🌱",
    "Chhote qadam, roz roz 🐢➡️🚀",
    "Jo waqt bachta hai use apni pehchan banane mein lagao 🌟"
  ],
  quick: [
    { label: "💪 Motivation do", q: "Mujhe abhi motivation chahiye!" },
    { label: "📅 Aaj ka plan", q: "Mere pending kaam dekh kar aaj ka plan banao." },
    { label: "🧭 Meri pehchan", q: "Mujhe apni pehchan (khudi) samajhne mein madad karo." },
    { label: "🌙 Raat ka plan", q: "Raat ko akela hone par urge aati hai. Mujhe ek plan banao." },
    { label: "😄 Mazedaar baat", q: "Mujhe ek mazedaar baat ya challenge do!" }
  ],
  urgeSteps: [
    "📱 Phone/laptop chhodo aur kamra badlo.",
    "🚿 Wudu karo ya thanda paani peeo.",
    "🏃 20 push-ups ya 5 minute tez chalna.",
    "🌊 Urge 10–15 minute mein utar jaati hai. Bas intezar karo!"
  ],
  // Daily question: one area per day, rotating in this order
  areas: [
    { name: "Nafs par control", emoji: "💪", q: "Aaj porn/masturbation se bachne mein tum khud ko kitne number doge?" },
    { name: "Kaam / Padhai", emoji: "📚", q: "Aaj apne kaam ya padhai mein tum khud ko kitne number doge?" },
    { name: "Khud ki pehchan", emoji: "🧭", q: "Aaj tum apni khudi (khud ki pehchan) mein kitne number ke haqdar ho?" },
    { name: "Nafs par control", emoji: "💪", q: "Pichle 24 ghante mein apni aadat par control kitna raha? Number do!" },
    { name: "Sehat", emoji: "🏃", q: "Aaj neend, khana aur exercise mein tum khud ko kitne number doge?" },
    { name: "Mood", emoji: "😊", q: "Aaj tumhara mood aur andar ka sukoon kitne number ka hai?" },
    { name: "Nafs par control", emoji: "💪", q: "Aaj ke din tum apni khwahishon ke malik rahe? Khud ko number do!" },
    { name: "Sukoon / Ibadat", emoji: "🤲", q: "Aaj dil ke sukoon aur ibadat/dua mein tum khud ko kitne number doge?" },
    { name: "Waqt ka istemal", emoji: "⏰", q: "Aaj waqt sahi jagah lagane mein tum khud ko kitne number doge?" }
  ]
};
