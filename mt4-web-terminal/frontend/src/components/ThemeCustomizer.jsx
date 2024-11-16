import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from './ThemeProvider';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Separator } from './ui/separator';

// Shadcn Theme Templates
const themes = [
    {
        name: "Zinc",
        label: "Zinc",
        activeColor: "240 5.9% 10%",
        cssVars: {
            background: "0 0% 100%",
            foreground: "240 10% 3.9%",
            card: "0 0% 100%",
            "card-foreground": "240 10% 3.9%",
            popover: "0 0% 100%",
            "popover-foreground": "240 10% 3.9%",
            primary: "240 5.9% 10%",
            "primary-foreground": "0 0% 98%",
            secondary: "240 4.8% 95.9%",
            "secondary-foreground": "240 5.9% 10%",
            muted: "240 4.8% 95.9%",
            "muted-foreground": "240 3.8% 46.1%",
            accent: "240 4.8% 95.9%",
            "accent-foreground": "240 5.9% 10%",
            destructive: "0 84.2% 60.2%",
            "destructive-foreground": "0 0% 98%",
            border: "240 5.9% 90%",
            input: "240 5.9% 90%",
            ring: "240 5.9% 10%"
        }
    },
    {
        name: "Rose",
        label: "Rose",
        activeColor: "346.8 77.2% 49.8%",
        cssVars: {
            background: "0 0% 100%",
            foreground: "240 10% 3.9%",
            card: "0 0% 100%",
            "card-foreground": "240 10% 3.9%",
            popover: "0 0% 100%",
            "popover-foreground": "240 10% 3.9%",
            primary: "346.8 77.2% 49.8%",
            "primary-foreground": "355.7 100% 97.3%",
            secondary: "240 4.8% 95.9%",
            "secondary-foreground": "240 5.9% 10%",
            muted: "240 4.8% 95.9%",
            "muted-foreground": "240 3.8% 46.1%",
            accent: "240 4.8% 95.9%",
            "accent-foreground": "240 5.9% 10%",
            destructive: "0 84.2% 60.2%",
            "destructive-foreground": "0 0% 98%",
            border: "240 5.9% 90%",
            input: "240 5.9% 90%",
            ring: "346.8 77.2% 49.8%"
        }
    },
    {
        name: "Blue",
        label: "Blue",
        activeColor: "221.2 83.2% 53.3%",
        cssVars: {
            background: "0 0% 100%",
            foreground: "222.2 84% 4.9%",
            card: "0 0% 100%",
            "card-foreground": "222.2 84% 4.9%",
            popover: "0 0% 100%",
            "popover-foreground": "222.2 84% 4.9%",
            primary: "221.2 83.2% 53.3%",
            "primary-foreground": "210 40% 98%",
            secondary: "210 40% 96.1%",
            "secondary-foreground": "222.2 47.4% 11.2%",
            muted: "210 40% 96.1%",
            "muted-foreground": "215.4 16.3% 46.9%",
            accent: "210 40% 96.1%",
            "accent-foreground": "222.2 47.4% 11.2%",
            destructive: "0 84.2% 60.2%",
            "destructive-foreground": "210 40% 98%",
            border: "214.3 31.8% 91.4%",
            input: "214.3 31.8% 91.4%",
            ring: "221.2 83.2% 53.3%"
        }
    },
    {
        name: "Green",
        label: "Green",
        activeColor: "142.1 76.2% 36.3%",
        cssVars: {
            background: "0 0% 100%",
            foreground: "240 10% 3.9%",
            card: "0 0% 100%",
            "card-foreground": "240 10% 3.9%",
            popover: "0 0% 100%",
            "popover-foreground": "240 10% 3.9%",
            primary: "142.1 76.2% 36.3%",
            "primary-foreground": "355.7 100% 97.3%",
            secondary: "240 4.8% 95.9%",
            "secondary-foreground": "240 5.9% 10%",
            muted: "240 4.8% 95.9%",
            "muted-foreground": "240 3.8% 46.1%",
            accent: "240 4.8% 95.9%",
            "accent-foreground": "240 5.9% 10%",
            destructive: "0 84.2% 60.2%",
            "destructive-foreground": "0 0% 98%",
            border: "240 5.9% 90%",
            input: "240 5.9% 90%",
            ring: "142.1 76.2% 36.3%"
        }
    }
];

