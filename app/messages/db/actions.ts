'use server';


import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import getGraphClient from "@/app/db";
import { removeSpacesFromFolderName } from './utils';

let schema = z.object({
  subject: z.string(),
  email: z.string().email(),
  body: z.string(),
});



// Assuming we have an auth provider set up
export async function sendEmail(formData: FormData) {
  const client = await getGraphClient();

  let parsed = schema.parse({
    subject: formData.get('subject'),
    email: formData.get('email'),
    body: formData.get('body'),
  });

  try {
    const message = {
      subject: parsed.subject,
      body: {
        contentType: "Text",
        content: parsed.body
      },
      toRecipients: [
        {
          emailAddress: {
            address: parsed.email
          }
        }
      ]
    };

    const response = await client.api('/me/sendMail')
      .post({ message });

    // Get the message ID of the sent email
    const sentItems = await client.api('/me/mailFolders/SentItems/messages')
      .orderby('sentDateTime desc')
      .top(1)
      .get();

    const newEmailId = sentItems.value[0].id;

    revalidatePath('/', 'layout'); // Revalidate all data
    redirect(`/f/sent?id=${newEmailId}`);
  } catch (error) {
    console.error('Failed to send email: ', error);
    // Handle error appropriately
  }
}

export async function deleteEmail(folderName: string, emailId: string) {
  const client = await getGraphClient();

  let originalFolderName = removeSpacesFromFolderName(folderName);

  try {
    // Move the email to the Deleted Items folder
    await client.api(`/me/mailFolders/${originalFolderName}/messages/${emailId}/move`)
      .post({
        destinationId: "deleteditems"
      });

    revalidatePath('/', 'layout'); // Revalidate all data
    redirect(`/f/${folderName}`);
  } catch (error) {
    console.error('Failed to delete email: ', error);
    // Handle error appropriately
  }
}