import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Terminal, RefreshCw, AlertCircle } from "lucide-react";

export default function SuperAdminDevTools() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Developer Tools</h1>
                <p className="text-zinc-400">System logs, job queues, and debugging utilities.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-zinc-900/50 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Terminal className="w-5 h-5 text-zinc-400" />
                            Backend Logs (Tail 50)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-black rounded-lg p-4 font-mono text-xs text-green-400 h-64 overflow-y-auto border border-white/10">
                            <p>[INFO] Server started on port 3001</p>
                            <p>[INFO] Database connected successfully</p>
                            <p>[INFO] Migration 002 applied</p>
                            <p>[REQ] POST /api/auth/login - 200 OK</p>
                            <p>[REQ] GET /api/admin/stats - 200 OK</p>
                            <p className="text-red-400">[ERR] Failed to fetch image from FAL (Timeout)</p>
                            <p>[REQ] POST /api/generate - 500 Internal Server Error</p>
                            <p>[INFO] Retrying job #12345...</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="bg-zinc-900/50 border-white/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <RefreshCw className="w-5 h-5 text-blue-400" />
                                Job Queues
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span>Image Generation Queue</span>
                                <span className="text-emerald-400 font-mono">Idle</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Email Notification Queue</span>
                                <span className="text-emerald-400 font-mono">Idle</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Webhook Retry Queue</span>
                                <span className="text-yellow-400 font-mono">2 Pending</span>
                            </div>
                            <Button variant="outline" size="sm" className="w-full mt-2 border-white/10">Flush Queues</Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900/50 border-white/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-red-400" />
                                Error Tracking
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="text-sm text-red-400">TypeError: Cannot read property 'id' of undefined</div>
                                <div className="text-xs text-zinc-500">src/components/Dashboard.tsx:45</div>
                                <div className="h-px bg-white/5 my-2" />
                                <div className="text-sm text-red-400">DatabaseConnectionError: Connection timed out</div>
                                <div className="text-xs text-zinc-500">backend/db.py:12</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
