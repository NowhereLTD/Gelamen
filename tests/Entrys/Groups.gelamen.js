import {GelamenServerEntry} from "gelamen/src/Gelamen/Server/GelamenServerEntry.class.js"
import {User} from "gelamen/tests/Entrys/User.gelamen.js";

export class Groups extends GelamenServerEntry {
	static fields = {
		"name": {
			"type": "String"
		},
		"users": {
			"type": "Object",
			"object": "User"
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
