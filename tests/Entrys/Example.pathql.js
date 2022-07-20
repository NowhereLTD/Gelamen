import {PathQLServerEntry} from "pathql/src/PathQL/Server/PathQLServerEntry.class.js";
import {User} from "pathql/tests/Entrys/User.pathql.js";

export class Example extends PathQLServerEntry {
	static fields = {
		"id": {
			"type": "Int",
			"db": {
				"primary": true,
				"autoincrement": true
			}
		},
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

	constructor(options = {}, db) {
		super(options, db);
		this.objects = {
			"User": User
		};
		return (async function () {
			await this.parseFromRaw();
			return this;
		}.bind(this)());
	}
}
