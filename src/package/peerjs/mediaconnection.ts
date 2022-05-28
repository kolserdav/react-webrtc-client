/* eslint-disable class-methods-use-this */
import { util } from "./util";
import logger from "./logger";
import { Negotiator } from "./negotiator";
import {
	ConnectionType,
	ConnectionEventType,
	ServerMessageType,
} from "./enums";
import { Peer } from "./peer";
import { BaseConnection } from "./baseconnection";
import { ServerMessage } from "./servermessage";
import type { AnswerOption } from "./optionInterfaces";

/**
 * Wraps the streaming interface between two Peers.
 */
// eslint-disable-next-line import/prefer-default-export
export class MediaConnection extends BaseConnection {
	private static readonly ID_PREFIX = "mc_";

	private _negotiator: Negotiator | null = null;

	private _localStream: MediaStream | null = null;

	private _remoteStream: MediaStream | null = null;

	get type() {
		return ConnectionType.Media;
	}

	get localStream(): MediaStream | null {
		return this._localStream;
	}

	get remoteStream(): MediaStream | null {
		return this._remoteStream;
	}

	constructor(peerId: string, provider: Peer, options: any) {
		super(peerId, provider, options);

		this._localStream = this.options._stream;
		this.connectionId =
			this.options.connectionId ||
			MediaConnection.ID_PREFIX + util.randomToken();

		this._negotiator = new Negotiator(this, this.options.connectionId);


		if (this._localStream) {
			this._negotiator.startConnection({
				_stream: this._localStream,
				originator: true,
			});
		}
	}

	addStream(remoteStream: MediaStream, id: string) {
		logger.log("Receiving stream", remoteStream);

		this._remoteStream = remoteStream;
		super.emit(ConnectionEventType.Stream, remoteStream, id); // Should we call this `open`?
	}

	handleMessage(message: ServerMessage): void {
		const {type} = message;
		const {payload} = message;

		switch (message.type) {
			case ServerMessageType.Answer:
				// Forward to negotiator
				if (this._negotiator) {
					this._negotiator.handleSDP(type, payload.sdp);
					this._open = true;
				} else {
					logger.warn('Negotiator is null: 72');
				}
				break;
			case ServerMessageType.Candidate:
				if (this._negotiator) {
					this._negotiator.handleCandidate(payload.candidate);
				} else {
					logger.warn('Negotiator is null: 79');
				}
				break;
			default:
				logger.warn(`Unrecognized message type:${type} from peer:${this.peer}`);
				break;
		}
	}

	answer(stream: MediaStream | null, options: AnswerOption = {}): void {
		if (this._localStream) {
			logger.warn(
				"Local stream already exists on this MediaConnection. Are you answering a call twice?",
			);
			return;
		}

		this._localStream = stream;

		if (options && options.sdpTransform) {
			this.options.sdpTransform = options.sdpTransform;
		}

		if (this._negotiator) {
			this._negotiator.startConnection({
				...this.options._payload,
				_stream: stream,
			});
			if (this.provider) {
				// Retrieve lost messages stored because PeerConnection not set up.
				const messages = this.provider._getMessages(this.connectionId);
		
				for (const message of messages) {
					this.handleMessage(message);
				}
		
				this._open = true;
			} else {
				logger.warn('Provieder is null: 117');
			}
		} else {
			logger.warn('Negotiator is null: 116');
		}
	}

	/**
	 * Exposed functionality for users.
	 */

	/** Allows user to close connection. */
	close(): void {
		if (this._negotiator) {
			this._negotiator.cleanup();
			this._negotiator = null;
		}

		this._localStream = null;
		this._remoteStream = null;

		if (this.provider) {
			this.provider._removeConnection(this);

			this.provider = null;
		}

		if (this.options && this.options._stream) {
			this.options._stream = null;
		}

		if (!this.open) {
			return;
		}

		this._open = false;

		super.emit(ConnectionEventType.Close);
	}
}
