import {PathQLServerEntry} from "pathql/src/PathQL/Server/PathQLServerEntry.class.js"
import {User} from "pathql/tests/Entrys/User.pathql.js";

export class Groups extends PathQLServerEntry {
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
