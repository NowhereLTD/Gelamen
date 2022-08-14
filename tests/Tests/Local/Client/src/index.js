import {PathQLClientRequestHandler} from "../../../../../src/PathQL/Client/PathQLClientRequestHandler.class.js";

const client = new PathQLClientRequestHandler();
client.addEventListener("open", async function() {
  await client.getAllObjects();
});