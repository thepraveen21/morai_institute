import rateLimit from 'express-rate-limit'; // CHANGED: default import for v6

// General rate limit — all routes
export const generalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {       // CHANGED: use handler instead of message
    res.status(429).json({
      success: false,
      message: 'Too many requests — please try again after 10 minutes'
    });
  }
});

// Strict limit — login and register only
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,                        // CHANGED: set to 3 for easy testing first
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {       // CHANGED: use handler instead of message
    res.status(429).json({
      success: false,
      message: 'Too many login attempts — please try again after 10 minutes'
    });
  }
});

// SMS limit — prevent SMS spam
export const smsLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {       // CHANGED: use handler instead of message
    res.status(429).json({
      success: false,
      message: 'Too many SMS requests — please try again after 30 minutes'
    });
  }
});