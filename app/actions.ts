'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { kv } from '@vercel/kv'

import { auth, EnrichedSession } from '@/auth'
import { type Chat } from '@/lib/types'
import { TodoTask, TodoTaskList, Message, MailFolder } from '@microsoft/microsoft-graph-types'
import  getGraphClient from '@/app/db'
import { OptimisticTask, Mail } from '@/types'

export async function getChats(userId?: string | null) {
  const session = (await auth()) as EnrichedSession;

  if (!userId) {
    return []
  }

  if (userId !== session.userId) {
    return {
      error: 'Unauthorized'
    }
  }

  try {
    const pipeline = kv.pipeline()
    const chats: string[] = await kv.zrange(`user:chat:${userId}`, 0, -1, {
      rev: true
    })

    for (const chat of chats) {
      pipeline.hgetall(chat)
    }

    const results = await pipeline.exec()

    return results as Chat[]
  } catch (error) {
    return []
  }
}

export async function getChat(id: string, userId: string) {
  const session = (await auth()) as EnrichedSession;

  if (userId !== session.userId) {
    return {
      error: 'Unauthorized'
    }
  }

  const chat = await kv.hgetall<Chat>(`chat:${id}`)

  if (!chat || (userId && chat.userId !== userId)) {
    return null
  }

  return chat
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  const session = (await auth()) as EnrichedSession;

  if (!session) {
    return {
      error: 'Unauthorized'
    }
  }

  // Convert uid to string for consistent comparison with session.userId
  const uid = String(await kv.hget(`chat:${id}`, 'userId'))

  if (uid !== session.userId) {
    return {
      error: 'Unauthorized'
    }
  }

  await kv.del(`chat:${id}`)
  await kv.zrem(`user:chat:${session.userId}`, `chat:${id}`)

  revalidatePath('/')
  return revalidatePath(path)
}

export async function clearChats() {
  const session = (await auth()) as EnrichedSession;

  if (!session.userId) {
    return {
      error: 'Unauthorized'
    }
  }

  const chats: string[] = await kv.zrange(`user:chat:${session.userId}`, 0, -1)
  if (!chats.length) {
    return redirect('/')
  }
  const pipeline = kv.pipeline()

  for (const chat of chats) {
    pipeline.del(chat)
    pipeline.zrem(`user:chat:${session.userId}`, chat)
  }

  await pipeline.exec()

  revalidatePath('/')
  return redirect('/')
}

export async function getSharedChat(id: string) {
  const chat = await kv.hgetall<Chat>(`chat:${id}`)

  if (!chat || !chat.sharePath) {
    return null
  }

  return chat
}

export async function shareChat(id: string) {
  const session = (await auth()) as EnrichedSession;

  if (!session.userId) {
    return {
      error: 'Unauthorized'
    }
  }

  const chat = await kv.hgetall<Chat>(`chat:${id}`)

  if (!chat || chat.userId !== session.userId) {
    return {
      error: 'Something went wrong'
    }
  }

  const payload = {
    ...chat,
    sharePath: `/share/${chat.id}`
  }

  await kv.hmset(`chat:${chat.id}`, payload)

  return payload
}

export async function saveChat(chat: Chat) {
  const session = (await auth()) as EnrichedSession;

  if (session && session.user) {
    const pipeline = kv.pipeline()
    pipeline.hmset(`chat:${chat.id}`, chat)
    pipeline.zadd(`user:chat:${chat.userId}`, {
      score: Date.now(),
      member: `chat:${chat.id}`
    })
    await pipeline.exec()
  } else {
    return
  }
}

export async function refreshHistory(path: string) {
  redirect(path)
}

export async function getMissingKeys() {
  const keysRequired = ['OPENAI_API_KEY']
  return keysRequired
    .map(key => (process.env[key] ? '' : key))
    .filter(key => key !== '')
}

export async function getTasks(listId: string = "AAMkADhmYjY3M2VlLTc3YmYtNDJhMy04MjljLTg4NDI0NzQzNjJkMAAuAAAAAAAqiN_iXOf5QJoancmiEuQzAQAVAdL-uyq-SKcP7nACBA3lAAAAO9QQAAA=", taskIds?: string[]): Promise<TodoTask[]> {
  const client = await getGraphClient();
  
  const response = await client
    .api(`/me/todo/lists/${listId}/tasks`)
    .get();
  
  console.log(response);

  let tasks: TodoTask[] = response.value;

  if (taskIds && taskIds.length > 0) {
    tasks = tasks.filter(task => taskIds.includes(task.id as string));
  }

  return tasks;
}

export async function getLists() {
  const client = await getGraphClient();
  const response = await client
    .api(`/me/todo/lists`)
    .get();

    console.log(response);

  const lists: TodoTaskList[] = await response.value;

  return lists;
}


