/* ══════════════════════════════════════════════════════════════════
   SINGLE SOURCE OF TRUTH (SSOT)
   Each cert / skill / project / badge is declared ONCE in `SITE` and every
   surface (section cards, hero strip, skills tags, JSON-LD, terminal) is
   rendered from it — so a partial, drifted update is structurally impossible.
   Runtime render for now; templates are pure so a build step can prerender
   the same output to static HTML for crawlers later (see SSOT_BUILD_PROGRESS.md).
   ══════════════════════════════════════════════════════════════════ */
window.SITE = window.SITE || {};

/* features: on/off switches for anything decorative enough that it might want
   turning off later without unpicking code. Set a flag to false and the feature
   does not initialise and leaves no markup showing.

   clock: local London time plus an availability dot in the contact section.
   Cost is one setInterval at 1Hz updating two text nodes, which is negligible -
   it is not in the same class as the canvas animation. The dot's pulse is CSS
   and is already covered by the site's prefers-reduced-motion guard. */
SITE.features = {
  clock: true
};

SITE.jobTitle = 'Security Analyst | Offensive Security';
SITE.knowsAbout = ['Penetration Testing','Ethical Hacking','Red Teaming','Network Security','Active Directory','Web Application Security','OSINT','Digital Forensics','Cryptography','Burp Suite','Nmap','Metasploit','Kali Linux','Python','SQL'];

/* identity: one place for the rotating hero roles + <title> + meta description +
   OG/Twitter social tags. renderIdentity() syncs the live DOM from these. */
/* share: the Open Graph / Twitter card image, in one place.

   The URL was hand-written into all eleven pages, 22 tags in total. That is the
   same drift risk that put the wrong filename in the README: it named
   thumbnail.png as the og:image when every page has always pointed at
   thumbnail.jpg. Changing the banner used to mean editing eleven files and
   getting all of them right.

   `node tools/build-fallbacks.mjs` writes these values into every page, and
   check-consistency.mjs fails the commit if any page disagrees. Change the
   banner here, run the generator, and all eleven follow. */
SITE.share = {
  base:   'https://atharvaxsecurity.com/',
  image:  'thumbnail.jpg',
  width:  1200,
  height: 627
};

SITE.identity = {
  roles: ['Junior Penetration Tester','Security Analyst','Ethical Hacker','Offensive Security','Red Team Aspirant','CTF Competitor','Security Researcher'],
  title: 'Atharva Kulkarni — Junior Penetration Tester | Offensive Security | CEH V12 | MSc Applied Cyber Security',
  metaDescription: 'Atharva Kulkarni — CEH V12 Certified, GCHQ-accredited MSc Applied Cyber Security graduate. Security Analyst transitioning into offensive security and penetration testing. London, UK.',
  ogTitle: 'Atharva Kulkarni — Security Analyst | Offensive Security | CEH V12',
  ogDescription: 'CEH V12 Certified | GCHQ-accredited MSc Applied Cyber Security | Transitioning into offensive security and penetration testing. Portfolio of security projects and experience.',
  twTitle: 'Atharva Kulkarni — Security Analyst | Offensive Security | CEH V12',
  twDescription: 'CEH V12 Certified | GCHQ-accredited MSc Applied Cyber Security | Transitioning into penetration testing and red team operations.'
};

/* certs: one entry → certs section card + JSON-LD hasCredential (if earned)
   name=full (card), jsonLdName=formal (structured data), badge=emoji, cls=accent,
   credentialId OR pill{text,href?} for the card foot, earned gates JSON-LD. */
SITE.certs = [
  { id:'ceh',  earned:true,  featured:true, cls:'ceh', issuer:'EC-Council', name:'Certified Ethical Hacker (CEH V12)', jsonLdName:'Certified Ethical Hacker (CEH V12)', badge:'\u{1F6E1}',        credentialId:'ECC9421760853', certUrl:'assets/certs/CEH-V12-Certificate.pdf' },
  { id:'nse1', earned:true,  featured:true, cls:'nse', issuer:'Fortinet',   name:'Network Security Expert (NSE) Level 1', jsonLdName:'Fortinet NSE Level 1', badge:'\u{1F512}', credentialId:'PggZRhVh2p' },
  { id:'nse2', earned:true,  featured:true, cls:'nse', issuer:'Fortinet',   name:'Network Security Expert (NSE) Level 2', jsonLdName:'Fortinet NSE Level 2', badge:'\u{1F512}', credentialId:'uTMYfCWHCd' },
  { id:'sec1', earned:true,  featured:true, cls:'thm', issuer:'TryHackMe',  name:'Cyber Security 101 (SEC1)', jsonLdName:'Cyber Security 101 (SEC1)', badge:'\u{1F6E1}️', pill:{ text:'Completed', href:'assets/certs/TryHackMe-SEC1-Certificate.pdf' } },
  { id:'sec0', earned:true,  featured:true, cls:'thm', issuer:'TryHackMe',  name:'Pre Security (SEC0)', jsonLdName:'Pre Security (SEC0)', badge:'\u{1F6E1}️', pill:{ text:'Completed', href:'assets/certs/TryHackMe-SEC0-Certificate.pdf' } },
  { id:'jrpt', earned:false, featured:true, cls:'thm', issuer:'TryHackMe',  name:'Junior Penetration Testing Path', badge:'\u{1F3AF}', pill:{ text:'In Progress · Active' } }
];

/* THM per-badge share link from a slug (sharerId is constant for this account). */
SITE.thmShare = function(slug){ return 'https://tryhackme.com/AtharvaK911/badges/'+slug+'?utm_campaign=social_share&utm_medium=social&utm_content=badge&utm_source=copy&sharerId=63879addf6080c0048a27b26'; };

/* badges: one entry → #badges card + terminal `cat badges.txt` (live DOM) ONLY.
   The hero top-of-page badge strip is deliberately NOT driven by this — it is a
   manual hand-picked favourites list (static HTML in the hero). Adding/editing a
   badge here updates the Badges section + terminal, never the hero.
   ORDER = exam first, then League wins (epic), then by rarity.
   CURATION RULE: only high-signal badges ship here — exam/cert badges, League
   1st-place wins, offensive-box + tooling badges, and the top streak. Beginner
   module badges and low-signal ones are deliberately omitted.
   tier=glow class; cls2=exam/epic extra class; href OR slug (→ share link). */
/* thm: the seven TryHackMe figures, in ONE place. They were previously typed
   directly into the card markup with no array, no generator and no check, so
   nothing noticed when they went stale - streak and rank both drifted within
   two days. Refresh from
   https://tryhackme.com/api/v2/public-profile?username=AtharvaK911
   (the API blocks curl; read it in a browser), update here, run
   `node tools/build-fallbacks.mjs`, and every surface follows. */
SITE.thm = {
  asOf:       '2026-09-21',
  rooms:      152,
  points:     24645,
  streak:     128,
  badges:     26,
  rank:       22966,
  percentile: 1,          // topPercentage from the API
  level:      13          // rendered as hex, 13 -> 0xD
};

/* Formatting lives with the data so the Node generator and the browser
   renderer can never disagree about how a figure is displayed. */
SITE.thmDisplay = function (t) {
  var group = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var LEVEL_NAMES = { 13: 'Legend' };
  return {
    rooms:      group(t.rooms),
    points:     group(t.points),
    streak:     String(t.streak),
    badges:     String(t.badges),
    rank:       group(t.rank),
    percentile: 'Top ' + t.percentile + '%',
    level:      '0x' + t.level.toString(16).toUpperCase(),
    levelName:  LEVEL_NAMES[t.level] || ''
  };
};

