// Imported from the team's lineup Google Doc (September–December 2026).
import type { Language } from "../dates";
import type { BandSlot } from "../lineup";

export const SEED_MEMBERS: { name: string; sings?: boolean; instruments?: BandSlot[] }[] = [
  { name: "Mina", sings: true },
  { name: "Daniela", sings: true },
  { name: "Faye", sings: true },
  { name: "Cyrell", sings: true },
  { name: "Anika", sings: true },
  { name: "Fea", sings: true },
  { name: "Shaira", sings: true },
  { name: "Joanna", sings: true },
  { name: "Hazel", sings: true },
  { name: "Tita Shera", sings: true },
  { name: "Tita Joan", sings: true },
  { name: "Tita Monette", sings: true },
  { name: "Tita Shierly", sings: true },
  { name: "Papa Wel", sings: true },
  { name: "Cedie", sings: true, instruments: ["ST"] },
  { name: "Emman", sings: true },
  { name: "Joseph", sings: true },
  { name: "Ruel", sings: true },
  { name: "ML", sings: true, instruments: ["AG", "AD", "ST"] },
  { name: "Lorence", sings: true, instruments: ["AG"] },
  { name: "John Well", sings: true, instruments: ["LG", "AG"] },
  { name: "Albert", instruments: ["LG", "AG"] },
  { name: "Kim", instruments: ["LG", "AG"] },
  { name: "Jude", instruments: ["KB"] },
  { name: "Aaron", instruments: ["KB"] },
  { name: "Kevin", instruments: ["KB"] },
  { name: "Raymond", instruments: ["KB", "BG", "AG", "AD"] },
  { name: "Don", instruments: ["BG", "ST"] },
  { name: "Silver", instruments: ["BG"] },
  { name: "Andoy", instruments: ["AD", "ST"] },
  { name: "Andrey", instruments: ["AD", "ST"] },
  { name: "Russell", instruments: ["AD"] },
  { name: "France" },
];

export const SEED_MONTHS: {
  id: string;
  theme?: string;
  note?: string;
  availabilityOpen?: boolean;
}[] = [
  { id: "2026-09", note: "Quarterly Evaluation and Fellowship, 1:00 PM onwards" },
  { id: "2026-10" },
  { id: "2026-11", availabilityOpen: true },
  {
    id: "2026-12",
    availabilityOpen: true,
    note: "Quarterly Evaluation and Fellowship, 1:00 PM onwards",
  },
];

export type SeedService = {
  date: string;
  language: Language;
  status: "draft" | "published";
  palette?: string;
  songs?: string[];
  joyful?: string[];
  solemn?: string[];
  backup?: string[];
  band?: Partial<Record<BandSlot, string>>;
  devotion?: string[];
  soaking?: string[];
};

