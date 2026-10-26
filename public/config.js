// EDIT HERE: names, texts, daily questions, quotes. No coding needed.
// Emojis are used only inside the chat (greeting + AI replies).
const CONFIG = {
  appName: "Saathi",
  tagline: "Your AI friend",
  greeting: "Hey! I'm Saathi, your AI friend 😊 I'm here to help you understand yourself (khudi) and keep your motivation strong. Tell me what's on your mind. How are you feeling today? 🌈",
  milestones: [1, 3, 7, 14, 21, 30, 60, 90, 180, 365],
  // Namaz list (in order of the day). core:true = counted in "x of 5" and the streak. Set core:true on Witr too if you want it counted.
  prayers: [
    { n: "Tahajjud", core: false },
    { n: "Fajr",     core: true  },
    { n: "Ishraq",   core: false },
    { n: "Chasht",   core: false },
    { n: "Zuhr",     core: true  },
    { n: "Asr",      core: true  },
    { n: "Maghrib",  core: true  },
    { n: "Isha",     core: true  },
    { n: "Witr",     core: false }
  ],
  quotes: [
    "You are bigger than your habits. Make one decision today on your own terms.",
    "An urge is a wave. It rises, peaks and fades away.",
    "Khudi means: I am the master of myself.",
    "Today's patience becomes tomorrow's self-respect.",
    "Falling is not failure. Not getting up is.",
    "Small steps, every single day.",
    "Spend your spare time building who you are."
  ],
  urgeSteps: [
    "Put the phone/laptop down and change rooms.",
    "Make wudu or drink cold water.",
    "Do 20 push-ups or walk fast for 5 minutes.",
    "Make dua or dhikr, or message someone close to you.",
    "The urge fades in 10-15 minutes. Just wait it out."
  ],
  // Daily question: one area per day, rotating in this order
  areas: [
    { name: "Self-control", q: "How many points would you give yourself today for staying away from porn and masturbation?" },
    { name: "Work / Study", q: "How many points would you give yourself today for your work or studies?" },
    { name: "Self-identity", q: "How would you rate yourself today on knowing and staying true to yourself (khudi)?" },
    { name: "Self-control", q: "How much control did you have over your habit in the last 24 hours? Give a number." },
    { name: "Health", q: "How would you rate your sleep, food and exercise today?" },
    { name: "Mood", q: "How would you rate your mood and inner peace today?" },
    { name: "Self-control", q: "Were you the master of your desires today? Give yourself a number." },
    { name: "Peace / Worship", q: "How would you rate your inner peace and prayer / worship today?" },
    { name: "Time use", q: "How well did you use your time today?" }
  ]
};