SITE.badges = [
  { id:'sec1',       featured:true ,   tier:'t-exam',   cls2:'exam', name:'Cyber Security 101 (SEC1)', img:'assets/badges/thm/cyber-security-101-sec1.webp', tag:'Exam',   desc:'TryHackMe Cyber Security 101 certification',            href:'https://www.credly.com/badges/a10b2144-1101-410d-ba41-e22180d04801/public_url', aria:'Cyber Security 101 (SEC1) — verify on Credly' },
  { id:'sec0',       featured:true ,   tier:'t-exam',   cls2:'exam', name:'Pre Security (SEC0)', img:'assets/badges/thm/pre-security-sec0.webp', tag:'Exam',          desc:'TryHackMe Pre Security certification',                  href:'https://www.credly.com/badges/c8062133-aeff-4ab2-bc9f-86c6039210bd/public_url', aria:'Pre Security (SEC0) — verify on Credly' },
  { id:'ruby',       featured:true ,   tier:'t-epic',   cls2:'epic', name:'Ruby League', img:'assets/badges/thm/ruby-league.webp', tag:'epic: 0.2%',            desc:'Ruby League 1st place',                                 slug:'ruby-league',          aria:'Ruby League — 1st place on TryHackMe' },
  { id:'sapphire',   featured:true ,   tier:'t-epic',   cls2:'epic', name:'Sapphire League', img:'assets/badges/thm/sapphire-league.webp', tag:'epic: 0.4%',    desc:'Sapphire League 1st place',                             slug:'sapphire-league',      aria:'Sapphire League — 1st place on TryHackMe' },
  { id:'platinum',   featured:true ,   tier:'t-epic',   cls2:'epic', name:'Platinum League', img:'assets/badges/thm/platinum-league.webp', tag:'epic: 0.5%',    desc:'Platinum League 1st place',                             slug:'platinum-league',      aria:'Platinum League — 1st place on TryHackMe' },
  { id:'pipeline',   featured:true ,   tier:'t-epic',   name:'Security in the Pipeline', img:'assets/badges/thm/security-in-the-pipeline.webp', tag:'epic: 0.7%',   desc:'TryHackMe Security in the Pipeline module', slug:'security-in-the-pipeline' },
  { id:'authstriker', featured:true ,  tier:'t-epic',   cls2:'epic', name:'Authentication Striker', img:'assets/badges/thm/authentication-striker.webp', tag:'epic: 0.8%',  desc:'Used the Hammer to bypass authentication',            slug:'authentication-striker', aria:'Authentication Striker — view badge on TryHackMe' },
  { id:'million3',   featured:true ,   tier:'t-rare',   name:'3 Million Legend', img:'assets/badges/thm/3-million-legend.webp', tag:'rare: 1.2%',    desc:'Awarded to members of the 3 millionth cohort', slug:'3-million-legend' },
  { id:'streak90',   featured:true ,   tier:'t-rare',   cls2:'',     name:'90 Day Streak', img:'assets/badges/thm/streak-90.webp', tag:'rare: 3%',            desc:'Hacking for 90 days in a row',                             slug:'90-day-streak', aria:'90 Day Streak badge on TryHackMe' },
  { id:'ice',        featured:true ,   tier:'t-rare',   cls2:'',     name:'Ice', img:'assets/badges/thm/ice.webp', tag:'rare: 3.1%',                            desc:'Exploiting Windows via a media server',                 slug:'ice', aria:'Ice badge on TryHackMe' },
  { id:'shield',     featured:true ,   tier:'t-rare',   cls2:'',     name:'Shield Apprentice', img:'assets/badges/thm/shield-apprentice.webp', tag:'rare: 3.1%',         desc:'Completing the FlareVM room',                        slug:'shieldapprentice', aria:'Shield Apprentice — view badge on TryHackMe' },
  { id:'sword',      featured:true ,   tier:'t-rare',   cls2:'',     name:'Sword Apprentice', img:'assets/badges/thm/sword-apprentice.webp', tag:'rare: 3.7%',  desc:'Completing the SQLMap room',                            slug:'swordapprenticebadge', aria:'Sword Apprentice badge on TryHackMe' },
  { id:'metasploit', featured:false,   tier:'t-common',   cls2:'',     name:'Metasploitable', img:'assets/badges/thm/metasploitable.webp', tag:'common: 12.2%',      desc:'Contains the knowledge to use Metasploit',                   slug:'metasploitable', aria:'Metasploitable badge on TryHackMe' },
  { id:'blue',       featured:false,   tier:'t-common',   cls2:'',     name:'Blue', img:'assets/badges/thm/blue.webp', tag:'common: 12.8%',                          desc:'Hacking into Windows via EternalBlue',                  slug:'blue', aria:'Blue badge on TryHackMe' },
  { id:'owasp10',    featured:false,  tier:'t-common', cls2:'',     name:'OWASP Top 10', img:'assets/badges/thm/owasp-top-10.webp', tag:'common: 13%',           desc:'Understanding every OWASP vulnerability',                slug:'owasp-10', aria:'OWASP Top 10 — view badge on TryHackMe' },
];

/* projects: one entry → #projects card (home, featured only) + projects/index.html
   hub (all). "delay" is the reveal-stagger digit already baked into the hand-authored
   markup this array was lifted from (0 = plain "reveal", 1-3 = "reveal reveal-delay-N")
   — kept explicit per item, like featured, rather than derived, because the original
   stagger pattern is irregular (grouped by row, not a clean cycle) and this is the only
   way to reproduce it byte-for-byte. New entries can pick any delay 0-3.
   href is null for the five academic/CTF write-ups that render as a plain (non-link)
   card; the six 2026 builds link out. techStack is null for the two cards that never
   had a tech-stack strip (Blueprint, Finance Dashboard). name/org/desc/outcomes carry
   trusted hand-authored HTML entities (&mdash;, &amp;, embedded <span>) and are NOT
   re-escaped by the renderer — same trust model ssot.mjs already documents for
   index.html itself. */
SITE.projects = [
  { id:'ctf-labs', featured:false, delay:0, href:null, icon:'&#x1F3AF;',
    org:'Ongoing &middot; TryHackMe &amp; HackTheBox', name:'CTF &amp; Penetration Testing Labs',
    desc:'Active CTF competitor building offensive skills across enumeration, exploitation, and privilege escalation. Currently active on the Junior Penetration Testing path on TryHackMe.',
    outcomes:['Active on Junior Penetration Testing path on TryHackMe','Practising manual exploit identification and vulnerability chaining','Developing recon, web app testing, and post-exploitation techniques'],
    techStack:['Nmap','Burp Suite','Metasploit','Linux','Web Exploitation'] },
  { id:'puf-ml', featured:false, delay:1, href:null, icon:'&#x1F916;',
    org:'Queen&#39;s University Belfast &middot; 2023', name:'ML Attacks on Physical Unclonable Functions',
    desc:'MSc dissertation weaponising GANs against PUF-based hardware authentication. Synthesised challenge-response pairs to train ML attack models against hardware security mechanisms.',
    outcomes:['Demonstrated measurable PUF vulnerability through GAN-synthesised datasets','Evaluated attack success rates and proposed countermeasures','Advanced hardware-level threat research across ML and cryptography'],
    techStack:['Python','GANs','Machine Learning','Cryptography','PUFs'] },
  { id:'honey-encryption', featured:false, delay:2, href:null, icon:'&#x1F510;',
    org:'Queen&#39;s University Belfast &middot; 2023', name:'Honey Encryption: Brute-Force Resistant Security',
    desc:'Researched Honey Encryption returning fake plausible plaintext on incorrect decryption, blinding brute-force attacks. Proposed a developer API for real-world integration.',
    outcomes:['Designed a developer API for web and cloud application integration','Applied DTE encoding to passwords, PINs, and biometrics','Mapped use cases across internet banking and cloud security'],
    techStack:['Python','Encryption','DTE','API Design','Cloud Security'] },
  { id:'ntfs-forensics', featured:false, delay:3, href:null, icon:'&#x1F50E;',
    org:'Queen&#39;s University Belfast &middot; 2023', name:'NTFS Digital Forensics: File Recovery on Windows 10',
    desc:'Forensic investigation into deleted file recovery using MFT analysis, slack space, disk imaging, and CLI tools. Applicable to cybercrime investigation and incident response.',
    outcomes:['Analysed MFT entries, slack space, and disk imaging for artifact recovery','Compared CLI tools and recovery software for forensic soundness','Documented best practices for evidence preservation and breach analysis'],
    techStack:['NTFS','Disk Imaging','MFT Analysis','Windows Forensics','CLI Tools'] },
  { id:'airs', featured:false, delay:0, href:null, icon:'&#x1F6E1;',
    org:'Queen&#39;s University Belfast &middot; 2023', name:'Automated Network Intrusion Response System (AIRS)',
    desc:'Research into automated self-defence for enterprise networks &mdash; integrating IDS/IPS detection with an Intrusion Response System (IRS) that delivers pre-configured active and passive countermeasures to contain attackers and restore system health.',
    outcomes:['Classified IRS response models &mdash; notification, manual, and automatic (expert, adaptive, associative) &mdash; and mapped active vs passive mitigations','Evaluated agent-based IDS/IRS architectures: CSM, EMERALD, JiNao, and NetSTAT','Assessed weaknesses (false positives, scalability, alert flooding) and future directions in real-time response and risk assessment'],
    techStack:['IDS/IPS','IRS','Network Security','Threat Mitigation','Anomaly Detection'] },
  { id:'claude-org-framework', featured:true, delay:0, href:'https://github.com/atharvak161/claude-org-framework', icon:'&#x1F3DB;',
    org:'2026 &middot; Multi-Agent Orchestration &middot; <span style="color:var(--accent2);">github.com/atharvak161/claude-org-framework</span>', name:'Claude Org Framework &mdash; AI Agent Orchestration',
    desc:'A production-grade multi-agent operating system built on Claude Code. 89 role-scoped agents across a full org chart &mdash; engineering, security, QA, DevOps, product &mdash; each with its own remit, escalation path and sign-off gates. Clone it and run your own AI-powered organisation.',
    outcomes:['89 role-scoped agents with enforced separation between building, reviewing and shipping','Mandatory security and QA sign-off gates before anything reaches production','Git hooks and a consistency checker that block policy violations mechanically, not by convention'],
    techStack:['Claude Code','Multi-Agent Systems','Bash','Git Hooks','Process Design'] },
  { id:'cybersec-toolkit', featured:true, delay:1, href:'https://atharvaxsecurity.com/cybersec-toolkit/', icon:'&#x1F9F0;',
    org:'2026 &middot; Client-Side Security Toolkit &middot; <span style="color:var(--accent2);">github.com/atharvak161/cybersec-toolkit</span>', name:'Cybersec Toolkit',
    desc:'A client-side cybersecurity utilities toolkit &mdash; encoding/decoding, hashing, JWT/AES/RSA tools, a CyberChef-style recipe chainer, and OSINT lookups. Nothing ever leaves the browser except a few clearly-disclosed public API calls.',
    outcomes:['Encoding, hashing, and JWT/AES/RSA tooling with a CyberChef-style recipe chainer','OSINT lookup utilities alongside classic encode/decode and crypto tools','Fully client-side &mdash; no data leaves the browser except disclosed public API calls'],
    techStack:['JavaScript','Web Crypto API','JWT','OSINT','Client-Side Security'] },
  { id:'cybersec-vault', featured:true, delay:2, href:'https://atharvaxsecurity.com/cybersec-vault/', icon:'&#x1F5C4;',
    org:'2026 &middot; Cybersecurity Knowledge Base &middot; <span style="color:var(--accent2);">github.com/atharvak161/cybersec-vault</span>', name:'The Vault',
    desc:'A fast, fully client-side knowledge base for 248 cybersecurity notes &mdash; cloud, GRC, OSCP, and red-team &mdash; with an Obsidian-style reader: instant full-text search, a command palette, wiki-style cross-links, an interactive link graph, and backlinks. No backend, nothing leaves the browser.',
    outcomes:['248 interlinked notes across four tracks with full-text search and a &#x2318;K command palette','Wiki-links, backlinks, an interactive link graph, and a scroll-spy table of contents','Fully static and client-side &mdash; HTML sanitised with DOMPurify, all assets vendored, zero external calls'],
    techStack:['JavaScript','Markdown','Full-Text Search','Graph View','Client-Side'] },
  { id:'jobscope', featured:true, delay:1, href:'https://github.com/atharvak161/jobscope', icon:'&#x1F50E;',
    org:'2026 &middot; Full-Stack &middot; <span style="color:var(--accent2);">github.com/atharvak161/jobscope</span>', name:'JobScope &mdash; UK Job Aggregator',
    desc:'UK job aggregator that filters listings by visa sponsorship status and security clearance requirements &mdash; built for candidates who need to know eligibility before they apply. Resume parsing powered by Claude AI.',
    outcomes:['Filters roles by visa sponsorship and security clearance eligibility','Claude AI resume parsing for automated candidate-to-role matching','IDOR, SSRF, and prompt-injection defences built in from the ground up'],
    techStack:['Next.js 16','TypeScript','PostgreSQL','Prisma 7','Claude AI'] },
  { id:'blueprint', featured:true, delay:2, href:'https://atharvaxsecurity.com/Blueprint/', icon:'&#x1F4CB;',
    org:'2026 &middot; Full-Stack &middot; <span style="color:var(--accent2);">github.com/atharvak161/Blueprint</span>', name:'Blueprint &mdash; Project Management Tool',
    desc:'A project management dashboard for tracking tasks, milestones, and team progress. Built as a single-page app with a clean kanban-style interface.',
    outcomes:['Visual project and task tracking with status columns','Milestone management with progress indicators','Deployed via GitHub Actions to GitHub Pages'],
    techStack:null, techStack:['TypeScript','Python','GitHub Actions','GitHub Pages'] },
  { id:'finance-dashboard', featured:true, delay:3, href:'https://github.com/atharvak161/finance-dashboard', icon:'&#x1F4B7;',
    org:'2026 &middot; Full-Stack &middot; <span style="color:var(--accent2);">github.com/atharvak161/finance-dashboard</span>', name:'Finance Dashboard &mdash; Personal Finance Tracker',
    desc:'Comprehensive personal finance tracker for NRI/UK professionals. Tracks income, expenses, investments, debts, and goals across GBP and INR. Includes ROAI analytics, envelope budgeting, bill calendar, SMS transaction parsing, and OLED dark mode.',
    outcomes:['Cross-currency portfolio tracking with real-time ROAI metrics','SMS and CSV bank import with auto-categorisation','Privacy mode, keyboard shortcuts, and OLED dark mode'],
    techStack:null, techStack:['JavaScript','HTML','CSS','LocalStorage'] }
];

