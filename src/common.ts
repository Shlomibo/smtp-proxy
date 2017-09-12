export interface NodeCallback<T> {
	(error: any, value?: null): void;
	(error: null, value: T): void;
}
