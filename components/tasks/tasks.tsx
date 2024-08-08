"use client";
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { JSX, SVGProps, useState, useTransition } from "react";
import { useOptimistic } from 'react';
import { addTasks, deleteTasks } from '@/app/actions';
import { OptimisticTask } from "../../types";

export function TodoList({ initialTasks, listId }: { initialTasks: OptimisticTask[], listId: string }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [isPending, startTransition] = useTransition();

  const [optimisticTasks, addOptimisticTask] = useOptimistic(
    tasks,
    (state: OptimisticTask[], newTask: OptimisticTask) => [...state, newTask]
  );

  async function formAction(formData: FormData) {
    const newTaskTitle = formData.get('item') as string;
    if (!newTaskTitle.trim()) return; // Don't add empty tasks

    const newTask: OptimisticTask = {
      id: Date.now().toString(),
      title: newTaskTitle,
      status: "notStarted",
      sending: true
    };

    addOptimisticTask(newTask);

    startTransition(async () => {
      try {
        const addedTask = await addTasks(listId, [newTaskTitle]);
        setTasks(currentTasks => [
          ...currentTasks,
          { ...newTask, id: addedTask[0].id, sending: false }
        ]);
      } catch (error) {
        console.error("Failed to add task:", error);
        // Remove the optimistic task if it failed to add
        setTasks(currentTasks => currentTasks.filter(task => task.id !== newTask.id));
      }
    });
  }

  async function handleDelete(taskId: string) {
    const taskToDelete = tasks.find(task => task.id === taskId);
    if (!taskToDelete) return;

    // Optimistically remove the task
    setTasks(currentTasks => currentTasks.filter(task => task.id !== taskId));

    try {
      await deleteTasks(listId, [taskId]);
    } catch (error) {
      console.error("Failed to delete task:", error);
      // Revert the optimistic delete if it failed
      setTasks(currentTasks => [...currentTasks, taskToDelete]);
    }
  }

  return (
    <div className="bg-background text-foreground rounded-lg shadow-md p-6 w-full max-w-md mx-auto">
      <div className="space-y-4">
        <form action={formAction} className="flex items-center gap-2">
          <div className="flex-grow">
            <Input type="text" name="item" placeholder="Make a video ... " className="w-full" />
          </div>
          <Button type="submit" disabled={isPending}>Add</Button>
        </form>
        <div className="space-y-2">
          {optimisticTasks.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-muted rounded-md p-3"
            >
              <div className="flex items-center gap-3">
                <Checkbox id={item.id} defaultChecked={item.status === "completed"} />
                <label
                  htmlFor={item.id}
                  className={`text-sm font-medium ${item.status === "completed" ? 'line-through' : ''}`}
                >
                  {item.title}
                  {item.sending && <small> (Sending ... )</small>}
                </label>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(item.id as string)}>
                <TrashIcon className="w-5 h-4" />
                <span className="sr-only">Delete task</span>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// TrashIcon component remains unchanged

function TrashIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  )
}