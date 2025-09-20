import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, Download, Airplay, Plus } from 'lucide-react';

export function QuickActions() {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg font-[var(--font-dm-sans)]">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-auto p-4 flex-col gap-2 bg-transparent"
          >
            <Send className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Send</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto p-4 flex-col gap-2 bg-transparent"
          >
            <Download className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Receive</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto p-4 flex-col gap-2 bg-transparent"
          >
            <Airplay className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Stake</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto p-4 flex-col gap-2 bg-transparent"
          >
            <Plus className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Sign</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
