(() => {
  // node_modules/@simplewebauthn/browser/esm/helpers/bufferToBase64URLString.js
  function bufferToBase64URLString(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = "";
    for (const charCode of bytes) {
      str += String.fromCharCode(charCode);
    }
    const base64String = btoa(str);
    return base64String.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  // node_modules/@simplewebauthn/browser/esm/helpers/base64URLStringToBuffer.js
  function base64URLStringToBuffer(base64URLString) {
    const base64 = base64URLString.replace(/-/g, "+").replace(/_/g, "/");
    const padLength = (4 - base64.length % 4) % 4;
    const padded = base64.padEnd(base64.length + padLength, "=");
    const binary = atob(padded);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return buffer;
  }

  // node_modules/@simplewebauthn/browser/esm/helpers/browserSupportsWebAuthn.js
  function browserSupportsWebAuthn() {
    return _browserSupportsWebAuthnInternals.stubThis(globalThis?.PublicKeyCredential !== void 0 && typeof globalThis.PublicKeyCredential === "function");
  }
  var _browserSupportsWebAuthnInternals = {
    stubThis: (value) => value
  };

  // node_modules/@simplewebauthn/browser/esm/helpers/toPublicKeyCredentialDescriptor.js
  function toPublicKeyCredentialDescriptor(descriptor) {
    const { id } = descriptor;
    return {
      ...descriptor,
      id: base64URLStringToBuffer(id),
      transports: descriptor.transports,
      type: descriptor.type
    };
  }

  // node_modules/@simplewebauthn/browser/esm/helpers/isValidDomain.js
  function isValidDomain(hostname) {
    return (
      // Consider localhost valid as well since it's okay wrt Secure Contexts
      hostname === "localhost" || // Support punycode (ACE) or ascii labels and domains
      /^((xn--[a-z0-9-]+|[a-z0-9]+(-[a-z0-9]+)*)\.)+([a-z]{2,}|xn--[a-z0-9-]+)$/i.test(hostname)
    );
  }

  // node_modules/@simplewebauthn/browser/esm/helpers/webAuthnError.js
  var WebAuthnError = class extends Error {
    constructor({ message, code, cause, name }) {
      super(message, { cause });
      Object.defineProperty(this, "code", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: void 0
      });
      this.name = name ?? cause.name;
      this.code = code;
    }
  };

  // node_modules/@simplewebauthn/browser/esm/helpers/identifyRegistrationError.js
  function identifyRegistrationError({ error, options }) {
    const { publicKey } = options;
    if (!publicKey) {
      throw Error("options was missing required publicKey property");
    }
    if (error.name === "AbortError") {
      if (options.signal instanceof AbortSignal) {
        return new WebAuthnError({
          message: "Registration ceremony was sent an abort signal",
          code: "ERROR_CEREMONY_ABORTED",
          cause: error
        });
      }
    } else if (error.name === "ConstraintError") {
      if (publicKey.authenticatorSelection?.requireResidentKey === true) {
        return new WebAuthnError({
          message: "Discoverable credentials were required but no available authenticator supported it",
          code: "ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT",
          cause: error
        });
      } else if (
        // @ts-ignore: `mediation` doesn't yet exist on CredentialCreationOptions but it's possible as of Sept 2024
        options.mediation === "conditional" && publicKey.authenticatorSelection?.userVerification === "required"
      ) {
        return new WebAuthnError({
          message: "User verification was required during automatic registration but it could not be performed",
          code: "ERROR_AUTO_REGISTER_USER_VERIFICATION_FAILURE",
          cause: error
        });
      } else if (publicKey.authenticatorSelection?.userVerification === "required") {
        return new WebAuthnError({
          message: "User verification was required but no available authenticator supported it",
          code: "ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT",
          cause: error
        });
      }
    } else if (error.name === "InvalidStateError") {
      return new WebAuthnError({
        message: "The authenticator was previously registered",
        code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED",
        cause: error
      });
    } else if (error.name === "NotAllowedError") {
      return new WebAuthnError({
        message: error.message,
        code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
        cause: error
      });
    } else if (error.name === "NotSupportedError") {
      const validPubKeyCredParams = publicKey.pubKeyCredParams.filter((param) => param.type === "public-key");
      if (validPubKeyCredParams.length === 0) {
        return new WebAuthnError({
          message: 'No entry in pubKeyCredParams was of type "public-key"',
          code: "ERROR_MALFORMED_PUBKEYCREDPARAMS",
          cause: error
        });
      }
      return new WebAuthnError({
        message: "No available authenticator supported any of the specified pubKeyCredParams algorithms",
        code: "ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG",
        cause: error
      });
    } else if (error.name === "SecurityError") {
      const effectiveDomain = globalThis.location.hostname;
      if (!isValidDomain(effectiveDomain)) {
        return new WebAuthnError({
          message: `${globalThis.location.hostname} is an invalid domain`,
          code: "ERROR_INVALID_DOMAIN",
          cause: error
        });
      } else if (publicKey.rp.id !== effectiveDomain) {
        return new WebAuthnError({
          message: `The RP ID "${publicKey.rp.id}" is invalid for this domain`,
          code: "ERROR_INVALID_RP_ID",
          cause: error
        });
      }
    } else if (error.name === "TypeError") {
      if (publicKey.user.id.byteLength < 1 || publicKey.user.id.byteLength > 64) {
        return new WebAuthnError({
          message: "User ID was not between 1 and 64 characters",
          code: "ERROR_INVALID_USER_ID_LENGTH",
          cause: error
        });
      }
    } else if (error.name === "UnknownError") {
      return new WebAuthnError({
        message: "The authenticator was unable to process the specified options, or could not create a new credential",
        code: "ERROR_AUTHENTICATOR_GENERAL_ERROR",
        cause: error
      });
    }
    return error;
  }

  // node_modules/@simplewebauthn/browser/esm/helpers/webAuthnAbortService.js
  var BaseWebAuthnAbortService = class {
    constructor() {
      Object.defineProperty(this, "controller", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: void 0
      });
    }
    createNewAbortSignal() {
      if (this.controller) {
        const abortError = new Error("Cancelling existing WebAuthn API call for new one");
        abortError.name = "AbortError";
        this.controller.abort(abortError);
      }
      const newController = new AbortController();
      this.controller = newController;
      return newController.signal;
    }
    cancelCeremony() {
      if (this.controller) {
        const abortError = new Error("Manually cancelling existing WebAuthn API call");
        abortError.name = "AbortError";
        this.controller.abort(abortError);
        this.controller = void 0;
      }
    }
  };
  var WebAuthnAbortService = new BaseWebAuthnAbortService();

  // node_modules/@simplewebauthn/browser/esm/helpers/toAuthenticatorAttachment.js
  var attachments = ["cross-platform", "platform"];
  function toAuthenticatorAttachment(attachment) {
    if (!attachment) {
      return;
    }
    if (attachments.indexOf(attachment) < 0) {
      return;
    }
    return attachment;
  }

  // node_modules/@simplewebauthn/browser/esm/methods/startRegistration.js
  async function startRegistration(options) {
    if (!options.optionsJSON && options.challenge) {
      console.warn("startRegistration() was not called correctly. It will try to continue with the provided options, but this call should be refactored to use the expected call structure instead. See https://simplewebauthn.dev/docs/packages/browser#typeerror-cannot-read-properties-of-undefined-reading-challenge for more information.");
      options = { optionsJSON: options };
    }
    const { optionsJSON, useAutoRegister = false } = options;
    if (!browserSupportsWebAuthn()) {
      throw new Error("WebAuthn is not supported in this browser");
    }
    const publicKey = {
      ...optionsJSON,
      challenge: base64URLStringToBuffer(optionsJSON.challenge),
      user: {
        ...optionsJSON.user,
        id: base64URLStringToBuffer(optionsJSON.user.id)
      },
      excludeCredentials: optionsJSON.excludeCredentials?.map(toPublicKeyCredentialDescriptor)
    };
    const createOptions = {};
    if (useAutoRegister) {
      createOptions.mediation = "conditional";
    }
    createOptions.publicKey = publicKey;
    createOptions.signal = WebAuthnAbortService.createNewAbortSignal();
    let credential;
    try {
      credential = await navigator.credentials.create(
        // TODO: Newer versions of Deno require this casting, revisit once we're using Deno 2.6+
        createOptions
      );
    } catch (err) {
      throw identifyRegistrationError({ error: err, options: createOptions });
    }
    if (!credential) {
      throw new Error("Registration was not completed");
    }
    const { id, rawId, response, type } = credential;
    let transports = void 0;
    if (typeof response.getTransports === "function") {
      transports = response.getTransports();
    }
    let responsePublicKeyAlgorithm = void 0;
    if (typeof response.getPublicKeyAlgorithm === "function") {
      try {
        responsePublicKeyAlgorithm = response.getPublicKeyAlgorithm();
      } catch (error) {
        warnOnBrokenImplementation("getPublicKeyAlgorithm()", error);
      }
    }
    let responsePublicKey = void 0;
    if (typeof response.getPublicKey === "function") {
      try {
        const _publicKey = response.getPublicKey();
        if (_publicKey !== null) {
          responsePublicKey = bufferToBase64URLString(_publicKey);
        }
      } catch (error) {
        warnOnBrokenImplementation("getPublicKey()", error);
      }
    }
    let responseAuthenticatorData;
    if (typeof response.getAuthenticatorData === "function") {
      try {
        responseAuthenticatorData = bufferToBase64URLString(response.getAuthenticatorData());
      } catch (error) {
        warnOnBrokenImplementation("getAuthenticatorData()", error);
      }
    }
    return {
      id,
      rawId: bufferToBase64URLString(rawId),
      response: {
        attestationObject: bufferToBase64URLString(response.attestationObject),
        clientDataJSON: bufferToBase64URLString(response.clientDataJSON),
        transports,
        publicKeyAlgorithm: responsePublicKeyAlgorithm,
        publicKey: responsePublicKey,
        authenticatorData: responseAuthenticatorData
      },
      type,
      clientExtensionResults: credential.getClientExtensionResults(),
      authenticatorAttachment: toAuthenticatorAttachment(credential.authenticatorAttachment)
    };
  }
  function warnOnBrokenImplementation(methodName, cause) {
    console.warn(`The browser extension that intercepted this WebAuthn API call incorrectly implemented ${methodName}. You should report this error to them.
`, cause);
  }

  // node_modules/@simplewebauthn/browser/esm/helpers/browserSupportsWebAuthnAutofill.js
  function browserSupportsWebAuthnAutofill() {
    if (!browserSupportsWebAuthn()) {
      return _browserSupportsWebAuthnAutofillInternals.stubThis(new Promise((resolve) => resolve(false)));
    }
    const globalPublicKeyCredential = globalThis.PublicKeyCredential;
    if (globalPublicKeyCredential?.isConditionalMediationAvailable === void 0) {
      return _browserSupportsWebAuthnAutofillInternals.stubThis(new Promise((resolve) => resolve(false)));
    }
    return _browserSupportsWebAuthnAutofillInternals.stubThis(globalPublicKeyCredential.isConditionalMediationAvailable());
  }
  var _browserSupportsWebAuthnAutofillInternals = {
    stubThis: (value) => value
  };

  // node_modules/@simplewebauthn/browser/esm/helpers/identifyAuthenticationError.js
  function identifyAuthenticationError({ error, options }) {
    const { publicKey } = options;
    if (!publicKey) {
      throw Error("options was missing required publicKey property");
    }
    if (error.name === "AbortError") {
      if (options.signal instanceof AbortSignal) {
        return new WebAuthnError({
          message: "Authentication ceremony was sent an abort signal",
          code: "ERROR_CEREMONY_ABORTED",
          cause: error
        });
      }
    } else if (error.name === "NotAllowedError") {
      return new WebAuthnError({
        message: error.message,
        code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
        cause: error
      });
    } else if (error.name === "SecurityError") {
      const effectiveDomain = globalThis.location.hostname;
      if (!isValidDomain(effectiveDomain)) {
        return new WebAuthnError({
          message: `${globalThis.location.hostname} is an invalid domain`,
          code: "ERROR_INVALID_DOMAIN",
          cause: error
        });
      } else if (publicKey.rpId !== effectiveDomain) {
        return new WebAuthnError({
          message: `The RP ID "${publicKey.rpId}" is invalid for this domain`,
          code: "ERROR_INVALID_RP_ID",
          cause: error
        });
      }
    } else if (error.name === "UnknownError") {
      return new WebAuthnError({
        message: "The authenticator was unable to process the specified options, or could not create a new assertion signature",
        code: "ERROR_AUTHENTICATOR_GENERAL_ERROR",
        cause: error
      });
    }
    return error;
  }

  // node_modules/@simplewebauthn/browser/esm/methods/startAuthentication.js
  async function startAuthentication(options) {
    if (!options.optionsJSON && options.challenge) {
      console.warn("startAuthentication() was not called correctly. It will try to continue with the provided options, but this call should be refactored to use the expected call structure instead. See https://simplewebauthn.dev/docs/packages/browser#typeerror-cannot-read-properties-of-undefined-reading-challenge for more information.");
      options = { optionsJSON: options };
    }
    const { optionsJSON, useBrowserAutofill = false, verifyBrowserAutofillInput = true } = options;
    if (!browserSupportsWebAuthn()) {
      throw new Error("WebAuthn is not supported in this browser");
    }
    let allowCredentials;
    if (optionsJSON.allowCredentials?.length !== 0) {
      allowCredentials = optionsJSON.allowCredentials?.map(toPublicKeyCredentialDescriptor);
    }
    const publicKey = {
      ...optionsJSON,
      challenge: base64URLStringToBuffer(optionsJSON.challenge),
      allowCredentials
    };
    const getOptions = {};
    if (useBrowserAutofill) {
      if (!await browserSupportsWebAuthnAutofill()) {
        throw Error("Browser does not support WebAuthn autofill");
      }
      const eligibleInputs = document.querySelectorAll("input[autocomplete$='webauthn']");
      if (eligibleInputs.length < 1 && verifyBrowserAutofillInput) {
        throw Error('No <input> with "webauthn" as the only or last value in its `autocomplete` attribute was detected');
      }
      getOptions.mediation = "conditional";
      publicKey.allowCredentials = [];
    }
    getOptions.publicKey = publicKey;
    getOptions.signal = WebAuthnAbortService.createNewAbortSignal();
    let credential;
    try {
      credential = await navigator.credentials.get(
        // TODO: Newer versions of Deno require this casting, revisit once we're using Deno 2.6+
        getOptions
      );
    } catch (err) {
      throw identifyAuthenticationError({ error: err, options: getOptions });
    }
    if (!credential) {
      throw new Error("Authentication was not completed");
    }
    const { id, rawId, response, type } = credential;
    let userHandle = void 0;
    if (response.userHandle) {
      userHandle = bufferToBase64URLString(response.userHandle);
    }
    return {
      id,
      rawId: bufferToBase64URLString(rawId),
      response: {
        authenticatorData: bufferToBase64URLString(response.authenticatorData),
        clientDataJSON: bufferToBase64URLString(response.clientDataJSON),
        signature: bufferToBase64URLString(response.signature),
        userHandle
      },
      type,
      clientExtensionResults: credential.getClientExtensionResults(),
      authenticatorAttachment: toAuthenticatorAttachment(credential.authenticatorAttachment)
    };
  }

  // client/app.js
  var elements = {
    privateSection: document.querySelector("#private-space"),
    privateToggle: document.querySelector("#private-toggle"),
    privateToggleLabel: document.querySelector("#private-toggle-label"),
    privateToggleSymbol: document.querySelector("#private-toggle-symbol"),
    privateContent: document.querySelector("#private-content"),
    authState: document.querySelector("#auth-state"),
    locked: document.querySelector("#locked-panel"),
    unlocked: document.querySelector("#unlocked-panel"),
    login: document.querySelector("#login-btn"),
    logout: document.querySelector("#logout-btn"),
    showSetup: document.querySelector("#show-setup-btn"),
    setup: document.querySelector("#setup-panel"),
    setupAccount: document.querySelector("#setup-account"),
    setupName: document.querySelector("#setup-name"),
    setupCode: document.querySelector("#setup-code"),
    accountName: document.querySelector("#account-name"),
    privateItems: document.querySelector("#private-items"),
    passkeyList: document.querySelector("#passkey-list"),
    addPasskey: document.querySelector("#add-passkey-form"),
    newPasskeyName: document.querySelector("#new-passkey-name"),
    status: document.querySelector("#status-message"),
    toggleProjects: document.querySelector("#toggle-projects-btn")
  };
  function setPrivateExpanded(expanded) {
    elements.privateContent.hidden = !expanded;
    elements.privateSection.classList.toggle("is-expanded", expanded);
    elements.privateToggle.setAttribute("aria-expanded", String(expanded));
    elements.privateToggleLabel.textContent = expanded ? "\uB098\uB9CC\uC758 \uC790\uB9AC \uC811\uAE30" : "\uB098\uB9CC\uC758 \uC790\uB9AC \uC5F4\uAE30";
    elements.privateToggleSymbol.textContent = expanded ? "\u2212" : "+";
  }
  async function openPrivateSpace() {
    if (!elements.privateContent.hidden) return;
    elements.unlocked.hidden = true;
    setPrivateExpanded(true);
    try {
      await refreshPrivateSpace();
    } catch (error) {
      elements.locked.hidden = false;
      showStatus(error.message, "error");
    }
  }
  elements.privateToggle.addEventListener("click", () => {
    if (elements.privateContent.hidden) openPrivateSpace();
    else setPrivateExpanded(false);
  });
  document.querySelector(".nav-private").addEventListener("click", () => {
    openPrivateSpace();
  });
  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers ?? {} }
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const error = new Error(body.error ?? `\uC694\uCCAD\uC774 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4 (${response.status}).`);
      error.code = body.code;
      error.status = response.status;
      throw error;
    }
    if (response.status === 204) return null;
    return response.json();
  }
  function showStatus(message, type = "info") {
    elements.status.textContent = message;
    elements.status.dataset.type = type;
  }
  function humanDate(value) {
    return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(value));
  }
  function renderItems(items) {
    elements.privateItems.replaceChildren(...items.map((item) => {
      const article = document.createElement("article");
      const title = document.createElement("h5");
      const body = document.createElement("p");
      title.textContent = item.title;
      body.textContent = item.body;
      article.append(title, body);
      return article;
    }));
  }
  function renderPasskeys(passkeys) {
    elements.passkeyList.replaceChildren(...passkeys.map((passkey) => {
      const item = document.createElement("li");
      const description = document.createElement("div");
      const name = document.createElement("strong");
      const meta = document.createElement("span");
      const button = document.createElement("button");
      name.textContent = passkey.name;
      meta.textContent = `${humanDate(passkey.createdAt)} \xB7 ${passkey.idPreview}`;
      description.append(name, meta);
      button.type = "button";
      button.className = "danger-button";
      button.textContent = "\uC0AD\uC81C";
      button.addEventListener("click", () => deletePasskey(passkey.id));
      item.append(description, button);
      return item;
    }));
  }
  async function refreshPrivateSpace() {
    const session = await api("/api/session");
    const authenticated = session.authenticated;
    elements.locked.hidden = authenticated;
    elements.unlocked.hidden = true;
    elements.authState.textContent = authenticated ? "\uC5F4\uB9BC" : "\uC7A0\uAE40";
    elements.authState.classList.toggle("is-open", authenticated);
    if (!authenticated) {
      elements.accountName.textContent = "";
      elements.privateItems.replaceChildren();
      elements.passkeyList.replaceChildren();
      return;
    }
    const [privateData, passkeyData] = await Promise.all([api("/api/private-items"), api("/api/passkeys")]);
    elements.accountName.textContent = `${session.account.displayName} (${session.account.alias})`;
    renderItems(privateData.items);
    renderPasskeys(passkeyData.passkeys);
    elements.unlocked.hidden = false;
  }
  async function finishRegistration(payload) {
    const credential = await startRegistration({ optionsJSON: payload.options });
    await api("/api/passkeys/registration/verify", {
      method: "POST",
      body: JSON.stringify({ ceremonyId: payload.ceremonyId, response: credential })
    });
    showStatus("\uD328\uC2A4\uD0A4\uB97C \uB4F1\uB85D\uD558\uACE0 \uBCF4\uD638 \uACF5\uAC04\uC744 \uC5F4\uC5C8\uC2B5\uB2C8\uB2E4.", "success");
    await refreshPrivateSpace();
  }
  elements.login.addEventListener("click", async () => {
    try {
      showStatus("\uAE30\uAE30\uC5D0 \uD328\uC2A4\uD0A4 \uD655\uC778\uC744 \uC694\uCCAD\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.");
      const payload = await api("/api/authentication/options", { method: "POST", body: "{}" });
      const credential = await startAuthentication({ optionsJSON: payload.options });
      await api("/api/authentication/verify", {
        method: "POST",
        body: JSON.stringify({ ceremonyId: payload.ceremonyId, response: credential })
      });
      showStatus("\uD328\uC2A4\uD0A4 \uD655\uC778\uC5D0 \uC131\uACF5\uD588\uC2B5\uB2C8\uB2E4.", "success");
      await refreshPrivateSpace();
    } catch (error) {
      showStatus(error.name === "NotAllowedError" ? "\uD328\uC2A4\uD0A4 \uD655\uC778\uC774 \uCDE8\uC18C\uB418\uC5C8\uAC70\uB098 \uC81C\uD55C \uC2DC\uAC04 \uC548\uC5D0 \uC644\uB8CC\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." : error.message, "error");
    }
  });
  elements.showSetup.addEventListener("click", () => {
    const willOpen = elements.setup.hidden;
    elements.setup.hidden = !willOpen;
    elements.showSetup.setAttribute("aria-expanded", String(willOpen));
  });
  elements.setup.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      showStatus("\uCD5C\uCD08 \uD328\uC2A4\uD0A4 \uB4F1\uB85D\uC744 \uC900\uBE44\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.");
      const payload = await api("/api/bootstrap/registration/options", {
        method: "POST",
        body: JSON.stringify({
          accountAlias: elements.setupAccount.value,
          passkeyName: elements.setupName.value,
          setupCode: elements.setupCode.value
        })
      });
      await finishRegistration(payload);
      elements.setup.reset();
    } catch (error) {
      showStatus(error.name === "NotAllowedError" ? "\uD328\uC2A4\uD0A4 \uB4F1\uB85D\uC744 \uCDE8\uC18C\uD588\uC2B5\uB2C8\uB2E4. \uC11C\uBC84\uC5D0\uB294 \uC544\uBB34\uAC83\uB3C4 \uC800\uC7A5\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." : error.message, "error");
    }
  });
  elements.addPasskey.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      showStatus("\uC0C8 \uD328\uC2A4\uD0A4 \uB4F1\uB85D\uC744 \uC900\uBE44\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.");
      const payload = await api("/api/passkeys/registration/options", {
        method: "POST",
        body: JSON.stringify({ passkeyName: elements.newPasskeyName.value })
      });
      await finishRegistration(payload);
      elements.addPasskey.reset();
    } catch (error) {
      showStatus(error.name === "NotAllowedError" ? "\uD328\uC2A4\uD0A4 \uB4F1\uB85D\uC744 \uCDE8\uC18C\uD588\uC2B5\uB2C8\uB2E4. \uC11C\uBC84\uC5D0\uB294 \uC544\uBB34\uAC83\uB3C4 \uC800\uC7A5\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." : error.message, "error");
    }
  });
  async function deletePasskey(id) {
    try {
      await api(`/api/passkeys/${encodeURIComponent(id)}`, { method: "DELETE" });
      showStatus("\uD328\uC2A4\uD0A4\uB97C \uC0AD\uC81C\uD588\uC2B5\uB2C8\uB2E4. \uB0A8\uC740 \uD328\uC2A4\uD0A4\uB85C \uB2E4\uC2DC \uB85C\uADF8\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.", "success");
      await refreshPrivateSpace();
    } catch (error) {
      showStatus(error.message, error.status === 409 ? "warning" : "error");
    }
  }
  elements.logout.addEventListener("click", async () => {
    try {
      await api("/api/logout", { method: "POST", body: "{}" });
      showStatus("\uB85C\uADF8\uC544\uC6C3\uD588\uC2B5\uB2C8\uB2E4. \uAE30\uC874 \uC138\uC158\uC73C\uB85C \uBE44\uACF5\uAC1C \uC790\uB8CC\uB97C \uC694\uCCAD\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.", "success");
      await refreshPrivateSpace();
    } catch (error) {
      showStatus(error.message, "error");
    }
  });
  elements.toggleProjects.addEventListener("click", () => {
    const expanded = elements.toggleProjects.getAttribute("aria-expanded") === "true";
    document.querySelectorAll(".extra-project").forEach((card) => card.classList.toggle("is-visible", !expanded));
    elements.toggleProjects.setAttribute("aria-expanded", String(!expanded));
    elements.toggleProjects.textContent = expanded ? "\uC0AC\uB840 \uB354 \uBCF4\uAE30 (+2) \u2193" : "\uC0AC\uB840 \uC811\uAE30 \u2191";
  });
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window && !reducedMotion) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.1 });
    document.querySelectorAll(".fade-in").forEach((element) => observer.observe(element));
  } else {
    document.querySelectorAll(".fade-in").forEach((element) => element.classList.add("visible"));
  }
  refreshPrivateSpace().catch((error) => showStatus(error.message, "error"));
})();
