import {PathQLServerEntry} from "pathql/src/PathQL/Server/PathQLServerEntry.class.js";
import {User} from "pathql/tests/Entrys/User.pathql.js";

export class Example extends PathQLServerEntry {
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
