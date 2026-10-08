// Web RSVP flow for magic invite links (/i/<token>).
//
// Loaded dynamically by event/index.html (and 404.html, its GitHub Pages
// twin) only when the visited path is an invite link - the plain
// /event/<uuid> and /e/<code> paths never fetch this file, so they stay as
// light as before.
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

  var SUPABASE_URL = "https://ftmwhexhxdskasskzglp.supabase.co";
  var SUPABASE_KEY = "sb_publishable_ESy4TzFh9kWTef57Bfoufg_D3ZSvKEv";
  var APPSTORE_URL = "https://apps.apple.com/app/id6463236759";

  // ---- Firebase (group-link phone step) --------------------------------
  // The owner needs to register a Web app in the pinfo-2023 Firebase
  // project and paste its apiKey/appId here (see README.md for exactly
  // where). Until that happens, firebaseConfigured() is false and the
  // phone step shows a "not ready yet" message instead of a broken form -
  // every other screen (personal links, all status screens, the install
  // screen, the Smart App Banner) works fully without it.
  var FIREBASE_CONFIG = {
    apiKey: "",
    authDomain: "pinfo-2023.firebaseapp.com",
    projectId: "pinfo-2023",
    appId: ""
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
      privacyGroup: "We use your number only to confirm it's you and to carry your answer into Pinfo if you join with it. We delete it 90 days after the event. Details: https://pinfoapp.com/privacy",
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
      installHeading: "Get the Pinfo app for this event",
      installLines: [
        "Chat with the other guests in the event chat",
        "Get updates and changes from {host} as push notifications",
        "A reminder before it starts",
        "See the photos afterwards"
      ],
      installButton: "Get Pinfo",
      installSubPersonal: function (host) { return "Sign in with the phone number " + host + " invited and the event is already waiting for you."; },
      installSubGroup: function (number) { return "Sign in with " + number + " and the event is already waiting for you."; },
      openMyInvite: "I have Pinfo, open my invitation",
      qrCaption: "Scan with your iPhone camera",
      androidNote: "Pinfo is on iPhone for now. Your answer is saved either way.",
      cantGoInstall: "Find more events like this in the Pinfo app"
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
      privacyGroup: "Wir verwenden deine Nummer nur, um zu bestätigen, dass du es bist, und um deine Antwort zu Pinfo zu übertragen, falls du dich damit anmeldest. Wir löschen sie 90 Tage nach der Veranstaltung. Details: https://pinfoapp.com/privacy",
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
      installHeading: "Hol dir die Pinfo-App für dieses Event",
      installLines: [
        "Chatte mit den anderen Gästen im Event-Chat",
        "Bekomme Updates und Änderungen von {host} als Push",
        "Eine Erinnerung vor dem Start",
        "Sieh die Fotos danach"
      ],
      installButton: "Pinfo laden",
      installSubPersonal: function (host) { return "Melde dich mit der Telefonnummer an, mit der " + host + " dich eingeladen hat, und das Event wartet schon auf dich."; },
      installSubGroup: function (number) { return "Melde dich mit " + number + " an und das Event wartet schon auf dich."; },
      openMyInvite: "Ich habe Pinfo, meine Einladung öffnen",
      qrCaption: "Mit der iPhone-Kamera scannen",
      androidNote: "Pinfo gibt es vorerst nur für das iPhone. Deine Antwort ist trotzdem gespeichert.",
      cantGoInstall: "Finde mehr Events wie dieses in der Pinfo-App"
    }
  };
  var S = STRINGS[LOCALE];

  // ---- Platform detection ---------------------------------------------
  function isIOS() {
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) return true;
    // iPadOS reports as "Mac" with touch support.
    return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
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

  function fmtPhoneDisplay(e164) {
    // Light, locale-agnostic grouping for display only - not used for any
    // API call, which always uses the raw E.164 string or the Firebase
    // token itself.
    if (!e164) return "";
    return e164.replace(/(\+\d{1,3})(\d{3,4})(\d{3,4})(\d*)/, function (m, a, b, c, d) {
      return [a, b, c, d].filter(Boolean).join(" ");
    });
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

  function previewInvite(token) {
    var url = SUPABASE_URL + "/rest/v1/rpc/get_invite_preview?_token=" + encodeURIComponent(token);
    return withTimeout(
      fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY } })
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

  function rsvpAnswer(token, response, name, plusOnes, idToken) {
    return authedRpc("web_rsvp", {
      p_token: token, p_response: response, p_name: name || null, p_plus_ones: plusOnes || 0
    }, idToken);
  }

  // ---- Firebase phone auth (group links only) -------------------------------
  var firebaseState = { app: null, auth: null, authMod: null, confirmationResult: null, verifiedPhone: null };

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

  function getIdToken() {
    if (!firebaseState.auth || !firebaseState.auth.currentUser) return Promise.resolve(null);
    return firebaseState.auth.currentUser.getIdToken().catch(function () { return null; });
  }

  function sendPhoneCode(e164, recaptchaContainerId) {
    return loadFirebase().then(function (fb) {
      var verifier = new fb.authMod.RecaptchaVerifier(fb.auth, recaptchaContainerId, { size: "invisible" });
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
  var root, headerCover, headerTitle, headerMeta, contentEl;

  function initDom(rootNode) {
    root = rootNode;
    headerCover = root.querySelector("#rsvp-cover");
    headerTitle = root.querySelector("#rsvp-title");
    headerMeta = root.querySelector("#rsvp-meta");
    contentEl = root.querySelector("#rsvp-content");
  }

  function setHeader(preview) {
    headerTitle.classList.remove("skeleton");
    headerMeta.classList.remove("skeleton");
    headerTitle.textContent = preview && preview.title ? preview.title : "";
    var when = preview && preview.date_start ? fmtDateTime(preview.date_start) : "";
    var where = preview && preview.area ? preview.area : "";
    headerMeta.textContent = [when, where].filter(Boolean).join(" - ");
    var cover = preview && (preview.cover_url || preview.image_url);
    if (cover) { headerCover.src = cover; headerCover.alt = preview.title || ""; }
    else { headerCover.style.display = "none"; }
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
    if (opts.button) children.push(el("button", { class: "btn btn-primary", text: opts.button.label, onclick: opts.button.onClick }));
    if (opts.getPinfo) children.push(el("a", { class: "btn btn-store", href: APPSTORE_URL, text: S.installButton }));
    contentEl.appendChild(card(children));
  }

  function plusOnesControl(maxAllowed, onChange) {
    if (!maxAllowed) return null;
    var value = 0;
    var chips = el("div", { class: "chip-row" }, []);
    var buttons = [];
    function render() {
      buttons.forEach(function (b, i) {
        if (i + 1 <= value) b.classList.add("chip-active"); else b.classList.remove("chip-active");
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
    var plusOnes = 0;
    var nameInput = el("input", {
      type: "text", class: "input", maxlength: "40",
      placeholder: S.namePlaceholder,
      value: isPersonal && preview.invitee_first_name ? preview.invitee_first_name : ""
    });
    if (isPersonal && preview.invitee_first_name) nameInput.value = preview.invitee_first_name;

    var errorEl = el("p", { class: "field-error hidden" });

    function submit(response) {
      var name = nameInput.value.trim();
      if (!name) {
        errorEl.textContent = S.nameRequired;
        errorEl.classList.remove("hidden");
        nameInput.focus();
        return;
      }
      errorEl.classList.add("hidden");
      setButtonsDisabled(true);
      rsvpAnswer(token, response, name, plusOnes, authCtx && authCtx.idToken).then(function (res) {
        setButtonsDisabled(false);
        if (res.timedOut) return renderNetworkError(function () { renderAnswerForm(token, preview, authCtx, opts); });
        handleRsvpResult(token, preview, authCtx, res.data, { nameError: errorEl, formCtx: { token: token, preview: preview, authCtx: authCtx, opts: opts } });
      });
    }

    var buttonsRow = el("div", { class: "answer-row" }, [
      el("button", { type: "button", class: "btn btn-answer btn-going", text: S.btnGoing, onclick: function () { submit("going"); } }),
      el("button", { type: "button", class: "btn btn-answer btn-maybe", text: S.btnMaybe, onclick: function () { submit("maybe"); } }),
      el("button", { type: "button", class: "btn btn-answer btn-cant", text: S.btnCant, onclick: function () { submit("cant"); } })
    ]);

    function setButtonsDisabled(disabled) {
      Array.prototype.forEach.call(buttonsRow.querySelectorAll("button"), function (b) { b.disabled = disabled; });
    }

    var heading;
    if (isPersonal) {
      heading = S.personalGreeting(preview.invitee_first_name || "", preview.host_name || "");
    } else {
      heading = preview.status === "full" ? S.fullHeading(preview.host_name || "") : S.groupGreeting(preview.host_name || "");
    }

    var children = [el("h2", { class: "rsvp-heading", text: heading })];

    if (!isPersonal && preview.status !== "full") {
      children.push(el("p", { class: "meta", text: S.groupSub }));
    }

    if (opts.alreadyResponse) {
      children.push(el("p", { class: "already-said", text: S.alreadySaid[opts.alreadyResponse] || "" }));
      children.push(el("p", { class: "hint-left", text: S.changeAnytime }));
    }

    children.push(el("div", { class: "field" }, [
      el("label", { class: "field-label", text: S.nameLabel }),
      nameInput
    ]));
    children.push(errorEl);

    var plusCtl = plusOnesControl(preview.plus_ones_allowed || 0, function (v) { plusOnes = v; });
    if (plusCtl) children.push(plusCtl);

    if (preview.status === "full") {
      children.push(el("button", {
        type: "button", class: "btn btn-primary", text: S.askToJoin,
        onclick: function () { submit("going"); }
      }));
    } else {
      children.push(buttonsRow);
    }

    if (!isPersonal) {
      children.push(el("p", { class: "privacy-line", text: S.privacyGroup }));
    } else {
      children.push(el("p", { class: "privacy-line", text: S.privacyPersonal(preview.host_name || "") }));
    }

    contentEl.appendChild(card(children));
  }

  // ---- Phone step (group links) ----------------------------------------
  var COUNTRY_CODES = ["+49", "+43", "+41", "+31", "+33", "+34", "+39", "+44", "+48", "+351", "+45", "+46", "+47", "+358"];

  function renderPhoneStep(token, preview, onVerified) {
    clear(contentEl);

    if (!firebaseConfigured()) {
      contentEl.appendChild(card([
        el("h2", { class: "rsvp-heading", text: preview.status === "full" ? S.fullHeading(preview.host_name || "") : S.groupGreeting(preview.host_name || "") }),
        el("p", { class: "meta", text: S.notConfigured })
      ]));
      return;
    }

    var countrySelect = el("select", { class: "input input-country" },
      COUNTRY_CODES.map(function (c) { return el("option", { value: c, text: c }, []); })
    );
    countrySelect.value = "+49";
    var numberInput = el("input", { type: "tel", class: "input input-phone", placeholder: S.phoneLabel, autocomplete: "tel-national" });
    var errorEl = el("p", { class: "field-error hidden" });
    var recaptchaDiv = el("div", { id: "recaptcha-container-" + token });

    var sendBtn = el("button", { type: "button", class: "btn btn-primary", text: S.sendCode });
    sendBtn.addEventListener("click", function () {
      var digits = numberInput.value.replace(/[^0-9]/g, "").replace(/^0+/, "");
      if (!digits) {
        errorEl.textContent = S.nameRequired === S.nameRequired ? S.phoneLabel : "";
        errorEl.classList.remove("hidden");
        return;
      }
      var e164 = countrySelect.value + digits;
      sendBtn.disabled = true;
      sendPhoneCode(e164, recaptchaDiv.id).then(function () {
        renderCodeStep(token, preview, e164, onVerified);
      }).catch(function () {
        sendBtn.disabled = false;
        errorEl.textContent = S.genericError;
        errorEl.classList.remove("hidden");
      });
    });

    contentEl.appendChild(card([
      el("h2", { class: "rsvp-heading", text: preview.status === "full" ? S.fullHeading(preview.host_name || "") : S.groupGreeting(preview.host_name || "") }),
      el("p", { class: "meta", text: S.groupSub }),
      el("div", { class: "field phone-row" }, [countrySelect, numberInput]),
      errorEl,
      sendBtn,
      recaptchaDiv,
      el("p", { class: "privacy-line", text: S.privacyGroup })
    ]));
  }

  function renderCodeStep(token, preview, e164, onVerified) {
    clear(contentEl);
    var codeInput = el("input", {
      type: "text", inputmode: "numeric", autocomplete: "one-time-code", maxlength: "6",
      class: "input input-code", placeholder: S.codeLabel
    });
    var errorEl = el("p", { class: "field-error hidden" });
    var verifyBtn = el("button", { type: "button", class: "btn btn-primary", text: S.verify });
    verifyBtn.addEventListener("click", function () {
      verifyBtn.disabled = true;
      confirmPhoneCode(codeInput.value.trim()).then(function () {
        onVerified(e164);
      }).catch(function () {
        verifyBtn.disabled = false;
        errorEl.textContent = S.genericError;
        errorEl.classList.remove("hidden");
      });
    });
    contentEl.appendChild(card([
      el("h2", { class: "rsvp-heading", text: preview.status === "full" ? S.fullHeading(preview.host_name || "") : S.groupGreeting(preview.host_name || "") }),
      el("p", { class: "meta", text: S.codeLabel }),
      codeInput,
      errorEl,
      verifyBtn
    ]));
  }

  // ---- Result handling -------------------------------------------------
  function handleRsvpResult(token, preview, authCtx, data, extra) {
    extra = extra || {};
    var status = data && data.status;
    switch (status) {
      case "ok":
        renderThankYou(token, data, authCtx);
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
        renderPhoneStep(token, preview, function (e164) {
          getIdToken().then(function (idToken) {
            renderAnswerForm(token, preview, { idToken: idToken, phoneDisplay: fmtPhoneDisplay(e164) });
          });
        });
        break;
      case "name_required":
        if (extra.nameError) { extra.nameError.textContent = S.nameRequired; extra.nameError.classList.remove("hidden"); }
        break;
      case "name_not_allowed":
        if (extra.nameError) { extra.nameError.textContent = S.nameNotAllowed; extra.nameError.classList.remove("hidden"); }
        break;
      case "invalid":
        renderSimpleMessage(S.invalid);
        break;
      case "cancelled":
        renderSimpleMessage(S.cancelled);
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
    appendInstallBlock(contentEl, { response: "maybe", preview: preview, authCtx: authCtx, token: token });
  }

  function handleStatusResult(token, preview, authCtx, data) {
    var status = data && data.status;
    if (status === "ok") return renderThankYou(token, data, authCtx);
    if (status === "pending_approval") return renderPendingScreen(token, preview, authCtx);
    if (status === "declined") return renderSimpleMessage(S.declinedText(preview.host_name || ""));
    if (status === "not_responded") return renderAnswerForm(token, preview, authCtx);
    if (status === "phone_required") {
      return renderPhoneStep(token, preview, function (e164) {
        getIdToken().then(function (idToken) {
          renderAnswerForm(token, preview, { idToken: idToken, phoneDisplay: fmtPhoneDisplay(e164) });
        });
      });
    }
    if (status === "rate_limited") {
      var mins = Math.ceil((data.retry_after_s || 60) / 60);
      return renderSimpleMessage(S.rateLimited(mins));
    }
    if (status === "invalid") return renderSimpleMessage(S.invalid);
    if (status === "cancelled") return renderSimpleMessage(S.cancelled);
    if (status === "past") return renderSimpleMessage(S.past);
    if (status === "removed") return renderSimpleMessage(S.removed);
    return renderSimpleMessage(S.genericError);
  }

  function renderThankYou(token, data, authCtx) {
    clear(contentEl);
    var ev = data.event || {};
    var guests = data.guests || {};
    var children = [];

    var thankText = data.response === "going" ? S.thankGoing
      : data.response === "maybe" ? S.thankMaybe
        : S.thankCant((ev && ev.host_name) || "");
    children.push(el("h2", { class: "rsvp-heading", text: thankText }));

    if (ev.location && (data.response === "going" || data.response === "maybe")) {
      var loc = ev.location;
      var mapsHref = "https://maps.apple.com/?q=" + encodeURIComponent(loc.address || loc.title || "") +
        (loc.latitude && loc.longitude ? "&ll=" + loc.latitude + "," + loc.longitude : "");
      children.push(el("div", { class: "address-card" }, [
        el("p", { class: "address-title", text: loc.title || "" }),
        el("p", { class: "address-line", text: loc.address || "" }),
        el("a", { class: "btn btn-store", href: mapsHref, target: "_blank", rel: "noopener", text: S.openInMaps })
      ]));
    }

    if (guests.visible && guests.list && guests.list.length && (data.response === "going" || data.response === "maybe")) {
      children.push(el("p", { class: "guest-count", text: S.guestCount(guests.going || 0, guests.maybe || 0) }));
      var list = el("div", { class: "guest-list" }, guests.list.slice(0, 30).map(function (g) {
        var avatar = g.avatar_url
          ? el("img", { class: "guest-avatar", src: g.avatar_url, alt: "" })
          : el("span", { class: "guest-avatar guest-avatar-initial", text: (g.name || "?").charAt(0).toUpperCase() });
        return el("div", { class: "guest-row" }, [avatar, el("span", { class: "guest-name", text: g.name || "" })]);
      }));
      children.push(list);
    } else if (data.response === "going" || data.response === "maybe") {
      children.push(el("p", { class: "guest-count", text: S.guestCount(guests.going || 0, guests.maybe || 0) }));
    }

    children.push(el("a", {
      class: "change-answer-link", href: "#",
      text: S.changeAnswer,
      onclick: function (e) {
        e.preventDefault();
        rsvpStatus(token, authCtx && authCtx.idToken).then(function (res) {
          if (res.timedOut) return renderNetworkError(function () { renderThankYou(token, data, authCtx); });
          if (res.data && (res.data.status === "ok" || res.data.status === "not_responded")) {
            // Re-fetch preview-shaped context for the form (host name, link_kind, limits).
            previewInvite(token).then(function (rows) {
              var preview = rows && rows[0];
              if (preview) renderAnswerForm(token, preview, authCtx, { alreadyResponse: data.response });
            });
          }
        });
      }
    }));

    contentEl.appendChild(card(children));
    appendInstallBlock(contentEl, { response: data.response, event: ev, authCtx: authCtx, token: token, eventId: ev.id });
  }

  // ---- Install screen (section 7.10 / section 8) -------------------------
  function appendInstallBlock(container, ctx) {
    var response = ctx.response;
    var block = el("div", { class: "install-block" });

    if (response === "cant") {
      block.appendChild(el("p", { class: "install-cant-line" }, [
        S.cantGoInstall + " ",
        el("a", { href: APPSTORE_URL, text: S.installButton })
      ]));
      container.appendChild(block);
      return;
    }

    block.appendChild(el("h2", { class: "rsvp-heading install-heading", text: S.installHeading }));
    var lines = el("ul", { class: "install-lines" }, S.installLines.map(function (line) {
      var text = line.replace("{host}", (ctx.event && ctx.event.host_name) || (ctx.preview && ctx.preview.host_name) || "");
      return el("li", { class: "install-line" }, [el("span", { class: "dot" }), el("span", { text: text })]);
    }));
    block.appendChild(lines);

    var host = (ctx.event && ctx.event.host_name) || (ctx.preview && ctx.preview.host_name) || "";
    var isPersonal = ctx.preview ? ctx.preview.link_kind === "personal" : !(ctx.authCtx && ctx.authCtx.phoneDisplay);

    if (isIOS()) {
      block.appendChild(el("a", { class: "btn btn-primary install-btn", href: APPSTORE_URL, text: S.installButton }));
      var sub = isPersonal
        ? S.installSubPersonal(host)
        : S.installSubGroup((ctx.authCtx && ctx.authCtx.phoneDisplay) || "");
      block.appendChild(el("p", { class: "hint", text: sub }));
      if (ctx.eventId && ctx.token) {
        block.appendChild(el("a", {
          class: "open-invite-link", href: "pinfo://event/" + ctx.eventId + "?t=" + encodeURIComponent(ctx.token),
          text: S.openMyInvite
        }));
      }
    } else {
      block.appendChild(el("img", { class: "qr-code", src: "/assets/appstore-qr.svg", alt: S.qrCaption, width: "180", height: "180" }));
      block.appendChild(el("p", { class: "qr-caption", text: S.qrCaption }));
      block.appendChild(el("p", { class: "hint", text: S.androidNote }));
    }

    container.appendChild(block);
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
    setSmartBannerTarget(location.href);

    previewInvite(token).then(function (res) {
      if (res.timedOut) return renderNetworkError(function () { init(rootNode, token); });
      var rows = res;
      var preview = rows && rows[0];
      if (!preview) {
        setHeader(null);
        renderSimpleMessage(S.invalid);
        return;
      }
      setHeader(preview);
      updateOgTags(preview);

      if (preview.status === "cancelled") return renderSimpleMessage(S.cancelled);
      if (preview.status === "past") return renderSimpleMessage(S.past);

      if (preview.link_kind === "personal") {
        if (preview.current_response) {
          rsvpStatus(token, null).then(function (sres) {
            if (sres.timedOut) return renderNetworkError(function () { init(rootNode, token); });
            if (sres.data && sres.data.status === "ok") return renderThankYou(token, sres.data, null);
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
      currentFirebaseUser().then(function (user) {
        if (user) {
          getIdToken().then(function (idToken) {
            rsvpStatus(token, idToken).then(function (sres) {
              if (sres.timedOut) return renderNetworkError(function () { init(rootNode, token); });
              var d = sres.data;
              if (d && d.status === "not_responded") {
                renderAnswerForm(token, preview, { idToken: idToken, phoneDisplay: fmtPhoneDisplay(user.phoneNumber || "") });
              } else {
                handleStatusResult(token, preview, { idToken: idToken, phoneDisplay: fmtPhoneDisplay(user.phoneNumber || "") }, d);
              }
            });
          });
        } else {
          renderPhoneStep(token, preview, function (e164) {
            getIdToken().then(function (idToken) {
              renderAnswerForm(token, preview, { idToken: idToken, phoneDisplay: fmtPhoneDisplay(e164) });
            });
          });
        }
      });
    });
  }

  window.PinfoRsvp = { init: init };
})();
