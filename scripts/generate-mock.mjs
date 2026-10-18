// Generates deterministic mock data for apps/web (run: pnpm mock:generate).
// Talent are real Assamese public figures; cover photos live in apps/web/public/talent/ and
// gallery images are generic Unsplash scenes. Bookings, quotes and payouts are invented demo data.
// Raw records intentionally include INTERNAL fields (cost, payout, margin) so that the
// serializers in apps/web/lib/api/mock are exercised and tested for leaks.
import { createHash } from 'node:crypto';
import { optimizeImages } from './optimize-images.mjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../apps/web/lib/mock/data');
mkdirSync(OUT, { recursive: true });

const IDS = `1493225457124-a3eb161ffa5f 1514525253161-7a46d19cd819 1501386761578-eac5c94b800a 1470229722913-7c0e2dbbafd3 1459749411175-04bf5292ceea 1516450360452-9312f5e86fc7 1506157786151-b8491531f063 1429962714451-bb934ecdc4ec 1511671782779-c97d3d27a1d4 1508700115892-45ecd05ae2ad 1524368535928-5b5e00ddc76b 1574391884720-bbc3740c59d1 1516873240891-4bf014598ab4 1598387993441-a364f854c3e1 1527224857830-43a7acc85260 1585699324551-f6c309eedeca 1475721027785-f74eccf877e2 1540575467063-178a50c2df87 1505373877841-8d25f7d46678 1515187029135-18ee286d815b 1531058020387-3be344556be6 1492684223066-81342ee5ff30 1533174072545-7a4b6ad7a6c3 1488161628813-04466f872be2 1500648767791-00dcc994a43e 1494790108377-be9c29b29330 1438761681033-6461ffad8d80 1507003211169-0a1dd7228f2d 1534528741775-53994a69daeb 1517841905240-472988babdf9 1539571696357-5a69c17a67c6 1506794778202-cad84cf45f1d 1544005313-94ddf0286df2 1531746020798-e6953c6e8e04 1524504388940-b1c1722653e1 1529626455594-4ff0802cfb7e 1552058544-f2b08422138a 1557862921-37829c790f19 1504593811423-6dd665756598 1508214751196-bcfd4ca60f91 1500917293891-ef795e70e1f6 1520813792240-56fc4a3765a7 1521119989659-a83eee488004 1519085360753-af0119f7cbe7 1560250097-0b93528c311a 1573496359142-b8d87734a5a2 1580489944761-15a19d654956 1487412720507-e7ab37603c6f 1502823403499-6ccfcf4fb453 1463453091185-61582044d556 1522075469751-3a6694fb2f61 1526510747491-58f928ec870f 1510915361894-db8b60106cb1 1525201548942-d8732f6617a0 1501612780327-45045538702b 1415201364774-f6f0bb35f28f 1496024840928-4c417adf211d 1540039155733-5bb30b53aa14 1478147427282-58a87a120781 1571330735066-03aaa9429d89 1504704911898-68304a7d2807 1519741497674-611481863552 1511795409834-ef04bbd61622 1530103862676-de8c9debad1d 1505236858219-8359eb29e329 1556761175-5973dc0f32e7 1611162617474-5b21e879e113 1598550476439-6847785fcea6 1590602847861-f357a9332bbc 1478737270239-2f02b77fc618 1535713875002-d1d0cf377fde 1547425260-76bcadfb4f2c 1542909168-82c3e7fdca5c 1564564321837-a57b7070ac4f 1566492031773-4f4e44671857 1570295999919-56ceb5ecca61 1508341591423-4347099e1f19 1528892952291-009c663ce843 1545996124-0501ebae84d0 1499952127939-9bbf5af6c51c 1485893086445-ed75865251e0 1514533212735-5df27d970db0 1468164016595-6108e4c60c8b 1501281668745-f7f57925c3b4 1574169208507-84376144848b 1603575448878-868a20723f5d 1619983081563-430f63602796 1621112904887-419379ce6824 1609220136736-443140cffec6 1587614382346-4ec70e388b28 1622253692010-333f2da6031d 1618077360395-f3068be8e001 1607746882042-944635dfe10e 1615109398623-88346a601842 1610216705422-caa3fcb6d158 1614289371518-722f2615943d 1600486913747-55e5470d6f40 1605462863863-10d9e47e15ee 1583864697784-a0efc8379f70 1504609813442-a8924e83f76e`.split(' ');
const id = (n) => IDS[n - 1];
const scene = (n, alt) => ({
  src: `https://images.unsplash.com/photo-${id(n)}?auto=format&fit=crop&ar=4:5`,
  alt, width: 1200, height: 1500,
});
/**
 * Freely licensed cover photo from Wikimedia Commons; `path` is the part after /wikipedia/commons/.
 * `#w=` carries the original width so the image loader never requests an upscaled thumbnail.
 */
