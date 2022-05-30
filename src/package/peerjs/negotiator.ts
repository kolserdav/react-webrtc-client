/* eslint-disable camelcase */
/* eslint-disable no-multi-assign */
/* eslint-disable no-param-reassign */
import { util } from "./util";
import logger from "./logger";
import { MediaConnection } from "./mediaconnection";
import { DataConnection } from "./dataconnection";
import {
	ConnectionType,
	PeerErrorType,
	ConnectionEventType,
	ServerMessageType,
} from "./enums";
import { BaseConnection } from "./baseconnection";

/**
 * Manages all negotiations between Peers.
 */
// eslint-disable-next-line import/prefer-default-export
export class Negotiator {
	id: string;

	constructor(readonly connection: BaseConnection, id: string) {
		this.id = id;
	}

	/** Returns a PeerConnection object set up correctly (for data, media). */
	startConnection(options: any) {
		const peerConnection = this._startPeerConnection();

		// Set the connection's PC.
		this.connection.peerConnection = peerConnection;

		if (this.connection.type === ConnectionType.Media && options._stream) {
			this._addTracksToConnection(options._stream, peerConnection);
		}

		// What do we need to do now?
		if (options.originator) {
			if (this.connection.type === ConnectionType.Data) {
				const dataConnection = <DataConnection>this.connection;

				const config: RTCDataChannelInit = { ordered: !!options.reliable };

				const dataChannel = peerConnection.createDataChannel(
					dataConnection.label,
					config,
				);
				dataConnection.initialize(dataChannel);
			}

			this._makeOffer();
		} else {
			this.handleSDP("OFFER", options.sdp);
		}
	}

	/** Start a PC. */
	private _startPeerConnection(): RTCPeerConnection {
		logger.log("Creating RTCPeerConnection.");

		const peerConnection = new RTCPeerConnection(
			this.connection.provider?.options?.config,
		);

		this._setupListeners(peerConnection);

		return peerConnection;
	}

	/** Set up various WebRTC listeners. */
	private _setupListeners(peerConnection: RTCPeerConnection) {
		const peerId = this.connection.peer;
		const {connectionId} = this.connection;
		const connectionType = this.connection.type;
		const {provider} = this.connection;

		// ICE CANDIDATES.
		logger.log("Listening for ICE candidates.");

		// eslint-disable-next-line no-param-reassign
		peerConnection.onicecandidate = (evt) => {
			if (!evt.candidate || !evt.candidate.candidate) return;

			logger.log(`Received ICE candidates for ${peerId}:`, evt.candidate);

			if (provider) {
				provider.socket.send({
					type: ServerMessageType.Candidate,
					payload: {
						candidate: evt.candidate,
						type: connectionType,
						connectionId,
					},
					dst: peerId,
				});
			} else {
				logger.warn('Provider is', provider);
			}
		};

		// eslint-disable-next-line no-param-reassign
		peerConnection.oniceconnectionstatechange = () => {
			switch (peerConnection.iceConnectionState) {
				case "failed":
					logger.log(
						`iceConnectionState is failed, closing connections to ${  peerId}`,
					);
					this.connection.emit(
						ConnectionEventType.Error,
						new Error(`Negotiation of connection to ${  peerId  } failed.`),
					);
					this.connection.close();
					break;
				case "closed":
					logger.log(
						`iceConnectionState is closed, closing connections to ${  peerId}`,
					);
					this.connection.emit(
						ConnectionEventType.Error,
						new Error(`Connection to ${  peerId  } closed.`),
					);
					this.connection.close();
					break;
				case "disconnected":
					logger.log(
						`iceConnectionState changed to disconnected on the connection with ${ 
							peerId}`,
					);
					this.connection.emit(
						ConnectionEventType.Disconnected,
						new Error(`Connection to ${  peerId  } disconnected.`),
					);
					this.connection.close();
					break;
				case "completed":
					// eslint-disable-next-line no-param-reassign
					peerConnection.onicecandidate = util.noop;
					break;
			}

			this.connection.emit(
				ConnectionEventType.IceStateChanged,
				peerConnection.iceConnectionState,
			);
		};

		// DATACONNECTION.
		logger.log("Listening for data channel");
		// Fired between offer and answer, so options should already be saved
		// in the options hash.
		peerConnection.ondatachannel = (evt) => {
			logger.log("Received data channel");

			const dataChannel = evt.channel;
			if (provider) {
				const connection = (
					provider.getConnection(peerId, connectionId)
				) as DataConnection;
	
				connection.initialize(dataChannel);
			} else {
				logger.warn('Provider is', provider);
			}
		};

		// MEDIACONNECTION.
		logger.log("Listening for remote stream");

		peerConnection.ontrack = (evt) => {
			logger.log("Received remote stream");

			const stream = evt.streams[0];
			if (provider) {
				const connection = provider.getConnection(peerId, connectionId);
				if (connection) {
					if (connection.type === ConnectionType.Media) {
						const mediaConnection = connection as MediaConnection;
	
						this._addStreamToMediaConnection(stream, mediaConnection);
					}
				} else {
					logger.warn('Connection is', provider);
				}
			} else {
				logger.warn('Provider is', provider);
			}
		};
	}

