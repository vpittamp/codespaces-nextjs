import { ApiClient } from './kiota-client/apiClient';
import { AnonymousAuthenticationProvider } from '@microsoft/kiota-abstractions';
import getGraphClient from './db';

async function testTodoApi() {
    try {
        // Get the Microsoft Graph client
        const graphClient = await getGraphClient();

        // Initialize the API client with the graph client's authentication provider
        const authProvider = graphClient.getAuthenticationProvider() as AnonymousAuthenticationProvider;
        const apiClient = new ApiClient(authProvider);

        console.log("Testing Todo API...");

        // 1. List todo lists
        console.log("Fetching todo lists...");
        const todoLists = await apiClient.me.todo.lists.get();
        console.log("Todo lists:", todoLists.value?.map(list => list.displayName));

        // 2. Create a new task
        console.log("\nCreating a new task...");
        const newTask = {
            title: "Test task from API",
            importance: "high",
            status: "notStarted"
        };
        const createdTask = await apiClient.me.todo.lists.byTodoTaskListId("defaultList").tasks.post(newTask);
        console.log("Created task:", createdTask);

        // 3. Fetch tasks from the default list
        console.log("\nFetching tasks from default list...");
        const tasks = await apiClient.me.todo.lists.byTodoTaskListId("defaultList").tasks.get();
        console.log("Tasks:", tasks.value?.map(task => task.title));

        // 4. Update a task (the one we just created)
        console.log("\nUpdating the created task...");
        const updatedTask = await apiClient.me.todo.lists.byTodoTaskListId("defaultList").tasks.byTodoTaskId(createdTask.id!).patch({
            status: "completed"
        });
        console.log("Updated task:", updatedTask);

        // 5. Delete the task
        console.log("\nDeleting the created task...");
        await apiClient.me.todo.lists.byTodoTaskListId("defaultList").tasks.byTodoTaskId(createdTask.id!).delete();
        console.log("Task deleted successfully");

    } catch (error) {
        console.error("An error occurred:", error);
    }
}

testTodoApi().then(() => console.log("Test completed"));
