// Types aren’t accurate
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import BinaryPack from "peerjs-js-binarypack";
import { Supports } from "./supports";

export interface UtilSupportsObj {
	browser: boolean;
	webRTC: boolean;
	audioVideo: boolean;
	data: boolean;
	binaryBlob: boolean;
	reliable: boolean;
}

const DEFAULT_CONFIG = {
	iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
	sdpSemantics: "unified-plan",
};

class Util {
	// eslint-disable-next-line class-methods-use-this
	noop(): void {/** */}

	readonly CLOUD_HOST = "/";

	readonly CLOUD_PORT = 443;

	// Browsers that need chunking:
	readonly chunkedBrowsers = { Chrome: 1, chrome: 1 };

	readonly chunkedMTU = 16300; // The original 60000 bytes setting does not work when sending data from Firefox to Chrome, which is "cut off" after 16384 bytes and delivered individually.

	// Returns browser-agnostic default config
	readonly defaultConfig = DEFAULT_CONFIG;

	readonly browser = Supports.getBrowser();

	readonly browserVersion = Supports.getVersion();

	// Lists which features are supported
	readonly supports = (function () {
		const supported: UtilSupportsObj = {
			browser: Supports.isBrowserSupported(),
			webRTC: Supports.isWebRTCSupported(),
			audioVideo: false,
			data: false,
			binaryBlob: false,
			reliable: false,
		};

		if (!supported.webRTC) return supported;

		let pc: RTCPeerConnection | null = null;

		try {
			pc = new RTCPeerConnection(DEFAULT_CONFIG);

			supported.audioVideo = true;

			let dc: RTCDataChannel | null = null;

			try {
				dc = pc.createDataChannel("_PEERJSTEST", { ordered: true });
				supported.data = true;
				supported.reliable = !!dc.ordered;

				// Binary test
				try {
					dc.binaryType = "blob";
					supported.binaryBlob = !Supports.isIOS;
				} catch (e) {/** */}
			} catch (e) {
				/** */
			} finally {
				if (dc) {
					dc.close();
				}
			}
		} catch (e) {
			/** */
		} finally {
			if (pc) {
				pc.close();
			}
		}

		return supported;
	})();

	// Ensure alphanumeric ids
	// eslint-disable-next-line class-methods-use-this
	validateId(id: string): boolean {
		// Allow empty ids
		return !id || /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/.test(id);
	}

	pack = BinaryPack.pack;

	unpack = BinaryPack.unpack;

	// Binary stuff

	private _dataCount = 1;

	chunk(
		blob: Blob,
	): { __peerData: number; n: number; total: number; data: Blob }[] {
		const chunks = [];
		const {size} = blob;
		const total = Math.ceil(size / util.chunkedMTU);

		let index = 0;
		let start = 0;

		while (start < size) {
			const end = Math.min(size, start + util.chunkedMTU);
			const b = blob.slice(start, end);

			const chunk = {
				__peerData: this._dataCount,
				n: index,
				data: b,
				total,
			};

			chunks.push(chunk);

			start = end;
			index++;
		}

		this._dataCount++;

		return chunks;
	}

	// eslint-disable-next-line class-methods-use-this
	blobToArrayBuffer(
		blob: Blob,
		cb: (arg: ArrayBuffer | null) => void,
	): FileReader {
		const fr = new FileReader();

		fr.onload = function (evt) {
			if (evt.target) {
				cb(evt.target.result as ArrayBuffer);
			}
		};

		fr.readAsArrayBuffer(blob);

		return fr;
	}

	// eslint-disable-next-line class-methods-use-this
	binaryStringToArrayBuffer(binary: string): ArrayBuffer | SharedArrayBuffer {
		const byteArray = new Uint8Array(binary.length);

		for (let i = 0; i < binary.length; i++) {
			// eslint-disable-next-line no-bitwise
			byteArray[i] = binary.charCodeAt(i) & 0xff;
		}

		return byteArray.buffer;
	}

	// eslint-disable-next-line class-methods-use-this
	randomToken(): string {
		return Math.random().toString(36).slice(2);
	}

	// eslint-disable-next-line class-methods-use-this
	isSecure(): boolean {
		// eslint-disable-next-line no-restricted-globals
		return location.protocol === "https:";
	}
}
export const util = new Util();
