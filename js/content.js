// ─────────────────────────────────────────────────────────────
//  Hotspot content: edit the text here.
//
//  h      = height on the stele, 0 (bottom) to 1 (top)
//  angle  = where around the stele, in degrees:
//           0 = front (relief side), 90 = right side,
//           180 = back, -90 = left side
//  quote  = optional; delete the whole quote line to hide it
//
//  Law quotations: L. W. King's 1915 English translation (public domain).
// ─────────────────────────────────────────────────────────────
export const TITLE = 'The Code of Hammurabi';

export const HOTSPOTS = [
  {
    title: 'The king and the sun god',
    h: 0.93, angle: 0,
    body: 'At the top, King Hammurabi stands before Shamash, the Babylonian god of the sun and of justice. Shamash sits on a throne with flames rising from his shoulders, and he hands the king symbols of royal power.',
    think: 'Why might a king put a picture of a god at the top of his laws?',
  },
  {
    title: 'Why Hammurabi made the laws',
    h: 0.57, angle: -22,
    body: 'The writing begins with a prologue of about 300 lines. Hammurabi lists his achievements and says the gods chose him to bring justice to the land.',
    quote: { text: '…to bring about the rule of righteousness in the land, to destroy the wicked and the evil-doers; so that the strong should not harm the weak…', source: 'Prologue' },
    think: 'Who were "the strong" and "the weak" in Babylon? Who are they today?',
  },
  {
    title: 'Laws about water and farming',
    h: 0.38, angle: 20,
    body: 'Babylon depended on farming, and farming depended on canals and dams that carried river water to the fields. Many laws deal with fields, crops, water and debts. One law even let a farmer skip a year of debt payments if a storm or drought ruined the harvest (Law 48).',
    quote: { text: 'If any one be too lazy to keep his dam in proper condition… and all the fields be flooded, then shall he… be sold for money, and the money shall replace the corn which he has caused to be ruined.', source: 'Law 53' },
    think: 'How does geography shape the laws a society needs?',
  },
  {
    title: 'The missing laws',
    h: 0.12, angle: 0,
    body: 'Near the bottom of this side, seven bands of writing were polished away in ancient times. Almost 600 years after Hammurabi, the Elamite king Shutruk-Nahhunte carried the stele to the city of Susa as war loot. Many historians think he had the laws erased so he could carve his own message. Scholars have filled in some of the missing laws from copies found on clay tablets.',
    think: 'Why would a conqueror want to take another kingdom\'s monument?',
  },
  {
    title: 'An eye for an eye, but not for everyone',
    h: 0.6, angle: 180,
    body: 'Punishments often matched the harm done. But the penalty also depended on who was hurt: a high-ranking free man, a commoner (called a "freed man" in this old translation), or an enslaved person.',
    quote: { text: 'If a man put out the eye of another man, his eye shall be put out. … If he put out the eye of a freed man… he shall pay one gold mina. If he put out the eye of a man\'s slave… he shall pay one-half of its value.', source: 'Laws 196, 198, 199' },
    think: 'Were these laws equal for everyone? Is "equal" the same as "fair"?',
  },
  {
    title: 'Building codes, 3,700 years ago',
    h: 0.38, angle: 205,
    body: 'Some laws protected people from bad workmanship. Builders, doctors and boat-makers could be punished if their work hurt someone.',
    quote: { text: 'If a builder build a house for some one, and does not construct it properly, and the house which he built fall in and kill its owner, then that builder shall be put to death.', source: 'Law 229' },
    think: 'Who protects people from badly built homes today? How is that different?',
  },
  {
    title: 'Come and read the laws',
    h: 0.14, angle: 160,
    body: 'The writing ends with an epilogue of about 500 lines. Hammurabi invites anyone who has been wronged to stand before the stele and learn their rights. He also curses any future king who changes or destroys his words.',
    quote: { text: 'Let the oppressed, who has a case at law, come and stand before this my image as king of righteousness; let him read the inscription…', source: 'Epilogue' },
    think: 'Most people in Babylon could not read. Who do you think actually read the stele?',
  },
  {
    title: 'About this stone',
    h: 0.86, angle: 95,
    body: 'The real stele is carved from black basalt, about 2.25 meters (7½ feet) tall, and was made around 1750 BC. It holds about 4,130 lines of cuneiform writing in the Akkadian language, including 282 laws. French archaeologists found it in pieces at Susa, Iran, in 1901–1902. Today it is in the Louvre museum in Paris.',
    note: 'This is a stand-in model. Its picture and writing are decorative, not copied from the real stele.',
    think: 'Stand right next to it. How tall is it compared to you?',
  },
];

export const QUOTE_CREDIT = 'trans. L. W. King, 1915';
