import { NextResponse } from 'next/server';
import { MetricService } from '@/lib/database/services/MetricService';

export async function GET() {
  try {
    const [aggregatedData, shapeAnalytics] = await Promise.all([
      MetricService.getAggregatedData(),
      MetricService.getShapeAnalytics(),
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        summary: aggregatedData,
        byShape: shapeAnalytics,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics',
    }, { status: 500 });
  }
}