/* writeups: one entry → #writeups card (home, featured only) + writeups/index.html
   hub (all). href is the bare "<slug>.html" — the renderer prefixes "writeups/" for
   the home page and nothing for the hub, which already lives at /writeups/.
   "refs" is the CWE/CVE/OWASP reference line, plain trusted HTML like the other
   fields here. Canonical text is the writeups hub's (corrected in #20 — flagvault2
   CWE-125 not CWE-787, capture CWE-204 not CWE-200, simplectf CVSSv3.0 8.1/A03 not
   9.8/A01); the home page previously hand-duplicated the pre-correction numbers,
   which is exactly the drift this SSOT exists to make impossible. */
SITE.writeups = [
  { id:'domino', featured:true, delay:0, slug:'domino', icon:'&#x1F3B4;', org:'TryHackMe', name:'Domino',
    desc:'Chained seven weaknesses into a root shell and all 5 flags &mdash; user enumeration, IDOR, blind XSS session hijack, JWT alg:none forgery, RFI to RCE, password reuse, then a group-writable cron script.',
    refs:'CWE-203 &middot; CWE-639 &middot; CWE-79 &middot; CWE-347 &middot; CWE-98 &middot; CWE-522 &middot; CWE-732' },
  { id:'flagvault2', featured:true, delay:1, slug:'flagvault2', icon:'&#x1F9F5;', org:'TryHackMe', name:'Flag Vault 2',
    desc:'Exploited a format string vulnerability (CWE-134) in printf() to leak a flag from stack memory &mdash; no buffer overflow needed.',
    refs:'CWE-134 &middot; CWE-125 &middot; A03:2021' },
  { id:'flagvault', featured:true, delay:2, slug:'flagvault', icon:'&#x1F4BE;', org:'TryHackMe', name:'Flag Vault',
    desc:'Exploited a stack buffer overflow (CWE-121) via gets() to overwrite an adjacent stack variable and bypass authentication.',
    refs:'CWE-121 &middot; CWE-676 &middot; A04:2021' },
  { id:'capture', featured:true, delay:0, slug:'capture', icon:'&#x1F510;', org:'TryHackMe', name:'Capture!',
    desc:'Built a custom Python script to enumerate valid usernames via differential error messages and solve math-based CAPTCHAs programmatically.',
    refs:'CWE-307 &middot; CWE-204 &middot; A07:2021' },
  { id:'simplectf', featured:true, delay:1, slug:'simplectf', icon:'&#x1F3F3;', org:'TryHackMe', name:'Simple CTF',
    desc:'Exploited CVE-2019-9053 (time-based blind SQLi, CVSSv3.0 8.1) in CMS Made Simple to extract credentials, then escalated to root via vim sudo misconfiguration.',
    refs:'CVE-2019-9053 &middot; CWE-89 &middot; A03:2021' },
  { id:'picklerick', featured:true, delay:2, slug:'picklerick', icon:'&#x1F952;', org:'TryHackMe', name:'Pickle Rick',
    desc:'Retrieved credentials via information disclosure in HTML comments and robots.txt, then achieved RCE and root escalation through a misconfigured sudo policy.',
    refs:'CWE-540 &middot; CWE-284 &middot; A01:2021' }
];

function ssotEsc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

// Derived, not hand-listed: a fixed array silently stopped staggering once
// a list outgrew it (certs hit this at 6 entries/5-item array; badges hit it
// worse at 13 entries/11-item array, so the last two badges got no stagger
// at all). Cycles 1-5 so any number of badges or certs keeps a clean cascade
// forever. tools/ssot.mjs mirrors this exact formula for the no-JS fallback
// — keep both in sync if you ever change it.
function revealDelay(i){ return i === 0 ? '' : ' reveal-delay-' + (((i - 1) % 5) + 1); }

function renderCerts(){
  var grid = document.querySelector('#certifications .certs-grid');
  if(!grid) return;
  grid.innerHTML = SITE.certs.filter(function(c){ return c.featured; }).map(function(c, i){
    var foot;
    if(c.credentialId){
      var idInner = '<span class="lbl">Credential ID</span><span class="val">'+ssotEsc(c.credentialId)+'</span>';
      foot = c.certUrl
        ? '<a class="cert-card-id" href="'+ssotEsc(c.certUrl)+'" target="_blank" rel="noopener noreferrer">'+idInner+'</a>'
        : '<div class="cert-card-id">'+idInner+'</div>';
    } else if(c.pill && c.pill.href){
      foot = '<a class="cert-pill" href="'+ssotEsc(c.pill.href)+'" target="_blank" rel="noopener noreferrer">'+ssotEsc(c.pill.text)+'</a>';
    } else {
      foot = '<span class="cert-pill">'+(c.pill ? ssotEsc(c.pill.text) : '')+'</span>';
    }
    return '<div class="cert-card '+ssotEsc(c.cls)+' reveal'+revealDelay(i)+'">'
      + '<div class="cert-card-top"><div class="cert-card-badge" aria-hidden="true">'+c.badge+'</div>'
      + '<div class="cert-card-head"><span class="cert-card-issuer">'+ssotEsc(c.issuer)+'</span>'
      + '<div class="cert-card-name">'+ssotEsc(c.name)+'</div></div></div>'
      + '<div class="cert-card-foot">'+foot+'</div></div>';
  }).join('');
}

function renderBadges(){
  var grid = document.querySelector('#badges .badges-grid');
  if(!grid) return;
  grid.innerHTML = SITE.badges.filter(function(b){ return b.featured; }).map(function(b, i){
    var href = b.href || SITE.thmShare(b.slug);
    // Mirrors badgeAria() in tools/ssot.mjs, which is the definition; this file
    // is a plain script and cannot import it. check-consistency.mjs compares the
    // two, so a drift between them fails the build rather than shipping.
    var ariaBase = b.aria || (b.name + ' badge on TryHackMe');
    var aria = [ariaBase, b.tag, b.desc].filter(Boolean).join(' \u2014 ');
    // Escaped for the same reason as the Node renderer in tools/ssot.mjs:
  // these land inside a class attribute and must not be able to break out.
  var cls = 'badge-card ' + ssotEsc(b.tier) + (b.cls2 ? ' ' + ssotEsc(b.cls2) : '') + ' reveal' + revealDelay(i);
    return '<a class="'+cls+'" href="'+ssotEsc(href)+'" target="_blank" rel="noopener noreferrer" aria-label="'+ssotEsc(aria)+'">'
      + '<img src="'+ssotEsc(b.img)+'" alt="'+ssotEsc(b.name)+' badge" loading="lazy">'
      + '<span class="badge-name">'+ssotEsc(b.name)+'</span>'
      + '<span class="badge-tag">'+ssotEsc(b.tag)+'</span>'
      + '<span class="badge-desc">'+ssotEsc(b.desc)+'</span></a>';
  }).join('');
}

