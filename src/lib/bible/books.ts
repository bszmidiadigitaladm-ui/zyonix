// Canonical book list — mirrors `bible_books` (seeded in supabase/seed.sql).
// `englishName` is the exact slug bible-api.com expects (space-separated,
// URL-encoded with `+`); `rvaFilename` is the exact filename (without .json)
// in the aruljohn/Reina-Valera public-domain GitHub repo, both verified
// against the live sources before writing this file.
export interface BibleBookMeta {
  code: string;
  testament: "ot" | "nt";
  chapterCount: number;
  englishName: string;
  rvaFilename: string;
}

export const BIBLE_BOOKS: BibleBookMeta[] = [
  { code: "gen", testament: "ot", chapterCount: 50, englishName: "Genesis", rvaFilename: "Génesis" },
  { code: "exo", testament: "ot", chapterCount: 40, englishName: "Exodus", rvaFilename: "Éxodo" },
  { code: "lev", testament: "ot", chapterCount: 27, englishName: "Leviticus", rvaFilename: "Levítico" },
  { code: "num", testament: "ot", chapterCount: 36, englishName: "Numbers", rvaFilename: "Números" },
  { code: "deu", testament: "ot", chapterCount: 34, englishName: "Deuteronomy", rvaFilename: "Deuteronomio" },
  { code: "jos", testament: "ot", chapterCount: 24, englishName: "Joshua", rvaFilename: "Josué" },
  { code: "jdg", testament: "ot", chapterCount: 21, englishName: "Judges", rvaFilename: "Jueces" },
  { code: "rut", testament: "ot", chapterCount: 4, englishName: "Ruth", rvaFilename: "Rut" },
  { code: "1sa", testament: "ot", chapterCount: 31, englishName: "1 Samuel", rvaFilename: "1 Samuel" },
  { code: "2sa", testament: "ot", chapterCount: 24, englishName: "2 Samuel", rvaFilename: "2 Samuel" },
  { code: "1ki", testament: "ot", chapterCount: 22, englishName: "1 Kings", rvaFilename: "1 Reyes" },
  { code: "2ki", testament: "ot", chapterCount: 25, englishName: "2 Kings", rvaFilename: "2 Reyes" },
  { code: "1ch", testament: "ot", chapterCount: 29, englishName: "1 Chronicles", rvaFilename: "1 Crónicas" },
  { code: "2ch", testament: "ot", chapterCount: 36, englishName: "2 Chronicles", rvaFilename: "2 Crónicas" },
  { code: "ezr", testament: "ot", chapterCount: 10, englishName: "Ezra", rvaFilename: "Ésdras" },
  { code: "neh", testament: "ot", chapterCount: 13, englishName: "Nehemiah", rvaFilename: "Nehemías" },
  { code: "est", testament: "ot", chapterCount: 10, englishName: "Esther", rvaFilename: "Ester" },
  { code: "job", testament: "ot", chapterCount: 42, englishName: "Job", rvaFilename: "Job" },
  { code: "psa", testament: "ot", chapterCount: 150, englishName: "Psalms", rvaFilename: "Salmos" },
  { code: "pro", testament: "ot", chapterCount: 31, englishName: "Proverbs", rvaFilename: "Proverbios" },
  { code: "ecc", testament: "ot", chapterCount: 12, englishName: "Ecclesiastes", rvaFilename: "Eclesiástes" },
  { code: "sng", testament: "ot", chapterCount: 8, englishName: "Song of Solomon", rvaFilename: "Cantares" },
  { code: "isa", testament: "ot", chapterCount: 66, englishName: "Isaiah", rvaFilename: "Isaías" },
  { code: "jer", testament: "ot", chapterCount: 52, englishName: "Jeremiah", rvaFilename: "Jeremías" },
  { code: "lam", testament: "ot", chapterCount: 5, englishName: "Lamentations", rvaFilename: "Lamentaciones" },
  { code: "eze", testament: "ot", chapterCount: 48, englishName: "Ezekiel", rvaFilename: "Ezequiel" },
  { code: "dan", testament: "ot", chapterCount: 12, englishName: "Daniel", rvaFilename: "Daniel" },
  { code: "hos", testament: "ot", chapterCount: 14, englishName: "Hosea", rvaFilename: "Oséas" },
  { code: "joe", testament: "ot", chapterCount: 3, englishName: "Joel", rvaFilename: "Joel" },
  { code: "amo", testament: "ot", chapterCount: 9, englishName: "Amos", rvaFilename: "Amós" },
  { code: "oba", testament: "ot", chapterCount: 1, englishName: "Obadiah", rvaFilename: "Abdías" },
  { code: "jon", testament: "ot", chapterCount: 4, englishName: "Jonah", rvaFilename: "Jonás" },
  { code: "mic", testament: "ot", chapterCount: 7, englishName: "Micah", rvaFilename: "Miquéas" },
  { code: "nah", testament: "ot", chapterCount: 3, englishName: "Nahum", rvaFilename: "Nahum" },
  { code: "hab", testament: "ot", chapterCount: 3, englishName: "Habakkuk", rvaFilename: "Habacuc" },
  { code: "zep", testament: "ot", chapterCount: 3, englishName: "Zephaniah", rvaFilename: "Sofonías" },
  { code: "hag", testament: "ot", chapterCount: 2, englishName: "Haggai", rvaFilename: "Aggeo" },
  { code: "zec", testament: "ot", chapterCount: 14, englishName: "Zechariah", rvaFilename: "Zacarías" },
  { code: "mal", testament: "ot", chapterCount: 4, englishName: "Malachi", rvaFilename: "Malaquías" },
  { code: "mat", testament: "nt", chapterCount: 28, englishName: "Matthew", rvaFilename: "San Mateo" },
  { code: "mrk", testament: "nt", chapterCount: 16, englishName: "Mark", rvaFilename: "San Márcos" },
  { code: "luk", testament: "nt", chapterCount: 24, englishName: "Luke", rvaFilename: "San Lúcas" },
  { code: "jhn", testament: "nt", chapterCount: 21, englishName: "John", rvaFilename: "San Juan" },
  { code: "act", testament: "nt", chapterCount: 28, englishName: "Acts", rvaFilename: "Los Actos" },
  { code: "rom", testament: "nt", chapterCount: 16, englishName: "Romans", rvaFilename: "Romanos" },
  { code: "1co", testament: "nt", chapterCount: 16, englishName: "1 Corinthians", rvaFilename: "1 Corintios" },
  { code: "2co", testament: "nt", chapterCount: 13, englishName: "2 Corinthians", rvaFilename: "2 Corintios" },
  { code: "gal", testament: "nt", chapterCount: 6, englishName: "Galatians", rvaFilename: "Gálatas" },
  { code: "eph", testament: "nt", chapterCount: 6, englishName: "Ephesians", rvaFilename: "Efesios" },
  { code: "php", testament: "nt", chapterCount: 4, englishName: "Philippians", rvaFilename: "Filipenses" },
  { code: "col", testament: "nt", chapterCount: 4, englishName: "Colossians", rvaFilename: "Colosenses" },
  { code: "1th", testament: "nt", chapterCount: 5, englishName: "1 Thessalonians", rvaFilename: "1 Tesalonicenses" },
  { code: "2th", testament: "nt", chapterCount: 3, englishName: "2 Thessalonians", rvaFilename: "2 Tesalonicenses" },
  { code: "1ti", testament: "nt", chapterCount: 6, englishName: "1 Timothy", rvaFilename: "1 Timoteo" },
  { code: "2ti", testament: "nt", chapterCount: 4, englishName: "2 Timothy", rvaFilename: "2 Timoteo" },
  { code: "tit", testament: "nt", chapterCount: 3, englishName: "Titus", rvaFilename: "Tito" },
  { code: "phm", testament: "nt", chapterCount: 1, englishName: "Philemon", rvaFilename: "Filemón" },
  { code: "heb", testament: "nt", chapterCount: 13, englishName: "Hebrews", rvaFilename: "Hebreos" },
  { code: "jas", testament: "nt", chapterCount: 5, englishName: "James", rvaFilename: "Santiago" },
  { code: "1pe", testament: "nt", chapterCount: 5, englishName: "1 Peter", rvaFilename: "1 San Pedro" },
  { code: "2pe", testament: "nt", chapterCount: 3, englishName: "2 Peter", rvaFilename: "2 San Pedro" },
  { code: "1jn", testament: "nt", chapterCount: 5, englishName: "1 John", rvaFilename: "1 San Juan" },
  { code: "2jn", testament: "nt", chapterCount: 1, englishName: "2 John", rvaFilename: "2 San Juan" },
  { code: "3jn", testament: "nt", chapterCount: 1, englishName: "3 John", rvaFilename: "3 San Juan" },
  { code: "jud", testament: "nt", chapterCount: 1, englishName: "Jude", rvaFilename: "San Júdas" },
  { code: "rev", testament: "nt", chapterCount: 22, englishName: "Revelation", rvaFilename: "Revelación" },
];

export function getBookMeta(code: string): BibleBookMeta | undefined {
  return BIBLE_BOOKS.find((b) => b.code === code);
}
