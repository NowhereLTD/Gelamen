
export class PathQLServerRequestHandler {
	static objects = {};

	constructor(options) {
		return (async function () {
			this.port = options.port ? options.port : 8080;
			this.name = options.name ? options.name : "PathQLServerRequestHandler";
			this.version = options.version ? options.version : "0.1";
			this.db = options.db ? options.db : null;
			this.clients = {};
			this.debug = true;
			await this.listen();
		}.bind(this)());
	}

	async listen() {
		console.log(`${this.name} v${this.version} listen...`);
		this.listener = await Deno.listen({ port: this.port });
		while(true) {
			this.handleConnection(await this.listener.accept())
		}
	}

	async handleConnection(tcpConnection) {
		const httpConnection = Deno.serveHttp(tcpConnection);
		while(true) {
			const connection = await httpConnection.nextRequest();
			if(connection) {
				const {socket, response} = Deno.upgradeWebSocket(connection.request);

				socket.hasPermission = function(permission) {
					if(socket.client) {
						return socket.client.hasPermission(permission);
					}
					return false;
				}

				socket.permissions = ["*"];

				socket.broadcast = function(msg) {
					for(const client in this.clients) {
						msg.time = Date.now();
						this.clients[client].send(JSON.stringify(
							msg
						));
					}
				}.bind(this)

				socket.addEventListener("open", function(e) {
					e.currentTarget.id = tcpConnection.rid;
					this.clients[e.currentTarget.id] = socket;
				}.bind(this));

				socket.addEventListener("message", async function(e) {
					try {
						const msg = JSON.parse(e.data);
						if(msg.pathql != null) {
							const answer = {};
							for(const objName in msg.pathql) {
								if(this.constructor.objects[objName] != null) {
									const obj = await new this.constructor.objects[objName].constructor({}, this.db);
									try {
										answer[objName] = await obj.parseRequest({
											data: msg.pathql[objName],
											settings: {
												connection: socket
											}
										});
									} catch (e) {
										console.log(e);
										answer[objName] = {
											error: e.toString()
										}
									}
								}else {
									answer[objName] = {
										error: {
											msg: "Object type not exists!"
										}
									}
								}
							}

							if(msg.messageCounter != undefined) {
								answer["messageCounter"] = msg.messageCounter;
							}

							answer.time = Date.now();
							socket.send(JSON.stringify(answer));
						}else if(msg.ping) {
							socket.send(JSON.stringify({
								pong: Date.now()
							}));
						}else if(msg.getObject) {
							const answer = {};
							if(this.constructor.objects[msg.getObject] != null) {
								const object = this.constructor.objects[msg.getObject];
								const fieldArray = {};
								for(const key in object.fields) {
									// TODO: check the user permission
									if(!object.fields[key].private) {
										fieldArray[key] = object.fields[key];
									}
								}

								const methodArray = {};
								for(const key in object.methods) {
									// TODO: check the user permission
									methodArray[key] = object.methods[key];
								}

								const objectArray = {};
								for(const key in object.objects) {
									// TODO: check the user permission
									objectArray[key] = JSON.stringify(object.objects[key]);
								}

								answer[msg.getObject] = {
									fields: fieldArray,
									objects: objectArray,
									methods: methodArray
								};
							}else {
								answer[msg.getObject] = {
									error: {
										msg: "Object not exists!"
									}
								}
							}
							answer.time = Date.now();
							socket.send(JSON.stringify(answer));
						}
					} catch (err) {
						console.log(err);
						await this.addClientError(e.target, err);
					}
				}.bind(this));

				socket.addEventListener("close", function(e) {
					delete(this.clients[e.target.id]);
				}.bind(this));

				socket.addEventListener("error", async function(e) {
					await this.addClientError(socket, e);
				}.bind(this));

				connection.respondWith(response);
			}
		}
	}
}