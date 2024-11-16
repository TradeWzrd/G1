import React from 'react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Separator } from './ui/separator';
import { Settings2 } from 'lucide-react';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { useTheme } from './ThemeProvider';

const ThemeCustomizer = () => {
    const { theme, setTheme, radius, setRadius, saturation, setSaturation } = useTheme();

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <Settings2 className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="space-y-4">
                    <h4 className="font-medium leading-none">Theme Customizer</h4>
                    <p className="text-sm text-magic-muted">
                        Customize the appearance of the interface
                    </p>
                    <Separator />
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium leading-none">Mode</h4>
                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                variant={theme === 'light' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTheme('light')}
                                className="w-full"
                            >
                                Light
                            </Button>
                            <Button
                                variant={theme === 'dark' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTheme('dark')}
                                className="w-full"
                            >
                                Dark
                            </Button>
                            <Button
                                variant={theme === 'system' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTheme('system')}
                                className="w-full"
                            >
                                System
                            </Button>
                        </div>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="radius">Radius</Label>
                            <Slider
                                id="radius"
                                min={0}
                                max={1}
                                step={0.1}
                                value={[radius]}
                                onValueChange={([value]) => setRadius(value)}
                                className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="saturation">Saturation</Label>
                            <Slider
                                id="saturation"
                                min={0}
                                max={1}
                                step={0.1}
                                value={[saturation]}
                                onValueChange={([value]) => setSaturation(value)}
                                className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                            />
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default ThemeCustomizer;
