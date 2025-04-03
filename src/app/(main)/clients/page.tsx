"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CellContext,
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import dayjs from "dayjs";
import _ from "lodash";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  Clock,
  MoreHorizontal,
  Plus,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type * as z from "zod";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useProfile } from "~/hooks/use-profile";
import { checkUserFlags, Flag } from "~/lib/flags/flags";
import { logger } from "~/lib/logging/client";
import { UserInviteCreate } from "~/lib/user-invites/schemas";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

function getSortIcon(sortDir: false | "asc" | "desc") {
  if (sortDir === "asc") return <ArrowUp className="ml-2 h-4 w-4" />;
  if (sortDir === "desc") return <ArrowDown className="ml-2 h-4 w-4" />;
  return <ArrowUpDown className="ml-2 h-4 w-4" />;
}

const columns: ColumnDef<RouterOutputs["clients"]["getClients"][number]>[] = [
  // {
  //   id: "select",
  //   header: ({ table }) => (
  //     <Checkbox
  //       checked={
  //         table.getIsAllPageRowsSelected() ||
  //         (table.getIsSomePageRowsSelected() && "indeterminate")
  //       }
  //       onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
  //       aria-label="Select all"
  //     />
  //   ),
  //   cell: ({ row }) => (
  //     <Checkbox
  //       checked={row.getIsSelected()}
  //       onCheckedChange={(value) => row.toggleSelected(!!value)}
  //       aria-label="Select row"
  //     />
  //   ),
  //   enableSorting: false,
  //   enableHiding: false,
  // },
  {
    accessorKey: "nickname",
    sortingFn: (rowA, rowB) => {
      // Sort by status first
      const statusOrder = { active: 0, pending: 1, inactive: 2 };
      const statusA = statusOrder[rowA.original.status];
      const statusB = statusOrder[rowB.original.status];

      if (statusA !== statusB) return statusA - statusB;

      // Then sort by name
      return (
        rowA.original.nickname?.localeCompare(rowB.original.nickname ?? "") ?? 0
      );
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() =>
            column.getIsSorted() === "desc"
              ? column.clearSorting()
              : column.toggleSorting(column.getIsSorted() === "asc", true)
          }
          className="w-full justify-between rounded-none border-r py-0 pl-4 hover:bg-transparent"
        >
          Name
          {getSortIcon(column.getIsSorted())}
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = row.original.status;
      const statusConfig = {
        active: {
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
          text: "Active",
          textColor: "text-green-500",
        },
        pending: {
          icon: <Clock className="h-4 w-4 text-yellow-500" />,
          text: "Pending Invitation",
          textColor: "text-yellow-500",
        },
        inactive: {
          icon: <XCircle className="h-4 w-4 text-red-500" />,
          text: "Inactive",
          textColor: "text-red-500",
        },
      }[status];

      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-4 py-4">
                {status !== "active" && statusConfig?.icon}
                <span
                  className={cn(status !== "active" && statusConfig?.textColor)}
                >
                  {row.getValue("nickname") || "—"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent
              align="start"
              sideOffset={-8}
              alignOffset={12}
              className="flex items-center gap-x-1.5 border border-foreground/10 bg-accent"
            >
              {status === "active" && statusConfig.icon} {statusConfig?.text}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    enableHiding: false,
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() =>
            column.getIsSorted() === "desc"
              ? column.clearSorting()
              : column.toggleSorting(column.getIsSorted() === "asc", true)
          }
          className="w-full justify-between rounded-none border-r py-0 hover:bg-transparent"
        >
          Email
          {getSortIcon(column.getIsSorted())}
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <p className="px-4 py-2 text-muted-foreground">
          {row.getValue("email")}
        </p>
      );
    },
  },
  {
    id: "coach_id",
    accessorKey: "coach_id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() =>
            column.getIsSorted() === "desc"
              ? column.clearSorting()
              : column.toggleSorting(column.getIsSorted() === "asc", true)
          }
          className="w-full justify-between rounded-none border-r py-0 hover:bg-transparent"
        >
          Coach
          {getSortIcon(column.getIsSorted())}
        </Button>
      );
    },
    cell: ({ row }) => {
      const coach = row.original.coach[0];
      if (!coach) return null;
      return <p className="px-4 text-muted-foreground">{coach.nickname}</p>;
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() =>
            column.getIsSorted() === "desc"
              ? column.clearSorting()
              : column.toggleSorting(column.getIsSorted() === "asc", true)
          }
          className="w-full justify-between rounded-none border-r py-0 hover:bg-transparent"
        >
          Member Since
          {getSortIcon(column.getIsSorted())}
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return (
        <span className="px-4 text-muted-foreground">
          {dayjs(date).format("MMM DD, YYYY")}
        </span>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ActionsCell,
  },
];

const formSchema = UserInviteCreate.omit({
  userId: true,
});

