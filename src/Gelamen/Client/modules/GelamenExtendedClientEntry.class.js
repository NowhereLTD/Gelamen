import {GelamenClientEntry} from "../GelamenClientEntry.class.js";
import * as openpgp from "../../../lib/openpgp.js";

/**
 * This inits an extended GelamenClient Entry which can also handle encryption et al via default.
 * @argument options - contains an specific options field, with informations about the fields and so on.
 */
export class GelamenExtendedClientEntry extends GelamenClientEntry {
	constructor(options = {}) {
		super(options);
	}

	/**
	 * This methods generate pgp keys for the communication with other clients.
	 * The user holds an password and a pin the password is typical an user password, which is used to login an user to the server
	 * The pin is an alternative only client side param
	 * @param {*} user
	 */
	generateUserKeys(user) {
		const keys = this.generateKeys(user);
		const privKeyEncrypt = this.encrypt(keys.privateKey, user.pin);
		const revokeCertEncrypt = this.encrypt(keys.revocationCertificate, user.pin);
		return {
			privateKeyEncrypt: privKeyEncrypt,
			publicKey: keys.publicKey,
			revocationCertificateEncrypt: revokeCertEncrypt,
			privateKey: keys.privateKey,
			revocationCertificate: keys.revocationCertificate
		};
	}

	/**
	 * Encrypt an text based on an password
	 * @param {*} text 
	 * @param {*} password 
	 * @returns 
	 */
	static async encrypt(text, password) {
		const encoder = new TextEncoder();
		const decoder = new TextDecoder();
		const message = await openpgp.createMessage({binary: encoder.encode(text)});
		const encrypted = await openpgp.encrypt({
			message,
			passwords: [password],
			format: "binary"
		});
		const decryptText = decoder.decode(encrypted);
		return decryptText;
	}

	/**
	 * Decrypt an text, based on a password
	 * @param {*} text 
	 * @param {*} password 
	 * @returns 
	 */
	static async decrypt(text, password) {
		const _encoder = new TextEncoder();
		const decoder = new TextDecoder();
		const encrypted = decoder.decode(text);
		const encryptedMessage = await openpgp.readMessage({
			binaryMessage: encrypted
		});
		const {data: decrypted} = await openpgp.decrypt({
			message: encryptedMessage,
			passwords: [password],
			format: 'binary'
		});
		const decryptText = decoder.decode(decrypted);
		return decryptText;
	}

	/**
	 * Generate password based key
	 * @param {*} user 
	 * @param {*} password 
	 * @returns 
	 */
	static async generateKeys(user) {
		const {privateKey, publicKey, revocationCertificate} = await openpgp.generateKey({
			type: "ecc",
			curve: "curve25519",
			userIDs: [{email: user.email}],
			passphrase: user.keyPassword,
			format: "armored"
		});
		return {privateKey: privateKey, publicKey: publicKey, revocationCertificate: revocationCertificate};
	}

	/**
	 * Read a private key as object
	 * @param {*} privateKey 
	 * @param {*} password 
	 * @returns 
	 */
	static async readPrivateKey(privateKey, password) {
		const privateCacheKey = await openpgp.decryptKey({
			privateKey: await openpgp.readPrivateKey({armoredKey: privateKey}),
			password
		});
		return privateCacheKey;
	}

	static async readPublicKey(publicKey) {
		const publicCacheKey = await openpgp.readKey({armoredKey: publicKey});
		return publicCacheKey;
	}

	/**
	 * Encryt data with private and public key
	 * @param {*} publicKeys 
	 * @param {*} privateKey 
	 * @param {*} data 
	 * @returns 
	 */
	static async encryptWithKeys(publicKeys, privateKey, data) {
		const encrypted = await openpgp.encrypt({
			message: await openpgp.createMessage({text: data}),
			encryptionKeys: publicKeys,
			signingKeys: privateKey
		});
		return encrypted;
	}

	/**
	 * Decrypt data based on public key
	 * @param {*} privateKey 
	 * @param {*} publicKeys 
	 * @param {*} data 
	 * @returns 
	 */
	static async decryptWithKeys(privateKey, publicKeys, data) {
		const message = await openpgp.readMessage({
			armoredMessage: data
		});
		const {data: decrypted, signatures} = await openpgp.decrypt({
			message,
			verificationKeys: publicKeys,
			decryptionKeys: privateKey
		});
		try {
			await signatures[0].verified;
			return decrypted;
		} catch(e) {
			throw new Error('Signature could not be verified: ' + e.message);
		}
	}
}