const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '../apps/web/public');
/**
 * Cover photo served from apps/web/public/talent/<slug>.jpg. Replace a file with a licensed
 * photo and re-run this script to refresh its size and blur preview. `credit` names the source
 * (required for Creative Commons photos) and is shown on the profile.
 */
const local = (slug, credit) => {
  const file = join(PUBLIC, 'talent', `${slug}.jpg`);
  const [width, height] = spawnSync('magick', ['identify', '-format', '%w %h', file]).stdout.toString().split(' ').map(Number);
  // Content hash in the URL: a replaced photo gets a new address, so no browser or CDN shows a stale copy.
  const v = createHash('sha1').update(readFileSync(file)).digest('hex').slice(0, 8);
  return { src: `/talent/${slug}.jpg?v=${v}`, width, height, ...(credit ? { credit: `Photo: ${credit}` } : {}) };
};

const POOLS = {
  actors: [[16, 'Small theatre stage with a lone performer'], [18, 'Packed auditorium'], [4, 'Concert stage with warm lights'], [5, 'Stage lights over a crowd'], [65, 'Event crowd under lights'], [21, 'Hall with an engaged audience']],
  singers: [[1, 'Singer performing in stage haze'], [4, 'Concert stage with warm lights'], [9, 'Vintage stage microphone'], [14, 'Guitarist under blue stage lights'], [8, 'Crowd making heart shapes at a concert'], [54, 'Acoustic guitar set'], [56, 'Brass section on stage'], [70, 'Studio microphone'], [5, 'Stage lights over a crowd'], [11, 'Crowd silhouettes at a gig']],
  djs: [[13, 'DJ mixing at the decks'], [2, 'Club lights and confetti'], [12, 'Neon-lit warehouse party'], [22, 'Confetti over a crowd'], [57, 'Colour powder festival crowd'], [83, 'Vinyl record on a turntable'], [87, 'Coloured vinyl records'], [61, 'Neon installation at a party'], [3, 'Crowd cheering at a set']],
  comedians: [[16, 'Small theatre stage with a lone performer'], [17, 'Close-up of a microphone'], [3, 'Audience laughing'], [9, 'Microphone on stage'], [100, 'Crowd dancing at an event'], [88, 'Evening gathering with music'], [18, 'Packed auditorium']],
  speakers: [[19, 'Speaker presenting on a large screen'], [18, 'Conference audience'], [21, 'Hall with an engaged audience'], [20, 'Workshop discussion'], [66, 'Talk in a startup office'], [16, 'Stage set for a keynote'], [65, 'Event crowd under lights']],
  creators: [[68, 'Creator desk with dual screens'], [69, 'Podcast microphone'], [84, 'Phone filming a live show'], [70, 'Recording microphone'], [24, 'Creator posing on a terrace'], [86, 'Creator editing on a laptop'], [57, 'Festival crowd in colour']],
};

const CAT_SINGULAR = { actors: 'actor', singers: 'singer', djs: 'DJ', comedians: 'comedian', speakers: 'anchor', creators: 'creator' };
const EVENT_TYPES = {
  actors: ['BRAND_CAMPAIGN', 'PRODUCT_LAUNCH', 'AWARD_NIGHT', 'CORPORATE', 'WEDDING'],
  singers: ['CONCERT', 'WEDDING', 'CORPORATE', 'COLLEGE_FEST', 'AWARD_NIGHT'],
  djs: ['CONCERT', 'CLUB_NIGHT', 'COLLEGE_FEST', 'PRODUCT_LAUNCH', 'PRIVATE_PARTY'],
  comedians: ['CORPORATE', 'COLLEGE_FEST', 'PRIVATE_PARTY', 'AWARD_NIGHT', 'CONFERENCE'],
  speakers: ['AWARD_NIGHT', 'CORPORATE', 'CONFERENCE', 'PRODUCT_LAUNCH', 'COLLEGE_FEST'],
  creators: ['BRAND_CAMPAIGN', 'PRODUCT_LAUNCH', 'COLLEGE_FEST', 'CORPORATE'],
};
const FAQS = {
  default: [
    { q: 'Why is the fee “on request”?', a: 'Fees depend on date, city, duration, travel and production needs, and are confirmed with the authorised representative before we send you a quote.' },
    { q: 'How fast will I hear back?', a: 'Our team checks availability with the representative and usually responds within 24 hours on working days.' },
    { q: 'Is my booking confirmed once I send a request?', a: 'Not yet. Every request is subject to the artist’s availability and their team’s approval. Nothing is confirmed until the contract is signed and the advance is paid.' },
  ],
};

