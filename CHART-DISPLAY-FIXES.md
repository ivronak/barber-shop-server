# Chart Display Fixes

## Issue
The Revenue Trends and Tips & Discounts Over Time charts were overflowing their parent container cards vertically, causing layout issues.

## Root Cause
1. The chart container heights were not properly constrained
2. The ResponsiveContainer in the ComparisonChart component was using a fixed height (300px) rather than adapting to its container
3. The parent Card components didn't have proper overflow handling

## Implemented Fixes

### 1. Modified ComparisonChart Component
```tsx
// Changed from fixed height to responsive height
<ResponsiveContainer width="100%" height="100%">
  {/* chart content */}
</ResponsiveContainer>
```

### 2. Updated Chart Container Elements
```tsx
// Added className="h-full" to ComparisonChart components
<ComparisonChart 
  data={chartData}
  title=""
  showLegend={true}
  currentLabel="Revenue"
  previousLabel="Cost"
  className="h-full"
/>

// Changed chart wrapper divs to use h-full
<div className="h-full">
  {/* chart content */}
</div>
```

### 3. Fixed Card Content Containers
```tsx
// Revenue Trends chart container
<CardContent className="h-80 overflow-hidden">
  {renderRevenueChart()}
</CardContent>

// Tips & Discounts chart container
<CardContent className="px-2 h-80 overflow-hidden">
  <div className="h-full">
    {renderTipsDiscountsChart()}
  </div>
</CardContent>
```

## Key Changes

1. **Height Constraints**: Added fixed heights to card content containers (h-80)
2. **Overflow Handling**: Added overflow-hidden to prevent content from spilling outside
3. **Responsive Height**: Changed the chart component to use 100% height
4. **Consistent Height Chain**: Ensured all parent-child elements have proper height settings

## Benefits

1. Charts now display correctly within their containers
2. No vertical overflow issues
3. Consistent layout across different screen sizes
4. Better user experience with properly contained visualizations 