	cleanup(): void {
		logger.log(`Cleaning up PeerConnection to ${  this.connection.peer}`);

		const {peerConnection} = this.connection;

		if (!peerConnection) {
			return;
		}

		this.connection.peerConnection = null;

		// unsubscribe from all PeerConnection's events
		peerConnection.onicecandidate =
			peerConnection.oniceconnectionstatechange =
			peerConnection.ondatachannel =
			peerConnection.ontrack =
				() => {/** */};

		const peerConnectionNotClosed = peerConnection.signalingState !== "closed";
		let dataChannelNotClosed = false;

		if (this.connection.type === ConnectionType.Data) {
			const dataConnection = <DataConnection>this.connection;
			const {dataChannel} = dataConnection;

			if (dataChannel) {
				dataChannelNotClosed =
					!!dataChannel.readyState && dataChannel.readyState !== "closed";
			}
		}

		if (peerConnectionNotClosed || dataChannelNotClosed) {
			peerConnection.close();
		}
	}

	private async _makeOffer(): Promise<1 | 0> {
		const {peerConnection} = this.connection;
		const {provider} = this.connection;
		if (!peerConnection) {
			logger.warn('Peer connection is', peerConnection);
			return 1;
		}
		if (!provider) {
			logger.warn('Provider is', provider);
			return 1;
		}
		try {
			const offer = await peerConnection.createOffer(
				this.connection.options.constraints,
			);

			console.log(offer.sdp)

			logger.log("Created offer.");

			if (
				this.connection.options.sdpTransform &&
				typeof this.connection.options.sdpTransform === "function"
			) {
				offer.sdp =
					this.connection.options.sdpTransform(offer.sdp) || offer.sdp;
			}

			try {
				await peerConnection.setLocalDescription(offer);

				logger.log(
					"Set localDescription:",
					offer,
					`for:${this.connection.peer}`,
				);

				let payload: any = {
					sdp: offer,
					type: this.connection.type,
					connectionId: this.connection.connectionId,
					metadata: this.connection.metadata,
					browser: util.browser,
				};

				if (this.connection.type === ConnectionType.Data) {
					const dataConnection = <DataConnection>this.connection;

					payload = {
						...payload,
						label: dataConnection.label,
						reliable: dataConnection.reliable,
						serialization: dataConnection.serialization,
					};
				}

				provider.socket.send({
					type: ServerMessageType.Offer,
					payload,
					dst: this.connection.peer,
				});
			} catch (err) {
				// TODO: investigate why _makeOffer is being called from the answer
				if (
					err !=
					"OperationError: Failed to set local offer sdp: Called in wrong state: kHaveRemoteOffer"
				) {
					provider.emitError(PeerErrorType.WebRTC, err as Error);
					logger.warn("Failed to setLocalDescription, ", err);
				}
			}
		} catch (err_1) {
			provider.emitError(PeerErrorType.WebRTC, err_1 as Error);
			logger.warn("Failed to createOffer, ", err_1);
		}
		return 0;
	}

