import 'server-only'
import { Client } from '@microsoft/microsoft-graph-client';
import { auth, EnrichedSession } from '../auth'; // Replace './auth' with the correct path to the file containing the EnrichedSession type
import { Message } from '@microsoft/microsoft-graph-types';


export default async function getGraphClient() {
    const session = (await auth()) as EnrichedSession;
    const accessToken = session?.accessToken;

    const client = Client.init({
        authProvider: (done) => done(null, accessToken),
    });

    return client;
}