// Real artists. Bios stick to publicly known facts; fees are on request and no past events are invented.
// Cover photos are freely licensed (CC0 / CC BY / CC BY-SA) and credited on the profile page.
const T = (name, cats, tagline, bio, tags, cover) => ({ name, cats, city: 'guwahati', languages: ['Assamese', 'Hindi', 'English'], tier: 'PREMIUM', featured: true, tagline, bio, tags, cover });
const RAW = [
  T('Bikash Chetry', ['creators'],
    'YouTuber and travel creator',
    'Bikash Chetry is an Assamese YouTuber and travel creator known for motorcycle travel vlogs and food content.',
    ['Travel vlogs', 'Moto vlogs', 'Food content'],
    local('bikash-chetry')),
  T('Dimpu Baruah', ['creators'],
    'YouTuber and content creator',
    'Dimpu Baruah is an Assamese YouTuber and content creator making videos on technology and travel.',
    ['Video content', 'Travel vlogs', 'Technology'],
    local('dimpu-baruah')),
  T('Jatin Bora', ['actors'],
    'Actor and director of Assamese film and mobile theatre',
    'Jatin Bora is an Assamese actor, director and producer, a long-standing lead in Assamese cinema and mobile theatre.',
    ['Assamese cinema', 'Direction', 'Theatre'],
    local('jatin-bora', 'Bikram Borpatra Photography')),
  T('Kopil Bora', ['actors', 'speakers'],
    'Actor and anchor from Assam',
    'Kopil Bora is an Assamese actor and anchor, known for his work in Assamese cinema and as a host on stage and television.',
    ['Film & theatre', 'Anchoring', 'Voice acting'],
    local('kopil-bora', 'TeachAIDS (CC BY-SA 2.0), via Wikimedia Commons')),
  T('Nahid Afrin Ansari', ['singers'],
    'Playback singer from Assam',
    'Nahid Afrin is a playback singer from Assam who came to national attention on Indian Idol Junior and sings for Hindi and Assamese films.',
    ['Playback singing', 'Live music'],
    local('nahid-afrin-ansari')),
  T('Nishita Goswami', ['actors'],
    'Actress of Assamese cinema',
    'Nishita Goswami is an Assamese film actress known for her lead roles in Assamese cinema.',
    ['Assamese cinema', 'Acting'],
    local('nishita-goswami', 'Manorama Online')),
  T('Yankee Parasar', ['actors'],
    'Actress and model',
    'Yankee Parasar is an Assamese actress and model who works across films, modelling and music videos.',
    ['Acting', 'Modeling', 'Music videos'],
    local('yankee-parasar')),
  T('Zerifa Wahid', ['actors'],
    'Actress of Assamese cinema and theatre',
    'Zerifa Wahid is an Assamese actress known for her work in Assamese films and theatre.',
    ['Assamese cinema', 'Theatre'],
    local('zerifa-wahid', 'Simbu123 (CC BY-SA 3.0), via Wikimedia Commons')),
];

/**
 * Approximate public audience sizes, with the source for each figure. Leave a talent out until a
 * figure is sourced — never estimate.
 */
const FOLLOWERS = {
  'bikash-chetry': [{ platform: 'youtube', count: 1320000 }], // vidIQ, "I Love Travel and Food", Jul 2025
  'dimpu-baruah': [{ platform: 'youtube', count: 2200000 }], // "Dimpu's Vlogs" channel (lower of published figures)
  'nishita-goswami': [{ platform: 'instagram', count: 857200 }, { platform: 'youtube', count: 95200 }], // Qoruz profile
};

const ALL_CITIES = ['guwahati', 'shillong', 'kolkata', 'delhi', 'mumbai', 'bengaluru', 'hyderabad', 'pune'];
const CITY_NAMES = { guwahati: 'Guwahati', shillong: 'Shillong', kolkata: 'Kolkata', delhi: 'Delhi', mumbai: 'Mumbai', bengaluru: 'Bengaluru', hyderabad: 'Hyderabad', pune: 'Pune' };
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const paise = (rupees) => (BigInt(rupees) * 100n).toString();