export async function addTasks(listId: string = "AAMkADhmYjY3M2VlLTc3YmYtNDJhMy04MjljLTg4NDI0NzQzNjJkMAAuAAAAAAAqiN_iXOf5QJoancmiEuQzAQAVAdL-uyq-SKcP7nACBA3lAAAAO9QQAAA=", tasks: string[]): Promise<TodoTask[]> {
  const client = await getGraphClient();
  let addedTasks: TodoTask[] = [];

  if (tasks.length < 2) {
    const todoTask = { title: tasks[0] };
    const singleTaskResponse = await client
      .api(`/me/todo/lists/${listId}/tasks`)
      .post(todoTask);

    addedTasks.push({
      id: singleTaskResponse.id,
      title: singleTaskResponse.title,
      status: singleTaskResponse.status,
      createdDateTime: singleTaskResponse.createdDateTime,
      lastModifiedDateTime: singleTaskResponse.lastModifiedDateTime,
      importance: singleTaskResponse.importance,
      isReminderOn: singleTaskResponse.isReminderOn,
      hasAttachments: singleTaskResponse.hasAttachments,
      categories: singleTaskResponse.categories,
      body: {
        content: singleTaskResponse.body.content,
        contentType: singleTaskResponse.body.contentType,
      },
    });
  } else {
    const batchRequestBody = {
      requests: tasks.map((task, index) => ({
        id: index.toString(),
        method: "POST",
        url: `/me/todo/lists/${listId}/tasks`,
        headers: {
          "Content-Type": "application/json"
        },
        body: { title: task }
      }))
    };

    const batchResponse = await client
      .api('/$batch')
      .post(batchRequestBody);

    const responses = batchResponse.responses;
    addedTasks = responses
      .filter((res: any) => res.status === 201) // Only include successfully created tasks
      .map((res: any) => ({
        id: res.body.id,
        title: res.body.title,
        status: res.body.status,
        createdDateTime: res.body.createdDateTime,
        lastModifiedDateTime: res.body.lastModifiedDateTime,
        importance: res.body.importance,
        isReminderOn: res.body.isReminderOn,
        hasAttachments: res.body.hasAttachments,
        categories: res.body.categories,
        body: {
          content: res.body.body.content,
          contentType: res.body.body.contentType,
        },
      }));
  }

  revalidatePath('/');
  console.log(addedTasks);
  return addedTasks;
}


export async function deleteTasks(listId: string = "AAMkADhmYjY3M2VlLTc3YmYtNDJhMy04MjljLTg4NDI0NzQzNjJkMAAuAAAAAAAqiN_iXOf5QJoancmiEuQzAQAVAdL-uyq-SKcP7nACBA3lAAAAO9QQAAA=", taskIds: string[]) {

  const client = await getGraphClient();

if (taskIds.length > 0) {

  await client
    .api(`/me/todo/lists/${listId}/tasks/${taskIds[0]}`)
    .delete();
}

else {

  const batchRequestBody = {
    requests: taskIds.map((taskId, index) => ({
      id: index.toString(),
      method: "DELETE",
      url: `/me/todo/lists/${listId}/tasks/${taskId}`,
      headers: {
        "Content-Type": "application/json"
      }
    }))
  };

  await client
  .api('/$batch')
  .post(batchRequestBody);
}

revalidatePath('/');
}


export async function getEmails(emailIds?: string[]): Promise<Mail[]> {
  const client = await getGraphClient();

  const response = await client
    .api('/me/messages')
    .select('id,subject,bodyPreview,receivedDateTime,isRead,from')
    .top(100)
    .get();

  console.log(response);

  let emails: Mail[] = response.value.map((message: any) => ({
    id: message.id,
    name: message.from.emailAddress.name,
    email: message.from.emailAddress.address,
    subject: message.subject,
    text: message.bodyPreview,
    date: message.receivedDateTime,
    read: message.isRead,
    labels: [], // Labels would need additional logic or a different API call to retrieve
  }));

  if (emailIds && emailIds.length > 0) {
    emails = emails.filter(email => emailIds.includes(email.id));
  }

  return emails;
}


// function to get email folders
export async function getEmailFolders(): Promise<MailFolder[]> {
  const client = await getGraphClient();

  const response = await client
    .api('/me/mailFolders')
    .get();

  console.log(response);

  return response.value;
}

export async function getMessagesForFolder(folderName: string, folderId: string): Promise<Mail[]>  {
  const client = await getGraphClient();
  const response = await client.api(`/me/mailFolders/${folderId}/messages`)
    .select('subject,from,receivedDateTime,bodyPreview')
    .top(50)
    .get();
  
    let emails: Mail[] = response.value.map((message: any) => ({
      id: message.id,
      name: message.from.emailAddress.name,
      email: message.from.emailAddress.address,
      subject: message.subject,
      text: message.bodyPreview,
      date: message.receivedDateTime,
      read: message.isRead,
      labels: [], // Labels would need additional logic or a different API call to retrieve
    }));
  
    return emails;
}


export async function getExcelEmbedUrl(){
  return "https://pittampalli-my.sharepoint.com/:x:/p/vinod/EVX_ru95pHZAuRuHvf43wtYBB9NcIz0dm7yw2oVpR26OcA?e=Krk5dJ&action=embedview&wdAllowInteractivity=True&wdbipreview=True"
}

  // export async function deleteAction(listId: string, taskId: string) {
  //   const client = await getGraphClient();
  
  //   await client.api(`/me/todo/lists/${listId}/tasks/${taskId}`)
  //     .delete();
  
  //   revalidatePath('/');
  // }
  