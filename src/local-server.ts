import { listen } from 'config';
import { Observable } from 'rxjs';
import {
	Address,
	Authentication,
	AuthenticationResponse,
	Session,
	SMTPServer,
} from 'smtp-server';
import { NodeCallback } from './common';
import { Readable as Stream } from 'stream';

const server = new SMTPServer({
	...listen,
});

interface EventTypes {
	error: any;
	auth: [Authentication, Session, NodeCallback<AuthenticationResponse>];
	mailFrom: [Address, Session, NodeCallback<undefined>];
	connect: [Session, NodeCallback<undefined>];
	rcptTo: [Address, Session, NodeCallback<undefined>];
	data: [Stream, Session, NodeCallback<undefined>];
	close: undefined;
}
type EventObservables = { [K in keyof EventTypes]: Observable<EventTypes[K]> };

const events: (keyof EventTypes)[] = [
	'error',
	'auth',
	'mailFrom',
	'connect',
	'rcptTo',
	'data',
	'close',
];
const { error, auth, mailFrom, connect, rcptTo, data, close } = events.reduce(
	(observables, event) => {
		observables[event] = Observable.fromEvent(server, event);
		return observables;
	},
	({} as any) as EventObservables
);
