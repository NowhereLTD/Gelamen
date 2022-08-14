import {PathQLClientRequestHandler} from "../../../../../src/PathQL/Client/PathQLClientRequestHandler.class.js";

let client = new PathQLClientRequestHandler();
client.addEventListener("open", async function() {
  await client.getAllObjects();
});