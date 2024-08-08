"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronsUpDown } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"

import { getLists, getTasks } from "@/app/actions"
import { TodoTaskList, TodoTask } from "@microsoft/microsoft-graph-types"
import { TodoList } from "./tasks"
import { OptimisticTask } from "../../types"

const FormSchema = z.object({
  taskList: z.object({
    id: z.string(),
    displayName: z.string(),
  }, {
    required_error: "Please select a task list.",
  }),
})

interface TaskComboboxFormProps {
  initialListId?: string;
  initialTasks?: OptimisticTask[];
}

export function TaskComboboxForm({ initialListId, initialTasks }: TaskComboboxFormProps) {
  const [taskLists, setTaskLists] = useState<TodoTaskList[]>([])
  const [tasks, setTasks] = useState<OptimisticTask[]>(initialTasks || [])

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: initialListId ? {
      taskList: {
        id: initialListId,
        displayName: "", // We'll update this when we fetch the lists
      }
    } : undefined,
  })

  useEffect(() => {
    const fetchLists = async () => {
      const lists = await getLists()
      setTaskLists(lists)
      
      if (initialListId) {
        const initialList = lists.find(list => list.id === initialListId)
        if (initialList) {
          form.setValue("taskList", {
            id: initialList.id || "",
            displayName: initialList.displayName || "",
          })
        }
      }
    }
    fetchLists()
  }, [initialListId, form])

  useEffect(() => {
    if (initialListId && !initialTasks) {
      fetchTasks(initialListId, "")
    }
  }, [initialListId, initialTasks])

  async function fetchTasks(listId: string, listName: string) {
    try {
      const fetchedTasks = await getTasks(listId)
      const optimisticTasks: OptimisticTask[] = fetchedTasks.map(task => ({
        id: task.id,
        title: task.title || "",
        status: task.status,
        sending: false
      }))
      setTasks(optimisticTasks)
      toast({
        title: "Tasks fetched successfully",
        description: `Fetched ${fetchedTasks.length} tasks from "${listName}"`,
      })
    } catch (error) {
      console.error("Error fetching tasks:", error)
      toast({
        title: "Error fetching tasks",
        description: "An error occurred while fetching tasks. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Form {...form}>
        <form className="space-y-6">
          <FormField
            control={form.control}
            name="taskList"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value
                          ? field.value.displayName
                          : "Select task list"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search task list..." />
                      <CommandList>
                        <CommandEmpty>No task list found.</CommandEmpty>
                        <CommandGroup>
                          {taskLists.map((list) => (
                            <CommandItem
                              value={list.displayName ?? ""}
                              key={list.id}
                              onSelect={() => {
                                form.setValue("taskList", { id: list.id ?? "", displayName: list.displayName ?? "" })
                                fetchTasks(list.id ?? "", list.displayName ?? "")
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  list.id === field.value?.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {list.displayName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </FormItem>
            )}
          />
        </form>
      </Form>

      {tasks.length > 0 && (
        <div className="mt-6">
          <TodoList initialTasks={tasks} listId={form.getValues("taskList").id} />
        </div>
      )}
    </div>
  )
}