const ThemeCustomizer = () => {
    const { theme, setTheme, radius, setRadius, saturation, setSaturation, activeTheme, setActiveTheme } = useTheme();

    const applyTheme = (theme) => {
        setActiveTheme(theme.name);
        const root = document.documentElement;
        Object.entries(theme.cssVars).forEach(([key, value]) => {
            root.style.setProperty(`--${key}`, value);
        });
    };

    return (
        <div className="space-y-6">
            {/* Theme Templates Section */}
            <div className="space-y-3">
                <Label className="text-base">Theme Templates</Label>
                <div className="grid grid-cols-2 gap-2">
                    {themes.map((t) => (
                        <Button
                            key={t.name}
                            variant={activeTheme === t.name ? 'default' : 'outline'}
                            className={`flex items-center justify-between h-16 p-4 ${
                                activeTheme === t.name ? 'border-2 border-primary' : ''
                            }`}
                            onClick={() => applyTheme(t)}
                        >
                            <span className="text-sm font-medium">{t.label}</span>
                            <span
                                className="ml-auto h-4 w-4 rounded-full"
                                style={{ background: `hsl(${t.activeColor})` }}
                            />
                        </Button>
                    ))}
                </div>
            </div>

            <Separator />

            {/* Theme Mode Section */}
            <div className="space-y-3">
                <Label className="text-base">Theme Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                    <Button
                        variant={theme === 'light' ? 'default' : 'outline'}
                        className={`flex flex-col items-center justify-center h-20 p-2 ${
                            theme === 'light' ? 'border-2 border-primary' : ''
                        }`}
                        onClick={() => setTheme('light')}
                    >
                        <Sun className="h-6 w-6 mb-2" />
                        <span className="text-sm">Light</span>
                    </Button>
                    <Button
                        variant={theme === 'dark' ? 'default' : 'outline'}
                        className={`flex flex-col items-center justify-center h-20 p-2 ${
                            theme === 'dark' ? 'border-2 border-primary' : ''
                        }`}
                        onClick={() => setTheme('dark')}
                    >
                        <Moon className="h-6 w-6 mb-2" />
                        <span className="text-sm">Dark</span>
                    </Button>
                    <Button
                        variant={theme === 'system' ? 'default' : 'outline'}
                        className={`flex flex-col items-center justify-center h-20 p-2 ${
                            theme === 'system' ? 'border-2 border-primary' : ''
                        }`}
                        onClick={() => setTheme('system')}
                    >
                        <Monitor className="h-6 w-6 mb-2" />
                        <span className="text-sm">System</span>
                    </Button>
                </div>
            </div>

            <Separator />

            {/* Border Radius Section */}
            <div className="space-y-4 rounded-lg bg-card p-4">
                <div className="flex items-center justify-between">
                    <Label className="text-base">Border Radius</Label>
                    <span className="text-sm px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {radius}px
                    </span>
                </div>
                <Slider
                    value={[radius]}
                    max={20}
                    step={1}
                    className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                    onValueChange={([value]) => setRadius(value)}
                />
                <div className="grid grid-cols-3 gap-2 mt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRadius(0)}
                        className={radius === 0 ? 'border-primary' : ''}
                    >
                        Sharp
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRadius(8)}
                        className={radius === 8 ? 'border-primary' : ''}
                    >
                        Default
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRadius(16)}
                        className={radius === 16 ? 'border-primary' : ''}
                    >
                        Full
                    </Button>
                </div>
            </div>

            {/* Saturation Section */}
            <div className="space-y-4 rounded-lg bg-card p-4">
                <div className="flex items-center justify-between">
                    <Label className="text-base">Color Saturation</Label>
                    <span className="text-sm px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {saturation}%
                    </span>
                </div>
                <Slider
                    value={[saturation]}
                    max={200}
                    step={5}
                    className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                    onValueChange={([value]) => setSaturation(value)}
                />
                <div className="grid grid-cols-3 gap-2 mt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSaturation(50)}
                        className={saturation === 50 ? 'border-primary' : ''}
                    >
                        Less
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSaturation(100)}
                        className={saturation === 100 ? 'border-primary' : ''}
                    >
                        Default
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSaturation(150)}
                        className={saturation === 150 ? 'border-primary' : ''}
                    >
                        More
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ThemeCustomizer;
