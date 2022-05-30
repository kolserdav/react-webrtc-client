/* eslint-disable import/prefer-default-export */
import { ServerMessageType } from "./enums";

export class ServerMessage {
	type: ServerMessageType = ServerMessageType.Initial;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	payload: any;

	src = '';
}
