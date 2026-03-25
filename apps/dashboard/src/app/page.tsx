import { AlertTriangle, Clock, TrendingUp, Users } from 'lucide-react';

export default function DashboardOverview() {
    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">Overview of today's pharmacy operations.</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Sales"
                    value="$4,250"
                    trend="+12% from yesterday"
                    trendUp={true}
                    icon={TrendingUp}
                />
                <StatCard
                    title="Patients Served"
                    value="142"
                    trend="+5% from yesterday"
                    trendUp={true}
                    icon={Users}
                />
                <StatCard
                    title="Pending Orders"
                    value="8"
                    trend="Requires attention"
                    trendUp={false}
                    icon={Clock}
                    iconBg="bg-amber-100"
                    iconColor="text-amber-600"
                />
                <StatCard
                    title="Expiring Medicines"
                    value="12"
                    trend="In next 30 days"
                    trendUp={false}
                    icon={AlertTriangle}
                    iconBg="bg-rose-100"
                    iconColor="text-rose-600"
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                    <div className="mt-4 flex flex-col gap-4">
                        <TransactionItem name="Paracetamol 500mg" time="2 mins ago" amount="$12.50" />
                        <TransactionItem name="Amoxicillin 250mg" time="15 mins ago" amount="$24.00" />
                        <TransactionItem name="Ibuprofen 400mg" time="1 hour ago" amount="$8.75" />
                        <TransactionItem name="Cough Syrup V" time="2 hours ago" amount="$15.00" />
                        <TransactionItem name="Vitamin C x60" time="3 hours ago" amount="$18.25" />
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h2>
                    <div className="mt-4 flex flex-col gap-4">
                        <AlertItem name="Insulin Glargine" stock="2 vials left" status="Critical" />
                        <AlertItem name="Lisinopril 10mg" stock="15 packs left" status="Warning" />
                        <AlertItem name="Salbutamol Inhaler" stock="8 units left" status="Warning" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, trend, icon: Icon, trendUp, iconBg = "bg-emerald-100", iconColor = "text-emerald-600" }: any) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">{title}</span>
                <div className={`p-2 rounded-lg flex items-center justify-center ${iconBg}`}>
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
            </div>
            <div className="mt-4">
                <span className="text-3xl font-bold text-gray-900">{value}</span>
            </div>
            <div className="mt-1 flex items-center">
                <span className={`text-sm ${trendUp ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {trend}
                </span>
            </div>
        </div>
    )
}

function TransactionItem({ name, time, amount }: any) {
    return (
        <div className="flex items-center justify-between border-b border-gray-50 pb-4 last:border-0 last:pb-0 font-medium">
            <div>
                <p className="text-sm font-semibold text-gray-900">{name}</p>
                <p className="text-xs text-gray-500 mt-1">{time}</p>
            </div>
            <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{amount}</span>
        </div>
    )
}

function AlertItem({ name, stock, status }: any) {
    const isCritical = status === "Critical";
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors">
            <div>
                <p className="text-sm font-semibold text-gray-900">{name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stock}</p>
            </div>
            <div className={`mt-2 sm:mt-0 font-bold text-xs px-2.5 py-1 rounded-full w-fit ${isCritical ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                {status}
            </div>
        </div>
    )
}
