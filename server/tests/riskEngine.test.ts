import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { recalculateSessionRisk } from '../src/services/riskEngine.js';
import { TelemetryEvent } from '../src/models/TelemetryEvent.js';
import { Session } from '../src/models/Session.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await TelemetryEvent.deleteMany({});
  await Session.deleteMany({});
});

describe('recalculateSessionRisk', () => {
  it('should return 0 risk for a clean session', async () => {
    const session = await Session.create({
      examId: new mongoose.Types.ObjectId(),
      candidateId: new mongoose.Types.ObjectId(),
      startedAt: new Date(),
      status: 'active',
      riskScore: 0,
      hmacSecret: 'secret'
    });

    const result = await recalculateSessionRisk(session._id.toString());
    expect(result.totalRisk).toBe(0);
    expect(result.breakdown).toHaveLength(0);
    expect(result.explanation).toContain('Clean');
  });

  it('should accumulate risk and cap it per event type (TAB_SWITCH)', async () => {
    const session = await Session.create({
      examId: new mongoose.Types.ObjectId(),
      candidateId: new mongoose.Types.ObjectId(),
      startedAt: new Date(),
      status: 'active',
      riskScore: 0,
      hmacSecret: 'secret'
    });

    // 4 TAB_SWITCH events. Each is 15. Total = 60, but cap is 45.
    const events = Array.from({ length: 4 }).map(() => ({
      sessionId: session._id,
      candidateId: session.candidateId,
      examId: session.examId,
      timestamp: Date.now(),
      eventType: 'TAB_SWITCH',
      metadata: {}
    }));

    await TelemetryEvent.insertMany(events);

    const result = await recalculateSessionRisk(session._id.toString());
    
    expect(result.totalRisk).toBe(45);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0].contributedRisk).toBe(45); // capped at 45
    expect(result.explanation).toContain('Tab switched');
  });

  it('should auto-flag session if risk goes above CRITICAL', async () => {
    const session = await Session.create({
      examId: new mongoose.Types.ObjectId(),
      candidateId: new mongoose.Types.ObjectId(),
      startedAt: new Date(),
      status: 'active',
      riskScore: 0,
      hmacSecret: 'secret'
    });

    // MULTIPLE_FACES is 50 each, cap 100
    // 2 MULTIPLE_FACES = 100 risk. CRITICAL is 90.
    const events = Array.from({ length: 2 }).map(() => ({
      sessionId: session._id,
      candidateId: session.candidateId,
      examId: session.examId,
      timestamp: Date.now(),
      eventType: 'MULTIPLE_FACES',
      metadata: {}
    }));

    await TelemetryEvent.insertMany(events);

    const result = await recalculateSessionRisk(session._id.toString());
    
    expect(result.totalRisk).toBe(100);
    expect(result.explanation).toContain('Critical');

    // Check if session was updated to 'flagged'
    const updatedSession = await Session.findById(session._id);
    expect(updatedSession?.status).toBe('flagged');
  });
});
