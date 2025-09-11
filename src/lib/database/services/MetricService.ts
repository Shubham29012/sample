import connectDB from '../connection';
import Metric, { IMetric } from '../models/Metric';
import mongoose from 'mongoose';

export interface CreateMetricData {
  sessionId: string;
  shapeId: string;
  nearCount: number;
  farCount: number;
  coverage: number;
  timeElapsed: number;
  brushColor?: string;
  brushSize?: number;
  totalStrokes?: number;
}

export class MetricService {
  static async create(data: CreateMetricData): Promise<IMetric> {
    await connectDB();
    
    const metric = new Metric({
      sessionId: new mongoose.Types.ObjectId(data.sessionId),
      shapeId: data.shapeId,
      nearCount: data.nearCount,
      farCount: data.farCount,
      coverage: data.coverage,
      timeElapsed: data.timeElapsed,
      brushColor: data.brushColor,
      brushSize: data.brushSize,
      totalStrokes: data.totalStrokes || 0,
    });
    
    return await metric.save();
  }

  static async findBySession(sessionId: string): Promise<IMetric[]> {
    await connectDB();
    
    return await Metric.find({ 
      sessionId: new mongoose.Types.ObjectId(sessionId) 
    }).sort({ createdAt: 1 });
  }

  static async getAggregatedData() {
    await connectDB();
    
    const pipeline = [
      {
        $group: {
          _id: null,
          totalMetrics: { $sum: 1 },
          avgCoverage: { $avg: '$coverage' },
          avgNearCount: { $avg: '$nearCount' },
          avgFarCount: { $avg: '$farCount' },
          avgTimeElapsed: { $avg: '$timeElapsed' },
          maxCoverage: { $max: '$coverage' },
          minCoverage: { $min: '$coverage' },
        },
      },
    ];

    const result = await Metric.aggregate(pipeline);
    const totalSessions = await mongoose.model('Session').countDocuments();

    return {
      totalSessions,
      totalMetrics: result[0]?.totalMetrics || 0,
      averages: {
        coverage: result[0]?.avgCoverage || 0,
        nearCount: result[0]?.avgNearCount || 0,
        farCount: result[0]?.avgFarCount || 0,
        timeElapsed: result[0]?.avgTimeElapsed || 0,
      },
      extremes: {
        maxCoverage: result[0]?.maxCoverage || 0,
        minCoverage: result[0]?.minCoverage || 0,
      },
    };
  }

  static async getShapeAnalytics() {
    await connectDB();
    
    return await Metric.aggregate([
      {
        $group: {
          _id: '$shapeId',
          count: { $sum: 1 },
          avgCoverage: { $avg: '$coverage' },
          avgNearCount: { $avg: '$nearCount' },
          avgFarCount: { $avg: '$farCount' },
          avgTimeElapsed: { $avg: '$timeElapsed' },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);
  }
}