

import  getGraphClient from '@/app/db'
import { MailFolder, Message } from '@microsoft/microsoft-graph-types';
import { removeSpacesFromFolderName } from './utils';

export type Folder = {
  id: string;
  name: string;
  email_count: string;
};

export async function getFoldersWithEmailCount() {
    const client = await getGraphClient();
  
    const response = await client
      .api('/me/mailFolders')
      .get();
  
    console.log(response);
  
    // convert the response to the format we need
    const folders: MailFolder[] = response.value


  // let specialFoldersOrder = ['Inbox', 'Drafts', 'Deleted Items'];
  // let specialFolders = specialFoldersOrder
  //   .map((name) => folders.find((folder) => folder.name === name))
  //   .filter(Boolean) as Folder[];
  // let otherFolders = folders.filter(
  //   (folder) => !specialFoldersOrder.includes(folder.name)
  // ) as Folder[];

  return folders;
}

type EmailWithSender = {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  sent_date: Date;
  first_name: string;
  last_name: string;
  email: string;
};

export async function getEmailsForFolder(folderName: string, search?: string) {
  // Authentication setup should be done outside this function and passed in if needed
  const client = await getGraphClient();

// remove spaces in folder name
  let originalFolderName = removeSpacesFromFolderName(folderName);

  let endpoint = `/me/mailFolders/${originalFolderName}/messages`;
  let queryParams = new Array<string>();

  // Add search filter if provided
  // if (search) {
  //   const searchFilter = `(from/emailAddress/name contains '${search}' or from/emailAddress/address contains '${search}' or subject contains '${search}' or body contains '${search}')`;
  //   queryParams.push(`$filter=${encodeURIComponent(searchFilter)}`);
  // }

  // // Add sorting
  // queryParams.push("$orderby=sentDateTime desc");

  // Select specific fields
//  queryParams.push("$select=id,subject,body,sentDateTime,from,toRecipients");

  // Combine query parameters
  // if (queryParams.length > 0) {
  //   endpoint += "?" + queryParams.join("&");
  // }

  try {
      const response = await client.api(endpoint).get();
      const graphEmails: Message[] = response.value;
      // Transform the Graph API response to match the EmailWithSender type
      const emails: EmailWithSender[] = graphEmails.map((email: Message) => ({
        id: email.id || "",  // Graph API uses string IDs, so we parse to int
        sender_id: email.from?.emailAddress?.address || "",  // We don't have this info from Graph API
        recipient_id: email.toRecipients && email.toRecipients.length > 0 ? email.toRecipients[0].emailAddress?.address || "" : "",  // We don't have this info from Graph API
        subject: email.subject || "",
        body: email.body?.content || "",
        sent_date: email?.sentDateTime ? new Date(email.sentDateTime) : new Date(),
        first_name: email.from?.emailAddress?.name || "", // .split(' ')[0],
        last_name: email.from?.emailAddress?.name || "", // .split(' ').slice(1).join(' '),
        email: email.from?.emailAddress?.address || ""
      }));
  
      return emails;
    } catch (error) {
      console.error("Error fetching emails:", error);
      throw error;
    }
}

// Helper function to convert string to title case
// function toTitleCase(str: string): string {
//   return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
// }


export async function getEmailInFolder(folderName: string, emailId: string) {
  const client = await getGraphClient();

  let originalFolderName = removeSpacesFromFolderName(folderName);
  let endpoint = `/me/mailFolders/${originalFolderName}/messages/${emailId}`;

    const response = await client.api(endpoint)
    .get();
   //   .select('id,subject,body,sentDateTime,from,toRecipients')

    // Transform the Graph API response to match the EmailWithSender type
    const email: EmailWithSender = {
      id: response.id,
      sender_id: response.from.emailAddress.address, // We don't have this info from Graph API
      recipient_id: response.toRecipients[0].emailAddress.address, // We don't have this info from Graph API
      subject: response.subject,
      body: response.body.content,
      sent_date: new Date(response.sentDateTime),
      first_name: response.from.emailAddress.name.split(' ')[0],
      last_name: response.from.emailAddress.name.split(' ').slice(1).join(' '),
      email: response.from.emailAddress.address
    };

    return email;
}

type UserEmail = {
  first_name: string;
  last_name: string;
  email: string;
};

export async function getAllEmailAddresses(): Promise<UserEmail[]> {
  const client = await getGraphClient();

  try {
    const response = await client.api('/users')
      .get();

    // Transform the Graph API response to match the UserEmail type
    const userEmails: UserEmail[] = response.value.map((user: any) => ({
      first_name: user.givenName,
      last_name: user.surname,
      email: user.mail
    }));

    return userEmails;
  } catch (error) {
    console.error("Error fetching email addresses:", error);
    throw error;
  }
}

