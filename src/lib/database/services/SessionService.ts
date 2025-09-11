import connectDB from '../connection';
import Session, { ISession } from '../models/Session';
import Metric from '../models/Metric';

export interface CreateSessionData {
  userId?: string;
}

export class SessionService {
  static async create(data: CreateSessionData): Promise<ISession> {
    await connectDB();
    
    const session = new Session({
      userId: data.userId,
    });
    
    return await session.save();
  }

  static async findById(id: string): Promise<ISession | null> {
    await connectDB();
    
    return await Session.findById(id).populate({
      path: 'metrics',
      model: Metric,
      options: { sort: { createdAt: 1 } },
    });
  }

  static async list(limit = 50): Promise<ISession[]> {
    await connectDB();
    
    return await Session.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({
        path: 'metrics',
        model: Metric,
        select: '_id',
      });
  }

  static async delete(id: string): Promise<boolean> {
    await connectDB();
    
    // Delete associated metrics first
    await Metric.deleteMany({ sessionId: id });
    
    const result = await Session.findByIdAndDelete(id);
    return !!result;
  }
}