// project/writeup fields are trusted hand-authored HTML fragments (may contain
// &mdash;/&amp;/embedded <span>), not user input — rendered raw, not ssotEsc'd.
// Same trust model as c.badge above and the module comment in tools/ssot.mjs.
function projectCardHTML(p, i){
  var delayCls = p.delay ? ' reveal-delay-' + p.delay : '';
  var tech = p.techStack ? '<div class="tech-stack">' + p.techStack.map(function(t){ return '<span class="tech-badge">'+t+'</span>'; }).join('') + '</div>' : '';
  var outcomes = '<ul class="project-outcomes">' + p.outcomes.map(function(o){ return '<li>'+o+'</li>'; }).join('') + '</ul>';
  var inner = '<div class="project-icon" aria-hidden="true">'+p.icon+'</div>'
    + '<div><div class="project-org">'+p.org+'</div><h3>'+p.name+'</h3></div>'
    + '<p>'+p.desc+'</p>' + outcomes + tech;
  return p.href
    ? '<a href="'+ssotEsc(p.href)+'" target="_blank" rel="noopener noreferrer" class="project-card reveal'+delayCls+'" style="text-decoration:none;color:inherit;">'+inner+'</a>'
    : '<div class="project-card reveal'+delayCls+'">'+inner+'</div>';
}

function renderProjects(){
  var grid = document.querySelector('#projects .projects-grid');
  if(!grid || !SITE.projects) return;
  grid.innerHTML = SITE.projects.filter(function(p){ return p.featured; }).map(projectCardHTML).join('');
}

function writeupCardHTML(w, i, basePath){
  var href = (basePath || '') + w.slug + '.html';
  return '<a href="'+ssotEsc(href)+'" class="project-card reveal'+(w.delay ? ' reveal-delay-'+w.delay : '')+'" style="text-decoration:none;color:inherit;border-left:3px solid var(--accent2);">'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;"><div class="project-icon" aria-hidden="true">'+w.icon+'</div></div>'
    + '<div><div class="project-org">'+w.org+'</div><h3>'+w.name+'</h3></div>'
    + '<p>'+w.desc+'</p>'
    + '<div style="font-family:var(--font-mono);font-size:.68rem;color:var(--text3);margin:.4rem 0 .6rem;letter-spacing:.04em;">'+w.refs+'</div>'
    + '<span style="color:var(--accent);font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;margin-top:.4rem;">Read Writeup &rarr;</span></a>';
}

function renderWriteups(){
  var grid = document.querySelector('#writeups .projects-grid');
  if(!grid || !SITE.writeups) return;
  grid.innerHTML = SITE.writeups.filter(function(w){ return w.featured; }).map(function(w, i){ return writeupCardHTML(w, i, 'writeups/'); }).join('');
}

function renderJsonLd(){
  var el = document.querySelector('script[type="application/ld+json"]'); if(!el) return;
  var data; try{ data = JSON.parse(el.textContent); }catch(e){ return; }
  data.jobTitle = SITE.jobTitle;
  data.hasCredential = SITE.certs.filter(function(c){ return c.earned; }).map(function(c){
    return { '@type':'EducationalOccupationalCredential', name: c.jsonLdName || c.name, credentialCategory:'certification', recognizedBy: { '@type':'Organization', name: c.issuer } };
  });
  data.knowsAbout = SITE.knowsAbout;
  // Keep the graph's self-description in step with the visible one.
  if(SITE.identity && SITE.identity.metaDescription) data.description = SITE.identity.metaDescription;
  el.textContent = JSON.stringify(data, null, 2);
}

function renderIdentity(){
  var id = SITE.identity; if(!id) return;
  if(id.title) document.title = id.title;
  function m(sel, val){ var el = document.querySelector(sel); if(el && val) el.setAttribute('content', val); }
  m('meta[name="description"]', id.metaDescription);
  m('meta[property="og:title"]', id.ogTitle);
  m('meta[property="og:description"]', id.ogDescription);
  m('meta[name="twitter:title"]', id.twTitle);
  m('meta[name="twitter:description"]', id.twDescription);
}


/* Writes SITE.thm into every [data-thm] node. The Node generator writes the
   same values into the same nodes, so the static markup a crawler sees and the
   runtime DOM cannot disagree. */
function renderThm(){
  if(!window.SITE || !SITE.thm) return;
  var v = SITE.thmDisplay(SITE.thm);
  document.querySelectorAll('[data-thm]').forEach(function(el){
    var k = el.getAttribute('data-thm');
    if(v[k] !== undefined) el.textContent = v[k];
  });
}

function renderAll(){
  // renderThm() used to sit outside this try. A throw there halted the whole
  // script before the loading screen's failsafe timer was registered, leaving
  // a permanent black screen instead of a degraded page.
  try { renderThm(); renderCerts(); renderBadges(); renderProjects(); renderWriteups(); renderIdentity(); renderJsonLd(); }
  catch(e){ console.error('[SSOT] render failed:', e); }
}
renderAll();

// ── LOADING SCREEN ────────────────────────────────────────
(function(){
  var lines = [
    { text: '[SYS]  Booting security profile...', cls: 't-out', delay: 200 },
    { text: '[OK]   GCHQ-accredited credentials loaded', cls: 't-green', delay: 500 },
    { text: '[OK]   CEH certification verified: ECC9421760853', cls: 't-green', delay: 800 },
    { text: '[OK]   TryHackMe :: Jr Pentest Path complete', cls: 't-green', delay: 1100 },
    { text: '[WARN] Offensive security mode: ACTIVE', cls: 't-yellow', delay: 1400 },
    { text: '[OK]   Portfolio initialised. Welcome.', cls: 't-green', delay: 1700 }
  ];
  var container = document.getElementById('loaderLines');
  var bar = document.getElementById('loaderBar');
  var loader = document.getElementById('loader');
  lines.forEach(function(l, i) {
    setTimeout(function(){
      var el = document.createElement('div');
      el.className = 'loader-line ' + l.cls;
      el.textContent = l.text;
      container.appendChild(el);
      requestAnimationFrame(function(){ setTimeout(function(){ el.classList.add('show'); }, 10); });
      bar.style.width = ((i+1)/lines.length*100) + '%';
    }, l.delay);
  });
  function dismissLoader() {
    loader.classList.add('fade-out');
    setTimeout(function(){ loader.style.display = 'none'; }, 700);
  }
  // The loading screen is a real loading window, not just decoration: the
  // deferred GSAP bundle, the fonts and the images all arrive behind it. So
  // dismiss when the page is genuinely ready rather than on a fixed timer -
  // 2400ms becomes a MINIMUM so the animation is never cut off mid-beat, and
  // the wait is only longer than that if something is actually still loading.
  var loaderShownAt = Date.now(), MIN_SHOW = 2400;
  function dismissWhenReady(){
    var waited = Date.now() - loaderShownAt;
    if(waited < MIN_SHOW){ setTimeout(dismissWhenReady, MIN_SHOW - waited); return; }
    dismissLoader();
  }
  if(document.readyState === 'complete'){ dismissWhenReady(); }
  else { window.addEventListener('load', dismissWhenReady); }
  // Safety fallback — force dismiss after 5s no matter what
  setTimeout(function(){ if(loader && loader.style.display !== 'none'){ dismissLoader(); } }, 5000);
})();

// ── SCROLL PROGRESS ───────────────────────────────────────
function updateProgress(){
  var scrollTop = window.scrollY;
  var docH = document.documentElement.scrollHeight - window.innerHeight;
  var pct = docH > 0 ? (scrollTop / docH) * 100 : 0;
  document.getElementById('progress-fill').style.height = pct + '%';
  document.getElementById('progress-dot').style.top = pct + '%';
}

