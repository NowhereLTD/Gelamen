import {GelamenServerEntry} from "gelamen/src/Gelamen/Server/GelamenServerEntry.class.js"
import {Groups} from "gelamen/tests/Entrys/Groups.gelamen.js";

export class User extends GelamenServerEntry {
	static fields = {
		"name": {
			"type": "String"
		}
	}

	constructor(options = {}) {
		options.logging = "DEBUG";
		super(options);
		this.objects = {
			"Groups": Groups
		};
		return (async function () {
			await this.parseFromRaw(options);
			return this;
		}.bind(this)());
	}

	generatePassword() {
		this.password = "";
		this.generatedPassword = window.crypto.subtle.generateKey(
			{
				name: "RSA-OAEP",
				modulusLength: 4096,
				publicExponent: new Uint8Array([1, 0, 1]),
				hash: "SHA-256"
			},
			true,
			["encrypt", "decrypt"]
		);

	}

	checkPassword() {

	}
}