export const SEED_SERVICES: SeedService[] = [
  {
    date: "2026-09-06",
    language: "tl",
    status: "published",
    palette: "White",
    songs: ["Salamat sa Iyo", "Aking Kaluluwa (Response Song)", "My King Forever", "Maghari"],
    joyful: ["Papa Wel", "ML"],
    solemn: ["Cedie"],
    backup: ["Shaira", "Faye", "Tita Joan"],
    band: { LG: "Kim", KB: "Raymond", BG: "Don", AG: "ML", AD: "Russell" },
    devotion: ["ML", "Russell"],
    soaking: ["Tita Joan"],
  },
  {
    date: "2026-09-13",
    language: "en",
    status: "published",
    palette: "Beige, Brown",
    songs: ["Goodbye Yesterday", "Friend of God", "Through It All"],
    joyful: ["Cedie", "Faye"],
    solemn: ["Hazel"],
    backup: ["Emman", "Lorence", "Cyrell"],
    band: { LG: "John Well", KB: "Raymond", BG: "Don", AG: "Lorence", AD: "Andoy" },
    devotion: ["Cyrell", "Hazel"],
    soaking: ["Cedie"],
  },
  {
    date: "2026-09-20",
    language: "tl",
    status: "published",
    palette: "Black",
    songs: ["Tayo Na, Sama-sama", "Pagbabalik", "Nararapat"],
    joyful: ["Tita Shera", "Cyrell"],
    solemn: ["Fea"],
    backup: ["Tita Joan", "Tita Monette", "Joseph"],
    band: { LG: "Albert", KB: "Raymond", BG: "Don", AG: "John Well", AD: "ML" },
    devotion: ["Tita Joan", "Raymond"],
    soaking: ["Fea"],
  },
  {
    date: "2026-09-27",
    language: "en",
    status: "published",
    palette: "Green",
    songs: ["Brighter", "For Who You Are", "Shout to the Lord"],
    joyful: ["Mina", "Faye"],
    solemn: ["Joanna"],
    backup: ["Shaira", "ML", "Joseph"],
    band: { LG: "John Well", KB: "Raymond", BG: "Don", AG: "ML", AD: "Russell" },
    devotion: ["ML"],
    soaking: ["Joanna"],
  },
  {
    date: "2026-10-04",
    language: "tl",
    status: "published",
    palette: "White",
    songs: ["Salamat, Salamat", "Umaapaw sa Pagsamba", "'Di Ka Nagkulang"],
    joyful: ["Papa Wel", "Cedie"],
    solemn: ["Faye"],
    backup: ["Tita Joan", "Shaira", "Lorence"],
    band: { KB: "Raymond", BG: "Silver", AG: "Lorence", AD: "Andrey" },
    devotion: ["Andrey", "Shaira"],
    soaking: ["Lorence"],
  },
  {
    date: "2026-10-11",
    language: "en",
    status: "published",
    palette: "Blue",
    songs: ["This Is Amazing Grace", "Tribes", "Fall Like Rain"],
    joyful: ["Anika", "Hazel"],
    solemn: ["Faye"],
    backup: ["Fea", "Joanna", "Cyrell"],
    band: { LG: "Albert", KB: "Raymond", BG: "Don", AG: "Lorence", AD: "ML" },
    devotion: ["Hazel", "Lorence"],
    soaking: ["Anika"],
  },
  {
    date: "2026-10-18",
    language: "tl",
    status: "published",
    joyful: ["Cyrell", "Joseph"],
    solemn: ["Tita Shera"],
    backup: ["Tita Joan", "Tita Monette", "Shaira"],
  },
  {
    date: "2026-10-25",
    language: "en",
    status: "published",
    joyful: ["Joanna", "ML"],
    solemn: ["Emman"],
    backup: ["Anika", "Mina", "Lorence"],
  },
  {
    date: "2026-11-01",
    language: "tl",
    status: "draft",
    joyful: ["Cedie", "Mina"],
    solemn: ["Anika"],
    backup: ["Hazel", "Shaira"],
  },
  {
    date: "2026-11-08",
    language: "en",
    status: "draft",
    joyful: ["Daniela", "Lorence"],
    solemn: ["Hazel", "Fea"],
    backup: ["Faye", "Cyrell"],
  },
  {
    date: "2026-11-15",
    language: "tl",
    status: "draft",
    joyful: ["Joseph", "Cedie"],
    solemn: ["Tita Shera"],
    backup: ["Tita Joan", "Tita Monette"],
  },
  {
    date: "2026-11-22",
    language: "en",
    status: "draft",
    joyful: ["Faye", "Cyrell"],
    solemn: ["ML", "Emman"],
    backup: ["John Well", "Shaira"],
  },
  {
    date: "2026-11-29",
    language: "tl",
    status: "draft",
    joyful: ["Anika", "Lorence"],
    solemn: ["Daniela"],
    backup: ["Faye", "Cedie"],
  },
  {
    date: "2026-12-06",
    language: "en",
    status: "draft",
    joyful: ["Mina", "Fea"],
    solemn: ["Hazel"],
    backup: ["Lorence"],
  },
  {
    date: "2026-12-13",
    language: "tl",
    status: "draft",
    joyful: ["Joanna", "Cyrell"],
    solemn: ["Tita Monette", "Tita Shera"],
    backup: ["John Well", "ML"],
  },
  { date: "2026-12-20", language: "en", status: "draft" },
  { date: "2026-12-27", language: "tl", status: "draft" },
];