// ── SCROLL REVEAL + NAVBAR ────────────────────────────────
var navbar = document.getElementById('navbar');
// Coalesced into one requestAnimationFrame. Previously all four jobs ran on
// every scroll event, and updateActiveNav() does a querySelectorAll per call,
// so a fast scroll did far more layout reads than there are frames to paint.
// One flag means at most one pass per frame no matter how many events fire.
var scrollQueued = false;
function onScrollFrame(){
  scrollQueued = false;
  var y = window.scrollY;
  navbar.classList.toggle('scrolled', y > 50);
  document.getElementById('backToTop').classList.toggle('visible', y > 400);
  updateProgress();
  updateActiveNav();
}
window.addEventListener('scroll', function(){
  if(scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(onScrollFrame);
}, { passive: true });
// Run once at load so a page restored mid-scroll is correct before any event.
onScrollFrame();

// ── ACTIVE NAV HIGHLIGHT ──────────────────────────────────
function updateActiveNav(){
  // Derived from the nav itself rather than hardcoded. A hardcoded list
  // silently stopped highlighting when the Writeups section was added, so a
  // new section with a nav link is now picked up automatically.
  var sections = Array.prototype.map.call(
    document.querySelectorAll('.nav-links a[href^="#"]'),
    function(a){ return a.getAttribute('href').slice(1); }
  ).filter(function(id){ return id && document.getElementById(id); });
  var scrollY = window.scrollY + 120;
  var current = '';
  sections.forEach(function(id){
    var el = document.getElementById(id);
    if(!el) return;
    if(el.offsetTop <= scrollY) current = id;
  });
  document.querySelectorAll('.nav-links a').forEach(function(a){
    var href = a.getAttribute('href');
    if(href === '#' + current) a.classList.add('active');
    else a.classList.remove('active');
  });
  document.querySelector('.nav-logo').classList.toggle('active', current === '');
}
updateActiveNav();

// ── OVERLAY / FOCUS-TRAP HELPERS (shared by mobile menu + terminal) ──────
// `inert` removes the rest of the page from tab order, click, and the
// accessibility tree while a modal overlay is open. Feature-detected so
// browsers without it just fall back to the JS Tab trap below.
var INERT_SUPPORTED = (function(){
  try { return 'inert' in document.createElement('div'); } catch(e){ return false; }
})();
function inertTargets(){
  return [
    document.querySelector('.skip-link'),
    document.getElementById('navbar'),
    document.getElementById('main'),
    document.querySelector('footer')
  ].filter(Boolean);
}
var openOverlayCount = 0;
function lockBackground(){
  openOverlayCount++;
  if(!INERT_SUPPORTED || openOverlayCount !== 1) return;
  inertTargets().forEach(function(el){ el.setAttribute('inert', ''); });
}
function unlockBackground(){
  openOverlayCount = Math.max(0, openOverlayCount - 1);
  if(!INERT_SUPPORTED || openOverlayCount !== 0) return;
  inertTargets().forEach(function(el){ el.removeAttribute('inert'); });
}
var FOCUSABLE_SEL = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
function getFocusable(container){
  return Array.prototype.slice.call(container.querySelectorAll(FOCUSABLE_SEL)).filter(function(el){
    return el.offsetParent !== null;
  });
}
// Wraps Tab / Shift+Tab within `container`. Call from a keydown listener
// while the overlay owning `container` is open.
function trapTabKey(container, e){
  if(e.key !== 'Tab') return;
  var focusable = getFocusable(container);
  if(focusable.length === 0){ e.preventDefault(); return; }
  var first = focusable[0], last = focusable[focusable.length - 1];
  var active = document.activeElement;
  if(e.shiftKey){
    if(active === first || !container.contains(active)){ e.preventDefault(); last.focus(); }
  } else {
    if(active === last || !container.contains(active)){ e.preventDefault(); first.focus(); }
  }
}

// ── MOBILE MENU ───────────────────────────────────────────
var hamburger = document.getElementById('hamburger');
var mobileMenu = document.getElementById('mobileMenu');
var mmReturnFocus = null;
function mobileMenuKeydown(e){
  if(e.key === 'Escape'){ e.preventDefault(); closeMobileMenu(); return; }
  trapTabKey(mobileMenu, e);
}
function openMobileMenu(){
  mmReturnFocus = document.activeElement;
  mobileMenu.classList.add('open');
  hamburger.setAttribute('aria-expanded','true');
  lockBackground();
  document.addEventListener('keydown', mobileMenuKeydown);
  setTimeout(function(){ var f = getFocusable(mobileMenu); (f[0] || mobileMenu).focus(); }, 50);
}
function closeMobileMenu(){
  if(!mobileMenu.classList.contains('open')) return;
  mobileMenu.classList.remove('open');
  hamburger.setAttribute('aria-expanded','false');
  document.removeEventListener('keydown', mobileMenuKeydown);
  unlockBackground();
  if(mmReturnFocus && typeof mmReturnFocus.focus === 'function'){ mmReturnFocus.focus(); }
  mmReturnFocus = null;
}
hamburger.addEventListener('click', openMobileMenu);
document.getElementById('mobileClose').addEventListener('click', closeMobileMenu);
document.querySelectorAll('.mm-link').forEach(function(l){ l.addEventListener('click', closeMobileMenu); });

// ── SCROLL REVEAL ─────────────────────────────────────────
var revealObs = new IntersectionObserver(function(entries){
  entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('visible'); revealObs.unobserve(e.target); } });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(function(el){ revealObs.observe(el); });

// ── TYPEWRITER ROLE ROTATOR ───────────────────────────────
(function(){
  var roles = (window.SITE && SITE.identity && SITE.identity.roles) || ['Junior Penetration Tester', 'Security Analyst', 'Ethical Hacker', 'Offensive Security', 'Red Team Aspirant', 'CTF Competitor', 'Security Researcher'];
  var el = document.getElementById('role-text');
  var roleIdx = 0, charIdx = 0, deleting = false;
  function type(){
    var current = roles[roleIdx];
    if(!deleting){
      el.textContent = current.slice(0, charIdx + 1);
      charIdx++;
      if(charIdx === current.length){ deleting = true; setTimeout(type, 1800); return; }
      setTimeout(type, 80);
    } else {
      el.textContent = current.slice(0, charIdx - 1);
      charIdx--;
      if(charIdx === 0){ deleting = false; roleIdx = (roleIdx + 1) % roles.length; }
      setTimeout(type, 40);
    }
  }
  setTimeout(type, 2600);
})();

// ── THEME TOGGLE ─────────────────────────────────────────
function toggleTheme(){
  var html = document.documentElement;
  var isDark = html.getAttribute('data-theme') === 'dark';
  var next = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  document.querySelector('meta[name="theme-color"]').setAttribute('content', isDark ? '#0077aa' : '#00d4ff');
  document.getElementById('theme-icon-sun').style.display = isDark ? 'none' : 'block';
  document.getElementById('theme-icon-moon').style.display = isDark ? 'block' : 'none';
  document.getElementById('theme-toggle').setAttribute('aria-label', isDark ? 'Switch to dark mode' : 'Switch to light mode');
}
(function(){
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.getElementById('theme-icon-sun').style.display = isDark ? 'block' : 'none';
  document.getElementById('theme-icon-moon').style.display = isDark ? 'none' : 'block';
  document.getElementById('theme-toggle').setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
})();

// ── CONTACT FORM ─────────────────────────────────────────
function handleFormSubmit(){
  var name = document.getElementById('fname').value.trim();
  var email = document.getElementById('femail').value.trim();
  var msg = document.getElementById('fmsg').value.trim();
  var notice = document.getElementById('formNotice');
  if(!name||!email||!msg){ notice.style.color='var(--danger)'; notice.textContent='Please fill in all fields.'; return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ notice.style.color='var(--danger)'; notice.textContent='Please enter a valid email.'; return; }
  window.location.href = 'mailto:atharvak161@gmail.com?subject=' + encodeURIComponent('Enquiry from '+name) + '&body=' + encodeURIComponent('Hi Atharva,\n\n'+msg);
  document.getElementById('fname').value = '';
  document.getElementById('femail').value = '';
  document.getElementById('fmsg').value = '';
  notice.style.color='var(--accent2)'; notice.textContent='Opening your email client...';
}

// ── TERMINAL EASTER EGG ───────────────────────────────────
var terminalOpen = false;
var termBody = document.getElementById('terminalBody');
var termInput = document.getElementById('terminal-input');
var termOverlay = document.getElementById('terminal-overlay');
var termHistory = [];
var termHistIdx = -1;

var termResponses = {
  'whoami': [
    { t:'t-green', v:'atharva_kulkarni' },
    { t:'t-out', v:'Role     : Security Analyst | Transitioning to Offensive Security' },
    { t:'t-out', v:'Certs    : CEH V12 | MSc Applied Cyber Security (GCHQ)' },
    { t:'t-out', v:'Location : London, UK' },
    { t:'t-out', v:'Focus    : Penetration Testing → Red Teaming' }
  ],
  'help': [
    { t:'t-yellow', v:'Available commands:' },
    { t:'t-out', v:'  whoami          — identity info' },
    { t:'t-out', v:'  ls projects     — list projects' },
    { t:'t-out', v:'  cat skills.txt  — view skill set' },
    { t:'t-out', v:'  cat certs.txt   — view certifications' },
    { t:'t-out', v:'  cat badges.txt  — badges + view links' },
    { t:'t-out', v:'  cat projects.txt— projects + repo links' },
    { t:'t-out', v:'  cat about.txt   — about me' },
    { t:'t-out', v:'  sudo hire-me    — availability' },
    { t:'t-out', v:'  goto <section>  — jump to a section' },
    { t:'t-out', v:'  nmap localhost  — port scan' },
    { t:'t-out', v:'  clear           — clear terminal' },
    { t:'t-out', v:'  exit            — close terminal' }
  ],
  'nmap localhost': [
    { t:'t-out', v:'Starting Nmap scan on 127.0.0.1...' },
    { t:'t-out', v:'PORT     STATE  SERVICE' },
    { t:'t-green', v:'22/tcp   open   ssh' },
    { t:'t-green', v:'80/tcp   open   http' },
    { t:'t-green', v:'443/tcp  open   https' },
    { t:'t-out', v:'Nmap done: 1 IP address (1 host up)' }
  ],
  'cat about.txt': [
    { t:'t-out', v:'Atharva Kulkarni — Security Analyst transitioning into offensive security.' },
    { t:'t-out', v:'MSc Applied Cyber Security (GCHQ-accredited) | CEH V12 Certified.' },
    { t:'t-out', v:'3+ years of enterprise IT & security operations experience.' },
    { t:'t-out', v:'Focus: Penetration Testing & Red Teaming. Based in London, UK.' }
  ],
  'sudo hire-me': [
    { t:'t-green', v:'[sudo] access granted ✓' },
    { t:'t-out', v:'Open to Junior Penetration Tester / Security Analyst roles in London/UK.' },
    { t:'t-out', v:'Reach out via the Contact section below, or grab the resume.' },
    { t:'t-yellow', v:'Tip: try "goto contact" or "goto resume".' }
  ],
  'exit': [{ t:'t-out', v:'Closing terminal...' }]
};

function termPrint(lines){
  lines.forEach(function(l){
    var div = document.createElement('div');
    div.className = 't-line ' + l.t;
    if(l.url){
      // Clickable verify/share link — opens in a new tab so the terminal (and
      // the portfolio) is never lost. The raw URL is NEVER shown; it lives behind
      // a human label (l.linkText) so the terminal stays clean for every case.
      // textContent (not innerHTML) keeps it XSS-safe.
      if(l.v) div.textContent = l.v + ' ';
      var a = document.createElement('a');
      a.className = 't-link';
      a.href = l.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = l.linkText || 'open ↗';
      div.appendChild(a);
    } else {
      div.textContent = l.v;
    }
    termBody.appendChild(div);
  });
  termBody.scrollTop = termBody.scrollHeight;
}

function termPromptLine(cmd){
  var div = document.createElement('div');
  div.className = 't-line';
  var prompt = document.createElement('span');
  prompt.className = 't-prompt';
  prompt.textContent = 'atharva@portfolio:~$ ';
  var cmdSpan = document.createElement('span');
  cmdSpan.className = 't-cmd';
  cmdSpan.textContent = cmd;
  div.appendChild(prompt);
  div.appendChild(cmdSpan);
  termBody.appendChild(div);
}

