-- Site content stored as JSON, editable from admin
CREATE TABLE IF NOT EXISTS content (
  id TEXT PRIMARY KEY DEFAULT 'site',
  data TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Store the original/default state for hard reset
CREATE TABLE IF NOT EXISTS content_defaults (
  id TEXT PRIMARY KEY DEFAULT 'site',
  data TEXT NOT NULL
);

-- Insert default content (current site state)
INSERT INTO content_defaults (id, data) VALUES ('site', json('{
  "hero": {
    "title": "Mia Kulin",
    "subtitle": "Rock, soul, and everything in between.",
    "cta_text": "Book a Show",
    "cta_link": "#contact"
  },
  "about": {
    "heading": "About Mia",
    "paragraphs": [
      "Mia Kulinchenko is a vocalist, bassist, and performer from Oakville, Ontario. Her voice cuts through genres — raw rock power one minute, smooth soul the next — and she brings that intensity to every stage.",
      "She fronts <strong>Whitenoise</strong> (with guitarist Adam Musmar and drummer Dennis Kulinchenko) and <strong>After Dark Band</strong>, playing live across the GTA and Toronto. Currently studying at York University."
    ],
    "image": "img/mia-portrait.jpg",
    "socials": [
      {"label": "@mia.k.music", "url": "https://www.instagram.com/mia.k.music/"},
      {"label": "@whitenoisebandgta", "url": "https://www.instagram.com/whitenoisebandgta/"},
      {"label": "YouTube", "url": "https://www.youtube.com/@MiaKulinchenko"}
    ]
  },
  "music": {
    "heading": "What I Do",
    "bands": [
      {"name": "Whitenoise", "description": "Rock trio — vocals & bass, guitar (Adam Musmar), drums (Dennis Kulinchenko). Performing across the GTA since 2022.", "link": "https://www.instagram.com/whitenoisebandgta/", "link_text": "@whitenoisebandgta →"},
      {"name": "After Dark Band", "description": "Live performances at Toronto venues. Soul, rock, and everything that hits different after dark.", "link": "", "link_text": ""}
    ],
    "setlist_heading": "Songs I Cover",
    "setlist": ["Tennessee Whiskey", "Killing Me Softly", "Glory Box", "Nothing Else Matters", "+ originals"]
  },
  "live": {
    "heading": "See Me Live",
    "text": "Clips from gigs, rehearsals, and studio sessions — follow along or reach out to book.",
    "links": [
      {"icon": "IG", "label": "@mia.k.music", "url": "https://www.instagram.com/mia.k.music/"},
      {"icon": "YT", "label": "YouTube", "url": "https://www.youtube.com/@MiaKulinchenko"}
    ],
    "videos": []
  },
  "booking": {
    "heading": "Book Mia",
    "subtitle": "Available for live events, studio work, and collaborations across Ontario.",
    "services": [
      "Live performances — solo or with band",
      "Weddings & private events",
      "Corporate functions",
      "Studio sessions & vocal features",
      "Songwriting collaborations"
    ],
    "cta_text": "Get in Touch",
    "cta_link": "#contact"
  },
  "contact": {
    "heading": "Say Hi",
    "subtitle": "Bookings, collabs, or just to connect."
  },
  "theme": {
    "accent": "#b07ce8",
    "bg": "#0e0e18",
    "surface": "#17172a",
    "text": "#e8e8f0",
    "muted": "#8a8aa0"
  },
  "meta": {
    "title": "Mia Kulin | Singer & Vocalist | Ontario",
    "description": "Mia Kulin — singer, vocalist, and performer available for bookings, events, and collaborations in Ontario, Canada."
  }
}'));

-- Copy defaults as the initial live content
INSERT INTO content (id, data) SELECT id, data FROM content_defaults;
