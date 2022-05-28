export interface AnswerOption {
	// eslint-disable-next-line @typescript-eslint/ban-types
	sdpTransform?: Function;
}

export interface PeerJSOption {
	key?: string;
	host?: string;
	port?: number;
	path?: string;
	secure?: boolean;
	token?: string;
	config?: RTCConfiguration;
	debug?: number;
	referrerPolicy?: ReferrerPolicy;
}

export interface PeerConnectOption {
	label?: string;
	metadata?: any;
	serialization?: string;
	reliable?: boolean;
}

export interface CallOption {
	metadata?: any;
	// eslint-disable-next-line @typescript-eslint/ban-types
	sdpTransform?: Function;
	connectionId?: string;
}
