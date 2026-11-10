/* Logan's World: everything that makes this world Logan's lives here.
   A new Kin World site starts by copying this folder and editing this file. */
window.KIN = {
  site: "Logan's World",
  storageKey: "logans-world",

  kid: {
    first: "Logan",
    full: "Logan",          // e.g. "Logan James Smith"
    birthday: "",           // "YYYY-MM-DD" turns on age labels on the timeline
    pronoun: "he"
  },

  mascot: { name: "Rex", kind: "T-Rex" },

  // Family codes, stored as SHA-256 of "logans-world:" + code.
  // guest = can read and leave messages, owner = can also delete and edit.
  codes: {
    guest: "dfbea2a2f355f9592c9e564f0777af11b031b2c2b80df7837371472041f35ada", // 1234
    owner: "73f87ad90947b4c5aa359af41be9431b9d0b0b556e526e54e7e3df1879f6654e"  // 9876
  },
  codeSalt: "logans-world:",
  showDemoCodes: true,      // turn off before handing the site to a family

  relations: ["Mom", "Dad", "Grandma", "Grandpa", "Aunt", "Uncle", "Cousin", "Brother", "Sister", "Friend", "Teacher", "Someone else"],

  about: {
    favorites: [
      { label: "Favorite dinosaur", value: "T-Rex, obviously" },
      { label: "Favorite color", value: "Lava orange" },
      { label: "Favorite food", value: "Dino nuggets" },
      { label: "Best sound", value: "A really big ROAR" },
      { label: "When I grow up", value: "Paleontologist" },
      { label: "Best friend", value: "Rex" }
    ],
    heights: [
      // { date: "2026-06-01", inches: 38 }
    ]
  },

  // Example messages so a new world never looks empty. Marked as examples in the UI.
  samples: [
    { name: "Mom", relation: "Mom", daysAgo: 400, text: "The first time you saw a dinosaur skeleton at the museum you yelled ROAR so loud the whole hall laughed. I hope you never get quieter." },
    { name: "Grandpa Joe", relation: "Grandpa", daysAgo: 210, text: "Logan, you and me dug for fossils in the sandbox all afternoon. You found three 'T-Rex teeth' (they were rocks). Best afternoon of my summer." },
    { name: "Dad", relation: "Dad", daysAgo: 60, text: "You taught me today that a T-Rex had teeth as long as a banana. You were right. I checked." },
    { name: "Aunt Maria", relation: "Aunt", daysAgo: 9, text: "Happy stomping, little dino. Save me a dance at your next birthday." }
  ]
};
