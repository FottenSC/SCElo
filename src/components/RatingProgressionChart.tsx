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
        height: 350,
        spacingBottom: 15,
        spacingTop: 10,
        style: {
          fontFamily: 'Lato, sans-serif',
        },
      },
      credits: { enabled: false },
      exporting: { enabled: true },
      navigator: { enabled: false },
      scrollbar: { enabled: false },
      rangeSelector: { enabled: false },
      title: null as unknown,
      subtitle: null as unknown,
      xAxis: {
        type: 'linear',
        title: {
          text: 'Match #',
          style: {
            fontSize: '11px',
            color: '#9ca3af',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
        },
        labels: {
          style: {
            color: '#6b7280',
            fontSize: '10px',
          },
          formatter: function (this: any): string {
            return String(this.value + 1)
          },
        },
        lineColor: '#374151',
        tickColor: '#374151',
        gridLineColor: '#1f2937',
        gridLineWidth: 1,
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
            fontSize: '11px',
            color: '#9ca3af',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
        },
        labels: {
          style: {
            color: '#6b7280',
            fontSize: '10px',
          },
        },
        gridLineColor: '#1f2937',
        gridLineWidth: 1,
        lineColor: '#374151',
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
        backgroundColor: 'rgba(15, 20, 30, 0.95)',
        borderColor: 'rgba(234, 179, 8, 0.5)',
        borderRadius: 8,
        borderWidth: 1,
        shadow: {
          color: 'rgba(0, 0, 0, 0.5)',
          offsetX: 0,
          offsetY: 4,
          opacity: 0.5,
          width: 10,
        },
        style: {
          color: '#e5e7eb',
          fontFamily: 'Lato, sans-serif',
        },
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

            return `<div class="p-2 min-w-[200px]">
              <div style="font-family: 'Cinzel', serif; font-weight: bold; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #4b5563; padding-bottom: 4px; margin-bottom: 4px;">🔄 Season Reset</div>
              <div style="font-size: 12px; color: #d1d5db;">
                <div style="display: flex; justify-content: space-between;"><span>Previous Rating:</span> <b>${previousRating.toFixed(0)}</b></div>
                <div style="display: flex; justify-content: space-between;"><span>Reset to:</span> <b>${point.rating.toFixed(0)}</b></div>
                ${ratingDrop > 0 ? `<div style="color: #ef4444; font-weight: bold; margin-top: 4px;">Rating Drop: -${ratingDrop.toFixed(0)}</div>` : ''}
                <div style="margin-top: 6px; font-size: 10px; color: #9ca3af; font-style: italic;">New season begins at 1500</div>
              </div>
            </div>`
          }

          const changeColor = point.change >= 0 ? '#22c55e' : '#ef4444'
          const changeSign = point.change >= 0 ? '+' : ''
          const result = point.won ? 'VICTORY' : 'DEFEAT'
          const resultColor = point.won ? '#22c55e' : '#ef4444'

          return `<div class="p-2 min-w-[200px]">
            <div style="font-family: 'Cinzel', serif; font-weight: bold; color: ${resultColor}; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid ${resultColor}40; padding-bottom: 4px; margin-bottom: 4px;">${result}</div>
            <div style="font-size: 12px; color: #d1d5db;">
              <div style="margin-bottom: 4px;">vs <span style="font-weight: bold; color: #fff;">${point.opponentName}</span></div>
              <div style="display: flex; justify-content: space-between;"><span>Rating:</span> <b>${point.rating.toFixed(0)}</b></div>
              <div style="display: flex; justify-content: space-between; color: ${changeColor};"><span>Change:</span> <b>${changeSign}${point.change.toFixed(1)}</b></div>
              ${point.eventTitle ? `<div style="margin-top: 6px; font-size: 10px; color: #ca8a04; border-top: 1px solid #ca8a0440; padding-top: 4px;">${point.eventTitle}</div>` : ''}
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
                height: 280,
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
        immutable={true}
      />
    </div>
  )
}
