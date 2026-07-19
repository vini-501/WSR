import { useState } from "react";
import { useListAuditLogs } from "@workspace/api-client-react";
import { DataTable } from "@/components/ui/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export function AuditLogs() {
  const [page, setPage] = useState(1);
  const [operationFilter, setOperationFilter] = useState<any>("");

  const { data, isLoading } = useListAuditLogs({ 
    page, 
    limit: 20,
    operation: operationFilter || undefined
  });

  const columns = [
    {
      accessorKey: "created_at",
      header: "Timestamp",
      cell: ({ row }: any) => <span className="text-muted-foreground whitespace-nowrap">{format(new Date(row.original.created_at), "MMM d, HH:mm:ss")}</span>,
    },
    {
      accessorKey: "user_name",
      header: "User",
      cell: ({ row }: any) => row.original.user_name || <span className="text-muted-foreground italic">System</span>,
    },
    {
      accessorKey: "table_name",
      header: "Table",
      cell: ({ row }: any) => <span className="font-mono text-xs">{row.original.table_name}</span>,
    },
    {
      accessorKey: "operation",
      header: "Operation",
      cell: ({ row }: any) => {
        const colors: any = { INSERT: 'text-emerald-600 bg-emerald-50', UPDATE: 'text-blue-600 bg-blue-50', DELETE: 'text-red-600 bg-red-50' };
        return (
          <span className={`font-mono text-xs px-2 py-1 rounded font-bold ${colors[row.original.operation] || ''}`}>
            {row.original.operation}
          </span>
        );
      },
    },
    {
      accessorKey: "record_id",
      header: "Record ID",
      cell: ({ row }: any) => <span className="font-mono text-xs text-muted-foreground">{row.original.record_id?.substring(0,8)}...</span>,
    },
    {
      id: "details",
      header: "Changes",
      cell: ({ row }: any) => (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8">
              <Eye className="h-4 w-4 mr-2" /> View
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Audit Record Details</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Old Values</h4>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[400px]">
                  {row.original.old_values ? JSON.stringify(JSON.parse(row.original.old_values), null, 2) : 'None'}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">New Values</h4>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[400px]">
                  {row.original.new_values ? JSON.stringify(JSON.parse(row.original.new_values), null, 2) : 'None'}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">Raw database operation tracking for compliance.</p>
      </div>

      <div className="flex items-center gap-4">
        <Select value={operationFilter} onValueChange={(v) => { setOperationFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Operations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Operations</SelectItem>
            <SelectItem value="INSERT">INSERT</SelectItem>
            <SelectItem value="UPDATE">UPDATE</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
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