const talents = RAW.map((r, i) => {
  const primary = r.cats[0];
  const pool = POOLS[primary];
  const galleryCount = 3 + (i % 3); // 3–5 → 4–6 total images
  const gallery = Array.from({ length: galleryCount }, (_, k) => {
    const [n, alt] = pool[(i * 2 + k) % pool.length]; // distinct picks for any pool size
    return scene(n, `${alt} — illustrative photo`);
  });
  const near = ALL_CITIES.filter((c) => c !== r.city).filter((_, k) => (k + i) % 3 === 0);
  return {
    id: `tal_${String(i + 1).padStart(3, '0')}`,
    slug: slugify(r.name),
    name: r.name,
    categories: r.cats,
    primaryCategory: primary,
    tagline: r.tagline,
    bio: `${r.bio} Every booking request is coordinated by our team with the artist’s authorised representative, subject to their availability.`,
    baseCity: r.city,
    travelsTo: r.tier === 'PREMIUM' ? [] : near,
    travelsPanIndia: r.tier === 'PREMIUM',
    languages: r.languages,
    eventTypes: EVENT_TYPES[primary],
    tier: r.tier,
    representation: 'PLATFORM_COORDINATED',
    verified: false,
    featured: r.featured,
    feeBand: null,
    images: [{ ...r.cover, alt: `${r.name}, ${CAT_SINGULAR[primary]}` }, ...gallery],
    showreelUrl: null,
    pastEvents: [],
    riderSummary: null,
    faqs: FAQS.default,
    followers: FOLLOWERS[slugify(r.name)] ?? [],
    tags: [...new Set([...r.tags.map((t) => t.toLowerCase()), ...r.cats.map((c) => CAT_SINGULAR[c].toLowerCase()), ...r.languages.map((l) => l.toLowerCase()), CITY_NAMES[r.city].toLowerCase(), 'assam'])],
  };
});

// ---------- Bookings (customer "Riya Sharma") ----------
const bySlug = Object.fromEntries(talents.map((t) => [t.slug, t]));
const ref = (t) => ({ slug: t.slug, name: t.name, primaryCategory: t.primaryCategory, image: t.images[0] });
const GST_BPS = 1800;
const bps = (p, b) => (p * BigInt(b) + 5000n) / 10000n;

/** Lines carry internal costPaise/payoutPaise that must never reach the customer. */
function quote({ id, version, status, issuedAt, validUntil, lines, milestones, acceptedAt = null, changeRequest = null, notes = null }) {
  const lineItems = lines.map(([type, description, rupees, costRupees, payoutRupees], k) => ({
    id: `${id}_li${k + 1}`, type, description,
    amountPaise: paise(rupees),
    internalCostPaise: paise(costRupees ?? Math.round(rupees * 0.9)),
    payoutPaise: payoutRupees != null ? paise(payoutRupees) : null,
  }));
  const subtotal = lineItems.reduce((a, l) => a + BigInt(l.amountPaise), 0n);
  const tax = bps(subtotal, GST_BPS);
  const total = subtotal + tax;
  let allocated = 0n;
  const ms = milestones.map(([label, pct, dueDate], k) => {
    const amt = k === milestones.length - 1 ? total - allocated : bps(total, pct);
    allocated += amt;
    return { id: `${id}_ms${k + 1}`, label, percentBps: pct, amountPaise: amt.toString(), dueDate };
  });
  const cost = lineItems.reduce((a, l) => a + BigInt(l.internalCostPaise), 0n);
  return {
    id, version, status, issuedAt, validUntil, lineItems,
    subtotalPaise: subtotal.toString(), gstBps: GST_BPS, taxPaise: tax.toString(), totalPaise: total.toString(),
    milestones: ms,
    inclusions: ['Performance as per brief', 'Representative coordination', 'Dedicated booking manager', 'Contract and GST-ready proforma'],
    notes, acceptedAt, changeRequest,
    marginPaise: (subtotal - cost).toString(), // INTERNAL
    approvedBy: 'super_admin_01', // INTERNAL
  };
}

const manager = { name: 'Priyanka Das', phone: '+91 98640 12345', whatsapp: '+919864012345' };
const ev = (type, title, date, startTime, city, venue, audienceSize, durationMins) => ({ type, title, date, startTime, city, venue, audienceSize, durationMins });

