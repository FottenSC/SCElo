import { useMemo } from 'react'
import HighchartsReact from 'highcharts-react-official'
import Highcharts from 'highcharts'
import StockModule from 'highcharts/modules/stock'

// Initialize Highcharts Stock module (registers candlestick, navigator, etc.)
try {
  const initStock = (StockModule as any).default || StockModule
  if (typeof window !== 'undefined' && typeof initStock === 'function') {
    initStock(Highcharts)
  }
} catch (err) {
  // If module initialization fails, log for debugging but don't crash the app here
  // The runtime error will still surface if the series type is missing.
  // eslint-disable-next-line no-console
  console.error('Failed to initialize Highcharts Stock module:', err)
}

export interface RatingDataPoint {
  matchNum: number
  rating: number
  change: number
  won: boolean
  matchId: number
  opponentName: string
  eventTitle: string | null
  isReset: boolean
}

interface RatingProgressionChartProps {
  data: RatingDataPoint[]
  onMatchClick?: (matchId: number) => void
}

export function RatingProgressionChart({ data, onMatchClick }: RatingProgressionChartProps) {
  const chartOptions = useMemo(() => {
    const candleData: Array<
      | [number, number, number, number, number]
      | { x: number; open: number; high: number; low: number; close: number; color?: string; lineColor?: string; upColor?: string; upLineColor?: string }
    > = []
    let previousRating = 1500 // Default starting rating

    data.forEach((point, index) => {
      let open = previousRating
      const close = point.rating
      const high = Math.max(open, close) + 5
      const low = Math.min(open, close) - 5
      
      // Style reset points in grey, others use default colors
      if (point.isReset) {
        candleData.push({
          x: index,
          open,
          high,
          low,
          close,
          color: '#6b7280',
          lineColor: '#4b5563',
          upColor: '#6b7280',
          upLineColor: '#4b5563',
        })
      } else {
        candleData.push([index, open, high, low, close])
      }
      previousRating = close
    })

    return {
      chart: {
        type: 'candlestick',
        backgroundColor: 'transparent',
        height: 400,
        spacingBottom: 20,
      },
      credits: { enabled: true },
      exporting: { enabled: true },
      navigator: { enabled: false },
      scrollbar: { enabled: false },
      rangeSelector: { enabled: false },
      title: null as unknown,
      subtitle: null as unknown,
      xAxis: {
        type: 'linear',
        title: {
          text: 'Match Number',
          style: {
            fontSize: '12px',
          },
        },
        labels: {
          formatter: function (this: any): string {
            return String(this.value + 1)
          },
        },
        // Ensure the chart shows the full data range on first render
        min: data.length > 0 ? 0 : undefined,
        max: data.length > 0 ? Math.max(0, data.length - 1) : undefined,
        plotLines: [],
        accessibility: {
          rangeDescription: 'Range: Match 1 to ' + data.length,
        },
      } as any,
      yAxis: {
        title: {
          text: 'Rating',
          style: {
            fontSize: '12px',
          },
        },
        opposite: false,
        accessibility: {
          description: 'Rating value',
        },
      } as any,
      legend: {
        enabled: false,
      },
      plotOptions: {
        candlestick: {
          color: '#ef4444',
          upColor: '#22c55e',
          lineColor: '#ef4444',
          upLineColor: '#22c55e',
          dataLabels: {
            enabled: false,
          },
        },
        series: {
          cursor: 'pointer',
          point: {
            events: {
              click: function (this: any) {
                const dataPoint = data[this.x]
                if (onMatchClick && dataPoint && !dataPoint.isReset) {
                  onMatchClick(dataPoint.matchId)
                }
              },
            },
          },
        },
      } as any,
      tooltip: {
        shared: true,
        useHTML: true,
        formatter: function (this: any): string {
          if (!this.points || this.points.length === 0) return ''

          const point = data[this.x] as RatingDataPoint | undefined
          if (!point) return ''

          if (point.isReset) {
            // For reset, find the previous rating
            let previousRating = 1500
            for (let i = this.x - 1; i >= 0; i--) {
              if (data[i] && !data[i]?.isReset) {
                previousRating = data[i]?.rating || 1500
                break
              }
            }
            
            const ratingDrop = previousRating - point.rating
            
            return `<div class="highcharts-tooltip-custom">
              <div style="font-weight: bold; color: #4b5563;">🔄 Season Reset</div>
              <div style="margin-top: 4px; font-size: 12px; color: #374151;">
                <div>Previous Rating: <b>${previousRating.toFixed(0)}</b></div>
                <div>Reset to: <b>${point.rating.toFixed(0)}</b></div>
                ${ratingDrop > 0 ? `<div style="color: #ef4444; font-weight: bold;">Rating Drop: -${ratingDrop.toFixed(0)}</div>` : ''}
                <div style="margin-top: 4px; font-size: 11px; color: #6b7280;">New season begins at 1500</div>
              </div>
            </div>`
          }

          const changeColor = point.change >= 0 ? '#22c55e' : '#ef4444'
          const changeSign = point.change >= 0 ? '+' : ''
          const result = point.won ? '✓ Win' : '✗ Loss'
          const resultColor = point.won ? '#22c55e' : '#ef4444'

          return `<div class="highcharts-tooltip-custom">
            <div style="font-weight: bold; color: ${resultColor};">${result} vs ${point.opponentName}</div>
            <div style="margin-top: 4px; font-size: 12px;">
              <div>Rating: <b>${point.rating.toFixed(0)}</b></div>
              <div style="color: ${changeColor};">Change: <b>${changeSign}${point.change.toFixed(1)}</b></div>
              ${point.eventTitle ? `<div style="margin-top: 4px; font-size: 11px;">Event: ${point.eventTitle}</div>` : ''}
            </div>
          </div>`
        },
      } as any,
      series: [
        {
          name: 'Rating Progress',
          data: candleData,
          type: 'candlestick' as const,
        },
      ] as any,
      responsive: {
        rules: [
          {
            condition: {
              maxWidth: 500,
            },
            chartOptions: {
              chart: {
                height: 300,
              },
              xAxis: {
                labels: {
                  enabled: false,
                },
              },
              legend: {
                layout: 'vertical' as const,
                align: 'right' as const,
                verticalAlign: 'middle' as const,
              },
            },
          },
        ],
      },
    } as any
  }, [data, onMatchClick])

  return (
    <div className="w-full overflow-hidden">
      <HighchartsReact
        highcharts={Highcharts}
        options={chartOptions}
        constructorType="chart"
      />
    </div>
  )
}
