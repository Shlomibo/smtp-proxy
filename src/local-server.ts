import { listen, ListeningConfiguration } from 'config';
import { Observable, Observer, Subject } from 'rxjs';
import { Readable as Stream } from 'stream';
import { NodeCallback } from './common';
import { Transporter } from 'nodemailer';
import {
	Authentication,
	AuthenticationResponse,
	Session,
	SMTPServer,
} from 'smtp-server';
import { createTransporter } from './remote-transporter';

function selectEvent<Event extends keyof EventTypes>(event: Event) {
	return (source: Observable<SmtpEvent<Event>>) =>
		source
			.filter(({ event: eventType }) => event === eventType)
			.map(({ data }) => data);
}

const server = createServer(listen).share(),
	auth = server.let(selectEvent('auth')),
	data = server.let(selectEvent('data')),
	started = server.let(selectEvent('started'));

const connectionsHandling = new Subject<SessionsUpdate>(),
	connections = connectionsHandling
		.scan((connections, update) => update(connections), {} as Sessions)
		.startWith({} as Sessions)
		// Make sure the started has fired
		.combineLatest(started, sessions => sessions)
		.share();

const incommingConnections: Observable<SessionsUpdate> = auth
	.map(([ auth, session, callback
	]) => ({
		auth,
		session,
		callback,
	}))
	.mergeMap(({ auth, session, callback }) => {
		const {
			username: user,
			method: type,
			password: pass,
			validatePassword,
			...authOptions,
		} = auth;

		return Observable.fromPromise(
			createTransporter({
				...authOptions,
				user,
				pass,
				type,
			})
		)
			.catch(err => {
				callback(err);
				return Observable.empty<never>();
			})
			.map(transporter => {
				callback(null);
				return (sessions: Sessions) => ({
					...sessions,
					[session.id]: {
						session,
						transporter,
					},
				});
			});
	})
	.multicast(connectionsHandling)
	.refCount();

const messages = data.withLatestFrom(connections, ([ stream, session, callback
], connections) => ({
	stream,
	session,
	callback,
	connections,
}));

interface EventTypes {
	[key: string]: any;
	started: any;
	auth: [Authentication, Session, NodeCallback<AuthenticationResponse>];
	connect: [Session, NodeCallback<undefined>];
	data: [Stream, Session, NodeCallback<undefined>];
}
export interface SmtpEvent<T extends keyof EventTypes> {
	event: T;
	data: EventTypes[T];
}

function createServer({
	port,
	...config,
}: ListeningConfiguration): Observable<SmtpEvent<keyof EventTypes>> {
	return Observable.create(
		(observer: Observer<SmtpEvent<keyof EventTypes>>) => {
			const server = new SMTPServer({
				...config,
				onAuth: (auth, session, callback) =>
					observer.next({
						event: 'auth',
						data: [
							auth,
							session,
							callback,
						],
					}),
				onConnect: (session, callback) =>
					observer.next({
						event: 'connect',
						data: [
							session,
							callback,
						],
					}),
				onData: (stream, session, callback) =>
					observer.next({
						event: 'data',
						data: [
							stream,
							session,
							callback,
						],
					}),
			});

			const close = Observable.fromEvent(server, 'close').first(),
				error = Observable.fromEvent(server, 'error');

			const cleanup = error
				.subscribe(err => observer.error(err))
				.add(() => server.close(err => !!err && observer.error(err)))
				.add(close.subscribe(() => observer.complete()));

			server.listen(
				port,
				(err: any) =>
					!!err
						? observer.error(err)
						: observer.next({
								event: 'started',
								data: undefined,
							})
			);

			return cleanup;
		}
	);
}

interface Sessions {
	[sessionId: string]: {
		session: Session;
		transporter: Transporter;
	};
}
type SessionsUpdate = (sessions: Sessions) => Sessions;
