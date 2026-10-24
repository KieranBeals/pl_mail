import { Controller } from "@hotwired/stimulus";

/**
 * Prefills IMAP/SMTP settings from a shipped provider preset.
 *
 * Fields are resolved by name suffix (account[imapHost] → imapHost) rather
 * than by Stimulus targets, so the controller does not depend on the form
 * theme passing data attributes through to the widget.
 *
 * The preset table is embedded on the select element itself (data-presets) —
 * the whole table is a couple of kilobytes, so no round-trip is needed.
 */
export default class extends Controller {
    static targets = ["note", "incomingLabel", "pop3Options"];

    /**
     * The port each incoming protocol starts from. The heading is not here:
     * it is translated, so the template hands both wordings to the heading
     * element as data-heading-imap / data-heading-pop3.
     */
    static PORTS = { imap: "993", pop3: "995" };

    connect() {
        this.presets = this._readPresets();
        this.protocolChanged();
    }

    /**
     * The incoming-protocol radio was changed.
     *
     * Three things follow, and all three are the same fact stated three ways:
     * the section heading names the protocol, the port placeholder follows,
     * and the POP3 delete option appears only where it means something.
     * Nothing already typed is cleared — switching back and forth should not
     * cost the user their host name.
     */
    protocolChanged() {
        const protocol = this._currentProtocol();

        if (this.hasIncomingLabelTarget) {
            const heading = this.incomingLabelTarget.dataset[protocol === "pop3" ? "headingPop3" : "headingImap"];

            if (heading) {
                this.incomingLabelTarget.textContent = heading;
            }
        }

        const port = this._field("imapPort");

        if (port !== null) {
            port.placeholder = this.constructor.PORTS[protocol] ?? this.constructor.PORTS.imap;
        }

        if (this.hasPop3OptionsTarget) {
            this.pop3OptionsTarget.classList.toggle("hidden", protocol !== "pop3");
        }
    }

    /** Which radio is checked, defaulting to IMAP like the entity does. */
    _currentProtocol() {
        const checked = this.element.querySelector('[name$="[incomingProtocol]"]:checked');

        return checked === null ? "imap" : checked.value;
    }

    /** Explicit choice from the dropdown — always wins. */
    apply() {
        const select = this._field("preset");

        if (select === null) {
            return;
        }

        const preset = this.presets[select.value];

        if (preset === undefined) {
            this._renderNote(null);
            return;
        }

        this._fill(preset);
    }

    /** Best-effort detection from the typed address. Never clobbers input. */
    detect() {
        const select = this._field("preset");

        if (select === null || select.value !== "") {
            return;
        }

        if (this._value("imapHost") !== "") {
            return;
        }

        const address = this._value("username");
        const at = address.lastIndexOf("@");

        if (at === -1) {
            return;
        }

        const domain = address.slice(at + 1).toLowerCase();
        const key = Object.keys(this.presets).find(
            (candidate) => this.presets[candidate].domains.includes(domain),
        );

        if (key === undefined) {
            return;
        }

        this._select(select, key);
    }

    // ── Private ───────────────────────────────────────────────────────────

    _readPresets() {
        const select = this._field("preset");

        if (select === null || select.dataset.presets === undefined) {
            console.error("imap-preset: preset select not found or carries no payload");
            return {};
        }

        try {
            return JSON.parse(select.dataset.presets);
        } catch (error) {
            console.error("imap-preset: malformed preset payload", error);
            return {};
        }
    }

    _field(name) {
        return this.element.querySelector(`[name$="[${name}]"]`);
    }

    _value(name) {
        const field = this._field(name);

        if (field === null) {
            return "";
        }

        return field.value.trim();
    }

    /** Sets the dropdown, going through Tom Select when it is active. */
    _select(select, key) {
        if (select.tomselect !== undefined) {
            select.tomselect.setValue(key, false);
            return;
        }

        select.value = key;
        select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    _fill(preset) {
        // Every preset is an IMAP server, so choosing one is choosing IMAP:
        // its host and port would mean nothing to a POP3 session.
        const imap = this.element.querySelector('[name$="[incomingProtocol]"][value="imap"]');

        if (imap !== null && imap.checked === false) {
            imap.checked = true;
            this.protocolChanged();
        }

        this._set("imapHost", preset.imap.host);
        this._set("imapPort", preset.imap.port);
        this._set("imapEncryption", preset.imap.encryption);

        this._set("smtpHost", preset.smtp.host);
        this._set("smtpPort", preset.smtp.port);
        this._set("smtpEncryption", preset.smtp.encryption);

        this._renderNote(preset.note);
    }

    _set(name, value) {
        const field = this._field(name);

        if (field === null) {
            console.warn(`imap-preset: no field matching [name$="[${name}]"]`);
            return;
        }

        field.value = value;
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
    }

    _renderNote(note) {
        if (this.hasNoteTarget === false) {
            return;
        }

        if (note === null || note === undefined || note === "") {
            this.noteTarget.classList.add("hidden");
            this.noteTarget.textContent = "";
            return;
        }

        this.noteTarget.textContent = note;
        this.noteTarget.classList.remove("hidden");
    }
}
