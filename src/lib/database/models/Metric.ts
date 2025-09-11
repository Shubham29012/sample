import mongoose, { Document, Schema } from 'mongoose';

export interface IMetric extends Document {
  _id: string;
  sessionId: mongoose.Types.ObjectId;
  shapeId: string;
  nearCount: number;
  farCount: number;
  coverage: number;
  timeElapsed: number;
  brushColor?: string;
  brushSize?: number;
  totalStrokes: number;
  createdAt: Date;
  updatedAt: Date;
}

const MetricSchema = new Schema<IMetric>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    shapeId: {
      type: String,
      required: true,
    },
    nearCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    farCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    coverage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    timeElapsed: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    brushColor: {
      type: String,
      required: false,
    },
    brushSize: {
      type: Number,
      required: false,
      min: 1,
      max: 50,
    },
    totalStrokes: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'metrics',
  }
);

// Add indexes for better query performance
MetricSchema.index({ sessionId: 1, createdAt: 1 });
MetricSchema.index({ shapeId: 1 });

export default mongoose.models.Metric || mongoose.model<IMetric>('Metric', MetricSchema);