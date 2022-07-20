
export class PathQLClientRequestHandler extends EventTarget {
  constructor(options) {
    super();
    this.reconnectTime = 5000;
    this.pingTime = 10000;
    this.messageCounter = 0;
    this.url = options.url ? options.url : "ws://localhost:8080";

    return new Promise(function(resolve, reject) {
      console.clear();
      this.socket = new WebSocket(this.url);
      console.log("try to connect");
      this.socket.addEventListener("open", async function (event) {
        let openEvent = new CustomEvent("open");
        this.dispatchEvent(openEvent);
        console.log("client connected");
        await this.ping();
        resolve(this);
      }.bind(this));

      this.socket.addEventListener("message", async function (event) {
          let data = JSON.parse(event.data);

          if(data.pong) {
            this.lastPing = Date.now() - data.pong;
            let pongEvent = new CustomEvent("pong", {detail: this.lastPing});
            this.dispatchEvent(pongEvent);
          }else {
          }

          let messageEvent = new CustomEvent("message", {detail: data});
          this.dispatchEvent(messageEvent);
      }.bind(this));

      this.socket.addEventListener("close", async function (event) {
        let closeEvent = new CustomEvent("close");
        this.dispatchEvent(closeEvent);
        console.log("socket connection closed try to reconnect in " + this.reconnectTime/1000 + " seconds");
        setTimeout(async function() {
          console.log("reconnect");
          await this.init();
        }.bind(this), this.reconnectTime);
      }.bind(this));
    }.bind(this));
  }

  async send(msg) {
    return new Promise(function executor(resolve, reject) {
      try {
        msg.messageCounter = this.messageCounter;
        this.messageCounter++;

        let listener = function(e) {
          let data = e.detail;
          if(data.messageCounter == msg.messageCounter) {
            this.removeEventListener("message", listener);
            resolve(data);
          }
        }.bind(this)

        this.addEventListener("message", listener);
        this.socket.send(JSON.stringify(msg));
      } catch (e) {
        console.log(e);
        reject(e);
      }
    }.bind(this));
  }

  async ping() {
    let pingDate = Date.now();

    let pingEvent = new CustomEvent("ping", {detail: pingDate});
    this.dispatchEvent(pingEvent);

    await this.send({
      ping: pingDate
    });

    setTimeout(async function() {
      await this.ping();
    }.bind(this), this.pingTime);
  }
}
