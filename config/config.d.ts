declare module 'config' {
	interface ListeningConfiguration {
		port: number;
		name?: string;
		authMethods?: string[];
	}
	interface ServerConfiguration {
		port: number;
		host: string;
		secure: boolean;
	}

	export const listen: ListeningConfiguration, server: ServerConfiguration;
}
