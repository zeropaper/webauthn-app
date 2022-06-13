(() => {
  const { browserSupportsWebauthn, startRegistration, startAuthentication } =
    SimpleWebAuthnBrowser;
  const styles = `
    .wrapper {
      position: relative;
    }
    .hidden {
      display: none;
    }
    .email:visited::after {
      content: ' ✓';
    }
    .stage {
      font-size: 2rem;
    }
  `;

  class WebAuthnComponent extends HTMLElement {
    constructor() {
      super();

      const storeName = this.getAttribute('store-name') || 'store';
      this.#store = window[storeName];
      if (!this.#store)
        throw new Error(`No store found for store-name="${storeName}"`);
      this.#unsubscribeStore = this.#store.subscribe(() => {
        this.#updateDOM();
      });

      this.#browserSupport = browserSupportsWebauthn();

      this.attachShadow({ mode: 'open' });

      this.#prepareDOM();
      this.#updateDOM();
    }

    static get observedAttributes() {
      return ['store-name', 'email', 'txt-start', 'txt-cancel', 'txt-logout'];
    }

    disconnectedCallback() {
      if (typeof this.#unsubscribeStore === 'function') {
        this.#unsubscribeStore();
      }
    }

    #browserSupport = false;

    get browserSupport() {
      return this.#browserSupport;
    }

    #unsubscribeStore = () => {};

    #store = null;

    #stage = 'initial';
    get stage() {
      return this.#stage;
    }

    get state() {
      return this.#store.getState();
    }

    get emailAddress() {
      const parts = (
        this.getAttribute('email') || 'auth@zeropaper.style'
      ).split('@');
      return `${parts[0]}+${this.state.session.sessionId}@${parts[1]}`;
    }

    get hasSession() {
      return !!this.state.session?.sessionId;
    }

    get hasUser() {
      return !!this.state.session?.userId;
    }

    #$(selector) {
      return this.shadowRoot.querySelector(selector);
    }

    #$$(selector) {
      return this.shadowRoot.querySelectorAll(selector);
    }

    #prepareDOM() {
      const style = document.createElement('style');
      style.textContent = styles;
      this.shadowRoot.appendChild(style);

      const wrapper = document.createElement('div');
      wrapper.setAttribute('class', 'wrapper');
      const slotWrapper = document.createElement('div');
      slotWrapper.setAttribute('class', 'content-wrapper');
      const slot = document.createElement('slot');
      slotWrapper.appendChild(slot);

      const stageWrapper = document.createElement('div');
      const stage = document.createElement('span');
      stage.setAttribute('class', 'stage');
      const stageAction = document.createElement('button');
      stageAction.setAttribute('class', 'stage-action');
      stageAction.textContent = 'Start';
      stageAction.addEventListener('click', () => this.#handleStageAction());
      stageWrapper.appendChild(stage);
      stageWrapper.appendChild(stageAction);

      const userInfo = document.createElement('div');
      userInfo.setAttribute('class', 'user-info');
      const userEmail = document.createElement('div');
      userEmail.setAttribute('class', 'user-email');
      userInfo.appendChild(userEmail);

      const authenticationWrapper = document.createElement('div');
      const email = document.createElement('a');
      email.setAttribute('class', 'email');
      email.setAttribute('target', '_blank');
      email.onclick = () => {
        email.classList.add('clicked');
      };
      authenticationWrapper.appendChild(email);

      const checkIndicator = document.createElement('div');
      checkIndicator.setAttribute('class', 'check-indicator');

      wrapper.appendChild(slotWrapper);
      wrapper.appendChild(stageWrapper);
      wrapper.appendChild(userInfo);
      wrapper.appendChild(authenticationWrapper);
      wrapper.appendChild(checkIndicator);
      this.shadowRoot.appendChild(wrapper);
      // console.info('html', this.shadowRoot.innerHTML);
    }

    #handleStageAction() {
      if (!this.hasSession && !this.hasUser) {
        this.#ensureSession();
        return;
      }
      this.#destroySession();
    }

    async #destroySession() {
      await this.#store.session.destroy();
      await this.#store.session.fetch();
    }

    async #ensureSession() {
      try {
        await this.#store.session.ensure();
      } catch (e) {
        console.error(e);
      }
      try {
        if (typeof socket !== 'undefined' && !socket.connected) {
          socket.connect();
        }
      } catch (e) {
        console.error(e);
      }
    }

    #checkAnimationInterval = null;
    #checkAnimation() {
      // console.info('checkAnimation');
    }
    #startCheckAnimation() {
      if (this.#checkAnimationInterval) return;
      this.#checkAnimationInterval = setInterval(() => {
        this.#checkAnimation();
      }, 1000);
    }
    #stopCheckAnimation() {
      if (!this.#checkAnimationInterval) return;
      clearInterval(this.#checkAnimationInterval);
      this.#checkAnimationInterval = null;
    }

    #updateDOM() {
      const $ = this.#$.bind(this);

      const stage = $('.stage');
      const stageAction = $('.stage-action');
      const userInfo = $('.user-info');
      const email = $('.email');

      const { session } = this.state;
      console.info('session', session);

      if (this.hasUser) {
        userInfo.classList.remove('hidden');
        email.classList.add('hidden');
        stageAction.textContent = this.getAttribute('txt-logout') || 'Logout';
        stage.textContent = '🔒';
        userInfo.textContent = `User Id: ${session?.userId}`;
        this.#stopCheckAnimation();
      } else if (this.hasSession) {
        userInfo.classList.add('hidden');
        email.classList.remove('hidden');
        this.#startCheckAnimation();
        stageAction.textContent = this.getAttribute('txt-cancel') || 'Cancel';
        stage.textContent = '⏰';
        const emailAddress = this.emailAddress;
        email.setAttribute(
          'href',
          `mailto:${emailAddress}?subject=Account%20Creation`
        );
        email.textContent = emailAddress;
      } else {
        userInfo.classList.add('hidden');
        email.classList.add('hidden');
        stageAction.textContent = this.getAttribute('txt-start') || 'Start';
        stage.textContent = '🔓';
      }
    }

    disconnectedCallback() {
      this.#stopCheckAnimation();
    }

    attributeChangedCallback() {
      this.#updateDOM();
    }
  }

  customElements.define('web-authn', WebAuthnComponent);
})();
