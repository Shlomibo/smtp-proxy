declare module 'config' {
	interface ListeningConfiguration {
		secure: boolean;
		name?: string;
		authMethods?: string[];
	}
	interface ServerConfiguration {}

	export const listen: ListeningConfiguration, server: ServerConfiguration;
}
