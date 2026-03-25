'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { Search, UserPlus, PackagePlus, Activity, ShoppingCart, Pill } from 'lucide-react'

export function CommandPalette() {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [])

    const runCommand = (command: () => void) => {
        setOpen(false)
        command()
    }

    return (
        <Command.Dialog
            open={open}
            onOpenChange={setOpen}
            label="Global Command Menu"
            className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[20vh] p-4 sm:p-0"
        >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm -z-10" onClick={() => setOpen(false)} />

            <div className="overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-gray-200 border border-gray-100 w-full max-w-2xl transform transition-all">
                <div className="flex items-center px-4 py-3 border-b border-gray-100">
                    <Search className="h-5 w-5 text-gray-400 mr-2" />
                    <Command.Input
                        placeholder="Search patients, medicines, or jump to page..."
                        className="flex-1 border-0 bg-transparent text-sm focus:ring-0 outline-none placeholder:text-gray-400 text-gray-900"
                    />
                    <span className="text-xs text-gray-400 font-medium px-2 py-1 bg-gray-100 rounded-md">
                        ESC
                    </span>
                </div>

                <Command.List className="max-h-[350px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200">
                    <Command.Empty className="py-6 text-center text-sm text-gray-500">No results found.</Command.Empty>

                    <Command.Group heading="Navigation" className="px-2 font-medium text-xs text-gray-500 mb-2 mt-2">
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/'))}
                            className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-md text-sm text-gray-800 hover:bg-emerald-50 hover:text-emerald-700 aria-selected:bg-emerald-50 aria-selected:text-emerald-700 cursor-pointer transition-colors"
                        >
                            <Activity className="h-4 w-4" />
                            Go to Dashboard Overview
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/patients/lookup'))}
                            className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-md text-sm text-gray-800 hover:bg-emerald-50 hover:text-emerald-700 aria-selected:bg-emerald-50 aria-selected:text-emerald-700 cursor-pointer transition-colors"
                        >
                            <Search className="h-4 w-4" />
                            Lookup Patient
                        </Command.Item>
                    </Command.Group>

                    <Command.Group heading="Quick Actions" className="px-2 font-medium text-xs text-gray-500 mb-2 mt-4">
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/patients/new'))}
                            className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-md text-sm text-gray-800 hover:bg-emerald-50 hover:text-emerald-700 aria-selected:bg-emerald-50 aria-selected:text-emerald-700 cursor-pointer transition-colors"
                        >
                            <UserPlus className="h-4 w-4" />
                            Register New Patient
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/inventory/new'))}
                            className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-md text-sm text-gray-800 hover:bg-emerald-50 hover:text-emerald-700 aria-selected:bg-emerald-50 aria-selected:text-emerald-700 cursor-pointer transition-colors"
                        >
                            <PackagePlus className="h-4 w-4" />
                            Add Medicine to Inventory
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/inventory/sell'))}
                            className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-md text-sm text-gray-800 hover:bg-emerald-50 hover:text-emerald-700 aria-selected:bg-emerald-50 aria-selected:text-emerald-700 cursor-pointer transition-colors"
                        >
                            <ShoppingCart className="h-4 w-4" />
                            Process a Sale
                        </Command.Item>
                    </Command.Group>

                    <Command.Group heading="Medicines (Demo)" className="px-2 font-medium text-xs text-gray-500 mb-2 mt-4">
                        <Command.Item
                            onSelect={() => runCommand(() => { })}
                            className="flex flex-col px-3 py-2 mt-1 rounded-md hover:bg-emerald-50 aria-selected:bg-emerald-50 cursor-pointer transition-colors"
                        >
                            <div className="flex items-center justify-between text-sm text-gray-800 w-full mb-0.5">
                                <span className="flex items-center gap-3"><Pill className="h-4 w-4 text-gray-400" /> Paracetamol 500mg</span>
                                <span className="text-xs text-emerald-600 bg-emerald-100 px-1.5 rounded">In Stock</span>
                            </div>
                            <span className="text-xs text-gray-500 pl-7">Analgesic • $12.50</span>
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => { })}
                            className="flex flex-col px-3 py-2 mt-1 rounded-md hover:bg-emerald-50 aria-selected:bg-emerald-50 cursor-pointer transition-colors"
                        >
                            <div className="flex items-center justify-between text-sm text-gray-800 w-full mb-0.5">
                                <span className="flex items-center gap-3"><Pill className="h-4 w-4 text-gray-400" /> Amoxicillin 250mg</span>
                                <span className="text-xs text-amber-600 bg-amber-100 px-1.5 rounded">Low Stock</span>
                            </div>
                            <span className="text-xs text-gray-500 pl-7">Antibiotic • $24.00</span>
                        </Command.Item>
                    </Command.Group>
                </Command.List>
            </div>
        </Command.Dialog>
    )
}