const bookings = [
  {
    ref: 'BK-24017', leadRef: 'LD-1092', stage: 'NEW', availability: 'NOT_CHECKED', talent: ref(bySlug['nahid-afrin-ansari']),
    event: ev('CORPORATE', 'Annual Day 2027', '2027-01-23', '19:00', 'guwahati', 'Radisson Blu, Guwahati', 600, 75),
    createdAt: '2026-10-15T11:20:00Z', quotes: [], contract: { status: 'NOT_SENT', sentAt: null, signedAt: null }, advancePaid: false,
    milestones: [], documents: [],
    activity: [{ at: '2026-10-15T11:20:00Z', label: 'Brief received' }],
    notes: 'Prefer a 60–75 min set with Assamese and Hindi songs.', manager, internal: { owner: 'sales_02', leadScore: 72 },
  },
  {
    ref: 'BK-24011', leadRef: 'LD-1088', stage: 'AVAILABILITY_CHECK', availability: 'AWAITING_MANAGER', talent: ref(bySlug['kopil-bora']),
    event: ev('AWARD_NIGHT', 'Partner Excellence Awards', '2026-12-12', '20:00', 'bengaluru', 'ITC Gardenia, Bengaluru', 350, 45),
    createdAt: '2026-10-11T06:40:00Z', quotes: [], contract: { status: 'NOT_SENT', sentAt: null, signedAt: null }, advancePaid: false,
    milestones: [], documents: [],
    activity: [{ at: '2026-10-11T06:40:00Z', label: 'Brief received' }, { at: '2026-10-11T09:05:00Z', label: 'Request sent to Kopil’s representative' }],
    notes: 'Clean set; mixed audience of partners and families.', manager, internal: { owner: 'sales_01', leadScore: 81 },
  },
  {
    ref: 'BK-24009', leadRef: 'LD-1085', stage: 'AVAILABILITY_CHECK', availability: 'HOLD_REQUESTED', talent: ref(bySlug['nishita-goswami']),
    event: ev('WEDDING', 'Sangeet — Sharma & Kapoor', '2027-02-14', '20:30', 'delhi', 'Private farmhouse, Chattarpur', 400, 90),
    createdAt: '2026-10-08T13:00:00Z', quotes: [], contract: { status: 'NOT_SENT', sentAt: null, signedAt: null }, advancePaid: false,
    milestones: [], documents: [],
    activity: [{ at: '2026-10-08T13:00:00Z', label: 'Brief received' }, { at: '2026-10-09T05:30:00Z', label: 'Availability check started' }, { at: '2026-10-12T10:10:00Z', label: 'Soft hold requested on 14 Feb' }],
    notes: null, manager, internal: { owner: 'sales_02', leadScore: 90 },
  },
  {
    ref: 'BK-24005', leadRef: 'LD-1079', stage: 'QUOTE_SENT', availability: 'AVAILABLE', talent: ref(bySlug['bikash-chetry']),
    event: ev('PRODUCT_LAUNCH', 'Launch night — Aurora EV', '2026-11-28', '21:00', 'mumbai', 'Jio World Garden, BKC', 800, 180),
    createdAt: '2026-10-02T08:15:00Z',
    quotes: [
      quote({ id: 'Q-24005-1', version: 1, status: 'SUPERSEDED', issuedAt: '2026-10-06T10:00:00Z', validUntil: '2026-10-13T18:29:59Z',
        lines: [['TALENT_FEE', 'Bikash Chetry — launch film + live appearance', 650000, 520000, 520000], ['TRAVEL', 'Return flights (2 pax)', 38000], ['ACCOMMODATION', '1 night, 2 rooms', 24000], ['PRODUCTION', 'DJ booth + booth monitors', 55000], ['SERVICE_FEE', 'Platform service fee', 52000, 0]],
        milestones: [['Advance', 5000, '2026-10-20'], ['Balance', 5000, '2026-11-21']], changeRequest: 'Can we drop the production line? Venue provides the booth.' }),
      quote({ id: 'Q-24005-2', version: 2, status: 'SENT', issuedAt: '2026-10-14T09:30:00Z', validUntil: '2026-11-15T18:29:59Z',
        lines: [['TALENT_FEE', 'Nucleya — 3-hour headline set', 650000, 520000, 520000], ['TRAVEL', 'Return flights (2 pax)', 38000], ['ACCOMMODATION', '1 night, 2 rooms', 24000], ['LOCAL_TRANSPORT', 'Airport + venue transfers', 9500], ['SERVICE_FEE', 'Platform service fee', 52000, 0]],
        milestones: [['Advance', 5000, '2026-10-27'], ['Balance', 5000, '2026-11-21']], notes: 'Production removed — venue provides booth and monitors as discussed.' }),
    ],
    contract: { status: 'NOT_SENT', sentAt: null, signedAt: null }, advancePaid: false, milestones: [],
    documents: [{ id: 'doc_1', name: 'Quote Q-24005 v2.pdf', kind: 'QUOTE_PDF', uploadedAt: '2026-10-14T09:31:00Z', sizeKb: 142 }],
    activity: [{ at: '2026-10-02T08:15:00Z', label: 'Brief received' }, { at: '2026-10-04T12:00:00Z', label: 'Bikash Chetry confirmed available' }, { at: '2026-10-06T10:00:00Z', label: 'Quote v1 sent' }, { at: '2026-10-07T07:45:00Z', label: 'You requested changes' }, { at: '2026-10-14T09:30:00Z', label: 'Quote v2 sent' }],
    notes: 'Launch reveal at 22:15 — needs a build-up track.', manager, internal: { owner: 'sales_01', leadScore: 88 },
  },
  {
    ref: 'BK-24003', leadRef: 'LD-1074', stage: 'ADVANCE_PENDING', availability: 'TENTATIVE', talent: ref(bySlug['dimpu-baruah']),
    event: ev('CONFERENCE', 'Future of Work Summit', '2026-12-05', '10:00', 'bengaluru', 'Bangalore International Centre', 450, 60),
    createdAt: '2026-09-24T05:00:00Z',
    quotes: [
      quote({ id: 'Q-24003-1', version: 1, status: 'ACCEPTED', issuedAt: '2026-09-30T06:00:00Z', validUntil: '2026-10-10T18:29:59Z', acceptedAt: '2026-10-03T04:12:00Z',
        lines: [['TALENT_FEE', 'Creator session + Q&A (60 min)', 850000, 700000, 700000], ['TRAVEL', 'Local — no travel', 0, 0], ['LOCAL_TRANSPORT', 'Car on event day', 4500], ['SERVICE_FEE', 'Platform service fee', 68000, 0]],
        milestones: [['Advance', 5000, '2026-10-22'], ['Balance', 5000, '2026-11-28']] }),
    ],
    contract: { status: 'SENT', sentAt: '2026-10-05T07:00:00Z', signedAt: null }, advancePaid: false,
    milestones: [
      { id: 'm_24003_1', label: 'Advance (50%)', dueDate: '2026-10-22', status: 'DUE', paidAt: null, receiptNo: null, pct: 5000 },
      { id: 'm_24003_2', label: 'Balance (50%)', dueDate: '2026-11-28', status: 'UPCOMING', paidAt: null, receiptNo: null, pct: 5000 },
    ],
    documents: [{ id: 'doc_2', name: 'Quote Q-24003 v1.pdf', kind: 'QUOTE_PDF', uploadedAt: '2026-09-30T06:01:00Z', sizeKb: 131 }, { id: 'doc_3', name: 'Booking contract — unsigned.pdf', kind: 'CONTRACT', uploadedAt: '2026-10-05T07:00:00Z', sizeKb: 388 }],
    activity: [{ at: '2026-09-24T05:00:00Z', label: 'Brief received' }, { at: '2026-09-27T10:00:00Z', label: 'Tentatively available — pending travel plans' }, { at: '2026-09-30T06:00:00Z', label: 'Quote sent' }, { at: '2026-10-03T04:12:00Z', label: 'You accepted the quote' }, { at: '2026-10-05T07:00:00Z', label: 'Contract sent for e-sign' }],
    notes: 'Theme: “Teams that learn faster”.', manager, internal: { owner: 'sales_03', leadScore: 93 },
  },
  {
    ref: 'BK-23998', leadRef: 'LD-1066', stage: 'AVAILABILITY_CHECK', availability: 'UNAVAILABLE', talent: ref(bySlug['yankee-parasar']),
    event: ev('WEDDING', 'Reception — Mehta family', '2026-12-19', '19:30', 'mumbai', 'The St. Regis, Lower Parel', 700, 90),
    createdAt: '2026-09-18T09:00:00Z', quotes: [], contract: { status: 'NOT_SENT', sentAt: null, signedAt: null }, advancePaid: false,
    milestones: [], documents: [],
    activity: [{ at: '2026-09-18T09:00:00Z', label: 'Brief received' }, { at: '2026-09-20T11:30:00Z', label: 'Not available on 19 Dec' }, { at: '2026-09-20T11:45:00Z', label: 'Alternatives shared by your manager' }],
    notes: null, manager, internal: { owner: 'sales_02', leadScore: 64 },
  },
  {
    ref: 'BK-23987', leadRef: 'LD-1051', stage: 'CONFIRMED', availability: 'CONFIRMED', talent: ref(bySlug['nahid-afrin-ansari']),
    event: ev('COLLEGE_FEST', 'Techfest closing night', '2026-11-08', '20:00', 'guwahati', 'Main ground, engineering college campus', 3000, 120),
    createdAt: '2026-09-05T10:00:00Z',
    quotes: [
      quote({ id: 'Q-23987-1', version: 1, status: 'ACCEPTED', issuedAt: '2026-09-09T08:00:00Z', validUntil: '2026-09-19T18:29:59Z', acceptedAt: '2026-09-11T10:20:00Z',
        lines: [['TALENT_FEE', 'Nahid Afrin Ansari — 2-hour headline set', 120000, 95000, 95000], ['PRODUCTION', 'Sound and stage setup', 35000], ['SECURITY', 'Stage security (4 guards)', 12000], ['SERVICE_FEE', 'Platform service fee', 10000, 0]],
        milestones: [['Advance', 5000, '2026-09-15'], ['Balance', 5000, '2026-11-01']] }),
    ],
    contract: { status: 'SIGNED', sentAt: '2026-09-11T12:00:00Z', signedAt: '2026-09-12T06:30:00Z' }, advancePaid: true,
    milestones: [
      { id: 'm_23987_1', label: 'Advance (50%)', dueDate: '2026-09-15', status: 'PAID', paidAt: '2026-09-13T09:41:00Z', receiptNo: 'RCPT-50821', pct: 5000 },
      { id: 'm_23987_2', label: 'Balance (50%)', dueDate: '2026-11-01', status: 'UPCOMING', paidAt: null, receiptNo: null, pct: 5000 },
    ],
    documents: [{ id: 'doc_4', name: 'Quote Q-23987 v1.pdf', kind: 'QUOTE_PDF', uploadedAt: '2026-09-09T08:01:00Z', sizeKb: 120 }, { id: 'doc_5', name: 'Booking contract — signed.pdf', kind: 'CONTRACT', uploadedAt: '2026-09-12T06:30:00Z', sizeKb: 402 }, { id: 'doc_6', name: 'Receipt RCPT-50821.pdf', kind: 'RECEIPT', uploadedAt: '2026-09-13T09:42:00Z', sizeKb: 64 }, { id: 'doc_7', name: 'Technical rider.pdf', kind: 'RIDER', uploadedAt: '2026-09-12T08:00:00Z', sizeKb: 210 }],
    activity: [{ at: '2026-09-05T10:00:00Z', label: 'Brief received' }, { at: '2026-09-06T08:00:00Z', label: 'Available' }, { at: '2026-09-09T08:00:00Z', label: 'Quote sent' }, { at: '2026-09-11T10:20:00Z', label: 'You accepted the quote' }, { at: '2026-09-12T06:30:00Z', label: 'Contract signed' }, { at: '2026-09-13T09:41:00Z', label: 'Advance received' }, { at: '2026-09-13T11:00:00Z', label: 'Representative accepted — booking confirmed' }],
    notes: null, manager, internal: { owner: 'sales_01', leadScore: 95, repAcceptedAt: '2026-09-13T11:00:00Z' },
  },
];

