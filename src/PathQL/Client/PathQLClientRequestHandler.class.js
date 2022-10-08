// deno-lint-ignore-file
import {PathQLClientEntry} from "./PathQLClientEntry.class.js";

export class PathQLClientRequestHandler extends EventTarget {
	constructor(options = {}) {
		super();
		this.reconnectTime = 5000;
		this.pingTime = 10000;
		this.messageCounter = 0;
		this.url = options.url ? options.url : "ws://localhost:9080";
		this.objects = {};
		this.init();
	}

	init() {
		this.socket = new WebSocket(this.url);
		console.log("try to connect");
		this.socket.addEventListener("open", async function (_event) {
			const openEvent = new CustomEvent("open");
			this.dispatchEvent(openEvent);
			console.log("client connected");
			await this.ping();
			resolve(this);
		}.bind(this));

		this.socket.addEventListener("message", function (event) {
				const data = JSON.parse(event.data);
				if(data.pong) {
					this.lastPing = Date.now() - data.pong;
					const pongEvent = new CustomEvent("pong", {detail: this.lastPing});
					this.dispatchEvent(pongEvent);
				}

				const messageEvent = new CustomEvent("message", {detail: data});
				this.dispatchEvent(messageEvent);
		}.bind(this));

		this.socket.addEventListener("close", function (_event) {
			const closeEvent = new CustomEvent("close");
			this.dispatchEvent(closeEvent);
			console.log("socket connection closed try to reconnect in " + this.reconnectTime/1000 + " seconds");
			setTimeout(function() {
				console.log("reconnect");
				this.init();
			}.bind(this), this.reconnectTime);
		}.bind(this));
	}

	send(msg) {
		return new Promise(function executor(resolve, reject) {
			try {
				if(this.socket.readyState === 1) {
					msg.messageCounter = this.messageCounter;
					this.messageCounter++;

					const listener = function(e) {
						const data = e.detail;
						if(data.messageCounter == msg.messageCounter) {
							this.removeEventListener("message", listener);
							resolve(data);
						}
					}.bind(this);

					this.addEventListener("message", listener);
					this.socket.send(JSON.stringify(msg));
				}else {
					console.log("[PathQL] Socket is not open yet!");
				}
			} catch (e) {
				console.log(e);
				reject(e);
			}
		}.bind(this));
	}

	async ping() {
		const pingDate = Date.now();

		const pingEvent = new CustomEvent("ping", {detail: pingDate});
		this.dispatchEvent(pingEvent);

		await this.send({
			ping: pingDate
		});

		setTimeout(async function() {
			await this.ping();
		}.bind(this), this.pingTime);
	}

	async getAllObjects() {
		try {
			const objects = await this.send({
				getAllObjects: true
			});
	
			const client = this;
			for(const objectName in objects.objects) {
				const object = objects.objects[objectName];
				if(!object.error) {
					this.objects[objectName] = class extends PathQLClientEntry {
						static fields = object.fields;
						static methods = object.methods;
						static objects = object.objects;
		
						constructor() {
							super({client: client, name: objectName});
							return (function () {
								return this;
							}.bind(this)());
						}
					}
				}
			}
			return true;
		}catch(_e) {
			return false;
		}
	}
}
