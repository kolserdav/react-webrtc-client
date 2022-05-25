import { ServerMessageType } from "./enums";

export class ServerMessage {
	type: ServerMessageType = ServerMessageType.Initial;
	payload: any;
	src: string = '';
}