// Resolve milestone amounts from the accepted quote total.
for (const b of bookings) {
  const accepted = b.quotes.find((q) => q.status === 'ACCEPTED');
  if (!accepted) continue;
  const total = BigInt(accepted.totalPaise);
  let allocated = 0n;
  b.milestones = b.milestones.map((m, k, arr) => {
    const amt = k === arr.length - 1 ? total - allocated : bps(total, m.pct);
    allocated += amt;
    const { pct, ...rest } = m;
    return { ...rest, amountPaise: amt.toString() };
  });
}

// ---------- Talent portal (logged-in talent: Nahid Afrin Ansari) ----------
const portal = {
  talentSlug: 'nahid-afrin-ansari',
  name: 'Nahid Afrin Ansari',
  blackoutEditable: true,
  bookings: [
    { ref: 'BK-23987', event: bookings[6].event, availability: 'CONFIRMED', contract: 'SIGNED', payoutPaise: paise(95000), sellingPaise: paise(120000), reportingTime: '18:30', pointOfContact: 'Priyanka Das · +91 98640 12345' },
    { ref: 'BK-24021', event: ev('WEDDING', 'Wedding after-party', '2026-11-22', '22:00', 'shillong', 'Private resort, Umiam', 250, 150), availability: 'AVAILABLE', contract: 'NOT_SENT', payoutPaise: null, sellingPaise: null, reportingTime: null, pointOfContact: 'Priyanka Das · +91 98640 12345' },
    { ref: 'BK-23950', event: ev('CLUB_NIGHT', 'Saturday residency', '2026-10-03', '22:00', 'guwahati', 'Rooftop lounge, GS Road', 300, 180), availability: 'CONFIRMED', contract: 'SIGNED', payoutPaise: paise(60000), sellingPaise: paise(78000), reportingTime: '21:00', pointOfContact: 'Rahul Nath · +91 98540 22110' },
    { ref: 'BK-23911', event: ev('COLLEGE_FEST', 'Freshers’ night', '2026-08-29', '19:00', 'guwahati', 'University auditorium', 1200, 90), availability: 'CONFIRMED', contract: 'SIGNED', payoutPaise: paise(55000), sellingPaise: paise(72000), reportingTime: '17:30', pointOfContact: 'Rahul Nath · +91 98540 22110' },
  ],
  payouts: [
    { id: 'po_1', bookingRef: 'BK-23911', eventTitle: 'Freshers’ night', eventDate: '2026-08-29', amountPaise: paise(55000), status: 'PAID', paidAt: '2026-09-04T10:00:00Z', reference: 'UTR 4412 8890 1123', marginPaise: paise(17000) },
    { id: 'po_2', bookingRef: 'BK-23950', eventTitle: 'Saturday residency', eventDate: '2026-10-03', amountPaise: paise(60000), status: 'PENDING', paidAt: null, reference: null, marginPaise: paise(18000) },
    { id: 'po_3', bookingRef: 'BK-23987', eventTitle: 'Techfest closing night', eventDate: '2026-11-08', amountPaise: paise(95000), status: 'SCHEDULED', paidAt: null, reference: null, marginPaise: paise(25000) },
  ],
  blackouts: [
    { date: '2026-10-24', reason: 'Studio session' },
    { date: '2026-10-25', reason: 'Studio session' },
    { date: '2026-11-14', reason: 'Family function' },
    { date: '2026-12-31', reason: null },
  ],
};

