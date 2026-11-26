// Web RSVP flow for magic invite links (/i/<token>), and the phone check for
// the plain link of a private event (/event/<uuid>, /e/<code>).
//
// Loaded dynamically by event/index.html (and 404.html, its GitHub Pages
// twin) only when the visited path is an invite link, or when the plain
// link of an event turns out to be private - the plain links of public
// events never fetch this file, so they stay as light as before.
//
// Talks directly to Supabase from the browser (never proxied through our
// own server or a Cloudflare Function): the database rate-limits by the
// visitor's IP, and a proxy would put every visitor into one shared
// bucket and lock everyone out. Only ever uses the publishable (anon) key,
// or - for group links - the visitor's own Firebase ID token after they
// verify their phone number themselves. Never a service-role or secret
// key; none exists in this file or anywhere else on this site.
//
// RSVP first, install second: the App Store / Smart App Banner pitch only
// ever appears after a successful answer, never in front of the
// Going / Maybe / Can't go buttons.
//
// Every name shown here was typed by a stranger (the host's name, an
// invitee's first name, guest list entries). Everything is rendered with
// textContent, never innerHTML, so nothing typed into a name field can
// inject markup.

(function () {
  "use strict";

  // The page loads this file as rsvp.js?v=<release>; the phone module is
  // then loaded with the same version, so a page can never pair with an old
  // cached copy of either file.
  var ASSET_V = (function () {
    try {
      var m = /[?&]v=([A-Za-z0-9._-]+)/.exec(document.currentScript && document.currentScript.src || "");
      return m ? m[1] : "";
    } catch (e) { return ""; }
  })();

  var SUPABASE_URL = "https://ftmwhexhxdskasskzglp.supabase.co";
  var SUPABASE_KEY = "sb_publishable_ESy4TzFh9kWTef57Bfoufg_D3ZSvKEv";
  var APPSTORE_URL = "https://apps.apple.com/app/id6463236759";
  var COVER_PLACEHOLDER = "/assets/cover-placeholder.svg";

  // ---- Firebase (group-link phone step) --------------------------------
  // Public web config, safe in browser code. No Analytics here on purpose:
  // the site does not track visitors and avoids needing a cookie-consent
  // banner for it.
  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyA7U9tmXAuh4mSrbiiuEbbpxaVXLCKKPWQ",
    authDomain: "pinfo-2023.firebaseapp.com",
    projectId: "pinfo-2023",
    storageBucket: "pinfo-2023.appspot.com",
    messagingSenderId: "440194580123",
    appId: "1:440194580123:web:c8bef0be13a96b5701103e"
  };
  var FIREBASE_SDK_VERSION = "10.14.1";

  function firebaseConfigured() {
    return !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.appId);
  }

  // ---- i18n ---------------------------------------------------------------
  // The app formats times in the viewer's own locale; this page mirrors
  // that by picking German when the browser's language is German and
  // English otherwise, rather than adding a separate language switch.
  var LOCALE = (navigator.language || "en").toLowerCase().indexOf("de") === 0 ? "de" : "en";

  var STRINGS = {
    en: {
      invalid: "This invitation link isn't valid anymore.",
      cancelled: "This event was cancelled by the host.",
      past: "This event is over.",
      removed: "This invitation is no longer available.",
      declinedText: function (host) { return host + " can't add you to this event."; },
      pendingText: function (host) { return "Request sent. " + host + " will see it in Pinfo. Come back to this link to check."; },
      checkAgain: "Check again",
      tooMany: "Too many requests. Please try again later.",
      rateLimited: function (mins) { return "Too many attempts. Please try again in " + mins + " minutes."; },
      networkError: "Couldn't reach Pinfo. Check your connection and try again.",
      retry: "Try again",
      genericError: "Something went wrong. Please try again.",
      personalGreeting: function (first, host) { return "Hi " + first + ", " + host + " invited you"; },
      groupGreeting: function (host) { return host + " invited you"; },
      groupSub: "Verify your phone number so the host knows who is coming.",
      chooseAnswer: "Choose your answer.",
      fullHeading: function (host) { return "All spots from this link are taken. You can ask " + host + " to let you in."; },
      askToJoin: "Ask to join",
      alreadySaid: { going: "You said Going. Change?", maybe: "You said Maybe. Change?", cant: "You said Can't go. Change?" },
      changeAnytime: "You can change your answer any time.",
      nameLabel: "Your name",
      namePlaceholder: "Your name",
      plusOnesLabel: "Bringing guests?",
      btnGoing: "Going",
      btnMaybe: "Maybe",
      btnCant: "Can't go",
      privacyPersonal: function (host) { return "Your answer is shared with " + host + "."; },
      ageConfirm: "By answering you confirm that you are 18 or older.",
      privacyGroupPrefix: "We use your number only to confirm it's you and to carry your answer into Pinfo if you join with it. We delete it 90 days after the event. Details in our ",
      privacyPolicyLinkText: "privacy policy",
      privacyPolicyUrl: "https://pinfoapp.com/privacy",
      phoneLabel: "Phone number",
      sendCode: "Send code",
      codeLabel: "Enter the 6-digit code",
      verify: "Verify",
      verifiedPrefix: "Verified: ",
      useAnotherNumber: "Use another number",
      notConfigured: "Phone sign-in isn't turned on yet. Please try this link again soon.",
      nameRequired: "Please enter your name",
      nameNotAllowed: "Please use a different name",
      thankGoing: "You're going! See you there.",
      thankMaybe: "Thanks, we noted you as maybe.",
      thankCant: function (host) { return "Thanks for letting " + host + " know."; },
      changeAnswer: "Change my answer",
      openInMaps: "Open in Maps",
      guestCount: function (going, maybe) { return going + " going, " + maybe + " maybe"; },
      installHeadingGoing: "Get Pinfo for this event",
      installLinesGoing: [
        "Chat with the other guests before it starts",
        "Get {host}'s updates if the time or place changes",
        "A reminder before it starts, and the photos afterwards"
      ],
      installHeadingMaybe: "Still deciding? Get Pinfo",
      installLinesMaybe: [
        "Get an update if anything changes",
        "Switch to Going in one tap when you know",
        "See who else is going and chat with them"
      ],
      installHeadingCant: function (host) { return "Don't miss " + host + "'s next one"; },
      installLinesCant: [
        "Get {host}'s next invite straight in the app",
        "Find what's on in {city} this week",
        "Plan your own event in seconds, just by talking"
      ],
      installButton: "Get Pinfo, it's free",
      installSubPersonal: function (host) { return "Sign in with the phone number " + host + " invited and the event is already waiting for you."; },
      installSubGroup: function (number) { return "Sign in with " + number + " and the event is already waiting for you."; },
      installSubCant: "Free on iPhone. Takes a minute to set up.",
      installHeadingPending: function (host) { return "Get Pinfo to see when " + host + " lets you in"; },
      installLinesPending: [
        "Get a message the moment {host} answers",
        "Chat with the other guests once you are in",
        "A reminder before it starts, and the photos afterwards"
      ],
      installSubPending: function (number) { return number ? "Sign in with " + number + " and your request is already waiting." : "Sign in with your phone number and your request is already waiting."; },
      hostFallback: "the host",
      openMyInvite: "I have Pinfo, open my invitation",
      qrCaption: "Scan with your iPhone camera",
      androidNote: "Pinfo is on iPhone for now. Your answer is saved either way.",
      platformNote: "Pinfo is on iPhone for now. You can answer and see everything about this event here.",
      addToGoogleCalendar: "Add to Google Calendar",
      downloadIcs: "Download for any calendar",
      keepLinkText: "Keep this link. It always shows the latest time and place, and you can change your answer here.",
      copyLink: "Copy link",
      linkCopied: "Link copied",
      privateTitle: "This is a private event.",
      privateBody: "If you were invited, confirm your phone number to see it.",
      notInvited: "This number isn't on the guest list. Ask the host to send you an invite link.",
      unavailableTitle: "This event isn't available",
      unavailableBody: "It may be private, cancelled, or the link may be wrong. If someone invited you, ask them to send the link again.",
      tooManyTries: "Too many tries. Try again in a few minutes.",
      somethingWrong: "Something went wrong. Try again in a moment.",
      hostLine: "You are the host of this event.",
      back: "Back",
      answerToSeeAddress: "Answer to see the address.",
      alreadySaidPlus: function (n) { return "You said Going +" + n + ". Change?"; },
      answerBy: function (d) { return "Please answer by " + d; },
      answerByLate: function (d) { return "Answers were due on " + d + ". You can still answer."; },
      goingPlus: function (n) { return "Going +" + n; },
      question: function (title) { return title ? "Are you coming to " + title + "?" : "Are you coming?"; },
      addressAfter: "The exact address is shown after you answer.",
      askHint: "The host will see this as Going.",
      invalidNext: "Check the link, or ask the host to send it again.",
      cancelledNext: "Open Pinfo to find other events near you.",
      addToCalendar: "Add to calendar",
      appNotOpened: "Pinfo didn't open. Get Pinfo first, then try again."
    },
    de: {
      invalid: "Dieser Einladungslink ist nicht mehr gültig.",
      cancelled: "Diese Veranstaltung wurde vom Gastgeber abgesagt.",
      past: "Diese Veranstaltung ist vorbei.",
      removed: "Diese Einladung ist nicht mehr verfügbar.",
      declinedText: function (host) { return host + " kann dich nicht zu dieser Veranstaltung hinzufügen."; },
      pendingText: function (host) { return "Anfrage gesendet. " + host + " sieht sie in Pinfo. Schau über diesen Link später noch einmal vorbei."; },
      checkAgain: "Erneut prüfen",
      tooMany: "Zu viele Anfragen. Bitte versuche es später erneut.",
      rateLimited: function (mins) { return "Zu viele Versuche. Bitte versuche es in " + mins + " Minuten erneut."; },
      networkError: "Pinfo konnte nicht erreicht werden. Prüfe deine Verbindung und versuche es erneut.",
      retry: "Erneut versuchen",
      genericError: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
      personalGreeting: function (first, host) { return "Hallo " + first + ", " + host + " hat dich eingeladen"; },
      groupGreeting: function (host) { return host + " hat dich eingeladen"; },
      groupSub: "Bestätige deine Telefonnummer, damit der Gastgeber weiß, wer kommt.",
      chooseAnswer: "Wähle deine Antwort.",
      fullHeading: function (host) { return "Alle Plätze über diesen Link sind vergeben. Du kannst " + host + " bitten, dich zuzulassen."; },
      askToJoin: "Beitritt anfragen",
      alreadySaid: { going: "Du hast Dabei gesagt. Ändern?", maybe: "Du hast Vielleicht gesagt. Ändern?", cant: "Du hast Kann nicht gesagt. Ändern?" },
      changeAnytime: "Du kannst deine Antwort jederzeit ändern.",
      nameLabel: "Dein Name",
      namePlaceholder: "Dein Name",
      plusOnesLabel: "Gäste mitbringen?",
      btnGoing: "Dabei",
      btnMaybe: "Vielleicht",
      btnCant: "Kann nicht",
      privacyPersonal: function (host) { return "Deine Antwort wird mit " + host + " geteilt."; },
      ageConfirm: "Mit deiner Antwort bestätigst du, dass du mindestens 18 Jahre alt bist.",
      privacyGroupPrefix: "Wir verwenden deine Nummer nur, um zu bestätigen, dass du es bist, und um deine Antwort zu Pinfo zu übertragen, falls du dich damit anmeldest. Wir löschen sie 90 Tage nach der Veranstaltung. Details in unserer ",
      privacyPolicyLinkText: "Datenschutzerklärung",
      privacyPolicyUrl: "https://pinfoapp.com/de/privacy",
      phoneLabel: "Telefonnummer",
      sendCode: "Code senden",
      codeLabel: "Gib den 6-stelligen Code ein",
      verify: "Bestätigen",
      verifiedPrefix: "Bestätigt: ",
      useAnotherNumber: "Andere Nummer verwenden",
      notConfigured: "Die Telefon-Anmeldung ist noch nicht aktiviert. Bitte versuche diesen Link bald erneut.",
      nameRequired: "Bitte gib deinen Namen ein",
      nameNotAllowed: "Bitte verwende einen anderen Namen",
      thankGoing: "Du bist dabei! Bis dann.",
      thankMaybe: "Danke, wir haben dich als vielleicht vermerkt.",
      thankCant: function (host) { return "Danke, dass du " + host + " Bescheid gegeben hast."; },
      changeAnswer: "Antwort ändern",
      openInMaps: "In Karten öffnen",
      guestCount: function (going, maybe) { return going + " dabei, " + maybe + " vielleicht"; },
      installHeadingGoing: "Hol dir Pinfo für dieses Event",
      installLinesGoing: [
        "Chatte schon vorher mit den anderen Gästen",
        "Bekomme Updates von {host}, wenn sich Zeit oder Ort ändern",
        "Eine Erinnerung vor dem Start und die Fotos danach"
      ],
      installHeadingMaybe: "Noch unsicher? Hol dir Pinfo",
      installLinesMaybe: [
        "Bekomme ein Update, wenn sich etwas ändert",
        "Mit einem Tipp auf Dabei wechseln, sobald du es weißt",
        "Sieh, wer noch kommt, und chatte mit ihnen"
      ],
      installHeadingCant: function (host) { return "Verpass nicht das nächste Event von " + host; },
      installLinesCant: [
        "Bekomme die nächste Einladung von {host} direkt in der App",
        "Finde, was diese Woche in {city} los ist",
        "Plane dein eigenes Event in Sekunden, einfach per Sprache"
      ],
      installButton: "Pinfo laden, kostenlos",
      installSubPersonal: function (host) { return "Melde dich mit der Telefonnummer an, mit der " + host + " dich eingeladen hat, und das Event wartet schon auf dich."; },
      installSubGroup: function (number) { return "Melde dich mit " + number + " an und das Event wartet schon auf dich."; },
      installSubCant: "Kostenlos für iPhone. In einer Minute eingerichtet.",
      installHeadingPending: function (host) { return "Hol dir Pinfo, um zu sehen, wann " + host + " dich zulässt"; },
      installLinesPending: [
        "Bekomme eine Nachricht, sobald {host} antwortet",
        "Chatte mit den anderen Gästen, sobald du dabei bist",
        "Eine Erinnerung vor dem Start und die Fotos danach"
      ],
      installSubPending: function (number) { return number ? "Melde dich mit " + number + " an und deine Anfrage wartet schon." : "Melde dich mit deiner Telefonnummer an und deine Anfrage wartet schon."; },
      hostFallback: "der Gastgeber",
      openMyInvite: "Ich habe Pinfo, meine Einladung öffnen",
      qrCaption: "Mit der iPhone-Kamera scannen",
      androidNote: "Pinfo gibt es vorerst nur für das iPhone. Deine Antwort ist trotzdem gespeichert.",
      platformNote: "Pinfo gibt es vorerst nur für das iPhone. Du kannst hier antworten und alles zu diesem Event sehen.",
      addToGoogleCalendar: "Zu Google Kalender hinzufügen",
      downloadIcs: "Für jeden Kalender herunterladen",
      keepLinkText: "Bewahre diesen Link auf. Er zeigt immer die neueste Zeit und den neuesten Ort, und du kannst hier deine Antwort ändern.",
      copyLink: "Link kopieren",
      linkCopied: "Link kopiert",
      privateTitle: "Das ist ein privates Event.",
      privateBody: "Wenn du eingeladen wurdest, bestätige deine Telefonnummer, um es zu sehen.",
      notInvited: "Diese Nummer steht nicht auf der Gästeliste. Bitte den Gastgeber, dir einen Einladungslink zu schicken.",
      unavailableTitle: "Dieses Event ist nicht verfügbar",
      unavailableBody: "Es ist vielleicht privat oder abgesagt, oder der Link ist falsch. Wenn dich jemand eingeladen hat, bitte ihn, dir den Link noch einmal zu schicken.",
      tooManyTries: "Zu viele Versuche. Versuche es in ein paar Minuten erneut.",
      somethingWrong: "Etwas ist schiefgelaufen. Versuche es gleich noch einmal.",
      hostLine: "Du bist der Gastgeber dieses Events.",
      back: "Zurück",
      answerToSeeAddress: "Antworte, um die Adresse zu sehen.",
      alreadySaidPlus: function (n) { return "Du hast Dabei +" + n + " gesagt. Ändern?"; },
      answerBy: function (d) { return "Bitte antworte bis " + d; },
      answerByLate: function (d) { return "Antworten waren bis " + d + " erbeten. Du kannst trotzdem noch antworten."; },
      goingPlus: function (n) { return "Dabei +" + n; },
      question: function (title) { return title ? "Kommst du zu " + title + "?" : "Kommst du?"; },
      addressAfter: "Die genaue Adresse siehst du nach deiner Antwort.",
      askHint: "Der Gastgeber sieht das als Dabei.",
      invalidNext: "Prüfe den Link oder bitte den Gastgeber, ihn noch einmal zu schicken.",
      cancelledNext: "Öffne Pinfo, um andere Events in deiner Nähe zu finden.",
      addToCalendar: "Zum Kalender hinzufügen",
      appNotOpened: "Pinfo hat sich nicht geöffnet. Hol dir zuerst Pinfo und versuche es dann erneut."
    }
  };
  var S = STRINGS[LOCALE];

  // ---- Platform detection ---------------------------------------------
  function isIOS() {
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) return true;
    // iPadOS reports as "Mac" with touch support.
    return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent);
  }

  // ---- Formatting --------------------------------------------------------
  function fmtDateTime(iso) {
    if (!iso) return "";
    try {
      return new Intl.DateTimeFormat(LOCALE === "de" ? "de-DE" : undefined, {
        weekday: "short", day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit"
      }).format(new Date(iso));
    } catch (e) { return ""; }
  }

  // Shows the full start-to-end range when an end time is available,
  // falling back to the start-only format otherwise.
  function fmtDateRange(startIso, endIso) {
    if (!startIso) return "";
    try {
      var locale = LOCALE === "de" ? "de-DE" : undefined;
      var toWord = LOCALE === "de" ? " bis " : " to ";
      var dateOpts = { weekday: "short", day: "numeric", month: "short" };
      var timeOpts = { hour: "2-digit", minute: "2-digit" };
      var start = new Date(startIso);
      var startDate = new Intl.DateTimeFormat(locale, dateOpts).format(start);
      var startTime = new Intl.DateTimeFormat(locale, timeOpts).format(start);
      if (!endIso) return startDate + ", " + startTime;
      var end = new Date(endIso);
      if (isNaN(end.getTime()) || end <= start) return startDate + ", " + startTime;
      var endTime = new Intl.DateTimeFormat(locale, timeOpts).format(end);
      if (start.toDateString() === end.toDateString()) return startDate + ", " + startTime + toWord + endTime;
      var endDate = new Intl.DateTimeFormat(locale, dateOpts).format(end);
      return startDate + ", " + startTime + toWord + endDate + ", " + endTime;
    } catch (e) { return fmtDateTime(startIso); }
  }

  // Country-aware grouping for display only - not used for any API call,
  // which always uses the raw E.164 string or the Firebase token itself.
  // Keyed by calling code (without the "+"); covers every code selectable
  // in the phone step below, plus "1" for US/Canada. The digit-block
  // lengths match how people in that country write their own numbers; the
  // last block absorbs whatever digits are left over, so a number a
  // little longer or shorter than the example below still groups
  // sensibly instead of being cut off.
  var PHONE_CODE_LENGTH = { "49": 2, "43": 2, "41": 2, "31": 2, "33": 2, "34": 2, "39": 2, "44": 2, "48": 2, "1": 1, "351": 3, "45": 2, "46": 2, "47": 2, "358": 3 };
  var PHONE_BLOCKS = {
    "44": [4, 6],       // UK: 7700 900123
    "33": [1, 2, 2, 2, 2], // France: 6 12 34 56 78
    "39": [3, 3, 4],    // Italy: 312 345 6789
    "31": [1, 8],       // Netherlands: 6 12345678
    "34": [3, 2, 2, 2], // Spain: 612 34 56 78
    "43": [3, 7],       // Austria: 664 1234567
    "41": [2, 3, 2, 2], // Switzerland: 79 123 45 67
    "48": [3, 3, 3],    // Poland: 512 345 678
    "1": [3, 3, 4]      // US/Canada: 415 555 0132
  };

  function splitPhoneBlocks(digits, blocks) {
    var parts = [];
    var i = 0;
    for (var b = 0; b < blocks.length; b++) {
      var isLast = b === blocks.length - 1;
      var take = isLast ? digits.length - i : blocks[b];
      if (take <= 0) break;
      parts.push(digits.slice(i, i + take));
      i += take;
    }
    if (i < digits.length) parts.push(digits.slice(i));
    return parts;
  }

  function fmtPhoneDisplay(e164) {
    if (!e164 || e164.charAt(0) !== "+") return e164 || "";
    var all = e164.slice(1);

    // German mobile numbers (015x/016x/017x, written here without the
    // leading 0): a 3-digit prefix block, then the rest as one block -
    // e.g. +49 151 00000000. Any other German number falls back to the
    // generic rule below, same as an unlisted country.
    if (all.indexOf("49") === 0 && /^(15|16|17)/.test(all.slice(2))) {
      var deRest = all.slice(2);
      return "+49 " + deRest.slice(0, 3) + " " + deRest.slice(3);
    }

    var codes = Object.keys(PHONE_CODE_LENGTH).sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < codes.length; i++) {
      var code = codes[i];
      if (all.indexOf(code) !== 0) continue;
      var rest = all.slice(code.length);
      var blocks = PHONE_BLOCKS[code];
      // The code itself, then the digits as one run if we have no
      // country-specific grouping for it - never a guessed split.
      return "+" + code + " " + (blocks ? splitPhoneBlocks(rest, blocks).join(" ") : rest);
    }

    return e164;
  }

  // ---- DOM helpers ---------------------------------------------------------
  // Every piece of user-provided or server-provided text goes through
  // these as plain text (textContent) - never innerHTML - so a name, host
  // name, or event title typed by a stranger can never inject markup.
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") node.addEventListener(k.slice(2), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  // ---- Supabase calls -------------------------------------------------------
  function withTimeout(promise, ms) {
    return new Promise(function (resolve) {
      var done = false;
      var timer = setTimeout(function () {
        if (!done) { done = true; resolve({ timedOut: true }); }
      }, ms);
      promise.then(function (v) {
        if (!done) { done = true; clearTimeout(timer); resolve(v); }
      }, function () {
        if (!done) { done = true; clearTimeout(timer); resolve({ timedOut: true }); }
      });
    });
  }

  // idToken, when given, re-checks the invite as this verified visitor
  // rather than anonymously - needed for a returning group-link member,
  // whose anonymous preview can say "full" (the one seat is taken, by
  // them) even though they are the one on the list.
  function previewInvite(token, idToken) {
    // The page asked for the anonymous answer while this script was still
    // downloading. It is used once, for the first anonymous request only.
    var early = window.pinfoEarlyPreview;
    window.pinfoEarlyPreview = null;
    if (early && !idToken && early.token === token) {
      return withTimeout(early.promise.catch(function () { return null; }), 10000);
    }
    var url = SUPABASE_URL + "/rest/v1/rpc/get_invite_preview?_token=" + encodeURIComponent(token);
    var auth = idToken ? ("Bearer " + idToken) : ("Bearer " + SUPABASE_KEY);
    return withTimeout(
      fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: auth } })
        .then(function (r) { return r.ok ? r.json() : null; }),
      10000
    );
  }

  function authedRpc(name, body, idToken) {
    var auth = idToken ? ("Bearer " + idToken) : ("Bearer " + SUPABASE_KEY);
    return withTimeout(
      fetch(SUPABASE_URL + "/rest/v1/rpc/" + name, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }).then(function (r) { return r.json().then(function (data) { return { httpOk: r.ok, data: data }; }); }),
      10000
    );
  }

  function rsvpStatus(token, idToken) {
    return authedRpc("web_rsvp_status", { p_token: token }, idToken);
  }

  // Set only when this page was opened as the plain link of a private
  // event (initPrivate below). The invite flow never sets it.
  var privateEventId = null;

  function rsvpAnswer(token, response, name, plusOnes, idToken) {
    if (privateEventId) {
      // The phone always comes from the visitor's token, never from here.
      return authedRpc("web_event_rsvp", {
        p_event_id: privateEventId, p_response: response, p_name: name || null, p_plus_ones: plusOnes || 0
      }, idToken);
    }
    return authedRpc("web_rsvp", {
      p_token: token, p_response: response, p_name: name || null, p_plus_ones: plusOnes || 0
    }, idToken);
  }

  // ---- Firebase phone auth (group links only) -------------------------------
  var firebaseState = { app: null, auth: null, authMod: null, confirmationResult: null, verifiedPhone: null, verifier: null };

  function loadFirebase() {
    if (firebaseState.auth) return Promise.resolve(firebaseState);
    var base = "https://www.gstatic.com/firebasejs/" + FIREBASE_SDK_VERSION + "/";
    return Promise.all([
      import(/* webpackIgnore: true */ base + "firebase-app.js"),
      import(/* webpackIgnore: true */ base + "firebase-auth.js")
    ]).then(function (mods) {
      var appMod = mods[0], authMod = mods[1];
      var app = appMod.initializeApp(FIREBASE_CONFIG);
      var auth = authMod.getAuth(app);
      // Send the verification SMS and reCAPTCHA in the visitor's own
      // language instead of always English. Must be set before the
      // RecaptchaVerifier is created and before signInWithPhoneNumber is
      // called; both happen later in sendPhoneCode(), after this resolves.
      // Firebase falls back to English for languages it has no template
      // for.
      authMod.useDeviceLanguage(auth);
      firebaseState.app = app;
      firebaseState.auth = auth;
      firebaseState.authMod = authMod;
      return firebaseState;
    });
  }

  function currentFirebaseUser() {
    if (!firebaseConfigured()) return Promise.resolve(null);
    return loadFirebase().then(function (fb) {
      return new Promise(function (resolve) {
        var unsub = fb.authMod.onAuthStateChanged(fb.auth, function (user) {
          unsub();
          resolve(user || null);
        });
      });
    }).catch(function () { return null; });
  }

  // A Firebase script that never arrives must not hold the page on its
  // loading card: after a few seconds the visitor is treated as not signed in.
  function currentFirebaseUserSoon() {
    return withTimeout(currentFirebaseUser(), 8000).then(function (u) { return u && u.timedOut ? null : u; });
  }

  function getIdToken() {
    if (!firebaseState.auth || !firebaseState.auth.currentUser) return Promise.resolve(null);
    return firebaseState.auth.currentUser.getIdToken().catch(function () { return null; });
  }

  function clearVerifier() {
    var v = firebaseState.verifier;
    firebaseState.verifier = null;
    if (v && typeof v.clear === "function") { try { v.clear(); } catch (e) { /* already gone */ } }
  }

  // Stops waiting for a code that is being sent (the robot check was
  // closed, or the visitor went back). The next send starts clean.
  function cancelPhoneCode() {
    firebaseState.confirmationResult = null;
    clearVerifier();
  }

  function sendPhoneCode(e164, recaptchaContainerId) {
    return loadFirebase().then(function (fb) {
      clearVerifier();
      var verifier = new fb.authMod.RecaptchaVerifier(fb.auth, recaptchaContainerId, { size: "invisible" });
      firebaseState.verifier = verifier;
      return fb.authMod.signInWithPhoneNumber(fb.auth, e164, verifier).then(function (confirmationResult) {
        firebaseState.confirmationResult = confirmationResult;
        return confirmationResult;
      });
    });
  }

  function confirmPhoneCode(code) {
    if (!firebaseState.confirmationResult) return Promise.reject(new Error("no confirmation in progress"));
    return firebaseState.confirmationResult.confirm(code).then(function (result) {
      firebaseState.verifiedPhone = result.user && result.user.phoneNumber;
      return result.user;
    });
  }

  // ---- Rendering -------------------------------------------------------------
  var root, headerCover, headerTitle, headerMeta, headerPlatformNote, contentEl;

  function initDom(rootNode) {
    root = rootNode;
    headerCover = root.querySelector("#rsvp-cover");
    headerTitle = root.querySelector("#rsvp-title");
    headerMeta = root.querySelector("#rsvp-meta");
    headerPlatformNote = root.querySelector("#rsvp-platform-note");
    contentEl = root.querySelector("#rsvp-content");
  }

  // A header that says nothing about the event: the private-link gate and
  // every answer that must not name it.
  function setGenericHeader(title, meta) {
    headerTitle.classList.remove("skeleton");
    headerMeta.classList.remove("skeleton");
    headerTitle.textContent = title || "";
    headerMeta.textContent = meta || "";
    headerMeta.classList.toggle("hidden", !meta);
    headerCover.src = COVER_PLACEHOLDER;
    headerCover.alt = "";
  }

  function setHeader(preview) {
    headerTitle.classList.remove("skeleton");
    headerMeta.classList.remove("skeleton");
    headerMeta.classList.remove("hidden");
    headerTitle.textContent = preview && preview.title ? preview.title : "";
    var when = preview && preview.date_start ? fmtDateRange(preview.date_start, preview.date_end) : "";
    var where = preview && preview.area ? preview.area : "";
    headerMeta.textContent = [when, where].filter(Boolean).join(" - ");
    var cover = preview && (preview.cover_url || preview.image_url);
    headerCover.src = cover || COVER_PLACEHOLDER;
    headerCover.alt = (preview && preview.title) || "";
  }

  function privacyGroupLine() {
    return el("p", { class: "privacy-line" }, [
      S.privacyGroupPrefix,
      el("a", { href: S.privacyPolicyUrl, target: "_blank", rel: "noopener", text: S.privacyPolicyLinkText }),
      "."
    ]);
  }

  // "Verified: <number>" with a way to switch numbers. Group links only,
  // once the visitor's phone number is verified.
  function verifiedLine(token, authCtx) {
    if (!authCtx || !authCtx.phoneDisplay) return null;
    return el("p", { class: "privacy-line verified-line" }, [
      S.verifiedPrefix + authCtx.phoneDisplay + " \u00b7 ",
      el("a", {
        href: "#", class: "use-another-number", text: S.useAnotherNumber,
        onclick: function (e) { e.preventDefault(); useAnotherNumber(token); }
      })
    ]);
  }

  // Signs the visitor out of Firebase and starts again at the phone step.
  function useAnotherNumber(token) {
    function restart() {
      firebaseState.confirmationResult = null;
      firebaseState.verifiedPhone = null;
      if (privateEventId) initPrivate(root, privateEventId);
      else init(root, token);
    }
    if (!firebaseState.auth || !firebaseState.authMod) return restart();
    firebaseState.authMod.signOut(firebaseState.auth).then(restart, restart);
  }

  function card(children) {
    return el("div", { class: "rsvp-screen" }, children);
  }

  function errorRetryScreen(message, onRetry) {
    clear(contentEl);
    contentEl.appendChild(card([
      el("p", { class: "meta", text: message }),
      el("button", { class: "btn btn-primary", text: S.retry, onclick: onRetry })
    ]));
  }

  function renderNetworkError(onRetry) {
    errorRetryScreen(S.networkError, onRetry);
  }

  function renderSimpleMessage(message, opts) {
    opts = opts || {};
    clear(contentEl);
    var children = [el("p", { class: "meta", text: message })];
    if (opts.next) children.push(el("p", { class: "meta", text: opts.next }));
    if (opts.button) children.push(el("button", { class: "btn btn-primary", text: opts.button.label, onclick: opts.button.onClick }));
    // The app is for iPhone: the button is only offered where it can work.
    if (opts.getPinfo && isIOS()) children.push(el("a", { class: "btn btn-store", href: APPSTORE_URL, text: S.installButton }));
    contentEl.appendChild(card(children));
  }

  // A link that does not lead anywhere, and an event that was cancelled, say
  // what to do next instead of just stopping.
  function renderInvalid() { renderSimpleMessage(S.invalid, { next: S.invalidNext, getPinfo: true }); }
  function renderCancelled() { renderSimpleMessage(S.cancelled, { next: S.cancelledNext, getPinfo: true }); }

  // A finger on a button while a text field has focus: the first tap used to
  // only close the keyboard, the page moved, and the tap was lost. The press
  // is now taken when the finger lifts, on the button it first touched, so
  // the keyboard closing cannot move the button out from under it. A swipe
  // is left alone.
  function installFirstTap(rootEl) {
    if (!rootEl || rootEl.pinfoFirstTap) return;
    rootEl.pinfoFirstTap = true;
    var press = null;
    rootEl.addEventListener("touchstart", function (e) {
      var ae = document.activeElement;
      var typing = !!(ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName));
      var btn = typing && e.target && e.target.closest ? e.target.closest("button") : null;
      var t = e.touches && e.touches[0];
      press = btn && !btn.disabled && e.touches.length === 1 && t ? { btn: btn, x: t.clientX, y: t.clientY } : null;
    }, { passive: true });
    rootEl.addEventListener("touchmove", function (e) {
      var t = e.touches && e.touches[0];
      if (press && t && (Math.abs(t.clientX - press.x) > 10 || Math.abs(t.clientY - press.y) > 10)) press = null;
    }, { passive: true });
    rootEl.addEventListener("touchcancel", function () { press = null; }, { passive: true });
    rootEl.addEventListener("touchend", function (e) {
      var p = press;
      press = null;
      if (!p || !document.body.contains(p.btn)) return;
      if (e.cancelable) e.preventDefault();
      p.btn.click();
    }, { passive: false });
  }

  // The guest's own plus-ones, kept for this tab. The server does not send
  // them back with the answer, so this is what lets the page say
  // "You said Going +1" and count them. Only a number the guest chose here.
  function answerKey(token) {
    return privateEventId ? "e:" + privateEventId : (token ? "i:" + token : null);
  }

  function rememberPlus(key, response, plus) {
    if (!key) return;
    try {
      if (response === "going" && plus > 0) window.sessionStorage.setItem("pinfo-plus-" + key, String(plus));
      else window.sessionStorage.removeItem("pinfo-plus-" + key);
    } catch (e) { /* storage unavailable */ }
  }

  function recallPlus(key) {
    if (!key) return 0;
    try {
      var n = parseInt(window.sessionStorage.getItem("pinfo-plus-" + key), 10);
      return n > 0 && n <= 3 ? n : 0;
    } catch (e) { return 0; }
  }

  function alreadySaidText(response, plus) {
    if (response === "going" && plus > 0) return S.alreadySaidPlus(plus);
    return S.alreadySaid[response] || "";
  }

  // ---- Names ---------------------------------------------------------------
  // Invisible and control characters out, spaces collapsed, at most 40
  // characters (emoji count as one), and something a person could be called.
  function cleanName(raw) {
    var t = String(raw == null ? "" : raw)
      .replace(/[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁠⁦-⁩﻿]/g, " ")
      .replace(/\s+/g, " ").trim();
    var cps = Array.from(t);
    if (cps.length > 40) t = cps.slice(0, 40).join("").trim();
    return t;
  }

  function nameUsable(t) {
    if (!t) return false;
    try { return /[\p{L}\p{N}\p{Extended_Pictographic}]/u.test(t); } catch (e) { return /[A-Za-z0-9À-￿]/.test(t); }
  }

  // ---- "Answer by <day>" ------------------------------------------------------
  // rsvp_by is a calendar day ("YYYY-MM-DD"), not a moment: it is read as
  // three numbers and never turned into a Date, so no time zone can move it.
  var WEEKDAY_NAMES = {
    en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    de: ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."]
  };
  var MONTH_NAMES = {
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    de: ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."]
  };

  function parseDay(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || ""));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var dim = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (mo < 1 || mo > 12 || d < 1 || d > dim[mo - 1]) return null;
    // Day of the week from the three numbers (0 = Sunday).
    var t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
    var yy = mo < 3 ? y - 1 : y;
    var wd = (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[mo - 1] + d) % 7;
    return { y: y, mo: mo, d: d, wd: wd };
  }

  function fmtDay(p) {
    return LOCALE === "de"
      ? WEEKDAY_NAMES.de[p.wd] + ", " + p.d + ". " + MONTH_NAMES.de[p.mo - 1]
      : WEEKDAY_NAMES.en[p.wd] + " " + p.d + " " + MONTH_NAMES.en[p.mo - 1];
  }

  // The sentence for the day, or "" when there is none (an absent key, null,
  // or anything that is not a real day). After the day, in the visitor's
  // own calendar, it says so. Nothing is ever blocked.
  function answerByText(preview) {
    var p = parseDay(preview && preview.rsvp_by);
    if (!p) return "";
    var now = new Date();
    var today = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    var late = today > p.y * 10000 + p.mo * 100 + p.d;
    return late ? S.answerByLate(fmtDay(p)) : S.answerBy(fmtDay(p));
  }

  function answerByLine(preview) {
    var text = answerByText(preview);
    return text ? el("p", { class: "answer-by hint-left", text: text }) : null;
  }

  // ---- The guest's own plus-ones from the server ---------------------------------
  // New keys, absent until the server has them: then everything works as
  // before (the number the guest chose in this tab). When present they win.
  function serverPlus(o) {
    return o && typeof o.plus_ones === "number" && o.plus_ones >= 0 && o.plus_ones <= 3 ? Math.floor(o.plus_ones) : null;
  }

  function previewPlus(pv) {
    return pv && typeof pv.current_plus_ones === "number" && pv.current_plus_ones >= 0 && pv.current_plus_ones <= 3 ? Math.floor(pv.current_plus_ones) : null;
  }

  function ingestPlus(token, response, plus) {
    if (plus === null || plus === undefined) return;
    rememberPlus(answerKey(token), response, response === "going" ? plus : 0);
  }

  // "N going, M maybe": people going including their plus-ones when the
  // server counts them (going_headcount), else the faces plus this guest's
  // own plus-ones. No line at all when the list is hidden (going is null).
  function guestCountLine(guests, response, key) {
    if (!guests || guests.visible === false || guests.going == null) return null;
    var going;
    if (typeof guests.going_headcount === "number") going = guests.going_headcount;
    else going = (guests.going || 0) + (response === "going" ? recallPlus(key) : 0);
    return S.guestCount(going, guests.maybe || 0);
  }

  // The three answer buttons. The +1 / +2 / +3 step belongs to Going only: it
  // opens after tapping Going (preselected with the current plus-ones), so it
  // can never be filled in and then lost on Maybe.
  function answerControls(o) {
    var plus = 0;
    var area = el("div", { class: "rsvp-screen" });
    var goingBtn = el("button", { type: "button", class: "btn btn-answer btn-going", text: S.btnGoing });
    var maybeBtn = el("button", { type: "button", class: "btn btn-answer btn-maybe", text: S.btnMaybe, onclick: function () { o.submit("maybe", 0); } });
    var cantBtn = el("button", { type: "button", class: "btn btn-answer btn-cant", text: S.btnCant, onclick: function () { o.submit("cant", 0); } });
    var row = el("div", { class: "answer-row" }, [goingBtn, maybeBtn, cantBtn]);
    var selected = { going: goingBtn, maybe: maybeBtn, cant: cantBtn }[o.current];
    if (selected) selected.classList.add("selected");

    function showButtons() {
      plus = 0;
      clear(area);
      area.appendChild(row);
    }
    function showPlusStep() {
      clear(area);
      plus = Math.min(o.currentPlus || 0, o.maxPlus);
      area.appendChild(plusOnesControl(o.maxPlus, function (v) { plus = v; }, plus));
      area.appendChild(el("button", { type: "button", class: "btn btn-primary", text: S.btnGoing, onclick: function () { o.submit("going", plus); } }));
      area.appendChild(el("a", {
        href: "#", class: "change-answer-link", text: S.back,
        onclick: function (e) { e.preventDefault(); showButtons(); }
      }));
    }
    goingBtn.addEventListener("click", function () {
      if (o.maxPlus > 0) showPlusStep(); else o.submit("going", 0);
    });
    area.appendChild(row);
    return {
      el: area,
      setDisabled: function (disabled) {
        Array.prototype.forEach.call(area.querySelectorAll("button"), function (b) { b.disabled = disabled; });
      }
    };
  }

  function plusOnesControl(maxAllowed, onChange, initial) {
    if (!maxAllowed) return null;
    var value = initial > 0 && initial <= maxAllowed ? initial : 0;
    var chips = el("div", { class: "chip-row" }, []);
    var buttons = [];
    function render() {
      buttons.forEach(function (b, i) {
        if (i + 1 === value) b.classList.add("chip-active"); else b.classList.remove("chip-active");
      });
    }
    for (var i = 1; i <= maxAllowed; i++) {
      (function (n) {
        var b = el("button", {
          type: "button", class: "chip", text: "+" + n,
          onclick: function () { value = (value === n) ? 0 : n; render(); onChange(value); }
        });
        buttons.push(b);
        chips.appendChild(b);
      })(i);
    }
    render();
    return el("div", { class: "field" }, [
      el("label", { class: "field-label", text: S.plusOnesLabel }),
      chips
    ]);
  }

  // Renders the Going/Maybe/Can't go answer form. `preview` is the
  // get_invite_preview row; `authCtx` is { idToken } for group links
  // (null for personal links, where the publishable key is used).
  function renderAnswerForm(token, preview, authCtx, opts) {
    opts = opts || {};
    clear(contentEl);

    var isPersonal = preview.link_kind === "personal";
    var isFull = preview.status === "full";
    var key = answerKey(token);
    // Someone who already has a name on file (a verified guest: the host's
    // contact name or the Pinfo account's name) is not asked for it again on
    // every link: no field up front, the server says if it needs one. A
    // personal link's invitee has no number check, so the name is asked.
    var skipName = !!opts.skipName;
    var nameVisible = !skipName && isPersonal;
    var nameInput = skipName ? null : el("input", {
      type: "text", class: "input", maxlength: "40", placeholder: S.namePlaceholder, autocomplete: "name",
      value: isPersonal && preview.invitee_first_name ? preview.invitee_first_name : ""
    });
    if (nameInput && isPersonal && preview.invitee_first_name) nameInput.value = preview.invitee_first_name;
    var nameField = skipName ? null : el("div", { class: nameVisible ? "field" : "field hidden" }, [
      el("label", { class: "field-label", text: S.nameLabel }),
      nameInput
    ]);
    var errorEl = el("p", { class: "field-error hidden" });
    var controls = null;

    function showError(text) {
      errorEl.textContent = text;
      errorEl.classList.remove("hidden");
    }

    function revealName() {
      nameVisible = true;
      if (nameField) nameField.classList.remove("hidden");
      if (nameInput) nameInput.focus();
    }

    function setDisabled(disabled) {
      if (controls) controls.setDisabled(disabled);
      Array.prototype.forEach.call(contentEl.querySelectorAll(".ask-join-btn"), function (b) { b.disabled = disabled; });
    }

    function submit(response, plus) {
      var name = nameInput ? (cleanName(nameInput.value) || null) : null;
      if (nameVisible && !nameUsable(name)) {
        showError(S.nameRequired);
        nameInput.focus();
        return;
      }
      errorEl.classList.add("hidden");
      setDisabled(true);
      rsvpAnswer(token, response, name, plus, authCtx && authCtx.idToken).then(function (res) {
        setDisabled(false);
        if (res.timedOut) return renderNetworkError(function () { renderAnswerForm(token, preview, authCtx, opts); });
        if (res.data && res.data.status === "ok") {
          var sp = serverPlus(res.data);
          rememberPlus(key, response, response === "going" ? (sp !== null ? sp : plus) : 0);
        }
        handleRsvpResult(token, preview, authCtx, res.data, { showError: showError, revealName: revealName });
      });
    }

    var heading;
    if (isPersonal) {
      heading = S.personalGreeting(preview.invitee_first_name || "", preview.host_name || "");
    } else {
      heading = isFull ? S.fullHeading(preview.host_name || "") : S.groupGreeting(preview.host_name || "");
    }

    var children = [el("h2", { class: "rsvp-heading", text: heading })];

    var verified = verifiedLine(token, authCtx);
    if (verified) children.push(verified);

    // On a first answer say what is being asked; on the change-answer
    // screen the "You said X. Change?" line below says enough.
    if (!isFull && !opts.alreadyResponse) {
      children.push(el("p", { class: "meta", text: S.question(preview.title) }));
      children.push(el("p", { class: "hint-left", text: S.addressAfter }));
    }

    if (preview.description) {
      children.push(el("p", { class: "description", text: preview.description }));
    }

    if (opts.alreadyResponse) {
      children.push(el("p", { class: "already-said", text: alreadySaidText(opts.alreadyResponse, recallPlus(key)) }));
      children.push(el("p", { class: "hint-left", text: S.changeAnytime }));
    }

    if (nameField) children.push(nameField);
    children.push(errorEl);

    var byLine = answerByLine(preview);
    if (byLine) children.push(byLine);

    if (isFull) {
      // A request to join is for the person: no +1 to choose, and the host
      // sees it as Going, which is said.
      children.push(el("button", {
        type: "button", class: "btn btn-primary ask-join-btn", text: S.askToJoin,
        onclick: function () { submit("going", 0); }
      }));
      children.push(el("p", { class: "hint-left", text: S.askHint }));
    } else {
      controls = answerControls({
        maxPlus: preview.plus_ones_allowed || 0,
        current: opts.alreadyResponse,
        currentPlus: recallPlus(key),
        submit: submit
      });
      children.push(controls.el);
    }

    children.push(el("p", { class: "privacy-line", text: S.ageConfirm }));

    if (!isPersonal) {
      children.push(privacyGroupLine());
    } else {
      children.push(el("p", { class: "privacy-line", text: S.privacyPersonal(preview.host_name || "") }));
    }

    contentEl.appendChild(card(children));
  }

  // ---- Phone step (group links) ----------------------------------------
  // The number reading, country list and both screens live in
  // assets/rsvp-phone.js, fetched only when this step is shown, so the
  // first screen of an invitation does not carry them.
  var phoneModulePromise = null;

  function loadPhoneModule() {
    if (window.PinfoPhone) return Promise.resolve(window.PinfoPhone);
    if (phoneModulePromise) return phoneModulePromise;
    phoneModulePromise = new Promise(function (resolve, reject) {
      var tag = document.createElement("script");
      tag.src = "/assets/rsvp-phone.js" + (ASSET_V ? "?v=" + ASSET_V : "");
      tag.onload = function () { window.PinfoPhone ? resolve(window.PinfoPhone) : reject(new Error("phone module missing")); };
      tag.onerror = function () { reject(new Error("phone module failed")); };
      document.head.appendChild(tag);
    }).catch(function (e) { phoneModulePromise = null; throw e; });
    return phoneModulePromise;
  }

  // opts (all optional): heading ("" for none), hideSub, notice, key (the
  // name this step remembers its number under).
  function renderPhoneStep(token, preview, onVerified, opts) {
    opts = opts || {};
    clear(contentEl);

    var heading = opts.heading !== undefined ? opts.heading
      : preview.status === "full" ? S.fullHeading(preview.host_name || "") : S.groupGreeting(preview.host_name || "");

    if (!firebaseConfigured()) {
      contentEl.appendChild(card([
        el("h2", { class: "rsvp-heading", text: heading }),
        el("p", { class: "meta", text: S.notConfigured })
      ]));
      return;
    }

    // Same top of the screen while the phone module loads.
    var top = [];
    var byText = preview ? answerByText(preview) : "";
    if (heading) top.push(el("h2", { class: "rsvp-heading", text: heading }));
    if (!opts.hideSub) top.push(el("p", { class: "meta", text: S.groupSub }));
    if (byText) top.push(el("p", { class: "answer-by hint-left", text: byText }));
    if (top.length) contentEl.appendChild(card(top));

    loadPhoneModule().then(function (phone) {
      phone.renderPhone({
        token: opts.key || token, locale: LOCALE, S: S, heading: heading, hideSub: !!opts.hideSub, notice: opts.notice || null, answerBy: byText,
        el: el, clear: clear, card: card, privacyGroupLine: privacyGroupLine,
        fmtPhoneDisplay: fmtPhoneDisplay, contentEl: contentEl, rootEl: root, firstTap: installFirstTap,
        sendPhoneCode: sendPhoneCode, confirmPhoneCode: confirmPhoneCode, cancelPhoneCode: cancelPhoneCode,
        onVerified: onVerified
      });
    }, function () {
      errorRetryScreen(S.networkError, function () { renderPhoneStep(token, preview, onVerified, opts); });
    });
  }

  // ---- Result handling -------------------------------------------------
  function handleRsvpResult(token, preview, authCtx, data, extra) {
    extra = extra || {};
    var status = data && data.status;
    switch (status) {
      case "ok":
        renderThankYou(token, data, authCtx, preview);
        break;
      case "pending_approval":
        renderPendingScreen(token, preview, authCtx);
        break;
      case "declined":
        renderSimpleMessage(S.declinedText(preview.host_name || ""));
        break;
      case "full":
        renderSimpleMessage(S.tooMany);
        break;
      case "phone_required":
        renderPhoneStep(token, preview, function (e164) { continueAfterVerification(token, preview, e164); });
        break;
      case "name_required":
        if (extra.revealName) extra.revealName();
        if (extra.showError) extra.showError(S.nameRequired);
        break;
      case "name_not_allowed":
        if (extra.revealName) extra.revealName();
        if (extra.showError) extra.showError(S.nameNotAllowed);
        break;
      case "invalid":
        renderInvalid();
        break;
      case "cancelled":
        renderCancelled();
        break;
      case "past":
        renderSimpleMessage(S.past);
        break;
      case "removed":
        renderSimpleMessage(S.removed);
        break;
      case "rate_limited":
        var mins = Math.ceil((data.retry_after_s || 60) / 60);
        renderSimpleMessage(S.rateLimited(mins));
        break;
      case "bad_request":
        renderSimpleMessage(S.genericError);
        break;
      default:
        renderSimpleMessage(S.genericError);
    }
  }

  // A number on a group link has just been verified (or was verified
  // earlier on this device). Ask the server what it has for THIS number
  // before drawing anything: a number that already answered, or that the
  // host let in, gets its answer back instead of a fresh form. The preview
  // loaded before the check was for a stranger, so a number with nothing yet
  // gets a preview asked again as the verified visitor.
  function continueAfterVerification(token, preview, e164) {
    getIdToken().then(function (idToken) {
      var authCtx = { idToken: idToken, phoneDisplay: fmtPhoneDisplay(e164) };
      rsvpStatus(token, idToken).then(function (sres) {
        if (sres.timedOut) return renderNetworkError(function () { continueAfterVerification(token, preview, e164); });
        var data = sres.data;
        if (!(data && data.status === "not_responded")) return handleStatusResult(token, preview, authCtx, data);
        previewInvite(token, idToken).then(function (rows) {
          var fresh = rows && rows[0] ? rows[0] : preview;
          if (fresh.status === "cancelled") return renderCancelled();
          if (fresh.status === "past") return renderSimpleMessage(S.past);
          if (fresh.status === "removed") return renderSimpleMessage(S.removed);
          renderAnswerForm(token, fresh, authCtx);
        });
      });
    });
  }

  function renderPendingScreen(token, preview, authCtx) {
    clear(contentEl);
    var checkBtn = el("button", {
      class: "btn btn-primary", text: S.checkAgain,
      onclick: function () {
        rsvpStatus(token, authCtx && authCtx.idToken).then(function (res) {
          if (res.timedOut) return renderNetworkError(function () { renderPendingScreen(token, preview, authCtx); });
          handleStatusResult(token, preview, authCtx, res.data);
        });
      }
    });
    var screen = card([
      el("p", { class: "meta", text: S.pendingText(preview.host_name || "") }),
      checkBtn
    ]);
    contentEl.appendChild(screen);
    // Someone waiting to be let in is not "still deciding": the pitch says so.
    appendInstallBlock(contentEl, { response: "pending", preview: preview, authCtx: authCtx, token: token });
  }

  function handleStatusResult(token, preview, authCtx, data) {
    var status = data && data.status;
    if (status === "ok") {
      ingestPlus(token, data.response, serverPlus(data));
      return renderThankYou(token, data, authCtx, preview);
    }
    if (status === "pending_approval") return renderPendingScreen(token, preview, authCtx);
    if (status === "declined") return renderSimpleMessage(S.declinedText(preview.host_name || ""));
    if (status === "not_responded") return renderAnswerForm(token, preview, authCtx);
    if (status === "phone_required") {
      return renderPhoneStep(token, preview, function (e164) { continueAfterVerification(token, preview, e164); });
    }
    if (status === "rate_limited") {
      var mins = Math.ceil((data.retry_after_s || 60) / 60);
      return renderSimpleMessage(S.rateLimited(mins));
    }
    if (status === "invalid") return renderInvalid();
    if (status === "cancelled") return renderCancelled();
    if (status === "past") return renderSimpleMessage(S.past);
    if (status === "removed") return renderSimpleMessage(S.removed);
    return renderSimpleMessage(S.genericError);
  }

  // ---- Keep-this-link block (Google Calendar, .ics, copy link) -----------
  // Shown only after Going or Maybe. On Android it comes first, ahead of
  // the install pitch, since this is how an Android guest keeps the event
  // without the app.
  function fmtIcsDate(d) {
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  }

  function icsEscape(s) {
    return String(s || "")
      .replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  }

  function gcalHref(title, start, end, locationStr, description) {
    var params = [
      "action=TEMPLATE",
      "text=" + encodeURIComponent(title || ""),
      "dates=" + fmtIcsDate(start) + "/" + fmtIcsDate(end)
    ];
    if (locationStr) params.push("location=" + encodeURIComponent(locationStr));
    if (description) params.push("details=" + encodeURIComponent(description));
    return "https://calendar.google.com/calendar/render?" + params.join("&");
  }

  function buildIcsBlob(title, start, end, locationStr, description) {
    var lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pinfo//Event//EN", "BEGIN:VEVENT",
      "UID:" + start.getTime() + "-" + Math.random().toString(36).slice(2) + "@pinfoapp.com",
      "DTSTAMP:" + fmtIcsDate(new Date()),
      "DTSTART:" + fmtIcsDate(start),
      "DTEND:" + fmtIcsDate(end),
      "SUMMARY:" + icsEscape(title)
    ];
    if (locationStr) lines.push("LOCATION:" + icsEscape(locationStr));
    if (description) lines.push("DESCRIPTION:" + icsEscape(description));
    lines.push("END:VEVENT", "END:VCALENDAR");
    return new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  }

  function downloadIcs(blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "event.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function copyLinkButton() {
    var btn = el("button", { type: "button", class: "btn btn-quiet", text: S.copyLink });
    btn.addEventListener("click", function () {
      var link = location.href;
      var done = function () {
        btn.textContent = S.linkCopied;
        setTimeout(function () { btn.textContent = S.copyLink; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(done, done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = link;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (e) { /* ignore */ }
        document.body.removeChild(ta);
        done();
      }
    });
    return btn;
  }

  function appendKeepLinkBlock(container, ctx) {
    var ev = ctx.event || {};
    var preview = ctx.preview;
    var title = ev.title || (preview && preview.title) || "";
    var startIso = ev.date_start || (preview && preview.date_start);
    var endIso = ev.date_end || (preview && preview.date_end);
    var loc = ev.location;
    var locationStr = loc ? [loc.title, loc.address].filter(Boolean).join(", ")
      : (ev.area || (preview && preview.area) || "");
    var description = ev.description || (preview && preview.description) || "";

    var children = [];
    var actions = [];
    if (startIso) {
      var start = new Date(startIso);
      var end = endIso ? new Date(endIso) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
      // On an iPhone the calendar file opens Apple Calendar; Google's own page
      // is only for phones and computers that use it (signed out it lands on
      // Google's start page). With no app to get, an Android phone's one
      // primary action is the calendar.
      var gcal = el("a", {
        class: isAndroid() ? "btn btn-primary" : "btn btn-quiet", target: "_blank", rel: "noopener",
        href: gcalHref(title, start, end, locationStr, description),
        text: S.addToGoogleCalendar
      });
      var icsBtn = el("button", { type: "button", class: "btn btn-quiet", text: isIOS() ? S.addToCalendar : S.downloadIcs });
      icsBtn.addEventListener("click", function () {
        downloadIcs(buildIcsBlob(title, start, end, locationStr, description));
      });
      if (isAndroid()) children.push(gcal);
      else if (!isIOS()) actions.push(gcal);
      actions.push(icsBtn);
    }
    children.push(el("p", { class: "hint", text: S.keepLinkText }));
    actions.push(copyLinkButton());
    children.push(el("div", { class: "action-row" }, actions));

    container.appendChild(card(children));
  }

  function renderThankYou(token, data, authCtx, preview) {
    clear(contentEl);
    var ev = data.event || {};
    var guests = data.guests || {};

    var thankText = data.response === "going" ? S.thankGoing
      : data.response === "maybe" ? S.thankMaybe
        : S.thankCant((ev && ev.host_name) || "");

    var ownPlus = data.response === "going" ? recallPlus(answerKey(token)) : 0;
    var thankChildren = [
      el("h2", { class: "rsvp-heading", text: thankText }),
      ownPlus > 0 ? el("p", { class: "already-said", text: S.goingPlus(ownPlus) }) : null,
      el("a", {
        class: "change-answer-link", href: "#",
        text: S.changeAnswer,
        onclick: function (e) {
          e.preventDefault();
          if (privateEventId) {
            // Same event, same visitor: the form opens again with the
            // answer just given, and sending it again goes through
            // web_event_rsvp like the first time.
            return renderPrivateAnswerForm({ preview: preview, event: ev, guests: guests, response: data.response, isHost: false }, authCtx);
          }
          rsvpStatus(token, authCtx && authCtx.idToken).then(function (res) {
            if (res.timedOut) return renderNetworkError(function () { renderThankYou(token, data, authCtx, preview); });
            if (res.data && (res.data.status === "ok" || res.data.status === "not_responded")) {
              // Re-fetch preview-shaped context for the form (host name,
              // link_kind, limits) - authenticated as this visitor when
              // possible, so a verified group-link member who holds the
              // link's one seat gets back status "live" with their own
              // current_response, not the anonymous "full" every other
              // visitor to a used link correctly sees.
              var idToken = authCtx && authCtx.idToken;
              previewInvite(token, idToken).then(function (rows) {
                var preview = rows && rows[0];
                if (preview) renderAnswerForm(token, preview, authCtx, { alreadyResponse: data.response, skipName: !!idToken });
              });
            }
          });
        }
      })
    ];
    var thankVerified = verifiedLine(token, authCtx);
    if (thankVerified) thankChildren.push(thankVerified);
    contentEl.appendChild(card(thankChildren));

    var keptAnswer = data.response === "going" || data.response === "maybe";
    var android = isAndroid();

    if (keptAnswer && android) {
      appendKeepLinkBlock(contentEl, { event: ev, preview: preview });
    }

    appendInstallBlock(contentEl, { response: data.response, event: ev, authCtx: authCtx, token: token, eventId: ev.id });

    var detailChildren = [];
    if (ev.location && (data.response === "going" || data.response === "maybe")) {
      var loc = ev.location;
      var mapsHref = "https://maps.apple.com/?q=" + encodeURIComponent(loc.address || loc.title || "") +
        (loc.latitude && loc.longitude ? "&ll=" + loc.latitude + "," + loc.longitude : "");
      detailChildren.push(el("div", { class: "address-card" }, [
        el("p", { class: "address-title", text: loc.title || "" }),
        el("p", { class: "address-line", text: loc.address || "" }),
        el("a", { class: "btn btn-quiet", href: mapsHref, target: "_blank", rel: "noopener", text: S.openInMaps })
      ]));
    }

    var countLine = guestCountLine(guests, data.response, answerKey(token));
    if (guests.visible && guests.list && guests.list.length && (data.response === "going" || data.response === "maybe")) {
      if (countLine) detailChildren.push(el("p", { class: "guest-count", text: countLine }));
      var list = el("div", { class: "guest-list" }, guests.list.slice(0, 30).map(function (g) {
        var avatar = g.avatar_url
          ? el("img", { class: "guest-avatar", src: g.avatar_url, alt: "" })
          : el("span", { class: "guest-avatar guest-avatar-initial", text: (g.name || "?").charAt(0).toUpperCase() });
        return el("div", { class: "guest-row" }, [avatar, el("span", { class: "guest-name", text: g.name || "" })]);
      }));
      detailChildren.push(list);
    } else if ((data.response === "going" || data.response === "maybe") && countLine) {
      detailChildren.push(el("p", { class: "guest-count", text: countLine }));
    }

    if (detailChildren.length) contentEl.appendChild(card(detailChildren));

    if (keptAnswer && !android) {
      appendKeepLinkBlock(contentEl, { event: ev, preview: preview });
    }
  }

  // ---- Install screen (section 7.10 / section 8) -------------------------
  // Shown after every successful answer (Going, Maybe, and Can't go alike)
  // and on the "already answered" state - never in front of the RSVP
  // buttons. This is the main growth moment: visitors whose browser isn't
  // Safari never see the Smart App Banner, so this in-page pitch is the
  // only install nudge most of them get.
  // "Open in Pinfo" uses the app's own address. Without the app Safari shows
  // an error page for it, so it is tried in a hidden frame; if this page is
  // still here a moment later, the visitor is told what to do instead.
  function openInApp(url, onFail) {
    var left = false;
    function gone() { left = true; }
    document.addEventListener("visibilitychange", gone, { once: true });
    window.addEventListener("pagehide", gone, { once: true });
    var frame = document.createElement("iframe");
    frame.style.display = "none";
    frame.src = url;
    document.body.appendChild(frame);
    setTimeout(function () {
      if (frame.parentNode) frame.parentNode.removeChild(frame);
      if (!left && document.visibilityState === "visible") onFail();
    }, 2500);
  }

  function appendInstallBlock(container, ctx) {
    var response = ctx.response;
    var host = (ctx.event && ctx.event.host_name) || (ctx.preview && ctx.preview.host_name) || "";
    var city = (ctx.event && ctx.event.area) || (ctx.preview && ctx.preview.area) || "";
    var isPersonal = ctx.preview ? ctx.preview.link_kind === "personal" : !(ctx.authCtx && ctx.authCtx.phoneDisplay);

    var headingTemplate, lines, subText;
    if (response === "pending") {
      host = host || S.hostFallback;
      headingTemplate = S.installHeadingPending(host);
      lines = S.installLinesPending;
      subText = S.installSubPending((ctx.authCtx && ctx.authCtx.phoneDisplay) || "");
    } else if (response === "going") {
      headingTemplate = S.installHeadingGoing;
      lines = S.installLinesGoing;
      subText = isPersonal ? S.installSubPersonal(host) : S.installSubGroup((ctx.authCtx && ctx.authCtx.phoneDisplay) || "");
    } else if (response === "cant") {
      headingTemplate = S.installHeadingCant(host);
      lines = S.installLinesCant;
      subText = S.installSubCant;
    } else {
      headingTemplate = S.installHeadingMaybe;
      lines = S.installLinesMaybe;
      subText = isPersonal ? S.installSubPersonal(host) : S.installSubGroup((ctx.authCtx && ctx.authCtx.phoneDisplay) || "");
    }

    var block = el("div", { class: "install-block" });
    // Pinfo is an iPhone app: an Android phone gets one quiet line (no
    // download button, no code to scan on the phone itself), a computer gets
    // the code to scan with an iPhone.
    if (isAndroid()) {
      container.appendChild(card([el("p", { class: "hint", text: S.androidNote })]));
      return;
    }

    block.appendChild(el("img", { class: "install-icon", src: "/assets/v2/icon.png", alt: "", width: "64", height: "64" }));
    block.appendChild(el("h2", { class: "rsvp-heading install-heading", text: headingTemplate.replace("{host}", host) }));
    var linesList = el("ul", { class: "install-lines" }, lines.map(function (line) {
      var text = line.replace("{host}", host).replace("{city}", city);
      return el("li", { class: "install-line" }, [el("span", { class: "check", text: "\u2713" }), el("span", { text: text })]);
    }));

    if (isIOS()) {
      // The one primary action first; the reasons follow it.
      block.appendChild(el("a", { class: "btn install-btn", href: APPSTORE_URL, text: S.installButton }));
      block.appendChild(el("p", { class: "hint", text: subText }));
      block.appendChild(linesList);
      if (ctx.eventId && ctx.token) {
        var hint = el("p", { class: "hint hidden app-hint", text: S.appNotOpened });
        var openUrl = "pinfo://event/" + ctx.eventId + "?t=" + encodeURIComponent(ctx.token);
        block.appendChild(el("a", {
          class: "open-invite-link", href: openUrl, text: S.openMyInvite,
          onclick: function (e) {
            e.preventDefault();
            hint.classList.add("hidden");
            openInApp(openUrl, function () { hint.classList.remove("hidden"); });
          }
        }));
        block.appendChild(hint);
      }
    } else {
      block.appendChild(linesList);
      block.appendChild(el("img", { class: "qr-code", src: "/assets/appstore-qr.svg", alt: S.qrCaption, width: "180", height: "180" }));
      block.appendChild(el("p", { class: "qr-caption", text: S.qrCaption }));
    }

    container.appendChild(block);
  }

  // ---- Plain link of a private event ---------------------------------------
  // /event/<uuid> and /e/<code> come here only when the server says the event
  // is private (event_link_status "no_access"). Nothing about the event is
  // drawn, and nothing about it goes into the page's link-preview tags or
  // title, until the server has checked the visitor's verified phone number
  // against the guest list (web_event_access). The number itself is never
  // sent from here: the visitor's Firebase token carries it.
  //
  // The phone and code steps are the invitation page's own (renderPhoneStep).
  // Answers go to web_event_rsvp, which only ever updates a number that is
  // already on the list; it never adds anyone.

  function setLoadingHeader() {
    headerTitle.classList.add("skeleton");
    headerMeta.classList.add("skeleton");
    headerMeta.classList.remove("hidden");
    headerTitle.textContent = "Loading event...";
    headerMeta.textContent = "\u00a0";
  }

  function initPrivate(rootNode, eventId) {
    privateEventId = eventId;
    initDom(rootNode);
    installFirstTap(rootNode);
    // The banner's Open hands the event's own link to the app (an invite
    // token on the link stays on it).
    var inviteT = new URLSearchParams(location.search).get("t");
    setSmartBannerTarget("https://pinfoapp.com/event/" + eventId + (inviteT ? "?t=" + encodeURIComponent(inviteT) : ""));

    if (headerPlatformNote) {
      headerPlatformNote.textContent = S.platformNote;
      headerPlatformNote.classList.toggle("hidden", isIOS());
    }
    headerCover.src = COVER_PLACEHOLDER;
    headerCover.alt = "";
    clear(contentEl);
    setLoadingHeader();

    // A visitor who verified earlier on this device skips the phone step.
    currentFirebaseUserSoon().then(function (user) {
      if (!user) return showPrivateGate();
      getIdToken().then(function (idToken) {
        if (!idToken) return showPrivateGate();
        privateAccess(idToken, fmtPhoneDisplay(user.phoneNumber || ""));
      });
    });
  }

  // Screen A: a title and one sentence, then the phone step.
  function showPrivateGate(notice) {
    setGenericHeader(S.privateTitle, S.privateBody);
    renderPhoneStep("ev-" + privateEventId, null, function (e164) {
      getIdToken().then(function (idToken) {
        privateAccess(idToken, fmtPhoneDisplay(e164));
      });
    }, { heading: "", hideSub: true, notice: notice || null, key: "ev-" + privateEventId });
  }

  function privateAccess(idToken, phoneDisplay) {
    var authCtx = { idToken: idToken, phoneDisplay: phoneDisplay };
    clear(contentEl);
    setLoadingHeader();
    authedRpc("web_event_access", { p_event_id: privateEventId }, idToken).then(function (res) {
      if (res.timedOut) {
        setGenericHeader(S.privateTitle, "");
        return renderNetworkError(function () { privateAccess(idToken, phoneDisplay); });
      }
      handlePrivateAccess(res.data, authCtx);
    });
  }

  function handlePrivateAccess(data, authCtx) {
    switch (data && data.status) {
      case "ok":
        return renderPrivateEvent(data, authCtx);
      case "not_invited":
        return renderNotInvited(authCtx);
      case "past":
        setGenericHeader(S.privateTitle, "");
        return renderSimpleMessage(S.past);
      case "cancelled":
      case "not_found":
      case "public":
        return renderUnavailable();
      case "phone_required":
        return showPrivateGate();
      case "bad_request":
        return showPrivateGate(S.somethingWrong);
      case "rate_limited":
        setGenericHeader(S.privateTitle, "");
        return renderSimpleMessage(S.tooManyTries);
      default:
        // A word the server may add later.
        setGenericHeader(S.privateTitle, "");
        return renderSimpleMessage(S.somethingWrong);
    }
  }

  // Today's words for an event that is not there (also for one that was
  // cancelled): no title, no date, nothing else.
  function renderUnavailable() {
    setGenericHeader(S.unavailableTitle, S.unavailableBody);
    clear(contentEl);
    if (isIOS()) contentEl.appendChild(card([el("a", { class: "btn btn-store", href: APPSTORE_URL, text: S.installButton })]));
  }

  // A verified number that is not on the list. Never says why, and never
  // offers to join: that stays the invite link's job.
  function renderNotInvited(authCtx) {
    setGenericHeader(S.privateTitle, "");
    clear(contentEl);
    var children = [el("p", { class: "meta", text: S.notInvited })];
    var verified = verifiedLine(null, authCtx);
    if (verified) children.push(verified);
    contentEl.appendChild(card(children));
  }

  // The answer of web_event_access, shaped like what the invitation page
  // draws. Missing keys are fine: the event block fills what the preview
  // does not carry.
  function privateView(data) {
    var ev = data.event || {};
    var pv = data.preview || {};
    var plus = pv.plus_ones_allowed != null ? pv.plus_ones_allowed : ev.plus_ones_allowed;
    return {
      preview: {
        event_id: pv.event_id || ev.id,
        title: pv.title || ev.title,
        date_start: pv.date_start || ev.date_start,
        date_end: pv.date_end || ev.date_end,
        cover_url: pv.cover_url || ev.cover_url,
        image_url: pv.image_url,
        host_name: pv.host_name || ev.host_name,
        area: pv.area || ev.area,
        plus_ones_allowed: plus || 0,
        guest_list_visible: pv.guest_list_visible,
        rsvp_by: pv.rsvp_by,
        status: "live",
        link_kind: "plain"
      },
      event: ev,
      guests: data.guests || {},
      response: data.response || null,
      isHost: !!data.is_host
    };
  }

  function renderPrivateEvent(data, authCtx) {
    var view = privateView(data);
    var sp = serverPlus(data);
    ingestPlus(null, view.response, sp !== null ? sp : previewPlus(data.preview));
    if (view.isHost) return renderPrivateHost(view, authCtx);
    renderPrivateAnswerForm(view, authCtx);
  }

  // Address (only when the server sent it), the guest line, and the guest
  // list for someone who is going or maybe.
  function privateDetailsCard(view) {
    var ev = view.event || {};
    var guests = view.guests || {};
    var kept = view.response === "going" || view.response === "maybe";
    var children = [];

    if (ev.location && kept) {
      var loc = ev.location;
      var mapsHref = "https://maps.apple.com/?q=" + encodeURIComponent(loc.address || loc.title || "") +
        (loc.latitude && loc.longitude ? "&ll=" + loc.latitude + "," + loc.longitude : "");
      children.push(el("div", { class: "address-card" }, [
        el("p", { class: "address-title", text: loc.title || "" }),
        el("p", { class: "address-line", text: loc.address || "" }),
        el("a", { class: "btn btn-quiet", href: mapsHref, target: "_blank", rel: "noopener", text: S.openInMaps })
      ]));
    } else if (!view.isHost) {
      children.push(el("p", { class: "meta", text: S.answerToSeeAddress }));
    }

    var countLine = view.preview.guest_list_visible !== false ? guestCountLine(guests, view.response, answerKey(null)) : null;
    if (guests.visible && view.preview.guest_list_visible !== false) {
      if (countLine) children.push(el("p", { class: "guest-count", text: countLine }));
      if (kept && guests.list && guests.list.length) {
        children.push(el("div", { class: "guest-list" }, guests.list.slice(0, 30).map(function (g) {
          var avatar = g.avatar_url
            ? el("img", { class: "guest-avatar", src: g.avatar_url, alt: "" })
            : el("span", { class: "guest-avatar guest-avatar-initial", text: (g.name || "?").charAt(0).toUpperCase() });
          return el("div", { class: "guest-row" }, [avatar, el("span", { class: "guest-name", text: g.name || "" })]);
        })));
      }
    }
    return children.length ? card(children) : null;
  }

  // The host sees the event and no answer buttons.
  function renderPrivateHost(view, authCtx) {
    setHeader(view.preview);
    clear(contentEl);
    var children = [el("h2", { class: "rsvp-heading", text: S.hostLine })];
    var verified = verifiedLine(null, authCtx);
    if (verified) children.push(verified);
    contentEl.appendChild(card(children));
    var details = privateDetailsCard(view);
    if (details) contentEl.appendChild(details);
  }

  function renderPrivateAnswerForm(view, authCtx) {
    var pv = view.preview;
    var ev = view.event || {};
    var key = answerKey(null);
    setHeader(pv);
    clear(contentEl);

    var nameVisible = false;
    // The server already has a name for most visitors (the host's contact
    // name, or the Pinfo account's name), so none is asked for up front. It
    // appears only if the server says it needs one.
    var nameInput = el("input", {
      type: "text", class: "input", maxlength: "40", placeholder: S.namePlaceholder, autocomplete: "name"
    });
    var nameField = el("div", { class: "field hidden" }, [
      el("label", { class: "field-label", text: S.nameLabel }),
      nameInput
    ]);
    var errorEl = el("p", { class: "field-error hidden" });

    function showError(text) {
      errorEl.textContent = text;
      errorEl.classList.remove("hidden");
    }

    function revealName() {
      nameVisible = true;
      nameField.classList.remove("hidden");
      nameInput.focus();
    }

    var controls = null;

    function submit(response, plus) {
      var name = cleanName(nameInput.value) || null;
      if (nameVisible && !nameUsable(name)) {
        showError(S.nameRequired);
        nameInput.focus();
        return;
      }
      errorEl.classList.add("hidden");
      controls.setDisabled(true);
      // Guests can only come with Going; the server ignores them otherwise.
      rsvpAnswer(null, response, name, response === "going" ? plus : 0, authCtx.idToken).then(function (res) {
        controls.setDisabled(false);
        if (res.timedOut) return renderNetworkError(function () { renderPrivateAnswerForm(view, authCtx); });
        if (res.data && res.data.status === "ok") {
          var sp = serverPlus(res.data);
          rememberPlus(key, response, response === "going" ? (sp !== null ? sp : plus) : 0);
        }
        handlePrivateRsvpResult(res.data, { view: view, authCtx: authCtx, showError: showError, revealName: revealName });
      });
    }

    controls = answerControls({
      maxPlus: pv.plus_ones_allowed || 0,
      current: view.response,
      currentPlus: recallPlus(key),
      submit: submit
    });

    var children = [];
    if (pv.host_name) children.push(el("h2", { class: "rsvp-heading", text: S.groupGreeting(pv.host_name) }));
    var verified = verifiedLine(null, authCtx);
    if (verified) children.push(verified);
    if (view.response) {
      children.push(el("p", { class: "already-said", text: alreadySaidText(view.response, recallPlus(key)) }));
      children.push(el("p", { class: "hint-left", text: S.changeAnytime }));
    } else {
      children.push(el("p", { class: "meta", text: S.question(pv.title) }));
    }
    children.push(nameField);
    children.push(errorEl);
    var byLine = answerByLine(pv);
    if (byLine) children.push(byLine);
    children.push(controls.el);
    children.push(el("p", { class: "privacy-line", text: S.ageConfirm }));
    children.push(privacyGroupLine());
    contentEl.appendChild(card(children));

    var details = privateDetailsCard(view);
    if (details) contentEl.appendChild(details);

    // Calendar and Get Pinfo only once there is an answer: RSVP first,
    // install second, as on the invitation page.
    if (view.response === "going" || view.response === "maybe") {
      if (isAndroid()) appendKeepLinkBlock(contentEl, { event: ev, preview: pv });
      appendInstallBlock(contentEl, { response: view.response, event: ev, preview: pv, authCtx: authCtx, token: null, eventId: ev.id });
      if (!isAndroid()) appendKeepLinkBlock(contentEl, { event: ev, preview: pv });
    } else if (view.response === "cant") {
      appendInstallBlock(contentEl, { response: "cant", event: ev, preview: pv, authCtx: authCtx, token: null, eventId: ev.id });
    }
  }

  function handlePrivateRsvpResult(data, ctx) {
    var authCtx = ctx.authCtx;
    switch (data && data.status) {
      case "ok":
        return renderThankYou(null, data, authCtx, ctx.view.preview);
      case "not_invited":
        return renderNotInvited(authCtx);
      case "host":
        ctx.view.isHost = true;
        return renderPrivateHost(ctx.view, authCtx);
      case "cancelled":
      case "not_found":
      case "public":
        return renderUnavailable();
      case "past":
        setGenericHeader(S.privateTitle, "");
        return renderSimpleMessage(S.past);
      case "name_required":
        ctx.revealName();
        return ctx.showError(S.nameRequired);
      case "name_not_allowed":
        ctx.revealName();
        return ctx.showError(S.nameNotAllowed);
      case "phone_required":
        return showPrivateGate();
      case "rate_limited":
        setGenericHeader(S.privateTitle, "");
        return renderSimpleMessage(S.tooManyTries);
      default:
        return ctx.showError(S.somethingWrong);
    }
  }

  // ---- Orchestration -----------------------------------------------------
  function setSmartBannerTarget(appArgumentUrl) {
    var banner = document.getElementById("smart-banner");
    if (!banner) return;
    var base = banner.getAttribute("content").split(",")[0];
    banner.setAttribute("content", base + ", app-argument=" + appArgumentUrl);
  }

  function updateOgTags(preview) {
    function set(id, value) {
      var node = document.getElementById(id);
      if (node && value) node.setAttribute("content", value);
    }
    if (!preview) return;
    var when = preview.date_start ? fmtDateTime(preview.date_start) : "";
    var desc = (preview.host_name ? (preview.host_name + " invited you") : "You're invited") + (when ? " on " + when : "") + ".";
    set("og-title", preview.title);
    set("og-description", desc);
    set("og-image", preview.cover_url || preview.image_url);
    set("twitter-title", preview.title);
    set("twitter-description", desc);
    set("twitter-image", preview.cover_url || preview.image_url);
    if (preview.title) document.title = preview.title + " - Pinfo";
  }

  function init(rootNode, token) {
    initDom(rootNode);
    installFirstTap(rootNode);
    setSmartBannerTarget(location.href);

    if (headerPlatformNote) {
      headerPlatformNote.textContent = S.platformNote;
      headerPlatformNote.classList.toggle("hidden", isIOS());
    }

    previewInvite(token).then(function (res) {
      if (res.timedOut) return renderNetworkError(function () { init(rootNode, token); });
      var rows = res;
      var preview = rows && rows[0];
      if (!preview) {
        setHeader(null);
        renderInvalid();
        return;
      }
      setHeader(preview);
      updateOgTags(preview);

      if (preview.status === "cancelled") return renderCancelled();
      if (preview.status === "past") return renderSimpleMessage(S.past);

      if (preview.link_kind === "personal") {
        if (preview.current_response) {
          rsvpStatus(token, null).then(function (sres) {
            if (sres.timedOut) return renderNetworkError(function () { init(rootNode, token); });
            if (sres.data && sres.data.status === "ok") {
              ingestPlus(token, sres.data.response, serverPlus(sres.data));
              return renderThankYou(token, sres.data, null, preview);
            }
            ingestPlus(token, preview.current_response, previewPlus(preview));
            renderAnswerForm(token, preview, null, { alreadyResponse: preview.current_response });
          });
        } else {
          renderAnswerForm(token, preview, null);
        }
        return;
      }

      // Group link: check for a persisted Firebase sign-in first (a
      // returning visitor on the same device/browser may already be
      // verified), otherwise start with the phone step.
      currentFirebaseUserSoon().then(function (user) {
        if (user) {
          continueAfterVerification(token, preview, user.phoneNumber || "");
        } else {
          renderPhoneStep(token, preview, function (e164) { continueAfterVerification(token, preview, e164); });
        }
      });
    });
  }

  window.PinfoRsvp = { init: init, initPrivate: initPrivate };
})();