function NewClientDialog() {
  const [open, setOpen] = React.useState(false);
  const [isCoach, setIsCoach] = React.useState(false);
  const utils = api.useUtils();
  const { profile } = useProfile();
  const { data: user } = api.auth.getUser.useQuery();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      companyName: "",
      role: "user",
    },
  });
  const { mutate: inviteClient, isPending } =
    api.userInvites.create.useMutation({
      onSuccess: () => {
        toast.success(
          `${isCoach ? "Coach" : "Client"} has been invited successfully.`,
        );
        form.reset();
        setOpen(false);
        void utils.clients.getClients.invalidate();
      },
      onError: (error) => {
        logger.error("Failed to invite client", { error });
        toast.error(error.message);
      },
    });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!profile) return;

    inviteClient({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      companyName: values.companyName,
      userId: profile.id,
      role: isCoach ? "coach" : "user",
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Plus className="h-4 w-4" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription>
            Fill in the details below to invite a new user.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {checkUserFlags(user, [Flag.ALLOW_INVITE_AS_COACH]) && (
              <div className="mb-10">
                <div className="flex items-center gap-2">
                  <Label htmlFor="isCoach">Invite as Coach</Label>
                  <Switch
                    id="isCoach"
                    checked={isCoach}
                    onCheckedChange={setIsCoach}
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Acme, Inc." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="john.doe@example.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Inviting..."
                  : `Invite ${isCoach ? "Coach" : "Client"}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientsPage() {
  api.auth.getUser.usePrefetchQuery();

  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "nickname", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const { profile, setProfile } = useProfile();
  const { data: user } = api.auth.getUser.useQuery();
  const shouldLoadAll = React.useMemo(
    () => checkUserFlags(user, [Flag.ALLOW_LOAD_ALL_CLIENTS]),
    [user],
  );

  const { data: clients_ } = api.clients.getClients.useQuery({
    userId: profile?.id ?? "",
  });

  const clients = React.useMemo(() => clients_ ?? [], [clients_]);

  const table = useReactTable({
    data: clients,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    enableMultiSort: true,
  });

  // Hide coach column if not admin
  React.useEffect(() => {
    setColumnVisibility((prev) => ({ ...prev, coach_id: !!shouldLoadAll }));
  }, [shouldLoadAll]);

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
        <NewClientDialog />
      </div>
      <div className="w-full">
        <div className="flex items-center py-4">
          <Input
            placeholder="Filter by name..."
            value={
              (table.getColumn("nickname")?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn("nickname")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .filter((column) => column.id !== "coach_id" || shouldLoadAll)
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {_.startCase(column.id)}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="p-0">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TooltipProvider key={row.id}>
                    <Tooltip
                      open={
                        row.original.status === "active" ? undefined : false
                      }
                    >
                      <TooltipTrigger asChild>
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                          onClick={() =>
                            row.original.status === "active" &&
                            row.original.id &&
                            (() => {
                              setProfile({
                                ...row.original,
                                id: row.original.id,
                              });
                              router.replace("/");
                            })()
                          }
                          className={cn(
                            row.original.status === "active" &&
                              "cursor-pointer",
                          )}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="p-0">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TooltipTrigger>
                      <TooltipContent align="start" alignOffset={12}>
                        Click to switch view to this client
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionsCell({
  row,
}: CellContext<RouterOutputs["clients"]["getClients"][number], unknown>) {
  const client = row.original;

  const utils = api.useUtils();

  const { mutate: resendInvitation } =
    api.userInvites.resendInvitation.useMutation({
      onSuccess: () => {
        toast.success("Invitation resent");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const { mutate: deactivateClient } = api.clients.deactivateClient.useMutation(
    {
      onSuccess: () => {
        toast.success("Client deactivated");
        void utils.clients.getClients.invalidate();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );

  const { mutate: reactivateClient } = api.clients.reactivateClient.useMutation(
    {
      onSuccess: () => {
        toast.success("Client reactivated");
        void utils.clients.getClients.invalidate();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );

  const handleResendInvitation = (clientEmail: string) => () => {
    resendInvitation({ email: clientEmail, role: "user" });
  };

  const handleDeactivateClient = (clientId: string) => () => {
    deactivateClient({ id: clientId });
  };

  const handleReactivateClient = (clientId: string) => () => {
    reactivateClient({ id: clientId });
  };

  return (
    <div
      className="relative"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-full justify-center px-2 py-4 ring-0 hover:bg-transparent hover:text-muted-foreground focus-visible:ring-0"
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" alignOffset={8}>
          {!client.email ? (
            <DropdownMenuLabel>No actions available</DropdownMenuLabel>
          ) : (
            <>
              <DropdownMenuLabel>Manage</DropdownMenuLabel>
              {client.status === "pending" ? (
                <DropdownMenuItem
                  onClick={handleResendInvitation(client.email)}
                >
                  Resend invite email
                </DropdownMenuItem>
              ) : client.id ? (
                client.status === "active" ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        Deactivate client
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription className="flex flex-col gap-y-1">
                          <p>
                            This will deactivate the client&apos;s access to the
                            system.
                          </p>
                          <p>
                            Their data will <strong>not</strong> be deleted.
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={handleDeactivateClient(client.id)}
                        >
                          Continue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <DropdownMenuItem onClick={handleReactivateClient(client.id)}>
                    Reactivate client
                  </DropdownMenuItem>
                )
              ) : (
                <DropdownMenuLabel>No actions available</DropdownMenuLabel>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