// Blackouts for the public date filter (CAT-4): a few per talent.
const blackouts = Object.fromEntries(
  talents.map((t, i) => [t.slug, [`2026-11-${String(((i * 3) % 27) + 1).padStart(2, '0')}`, `2026-12-${String(((i * 5) % 27) + 1).padStart(2, '0')}`, '2026-12-31'].filter((_, k) => k < 2 || i % 4 === 0)]),
);
blackouts['nahid-afrin-ansari'] = portal.blackouts.map((b) => b.date);

// Tiny blurred previews (8×10 WebP, ~90 bytes) for cover images → next/image placeholder="blur",
// made from the local cover with ImageMagick. Skipped gracefully if `magick` isn't installed.
import { spawnSync } from 'node:child_process';
async function blurFor({ src }) {
  const out = spawnSync('magick', [join(PUBLIC, src.split('?')[0]), '-resize', '8x10^', '-gravity', 'center', '-extent', '8x10', '-strip', '-quality', '40', 'webp:-']);
  if (out.status !== 0 || !out.stdout.length || out.stdout.length > 1000) return undefined;
  return `data:image/webp;base64,${out.stdout.toString('base64')}`;
}
const blurs = await Promise.all(talents.map((t) => blurFor(t.images[0])));
talents.forEach((t, i) => {
  if (blurs[i]) t.images[0].blurDataURL = blurs[i];
});
for (const b of bookings) b.talent.image = talents.find((t) => t.slug === b.talent.slug).images[0];
console.log(`Blur previews: ${blurs.filter(Boolean).length}/${talents.length}`);

const write = (name, data) => writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + '\n');
write('talents.json', talents);
write('bookings.json', bookings);
write('portal.json', portal);
write('blackouts.json', blackouts);
console.log(`Wrote ${talents.length} talents, ${bookings.length} bookings → ${OUT}`);
optimizeImages();