	private async _makeAnswer(): Promise<1 | 0> {
		const {peerConnection} = this.connection;
		const {provider} = this.connection;
		if (!peerConnection) {
			logger.warn('Peer connection is', peerConnection);
			return 1;
		}
		if (!provider) {
			logger.warn('Provider is', provider);
			return 1;
		}
		try {
			const answer = await peerConnection.createAnswer();
			logger.log("Created answer.");

			if (
				this.connection.options.sdpTransform &&
				typeof this.connection.options.sdpTransform === "function"
			) {
				answer.sdp =
					this.connection.options.sdpTransform(answer.sdp) || answer.sdp;
			}

			try {
				await peerConnection.setLocalDescription(answer);

				logger.log(
					`Set localDescription:`,
					answer,
					`for:${this.connection.peer}`,
				);

				provider.socket.send({
					type: ServerMessageType.Answer,
					payload: {
						sdp: answer,
						type: this.connection.type,
						connectionId: this.connection.connectionId,
						browser: util.browser,
					},
					dst: this.connection.peer,
				});
			} catch (err) {
				provider.emitError(PeerErrorType.WebRTC, err as Error);
				logger.warn("Failed to setLocalDescription, ", err);
			}
		} catch (err_1) {
			provider.emitError(PeerErrorType.WebRTC, err_1 as Error);
			logger.warn("Failed to create answer, ", err_1);
		}
		return 0;
	}

	/** Handle an SDP. */
	async handleSDP(type: string, sdp: any): Promise<1 | 0> {
		sdp = new RTCSessionDescription(sdp);
		const {peerConnection} = this.connection;
		const {provider} = this.connection;

		logger.log("Setting remote description", sdp);

		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this;

		if (!peerConnection) {
			logger.warn('Peer connection is', peerConnection);
			return 1;
		}
		if (!provider) {
			logger.warn('Provider is', provider);
			return 1;
		}

		try {
			await peerConnection.setRemoteDescription(sdp);
			logger.log(`Set remoteDescription:${type} for:${this.connection.peer}`);
			if (type === "OFFER") {
				await self._makeAnswer();
			}
		} catch (err) {
			provider.emitError(PeerErrorType.WebRTC, err as Error);
			logger.warn("Failed to setRemoteDescription, ", err);
		}
		return 0;
	}

	/** Handle a candidate. */
	async handleCandidate(ice: any): Promise<1 | 0> {
		logger.log(`handleCandidate:`, ice);

		const {candidate} = ice;
		const {sdpMLineIndex} = ice;
		const {sdpMid} = ice;
		const {peerConnection} = this.connection;
		const {provider} = this.connection;

		if (!peerConnection) {
			logger.warn('Peer connection is', peerConnection);
			return 1;
		}
		if (!provider) {
			logger.warn('Provider is', provider);
			return 1;
		}

		try {
			await peerConnection.addIceCandidate(
				new RTCIceCandidate({
					sdpMid,
					sdpMLineIndex,
					candidate,
				}),
			);
			logger.log(`Added ICE candidate for:${this.connection.peer}`);
		} catch (err) {
			provider.emitError(PeerErrorType.WebRTC, err as Error);
			logger.warn("Failed to handleCandidate, ", err);
		}
		return 0;
	}

	// eslint-disable-next-line class-methods-use-this
	private _addTracksToConnection(
		stream: MediaStream,
		peerConnection: RTCPeerConnection,
	): void {
		logger.log(`add tracks from stream ${stream.id} to peer connection`);

		if (!peerConnection.addTrack) {
			logger.error(
				`Your browser does't support RTCPeerConnection#addTrack. Ignored.`,
			);
		}

		stream.getTracks().forEach((track) => {
			peerConnection.addTrack(track, stream);
		});
	}

	// eslint-disable-next-line class-methods-use-this
	private _addStreamToMediaConnection(
		stream: MediaStream,
		mediaConnection: MediaConnection,
	): void {
		logger.log(
			`add stream ${stream.id} to media connection ${mediaConnection.connectionId}`,
		);

		mediaConnection.addStream(stream, this.id);
	}
}
