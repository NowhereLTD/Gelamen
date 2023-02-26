import {GelamenServerEntry} from "gelamen/src/Gelamen/Server/GelamenServerEntry.class.js";
import {User} from "gelamen/tests/Entrys/User.gelamen.js";

export class Example extends GelamenServerEntry {
	static fields = {
		"name": {
			"type": "String"
		},
		"tagline": {
			"type": "String"
		},
		"email": {
			"type": "Email"
		},
		"contributors": {
			"type": "Object",
			"object": "User",
			"array": true
		},
		"admin": {
			"type": "Object",
			"object": "User",
			"private": true
		}
	}

	constructor(options = {}) {
		super(options);
		this.objects = {
			"User": User
		};
		return (async function () {
			await this.parseFromRaw(options);
			return this;
		}.bind(this)());
	}
}
