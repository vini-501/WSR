import { useState } from "react";
import { useListActivityLogs } from "@workspace/api-client-react";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export function ActivityLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useListActivityLogs({ page, limit: 20 });

  const columns = [
    {
      accessorKey: "created_at",
      header: "Timestamp",
      cell: ({ row }: any) => <span className="text-muted-foreground whitespace-nowrap">{format(new Date(row.original.created_at), "MMM d, yyyy HH:mm:ss")}</span>,
    },
    {
      accessorKey: "user_name",
      header: "User",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          {row.original.user_name ? (
            <span className="font-medium">{row.original.user_name}</span>
          ) : (
            <span className="text-muted-foreground italic">System</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }: any) => <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{row.original.action}</span>,
    },
    {
      accessorKey: "description",
      header: "Details",
    },
    {
      accessorKey: "ip_address",
      header: "IP Address",
      cell: ({ row }: any) => <span className="text-muted-foreground text-xs">{row.original.ip_address || '-'}</span>,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">System-wide event tracking and user actions.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : data ? (
        <DataTable
          columns={columns}
          data={data.data}
          pagination={{
            pageIndex: data.page - 1,
            pageSize: data.limit,
            pageCount: data.total_pages,
            onPageChange: (p) => setPage(p + 1),
          }}
        />
      ) : null}
    </div>
  );
}