function termSlugify(s){
  return s.toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Live-read a project's link exactly as the Projects section uses it — the card's
// own href (jobscope/finance → GitHub, the rest → live demo). Non-link cards
// (academic work) and self/hash links return '' so they get no terminal link.
function projectLink(card){
  var linkEl = card.tagName === 'A' ? card : card.querySelector('a[href]');
  if(!linkEl) return '';
  var href = linkEl.href; // resolved absolute
  if(!/^https?:\/\//.test(href)) return '';
  if(href.replace(/#.*$/, '') === location.href.replace(/#.*$/, '')) return '';
  return href;
}
function projectLinkLabel(href){
  return /github\.com/.test(href) ? '→ view on GitHub ↗' : '→ view demo ↗';
}
// Org text with any github.com/... token stripped, so the raw URL is never shown
// in the terminal (it lives behind the clickable link instead).
function projectOrgClean(card){
  var org = card.querySelector('.project-org');
  if(!org) return '';
  return org.textContent.trim()
    .replace(/\s*·?\s*github\.com\/\S+/i, '')
    .replace(/\s*·\s*$/, '')
    .trim();
}

function buildLsProjects(){
  var cards = document.querySelectorAll('#projects .project-card');
  if(!cards.length) return [{ t:'t-out', v:'none found' }];
  var lines = [];
  cards.forEach(function(card){
    var h = card.querySelector('h3');
    var slug = termSlugify((h ? h.textContent : 'project').trim());
    var link = projectLink(card);
    if(link){ lines.push({ t:'t-green', v:'drwxr-xr-x  ', url: link, linkText: slug + '/' }); }
    else { lines.push({ t:'t-green', v:'drwxr-xr-x  ' + slug + '/' }); }
  });
  return lines;
}

function buildProjectsTxt(){
  // Full set from the SSOT - see buildCertsTxt above for why.
  if(window.SITE && SITE.projects && SITE.projects.length){
    var out = [];
    SITE.projects.forEach(function(p){
      var org = (p.org || '').replace(/<[^>]*>/g, '').replace(/&middot;/g, '\u00b7').trim();
      out.push({ t:'t-green', v:'[*] ' + p.name.replace(/&mdash;/g, '\u2014') + (org ? '  (' + org + ')' : '') });
      if(p.href){ out.push({ t:'t-out', v:'   ', url: p.href, linkText: projectLinkLabel(p.href) }); }
    });
    return out;
  }
  var cards = document.querySelectorAll('#projects .project-card');
  if(!cards.length) return [{ t:'t-out', v:'none found' }];
  var lines = [];
  cards.forEach(function(card){
    var h = card.querySelector('h3');
    var name = h ? h.textContent.trim() : 'Project';
    var org = projectOrgClean(card);
    lines.push({ t:'t-green', v:'[*] ' + name + (org ? '  (' + org + ')' : '') });
    // Link mirrors the Projects section exactly; URL hidden behind a clean label.
    var link = projectLink(card);
    if(link){ lines.push({ t:'t-out', v:'   ', url: link, linkText: projectLinkLabel(link) }); }
  });
  return lines;
}

function buildSkillsTxt(){
  var cats = document.querySelectorAll('#skills .skill-category');
  if(!cats.length) return [{ t:'t-out', v:'none found' }];
  var lines = [];
  cats.forEach(function(cat){
    var h3 = cat.querySelector('h3');
    var name = h3 ? h3.textContent.trim() : 'Unknown';
    var tags = Array.prototype.map.call(cat.querySelectorAll('.skill-tag'), function(t){ return t.textContent.trim(); });
    lines.push({ t:'t-out', v:'[' + name + ']  ' + tags.join(', ') });
  });
  return lines;
}

function buildCertsTxt(){
  // Reads the SSOT, not the home-page DOM. The home page now shows only the
  // featured subset, but `cat certs.txt` should list the whole file - a
  // filtered listing under that name would be a lie. Still no baked-in copy:
  // SITE.certs is the same source the cards are generated from.
  if(window.SITE && SITE.certs && SITE.certs.length){
    return SITE.certs.map(function(c){
      var label = c.credentialId || (c.pill && c.pill.text) || 'Verified';
      return { t:'t-green', v:'[+] ' + c.name + '  :: ' + label };
    });
  }
  var cards = document.querySelectorAll('#certifications .cert-card');
  if(!cards.length) return [{ t:'t-out', v:'none found' }];
  var lines = [];
  cards.forEach(function(card){
    var nameEl = card.querySelector('.cert-card-name');
    var name = nameEl ? nameEl.textContent.trim() : 'Unknown Certification';
    var idEl = card.querySelector('.cert-card-id .val');
    var pillEl = card.querySelector('.cert-pill');
    var label = idEl ? idEl.textContent.trim() : (pillEl ? pillEl.textContent.trim() : 'Verified');
    lines.push({ t:'t-green', v:'[+] ' + name + '  :: ' + label });
  });
  return lines;
}

function buildBadgesTxt(){
  // Full set from the SSOT - see buildCertsTxt above for why.
  if(window.SITE && SITE.badges && SITE.badges.length){
    var out = [];
    SITE.badges.forEach(function(b){
      out.push({ t:'t-green', v:'[*] ' + b.name + (b.tag ? '  [' + b.tag + ']' : '') });
      if(b.href || b.slug){
        out.push({ t:'t-out', v:'   ',
          url: b.href || ('https://tryhackme.com/AtharvaK911/badges/' + b.slug),
          linkText: '\u2192 view badge \u2197' });
      }
    });
    return out;
  }
  var cards = document.querySelectorAll('#badges .badge-card');
  if(!cards.length) return [{ t:'t-out', v:'none found' }];
  var lines = [];
  cards.forEach(function(card){
    var nameEl = card.querySelector('.badge-name');
    var name = nameEl ? nameEl.textContent.trim() : 'Badge';
    var tagEl = card.querySelector('.badge-tag');
    var tag = tagEl ? '  [' + tagEl.textContent.trim() + ']' : '';
    lines.push({ t:'t-green', v:'[*] ' + name + tag });
    if(card.href) lines.push({ t:'t-out', v:'   ', url: card.href, linkText: '→ view badge ↗' });
  });
  return lines;
}

var termReturnFocus = null;
function openTerminal(){
  terminalOpen = true;
  // Remember what had focus so Escape returns the user there.
  termReturnFocus = document.activeElement;
  termOverlay.classList.add('open');
  lockBackground();
  if(termBody.children.length === 0){
    termPrint([
      { t:'t-green', v:'AK Security Terminal v1.0' },
      { t:'t-out',   v:'Type "help" for available commands.' },
      { t:'t-out',   v:'' }
    ]);
  }
  setTimeout(function(){ termInput.focus(); }, 100);
}

function closeTerminal(){
  terminalOpen = false;
  termOverlay.classList.remove('open');
  unlockBackground();
  if(termReturnFocus && typeof termReturnFocus.focus === "function"){
    termReturnFocus.focus(); termReturnFocus = null;
  }
}

termInput.addEventListener('keydown', function(e){
  if(e.key === 'ArrowUp'){ e.preventDefault(); if(termHistIdx < termHistory.length-1){ termHistIdx++; termInput.value = termHistory[termHistIdx]; } }
  if(e.key === 'ArrowDown'){ e.preventDefault(); if(termHistIdx > 0){ termHistIdx--; termInput.value = termHistory[termHistIdx]; } else { termHistIdx=-1; termInput.value=''; } }
  if(e.key !== 'Enter') return;
  var cmd = termInput.value.trim().toLowerCase();
  termInput.value = '';
  if(!cmd) return;
  termHistory.unshift(cmd); termHistIdx = -1;
  termPromptLine(cmd);
  if(cmd === 'clear'){ termBody.innerHTML = ''; return; }
  if(cmd === 'exit'){ termPrint([{t:'t-out',v:'Goodbye.'}]); setTimeout(closeTerminal, 600); return; }
  if(cmd.indexOf('goto ') === 0 || cmd.indexOf('cd ') === 0){
    var target = cmd.slice(cmd.indexOf(' ') + 1).trim();
    // Derived from the nav, exactly as updateActiveNav() does, so a new section
    // works in `goto` the moment it has a nav link. This was a hardcoded
    // 17-entry literal while the nav highlighter was already derived, so the
    // next section added would have highlighted correctly in the nav and
    // returned "section not found" here.
    var sectionMap = {};
    Array.prototype.forEach.call(
      document.querySelectorAll('.nav-links a[href^="#"]'),
      function(a){
        var id = a.getAttribute('href').slice(1);
        if(id && document.getElementById(id)) sectionMap[id] = id;
      }
    );
    // Aliases only. These are shorthands a person might type, not sections, so
    // they stay a literal - but each resolves to a real id above, and one that
    // no longer exists simply drops out.
    var ALIASES = {
      exp:'experience', edu:'education', certs:'certifications',
      cert:'certifications', badge:'badges', reviews:'testimonials', resume:'cv'
    };
    Object.keys(ALIASES).forEach(function(k){
      if(sectionMap[ALIASES[k]]) sectionMap[k] = ALIASES[k];
    });
    var id = sectionMap[target];
    if(id){
      termPrint([{t:'t-green', v:'> navigating to ' + target + '...'}]);
      var sec = document.getElementById(id);
      if(sec) sec.scrollIntoView({behavior:'smooth', block:'start'});
      setTimeout(closeTerminal, 500);
    } else {
      termPrint([{t:'t-red', v:'goto: section not found: ' + target}]);
    }
    termBody.scrollTop = termBody.scrollHeight;
    return;
  }
  if(cmd === 'ls projects'){ termPrint(buildLsProjects()); termBody.scrollTop = termBody.scrollHeight; return; }
  if(cmd === 'cat projects.txt'){ termPrint(buildProjectsTxt()); termBody.scrollTop = termBody.scrollHeight; return; }
  if(cmd === 'cat skills.txt'){ termPrint(buildSkillsTxt()); termBody.scrollTop = termBody.scrollHeight; return; }
  if(cmd === 'cat certs.txt'){ termPrint(buildCertsTxt()); termBody.scrollTop = termBody.scrollHeight; return; }
  if(cmd === 'cat badges.txt'){ termPrint(buildBadgesTxt()); termBody.scrollTop = termBody.scrollHeight; return; }
  var resp = termResponses[cmd];
  if(resp){ termPrint(resp); }
  else { termPrint([{t:'t-red', v:'bash: ' + cmd + ': command not found. Try "help".'}]); }
  termBody.scrollTop = termBody.scrollHeight;
});

document.addEventListener('keydown', function(e){
  if(e.ctrlKey && e.altKey && e.key.toLowerCase() === 't'){ e.preventDefault(); terminalOpen ? closeTerminal() : openTerminal(); }
  if(e.metaKey && e.altKey && e.code === 'KeyT'){ e.preventDefault(); terminalOpen ? closeTerminal() : openTerminal(); }
  if(e.key === 'Escape' && terminalOpen){ closeTerminal(); return; }
  if(terminalOpen) trapTabKey(termOverlay, e);
});



// ── GLITCH EFFECT ON SECTION TITLES ──────────────────────
function triggerGlitch(el) {
  el.classList.add('glitching');
  setTimeout(function(){ el.classList.remove('glitching'); }, 600);
}



// ── CV IFRAME FALLBACK ────────────────────────────────────
// An embedded PDF that fails to render does NOT fire the iframe 'error'
// event, so we also run a load-timeout probe: once the frame is in view
// (it's loading="lazy") we wait a few seconds for a 'load' signal; if none
// arrives, we reveal the fallback. The 200-OK normal case fires 'load' well
// within the window, so it is never regressed.
(function(){
  var frame = document.getElementById('cvFrame');
  var fallback = document.getElementById('cvFallback');
  if(!frame || !fallback) return;
  var loaded = false, probeStarted = false;
  function showFallback(){
    if(loaded) return;
    frame.style.display = 'none';
    fallback.style.display = 'block';
  }
  frame.addEventListener('load', function(){ loaded = true; });
  frame.addEventListener('error', showFallback);
  function startProbe(){
    if(probeStarted) return;
    probeStarted = true;
    setTimeout(showFallback, 6000);
  }
  // Defer the probe until the lazy iframe has actually entered view.
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(en.isIntersecting){ startProbe(); io.disconnect(); } });
    }, { threshold: 0.01 });
    io.observe(frame);
  } else {
    startProbe();
  }
})();


