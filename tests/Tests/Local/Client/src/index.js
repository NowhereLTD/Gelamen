import {GelamenClientRequestHandler} from "../../../../../src/Gelamen/Client/GelamenClientRequestHandler.class.js";

const client = new GelamenClientRequestHandler();
client.addEventListener("open", async function() {
  await client.getAllObjects();
});