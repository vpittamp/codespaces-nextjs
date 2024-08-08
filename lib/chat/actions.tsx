import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { openai } from '@ai-sdk/openai'

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage} from '@/components/stocks'

import { z } from 'zod'
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { addTasks, deleteTasks, getEmails, getTasks, saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat, Message } from '@/lib/types'
import { auth, EnrichedSession } from '@/auth'
import WeatherCard from '@/components/weather/weather'
import { TodoList } from '@/components/tasks/tasks'
import Search from '@/components/search'
import { Mail as MailType, OptimisticTask } from '@/types'
import { Mail } from '@/components/mail/components/mail'
import { accounts } from '@/components/mail/data'
import { TaskComboboxForm } from '@/components/tasks/tasks-combobox-form'

async function confirmPurchase(symbol: string, price: number, amount: number) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const purchasing = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Purchasing {amount} ${symbol}...
      </p>
    </div>
  )

  const systemMessage = createStreamableUI(null)

  runAsyncFnWithoutBlocking(async () => {
    await sleep(1000)

    purchasing.update(
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          Purchasing {amount} ${symbol}... working on it...
        </p>
      </div>
    )

    await sleep(1000)

    purchasing.done(
      <div>
        <p className="mb-2">
          You have successfully purchased {amount} ${symbol}. Total cost:{' '}
          {formatNumber(amount * price)}
        </p>
      </div>
    )

    systemMessage.done(
      <SystemMessage>
        You have purchased {amount} shares of {symbol} at ${price}. Total cost ={' '}
        {formatNumber(amount * price)}.
      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'system',
          content: `[User has purchased ${amount} shares of ${symbol} at ${price}. Total cost = ${amount * price
            }]`
        }
      ]
    })
  })

  return {
    purchasingUI: purchasing.value,
    newMessage: {
      id: nanoid(),
      display: systemMessage.value
    }
  }
}

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const result = await streamUI({
    model: openai('gpt-4o'),
    initial: <SpinnerMessage />,
    system: `You are an intelligent assistant designed to help users manage their Microsoft ToDo tasks efficiently. You will interact with the Microsoft Graph API to perform various task management operations. Your primary functions include:

Get Task Lists: Retrieve and display the user's task lists.
Get Tasks: Retrieve and display tasks from a specific task list.
Add Tasks: Add new tasks.
Delete Tasks: Remove tasks from a specified task list.
Show Email: Retrieve and display the user's email address.
When interacting with users, ensure to:

Confirm the action they want to perform.
Request necessary details (e.g., task list name, task details).
Provide clear feedback on the success or failure of each operation.
Handle errors gracefully and provide helpful troubleshooting information.
Your responses should be clear, concise, and focused on task management. Always prioritize the user's productivity and efficiency.`

    //     `\
    // You are an AI assistant capable of helping with three activities:

    // 1. Search - searching files and file content within Microsoft Graph. When a user specifies a search query for files or file content, you will construct the request body for the search_files function and provide the applicable parameters based on the user's intent.  All function calls MUST be in JSON.
    // 2. Tasks - displaying user's tasks
    // 3. Weather Providing the weather


    // Search -- Use the following instructions to determine the parameters:

    // 1. **Query String**: You will use your world knowledge and knowledge of Microsoft graph search syntax (including KQL, XRANK, etc.) to create a query string that reflects the semantics of what the user is looking for.
    // 2. **Entity Types**: Always set this to ["driveItem"] to search for files and file content.
    // 3. **Starting Index (from)**: If specified by the user, include it; otherwise, default to 0.
    // 4. **Number of Results (size)**: If specified by the user, include it; otherwise, default to a reasonable number like 10.
    // 5. **Stored Fields**: If the user requests specific fields to be included in the response, add them.
    // 6. **Sort Order**: If the user specifies a sort order, include it with the appropriate field and order.

    // #### Examples:

    // - **User Intent**: "Search for documents containing the word 'budget' sorted by date."
    //   - **Request Body**:

    //     {
    //       "requests": [
    //         {
    //           "entityTypes": ["driveItem"],
    //           "query": {
    //             "queryString": "budget"
    //           },
    //           "sort": [
    //             {
    //               "field": "createdDateTime",
    //               "sortOrder": "desc"
    //             }
    //           ]
    //         }
    //       ]
    //     }


    //  **User Intent**: "Find all files related to 'project plan' and show the first 5 results."
    //    **Request Body**:
    //     {
    //       "requests": [
    //         {
    //           "entityTypes": ["driveItem"],
    //           "query": {
    //             "queryString": "project plan"
    //           },
    //           "size": 5
    //         }
    //       ]
    //     }

    // Construct the request body based on these guidelines and call the search_files function with the appropriate parameters.  For any relative dates/times, assume the current date/time is ${new Date().toISOString().slice(0, 10)}
    //     `
    ,
    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    },
    tools: {
      getWeather: {
        description: 'Get the weather information for a given city.',
        parameters: z.object({
          city: z.string().describe('The name of the city.'),
        }),
        generate: async function* ({ city }) {
          const toolCallId = nanoid();

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'getWeather',
                    toolCallId,
                    args: { city },
                  },
                ],
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'getWeather',
                    toolCallId,
                    result: { city },
                  },
                ],
              },
            ],
          });

          return (
            <BotCard>
              <WeatherCard city={city} />
            </BotCard>
          )
        }
      },
      showTasks: {
        description: 'Display the user tasks.',
        parameters: z.object({
          count: z.number().default(5).describe('The number of tasks to display.')
        }),
        generate: async function* ({ count }) {
          const toolCallId = nanoid();

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'showTasks',
                    toolCallId,
                    args: {},
                  },
                ],
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'showTasks',
                    toolCallId,
                    result: {},
                  },
                ],
              },
            ],
          });

          const items: OptimisticTask[] = await getTasks();

          return (
            <BotCard>
              <TaskComboboxForm initialListId="AAMkADhmYjY3M2VlLTc3YmYtNDJhMy04MjljLTg4NDI0NzQzNjJkMAAuAAAAAAAqiN_iXOf5QJoancmiEuQzAQAVAdL-uyq-SKcP7nACBA3lAAAAO9QQAAA="/>
            </BotCard>
          );;
        },
      },
      addTasks: {
        description: 'Add new tasks',
        parameters: z.object({
          titles: z.array(z.string()).describe('The titles of the tasks.')
        }),
        generate: async function* ({ titles }) {
          const toolCallId = nanoid();
      
          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'addTasks',
                    toolCallId,
                    args: { titles },
                  },
                ],
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'addTasks',
                    toolCallId,
                    result: {},
                  },
                ],
              },
            ],
          });
          console.log(titles);
          let addTaskResponse = await addTasks("AAMkADhmYjY3M2VlLTc3YmYtNDJhMy04MjljLTg4NDI0NzQzNjJkMAAuAAAAAAAqiN_iXOf5QJoancmiEuQzAQAVAdL-uyq-SKcP7nACBA3lAAAAO9QQAAA=", titles);
          
          return (
            <BotCard>
              <TaskComboboxForm initialListId="AAMkADhmYjY3M2VlLTc3YmYtNDJhMy04MjljLTg4NDI0NzQzNjJkMAAuAAAAAAAqiN_iXOf5QJoancmiEuQzAQAVAdL-uyq-SKcP7nACBA3lAAAAO9QQAAA="  initialTasks={addTaskResponse} />
            </BotCard>
          );
        },
      },
      
      deleteTasks: {
        description: 'Delete tasks from a specified task list.',
        parameters: z.object({
          listId: z.string().describe('The ID of the task list containing the tasks to delete.'),
          taskIds: z.array(z.string()).describe('The IDs of the tasks to delete.')
        }),
        generate: async function* ({ listId, taskIds }) {
          const toolCallId = nanoid();
      
          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'deleteTasks',
                    toolCallId,
                    args: { listId, taskIds },
                  },
                ],
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'deleteTasks',
                    toolCallId,
                    result: {},
                  },
                ],
              },
            ],
          });
      
          const deletedTasks = await deleteTasks(listId, taskIds);
      
          return (
            <BotCard>
              <p>Tasks</p>
            </BotCard>
          );
        },
      },
      showEmails: {
        description: 'Display the user emails.',
        parameters: z.object({
          count: z.number().default(100).describe('The number of emails to display.')
        }),
        generate: async function* ({ count }) {
          const toolCallId = nanoid();

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'assistant',
                content: [
                  {
                    type: 'tool-call',
                    toolName: 'showEmails',
                    toolCallId,
                    args: {},
                  },
                ],
              },
              {
                id: nanoid(),
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolName: 'showEmails',
                    toolCallId,
                    result: {},
                  },
                ],
              },
            ],
          });

          const items: MailType[] = await getEmails();

          return (
            <BotCard>
              <Mail mails={items} accounts={accounts}/>
            </BotCard>
          );;
        },
      },
      
      // search_query: {
      //   description: 'Execute a search query on the Microsoft Graph API to find files based on user-defined criteria.',
      //   parameters: z.object({
      //     query: z.string().describe('the query string to search for.'),
      //   }),
      //   generate: async function* ({ query }) {
      //     const toolCallId = nanoid();

      //     aiState.done({
      //       ...aiState.get(),
      //       messages: [
      //         ...aiState.get().messages,
      //         {
      //           id: nanoid(),
      //           role: 'assistant',
      //           content: [
      //             {
      //               type: 'tool-call',
      //               toolName: 'search_query',
      //               toolCallId,
      //               args: { query },
      //             },
      //           ],
      //         },
      //         {
      //           id: nanoid(),
      //           role: 'tool',
      //           content: [
      //             {
      //               type: 'tool-result',
      //               toolName: 'search_query',
      //               toolCallId,
      //               result: { query },
      //             },
      //           ],
      //         },
      //       ],
      //     });
      //     console.log(query);
      //     return (
      //       <BotCard>
      //         <Search searchQuery={query} />
      //       </BotCard>
      //     )
      //   }
      // },
    }
  })

  return {
    id: nanoid(),
    display: result.value
  }
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    confirmPurchase
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState() as Chat

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state }) => {
    'use server'

    const session = (await auth()) as EnrichedSession;

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.userId
      const path = `/chat/${chatId}`

      const firstMessageContent = messages[0].content as string
      const title = firstMessageContent.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'tool' ? (
          message.content.map(tool => {
            return tool.toolName === 'showTasks' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <TaskComboboxForm props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'addTasks' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <TaskComboboxForm props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'deleteTasks' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <TaskComboboxForm props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'search_query' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Search props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showEmails' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Mail props={tool.result} />
              </BotCard>
            ) : null
          })
        ) : message.role === 'user' ? (
          <UserMessage>{message.content as string}</UserMessage>
        ) : message.role === 'assistant' &&
          typeof message.content === 'string' ? (
          <BotMessage content={message.content} />
        ) : null
    }))
}