// ── PRINT CV ──────────────────────────────────────────────
function printCV() {
  // Print the CV that is already embedded on this page. #cvFrame is same-origin,
  // so its document can be printed directly and the browser's real print dialog
  // opens without leaving the page.
  //
  // The old code called window.open(url, '_blank', 'noopener'), which returns
  // null by spec, so its win.print() was dead and this button only ever opened
  // a tab - exactly what the "Full Screen" button beside it already does. Two
  // buttons, one behaviour.
  var frame = document.getElementById('cvFrame');
  try {
    if (frame && frame.contentWindow) {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      return;
    }
  } catch (e) {
    // Some PDF viewers refuse a scripted print(); fall through to the fallback.
  }
  // Fallback: the frame is loading="lazy" so it may not be ready yet, or the
  // viewer blocked print(). Opening the file hands the job to the viewer's own
  // print control rather than failing silently.
  window.open('Atharva_Kulkarni_Resume.pdf', '_blank', 'noopener');
}


// ── HERO NAME INTERMITTENT GLITCH — CINEMATIC ────────────
(function(){
  var els;

  function runBurst(count) {
    if(!els) els = document.querySelectorAll('.hero-name-glitch');
    if(count <= 0) return;
    els.forEach(function(el){ el.classList.add('is-glitching'); });
    setTimeout(function(){
      els.forEach(function(el){ el.classList.remove('is-glitching'); });
      // Short pause then another burst if count > 1
      if(count > 1) {
        setTimeout(function(){ runBurst(count - 1); }, 80 + Math.random() * 120);
      }
    }, 600);
  }

  function scheduleGlitch() {
    // Fire 1-3 rapid bursts in a row (like a bad signal)
    var bursts = 1 + Math.floor(Math.random() * 3);
    runBurst(bursts);
    // Wait 5-15 seconds before next sequence
    setTimeout(scheduleGlitch, 5000 + Math.random() * 10000);
  }

  // First hit after 3.5s
  setTimeout(scheduleGlitch, 3500);
})();

// ── CANVAS ANIMATION ─────────────────────────────────────
(function(){
  var canvas = document.getElementById('net-canvas');
  var ctx = canvas.getContext('2d');
  var W, H, nodes, packets;
  var mouse = {x:-9999,y:-9999};
  var NODE_COUNT=120, MAX_DIST=185, MOUSE_DIST=230;
  var CYAN='#00d4ff', GREEN='#00ff9d', PURPLE='#a855f7';
  var tick=0;
  function resize(){ W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; }
  function rand(a,b){ return a+Math.random()*(b-a); }
  function rgba(hex,a){ var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return 'rgba('+r+','+g+','+b+','+a+')'; }
  function init(){
    nodes=[]; packets=[];
    for(var i=0;i<NODE_COUNT;i++){
      var t=Math.random();
      nodes.push({x:Math.random()*W,y:Math.random()*H,vx:rand(-0.25,0.25),vy:rand(-0.25,0.25),r:t>0.93?rand(4,7):t>0.78?rand(2.5,4):rand(1,2.2),pulse:Math.random()*Math.PI*2,pSpeed:rand(0.01,0.03),color:t>0.93?'c':t>0.78?'g':t>0.62?'p':'d',scanP:-1,scanT:rand(60,250),ring2P:-1,ring2T:rand(200,500)});
    }
  }
  function spawnPacket(){
    var ai=Math.floor(Math.random()*nodes.length), bi=Math.floor(Math.random()*nodes.length);
    if(ai===bi) return;
    var a=nodes[ai],b=nodes[bi];
    var dx=b.x-a.x,dy=b.y-a.y;
    if(Math.sqrt(dx*dx+dy*dy)>MAX_DIST*1.5) return;
    packets.push({sx:a.x,sy:a.y,tx:b.x,ty:b.y,p:0,speed:rand(0.007,0.02),col:Math.random()>0.5?CYAN:GREEN});
  }
  function drawHexGrid(){
    var size=40,w=size*2,h=Math.sqrt(3)*size;
    ctx.lineWidth=0.35;
    for(var row=-1;row<H/h+2;row++){
      for(var col=-1;col<W/(w*0.75)+2;col++){
        var cx=col*w*0.75, cy=row*h+(col%2===0?0:h/2);
        var proximity=0;
        if(mouse.x>-100){var dx=cx-mouse.x,dy2=cy-mouse.y,md=Math.sqrt(dx*dx+dy2*dy2); if(md<250) proximity=(1-md/250)*0.22;}
        ctx.beginPath();
        for(var k=0;k<6;k++){var ang=Math.PI/180*(60*k-30); k===0?ctx.moveTo(cx+size*Math.cos(ang),cy+size*Math.sin(ang)):ctx.lineTo(cx+size*Math.cos(ang),cy+size*Math.sin(ang));}
        ctx.closePath(); ctx.strokeStyle=rgba(CYAN,0.032+proximity); ctx.stroke();
      }
    }
  }
  function frame(){
    ctx.clearRect(0,0,W,H); tick++;
    drawHexGrid();
    if(tick%12===0) spawnPacket();
    for(var i=0;i<nodes.length;i++){
      var a=nodes[i];
      for(var j=i+1;j<nodes.length;j++){
        var b=nodes[j],dx=a.x-b.x,dy=a.y-b.y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<MAX_DIST){
          var fade=1-d/MAX_DIST,col,al,lw;
          if(a.color==='c'||b.color==='c'){col=CYAN;al=fade*0.55;lw=fade*1.4;}
          else if(a.color==='g'||b.color==='g'){col=GREEN;al=fade*0.42;lw=fade*1.0;}
          else if(a.color==='p'||b.color==='p'){col=PURPLE;al=fade*0.32;lw=fade*0.8;}
          else{col='#1e4a5a';al=fade*0.28;lw=fade*0.6;}
          if(fade>0.6){ctx.shadowColor=col;ctx.shadowBlur=4*fade;}
          ctx.beginPath();ctx.strokeStyle=rgba(col,al);ctx.lineWidth=lw;ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.shadowBlur=0;
        }
      }
      var mdx=a.x-mouse.x,mdy=a.y-mouse.y,md=Math.sqrt(mdx*mdx+mdy*mdy);
      if(md<MOUSE_DIST){var mf=1-md/MOUSE_DIST;ctx.shadowColor=CYAN;ctx.shadowBlur=6*mf;ctx.beginPath();ctx.strokeStyle=rgba(CYAN,mf*0.7);ctx.lineWidth=mf*2;ctx.moveTo(a.x,a.y);ctx.lineTo(mouse.x,mouse.y);ctx.stroke();ctx.shadowBlur=0;}
    }
    for(var i=packets.length-1;i>=0;i--){
      var pk=packets[i]; pk.p+=pk.speed;
      var px=pk.sx+(pk.tx-pk.sx)*pk.p, py=pk.sy+(pk.ty-pk.sy)*pk.p;
      var px2=pk.sx+(pk.tx-pk.sx)*Math.max(0,pk.p-0.06), py2=pk.sy+(pk.ty-pk.sy)*Math.max(0,pk.p-0.06);
      ctx.shadowColor=pk.col;ctx.shadowBlur=14;
      ctx.beginPath();ctx.arc(px,py,3,0,Math.PI*2);ctx.fillStyle=rgba(pk.col,1);ctx.fill();
      ctx.beginPath();ctx.arc(px2,py2,1.5,0,Math.PI*2);ctx.fillStyle=rgba(pk.col,0.4);ctx.fill();
      ctx.shadowBlur=0;
      if(pk.p>=1) packets.splice(i,1);
    }
    for(var i=0;i<nodes.length;i++){
      var n=nodes[i]; n.pulse+=n.pSpeed; var ps=0.75+0.25*Math.sin(n.pulse);
      var col,al,glow;
      if(n.color==='c'){col=CYAN;al=0.95*ps;glow=20*ps;}
      else if(n.color==='g'){col=GREEN;al=0.85*ps;glow=14*ps;}
      else if(n.color==='p'){col=PURPLE;al=0.75*ps;glow=10*ps;}
      else{col='#4a8a9a';al=0.55;glow=0;}
      ctx.shadowColor=col;ctx.shadowBlur=glow;
      ctx.beginPath();ctx.arc(n.x,n.y,n.r*ps,0,Math.PI*2);ctx.fillStyle=rgba(col,al);ctx.fill();
      if(glow>0){ctx.beginPath();ctx.arc(n.x,n.y,n.r*ps*2.5,0,Math.PI*2);ctx.fillStyle=rgba(col,al*0.15);ctx.fill();}
      ctx.shadowBlur=0;
      if(n.color==='c'||n.color==='g'){
        n.scanT--;
        if(n.scanT<=0&&n.scanP<0){n.scanP=0;n.scanT=rand(150,350);}
        if(n.scanP>=0){n.scanP+=0.013;ctx.shadowColor=col;ctx.shadowBlur=4;ctx.beginPath();ctx.arc(n.x,n.y,n.scanP*120,0,Math.PI*2);ctx.strokeStyle=rgba(col,(1-n.scanP)*0.45);ctx.lineWidth=1.2;ctx.stroke();ctx.shadowBlur=0;if(n.scanP>=1)n.scanP=-1;}
        n.ring2T--;
        if(n.ring2T<=0&&n.ring2P<0){n.ring2P=0;n.ring2T=rand(300,600);}
        if(n.ring2P>=0){n.ring2P+=0.008;ctx.beginPath();ctx.arc(n.x,n.y,n.ring2P*180,0,Math.PI*2);ctx.strokeStyle=rgba(col,(1-n.ring2P)*0.2);ctx.lineWidth=0.6;ctx.stroke();if(n.ring2P>=1)n.ring2P=-1;}
      }
      n.x+=n.vx;n.y+=n.vy;
      if(n.x<-20)n.x=W+20;if(n.x>W+20)n.x=-20;if(n.y<-20)n.y=H+20;if(n.y>H+20)n.y=-20;
    }

    rafId = requestAnimationFrame(frame);
  }
  var rafId;
  window.addEventListener('resize',function(){ resize(); init(); });
  window.addEventListener('mousemove',function(e){ mouse.x=e.clientX; mouse.y=e.clientY; });
  window.addEventListener('mouseleave',function(){ mouse.x=-9999; mouse.y=-9999; });
  document.addEventListener('visibilitychange',function(){ if(document.hidden){ cancelAnimationFrame(rafId); } else { frame(); } });
  resize(); init(); frame();
})();

