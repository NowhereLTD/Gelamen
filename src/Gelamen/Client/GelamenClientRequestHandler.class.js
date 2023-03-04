// deno-lint-ignore-file

export class GelamenClientRequestHandler extends EventTarget {
	constructor(options = {}) {
		super();
		this.reconnectTime = 5000;
		this.pingTime = 10000;
		this.messageCounter = 0;
		this.url = options.url ? options.url : "wss://localhost:9080";
		this.objects = {};
		this.objectCache = {};
		this.baseClass = options.baseClass ? options.baseClass : PathQLClientEntry;
		// This holds a user specific class list with custom class to implement custom pathqlcliententry objects with own functions
		// f.e. a user class with a specific crypt method
		this.baseClassList = options.baseClassList ? options.baseClassList : {};
		this.init();
	}

	init() {
		this.socket = new WebSocket(this.url);
		console.log("try to connect");
		this.socket.addEventListener("open", async (_event) => {
			const openEvent = new CustomEvent("open");
			this.dispatchEvent(openEvent);
			console.log("client connected");
			await this.ping();
			resolve(this);
		});

		this.socket.addEventListener("message", (event) => {
			const data = JSON.parse(event.data);
			if(data.pong) {
				this.lastPing = Date.now() - data.pong;
				const pongEvent = new CustomEvent("pong", {detail: this.lastPing});
				this.dispatchEvent(pongEvent);
			}

			if(data.event != null && data.event.token != null) {
				const obj = this.objectCache[data.event.token];
				if(obj != null) {
					const objEvent = new CustomEvent(data.event.cmd, {detail: data.event});
					obj.dispatchEvent(objEvent);
				}
			}

			const messageEvent = new CustomEvent("message", {detail: data});
			this.dispatchEvent(messageEvent);
		});

		this.socket.addEventListener("close", (_event) => {
			const closeEvent = new CustomEvent("close");
			this.dispatchEvent(closeEvent);
			console.log("socket connection closed try to reconnect in " + this.reconnectTime / 1000 + " seconds");
			setTimeout(() => {
				console.log("reconnect");
				this.init();
			}, this.reconnectTime);
		});
	}

	send(msg) {
		return new Promise((resolve, reject) => {
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
				} else {
					console.log("[GELAMEN] Socket is not open yet!");
				}
			} catch(e) {
				console.log(e);
				reject(e);
			}
		});
	}

	async ping() {
		const pingDate = Date.now();

		const pingEvent = new CustomEvent("ping", {detail: pingDate});
		this.dispatchEvent(pingEvent);

		await this.send({
			ping: pingDate
		});

		setTimeout(async () => {
			await this.ping();
		}, this.pingTime);
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
					let CacheBaseClass = this.baseClass;
					if(this.baseClassList[objectName]) {
						CacheBaseClass = this.baseClassList[objectName];
					}
					this.objects[objectName] = class extends CacheBaseClass {
						static fields = object.fields;
						static methods = object.methods;
						static objects = object.objects;

						constructor() {
							super({client: client, name: objectName});
							return (function() {
								return this;
							}.bind(this)());
						}
					}
				}
			}
			this.dispatchEvent(new CustomEvent("loadAll"));
			return true;
		} catch(_e) {
			return false;
		}
	}
}
