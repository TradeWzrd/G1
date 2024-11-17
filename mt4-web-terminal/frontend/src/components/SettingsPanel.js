import React, { useState } from 'react';
import { X, Moon, Sun, Bell, Palette, LayoutGrid, Volume2, MessageSquare, ChevronRight } from 'lucide-react';
import { Dialog } from './Dialog';
import { ThemeToggle } from './ThemeToggle';
import ThemeCustomizer from './ThemeCustomizer';

const SettingsPanel = ({ 
    isOpen, 
    onClose, 
    onToggleEditMode, 
    isEditing,
    onSaveLayout,
    onResetLayout,
    layoutPresets,
    selectedPreset,
    onSelectPreset 
}) => {
    const [activeTab, setActiveTab] = useState('appearance');

    const tabs = [
        { 
            id: 'appearance', 
            label: 'Appearance', 
            icon: Palette,
            description: 'Customize the look and feel of your terminal'
        },
        { 
            id: 'layout', 
            label: 'Layout', 
            icon: LayoutGrid,
            description: 'Manage panel layouts and presets'
        },
        { 
            id: 'alerts', 
            label: 'Alerts & Notifications', 
            icon: Bell,
            description: 'Configure trade notifications and alerts'
        },
        { 
            id: 'sound', 
            label: 'Sound', 
            icon: Volume2,
            description: 'Manage sound effects and volume'
        },
        { 
            id: 'chat', 
            label: 'Chat', 
            icon: MessageSquare,
            description: 'Configure chat settings and notifications'
        }
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'appearance':
                return (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                                <div className="space-y-1">
                                    <span className="font-medium text-white">Dark Mode</span>
                                    <p className="text-sm text-white/60">Switch between light and dark themes</p>
                                </div>
                                <ThemeToggle />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-white/5 rounded-xl border border-white/10 backdrop-blur-md p-4">
                                <div className="mb-4">
                                    <h3 className="font-medium text-white">Color Theme</h3>
                                    <p className="text-sm text-white/60">Customize your terminal colors</p>
                                </div>
                                <ThemeCustomizer />
                            </div>
                        </div>
                    </div>
                );

            case 'layout':
                return (
                    <div className="space-y-6">
                        <div className="bg-white/5 rounded-xl border border-white/10 backdrop-blur-md p-4">
                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-1">
                                    <h3 className="font-medium text-white">Layout Editor</h3>
                                    <p className="text-sm text-white/60">Customize panel positions and sizes</p>
                                </div>
                                <button
                                    onClick={onToggleEditMode}
                                    className={`px-4 py-2 rounded-lg transition-all ${
                                        isEditing
                                            ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                                            : 'border border-white/10 text-white hover:bg-white/5'
                                    }`}
                                >
                                    {isEditing ? 'Exit Edit Mode' : 'Edit Layout'}
                                </button>
                            </div>
                            {isEditing && (
                                <div className="flex gap-3 mt-4 pt-4 border-t border-white/10">
                                    <button
                                        onClick={onResetLayout}
                                        className="flex-1 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg 
                                                hover:bg-red-500/20 transition-all border border-red-400/20"
                                    >
                                        Reset Layout
                                    </button>
                                    <button
                                        onClick={onSaveLayout}
                                        className="flex-1 px-4 py-2 bg-green-500/10 text-green-400 rounded-lg 
                                                hover:bg-green-500/20 transition-all border border-green-400/20"
                                    >
                                        Save Layout
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-medium text-white">Layout Presets</h3>
                            <div className="grid grid-cols-1 gap-3">
                                {Object.entries(layoutPresets).map(([key, preset]) => (
                                    <button
                                        key={key}
                                        onClick={() => onSelectPreset(key)}
                                        className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                                            selectedPreset === key
                                                ? 'border-blue-400/30 bg-blue-500/10 text-blue-400'
                                                : 'border-white/10 bg-white/5 hover:bg-white/10 text-white'
                                        }`}
                                    >
                                        <span className="font-medium">{preset.description}</span>
                                        <ChevronRight className="w-5 h-5 opacity-50" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'alerts':
                return (
                    <div className="space-y-6">
                        <div className="bg-white/5 rounded-xl border border-white/10 backdrop-blur-md p-4">
                            <div className="mb-4">
                                <h3 className="font-medium text-white">Trade Notifications</h3>
                                <p className="text-sm text-white/60">Configure which notifications you want to receive</p>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: 'Position Opened', description: 'Notify when a new position is opened' },
                                    { label: 'Position Closed', description: 'Notify when a position is closed' },
                                    { label: 'Take Profit Hit', description: 'Notify when take profit is triggered' },
                                    { label: 'Stop Loss Hit', description: 'Notify when stop loss is triggered' }
                                ].map((item, index) => (
                                    <label key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                        <div className="space-y-0.5">
                                            <div className="font-medium text-white">{item.label}</div>
                                            <div className="text-sm text-white/60">{item.description}</div>
                                        </div>
                                        <input type="checkbox" className="toggle" defaultChecked />
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'sound':
                return (
                    <div className="space-y-6">
                        <div className="bg-white/5 rounded-xl border border-white/10 backdrop-blur-md p-4">
                            <div className="mb-4">
                                <h3 className="font-medium text-white">Sound Settings</h3>
                                <p className="text-sm text-white/60">Configure sound effects and volume</p>
                            </div>
                            <div className="space-y-4">
                                <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                    <div className="space-y-0.5">
                                        <div className="font-medium text-white">Enable Sound Effects</div>
                                        <div className="text-sm text-white/60">Play sounds for important events</div>
                                    </div>
                                    <input type="checkbox" className="toggle" defaultChecked />
                                </label>
                                <div className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-white">Volume</span>
                                        <span className="text-sm text-white/60">80%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        className="w-full accent-blue-500" 
                                        defaultValue="80" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'chat':
                return (
                    <div className="space-y-6">
                        <div className="bg-white/5 rounded-xl border border-white/10 backdrop-blur-md p-4">
                            <div className="mb-4">
                                <h3 className="font-medium text-white">Chat Settings</h3>
                                <p className="text-sm text-white/60">Configure chat preferences</p>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { label: 'Show Chat', description: 'Display chat panel in the terminal' },
                                    { label: 'Chat Notifications', description: 'Show notifications for new messages' }
                                ].map((item, index) => (
                                    <label key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                        <div className="space-y-0.5">
                                            <div className="font-medium text-white">{item.label}</div>
                                            <div className="text-sm text-white/60">{item.description}</div>
                                        </div>
                                        <input type="checkbox" className="toggle" defaultChecked />
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-[100]">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-4xl bg-magic-card/95 rounded-xl shadow-lg relative border border-white/10">
                    <div className="flex h-[700px] max-h-[85vh]">
                        {/* Sidebar */}
                        <div className="w-72 border-r border-white/10 bg-black/20 backdrop-blur-md rounded-l-xl">
                            <div className="p-4 border-b border-white/10 sticky top-0 bg-black/30 backdrop-blur-md">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-semibold text-white">Settings</h2>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-lg hover:bg-white/10 transition-all text-white"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <nav className="p-3 space-y-1">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all ${
                                                activeTab === tab.id
                                                    ? 'bg-white/10 text-blue-400'
                                                    : 'text-white/90 hover:bg-white/5'
                                            }`}
                                        >
                                            <Icon className="w-5 h-5 mt-0.5" />
                                            <div className="text-left">
                                                <div className="font-medium">{tab.label}</div>
                                                <div className={`text-sm ${activeTab === tab.id ? 'text-blue-400/80' : 'text-white/60'}`}>
                                                    {tab.description}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-6 overflow-y-auto bg-black/20 backdrop-blur-md rounded-r-xl">
                            <div className="text-white">
                                {renderTabContent()}
                            </div>
                        </div>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default SettingsPanel;
