import { Transport } from 'nodemailer';

export interface ProxiedConnection {}

export function createTransporter({  }: ProxiedConnection): Transport {}
