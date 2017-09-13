import { createTransport, Transporter } from 'nodemailer';
import { server as config } from 'config';

export interface ProxiedConnection {
	type: string;
	user?: string;
	pass?: string;
	[prop: string]: any;
}
export type TLSOptions = Record<string, any>;

export async function createTransporter(
	options: ProxiedConnection
): Promise<Transporter> {
	const transport = createTransport({
		...config,
		auth: {
			...options,
		},
	});
	await transport.verify();

	return transport;
}
