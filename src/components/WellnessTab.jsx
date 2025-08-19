import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function WellnessTab({
  water,
  setWater,
  gratitude,
  setGratitude,
  moodPercentages,
  setMoodPercentages,
  hasInteracted,
  setHasInteracted,
  monthlyMoods,
  setMonthlyMoods,
  showWords,
  setShowWords,
  moodEmojis,
  setMoodEmojis,
}) {
  const [breathing, setBreathing] = useState(false);

  // Local state for UI only (not persisted)
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null); // Track which mood is showing emoji picker

  // Emoji library for picker
  const emojiLibrary = [
    '😠',
    '😡',
    '🤬',
    '😤',
    '💢', // Angry
    '😔',
    '😢',
    '😭',
    '😿',
    '💔', // Sad
    '😐',
    '😑',
    '😶',
    '🙄',
    '😒', // Neutral
    '🙂',
    '😊',
    '😌',
    '😇',
    '☺️', // Happy
    '😁',
    '😄',
    '🤩',
    '😍',
    '🥰', // Excited/Love
    '😴',
    '😪',
    '🥱',
    '😵',
    '🤕', // Tired/Sick
    '🤔',
    '🧐',
    '😯',
    '😲',
    '😳', // Thinking/Surprised
    '😎',
    '🤓',
    '🥳',
    '🤗',
    '😏', // Cool/Confident
    '😰',
    '😨',
    '😱',
    '🫨',
    '😬', // Anxious/Scared
    '🤐',
    '😷',
    '🤢',
    '🤮',
    '🥴', // Other
  ];

  // Color palette for picker
  const colorPalette = [
    '#ff6b6b',
    '#ff9f43',
    '#f7dc6f',
    '#45b7d1',
    '#10ac84',
    '#ff4757',
    '#ff6348',
    '#ffa502',
    '#f1c40f',
    '#2ed573',
    '#3742fa',
    '#2f3542',
    '#a4b0be',
    '#ff3838',
    '#ff9500',
    '#ffdd59',
    '#0abde3',
    '#00d2d3',
    '#ff006e',
    '#8e44ad',
    '#e74c3c',
    '#f39c12',
    '#f1c40f',
    '#27ae60',
    '#3498db',
    '#9b59b6',
    '#34495e',
    '#95a5a6',
    '#e67e22',
    '#16a085',
  ];

  // Get today's date string
  const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Calendar state for mood tracking
  const [calendarView, setCalendarView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Generate calendar matrix for mood calendar
  const generateCalendarMatrix = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0

    const matrix = [];
    let currentDate = 1;

    // Generate 6 weeks (42 days)
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const dayIndex = week * 7 + day;
        if (dayIndex < startingDayOfWeek || currentDate > daysInMonth) {
          weekDays.push(null);
        } else {
          weekDays.push(currentDate);
          currentDate++;
        }
      }
      matrix.push(weekDays);
    }

    return matrix;
  };

  // Navigate calendar months
  const navigateMonth = delta => {
    setCalendarView(prev => {
      const newDate = new Date(prev.year, prev.month + delta, 1);
      return { year: newDate.getFullYear(), month: newDate.getMonth() };
    });
  };

  // Get mood for specific date
  const getMoodForDate = dateString => {
    return monthlyMoods[dateString] || null;
  };

  // Calculate total mood percentage
  const totalMoodPercentage = Object.values(moodPercentages).reduce((sum, percentage) => sum + percentage, 0);

  // Generate random color for mood bubble (reusing from Present Goals)
  const generateRandomColor = () => {
    const colors = [
      '#ff6b6b',
      '#4ecdc4',
      '#45b7d1',
      '#96ceb4',
      '#ffeaa7',
      '#dda0dd',
      '#98d8c8',
      '#f7dc6f',
      '#bb8fce',
      '#85c1e9',
      '#f8c471',
      '#82e0aa',
      '#f1948a',
      '#85c1e9',
      '#d7bde2',
      '#ff9ff3',
      '#54a0ff',
      '#5f27cd',
      '#00d2d3',
      '#ff9f43',
      '#10ac84',
      '#ee5a24',
      '#0984e3',
      '#6c5ce7',
      '#a29bfe',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Build progressive gradient from mood percentages (like Present Goals)
  const buildMoodGradient = () => {
    const activeMoods = Object.entries(moodPercentages)
      .filter(([_, percentage]) => percentage > 0)
      .sort(([a], [b]) => a.localeCompare(b)); // Sort for consistency

    if (activeMoods.length === 0) {
      return 'transparent';
    }

    if (activeMoods.length === 1) {
      // Single color for first mood
      return moodEmojis[activeMoods[0][0]].color;
    }

    // Multiple moods - create progressive gradient like Present Goals
    const colors = activeMoods.map(([moodKey, _]) => moodEmojis[moodKey].color);
    const step = 100 / (colors.length - 1);
    const gradientStops = colors.map((color, index) => `${color} ${Math.round(index * step)}%`).join(', ');

    return `linear-gradient(180deg, ${gradientStops})`;
  };

  // Get border color from first active mood
  const getBorderColor = () => {
    const firstActiveMood = Object.entries(moodPercentages)
      .filter(([_, percentage]) => percentage > 0)
      .sort(([a], [b]) => a.localeCompare(b))[0];

    if (firstActiveMood) {
      return moodEmojis[firstActiveMood[0]].color + '40'; // Add transparency
    }
    return '#e5e7eb'; // Default gray border
  };

  // Handle mood selection (add 20% each click)
  const handleMoodSelect = moodKey => {
    setHasInteracted(true);
    setMoodPercentages(prev => {
      const currentPercentage = prev[moodKey] || 0;
      const newPercentage = Math.min(100, currentPercentage + 20);

      // Calculate if total would exceed 100%
      const otherMoodsTotal = Object.entries(prev)
        .filter(([key]) => key !== moodKey)
        .reduce((sum, [_, percentage]) => sum + percentage, 0);

      if (otherMoodsTotal + newPercentage > 100) {
        // Cap at remaining percentage
        return {
          ...prev,
          [moodKey]: Math.max(0, 100 - otherMoodsTotal),
        };
      }

      const updatedMoods = {
        ...prev,
        [moodKey]: newPercentage,
      };

      // Save to monthly moods immediately
      const today = getTodayDateString();
      const totalPerc = Object.values(updatedMoods).reduce((sum, percentage) => sum + percentage, 0);

      if (totalPerc > 0) {
        const activeMoods = Object.entries(updatedMoods)
          .filter(([_, percentage]) => percentage > 0)
          .sort(([a], [b]) => a.localeCompare(b));

        let gradient = 'transparent';
        if (activeMoods.length === 1) {
          gradient = moodEmojis[activeMoods[0][0]].color;
        } else if (activeMoods.length > 1) {
          const colors = activeMoods.map(([moodKey, _]) => moodEmojis[moodKey].color);
          const step = 100 / (colors.length - 1);
          const gradientStops = colors.map((color, index) => `${color} ${Math.round(index * step)}%`).join(', ');
          gradient = `linear-gradient(180deg, ${gradientStops})`;
        }

        setMonthlyMoods(prevMonthly => ({
          ...prevMonthly,
          [today]: {
            percentages: { ...updatedMoods },
            gradient: gradient,
            totalPercentage: totalPerc,
            savedAt: Date.now(),
          },
        }));
      }

      return updatedMoods;
    });
  };

  // Reset mood
  const resetMood = () => {
    setMoodPercentages({});
    setHasInteracted(false);
  };

  // Handle emoji/color customization
  const updateMoodCustomization = (moodKey, field, value) => {
    setMoodEmojis(prev => ({
      ...prev,
      [moodKey]: {
        ...prev[moodKey],
        [field]: value,
      },
    }));
  };

  // Handle emoji selection from library
  const selectEmoji = (moodKey, emoji) => {
    updateMoodCustomization(moodKey, 'emoji', emoji);
    setShowEmojiPicker(null);
  };

  return (
    <div className="space-y-6">
      {/* First row - original cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle>Hydration</CardTitle>
            <CardDescription>Goal: 8 cups / day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Button className="rounded-xl" onClick={() => setWater(w => Math.max(0, w - 1))}>
                -1
              </Button>
              <div className="text-4xl font-extrabold tabular-nums">{water}</div>
              <Button className="rounded-xl" onClick={() => setWater(w => Math.min(12, w + 1))}>
                +1
              </Button>
            </div>
            <Progress value={(water / 8) * 100} className="mt-4 h-3 rounded-xl" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle>Gratitude note</CardTitle>
            <CardDescription>Protect your vibe 💖</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={gratitude}
              onChange={e => setGratitude(e.target.value)}
              className="rounded-xl"
              placeholder="One thing you're grateful for today…"
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle>Breathing box</CardTitle>
            <CardDescription>4 in · 4 hold · 4 out · 4 hold</CardDescription>
          </CardHeader>
          <CardContent>
            <motion.div
              animate={{ scale: breathing ? [1, 1.2, 1.2, 1, 1] : 1 }}
              transition={{ duration: 16, repeat: breathing ? Infinity : 0 }}
              className="w-28 h-28 mx-auto rounded-2xl bg-gradient-to-br from-fuchsia-500 to-sky-500"
            />
            <Button onClick={() => setBreathing(b => !b)} className="rounded-xl w-full mt-4">
              {breathing ? 'Stop' : 'Start'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Mood Bubble Card */}
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>💭</span>
            Mood Bubble
          </CardTitle>
          <CardDescription>Track and visualize your daily emotions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Today's Mood Bubble */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">Today's Mood Bubble</h3>

                {/* Mood Circle with Percentage Display */}
                <div className="flex items-center justify-center gap-6">
                  {/* Percentage Display */}
                  {hasInteracted && (
                    <div className="space-y-2 min-w-[100px]">
                      <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">Breakdown</div>
                      {Object.entries(moodPercentages)
                        .filter(([_, percentage]) => percentage > 0)
                        .map(([moodKey, percentage]) => (
                          <div key={moodKey} className="flex items-center gap-2">
                            <span className="text-sm">{moodEmojis[moodKey].emoji}</span>
                            <div className="flex-1">
                              <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{percentage}%</div>
                              <div
                                className="h-1.5 rounded-full"
                                style={{ backgroundColor: moodEmojis[moodKey].color + '30' }}
                              >
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${(percentage / 100) * 100}%`,
                                    backgroundColor: moodEmojis[moodKey].color,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      {totalMoodPercentage > 0 && (
                        <div className="border-t pt-2 mt-2">
                          <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            Total: {totalMoodPercentage}%
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mood Circle */}
                  <div className="relative w-24 h-24">
                    <div
                      className="w-full h-full rounded-full border-4 bg-white dark:bg-zinc-900 overflow-hidden relative transition-all duration-1000"
                      style={{
                        borderColor: getBorderColor(),
                      }}
                    >
                      {/* Mood Fill with Gradient */}
                      {totalMoodPercentage > 0 && (
                        <div
                          className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out"
                          style={{
                            height: `${Math.min(totalMoodPercentage, 100)}%`,
                            background: buildMoodGradient(),
                          }}
                        >
                          {/* Water Wave Effect */}
                          <div
                            className="absolute top-0 left-0 right-0 h-1.5 opacity-70"
                            style={{
                              background:
                                'radial-gradient(ellipse at center, rgba(255,255,255,0.3) 0%, transparent 70%)',
                              animation: 'wave 2s ease-in-out infinite',
                            }}
                          />
                        </div>
                      )}

                      {/* Mood Status in Center */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          {totalMoodPercentage > 0 ? (
                            <div>
                              <div className="text-lg font-bold text-zinc-700 dark:text-zinc-300">
                                {totalMoodPercentage}%
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-lg text-zinc-400">?</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mood Selection Circles */}
                <div className="flex justify-center gap-3 mt-4">
                  {Object.entries(moodEmojis).map(([key, mood]) => {
                    const currentPercentage = moodPercentages[key] || 0;
                    const isActive = currentPercentage > 0;

                    return (
                      <div key={key} className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => handleMoodSelect(key)}
                          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm transition-all duration-200 hover:scale-110 relative ${
                            isActive ? 'border-white shadow-lg scale-110' : 'border-white/50 hover:border-white'
                          }`}
                          style={{
                            backgroundColor: mood.color,
                            boxShadow: isActive ? `0 0 15px ${mood.color}40` : 'none',
                          }}
                          title={`${mood.emoji} ${showWords && mood.word ? mood.word : key} - Click to add 20%`}
                        >
                          {mood.emoji}
                          {/* Click indicator */}
                          {isActive && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center text-xs font-bold text-zinc-800">
                              {Math.floor(currentPercentage / 20)}
                            </div>
                          )}
                        </button>

                        {/* Word label */}
                        {showWords && mood.word && (
                          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 min-h-[14px] text-center">
                            {mood.word}
                          </div>
                        )}

                        {/* Percentage label */}
                        {hasInteracted && (
                          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 min-h-[14px]">
                            {currentPercentage > 0 ? `${currentPercentage}%` : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetMood}
                    className="rounded-xl"
                    disabled={totalMoodPercentage === 0}
                  >
                    Reset
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomizeDialogOpen(true)}
                    className="rounded-xl"
                  >
                    Customize
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column - Monthly Calendar */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">This Month</h3>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)} className="rounded-xl p-2">
                    ‹
                  </Button>
                  <div className="text-sm font-medium min-w-[120px] text-center">
                    {new Date(calendarView.year, calendarView.month).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)} className="rounded-xl p-2">
                    ›
                  </Button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="space-y-2">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 text-xs font-medium text-zinc-500 text-center">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarMatrix(calendarView.year, calendarView.month)
                    .flat()
                    .map((day, index) => {
                      if (!day) {
                        return <div key={index} className="h-8" />;
                      }

                      const dateString = `${calendarView.year}-${String(calendarView.month + 1).padStart(
                        2,
                        '0'
                      )}-${String(day).padStart(2, '0')}`;
                      const dayMood = getMoodForDate(dateString);
                      const isToday = dateString === getTodayDateString();

                      return (
                        <div
                          key={index}
                          className={`group relative h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 hover:scale-110 ${
                            isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                          }`}
                          style={{
                            background: dayMood ? dayMood.gradient : isToday ? '#f1f5f9' : 'transparent',
                            color: dayMood ? '#fff' : isToday ? '#334155' : '#64748b',
                          }}
                        >
                          {day}

                          {/* Hover Tooltip for Mood Breakdown */}
                          {dayMood && (
                            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                              <div className="bg-white dark:bg-zinc-800 shadow-xl rounded-xl p-3 border border-white/20 dark:border-white/10 min-w-[200px]">
                                {/* Date Header */}
                                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 text-center">
                                  {new Date(
                                    `${calendarView.year}-${String(calendarView.month + 1).padStart(2, '0')}-${String(
                                      day
                                    ).padStart(2, '0')}`
                                  ).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </div>

                                {/* Total Percentage */}
                                <div className="text-center mb-3">
                                  <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                    {dayMood.totalPercentage}%
                                  </div>
                                  <div className="text-xs text-zinc-500">total mood</div>
                                </div>

                                {/* Mood Breakdown */}
                                <div className="space-y-2">
                                  {Object.entries(dayMood.percentages || {})
                                    .filter(([_, percentage]) => percentage > 0)
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .map(([moodKey, percentage]) => {
                                      const moodConfig = moodEmojis[moodKey] || {
                                        emoji: '😐',
                                        word: moodKey,
                                        color: '#6b7280',
                                      };
                                      return (
                                        <div key={moodKey} className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm">{moodConfig.emoji}</span>
                                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                                              {moodConfig.word}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <div
                                              className="w-3 h-3 rounded-full"
                                              style={{ backgroundColor: moodConfig.color }}
                                            />
                                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                              {percentage}%
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>

                                {/* Tooltip Arrow */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white dark:border-t-zinc-800"></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Streak Indicator */}
                <div className="flex items-center justify-center gap-2 mt-4 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                  <span className="text-orange-600 text-sm">🔥</span>
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    {Object.keys(monthlyMoods).length} day{Object.keys(monthlyMoods).length !== 1 ? 's' : ''} tracked
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customize Dialog */}
      <Dialog open={customizeDialogOpen} onOpenChange={setCustomizeDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md bg-white dark:bg-white border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle>Customize Mood Emojis</DialogTitle>
            <DialogDescription>Personalize your mood emojis and colors</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Word Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <Label className="font-medium">Show mood words</Label>
              <Switch checked={showWords} onCheckedChange={setShowWords} className="data-[state=checked]:bg-blue-600" />
            </div>

            {Object.entries(moodEmojis).map(([key, mood]) => (
              <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <div className="flex items-center gap-2 flex-1">
                  {/* Emoji Input with Picker */}
                  <div className="relative">
                    <Input
                      value={mood.emoji}
                      onChange={e => updateMoodCustomization(key, 'emoji', e.target.value)}
                      className="w-16 text-center rounded-xl cursor-pointer"
                      placeholder="😊"
                      onClick={() => setShowEmojiPicker(showEmojiPicker === key ? null : key)}
                      readOnly
                    />
                    {/* Emoji Picker Dropdown */}
                    {showEmojiPicker === key && (
                      <div className="absolute top-full left-0 mt-1 p-3 rounded-xl bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 shadow-lg z-50 w-64 max-h-48 overflow-y-auto">
                        <div className="grid grid-cols-8 gap-2">
                          {emojiLibrary.map((emoji, index) => (
                            <button
                              key={index}
                              onClick={() => selectEmoji(key, emoji)}
                              className="w-8 h-8 rounded hover:bg-zinc-100 dark:hover:bg-zinc-600 flex items-center justify-center text-lg transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Color Picker */}
                  <div className="relative">
                    <input
                      type="color"
                      value={mood.color}
                      onChange={e => updateMoodCustomization(key, 'color', e.target.value)}
                      className="w-8 h-8 rounded-full border-2 border-white cursor-pointer"
                      title="Click to change color"
                    />
                  </div>

                  {/* Word Input (only when words are enabled) */}
                  {showWords && (
                    <Input
                      value={mood.word || ''}
                      onChange={e => updateMoodCustomization(key, 'word', e.target.value)}
                      className="flex-1 rounded-xl text-sm"
                      placeholder={key}
                    />
                  )}
                </div>
                <Label className="capitalize text-sm text-zinc-600 dark:text-zinc-400 min-w-[60px]">
                  {showWords && mood.word ? mood.word : key}
                </Label>
              </div>
            ))}
            <Button
              onClick={() => {
                setCustomizeDialogOpen(false);
                setShowEmojiPicker(null);
                setShowColorPicker(null);
              }}
              className="w-full rounded-xl mt-4"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
