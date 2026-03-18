/**
 * PersonaFlow - Modal Component
 */

const Modal = {
    container: null,

    /**
     * Initialize modal
     */
    init() {
        this.container = document.getElementById('modal-container');
    },

    /**
     * Open modal
     */
    open(title, content, footer = '') {
        if (!this.container) this.init();

        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal-footer').innerHTML = footer;

        this.container.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Close modal
     */
    close() {
        if (!this.container) this.init();

        this.container.classList.add('hidden');
        document.body.style.overflow = '';
    },

    /**
     * Confirm dialog
     */
    confirm(title, message, onConfirm, confirmText = 'Confirm', danger = false) {
        const content = `<p style="color: var(--gray-600);">${message}</p>`;
        const footer = `
            <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm-btn">${confirmText}</button>
        `;

        this.open(title, content, footer);

        document.getElementById('modal-confirm-btn').addEventListener('click', () => {
            onConfirm();
            this.close();
        });
    },

    /**
     * Alert dialog
     */
    alert(title, message) {
        const content = `<p style="color: var(--gray-600);">${message}</p>`;
        const footer = `<button class="btn btn-primary" onclick="Modal.close()">OK</button>`;

        this.open(title, content, footer);
    }
};
