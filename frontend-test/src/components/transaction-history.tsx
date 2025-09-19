import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownLeft, ExternalLink } from "lucide-react"

const mockTransactions = [
  {
    id: "1",
    type: "send",
    amount: "125.50",
    address: "iota1qp...3x2z",
    timestamp: "2 hours ago",
    status: "confirmed",
  },
  {
    id: "2",
    type: "receive",
    amount: "500.00",
    address: "iota1qr...8y4w",
    timestamp: "1 day ago",
    status: "confirmed",
  },
  {
    id: "3",
    type: "send",
    amount: "75.25",
    address: "iota1qs...5z1x",
    timestamp: "3 days ago",
    status: "confirmed",
  },
]

export function TransactionHistory() {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-[var(--font-dm-sans)]">Recent Transactions</CardTitle>
            <CardDescription>Your latest IOTA transactions</CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${tx.type === "send" ? "bg-destructive/10" : "bg-accent/10"}`}>
                  {tx.type === "send" ? (
                    <ArrowUpRight className="h-4 w-4 text-destructive" />
                  ) : (
                    <ArrowDownLeft className="h-4 w-4 text-accent" />
                  )}
                </div>
                <div>
                  <div className="font-medium font-[var(--font-dm-sans)]">
                    {tx.type === "send" ? "Sent" : "Received"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {tx.type === "send" ? "To" : "From"} {tx.address}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div
                  className={`font-semibold font-[var(--font-dm-sans)] ${
                    tx.type === "send" ? "text-destructive" : "text-accent"
                  }`}
                >
                  {tx.type === "send" ? "-" : "+"}
                  {tx.amount} IOTA
                </div>
                <div className="flex items-center gap-2">

                  <span className="text-xs text-muted-foreground">{tx.timestamp}</span>
                </div>
              </div>

              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