// ── PHONE OBFUSCATION ─────────────────────────────────────
(function(){
  var p = ['077','68','839','871'].join('');
  var el = document.getElementById('phone-link');
  if(el){ el.href='tel:'+p; document.getElementById('phone-display').textContent=p.slice(0,5)+' '+p.slice(5); }
  // The copy button gets its value from the same place, so the number is still
  // assembled in one spot rather than typed into the markup a second time.
  var cp = document.getElementById('phone-copy');
  if(cp) cp.setAttribute('data-copy', p.slice(0,5)+' '+p.slice(5));
})();

// ── LOCAL TIME + AVAILABILITY ─────────────────────────────
// Gated on SITE.features.clock. Times are formatted in Europe/London
// explicitly, so a visitor in another timezone sees Atharva's clock rather
// than their own - which is the only reason to show it at all.
(function(){
  var host = document.getElementById('localNow');
  if(!host) return;
  if(!(window.SITE && SITE.features && SITE.features.clock)) return;  // flag off: stays hidden

  var timeEl  = document.getElementById('nowTime');
  var availEl = document.getElementById('nowAvail');
  var dotEl   = document.getElementById('nowDot');

  var fmt;
  try {
    fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false
    });
  } catch(e) {
    return;  // no Intl timezone support: leave it hidden rather than show the wrong clock
  }

  // Parts, so the hour is read from the London value and not the local one.
  function londonParts(){
    var p = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London', hour: 'numeric', weekday: 'short', hour12: false
    }).formatToParts(new Date()).forEach(function(x){ p[x.type] = x.value; });
    return { hour: parseInt(p.hour, 10), weekday: p.weekday };
  }

  function tick(){
    var now = new Date();
    timeEl.textContent = fmt.format(now);
    timeEl.setAttribute('datetime', now.toISOString());

    var p = londonParts();
    var weekend = (p.weekday === 'Sat' || p.weekday === 'Sun');
    var working = !weekend && p.hour >= 9 && p.hour < 21;

    availEl.textContent = working ? 'usually replies today' : 'away, replies next working day';
    availEl.classList.toggle('off', !working);
    dotEl.classList.toggle('off', !working);
  }

  tick();
  host.hidden = false;
  setInterval(tick, 1000);
})();

// ── COPY BUTTONS ──────────────────────────────────────────
// One handler for all four contacts. Each button carries its own value in
// data-copy, so adding a fifth contact needs no JavaScript change.
(function(){
  var buttons = document.querySelectorAll('.copy-btn');
  if(!buttons.length) return;

  var status = document.getElementById('copyStatus');
  var resetTimer = null;

  // Without a clipboard API there is nothing useful the button can do, so hide
  // it rather than leave a control that silently fails. The address is still
  // selectable text beside it either way.
  var canCopy = !!(navigator.clipboard && navigator.clipboard.writeText) || document.queryCommandSupported;
  if(!canCopy){
    Array.prototype.forEach.call(buttons, function(b){ b.hidden = true; });
    return;
  }

  function say(msg){
    if(!status) return;
    status.textContent = msg;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(function(){ status.textContent = ''; }, 2600);
  }

  function mark(btn){
    Array.prototype.forEach.call(buttons, function(b){ b.classList.remove('copied'); });
    btn.classList.add('copied');
    setTimeout(function(){ btn.classList.remove('copied'); }, 2000);
  }

  // Fallback for browsers without navigator.clipboard, and for the non-secure
  // contexts where it is undefined even in browsers that have it.
  function legacyCopy(text){
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch(e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  Array.prototype.forEach.call(buttons, function(btn){
    btn.addEventListener('click', function(){
      var text = btn.getAttribute('data-copy');
      var label = btn.getAttribute('data-label') || 'Value';
      if(!text){ say(label + ' is not available yet.'); return; }

      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(function(){
          mark(btn); say(label + ' copied.');
        }, function(){
          // Permission refused or a non-secure context; try the old way before
          // telling the visitor it failed.
          if(legacyCopy(text)){ mark(btn); say(label + ' copied.'); }
          else { say('Could not copy. Select the text instead.'); }
        });
      } else if(legacyCopy(text)){
        mark(btn); say(label + ' copied.');
      } else {
        say('Could not copy. Select the text instead.');
      }
    });
  });
})();

// ── SECTION-TITLE DECRYPT SCRAMBLE + FLICKER (staggered, repeating) ──
// Sequence per entry: scramble runs FIRST as the title crosses into view,
// then the blue/white flicker follows a beat later (~320ms) so both effects
// are clearly perceptible instead of competing for the same instant. Both
// re-arm each time a title fully leaves and re-enters the viewport.
  document.addEventListener('DOMContentLoaded', function(){   // deferred gsap is ready by now
  // Both effects run regardless of prefers-reduced-motion: the site owner
  // explicitly wants the scramble + flicker to fire on scroll on his machine.
  if(window.gsap && window.ScrambleTextPlugin) gsap.registerPlugin(ScrambleTextPlugin);

  // Duration scales with title length so a 6-character title and a
  // 27-character one decrypt at the same visual rate, clamped at both ends
  // so neither flashes past nor drags.
  function scrambleDuration(text){
    return Math.min(1.25, Math.max(0.6, text.length * 0.05));
  }

  function runScramble(el, done){
    if(!window.gsap){ done(); return; }        // no gsap: go straight to the flicker
    gsap.killTweensOf(el);                     // guard against overlapping tweens
    var text = el.getAttribute('data-text') || el.textContent;
    var d = scrambleDuration(text);
    gsap.to(el, {
      duration: d,
      scrambleText: { text: text, chars:'01<>/[]{}#$%&', speed:0.55, revealDelay: d * 0.18 },
      onComplete: done
    });
  }

  // The flicker's ::before/::after layers render attr(data-text) — the FINAL
  // text — so firing them mid-scramble showed the ghost layers and the real
  // text as two different strings, and how wrong it looked depended on title
  // length. Waiting for the scramble to finish makes all 12 titles identical.
  function fire(el){
    runScramble(el, function(){ triggerGlitch(el); });
  }

  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      var el = entry.target;
      if(entry.intersectionRatio === 0){
        el.dataset.fxArmed = 'true';                         // fully left → re-arm
      } else if(entry.intersectionRatio >= 0.4 && el.dataset.fxArmed !== 'false'){
        el.dataset.fxArmed = 'false';                        // debounce: fire once per entry
        fire(el);
      }
    });
  }, { threshold: [0, 0.4] });

  document.querySelectorAll('.section-title.glitch-title').forEach(function(el){
    el.dataset.fxArmed = 'true';
    obs.observe(el);
  });
  });
