/* eslint-disable camelcase */
import webRTCAdapter_import from "webrtc-adapter";

const webRTCAdapter: typeof webRTCAdapter_import =
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	webRTCAdapter_import.default || webRTCAdapter_import;

// eslint-disable-next-line import/prefer-default-export
export const Supports = new (class {
	readonly isIOS = ["iPad", "iPhone", "iPod"].includes(navigator.platform);

	readonly supportedBrowsers = ["firefox", "chrome", "safari"];

	readonly minFirefoxVersion = 59;

	readonly minChromeVersion = 72;

	readonly minSafariVersion = 605;

	// eslint-disable-next-line class-methods-use-this
	isWebRTCSupported(): boolean {
		return typeof RTCPeerConnection !== "undefined";
	}

	isBrowserSupported(): boolean {
		const browser = this.getBrowser();
		const version = this.getVersion();

		const validBrowser = this.supportedBrowsers.includes(browser);

		if (!validBrowser) return false;

		if (browser === "chrome") return version >= this.minChromeVersion;
		if (browser === "firefox") return version >= this.minFirefoxVersion;
		if (browser === "safari")
			return !this.isIOS && version >= this.minSafariVersion;

		return false;
	}

	// eslint-disable-next-line class-methods-use-this
	getBrowser(): string {
		return webRTCAdapter.browserDetails.browser;
	}

	// eslint-disable-next-line class-methods-use-this
	getVersion(): number {
		return webRTCAdapter.browserDetails.version || 0;
	}

	isUnifiedPlanSupported(): boolean {
		const browser = this.getBrowser();
		const version = webRTCAdapter.browserDetails.version || 0;

		if (browser === "chrome" && version < this.minChromeVersion) return false;
		if (browser === "firefox" && version >= this.minFirefoxVersion) return true;
		if (
			!window.RTCRtpTransceiver ||
			!("currentDirection" in RTCRtpTransceiver.prototype)
		)
			return false;

		let tempPc: RTCPeerConnection | null = null;
		let supported = false;

		try {
			tempPc = new RTCPeerConnection();
			tempPc.addTransceiver("audio");
			supported = true;
		} catch (e) {
			console.log(312312312312)
		} finally {
			if (tempPc) {
				tempPc.close();
			}
		}

		return supported;
	}

	toString(): string {
		return `Supports:
    browser:${this.getBrowser()}
    version:${this.getVersion()}
    isIOS:${this.isIOS}
    isWebRTCSupported:${this.isWebRTCSupported()}
    isBrowserSupported:${this.isBrowserSupported()}
    isUnifiedPlanSupported:${this.isUnifiedPlanSupported()}`;
	}
})();
