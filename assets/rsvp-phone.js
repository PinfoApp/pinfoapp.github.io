// Phone and code steps of the web invitation (group links).
//
// Loaded by assets/rsvp.js only when the phone step is shown, so personal
// links and the first screen of every invitation do not pay for it.
//
// Part 1: reading a typed number (countries, calling codes, trunk prefixes,
// lengths). Part 2: the screens. All text is rendered with textContent.

(function () {
  "use strict";
  if (window.PinfoPhone) return;

  // ---- Countries --------------------------------------------------------
  // "ISO calling-code trunk-prefixes [min-max] [k]"
  //   trunk: "-" none, otherwise prefixes joined with "/" (longest first)
  //   min-max: national number length where known (mobile numbers)
  //   k: the leading zero belongs to the number and is never dropped
  var RAW = [
    "AC 247 -", "AD 376 -", "AE 971 0 9", "AF 93 0", "AG 1 - 10", "AI 1 - 10", "AL 355 0",
    "AM 374 0 8", "AO 244 - 9", "AR 54 0", "AS 1 - 10", "AT 43 0 10-13", "AU 61 0 9", "AW 297 -",
    "AX 358 0", "AZ 994 0 9", "BA 387 0", "BB 1 - 10", "BD 880 0 10", "BE 32 0 8-9", "BF 226 - k",
    "BG 359 0 8-9", "BH 973 - 8", "BI 257 -", "BJ 229 - k", "BL 590 0", "BM 1 - 10", "BN 673 -",
    "BO 591 -", "BQ 599 -", "BR 55 0 10-11", "BS 1 - 10", "BT 975 -", "BW 267 -", "BY 375 80/8/0 9",
    "BZ 501 -", "CA 1 - 10", "CC 61 0 9", "CD 243 0", "CF 236 -", "CG 242 - k", "CH 41 0 9",
    "CI 225 - k", "CK 682 -", "CL 56 - 9", "CM 237 -", "CN 86 0 11", "CO 57 - 10", "CR 506 -",
    "CU 53 0", "CV 238 -", "CW 599 -", "CX 61 0 9", "CY 357 -", "CZ 420 - 9", "DE 49 0 10-11",
    "DJ 253 -", "DK 45 - 8", "DM 1 - 10", "DO 1 - 10", "DZ 213 0 9", "EC 593 0", "EE 372 - 7-8",
    "EG 20 0 10", "EH 212 0", "ER 291 0", "ES 34 - 9", "ET 251 0", "FI 358 0", "FJ 679 -",
    "FK 500 -", "FM 691 -", "FO 298 -", "FR 33 0 9", "GA 241 - k", "GB 44 0 10", "GD 1 - 10",
    "GE 995 0 9", "GF 594 0", "GG 44 0 10", "GH 233 0 9", "GI 350 -", "GL 299 -", "GM 220 -",
    "GN 224 -", "GP 590 0", "GQ 240 -", "GR 30 - 10", "GT 502 -", "GU 1 - 10", "GW 245 -",
    "GY 592 -", "HK 852 - 8", "HN 504 -", "HR 385 0 8-9", "HT 509 -", "HU 36 06 8-9", "ID 62 0",
    "IE 353 0 8-9", "IL 972 0 8-9", "IM 44 0 10", "IN 91 0 10", "IO 246 -", "IQ 964 0 10",
    "IR 98 0 10", "IS 354 - 7", "IT 39 - 9-10 k", "JE 44 0 10", "JM 1 - 10", "JO 962 0 8-9",
    "JP 81 0 10", "KE 254 0 9", "KG 996 0 9", "KH 855 0", "KI 686 -", "KM 269 -", "KN 1 - 10",
    "KP 850 0", "KR 82 0 9-10", "KW 965 - 8", "KY 1 - 10", "KZ 7 8 10", "LA 856 0", "LB 961 0",
    "LC 1 - 10", "LI 423 -", "LK 94 0 9", "LR 231 0", "LS 266 -", "LT 370 8/0 8", "LU 352 -",
    "LV 371 - 8", "LY 218 0", "MA 212 0 9", "MC 377 -", "MD 373 0 8", "ME 382 0", "MF 590 0",
    "MG 261 0", "MH 692 -", "MK 389 0", "ML 223 -", "MM 95 0", "MN 976 - 8", "MO 853 - 8",
    "MP 1 - 10", "MQ 596 0", "MR 222 -", "MS 1 - 10", "MT 356 - 8", "MU 230 -", "MV 960 - 7",
    "MW 265 0", "MX 52 - 10", "MY 60 0", "MZ 258 -", "NA 264 0", "NC 687 -", "NE 227 -",
    "NF 672 -", "NG 234 0", "NI 505 -", "NL 31 0 9", "NO 47 - 8", "NP 977 0 10", "NR 674 -",
    "NU 683 -", "NZ 64 0 8-10", "OM 968 - 8", "PA 507 -", "PE 51 0 9", "PF 689 -", "PG 675 -",
    "PH 63 0 10", "PK 92 0 10", "PL 48 - 9", "PM 508 0", "PR 1 - 10", "PS 970 0", "PT 351 - 9",
    "PW 680 -", "PY 595 0", "QA 974 - 8", "RE 262 0", "RO 40 0 9", "RS 381 0", "RU 7 8 10",
    "RW 250 0", "SA 966 0 9", "SB 677 -", "SC 248 -", "SD 249 0", "SE 46 0", "SG 65 - 8",
    "SH 290 -", "SI 386 0 8", "SJ 47 - 8", "SK 421 0 9", "SL 232 0", "SM 378 - k", "SN 221 -",
    "SO 252 -", "SR 597 -", "SS 211 0", "ST 239 -", "SV 503 -", "SX 1 - 10", "SY 963 0",
    "SZ 268 -", "TA 290 -", "TC 1 - 10", "TD 235 -", "TG 228 -", "TH 66 0 9", "TJ 992 - k",
    "TK 690 -", "TL 670 -", "TM 993 8", "TN 216 - 8", "TO 676 -", "TR 90 0 10", "TT 1 - 10",
    "TV 688 -", "TW 886 0 9", "TZ 255 0", "UA 380 0 9", "UG 256 0", "US 1 - 10", "UY 598 0",
    "UZ 998 8 9", "VA 39 - k", "VC 1 - 10", "VE 58 0 10", "VG 1 - 10", "VI 1 - 10", "VN 84 0",
    "VU 678 -", "WF 681 -", "WS 685 -", "XK 383 0", "YE 967 0", "YT 262 0", "ZA 27 0 9",
    "ZM 260 0", "ZW 263 0"
  ];

  // Where several countries share one calling code, this one is the default.
  var MAIN = { "1": "US", "7": "RU", "44": "GB", "358": "FI", "47": "NO", "262": "RE", "590": "GP", "212": "MA", "39": "IT", "61": "AU", "599": "CW", "290": "SH" };
  var BY_ISO = {};
  var CODES = {};

  RAW.forEach(function (line) {
    var t = line.split(" ");
    var iso = t[0];
    var cc = t[1];
    var trunk = t[2] === "-" ? [] : t[2].split("/");
    var min = 6;
    var max = Math.min(13, 15 - cc.length);
    var keep = false;
    var known = false;
    for (var i = 3; i < t.length; i++) {
      if (t[i] === "k") { keep = true; continue; }
      var m = /^(\d+)(?:-(\d+))?$/.exec(t[i]);
      if (m) { min = +m[1]; max = m[2] ? +m[2] : +m[1]; known = true; }
    }
    BY_ISO[iso] = { iso: iso, cc: cc, trunk: trunk, min: min, max: max, keep: keep, known: known };
    CODES[cc] = true;
    if (!MAIN[cc]) MAIN[cc] = iso;
  });

  // ---- Cleaning ---------------------------------------------------------
  // Zero code points of the decimal digit blocks, so digits of other
  // scripts (Arabic-Indic, Devanagari, full-width, ...) read as 0 to 9.
  var ZEROS = [0x30, 0x660, 0x6F0, 0x7C0, 0x966, 0x9E6, 0xA66, 0xAE6, 0xB66, 0xBE6, 0xC66, 0xCE6, 0xD66, 0xDE6, 0xE50, 0xED0, 0xF20, 0x1040, 0x1090, 0x17E0, 0x1810, 0x1946, 0x19D0, 0x1A80, 0x1A90, 0x1B50, 0x1BB0, 0x1C40, 0x1C50, 0xA620, 0xA8D0, 0xA900, 0xA9D0, 0xA9F0, 0xAA50, 0xABF0, 0xFF10, 0x104A0, 0x11066, 0x110F0, 0x11136, 0x111D0, 0x112F0, 0x11450, 0x114D0, 0x11650, 0x116C0, 0x11730, 0x118E0, 0x16A60, 0x16B50, 0x1D7CE, 0x1D7D8, 0x1D7E2, 0x1D7EC, 0x1D7F6, 0x1E950];

  function digitValue(cp) {
    for (var i = 0; i < ZEROS.length; i++) {
      if (cp >= ZEROS[i] && cp <= ZEROS[i] + 9) return cp - ZEROS[i];
    }
    return -1;
  }

  // Format characters chat apps add around a pasted number, and zero-width ones.
  var INVISIBLE = /[​-‏‪-‮⁠⁦-⁩﻿]/g;
  // Separators people type: spaces, dashes, dots, brackets, slashes.
  var SEPARATOR = /[\s  -   　\-‐-―−－\.．·•・()\[\]{}（）\/_,~]/;

  function clean(raw) {
    var text = String(raw == null ? "" : raw).replace(INVISIBLE, "").replace(/＋/g, "+");
    var chars = Array.from(text);
    var digits = "";
    var plus = false;
    var bad = false;
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i];
      var cp = ch.codePointAt(0);
      var v = digitValue(cp);
      if (v >= 0) { digits += String(v); continue; }
      if (ch === "+") {
        if (digits === "" && !plus) plus = true; else bad = true;
        continue;
      }
      if (SEPARATOR.test(ch)) continue;
      bad = true;
    }
    return { plus: plus, digits: digits, bad: bad };
  }

  // ---- Reading a number ---------------------------------------------------
  function codeOf(d) {
    for (var len = 1; len <= 3; len++) {
      var c = d.slice(0, len);
      if (CODES[c]) return c;
    }
    return null;
  }

  function dropTrunk(d, c) {
    for (var i = 0; i < c.trunk.length; i++) {
      if (d.indexOf(c.trunk[i]) === 0) return d.slice(c.trunk[i].length);
    }
    return d;
  }

  // After an explicit code: one leading zero (Hungary: "06") unless the zero
  // belongs to the number.
  function dropAfterCode(n, c) {
    if (c.keep) return n;
    if (c.iso === "HU" && n.indexOf("06") === 0) return n.slice(2);
    if (n.charAt(0) === "0") return n.slice(1);
    return n;
  }

  // parse(raw, selectedIso) -> { ok, e164, iso, cc, nsn, explicit, doubtful }
  //                          or { ok:false, error, iso, ... }
  // error: "empty" | "chars" | "code" | "short" | "long"
  function parse(raw, selIso) {
    var c0 = clean(raw);
    if (c0.bad) return { ok: false, error: "chars" };
    if (c0.digits === "") return { ok: false, error: "empty" };
    var sel = BY_ISO[selIso] || BY_ISO.DE;
    var d = c0.digits;
    var explicit = c0.plus || d.indexOf("00") === 0;
    var cc, iso, nsn, doubtful = false;

    if (explicit) {
      if (!c0.plus) d = d.slice(2);
      cc = codeOf(d);
      if (!cc) return { ok: false, error: d === "" ? "empty" : "code" };
      iso = sel.cc === cc ? sel.iso : MAIN[cc];
      nsn = dropAfterCode(d.slice(cc.length), BY_ISO[iso]);
    } else {
      iso = sel.iso;
      cc = sel.cc;
      nsn = dropTrunk(d, sel);
      if (nsn.length > sel.max && d.indexOf(sel.cc) === 0) {
        var rest = dropAfterCode(d.slice(sel.cc.length), sel);
        if (rest.length >= sel.min && rest.length <= sel.max) { nsn = rest; doubtful = true; }
      }
    }

    var c = BY_ISO[iso];
    if (nsn.length < c.min) return { ok: false, error: "short", iso: iso, cc: cc, explicit: explicit, min: c.min, max: c.max };
    if (nsn.length > c.max) return { ok: false, error: "long", iso: iso, cc: cc, explicit: explicit, min: c.min, max: c.max };
    return { ok: true, e164: "+" + cc + nsn, iso: iso, cc: cc, nsn: nsn, explicit: explicit, doubtful: doubtful };
  }

  // The country a typed "+code" or "00code" points at, even while the rest
  // of the number is still being typed (null when none).
  function explicitIso(raw, selIso) {
    var c0 = clean(raw);
    if (c0.bad) return null;
    var d = c0.digits;
    if (!(c0.plus || d.indexOf("00") === 0)) return null;
    if (!c0.plus) d = d.slice(2);
    var cc = codeOf(d);
    if (!cc) return null;
    var sel = BY_ISO[selIso];
    return sel && sel.cc === cc ? sel.iso : MAIN[cc];
  }

  // The number as shown to people: rsvp.js groups the countries it knows,
  // any other number is shown as "+code rest".
  function shown(fmt, e164) {
    var d = fmt(e164);
    if (d && d.indexOf(" ") !== -1) return d;
    var cc = codeOf(String(e164).slice(1));
    return cc ? "+" + cc + " " + String(e164).slice(1 + cc.length) : (d || e164);
  }

  // ---- Names, flags, likely country --------------------------------------
  var nameCache = {};
  var displayNames = {};

  function regionName(iso, locale) {
    var key = locale + iso;
    if (nameCache[key]) return nameCache[key];
    var n = iso;
    try {
      displayNames[locale] = displayNames[locale] || new Intl.DisplayNames([locale], { type: "region" });
      n = displayNames[locale].of(iso) || iso;
    } catch (e) { n = iso; }
    nameCache[key] = n;
    return n;
  }

  function flag(iso) {
    try { return String.fromCodePoint(127397 + iso.charCodeAt(0), 127397 + iso.charCodeAt(1)); } catch (e) { return ""; }
  }

  // Time zone to country, for the zones people mostly have. Anything else is
  // looked up from the browser's own zone data (below), and failing that the
  // language region decides.
  var ZONE_TABLE = (
    "Europe/Amsterdam=NL Europe/Andorra=AD Europe/Athens=GR Europe/Belgrade=RS Europe/Berlin=DE Europe/Bratislava=SK " +
    "Europe/Brussels=BE Europe/Bucharest=RO Europe/Budapest=HU Europe/Busingen=DE Europe/Chisinau=MD Europe/Copenhagen=DK " +
    "Europe/Dublin=IE Europe/Gibraltar=GI Europe/Guernsey=GG Europe/Helsinki=FI Europe/Isle_of_Man=IM Europe/Istanbul=TR " +
    "Europe/Jersey=JE Europe/Kaliningrad=RU Europe/Kiev=UA Europe/Kyiv=UA Europe/Lisbon=PT Europe/Ljubljana=SI Europe/London=GB " +
    "Europe/Luxembourg=LU Europe/Madrid=ES Europe/Malta=MT Europe/Mariehamn=AX Europe/Minsk=BY Europe/Monaco=MC Europe/Moscow=RU " +
    "Europe/Nicosia=CY Europe/Oslo=NO Europe/Paris=FR Europe/Podgorica=ME Europe/Prague=CZ Europe/Riga=LV Europe/Rome=IT " +
    "Europe/Samara=RU Europe/San_Marino=SM Europe/Sarajevo=BA Europe/Skopje=MK Europe/Sofia=BG Europe/Stockholm=SE " +
    "Europe/Tallinn=EE Europe/Tirane=AL Europe/Vaduz=LI Europe/Vatican=VA Europe/Vienna=AT Europe/Vilnius=LT Europe/Volgograd=RU " +
    "Europe/Warsaw=PL Europe/Zagreb=HR Europe/Zurich=CH Atlantic/Canary=ES Atlantic/Madeira=PT Atlantic/Azores=PT " +
    "Atlantic/Reykjavik=IS Atlantic/Faroe=FO Arctic/Longyearbyen=SJ " +
    "America/New_York=US America/Chicago=US America/Denver=US America/Los_Angeles=US America/Phoenix=US America/Anchorage=US " +
    "America/Detroit=US America/Boise=US America/Indiana/Indianapolis=US America/Kentucky/Louisville=US Pacific/Honolulu=US " +
    "America/Toronto=CA America/Vancouver=CA America/Edmonton=CA America/Winnipeg=CA America/Halifax=CA America/St_Johns=CA " +
    "America/Regina=CA America/Montreal=CA America/Mexico_City=MX America/Cancun=MX America/Tijuana=MX America/Monterrey=MX " +
    "America/Sao_Paulo=BR America/Argentina/Buenos_Aires=AR America/Buenos_Aires=AR America/Bogota=CO America/Lima=PE " +
    "America/Santiago=CL America/Caracas=VE America/Havana=CU America/Panama=PA America/Puerto_Rico=PR America/Jamaica=JM " +
    "Asia/Tokyo=JP Asia/Seoul=KR Asia/Shanghai=CN Asia/Hong_Kong=HK Asia/Singapore=SG Asia/Bangkok=TH Asia/Jakarta=ID " +
    "Asia/Manila=PH Asia/Kolkata=IN Asia/Calcutta=IN Asia/Dubai=AE Asia/Riyadh=SA Asia/Tehran=IR Asia/Jerusalem=IL " +
    "Asia/Tel_Aviv=IL Asia/Karachi=PK Asia/Dhaka=BD Asia/Kathmandu=NP Asia/Colombo=LK Asia/Ho_Chi_Minh=VN Asia/Saigon=VN " +
    "Asia/Kuala_Lumpur=MY Asia/Taipei=TW Asia/Almaty=KZ Asia/Tashkent=UZ Asia/Baku=AZ Asia/Tbilisi=GE Asia/Yerevan=AM " +
    "Asia/Beirut=LB Asia/Amman=JO Asia/Baghdad=IQ Asia/Kuwait=KW Asia/Qatar=QA Asia/Bahrain=BH Asia/Muscat=OM " +
    "Australia/Sydney=AU Australia/Melbourne=AU Australia/Brisbane=AU Australia/Perth=AU Australia/Adelaide=AU " +
    "Australia/Darwin=AU Australia/Hobart=AU Pacific/Auckland=NZ Africa/Cairo=EG Africa/Johannesburg=ZA Africa/Lagos=NG " +
    "Africa/Nairobi=KE Africa/Casablanca=MA Africa/Algiers=DZ Africa/Tunis=TN Africa/Accra=GH Africa/Addis_Ababa=ET"
  ).split(" ").reduce(function (m, pair) { var i = pair.lastIndexOf("="); m[pair.slice(0, i)] = pair.slice(i + 1); return m; }, {});

  var zoneIndex = null;

  function isoFromZoneData(tz) {
    if (typeof Intl.Locale !== "function") return null;
    if (!zoneIndex) {
      zoneIndex = {};
      Object.keys(BY_ISO).forEach(function (iso) {
        try {
          var loc = new Intl.Locale("und-" + iso);
          var zones = typeof loc.getTimeZones === "function" ? loc.getTimeZones() : loc.timeZones;
          (zones || []).forEach(function (z) { if (!zoneIndex[z]) zoneIndex[z] = iso; });
        } catch (e) { /* no zone data for this region */ }
      });
    }
    return zoneIndex[tz] || null;
  }

  // Where the phone is: its time zone says more than the language it is set to.
  function isoFromTimeZone() {
    var tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { return null; }
    if (!tz) return null;
    var iso = ZONE_TABLE[tz] || isoFromZoneData(tz);
    return iso && BY_ISO[iso] ? iso : null;
  }

  function isoFromLanguage() {
    var langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ""];
    for (var i = 0; i < langs.length; i++) {
      var parts = String(langs[i]).split(/[-_]/);
      for (var j = 1; j < parts.length; j++) {
        if (/^[A-Za-z]{2}$/.test(parts[j]) && BY_ISO[parts[j].toUpperCase()]) return parts[j].toUpperCase();
      }
    }
    return null;
  }

  // The preselected country: the time zone first, the region of the browser
  // language as the fallback, else Germany. The person can always change it.
  function likelyIso() {
    return isoFromTimeZone() || isoFromLanguage() || "DE";
  }

  function fold(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function sortedCountries(locale) {
    var coll;
    try { coll = new Intl.Collator(locale); } catch (e) { coll = null; }
    var list = Object.keys(BY_ISO).map(function (iso) { return { iso: iso, cc: BY_ISO[iso].cc, name: regionName(iso, locale) }; });
    list.sort(function (a, b) { return coll ? coll.compare(a.name, b.name) : (a.name < b.name ? -1 : 1); });
    return list;
  }

  // ---- Text ----------------------------------------------------------------
  var TT = {
    en: {
      country: "Country",
      searchPlaceholder: "Search country or code",
      suggested: "Suggested",
      allCountries: "All countries",
      noMatch: "No country found",
      close: "Close",
      enterNumber: "Enter your phone number",
      digitsOnly: "That doesn't look like a phone number. Use digits only.",
      unknownCode: "We don't recognise that country code. Check the number or pick your country.",
      tooShort: function (c) { return "That number looks too short for " + c + "."; },
      tooLong: function (c) { return "That number looks too long for " + c + "."; },
      willText: function (n) { return "We'll text a code to " + n + "."; },
      confirmNumber: function (n) { return "Check the number: " + n + ". Tap Send code again to continue."; },
      realPerson: "Quick check that you're a real person. It only takes a moment.",
      cancel: "Cancel",
      checkFailed: "The check was closed or didn't work. Tap Send code to try again.",
      fbInvalid: "That number isn't valid. Check it and try again.",
      fbTooMany: "Too many attempts. Please try again later.",
      fbQuota: "We can't send more codes right now. Please try again later.",
      fbNetwork: "No connection. Check your internet and try again.",
      fbRegion: "We can't send codes to numbers from that country right now.",
      codeSentTo: function (n) { return "Code sent to " + n; },
      codeWrong: "That code isn't right. Check it and try again.",
      codeExpired: "That code has expired. Send a new code.",
      codeEnter: "Enter the 6-digit code.",
      resend: "Resend code",
      resendIn: function (s) { return "Resend code in " + s + " s"; },
      resent: "New code sent.",
      changeNumber: "Change number",
      reloadHint: "Send a new code to continue."
    },
    de: {
      country: "Land",
      searchPlaceholder: "Land oder Vorwahl suchen",
      suggested: "Vorschlag",
      allCountries: "Alle Länder",
      noMatch: "Kein Land gefunden",
      close: "Schließen",
      enterNumber: "Gib deine Telefonnummer ein",
      digitsOnly: "Das sieht nicht nach einer Telefonnummer aus. Verwende nur Ziffern.",
      unknownCode: "Diese Landesvorwahl kennen wir nicht. Prüfe die Nummer oder wähle dein Land.",
      tooShort: function (c) { return "Diese Nummer ist für " + c + " zu kurz."; },
      tooLong: function (c) { return "Diese Nummer ist für " + c + " zu lang."; },
      willText: function (n) { return "Wir senden einen Code an " + n + "."; },
      confirmNumber: function (n) { return "Prüfe die Nummer: " + n + ". Tippe erneut auf Code senden, um fortzufahren."; },
      realPerson: "Kurze Prüfung, dass du ein Mensch bist. Das dauert nur einen Moment.",
      cancel: "Abbrechen",
      checkFailed: "Die Prüfung wurde geschlossen oder hat nicht funktioniert. Tippe auf Code senden, um es erneut zu versuchen.",
      fbInvalid: "Diese Nummer ist ungültig. Prüfe sie und versuche es erneut.",
      fbTooMany: "Zu viele Versuche. Bitte versuche es später erneut.",
      fbQuota: "Wir können gerade keine weiteren Codes senden. Bitte versuche es später erneut.",
      fbNetwork: "Keine Verbindung. Prüfe dein Internet und versuche es erneut.",
      fbRegion: "An Nummern aus diesem Land können wir gerade keine Codes senden.",
      codeSentTo: function (n) { return "Code gesendet an " + n; },
      codeWrong: "Dieser Code stimmt nicht. Prüfe ihn und versuche es erneut.",
      codeExpired: "Dieser Code ist abgelaufen. Sende einen neuen Code.",
      codeEnter: "Gib den 6-stelligen Code ein.",
      resend: "Code erneut senden",
      resendIn: function (s) { return "Code erneut senden in " + s + " s"; },
      resent: "Neuer Code gesendet.",
      changeNumber: "Nummer ändern",
      reloadHint: "Sende einen neuen Code, um fortzufahren."
    }
  };

  function numberSentence(T, locale, r) {
    if (r.error === "empty") return T.enterNumber;
    if (r.error === "chars") return T.digitsOnly;
    if (r.error === "code") return T.unknownCode;
    var name = regionName(r.iso, locale);
    return r.error === "short" ? T.tooShort(name) : T.tooLong(name);
  }

  // Firebase's own error codes get their own sentences; the generic
  // sentence is only for what is truly unknown.
  function firebaseSentence(T, S, err) {
    var code = err && err.code ? String(err.code) : "";
    switch (code) {
      case "auth/invalid-phone-number":
      case "auth/missing-phone-number": return T.fbInvalid;
      case "auth/too-many-requests": return T.fbTooMany;
      case "auth/quota-exceeded": return T.fbQuota;
      case "auth/network-request-failed": return T.fbNetwork;
      case "auth/operation-not-allowed": return T.fbRegion;
      case "auth/captcha-check-failed":
      case "auth/argument-error": return T.checkFailed;
      case "auth/invalid-verification-code": return T.codeWrong;
      case "auth/missing-verification-code": return T.codeEnter;
      case "auth/code-expired":
      case "auth/session-expired": return T.codeExpired;
    }
    if (/recaptcha|captcha/i.test(String(err && err.message))) return T.checkFailed;
    return S.genericError;
  }

  // ---- Remembered input (this tab only) ------------------------------------
  var mem = { iso: null, raw: "", started: false };

  function storeKey(token) { return "pinfo-rsvp-phone-" + token; }
  function loadStored(token) {
    try { var v = window.sessionStorage.getItem(storeKey(token)); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function saveStored(token, obj) {
    try { window.sessionStorage.setItem(storeKey(token), JSON.stringify(obj)); } catch (e) { /* storage unavailable */ }
  }
  function clearStored(token) {
    try { window.sessionStorage.removeItem(storeKey(token)); } catch (e) { /* storage unavailable */ }
  }

  // ---- Styles (added once, only when this step is shown) --------------------
  var CSS = [
    "#rsvp-root .pp-form{display:flex;flex-direction:column;gap:10px;margin:0}",
    "#rsvp-root .pp-form button,#rsvp-root .pp-form input{touch-action:manipulation}",
    "#rsvp-root .pp-country{display:flex;align-items:center;gap:10px;width:100%;min-height:48px;text-align:left;cursor:pointer}",
    "#rsvp-root .pp-country .pp-flag{font-size:22px;line-height:1}",
    "#rsvp-root .pp-country .pp-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    "#rsvp-root .pp-country .pp-code{color:var(--muted);font-variant-numeric:tabular-nums}",
    "#rsvp-root .pp-country .pp-caret{color:var(--muted);font-size:12px}",
    "#rsvp-root .pp-note{color:var(--muted);font-size:13px;line-height:1.5;margin:0}",
    "#rsvp-root .pp-preview{color:var(--ink);font-size:13px;line-height:1.5;margin:0}",
    "#rsvp-root .pp-confirm{color:var(--ink);font-size:13px;line-height:1.5;font-weight:600;margin:0}",
    "#rsvp-root .pp-sent{font-size:15px;font-weight:600;margin:0 0 2px}",
    "#rsvp-root .pp-row{display:flex;flex-wrap:wrap;gap:4px 16px;align-items:center}",
    ".pp-link{background:none;border:0;border-radius:0;padding:10px 0;margin:0;color:var(--indigo);font:inherit;font-size:14px;font-weight:600;cursor:pointer;text-align:left;touch-action:manipulation;-webkit-appearance:none;appearance:none}",
    ".pp-link[disabled]{color:var(--muted);cursor:default;font-weight:500}",
    ".pp-overlay{position:fixed;left:0;top:0;right:0;bottom:0;z-index:1000;background:#fff;display:flex;flex-direction:column;color:var(--ink);font-family:inherit}",
    ".pp-head{display:flex;gap:8px;align-items:center;padding:calc(env(safe-area-inset-top) + 10px) 12px 10px;border-bottom:1px solid #e3e1f3}",
    ".pp-head .pp-search{flex:1;min-width:0;width:auto}",
    ".pp-head .pp-link{padding:10px 6px}",
    ".pp-list{list-style:none;margin:0;padding:0 0 env(safe-area-inset-bottom);overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}",
    ".pp-group{padding:14px 16px 6px;font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}",
    ".pp-item{display:flex;align-items:center;gap:12px;width:100%;min-height:48px;padding:8px 16px;background:none;border:0;text-align:left;font:inherit;font-size:16px;color:var(--ink);cursor:pointer}",
    ".pp-item[aria-selected=true]{background:#f2f0fb}",
    ".pp-item .pp-flag{font-size:22px;width:28px;text-align:center}",
    ".pp-item .pp-name{flex:1;min-width:0}",
    ".pp-item .pp-code{color:var(--muted);font-variant-numeric:tabular-nums}",
    ".pp-empty{padding:24px 16px;color:var(--muted);text-align:center}",
    "html.pp-lock,html.pp-lock body{overflow:hidden}",
    "html.pp-kb #rsvp-root.pp-active .body{padding-bottom:calc(26px + var(--pp-kb,0px) + 72px)}",
    "html.pp-tight #rsvp-root .cover,html.pp-tight #rsvp-root .brand,html.pp-tight #rsvp-root #rsvp-platform-note,html.pp-tight #rsvp-root #rsvp-title,html.pp-tight #rsvp-root #rsvp-meta,html.pp-tight #rsvp-root .rsvp-screen>.meta{display:none!important}",
    "html.pp-tight #rsvp-root .body{padding-top:10px}",
    "html.pp-tight #rsvp-root .rsvp-screen{gap:8px}",
    "html.pp-tight #rsvp-root .pp-form{gap:6px}",
    "html.pp-tight #rsvp-root .input{padding-top:8px;padding-bottom:8px}",
    "html.pp-tight #rsvp-root .btn{padding-top:10px;padding-bottom:10px;margin-top:4px}",
    "@media (max-height:760px) and (orientation:portrait){#rsvp-root.pp-active .cover{aspect-ratio:16/6}}",
    "@media (max-height:700px) and (orientation:portrait){#rsvp-root.pp-active .cover{aspect-ratio:16/5}}",
    "@media (orientation:landscape) and (max-height:520px){#rsvp-root.pp-active .cover{display:none}#rsvp-root.pp-active .body{padding-top:14px}}"
  ].join("\n");

  function injectStyles() {
    if (document.getElementById("pp-styles")) return;
    var st = document.createElement("style");
    st.id = "pp-styles";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // ---- Keyboard: keep the field, its error line and its button in view --------
  // iOS Safari keeps the layout viewport when the keyboard opens, so the
  // space the keyboard takes is added below the card (--pp-kb) and the
  // page can then scroll the field above the keyboard and Safari's bar.
  // On a short screen (landscape) the page also drops everything above the
  // form while a field has focus (pp-tight), so field and button fit.
  var keyboardWatch = false;

  function updateKeyboard() {
    var vv = window.visualViewport;
    var kb = vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;
    var visible = vv ? vv.height : window.innerHeight;
    var ae = document.activeElement;
    var typing = !!(ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName) && ae.closest && ae.closest("#rsvp-root"));
    var root = document.documentElement;
    root.style.setProperty("--pp-kb", kb + "px");
    root.classList.toggle("pp-kb", kb > 80);
    root.classList.toggle("pp-tight", typing && visible < 330);
  }

  // Scrolls so the field and the error line under it sit above the keyboard's
  // own bar and Safari's pill, and the button too when there is room. The
  // field wins when they do not all fit.
  function ensureVisible(inputEl, buttonEl, errorEl) {
    if (!inputEl || !inputEl.getBoundingClientRect || !document.body.contains(inputEl)) return;
    var vv = window.visualViewport;
    var top = vv ? vv.offsetTop : 0;
    var bottom = top + (vv ? vv.height : window.innerHeight);
    var coarse = window.matchMedia && window.matchMedia("(pointer:coarse)").matches;
    var tight = document.documentElement.classList.contains("pp-tight");
    var below = tight ? 28 : (coarse ? 96 : 16);
    var field = inputEl.getBoundingClientRect();
    var limit = bottom - below;
    var need = 0;
    if (buttonEl && buttonEl.getBoundingClientRect) need = Math.max(need, buttonEl.getBoundingClientRect().bottom - limit);
    if (errorEl && errorEl.getBoundingClientRect && !errorEl.classList.contains("hidden")) need = Math.max(need, errorEl.getBoundingClientRect().bottom - limit);
    var most = field.top - (top + 12);
    var dy = Math.min(need, most);
    if (field.top >= top + 12 && dy < 0) dy = 0;
    if (Math.abs(dy) > 2) window.scrollBy(0, dy);
  }

  // Returns a function that checks the position again (after an error line
  // appears, for example).
  function watchKeyboard(form, inputEl, buttonEl, errorEl) {
    var timer = null;
    function run() { clearTimeout(timer); timer = setTimeout(function () { updateKeyboard(); ensureVisible(inputEl, buttonEl, errorEl); }, 250); }
    inputEl.addEventListener("focus", run);
    inputEl.addEventListener("input", function () { if (document.activeElement === inputEl) run(); });
    if (window.visualViewport && !keyboardWatch) {
      keyboardWatch = true;
      window.visualViewport.addEventListener("resize", updateKeyboard);
      window.visualViewport.addEventListener("scroll", updateKeyboard);
      document.addEventListener("focusin", updateKeyboard);
      document.addEventListener("focusout", function () { setTimeout(updateKeyboard, 50); });
    }
    if (window.visualViewport) {
      var handler = function () {
        if (!document.body.contains(form)) { window.visualViewport.removeEventListener("resize", handler); return; }
        if (document.activeElement === inputEl) run();
      };
      window.visualViewport.addEventListener("resize", handler);
    }
    window.addEventListener("orientationchange", run);
    // With a mouse, pressing the button keeps the focus in the field. A
    // finger is handled in rsvp.js (the press is taken on touch end, so the
    // keyboard closing cannot move the button out from under it).
    buttonEl.addEventListener("mousedown", function (e) {
      if (document.activeElement === inputEl) e.preventDefault();
    });
    return function () { if (document.activeElement === inputEl) run(); };
  }

  function setActive(ctx, on) {
    if (ctx.rootEl) ctx.rootEl.classList.toggle("pp-active", on);
    document.documentElement.classList.toggle("pp-active", on);
  }

  // ---- Country picker ----------------------------------------------------------
  function openPicker(ctx, T, currentIso, onPick) {
    var locale = ctx.locale;
    var opener = document.activeElement;
    var all = sortedCountries(locale);
    var likely = likelyIso();
    var overlay = ctx.el("div", { class: "pp-overlay", role: "dialog", "aria-modal": "true", "aria-label": T.country });
    var search = ctx.el("input", { type: "search", class: "input pp-search", placeholder: T.searchPlaceholder, "aria-label": T.searchPlaceholder, autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "search" });
    var closeBtn = ctx.el("button", { type: "button", class: "pp-link", text: T.close });
    var list = ctx.el("ul", { class: "pp-list", role: "listbox", "aria-label": T.country });
    overlay.appendChild(ctx.el("div", { class: "pp-head" }, [search, closeBtn]));
    overlay.appendChild(list);

    function item(c) {
      var b = ctx.el("button", { type: "button", class: "pp-item", role: "option", "aria-selected": c.iso === currentIso ? "true" : "false" }, [
        ctx.el("span", { class: "pp-flag", text: flag(c.iso) }),
        ctx.el("span", { class: "pp-name", text: c.name }),
        ctx.el("span", { class: "pp-code", text: "+" + c.cc })
      ]);
      b.addEventListener("click", function () { close(); onPick(c.iso); });
      return ctx.el("li", { role: "presentation" }, [b]);
    }

    function render(query) {
      ctx.clear(list);
      var q = fold(query.trim()).replace(/^\+/, "");
      var digits = /^\d+$/.test(q);
      var shown = all.filter(function (c) {
        if (!q) return true;
        if (digits) return c.cc.indexOf(q) === 0;
        return fold(c.name).indexOf(q) !== -1 || c.iso.toLowerCase() === q;
      });
      if (!shown.length) { list.appendChild(ctx.el("li", { class: "pp-empty", text: T.noMatch })); return; }
      if (!q) {
        var first = all.filter(function (c) { return c.iso === likely; })[0];
        if (first) {
          list.appendChild(ctx.el("li", { class: "pp-group", role: "presentation", text: T.suggested }));
          list.appendChild(item(first));
          list.appendChild(ctx.el("li", { class: "pp-group", role: "presentation", text: T.allCountries }));
        }
      }
      shown.forEach(function (c) { list.appendChild(item(c)); });
    }

    function onKey(e) { if (e.key === "Escape") { e.preventDefault(); close(); } }
    function close() {
      document.removeEventListener("keydown", onKey, true);
      document.documentElement.classList.remove("pp-lock");
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (opener && opener.focus) { try { opener.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    }

    search.addEventListener("input", function () { render(search.value); });
    closeBtn.addEventListener("click", close);
    if (ctx.firstTap) ctx.firstTap(overlay);
    document.addEventListener("keydown", onKey, true);
    document.documentElement.classList.add("pp-lock");
    document.body.appendChild(overlay);
    render("");
    var selected = list.querySelector("[aria-selected=true]");
    if (selected && selected.scrollIntoView) selected.scrollIntoView({ block: "center" });
    var coarse = window.matchMedia && window.matchMedia("(pointer:coarse)").matches;
    if (!coarse) search.focus();
    return { close: close };
  }

  // ---- Phone step ----------------------------------------------------------------
  var timers = [];
  function clearTimers() { while (timers.length) clearInterval(timers.pop()); }

  function renderPhone(ctx) {
    clearTimers();
    injectStyles();
    var T = TT[ctx.locale] || TT.en;
    var S = ctx.S;
    var locale = ctx.locale;

    // First screen of this page load: bring back what was typed, and say so
    // when the page was reloaded on the code step.
    var hint = "";
    if (!mem.started) {
      mem.started = true;
      var stored = loadStored(ctx.token);
      if (stored && stored.raw) {
        mem.raw = stored.raw;
        if (stored.iso && BY_ISO[stored.iso]) mem.iso = stored.iso;
        if (stored.step === "code") hint = T.reloadHint;
        saveStored(ctx.token, { raw: stored.raw, iso: mem.iso, step: "phone" });
      }
    }
    if (!mem.iso) mem.iso = likelyIso();
    setActive(ctx, true);
    ctx.clear(ctx.contentEl);

    var countryBtn = ctx.el("button", { type: "button", class: "input pp-country", "aria-haspopup": "dialog" });
    var numberInput = ctx.el("input", {
      type: "tel", class: "input input-phone", name: "phone", autocomplete: "tel", inputmode: "tel", enterkeyhint: "go",
      autocapitalize: "off", autocorrect: "off", spellcheck: "false", placeholder: S.phoneLabel, "aria-label": S.phoneLabel
    });
    numberInput.value = mem.raw;
    var errorEl = ctx.el("p", { class: "field-error hidden", role: "alert" });
    var previewEl = ctx.el("p", { class: "pp-preview hidden", "aria-live": "polite" });
    var confirmEl = ctx.el("p", { class: "pp-confirm hidden", "aria-live": "polite" });
    var noteEl = ctx.el("p", { class: "pp-note hidden", "aria-live": "polite", text: T.realPerson });
    var cancelBtn = ctx.el("button", { type: "button", class: "pp-link hidden", text: T.cancel });
    var sendBtn = ctx.el("button", { type: "submit", class: "btn btn-primary", text: S.sendCode });
    var captchaHost = ctx.el("div", {});
    var form = ctx.el("form", { class: "pp-form", novalidate: "novalidate" }, [
      countryBtn, numberInput, errorEl, previewEl, confirmEl, sendBtn,
      ctx.el("div", { class: "pp-row" }, [noteEl, cancelBtn]), captchaHost
    ]);

    var sending = false;
    var attempt = 0;
    var pendingConfirm = null;

    function paintCountry() {
      var c = BY_ISO[mem.iso];
      ctx.clear(countryBtn);
      countryBtn.appendChild(ctx.el("span", { class: "pp-flag", text: flag(c.iso) }));
      countryBtn.appendChild(ctx.el("span", { class: "pp-name", text: regionName(c.iso, locale) }));
      countryBtn.appendChild(ctx.el("span", { class: "pp-code", text: "+" + c.cc }));
      countryBtn.appendChild(ctx.el("span", { class: "pp-caret", text: "▾", "aria-hidden": "true" }));
      countryBtn.setAttribute("aria-label", T.country + ": " + regionName(c.iso, locale) + " +" + c.cc);
    }

    function persist(step) { saveStored(ctx.token, { raw: mem.raw, iso: mem.iso, step: step || "phone" }); }

    var keepVisible = function () {};

    function showError(text) {
      errorEl.textContent = text;
      errorEl.classList.toggle("hidden", !text);
      numberInput.setAttribute("aria-invalid", text ? "true" : "false");
      if (text) keepVisible();
    }

    function paintPreview() {
      var r = parse(numberInput.value, mem.iso);
      if (r.ok) {
        previewEl.textContent = T.willText(shown(ctx.fmtPhoneDisplay, r.e164));
        previewEl.classList.remove("hidden");
      } else {
        previewEl.classList.add("hidden");
      }
    }

    function setIso(iso) {
      mem.iso = iso;
      paintCountry();
      persist();
      paintPreview();
    }

    numberInput.addEventListener("input", function () {
      mem.raw = numberInput.value;
      var follow = explicitIso(mem.raw, mem.iso);
      if (follow && follow !== mem.iso) mem.iso = follow;
      paintCountry();
      persist();
      showError("");
      pendingConfirm = null;
      confirmEl.classList.add("hidden");
      paintPreview();
    });

    countryBtn.addEventListener("click", function () {
      openPicker(ctx, T, mem.iso, function (iso) {
        // A typed "+code" would win over the choice, so drop it from the field.
        var r = parse(numberInput.value, mem.iso);
        if (r.ok && r.explicit) numberInput.value = r.nsn;
        else if (explicitIso(numberInput.value, mem.iso)) numberInput.value = "";
        mem.raw = numberInput.value;
        setIso(iso);
        pendingConfirm = null;
        confirmEl.classList.add("hidden");
        showError("");
        try { numberInput.focus(); } catch (e) { /* ignore */ }
      });
    });

    function endSending() {
      sending = false;
      sendBtn.disabled = false;
      noteEl.classList.add("hidden");
      cancelBtn.classList.add("hidden");
    }

    cancelBtn.addEventListener("click", function () {
      attempt++;
      try { ctx.cancelPhoneCode(); } catch (e) { /* ignore */ }
      endSending();
      showError(T.checkFailed);
    });

    function send(e164) {
      var mine = ++attempt;
      sending = true;
      sendBtn.disabled = true;
      showError("");
      noteEl.classList.remove("hidden");
      cancelBtn.classList.remove("hidden");
      ctx.clear(captchaHost);
      var host = ctx.el("div", { id: "recaptcha-container-" + ctx.token + "-" + mine });
      captchaHost.appendChild(host);
      ctx.sendPhoneCode(e164, host.id).then(function () {
        if (mine !== attempt) return;
        persist("code");
        renderCode(ctx, e164);
      }, function (err) {
        if (mine !== attempt) return;
        endSending();
        showError(firebaseSentence(T, S, err));
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sending) return;
      var r = parse(numberInput.value, mem.iso);
      if (!r.ok) {
        showError(numberSentence(T, locale, r));
        try { numberInput.focus(); } catch (err) { /* ignore */ }
        return;
      }
      if (r.iso !== mem.iso) setIso(r.iso);
      if (r.doubtful && pendingConfirm !== r.e164) {
        pendingConfirm = r.e164;
        confirmEl.textContent = T.confirmNumber(shown(ctx.fmtPhoneDisplay, r.e164));
        confirmEl.classList.remove("hidden");
        return;
      }
      send(r.e164);
    });

    // The page that calls this may have no greeting (a private link shows
    // its own title above) and may add a sentence of its own.
    var children = [];
    if (ctx.heading) children.push(ctx.el("h2", { class: "rsvp-heading", text: ctx.heading }));
    if (!ctx.hideSub) children.push(ctx.el("p", { class: "meta", text: S.groupSub }));
    if (ctx.answerBy) children.push(ctx.el("p", { class: "answer-by hint-left", text: ctx.answerBy }));
    // The privacy policy link sits above the phone number field.
    children.push(ctx.privacyGroupLine());
    if (ctx.notice) children.push(ctx.el("p", { class: "pp-note", role: "status", text: ctx.notice }));
    if (hint) children.push(ctx.el("p", { class: "pp-note", role: "status", text: hint }));
    ctx.notice = null;
    children.push(form);
    ctx.contentEl.appendChild(ctx.card(children));

    paintCountry();
    paintPreview();
    keepVisible = watchKeyboard(form, numberInput, sendBtn, errorEl);
  }

  // ---- Code step -------------------------------------------------------------------
  function renderCode(ctx, e164) {
    clearTimers();
    injectStyles();
    var T = TT[ctx.locale] || TT.en;
    var S = ctx.S;
    setActive(ctx, true);
    ctx.clear(ctx.contentEl);

    var display = shown(ctx.fmtPhoneDisplay, e164);
    var codeInput = ctx.el("input", {
      type: "text", class: "input input-code", name: "code", inputmode: "numeric", autocomplete: "one-time-code",
      pattern: "[0-9]*", maxlength: "6", enterkeyhint: "go", autocapitalize: "off", autocorrect: "off", spellcheck: "false",
      placeholder: "000000", "aria-label": S.codeLabel
    });
    var errorEl = ctx.el("p", { class: "field-error hidden", role: "alert" });
    var infoEl = ctx.el("p", { class: "pp-note hidden", "aria-live": "polite" });
    var noteEl = ctx.el("p", { class: "pp-note hidden", "aria-live": "polite", text: T.realPerson });
    var cancelBtn = ctx.el("button", { type: "button", class: "pp-link hidden", text: T.cancel });
    var verifyBtn = ctx.el("button", { type: "submit", class: "btn btn-primary", text: S.verify });
    var resendBtn = ctx.el("button", { type: "button", class: "pp-link", text: T.resendIn(30) });
    var changeBtn = ctx.el("button", { type: "button", class: "pp-link", text: T.changeNumber });
    var captchaHost = ctx.el("div", {});
    var form = ctx.el("form", { class: "pp-form", novalidate: "novalidate" }, [
      codeInput, errorEl, verifyBtn,
      ctx.el("div", { class: "pp-row" }, [resendBtn, changeBtn]),
      infoEl,
      ctx.el("div", { class: "pp-row" }, [noteEl, cancelBtn]),
      captchaHost
    ]);

    var verifying = false;
    var sending = false;
    var attempt = 0;
    var remaining = 30;

    var keepVisible = function () {};

    function showError(text) {
      errorEl.textContent = text;
      errorEl.classList.toggle("hidden", !text);
      codeInput.setAttribute("aria-invalid", text ? "true" : "false");
      if (text) keepVisible();
    }

    function startCountdown() {
      clearTimers();
      remaining = 30;
      resendBtn.disabled = true;
      resendBtn.textContent = T.resendIn(remaining);
      timers.push(setInterval(function () {
        remaining--;
        if (remaining <= 0) {
          clearTimers();
          resendBtn.disabled = false;
          resendBtn.textContent = T.resend;
        } else {
          resendBtn.textContent = T.resendIn(remaining);
        }
      }, 1000));
    }

    codeInput.addEventListener("input", function () {
      var digits = codeInput.value.replace(/\D/g, "").slice(0, 6);
      if (digits !== codeInput.value) codeInput.value = digits;
      showError("");
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (verifying || sending) return;
      var code = codeInput.value.replace(/\D/g, "");
      if (code.length !== 6) { showError(T.codeEnter); try { codeInput.focus(); } catch (err) { /* ignore */ } return; }
      verifying = true;
      verifyBtn.disabled = true;
      showError("");
      ctx.confirmPhoneCode(code).then(function () {
        clearTimers();
        clearStored(ctx.token);
        mem.raw = "";
        setActive(ctx, false);
        ctx.onVerified(e164);
      }, function (err) {
        verifying = false;
        verifyBtn.disabled = false;
        showError(firebaseSentence(T, S, err));
        try { codeInput.focus(); } catch (e2) { /* ignore */ }
      });
    });

    function endSending() {
      sending = false;
      noteEl.classList.add("hidden");
      cancelBtn.classList.add("hidden");
    }

    cancelBtn.addEventListener("click", function () {
      attempt++;
      try { ctx.cancelPhoneCode(); } catch (e) { /* ignore */ }
      endSending();
      resendBtn.disabled = false;
      resendBtn.textContent = T.resend;
      showError(T.checkFailed);
    });

    resendBtn.addEventListener("click", function () {
      if (resendBtn.disabled || sending || verifying) return;
      var mine = ++attempt;
      sending = true;
      resendBtn.disabled = true;
      showError("");
      infoEl.classList.add("hidden");
      noteEl.classList.remove("hidden");
      cancelBtn.classList.remove("hidden");
      ctx.clear(captchaHost);
      var host = ctx.el("div", { id: "recaptcha-container-" + ctx.token + "-r" + mine });
      captchaHost.appendChild(host);
      ctx.sendPhoneCode(e164, host.id).then(function () {
        if (mine !== attempt) return;
        endSending();
        infoEl.textContent = T.resent;
        infoEl.classList.remove("hidden");
        codeInput.value = "";
        startCountdown();
      }, function (err) {
        if (mine !== attempt) return;
        endSending();
        resendBtn.disabled = false;
        resendBtn.textContent = T.resend;
        showError(firebaseSentence(T, S, err));
      });
    });

    changeBtn.addEventListener("click", function () {
      if (sending) { attempt++; try { ctx.cancelPhoneCode(); } catch (e) { /* ignore */ } }
      clearTimers();
      renderPhone(ctx);
    });

    var codeChildren = [];
    if (ctx.heading) codeChildren.push(ctx.el("h2", { class: "rsvp-heading", text: ctx.heading }));
    codeChildren.push(ctx.el("p", { class: "pp-sent", text: T.codeSentTo(display) }));
    codeChildren.push(ctx.el("p", { class: "meta", text: S.codeLabel }));
    codeChildren.push(form);
    ctx.contentEl.appendChild(ctx.card(codeChildren));

    startCountdown();
    keepVisible = watchKeyboard(form, codeInput, verifyBtn, errorEl);
    try { codeInput.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }

  window.PinfoPhone = {
    renderPhone: renderPhone,
    renderCode: renderCode,
    // Exposed so the number rules can be checked without any screen.
    parse: parse,
    explicitIso: explicitIso,
    clean: clean,
    likelyIso: likelyIso,
    countries: BY_ISO,
    codes: CODES,
    main: MAIN
  };
})();
