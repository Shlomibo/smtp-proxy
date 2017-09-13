import { Readable } from 'stream';
import { Observable, Observer } from 'rxjs';

export type Encoding = 'ascii' | 'utf8' | 'base64' | 'hex';

export function fromStream(stream: Readable): Observable<Buffer>;
export function fromStream(
	stream: Readable,
	encoding: Encoding
): Observable<string>;
export function fromStream(
	stream: Readable,
	encoding?: Encoding
): Observable<string | Buffer> {
	return Observable.create((obs: Observer<string | Buffer>) => {
		if (encoding !== undefined) {
			stream.setEncoding(encoding);
		}

		const error = Observable.fromEvent(stream, 'error').map(err => {
				throw err;
			}),
			end = Observable.fromEvent<any>(stream, 'end').publishReplay(),
			internalData = Observable.fromEvent<string | Buffer>(
				stream,
				'data'
			);

		// Make sure end events are attached first
		const cleanup = end.connect();

		return Observable.merge(internalData, error)
			.takeUntil(end)
			.subscribe(obs)
			.add(cleanup);
	});
}
