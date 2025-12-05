import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, CreditCard, TrendingUp, Receipt } from "lucide-react";

export function LiveSales() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="bg-zinc-900/50 border-white/10 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-white text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Album Purchase</p>
                    <p className="text-xs text-zinc-500">User #{100+i}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">$15.00</p>
                  <p className="text-xs text-zinc-500">Just now</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="bg-zinc-900/50 border-white/10">
          <CardContent className="p-4">
            <p className="text-sm text-zinc-400 mb-1">Total Revenue (Today)</p>
            <h3 className="text-3xl font-bold text-white">$450.00</h3>
            <div className="flex items-center gap-2 mt-2 text-xs text-emerald-400">
              <TrendingUp className="w-3 h-3" />
              <span>+12% vs last hour</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-2">
           <Button className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white">
             <CreditCard className="w-4 h-4 mr-2" />
             Charge POS
           </Button>
           <Button variant="outline" className="h-12 border-white/10 text-zinc-300 hover:text-white hover:bg-white/5">
             <Receipt className="w-4 h-4 mr-2" />
             Invoice
           </Button>
        </div>
      </div>
    </div>
  );
}

