// components/PieChartCard.tsx
import React from 'react';

interface PieChartData {
  name: string;
  value: number;
}

interface PieChartCardProps {
  title: string;
  data: PieChartData[];
  icon: React.ReactNode;
}

const DARK_COLORS = [
  '#1f77b4', // muted blue
  '#ff7f0e', // safety orange
  '#2ca02c', // cooked asparagus green
  '#d62728', // brick red
  '#9467bd', // muted purple
  '#8c564b', // chestnut brown
  '#e377c2', // raspberry pink
  '#7f7f7f', // middle gray
  '#bcbd22', // curry yellow-green
  '#17becf', // blue-teal
  '#393b79', // dark blue
  '#637939', // dark green
  '#8c6d31', // dark gold
  '#843c39', // dark red
  '#7b4173', // dark purple
  '#5254a3', // indigo
  '#6b6ecf', // periwinkle
  '#9c9ede', // lavender
  '#637939', // forest green
  '#8ca252', // moss green
  '#b5cf6b', // lime
  '#cedb9c', // light olive
  '#8c6d31', // bronze
  '#bd9e39', // mustard
];

const PieChartCard: React.FC<PieChartCardProps> = ({ title, data, icon }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-black rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow duration-300">
        <h3 className="text-base sm:text-lg font-bold text-black dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
          <div className="w-4 h-4 sm:w-5 sm:h-5 text-black dark:text-gray-300">{icon}</div>
          {title}
        </h3>
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-600">No data available</p>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className="bg-white dark:bg-black rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow duration-300">
        <h3 className="text-base sm:text-lg font-bold text-black dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
          <div className="w-4 h-4 sm:w-5 sm:h-5 text-black dark:text-gray-300">{icon}</div>
          {title}
        </h3>
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-600">No data available</p>
        </div>
      </div>
    );
  }
  
  let currentAngle = 0;
  const segments = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const innerRadius = 60;
    const outerRadius = 100;
    const centerX = 120;
    const centerY = 120;

    // Special case: if this segment is 100% (or very close), we need to draw a full ring
    const isFullCircle = percentage >= 99.9;
    let pathData;

    if (isFullCircle) {
      // Draw as two semicircles to create a complete ring (workaround for 360° arc limitation)
      pathData = [
        `M ${centerX} ${centerY - outerRadius}`,
        `A ${outerRadius} ${outerRadius} 0 0 1 ${centerX} ${centerY + outerRadius}`,
        `A ${outerRadius} ${outerRadius} 0 0 1 ${centerX} ${centerY - outerRadius}`,
        `M ${centerX} ${centerY - innerRadius}`,
        `A ${innerRadius} ${innerRadius} 0 0 0 ${centerX} ${centerY + innerRadius}`,
        `A ${innerRadius} ${innerRadius} 0 0 0 ${centerX} ${centerY - innerRadius}`,
        `Z`,
      ].join(' ');
    } else {
      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (endAngle - 90) * (Math.PI / 180);

      const x1Outer = centerX + outerRadius * Math.cos(startRad);
      const y1Outer = centerY + outerRadius * Math.sin(startRad);
      const x2Outer = centerX + outerRadius * Math.cos(endRad);
      const y2Outer = centerY + outerRadius * Math.sin(endRad);

      const x1Inner = centerX + innerRadius * Math.cos(startRad);
      const y1Inner = centerY + innerRadius * Math.sin(startRad);
      const x2Inner = centerX + innerRadius * Math.cos(endRad);
      const y2Inner = centerY + innerRadius * Math.sin(endRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      pathData = [
        `M ${x1Outer} ${y1Outer}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}`,
        `L ${x2Inner} ${y2Inner}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1Inner} ${y1Inner}`,
        `Z`,
      ].join(' ');
    }

    return {
      ...item,
      pathData,
      color: DARK_COLORS[index % DARK_COLORS.length],
      percentage: percentage.toFixed(1),
      isFullCircle,
    };
  });

  return (
    <div className="bg-white dark:bg-black rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow duration-300">
      <h3 className="text-base sm:text-lg font-bold text-black dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
        <div className="w-4 h-4 sm:w-5 sm:h-5 text-black dark:text-gray-300">{icon}</div>
        {title}
      </h3>
      
      <div className="flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-8">
        <div className="relative flex-shrink-0 w-full max-w-[240px] mx-auto md:mx-0">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 240 240"
            className="transform hover:scale-105 transition-transform duration-300"
            preserveAspectRatio="xMidYMid meet"
          >
            <circle cx="120" cy="120" r="100" fill="none" stroke="#e5e7eb" strokeWidth="1" className="dark:stroke-gray-700" />
            {segments.map((segment, index) => (
              <g key={index} className="group">
                <path
                  d={segment.pathData}
                  fill={segment.color}
                  className="hover:opacity-80 transition-opacity cursor-pointer drop-shadow-md"
                  stroke="white"
                  strokeWidth="2"
                />
              </g>
            ))}
            <circle cx="120" cy="120" r="60" fill="white" className="dark:fill-black" />
            <text x="120" y="115" textAnchor="middle" className="text-xl sm:text-2xl font-bold fill-black dark:fill-white">
              {data.length}
            </text>
            <text x="120" y="135" textAnchor="middle" className="text-[10px] sm:text-xs fill-gray-500 dark:fill-gray-400">
              Categories
            </text>
          </svg>
        </div>

        <div className="flex-1 space-y-2 sm:space-y-3 w-full min-w-0">
          {segments.map((segment, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0" style={{ backgroundColor: segment.color }}></div>
                <span className="text-xs sm:text-sm font-medium text-black dark:text-gray-300 truncate">{segment.name}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
                <span className="text-xs sm:text-sm font-bold text-black dark:text-white">{segment.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PieChartCard;